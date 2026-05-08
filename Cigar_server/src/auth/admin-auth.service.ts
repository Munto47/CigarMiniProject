import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { JwtPayload } from './jwt.strategy';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly opLogService: OperationLogService,
  ) {}

  async login(dto: AdminLoginDto, ip?: string, userAgent?: string) {
    const username = dto.username;

    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '用户名或密码错误');
    }

    // 检查账号状态
    if (admin.status !== 1) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '账号已被禁用');
    }

    // 验证密码
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);

    if (!valid) {
      await this.logAdminLogin(admin.id, username, 'failed', '密码错误', ip, userAgent);
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '用户名或密码错误');
    }

    // 检查是否需要修改密码
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const mustChange =
      admin.mustChangePassword || admin.passwordChangedAt < ninetyDaysAgo;

    // 更新登录信息
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip ?? null },
    });

    if (mustChange) {
      // 签发受限 token（仅允许修改密码）
      const jti = randomUUID();
      const accessToken = this.jwtService.sign(
        {
          sub: admin.id.toString(),
          type: 'admin' as const,
          roleCode: admin.roleCode,
          jti,
          token_type: 'access',
          scope: 'change_password',
        },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      );

      await this.logAdminLogin(admin.id, username, 'success', '需修改密码', ip, userAgent);
      throw new BusinessException(ErrorCode.MUST_CHANGE_PASSWORD, '请修改初始密码');
    }

    await this.logAdminLogin(admin.id, username, 'success', null, ip, userAgent);

    const jti = randomUUID();
    const payload: JwtPayload = { sub: admin.id.toString(), type: 'admin', roleCode: admin.roleCode };
    const tokens = await this.generateAdminTokens(payload, jti);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 7200,
      admin: {
        id: admin.id.toString(),
        username: admin.username,
        name: admin.name,
        roleCode: admin.roleCode,
        mustChangePassword: false,
      },
    };
  }

  async refreshAdminToken(refreshToken: string) {
    let payload: { sub: string; type: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '无效的刷新令牌');
    }

    if (payload.type !== 'admin') {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '无效的令牌类型');
    }

    const key = `refresh:${payload.sub}:${payload.jti}`;
    const exists = await this.redis.exists(key);
    if (!exists) {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '令牌已失效');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!admin || admin.status !== 1) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '账号不存在或已禁用');
    }

    // 撤销旧 refresh token（防止重用）
    await this.redis.del(key);

    const newJti = randomUUID();
    const accessToken = this.jwtService.sign(
      { sub: payload.sub, type: 'admin', roleCode: admin.roleCode, jti: newJti, token_type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_ADMIN', '2h'),
      },
    );

    // 签发新 refresh token（7 天）
    const newRefreshToken = this.jwtService.sign(
      { sub: payload.sub, type: 'admin', jti: newJti, token_type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      },
    );
    const refreshTtl = 7 * 24 * 3600;
    await this.redis.set(`refresh:${payload.sub}:${newJti}`, '1', refreshTtl);

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 7200 };
  }

  async changePassword(
    adminId: bigint,
    dto: AdminChangePasswordDto,
    ip?: string,
    userAgent?: string,
  ) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new BusinessException(ErrorCode.FORBIDDEN, '账号不存在');

    const valid = await bcrypt.compare(dto.oldPassword, admin.passwordHash);
    if (!valid) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '旧密码错误');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    // 清除该 admin 的所有 refresh token
    const keys = await this.redis.raw.keys(`refresh:${adminId.toString()}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    await this.opLogService.log({
      adminId,
      adminName: admin.name,
      module: 'account',
      action: 'change_password',
      targetType: 'admin',
      targetId: adminId.toString(),
      description: '管理员修改密码',
      level: 'warning',
      ip,
      userAgent,
    });
  }

  private async logAdminLogin(
    adminId: bigint,
    username: string,
    result: string,
    reason: string | null,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.adminLoginLog.create({
        data: {
          adminId,
          username,
          result,
          reason,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch {
      // 登录日志失败不阻塞主流程
    }
  }

  private async generateAdminTokens(payload: JwtPayload, jti: string) {
    const accessToken = this.jwtService.sign(
      { ...payload, jti, token_type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_ADMIN', '2h'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, jti, token_type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      },
    );

    await this.redis.set(`refresh:${payload.sub}:${jti}`, '1', 7 * 86400);
    return { accessToken, refreshToken };
  }
}
