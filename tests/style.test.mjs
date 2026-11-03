import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

test("the stylesheet loads no web fonts", async () => {
  const css = await read("www/chinese-calendar-card.css");
  assert.doesNotMatch(css, /@import|googleapis|url\(/i);
});

test("the stylesheet falls back through system Traditional Chinese fonts", async () => {
  const css = await read("www/chinese-calendar-card.css");
  const family = css.match(/font-family:\s*([^;]+);/)[1];
  for (const font of ["Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "sans-serif"]) {
    assert.ok(family.includes(font), `${font} missing from ${family}`);
  }
  assert.ok(family.trim().endsWith("sans-serif"), family);
});

test("the layout scales with the card instead of fixed pixel sizes", async () => {
  const css = stripComments(await read("www/chinese-calendar-card.css"));
  assert.match(css, /container-type:\s*inline-size/);
  assert.doesNotMatch(css, /max-width:\s*400px/);
  // Every size is written in the scale unit; only 0 and hairline widths stay in px.
  const fixed = [...css.matchAll(/(?<![\w.-])(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1])).filter((n) => n > 1);
  assert.deepEqual(fixed, [600], "only the scale cap may be in px");
});

test("dark mode has its own paper colour", async () => {
  const css = await read("www/chinese-calendar-card.css");
  assert.match(css, /\.calendar\.dark\s*\{[^}]*--paper-color/);
});

test("the project is MIT licensed", async () => {
  const license = await read("LICENSE");
  assert.match(license, /^MIT License/);
  assert.match(license, /Copyright \(c\) 2026/);
  assert.equal(JSON.parse(await read("package.json")).license, "MIT");
});
