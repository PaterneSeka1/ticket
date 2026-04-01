import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseEnumPipe,
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
  constructor(private readonly slaService: SlaService) {}

  @Get('priorities')
  listPolicies() {
    return this.slaService.listPolicies();
  }

  @Patch('priorities/:priority')
  updatePolicy(
    @Param('priority', new ParseEnumPipe(TicketPriority))
    priority: TicketPriority,
    @Body() dto: UpdateSlaPolicyDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.slaService.updatePolicy(priority, dto, user);
  }
}
