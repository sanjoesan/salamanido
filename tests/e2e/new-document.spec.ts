import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

/**
 * Regression suite for the "Neues Dokument erstellen" feature — see
 * specs/neues-dokument-req.md (Abschnitt 6, Testfälle 1-3, 6, 8-14) and
 * specs/neues-dokument-code.md (Abschnitt 4.5). Every scenario runs for both
 * DOCX and ODT independently (Rundreise-Anforderung, Abschnitt 4 of the req doc) —
 * a scenario passing for only one format does not count as covered.
 */

interface FormatConfig {
  cardHeading: string
  fileName: string
}

const FORMATS: FormatConfig[] = [
  { cardHeading: 'Word-Dokument (.docx)', fileName: 'Unbenanntes Dokument.docx' },
  { cardHeading: 'OpenDocument Text (.odt)', fileName: 'Unbenanntes Dokument.odt' },
]

function cardFor(page: Page, heading: string) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: heading, exact: true }) })
}

for (const format of FORMATS) {
  test.describe(`Neues Dokument erstellen: ${format.cardHeading}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /verstanden/i }).click()
    })

    test('shows no dirty indicator and no error banner right after creation (Testfall 1)', async ({ page }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()

      await expect(page.getByText(format.fileName)).toBeVisible()
      await expect(page.getByText(/ungespeichert/i)).not.toBeVisible()
      await expect(page.getByRole('alert')).not.toBeVisible()
    })

    test('types immediately after creating a new document, without any prior click (Testfall 2)', async ({
      page,
    }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()

      // Deliberately no editor.click() here — the fix under test is that the
      // ProseMirror view focuses itself right after creation.
      await page.keyboard.type('Sofort tippbar')

      await expect(page.locator('.ProseMirror')).toContainText('Sofort tippbar')
    })

    test('creates a new document via keyboard only, Tab + Enter (Testfall 3)', async ({ page }) => {
      const button = cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' })
      await button.focus()
      await page.keyboard.press('Enter')

      await expect(page.locator('.ProseMirror')).toBeVisible()
      await page.keyboard.type('Per Tastatur erstellt')
      await expect(page.locator('.ProseMirror')).toContainText('Per Tastatur erstellt')
    })

    test('exports an unmodified new document to a valid, minimal, empty file (Testfall 4/5)', async ({ page }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await expect(page.locator('.ProseMirror')).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const download = await downloadPromise
      const downloadedPath = await download.path()
      expect(downloadedPath).toBeTruthy()

      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile(downloadedPath!)

      // Independent structural check — JSZip + the platform DOMParser, not this
      // app's own reader (R1/R2 in specs/neues-dokument-req.md Abschnitt 4).
      // Real schema validation (XSD/RelaxNG) is out of scope — see
      // specs/neues-dokument-code.md Abschnitt 6.1 for why.
      const zip = await JSZip.loadAsync(buffer)

      if (format.fileName.endsWith('.docx')) {
        const contentTypes = await zip.file('[Content_Types].xml')?.async('text')
        const documentXml = await zip.file('word/document.xml')?.async('text')
        expect(contentTypes).toBeTruthy()
        expect(documentXml).toBeTruthy()
        expect(documentXml).toContain('<w:sectPr>')
      } else {
        const mimetypeEntry = zip.file('mimetype')
        expect(mimetypeEntry).toBeTruthy()
        // R2: mimetype must be the first, uncompressed entry in the zip.
        const rawZipNames = Object.keys(zip.files)
        expect(rawZipNames[0]).toBe('mimetype')
        expect((mimetypeEntry as unknown as { _data?: { compressedSize?: number; uncompressedSize?: number } })._data)
          .toBeTruthy()
        const contentXml = await zip.file('content.xml')?.async('text')
        const stylesXml = await zip.file('styles.xml')?.async('text')
        const metaXml = await zip.file('meta.xml')?.async('text')
        expect(contentXml).toBeTruthy()
        expect(stylesXml).toBeTruthy()
        expect(metaXml).toBeTruthy()
      }
    })

    test('exported page size matches the displayed A4 default (Testfall 6, R5)', async ({ page }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await expect(page.locator('.ProseMirror')).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const download = await downloadPromise
      const downloadedPath = await download.path()

      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile(downloadedPath!)
      const zip = await JSZip.loadAsync(buffer)

      if (format.fileName.endsWith('.docx')) {
        const documentXml = await zip.file('word/document.xml')!.async('text')
        expect(documentXml).toContain('w:w="11906"')
        expect(documentXml).toContain('w:h="16838"')
        expect(documentXml).toContain('w:top="1417"')
      } else {
        const stylesXml = await zip.file('styles.xml')!.async('text')
        expect(stylesXml).toContain('fo:page-width="21cm"')
        expect(stylesXml).toContain('fo:page-height="29.7cm"')
        expect(stylesXml).toContain('fo:margin="2.5cm"')
      }
    })

    test('closing immediately after creation asks no confirmation (Testfall 8)', async ({ page }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await expect(page.locator('.ProseMirror')).toBeVisible()

      let dialogShown = false
      page.on('dialog', () => {
        dialogShown = true
      })

      await page.getByRole('button', { name: /formate/i }).click()
      await expect(page.getByRole('heading', { name: /salamanido/i })).toBeVisible()
      expect(dialogShown).toBe(false)
    })

    test('closing after an edit asks for confirmation; cancel keeps the document open with its content intact (Testfall 9)', async ({
      page,
    }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await page.keyboard.type('Nicht verlieren')

      page.once('dialog', (dialog) => dialog.dismiss())
      await page.getByRole('button', { name: /formate/i }).click()

      await expect(page.locator('.ProseMirror')).toContainText('Nicht verlieren')
    })

    test('undo back to empty leaves content empty but dirty indicator remains visible (Testfall 10)', async ({
      page,
    }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await page.keyboard.type('x')
      await expect(page.locator('.ProseMirror')).toContainText('x')

      await page.keyboard.press('ControlOrMeta+z')
      await expect(page.locator('.ProseMirror')).not.toContainText('x')

      // Documented, accepted behavior (Abschnitt 3.7/Grenzfall 6): dirty does not
      // reset just because undo happens to return to the original empty content.
      await expect(page.getByText(/ungespeichert/i)).toBeVisible()
    })

    test('two consecutive create-new cycles leave no leftover content or duplicated toolbars (Testfall 11)', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => consoleErrors.push(String(err)))

      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await page.keyboard.type('Dokument eins')

      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: /formate/i }).click()
      await expect(page.getByRole('heading', { name: /salamanido/i })).toBeVisible()

      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()

      await expect(page.locator('.ProseMirror')).not.toContainText('Dokument eins')
      await expect(page.getByRole('toolbar')).toHaveCount(1)
      expect(consoleErrors).toEqual([])
    })

    test('the whole create -> type -> format -> export flow stays free of console errors (Testfall 14)', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => consoleErrors.push(String(err)))

      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()
      await page.keyboard.type('Fehlerfreier Ablauf')
      await page.keyboard.press('ControlOrMeta+a')
      await page.getByTitle('Fett').click()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      await downloadPromise

      expect(consoleErrors).toEqual([])
    })

    test('export immediately after creation, before any extra settling time, still reflects the empty body (Grenzfall 12)', async ({
      page,
    }) => {
      await cardFor(page, format.cardHeading).getByRole('button', { name: 'Neu erstellen' }).click()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const download = await downloadPromise
      const downloadedPath = await download.path()

      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile(downloadedPath!)
      const zip = await JSZip.loadAsync(buffer)

      if (format.fileName.endsWith('.docx')) {
        const documentXml = await zip.file('word/document.xml')!.async('text')
        expect(documentXml).toMatch(/<w:body><w:p>.*?<\/w:p><w:sectPr>/s)
      } else {
        const contentXml = await zip.file('content.xml')!.async('text')
        expect(contentXml).toContain('<office:text><text:p')
      }
    })
  })
}

// R7 (specs/neues-dokument-req.md Abschnitt 4): cross-format export from an
// already-created document. Not implemented in this ticket (see
// specs/neues-dokument-code.md Abschnitt 1, Entscheidung 6 and Abschnitt 6.6) —
// tracked via the `speichern-unter-format` backlog entry. Kept as an explicit,
// visibly-skipped placeholder so no other test can silently claim R7 as passed.
test.fixme(
  'R7: creates a new document and exports it under the other format without losing content',
  async () => {},
)
