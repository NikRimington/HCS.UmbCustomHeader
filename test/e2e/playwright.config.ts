import { defineConfig } from '@playwright/test';
import { umbracoConfig } from './tests/config';

export const STORAGE_STATE = 'playwright/.auth/admin.json';
process.env.STORAGE_STAGE_PATH = STORAGE_STATE;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.UMBRACO_URL ?? umbracoConfig.baseUrl,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'grouped-nav', testMatch: /(grouped-nav|permissions|ordering)\.spec\.ts/, dependencies: ['setup'] },
    // Run with GN_SCENARIO=disabled|invalid against a site started with matching config (see README).
    { name: 'scenario', testMatch: /scenario\.spec\.ts/, dependencies: ['setup'] },
  ],
});
