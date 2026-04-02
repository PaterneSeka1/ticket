import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateResolutionResponsibleDto } from './dto/create-resolution-responsible.dto.js';

@Injectable()
export class ResolutionResponsibleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  list() {
    return this.prisma.client.resolutionResponsible.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    dto: CreateResolutionResponsibleDto,
    actor: AuthenticatedUserDto,
  ) {
    const created = await this.prisma.client.resolutionResponsible.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        role: dto.role?.trim() ?? null,
        department: dto.department?.trim() ?? null,
        isExternal: dto.isExternal ?? false,
        isActive: true,
      },
    });

    await this.activity.log({
      action: 'resolution-responsible.created',
      details: `Responsable ${created.firstName} ${created.lastName} ajouté`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
    });

    return created;
  }
}
