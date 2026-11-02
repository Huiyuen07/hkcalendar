# hkcalendar

[中文](#中文) | [English](#english)

## 中文

Home Assistant 的中式掛曆卡片，以傳統手撕日曆的樣式顯示公曆、農曆、宜忌、沖煞、節氣、農曆節日、假期和當日日程。假期與星期日會轉為假日顏色。所有日曆文字一律以繁體中文顯示，英文月份和星期作為裝飾保留。

### 不用設定也能用

農曆、宜忌、沖煞、節氣和農曆節日都在卡片內計算，不需要網絡，也沒有年份限制。加入卡片後，不設定任何選項也會顯示完整日曆。

以下兩項是可選的：

| 用途 | 來源 |
|------|------|
| 公眾假期 | HA 內建的 [Holiday 整合](https://www.home-assistant.io/integrations/holiday/)，或任何日曆 |
| 當日日程 | 任何 HA 日曆，例如 Google 日曆或本地日曆 |

**假期設定：** 在「設定 → 裝置與服務」加入 Holiday 整合，揀選地區，語言請選繁體：香港選 `zh_HK`，台灣和中國大陸選 `zh_TW`。之後在卡片編輯器揀選它建立的日曆。

- 當日在所揀日曆中有全日事件，就是假期。
- 大陸的補班日（例如「放假日（2026-02-14 補班）」所指的日子）會使用工作日顏色。
- 其他地區的用戶可以揀選該地區的 Holiday 日曆，或任何自訂日曆。

### 安裝

1. 部署卡片：

   ```bash
   ./deploy.sh <ssh-host>
   ```

   沒有 SSH 的話，把 `www/` 內**所有**檔案複製到 `/config/www/hkcalendar/`。卡片會以 JS 檔的位置為基準載入同目錄的其他檔案，所以它們必須放在一起。

2. 在「設定 → 儀表板 → 資源」加入 `/local/hkcalendar/chinese-calendar-card.js`，類型選 JavaScript 模組。
3. 在 dashboard 加入「中式掛曆」卡片，然後在編輯器揀選日曆。YAML 寫法見 `examples/lovelace-card.yaml`。

### 卡片選項

全部可選。

| 選項 | 說明 | 預設值 |
|------|------|--------|
| `holiday_calendars` | 假期日曆，一個或多個 | 無（只有星期日用假日顏色） |
| `event_calendars` | 日程日曆，一個或多個 | 無（顯示「無日程」） |

假日用紅色（`#CC0000`），工作日用綠色（`#006400`）。這是傳統掛曆的顏色，所以不設選項。宜、忌各顯示頭四項。日曆每 10 分鐘及每日零時重新讀取。

### 第三方授權

農曆和宜忌由 [lunar-javascript](https://github.com/6tail/lunar-javascript) 1.7.7 計算，以 MIT 授權隨卡附上，見 `www/lunar-javascript.LICENSE`。

### 開發

```bash
npm test
```

只需 Node.js 22 或以上。測試會在本機時區和 `America/New_York` 各跑一次。

`www/lunar-lib.js` 是生成檔。要重新生成時執行：

```bash
npm install && npm run build:lunar
```

---

## English

A Chinese wall calendar card for Home Assistant. In the style of a traditional tear-off calendar, it shows the Gregorian and lunar dates, the daily almanac (宜／忌), zodiac clash, solar terms, lunar festivals, holidays and today's events. Holidays and Sundays use the holiday colour. All calendar text is in Traditional Chinese, with the English month and weekday kept as decoration.

### Works with no setup

The lunar date, almanac, zodiac clash, solar terms and lunar festivals are computed inside the card, with no network and no end year. Add the card and it shows a full calendar without any options.

Two things are optional:

| Purpose | Source |
|---------|--------|
| Public holidays | HA's built-in [Holiday integration](https://www.home-assistant.io/integrations/holiday/), or any calendar |
| Today's events | Any HA calendar, such as Google Calendar or a local calendar |

**Holidays:** Under Settings → Devices & services, add the Holiday integration, choose your region and pick a Traditional Chinese language: `zh_HK` for Hong Kong, `zh_TW` for Taiwan and mainland China. Then pick the calendar it creates in the card editor.

- A day with an all-day event in a chosen calendar is a holiday.
- Mainland make-up workdays, such as the day named in 「放假日（2026-02-14 補班）」, use the workday colour.
- Users elsewhere can pick their region's Holiday calendar or any calendar of their own.

### Install

1. Deploy the card:

   ```bash
   ./deploy.sh <ssh-host>
   ```

   Without SSH, copy **every** file in `www/` to `/config/www/hkcalendar/`. The card loads its other files relative to the JS file, so they must stay together.

2. Under Settings → Dashboards → Resources, add `/local/hkcalendar/chinese-calendar-card.js` as a JavaScript module.
3. Add the 「中式掛曆」 card to a dashboard and pick calendars in the editor. For YAML, see `examples/lovelace-card.yaml`.

### Card options

All optional.

| Option | Meaning | Default |
|--------|---------|---------|
| `holiday_calendars` | Holiday calendars, one or more | None (only Sundays use the holiday colour) |
| `event_calendars` | Event calendars, one or more | None (shows 「無日程」) |

Holidays are red (`#CC0000`) and workdays green (`#006400`). These are the traditional calendar colours, so they are not options. The card shows the first four favourable and unfavourable items. Calendars are re-read every 10 minutes and at midnight.

### Third-party notice

The lunar date and almanac are computed by [lunar-javascript](https://github.com/6tail/lunar-javascript) 1.7.7, bundled under the MIT license. See `www/lunar-javascript.LICENSE`.

### Development

```bash
npm test
```

Requires Node.js 22 or later. Tests run once in the local time zone and once in `America/New_York`.

`www/lunar-lib.js` is generated. To rebuild it:

```bash
npm install && npm run build:lunar
```
