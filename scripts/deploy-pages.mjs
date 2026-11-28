import { execSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "app", "api");
const apiBackup = path.join(root, ".pages-api-backup");

const dynamicPages = [
  path.join(root, "app", "workspaces", "[slug]", "page.tsx"),
  path.join(root, "app", "runs", "[id]", "page.tsx"),
  path.join(root, "app", "runs", "[id]", "statement", "page.tsx"),
  path.join(root, "app", "runs", "[id]", "recruiting", "page.tsx"),
];

const originals = new Map();

try {
  if (existsSync(apiDir)) {
    if (existsSync(apiBackup)) rmSync(apiBackup, { recursive: true, force: true });
    renameSync(apiDir, apiBackup);
  }

  for (const file of dynamicPages) {
    const content = readFileSync(file, "utf8");
    originals.set(file, content);
    writeFileSync(
      file,
      content.replace('export const dynamic = "force-dynamic";', 'export const dynamic = "force-static";'),
      "utf8",
    );
  }

  const nextDir = path.join(root, ".next");
  if (existsSync(nextDir)) rmSync(nextDir, { recursive: true, force: true });

  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, CF_PAGES: "1" },
  });

  execSync(
    "npx -y wrangler@latest pages deploy out --project-name=hectic-web --branch=main --commit-dirty=true",
    { stdio: "inherit" },
  );
} finally {
  for (const [file, content] of originals.entries()) {
    writeFileSync(file, content, "utf8");
  }
  if (existsSync(apiBackup) && !existsSync(apiDir)) {
    renameSync(apiBackup, apiDir);
  }
}
