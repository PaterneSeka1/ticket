import type {
  IncidentScope as PrismaIncidentScope,
  NotificationChannel as PrismaNotificationChannel,
  NotificationType as PrismaNotificationType,
  TicketPriority as PrismaTicketPriority,
  TicketStatus as PrismaTicketStatus,
  TicketType as PrismaTicketType,
  UserRole as PrismaUserRole,
} from '../../generated/prisma/index.js';
import { importGeneratedPrismaModule } from './generated-prisma-import.js';

const prismaEnums =
  await importGeneratedPrismaModule<
    typeof import('../../generated/prisma/index.js')
  >('index.js');

export const {
  UserRole,
  TicketPriority,
  TicketStatus,
  IncidentScope,
  NotificationChannel,
  NotificationType,
  TicketType,
} = prismaEnums;

export type UserRole = PrismaUserRole;
export type TicketPriority = PrismaTicketPriority;
export type TicketStatus = PrismaTicketStatus;
export type IncidentScope = PrismaIncidentScope;
export type NotificationChannel = PrismaNotificationChannel;
export type NotificationType = PrismaNotificationType;
export type TicketType = PrismaTicketType;
