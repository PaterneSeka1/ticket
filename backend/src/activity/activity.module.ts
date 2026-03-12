import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityModule {}
