import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['completed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
