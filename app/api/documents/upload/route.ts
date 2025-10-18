import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// -------------------- Helper functions --------------------
function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '').trim();
}

function writeFileStable(dir: string, baseFileName: string, pdfBuffer: Buffer, preferredVersion?: number): { filePath: string; finalFileName: string } {
  const safeBaseName = sanitizeFileName(baseFileName);
  const ext = path.extname(safeBaseName) || '.pdf';
  const nameWithoutExt = path.basename(safeBaseName, ext);

  const tryPaths: string[] = [];
  if (preferredVersion && preferredVersion > 1) {
    tryPaths.push(path.join(dir, `${nameWithoutExt}_v${preferredVersion}${ext}`));
  }
  tryPaths.push(path.join(dir, safeBaseName));
  for (let i = 1; i <= 100; i++) tryPaths.push(path.join(dir, `${nameWithoutExt}_v${i}${ext}`));

  for (const p of tryPaths) {
    try {
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, pdfBuffer);
        return { filePath: p, finalFileName: path.basename(p) };
      }
      const existing = fs.readFileSync(p);
      if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
        return { filePath: p, finalFileName: path.basename(p) };
      }
    } catch {
      continue;
    }
  }
  const tsName = `${nameWithoutExt}_${Date.now()}${ext}`;
  const finalPath = path.join(dir, tsName);
  fs.writeFileSync(finalPath, pdfBuffer);
  return { filePath: finalPath, finalFileName: tsName };
}

async function handleSigningUpdate(documentId: string, userId: string, formData: FormData, pdfBuffer: Buffer, signingToken: string) {
  const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
  if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

  // Find the version with this signing token
  const versionIndex = existingDoc.versions.findIndex((v: { signingToken: string; }) => v.signingToken === signingToken);
  if (versionIndex === -1) {
    return NextResponse.json({ message: 'Version with signing token not found' }, { status: 404 });
  }

  const versionData = existingDoc.versions[versionIndex];
  const documentName = formData.get('documentName') as string | null;
  const fieldsData = formData.get('fields') as string | null;

  const fields = fieldsData ? JSON.parse(fieldsData) : [];

  const userDir = path.join(process.cwd(), 'uploads', userId as string);
  fs.mkdirSync(userDir, { recursive: true });

  // Update the file
  let detPath = versionData.filePath || path.join(userDir, `${existingDoc._id}_v${versionIndex + 1}.pdf`);
  try {
    fs.writeFileSync(detPath, pdfBuffer);
  } catch {
    const res = writeFileStable(userDir, existingDoc.originalFileName || 'file', pdfBuffer, versionIndex + 1);
    detPath = res.filePath;
  }

  // Update the version with signed data
  versionData.pdfData = pdfBuffer;
  versionData.filePath = detPath;
  versionData.fields = fields;
  versionData.updatedAt = new Date();



  existingDoc.documentName = documentName || existingDoc.documentName;
  // DON'T overwrite recipients in signing mode - status might have been updated
  // existingDoc.recipients = recipients;

  // Mark versions as modified so Mongoose saves the changes
  existingDoc.markModified('versions');



  existingDoc.updatedAt = new Date();

  try {
    await existingDoc.save();
  } catch (error) {
    if (error instanceof Error && error.name === 'VersionError') {

      const freshDoc = await DocumentModel.findById(documentId);
      if (!freshDoc) {
        return NextResponse.json({ error: 'Document not found on retry' }, { status: 404 });
      }

      const freshVersionIndex = freshDoc.versions.findIndex((v: { signingToken: string; }) => v.signingToken === signingToken);
      if (freshVersionIndex !== -1) {
        const freshVersion = freshDoc.versions[freshVersionIndex];
        freshVersion.pdfData = pdfBuffer;
        freshVersion.filePath = detPath;
        freshVersion.fields = fields;
        freshVersion.updatedAt = new Date();

        freshDoc.documentName = documentName || freshDoc.documentName;
        // DON'T overwrite recipients in signing mode
        // freshDoc.recipients = recipients;
        freshDoc.markModified('versions');
        freshDoc.updatedAt = new Date();

        await freshDoc.save();

        return NextResponse.json({
          success: true,
          documentId: freshDoc._id,
          version: freshVersionIndex + 1,
          fileUrl: `/api/documents/${freshDoc._id}?token=${signingToken}`,
          documentName: freshDoc.documentName,
          message: 'Signing data saved (retry)',
        });
      }
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    documentId: existingDoc._id,
    version: versionIndex + 1,
    fileUrl: `/api/documents/${existingDoc._id}?token=${signingToken}`,
    documentName: existingDoc.documentName,
    message: 'Signing data saved successfully',
  });
}

async function handleMetadataUpdate(documentId: string, userId: string, formData: FormData) {
  // Reload latest document from DB to avoid VersionError
  const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
  if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

  const currentVersionIndex = existingDoc.currentVersion - 1;
  const currentVersionData = existingDoc.versions[currentVersionIndex];
  if (!currentVersionData) return NextResponse.json({ message: 'Current version not found' }, { status: 404 });

  const sessionId = formData.get('sessionId') as string | null;
  const changeLog = (formData.get('changeLog') as string) || 'Document updated';
  const documentName = formData.get('documentName') as string | null;
  const fieldsData = formData.get('fields') as string | null;
  const recipientsData = formData.get('recipients') as string | null;

  const fields = fieldsData ? JSON.parse(fieldsData) : [];
  const recipients = recipientsData ? JSON.parse(recipientsData) : [];

  const sessionIdFinal = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build edit history item
  const editHistoryItem = {
    sessionId: sessionIdFinal,
    fields,
    documentName: documentName || undefined,
    timestamp: new Date(),
    changeLog,
  };

  // Atomic update to subdocument
  const updatedDoc = await DocumentModel.findOneAndUpdate(
    { _id: documentId, userId },
    {
      $push: { [`versions.${existingDoc.currentVersion - 1}.editHistory`]: editHistoryItem },
      $set: {
        [`versions.${existingDoc.currentVersion - 1}.fields`]: fields,
        updatedAt: new Date(),
        documentName: documentName || existingDoc.documentName,
        recipients: recipients,
        currentSessionId: sessionIdFinal,
      },
    },
    { new: true }
  );

  if (!updatedDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

  // -------------------- PHYSICAL FILE RENAME --------------------
  try {
    const currentVersion = updatedDoc.versions[updatedDoc.currentVersion - 1];
    if (documentName && documentName !== currentVersion.documentName) {
      const oldFilePath = currentVersion.filePath;
      const uploadsDir = path.dirname(oldFilePath);
      const sanitizedNewName = documentName.replace(/[<>:"/\\|?*]+/g, '').trim();
      let newFilePath = path.join(uploadsDir, sanitizedNewName.endsWith('.pdf') ? sanitizedNewName : `${sanitizedNewName}.pdf`);

      // Handle name collisions
      let i = 1;
      while (fs.existsSync(newFilePath)) {
        const nameWithoutExt = path.basename(sanitizedNewName, '.pdf');
        newFilePath = path.join(uploadsDir, `${nameWithoutExt}_v${i}.pdf`);
        i++;
      }

      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
        currentVersion.filePath = newFilePath;
        currentVersion.documentName = path.basename(newFilePath);
        updatedDoc.documentName = path.basename(newFilePath);
        await updatedDoc.save();
      }
    }
  } catch (err) {
    console.error('Failed to rename physical file:', err);
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

async function handlePdfUpdate(documentId: string, userId: string, formData: FormData, pdfBuffer: Buffer) {
  const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
  if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

  const currentVersionIndex = existingDoc.currentVersion - 1;
  const currentVersionData = existingDoc.versions[currentVersionIndex];
  if (!currentVersionData) return NextResponse.json({ message: 'Current version not found' }, { status: 404 });

  const documentName = formData.get('documentName') as string | null;
  const fieldsData = formData.get('fields') as string | null;
  const recipientsData = formData.get('recipients') as string | null;
  const sessionId = formData.get('sessionId') as string | null;
  const changeLog = (formData.get('changeLog') as string) || 'Document updated';

  const fields = fieldsData ? JSON.parse(fieldsData) : [];
  const recipients = recipientsData ? JSON.parse(recipientsData) : [];

  // Logic to identify recipients whose status needs to be reset
  const oldFields = currentVersionData.fields || [];
  const recipientsToReset: string[] = [];

  const oldRecipientFields = new Map<string, Set<string>>();
  for (const field of oldFields) {
    if (field.recipientId) {
      const recipientIdStr = field.recipientId.toString();
      if (!oldRecipientFields.has(recipientIdStr)) {
        oldRecipientFields.set(recipientIdStr, new Set());
      }
      oldRecipientFields.get(recipientIdStr)!.add(field.id.toString());
    }
  }

  const newRecipientFields = new Map<string, Set<string>>();
  for (const field of fields) {
    if (field.recipientId) {
      const recipientIdStr = field.recipientId.toString();
      if (!newRecipientFields.has(recipientIdStr)) {
        newRecipientFields.set(recipientIdStr, new Set());
      }
      newRecipientFields.get(recipientIdStr)!.add(field.id.toString());
    }
  }

  for (const recipient of recipients) {
    if (recipient.status === 'signed') {
      const recipientIdStr = recipient.id.toString();
      const oldFieldSet = oldRecipientFields.get(recipientIdStr) || new Set();
      const newFieldSet = newRecipientFields.get(recipientIdStr) || new Set();

      let hasNewFields = false;
      if (newFieldSet.size > oldFieldSet.size) {
        hasNewFields = true;
      } else {
        for (const fieldId of newFieldSet) {
          if (!oldFieldSet.has(fieldId)) {
            hasNewFields = true;
            break;
          }
        }
      }

      if (hasNewFields) {
        recipientsToReset.push(recipient.id);
      }
    }
  }

  const userDir = path.join(process.cwd(), 'uploads', userId as string);
  fs.mkdirSync(userDir, { recursive: true });

  const incomingSessionId = sessionId || existingDoc.currentSessionId || null;

  // SAME SESSION: overwrite current version
  if (incomingSessionId && existingDoc.currentSessionId && incomingSessionId === existingDoc.currentSessionId) {
    let detPath = currentVersionData.filePath || path.join(userDir, `${existingDoc._id}_v${existingDoc.currentVersion}.pdf`);
    try {
      fs.writeFileSync(detPath, pdfBuffer);
    } catch {
      const res = writeFileStable(userDir, existingDoc.originalFileName || 'file', pdfBuffer, existingDoc.currentVersion);
      detPath = res.filePath;
    }

    // update current version content
    currentVersionData.pdfData = pdfBuffer;
    currentVersionData.filePath = detPath;
    currentVersionData.fields = fields;
    currentVersionData.updatedAt = new Date();

    existingDoc.documentName = documentName || existingDoc.documentName;
    existingDoc.recipients = recipients;
    existingDoc.updatedAt = new Date();

    try {
      await existingDoc.save();
    } catch (error) {
      if (error instanceof Error && error.name === 'VersionError') {
        console.log('Version conflict detected, retrying with fresh document...');
        const freshDoc = await DocumentModel.findById(documentId);
        if (!freshDoc) {
          return NextResponse.json({ error: 'Document not found on retry' }, { status: 404 });
        }

        const freshVersion = freshDoc.versions[freshDoc.currentVersion - 1];
        if (freshVersion) {
          freshVersion.pdfData = pdfBuffer;
          freshVersion.filePath = detPath;
          freshVersion.fields = fields;
          freshVersion.updatedAt = new Date();
        }

        freshDoc.documentName = documentName || freshDoc.documentName;
        freshDoc.recipients = recipients;
        freshDoc.updatedAt = new Date();

        await freshDoc.save();

        // After saving, reset statuses if needed
        if (recipientsToReset.length > 0) {
          await DocumentModel.updateOne(
            { _id: documentId },
            { $set: { "recipients.$[elem].status": "pending" } },
            { arrayFilters: [{ "elem.id": { $in: recipientsToReset } }] }
          );
        }

        return NextResponse.json({
          success: true,
          documentId: freshDoc._id,
          version: freshDoc.currentVersion,
          fileUrl: `/api/documents/${freshDoc._id}`,
          documentName: freshDoc.documentName,
          message: `Current version ${freshDoc.currentVersion} updated (retry)`,
        });
      }
      throw error;
    }

    // After saving, reset statuses if needed
    if (recipientsToReset.length > 0) {
      await DocumentModel.updateOne(
        { _id: documentId },
        { $set: { "recipients.$[elem].status": "pending" } },
        { arrayFilters: [{ "elem.id": { $in: recipientsToReset } }] }
      );
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

  // NEW VERSION
  const newVersion = existingDoc.currentVersion + 1;
  let detPath = path.join(userDir, `${existingDoc._id}_v${newVersion}.pdf`);
  try {
    fs.writeFileSync(detPath, pdfBuffer);
  } catch {
    const res = writeFileStable(userDir, existingDoc.originalFileName || 'file', pdfBuffer, newVersion);
    detPath = res.filePath;
  }

  existingDoc.versions.push({
    version: newVersion,
    pdfData: pdfBuffer,
    filePath: detPath,
    documentName: path.basename(detPath),
    fields,
    status: 'final' as const,
    changeLog,
    editHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  existingDoc.currentVersion = newVersion;
  existingDoc.documentName = documentName || existingDoc.documentName;
  existingDoc.recipients = recipients;
  existingDoc.currentSessionId = null;
  existingDoc.updatedAt = new Date();

  await existingDoc.save();

  // After saving, reset statuses if needed
  if (recipientsToReset.length > 0) {
    await DocumentModel.updateOne(
      { _id: documentId },
      { $set: { "recipients.$[elem].status": "pending" } },
      { arrayFilters: [{ "elem.id": { $in: recipientsToReset } }] }
    );
  }

  return NextResponse.json({
    success: true,
    documentId: existingDoc._id,
    version: newVersion,
    fileUrl: `/api/documents/${existingDoc._id}`,
    documentName: existingDoc.documentName,
    message: `New version ${newVersion} created`,
  });
}

async function handleNewDocument(userId: string, formData: FormData, pdfBuffer: Buffer, file: File) {
  const documentName = formData.get('documentName') as string | null;
  const fieldsData = formData.get('fields') as string | null;
  const recipientsData = formData.get('recipients') as string | null;
  const sessionId = formData.get('sessionId') as string | null;

  const fields = fieldsData ? JSON.parse(fieldsData) : [];
  const recipients = recipientsData ? JSON.parse(recipientsData) : [];

  const initialSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const newDocument = new DocumentModel({
    userId,
    documentName,
    currentVersion: 1,
    currentSessionId: initialSessionId,
    versions: [],
    recipients,
    status: 'draft',
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  const userDir = path.join(process.cwd(), 'uploads', userId as string);
  fs.mkdirSync(userDir, { recursive: true });

  // Try to write using the original documentName the user uploaded (do NOT rename)
  // If there is a collision with different content, pick a stable fallback
  // documentName via writeFileStable (which will pick _vN or timestamp style names).
  const preferredName = file.name || documentName || 'document.pdf';
  const candidate = path.join(userDir, preferredName);
  let detPath = candidate;
  let finalFileName = preferredName;
  try {
    if (!fs.existsSync(candidate)) {
      fs.writeFileSync(candidate, pdfBuffer);
    } else {
      const existing = fs.readFileSync(candidate);
      if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
        // identical file already exists — reuse
      } else {
        // collision with different content — choose a stable alternate name
        const res = writeFileStable(userDir, preferredName, pdfBuffer);
        detPath = res.filePath;
        finalFileName = res.finalFileName;
      }
    }
  } catch {
    const res = writeFileStable(userDir, preferredName, pdfBuffer);
    detPath = res.filePath;
    finalFileName = res.finalFileName;
  }

  newDocument.originalFileName = finalFileName;
  newDocument.versions = [{
    version: 1,
    pdfData: pdfBuffer,
    filePath: detPath,
    documentName: finalFileName,
    fields,
    status: 'draft',
    changeLog: 'Initial document creation',
    editHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }];


  await newDocument.save();

  const fileUrl = `/api/documents/${newDocument._id}`;
  return NextResponse.json({
    success: true,
    documentId: newDocument._id,
    version: 1,
    sessionId: initialSessionId,
    fileUrl,
    documentName: newDocument.documentName,
    folder: userId,
    message: 'Document created successfully'
  });
}

// -------------------- POST handler --------------------
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
      const doc = await DocumentModel.findOne({ // Cast recipientIdHeader to string
        "versions.signingToken": signingToken,
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
      // Special handling for signing mode - update the version with signingToken
      if (signingToken && pdfBuffer) {
        return await handleSigningUpdate(documentId, authorizedUserId, formData, pdfBuffer, signingToken);
      } else if (isMetadataOnly) {
        return await handleMetadataUpdate(documentId, authorizedUserId, formData);
      } else if (pdfBuffer) {
        return await handlePdfUpdate(documentId, authorizedUserId, formData, pdfBuffer);
      } else {
        return NextResponse.json({ message: 'No file provided for update' }, { status: 400 });
      }
    } else if (pdfBuffer && file) {
      return await handleNewDocument(authorizedUserId, formData, pdfBuffer, file);
    } else {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error in POST /api/documents/upload', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}