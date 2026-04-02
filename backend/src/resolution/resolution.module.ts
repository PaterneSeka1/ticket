import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ResolutionResponsibleController } from './resolution.controller.js';
import { ResolutionResponsibleService } from './resolution.service.js';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [ResolutionResponsibleController],
  providers: [ResolutionResponsibleService],
  exports: [ResolutionResponsibleService],
})
export class ResolutionModule {}
