import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** A minimal, hand-built DOCX — independent of this app's own writer — used to test import. */
async function buildSampleDocx(): Promise<Buffer> {
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
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Beispieldokument</dc:title></cp:coreProperties>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document ${W_NS}><w:body>` +
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Willkommen</w:t></w:r></w:p>` +
        `<w:p><w:r><w:t xml:space="preserve">Dies ist ein </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>Testdokument</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>` +
        `<w:sectPr/>` +
        `</w:body></w:document>`,
    )
  return zip.generateAsync({ type: 'nodebuffer' })
}

function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('DOCX editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('creates a new document, types and bolds text, and exports it', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    await editor.click()
    await page.keyboard.type('Hallo Welt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')

    expect(documentXml).toContain('Hallo Welt')
    expect(documentXml).toContain('<w:b/>')
  })

  test('uploads an existing DOCX file and shows its content', async ({ page }) => {
    const buffer = await buildSampleDocx()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'beispiel.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Willkommen')
    await expect(editor).toContainText('Testdokument')
  })

  test('round trip: uploading then exporting unchanged preserves heading, text, and bold formatting', async ({
    page,
  }) => {
    const buffer = await buildSampleDocx()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'beispiel.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })
    await expect(page.locator('.ProseMirror')).toContainText('Willkommen')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')

    expect(documentXml).toContain('Willkommen')
    expect(documentXml).toContain('Testdokument')
    expect(documentXml).toContain('<w:b/>')
  })

  test('editing an uploaded document and exporting reflects the edit', async ({ page }) => {
    const buffer = await buildSampleDocx()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'beispiel.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Willkommen')
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Zusatz')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')

    expect(documentXml).toContain('Zusatz')
  })
})
