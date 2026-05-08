import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health 应返回 ok', async () => {
    const response = await app.getHttpServer().get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('POST /api/admin/login 应拒绝错误密码', async () => {
    const response = await app
      .getHttpServer()
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong_password' });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe(2001);
  });

  it('POST /api/admin/login 应处理不存在的用户', async () => {
    const response = await app
      .getHttpServer()
      .post('/api/admin/login')
      .send({ username: 'nonexistent', password: 'test123' });
    expect(response.status).toBe(422);
  });

  it('POST /api/admin/change-password 无 token 时应拒绝', async () => {
    const response = await app
      .getHttpServer()
      .post('/api/admin/change-password')
      .send({ oldPassword: 'admin123', newPassword: 'NewPass123' });
    expect(response.status).toBe(401);
  });

  it('公开接口无需 token 可访问', async () => {
    const response = await app.getHttpServer().get('/api/cigars?page=1&pageSize=5');
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
  });
});
