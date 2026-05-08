import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WechatRefreshDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
