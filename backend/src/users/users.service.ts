import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { toUserDto } from './users.mapper.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../prisma/enums.js';
import {
  isPrismaKnownRequestError,
  type PrismaKnownRequestErrorLike,
} from '../prisma/prisma-errors.js';

const PASSWORD_SALT_ROUNDS = 10;
const TEMPORARY_PASSWORD_LENGTH = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  private readonly userInclude = {
    department: {
      select: {
        id: true,
        name: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  async create(
    dto: CreateUserDto,
    actor?: AuthenticatedUserDto,
  ): Promise<UserDto> {
    const passwordHash = await this.hashPassword(dto.passwordHash);
    const data = this.buildCreatePayload(dto, passwordHash);

    try {
      const user = await this.prisma.client.user.create({
        data,
        include: this.userInclude,
      });
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

    if (actor?.role === UserRole.SUPER_ADMIN || actor?.role === UserRole.READER) {
      where = {};
    } else if (actor?.role === UserRole.ADMIN) {
      where = { role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } };
    } else if (actor) {
      where = { id: actor.id };
    }

    const users = await this.prisma.client.user.findMany({
      where,
      include: this.userInclude,
    });
    return users.map(toUserDto);
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      include: this.userInclude,
    });
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
        include: this.userInclude,
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
        include: this.userInclude,
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
        include: this.userInclude,
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

  async resetPassword(
    id: string,
    actor?: AuthenticatedUserDto,
  ): Promise<{ user: UserDto; password: string }> {
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await this.hashPassword(temporaryPassword);

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data: { passwordHash, plainPassword: temporaryPassword },
        include: this.userInclude,
      });
      await this.logActivity({
        action: 'user.password_reset',
        details: `Mot de passe de l'utilisateur ${id} réinitialisé.`,
        actor,
      });
      return { user: toUserDto(user), password: temporaryPassword };
    } catch (error) {
      this.handleNotFound(id, error);
      throw error;
    }
  }

  async getPassword(id: string): Promise<{ password: string | null }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      select: { plainPassword: true },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
    return { password: user.plainPassword ?? null };
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
      plainPassword: dto.passwordHash,
      role: dto.role ?? UserRole.EMPLOYE,
      departmentId: dto.departmentId ?? null,
      serviceId: dto.serviceId ?? null,
      isActive: dto.isActive ?? true,
      receiveEmails: dto.receiveEmails ?? true,
      phone: dto.phone?.trim() ?? null,
      receiveWhatsapp: dto.receiveWhatsapp ?? false,
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
      payload.plainPassword = dto.passwordHash;
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
    if (dto.phone !== undefined) {
      payload.phone = dto.phone?.trim() || null;
    }
    if (typeof dto.receiveWhatsapp === 'boolean') {
      payload.receiveWhatsapp = dto.receiveWhatsapp;
    }
    if (dto.createdById !== undefined) {
      payload.createdById = dto.createdById ?? null;
    }

    return payload;
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password, PASSWORD_SALT_ROUNDS);
  }

  private generateTemporaryPassword(): string {
    const groups = [
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      'abcdefghijkmnopqrstuvwxyz',
      '23456789',
      '!@#$%*?',
    ];
    const allCharacters = groups.join('');
    const requiredCharacters = groups.map((group) => this.pickCharacter(group));
    const remainingCharacters = Array.from(
      { length: TEMPORARY_PASSWORD_LENGTH - requiredCharacters.length },
      () => this.pickCharacter(allCharacters),
    );

    return this.shuffleCharacters([
      ...requiredCharacters,
      ...remainingCharacters,
    ]).join('');
  }

  private pickCharacter(characters: string): string {
    return characters[randomInt(characters.length)];
  }

  private shuffleCharacters(characters: string[]): string[] {
    const shuffled = [...characters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    return shuffled;
  }

  private handleConflict(error: unknown): void {
    if (isPrismaKnownRequestError(error, 'P2002')) {
      const target = this.getPrismaErrorTarget(error);
      if (target.includes('matricule')) {
        throw new ConflictException(
          'Un utilisateur avec ce matricule existe déjà.',
        );
      }
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
  }

  private handleNotFound(id: string, error: unknown): void {
    if (isPrismaKnownRequestError(error, 'P2025')) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
  }

  private getPrismaErrorTarget(error: PrismaKnownRequestErrorLike): string {
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.join(' ');
    }
    return typeof target === 'string' ? target : '';
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
