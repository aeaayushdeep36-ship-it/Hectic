import { expect, test } from "@playwright/test";
import { createRun, waitForHydration } from "./helpers";

test("switching provider leaves the finding hash unchanged", async ({ page, request }) => {
  const run = await createRun(request, "clean");
  await page.goto(`/runs/${run.id}`);
  await waitForHydration(page);
  await expect(page.getByText(`hash ${run.findingHash}`)).toBeVisible();

  await page.getByRole("button", { name: "Recompute with another provider" }).click();
  await expect(page.getByText("IDENTICAL")).toBeVisible();
  await expect(page.getByText(run.findingHash).first()).toBeVisible();

  const response = await request.post(`/api/runs/${run.id}/recompute`, {
    data: { providerId: "gemini", modelId: "gemini-flash-lite-latest" },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { identical: boolean; run: { findingHash: string } };
  expect(body.identical).toBe(true);
  expect(body.run.findingHash).toBe(run.findingHash);
});
