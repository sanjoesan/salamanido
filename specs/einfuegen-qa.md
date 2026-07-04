# Testplan „Einfügen" (QA)

Bezug: `E:\docs\specs\einfuegen-req.md` (Anforderung, Stand geprüft 2026-07-04),
`E:\docs\specs\einfuegen-code.md` (Umsetzungsplan, Stand geprüft 2026-07-04).
Geltungsbereich: identisch zur Anforderungsdatei — die Einfügen-Funktion im
gemeinsamen DOCX/ODT-Editor (`src/formats/shared/editor/`), inklusive der laut
Umsetzungsplan neuen Dateien `src/formats/shared/editor/paste.ts` und
`src/formats/shared/imageFallback.ts` sowie der Härtung von
`src/formats/docx/writer.ts`/`src/formats/odt/writer.ts`.

Status dieses Dokuments: Testplan **vor** vollständiger Umsetzung von
`einfuegen-code.md` verfasst. Alle unten genannten Testfälle für noch nicht
existierenden Code (`paste.ts`, `imageFallback.ts`, Plugin-Verdrahtung in
`WordEditor.tsx`) sind zum jetzigen Zeitpunkt **rot/nicht ausführbar** — sie
sind die Abnahmekriterien, gegen die die Umsetzung aus `einfuegen-code.md`
Abschnitt 10 (Reihenfolge der Umsetzung) läuft. Tests gegen bereits
existierenden Code (Baseline-Rundreise, Selection-Sync-Regressionstest,
Export-Absturz-Bug Abschnitt 1) sind schon heute ausführbar und müssen vor
jeder Änderung als Referenzlauf grün sein.

Grundsatz aus `einfuegen-req.md` Abschnitt 6, Punkt 5, hier verbindlich
umgesetzt: **Unit-Tests mit direkt konstruierten `ProseMirrorJSON`-Fixtures
allein reichen nicht.** Jede funktionale Anforderung, die über eine
Bedienhandlung ausgelöst wird (Tastatur, Maus, Datei-Dialog), bekommt
zusätzlich einen echten Playwright-Browser-Test, der tatsächlich klickt,
tippt, eine Datei hochlädt bzw. den Export-Download abfängt und die
heruntergeladene Datei inhaltlich prüft — nicht nur eine interne Reader-/
Writer-Funktion direkt aufruft.

---

## 1. Teststufen-Übersicht

| Stufe | Werkzeug | Zweck | Abschnitt hier |
|---|---|---|---|
| Unit | Vitest (`environment: 'jsdom'`, `vite.config.ts:11`) | Reine Funktionen (`paste.ts`-Hilfsfunktionen, `imageFallback.ts`) und Reader/Writer-Rundreise auf `ProseMirrorJSON`-Ebene, ohne Browser/UI | Abschnitt 2 |
| E2E — deterministisch | Playwright, `ClipboardEvent`/`DragEvent` mit synthetischem `DataTransfer`, dispatcht per `page.evaluate` auf das echte, im Browser laufende `.ProseMirror`-Element | Reproduzierbarer Haupttestkorpus: Klicks, Tippen, Datei-Upload, Datei-Export inkl. Prüfung der heruntergeladenen Datei | Abschnitt 3 |
| E2E — echte OS-Zwischenablage | Playwright, `context.grantPermissions(['clipboard-read','clipboard-write'])` + `navigator.clipboard` + echtes `page.keyboard.press('ControlOrMeta+V')` | Ergänzender Realismus-Test, mind. für Projekt „Desktop Chrome" verpflichtend (`einfuegen-req.md` Abschnitt 6.2) | Abschnitt 3.7 |
| Manuell/exploratory | Echte, lokal installierte Word-/LibreOffice-Writer-Instanz | Grenzfall 14 (höchste inhaltliche Priorität It. Anforderung), IME-Komposition (Grenzfall 8) | Abschnitt 5 |

Alle drei Playwright-Projekte aus `playwright.config.ts:19-23` (`Desktop
Chrome`, `Mobile` = `Pixel 7`/Chromium, `Tablet` = `iPad Mini`/WebKit) laufen
über den deterministischen `ClipboardEvent`/`DragEvent`-Weg mit; die
Clipboard-Permission-API-Tests (Abschnitt 3.7 unten) sind laut
`einfuegen-req.md` Abschnitt 6.2 nur für „Desktop Chrome" verpflichtend, für
„Mobile"/„Tablet" nice-to-have (WebKit/Firefox-Clipboard-Permissions gelten
als weniger zuverlässig) — entsprechend mit `test.skip(({ browserName }) =>
browserName !== 'chromium')` bzw. äquivalenter Projekt-Bedingung abgesichert.

---

## 2. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Neue Datei `src/formats/shared/editor/__tests__/paste.test.ts`

Testet ausschließlich reine, browserunabhängige Funktionen aus
`src/formats/shared/editor/paste.ts` und `src/formats/shared/imageFallback.ts`
(kein `EditorView`, kein echtes `ClipboardEvent` nötig — deckungsgleich mit
`einfuegen-code.md` Abschnitt 8.1).

```ts
import { describe, it, expect } from 'vitest'
import {
  splitPlainTextIntoParagraphs,
  plainTextClipboardParser,
  sanitizePastedHtml,
  sanitizePastedSlice,
} from '../paste'
import { imageFallbackText, isEmbeddableImageSrc } from '../../imageFallback'
import { wordSchema } from '../../schema'
```

| Testfall | Eingabe | Erwartung | Anforderungsbezug |
|---|---|---|---|
| U-01 | `"Einzeiliger Text"` | 1 Chunk, 1 Zeile | 3.3 |
| U-02 | `"Zeile 1\nZeile 2"` (ein `\n`, keine Leerzeile) | 1 Chunk, 2 Zeilen (kein Absatzsplit) | 3.3, 4.1 |
| U-03 | `"Block A\n\nBlock B"` (Leerzeile) | 2 Chunks | 3.3 |
| U-04 | `"Block A\n\n\nBlock B"` (mehrere Leerzeilen) | genau 2 Chunks, keine leeren Zwischenabsätze | 3.3, Grenzfall 3 (analog) |
| U-05 | `"Zeile 1\r\nZeile 2"` (CRLF) | identisch zu U-02 nach Normalisierung | 3.3 |
| U-06 | `"a\tb"` (Tabulatorzeichen) | Tab bleibt Zeichen-für-Zeichen erhalten, keine Umwandlung in Leerzeichen | Grenzfall 6 |
| U-07 | `"Hallo 👋🏽 Welt 𝕏"` (Emoji + Zeichen außerhalb BMP) | Zeichenkette exakt erhalten, `[...text]`-Iteration bzw. `Array.from` liefert keine kaputten Surrogathälften | Grenzfall 5 |
| U-08 | leerer String `""` | 1 Chunk mit 1 leerer Zeile — **muss** von `pasteAsPlainText` als No-Op behandelt werden (separater Test, Abschnitt 2.2) | 3.9 (Ausnahme leere Zwischenablage) |
| U-09 | `plainTextClipboardParser` mit 1-Chunk-Text und `$context` in einem bestehenden Absatz | resultierender `Slice` ist rein inline (`openStart > 0 && openEnd > 0`, kein neu erzeugter `paragraph`-Knoten) | 3.1, 4.1 |
| U-10 | `plainTextClipboardParser` mit 2-Chunk-Text | resultierender `Slice` enthält `paragraph`-Knoten mit `hard_break` zwischen den Zeilen jedes Chunks | 3.3, 4.1 |
| U-11 | `sanitizePastedHtml('<script>alert(1)</script><p>Text</p>')` | `<script>` entfernt, `<p>Text</p>` bleibt | 3.4 |
| U-12 | `sanitizePastedHtml` mit Word-Conditional-Comment-Fixture (`<!--[if gte mso 9]>...<![endif]-->` um einen `<p>`-Block, dazu `mso-*`-Inline-Styles auf verschachtelten `<span>`) — Fixture händisch aus echtem Word-Copy-Export nachgebaut | Kommentar-Block entfernt, **Text im umschlossenen Absatz bleibt erhalten** (kein Textverlust, auch wenn `mso-*`-Formatierung verloren geht) | 3.4, Abschnitt 0.3 des Codebefunds |
| U-13 | `sanitizePastedHtml('<img src="https://example.invalid/x.png" alt="Diagramm">')` | `<img>` ersetzt durch Text `[Bild: Diagramm]` (`imageFallbackText`) | 3.4, Grenzfall 12, `einfuegen-code.md` Abschnitt 1/4.2 |
| U-14 | `sanitizePastedHtml('<img src="https://example.invalid/x.png">')` (kein `alt`) | ersetzt durch `[Bild nicht eingebettet]` | 3.4 |
| U-15 | `sanitizePastedHtml('<img src="data:image/png;base64,....">')` | `<img>` bleibt **unverändert** erhalten | 3.4, 3.5 |
| U-16 | `sanitizePastedHtml` mit unverändertem `<strong>`/`<em>`/`<ul><li>`/`<table>`-Fragment | Fragment bleibt bytegleich (Funktion fasst nur `<script>`/`<style>`/`<meta>`/`<link>`/Conditional Comments/nicht-einbettbare `<img>` an) | 3.4 |
| U-17 | `sanitizePastedSlice` mit einem `Slice`, der einen `image`-Knoten mit `src="https://..."` enthält | Ergebnis-Slice ersetzt den `image`-Knoten durch einen `paragraph`-Knoten mit Platzhaltertext; `slice.content` bleibt eine gültige `Fragment`-Struktur (kein `RangeError` beim `Slice`-Konstruktor) | 3.4, Grenzfall 12, defense-in-depth für Drop-Pfad |
| U-18 | `sanitizePastedSlice` mit `data:`-Bild-Knoten | Slice unverändert (Referenzgleichheit oder inhaltliche Gleichheit) | 3.5 |
| U-19 | `imageFallbackText('Diagramm')` / `imageFallbackText('')` / `imageFallbackText(undefined)` / `imageFallbackText('   ')` | `'[Bild: Diagramm]'` / `'[Bild nicht eingebettet]'` / `'[Bild nicht eingebettet]'` / `'[Bild nicht eingebettet]'` (nur Leerzeichen zählt als leer) | `einfuegen-code.md` Abschnitt 6.1 |
| U-20 | `isEmbeddableImageSrc('data:image/png;base64,abc')` / `(...'https://x/y.png')` / `('')` / `('blob:...')` / `('data:image/png;base64,')` (leerer Payload) | `true` / `false` / `false` / `false` / `true` (Regex prüft nur Schema+Encoding, nicht Payload-Länge — muss explizit so getestet werden, nicht angenommen) | `einfuegen-code.md` Abschnitt 6.1, 7.3 |

Zusätzlich, in derselben Datei oder `pasteAsPlainText.test.ts`, mit einem
`vi.stubGlobal('navigator', { clipboard: { readText: vi.fn() } })`-Mock (kein
echtes Browser-Clipboard nötig, da hier nur die reine Steuerlogik getestet
wird — der **echte** Zwischenablagezugriff wird in Abschnitt 3.7 per
Playwright abgedeckt, nicht hier):

| Testfall | Szenario | Erwartung |
|---|---|---|
| U-21 | `readText()` löst mit leerem String auf | kein `dispatch`-Aufruf auf der übergebenen `view`, kein `onError`-Aufruf (stiller No-Op, Anforderung 3.9 Ausnahme) |
| U-22 | `readText()` wirft (Berechtigung verweigert) | `onError('...')` wird mit nicht-leerer, sichtbarer Meldung aufgerufen, kein Crash |
| U-23 | `readText()` löst mit mehrzeiligem Text auf | `view.dispatch` wird **genau einmal** aufgerufen (ein Undo-Schritt, Anforderung 3.8) |

### 2.2 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`

Bestehendes Muster wiederverwenden (`doc()`/`paragraph()`-Helper, siehe
`roundtrip.test.ts:8-24`). Neue `describe`-Blöcke, **je Format**:

```ts
describe('DOCX round trip: non-embeddable image fallback (Abschnitt 1 Bugfix)', () => {
  it('exports without throwing when an image node has a non-data: src, and preserves surrounding text', async () => {
    const original = doc([
      paragraph('Vorher'),
      { type: 'image', attrs: { src: 'https://example.invalid/chart.png', alt: 'Diagramm' } },
      paragraph('Nachher'),
    ])
    const result = await roundTrip(original) // muss NICHT werfen — Regressionstest für einfuegen-code.md Abschnitt 1
    const texts = (result.body as any).content.map((n: any) => JSON.stringify(n))
    expect(texts.join('')).toContain('Diagramm')
    expect(texts.join('')).not.toContain('image') // kein image-Knoten mehr, Platzhaltertext stattdessen
    expect((result.body as any).content.map((n: any) => n.type)).not.toContain('image')
  })

  it('still throws from ImageCollector.add for a raw call bypassing the writer guard (fail-fast kept intact)', async () => {
    const { ImageCollector } = await import('../imageCollector')
    expect(() => new ImageCollector().add('https://example.invalid/x.png')).toThrow()
  })
})
```

Analog für ODT (`blockToOdt`, `case 'image'`). **Vor** der Härtung aus
`einfuegen-code.md` Abschnitt 7 muss dieser erste Testfall **rot** sein (wirft
aktuell `"Bilder müssen als data-URL vorliegen..."` bis in `writeDocx`/
`writeOdt` durch) — das ist der belegte Bug aus `einfuegen-code.md`
Abschnitt 1 und der erste Test, der grün werden muss, bevor irgendeine
Paste-Logik überhaupt angefasst wird (Umsetzungsreihenfolge Abschnitt 10,
Punkt 1).

Zusätzlich, sobald Paste implementiert ist, Erweiterung des bestehenden
„whole-document fidelity"-Tests (`roundtrip.test.ts:310-358`) um eine
Variante, die zusätzlich einen per Paste erzeugten Absatz mit `hard_break`
und einen eingebetteten Data-URI-Bild-Knoten aus einer simulierten
Einfügung enthält — reiner Rundreise-Test auf JSON-Ebene, **ersetzt nicht**
die E2E-Rundreise aus Abschnitt 3.4 unten (Anforderung Abschnitt 6, Punkt 5:
Unit-Fixtures allein reichen nicht als alleiniger Nachweis).

### 2.3 Nicht in Unit-Tests abgedeckt (bewusst, siehe Abschnitt 3)

Folgende Anforderungen sind **nicht** sinnvoll als Unit-Test prüfbar, weil sie
echtes `EditorView`-Verhalten (Fokus, DOM-Selection, echte `paste`/`drop`-
Events, Undo-Historie über echte Tastatureingabe, Datei-Download) betreffen,
und werden ausschließlich in Abschnitt 3 (Playwright) getestet: 3.2 (Selektion
ersetzen über echte Maus-/Tastaturselektion), 3.6 (Verhalten in Liste/Tabelle/
Überschrift **im laufenden Editor**), 3.8 (Undo/Redo über echte
Tastenkombination), 3.9 (sichtbares Banner im DOM), Grenzfall 1–3, 9, 10, 11,
13, gesamte Abschnitt 5 Rundreise **mit echtem Datei-Download**.

---

## 3. E2E-Tests (Playwright) — echte Browser-Bedienung

Neue Datei `tests/e2e/paste.spec.ts`, Aufbau/Locator-Konventionen identisch zu
den bestehenden Suiten (`docx.spec.ts`, `odt.spec.ts`,
`selection-regression.spec.ts`): `page.goto('/')` → Privacy-Banner wegklicken
(`page.getByRole('button', { name: /verstanden/i }).click()`) →
`docxCard(page)`/`odtCard(page)`-Locator-Helper (`div.rounded-lg` mit
passender `heading`) → `getByRole('button', { name: 'Neu erstellen' })` →
`page.locator('.ProseMirror')`.

Jeder Testfall unten führt **tatsächliche Browser-Interaktionen** aus
(`page.keyboard.type`, `page.locator(...).click`, `page.evaluate` zum
Dispatchen echter `ClipboardEvent`/`DragEvent`-Objekte **im Browser-Kontext**,
`input.setInputFiles(...)` für Datei-Uploads, `page.waitForEvent('download')`
für Exporte) — **keiner** ruft eine interne TS-Funktion (`sanitizePastedHtml`
etc.) direkt aus dem Testprozess auf. Das ist die zentrale Abgrenzung zu
Abschnitt 2.

### 3.1 Test-Infrastruktur (Helper-Funktionen in `paste.spec.ts`)

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Dispatches a real ClipboardEvent('paste') on the focused .ProseMirror element,
 *  exactly the path einfuegen-req.md Abschnitt 6.1 prescribes as the primary technique. */
async function pasteInto(page: Page, opts: { html?: string; text?: string }) {
  await page.evaluate(({ html, text }) => {
    const dt = new DataTransfer()
    if (html) dt.setData('text/html', html)
    if (text) dt.setData('text/plain', text)
    const el = document.activeElement ?? document.querySelector('.ProseMirror')!
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, opts)
}

/** Image-only clipboard content (Anforderung 3.5): a real Blob wrapped as a
 *  DataTransferItem with no accompanying text/html — constructed and dispatched
 *  entirely inside the browser context so it exercises the real Clipboard API shape. */
async function pasteImageBlob(page: Page, pngBase64: string) {
  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'image/png' })
    const file = new File([blob], 'clipboard-image.png', { type: 'image/png' })
    const dt = new DataTransfer()
    dt.items.add(file)
    document.querySelector('.ProseMirror')!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  }, pngBase64)
}

/** Real drag-and-drop simulation (Anforderung Abschnitt 1 #6). */
async function dropInto(page: Page, opts: { html?: string; fileBase64?: string; fileName?: string }) {
  await page.evaluate(async ({ html, fileBase64, fileName }) => {
    const dt = new DataTransfer()
    if (html) dt.setData('text/html', html)
    if (fileBase64) {
      const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0))
      dt.items.add(new File([new Blob([bytes], { type: 'image/png' })], fileName ?? 'drop.png', { type: 'image/png' }))
    }
    const el = document.querySelector('.ProseMirror')!
    const rect = el.getBoundingClientRect()
    el.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 20,
        clientY: rect.top + 20,
      }),
    )
  }, opts)
}

async function exportAndUnzip(page: Page, format: 'docx' | 'odt') {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path!)
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file(format === 'docx' ? 'word/document.xml' : 'content.xml')!.async('text')
  return { zip, xml, buffer }
}
```

`TINY_PNG_BASE64` als lokale Konstante analog zu `TINY_PNG` in
`roundtrip.test.ts:5-6` (Base64-Payload ohne `data:`-Präfix, für die
Blob-Konstruktion oben).

### 3.2 Testfälle — Grundverhalten (Anforderung Abschnitt 3.1–3.3)

Für **beide** Formate (DOCX-Karte **und** ODT-Karte; Tabellenzeilen unten
gelten je einmal pro Karte, `test.describe.each` oder zwei parallele
`describe`-Blöcke wie in `docx.spec.ts`/`odt.spec.ts` getrennt gehalten):

| ID | Aktion (echte Bedienung) | Prüfung |
|---|---|---|
| E-01 | Neues Dokument, `editor.click()`, `page.keyboard.type('Vorher ')`, Cursor bleibt mitten im Satz stehen (`ArrowLeft` × N), `pasteInto(page, { html: '<p>EINGEFÜGT</p>' })`, dann weitertippen `'X'` | `editor` enthält `'Vorher EINGEFÜGTX'` in korrekter Reihenfolge (Anforderung 3.1: Position exakt, Cursor unmittelbar hinter Eingefügtem) |
| E-02 | Text tippen, `ControlOrMeta+a` (ganzes Dokument selektieren), `pasteInto` mit neuem Absatz | alter Text **vollständig verschwunden**, nur neuer Inhalt sichtbar (Anforderung 3.2: Ersetzen, nicht Ergänzen) |
| E-03 | Wort per Doppelklick selektieren, `pasteInto` mit Ersatzwort | nur das Wort ersetzt, Rest des Satzes unverändert |
| E-04 | Tabellenzelle-Inhalt per `ControlOrMeta+a` **innerhalb der Zelle** selektieren (Fokus in `td`), `pasteInto` | nur Zelleninhalt ersetzt, Tabellenstruktur (`td`-Anzahl) unverändert |
| E-05 | `pasteInto(page, { text: 'Zeile 1\nZeile 2' })` (nur `text/plain`, kein `html`) in einen leeren, neuen Absatz | Ergebnis: **ein** `<p>` mit `<br>` zwischen den Zeilen (Design-Entscheidung `einfuegen-code.md` Abschnitt 4.1) — geprüft über `page.locator('.ProseMirror p').count()` (bleibt 1) **und** `page.locator('.ProseMirror br').count()` (wird 1) |
| E-06 | `pasteInto(page, { text: 'Block A\n\nBlock B' })` | zwei `<p>`-Elemente, je mit dem jeweiligen Blocktext |
| E-07 | direkt im Anschluss an E-01: `page.keyboard.type('weiter')` und `page.getByTitle('Fett').click()` auf eine Selektion, die den gerade eingefügten Text einschließt | Selection-Sync-Regressionsschutz (Anforderung Abschnitt 2): Fett greift korrekt auf den erwarteten Bereich, kein falscher Text verschwindet — Muster identisch zu `selection-regression.spec.ts:14-32` |

### 3.3 Testfälle — Formatierter Text / Bilder / Struktur (Anforderung 3.4–3.6)

| ID | Aktion | Prüfung |
|---|---|---|
| E-10 | `pasteInto` mit `<p><strong>fett</strong> <em>kursiv</em> <u>unter</u> <s>durch</s></p>` | jeweiliges CSS/Tag im DOM sichtbar (`page.locator('.ProseMirror strong')` etc. `toHaveCount(1)` je Mark) |
| E-11 | `pasteInto` mit `<p><span style="color: rgb(255, 0, 0)">rot</span></p>` und `background-color`-Variante | resultierender `<span style="color: ...">` bzw. `background-color` im DOM vorhanden |
| E-12 | `pasteInto` mit `<h1>Titel</h1><h3>Untertitel</h3>` | `.ProseMirror h1`/`.ProseMirror h3` mit passendem Text vorhanden (mind. zwei Ebenen, Anforderung 5.2 Testfall 3) |
| E-13 | `pasteInto` mit `<ul><li>A</li><li>B</li></ul>` und separat `<ol><li>X</li></ol>` | `.ProseMirror ul li` bzw. `ol li` mit korrekter Anzahl/Text |
| E-14 | `pasteInto` mit `<img src="data:image/png;base64,...">` | `.ProseMirror img` sichtbar, `src`-Attribut beginnt mit `data:image/png;base64,` |
| E-15 | `pasteInto` mit `<p>Text davor <img src="https://example.invalid/x.png" alt="Diagramm"> Text danach</p>` | Bild erscheint **nicht** im DOM (`page.locator('.ProseMirror img')` Anzahl 0), Platzhaltertext `[Bild: Diagramm]` sichtbar, `'Text davor'`/`'Text danach'` beide vollständig erhalten, **zusätzlich** sichtbares Banner (`page.getByRole('status')` oder äquivalent) mit nicht-leerem Text |
| E-16 | im Anschluss an E-15: Export auslösen (`exportAndUnzip`) | Export **wirft nicht** / löst kein sichtbares Fehler-Overlay aus (deckt `einfuegen-code.md` Abschnitt 1 auf vollem E2E-Pfad ab, nicht nur Unit-Ebene); exportierte XML enthält `Diagramm`, enthält **keine** `<pic:` (DOCX) bzw. `<draw:frame` (ODT) für dieses Bild |
| E-17 | `pasteImageBlob(page, TINY_PNG_BASE64)` (kein begleitendes HTML) in ein fokussiertes, leeres `.ProseMirror` | `.ProseMirror img` erscheint mit `src` beginnend `data:image/png;base64,` (Anforderung 3.5) |
| E-18 | Cursor in ein `list_item` setzen (Klick in vorhandenes `<li>`), `pasteInto` mit `<p>Zeile 1</p><p>Zeile 2</p>` | Listenelement wird nicht dupliziert/aufgebrochen — Anzahl `<li>` bleibt wie erwartet, beide Zeilen im richtigen `<li>`-Kontext lesbar |
| E-19 | Cursor in `list_item`, `pasteInto` mit verschachtelter Liste `<ul><li>Außen<ul><li>Innen</li></ul></li></ul>` | resultierende Struktur enthält verschachteltes `ul` **oder** dokumentiert lesbar linearisiertes Ergebnis — Test hält das tatsächlich beobachtete Verhalten fest (Befund, kein Vorab-Sollwert laut `einfuegen-code.md` Abschnitt 5) |
| E-20 | Cursor in Tabellenzelle, `pasteInto` mit mehrabsätzigem HTML | Zelle enthält mehrere `<p>`, Tabellenstruktur (Zeilen-/Spaltenzahl) unverändert |
| E-21 | Cursor in Tabellenzelle, `pasteInto` mit `<table><tr><td>X</td></tr></table>` (verschachtelte Tabelle) | kein Absturz (Seite bleibt responsiv, `editor` weiterhin editierbar durch Folge-Tipptest), Grenzfall 7 |
| E-22 | Cursor in einer Überschrift (`h1` anklicken), `pasteInto` mit `<p>Zeile 1</p><p>Zeile 2</p>` | `heading`-Element enthält reinen Inline-Inhalt (kein verschachtelter Block), überschüssiger Inhalt landet nachweislich in einem **nachfolgenden** `<p>` — Test dokumentiert das tatsächliche Aufteilungsverhalten |

### 3.4 Testfälle — Einfügen ohne Formatierung, Undo/Redo, Rückmeldung (Anforderung 3.7–3.9)

| ID | Aktion | Prüfung |
|---|---|---|
| E-25 | `context.grantPermissions(['clipboard-read','clipboard-write'])`, `page.evaluate(() => navigator.clipboard.writeText('Reiner Text\n\nZweiter Absatz'))`, Cursor in eine bestehende `h2`, `page.keyboard.press('ControlOrMeta+Shift+v')` | Ergebnis: zwei `<p>`-artige Blöcke ohne Marks; **erster** Block übernimmt Blocktyp der Zielposition (bleibt `h2` laut Design-Entscheidung `einfuegen-code.md` Abschnitt 4.3), zweiter ist `paragraph`; kein `<strong>`/`<em>` im Ergebnis, selbst wenn die Quelle HTML-artigen Text enthält |
| E-26 | `navigator.clipboard.writeText('')`, dann `Mod-Shift-v` | kein Banner, keine DOM-Änderung (Anforderung 3.9 Ausnahme) |
| E-27 | `context.clearPermissions()` (Berechtigung verweigert erzwingen), dann `Mod-Shift-v` | sichtbares Banner mit Fehlermeldung erscheint, **kein** stiller Fehlschlag |
| E-28 | `pasteInto` mit mehrabsätzigem Inhalt, danach `page.keyboard.press('ControlOrMeta+z')` | Dokumentzustand identisch zu vor dem Einfügen (Text **und** Cursor/Selektion), **ein** `Strg+Z` genügt (ein Undo-Schritt für die gesamte Einfügung, Anforderung 3.8) |
| E-29 | im Anschluss an E-28: `page.keyboard.press('ControlOrMeta+y')` (bzw. `Mod-Shift-z`) | eingefügter Zustand identisch wiederhergestellt |
| E-30 | vier `pasteInto`-Aufrufe direkt hintereinander (Grenzfall 9) | vier unabhängige Undo-Schritte — vier `Strg+Z` in Folge machen sie einzeln rückgängig, keine Race Condition/kein Inhaltsverlust |

### 3.5 Grenzfälle (Anforderung Abschnitt 4)

| ID | Grenzfall | Aktion/Prüfung |
|---|---|---|
| E-35 | #1 Position 0 | Cursor per `Home`/`ArrowUp` an Dokumentanfang, `pasteInto`, geprüft: kein führender Leerabsatz, eingefügter Text steht vor dem ursprünglichen ersten Zeichen |
| E-36 | #2 Dokumentende | Cursor per `ControlOrMeta+End`-Äquivalent (`End` im letzten Absatz) ans Ende, `pasteInto`, Inhalt hängt korrekt an |
| E-37 | #3 Leeres Dokument | frisch erstelltes Dokument (nur leerer `<p>`), sofort `pasteInto` ohne vorheriges Tippen — kein doppelter Leerabsatz danach |
| E-38 | #4 Große Textmenge | `pasteInto(page, { text: <mehrere tausend Zeichen erzeugter Lorem-Text> })`, danach Interaktions-Check: `editor.click()`, `page.keyboard.type('x')` reagiert **innerhalb** eines kurzen Timeouts (UI nicht eingefroren), `Strg+Z` macht die gesamte Einfügung in einem Schritt rückgängig |
| E-39 | #5 Emoji/Surrogatpaare | `pasteInto(page, { text: '👨‍👩‍👧‍👦 Familie 𝕏' })`, DOM-Text exakt gleich der Eingabe (`toContainText`, byte-genauer String-Vergleich, nicht nur „enthält etwas") |
| E-40 | #6 Tab-Zeichen | `pasteInto(page, { text: 'a\tb' })`, Export (`exportAndUnzip`) → XML enthält `<w:tab/>`-Äquivalent bzw. `<text:tab/>` (ODT), nicht mehrere Leerzeichen |
| E-41 | #9 wiederholtes Paste | siehe E-30 |
| E-42 | #10 Fokus außerhalb Editor | `pasteInto` wird auf ein anderes Element (z. B. den versteckten Datei-`input[type=file]` oder — falls vorhanden — ein Dateiname-Feld) statt auf `.ProseMirror` dispatcht → Dokumentinhalt bleibt unverändert |
| E-43 | #11 `text/html` + `text/plain` gleichzeitig | `pasteInto(page, { html: '<p>HTML-Variante</p>', text: 'Text-Variante' })` → Ergebnis zeigt `'HTML-Variante'`, **nicht** `'Text-Variante'` (HTML hat Vorrang, Standard-Browserverhalten, muss bestätigt werden) |
| E-44 | #12 Bild ohne HTML | siehe E-17; Testfall hält explizit fest, ob das Verhalten „funktioniert" oder „fehlt" ist (nicht offen lassen) |
| E-45 | #13 Paste + Toolbar-Aktion danach | siehe E-07 |
| E-46 | Kontextmenü-Guard (Anforderung Abschnitt 1 #2 / 4.5) | `page.locator('.ProseMirror').dispatchEvent('contextmenu')` bzw. `page.evaluate(...)` mit manuell konstruiertem `MouseEvent('contextmenu', { cancelable: true })` → `event.defaultPrevented === false` (ausgelesen per `page.evaluate`-Rückgabewert) — automatisierbarer Ersatz für die laut Anforderung 6.3 explizit manuell zu prüfende echte Menü-Optik |

### 3.6 Drag & Drop (Anforderung Abschnitt 1 #6)

| ID | Aktion | Prüfung |
|---|---|---|
| E-50 | `dropInto(page, { html: '<p>Gedroppter Text</p>' })` | kein Absturz, `'Gedroppter Text'` erscheint im Editor an der Drop-Position |
| E-51 | `dropInto(page, { fileBase64: TINY_PNG_BASE64, fileName: 'bild.png' })` (reiner Datei-Drop, kein HTML) | `.ProseMirror img` erscheint als `image`-Knoten mit `data:`-Quelle (Anforderung 1 #6: „idealerweise gleiches Ergebnis wie Einfügen per Zwischenablage") |

### 3.7 Feature-Rundreise mit echtem Datei-Export (Anforderung Abschnitt 5.2) — Kernstück dieses Testplans

Für **jede** Zeile der folgenden Tabelle: neues Dokument (bzw. hochgeladenes
Dokument, siehe Cross-Format-Spalte) → per `pasteInto`/`pasteImageBlob`
einfügen → `exportAndUnzip(page, 'docx')` **oder** `('odt')` (echter
`page.waitForEvent('download')`, echte Datei von der Festplatte gelesen,
echtes `JSZip.loadAsync`) → Inhalt im entpackten XML geprüft → Datei
anschließend **erneut über den Datei-Upload-Input** importiert
(`input.setInputFiles({ name, mimeType, buffer })`, exakt das Download-Buffer
wiederverwendet) → Inhalt im `.ProseMirror`-DOM erneut geprüft. Das ist die
volle Rundreise **über die echte Anwendung**, nicht nur `writeDocx`/`readDocx`
direkt aufgerufen (das leistet bereits Abschnitt 2.2 auf Unit-Ebene).

| ID | Inhalt (Anforderung 5.2, Nr.) | DOCX | ODT | Cross-Format |
|---|---|---|---|---|
| E-60 | 1. Reiner mehrabsätziger Text | `pasteInto({ text: 'Abs. 1\n\nAbs. 2' })` → Export → `word/document.xml` enthält beide Absätze als getrennte `<w:p>` → Reimport zeigt beide Absätze | analog `content.xml`/`<text:p>` | als DOCX eingefügt, als ODT exportiert und umgekehrt (zwei zusätzliche Testfälle E-60a/b) |
| E-61 | 2. Formatierter Text (fett/kursiv/unterstrichen/durchgestrichen/Farbe/Highlight) | Export-XML enthält `<w:b/>`, `<w:i/>`, `<w:u .../>`, `<w:strike/>`, `<w:color .../>`, `<w:shd .../>` | Export-XML enthält je Mark passende `text:style-name`-Referenz mit `font-weight="bold"` etc. (Muster wie `docx.spec.ts:81-82`/`odt.spec.ts:66-67`) | Cross-Format-Variante wie oben |
| E-62 | 3. Überschriften (≥ 2 Ebenen) | `<w:pStyle w:val="Heading1"/>` bzw. `Heading2` im Export | `text:outline-level="1"`/`"2"` | Cross-Format |
| E-63 | 4. Aufzählungs-/nummerierte Liste | `<w:numId>` referenziert Bullet- bzw. Ordered-NumId | `<text:list>` mit passendem `text:style-name` | Cross-Format |
| E-64 | 5. Bild (Data-URI) | Export enthält `word/media/image1.<ext>`, `document.xml` referenziert es über `r:embed` | Export enthält `Pictures/image1.<ext>`, `content.xml` referenziert per `xlink:href`, `META-INF/manifest.xml` listet den Eintrag | Cross-Format — Bild muss nach Cross-Format-Export weiterhin als eingebettetes Bild vorhanden sein, nicht als Platzhalter |
| E-65 | 6. „Einfügen ohne Formatierung"-Ergebnis | Export-XML **ohne** `<w:b/>`/`<w:i/>` für den betroffenen Absatz, reiner `<w:t>`-Text | analog ohne `font-weight`-Style-Referenz | Cross-Format |
| E-66 | 7. Einfügen innerhalb Tabellenzelle/Listenpunkt | Export-XML zeigt Struktur (`<w:tbl>`/`<w:numPr>`) weiterhin intakt um den eingefügten Inhalt herum | analog `<table:table>`/`<text:list>` | Cross-Format |
| E-67 | 8. Kumulative Rundreise (mehrere Einfüge-Ergebnisse in einem Dokument, danach **zweimal** export→reimport) | nach zwei Rundreisen: alle Inhalte aus 1.–7. weiterhin vollständig vorhanden, kein kumulativer Verlust | analog | zusätzlich einmal Cross-Format zwischen den beiden Rundreisen |

**Abnahmekriterium (aus Anforderung Abschnitt 5, hier operationalisiert):**
Für alle E-60…E-67 gilt **hart**: der geprüfte Text darf nach keiner Rundreise
fehlen (`expect(...).toContain(...)` auf den jeweiligen Textinhalt, sowohl im
rohen XML als auch nach Reimport im DOM). Formatierungsverlust bei
Cross-Format ist zulässig **und muss im Testkommentar dokumentiert werden**,
wo er auftritt (z. B. falls eine ODT-spezifische Eigenschaft beim DOCX-Export
keine Entsprechung hat) — er darf aber niemals stillschweigend nur „grün"
markiert werden, ohne dass der Test ihn explizit anspricht.

### 3.8 Baseline-Rundreise (Anforderung Abschnitt 5.1) — Regressionsschutz

Kein neuer Test nötig — **Pflicht-Referenzlauf** der bereits vorhandenen
Suiten vor **und** nach jeder Änderung an der Einfügen-Logik:

- `tests/e2e/docx.spec.ts` — insbesondere `'uploads an existing DOCX file...'`
  und `'round trip: uploading then exporting unchanged...'` (Zeilen 85–125):
  reiner Upload → Export, **ohne** jeden Paste-Vorgang.
- `tests/e2e/odt.spec.ts` — analog.
- `src/formats/docx/__tests__/roundtrip.test.ts`,
  `src/formats/odt/__tests__/roundtrip.test.ts` (alle bestehenden
  `describe`-Blöcke).

Wird als CI-Gate formuliert: **kein** PR, der `paste.ts`/`WordEditor.tsx`
ändert, darf gemergt werden, wenn einer dieser Bestandstests dadurch rot wird
— insbesondere zu prüfen, weil `createPastePlugin` neue `EditorProps`
registriert (`transformPastedHTML`, `handleDrop`, …), die mit
`columnResizing()`/`tableEditing()`/`dropCursor()`/`gapCursor()` interagieren
könnten (`einfuegen-code.md` Abschnitt 8.3).

### 3.9 Selection-Sync-Regressionstest mit Paste-Sequenz (Anforderung Abschnitt 7, letzter Punkt)

Ergänzung eines neuen `test()` **innerhalb** von
`tests/e2e/selection-regression.spec.ts` (nicht in `paste.spec.ts`, damit er
dauerhaft im bestehenden Regressions-Describe-Block läuft und bei jedem Lauf
dieser Datei mitgeprüft wird):

```ts
test('paste over a stale selection does not corrupt subsequent typing (paste variant)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Ursprungstext.')
  await page.keyboard.press('ControlOrMeta+a')

  await page.evaluate(() => {
    const dt = new DataTransfer()
    dt.setData('text/html', '<p>Eingefügt.</p>')
    document.querySelector('.ProseMirror')!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  })

  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')

  await expect(editor).toContainText('Eingefügt.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor).not.toContainText('Ursprungstext.') // wurde durch die Selektion ersetzt
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

### 3.10 Nicht automatisierbar — manuell/exploratory (Anforderung Abschnitt 6.3)

| # | Prüfung | Durchführung |
|---|---|---|
| M-01 | Grenzfall 14: Copy-Paste aus echter, lokal installierter Microsoft-Word- bzw. LibreOffice-Writer-Instanz | Text mit Fett/Kursiv/Überschrift/Liste in Word/Writer erstellen, kopieren, in die App einfügen (echtes Strg+V, kein simuliertes Event), Ergebnis mit Screenshot dokumentieren; mind. Klartext muss korrekt ankommen, Formatierung so gut wie im Schema abbildbar |
| M-02 | Grenzfall 8: IME-Komposition | Mit aktivierter japanischer/chinesischer IME während offener Komposition einen Paste-Vorgang auslösen (Tastenkombination oder Kontextmenü), prüfen: kein Datenverlust der Komposition, kein Crash |
| M-03 | Touch-Paste-Menüs auf `Mobile`/`Tablet` (nice-to-have) | Reales Gerät oder Chrome-DevTools-Geräteemulation, natives Touch-Kontextmenü „Einfügen" antippen |
| M-04 | Kontextmenü-Optik | Rechtsklick im Editor in einem echten, nicht headless laufenden Browser, visuell bestätigen, dass „Einfügen" im nativen Menü erscheint und funktioniert |

Ergebnis jeder manuellen Prüfung wird in `einfuegen-code.md` Abschnitt 11
(Abnahme-Checkliste) nachgetragen: wer, wann, welche Word-/
LibreOffice-Version, Ergebnis.

---

## 4. Rückverfolgbarkeits-Matrix (Anforderung → Testfall)

| Anforderungs-Abschnitt | Testfall(e) |
|---|---|
| 1 (#1 Strg+V) | E-01, E-02, E-10…E-14 |
| 1 (#2 Kontextmenü) | E-46, M-04 |
| 1 (#3 Einfügen ohne Formatierung) | E-25, E-26, E-27 |
| 1 (#6 Drag & Drop) | E-50, E-51 |
| 3.1 | E-01, E-35, E-36 |
| 3.2 | E-02, E-03, E-04 |
| 3.3 | E-05, E-06, U-01…U-10 |
| 3.4 | E-10…E-16, U-11…U-18 |
| 3.5 | E-17, E-44, U-19, U-20 |
| 3.6 | E-18…E-22 |
| 3.7 | E-25, E-26, U-21…U-23 |
| 3.8 | E-28, E-29, U-23 |
| 3.9 | E-15, E-27 |
| 4 (Grenzfälle 1–14) | E-35…E-46, M-01, M-02 |
| 5.1 (Baseline-Rundreise) | Abschnitt 3.8 (Bestandstests) |
| 5.2 (Feature-Rundreise) | E-60…E-67 |
| 6 (Testplan-Hinweise) | Abschnitt 3.1 (Infrastruktur), M-01 |
| 7 (Freigabekriterium) | Abschnitt 6 unten |
| `einfuegen-code.md` Abschnitt 1 (Export-Absturz-Bug) | Unit: Abschnitt 2.2 Testfälle; E2E: E-16 |

---

## 5. Testdaten/Fixtures

- `TINY_PNG_BASE64` — wiederverwendbar aus `roundtrip.test.ts:5-6`
  (`TINY_PNG`, dort mit `data:`-Präfix; für die Blob-Konstruktion in
  Abschnitt 3.1 wird nur der Base64-Teil nach dem Komma benötigt).
- Word-Conditional-Comment-/`mso-*`-Fixture (U-12): wird als String-Literal in
  `paste.test.ts` hinterlegt, nachgebaut aus einem einmalig manuell erzeugten
  echten Word-Export (Kopiervorgang aus Word, `document.getSelection()` +
  Zwischenablage-Inspektion), nicht frei erfunden — sonst besteht die Gefahr,
  dass der Test eine zu „saubere" Annahme über Word-HTML prüft, die an
  echtem Word-Output vorbeigeht (vgl. Anforderung Abschnitt 6.3, Warnung vor
  „automatisiertes Vortäuschen von Word-HTML reicht nicht").
- Lorem-Ipsum-Generator für E-38 (mehrere Seiten Text): lokale Hilfsfunktion,
  deterministische Länge (z. B. 50.000 Zeichen), kein externer Netzwerkzugriff
  (CSP-/Offline-Kompatibilität der Test-Suite).

---

## 6. Exit-Kriterien für diesen Testplan

Deckt sich mit `einfuegen-req.md` Abschnitt 7 und
`einfuegen-code.md` Abschnitt 11. Der Testplan gilt als **erfüllt**, wenn:

1. Alle Unit-Testfälle U-01…U-23 sowie die Erweiterungen aus Abschnitt 2.2
   automatisiert vorliegen und grün sind (`npm test`).
2. Alle E2E-Testfälle E-01…E-67 automatisiert vorliegen und grün sind
   (`npm run test:e2e`), mindestens für Projekt „Desktop Chrome" vollständig,
   für „Mobile"/„Tablet" mit dokumentierten Ausnahmen bei den
   Clipboard-Permission-Testfällen (E-25/E-27), wie in Abschnitt 1 begründet.
3. Die Baseline-Rundreise (Abschnitt 3.8) läuft unmittelbar vor **und** nach
   dem Merge der Einfügen-Änderungen grün.
4. Jeder Grenzfall aus Abschnitt 3.5/3.6/3.10 ist einzeln befundet
   (funktioniert / funktioniert nicht und dokumentiert / repariert) — kein
   Grenzfall bleibt unbeantwortet.
5. Die manuellen Prüfschritte M-01…M-04 sind durchgeführt und in
   `einfuegen-code.md` Abschnitt 11 mit Ergebnis nachgetragen.
6. `npm run build` (`tsc -b`) läuft nach jeder Code-Änderung fehlerfrei durch
   (insbesondere wegen `noUnusedLocals`/`noUnusedParameters`, siehe
   `einfuegen-code.md` Abschnitt 7.2) — Vitest/Playwright allein deckt das
   nicht ab.

Erst wenn alle sechs Punkte erfüllt sind, darf laut
`einfuegen-req.md` Abschnitt 7 der Backlog-Status von `einfuegen` auf
„vorhanden" gesetzt werden.
