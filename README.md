# Calendar Hub

<p align="center">
  <img src="public/icon-512.png" width="128" height="128" alt="Calendar Hub Icon" />
</p>

基于 **Nuxt 4** + **Nuxt Hub** + **Cloudflare Workers** 的**只读日历聚合站**：把上游日程抓取标准化后输出符合 RFC 5545 的 **ICS / webcal 订阅源**，再用一个多语言的日历界面把它们展示出来。

**内容价值在 `.ics` 订阅源，页面只是入口。** 线上站点：<https://calendarhub.mou7s.com>

---

## 📡 订阅源

| 路径 | 主题 | 口径 |
| --- | --- | --- |
| `/spacex.ics` | SpaceX 发射 | 主订阅源。双源合并（GraphQL Page Tiles + TIMING JSON），带载具、发射场、官方直播链接；**直播中的任务即使过了原定时刻也保活**，方便看直播时仍能跳转 |
| `/calendar.ics`、`/launches.ics` | SpaceX 发射 | 同一份订阅源的别名路径，历史订阅者继续可用 |
| `/ics/spacex.ics` | SpaceX 发射 | 主题路径形式，与其他主题对齐 |
| `/ics/f1.ics` | F1 赛程 | 2026 赛季 24 站，每站的冲刺赛 / 排位 / 正赛按各场地对 UTC 的固定偏移换算为绝对时刻 |
| `/ics/wtt.ics` | WTT 乒乓球 | 官方赛历解析，只输出**已公布双方选手与开赛时间**的比赛；轮次口径 R16 起，`WTT Contender` 级别**只保留决赛** |
| `/ics/dota2.ics` | Dota 2 赛事 | Liquipedia 已公布时间的未来对阵（含赛制、双方队伍、赛事链接），完赛场次保留 48 小时并附比分与胜者；举办地按锦标赛 infobox 的 `Location:` 解析 |
| `/ics/tech-events.ics` | 科技大厂发布会 | 内置静态数据 |
| `/ics/games.ics` | 3A 游戏发售 | 内置静态数据 |
| `/ics/holidays.ics` | 中国法定节假日与调休 | 内置静态数据 |

后三个主题只在 ICS / JSON 接口层提供（`/api/topics` 可列出全部 7 个），**日历界面只挂前 4 个图层**。

订阅方式：站点里的订阅弹窗为每个图层提供 `webcal://` 一键订阅与 HTTPS 链接复制；也可以直接把上面的路径填进 Apple Calendar / Google Calendar / Outlook 的「订阅日历」。

响应头是与日历客户端的硬约定，改动会让既有订阅失效：

```text
content-type: text/calendar; charset=utf-8
cache-control: public, max-age=300
content-disposition: inline; filename="spacex-launches.ics"
```

---

## ✨ 功能

### 日历界面（模板基底 `nuxt-ui-templates/calendar`）

- **路由即状态**：`/day|week|month/<YYYY-MM-DD>`，非法 view 或日期直接 404；`/` 302 到今天。上/下一页、切视图都只改 URL。
- **月视图**：虚拟滚动的无限加载，一次拉 6 周分块，滚动时同步 URL，月份标签随滚动停靠。
- **周视图 / 日视图**：共用小时网格 + 全天行，窗口窄于 `lg` 时收窄为 3 天。
- **侧边栏**：floating 玻璃材质（`<lg` 变 slideover），内含图层开关（cookie 持久化）、迷你日历（点日期跳转，主视图跟随）、订阅入口、设置菜单。
- **命令面板**：搜索已加载事件、跳日期、切图层（入口在侧边栏）。
- **事件详情**：点击事件弹出任务详情，字段名与图标按图层取自 `app/utils/calendar-event-presentation.js`（时间、载具、地点、比分、官方链接）。
- **玻璃拟态与主题**：`app/app.config.ts` 定主色，`app/assets/css/main.css` 提供 `glass-material` 材质与视图过渡；主色 / 中性色可选并持久化（localStorage + 首帧内联脚本，避免刷新闪色）。
- **农历与节气**：仅 `zh-CN` 下在日号旁 / 周表头显示，其他语言不渲染。
- **离线徽章**：离线时显示排队中的请求数。

### 数据接入与缓存

- **多源聚合**：`/api/events` 把 SpaceX（upcoming + history）、F1、WTT、Dota 2 聚合成统一的 `CalendarEvent[]`，按 `start`/`end` 区间交叠过滤（窗口上限 90 天，月视图一次要 84 天刚好放得下），按 `locale` 选标题，按 id 去重。
- **独立降级**：各源 `Promise.allSettled` 分别兜底，只有全部失败才返回 502。
- **KV + SWR**：上游数据落 Nuxt Hub KV，过期先返回旧数据、后台异步刷新，避免上游限流。TTL 动态：常规 5 分钟，无直播且距下次发射超过 3 小时降到 30 分钟，任务详情卡片 24 小时。
- **版本追踪**：`SEQUENCE` 与 `LAST-MODIFIED` 随发射窗口微调更新，避免日历客户端把所有日程当成变更重推。
- **定时同步**：Nitro 定时任务 `calendar:sync` 每小时第 7 分钟跑一次（`nuxt.config.ts` 的 `scheduledTasks`，与 `wrangler.toml` 的 `crons` 对应）。

### 多语言

`@nuxtjs/i18n`，`strategy: 'no_prefix'`，首屏自动检测浏览器语言，7 种语言：简体中文 / English / 日本語 / 한국어 / Español / Français / Deutsch。

### SEO

`app/app.vue` 注入 JSON-LD：`WebSite`、`SoftwareApplication`，以及下一次发射的 `Event`；配合 `public/robots.txt`、`public/sitemap.xml` 与 PWA manifest。

### 只读边界

本站**不提供事件的增删改**，数据来自上游 API + KV 缓存。模板自带的写链路（store、`events.post/patch/delete`、zod schema、拖拽改期、双击新建）在迁移时已删除，事件点击只做展示。

---

## 🛠️ 技术栈

- **框架**：Nuxt 4（`future.compatibilityVersion: 4`）
- **UI**：Nuxt UI 4 + Tailwind CSS + Lucide / Heroicons 图标（客户端内联打包）
- **平台**：Nuxt Hub（KV）+ Cloudflare Workers（`nitro.preset: 'cloudflare_module'`）
- **国际化**：`@nuxtjs/i18n`
- **工具**：`@vueuse/core`、`date-fns`、`@internationalized/date`、`h3`
- **包管理 / 运行**：Bun（`packageManager: bun@1.4.0`）
- **测试**：`bun test`（bun 内置运行器）

---

## 📁 项目结构

```text
├── app/                          # Nuxt 4 前端应用层
│   ├── app.vue                   # 应用根：UApp 外壳 + 全站 SEO/JSON-LD + 共享事件状态
│   ├── app.config.ts             # Nuxt UI 主题与玻璃拟态组件的 slot 覆盖
│   ├── error.vue
│   ├── assets/css/               # main.css（玻璃材质/过渡）、theme-colors.css（生成产物）
│   ├── components/
│   │   ├── AppSidebar.vue        # floating 侧边栏（图层开关 / 迷你日历 / 订阅 / 设置）
│   │   ├── AppSearch.vue         # UCommandPalette 命令面板
│   │   ├── SubscribeModal.vue    # 订阅弹窗：webcal 一键订阅 + ICS 链接复制
│   │   ├── SettingsMenu.vue      # 语言 / 主题 / 外观
│   │   ├── AppLogo.vue
│   │   └── calendar/             # DayColumn / EventBlock / EventChip / EventPopover /
│   │                             # List / Mini / MissionDetail / MonthView / MonthWeek /
│   │                             # NowIndicator / WeekView
│   ├── composables/
│   │   ├── createAppComposable.ts  # 应用级单例包装
│   │   ├── useCalendar.ts          # 路由即状态、翻页、侧边栏与弹窗开关
│   │   ├── useCalendarEvents.ts    # 图层 + 按可见区间分块拉取、按天分桶、离线队列
│   │   ├── useLunar.js             # 农历 / 节气（1900–2100 完整表）
│   │   └── useThemeColors.ts       # 主色 / 中性色选择与持久化
│   ├── pages/
│   │   ├── index.vue               # / → 302 /month/<今天>
│   │   └── [view]/[date].vue       # 日历主页面（validate 非法即 404）
│   ├── plugins/theme-colors.client.ts
│   └── utils/                      # dates / layout / calendars / calendar-colors /
│                                   # calendar-event-presentation / theme-colors
├── server/                       # Nitro 服务端
│   ├── api/
│   │   ├── events.get.ts               # 模板契约接口：多源聚合成 CalendarEvent[]
│   │   ├── calendars.get.ts            # 界面图层（4 个，映射 Nuxt UI 主题色）
│   │   ├── topics.get.ts               # 全部主题（7 个，含 ICS 路径）
│   │   ├── launches.get.js             # 即将发射（SWR 缓存，也是 SEO Event 数据源）
│   │   ├── history-launches.get.js     # 历史发射
│   │   ├── calendar/[topic].get.js     # 主题日历 JSON
│   │   └── launches/[slug].get.js      # 单个任务详情
│   ├── routes/                     # ICS 订阅路由
│   │   ├── spacex.ics.js / calendar.ics.js / launches.ics.js
│   │   └── ics/[topic].ics.js          # 主题订阅源（含 Content-Type / SEQ 红线）
│   ├── utils/                      # spacex.js（双源抓取 + ICS 序列化）、calendars.js（主题注册 /
│   │                               # F1 / WTT / Dota 2 解析 + 通用 ICS）、kv.js（SWR）、
│   │                               # calendar-sync.js、launches.js
│   ├── tasks/calendar/sync.js      # 定时同步任务
│   ├── middleware/fix-url.js
│   └── plugins/fix-url.js
├── shared/                       # 前后端契约
│   ├── types/index.d.ts          # CalendarEvent / Calendar / DateRange / CalendarView
│   └── utils/time.ts
├── i18n/locales/                 # 7 语言词条 + supported.json
├── scripts/                      # translate-locales.js / generate-theme-colors.js /
│                                 # check-theme-colors-css.js
├── test/                         # calendar.test.js / calendar-layer-colors.test.js /
│                                 # theme-colors.test.js
├── public/                       # 图标、manifest.json、sw.js、robots.txt、sitemap.xml
├── nuxt.config.ts
└── wrangler.toml
```

---

## ⚠️ 数据口径与红线

改代码前请先读完这几条，它们对应「订阅者日历会不会被搞乱」：

1. **UID 生成算法锁定**：`UID:${mission.correlationId || mission.id}@spacexcalendar.local`。改动会让所有订阅者的日历客户端瞬间涌入重复日程。
2. **`.ics` 响应头锁定**：见上文「订阅源」一节。
3. **序列化必须转义**：所有 ICS 字段经 `escapeIcsText`。
4. **直播任务保活**：`isLive === true` 的任务即使 `launchAt` 已过去，仍保留在 upcoming 与 `.ics` 中。
5. **时间是绝对 ISO**：`start` / `end` 由服务端 `toISOString()` 输出，客户端按本地时区分桶；标题按 `locale` 查询参数在 `titleZh` / `titleEn` 之间选。
6. **WTT 裁剪是破坏性变更**：被裁掉的比赛会从所有订阅者日历中消失，调整轮次口径前先评估影响；**不能用前端筛选代替服务端裁剪**（日历客户端只读 `.ics`）。
7. **农历表是 1900–2100 完整表**：不要改回单年手写对照表，跨年即错；输入输出都是 `yyyy-MM-dd` 字符串，超出区间返回空串。
8. **保持轻量**：跑在边缘节点，新增依赖前先看 `.output/server` 体积。
9. **前端新文案必须同步词条**：至少更新 `i18n/locales/zh-CN.json` 与 `en.json`，其余语言跑翻译脚本。

---

## 🚀 本地开发

```bash
bun install
bun run dev          # http://localhost:3000
```

要换端口用环境变量，**不要**写 `--host --port 3111`——listhen 会把 `--port` 当成 host 值而报 `Invalid hostname`。

常用调试端点：

| 端点 | 说明 |
| --- | --- |
| `/api/calendars` | 界面图层（4 个） |
| `/api/topics` | 全部主题与 ICS 路径（7 个） |
| `/api/events?start=…&end=…&locale=zh-CN` | 聚合事件（模板契约，区间上限 90 天） |
| `/api/launches`、`/api/history-launches` | 即将发射 / 历史发射 |
| `/api/calendar/f1`、`/api/calendar/wtt`、`/api/calendar/dota2` | 主题原始数据 |
| `/spacex.ics`、`/ics/wtt.ics` | 订阅源 |

真实请求核对（比读代码可靠）：

```bash
curl -s localhost:3000/api/calendars
curl -sD - -o /dev/null localhost:3000/spacex.ics          # 响应头红线
curl -s "localhost:3000/api/events?start=2026-09-01T00:00:00&end=2026-09-30T00:00:00&locale=zh-CN"
curl -s -H "Accept-Language: zh-CN" localhost:3000/month/2026-09-07 | grep -o 白露   # 农历只在 zh-CN 出现
```

### 常见坑

- **`/api/*` 全都返回 200 + Nuxt 欢迎页**：本地 dev server 带着旧模块图 / `.nuxt` 缓存跑的症状，不代表代码坏了。从 `.nuxt/nuxt.lock` 取 PID → kill → `rm -rf .nuxt .output` → 重启。
- **`Another Nuxt dev is already running (PID x)`**：锁文件里就是这个 PID。
- 仓库文件是 CRLF，`patch` 的 `old_string` 若非逐字节一致会被模糊匹配、可能悄悄改坏缩进——遇到就整段重写。

---

## 🧪 测试与检查

```bash
bun test                 # 56 项 / 3 个文件：SpaceX 双源合并与降级、F1、
                         # WTT 层级与轮次口径、Contender 决赛裁剪、ICS 转义、
                         # SWR、直播保活、主题 ICS 路由、图层呈现映射、
                         # 主题色持久化（localStorage key / 首帧脚本 / 生成 CSS 一致性）
node --check server/utils/calendars.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/routes/spacex.ics.js
bun run typecheck        # vue-tsc
bun run build
git diff --check
```

新增功能必须补测试，尤其涉及外部数据源解析的部分。

---

## 🌍 多语言词条更新

改完 `i18n/locales/en.json` 与 `zh-CN.json` 后，其余 5 种语言用内置脚本一键同步：

```bash
export OPENAI_API_KEY="your-key"
bun run translate:locales -- --locales=ja,ko,es,fr,de
```

主题色的 `app/assets/css/theme-colors.css` 是生成产物：

```bash
bun run generate:theme-colors
```

改过可选色清单却忘了重跑生成，`bun test` 里的主题色用例会直接失败。

---

## ☁️ 部署

部署形态是 **Cloudflare Workers Module Worker**：前端静态资源走 Workers Assets，SSR / API / ICS 路由由 Nitro Worker 处理。

```bash
bun run deploy:worker    # 构建 + wrangler deploy
bun run preview:worker   # 本地起 Workers 运行时预览
```

`wrangler.toml` 里要注意的三件事：

- `[triggers] crons = ["7 * * * *"]`：与 `nuxt.config.ts` 的 `scheduledTasks` 一起驱动 `calendar:sync`。
- `[[kv_namespaces]]`：`SPACEX_KV`（以及别名 `KV`）绑定，ID 必须属于当前 Cloudflare 账户。
- `[[routes]]`：`calendarhub.mou7s.com` 走 Worker Custom Domain。

部署后验证响应头：

```bash
curl -I https://calendarhub.mou7s.com/spacex.ics
curl -I https://calendarhub.mou7s.com/ics/wtt.ics
```

---

## 📝 数据来源与免责

- **SpaceX**：官网前端暴露的 API（GraphQL Page Tiles + TIMING JSON），不受 v4 历史 API 停维护影响。
- **F1**：2026 赛季赛程（内置，含各场地对 UTC 的偏移）。
- **WTT**：<https://www.worldtabletennis.com/events_calendar>，只同步已公布对阵与开赛时间的比赛。
- **Dota 2**：[Liquipedia MediaWiki API](https://liquipedia.net/api-terms-of-use)，必须携带合规 `User-Agent`（`DOTA2_MATCHES_USER_AGENT`），结果缓存 30 分钟；解析的是渲染后 HTML，上游改版会静默失配，改解析逻辑前先用真实页面数据验证。
- **tech-events / games / holidays**：内置静态数据，随代码更新。
- 日期时间由日历客户端按本地时区换算，无需手动调整；本站只做只读聚合与展示。

---

## 📄 License

MIT。仓库基底为官方模板 [`nuxt-ui-templates/calendar`](https://github.com/nuxt-ui-templates/calendar)，见 `LICENSE`。
