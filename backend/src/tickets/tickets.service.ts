import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { NotificationService } from '../notifications/notification.service.js';
import { isPrismaKnownRequestError } from '../prisma/prisma-errors.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateConcernedProductDto } from './dto/create-concerned-product.dto.js';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto.js';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto.js';
import { CreateTicketTimelineDto } from './dto/create-ticket-timeline.dto.js';
import { TicketFiltersDto } from './dto/ticket-filters.dto.js';
import { UpdateConcernedProductDto } from './dto/update-concerned-product.dto.js';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import {
  ServiceScope,
  NotificationChannel,
  NotificationType,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
} from '../prisma/enums.js';
import type {
  Category,
  ServiceType,
  Prisma,
} from '../../generated/prisma/client.js';

const userSelect = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  matricule: true,
  role: true,
  departmentId: true,
  serviceId: true,
  isActive: true,
  receiveEmails: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

const ticketInclude: Prisma.TicketInclude = {
  attachments: true,
  category: { include: { serviceType: true } },
  serviceType: true,
  assignedResponsible: true,
  createdBy: { select: userSelect },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    include: { changedBy: { select: userSelect } },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: userSelect } },
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
  [TicketStatus.ASSIGNED]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.UNRESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.RESOLVED,
    TicketStatus.UNRESOLVED,
    TicketStatus.ASSIGNED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.UNRESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
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

  private minutesBetween(from: Date, to: Date) {
    const diffMs = to.getTime() - from.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
    return Math.floor(diffMs / 60000);
  }

  private async getActiveSlaPoliciesByPriority() {
    const policies = await this.prisma.client.slaPolicy.findMany({
      where: {
        isActive: true,
        priority: {
          in: [
            TicketPriority.CRITICAL,
            TicketPriority.HIGH,
            TicketPriority.MEDIUM,
          ],
        },
      },
      select: {
        priority: true,
        responseMinutes: true,
        resolutionMinutes: true,
        isActive: true,
      },
    });

    return new Map(policies.map((policy) => [policy.priority, policy]));
  }

  private optionalTrimmed(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeProducts(products?: string[], product?: string | null) {
    const values = [...(products ?? []), product ?? '']
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(values));
  }

  private canManageConcernedProducts(actor?: AuthenticatedUserDto) {
    return actor?.role === UserRole.ADMIN || actor?.role === UserRole.SUPER_ADMIN;
  }

  private parseOptionalDate(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La date de détection est invalide.');
    }
    return date;
  }

  private async ensureConcernedProducts(productNames: string[]) {
    if (!productNames.length) return;

    const configuredProducts =
      await this.prisma.client.concernedProduct.findMany({
        where: {
          isActive: true,
          name: { in: productNames },
        },
        select: { name: true },
      });
    const configuredNames = new Set(
      configuredProducts.map((product) => product.name),
    );
    const missingProducts = productNames.filter(
      (productName) => !configuredNames.has(productName),
    );

    if (missingProducts.length) {
      throw new BadRequestException(
        `Produit concerné inconnu: ${missingProducts.join(', ')}`,
      );
    }
  }

  private withSla(
    ticket: TicketWithRelations,
    now: Date,
    policies: Map<
      TicketPriority,
      {
        priority: TicketPriority;
        responseMinutes: number;
        resolutionMinutes: number;
        isActive: boolean;
      }
    >,
  ) {
    const policy = policies.get(ticket.priority);
    if (!policy?.isActive) {
      return ticket;
    }

    const createdAt = ticket.createdAt;
    const assignedAt = ticket.assignedAt ?? null;
    const resolvedAt = ticket.resolvedAt ?? null;
    const closedAt = ticket.closedAt ?? null;

    const resolutionEnd =
      ticket.status === TicketStatus.RESOLVED
        ? resolvedAt
        : ticket.status === TicketStatus.UNRESOLVED
          ? closedAt
          : null;

    const responseWaitMinutes = this.minutesBetween(
      createdAt,
      assignedAt ?? now,
    );
    const resolutionWaitMinutes = this.minutesBetween(
      createdAt,
      resolutionEnd ?? now,
    );

    const responseMaxMinutes = policy.responseMinutes ?? 0;
    const resolutionMaxMinutes = policy.resolutionMinutes ?? 0;

    return {
      ...ticket,
      // Backward-compatible fields consumed by the frontend SLA widgets.
      slaMaxMinutes: resolutionMaxMinutes || undefined,
      waitMinutes: resolutionWaitMinutes || 0,
      // Extra SLA details (useful for future UI / exports).
      slaResponseMinutes: responseMaxMinutes || undefined,
      responseWaitMinutes,
      slaResolutionMinutes: resolutionMaxMinutes || undefined,
      resolutionWaitMinutes,
      slaResponseBreached:
        responseMaxMinutes > 0
          ? responseWaitMinutes > responseMaxMinutes
          : undefined,
      slaResolutionBreached:
        resolutionMaxMinutes > 0
          ? resolutionWaitMinutes > resolutionMaxMinutes
          : undefined,
    };
  }

  private async logSlaBreach(
    kind: 'response' | 'resolution',
    ticket: TicketWithRelations,
    actor: AuthenticatedUserDto,
    payload: { waited: number; max: number },
  ) {
    await this.activity.log({
      action:
        kind === 'response'
          ? 'sla.response.breached'
          : 'sla.resolution.breached',
      details: `Ticket ${ticket.ticketNumber} SLA ${kind} dépassé (${payload.waited}m > ${payload.max}m)`,
      actorId: actor.id,
      actorName: `${actor.nom} ${actor.prenom}`.trim(),
      role: actor.role,
      ticketId: ticket.id,
    });

    const adminIds = await this.fetchAdminIds();
    if (!adminIds.length) return;
    await this.notification.notifyUsers(adminIds, {
      ticketId: ticket.id,
      type: NotificationType.STATUS_IN_PROGRESS,
      title: `SLA dépassé (${kind})`,
      message: `Le ticket ${ticket.ticketNumber} a dépassé le SLA ${kind} (${payload.waited}m > ${payload.max}m).`,
      channel: NotificationChannel.IN_APP,
    });
  }

  async create(
    dto: CreateTicketDto,
    emitter: AuthenticatedUserDto,
  ): Promise<TicketWithRelations> {
    await this.ensureCategory(dto.categoryId, dto.serviceTypeId);
    const serviceType = await this.ensureServiceType(dto.serviceTypeId);
    const ticketNumber = await this.generateTicketNumber();
    const attachments = dto.attachments?.map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachment.url,
      uploadedById: emitter.id,
    }));
    const products = this.normalizeProducts(dto.products, dto.product);
    const clientName = this.optionalTrimmed(dto.clientName);
    const canManageProducts = this.canManageConcernedProducts(emitter);

    if (!canManageProducts && products.length) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent ajouter des produits concernés.',
      );
    }

    if (serviceType.scope === ServiceScope.EXTERNE) {
      if (!clientName) {
        throw new BadRequestException('Le nom du client est requis.');
      }
      if (canManageProducts && !products.length) {
        throw new BadRequestException('Au moins un produit concerné est requis.');
      }
    }
    if (canManageProducts) {
      await this.ensureConcernedProducts(products);
    }

    const ticket = await this.prisma.client.ticket.create({
      data: {
        ticketNumber,
        title: dto.title.trim(),
        description: dto.description.trim(),
        serviceTypeId: dto.serviceTypeId,
        categoryId: dto.categoryId,
        priority: dto.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.PENDING_ASSIGNMENT,
        createdById: emitter.id,
        clientName,
        product: canManageProducts ? products[0] ?? null : null,
        products: canManageProducts ? products : [],
        attachmentName: this.optionalTrimmed(dto.attachmentName),
        detectedAt: this.parseOptionalDate(dto.detectedAt),
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
    await this.notification.notifyUsers([emitter.id], {
      ticketId: ticket.id,
      type: NotificationType.TICKET_CREATED,
      title: `Ticket ${ticket.ticketNumber} créé`,
      message:
        'Votre demande a bien été enregistrée. Vous serez notifié des changements de statut.',
      channel: NotificationChannel.IN_APP,
    });

    const policies = await this.getActiveSlaPoliciesByPriority();
    return this.withSla(ticket, new Date(), policies);
  }

  async findAll(filters: TicketFiltersDto) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.serviceTypeId) {
      where.serviceTypeId = filters.serviceTypeId;
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

    const policies = await this.getActiveSlaPoliciesByPriority();
    const now = new Date();
    return tickets.map((ticket) => this.withSla(ticket, now, policies));
  }

  async findMine(userId: string) {
    const tickets = await this.prisma.client.ticket.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
    const policies = await this.getActiveSlaPoliciesByPriority();
    const now = new Date();
    return tickets.map((ticket) => this.withSla(ticket, now, policies));
  }

  async findReceivedByDsi(user: AuthenticatedUserDto) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super administrateur.');
    }
    const tickets = await this.prisma.client.ticket.findMany({
      where: { assignedResponsibleId: user.id },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
    const policies = await this.getActiveSlaPoliciesByPriority();
    const now = new Date();
    return tickets.map((ticket) => this.withSla(ticket, now, policies));
  }

  async findOne(id: string): Promise<TicketWithRelations> {
    const ticket = await this.prisma.client.ticket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
    const policies = await this.getActiveSlaPoliciesByPriority();
    return this.withSla(ticket, new Date(), policies);
  }

  async update(id: string, dto: UpdateTicketDto, actor?: AuthenticatedUserDto) {
    const ticket = await this.findOne(id);
    const data: Prisma.TicketUncheckedUpdateInput = {};
    const isAdmin =
      actor?.role === UserRole.ADMIN || actor?.role === UserRole.SUPER_ADMIN;

    if (dto.priority !== undefined && !isAdmin) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent modifier la priorité.',
      );
    }
    if (dto.assignedResponsibleId !== undefined) {
      throw new BadRequestException(
        "L'assignation doit passer par l'endpoint de statut.",
      );
    }
    if (dto.resolutionComment !== undefined) {
      throw new BadRequestException(
        "Le commentaire de résolution doit passer par l'endpoint de statut.",
      );
    }
    if (dto.title) {
      data.title = dto.title.trim();
    }
    if (dto.description) {
      data.description = dto.description.trim();
    }
    if (dto.serviceTypeId) {
      await this.ensureServiceType(dto.serviceTypeId);
      data.serviceTypeId = dto.serviceTypeId;
    }
    if (dto.categoryId) {
      if (!dto.serviceTypeId) {
        await this.ensureCategory(dto.categoryId, ticket.serviceTypeId);
      } else {
        await this.ensureCategory(dto.categoryId, dto.serviceTypeId);
      }
      data.categoryId = dto.categoryId;
    }
    if (dto.priority) {
      data.priority = dto.priority;
    }
    if (dto.clientName !== undefined) {
      data.clientName = this.optionalTrimmed(dto.clientName);
    }
    if (dto.products !== undefined || dto.product !== undefined) {
      if (!this.canManageConcernedProducts(actor)) {
        throw new ForbiddenException(
          'Seuls les administrateurs peuvent modifier les produits concernés.',
        );
      }
      const products = this.normalizeProducts(
        dto.products ?? [],
        dto.product,
      );
      await this.ensureConcernedProducts(products);
      data.products = products;
      data.product = products[0] ?? null;
    }
    if (dto.attachmentName !== undefined) {
      data.attachmentName = this.optionalTrimmed(dto.attachmentName);
    }
    if (dto.detectedAt !== undefined) {
      data.detectedAt = this.parseOptionalDate(dto.detectedAt);
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

    if (dto.priority !== undefined && isAdmin) {
      await this.logActivity(
        'ticket.priority.changed',
        `${updated.ticketNumber} priorité → ${dto.priority}`,
        actor,
        updated.id,
      );
    }

    const policies = await this.getActiveSlaPoliciesByPriority();
    return this.withSla(updated, new Date(), policies);
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

    if (dto.status === TicketStatus.RESOLVED && !isAdmin) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent marquer un ticket comme résolu.',
      );
    }
    if (dto.status === TicketStatus.UNRESOLVED && !isAdmin) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent marquer un ticket comme non résolu.',
      );
    }
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolutionComment = dto.resolutionComment;
      data.resolvedAt = now;
    }
    if (dto.status === TicketStatus.UNRESOLVED) {
      data.resolutionComment = dto.resolutionComment;
      data.closedAt = now;
      data.resolvedAt = null;
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
    await this.handleStatusNotifications(ticket, updated, dto.status, actor);

    const policies = await this.getActiveSlaPoliciesByPriority();
    const policy = policies.get(updated.priority);
    if (policy?.isActive) {
      if (dto.status === TicketStatus.ASSIGNED && policy.responseMinutes > 0) {
        const waited = this.minutesBetween(
          updated.createdAt,
          updated.assignedAt ?? now,
        );
        if (waited > policy.responseMinutes) {
          await this.logSlaBreach('response', updated, actor, {
            waited,
            max: policy.responseMinutes,
          });
        }
      }
      if (
        (dto.status === TicketStatus.RESOLVED ||
          dto.status === TicketStatus.UNRESOLVED) &&
        policy.resolutionMinutes > 0
      ) {
        const end = updated.resolvedAt ?? updated.closedAt ?? now;
        const waited = this.minutesBetween(updated.createdAt, end);
        if (waited > policy.resolutionMinutes) {
          await this.logSlaBreach('resolution', updated, actor, {
            waited,
            max: policy.resolutionMinutes,
          });
        }
      }
    }

    return this.withSla(updated, new Date(), policies);
  }

  async addComment(
    id: string,
    dto: CreateTicketCommentDto,
    author: AuthenticatedUserDto,
  ) {
    const ticket = await this.findOne(id);
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

    const recipients = new Set<string>();
    if (ticket.createdById) {
      recipients.add(ticket.createdById);
    }
    if (ticket.assignedResponsibleId) {
      recipients.add(ticket.assignedResponsibleId);
    }
    recipients.delete(author.id);

    if (recipients.size) {
      const authorName = `${author.prenom} ${author.nom}`.trim();
      const snippet = dto.content.trim().slice(0, 180);
      await this.notification.notifyUsers(Array.from(recipients), {
        ticketId: ticket.id,
        type: NotificationType.NEW_COMMENT,
        title: `Nouveau commentaire — ${ticket.ticketNumber}`,
        message: `${authorName} : ${snippet}`,
        channel: NotificationChannel.IN_APP,
      });
    }

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
    return this.prisma.client.category
      .findMany({
        include: { serviceType: true },
        orderBy: { name: 'asc' },
      })
      .then((categories) =>
        categories.map((category) => this.mapCategory(category)),
      );
  }

  async createCategory(
    dto: CreateTicketCategoryDto,
    actor: AuthenticatedUserDto,
  ) {
    await this.ensureServiceType(dto.serviceTypeId);
    try {
      const category = await this.prisma.client.category.create({
        data: {
          name: dto.name.trim(),
          serviceTypeId: dto.serviceTypeId,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
        include: { serviceType: true },
      });
      await this.logActivity(
        'ticket.category.created',
        `Catégorie ${category.name} créée`,
        actor,
      );
      return this.mapCategory(category);
    } catch (error) {
      if (isPrismaKnownRequestError(error, 'P2002')) {
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
    if (dto.serviceTypeId) {
      await this.ensureServiceType(dto.serviceTypeId);
    }
    const category = await this.prisma.client.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        serviceTypeId: dto.serviceTypeId,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { serviceType: true },
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

  private mapCategory(category: Category & { serviceType: ServiceType }): {
    id: string;
    libelle: string;
    name: string;
    type: TicketType;
    description: string | null;
    isActive: boolean;
    serviceTypeId: string;
    serviceType: {
      id: string;
      name: string;
      scope: ServiceScope;
      description?: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
  } {
    const type =
      category.serviceType.scope === ServiceScope.EXTERNE
        ? TicketType.DEMANDE
        : TicketType.INTERNE;
    return {
      id: category.id,
      libelle: category.name,
      name: category.name,
      type,
      description: category.description ?? null,
      isActive: category.isActive,
      serviceTypeId: category.serviceTypeId,
      serviceType: {
        id: category.serviceType.id,
        name: category.serviceType.name,
        scope: category.serviceType.scope,
        description: category.serviceType.description ?? null,
        isActive: category.serviceType.isActive,
        createdAt: category.serviceType.createdAt,
        updatedAt: category.serviceType.updatedAt,
      },
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  listServiceTypes() {
    return this.prisma.client.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listConcernedProducts() {
    return this.prisma.client.concernedProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createConcernedProduct(
    dto: CreateConcernedProductDto,
    actor: AuthenticatedUserDto,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Le nom du produit est requis.');
    }

    try {
      const product = await this.prisma.client.concernedProduct.create({
        data: {
          name,
          description: this.optionalTrimmed(dto.description),
          isActive: dto.isActive ?? true,
        },
      });

      await this.logActivity(
        'ticket.product.created',
        `Produit concerné ${product.name} créé`,
        actor,
      );
      return product;
    } catch (error) {
      if (isPrismaKnownRequestError(error, 'P2002')) {
        throw new BadRequestException('Ce produit concerné existe déjà.');
      }
      throw error;
    }
  }

  async updateConcernedProduct(
    id: string,
    dto: UpdateConcernedProductDto,
    actor: AuthenticatedUserDto,
  ) {
    const data: Prisma.ConcernedProductUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Le nom du produit est requis.');
      }
      data.name = name;
    }
    if (dto.description !== undefined) {
      data.description = this.optionalTrimmed(dto.description);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    try {
      const product = await this.prisma.client.concernedProduct.update({
        where: { id },
        data,
      });

      await this.logActivity(
        'ticket.product.updated',
        `Produit concerné ${product.name} modifié`,
        actor,
      );
      return product;
    } catch (error) {
      if (isPrismaKnownRequestError(error, 'P2002')) {
        throw new BadRequestException('Ce produit concerné existe déjà.');
      }
      if (isPrismaKnownRequestError(error, 'P2025')) {
        throw new NotFoundException('Produit concerné introuvable.');
      }
      throw error;
    }
  }

  async deleteConcernedProduct(id: string, actor: AuthenticatedUserDto) {
    try {
      const product = await this.prisma.client.concernedProduct.delete({
        where: { id },
      });

      await this.logActivity(
        'ticket.product.deleted',
        `Produit concerné ${product.name} supprimé`,
        actor,
      );
    } catch (error) {
      if (isPrismaKnownRequestError(error, 'P2025')) {
        throw new NotFoundException('Produit concerné introuvable.');
      }
      throw error;
    }
  }

  private async ensureCategory(categoryId: string, serviceTypeId: string) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    if (!category.isActive) {
      throw new BadRequestException('La catégorie est désactivée.');
    }
    if (category.serviceTypeId !== serviceTypeId) {
      throw new BadRequestException(
        'La catégorie n’est pas rattachée au domaine de service sélectionné.',
      );
    }
    return category;
  }

  private async ensureServiceType(serviceTypeId: string) {
    const serviceType = await this.prisma.client.serviceType.findUnique({
      where: { id: serviceTypeId },
    });
    if (!serviceType) {
      throw new NotFoundException('Domaine de service introuvable.');
    }
    if (!serviceType.isActive) {
      throw new BadRequestException('Ce domaine de service est désactivé.');
    }
    return serviceType;
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
    const responsible =
      await this.prisma.client.resolutionResponsible.findUnique({
        where: { id },
      });
    if (!responsible || !responsible.isActive) {
      throw new NotFoundException('Responsable introuvable ou désactivé.');
    }
    return responsible;
  }

  private async handleStatusNotifications(
    before: TicketWithRelations,
    after: TicketWithRelations,
    status: TicketStatus,
    actor: AuthenticatedUserDto,
  ) {
    const recipients = new Set<string>();
    if (after.createdById) {
      recipients.add(after.createdById);
    }
    if (after.assignedResponsibleId) {
      recipients.add(after.assignedResponsibleId);
    }
    if (before.assignedResponsibleId) {
      recipients.add(before.assignedResponsibleId);
    }
    recipients.delete(actor.id);

    if (!recipients.size) {
      return;
    }

    const actorName = `${actor.prenom} ${actor.nom}`.trim();
    const isReassigned =
      status === TicketStatus.ASSIGNED &&
      Boolean(before.assignedResponsibleId) &&
      before.assignedResponsibleId !== after.assignedResponsibleId;
    const assigneeName = after.assignedResponsible
      ? `${after.assignedResponsible.firstName} ${after.assignedResponsible.lastName}`.trim()
      : null;

    const comment = after.resolutionComment?.trim()
      ? after.resolutionComment.trim().slice(0, 180)
      : null;

    const payload =
      status === TicketStatus.ASSIGNED
        ? {
            type: isReassigned
              ? NotificationType.TICKET_REASSIGNED
              : NotificationType.TICKET_ASSIGNED,
            title: isReassigned
              ? `Ticket ${after.ticketNumber} réassigné`
              : `Ticket ${after.ticketNumber} assigné`,
            message: assigneeName
              ? `${actorName} a assigné le ticket ${after.ticketNumber} à ${assigneeName}.`
              : `${actorName} a assigné le ticket ${after.ticketNumber}.`,
          }
        : status === TicketStatus.IN_PROGRESS
          ? {
              type: NotificationType.STATUS_IN_PROGRESS,
              title: `Ticket ${after.ticketNumber} en cours`,
              message: `${actorName} a passé le ticket ${after.ticketNumber} en cours de traitement.`,
            }
          : status === TicketStatus.RESOLVED
            ? {
                type: NotificationType.STATUS_RESOLVED,
                title: `Ticket ${after.ticketNumber} résolu`,
                message: comment
                  ? `${actorName} a résolu le ticket ${after.ticketNumber}. Commentaire : ${comment}`
                  : `${actorName} a résolu le ticket ${after.ticketNumber}.`,
              }
            : status === TicketStatus.UNRESOLVED
              ? {
                  type: NotificationType.STATUS_UNRESOLVED,
                  title: `Ticket ${after.ticketNumber} non résolu`,
                  message: comment
                    ? `${actorName} a marqué le ticket ${after.ticketNumber} comme non résolu. Commentaire : ${comment}`
                    : `${actorName} a marqué le ticket ${after.ticketNumber} comme non résolu.`,
                }
              : status === TicketStatus.CLOSED
                ? {
                    type: NotificationType.STATUS_CLOSED,
                    title: `Ticket ${after.ticketNumber} fermé`,
                    message: `${actorName} a fermé le ticket ${after.ticketNumber}.`,
                  }
                : status === TicketStatus.REOPENED
                  ? {
                      type: NotificationType.TICKET_REOPENED,
                      title: `Ticket ${after.ticketNumber} rouvert`,
                      message: `${actorName} a rouvert le ticket ${after.ticketNumber}.`,
                    }
                  : status === TicketStatus.CANCELLED
                    ? {
                        type: NotificationType.TICKET_CANCELLED,
                        title: `Ticket ${after.ticketNumber} annulé`,
                        message: `${actorName} a annulé le ticket ${after.ticketNumber}.`,
                      }
                    : null;

    if (!payload) {
      return;
    }

    await this.notification.notifyUsers(Array.from(recipients), {
      ticketId: after.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
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
    const datePart = `${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const prefix = `TK-${datePart}-`;
    const tickets = await this.prisma.client.ticket.findMany({
      where: { ticketNumber: { startsWith: prefix } },
      select: { ticketNumber: true },
    });
    const highestOrder = tickets.reduce((highest, ticket) => {
      const suffix = ticket.ticketNumber.slice(prefix.length);
      if (!/^\d+$/.test(suffix)) return highest;
      return Math.max(highest, Number(suffix));
    }, 0);
    return `${prefix}${(highestOrder + 1).toString().padStart(3, '0')}`;
  }
}
