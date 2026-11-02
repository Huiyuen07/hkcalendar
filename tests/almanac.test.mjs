import assert from "node:assert/strict";
import { test } from "node:test";
import { getAlmanac } from "../www/almanac.js";

test("2026-11-02: ordinary day", () => {
  const a = getAlmanac(2026, 11, 2);
  assert.equal(a.lunarYear, "丙午(馬)年");
  assert.equal(a.lunarDate, "九月廿四");
  assert.equal(a.clash, "龍日沖狗");
  assert.deepEqual(a.festivals, []);
  assert.deepEqual(a.yi, ["祭祀", "沐浴", "解除", "破屋", "壞垣", "餘事勿取"]);
});

test("2026-10-18: 重陽節", () => {
  const a = getAlmanac(2026, 10, 18);
  assert.deepEqual(a.festivals, ["重陽節"]);
  assert.equal(a.clash, "牛日沖羊");
  assert.equal(a.lunarDate, "九月初九");
});

test("2026-12-22: 冬至 solar term", () => {
  const a = getAlmanac(2026, 12, 22);
  assert.deepEqual(a.festivals, ["冬至"]);
  assert.equal(a.lunarDate, "冬月十四");
});

test("2027-02-06: 春節 and the new lunar year", () => {
  const a = getAlmanac(2027, 2, 6);
  assert.deepEqual(a.festivals, ["春節"]);
  assert.equal(a.lunarYear, "丁未(羊)年");
  assert.equal(a.lunarDate, "正月初一");
});

test("2025-08-01: leap month", () => {
  assert.equal(getAlmanac(2025, 8, 1).lunarDate, "閏六月初八");
});
