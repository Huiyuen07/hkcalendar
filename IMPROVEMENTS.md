# 改善清單 / Improvements

[中文](#中文) | [English](#english)

## 中文

目標：只裝一張卡就能用，不用另裝整合、寫 template 或依賴外部服務。

評估日期：2026-10-31。標明「實測」的項目，都是當日驗證過的。

### 資料來源結論

| 資料 | 最可靠來源 | 限制 |
|------|-----------|------|
| 農曆日期 | [天文台 `lunardate.php`](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation_tc.pdf)：官方、免 key、實測允許跨站讀取 | 只支援 2023-01-01 至本年＋2 年，範圍外回傳純文字 `Not Available` |
| 公眾假期 | [1823 JSON](https://www.1823.gov.hk/common/ical/tc.json)：官方 | 實測沒有 CORS 標頭，瀏覽器卡片不能直接讀；目前涵蓋 2025–2027 |
| 宜忌 | **沒有官方 API**，只能選定一套算法 | 不同來源內容差異很大，見 D1 |

實測農曆日期：在 40 個抽樣日（含月頭月尾）中，`lunar-javascript` 與天文台完全一致；`cnlunar` 與 `lunar-javascript` 在 2026–2027 共 730 日的農曆日和沖煞也完全一致。所以農曆可離線計算，天文台適合作校對。

### 待決定

**D1 宜忌資料來源（影響最大，請先決定）**

實測 `cnlunar` 與 `lunar-javascript`：730 日中，宜完全相同的日數是 0，平均重疊度（Jaccard）宜 0.106、忌 0.047。換來源等於換內容，宜忌沒有客觀對錯，要選的是用哪一派。

| 選項 | 優點 | 代價 |
|------|------|------|
| A. 保留老黃曆整合 | 內容不變 | 依賴不減，違背目標 |
| B. 把 [`lunar-javascript`](https://github.com/6tail/lunar-javascript) 打包入卡 | 免網絡、MIT、約 580 KB | 宜忌內容全換；作者自述規則是從網站數據歸納，僅供參考 |
| **C. 用 [`cnlunar`](https://github.com/OPN48/cnLunar) 預先生成資料隨卡發佈（建議）** | 免網絡；內容與現在同源；出處是《欽定協紀辨方書》；十年資料估計 gzip 後約 75 KB | 需要生成腳本，並定期更新資料 |

付費的第三方黃曆 API 沒有實測：它們需要 key，與減少依賴的目標相反。

### P0：公開發佈前必做

- [ ] **H1 授權和出處：** 選定授權並加入 `LICENSE`。確認卡片是否參考過他人作品，有的話要註明。
- [ ] **H2 移除 OpenCC CDN：** 實測 jsDelivr 被擋時，卡片完全不渲染，也沒有錯誤提示。D1 選 C 後資料本身是繁體，可整個移除。
- [ ] **H3 內建資料：** 實作 D1，同時覆蓋農曆、沖煞、節氣和農曆節日，CI 用天文台 API 校對。
- [ ] **H4 實體全部變可選：** 沒設定任何實體也能運作，日期時間由瀏覽器提供。現在要裝一個自訂整合、三個內建整合、四個 template、一個 script 和一個 automation。
- [ ] **H5 可用的卡片編輯器：** 現有編輯器不發出 `config-changed`，改了也存不到。同時要註冊 `window.customCards`，否則卡片選擇器看不到它。
- [ ] **H6 CI 和 HACS：** 加入 GitHub Actions 測試、HACS 驗證和截圖。

### P1：顯示和體驗

- [ ] **H7 假期判斷：** 直接讀 Holiday 整合的 calendar 實體，沒裝時只把星期日視為假日。1823 沒有 CORS，不能由卡片直接讀取。
- [ ] **H8 日程改為直接讀日曆：** 由卡片呼叫 HA calendar API，取代 `input_text`（上限 255 字）、script 和每 5 分鐘的 automation。
- [ ] **H9 字型：** 優先用系統字型，Google Fonts 改為可選，避免離線環境等待載入。
- [ ] **H10 響應式和深色模式：** 現在固定白底和 180px 日期字，闊度上限 400px。
- [ ] **H11 農曆顯示：** 現在顯示「九月大廿二」，天文台寫法是「九月廿二」，香港用戶較熟悉後者。
- [ ] **H12 宜忌顯示不全：** 老黃曆整合只輸出前 10 項，卡片區塊又固定 80px 高。需要決定顯示規則。

### P2：程式質素

- [ ] **H13 時區問題：** `new Date('YYYY-MM-DD')` 以 UTC 解析。實測在 `America/New_York` 下差一日，香港不受影響。修好後可移除 `npm test` 內固定的 `TZ`。
- [ ] **H14 改用 `textContent`：** 宜忌和農曆文字目前以 `innerHTML` 寫入。
- [ ] **H15 英文介面：** 讓海外用戶也能使用。

### 作者環境遷移

- [ ] **H0 切換到新版：** 把 Lovelace 資源指向 `/local/hkcalendar/chinese-calendar-card.js`。
- [ ] **H00 清理老黃曆整合：** 現時使用的是更名為 `tgtg` 的舊副本（2025.01.17），這個 domain 與 Too Good To Go 整合相撞；HACS 版已安裝但沒有設定。D1 定案後兩者一併處理。
- [ ] **H000 農曆節日：** `calendar.nong_li` 實測回傳 404，所以卡片現在不會顯示農曆節日。H3 完成後會解決。

---

## English

Goal: install one card and it works, with no extra integrations, templates or outside services.

Assessed on 2026-10-31. Items marked "tested" were verified that day.

### Data source findings

| Data | Most reliable source | Limits |
|------|---------------------|--------|
| Lunar date | [HKO `lunardate.php`](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation_tc.pdf): official, no key, cross-origin reads allowed when tested | Only 2023-01-01 to the end of the current year + 2; outside that it returns the plain text `Not Available` |
| Public holidays | [1823 JSON](https://www.1823.gov.hk/common/ical/tc.json): official | No CORS header when tested, so a browser card cannot read it directly; currently covers 2025–2027 |
| Almanac (宜／忌) | **No official API.** You have to choose a method | Sources differ widely. See D1 |

Lunar date testing: across 40 sampled days, including month boundaries, `lunar-javascript` matched HKO exactly. `cnlunar` and `lunar-javascript` also agreed on lunar day and zodiac clash on all 730 days of 2026–2027. Lunar dates can therefore be computed offline, with HKO used as a cross-check.

### Decision needed

**D1 Almanac data source (the biggest decision; settle this first)**

Tested `cnlunar` against `lunar-javascript` over 730 days: the favourable list was identical on 0 days, and mean overlap (Jaccard) was 0.106 for favourable and 0.047 for unfavourable. Changing source means changing the content. The almanac has no objective right answer, so this is a choice of tradition.

| Option | Benefits | Costs |
|--------|----------|-------|
| A. Keep the almanac integration | Content unchanged | Dependencies stay, which defeats the goal |
| B. Bundle [`lunar-javascript`](https://github.com/6tail/lunar-javascript) in the card | No network, MIT, about 580 KB | All almanac content changes; the author says the rules were inferred from website data and are for reference only |
| **C. Pre-generate data with [`cnlunar`](https://github.com/OPN48/cnLunar) and ship it with the card (recommended)** | No network; same origin as today's content; based on the *Qinding Xieji Bianfang Shu*; ten years estimated at about 75 KB gzipped | Needs a generator script and periodic data updates |

Paid third-party almanac APIs were not tested: they need a key, which works against reducing dependencies.

### P0: required before public release

- [ ] **H1 License and attribution:** Choose a license and add `LICENSE`. Check whether the card drew on anyone else's work, and credit it if so.
- [ ] **H2 Remove the OpenCC CDN:** Tested: with jsDelivr blocked, the card renders nothing and shows no error. With D1 option C the data is already Traditional Chinese, so OpenCC can go entirely.
- [ ] **H3 Built-in data:** Implement D1, covering lunar date, zodiac clash, solar terms and lunar festivals, with CI checking against the HKO API.
- [ ] **H4 Make all entities optional:** The card should work with no entities set, taking date and time from the browser. Today it needs one custom integration, three built-in integrations, four templates, a script and an automation.
- [ ] **H5 A working card editor:** The current editor never fires `config-changed`, so edits cannot be saved. The card must also register in `window.customCards` to appear in the card picker.
- [ ] **H6 CI and HACS:** Add GitHub Actions tests, HACS validation and screenshots.

### P1: display and experience

- [ ] **H7 Holiday detection:** Read the Holiday integration's calendar entity directly, and treat only Sundays as holidays when it is absent. 1823 has no CORS, so the card cannot read it directly.
- [ ] **H8 Read calendars directly:** Have the card call the HA calendar API, replacing `input_text` (255 character limit), the script and the five-minute automation.
- [ ] **H9 Fonts:** Prefer system fonts and make Google Fonts optional, so offline setups do not wait on it.
- [ ] **H10 Responsive layout and dark mode:** The card currently has a fixed white background, a 180px date and a 400px maximum width.
- [ ] **H11 Lunar date wording:** The card shows 「九月大廿二」, while HKO writes 「九月廿二」, which is more familiar in Hong Kong.
- [ ] **H12 Truncated almanac:** The integration only outputs the first 10 items, and the card's area is fixed at 80px high. A display rule is needed.

### P2: code quality

- [ ] **H13 Time zone bug:** `new Date('YYYY-MM-DD')` parses as UTC. Tested: under `America/New_York` the date is one day off. Hong Kong is unaffected. Once fixed, remove the pinned `TZ` from `npm test`.
- [ ] **H14 Use `textContent`:** Almanac and lunar text is currently written with `innerHTML`.
- [ ] **H15 English interface:** Make the card usable for non-Chinese readers.

### Author's own migration

- [ ] **H0 Switch to this version:** Point the Lovelace resource at `/local/hkcalendar/chinese-calendar-card.js`.
- [ ] **H00 Clean up the almanac integration:** The active install is an old copy renamed to `tgtg` (2025.01.17), a domain that collides with the Too Good To Go integration. The HACS version is installed but not configured. Deal with both once D1 is settled.
- [ ] **H000 Lunar festivals:** `calendar.nong_li` returned 404 when tested, so the card shows no lunar festivals today. H3 resolves this.
