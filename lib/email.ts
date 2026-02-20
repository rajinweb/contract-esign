import nodemailer, { type Transporter } from 'nodemailer';
import { IDocumentRecipient } from '@/models/Document';

interface DocumentEmailData {
  _id: string;
  documentName: string;
  recipients: IDocumentRecipient[];
  sequentialSigning?: boolean;
  signingMode?: 'parallel' | 'sequential';
}

interface EmailOptions {
  subject?: string;
  message?: string;
}

type MailLikeError = {
  code?: string;
  responseCode?: number;
  response?: string;
  message?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailProvider = 'smtp' | 'resend' | 'auto';

type PublicMailError = {
  message: string;
  code?: string;
  responseCode?: number;
};

export type EmailTransportDiagnostics = {
  provider: EmailProvider;
  smtpConfigured: boolean;
  resendConfigured: boolean;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    from: string;
    verified: boolean;
    fallback?: {
      port: number;
      secure: boolean;
      verified: boolean;
    };
    error?: PublicMailError;
  };
};

function isGmailHost(host: string | undefined): boolean {
  return (host ?? '').toLowerCase().includes('gmail.com');
}

function sanitizeSmtpPassword(rawPassword: string, host: string | undefined): string {
  if (!rawPassword) return rawPassword;
  // Gmail app passwords are often pasted with spaces from the Google UI.
  return isGmailHost(host) ? rawPassword.replace(/\s+/g, '') : rawPassword;
}

function resolveFromAddress(smtpHost: string | undefined, smtpUser: string | undefined): string | undefined {
  const smtpFrom = process.env.SMTP_FROM?.trim();

  if (!smtpFrom) return smtpUser || undefined;
  if (!smtpUser || !isGmailHost(smtpHost)) return smtpFrom;

  // Gmail may reject unverified "from" domains; keep display name but use SMTP user address.
  const displayNameMatch = smtpFrom.match(/^(.*)<[^>]+>\s*$/);
  const displayName = displayNameMatch?.[1]?.trim().replace(/^"|"$/g, '');
  return displayName ? `"${displayName}" <${smtpUser}>` : smtpUser;
}

function getSafeMailerErrorMessage(error: unknown): string {
  const mailError = (error ?? {}) as MailLikeError;
  const code = mailError.code?.toUpperCase();
  const responseText = (mailError.response || '').toLowerCase();

  if (code === 'EAUTH' || mailError.responseCode === 535) {
    return 'SMTP authentication failed. Verify SMTP_USER and SMTP_PASS (Gmail requires App Password).';
  }

  if (code === 'EDNS' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'SMTP host lookup failed. Verify SMTP_HOST and DNS/network connectivity.';
  }

  if (
    code === 'ESOCKET' ||
    code === 'ECONNECTION' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  ) {
    return 'Unable to connect to SMTP server. Verify SMTP_HOST, SMTP_PORT, SMTP_SECURE, and outbound network access. If SMTP ports are blocked, set EMAIL_PROVIDER=resend with RESEND_API_KEY and RESEND_FROM.';
  }

  if (
    mailError.responseCode === 550 ||
    mailError.responseCode === 553 ||
    mailError.responseCode === 554 ||
    responseText.includes('dmarc') ||
    responseText.includes('sender') ||
    responseText.includes('from')
  ) {
    return 'Sender address rejected by SMTP provider. Use a verified SMTP_FROM or SMTP_USER.';
  }

  return mailError.message || 'Email delivery failed due to SMTP provider response.';
}

function getSafeResendErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('401') || message.includes('403')) {
    return 'Resend authentication failed. Verify RESEND_API_KEY.';
  }
  if (message.includes('422')) {
    return 'Resend rejected the request. Verify RESEND_FROM domain and recipient payload.';
  }
  if (message.includes('429')) {
    return 'Resend rate limit reached. Retry later or increase provider quota.';
  }
  return message || 'Email delivery failed due to provider API response.';
}

function toPublicMailError(error: unknown, preferResend: boolean = false): PublicMailError {
  const mailError = (error ?? {}) as MailLikeError;
  return {
    message: preferResend ? getSafeResendErrorMessage(error) : getSafeMailerErrorMessage(error),
    code: mailError.code?.toUpperCase(),
    responseCode: mailError.responseCode,
  };
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  const secure = process.env.SMTP_SECURE === 'true';
  const rawPort = process.env.SMTP_PORT?.trim();
  const port = Number(rawPort || (secure ? 465 : 587));
  const user = process.env.SMTP_USER?.trim();
  const pass = sanitizeSmtpPassword(process.env.SMTP_PASS?.trim() ?? '', host);
  const from = resolveFromAddress(host, user);

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');

  if (missing.length > 0) {
    throw new Error(`SMTP is not configured. Missing: ${missing.join(', ')}`);
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive number.');
  }

  if (!from) {
    throw new Error('SMTP sender is not configured. Set SMTP_FROM or SMTP_USER.');
  }

  return {
    host: host!,
    port,
    secure,
    user: user!,
    pass,
    from: from!,
  };
}

function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'smtp') return 'smtp';
  if (provider === 'resend') return 'resend';
  return 'auto';
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && Boolean(resolveResendFromAddress());
}

function maskEmail(rawEmail: string): string {
  const value = rawEmail.trim();
  const atIndex = value.indexOf('@');
  if (atIndex <= 1) return '***';
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  const visibleLocal = local.slice(0, Math.min(2, local.length));
  return `${visibleLocal}***@${domain || '***'}`;
}

function resolveResendFromAddress(): string | undefined {
  return process.env.RESEND_FROM?.trim() || process.env.SMTP_FROM?.trim();
}

async function sendViaResend(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveResendFromAddress();

  if (!apiKey) {
    throw new Error('Resend is not configured. Missing RESEND_API_KEY.');
  }
  if (!from) {
    throw new Error('Resend sender is not configured. Set RESEND_FROM or SMTP_FROM.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Resend API ${response.status}: ${payload || 'request failed'}`);
  }
}

async function verifySmtpWithConfig(config: SmtpConfig): Promise<void> {
  const transporter = createMailTransport(config);
  await transporter.verify();
}

export async function verifyEmailTransport(): Promise<EmailTransportDiagnostics> {
  const provider = getEmailProvider();
  const resendConfigured = isResendConfigured();

  let smtpConfig: SmtpConfig | null = null;
  try {
    smtpConfig = getSmtpConfig();
  } catch {
    smtpConfig = null;
  }

  const diagnostics: EmailTransportDiagnostics = {
    provider,
    smtpConfigured: Boolean(smtpConfig),
    resendConfigured,
  };

  if (!smtpConfig) {
    return diagnostics;
  }

  diagnostics.smtp = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: maskEmail(smtpConfig.user),
    from: smtpConfig.from,
    verified: false,
  };

  try {
    await verifySmtpWithConfig(smtpConfig);
    diagnostics.smtp.verified = true;
    return diagnostics;
  } catch (primaryError) {
    diagnostics.smtp.error = toPublicMailError(primaryError);
    const fallbackConfig = isConnectionFailure(primaryError) ? getConnectionFallback(smtpConfig) : null;
    if (!fallbackConfig) {
      return diagnostics;
    }

    try {
      await verifySmtpWithConfig(fallbackConfig);
      diagnostics.smtp.verified = true;
      diagnostics.smtp.fallback = {
        port: fallbackConfig.port,
        secure: fallbackConfig.secure,
        verified: true,
      };
      diagnostics.smtp.error = undefined;
      return diagnostics;
    } catch (fallbackError) {
      diagnostics.smtp.fallback = {
        port: fallbackConfig.port,
        secure: fallbackConfig.secure,
        verified: false,
      };
      diagnostics.smtp.error = toPublicMailError(fallbackError);
      return diagnostics;
    }
  }
}

function createMailTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: 'TLSv1.2',
      servername: config.host,
    },
  });
}

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

async function sendWithConfig(config: SmtpConfig, options: SendEmailOptions) {
  const transporter = createMailTransport(config);
  await transporter.sendMail({
    from: config.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

function isConnectionFailure(error: unknown): boolean {
  const mailError = (error ?? {}) as MailLikeError;
  const code = mailError.code?.toUpperCase();
  return Boolean(
    code &&
    [
      'EDNS',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ESOCKET',
      'ECONNECTION',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'ENOENT',
    ].includes(code)
  );
}

function getConnectionFallback(config: SmtpConfig): SmtpConfig | null {
  if (!isGmailHost(config.host)) {
    return null;
  }

  // Some networks block implicit TLS on 465. Retry Gmail STARTTLS on 587.
  if (config.secure && config.port === 465) {
    return { ...config, port: 587, secure: false };
  }

  // If 587 is blocked, try implicit TLS on 465.
  if (!config.secure && config.port === 587) {
    return { ...config, port: 465, secure: true };
  }

  return null;
}

async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();

  if (provider === 'resend') {
    try {
      await sendViaResend(options);
      return { success: true };
    } catch (error) {
      return { success: false, error: getSafeResendErrorMessage(error) };
    }
  }

  const hasSmtpConfig = Boolean(process.env.SMTP_HOST?.trim()) && Boolean(process.env.SMTP_USER?.trim()) && Boolean(process.env.SMTP_PASS?.trim());
  if (!hasSmtpConfig && isResendConfigured()) {
    try {
      await sendViaResend(options);
      return { success: true };
    } catch (error) {
      return { success: false, error: getSafeResendErrorMessage(error) };
    }
  }

  const primaryConfig = getSmtpConfig();

  try {
    await sendWithConfig(primaryConfig, options);
    return { success: true };
  } catch (error) {
    const fallbackConfig = isConnectionFailure(error) ? getConnectionFallback(primaryConfig) : null;
    if (fallbackConfig) {
      console.warn(
        `SMTP primary connection failed (${primaryConfig.host}:${primaryConfig.port}, secure=${primaryConfig.secure}). Retrying fallback ${fallbackConfig.host}:${fallbackConfig.port}, secure=${fallbackConfig.secure}.`
      );
      try {
        await sendWithConfig(fallbackConfig, options);
        return { success: true };
      } catch (fallbackError) {
        if (provider !== 'smtp' && isResendConfigured() && isConnectionFailure(fallbackError)) {
          try {
            console.warn('SMTP fallback failed as well; using Resend API fallback.');
            await sendViaResend(options);
            return { success: true };
          } catch (resendError) {
            return { success: false, error: getSafeResendErrorMessage(resendError) };
          }
        }
        return { success: false, error: getSafeMailerErrorMessage(fallbackError) };
      }
    }

    if (provider !== 'smtp' && isResendConfigured() && isConnectionFailure(error)) {
      try {
        console.warn('SMTP connection failed; using Resend API fallback.');
        await sendViaResend(options);
        return { success: true };
      } catch (resendError) {
        return { success: false, error: getSafeResendErrorMessage(resendError) };
      }
    }

    return { success: false, error: getSafeMailerErrorMessage(error) };
  }
}

export async function sendSigningRequestEmail(
  recipient: IDocumentRecipient,
  document: DocumentEmailData,
  options?: EmailOptions,
  signingToken?: string
) {
  try {
    const baseUrl = getBaseUrl();
    const signingLink = `${baseUrl}/sign/${signingToken || document._id}?recipient=${recipient.id}`;

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
                <p style="margin: 0;"><strong>Status:</strong> ${recipient.status}</p>
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

              ${((document.sequentialSigning || document.signingMode === 'sequential') && recipient.order > 1) ? `
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
               <strong>Reminder: </strong> You will receive reminders every ${recipient.reminderDays} day${recipient.reminderDays > 1 ? 's' : ''} until this document is ${recipient.role === 'signer' ? 'signed' : 'completed'}.
              </p>
              ` : ''}
              </div>
            </div>
          `;

    const result = await sendEmail({
      to: recipient.email,
      subject,
      text: `${messageText}\n\nClick here to sign: ${signingLink}\n\nDocument: ${document.documentName}\nRole: ${recipient.role}\nStatus: ${recipient.status}`,
      html: htmlContent,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✓ Signing request email sent to ${recipient.email} for document ${document._id}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`✗ Failed to send email to ${recipient.email}:`, message);
    throw new Error(`Failed to send signing request to ${recipient.email}. Please verify email provider settings. Error: ${message}`);
  }
}

export async function sendSigningCompletionEmail(
  recipient: IDocumentRecipient,
  documentName: string,
  allRecipients: IDocumentRecipient[]
) {
  try {
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

    const result = await sendEmail({
      to: recipient.email,
      subject: `Signature Completed: ${documentName}`,
      text: `Your signature for "${documentName}" has been recorded. ${completedCount} of ${totalCount} recipients have completed signing.`,
      html: htmlContent,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✓ Completion email sent to ${recipient.email}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`✗ Failed to send completion email to ${recipient.email}:`, message);
    throw new Error(`Failed to send completion email. Error: ${message}`);
  }
}

export async function sendSigningRejectedEmail(
  toEmail: string,
  documentName: string,
  rejectedBy: IDocumentRecipient
) {
  try {
    const subject = `Signing request rejected: ${documentName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Signing Request Rejected</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <p><strong>${rejectedBy.name || 'A recipient'}</strong> rejected the signing request for:</p>
          <p><strong>${documentName}</strong></p>
          <p>You can create a new signing request if changes are needed.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: toEmail,
      subject,
      text: `A recipient rejected the signing request for "${documentName}".`,
      html: htmlContent,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✓ Rejection email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`✗ Failed to send rejection email to ${toEmail}:`, message);
    throw new Error(`Failed to send rejection email. Error: ${message}`);
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Password Reset Request</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <p>You requested a password reset.</p>
          <p>
            Click below to reset your password:
            <br />
            <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
          </p>
          <p>If you did not request this change, you can ignore this email.</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html,
    });

    return { success: result.success, error: result.error };
  } catch (error) {
    throw new Error(getSafeMailerErrorMessage(error));
  }
}
