// Regenerates the README screenshots against a running test site: node scripts/screenshots.mjs
import { chromium } from '@playwright/test';

const base = process.env.URL ?? 'https://localhost:44301';
const out = new URL('../../../docs/images/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const browser = await chromium.launch();
const page = await (await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 520 } })).newPage();
await page.goto(`${base}/umbraco`);
await page.locator('input[name="username"]').fill(process.env.UMBRACO_USER_LOGIN ?? 'admin@example.com');
await page.locator('input[name="password"]').fill(process.env.UMBRACO_USER_PASSWORD ?? '1234567890');
await page.getByRole('button', { name: 'Login' }).click();
await page.waitForURL(/\/section\//);
await page.locator('[data-mark="group-link:management"]').waitFor();

const header = { x: 0, y: 0, width: 1280, height: 70 };
await page.screenshot({ path: `${out}header-grouped.png`, clip: header });

await page.locator('[data-mark="group-link:management"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}dropdown-management.png`, clip: { ...header, height: 190 } });
await page.keyboard.press('Escape');

await page.locator('[data-mark="group-link:addons"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}dropdown-addons.png`, clip: { ...header, height: 190 } });
await page.keyboard.press('Escape');

await browser.close();
