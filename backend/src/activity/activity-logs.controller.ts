import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../prisma/enums.js';
import { ActivityLogService } from './activity-log.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('activity/logs')
export class ActivityLogsController {
  constructor(private readonly activity: ActivityLogService) {}

  @Get()
  findRecent(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
  ) {
    const sanitizedLimit = Math.max(1, Math.min(limit, 500));
    const actions =
      action === 'auth.login'
        ? ['auth.login']
        : action === 'auth.logout'
          ? ['auth.logout']
          : undefined;

    const since =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : undefined;
    const until =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : undefined;
    if (until) {
      until.setUTCDate(until.getUTCDate() + 1);
    }

    return this.activity.fetchLogs({
      limit: sanitizedLimit,
      actions,
      search,
      since,
      until,
    });
  }
}
