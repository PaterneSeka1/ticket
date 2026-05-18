import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../prisma/enums.js';
import { TicketsService } from './tickets.service.js';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto.js';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets/categories')
export class TicketCategoriesController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  list() {
    return this.ticketsService.listCategories();
  }

  @Get('incident-types')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  listIncidentTypes() {
    return this.ticketsService.listIncidentTypes();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketCategoryDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.createCategory(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketCategoryDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.updateCategory(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.deleteCategory(id, user);
  }
}
