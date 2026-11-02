import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  addDays, dayKey, eventOverlapsDay, fetchEvents, formatEvents, formatTime12, holidayStatus,
} from "../www/calendar-data.js";

const allDay = (summary, start, end) => ({ summary, start: { date: start }, end: { date: end } });
const timed = (summary, start, end) => ({
  summary, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() },
});

test("dayKey and addDays use local dates", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(dayKey(addDays(new Date(2026, 11, 31, 12), 1)), "2027-01-01");
  assert.equal(dayKey(addDays(new Date(2026, 2, 1), -1)), "2026-02-28");
});

test("all-day end dates are exclusive", () => {
  const ev = allDay("聖誕節", "2026-12-25", "2026-12-26");
  assert.equal(eventOverlapsDay(ev, "2026-12-25"), true);
  assert.equal(eventOverlapsDay(ev, "2026-12-26"), false);
});

test("a three-day all-day event covers its middle day", () => {
  assert.equal(eventOverlapsDay(allDay("春節", "2027-02-06", "2027-02-09"), "2027-02-07"), true);
});

test("a timed event that started yesterday overlaps today", () => {
  const ev = timed("夜更", new Date(2026, 10, 1, 23), new Date(2026, 10, 2, 1));
  assert.equal(eventOverlapsDay(ev, "2026-11-02"), true);
  assert.equal(eventOverlapsDay(ev, "2026-11-03"), false);
});

test("an all-day holiday event marks the day", () => {
  const events = [allDay("聖誕節", "2026-12-25", "2026-12-26")];
  assert.deepEqual(holidayStatus(events, "2026-12-25", false),
    { isHoliday: true, names: ["聖誕節"], isMakeupWorkday: false });
});

test("a plain Sunday is a holiday", () => {
  assert.deepEqual(holidayStatus([], "2026-11-01", true),
    { isHoliday: true, names: [], isMakeupWorkday: false });
});

test("a make-up workday named in a holiday title turns a Sunday into a workday", () => {
  const events = [allDay("放假日（2026-02-15 補班）", "2026-02-20", "2026-02-21")];
  assert.deepEqual(holidayStatus(events, "2026-02-15", true),
    { isHoliday: false, names: [], isMakeupWorkday: true });
});

test("Simplified 补班 also counts", () => {
  const events = [allDay("放假日（2026-02-15 补班）", "2026-02-20", "2026-02-21")];
  assert.equal(holidayStatus(events, "2026-02-15", true).isMakeupWorkday, true);
});

test("a holiday on any calendar beats a make-up workday", () => {
  const events = [
    allDay("放假日（2026-02-15 補班）", "2026-02-20", "2026-02-21"),
    allDay("農曆年三十", "2026-02-15", "2026-02-16"),
  ];
  assert.equal(holidayStatus(events, "2026-02-15", true).isHoliday, true);
});

test("duplicate holiday names from two calendars appear once", () => {
  const events = [allDay("聖誕節", "2026-12-25", "2026-12-26"), allDay("聖誕節", "2026-12-25", "2026-12-26")];
  assert.deepEqual(holidayStatus(events, "2026-12-25", false).names, ["聖誕節"]);
});

test("timed events are excluded from holiday names", () => {
  const events = [timed("開會", new Date(2026, 11, 25, 9), new Date(2026, 11, 25, 10))];
  assert.deepEqual(holidayStatus(events, "2026-12-25", false).names, []);
});

test("formatEvents sorts all-day first and prefixes start times", () => {
  const events = [
    timed("開會", new Date(2026, 10, 2, 9, 30), new Date(2026, 10, 2, 10, 30)),
    allDay("生日", "2026-11-02", "2026-11-03"),
    allDay("明天", "2026-11-03", "2026-11-04"),
  ];
  assert.equal(formatEvents(events, "2026-11-02"), "生日  |  09:30 AM 開會");
});

test("formatEvents shows only the title for an event that started earlier", () => {
  const events = [timed("夜更", new Date(2026, 10, 1, 23), new Date(2026, 10, 2, 1))];
  assert.equal(formatEvents(events, "2026-11-02"), "夜更");
});

test("formatEvents with nothing today shows 無日程", () => {
  assert.equal(formatEvents([], "2026-11-02"), "無日程");
});

test("formatTime12 handles midnight and noon", () => {
  assert.equal(formatTime12(new Date(2026, 0, 1, 0, 5)), "12:05 AM");
  assert.equal(formatTime12(new Date(2026, 0, 1, 12, 5)), "12:05 PM");
  assert.equal(formatTime12(new Date(2026, 0, 1, 16, 48)), "04:48 PM");
});

test("fetchEvents queries each calendar and concatenates results", async () => {
  const calls = [];
  const hass = {
    callApi: async (method, path) => {
      calls.push([method, path]);
      return [allDay(path.startsWith("calendars/calendar.a?") ? "A" : "B", "2026-11-02", "2026-11-03")];
    },
  };
  const start = new Date(2026, 10, 2);
  const events = await fetchEvents(hass, ["calendar.a", "calendar.b"], start, addDays(start, 1));
  assert.deepEqual(events.map((e) => e.summary), ["A", "B"]);
  assert.equal(calls[0][0], "GET");
  assert.ok(calls[0][1].includes(`start=${encodeURIComponent(start.toISOString())}`));
});

test("fetchEvents keeps other calendars when one fails", async () => {
  const error = mock.method(console, "error", () => {});
  const hass = {
    callApi: async (_m, path) => {
      if (path.startsWith("calendars/calendar.bad?")) throw new Error("404");
      return [allDay("A", "2026-11-02", "2026-11-03")];
    },
  };
  const events = await fetchEvents(hass, ["calendar.bad", "calendar.a"], new Date(), new Date());
  assert.deepEqual(events.map((e) => e.summary), ["A"]);
  assert.equal(error.mock.callCount(), 1);
  error.mock.restore();
});

test("fetchEvents with no calendars does not call the API", async () => {
  let called = false;
  const hass = { callApi: async () => { called = true; return []; } };
  assert.deepEqual(await fetchEvents(hass, undefined, new Date(), new Date()), []);
  assert.deepEqual(await fetchEvents(hass, [], new Date(), new Date()), []);
  assert.equal(called, false);
});

test("fetchEvents accepts a single calendar id as a string", async () => {
  const hass = { callApi: async () => [allDay("A", "2026-11-02", "2026-11-03")] };
  const events = await fetchEvents(hass, "calendar.a", new Date(), new Date());
  assert.deepEqual(events.map((e) => e.summary), ["A"]);
});

test("fetchEvents treats a non-array response as no events", async () => {
  const hass = { callApi: async () => ({ message: "odd" }) };
  assert.deepEqual(await fetchEvents(hass, ["calendar.a"], new Date(), new Date()), []);
});
