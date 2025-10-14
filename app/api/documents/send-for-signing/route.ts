import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { Recipient, SendDocumentRequest } from '@/types/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      recipients,
      documentId,
      subject,
      message,
      expiryDays,
      sendReminders,
      reminderDays,
    }: SendDocumentRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { message: 'No recipients provided' },
        { status: 400 }
      );
    }

    const document = await DocumentModel.findOne({ _id: documentId, userId });
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Generate signing token for current version
    const signingToken = crypto.randomUUID();
    const currentVersion = document.versions.find((v: { version: number }) => v.version === document.currentVersion);

    if (!currentVersion) {
      return NextResponse.json({ message: 'Current version not found' }, { status: 404 });
    }

    // Set expiry date if specified
    let expiresAt: Date | undefined;
    if (expiryDays && expiryDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
    }

    // Update version with signing token and expiry
    currentVersion.signingToken = signingToken;
    currentVersion.sentAt = new Date();
    currentVersion.status = 'sent';
    if (expiresAt) {
      currentVersion.expiresAt = expiresAt;
    }

    // Update document status
    document.recipients.forEach((recipient: Recipient) => {
      if (recipient.status !== 'signed' && recipient.status !== 'approved' && recipient.status !== 'rejected') {
        recipient.status = 'sent';
      }
    });

    document.status = 'sent';
    await document.save();

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const sentEmails: Array<{ recipientId: string; email: string; name?: string; sentAt: Date }> = [];

    // Send emails to all recipients
    for (const recipient of document.recipients) {
      try {
        const signingUrl = `${baseUrl}/sign/${signingToken}?recipient=${recipient.id}`;

        let roleMessage = '';
        let actionButton = '';

        if (recipient.role === 'signer') {
          roleMessage = 'Please review and sign the document.';
          actionButton = 'Sign Document';
        } else if (recipient.role === 'approver') {
          roleMessage = 'Please review and approve the document.';
          actionButton = 'Review & Approve';
        } else if (recipient.role === 'viewer') {
          roleMessage = 'Please review the document.';
          actionButton = 'View Document';
        }

        if (recipient.isCC) {
          roleMessage = 'You are receiving this as a copy for your records.';
          actionButton = 'View Document';
        }

        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Document Signature Request</h2>
            </div>
            
            <p>Hi ${recipient.name},</p>
            
            <p>${message}</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Document:</strong> ${document.documentName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Your Role:</strong> ${recipient.role.charAt(0).toUpperCase() + recipient.role.slice(1)}</p>
              ${expiresAt ? `<p style="margin: 5px 0 0 0;"><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</p>` : ''}
            </div>
            
            <p>${roleMessage}</p>
            
            ${!recipient.isCC ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signingUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  ${actionButton}
                </a>
              </div>
            ` : ''}
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px;">
                This email was sent from SecureSign. If you have any questions, please contact the sender.
              </p>
              ${sendReminders && !recipient.isCC ? `
                <p style="color: #6b7280; font-size: 12px;">
                  You will receive reminders every ${reminderDays} day${reminderDays > 1 ? 's' : ''} until this document is ${recipient.role === 'signer' ? 'signed' : 'ok completed'}.
                </p>
              ` : ''}
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: recipient.email,
          subject: subject,
          html: emailContent,
        });

        sentEmails.push({
          recipientId: recipient.id,
          email: recipient.email,
          name: recipient.name,
          sentAt: new Date(),
        });

      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Document sent to ${sentEmails.length} recipient${sentEmails.length > 1 ? 's' : ''}`,
      signingToken,
      sentEmails,
      expiresAt,
      totalRecipients: recipients.length,
    });

  } catch (error) {
    console.error('Error sending document:', error);
    return NextResponse.json({ message: 'Failed to send document' }, { status: 500 });
  }
}