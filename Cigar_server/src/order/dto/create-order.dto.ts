import { Type } from 'class-transformer';
import {
  IsArray, IsString, IsInt, IsIn, Min, Max, ValidateNested,
  IsOptional, Matches,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsIn(['cigar', 'drink'])
  productType: string;

  @IsInt()
  productId: number;

  @IsOptional()
  @IsString()
  spec?: string = '单支';

  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @Max(255)
  remark?: string;
}
