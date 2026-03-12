import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TimelineEventType } from '../../prisma/enums.js';

export class CreateTicketTimelineDto {
  @IsEnum(TimelineEventType)
  type!: TimelineEventType;

  @IsNotEmpty()
  @IsString()
  label!: string;

  @IsNotEmpty()
  @IsString()
  actorName!: string;
}
