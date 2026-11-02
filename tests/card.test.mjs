import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, mock, test } from "node:test";

let Card;
let Editor;

// A stand-in for elements the editor creates, recording listeners and children.
class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.listeners = {};
    this.children = [];
    this.dispatched = [];
  }
  attachShadow() {}
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  dispatchEvent(event) {
    this.dispatched.push(event);
    return true;
  }
}

// Load the card with just enough browser globals to reach its logic.
before(async () => {
  globalThis.HTMLElement = FakeElement;
  globalThis.window = {};
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  globalThis.customElements = {
    define(name, element) {
      if (name === "chinese-calendar-card") Card = element;
      if (name === "chinese-calendar-card-editor") Editor = element;
    },
  };
  await import("../www/chinese-calendar-card.js");
});

const HOLIDAY = "#CC0000";
const WORKDAY = "#006400";
const allDay = (summary, start, end) => ({ summary, start: { date: start }, end: { date: end } });

function makeCard(config = {}) {
  const card = new Card();
  card.setConfig(config);
  return card;
}

test("shows a full calendar with no configuration", () => {
  const data = makeCard().prepareData(new Date(2026, 10, 2, 16, 48));
  assert.equal(data.englishMonth, "November");
  assert.equal(data.chineseMonth, "十一月");
  assert.equal(data.year, 2026);
  assert.equal(data.day, 2);
  assert.equal(data.weekday, "星期一   Monday");
  assert.equal(data.formattedTime, "04:48 PM");
  assert.equal(data.lunarYear, "丙午(馬)年");
  assert.equal(data.lunar, "九月廿四");
  assert.equal(data.todayText, "龍日沖狗");
  assert.equal(data.eventSummary, "無日程");
  assert.equal(data.themeColor, WORKDAY);
});

test("shows only the first four 宜 and 忌", () => {
  const data = makeCard().prepareData(new Date(2026, 10, 2));
  assert.deepEqual(data.yi, ["祭祀", "沐浴", "解除", "破屋"]);
  assert.ok(data.ji.length <= 4);
});

test("shows short lists as they are and 無 for an empty 忌", () => {
  const data = makeCard().prepareData(new Date(2026, 10, 7));
  assert.deepEqual(data.yi, ["解除", "餘事勿取"]);
  assert.deepEqual(data.ji, ["無"]);
});

test("Sundays use the holiday colour", () => {
  assert.equal(makeCard().prepareData(new Date(2026, 10, 1)).themeColor, HOLIDAY);
});

test("a holiday from a calendar is named and coloured", () => {
  const card = makeCard({ holiday_calendars: ["calendar.hksar"] });
  card._holidayEvents = [allDay("聖誕節", "2026-12-25", "2026-12-26")];
  const data = card.prepareData(new Date(2026, 11, 25));
  assert.ok(data.todayText.startsWith("聖誕節 ｜ "), data.todayText);
  assert.equal(data.themeColor, HOLIDAY);
});

test("a make-up Sunday uses the workday colour and says 補班", () => {
  const card = makeCard();
  card._holidayEvents = [allDay("放假日（2026-02-15 補班）", "2026-02-20", "2026-02-21")];
  const data = card.prepareData(new Date(2026, 1, 15));
  assert.equal(data.themeColor, WORKDAY);
  assert.ok(data.todayText.includes("補班"), data.todayText);
});

test("lunar festivals lead the daily text", () => {
  assert.equal(makeCard().prepareData(new Date(2026, 9, 18)).todayText, "重陽節 ｜ 牛日沖羊");
});

test("today's events are shown", () => {
  const card = makeCard();
  card._events = [allDay("生日", "2026-11-02", "2026-11-03")];
  assert.equal(card.prepareData(new Date(2026, 10, 2)).eventSummary, "生日");
});

test("setConfig accepts an empty config and applies the default colours", () => {
  const card = makeCard();
  assert.equal(card.config.holidayColor, HOLIDAY);
  assert.equal(card.config.workdayColor, WORKDAY);
  assert.deepEqual(card.config.holiday_calendars, []);
  assert.deepEqual(card.config.event_calendars, []);
});

test("tick refreshes the calendars when the day changes", () => {
  const card = makeCard();
  const refresh = mock.fn(function (now) { this._lastRefresh = now.getTime(); });
  card.refreshCalendars = refresh;
  card.render = () => {};
  card.tick(new Date(2026, 10, 2, 23, 59));
  card.tick(new Date(2026, 10, 2, 23, 59, 30));
  assert.equal(refresh.mock.callCount(), 1);
  card.tick(new Date(2026, 10, 3, 0, 0));
  assert.equal(refresh.mock.callCount(), 2);
  assert.equal(refresh.mock.calls[1].arguments[0].getDate(), 3);
});

test("tick refreshes the calendars every ten minutes", () => {
  const card = makeCard();
  const refresh = mock.fn(function (now) { this._lastRefresh = now.getTime(); });
  card.refreshCalendars = refresh;
  card.render = () => {};
  card.tick(new Date(2026, 10, 2, 10, 0));
  card.tick(new Date(2026, 10, 2, 10, 9));
  card.tick(new Date(2026, 10, 2, 10, 10));
  assert.equal(refresh.mock.callCount(), 2);
});

test("tick re-renders when the minute changes", () => {
  const card = makeCard();
  card.refreshCalendars = () => {};
  const render = mock.fn();
  card.render = render;
  card.tick(new Date(2026, 10, 2, 10, 0, 1));
  card.tick(new Date(2026, 10, 2, 10, 0, 2));
  card.tick(new Date(2026, 10, 2, 10, 1, 0));
  assert.equal(render.mock.callCount(), 2);
});

test("refreshCalendars reads the configured calendars for the right ranges", async () => {
  const card = makeCard({ holiday_calendars: ["calendar.hksar"], event_calendars: ["calendar.family"] });
  card.render = () => {};
  const paths = [];
  card._hass = { callApi: async (_m, path) => { paths.push(path); return []; } };
  await card.refreshCalendars(new Date(2026, 10, 2, 10));
  const holiday = paths.find((p) => p.startsWith("calendars/calendar.hksar?"));
  const events = paths.find((p) => p.startsWith("calendars/calendar.family?"));
  assert.ok(holiday.includes(`start=${encodeURIComponent(new Date(2026, 8, 18).toISOString())}`), holiday);
  assert.ok(events.includes(`start=${encodeURIComponent(new Date(2026, 10, 2).toISOString())}`), events);
  assert.ok(events.includes(`end=${encodeURIComponent(new Date(2026, 10, 3).toISOString())}`), events);
});

test("a failing calendar API leaves the almanac working", async () => {
  const error = mock.method(console, "error", () => {});
  const card = makeCard({ holiday_calendars: ["calendar.gone"], event_calendars: ["calendar.gone"] });
  card.render = () => {};
  card._hass = { callApi: async () => { throw new Error("404"); } };
  await card.refreshCalendars(new Date(2026, 10, 2));
  const data = card.prepareData(new Date(2026, 10, 2));
  assert.equal(data.lunar, "九月廿四");
  assert.equal(data.eventSummary, "無日程");
  error.mock.restore();
});

test("the first hass triggers a refresh", () => {
  const card = makeCard();
  const refresh = mock.fn();
  card.refreshCalendars = refresh;
  card.render = () => {};
  card.hass = { callApi: async () => [] };
  card.hass = { callApi: async () => [] };
  assert.equal(refresh.mock.callCount(), 1);
});

test("the card source has no CDN, no fixed paths and no data in innerHTML", async () => {
  const source = await readFile(new URL("../www/chinese-calendar-card.js", import.meta.url), "utf8");
  assert.match(source, /new URL\(`chinese-calendar-card\.css[^`]*`, import\.meta\.url\)/);
  assert.doesNotMatch(source, /['"`]\/local\//);
  assert.doesNotMatch(source, /opencc|jsdelivr/i);
  assert.equal((source.match(/innerHTML\s*=/g) ?? []).length, 1, "only the static template may use innerHTML");
});

test("the card offers its editor", () => {
  assert.equal(Card.getConfigElement().tagName, "chinese-calendar-card-editor");
});

test("the editor shows calendar pickers and colour fields", () => {
  const editor = new Editor();
  editor.setConfig({});
  const form = editor.children[0];
  assert.equal(form.tagName, "ha-form");
  assert.deepEqual(form.schema.map((field) => field.name),
    ["holiday_calendars", "event_calendars", "holidayColor", "workdayColor"]);
  assert.deepEqual(form.schema[0].selector, { entity: { domain: "calendar", multiple: true } });
  assert.equal(form.computeLabel({ name: "holiday_calendars" }), "假期日曆");
});

test("the editor fires config-changed when the form changes", () => {
  const editor = new Editor();
  editor.setConfig({ type: "custom:chinese-calendar-card" });
  const form = editor.children[0];
  form.listeners["value-changed"]({ detail: { value: { holiday_calendars: ["calendar.hksar"] } } });
  const event = editor.dispatched.at(-1);
  assert.equal(event.type, "config-changed");
  assert.deepEqual(event.detail.config,
    { type: "custom:chinese-calendar-card", holiday_calendars: ["calendar.hksar"] });
  assert.equal(event.bubbles, true);
  assert.equal(event.composed, true);
});

test("the editor accepts a config before hass and passes hass on", () => {
  const editor = new Editor();
  assert.doesNotThrow(() => editor.setConfig({}));
  const hass = { states: {} };
  editor.hass = hass;
  assert.equal(editor.children.length, 1);
  assert.equal(editor.children[0].hass, hass);
});

test("the card registers in the card picker", () => {
  const entry = window.customCards.find((card) => card.type === "chinese-calendar-card");
  assert.ok(entry);
  assert.equal(entry.name, "中式掛曆");
});

test("cleared colour fields fall back to the defaults", () => {
  const card = makeCard({ holidayColor: undefined, workdayColor: "" });
  assert.equal(card.config.holidayColor, HOLIDAY);
  assert.equal(card.config.workdayColor, WORKDAY);
});
