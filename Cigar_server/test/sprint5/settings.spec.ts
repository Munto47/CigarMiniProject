import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../../src/settings/settings.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OperationLogService } from '../../src/operation-log/operation-log.service';

describe('SettingsService (unit)', () => {
  let service: SettingsService;
  let prisma: any;
  let opLog: any;

  beforeEach(async () => {
    prisma = {
      systemConfig: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      operationLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    opLog = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OperationLogService, useValue: opLog },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getAllSettings', () => {
    it('按分组返回系统设置', async () => {
      prisma.systemConfig.findMany.mockResolvedValue([
        { configKey: 'store_name', configValue: 'GOAT CIGAR CLUB' },
        { configKey: 'store_phone', configValue: '13800000000' },
        { configKey: 'store_address', configValue: '上海市黄浦区' },
        { configKey: 'meituan_app_id', configValue: '12345' },
        { configKey: 'meituan_shop_id', configValue: 'shop_001' },
        { configKey: 'custom_key', configValue: { foo: 'bar' } },
      ]);

      const result = await service.getAllSettings();
      expect(result.basic.store_name).toBe('GOAT CIGAR CLUB');
      expect(result.basic.store_phone).toBe('13800000000');
      expect(result.meituan.meituan_app_id).toBe('12345');
      expect(result.other.custom_key).toEqual({ foo: 'bar' });
    });
  });

  describe('updateSetting', () => {
    it('更新系统设置并记录操作日志', async () => {
      prisma.systemConfig.findUnique.mockResolvedValue({
        configKey: 'store_name', configValue: '旧名称',
      });
      prisma.systemConfig.upsert.mockResolvedValue({
        configKey: 'store_name', configValue: '新名称',
      });

      const result = await service.updateSetting('store_name', '新名称', 1n, 'admin');
      expect(result.configKey).toBe('store_name');
      expect(result.updated).toBe(true);
      expect(prisma.systemConfig.upsert).toHaveBeenCalled();
      expect(opLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'settings',
          action: 'update',
          level: 'warning',
        }),
      );
    });
  });

  describe('getOperationLogs', () => {
    it('分页返回操作日志', async () => {
      prisma.operationLog.findMany.mockResolvedValue([
        {
          id: 1n, adminId: 1n, adminName: 'admin',
          module: 'settings', action: 'update',
          targetType: 'system_config', targetId: 'store_name',
          description: '修改系统配置', beforeData: null, afterData: null,
          level: 'warning', ip: null, createdAt: new Date(),
        },
      ]);
      prisma.operationLog.count.mockResolvedValue(1);

      const result = await service.getOperationLogs(1, 20);
      expect(result.list.length).toBe(1);
      expect(result.list[0].adminName).toBe('admin');
      expect(result.total).toBe(1);
    });
  });

  describe('testMeituanConnection', () => {
    it('没有美团配置时返回失败', async () => {
      prisma.systemConfig.findMany.mockResolvedValue([]);
      const result = await service.testMeituanConnection();
      expect(result.success).toBe(false);
    });

    it('存在美团配置时返回成功', async () => {
      prisma.systemConfig.findMany.mockResolvedValue([
        { configKey: 'meituan_app_id', configValue: '123' },
      ]);
      const result = await service.testMeituanConnection();
      expect(result.success).toBe(true);
    });
  });
});
