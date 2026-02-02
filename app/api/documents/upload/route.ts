import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import AuditLogModel from '@/models/AuditLog';
import SignatureModel from '@/models/Signature';
import { sha256Buffer } from '@/lib/hash';
import { getRegion, putObjectStream, copyObject } from '@/lib/s3';
import { sendSigningRequestEmail } from '@/lib/email';

export const runtime = 'nodejs';

function getPdfMime(): string {
  return 'application/pdf';
}

async function handleSigningUpdate(
  documentId: string,
  userId: string,
  formData: FormData,
  pdfBuffer: Buffer,
  signingToken: string,
  req: NextRequest
) {
  const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
  if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

  // Validate signingToken belongs to a recipient in this document
  const recipient = existingDoc.recipients.find((r: any) => r.signingToken === signingToken);
  if (!recipient) {
    return NextResponse.json({ message: 'Invalid signing token' }, { status: 401 });
  }

  const recipientId = recipient.id;
  const ip = (req.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const documentName = (formData.get('documentName') as string) || existingDoc.documentName || 'document.pdf';
  const fieldsData = formData.get('fields') as string | null;
  const fields = fieldsData ? JSON.parse(fieldsData) : [];

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    console.error('S3_BUCKET_NAME environment variable is not set.');
    throw new Error('S3 bucket name is not configured.');
  }

  // Determine Signing Mode
  const mode = existingDoc.signingMode;

  if (mode === 'sequential') {
    const recipient = existingDoc.recipients.find((r: any) => r.id === recipientId);
    if (!recipient) {
      return NextResponse.json({ message: 'Recipient not found' }, { status: 404 });
    }
    if (existingDoc.signingState?.currentOrder && recipient.order !== existingDoc.signingState.currentOrder) {
      return NextResponse.json({ message: 'Sequential signing: Not your turn to sign' }, { status: 403 });
    }
  }

  const hash = await sha256Buffer(pdfBuffer);
  const size = pdfBuffer.length;
  const mimeType = getPdfMime();

  // ⚠️ RACE CONDITION GUARD: Prevent signing if base version changed
  // This ensures we always derive from the expected baseVersion
  const baseVersion = existingDoc.currentVersion;

  // PARALLEL MODE LOGIC - Every signer creates a new signed version
  if (mode === 'parallel') {
    const newVersionNumber = baseVersion + 1;
    const key = `documents/${userId}/${documentId}/signed_${newVersionNumber}_${recipientId}.pdf`;

    await putObjectStream({ bucket, key, body: pdfBuffer, contentType: mimeType, contentLength: size });

    // Check if this is the final signer
    const recipients = existingDoc.recipients || [];
    const otherSigners = recipients.filter((r: any) => r.role !== 'viewer' && r.id !== recipientId);
    const allOthersDone = otherSigners.every((r: any) => ['signed', 'approved'].includes(r.status));
    const isFinal = allOthersDone;
    const parLabel = isFinal ? 'signed_final' : `signed_by_order_${recipient.order}`;
    const label = parLabel;

    const newVersion = {
      version: newVersionNumber,
      label,
      derivedFromVersion: existingDoc.currentVersion,
      storage: {
        provider: 's3',
        bucket,
        key,
        region: getRegion(),
        url: `s3://${bucket}/${key}`
      },
      hash,
      hashAlgo: 'SHA-256',
      size,
      mimeType,
      locked: true,
      status: 'final',
      fields,
      documentName,
      changeLog: `Signed by recipient ${recipientId}`,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await AuditLogModel.create({
      documentId: existingDoc._id,
      actor: recipientId,
      action: 'recipient_signed',
      metadata: { ip }
    });

    // Persist signatures to separate collection
    if (fields && fields.length > 0) {
      const signatures = fields
        .filter((f: any) => ['signature', 'initials', 'stamp'].includes(f.type))
        .map((f: any) => ({
          documentId,
          version: newVersionNumber,
          recipientId,
          fieldId: f.id,
          signatureHash: hash,
          ip,
          userAgent
        }));
      if (signatures.length > 0) await SignatureModel.insertMany(signatures);
    }

    const docUpdate: any = {
      $push: {
        versions: newVersion,
        'signingState.signingEvents': {
          recipientId,
          fields,
          ip,
          userAgent,
          signedAt: new Date(),
          version: newVersionNumber,
        },
      },
      $set: {
        currentVersion: newVersionNumber,
        documentName: documentName,
        updatedAt: new Date(),
        status: isFinal ? 'completed' : 'in_progress',
        "recipients.$[elem].status": 'signed',
        "recipients.$[elem].signedAt": new Date(),
        "recipients.$[elem].signedVersion": newVersionNumber,
      }
    };

    if (isFinal) {
      await AuditLogModel.create({
        documentId: existingDoc._id,
        actor: recipientId,
        action: 'document_finalized',
        metadata: { ip, finalHash: hash }
      });
    }

    // ⚠️ ATOMIC CHECK: Ensure base version hasn't changed (race condition protection)
    const updateResult = await DocumentModel.updateOne(
      { _id: documentId, currentVersion: baseVersion },
      docUpdate,
      { arrayFilters: [{ "elem.id": recipientId }] }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'Failed to save signing data, document state may have changed.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, documentId, version: newVersionNumber, message: 'Document signed successfully.' });
  }

  if (mode === 'sequential') {
    const seqRecipient = existingDoc.recipients.find((r: any) => r.id === recipientId);
    if (!seqRecipient) {
      return NextResponse.json({ message: 'Recipient not found for sequential signing.' }, { status: 404 });
    }

    // Create a NEW version for this signature
    const newVersionNumber = baseVersion + 1;
    const key = `documents/${userId}/${documentId}/signed_${newVersionNumber}_${recipient.id}.pdf`;

    await putObjectStream({ bucket, key, body: pdfBuffer, contentType: mimeType, contentLength: size });

    const nextSigner = existingDoc.recipients
      .filter((r: any) => r.role === 'signer' && r.order > seqRecipient.order)
      .sort((a: any, b: any) => a.order - b.order)[0];
    const isFinal = !nextSigner;
    const label = isFinal ? 'signed_final' : `signed_by_order_${seqRecipient.order}`;

    const newVersion = {
      version: newVersionNumber,
      label,
      derivedFromVersion: existingDoc.currentVersion,
      storage: {
        provider: 's3',
        bucket,
        key,
        region: getRegion(),
        url: `s3://${bucket}/${key}`
      },
      hash,
      hashAlgo: 'SHA-256',
      size,
      mimeType,
      locked: true,
      status: 'final',
      fields,
      documentName,
      changeLog: `Signed by recipient ${recipient.order} (${recipientId})`,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await AuditLogModel.create({
      documentId: existingDoc._id,
      actor: recipientId,
      action: 'recipient_signed',
      metadata: { ip, recipientOrder: recipient.order }
    });

    const docUpdate: any = {
      $push: {
        versions: newVersion,
        'signingState.signingEvents': {
          recipientId, fields, ip, userAgent, signedAt: new Date(), version: newVersionNumber, order: seqRecipient.order,
        },
      },
      $set: {
        currentVersion: newVersionNumber,
        documentName: documentName,
        updatedAt: new Date(),
        status: isFinal ? 'completed' : 'in_progress',
        'signingState.currentOrder': nextSigner ? nextSigner.order : existingDoc.signingState.currentOrder,
        "recipients.$[signer].status": 'signed',
        "recipients.$[signer].signedAt": new Date(),
        "recipients.$[signer].signedVersion": newVersionNumber,
      }
    };

    if (nextSigner) {
      docUpdate.$set[`recipients.$[next].status`] = 'sent';
    }
    if (isFinal) {
      await AuditLogModel.create({
        documentId: existingDoc._id,
        actor: recipientId,
        action: 'document_finalized',
        metadata: { ip, finalHash: hash }
      });
    }

    const arrayFilters: any[] = [{ "signer.id": recipientId }];
    if (nextSigner) {
      arrayFilters.push({ "next.id": nextSigner.id });
    }

    // ⚠️ ATOMIC CHECK: Ensure base version hasn't changed (race condition protection)
    const updateResult = await DocumentModel.updateOne(
      { _id: documentId, currentVersion: baseVersion },
      docUpdate,
      { arrayFilters }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'Failed to save signing data, document state may have changed.' }, { status: 409 });
    }

    if (nextSigner) {
      const updatedDoc = await DocumentModel.findById(documentId);
      const nextRecipientData = updatedDoc.recipients.find((r: any) => r.id === nextSigner.id);
      if (nextRecipientData && nextRecipientData.status === 'sent') {
        // TODO: Pass subject/message from UI or use a template
        await sendSigningRequestEmail(nextRecipientData, updatedDoc, { subject: "It's your turn to sign", message: "A document is waiting for your signature." }, nextRecipientData.signingToken);
      }
    }

    return NextResponse.json({ success: true, documentId, version: newVersionNumber, message: 'Document signed successfully.' });
  }
}

async function handleMetadataUpdate(documentId: string, userId: string, formData: FormData) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
    if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    const currentVersionIndex = existingDoc.versions.findIndex((v: any) => v.version === existingDoc.currentVersion);
    if (currentVersionIndex === -1) return NextResponse.json({ message: 'Current version not found' }, { status: 404 });
    const currentVersionData = existingDoc.versions[currentVersionIndex];

    const sessionId = formData.get('sessionId') as string | null;
    const changeLog = (formData.get('changeLog') as string) || 'Metadata updated';
    const documentName = formData.get('documentName') as string | null;
    const fieldsData = formData.get('fields') as string | null;
    const recipientsData = formData.get('recipients') as string | null;

    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    const sessionIdFinal = sessionId || existingDoc.currentSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const editHistoryItem = {
      sessionId: sessionIdFinal,
      fields,
      documentName: documentName || undefined,
      timestamp: new Date(),
      changeLog,
    };

    // If the current version is locked (e.g. Version 0 Original), we MUST NOT modify it.
    // Instead, we create a new Draft version (Version 1) that inherits the binary but has the new metadata.
    if (currentVersionData.locked) {
      if (!currentVersionData.hash || !currentVersionData.size) {
        console.error("Cannot create prepared version from original version because original is missing hash or size.", currentVersionData);
        return NextResponse.json({ message: 'Original document version is corrupted (missing hash/size), please re-upload.' }, { status: 400 });
      }
      const newVersionNumber = (existingDoc.currentVersion ?? 0) + 1;

      const bucket = process.env.S3_BUCKET_NAME;
      if (!bucket) {
        console.error('S3_BUCKET_NAME environment variable is not set.');
        throw new Error('S3 bucket name is not configured.');
      }

      const sourceKey = currentVersionData.storage.key;
      const newKey = `documents/${userId}/${documentId}/prepared_${newVersionNumber}.pdf`;

      await copyObject({
        sourceBucket: bucket,
        sourceKey,
        destinationBucket: bucket,
        destinationKey: newKey,
      });

      const newStorage = {
        provider: 's3',
        bucket,
        key: newKey,
        region: getRegion(),
        url: `s3://${bucket}/${newKey}`,
      };

      const newVersion = {
        version: newVersionNumber,
        derivedFromVersion: currentVersionData.version,
        label: 'prepared',
        storage: newStorage,
        hash: currentVersionData.hash,
        hashAlgo: currentVersionData.hashAlgo || 'SHA-256',
        size: currentVersionData.size,
        mimeType: currentVersionData.mimeType,
        locked: false,
        fields: fields,
        documentName: documentName || existingDoc.documentName,
        status: 'draft',
        changeLog: 'Document prepared for signing',
        editHistory: [editHistoryItem],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updateResult = await DocumentModel.updateOne(
        { _id: documentId, userId, currentVersion: existingDoc.currentVersion },
        {
          $push: { versions: newVersion },
          $set: {
            currentVersion: newVersionNumber,
            documentName: documentName || existingDoc.documentName,
            recipients: recipients,
            currentSessionId: sessionIdFinal,
            updatedAt: new Date(),
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        if (attempt < 2) continue;
        return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        documentId: existingDoc._id,
        version: newVersionNumber,
        sessionId: sessionIdFinal,
        fileUrl: `/api/documents/${existingDoc._id}`,
        documentName: documentName || existingDoc.documentName,
        message: 'New draft version created from locked original',
      });
    }

    const updatedDoc = await DocumentModel.findOneAndUpdate(
      { _id: documentId, userId, currentVersion: existingDoc.currentVersion },
      {
        $push: { [`versions.${currentVersionIndex}.editHistory`]: editHistoryItem },
        $set: {
          [`versions.${currentVersionIndex}.fields`]: fields,
          updatedAt: new Date(),
          documentName: documentName || existingDoc.documentName,
          recipients: recipients,
          currentSessionId: sessionIdFinal,
        },
      },
      { new: true }
    );

    if (!updatedDoc) {
      const check = await DocumentModel.exists({ _id: documentId, userId });
      if (check) {
        if (attempt < 2) continue;
        return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      documentId: updatedDoc._id,
      version: updatedDoc.currentVersion,
      sessionId: sessionIdFinal,
      fileUrl: `/api/documents/${updatedDoc._id}`,
      documentName: updatedDoc.documentName,
      message: 'Metadata updated successfully',
    });
  }
  return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
}

async function handlePdfUpdate(documentId: string, userId: string, formData: FormData, pdfBuffer: Buffer) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
    if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    const currentVersionIndex = existingDoc.versions.findIndex((v: any) => v.version === existingDoc.currentVersion);
    if (currentVersionIndex === -1) return NextResponse.json({ message: 'Current version not found' }, { status: 404 });
    const currentVersionData = existingDoc.versions[currentVersionIndex];

    const documentName = (formData.get('documentName') as string) || existingDoc.documentName || 'document.pdf';
    const fieldsData = formData.get('fields') as string | null;
    const recipientsData = formData.get('recipients') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    const changeLog = (formData.get('changeLog') as string) || 'Document updated';

    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    const incomingSessionId = sessionId || existingDoc.currentSessionId || null;
    const hash = await sha256Buffer(pdfBuffer);
    const size = pdfBuffer.length;
    const mimeType = getPdfMime();

    const canOverwrite = (currentVersionData as any)?.label === 'prepared';

    // If same session and current version is a 'prepared' draft, overwrite it; else create a new PREPARED version
    if (
      incomingSessionId &&
      existingDoc.currentSessionId &&
      incomingSessionId === existingDoc.currentSessionId &&
      canOverwrite
    ) {
      let bucket, key, storage;
      if (currentVersionData.storage && currentVersionData.storage.provider === 's3') {
        bucket = currentVersionData.storage.bucket;
        key = currentVersionData.storage.key;
        storage = currentVersionData.storage;
      } else {
        bucket = process.env.S3_BUCKET_NAME;
        if (!bucket) {
          console.error('S3_BUCKET_NAME environment variable is not set.');
          throw new Error('S3 bucket name is not configured.');
        }
        key = `documents/${userId}/${documentId}/${currentVersionData.version}.pdf`;
        storage = {
          provider: 's3',
          bucket: bucket,
          key: key,
          region: getRegion(),
          url: `s3://${bucket}/${key}`
        };
      }

      await putObjectStream({ bucket, key, body: pdfBuffer, contentType: mimeType, contentLength: size });

      // Use updateOne to bypass "Locked version" validation in save() middleware
      const updateResult = await DocumentModel.updateOne(
        { _id: documentId, userId, currentVersion: existingDoc.currentVersion },
        {
          $set: {
            [`versions.${currentVersionIndex}.hash`]: hash,
            [`versions.${currentVersionIndex}.hashAlgo`]: 'SHA-256',
            [`versions.${currentVersionIndex}.size`]: size,
            [`versions.${currentVersionIndex}.mimeType`]: mimeType,
            [`versions.${currentVersionIndex}.fields`]: fields,
            [`versions.${currentVersionIndex}.updatedAt`]: new Date(),
            [`versions.${currentVersionIndex}.documentName`]: documentName,
            [`versions.${currentVersionIndex}.locked`]: false,
            [`versions.${currentVersionIndex}.storage`]: storage,
            documentName: documentName,
            recipients: recipients,
            updatedAt: new Date(),
          },
          $unset: {
            [`versions.${currentVersionIndex}.pdfData`]: 1
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        if (attempt < 2) continue;
        return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        documentId: existingDoc._id,
        version: existingDoc.currentVersion,
        fileUrl: `/api/documents/${existingDoc._id}`,
        documentName: existingDoc.documentName,
        message: `Current version ${existingDoc.currentVersion} updated (same session)`,
      });
    }

    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      console.error('S3_BUCKET_NAME environment variable is not set.');
      throw new Error('S3 bucket name is not configured.');
    }

    const newVersionNumber = (existingDoc.currentVersion ?? 0) + 1;
    const key = `documents/${userId}/${documentId}/prepared_${newVersionNumber}.pdf`;

    await putObjectStream({ bucket, key, body: pdfBuffer, contentType: mimeType, contentLength: size });

    const newVersion = {
      version: newVersionNumber,
      derivedFromVersion: existingDoc.currentVersion,
      label: 'prepared',
      storage: {
        provider: 's3',
        bucket,
        key,
        region: getRegion(),
        url: `s3://${bucket}/${key}`
      },
      hash,
      hashAlgo: 'SHA-256',
      size,
      mimeType,
      locked: false,
      fields,
      documentName,
      status: 'draft',
      changeLog,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updateResult = await DocumentModel.updateOne(
      { _id: documentId, userId, currentVersion: existingDoc.currentVersion },
      {
        $push: { versions: newVersion },
        $set: {
          currentVersion: newVersionNumber,
          documentName: documentName,
          recipients: recipients,
          currentSessionId: incomingSessionId,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      if (attempt < 2) continue;
      return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      documentId: existingDoc._id,
      version: newVersionNumber,
      fileUrl: `/api/documents/${existingDoc._id}`,
      documentName: documentName,
      message: `New version ${newVersionNumber} created`,
    });
  }
  return NextResponse.json({ message: 'Concurrent update detected' }, { status: 409 });
}

async function handleNewDocument(userId: string, formData: FormData, pdfBuffer: Buffer, file: File, req: NextRequest) {
  const documentName = (formData.get('documentName') as string) || file.name || 'document.pdf';
  const recipientsData = formData.get('recipients') as string | null;
  const signingMode = formData.get('signingMode') || 'parallel';
  const sessionId = formData.get('sessionId') as string | null;

  const recipients = recipientsData ? JSON.parse(recipientsData) : [];

  const hash = await sha256Buffer(pdfBuffer);
  const size = pdfBuffer.length;
  const mimeType = getPdfMime();
  const initialSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  const ip = (req.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();

  const newDocument = new DocumentModel({
    userId,
    documentName,
    originalFileName: file.name || documentName,
    currentVersion: 1, // Set current version to 1 as we are creating a prepared version
    currentSessionId: initialSessionId,
    versions: [],
    recipients,
    signingMode,
    signingState: { signingEvents: [] },
    status: 'draft',
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  try {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      console.error('S3_BUCKET_NAME environment variable is not set.');
      throw new Error('S3 bucket name is not configured.');
    }

    // Version 0: Original
    const originalKey = `documents/${userId}/${newDocument._id}/original.pdf`;
    await putObjectStream({ bucket, key: originalKey, body: pdfBuffer, contentType: mimeType, contentLength: size });

    const originalVersion = {
      version: 0,
      label: 'original' as const,
      storage: {
        provider: 's3',
        bucket,
        key: originalKey,
        region: getRegion(),
        url: `s3://${bucket}/${originalKey}`
      },
      hash,
      hashAlgo: 'SHA-256',
      size,
      mimeType,
      locked: true,
      status: 'locked' as const,
      ingestionNote: 'Original upload',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    newDocument.versions.push(originalVersion);

    // Version 1: Prepared
    const preparedKey = `documents/${userId}/${newDocument._id}/prepared_1.pdf`;
    await copyObject({
      sourceBucket: bucket,
      sourceKey: originalKey,
      destinationBucket: bucket,
      destinationKey: preparedKey,
    });

    const preparedVersion = {
      version: 1,
      label: 'prepared' as const,
      derivedFromVersion: 0,
      storage: {
        provider: 's3',
        bucket,
        key: preparedKey,
        region: getRegion(),
        url: `s3://${bucket}/${preparedKey}`
      },
      hash, // Hash is the same as original
      hashAlgo: 'SHA-256',
      size,
      mimeType,
      locked: false,
      fields: [],
      documentName,
      status: 'draft' as const,
      changeLog: 'Document prepared for signing',
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    newDocument.versions.push(preparedVersion);

    await newDocument.save();

    await AuditLogModel.create({
      documentId: newDocument._id,
      actor: userId,
      action: 'document_created',
      metadata: { ip }
    });

    const fileUrl = `/api/documents/${newDocument._id}`;
    return NextResponse.json({
      success: true,
      documentId: newDocument._id,
      version: 1, // Return current version
      sessionId: initialSessionId,
      fileUrl,
      documentName,
      message: 'Document created successfully'
    });
  } catch (error) {
    // If upload fails, delete the document to prevent "zombie" records
    console.error('Failed to create new document, cleaning up document:', newDocument._id, error);
    try {
      await DocumentModel.findByIdAndDelete(newDocument._id);
    } catch (cleanupError) {
      console.error('Failed to cleanup document:', cleanupError);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUserId = await getAuthSession(req);
    const signingToken = req.headers.get('X-Signing-Token');
    const recipientIdHeader = req.headers.get('X-Recipient-Id');
    let authorizedUserId: string | null = sessionUserId;

    if (signingToken) {
      if (!recipientIdHeader) {
        return NextResponse.json({ message: 'Recipient ID is missing' }, { status: 400 });
      }
      const doc = await DocumentModel.findOne({
        "recipients.signingToken": signingToken,
        "recipients.id": recipientIdHeader
      });
      if (!doc) {
        return NextResponse.json({ message: 'Unauthorized: Invalid signing token' }, { status: 401 });
      }
      authorizedUserId = doc.userId.toString();
    } else if (!sessionUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!authorizedUserId) {
      return NextResponse.json({ message: 'Unable to determine authorized user' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentId = formData.get('documentId') as string | null;
    const isMetadataOnly = formData.get('isMetadataOnly') === 'true';

    let pdfBuffer: Buffer | null = null;
    if (file) {
      pdfBuffer = Buffer.from(await file.arrayBuffer());
      if (pdfBuffer.length === 0) return NextResponse.json({ message: 'File is empty' }, { status: 400 });
    }

    if (documentId) {
      if (signingToken && pdfBuffer) {
        return await handleSigningUpdate(documentId, authorizedUserId, formData, pdfBuffer, signingToken, req);
      } else if (isMetadataOnly) {
        return await handleMetadataUpdate(documentId, authorizedUserId, formData);
      } else if (pdfBuffer) {
        return await handlePdfUpdate(documentId, authorizedUserId, formData, pdfBuffer);
      } else {
        return NextResponse.json({ message: 'No file provided for update' }, { status: 400 });
      }
    } else if (pdfBuffer && file) {
      return await handleNewDocument(authorizedUserId, formData, pdfBuffer, file, req);
    } else {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error in POST', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
