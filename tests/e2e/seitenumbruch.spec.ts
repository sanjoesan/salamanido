import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { insertTableViaDialog } from './fixtures/table-helpers'

// Seitenumbruch einfügen (specs/seitenumbruch-req.md §6.5–§6.8): Toolbar-Button mit
// SVG-Icon + zugänglichem Namen, Strg/Cmd+Enter, sichtbare + per DOM-Attribut prüfbare
// Kennzeichnung (manuell ≠ automatisch), Selection-Sync-Regression (nach dem Einfügen
// tippen), Undo/Redo, Löschen, Tabellen-/Listen-Fallback mit sichtbarer Meldung und die
// §5.2-Rundreisen (DOCX + ODT über echten Download/Re-Upload). Läuft auf Desktop Chrome,
// Mobile und Tablet.

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const editor = (page: Page) => page.locator('.ProseMirror')
const marker = (page: Page) => page.locator('.ProseMirror div[data-page-break]')
const breakButton = (page: Page) => page.getByRole('button', { name: 'Seitenumbruch einfügen' })

async function openEditor(page: Page, card: (p: Page) => ReturnType<typeof odtCard> = odtCard) {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await card(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(editor(page)).toBeVisible()
  await editor(page).click()
}

async function exportBytes(page: Page): Promise<Buffer> {
  const fs = await import('node:fs/promises')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  return fs.readFile((await download.path())!)
}

async function reimport(
  page: Page,
  card: (p: Page) => ReturnType<typeof odtCard>,
  name: string,
  mimeType: string,
  buffer: Buffer,
) {
  await page.getByRole('button', { name: /formate/i }).click()
  await card(page).locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })
  await expect(editor(page)).toBeVisible()
}

test('Toolbar-Button: Umbruch einfügen → sichtbarer Marker, Tippen landet auf der neuen Seite (§6.5/§6.6)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('Seite eins')
  await breakButton(page).click()
  await expect(marker(page)).toHaveCount(1)
  await expect(marker(page)).toBeVisible()
  // Selection-Sync-Regression (§6.6): direkt nach dem Einfügen tippen — nichts wird
  // gelöscht/ersetzt, der Text landet NACH dem Umbruch
  await page.keyboard.type('Seite zwei')
  await expect(editor(page).locator('p').first()).toHaveText('Seite eins')
  await expect(editor(page).locator('p').last()).toHaveText('Seite zwei')
  // der manuelle Umbruch erzeugt den unterscheidbaren Seiten-Spacer (§6.7)
  await expect(page.locator('.page-break-spacer--manual')).toHaveCount(1)
})

test('Strg/Cmd+Enter fügt denselben Umbruch ein (§1.2)', async ({ page }, testInfo) => {
  // Strg+Enter ist ein Shortcut für physische Tastaturen; auf dem Android-emulierten
  // Mobile-Projekt liefert Chromium Enter über den IME-/beforeinput-Pfad ohne Modifier
  // aus, sodass der synthetische Strg+Enter nie als solcher ankommt (Emulations-
  // Artefakt — echte Mobilgeräte haben gar keine Strg-Taste; der Toolbar-Button deckt
  // Mobile ab und ist dort getestet). Tablet (WebKit) und Desktop prüfen den Shortcut.
  test.skip(testInfo.project.name === 'Mobile', 'Strg+Enter: Android-Chromium-Emulationsartefakt, s. Kommentar')
  await openEditor(page)
  await page.keyboard.type('erste')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(marker(page)).toHaveCount(1)
  await page.keyboard.type('zweite')
  await expect(editor(page).locator('p').last()).toHaveText('zweite')
})

test('manueller Umbruch ist vom automatischen unterscheidbar (§1.3/§6.7)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('kurz')
  await breakButton(page).click()
  await page.keyboard.type('danach')
  // manuell: Spacer trägt die --manual-Klasse UND der Node-Marker existiert
  await expect(page.locator('.page-break-spacer--manual')).toHaveCount(1)
  await expect(marker(page)).toHaveCount(1)
  // Blatt ist jetzt zwei volle Seiten hoch (Zusammenspiel mit B4-Mindesthöhe, §3.8)
  const sheet = page.getByTestId('page-sheet')
  const box = (await sheet.boundingBox())!
  const zoom = box.width / 794 // PAGE_WIDTH_PX
  expect(box.height).toBeGreaterThanOrEqual((2 * 1123 + 32) * zoom - 3)
})

test('Undo entfernt den Umbruch in EINEM Schritt, Redo stellt ihn wieder her (§3.9)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('text')
  await breakButton(page).click()
  await expect(marker(page)).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(marker(page)).toHaveCount(0)
  await expect(editor(page)).toContainText('text')
  await page.keyboard.press('ControlOrMeta+y')
  await expect(marker(page)).toHaveCount(1)
})

test('Umbruch per Klick selektieren und mit Entf löschen — Inhalt fließt zurück (§1.4)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('eins')
  await breakButton(page).click()
  await page.keyboard.type('zwei')
  await marker(page).click()
  await expect(marker(page)).toHaveClass(/ProseMirror-selectednode/)
  await page.keyboard.press('Delete')
  await expect(marker(page)).toHaveCount(0)
  await expect(editor(page)).toContainText('eins')
  await expect(editor(page)).toContainText('zwei')
  // Löschen ist EIN Undo-Schritt
  await page.keyboard.press('ControlOrMeta+z')
  await expect(marker(page)).toHaveCount(1)
})

test('in einer Tabellenzelle: Zeilenumbruch statt Seitenumbruch + sichtbare Meldung (Grenzfall 4, §3.10)', async ({
  page,
}) => {
  await openEditor(page)
  await insertTableViaDialog(page, 2, 2)
  await page.locator('.ProseMirror td').first().click()
  await page.keyboard.type('zelle')
  await breakButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: 'Seitenumbruch' })).toBeVisible()
  await expect(marker(page)).toHaveCount(0)
  // leere Zellen rendern PM-trailing-Breaks — nur der ECHTE Zeilenumbruch zählt
  await expect(page.locator('.ProseMirror td br:not(.ProseMirror-trailingBreak)')).toHaveCount(1)
  await expect(page.locator('.ProseMirror table')).toHaveCount(1) // Struktur unversehrt
})

test('in einem Listenpunkt: Fallback + Meldung, Liste bleibt intakt (Grenzfall 5)', async ({ page }) => {
  await openEditor(page)
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('punkt')
  await breakButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: 'Seitenumbruch' })).toBeVisible()
  await expect(marker(page)).toHaveCount(0)
  await expect(editor(page).locator('ul li')).toHaveCount(1)
})

test('Umbruch am Dokumentende erzeugt eine neue, beschreibbare leere Seite (Grenzfall 2)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('ende')
  await breakButton(page).click()
  await expect(marker(page)).toHaveCount(1)
  // Cursor steht auf der neuen Seite — direkt tippen
  await page.keyboard.type('neu')
  await expect(editor(page).locator('p').last()).toHaveText('neu')
})

for (const fmt of ['docx', 'odt'] as const) {
  test(`Rundreise ${fmt.toUpperCase()}: Umbruch übersteht Export → Reimport an derselben Stelle (§5.2)`, async ({
    page,
  }) => {
    const card = fmt === 'docx' ? docxCard : odtCard
    await openEditor(page, card)
    await page.keyboard.type('vorher')
    await breakButton(page).click()
    await page.keyboard.type('nachher')
    const buffer = await exportBytes(page)

    // Roh-XML-Beleg (§3.4/§3.6): DOCX = <w:br w:type="page"/>, ODT = fo:break-before
    const zip = await JSZip.loadAsync(buffer)
    if (fmt === 'docx') {
      const xml = await zip.file('word/document.xml')!.async('text')
      expect(xml).toContain('<w:br w:type="page"/>')
      expect(xml).not.toContain('lastRenderedPageBreak')
    } else {
      const xml = await zip.file('content.xml')!.async('text')
      expect(xml).toContain('fo:break-before="page"')
    }

    await reimport(page, card, `umbruch.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
    await expect(marker(page)).toHaveCount(1)
    await expect(editor(page).locator('p').first()).toHaveText('vorher')
    await expect(editor(page).locator('p').last()).toHaveText('nachher')
    // kein degradierter Zeilenumbruch (§3.11)
    await expect(editor(page).locator('p br')).toHaveCount(0)
  })
}

test('Baseline-Rundreise: Datei OHNE manuellen Umbruch bekommt durch Reimport keinen (§5.1)', async ({ page }) => {
  await openEditor(page, docxCard)
  await page.keyboard.type('nur Text, kein Umbruch')
  const buffer = await exportBytes(page)
  await reimport(page, docxCard, 'plain.docx', DOCX_MIME, buffer)
  await expect(marker(page)).toHaveCount(0)
  await expect(editor(page)).toContainText('nur Text, kein Umbruch')
})
