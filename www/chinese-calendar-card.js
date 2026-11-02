import { getAlmanac } from "./almanac.js";
import {
  addDays, dayKey, fetchEvents, formatEvents, formatTime12, holidayStatus,
} from "./calendar-data.js";

const CARD_VERSION = "0.2.0";
const ENGLISH_MONTHS = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
const CHINESE_MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月",
                        "七月", "八月", "九月", "十月", "十一月", "十二月"];
const WEEKDAYS = ["星期日   Sunday", "星期一   Monday", "星期二   Tuesday", "星期三   Wednesday",
                  "星期四   Thursday", "星期五   Friday", "星期六   Saturday"];

const DEFAULTS = {
  holiday_calendars: [],
  event_calendars: [],
  holidayColor: "#CC0000",
  workdayColor: "#006400",
};
const REFRESH_MS = 10 * 60 * 1000;
// Make-up workdays can be named weeks before or after the holiday that mentions them.
const HOLIDAY_WINDOW_DAYS = 45;
const MAX_ALMANAC_ITEMS = 4;

const TEMPLATE = `
  <div class="calendar">
    <div class="header">
      <div class="english-month"></div>
      <div class="year"></div>
      <div class="chinese-month"></div>
    </div>
    <div class="current-time"></div>
    <div class="date"></div>
    <div class="content-wrapper">
      <div class="today-text"></div>
      <table class="table-container">
        <tr>
          <td class="suitable">宜<br><div class="yi-ji-container"></div></td>
          <td class="weekday-lunar">
            <span class="highlight-weekday"></span>
            <div class="lunar-year"></div>
            <span class="lunar-date"></span>
          </td>
          <td class="forbidden">忌<br><div class="yi-ji-container"></div></td>
        </tr>
      </table>
      <div class="schedule-container">
        <div class="schedule-text"></div>
      </div>
    </div>
  </div>
`;

const firstItems = (list) => (list.length ? list.slice(0, MAX_ALMANAC_ITEMS) : ["無"]);

class ChineseCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._elements = null;
    this._holidayEvents = [];
    this._events = [];
    this._lastDay = null;
    this._lastMinute = null;
    this._lastRefresh = 0;
  }

  setConfig(config) {
    // A field cleared in the editor arrives as undefined or "", which must not hide the default.
    const given = Object.fromEntries(
      Object.entries(config ?? {}).filter(([, value]) => value !== undefined && value !== ""));
    this.config = { ...DEFAULTS, ...given };
    this._lastRefresh = 0;
    this.render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this.refreshCalendars(new Date());
  }

  connectedCallback() {
    this.render();
    this._timer = setInterval(() => this.tick(new Date()), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  tick(now) {
    const key = dayKey(now);
    if (key !== this._lastDay || now.getTime() - this._lastRefresh >= REFRESH_MS) {
      this._lastDay = key;
      this.refreshCalendars(now);
    }
    const minute = `${key} ${now.getHours()}:${now.getMinutes()}`;
    if (minute !== this._lastMinute) {
      this._lastMinute = minute;
      this.render(now);
    }
  }

  async refreshCalendars(now) {
    if (!this._hass || !this.config) return;
    this._lastRefresh = now.getTime();
    const today = addDays(now, 0);
    const [holidayEvents, events] = await Promise.all([
      fetchEvents(this._hass, this.config.holiday_calendars,
        addDays(today, -HOLIDAY_WINDOW_DAYS), addDays(today, HOLIDAY_WINDOW_DAYS + 1)),
      fetchEvents(this._hass, this.config.event_calendars, today, addDays(today, 1)),
    ]);
    this._holidayEvents = holidayEvents;
    this._events = events;
    this.render();
  }

  prepareData(now) {
    const almanac = getAlmanac(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const key = dayKey(now);
    const holiday = holidayStatus(this._holidayEvents, key, now.getDay() === 0);
    return {
      englishMonth: ENGLISH_MONTHS[now.getMonth()],
      year: now.getFullYear(),
      chineseMonth: CHINESE_MONTHS[now.getMonth()],
      day: now.getDate(),
      weekday: WEEKDAYS[now.getDay()],
      formattedTime: formatTime12(now),
      lunarYear: almanac.lunarYear,
      lunar: almanac.lunarDate,
      yi: firstItems(almanac.yi),
      ji: firstItems(almanac.ji),
      todayText: [
        ...almanac.festivals,
        ...holiday.names,
        holiday.isMakeupWorkday ? "補班" : null,
        almanac.clash,
      ].filter(Boolean).join(" ｜ "),
      eventSummary: formatEvents(this._events, key),
      themeColor: holiday.isHoliday ? this.config.holidayColor : this.config.workdayColor,
    };
  }

  // Only renders once the card is in the page; connectedCallback renders it then.
  render(now = new Date()) {
    if (!this.config || !this.isConnected) return;
    if (!this._elements) this.buildDom();
    this.updateElements(this.prepareData(now));
  }

  buildDom() {
    const shadow = this.shadowRoot;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(`chinese-calendar-card.css?v=${CARD_VERSION}`, import.meta.url).href;
    const container = document.createElement("div");
    container.innerHTML = TEMPLATE;
    shadow.append(link, ...container.children);
    const $ = (selector) => shadow.querySelector(selector);
    this._elements = {
      calendar: $(".calendar"),
      englishMonth: $(".english-month"),
      year: $(".year"),
      chineseMonth: $(".chinese-month"),
      currentTime: $(".current-time"),
      date: $(".date"),
      todayText: $(".today-text"),
      suitable: $(".suitable .yi-ji-container"),
      forbidden: $(".forbidden .yi-ji-container"),
      weekday: $(".highlight-weekday"),
      lunarYear: $(".lunar-year"),
      lunarDate: $(".lunar-date"),
      scheduleText: $(".schedule-text"),
    };
  }

  updateElements(data) {
    const el = this._elements;
    el.calendar.style.setProperty("--theme-color", data.themeColor);
    this.updateWithFade(el.englishMonth, data.englishMonth);
    this.updateWithFade(el.year, data.year);
    this.updateWithFade(el.chineseMonth, data.chineseMonth);
    this.updateWithFade(el.currentTime, data.formattedTime);
    this.updateWithFade(el.date, data.day);
    this.updateWithFade(el.todayText, data.todayText);
    this.updateList(el.suitable, data.yi);
    this.updateList(el.forbidden, data.ji);
    this.updateWithFade(el.weekday, data.weekday);
    this.updateWithFade(el.lunarYear, data.lunarYear);
    this.updateWithFade(el.lunarDate, data.lunar);
    if (this.updateWithFade(el.scheduleText, data.eventSummary)) this.updateMarquee();
  }

  updateWithFade(element, value) {
    const text = String(value);
    if (element.textContent === text) return false;
    element.classList.remove("fade-in");
    void element.offsetWidth; // restart the animation
    element.textContent = text;
    element.classList.add("fade-in");
    return true;
  }

  updateList(element, items) {
    const joined = items.join("\n");
    if (element.dataset.items === joined) return;
    element.dataset.items = joined;
    element.classList.remove("fade-in");
    void element.offsetWidth;
    element.replaceChildren(...items.map((item) => {
      const line = document.createElement("div");
      line.textContent = item;
      return line;
    }));
    element.classList.add("fade-in");
  }

  updateMarquee() {
    requestAnimationFrame(() => {
      const text = this._elements.scheduleText;
      if (text.scrollWidth > text.clientWidth) {
        const speed = 50;
        const duration = (text.scrollWidth + text.clientWidth) / speed;
        text.style.setProperty("--marquee-duration", `${duration}s`);
        text.classList.add("overflow");
      } else {
        text.classList.remove("overflow");
      }
    });
  }

  static getConfigElement() {
    return document.createElement("chinese-calendar-card-editor");
  }

  static getStubConfig() {
    return {};
  }
}

const EDITOR_SCHEMA = [
  { name: "holiday_calendars", selector: { entity: { domain: "calendar", multiple: true } } },
  { name: "event_calendars", selector: { entity: { domain: "calendar", multiple: true } } },
  { name: "holidayColor", selector: { text: {} } },
  { name: "workdayColor", selector: { text: {} } },
];
const EDITOR_LABELS = {
  holiday_calendars: "假期日曆",
  event_calendars: "日程日曆",
  holidayColor: "假日顏色",
  workdayColor: "工作日顏色",
};

class ChineseCalendarCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this.ensureForm().data = this._config;
  }

  set hass(hass) {
    this.ensureForm().hass = hass;
  }

  ensureForm() {
    if (this._form) return this._form;
    const form = document.createElement("ha-form");
    form.schema = EDITOR_SCHEMA;
    form.computeLabel = (field) => EDITOR_LABELS[field.name] ?? field.name;
    form.addEventListener("value-changed", (event) => {
      this._config = { ...this._config, ...event.detail.value };
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: this._config }, bubbles: true, composed: true,
      }));
    });
    this.appendChild(form);
    this._form = form;
    return form;
  }
}

customElements.define("chinese-calendar-card", ChineseCalendarCard);
customElements.define("chinese-calendar-card-editor", ChineseCalendarCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chinese-calendar-card",
  name: "中式掛曆",
  description: "傳統手撕日曆：農曆、宜忌、假期及日程",
  preview: true,
});
