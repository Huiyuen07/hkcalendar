import assert from "node:assert/strict";
import { test } from "node:test";
import { Solar } from "../www/lunar-lib.js";

test("exports Solar without leaking globals", () => {
  assert.deepEqual(Solar.fromYmd(2026, 11, 2).getLunar().getDayYi(), [
    "祭祀", "沐浴", "解除", "破屋", "坏垣", "馀事勿取",
  ]);
  assert.equal(globalThis.Solar, undefined);
});
