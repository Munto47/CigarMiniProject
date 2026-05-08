import { IsString, IsIn, IsOptional } from 'class-validator';

export class PayOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['balance', 'meituan'])
  payMethod?: string = 'balance';
}
