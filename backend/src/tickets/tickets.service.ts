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
import { NotificationService } from '../notifications/notification.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto.js';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto.js';
import { CreateTicketTimelineDto } from './dto/create-ticket-timeline.dto.js';
import { TicketFiltersDto } from './dto/ticket-filters.dto.js';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import {
  IncidentScope,
  NotificationChannel,
  NotificationType,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
} from '../prisma/enums.js';
import type { Category, IncidentType, Prisma } from '../../generated/prisma/client.js';

const ticketInclude: Prisma.TicketInclude = {
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

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof ticketInclude;
}>;

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
    private readonly notification: NotificationService,
  ) {}

  private readonly ticketInclude = ticketInclude;

  async create(
    dto: CreateTicketDto,
    emitter: AuthenticatedUserDto,
  ): Promise<TicketWithRelations> {
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
    await this.createStatusLog(
      ticket.id,
      TicketStatus.PENDING_ASSIGNMENT,
      TicketStatus.PENDING_ASSIGNMENT,
      emitter.id,
      'Ticket reçu et en attente d’un responsable',
    );
    const adminIds = await this.fetchAdminIds();
    await this.notifyAdminsOfNewTicket(ticket, adminIds);

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
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super administrateur.');
    }
    return this.prisma.client.ticket.findMany({
      where: { assignedResponsibleId: user.id },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
  }

  async findOne(id: string): Promise<TicketWithRelations> {
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

    const updated: TicketWithRelations = await this.prisma.client.ticket.update(
      {
        where: { id },
        data,
        include: this.ticketInclude,
      },
    );
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
    const isAdmin =
      actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (dto.status === TicketStatus.RESOLVED && !dto.resolutionComment) {
      throw new BadRequestException('Le commentaire de résolution est requis.');
    }
    if (dto.status === TicketStatus.RESOLVED && !isAdmin) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent marquer un ticket comme résolu.',
      );
    }
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolutionComment = dto.resolutionComment;
      data.resolvedAt = now;
    }
    if (dto.status === TicketStatus.CLOSED) {
      data.closedAt = now;
    }
    if (dto.status === TicketStatus.ASSIGNED) {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Accès réservé aux administrateurs pour assigner un ticket.',
        );
      }
      if (!dto.assignedResponsibleId) {
        throw new BadRequestException(
          'Un responsable doit être indiqué pour passer le ticket en ASSIGNED.',
        );
      }
      const responsible = await this.ensureActiveResponsible(
        dto.assignedResponsibleId,
      );
      data.assignedResponsibleId = responsible.id;
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
    await this.handleStatusNotifications(updated, dto.status, actor);
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
    return this.prisma.client
      .category.findMany({
        include: { incidentType: true },
        orderBy: { name: 'asc' },
      })
      .then((categories) => categories.map((category) => this.mapCategory(category)));
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
        include: { incidentType: true },
      });
      await this.logActivity(
        'ticket.category.created',
        `Catégorie ${category.name} créée`,
        actor,
      );
      return this.mapCategory(category);
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
      include: { incidentType: true },
    });
    await this.logActivity(
      'ticket.category.updated',
      `Catégorie ${category.name} modifiée`,
      actor,
    );
    return this.mapCategory(category);
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

  private mapCategory(
    category: Category & { incidentType: IncidentType },
  ): {
    id: string;
    libelle: string;
    name: string;
    type: TicketType;
    description: string | null;
    isActive: boolean;
    incidentTypeId: string;
    incidentType: {
      id: string;
      name: string;
      scope: IncidentScope;
      description?: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
  } {
    const type =
      category.incidentType.scope === IncidentScope.EXTERNE
        ? TicketType.DEMANDE
        : TicketType.INCIDENT;
    return {
      id: category.id,
      libelle: category.name,
      name: category.name,
      type,
      description: category.description ?? null,
      isActive: category.isActive,
      incidentTypeId: category.incidentTypeId,
      incidentType: {
        id: category.incidentType.id,
        name: category.incidentType.name,
        scope: category.incidentType.scope,
        description: category.incidentType.description ?? null,
        isActive: category.incidentType.isActive,
        createdAt: category.incidentType.createdAt,
        updatedAt: category.incidentType.updatedAt,
      },
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  listIncidentTypes() {
    return this.prisma.client.incidentType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
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
    fromStatus: TicketStatus | null | undefined,
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

  private async ensureActiveResponsible(id: string) {
    const responsible = await this.prisma.client.user.findUnique({
      where: { id },
    });
    if (!responsible || !responsible.isActive) {
      throw new NotFoundException('Responsable introuvable ou désactivé.');
    }
    return responsible;
  }

  private async handleStatusNotifications(
    ticket: TicketWithRelations,
    status: TicketStatus,
    actor: AuthenticatedUserDto,
  ) {
    if (
      status === TicketStatus.ASSIGNED ||
      status === TicketStatus.IN_PROGRESS
    ) {
      await this.notifyAssignedUser(
        ticket,
        'Ticket assigné',
        `Le ticket ${ticket.ticketNumber} vous a été attribué.`,
      );
    }
    if (status === TicketStatus.RESOLVED) {
      await this.notifyCreatorOnResolution(ticket, actor);
    }
  }

  private async notifyAssignedUser(
    ticket: TicketWithRelations,
    title: string,
    message: string,
  ) {
    if (!ticket.assignedResponsibleId) {
      return;
    }
    await this.notification.notifyUsers([ticket.assignedResponsibleId], {
      ticketId: ticket.id,
      type: NotificationType.STATUS_IN_PROGRESS,
      title,
      message,
      channel: NotificationChannel.IN_APP,
    });
  }

  private async notifyCreatorOnResolution(
    ticket: TicketWithRelations,
    actor: AuthenticatedUserDto,
  ) {
    const recipients = new Set<string>();
    if (ticket.createdById) {
      recipients.add(ticket.createdById);
    }
    if (ticket.assignedResponsibleId) {
      recipients.add(ticket.assignedResponsibleId);
    }
    if (!recipients.size) {
      return;
    }
    const actorName = `${actor.prenom} ${actor.nom}`.trim();
    await this.notification.notifyUsers(Array.from(recipients), {
      ticketId: ticket.id,
      type: NotificationType.STATUS_RESOLVED,
      title: `Ticket ${ticket.ticketNumber} résolu`,
      message: `${actorName} a marqué le ticket ${ticket.ticketNumber} comme résolu.`,
      channel: NotificationChannel.IN_APP,
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

  private async fetchAdminIds() {
    const admins = await this.prisma.client.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        isActive: true,
      },
      select: { id: true },
    });
    return admins.map((admin) => admin.id);
  }

  private async notifyAdminsOfNewTicket(
    ticket: TicketWithRelations,
    adminIds: string[],
  ) {
    if (!adminIds.length) {
      return;
    }
    await this.notification.notifyUsers(adminIds, {
      ticketId: ticket.id,
      type: NotificationType.TICKET_CREATED,
      title: `Nouveau ticket ${ticket.ticketNumber}`,
      message: `${ticket.title} attend d’être assigné.`,
      channel: NotificationChannel.IN_APP,
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
