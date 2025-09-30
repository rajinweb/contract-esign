import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '../../../../utils/db';
import nodemailer from 'nodemailer';
// Local Recipient type (keep in sync with models/Document IDocumentRecipient)
interface Recipient {
  id: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer';
  order?: number;
  isCC?: boolean;
  color?: string;
}

interface SendDocumentRequest {
  recipients: Recipient[];
  documentName: string;
  subject: string;
  message: string;
  sendReminders: boolean;
  reminderDays: number;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      recipients,
      documentName,
      subject,
      message,
      sendReminders,
      reminderDays,
    }: SendDocumentRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { message: 'No recipients provided' },
        { status: 400 }
      );
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const sentEmails = [];

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        // Generate unique signing link for each recipient
        const signingToken = Buffer.from(
          JSON.stringify({
            recipientId: recipient.id,
            email: recipient.email,
            documentName,
            timestamp: Date.now(),
          })
        ).toString('base64url');

        const signingUrl = `${baseUrl}/sign/${signingToken}`;

        // Customize message based on recipient role
        let roleMessage = '';
        if (recipient.role === 'signer') {
          roleMessage = 'Please review and sign the document.';
        } else if (recipient.role === 'approver') {
          roleMessage = 'Please review and approve the document.';
        } else if (recipient.role === 'viewer') {
          roleMessage = 'Please review the document.';
        }

        if (recipient.isCC) {
          roleMessage = 'You are receiving this as a copy for your records.';
        }

        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Document Signature Request</h2>
            </div>
            
            <p>Hi ${recipient.name},</p>
            
            <p>${message}</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Document:</strong> ${documentName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Your Role:</strong> ${recipient.role.charAt(0).toUpperCase() + recipient.role.slice(1)}</p>
            </div>
            
            <p>${roleMessage}</p>
            
            ${!recipient.isCC ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signingUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  ${recipient.role === 'signer' ? 'Sign Document' :
              recipient.role === 'approver' ? 'Review & Approve' : 'View Document'}
                </a>
              </div>
            ` : ''}
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px;">
                This email was sent from SecureSign. If you have any questions, please contact the sender.
              </p>
              ${sendReminders && !recipient.isCC ? `
                <p style="color: #6b7280; font-size: 12px;">
                  You will receive reminders every ${reminderDays} day${reminderDays > 1 ? 's' : ''} until this document is ${recipient.role === 'signer' ? 'signed' : 'completed'}.
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
        // Continue with other recipients even if one fails
      }
    }

    // Persist a lightweight send history on the document (if a document exists)
    try {
      const DocumentModel = (await import('../../../../models/Document')).default;
      // Attempt to find a document with this name for the current user and append history
      const doc = await DocumentModel.findOne({ userId, documentName });
      if (doc) {
        doc.sentHistory = doc.sentHistory || [];
        doc.sentHistory.push({
          sentAt: new Date(),
          recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.name })),
          subject,
        });
        await doc.save();
      }
    } catch (_saveErr) {
      // Non-fatal: log and continue
      console.warn('Could not persist send history:', _saveErr);
    }

    return NextResponse.json({
      success: true,
      message: `Document sent to ${sentEmails.length} recipient${sentEmails.length > 1 ? 's' : ''}`,
      sentEmails,
      totalRecipients: recipients.length,
    });

  } catch (_err) {
    console.error('Error sending document:', _err);
    return NextResponse.json(
      { message: 'Failed to send document' },
      { status: 500 }
    );
  }
}