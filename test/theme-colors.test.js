import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { generateThemeColorsCss, OUTPUT_PATH } from "../scripts/generate-theme-colors.js";
import {
  THEME_NEUTRAL_COLORS,
  THEME_NEUTRAL_KEY,
  THEME_PRIMARY_COLORS,
  THEME_PRIMARY_KEY,
  isThemeNeutralColor,
  isThemePrimaryColor,
  themeColorsBootstrapScript,
} from "../app/utils/theme-colors.js";

// 设置里挑的主色 / 中性色要活到刷新之后，靠的是三处对齐：localStorage 的 key、
// nuxt.config.ts 内联进 <head> 的首帧脚本盖上的 data-ui-*、以及生成出来的
// theme-colors.css。下面守住的就是这份契约。

test("theme-colors.css 是生成脚本的产物（改过清单没重跑生成会在这里失败）", () => {
  const onDisk = readFileSync(OUTPUT_PATH, "utf8").replace(/\r\n/g, "\n");

  assert.equal(onDisk, generateThemeColorsCss());
});

test("每个可选调色板都有一条 data-ui-* 规则，并覆盖 11 档", () => {
  const css = generateThemeColorsCss();

  for (const palette of THEME_PRIMARY_COLORS) {
    assert.match(css, new RegExp(`html\\[data-ui-primary='${palette}'\\] \\{`));
  }

  for (const palette of THEME_NEUTRAL_COLORS) {
    assert.match(css, new RegExp(`html\\[data-ui-neutral='${palette}'\\] \\{`));
  }

  assert.equal((css.match(/--ui-color-primary-/g) || []).length, THEME_PRIMARY_COLORS.length * 11);
  assert.equal((css.match(/--ui-color-neutral-/g) || []).length, THEME_NEUTRAL_COLORS.length * 11);
});

test("中性色里的 `neutral` 走 old-neutral，不撞 Nuxt UI 自己的中性色别名", () => {
  const css = generateThemeColorsCss();

  assert.match(css, /html\[data-ui-neutral='neutral'\] \{[\s\S]*--ui-color-neutral-50: var\(--color-old-neutral-50,/);
  // 其余调色板直接用同名变量
  assert.match(css, /html\[data-ui-neutral='zinc'\] \{[\s\S]*--ui-color-neutral-50: var\(--color-zinc-50,/);
});

// 首帧脚本是唯一无法靠看代码确认的一环：它抢在应用渲染之前跑，出错只会表现为
// 「刷新先闪一下默认色」。这里给它一个假的 localStorage / document 真跑一遍
function runBootstrap(store) {
  const document = { documentElement: { dataset: {} } };
  const localStorage = { getItem: (key) => (key in store ? store[key] : null) };

  new Function("localStorage", "document", themeColorsBootstrapScript())(localStorage, document);

  return document.documentElement.dataset;
}

test("首帧脚本把存储里的选择盖到 <html> 上", () => {
  // `useLocalStorage` 的兜底值是字符串 → vueuse 用 string 序列化器，存的是裸值。
  // 这是真机上的实际形态，写错格式就等于「刷新后又回到默认色」
  assert.deepEqual(
    runBootstrap({ [THEME_PRIMARY_KEY]: "blue", [THEME_NEUTRAL_KEY]: "stone" }),
    { uiPrimary: "blue", uiNeutral: "stone" }
  );
  // 带引号的 JSON 形态（旧值 / 手写）也认
  assert.deepEqual(
    runBootstrap({ [THEME_PRIMARY_KEY]: '"blue"' }),
    { uiPrimary: "blue" }
  );
});

test("首帧脚本在没存过、或存的东西不是字符串时不碰 <html>，也不抛错", () => {
  assert.deepEqual(runBootstrap({}), {});
  assert.deepEqual(runBootstrap({ [THEME_PRIMARY_KEY]: "null" }), {});
  assert.deepEqual(runBootstrap({ [THEME_PRIMARY_KEY]: '{"primary":"blue"}' }), {});
  // 只挑了主色时，中性色留空交给 Nuxt UI 自己的默认值
  assert.deepEqual(runBootstrap({ [THEME_PRIMARY_KEY]: "rose" }), { uiPrimary: "rose" });
});

test("nuxt.config.ts 内联的就是这条首帧脚本", () => {
  const config = readFileSync(new URL("../nuxt.config.ts", import.meta.url), "utf8");

  assert.match(config, /innerHTML: themeColorsBootstrapScript\(\)/);
});

test("存储里不认识的值会被认作非法（调用方据此退回默认色）", () => {
  assert.equal(isThemePrimaryColor("blue"), true);
  assert.equal(isThemePrimaryColor("brand"), false);
  assert.equal(isThemePrimaryColor(undefined), false);
  assert.equal(isThemeNeutralColor("zinc"), true);
  assert.equal(isThemeNeutralColor("chartreuse"), false);
});
