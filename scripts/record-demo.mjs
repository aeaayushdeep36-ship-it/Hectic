/**
 * Records a real ~3-minute browser walkthrough with Playwright's video recorder,
 * then converts it to MP4. No synthetic footage, no fabricated numbers: the
 * captions describe what the app actually renders on screen.
 *
 * Usage: npm run demo:video   (starts the dev server if needed)
 */
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const BASE = "http://localhost:3000";
// A unique OS temp dir avoids collisions with a previous recording process.
const TMP = mkdtempSync(path.join(tmpdir(), "hectic-demo-"));

async function reachable() {
  try {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await reachable()) return null;
  const child = spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: true,
    detached: false,
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await reachable()) return child;
  }
  child.kill();
  throw new Error("Dev server did not start on localhost:3000");
}

async function caption(page, kicker, body, ms) {
  await page.evaluate(
    ({ kicker, body }) => {
      document.getElementById("demo-caption")?.remove();
      const el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#14171a;color:#fbfaf7;padding:16px 28px;font:14px Arial;border-top:3px solid #9a3412;box-shadow:0 -8px 24px rgba(0,0,0,.25)";
      el.innerHTML =
        `<div style="font-weight:700;letter-spacing:.12em;color:#f0c9b4;text-transform:uppercase">Hectic · ${kicker}</div>` +
        `<div style="margin-top:6px;font-size:18px;line-height:26px">${body}</div>`;
      document.body.appendChild(el);
    },
    { kicker, body },
  );
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function hydrated(page) {
  await page.locator('[data-hydrated="true"]').waitFor({ state: "attached" });
}

async function main() {
  const server = await ensureServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: TMP, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`);
  await hydrated(page);
  await caption(page, "the wedge", "Who was in the room — not how good the quotes sound.", 12000);

  await page.goto(`${BASE}/workspaces/underpowered`);
  await hydrated(page);
  await caption(page, "coverage matrix", "Eleven interviews, five organisations. The empty role cell is the finding.", 14000);

  const roster = [
    "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes",
    "e2e-1,e2e-org-1,ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Reach founder@example.com about pricing",
  ].join("\n");
  await page.getByLabel("Roster CSV content").fill(roster);
  await caption(page, "import", "A roster goes in. Cells are redacted before any provider call; a second import is a no-op.", 7000);
  await page.getByRole("button", { name: "Import roster" }).click();
  await page.getByRole("status").waitFor();
  await caption(page, "import", "Six interviews become five independent organisations. The interview is not the unit.", 10000);

  await page.getByLabel("Belief in one sentence").fill("Budget holders will sign a paid pilot for this.");
  await page.getByRole("button", { name: "Formalise" }).click();
  await page.getByRole("button", { name: "Confirm claim" }).waitFor();
  await caption(page, "claim formalisation", "The model proposes meaning only. Every field is editable and the founder asserts the level.", 12000);
  await page.getByLabel("Claimed level").selectOption("4");
  await page.getByRole("button", { name: "Confirm claim" }).click();
  await page.getByText(/Budget holders will sign a paid pilot for this/).first().waitFor();

  await page.getByRole("button", { name: "Analyse now" }).click();
  await page.waitForURL(/\/runs\//);
  await hydrated(page);
  await caption(page, "verdict", "Claimed L4, verified L2 · six organisations · binding constraint: evidence type.", 18000);

  const maxResolutions = await page.getByRole("button", { name: "Resolve this claim" }).count();
  let captionedCheckpoint = false;
  for (let resolved = 0; resolved <= maxResolutions; resolved += 1) {
    const button = page.getByRole("button", { name: "Resolve this claim" }).first();
    if ((await button.count()) === 0) break;
    await button.click();
    const drawer = page.getByRole("dialog");
    await drawer.waitFor();
    if (!captionedCheckpoint) {
      await caption(page, "checkpoint", "No export while a claim is unresolved. Choose an action and name what would kill the claim.", 15000);
      captionedCheckpoint = true;
    }
    await drawer.getByLabel("This claim dies if…").fill(
      "This claim dies if a cold budget holder signs a paid pilot within 30 days without prompting.",
    );
    const confirmed = page.waitForResponse(
      (response) =>
        response.url().includes("/resolutions") && response.request().method() === "POST",
    );
    await drawer.getByRole("button", { name: "Confirm resolution" }).click();
    const response = await confirmed;
    if (!response.ok()) throw new Error(`resolution failed: ${response.status()}`);
    // Re-read from the server between resolutions; the client snapshot is stale.
    await page.reload();
    await hydrated(page);
  }
  await page.getByText("All claims resolved. Export is available.").waitFor();
  await caption(page, "checkpoint", "Falsifier recorded. The gate opens — in the service, the HTTP route and the database.", 10000);

  await page.getByRole("button", { name: "Export statement" }).click();
  await page.waitForURL(/\/statement$/);
  await caption(page, "evidence statement", "A one-page, print-ready statement. No notes, no names, no invented numbers.", 16000);

  const runId = page.url().split("/").at(-2);
  await page.goto(`${BASE}/runs/${runId}`);
  await hydrated(page);
  await caption(page, "determinism", "Now change the provider. No number may move.", 8000);
  await page.getByRole("button", { name: "Recompute with another provider" }).click();
  await page.getByText("IDENTICAL").waitFor();
  await caption(page, "determinism", "Provider changed; finding hash byte-identical. Models cannot write levels, counts or verdicts.", 16000);

  await page.goto(`${BASE}/runs/${runId}/recruiting`);
  await caption(page, "the action", "The binding constraint becomes one concrete recruiting instruction, not a score.", 12000);

  await page.goto(`${BASE}/api/workspaces/underpowered/events`);
  await caption(page, "audit trail", "Every import, confirmation, resolution and recompute is recorded. Hectic knows what it knows.", 10000);

  const video = page.video();
  await context.close();
  await browser.close();
  if (server) server.kill();

  const source = await video.path();
  copyFileSync(source, path.join(TMP, "demo.webm"));
  const target = path.join("docs", "demo.mp4");
  const result = spawn(ffmpeg, [
    "-y", "-i", path.join(TMP, "demo.webm"),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
    "-pix_fmt", "yuv420p", "-an", target,
  ], { stdio: "inherit" });
  await new Promise((resolve, reject) => {
    result.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
  rmSync(TMP, { recursive: true, force: true });
  console.log(`Wrote ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
