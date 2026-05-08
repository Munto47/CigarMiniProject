import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRechargeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tierId!: number;
}

export class AdjustBalanceDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @Type(() => Number)
  @IsInt()
  amountCents!: number;  // positive = add, negative = deduct

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}

export class QueryBalanceTxDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class QueryRechargeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}
