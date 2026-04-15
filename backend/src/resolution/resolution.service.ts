import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateResolutionResponsibleDto } from './dto/create-resolution-responsible.dto.js';
import { UpdateResolutionResponsibleDto } from './dto/update-resolution-responsible.dto.js';

@Injectable()
export class ResolutionResponsibleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  list() {
    return this.prisma.client.resolutionResponsible.findMany({
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

  async update(
    id: string,
    dto: UpdateResolutionResponsibleDto,
    actor: AuthenticatedUserDto,
  ) {
    const existing = await this.prisma.client.resolutionResponsible.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Responsable introuvable.');
    }

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.email !== undefined) data.email = dto.email.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.role !== undefined) data.role = dto.role.trim() || null;
    if (dto.department !== undefined) data.department = dto.department.trim() || null;
    if (dto.isExternal !== undefined) data.isExternal = dto.isExternal;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    let updated;
    try {
      updated = await this.prisma.client.resolutionResponsible.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Cet email est déjà utilisé.');
      }
      throw error;
    }

    await this.activity.log({
      action: 'resolution-responsible.updated',
      details: `Responsable ${updated.firstName} ${updated.lastName} mis à jour`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
    });

    return updated;
  }

  async remove(id: string, actor: AuthenticatedUserDto) {
    const existing = await this.prisma.client.resolutionResponsible.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Responsable introuvable.');
    }

    await this.prisma.client.resolutionResponsible.update({
      where: { id },
      data: { isActive: false },
    });

    await this.activity.log({
      action: 'resolution-responsible.deleted',
      details: `Responsable ${existing.firstName} ${existing.lastName} supprimé`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
    });
  }
}
