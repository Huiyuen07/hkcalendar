// 由 lunar-javascript 計算某日的農曆、宜忌、沖煞、節日和節氣，並轉成繁體。
// Compute the lunar date, almanac, clash, festivals and solar term for a day,
// in Traditional Chinese.
import { Solar } from "./lunar-lib.js";
import { toTraditional } from "./zh-hant.js";

// Takes local calendar numbers (never a Date parsed from a string), so the
// result does not depend on the browser's time zone.
export function getAlmanac(year, month, day) {
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const solarTerm = lunar.getJieQi();
  return {
    lunarYear: toTraditional(`${lunar.getYearInGanZhi()}(${lunar.getYearShengXiao()})年`),
    lunarDate: toTraditional(`${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`),
    yi: lunar.getDayYi().map(toTraditional),
    ji: lunar.getDayJi().map(toTraditional),
    clash: toTraditional(`${lunar.getDayShengXiao()}日冲${lunar.getDayChongShengXiao()}`),
    festivals: [...lunar.getFestivals(), ...(solarTerm ? [solarTerm] : [])].map(toTraditional),
  };
}
