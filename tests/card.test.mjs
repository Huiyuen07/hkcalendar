import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, test } from "node:test";

const CONFIG = {
  date_entity: "sensor.date",
  time_entity: "sensor.time",
  lunar_year_entity: "sensor.lunar_year",
  lunar_entity: "sensor.lunar_date",
  yi_entity: "sensor.trad_cal_yi",
  ji_entity: "sensor.trad_cal_ji",
  rolling_text_entity: "input_text.calendar",
  today_entity: "sensor.today",
  workday_entity: "binary_sensor.hksar_workday",
  holidayColor: "#d43b02",
  workdayColor: "#2e8b57",
};

const BASE_STATES = {
  "sensor.date": "2026-01-05",
  "sensor.time": "16:48",
  "sensor.lunar_year": "丙午(马)年",
  "sensor.lunar_date": "九月大廿二",
  "sensor.trad_cal_yi": "祭祀 出行",
  "sensor.trad_cal_ji": "冠带 破屋",
  "input_text.calendar": "無日程",
  "sensor.today": "虎日衝猴",
  "binary_sensor.hksar_workday": "on",
};

let Card;

// Load the card with just enough browser globals to reach its pure logic.
before(async () => {
  globalThis.HTMLElement = class {
    attachShadow() {}
  };
  globalThis.window = { OpenCC: { Converter: () => (text) => text } };
  globalThis.document = { createElement: () => ({}) };
  globalThis.customElements = {
    define(name, element) {
      if (name === "chinese-calendar-card") Card = element;
    },
  };
  await import("../www/chinese-calendar-card.js");
});

function prepare(stateOverrides = {}, config = CONFIG) {
  const card = new Card();
  const states = { ...BASE_STATES, ...stateOverrides };
  card._hass = {
    states: Object.fromEntries(Object.entries(states).map(([id, state]) => [id, { state }])),
  };
  card.config = config;
  return card.prepareData();
}

test("formats the Gregorian date and 12-hour time", () => {
  const data = prepare();
  assert.equal(data.englishMonth, "January");
  assert.equal(data.chineseMonth, "一月");
  assert.equal(data.year, 2026);
  assert.equal(data.day, 5);
  assert.equal(data.formattedTime, "04:48 PM");
});

test("shows midnight and noon correctly", () => {
  assert.equal(prepare({ "sensor.time": "00:05" }).formattedTime, "12:05 AM");
  assert.equal(prepare({ "sensor.time": "12:05" }).formattedTime, "12:05 PM");
});

test("splits 宜 and 忌 into items", () => {
  const data = prepare();
  assert.deepEqual(data.yi, ["祭祀", "出行"]);
  assert.deepEqual(data.ji, ["冠带", "破屋"]);
});

test("normalises 衝 to 沖 in the daily text", () => {
  assert.equal(prepare().todayText, "虎日沖猴");
});

test("uses the workday colour on a normal weekday", () => {
  assert.equal(prepare().themeColor, CONFIG.workdayColor);
});

test("uses the holiday colour on Sundays and holidays", () => {
  assert.equal(prepare({ "sensor.date": "2026-01-04" }).themeColor, CONFIG.holidayColor);
  assert.equal(prepare({ "binary_sensor.hksar_workday": "off" }).themeColor, CONFIG.holidayColor);
});

test("loads the stylesheet relative to the card, not a fixed path", async () => {
  const source = await readFile(new URL("../www/chinese-calendar-card.js", import.meta.url), "utf8");
  assert.match(source, /new URL\(`chinese-calendar-card\.css[^`]*`, import\.meta\.url\)/);
  assert.doesNotMatch(source, /['"`]\/local\//);
});

test("setConfig rejects a config with missing entities", () => {
  const card = new Card();
  assert.throws(() => card.setConfig({ date_entity: "sensor.date" }), /實體/);
});

test("setConfig applies the default colours", () => {
  const card = new Card();
  const { holidayColor, workdayColor, ...config } = CONFIG;
  card.setConfig(config);
  assert.equal(card.config.holidayColor, "#CC0000");
  assert.equal(card.config.workdayColor, "#006400");
});
