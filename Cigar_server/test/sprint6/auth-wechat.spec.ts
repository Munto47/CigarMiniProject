import axios from 'axios';
import { AuthService } from '../../src/auth/auth.service';
import { BusinessException } from '../../src/common/exceptions/business.exception';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('AuthService wechat login fallback', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  function createService(configMap: Record<string, string>) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 1n,
          nickname: '微信用户',
          avatarUrl: null,
          phoneMask: null,
          status: 1,
        }),
        update: jest.fn().mockResolvedValue({
          id: 1n,
          nickname: '微信用户',
          avatarUrl: null,
          phoneMask: null,
          status: 1,
        }),
      },
      memberProfile: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          balanceCents: 0n,
          rechargeLevel: 1,
          consumptionLevel: 1,
        }),
      },
    };

    const redis = {
      set: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
    };

    const jwtService = {
      sign: jest
        .fn()
        .mockImplementation(({ token_type }: { token_type: string }) =>
          token_type === 'access' ? 'access-token' : 'refresh-token',
        ),
      verify: jest.fn(),
    };

    const config = {
      get: jest.fn((key: string, defaultValue?: string) =>
        Object.prototype.hasOwnProperty.call(configMap, key) ? configMap[key] : defaultValue,
      ),
    };

    const service = new AuthService(prisma as never, redis as never, jwtService as never, config as never);
    return { service, prisma, redis, jwtService, config };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('开发环境 code2Session 失败时回退到 mock 登录', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        errcode: 40029,
        errmsg: 'invalid code',
      },
    } as never);

    const { service, redis } = createService({
      NODE_ENV: 'development',
      WECHAT_MOCK_MODE: 'false',
      WECHAT_APP_ID: 'wx-dev',
      WECHAT_APP_SECRET: 'dev-secret',
      JWT_ACCESS_SECRET: 'access',
      JWT_REFRESH_SECRET: 'refresh',
    });

    const result = await service.wechatLogin({ code: 'mock_test_code_001' });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('1');
    expect(redis.set).toHaveBeenCalled();
  });

  it('开发环境数据库不可用时回退到体验账号', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        openid: 'wx_open_id',
        session_key: 'wx_session_key',
      },
    } as never);

    const { service, prisma } = createService({
      NODE_ENV: 'development',
      WECHAT_MOCK_MODE: 'false',
      WECHAT_APP_ID: 'wx-dev',
      WECHAT_APP_SECRET: 'dev-secret',
      JWT_ACCESS_SECRET: 'access',
      JWT_REFRESH_SECRET: 'refresh',
    });

    prisma.user.findUnique.mockRejectedValue(new Error('db down'));

    const result = await service.wechatLogin({ code: 'mock_test_code_002' });

    expect(result.accessToken).toBe('access-token');
    expect(result.user.nickname).toBe('开发体验账号');
    expect((result as { demoMode?: boolean }).demoMode).toBe(true);
  });

  it('生产环境 code2Session 失败时仍返回业务异常', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        errcode: 40029,
        errmsg: 'invalid code',
      },
    } as never);

    const { service } = createService({
      NODE_ENV: 'production',
      WECHAT_MOCK_MODE: 'false',
      WECHAT_APP_ID: 'wx-prod',
      WECHAT_APP_SECRET: 'prod-secret',
      JWT_ACCESS_SECRET: 'access',
      JWT_REFRESH_SECRET: 'refresh',
    });

    await expect(service.wechatLogin({ code: 'bad_code' })).rejects.toBeInstanceOf(BusinessException);
  });
});
