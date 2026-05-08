import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { truncateJson } from '../common/utils/mask';

export interface OperationLogParams {
  adminId: bigint;
  adminName: string;
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  beforeData?: unknown;
  afterData?: unknown;
  level?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class OperationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: OperationLogParams): Promise<void> {
    try {
      const data: Prisma.OperationLogCreateInput = {
        adminId: params.adminId,
        adminName: params.adminName,
        module: params.module,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        description: params.description ?? null,
        level: params.level ?? 'info',
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      };
      if (params.beforeData) {
        data.beforeData = truncateJson(params.beforeData, 4096) as Prisma.InputJsonValue;
      }
      if (params.afterData) {
        data.afterData = truncateJson(params.afterData, 4096) as Prisma.InputJsonValue;
      }
      await this.prisma.operationLog.create({ data });
    } catch (err) {
      // 操作日志失败不应影响主业务
    }
  }
}
