import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { page?: number; pageSize?: number; enabled?: boolean; category?: string }) {
    const { page = 1, pageSize = 20, enabled, category } = query;
    const where: Record<string, unknown> = {};
    if (enabled !== undefined) where.enabled = enabled;
    if (category) where.category = category;

    const [list, total] = await Promise.all([
      this.prisma.flavorTag.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.flavorTag.count({ where }),
    ]);

    return paginate(
      list.map((t) => ({
        ...t,
        id: t.id.toString(),
        aiWeight: t.aiWeight?.toString() ?? '0',
      })),
      total,
      page,
      pageSize,
    );
  }

  async findById(id: bigint) {
    const tag = await this.prisma.flavorTag.findUnique({ where: { id } });
    return tag ? { ...tag, id: tag.id.toString(), aiWeight: tag.aiWeight?.toString() ?? '0' } : null;
  }

  async create(dto: CreateTagDto) {
    const data = { ...dto, category: dto.category ?? '' };
    const tag = await this.prisma.flavorTag.create({ data });
    return { ...tag, id: tag.id.toString(), aiWeight: tag.aiWeight?.toString() ?? '0' };
  }

  async update(id: bigint, dto: UpdateTagDto) {
    const tag = await this.prisma.flavorTag.update({ where: { id }, data: dto });
    return { ...tag, id: tag.id.toString(), aiWeight: tag.aiWeight?.toString() ?? '0' };
  }

  async delete(id: bigint) {
    // 先删除关联，再删标签
    await this.prisma.cigarTag.deleteMany({ where: { tagId: id } });
    await this.prisma.flavorTag.delete({ where: { id } });
  }
}
