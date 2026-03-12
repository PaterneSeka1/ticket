import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketType } from '../../prisma/enums.js';

export class UpdateTicketCategoryDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
