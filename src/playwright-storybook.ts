import * as path from 'path'
import * as fs from 'fs'
import { Page, test } from '@playwright/test'

const NYC = require('nyc')
const uuid = require('uuid')
const { execSync } = require('child_process')
const NYC_DIR = path.resolve(process.cwd(), '.nyc_output')
const COV_MERGE_DIR = path.join(NYC_DIR, 'merge')
const COV_REPORT_DIR = path.join(process.cwd(), 'coverage')

const coverageErrorMessage = `
  [Test runner] An error occurred when evaluating code coverage:
  The code in this story is not instrumented, which means the coverage setup is likely not correct.
  More info: https://github.com/storybookjs/test-runner#setting-up-code-coverage
`

export async function runStory(page: Page, storyId: string) {
  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    if (['warning'].includes(type)) {
      test.fixme(true, text)
    }
  })
  const viewMode = process.env.VIEW_MODE || 'story'

  await page.goto(`/iframe.html`, { waitUntil: 'load' })
  await page.waitForSelector('#root, #storybook-root', { state: 'attached', timeout: 10000 })

  await page.evaluate(
    ({ storyId, viewMode }: any) => {
      const renderedEvent = viewMode === 'docs' ? 'docsRendered' : 'storyRendered'
      return new Promise((resolve, reject) => {
        // @ts-ignore
        const channel = globalThis.__STORYBOOK_ADDONS_CHANNEL__
        if (!channel) {
          const description =
            'The test runner could not access the Storybook channel. Are you sure the Storybook is running correctly in that URL?'
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(new Error(description))
        }
        channel.on(renderedEvent, () => resolve(document.getElementById('root')))
        channel.on('storyUnchanged', () => resolve(document.getElementById('root')))
        channel.on('storyErrored', ({ description }: any) => reject(new Error(description)))
        channel.on('storyThrewException', (error: Error) => reject(error))
        channel.on('storyMissing', () => reject(new Error(`story missing`)))
        channel.emit('setCurrentStory', { storyId, viewMode })
      })
    },
    { storyId, viewMode }
  )

  if (process.env.COVERAGE === '1') {
    const isCoverageSetupCorrectly = await page.evaluate(() => '__coverage__' in window)
    if (isCoverageSetupCorrectly) {
      const coverage = await page.evaluate(`window.__coverage__`)
      fs.mkdirSync(COV_MERGE_DIR, { recursive: true })
      const buff = JSON.stringify(coverage)
      fs.writeFileSync(path.join(COV_MERGE_DIR, `${uuid.v4()}.json`), buff)
      return
    }
    throw new Error(coverageErrorMessage)
  }
}

export function clearCoverage() {
  if (fs.existsSync(NYC_DIR)) {
    fs.rmSync(NYC_DIR, { recursive: true })
  }
}

export async function buildCoverage() {
  const nyc = new NYC({
    _: ['merge'],
  })
  const map = await nyc.getCoverageMapFromAllCoverageFiles(COV_MERGE_DIR)
  const outputFile = path.join(NYC_DIR, 'coverage.json')
  const content = JSON.stringify(map, null, 2)
  fs.writeFileSync(outputFile, content)
  fs.rmSync(COV_MERGE_DIR, { recursive: true })

  execSync(`npx nyc report --reporter=text -t ${NYC_DIR}`, {
    stdio: 'inherit',
  })
  execSync(`npx nyc report --reporter=html -t ${NYC_DIR} --report-dir ${COV_REPORT_DIR}`, {
    stdio: 'inherit',
  })
}