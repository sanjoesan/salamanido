# QA-Testplan: Feature „Bild aus Datei einfügen"

Rolle: QA-Antwort auf `specs/bild-einfuegen-req.md` (Anforderung) und
`specs/bild-einfuegen-code.md` (Umsetzungsplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an — `bild-einfuegen-code.md` ist laut
eigenem Titel ein *Umsetzungsplan*, keine verifizierte Umsetzung. Abschnitt 0
bestätigt per eigener, für **diesen** Durchlauf erneut durchgeführter Codesichtung,
dass zum Zeitpunkt dieses Testplans **kein einziger** der dort beschriebenen Fixes
(F1–F17) im Code angekommen ist — der Ist-Stand entspricht unverändert der in
`bild-einfuegen-req.md` Abschnitt 0 dokumentierten Analyse. Ergebnis ist ein
Testplan, kein Testbericht: Die hier aufgeführten neuen Tests sind zum Zeitpunkt
dieses Dokuments **nicht geschrieben** (mit Ausnahme der in 2.1 aufgeführten,
bereits vorhandenen Basis-Tests).

Der Plan gliedert sich, wie beauftragt, in zwei getrennte Teile:

- **Teil A** (Abschnitt 3) — Unit-Tests der Reader/Writer-Rundreise (DOCX **und**
  ODT) sowie der neuen Hilfsmodule, auf reiner Datenebene (Vitest/jsdom).
- **Teil B** (Abschnitt 4) — **echte** Playwright-Browser-Tests: Klicks,
  Tastatureingabe, echter Datei-Upload über den `filechooser`/Label-Klick-Pfad,
  echter Export-Download und **strukturelles Parsen der tatsächlich
  heruntergeladenen Datei** mit einem vom eigenen Reader unabhängigen Parser
  (`JSZip` + `DOMParser`), **nicht** über einen direkten internen Funktionsaufruf.

> **Querschnittsthema mit eigenem Abschnitt (Abschnitt 2): Determinismus.**
> Der Auftrag zu diesem Plan verlangt ausdrücklich deterministische Tests „keine
> Race-Conditions durch zu schnelle Tastatureingaben; Selektions-Sync abwarten".
> Der Editor teilt dieselbe asynchrone `selectionchange`-Synchronisation, die in
> `selection-regression.spec.ts` und `cut.spec.ts` bereits mehrfach Flakiness
> verursacht hat (siehe Git-Historie: „Fix flaky Mobile-project … same
> async-selection-sync race"). **Bild-Einfügen ist für genau diese Klasse von
> Races besonders anfällig**, weil es eine asynchrone Kette ist (Tastatur-
> Cursorbewegung → asynchroner Datei-Read → asynchrones `Image`-Decoding →
> Einfügen an der *dann* aktuellen Selektion). Abschnitt 2 kodifiziert daher die
> im Repo bereits bewährten Gegenmaßnahmen **verbindlich** für alle Teil-B-Tests;
> die betroffenen Einzelfälle verweisen jeweils darauf.

Stil/Gliederung orientiert an `aufzaehlungsliste-qa.md`/`fett-qa.md`/
`ausschneiden-qa.md`.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle)

Die zentralen Behauptungen aus `bild-einfuegen-req.md` Abschnitt 0 und
`bild-einfuegen-code.md` Abschnitt 1 wurden direkt im **aktuellen** Code
nachvollzogen (nicht aus den Dokumenten übernommen).

> **Zitierweise (verbindlich, wie `bild-einfuegen-req.md` Abschnitt 0 und
> `bild-einfuegen-code.md` sie fordern):** Maßgeblich sind **Symbolnamen** (Datei ›
> Funktion/Node). Zeilennummern sind eine Momentaufnabme dieses Prüfdurchlaufs und
> driften. **Korrektur gegenüber der Vorfassung dieses QA-Dokuments:** Deren
> Section-0-Tabelle nannte durchgängig veraltete Zeilen (u. a.
> `Toolbar.tsx:241-244`/`:97-108`, `odt/writer.ts:112-119`, `schema.ts:45-72`,
> `docx/writer.ts:72-92`) aus einem älteren Code-Stand. Die folgende Tabelle nennt
> die für diesen Durchlauf verifizierten Symbole mit aktuellem „ca."-Zeilenhinweis.

| Behauptung | QA-Gegenkontrolle (Symbol) | Ergebnis |
|---|---|---|
| Bild-Kontrolleintrag ist `<label>`, kein `<button>`, ohne `title`/`aria-label` | `Toolbar.tsx` › `Toolbar` return-JSX, `<label>…🖼 Bild…</label>` (ca. Z. 291–293) | **Bestätigt.** `<label className="…">🖼 Bild<input type="file" accept="image/*" className="hidden" onChange={handleImagePick} /></label>`. Jedes **andere** Bedienelement (F/K/U/S über `MarkButton`, `AlignButton`, „Tabelle einfügen", „Ausschneiden" über `ScissorsIcon`) trägt `title`/`aria-label` — das Bild-Element **nicht**. |
| `insertImage` setzt nie `width`/`height` | `commands.ts` › `insertImage(src, alt = '')` (ca. Z. 66–74) | **Bestätigt, wortgleich.** `wordSchema.nodes.image.create({ src, alt })` — kein `width`/`height`, Schema-Default `null` bleibt. `state.tr.replaceSelectionWith(node)`. |
| `handleImagePick` prüft `file.type`/`file.size` nicht, kein `try/catch`, `alt` = `file.name` | `Toolbar.tsx` › `handleImagePick` (ca. Z. 124–135) | **Bestätigt.** `event.target.value = ''` ist vorhanden (Z. 126). `FileReader`-Promise mit `reader.onerror = () => reject(reader.error)`, aber **ohne** umschließendes `try/catch` `await`et (Z. 129–133) → unbehandelte Promise-Ablehnung möglich. Abschluss `run(view, insertImage(dataUrl, file.name))` (Z. 134). |
| `image`-Schema-Attribute `width`/`height` ohne `validate`, `parseDOM` liefert String/`null` | `schema.ts` › `nodes.image` (ca. Z. 58–85) | **Bestätigt.** `width`/`height` mit `default: null`, **ohne** `validate` (Unterschied zu `src`/`alt` = `validate: 'string'`); `parseDOM.getAttrs` gibt `getAttribute('width'|'height')` unverändert (String/`null`) zurück. |
| DOCX-Writer erzwingt Fallback 300×200 px, feste `wp:docPr id="1"`/`pic:cNvPr id="0"` | `docx/writer.ts` › `imageParagraphXml` (ca. Z. 74–94) | **Bestätigt.** `Number(attrs.width ?? 300)`/`Number(attrs.height ?? 200)`; EMU-Umrechnung inline; `wp:docPr id="1"` **und** `pic:cNvPr id="0"` fest verdrahtet ⇒ ID-Kollision bei mehreren Bildern (F15). |
| DOCX-Reader liest `wp:extent` nicht | `docx/reader.ts` › `decodeDrawingOrPict` (ca. Z. 143–168) | **Bestätigt.** Liest `a:blip/@r:embed` und `wp:docPr/@name` → `alt`; **kein** Zugriff auf `getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')`. Node erhält nur `{ src, alt }`, `width`/`height` bleiben `null`. Alt aus `@name`, nicht `@descr` (F16). |
| ODT-Writer verwendet `6cm`/`4cm`, schreibt `px` bei vorhandener Größe | `odt/writer.ts` › `blockToOdt` Fall `'image'` (ca. Z. 176–183) | **Bestätigt.** `` node.attrs?.width ? `${node.attrs.width}px` : '6cm' `` (analog `height`/`4cm`). `"px"` ist kein gültiger ODF-`length`-Wert (Neufund A / F8). |
| ODT-Reader liest `svg:width`/`svg:height` nicht | `odt/reader.ts` › `frameToBlocks` (ca. Z. 232–248) | **Bestätigt.** Liest `draw:image/@xlink:href` → `src`, `draw:frame/@draw:name` → `alt`; **kein** Zugriff auf `getAttributeNS(ODF_NAMESPACES.svg, 'width'/'height')`. |
| Kein `.ProseMirror-selectednode`-CSS | `src/index.css` | **Bestätigt.** Enthält `.ProseMirror img { max-width: 100%; height: auto }` (bereits korrekt, Anforderung Abschnitt 4), aber **keine** `.ProseMirror-selectednode`-Regel. |
| `ImageCollector` dedupliziert nach Data-URL, nicht nach Dokumentposition | `docx/imageCollector.ts` › `add` | **Bestätigt.** Trefferprüfung auf `fileNameByDataUrl` betrifft nur die Zip-Mediendatei, nicht die Anzahl der `image`-Knoten. |

### 0.1 Korrektur eines faktisch falschen Befunds der Vorfassung (E2E-Bestand)

Die Vorfassung dieses QA-Dokuments behauptete in Section 0/0.1: „Null Treffer …
die **einzigen vier** vorhandenen E2E-Dateien (`docx.spec.ts`, `odt.spec.ts`,
`lifecycle.spec.ts`, `selection-regression.spec.ts`)". **Das ist falsch und war
schon in `bild-einfuegen-req.md` Abschnitt 0 sowie `bild-einfuegen-code.md`
(Revision Punkt / Ist-Stand-Tabelle) als überholt markiert.** Verifiziert für
diesen Durchlauf (`tests/e2e/*.spec.ts`): es existieren **17** E2E-Spec-Dateien,
und der echte Bild-Upload-Pfad wird **bereits mehrfach** exerziert:

| Datei | Bild-Bezug (verifiziert) |
|---|---|
| `cut.spec.ts` (Testfall 8, Rundreise 6) | `page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(tinyPng)` — Bild als **Vorbedingung** fürs Ausschneiden. |
| `clipboard.spec.ts` (u. a. T-12, Perf-Fall) | derselbe `label:has-text("Bild")`-Locator; `large-copy-perf.png` als Großdatei-Fixture. |
| `export-error-handling.spec.ts` | `page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name, mimeType:'image/png', buffer })`; danach `expect(page.locator('.ProseMirror img')).toBeVisible()` und echter Export. **Belegt zusätzlich:** Bild-Einfügen erzeugt **keine** Object-URL (reines `data:`-URL via `FileReader.readAsDataURL`). |

**Konsequenz (unverändert gültig):** Es gibt zwar erprobte Upload-**Mechanik**,
aber **keinen dedizierten Test der Einfüge-Funktion selbst** (Cursor-Position,
beide Textteile, Undo, Größen-/Verzerrungsprüfung, Rundreise über die UI,
Formatprüfung, Toolbar-Bedienbarkeit). Genau diese Lücke füllt Teil B.

### 0.2 Fixture-Sichtung als eigener, blockierender Vorbereitungsschritt

Für Abnahmekriterium 8 (reale Word-/LibreOffice-Dateien mit bekannter, vom
Ersatzwert abweichender Bildgröße) benennt `bild-einfuegen-code.md` Abschnitt 5.3
**konkrete, tatsächlich im Repo vorhandene** Fixtures mit real gemessenen Größen —
`docx/headerPic.docx` (`wp:extent cx=cy=763270` EMU, quadratisch ≈ 80×80 px, Bild
in `word/header1.xml`), `docx/drawing.docx` (10 Medien, u. a. ≈ 259×82 px),
`docx/WithGIF.docx`, `odt/image-attributes.odt` (`svg:width/height` `2.147cm`…),
`odt/imageAsChar.odt`, `odt/image.odt`. **QA-Vorbedingung:** vor Schreiben von
EF1/EF2 und B42/B43 wird per einmaligem Wegwerf-Skript
(`unzip -l`/`unzip -p … | grep -c 'w:drawing'` bzw. `draw:frame`) verifiziert,
welche dieser Dateien tatsächlich bildhaltig sind und mit welcher Größe; das
Ergebnis wird in Abschnitt 8 nachgetragen. **Anders als die Vorfassung** („noch
nicht einmal bekannt, welche Datei ein Bild enthält") sind die Kandidaten damit
bereits benannt; offen bleibt nur die Bestätigung der Messwerte.

**Konsequenz für die Status-Erwartung:** Alle neuen Testfälle, die einen der
bestätigten Defekte (F1/F3/F5/F6/F7/F8/F15) direkt betreffen, werden als **aktuell
rot erwartet** geführt — Regressionstests, die die Lücke **vor** jeder Umsetzung
festhalten, nicht hypothetische Grenzfälle.

---

## 1. Testumgebung und bewährte Locator

- **Unit-Tests:** `npm test` (Vitest, `jsdom`).
- **E2E-Tests:** `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `webServer` baut (`npm run build`, mit `VITE_ENABLE_TEST_HOOKS=true`) und
    startet `vite preview`.
  - **Drei Projekte:** Desktop Chrome, Mobile (`Pixel 7`, Chromium-Touch), Tablet
    (`iPad Mini`, **WebKit**). Jeder neue Testfall muss in **allen drei** grün
    sein, außer er ist explizit tastatur-/clipboard-abhängig (dann dokumentierter
    `test.skip`, siehe 2.6 und 4.13).
- **Bewährte, im Repo real genutzte Locator** (fortzuführen in
  `tests/e2e/images.spec.ts`; **keine** neu erfundenen Selektoren):
  - Start: `page.goto('/')` → `page.getByRole('button', { name: /verstanden/i }).click()`
    (Privacy-Banner).
  - Neues Dokument: `docxCard(page)`/`odtCard(page)` +
    `.getByRole('button', { name: 'Neu erstellen' }).click()`, mit
    `card = page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
    (bzw. „OpenDocument Text (.odt)").
  - Editor: `page.locator('.ProseMirror')`.
  - Toolbar: `page.getByTitle('Fett')`, `page.getByTitle('Aufzählung')`,
    `page.getByRole('button', { name: 'Tabelle einfügen' })`,
    `page.getByRole('button', { name: 'Ausschneiden' })` — alle im Repo verifiziert.
  - **Bild-Kontrolleintrag (Ist-Zustand, verifiziert):** proben-gestützt sind
    **zwei** gleichwertige, real genutzte Locator:
    `page.locator('label:has-text("Bild")').locator('input[type=file]')`
    (`cut.spec.ts`/`clipboard.spec.ts`) **oder**
    `page.locator('input[type="file"][accept="image/*"]')`
    (`export-error-handling.spec.ts`). **Nicht** den emoji-basierten
    `label:has-text("🖼 Bild")`/`label:has-text("🖼")` verwenden (unbewährt,
    emoji-Textmatching ist fragil). Nach F2 wechselt der **sichtbare** Auslöser auf
    `page.getByRole('button', { name: 'Bild einfügen' })`.
  - Karten-Upload (Import/Reimport, **anderer** Upload als Bild-Einfügen):
    `docxCard(page).locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`
    (überall im Repo) **oder** echter Klickpfad
    `const chooser = page.waitForEvent('filechooser'); await card.getByRole('button', { name: 'Datei hochladen' }).click(); (await chooser).setFiles(…)`
    (verifiziert in `file-open-edge-cases.spec.ts`).
  - Export/Download: `const dl = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportieren' }).click(); const download = await dl`.
    Zurück zur Formatauswahl für Reimport: `page.getByRole('button', { name: /formate/i }).click()`.
  - Konsolen-/JS-Fehler-Wächter (für „keine unbehandelte Promise-Ablehnung",
    B15/B17): das in `cut.spec.ts` etablierte `watchForConsoleErrors(page)`-Muster
    (`page.on('pageerror', …)` + `page.on('console', … type==='error')`),
    am Testende `assertNoConsoleErrors()`.
- **Test-Bilder mit bekannten Maßen:** kleine, im Testcode erzeugte PNG/JPEG-Buffer
  mit **bewusst nicht-3:2-Seitenverhältnis** (z. B. 40×40 = 1:1, 160×90 = 16:9),
  damit die Verzerrung durch den 300×200-Ersatzwert (F1) sichtbar wird. Ein
  gültiges 1×1-PNG als Base64 ist bereits in `cut.spec.ts`/`clipboard.spec.ts`
  vorhanden und wiederverwendbar; für definierte `IHDR`-Maße eine kleine
  Testcode-Helferfunktion (unkomprimiertes PNG mit gesetzten Breite/Höhe-Bytes),
  **ohne** Rückgriff auf `file.type` als Signal (genau das wird per Grenzfall 3.3
  geprüft).

---

## 2. Determinismus-Disziplin (verbindlich für Teil B)

Dieser Abschnitt ist **kein** eigener Testfall, sondern die für **jeden** Teil-B-Test
geltende Autorenregel. Er kodifiziert die im Repo bereits bewährten und
kommentierten Muster (`selection-regression.spec.ts`, `cut.spec.ts`), damit die
neuen Bild-Tests nicht dieselbe Flakiness reproduzieren, die dort mühsam behoben
wurde.

### 2.1 Grundregel: Beobachten statt schlafen — außer bei echten async-Sync-Races

- Für **Erwartungen** (Bild sichtbar, Textinhalt, Absatzanzahl) **immer**
  auto-wartende Assertions nutzen: `await expect(editor.locator('img')).toBeVisible()`,
  `await expect(page.locator('.ProseMirror p')).toHaveCount(n)`,
  `await expect(editor).toContainText(...)`. **Kein** `waitForTimeout` als Ersatz
  für eine Assertion.
- Feste Wartezeiten (`waitForTimeout`) sind **ausschließlich** für die drei unten
  benannten, im Editor real vorhandenen asynchronen Übergänge zulässig — nicht als
  allgemeines „Stabilisierungs"-Mittel.

### 2.2 Selektions-Sync abwarten (der Kern-Race dieses Features)

ProseMirror lernt eine **native, tastaturgetriebene** Cursorbewegung (`Home`,
`End`, `ArrowLeft/Right/Up/Down`, `Ctrl+Home`) erst über das **asynchrone**
Browser-Event `selectionchange`. Eine unmittelbar folgende Aktion (weiterer
Tastendruck **oder** das Auslösen des Bild-Uploads) kann diesem Nachziehen
vorauslaufen und auf der **alten** Position operieren.

**Regeln:**
1. Wird eine Selektion per gedrückter Umschalttaste **aufgebaut** (Serie von
   `Shift+ArrowRight`/`ArrowUp`), erhält **jeder** Tastendruck ein `{ delay: 20 }`
   (bewährt in `cut.spec.ts` Testfall 1/Grenzfall 13; 15–20 ms genügt, entspricht
   realistischer Key-Repeat-Rate).
2. Nach `keyboard.up('Shift')` bzw. nach einer einzelnen nativen Cursorbewegung
   und **vor** der nächsten selektionsverändernden Aktion:
   `await page.waitForTimeout(50)` (bewährtes Muster, überall mit identischem
   Kommentar). **Konkret für Bild-Einfügen:** Cursor per Tastatur setzen →
   `await page.waitForTimeout(50)` → **erst dann** den Bild-Upload auslösen. Damit
   fügt der Command (`run(view, insertImage(...))` liest `view.state` zum
   Einfügezeitpunkt) an der **beabsichtigten** Position ein.
3. Für die Cursor-Positionierung „an den Absatzanfang" **`Ctrl+Home`** statt `Home`
   verwenden: `Home` springt zum Anfang der aktuellen **visuellen** Zeile; auf dem
   schmalen Mobile-Viewport umbricht ein längerer Satz, und `Home` landet dann
   mitten im Absatz (in `cut.spec.ts` direkt verifiziert).

### 2.3 Asynchrone Einfüge-Kette abwarten, bevor getippt wird

Bild-Einfügen ist selbst asynchron: `FileReader.readAsDataURL` bzw. (nach Fix)
`file.arrayBuffer()` + `new Image()`-Decoding laufen **nach** dem `setInputFiles`/
`setFiles`. Vor jeder Folgeaktion, die vom eingefügten Bild abhängt (insb. der
„sofort tippen"-Test 4.4 / Anforderung 3.12), **zuerst** die Sichtbarkeit
abwarten: `await expect(editor.locator('img')).toBeVisible()`. Erst danach
`page.keyboard.type(...)`. Das ist die auto-wartende, deterministische Klammer um
die async-Kette; ein fester Timeout wäre hier weder nötig noch zuverlässig.

### 2.4 Undo-Gruppierung: 600 ms Settle vor der zu trennenden Aktion

`prosemirror-history` fasst benachbarte Transaktionen innerhalb seines
Default-`newGroupDelay` (~500 ms) zu **einem** Undo-Schritt zusammen. Für Tests,
die „Bild-Einfügen ist **ein** eigener Undo-Schritt" beweisen (B12,
Anforderung 2.6/3.11), **vor** dem Einfügen `await page.waitForTimeout(600)`, damit
das vorherige Tippen nicht mit dem Einfügen in dieselbe Undo-Gruppe fällt (in
`cut.spec.ts` Testfall 9 exakt so begründet und verifiziert). Sonst würde ein
einzelnes `Strg+Z` Tippen **und** Einfügen gemeinsam rückgängig machen und der Test
grün täuschen.

### 2.5 Keine pixelbasierte Maus-Drag-Selektion für Textbereiche

Eine `mouse.move/down/up`-Drag-Selektion mit festen Pixelkoordinaten ist über die
drei Projekte **unzuverlässig**, weil die Druckseiten-Breite (`pageLayout.ts`) je
Viewport unterschiedlich umbricht (in `cut.spec.ts` dokumentiert). Für
Textselektionen daher `Ctrl+Home` + `Shift+ArrowRight`-Serie (mit `delay`)
verwenden. Maus-Drag bleibt nur dort zulässig, wo es unvermeidlich ist
(z. B. Tabellenzellen-Bereich, `cut.spec.ts` Testfall 7).

### 2.6 Bekannte, dokumentierte Automatisierungsgrenzen (nicht als Flakiness kaschieren)

- **WebKit-Clipboard:** Cut→Paste per Tastenkürzel ist auf dem Tablet-Projekt
  (WebKit) unzuverlässig; betroffene Fälle `test.skip(browserName === 'webkit', …)`
  mit Begründung (Muster aus `cut.spec.ts` Testfall 2/12). Für Bild-Einfügen
  **nur** relevant, falls ein Test die Zwischenablage nutzt (nicht der Regelfall).
- **CI-only Mobile-Race:** Für Sequenzen „Selektion bis Dokumentende +
  unmittelbares `Strg+X`" ist eine ausschließlich in GitHub-Actions-Mobile
  auftretende, lokal nicht reproduzierbare No-op-Anomalie dokumentiert
  (`cut.spec.ts` Rundreise 1/2 mit begründetem `test.skip(project.name === 'Mobile', …)`).
  **Neue Bild-Tests dürfen einen solchen Skip nur mit derselben ausführlichen
  Begründung setzen** und erst, nachdem die beiden im Repo bereits erprobten Fixes
  (Sync-Wait nach Shift-Release; Clipboard-Permission) nachweislich nicht greifen —
  kein pauschaler Skip „gegen Flakiness".
- Fester Timeout als **Assertion-Ersatz** ist unzulässig (2.1); die o. g. 50/600-ms-
  Waits sind **Übergangs-**Waits vor der nächsten *Eingabe*, nicht vor der Prüfung.

---

## 3. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** schnelle, browserunabhängige Absicherung der Datenebene
(ProseMirror-`image`-Node ⇄ XML). Testet `insertImage`, `writeDocx`/`readDocx`,
`writeOdt`/`readOdt` und die neuen Hilfsmodule (`imageValidation.ts`, `units.ts`
laut `bild-einfuegen-code.md` 4.2/4.3) direkt — **keine** Playwright-Interaktion.

### 3.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei / Test | Deckt ab | Ist-Zustand |
|---|---|---|
| `docx/__tests__/roundtrip.test.ts` „preserves an embedded image as a self-contained data URL" | Data-URL bleibt erhalten (5.1.1 Teilaspekt) | **GRÜN**, aber lückenhaft — prüft `width`/`height` nicht, obwohl die Eingabe `width: 100, height: 80` setzt (siehe 0) |
| `docx/__tests__/roundtrip.test.ts` „splits a paragraph containing both text and an image…" | Blocktyp-Trennung Text/Bild (3.2 Teilaspekt) | **GRÜN**, deckt aber nur die Blocktyp-Trennung ab, nicht die Cursor-Positions-Matrix und nicht den echten Browser-Flow |
| `docx/__tests__/roundtrip.test.ts` Whole-Document-Fidelity | Bild als Geschwister neben Überschrift/Absatz/Liste/Tabelle | **GRÜN**, aber Bild nur als letztes Element — **kein** Bild **innerhalb** Zelle/Listenpunkt/Kopf-Fußzeile |
| `odt/__tests__/roundtrip.test.ts` (Data-URL + Alt-Text) | 2.5, 5.1.2 (Teilaspekt) | **GRÜN**, aber Eingabe-Node hat **kein** `width`/`height` — Maß-Rundreise nicht versucht |
| `odt/__tests__/roundtrip.test.ts` (Trennung Text/Bild) | analog DOCX | **GRÜN**, gleiche Einschränkung |

Diese Tests bleiben unverändert Teil der Suite; sie werden **ergänzt**, nicht ersetzt.

### 3.2 NEU: `src/formats/shared/editor/__tests__/commands.test.ts` (erweitern) — F11

Datei existiert bereits (`canCut`/`cutSelection`). Neuer `describe('insertImage')`.
Muster: `EditorState.create({ schema: wordSchema, doc: wordSchema.nodeFromJSON(...) })`
+ `TextSelection.create(...)`/`NodeSelection` an definierter Position →
`insertImage(src, opts)(state, tr => (state = state.apply(tr)))` →
`state.doc.toJSON()` prüfen. (Rein synchron, keine Race-Thematik — deshalb hier auf
Unit-Ebene der schnellste Nachweis des Kernfalls.)

| # | Testfall | Erwartung | Bezug | Status |
|---|---|---|---|---|
| CI1 | Cursor inmitten eines Wortes („HalloWelt", zwischen „Hallo"/„Welt") | Zwei Absätze `"Hallo"`/`"Welt"`, Bild dazwischen, **kein** Textverlust | 2.1.3/3.2(c), Kernfall | **GRÜN erwartet** (laut Code-Analyse 1.6 korrekt — muss aber als Test **existieren**) |
| CI2 | Cursor am Absatzanfang | Bild **vor** unverändertem Absatz, kein leerer Stub | 3.2(a) | **GRÜN erwartet** |
| CI3 | Cursor am Absatzende | Bild **nach** unverändertem Absatz | 3.2(b) | **GRÜN erwartet** |
| CI4 | Cursor mitten in `strong`-Text | Beide Teile behalten `strong`; Bild-Node **ohne** geerbte Mark | 3.2(d) | **GRÜN erwartet** |
| CI5 | Leerer Absatz | Absatz wird durch Bild ersetzt, kein verwaister Leerblock | 3.2(e) | **GRÜN erwartet** |
| CI6 | Cursor vor `hard_break` | `hard_break` bleibt im **zweiten** Teilabsatz | 3.2(f) | **GRÜN erwartet** |
| CI7 | Cursor mitten in `heading` | Verhalten **festnageln** (Teilen in zwei gleichrangige `heading` **oder** was der Lauf zeigt) | 2.8, offene Entscheidung 9.3 | **GRÜN erwartet + Dokumentationspflicht** (Kommentar: noch nicht produktseitig bestätigt) |
| CI8 | Cursor am Anfang/Ende einer `heading` | Bild vor/nach unveränderter Überschrift, **kein** Teilen | 2.8 | **GRÜN erwartet** |
| CI9 | `list_item` (Content `block+`), Cursor am Anfang | Bild bleibt **innerhalb** desselben `list_item`, Liste bricht nicht ab | 2.8 | **GRÜN erwartet** (gegen das **tatsächliche** `block+`-Modell formulieren, nicht gegen das falsche `'paragraph block*'`) |
| CI10 | Zwei `list_item`s, Cursor mittig/Ende im ersten | Bild bleibt im **ersten** `list_item`, **kein** Vertauschen | 2.8 | **GRÜN erwartet** |
| CI11 | `table_cell` (`block+`), Cursor mittig | Zelle bleibt gültig, Bild zwischen zwei Absätzen derselben Zelle | 2.8 | **GRÜN erwartet** |
| CI12 | Bestehende, nicht-leere Selektion | Selektierter Text wird **ersetzt**, nicht ergänzt | 2.2 | **GRÜN erwartet** |
| CI13 | `insertImage(src)` ohne Options | `width`/`height` bleiben `null` (Abwärtskompatibilität) | Kompatibilität | **GRÜN erwartet** (heute trivial, da Maße nie existieren) |
| CI14 | **F1-Regression:** `insertImage(src, { alt, width: 400, height: 300 })` | Node trägt **exakt** `width===400`, `height===300` | F1, 2.4 | **ROT** — heutige Signatur `insertImage(src, alt='')` akzeptiert kein Options-Objekt; muss vor F1 fehlschlagen |

CI1–CI13 dokumentieren das laut Code-Analyse bereits korrekte, aber bislang
**ungetestete** `replaceSelectionWith`-Verhalten; CI14 ist der einzige bewusst rote
Fall.

### 3.3 NEU: `src/formats/shared/editor/__tests__/imageValidation.test.ts` — F3/F4

Voraussetzung: Modul `imageValidation.ts` (Code-Plan 4.2, **aktuell nicht
vorhanden**). Alle Fälle **ROT**, bis die Datei existiert.

| # | Testfall | Erwartung | Bezug |
|---|---|---|---|
| IV1 | `sniffImageMimeType` mit PNG-Signatur (`89 50 4E 47 0D 0A 1A 0A`) | `'image/png'` | 3.3, F3 |
| IV2 | JPEG (`FF D8 FF`), GIF87a, GIF89a, BMP (`42 4D`) | jeweils korrekter MIME | 3.3 |
| IV3 | WebP (`RIFF`…`WEBP`) | `'image/webp'` | 3.3 |
| IV4 | leerer/zu kurzer/zufälliger Puffer (z. B. Beginn einer `.txt`) | `null` | 3.3 (Kernfall) |
| IV5 | `computeDisplaySize`: kleiner als `maxWidth` | unverändert (keine Hochskalierung) | 2.4 |
| IV6 | `computeDisplaySize`: breiter als `maxWidth` | herunterskaliert, Verhältnis erhalten (±1 px) | 2.4, 3.4 |
| IV7 | `computeDisplaySize`: 0×0 | sinnvoller Fallback statt `NaN`/Div-durch-0 | Robustheit |
| IV8 | `arrayBufferToBase64`: Rundreise gegen `atob()`, Puffer < **und** > 0x8000 Byte | identisch, kein Stack-Overflow beim großen Puffer | F4, 3.7 |
| IV9 | `MAX_IMAGE_BYTES`/`SUPPORTED_IMAGE_MIME_TYPES`-Snapshot | Werte = freigegebene Entscheidung (Abschnitt 9 Code-Plan) | offene Entscheidung 9.1/9.2 — **bis Freigabe blockiert** |

**Nicht hier:** `loadImageDimensions` (`new Image()`) — jsdom dekodiert keine
echten Bilddaten (etabliertes Muster, vgl. `SKIP_SLOW_UNDER_JSDOM` in
`external-fixtures.test.ts`). Ausschließlich per E2E (4.6) mit echten Bytes.

### 3.4 NEU: `src/formats/shared/units.test.ts`

Voraussetzung: Modul `units.ts` (Code-Plan 4.3, **aktuell nicht vorhanden**). Alle **ROT**.

| # | Testfall | Erwartung |
|---|---|---|
| U1 | `pxToEmu(96)` | `914400` (1 Zoll) |
| U2 | `emuToPx(pxToEmu(x))` für mehrere `x` | Rundreise ±1 px |
| U3 | `pxToCm(96)` | `2.54` |
| U4 | `pxToCm(300)` | ≈ `7.94` (Toleranz 0.01) |
| U5 | `parseOdfLength('6cm'/'1in'/'28.35pt'/'120mm'/'300px')` | jeweils korrekter px-Wert |
| U6 | `parseOdfLength(''/null/'abc'/'-5cm')` | `null` (kein Wurf, defensiv) |
| U7 | `parseOdfLength('300px')` interpretiert `px` als 96-dpi-Pixel, nicht als `pt` | `300` (Neufund/F8) |

### 3.5 `docx/__tests__/roundtrip.test.ts` — Erweiterungen (F13/F5/F15/F1)

| # | Testfall | Erwartung | Status |
|---|---|---|---|
| D1 | Bestehenden Test um `expect(image.attrs.width).toBe(100)`/`.height).toBe(80)` ergänzen (Eingabe hat sie bereits) | Maße exakt zurück | **ROT** — Reader liest `wp:extent` nicht (0) |
| D2 | Bild **ohne** Maße → Rundreise | gemeinsame Ersatzgröße 300×200 (nicht `null`) | **ROT bis F5/F7** |
| D3 | **F5:** handgebautes `document.xml` mit `<wp:extent cx="1828800" cy="1143000"/>` (192×120 px) per JSZip | `width===192`, `height===120` | **ROT** — Lesepfad fehlt |
| D4 | **F15:** Dokument mit **drei** unterschiedlichen Bildern → `document.xml` parsen, **alle** `wp:docPr/@id` einsammeln | `new Set(ids).size===3`, jede `id>0`, `pic:cNvPr/@id`==zugehörige `wp:docPr/@id` | **ROT** — heute alle `id="1"`/`"0"` |
| D5 | Bild in Tabellenzelle mit Maßen | Rundreise erhält Zelle+Größe (5.1.8 Unit-Ebene) | **ROT** (Größe), Struktur **grün erwartbar** |
| D6 | Bild in Kopf-/Fußzeile mit Maßen | Größe bleibt; Fußzeilen-Bild-ID kollidiert **nicht** mit Body-ID (gemeinsame `DrawingIdSequence`) | **ROT** (Größe/ID), Struktur **grün erwartbar** |
| D7 | Zwei **identische** Data-URLs an verschiedenen Positionen | **beide** Vorkommen erhalten; `ImageCollector` dedupliziert nur die Mediendatei; Content-Types deklarieren die Endung genau einmal | **GRÜN erwartet** (Writer-Verhalten, nur ungetestet) |

### 3.6 `odt/__tests__/roundtrip.test.ts` — Erweiterungen (F13/F6/F8/F7/F1)

| # | Testfall | Erwartung | Status |
|---|---|---|---|
| O1 | Eingabe **mit** `width`/`height` → Assertion auf exakte Werte | Maße exakt zurück | **ROT** — ODT-Test hat heute nicht mal `width`/`height`; Reader-Defekt wie DOCX |
| O2 | **F6:** handgebautes `content.xml` mit `<draw:frame svg:width="5cm" svg:height="3cm">` per JSZip | `width≈189px`, `height≈113px` (Toleranz) | **ROT** — Lesepfad fehlt |
| O3 | **F8:** exportiertes `content.xml` enthält **keine** `svg:width="…px"`-Zeichenkette | Regex-Assertion greift nicht auf `px` | **ROT** — Writer schreibt heute `${width}px` |
| O4 | Bild ohne Größe → Rundreise | gemeinsame Ersatzgröße (in cm, aus `DEFAULT_IMAGE_WIDTH_PX`) statt `6cm`/`4cm` | **ROT bis F7** |
| O5 | Bild in Zelle/Kopf-Fußzeile mit Größe | Größe bleibt | **ROT** (Größe), Struktur **grün** |
| O6 | Zwei unterschiedliche + zwei identische Bilder | analog D6/D7 | teils **rot** (Größe), teils **grün** (Dedup/Position) |

### 3.7 NEU: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für 5.1.5/5.1.6/5.1.7, schneller als E2E; ergänzt (ersetzt nicht) 4.7.

| # | Testfall | Erwartung | Status |
|---|---|---|---|
| X1 | DOCX → ODT: Bild mit Größe (`320×180`) via `readOdt(writeOdt(readDocx(writeDocx(c))))` | Größe (umgerechnet) + Alt-Text erhalten | **ROT bis F5/F6/F7/F8** |
| X2 | ODT → DOCX, spiegelbildlich | analog | **ROT bis Fixes** |
| X3 | Doppelte Rundreise DOCX → ODT → DOCX (5.1.7) | inhaltlich identisch, kein kumulativer Maßverlust | **ROT bis Fixes** |

### 3.8 `external-fixtures.test.ts` (DOCX + ODT) — Erweiterung, schließt 0.2 (F14)

**Vorbedingung:** Fixture-Sichtung aus 0.2 abgeschlossen.

| # | Testfall | Erwartung | Status |
|---|---|---|---|
| EF1 | Für jede bildhaltige Fixture (`headerPic.docx`, `drawing.docx`, `image-attributes.odt`, …): gefundene `image`-Knoten haben `width`/`height` **≠ null** | mind. 1 Knoten mit numerischer Größe je Datei | **ROT bis F5/F6** |
| EF2 | Für dieselben Fixtures: Import → unveränderter Export → Reimport erhält die `image`-Knoten-Anzahl exakt | Anzahl vor/nach identisch | **GRÜN erwartbar** (reine Strukturzählung) |

---

## 4. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wortgleich mit dem Auftrag):** Kein Teil-B-Test wird durch
direkten Aufruf interner Funktionen (`insertImage`, `readDocx`,
`sniffImageMimeType` …) im Node-Kontext ersetzt. Jeder Fall läuft über echte
Handlungen im Browser: `locator.click()`, `keyboard.press/type`, echter
Datei-Upload und `waitForEvent('download')` + **strukturelles** Parsen der
heruntergeladenen Datei (`JSZip` + `DOMParser`, **nicht** `.toContain`-Stringsuche).
**Alle Fälle unterliegen der Determinismus-Disziplin aus Abschnitt 2** — die
betroffenen Zeilen verweisen ausdrücklich darauf.

### 4.1 NEU: `tests/e2e/images.spec.ts`

Folgt den Konventionen aus `docx.spec.ts`/`odt.spec.ts`/`cut.spec.ts`
(`docxCard`/`odtCard`-Helfer lokal, `watchForConsoleErrors`-Helfer,
`waitForEvent('download')` + `JSZip`). `describe`-Gliederung je Themenblock.

**Hinweis zum echten Klickpfad des Bild-Uploads (statt nur `setInputFiles`):** Da
der Bild-Kontrolleintrag heute ein `<label>` um einen versteckten `<input>` ist,
öffnet ein **Klick auf das Label** bereits den nativen Dialog. Der echte Klickpfad
ist damit **schon vor F2** möglich:
```ts
const chooser = page.waitForEvent('filechooser')
await page.locator('label:has-text("Bild")').click()
;(await chooser).setFiles({ name, mimeType, buffer })
```
Nach F2 wird daraus `page.getByRole('button', { name: 'Bild einfügen' }).click()`.
**Regel (siehe 4.11):** mindestens der **erste** Fall jeder Interaktionsart läuft
über diesen echten Klickpfad; reine Wiederholungen dürfen aus Laufzeitgründen
`setInputFiles` auf `input[type="file"][accept="image/*"]` nutzen (im Kommentar
vermerken).

### 4.2 Grundfall: Einfügen an der Cursor-Position (Anforderung 2.1/3.2 — höchste Priorität)

Determinismus: **Cursor per Tastatur setzen → `waitForTimeout(50)` (2.2) → Upload
auslösen → `await expect(editor.locator('img')).toBeVisible()` (2.3)**, dann erst
Assertions.

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B1 | Cursor inmitten eines Wortes (Kernfall der Meldung) — `"HalloWelt"` tippen, per `ArrowLeft`-Serie (`delay:20`) mittig setzen, `waitForTimeout(50)`, echter Label-Klick-Upload eines Test-PNG | `.ProseMirror img` sichtbar; Editor enthält **beide** Teile „Hallo"/„Welt"; exakte Absatzanzahl `.ProseMirror p` = 2 | 3.2(c), zentraler Fehler | **GRÜN erwartet** — **erster** echter Browser-Beweis des Kernfalls |
| B2 | Cursor am Absatzanfang (`Ctrl+Home`, **nicht** `Home` — 2.2) | Bild **vor** unverändertem Text | 3.2(a) | **GRÜN erwartet** |
| B3 | Cursor am Absatzende (`End`, dann `waitForTimeout(50)`) | Bild **nach** unverändertem Text | 3.2(b) | **GRÜN erwartet** |
| B4 | Cursor mitten in fett-Text (Wort markieren, `getByTitle('Fett')`, Cursor hinein) | Beide Teile bleiben **fett**, Bild nicht fett | 3.2(d) | **GRÜN erwartet** |
| B5 | Cursor in leerem Absatz (neues Dokument) | Bild ersetzt Absatz, Editor weiter bedienbar | 3.2(e), 3.8 | **GRÜN erwartet** |
| B6 | Cursor inmitten einer Überschrift („Überschrift 1" wählen) | Zwei Überschriften gleichen Levels, Bild dazwischen, kein Crash — **Ergebnis protokollieren** (offene Entscheidung 9.3) | 2.8, 9.3 | **Dokumentationspflichtig** |
| B7 | Cursor in Listenpunkt (`getByTitle('Aufzählung')`) | Bild **innerhalb** des `<li>`, `<ul>` bleibt (kein Listenabbruch) | 2.8 | **GRÜN erwartet** |
| B8 | Cursor in Tabellenzelle (`Tabelle einfügen`, in Zelle klicken) | Bild **innerhalb** der Zelle, übrige Zellen bedienbar | 2.8 | **GRÜN erwartet** |
| B9 | Bestehende Textselektion wird ersetzt | Markierter Text weg, Bild an seiner Stelle | 2.2 | **GRÜN erwartet** |
| B10 | Bild am Dokumentanfang/-ende | Editor bedienbar, Cursor davor/danach setzbar, Text eintippbar | 3.8 | **GRÜN erwartet** |
| B11 | Bild direkt vor/nach Tabelle bzw. Liste | keine Vermischung/Verschiebung der Nachbarstruktur | 3.9 | **GRÜN erwartet** |

### 4.3 Undo/Redo (Anforderung 2.6, Grenzfall 3.11)

Determinismus: **vor dem Einfügen `waitForTimeout(600)` (2.4)**, damit Einfügen ein
eigener Undo-Schritt ist; Bild-Sichtbarkeit vor dem Undo abwarten.

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B12 | Undo nach Einfügung inmitten eines Absatzes: nach B1 (mit 600-ms-Settle vor dem Upload) `ControlOrMeta+z` | Bild weg; **ein** zusammenhängender Absatz `"HalloWelt"` (nicht zwei Reste) | 2.6, 3.11 | **GRÜN erwartet** |
| B13 | Redo (`ControlOrMeta+y` bzw. `ControlOrMeta+Shift+z`) | Bild inkl. aller Attribute identisch zurück | 2.6 | **GRÜN erwartet** |
| B14 | Undo/Redo bei Einfügung am Dokumentanfang/-ende | einzelner sauberer Undo-Schritt | 2.6 | **GRÜN erwartet** |

### 4.4 Tippen unmittelbar nach dem Einfügen (Anforderung 2.1.4/3.12)

Determinismus (kritisch): **erst `await expect(editor.locator('img')).toBeVisible()`
(2.3), dann tippen** — sonst rennt der Tastendruck der async-Einfüge-Kette voraus
und der Test misst einen Race, nicht das Produktverhalten.

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B15 | Bild einfügen → Bild sichtbar abwarten → sofort tippen | Bild **bleibt**, Text erscheint **dahinter** (Sollverhalten). Falls die Produktentscheidung „NodeSelection auf Bild belassen" fällt: dokumentiertes Alternativverhalten (Tippen ersetzt Bild) explizit als solches asserten | 2.1.4/3.12, offene Entscheidung 9.3 | **Ausgang offen bis Entscheidung** — heute: `NodeSelection` bleibt, Tippen ersetzt das Bild |

### 4.5 Formatprüfung / Fehlerbehandlung (Anforderung 2.3, Grenzfall 3.3 — bestätigter Defekt)

Determinismus: `watchForConsoleErrors(page)` **vor** der Aktion setzen,
`assertNoConsoleErrors()` am Ende (fängt die unbehandelte Promise-Ablehnung).

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B16 | Nicht-Bild-Datei mit Bild-Endung (`{ name:'bild.png', mimeType:'text/plain', buffer:<txt> }`) | sichtbare Fehlermeldung (`getByRole('alert')`); **kein** `<img>` im DOM; **keine** `pageerror`/Konsolen-Fehler | 2.3, 3.3, F3 | **ROT** — heute kein Check, Datei wird als kaputtes `<img>` eingefügt |
| B17 | 0-Byte-Datei | Fehlermeldung, keine Einfügung | 2.3 | **ROT** — kein Leer-Check |
| B18 | Beschädigtes Bild (gültiger PNG-Header, abgeschnittener Rumpf) | Fehlermeldung statt kaputtem `<img>` (greift `Image.onerror`, Code-Plan 4.2) | 3.3 | **ROT** — keine Dekodier-Prüfung |
| B19 | Dialog-Abbruch (`filechooser`-Event, dann **keine** Datei: `fileChooser.setFiles([])`) | keine Änderung, kein Fehler | 2.3 (`if (!file) return`) | **GRÜN erwartet** (einziger bereits korrekter Pfad, mit Test abzusichern) |
| B20 | **Dieselbe Datei zweimal** hintereinander wählen | beide Male eingefügt (Regression für `input.value = ''`-Reset) | 2.3 | **GRÜN erwartet** |

### 4.6 Größe/Seitenverhältnis nach Export (Grenzfall 3.4 — bestätigter Verzerrungs-Defekt)

Prüfung **strukturell** (4.12), nicht per String. Determinismus: nach Upload Bild
sichtbar abwarten, **dann** exportieren (`waitForEvent('download')`).

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B21 | 1:1-Bild (40×40) → DOCX-Export, `word/document.xml` parsen, `<wp:extent cx cy>` | `cx/cy ≈ 1:1` (±Toleranz) | 3.4, 5.1 | **ROT** — ohne Maße erzwingt Writer 300×200 (3:2) |
| B22 | Dasselbe Bild → ODT-Export, `content.xml` → `svg:width`/`svg:height` (NS `…:svg-compatible:1.0`) | Verhältnis 1:1 | 3.4, 5.1 | **ROT** — ODT-Fallback 6×4 cm (3:2) |
| B23 | 16:9-Bild (160×90) → DOCX **und** ODT | Verhältnis ≈ 16:9, **nicht** 3:2 | 3.4 | **ROT** |
| B24 | Editor-Rendergröße vs. Export-Größe direkt gegenübergestellt (`.ProseMirror img` `boundingBox()` vs. Export-Maße) | vor Fix: `expect(editorRatio).not.toBeCloseTo(exportRatio)`; nach F1: `toBeCloseTo` | 2.4, 3.4 | **ROT (Diskrepanz)** — nach F1 zu Gleichheits-Assert umkehren |

### 4.7 Rundreise DOCX/ODT über echten Upload/Export (Anforderung 5.1.1/5.1.2 und 5.1.5–5.1.12)

Determinismus: für Reimport den echten Karten-Upload-Pfad (1) nutzen; Bild-
Sichtbarkeit nach jedem Import abwarten.

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B25 | DOCX, reine Editor-Erzeugung: Text → Cursor mittig (50-ms-Sync) → Bild (echter Flow) → Export → über echten Karten-Upload reimportieren | Bild an gleicher relativer Position, beide Textteile da, unverzerrt (Verhältnis wie B21) | 5.1.1 | **Teilweise ROT** (Position/Text grün, Größe rot bis F1/F5) |
| B26 | ODT, analog | analog | 5.1.2 | **Teilweise ROT** |
| B27 | Bild löschen, dann exportieren: Bild einfügen, anklicken (`NodeSelection`), `Delete`, exportieren | Export-Zip enthält **kein** verwaistes `word/media/*` bzw. `Pictures/*`; kein verwaister Relationship-/Manifest-Eintrag | 5.1.10 | **GRÜN erwartet** (vgl. `cut.spec.ts` Rundreise 6, dort bereits grün) |
| B28 | Mehrere Bilder (≥ 3, unterschiedliche Positionen) einfügen, exportieren, reimportieren | alle drei einzeln, unterscheidbar, positionsrichtig | 5.1.9 | **GRÜN erwartet** (Struktur), Größe rot |
| B29 | **5.1.11 unabhängige DOCX-Struktur:** exportiertes `<w:drawing>` per `DOMParser` (NS `wp`/`a`/`pic`/`r`): `wp:extent`, `a:blip[@r:embed]`, `pic:pic` vorhanden; `r:embed` löst über `document.xml.rels` zu vorhandener `media/*`-Datei auf; **alle `wp:docPr/@id` eindeutig** | alle Pflichtelemente + eindeutige IDs | 5.1.11, F15 | **Struktur GRÜN erwartet; ID-Eindeutigkeit ROT bis F15** |
| B30 | **5.1.12 unabhängige ODT-Struktur:** `draw:image[@xlink:href]` referenziert vorhandene Zip-Datei **und** hat `<manifest:file-entry>` in `META-INF/manifest.xml` | Referenz + Manifest-Eintrag korrekt | 5.1.12 | **GRÜN erwartet (Struktur)** |
| B31 | **F8 auf E2E-Ebene:** exportiertes ODT — `getAttributeNS(svg,'width')` matcht `/^[\d.]+(cm|mm|in|pt|pc)$/`, **nicht** `px` | keine `px`-Einheit | Neufund/F8 | **ROT** — Writer schreibt heute `px` |
| B32 | Cross-Format DOCX → ODT (5.1.5): Bild in DOCX → Export → über ODT-Karte hochladen → als ODT exportieren | Bild, Alt-Text, Größe (umgerechnet) erhalten | 5.1.5 | **Teilweise ROT** (Größe) |
| B33 | Cross-Format ODT → DOCX (5.1.6), umgekehrt | analog | 5.1.6 | **Teilweise ROT** |
| B34 | Doppelte Rundreise DOCX → ODT → DOCX (5.1.7) | inhaltlich identisch, kein kumulativer Maßverlust | 5.1.7 | **Teilweise ROT** |

> **Hinweis zu 5.1.11 (mammoth):** Der DOCX-„external-validation"-Kanal
> (`docx/__tests__/external-validation.test.ts`, mammoth) ist **tolerant** und
> erzwingt die `wp:docPr/@id`-Eindeutigkeit **nicht** (Code-Plan Revision Punkt 8).
> Die eigentliche Eindeutigkeits-Assertion ist daher der XML-Parse (D4 auf Unit-,
> B29 auf E2E-Ebene), **nicht** der mammoth-Lauf allein.

### 4.8 Toolbar-Bedienbarkeit (Anforderung Abschnitt 1 — F2)

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B35 | Kontrolleintrag ist **kein** per Rolle auffindbarer Button (`getByRole('button', { name: 'Bild einfügen' })`) | `toHaveCount(0)` — bewusster Lückennachweis | F2, §1 | **Heute GRÜN** (0 Treffer korrekt); wird nach F2 **rot** und dann durch B36/B37 abgelöst (nicht gelöscht) |
| B36 | Nach F2: `Tab` bis `getByRole('button', { name: 'Bild einfügen' })` (`toBeFocused()`), `Enter` | `waitForEvent('filechooser')` löst aus | F2, §1 | **Blockiert bis F2** |
| B37 | Nach F2: Leertaste statt Enter | Dialog öffnet | F2 | **Blockiert bis F2** |
| B38 | Icon ohne Emoji-Font erkennbar: `svg`-Element im Kontrolleintrag vorhanden | SVG vorhanden | §1 Zeile 3, F2 | **ROT** — heute nur Unicode-Emoji „🖼" |

### 4.9 Selektions-Sync-Regression mit Bild als Auslöser (Grenzfall 3.1, Anforderung 6.9 — Pflicht)

**Erweiterung von `tests/e2e/selection-regression.spec.ts`** (neuer `test`-Block,
gleiche Datei, gleiches Muster wie die drei bestehenden Tests — inkl. deren
`waitForTimeout(50)` nach `End`/`ArrowUp`, siehe 2.2). Bild-Einfügen ersetzt „Fett"
als dritte Trigger-Aktion.

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B39 | Text → Bild (echter Flow) → Klick zur Neupositionierung → `End` → `waitForTimeout(50)` → `Enter` → weiter tippen | kein Textverlust, `.ProseMirror p`-Anzahl wie erwartet, Bild an ursprünglicher Position | 3.1, §6.9 | **GRÜN erwartet** (strukturell korrekt laut 1.7) — **muss ausgeführt** werden |
| B40 | Stress: ≥ 3 Zyklen Text → Bild → Klick → 50-ms-Sync → `Enter` | stabil, keine kumulative Verschlechterung | 3.1 | **GRÜN erwartet** |

### 4.10 Weitere Grenzfälle (Anforderung Abschnitt 3)

| # | Test | Assertion | Bezug | Status |
|---|---|---|---|---|
| B41 | Schnelles Einfügen mehrerer Bilder (3.10): drei verschiedene Bilder nacheinander, Cursor je Tastatur neu setzen (je 50-ms-Sync), Bild-Sichtbarkeit je Schritt abwarten | jedes an der **jeweils** aktuellen Position, nicht alle an derselben veralteten | 3.10 | **GRÜN erwartet** |
| B42 | Großdatei (3.7): Bild nahe `MAX_IMAGE_BYTES` (bzw. 10–20 MB) über echten Upload, Zeit bis Sichtbarkeit messen | Zeit protokolliert (kein hartes Zeitlimit → CI-Flakiness vermeiden), UI danach bedienbar (Toolbar-Klick funktioniert) | 3.7, Hinweis 11 | **Dokumentationspflichtig** (Ist-Verhalten messen, nicht vermuten) |
| B43 | Datei über `MAX_IMAGE_BYTES` (nach F4) | Fehlermeldung statt Einfügung | F4, 3.7 | **Blockiert bis F4 + Grenzwert-Freigabe** |
| B44 | Transparenz-PNG / animiertes GIF (3.14): einfügen → exportieren → reimportieren | Bytes/Format erhalten (PNG-Alpha bleibt, GIF nicht zu Standbild anderer Kodierung) | 3.14 | **GRÜN erwartbar** (Bytes werden unverändert eingebettet) — verifizieren |
| B45 | Externe URL nicht exportierbar (3.15): Bild-Node mit `src="https://…"` über per Zwischenablage eingefügtes `<img>`-HTML → Export | sichtbare Fehlermeldung statt stillem Abbruch (`ImageCollector.add` wirft) | 3.15, §20.4 | **Ausgang offen** — heute: Wurf; ob die UI ihn sichtbar macht, ist zu prüfen (vgl. `export-error-handling.spec.ts`) |

### 4.11 Reale Fixture-Dateien (Anforderung 6.10, Abnahmekriterium 8 — abhängig von 0.2)

| # | Test | Fixture | Prüfung | Status |
|---|---|---|---|---|
| B46 | Import bildhaltiger DOCX-Fixture | `headerPic.docx` (quadratisch ≈ 80×80, in `header1.xml`), `drawing.docx` (mehrere Bilder), `WithGIF.docx` | Import ohne Absturz, Bild sichtbar; unveränderter Export erhält Bild **und** reale Größe (nicht 300×200); Kopfzeilen-Kontext (5.1.8) | **ROT** (Größe) bis F5/F6; Struktur **grün** — abhängig von 0.2 |
| B47 | Import bildhaltiger ODT-Fixture | `image-attributes.odt` (`svg:width` `2.147cm`…), `imageAsChar.odt`, `image.odt` | analog, `svg:width`/`svg:height` erhalten (F6 an **echter** Fremddatei) | **ROT** bis F6 — abhängig von 0.2 |
| B48 | Neu mit echtem Word erzeugte Datei, Bild bewusst 5×5 cm | manuell zu beschaffen (siehe 8), **nur falls** die vorhandenen Korpora 5.1.5/5.1.6 nicht abdecken | Rundreise erhält 5×5 cm (±Toleranz) | **Blockiert, ggf. entbehrlich nach 0.2** |
| B49 | Neu mit echtem LibreOffice erzeugte Datei, analog | manuell | analog | **Blockiert, ggf. entbehrlich** |

### 4.12 Unabhängiges, strukturelles Parsen der heruntergeladenen Datei (nicht `.toContain`)

Für **alle** Größen-/Rundreise-Tests (B21–B34, B44) verbindlich, analog dem
etablierten Muster (`cut.spec.ts` Rundreise, `roundtrip-fidelity.spec.ts`):

```ts
const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
const documentXml = await zip.file('word/document.xml')!.async('text')
const xmlDoc = new DOMParser().parseFromString(documentXml, 'application/xml')
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const extents = [...xmlDoc.getElementsByTagNameNS(WP_NS, 'extent')]
expect(extents).toHaveLength(<erwartete Bildanzahl>)
const cx = Number(extents[0]!.getAttribute('cx'))
const cy = Number(extents[0]!.getAttribute('cy'))
expect(cx / cy).toBeCloseTo(sourceWidthPx / sourceHeightPx, 1)
```

ODT analog über `getAttributeNS(SVG_NS, 'width'/'height')`, mit im **Testcode**
(nicht aus dem Produktionscode importierter) Einheiten-Umrechnung — sonst „der
Writer prüft sich selbst". Maß-Toleranz gemäß Anforderung 5.3 (px↔EMU/cm bei 96 dpi,
±1 px) im Test festschreiben.

### 4.13 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini/WebKit) | Anmerkung |
|---|---|---|---|---|
| Klick-/Upload-Tests (B1–B35, B38–B47) | Pflicht | Pflicht | Pflicht | `.click()`/`setFiles()` projektunabhängig |
| Tastatur-only (B36, B37) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch ohne Hardware-Tastatur; `keyboard.press` bleibt via CDP auslösbar |
| Undo/Redo, Selection-Sync (B12–B14, B39–B40) | Pflicht | Pflicht | Pflicht | Determinismus-Waits aus 2.2/2.4 zwingend |
| Großdatei-Timing (B42) | Pflicht (Referenz) | Dokumentieren | Dokumentieren | kein hartes Cross-Device-Limit |
| Clipboard-abhängige Fälle (nur B45, falls über Zwischenablage) | Pflicht | Pflicht (Chromium) | `test.skip(webkit)` (2.6) | WebKit-Clipboard-Grenze |

### 4.14 Bestehende Tests, die unverändert weiterlaufen müssen

- `selection-regression.spec.ts` (alle 4 bestehenden Tests) — **Pflicht**, bleibt,
  wird um B39/B40 **ergänzt**.
- `cut.spec.ts` (Testfall 8, Rundreise 6 nutzen Bild-Upload) — **Pflicht**, dürfen
  durch die neuen Tests **nicht** brechen.
- `clipboard.spec.ts`, `export-error-handling.spec.ts` (Bild-Upload) — bleiben.
- `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts` — unverändert.

---

## 5. Traceability-Matrix

### 5.1 Anforderung Abschnitt 2 → Testfall(e)

| §2 | Testfall(e) |
|---|---|
| 2.1 Grundfall Cursor-Position | B1–B3 (Unit CI1–CI3) |
| 2.2 Einfügen über Selektion | B9 (Unit CI12) |
| 2.3 Dateiauswahl/Formatprüfung | B16–B20 (Unit IV1–IV4) |
| 2.4 Bildgröße beim Einfügen | B21–B24 (Unit IV5–IV7) |
| 2.5 Alt-Text | O1, bestehende ODT-Roundtrip-Basis (3.1) |
| 2.6 Undo/Redo | B12–B14 |
| 2.7 Zusammenspiel mit Löschen | B27 |
| 2.8 Geltungsbereich Dokumentstruktur | B6–B8 (Unit CI7–CI11) |

### 5.2 Anforderung Abschnitt 3 (Grenzfälle) → Testfall(e)

| Grenzfall | Testfall(e) |
|---|---|
| 3.1 Selection-Sync nach Toolbar-Klick | B39, B40 |
| 3.2 Text-Absatz-Teilung (Kernfall) | B1–B6, CI1–CI8 |
| 3.3 Fehlende Formatprüfung | B16–B18, IV1–IV4 |
| 3.4 Diskrepanz Darstellung vs. Export-Größe | B21–B24 |
| 3.5 Größenverlust Fremddatei-Rundreise | D3, O2, B46–B49 |
| 3.6 Mehrere/identische Bilder | D7, O6, B28 |
| 3.7 Sehr große Bilddatei | B42, B43, IV8 |
| 3.8 Bild am Dokumentanfang/-ende | B10, CI2/CI3 |
| 3.9 Bild neben anderem Block | B11 |
| 3.10 Schnelles Einfügen mehrerer Bilder | B41 |
| 3.11 Undo nach Absatz-Teilung | B12 |
| 3.12 Tippen unmittelbar nach Einfügen | B15 |
| 3.13 EXIF-Orientierung | (dokumentiert, min. B44-nah; kein Auto-Test — jsdom/Playwright dekodieren EXIF nicht zuverlässig; als bekannte Grenze in 8) |
| 3.14 Transparenz/GIF | B44 |
| 3.15 Externe URL nicht exportierbar | B45 |

### 5.3 Anforderung 5.1 (Rundreise-Szenarien 1–12) → Testfall(e)

| 5.1 | Testfall(e) |
|---|---|
| 1. DOCX Editor-Erzeugung | B25 |
| 2. ODT Editor-Erzeugung | B26 |
| 3. DOCX-Fremddatei | B46, B48 |
| 4. ODT-Fremddatei | B47, B49 |
| 5. Cross-Format DOCX → ODT | B32, X1 |
| 6. Cross-Format ODT → DOCX | B33, X2 |
| 7. Doppelte Rundreise | B34, X3 |
| 8. Bild in Zelle/Listenpunkt/Kopf-Fußzeile | B8, D5, D6, O5, B46 |
| 9. Mehrere Bilder | B28, D4, D6 |
| 10. Bild löschen, dann exportieren | B27 |
| 11. Unabhängige DOCX-Validierung | B29, D4 |
| 12. Unabhängige ODT-Validierung (mit Größe) | B30, B31, O3 |

### 5.4 `bild-einfuegen-code.md` Fehlerliste (F1–F17) → Testfall(e)

| # | Befund | Testfall(e) |
|---|---|---|
| F1 | `insertImage` setzt nie Maße | CI14, D1–D2, O1/O4, B21–B24 |
| F2 | `<label>` statt `<button>`, kein Label/Icon | B35–B38 |
| F3 | Keine Byte-Signatur-Prüfung | B16–B18, IV1–IV4 |
| F4 | Keine Größenobergrenze | B42, B43, IV8 |
| F5 | DOCX-Reader liest `wp:extent` nicht | D1, D3, B21, B25, B46 |
| F6 | ODT-Reader liest `svg:width/height` nicht | O1, O2, B22, B26, B47 |
| F7 | Zwei nicht umrechenbare Ersatzgrößen | D2, O4 |
| F8 | ODT-Writer schreibt `px` | O3, B31 |
| F9 | Keine `.ProseMirror-selectednode`-Regel | *(Slug `bild-loeschen`; hier nur Randbedingung von B27 — kein eigener Fall, siehe 8)* |
| F10 | Schema `validate` fehlt | *(indirekt über IV/CI; reine Härtung ohne beobachtbares Verhalten)* |
| F11 | Kein Unit-Test für `insertImage` | CI1–CI14 |
| F12 | Keine E2E-Tests | gesamter Abschnitt 4 |
| F13 | Keine Maß-Assertions im Roundtrip | D1, O1 |
| F14 | Keine realen Fixtures eingebunden | EF1–EF2, B46–B49 |
| F15 | Feste `wp:docPr/@id` ⇒ ID-Kollision | D4, B29 |
| F16 | Alt-Text aus `@name` statt `@descr` | *(dokumentiert; optionaler Reader-Fix, Unit-Zusatz zu D-Reihe möglich — siehe 8)* |
| F17 | `.emf`/`.wmf`/`.tiff` ⇒ leeres Bild | *(dokumentiert; Zusatz-Unit-Fall bei Bedarf — siehe 8)* |

---

## 6. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `bild-einfuegen-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (belegter Bug/Lücke) | CI14, IV1–IV9, U1–U7, D1–D4, O1–O4, EF1, X1–X3, B16–B18, B21–B24, B31, B38; Größenanteil von B25/B26/B32–B34/B46/B47; ID-Anteil von B29 | F1/F3/F4/F5/F6/F7/F8/F13/F14/F15 |
| **Erwartet GRÜN** (sollte heute schon bestehen) | CI1–CI13, D7, EF2, D5/D6/O5/O6 (Struktur), B1–B14, B19, B20, B27–B30 (Struktur/Position), B35 (Lückennachweis), B39–B41, B44 | laut Code-Analyse 1.6/1.7 korrektes, bislang **ungetestetes** Verhalten |
| **Blockiert** | B36, B37 (F2), B43 (F4/Grenzwert), B46–B49 (0.2/Beschaffung), IV9 (Formatliste-Freigabe) | siehe 7/8 |
| **Ausgang offen / dokumentationspflichtig** | B6 (Bild in Überschrift), B15 (Selektion nach Einfügen), B42 (Timing), B45 (externe URL) | Ist-Verhalten durch Ausführung ermitteln, bevor „akzeptiert"/„abgelehnt" behauptet wird |

Sobald `bild-einfuegen-code.md` Abschnitt 4 (F1–F8/F15) umgesetzt ist, müssen **alle**
„erwartet ROT" auf GRÜN wechseln — der maschinell prüfbare Nachweis, dass die Fixes
wirken.

---

## 7. Ausführungsreihenfolge

1. **Fixture-Sichtung (0.2)** — Messwerte der benannten Kandidaten bestätigen; Ergebnis in 8 nachtragen. Blockiert EF1/EF2/B46–B49.
2. **CI1–CI14, IV1–IV9, U1–U7** (3.2–3.4) — schnellster, formatunabhängiger Nachweis von F1/F3/F4; CI1–CI13 grün, Rest bewusst rot.
3. **D1–D7, O1–O6, X1–X3** (3.5–3.7) — Reader/Writer-Rundreise, inkl. **vor** dem Fix nachweislich roter Regressionen für F5/F6/F8/F15.
4. **`external-fixtures.test.ts`** (EF1–EF2) — abhängig von 1.
5. **`tests/e2e/images.spec.ts` 4.2–4.5** (B1–B20) — Grundbedienung, Tippen-nach-Einfügen, Formatprüfung. **Determinismus (Abschnitt 2) beim Schreiben zwingend anwenden.**
6. **`tests/e2e/images.spec.ts` 4.6–4.11** (B21–B49) — Größe/Verhältnis, Rundreise, Toolbar, reale Fixtures.
7. **`selection-regression.spec.ts`** um B39/B40 ergänzen.
8. Nach Umsetzung von `bild-einfuegen-code.md` Abschnitt 4: alle „ROT erwartet" erneut ausführen, Statuswechsel dokumentieren; die bestehenden `selection-regression.spec.ts`/`cut.spec.ts`-Tests **vollständig** erneut laufen lassen (Regression).
9. Traceability (5) und DoD-Abgleich (Abschnitt 6 unten) final gegenprüfen, bevor der Backlog-Status auf „verifiziert" gesetzt wird.

---

## 8. Offene Punkte für QA

- **Fixture-Sichtung (0.2)** ist die zentrale Vorbedingung für B46/B47/EF1 und
  DoD-Punkt 8. Die Kandidaten sind aus `bild-einfuegen-code.md` 5.3 benannt; zu
  bestätigen sind nur die gemessenen Größen (ein `unzip`-Wegwerf-Skript genügt).
- **Externe Beschaffung (B48/B49)** ist kein automatisierbarer Schritt; **entfällt
  ggf.**, falls die vorhandenen Korpora die Cross-Format-Fälle (5.1.5/5.1.6) bereits
  abdecken — nach 0.2 entscheiden, nicht vorher annehmen.
- **Formatliste/Obergrenze (IV9, B43)** — abhängig von den offenen Entscheidungen
  im Code-Plan Abschnitt 9 (PNG/JPEG/GIF/WebP/BMP, `MAX_IMAGE_BYTES = 20 MB`). Erst
  nach Freigabe exakt formulieren.
- **B6 (Bild in Überschrift)** und **B15 (Selektion nach Einfügen)** — jeweils
  Produktentscheidung (Code-Plan 9.3): Überschrift teilen vs. Bild herausschieben;
  Textcursor hinter Bild vs. Bild markiert lassen. Der Test läuft so oder so; die
  **Assertion** wird erst nach der Entscheidung endgültig fixiert (Ausgang zunächst
  protokollieren, siehe CI7/B6).
- **F9 (`.ProseMirror-selectednode`)** wird hier bewusst **nicht** mit eigenem Fall
  geführt — gehört zum Slug `bild-loeschen`. B27 prüft nur das Lösch-**Ergebnis** im
  Export, nicht die visuelle Selektions-Rückmeldung. QA-seitig bei Freigabe
  bestätigen, dass diese Abgrenzung akzeptiert wird.
- **F16 (`@descr`-Alt-Text)** und **F17 (`.emf`/`.wmf`/`.tiff`)** — im Code-Plan als
  „dokumentiert"/optional eingestuft. Falls als Fix umgesetzt: je ein Unit-Zusatzfall
  in der D-Reihe (Reader liest `@descr` bevorzugt) bzw. ein Fremd-Endungs-Fall
  (nicht darstellbares Format ⇒ Platzhalter statt leerem `<img>`); sonst als bekannte
  Grenze festhalten.
- **B42 (Großdatei-Timing)** — projektweit konsistenten Schwellenwert für „kein
  spürbares Einfrieren" mit anderen QA-Plänen abgleichen (z. B.
  `datei-oeffnen-qa.md`), statt einen neuen Platzhalter einzuführen.
- **3.13 (EXIF-Orientierung)** — als bekannte Automatisierungsgrenze festhalten:
  headless Chromium/WebKit und jsdom liefern über `naturalWidth/naturalHeight` die
  ungedrehten Maße; ein zuverlässiger automatisierter Verzerrungs-Nachweis ist nicht
  gegeben. Mindestforderung (kein Absturz, kein Hochkant-Quer-Tausch) manuell prüfen.
- **Determinismus-Review (Abschnitt 2)** — beim Code-Review von `images.spec.ts`
  aktiv gegenprüfen: jede Sequenz „Cursor bewegen → Upload/Enter" trägt den 50-ms-
  Sync-Wait, jede Shift-Arrow-Serie ein `delay`, jeder „ein Undo-Schritt"-Test den
  600-ms-Settle, jede Bild-abhängige Folgeaktion ein vorheriges
  `toBeVisible()`. Fixe Timeouts **nur** an diesen Stellen, nie als Assertion-Ersatz.

---

## 9. Abgleich mit der Definition of Done (`bild-einfuegen-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung |
|---|---|
| 1. Kernfall (3.2/2.1.3) für **alle** Cursor-Positionen per echtem Browser-Test | B1–B6, CI1–CI8 |
| 2. Größe-Rundreise (3.5/3.4) behoben, Unit **und** E2E abgesichert | D1/D3/O1/O2 + B21–B26, B46/B47 |
| 3. Alle 12 Rundreise-Szenarien (5.1) grün, inkl. unabhängiger Validierungen + Szenario 8 | 5.3-Matrix; B29/B30/B31, B8/D5/D6/O5 |
| 4. Mehrere Bilder: eindeutige `wp:docPr/@id`; Mehr-/Identisch-Bilder positionsrichtig | D4, B29, D7, B28 |
| 5. Formatprüfung (Byte-Signatur), Fehlermeldung, keine unhandled Rejection | B16–B18, IV1–IV4 (+ `assertNoConsoleErrors`) |
| 6. Selektion nach Einfügen (2.1.4/3.12) | B15 |
| 7. Selection-Sync-Regression mit Bild dauerhaft in der Suite | B39, B40 |
| 8. Bedienelement: `<button>` + `title`/`aria-label`, tastaturerreichbar, SVG-Icon; `.selectednode`-Markierung | B35–B38 (`.selectednode` via Slug `bild-loeschen`) |
| 9. Robustheit: Großdatei, externe URL, EXIF, Transparenz/GIF | B42/B43, B45, 3.13 (manuell), B44 |
| 10. Dieselbe-Datei-zweimal + Dialog-Abbruch abgesichert | B20, B19 |
| 8b (Fixtures Word **und** LibreOffice) | B46–B49 — abhängig von 0.2 |

Andernfalls ist der Backlog-Status auf **teilweise** zu setzen und die konkret
offenen Teilpunkte hier nachzutragen.
