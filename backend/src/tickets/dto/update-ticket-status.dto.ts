import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { TicketStatus, TimelineEventType } from '../../prisma/enums.js';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsOptional()
  @IsMongoId()
  receivedById?: string;

  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;
}
