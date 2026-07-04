import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

/**
 * QA supplement to tests/e2e/new-document.spec.ts — closes gaps against
 * specs/neues-dokument-qa.md Abschnitt 2 that the developer's own
 * new-document.spec.ts does not cover: Space-key activation (2.3), full
 * re-import via the UI (2.4), ODT mimetype byte-level check on the actual
 * downloaded file (2.4), error-banner reset in a real browser (2.10, not
 * just the FormatPicker component test in 2.16), and the umlaut filename
 * download path (2.14).
 */

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)', exact: true }) })
}

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)', exact: true }) })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
})

test('creates a new document via keyboard only, Space key (Testfall 3, second activation key)', async ({ page }) => {
  const button = docxCard(page).getByRole('button', { name: 'Neu erstellen' })
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press(' ')

  await expect(page.locator('.ProseMirror')).toBeVisible()
  await expect(page.getByText('Unbenanntes Dokument.docx')).toBeVisible()
})

test('DOCX: export then re-import via the real upload UI yields the same empty state (Testfall 4/5)', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.locator('.ProseMirror')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Unbenanntes Dokument.docx')

  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // Re-import through the actual UI file input — not a direct function call.
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveText('')
  await expect(page.getByText(/ungespeichert/i)).not.toBeVisible()
})

test('ODT: export then re-import via the real upload UI yields the same empty state (Testfall 4/5)', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.locator('.ProseMirror')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Unbenanntes Dokument.odt')

  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'reimport.odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    buffer,
  })
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveText('')
  await expect(page.getByText(/ungespeichert/i)).not.toBeVisible()
})

test('ODT: mimetype is the first, uncompressed zip entry in the actually-downloaded file (R2, byte-level)', async ({
  page,
}) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.locator('.ProseMirror')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise

  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  expect(bytes[0]).toBe(0x50) // 'P'
  expect(bytes[1]).toBe(0x4b) // 'K'
  expect(bytes[2]).toBe(0x03)
  expect(bytes[3]).toBe(0x04)
  const compressionMethod = bytes[8] | (bytes[9] << 8)
  expect(compressionMethod).toBe(0) // STORE, not DEFLATE
  const nameLength = bytes[26] | (bytes[27] << 8)
  const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength))
  expect(name).toBe('mimetype')

  // Cross-check via JSZip too, as belt-and-suspenders (not a substitute for the byte check above).
  const zip = await JSZip.loadAsync(buffer)
  expect(Object.keys(zip.files)[0]).toBe('mimetype')
})

test('creating a new document clears a previous import error banner (Grenzfall 9, real browser)', async ({ page }) => {
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'kaputt.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('nicht wirklich ein zip'),
  })
  await expect(page.getByRole('alert')).toBeVisible()

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await expect(page.locator('.ProseMirror')).toBeVisible()
})

test('downloading a file with umlauts in its name preserves the exact file name (Testfall 13, upload path)', async ({
  page,
}) => {
  const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `</Types>`,
  )
  zip
    .folder('_rels')!
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
        `</Relationships>`,
    )
  zip
    .folder('docProps')!
    .file(
      'core.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title/></cp:coreProperties>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document ${W_NS}><w:body><w:p><w:r><w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    )
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })

  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'Übersicht Prüfbericht äöü.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  await expect(page.locator('.ProseMirror')).toContainText('Text')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Übersicht Prüfbericht äöü.docx')
})
