import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { TicketPriority } from '../prisma/enums.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto.js';

const SLA_PRIORITIES: TicketPriority[] = [
  TicketPriority.CRITICAL,
  TicketPriority.HIGH,
  TicketPriority.MEDIUM,
];

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  listPolicies() {
    return this.prisma.client.slaPolicy.findMany({
      where: { priority: { in: SLA_PRIORITIES } },
      orderBy: { priority: 'asc' },
    });
  }

  getPolicy(priority: TicketPriority) {
    return this.prisma.client.slaPolicy.findUnique({ where: { priority } });
  }

  async updatePolicy(
    priority: TicketPriority,
    dto: UpdateSlaPolicyDto,
    actor: AuthenticatedUserDto,
  ) {
    if (!SLA_PRIORITIES.includes(priority)) {
      throw new BadRequestException(
        'Les SLA ne couvrent que les priorités P1, P2 et P3.',
      );
    }
    const data = this.buildPayload(dto);
    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    const policy = await this.prisma.client.slaPolicy.upsert({
      where: { priority },
      update: data,
      create: {
        priority,
        responseMinutes: data.responseMinutes ?? dto.responseMinutes ?? 0,
        resolutionMinutes: data.resolutionMinutes ?? dto.resolutionMinutes ?? 0,
        isActive: data.isActive ?? dto.isActive ?? true,
      },
    });

    await this.activity.log({
      action: 'sla.policy.updated',
      details: `SLA ${priority} mis à jour`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
    });

    return policy;
  }

  private buildPayload(dto: UpdateSlaPolicyDto) {
    const payload: Partial<{
      responseMinutes: number;
      resolutionMinutes: number;
      isActive: boolean;
    }> = {};
    if (dto.responseMinutes !== undefined) {
      payload.responseMinutes = dto.responseMinutes;
    }
    if (dto.resolutionMinutes !== undefined) {
      payload.resolutionMinutes = dto.resolutionMinutes;
    }
    if (dto.isActive !== undefined) {
      payload.isActive = dto.isActive;
    }
    return payload;
  }
}
