import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsIn, Min, Max } from 'class-validator';

export class QueryTransactionsDto {
  @IsOptional()
  @IsIn(['all', 'recharge', 'consume', 'refund', 'manual'])
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
