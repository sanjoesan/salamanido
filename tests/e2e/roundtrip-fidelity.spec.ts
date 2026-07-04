import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { test, expect, docxCard, odtCard } from './fixtures'
import { DOCX_MIME, ODT_MIME } from './fixtures/builders'
import { buildRichDocx, buildRichOdt, TINY_PNG_BUFFER, RICH_DOC_TITLE } from './fixtures/richDocument'

// specs/datei-oeffnen-req.md Abschnitt 6 — the mandatory round-trip acceptance
// criteria (1-8), each checked as its own assertion/expect below, for both mandatory
// matrix rows: DOCX->DOCX and ODT->ODT (see specs/datei-oeffnen-qa.md Abschnitt 3.5).

test.describe('§6 round trip: DOCX -> DOCX', () => {
  test('all 8 fidelity criteria hold across upload -> unchanged export -> re-import', async ({ page, errors }) => {
    const originalBuffer = await buildRichDocx()
    const originalName = 'Rundreise-Test.docx'

    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: originalName, mimeType: DOCX_MIME, buffer: originalBuffer })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()

    // --- Criterion 1: Text ---
    await expect(editor).toContainText('Überschrift Eins')
    await expect(editor).toContainText('Punkt A')
    await expect(editor).toContainText('Unterpunkt A1')
    await expect(editor).toContainText('Punkt B')
    await expect(editor).toContainText('Verbunden')
    await expect(editor).toContainText('Zelle A2')
    await expect(editor).toContainText('Zelle B2')
    await expect(editor).toContainText('Fett')
    await expect(editor).toContainText('kursiv-rot')
    const paragraphCountBefore = await page.locator('.ProseMirror p').count()

    // --- Criterion 2: Struktur ---
    await expect(page.locator('.ProseMirror h1')).toHaveCount(1)
    const listItemsBefore = await page.locator('.ProseMirror li').count()
    const nestedListsBefore = await page.locator('.ProseMirror li ul, .ProseMirror li ol').count()
    const rowsBefore = await page.locator('.ProseMirror tr').count()
    const cellsBefore = await page.locator('.ProseMirror td').count()
    const mergedCellColspanBefore = await page.locator('.ProseMirror td[colspan="2"]').count()
    expect(rowsBefore).toBe(2)
    expect(cellsBefore).toBe(3) // 1 merged (colspan 2) + 2 plain cells
    expect(mergedCellColspanBefore).toBe(1)
    // Required by specs/datei-oeffnen-req.md §6 criterion 2 ("Listen-Typ … und
    // -Verschachtelung … bleiben identisch"): the two-level list authored the real-Word
    // way (flat <w:p> sequence sharing one w:numId, each with its own w:ilvl — see
    // fixtures/richDocument.ts buildRichDocx) must still be recognizable as nested on
    // import. docx/reader.ts's groupLists() reconstructs this from w:ilvl via a stack of
    // open list frames, one per indent level (fixed after this was found failing here).
    expect(nestedListsBefore, 'DOCX reader does not reconstruct list nesting from w:ilvl (see docx/reader.ts groupLists)').toBe(1)

    // --- Criterion 3: Zeichenformatierung (positionstreu) ---
    await expect(page.locator('.ProseMirror strong', { hasText: 'Fett' })).toHaveCount(1)
    await expect(page.locator('.ProseMirror em', { hasText: 'kursiv-rot' })).toHaveCount(1)

    // --- Criterion 4: Absatzausrichtung ---
    const centeredParagraph = page.locator('.ProseMirror p', { hasText: 'kursiv-rot' })
    await expect(centeredParagraph).toHaveCSS('text-align', 'center')

    // --- Criterion 5: Bilder ---
    await expect(page.locator('.ProseMirror img')).toHaveCount(1)

    // --- Criterion 6: Metadaten --- (not directly visible in the DOM; checked post-export below)

    // Export unchanged.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()
    const exportedBuffer = await readFile(downloadedPath!)

    // --- Criterion 7: Dateiname ---
    expect(download.suggestedFilename()).toBe(originalName)

    // --- Criterion 6: Metadaten (from the exported file's docProps/core.xml) ---
    const exportedZip = await JSZip.loadAsync(exportedBuffer)
    const coreXml = await exportedZip.file('docProps/core.xml')!.async('text')
    expect(coreXml).toContain(RICH_DOC_TITLE)

    // --- Criterion 5 continued: byte-identical embedded image ---
    const mediaFiles = Object.keys(exportedZip.files).filter(
      (name) => name.startsWith('word/media/') && !exportedZip.files[name].dir,
    )
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1)
    const exportedImageBuffer = await exportedZip.file(mediaFiles[0])!.async('nodebuffer')
    expect(exportedImageBuffer.equals(TINY_PNG_BUFFER)).toBe(true)

    // Re-import the exported file through the same real upload path.
    await page.getByRole('button', { name: /formate/i }).click()
    const input2 = docxCard(page).locator('input[type="file"]')
    await input2.setInputFiles({ name: download.suggestedFilename(), mimeType: DOCX_MIME, buffer: exportedBuffer })
    await expect(editor).toBeVisible()

    // --- Re-verify criterion 1 after re-import ---
    await expect(editor).toContainText('Überschrift Eins')
    await expect(editor).toContainText('Punkt A')
    await expect(editor).toContainText('Unterpunkt A1')
    await expect(editor).toContainText('Punkt B')
    await expect(editor).toContainText('Verbunden')
    await expect(editor).toContainText('Zelle A2')
    await expect(editor).toContainText('Zelle B2')
    const paragraphCountAfter = await page.locator('.ProseMirror p').count()
    expect(paragraphCountAfter).toBe(paragraphCountBefore)

    // --- Re-verify criterion 2 (Struktur) after re-import ---
    await expect(page.locator('.ProseMirror h1')).toHaveCount(1)
    const listItemsAfter = await page.locator('.ProseMirror li').count()
    const nestedListsAfter = await page.locator('.ProseMirror li ul, .ProseMirror li ol').count()
    const rowsAfter = await page.locator('.ProseMirror tr').count()
    const cellsAfter = await page.locator('.ProseMirror td').count()
    const mergedCellColspanAfter = await page.locator('.ProseMirror td[colspan="2"]').count()
    expect(rowsAfter).toBe(rowsBefore)
    expect(cellsAfter).toBe(cellsBefore)
    expect(mergedCellColspanAfter).toBe(mergedCellColspanBefore)
    expect(listItemsAfter).toBe(listItemsBefore)
    // Required by §6 criterion 2, re-checked after the full export -> re-import cycle:
    // docx/writer.ts's blockToDocx carries a {numId, level} list context one level
    // deeper for every nested bullet_list/ordered_list, so w:ilvl round-trips too.
    expect(nestedListsAfter, 'DOCX list nesting does not survive export -> re-import (see docx/writer.ts blockToDocx and docx/reader.ts groupLists)').toBe(
      nestedListsBefore,
    )

    // --- Re-verify criterion 3 (Zeichenformatierung) ---
    await expect(page.locator('.ProseMirror strong', { hasText: 'Fett' })).toHaveCount(1)
    await expect(page.locator('.ProseMirror em', { hasText: 'kursiv-rot' })).toHaveCount(1)

    // --- Re-verify criterion 4 (Absatzausrichtung) ---
    await expect(page.locator('.ProseMirror p', { hasText: 'kursiv-rot' })).toHaveCSS('text-align', 'center')

    // --- Re-verify criterion 5 (Bilder) ---
    await expect(page.locator('.ProseMirror img')).toHaveCount(1)

    // --- Criterion 8: kein Absturz across the whole cycle ---
    expect(errors, errors.join('\n')).toEqual([])
  })
})

test.describe('§6 round trip: ODT -> ODT', () => {
  test('all 8 fidelity criteria hold across upload -> unchanged export -> re-import', async ({ page, errors }) => {
    const originalBuffer = await buildRichOdt()
    const originalName = 'Rundreise-Test.odt'

    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: originalName, mimeType: ODT_MIME, buffer: originalBuffer })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()

    // --- Criterion 1: Text ---
    await expect(editor).toContainText('Überschrift Eins')
    await expect(editor).toContainText('Punkt A')
    await expect(editor).toContainText('Unterpunkt A1')
    await expect(editor).toContainText('Punkt B')
    await expect(editor).toContainText('Verbunden')
    await expect(editor).toContainText('Zelle A2')
    await expect(editor).toContainText('Zelle B2')
    await expect(editor).toContainText('Fett')
    await expect(editor).toContainText('kursiv-rot')
    const paragraphCountBefore = await page.locator('.ProseMirror p').count()

    // --- Criterion 2: Struktur ---
    await expect(page.locator('.ProseMirror h1')).toHaveCount(1)
    const listItemsBefore = await page.locator('.ProseMirror li').count()
    const nestedListsBefore = await page.locator('.ProseMirror li ul, .ProseMirror li ol').count()
    expect(nestedListsBefore).toBe(1) // ODT preserves genuine list nesting (see nummerierte-liste-code.md)
    const rowsBefore = await page.locator('.ProseMirror tr').count()
    const cellsBefore = await page.locator('.ProseMirror td').count()
    const mergedCellColspanBefore = await page.locator('.ProseMirror td[colspan="2"]').count()
    expect(rowsBefore).toBe(2)
    expect(cellsBefore).toBe(3)
    expect(mergedCellColspanBefore).toBe(1)

    // --- Criterion 3: Zeichenformatierung ---
    await expect(page.locator('.ProseMirror strong', { hasText: 'Fett' })).toHaveCount(1)
    await expect(page.locator('.ProseMirror em', { hasText: 'kursiv-rot' })).toHaveCount(1)

    // --- Criterion 4: Absatzausrichtung ---
    await expect(page.locator('.ProseMirror p', { hasText: 'kursiv-rot' })).toHaveCSS('text-align', 'center')

    // --- Criterion 5: Bilder ---
    await expect(page.locator('.ProseMirror img')).toHaveCount(1)

    // Export unchanged.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()
    const exportedBuffer = await readFile(downloadedPath!)

    // --- Criterion 7: Dateiname ---
    expect(download.suggestedFilename()).toBe(originalName)

    // --- Criterion 6: Metadaten ---
    const exportedZip = await JSZip.loadAsync(exportedBuffer)
    const metaXml = await exportedZip.file('meta.xml')!.async('text')
    expect(metaXml).toContain(RICH_DOC_TITLE)

    // --- Criterion 5 continued: byte-identical embedded image ---
    const mediaFiles = Object.keys(exportedZip.files).filter(
      (name) => name.startsWith('Pictures/') && !name.endsWith('/'),
    )
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1)
    const exportedImageBuffer = await exportedZip.file(mediaFiles[0])!.async('nodebuffer')
    expect(exportedImageBuffer.equals(TINY_PNG_BUFFER)).toBe(true)

    // Re-import the exported file through the same real upload path.
    await page.getByRole('button', { name: /formate/i }).click()
    const input2 = odtCard(page).locator('input[type="file"]')
    await input2.setInputFiles({ name: download.suggestedFilename(), mimeType: ODT_MIME, buffer: exportedBuffer })
    await expect(editor).toBeVisible()

    // --- Re-verify criterion 1 ---
    await expect(editor).toContainText('Überschrift Eins')
    await expect(editor).toContainText('Punkt A')
    await expect(editor).toContainText('Unterpunkt A1')
    await expect(editor).toContainText('Punkt B')
    await expect(editor).toContainText('Verbunden')
    await expect(editor).toContainText('Zelle A2')
    await expect(editor).toContainText('Zelle B2')
    const paragraphCountAfter = await page.locator('.ProseMirror p').count()
    expect(paragraphCountAfter).toBe(paragraphCountBefore)

    // --- Re-verify criterion 2 (Struktur), including genuine nesting ---
    await expect(page.locator('.ProseMirror h1')).toHaveCount(1)
    const listItemsAfter = await page.locator('.ProseMirror li').count()
    const nestedListsAfter = await page.locator('.ProseMirror li ul, .ProseMirror li ol').count()
    const rowsAfter = await page.locator('.ProseMirror tr').count()
    const cellsAfter = await page.locator('.ProseMirror td').count()
    const mergedCellColspanAfter = await page.locator('.ProseMirror td[colspan="2"]').count()
    expect(listItemsAfter).toBe(listItemsBefore)
    expect(nestedListsAfter).toBe(nestedListsBefore)
    expect(rowsAfter).toBe(rowsBefore)
    expect(cellsAfter).toBe(cellsBefore)
    expect(mergedCellColspanAfter).toBe(mergedCellColspanBefore)

    // --- Re-verify criterion 3 ---
    await expect(page.locator('.ProseMirror strong', { hasText: 'Fett' })).toHaveCount(1)
    await expect(page.locator('.ProseMirror em', { hasText: 'kursiv-rot' })).toHaveCount(1)

    // --- Re-verify criterion 4 ---
    await expect(page.locator('.ProseMirror p', { hasText: 'kursiv-rot' })).toHaveCSS('text-align', 'center')

    // --- Re-verify criterion 5 ---
    await expect(page.locator('.ProseMirror img')).toHaveCount(1)

    // --- Criterion 8: kein Absturz ---
    expect(errors, errors.join('\n')).toEqual([])
  })
})

// §6 explicitly excludes cross-format rows from the mandatory scope until
// `speichern-unter-format` (cross-format export) exists — placeholders kept visible
// rather than silently omitted (see specs/datei-oeffnen-qa.md Abschnitt 3.5 Punkt 5).
test.skip('DOCX -> ODT Rundreise (blocked on backlog slug "speichern-unter-format")', () => {})
test.skip('ODT -> DOCX Rundreise (blocked on backlog slug "speichern-unter-format")', () => {})
