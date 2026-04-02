import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateServiceDto } from './dto/create-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  list() {
    return this.prisma.client.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async create(dto: CreateServiceDto, actor: AuthenticatedUserDto) {
    const department = await this.prisma.client.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Département introuvable.');
    }

    const service = await this.prisma.client.service.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        departmentId: department.id,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.activity.log({
      action: 'service.created',
      details: `Service ${service.name} créé pour ${department.name}`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
    });

    return service;
  }
}
