import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const approvedProjectRef = "wxgnufdacfncwxbedzap";
const baseURL = process.env.TEACHNEXIS_E2E_BASE_URL;
const projectRef = process.env.TEACHNEXIS_E2E_PROJECT_REF;
const teacherStorageState = ".auth/teacher.json";
const databaseEnvPath = resolve(process.cwd(), "../../packages/database/.env");

if (!baseURL) {
  throw new Error("TEACHNEXIS_E2E_BASE_URL is required for F1.1 browser verification");
}

if (projectRef !== approvedProjectRef) {
  throw new Error("F1.1 browser verification refuses any database target except approved Development");
}

const databaseLine = readFileSync(databaseEnvPath, "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="));
if (!databaseLine) throw new Error("F1.1 browser verification requires the guarded Development DATABASE_URL");
const databaseURL = new URL(databaseLine.slice("DATABASE_URL=".length).replace(/^\"|\"$/g, ""));
if (
  !databaseURL.username.includes(approvedProjectRef) ||
  databaseURL.username.includes("cnodlvmgdueykdriiati") ||
  databaseURL.port !== "5432" ||
  databaseURL.pathname !== "/postgres"
) {
  throw new Error("F1.1 browser verification refuses any non-approved or protected database target");
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/f1-runtime",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    storageState: existsSync(teacherStorageState) ? teacherStorageState : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...devices["Desktop Chrome"],
  },
});
