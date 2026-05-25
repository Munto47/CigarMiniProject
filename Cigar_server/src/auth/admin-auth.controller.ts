import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { Public } from '../common/decorators/public.decorator';
import { AllowPasswordChange } from '../common/decorators/allow-password-change.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './jwt.strategy';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';

@ApiTags('admin/auth')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuthService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: '管理员刷新 token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.adminAuthService.refreshAdminToken(refreshToken);
  }

  @AllowPasswordChange()
  @Post('change-password')
  @ApiOperation({ summary: '修改密码（允许受限 Token）' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdminChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.adminAuthService.changePassword(
      BigInt(user.sub),
      dto,
      req.ip,
      req.headers['user-agent'],
    );
    return { message: '密码修改成功' };
  }
}
