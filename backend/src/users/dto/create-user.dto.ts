import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../prisma/enums.js';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nom!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  prenom!: string;

  @IsEmail()
  @IsString()
  @MaxLength(254)
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  matricule!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  passwordHash!: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  serviceId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveEmails?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  receiveWhatsapp?: boolean;

  @IsOptional()
  @IsMongoId()
  createdById?: string;
}
