// Renders scripts/icon.svg to the PNG icons in public/. Run with:
// node scripts/render-icons.cjs   (needs Playwright's Chromium)
const { chromium } = require("playwright");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const svg = readFileSync(join(__dirname, "icon.svg"), "utf8");
const out = join(__dirname, "..", "public");
const BG = "#f6f1e7";

const icons = [
  // name, size, scale of the bird, rounded corners
  ["icon-192.png", 192, 1, true],
  ["icon-512.png", 512, 1, true],
  ["icon-maskable-512.png", 512, 0.82, false],
  ["apple-touch-icon.png", 180, 0.9, false],
];

(async () => {
  const browser = await chromium.launch();
  for (const [name, size, scale, rounded] of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`
      <style>html,body{margin:0;background:transparent}
      div{width:${size}px;height:${size}px;background:${BG};border-radius:${rounded ? size * 0.22 : 0}px;
          display:flex;align-items:center;justify-content:center}
      svg{width:${size * scale}px;height:${size * scale}px}</style>
      <div>${svg}</div>`);
    await page.screenshot({ path: join(out, name), omitBackground: true });
    await page.close();
  }
  await browser.close();
})();
