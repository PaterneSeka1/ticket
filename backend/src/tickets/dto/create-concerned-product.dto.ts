import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConcernedProductDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
