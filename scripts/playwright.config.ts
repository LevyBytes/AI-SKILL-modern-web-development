// Portable adaptation of GoogleChrome Modern Web Guidance playwright.config.ts.
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const file = process.env.GRADER_FILE;
const output = process.env.GRADER_OUTPUT;
if (!file || !output)
  throw Error(
    'Start this config with run-grader.ts to select an exact grader and isolated output.',
  );
const escape = (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const exact = new RegExp(
  '^' + path.resolve(file).split(path.sep).map(escape).join('[/\\\\]') + '$',
);
export default defineConfig({
  testDir: path.dirname(file),
  testMatch: exact,
  outputDir: output,
  workers: 1,
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 3000 },
  globalTimeout: 180000,
  retries: 0,
  forbidOnly: true,
  reporter: 'json',
  captureGitInfo: { commit: false, diff: false },
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    trace: 'off',
    launchOptions: process.env.GRADER_BROWSER ? { executablePath: process.env.GRADER_BROWSER } : {},
  },
});
