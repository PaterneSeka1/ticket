import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '../../prisma/enums.js';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  nom!: string;

  @IsNotEmpty()
  @IsString()
  prenom!: string;

  @IsEmail()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  matricule!: string;

  @IsNotEmpty()
  @IsString()
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
  @IsMongoId()
  createdById?: string;
}
