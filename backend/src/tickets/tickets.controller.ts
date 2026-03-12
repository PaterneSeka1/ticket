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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.ticketsService.addComment(id, dto, user);
  }

  @Get('me/created')
  myCreated(@CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.findMine(user.id);
  }

  @Get('dsi/received')
  receivedByDsi(@CurrentUser() user: AuthenticatedUserDto) {
    return this.ticketsService.findReceivedByDsi(user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
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
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
