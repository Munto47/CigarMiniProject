import { IsInt, IsString, IsIn, IsOptional, Min, MaxLength } from 'class-validator';

export class RefundDto {
  @IsInt()
  @Min(1)
  amountCents: number;

  @IsString()
  @MaxLength(255)
  reason: string;

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'balance'])
  refundChannel?: string = 'auto';
}
