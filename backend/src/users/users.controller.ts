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
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../prisma/enums.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.usersService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  findAll(@CurrentUser() user: AuthenticatedUserDto) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.READER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.usersService.remove(id, user);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserDto) {
    return this.usersService.activate(id, user);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.usersService.deactivate(id, user);
  }

  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resetPassword(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.usersService.resetPassword(id, user);
  }

  @Get(':id/password')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPassword(@Param('id') id: string) {
    return this.usersService.getPassword(id);
  }
}
