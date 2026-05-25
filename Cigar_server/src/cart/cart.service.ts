import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: bigint) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (items.length === 0) return { items: [], totalCents: '0', totalYuan: '0.00' };

    // 并行获取商品详情
    const cigarIds = items.filter(i => i.productType === 'cigar').map(i => i.productId);
    const drinkIds = items.filter(i => i.productType === 'drink').map(i => i.productId);

    const [cigars, drinks] = await Promise.all([
      cigarIds.length > 0
        ? this.prisma.cigar.findMany({
            where: { id: { in: cigarIds }, status: 'active' },
            select: {
              id: true, name: true, brand: true, spec: true,
              priceCents: true, memberPriceCents: true,
              stock: true, stockLocked: true, thumbUrl: true, status: true,
            },
          })
        : Promise.resolve([]),
      drinkIds.length > 0
        ? this.prisma.drink.findMany({
            where: { id: { in: drinkIds }, status: 'active' },
            select: {
              id: true, name: true,
              priceCents: true, memberPriceCents: true,
              stock: true, stockLocked: true, thumbUrl: true, status: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map<string, any>();
    for (const c of cigars) productMap.set(`cigar:${c.id}`, c);
    for (const d of drinks) productMap.set(`drink:${d.id}`, d);

    let totalCents = BigInt(0);
    const enrichedItems = items.map(item => {
      const product = productMap.get(`${item.productType}:${item.productId}`);
      const available = product && product.status === 'active';
      const stockAvailable = product ? (product.stock as number) - (product.stockLocked as number) : 0;
      const priceCents = product ? (product.memberPriceCents ?? product.priceCents) as bigint : BigInt(0);
      const subtotal = priceCents * BigInt(item.qty);
      totalCents += subtotal;

      return {
        id: item.id.toString(),
        productType: item.productType,
        productId: item.productId.toString(),
        spec: item.spec,
        qty: item.qty,
        name: product?.name ?? '(已下架)',
        brand: product?.brand,
        thumbUrl: product?.thumbUrl,
        priceCents: priceCents.toString(),
        priceYuan: centsToYuan(priceCents),
        subtotalCents: subtotal.toString(),
        subtotalYuan: centsToYuan(subtotal),
        available,
        stockAvailable,
        offline: !available,
      };
    });

    return {
      items: enrichedItems,
      totalCents: totalCents.toString(),
      totalYuan: centsToYuan(totalCents),
    };
  }

  async addToCart(userId: bigint, dto: { productType: string; productId: number; spec: string; qty: number }) {
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_productType_productId_spec: {
          userId,
          productType: dto.productType,
          productId: BigInt(dto.productId),
          spec: dto.spec,
        },
      },
    });

    let item;
    if (existing) {
      item = await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + dto.qty },
      });
    } else {
      item = await this.prisma.cartItem.create({
        data: {
          userId,
          productType: dto.productType,
          productId: BigInt(dto.productId),
          spec: dto.spec,
          qty: dto.qty,
        },
      });
    }

    // 转换 BigInt 字段，避免 JSON 序列化报错
    return {
      id: item.id.toString(),
      productType: item.productType,
      productId: item.productId.toString(),
      spec: item.spec,
      qty: item.qty,
    };
  }

  async updateQty(userId: bigint, itemId: number, qty: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: BigInt(itemId), userId },
    });
    if (!item) return null;

    const updated = await this.prisma.cartItem.update({
      where: { id: BigInt(itemId) },
      data: { qty },
    });

    return {
      id: updated.id.toString(),
      productType: updated.productType,
      productId: updated.productId.toString(),
      spec: updated.spec,
      qty: updated.qty,
    };
  }

  async removeItem(userId: bigint, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: BigInt(itemId), userId },
    });
    if (!item) return false;

    await this.prisma.cartItem.delete({ where: { id: BigInt(itemId) } });
    return true;
  }

  async clearCart(userId: bigint) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  /** 仅清除指定商品（下单后调用，避免清空购物车中其他商品） */
  async clearCartItems(
    userId: bigint,
    items: { productType: string; productId: number }[],
  ) {
    if (items.length === 0) return;
    const productIds = items.map((i) => BigInt(i.productId));
    const productTypes = [...new Set(items.map((i) => i.productType))];
    await this.prisma.cartItem.deleteMany({
      where: {
        userId,
        productType: { in: productTypes },
        productId: { in: productIds },
      },
    });
  }

  async getCount(userId: bigint): Promise<number> {
    return this.prisma.cartItem.count({ where: { userId } });
  }

  async validate(userId: bigint) {
    const { items } = await this.getCart(userId);
    const warnings: string[] = [];
    const validItems: any[] = [];

    for (const item of items) {
      if (item.offline) {
        warnings.push(`${item.name} 已下架，请删除`);
        continue;
      }
      if (item.stockAvailable < item.qty) {
        warnings.push(`${item.name} 库存不足（剩余 ${item.stockAvailable} 件）`);
      }
      validItems.push(item);
    }

    return {
      valid: warnings.length === 0,
      warnings,
      items: validItems,
      totalCents: validItems.reduce((sum, i) => sum + BigInt(i.subtotalCents), BigInt(0)).toString(),
    };
  }
}
