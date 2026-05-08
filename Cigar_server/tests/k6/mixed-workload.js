// CigarPro k6 压测 — 混合负载场景
// 模拟真实用户行为：浏览 → 加购 → 下单 → 支付 → 查看订单
// 验证系统在混合负载下的整体表现
//
// 使用方式：
//   k6 run -e BASE_URL=http://localhost:3000 -e TEST_TOKEN=xxx mixed-workload.js

import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';
import {
  BASE_URL, API_PREFIX, authHeaders, idempotencyKey,
  TEST_CIGAR_ID, LOAD_OPTIONS,
} from './common.js';

export const options = {
  ...LOAD_OPTIONS,
  thresholds: {
    ...LOAD_OPTIONS.thresholds,
    // 额外业务指标阈值
    'http_req_duration{name:cigar-list}': ['p(95)<300'],
    'http_req_duration{name:add-cart}': ['p(95)<500'],
    'http_req_duration{name:create-order}': ['p(95)<800'],
    'http_req_duration{name:pay-order}': ['p(95)<1000'],
  },
};

const TOKEN = __ENV.TEST_TOKEN || 'test_token';

export default function () {
  const headers = authHeaders(TOKEN);

  // 用户行为权重分配（模拟真实比例）
  const action = Math.random();

  if (action < 0.30) {
    // 30% — 浏览商品列表
    browseCigars(headers);
  } else if (action < 0.50) {
    // 20% — 查看商品详情
    viewCigarDetail(headers);
  } else if (action < 0.65) {
    // 15% — 加入购物车
    addToCart(headers);
  } else if (action < 0.80) {
    // 15% — 查看购物车
    viewCart(headers);
  } else if (action < 0.90) {
    // 10% — 查看订单列表
    viewOrders(headers);
  } else if (action < 0.97) {
    // 7% — 创建订单 + 支付（核心交易）
    createAndPayOrder(headers);
  } else {
    // 3% — 查看会员信息
    viewProfile(headers);
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s 思考时间
}

function browseCigars(headers) {
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/cigars?page=1&pageSize=20`,
    { headers, tags: { name: 'cigar-list' } },
  );
  check(res, { 'cigar list OK': (r) => r.status === 200 });
}

function viewCigarDetail(headers) {
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/cigars/${TEST_CIGAR_ID}`,
    { headers, tags: { name: 'cigar-detail' } },
  );
  check(res, { 'cigar detail OK': (r) => r.status === 200 });
}

function addToCart(headers) {
  const payload = JSON.stringify({
    productType: 'cigar',
    productId: Number(TEST_CIGAR_ID),
    qty: 1,
  });
  const res = http.post(
    `${BASE_URL}${API_PREFIX}/cart/add`,
    payload,
    { headers, tags: { name: 'add-cart' } },
  );
  check(res, { 'add cart OK': (r) => r.status === 201 || r.status === 200 });
}

function viewCart(headers) {
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/cart`,
    { headers, tags: { name: 'view-cart' } },
  );
  check(res, { 'view cart OK': (r) => r.status === 200 });
}

function viewOrders(headers) {
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/orders?page=1&pageSize=10`,
    { headers, tags: { name: 'order-list' } },
  );
  check(res, { 'order list OK': (r) => r.status === 200 });
}

function createAndPayOrder(headers) {
  const ikey = idempotencyKey();

  // 创建订单
  const createPayload = JSON.stringify({
    items: [{ productType: 'cigar', productId: Number(TEST_CIGAR_ID), qty: 1 }],
  });
  const createRes = http.post(
    `${BASE_URL}${API_PREFIX}/orders`,
    createPayload,
    { headers: { ...headers, 'Idempotency-Key': ikey }, tags: { name: 'create-order' } },
  );

  const createBody = createRes.json() || {};
  if (createBody.data?.orderId) {
    // 支付
    const payRes = http.post(
      `${BASE_URL}${API_PREFIX}/orders/${createBody.data.orderId}/pay`,
      '{}',
      { headers, tags: { name: 'pay-order' } },
    );
    check(payRes, { 'pay OK': (r) => r.status === 200 });
  }
}

function viewProfile(headers) {
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/member/profile`,
    { headers, tags: { name: 'member-profile' } },
  );
  check(res, { 'profile OK': (r) => r.status === 200 });
}
