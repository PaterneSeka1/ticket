import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto.js';
import { NotificationService } from './notification.service.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
  ) {
    const sanitizedLimit = Math.max(1, Math.min(limit, 100));
    return this.notifications.listForUser(user.id, {
      limit: sanitizedLimit,
      unreadOnly,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUserDto) {
    const count = await this.notifications.countUnreadForUser(user.id);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    const updated = await this.notifications.markRead(user.id, id);
    if (!updated) {
      throw new NotFoundException('Notification introuvable.');
    }
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: AuthenticatedUserDto) {
    await this.notifications.markAllRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    const deleted = await this.notifications.deleteForUser(user.id, id);
    if (!deleted) {
      throw new NotFoundException('Notification introuvable.');
    }
  }
}
