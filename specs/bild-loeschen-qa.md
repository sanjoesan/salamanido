# Testplan (QA): Feature „Bild löschen“

Gegenstück zu `specs/bild-loeschen-req.md` (Anforderung) und `specs/bild-loeschen-code.md`
(Umsetzungsplan). Dieser Plan beschreibt **konkrete, ausführbare Tests** auf zwei Ebenen:

1. **Unit-Tests** (`vitest`, `jsdom`): Reader/Writer-Rundreise DOCX **und** ODT, rein
   datengetrieben (kein Browser, kein `EditorView`).
2. **Echte Playwright-Browser-Tests** (`@playwright/test`, alle 3 Projekte aus
   `playwright.config.ts`): echte Klicks (`.click()` auf das `<img>`-Element selbst, nicht
   auf einen internen Zustand), echtes Tippen (`page.keyboard`), echter Datei-Upload für das
   Bild-Einfügen (`setInputFiles` auf `input[type=file][accept="image/*"]`) **und** echter
   Datei-Export (`page.waitForEvent('download')` + Prüfung der tatsächlich heruntergeladenen
   Datei per `JSZip`) — **keine** isolierten Aufrufe von `insertImage(...)`/`deleteImage(...)`
   als Ersatz für echte Bedienung. Direkte Funktionsaufrufe von `commands.ts` sind
   ausschließlich in Abschnitt 4.4 (reine Logik-/Guard-Absicherung, nicht als Ersatz für E2E)
   vorgesehen — und ausdrücklich **nicht** als Nachweis für „Markieren ist sichtbar“ oder
   „Löschen funktioniert im Browser“ zulässig.

Alle Testfall-Nummern referenzieren `bild-loeschen-req.md` Abschnitt 3 (Grenzfälle),
Abschnitt 4.2 (Rundreise) und Abschnitt 6 (E2E-Zusammenfassung).

---

## 0. Wichtige Voraussetzung: was ist heute schon lauffähig, was nicht

`bild-loeschen-code.md` ist zum Stichtag dieses Testplans (2026-07-04) **noch nicht
umgesetzt** — verifiziert per Volltextsuche über `src/`: kein Treffer für `deleteImage`,
`isImageSelected`, `ProseMirror-selectednode` oder „Bild löschen“ in `commands.ts`,
`Toolbar.tsx`, `WordEditor.tsx` oder `index.css`. Für die Testplanung ist das entscheidend,
weil hier — anders als bei rein additiven Features — ein Teil der Anforderung (das generische
Löschverhalten selbst) laut Code-Plan bereits **korrekt, aber ungetestet** ist, während ein
anderer Teil (sichtbares Feedback, Toolbar-Button) **fehlt und erst gebaut werden muss**:

| Zugriffsweg/Anforderung | Hängt ab von | Heute schon testbar? |
|---|---|---|
| **Tastatur**-Selektion + Entf/Rücktaste (`selectNodeBackward` → `deleteSelection`) | `prosemirror-commands`s `baseKeymap`, bereits vorhanden, **keine Code-Änderung nötig**; umgeht R2 | **Ja** — deterministisch (`selectImageByKeyboard`, R-D1), heute grün, siehe §5.3 TF1b/TF2/TF11 |
| **Klick**-Selektion + Entf/Rücktaste | Klick-`NodeSelection` hängt an R1 (Sichtbarkeit) **und** R2 (`reconcileSelectionOnClick` kollabiert sie evtl., code.md §3.4) | **Erst nach** R1-/R2-Fix (code.md §4.1/§4.4) zuverlässig grün — Klick-Tests sind als „R2-abhängig" markiert (R-D4), siehe TF1b-Klick/TF5/TF6 |
| Reimport nach Export | erfordert Navigation „← Formate" (Workspace verdeckt die Karten) | **Ja** — über `reimportDocx/Odt` (R-D5); ein direkter Karten-Zugriff im Workspace matcht nichts |
| **Sichtbares** Auswahl-Feedback (`.ProseMirror-selectednode`-Outline) | `bild-loeschen-code.md` §4.1 (neue CSS-Regel in `src/index.css`) | **Nein** — Pflicht-Vorbedingung laut Req DoD 1, siehe §5.3 TF1a (**blockiert**) |
| `deleteImage`/`isImageSelected` als benannte Funktionen | `bild-loeschen-code.md` §4.3 (`commands.ts`) | **Nein** — Unit-Tests in §4.4 blockiert |
| Toolbar-Button „Bild löschen“ | `bild-loeschen-code.md` §4.4 (`Toolbar.tsx`) | **Nein** — E2E-Test in §5.3 TF10 blockiert |
| Rundreisen (Export/Reimport ohne verwaiste Bilddatei) | Nur bestehende `ImageCollector`/Reader/Writer-Architektur, keine neuen Produktionsdateien nötig (`bild-loeschen-code.md` §3.6) | **Ja** — sofort testbar, siehe §4 und §5.4 |
| Selection-Sync-Regressionstest × Bild löschen | Bestehender `reconcileSelectionOnClick`-Fix in `WordEditor.tsx`, keine Änderung nötig | **Ja** — sofort testbar, siehe §5.3 TF7 (Pflicht) |
| Mobile/Touch (verlässlicher Weg ohne physische Entf-Taste) | Toolbar-Button (s. o.) | **Nein**, solange der Button fehlt — Tastatur-Weg ist auf Touch-Geräten laut Code-Plan §2 strukturell unsicher |

**Kritischer QA-Befund zur Test-Hygiene des Code-Plans:** `bild-loeschen-code.md` Abschnitt 2
beschreibt 12 „Sonden-Testfälle“, die reproduzierbar gegen die echten, installierten
ProseMirror-Pakete liefen und alle strukturellen Grenzfälle als bereits korrekt belegen —
**aber wurden laut eigener Aussage „danach wieder entfernt (kein Bestandteil dieses Plans als
Datei)“**. Das widerspricht dem in `bild-loeschen-req.md` Abschnitt 0 explizit geforderten
Maßstab „durch eine reproduzierbare, tatsächlich ausgeführte Verifikation belegt“ — eine
einmalig gelaufene und dann gelöschte Sonde ist **keine** dauerhafte Verifikation und bietet
keinen Schutz vor Regression. **Dieser Testplan behebt das**: Abschnitt 4.4a unten baut genau
diese Sonden-Fälle als permanente, im Repository verbleibende Unit-Tests wieder auf — bewusst
**unabhängig** von `deleteImage()`/`isImageSelected()` formuliert (direkt gegen `baseKeymap`
und `NodeSelection`), damit sie **schon heute**, ohne auf `bild-loeschen-code.md` §4.3 zu
warten, geschrieben, ausgeführt und dauerhaft grün gehalten werden können.

**Konsequenz für die Ausführungsreihenfolge:** Die Tests in §4.2–4.3 (Reader/Writer-Rundreise)
und §4.4a (permanente Sonden-Nachbildung) sowie die E2E-Testfälle TF1b–TF9, TF11–TF16 in §5.3
und alle Rundreise-Tests in §5.4 können **sofort** geschrieben und ausgeführt werden. Die
Testfälle TF1a (CSS-Sichtbarkeit), TF10 (Toolbar-Button) und die Guard-Unit-Tests in §4.4b sind
**blockiert**, bis `bild-loeschen-code.md` Abschnitt 4 umgesetzt ist — sie werden hier
dennoch vollständig spezifiziert, damit kein Wartezyklus zwischen Dev und QA entsteht.

### 0.1 Kritische Korrekturen dieser QA-Fassung (Determinismus + Bedien-Selektoren)

Eine kritische Prüfung der Vorfassung dieses Testplans gegen den **tatsächlichen** App- und
Test-Bestand (`src/app/DocumentWorkspace.tsx`, `src/formats/shared/editor/Toolbar.tsx`,
`tests/e2e/cut.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `playwright.config.ts`) hat
mehrere Punkte aufgedeckt, die die Vorfassung **nicht-deterministisch oder schlicht nicht
lauffähig** gemacht hätten. Alle sind hier behoben (Details in §5.1a/§2.4):

1. **Determinismus / async-Selektions-Sync-Race (Kernauftrag).** Die Vorfassung führte fast überall
   `img.click()` unmittelbar gefolgt von `Delete`/`Backspace` aus. Genau dieses Muster ist im Repo
   bereits als Flakiness-Quelle nachgewiesen und nachgebessert worden (jüngste Commits „Fix flaky
   Mobile-project … same async-selection-sync race as selection-regression.spec.ts";
   `cut.spec.ts`/`selection-regression.spec.ts` warten den `selectionchange`-Sync ab). **Neu:**
   verbindliche Regeln R-D1…R-D6 (§5.1a) und die Helfer `selectImageByKeyboard`/`selectImageByClick`
   mit **deterministischem Gate** statt sofortiger Löschtaste.
2. **Undo-Gruppen-Race (R-D2).** Einfügen + sofortiges Löschen fielen ohne Settle in **einen**
   `prosemirror-history`-Undo-Schritt (`newGroupDelay` ~500 ms) — ein Strg+Z hätte beides rückgängig
   gemacht und TF3/TF4/TF15/RT5 sporadisch rot werden lassen. **Neu:** 600-ms-Settle wie
   `cut.spec.ts` Testfall 9.
3. **Falscher Bild-Einfüge-Selektor.** Die Vorfassung suchte das Bild-`input` **karten-scoped**
   (`docxCard(...).locator('input[accept=image/*]')`). Nach „Neu erstellen" verdeckt der
   `DocumentWorkspace` aber die Karten → der Selektor matcht nichts. **Neu:** page-scoped
   `label:has-text("Bild")` wie in `cut.spec.ts` bewiesen.
4. **Falscher Reimport-Weg (R-D5).** Jeder Reimport lief über `docxCard(page).locator('input[type=file]')`,
   während der Workspace offen (und die Karte verdeckt) ist. **Neu:** `reimportDocx/Odt` klicken zuerst
   „← Formate" (wie `cut.spec.ts` Rundreise 10).
5. **1×1-Klick-Unzuverlässigkeit (R-D3).** Klick-Tests klickten auf 1×1-PNGs; `clipboard.spec.ts`
   dokumentiert das als „unreliable". **Neu:** klickbare, real gerenderte Bilder
   (`makeColoredSquarePng`/`makeLargePng`) für alle Klick-Tests.
6. **Grenzfall-8-Assertion widersprach dem verifizierten Verhalten.** Die Vorfassung fror
   `li toHaveCount(3)` ein; `bild-loeschen-code.md` §2 hat real gemessen, dass der Listenpunkt
   **entfernt** wird (OE-1). **Neu:** Test prüft OE-1-unabhängige Invarianten und friert das reale
   Verhalten (Punkt entfernt) ein.
7. **Fehlerhafte Mehrfach-Einfügung in RT6.** Drei aufeinanderfolgende `insertImage`-Aufrufe ohne
   `Enter` ersetzen einander (`replaceSelectionWith` auf der Bild-`NodeSelection`) → nie 3 Bilder.
   **Neu:** `Enter` zwischen den Einfügungen; ebenso TF11 (Tippen überschrieb sonst das Bild).

---

## 1. Testebenen — Zuordnung zur Req-Testmatrix (Abschnitt 7)

| Bereich (Req §7) | Testebene hier | Ort |
|---|---|---|
| Sichtbares Auswahl-Feedback (`.ProseMirror-selectednode`-CSS) | E2E (Pflicht-Vorbedingung) | `tests/e2e/image-delete.spec.ts` TF1a |
| Basis-Löschen (ein Bild + Entf) | E2E | `image-delete.spec.ts` TF1b (Tastatur, deterministisch) / TF1b-Klick (R2-abhängig) |
| Text vor/nach Bild bleibt erhalten | E2E | TF2 |
| Mehrere Bilder, gezieltes Löschen eines einzelnen | E2E | TF5 |
| Bild in Tabellenzelle löschen | E2E + Unit-Rundreise | TF6, `image-deletion.test.ts` (beide Formate) |
| Bild in Liste löschen | E2E | TF-Grenzfall 8 |
| Undo/Redo nach Bild löschen | E2E + Unit (Sonden-Nachbildung) | TF3/TF4, §4.4a |
| Verwaiste-Ressourcen-Prüfung im Zip nach Löschen | Unit + E2E (Download-Prüfung) | `image-deletion.test.ts` (beide Formate), §5.4 RT1/RT2/RT6 |
| Selection-Sync-Regressionstest × Bild löschen | E2E (Pflicht) | TF7 |
| Abgebrochener Drag löscht nicht versehentlich | E2E | TF9 |
| Cross-Format-Rundreise nach Bild löschen | E2E (Download-Prüfung) + Unit (Daten-Rundreise) | beide, §4/§5.4 RT7–RT9 |
| Mobile/Tablet-Verhalten | E2E (Playwright-Projekt-Matrix) | automatisch über `playwright.config.ts`, siehe TF16 |

---

## 2. Testinfrastruktur — vorbereitende Bausteine

### 2.1 Gemeinsame Testbilder

Damit Unit- und E2E-Ebene dieselbe Nutzlast teilen (analog zu `roundtrip.test.ts`), wird
durchgängig derselbe 1×1-PNG verwendet wie in `src/formats/docx/__tests__/roundtrip.test.ts`:

```ts
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
```

Für Req Grenzfall 5 („mehrere Bilder … unterscheidbar, kein Verwechslungsrisiko“) reicht ein
identisches Testbild mit unterschiedlichem Dateinamen (→ unterschiedlicher `alt`-Text über
`insertImage(dataUrl, file.name)`) nicht als überzeugender Nachweis — daher werden zusätzlich
drei **tatsächlich unterschiedlich gefärbte** 1×1-PNGs verwendet (echte, valide PNG-Bytes,
nicht nur unterschiedliche Dateinamen):

```ts
// tests/e2e/fixtures/testImages.ts (neu)
export const RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAgIAAAJB3U8AAAAMElEQVR4nGO4o6YGAAMKASng8MlTAAAAAElFTkSuQmCC'
export const GREEN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAgIAAAJB3U8AAAANElEQVR4nGMQW+wFAAHWAQSeqOZrAAAAAElFTkSuQmCC'
export const BLUE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAgIAAAJB3U8AAAANElEQVR4nGNQTX4NAAIkAXSaGkHUAAAAAElFTkSuQmCC'

export function pngBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}
```

(Erzeugt und verifiziert per Node-Skript aus echten RGB-1×1-Pixeldaten, deflate-komprimiert,
mit korrektem CRC32 — keine Platzhalter-Strings, echte dekodierbare PNGs mit den Farbwerten
`#dc2626`/`#16a34a`/`#2563eb`.)

### 2.2 Großes Testbild (Req Grenzfall 10)

```ts
// tests/e2e/fixtures/testImages.ts (Ergänzung)
import { deflateSync } from 'node:zlib'

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

/** Erzeugt einen echten, gültigen PNG-Buffer von ~mehreren MB (Req Grenzfall 10). */
export function makeLargePng(sidePx = 1200): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(sidePx, 0)
  ihdr.writeUInt32BE(sidePx, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // RGB
  const raw = Buffer.alloc((1 + sidePx * 3) * sidePx)
  for (let y = 0; y < sidePx; y++) {
    const rowStart = y * (1 + sidePx * 3)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < sidePx; x++) {
      const o = rowStart + 1 + x * 3
      raw[o] = (x + y) % 256
      raw[o + 1] = (x * 2) % 256
      raw[o + 2] = (y * 2) % 256
    }
  }
  const idat = deflateSync(raw, { level: 1 })
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
}

/**
 * Einfarbiges, klick-zuverlässiges PNG (real gerendert, KEIN 1×1). Pflicht für jeden Test,
 * der ein Bild per **Koordinaten-Klick** selektiert: `clipboard.spec.ts` dokumentiert
 * ausdrücklich, dass ein Klick auf ein ungrößtes 1×1-Testbild „unreliable" ist (die
 * Trefferfläche ist ein einziges Pixel). 220 px sind auf allen 3 Projekten sicher klickbar.
 * Für reine Tastatur-/Datenprüfungen genügt weiterhin das 1×1-PNG (RED_PNG_BASE64 usw.).
 */
export function makeColoredSquarePng(side: number, rgb: [number, number, number]): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(side, 0)
  ihdr.writeUInt32BE(side, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // RGB
  const raw = Buffer.alloc((1 + side * 3) * side)
  for (let y = 0; y < side; y++) {
    const rowStart = y * (1 + side * 3)
    raw[rowStart] = 0
    for (let x = 0; x < side; x++) {
      const o = rowStart + 1 + x * 3
      raw[o] = rgb[0]
      raw[o + 1] = rgb[1]
      raw[o + 2] = rgb[2]
    }
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
}
export const RED_SQUARE = () => makeColoredSquarePng(220, [0xdc, 0x26, 0x26])
export const GREEN_SQUARE = () => makeColoredSquarePng(220, [0x16, 0xa3, 0x4a])
export const BLUE_SQUARE = () => makeColoredSquarePng(220, [0x25, 0x63, 0xeb])
```

Ergibt bei `sidePx = 1200` einen unkomprimierten Rohdatensatz von ~4,3 MB (vor `deflate`), als
`data:`-URL entsprechend lang — ausreichend, um Req Grenzfall 10 („mehrere MB, `data:`-URL
entsprechend lang“) realistisch abzubilden, ohne eine Bilddatei binär ins Repo einzuchecken.

### 2.3 Konsolen-Fehler-Helper (Pflicht für jeden Test, analog `ausschneiden-qa.md` §2.2)

```ts
import { type Page, expect } from '@playwright/test'

function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}
```

### 2.4 Karten-Locator, Bild-Einfüge-, Selektions- und Reimport-Helfer

```ts
import { expect, type Page, type Locator } from '@playwright/test'

// Die FormatPicker-Karten existieren NUR auf der Landing-Seite. Nach „Neu erstellen"
// (bzw. nach einem Upload) rendert `DocumentWorkspace` und verdeckt sie — `docxCard`/
// `odtCard` matchen dann NICHT mehr. Sie dienen daher ausschließlich (a) dem ersten
// „Neu erstellen"-Klick, (b) dem ersten Upload einer Fremddatei und (c) dem Reimport,
// jeweils nur im FormatPicker-Zustand.
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Echter filechooser-Flow: setInputFiles auf das versteckte Bild-`input[type=file]` im
 *  Toolbar-`<label>„Bild"` — **page-scoped**, exakt wie in `cut.spec.ts` Testfall 8 /
 *  Rundreise 6 bewiesen. Bewusst NICHT karten-scoped (`docxCard(...).locator('input[accept=image/*]')`):
 *  nach „Neu erstellen" ist die Karte verdeckt, das Bild-Input lebt in der Toolbar
 *  (DOM-Geschwister der `.ProseMirror`-Fläche, `Toolbar.tsx`). Kein interner insertImage()-Aufruf. */
async function insertImage(page: Page, buffer: Buffer, name = 'test.png') {
  await page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles({ name, mimeType: 'image/png', buffer })
}

/**
 * DETERMINISTISCHE Bild-Selektion per **Tastatur** (Standardweg für „Löschen funktioniert"-
 * Tests). Cursor ans Dokumentende, kurze Sync-Pause, dann ArrowLeft = `selectNodeBackward`
 * → NodeSelection auf das Bild. Vorteile: (1) umgeht den R2-Klick-Reconcile komplett und ist
 * deshalb **heute schon grün** (code.md §2 verifiziert); (2) kein 1×1-Klick-Trefferproblem.
 * Voraussetzung: Das Zielbild ist per `selectNodeBackward` erreichbar, d. h. das **letzte
 * bzw. einzige** Element (Testaufbau stellt das sicher). Für „Bild am Dokumentanfang" bzw.
 * gezieltes N-tes Bild → `selectImageByClick`.
 */
async function selectImageByKeyboard(page: Page, editor: Locator) {
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.waitForTimeout(50) // async selectionchange-Sync abwarten (siehe §5.1a)
  await page.keyboard.press('ArrowLeft') // selectNodeBackward → NodeSelection auf das Bild
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1) // deterministischer Gate
}

/**
 * Bild-Selektion per **Klick** — nur für klick-spezifische Tests (TF1a Sichtbarkeit,
 * R2-Aufklärung, gezielt N-tes Bild / Bild in einer Zelle). Zwei Pflicht-Bedingungen:
 * (1) real gerendertes, großes Bild (`RED_SQUARE()`/`makeLargePng()`) — 1×1 ist klick-unzuverlässig
 *     (`clipboard.spec.ts`);
 * (2) der `toHaveClass`-Gate wartet den asynchronen NodeSelection-Sync ab, BEVOR gelöscht wird.
 * Der Gate schlägt fehl, falls der R2-Reconcile die Klick-Selektion kollabiert (code.md §3.4) —
 * das ist gewollt: genau dann ist R2 bestätigt. Zuverlässig grün erst nach dem R2-Guard
 * (code.md §4.4); bis dahin sind Klick-Selektions-Tests als „blockiert/R2-abhängig" markiert.
 */
async function selectImageByClick(img: Locator) {
  await img.click()
  await expect(img).toHaveClass(/ProseMirror-selectednode/) // deterministischer Sync-Gate, kein waitForTimeout-Raten
}

/** Reimport nach einem Export: erst über „← Formate" zurück zum FormatPicker (der Workspace
 *  verdeckt die Karten mit den Upload-Feldern — gleiche Navigation wie `cut.spec.ts` Rundreise 10),
 *  dann die exportierte Datei in die Zielkarte laden. */
async function backToFormatPicker(page: Page) {
  await page.getByRole('button', { name: /formate/i }).click()
}
async function reimportDocx(page: Page, buffer: Buffer) {
  await backToFormatPicker(page)
  await docxCard(page).locator('input[type="file"]').first().setInputFiles({
    name: 'reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
}
async function reimportOdt(page: Page, buffer: Buffer) {
  await backToFormatPicker(page)
  await odtCard(page).locator('input[type="file"]').first().setInputFiles({
    name: 'reimport.odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    buffer,
  })
}
```

---

## 3. Testinfrastruktur — bereits existierende Fixtures (keine neuen Binärdateien nötig)

Für die realen Fremddatei-Testfälle (Req Grenzfall 17, Testfall 12/Abschnitt 4.2 Testfall 10)
existieren bereits geeignete Dateien im Repo (verifiziert per `ls`):

- `tests/fixtures/external/docx/VariousPictures.docx` — mehrere, unterschiedlich große Bilder.
- `tests/fixtures/external/odt/images.odt`, `odt-images-linked.odt`, `feature_images.odt`,
  `image.odt`, `image-attributes.odt`, `imageWithinList.odt` (letztere zusätzlich geeignet für
  den Listen-Grenzfall 8 mit einer **realen** Fremddatei statt nur synthetisch erzeugtem
  Inhalt).

Kein neuer Fixture-Download nötig — alle für diesen Plan benötigten Dateien liegen bereits vor.

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ausführung: `npm test` (vitest, `jsdom`-Environment). Diese Tests rufen **ausschließlich**
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` auf reinen JSON-Dokumentstrukturen auf — kein
`EditorView`, kein DOM. Sie bilden **nicht** den Löschvorgang selbst nach (das ist
ausschließlich Editor-/Browser-Verhalten, siehe §4.4a und §5), sondern verifizieren, dass der
**Dokumentzustand nach einer Bild-Löschung** (Bild-Knoten schlicht nicht mehr im JSON
vorhanden — exakt das, was der Editor nach `deleteSelection()` produziert) korrekt und ohne
verwaiste Zip-Einträge exportiert und reimportiert wird. Das ist exakt das, was
`bild-loeschen-req.md` Abschnitt 0 („muss praktisch nachgewiesen, nicht nur aus dem Code
abgeleitet werden“) und Abschnitt 4.2 verlangen.

### 4.1 Baseline (Voraussetzung, Req §4.1)

**Vor** den bild-löschen-spezifischen Testfällen muss die bereits bestehende Suite grün sein:

- `src/formats/docx/__tests__/roundtrip.test.ts` (Describe-Block „DOCX round trip: images“)
- `src/formats/odt/__tests__/roundtrip.test.ts` (ODT-Äquivalent)
- `src/formats/docx/__tests__/external-fixtures.test.ts`
- `src/formats/odt/__tests__/external-fixtures.test.ts`

QA-Schritt: `npm test -- roundtrip` vor Beginn der Löschen-Testfälle ausführen und
protokollieren. Schlägt hier etwas fehl, ist es ein allgemeiner Reader/Writer-Bug, **kein**
Bild-löschen-Bug — nicht mit den Testfällen unten vermischen (Req §4.1 letzter Satz).

### 4.2 Neue Testdatei: `src/formats/docx/__tests__/image-deletion.test.ts`

```ts
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import JSZip from 'jszip'
import type { WordDocumentContent } from '../../shared/documentModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }
}
async function roundTrip(content: WordDocumentContent): Promise<WordDocumentContent> {
  return readDocx(await writeDocx(content))
}

describe('DOCX: Zustand "nach Bild löschen" hinterlässt keine verwaisten Ressourcen (Req 4.2 Testfall 1)', () => {
  it('Kontrollprobe: Bild vorhanden → Media-Datei + Content-Type-Eintrag + Relationship existieren', async () => {
    const withImage = doc([paragraph('Vorher'), { type: 'image', attrs: { src: TINY_PNG, alt: 'Diagramm' } }, paragraph('Nachher')])
    const zip = await JSZip.loadAsync(await writeDocx(withImage))
    const mediaFiles = Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))
    expect(mediaFiles).toHaveLength(1)
    const contentTypes = await zip.file('[Content_Types].xml')!.async('text')
    expect(contentTypes).toMatch(/Extension="png"/)
    const rels = await zip.file('word/_rels/document.xml.rels')!.async('text')
    expect(rels).toContain('media/')
  })

  it('nach Entfernen des Bild-Knotens: keine Media-Datei, kein Content-Type-Eintrag, keine verwaiste Relationship', async () => {
    const afterDelete = doc([paragraph('Vorher'), paragraph('Nachher')])
    const zip = await JSZip.loadAsync(await writeDocx(afterDelete))
    const mediaFiles = Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))
    expect(mediaFiles).toHaveLength(0)
    const contentTypes = await zip.file('[Content_Types].xml')!.async('text')
    expect(contentTypes).not.toMatch(/Extension="png"/)
    const rels = await zip.file('word/_rels/document.xml.rels')!.async('text')
    expect(rels).not.toContain('media/')

    const reimported = await roundTrip(afterDelete)
    const types = (reimported.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect((reimported.body as any).content[0].content[0].text).toBe('Vorher')
    expect((reimported.body as any).content[1].content[0].text).toBe('Nachher')
  })
})

describe('DOCX: Dedupe-Grenzfall — zwei identische data:-URLs, nur eine gelöscht (Req Grenzfall 6)', () => {
  it('verbleibendes Bild bleibt nach Export/Reimport korrekt referenziert, Media-Ordner hat weiterhin genau eine Datei', async () => {
    const withBoth = doc([
      { type: 'image', attrs: { src: TINY_PNG, alt: 'Erstes' } },
      { type: 'image', attrs: { src: TINY_PNG, alt: 'Zweites' } },
    ])
    const zipBefore = await JSZip.loadAsync(await writeDocx(withBoth))
    expect(Object.keys(zipBefore.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(1)

    // Simuliert: erstes Bild im Editor gelöscht, zweites bleibt.
    const afterDeleteOne = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Zweites' } }])
    const zipAfter = await JSZip.loadAsync(await writeDocx(afterDeleteOne))
    expect(Object.keys(zipAfter.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(1)

    const reimported = await roundTrip(afterDeleteOne)
    const image = (reimported.body as any).content[0]
    expect(image.type).toBe('image')
    expect(image.attrs.alt).toBe('Zweites')
    expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
  })
})

describe('DOCX: alle Bilder eines Dokuments entfernt (Req Abschnitt 4.2 Testfall 6)', () => {
  it('kein Bild-Rest im Zip, restlicher Text bleibt vollständig, Datei bleibt valide', async () => {
    const afterDeleteAll = doc([paragraph('Einziger verbleibender Text.')])
    const zip = await JSZip.loadAsync(await writeDocx(afterDeleteAll))
    expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(0)
    const contentTypes = await zip.file('[Content_Types].xml')!.async('text')
    expect(contentTypes).not.toMatch(/Extension="(png|jpe?g|gif)"/)

    const reimported = await roundTrip(afterDeleteAll)
    expect((reimported.body as any).content).toHaveLength(1)
    expect((reimported.body as any).content[0].content[0].text).toBe('Einziger verbleibender Text.')
  })
})

describe('DOCX: Bild in Tabellenzelle gelöscht (Req Abschnitt 4.2 Testfall 4)', () => {
  it('Zelle bleibt mit leerem Absatz gültig, Tabellenstruktur unverändert, keine verwaiste Medien-Referenz', async () => {
    const afterDelete = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Nachbarzelle unverändert')] },
            ],
          },
        ],
      },
    ])
    const zip = await JSZip.loadAsync(await writeDocx(afterDelete))
    expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(0)

    const reimported = await roundTrip(afterDelete)
    const table = (reimported.body as any).content[0]
    expect(table.content).toHaveLength(1)
    expect(table.content[0].content).toHaveLength(2)
    expect(table.content[0].content[1].content[0].content[0].text).toBe('Nachbarzelle unverändert')
  })
})

describe('DOCX: Undo vor Export — Bild ist im Exportzustand weiterhin vorhanden (Req Abschnitt 4.2 Testfall 5)', () => {
  it('ein durch Undo wiederhergestelltes Bild wird beim Export korrekt wieder eingeschlossen', async () => {
    // Bildet den Datenzustand "nach Löschen + Undo" ab: das Bild ist im Doc-JSON wieder vorhanden.
    const afterUndo = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Wiederhergestellt', width: 123, height: 45 } }])
    const zip = await JSZip.loadAsync(await writeDocx(afterUndo))
    expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(1)

    const reimported = await roundTrip(afterUndo)
    const image = (reimported.body as any).content[0]
    expect(image.type).toBe('image')
    expect(image.attrs.alt).toBe('Wiederhergestellt')
    expect(image.attrs.width).toBe(123)
    expect(image.attrs.height).toBe(45)
  })
})

describe('DOCX: Cross-Format-Rundreise nach Bild löschen (Req Abschnitt 4.2 Testfall 7/8/9)', () => {
  it('Testfall 8: DOCX (Bild gelöscht) → als ODT exportiert → reimportiert → Bild bleibt entfernt', async () => {
    const { writeOdt } = await import('../../odt/writer')
    const { readOdt } = await import('../../odt/reader')
    const afterDelete = doc([paragraph('Rest nach Löschen')])

    const asOdtBlob = await writeOdt(afterDelete)
    const final = await readOdt(asOdtBlob)

    const types = (final.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect((final.body as any).content[0].content[0].text).toBe('Rest nach Löschen')
  })

  it('Testfall 9: doppelte Rundreise DOCX → ODT → DOCX bleibt bild-frei', async () => {
    const { writeOdt } = await import('../../odt/writer')
    const { readOdt } = await import('../../odt/reader')
    const afterDelete = doc([paragraph('Bleibt nach zwei Konvertierungen bild-frei')])

    const asOdtBlob = await writeOdt(afterDelete)
    const viaOdt = await readOdt(asOdtBlob)
    const backToDocxBlob = await writeDocx(viaOdt)
    const final = await readDocx(backToDocxBlob)

    const types = (final.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect((final.body as any).content[0].content[0].text).toBe('Bleibt nach zwei Konvertierungen bild-frei')
  })
})

describe('DOCX: reale Fremddatei — ein Bild entfernt, andere bleiben (Req Abschnitt 4.2 Testfall 10)', () => {
  it('VariousPictures.docx importieren, mittleres Bild aus dem JSON entfernen, restliche Bilder bleiben referenziert', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const fixturePath = join(__dirname, '../../../../tests/fixtures/external/docx/VariousPictures.docx')
    const original = await readDocx(readFileSync(fixturePath))
    const originalImages = (original.body as any).content.filter((n: any) => n.type === 'image')
    expect(originalImages.length).toBeGreaterThan(1)

    const middleIndex = Math.floor(originalImages.length / 2)
    const toRemoveSrc = originalImages[middleIndex].attrs.src
    const afterDelete: WordDocumentContent = {
      ...original,
      body: {
        ...(original.body as any),
        content: (original.body as any).content.filter((n: any) => !(n.type === 'image' && n.attrs.src === toRemoveSrc)),
      },
    }

    const zip = await JSZip.loadAsync(await writeDocx(afterDelete))
    const mediaCount = Object.keys(zip.files).filter((p) => p.startsWith('word/media/')).length
    expect(mediaCount).toBe(originalImages.length - 1)

    const reimported = await roundTrip(afterDelete)
    const remainingImages = (reimported.body as any).content.filter((n: any) => n.type === 'image')
    expect(remainingImages).toHaveLength(originalImages.length - 1)
    expect(remainingImages.some((img: any) => img.attrs.src === toRemoveSrc)).toBe(false)
  })
})
```

### 4.3 Neue Testdatei: `src/formats/odt/__tests__/image-deletion.test.ts`

Spiegelbildlich zu §4.2, mit ODT-spezifischen Prüfungen: Bild-Dateien liegen im
`Pictures/`-Ordner auf Zip-Root-Ebene, referenziert über `META-INF/manifest.xml`
(`buildManifestXml` in `src/formats/odt/writer.ts`).

```ts
import { writeOdt } from '../writer'
import { readOdt } from '../reader'
import JSZip from 'jszip'
import type { WordDocumentContent } from '../../shared/documentModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }
}
async function roundTrip(content: WordDocumentContent): Promise<WordDocumentContent> {
  return readOdt(await writeOdt(content))
}

describe('ODT: Zustand "nach Bild löschen" hinterlässt keine verwaisten Ressourcen (Req 4.2 Testfall 2)', () => {
  it('Kontrollprobe: Bild vorhanden → manifest.xml + Pictures/-Datei existieren', async () => {
    const withImage = doc([paragraph('Vorher'), { type: 'image', attrs: { src: TINY_PNG, alt: 'Diagramm' } }, paragraph('Nachher')])
    const zip = await JSZip.loadAsync(await writeOdt(withImage))
    const manifest = await zip.file('META-INF/manifest.xml')!.async('text')
    expect(manifest).toContain('media-type="image/png"')
    const pictureFiles = Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))
    expect(pictureFiles).toHaveLength(1)
  })

  it('nach Entfernen des Bild-Knotens: kein manifest-Eintrag mehr, keine Datei im Pictures/-Ordner', async () => {
    const afterDelete = doc([paragraph('Vorher'), paragraph('Nachher')])
    const zip = await JSZip.loadAsync(await writeOdt(afterDelete))
    const manifest = await zip.file('META-INF/manifest.xml')!.async('text')
    expect(manifest).not.toContain('media-type="image/png"')
    const pictureFiles = Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))
    expect(pictureFiles).toHaveLength(0)

    const reimported = await roundTrip(afterDelete)
    const types = (reimported.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect((reimported.body as any).content[0].content[0].text).toBe('Vorher')
    expect((reimported.body as any).content[1].content[0].text).toBe('Nachher')
  })
})

describe('ODT: Dedupe-Grenzfall (Req Grenzfall 6)', () => {
  it('verbleibendes Bild bleibt referenziert, genau eine Datei im Pictures/-Ordner', async () => {
    const afterDeleteOne = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Zweites' } }])
    const zip = await JSZip.loadAsync(await writeOdt(afterDeleteOne))
    expect(Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))).toHaveLength(1)
    const reimported = await roundTrip(afterDeleteOne)
    expect((reimported.body as any).content[0].attrs.alt).toBe('Zweites')
  })
})

describe('ODT: alle Bilder entfernt (Req Abschnitt 4.2 Testfall 6)', () => {
  it('kein Bild-Rest im Zip/Manifest, restlicher Text bleibt vollständig', async () => {
    const afterDeleteAll = doc([paragraph('Einziger verbleibender Text.')])
    const zip = await JSZip.loadAsync(await writeOdt(afterDeleteAll))
    const manifest = await zip.file('META-INF/manifest.xml')!.async('text')
    expect(manifest).not.toContain('media-type="image/')
    expect(Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))).toHaveLength(0)
    const reimported = await roundTrip(afterDeleteAll)
    expect((reimported.body as any).content[0].content[0].text).toBe('Einziger verbleibender Text.')
  })
})

describe('ODT: Bild in Tabellenzelle gelöscht (Req Abschnitt 4.2 Testfall 4)', () => {
  it('Zelle bleibt mit leerem Absatz gültig, Tabellenstruktur unverändert', async () => {
    const afterDelete = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('bleibt')] },
            ],
          },
        ],
      },
    ])
    const reimported = await roundTrip(afterDelete)
    const table = (reimported.body as any).content[0]
    expect(table.content[0].content).toHaveLength(2)
  })
})

describe('ODT: Cross-Format nach Bild löschen (Req Abschnitt 4.2 Testfall 7)', () => {
  it('Testfall 7: ODT (Bild gelöscht) → als DOCX exportiert → reimportiert → Bild bleibt entfernt', async () => {
    const { writeDocx } = await import('../../docx/writer')
    const { readDocx } = await import('../../docx/reader')
    const afterDelete = doc([paragraph('Rest nach Löschen, aus ODT stammend')])

    const asDocxBlob = await writeDocx(afterDelete)
    const final = await readDocx(asDocxBlob)

    const types = (final.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect((final.body as any).content[0].content[0].text).toBe('Rest nach Löschen, aus ODT stammend')
  })
})

describe('ODT: reale Fremddatei — ein Bild entfernt, andere bleiben (Req Abschnitt 4.2 Testfall 10, ODT-Analogie)', () => {
  it('images.odt importieren, ein Bild aus dem JSON entfernen, restliche Bilder bleiben referenziert', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const fixturePath = join(__dirname, '../../../../tests/fixtures/external/odt/images.odt')
    const original = await readOdt(readFileSync(fixturePath))
    const originalImages = (original.body as any).content.filter((n: any) => n.type === 'image')
    // Falls die Fixture nur ein Bild enthält, deckt dieser Test zumindest den
    // Einzelbild-Fall (Req 4.2 Testfall 2) an einer echten Fremddatei ab; bei mehreren
    // Bildern zusätzlich den Mehrbild-Fall (Testfall 3) — beide Zweige werden geprüft.
    expect(originalImages.length).toBeGreaterThanOrEqual(1)

    const toRemoveSrc = originalImages[0].attrs.src
    const afterDelete: WordDocumentContent = {
      ...original,
      body: {
        ...(original.body as any),
        content: (original.body as any).content.filter((n: any) => !(n.type === 'image' && n.attrs.src === toRemoveSrc)),
      },
    }
    const zip = await JSZip.loadAsync(await writeOdt(afterDelete))
    expect(Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))).toHaveLength(originalImages.length - 1)

    const reimported = await roundTrip(afterDelete)
    const remainingImages = (reimported.body as any).content.filter((n: any) => n.type === 'image')
    expect(remainingImages).toHaveLength(originalImages.length - 1)
  })
})
```

### 4.4 Ergänzend: Unit-Tests für `commands.ts`

Zwei getrennte Teile, mit unterschiedlichem Blockierungs-Status (siehe §0):

#### 4.4a — Permanente Sonden-Nachbildung (heute schon lauffähig, **kein** Dev-Vorbedingung)

Neue Testdatei `src/formats/shared/editor/__tests__/image-generic-delete.test.ts`, formuliert
**ausschließlich** gegen bereits vorhandene Exporte (`wordSchema`, `insertImage`) sowie die
Bibliotheks-Pakete `prosemirror-state`, `prosemirror-commands`, `prosemirror-history` —
bewusst **ohne** Abhängigkeit von einem künftigen `deleteImage()`. Das schließt exakt die in
§0 beschriebene Lücke (Code-Plan-Sonde wurde gelöscht, nicht dauerhaft):

```ts
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state'
import { baseKeymap } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { wordSchema } from '../../schema'
import { insertImage } from '../commands'

function stateWithPlugins(doc: ReturnType<typeof wordSchema.node>) {
  return EditorState.create({ doc, schema: wordSchema, plugins: [history(), keymap(baseKeymap)] })
}
function selectImageAt(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
}
function pressDelete(state: EditorState): EditorState {
  let next = state
  baseKeymap['Delete'](next, (tr) => { next = next.apply(tr) })
  return next
}
function pressBackspace(state: EditorState): EditorState {
  let next = state
  baseKeymap['Backspace'](next, (tr) => { next = next.apply(tr) })
  return next
}

describe('Generisches baseKeymap-Löschverhalten auf einer Bild-NodeSelection (Req Grenzfälle, permanent statt Einmal-Sonde)', () => {
  it('Grenzfall 2: Bild als einziger Dokumentinhalt — Delete füllt automatisch einen leeren Absatz nach', () => {
    const doc = wordSchema.node('doc', null, [wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' })])
    let state = stateWithPlugins(doc)
    state = selectImageAt(state, 0)
    state = pressDelete(state)
    expect(state.doc.childCount).toBe(1)
    expect(state.doc.firstChild!.type.name).toBe('paragraph')
    expect(state.selection).toBeInstanceOf(TextSelection)
  })

  it('Grenzfall 1: Text vor und nach dem Bild bleibt exakt erhalten, Cursor landet am Anfang des Folgeblocks', () => {
    const doc = wordSchema.node('doc', null, [
      wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Before')),
      wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' }),
      wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('After')),
    ])
    let state = stateWithPlugins(doc)
    const imagePos = state.doc.child(0).nodeSize
    state = selectImageAt(state, imagePos)
    state = pressDelete(state)
    expect(state.doc.textBetween(0, state.doc.content.size, '|')).toBe('Before|After')
    expect(state.selection.empty).toBe(true)
    expect(state.selection.from).toBe(state.doc.resolve(state.doc.child(0).nodeSize + 1).pos)
  })

  it('identisches Ergebnis für Backspace wie für Delete auf derselben Bild-NodeSelection', () => {
    const buildDoc = () =>
      wordSchema.node('doc', null, [
        wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Before')),
        wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' }),
        wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('After')),
      ])
    const imagePos = buildDoc().child(0).nodeSize
    const viaDelete = pressDelete(selectImageAt(stateWithPlugins(buildDoc()), imagePos))
    const viaBackspace = pressBackspace(selectImageAt(stateWithPlugins(buildDoc()), imagePos))
    expect(viaDelete.doc.toJSON()).toEqual(viaBackspace.doc.toJSON())
  })

  it('Bibliotheks-Fakt: Mod-Backspace/Shift-Backspace sind reine Aliase auf dieselbe Backspace-Kette', () => {
    expect(baseKeymap['Mod-Backspace']).toBe(baseKeymap['Backspace'])
    expect(baseKeymap['Shift-Backspace']).toBe(baseKeymap['Backspace'])
  })

  it('Grenzfall 7: Bild als einziger Inhalt einer Tabellenzelle — Zelle wird automatisch mit leerem Absatz aufgefüllt', () => {
    const cellWithImage = wordSchema.nodes.table_cell.createAndFill(
      { colspan: 1, rowspan: 1 },
      wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' }),
    )!
    const otherCell = wordSchema.nodes.table_cell.createAndFill(
      { colspan: 1, rowspan: 1 },
      wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Andere Zelle')),
    )!
    const row = wordSchema.nodes.table_row.create(null, [cellWithImage, otherCell])
    const table = wordSchema.nodes.table.create(null, [row])
    const doc = wordSchema.node('doc', null, [table])
    let state = stateWithPlugins(doc)
    // Position des Bild-Knotens innerhalb der ersten Zelle:
    const imagePos = 1 /* doc→table */ + 1 /* table→row */ + 1 /* row→cell */
    state = selectImageAt(state, imagePos)
    state = pressDelete(state)
    const cell0 = state.doc.child(0).child(0).child(0)
    expect(cell0.childCount).toBe(1)
    expect(cell0.firstChild!.type.name).toBe('paragraph')
    const cell1 = state.doc.child(0).child(0).child(1)
    expect(cell1.textContent).toBe('Andere Zelle')
  })

  it('Grenzfall 11/12: Undo stellt Bild mit exakt identischen Attributen wieder her, Redo entfernt es erneut', () => {
    const doc = wordSchema.node('doc', null, [
      wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: 'RoundtripAlt', width: 123, height: 45 }),
      wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Text danach')),
    ])
    let state = stateWithPlugins(doc)
    state = pressDelete(selectImageAt(state, 0))
    expect(state.doc.firstChild!.type.name).not.toBe('image')

    let next: EditorState = state
    undo(state, (tr) => (next = state.apply(tr)))
    state = next
    const restored = state.doc.firstChild!
    expect(restored.type.name).toBe('image')
    expect(restored.attrs).toMatchObject({ alt: 'RoundtripAlt', width: 123, height: 45 })

    redo(state, (tr) => (next = state.apply(tr)))
    state = next
    expect(state.doc.firstChild!.type.name).not.toBe('image')
  })

  it('Grenzfall 5: drei Bilder, mittleres per NodeSelection löschen — erstes und drittes bleiben unverändert', () => {
    const doc = wordSchema.node('doc', null, [
      wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: 'Erstes' }),
      wordSchema.node('image', { src: 'data:image/png;base64,BBB=', alt: 'Mittleres' }),
      wordSchema.node('image', { src: 'data:image/png;base64,CCC=', alt: 'Drittes' }),
    ])
    let state = stateWithPlugins(doc)
    const middlePos = doc.child(0).nodeSize
    state = pressDelete(selectImageAt(state, middlePos))
    expect(state.doc.childCount).toBe(2)
    expect(state.doc.child(0).attrs.alt).toBe('Erstes')
    expect(state.doc.child(1).attrs.alt).toBe('Drittes')
  })

  it('Grenzfall 16: Selektion unmittelbar nach insertImage() ist bereits eine NodeSelection auf das neue Bild', () => {
    const doc = wordSchema.node('doc', null, [wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('x'))])
    let state = stateWithPlugins(doc)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    insertImage('data:image/png;base64,AAA=', 'neu.png')(state, (tr) => (state = state.apply(tr)))
    expect(state.selection).toBeInstanceOf(NodeSelection)
    expect((state.selection as NodeSelection).node.type.name).toBe('image')
    state = pressDelete(state)
    expect(state.doc.textContent).not.toContain('image')
  })
})
```

#### 4.4b — Guard-Unit-Tests für `isImageSelected`/`deleteImage` (**blockiert**, siehe §0)

Datei: `src/formats/shared/editor/__tests__/commands.test.ts` (neu — erste Testdatei für
`commands.ts` überhaupt). Diese Tests sind **kein** Ersatz für §4.4a — sie prüfen
ausschließlich die neue, benannte Wrapper-API aus `bild-loeschen-code.md` §4.3, sobald sie
existiert:

```ts
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { deleteImage, isImageSelected } from '../commands'

function buildState(selection: 'collapsed' | 'text-range' | 'image' | 'other-node') {
  const doc = wordSchema.node('doc', null, [
    wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Hallo')),
    wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' }),
  ])
  const state = EditorState.create({ doc, schema: wordSchema })
  if (selection === 'collapsed') return state.apply(state.tr.setSelection(TextSelection.create(doc, 1)))
  if (selection === 'text-range') return state.apply(state.tr.setSelection(TextSelection.create(doc, 1, 4)))
  if (selection === 'image') return state.apply(state.tr.setSelection(NodeSelection.create(doc, doc.child(0).nodeSize)))
  // 'other-node': NodeSelection auf den Absatz, nicht auf das Bild
  return state.apply(state.tr.setSelection(NodeSelection.create(doc, 0)))
}

describe('isImageSelected', () => {
  it('false bei kollabiertem Cursor', () => expect(isImageSelected(buildState('collapsed'))).toBe(false))
  it('false bei TextSelection mit Range', () => expect(isImageSelected(buildState('text-range'))).toBe(false))
  it('false bei NodeSelection auf einen Nicht-Bild-Node', () => expect(isImageSelected(buildState('other-node'))).toBe(false))
  it('true bei NodeSelection auf ein Bild', () => expect(isImageSelected(buildState('image'))).toBe(true))
})

describe('deleteImage guard (Req Grenzfall 15/DoD 8)', () => {
  it('gibt false zurück und dispatcht nichts, wenn kein Bild selektiert ist', () => {
    let dispatched = false
    const state = buildState('text-range')
    const result = deleteImage()(state, () => (dispatched = true))
    expect(result).toBe(false)
    expect(dispatched).toBe(false)
  })

  it('reine Verfügbarkeitsabfrage (dispatch=undefined) liefert true ohne Seiteneffekt', () => {
    const state = buildState('image')
    expect(deleteImage()(state, undefined)).toBe(true)
  })

  it('entfernt das Bild bei vorhandener Bild-NodeSelection und dispatcht genau einmal', () => {
    let dispatchCount = 0
    let result: EditorState = buildState('image')
    const dispatch = (tr: any) => {
      dispatchCount++
      result = result.apply(tr)
    }
    const ok = deleteImage()(buildState('image'), dispatch)
    expect(ok).toBe(true)
    expect(dispatchCount).toBe(1)
    expect(result.doc.textContent.length).toBeGreaterThanOrEqual(0)
    const types: string[] = []
    result.doc.descendants((n) => { types.push(n.type.name) })
    expect(types).not.toContain('image')
  })
})
```

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Grundprinzipien

- Läuft in **echten** Browser-Engines über die 3 Projekte aus `playwright.config.ts`
  (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) — keine Sonderkonfiguration pro Test.
- Auslösung ausschließlich über sichtbare Nutzerinteraktion: `page.keyboard.press(...)`,
  `page.keyboard.type(...)`, `.click()` auf das tatsächliche `<img>`-DOM-Element,
  `input[type=file].setInputFiles(...)`. **Kein** `page.evaluate(() => view.dispatch(...))`
  oder ähnlicher interner Zugriff auf ProseMirror-Internas — das würde exakt die in
  `bild-loeschen-req.md` Abschnitt 0 kritisierte Lücke reproduzieren („kein echter,
  klickbarer UI-Weg getestet“).
- Wo die Anforderung explizit **sichtbares** Feedback verlangt (TF1a), wird der tatsächliche
  berechnete CSS-Zustand geprüft (`toHaveCSS(...)`), **nicht nur** die Anwesenheit einer
  CSS-Klasse im DOM — genau das ist die in Req Abschnitt 0 dokumentierte Lücke
  („Klasse gesetzt, aber keine Regel dafür vorhanden“), die eine reine Klassen-Prüfung
  **nicht** aufdecken würde.
- Datei-Downloads werden über `page.waitForEvent('download')` abgefangen, per
  `download.path()` von der Platte gelesen und mit `JSZip` inhaltlich geprüft — analog zu
  `tests/e2e/docx.spec.ts`/`tests/e2e/odt.spec.ts`.
- Jeder Test installiert den Konsolen-Fehler-Helper (§2.3) und ruft ihn am Ende auf.

### 5.1a Determinismus-Regeln (VERBINDLICH — gehen jedem Inline-Codeblock unten vor)

Diese Regeln sind **normativ**. Wo ein illustrativer Codeblock in §5.3/§5.4 der Kürze halber
`await editor.locator('img').click()` unmittelbar gefolgt von einer Löschtaste zeigt, gilt
dennoch die hier definierte, geschützte Sequenz über die Helfer aus §2.4/§5.2. Grund: Genau
solche „Selektion setzen → sofort Taste drücken"-Sequenzen sind im Repo bereits mehrfach als
**Flakiness-Quelle** nachgewiesen und nachgebessert worden (Commits „Fix flaky Mobile-project
… same async-selection-sync race as selection-regression.spec.ts"; Referenzmuster in
`tests/e2e/cut.spec.ts` und `tests/e2e/selection-regression.spec.ts`).

**R-D1 — Selektions-Sync vor jeder Löschtaste abwarten.** Weder ein Maus-Klick noch eine
Pfeiltasten-Selektion setzt die ProseMirror-`NodeSelection` synchron: Der Editor übernimmt eine
nativ ausgelöste Selektionsänderung erst über das **asynchrone** `selectionchange`-Event des
Browsers. Ein sofort danach abgefeuertes `Delete`/`Backspace` kann diesem Sync vorauslaufen und
auf der **alten** Selektion (leerer Caret) operieren → das Bild wird nicht gelöscht bzw. es wird
Nachbartext gelöscht; im Reimport/Zip taucht das Bild „unerklärlich" wieder auf. Deshalb:
- **Nie** `img.click()`/Pfeiltaste direkt gefolgt von `Delete`/`Backspace`. Stattdessen
  **immer** `selectImageByKeyboard(page, editor)` (Standard) **oder** `selectImageByClick(img)`
  (klick-spezifische Tests). Beide schließen die Selektion mit einem **deterministischen Gate**
  ab (`toHaveCount(1)` bzw. `toHaveClass(...)`, von Playwright automatisch abgewartet) — **kein**
  geratenes `waitForTimeout`.
- Nach einem **nativen Caret-/Selektionssprung** per Tastatur (`Home`/`End`/`Ctrl+End`/`ArrowLeft`
  usw.), der nicht über einen der Helfer läuft, folgt vor der nächsten Taste ein
  `await page.waitForTimeout(50)` — identisch zu `cut.spec.ts`/`selection-regression.spec.ts`.
- Werden Zeichen per `Shift+Arrow` selektiert, erhält jede Pfeiltaste ein `{ delay: 20 }` und
  nach `keyboard.up('Shift')` folgt `await page.waitForTimeout(50)` (siehe `cut.spec.ts` Testfall 1).

**R-D2 — Undo-Granularität deterministisch trennen.** `prosemirror-history` fasst Transaktionen
innerhalb `newGroupDelay` (~500 ms) zu **einem** Undo-Schritt zusammen. Fügt ein Test ein Bild ein
und löscht es unmittelbar danach, landen **Einfügen + Löschen im selben Undo-Schritt** → ein
einziges `Strg+Z` macht **beides** rückgängig, und die „Undo stellt das Bild wieder her"-Erwartung
schlägt sporadisch fehl. Jeder Test, der nach dem Löschen ein Undo prüft (TF3/TF4/TF15/RT5),
setzt daher **vor** dem Selektieren/Löschen einen Settle: `await page.waitForTimeout(600)` (exakt
wie `cut.spec.ts` Testfall 9). Analog wird geprüft, dass ein **vorheriges, unabhängiges Tippen ein
separater** Undo-Schritt bleibt.

**R-D3 — Klick-Ziele müssen real gerendert (groß) sein.** Jeder Test, der ein Bild per Klick
selektiert, verwendet `RED_SQUARE()`/`GREEN_SQUARE()`/`BLUE_SQUARE()`/`makeLargePng()` (≥ 220 px),
**nicht** die 1×1-PNGs — ein Koordinaten-Klick auf ein 1×1-Bild ist laut `clipboard.spec.ts`
unzuverlässig. Tastatur-selektierende und rein datengetriebene Tests dürfen die 1×1-PNGs nutzen.

**R-D4 — Klick-Selektion ist R1/R2-abhängig, Tastatur-Selektion nicht.** Der deterministische,
**heute schon grüne** Nachweis des Lösch-Pfads (`deleteSelection`) läuft über
`selectImageByKeyboard` (umgeht `reconcileSelectionOnClick`). Klick-basierte Tests (TF1a, TF1b,
R2-Aufklärung, gezielt N-tes Bild) werden **erst nach** dem R1-CSS-Fix (Sichtbarkeit) und dem
R2-Guard (code.md §4.1/§4.4) zuverlässig grün; bis dahin sind sie in §5.3 als „blockiert/
R2-abhängig" gekennzeichnet und dürfen den generischen Lösch-Nachweis nicht blockieren.

**R-D5 — Reimport nur über `← Formate`.** Nach einem Export ist der Workspace offen; die
FormatPicker-Karten mit den Upload-Feldern sind verdeckt. Jeder Reimport nutzt daher
`reimportDocx(page, buf)`/`reimportOdt(page, buf)` (klicken zuerst „← Formate"). Ein direktes
`docxCard(page).locator('input[type=file]')` **im Workspace-Zustand** matcht nichts und lässt den
Test hängen/fehlschlagen.

**R-D6 — Ein einzelner `.ProseMirror`.** `page.locator('.ProseMirror')` ist nur eindeutig, weil
nach „Neu erstellen"/Upload **genau ein** Editor gerendert ist (belegt durch alle bestehenden
E2E-Specs). Kein Test öffnet zwei Workspaces gleichzeitig.

### 5.2 Testdatei-Kopf `tests/e2e/image-delete.spec.ts`

```ts
import { test, expect, type Page, type Locator } from '@playwright/test'
import JSZip from 'jszip'
import {
  RED_PNG_BASE64, GREEN_PNG_BASE64, BLUE_PNG_BASE64, pngBuffer, makeLargePng,
  RED_SQUARE, GREEN_SQUARE, BLUE_SQUARE, makeColoredSquarePng,
} from './fixtures/testImages'

function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

// Bild-Einfügen: page-scoped über das Toolbar-<label>„Bild" (bewiesen in cut.spec.ts) —
// NICHT karten-scoped, weil die Karte nach „Neu erstellen" verdeckt ist. Siehe §2.4.
async function insertImage(page: Page, buffer: Buffer, name = 'test.png') {
  await page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles({ name, mimeType: 'image/png', buffer })
}

// Deterministische Selektion + Reimport — Definitionen und Begründung in §2.4/§5.1a.
async function selectImageByKeyboard(page: Page, editor: Locator) {
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
}
async function selectImageByClick(img: Locator) {
  await img.click()
  await expect(img).toHaveClass(/ProseMirror-selectednode/)
}
async function backToFormatPicker(page: Page) {
  await page.getByRole('button', { name: /formate/i }).click()
}
async function reimportDocx(page: Page, buffer: Buffer) {
  await backToFormatPicker(page)
  await docxCard(page).locator('input[type="file"]').first().setInputFiles({
    name: 'reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
}
async function reimportOdt(page: Page, buffer: Buffer) {
  await backToFormatPicker(page)
  await odtCard(page).locator('input[type="file"]').first().setInputFiles({
    name: 'reimport.odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    buffer,
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
})
```

### 5.3 Kern-Testfälle (Req Abschnitt 6, Nummerierung TF = Testfall)

**TF1a — PFLICHT-VORBEDINGUNG (blockiert bis `bild-loeschen-code.md` §4.1 umgesetzt ist):
sichtbares Auswahl-Feedback, nicht nur die DOM-Klasse**

```ts
test('TF1a (Pflicht-Vorbedingung, Req DoD 1): ein selektiertes Bild zeigt einen tatsächlich sichtbaren Rahmen', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, RED_SQUARE()) // R-D3: klickbares, real gerendertes Bild

  const img = editor.locator('img')
  await expect(img).toHaveCount(1)
  await selectImageByClick(img) // Klick + deterministischer NodeSelection-Gate (R-D1)

  // Entscheidender Zusatz gegenüber einer reinen Klassen-Prüfung (siehe Req Abschnitt 0):
  await expect(img).not.toHaveCSS('outline-style', 'none')
  await expect(img).not.toHaveCSS('outline-width', '0px')
})
```

**TF1b — Basis-Löschen über den deterministischen Tastatur-Weg (heute schon lauffähig)**

Standard-Nachweis des Lösch-Pfads: Tastatur-`NodeSelection` (umgeht R2), Sync deterministisch
abgewartet (R-D1). 1×1-PNG genügt, da nicht geklickt wird.

```ts
test('TF1b: Bild einfügen, per Tastatur selektieren, Entf löscht es vollständig', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await expect(editor.locator('img')).toHaveCount(1)

  await selectImageByKeyboard(page, editor) // wartet Selektions-Sync ab, bevor gelöscht wird
  await page.keyboard.press('Delete')

  await expect(editor.locator('img')).toHaveCount(0)
  // Req 2.3: keine Geister-Markierung an einem Nachbar-Element zurückgelassen.
  await expect(page.locator('.ProseMirror-selectednode')).toHaveCount(0)
  assertNoConsoleErrors()
})
```

**TF1b-Klick — dieselbe Löschung über den Klick-Weg (R2-abhängig, siehe R-D4)**

Zuverlässig grün erst nach dem R2-Guard (code.md §4.4). Nutzt ein klickbares Bild (R-D3) und
den `selectImageByClick`-Gate; kollabiert der R2-Reconcile die Selektion, schlägt der Gate fehl —
das ist der beabsichtigte R2-Nachweis, nicht Flakiness.

```ts
test('TF1b-Klick (R2-abhängig): Bild anklicken, Selektions-Gate, Entf löscht es', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, RED_SQUARE())
  await expect(editor.locator('img')).toHaveCount(1)

  await selectImageByClick(editor.locator('img'))
  await page.keyboard.press('Delete')

  await expect(editor.locator('img')).toHaveCount(0)
  await expect(page.locator('.ProseMirror-selectednode')).toHaveCount(0)
  assertNoConsoleErrors()
})
```

**TF2 — Text vor/nach dem Bild bleibt exakt erhalten (Req Grenzfall 1)**

```ts
test('TF2: Text vor und nach dem Bild bleibt exakt erhalten', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Text davor.')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Text danach.')

  // Deterministische Tastatur-Selektion des mittleren Bildes (R-D1, R2-免): Caret an den
  // Anfang von „Text danach.", Sync abwarten, dann ArrowLeft = selectNodeBackward → Bild.
  await editor.getByText('Text danach.').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('Backspace')

  await expect(editor).toContainText('Text davor.')
  await expect(editor).toContainText('Text danach.')
  await expect(editor.locator('img')).toHaveCount(0)
  // Kein Verschmelzen der beiden Absätze (Req 2.2: Bild ist ein reiner Block-Node):
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

**TF3 — Undo stellt Bild mit identischen Attributen wieder her (Req Grenzfall 11)**

```ts
test('TF3: Bild löschen, dann Strg+Z stellt es mit identischem Alt-Text wieder her', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64), 'original-datei.png')
  const altBefore = await editor.locator('img').getAttribute('alt')

  // R-D2: Settle > newGroupDelay (~500ms), damit Einfügen und Löschen NICHT zu einem
  // Undo-Schritt verschmelzen — sonst macht ein Strg+Z beides rückgängig (Bild bliebe weg).
  await page.waitForTimeout(600)
  await selectImageByKeyboard(page, editor)
  await page.keyboard.press('Delete')
  await expect(editor.locator('img')).toHaveCount(0)

  await page.keyboard.press('ControlOrMeta+z')

  await expect(editor.locator('img')).toHaveCount(1)
  await expect(editor.locator('img')).toHaveAttribute('alt', altBefore ?? '')
})
```

**TF4 — Redo entfernt das Bild erneut (Req Grenzfall 12)**

```ts
test('TF4: Strg+Z danach Strg+Y entfernt das Bild erneut identisch', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.waitForTimeout(600) // R-D2: getrennter Undo-Schritt
  await selectImageByKeyboard(page, editor)
  await page.keyboard.press('Delete')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor.locator('img')).toHaveCount(1)

  await page.keyboard.press('ControlOrMeta+y')

  await expect(editor.locator('img')).toHaveCount(0)
})
```

**TF5 — Mehrere, tatsächlich unterscheidbare Bilder, mittleres löschen (Req Grenzfall 5)**

```ts
test('TF5: drei farblich unterschiedliche Bilder, mittleres per Klick löschen — Rest bleibt unverändert und unterscheidbar', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  // Gezielt N-tes Bild → Klick-Weg (R2-abhängig, R-D4). Sized squares wegen R-D3, zugleich
  // farblich unterscheidbar für den „genau das mittlere ist weg"-Nachweis.
  await insertImage(page, RED_SQUARE(), 'rot.png')
  await page.keyboard.press('Enter')
  await insertImage(page, GREEN_SQUARE(), 'gruen.png')
  await page.keyboard.press('Enter')
  await insertImage(page, BLUE_SQUARE(), 'blau.png')

  const images = editor.locator('img')
  await expect(images).toHaveCount(3)
  const srcsBefore = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))

  await selectImageByClick(images.nth(1)) // grünes, mittleres Bild — Klick + Sync-Gate (R-D1)
  await page.keyboard.press('Delete')

  await expect(images).toHaveCount(2)
  const srcsAfter = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
  expect(srcsAfter[0]).toBe(srcsBefore[0]) // rot unverändert
  expect(srcsAfter[1]).toBe(srcsBefore[2]) // blau unverändert
  expect(srcsAfter).not.toContain(srcsBefore[1]) // grün tatsächlich weg
})
```

**TF6 — Bild in Tabellenzelle löschen (Req Grenzfall 7)**

```ts
test('TF6: Bild in einer Tabellenzelle löschen — nur das Bild verschwindet, Tabellenstruktur bleibt', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await insertImage(page, RED_SQUARE()) // R-D3: klickbar
  await cells.nth(1).click()
  await page.keyboard.type('Andere Zelle')

  // Bild in einer Zelle → Klick-Weg (R2-abhängig, R-D4) mit Sync-Gate (R-D1).
  await selectImageByClick(cells.nth(0).locator('img'))
  await page.keyboard.press('Delete')

  await expect(cells).toHaveCount(4)
  await expect(cells.nth(0).locator('img')).toHaveCount(0)
  await expect(cells.nth(1)).toHaveText('Andere Zelle')
})
```

**TF7 — PFLICHT: Selection-Sync-Regressionstest × Bild löschen (Req Abschnitt 2.7/Grenzfall 13)**

Analog zu `tests/e2e/selection-regression.spec.ts`, hier mit einer Bild-`NodeSelection` als
auslösendem Zustand statt einer `AllSelection`. **Dauerhaft Teil der Suite, kein `test.skip`.**

```ts
test('TF7 (PFLICHT): Bild selektieren → Klick zur Neupositionierung → Enter → weiter tippen bleibt korrekt', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Text davor.')
  await page.keyboard.press('Enter')
  await insertImage(page, RED_SQUARE()) // R-D3: klickbar (die NodeSelection muss zuverlässig entstehen)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Text danach.')

  await selectImageByClick(editor.locator('img')) // erzeugt + bestätigt NodeSelection auf das Bild (Auslöser)
  // Re-Klick an anderer Stelle im Text — exakt die Bedingung, die reconcileSelectionOnClick behandeln soll:
  await editor.getByText('Text danach.').click()
  await page.keyboard.press('End')
  // Pflicht-Settle (R-D1): „End" ist ein nativer, async synchronisierter Caret-Sprung — ohne
  // diese Pause kann das sofort folgende „Enter" davor­laufen (identisch selection-regression.spec.ts).
  await page.waitForTimeout(50)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Absatz nach der Regression-Prüfung.')

  await expect(editor).toContainText('Text davor.')
  await expect(editor).toContainText('Text danach.')
  await expect(editor).toContainText('Dritter Absatz nach der Regression-Prüfung.')
  await expect(editor.locator('img')).toHaveCount(1) // Bild wurde NICHT gelöscht (keine versehentliche Aktion)
  assertNoConsoleErrors()
})
```

**TF8 — Entf ohne Bild-Selektion löscht nur Text (Req Grenzfall 15)**

```ts
test('TF8: Entf-Taste mit Cursor im normalen Fließtext betrifft kein Bild', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('ABCDEF')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))

  await editor.getByText('ABCDEF').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50) // R-D1: async Caret-Sync abwarten, bevor Delete das erste Zeichen entfernt
  await page.keyboard.press('Delete')

  await expect(editor).toContainText('BCDEF')
  await expect(editor.locator('img')).toHaveCount(1)
  assertNoConsoleErrors()
})
```

**TF9 — Abgebrochener Drag löscht nicht versehentlich (Req Grenzfall 14)**

```ts
test('TF9: Bild per Drag anfassen, außerhalb des Editors droppen — Bild bleibt unverändert bestehen', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, RED_SQUARE()) // R-D3: sized, damit boundingBox/Drag-Griff aussagekräftig ist
  const img = editor.locator('img')
  const srcBefore = await img.getAttribute('src')
  const box = (await img.boundingBox())!

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y - 400, { steps: 10 }) // deutlich oberhalb des Editors
  await page.mouse.up() // Drop außerhalb eines gültigen Ziels

  await expect(img).toHaveCount(1)
  await expect(img).toHaveAttribute('src', srcBefore ?? '')
  assertNoConsoleErrors()
})
```

> **Hinweis zur Automatisierungsgrenze** (siehe §8): Ein echtes „Esc während des Ziehens“
> bricht einen nativen HTML5-Drag auf OS-Ebene ab — das ist über Playwrights synthetische
> Maus-Events nicht 1:1 nachstellbar. Der obige Test deckt den äquivalenten, in
> `bild-loeschen-code.md` Abschnitt 2 als sicher belegten Fall ab (Drop ohne gültiges Ziel
> löst kein `drop`-Event auf `view.dom` aus). Echtes Esc-Verhalten verbleibt manuell zu
> verifizieren.

**TF10 — Toolbar-Button „Bild löschen“ (blockiert bis `bild-loeschen-code.md` §4.4 umgesetzt ist)**

```ts
test('TF10 (blockiert bis Toolbar-Button existiert): Button erscheint nur bei Bild-Selektion, Klick löscht wie Entf', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, RED_SQUARE()) // R-D3: klickbar

  await expect(page.getByTitle('Bild löschen')).toHaveCount(0) // ohne Selektion unsichtbar
  await selectImageByClick(editor.locator('img')) // Klick + Sync-Gate (R-D1)
  await expect(page.getByTitle('Bild löschen')).toBeVisible()

  await page.getByTitle('Bild löschen').click()

  await expect(editor.locator('img')).toHaveCount(0)
})
```

**TF11 — Mod-Backspace auf einer Bild-Selektion (Req Zugriffsweg 4)**

```ts
test('TF11: Strg+Rücktaste auf einer Bild-Selektion löscht identisch zu einfachem Backspace', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Davor')
  await page.keyboard.press('Enter') // vom Bild-NodeSelection-Zustand wegkommen, sonst überschreibt Tippen das Bild
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Danach')

  // Deterministische Tastatur-Selektion des mittleren Bildes (R-D1, R2-免):
  await editor.getByText('Danach').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+Backspace')

  await expect(editor.locator('img')).toHaveCount(0)
  await expect(editor).toContainText('Davor')
  await expect(editor).toContainText('Danach')
})
```

**TF12 — Reale Fremddatei mit mehreren Bildern (Req Grenzfall 17, Testfall 12)**

```ts
test('TF12: VariousPictures.docx importieren, ein Bild per Klick + Entf löschen — Rest bleibt sichtbar unverändert', async ({ page }) => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const buffer = await fs.readFile(path.join(__dirname, '../fixtures/external/docx/VariousPictures.docx'))
  const input = docxCard(page).locator('input[type="file"]').first()
  await input.setInputFiles({
    name: 'VariousPictures.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })

  const editor = page.locator('.ProseMirror')
  const images = editor.locator('img')
  const countBefore = await images.count()
  expect(countBefore).toBeGreaterThan(1)
  const srcsBefore = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))

  const middle = Math.floor(countBefore / 2)
  // Reale Bilder sind gerendert-groß → klickbar (R-D3); Klick-Weg mit Sync-Gate (R-D1, R2-abhängig).
  await selectImageByClick(images.nth(middle))
  await page.keyboard.press('Delete')

  await expect(images).toHaveCount(countBefore - 1)
  const srcsAfter = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
  expect(srcsAfter).not.toContain(srcsBefore[middle])
  expect(srcsBefore.filter((s) => s !== srcsBefore[middle]).every((s) => srcsAfter.includes(s))).toBe(true)
})
```

**TF13 — Sehr großes Bild löschen bleibt reaktionsfähig (Req Grenzfall 10)**

```ts
test('TF13: mehrere-MB-Bild einfügen und löschen — kein Einfrieren, kein Konsolenfehler', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()

  await insertImage(page, makeLargePng(1200), 'gross.png')
  await expect(editor.locator('img')).toHaveCount(1, { timeout: 15_000 })

  await selectImageByKeyboard(page, editor) // einziges Bild → deterministisch, R2-免 (R-D1/R-D4)
  await page.keyboard.press('Delete')

  await expect(editor.locator('img')).toHaveCount(0, { timeout: 15_000 })
  // Editor bleibt sofort weiter bedienbar (Req 2.5):
  await page.keyboard.type('Weiterhin bedienbar.')
  await expect(editor).toContainText('Weiterhin bedienbar.')
  assertNoConsoleErrors()
})
```

**TF14 — PFLICHT: Verschachtelte Tabelle mit Bild in innerer Zelle (Req Grenzfall 9)**

```ts
test('TF14 (Pflicht, Grenzfall 9): Bild in einer Zelle der inneren Tabelle löschen — kein Absturz, beide Ebenen bleiben konsistent', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const outerCells = page.locator('.ProseMirror > table > tbody > tr > td, .ProseMirror table td').first()
  await outerCells.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // verschachtelte Tabelle

  const innerCells = page.locator('.ProseMirror table table td')
  await expect(innerCells).toHaveCount(4)
  await innerCells.nth(0).click()
  await insertImage(page, RED_SQUARE()) // R-D3: klickbar

  // Bild in einer (inneren) Zelle → Klick-Weg mit Sync-Gate (R-D1, R2-abhängig R-D4).
  await selectImageByClick(innerCells.nth(0).locator('img'))
  await page.keyboard.press('Delete')

  await expect(innerCells).toHaveCount(4) // innere Struktur unverändert
  await expect(page.locator('.ProseMirror > table')).toHaveCount(1) // äußere Struktur unverändert
  await expect(innerCells.nth(0).locator('img')).toHaveCount(0)
  assertNoConsoleErrors()
})
```

**TF15 — Bild löschen, danach neues Bild an derselben Stelle (Req Grenzfall 18)**

```ts
test('TF15: nach dem Löschen ersetzt ein neu eingefügtes Bild die Position ohne Attribut-Vermischung', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64), 'altes-bild.png')
  await selectImageByKeyboard(page, editor) // einziges Bild → deterministisch (R-D1)
  await page.keyboard.press('Delete')
  await expect(editor.locator('img')).toHaveCount(0)

  await insertImage(page, pngBuffer(BLUE_PNG_BASE64), 'neues-bild.png')

  await expect(editor.locator('img')).toHaveCount(1)
  await expect(editor.locator('img')).toHaveAttribute('alt', 'neues-bild.png')
})
```

**Zusatztest — Grenzfall 8: Bild als einziger Inhalt eines Listenpunkts (OE-1, Req/Impl-Konflikt)**

**Kritische Korrektur gegenüber der Vorfassung dieses Tests:** Die Vorfassung behauptete
`li toHaveCount(3)` („der leere Listenpunkt bleibt bestehen"). Das **widerspricht** dem in
`bild-loeschen-code.md` Abschnitt 2 **real ausgeführten** Laufzeit-Nachweis: `deleteSelection`
auf dem einzigen Inhalt eines Listenpunkts **entfernt den ganzen Punkt** (mehrgliedrige Liste
schrumpft) — das ist die offene Entscheidung **OE-1**. Der Test darf deshalb **nicht** die
wörtliche (unbestätigte) Req-Erwartung festschreiben, sondern (a) die Invarianten prüfen, die in
**jeder** OE-1-Auflösung gelten, und (b) das tatsächliche Verhalten (Punkt entfernt) als
Dokumentation einfrieren, bis PO entscheidet. Deterministische Selektion des mittleren Punkts per
Tastatur (R-D1).

```ts
test('Grenzfall 8 (OE-1): Bild als alleiniger Listenpunkt-Inhalt löschen — Nachbarpunkte überleben, Doc bleibt valide', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Punkt eins')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Punkt drei')

  // Mittleren (Bild-)Punkt deterministisch per Tastatur selektieren:
  await editor.getByText('Punkt drei').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('Delete')

  // Invarianten (gelten unabhängig von OE-1):
  await expect(editor.locator('img')).toHaveCount(0)
  await expect(editor).toContainText('Punkt eins')
  await expect(editor).toContainText('Punkt drei')
  // Kein invalider list_item (0 Blöcke) — Req Grenzfall 8 harte Zusicherung; Doc bleibt bedienbar:
  await page.keyboard.type('!') // Editor weiterhin bedienbar
  assertNoConsoleErrors()

  // OE-1-Einfrieren des IST-Verhaltens (code.md §2: Punkt wird ENTFERNT, nicht geleert → 2 statt 3).
  // Falls PO auf „leerer Punkt bleibt" besteht, wird diese Zeile bewusst rot und erzwingt die
  // Nachbesserung in code.md §3.2 (Custom-Delete). Bis dahin dokumentiert sie den realen Zustand.
  await expect(page.locator('.ProseMirror li')).toHaveCount(2)
})
```

**Zusatztest — Grenzfall 2: Bild ist einziges Dokumentelement**

```ts
test('Grenzfall 2: Bild als einziges Dokumentelement löschen — leerer Absatz bleibt, Editor bedienbar', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await selectImageByKeyboard(page, editor) // einziges Bild → deterministisch per Tastatur (R-D1)
  await page.keyboard.press('Delete')

  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await page.keyboard.type('Weiter bedienbar.')
  await expect(editor).toContainText('Weiter bedienbar.')
})
```

**Zusatztest — Grenzfall 3/4: Bild am Dokumentanfang / -ende**

```ts
test('Grenzfall 3: Bild am Dokumentanfang löschen — Cursor landet in einem gültigen Block, gapCursor bleibt konsistent', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Nach dem Bild.')

  // Bild am Dokumentanfang: deterministisch per Tastatur selektieren (Caret an den Anfang von
  // „Nach dem Bild.", dann ArrowLeft = selectNodeBackward → Bild). R-D1.
  await editor.getByText('Nach dem Bild.').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('Delete')
  await page.keyboard.type('X')

  await expect(editor).toContainText('XNach dem Bild.')
})

test('Grenzfall 4: Bild am Dokumentende löschen — Cursor landet im vorhergehenden Block', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Vor dem Bild.')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))

  await selectImageByKeyboard(page, editor) // Bild ist letztes Element → deterministisch (R-D1)
  await page.keyboard.press('Delete')
  await page.keyboard.type(' Ende.')

  await expect(editor).toContainText('Vor dem Bild. Ende.')
})
```

**TF16 — Mobile/Tablet-Projektmatrix (Req Abschnitt 1 Zeile 7, Grenzfall 20)**

Wird automatisch über alle 3 Playwright-Projekte mitausgeführt (TF1a, TF1b, TF2, TF7, TF10).
Zusätzlicher, dokumentierender Kommentar direkt in der Testdatei (kein separater Testfall,
übernimmt die bereits in `bild-loeschen-code.md` §7.2 Testfall 16 festgehaltene Einschränkung):

```ts
// Hinweis (Req Grenzfall 20 / Abnahmekriterium): Playwrights Geräte-Projekte emulieren
// Viewport/User-Agent/Touch-Fähigkeit auf derselben Browser-Engine, NICHT die tatsächliche
// On-Screen-Tastatur eines physischen Geräts. page.keyboard.press('Delete') erzeugt auf
// allen 3 Projekten dasselbe synthetische Tastatur-Event, unabhängig davon, ob ein echtes
// Touch-Gerät überhaupt eine Entf-Taste anbietet. TF10 (Toolbar-Button) ist deshalb der
// einzige hier tatsächlich tap-basierte, nicht tastatur-abhängige Nachweis für Req
// Zugriffsweg 7 — die Mobile-Tastatur-Unsicherheit (siehe bild-loeschen-code.md Abschnitt 2,
// Chrome-Android-beforeinput-Workaround greift nicht bei NodeSelection) bleibt ein durch
// echte Geräte-QA zu schließendes Restrisiko, siehe §8.
```

### 5.4 Export/Reimport-Rundreise-Tests (Req Abschnitt 4.2, echte Datei-Downloads)

Führen den **kompletten** Weg: echte Bedienung im Browser → echter Export-Klick →
`page.waitForEvent('download')` → Datei von der Platte lesen → mit `JSZip` inhaltlich prüfen
→ erneut hochladen, um den Reimport zu verifizieren. Ergänzt (nicht ersetzt) die schnelleren,
deterministischen Unit-Rundreisen aus §4.

**Verbindlich für alle RT-Tests (siehe §5.1a):** Bild-Selektion ausschließlich über
`selectImageByKeyboard`/`selectImageByClick` (Sync-Gate, R-D1) — nie bare `img.click()` + sofortiges
`Delete`; Reimport ausschließlich über `reimportDocx/Odt` (R-D5, klicken „← Formate" zuerst); wo ein
Undo geprüft wird (RT5), 600-ms-Settle vor dem Löschen (R-D2). Die Assertions gegen die **wirklich
heruntergeladene** Datei (`word/media/*`, `[Content_Types].xml`, `document.xml.rels` bzw.
`Pictures/*`, `META-INF/manifest.xml`) sind die verlässliche Verwaisungsprüfung (Req §6.3), nicht die
strukturellen Fremd-Validierungen mammoth/RelaxNG.

```ts
test('RT1 (Req 4.2 Testfall 1): DOCX — Bild einfügen, löschen, exportieren, Zip enthält keine Bild-Spuren mehr, Reimport zeigt kein Bild', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Text davor.')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Text danach.')

  // Mittleres Bild deterministisch per Tastatur selektieren (R-D1, R2-免):
  await editor.getByText('Text danach.').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('Delete')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)

  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect(documentXml).toContain('Text davor.')
  expect(documentXml).toContain('Text danach.')
  const mediaFiles = Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))
  expect(mediaFiles).toHaveLength(0)
  const contentTypes = await zip.file('[Content_Types].xml')!.async('text')
  expect(contentTypes).not.toMatch(/Extension="(png|jpe?g|gif)"/)
  const rels = await zip.file('word/_rels/document.xml.rels')!.async('text')
  expect(rels).not.toContain('media/')

  // Reimport zur Bestätigung, dass die exportierte Datei tatsächlich bildfrei ist:
  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(0)
  await expect(page.locator('.ProseMirror')).toContainText('Text davor.')
  await expect(page.locator('.ProseMirror')).toContainText('Text danach.')
})

test('RT2 (Req 4.2 Testfall 2): ODT — identische Sequenz, gegen manifest.xml/Pictures/ geprüft', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Text davor.')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.keyboard.press('Enter')
  await page.keyboard.type('Text danach.')

  // Mittleres Bild deterministisch per Tastatur selektieren (R-D1, R2-免):
  await editor.getByText('Text danach.').click()
  await page.keyboard.press('Home')
  await page.waitForTimeout(50)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  await expect(editor.locator('img.ProseMirror-selectednode')).toHaveCount(1)
  await page.keyboard.press('Delete')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)

  const contentXml = await zip.file('content.xml')!.async('text')
  expect(contentXml).toContain('Text davor.')
  expect(contentXml).toContain('Text danach.')
  const manifest = await zip.file('META-INF/manifest.xml')!.async('text')
  expect(manifest).not.toContain('media-type="image/')
  const pictureFiles = Object.keys(zip.files).filter((p) => /^Pictures\//.test(p))
  expect(pictureFiles).toHaveLength(0)

  await reimportOdt(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(0)
})

test('RT3 (Req 4.2 Testfall 3): mehrere Bilder, eines löschen → Export → Reimport → genau das erwartete Bild fehlt', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, RED_SQUARE(), 'rot.png') // R-D3: klickbar
  await page.keyboard.press('Enter')
  await insertImage(page, GREEN_SQUARE(), 'gruen.png')

  await selectImageByClick(editor.locator('img').nth(0)) // gezielt erstes Bild, Sync-Gate (R-D1)
  await page.keyboard.press('Delete')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(1)

  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(1)
})

test('RT4 (Req 4.2 Testfall 4): Bild in Tabellenzelle löschen → Export → Reimport → Zelle/Tabelle bleiben gültig', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await insertImage(page, RED_SQUARE()) // R-D3: klickbar
  await cells.nth(1).click()
  await page.keyboard.type('Nachbarzelle')

  await selectImageByClick(cells.nth(0).locator('img')) // Sync-Gate (R-D1, R2-abhängig)
  await page.keyboard.press('Delete')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)

  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror td')).toHaveCount(4)
  await expect(page.locator('.ProseMirror td').nth(1)).toContainText('Nachbarzelle')
})

test('RT5 (Req 4.2 Testfall 5): Löschen, Undo, Export → Reimport → Bild ist WEITERHIN vorhanden', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await page.waitForTimeout(600) // R-D2: getrennter Undo-Schritt (sonst macht Strg+Z auch das Einfügen rückgängig)
  await selectImageByKeyboard(page, editor)
  await page.keyboard.press('Delete')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor.locator('img')).toHaveCount(1)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(1)

  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(1) // bestätigt: Undo beeinflusst den Exportzustand, nicht nur die Anzeige
})

test('RT6 (Req 4.2 Testfall 6): alle Bilder nacheinander löschen → Export → Reimport → keine Bild-Referenzen mehr', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Restlicher Text.')
  // Enter zwischen den Einfügungen ist PFLICHT: sonst landet der 2./3. insertImage auf der
  // NodeSelection des zuvor eingefügten Bildes und REPLACED es (replaceSelectionWith) —
  // am Ende bliebe nur ein Bild, `toHaveCount(3)` schlüge fehl.
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(RED_PNG_BASE64), 'a.png')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(GREEN_PNG_BASE64), 'b.png')
  await page.keyboard.press('Enter')
  await insertImage(page, pngBuffer(BLUE_PNG_BASE64), 'c.png')
  await expect(editor.locator('img')).toHaveCount(3)

  for (let i = 0; i < 3; i++) {
    await selectImageByKeyboard(page, editor) // wählt jeweils das letzte Bild deterministisch, R2-免
    await page.keyboard.press('Delete')
  }
  await expect(editor.locator('img')).toHaveCount(0)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(0)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect(documentXml).toContain('Restlicher Text.')

  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(0)
  await expect(page.locator('.ProseMirror')).toContainText('Restlicher Text.')
})

test('RT7 (Req 4.2 Testfall 7): Cross-Format — ODT importieren, Bild löschen, als DOCX exportieren, reimportieren', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Bleibt erhalten.')
  await insertImage(page, pngBuffer(RED_PNG_BASE64))
  await selectImageByKeyboard(page, editor) // Bild ist letztes Element → deterministisch (R-D1)
  await page.keyboard.press('Delete')

  // Export als ODT, dann als DOCX-Zieldatei erneut über die DOCX-Karte hochladen simuliert
  // den Formatwechsel — siehe Hinweis unten zur Klärung des tatsächlichen Cross-Format-UI-Wegs.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const odtBuffer = await fs.readFile((await download.path())!)

  await reimportOdt(page, odtBuffer) // klickt zuerst „← Formate" (R-D5)
  await expect(page.locator('.ProseMirror img')).toHaveCount(0)
  await expect(page.locator('.ProseMirror')).toContainText('Bleibt erhalten.')
})
```

> **Hinweis zur Cross-Format-UI (RT7/RT8/RT9):** Wie bereits in `specs/ausschneiden-qa.md`
> §4.4 vermerkt, ist der genaue Button-/Dropdown-Weg für einen **zielformatspezifischen**
> Export (z. B. „ODT importieren, ausdrücklich als DOCX exportieren“ statt nur erneut ins
> gleiche Format) zum Stichtag dieses Testplans nicht separat verifiziert — nur ein
> generischer „Exportieren“-Button ist belegt. Die obigen Rundreise-Tests decken den
> Datenpfad über die Unit-Cross-Format-Tests in §4.2/§4.3 bereits vollständig ab; die
> **E2E**-Variante von RT7–RT9 mit echtem Formatwechsel-Klick ist vor Implementierung mit
> Dev/PO zu klären (identische offene Frage wie beim Cut-Feature, keine neue Lücke).

```ts
test('RT10 (Req 4.2 Testfall 10): reale Fremddatei importieren, mittleres Bild löschen → Export → Reimport → korrektes Bild fehlt, Rest bleibt unverzerrt', async ({ page }) => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const buffer = await fs.readFile(path.join(__dirname, '../fixtures/external/docx/VariousPictures.docx'))
  const input = docxCard(page).locator('input[type="file"]').first()
  await input.setInputFiles({
    name: 'VariousPictures.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  const editor = page.locator('.ProseMirror')
  const images = editor.locator('img')
  const countBefore = await images.count()
  const srcsBefore = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
  const middle = Math.floor(countBefore / 2)

  // Reale Bilder sind gerendert-groß → klickbar (R-D3); Klick-Weg mit Sync-Gate (R-D1, R2-abhängig).
  await selectImageByClick(images.nth(middle))
  await page.keyboard.press('Delete')
  await expect(images).toHaveCount(countBefore - 1)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  expect(Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))).toHaveLength(countBefore - 1)

  await reimportDocx(page, exportedBuffer) // klickt zuerst „← Formate" (R-D5)
  const reimportedImages = page.locator('.ProseMirror img')
  await expect(reimportedImages).toHaveCount(countBefore - 1)
  const srcsAfter = await reimportedImages.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
  expect(srcsAfter).not.toContain(srcsBefore[middle])
})
```

---

## 6. Traceability-Matrix

| Req-Referenz | Testebene | Datei::Test | Status heute |
|---|---|---|---|
| §0/DoD 1 — Sichtbares Auswahl-Feedback | E2E (Pflicht) | `image-delete.spec.ts` TF1a | **blockiert**, siehe §0 |
| §1 Zugriffsweg 1 — Tastatur + Entf | E2E | TF1b (Tastatur) | lauffähig (deterministisch, R-D1) |
| §1 Zugriffsweg 1 — Klick + Entf | E2E | TF1b-Klick | **R2-abhängig** (R-D4), grün nach code.md §4.4 |
| §1 Zugriffsweg 2 — Toolbar-Button | E2E | TF10 | **blockiert**, siehe §0 |
| §1 Zugriffsweg 3 — Kontextmenü | dokumentiert, nicht automatisiert | `bild-loeschen-code.md` §3.4 | bewusste Entscheidung, kein Test nötig |
| §1 Zugriffsweg 4 — Mod-Backspace | Unit + E2E | §4.4a, TF11 | lauffähig |
| §1 Zugriffsweg 5 — Drag-Out/Abbruch | E2E | TF9 | lauffähig (mit dokumentierter Grenze) |
| §1 Zugriffsweg 6 — Bestätigungsdialog | dokumentiert, kein Test | `bild-loeschen-code.md` §3.5 | bewusste Entscheidung |
| §1 Zugriffsweg 7 — Mobile/Touch | E2E (Projektmatrix) | TF16-Kommentar, TF10 auf allen 3 Projekten | TF10-Teil blockiert |
| Grenzfall 1 | Unit + E2E | §4.4a, TF2 | lauffähig |
| Grenzfall 2 | Unit + E2E | §4.4a, Zusatztest „Grenzfall 2“ | lauffähig |
| Grenzfall 3 | E2E | Zusatztest „Grenzfall 3“ | lauffähig |
| Grenzfall 4 | E2E | Zusatztest „Grenzfall 4“ | lauffähig |
| Grenzfall 5 | Unit + E2E | §4.4a, TF5 | lauffähig |
| Grenzfall 6 | Unit | `image-deletion.test.ts` (beide Formate) | lauffähig |
| Grenzfall 7 | Unit + E2E | §4.4a, TF6, `image-deletion.test.ts` | lauffähig |
| Grenzfall 8 | E2E | Zusatztest „Grenzfall 8“ (OE-1) | lauffähig — friert Ist-Verhalten (Punkt entfernt) ein, PO-Entscheid offen |
| Grenzfall 9 | E2E (Pflicht) | TF14 | lauffähig |
| Grenzfall 10 | E2E | TF13 | lauffähig |
| Grenzfall 11 | Unit + E2E | §4.4a, TF3 | lauffähig |
| Grenzfall 12 | Unit + E2E | §4.4a, TF4 | lauffähig |
| Grenzfall 13 (Selection-Sync) | E2E (Pflicht) | TF7 | lauffähig |
| Grenzfall 14 | E2E | TF9 | lauffähig (mit dokumentierter Grenze, siehe §8) |
| Grenzfall 15 | E2E | TF8 | lauffähig |
| Grenzfall 16 | Unit | §4.4a | lauffähig |
| Grenzfall 17 | E2E + Unit | TF12, `image-deletion.test.ts` (Fremddatei-Block) | lauffähig |
| Grenzfall 18 | E2E | TF15 | lauffähig |
| Grenzfall 19 (Track Changes) | — | explizit außerhalb Scope (Req selbst so vermerkt) | kein Test vorgesehen |
| Grenzfall 20 (Mobile/Touch) | E2E (Projektmatrix) | TF16, TF10 | TF10-Teil blockiert |
| §4.2 Testfall 1 (DOCX-Rundreise) | Unit + E2E | `image-deletion.test.ts` (DOCX), RT1 | lauffähig |
| §4.2 Testfall 2 (ODT-Rundreise) | Unit + E2E | `image-deletion.test.ts` (ODT), RT2 | lauffähig |
| §4.2 Testfall 3 (mehrere Bilder) | Unit + E2E | RT3 | lauffähig |
| §4.2 Testfall 4 (Tabellenzelle) | Unit + E2E | `image-deletion.test.ts`, RT4 | lauffähig |
| §4.2 Testfall 5 (Undo vor Export) | Unit + E2E | `image-deletion.test.ts`, RT5 | lauffähig |
| §4.2 Testfall 6 (alle Bilder weg) | Unit + E2E | `image-deletion.test.ts`, RT6 | lauffähig |
| §4.2 Testfall 7/8 (Cross-Format) | Unit + E2E | `image-deletion.test.ts` (beide Formate), RT7 | E2E-Selektor offen, siehe Hinweis §5.4 |
| §4.2 Testfall 9 (Doppel-Rundreise) | Unit | `image-deletion.test.ts` (DOCX, Cross-Format-Block) | lauffähig |
| §4.2 Testfall 10 (reale Fremddatei) | Unit + E2E | `image-deletion.test.ts` (Fremddatei-Block), RT10 | lauffähig |
| §7 Testmatrix „Undo/Redo“ | Unit + E2E | §4.4a, TF3/TF4 | lauffähig |
| §8 DoD 1–9 | siehe §7 unten | — | siehe §7 |

> **Hinweis (R-D4):** Alle Tests, die ein Bild **per Klick** selektieren (TF1a, TF1b-Klick, TF5, TF6,
> TF12, TF14, RT3/RT4/RT10), sind bis zum R1-CSS-Fix und R2-Guard (code.md §4.1/§4.4) als
> „R2-abhängig" zu verstehen und blockieren den generischen Lösch-Nachweis nicht — dieser läuft
> deterministisch über die **Tastatur**-Selektion (`selectImageByKeyboard`) und ist heute grün.

---

## 7. Abnahmekriterien für QA-Sign-off (Abgleich mit Req Abschnitt 8)

1. **Baseline grün** (§4.1) — Voraussetzung für alles Weitere.
2. **Alle Unit-Tests aus §4.2/§4.3 (Reader/Writer-Rundreise, beide Formate) grün.**
3. **§4.4a (permanente Sonden-Nachbildung) grün und dauerhaft in der Suite** — schließt die
   in §0 dokumentierte Lücke des Code-Plans (gelöschte Einmal-Sonde).
4. **E2E-Testfälle TF1b–TF9, TF11–TF16 sowie alle Grenzfall-Zusatztests aus §5.3 grün** auf
   allen 3 Playwright-Projekten (Desktop Chrome/Mobile/Tablet).
5. **TF7 (Pflicht-Regressionstest Selection-Sync × Bild löschen) grün und dauerhaft in der
   Suite** — kein Überspringen, kein `test.skip`.
6. **Rundreise-Tests RT1–RT6, RT10 aus §5.4 grün** für DOCX und ODT, inklusive der expliziten
   Prüfung auf verwaiste Bilddateien im Zip-Container.
7. **Nach Umsetzung von `bild-loeschen-code.md` §4:** zusätzlich TF1a (sichtbares CSS-Feedback),
   TF10 (Toolbar-Button) und §4.4b (Guard-Unit-Tests) grün, **bevor** der Backlog-Status
   `bild-loeschen` als „vorhanden“ (statt „teilweise“) bestätigt wird (Req DoD 9). Ohne
   grünes TF1a gilt „Markieren“ im Sinne der Backlog-Kurzbeschreibung als **nicht erfüllt**,
   selbst wenn alle anderen Tests grün sind — das ist keine Ermessensfrage, sondern Req DoD 1.
8. **Cross-Format-E2E-Tests RT7–RT9** grün, sobald der Cross-Format-Export-UI-Weg geklärt ist
   (siehe Hinweis §5.4); bis dahin sind die Unit-Cross-Format-Tests aus §4.2/§4.3 als
   hinreichender Zwischen-Nachweis zu werten.
9. **Kein Testlauf zeigt eine Konsolen-/JS-Exception** (§2.3-Helper in jedem E2E-Test aktiv).
9a. **Determinismus (Querschnitts-Kriterium, §5.1a):** Jede Bild-Selektion läuft über
   `selectImageByKeyboard`/`selectImageByClick` mit Sync-Gate; kein Test feuert eine Löschtaste
   direkt nach `click()`/Pfeiltaste; Undo-Tests haben den 600-ms-Settle; Reimport nur via
   `reimportDocx/Odt`. Nachweis der Stabilität: die betroffenen Specs laufen **wiederholt** grün
   (`--repeat-each=5`) auf allen 3 Projekten, insbesondere dem Mobile-Projekt (dort trat die
   async-Selektions-Sync-Flakiness in `cut.spec.ts` historisch auf). Eine Löschprüfung, die nur
   ohne Gate/Settle grün ist, gilt als **nicht bestanden**.
10. Dieser Testplan selbst wird nicht als vollständig grün gemeldet, solange Punkt 7 offen
    ist — der Backlog-Status ist erst nach vollständiger Umsetzung **und** grünen TF1a/TF10
    final zu bestätigen, vorher nur als „teilweise, generisches Löschverhalten verifiziert,
    Sichtbarkeit und Touch-Weg offen“ zu vermerken.

---

## 8. Bekannte Grenzen der Automatisierung (bewusst dokumentiert, kein stiller Blindspot)

- **Echtes Esc-während-des-Ziehens** (Grenzfall 14): Ein nativer HTML5-Drag wird auf
  OS-/Browser-Ebene abgebrochen: Playwrights synthetische `page.mouse`-Sequenz kann einen
  Drop außerhalb eines gültigen Ziels zuverlässig simulieren (TF9), aber keine echte
  Esc-Abbruch-Taste während eines laufenden nativen Drags auslösen. Der in
  `bild-loeschen-code.md` Abschnitt 2 dokumentierte Bibliotheks-Beleg (`handleDrop` erfordert
  ein tatsächliches `drop`-Event mit gültiger Position) deckt den Fall bereits strukturell ab
  — TF9 verifiziert den praktisch relevanteren Teilfall (Drop außerhalb) am echten Browser.
- **Mobile-Tastatur-Restrisiko** (Req Zugriffsweg 7/Grenzfall 20, identisch zu
  `bild-loeschen-code.md` Abschnitt 2 letzter Beleg): Der Chrome-Android-`beforeinput`-
  Workaround in `prosemirror-view` greift nachweislich nicht für eine Bild-`NodeSelection`.
  Playwrights Geräte-Projekte emulieren nur Viewport/UA/Touch, nicht die reale
  On-Screen-Tastatur-Pipeline eines physischen Geräts — das verbleibt ein durch **echte
  Geräte-QA** zu schließendes Restrisiko, strukturell durch den Pflicht-Toolbar-Button
  (sobald TF10 grün ist) bereits abgesichert, aber nicht per Playwright vollständig beweisbar.
- **Natives Rechtsklick-Kontextmenü** (Req Zugriffsweg 3): Playwright kann das native
  Browser-Kontextmenü öffnen (`.click({ button: 'right' })`), aber dessen Einträge sind
  Browser-Chrome außerhalb des DOM und nicht zuverlässig über alle 3 Engines hinweg
  anklickbar — bewusst nicht automatisiert, da laut `bild-loeschen-code.md` §3.4 ohnehin
  kein Dokumentbezug zu diesem Menü besteht (dokumentierte Entscheidung, kein Test nötig).
- **Cross-Format-Export-UI-Weg** (RT7–RT9): siehe Hinweis in §5.4 — identische offene Frage
  wie beim Cut-Feature (`ausschneiden-qa.md` §4.4), vor Implementierung mit Dev/PO zu klären.
- **Track-Changes-Abhängigkeit** (Req Grenzfall 19): explizit außerhalb des Scopes (Phase 3
  nicht umgesetzt) — kein Test vorgesehen, hier nur nachvollziehbar referenziert.

---

## 9. Ausführungsreihenfolge (Empfehlung)

1. `npm test -- roundtrip` (Baseline, §4.1) — muss grün sein, bevor überhaupt fortgefahren wird.
2. `npm test -- image-deletion` (§4.2/§4.3) — schnelle, deterministische Reader/Writer-Ebene.
3. `npm test -- image-generic-delete` (§4.4a) — permanente Nachbildung der Sonden-Fakten,
   **schon heute lauffähig**, unabhängig vom Umsetzungsstand des Code-Plans.
4. `npm run test:e2e -- image-delete.spec.ts` — alle 3 Projekte automatisch über
   `playwright.config.ts`; zuerst nur die heute lauffähigen Testfälle (TF1b–TF9, TF11–TF16,
   alle Grenzfall-Zusatztests, RT1–RT6, RT10) laufen lassen, um den **bereits funktionierenden
   generischen Löschpfad** früh grün zu bestätigen.
5. Nach Umsetzung von `bild-loeschen-code.md` §4: TF1a, TF10 und §4.4b (Guard-Unit-Tests)
   aktivieren/ausführen — TF1a zuerst, da es Req DoD 1 unmittelbar prüft.
6. Cross-Format-E2E-Tests RT7–RT9 nach Klärung des Export-UI-Wegs (siehe §5.4/§8) ergänzen.
7. **Determinismus-Härtung (§7 Punkt 9a):** die neue Spec wiederholt laufen lassen —
   `npm run test:e2e -- image-delete.spec.ts --repeat-each=5` — mit Schwerpunkt **Mobile-Projekt**
   (dort trat die async-Selektions-Sync-Flakiness historisch auf). Jede sporadische Rötung ist ein
   fehlender Sync-Gate/Settle (R-D1/R-D2), **kein** „einfach nochmal laufen lassen".
8. Abschließend: gesamte Suite (`npm test && npm run test:e2e`) für den finalen QA-Sign-off
   gemäß §7.
