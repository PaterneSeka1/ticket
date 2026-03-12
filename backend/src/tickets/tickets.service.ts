import {
  BadRequestException,
  ConflictException,
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
import {
  DirectionType,
  DsiTicketRole,
  TimelineEventType,
  TicketStatus,
  TicketType,
} from '../prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.RECU]: [TicketStatus.EN_COURS, TicketStatus.ABANDONNE],
  [TicketStatus.EN_COURS]: [
    TicketStatus.AJOURNE,
    TicketStatus.RESOLU,
    TicketStatus.ABANDONNE,
  ],
  [TicketStatus.AJOURNE]: [TicketStatus.EN_COURS, TicketStatus.ABANDONNE],
  [TicketStatus.RESOLU]: [TicketStatus.FERME],
  [TicketStatus.ABANDONNE]: [],
  [TicketStatus.FERME]: [],
  [TicketStatus.OUVERT]: [],
  [TicketStatus.PRIS]: [],
};

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    category: true;
    emitter: true;
    receivedBy: true;
    timelineEvents: { orderBy: { createdAt: 'asc' } };
    comments: { include: { author: true }; orderBy: { createdAt: 'asc' } };
  };
}>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(dto: CreateTicketDto, emitter: AuthenticatedUserDto) {
    const category = await this.getActiveCategory(dto.categoryId);
    if (category.type !== dto.type) {
      throw new BadRequestException('La catégorie ne correspond pas au type.');
    }

    const responsible = await this.findActiveDsiResponsible();
    const code = await this.generateTicketCode();
    const now = new Date();

    let ticket: TicketWithRelations;
    try {
      ticket = await this.prisma.client.ticket.create({
        data: {
          code,
          type: dto.type,
          priority: dto.priority,
          status: TicketStatus.RECU,
          category: { connect: { id: dto.categoryId } },
          description: dto.description,
          emitter: { connect: { id: emitter.id } },
          assignedService: dto.assignedService ?? null,
          clientName: dto.clientName ?? null,
          product: dto.product ?? null,
          attachmentName: dto.attachmentName ?? null,
          detectedAt: dto.detectedAt ? new Date(dto.detectedAt) : null,
          resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
          slaMaxMinutes: dto.slaMaxMinutes ?? null,
          waitMinutes: dto.waitMinutes ?? null,
          receivedBy: { connect: { id: responsible.id } },
          receivedAt: now,
        },
        include: this.ticketInclude,
      });
    } catch (error) {
      this.handleConflict(error);
      throw error;
    }

    await this.recordTimelineEvent(
      ticket.id,
      TimelineEventType.CREATE,
      'Ticket créé',
      `${emitter.nom} ${emitter.prenom}`.trim(),
    );
    await this.recordTimelineEvent(
      ticket.id,
      TimelineEventType.RECEIVE,
      'Ticket réceptionné par le service DSI',
      `${responsible.nom} ${responsible.prenom}`.trim(),
    );

    await this.logActivity({
      action: 'ticket.created',
      details: `${ticket.code} créé par ${emitter.email}`,
      actor: emitter,
      ticketId: ticket.id,
    });
    await this.logActivity({
      action: 'ticket.received',
      details: `${ticket.code} reçu par ${responsible.email}`,
      actor: responsible,
      ticketId: ticket.id,
    });

    return this.toTicketDto(ticket);
  }

  async findAll(filters: TicketFiltersDto) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.emitterId) {
      where.emitterId = filters.emitterId;
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.receivedById) {
      where.receivedById = filters.receivedById;
    }
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.createdAfter) {
      createdAtFilter.gte = new Date(filters.createdAfter);
    }
    if (filters.createdBefore) {
      createdAtFilter.lt = new Date(filters.createdBefore);
    }
    if (Object.keys(createdAtFilter).length) {
      where.createdAt = createdAtFilter;
    }

    const tickets = await this.prisma.client.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });

    return tickets.map((ticket) => this.toTicketDto(ticket));
  }

  async findMine(userId: string) {
    const tickets = await this.prisma.client.ticket.findMany({
      where: { emitterId: userId },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
    return tickets.map((ticket) => this.toTicketDto(ticket));
  }

  async findReceivedByDsi(user: AuthenticatedUserDto) {
    this.ensureUserCanSeeDsiList(user);
    const tickets = await this.prisma.client.ticket.findMany({
      where: { receivedById: user.id },
      orderBy: { createdAt: 'desc' },
      include: this.ticketInclude,
    });
    return tickets.map((ticket) => this.toTicketDto(ticket));
  }

  async findOne(id: string) {
    const ticket = await this.prisma.client.ticket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
    return this.toTicketDto(ticket);
  }

  async update(id: string, dto: UpdateTicketDto) {
    const existing = await this.prisma.client.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }

    const finalType = dto.type ?? existing.type;
    if (dto.categoryId) {
      const category = await this.getActiveCategory(dto.categoryId);
      if (category.type !== finalType) {
        throw new BadRequestException('La catégorie ne correspond pas au type.');
      }
    }

    const data = this.buildUpdatePayload(dto);
    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    try {
      const ticket = await this.prisma.client.ticket.update({
        where: { id },
        data,
        include: this.ticketInclude,
      });
      return this.toTicketDto(ticket);
    } catch (error) {
      this.handleConflict(error);
      this.handleNotFound(id, error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    actor: AuthenticatedUserDto,
  ) {
    const ticket = await this.prisma.client.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }

    if (!this.canActOnStatus(actor)) {
      throw new ForbiddenException('Accès interdit au changement de statut.');
    }

    this.ensureTransition(ticket.status, dto.status);

    const payload: Prisma.TicketUncheckedUpdateInput = {
      status: dto.status,
    };

    if (dto.status === TicketStatus.RESOLU) {
      payload.resolvedAt = new Date();
    }

    const updated = await this.prisma.client.ticket.update({
      where: { id },
      data: payload,
      include: this.ticketInclude,
    });

    await this.recordTimelineEvent(
      id,
      dto.eventType ?? TimelineEventType.STATUS_CHANGE,
      `Statut ${ticket.status} → ${dto.status}`,
      `${actor.nom} ${actor.prenom}`.trim(),
    );

    await this.logActivity({
      action: 'ticket.status',
      details: `${ticket.code} statut ${ticket.status} → ${dto.status}`,
      actor,
      ticketId: id,
    });

    return this.toTicketDto(updated);
  }

  async recordTimeline(
    id: string,
    dto: CreateTicketTimelineDto,
    actor: AuthenticatedUserDto,
  ) {
    await this.ensureTicketExists(id);
    await this.recordTimelineEvent(
      id,
      dto.type,
      dto.label,
      dto.actorName,
    );
    await this.logActivity({
      action: 'ticket.timeline',
      details: `${id} - ${dto.label}`,
      actor,
      ticketId: id,
    });
    const events = await this.prisma.client.ticketTimeline.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((event) => this.mapTimeline(event));
  }

  async addComment(
    id: string,
    dto: CreateTicketCommentDto,
    actor: AuthenticatedUserDto,
  ) {
    await this.ensureTicketExists(id);
    const comment = await this.prisma.client.comment.create({
      data: {
        ticket: { connect: { id } },
        author: { connect: { id: actor.id } },
        content: dto.content,
      },
      include: { author: true },
    });
    await this.recordTimelineEvent(
      id,
      TimelineEventType.ACTION,
      'Commentaire ajouté',
      `${actor.nom} ${actor.prenom}`.trim(),
    );
    await this.logActivity({
      action: 'ticket.comment',
      details: `${actor.email} a commenté ${id}`,
      actor,
      ticketId: id,
    });
    return this.mapComment(comment);
  }

  async listCategories() {
    return this.prisma.client.ticketCategory.findMany({
      orderBy: { libelle: 'asc' },
    });
  }

  async createCategory(dto: CreateTicketCategoryDto, actor: AuthenticatedUserDto) {
    const existing = await this.prisma.client.ticketCategory.findFirst({
      where: {
        libelle: { equals: dto.libelle, mode: 'insensitive' },
        type: dto.type,
      },
    });
    if (existing) {
      throw new ConflictException('Cette catégorie existe déjà.');
    }

    const category = await this.prisma.client.ticketCategory.create({
      data: {
        libelle: dto.libelle.trim(),
        type: dto.type,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.logActivity({
      action: 'category.created',
      details: `Catégorie ${category.libelle} créée.`,
      actor,
    });
    return category;
  }

  async updateCategory(
    id: string,
    dto: UpdateTicketCategoryDto,
    actor: AuthenticatedUserDto,
  ) {
    if (dto.libelle) {
      dto.libelle = dto.libelle.trim();
    }
    try {
      const category = await this.prisma.client.ticketCategory.update({
        where: { id },
        data: {
          libelle: dto.libelle,
          type: dto.type,
          description: dto.description,
          isActive: dto.isActive,
        },
      });
      await this.logActivity({
        action: 'category.updated',
        details: `Catégorie ${id} mise à jour.`,
        actor,
      });
      return category;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Catégorie ${id} introuvable.`);
      }
      throw error;
    }
  }

  async deleteCategory(id: string, actor: AuthenticatedUserDto) {
    try {
      const category = await this.prisma.client.ticketCategory.update({
        where: { id },
        data: { isActive: false },
      });
      await this.logActivity({
        action: 'category.disabled',
        details: `Catégorie ${category.libelle} désactivée.`,
        actor,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Catégorie ${id} introuvable.`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureTicketExists(id);
    const ticket = await this.prisma.client.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
    await this.prisma.client.$transaction([
      this.prisma.client.comment.deleteMany({ where: { ticketId: id } }),
      this.prisma.client.ticketTimeline.deleteMany({ where: { ticketId: id } }),
      this.prisma.client.activityLog.deleteMany({ where: { ticketId: id } }),
      this.prisma.client.ticket.delete({ where: { id } }),
    ]);
    await this.activity.log({
      action: 'ticket.deleted',
      details: `Ticket ${ticket.code} supprimé.`,
      ticketId: id,
    });
  }

  private get ticketInclude() {
    return {
      category: true,
      emitter: true,
      receivedBy: true,
      timelineEvents: { orderBy: { createdAt: 'asc' } },
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
    } as const;
  }

  private buildUpdatePayload(dto: UpdateTicketDto) {
    const payload: Prisma.TicketUncheckedUpdateInput = {};

    if (dto.type) {
      payload.type = dto.type;
    }
    if (dto.priority) {
      payload.priority = dto.priority;
    }
    if (dto.categoryId) {
      payload.categoryId = dto.categoryId;
    }
    if (dto.description) {
      payload.description = dto.description;
    }
    if (dto.assignedService !== undefined) {
      payload.assignedService = dto.assignedService ?? null;
    }
    if (dto.clientName !== undefined) {
      payload.clientName = dto.clientName ?? null;
    }
    if (dto.product !== undefined) {
      payload.product = dto.product ?? null;
    }
    if (dto.attachmentName !== undefined) {
      payload.attachmentName = dto.attachmentName ?? null;
    }
    if (dto.detectedAt !== undefined) {
      payload.detectedAt = dto.detectedAt ? new Date(dto.detectedAt) : null;
    }
    if (dto.resolvedAt !== undefined) {
      payload.resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : null;
    }
    if (dto.slaMaxMinutes !== undefined) {
      payload.slaMaxMinutes = dto.slaMaxMinutes ?? null;
    }
    if (dto.waitMinutes !== undefined) {
      payload.waitMinutes = dto.waitMinutes ?? null;
    }

    return payload;
  }

  private toTicketDto(ticket: TicketWithRelations) {
    return {
      id: ticket.id,
      code: ticket.code,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      category: {
        id: ticket.category.id,
        libelle: ticket.category.libelle,
        type: ticket.category.type,
      },
      description: ticket.description,
      assignedService: ticket.assignedService,
      emitter: {
        id: ticket.emitter.id,
        nom: ticket.emitter.nom,
        prenom: ticket.emitter.prenom,
      },
      receivedBy: ticket.receivedBy
        ? {
            id: ticket.receivedBy.id,
            nom: ticket.receivedBy.nom,
            prenom: ticket.receivedBy.prenom,
          }
        : null,
      receivedAt: ticket.receivedAt,
      clientName: ticket.clientName,
      product: ticket.product,
      attachmentName: ticket.attachmentName,
      detectedAt: ticket.detectedAt,
      resolvedAt: ticket.resolvedAt,
      slaMaxMinutes: ticket.slaMaxMinutes,
      waitMinutes: ticket.waitMinutes,
      comments: ticket.comments.map((comment) => this.mapComment(comment)),
      timeline: ticket.timelineEvents.map((event) => this.mapTimeline(event)),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private mapComment(comment: Prisma.CommentGetPayload<{ include: { author: true } }>) {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        nom: comment.author.nom,
        prenom: comment.author.prenom,
      },
    };
  }

  private mapTimeline(event: Prisma.TicketTimelineGetPayload<{}>) {
    return {
      id: event.id,
      type: event.type,
      label: event.label,
      actorName: event.actorName,
      createdAt: event.createdAt,
    };
  }

  private async getActiveCategory(id: string) {
    const category = await this.prisma.client.ticketCategory.findUnique({
      where: { id },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException('Catégorie introuvable ou désactivée.');
    }
    return category;
  }

  private async findActiveDsiResponsible() {
    const responsible = await this.prisma.client.user.findFirst({
      where: {
        isActive: true,
        direction: DirectionType.DSI,
        dsiTicketRole: {
          in: [DsiTicketRole.RESPONSABLE, DsiTicketRole.CO_RESPONSABLE],
        },
      },
      orderBy: { dsiTicketRole: 'asc' },
    });
    if (!responsible) {
      throw new BadRequestException('Aucun responsable DSI actif trouvé.');
    }
    return responsible;
  }

  private ensureTransition(current: TicketStatus, next: TicketStatus) {
    if (current === next) {
      return;
    }
    const allowed = STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException('Transition de statut interdite.');
    }
  }

  private canActOnStatus(user: AuthenticatedUserDto) {
    return (
      user.isActive &&
      user.direction === DirectionType.DSI &&
      user.dsiTicketRole &&
      [DsiTicketRole.RESPONSABLE, DsiTicketRole.CO_RESPONSABLE].includes(
        user.dsiTicketRole,
      )
    );
  }

  private ensureUserCanSeeDsiList(user: AuthenticatedUserDto) {
    if (!this.canActOnStatus(user)) {
      throw new ForbiddenException('Accès interdit aux tickets DSI.');
    }
  }

  private async ensureTicketExists(id: string) {
    const ticket = await this.prisma.client.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
  }

  private async recordTimelineEvent(
    ticketId: string,
    type: TimelineEventType,
    label: string,
    actorName: string,
  ) {
    await this.prisma.client.ticketTimeline.create({
      data: {
        ticketId,
        type,
        label,
        actorName,
      },
    });
  }

  private async logActivity({
    action,
    details,
    actor,
    ticketId,
  }: {
    action: string;
    details: string;
    actor?: AuthenticatedUserDto;
    ticketId?: string;
  }) {
    await this.activity.log({
      action,
      details,
      ticketId: ticketId ?? null,
      actorId: actor?.id ?? null,
      actorName: actor ? `${actor.nom} ${actor.prenom}`.trim() : null,
      role: actor?.role ?? null,
    });
  }

  private async generateTicketCode() {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { start, end } = this.dayRange(today);
    const count = await this.prisma.client.ticket.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    const sequence = String(count + 1).padStart(3, '0');
    return `TK-${datePart}-${sequence}`;
  }

  private dayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private handleConflict(error: unknown): void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Conflit sur les données fournies.');
    }
  }

  private handleNotFound(id: string, error: unknown): void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Ticket ${id} introuvable.`);
    }
  }
}
