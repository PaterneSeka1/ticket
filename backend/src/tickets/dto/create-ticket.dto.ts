import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketPriority } from '../../prisma/enums.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

class TicketAttachmentInput {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsNotEmpty()
  @IsIn(ALLOWED_MIME_TYPES)
  mimeType!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ATTACHMENT_SIZE)
  size!: number;
}

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsMongoId()
  serviceTypeId!: string;

  @IsMongoId()
  categoryId!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  product?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  products?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @IsOptional()
  @IsMongoId()
  assignedResponsibleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketAttachmentInput)
  attachments?: TicketAttachmentInput[];
}
