import { test, expect, Page } from '@playwright/test';
import { adminPage, createUserWithSections, loginAs, TestUser } from './support';

const runId = Date.now();
const mk = (name: string): TestUser => ({ name: `${name} ${runId}`, email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}${runId}@example.com`, password: '' });

/** Top-level order as rendered: section aliases and group aliases, in DOM order. */
async function topLevel(page: Page) {
  await expect(page.locator('hcs-header-sections .entry').first()).toBeVisible();
  return page.evaluate(() => {
    const bar = document;
    const find = (root: ParentNode): Element | null => {
      const hit = root.querySelector('hcs-header-sections');
      if (hit) return hit;
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) { const r = find(el.shadowRoot); if (r) return r; }
      }
      return null;
    };
    const sections = find(bar) as HTMLElement;
    return [...sections.shadowRoot!.querySelectorAll('#tabs > .entry > *')].map((el) =>
      el.tagName === 'HCS-HEADER-GROUP' ? `group:${el.getAttribute('groupalias')}` : (el as HTMLElement).dataset.mark!.replace('section-link:', ''),
    );
  });
}

test('ungrouped sections and groups keep the same relative order for every user', async ({ browser }) => {
  const admin = await adminPage(browser);
  const everything = mk('GN Order All');
  const noAddons = mk('GN Order No Addons');
  await createUserWithSections(admin, everything, ['Umb.Section.Content', 'Umb.Section.Media', 'Umb.Section.Settings', 'Umb.Section.Users', 'Umb.Section.Members', 'Umb.Section.Forms', 'Umb.Section.Workflow', 'commerce']);
  await createUserWithSections(admin, noAddons, ['Umb.Section.Content', 'Umb.Section.Media', 'Umb.Section.Settings', 'Umb.Section.Users', 'Umb.Section.Members', 'Umb.Section.Forms', 'Umb.Section.Workflow']);

  const a = await topLevel(await loginAs(browser, everything));
  const b = await topLevel(await loginAs(browser, noAddons));
  // Losing Commerce must not move the Add-ons group.
  expect(b).toEqual(a);
  expect(a.indexOf('group:addons')).toBeLessThan(a.indexOf('group:management'));
});

test('order is stable across reloads', async ({ browser }) => {
  const page = await adminPage(browser);
  const first = await topLevel(page);
  for (let i = 0; i < 3; i++) {
    await page.reload();
    expect(await topLevel(page)).toEqual(first);
  }
});
