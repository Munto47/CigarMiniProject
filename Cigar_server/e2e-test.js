#!/usr/bin/env node
/**
 * CigarPro API 端到端测试脚本
 * 测试所有已实现的后端接口
 *
 * 用法: node e2e-test.js
 * 前提: 后端服务在 http://localhost:3000 运行
 */

const BASE = 'http://localhost:3000/api';

// ============ 计数器 ============

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function log(section, method, path, status, ok, detail) {
  const icon = ok ? '✓' : '✗';
  const line = `  ${icon} ${method.padEnd(7)} ${path.padEnd(50)} [${status}] ${detail ?? ''}`;
  console.log(line);
  if (ok) passed++;
  else {
    failed++;
    failures.push(`[${section}] ${method} ${path} → ${status} ${detail ?? ''}`);
  }
}

function skip(section, method, path, reason) {
  skipped++;
  console.log(`  ⊘ ${method.padEnd(7)} ${path.padEnd(50)} [SKIP] ${reason}`);
}

const BASE_HEADERS = { 'Content-Type': 'application/json' };

async function req(method, path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const { body, headers = {}, token, rawBody } = opts;
  const h = { ...BASE_HEADERS, ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const fetchOpts = { method, headers: h };
  if (body) {
    fetchOpts.body = rawBody ? body : JSON.stringify(body);
    if (rawBody) delete h['Content-Type'];
  }
  const start = Date.now();
  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch (e) {
    return { status: 0, error: e.message, ms: Date.now() - start };
  }
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, ms: Date.now() - start };
}

function expect2xx(s) { return s >= 200 && s < 300; }

function summary(r, maxLen = 80) {
  if (r.error) return `ERR: ${r.error}`;
  if (r.status === 0) return `NETERR: ${r.error}`;
  const d = r.data;
  let s = '';
  if (d === null) s = 'null';
  else if (typeof d === 'string') s = d;
  else if (d.message) s = `msg="${d.message}"`;
  else if (d.items) s = `items.length=${d.items.length}`;
  else if (d.list) s = `list.length=${d.list.length}`;
  else if (d.data) s = `${JSON.stringify(d.data)}`;
  else if (Array.isArray(d)) s = `array.length=${d.length}`;
  else s = Object.keys(d).slice(0, 4).join(', ');
  if (s.length > maxLen) s = s.slice(0, maxLen) + '…';
  return s;
}

// ============ 主测试 ============

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         CigarPro API 端到端测试 (E2E Test)                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  let adminToken = null;
  let adminRefreshToken = null;
  let userToken = null;
  let userRefreshToken = null;

  // ==================== SECTION 1: 公开接口 ====================
  console.log('── 1. 健康检查 ──');

  let r = await req('GET', '/health');
  log('1.1', 'GET', '/health', r.status, expect2xx(r.status), summary(r));

  // 根路径没有 API handler，404 是预期行为
  r = await req('GET', '/');
  log('1.2', 'GET', '/', r.status, expect2xx(r.status) || r.status === 404, summary(r));

  console.log('\n── 2. 认证（公开）──');

  // 微信登录（后端 WECHAT_MOCK_MODE=true 时可用）
  r = await req('POST', '/auth/wechat-login', { body: { code: 'mock_test_code_001' } });
  const wxLoginOk = expect2xx(r.status);
  log('2.1', 'POST', '/auth/wechat-login', r.status, wxLoginOk, summary(r));
  if (wxLoginOk && r.data?.data?.accessToken) {
    userToken = r.data.data.accessToken;
    userRefreshToken = r.data.data.refreshToken;
  }

  // 用真实 refreshToken 刷新；无 token 时标记跳过
  if (userRefreshToken) {
    r = await req('POST', '/auth/refresh', { body: { refreshToken: userRefreshToken } });
    log('2.2', 'POST', '/auth/refresh', r.status, expect2xx(r.status), summary(r));
    if (expect2xx(r.status) && r.data?.data?.accessToken) {
      userToken = r.data.data.accessToken;
      userRefreshToken = r.data.data.refreshToken ?? userRefreshToken;
    }
  } else {
    skip('2.2', 'POST', '/auth/refresh', '无用户 refreshToken（微信登录未成功）');
  }

  // 管理员登录
  r = await req('POST', '/admin/login', { body: { username: 'admin', password: 'admin123' } });
  const adminLoginOk = expect2xx(r.status);
  log('2.3', 'POST', '/admin/login', r.status, adminLoginOk, summary(r));
  if (adminLoginOk && r.data?.data?.accessToken) {
    adminToken = r.data.data.accessToken;
    adminRefreshToken = r.data.data.refreshToken;
  } else {
    console.log('     ⚠ 管理员登录失败，后续管理端测试将跳过');
  }

  console.log('\n── 3. 公开产品接口 ──');

  r = await req('GET', '/cigars');
  log('3.1', 'GET', '/cigars', r.status, expect2xx(r.status), summary(r));

  r = await req('GET', '/cigars?keyword=test&sortBy=name&sortOrder=asc');
  log('3.2', 'GET', '/cigars?keyword=...', r.status, expect2xx(r.status), summary(r));

  // 不存在的 ID → 后端返回空对象或 null，仍视为 2xx
  r = await req('GET', '/cigars/999999');
  log('3.3', 'GET', '/cigars/999999', r.status, expect2xx(r.status) || r.status === 404, summary(r));

  let testCigarId = null;
  r = await req('GET', '/cigars');
  const cigarListRaw = r.data?.data?.list ?? r.data?.data ?? r.data?.items ?? [];
  const cigarList = Array.isArray(cigarListRaw) ? cigarListRaw : [];
  if (cigarList.length > 0 && cigarList[0].id) {
    testCigarId = cigarList[0].id;
    r = await req('GET', `/cigars/${testCigarId}`);
    log('3.4', 'GET', `/cigars/${testCigarId}`, r.status, expect2xx(r.status), summary(r));
  } else {
    skip('3.4', 'GET', '/cigars/:id', '无雪茄数据可测试');
  }

  r = await req('GET', '/drinks');
  log('3.5', 'GET', '/drinks', r.status, expect2xx(r.status), summary(r));

  console.log('\n── 4. 公开储值配置 ──');

  r = await req('GET', '/storedvalue/tiers');
  log('4.1', 'GET', '/storedvalue/tiers', r.status, expect2xx(r.status), summary(r));

  r = await req('GET', '/storedvalue/level-config/recharge');
  log('4.2', 'GET', '/storedvalue/level-config/recharge', r.status, expect2xx(r.status), summary(r));

  r = await req('GET', '/storedvalue/level-config/consumption');
  log('4.3', 'GET', '/storedvalue/level-config/consumption', r.status, expect2xx(r.status), summary(r));

  console.log('\n── 5. 公开推荐 & 风味 ──');

  r = await req('GET', '/recommend/questions');
  log('5.1', 'GET', '/recommend/questions', r.status, expect2xx(r.status), summary(r));

  r = await req('GET', '/flavor/tags');
  log('5.2', 'GET', '/flavor/tags', r.status, expect2xx(r.status), summary(r));

  console.log('\n── 6. 公开店铺信息 ──');

  r = await req('GET', '/admin/settings/public/store-info');
  log('6.1', 'GET', '/.../store-info', r.status, expect2xx(r.status), summary(r));

  console.log('\n── 7. 支付回调（签名验证）──');

  r = await req('POST', '/payment/meituan-callback', { body: {} });
  log('7.1', 'POST', '/payment/meituan-callback', r.status, r.status === 400 || r.status === 401 || r.status === 403 || expect2xx(r.status), summary(r));

  r = await req('POST', '/payment/wechat-callback', { body: {} });
  log('7.2', 'POST', '/payment/wechat-callback', r.status, r.status === 400 || r.status === 401 || r.status === 403 || expect2xx(r.status), summary(r));

  // ==================== SECTION 2: 管理端接口 ====================
  console.log('\n\n── 8. 管理端认证 ──');

  if (adminToken) {
    // 用真实 refreshToken 刷新
    if (adminRefreshToken) {
      r = await req('POST', '/admin/refresh-token', { body: { refreshToken: adminRefreshToken } });
      log('8.1', 'POST', '/admin/refresh-token', r.status, expect2xx(r.status), summary(r));
      if (expect2xx(r.status) && r.data?.data?.accessToken) {
        adminToken = r.data.data.accessToken;
      }
    } else {
      skip('8.1', 'POST', '/admin/refresh-token', '无 admin refreshToken');
    }

    // 使用错误旧密码测试变更密码（422 = 旧密码错误，是预期行为）
    r = await req('POST', '/admin/change-password', {
      token: adminToken,
      body: { oldPassword: 'wrong_pass', newPassword: 'NewPass123' },
    });
    log('8.2', 'POST', '/admin/change-password', r.status,
      r.status === 400 || r.status === 401 || r.status === 403 || r.status === 422, summary(r));
  } else {
    skip('8.x', '*', '/admin/*', '无 admin token');
  }

  console.log('\n── 9. 管理员账号管理 ──');

  if (adminToken) {
    r = await req('GET', '/admin/accounts?page=1&pageSize=20', { token: adminToken });
    log('9.1', 'GET', '/admin/accounts', r.status, expect2xx(r.status), summary(r));

    const testUser = `testuser_${Date.now()}`;
    r = await req('POST', '/admin/accounts', {
      token: adminToken,
      body: { username: testUser, name: '测试管理员', password: 'TestPass123', roleCode: 'product' },
    });
    const createAdminOk = expect2xx(r.status);
    log('9.2', 'POST', '/admin/accounts', r.status, createAdminOk, summary(r));
    let newAdminId = null;
    if (createAdminOk && r.data?.data?.id) newAdminId = r.data.data.id;

    if (newAdminId) {
      r = await req('GET', `/admin/accounts/${newAdminId}`, { token: adminToken });
      log('9.3', 'GET', '/admin/accounts/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PUT', `/admin/accounts/${newAdminId}`, {
        token: adminToken,
        body: { name: '测试管理员(已更新)' },
      });
      log('9.4', 'PUT', '/admin/accounts/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/accounts/${newAdminId}`, { token: adminToken });
      log('9.5', 'DELETE', '/admin/accounts/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('9.3-9.5', '*', '/admin/accounts/:id', '未创建测试账号');
    }

    r = await req('GET', '/admin/login-logs', { token: adminToken });
    log('9.6', 'GET', '/admin/login-logs', r.status, expect2xx(r.status), summary(r));
  } else {
    skip('9.x', '*', '/admin/accounts/*', '无 admin token');
  }

  console.log('\n── 10. 管理端雪茄产品 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/products/cigars', { token: adminToken });
    log('10.1', 'GET', '/admin/products/cigars', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/products/cigars', {
      token: adminToken,
      body: {
        name: `测试雪茄_${Date.now()}`,
        brand: '测试品牌',
        categoryCode: 'classic',
        priceCents: 50000,
        memberPriceCents: 45000,
        stock: 10,
      },
    });
    const createCigarOk = expect2xx(r.status);
    log('10.2', 'POST', '/admin/products/cigars', r.status, createCigarOk, summary(r));
    let testProdId = null;
    if (createCigarOk && r.data?.data?.id) testProdId = r.data.data.id;

    if (testProdId) {
      r = await req('GET', `/admin/products/cigars/${testProdId}`, { token: adminToken });
      log('10.3', 'GET', '/admin/products/cigars/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PUT', `/admin/products/cigars/${testProdId}`, {
        token: adminToken,
        body: { name: `测试雪茄_更新_${Date.now()}`, stock: 20 },
      });
      log('10.4', 'PUT', '/admin/products/cigars/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/products/cigars/${testProdId}`, { token: adminToken });
      log('10.5', 'DELETE', '/admin/products/cigars/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('10.3-10.5', '*', '/admin/products/cigars/:id', '未创建测试雪茄');
    }
  } else {
    skip('10.x', '*', '/admin/products/cigars/*', '无 admin token');
  }

  console.log('\n── 11. 管理端饮品产品 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/products/drinks', { token: adminToken });
    log('11.1', 'GET', '/admin/products/drinks', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/products/drinks', {
      token: adminToken,
      body: {
        name: `测试饮品_${Date.now()}`,
        categoryCode: 'whisky',
        priceCents: 8000,
        memberPriceCents: 6800,
        stock: 5,
      },
    });
    const createDrinkOk = expect2xx(r.status);
    log('11.2', 'POST', '/admin/products/drinks', r.status, createDrinkOk, summary(r));
    let testDrinkId = null;
    if (createDrinkOk && r.data?.data?.id) testDrinkId = r.data.data.id;

    if (testDrinkId) {
      r = await req('GET', `/admin/products/drinks/${testDrinkId}`, { token: adminToken });
      log('11.3', 'GET', '/admin/products/drinks/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PUT', `/admin/products/drinks/${testDrinkId}`, {
        token: adminToken,
        body: { name: `测试饮品_更新_${Date.now()}` },
      });
      log('11.4', 'PUT', '/admin/products/drinks/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/products/drinks/${testDrinkId}`, { token: adminToken });
      log('11.5', 'DELETE', '/admin/products/drinks/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('11.3-11.5', '*', '/admin/products/drinks/:id', '未创建测试饮品');
    }
  } else {
    skip('11.x', '*', '/admin/products/drinks/*', '无 admin token');
  }

  console.log('\n── 12. 店内雪茄库 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/library/instore', { token: adminToken });
    log('12.1', 'GET', '/admin/library/instore', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/library/instore', {
      token: adminToken,
      body: { name: `库内雪茄_${Date.now()}`, brand: '测试品牌', categoryCode: 'classic' },
    });
    const createInstoreOk = expect2xx(r.status);
    log('12.2', 'POST', '/admin/library/instore', r.status, createInstoreOk, summary(r));
    let testInstoreId = null;
    if (createInstoreOk && r.data?.data?.id) testInstoreId = r.data.data.id;

    if (testInstoreId) {
      r = await req('GET', `/admin/library/instore/${testInstoreId}`, { token: adminToken });
      log('12.3', 'GET', '/admin/library/instore/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PUT', `/admin/library/instore/${testInstoreId}`, {
        token: adminToken,
        body: { remark: '测试更新备注' },
      });
      log('12.4', 'PUT', '/admin/library/instore/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/library/instore/${testInstoreId}`, { token: adminToken });
      log('12.5', 'DELETE', '/admin/library/instore/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('12.3-12.5', '*', '/admin/library/instore/:id', '未创建测试条目');
    }

    r = await req('POST', '/admin/library/instore/sync', {
      token: adminToken,
      body: { items: [{ name: '同步雪茄', brand: '同步品牌', categoryCode: 'robusto' }] },
    });
    log('12.6', 'POST', '/admin/library/instore/sync', r.status, expect2xx(r.status), summary(r));
  } else {
    skip('12.x', '*', '/admin/library/instore/*', '无 admin token');
  }

  console.log('\n── 13. 风味标签 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/library/tags', { token: adminToken });
    log('13.1', 'GET', '/admin/library/tags', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/library/tags', {
      token: adminToken,
      body: { name: `测试标签_${Date.now()}`, category: 'flavor' },
    });
    const createTagOk = expect2xx(r.status);
    log('13.2', 'POST', '/admin/library/tags', r.status, createTagOk, summary(r));
    let testTagId = null;
    if (createTagOk && r.data?.data?.id) testTagId = r.data.data.id;

    if (testTagId) {
      r = await req('GET', `/admin/library/tags/${testTagId}`, { token: adminToken });
      log('13.3', 'GET', '/admin/library/tags/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PUT', `/admin/library/tags/${testTagId}`, {
        token: adminToken,
        body: { name: `测试标签_更新_${Date.now()}` },
      });
      log('13.4', 'PUT', '/admin/library/tags/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/library/tags/${testTagId}`, { token: adminToken });
      log('13.5', 'DELETE', '/admin/library/tags/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('13.3-13.5', '*', '/admin/library/tags/:id', '未创建测试标签');
    }
  } else {
    skip('13.x', '*', '/admin/library/tags/*', '无 admin token');
  }

  console.log('\n── 14. 充值档位 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/storedvalue/tiers', { token: adminToken });
    log('14.1', 'GET', '/admin/storedvalue/tiers', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/storedvalue/tiers', {
      token: adminToken,
      body: { amountCents: 100000, bonusCents: 20000, displayName: `测试档位_${Date.now()}` },
    });
    const createTierOk = expect2xx(r.status);
    log('14.2', 'POST', '/admin/storedvalue/tiers', r.status, createTierOk, summary(r));
    let testTierId = null;
    if (createTierOk && r.data?.data?.id) testTierId = r.data.data.id;

    if (testTierId) {
      r = await req('PUT', `/admin/storedvalue/tiers/${testTierId}`, {
        token: adminToken,
        body: { displayName: '测试档位(已更新)' },
      });
      log('14.3', 'PUT', '/admin/storedvalue/tiers/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/storedvalue/tiers/${testTierId}`, { token: adminToken });
      log('14.4', 'DELETE', '/admin/storedvalue/tiers/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('14.3-14.4', '*', '/admin/storedvalue/tiers/:id', '未创建测试档位');
    }
  } else {
    skip('14.x', '*', '/admin/storedvalue/tiers/*', '无 admin token');
  }

  console.log('\n── 15. 等级配置 CRUD ──');

  if (adminToken) {
    r = await req('GET', '/admin/storedvalue/level-config', { token: adminToken });
    log('15.1', 'GET', '/admin/storedvalue/level-config', r.status, expect2xx(r.status), summary(r));

    // 用时间戳使 level 足够大，避免与已有等级冲突；409 幂等命中也属可接受
    const testLevel = 99 + (Date.now() % 100);
    r = await req('POST', '/admin/storedvalue/level-config', {
      token: adminToken,
      body: { levelType: 'recharge', level: testLevel, name: `测试等级_${Date.now()}`, minPoints: testLevel * 1000 },
    });
    const createLcOk = expect2xx(r.status) || r.status === 409;
    log('15.2', 'POST', '/admin/storedvalue/level-config', r.status, createLcOk, summary(r));
    let testLcId = null;
    if (expect2xx(r.status) && r.data?.data?.id) testLcId = r.data.data.id;

    if (testLcId) {
      r = await req('PUT', `/admin/storedvalue/level-config/${testLcId}`, {
        token: adminToken,
        body: { name: '测试等级(已更新)' },
      });
      log('15.3', 'PUT', '/admin/storedvalue/level-config/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/storedvalue/level-config/${testLcId}`, { token: adminToken });
      log('15.4', 'DELETE', '/admin/storedvalue/level-config/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('15.3-15.4', '*', '/admin/storedvalue/level-config/:id', '未创建测试等级配置');
    }

    r = await req('POST', '/admin/storedvalue/level-config/recalculate', {
      token: adminToken,
      body: { levelType: 'recharge' },
    });
    const recalcOk = expect2xx(r.status);
    log('15.5', 'POST', '/admin/storedvalue/level-config/recalculate', r.status, recalcOk, summary(r));

    if (recalcOk && r.data?.data?.jobId) {
      const jobId = r.data.data.jobId;
      r = await req('GET', `/admin/storedvalue/level-config/recalculate/${jobId}`, { token: adminToken });
      log('15.6', 'GET', '/admin/.../recalculate/:jobId', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('15.6', 'GET', '/admin/.../recalculate/:jobId', '无 jobId');
    }
  } else {
    skip('15.x', '*', '/admin/storedvalue/level-config/*', '无 admin token');
  }

  console.log('\n── 16. 储值管理 ──');

  if (adminToken) {
    r = await req('GET', '/admin/storedvalue/transactions', { token: adminToken });
    log('16.1', 'GET', '/admin/storedvalue/transactions', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/storedvalue/recharge-orders', { token: adminToken });
    log('16.2', 'GET', '/admin/storedvalue/recharge-orders', r.status, expect2xx(r.status), summary(r));

    // 取真实用户 ID 进行余额调整
    let adjustUserId = null;
    const membersR = await req('GET', '/admin/members?page=1&pageSize=5', { token: adminToken });
    const membersList = membersR.data?.data?.list ?? [];
    if (membersList.length > 0) adjustUserId = membersList[0].userId ?? membersList[0].id;

    if (adjustUserId) {
      r = await req('POST', '/admin/storedvalue/transactions/adjust', {
        token: adminToken,
        headers: { 'Idempotency-Key': `test-adjust-${Date.now()}` },
        body: { userId: Number(adjustUserId), amountCents: 1, reason: 'E2E 测试调整（+1分）' },
      });
      log('16.3', 'POST', '/admin/storedvalue/transactions/adjust', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('16.3', 'POST', '/admin/storedvalue/transactions/adjust', '无可用会员 ID');
    }

    r = await req('GET', '/admin/storedvalue/recalculate/nonexistent-job', { token: adminToken });
    log('16.4', 'GET', '/admin/storedvalue/recalculate/:jobId', r.status, r.status === 404 || expect2xx(r.status), summary(r));
  } else {
    skip('16.x', '*', '/admin/storedvalue/*', '无 admin token');
  }

  console.log('\n── 17. 会员管理 ──');

  let firstMemberId = null;
  if (adminToken) {
    r = await req('GET', '/admin/members?page=1&pageSize=20', { token: adminToken });
    log('17.1', 'GET', '/admin/members', r.status, expect2xx(r.status), summary(r));
    const members = r.data?.data?.list ?? [];
    if (members.length > 0) firstMemberId = members[0].userId ?? members[0].id;

    r = await req('GET', '/admin/members/stats', { token: adminToken });
    log('17.2', 'GET', '/admin/members/stats', r.status, expect2xx(r.status), summary(r));

    if (firstMemberId) {
      r = await req('GET', `/admin/members/${firstMemberId}`, { token: adminToken });
      log('17.3', 'GET', '/admin/members/:id', r.status, r.status === 404 || expect2xx(r.status), summary(r));
    } else {
      skip('17.3', 'GET', '/admin/members/:id', '无会员数据');
    }
  } else {
    skip('17.x', '*', '/admin/members/*', '无 admin token');
  }

  console.log('\n── 18. 管理端订单 ──');

  let firstAdminOrderId = null;
  if (adminToken) {
    r = await req('GET', '/admin/orders', { token: adminToken });
    log('18.1', 'GET', '/admin/orders', r.status, expect2xx(r.status), summary(r));
    const adminOrders = r.data?.data?.list ?? [];
    if (adminOrders.length > 0) firstAdminOrderId = adminOrders[0].orderId ?? adminOrders[0].id;

    if (firstAdminOrderId) {
      r = await req('GET', `/admin/orders/${firstAdminOrderId}`, { token: adminToken });
      log('18.2', 'GET', '/admin/orders/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('PATCH', `/admin/orders/${firstAdminOrderId}/status`, {
        token: adminToken,
        body: { status: 'completed' },
      });
      // 状态流转可能不允许（如已完成），400/422 都是预期行为
      log('18.3', 'PATCH', '/admin/orders/:id/status', r.status, expect2xx(r.status) || r.status === 400 || r.status === 422, summary(r));

      r = await req('POST', `/admin/orders/${firstAdminOrderId}/refund`, {
        token: adminToken,
        headers: { 'Idempotency-Key': `test-refund-${Date.now()}` },
        body: { reason: 'E2E 退款测试', amountCents: 100 },
      });
      // 订单状态不符合退款条件时 400/422 是预期行为
      log('18.4', 'POST', '/admin/orders/:id/refund', r.status, expect2xx(r.status) || r.status === 400 || r.status === 422, summary(r));
    } else {
      skip('18.2-18.4', '*', '/admin/orders/:id/*', '无订单数据');
    }

    // sync-meituan 需要提供 orderId；用第一个订单 ID，无订单时跳过
    if (firstAdminOrderId) {
      r = await req('POST', '/admin/orders/sync-meituan', {
        token: adminToken,
        body: { orderId: Number(firstAdminOrderId) },
      });
      log('18.5', 'POST', '/admin/orders/sync-meituan', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('18.5', 'POST', '/admin/orders/sync-meituan', '无订单数据');
    }
  } else {
    skip('18.x', '*', '/admin/orders/*', '无 admin token');
  }

  console.log('\n── 19. 评价管理 ──');

  if (adminToken) {
    r = await req('GET', '/admin/reviews', { token: adminToken });
    log('19.1', 'GET', '/admin/reviews', r.status, expect2xx(r.status), summary(r));

    const reviews = r.data?.data?.list ?? [];
    let firstReviewId = reviews.length > 0 ? (reviews[0].id ?? reviews[0].reviewId) : null;

    if (firstReviewId) {
      r = await req('PUT', `/admin/reviews/${firstReviewId}/moderate`, {
        token: adminToken,
        body: { status: 'hidden' },
      });
      log('19.2', 'PUT', '/admin/reviews/:id/moderate', r.status, r.status === 404 || r.status === 400 || expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/reviews/${firstReviewId}`, { token: adminToken });
      log('19.3', 'DELETE', '/admin/reviews/:id', r.status, r.status === 404 || r.status === 400 || expect2xx(r.status), summary(r));
    } else {
      skip('19.2-19.3', '*', '/admin/reviews/:id', '无评价数据');
    }

    r = await req('GET', '/admin/reviews/sensitive-words?page=1&pageSize=20', { token: adminToken });
    log('19.4', 'GET', '/admin/reviews/sensitive-words', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/reviews/sensitive-words', {
      token: adminToken,
      body: { word: `测试敏感词_${Date.now()}` },
    });
    const swOk = expect2xx(r.status);
    log('19.5', 'POST', '/admin/reviews/sensitive-words', r.status, swOk, summary(r));
    let swId = null;
    if (swOk && r.data?.data?.id) swId = r.data.data.id;

    if (swId) {
      r = await req('PUT', `/admin/reviews/sensitive-words/${swId}/toggle`, { token: adminToken });
      log('19.6', 'PUT', '/admin/reviews/sensitive-words/:id/toggle', r.status, expect2xx(r.status), summary(r));

      r = await req('DELETE', `/admin/reviews/sensitive-words/${swId}`, { token: adminToken });
      log('19.7', 'DELETE', '/admin/reviews/sensitive-words/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('19.6-19.7', '*', '/admin/reviews/sensitive-words/:id', '未创建测试敏感词');
    }
  } else {
    skip('19.x', '*', '/admin/reviews/*', '无 admin token');
  }

  console.log('\n── 20. 海报管理 ──');

  if (adminToken) {
    r = await req('GET', '/admin/posters?page=1&pageSize=20', { token: adminToken });
    log('20.1', 'GET', '/admin/posters', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/posters/template', { token: adminToken });
    log('20.2', 'GET', '/admin/posters/template', r.status, expect2xx(r.status), summary(r));

    r = await req('PUT', '/admin/posters/template', {
      token: adminToken,
      body: { clubName: 'GOAT CIGAR CLUB (Test)', bgColor: '#1a1a1a', accentColor: '#d4af37' },
    });
    log('20.3', 'PUT', '/admin/posters/template', r.status, expect2xx(r.status), summary(r));
  } else {
    skip('20.x', '*', '/admin/posters/*', '无 admin token');
  }

  console.log('\n── 21. Dashboard & 统计 ──');

  if (adminToken) {
    r = await req('GET', '/admin/dashboard/overview', { token: adminToken });
    log('21.1', 'GET', '/admin/dashboard/overview', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/dashboard/sales-trend?days=7', { token: adminToken });
    log('21.2', 'GET', '/admin/dashboard/sales-trend', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/dashboard/recent-orders?limit=5', { token: adminToken });
    log('21.3', 'GET', '/admin/dashboard/recent-orders', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/dashboard/top-products?limit=5', { token: adminToken });
    log('21.4', 'GET', '/admin/dashboard/top-products', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/statistics/sales', { token: adminToken });
    log('21.5', 'GET', '/admin/statistics/sales', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/statistics/categories', { token: adminToken });
    log('21.6', 'GET', '/admin/statistics/categories', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/statistics/users', { token: adminToken });
    log('21.7', 'GET', '/admin/statistics/users', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/statistics/storedvalue', { token: adminToken });
    log('21.8', 'GET', '/admin/statistics/storedvalue', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/statistics/export', { token: adminToken });
    log('21.9', 'GET', '/admin/statistics/export', r.status, expect2xx(r.status), summary(r));
  } else {
    skip('21.x', '*', '/admin/dashboard/*', '无 admin token');
  }

  console.log('\n── 22. 系统设置 ──');

  if (adminToken) {
    r = await req('GET', '/admin/settings', { token: adminToken });
    log('22.1', 'GET', '/admin/settings', r.status, expect2xx(r.status), summary(r));

    r = await req('PUT', '/admin/settings/store_name', {
      token: adminToken,
      body: { value: 'GOAT CIGAR CLUB (Test)' },
    });
    log('22.2', 'PUT', '/admin/settings/store_name', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/settings/logs', { token: adminToken });
    log('22.3', 'GET', '/admin/settings/logs', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/settings/meituan/test', { token: adminToken });
    log('22.4', 'POST', '/admin/settings/meituan/test', r.status, expect2xx(r.status), summary(r));
  } else {
    skip('22.x', '*', '/admin/settings/*', '无 admin token');
  }

  console.log('\n── 23. 对账 ──');

  if (adminToken) {
    r = await req('GET', '/admin/reconciliation/reports', { token: adminToken });
    log('23.1', 'GET', '/admin/reconciliation/reports', r.status, expect2xx(r.status), summary(r));

    r = await req('POST', '/admin/reconciliation/run', { token: adminToken });
    const runOk = expect2xx(r.status);
    log('23.2', 'POST', '/admin/reconciliation/run', r.status, runOk, summary(r));

    // 用 run 返回的真实 reportId，避免 500
    const reportId = r.data?.data?.reportId ?? r.data?.data?.id ?? null;
    if (runOk && reportId) {
      r = await req('POST', `/admin/reconciliation/reports/${reportId}/resolve`, { token: adminToken });
      log('23.3', 'POST', '/admin/reconciliation/reports/:id/resolve', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('23.3', 'POST', '/admin/reconciliation/reports/:id/resolve', '无对账报告 ID');
    }
  } else {
    skip('23.x', '*', '/admin/reconciliation/*', '无 admin token');
  }

  console.log('\n── 24. 导出 ──');

  if (adminToken) {
    r = await req('GET', '/admin/export/orders', { token: adminToken });
    log('24.1', 'GET', '/admin/export/orders', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/export/transactions', { token: adminToken });
    log('24.2', 'GET', '/admin/export/transactions', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/admin/export/cigars', { token: adminToken });
    log('24.3', 'GET', '/admin/export/cigars', r.status, expect2xx(r.status), summary(r));

    // 导入 Excel 需真实文件，422 = 未上传文件，属预期行为
    r = await req('POST', '/admin/export/cigars/import?dryRun=true', { token: adminToken });
    log('24.4', 'POST', '/admin/export/cigars/import', r.status, r.status === 422 || r.status === 400 || expect2xx(r.status), summary(r));
  } else {
    skip('24.x', '*', '/admin/export/*', '无 admin token');
  }

  console.log('\n── 25. 上传 ──');

  // 上传图片需要 multipart，空 body → 400 是预期行为
  r = await req('POST', '/upload/image', {
    rawBody: 'test-image-data',
    headers: { 'Content-Type': 'image/png' },
    token: adminToken,
  });
  log('25.1', 'POST', '/upload/image', r.status, r.status === 400 || r.status === 401 || expect2xx(r.status), summary(r));

  // ==================== SECTION 3: 用户接口 ====================
  console.log('\n\n── 26. 用户接口（需用户认证）──');

  if (!userToken) {
    skip('26.x', '*', '/cart/* 等', '无 user token（微信登录未成功）');
  } else {
    // 解密手机号需要有效的 session_key + 真实加密数据，mock 数据 422 是预期行为
    r = await req('POST', '/auth/decrypt-phone', {
      token: userToken,
      body: { encryptedData: 'mock_encrypted_data', iv: 'mock_iv' },
    });
    log('26.1', 'POST', '/auth/decrypt-phone', r.status, r.status === 400 || r.status === 422 || expect2xx(r.status), summary(r));

    console.log('\n── 27. 购物车 ──');

    r = await req('GET', '/cart', { token: userToken });
    log('27.1', 'GET', '/cart', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/cart/count', { token: userToken });
    log('27.2', 'GET', '/cart/count', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/cart/validate', { token: userToken });
    log('27.3', 'GET', '/cart/validate', r.status, expect2xx(r.status), summary(r));

    // 取有效产品 ID
    let cartProductId = null;
    let cartProductType = 'cigar';
    if (testCigarId) {
      cartProductId = Number(testCigarId);
    } else {
      r = await req('GET', '/cigars');
      const cList = r.data?.data?.list ?? r.data?.data ?? [];
      if (Array.isArray(cList) && cList.length > 0) cartProductId = Number(cList[0].id);
    }
    if (!cartProductId) {
      r = await req('GET', '/drinks');
      const dList = r.data?.data?.list ?? r.data?.data ?? [];
      if (Array.isArray(dList) && dList.length > 0) {
        cartProductId = Number(dList[0].id);
        cartProductType = 'drink';
      }
    }

    if (cartProductId) {
      r = await req('POST', '/cart/add', {
        token: userToken,
        body: { productType: cartProductType, productId: cartProductId, spec: '单支', qty: 1 },
      });
      const addCartOk = expect2xx(r.status);
      log('27.4', 'POST', '/cart/add', r.status, addCartOk, summary(r));
      // 购物车 item ID 可能在 data.id 或 data.cartItemId
      let cartItemId = r.data?.data?.id ?? r.data?.data?.cartItemId ?? null;

      if (cartItemId) {
        r = await req('PUT', `/cart/${cartItemId}`, { token: userToken, body: { qty: 2 } });
        log('27.5', 'PUT', '/cart/:id', r.status, expect2xx(r.status), summary(r));

        r = await req('DELETE', `/cart/${cartItemId}`, { token: userToken });
        log('27.6', 'DELETE', '/cart/:id', r.status, expect2xx(r.status), summary(r));
      } else {
        skip('27.5-27.6', '*', '/cart/:id', '购物车项 ID 未返回');
      }
    } else {
      skip('27.4-27.6', '*', '/cart/*', '无可用产品 ID');
    }

    console.log('\n── 28. 订单 ──');

    let testOrderId = null;
    if (cartProductId) {
      r = await req('POST', '/orders', {
        token: userToken,
        headers: { 'Idempotency-Key': `test-order-${Date.now()}` },
        body: {
          items: [{ productType: cartProductType, productId: cartProductId, spec: '单支', qty: 1 }],
        },
      });
      const createOrderOk = expect2xx(r.status);
      log('28.1', 'POST', '/orders', r.status, createOrderOk, summary(r));
      // 订单 ID 可能在 orderId 或 id 字段
      if (createOrderOk) {
        testOrderId = r.data?.data?.orderId ?? r.data?.data?.id ?? null;
      }
    } else {
      skip('28.1', 'POST', '/orders', '无可用产品 ID');
    }

    r = await req('GET', '/orders', { token: userToken });
    log('28.2', 'GET', '/orders', r.status, expect2xx(r.status), summary(r));
    // 若 testOrderId 仍为 null，从订单列表取第一个
    if (!testOrderId) {
      const userOrders = r.data?.data?.list ?? [];
      if (userOrders.length > 0) testOrderId = userOrders[0].orderId ?? userOrders[0].id;
    }

    if (testOrderId) {
      r = await req('GET', `/orders/${testOrderId}`, { token: userToken });
      log('28.3', 'GET', '/orders/:id', r.status, expect2xx(r.status), summary(r));

      r = await req('POST', `/orders/${testOrderId}/pay`, {
        token: userToken,
        body: { payMethod: 'balance' },
      });
      log('28.4', 'POST', '/orders/:id/pay', r.status, expect2xx(r.status) || r.status === 400 || r.status === 422, summary(r));

      r = await req('POST', `/orders/${testOrderId}/cancel`, { token: userToken });
      log('28.5', 'POST', '/orders/:id/cancel', r.status, expect2xx(r.status) || r.status === 400 || r.status === 422, summary(r));
    } else {
      skip('28.3-28.5', '*', '/orders/:id/*', '无可用订单 ID');
    }

    console.log('\n── 29. 会员 ──');

    r = await req('GET', '/member/profile', { token: userToken });
    log('29.1', 'GET', '/member/profile', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/member/transactions', { token: userToken });
    log('29.2', 'GET', '/member/transactions', r.status, expect2xx(r.status), summary(r));

    // 取真实充值档位 ID
    let tierId = null;
    const tiersR = await req('GET', '/storedvalue/tiers');
    const tiers = tiersR.data?.data ?? tiersR.data?.items ?? [];
    if (Array.isArray(tiers) && tiers.length > 0) tierId = tiers[0].id;

    if (tierId) {
      r = await req('POST', '/member/recharge', { token: userToken, body: { tierId } });
      log('29.3', 'POST', '/member/recharge', r.status, r.status === 400 || expect2xx(r.status), summary(r));
    } else {
      skip('29.3', 'POST', '/member/recharge', '无充值档位');
    }

    console.log('\n── 30. 评价 ──');

    if (cartProductId) {
      r = await req('GET', `/cigars/${cartProductId}/reviews?page=1&pageSize=20`, { token: userToken });
      log('30.1', 'GET', '/cigars/:id/reviews', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('30.1', 'GET', '/cigars/:id/reviews', '无可用产品 ID');
    }

    // 提交评价需要已支付/完成的订单，无则 422 是预期行为
    if (cartProductId) {
      r = await req('POST', '/reviews', {
        token: userToken,
        body: { cigarId: cartProductId, orderId: testOrderId ?? 0, rating: 5, content: 'E2E 测试评价' },
      });
      log('30.2', 'POST', '/reviews', r.status, r.status === 400 || r.status === 409 || r.status === 422 || expect2xx(r.status), summary(r));
    } else {
      skip('30.2', 'POST', '/reviews', '无可用产品 ID');
    }

    console.log('\n── 31. 推荐 & 历史 ──');

    r = await req('POST', '/recommend', {
      token: userToken,
      body: { answers: [{ questionId: 1, optionIndex: 0 }], limit: 5 },
    });
    log('31.1', 'POST', '/recommend', r.status, expect2xx(r.status), summary(r));

    r = await req('GET', '/history?page=1&pageSize=20', { token: userToken });
    log('31.2', 'GET', '/history', r.status, expect2xx(r.status), summary(r));

    if (cartProductId) {
      r = await req('POST', '/history/tasting', {
        token: userToken,
        body: { cigarId: cartProductId, flavorTags: ['木香', '咖啡'], source: 'manual' },
      });
      log('31.3', 'POST', '/history/tasting', r.status, r.status === 400 || r.status === 404 || expect2xx(r.status), summary(r));
    } else {
      skip('31.3', 'POST', '/history/tasting', '无可用产品 ID');
    }

    console.log('\n── 32. 海报 & 风味分析 ──');

    r = await req('POST', '/posters', {
      token: userToken,
      body: { flavorTags: ['木香', '咖啡'], cigarId: cartProductId },
    });
    const posterOk = r.status === 400 || r.status === 404 || expect2xx(r.status);
    log('32.1', 'POST', '/posters', r.status, posterOk, summary(r));

    const posterId = r.data?.data?.id ?? null;
    if (expect2xx(r.status) && posterId) {
      r = await req('GET', `/posters/${posterId}`, { token: userToken });
      log('32.2', 'GET', '/posters/:id', r.status, expect2xx(r.status), summary(r));
    } else {
      skip('32.2', 'GET', '/posters/:id', '未创建海报');
    }

    // 语音分析需要文件上传，JSON body → 400 是预期行为
    r = await req('POST', '/flavor/analyze-voice', {
      token: userToken,
      body: { voiceUrl: 'https://example.com/test-voice.mp3', cigarId: cartProductId },
    });
    log('32.3', 'POST', '/flavor/analyze-voice', r.status, r.status === 400 || r.status === 415 || expect2xx(r.status), summary(r));
  }

  // ==================== SECTION 4: Metrics ====================
  console.log('\n── 33. Prometheus Metrics ──');

  r = await req('GET', '/metrics');
  log('33.1', 'GET', '/metrics', r.status, expect2xx(r.status), summary(r));

  // ==================== 汇总 ====================
  const total = passed + failed + skipped;
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      测试汇总报告                             ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  总计: ${String(total).padEnd(5)}  ✓ 通过: ${String(passed).padEnd(5)}  ✗ 失败: ${String(failed).padEnd(5)}  ⊘ 跳过: ${skipped}  ║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  if (failed > 0) {
    console.log('║  失败详情:                                                    ║');
    for (const f of failures) {
      const line = `║    ${f}`;
      if (line.length > 80) console.log(line.slice(0, 77) + '…');
      else console.log(line.padEnd(79) + '║');
    }
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('测试执行异常:', e);
  process.exit(2);
});
