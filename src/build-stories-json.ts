import { chromium, Page } from '@playwright/test'

type Story = {
  storyId: string
  folder: string[]
  story: string
}

export async function buildStoriesJson(url:string):Promise<Story[]> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(url)
  const stories = await page.evaluate(() => {
    while (true) {
      const closedFolders = Array.from(document.querySelectorAll('button.sidebar-item')).filter(
        (btn) => btn.getAttribute('aria-expanded') !== 'true'
      )
      // @ts-ignore
      closedFolders.forEach((btn) => btn.click())
      if (closedFolders.length === 0) {
        break
      }
    }
    const folders = Array.from(document.querySelectorAll('button.sidebar-item')).map((btn) => [
      `${btn.id}-`,
      `${btn.textContent}`,
    ])
    folders.sort((a, b) => a[0].length - b[0].length)
    const stories:Story[] = Array.from(document.querySelectorAll('a.sidebar-item')).map((link) => {
      return {
        storyId: link.id,
        folder: folders.filter((f) => link.id.indexOf(f[0]) === 0).map((f) => f[1]),
        story: `${link.textContent}`,
      }
    })
    return stories
  })
  await browser.close()
  return stories
}
