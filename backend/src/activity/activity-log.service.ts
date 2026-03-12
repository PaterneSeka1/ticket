import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface LogOptions {
  action: string;
  details?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  role?: string | null;
  ticketId?: string | null;
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
}
