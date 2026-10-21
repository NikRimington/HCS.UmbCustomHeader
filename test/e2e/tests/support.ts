import { Browser, Page, expect } from '@playwright/test';
import { umbracoConfig } from './config';

export const baseUrl = process.env.UMBRACO_URL ?? umbracoConfig.baseUrl;
const api = `${baseUrl}/umbraco/management/api/v1`;

export const section = (page: Page, alias: string) => page.locator(`[data-mark="section-link:${alias}"]`);
export const group = (page: Page, alias: string) => page.locator(`[data-mark="group-link:${alias}"]`);

export async function login(page: Page, email: string, password: string) {
  await page.goto(`${baseUrl}/umbraco`);
  await page.locator('input[name="username"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/umbraco\/section\//);
}

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

const bearer = new WeakMap<Page, string>();

/** Calls the management API with the Bearer token the backoffice itself used on this page. */
async function call(page: Page, method: 'GET' | 'POST' | 'DELETE' | 'PUT', path: string, data?: unknown) {
  await expect.poll(() => bearer.get(page), { message: 'no backoffice bearer token seen' }).toBeTruthy();
  return page.request.fetch(`${api}${path}`, {
    method,
    data: data as object | undefined,
    headers: { Authorization: bearer.get(page)!, 'Content-Type': 'application/json' },
  });
}

/** Creates a user (users with a login history cannot be deleted, so callers use unique names) in a group granting exactly `sections`, using the admin page's session. */
export async function createUserWithSections(adminPage: Page, user: TestUser, sections: string[]) {
  const groupName = `${user.name} group`;

  const groupResponse = await call(adminPage, 'POST', '/user-group', {
    name: groupName,
    alias: groupName.toLowerCase().replace(/\W/g, '-'),
    icon: 'icon-users',
    sections,
    languages: [],
    hasAccessToAllLanguages: true,
    documentRootAccess: true,
    mediaRootAccess: true,
    fallbackPermissions: ['Umb.Document.Read'],
    permissions: [],
  });
  expect(groupResponse.status(), await groupResponse.text()).toBe(201);
  const groupId = groupResponse.headers()['location'].split('/').pop()!;

  const userResponse = await call(adminPage, 'POST', '/user', {
    email: user.email,
    userName: user.email,
    name: user.name,
    userGroupIds: [{ id: groupId }],
    kind: 'Default',
  });
  expect(userResponse.status(), await userResponse.text()).toBe(201);
  const userId = userResponse.headers()['location'].split('/').pop()!;

  // The user was created with a generated password; set a known one for the UI login.
  const passwordResponse = await call(adminPage, 'POST', `/user/${userId}/reset-password`);
  expect(passwordResponse.ok(), await passwordResponse.text()).toBeTruthy();
  user.password = (await passwordResponse.json()).resetPassword;
}

/** Replaces the sections of the group created for `user`, as an admin would while the user is logged in. */
export async function setGroupSections(adminPage: Page, user: TestUser, sections: string[]) {
  const groupName = `${user.name} group`;
  const list = await (await call(adminPage, 'GET', '/user-group?skip=0&take=100')).json();
  const existing = list.items.find((g: { name: string }) => g.name === groupName);
  expect(existing, `group ${groupName} not found`).toBeTruthy();
  const response = await call(adminPage, 'PUT', `/user-group/${existing.id}`, { ...existing, sections });
  expect(response.status(), await response.text()).toBe(200);
}

export async function loginAs(browser: Browser, user: TestUser): Promise<Page> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await login(page, user.email, user.password);
  return page;
}

export async function adminPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: process.env.STORAGE_STAGE_PATH });
  const page = await context.newPage();
  page.on('request', (r) => {
    const auth = r.headers()['authorization'];
    if (auth && r.url().includes('/management/api/')) bearer.set(page, auth);
  });
  await page.goto(`${baseUrl}/umbraco`);
  await page.waitForURL(/\/umbraco\/section\//);
  return page;
}
