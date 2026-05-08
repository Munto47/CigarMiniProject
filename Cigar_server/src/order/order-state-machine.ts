// 订单状态机 — 对应 Plan.md §5.1
// 所有状态变更必须经过此单一入口

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:   ['paid', 'settling', 'cancelled'],
  paid:      ['completed', 'refunding'],
  settling:  ['completed', 'refunding'],
  completed: ['refunding'],
  refunding: ['completed', 'refunded'],
  cancelled: [],  // 终态
  refunded:  [],  // 终态
};

export const STATUS_PAYABLE = ['pending'];
export const STATUS_CANCELLABLE = ['pending'];
export const STATUS_REFUNDABLE = ['paid', 'completed', 'refunding'];

export class OrderStateMachine {
  static canTransit(from: string, to: string): boolean {
    const allowed = ORDER_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static isTerminal(status: string): boolean {
    return ['cancelled', 'refunded'].includes(status);
  }

  static assertTransit(from: string, to: string): void {
    if (!OrderStateMachine.canTransit(from, to)) {
      throw new Error(`不允许从 ${from} 转换到 ${to}`);
    }
  }
}
