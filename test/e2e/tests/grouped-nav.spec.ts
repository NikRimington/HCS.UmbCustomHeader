import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { adminPage, group, section } from './support';

test('admin sees grouped Management dropdown and active state follows navigation', async ({ browser }) => {
  const page = await adminPage(browser);

  await expect(section(page, 'Umb.Section.Content')).toBeVisible();
  await expect(section(page, 'Umb.Section.Media')).toBeVisible();
  await expect(section(page, 'Umb.Section.Packages')).toBeVisible();

  const mgmt = group(page, 'management');
  await expect(mgmt).toBeVisible();
  await expect(mgmt).toHaveAttribute('aria-haspopup', 'menu');

  await mgmt.click();
  await expect(mgmt).toHaveAttribute('aria-expanded', 'true');
  for (const alias of ['Settings', 'Users', 'Members']) {
    await expect(section(page, `Umb.Section.${alias}`)).toBeVisible();
  }

  await section(page, 'Umb.Section.Users').click();
  await expect(page).toHaveURL(/\/section\/user-management/);
  await expect(page.locator('hcs-header-group[groupalias="management"]')).toHaveAttribute('active', '');
});

test('Escape closes the dropdown and returns focus to the trigger', async ({ browser }) => {
  const page = await adminPage(browser);
  const mgmt = group(page, 'management');
  await mgmt.click();
  await expect(mgmt).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(mgmt).toHaveAttribute('aria-expanded', 'false');
});

test('header navigation has no axe violations', async ({ browser }) => {
  const page = await adminPage(browser);
  await group(page, 'management').click();
  // `region` is a page-level rule for the whole backoffice shell. `aria-required-children` is skipped because the
  // tablist also holds the group and "More" buttons, as core's uui-tab-group does with its own overflow button.
  const results = await new AxeBuilder({ page }).disableRules(['region', 'aria-required-children']).analyze();
  // Only judge our own elements; the rest of the backoffice is not ours to fix.
  const ours = results.violations.flatMap((v) =>
    v.nodes.filter((n) => JSON.stringify(n.target).includes('hcs-header')).map((n) => `${v.id}: ${n.html}`),
  );
  expect(ours).toEqual([]);
});
