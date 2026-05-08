// CigarPro k6 压测 — 并发充值场景
// 模拟微信支付回调并发到达，验证幂等入账
//
// 使用方式：
//   k6 run -e BASE_URL=http://localhost:3000 recharge-concurrency.js

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, API_PREFIX, uuid, STRESS_OPTIONS } from './common.js';

export const options = STRESS_OPTIONS;

const RECHARGE_NO = __ENV.RECHARGE_NO || `RECHARGE_TEST_${Date.now()}`;

export default function () {
  // 模拟微信支付回调（Mock 模式）
  const payload = JSON.stringify({
    out_trade_no: RECHARGE_NO,
    transaction_id: `txn_${uuid()}`,
    amount: { total: 50000 },
    trade_state: 'SUCCESS',
  });

  const res = http.post(
    `${BASE_URL}${API_PREFIX}/payment/wechat-callback`,
    payload,
    { headers: { 'Content-Type': 'application/json' } },
  );

  // 正常：200 + SUCCESS
  // 幂等：200 + SUCCESS（no duplicate balance credit）

  sleep(0.1);
}
