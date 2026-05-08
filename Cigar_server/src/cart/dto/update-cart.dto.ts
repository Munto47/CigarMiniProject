import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;
}
