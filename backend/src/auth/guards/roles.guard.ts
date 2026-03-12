import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../prisma/enums.js';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<UserRole[]>(RolesGuard.ROLES_KEY, context.getHandler());
    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUserDto | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Accès interdit.');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Rôle insuffisant.');
    }

    return true;
  }

  static readonly ROLES_KEY = 'roles';
}
