import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ActivityLogsController } from './activity-logs.controller.js';
import { ActivityLogService } from './activity-log.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [ActivityLogsController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityModule {}
