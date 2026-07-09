import { test, expect, type Page, type Locator } from '@playwright/test'
import JSZip from 'jszip'
import { insertTableViaDialog } from './fixtures/table-helpers'

// Basis-Stabilisierung (specs/basis-stabilisierung-req.md): B1 Formatierungs-Feedback,
// B2 Schreiben um Rand-Tabellen (Gap-Cursor), B3 Klick fokussiert immer, B4 ganze A4-Seite,
// B5 Textfarbe wirkt immer, Querschnitt Mehrfach-Leerzeichen. §5.2-Testfälle 1–26 und die
// §4-Rundreisen. Läuft auf Desktop Chrome, Mobile (Pixel 7) und Tablet (iPad Mini) — die
// Touch-Projekte decken §5.2 Nr. 6/11/16/20 mit ab.

function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const editor = (page: Page) => page.locator('.ProseMirror')
const sheet = (page: Page) => page.getByTestId('page-sheet')
const gapCursor = (page: Page) => page.locator('.ProseMirror-gapcursor')
const fettButton = (page: Page) => page.getByRole('button', { name: 'Fett' })

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

/** Baut ein Dokument, dessen EINZIGER Inhalt eine 2×2-Tabelle ist (B2-Auslösezustand). */
async function tableOnlyDoc(page: Page, card: (p: Page) => ReturnType<typeof odtCard> = odtCard) {
  await openEditor(page, card)
  await insertTableViaDialog(page, 2, 2)
  await expect(page.locator('.ProseMirror table')).toHaveCount(1)
  await expect(page.locator('.ProseMirror > p')).toHaveCount(0) // Tabelle ist einziger Knoten
}

/** Klickt in den weißen Seitenrand oberhalb (bzw. unterhalb) des Inhalts. Scrollt vorher an
 * den Blattanfang/-ende, damit der Zielpunkt sicher im Viewport liegt (das A4-Blatt ist bei
 * 100% höher als der Bildschirm — der Seitenbereich scrollt INTERN, das Fenster nicht). */
async function clickPageMargin(page: Page, where: 'above' | 'below') {
  await sheet(page).evaluate((el, dir) => {
    const scroller = el.parentElement?.parentElement
    if (scroller) scroller.scrollTop = dir === 'above' ? 0 : scroller.scrollHeight
  }, where)
  const sheetBox = (await sheet(page).boundingBox())!
  const editorBox = (await editor(page).boundingBox())!
  const x = sheetBox.x + sheetBox.width / 2
  // 'below': nach dem Scroll ans Blattende liegt der Inhalt (editorBox) größtenteils
  // OBERHALB des Viewports — geklickt wird knapp über der unteren Blattkante (sichtbar),
  // was zugleich sicher unterhalb des letzten Absatzes liegt.
  const y =
    where === 'above'
      ? (sheetBox.y + editorBox.y) / 2 // mitten im oberen Rand
      : Math.max(sheetBox.y + sheetBox.height - 40, editorBox.y + editorBox.height + 10)
  await page.mouse.click(x, y)
}

/** Der Gap-Cursor-Widget-Div ist selbst 0×0 (der sichtbare Strich ist sein ::after) —
 * Playwrights toBeVisible() greift daher nicht. Vorhandensein + display:block (= Editor
 * fokussiert, Cursor wird gezeichnet) weisen die sichtbare Darstellung nach. */
async function expectGapCursor(page: Page) {
  await expect(gapCursor(page)).toHaveCount(1)
  await expect(gapCursor(page)).toHaveCSS('display', 'block')
}

const activeBg = (button: Locator) => button.evaluate((el) => getComputedStyle(el).backgroundColor)

// ===========================================================================
// B1 — Formatierungs-Feedback
// ===========================================================================
test.describe('B1: Format-Buttons zeigen sichtbaren, korrekten Aktiv-Zustand', () => {
  test('Testfall 1: Klick auf Fett ohne Selektion → Button sofort aktiv (sichtbar + aria-pressed), Tippen ist fett', async ({
    page,
  }) => {
    await openEditor(page)
    const inactiveBg = await activeBg(fettButton(page))
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'false')

    await fettButton(page).click()
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'true')
    expect(await activeBg(fettButton(page)), 'Aktiv-Zustand muss auch SICHTBAR sein').not.toBe(inactiveBg)

    await page.keyboard.type('fett')
    await expect(editor(page).locator('strong')).toHaveText('fett')
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 2: durchgehend fette Selektion → aktiv; gemischte Selektion → inaktiv', async ({ page }) => {
    await openEditor(page)
    await fettButton(page).click()
    await page.keyboard.type('fett')
    await fettButton(page).click() // Fett wieder aus
    await page.keyboard.type(' normal')

    // nur das fette Wort selektieren (vom Anfang aus 4 Zeichen)
    await page.keyboard.press('ControlOrMeta+Home')
    for (let i = 0; i < 'fett'.length; i++) await page.keyboard.press('Shift+ArrowRight')
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'true')

    // Selektion über die Fett-Grenze hinaus erweitern → gemischt → inaktiv
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight')
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('Testfall 3: Strg+A über gemischtes Dokument → inaktiv; alles fetten → aktiv', async ({ page }) => {
    await openEditor(page)
    await fettButton(page).click()
    await page.keyboard.type('fett')
    await fettButton(page).click()
    await page.keyboard.type(' normal')

    await page.keyboard.press('ControlOrMeta+a')
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'false')

    // Klick bei gemischter Selektion fettet ALLES (removeWhenPresent:false, Word-Semantik) …
    await fettButton(page).click()
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(editor(page).locator('strong')).toContainText('normal')
    // … und erst der nächste Klick auf der jetzt durchgehend fetten Selektion entfernt es
    await fettButton(page).click()
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(editor(page).locator('strong')).toHaveCount(0)
  })

  test('Testfall 4: Listen-Button zeigt aktiv in der Liste, inaktiv außerhalb', async ({ page }) => {
    await openEditor(page)
    await page.keyboard.type('draussen')
    await page.keyboard.press('Enter')
    const listButton = page.getByRole('button', { name: '• Liste' })
    await listButton.click()
    await page.keyboard.type('drin')
    await expect(editor(page).locator('ul li')).toHaveText('drin')
    await expect(listButton).toHaveAttribute('aria-pressed', 'true')

    await editor(page).locator('p', { hasText: 'draussen' }).click()
    await expect(listButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('Testfall 5: Fett per Tab-Fokus + Enter UND Leertaste schaltbar, Anzeige wie bei Maus', async ({ page }) => {
    await openEditor(page)
    await page.keyboard.type('wort')
    await page.keyboard.press('ControlOrMeta+a')

    await fettButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(editor(page).locator('strong')).toHaveText('wort')
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'true')

    await fettButton(page).focus()
    await page.keyboard.press('Space')
    await expect(editor(page).locator('strong')).toHaveCount(0)
    await expect(fettButton(page)).toHaveAttribute('aria-pressed', 'false')
  })
})

// ===========================================================================
// B2 — Schreiben vor/nach/zwischen Rand-Tabellen (Gap-Cursor)
// ===========================================================================
test.describe('B2: Schreiben um Rand-Tabellen', () => {
  test('Testfall 7: Klick oberhalb einer Rand-Tabelle → sichtbarer Gap-Cursor, Tippen erzeugt Absatz davor', async ({
    page,
  }) => {
    await tableOnlyDoc(page)
    await clickPageMargin(page, 'above')
    await expectGapCursor(page) // sichtbarer Cursor (nicht nur interner Zustand)
    await page.keyboard.type('davor')
    await expect(editor(page).locator('> p').first()).toHaveText('davor')
    // der neue Absatz steht VOR der Tabelle
    await expect(page.locator('.ProseMirror > p + .tableWrapper, .ProseMirror > p + table')).toHaveCount(1)
  })

  test('Testfall 8: Klick unterhalb einer Rand-Tabelle → Gap-Cursor, Tippen erzeugt Absatz danach', async ({
    page,
  }) => {
    await tableOnlyDoc(page)
    await clickPageMargin(page, 'below')
    await expectGapCursor(page)
    await page.keyboard.type('danach')
    await expect(editor(page).locator('> p').last()).toHaveText('danach')
    await expect(
      page.locator('.ProseMirror > .tableWrapper + p, .ProseMirror > table + p'),
    ).toHaveCount(1)
  })

  test('Testfall 9: rein per Tastatur — Pfeil-hoch/-runter aus der Zelle erreicht die Position davor/danach', async ({
    page,
  }) => {
    await tableOnlyDoc(page)
    // Pfeil-hoch aus der ersten Zelle → Gap-Cursor vor der Tabelle
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.press('ArrowUp')
    await expectGapCursor(page)
    await page.keyboard.type('davor')
    await expect(editor(page).locator('> p').first()).toHaveText('davor')

    // Pfeil-runter aus der letzten Zelle → Gap-Cursor nach der Tabelle
    await page.locator('.ProseMirror td').nth(3).click()
    await page.keyboard.press('ArrowDown')
    await expectGapCursor(page)
    await page.keyboard.type('danach')
    await expect(editor(page).locator('> p').last()).toHaveText('danach')
  })

  test('Testfall 10: zwei Tabellen ohne trennenden Absatz → Cursor dazwischen (Tastatur), Absatz dazwischen', async ({
    page,
  }) => {
    await tableOnlyDoc(page)
    // zweite Tabelle direkt hinter der ersten einfügen: Gap-Cursor nach Tabelle 1 → Dialog
    await page.locator('.ProseMirror td').nth(3).click()
    await page.keyboard.press('ArrowDown')
    await expectGapCursor(page)
    await insertTableViaDialog(page, 2, 2)
    await expect(page.locator('.ProseMirror table')).toHaveCount(2)
    await expect(page.locator('.ProseMirror > p')).toHaveCount(0) // wirklich ohne trennenden Absatz

    // aus der letzten Zelle der ERSTEN Tabelle per Pfeil-runter in den Zwischenraum
    await page.locator('.ProseMirror table').first().locator('td').nth(3).click()
    await page.keyboard.press('ArrowDown')
    await expectGapCursor(page)
    await page.keyboard.type('zwischen')
    // genau EIN Absatz, und er steht zwischen den beiden Tabellen
    await expect(editor(page).locator('> p')).toHaveText(['zwischen'])
    await expect(page.locator('.ProseMirror > .tableWrapper + p + .tableWrapper')).toHaveCount(1)
  })
})

// ===========================================================================
// B3 — Klick irgendwo auf der Seite fokussiert immer
// ===========================================================================
test.describe('B3: keine tote Klickfläche auf der Seite', () => {
  test('Testfall 12: Klick auf den weißen Rand OBERHALB des Inhalts → fokussiert, Cursor am Dokumentanfang', async ({
    page,
  }) => {
    await openEditor(page)
    await page.keyboard.type('inhalt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Delete')
    await page.keyboard.type('erste zeile')
    await clickPageMargin(page, 'above')
    await expect(editor(page)).toHaveClass(/ProseMirror-focused/)
    await page.keyboard.type('X')
    await expect(editor(page).locator('p').first()).toHaveText('Xerste zeile')
  })

  test('Testfall 13: Klick auf die Fläche UNTERHALB des letzten Absatzes → fokussiert, Cursor am Dokumentende', async ({
    page,
  }) => {
    await openEditor(page)
    await page.keyboard.type('letzte zeile')
    await clickPageMargin(page, 'below')
    await expect(editor(page)).toHaveClass(/ProseMirror-focused/)
    await page.keyboard.type('X')
    await expect(editor(page).locator('p').first()).toHaveText('letzte zeileX')
  })

  test('Testfall 14 (Negativtest): Klick auf den grauen Bereich außerhalb des Blatts ändert nichts am Inhalt', async ({
    page,
  }) => {
    await openEditor(page)
    await page.keyboard.type('unveraendert')
    const sheetBox = (await sheet(page).boundingBox())!
    // knapp OBERHALB des Blatts, im grauen Scroll-Hintergrund (py-6-Polster des Containers)
    await page.mouse.click(sheetBox.x + sheetBox.width / 2, Math.max(2, sheetBox.y - 10))
    await page.keyboard.type('W') // ohne Editor-Fokus landet das nirgends im Dokument
    await expect(editor(page)).toHaveText('unveraendert')
  })

  test('Testfall 15: Rand-Klicks funktionieren auch bei explizitem 100%-Zoom', async ({ page }) => {
    await openEditor(page)
    await page.keyboard.type('zoomzeile')
    // erst NACH dem Tippen zoomen — der Zoom-Button trägt den Fokus, bis der Rand-Klick ihn
    // an den Editor zurückgibt (genau das prüft dieser Test)
    await page.getByRole('button', { name: '100%', exact: true }).click()
    await clickPageMargin(page, 'above')
    await expect(editor(page)).toHaveClass(/ProseMirror-focused/)
    await page.keyboard.type('X')
    await expect(editor(page).locator('p').first()).toHaveText('Xzoomzeile')
  })
})

// ===========================================================================
// B4 — Ein neues/kurzes Dokument zeigt eine ganze A4-Seite
// ===========================================================================
test.describe('B4: volle A4-Seite', () => {
  // PAGE_HEIGHT_PX = 1123, PAGE_WIDTH_PX = 794 (A4 bei 96dpi, s. pageLayout.ts). Der Zoom
  // wird aus der gemessenen Breite abgeleitet, damit der Test auf Mobile (Fit-Zoom) und
  // Desktop gleichermaßen gilt.
  const PAGE_HEIGHT_PX = 1123
  const PAGE_WIDTH_PX = 794

  async function expectFullPages(page: Page, pages: number) {
    const box = (await sheet(page).boundingBox())!
    const zoom = box.width / PAGE_WIDTH_PX
    const expected = (pages * PAGE_HEIGHT_PX + (pages - 1) * 32) * zoom // 32 = Seiten-Trenner
    expect(box.height).toBeGreaterThanOrEqual(expected - 3)
    expect(box.height).toBeLessThanOrEqual(expected + 3)
  }

  test('Testfall 17: neues Dokument → das Blatt hat volle A4-Höhe, nicht nur Inhaltshöhe', async ({ page }) => {
    await openEditor(page)
    await expectFullPages(page, 1)
  })

  test('Testfall 18: eine kurze Textzeile ändert die volle Seitenhöhe nicht', async ({ page }) => {
    await openEditor(page)
    await page.keyboard.type('nur eine Zeile')
    await expectFullPages(page, 1)
  })

  test('Testfall 19: mehrseitiges Dokument → auch die letzte, teilgefüllte Seite hat volle Höhe', async ({
    page,
  }) => {
    await openEditor(page)
    // genug Inhalt für Seite 2, aber Seite 2 nur teilweise füllen
    await page.keyboard.type('Zeile mit etwas Text der die Seite fuellt. '.repeat(4))
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Enter')
      await page.keyboard.type(`Absatz ${i}`)
    }
    await expect(page.locator('.page-break-spacer')).toHaveCount(1)
    await expectFullPages(page, 2)
  })
})

// ===========================================================================
// B5 — Textfarbe wirkt immer
// ===========================================================================
test.describe('B5: Textfarbe/Hervorhebung bei kollabiertem Cursor', () => {
  test('Testfall 21: Farbe ohne Selektion wählen → getippter Text trägt die Farbe, Umgebung nicht', async ({
    page,
  }) => {
    await openEditor(page)
    await page.keyboard.type('normal ')
    await page.getByLabel('Textfarbe').fill('#ff0000')
    await page.keyboard.type('rot')
    const colored = editor(page).locator('span[style*="color"]')
    await expect(colored).toHaveText('rot')
    await expect(colored).toHaveCSS('color', 'rgb(255, 0, 0)')
    await expect(editor(page)).toContainText('normal rot')
  })

  test('Testfall 22: Hervorhebungsfarbe ohne Selektion → getippter Text ist hervorgehoben', async ({ page }) => {
    await openEditor(page)
    await page.keyboard.type('normal ')
    await page.getByLabel('Hervorhebungsfarbe').fill('#00ff00')
    await page.keyboard.type('markiert')
    const highlighted = editor(page).locator('span[style*="background"]')
    await expect(highlighted).toHaveText('markiert')
  })

  test('Testfall 23: Farbe vormerken, Cursor per Klick verschieben → vorgemerkte Farbe gilt dort nicht', async ({
    page,
  }) => {
    await openEditor(page)
    await page.keyboard.type('anfang ende')
    await page.getByLabel('Textfarbe').fill('#ff0000')
    // ProseMirror unterdrückt native Selektionsänderungen ~50ms nach dem view.focus() des
    // Farbwahl-Handlers (selectionToDOM-Suppression) — mit menschlichem Timing warten,
    // sonst wird die Cursorbewegung verschluckt und die Vormerkung „überlebt" nur im Test.
    await page.waitForTimeout(150)
    // Cursor per Klick an eine andere Stelle bewegen, ohne zu tippen → die Vormerkung
    // verfällt (Grenzfall 22 wörtlich: „Klick woanders hin"; Strg+Pos1 wäre auf dem
    // iPad-WebKit-Projekt keine Cursorbewegung).
    await editor(page).locator('p').first().click({ position: { x: 5, y: 5 } })
    await page.waitForTimeout(100)
    await page.keyboard.type('X')
    await expect(editor(page).locator('span[style*="color"]')).toHaveCount(0)
  })

  test('Testfall 24: Fett + Textfarbe kombiniert bei kollabiertem Cursor → beides am getippten Text', async ({
    page,
  }) => {
    await openEditor(page)
    await fettButton(page).click()
    await page.getByLabel('Textfarbe').fill('#0000ff')
    await page.keyboard.type('beides')
    const styled = editor(page).locator('span[style*="color"] strong, strong span[style*="color"]')
    await expect(styled.first()).toHaveText('beides')
  })

  test('Testfall 25: „Textfarbe entfernen" bei kollabiertem Cursor nimmt die Vormerkung zurück', async ({
    page,
  }) => {
    await openEditor(page)
    await page.getByLabel('Textfarbe').fill('#ff0000')
    // Accessible Name des Buttons ist sein Textinhalt „⌫" — über den Titel ansprechen
    await page.getByTitle('Textfarbe entfernen').click()
    await page.keyboard.type('ungefaerbt')
    await expect(editor(page).locator('span[style*="color"]')).toHaveCount(0)
    await expect(editor(page)).toContainText('ungefaerbt')
  })
})

// ===========================================================================
// Querschnitt — Mehrfach-Leerzeichen
// ===========================================================================
test('Testfall 26: drei aufeinanderfolgende Leerzeichen bleiben sichtbar und überstehen DOCX- und ODT-Rundreise', async ({
  page,
}) => {
  await openEditor(page, docxCard)
  // white-space: pre-wrap ist die Voraussetzung dafür, dass die Engine mehrere Leerzeichen rendert
  await expect(editor(page)).toHaveCSS('white-space', 'pre-wrap')
  await page.keyboard.type('a   b')
  await expect(editor(page).locator('p').first()).toHaveText('a   b')

  const docxBuffer = await exportBytes(page)
  const docXml = await (await JSZip.loadAsync(docxBuffer)).file('word/document.xml')!.async('text')
  expect(docXml).toContain('a   b')
  expect(docXml).toContain('xml:space="preserve"')
  await reimport(page, docxCard, 'spaces.docx', DOCX_MIME, docxBuffer)
  await expect(editor(page).locator('p').first()).toHaveText('a   b')

  // dasselbe als ODT (Kodierung über <text:s/>)
  await page.getByRole('button', { name: /formate/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await editor(page).click()
  await page.keyboard.type('a   b')
  const odtBuffer = await exportBytes(page)
  const contentXml = await (await JSZip.loadAsync(odtBuffer)).file('content.xml')!.async('text')
  expect(contentXml).toContain('<text:s')
  await reimport(page, odtCard, 'spaces.odt', ODT_MIME, odtBuffer)
  await expect(editor(page).locator('p').first()).toHaveText('a   b')
})

// ===========================================================================
// §4-Rundreisen
// ===========================================================================
test.describe('Rundreise B2: Absätze um Rand-Tabellen überstehen Export/Reimport', () => {
  /** Rand-Tabelle, per Gap-Cursor davor „davor" und danach „danach" schreiben. */
  async function buildBoundaryDoc(page: Page, card: (p: Page) => ReturnType<typeof odtCard>) {
    await tableOnlyDoc(page, card)
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.press('ArrowUp')
    await expectGapCursor(page)
    await page.keyboard.type('davor')
    await page.locator('.ProseMirror td').nth(3).click()
    await page.keyboard.press('ArrowDown')
    await expectGapCursor(page)
    await page.keyboard.type('danach')
  }

  for (const fmt of ['docx', 'odt'] as const) {
    test(`${fmt.toUpperCase()}: vor/nach der Rand-Tabelle geschriebene Absätze bleiben an ihrer Position`, async ({
      page,
    }) => {
      const card = fmt === 'docx' ? docxCard : odtCard
      await buildBoundaryDoc(page, card)
      const buffer = await exportBytes(page)
      const zip = await JSZip.loadAsync(buffer)
      const xml =
        fmt === 'docx'
          ? await zip.file('word/document.xml')!.async('text')
          : await zip.file('content.xml')!.async('text')
      const tableTag = fmt === 'docx' ? '<w:tbl' : '<table:table'
      expect(xml.indexOf('davor')).toBeGreaterThan(-1)
      expect(xml.indexOf('davor')).toBeLessThan(xml.indexOf(tableTag))
      expect(xml.indexOf('danach')).toBeGreaterThan(xml.indexOf(tableTag))

      await reimport(page, card, `boundary.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
      await expect(editor(page).locator('> p').first()).toHaveText('davor')
      await expect(editor(page).locator('> p').last()).toHaveText('danach')
      await expect(page.locator('.ProseMirror table')).toHaveCount(1)
      await expect(page.locator('.ProseMirror table tr')).toHaveCount(2)
    })
  }

  test('zwei Tabellen, Absatz dazwischen → liegt nach DOCX- und ODT-Rundreise weiterhin dazwischen', async ({
    page,
  }) => {
    for (const fmt of ['docx', 'odt'] as const) {
      const card = fmt === 'docx' ? docxCard : odtCard
      await tableOnlyDoc(page, card)
      await page.locator('.ProseMirror td').nth(3).click()
      await page.keyboard.press('ArrowDown')
      await insertTableViaDialog(page, 2, 2)
      await page.locator('.ProseMirror table').first().locator('td').nth(3).click()
      await page.keyboard.press('ArrowDown')
      await expectGapCursor(page)
      await page.keyboard.type('zwischen')

      const buffer = await exportBytes(page)
      await reimport(page, card, `between.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
      await expect(page.locator('.ProseMirror table')).toHaveCount(2)
      await expect(editor(page).locator('> p')).toHaveText(['zwischen'])
      await expect(page.locator('.ProseMirror > .tableWrapper + p + .tableWrapper')).toHaveCount(1)
    }
  })
})

test.describe('Rundreise B5: stored-mark-gefärbter Text übersteht Export/Reimport', () => {
  test('DOCX: ohne Selektion gefärbt getippter Text behält exakt die Farbe, Umgebung bleibt', async ({ page }) => {
    await openEditor(page, docxCard)
    await page.keyboard.type('normal ')
    await page.getByLabel('Textfarbe').fill('#ff0000')
    await page.keyboard.type('rot')
    const buffer = await exportBytes(page)
    const xml = await (await JSZip.loadAsync(buffer)).file('word/document.xml')!.async('text')
    expect(xml).toMatch(/<w:color w:val="(FF0000|ff0000)"/)

    await reimport(page, docxCard, 'farbe.docx', DOCX_MIME, buffer)
    const colored = editor(page).locator('span[style*="color"]')
    await expect(colored).toHaveText('rot')
    await expect(colored).toHaveCSS('color', 'rgb(255, 0, 0)')
    await expect(editor(page)).toContainText('normal rot')
  })

  test('ODT: ohne Selektion gefärbt getippter Text behält exakt die Farbe', async ({ page }) => {
    await openEditor(page, odtCard)
    await page.keyboard.type('normal ')
    await page.getByLabel('Textfarbe').fill('#ff0000')
    await page.keyboard.type('rot')
    const buffer = await exportBytes(page)
    const styles = await (await JSZip.loadAsync(buffer)).file('content.xml')!.async('text')
    expect(styles.toLowerCase()).toContain('fo:color="#ff0000"')

    await reimport(page, odtCard, 'farbe.odt', ODT_MIME, buffer)
    const colored = editor(page).locator('span[style*="color"]')
    await expect(colored).toHaveText('rot')
    await expect(colored).toHaveCSS('color', 'rgb(255, 0, 0)')
  })

  test('Fett + Farbe kombiniert bei kollabiertem Cursor → beide überstehen DOCX- UND ODT-Rundreise', async ({
    page,
  }) => {
    for (const fmt of ['docx', 'odt'] as const) {
      const card = fmt === 'docx' ? docxCard : odtCard
      await openEditor(page, card)
      await fettButton(page).click()
      await page.getByLabel('Textfarbe').fill('#0000ff')
      await page.keyboard.type('beides')
      const buffer = await exportBytes(page)
      await reimport(page, card, `kombi.${fmt}`, fmt === 'docx' ? DOCX_MIME : ODT_MIME, buffer)
      const styled = editor(page).locator('span[style*="color"] strong, strong span[style*="color"]')
      await expect(styled.first()).toHaveText('beides')
      await expect(editor(page).locator('strong')).toHaveText('beides')
    }
  })
})
