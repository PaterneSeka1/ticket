import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SlaController } from './sla.controller.js';
import { SlaService } from './sla.service.js';

@Module({
  imports: [PrismaModule, AuthModule, ActivityModule],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
