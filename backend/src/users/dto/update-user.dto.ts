import {
  DirectionType,
  OperationService,
  UserRole,
} from '../../prisma/enums.js';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsEmail()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(DirectionType)
  direction?: DirectionType;

  @IsOptional()
  @IsEnum(OperationService)
  service?: OperationService;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
