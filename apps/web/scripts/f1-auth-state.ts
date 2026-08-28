import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.TEACHNEXIS_E2E_BASE_URL;

async function main() {
  if (!baseURL) throw new Error("TEACHNEXIS_E2E_BASE_URL is required");
  if (process.env.TEACHNEXIS_E2E_PROJECT_REF !== "wxgnufdacfncwxbedzap") {
    throw new Error("Refusing auth-state capture outside approved Development");
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL.replace(/\/$/, "")}/sign-in`, { waitUntil: "domcontentloaded" });
  console.log("Sign in with a legitimate Development Teacher account in the opened browser.");
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 10 * 60 * 1000 });
  await page.waitForLoadState("domcontentloaded");
  await mkdir(".auth", { recursive: true });
  await context.storageState({ path: ".auth/teacher.json" });
  await browser.close();
  console.log("Saved .auth/teacher.json (git-ignored).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
