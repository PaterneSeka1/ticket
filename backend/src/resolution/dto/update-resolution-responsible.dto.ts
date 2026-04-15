import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateResolutionResponsibleDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

