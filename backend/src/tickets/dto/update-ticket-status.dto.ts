import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketStatus } from '../../prisma/enums.js';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionComment?: string;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string | null;
}
