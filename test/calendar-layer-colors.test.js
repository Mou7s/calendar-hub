import test from "node:test";
import assert from "node:assert/strict";

import {
  CALENDAR_LAYER_COLORS,
  CALENDAR_LAYER_COLORS_KEY,
  isCalendarLayerColor,
  resolveCalendarLayerColor,
} from "../app/utils/calendar-colors.js";

// 图层取色只能是 6 个 Nuxt UI 主题色：app/utils/calendars.ts 的 class 映射是
// 构建时静态生成的，任意 hex 走不通，超出的值必须退回服务端默认。

test("图层颜色是 6 个 Nuxt UI 主题色（与 calendars.ts 的 class 映射对齐）", () => {
  assert.deepEqual([...CALENDAR_LAYER_COLORS].sort(), [
    "error",
    "info",
    "primary",
    "secondary",
    "success",
    "warning",
  ]);
});

test("isCalendarLayerColor 只认清单里的值", () => {
  for (const color of CALENDAR_LAYER_COLORS) {
    assert.equal(isCalendarLayerColor(color), true);
  }

  assert.equal(isCalendarLayerColor("red"), false);
  assert.equal(isCalendarLayerColor("#ff0000"), false);
  assert.equal(isCalendarLayerColor(""), false);
  assert.equal(isCalendarLayerColor(undefined), false);
});

test("resolveCalendarLayerColor：非法覆盖退回服务端默认", () => {
  assert.equal(resolveCalendarLayerColor("info", "error"), "error");
  assert.equal(resolveCalendarLayerColor("info", "red"), "info");
  assert.equal(resolveCalendarLayerColor("info", undefined), "info");
});

test("localStorage key 稳定（改名会丢掉用户已存的选择）", () => {
  assert.equal(CALENDAR_LAYER_COLORS_KEY, "calendar-layer-colors");
});
