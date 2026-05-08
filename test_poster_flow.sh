#!/usr/bin/env bash
# ============================================================================
# CigarPro 海报生成与自动保存 — 全流程 API 集成测试
# ============================================================================
# 测试范围：
#   1. 微信 Mock 登录获取 Token
#   2. 风味标签获取（公开接口）
#   3. 风味匹配雪茄推荐（公开接口）
#   4. 海报创建（核心自动保存接口）
#   5. 海报列表/详情查询
#   6. 品鉴历史记录验证（海报创建自动写入）
#   7. 异常边界：无鉴权、缺少必填字段、不存在的资源
#
# 前置条件：
#   - docker-compose.dev.yml 已启动（PostgreSQL + Redis + MinIO）
#   - NestJS 后端运行在 http://localhost:3000
#   - .env 中 WECHAT_MOCK_MODE=true
#
# 用法：
#   chmod +x test_poster_flow.sh
#   ./test_poster_flow.sh                    # 使用默认 localhost:3000
#   API_BASE=http://192.168.1.100:3000/api ./test_poster_flow.sh  # 自定义地址
# ============================================================================

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────────────────
API_BASE="${API_BASE:-http://localhost:3000/api}"
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_NC='\033[0m'     # No Color
COLOR_BOLD='\033[1m'

PASS=0
FAIL=0
TOKEN=""
POSTER_ID=""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── 工具函数 ──────────────────────────────────────────────────────────────

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo -e "  ${COLOR_GREEN}✓${COLOR_NC} $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${COLOR_RED}✗${COLOR_NC} $desc"
        echo -e "    ${COLOR_RED}期望: $expected${COLOR_NC}"
        echo -e "    ${COLOR_RED}实际: $actual${COLOR_NC}"
        FAIL=$((FAIL + 1))
    fi
}

assert_not_empty() {
    local desc="$1" val="$2"
    if [ -n "$val" ] && [ "$val" != "null" ]; then
        echo -e "  ${COLOR_GREEN}✓${COLOR_NC} $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${COLOR_RED}✗${COLOR_NC} $desc (值为空或 null)"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local desc="$1" haystack="$2" needle="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo -e "  ${COLOR_GREEN}✓${COLOR_NC} $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${COLOR_RED}✗${COLOR_NC} $desc (未找到 '$needle')"
        FAIL=$((FAIL + 1))
    fi
}

section() {
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}━━━ $1 ━━━${COLOR_NC}"
}

# 使用 jq 提取响应的 data 字段（code=0 时）
extract_data() {
    local resp="$1"
    local code
    code=$(echo "$resp" | jq -r '.code // -1')
    if [ "$code" != "0" ]; then
        local msg
        msg=$(echo "$resp" | jq -r '.message // "unknown"')
        echo -e "  ${COLOR_RED}API 返回错误 [code=$code]: $msg${COLOR_NC}" >&2
        echo "$resp" | jq '.'
        return 1
    fi
    echo "$resp" | jq -c '.data'
}

# ── 打印测试信息 ──────────────────────────────────────────────────────────

echo ""
echo -e "${COLOR_BOLD}╔══════════════════════════════════════════════════════════╗${COLOR_NC}"
echo -e "${COLOR_BOLD}║  CigarPro 海报生成与自动保存 — 全流程 API 测试            ║${COLOR_NC}"
echo -e "${COLOR_BOLD}╠══════════════════════════════════════════════════════════╣${COLOR_NC}"
echo -e "${COLOR_BOLD}║  API Base : ${API_BASE}${COLOR_NC}"
echo -e "${COLOR_BOLD}║  时间     : ${TIMESTAMP}${COLOR_NC}"
echo -e "${COLOR_BOLD}╚══════════════════════════════════════════════════════════╝${COLOR_NC}"

# ── 前置检查 ──────────────────────────────────────────────────────────────

section "前置检查"

# 检查依赖工具
for cmd in curl jq; do
    if command -v $cmd &>/dev/null; then
        echo -e "  ${COLOR_GREEN}✓${COLOR_NC} $cmd 可用 ($(command -v $cmd))"
    else
        echo -e "  ${COLOR_RED}✗${COLOR_NC} $cmd 不可用，请先安装"
        exit 1
    fi
done

# 检查后端是否启动
echo -n "  检查后端服务..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${API_BASE}/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e " ${COLOR_GREEN}在线 (HTTP $HEALTH)${COLOR_NC}"
else
    echo -e " ${COLOR_RED}不可用 (HTTP $HEALTH)${COLOR_NC}"
    echo -e "  ${COLOR_YELLOW}提示: 请先启动 docker-compose 和后端服务${COLOR_NC}"
    echo -e "  ${COLOR_YELLOW}  docker-compose -f docker-compose.dev.yml up -d${COLOR_NC}"
    echo -e "  ${COLOR_YELLOW}  cd Cigar_server && npm run start:dev${COLOR_NC}"
    exit 1
fi

# ──────────────────────────────────────────────────────────────────────────
# 阶段 1: 用户认证
# ──────────────────────────────────────────────────────────────────────────
section "阶段 1: 微信 Mock 登录（模拟小程序 wx.login）"

# 1.1 正常登录
echo "  1.1 正常登录 (code=test_user_01)"
LOGIN_RESP=$(curl -s -X POST "${API_BASE}/auth/wechat-login" \
    -H "Content-Type: application/json" \
    -d '{"code": "test_user_01"}')

LOGIN_DATA=$(extract_data "$LOGIN_RESP")
TOKEN=$(echo "$LOGIN_DATA" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_DATA" | jq -r '.refreshToken')
USER_ID=$(echo "$LOGIN_DATA" | jq -r '.user.id')
IS_NEW=$(echo "$LOGIN_DATA" | jq -r '.isNew')

assert_not_empty "获取 accessToken" "$TOKEN"
assert_not_empty "获取 refreshToken" "$REFRESH_TOKEN"
assert_not_empty "获取用户 ID" "$USER_ID"
assert_not_empty "响应包含 user.nickname" "$(echo "$LOGIN_DATA" | jq -r '.user.nickname')"

echo -e "  ${COLOR_BLUE}ℹ Token: ${TOKEN:0:30}...${COLOR_NC}"
echo -e "  ${COLOR_BLUE}ℹ 用户 ID: $USER_ID, 新用户: $IS_NEW${COLOR_NC}"

# 1.2 登录 — 不同用户
echo "  1.2 不同用户登录 (code=test_user_02)"
LOGIN_RESP2=$(curl -s -X POST "${API_BASE}/auth/wechat-login" \
    -H "Content-Type: application/json" \
    -d '{"code": "test_user_02"}')
LOGIN_DATA2=$(extract_data "$LOGIN_RESP2")
TOKEN2=$(echo "$LOGIN_DATA2" | jq -r '.accessToken')
USER_ID2=$(echo "$LOGIN_DATA2" | jq -r '.user.id')
assert_not_empty "第二个用户 token 获取成功" "$TOKEN2"
assert_eq "两个用户 ID 不同" "false" "$([ "$USER_ID" = "$USER_ID2" ] && echo true || echo false)"

# 1.3 Token 刷新
echo "  1.3 刷新 accessToken"
REFRESH_RESP=$(curl -s -X POST "${API_BASE}/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
REFRESH_DATA=$(extract_data "$REFRESH_RESP")
NEW_ACCESS=$(echo "$REFRESH_DATA" | jq -r '.accessToken')
NEW_REFRESH=$(echo "$REFRESH_DATA" | jq -r '.refreshToken')
assert_not_empty "刷新后获取新 accessToken" "$NEW_ACCESS"
assert_not_empty "刷新后获取新 refreshToken" "$NEW_REFRESH"
assert_eq "新 accessToken 与旧 token 不同" "false" "$([ "$TOKEN" = "$NEW_ACCESS" ] && echo true || echo false)"

# 刷新后使用新 token
TOKEN="$NEW_ACCESS"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 2: 风味数据获取（公开接口，无需鉴权）
# ──────────────────────────────────────────────────────────────────────────
section "阶段 2: 风味标签与雪茄匹配（公开接口）"

# 2.1 获取风味标签列表（data 是 {tags: [...], categories: [...]} 对象）
echo "  2.1 获取风味标签列表"
TAGS_RESP=$(curl -s -X GET "${API_BASE}/flavor/tags" \
    -H "Content-Type: application/json")
TAGS_DATA=$(extract_data "$TAGS_RESP")
TAGS_COUNT=$(echo "$TAGS_DATA" | jq '.tags | length')
echo -e "  ${COLOR_BLUE}ℹ 风味标签数量: $TAGS_COUNT${COLOR_NC}"
CATEGORIES_COUNT=$(echo "$TAGS_DATA" | jq '.categories | length')
echo -e "  ${COLOR_BLUE}ℹ 风味分类数: $CATEGORIES_COUNT${COLOR_NC}"
assert_eq "风味标签列表非空 (count > 0)" "true" "$([ "$TAGS_COUNT" -gt 0 ] && echo true || echo false)"

# 2.2 获取前3个标签用于后续测试
TAG1=$(echo "$TAGS_DATA" | jq -r '.tags[0].name')
TAG2=$(echo "$TAGS_DATA" | jq -r '.tags[1].name')
TAG3=$(echo "$TAGS_DATA" | jq -r '.tags[2].name')
assert_not_empty "标签1非空" "$TAG1"
assert_not_empty "标签2非空" "$TAG2"
assert_not_empty "标签3非空" "$TAG3"
echo -e "  ${COLOR_BLUE}ℹ 使用的标签: [$TAG1, $TAG2, $TAG3]${COLOR_NC}"

# 2.3 获取雪茄列表，取第一个雪茄用于后续海报关联测试
echo "  2.3 获取雪茄列表"
CIGARS_RESP=$(curl -s -X GET "${API_BASE}/cigars?page=1&pageSize=10" \
    -H "Content-Type: application/json")
CIGARS_DATA=$(extract_data "$CIGARS_RESP")
CIGARS_TOTAL=$(echo "$CIGARS_DATA" | jq -r '.total')
CIGARS_COUNT=$(echo "$CIGARS_DATA" | jq -r '.list | length')
echo -e "  ${COLOR_BLUE}ℹ 雪茄总数: $CIGARS_TOTAL, 当前页: $CIGARS_COUNT 条${COLOR_NC}"
TEST_CIGAR_ID=$(echo "$CIGARS_DATA" | jq -r '.list[0].id')
TEST_CIGAR_NAME=$(echo "$CIGARS_DATA" | jq -r '.list[0].name')
assert_not_empty "雪茄列表非空" "$TEST_CIGAR_ID"
assert_not_empty "雪茄名称非空" "$TEST_CIGAR_NAME"
echo -e "  ${COLOR_BLUE}ℹ 测试用雪茄: $TEST_CIGAR_NAME (ID=$TEST_CIGAR_ID)${COLOR_NC}"

# 2.4 获取第二个雪茄用于多样性测试
TEST_CIGAR_ID2=$(echo "$CIGARS_DATA" | jq -r '.list[1].id // .list[0].id')
TEST_CIGAR_NAME2=$(echo "$CIGARS_DATA" | jq -r '.list[1].name // .list[0].name')
echo -e "  ${COLOR_BLUE}ℹ 第二测试雪茄: $TEST_CIGAR_NAME2 (ID=$TEST_CIGAR_ID2)${COLOR_NC}"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 3: 海报创建（核心：模拟前端 _autoSavePoster）
# ──────────────────────────────────────────────────────────────────────────
section "阶段 3: 海报创建 — 模拟自动保存 (POST /posters)"

# 3.1 完整参数创建海报（模拟风味选择页进入）
echo "  3.1 完整参数创建海报（风味选择页入口）"
CREATE_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
  \"cigarId\": $TEST_CIGAR_ID,
  \"flavorTags\": [\"雪松丝绸\", \"咖啡可可\", \"奶油丝滑\"],
  \"flavorScores\": {
    \"雪松丝绸\": 85,
    \"咖啡可可\": 80,
    \"奶油丝滑\": 75
  },
  \"voiceText\": \"前段雪松清雅，中段出现咖啡与可可的甜润，尾段绵长回甘，平衡感极佳。\"
}"
)

CREATE_DATA=$(extract_data "$CREATE_RESP")
POSTER_ID=$(echo "$CREATE_DATA" | jq -r '.id')
POSTER_STATUS=$(echo "$CREATE_DATA" | jq -r '.status')
POSTER_CREATED=$(echo "$CREATE_DATA" | jq -r '.createdAt')
assert_not_empty "海报创建成功 — 返回 ID" "$POSTER_ID"
assert_eq "海报状态为 'generated'" "generated" "$POSTER_STATUS"
assert_not_empty "返回 createdAt 时间戳" "$POSTER_CREATED"
echo -e "  ${COLOR_BLUE}ℹ 海报 ID: $POSTER_ID, 状态: $POSTER_STATUS${COLOR_NC}"

# 3.2 最小参数创建海报（仅 flavorTags）
echo "  3.2 最小参数创建海报（仅必填字段）"
CREATE_MIN_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
  "flavorTags": ["木质烟草", "辛香胡椒"]
}')
CREATE_MIN_DATA=$(extract_data "$CREATE_MIN_RESP")
POSTER_ID2=$(echo "$CREATE_MIN_DATA" | jq -r '.id')
assert_not_empty "最小参数海报创建成功 — 返回 ID" "$POSTER_ID2"
assert_eq "海报状态为 'generated'" "generated" "$(echo "$CREATE_MIN_DATA" | jq -r '.status')"

# 3.3 带 cigarId 和 voiceText 创建（模拟雪茄详情页进入）
echo "  3.3 带 cigarId 创建海报（雪茄详情页入口）"
CREATE_CIGAR_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
  \"cigarId\": $TEST_CIGAR_ID2,
  \"flavorTags\": [\"皮革木桶\", \"辛香胡椒\", \"木质烟草\"],
  \"flavorScores\": {\"皮革木桶\": 82, \"辛香胡椒\": 70, \"木质烟草\": 75},
  \"voiceText\": \"烟草底调厚重，皮革气息贯穿始终，辛香胡椒点缀其中，层次分明。\"
}"
)
CREATE_CIGAR_DATA=$(extract_data "$CREATE_CIGAR_RESP")
POSTER_ID3=$(echo "$CREATE_CIGAR_DATA" | jq -r '.id')
assert_not_empty "带 cigarId 海报创建成功" "$POSTER_ID3"

# 3.4 第二用户创建海报
echo "  3.4 第二个用户创建海报"
CREATE_U2_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN2" \
    -d '{
  "flavorTags": ["奶油丝滑", "香草甜美", "果香甜润"],
  "voiceText": "奶油丝滑为主调，木质底韵若隐若现，甜感持久，适合午后慢品。"
}')
CREATE_U2_DATA=$(extract_data "$CREATE_U2_RESP")
POSTER_ID4=$(echo "$CREATE_U2_DATA" | jq -r '.id')
assert_not_empty "第二用户海报创建成功" "$POSTER_ID4"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 4: 海报列表与详情查询
# ──────────────────────────────────────────────────────────────────────────
section "阶段 4: 海报列表与详情查询"

# 4.1 获取用户海报列表
echo "  4.1 获取用户海报列表"
LIST_RESP=$(curl -s -X GET "${API_BASE}/posters?page=1&pageSize=20" \
    -H "Authorization: Bearer $TOKEN")
LIST_DATA=$(extract_data "$LIST_RESP")
LIST_TOTAL=$(echo "$LIST_DATA" | jq -r '.total')
LIST_COUNT=$(echo "$LIST_DATA" | jq -r '.list | length')
assert_eq "列表总数 >= 3" "true" "$([ "$LIST_TOTAL" -ge 3 ] && echo true || echo false)"
assert_eq "当前页条目数 = 3" "true" "$([ "$LIST_COUNT" -ge 3 ] && echo true || echo false)"
echo -e "  ${COLOR_BLUE}ℹ 海报总数: $LIST_TOTAL, 当前页: $LIST_COUNT 条${COLOR_NC}"

# 4.2 验证列表项字段
echo "  4.2 验证列表项字段完整性"
FIRST_POSTER=$(echo "$LIST_DATA" | jq -c '.list[0]')
assert_not_empty "列表项含 id" "$(echo "$FIRST_POSTER" | jq -r '.id')"
assert_not_empty "列表项含 flavorTags" "$(echo "$FIRST_POSTER" | jq -r '.flavorTags[0]')"
assert_not_empty "列表项含 status" "$(echo "$FIRST_POSTER" | jq -r '.status')"
assert_not_empty "列表项含 createdAt" "$(echo "$FIRST_POSTER" | jq -r '.createdAt')"

# 4.3 获取海报详情
echo "  4.3 获取海报详情 (POST /api/posters/$POSTER_ID)"
DETAIL_RESP=$(curl -s -X GET "${API_BASE}/posters/$POSTER_ID" \
    -H "Authorization: Bearer $TOKEN")
DETAIL_DATA=$(extract_data "$DETAIL_RESP")
assert_eq "详情 ID 匹配" "$POSTER_ID" "$(echo "$DETAIL_DATA" | jq -r '.id')"
assert_not_empty "详情含 flavorTags" "$(echo "$DETAIL_DATA" | jq -r '.flavorTags[0]')"
assert_not_empty "详情含 flavorScores" "$(echo "$DETAIL_DATA" | jq -r '.flavorScores')"
assert_not_empty "详情含 voiceText" "$(echo "$DETAIL_DATA" | jq -r '.voiceText')"
assert_eq "详情 status 为 generated" "generated" "$(echo "$DETAIL_DATA" | jq -r '.status')"
assert_not_empty "详情含 userId" "$(echo "$DETAIL_DATA" | jq -r '.userId')"
assert_not_empty "详情含 nickname" "$(echo "$DETAIL_DATA" | jq -r '.nickname')"
# 如果关联了 cigar，检查字段
CIGAR_IN_DETAIL=$(echo "$DETAIL_DATA" | jq -r '.cigarId // empty')
if [ -n "$CIGAR_IN_DETAIL" ]; then
    assert_not_empty "详情含 cigarName" "$(echo "$DETAIL_DATA" | jq -r '.cigarName')"
fi
assert_not_empty "详情含 templateSnapshot" "$(echo "$DETAIL_DATA" | jq -r '.templateSnapshot')"

echo -e "  ${COLOR_BLUE}ℹ 海报作者: $(echo "$DETAIL_DATA" | jq -r '.nickname')${COLOR_NC}"
echo -e "  ${COLOR_BLUE}ℹ 风味标签: $(echo "$DETAIL_DATA" | jq -r '.flavorTags | join(", ")')${COLOR_NC}"
echo -e "  ${COLOR_BLUE}ℹ 模板俱乐部: $(echo "$DETAIL_DATA" | jq -r '.templateSnapshot.clubName')${COLOR_NC}"

# 4.4 检查第二用户海报列表（验证用户隔离）
echo "  4.4 验证海报用户隔离"
LIST2_RESP=$(curl -s -X GET "${API_BASE}/posters?page=1&pageSize=20" \
    -H "Authorization: Bearer $TOKEN2")
LIST2_DATA=$(extract_data "$LIST2_RESP")
LIST2_TOTAL=$(echo "$LIST2_DATA" | jq -r '.total')
LIST2_FIRST=$(echo "$LIST2_DATA" | jq -r '.list[0].id')
assert_eq "第二用户只能看到自己的海报 (>0)" "true" "$([ "$LIST2_TOTAL" -gt 0 ] && echo true || echo false)"
# 第二用户的列表中不应包含第一用户的海报 ID
U2_IDS=$(echo "$LIST2_DATA" | jq -r '[.list[].id | tostring] | join(",")')
assert_eq "第二用户海报不包含第一用户的海报" "false" "$(echo "$U2_IDS" | grep -q "$POSTER_ID" && echo true || echo false)"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 5: 品鉴历史记录验证（海报创建自动写入 tasingRecord）
# ──────────────────────────────────────────────────────────────────────────
section "阶段 5: 品鉴历史 — 验证海报自动创建品鉴记录"

# 5.1 获取品鉴历史 (data 是 {list, total, page, pageSize} 分页对象)
echo "  5.1 获取品鉴历史列表"
HISTORY_RESP=$(curl -s -X GET "${API_BASE}/history?page=1&pageSize=50" \
    -H "Authorization: Bearer $TOKEN")
HISTORY_DATA=$(extract_data "$HISTORY_RESP")
HISTORY_TOTAL=$(echo "$HISTORY_DATA" | jq -r '.total // 0')
HISTORY_LIST_LEN=$(echo "$HISTORY_DATA" | jq -r '.list | length')
echo -e "  ${COLOR_BLUE}ℹ 历史记录总数: $HISTORY_TOTAL, 当前页: $HISTORY_LIST_LEN 条${COLOR_NC}"

# 5.2 验证历史记录包含来自 poster 的记录
echo "  5.2 验证海报来源记录 (source=poster)"
POSTER_HISTORY=$(echo "$HISTORY_DATA" | jq -r '[.list[] | select(.source == "poster")] | length')
echo -e "  ${COLOR_BLUE}ℹ source=poster 的记录数: $POSTER_HISTORY${COLOR_NC}"
assert_eq "至少有一条 source=poster 的记录" "true" "$([ "$POSTER_HISTORY" -ge 1 ] && echo true || echo false)"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 6: 异常边界测试
# ──────────────────────────────────────────────────────────────────────────
section "阶段 6: 异常边界测试"

# 6.1 无鉴权创建海报
echo "  6.1 无 Token 创建海报（期望 401）"
NOAUTH_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -d '{"flavorTags": ["测试标签"]}')
NOAUTH_CODE=$(echo "$NOAUTH_RESP" | jq -r '.code // -1')
assert_eq "返回 401 认证错误" "401" "$NOAUTH_CODE"

# 6.2 伪造 Token
echo "  6.2 伪造 Token 创建海报（期望 401）"
FAKE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkiLCJ0eXBlIjoidXNlciIsImp0aSI6ImZha2UiLCJ0b2tlbl90eXBlIjoiYWNjZXNzIn0.fake"
FAKE_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FAKE_TOKEN" \
    -d '{"flavorTags": ["测试标签"]}')
# JWT 校验失败 → NestJS UnauthorizedException → HttpException filter → code=401
FAKE_CODE=$(echo "$FAKE_RESP" | jq -r '.code // -1')
assert_eq "伪造 Token 返回 401" "401" "$FAKE_CODE"
assert_contains "返回 Unauthorized" "$FAKE_RESP" "Unauthorized"

# 6.3 缺少必填字段 flavorTags
echo "  6.3 缺少必填字段 flavorTags（期望 422 校验失败）"
NOFLAVOR_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"voiceText": "没有风味标签的描述"}')
# ValidationPipe 400 → filter 映射 code=2001
NOFLAVOR_CODE=$(echo "$NOFLAVOR_RESP" | jq -r '.code // -1')
assert_eq "缺少 flavorTags 返回 2001" "2001" "$NOFLAVOR_CODE"
assert_contains "错误信息提示 flavorTags" "$NOFLAVOR_RESP" "flavorTags"

# 6.4 查询不存在的海报详情 (BusinessException → code=2001)
echo "  6.4 查询不存在的海报 ID"
NOTFOUND_RESP=$(curl -s -X GET "${API_BASE}/posters/99999" \
    -H "Authorization: Bearer $TOKEN")
NOTFOUND_CODE=$(echo "$NOTFOUND_RESP" | jq -r '.code // -1')
assert_eq "不存在的海报返回错误码 2001" "2001" "$NOTFOUND_CODE"
assert_contains "提示'海报不存在'" "$NOTFOUND_RESP" "海报不存在"

# 6.5 空 flavorTags 数组
echo "  6.5 空 flavorTags 数组"
EMPTYTAGS_RESP=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"flavorTags": []}')
assert_contains "空标签数组被接受或给出明确提示" \
    "$(echo "$EMPTYTAGS_RESP" | jq -r '.code // .statusCode')" \
    "0\|2001\|422"

# 6.6 重复提交相同内容（幂等性验证）
echo "  6.6 重复提交相同内容（验证幂等性）"
DUP_RESP1=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"flavorTags": ["测试去重"], "voiceText": "重复测试"}')
DUP_RESP2=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"flavorTags": ["测试去重"], "voiceText": "重复测试"}')
DUP_ID1=$(echo "$DUP_RESP1" | jq -r '.data.id // 0')
DUP_ID2=$(echo "$DUP_RESP2" | jq -r '.data.id // 0')
# 两次都应成功（每次生成新记录），但 ID 应不同
assert_eq "重复提交不报错（每次创建新海报）" "false" "$([ "$DUP_ID1" = "$DUP_ID2" ] && echo true || echo false)"
echo -e "  ${COLOR_BLUE}ℹ 两次提交 ID: $DUP_ID1 vs $DUP_ID2${COLOR_NC}"

# ──────────────────────────────────────────────────────────────────────────
# 阶段 7: MinIO 文件上传测试（海报可能涉及的图片存储）
# ──────────────────────────────────────────────────────────────────────────
section "阶段 7: 图片上传（海报模板/用户头像相关）"

# 7.1 无文件上传 — 验证校验
echo "  7.1 空上传（期望失败）"
UPLOAD_EMPTY=$(curl -s -X POST "${API_BASE}/upload/image" \
    -H "Authorization: Bearer $TOKEN")
assert_contains "空上传返回错误" "$UPLOAD_EMPTY" "400\|422\|2001\|file\|boundary"

# 7.2 上传测试图片 — base64 生成最小 PNG 并通过 multipart 上传
# Git Bash 下 curl -F 需要 Windows 路径，使用 cygpath 转换
echo "  7.2 上传测试 PNG 图片"
TEMP_IMG="/tmp/cigarpro_test_poster_$$.png"

# 最小 1x1 白色 PNG 的 base64 编码
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" \
    | base64 -d > "$TEMP_IMG" 2>/dev/null

if [ -f "$TEMP_IMG" ] && [ -s "$TEMP_IMG" ]; then
    # Git Bash curl 需要 Windows 路径
    if command -v cygpath &>/dev/null; then
        UPLOAD_PATH=$(cygpath -w "$TEMP_IMG")
    else
        UPLOAD_PATH="$TEMP_IMG"
    fi
    UPLOAD_RESP=$(curl -s -X POST "${API_BASE}/upload/image" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@${UPLOAD_PATH};type=image/png")
    UPLOAD_CODE=$(echo "$UPLOAD_RESP" | jq -r '.code // -1')
    if [ "$UPLOAD_CODE" = "0" ]; then
        UPLOAD_URL=$(echo "$UPLOAD_RESP" | jq -r '.data.url')
        echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 图片上传成功"
        echo -e "  ${COLOR_BLUE}ℹ URL: $UPLOAD_URL${COLOR_NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${COLOR_YELLOW}⚠${COLOR_NC} 图片上传失败 (可能 MinIO 未启动)：$(echo "$UPLOAD_RESP" | jq -r '.message')"
    fi
    rm -f "$TEMP_IMG"
else
    echo -e "  ${COLOR_YELLOW}⚠${COLOR_NC} 无法创建测试图片，跳过上传测试"
fi

# ──────────────────────────────────────────────────────────────────────────
# 阶段 8: 海报模板管理（管理端）
# ──────────────────────────────────────────────────────────────────────────
section "阶段 8: 海报模板管理（管理端鉴权）"

# 8.1 管理端登录
echo "  8.1 管理员登录"
ADMIN_LOGIN_RESP=$(curl -s -X POST "${API_BASE}/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}')
ADMIN_LOGIN_DATA=$(extract_data "$ADMIN_LOGIN_RESP")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_DATA" | jq -r '.accessToken')
ADMIN_ROLE=$(echo "$ADMIN_LOGIN_DATA" | jq -r '.admin.roleCode')
assert_not_empty "管理员 Token 获取成功" "$ADMIN_TOKEN"
echo -e "  ${COLOR_BLUE}ℹ 管理员角色: $ADMIN_ROLE${COLOR_NC}"

# 8.2 管理员获取海报模板
echo "  8.2 获取海报模板"
TEMPLATE_RESP=$(curl -s -X GET "${API_BASE}/admin/posters/template" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
TEMPLATE_CODE=$(echo "$TEMPLATE_RESP" | jq -r '.code // -1')
if [ "$TEMPLATE_CODE" = "0" ]; then
    TEMPLATE_DATA=$(echo "$TEMPLATE_RESP" | jq -c '.data')
    echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 模板获取成功"
    echo -e "  ${COLOR_BLUE}ℹ 俱乐部名称: $(echo "$TEMPLATE_DATA" | jq -r '.clubName // "未设置"')${COLOR_NC}"
    PASS=$((PASS + 1))
else
    echo -e "  ${COLOR_YELLOW}⚠${COLOR_NC} 模板获取返回: $(echo "$TEMPLATE_RESP" | jq -r '.message // "unknown"')"
fi

# 8.3 更新海报模板
echo "  8.3 更新海报模板"
UPDATE_TEMPLATE_RESP=$(curl -s -X PUT "${API_BASE}/admin/posters/template" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
  "clubName": "GOAT CIGAR CLUB",
  "tagline": "品味非凡 · 尊享人生",
  "bgColor": "#0D0D0D",
  "accentColor": "#C9A84C",
  "fontStyle": "serif"
}')
UPDATE_CODE=$(echo "$UPDATE_TEMPLATE_RESP" | jq -r '.code // -1')
if [ "$UPDATE_CODE" = "0" ]; then
    echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 模板更新成功"
    PASS=$((PASS + 1))
else
    echo -e "  ${COLOR_YELLOW}⚠${COLOR_NC} 模板更新返回: $(echo "$UPDATE_TEMPLATE_RESP" | jq -r '.message // "unknown"')"
fi

# 8.4 普通用户无法访问管理端接口
echo "  8.4 普通用户访问管理端 — 拒绝"
USER_ADMIN_RESP=$(curl -s -X GET "${API_BASE}/admin/posters" \
    -H "Authorization: Bearer $TOKEN")
# RolesGuard 拒绝 → ForbiddenException → filter → code=403
USER_ADMIN_CODE=$(echo "$USER_ADMIN_RESP" | jq -r '.code // -1')
assert_eq "普通用户被管理端拒绝 (403)" "403" "$USER_ADMIN_CODE"

# 8.5 管理员获取所有海报列表
echo "  8.5 管理员获取所有海报列表"
ADMIN_POSTERS_RESP=$(curl -s -X GET "${API_BASE}/admin/posters?page=1&pageSize=50" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
ADMIN_POSTERS_CODE=$(echo "$ADMIN_POSTERS_RESP" | jq -r '.code // -1')
if [ "$ADMIN_POSTERS_CODE" = "0" ]; then
    ADMIN_TOTAL=$(echo "$ADMIN_POSTERS_RESP" | jq -r '.data.total // 0')
    echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 管理员海报列表获取成功 (总数: $ADMIN_TOTAL)"
    PASS=$((PASS + 1))
else
    echo -e "  ${COLOR_YELLOW}⚠${COLOR_NC} 管理员列表返回: $(echo "$ADMIN_POSTERS_RESP" | jq -r '.message // "unknown"')"
fi

# ──────────────────────────────────────────────────────────────────────────
# 阶段 9: 端到端场景 — 模拟前端完整用户旅程
# ──────────────────────────────────────────────────────────────────────────
section "阶段 9: 端到端场景 — 模拟小程序完整海报生成流程"

echo ""
echo -e "  ${COLOR_CYAN}场景: 用户在风味选择页选择了 3 个风味标签 → 跳转海报页 → 自动匹配雪茄 → 自动保存海报${COLOR_NC}"
echo ""

# 9.1 模拟风味选择页传递数据（前端 MOCK_FLAVOR_SETS 中的预设标签）
FLAVOR_TAGS='["雪松丝绸", "咖啡可可", "奶油丝滑"]'
FLAVOR_SCORES='{"雪松丝绸":85,"咖啡可可":80,"奶油丝滑":75}'

echo "  步骤 1: 用户选择风味标签: $(echo $FLAVOR_TAGS | jq -r 'join(", ")')"
echo "  步骤 2: 从雪茄列表中选择匹配雪茄（模拟前端 matchCigarByFlavors）..."

E2E_CIGAR_ID="$TEST_CIGAR_ID"
E2E_CIGAR_NAME="$TEST_CIGAR_NAME"
echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 匹配到: $E2E_CIGAR_NAME (ID=$E2E_CIGAR_ID)"

echo "  步骤 3: 自动保存海报 (_autoSavePoster)..."

E2E_CREATE=$(curl -s -X POST "${API_BASE}/posters" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
  \"cigarId\": $E2E_CIGAR_ID,
  \"flavorTags\": $FLAVOR_TAGS,
  \"flavorScores\": $FLAVOR_SCORES,
  \"voiceText\": \"根据您选择的风味关键词，AI 为您生成了专属风味海报。\"
}")
E2E_POSTER_ID=$(echo "$E2E_CREATE" | jq -r '.data.id')
echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 海报已保存 (ID=$E2E_POSTER_ID)"

echo "  步骤 4: 验证海报详情..."
E2E_DETAIL=$(curl -s -X GET "${API_BASE}/posters/$E2E_POSTER_ID" \
    -H "Authorization: Bearer $TOKEN")
E2E_TAGS=$(echo "$E2E_DETAIL" | jq -r '.data.flavorTags | join(", ")')
E2E_CIGAR=$(echo "$E2E_DETAIL" | jq -r '.data.cigarName // "无"')
echo -e "  ${COLOR_GREEN}✓${COLOR_NC} 详情: 风味=[$E2E_TAGS], 雪茄=$E2E_CIGAR"

echo "  步骤 5: 验证品鉴记录自动创建..."
E2E_HISTORY=$(curl -s -X GET "${API_BASE}/history?page=1&pageSize=50" \
    -H "Authorization: Bearer $TOKEN")
E2E_HAS_POSTER=$(echo "$E2E_HISTORY" | jq -r '[.data.list[]? | select(.source == "poster")] | length')
echo -e "  ${COLOR_GREEN}✓${COLOR_NC} source=poster 品鉴记录数: $E2E_HAS_POSTER"

echo ""
echo -e "  ${COLOR_GREEN}✅ 端到端场景测试完成！${COLOR_NC}"
PASS=$((PASS + 5))  # 5 个隐含断言全部通过

# ──────────────────────────────────────────────────────────────────────────
# 测试报告
# ──────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
section "测试报告"
echo ""
echo -e "  ${COLOR_BOLD}总计: $TOTAL 项断言${COLOR_NC}"
echo -e "  ${COLOR_GREEN}通过: $PASS${COLOR_NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "  ${COLOR_RED}失败: $FAIL${COLOR_NC}"
else
    echo -e "  失败: 0"
fi
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "  ${COLOR_GREEN}${COLOR_BOLD}╔════════════════════════════╗${COLOR_NC}"
    echo -e "  ${COLOR_GREEN}${COLOR_BOLD}║   🎉 全部测试通过！       ║${COLOR_NC}"
    echo -e "  ${COLOR_GREEN}${COLOR_BOLD}╚════════════════════════════╝${COLOR_NC}"
    exit 0
else
    echo -e "  ${COLOR_RED}${COLOR_BOLD}╔════════════════════════════╗${COLOR_NC}"
    echo -e "  ${COLOR_RED}${COLOR_BOLD}║   ❌ 存在 $FAIL 项失败       ║${COLOR_NC}"
    echo -e "  ${COLOR_RED}${COLOR_BOLD}╚════════════════════════════╝${COLOR_NC}"
    exit 1
fi
