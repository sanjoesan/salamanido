import { test as base, expect, type Page } from '@playwright/test'

/**
 * Shared Playwright test fixture for the "Datei öffnen/importieren" QA suite
 * (see specs/datei-oeffnen-qa.md Abschnitt 1). Every new spec file in this suite uses
 * this instead of `@playwright/test` directly so that:
 *  - the privacy banner is already dismissed and the app is on '/' before the test body runs;
 *  - every `pageerror`/console-error is collected from the start of the test and can be
 *    asserted to be empty at the end (§1 Punkt 4 — "kein Absturz" proof);
 *  - every outgoing network request is collected so a test can assert "no network calls
 *    beyond the app's own origin" (§1 Punkt 5 — proof of fully-local import).
 */
export const test = base.extend<{
  errors: string[]
  requests: string[]
}>({
  errors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await use(errors)
  },
  requests: async ({ page }, use) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    await use(requests)
  },
  page: async ({ page }, use) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await use(page)
  },
})

export { expect }

export function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

export function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Asserts that none of the collected request URLs left the app's own local origin. */
export function assertNoExternalRequests(requests: string[], baseUrl: string) {
  const external = requests.filter((u) => !u.startsWith(baseUrl) && !u.startsWith('http://localhost:4173'))
  expect(external, `unexpected external requests: ${external.join(', ')}`).toEqual([])
}
