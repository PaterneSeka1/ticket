import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketPriority } from '../../prisma/enums.js';

class TicketAttachmentInput {
  @IsNotEmpty()
  @IsString()
  filename!: string;

  @IsNotEmpty()
  @IsString()
  mimeType!: string;

  @IsNotEmpty()
  @IsString()
  url!: string;

  @IsInt()
  @Min(0)
  size!: number;
}

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsMongoId()
  incidentTypeId!: string;

  @IsMongoId()
  categoryId!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketAttachmentInput)
  attachments?: TicketAttachmentInput[];
}
