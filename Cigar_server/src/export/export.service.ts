import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportOrders(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('订单数据');

    sheet.columns = [
      { header: '订单编号', key: 'orderNo', width: 22 },
      { header: '用户', key: 'userName', width: 16 },
      { header: '状态', key: 'status', width: 12 },
      { header: '原价(元)', key: 'totalYuan', width: 12 },
      { header: '实付(元)', key: 'actualPayYuan', width: 12 },
      { header: '已退(元)', key: 'refundedYuan', width: 12 },
      { header: '支付方式', key: 'payMethod', width: 12 },
      { header: '商品明细', key: 'items', width: 50 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '支付时间', key: 'paidAt', width: 20 },
    ];

    for (const o of orders) {
      sheet.addRow({
        orderNo: o.orderNo,
        userName: o.userNameSnapshot,
        status: o.status,
        totalYuan: centsToYuan(o.totalCents),
        actualPayYuan: centsToYuan(o.actualPayCents),
        refundedYuan: centsToYuan(o.refundedAmountCents),
        payMethod: o.payMethod ?? '-',
        items: o.orderItems.map((i) => `${i.nameSnapshot} x${i.qty}`).join('; '),
        createdAt: toBeijing(o.createdAt),
        paidAt: o.paidAt ? toBeijing(o.paidAt) : '-',
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  async exportTransactions(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const txs = await this.prisma.balanceTransaction.findMany({
      where,
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('储值流水');

    sheet.columns = [
      { header: '用户', key: 'userName', width: 16 },
      { header: '类型', key: 'type', width: 12 },
      { header: '方向', key: 'direction', width: 8 },
      { header: '金额(元)', key: 'amountYuan', width: 14 },
      { header: '余额(元)', key: 'balanceAfterYuan', width: 14 },
      { header: '关联类型', key: 'relatedType', width: 14 },
      { header: '关联编号', key: 'relatedNo', width: 22 },
      { header: '说明', key: 'description', width: 30 },
      { header: '时间', key: 'createdAt', width: 20 },
    ];

    for (const tx of txs) {
      sheet.addRow({
        userName: tx.user?.nickname ?? '-',
        type: tx.type,
        direction: tx.direction === 1 ? '收入' : '支出',
        amountYuan: centsToYuan(tx.amountCents),
        balanceAfterYuan: centsToYuan(tx.balanceAfterCents),
        relatedType: tx.relatedType,
        relatedNo: tx.relatedNo,
        description: tx.description ?? '',
        createdAt: toBeijing(tx.createdAt),
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  async exportCigars() {
    const cigars = await this.prisma.cigar.findMany({
      include: {
        category: { select: { name: true } },
        cigarTags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('雪茄库');

    sheet.columns = [
      { header: '品牌', key: 'brand', width: 16 },
      { header: '名称', key: 'name', width: 24 },
      { header: '型号', key: 'model', width: 16 },
      { header: '分类', key: 'category', width: 12 },
      { header: '产地', key: 'origin', width: 12 },
      { header: '年份', key: 'year', width: 8 },
      { header: '原价(元)', key: 'priceYuan', width: 12 },
      { header: '会员价(元)', key: 'memberPriceYuan', width: 13 },
      { header: '库存', key: 'stock', width: 8 },
      { header: '评分', key: 'ratingAvg', width: 8 },
      { header: '状态', key: 'status', width: 8 },
      { header: '风味标签', key: 'tags', width: 30 },
    ];

    for (const c of cigars) {
      sheet.addRow({
        brand: c.brand,
        name: c.name,
        model: c.model ?? '',
        category: c.category?.name ?? '',
        origin: c.origin ?? '',
        year: c.year ?? '',
        priceYuan: centsToYuan(c.priceCents),
        memberPriceYuan: centsToYuan(c.memberPriceCents),
        stock: c.stock,
        ratingAvg: Number(c.ratingAvg).toFixed(1),
        status: c.status === 'active' ? '在售' : '下架',
        tags: c.cigarTags.map((t) => t.tag.name).join(', '),
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  async importCigarsFromExcel(buffer: any): Promise<{
    total: number;
    imported: number;
    errors: string[];
  }> {
    const cigars = await this.parseCigarsFromExcel(buffer);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < cigars.length; i++) {
      const c = cigars[i];
      try {
        await this.prisma.cigar.create({
          data: {
            name: c.name,
            brand: c.brand,
            model: c.model ?? null,
            categoryType: 'cigar',
            categoryCode: c.categoryCode,
            origin: c.origin ?? null,
            year: c.year ?? null,
            priceCents: c.priceCents,
            memberPriceCents: c.memberPriceCents,
            stock: c.stock,
            spec: '单支',
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`第${i + 2}行: ${err?.message ?? String(err)}`);
      }
    }

    return { total: cigars.length, imported, errors };
  }

  async parseCigarsFromExcel(buffer: any) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const cigars: Array<{
      brand: string;
      name: string;
      model?: string;
      categoryCode: string;
      origin?: string;
      year?: string;
      priceCents: bigint;
      memberPriceCents: bigint;
      stock: number;
    }> = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const brand = String(row.getCell(1).value ?? '').trim();
      const name = String(row.getCell(2).value ?? '').trim();
      if (!brand || !name) return;

      const priceYuan = parseFloat(String(row.getCell(7).value ?? '0'));
      const memberPriceYuan = parseFloat(String(row.getCell(8).value ?? '0'));

      cigars.push({
        brand,
        name,
        model: String(row.getCell(3).value ?? '').trim() || undefined,
        categoryCode: String(row.getCell(4).value ?? 'other').trim() || 'other',
        origin: String(row.getCell(5).value ?? '').trim() || undefined,
        year: String(row.getCell(6).value ?? '').trim() || undefined,
        priceCents: BigInt(Math.round(priceYuan * 100)),
        memberPriceCents: BigInt(Math.round(memberPriceYuan * 100)),
        stock: parseInt(String(row.getCell(9).value ?? '0'), 10) || 0,
      });
    });

    return cigars;
  }
}
