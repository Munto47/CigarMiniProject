import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRechargeTierDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusCents: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number = 0;
}

export class UpdateRechargeTierDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  enabled?: boolean;
}
