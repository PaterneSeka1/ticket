import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../prisma/enums.js';
import { CreateConcernedProductDto } from './dto/create-concerned-product.dto.js';
import { UpdateConcernedProductDto } from './dto/update-concerned-product.dto.js';
import { TicketsService } from './tickets.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets/products')
export class ConcernedProductsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  list() {
    return this.ticketsService.listConcernedProducts();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateConcernedProductDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.createConcernedProduct(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConcernedProductDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.updateConcernedProduct(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.deleteConcernedProduct(id, user);
  }
}
