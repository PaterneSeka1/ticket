import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../prisma/enums.js';
import type { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CreateResolutionResponsibleDto } from './dto/create-resolution-responsible.dto.js';
import { ResolutionResponsibleService } from './resolution.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('resolution-responsibles')
export class ResolutionResponsibleController {
  constructor(
    private readonly resolutionService: ResolutionResponsibleService,
  ) {}

  @Get()
  findAll() {
    return this.resolutionService.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateResolutionResponsibleDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.resolutionService.create(dto, user);
  }
}
