# hkcalendar

[中文](#中文) | [English](#english)

## 中文

Home Assistant 的中式掛曆卡片，以傳統月曆頁的樣式顯示公曆、農曆、宜忌、當日資訊和日程。假期與星期日會轉為假日顏色。

目前這張卡片只負責顯示，資料要由其他整合和 template 提供。減少這些依賴是下一階段的重點，見 [IMPROVEMENTS.md](IMPROVEMENTS.md)。

### 依賴

| 用途 | 來源 | 必要 |
|------|------|------|
| 宜忌、農曆、沖煞 | [ha_laohuangli](https://github.com/knoop7/ha_laohuangli)（HACS） | 是 |
| 日期、時間 | Time & Date 整合（`sensor.date`、`sensor.time`） | 是 |
| 公眾假期 | Holiday 整合，地區選香港 | 建議 |
| 工作日判斷 | Workday 整合 | 建議 |
| 農曆年、農曆日期、當日文字 | `examples/helpers.yaml` | 是 |
| 滾動日程 | `input_text.calendar`，加上 `examples/today-itinerary.yaml` | 是 |
| 簡轉繁 | 瀏覽器從 jsDelivr 載入 `opencc-js` | 是 |
| 字型 | Google Fonts 的 Noto Sans TC | 否 |

> `examples/helpers.yaml` 的實體名稱來自作者的環境，該環境用的是老黃曆整合的舊版更名副本。改用目前的 HACS 版本時，實體名稱未經驗證，請按實際名稱調整。

### 安裝

1. 安裝上表的整合，並加入 `examples/` 內的 helper 和 script。
2. 部署卡片：

   ```bash
   ./deploy.sh <ssh-host>
   ```

   沒有 SSH 的話，把 `www/` 內的檔案複製到 `/config/www/hkcalendar/` 即可。

3. 在「設定 → 儀表板 → 資源」加入 `/local/hkcalendar/chinese-calendar-card.js`，類型選 JavaScript 模組。
4. 在 dashboard 加入卡片，內容見 `examples/lovelace-card.yaml`。

CSS 會以 JS 檔的位置為基準載入，所以 `.js` 和 `.css` 必須放在同一目錄。

### 卡片選項

| 選項 | 說明 | 預設值 |
|------|------|--------|
| `date_entity` | 日期實體，格式 `YYYY-MM-DD` | 必填 |
| `time_entity` | 時間實體，格式 `HH:MM` | 必填 |
| `lunar_year_entity` | 農曆年 | 必填 |
| `lunar_entity` | 農曆日期 | 必填 |
| `yi_entity` | 宜，以空格分隔 | 必填 |
| `ji_entity` | 忌，以空格分隔 | 必填 |
| `rolling_text_entity` | 滾動日程文字 | 必填 |
| `today_entity` | 當日文字 | 必填 |
| `workday_entity` | 工作日實體，`off` 時使用假日顏色 | 可選 |
| `holidayColor` | 假日顏色 | `#CC0000` |
| `workdayColor` | 工作日顏色 | `#006400` |

### 開發

```bash
npm test
```

只需 Node.js 22 或以上，沒有其他依賴。測試固定使用香港時區（見 IMPROVEMENTS.md 的 H13）。

---

## English

A Chinese wall calendar card for Home Assistant. It shows the Gregorian and lunar dates, daily almanac (宜／忌), daily notes and today's events in the style of a traditional calendar page. Holidays and Sundays use the holiday colour.

For now the card only displays data, which must come from other integrations and templates. Reducing those dependencies is the next priority. See [IMPROVEMENTS.md](IMPROVEMENTS.md).

### Dependencies

| Purpose | Source | Required |
|---------|--------|----------|
| Almanac, lunar date, zodiac clash | [ha_laohuangli](https://github.com/knoop7/ha_laohuangli) (HACS) | Yes |
| Date and time | Time & Date integration (`sensor.date`, `sensor.time`) | Yes |
| Public holidays | Holiday integration, set to Hong Kong | Recommended |
| Workday detection | Workday integration | Recommended |
| Lunar year, lunar date, daily text | `examples/helpers.yaml` | Yes |
| Scrolling events | `input_text.calendar` plus `examples/today-itinerary.yaml` | Yes |
| Simplified to Traditional Chinese | `opencc-js`, loaded by the browser from jsDelivr | Yes |
| Font | Noto Sans TC from Google Fonts | No |

> The entity names in `examples/helpers.yaml` come from the author's setup, which uses an older, renamed copy of the almanac integration. They have not been verified against the current HACS release, so adjust them to match your entities.

### Install

1. Install the integrations above and add the helpers and script from `examples/`.
2. Deploy the card:

   ```bash
   ./deploy.sh <ssh-host>
   ```

   Without SSH, copy the files in `www/` to `/config/www/hkcalendar/`.

3. Under Settings → Dashboards → Resources, add `/local/hkcalendar/chinese-calendar-card.js` as a JavaScript module.
4. Add the card to a dashboard, as shown in `examples/lovelace-card.yaml`.

The CSS is loaded relative to the JS file, so keep `.js` and `.css` in the same directory.

### Card options

| Option | Meaning | Default |
|--------|---------|---------|
| `date_entity` | Date entity, as `YYYY-MM-DD` | Required |
| `time_entity` | Time entity, as `HH:MM` | Required |
| `lunar_year_entity` | Lunar year | Required |
| `lunar_entity` | Lunar date | Required |
| `yi_entity` | Favourable activities, space separated | Required |
| `ji_entity` | Unfavourable activities, space separated | Required |
| `rolling_text_entity` | Scrolling events text | Required |
| `today_entity` | Daily text | Required |
| `workday_entity` | Workday entity; `off` uses the holiday colour | Optional |
| `holidayColor` | Holiday colour | `#CC0000` |
| `workdayColor` | Workday colour | `#006400` |

### Development

```bash
npm test
```

Requires Node.js 22 or later, with no other dependencies. Tests are pinned to the Hong Kong time zone (see H13 in IMPROVEMENTS.md).
