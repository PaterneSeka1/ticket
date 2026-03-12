import {
  DirectionType,
  OperationService,
  UserRole,
} from '../../prisma/enums.js';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsMongoId()
  createdById?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastLogin?: Date;
}
