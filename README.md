# Calendar Hub

<p align="center">
  <img src="public/icon-512.png" width="128" height="128" alt="Calendar Hub Icon" />
</p>

一个基于 **Nuxt 4** + **Nuxt Hub** + **Cloudflare Workers** 构建的多类型日历订阅中心。它将发射、赛事及其他主题的日程转换为符合 RFC 5545 标准的 **ICS / Webcal 订阅链接**，适配 Apple Calendar、iCloud、Google Calendar、Outlook 等日历客户端。

---

## 🌟 功能特性

- **📅 多类型日历订阅**：
  - `/spacex.ics` / `/calendar.ics` 导出标准的 RFC-compliant ICS 日历数据。
  - `/ics/:topic.ics` 为每个主题提供独立的 ICS / Webcal 订阅链接。
  - 支持 `webcal://` 协议，可在 Apple Calendar 等设备中实现一键订阅与自动同步。
  - 内置 SpaceX、F1、WTT 乒乓球和 Dota 2 比赛日历，其中 WTT 仅显示主系列赛事里已经公布双方选手和开赛时间的具体比赛，Dota 2 同步 Liquipedia 已公布时间的未来赛事对阵。
- **⚡️ 边缘架构与高性能缓存**：
  - 基于 **Nuxt Hub KV** (Cloudflare KV) 缓存上游 SpaceX 双数据源。
  - 采用 **SWR (Stale-While-Revalidate)** 异步后台刷新技术，前端响应时间降至毫秒级，同时杜绝频繁请求导致上游封禁的风险。
  - 内置基于 UUID 和哈希的版本追踪，确保 `SEQUENCE` 与 `LAST-MODIFIED` 在发射窗口微调时精准更新，避免日历客户端重复提示日程变更。
- **🎨 现代极致视觉体验**：
  - 使用 **Nuxt UI** (Tailwind CSS) 构建的极简、未来感日历界面。
  - 原生支持系统级 **深色模式 (Dark Mode)** 切换，流转顺滑。
  - 内置实时高精度 **发射倒计时** 计时器。
  - **交互式日历组件**：包含日/周/月三视图、迷你日历网格、今日聚焦、事件时间轴，以及可直接交互的发射任务详情卡片；中文环境额外提供农历与二十四节气标注。
  - **高清互动图解**：支持在详情页中一键打开超高清任务发射图解（Infographic），配备带磨砂玻璃背景的 Lightbox 弹窗和双击/点击自适应缩放查看原图功能。
- **🔄 多源日历与实时同步**：
  - 自动聚合 SpaceX 官方 upcoming API 模块的板块卡片信息与高精度的 timings 倒计时数据。
  - 支持 F1 赛程及 WTT 主系列赛事的比赛级日程，并可以继续扩展更多公共日程源。
  - WTT 比赛从官方赛程中提取双方选手、项目、轮次、场馆和开赛时间；未公布对阵的比赛不会生成日历事件。
  - Dota 2 比赛通过 Liquipedia MediaWiki API 获取已公布的比赛时间、双方队伍、赛制和赛事链接，并以独立日历层展示；举办地自动从对应锦标赛页面的 infobox 提取（如 TI 2026 → Shanghai），完赛场次保留 48 小时并附带比分与获胜者。
  - **优雅降级机制**：即使 Timing API 临时故障，仍能依据磁贴基础数据生成日历。
  - **直播任务保活**：当发射任务正处于 Live 直播流状态时，即使当前时间已过原定发射时刻，系统仍会智能地在 Upcoming 列表和日历订阅中予以保留，防止用户在观看直播期间因日程过期被移出而错失跳转入口。
- **🌐 全球多语言支持 (i18n)**：
  - 原生集成 `@nuxtjs/i18n`，首屏自动检测浏览器语言并加载对应语言包，无前缀干净路由。
  - 完整支持 7 种语言：**简体中文、English、日本語、한국어、Español、Français、Deutsch**。
  - 配备基于 LLM JSON Schema 的自动化翻译更新脚本，保障新增文案能够秒级扩展至所有语言。
- **📈 极致的 SEO & 结构化数据**：
  - 自动向页面头部注入 **JSON-LD 谷歌结构化数据 (Schema.org)**，包含 `WebPage` 页面属性、折叠展开 `FAQPage` 解答，以及高精度 `Event` 结构化事件日程，便于 Google 等搜索引擎直接提取并展示即将到来的发射日程卡片。
  - 所有核心交互元素与展示区块均配备了规范且唯一的 `id` 属性，强力保障 SEO 深度锚点可达性的同时，为 E2E 自动化测试流程提供了极佳的可测性。

---

## 🛠️ 技术栈

- **框架核心**：Nuxt 4 (`nuxt`)
- **开发与部署套件**：Nuxt Hub (`@nuxthub/core`) + Cloudflare Workers
- **UI 框架与样式**：Nuxt UI (`@nuxt/ui`) & Tailwind CSS & Heroicons
- **高性能媒体组件**：`@nuxt/image`（为高清图解及任务背景图渲染赋能）
- **国际化引擎**：Nuxt i18n (`@nuxtjs/i18n`)
- **测试框架**：Node.js 原生测试运行器 (`node --test`)
- **运行环境**：Wrangler (`wrangler`)

### 主题订阅地址

| 主题 | ICS / Webcal 路径 |
| --- | --- |
| SpaceX | `/spacex.ics` |
| F1 | `/ics/f1.ics` |
| WTT 乒乓球 | `/ics/wtt.ics` |
| Dota 2 大赛 | `/ics/dota2.ics` |

---

## 📁 项目结构

```text
├── app/                     # Nuxt 4 前端应用层
│   ├── app.vue              # 应用挂载主入口
│   ├── app.config.ts        # 全局 UI 组件主题配色配置
│   ├── assets/              # 全局静态资源及自定义 CSS 样式（渐变、动画）
│   ├── components/          # 封装的 UI 组件库
│   │   ├── AppHeader.vue       # 头部磨砂玻璃导航栏与品牌展示
│   │   ├── HeroSection.vue     # 首屏发射倒计时与核心卡片展示
│   │   ├── OverviewGrid.vue    # 项目核心功能/优势的多维网格卡片
│   │   ├── LaunchCalendar.vue  # 交互式日历、今日聚焦及发射事件时间轴
│   │   ├── MissionDetail.vue   # 任务深度详情卡片及高清图解 Lightbox 弹层
│   │   ├── SubscribePanel.vue  # 快捷日历一键订阅与 ICS 复制面板
│   │   └── FaqSection.vue      # 折叠式 FAQ 问题列表
│   ├── composables/         # 响应式状态与 hooks
│   └── pages/               # 路由页面（主页入口 index.vue）
├── server/                  # Nuxt 4 服务端 (Nitro Engine)
│   ├── api/                 # 结构化 JSON 接口
│   │   ├── launches.get.js          # 获取即将发射的列表（对接 SWR 缓存）
│   │   ├── history-launches.get.js  # 获取历史已发射列表（限制 50 条）
│   │   ├── calendar/[topic].get.js  # 获取 F1、WTT、Dota 2 等主题日历数据
│   │   └── launches/
│   │       └── [slug].get.js        # 获取某特定发射任务的深度图文详情
│   ├── routes/              # ICS 标准订阅路由
│   │   ├── spacex.ics.js            # 主日历源
│   │   ├── calendar.ics.js          # 别名日历源
│   │   └── ics/[topic].ics.js       # F1、WTT、Dota 2 等主题订阅源
│   └── utils/               # 后端工具库
│       ├── kv.js                    # 缓存及 SWR 分布式版本控制逻辑
│       ├── spacex.js                # SpaceX 数据拉取、图解解析与 ICS 组装
│       └── calendars.js             # F1/WTT/Dota 2 数据标准化及通用 ICS 组装
├── i18n/                    # 国际化翻译资源包
│   └── locales/             # 7国语言的 .json 字典及支持配置
├── public/                  # 网站纯静态资源（字体、网站图标、robots、sitemap）
├── scripts/                 # 自动化运维脚本
│   └── translate-locales.js # 基于大模型的自动多语言翻译脚本
├── wrangler.toml            # Cloudflare & KV 空间配置文件
└── nuxt.config.js           # Nuxt 全局配置文件（集成了全局 Favicon v2 配置）
```

---

## 🚀 本地开发与调试

### 1. 克隆并安装依赖
```bash
npm install
```

### 2. 初始化 Nuxt Hub 及 Cloudflare KV（必须）
运行以下命令创建你的本地或线上 Cloudflare KV 命名空间，并将输出的 `id` 填写至 `wrangler.toml` 文件中：
```bash
# 创建生产环境的 KV 空间
npx wrangler kv namespace create SPACEX_KV

# 创建开发/预览环境的 KV 空间
npx wrangler kv namespace create SPACEX_KV --preview
```

### 3. 启动开发服务器
```bash
npm run dev
```
开发服务器将默认运行在：`http://localhost:3000`。
你可以在本地调试以下端点：
- 落地网页：`http://localhost:3000/`
- 日历订阅源：`http://localhost:3000/spacex.ics`
- 发射数据接口：`http://localhost:3000/api/launches`
- 历史任务接口：`http://localhost:3000/api/history-launches`
- WTT 比赛接口：`http://localhost:3000/api/calendar/wtt`
- WTT 订阅源：`http://localhost:3000/ics/wtt.ics`
- Dota 2 比赛接口：`http://localhost:3000/api/calendar/dota2`
- Dota 2 订阅源：`http://localhost:3000/ics/dota2.ics`
- 某任务细节接口：`http://localhost:3000/api/launches/starlink-group-10-1`

---

## 🧪 自动化测试

项目内置了 **41** 项单元测试，覆盖 SpaceX 数据源降级、F1 赛程、WTT 主系列赛事筛选、Dota 2 Liquipedia 比赛解析、比赛双方与比分解析、ICS 文本安全转义、SWR 缓存、时区转换、日历导航以及**直播状态保活逻辑**。

运行命令：
```bash
bun test
node --check server/routes/spacex.ics.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/utils/calendars.js
bun run build
```

---

## 🌍 多语言翻译更新指南

若你在 `i18n/locales/en.json` 中添加或修改了前端界面的词条，无需手动翻修其余 6 种语言。可使用内置大语言模型翻译助手完成一键同步：

1. 配置环境变量：
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```
2. 运行同步脚本（以翻译更新德语、日语、西班牙语为例）：
   ```bash
   bun run translate:locales -- --locales=de,ja,es
   ```

---

## ☁️ 部署上线

本项目部署为 **Cloudflare Workers Module Worker**，由 Workers Assets 提供前端静态资源，由 Nitro Worker 处理 SSR、API 与 ICS 路由。

### 通过 Wrangler 部署

先确保已经登录 Cloudflare，并确认 `wrangler.toml` 中的 KV namespace ID 属于当前账户。

```bash
bun run deploy:worker
```

本地预览 Workers 运行时：

```bash
bun run preview:worker
```

部署后，在 Cloudflare 后台进入 **Workers & Pages → calendarhub-worker → Settings → Domains & Routes**，添加 Custom Domain `calendarhub.mou7s.com`。切换前先移除指向 Pages 的旧 CNAME；Worker Custom Domain 会接管该域名的 DNS 与证书。

### 部署后验证
你可以使用 `curl` 验证日历源响应头是否正确：
```bash
curl -I https://calendarhub.mou7s.com/spacex.ics
curl -I https://calendarhub.mou7s.com/ics/wtt.ics
```
**预期响应**：
```text
HTTP/2 200
content-type: text/calendar; charset=utf-8
cache-control: public, max-age=300
content-disposition: inline; filename="spacex-launches.ics"
```

---

## 📝 备注与免责

- 本项目的数据源均拉取自 SpaceX 官网暴露的真实前端 API，不受 SpaceX v4 历史 API 停止维护的影响。
- WTT 数据来自 [World Table Tennis 官方赛历](https://www.worldtabletennis.com/events_calendar)，仅同步 `WTT Series` 中已经公布对阵和开赛时间的未来比赛。
- Dota 2 数据来自 [Liquipedia Dota 2 比赛列表](https://liquipedia.net/dota2/Liquipedia:Matches)，通过 [Liquipedia MediaWiki API](https://liquipedia.net/api-terms-of-use) 获取，并缓存 30 分钟以降低上游请求频率。举办地按场次对应的锦标赛页面 infobox `Location:` 字段解析（子页无 Location 时自动回退父页，如 `The_International/2026/Main_Event` → `The_International/2026` → Shanghai），仍无法获取时才显示 Online。
- 本项目日历数据只专注于即将到来的/计划中的航天发射任务（Upcoming Launches），详情卡片支持查询最近 50 次已完成发射（History Launches）的元数据。
- 日历事件时间依据浏览器时区或日历客户端设定自动换算，无需手动调整。

---

## 🎨 前端对齐与 Hydration 守则（LaunchCalendar.vue）

### 1. 表头基线对齐
* 月份标题与时区徽章的容器必须使用 `sm:items-baseline`，禁止 `sm:items-center`（中线对齐会让小字号徽章视觉偏高）。
* 大字号标题（`text-2xl`）配合 `!leading-none` 收紧行高盒；小徽章文字用 `leading-none` + `translate-y-px` 做 1px 光学下沉，图标加 `opacity-70` 弱化。

### 2. 分段控件（Day/Week/Month）几何居中
* 容器使用 `grid grid-cols-3` 等分（禁止 flex + 内容宽度），滑动背景宽度精确为 `w-[calc(33.333%-1.34px)]`，位移为 `2px` / `calc(33.333% + 0.67px)` / `calc(66.666% - 0.67px)`。
* 按钮统一 `h-6`（桌面）/ `h-7`（移动）+ `flex items-center justify-center leading-none translate-y-[0.5px]`，并保留 `px-3.5` / `px-2` 横向留白——固定高度 + flex 居中替代 `py-* + line-height`，避免大写字母光学偏上。
* 大写字母的光学中心比几何中心高约 0.5px，`translate-y-[0.5px]` 是校正值，不要放大到 `translate-y-px` 以上。

### 3. SSR/客户端 Hydration 一致性
* **首帧渲染必须与环境无关**：任何依赖 `window.location`、`localStorage`、浏览器时区、`Date.now()`、`Math.random()` 的值，禁止在首次渲染时直接输出。
* 标准模式：ref 给环境无关初始值（如 `timezoneDisplay = ref('UTC')`、webcal 链接默认生产域名），在 `onMounted` 中通过就绪旗标（`isClientReady`）切换到真实客户端值。
* 违反该约定会触发 Vue "Hydration attribute mismatch" 警告；**生产模式只警告不修正 DOM**，会导致页面显示值与代码逻辑值静默分叉。
* 开发时控制台的每个 hydration warning 都必须修掉；`<Suspense> is an experimental feature` 为 Nuxt 固定提示，可忽略。

### 4. Liquipedia（Dota 2）数据抓取守则
* **必须携带 gzip**：Liquipedia API 对不带 `Accept-Encoding: gzip` 的请求直接返回 406。浏览器 fetch 自动处理，curl 调试时记得 `--compressed`。
* **必须带合规 User-Agent**：使用项目常量 `DOTA2_MATCHES_USER_AGENT`，匿名请求会被限流。
* **举办地解析路径**：match 卡片只有锦标赛链接 → 锦标赛子页 infobox 常无 Location → 回退父页解析（见上）。去重后最多并发 4 个锦标赛页请求。
* **上游结构是渲染后 HTML**：用正则解析 `match-info` / `infobox-description` 区块，改版时会静默失配——改动解析逻辑必须先用真实页面数据验证（参考测试里的 sample HTML 与真实 TI 2026 页面）。

---

## 🧪 测试基线

当前测试数量为 **42** 项（`bun test` 全绿为准，本文档与 AGENTS.md 中其他数字过期时以此为准）。新增功能必须同步补测试，特别是涉及外部数据源解析的部分。
