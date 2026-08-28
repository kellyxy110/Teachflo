import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const authState = resolve(process.cwd(), ".auth/teacher.json");
const visualRoot = resolve(process.cwd(), "e2e/visual-baseline");
const hasTeacherSession = existsSync(authState);

const surfaces = [
  { id: "dashboard", path: "/dashboard", heading: /good (morning|afternoon|evening)/i },
  { id: "students", path: "/students", heading: "Students" },
  { id: "import", path: "/student-hub/import", heading: "Excel / CSV Import" },
] as const;

const viewports = [
  { name: "mobile-320", width: 320, height: 740 },
  { name: "mobile-360", width: 360, height: 780 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
] as const;

async function openSurface(page: Page, path: string, heading: string | RegExp) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.ok(), `${path} should return a successful document response`).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(overflow.document, `document overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.body, `body overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function expectVisibleFocus(page: Page) {
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return {
      tag: element.tagName,
      label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 60),
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(focus, "Tab should move focus to an interactive element").not.toBeNull();
  expect(
    focus?.outline !== "none" && focus?.outlineWidth !== "0px" || focus?.boxShadow !== "none",
    `focused control should have a visible focus indicator: ${JSON.stringify(focus)}`,
  ).toBeTruthy();
}

async function expectFormNames(page: Page) {
  const unnamed = await page.locator("input:not([type=hidden]), select, textarea, button").evaluateAll((elements) =>
    elements.filter((element) => {
      const html = element as HTMLElement;
      if (html.getAttribute("aria-hidden") === "true") return false;
      if (html instanceof HTMLInputElement && html.type === "file" && html.classList.contains("hidden")) return false;
      const labelledBy = html.getAttribute("aria-labelledby");
      const label = html.getAttribute("aria-label");
      const id = html.id;
      const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrapping = html.closest("label");
      const text = html instanceof HTMLButtonElement ? html.textContent?.trim() : null;
      return !labelledBy && !label && !explicit && !wrapping && !text;
    }).map((element) => element.outerHTML.slice(0, 180)),
  );
  expect(unnamed, `unnamed controls: ${unnamed.join(" | ")}`).toEqual([]);
}

test.describe("F1.1 authenticated foundation", () => {
  test.skip(!hasTeacherSession, "A legitimate Development Teacher storage state is required at .auth/teacher.json");

  for (const surface of surfaces) {
    test(`${surface.id} desktop structure, keyboard and semantics`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openSurface(page, surface.path, surface.heading);
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
      await expectNoViewportOverflow(page);
      await expectVisibleFocus(page);
      await expectFormNames(page);
    });
  }

  test("students register exposes semantic responsive table region", async ({ page }) => {
    await openSurface(page, "/students", "Students");
    const region = page.getByRole("region", { name: "Students register" });
    if (await region.count()) {
      await expect(region).toHaveAttribute("tabindex", "0");
      await expect(region.getByRole("table")).toBeVisible();
    } else {
      await expect(page.getByText("No students yet")).toBeVisible();
    }
  });

  test("import exposes the protected presentation contract", async ({ page }) => {
    await openSurface(page, "/student-hub/import", "Excel / CSV Import");
    const progress = page.getByRole("navigation", { name: "Student import progress" });
    await expect(progress).toBeVisible();
    await expect(progress.getByText("Upload", { exact: true })).toBeVisible();
    await expect(progress.getByText("Analyse", { exact: true })).toBeVisible();
    await expect(progress.getByText("Map", { exact: true })).toBeVisible();
    await expect(progress.getByText("Preview", { exact: true })).toBeVisible();
    await expect(progress.getByText("Confirm", { exact: true })).toBeVisible();
    await expect(progress.getByText("Commit", { exact: true })).toBeVisible();
    await expect(progress.getByText("Complete", { exact: true })).toBeVisible();
    await expect(page.getByText("Teacher confirmation required")).toBeVisible();
    await expect(page.getByText("Upload Spreadsheet")).toBeVisible();
  });

  for (const viewport of viewports) {
    test(`${viewport.name} touched surfaces remain reachable`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const surface of surfaces) {
        await openSurface(page, surface.path, surface.heading);
        await expectNoViewportOverflow(page);
        const heading = page.getByRole("heading", { level: 1, name: surface.heading });
        await expect(heading).toBeInViewport();
      }
    });
  }

  test("reduced motion preference suppresses operational transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSurface(page, "/student-hub/import", "Excel / CSV Import");
    const duration = await page.locator("body").evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--motion-normal").trim());
    expect(duration).toBeTruthy();
    const maxAnimationDuration = await page.locator("body").evaluate(() => {
      const values = Array.from(document.querySelectorAll("*")).map((element) => Number.parseFloat(getComputedStyle(element).animationDuration) || 0);
      return Math.max(0, ...values);
    });
    expect(maxAnimationDuration).toBeLessThanOrEqual(0.001);
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "tablet-768", width: 768, height: 1024 },
  ]) {
    for (const surface of surfaces) {
      test(`visual baseline ${surface.id} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await openSurface(page, surface.path, surface.heading);
        const destination = resolve(visualRoot, `${surface.id}-${viewport.name}.png`);
        mkdirSync(dirname(destination), { recursive: true });
        await page.screenshot({ path: destination, fullPage: true, animations: "disabled" });
      });
    }
  }
});
