import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;

  // ---- HTTP metrics ----
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;

  // ---- Business: orders ----
  readonly ordersCreatedTotal: client.Counter<string>;
  readonly ordersPaidTotal: client.Counter<string>;
  readonly ordersCancelledTotal: client.Counter<string>;
  readonly ordersRefundedTotal: client.Counter<string>;

  // ---- Business: payment ----
  readonly rechargesCompletedTotal: client.Counter<string>;
  readonly paymentCallbacksReceivedTotal: client.Counter<string>;
  readonly paymentCallbackVerifyFailedTotal: client.Counter<string>;
  readonly refundsFailedTotal: client.Counter<string>;

  // ---- Business: member ----
  readonly levelChangesTotal: client.Counter<string>;

  // ---- Node.js runtime ----
  readonly nodejsEventLoopLag: client.Gauge<string>;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register, prefix: 'cigarpro_' });

    // --- HTTP ---
    this.httpRequestsTotal = new client.Counter({
      name: 'cigarpro_http_requests_total',
      help: 'HTTP 请求总数',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'cigarpro_http_request_duration_seconds',
      help: 'HTTP 请求耗时（秒）',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    // --- Orders ---
    this.ordersCreatedTotal = new client.Counter({
      name: 'cigarpro_orders_created_total',
      help: '订单创建总数',
      labelNames: ['pay_method'],
      registers: [this.register],
    });

    this.ordersPaidTotal = new client.Counter({
      name: 'cigarpro_orders_paid_total',
      help: '订单支付成功总数',
      labelNames: ['channel'],
      registers: [this.register],
    });

    this.ordersCancelledTotal = new client.Counter({
      name: 'cigarpro_orders_cancelled_total',
      help: '订单取消总数',
      labelNames: ['reason'],
      registers: [this.register],
    });

    this.ordersRefundedTotal = new client.Counter({
      name: 'cigarpro_orders_refunded_total',
      help: '订单退款总数',
      labelNames: ['channel'],
      registers: [this.register],
    });

    // --- Payment ---
    this.rechargesCompletedTotal = new client.Counter({
      name: 'cigarpro_recharges_completed_total',
      help: '充值完成总数',
      labelNames: ['tier_id'],
      registers: [this.register],
    });

    this.paymentCallbacksReceivedTotal = new client.Counter({
      name: 'cigarpro_payment_callbacks_received_total',
      help: '支付回调接收总数',
      labelNames: ['channel', 'is_replay'],
      registers: [this.register],
    });

    this.paymentCallbackVerifyFailedTotal = new client.Counter({
      name: 'cigarpro_payment_callback_verify_failed_total',
      help: '支付回调验签失败总数',
      labelNames: ['channel'],
      registers: [this.register],
    });

    this.refundsFailedTotal = new client.Counter({
      name: 'cigarpro_refunds_failed_total',
      help: '退款失败总数',
      labelNames: ['channel'],
      registers: [this.register],
    });

    // --- Member ---
    this.levelChangesTotal = new client.Counter({
      name: 'cigarpro_level_changes_total',
      help: '等级变更总数',
      labelNames: ['type', 'direction', 'trigger'],
      registers: [this.register],
    });

    // --- Node.js ---
    this.nodejsEventLoopLag = new client.Gauge({
      name: 'cigarpro_nodejs_event_loop_lag_seconds',
      help: 'Node.js 事件循环延迟（秒）',
      registers: [this.register],
    });

    this.startEventLoopMonitor();
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  async getContentType(): Promise<string> {
    return this.register.contentType;
  }

  /** 主动增加计数器 */
  incCounter(
    counter: client.Counter<string>,
    labels?: Record<string, string>,
    value = 1,
  ) {
    if (labels) {
      counter.inc(labels, value);
    } else {
      counter.inc(value);
    }
  }

  /** 记录 Histogram 观测值 */
  observeHistogram(
    histogram: client.Histogram<string>,
    value: number,
    labels?: Record<string, string>,
  ) {
    if (labels) {
      histogram.observe(labels, value);
    } else {
      histogram.observe(value);
    }
  }

  /** 设置 Gauge 值 */
  setGauge(gauge: client.Gauge<string>, value: number, labels?: Record<string, string>) {
    if (labels) {
      gauge.set(labels, value);
    } else {
      gauge.set(value);
    }
  }

  private startEventLoopMonitor() {
    let last = process.hrtime.bigint();
    setInterval(() => {
      const now = process.hrtime.bigint();
      const diff = Number(now - last) / 1e9;
      last = now;
      this.nodejsEventLoopLag.set(diff);
    }, 1000).unref();
  }
}
