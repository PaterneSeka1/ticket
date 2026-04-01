import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto.js';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto.js';
import { CreateTicketTimelineDto } from './dto/create-ticket-timeline.dto.js';
import { TicketFiltersDto } from './dto/ticket-filters.dto.js';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { TicketPriority, TicketStatus } from '../prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.PENDING_ASSIGNMENT]: [
    TicketStatus.ASSIGNED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.ASSIGNED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CANCELLED]: [],
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  private ticketInclude = {
    attachments: true,
    category: { include: { incidentType: true } },
    incidentType: true,
    assignedResponsible: true,
    createdBy: true,
    statusHistory: { orderBy: { createdAt: 'asc' as const } },
    comments: {
      orderBy: { createdAt: 'asc' as const },
      include: { author: true },
    },
  } as const;

  async create(dto: CreateTicketDto, emitter: AuthenticatedUserDto) {
    await this.ensureCategory(dto.categoryId, dto.incidentTypeId);
    const ticketNumber = await this.generateTicketNumber();
    const attachments = dto.attachments?.map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachment.url,
      uploadedById: emitter.id,
    }));

    const ticket = await this.prisma.client.ticket.create({
      data: {
        ticketNumber,
        title: dto.title.trim(),
        description: dto.description.trim(),
        incidentTypeId: dto.incidentTypeId,
        categoryId: dto.categoryId,
        priority: dto.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.PENDING_ASSIGNMENT,
        createdById: emitter.id,
        assignedResponsibleId: dto.assignedResponsibleId ?? null,
        assignedAt: dto.assignedResponsibleId ? new Date() : null,
        attachments: attachments?.length ? { create: attachments } : undefined,
      },
      include: this.ticketInclude,
    });

    await this.createStatusLog(
      ticket.id,
      null,
      TicketStatus.PENDING_ASSIGNMENT,
      emitter.id,
      'Ticket créé',
    );
    await this.logActivity(
      'ticket.created',
      `${ticket.ticketNumber} créé`,
      emitter,
      ticket.id,
    );

    return ticket;
  }

  async findAll(filters: TicketFiltersDto) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.incidentTypeId) {
      where.incidentTypeId = filters.incidentTypeId;
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.assignedResponsibleId) {
      where.assignedResponsibleId = filters.assignedResponsibleId;
    }
    if (filters.createdById) {
      where.createdById = filters.createdById;
    }
    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {
        gte: filters.createdAfter ? new Date(filters.createdAfter) : undefined,
        lt: filters.createdBefore ? new Date(filters.createdBefore) : undefined,
      };
    }

    const tickets = await this.prisma.client.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });

    return tickets;
  }

  async findMine(userId: string) {
    return this.prisma.client.ticket.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
  }

  async findReceivedByDsi(user: AuthenticatedUserDto) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.prisma.client.ticket.findMany({
      where: { assignedResponsibleId: user.id },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.client.ticket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, actor?: AuthenticatedUserDto) {
    const ticket = await this.findOne(id);
    const data: Prisma.TicketUncheckedUpdateInput = {};
    if (dto.title) {
      data.title = dto.title.trim();
    }
    if (dto.description) {
      data.description = dto.description.trim();
    }
    if (dto.incidentTypeId) {
      await this.ensureIncidentType(dto.incidentTypeId);
      data.incidentTypeId = dto.incidentTypeId;
    }
    if (dto.categoryId) {
      if (!dto.incidentTypeId) {
        await this.ensureCategory(dto.categoryId, ticket.incidentTypeId);
      } else {
        await this.ensureCategory(dto.categoryId, dto.incidentTypeId);
      }
      data.categoryId = dto.categoryId;
    }
    if (dto.priority) {
      data.priority = dto.priority;
    }
    if (dto.assignedResponsibleId !== undefined) {
      data.assignedResponsibleId = dto.assignedResponsibleId ?? null;
      data.assignedAt = dto.assignedResponsibleId ? new Date() : null;
    }
    if (dto.resolutionComment !== undefined) {
      data.resolutionComment = dto.resolutionComment;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    const updated = await this.prisma.client.ticket.update({
      where: { id },
      data,
      include: this.ticketInclude,
    });
    await this.logActivity(
      'ticket.updated',
      `${updated.ticketNumber} mis à jour`,
      actor,
      updated.id,
    );
    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    actor: AuthenticatedUserDto,
  ) {
    const ticket = await this.findOne(id);
    const allowed = STATUS_TRANSITIONS[ticket.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException('Transition de statut interdite.');
    }
    const now = new Date();
    const data: Prisma.TicketUncheckedUpdateInput = {
      status: dto.status,
    };
    if (dto.status === TicketStatus.RESOLVED && !dto.resolutionComment) {
      throw new BadRequestException('Le commentaire de résolution est requis.');
    }
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolutionComment = dto.resolutionComment;
      data.resolvedAt = now;
    }
    if (dto.status === TicketStatus.CLOSED) {
      data.closedAt = now;
    }
    if (dto.status === TicketStatus.ASSIGNED) {
      data.assignedAt = now;
    }
    if (dto.status === TicketStatus.REOPENED) {
      data.resolutionComment = dto.resolutionComment ?? null;
      data.closedAt = null;
      data.resolvedAt = null;
    }

    const updated = await this.prisma.client.ticket.update({
      where: { id },
      data,
      include: this.ticketInclude,
    });

    await this.createStatusLog(
      ticket.id,
      ticket.status,
      dto.status,
      actor.id,
      dto.resolutionComment ?? '',
    );
    await this.logActivity(
      'ticket.status.changed',
      `${ticket.ticketNumber} → ${dto.status}`,
      actor,
      ticket.id,
    );
    return updated;
  }

  async addComment(
    id: string,
    dto: CreateTicketCommentDto,
    author: AuthenticatedUserDto,
  ) {
    await this.findOne(id);
    const comment = await this.prisma.client.ticketComment.create({
      data: {
        ticketId: id,
        authorId: author.id,
        content: dto.content.trim(),
      },
    });
    await this.logActivity(
      'ticket.comment',
      `Commentaire ajouté au ticket ${id}`,
      author,
      id,
    );
    return comment;
  }

  async recordTimeline(
    id: string,
    dto: CreateTicketTimelineDto,
    actor: AuthenticatedUserDto,
  ) {
    await this.findOne(id);
    const status = dto.status ?? undefined;
    await this.createStatusLog(
      id,
      undefined,
      status,
      actor.id,
      dto.comment ?? dto.label,
    );
    await this.logActivity(
      'ticket.timeline',
      `${dto.label} (${status ?? 'note'})`,
      actor,
      id,
    );
    return { id, label: dto.label, comment: dto.comment, status };
  }

  async remove(id: string, actor?: AuthenticatedUserDto) {
    const ticket = await this.findOne(id);
    await this.prisma.client.ticket.update({
      where: { id },
      data: { status: TicketStatus.CANCELLED },
    });
    if (actor) {
      await this.logActivity(
        'ticket.deleted',
        `${ticket.ticketNumber} annulé`,
        actor,
        id,
      );
    }
  }

  listCategories() {
    return this.prisma.client.category.findMany({
      include: { incidentType: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    dto: CreateTicketCategoryDto,
    actor: AuthenticatedUserDto,
  ) {
    await this.ensureIncidentType(dto.incidentTypeId);
    try {
      const category = await this.prisma.client.category.create({
        data: {
          name: dto.name.trim(),
          incidentTypeId: dto.incidentTypeId,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });
      await this.logActivity(
        'ticket.category.created',
        `Catégorie ${category.name} créée`,
        actor,
      );
      return category;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Une catégorie identique existe déjà.');
      }
      throw error;
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateTicketCategoryDto,
    actor: AuthenticatedUserDto,
  ) {
    if (dto.incidentTypeId) {
      await this.ensureIncidentType(dto.incidentTypeId);
    }
    const category = await this.prisma.client.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        incidentTypeId: dto.incidentTypeId,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
    await this.logActivity(
      'ticket.category.updated',
      `Catégorie ${category.name} modifiée`,
      actor,
    );
    return category;
  }

  async deleteCategory(id: string, actor: AuthenticatedUserDto) {
    await this.prisma.client.category.update({
      where: { id },
      data: { isActive: false },
    });
    await this.logActivity(
      'ticket.category.deleted',
      `Catégorie ${id} désactivée`,
      actor,
    );
  }

  private async ensureCategory(categoryId: string, incidentTypeId: string) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    if (!category.isActive) {
      throw new BadRequestException('La catégorie est désactivée.');
    }
    if (category.incidentTypeId !== incidentTypeId) {
      throw new BadRequestException(
        'La catégorie n’est pas rattachée au type d’incident sélectionné.',
      );
    }
    return category;
  }

  private async ensureIncidentType(incidentTypeId: string) {
    const incidentType = await this.prisma.client.incidentType.findUnique({
      where: { id: incidentTypeId },
    });
    if (!incidentType) {
      throw new NotFoundException('Type d’incident introuvable.');
    }
    if (!incidentType.isActive) {
      throw new BadRequestException('Le type d’incident est désactivé.');
    }
    return incidentType;
  }

  private async createStatusLog(
    ticketId: string,
    fromStatus: TicketStatus | null,
    toStatus: TicketStatus | undefined,
    changedById: string,
    comment: string,
  ) {
    if (!toStatus) {
      return null;
    }
    return this.prisma.client.statusLog.create({
      data: {
        ticketId,
        fromStatus,
        toStatus,
        changedById,
        comment,
      },
    });
  }

  private async logActivity(
    action: string,
    details: string,
    actor?: AuthenticatedUserDto,
    ticketId?: string,
  ) {
    await this.activity.log({
      action,
      details,
      actorId: actor?.id ?? null,
      actorName: actor ? `${actor.nom} ${actor.prenom}`.trim() : null,
      role: actor?.role ?? null,
      ticketId: ticketId ?? null,
    });
  }

  private async generateTicketNumber() {
    const date = new Date();
    const prefix = `INC-${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const count = await this.prisma.client.ticket.count({
      where: { ticketNumber: { startsWith: prefix } },
    });
    return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
