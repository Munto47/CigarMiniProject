import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { toBeijing } from '../common/utils/time';
import { CreateInstoreDto } from './dto/create-instore.dto';
import { UpdateInstoreDto } from './dto/update-instore.dto';
import { QueryInstoreDto } from './dto/query-instore.dto';

@Injectable()
export class InstoreService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryInstoreDto) {
    const { page = 1, pageSize = 20, categoryCode, brand, keyword } = query;
    const where: Record<string, unknown> = {};
    if (categoryCode) where.categoryCode = categoryCode;
    if (brand) where.brand = brand;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { brand: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.referenceCigar.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referenceCigar.count({ where }),
    ]);

    return paginate(
      list.map((r) => ({
        ...r,
        id: r.id.toString(),
        createdAt: toBeijing(r.createdAt),
        updatedAt: toBeijing(r.updatedAt),
      })),
      total,
      page,
      pageSize,
    );
  }

  async findById(id: bigint) {
    const r = await this.prisma.referenceCigar.findUnique({ where: { id } });
    return r ? { ...r, id: r.id.toString(), createdAt: toBeijing(r.createdAt), updatedAt: toBeijing(r.updatedAt) } : null;
  }

  async create(dto: CreateInstoreDto) {
    const r = await this.prisma.referenceCigar.create({ data: dto });
    return { ...r, id: r.id.toString(), createdAt: toBeijing(r.createdAt), updatedAt: toBeijing(r.updatedAt) };
  }

  async update(id: bigint, dto: UpdateInstoreDto) {
    const r = await this.prisma.referenceCigar.update({ where: { id }, data: dto });
    return { ...r, id: r.id.toString(), createdAt: toBeijing(r.createdAt), updatedAt: toBeijing(r.updatedAt) };
  }

  async delete(id: bigint) {
    await this.prisma.referenceCigar.delete({ where: { id } });
  }

  async sync(items: CreateInstoreDto[]) {
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const existing = await this.prisma.referenceCigar.findFirst({
        where: { name: item.name, brand: item.brand },
      });
      if (existing) {
        await this.prisma.referenceCigar.update({
          where: { id: existing.id },
          data: item,
        });
        updated++;
      } else {
        await this.prisma.referenceCigar.create({ data: item });
        created++;
      }
    }
    return { created, updated };
  }
}
