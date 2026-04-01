import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '../../prisma/enums.js';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  incidentTypeId?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string;

  @IsOptional()
  @IsString()
  resolutionComment?: string;
}
