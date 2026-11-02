# Offline Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The card shows a full Chinese wall calendar with no configuration. Lunar data and the almanac are computed offline, all text is in Traditional Chinese, and holidays and events are read directly from HA calendars.

**Architecture:** lunar-javascript 1.7.7 is vendored as an ES module (`www/lunar-lib.js`). Pure modules handle the almanac (`almanac.js`), Traditional Chinese conversion (`zh-hant.js`) and calendar-event logic (`calendar-data.js`). The card (`chinese-calendar-card.js`) owns timers, HA API calls, rendering and the editor. Every pure module is tested with `node --test` and no dependencies.

**Tech Stack:** Vanilla JS web components (ES modules), Node 22 `node:test`, HA REST calendar API via `hass.callApi`.

**Spec:** `docs/superpowers/specs/2026-11-02-offline-calendar-design.md`

## Global Constraints

- No runtime network dependency besides HA itself. OpenCC and jsDelivr are removed. Google Fonts `@import` stays for now (H9 is out of scope).
- lunar-javascript is pinned to **1.7.7** and vendored in `www/`. Its MIT notice ships beside it.
- All files the card loads live in `www/` and are resolved relative to `import.meta.url`. Never hard-code `/local/`.
- All calendar text is Traditional Chinese. 「沖」 is used, never 「衝」. 「启钻」 becomes 「啟鑽」 (follows OpenCC `cn→tw`). User event titles and Holiday-integration names are shown as received.
- Data-derived text is written with `textContent`, never `innerHTML`.
- Keep the English month and the 「星期一   Monday」 weekday strings exactly as today.
- Show at most the **first four** 宜 and the **first four** 忌, one per line. Show 「無」 when the list is empty.
- Config options: `holiday_calendars` (array), `event_calendars` (array), `holidayColor` (default `#CC0000`), `workdayColor` (default `#006400`). All are optional. Old options and their code are deleted outright, with no compatibility handling.
- The daily text is joined with ` ｜ `. Event lines are joined with `  |  `. No events gives 「無日程」.
- Target HA 2026.10 or later.
- Tests pass with no pinned TZ and under `TZ=America/New_York`.

## Review Focus

1. **The card is left open across midnight.** The date, almanac, holiday colour and events must all roll over without a page reload (Task 5: `tick` test).
2. **A calendar API call fails or an entity is deleted.** The card still renders. That calendar counts as having no events, and the error goes only to the console (Task 4: `fetchEvents` rejection test; Task 5: render test).
3. **Multi-day events.** A three-day all-day holiday event, and a timed event that started yesterday, must both count for today. The timed one shows no time (Task 4).
4. **The browser is outside Hong Kong.** The day key and the lunar date come from local Y/M/D, never UTC (Task 7: TZ run; Task 3: `getAlmanac` takes numbers).
5. **A leap month.** 2025-08-01 is in 閏六月 and must render as 「閏六月初八」 (Task 3 golden).

---

### Task 1: Vendor lunar-javascript as an ES module

**Files:**
- Create: `scripts/build-lunar.mjs`, `www/lunar-lib.js` (generated, committed), `www/lunar-javascript.LICENSE`
- Modify: `package.json` (devDependency `"lunar-javascript": "1.7.7"` exact, and a `"build:lunar"` script)
- Test: `tests/lunar-lib.test.mjs`

**Interfaces:**
- Produces: `www/lunar-lib.js` exporting `{ Solar }`, with no globals leaked.

- [ ] **Step 1: Write the failing test** `tests/lunar-lib.test.mjs`
  - `test("exports Solar without leaking globals")`: `import { Solar } from "../www/lunar-lib.js"`. Assert `Solar.fromYmd(2026, 11, 2).getLunar().getDayYi()` deepEquals `['祭祀','沐浴','解除','破屋','坏垣','馀事勿取']`, and `globalThis.Solar === undefined`.
- [ ] **Step 2: Run** `node --test tests/lunar-lib.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3: Write `scripts/build-lunar.mjs`.** It reads `node_modules/lunar-javascript/lunar.js` and writes `www/lunar-lib.js` as: a header comment (`// Generated from lunar-javascript 1.7.7 (MIT). Do not edit. Run: npm run build:lunar`), then `const root = {};`, then `(function () {`, then the source, then `}).call(root);`, then `export const { Solar } = root;`. It also copies `node_modules/lunar-javascript/LICENSE` to `www/lunar-javascript.LICENSE`. Run `npm install` and `npm run build:lunar`. This wrapper has been verified to work in strict ESM.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** with `package-lock.json` and with `node_modules` gitignored (check `.gitignore`).

### Task 2: Traditional Chinese conversion table

**Files:**
- Create: `www/zh-hant.js`
- Test: `tests/zh-hant.test.mjs`

**Interfaces:**
- Produces: `toTraditional(text: string): string` (character by character; a character not in the table passes through unchanged) and `CHAR_MAP: Readonly<Record<string,string>>`, which holds an entry for **every** character lunar-js can emit, including identity entries.

- [ ] **Step 1: Write the failing tests**
  - `test("converts almanac vocabulary")`: `toTraditional('馀事勿取')==='餘事勿取'`, `toTraditional('启钻')==='啟鑽'`, `toTraditional('龙日冲狗')==='龍日沖狗'`, `toTraditional('腊八节')==='臘八節'`, `toTraditional('闰六')==='閏六'`, `toTraditional('坏垣')==='壞垣'`.
  - `test("every character lunar-js emits is classified")` (scan): for every valid date from 1900-01-01 to 2100-12-31, collect the characters of `getDayYi()`, `getDayJi()`, `getMonthInChinese()`, `getDayInChinese()`, `getYearInGanZhi()`, `getYearShengXiao()`, `getDayShengXiao()`, `getDayChongShengXiao()`, `getJieQi()` and `getFestivals()`. Assert each one is a key of `CHAR_MAP`, and on failure list the missing characters.
  - `test("output contains no 衝")`.
- [ ] **Step 2: Run** `node --test tests/zh-hant.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Build `CHAR_MAP`.** Collect the character set with the scan above. Derive the conversions once with `opencc-js` `cn→tw`, installed only in a scratch directory and never added to the repo. Hand-fix `冲→沖`, then paste the literal map into `www/zh-hant.js`. Identity characters map to themselves.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 3: Almanac module

**Files:**
- Create: `www/almanac.js`
- Test: `tests/almanac.test.mjs`

**Interfaces:**
- Consumes: `Solar` (Task 1) and `toTraditional` (Task 2).
- Produces: `getAlmanac(year: number, month: number, day: number): { lunarYear: string, lunarDate: string, yi: string[], ji: string[], clash: string, festivals: string[] }`. All fields are Traditional. `yi` and `ji` are the full lists, and the card slices them. `festivals` is `getFestivals()` followed by `getJieQi()` when it is not empty. `lunarYear` is `` `${ganzhi}(${shengxiao})年` ``, `lunarDate` is month + 「月」 + day, and `clash` is `` `${dayShengXiao}日沖${chongShengXiao}` ``.

- [ ] **Step 1: Write the golden tests**
  - `2026-11-02` → `{ lunarYear:'丙午(馬)年', lunarDate:'九月廿四', clash:'龍日沖狗', festivals:[] }`, and `yi` deepEquals `['祭祀','沐浴','解除','破屋','壞垣','餘事勿取']`.
  - `2026-10-18` → `festivals` `['重陽節']`, `clash` `'牛日沖羊'`, `lunarDate` `'九月初九'`.
  - `2026-12-22` → `festivals` `['冬至']`, `lunarDate` `'冬月十四'`.
  - `2027-02-06` → `festivals` `['春節']`, `lunarYear` `'丁未(羊)年'`, `lunarDate` `'正月初一'`.
  - `2025-08-01` → `lunarDate` `'閏六月初八'`. Confirm the value against lunar-js before pinning it.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `getAlmanac`** in `www/almanac.js`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Calendar-event logic

**Files:**
- Create: `www/calendar-data.js`
- Test: `tests/calendar-data.test.mjs`

**Interfaces:**
- `CalendarEvent` is the HA REST shape: `{ summary: string, start: { date?: 'YYYY-MM-DD', dateTime?: ISO }, end: { date?, dateTime? } }`. All-day `end.date` is exclusive.
- Produces:
  - `dayKey(d: Date): string`: local `YYYY-MM-DD`.
  - `addDays(d: Date, n: number): Date`: local midnight-safe.
  - `eventOverlapsDay(ev: CalendarEvent, key: string): boolean`.
  - `holidayStatus(events: CalendarEvent[], key: string, isSunday: boolean): { isHoliday: boolean, names: string[], isMakeupWorkday: boolean }`.
    - `names` are the de-duplicated summaries of all-day events that overlap `key`.
    - `isMakeupWorkday` is true when any summary matches `/（(\d{4}-\d{2}-\d{2}) ?[補补]班）/g` with the date equal to `key`.
    - `isHoliday = names.length > 0 || (isSunday && !isMakeupWorkday)`.
  - `formatEvents(events: CalendarEvent[], key: string): string`.
    - Take events that overlap `key` and sort them by start (all-day first).
    - A timed event that starts on `key` shows as `hh:mm AM 標題`. Any other event shows its title only.
    - Join with `'  |  '`. When there are none, return `'無日程'`.
  - `formatTime12(d: Date): string`: `'04:48 PM'`, `'12:05 AM'`.
  - `fetchEvents(hass, entityIds: string[], start: Date, end: Date): Promise<CalendarEvent[]>`.
    - Call `hass.callApi('GET', \`calendars/${id}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}\`)` for each id in parallel and concatenate the results.
    - A failure for one id logs `console.error` and contributes `[]`.
    - Empty or missing `entityIds` resolve to `[]` without calling the API.

- [ ] **Step 1: Write the failing tests**
  - `eventOverlapsDay`: a one-day all-day event (`2026-12-25` to `2026-12-26`) overlaps `2026-12-25` but not `2026-12-26`. A three-day all-day event overlaps its middle day. A timed event from yesterday 23:00 to today 01:00 overlaps today.
  - `holidayStatus`:
    - The `聖誕節` event on `2026-12-25` → `{isHoliday:true, names:['聖誕節'], isMakeupWorkday:false}`.
    - A plain Sunday → holiday.
    - Sunday `2026-02-15` with an event `放假日（2026-02-15 補班）` dated `2026-02-20` → `{isHoliday:false, isMakeupWorkday:true}`.
    - Simplified `补班` also matches.
    - A Sunday that has both a holiday event and a 補班 mention → `isHoliday:true`.
    - Duplicate names from two calendars are de-duplicated.
  - `formatEvents`: mixed all-day and timed events sort correctly and produce `'生日  |  09:30 AM 開會'`. A timed event that started yesterday shows its title only. An empty list gives `'無日程'`.
  - `formatTime12`: midnight and noon.
  - `fetchEvents`:
    - A fake `hass.callApi` returns arrays per id → concatenated.
    - One id rejects → other results kept and `console.error` called. Stub it with `mock.method`.
    - `undefined` ids → `[]`, and `callApi` is not called.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** in `www/calendar-data.js`. Compare all-day dates as strings. For timed events, compare `Date` objects against local midnight of `key` and `addDays(key, 1)`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 5: Rewrite the card

**Files:**
- Modify: `www/chinese-calendar-card.js` (rewrite the card class), `www/chinese-calendar-card.css` (`.yi-ji-container`: add `line-height: 20px;`, keep `height: 80px`)
- Test: `tests/card.test.mjs` (replace the old tests)

**Interfaces:**
- Consumes: `getAlmanac` (Task 3), and `dayKey`, `addDays`, `holidayStatus`, `formatEvents`, `formatTime12`, `fetchEvents` (Task 4).
- Produces: class `ChineseCalendarCard`, registered as `chinese-calendar-card`, with these members:
  - `setConfig(config)`: never throws. It stores `{ holiday_calendars: [], event_calendars: [], holidayColor: '#CC0000', workdayColor: '#006400', ...config }`.
  - `prepareData(now: Date)`: returns `{ englishMonth, year, chineseMonth, day, weekday, formattedTime, lunarYear, lunar, yi, ji, todayText, eventSummary, themeColor }`.
    - `yi` and `ji` are the first four items, or `['無']`.
    - `todayText` is `[...festivals, ...holiday.names, isMakeupWorkday ? '補班' : null, clash]`, filtered for empty values and joined with `' ｜ '`.
  - `refreshCalendars(now: Date): Promise<void>`.
    - Holidays: fetch `holiday_calendars` from `addDays(now, -45)` to `addDays(now, 46)` at local midnight, and store the events.
    - Events: fetch `event_calendars` for today's local midnight to tomorrow's, and store the events.
    - Then call `render()`.
  - `tick(now: Date)`.
    - Re-render when the minute changes.
    - Call `refreshCalendars` when `dayKey` changes, or when 10 minutes have passed since the last refresh.
  - `connectedCallback` starts `setInterval(() => this.tick(new Date()), 1000)`, and `disconnectedCallback` clears it.
  - The first `set hass` triggers `refreshCalendars`.
  - `render()` works without `hass`: the almanac shows and the calendar parts are empty.
  - `getStubConfig()` returns `{}`.

- [ ] **Step 1: Write the failing tests** (reuse the existing `HTMLElement` and `customElements` stubs, and drop the `window.OpenCC` stub):
  - `prepareData(new Date(2026, 10, 2, 16, 48))` with no calendars: `englishMonth 'November'`, `chineseMonth '十一月'`, `day 2`, `weekday '星期一   Monday'`, `formattedTime '04:48 PM'`, `lunar '九月廿四'`, `yi` equal to the first four of the Task 3 golden list, `todayText '龍日沖狗'`, `eventSummary '無日程'`, `themeColor` equal to the workday colour.
  - A Sunday (`2026-11-01`) → holiday colour.
  - With stored holiday events containing `聖誕節` on `2026-12-25`: `todayText` starts with `'聖誕節 ｜ '` and uses the holiday colour.
  - A 補班 Sunday → workday colour, and `todayText` contains `'補班'`.
  - `2026-10-18`: `todayText` is `'重陽節 ｜ 牛日沖羊'` (it is a Sunday as well).
  - A day with an empty 忌 list → `ji` is `['無']`. Stub through a date found by scanning, or skip if lunar-js never returns empty; it returns `['无']`, which becomes `['無']`.
  - `setConfig({})` does not throw and applies the default colours.
  - `tick`: after `tick(new Date(2026,10,2,23,59))` then `tick(new Date(2026,10,3,0,0))`, `refreshCalendars` was called with the new day. Spy by replacing the method on the instance.
  - `refreshCalendars` with a `hass.callApi` that always rejects resolves without throwing, and `prepareData` still returns the almanac.
  - Source checks: no `opencc` and no `cdn.jsdelivr`; the stylesheet still loads by `new URL(... import.meta.url)`; no `/local/`; no `.innerHTML =` assignment except the static template.
- [ ] **Step 2: Run** `node --test tests/card.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Rewrite the card.**
  - Keep the static HTML template and the `updateWithFade` and marquee behaviour.
  - `updateWithFade` drops the `isHTML` path.
  - Build the 宜 and 忌 lists as one `div` per item, using `textContent`.
  - The weekday and lunar cell is built from three child elements: `.highlight-weekday`, `.lunar-year`, and a lunar-date span.
  - Remove `loadOpenCC`, `fixConversion`, `needsRender` and the old editor class. Task 6 replaces the editor.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 6: Card editor and card picker registration

**Files:**
- Modify: `www/chinese-calendar-card.js`
- Test: `tests/card.test.mjs`

**Interfaces:**
- Produces: class `ChineseCalendarCardEditor`, registered as `chinese-calendar-card-editor`, and returned by `ChineseCalendarCard.getConfigElement()`.
  - It has `setConfig(config)` and a `hass` setter. It renders one `ha-form` with `.hass`, `.data` and `.schema` set, and `.computeLabel` mapping names to Chinese labels: 假期日曆, 日程日曆, 假日顏色, 工作日顏色.
  - Schema:
    - `holiday_calendars` and `event_calendars`: `{ entity: { domain: 'calendar', multiple: true } }`.
    - `holidayColor` and `workdayColor`: `{ text: {} }`.
  - On the form's `value-changed` it dispatches `new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true })`.
- Produces: module-level `window.customCards.push({ type: 'chinese-calendar-card', name: '中式掛曆', description: '傳統手撕日曆：農曆、宜忌、假期及日程', preview: true })`, guarded with `window.customCards = window.customCards || []`.

- [ ] **Step 1: Write the failing tests** (the stubs need `document.createElement` to return an object with `addEventListener` and `dispatchEvent` captured, and `window` to be a plain object):
  - The editor dispatches `config-changed` with the new config after a simulated `value-changed` that carries `{ value: { holiday_calendars: ['calendar.hksar'] } }`.
  - `setConfig({})` before `hass` is set does not throw.
  - `window.customCards` contains an entry with `type 'chinese-calendar-card'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the editor. Create `ha-form` once and update its properties on each `setConfig` or `hass` call.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 7: Time-zone-free tests, examples and README

**Files:**
- Modify: `package.json` (`"test": "node --test && TZ=America/New_York node --test"`), `README.md` (both languages), `examples/lovelace-card.yaml`
- Delete: `examples/helpers.yaml`, `examples/today-itinerary.yaml`

- [ ] **Step 1:** Update the `test` script and run `npm test`. Expected: both runs PASS. Any failure in the New York run is a local-date bug to fix in the owning module.
- [ ] **Step 2:** Rewrite `examples/lovelace-card.yaml` to:

  ```yaml
  type: custom:chinese-calendar-card
  holiday_calendars:
    - calendar.hksar
  event_calendars:
    - calendar.family
  ```

  Delete the two other example files.
- [ ] **Step 3:** Update the README in both languages.
  - **Dependencies:** no setup is required; the Holiday integration and any calendars are optional. Advise `zh_HK` for Hong Kong and `zh_TW` for Taiwan and mainland China.
  - **Installation:** copy every file in `www/` (`lunar-lib.js`, `almanac.js`, `zh-hant.js` and `calendar-data.js` must sit beside the card).
  - **Options:** use the new options table.
  - **Third-party notice:** lunar-javascript is MIT; see `www/lunar-javascript.LICENSE`.
  - **Development:** `npm test`, plus `npm install && npm run build:lunar` to regenerate the vendored library.
  - Remove the 老黃曆, OpenCC and `input_text` text.
- [ ] **Step 4:** Tick H2, H3, H4, H5, H7, H8, H11, H12, H13 and H14 in `IMPROVEMENTS.md` (both languages).
- [ ] **Step 5: Commit.**
