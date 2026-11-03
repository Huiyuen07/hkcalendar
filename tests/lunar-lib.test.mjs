import assert from "node:assert/strict";
import { test } from "node:test";
import { Solar } from "../dist/lunar-lib.js";

test("exports Solar without leaking globals", () => {
  assert.deepEqual(Solar.fromYmd(2026, 11, 2).getLunar().getDayYi(), [
    "祭祀", "沐浴", "解除", "破屋", "坏垣", "馀事勿取",
  ]);
  assert.equal(globalThis.Solar, undefined);
});

test("still exports Solar when the page has an AMD loader", async () => {
  const define = () => {};
  define.amd = {};
  globalThis.define = define;
  try {
    const lib = await import("../dist/lunar-lib.js?amd");
    assert.equal(typeof lib.Solar?.fromYmd, "function");
  } finally {
    delete globalThis.define;
  }
});
