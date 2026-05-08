import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { JwtPayload } from './jwt.strategy';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WechatRefreshDto } from './dto/wechat-refresh.dto';
import { DecryptPhoneDto } from './dto/decrypt-phone.dto';
import { encryptPhone, wechatDecrypt, maskPhone } from '../common/utils/crypto';
import axios from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async wechatLogin(dto: WechatLoginDto, ip?: string) {
    const { openid, session_key } = await this.code2Session(dto.code);

    let user = await this.prisma.user.findUnique({ where: { openid } });
    let isNew = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: '微信用户',
          memberProfile: { create: {} },
        },
      });
      isNew = true;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? null,
      },
    });

    await this.prisma.memberProfile.update({
      where: { userId: user.id },
      data: { loginCount: { increment: 1 } },
    });

    await this.redis.set(`sk:${user.id}`, session_key, 1800);

    const memberProfile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
    });

    const jti = randomUUID();
    const payload: JwtPayload = { sub: user.id.toString(), type: 'user' };
    const tokens = await this.generateTokens(payload, jti);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 1800,
      user: {
        id: user.id.toString(),
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phoneMask: user.phoneMask,
        memberProfile: memberProfile
          ? {
              balanceCents: memberProfile.balanceCents.toString(),
              balanceYuan: centsToYuan(memberProfile.balanceCents),
              rechargeLevel: memberProfile.rechargeLevel,
              consumptionLevel: memberProfile.consumptionLevel,
            }
          : null,
      },
      isNew,
    };
  }

  async refreshAccessToken(dto: WechatRefreshDto) {
    let payload: { sub: string; type: string; jti: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '无效的刷新令牌');
    }

    if (payload.type !== 'user') {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '无效的令牌类型');
    }

    const key = `refresh:${payload.sub}:${payload.jti}`;
    const exists = await this.redis.exists(key);
    if (!exists) {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '令牌已失效');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!user || user.status !== 1) {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, '用户不存在或已禁用');
    }

    // 撤销旧 refresh token（防止重用）
    await this.redis.del(key);

    const newJti = randomUUID();
    const newPayload: JwtPayload = { sub: payload.sub, type: 'user' };
    const accessToken = this.jwtService.sign(
      { ...newPayload, jti: newJti, token_type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_USER', '30m'),
      },
    );

    // 签发新 refresh token（7 天）
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, type: 'user', jti: newJti, token_type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      },
    );
    const refreshTtl = 7 * 24 * 3600;
    await this.redis.set(`refresh:${payload.sub}:${newJti}`, '1', refreshTtl);

    return { accessToken, refreshToken, expiresIn: 1800 };
  }

  async decryptPhone(userId: bigint, dto: DecryptPhoneDto) {
    const sessionKey = await this.redis.get(`sk:${userId}`);
    if (!sessionKey) {
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED, 'session_key 已过期，请重新登录');
    }

    let decrypted: Record<string, unknown>;
    try {
      decrypted = wechatDecrypt(dto.encryptedData, dto.iv, sessionKey);
    } catch {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '解密失败');
    }

    const watermark = decrypted['watermark'] as { appid: string } | undefined;
    const expectedAppId = this.config.get<string>('WECHAT_APP_ID');
    if (!watermark || watermark.appid !== expectedAppId) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, 'appid 校验失败');
    }

    const phone = decrypted['phoneNumber'] as string;
    if (!phone) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '未获取到手机号');
    }

    const phoneEncrypted = encryptPhone(phone);
    const phoneMask = maskPhone(phone);

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneEncrypted: Buffer.from(phoneEncrypted), phoneMask },
    });

    return { phoneMask };
  }

  private async code2Session(code: string): Promise<{ openid: string; session_key: string }> {
    const mockMode = this.config.get<string>('WECHAT_MOCK_MODE', 'false') === 'true';
    if (mockMode) {
      this.logger.warn('WECHAT_MOCK_MODE=true，使用模拟 openid');
      const mockOpenid = `mock_openid_${code.slice(-6)}`;
      return { openid: mockOpenid, session_key: 'mock_session_key_32_bytes_long!!' };
    }

    const appId = this.config.get<string>('WECHAT_APP_ID');
    const appSecret = this.config.get<string>('WECHAT_APP_SECRET');
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const { data } = await axios.get(url, {
      params: { appid: appId, secret: appSecret, js_code: code, grant_type: 'authorization_code' },
    });

    if (data.errcode) {
      this.logger.error(`code2Session 失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.WECHAT_PAY_API_ERROR, '微信登录失败');
    }

    return { openid: data.openid as string, session_key: data.session_key as string };
  }

  private async generateTokens(payload: JwtPayload, jti: string) {
    const type = payload.type;
    const accessToken = this.jwtService.sign(
      { ...payload, jti, token_type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn:
          type === 'admin'
            ? this.config.get('JWT_ACCESS_EXPIRES_ADMIN', '2h')
            : this.config.get('JWT_ACCESS_EXPIRES_USER', '30m'),
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
