import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
