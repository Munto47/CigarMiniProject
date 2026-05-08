import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import { Prisma } from '@prisma/client';

@Injectable()
export class TiersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(adminMode = false) {
    const where: Prisma.RechargeTierWhereInput = {};
    if (!adminMode) where.enabled = true;

    const tiers = await this.prisma.rechargeTier.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return tiers.map((t) => this.toResponse(t));
  }

  async findById(id: bigint) {
    const tier = await this.prisma.rechargeTier.findUnique({ where: { id } });
    return tier ? this.toResponse(tier) : null;
  }

  async create(data: { amountCents: number; bonusCents: number; displayName?: string; sortOrder: number }) {
    const tier = await this.prisma.rechargeTier.create({ data });
    return this.toResponse(tier);
  }

  async update(id: bigint, data: Prisma.RechargeTierUpdateInput) {
    const tier = await this.prisma.rechargeTier.update({ where: { id }, data });
    return this.toResponse(tier);
  }

  async remove(id: bigint) {
    await this.prisma.rechargeTier.update({
      where: { id },
      data: { enabled: false },
    });
  }

  private toResponse(t: {
    id: bigint; amountCents: bigint; bonusCents: bigint;
    displayName: string | null; enabled: boolean; sortOrder: number;
    createdAt: Date; updatedAt: Date;
  }) {
    return {
      id: t.id.toString(),
      amountCents: t.amountCents.toString(),
      amountYuan: centsToYuan(t.amountCents),
      bonusCents: t.bonusCents.toString(),
      bonusYuan: centsToYuan(t.bonusCents),
      totalCents: (t.amountCents + t.bonusCents).toString(),
      totalYuan: centsToYuan(t.amountCents + t.bonusCents),
      displayName: t.displayName,
      enabled: t.enabled,
      sortOrder: t.sortOrder,
    };
  }
}

@Injectable()
export class LevelConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findByType(levelType: string) {
    const configs = await this.prisma.levelConfig.findMany({
      where: { levelType, enabled: true },
      orderBy: { level: 'asc' },
    });
    return configs.map((c) => this.toResponse(c));
  }

  async findAll(levelType?: string) {
    const where: Prisma.LevelConfigWhereInput = {};
    if (levelType) where.levelType = levelType;

    const configs = await this.prisma.levelConfig.findMany({
      where,
      orderBy: [{ levelType: 'asc' }, { level: 'asc' }],
    });

    return configs.map((c) => this.toResponse(c));
  }

  async create(data: {
    levelType: string; level: number; name: string;
    minPoints: number; maxPoints?: number | null; icon?: string;
  }) {
    const config = await this.prisma.levelConfig.create({
      data: { ...data, icon: data.icon ?? `v${data.level}` },
    });
    return this.toResponse(config);
  }

  async update(id: bigint, data: Prisma.LevelConfigUpdateInput) {
    const config = await this.prisma.levelConfig.update({ where: { id }, data });
    return this.toResponse(config);
  }

  async remove(id: bigint) {
    await this.prisma.levelConfig.update({
      where: { id },
      data: { enabled: false },
    });
  }

  private toResponse(c: {
    id: bigint; levelType: string; level: number; name: string;
    minPoints: bigint; maxPoints: bigint | null;
    icon: string; enabled: boolean;
    createdAt: Date; updatedAt: Date;
  }) {
    return {
      id: c.id.toString(),
      levelType: c.levelType,
      level: c.level,
      name: c.name,
      minPoints: c.minPoints.toString(),
      maxPoints: c.maxPoints?.toString() ?? null,
      icon: c.icon,
      enabled: c.enabled,
    };
  }
}
