// lunar-javascript 輸出簡體字；這裡把它會用到的每一個字對應到繁體。
// lunar-javascript emits Simplified Chinese. This table maps every character it
// can produce to Traditional Chinese, so the card never needs OpenCC.
//
// 由 opencc-js cn→tw 逐字推導，再按詞修正：丑（地支）、采（納采）、梁（上梁）
// 不變；发→髮（理髮）、谷→穀（穀雨）；冲→沖（不用「衝」）。
// Derived per character from opencc-js cn→tw, then fixed per word as noted above.
// tests/zh-hant.test.mjs fails if lunar-js ever emits a character missing here.

const CONVERTED = "丧喪 习習 产產 亲親 仓倉 会會 佣傭 养養 冲沖 动動 医醫 厕廁 发髮 启啟 坏壞 坟墳 墙牆 处處 头頭 学學 宁寧 寿壽 帐帳 庙廟 开開 归歸 惊驚 扫掃 挂掛 斋齋 断斷 无無 机機 桥橋 殓殮 涂塗 渔漁 满滿 猎獵 猪豬 盖蓋 种種 竖豎 筑築 纳納 经經 结結 绘繪 络絡 网網 腊臘 艺藝 节節 蚁蟻 蛰蟄 补補 订訂 讼訟 词詞 诸諸 谢謝 谷穀 财財 货貨 车車 进進 针針 钻鑽 门門 问問 闰閏 阳陽 雇僱 饰飾 馀餘 马馬 鸡雞 龙龍";
const UNCHANGED = "一丁七三上不丑丙中乘乙九事二五井交亥人任伐作修元光兔入八六冠冬出分初券刻割勿匾十午卯卸友取口合名嗣器四土垣基堤塑塞壬夏夕大娶婿嫁子宅安定宜宵寅寒小居屋岫己巳市平床庚廿徙戊戌成手拆捉捕掘探放教整明易春普暑服木未架柩柱栽梁械正水求池沐治浴清渠渡火灶灸牛牧狗猴理生甲申畋畜病癸白盟眼破碑碓磉磑祀祈神祭福秋移稠穴立端笄置羊脊至舍船芒葬虎蛇蜜行衣裁解赴起足辛辰造道酉酬醮采重降除雕雨雪霜露香鼠";

export const CHAR_MAP = Object.freeze(Object.fromEntries([
  ...CONVERTED.split(" ").map((pair) => [...pair]),
  ...[...UNCHANGED].map((ch) => [ch, ch]),
]));

export function toTraditional(text) {
  return Array.from(text, (ch) => CHAR_MAP[ch] ?? ch).join("");
}
