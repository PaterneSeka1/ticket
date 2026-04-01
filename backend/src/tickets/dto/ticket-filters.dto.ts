import { IsEnum, IsISO8601, IsMongoId, IsOptional } from 'class-validator';
import { TicketPriority, TicketStatus } from '../../prisma/enums.js';

export class TicketFiltersDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsMongoId()
  incidentTypeId?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string;

  @IsOptional()
  @IsMongoId()
  createdById?: string;

  @IsOptional()
  @IsISO8601()
  createdAfter?: string;

  @IsOptional()
  @IsISO8601()
  createdBefore?: string;
}
