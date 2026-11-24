import { expect, test, type Page } from "@playwright/test";
import { MAX_ROSTER_FILE_BYTES, MAX_ROSTER_ROWS } from "../lib/roster-upload";
import { expectNoCriticalViolations, waitForHydration } from "./helpers";

const HEADER =
  "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes";
const ROW =
  "upload-1,upload-org-1,ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Asked about pricing";
const VALID_ROSTER = `${HEADER}\n${ROW}`;

async function setFile(
  page: Page,
  name: string,
  mimeType: string,
  buffer: Buffer,
): Promise<void> {
  await page.locator("#file-upload").setInputFiles({ name, mimeType, buffer });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
});

test("parses a valid roster and shows a real preview", async ({ page }) => {
  await setFile(page, "roster.csv", "text/csv", Buffer.from(VALID_ROSTER));

  await expect(page.getByRole("heading", { name: "Roster Parsed Successfully" })).toBeVisible();
  await expect(page.getByText("1 row detected.")).toBeVisible();
  await expect(page.getByRole("table", { name: "Roster preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Audit" })).toBeEnabled();
  await expectNoCriticalViolations(page);
});

test("rejects a 0-byte file", async ({ page }) => {
  await setFile(page, "empty.csv", "text/csv", Buffer.alloc(0));

  await expect(page.getByTestId("upload-error")).toContainText("This file is empty");
});

test("rejects a .txt file", async ({ page }) => {
  await setFile(page, "notes.txt", "text/plain", Buffer.from(VALID_ROSTER));

  await expect(page.getByTestId("upload-error")).toContainText("valid CSV file");
});

test("rejects a CSV with missing columns", async ({ page }) => {
  await setFile(page, "thin.csv", "text/csv", Buffer.from("id,orgId\nu1,o1"));

  const alert = page.getByTestId("upload-error");
  await expect(alert).toContainText("Missing required columns");
  await expect(alert).toContainText("alias");
  await expect(alert).toContainText("evidenceType");
});

test("rejects an oversized CSV", async ({ page }) => {
  await setFile(page, "large.csv", "text/csv", Buffer.alloc(MAX_ROSTER_FILE_BYTES + 1, 0x61));

  await expect(page.getByTestId("upload-error")).toContainText("too large");
});

test("rejects a CSV past the backend row limit", async ({ page }) => {
  const rows = Array.from(
    { length: MAX_ROSTER_ROWS + 1 },
    (_, index) =>
      `upload-${index},upload-org-${index},ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Asked about pricing`,
  );

  await setFile(page, "many.csv", "text/csv", Buffer.from([HEADER, ...rows].join("\n")));

  await expect(page.getByTestId("upload-error")).toContainText("Too many rows");
});

test("can upload with the keyboard only", async ({ page }) => {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("file-select-button").focus();
  await page.keyboard.press("Enter");

  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "roster.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(VALID_ROSTER),
  });

  await expect(page.getByRole("heading", { name: "Roster Parsed Successfully" })).toBeVisible();
  await expectNoCriticalViolations(page);
});

test("Run Audit imports into the selected workspace and opens the run", async ({ page }) => {
  await setFile(page, "roster.csv", "text/csv", Buffer.from(VALID_ROSTER));
  await expect(page.getByRole("heading", { name: "Roster Parsed Successfully" })).toBeVisible();

  await page.route("**/api/workspaces/*/evidence/import", async (route) => {
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON() as { csv?: string };
    expect(body.csv).toContain(ROW);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ imported: 1, duplicates: 0, redacted: 0, injections: 0, errors: [] }),
    });
  });
  await page.route("**/api/workspaces/*/runs", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ providerId: "mock", modelId: "mock-v1" });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ run: { id: "dashboard-run" } }),
    });
  });
  const importRequest = page.waitForRequest(
    (request) => request.url().includes("/evidence/import") && request.method() === "POST",
  );
  const runRequest = page.waitForRequest(
    (request) =>
      /\/api\/workspaces\/[^/]+\/runs$/.test(request.url()) && request.method() === "POST",
  );

  await page.getByRole("button", { name: "Run Audit" }).click();

  const importBody = (await importRequest).postDataJSON() as { csv?: string };
  expect(importBody.csv).toContain(ROW);
  expect((await runRequest).postDataJSON()).toEqual({ providerId: "mock", modelId: "mock-v1" });
  await expect(page).toHaveURL(/\/runs\/dashboard-run$/);
});
