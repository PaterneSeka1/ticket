import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { NotificationType } from '../prisma/enums.js';

export type WhatsappPayload = {
  to: string;
  name: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  ticketNumber?: string;
  ticketId?: string | null;
};

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  [NotificationType.TICKET_CREATED]: '🎫 Nouveau ticket',
  [NotificationType.TICKET_ASSIGNED]: '👤 Ticket assigné',
  [NotificationType.TICKET_REASSIGNED]: '🔄 Ticket réassigné',
  [NotificationType.STATUS_IN_PROGRESS]: '⚙️ En cours de traitement',
  [NotificationType.STATUS_RESOLVED]: '✅ Résolu',
  [NotificationType.STATUS_UNRESOLVED]: '❌ Non résolu',
  [NotificationType.STATUS_CLOSED]: '🔒 Fermé',
  [NotificationType.TICKET_REOPENED]: '🔓 Rouvert',
  [NotificationType.TICKET_CANCELLED]: '🚫 Annulé',
  [NotificationType.NEW_COMMENT]: '💬 Nouveau commentaire',
};

function buildMessage(payload: WhatsappPayload): string {
  const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const label = TYPE_LABELS[payload.notificationType] ?? '🔔 Notification';
  const ticketRef = payload.ticketNumber ? ` _(${payload.ticketNumber})_` : '';
  const link = payload.ticketId
    ? `\n🔗 ${appUrl}/dashboard/tickets/${payload.ticketId}`
    : '';

  return [
    `*TICKETING VEDEM*`,
    `${label}${ticketRef}`,
    ``,
    `Bonjour *${payload.name}*,`,
    ``,
    `*${payload.title}*`,
    payload.message,
    link,
    ``,
    `_Notification automatique — modifiez vos préférences dans votre profil._`,
  ]
    .join('\n')
    .trim();
}

function toWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const e164 = digits.startsWith('00')
    ? `+${digits.slice(2)}`
    : phone.trim().startsWith('+')
      ? phone.trim()
      : `+${digits}`;
  return `whatsapp:${e164}`;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: ReturnType<typeof twilio> | null = null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    this.enabled = Boolean(accountSid && authToken && fromNumber);
    this.from = fromNumber ? `whatsapp:${fromNumber}` : '';

    if (this.enabled) {
      this.client = twilio(accountSid!, authToken!);
    } else {
      this.logger.warn(
        'WhatsApp désactivé — configurez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM dans .env',
      );
    }
  }

  async send(payload: WhatsappPayload): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      const to = toWhatsappNumber(payload.to);
      await this.client.messages.create({
        from: this.from,
        to,
        body: buildMessage(payload),
      });
    } catch (err) {
      this.logger.error(`Échec WhatsApp vers ${payload.to} : ${String(err)}`);
    }
  }

  async sendBatch(payloads: WhatsappPayload[]): Promise<void> {
    if (!this.enabled || !payloads.length) return;
    await Promise.all(payloads.map((p) => this.send(p)));
  }
}
