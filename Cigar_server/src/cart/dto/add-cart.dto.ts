import { IsString, IsInt, IsIn, Min, Max } from 'class-validator';

export class AddCartDto {
  @IsString()
  @IsIn(['cigar', 'drink'])
  productType: string;

  @IsInt()
  productId: number;

  @IsString()
  spec: string = '单支';

  @IsInt()
  @Min(1)
  @Max(99)
  qty: number = 1;
}
