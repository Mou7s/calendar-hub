<p align="center">
  <a href="./README.md">English</a> · 简体中文
</p>

# Calendar Hub

一个只读日历聚合应用，将 SpaceX 发射、F1 赛程、WTT 乒乓球和 Dota 2 比赛整理为可订阅的 **ICS 日历源**，并提供多语言日历界面。

**核心是日历订阅，网页是浏览与订阅入口。** 将订阅链接添加到日历客户端后，客户端会按自身的刷新周期获取更新。

在线访问：[calendarhub.mou7s.com](https://calendarhub.mou7s.com)

## 日历订阅

网站的「订阅」弹窗提供 `webcal://` 一键订阅和 HTTPS 链接复制。也可以在 Apple 日历、Google 日历或 Outlook 的「通过网址订阅日历」功能中粘贴以下链接。

| 主题 | 订阅地址 | 数据范围 |
| --- | --- | --- |
| SpaceX | [spacex.ics](https://calendarhub.mou7s.com/spacex.ics) | 发射时间、载具、发射场和官方直播链接；直播中的任务在计划时间过去后仍会保留 |
| F1 | [f1.ics](https://calendarhub.mou7s.com/ics/f1.ics) | 从 F1 官方当前 2026 赛历和分站页面获取练习赛、冲刺赛、排位赛及正赛时间 |
| WTT | [wtt.ics](https://calendarhub.mou7s.com/ics/wtt.ics) | 已公布双方选手与开赛时间的比赛；通常保留十六强及以后轮次，普通 Contender 仅保留决赛 |
| Dota 2 | [dota2.ics](https://calendarhub.mou7s.com/ics/dota2.ics) | Liquipedia 赛事与赛程，按服务端规则筛选；已结束比赛保留 48 小时，附比分及胜者 |

页面与 `/api/topics` 均提供以上四个主题。

SpaceX 还保留 `/calendar.ics`、`/launches.ics` 和 `/ics/spacex.ics` 入口，兼容已有订阅。

## 页面功能

- 日、周、月三种视图，路由为 `/day/<日期>`、`/week/<日期>`、`/month/<日期>`；日期格式为 `YYYY-MM-DD`。首页跳转至今天的月视图，非法视图或日期返回 404。
- 月视图支持虚拟化无限滚动，按区间加载事件，并在滚动时同步地址栏。
- 图层开关、迷你日历、事件搜索和详情弹窗；图层可见性通过 cookie 保存。
- 玻璃质感界面，支持深浅主题、主色与中性色选择，并在首次绘制前恢复保存的配色。
- 支持简体中文、英语、日语、韩语、西班牙语、法语和德语，语言切换不改变 URL 路径。
- 简体中文界面显示农历与节气，内置 1900–2100 年完整数据。
- 提供离线状态提示，以及全站 SEO 和下一次发射的 JSON-LD 结构化数据。

应用只展示上游数据，不提供新建、编辑、删除事件或拖拽改期功能。

## 技术与数据流程

基于 [Nuxt UI Calendar 模板](https://github.com/nuxt-ui-templates/calendar)，使用 Nuxt 4、Nuxt UI 4、Tailwind CSS、NuxtHub KV 和 Cloudflare Workers，包管理器为 Bun。当前配置启用 Nuxt 兼容版本 5 与 SSR 流式渲染，相关兼容处理位于 `build/` 和服务端插件中。

数据流：**上游赛程 → 服务端标准化与 KV 缓存 → ICS 订阅源 / JSON 接口 → 日历客户端与网页**。

- SpaceX 合并官网前端使用的 GraphQL Page Tiles 与 TIMING JSON 数据源。
- F1 根据官方当前赛历加载分站会话，限制并发抓取，避免将不完整赛季写入 KV。
- WTT 解析官方赛事与比赛数据；Dota 2 解析 Liquipedia 数据，使用明确的 `User-Agent` 并缓存结果。
- 每小时整点执行 `calendar:sync`，同步 SpaceX 和 F1；其它主题按请求使用各自缓存流程。
- `/api/events` 独立加载各源，按时间交叠筛选、按 ID 去重，并根据 `locale` 选择标题；全部数据源失败才返回 502。
- 事件起止时间使用绝对 ISO 时间，网页和日历客户端按用户本地时区显示。

上游可能调整赛程、延迟公布时间或改变页面结构。静态主题需人工维护；具体安排以对应赛事或活动官方信息为准。

## 本地开发

准备 Bun（`package.json` 声明版本为 `1.4.0`），然后执行：

```bash
bun install
bun run dev
```

默认访问 `http://localhost:3000`。需要更换端口时使用环境变量，例如 PowerShell：

```powershell
$env:PORT = '3111'
bun run dev
```

不要追加 `--host --port 3111`，该组合可能被解析为无效主机名。

### 常用接口

| 接口 | 用途 |
| --- | --- |
| `/api/calendars` | 页面使用的四个图层 |
| `/api/topics` | 全部主题及订阅路径 |
| `/api/events?start=...&end=...&locale=zh-CN` | 聚合事件；查询窗口最多 90 天 |
| `/api/launches` | 即将发射的任务 |
| `/api/history-launches` | 历史发射 |
| `/api/launches/<slug>` | 单个发射任务详情 |
| `/api/calendar/<topic>` | 指定主题的 JSON 数据 |
| `/spacex.ics`、`/ics/<topic>.ics` | 日历订阅源 |

启动开发服务后，可在 PowerShell 中核对真实响应：

```powershell
curl.exe -s http://localhost:3000/api/calendars
curl.exe -s 'http://localhost:3000/api/events?start=2026-10-01T00:00:00Z&end=2026-11-01T00:00:00Z&locale=zh-CN'
curl.exe -sD - -o NUL http://localhost:3000/spacex.ics
```

## 项目结构

```text
app/                       前端应用、日历视图、详情与订阅弹窗
  composables/             路由状态、事件加载、农历与主题配色
  utils/                   日期、事件布局、图层呈现和主题工具
server/
  api/                     图层、主题、事件与任务 JSON 接口
  routes/                  ICS 订阅路由
  utils/                   数据抓取、标准化、ICS 序列化与 KV 缓存
  tasks/calendar/sync.js   定时同步入口
  plugins/                 URL 与流式响应兼容处理
shared/                    前后端事件类型与共享时间工具
i18n/locales/              七种语言的词条
build/                     构建兼容处理
scripts/                   翻译与主题色 CSS 生成脚本
test/                      数据、订阅、主题与兼容性测试
public/                    静态资源、robots 与 sitemap
nuxt.config.ts             Nuxt、国际化、KV 与 Nitro 配置
wrangler.toml              Workers 域名、KV 绑定和定时触发器
```

## 开发约束

详细规则见 [AGENTS.md](./AGENTS.md)。修改数据接入或订阅行为时尤其注意：

1. **保持事件身份稳定**：SpaceX UID 固定为 `UID:${mission.correlationId || mission.id}@spacexcalendar.local`，修改会造成订阅重复。
2. **保持订阅响应契约**：`/spacex.ics` 使用以下响应头；主题路由的文件名为对应主题名。

   ```text
   Content-Type: text/calendar; charset=utf-8
   Content-Disposition: inline; filename="spacex-launches.ics"
   Cache-Control: public, max-age=300
   ```

3. **安全序列化**：ICS 文本字段必须经过 `escapeIcsText`；直播中的任务即使超过计划时间，也必须保留在 upcoming 与订阅源中。
4. **保持只读**：不恢复模板中的事件写入、编辑和拖拽链路。新增 `CalendarEvent` 字段保持可选，起止时间保持绝对 ISO，缓存键必须考虑语言。
5. **在服务端裁剪订阅内容**：普通 `WTT Contender` 仅保留决赛，不包括 Star Contender 和 Youth Contender。调整范围会使已订阅比赛消失，须先评估影响；页面过滤不能代替 ICS 裁剪。
6. **同步界面词条**：新增文案至少同时更新 `zh-CN.json` 与 `en.json`，优先复用现有词条。
7. **保持边缘运行轻量**：引入依赖前检查服务端产物体积，不把完整农历表替换成单年对照表。

### 词条和主题色维护

修改中英文词条后，可同步其它语言（需要 OpenAI API Key）：

```powershell
$env:OPENAI_API_KEY = 'your-key'
bun run translate:locales -- --locales=ja,ko,es,fr,de
```

调整主题色列表后重新生成 CSS：

```bash
bun run generate:theme-colors
```

## 验证

提交代码或部署前，按顺序执行：

```bash
bun test
node --check server/utils/calendars.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/routes/spacex.ics.js
bun run typecheck
bun run lint
bun run build
git diff --check
```

前端或数据接入变更还应启动开发服务，核对真实 API、ICS 响应头和页面展示。测试数量以实际运行结果为准。

## Cloudflare Workers 部署

前端静态资源通过 Workers Assets 提供，SSR、API 与 ICS 由 Nitro Worker 处理。

部署前检查 `wrangler.toml`：自定义域名、当前账户的 KV namespace，以及每小时整点的 Cron 配置。`SPACEX_KV` 与 `KV` 使用同一个生产 namespace。

```bash
bun run preview:worker   # 构建并在本地 Workers 运行时预览
bun run deploy:worker    # 构建并部署到 Cloudflare
```

部署脚本使用构建生成的 `.output/server/wrangler.json`。部署完成后还应核对实际订阅响应：

```powershell
curl.exe -I https://calendarhub.mou7s.com/spacex.ics
curl.exe -I https://calendarhub.mou7s.com/ics/wtt.ics
```

## 常见问题

- **API 返回 Nuxt 欢迎页**：检查是否运行着使用旧模块图或缓存的开发进程。通过 `.nuxt/nuxt.lock` 确认对应 PID，停止该进程后清理项目内的 `.nuxt`、`.output`，再启动服务。
- **提示已有 Nuxt 开发进程**：核对锁文件中的 PID，确认该进程属于本项目后处理，避免误停其它服务。
- **本地定时同步跳过**：没有可用 KV 绑定时，定时任务会跳过；生产部署需要正确的 Cloudflare KV 配置。
- **订阅内容未立即更新**：日历客户端有自己的刷新周期，上游数据和本站缓存也会影响更新时间。

## 许可

采用 [MIT 许可证](./LICENSE)。界面基于官方 [nuxt-ui-templates/calendar](https://github.com/nuxt-ui-templates/calendar) 模板。
