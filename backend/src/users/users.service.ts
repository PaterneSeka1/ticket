import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { toUserDto } from './users.mapper.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../prisma/enums.js';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(
    dto: CreateUserDto,
    actor?: AuthenticatedUserDto,
  ): Promise<UserDto> {
    const passwordHash = await this.hashPassword(dto.passwordHash);
    const data = this.buildCreatePayload(dto, passwordHash);

    try {
      const user = await this.prisma.client.user.create({ data });
      await this.logActivity({
        action: 'user.created',
        details: `Utilisateur ${user.email} créé.`,
        actor,
      });
      return toUserDto(user);
    } catch (error) {
      this.handleConflict(error);
      throw error;
    }
  }

  async findAll(actor?: AuthenticatedUserDto): Promise<UserDto[]> {
    let where: Prisma.UserWhereInput | undefined;

    if (actor?.role === UserRole.SUPER_ADMIN) {
      where = {};
    } else if (actor?.role === UserRole.ADMIN) {
      where = { role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } };
    } else if (actor) {
      where = { id: actor.id };
    }

    const users = await this.prisma.client.user.findMany({ where });
    return users.map(toUserDto);
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
    return toUserDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor?: AuthenticatedUserDto,
  ): Promise<UserDto> {
    const passwordHash = dto.passwordHash
      ? await this.hashPassword(dto.passwordHash)
      : undefined;
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
    const data = this.buildUpdatePayload(dto, passwordHash);

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data,
      });
      await this.logActivity({
        action: 'user.updated',
        details: `Utilisateur ${id} mis à jour.`,
        actor,
      });
      return toUserDto(user);
    } catch (error) {
      this.handleConflict(error);
      this.handleNotFound(id, error);
      throw error;
    }
  }

  async remove(id: string, actor?: AuthenticatedUserDto): Promise<void> {
    await this.deactivate(id, actor);
  }

  async activate(id: string, actor?: AuthenticatedUserDto): Promise<UserDto> {
    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data: { isActive: true },
      });
      await this.logActivity({
        action: 'user.activated',
        details: `Utilisateur ${id} activé.`,
        actor,
      });
      return toUserDto(user);
    } catch (error) {
      this.handleNotFound(id, error);
      throw error;
    }
  }

  async deactivate(id: string, actor?: AuthenticatedUserDto): Promise<UserDto> {
    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data: { isActive: false },
      });
      await this.logActivity({
        action: 'user.deactivated',
        details: `Utilisateur ${id} désactivé.`,
        actor,
      });
      return toUserDto(user);
    } catch (error) {
      this.handleNotFound(id, error);
      throw error;
    }
  }

  private buildCreatePayload(
    dto: CreateUserDto,
    hashedPassword: string,
  ): Prisma.UserUncheckedCreateInput {
    return {
      nom: dto.nom.trim(),
      prenom: dto.prenom.trim(),
      email: dto.email.trim().toLowerCase(),
      matricule: dto.matricule.trim(),
      passwordHash: hashedPassword,
      role: dto.role ?? UserRole.EMPLOYE,
      departmentId: dto.departmentId ?? null,
      serviceId: dto.serviceId ?? null,
      isActive: dto.isActive ?? true,
      receiveEmails: dto.receiveEmails ?? true,
      createdById: dto.createdById ?? null,
    };
  }

  private buildUpdatePayload(
    dto: UpdateUserDto,
    hashedPassword?: string,
  ): Prisma.UserUncheckedUpdateInput {
    const payload: Prisma.UserUncheckedUpdateInput = {};

    if (dto.nom) {
      payload.nom = dto.nom.trim();
    }
    if (dto.prenom) {
      payload.prenom = dto.prenom.trim();
    }
    if (dto.matricule) {
      payload.matricule = dto.matricule.trim();
    }
    if (dto.email) {
      payload.email = dto.email.trim().toLowerCase();
    }
    if (dto.passwordHash && hashedPassword) {
      payload.passwordHash = hashedPassword;
    }
    if (dto.role) {
      payload.role = dto.role;
    }
    if (dto.departmentId !== undefined) {
      payload.departmentId = dto.departmentId ?? null;
    }
    if (dto.serviceId !== undefined) {
      payload.serviceId = dto.serviceId ?? null;
    }
    if (typeof dto.isActive === 'boolean') {
      payload.isActive = dto.isActive;
    }
    if (typeof dto.receiveEmails === 'boolean') {
      payload.receiveEmails = dto.receiveEmails;
    }
    if (dto.createdById !== undefined) {
      payload.createdById = dto.createdById ?? null;
    }

    return payload;
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password, PASSWORD_SALT_ROUNDS);
  }

  private handleConflict(error: unknown): void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
  }

  private handleNotFound(id: string, error: unknown): void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
  }

  private async logActivity({
    action,
    details,
    actor,
  }: {
    action: string;
    details: string;
    actor?: AuthenticatedUserDto;
  }) {
    await this.activity.log({
      action,
      details,
      actorId: actor?.id ?? null,
      actorName: actor ? `${actor.nom} ${actor.prenom}`.trim() : null,
      role: actor?.role ?? null,
    });
  }
}
