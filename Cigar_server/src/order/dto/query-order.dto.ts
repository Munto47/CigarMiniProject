import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryOrderDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(['all', 'pending', 'paid', 'settling', 'completed', 'cancelled', 'refunding', 'refunded'])
  status?: string = 'all';
}
