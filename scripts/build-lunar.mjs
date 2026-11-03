// 把 lunar-javascript 的 UMD 檔包裝成 ES module，放入 dist/。
// Wrap lunar-javascript's UMD build as an ES module in dist/.
// 用法 / usage: npm install && npm run build:lunar
import { copyFile, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const pkgDir = new URL("node_modules/lunar-javascript/", root);
const { version } = JSON.parse(await readFile(new URL("package.json", pkgDir), "utf8"));
const source = await readFile(new URL("lunar.js", pkgDir), "utf8");

// The UMD wrapper assigns its exports to `this` when there is no AMD or
// CommonJS loader, so calling it with a private object keeps globals clean.
// Shadowing `define` and `module` keeps a page-level AMD loader from taking over.
const wrapped = [
  `// Generated from lunar-javascript ${version} (MIT). Do not edit. Run: npm run build:lunar`,
  "const root = {};",
  "(function (define, module) {",
  source,
  "}).call(root);",
  "export const { Solar } = root;",
  "",
].join("\n");

await writeFile(new URL("dist/lunar-lib.js", root), wrapped);
await copyFile(new URL("LICENSE", pkgDir), new URL("dist/lunar-javascript.LICENSE", root));
console.log(`dist/lunar-lib.js built from lunar-javascript ${version}`);
