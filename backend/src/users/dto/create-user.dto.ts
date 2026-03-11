import {
  DirectionType,
  OperationService,
  UserRole,
} from '../../prisma/enums.js';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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
  password!: string;

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
