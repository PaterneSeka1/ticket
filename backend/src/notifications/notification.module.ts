import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
