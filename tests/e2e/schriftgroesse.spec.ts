import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

// Schriftgröße wählen (specs/schriftgroesse-waehlen-req.md): Combobox setzt/zeigt die
// EFFEKTIVE Größe (Mark → Überschriften-Vorlage → 11-pt-Anzeige-Standard), Schreibmarken-
// Semantik, sichtbare 0,5er-Rundung, „—" nur bei echt gemischter Selektion, Rundreisen.

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const editor = (page: Page) => page.locator('.ProseMirror')
const sizeField = (page: Page) => page.getByLabel('Schriftgröße')

async function openEditor(page: Page, card: (p: Page) => ReturnType<typeof odtCard> = odtCard) {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await card(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(editor(page)).toBeVisible()
  await editor(page).click()
}

async function setSize(page: Page, value: string) {
  await sizeField(page).fill(value)
  await sizeField(page).press('Enter')
}

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

test('Grundfall §2.1: Selektion bekommt die gewählte Größe, sichtbar im Editor', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'großer Text', 'großer Text'.length)
  await setSize(page, '18')
  const sized = editor(page).locator('span[style*="font-size"]')
  await expect(sized).toHaveText('großer Text')
  await expect(sized).toHaveCSS('font-size', '24px') // 18pt = 24px bei 96dpi
  await expect(sizeField(page)).toHaveValue('18')
})

test('Anzeige §1 #4: Fließtext zeigt 11 (Standard), Überschrift ihre Vorlagen-Größe, Mark gewinnt (§2.4)', async ({
  page,
}) => {
  await openEditor(page)
  await page.keyboard.type('normal')
  await expect(sizeField(page)).toHaveValue('11')

  await page.selectOption('select[aria-label="Absatzformat"]', '2') // Überschrift 2
  await editor(page).click()
  await expect(sizeField(page)).toHaveValue('20')

  await page.keyboard.press('ControlOrMeta+a')
  await setSize(page, '9')
  await expect(sizeField(page)).toHaveValue('9')
  await expect(editor(page).locator('h2 span[style*="font-size"]')).toHaveCSS('font-size', '12px') // 9pt
})

test('Schreibmarke §2.2: Größe ohne Selektion wählen → nur neu getippter Text ist betroffen', async ({ page }) => {
  await openEditor(page)
  await page.keyboard.type('davor ')
  await setSize(page, '24')
  await page.keyboard.type('groß')
  const sized = editor(page).locator('span[style*="font-size"]')
  await expect(sized).toHaveText('groß')
  await expect(editor(page)).toContainText('davor groß')
})

test('Rundung §2.5: 13,3 wird sichtbar zu 13,5 korrigiert', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'runden', 6)
  await setSize(page, '13,3')
  await expect(sizeField(page)).toHaveValue('13,5')
  await expect(editor(page).locator('span[style*="font-size"]')).toHaveCSS('font-size', '18px') // 13.5pt
})

test('gemischt §2.3: Feld zeigt leeren Platzhalter, neue Eingabe vereinheitlicht die Selektion', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'zwei Größen', 6)
  await setSize(page, '20')
  await page.keyboard.press('ControlOrMeta+a')
  await expect(sizeField(page)).toHaveValue('')
  await setSize(page, '14')
  await expect(sizeField(page)).toHaveValue('14')
  await expect(editor(page).locator('span[style*="font-size"]').first()).toHaveCSS('font-size', /18.6/)
})

test('Escape verwirft den Entwurf ohne anzuwenden (§1 #3)', async ({ page }) => {
  await openEditor(page)
  await typeAndSelect(page, 'unverändert', 5)
  await sizeField(page).fill('72')
  await sizeField(page).press('Escape')
  await expect(sizeField(page)).toHaveValue('11')
  await expect(editor(page).locator('span[style*="font-size"]')).toHaveCount(0)
})

for (const fmt of ['docx', 'odt'] as const) {
  test(`Rundreise ${fmt.toUpperCase()} §5: gesetzte Größe übersteht Export → Reimport exakt`, async ({ page }) => {
    const card = fmt === 'docx' ? docxCard : odtCard
    await openEditor(page, card)
    await page.keyboard.type('vor ')
    await typeAndSelect(page, 'groß', 4)
    await setSize(page, '10,5')
    const buffer = await exportBytes(page)

    const zip = await JSZip.loadAsync(buffer)
    if (fmt === 'docx') {
      const xml = await zip.file('word/document.xml')!.async('text')
      expect(xml).toContain('<w:sz w:val="21"/>') // 10,5 pt = 21 halbe Punkte
    } else {
      const xml = await zip.file('content.xml')!.async('text')
      expect(xml).toContain('fo:font-size="10.5pt"')
    }

    await reimport(page, card, `groesse.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
    const sized = editor(page).locator('span[style*="font-size"]')
    await expect(sized).toHaveText('groß')
    await sized.click()
    await expect(sizeField(page)).toHaveValue('10,5')
  })
}
