import { expect, test } from "@playwright/test";
import { expectNoCriticalViolations, FALSIFIER, waitForHydration } from "./helpers";

const ROSTER = [
  "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes",
  "e2e-1,e2e-org-1,ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Reach founder@example.com about pricing",
].join("\n");

test("import, confirm, analyse, resolve, export", async ({ page, request }) => {
  await page.goto("/");
  await waitForHydration(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Know what you actually know");
  await expectNoCriticalViolations(page);

  await page.goto("/workspaces/underpowered");
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Coverage" })).toBeVisible();
  await expect(page.getByText(/Who was in the room/)).toBeVisible();
  await expectNoCriticalViolations(page);

  const rosterField = page.getByLabel("Roster CSV content");
  await rosterField.fill(ROSTER);
  await expect(rosterField).toHaveValue(ROSTER);
  await page.getByRole("button", { name: "Import roster" }).click();
  await expect(page.getByRole("status")).toContainText(/imported|already present/);

  // The founder confirms a formalised claim; the model proposes meaning only.
  await page.getByLabel("Belief in one sentence").fill("Budget holders will sign a paid pilot for this.");
  await page.getByRole("button", { name: "Formalise" }).click();
  await expect(page.getByRole("button", { name: "Confirm claim" })).toBeVisible();
  await page.getByLabel("Claimed level").selectOption("4");
  await page.getByRole("button", { name: "Confirm claim" }).click();
  await expect(page.getByText(/Budget holders will sign a paid pilot for this/).first()).toBeVisible();

  await page.getByRole("button", { name: "Analyse now" }).click();
  await expect(page).toHaveURL(/\/runs\//);
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Findings" })).toBeVisible();
  await expectNoCriticalViolations(page);

  // The provider picker exposes OpenRouter while keeping mock as the safe default.
  const providerSelect = page.getByLabel("Provider");
  await expect(providerSelect).toBeVisible();
  await expect(providerSelect).toHaveValue("mock");
  await expect(providerSelect.locator('option[value="openrouter"]')).toHaveText(/gemma 4 31B free/);

  // U1: the live stream shows named agent steps, not a bare spinner.
  await page.getByRole("button", { name: "Run agents with live status" }).click();
  await expect(page.getByRole("region", { name: "Agent progress" })).toBeVisible();
  await expect(page.getByText(/formalise — Formalising claim/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Finding hash sha256:/)).toBeVisible({ timeout: 15_000 });
  await waitForHydration(page);

  // U2: a single claim can be audited end-to-end from the reasoning trace.
  await expect(page.getByText("Reasoning trace — population, tags, binding ⓘ").first()).toBeVisible();

  // Every non-supported claim has to carry a falsifier before export unlocks.
  const maxResolutions = await page.getByRole("button", { name: "Resolve this claim" }).count();
  let guard = 0;
  while ((await page.getByRole("button", { name: "Resolve this claim" }).count()) > 0) {
    expect(guard++, "resolution loop must terminate").toBeLessThan(maxResolutions + 1);
    await page.getByRole("button", { name: "Resolve this claim" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByLabel("This claim dies if…").fill(FALSIFIER);
    const confirmed = page.waitForResponse(
      (response) =>
        response.url().includes("/resolutions") && response.request().method() === "POST",
    );
    await drawer.getByRole("button", { name: "Confirm resolution" }).click();
    expect((await confirmed).ok()).toBeTruthy();
    // Reload from the server between resolutions so the loop cannot act on a
    // stale client snapshot of an already-resolved claim.
    await page.reload();
    await waitForHydration(page);
  }
  await expect(page.getByText("All claims resolved. Export is available.")).toBeVisible();

  await page.getByRole("button", { name: "Export statement" }).click();
  await expect(page).toHaveURL(/\/statement$/);
  await expect(page.getByRole("heading", { name: "Evidence statement" })).toBeVisible();
  await expect(page.getByText("DRAFT — NOT VERIFIED")).toHaveCount(0);

  const runId = page.url().split("/").at(-2)!;
  const html = await (await request.get(`/runs/${runId}/statement`)).text();
  expect(html).not.toContain("founder@example.com");
  expect(html).not.toContain("about pricing");
});
