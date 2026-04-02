import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../../prisma/enums.js';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @IsOptional()
  @IsString()
  resolutionComment?: string;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string | null;
}
