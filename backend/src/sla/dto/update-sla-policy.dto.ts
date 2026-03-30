import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSlaPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  responseMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  resolutionMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
