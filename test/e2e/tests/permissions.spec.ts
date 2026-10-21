import { test, expect } from '@playwright/test';
import { adminPage, createUserWithSections, group, loginAs, section, setGroupSections, TestUser } from './support';

const runId = Date.now();
const user = (name: string): TestUser => ({
  name: `${name} ${runId}`,
  email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}${runId}@example.com`,
  password: '',
});

const editor = user('GN Editor');
const memberManager = user('GN Member Manager');
const settingsUsers = user('GN Settings Users');

test.beforeAll(async ({ browser }) => {
  const admin = await adminPage(browser);
  await createUserWithSections(admin, editor, ['Umb.Section.Content', 'Umb.Section.Media']);
  await createUserWithSections(admin, memberManager, ['Umb.Section.Content', 'Umb.Section.Members']);
  await createUserWithSections(admin, settingsUsers, ['Umb.Section.Content', 'Umb.Section.Settings', 'Umb.Section.Users']);
  await admin.context().close();
});

test('editor sees no Management tab at all', async ({ browser }) => {
  const page = await loginAs(browser, editor);
  await expect(section(page, 'Umb.Section.Content')).toBeVisible();
  await expect(section(page, 'Umb.Section.Media')).toBeVisible();
  await expect(group(page, 'management')).toHaveCount(0);
  await expect(section(page, 'Umb.Section.Settings')).toHaveCount(0);
});

test('member manager sees Content | Members with the group collapsed', async ({ browser }) => {
  const page = await loginAs(browser, memberManager);
  await expect(group(page, 'management')).toHaveCount(0);
  await expect(section(page, 'Umb.Section.Members')).toBeVisible();
  await expect(section(page, 'Umb.Section.Settings')).toHaveCount(0);
});

test('settings + users user gets a Management dropdown with only those two', async ({ browser }) => {
  const page = await loginAs(browser, settingsUsers);
  await group(page, 'management').click();
  await expect(section(page, 'Umb.Section.Settings')).toBeVisible();
  await expect(section(page, 'Umb.Section.Users')).toBeVisible();
  await expect(section(page, 'Umb.Section.Members')).toHaveCount(0);
});

test.describe('permission changes while logged in', () => {
  const live = user('GN Live');

  test('header follows group section changes on the next load, without logging in again', async ({ browser }) => {
    const admin = await adminPage(browser);
    await createUserWithSections(admin, live, ['Umb.Section.Content', 'Umb.Section.Settings', 'Umb.Section.Users']);

    const page = await loginAs(browser, live);
    await expect(group(page, 'management')).toBeVisible();
    await group(page, 'management').click();
    await expect(section(page, 'Umb.Section.Users')).toBeVisible();
    await page.keyboard.press('Escape');

    // Users removed: one visible member left, so the group collapses to a plain Settings tab.
    await setGroupSections(admin, live, ['Umb.Section.Content', 'Umb.Section.Settings']);
    await page.reload();
    await expect(section(page, 'Umb.Section.Settings')).toBeVisible();
    await expect(group(page, 'management')).toHaveCount(0);
    await expect(section(page, 'Umb.Section.Users')).toHaveCount(0);

    // Members added: two visible members again, so the dropdown returns with the new member.
    await setGroupSections(admin, live, ['Umb.Section.Content', 'Umb.Section.Settings', 'Umb.Section.Members']);
    await page.reload();
    await expect(group(page, 'management')).toBeVisible();
    await group(page, 'management').click();
    await expect(section(page, 'Umb.Section.Members')).toBeVisible();
    await expect(section(page, 'Umb.Section.Users')).toHaveCount(0);

    // Everything but Content removed: no Management tab at all.
    await setGroupSections(admin, live, ['Umb.Section.Content']);
    await page.reload();
    await expect(section(page, 'Umb.Section.Content')).toBeVisible();
    await expect(group(page, 'management')).toHaveCount(0);
    await expect(section(page, 'Umb.Section.Settings')).toHaveCount(0);
  });

  test('a removed section is not reachable from the grouped header after reload', async ({ browser }) => {
    const admin = await adminPage(browser);
    const other = user('GN Live Two');
    await createUserWithSections(admin, other, ['Umb.Section.Content', 'Umb.Section.Settings', 'Umb.Section.Members']);

    const page = await loginAs(browser, other);
    await setGroupSections(admin, other, ['Umb.Section.Content', 'Umb.Section.Members']);
    await page.reload();
    await expect(group(page, 'management')).toHaveCount(0);
    await expect(section(page, 'Umb.Section.Members')).toBeVisible();
    await expect(section(page, 'Umb.Section.Settings')).toHaveCount(0);
  });
});
