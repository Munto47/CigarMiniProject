# CigarPro k6 压测脚本

## 环境要求

```bash
# 安装 k6
brew install k6       # macOS
choco install k6      # Windows
sudo apt install k6   # Linux
```

## 脚本说明

| 脚本 | 场景 | 并发量 | 时长 |
|------|------|--------|------|
| `inventory-rush.js` | 库存抢购（200 VU 峰值） | 0 → 100 | 4.5 min |
| `payment-concurrency.js` | 并发支付（幂等防御） | 0 → 200 峰值 | 1 min |
| `recharge-concurrency.js` | 并发充值回调 | 0 → 100 | 4.5 min |
| `mixed-workload.js` | 混合负载（用户真实行为） | 0 → 50 | 2 min |
| `admin-workload.js` | 管理后台负载 | 0 → 50 | 2 min |

### 负载级别

| 级别 | k6 选项 | 用途 |
|------|---------|------|
| 冒烟测试 | `SMOKE_OPTIONS` | CI 冒烟，验证接口可用 |
| 负载测试 | `LOAD_OPTIONS` | 日常压测，验证系统容量 |
| 压力测试 | `STRESS_OPTIONS` | 找到系统瓶颈 |
| 尖峰测试 | `SPIKE_OPTIONS` | 验证突发流量恢复能力 |

## 使用方式

### 本地开发环境

```bash
# 混合负载冒烟测试
k6 run tests/k6/mixed-workload.js

# 指定 BASE_URL
k6 run -e BASE_URL=http://localhost:3000 tests/k6/mixed-workload.js

# 带 Token 的库存抢购测试
k6 run -e BASE_URL=http://localhost:3000 -e TEST_TOKEN=your_token tests/k6/inventory-rush.js
```

### 生成 HTML 报告

```bash
k6 run --out json=results.json tests/k6/mixed-workload.js
# 用 k6 Cloud 或自定义 dashboard 分析
```

### CI 集成 (GitHub Actions)

```yaml
- name: k6 smoke test
  uses: grafana/k6-action@v0.3
  with:
    filename: tests/k6/mixed-workload.js
    flags: --vus 5 --duration 30s
```

## 关键验证点

1. **库存不卖超**：`inventory-rush.js` — 100 库存 + 200 请求 → 100 成功 100 返回 3002
2. **支付不重复**：`payment-concurrency.js` — 多次支付同一订单 → 仅 1 次扣款
3. **回调不重入**：`recharge-concurrency.js` — 多次同号回调 → 仅 1 次入账
4. **混合负载稳定**：`mixed-workload.js` — P95 < 500ms, 错误率 < 1%
