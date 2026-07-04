import { test, expect } from '@playwright/test'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

test.describe('Selection-sync regression (stale AllSelection after toolbar action + click)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('select-all, bold, click to reposition, Enter, and type — both paragraphs must survive', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Hallo, das ist ein Test.')

    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()

    // Re-click inside the now-bold, still-selected text — this used to leave
    // ProseMirror's model selection stuck on the stale "select all" range.
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Zweiter Absatz.')

    await expect(editor).toContainText('Hallo, das ist ein Test.')
    await expect(editor).toContainText('Zweiter Absatz.')
    await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  })

  test('same regression inside a table cell (click between cells after formatting)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Zelle eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()

    await cells.nth(1).click()
    await page.keyboard.type('Zelle zwei')

    await expect(editor).toContainText('Zelle eins')
    await expect(editor).toContainText('Zelle zwei')
  })

  test('repeated select-all + bold + click cycles stay stable (stress check)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()

    for (let i = 1; i <= 4; i++) {
      await page.keyboard.type(`Absatz ${i}.`)
      await page.keyboard.press('ControlOrMeta+a')
      await page.getByTitle('Fett').click()
      await editor.click()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
    }
    await page.keyboard.type('Letzter Absatz.')

    for (let i = 1; i <= 4; i++) {
      await expect(editor).toContainText(`Absatz ${i}.`)
    }
    await expect(editor).toContainText('Letzter Absatz.')
    await expect(page.locator('.ProseMirror p')).toHaveCount(5)
  })
})
