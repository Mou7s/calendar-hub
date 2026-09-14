# AI 智能体开发守则 (AGENTS)

## 📌 项目概述

本仓库是一个基于 **Nuxt 4** + **Nuxt Hub** + **Cloudflare Workers** 的**只读日历应用**：把 SpaceX 发射、F1 赛程、WTT 主系列乒乓球、Dota 2 赛事聚合成符合 RFC 5545 的 **ICS 订阅源**，并用一个多语言的日历界面把它们展示出来。

仓库以官方模板 **`nuxt-ui-templates/calendar`** 为基底（Apple Calendar 风格：日期路由、日/周/月视图、虚拟滚动月视图、迷你日历、命令面板、玻璃拟态主题），本站的能力是重新接上去的。**内容价值在 `.ics` 订阅源，页面只是入口。**

---

## 🏗️ 架构与文件树

### 1. 前端应用层 (`app/`)

- **`app/app.vue`**：应用根。`UApp` 外壳 + 侧边栏/页面/命令面板/订阅弹窗挂载点；持有 `useCalendarEvents()`（保证 SSR 预取先于整棵树渲染）与全站 SEO（i18n 标题描述 + JSON-LD `WebSite` / `SoftwareApplication` / 下一次发射的 `Event`）。
- **`app/app.config.ts`**：Nuxt UI 主题（`primary: red` / `neutral: zinc`）+ 玻璃拟态组件的 slot 覆盖（sidebar / popover / modal / tabs / dropdown）。
- **`app/assets/css/main.css`**：`glass-material` 材质、`--glass-*` / `--control-bg` / `--well-bg` token、视图过渡关键帧。
- **`app/pages/index.vue`**：`/` → 302 重定向到 `/month/<今天>`。
- **`app/pages/[view]/[date].vue`**：日历应用主页面，`definePageMeta({ validate })` 校验 view（`day|week|month`）与日期，非法即 404；头部含标题、视图切换、离线徽章、`< Today >` 与订阅按钮。
- **`app/components/`**
  - `AppSidebar.vue`：floating 玻璃侧边栏（<lg 变 slideover），内含图层开关 `CalendarList`、迷你日历 `CalendarMini`、订阅入口、语言/主题。
  - `AppSearch.vue`：`UCommandPalette` 命令面板（⌘K / Ctrl+K），可跳视图、切图层、搜已加载事件。
  - `SubscribeModal.vue`：订阅弹窗（4 个图层各 `webcal://` 一键订阅 + ICS 链接复制），由 `useCalendar().isSubscribeOpen` 驱动（`n` 键、侧边栏、头部按钮三处入口）。
  - `UserMenu.vue` / `AppLogo.vue`：账户菜单（语言、主题）与品牌标。
- **`app/components/calendar/`**
  - `MonthView.vue`：月视图，`UScrollArea` 虚拟化的无限滚动 6 周分块拉取，滚动同步 URL，月份标签随滚动停靠。
  - `MonthWeek.vue`：月视图的一行（7 天），全天条分道 `layoutAllDay` + 定时事件槽位 + `+N more` 弹层；**zh-CN 时在日号左侧显示农历/节气**。
  - `WeekView.vue`：周视图与日视图共用（`days` 在 <lg 收窄为 3 天），小时网格 + 全天行；表头在 zh-CN 时内联显示农历/节气。
  - `DayColumn.vue` / `EventBlock.vue` / `EventChip.vue` / `NowIndicator.vue`：时间列、定时块、chip、当前时间线。
  - `EventPopover.vue` → `MissionDetail.vue`：点击事件弹出的任务详情（时间、载具、地点、比分、官方链接、订阅），字段名与图标按图层取自 `app/utils/calendar-event-presentation.js`。
  - `List.vue` / `Mini.vue`：图层勾选列表与迷你日历（点日期跳转，主视图跟随）。
- **`app/composables/`**
  - `createAppComposable.ts`：模板的应用级单例包装（避免每个 chip 一份监听器/ref）。
  - `useCalendar.ts`：路由即状态（view/date/range/title）、上一下一页、视图过渡方向、键盘快捷键（`t` 今天 / `d` `w` `m` 切视图 / `←` `→` 翻页 / `n` 订阅 / `⌘K` 搜索）、侧边栏与弹窗开关。
  - `useCalendarEvents.ts`：`/api/calendars` 图层 + `/api/events` 按可见区间分块拉取（payload 缓存 + 相邻区间预热）、按天分桶、图层可见性（cookie 持久化）。
  - `useLunar.js`：农历/节气转换，**内置 1900–2100 完整表**（见红线 7）。
- **`app/utils/`**：`dates.ts`（浮动本地日期工具/格式化，模板）、`layout.ts`（事件分道与定位，模板）、`calendars.ts`（按主题色生成静态类名，模板）、`calendar-event-presentation.js`（图层字段名与图标映射，`MissionDetail` 在用）。原先的两个前端纯函数（月份键、导航步长）已被模板的日期工具取代并删除。

### 2. 服务端接口层 (`server/`)

- **ICS 订阅路由**
  - `server/routes/spacex.ics.js`：主订阅源。
  - `server/routes/calendar.ics.js`：别名。
  - `server/routes/launches.ics.js`：别名。
  - `server/routes/ics/[topic].ics.js`：F1 / WTT / Dota 2 主题订阅源。
- **JSON 接口**
  - `server/api/events.get.ts`：**模板事件契约接口**。把 SpaceX（upcoming + history）、F1、WTT、Dota 2 聚合成 `CalendarEvent[]`，按 `start`/`end` 区间交叠过滤（上限 90 天），按 `locale` 选标题，按 id 去重；各源 `Promise.allSettled` 独立降级，全挂才 502。月视图一次要 12 周（84 天），所以窗口比模板的 90 天上限刚好放得下。
  - `server/api/calendars.get.ts`：图层列表（模板契约，4 个图层映射到 Nuxt UI 主题色）。
  - `server/api/launches.get.js`：即将发射列表（SWR 缓存），也是 SEO `Event` 的数据源。
  - `server/api/history-launches.get.js`：历史发射（限 50）。
  - `server/api/calendar/[topic].get.js`：主题日历 JSON。
  - `server/api/launches/[slug].get.js`：按 slug 取单个任务详情。
  - `server/api/topics.get.js`：主题列表（原 `/api/calendars`，**因模板占用该路径已改名**）。
- **`server/utils/`**
  - `spacex.js`：双源抓取（GraphQL Page Tiles + TIMING JSON）、标准化、历史适配、ICS 序列化（`escapeIcsText`）。
  - `calendars.js`：主题注册、F1 赛程、WTT 官方赛程解析、通用 ICS 序列化。
  - `kv.js`：NuxtHub KV 上的 SWR 缓存（版本 Sequence + `LAST-MODIFIED`）。
  - `calendar-sync.js` / `launches.js`：主题同步与发射数据装载。
- **其它**：`server/tasks/calendar/sync.js`（定时任务，`nuxt.config.ts` 里 `7 * * * *` 触发）、`server/middleware/fix-url.js` + `server/plugins/fix-url.js`（绝对 URL 归一化）。

### 3. 共享契约 (`shared/`)

- `shared/types/index.d.ts`：`CalendarEvent` / `Calendar` / `DateRange` / `CalendarView`。`CalendarEvent` 是前后端唯一契约，本站扩展字段（`live` / `location` / `vehicle` / `url` / `scores`）**全部可选**，不破坏模板接口。
- `shared/utils/time.ts`：模板的浮动本地时间工具（`toLocalISO`）。

---

## ⚠️ 工作红线与开发守则

### 1. 保持 ICS 订阅源的绝对稳定
* **严禁修改 `UID` 生成算法**：必须严格锁定 `UID:${mission.correlationId || mission.id}@spacexcalendar.local`。改它会让所有订阅者的日历客户端瞬间涌入大量重复日程。
* **锁定 Content-Type 与响应头**：`/spacex.ics` 必须返回 `text/calendar; charset=utf-8` 与 `Content-Disposition: inline; filename="spacex-launches.ics"`。
* **序列化安全过滤**：所有 ICS 字段（`SUMMARY` / `DESCRIPTION` / `LOCATION` 等）必须经 `escapeIcsText`。

### 2. 直播任务保活（Live Missions Preservation）
* `mission.isLive === true` 时，即使 `launchAt` 已过去，**必须**保留在 upcoming 与 `.ics` 中（`isFutureMission` 内保活），保证发射开始后用户仍能跳转官方直播间。

### 3. 只读边界：不得引入写链路
* 本应用**不提供事件增删改**。模板自带的 `store.ts`、`events.post/patch/delete`、zod schema、`useEventDraft/Move/Drag/Editor`、`EventForm/EventDraft` 已在迁移时删除，**不要恢复**：这些全部依赖服务端可写存储，而本站数据源是上游 API + KV 缓存。
* 同理不要重新引入拖拽改期、双击新建。事件点击只做展示（`EventPopover` → `MissionDetail`）。

### 4. 事件契约与时间口径
* 新增字段一律加在 `shared/types/index.d.ts` 的 `CalendarEvent` 上并保持**可选**。
* `start` / `end` 用**绝对 ISO**（服务端 `new Date(ms).toISOString()`）：本站源数据是绝对时刻，客户端再按本地时区分桶。**不要**改回模板的浮动本地字符串（`toLocalISO`），否则服务端与观众时区不一致会导致日期错位。
* 标题按 `locale` 查询参数选 `titleZh` / `titleEn`；前端 `useCalendarEvents` 已把 locale 编入 `useFetch` 的 key 与 query，**改缓存键时别忘了 locale**。

### 5. 多语言（i18n）同步规范
* 支持 7 种语言（`zh-CN` / `en` / `ja` / `ko` / `es` / `fr` / `de`），`strategy: 'no_prefix'`。
* **红线**：任何前端新文案**必须同时**更新 `i18n/locales/zh-CN.json` 与 `en.json`，并推荐跑翻译脚本同步其余语言：
  ```bash
  export OPENAI_API_KEY="your-key"
  bun run translate:locales -- --locales=ja,ko,es,fr,de
  ```
* 现有的订阅/详情/状态文案都有词条（`subscribe.*` / `mission.*` / `status.*` / `calendar.*`），**优先复用，不要新增硬编码中文**。

### 6. SEO 与结构化数据
* `app/app.vue` 里的 JSON-LD（`WebSite` / `SoftwareApplication` / 下一次发射 `Event`）是 SEO 入口，**勿破坏**；Unhead 要求用 `innerHTML` 而不是 `children`。
* 核心可交互组件保留清晰唯一的 `id` / `aria-label`，供 E2E 与无障碍使用。

### 7. 农历表口径（勿改回单年表）
* `app/composables/useLunar.js` 内置 **1900–2100 完整表**（`lunarInfo` 201 项 + `sTermInfo` 201 项，源自 `jjonline/calendar.js`），只保留本站需要的子集。
* **不要**改回「单年手写对照表」——历史版本是 2026 单年表，跨年即错。
* 输入输出都是 `yyyy-MM-dd` 字符串，纯字符串切分，不依赖运行时区；超出区间或非法日期返回空串（调用方按空串隐藏）。节气表按东八区口径。

### 8. 保持轻量与边缘友好
* 跑在 Cloudflare Workers 边缘，内存与包体积受限。**勿引入臃肿依赖**；新增依赖前先看 `.output/server` 体积变化（当前约 2.2 MB / 560 KB gzip）。
* 不要为了筛选而依赖前端状态：**订阅源裁剪必须落在服务端**（见红线 9）。

### 9. WTT 赛事数量收敛口径（订阅源裁剪，破坏性）
* **不得用页面筛选代替订阅裁剪**：日历客户端只读 `.ics`，前端筛选不改变订阅结果。
* **Contender 只保留决赛**：`isWttContenderLevelEvent(event)` 命中的赛事（`WTT Contender`，**不含** `WTT Star Contender` / `WTT Youth Contender`）只在 `isWttFinalRound(description)` 为真时输出。`Champions` / `Smash` / `Star Contender` / `Feeder` 维持 R16+ 口径。
* **属破坏性变更**：被裁掉的比赛会从所有订阅者日历中消失（该赛事若没有决赛数据则整个赛事消失）。调整前先评估影响。

---

## 🧪 验证与测试流程

提代码或交付部署前，**必须**依次跑通：

```bash
bun test                                     # 48 项：SpaceX 双源合并/降级、F1、WTT 层级与轮次口径、
                                            # Contender 决赛裁剪、ICS 转义、SWR、直播保活、主题 ICS 路由、图层呈现映射、
                                            # 主题色持久化（localStorage key、首帧脚本、生成 CSS 一致性）
node --check server/utils/calendars.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/routes/spacex.ics.js
bun run typecheck                            # vue-tsc：漏改只读化残留符号会在这里第一时间暴露
bun run build
git diff --check
```

改到前端或数据接入时，再对 dev server 做一次**真实请求**核对（比看代码可靠）：

```bash
bun run dev                                   # http://localhost:3000
curl -s localhost:3000/api/calendars                                        # 4 个图层
curl -s "localhost:3000/api/events?start=2026-09-01T00:00:00&end=2026-09-30T00:00:00&locale=zh-CN"
curl -sD - -o /dev/null localhost:3000/spacex.ics                           # 响应头红线
curl -s -H "Accept-Language: zh-CN" localhost:3000/month/2026-09-13 | grep -o 白露   # 农历只在 zh-CN 出现
```

**只读化的自查命令**（残留一个就是运行时 `Cannot find name`）：

```bash
grep -rn "useEventDraft\|useEventMove\|useEventDrag\|useEventEditor\|EventForm\|EventDraft\|DRAFT_EVENT_ID\|useStore\|useEditableStore" app server shared
```

---

## ☁️ 本地调试与部署说明

* **本地开发**：`bun run dev`（`http://localhost:3000`）。要换端口用环境变量，**不要**写 `--host --port 3111`（listhen 会把 `--port` 当成 host 值而报 `Invalid hostname`）。
* **生产打包**：`bun run build`
* **Workers 预览**：`bun run preview:worker`
* **Workers 部署**：`bun run deploy:worker`
* **线上正式域名**：`calendarhub.mou7s.com`

### 常见坑

* **所有路由（含 `/api/*`）都返回 200 + Nuxt 欢迎页**：这是本地 dev server 带着旧模块图/`.nuxt` 缓存跑的症状，不是代码坏了。从 `.nuxt/nuxt.lock` 拿到 PID → kill → `rm -rf .nuxt .output` → 重启。
* **`Another Nuxt dev is already running (PID x)`**：上面的锁文件里就是这个 PID。
* repo 文件是 CRLF：`patch` 的 `old_string` 若非逐字节一致会被模糊匹配，可能悄悄改坏缩进——遇到就改用整段重写。
