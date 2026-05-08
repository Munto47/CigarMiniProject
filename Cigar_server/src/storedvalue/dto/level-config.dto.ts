import { IsString, IsInt, IsOptional, IsBoolean, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLevelConfigDto {
  @IsIn(['recharge', 'consumption'])
  levelType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level!: number;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPoints!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPoints?: number | null;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateLevelConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPoints?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPoints?: number | null;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
