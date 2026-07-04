import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, docxCard, odtCard } from './fixtures'
import { DOCX_MIME, ODT_MIME } from './fixtures/builders'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DOCX = join(__dirname, '../fixtures/external/docx')
const FIXTURES_ODT = join(__dirname, '../fixtures/external/odt')

// Resolves specs/datei-oeffnen-code.md §8.1 / specs/datei-oeffnen-qa.md Abschnitt 3.4:
// measures actual import time for the two large real-world fixtures referenced (but,
// before this file existed, only referenced in a comment with no test backing it) from
// src/formats/{docx,odt}/__tests__/external-fixtures.test.ts's SKIP_SLOW_UNDER_JSDOM notes.
test.setTimeout(60_000)

test('§2.1.6/§3.6 [DOCX]: bug65649.docx imports within a realistic time budget, no tab freeze', async ({ page }) => {
  const buffer = readFileSync(join(FIXTURES_DOCX, 'bug65649.docx'))
  // eslint-disable-next-line no-console
  console.log(`bug65649.docx size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

  const input = docxCard(page).locator('input[type="file"]')
  const start = Date.now()
  await input.setInputFiles({ name: 'bug65649.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.ProseMirror p').first()).toBeVisible()
  const elapsedMs = Date.now() - start
  // eslint-disable-next-line no-console
  console.log(`bug65649.docx import time: ${elapsedMs} ms`)

  // Tab-not-frozen proof: the main thread must still respond to a trivial evaluate call
  // right after import.
  await expect.poll(() => page.evaluate(() => document.title)).toBeTruthy()

  // Hard reality ceiling (see specs/datei-oeffnen-qa.md Abschnitt 6.2) — not the informal
  // 3s guideline, which is checked manually/informationally against the logged value above.
  expect(elapsedMs).toBeLessThan(15_000)
})

test('§2.1.6/§3.6 [ODT]: brokenList.odt (2.4 MB, ~20k automatic styles) imports within a realistic time budget, no tab freeze', async ({
  page,
}) => {
  const buffer = readFileSync(join(FIXTURES_ODT, 'brokenList.odt'))
  // eslint-disable-next-line no-console
  console.log(`brokenList.odt size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

  const input = odtCard(page).locator('input[type="file"]')
  const start = Date.now()
  await input.setInputFiles({ name: 'brokenList.odt', mimeType: ODT_MIME, buffer })
  await expect(page.locator('.ProseMirror').or(page.getByRole('alert'))).toBeVisible({ timeout: 30_000 })
  const elapsedMs = Date.now() - start
  // eslint-disable-next-line no-console
  console.log(`brokenList.odt import time: ${elapsedMs} ms`)

  await expect.poll(() => page.evaluate(() => document.title)).toBeTruthy()
  expect(elapsedMs).toBeLessThan(15_000)
})
