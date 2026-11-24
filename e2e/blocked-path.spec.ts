import { expect, test } from "@playwright/test";
import { createRun, expectNoCriticalViolations, waitForHydration } from "./helpers";

test("export stays blocked while a finding is unresolved", async ({ page, request }) => {
  const run = await createRun(request);
  await page.goto(`/runs/${run.id}`);
  await waitForHydration(page);

  await expect(page.getByRole("button", { name: "Export statement" })).toBeDisabled();
  await expect(page.getByText(/Export is blocked/)).toBeVisible();
  await expectNoCriticalViolations(page);

  // The UI is not the checkpoint: a direct request gets the same answer.
  const response = await request.get(`/api/runs/${run.id}/export`);
  expect(response.status()).toBe(422);
  const body = (await response.json()) as {
    error: string;
    unresolved: string[];
  };
  expect(body.error).toBe("UNRESOLVED_FINDINGS");
  expect(body.unresolved).toEqual(run.findings.filter((f) => f.finding !== "SUPPORTED").map((f) => f.claimId));
});
