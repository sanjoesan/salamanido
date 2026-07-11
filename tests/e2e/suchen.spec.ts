import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

// Suchen (specs/suchen-req.md): Strg+F/Toolbar-Lupe, Live-Treffer als flüchtige
// Decorations, Navigation mit Wrap, Optionen-Toggles, Fokus-Routing, dirty-/Undo-/
// Export-Neutralität und der Selection-Sync-Regressionsfall beim Schließen.

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
const editor = (page: Page) => page.locator('.ProseMirror')
const searchInput = (page: Page) => page.getByLabel('Suchbegriff')
const counter = (page: Page) => page.getByRole('search').getByRole('status')
const matches = (page: Page) => page.locator('.ProseMirror .search-match')
const activeMatch = (page: Page) => page.locator('.ProseMirror .search-match--active')

async function openEditor(page: Page) {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(editor(page)).toBeVisible()
  await editor(page).click()
}

test('Strg+F öffnet die Suche (keine Browser-Suche); Toolbar-Lupe öffnet dieselbe Leiste (§2 #1–#3)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('Haus am See, Haus im Wald')
  await page.keyboard.press('ControlOrMeta+f')
  await expect(searchInput(page)).toBeFocused()
  await searchInput(page).fill('Haus')
  await expect(matches(page)).toHaveCount(2)
  await expect(counter(page)).toHaveText('1 von 2')
  await page.getByTitle('Suche schließen').click()
  await expect(matches(page)).toHaveCount(0)

  await page.getByTitle('Suchen').click()
  await expect(searchInput(page)).toBeFocused()
})

test('Strg+F direkt nach dem Öffnen, OHNE vorher in den Editor zu klicken (§2 Fokus-Klarstellung)', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(editor(page)).toBeVisible()
  // KEIN editor.click() — Fokus liegt noch außerhalb des Editors
  await page.keyboard.press('ControlOrMeta+f')
  await expect(searchInput(page)).toBeFocused()
})

test('Fokus-Routing: Strg+B im Suchfeld formatiert NICHT das Dokument (§2 Testfall 4)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('unformatiert')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('abc')
  await page.keyboard.press('ControlOrMeta+b')
  await expect(searchInput(page)).toHaveValue('abc')
  await expect(editor(page).locator('strong')).toHaveCount(0)
})

test('erneutes Strg+F bei offener Leiste: Fokus ins Feld, Suchtext selektiert, Treffer bleiben (§2 Grenzfall)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('wort wort')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('wort')
  await expect(matches(page)).toHaveCount(2)
  await editor(page).click() // Fokus zurück ins Dokument… (Leiste bleibt offen)
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('ControlOrMeta+f')
  await expect(searchInput(page)).toBeFocused()
  await expect(matches(page)).toHaveCount(2)
  // Text ist selektiert → sofortiges Überschreiben ersetzt ihn komplett
  await page.keyboard.type('neu')
  await expect(searchInput(page)).toHaveValue('neu')
})

test('Navigation: Enter/Umschalt+Enter mit Umbruch; aktiver Treffer per Klasse abgesetzt (§4/§5)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('eins zwei eins drei eins')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('eins')
  await expect(counter(page)).toHaveText('1 von 3')
  await expect(activeMatch(page)).toHaveCount(1)
  await searchInput(page).press('Enter')
  await expect(counter(page)).toHaveText('2 von 3')
  await searchInput(page).press('Enter')
  await searchInput(page).press('Enter') // Wrap zum ersten
  await expect(counter(page)).toHaveText('1 von 3')
  await searchInput(page).press('Shift+Enter') // Wrap zurück zum letzten
  await expect(counter(page)).toHaveText('3 von 3')
})

test('Optionen: Groß-/Kleinschreibung und „Nur ganzes Wort" mit Umlaut-Grenze (§2 #7/#8, §3.2)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('Die Straße neben der Hauptstraße. STRASSE steht hier nicht.')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('straße')
  await expect(matches(page)).toHaveCount(2)

  const caseToggle = page.getByRole('button', { name: 'Groß-/Kleinschreibung beachten' })
  await caseToggle.click()
  await expect(caseToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(matches(page)).toHaveCount(1) // nur das kleingeschriebene "straße"... in "Hauptstraße"
  await caseToggle.click()

  const wordToggle = page.getByRole('button', { name: 'Nur ganzes Wort' })
  await wordToggle.click()
  await expect(matches(page)).toHaveCount(1) // „Straße" frei, nicht in „Hauptstraße"
  await expect(counter(page)).toHaveText('1 von 1')
})

test('leeres Feld → „–"; kein Treffer → „Keine Treffer" (§3.1)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('Inhalt')
  await page.keyboard.press('ControlOrMeta+f')
  await expect(counter(page)).toHaveText('–')
  await searchInput(page).fill('fehltbestimmt')
  await expect(counter(page)).toHaveText('Keine Treffer')
  await expect(matches(page)).toHaveCount(0)
})

test('Schließen setzt den Cursor an den aktiven Treffer — sofortiges Tippen ist sicher (§5 Testfall 5)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('Anfang Ziel Ende')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('Ziel')
  await expect(matches(page)).toHaveCount(1)
  await searchInput(page).press('Escape')
  await page.keyboard.type('X') // SOFORT, ohne Timing-Workaround
  await expect(editor(page)).toHaveText('Anfang ZielX Ende')
})

test('Live-Update bei Bearbeitung: Wort löschen reduziert die Trefferzahl ohne Fehler (§7)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('alpha beta alpha')
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('alpha')
  await expect(counter(page)).toHaveText('1 von 2')
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+End')
  for (let i = 0; i < ' alpha'.length; i++) await page.keyboard.press('Backspace')
  await expect(counter(page)).toHaveText(/von 1|1 von 1/)
  await expect(matches(page)).toHaveCount(1)
})

test('dirty-/Undo-/Export-Neutralität: die Suche hinterlässt keinerlei Spuren (§6)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('sauber bleiben')
  // Export setzt dirty zurück → Ausgangszustand „gespeichert"
  const fs = await import('node:fs/promises')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  await downloadPromise
  await expect(page.getByText('● ungespeichert')).toHaveCount(0)

  // komplette Such-Sitzung
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('sauber')
  await searchInput(page).press('Enter')
  await searchInput(page).press('Escape')

  // dirty blieb unangetastet …
  await expect(page.getByText('● ungespeichert')).toHaveCount(0)
  // … und Undo wirkt auf die TEXTEINGABE, nicht auf einen Such-Schritt
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor(page)).not.toContainText('sauber bleiben')

  await page.keyboard.press('ControlOrMeta+y')
  await expect(editor(page)).toContainText('sauber bleiben')

  // Export bei OFFENER Suche enthält keine Such-Hervorhebung (§6 Testfall 1)
  await page.keyboard.press('ControlOrMeta+f')
  await searchInput(page).fill('bleiben')
  await expect(matches(page)).toHaveCount(1)
  const downloadPromise2 = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise2
  const buffer = await fs.readFile((await download.path())!)
  const xml = await (await JSZip.loadAsync(buffer)).file('content.xml')!.async('text')
  expect(xml).not.toContain('search-match')
  expect(xml).not.toContain('background-color') // kein missbrauchter highlight-Mark
})
