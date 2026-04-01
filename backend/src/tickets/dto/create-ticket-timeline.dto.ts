import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../../prisma/enums.js';

export class CreateTicketTimelineDto {
  @IsNotEmpty()
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
