#! /usr/bin/env node

import * as path from 'path'
import * as fs from 'fs'
import { buildStoriesJson } from './build-stories-json'
import { clearCoverage, buildCoverage } from './playwright-storybook'

const commandLineArgs = require('command-line-args')
const { register } = require('esbuild-register/dist/node')
const { spawn } = require('child_process')

register({
  target: 'node14'
})

const optionDefinitions = [
  {
    name: 'browser',
    type: String,
  },
  {
    name: 'headed',
  },
  {
    name: 'config',
    alias: 'c',
    type: String,
    defaultValue: path.resolve(process.cwd(), 'playwright.config'),
  },
  {
    name: 'grep',
    alias: 'g',
    type: String,
  },
  {
    name: 'grepv',
    type: String,
  },
  {
    name: 'gv',
    type: String,
  },
  {
    name: 'global-timeout',
    type: String,
  },
  {
    name: 'workers',
    alias: 'j',
    type: String,
  },
  {
    name: 'list',
  },
  {
    name: 'max-failures',
    type: String,
  },
  {
    name: 'output',
    type: String,
  },
  {
    name: 'quiet',
  },
  {
    name: 'repeat-each',
    type: String,
  },
  {
    name: 'reporter',
    type: String,
  },
  {
    name: 'retris',
    type: String,
  },
  {
    name: 'project',
    type: String,
  },
  {
    name: 'timeout',
    type: String,
  },
  {
    name: 'trace',
    type: String,
  },
  {
    name: 'shard',
    type: String,
  },
  {
    name: 'update-snapshots',
    alias: 'u',
  },
  {
    name: 'xxx',
    alias: 'x',
  },
  {
    name: 'help',
    alias: 'h',
  },
];

(async () => {
  const args = process.argv.filter((v,i) => i > 1)
  if (args.length > 0 && args[0] === 'init') {
    initConfig()
    return
  }
  if (args.length > 0 && args[0] === 'coverage-report') {
    buildCoverage()
    return
  }
  const commandOptions = commandLineArgs(optionDefinitions)
  if ('help' in commandOptions) {
    await spawn(`npx`, ['playwright', 'test', ...args], {
      stdio: 'inherit',
    })
    return
  }

  const configFile = await import(commandOptions.config)
  const config = configFile.default

  const testDir = path.resolve(process.cwd(), config.testDir)
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  const stories = await buildStoriesJson(config.use.baseURL)
  const storyJsonFile = path.join(testDir, 'stories.json')
  fs.writeFileSync(storyJsonFile, JSON.stringify(stories, null, 2))

  const testFile = path.join(testDir, 'storybook.spec.ts')
  fs.writeFileSync(testFile, getTestCase())

  if (process.env.COVERAGE === '1') {
    clearCoverage()
  }

  await spawn(`npx`, ['playwright', 'test', ...args], {
    stdio: 'inherit',
  })
})();

function getTestCase() {
  return `import * as path from 'path'
import { Page, test } from '@playwright/test'
import { runStory } from 'playwright-storybook'

test.describe.parallel('Story Book', () => {
  const stories = require(path.join(__dirname, 'stories.json'))

  for (const { storyId, folder, story } of stories) {
    test(\`\${folder.join('/')} - \${story}\`, async ({ page }) => {
      await runStory(page, storyId)
    })
  }
})
`
}

function initConfig() {
  const fPath = path.resolve(process.cwd(), 'playwright.config.ts')
  fs.writeFileSync(fPath, getDefaultConfig())
}

function getDefaultConfig() {
  return `import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './.storybook-test',
  use: {
    baseURL: 'http://localhost:3003',
  },
}
export default config
`
}
