import { readFileSync } from "node:fs";
import path from "node:path";

export const PROMPT_VERSION = "claim-formaliser.v1";

export function readSystemPrompt(agent: string, version: string): string {
  return readFileSync(
    path.join(process.cwd(), "agents", "prompts", `${agent}.${version.split(".").at(-1)}.md`),
    "utf8",
  );
}
