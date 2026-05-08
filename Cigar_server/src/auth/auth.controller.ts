import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './jwt.strategy';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WechatRefreshDto } from './dto/wechat-refresh.dto';
import { DecryptPhoneDto } from './dto/decrypt-phone.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wechat-login')
  @ApiOperation({ summary: '微信登录' })
  async wechatLogin(@Body() dto: WechatLoginDto, @Req() req: Request) {
    return this.authService.wechatLogin(dto, req.ip);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 access token' })
  async refresh(@Body() dto: WechatRefreshDto) {
    return this.authService.refreshAccessToken(dto);
  }

  @Post('decrypt-phone')
  @ApiOperation({ summary: '解密手机号' })
  async decryptPhone(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DecryptPhoneDto,
  ) {
    return this.authService.decryptPhone(BigInt(user.sub), dto);
  }
}
