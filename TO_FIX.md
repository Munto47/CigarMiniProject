# CigarPro 用户端修复计划

> 生成日期：2026-05-05 | 完成日期：2026-05-05

---

## P0 阻断性 Bug

- [x] **BUG-1** `app.js` 缺少登录初始化，所有鉴权接口永远失效
- [ ] **BUG-2** 美团支付返回 `redirectUrl` 后无跳转逻辑，支付流程断裂（需后端配合 + webview 页面）
- [ ] **BUG-3** 海报二维码为空占位，无实际生成（需后端集成微信 getwxacodeunlimit）
- [x] **BUG-4** 评价列表无分页，大量评价时首屏卡死
- [x] **BUG-5** `getTabBar()` 统一通过 `app.updateCartBadge()` 调用，消除 null 崩溃风险

## P1 严重缺陷

- [x] **DEF-1** AI 推荐问卷加载失败增加 `loadError` 状态 + 重试按钮
- [x] **DEF-2** 会员中心增加未登录引导页，明细按钮补全 `bindtap`
- [x] **DEF-3** 幂等 key 持久化到 Storage，与购物车绑定，支付成功后清除
- [x] **DEF-4** 充值微信支付 fail 回调区分用户取消与支付失败，给出对应提示
- [x] **DEF-5** 订单/储值明细 `hasMore` 改为 `merged.length < total`，修复分页递增
- [x] **DEF-6** 历史记录筛选移除"收藏"选项（暂无 API），保留"全部/已购/生成海报"
- [x] **DEF-7** 移除不存在的音效文件引用，保留振动反馈
- [x] **DEF-8** token 刷新 catch 分支加 `refreshQueue = []`，修复内存泄漏

## P2 体验缺陷

- [x] **EXP-1** 配饮/相关推荐用 `wx:if` 条件渲染，无数据时不显示空块
- [ ] **EXP-2** AI 推荐支持返回修改答案（下一期）
- [x] **EXP-3** 余额不足弹窗提示差额并提供"去充值"快捷跳转
- [x] **EXP-4** 待支付订单增加"取消订单"按钮，调用 `cancelOrder` 后刷新
- [x] **EXP-5** 历史记录改为分页（pageSize=30）+ `onReachBottom` 滚动追加
- [x] **EXP-6** 储值明细页顶部增加当前余额卡片
- [x] **EXP-7** 评价提交成功后 toast 反馈并刷新列表（BUG-4 一并修复）
- [x] **EXP-8** index/history/club/cigar-detail/orders/member-transactions 全部开启下拉刷新
- [x] **EXP-9** 购物车空状态区分未登录（引导登录）与已登录无商品（引导探索）

## P3 优化项

- [x] **OPT-1** `cartCount` 统一到 `app.globalData` + `updateCartBadge()` 单一数据源
- [ ] **OPT-2** 雪茄详情内存缓存（下一期）
- [ ] **OPT-3** 充值档位预加载（下一期）
- [ ] **OPT-4** Canvas 海报绘制错误处理（下一期）
- [x] **OPT-5** `BASE_URL` 通过 `__wxConfig.envVersion` 自动判断开发/生产
- [ ] **OPT-6** `flavor-radar` 防抖重绘（下一期）
- [x] **OPT-7** `member-level-badge` 图片加 `lazy-load`
- [x] **OPT-8** 问卷数据 `onShow` 已有 `length === 0` 保护，确认缓存逻辑正确

---

## 修复进度

| ID | 状态 | 说明 |
|----|------|------|
| BUG-1 | ✅ 已修 | app.js onLaunch 自动登录 |
| BUG-2 | ⏳ 待后端 | 需 webview 页面 + 后端美团集成 |
| BUG-3 | ⏳ 待后端 | 需后端调用微信二维码接口 |
| BUG-4 | ✅ 已修 | 评价列表分页，onReachBottom 追加 |
| BUG-5 | ✅ 已修 | 统一 updateCartBadge，消除 null 调用 |
| DEF-1 | ✅ 已修 | loadError + 重试按钮 |
| DEF-2 | ✅ 已修 | 未登录引导卡片 + doLogin |
| DEF-3 | ✅ 已修 | 幂等 key 持久化 Storage |
| DEF-4 | ✅ 已修 | fail 回调区分取消/失败 |
| DEF-5 | ✅ 已修 | hasMore 改为累计数量比较 |
| DEF-6 | ✅ 已修 | 移除收藏筛选 tab |
| DEF-7 | ✅ 已修 | 移除音效引用 |
| DEF-8 | ✅ 已修 | catch 分支清空 refreshQueue |
| EXP-1 | ✅ 已修 | wx:if 条件渲染 |
| EXP-2 | ⏳ 下一期 | |
| EXP-3 | ✅ 已修 | 余额不足弹窗 + 去充值按钮 |
| EXP-4 | ✅ 已修 | 取消订单按钮 + cancelOrder |
| EXP-5 | ✅ 已修 | 历史记录分页 + 滚动追加 |
| EXP-6 | ✅ 已修 | 明细页顶部余额卡片 |
| EXP-7 | ✅ 已修 | toast + 刷新评价列表 |
| EXP-8 | ✅ 已修 | 6个页面开启下拉刷新 |
| EXP-9 | ✅ 已修 | 区分未登录/无商品两种空状态 |
| OPT-1 | ✅ 已修 | cartCount 全局化 |
| OPT-2 | ⏳ 下一期 | |
| OPT-3 | ⏳ 下一期 | |
| OPT-4 | ⏳ 下一期 | |
| OPT-5 | ✅ 已修 | __wxConfig.envVersion 自动切换 |
| OPT-6 | ⏳ 下一期 | |
| OPT-7 | ✅ 已修 | lazy-load 加到徽章图片 |
| OPT-8 | ✅ 已修 | 已有 length===0 保护，逻辑正确 |
