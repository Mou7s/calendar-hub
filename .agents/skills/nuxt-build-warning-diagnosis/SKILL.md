---
name: nuxt-build-warning-diagnosis
description: Diagnose Nuxt build warnings and client bundle size in calendar-hub, including future compatibility defaults, Vite plugin hooks, and deferred dialogs.
---

# Nuxt build warning diagnosis

## Find the actual pipeline

Read nuxt.config.ts, package.json, and installed package versions. A future.compatibilityVersion value changes defaults; it does not install that Nuxt major version. Check installed @nuxt/schema defaults and official release notes instead of assuming every future option is enabled.

When Vite reports ignored config/configResolved/configureServer hooks inside applyToEnvironment, inspect the originating plugin and current stable release. Do not suppress warnings or patch node_modules. In Nuxt 4.5, future compatibility 5 enables experimental.viteEnvironmentApi; opting out of that specific feature can retain working module hooks while preserving other future defaults. Keep an explanatory comment and re-evaluate the opt-out when modules gain support. The official migration reference is https://github.com/nuxt/nuxt/blob/main/docs/1.getting-started/18.upgrade.md.

## Measure before splitting

Run `bun x nuxt analyze --no-serve` for an evidence-based baseline. The report may be under node_modules/.cache/nuxt/.nuxt/analyze, rather than root .nuxt. Use `rg --files --hidden --no-ignore` when discovering generated reports. Analysis output is not deployable; finish with a normal build.

Use the visualizer module data to identify heavy imports. Keep total downloaded bytes, largest individual chunk, and Workers output size distinct. Smaller individual chunks alone do not prove a faster first page. Nuxt may emit low-priority prefetch hints for lazy dialogs; distinguish deferred initialization from zero first-page downloads.

For optional dialogs, Nuxt's Lazy component prefix needs conditional rendering to defer loading. Search every reference, including app/error.vue: a static import elsewhere can prevent the dynamic split. Mount on first open and retain the component after closing to preserve its state; initialize the mount flag from the current open state. Keep useCalendarEvents at the root so SSR prefetch and hydration remain consistent.

Scope Rolldown chunk groups to the client in vite:extendConfig. Use Windows-compatible path separators in regexes. Validate actual production JavaScript in a browser because module splitting can change initialization order. Reference: https://rolldown.rs/reference/OutputOptions.codeSplitting.

## Nuxt ESLint and Tailwind checks

`bun run lint` prepares Nuxt before ESLint. The maintained root config imports `.nuxt/eslint.config.mjs`; the module explicitly generates there even when other Nuxt outputs use a cache directory. Keep `eslint.config.autoInit: false`: @nuxt/eslint 1.17's optional root-config creation imports find-up 8, whose unicorn-magic import is invalid. The normal generated config and checks remain enabled.

Use better-tailwindcss's correctness preset with the actual CSS entry point and object-value extraction for `v-bind:ui`. Inline class-map index expressions with string fallback or type assertions can be mistaken for class literals; move color selection to a computed value or typed helper, as in EventBlock and List, rather than allowing arbitrary unknown classes. Declare the Nitro-provided hubKV global only for its consuming file. Verify unknown classes, conflicting classes and :ui values with ESLint.lintText as well as a clean whole-repository lint run.

## Build verification

Follow AGENTS.md's complete tests, syntax checks, typecheck, build, and diff check. Also make real requests to the dev server and test the production Workers bundle locally. Confirm all seven language changes, font resource loading, search and subscription first-open/reopen, date views, and invalid-route status. Keep ICS headers, UIDs, escaping, and read-only behavior stable.

Check all usages before deleting legacy draft/drag helpers. Some constants still support event display even when editing has been removed. Never raise the chunk warning threshold just to hide it. Report remaining plugin timing or upstream annotation warnings separately from failed builds.

## SSR streaming compatibility

For Nuxt 4.5.2, inspect the actual callback before attributing E8001 to i18n: i18n's payload injection is conditional on experimental.preload, while Nuxt's dev-server-logs plugin also appends JSON using render:html. Streamed body additions belong in render:html:close; retain render:html for buffered crawler responses.

The repository's build/ssr-streaming-compat.js adapts build inputs without editing installed packages. It moves development logs to the close hook, places framework-owned HTML headers before the renderer's diagnostic snapshot, and flushes plugin-created cookies at app:created while retaining final-cookie and late-mutation checks. server/plugins/streaming-response.js establishes the default OK reason phrase before rendering. Component-only preferences such as hidden-calendars are read-only on the server and persist changes on the client.

Re-evaluate these adapters on Nuxt upgrades; source-shape guards and test/ssr-streaming-compat.test.js deliberately fail when the relevant upstream implementation changes. Do not disable E8001/E8002 diagnostics. Validate fresh requests without cookies and with locale cookies, all date views, invalid-route 404, crawler buffered delivery, development log payloads, Set-Cookie headers, browser language switching, and the production Workers bundle. Restart dev after adding a Nitro plugin so discovery is refreshed.

Nuxt 4.6 moves streaming into `nuxt/dist/runtime/server/renderer/index.js`; the Nitro handler delegates through `createNuxtRenderer`. Adapt the new renderer's Headers writes before its diagnostic snapshot and keep the delegation guard. Inline `nuxt/dist/runtime/server/` in Nitro externals so dev resolves build artifacts and replaces `import.meta.dev`; raw external execution causes `Either manifest or precomputed data must be provided`. Keep Vite environments enabled. Exclude i18n runtime files from optimizer scan entries (a negative node_modules glob), as package exclusion alone does not exclude Nuxt's explicit runtime entries and `#components` can be mistaken for a package import. Verify with a fresh dev start and real HTML requests, not only a successful server build.

Keep h3 on the major supported by Nitro 2 (h3 1), and TypeScript compatible with vue-tsc (TypeScript 6 with vue-tsc 3.3.12). VueUse 15 uses a scheduler option for `useNow`; preserve minute updates through `useIntervalFn`. Nuxt's typed route params need `in` checks on shared composables and page metadata callbacks that can also receive routes without params. Run typecheck and dev/build sequentially because they share generated Nuxt files.
