import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`

/** A minimal, hand-built ODT — independent of this app's own writer — used to test import. */
async function buildSampleOdt(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3">` +
      `<office:automatic-styles><style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style></office:automatic-styles>` +
      `<office:body><office:text><text:h text:outline-level="1">Willkommen</text:h>` +
      `<text:p>Dies ist ein <text:span text:style-name="Bold">Testdokument</text:span>.</text:p></office:text></office:body></office:document-content>`,
  )
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS} office:version="1.3"><office:styles><style:style style:name="Standard" style:family="paragraph"/></office:styles></office:document-styles>`,
  )
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS} xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:meta><dc:title>Beispieldokument</dc:title></office:meta></office:document-meta>`,
  )
  zip
    .folder('META-INF')!
    .file(
      'manifest.xml',
      `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/></manifest:manifest>`,
    )
  return zip.generateAsync({ type: 'nodebuffer' })
}

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

test.describe('ODT editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('creates a new document, types and bolds text, and exports it', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

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
    const contentXml = await zip.file('content.xml')!.async('text')

    expect(contentXml).toContain('Hallo Welt')
    expect(contentXml).toContain('font-weight="bold"')
  })

  test('uploads an existing ODT file and shows its content', async ({ page }) => {
    const buffer = await buildSampleOdt()
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'beispiel.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Willkommen')
    await expect(editor).toContainText('Testdokument')
  })

  test('round trip: uploading then exporting unchanged preserves heading, text, and bold formatting', async ({
    page,
  }) => {
    const buffer = await buildSampleOdt()
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'beispiel.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror')).toContainText('Willkommen')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')

    expect(contentXml).toContain('Willkommen')
    expect(contentXml).toContain('Testdokument')
    expect(contentXml).toContain('font-weight="bold"')
  })

  test('editing an uploaded document and exporting reflects the edit', async ({ page }) => {
    const buffer = await buildSampleOdt()
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'beispiel.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })

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
    const contentXml = await zip.file('content.xml')!.async('text')

    expect(contentXml).toContain('Zusatz')
  })
})
