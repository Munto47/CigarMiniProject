import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';

export interface RecalcProgress {
  jobId: number;
  status: string;
  totalUsers: number;
  processedUsers: number;
  affectedUsers: number;
}

@Injectable()
export class LevelRecalcService {
  private readonly logger = new Logger(LevelRecalcService.name);
  private progressMap = new Map<number, RecalcProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly opLogService: OperationLogService,
  ) {}

  /** 触发等级重算（异步，一期不依赖 BullMQ，用 setTimeout 模拟） */
  async triggerRecalc(
    levelType: string,
    adminId: bigint,
    adminName: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (!['recharge', 'consumption'].includes(levelType)) {
      levelType = 'recharge';
    }

    const job = await this.prisma.levelRecalcJob.create({
      data: {
        triggeredBy: adminId,
        status: 'processing',
        startedAt: new Date(),
      },
    });

    // 写操作日志
    await this.opLogService.log({
      adminId,
      adminName,
      module: 'storedvalue',
      action: 'recalculate_levels',
      targetType: 'level_config',
      targetId: levelType,
      description: `触发${levelType === 'recharge' ? '充值' : '消费'}等级重算`,
      level: 'warning',
      ip,
      userAgent,
    });

    // 异步执行重算
    this.runRecalc(Number(job.id), levelType, adminId).catch((err) => {
      this.logger.error(`等级重算失败 job=${job.id}: ${err}`);
    });

    return {
      jobId: job.id.toString(),
      status: 'processing',
      levelType,
    };
  }

  /** 查询重算任务进度 */
  getProgress(jobId: number): RecalcProgress | null {
    return this.progressMap.get(jobId) ?? null;
  }

  private async runRecalc(jobId: number, levelType: string, adminId: bigint) {
    const totalUsers = await this.prisma.user.count({ where: { status: 1 } });
    let processedUsers = 0;
    let affectedUsers = 0;
    const batchSize = 200;

    this.progressMap.set(jobId, {
      jobId,
      status: 'processing',
      totalUsers,
      processedUsers: 0,
      affectedUsers: 0,
    });

    // 获取等级配置
    const levelConfigs = await this.prisma.levelConfig.findMany({
      where: { levelType, enabled: true },
      orderBy: { level: 'desc' },
    });

    if (levelConfigs.length === 0) {
      this.progressMap.set(jobId, { jobId, status: 'completed', totalUsers, processedUsers, affectedUsers: 0 });
      await this.prisma.levelRecalcJob.update({
        where: { id: jobId },
        data: { status: 'completed', totalUsers, affectedUsers: 0, finishedAt: new Date() },
      });
      return;
    }

    let cursor: bigint | undefined;

    while (true) {
      const users = await this.prisma.user.findMany({
        where: { status: 1, ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
      });

      if (users.length === 0) break;

      for (const user of users) {
        const profile = await this.prisma.memberProfile.findUnique({ where: { userId: user.id } });
        if (!profile) { processedUsers++; continue; }

        const points = levelType === 'recharge'
          ? Number(profile.rechargePoints)
          : Number(profile.consumptionPoints);

        let newLevel = 1;
        for (const lc of levelConfigs) {
          const minPoints = Number(lc.minPoints);
          const maxPoints = lc.maxPoints !== null ? Number(lc.maxPoints) : Number.MAX_SAFE_INTEGER;
          if (points >= minPoints && points <= maxPoints) {
            newLevel = lc.level;
            break;
          }
        }

        const currentLevel = levelType === 'recharge'
          ? profile.rechargeLevel
          : profile.consumptionLevel;

        if (newLevel !== currentLevel) {
          affectedUsers++;

          await this.prisma.memberProfile.update({
            where: { userId: user.id },
            data:
              levelType === 'recharge'
                ? { rechargeLevel: newLevel }
                : { consumptionLevel: newLevel },
          });

          await this.prisma.levelChangeLog.create({
            data: {
              userId: user.id,
              levelType,
              levelBefore: currentLevel,
              levelAfter: newLevel,
              triggerType: 'recalculate',
              remark: `管理端触发等级重算 (job=${jobId})`,
              operatorAdminId: adminId,
            },
          });
        }
        processedUsers++;
      }

      this.progressMap.set(jobId, { jobId, status: 'processing', totalUsers, processedUsers, affectedUsers });
      cursor = users[users.length - 1].id;
    }

    this.progressMap.set(jobId, { jobId, status: 'completed', totalUsers, processedUsers, affectedUsers });
    await this.prisma.levelRecalcJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        totalUsers,
        affectedUsers,
        finishedAt: new Date(),
        detail: { processedUsers, affectedUsers },
      },
    });

    this.logger.log(`等级重算完成 job=${jobId}: ${affectedUsers}/${totalUsers} 用户受影响`);
  }
}
