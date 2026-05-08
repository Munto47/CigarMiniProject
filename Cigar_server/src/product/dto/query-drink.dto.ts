import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryDrinkDto extends PaginationDto {
  @ApiPropertyOptional({ description: '分类代码筛选' })
  @IsOptional() @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsOptional() @IsString() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
