import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import type { User } from '../../generated/prisma/client.js';
import { toUserDto } from '../users/users.mapper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly activity: ActivityLogService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.findUserByIdentifier(dto);

    const passwordMatches = user
      ? await compare(dto.passwordHash, user.passwordHash)
      : false;

    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    const now = new Date();
    const updatedUser = await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLogin: now },
    });

    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    await this.activity.log({
      action: 'auth.login',
      details: `${user.email} connecté.`,
      actorId: user.id,
      actorName: `${user.nom} ${user.prenom}`.trim(),
      role: user.role,
    });

    return {
      user: toUserDto(updatedUser),
      authenticatedAt: now,
      accessToken,
    };
  }

  private async findUserByIdentifier(dto: LoginDto): Promise<User | null> {
    const filters = this.buildIdentifierFilters(dto);
    if (!filters.length) {
      return null;
    }

    return this.prisma.client.user.findFirst({
      where: {
        OR: filters,
        isActive: true,
      },
    });
  }

  private buildIdentifierFilters(dto: LoginDto) {
    const filters: Array<Record<string, string>> = [];
    if (dto.email?.trim()) {
      filters.push({ email: dto.email.trim().toLowerCase() });
    }
    if (dto.matricule?.trim()) {
      filters.push({ matricule: dto.matricule.trim() });
    }
    return filters;
  }
}
