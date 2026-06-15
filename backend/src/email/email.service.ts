import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationType } from '../prisma/enums.js';

export type EmailPayload = {
  to: string;
  name: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  ticketNumber?: string;
  ticketId?: string | null;
};

const STATUS_COLORS: Partial<Record<NotificationType, string>> = {
  [NotificationType.TICKET_CREATED]: '#2563eb',
  [NotificationType.TICKET_ASSIGNED]: '#7c3aed',
  [NotificationType.TICKET_REASSIGNED]: '#7c3aed',
  [NotificationType.STATUS_IN_PROGRESS]: '#d97706',
  [NotificationType.STATUS_RESOLVED]: '#16a34a',
  [NotificationType.STATUS_UNRESOLVED]: '#dc2626',
  [NotificationType.STATUS_CLOSED]: '#6b7280',
  [NotificationType.TICKET_REOPENED]: '#0891b2',
  [NotificationType.TICKET_CANCELLED]: '#6b7280',
  [NotificationType.NEW_COMMENT]: '#f4b90a',
};

const STATUS_ICONS: Partial<Record<NotificationType, string>> = {
  [NotificationType.TICKET_CREATED]: '🎫',
  [NotificationType.TICKET_ASSIGNED]: '👤',
  [NotificationType.TICKET_REASSIGNED]: '🔄',
  [NotificationType.STATUS_IN_PROGRESS]: '⚙️',
  [NotificationType.STATUS_RESOLVED]: '✅',
  [NotificationType.STATUS_UNRESOLVED]: '❌',
  [NotificationType.STATUS_CLOSED]: '🔒',
  [NotificationType.TICKET_REOPENED]: '🔓',
  [NotificationType.TICKET_CANCELLED]: '🚫',
  [NotificationType.NEW_COMMENT]: '💬',
};

function buildHtml(payload: EmailPayload): string {
  const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const color = STATUS_COLORS[payload.notificationType] ?? '#f4b90a';
  const icon = STATUS_ICONS[payload.notificationType] ?? '🔔';
  const ticketLink =
    payload.ticketId
      ? `${appUrl}/dashboard/tickets/${payload.ticketId}`
      : null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${payload.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#2b1d10;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#f4b90a;font-size:20px;font-weight:bold;letter-spacing:1px;">TICKETING VEDEM</span>
                  </td>
                  <td align="right">
                    <span style="background-color:${color};color:#ffffff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">${icon} Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Bonjour <strong style="color:#2b1d10;">${escapeHtml(payload.name)}</strong>,</p>

              <!-- Title block -->
              <div style="border-left:4px solid ${color};padding:16px 20px;background-color:#f9fafb;border-radius:0 8px 8px 0;margin:20px 0;">
                <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#111827;">${escapeHtml(payload.title)}</p>
                ${payload.ticketNumber ? `<span style="font-size:12px;color:#6b7280;">Réf. ${escapeHtml(payload.ticketNumber)}</span>` : ''}
              </div>

              <!-- Message -->
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(payload.message)}</p>

              <!-- CTA -->
              ${ticketLink ? `
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background-color:${color};">
                    <a href="${ticketLink}" style="display:inline-block;padding:12px 28px;color:${color === '#f4b90a' ? '#2b1d10' : '#ffffff'};font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">
                      Voir le ticket →
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Cet email a été envoyé automatiquement par la plateforme Ticketing VEDEM.<br/>
                Pour ne plus recevoir ces emails, modifiez vos préférences dans votre profil.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly enabled: boolean;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST;

    this.enabled = Boolean(user && pass && host);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        'Email désactivé — configurez SMTP_HOST, SMTP_USER, SMTP_PASS dans .env',
      );
    }
  }

  async sendNotification(payload: EmailPayload): Promise<void> {
    if (!this.enabled || !this.transporter) return;

    const from =
      process.env.SMTP_FROM ??
      `"${process.env.SMTP_FROM_NAME ?? 'Ticketing VEDEM'}" <${process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER}>`;

    try {
      await this.transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.title,
        html: buildHtml(payload),
        text: `${payload.title}\n\n${payload.message}`,
      });
    } catch (err) {
      this.logger.error(`Échec envoi email à ${payload.to}: ${String(err)}`);
    }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<void> {
    if (!this.enabled || !payloads.length) return;
    await Promise.all(payloads.map((p) => this.sendNotification(p)));
  }
}
