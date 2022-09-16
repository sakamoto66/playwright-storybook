import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './tmp',
  use: {
    baseURL: 'http://localhost:3003',
  },
}
export default config
