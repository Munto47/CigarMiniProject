import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateCigarDto } from './create-cigar.dto';

export class UpdateCigarDto extends PartialType(CreateCigarDto) {
  @ApiPropertyOptional({ description: '状态', enum: ['active', 'disabled', 'inactive'] })
  @IsOptional() @IsString()
  status?: string;
}
