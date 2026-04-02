import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { TicketPriority, UserRole } from '../prisma/enums.js';
import { SlaService } from './sla.service.js';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('sla')
export class SlaController {
  static readonly ALIASES: Record<string, TicketPriority> = {
    P1: TicketPriority.CRITICAL,
    P2: TicketPriority.HIGH,
    P3: TicketPriority.MEDIUM,
    CRITICAL: TicketPriority.CRITICAL,
    HIGH: TicketPriority.HIGH,
    MEDIUM: TicketPriority.MEDIUM,
    LOW: TicketPriority.LOW,
    CRITIQUE: TicketPriority.CRITICAL,
    HAUT: TicketPriority.HIGH,
    MOYEN: TicketPriority.MEDIUM,
    BAS: TicketPriority.LOW,
  };

  constructor(private readonly slaService: SlaService) {}

  @Get('priorities')
  listPolicies() {
    return this.slaService.listPolicies();
  }

  @Patch('priorities/:priority')
  updatePolicy(
    @Param('priority') priority: string,
    @Body() dto: UpdateSlaPolicyDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    const resolvedPriority = this.resolvePriorityParam(priority);
    return this.slaService.updatePolicy(resolvedPriority, dto, user);
  }

  private resolvePriorityParam(raw: string): TicketPriority {
    const normalized = raw?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Priority is required.');
    }
    const allowed = SlaController.ALIASES[normalized];
    if (!allowed) {
      throw new BadRequestException(
        'Priority invalide. Utiliser P1, P2, P3 ou une priorité Prisma valide.',
      );
    }
    return allowed;
  }
}
