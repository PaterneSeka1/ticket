import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationChannel, NotificationType } from '../prisma/enums.js';
import type { Notification } from '../../generated/prisma/client.js';

type NotificationPayload = {
  ticketId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
};

type ListOptions = {
  limit: number;
  unreadOnly?: boolean;
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
