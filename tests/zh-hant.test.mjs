import assert from "node:assert/strict";
import { test } from "node:test";
import { Solar } from "../dist/lunar-lib.js";
import { CHAR_MAP, toTraditional } from "../dist/zh-hant.js";

// Every string the card takes from lunar-js for one day.
function lunarStrings(lunar) {
  return [
    ...lunar.getDayYi(), ...lunar.getDayJi(), ...lunar.getFestivals(),
    lunar.getMonthInChinese(), lunar.getDayInChinese(), lunar.getYearInGanZhi(),
    lunar.getYearShengXiao(), lunar.getDayShengXiao(), lunar.getDayChongShengXiao(),
    lunar.getJieQi(),
  ];
}

test("converts almanac vocabulary", () => {
  assert.equal(toTraditional("馀事勿取"), "餘事勿取");
  assert.equal(toTraditional("启钻"), "啟鑽");
  assert.equal(toTraditional("龙日冲狗"), "龍日沖狗");
  assert.equal(toTraditional("腊八节"), "臘八節");
  assert.equal(toTraditional("闰六"), "閏六");
  assert.equal(toTraditional("坏垣"), "壞垣");
});

test("passes unknown characters through unchanged", () => {
  assert.equal(toTraditional("ABC 測試"), "ABC 測試");
});

test("every character lunar-js emits from 1900 to 2100 is classified", () => {
  const missing = new Set();
  const day = new Date(Date.UTC(1900, 0, 1));
  const end = Date.UTC(2100, 11, 31);
  for (; day.getTime() <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const lunar = Solar.fromYmd(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()).getLunar();
    for (const text of lunarStrings(lunar)) {
      for (const ch of text) if (!Object.hasOwn(CHAR_MAP, ch)) missing.add(ch);
    }
  }
  assert.deepEqual([...missing], [], `unclassified characters: ${[...missing].join("")}`);
});

test("never produces 衝", () => {
  assert.ok(!Object.values(CHAR_MAP).includes("衝"));
});
