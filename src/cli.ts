#! /usr/bin/env node

import * as path from 'path'
import * as fs from 'fs'
import { buildStoriesJson } from './build-stories-json'
import { clearCoverage, buildCoverage } from './playwright-storybook'

const commandLineArgs = require('command-line-args')
const { register } = require('esbuild-register/dist/node')
const { execSync } = require('child_process')

register({
  target: 'node14'
})

const optionDefinitions = [
  {
    name: 'config',
    alias: 'c',
    type: String,
    defaultValue: path.resolve(process.cwd(), 'playwright.config'),
  },
];

(async () => {
  const commandOptions = commandLineArgs(optionDefinitions)
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

  const args = process.argv.filter((v,i) => i > 1)
  execSync(`npx playwright test ${args.join(' ')}`, {
    stdio: 'inherit',
  })

  if (process.env.COVERAGE === '1') {
    buildCoverage()
  }

})();

function getTestCase() {
  return `
  import * as path from 'path'
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

