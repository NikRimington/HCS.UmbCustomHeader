import { test as setup } from '@playwright/test';
import { umbracoConfig } from './config';
import { login } from './support';

setup('authenticate admin', async ({ page }) => {
  await login(page, umbracoConfig.adminLogin, umbracoConfig.adminPassword);
  await page.context().storageState({ path: process.env.STORAGE_STAGE_PATH! });
});
