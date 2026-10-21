import { test, expect } from '@playwright/test';
import { adminPage, group, section } from './support';

// Start the test site with HCS__UmbCustomHeader__Enabled=false (disabled) or an invalid group
// (e.g. HCS__UmbCustomHeader__Groups__0__Label="") and set GN_SCENARIO accordingly.
const scenario = process.env.GN_SCENARIO;

test.skip(!scenario, 'GN_SCENARIO not set');

test(`falls back to native flat navigation (${scenario})`, async ({ browser }) => {
  const page = await adminPage(browser);
  await expect(section(page, 'Umb.Section.Settings')).toBeVisible();
  await expect(section(page, 'Umb.Section.Users')).toBeVisible();
  await expect(group(page, 'management')).toHaveCount(0);
});
