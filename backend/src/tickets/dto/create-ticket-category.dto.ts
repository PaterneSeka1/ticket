import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketType } from '../../prisma/enums.js';

export class CreateTicketCategoryDto {
  @IsNotEmpty()
  @IsString()
  libelle!: string;

  @IsEnum(TicketType)
  type!: TicketType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
