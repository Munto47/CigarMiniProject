// CigarPro k6 压测 — 共享工具
// 使用方式：k6 run -e BASE_URL=http://localhost:3000 inventory-rush.js

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_PREFIX = '/api';

// 测试用户（需预先 seed）
export const TEST_USERS = [
  { userId: '1', token: __ENV.TEST_TOKEN_1 || 'TEST_TOKEN_PLACEHOLDER' },
  { userId: '2', token: __ENV.TEST_TOKEN_2 || 'TEST_TOKEN_PLACEHOLDER' },
  { userId: '3', token: __ENV.TEST_TOKEN_3 || 'TEST_TOKEN_PLACEHOLDER' },
];

// 测试商品（需预先 seed）
export const TEST_CIGAR_ID = __ENV.TEST_CIGAR_ID || '1';

// 通用的 HTTP 请求头
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Request-Id': `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
}

// 生成幂等键
export function idempotencyKey() {
  return `${__VU}-${__ITER}-${Date.now()}`;
}

// 生成 UUID v4（简单版本）
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// k6 阈值配置模板
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

// k6 场景配置模板
export const SMOKE_OPTIONS = {
  thresholds: DEFAULT_THRESHOLDS,
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
    },
  },
};

export const LOAD_OPTIONS = {
  thresholds: DEFAULT_THRESHOLDS,
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '60s', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};

export const STRESS_OPTIONS = {
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '60s', target: 50 },
        { duration: '120s', target: 100 },
        { duration: '60s', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};

export const SPIKE_OPTIONS = {
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.10'],
  },
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 200 },
        { duration: '10s', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};
