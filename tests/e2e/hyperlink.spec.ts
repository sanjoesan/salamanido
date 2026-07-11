import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

// Hyperlink einfügen/bearbeiten/entfernen (specs/hyperlink-einfuegen-req.md §1/§3):
// Dialog-Flow über Button und Strg+K, URL-Normalisierung und -Ablehnung mit sichtbarer
// Meldung, Bearbeiten mit Vorbefüllung über den ganzen Mark-Bereich, Entfernen ohne
// Textverlust, Anzeigetext bei leerem Cursor, Strg/Cmd+Klick öffnet neuen Tab,
// Undo/Redo, Rundreisen (DOCX + ODT) über echten Download/Re-Upload.

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const editor = (page: Page) => page.locator('.ProseMirror')
const linkButton = (page: Page) => page.getByRole('button', { name: 'Link einfügen' })
const urlField = (page: Page) => page.getByLabel('Ziel-Adresse')

async function openEditor(page: Page, card: (p: Page) => ReturnType<typeof odtCard> = odtCard) {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await card(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(editor(page)).toBeVisible()
  await editor(page).click()
}

/** Tippt Text und selektiert die letzten `count` Zeichen. delay wie in cut.spec.ts:
 * schnelle synthetische Shift+Pfeil-Folgen direkt vor einem Shortcut verlieren sonst
 * die letzten Selektionsschritte (native-selection-Flush-Latenz). */
async function typeAndSelect(page: Page, text: string, count: number) {
  await page.keyboard.type(text)
  for (let i = 0; i < count; i++) await page.keyboard.press('Shift+ArrowLeft', { delay: 20 })
  await page.waitForTimeout(50)
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
  await expect(editor(page)).toBeVisible()
}

test('Grundfall §3.1: Selektion verlinken über den Toolbar-Button — sichtbar blau, Tooltip, aria-pressed', async ({
  page,
}) => {
  await openEditor(page)
  await typeAndSelect(page, 'siehe Beispielseite', 'Beispielseite'.length)
  await linkButton(page).click()
  await urlField(page).fill('https://example.test/pfad')
  await page.getByRole('button', { name: 'Übernehmen' }).click()

  const anchor = editor(page).locator('a[href="https://example.test/pfad"]')
  await expect(anchor).toHaveText('Beispielseite')
  await expect(anchor).toHaveAttribute('title', 'https://example.test/pfad') // §1 #8
  await expect(anchor).toHaveCSS('color', 'rgb(5, 99, 193)') // §3.6 blau
  await expect(anchor).toHaveCSS('text-decoration-line', 'underline')
  // Cursor steht nach dem Verlinken im Link → Button zeigt aktiv (§1 #7)
  await expect(linkButton(page)).toHaveAttribute('aria-pressed', 'true')
})

test('Strg/Cmd+K öffnet denselben Dialog (§1 #2)', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'Text', 4)
  await page.keyboard.press('ControlOrMeta+k')
  await expect(page.getByRole('dialog', { name: 'Link einfügen' })).toBeVisible()
  await urlField(page).fill('beispiel.de')
  await page.keyboard.press('Enter')
  // URL ohne Schema → https:// vorangestellt (§3.3)
  await expect(editor(page).locator('a[href="https://beispiel.de"]')).toHaveText('Text')
})

test('javascript:-URL wird mit sichtbarer Meldung abgelehnt — kein Link entsteht (§3.3/Grenzfall 4.9)', async ({
  page,
}) => {
  await openEditor(page)
  await typeAndSelect(page, 'gefährlich', 10)
  await linkButton(page).click()
  await urlField(page).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(page.getByRole('alert')).toContainText('Sicherheitsgründen')
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(editor(page).locator('a')).toHaveCount(0)
})

test('Bearbeiten §3.4: Cursor im Link ohne Selektion → Dialog vorbefüllt, neue URL gilt für den GANZEN Link', async ({
  page,
}) => {
  await openEditor(page)
  await typeAndSelect(page, 'ganzer Linktext', 'ganzer Linktext'.length)
  await linkButton(page).click()
  await urlField(page).fill('https://alt.test/')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  // Cursor mitten in den Link setzen (ohne Selektion)
  await editor(page).locator('a').click()
  await page.keyboard.press('ControlOrMeta+k')
  const dialog = page.getByRole('dialog', { name: 'Link bearbeiten' })
  await expect(dialog).toBeVisible()
  await expect(urlField(page)).toHaveValue('https://alt.test/') // §1 #4 Vorbefüllung
  await urlField(page).fill('https://neu.test/')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(editor(page).locator('a[href="https://neu.test/"]')).toHaveText('ganzer Linktext')
  await expect(editor(page).locator('a[href="https://alt.test/"]')).toHaveCount(0)
})

test('Entfernen §3.5: „Link entfernen" im Dialog — Text und übrige Formatierung bleiben', async ({ page }) => {
  await openEditor(page)
  await page.getByTitle('Fett').click()
  await typeAndSelect(page, 'fetter Link', 'fetter Link'.length)
  await linkButton(page).click()
  await urlField(page).fill('https://x.test/')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(editor(page).locator('a')).toHaveCount(1)

  await editor(page).locator('a').click()
  await linkButton(page).click()
  await page.getByRole('button', { name: 'Link entfernen' }).click()
  await expect(editor(page).locator('a')).toHaveCount(0)
  await expect(editor(page).locator('strong')).toHaveText('fetter Link') // Fett bleibt (§3.5)
})

test('leerer Cursor §3.2b: Anzeigetext-Feld fügt bereits verlinkten Text ein', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('davor ')
  await linkButton(page).click()
  await urlField(page).fill('https://x.test/')
  await page.getByLabel('Anzeigetext').fill('Klick mich')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(editor(page)).toContainText('davor Klick mich')
  await expect(editor(page).locator('a')).toHaveText('Klick mich')
})

test('Escape/Abbrechen ändern nichts (§3.3)', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'unverändert', 5)
  await linkButton(page).click()
  await urlField(page).fill('https://x.test/')
  await page.keyboard.press('Escape')
  await expect(editor(page).locator('a')).toHaveCount(0)
  await expect(editor(page)).toHaveText('unverändert')
})

test('Undo/Redo §3.11: Verlinken ist EIN Schritt', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'rückgängig', 10)
  await linkButton(page).click()
  await urlField(page).fill('https://x.test/')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(editor(page).locator('a')).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor(page).locator('a')).toHaveCount(0)
  await expect(editor(page)).toHaveText('rückgängig')
  await page.keyboard.press('ControlOrMeta+y')
  await expect(editor(page).locator('a[href="https://x.test/"]')).toHaveCount(1)
})

test('Strg/Cmd+Klick öffnet das Ziel in einem neuen Tab (§3.9)', async ({ page, context }) => {
  // die Test-Domain existiert nicht — beantworte sie, damit der neue Tab seine Ziel-URL
  // behält statt auf einer Browser-Fehlerseite zu landen
  await context.route('https://example.test/**', (route) =>
    route.fulfill({ body: '<html>ok</html>', contentType: 'text/html' }),
  )
  await openEditor(page)
  await typeAndSelect(page, 'öffne mich', 10)
  await linkButton(page).click()
  await urlField(page).fill('https://example.test/ziel')
  await page.getByRole('button', { name: 'Übernehmen' }).click()

  const popupPromise = context.waitForEvent('page')
  await editor(page).locator('a').click({ modifiers: ['ControlOrMeta'] })
  const popup = await popupPromise
  expect(popup.url()).toBe('https://example.test/ziel')
  await popup.close()
})

for (const fmt of ['docx', 'odt'] as const) {
  test(`Rundreise ${fmt.toUpperCase()}: über die UI gesetzter Link übersteht Export → Reimport (§3.12–§3.15)`, async ({
    page,
  }) => {
    const card = fmt === 'docx' ? docxCard : odtCard
    await openEditor(page, card)
    await page.keyboard.type('vor ')
    await typeAndSelect(page, 'Linktext', 'Linktext'.length)
    await linkButton(page).click()
    await urlField(page).fill('https://example.test/?a=1&b=2')
    await page.getByRole('button', { name: 'Übernehmen' }).click()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.type(' nach')

    const buffer = await exportBytes(page)
    const zip = await JSZip.loadAsync(buffer)
    if (fmt === 'docx') {
      const xml = await zip.file('word/document.xml')!.async('text')
      expect(xml).toContain('<w:hyperlink r:id=')
      const rels = await zip.file('word/_rels/document.xml.rels')!.async('text')
      expect(rels).toContain('Target="https://example.test/?a=1&amp;b=2" TargetMode="External"')
    } else {
      const xml = await zip.file('content.xml')!.async('text')
      expect(xml).toContain('xlink:href="https://example.test/?a=1&amp;b=2"')
    }

    await reimport(page, card, `link.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
    const anchor = editor(page).locator('a[href="https://example.test/?a=1&b=2"]')
    await expect(anchor).toHaveText('Linktext')
    await expect(editor(page)).toContainText('vor Linktext nach')
    // Umgebung bleibt unverlinkt
    await expect(editor(page).locator('a')).toHaveCount(1)
  })
}
