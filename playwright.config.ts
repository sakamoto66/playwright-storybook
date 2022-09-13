import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  // globalSetup: './__tests__/global-setup',
  // globalTeardown: './__tests__/global-teardown',
  testDir: './tests',
  use: {
    // Context options
    baseURL: 'http://localhost:3003',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Artifacts
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'tmp/playwright.results.xml' }], ['github'], ['html']]
    : [['list'], ['junit', { outputFile: 'tmp/playwright.results.xml' }], ['html']],
  timeout: 60 * 1000,
  workers: 4,
}
export default config
