// CigarPro k6 压测 — 并发支付场景
// 模拟同一用户同时发起多次支付请求，验证幂等防御
//
// 使用方式：
//   k6 run -e BASE_URL=http://localhost:3000 -e TEST_TOKEN=xxx -e ORDER_ID=1 payment-concurrency.js

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, API_PREFIX, authHeaders, SPIKE_OPTIONS } from './common.js';

export const options = SPIKE_OPTIONS;

const TOKEN = __ENV.TEST_TOKEN || 'test_token';
const ORDER_ID = __ENV.ORDER_ID || '1';

export default function () {
  const headers = authHeaders(TOKEN);

  // 并发支付同一笔订单
  const payRes = http.post(
    `${BASE_URL}${API_PREFIX}/orders/${ORDER_ID}/pay`,
    '{}',
    { headers },
  );

  const body = payRes.json() || {};

  // 正常：200 + 幂等命中（idempotent: true）或首次成功
  // 异常：409（并发锁冲突）或 422（状态不允许）
  // 不可接受：同一订单被成功支付两次

  sleep(0.05);
}
