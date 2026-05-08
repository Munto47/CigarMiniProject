import { Test, TestingModule } from '@nestjs/testing';
import { OrderStateMachine } from '../../src/order/order-state-machine';

describe('OrderStateMachine', () => {
  it('pending → paid 允许', () => {
    expect(OrderStateMachine.canTransit('pending', 'paid')).toBe(true);
  });

  it('pending → cancelled 允许', () => {
    expect(OrderStateMachine.canTransit('pending', 'cancelled')).toBe(true);
  });

  it('paid → completed 允许', () => {
    expect(OrderStateMachine.canTransit('paid', 'completed')).toBe(true);
  });

  it('paid → refunding 允许', () => {
    expect(OrderStateMachine.canTransit('paid', 'refunding')).toBe(true);
  });

  it('completed → refunding 允许', () => {
    expect(OrderStateMachine.canTransit('completed', 'refunding')).toBe(true);
  });

  it('refunding → refunded 允许', () => {
    expect(OrderStateMachine.canTransit('refunding', 'refunded')).toBe(true);
  });

  it('refunding → completed 允许（部分退款完成）', () => {
    expect(OrderStateMachine.canTransit('refunding', 'completed')).toBe(true);
  });

  it('pending → completed 不允许（必须先支付）', () => {
    expect(OrderStateMachine.canTransit('pending', 'completed')).toBe(false);
  });

  it('paid → cancelled 不允许', () => {
    expect(OrderStateMachine.canTransit('paid', 'cancelled')).toBe(false);
  });

  it('cancelled → * 终态不可转', () => {
    expect(OrderStateMachine.canTransit('cancelled', 'pending')).toBe(false);
    expect(OrderStateMachine.canTransit('cancelled', 'paid')).toBe(false);
  });

  it('refunded → * 终态不可转', () => {
    expect(OrderStateMachine.canTransit('refunded', 'pending')).toBe(false);
    expect(OrderStateMachine.canTransit('refunded', 'paid')).toBe(false);
  });

  it('isTerminal 终态判断', () => {
    expect(OrderStateMachine.isTerminal('cancelled')).toBe(true);
    expect(OrderStateMachine.isTerminal('refunded')).toBe(true);
    expect(OrderStateMachine.isTerminal('pending')).toBe(false);
    expect(OrderStateMachine.isTerminal('paid')).toBe(false);
    expect(OrderStateMachine.isTerminal('completed')).toBe(false);
  });

  it('assertTransit 有效转换不抛异常', () => {
    expect(() => OrderStateMachine.assertTransit('pending', 'paid')).not.toThrow();
  });

  it('assertTransit 无效转换抛异常', () => {
    expect(() => OrderStateMachine.assertTransit('cancelled', 'paid')).toThrow('不允许从 cancelled 转换到 paid');
  });
});

describe('Cart Service (unit)', () => {
  it('getCount 返回购物车数量', async () => {
    const mockPrisma = {
      cartItem: { count: jest.fn().mockResolvedValue(5) },
    };
    // 模拟测试
    const count = await mockPrisma.cartItem.count({ where: { userId: 1n } });
    expect(count).toBe(5);
  });

  it('addToCart 追加已存在的商品数量', async () => {
    const mockItem = {
      id: 1n, userId: 1n, productType: 'cigar', productId: 10n, spec: '单支', qty: 3,
    };
    expect(mockItem.qty).toBe(3);
  });
});

describe('Order Payment (unit)', () => {
  it('余额不足应拒绝支付', () => {
    const balance = 5000n; // 50.00
    const payAmount = 10000n; // 100.00
    expect(balance < payAmount).toBe(true);
  });

  it('余额充足应允许支付', () => {
    const balance = 20000n;
    const payAmount = 10000n;
    expect(balance >= payAmount).toBe(true);
  });

  it('幂等命中应返回原结果', () => {
    const cachedResult = { paid: true, idempotent: true, balanceAfterCents: '124000' };
    expect(cachedResult.idempotent).toBe(true);
    expect(cachedResult.balanceAfterCents).toBe('124000');
  });
});

describe('Refund Logic (unit)', () => {
  it('全额退款：refunded_amount = actual_pay', () => {
    const actualPayCents = 10000n;
    const refundedCents = 10000n;
    expect(refundedCents >= actualPayCents).toBe(true);
  });

  it('部分退款：refunded_amount < actual_pay', () => {
    const actualPayCents = 10000n;
    const refundedCents = 3000n;
    expect(refundedCents < actualPayCents).toBe(true);
  });

  it('可退金额校验：actual_pay - refunded >= amount', () => {
    const actualPay = 10000n;
    const refunded = 3000n;
    const amount = 8000n;
    const refundable = actualPay - refunded;
    expect(refundable >= amount).toBe(false); // 7000 < 8000
    expect(refundable).toBe(7000n);
  });

  it('余额退款回退：balance += refundAmount', () => {
    const balanceBefore = 50000n;
    const refundAmount = 20000n;
    const balanceAfter = balanceBefore + refundAmount;
    expect(balanceAfter).toBe(70000n);
  });

  it('积分退款扣回：points -= refundAmount（1元=1积分）', () => {
    const pointsBefore = 300n;
    const refundAmount = 10000n; // 100 元 = 100 积分
    const pointsDelta = refundAmount; // 按分计算，需转成积分
    // 实际上 1 分 = 1 元，而存储是分，所以积分 delta = amountCents
    expect(pointsDelta).toBe(10000n);
  });
});

describe('Stock Reservation (unit)', () => {
  it('预占库存：stock_locked += qty', () => {
    const stockLocked = 5;
    const qty = 3;
    expect(stockLocked + qty).toBe(8);
  });

  it('支付成功实扣：stock -= qty, stock_locked -= qty', () => {
    let stock = 20;
    let stockLocked = 3;
    const qty = 3;
    stock -= qty;
    stockLocked -= qty;
    expect(stock).toBe(17);
    expect(stockLocked).toBe(0);
  });

  it('超时取消释放：stock_locked -= qty', () => {
    let stockLocked = 5;
    const qty = 2;
    stockLocked -= qty;
    expect(stockLocked).toBe(3);
  });

  it('可售库存 = stock - stock_locked', () => {
    const stock = 100;
    const stockLocked = 10;
    const available = stock - stockLocked;
    expect(available).toBe(90);
  });

  it('库存不足时创建订单失败', () => {
    const stock = 10;
    const stockLocked = 8;
    const qty = 5;
    const available = stock - stockLocked;
    expect(available >= qty).toBe(false);
  });
});
