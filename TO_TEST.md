# CigarPro 测试覆盖率报告与补齐结果

## 最终测试统计

| 项目 | 测试套件 | 测试用例 | 运行器 |
|------|---------|---------|--------|
| **Cigar（用户端）** | 21 | 274 | Jest 30 |
| **Cigar_admin（管理端）** | 36 | 192 | Vitest 4 |
| **合计** | **57** | **466** | — |

---

## 一、Cigar 用户端（微信小程序）— 274 测试

### 已补齐的所有测试文件

| 分类 | 文件 | 测试内容 |
|------|------|---------|
| **工具层** | `__tests__/utils/request.test.js` | Token 管理、HTTP 方法、Token 刷新流程、401 处理、网络异常、showLoading、自定义 header、request() 直接调用 |
| **工具层** | `__tests__/utils/api.test.js` | 27 个 API 函数、analyzeVoice（含 wx.uploadFile 全部路径）、错误路径、数据转换边界 |
| **入口** | `__tests__/app.test.js` | 自动登录（含静默失败）、购物车角标更新 |
| **页面** | `__tests__/pages/index.test.js` | 推荐流程（问答、提交、结果）、加入购物车、重启 |
| **页面** | `__tests__/pages/cart.test.js` | 加载/空/未登录态、增删改、结账校验、登录刷新 |
| **页面** | `__tests__/pages/club.test.js` | 会员资料、充值档位、联系客服、九宫格导航 |
| **页面** | `__tests__/pages/cigar-detail.test.js` | 详情加载、评价列表、Ember 特效、评论弹窗 |
| **页面** | `__tests__/pages/checkout.test.js` | 订单创建、余额/差额处理、幂等、评价提交 |
| **页面** | `__tests__/pages/orders/index.test.js` | 订单列表、筛选、取消、支付 |
| **页面** | `__tests__/pages/history.test.js` | 历史分页、筛选、翻页合并、跳转 |
| **页面** | `__tests__/pages/flavor.test.js` | 标签加载/降级、选择计算、重置 |
| **页面** | `__tests__/pages/poster.test.js` | 录音分析、MCK 降级、画布、保存 |
| **页面** | `__tests__/pages/member-transactions.test.js` | 余额/交易、筛选、分页 |
| **组件** | `__tests__/components/member-level-badge.test.js` | type/level clamp、observer、lifetime |
| **组件** | `__tests__/components/cigar-rating.test.js` | 重建分片、半星、只读/交互、事件 |
| **组件** | `__tests__/components/question-card.test.js` | 选择/振动、next 校验 |
| **组件** | `__tests__/components/flavor-radar.test.js` | 6 轴构建、缺失分数、observer |
| **组件** | `__tests__/components/pairing-chip.test.js` | 点击触发事件 |
| **组件** | `__tests__/components/navigation-bar.test.js` | 显隐动画、返回、安全区域 |
| **组件** | `__tests__/components/recording-wave.test.js` | 录音启动/停止、防重复 |
| **组件** | `__tests__/components/skeleton-cigar.test.js` | 空组件正常构造 |

---

## 二、Cigar_admin 管理端（React）— 192 测试

### 已有测试（未变更）

| 层级 | 文件数 | 测试数 | 覆盖说明 |
|------|--------|--------|---------|
| API 层 | 14+1(client) | 89 | 验证 HTTP 方法、URL、参数、幂等键 |
| 组件 | 4 | 35 | 深度测试（StatCard 10、StatusBadge 9、PageHeader 7、MemberLevelBadge 9） |
| 页面（已有） | 12 | ~35 | 冒烟测试 + 部分交互测试 |
| Store | 1 | 8 | 深度测试（login/logout/updateTokens/初始化恢复） |

### 新增补缺测试

| 新增文件 | 测试内容 |
|---------|---------|
| `__tests__/pages/Reviews.test.jsx` | 评价管理页面：3 个 Tab、标题渲染、API 失败不崩溃 |
| `__tests__/layouts/AdminLayout.test.jsx` | 管理布局：Logo、用户名、待处理订单、默认头像、菜单项 |
| `__tests__/App.test.jsx` | 根组件：正常渲染、未登录重定向逻辑 |

### setup.js 增强
- 新增 8 个 Ant Design 图标 mock（Dashboard、Shop、Database、MenuFold 等）

---

## 三、仍未覆盖（已知限制）

### Cigar 用户端
- 页面间导航集成测试（端到端流程）
- Canvas 绑制（`_render`、`_drawRadar`、`_drawPoster`）— 需真实 Canvas 环境
- 微信支付回调模拟（`requestPayment` 的 success/fail 分支深层测试）

### Cigar_admin 管理端
- 页面 CRUD 交互测试（表单提交、弹窗、删除确认、分页切换）— 已记录为后续工作
- E2E 测试（Playwright/Cypress）

---

## 四、补齐记录

| 阶段 | 内容 | 新增测试 | 状态 |
|------|------|---------|------|
| 1 | request.js Token 刷新、api.js analyzeVoice + 错误路径、app.js | +51 | 完成 |
| 2 | 10 个小程序页面测试 | +163 | 完成 |
| 3 | 8 个小程序组件测试 | +47 | 完成 |
| 4 | Admin reviews 页面、AdminLayout、App.jsx | +13 | 完成 |

**总新增测试：274（用户端新页面/组件/工具）+ 13（管理端补缺）= 287**
