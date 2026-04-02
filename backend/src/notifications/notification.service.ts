import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationChannel, NotificationType } from '../prisma/enums.js';

type NotificationPayload = {
  ticketId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyUsers(userIds: string[], payload: NotificationPayload) {
    const channel = payload.channel ?? NotificationChannel.IN_APP;
    const recipients = Array.from(new Set(userIds));
    if (!recipients.length) {
      return;
    }
    const jobs = recipients.map((userId) =>
      this.prisma.client.notification.create({
        data: {
          userId,
          ticketId: payload.ticketId ?? null,
          type: payload.type,
          channel,
          title: payload.title,
          message: payload.message,
        },
      }),
    );
    await Promise.all(jobs);
  }
}
