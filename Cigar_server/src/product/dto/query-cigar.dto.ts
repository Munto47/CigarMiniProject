import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryCigarDto extends PaginationDto {
  @ApiPropertyOptional({ description: '分类代码筛选' })
  @IsOptional() @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({ description: '品牌筛选' })
  @IsOptional() @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '关键词搜索（名称/品牌）' })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsOptional() @IsString() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
