import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import { CreateCigarDto } from './dto/create-cigar.dto';
import { UpdateCigarDto } from './dto/update-cigar.dto';
import { QueryCigarDto } from './dto/query-cigar.dto';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { QueryDrinkDto } from './dto/query-drink.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Cigar ====================

  async findCigars(query: QueryCigarDto, adminMode = false) {
    const { page = 1, pageSize = 20, categoryCode, brand, keyword, sortBy, sortOrder } = query;
    const where: Prisma.CigarWhereInput = {};

    if (!adminMode) {
      where.status = 'active';
    }
    if (categoryCode) where.categoryCode = categoryCode;
    if (brand) where.brand = brand;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { brand: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CigarOrderByWithRelationInput = {};
    const sortField = sortBy ?? 'createdAt';
    const sortDir = (sortOrder ?? 'desc') as 'asc' | 'desc';
    orderBy[sortField as keyof Prisma.CigarOrderByWithRelationInput] = sortDir;

    const [list, total] = await Promise.all([
      this.prisma.cigar.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, cigarTags: { include: { tag: true } } },
      }),
      this.prisma.cigar.count({ where }),
    ]);

    return paginate(list.map((c) => this.toCigarResponse(c)), total, page, pageSize);
  }

  async findCigarById(id: bigint) {
    const cigar = await this.prisma.cigar.findUnique({
      where: { id },
      include: {
        category: true,
        cigarTags: { include: { tag: true } },
        pairings: {
          include: { drink: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!cigar) return null;
    const base = this.toCigarResponse(cigar);
    return {
      ...base,
      pairings: cigar.pairings.map((p) => ({
        id: p.drink.id.toString(),
        name: p.drink.name,
        categoryCode: p.drink.categoryCode,
        priceCents: p.drink.priceCents.toString(),
        memberPriceCents: p.drink.memberPriceCents.toString(),
        priceYuan: centsToYuan(p.drink.priceCents),
        memberPriceYuan: centsToYuan(p.drink.memberPriceCents),
        thumbUrl: p.drink.thumbUrl,
        description: p.description ?? p.drink.description ?? null,
        stockAvailable: p.drink.stock - p.drink.stockLocked,
      })),
    };
  }

  async createCigar(dto: CreateCigarDto) {
    const { tagIds, ...data } = dto;
    const cigar = await this.prisma.cigar.create({
      data: {
        ...data,
        categoryType: 'cigar',
        cigarTags: tagIds
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { category: true, cigarTags: { include: { tag: true } } },
    });
    return this.toCigarResponse(cigar);
  }

  async updateCigar(id: bigint, dto: UpdateCigarDto) {
    const { tagIds, ...data } = dto;
    let cigar: unknown;

    if (tagIds !== undefined) {
      await this.prisma.cigarTag.deleteMany({ where: { cigarId: id } });
    }

    cigar = await this.prisma.cigar.update({
      where: { id },
      data: {
        ...data,
        cigarTags:
          tagIds !== undefined
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
      },
      include: { category: true, cigarTags: { include: { tag: true } } },
    });

    return this.toCigarResponse(cigar as Parameters<typeof this.toCigarResponse>[0]);
  }

  async deleteCigar(id: bigint) {
    await this.prisma.cigar.update({
      where: { id },
      data: { status: 'inactive', deletedAt: new Date() },
    });
  }

  // ==================== Drink ====================

  async findDrinks(query: QueryDrinkDto, adminMode = false) {
    const { page = 1, pageSize = 20, categoryCode, keyword, sortBy, sortOrder } = query;
    const where: Prisma.DrinkWhereInput = {};

    if (!adminMode) {
      where.status = 'active';
    }
    if (categoryCode) where.categoryCode = categoryCode;
    if (keyword) {
      where.OR = [{ name: { contains: keyword, mode: 'insensitive' } }];
    }

    const orderBy: Prisma.DrinkOrderByWithRelationInput = {};
    const sortField = sortBy ?? 'createdAt';
    const sortDir = (sortOrder ?? 'desc') as 'asc' | 'desc';
    orderBy[sortField as keyof Prisma.DrinkOrderByWithRelationInput] = sortDir;

    const [list, total] = await Promise.all([
      this.prisma.drink.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
      }),
      this.prisma.drink.count({ where }),
    ]);

    return paginate(list.map((d) => this.toDrinkResponse(d)), total, page, pageSize);
  }

  async findDrinkById(id: bigint) {
    const drink = await this.prisma.drink.findUnique({
      where: { id },
      include: { category: true },
    });
    return drink ? this.toDrinkResponse(drink) : null;
  }

  async createDrink(dto: CreateDrinkDto) {
    const drink = await this.prisma.drink.create({
      data: { ...dto, categoryType: 'drink' },
      include: { category: true },
    });
    return this.toDrinkResponse(drink);
  }

  async updateDrink(id: bigint, dto: UpdateDrinkDto) {
    const drink = await this.prisma.drink.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
    return this.toDrinkResponse(drink);
  }

  async deleteDrink(id: bigint) {
    await this.prisma.drink.update({
      where: { id },
      data: { status: 'inactive', deletedAt: new Date() },
    });
  }

  // ==================== Response Helpers ====================

  private toCigarResponse(
    cigar: {
      id: bigint; name: string; brand: string; model: string | null; spec: string;
      categoryCode: string; origin: string | null; year: string | null;
      wrapper: string | null; strength: string | null; duration: string | null;
      priceCents: bigint; memberPriceCents: bigint; stock: number;
      stockLocked: number; ratingAvg: unknown; ratingCount: number;
      flavorStart: string | null; flavorMid: string | null; flavorEnd: string | null;
      flavorScores: unknown; scenes: string[]; segments: unknown;
      heroImageUrl: string | null; thumbUrl: string | null; status: string;
      isNew: boolean; createdAt: Date; updatedAt: Date;
      category?: { type: string; code: string; name: string } | null;
      cigarTags?: { tag: { id: bigint; name: string; category: string } }[];
    },
  ) {
    const ratingAvg = typeof cigar.ratingAvg === 'object' && cigar.ratingAvg !== null
      ? (cigar.ratingAvg as { toString(): string }).toString()
      : String(cigar.ratingAvg);
    return {
      id: cigar.id.toString(),
      name: cigar.name,
      brand: cigar.brand,
      model: cigar.model,
      spec: cigar.spec,
      categoryCode: cigar.categoryCode,
      categoryName: cigar.category?.name ?? null,
      origin: cigar.origin,
      year: cigar.year,
      wrapper: cigar.wrapper,
      strength: cigar.strength,
      duration: cigar.duration,
      priceCents: cigar.priceCents.toString(),
      priceYuan: centsToYuan(cigar.priceCents),
      memberPriceCents: cigar.memberPriceCents.toString(),
      memberPriceYuan: centsToYuan(cigar.memberPriceCents),
      stock: cigar.stock,
      stockLocked: cigar.stockLocked,
      stockAvailable: cigar.stock - cigar.stockLocked,
      ratingAvg,
      ratingCount: cigar.ratingCount,
      flavorStart: cigar.flavorStart,
      flavorMid: cigar.flavorMid,
      flavorEnd: cigar.flavorEnd,
      flavorScores: cigar.flavorScores,
      scenes: cigar.scenes,
      segments: cigar.segments,
      heroImageUrl: cigar.heroImageUrl,
      thumbUrl: cigar.thumbUrl,
      status: cigar.status,
      isNew: cigar.isNew,
      tags: cigar.cigarTags?.map((ct) => ({
        id: ct.tag.id.toString(),
        name: ct.tag.name,
        category: ct.tag.category,
      })) ?? [],
      createdAt: toBeijing(cigar.createdAt),
      updatedAt: toBeijing(cigar.updatedAt),
    };
  }

  private toDrinkResponse(
    drink: {
      id: bigint; name: string; categoryCode: string; priceCents: bigint;
      memberPriceCents: bigint; stock: number; stockLocked: number;
      description: string | null; thumbUrl: string | null; status: string;
      isNew: boolean; createdAt: Date; updatedAt: Date;
      category?: { type: string; code: string; name: string } | null;
    },
  ) {
    return {
      id: drink.id.toString(),
      name: drink.name,
      categoryCode: drink.categoryCode,
      categoryName: drink.category?.name ?? null,
      priceCents: drink.priceCents.toString(),
      priceYuan: centsToYuan(drink.priceCents),
      memberPriceCents: drink.memberPriceCents.toString(),
      memberPriceYuan: centsToYuan(drink.memberPriceCents),
      stock: drink.stock,
      stockLocked: drink.stockLocked,
      stockAvailable: drink.stock - drink.stockLocked,
      description: drink.description,
      thumbUrl: drink.thumbUrl,
      status: drink.status,
      isNew: drink.isNew,
      createdAt: toBeijing(drink.createdAt),
      updatedAt: toBeijing(drink.updatedAt),
    };
  }
}
