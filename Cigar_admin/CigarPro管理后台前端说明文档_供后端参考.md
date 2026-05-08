# CigarPro 管理后台前端说明文档（供后端开发参考）

> **版本：** v1.1  
> **日期：** 2026-05-05  
> **目的：** 后端开发人员通过阅读本文档，无需接触前端代码即可完整了解管理后台已实现的全部功能、交互部件、所需后端接口，以及推荐的技术栈方案。  
> **更新：** 根据实际前端 API 层代码同步修正所有接口路径、方法与参数。

---

## 一、项目概览

### 1.1 项目定位

GOAT CIGAR CLUB（山羊雪茄俱乐部）管理后台是一个纯前端原型项目，采用 React + Ant Design 6 构建，黑金主题风格。目前已实现 **15 个页面**的完整 UI 交互，所有数据操作均基于本地 Mock 数据，**未接入任何后端 API**。

### 1.2 当前前端技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| 框架 | React | ^19.2.5 |
| 构建工具 | Vite | ^8.0.10 |
| UI 组件库 | Ant Design (antd) | ^6.3.7 |
| 图标库 | @ant-design/icons | ^6.2.2 |
| 路由 | react-router-dom | ^7.14.2 |
| 状态管理 | Zustand | ^5.0.12 |
| 图表库 | Recharts | ^3.8.1 |
| 语言 | JavaScript (JSX)，非 TypeScript |
| 国际化 | antd/locale/zh_CN |

### 1.3 路由结构一览

```
/login                    → 登录页（无需鉴权）
/dashboard                → 数据概览（首页仪表盘）
/products/cigars          → 雪茄商品管理
/products/drinks          → 饮品商品管理
/library/instore          → 在售雪茄库
/library/reference        → 行业风味参考库
/library/tags             → 风味标签管理
/orders                   → 订单管理
/members                  → 用户/会员管理
/storedvalue              → 储值管理
/posters                  → 海报管理
/reviews                  → 评价管理
/accounts                 → 账号管理
/statistics               → 数据统计
/settings                 → 系统设置
```

### 1.4 当前鉴权机制

- 登录页调用 `adminLogin()` API，成功后存储 `{ id, name, role, username }` + `accessToken` + `refreshToken` 至 localStorage
- 路由守卫 `RequireAuth` 检查 Zustand store 中的 `user` 是否存在，未登录重定向至 `/login`
- Axios 请求拦截器自动附加 `Authorization: Bearer <accessToken>`
- Axios 响应拦截器自动处理 Token 过期（code=1001）：静默刷新，并发请求排队
- code=1006 时自动跳转修改密码页
- **当前前端 API 层已完整实现 JWT 双 Token 机制**，后端只需按约定返回 Token 和错误码即可

---

## 二、推荐后端技术栈

基于前端已确定的技术选型和项目需求，推荐以下后端方案：

### 2.1 核心推荐

| 层次 | 推荐方案 | 理由 |
|---|---|---|
| **语言/框架** | Java 17+ / Spring Boot 3.x | 国内企业级主流，生态成熟，与美团收银对接稳定 |
| **数据库** | PostgreSQL 15+ | 复杂查询支持好，JSON 字段灵活，事务强一致 |
| **缓存** | Redis 7+ | 会话管理、AI 推荐缓存、等级计算临时队列 |
| **消息队列** | RabbitMQ / RocketMQ | 异步任务（等级重算、批量同步、推送通知） |
| **ORM** | MyBatis-Plus / JPA | MyBatis-Plus 灵活性强，适合复杂 SQL |
| **API 风格** | RESTful API | 与前端 fetch/axios 对接直接，无需额外 SDK |
| **鉴权** | Spring Security + JWT (Access + Refresh Token) | 无状态鉴权，适合前后端分离 |
| **文件存储** | 阿里云 OSS / 腾讯云 COS | LOGO、海报图片、Excel 导入导出 |
| **API 文档** | Swagger / Knife4j | 自动生成接口文档，方便前后端联调 |
| **部署** | Docker + Nginx 反向代理 | 容器化部署，统一环境 |

### 2.2 备选方案

| 层次 | 备选方案 | 适用场景 |
|---|---|---|
| 语言/框架 | Go + Gin | 团队有 Go 经验，追求高性能 |
| 语言/框架 | Node.js + NestJS | 全栈 JS，前后端语言统一 |
| 数据库 | MySQL 8.0 | 已有 MySQL DBA 运维经验 |

---

## 三、前端全局状态与通用交互

### 3.1 Zustand 全局 Store 结构

```javascript
{
  user: {              // 当前登录管理员信息
    id: number,        // 管理员 ID
    name: string,      // 姓名，如 "超级管理员"
    role: string,      // 角色标识：'super' | 'product' | 'order' | 'member'
    username: string   // 登录账号
  } | null,
  accessToken: string | null,       // JWT Access Token
  refreshToken: string | null,      // JWT Refresh Token

  login(userInfo, accessToken, refreshToken): void,  // 设置 user + tokens，写 localStorage
  logout(): void,             // 清除 user/tokens/must_change_password，清 localStorage
  updateTokens(accessToken, refreshToken): void,  // 刷新 tokens

  siderCollapsed: boolean,    // 侧边栏折叠状态
  setSiderCollapsed(v): void,

  pendingOrders: number,      // 待处理订单数量（Header 角标）
  setPendingOrders(n): void,
}
```

**localStorage 存储键：**
- `admin_user` — 管理员信息 JSON
- `access_token` — JWT Access Token
- `refresh_token` — JWT Refresh Token
- `must_change_password` — 标记需修改密码（code=1006 时设置）

**后端需提供：**
- 登录接口返回管理员信息 + Access Token + Refresh Token
- Refresh Token 接口 (`/api/auth/refresh`)
- 获取待处理订单数接口（用于 Header 角标）

### 3.2 通用组件说明

| 组件 | 路径 | 说明 |
|---|---|---|
| `PageHeader` | `components/PageHeader.jsx` | 页面标题 + 副标题 + 面包屑 + 右侧操作按钮区，几乎所有页面使用 |
| `StatCard` | `components/StatCard.jsx` | 统计数值卡片，支持标题/数值/前缀后缀/趋势箭头/图标/颜色 |
| `StatusBadge` | `components/StatusBadge.jsx` | 状态标签：success/warning/danger/gold/default/blue/silver，支持圆点指示器 |
| `MemberLevelBadge` | `components/MemberLevelBadge.jsx` | 双等级徽章：充值等级(金色VIP星标) / 消费等级(棕色雪茄标)，支持大小尺寸 |

---

## 四、逐页功能说明与后端接口需求

以下按页面逐一说明：**已实现的可交互部件** → **涉及的数据实体** → **需要的后端接口**

---

### 4.1 登录页 (`/login`)

**文件：** `src/pages/login/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 账号输入框 | Input | placeholder="管理员账号"，必填 |
| 密码输入框 | Input.Password | placeholder="登录密码"，必填，带显隐切换 |
| 登录按钮 | Button (submit) | 全宽金色渐变，loading 态文字"验证中..." |
| 锁定提示 | Alert 区域 | 失败 5 次后显示"账号已锁定，请1小时后重试"，按钮 disabled |
| 错误提示 | message.error | 剩余尝试次数提示 |

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-001 | `/api/admin/login` | POST | 管理员登录，入参 `{ username, password }`，返回 `{ accessToken, refreshToken, adminInfo: { id, name, role, username } }`。错误码 1004=账号被禁用，1006=需修改初始密码 |
| API-002 | `/api/auth/refresh` | POST | 刷新 Token，入参 `{ refreshToken }`，返回 `{ accessToken, refreshToken }` |
| API-003 | `/api/admin/change-password` | POST | 修改密码，入参 `{ oldPassword, newPassword }` |
| API-004 | `/api/auth/wechat-login` | POST | 微信小程序登录，入参 `{ code, userInfo }`，用于小程序端 |

#### 登录业务规则

- 前端响应拦截器自动处理 Token 过期（code=1001），自动调用 refresh 接口续期
- code=1006 时前端自动跳转至修改密码页
- 需记录登录日志（时间、账号、IP、结果）
- 连续输错 5 次锁定 1 小时（建议后端 Redis 实现）

---

### 4.2 数据概览 (`/dashboard`)

**文件：** `src/pages/dashboard/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 今日订单卡片 | StatCard | 显示数值 + 较昨日趋势箭头 + 百分比 |
| 今日销售额卡片 | StatCard | ¥ 前缀 + 趋势 |
| 活跃会员卡片 | StatCard | 本周新增趋势 |
| 储值总额卡片 | StatCard | 本月趋势 |
| 近 7 日订单趋势图 | LineChart (Recharts) | 双 Y 轴：订单数(左) + 营收(右)，含悬浮 Tooltip |
| 销量 Top5 雪茄图 | BarChart (Recharts) | 横向柱状图，金色渐变填充 |
| 最新订单表格 | Table (5 行) | 订单号/用户/实付/支付方式/状态(StatusBadge)/时间 |

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-005 | `/api/admin/dashboard/overview` | GET | 返回今日订单数(`orders.today`)、今日销售额(`revenue.todayYuan`)、注册用户数(`users.total`)、储值总额(`balance.totalYuan`) |
| API-006 | `/api/admin/dashboard/sales-trend` | GET | 近 N 日每日订单数与营收，入参 `?days=7` |
| API-007 | `/api/admin/dashboard/top-products` | GET | Top N 雪茄销量排行，入参 `?limit=10` |
| API-008 | `/api/admin/dashboard/recent-orders` | GET | 最新 N 条订单，入参 `?limit=10` |

#### 前端并行调用方式

Dashboard 页面使用 `Promise.all` 同时发起 4 个请求获取所有概览数据。

---

### 4.3 雪茄商品管理 (`/products/cigars`)

**文件：** `src/pages/products/cigars/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 搜索框 | Input + SearchOutlined | 按名称/品牌搜索 |
| 分类下拉 | Select | 古巴/多米尼加/尼加拉瓜/洪都拉斯/墨西哥 |
| 状态下拉 | Select | 上架/下架/售罄 |
| 导出按钮 | Button | 点击显示"导出功能待后端接入" |
| 添加雪茄按钮 | Button (primary) | 金色渐变，打开新增弹窗 |
| 数据表格 | Table | 含分页(10条/页)，列见下方 |
| 编辑按钮 | Button (text, 金色) | 每行操作区，打开编辑弹窗 |
| 删除按钮 | Button (text, 红色) | 带 Popconfirm 二次确认 |
| 上架/下架开关 | Switch | 行内切换商品状态 |
| 排序 | Table sorter | 按原价、库存排序 |

**表格列：** 雪茄信息(emoji图标+名称+品牌+分类+NOW标签)、规格、原价、储值价、库存(颜色标识)、评分(星级+人数)、状态(Switch)、操作

#### 新增/编辑弹窗表单字段

| 字段 | 组件 | 必填 | 说明 |
|---|---|---|---|
| 雪茄名称 | Input | 是 | |
| 品牌 | Input | 是 | |
| 分类 | Select | 是 | 5 个分类选项 |
| 规格 | Select | - | 单支/礼盒 |
| 原价(¥) | InputNumber | 是 | min=0 |
| 储值价(¥) | InputNumber | 是 | min=0 |
| 库存 | InputNumber | 是 | min=0 |
| 浓度 | Select | - | 轻柔温和/均衡适中/浓郁丰厚/醇厚强劲 |
| 品鉴时长 | Input | - | 例：60-90分钟 |
| NEW标识 | Switch | - | 新品标签开关 |
| 前段风味 | Input | - | |
| 中段风味 | Input | - | |
| 尾段风味 | Input | - | |

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-009 | `/api/admin/products/cigars` | GET | 分页查询雪茄列表。入参：`?page=&pageSize=&keyword=&category=&status=&sortBy=&sortOrder=` |
| API-010 | `/api/admin/products/cigars/{id}` | GET | 获取单支雪茄详情 |
| API-011 | `/api/admin/products/cigars` | POST | 新增雪茄。Body 包含上述所有表单字段 |
| API-012 | `/api/admin/products/cigars/{id}` | PUT | 编辑雪茄（含状态切换，通过 `status` 字段） |
| API-013 | `/api/admin/products/cigars/{id}` | DELETE | 删除雪茄 |

> **注意：** 上架/下架状态切换通过 `updateCigar` 接口的 `status` 字段实现（`"active"` / `"disabled"`），无独立 toggle 接口。导出功能当前前端通过直接打开 URL 实现，需后端提供 Excel 文件下载端点。分类选项当前前端硬编码（`luxury`/`classic`/`strong`/`mild`/`limited`），可后续接入分类接口。

---

### 4.4 饮品商品管理 (`/products/drinks`)

**文件：** `src/pages/products/drinks/index.jsx`

#### 交互部件

与雪茄管理结构相同，但字段更简化：

| 差异点 | 说明 |
|---|---|
| 分类 | 威士忌/鸡尾酒/咖啡/茶饮/软饮/其他 |
| 无浓度/时长/风味字段 | 饮品不需要 |
| 有描述字段 | TextArea |
| 匹配雪茄 | mock 中有 `matchCigars` 关联，但前端表单未暴露编辑入口 |

#### 新增/编辑弹窗表单字段

名称、分类、库存、原价、储值价、描述(TextArea)、NEW标识(Switch)

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-014 | `/api/admin/products/drinks` | GET | 分页查询饮品列表。入参：`?page=&pageSize=&keyword=&category=&status=` |
| API-015 | `/api/admin/products/drinks/{id}` | GET | 获取单品饮品详情 |
| API-016 | `/api/admin/products/drinks` | POST | 新增饮品 |
| API-017 | `/api/admin/products/drinks/{id}` | PUT | 编辑饮品（含状态切换） |
| API-018 | `/api/admin/products/drinks/{id}` | DELETE | 删除饮品 |

> **注意：** 分类选项当前前端硬编码（`whisky`/`brandy`/`rum`/`wine`/`tea`/`coffee`）。导出功能待后端接入。

---

### 4.5 在售雪茄库 (`/library/instore`)

**文件：** `src/pages/library/instore/index.jsx`

这是核心数据库管理页，区别于"商品管理"——此页面侧重完整雪茄数据录入（含 AI 标签、场景），提交后需同步至小程序、AI 引擎、美团收银。

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 强制同步按钮 | Button (绿色) | 带 SyncOutlined 旋转动画 + loading 态(模拟 1.8s)，同步至小程序/AI引擎/美团 |
| 批量导入按钮 | Button | 点击显示"请选择 Excel 文件(.xlsx)进行批量导入" |
| 导出备份按钮 | Button | 全库导出 |
| 新增雪茄按钮 | Button (primary) | 打开新增弹窗 |
| 搜索框 | Input | 按名称/品牌搜索 |
| 编辑按钮 | Button (text) | 编辑行 |
| 删除按钮 | Button (text, 红色) | 带 Popconfirm "删除后不可恢复" |

**表格列：** 雪茄名称+品牌/NEW标签、价格(原价/储值价)、库存、风味(前中尾三段)、AI标签(圆角标签组)、时长、操作

#### 新增/编辑弹窗表单字段（比商品管理更多）

名称、品牌、原价、储值价、库存、浓度、品鉴时长、规格、前段风味、中段风味、尾段风味、**AI匹配标签(Select mode="tags" 自由输入)、适配场景(Select mode="multiple"：商务会谈/独处休闲/朋友聚会/庆祝场合)**

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-019 | `/api/admin/library/instore` | GET | 分页查询在售雪茄库。入参：`?page=&pageSize=&keyword=` |
| API-020 | `/api/admin/library/instore` | POST | 新增雪茄入库。成功后需触发同步至：小程序商品接口、AI推荐引擎、美团收银 |
| API-021 | `/api/admin/library/instore/{id}` | PUT | 编辑雪茄数据 |
| API-022 | `/api/admin/library/instore/{id}` | DELETE | 删除（需确认无关联订单） |
| API-023 | `/api/admin/library/instore/sync` | POST | 手动强制同步至小程序/AI引擎/美团收银 |
| API-024 | `/api/admin/library/instore/import` | POST | Excel 批量导入，接收 `multipart/form-data`，返回校验结果（成功/失败行明细）。前端调用：`message.info('请选择 Excel 文件(.xlsx)进行批量导入')` |
| API-025 | `/api/admin/library/instore/export` | GET | 全库导出 Excel，含所有字段。前端使用 `window.open` 直接下载 |

> **注意：** 导入/导出接口当前前端使用占位提示，需后端实现后对接。

---

### 4.6 行业风味参考库 (`/library/reference`)

**文件：** `src/pages/library/reference/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 搜索框 | Input | 按名称/品牌搜索 |
| 新增参考款按钮 | Button (primary) | 打开新增弹窗 |
| 编辑按钮 | Button (text) | |
| 删除按钮 | Button (text, 红色) | |
| 提示条 | Alert 区域 | "此库中的雪茄将在小程序雪茄详情页的「行业风味参考」模块展示..." |

**表格列：** 雪茄信息(名称+品牌+分类)、风味(前中尾三段)、浓度、备注(标注"仅供风味参考")

#### 新增/编辑弹窗表单字段

名称、品牌、分类、浓度、前段风味、中段风味、尾段风味、备注

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-026 | `/api/admin/library/reference` | GET | 分页查询行业参考库。入参：`?page=&pageSize=&keyword=` |
| API-027 | `/api/admin/library/reference` | POST | 新增参考款 |
| API-028 | `/api/admin/library/reference/{id}` | PUT | 编辑参考款 |
| API-029 | `/api/admin/library/reference/{id}` | DELETE | 删除参考款 |

---

### 4.7 风味标签管理 (`/library/tags`)

**文件：** `src/pages/library/tags/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 标签云预览区 | 自定义区域 | 根据 AI 权重动态调整字号和透明度，可视化展示全部标签 |
| 新增标签按钮 | Button (primary) | 打开新增弹窗 |
| 编辑按钮 | Button (text) | 编辑标签 |
| 删除按钮 | Button (text, 红色) | 带 Popconfirm "删除标签后AI推荐规则实时变更" |

**表格列：** 标签名(金色圆角标签样式)、分类、AI权重(进度条+数值)、关联雪茄数、操作

#### 新增/编辑弹窗表单字段

标签名、分类(Select：11 个分类)、AI推荐权重(Slider：0.0-1.0，步长 0.05)

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-030 | `/api/admin/library/tags` | GET | 获取全部风味标签（含关联雪茄数、AI权重）。入参：`?pageSize=200` |
| API-031 | `/api/admin/library/tags` | POST | 新增风味标签。Body：`{ name, category, aiWeight }` |
| API-032 | `/api/admin/library/tags/{id}` | PUT | 编辑标签，需触发 AI 推荐引擎权重刷新 |
| API-033 | `/api/admin/library/tags/{id}` | DELETE | 删除标签，需触发 AI 推荐引擎权重刷新 |

---

### 4.8 订单管理 (`/orders`)

**文件：** `src/pages/orders/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 同步美团按钮 | Button (绿色) | 带 SyncOutlined 旋转 + loading，模拟 1.5s |
| 导出 Excel 按钮 | Button | |
| 状态概览卡片组 | 4 个可点击卡片 | 待支付/待结算/已完成/已取消，点击筛选对应状态，再次点击取消筛选，选中态高亮 |
| 搜索框 | Input | 按订单号/用户名搜索 |
| 状态下拉 | Select | 全部/待支付/待结算/已完成/已取消 |
| 查看详情按钮 | Button (text, 金色) | 打开右侧 Drawer |
| 结算按钮 | Button (link, 绿色) | 仅 pending 状态显示，点击变为 settling |
| 完成按钮 | Button (link, 绿色) | 仅 settling 状态显示，点击变为 completed |

**表格列：** 订单号(monospace 字体)、用户、商品明细(名称×数量)、金额(原价+实付+折扣)、支付方式(💰储值余额/🏪美团收银)、状态(StatusBadge)、下单时间、操作

#### 订单详情抽屉 (Drawer 右侧滑出, width=480)

显示：订单状态 StatusBadge、用户信息、**商品明细**(逐条名称×数量×单价)、商品合计、会员折扣、实付金额(大字体金色)、支付方式、提货时间、下单时间

**底部按钮：** 当状态为 pending 时显示"标记为待结算"全宽金色按钮

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-034 | `/api/orders` | POST | 用户端创建订单（公开接口）。入参含 `{ items, ... }`，自动携带 `Idempotency-Key` 幂等键 |
| API-035 | `/api/admin/orders` | GET | 管理端分页查询订单。入参：`?page=&pageSize=&keyword=&status=&startDate=&endDate=&payMethod=` |
| API-036 | `/api/admin/orders/{id}` | GET | 获取订单详情（含商品明细、支付信息、退款记录） |
| API-037 | `/api/admin/orders/{id}/status` | PATCH | 修改订单状态。Body：`{ status: 'paid' | 'settling' | 'completed' | 'cancelled' }` |
| API-038 | `/api/admin/orders/{id}/refund` | POST | 订单退款。Body：`{ amountCents, reason? }`，携带 `Idempotency-Key` 幂等键 |
| API-039 | `/api/admin/orders/sync-meituan` | POST | 手动同步美团收银订单状态 |

#### 订单状态流转规则（当前前端支持的状态）

```
pending(待支付) → paid(已支付) → settling(待确认) → completed(已完成)
     ↓
cancelled(已取消)
     ↓
refunding(退款中) → refunded(已退款)
```

- 订单完成后需增加用户消费等级积分
- 订单取消/支付失败不计入消费积分
- 退款需支持消费积分回退
- 导出和状态计数功能前端已预留，待后端接入

---

### 4.9 用户/会员管理 (`/members`)

**文件：** `src/pages/members/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 统计卡片组 | 4 个卡片 | 全部会员/高等级V7-V9/中等级V4-V6/入门V1-V3（hover 动效） |
| 搜索框 | Input | 按会员昵称搜索 |
| 充值等级下拉 | Select | V1-V9 筛选 |
| 消费等级下拉 | Select | V1-V9 筛选 |
| 查看详情按钮 | Button (text, 金色) | 打开右侧 Drawer |

**表格列：** 会员(Avatar+昵称+加入时间)、充值等级(MemberLevelBadge, 可排序)、消费等级(MemberLevelBadge, 可排序)、储值余额(可排序)、累计充值(可排序)、累计消费(可排序)、订单数(可排序)、最后登录、操作

#### 会员详情抽屉 (Drawer width=620, 4 个 Tab)

**Tab 1：基本信息**
- 头像 + 昵称 + 双等级徽章 + 加入时间
- 数据网格：储值余额、累计充值、累计消费、订单数、生日、手机号
- 等级详情卡片：充值等级积分 + 距下一级差多少积分、消费等级积分 + 距下一级差多少积分

**Tab 2：充值记录**（Table）
- 列：充值单号、金额、支付方式、积分+、等级变化(V前→V后)、状态(StatusBadge: 成功/失败/处理中)、时间

**Tab 3：消费记录**（Table）
- 列：订单编号、商品信息、金额、支付方式、积分+、等级变化、订单状态、收银同步状态、时间

**Tab 4：等级变更记录**（Table）
- 列：类型(MemberLevelBadge)、变更(V前→V后)、触发方式(充值升级/消费升级)、关联单号、时间

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-040 | `/api/admin/members` | GET | 分页查询会员列表。入参：`?page=&pageSize=&keyword=&rechargeLevel=&consumptionLevel=&sortBy=&sortOrder=` |
| API-041 | `/api/admin/members/{id}` | GET | 获取会员完整详情（含基本信息、充值/消费/等级变更记录）。详情页 4 个 Tab 的数据建议在一个接口中返回 |
| API-042 | `/api/admin/members/stats` | GET | 获取会员等级分布统计（全部/高V7-V9/中V4-V6/入门V1-V3 各多少人） |

> **注意：** 会员详情 Drawer 中 4 个 Tab（基本信息/充值记录/消费记录/等级变更）的数据当前前端通过 `getMemberDetail` 一次性获取。如数据量大，可拆分为独立的分页接口（充值记录、消费记录、等级变更记录各自分页查询）。

---

### 4.10 储值管理 (`/storedvalue`)

**文件：** `src/pages/storedvalue/index.jsx`

这是最复杂的配置页面，包含 **4 个 Tab**：

#### Tab 1：充值档位

| 部件 | 类型 | 说明 |
|---|---|---|
| 添加档位按钮 | Button (primary) | 打开弹窗 |
| 档位表格 | Table | 档位名称、充值金额、赠送金额、启用(Switch)、操作(编辑/删除) |

**弹窗表单：** 充值金额(InputNumber, 必填)、赠送金额(InputNumber, 默认0)

#### Tab 2：折扣与提醒

| 部件 | 类型 | 说明 |
|---|---|---|
| 折扣率输入 | InputNumber | min=0.5, max=1, step=0.01，实时显示 X 折 |
| 生日提醒天数 | InputNumber | min=1, max=30，单位"天" |
| 上新推送开关 | Switch | 控制全员推送 |
| 保存配置按钮 | Button (primary, block) | |

#### Tab 3：流水记录

| 部件 | 类型 | 说明 |
|---|---|---|
| 手动调整余额按钮 | Button (橙色) | 打开弹窗 |
| 流水表格 | Table | 时间、会员、类型(充值/调整/消费 StatusBadge)、金额(+绿色/-红色)、余额、描述 |

**手动调整弹窗表单：** 会员昵称(Input)、调整方式(Select: 增加/减少)、调整金额(InputNumber)、调整原因(Input)

#### Tab 4：等级配置

| 部件 | 类型 | 说明 |
|---|---|---|
| 提示条 | Alert (info) | 规则说明 |
| 重新计算按钮 | Button (金色渐变) | 触发全部用户等级重算 |
| 充值等级配置表 | Table (左半屏) | V1-V9，每行：等级徽章+名称+积分区间+图标+启用Switch+编辑 |
| 消费等级配置表 | Table (右半屏) | V1-V9，每行：等级徽章+名称+积分区间+图标+启用Switch+编辑 |

**等级编辑弹窗表单：** 等级名称(Input)、积分下限(InputNumber, 必填)、积分上限(InputNumber, V9可留空=无上限)、启用状态(Switch)；V9 有额外 Alert 提示

#### 后端接口需求

##### 充值档位 (Tab 1)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-043 | `/api/admin/storedvalue/tiers` | GET | 获取全部充值档位 |
| API-044 | `/api/admin/storedvalue/tiers` | POST | 新增充值档位。Body：`{ amount, bonus }` |
| API-045 | `/api/admin/storedvalue/tiers/{id}` | PUT | 编辑充值档位（含启用/停用，通过更新时设置 active 字段） |
| API-046 | `/api/admin/storedvalue/tiers/{id}` | DELETE | 删除充值档位 |

##### 折扣与提醒 (Tab 2)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-047 | `/api/admin/settings/{key}` | PUT | 保存储值配置。使用统一的 settings API，key 为 `storedvalue`。Body 包含 `{ discountRate, birthdayRemindDays, newProductPush }` |

> **注意：** 折扣率、生日提醒、上新推送配置通过通用 `/api/admin/settings/{key}` 接口保存，key = `storedvalue`。前端调用 `updateSetting('storedvalue', { ... })`。

##### 流水记录 (Tab 3)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-048 | `/api/admin/storedvalue/transactions` | GET | 分页查询流水记录。入参：`?page=&pageSize=&type=&userId=&startDate=&endDate=` |
| API-049 | `/api/admin/storedvalue/transactions/adjust` | POST | 手动调整余额。Body：`{ userId, type: 'add'|'sub', amount, reason }`。携带 `Idempotency-Key` 幂等键。需记录操作日志 |
| API-050 | `/api/admin/storedvalue/recharge-orders` | GET | 分页查询充值订单。入参：`?page=&pageSize=&status=&startDate=&endDate=` |

##### 等级配置 (Tab 4)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-051 | `/api/admin/storedvalue/level-config` | GET | 获取等级配置。入参：`?type=recharge` 或 `?type=consumption` |
| API-052 | `/api/admin/storedvalue/level-config/{id}` | PUT | 编辑单个等级配置(V1-V9)。Body：`{ name, minPoints, maxPoints, enabled }`。通过 id 定位，而非 type+level 组合 |
| API-053 | `/api/admin/storedvalue/level-config/recalculate` | POST | 重新计算全部用户等级。Body：`{ levelType: 'recharge' | 'consumption' }`（异步任务，需记录任务结果到日志） |

#### 等级配置校验规则

- 区间不得重叠
- 区间不得断档
- V1 必须从 0 开始
- V9 可配置为无上限（maxPoints = null）
- 修改后需记录修改日志（修改人、时间、修改前后规则）

---

### 4.11 海报管理 (`/posters`)

**文件：** `src/pages/posters/index.jsx`

#### Tab 1：海报记录

| 部件 | 类型 | 说明 |
|---|---|---|
| 海报表格 | Table | 用户、雪茄名、风味标签(圆角标签组)、语音描述(截断40字)、生成时间、状态、操作(预览) |

**预览按钮：** 点击显示"海报预览（待后端接入图片）"

#### Tab 2：海报模板配置

| 部件 | 类型 | 说明 |
|---|---|---|
| LOGO 上传 | Upload 按钮 | 点击显示"LOGO上传待后端接入"，支持 PNG/SVG |
| 背景色选择器 | 4 个色块 | 点击选中(✓标记)，选中态金色边框 |
| 主题色选择器 | 4 个色块 | 点击选中 |
| 字体风格下拉 | Select | 经典衬线/现代无衬线/优雅细线 |
| 俱乐部名称 | Input | |
| 海报宣传语 | Input | |
| 海报实时预览 | 正方形预览区 | 根据当前配置实时渲染预览 |
| 保存模板配置按钮 | Button (primary, block) | |

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-054 | `/api/admin/posters` | GET | 分页查询海报生成记录。入参：`?page=&pageSize=` |
| API-055 | `/api/admin/posters/template` | GET | 获取海报模板配置（返回 `{ logoUrl, bgColor, accentColor, fontStyle, clubName, tagline }`） |
| API-056 | `/api/admin/posters/template` | PUT | 保存海报模板配置。Body：`{ logoUrl, bgColor, accentColor, fontStyle, clubName, tagline }` |

> **注意：** 海报预览当前通过 `window.open(posterUrl)` 打开。LOGO 上传、海报生成接口待后端接入。海报由小程序端调用生成接口，管理端仅查看和配置模板。

---

### 4.12 评价管理 (`/reviews`)

**文件：** `src/pages/reviews/index.jsx`

#### Tab 1：评分总览

**表格列：** 雪茄名称、综合评分(Progress 进度条+数值)、评价人数、星级分布(5星图标)

#### Tab 2：评论管理

| 部件 | 类型 | 说明 |
|---|---|---|
| 评论表格 | Table | 含分页 |

**表格列：** 用户(昵称+充值等级+消费等级 Small Badge)、雪茄名、评分(StarRating 5星组件)、评论内容、时间、状态(公开/已屏蔽/待审 StatusBadge)、操作(屏蔽按钮 + 删除按钮)

| 屏蔽按钮 | Button (text, 橙色) | EyeInvisibleOutlined 图标，仅 visible 状态显示 |
| 删除按钮 | Button (text, 红色) | 带 Popconfirm |

#### Tab 3：敏感词库

| 部件 | 类型 | 说明 |
|---|---|---|
| 敏感词展示区 | Tag 组 | 红色 Tag，带 CloseIcon 可删除 |
| 新增输入框 | Input + Button | 输入敏感词后回车或点添加按钮 |

#### StarRating 评分组件规格

- 5 个雪茄图标 (StarFilled)
- 已选：金色 `#C9A84C`，未选：暗色 `#2A2520`
- 分值 1-5 整数

#### 后端接口需求

##### 评论管理 (Tab 1 & 2)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-057 | `/api/admin/reviews` | GET | 分页查询评论列表。入参：`?page=&pageSize=&cigarId=&status=&keyword=&startDate=&endDate=`。同时用于评分总览和评论管理 |
| API-058 | `/api/admin/reviews/{id}/moderate` | PATCH | 审核评论（屏蔽/取消屏蔽）。Body：`{ action: 'hide' | 'show' }` |
| API-059 | `/api/admin/reviews/{id}` | DELETE | 删除评论 |

##### 敏感词库 (Tab 3)

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-060 | `/api/admin/reviews/sensitive-words` | GET | 获取敏感词列表。入参：`?pageSize=500` |
| API-061 | `/api/admin/reviews/sensitive-words` | POST | 新增敏感词。Body：`{ word }` |
| API-062 | `/api/admin/reviews/sensitive-words/{id}` | DELETE | 删除敏感词（通过 id，非 word 字符串） |

#### 评论数据关联字段

每条评论需关联：`userId`、`cigarId (SKU)`、`orderId`、`userRechargeLevel`、`userConsumptionLevel`（发布时或当前等级）、`rating`、`comment`、`status`（`visible`/`hidden`/`pending`）、`createdAt`

---

### 4.13 账号管理 (`/accounts`)

**文件：** `src/pages/accounts/index.jsx`

#### Tab 1：管理员列表

| 部件 | 类型 | 说明 |
|---|---|---|
| 新增管理员按钮 | Button (primary) | 打开弹窗 |
| 管理员表格 | Table | 含分页 |

**表格列：** 管理员(Avatar+姓名+@用户名)、角色(彩色标签)、状态(超级管理员显示 StatusBadge/其他显示 Switch 开关)、最后登录、创建时间、操作(编辑/删除；超级管理员行显示"不可修改")

#### 新增/编辑弹窗表单

姓名(Input+UserOutlined, 必填)、登录账号(Input+@前缀, 必填)、初始密码(Input.Password+LockOutlined, 仅新增时显示, 必填≥6位)、角色权限(Select：商品管理员/订单管理员/会员管理员)

#### Tab 2：登录日志

**表格列：** 时间、账号、IP 地址(monospace)、结果(StatusBadge: 成功/失败)

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-063 | `/api/admin/accounts` | GET | 获取管理员列表。入参：`?pageSize=100` |
| API-064 | `/api/admin/accounts/{id}` | GET | 获取单个管理员详情 |
| API-065 | `/api/admin/accounts` | POST | 新增管理员。Body：`{ name, username, password, roleCode }`。roleCode 可选值：`product`/`order`/`member`（super 不可分配） |
| API-066 | `/api/admin/accounts/{id}` | PUT | 编辑管理员。编辑时 password 字段可选（留空=不修改密码）。启用/禁用通过更新状态字段实现 |
| API-067 | `/api/admin/accounts/{id}` | DELETE | 删除管理员（超级管理员不可删） |
| API-068 | `/api/admin/login-logs` | GET | 分页查询登录日志。入参：`?page=&pageSize=` |

> **注意：** 修改密码功能由 `/api/admin/change-password` 接口（API-003）实现，非 accounts 模块。启用/禁用通过 `updateAccount` 接口更新状态字段实现，无独立 toggle 接口。

#### 角色权限体系

| 角色 | 标识 | 权限范围 |
|---|---|---|
| 超级管理员 | super | 全部权限，不可删除，不可禁用 |
| 商品管理员 | product | 商品管理、雪茄库管理 |
| 订单管理员 | order | 订单管理 |
| 会员管理员 | member | 会员管理、储值管理 |

---

### 4.14 数据统计 (`/statistics`)

**文件：** `src/pages/statistics/index.jsx`

#### 交互部件

| 部件 | 类型 | 说明 |
|---|---|---|
| 导出报表按钮 | Button (页面右上角) | |

#### Tab 1：销售报表

- **月度销售趋势折线图** (LineChart)：营收(¥)，含 Tooltip
- **分类销售占比饼图** (PieChart)：各雪茄分类占比百分比
- **月度销售明细表** (Table)：月份、营收(可排序)、订单数(可排序)、客单价

#### Tab 2：用户分析

- **用户增长趋势柱状图** (BarChart)：总会员数(半透明金色) + 活跃会员(金色)

#### Tab 3：储值分析

- **月度储值充值 vs 消费柱状图** (BarChart)：充值额(金色) + 消费额(绿色)

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-069 | `/api/admin/statistics/sales` | GET | 销售报表数据。入参：`?startDate=&endDate=`（日期范围） |
| API-070 | `/api/admin/statistics/categories` | GET | 分类销售占比。入参：`?startDate=&endDate=` |
| API-071 | `/api/admin/statistics/users` | GET | 用户增长趋势（总会员数+活跃会员）。入参：`?startDate=&endDate=` |
| API-072 | `/api/admin/statistics/storedvalue` | GET | 储值分析（充值额 vs 消费额）。入参：`?startDate=&endDate=` |
| API-073 | `/api/admin/statistics/export` | GET | 导出综合统计报表。入参：`?startDate=&endDate=` |

---

### 4.15 系统设置 (`/settings`)

**文件：** `src/pages/settings/index.jsx`

#### Tab 1：基础信息

| 部件 | 类型 | 说明 |
|---|---|---|
| 俱乐部名称 | Input | |
| 宣传语 | Input | |
| 商家 LOGO | Upload 按钮 | "LOGO上传待后端接入" |
| 门店地址 | Input | |
| 联系电话 | Input | |
| 营业时间 | Input | 例：17:00 - 02:00 |
| 保存信息按钮 | Button (primary) | |

#### Tab 2：美团收银接口

| 部件 | 类型 | 说明 |
|---|---|---|
| 提示条 | Alert | "接口配置将用于订单实时同步至美团收银系统..." |
| 美团 App ID | Input | |
| App Secret | Input.Password | |
| API 接口地址 | Input | |
| 自动同步开关 | Switch | |
| 保存配置按钮 | Button (primary) | |
| 测试连接按钮 | Button (绿色边框) | 点击显示"接口连接测试成功（演示）" |

#### Tab 3：系统日志

**表格列：** 时间、操作人、操作内容、级别(StatusBadge: 信息/警告/错误)

#### 后端接口需求

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-074 | `/api/admin/settings` | GET | 获取全部系统配置（返回包含 basic/meituan/storedvalue 等所有 key 的对象） |
| API-075 | `/api/admin/settings/{key}` | PUT | 保存某项配置。key = `basic`（基础信息）、`meituan`（美团配置）、`storedvalue`（储值配置）等 |
| API-076 | `/api/admin/settings/meituan/test` | POST | 测试美团收银连接 |
| API-077 | `/api/admin/settings/logs` | GET | 分页查询系统操作日志。入参：`?page=&pageSize=&level=&startDate=&endDate=` |
| API-078 | `/api/admin/settings/public/store-info` | GET | 获取门店公开信息（用于小程序端展示，无需鉴权） |

> **注意：** 系统设置采用统一 key-value 模式：
> - `getSettings()` 一次性获取所有配置
> - `updateSetting(key, data)` 按 key 保存（如 `updateSetting('basic', { clubName: '...' })`）
> - 美团配置的 App Secret 留空时表示不修改
> - `getStoreInfo()` 用于小程序端获取门店信息，可能无需登录态

---

## 五、Mock 数据模型参考

以下为前端 Mock 数据中实际使用的字段结构，**后端接口的响应 JSON 应与此保持兼容**。

### 5.1 雪茄 (Cigar)

```typescript
{
  id: number;              // 唯一 ID
  name: string;            // 雪茄名称，如 "Cohiba Behike 52"
  brand: string;           // 品牌，如 "Cohiba"
  model: string;           // 型号
  spec: string;            // 规格："单支" | "礼盒"
  price: number;           // 原价（分？元？mock 中为元）
  memberPrice: number;     // 储值会员价
  stock: number;           // 库存数量
  status: string;          // "active" | "disabled" | "soldout"
  category: string;        // 分类
  flavor: {
    start: string;         // 前段风味
    mid: string;           // 中段风味
    end: string;           // 尾段风味
  };
  strength: string;        // 浓度："轻柔温和" | "均衡适中" | "浓郁丰厚" | "醇厚强劲"
  duration: string;        // 品鉴时长，如 "60-90分钟"
  tags: string[];          // 内部标签
  aiTags: string[];        // AI 匹配标签
  scene: string[];         // 适配场景
  rating: number;          // 综合平均分 (0-5)
  ratingCount: number;     // 评价总人数
  isNew: boolean;          // 新品标识
  createdAt: string;       // 创建日期
}
```

### 5.2 饮品 (Drink)

```typescript
{
  id: number;
  name: string;
  category: string;        // "威士忌" | "鸡尾酒" | "咖啡" | "茶饮" | "软饮" | "其他"
  price: number;
  memberPrice: number;
  stock: number;
  status: string;          // "active" | "disabled"
  description: string;
  matchCigars: number[];   // 匹配的雪茄 ID 列表
  isNew: boolean;
  createdAt: string;
}
```

### 5.3 订单 (Order)

```typescript
{
  id: string;              // 订单号，如 "ORD20240603001"
  userId: number;
  userName: string;        // 用户昵称（冗余，便于展示）
  items: Array<{
    cigarId?: number;      // 雪茄 ID
    drinkId?: number;      // 饮品 ID
    name: string;          // 商品名称
    spec: string;
    qty: number;
    price: number;         // 原价
    memberPrice: number;   // 储值价
  }>;
  total: number;           // 商品合计（原价总和）
  memberDiscount: number;  // 会员折扣金额
  actualPay: number;       // 实付金额
  payMethod: string;       // "balance"(储值余额) | "meituan"(美团收银)
  status: string;          // "pending" | "settling" | "completed" | "cancelled"
  pickupTime: string;      // 自提时间
  orderTime: string;       // 下单时间
  evaluated: boolean;      // 是否已完成评价
}
```

### 5.4 会员 (Member)

```typescript
{
  id: number;
  nickname: string;        // 微信昵称
  avatar: string | null;   // 微信头像 URL
  rechargeLevel: number;   // 充值等级 V1-V9
  consumptionLevel: number;// 消费等级 V1-V9
  rechargePoints: number;  // 充值等级积分
  consumptionPoints: number;// 消费等级积分
  balance: number;         // 储值余额
  totalRecharge: number;   // 累计充值金额
  totalSpend: number;      // 累计消费金额
  orderCount: number;      // 订单数
  loginCount: number;      // 登录次数
  birthday: string | null; // 生日 "YYYY-MM-DD"
  joinDate: string;        // 加入日期
  lastLogin: string;       // 最后登录时间
  phone: string | null;    // 手机号（脱敏）
  rechargeRecords: RechargeRecord[];
  consumptionRecords: ConsumptionRecord[];
  levelChangeRecords: LevelChangeRecord[];
}
```

### 5.5 充值记录 (RechargeRecord)

```typescript
{
  id: number;
  orderNo: string;         // 充值单号 "R20240601001"
  amount: number;          // 充值金额
  paymentMethod: string;   // "微信支付"
  pointsAdded: number;     // 充值积分增加值(默认=金额)
  levelBefore: number;     // 充值前充值等级
  levelAfter: number;      // 充值后充值等级
  status: string;          // "success" | "failed" | "pending"
  time: string;            // 充值时间
}
```

### 5.6 消费记录 (ConsumptionRecord)

```typescript
{
  id: number;
  orderNo: string;         // 订单编号
  productInfo: string;     // 商品摘要
  amount: number;          // 实付金额
  paymentMethod: string;   // "储值余额" | "美团收银"
  pointsAdded: number;     // 消费积分增加值(默认=金额)
  levelBefore: number;     // 消费前消费等级
  levelAfter: number;      // 消费后消费等级
  orderStatus: string;     // "completed" | "pending" | "cancelled" | "settling"
  syncStatus: string;      // "synced" | "pending" | "error"
  time: string;            // 完成时间
}
```

### 5.7 等级变更记录 (LevelChangeRecord)

```typescript
{
  id: number;
  levelType: string;       // "recharge" | "consumption"
  levelBefore: number;
  levelAfter: number;
  triggerType: string;     // "充值升级" | "消费升级" | "后台调整"
  triggerOrderNo: string;  // 关联单号
  time: string;
}
```

### 5.8 等级配置 (LevelConfig)

```typescript
{
  level: number;           // 1-9
  name: string;            // 展示名称
  minPoints: number;       // 积分下限
  maxPoints: number | null;// 积分上限 (V9 可为 null)
  icon: string;            // "vip" | "cigar"
  enabled: boolean;        // 启用状态
}
```

### 5.9 评论 (Review)

```typescript
{
  id: number;
  userId: number;
  userName: string;        // 用户昵称
  cigarId: number;
  cigarName: string;       // 雪茄名称
  rating: number;          // 评分 1-5
  comment: string;         // 评论内容
  orderId: string;         // 关联订单号
  time: string;            // 发布时间
  status: string;          // "visible" | "hidden" | "pending"
  rechargeLevel: number;   // 用户充值等级
  consumptionLevel: number;// 用户消费等级
}
```

---

## 六、公共/通用接口需求

### 6.1 文件上传

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| API-079 | `/api/upload/image` | POST | 通用图片上传，接收 `multipart/form-data`（字段名 `file`），返回 OSS URL |

### 6.2 消息推送（待后端实现）

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| — | `/api/push/notify` | POST | 触发推送通知（生日提醒、上新提醒、储值到账、订单状态变更）。前端暂无对应 API 函数 |

### 6.3 AI 相关接口（待后端实现，小程序端为主）

| # | 接口 | 方法 | 说明 |
|---|---|---|---|
| — | `/api/ai/refresh-features` | POST | 雪茄库数据变更后，触发 AI 特征库刷新。前端暂无对应 API 函数 |
| — | `/api/ai/tag-weights` | GET | 获取当前 AI 标签权重。前端暂无对应 API 函数 |

---

## 七、接口汇总清单

### 7.1 按模块统计

| 模块 | 接口数量 | 接口编号范围 |
|---|---|---|
| 登录鉴权 | 4 | API-001 ~ API-004 |
| 数据概览 | 4 | API-005 ~ API-008 |
| 商品管理(雪茄+饮品) | 10 | API-009 ~ API-018 |
| 雪茄库(在售+参考+标签) | 15 | API-019 ~ API-033 |
| 订单管理 | 6 | API-034 ~ API-039 |
| 会员管理 | 3 | API-040 ~ API-042 |
| 储值管理 | 11 | API-043 ~ API-053 |
| 海报管理 | 3 | API-054 ~ API-056 |
| 评价管理 | 6 | API-057 ~ API-062 |
| 账号管理 | 6 | API-063 ~ API-068 |
| 数据统计 | 5 | API-069 ~ API-073 |
| 系统设置 | 5 | API-074 ~ API-078 |
| 公共接口 | 1 | API-079 |
| **合计** | **79** | |

### 7.2 按 HTTP 方法统计

| 方法 | 数量 |
|---|---|
| GET | ~42 |
| POST | ~17 |
| PUT | ~14 |
| PATCH | ~2 |
| DELETE | ~9 |

### 7.3 完整接口清单（按编号）

| 编号 | 方法 | 路径 |
|---|---|---|
| API-001 | POST | `/api/admin/login` |
| API-002 | POST | `/api/auth/refresh` |
| API-003 | POST | `/api/admin/change-password` |
| API-004 | POST | `/api/auth/wechat-login` |
| API-005 | GET | `/api/admin/dashboard/overview` |
| API-006 | GET | `/api/admin/dashboard/sales-trend` |
| API-007 | GET | `/api/admin/dashboard/top-products` |
| API-008 | GET | `/api/admin/dashboard/recent-orders` |
| API-009 | GET | `/api/admin/products/cigars` |
| API-010 | GET | `/api/admin/products/cigars/{id}` |
| API-011 | POST | `/api/admin/products/cigars` |
| API-012 | PUT | `/api/admin/products/cigars/{id}` |
| API-013 | DELETE | `/api/admin/products/cigars/{id}` |
| API-014 | GET | `/api/admin/products/drinks` |
| API-015 | GET | `/api/admin/products/drinks/{id}` |
| API-016 | POST | `/api/admin/products/drinks` |
| API-017 | PUT | `/api/admin/products/drinks/{id}` |
| API-018 | DELETE | `/api/admin/products/drinks/{id}` |
| API-019 | GET | `/api/admin/library/instore` |
| API-020 | POST | `/api/admin/library/instore` |
| API-021 | PUT | `/api/admin/library/instore/{id}` |
| API-022 | DELETE | `/api/admin/library/instore/{id}` |
| API-023 | POST | `/api/admin/library/instore/sync` |
| API-024 | POST | `/api/admin/library/instore/import` |
| API-025 | GET | `/api/admin/library/instore/export` |
| API-026 | GET | `/api/admin/library/reference` |
| API-027 | POST | `/api/admin/library/reference` |
| API-028 | PUT | `/api/admin/library/reference/{id}` |
| API-029 | DELETE | `/api/admin/library/reference/{id}` |
| API-030 | GET | `/api/admin/library/tags` |
| API-031 | POST | `/api/admin/library/tags` |
| API-032 | PUT | `/api/admin/library/tags/{id}` |
| API-033 | DELETE | `/api/admin/library/tags/{id}` |
| API-034 | POST | `/api/orders` |
| API-035 | GET | `/api/admin/orders` |
| API-036 | GET | `/api/admin/orders/{id}` |
| API-037 | PATCH | `/api/admin/orders/{id}/status` |
| API-038 | POST | `/api/admin/orders/{id}/refund` |
| API-039 | POST | `/api/admin/orders/sync-meituan` |
| API-040 | GET | `/api/admin/members` |
| API-041 | GET | `/api/admin/members/{id}` |
| API-042 | GET | `/api/admin/members/stats` |
| API-043 | GET | `/api/admin/storedvalue/tiers` |
| API-044 | POST | `/api/admin/storedvalue/tiers` |
| API-045 | PUT | `/api/admin/storedvalue/tiers/{id}` |
| API-046 | DELETE | `/api/admin/storedvalue/tiers/{id}` |
| API-047 | PUT | `/api/admin/settings/{key}` |
| API-048 | GET | `/api/admin/storedvalue/transactions` |
| API-049 | POST | `/api/admin/storedvalue/transactions/adjust` |
| API-050 | GET | `/api/admin/storedvalue/recharge-orders` |
| API-051 | GET | `/api/admin/storedvalue/level-config` |
| API-052 | PUT | `/api/admin/storedvalue/level-config/{id}` |
| API-053 | POST | `/api/admin/storedvalue/level-config/recalculate` |
| API-054 | GET | `/api/admin/posters` |
| API-055 | GET | `/api/admin/posters/template` |
| API-056 | PUT | `/api/admin/posters/template` |
| API-057 | GET | `/api/admin/reviews` |
| API-058 | PATCH | `/api/admin/reviews/{id}/moderate` |
| API-059 | DELETE | `/api/admin/reviews/{id}` |
| API-060 | GET | `/api/admin/reviews/sensitive-words` |
| API-061 | POST | `/api/admin/reviews/sensitive-words` |
| API-062 | DELETE | `/api/admin/reviews/sensitive-words/{id}` |
| API-063 | GET | `/api/admin/accounts` |
| API-064 | GET | `/api/admin/accounts/{id}` |
| API-065 | POST | `/api/admin/accounts` |
| API-066 | PUT | `/api/admin/accounts/{id}` |
| API-067 | DELETE | `/api/admin/accounts/{id}` |
| API-068 | GET | `/api/admin/login-logs` |
| API-069 | GET | `/api/admin/statistics/sales` |
| API-070 | GET | `/api/admin/statistics/categories` |
| API-071 | GET | `/api/admin/statistics/users` |
| API-072 | GET | `/api/admin/statistics/storedvalue` |
| API-073 | GET | `/api/admin/statistics/export` |
| API-074 | GET | `/api/admin/settings` |
| API-075 | PUT | `/api/admin/settings/{key}` |
| API-076 | POST | `/api/admin/settings/meituan/test` |
| API-077 | GET | `/api/admin/settings/logs` |
| API-078 | GET | `/api/admin/settings/public/store-info` |
| API-079 | POST | `/api/upload/image` |

---

## 八、关键技术对接要点

### 8.1 鉴权方案（前端已实现）

- **JWT 双 Token 模式**：Access Token + Refresh Token
- 前端 Axios 请求拦截器自动携带 `Authorization: Bearer <accessToken>`
- 响应拦截器自动处理 Token 过期（code=1001）：自动调用 `/api/auth/refresh` 续期，支持并发请求排队
- Token 刷新失败自动清除登录态并跳转 `/login`
- code=1006 时自动设置 `must_change_password` 标记并跳转改密页
- 登录失败计数建议后端用 Redis 实现

### 8.2 幂等键机制（前端已实现）

- `createOrder` 和 `refundOrder` 请求自动携带 `Idempotency-Key` header（UUID v4 格式）
- `adjustBalance` 同样携带幂等键
- 后端应据此实现幂等性保证，防止重复扣款/退款

### 8.2 数据格式约定

- **金额单位**：前端 Mock 中以"元"为单位，建议后端统一以"分"存储，API 响应中转换为"元"（保留 2 位小数或整数）
- **日期时间**：统一使用 `YYYY-MM-DD HH:mm:ss` 字符串格式
- **分页格式**：统一请求 `{ page, pageSize }`，响应 `{ list: [], total: number }`
- **状态枚举**：全部使用字符串常量（如 `"active"`, `"pending"`），不传数字

### 8.3 双等级系统核心逻辑

这是项目最复杂的业务逻辑，需后端重点关注：

1. **充值等级积分** = 累计成功充值金额（每 1 元 = 1 积分）
2. **消费等级积分** = 累计已完成订单实付金额（每 1 元 = 1 积分）
3. 等级区间默认每 1000 分一级（V1: 0-999, ..., V9: 8000+）
4. 后台修改等级区间后需触发全量重算（异步任务，记录任务结果）
5. 等级变更需记录日志（用户 UID、等级类型、变更前后等级、触发来源、时间）
6. 订单取消/退款需支持消费积分回退

### 8.4 美团收银对接

- 配置项：App ID、App Secret、API 接口地址
- 订单数据实时同步（商品信息、金额、用户信息、支付方式）
- 订单状态双向同步
- 支持手动同步按钮和自动同步开关
- 需提供"测试连接"接口验证配置有效性

### 8.5 文件处理

- LOGO 上传：支持 PNG/SVG，建议透明背景
- Excel 批量导入：支持 `.xlsx`，自动校验必填项和重复数据，返回成功/失败明细
- Excel 导出：订单、会员、流水、统计报表
- 海报图片：由小程序端生成，管理端仅查看

### 8.6 操作日志

以下操作必须记录到系统日志：
- 管理员登录/登出
- 商品/雪茄库的增删改
- 会员余额手动调整
- 等级配置修改
- 敏感词增删
- 评论屏蔽/删除
- 系统配置修改

日志字段：时间、操作人、操作内容、级别(info/warning/error)、IP 地址

---

## 九、前端"待后端接入"的占位点汇总

以下为当前代码中使用演示提示或调用 API 但后端尚未实现的功能点：

| 页面 | 功能点 | 当前前端行为 | 对应接口 |
|---|---|---|---|
| 登录 | 账号锁定 | 前端无锁定逻辑（建议后端 Redis 实现） | API-001 |
| 雪茄商品管理 | 导出按钮 | `window.open('/api/admin/export/cigars')` | 待实现 |
| 饮品商品管理 | 导出按钮 | `window.open('/api/admin/export/drinks')` | 待实现 |
| 在售雪茄库 | 强制同步 | `syncInstore()` 已调用 API | API-023 |
| 在售雪茄库 | 批量导入 | `message.info('请选择 Excel 文件(.xlsx)进行批量导入')` | API-024 |
| 在售雪茄库 | 导出备份 | `window.open('/api/admin/library/instore/export')` | API-025 |
| 在售雪茄库 | 保存并同步 | 前端调用 API 后本地更新 | API-020/021 |
| 风味标签 | 标签变更→AI实时生效 | 前端调用 API 后本地更新 | API-031/032/033 |
| 订单管理 | 同步美团 | `syncMeituan()` 已调用 API | API-039 |
| 订单管理 | 导出 Excel | 前端预留按钮（导出逻辑待接入） | 待实现 |
| 海报管理 | 海报预览 | `window.open(posterUrl)` | 待实现 |
| 海报管理 | LOGO 上传 | 前端 Upload 组件已配置，调用 `uploadImage()` | API-079 |
| 海报管理 | 海报生成 | 由小程序端调用，管理端仅查看 | 待实现 |
| 评价管理 | 评分总览 | `getReviews()` 已调用 API | API-057 |
| 账号管理 | 修改密码 | 由 `changePassword()` 实现（auth 模块） | API-003 |
| 数据统计 | 导出报表 | `exportStatistics()` 已调用 API | API-073 |
| 系统设置 | LOGO 上传 | 前端 Upload 组件已配置，调用 `uploadImage()` | API-079 |
| 系统设置 | 测试美团连接 | `testMeituanConnection()` 已调用 API | API-076 |
| 储值管理 | 折扣与提醒配置 | `updateSetting('storedvalue', data)` 已调用 API | API-075 |
| 储值管理 | 重新计算等级 | `recalculateLevels(type)` 已调用 API | API-053 |
| 储值管理 | 手动调整余额 | `adjustBalance(data)` 已调用 API（含幂等键） | API-049 |
| 储值管理 | 等级配置编辑 | `updateLevelConfig(id, data)` 已调用 API | API-052 |
| 全局 | 消息推送 | 暂无前端 API 函数 | 待实现 |
| 全局 | AI 特征刷新 | 暂无前端 API 函数 | 待实现 |

---

## 十、附录：Ant Design 6 组件使用清单

后端若需在 Swagger 文档或内部管理工具中做 UI，可参考前端使用的 Ant Design 组件：

`Layout`, `Menu`, `Table`, `Form`, `Input`, `InputNumber`, `Input.Password`, `Select`, `Switch`, `Button`, `Modal`, `Drawer`, `Tabs`, `Tag`, `Badge`, `Avatar`, `Dropdown`, `Popconfirm`, `Upload`, `Alert`, `Divider`, `Progress`, `Rate`(评分星), `Tooltip`, `Breadcrumb`, `Space`, `Slider`, `message`(全局提示)

---

> **文档编写依据：**  
> - 前端源码：`D:\munto\code\WORK\CigarPro\Cigar_admin\src\` 全部文件  
> - 需求文档：`微信小程序雪茄俱乐部2.0需求文档_融合会员等级版.md`  
> - 生成时间：2026-04-29
