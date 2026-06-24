import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service.js';
import { WhatsappService } from '../whatsapp/whatsapp.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationChannel, NotificationType } from '../prisma/enums.js';
import type { Notification } from '../../generated/prisma/client.js';

type NotificationPayload = {
  ticketId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  ticketNumber?: string;
};

type ListOptions = {
  limit: number;
  unreadOnly?: boolean;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async notifyUsers(userIds: string[], payload: NotificationPayload) {
    const channel = payload.channel ?? NotificationChannel.IN_APP;
    const recipients = Array.from(new Set(userIds));
    if (!recipients.length) return;

    // Guarantee DB persistence first with a single batch write
    await this.prisma.client.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        ticketId: payload.ticketId ?? null,
        type: payload.type,
        channel,
        title: payload.title,
        message: payload.message,
      })),
    });

    // Fetch users with their notification preferences
    const users = await this.prisma.client.user.findMany({
      where: { id: { in: recipients } },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        receiveEmails: true,
        phone: true,
        receiveWhatsapp: true,
      },
    });

    const emailJobs = users
      .filter((u) => u.receiveEmails && u.email)
      .map((u) =>
        this.email.sendNotification({
          to: u.email,
          name: `${u.prenom} ${u.nom}`.trim() || u.email,
          notificationType: payload.type,
          title: payload.title,
          message: payload.message,
          ticketNumber: payload.ticketNumber,
          ticketId: payload.ticketId,
        }),
      );

    const whatsappJobs = users
      .filter((u) => u.receiveWhatsapp && u.phone)
      .map((u) =>
        this.whatsapp.send({
          to: u.phone!,
          name: `${u.prenom} ${u.nom}`.trim() || u.phone!,
          notificationType: payload.type,
          title: payload.title,
          message: payload.message,
          ticketNumber: payload.ticketNumber,
          ticketId: payload.ticketId,
        }),
      );

    // Fire-and-forget: failures in email/WhatsApp never block the caller
    void Promise.allSettled([...emailJobs, ...whatsappJobs]);
  }

  listForUser(userId: string, options: ListOptions): Promise<Notification[]> {
    return this.prisma.client.notification.findMany({
      where: {
        userId,
        ...(options.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(options.limit, 100)),
    });
  }

  countUnreadForUser(userId: string): Promise<number> {
    return this.prisma.client.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.prisma.client.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return result.count > 0;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.client.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async deleteForUser(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.prisma.client.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }
}
