# 改善清單 / Improvements

[中文](#中文) | [English](#english)

## 中文

目標：加入卡片就能用，資料不會因為某個網站或整合停止服務而消失，用戶不需要自己建立 helper、template、script 或 automation。所有地區一律顯示繁體中文。

最後更新：2026-11-02。本輪的完整設計見 [`docs/superpowers/specs/2026-11-02-offline-calendar-design.md`](docs/superpowers/specs/2026-11-02-offline-calendar-design.md)。

### 已作的決定

| 編號 | 決定 | 原因 |
|------|------|------|
| D1 | **宜忌和農曆改用打包入卡的 [`lunar-javascript`](https://github.com/6tail/lunar-javascript) 1.7.7（MIT）** | 在本機計算，沒有期限（實測 1901 至 3000 年都能算），不需要網絡或定期更新。gzip 後約 112 KB。作者不在意宜忌派別，穩定比內容一致更重要 |
| D2 | **假期全部交給 HA 內建的 Holiday 整合，或用戶自選的 HA 日曆；卡片不內建假期規則** | 港、台、陸及上百個國家都有人維護，大陸調休已包括在內，資料隨 HA 更新。兩套規則並存會令用戶無所適從 |
| D3 | **所有日曆文字一律繁體**，以內建對照表轉換，不用 OpenCC | 傳統感覺；lunar-js 輸出的詞彙是有限集合，用小表就能涵蓋 |
| D4 | **保留英文月份和英文星期作裝飾** | 傳統手撕日曆的特色 |
| D5 | **假日紅 `#CC0000`、工作日綠 `#006400` 寫死，不設選項** | 傳統掛曆顏色，讓用戶修改反而尷尬 |

### 資料來源結論

| 資料 | 來源 | 備註 |
|------|------|------|
| 農曆、宜忌、沖煞、節氣、農曆節日 | lunar-javascript，打包入卡 | 抽樣 40 日的農曆與天文台完全一致。天文台 [`lunardate.php`](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation_tc.pdf) 只適合用來校對，不在卡片運作時使用 |
| 公眾假期 | HA Holiday 整合（底層是 `holidays` 函式庫） | 香港選 `zh_HK`、台灣和大陸選 `zh_TW` 可取得繁體名稱。大陸假期的名稱註明補班日期，例如「放假日（2026-02-14 補班）」 |
| 日程 | 用戶揀選的 HA 日曆 | 卡片直接讀取 |

宜忌內容的比較（2026–2027 年共 730 日）：
- 舊的老黃曆整合內部用的是 `cnlunar`，再刪走 44 個古代官府用語，最多留 10 項。
- 它的過濾規則有一個 bug：`开市`、`开仓`、`开渠`、`开张` 幾乎永遠不會出現。
- 它與 lunar-js 的重疊度（Jaccard）只有：宜 0.10、忌 0.07。
- 所以改用 lunar-js 之後，宜忌內容會全部改變，這是預期之內的。

### 本輪：免設定、離線（見設計文件）

建議次序：H3 → H2 → H4 → H7 → H8 → H5，完成後做作者環境遷移。

- [x] **H3 內建資料：** 打包 lunar-js，提供農曆、宜忌、沖煞、節氣和農曆節日，並附上它的 MIT 授權聲明。黃金測試鎖定固定日期的輸出。
- [x] **H2 移除 OpenCC CDN：** 實測 jsDelivr 被擋時，卡片完全不顯示，也沒有錯誤提示。改用內建繁體對照表，並以測試掃描 1900 至 2100 年，確保沒有遺漏的簡體字。
- [x] **H4 實體全部變可選：** 沒有任何設定也能顯示完整日曆，日期時間取自瀏覽器。不保留舊版相容，舊的實體選項和相關程式碼一併刪除。
- [x] **H7 假期：** 新選項 `holiday_calendars`。當日有全日事件就是假期，星期日一律是假日；補班日按大陸假期名稱中的日期，改用工作日顏色。不再使用 `workday_entity`。
- [x] **H8 日程：** 新選項 `event_calendars`，卡片直接讀取當日事件，取代 `input_text`（上限 255 字）、script 和每 5 分鐘一次的 automation。
- [x] **H5 卡片編輯器：** 用 HA 內建的表單元件揀日曆，並發出 `config-changed`。註冊 `window.customCards`，令卡片出現在卡片選擇器。

以下各項會在上面的工作中一併解決：
- [x] **H11 農曆寫法：** lunar-js 本身就寫「九月廿四」，不再出現「九月大」。
- [x] **H12 宜忌顯示：** 美感優先，宜、忌各顯示頭四項，每項一行，維持現在的字體大小和區塊高度。
- [x] **H13 時區問題：** 不再用 `new Date('YYYY-MM-DD')`。`npm test` 移除固定的 `TZ`，並在非香港時區下通過。
- [x] **H14 改用 `textContent`：** 所有由資料產生的文字都不再經 `innerHTML` 寫入。

### 下一輪

- [ ] **H1 本專案授權：** 選定授權並加入 `LICENSE`。
- [ ] **H6 CI 和 HACS：** 加入 GitHub Actions 測試、HACS 驗證和截圖。
- [ ] **H9 字型：** 優先用系統字型，Google Fonts 改為可選，避免離線環境等待載入。
- [ ] **H10 響應式和深色模式：** 現在固定白底和 180px 日期字，闊度上限 400px。

### 作者環境遷移（本輪完成後；每一步動手前先確認）

- [x] **H0 切換到新版：** 部署後，把 Lovelace 資源指向 `/local/hkcalendar/chinese-calendar-card.js`，卡片設定改為 `holiday_calendars: [calendar.hksar]` 和日程日曆。
- [x] **H00 清理舊依賴：** 新卡運作正常後才移除以下項目，移除前先確認沒有其他地方用到：
  - `tgtg` 整合：這是老黃曆的舊副本，domain 與 Too Good To Go 整合相撞
  - 已安裝但沒有設定的 HACS 版老黃曆
  - 四個 template 實體
  - `input_text.calendar`、`today_s_itinerary` script 和相關 automation
- [x] ~~**H000 農曆節日：**~~ `calendar.nong_li` 回傳 404 的問題不用處理，因為農曆節日已改由 lunar-js 提供（H3）。

### 已取消

- ~~**H15 英文介面**~~：與「一律繁體」（D3）矛盾。
- ~~**卡片內建港台陸假期規則、讀取 1823 JSON**~~：由 D2 取代。

---

## English

Goal: add the card and it works. No data should disappear because a website or integration stops working, and users should never have to build helpers, templates, scripts or automations. Every region sees Traditional Chinese.

Last updated: 2026-11-02. The full design for this round is in [`docs/superpowers/specs/2026-11-02-offline-calendar-design.md`](docs/superpowers/specs/2026-11-02-offline-calendar-design.md) (Chinese).

### Decisions

| ID | Decision | Reason |
|----|----------|--------|
| D1 | **Almanac and lunar data from [`lunar-javascript`](https://github.com/6tail/lunar-javascript) 1.7.7 (MIT), bundled in the card** | Computed locally with no end date (tested from 1901 to 3000), no network and no data updates. About 112 KB gzipped. The author has no preference between almanac traditions; stability matters more than keeping today's content |
| D2 | **Holidays come only from HA's built-in Holiday integration or any calendar the user picks. The card has no holiday rules of its own** | Hong Kong, Taiwan, mainland China and over a hundred other countries are maintained there, mainland make-up workdays included, and the data updates with HA. Two rule sets side by side would leave users unsure which to trust |
| D3 | **All calendar text in Traditional Chinese**, converted with a built-in table instead of OpenCC | Traditional feel. lunar-js uses a small, fixed vocabulary that a short table covers |
| D4 | **Keep the English month and weekday as decoration** | A feature of traditional tear-off calendars |
| D5 | **Holiday red `#CC0000` and workday green `#006400` are fixed, not options** | They are the traditional calendar colours; letting users change them would look out of place |

### Data sources

| Data | Source | Notes |
|------|--------|-------|
| Lunar date, almanac, zodiac clash, solar terms, lunar festivals | lunar-javascript, bundled | Matched HKO exactly on 40 sampled days. HKO [`lunardate.php`](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation_tc.pdf) is for cross-checking only, never used at runtime |
| Public holidays | HA Holiday integration (built on the `holidays` library) | Choose `zh_HK` for Hong Kong and `zh_TW` for Taiwan and mainland China to get Traditional names. Mainland holiday names state the make-up workday, e.g. 「放假日（2026-02-14 補班）」 |
| Events | HA calendars chosen by the user | Read directly by the card |

Almanac comparison over 730 days (2026–2027):
- The old almanac integration uses `cnlunar` internally, then drops 44 imperial-court terms and keeps at most 10 items.
- Its filter has a bug that almost always removes `开市`, `开仓`, `开渠` and `开张`.
- Its overlap (Jaccard) with lunar-js is only 0.10 for favourable and 0.07 for unfavourable.
- Moving to lunar-js therefore changes the almanac content entirely, as expected.

### This round: no setup, offline (see the design document)

Suggested order: H3 → H2 → H4 → H7 → H8 → H5, then the author's migration.

- [x] **H3 Built-in data:** Bundle lunar-js for lunar date, almanac, zodiac clash, solar terms and lunar festivals, with its MIT notice. Golden tests pin the output for fixed dates.
- [x] **H2 Remove the OpenCC CDN:** Tested: with jsDelivr blocked, the card renders nothing and shows no error. Replace it with a built-in Traditional Chinese table, and add a test that scans 1900–2100 for any missed Simplified characters.
- [x] **H4 Make all entities optional:** The card shows a full calendar with no configuration, taking date and time from the browser. No backward compatibility: the old entity options and their code are removed.
- [x] **H7 Holidays:** New `holiday_calendars` option. An all-day event marks the day as a holiday, and Sundays always use the holiday colour. Make-up workdays named in mainland holiday titles use the workday colour. `workday_entity` is no longer used.
- [x] **H8 Events:** New `event_calendars` option. The card reads today's events directly, replacing `input_text` (255-character limit), the script and the five-minute automation.
- [x] **H5 Card editor:** Pick calendars with HA's built-in form components, and fire `config-changed`. Register in `window.customCards` so the card appears in the card picker.

Also resolved by the work above:
- [x] **H11 Lunar wording:** lunar-js writes 「九月廿四」 itself, so 「九月大」 no longer appears.
- [x] **H12 Almanac display:** Looks come first. Show the first four favourable and the first four unfavourable items, one per line, keeping today's font size and area height.
- [x] **H13 Time zone bug:** Stop using `new Date('YYYY-MM-DD')`. Remove the pinned `TZ` from `npm test` and pass in a non-Hong Kong time zone.
- [x] **H14 Use `textContent`:** No data-derived text goes through `innerHTML`.

### Next round

- [ ] **H1 Project license:** Choose a license and add `LICENSE`.
- [ ] **H6 CI and HACS:** Add GitHub Actions tests, HACS validation and screenshots.
- [ ] **H9 Fonts:** Prefer system fonts and make Google Fonts optional, so offline setups do not wait on it.
- [ ] **H10 Responsive layout and dark mode:** The card currently has a fixed white background, a 180px date and a 400px maximum width.

### Author's own migration (after this round; confirm before each step)

- [x] **H0 Switch to this version:** After deploying, point the Lovelace resource at `/local/hkcalendar/chinese-calendar-card.js` and set `holiday_calendars: [calendar.hksar]` plus the events calendar.
- [x] **H00 Remove old dependencies:** Only once the new card works, and only after checking nothing else uses them, remove:
  - the `tgtg` integration, an old copy of the almanac whose domain collides with the Too Good To Go integration
  - the HACS almanac, which is installed but not configured
  - the four template entities
  - `input_text.calendar`, the `today_s_itinerary` script and its automation
- [x] ~~**H000 Lunar festivals:**~~ The 404 from `calendar.nong_li` needs no fix, because lunar festivals now come from lunar-js (H3).

### Dropped

- ~~**H15 English interface**~~: conflicts with all-Traditional-Chinese text (D3).
- ~~**Built-in Hong Kong, Taiwan and mainland holiday rules, and reading the 1823 JSON**~~: replaced by D2.
