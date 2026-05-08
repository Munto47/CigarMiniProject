// CigarPro k6 压测 — 管理后台负载场景
// 模拟管理员操作：Dashboard、订单管理、会员查询等
//
// 使用方式：
//   k6 run -e BASE_URL=http://localhost:3000 -e ADMIN_TOKEN=xxx admin-workload.js

import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';
import { BASE_URL, API_PREFIX, authHeaders, LOAD_OPTIONS } from './common.js';

export const options = LOAD_OPTIONS;

const TOKEN = __ENV.ADMIN_TOKEN || 'admin_token';

export default function () {
  const headers = authHeaders(TOKEN);
  const action = Math.random();

  if (action < 0.25) {
    // 25% — Dashboard 概览
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/dashboard/overview`, { headers });
    check(res, { 'dashboard OK': (r) => r.status === 200 });
  } else if (action < 0.45) {
    // 20% — 订单列表
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/orders?page=1&pageSize=20`, { headers });
    check(res, { 'order list OK': (r) => r.status === 200 });
  } else if (action < 0.60) {
    // 15% — 会员列表
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/members?page=1&pageSize=20`, { headers });
    check(res, { 'member list OK': (r) => r.status === 200 });
  } else if (action < 0.75) {
    // 15% — 商品列表
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/products/cigars?page=1&pageSize=20`, { headers });
    check(res, { 'product list OK': (r) => r.status === 200 });
  } else if (action < 0.88) {
    // 13% — 数据统计
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/statistics/sales?days=30`, { headers });
    check(res, { 'stats OK': (r) => r.status === 200 });
  } else {
    // 12% — 操作日志
    const res = http.get(`${BASE_URL}${API_PREFIX}/admin/settings/logs?page=1&pageSize=20`, { headers });
    check(res, { 'logs OK': (r) => r.status === 200 });
  }

  sleep(Math.random() * 3 + 1); // 1-4s
}
