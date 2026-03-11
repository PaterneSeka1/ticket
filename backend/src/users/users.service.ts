import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserDto> {
    const passwordHash = await this.hashPassword(dto.password);
    const data = this.buildCreatePayload(dto, passwordHash);

    try {
      const user = await this.prisma.client.user.create({ data });
      return toUserDto(user);
    } catch (error) {
      this.handleConflict(error);
      throw error;
    }
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.client.user.findMany();
    return users.map(toUserDto);
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }
    return toUserDto(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const passwordHash = dto.password
      ? await this.hashPassword(dto.password)
      : undefined;
    const data = this.buildUpdatePayload(dto, passwordHash);

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data,
      });
      return toUserDto(user);
    } catch (error) {
      this.handleConflict(error);
      this.handleNotFound(id, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.client.user.delete({ where: { id } });
    } catch (error) {
      this.handleNotFound(id, error);
      throw error;
    }
  }

  private buildCreatePayload(
    dto: CreateUserDto,
    hashedPassword: string,
  ): Prisma.UserCreateInput {
    return {
      nom: dto.nom.trim(),
      prenom: dto.prenom.trim(),
      email: dto.email.trim().toLowerCase(),
      matricule: dto.matricule.trim(),
      password: hashedPassword,
      role: dto.role ?? UserRole.USER,
      direction: dto.direction ?? null,
      service: dto.service ?? null,
      isActive: dto.isActive ?? true,
    };
  }

  private buildUpdatePayload(
    dto: UpdateUserDto,
    hashedPassword?: string,
  ): Prisma.UserUpdateInput {
    const payload: Prisma.UserUpdateInput = {};

    if (dto.nom) {
      payload.nom = dto.nom.trim();
    }
    if (dto.prenom) {
      payload.prenom = dto.prenom.trim();
    }
    if (dto.email) {
      payload.email = dto.email.trim().toLowerCase();
    }
    if (dto.matricule) {
      payload.matricule = dto.matricule.trim();
    }
    if (dto.password) {
      payload.password = hashedPassword ?? dto.password;
    }
    if (dto.role) {
      payload.role = dto.role;
    }
    if (dto.direction !== undefined) {
      payload.direction = dto.direction;
    }
    if (dto.service !== undefined) {
      payload.service = dto.service;
    }
    if (typeof dto.isActive === 'boolean') {
      payload.isActive = dto.isActive;
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
      throw new ConflictException(
        'Un utilisateur avec cet email ou matricule existe déjà.',
      );
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
}
