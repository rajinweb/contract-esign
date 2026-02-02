import nodemailer from 'nodemailer';
import { IDocumentRecipient } from '@/models/Document';

interface DocumentEmailData {
  _id: string;
  documentName: string;
  recipients: IDocumentRecipient[];
  sequentialSigning?: boolean;
}

interface EmailOptions {
  subject?: string;
  message?: string;
}

export async function sendSigningRequestEmail(
  recipient: IDocumentRecipient,
  document: DocumentEmailData,
  options?: EmailOptions,
  signingToken?: string
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const signingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/sign/${signingToken || document._id}?recipient=${recipient.id}`;

    const defaultSubject = `Please sign: ${document.documentName}`;
    const defaultMessage = `Please review and sign the document: ${document.documentName} .`;

    const subject = options?.subject || defaultSubject;
    const messageText = options?.message || defaultMessage;

    let roleMessage = '';
    let actionButton = '';

    if (recipient.role === 'signer') {
      roleMessage = 'As a Signer.';
      actionButton = 'Sign Document';
    } else if (recipient.role === 'approver') {
      roleMessage = 'As a reviewer and approver.';
      actionButton = 'Review & Approve';
    } else if (recipient.role === 'viewer') {
      roleMessage = 'As a reviewer.';
      actionButton = 'View Document';
    }

    if (recipient.isCC) {
      roleMessage = 'You are receiving this as a copy for your records.';
      actionButton = 'View Document';
    }

    const htmlContent = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>Document Signature Request</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <p>Hi <strong>${recipient.name}</strong>,</p>
              <p>${messageText}</p>
              
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Document:</strong> ${document.documentName}</p>
                <p style="margin: 0;"><strong>Your Role:</strong> <span style="background-color: ${recipient.color}; color: white; padding: 4px 12px;">${recipient.isCC ? 'CC' : recipient.role.toUpperCase()}</span></p>
                <p style="margin: 0;><strong>Status:</strong> ${recipient.status}</p>
                ${recipient.expiresAt ? `<p style="margin: 0;"><strong>Expires:</strong> ${new Date(recipient.expiresAt).toLocaleDateString()}</p>` : ''}
              </div>
              <p>
               Click the link below to proceed. ${roleMessage}
              </p>
            
           
              <div style="text-align: center; margin: 20px 0;">
                <a href="${signingLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  ${actionButton}
                </a>
              </div>
            

              <p>
                Or copy and paste this link into your browser:<br>
                <a href="${signingLink}" style="color: #2563eb; word-break: break-all;">${signingLink}</a>
              </p>

              ${(document.sequentialSigning && recipient.order > 1) ? `
                <p style="font-size: 12px; color: #f59e0b; background-color: #fef3c7; padding: 10px; border-radius: 6px;">
                  <strong>Note:</strong> You are recipient #${recipient.order}. You may need to wait for previous signers to complete their signatures.
                </p>
              ` : ''}
            </div>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
              <p style="margin: 0;">If you have any questions, please contact the document sender.</p>
              ${recipient.sendReminders && !recipient.isCC && recipient.reminderDays ? `
              <p> 
               <strong>Reminder: </strong> You will receive reminders every ${recipient.reminderDays} day${recipient.reminderDays > 1 ? 's' : ''} until this document is ${recipient.role === 'signer' ? 'signed' : 'ok completed'}.
              </p>
              ` : ''} 
              </div>
            </div>
          `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient.email,
      subject: subject,
      text: `${messageText}\n\nClick here to sign: ${signingLink}\n\nDocument: ${document.documentName}\nRole: ${recipient.role}\nStatus: ${recipient.status}`,
      html: htmlContent,
    });

    console.log(`✓ Signing request email sent to ${recipient.email} for document ${document._id}`);
    return { success: true };
  } catch (error) {
    console.error(`✗ Failed to send email to ${recipient.email}:`, error);
    throw error;
  }
}

export async function sendSigningCompletionEmail(
  recipient: IDocumentRecipient,
  documentName: string,
  allRecipients: IDocumentRecipient[]
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const completedCount = allRecipients.filter(r => r.status === 'signed' || r.status === 'approved').length;
    const totalCount = allRecipients.length;

    const htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>Signature Completed</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <p>Hi <strong>${recipient.name}</strong>,</p>
              <p>Your signature for <strong>${documentName}</strong> has been successfully recorded.</p>
              <p><strong>Progress:</strong> ${completedCount} of ${totalCount} recipients have completed signing.</p>
              <p>You will receive the final signed document once all parties have completed their signatures.</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
              <p>Thank you for using our e-signature service.</p>
            </div>
          </div>
        `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient.email,
      subject: `Signature Completed: ${documentName}`,
      text: `Your signature for "${documentName}" has been recorded. ${completedCount} of ${totalCount} recipients have completed signing.`,
      html: htmlContent,
    });

    console.log(`✓ Completion email sent to ${recipient.email}`);
    return { success: true };
  } catch (error) {
    console.error(`✗ Failed to send completion email to ${recipient.email}:`, error);
    throw error;
  }
}
