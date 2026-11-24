import AxeBuilder from "@axe-core/playwright";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface RunSummary {
  readonly id: string;
  readonly findingHash: string;
  readonly findings: readonly {
    readonly claimId: string;
    readonly finding: string;
  }[];
}

export async function createRun(
  request: APIRequestContext,
  slug = "underpowered",
): Promise<RunSummary> {
  const response = await request.post(`/api/workspaces/${slug}/runs`, { data: {} });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { run: RunSummary };
  return body.run;
}

/** Wait until React has attached handlers to the server-rendered page. */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('[data-hydrated="true"]').waitFor({ state: "attached" });
}

/** Blocks serious and critical WCAG A/AA violations, matching the Lighthouse gate. */
export async function expectNoCriticalViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blocking.flatMap((violation) => [
      `${violation.id}: ${violation.help}`,
      ...violation.nodes.slice(0, 5).map((node) => `  ${node.target.join(" ")}`),
    ]),
    "serious or critical accessibility violations",
  ).toEqual([]);
}

export const FALSIFIER =
  "This claim dies if a cold budget holder signs a paid pilot within 30 days without prompting.";
