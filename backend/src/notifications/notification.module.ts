import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { WhatsappModule } from '../whatsapp/whatsapp.module.js';
import { NotificationService } from './notification.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [EmailModule, WhatsappModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
