import crypto from 'crypto';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface EmailLogEntry {
  to: string;
  subject: string;
  resetToken?: string;
  timestamp: string;
}

/**
 * Server-side transactional email service adapter for Opportunity OS.
 * Supports Resend, SendGrid, Postmark, and a test/mock fallback adapter.
 */
export class EmailService {
  private inMemoryLogs: EmailLogEntry[] = [];

  /**
   * Determine the configured email provider based on environment variables
   */
  getProviderName(): 'resend' | 'sendgrid' | 'postmark' | 'mock' {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    if (process.env.POSTMARK_SERVER_TOKEN) return 'postmark';
    return 'mock';
  }

  /**
   * Dispatch an email via the configured transactional provider
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const provider = this.getProviderName();
    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'Opportunity OS <noreply@opportunityos.com>';

    try {
      if (provider === 'resend') {
        const apiKey = process.env.RESEND_API_KEY!;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text
          })
        });

        const data = await res.json().catch(() => ({})) as any;
        if (!res.ok) {
          throw new Error(data.message || `Resend API error (${res.status})`);
        }
        return { success: true, provider: 'resend', messageId: data.id };
      }

      if (provider === 'sendgrid') {
        const apiKey = process.env.SENDGRID_API_KEY!;
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: options.to }] }],
            from: { email: from.includes('<') ? from.replace(/.*<([^>]+)>.*/, '$1') : from },
            subject: options.subject,
            content: [
              { type: 'text/plain', value: options.text },
              { type: 'text/html', value: options.html }
            ]
          })
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`SendGrid API error (${res.status}): ${errText}`);
        }
        return { success: true, provider: 'sendgrid' };
      }

      if (provider === 'postmark') {
        const token = process.env.POSTMARK_SERVER_TOKEN!;
        const res = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'X-Postmark-Server-Token': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            From: from,
            To: options.to,
            Subject: options.subject,
            HtmlBody: options.html,
            TextBody: options.text
          })
        });

        const data = await res.json().catch(() => ({})) as any;
        if (!res.ok) {
          throw new Error(data.Message || `Postmark API error (${res.status})`);
        }
        return { success: true, provider: 'postmark', messageId: data.MessageID };
      }

      // Mock / unconfigured fallback
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.warn('[EmailService] Notice: No transactional email provider configured (RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_SERVER_TOKEN). Password reset email suppressed.');
      } else {
        console.log(`[EmailService] Dev Notice: Captured email to ${options.to} (${options.subject}). Configure RESEND_API_KEY in production to deliver real emails.`);
      }

      const existingEntry = this.inMemoryLogs.find(l => l.to === options.to && l.subject === options.subject && l.resetToken);
      if (!existingEntry) {
        this.inMemoryLogs.push({
          to: options.to,
          subject: options.subject,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true, provider: 'mock' };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email via ${provider}:`, err.message);
      return { success: false, provider, error: err.message };
    }
  }

  /**
   * Send a password reset email with secure URL and expiration notice
   */
  async sendPasswordResetEmail(params: {
    to: string;
    resetToken: string;
    name?: string;
  }): Promise<EmailSendResult> {
    const { to, resetToken, name } = params;
    const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${appUrl}/?reset_token=${encodeURIComponent(resetToken)}`;

    // Store in-memory for testing verification whenever not in production
    if (process.env.NODE_ENV !== 'production') {
      this.inMemoryLogs.push({
        to,
        subject: 'Reset your Opportunity OS password',
        resetToken,
        timestamp: new Date().toISOString()
      });
    }

    const recipientName = name ? name.split(' ')[0] : 'Builder';

    const subject = 'Reset your Opportunity OS password';

    const text = `Hi ${recipientName},

We received a request to reset your password for Opportunity OS.

Click the following link to reset your password:
${resetUrl}

This link is valid for 1 hour. If you did not request this, please ignore this email and your password will remain unchanged.

Best regards,
The Opportunity OS Team
`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Opportunity OS password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #111827; border-radius: 16px; border: 1px solid #1f2937; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.025em;">Opportunity OS</h1>
      <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Personal AI Opportunity Engine</p>
    </div>
    
    <div style="border-top: 1px solid #1f2937; padding-top: 24px;">
      <p style="font-size: 15px; line-height: 24px; color: #e2e8f0; margin-bottom: 16px;">
        Hi ${recipientName},
      </p>
      <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin-bottom: 24px;">
        We received a request to reset the password for your Opportunity OS account. Click the button below to choose a new password:
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #f97316 0%, #10b981 100%); color: #0b0f19; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);">
          Reset Password
        </a>
      </div>
      
      <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-bottom: 8px;">
        This password reset link will expire in <strong>1 hour</strong>.
      </p>
      <p style="font-size: 12px; line-height: 18px; color: #64748b;">
        If you didn't request a password reset, you can safely ignore this email. Your account remains secure and no changes have been made.
      </p>
    </div>
    
    <div style="border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 16px; text-align: center;">
      <p style="font-size: 11px; color: #475569; margin: 0;">
        Opportunity OS — Turn Emerging AI Tools Into Tangible Opportunities
      </p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Retrieve in-memory logs (for unit/integration testing)
   */
  getInMemoryLogs(): EmailLogEntry[] {
    return this.inMemoryLogs;
  }

  /**
   * Clear in-memory logs
   */
  clearLogs(): void {
    this.inMemoryLogs = [];
  }
}

export const emailService = new EmailService();
