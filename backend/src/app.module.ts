import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActivityModule } from './activity/activity.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { NotificationModule } from './notifications/notification.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ResolutionModule } from './resolution/resolution.module.js';
import { ServicesModule } from './services/services.module.js';
import { SlaModule } from './sla/sla.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ActivityModule,
    NotificationModule,
    UsersModule,
    SlaModule,
    TicketsModule,
    ServicesModule,
    DepartmentsModule,
    ResolutionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
