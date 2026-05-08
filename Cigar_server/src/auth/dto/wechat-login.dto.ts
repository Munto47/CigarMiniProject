import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WechatLoginDto {
  @ApiProperty({ description: 'wx.login() 返回的 code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
