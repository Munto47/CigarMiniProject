CigarPro 代码审查报告
一、致命问题（上线前必须修复，否则核心功能直接瘫痪）
[FATAL-1] 微信支付签名算法根本性错误
src/storedvalue/wechat-pay.service.ts — 代码声明使用 WECHATPAY2-SHA256-RSA2048（微信 v3 标准），但实际用的是 HMAC-SHA256，且代码注释本身已承认这是占位实现。微信服务器会直接拒绝所有充值下单请求，整个支付链路完全不可用。根本原因是缺少商户 RSA 私钥实现，需要从微信支付商户平台下载 .pem 私钥文件并实现真正的 RSA 签名。
[FATAL-2] 受限 Token 的权限绕过
src/auth/admin-auth.service.ts — 首次登录强制修密码时下发的 scope: 'change_password' 受限 token，在 JwtStrategy 和 PermissionsGuard 中从未被检查。持有此 token 的管理员可以直接调用所有管理接口（退款、查数据、改配置），权限管控形同虚设。
[FATAL-3] 管理员登录暴力破解保护完全失效
src/auth/admin-auth.service.ts — Admin 表虽定义了 lockedUntil 字段，但 login() 方法从未读取也从未写入它。失败次数计数、账号锁定逻辑均未实现。全局限流是每分钟 60 次，攻击者可无限次暴力破解任意管理员账号。
[FATAL-4] Prometheus 监控接口完全公开
src/metrics/metrics.controller.ts — /metrics 被标记 @Public()，无需任何认证即可访问，会暴露订单量、支付金额、用户数等详细运营数据。
[FATAL-5] 退款时积分扣回数值错误 100 倍
src/order/refund.service.ts 第 164 行 — 退款扣积分时直接用 amountCents（单位：分），而正常充值/消费的积分计算都正确地做了 ÷100（1元=1分）。退款 100 元 = 10000 分，会把用户积分直接清空乃至触发等级错误降级。修复一行代码：const pointsDelta = Math.floor(amountCents / 100) 即可。

二、严重问题
[SEVERE-1] 充值回调无行级锁，微信重复回调会导致双倍入账
src/storedvalue/recharge.service.ts — 没有 FOR UPDATE 行级锁，微信在网络异常时会重试回调，两个并发请求都能通过状态检查，造成余额和积分都被记入两次。对比：余额支付（payment.service.ts）正确使用了行级锁。
[SEVERE-2] 美团支付是完整 Stub，上线无法收款
src/order/meituan.service.ts — pushOrder() 返回假的美团订单号，支付跳转链接是 meituan-mock.com，美团回调处理也缺少事务和行级锁保护。选择美团支付的订单将永远停留在 pending 状态直到超时关闭。
[SEVERE-3] 对账服务平台侧数据是自身数据的镜像，永远不会发现差异
src/reconciliation/reconciliation.service.ts — 对账逻辑里 platformCount = ourCount，自己和自己比永远平衡。且定时任务方法没有 @Cron 装饰器，根本不会自动执行。
[SEVERE-4] Excel 导出无数据量上限，大数据量会直接 OOM 崩溃
src/export/export.service.ts — findMany() 没有任何 take 限制，一次导出全量订单（含关联明细）会把所有数据加载进内存。
[SEVERE-5] 文件上传无服务端文件类型校验（仅信任 Content-Type 请求头）
src/upload/upload.controller.ts — 未做魔数（magic bytes）校验，攻击者可伪造 Content-Type 上传任意类型文件。
[SEVERE-6] 微信支付回调验签消息构造错误，生产验签可能失败
src/storedvalue/wechat-callback.controller.ts — 验签消息体用 JSON.stringify(rawBody) 而非原始 HTTP 报文字节，字段顺序/空格/Unicode 差异都会导致验签失败。
[SEVERE-7] 管理员余额调整接口 adminName 字段传入了用户 ID 而非姓名
src/storedvalue/storedvalue-admin.controller.ts 第 39-40 行 — 操作审计日志中记录的操作人是 ID 字符串，而非管理员姓名，审计记录失去意义。

三、中等问题（摘要）

订单创建清空整个购物车，而非仅清除下单商品（order.service.ts）
OrderStateMachine 定义了但从未被实际调用，状态变更各处自行判断，存在状态遗漏
Dashboard 统计时区错误，服务器用 UTC，数据库用北京时间，报表数据每天差 8 小时
库存释放无负数保护，重复触发可能让 stock_locked 变负
等级重算进度存于内存，重启后进度丢失，多实例部署时进度查询接口也只返回空字符串（未调用实际方法）
CreateOrderDto.remark 使用了 @Max(255) 而非 @MaxLength(255)，字符串长度验证完全无效
schema.prisma 末尾 ReconciliationReport 模型截断，最后一行是孤立的 @ 符号


四、你目前缺少的外部信息/配置
这些是项目运行前必须获取的，部分涉及向微信官方申请：
需要获取的内容从哪里获取重要程度商户 RSA 私钥 .pem 文件微信支付商户平台 → API 安全 → 生成/下载私钥⚠️ 没有则支付完全不可用微信平台公钥证书（WECHAT_PLATFORM_CERT）微信支付商户平台下载，用于回调验签⚠️ 没有则所有支付回调无法验签正式小程序 AppID + AppSecret微信公众平台 → 开发 → 开发管理⚠️ 没有则用户无法登录微信支付商户号（WECHAT_MCH_ID）微信支付商户平台⚠️ 没有则支付无法发起API v3 密钥（WECHAT_API_V3_KEY，32字节）微信支付商户平台 → 账户设置 → API 安全⚠️ 没有则充值回调解密失败正式支付回调地址（公网 HTTPS 域名）需要已备案域名 + SSL 证书⚠️ 微信支付回调只接受 HTTPS美团商户相关凭据需向美团商家平台申请，目前整个对接是 Stub若需此功能腾讯云 ASR 密钥用于语音风味分析（二期功能）若需此功能

修复优先级建议
上线前最低限度必须修复的是：FATAL-1（支付签名）、FATAL-5（退款积分错误）、FATAL-2（Token 权限绕过）、FATAL-3（登录暴力破解）、SEVERE-1（充值双倍入账）。其余可在上线后分批修复，但对账（SEVERE-3）和美团支付（SEVERE-2）若要真正使用，需从零实现对接。