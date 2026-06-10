import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
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
  serviceTypeId?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string;

  @IsOptional()
  @IsString()
  resolutionComment?: string;
}
