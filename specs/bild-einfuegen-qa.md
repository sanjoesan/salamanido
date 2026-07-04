# QA-Testplan: Feature „Bild aus Datei einfügen"

Rolle: QA-Antwort auf `specs/bild-einfuegen-req.md` (Anforderung) und
`specs/bild-einfuegen-code.md` (Umsetzungsplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an — `bild-einfuegen-code.md` ist laut
eigenem Titel ein *Umsetzungsplan*, keine verifizierte Umsetzung. Abschnitt 0
bestätigt per eigener Codesichtung, dass zum Zeitpunkt dieses Testplans **kein
einziger** der dort beschriebenen Fixes (F1–F14) im Code angekommen ist — der
Ist-Stand entspricht unverändert der in `bild-einfuegen-req.md` Abschnitt 0
dokumentierten Analyse. Ergebnis ist ein Testplan, kein Testbericht: Die hier
aufgeführten Tests sind zum Zeitpunkt dieses Dokuments **nicht geschrieben**
(mit Ausnahme der beiden bereits vorhandenen, in 2.1 aufgeführten
Basis-Roundtrip-Tests je Format).

Stil/Gliederung orientiert an `aufzaehlungsliste-qa.md`/`fett-qa.md`. Gliedert
sich, wie beauftragt, in zwei getrennte Teile: **Teil A** (Abschnitt 2) deckt die
Reader/Writer-Rundreise auf Unit-Ebene ab (DOCX **und** ODT); **Teil B**
(Abschnitt 3) besteht ausschließlich aus **echten** Playwright-Browser-Tests
(Klicks, Tastatureingabe, echter Datei-Upload/-Export über den
`filechooser`-Flow, Prüfung der tatsächlich heruntergeladenen Datei mit einem
vom eigenen Reader unabhängigen Parser) — **kein** Testfall in Teil B ersetzt
echte Bedienung durch einen direkten internen Funktionsaufruf.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `bild-einfuegen-code.md`)

Vor Aufstellung des Plans wurden die zentralen Behauptungen aus
`bild-einfuegen-req.md` Abschnitt 0 und `bild-einfuegen-code.md` Abschnitt 1
direkt im aktuellen Code nachvollzogen (nicht nur aus den Dokumenten
übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Bild-Kontrolleintrag ist `<label>`, kein `<button>`, ohne `title`/`aria-label` | `src/formats/shared/editor/Toolbar.tsx:241-244` gelesen; `grep -n "title=\|aria-label" Toolbar.tsx` über die ganze Datei ausgeführt | **Bestätigt.** Zeile 241: `<label className="..." >🖼 Bild<input type="file" accept="image/*" className="hidden" onChange={handleImagePick} /></label>`. Der Grep über die gesamte Datei liefert `title`/`aria-label` für **jedes** andere Bedienelement (Zeilen 46-47, 69, 113, 117, 135-138, 142, 145, 153, 162, 165, 173, 194, 205, 216, 230) — **nicht** für das Bild-Element. |
| `insertImage` setzt nie `width`/`height` | `src/formats/shared/editor/commands.ts:66-74` gelesen | **Bestätigt, wortgleich.** `export function insertImage(src: string, alt = ''): Command { ...wordSchema.nodes.image.create({ src, alt })... }` — kein `width`/`height`-Attribut im übergebenen Objekt, Schema-Default `null` bleibt aktiv. |
| `handleImagePick` prüft `file.type` nicht, keine Größenprüfung, kein try/catch, `alt` = `file.name` | `Toolbar.tsx:97-108` gelesen | **Bestätigt.** Kein Zugriff auf `file.type`/`file.size` im gesamten Funktionskörper; die `FileReader`-Promise (`reader.onerror` reject) hat keinen umschließenden `try`/`catch`; Zeile 107: `run(view, insertImage(dataUrl, file.name))`. |
| `image`-Schema-Attribute `width`/`height` ohne `validate`, `parseDOM` liefert String/`null` statt Zahl | `src/formats/shared/schema.ts:45-72` gelesen | **Bestätigt.** `width: { default: null }`/`height: { default: null }` ohne `validate`-Schlüssel (im Unterschied zu `src`/`alt`, die `validate: 'string'` tragen); `getAttrs` (Zeile 57-65) gibt `el.getAttribute('width')`/`('height')` unverändert zurück (String oder `null`), keine `Number(...)`-Umwandlung. |
| DOCX-Writer erzwingt Fallback 300×200 px | `src/formats/docx/writer.ts:72-92` (`imageParagraphXml`) gelesen | **Bestätigt.** Zeile 76-77: `const widthPx = Number(node.attrs?.width ?? 300)` / `const heightPx = Number(node.attrs?.height ?? 200)`. |
| DOCX-Reader liest `wp:extent` nicht | `src/formats/docx/reader.ts` gelesen, gezielt `grep -n "extent\|docPr"` | **Bestätigt.** Einziger Treffer für `wp`-Namespace-Kindelemente ist `docPr` (Zeile 137, nur für `alt`); kein Zugriff auf `getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')` an irgendeiner Stelle. Der erzeugte Bild-Node (Zeile 138 direkt anschließend, vollständige Struktur an anderer Stelle der Datei) enthält nur `imageRelId`/`imageAlt`, keine Größenfelder. |
| ODT-Writer verwendet Fallback `6cm`/`4cm`, schreibt `px`-Einheit bei vorhandener Größe | `src/formats/odt/writer.ts:112-119` (`blockToOdt`, Fall `'image'`) gelesen | **Bestätigt.** Zeile 115-116: `` const width = node.attrs?.width ? `${node.attrs.width}px` : '6cm' `` / analog für `height`/`4cm`. `"px"` ist kein gültiger ODF-`length`-Wert (siehe Anforderung Neufund 1.3). |
| ODT-Reader liest `svg:width`/`svg:height` nicht | `src/formats/odt/reader.ts` gelesen, gezielt `grep -n "svg\|width\|height"` | **Bestätigt.** Einziger Treffer ist `colwidth` (Tabellenspaltenbreite, Zeile 197, unrelated) — kein Zugriff auf `getAttributeNS(ODF_NAMESPACES.svg, 'width'/'height')` am `draw:frame`-Element. |
| Kein `.ProseMirror-selectednode`-CSS | `src/index.css` vollständig gelesen (72 Zeilen) | **Bestätigt.** Datei enthält `.ProseMirror img { max-width: 100%; height: auto }` (Zeile 39-42, bereits vorhandener, korrekter Fix für die visuelle Seitenbreiten-Begrenzung aus Anforderung Abschnitt 4), aber **keine** Regel für `.ProseMirror-selectednode`. |
| `ImageCollector` dedupliziert nach exakt gleicher Data-URL, nicht nach Dokumentposition | `src/formats/docx/imageCollector.ts:11-33` gelesen | **Bestätigt.** `add(dataUrl)` prüft `fileNameByDataUrl.get(dataUrl)` und gibt bei Treffer denselben Dateinamen zurück — betrifft nur die Zip-Mediendatei, nicht die Anzahl der `image`-Knoten im Dokument selbst (die bleibt dem aufrufenden Writer-Code überlassen, der pro Knoten einen eigenen `<w:drawing>`-Block erzeugt). |
| Kein existierender Browser-Test für Bild-Einfügen | `grep -rniE "image\|bild\|filechooser\|insertimage" tests/e2e/*.spec.ts` ausgeführt | **Bestätigt.** Null Treffer in `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts` (die einzigen vier vorhandenen E2E-Dateien). |
| Bestehende Unit-Tests prüfen `width`/`height` nicht, obwohl teils im Eingabe-Node vorhanden | `src/formats/docx/__tests__/roundtrip.test.ts:251-276`, `src/formats/odt/__tests__/roundtrip.test.ts:212-245` gelesen | **Bestätigt.** DOCX-Test Zeile 253 konstruiert `width: 100, height: 80`, Assertions (Zeile 256-258) prüfen ausschließlich `image.type`/`image.attrs.src`. ODT-Test (Zeile 214) enthält **gar keine** `width`/`height` im Eingabe-Node. |

### 0.1 Zusätzlicher, durch diese QA-Prüfung neu bestätigter Befund

Der in `bild-einfuegen-req.md` Abschnitt 0 (letzte Zeile) und
`bild-einfuegen-code.md` Abschnitt 5.3 als „noch zu klären" markierte Punkt
wurde gegengeprüft: `tests/fixtures/external/README.md` erwähnt zwar
„Kopf-/Fußzeilen, Bildern, Tabellen" als Inhalt der 202 ODT-Fixtures aus
`tdf/odftoolkit`, es existiert aber **keine** Zeile in
`src/formats/odt/__tests__/external-fixtures.test.ts` oder
`src/formats/docx/__tests__/external-fixtures.test.ts`, die auf einen
`image`-Knoten, `src`, `width` oder `height` prüft (per Sichtung beider
Dateien bestätigt — beide enthalten ausschließlich „importiert ohne
Absturz"/`paragraphCount`-Prüfungen, siehe `external-fixtures.test.ts:49-51`
in beiden Formaten). **Konkrete Konsequenz für diesen Plan:** Abschnitt 5.1
Punkt 8 der Anforderung (Abnahmekriterium 8, reale Word-/LibreOffice-Dateien
mit bekannter Bildgröße) ist zum jetzigen Zeitpunkt **komplett ungetestet**,
nicht nur lückenhaft — es ist noch nicht einmal bekannt, *welche* der 127/202
vorhandenen Fixture-Dateien überhaupt ein Bild enthalten. Diese Sichtung (in
`bild-einfuegen-code.md` Abschnitt 5.3/9.5 als offene, manuelle
Voraussetzung benannt) wird unten als eigener, blockierender erster
Testplan-Schritt geführt (siehe 2.7, 3.14, Abschnitt 7 Punkt 1).

Konsequenz für diesen Testplan: Alle unten aufgeführten neuen Testfälle, die
einen der bestätigten Defekte (F1/F3/F5/F6/F7/F8/F10 aus
`bild-einfuegen-code.md`) direkt betreffen, werden als **aktuell rot
erwartet** geführt — Regressionstests, die die Lücke bereits vor jeder
Umsetzung dokumentieren, nicht hypothetische Grenzfälle.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern
    er nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe 3.15).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts`, fortzuführen in `tests/e2e/images.spec.ts`):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`
    (Kartentitel: „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)").
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
  - Datei-Upload, **echter** Klickpfad (Pflicht für Teil B, siehe 3.13):
    `page.waitForEvent('filechooser')` +
    `docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click()`
    (Button existiert bereits, `src/app/FormatPicker.tsx:62-68`), dann
    `fileChooser.setFiles({ name, mimeType, buffer })`.
  - Bild-Kontrolleintrag: **aktuell** nur über
    `locator('label:has-text("🖼 Bild") input[type="file"]')` ansprechbar (kein
    `title`/`role="button"`, siehe 0) — sobald F2 umgesetzt ist, wechselt der
    Locator auf `page.getByRole('button', { name: 'Bild einfügen' })`. Beide
    Varianten werden unten explizit geführt (siehe 3.6).
  - Test-Bilder: synthetische PNG/JPEG-Buffer direkt im Testcode erzeugt
    (kein neues Binär-Fixture nötig für die synthetischen Fälle), analog
    `buildSampleDocx()` in `docx.spec.ts:7-48`. Für Größen-/Seitenverhältnis-
    Tests werden echte, minimale PNG-Encoder-Bytes benötigt (z. B. über eine
    kleine, im Testcode gepflegte Helper-Funktion, die ein unkomprimiertes
    PNG mit bekannten `IHDR`-Maßen erzeugt — kein Rückgriff auf `file.type`
    als Signal, da genau das laut Grenzfall 3.3 geprüft werden soll).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene
(ProseMirror-`image`-Node ⇄ XML). Testet ausschließlich `insertImage`,
`writeDocx`/`readDocx`, `writeOdt`/`readOdt` sowie die neuen Hilfsmodule
(`imageValidation.ts`, `units.ts` aus `bild-einfuegen-code.md` Abschnitt 4.2/
4.3) direkt — **keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab | Ist-Zustand |
|---|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:252` („preserves an embedded image as a self-contained data URL") | Grundfall, Data-URL bleibt erhalten | Anforderung 5.1.1 (Teilaspekt) | **GRÜN**, aber lückenhaft — prüft `width`/`height` nicht, obwohl Eingabe sie enthält (siehe 0) |
| `src/formats/docx/__tests__/roundtrip.test.ts:261` („splits a paragraph containing both text and an image into separate blocks") | Trennung Text/Bild als eigene Blocktypen | Anforderung 3.2 (Teilaspekt, nur konstruierte Daten) | **GRÜN**, aber deckt nur Blocktyp-Trennung ab, nicht die in 3.2 geforderte Cursor-Positions-Matrix und nicht den echten `filechooser`-Flow |
| `src/formats/docx/__tests__/roundtrip.test.ts:310` (Whole-Document-Fidelity) | Bild als Geschwisterelement neben Überschrift/Absatz/Liste/Tabelle | Grundstruktur | **GRÜN**, aber Bild taucht nur als letztes Element auf — keine Abdeckung für Bild **innerhalb** Tabellenzelle/Listenpunkt/Kopf-Fußzeile |
| `src/formats/odt/__tests__/roundtrip.test.ts:213` (analog) | Data-URL + Alt-Text-Rundreise | Anforderung 2.5, 5.1.2 (Teilaspekt) | **GRÜN**, aber Eingabe-Node enthält gar kein `width`/`height` — Maß-Rundreise nicht einmal versucht |
| `src/formats/odt/__tests__/roundtrip.test.ts:223` (analog) | Trennung Text/Bild | analog | **GRÜN**, gleiche Einschränkung wie DOCX-Pendant |

Diese Tests bleiben unverändert Teil der Suite; sie werden **ergänzt**, nicht
ersetzt.

### 2.2 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts`

Isoliert, formatunabhängig — schnellster Nachweis für F1/F11 (`insertImage`
selbst, ohne Reader/Writer). Nutzt `EditorState.create({ schema: wordSchema,
doc: wordSchema.nodeFromJSON(...) })` + `TextSelection.create(...)` an
definierter Position, ruft `insertImage(...)(state, tr => dispatch)` auf und
inspiziert `tr.doc.toJSON()` — genau das Muster, das laut
`bild-einfuegen-code.md` Abschnitt 1.6 bereits temporär (und wieder entfernt)
verwendet wurde, hier aber **dauerhaft** als Regressionstest verankert wird.

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| CI1 | Cursor inmitten eines Wortes in einem nicht-leeren Absatz | `"HalloWelt"`, Cursor zwischen „Hallo" und „Welt" | Zwei Absätze `"Hallo"`/`"Welt"`, Bild dazwischen, **kein** Textverlust | 2.1.3/3.2(c), Kernfall der Meldung | **GRÜN erwartet** (laut Codeanalyse in `bild-einfuegen-code.md` 1.6 bereits korrekt — muss aber tatsächlich als Test existieren, nicht nur behauptet werden) |
| CI2 | Cursor ganz am Anfang eines nicht-leeren Absatzes | analog 3.2(a) | Bild **vor** unverändertem Absatz, kein leerer Stub | 3.2(a) | **GRÜN erwartet** |
| CI3 | Cursor ganz am Ende eines nicht-leeren Absatzes | analog 3.2(b) | Bild **nach** unverändertem Absatz | 3.2(b) | **GRÜN erwartet** |
| CI4 | Cursor inmitten fett-/kursiv-formatierten Textteils | Absatz mit `strong`-Mark auf Teiltext, Cursor mittig | Beide Textteile behalten `strong`, Bild-Node **ohne** geerbte Mark | 3.2(d) | **GRÜN erwartet** |
| CI5 | Cursor in komplett leerem Absatz | leerer `paragraph` als einziger Inhalt | Absatz wird durch Bild **ersetzt**, kein verwaister leerer Block danach | 3.2(e) | **GRÜN erwartet** |
| CI6 | Cursor unmittelbar vor einem `hard_break` | Absatz mit `hard_break`-Kind, Cursor davor | `hard_break` bleibt im **zweiten** Teilabsatz erhalten | 3.2(f) | **GRÜN erwartet** |
| CI7 | Cursor inmitten einer Überschrift | `heading`-Node, Cursor mittig im Text | Überschrift wird in zwei gleichrangige `heading`-Knoten geteilt, Bild dazwischen, kein Crash | 2.8, offene Entscheidung 9.3 | **GRÜN erwartet**, aber **Dokumentationspflicht**: Testkommentar muss ausdrücklich festhalten, dass dies eine noch nicht produktseitig bestätigte Verhaltensentscheidung ist (siehe Abschnitt 8) |
| CI8 | Cursor am Anfang/Ende einer Überschrift | analog CI2/CI3, aber `heading` | Bild vor/nach unveränderter Überschrift, **kein** Teilen | 2.8 | **GRÜN erwartet** |
| CI9 | Cursor am Anfang des (einzigen) Absatzinhalts eines `list_item` | `bullet_list > list_item > paragraph`, Cursor am Anfang | Bild bleibt **innerhalb** desselben `list_item` (führendes `paragraph`-Kind bleibt erhalten, ggf. 1-Zeichen-Stub), Liste bricht nicht | 2.8, F1 | **GRÜN erwartet** |
| CI10 | Cursor mittig/am Ende im Absatz eines `list_item`, zwei benachbarte `list_item`s | analog CI9 | Bild bleibt im **ersten** `list_item`, **kein** Vertauschen/Vermischen mit dem zweiten | 2.8 | **GRÜN erwartet** |
| CI11 | Cursor mittig im Absatz einer `table_cell` | `table > table_row > table_cell > paragraph` | Zelle bleibt gültig (`block+`), Bild zwischen zwei Absätzen in derselben Zelle | 2.8 | **GRÜN erwartet** |
| CI12 | Bestehende, nicht-leere Selektion beim Einfügen | Wort selektieren, dann `insertImage` aufrufen | Selektierter Text wird **ersetzt**, nicht ergänzt | 2.2 | **GRÜN erwartet** |
| CI13 | `insertImage(src)` ohne drittes Argument/Options | wie heutige Signatur `insertImage(src, alt)` | `width`/`height` bleiben `null` (Abwärtskompatibilität, falls Signatur laut F1-Fix erweitert wird) | Abwärtskompatibilität | **GRÜN erwartet nach F1-Fix**, **heute bereits trivial grün** (da `width`/`height` schlicht nie existieren) |
| CI14 | **Regressionstest F1** — `insertImage` mit expliziter Zielbreite/-höhe (z. B. aus `computeDisplaySize`) | `insertImage(src, { alt, width: 400, height: 300 })` (neue, laut Code-Plan vorgesehene Signatur) | Erzeugter Node hat **exakt** `attrs.width === 400`, `attrs.height === 300` | F1, 2.4 | **ROT** — heutige Signatur `insertImage(src, alt = '')` akzeptiert kein drittes Argument; Test muss vor F1-Umsetzung fehlschlagen (Kompilierfehler oder ignoriertes Argument) |

Testfälle CI1–CI13 sind bewusst **schon heute grün erwartet** (sie
dokumentieren das laut `bild-einfuegen-code.md` Abschnitt 1.6 bereits korrekte
`replaceSelectionWith`-Verhalten als dauerhaften Regressionsschutz — bislang
existierte dafür **kein einziger** Test, nur eine einmalige, wieder entfernte
manuelle Prüfung). CI14 ist der einzige in diesem Block bewusst **rot**
geführte Fall, weil er eine noch nicht existierende Signaturerweiterung
voraussetzt.

### 2.3 Neue Datei: `src/formats/shared/editor/__tests__/imageValidation.test.ts`

Voraussetzung: Modul `src/formats/shared/editor/imageValidation.ts` existiert
(laut `bild-einfuegen-code.md` 4.2 vorgesehen, **aktuell nicht vorhanden** —
per `Glob src/formats/shared/editor/imageValidation.ts` verifiziert: Datei
existiert nicht). Alle Testfälle hier sind daher zwangsläufig **ROT**, bis die
Datei geschrieben ist.

| # | Testfall | Erwartung | Bezug | Status |
|---|---|---|---|---|
| IV1 | `sniffImageMimeType` mit echtem PNG-Signatur-Byte-Präfix (`89 50 4E 47 0D 0A 1A 0A`) | `'image/png'` | 3.3, F3 | **ROT** (Modul fehlt) |
| IV2 | analog JPEG (`FF D8 FF`), GIF87a, GIF89a, BMP (`42 4D`) | jeweils korrekter MIME-Typ | 3.3 | **ROT** |
| IV3 | WebP (RIFF-Container, `RIFF....WEBP`) | `'image/webp'` | 3.3 | **ROT** |
| IV4 | Leerer Byte-Puffer, zu kurzer Puffer, zufälliger/unbekannter Puffer (z. B. Anfang einer `.txt`-Datei) | `null` | Grenzfall 3.3 (Kernfall: falscher MIME-Typ) | **ROT** |
| IV5 | `computeDisplaySize`: Bild kleiner als `maxWidth` | Rückgabe unverändert (keine Hochskalierung) | 2.4 | **ROT** |
| IV6 | `computeDisplaySize`: Bild breiter als `maxWidth` | Herunterskaliert, Seitenverhältnis erhalten (Rundungstoleranz ±1px) | 2.4, 3.4 | **ROT** |
| IV7 | `computeDisplaySize`: 0×0-Eingabe | sinnvoller Fallback statt `NaN`/Division durch 0 | Robustheit | **ROT** |
| IV8 | `arrayBufferToBase64`: Rundreise gegen `atob()` für Puffer < 0x8000 Bytes **und** > 0x8000 Bytes | identisches Ergebnis, kein Stack-Overflow beim großen Puffer | F4, 3.7 | **ROT** |
| IV9 | `MAX_IMAGE_BYTES`/`SUPPORTED_IMAGE_MIME_TYPES`: Snapshot der dokumentierten Werte | Werte entsprechen der freigegebenen Entscheidung aus Abschnitt 9 von `bild-einfuegen-code.md` (**vor** Test-Implementierung mit dem Product Owner zu bestätigen, siehe Abschnitt 8 dieses Plans) | offene Entscheidung 9.1/9.2 | **ROT/blockiert bis Freigabe** |

**Bewusst nicht hier abgedeckt:** `loadImageDimensions` (echte
Bilddekodierung über `new Image()`) — jsdom dekodiert keine echten Bilddaten
(bereits im Projekt etabliertes, dokumentiertes Muster, vgl.
`SKIP_SLOW_UNDER_JSDOM` in `docx/__tests__/external-fixtures.test.ts:40`).
Wird ausschließlich per E2E (3.8) mit echten Testbild-Dateien abgesichert.

### 2.4 Neue Datei: `src/formats/shared/units.test.ts`

Voraussetzung: Modul `src/formats/shared/units.ts` (laut Code-Plan 4.3,
**aktuell nicht vorhanden**, per `Glob` verifiziert).

| # | Testfall | Erwartung | Status |
|---|---|---|---|
| U1 | `pxToEmu(96)` | `914400` (exakt 1 Zoll) | **ROT** (Modul fehlt) |
| U2 | `emuToPx(pxToEmu(x))` für mehrere `x` | Rundreise im Rahmen der Rundungsgenauigkeit (±1px) | **ROT** |
| U3 | `pxToCm(96)` | `2.54` | **ROT** |
| U4 | `pxToCm(300)` | `≈7.94` (Toleranz 0.01) | **ROT** |
| U5 | `parseOdfLength('6cm')`, `('1in')`, `('28.35pt')`, `('120mm')`, `('300px')` | jeweils korrekter px-Wert (Referenzwerte aus Code-Plan 4.3 nachrechnen) | **ROT** |
| U6 | `parseOdfLength('')`, `(null)`, `('abc')`, `('-5cm')` | `null` (kein Wurf, defensiv gegen reale Fremddateien) | **ROT** |
| U7 | **Regressionstest gegen den in Anforderung 1.3/Neufund dokumentierten Bug:** `parseOdfLength('300px')` interpretiert `px` **nicht** als `pt` oder sonstige Einheit, sondern exakt als CSS-Pixel bei 96 dpi | `300` | Neufund 1.3 (F8) | **ROT** |

### 2.5 `src/formats/docx/__tests__/roundtrip.test.ts` — Erweiterungen (F13/F5/F1)

| # | Testfall | Vorgehen | Erwartung | Status |
|---|---|---|---|---|
| D1 | **Ergänzung des bestehenden Tests Zeile 252**: `expect(image.attrs.width).toBe(100)` / `expect(image.attrs.height).toBe(80)` hinzufügen | Eingabe hat bereits `width: 100, height: 80` (Zeile 253) | Muss die Maße exakt zurückerhalten | **ROT** — Reader liest `wp:extent` nicht (bestätigt in 0), Writer schreibt zwar `cx`/`cy` aus den Eingabewerten korrekt, aber der Reader ignoriert sie beim Reimport → `width`/`height` kommen als `null` zurück |
| D2 | Bild **ohne** `width`/`height` im Eingabe-Node → Rundreise | `{ type: 'image', attrs: { src: TINY_PNG, alt: '' } }` (kein width/height) | Nach F1/F5/F7: gemeinsame Ersatzgröße 300×200 (nicht `null`, da Writer jetzt aktiv schreibt und Reader jetzt liest) | **ROT bis F5/F7 umgesetzt** (heute: bleibt `null`, da Reader den geschriebenen Fallback-Wert gar nicht liest) |
| D3 | **Deckt F5 direkt:** handgebautes DOCX-XML mit `<wp:extent cx="1828800" cy="1143000"/>` (2×1,25 Zoll = 192×120 px) direkt per JSZip zusammengesetzt, unabhängig vom eigenen Writer | Reader auf dieses Roh-XML anwenden | `image.attrs.width === 192`, `image.attrs.height === 120` | **ROT** — Lesepfad existiert nicht (bestätigt 0) |
| D4 | Bild in Tabellenzelle mit `width`/`height` | `table_cell.content = [{ type: 'image', attrs: { src, width: 150, height: 100 } }]` | Nach Rundreise: Zelle enthält weiterhin genau ein Bild mit identischer Größe (deckt Rundreise-Szenario 5.1.8 auf Unit-Ebene ab — laut Anforderung Abschnitt 0 bislang **nicht einmal** diese Grundstruktur getestet) | **ROT** (Größe), aber Positions-/Strukturerhalt bereits heute **grün erwartbar** — getrennt zu protokollieren |
| D5 | Bild in Kopf-/Fußzeile mit `width`/`height` | `header`/`footer` mit `image`-Node | Größe bleibt nach Rundreise erhalten | **ROT** (Größe), Struktur **grün erwartbar** |
| D6 | Zwei **unterschiedliche** Bilder (verschiedene Data-URLs) an unterschiedlichen Positionen mit unterschiedlicher Größe | zwei `image`-Nodes im Dokument | Beide bleiben nach Rundreise an ihrer jeweiligen Position, mit je eigener (heute: keiner, nach Fix: korrekter) Größe unterscheidbar | Struktur **grün erwartbar** (Grenzfall betrifft nur Größe) |
| D7 | **Deckt Grenzfall 3.6:** zweimaliges Einfügen **derselben** Data-URL an unterschiedlichen Positionen | zwei `image`-Nodes mit identischem `src` | Nach Rundreise **beide** Vorkommen erhalten (nicht auf eines dedupliziert) — `ImageCollector` dedupliziert nur die Zip-Mediendatei (bestätigt 0), nicht die Dokumentposition | **GRÜN erwartet** (bereits vorhandenes Writer-Verhalten, nur bislang ungetestet) |

### 2.6 `src/formats/odt/__tests__/roundtrip.test.ts` — Erweiterungen (F13/F6/F8/F1)

| # | Testfall | Vorgehen | Erwartung | Status |
|---|---|---|---|---|
| O1 | Ergänzung analog D1: Eingabe **mit** `width`/`height` → Assertion auf exakte Werte | analog | Muss Maße exakt zurückerhalten | **ROT** — heutiger ODT-Test hat nicht einmal `width`/`height` im Eingabe-Node (siehe 0); nach Ergänzung tritt derselbe Reader-Defekt wie bei DOCX zutage |
| O2 | **Deckt F6 direkt:** handgebautes `content.xml` mit `<draw:frame svg:width="5cm" svg:height="3cm">...` per JSZip, unabhängig vom eigenen Writer | Reader auf Roh-XML anwenden | `width ≈ 189px`, `height ≈ 113px` (Toleranz aus Rundung) | **ROT** — Lesepfad existiert nicht (bestätigt 0) |
| O3 | **Deckt F8:** exportiertes `content.xml` enthält **keine** `svg:width="...px"`-Zeichenkette mehr | Bild mit `width`/`height` exportieren, rohen XML-String per Regex prüfen | Kein `px`-Suffix bei `svg:width`/`svg:height` (nur `cm`/`mm`/…) | **ROT** — aktueller Writer schreibt exakt `${width}px` (bestätigt 0, `odt/writer.ts:115-116`) |
| O4 | Bild ohne Größe → Rundreise | wie D2 | gemeinsame Ersatzgröße (in cm ausgedrückt, umgerechnet aus `DEFAULT_IMAGE_WIDTH_PX`) statt der heutigen, undokumentiert abweichenden `6cm`/`4cm` | **ROT bis F7 umgesetzt** |
| O5 | Bild in Tabellenzelle / Kopf-Fußzeile mit Größe | analog D4/D5 | Größe bleibt erhalten | **ROT** (Größe), Struktur **grün erwartbar** |
| O6 | Zwei unterschiedliche + zwei identische Bilder | analog D6/D7 | analog | D6-Teil **rot** (Größe), D7-Teil **grün erwartbar** |

### 2.7 Erweiterung `external-fixtures.test.ts` (DOCX + ODT) — F14, schließt 0.1

**Vorbedingung, vor Testimplementierung durchzuführen (kein Code, reine
Sichtung, siehe Abschnitt 7 Punkt 1):** Die 127 DOCX-/202 ODT-Fixture-Zips in
`tests/fixtures/external/{docx,odt}/` müssen auf tatsächlich enthaltene
`<w:drawing>`/`draw:frame`-Elemente durchsucht werden (z. B. per einmaligem
Wegwerf-Skript: `for f in *.docx; do unzip -p "$f" word/document.xml | grep -l
"w:drawing"; done` bzw. ODT-Äquivalent über `draw:frame`) — **nicht** anhand
von Dateinamen raten. Ergebnisliste dieser Sichtung wird Teil des
QA-Testberichts, sobald ausgeführt (aktuell offen, siehe Abschnitt 8).

| # | Testfall | Vorgehen | Erwartung | Status |
|---|---|---|---|---|
| EF1 | Für jede laut Vorab-Sichtung bildhaltige Fixture: gefundene `image`-Knoten haben `width`/`height` **nicht** `null` | bestehende Lade-Schleife (`loadFixtures()`) um Knoten-Traversal erweitern | mind. 1 `image`-Knoten mit numerischem `width`/`height` je bildhaltiger Datei | **ROT bis F5/F6 umgesetzt** |
| EF2 | Für dieselben Fixtures: Rundreise (Import → unveränderter Export → Reimport) erhält Anzahl der `image`-Knoten exakt | wie bestehende Fixture-Tests, nur mit zusätzlicher Zählung | Anzahl vor/nach identisch | **GRÜN erwartbar** unabhängig vom Größen-Bug (reine Strukturzählung) |

### 2.8 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 5.1.5/5.1.6/5.1.7 (Cross-Format), schneller als
E2E, ergänzt — ersetzt nicht — den Browser-Test in 3.9.

| # | Testfall | Vorgehen | Erwartung | Status |
|---|---|---|---|---|
| X1 | DOCX → ODT: Bild mit Größe | `WordDocumentContent` mit `image`-Node (`width: 320, height: 180`) → `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` | Größe bleibt (umgerechnet in die jeweilige interne px-Einheit) erhalten, Alt-Text ebenfalls | **ROT bis F5/F6/F7/F8 umgesetzt** |
| X2 | ODT → DOCX, spiegelbildlich | analog | analog | **ROT bis Fixes** |
| X3 | Doppelte Rundreise DOCX → ODT → DOCX (Anforderung 5.1.7) | dreifache Konvertierung eines Dokuments mit Bild | Bild inhaltlich identisch, kein kumulativer Maßverlust | **ROT bis Fixes** |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wortgleich mit dem Auftrag zu
diesem Plan):** Kein Testfall in Teil B darf durch direkten Aufruf interner
Funktionen (`insertImage(...)`, `readDocx(...)`, `sniffImageMimeType(...)`
etc.) im Node-Kontext ersetzt werden. Jeder Testfall läuft über echte
Nutzer:innen-Handlungen im Browser: `locator.click()`,
`page.keyboard.press(...)`/`.type(...)`, echter Datei-Upload
(`page.waitForEvent('filechooser')` + Klick auf ein sichtbares
Bedienelement, **nicht** blankes `setInputFiles` auf den versteckten Input
als einziger Weg — siehe 3.13 für die Ausnahme, wo `setInputFiles` zusätzlich
zulässig ist), `page.waitForEvent('download')` + Auslesen und
**strukturelles** Parsen der heruntergeladenen Datei vom Dateisystem
(`JSZip` + `DOMParser`, nicht nur `.toContain`-Stringsuche). Löst vollständig
den in `bild-einfuegen-req.md` Abschnitt 0 (letzte Zeile) und Abschnitt 6.3
(„aktuell nicht vorhanden") dokumentierten Befund.

### 3.1 Neue Datei: `tests/e2e/images.spec.ts`

Folgt den bestehenden Konventionen aus `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (`docxCard`/`odtCard`-Locator-Helfer lokal
dupliziert, `page.getByRole('button', ...)`-Selektoren,
`page.waitForEvent('download')` + `JSZip` für Export-Prüfung). Deckt **beide**
Formate über echten Datei-Upload/-Download ab. Eine `describe`-Gliederung je
Themenblock unten, ein `test` je Zeile.

**Wichtiger Hinweis zum aktuellen Bild-Bedienelement (Konsequenz aus F2, siehe
0):** Solange `Toolbar.tsx:241-244` unverändert ist, gibt es **kein**
`role="button"`-Element und **keinen** `title`/`aria-label="Bild
einfügen"` — Tests, die den Kontrolleintrag ansprechen, müssen bis zur
Umsetzung von F2 den Fallback-Locator
`page.locator('label:has-text("🖼")').locator('input[type="file"]')` bzw.
direkt `page.locator('.hidden[type="file"][accept="image/*"]')` verwenden.
**Test L-B1 unten (3.6) prüft explizit, dass genau dieser Fallback nötig ist**
und muss nach F2-Umsetzung auf den Ziel-Locator (`getByRole('button', { name:
'Bild einfügen' })`) umgestellt werden — nicht stillschweigend weiterlaufen.

#### 3.2 Grundfall: Einfügen an der Cursor-Position, echter `filechooser`-Flow (Anforderung 2.1, 3.2 — höchste Priorität)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| B1 | Cursor inmitten eines Wortes (Kernfall der Nutzerinnen-Meldung) | Editor fokussieren, `"HalloWelt"` tippen, Cursor per `ArrowLeft`-Sequenz zwischen „Hallo"/„Welt" setzen, echten Upload über den Bild-Kontrolleintrag auslösen (`page.waitForEvent('filechooser')` + Klick auf das Label/den versteckten Input, siehe Hinweis oben), Test-PNG auswählen | `page.locator('.ProseMirror img')` sichtbar; Editor-Text enthält weiterhin **beide** Teile „Hallo" und „Welt" (`toContainText`, zusätzlich exakte Absatzanzahl `page.locator('.ProseMirror p')` prüfen) | 3.2(c), zentraler gemeldeter Fehler | **GRÜN erwartet** (Command-Ebene laut CI1 bereits korrekt), **muss aber der erste tatsächlich ausgeführte Beweis über den echten Browser-Weg sein** — bislang nicht real getestet |
| B2 | Cursor ganz am Anfang eines Absatzes | analog, `Home` statt Cursor mittig | Bild **vor** unverändertem Absatztext | 3.2(a) | **GRÜN erwartet** |
| B3 | Cursor ganz am Ende eines Absatzes | analog, `End` | Bild **nach** unverändertem Absatztext | 3.2(b) | **GRÜN erwartet** |
| B4 | Cursor inmitten fett-formatierten Textteils | Wort fett formatieren (Toolbar „Fett"), Cursor mittig hinein, Bild einfügen | Beide Textteile bleiben **fett**, Bild selbst nicht fett gerendert | 3.2(d) | **GRÜN erwartet** |
| B5 | Cursor in leerem Absatz | neues leeres Dokument, Cursor im einzigen leeren Absatz | Bild ersetzt Absatz, Editor bleibt bedienbar (Text davor/danach eintippbar) | 3.2(e), 3.8 | **GRÜN erwartet** |
| B6 | Cursor inmitten einer Überschrift | „Überschrift 1" wählen, Text tippen, Cursor mittig, Bild einfügen | Zwei Überschriften gleichen Levels, Bild dazwischen, kein Crash — **Ergebnis explizit protokollieren**, da laut Code-Plan offene Entscheidung 9.3 noch nicht produktseitig bestätigt | 2.8, 9.3 | **Dokumentationspflichtig** |
| B7 | Cursor in Listenpunkt (einzelner Punkt) | Aufzählung erzeugen, Cursor in den Text, Bild einfügen | Bild bleibt **innerhalb** des `<li>`, Liste bleibt als `<ul>` erhalten (kein Abbruch der Aufzählung) | 2.8 | **GRÜN erwartet** |
| B8 | Cursor in Tabellenzelle | Tabelle einfügen, in Zelle klicken, Bild einfügen | Bild erscheint **innerhalb** der Zelle, restliche Zellen unverändert bedienbar | 2.8 | **GRÜN erwartet** |
| B9 | Bestehende Textselektion wird ersetzt | Wort markieren, Bild einfügen | Markierter Text verschwindet, Bild an seiner Stelle | 2.2 | **GRÜN erwartet** |
| B10 | Bild am Dokumentanfang/-ende | Bild als allererstes bzw. -letztes Element einfügen | Editor bleibt bedienbar, Cursor davor/danach positionierbar, weiterer Text eintippbar | 3.8 | **GRÜN erwartet** |
| B11 | Bild unmittelbar neben Tabelle/Liste | Bild direkt vor/nach einer Tabelle bzw. Liste einfügen | Keine Vermischung/Verschiebung der Nachbarstruktur | 3.9 | **GRÜN erwartet** |

#### 3.3 Undo/Redo (Anforderung 2.6, Grenzfall 3.11)

| # | Test | Schritte | Assertion | Bezug | Status |
|---|---|---|---|---|---|
| B12 | Undo direkt nach Einfügung inmitten eines Absatzes | im Anschluss an B1: `ControlOrMeta+z` | Bild verschwindet, **ein** zusammenhängender Absatz `"HalloWelt"` (nicht zwei leere Absätze übrig) | 2.6, 3.11 | **GRÜN erwartet** |
| B13 | Redo | im Anschluss an B12: `ControlOrMeta+y`/`ControlOrMeta+Shift+z` | Bild inkl. aller Attribute identisch wieder da | 2.6 | **GRÜN erwartet** |
| B14 | Undo/Redo bei Einfügung am Dokumentanfang/-ende | im Anschluss an B10 | Einzelner sauberer Undo-Schritt | 2.6 | **GRÜN erwartet** |

#### 3.4 Formatprüfung / Fehlerbehandlung (Anforderung 2.3, Grenzfall 3.3 — bestätigter Defekt)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| B15 | Nicht-Bild-Datei mit Bild-Endung (`.txt`-Inhalt, umbenannt auf `bild.png`, oder `mimeType: 'text/plain'` bei `setFiles`) | über den Bild-Kontrolleintrag hochladen | Sichtbare, verständliche Fehlermeldung (`role="alert"` o. ä.); **kein** `<img>` im DOM eingefügt; `page.on('pageerror', ...)`/`page.on('console', ...)` zeigt **keine** unbehandelte Promise-Ablehnung | 2.3, 3.3, F3 | **ROT** — heute: kein MIME-Check, Datei wird anstandslos als `<img src="data:text/plain;base64,...">` eingefügt (bestätigter Befund, siehe 0); Browser zeigt natives „Bild kann nicht angezeigt werden"-Symbol, **keine** App-Fehlermeldung |
| B16 | 0-Byte-Datei | leerer Buffer über `setFiles` | Fehlermeldung, keine Einfügung | 2.3 | **ROT** — kein Größen-/Leer-Check vorhanden |
| B17 | Beschädigte Bilddatei (gültiger PNG-Header, abgeschnittener/zufälliger Rumpf) | über Kontrolleintrag hochladen | Fehlermeldung statt kaputtem `<img>`-Platzhalter | 3.3 | **ROT** — `FileReader.readAsDataURL` liest jede Byte-Folge anstandslos, keine Dekodier-Prüfung |
| B18 | Abbrechen des Dateiauswahl-Dialogs (kein Datei-Event) | `filechooser`-Event auslösen, dann **keine** Datei setzen (`fileChooser.setFiles([])` bzw. Dialog ohne Auswahl schließen simulieren) | Keine Änderung am Dokument, kein Fehler | 2.3, bereits korrekter `if (!file) return`-Pfad | **GRÜN erwartet** (einziger in diesem Block bereits korrekter Pfad, muss aber mit Test abgesichert sein) |

#### 3.5 Toolbar-Bedienbarkeit (Anforderung Abschnitt 1, Grenzfall betrifft F2)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| B19 | Kontrolleintrag ist **kein** per Rolle auffindbarer Button | `page.getByRole('button', { name: 'Bild einfügen' })` | Locator liefert **0** Treffer (`toHaveCount(0)`) — Regressionstest, der den aktuellen Defekt aktiv festhält | F2, §1 Zeile 1 | **ROT-als-Nachweis** (siehe Erläuterung unten) — Test ist bewusst so formuliert, dass er **heute grün** ist (0 Treffer korrekt vorhergesagt) und nach F2-Fix **rot** wird, weil dann ein Button existiert; muss dann durch B20/B21 ersetzt werden |
| B20 | Nach F2: Tastaturfokussierung + Enter öffnet Dialog | `Tab`-Sequenz bis `getByRole('button', { name: 'Bild einfügen' })` fokussiert (`toBeFocused()`), `Enter` | `page.waitForEvent('filechooser')` löst aus | F2, §1 Zeile 8 | **Blockiert bis F2 umgesetzt** — bis dahin nicht ausführbar, da kein fokussierbares `<button>`-Element existiert |
| B21 | Nach F2: Leertaste aktiviert ebenfalls | wie B20 mit `' '` statt `Enter` | Dialog öffnet | F2 | **Blockiert bis F2** |
| B22 | Icon bleibt ohne Emoji-Schriftstütze erkennbar | Screenshot-Vergleich oder DOM-Prüfung, dass **kein** reines Unicode-Zeichen als einziger visueller Träger dient (nach F2: SVG-Icon vorhanden) | SVG-Element (`svg`) im Kontrolleintrag vorhanden | §1 Zeile 3, F2 | **ROT** — aktuell ausschließlich Unicode-Emoji „🖼" (bestätigt: `Toolbar.tsx:242`) |

*Erläuterung B19:* Dieser Test ist ein bewusster „Lückennachweis" (analog dem
Muster aus `aufzaehlungsliste-qa.md` 3.7 für Tab/Umschalt+Tab) — er ist **heute
grün**, weil er exakt den fehlenden Zustand beschreibt, und wird nach F2 durch
B20/B21 abgelöst, nicht einfach gelöscht. Bis F2 umgesetzt ist, bleibt B19 der
einzige verlässliche automatisierte Nachweis, dass „Bild einfügen" für
Tastaturnutzer:innen nicht erreichbar ist.

#### 3.6 Größe/Seitenverhältnis nach Export (Grenzfall 3.4 — bestätigter Defekt, kritischer Test)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| B23 | Quadratisches Testbild (z. B. 40×40 px, Seitenverhältnis 1:1) einfügen → als DOCX exportieren | echter Upload eines 40×40-PNG, Export auslösen, `download.path()` lesen, `JSZip` → `word/document.xml` per `DOMParser` parsen, `<wp:extent cx cy>` auslesen | `cx`/`cy`-Verhältnis entspricht 1:1 (± Rundungstoleranz) | 3.4, 5.1 | **ROT** — Writer erzwingt ohne gesetzte `width`/`height` immer 300×200 px (Verhältnis 3:2), unabhängig vom tatsächlichen 1:1-Quellbild — **das ist der durch Code-Analyse bereits vorhergesagte, hier erstmals tatsächlich am Browser nachzuweisende Verzerrungs-Bug** |
| B24 | Dasselbe Testbild → als ODT exportieren | analog, `content.xml` → `svg:width`/`svg:height` per `DOMParser` (Namespace `urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0`) auslesen | Verhältnis 1:1 | 3.4, 5.1 | **ROT** — analog, ODT-Fallback 6×4 cm (ebenfalls 3:2) |
| B25 | 16:9-Testbild (z. B. 160×90 px) → DOCX **und** ODT | analog B23/B24 mit 16:9-Quellbild | Exportiertes Verhältnis ≈ 16:9, **nicht** 3:2 | 3.4 | **ROT** |
| B26 | Editor-Darstellung vs. Export-Größe direkt gegenübergestellt | Bild einfügen, `page.locator('.ProseMirror img').boundingBox()` lesen **und** Export-Maße (B23-Methode) lesen | Beide Werte weichen bei aktuellem Code voneinander ab (Editor: Browser-Rendergröße durch `max-width:100%`/native Größe; Export: fix 300×200 px) — Test dokumentiert die **Diskrepanz** explizit als Assertion (`expect(editorRatio).not.toBeCloseTo(exportRatio)` **vor** Fix, `toBeCloseTo` **nach** Fix) | 2.4, 3.4 | **ROT (Diskrepanz vorhanden)** — wird nach F1 zu einem Gleichheits-Assert umgekehrt |

#### 3.7 Rundreise DOCX/ODT, echter Upload/Export-Roundtrip im Editor (Anforderung 5.1.1/5.1.2)

| # | Test | Schritte | Assertion | Bezug | Status |
|---|---|---|---|---|---|
| B27 | DOCX, reine Editor-Erzeugung | Text tippen, Cursor mittig, Bild einfügen (echter Flow), exportieren, `download.path()` erneut über den echten Upload-Weg importieren (`filechooser` + Klick auf „Datei hochladen") | Bild weiterhin an derselben relativen Position sichtbar, beide Textteile vorhanden, Bild nicht verzerrt (Seitenverhältnis wie B23 prüfen) | 5.1.1 | **Teilweise ROT** (Positions-/Textanteil grün erwartet, Größenanteil rot bis F1/F5) |
| B28 | ODT, analog | analog | analog | 5.1.2 | **Teilweise ROT** |
| B29 | Bild löschen, dann exportieren (Anforderung 5.1.10) | Bild einfügen, anklicken (Node-Selection), `Entf`, exportieren | Exportierte Datei enthält **kein** verwaistes Bild im Zip (`zip.file('word/media/...')` bzw. `Pictures/...` liefert nichts Neues; `word/_rels/document.xml.rels` bzw. `META-INF/manifest.xml` ohne verwaisten Eintrag) | 5.1.10 | **GRÜN erwartet** (kein bekannter Defekt hierzu, muss aber ausgeführt werden) |
| B30 | Mehrere Bilder im selben Dokument (≥ 3, unterschiedliche Positionen) | drei unterschiedliche Testbilder nacheinander einfügen, exportieren, reimportieren | Alle drei bleiben einzeln, unterscheidbar, an ihrer jeweiligen Position | 5.1.9 | **GRÜN erwartet** (Struktur), Größenanteil wie üblich rot |
| B31 | **Validierung gegen unabhängigen Parser (Anforderung 5.1.11):** exportiertes `<w:drawing>` strukturell per `DOMParser` (Namespaces `wp`/`a`/`pic`/`r`) validieren — vorhandene Pflichtelemente `wp:extent`, `a:blip[@r:embed]`, `pic:pic` | wie B23, zusätzliche Strukturprüfung statt reiner String-Suche | Alle Pflichtelemente vorhanden und korrekt referenziert (Relationship-ID aus `document.xml.rels` löst tatsächlich zu einer vorhandenen `media/*`-Datei auf) | 5.1.11 | **GRÜN erwartet** (Struktur ist unabhängig vom Größen-Bug bereits korrekt) |
| B32 | **Validierung ODT analog (5.1.12):** `draw:frame`/`draw:image` **und** Eintrag in `META-INF/manifest.xml` | analog | `draw:image[@xlink:href]` referenziert eine tatsächlich im Zip vorhandene Datei, **und** diese Datei hat einen `<manifest:file-entry>` in `META-INF/manifest.xml` | 5.1.12 | **GRÜN erwartet für Struktur**; **separat zu prüfen** (siehe B33), ob `svg:width="...px"` das ODF-Schema tatsächlich verletzt |
| B33 | **Deckt F8 auf E2E-Ebene:** exportiertes ODT enthält kein `svg:width="...px"` mehr | Regex/DOM-Attribut-Prüfung auf `content.xml` | `getAttributeNS(svg, 'width')` matched `/^[\d.]+(cm|mm|in|pt|pc)$/`, **nicht** `px` | Neufund 1.3, F8 | **ROT** (bestätigt in 0: aktueller Writer schreibt `px`) |
| B34 | Cross-Format-Rundreise DOCX → ODT (Anforderung 5.1.5) | Bild in DOCX-Karte einfügen → exportieren → Download über ODT-Karte hochladen → als ODT exportieren | Bild, Alt-Text, Größe (umgerechnet) bleiben erhalten | 5.1.5 | **Teilweise ROT** (Größe) |
| B35 | Cross-Format-Rundreise ODT → DOCX (Anforderung 5.1.6) | umgekehrt | analog | 5.1.6 | **Teilweise ROT** |
| B36 | Doppelte Rundreise DOCX → Editor → ODT → Editor → DOCX (Anforderung 5.1.7) | Bild in DOCX einfügen → ODT-Export/Import → DOCX-Export/Import | Bild inhaltlich identisch, kein kumulativer Maßverlust | 5.1.7 | **Teilweise ROT** |

#### 3.8 Selektions-Sync-Regression (Grenzfall 3.1, Anforderung 6.7 — Pflichtbestandteil)

| # | Test | Schritte | Assertion | Bezug | Status |
|---|---|---|---|---|---|
| B37 | **Erweiterung von `tests/e2e/selection-regression.spec.ts`** (neuer `test`-Block, gleiche Datei, gleiches Muster wie die bestehenden zwei Tests Zeile 14-32/34-50): Text eingeben → Bild einfügen (echter Flow) → Klick zur Neupositionierung im Editor → `Enter` → weiter tippen | analog bestehendem Muster, mit „Bild einfügen" als dritte Trigger-Aktion statt „Fett" | Kein Textverlust, `page.locator('.ProseMirror p')`-Anzahl wie erwartet, Bild weiterhin an ursprünglicher Position sichtbar | 3.1, Hauptspezifikation Abschnitt 2, §6.7 | **GRÜN erwartet** (laut `bild-einfuegen-code.md` 1.7 strukturell bereits korrekt, da `run(view, ...)` stets die aktuelle `view.state` liest) — **muss aber tatsächlich ausgeführt werden**, nicht nur argumentiert |
| B38 | Stresstest: mehrere Zyklen Text → Bild → Klick → Enter | analog bestehendem dritten Test (Zeile 52-71), mit Bild statt Fett, mehrfach wiederholt | Stabil über ≥ 3 Zyklen, keine kumulative Verschlechterung | 3.1 | **GRÜN erwartet** |

#### 3.9 Weitere Grenzfälle (Anforderung Abschnitt 3)

| # | Test | Schritte | Assertion | Bezug | Status |
|---|---|---|---|---|---|
| B39 | Wiederholtes schnelles Einfügen mehrerer Bilder (Grenzfall 3.10) | drei verschiedene Testbilder nacheinander einfügen, **ohne** Zwischenklick auf den Editor, jeweils Cursor per Tastatur neu setzen zwischen den Einfügungen | Alle drei landen an der zum jeweiligen Zeitpunkt korrekten Cursor-Position, nicht alle an derselben veralteten Stelle | 3.10 | **GRÜN erwartet** |
| B40 | Großdatei (Grenzfall 3.7, Testplan-Hinweis 10) | Bilddatei nahe an `MAX_IMAGE_BYTES` (bzw. ohne definierte Grenze: 10–20 MB, siehe offene Entscheidung 9.2) über echten Upload einfügen, Zeit bis sichtbarer Darstellung messen (`performance.now()`-Differenz oder Playwright-Zeitstempel um `setFiles`/`expect(img).toBeVisible()`) | Zeit protokolliert (`console.log`/Testreport-Anhang), **kein** hartes Zeitlimit als Assertion (Flakiness-Vermeidung auf CI), aber UI muss unmittelbar danach weiterhin bedienbar sein (z. B. Toolbar-Klick funktioniert direkt im Anschluss) | 3.7, Testplan-Hinweis 10 | **Dokumentationspflichtig** — heutiges Verhalten (kein Limit, synchrones `FileReader.readAsDataURL`) muss gemessen, nicht nur vermutet werden |
| B41 | Datei über `MAX_IMAGE_BYTES` (sobald F4 umgesetzt) | Datei > definierter Grenze hochladen | Fehlermeldung statt Einfügung | F4, Grenzfall 3.7 | **Blockiert bis F4 umgesetzt und Grenzwert freigegeben** (siehe offene Entscheidung 9.2) |

#### 3.10 Reale Fixture-Dateien (Anforderung 6.9, Abnahmekriterium 8 — aktuell komplett offen, siehe 0.1)

**Blockierende Vorbedingung:** Siehe 2.7 — vor Schreiben dieser Tests muss
geklärt sein, welche der 127/202 vorhandenen Fixture-Dateien tatsächlich
Bilder enthalten, **und** ob zusätzlich mit echtem Microsoft Word/LibreOffice
neu erzeugte Dateien mit bewusst untypischer Bildgröße beschafft werden
(Testplan-Hinweis 9 der Anforderung, offene Entscheidung 9.5 im Code-Plan).

| # | Test | Fixtures | Prüfung | Status |
|---|---|---|---|---|
| B42 | Import einer/mehrerer bildhaltiger DOCX-Fixture(s) aus `apache/poi`-Korpus (Namen erst nach Sichtung final, siehe 2.7) | TBD nach Sichtung | Import ohne Absturz, Bild sichtbar im Editor, unveränderter Export enthält dasselbe Bild mit derselben Größe (falls die Fixture eine von 300×200 px abweichende Größe enthält — genau das ist Pflicht-Testfall aus Anforderung 3.5) | **Blockiert bis Fixture-Sichtung abgeschlossen (Abschnitt 7 Punkt 1)** |
| B43 | Import einer/mehrerer bildhaltiger ODT-Fixture(s) aus `tdf/odftoolkit`-Korpus | TBD nach Sichtung | analog, `svg:width`/`svg:height` bleibt erhalten (deckt F6 an einer **echten** Fremddatei ab, nicht nur synthetischem XML) | **Blockiert bis Fixture-Sichtung** |
| B44 | Neu mit echtem Microsoft Word erzeugte Datei, Bild bewusst auf z. B. 5×5 cm gesetzt | manuell zu beschaffen (kein automatisierter Weg) | Rundreise erhält 5×5 cm (± Rundungstoleranz) | **Blockiert, externe Beschaffung nötig** (siehe Abschnitt 8) |
| B45 | Neu mit echtem LibreOffice Writer erzeugte Datei, analog | manuell zu beschaffen | analog | **Blockiert, externe Beschaffung nötig** |

### 3.11 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

Wie bereits in `aufzaehlungsliste-qa.md` 3.13 für Listen festgestellt: Die
bestehenden Upload-Tests in `docx.spec.ts`/`odt.spec.ts` verwenden
`input.setInputFiles(...)` direkt auf dem versteckten `<input type="file">`
und umgehen damit den sichtbaren „Datei hochladen"-Button. Für **alle** neuen
Tests in diesem Plan, die einen Datei-Upload auslösen (B1–B45, wo zutreffend),
gilt: mindestens der **erste** Testfall jeder Testgruppe (z. B. B1 für den
Grundfall, B15 für Formatprüfung, B42/B43 für Fixtures) muss über den
tatsächlichen Klickpfad laufen
(`page.waitForEvent('filechooser')` + Klick auf das sichtbare Bedienelement +
`fileChooser.setFiles(...)`) — nicht nur `setInputFiles` auf den versteckten
Input. Für Wiederholungen derselben Interaktion innerhalb einer Testgruppe
(z. B. B2–B11, die alle denselben Upload-Mechanismus mit unterschiedlicher
Cursor-Position testen) ist `setInputFiles` auf den bereits als korrekt
nachgewiesenen Input akzeptabel, um Testlaufzeit zu sparen — dies muss aber
im jeweiligen Testkommentar explizit vermerkt sein, damit die Abgrenzung
„mindestens einmal echter Klickpfad pro Interaktionsart" nachvollziehbar
bleibt.

### 3.12 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für alle Rundreise-/Größen-Tests (B23–B36) gilt zwingend strukturelles Parsen
statt String-Suche, analog dem in `aufzaehlungsliste-qa.md` 3.14 etablierten
Muster:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency, kein neues Package nötig
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const extents = [...xmlDoc.getElementsByTagNameNS(WP_NS, 'extent')]
expect(extents).toHaveLength(1)
const cx = Number(extents[0]!.getAttribute('cx'))
const cy = Number(extents[0]!.getAttribute('cy'))
expect(cx / cy).toBeCloseTo(sourceWidthPx / sourceHeightPx, 1)
```

Für ODT analog über `getAttributeNS(SVG_NS, 'width'/'height')` +
`parseOdfLength`-äquivalente Umrechnung im Testcode (unabhängig vom
Produktionscode implementiert, um eine zirkuläre Prüfung — „der Writer prüft
sich selbst" — zu vermeiden).

### 3.13 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle bestehenden 3 Tests) —
  **Pflichtbestandteil**, bleibt bestehen, wird um B37/B38 ergänzt (nicht
  ersetzt).
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen, decken
  andere, nicht bildbezogene Aspekte ab.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Bild-Berührung erwartet.

### 3.14 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-/Upload-basierte Tests (B1–B19, B22–B36, B39, B42–B45) | Pflicht | Pflicht | Pflicht | `.click()`/`setFiles()` funktionieren projektunabhängig |
| Tastatur-only-Tests (B20, B21) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch-Geräte ohne Hardware-Tastatur — `page.keyboard.press` bleibt über CDP auslösbar, reales Nutzer:innen-Verhalten auf Touch-Geräten separat dokumentieren |
| Undo/Redo, Selection-Sync (B12–B14, B37–B38) | Pflicht | Pflicht | Pflicht | Tastenkombinationen via `page.keyboard` unabhängig vom Projekt |
| Großdatei-Timing (B40) | Pflicht (Referenzwert) | Dokumentieren (ggf. abweichende Performance-Charakteristik mobiler Emulation) | Dokumentieren | Kein hartes Cross-Device-Zeitlimit |

---

## 4. Traceability-Matrix

### 4.1 Anforderung Abschnitt 2 (Gewünschtes Verhalten) → Testfall(e)

| §2, Abschnitt | Testfall(e) |
|---|---|
| 2.1 Grundfall Cursor-Position | B1–B3 (Unit: CI1–CI3) |
| 2.2 Einfügen über Selektion | B9 (Unit: CI12) |
| 2.3 Dateiauswahl/Formatprüfung | B15–B18 (Unit: IV1–IV4) |
| 2.4 Bildgröße beim Einfügen | B23–B26 (Unit: IV5–IV7) |
| 2.5 Alt-Text | O1 (bereits teilweise durch bestehenden ODT-Test abgedeckt, siehe 2.1) |
| 2.6 Undo/Redo | B12–B14 |
| 2.7 Zusammenspiel mit Löschen | B29 |
| 2.8 Geltungsbereich Dokumentstruktur | B6–B8 (Unit: CI7–CI11) |

### 4.2 Anforderung Abschnitt 3 (Grenzfälle) → Testfall(e)

| Grenzfall | Testfall(e) |
|---|---|
| 3.1 Cursor-Position nach Toolbar-Klick (Selection-Sync) | B37, B38 |
| 3.2 Text-Absatz-Teilung (Kernverdacht) | B1–B6, CI1–CI8 |
| 3.3 Fehlende MIME-Prüfung | B15–B17, IV1–IV4 |
| 3.4 Diskrepanz Editor-Darstellung vs. Export-Größe | B23–B26 |
| 3.5 Verlust der Bildgröße bei Fremddatei-Rundreise | D3, O2, B42–B45 |
| 3.6 Mehrere Bilder mit identischem Binärinhalt | D7, O6, B30 |
| 3.7 Sehr große Bilddatei | B40, B41, IV8 |
| 3.8 Bild am Dokumentanfang/-ende | B10, CI2/CI3 |
| 3.9 Bild neben anderem Block-Element | B11 |
| 3.10 Wiederholtes schnelles Einfügen | B39 |
| 3.11 Undo nach Absatz-Teilung | B12 |

### 4.3 Anforderung Abschnitt 5.1 (Rundreise-Pflicht-Szenarien 1–12) → Testfall(e)

| 5.1, Szenario | Testfall(e) |
|---|---|
| 1. DOCX, reine Editor-Erzeugung | B27 |
| 2. ODT, reine Editor-Erzeugung | B28 |
| 3. DOCX-Fremddatei-Rundreise | B42, B44 |
| 4. ODT-Fremddatei-Rundreise | B43, B45 |
| 5. Cross-Format DOCX → ODT | B34, X1 |
| 6. Cross-Format ODT → DOCX | B35, X2 |
| 7. Doppelte Rundreise | B36, X3 |
| 8. Bild in Tabellenzelle/Listenpunkt/Kopf-Fußzeile | B8, D4, D5, O5 |
| 9. Mehrere Bilder im selben Dokument | B30, D6 |
| 10. Bild löschen, dann exportieren | B29 |
| 11. Validierung gegen unabhängigen Parser (DOCX) | B31 |
| 12. Validierung ODT analog | B32, B33 |

### 4.4 `bild-einfuegen-code.md` Fehlerliste (F1–F14) → Testfall(e)

| # | Befund | Testfall(e) |
|---|---|---|
| F1 | `insertImage` setzt nie `width`/`height` | CI14, D1–D2, O1, O4, B23–B26 |
| F2 | Toolbar-Element `<label>` statt `<button>`, kein `title`/`aria-label`, Emoji-Icon | B19–B22 |
| F3 | Keine Formatprüfung (MIME/Magic-Number) | B15–B17, IV1–IV4 |
| F4 | Keine Größenobergrenze/Messung | B40, B41 |
| F5 | DOCX-Reader liest `wp:extent` nicht | D1, D3, B23, B27 |
| F6 | ODT-Reader liest `svg:width`/`svg:height` nicht | O1, O2, B24, B28 |
| F7 | Unterschiedliche, undokumentierte Ersatzgrößen DOCX/ODT | D2, O4 |
| F8 | ODT-Writer schreibt ungültige `px`-Einheit | O3, B33 |
| F9 | Keine `.ProseMirror-selectednode`-Stilregel | *(kein eigener Testfall in diesem Plan — gehört zum Löschen/Markieren-Verhalten von `bild-loeschen-req.md`; hier nur als Randbedingung von B29 relevant, siehe Abschnitt 8)* |
| F10 | Schema-`validate` fehlt bei `width`/`height` | *(indirekt über IV/CI-Tests abgedeckt — kein separater Testfall nötig, reine Härtung ohne beobachtbares Verhalten)* |
| F11 | Kein Unit-Test für `insertImage` selbst | CI1–CI14 (gesamter Abschnitt 2.2) |
| F12 | Keine E2E-Tests für Bild-Einfügen | Gesamter Abschnitt 3 |
| F13 | Keine `width`/`height`-Assertions in bestehenden Roundtrip-Tests | D1, O1 |
| F14 | Keine realen Fixture-Dateien mit bekannter Größe eingebunden | EF1–EF2, B42–B45 |

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `bild-einfuegen-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug/bestätigte Lücke) | CI14, IV1–IV9, U1–U7, D1–D3, O1–O3, EF1, X1–X3, B15–B17, B22–B26, B31 (nur B33-Teil), B33, B34–B36 (Größenanteil), B41 | F1, F3, F4, F5, F6, F7, F8, F13, F14 — siehe Abschnitt 0 |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | CI1–CI13, B1–B14, B18–B21 (B19 als bewusster Lückennachweis), B27–B30 (Struktur-/Positionsanteil), B37–B39, EF2, D4–D7 (Struktur), O5–O6 (Struktur) | Basiert auf laut `bild-einfuegen-code.md` 1.6/1.7 bereits korrektem, aber bislang **ungetestetem** Grundverhalten (`replaceSelectionWith`, Selektions-Timing, `ImageCollector`-Dedup, Zip-Struktur) |
| **Blockiert** (kann erst nach anderer Umsetzung/Entscheidung geschrieben werden) | B20, B21 (F2), B41 (F4/Grenzwert), B42–B45 (Fixture-Sichtung/Beschaffung), IV9 (Formatliste-Freigabe) | siehe Abschnitt 7/8 |
| **Dokumentationspflichtig, Ausgang offen** | B6 (Bild in Überschrift), B40 (Großdatei-Timing) | Tatsächliches Verhalten muss durch Ausführung ermittelt und festgehalten werden, bevor final „akzeptiert"/„abgelehnt" behauptet werden kann |
| **Absichtlich als Lückennachweis geführt, bis F2 umgesetzt ist** | B19 | Wird dieser Test eines Tages rot, ist das ein *positives* Signal (Button existiert jetzt) — dann durch B20/B21 als primäre Tests ablösen, nicht nur löschen |

Sobald `bild-einfuegen-code.md` Abschnitt 4 (Fixes F1–F10) umgesetzt ist, müssen
alle oben als „erwartet ROT" markierten Fälle auf GRÜN wechseln — das ist der
konkrete, maschinell prüfbare Nachweis, dass die Fixes wirken (nicht nur
Code-Review).

---

## 6. Abgleich mit der Definition of Done (`bild-einfuegen-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 2 über den echten `filechooser`-Flow grün | Abschnitt 3.2–3.5 (B1–B22) |
| 2. Jeder Grenzfall aus Abschnitt 3 einzeln beantwortet, insbesondere 3.4/3.5 behoben oder bewusst dokumentiert | Traceability-Matrix 4.2; B23–B26 (3.4), D3/O2/B42–B45 (3.5) |
| 3. Zentraler gemeldeter Fall (3.2) für **alle** Cursor-Positionen mit echtem Browser-Test abgesichert | B1–B6, CI1–CI8 |
| 4. Alle zwölf Rundreise-Szenarien aus 5.1 grün, inkl. unabhängiger Validierungen und Szenario 8 | Traceability-Matrix 4.3, Abschnitt 3.7 |
| 5. Selektions-Sync-Regressionstest mit Bild-Einfügen dauerhaft Teil der Suite | B37, B38 (Erweiterung von `selection-regression.spec.ts`) |
| 6. MIME-Typ-/Formatprüfung implementiert und getestet | B15–B17, IV1–IV4 |
| 7. Toolbar-Bedienelement erfüllt Mindeststandard (`title`/`aria-label`, tastaturerreichbar, Icon erkennbar) | B19–B22 |
| 8. Reale Fixture-Dateien (Word **und** LibreOffice) mit bekannter, abweichender Bildgröße vorhanden und in Rundreise-Test eingebunden | B42–B45 — **aktuell vollständig blockiert, siehe 0.1/7/8** |

**Zusätzlicher, in `bild-einfuegen-req.md` nicht enthaltener DoD-Ergänzungspunkt
aus dieser QA-Prüfung:** Solange die in 0.1 dokumentierte Fixture-Sichtung
nicht durchgeführt ist, kann DoD-Punkt 8 **nicht einmal begonnen** werden —
das ist strenger als „lückenhaft", es ist „nicht startbereit". Dieser Punkt
muss vor jeder weiteren Planung der Testfälle B42/B43 aufgelöst werden.

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Fixture-Sichtung durchführen** (Abschnitt 2.7/0.1) — vor jeder weiteren
   Arbeit an B42–B45/EF1: welche der 127 DOCX-/202 ODT-Fixtures enthalten
   tatsächlich Bilder, mit welcher Größe. Ergebnis dieser Sichtung in dieses
   Dokument nachtragen (Abschnitt 8).
2. **CI1–CI14, IV1–IV9, U1–U7** (Abschnitt 2.2–2.4) zuerst schreiben —
   schnellster, formatunabhängiger Nachweis von F1/F3/F4. CI1–CI13 dürfen
   direkt grün laufen (dokumentieren bereits korrektes Verhalten), CI14/IV/U
   bewusst rot.
3. **D1–D7, O1–O6, X1–X3** (Abschnitt 2.5–2.8) — Reader/Writer-Rundreise-
   Ebene, inkl. bewusst rot laufender Regressionstests für F5–F8.
4. **Erweiterung `external-fixtures.test.ts`** (EF1–EF2) — abhängig von
   Schritt 1.
5. **`tests/e2e/images.spec.ts` Abschnitt 3.2–3.6** (B1–B22) — Grundbedienung,
   Formatprüfung, Toolbar-Zustand.
6. **`tests/e2e/images.spec.ts` Abschnitt 3.6–3.10** (B23–B45) — Größe/
   Seitenverhältnis, Rundreise über echten Upload/Export, reale Fixtures.
   B42–B45 bleiben blockiert, bis Schritt 1 abgeschlossen und ggf. externe
   Word-/LibreOffice-Dateien beschafft sind (siehe Abschnitt 8).
7. **Erweiterung `selection-regression.spec.ts`** (B37, B38).
8. Nach Umsetzung von `bild-einfuegen-code.md` Abschnitt 4: alle als „ROT
   erwartet" markierten Fälle erneut ausführen, Statuswechsel auf GRÜN
   dokumentieren; `selection-regression.spec.ts` **vollständig** (auch die
   drei bestehenden Tests) erneut laufen lassen.
9. Traceability-Matrizen (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **Fixture-Sichtung (Abschnitt 0.1/2.7/7 Punkt 1) ist die zentrale
  Blockade dieses Plans.** Ohne sie können B42/B43/EF1 nicht geschrieben
  werden und DoD-Punkt 8 bleibt unerfüllbar. Muss vor Testimplementierung
  priorisiert werden.
- **Externe Beschaffung echter Word-/LibreOffice-Dateien (B44/B45)** ist kein
  automatisierbarer Schritt — erfordert manuelle Erstellung außerhalb dieses
  Testplans (identisch zur in `bild-einfuegen-code.md` Abschnitt 5.3/9.5
  benannten offenen Entscheidung). Falls die vorhandenen Korpora nach
  Sichtung bereits geeignete Dateien enthalten, könnten B44/B45 entfallen —
  das muss **nach** Schritt 1 entschieden werden, nicht vorher angenommen.
- **Freigabe der Formatliste/Obergrenze (IV9, B41)** hängt von den in
  `bild-einfuegen-code.md` Abschnitt 9, Punkt 1/2 benannten offenen
  Entscheidungen (PNG/JPEG/GIF/WebP/BMP, `MAX_IMAGE_BYTES = 20 MB`) ab — diese
  Tests können erst nach Freigabe exakt formuliert werden (aktuell nur als
  Platzhalterwerte geführt, identisch zu den im Code-Plan vorgeschlagenen
  Werten).
- **B6 (Bild in Überschrift)** benötigt vor endgültiger Testformulierung eine
  Produktentscheidung (offene Entscheidung 9.3 im Code-Plan: Ist
  „Überschrift wird geteilt" das gewünschte Verhalten, oder soll das Bild
  automatisch herausverschoben werden?). Der Test läuft so oder so, aber die
  Assertion (welches Verhalten als „korrekt" gilt) kann erst nach dieser
  Entscheidung endgültig fixiert werden.
- **F9 (`.ProseMirror-selectednode`-CSS) und die damit verbundene
  Markier-/Lösch-Bedienung** werden hier bewusst **nicht** mit eigenem
  Testfall geführt — das gehört laut Abgrenzung in `bild-einfuegen-req.md`
  Abschnitt 0 (Tabelle) und `bild-einfuegen-code.md` Abschnitt 0 zum
  separaten Slug `bild-loeschen`. Bei Freigabe dieses Plans bestätigen, dass
  diese Abgrenzung QA-seitig ebenfalls so akzeptiert wird (B29 prüft nur das
  Lösch-*Ergebnis* im Export, nicht die visuelle Selektions-Rückmeldung
  selbst).
- **B40 (Großdatei-Timing)** benötigt einen projektweit konsistenten
  Schwellenwert für „kein spürbares Einfrieren" — mit anderen Feature-QA-
  Plänen (z. B. `datei-oeffnen-qa.md`) abgleichen, falls dort bereits ein
  Wert etabliert ist, statt einen neuen, unkoordinierten Platzhalter
  einzuführen.
- **Alt-Text-Rundreise (Anforderung 2.5)** ist bewusst nur knapp behandelt
  (bereits durch bestehenden ODT-Test teilweise abgedeckt, siehe 2.1) — der
  **editierbare** Alt-Text selbst gehört zum separaten Slug `bild-alt-text`
  und ist hier explizit **nicht** Gegenstand, analog zur Abgrenzung in beiden
  Vorgängerdokumenten.
