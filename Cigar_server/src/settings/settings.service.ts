import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

export interface SystemSettingsGrouped {
  basic: Record<string, any>;
  meituan: Record<string, any>;
  other: Record<string, any>;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog: OperationLogService,
  ) {}

  async getAllSettings(): Promise<SystemSettingsGrouped> {
    const configs = await this.prisma.systemConfig.findMany();
    const result: SystemSettingsGrouped = { basic: {}, meituan: {}, other: {} };

    const basicKeys = ['store_name', 'store_address', 'store_phone', 'store_hours', 'logo_url'];
    const meituanKeys = ['meituan_app_id', 'meituan_merchant_id', 'meituan_shop_id', 'meituan_api_host'];

    for (const c of configs) {
      if (basicKeys.includes(c.configKey)) {
        result.basic[c.configKey] = c.configValue;
      } else if (meituanKeys.includes(c.configKey) || c.configKey.startsWith('meituan_')) {
        result.meituan[c.configKey] = c.configValue;
      } else {
        result.other[c.configKey] = c.configValue;
      }
    }

    return result;
  }

  async updateSetting(configKey: string, configValue: any, adminId: bigint, adminName: string) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { configKey },
    });

    await this.prisma.systemConfig.upsert({
      where: { configKey },
      create: {
        configKey,
        configValue,
        updatedBy: adminId,
      },
      update: {
        configValue,
        updatedBy: adminId,
        updatedAt: new Date(),
      },
    });

    await this.operationLog.log({
      adminId,
      adminName,
      module: 'settings',
      action: existing ? 'update' : 'create',
      targetType: 'system_config',
      targetId: configKey,
      description: `修改系统配置: ${configKey}`,
      beforeData: existing?.configValue ?? null,
      afterData: configValue,
      level: 'warning',
    });

    return { configKey, updated: true };
  }

  async getOperationLogs(
    page: number = 1,
    pageSize: number = 20,
    module?: string,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (module) {
      where.module = module;
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return paginate(
      logs.map((l) => ({
        id: l.id.toString(),
        adminId: l.adminId.toString(),
        adminName: l.adminName,
        module: l.module,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        description: l.description,
        beforeData: l.beforeData,
        afterData: l.afterData,
        level: l.level,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async testMeituanConnection() {
    // Check if meituan config exists
    const configs = await this.prisma.systemConfig.findMany({
      where: { configKey: { startsWith: 'meituan_' } },
    });

    if (configs.length === 0) {
      return { success: false, message: '美团配置未找到' };
    }

    // Stub: actual API call to meituan would go here
    return {
      success: true,
      message: '美团连接测试通过（Mock）',
      configCount: configs.length,
    };
  }
}
