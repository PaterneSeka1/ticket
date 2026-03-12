import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  OperationService,
  TicketPriority,
  TicketType,
} from '../../prisma/enums.js';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(OperationService)
  assignedService?: OperationService;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaMaxMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  waitMinutes?: number;
}
