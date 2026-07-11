import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

// Kopf-/Fußzeile bearbeiten, Scheibe A (kopfzeile-/fusszeile-bearbeiten-req.md §1/§3):
// Aktivieren über die gemeinsamen Toolbar-Toggles, eigener editierbarer Bereich im
// Seitenrand, Toolbar-Kontextbindung an die fokussierte Instanz, eigene Undo-Historie,
// Entfernen mit Bestätigung, Rundreisen DOCX (header1/footer1.xml) und ODT (styles.xml).

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const bodyEditor = (page: Page) => page.locator('.word-editor-surface .ProseMirror')
const headerEditor = (page: Page) => page.getByTestId('header-editor').locator('.ProseMirror')
const footerEditor = (page: Page) => page.getByTestId('footer-editor').locator('.ProseMirror')
const headerButton = (page: Page) => page.getByRole('button', { name: 'Kopfzeile', exact: true })
const footerButton = (page: Page) => page.getByRole('button', { name: 'Fußzeile', exact: true })

async function openEditor(page: Page, card: (p: Page) => ReturnType<typeof odtCard> = odtCard) {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await card(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(bodyEditor(page)).toBeVisible()
  await bodyEditor(page).click()
}

async function exportBytes(page: Page): Promise<Buffer> {
  const fs = await import('node:fs/promises')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  return fs.readFile((await (await downloadPromise).path())!)
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
  await expect(bodyEditor(page)).toBeVisible()
}

test('Kopfzeile aktivieren: Bereich mit Label erscheint, ist fokussiert und beschreibbar (§1 #1/#3)', async ({
  page,
}) => {
  await openEditor(page)
  await expect(headerButton(page)).toHaveAttribute('aria-pressed', 'false')
  await headerButton(page).click()
  await expect(headerButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('header-editor')).toContainText('Kopfzeile') // Label
  await page.keyboard.type('Briefkopf')
  await expect(headerEditor(page)).toHaveText('Briefkopf')
  await expect(bodyEditor(page)).not.toContainText('Briefkopf') // NUR die Kopfzeile
})

test('Toolbar bindet an die fokussierte Instanz: Fett wirkt in der Kopfzeile, nicht im Body (§1 #6)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('Haupttext')
  await headerButton(page).click()
  await page.keyboard.type('Kopftext')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await expect(headerEditor(page).locator('strong')).toHaveText('Kopftext')
  await expect(bodyEditor(page).locator('strong')).toHaveCount(0)
  // Seitenumbruch ist ein Body-Konzept → im Kopfzeilen-Kontext deaktiviert
  await expect(page.getByRole('button', { name: 'Seitenumbruch einfügen' })).toBeDisabled()
})

test('eigene Undo-Historie: Strg+Z in der Kopfzeile wirkt dort, Body bleibt unberührt', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('Bodyinhalt')
  await headerButton(page).click()
  await page.keyboard.type('Kopfinhalt')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(headerEditor(page)).not.toContainText('Kopfinhalt')
  await expect(bodyEditor(page)).toContainText('Bodyinhalt')
})

test('Klick zurück in den Haupttext: Tippen landet wieder im Body (§1 #4)', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('Anfang')
  await headerButton(page).click()
  await page.keyboard.type('Kopf')
  await bodyEditor(page).click()
  await page.keyboard.type('X')
  await expect(bodyEditor(page)).toContainText('AnfangX')
  await expect(headerEditor(page)).toHaveText('Kopf')
})

test('Entfernen mit Bestätigung: nicht-leere Fußzeile fragt nach und verschwindet (§1 #5)', async ({ page }) => {
  await openEditor(page)
  await footerButton(page).click()
  await page.keyboard.type('Seitenfuß')
  await expect(footerEditor(page)).toHaveText('Seitenfuß')
  await footerButton(page).click() // dialog-Handler akzeptiert das confirm
  await expect(page.getByTestId('footer-editor')).toHaveCount(0)
  await expect(footerButton(page)).toHaveAttribute('aria-pressed', 'false')
})

// Seitengeometrie wie src/formats/shared/editor/pageLayout.ts (A4 bei 96 dpi, gerundet)
const PAGE = { width: 794, height: 1123, margin: 94, separator: 32 }

/** Doppelklick in das obere/untere Randband der Seite `pageIndex` (zoom-bereinigt).
 *  `edge` steuert die Tiefe im Band: 0.5 = Bandmitte, 0.15 = nahe der Seitenkante
 *  (AUSSERHALB eines bereits gemounteten editierbaren Bereichs). */
async function dblclickMargin(page: Page, band: 'top' | 'bottom', edge = 0.5, pageIndex = 0) {
  let box = (await page.getByTestId('page-sheet').boundingBox())!
  const scale = box.width / PAGE.width
  const pageTop = pageIndex * (PAGE.height + PAGE.separator)
  const y =
    band === 'top' ? pageTop + PAGE.margin * edge : pageTop + PAGE.height - PAGE.margin * edge
  // Zielpunkt sichtbar scrollen (Mobile/Tablet: eine Seite ist höher als der Viewport;
  // mouse.dblclick arbeitet mit Viewport-Koordinaten)
  await page.evaluate((yScaled) => {
    const sheet = document.querySelector('[data-testid="page-sheet"]') as HTMLElement
    const scroller = sheet.closest('.overflow-auto') as HTMLElement
    const sheetTop =
      sheet.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTop = Math.max(0, sheetTop + yScaled - scroller.clientHeight / 2)
  }, y * scale)
  box = (await page.getByTestId('page-sheet').boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + y * scale)
}

test('Doppelklick in den oberen Seitenrand aktiviert die Kopfzeile und fokussiert sie (§1 #2)', async ({
  page,
}) => {
  await openEditor(page)
  await expect(headerButton(page)).toHaveAttribute('aria-pressed', 'false')
  await dblclickMargin(page, 'top')
  await expect(headerButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.type('Per Doppelklick')
  await expect(headerEditor(page)).toHaveText('Per Doppelklick')
})

test('Doppelklick in den unteren Seitenrand aktiviert die Fußzeile (§1 #2)', async ({ page }) => {
  await openEditor(page)
  await dblclickMargin(page, 'bottom')
  await expect(footerButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.type('Fuß per Doppelklick')
  await expect(footerEditor(page)).toHaveText('Fuß per Doppelklick')
})

test('Doppelklick bei AKTIVER Kopfzeile fokussiert sie nur — kein Entfernen, Inhalt bleibt (§1 #2)', async ({
  page,
}) => {
  await openEditor(page)
  await headerButton(page).click()
  await page.keyboard.type('Bestand')
  await bodyEditor(page).click()
  await page.keyboard.type('Haupttext')
  // nahe der Seitenkante klicken — oberhalb des gemounteten Kopfzeilen-Bereichs
  await dblclickMargin(page, 'top', 0.15)
  await page.keyboard.type(' bleibt')
  await expect(headerEditor(page)).toHaveText('Bestand bleibt')
  await expect(bodyEditor(page)).toContainText('Haupttext')
})

test('Folgeseiten-Kopien: Kopf-/Fußzeile erscheint auf Seite 2 und folgt Änderungen live (§4 Option a, Stufe 2)', async ({
  page,
}) => {
  await openEditor(page)
  await headerButton(page).click()
  await page.keyboard.type('Briefkopf')
  await footerButton(page).click()
  await page.keyboard.type('Fußtext')
  // Einseitiges Dokument: nur die editierbaren Bereiche, KEINE Kopien
  await expect(page.getByTestId('header-copy')).toHaveCount(0)
  await expect(page.getByTestId('footer-copy')).toHaveCount(0)

  await bodyEditor(page).click()
  await page.getByRole('button', { name: 'Seitenumbruch einfügen' }).click()

  // Zweiseitig: je EINE Kopie mit demselben Inhalt, deutlich unterhalb des Originals
  await expect(page.getByTestId('header-copy')).toHaveText('Briefkopf')
  await expect(page.getByTestId('footer-copy')).toHaveText('Fußtext')
  const editableBox = await page.getByTestId('header-editor').boundingBox()
  const copyBox = await page.getByTestId('header-copy').boundingBox()
  expect(copyBox!.y).toBeGreaterThan(editableBox!.y + 300) // Seite-2-Band, nicht Seite 1

  // Kopie folgt Änderungen live aus dem EINEN editierbaren Bereich
  await headerEditor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Neuer Kopf')
  await expect(page.getByTestId('header-copy')).toHaveText('Neuer Kopf')

  // Seitenumbruch rückgängig → wieder einseitig → Kopien verschwinden
  await bodyEditor(page).click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByTestId('header-copy')).toHaveCount(0)
})

test('Logo-Bild in der Kopfzeile: Export mit Part-eigenen Rels, Reimport zeigt das Bild (§0.A/1)', async ({
  page,
}) => {
  const TINY_PNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  await openEditor(page, docxCard)
  await headerButton(page).click()
  // Erst wenn die neue Kopfzeilen-View fokussiert ist, ist die Toolbar an sie gebunden —
  // setInputFiles feuert sonst gelegentlich vor dem Mount-Effekt und das Bild landet im Body
  // (für Menschen unerreichbares Mikrosekunden-Fenster, unter Testlast reproduzierbar).
  await expect(headerEditor(page)).toBeFocused()
  await page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG, 'base64'),
  })
  await expect(headerEditor(page).locator('img')).toHaveCount(1)
  await expect(bodyEditor(page).locator('img')).toHaveCount(0) // NUR die Kopfzeile

  const buffer = await exportBytes(page)
  const zip = await JSZip.loadAsync(buffer)
  expect(await zip.file('word/_rels/header1.xml.rels')!.async('text')).toContain('media/')

  await reimport(page, docxCard, 'logo.docx', DOCX_MIME, buffer)
  await expect(headerEditor(page).locator('img')).toHaveCount(1)
})

for (const fmt of ['docx', 'odt'] as const) {
  test(`Rundreise ${fmt.toUpperCase()}: Kopf- und Fußzeilen-Inhalt übersteht Export → Reimport (§6)`, async ({
    page,
  }) => {
    const card = fmt === 'docx' ? docxCard : odtCard
    await openEditor(page, card)
    await page.keyboard.type('Haupttext bleibt')
    await headerButton(page).click()
    await page.keyboard.type('Kopfzeilentext')
    await footerButton(page).click()
    await page.keyboard.type('Fußzeilentext')

    const buffer = await exportBytes(page)
    const zip = await JSZip.loadAsync(buffer)
    if (fmt === 'docx') {
      expect(await zip.file('word/header1.xml')!.async('text')).toContain('Kopfzeilentext')
      expect(await zip.file('word/footer1.xml')!.async('text')).toContain('Fußzeilentext')
    } else {
      const styles = await zip.file('styles.xml')!.async('text')
      expect(styles).toContain('Kopfzeilentext')
      expect(styles).toContain('Fußzeilentext')
    }

    await reimport(page, card, `hf.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
    await expect(headerEditor(page)).toHaveText('Kopfzeilentext')
    await expect(footerEditor(page)).toHaveText('Fußzeilentext')
    await expect(bodyEditor(page)).toContainText('Haupttext bleibt')
  })
}
