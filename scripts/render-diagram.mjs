/** Render the editable SVG source to a 2x PNG for the submission. */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const svg = readFileSync("docs/architecture.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1020 },
  deviceScaleFactor: 2,
});
await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: "docs/architecture.png", fullPage: true });
await browser.close();
console.log("Wrote docs/architecture.png (3200x2040)");
