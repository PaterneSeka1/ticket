import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketCategoriesController } from './ticket-categories.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [AuthModule, ActivityModule],
  providers: [TicketsService],
  controllers: [TicketCategoriesController, TicketsController],
})
export class TicketsModule {}
