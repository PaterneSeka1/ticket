import { Injectable } from '@nestjs/common';
import type { ActivityLog, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../prisma/enums.js';

interface LogOptions {
  action: string;
  details?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  role?: UserRole | null;
  ticketId?: string | null;
}

interface FetchOptions {
  limit?: number;
  actions?: string[];
  since?: Date;
  actorId?: string;
  search?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(options: LogOptions) {
    await this.prisma.client.activityLog.create({
      data: {
        action: options.action,
        details: options.details ?? null,
        actorId: options.actorId ?? null,
        actorName: options.actorName ?? null,
        role: options.role ?? null,
        ticketId: options.ticketId ?? null,
      },
    });
  }

  fetchLogs(options: FetchOptions = {}): Promise<ActivityLog[]> {
    const sanitizedLimit = Math.max(1, Math.min(options.limit ?? 100, 200));
    const where: Prisma.ActivityLogWhereInput = {};
    if (options.actions?.length) {
      where.action = { in: options.actions };
    }
    if (options.since) {
      where.createdAt = { gte: options.since };
    }
    if (options.actorId) {
      where.actorId = options.actorId;
    }
    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        {
          actorName: { contains: search, mode: 'insensitive' },
        },
        {
          details: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    return this.prisma.client.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: sanitizedLimit,
    });
  }
}
