# 模板来源与维护

本项目通过 GitHub 的模板生成接口正式创建自
[`nuxt-ui-templates/calendar`](https://github.com/nuxt-ui-templates/calendar)，随后接入现有 Calendar Hub 应用及完整提交历史。

- 模板仓库生成日期：2026-10-02。
- 生成时上游提交：`11809148a32a40612d1d7ddab8aef5372ad46edf`。
- 新仓库模板初始提交：`683c72afa7f212b3cdafe8214e379bfa0a0b5370`。
- 应用最初的模板迁移提交：`8876ec65c269a6c5016839f223c543ef28f88fe6`（2026-09-14）。
- 最初复制的上游 SHA 未记录，不能把迁移日期推算结果当成已确认的代码基准。

生成时的上游 SHA 用于记录 GitHub 模板来源，并不表示现有应用已同步该版本的全部代码。
接入提交保留现有应用文件树，通过两个父提交同时保留模板初始提交和旧应用历史。
旧仓库 `Mou7s/calendar-hub-legacy` 已于 2026-10-02 按用户要求删除；原应用提交历史仍完整保留在本仓库，并另有本地 Git bundle 备份。旧仓库的 Actions 密钥随仓库删除，不会自动迁入本仓库。

## 后续同步

`origin` 指向本项目，`upstream` 指向官方模板；旧仓库删除后已移除本地 `legacy` remote。
使用 `git fetch upstream` 获取上游历史，再按提交评估差异；获取操作不会合并代码。
模板来源标记不提供自动更新，也不能用两套独立历史的提交数量直接计算应用落后程度。

优先评估展示、布局、无障碍和性能修复。依赖更新需核对 Nuxt 与 Cloudflare Workers 的兼容性。
不得恢复事件新建、编辑、拖拽和服务端写入链路；保持 AGENTS.md 的 ICS UID、响应头、转义、直播保活、时间和多语言约束。
每次同步记录上游 SHA、吸收或跳过的原因，并执行 AGENTS.md 的验证流程。

## 已吸收的上游更新

2026-10-02：

- `11809148a32a40612d1d7ddab8aef5372ad46edf`（#24）：复选框仅在 `highlight: false` 时应用玻璃边框，保留高亮状态的主题色边框。
- `c55df554aacf014f1d600cb32d33857086ec387a`（#21）：接入 Nuxt ESLint 与 Tailwind correctness 检查，支持普通类名和 `:ui` 对象；移植事件块颜色计算，跳过已移除的事件编辑表单改动。
- 依赖对齐：Nuxt UI 等运行依赖已有上游版本；新增开发依赖 `@nuxt/eslint`、`eslint`、`eslint-plugin-better-tailwindcss`，提升 Lucide 声明至 `^1.2.137`（锁定安装版本为 `1.2.138`）。保留 Bun，不引入只读应用不需要的 `gpu-time` 和 `zod`。

运行 `bun run lint` 会先生成 Nuxt 配置再执行检查。根 ESLint 配置由项目维护，关闭自动创建配置以避开 `find-up` 8 的无效 `unicorn-magic` 导入；这不关闭任何检查规则。
