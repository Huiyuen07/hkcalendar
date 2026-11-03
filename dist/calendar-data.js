// 讀取 HA 日曆，判斷假期、補班和當日日程。
// Read HA calendars and work out holidays, make-up workdays and today's events.
//
// Events use the HA REST shape: { summary, start: { date | dateTime }, end: { date | dateTime } }.
// All-day end dates are exclusive.

const pad = (n) => String(n).padStart(2, "0");

export function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const isAllDay = (ev) => Boolean(ev.start?.date);

export function eventOverlapsDay(ev, key) {
  if (isAllDay(ev)) return ev.start.date <= key && key < (ev.end?.date ?? ev.start.date);
  const dayStart = keyToDate(key);
  const dayEnd = addDays(dayStart, 1);
  const start = new Date(ev.start.dateTime);
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : start;
  return start < dayEnd && (end > dayStart || +start === +dayStart);
}

// Mainland China holiday titles name the make-up workday, e.g. 放假日（2026-02-14 補班）.
const MAKEUP_PATTERN = /（(\d{4}-\d{2}-\d{2}) ?[補补]班）/g;

export function holidayStatus(events, key, isSunday) {
  const names = [...new Set(
    events.filter((ev) => isAllDay(ev) && eventOverlapsDay(ev, key)).map((ev) => ev.summary),
  )];
  const isMakeupWorkday = events.some((ev) =>
    [...(ev.summary ?? "").matchAll(MAKEUP_PATTERN)].some((m) => m[1] === key));
  return { isHoliday: names.length > 0 || (isSunday && !isMakeupWorkday), names, isMakeupWorkday };
}

export function formatTime12(d) {
  const hour = d.getHours() % 12 || 12;
  return `${pad(hour)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

const startTime = (ev) => (isAllDay(ev) ? keyToDate(ev.start.date) : new Date(ev.start.dateTime));

export function formatEvents(events, key) {
  const today = events
    .filter((ev) => eventOverlapsDay(ev, key))
    .sort((a, b) => (isAllDay(b) - isAllDay(a)) || (startTime(a) - startTime(b)));
  if (today.length === 0) return "無日程";
  return today.map((ev) => {
    if (isAllDay(ev)) return ev.summary;
    const start = startTime(ev);
    return dayKey(start) === key ? `${formatTime12(start)} ${ev.summary}` : ev.summary;
  }).join("  |  ");
}

export async function fetchEvents(hass, entityIds, start, end) {
  // YAML may give a single id as a plain string.
  const ids = [].concat(entityIds ?? []).filter(Boolean);
  if (ids.length === 0) return [];
  const range = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
  const results = await Promise.all(ids.map(async (id) => {
    try {
      const events = await hass.callApi("GET", `calendars/${id}?${range}`);
      return Array.isArray(events) ? events : [];
    } catch (err) {
      console.error(`chinese-calendar-card: 無法讀取日曆 ${id}`, err);
      return [];
    }
  }));
  return results.flat();
}
