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
import { CreateServiceDto } from './dto/create-service.dto.js';
import { ServicesService } from './services.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  findAll() {
    return this.servicesService.list();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.servicesService.create(dto, user);
  }
}
