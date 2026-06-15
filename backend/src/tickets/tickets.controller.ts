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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../prisma/enums.js';
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto.js';
import { CreateTicketTimelineDto } from './dto/create-ticket-timeline.dto.js';
import { TicketFiltersDto } from './dto/ticket-filters.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.create(dto, user);
  }

  @Get()
  findAll(@Query() filters: TicketFiltersDto) {
    return this.ticketsService.findAll(filters);
  }

  @Get('me/created')
  myCreated(@CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.findMine(user.id);
  }

  @Get('dsi/received')
  receivedByDsi(@CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.findReceivedByDsi(user);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.addComment(id, dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.updateStatus(id, dto, user);
  }

  @Post(':id/timeline')
  recordTimeline(
    @Param('id') id: string,
    @Body() dto: CreateTicketTimelineDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.recordTimeline(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.remove(id, user);
  }
}
