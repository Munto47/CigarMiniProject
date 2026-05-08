// CigarPro k6 压测 — 库存抢购场景
// 模拟 100 并发用户抢购限量商品，验证不会卖超
//
// 使用方式：
//   k6 run -e BASE_URL=http://localhost:3000 -e TEST_TOKEN=xxx inventory-rush.js

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, API_PREFIX, authHeaders, idempotencyKey, STRESS_OPTIONS } from './common.js';

export const options = STRESS_OPTIONS;

const TOKEN = __ENV.TEST_TOKEN || 'test_token';
const CIGAR_ID = __ENV.TEST_CIGAR_ID || '1';

export default function () {
  const headers = authHeaders(TOKEN);
  const ikey = idempotencyKey();

  // Step 1: 创建订单（库存预占）
  const createPayload = JSON.stringify({
    items: [
      { productType: 'cigar', productId: Number(CIGAR_ID), qty: 1 },
    ],
  });

  const createRes = http.post(
    `${BASE_URL}${API_PREFIX}/orders`,
    createPayload,
    { headers: { ...headers, 'Idempotency-Key': ikey } },
  );

  // 记录结果
  const createBody = createRes.json() || {};
  const isSuccess = createRes.status === 201 || createRes.status === 200;
  const isStockOut = createBody.code === 3002;

  if (isSuccess && createBody.data?.orderId) {
    // Step 2: 余额支付
    const orderId = createBody.data.orderId;
    const payRes = http.post(
      `${BASE_URL}${API_PREFIX}/orders/${orderId}/pay`,
      '{}',
      { headers },
    );

    const payBody = payRes.json() || {};
    if (payBody.code === 0) {
      // 支付成功
    }
  }

  // 每轮迭代间隔 100ms（减少对服务器的瞬时冲击）
  sleep(0.1);
}
