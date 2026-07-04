# QA-Testplan: „Alles auswählen“ (Select All)

Bezug: `specs/alles-auswaehlen-req.md` (Anforderung), `specs/alles-auswaehlen-code.md`
(Umsetzungsplan). Code-Stand geprüft am 2026-07-04 in `E:\docs` (kein Git-Repo). Dieser Plan
legt fest, **welche Tests geschrieben werden, in welcher Datei, mit welchem konkreten
Ablauf**, damit der Backlog-Status `alles-auswaehlen` von „nicht vertrauenswürdig“ auf
„verifiziert“ gehoben werden darf (Anforderung Abschnitt 8, Punkt 5).

Rolle dieses Dokuments gegenüber `alles-auswaehlen-code.md`: Der Code-Plan sagt, *dass* keine
Anwendungslogik geändert werden muss und *welche* Testdateien entstehen sollen. Dieser
QA-Plan geht eine Ebene tiefer: konkrete Testfälle, konkrete Selektoren/API-Aufrufe,
konkrete Prüfungen an der heruntergeladenen Datei, eine vollständige Rückverfolgbarkeits-
Matrix und die Abgrenzung „was zählt als echter Beweis“ vs. „was nur ein Codeverweis ist“.

**Nicht verhandelbare Leitlinie für diesen Plan:** Kein Testfall gilt als erfüllt, nur weil
er einen internen Befehl (`selectAll(state, dispatch)`, `commands.ts`-Funktionen) isoliert
aufruft. Jeder in Teil B beschriebene Test **muss** über echte Playwright-Browserinteraktion
laufen (`page.keyboard`, `page.mouse`/`.click()`, `input[type=file].setInputFiles()`,
`page.waitForEvent('download')`) und, wo eine Datei entsteht, die **tatsächlich
heruntergeladene Datei** mit `JSZip` inspizieren — exakt wie es die bestehenden Dateien
`tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` und `tests/e2e/selection-regression.spec.ts`
bereits vormachen.

---

## 1. Teststrategie-Überblick

| Ebene | Werkzeug | Was wird bewiesen | Datei(en) |
|---|---|---|---|
| A1 — Reader/Writer-Rundreise (Unit) | Vitest, `jsdom`-frei (reine Objekt-/Blob-Verarbeitung) | Eine Dokumentstruktur, wie sie nach einer „Alles auswählen“-Aktion entsteht (einheitliche Formatierung über *alle* Blöcke inkl. erstem/letztem, Tabellenzellen, Listen, Bilder; vollständig geleertes Dokument), übersteht Schreiben+Lesen für **beide** Formate verlustfrei | `src/formats/docx/__tests__/select-all-roundtrip.test.ts` (neu), `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (neu) |
| A2 — Editor-Zustand (Unit) | Vitest, `EditorState.create` direkt | Die Bibliotheksgarantien hinter `AllSelection` (Idempotenz, Undo-Neutralität, valides Restdokument nach Löschen, kein Absturz bei reiner Bild-Node) sind auf State-Ebene nachweisbar, unabhängig vom Browser | `src/formats/shared/editor/__tests__/select-all.test.ts` (neu) |
| B1 — Kernverhalten (E2E, echter Browser) | Playwright, `.ProseMirror`-Locator, `page.keyboard` | Strg+A/Cmd+A markiert wirklich alles, in jedem Grenzfall aus Anforderung Abschnitt 3, auf allen drei konfigurierten Projekten | `tests/e2e/select-all.spec.ts` (neu) |
| B2 — Datei-Rundreise (E2E, echter Browser + echte Datei) | Playwright + `JSZip` auf der **heruntergeladenen** Datei | Eine mit Strg+A als Zwischenschritt durchgeführte Aktion überlebt Export → Re-Import unverändert, für DOCX und ODT | `tests/e2e/select-all-roundtrip.spec.ts` (neu) |
| B3 — Regressions-Pflichttests (E2E, echter Browser) | Playwright, bestehendes Muster erweitert | Die 3 bestehenden Selection-Sync-Regressionstests bleiben grün; 2 neue Varianten (Ausschneiden/Kopieren statt Fett) kommen hinzu | `tests/e2e/selection-regression.spec.ts` (erweitert, 3 bestehende Tests unverändert + 2 neue) |
| B4 — Visueller Kontrast (E2E, Screenshot) | Playwright `toHaveScreenshot` | Selektionshintergrund ist in Light **und** Dark Mode lesbar | `tests/e2e/select-all.spec.ts` (Abschnitt 4.5 unten) |

Gewichtung: Teil A ist schnell und deterministisch, beweist aber **nicht**, dass ein Nutzer im
Browser per Strg+A tatsächlich zu diesem Dokumentzustand kommt — dafür ist Teil B zuständig.
Beide Teile sind Pflicht; keiner ersetzt den anderen (siehe Anforderung Abschnitt 6, Einleitung:
„echte Browser-Interaktion … keine isolierten Command-Aufrufe“).

---

## 2. Testinfrastruktur / Voraussetzungen

Neu anzulegen, bevor die Testdateien selbst geschrieben werden:

1. **`tests/e2e/helpers/consoleErrors.ts`** (neu) — gemeinsamer Helper für alle Grenzfall-Tests,
   die „keine Konsolen-Exception“ verifizieren müssen (Grenzfälle 1, 8, 9):
   ```ts
   import type { Page } from '@playwright/test'

   export function collectPageErrors(page: Page): Error[] {
     const errors: Error[] = []
     page.on('pageerror', (err) => errors.push(err))
     page.on('console', (msg) => {
       if (msg.type() === 'error') errors.push(new Error(msg.text()))
     })
     return errors
   }
   ```
   Wird sowohl von `select-all.spec.ts` als auch — sobald umgesetzt — von den analogen
   Ausschneiden/Kopieren-Testplänen importiert, statt dupliziert (siehe
   `alles-auswaehlen-code.md` Abschnitt 9.1, Schlusshinweis).
2. **Eine kleine Test-PNG-Datei als Buffer** für den Bild-Testfall (B1-5) — analog zur
   `TINY_PNG`-Base64-Konstante in `src/formats/docx/__tests__/roundtrip.test.ts` /
   `src/formats/odt/__tests__/roundtrip.test.ts`, aber als echter Upload über
   `input[type=file].setInputFiles({ name, mimeType: 'image/png', buffer })` — **nicht** als
   direkter `insertImage(dataUrl)`-Aufruf, weil `Toolbar.tsx::handleImagePick` (Zeilen 97–108)
   den Weg über `FileReader.readAsDataURL(file)` nimmt und genau dieser Weg getestet werden muss.
3. **Wiederverwendung der bestehenden `docxCard`/`odtCard`-Locator-Helper** (siehe
   `tests/e2e/docx.spec.ts` Zeile 50, `tests/e2e/odt.spec.ts` Zeile 34,
   `tests/e2e/selection-regression.spec.ts` Zeile 3) — keine dritte, abweichende Definition.
4. **Wiederverwendung von `doc()`/`paragraph()`** aus dem bestehenden Muster in
   `src/formats/docx/__tests__/roundtrip.test.ts` / `.../odt/__tests__/roundtrip.test.ts` für
   Teil A — gleiche Helper-Funktionen, nicht neu erfunden, damit die neuen Rundreise-Unit-Tests
   optisch/strukturell zu den bestehenden gehören.

---

## 3. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 3.1 Zweck und bewusste Abgrenzung

„Alles auswählen“ selbst schreibt keine Datei (siehe Anforderung, einleitender Satz von
Abschnitt 4). Diese Unit-Tests prüfen deshalb **nicht** die Selektion selbst (das ist Teil A2/B),
sondern die Reader/Writer-Vertragssicherheit für genau die Dokumentformen, die als **Ergebnis**
einer „Strg+A + Aktion“-Sequenz entstehen:

- einheitliche Formatierung über **jeden** Block hinweg, insbesondere den **ersten und den
  letzten** (Anforderung 4.2, Testfall 1/2 — Risiko: eine Off-by-one-Regel im Writer, die den
  ersten oder letzten Block vergisst, wäre sonst unentdeckt),
- eine Tabelle, deren **gesamter** Zellinhalt (nicht nur eine Zelle) eine Formatierung trägt,
  inkl. `colspan`/`rowspan` (Testfall 5),
- eine per Strg+A + Entf/Ausschneiden vollständig geleerte Dokumentstruktur (Testfall 3),
- eine per Strg+A + Kopieren in ein neues Dokument übertragene Vollstruktur mit Listen,
  Tabellen und Bildern (Testfall 4).

Diese Ebene ist **schnell und deterministisch**, ersetzt aber nicht den Nachweis, dass der
Editor im Browser tatsächlich zu genau dieser Struktur kommt (das leistet Teil B).

### 3.2 `src/formats/docx/__tests__/select-all-roundtrip.test.ts` (neu)

Gleiches Grundgerüst wie `src/formats/docx/__tests__/roundtrip.test.ts`
(`import { writeDocx } from '../writer'`, `import { readDocx } from '../reader'`,
`doc()`/`paragraph()`-Helper wiederverwendet/übernommen).

| ID | Testfall | Aufbau | Prüfung |
|---|---|---|---|
| UT-D1 | Einheitliche Formatierung über **alle** Blöcke (Req 4.2 #1) | `doc([paragraph('Erster', 'left', [{type:'strong'}]), heading(1,'Mitte',[{type:'strong'}]), paragraph('Letzter', 'left', [{type:'strong'}])])` — simuliert „Strg+A → Fett“ über Absatz, Überschrift, letzten Absatz | Nach `roundTrip()`: **jeder** der drei Blöcke trägt `marks: [{type:'strong'}]` auf **jedem** Textlauf, inkl. explizit erstem und letztem Block (nicht nur `content[0]`) |
| UT-D2 | Vollständig geleertes Dokument (Req 4.2 #3) | `doc([])` bzw. `doc([paragraph('')])` — simuliert Strg+A → Entf | `roundTrip()` wirft nicht; Ergebnis hat **genau einen** leeren Absatz in `result.body.content`, kein `undefined`/`null`-Crash im Writer bei leerem `content`-Array |
| UT-D3 | Tabelle mit einheitlicher Formatierung in **allen** Zellen, inkl. `colspan`/`rowspan` (Req 4.2 #5) | Tabelle 2×2 plus eine Zelle mit `colspan: 2`, jede Zelle enthält fett formatierten Text | Nach `roundTrip()`: Zeilen-/Spaltenanzahl unverändert, `attrs.colspan`/`attrs.rowspan` erhalten (Vergleich mit bestehendem Muster aus `roundtrip.test.ts`, dort bereits für einfache Tabellen geprüft, hier zusätzlich mit **durchgehender** Formatierung in jeder Zelle), jede Zelle trägt die Formatierung |
| UT-D4 | Liste mit einheitlicher Formatierung auf **jeder** Ebene (Req 2.2: „alle Ebenen“) | Verschachtelte `bullet_list` (2 Ebenen), jeder `list_item`-Text fett | Nach `roundTrip()`: Verschachtelungstiefe unverändert, Formatierung auf beiden Ebenen erhalten |
| UT-D5 | Struktur mit Bild + Text, nach „Strg+A → Kopieren in neues Dokument“ simuliert (Req 4.2 #4) | `doc([paragraph('Vor Bild'), image(TINY_PNG), paragraph('Nach Bild', 'left', [{type:'strong'}])])` | Nach `roundTrip()`: Bild-Node vorhanden (`type === 'image'`), Text davor/danach inkl. Formatierung erhalten, Reihenfolge unverändert |
| UT-D6 | Cross-Format-Vorstufe (Req 4.2 #6/7, nur der Reader/Writer-Anteil, **nicht** die blockierte UI) | `writeOdt(original)` → `readOdt(...)` → Ergebnis erneut durch `writeDocx`/`readDocx` schleusen | Inhalt (Text, Formatierung je Block, Tabellenstruktur) bleibt nach zwei Konvertierungen inhaltlich identisch — deckt exakt den Reader/Writer-Anteil von Req-Testfall 6/7/8 ab, unabhängig vom in `alles-auswaehlen-code.md` Abschnitt 3.3 dokumentierten UI-Blocker (dieser Unit-Test braucht **keine** „Exportieren als …“-UI, weil er `writeOdt`/`readDocx` direkt verkettet) |

### 3.3 `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (neu)

Spiegelbildlich zu 3.2, mit `writeOdt`/`readOdt` aus `src/formats/odt/__tests__/roundtrip.test.ts`
als Vorlage.

| ID | Testfall | Prüfung |
|---|---|---|
| UT-O1 | Einheitliche Formatierung über alle Blöcke (Req 4.2 #2) | Wie UT-D1, aber Prüfung über `content.xml`-Struktur nach `readOdt`; `font-weight="bold"`-Automatik-Style (bzw. äquivalentes Attribut aus `styleRegistry.ts`) auf **jedem** Block |
| UT-O2 | Vollständig geleertes Dokument (Req 4.2 #3) | Wie UT-D2, ODT-Variante |
| UT-O3 | Tabelle mit `table:number-columns-spanned`/`-rows-spanned`, durchgehend formatiert (Req 4.2 #5) | Wie UT-D3, ODT-Attributnamen |
| UT-O4 | Liste, beide Ebenen formatiert | Wie UT-D4 |
| UT-O5 | Bild + Text (Req 4.2 #4) | Wie UT-D5 |
| UT-O6 | Cross-Format-Vorstufe umgekehrt (Req 4.2 #7): `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | Wie UT-D6, umgekehrte Richtung |

### 3.4 `src/formats/shared/editor/__tests__/select-all.test.ts` (neu, Vitest/jsdom)

Ergänzende State-Ebene, **kein** Datei-I/O — deckt die Bibliotheksgarantien ab, auf denen
`alles-auswaehlen-code.md` Abschnitt 2 aufbaut, direkt und browserunabhängig:

| ID | Testfall | Konkrete Prüfung |
|---|---|---|
| UT-S1 | `AllSelection` über leeres Dokument konstruierbar | `new AllSelection(state.doc)` wirft nicht bei einem Dokument mit genau einem leeren Absatz (Grenzfall 1) |
| UT-S2 | Undo-Neutralität strukturell bewiesen (Grenzfall 8) | `const tr = state.tr.setSelection(new AllSelection(state.doc)); expect(tr.steps.length).toBe(0); expect(tr.docChanged).toBe(false)` |
| UT-S3 | Valides Restdokument nach Löschen (Grenzfall 1/6) | Dokument mit 3 Absätzen → `AllSelection`, `deleteSelection`-Transaktion anwenden → Ergebnis-`doc.content.childCount === 1`, dieser eine Absatz ist leer |
| UT-S4 | Reiner Bild-Node crasht `setAlign` nicht (Grenzfall 4) | Dokument nur mit `image`-Node → `AllSelection` konstruieren → `setAlign('center')(state, () => {})` liefert `false`, wirft nicht |
| UT-S5 | Idempotenz auf State-Ebene (Grenzfall 2) | `new AllSelection(doc).eq(new AllSelection(doc))` → `true` für zwei unabhängig erzeugte Instanzen |

**Abgrenzung:** UT-S1–S5 sind bewusst als **zusätzliche**, schnelle Absicherung gedacht, nicht
als Ersatz für die entsprechenden Browsertests (B1-2/3/6/7/9 unten) — sie beweisen nur, dass die
verwendete ProseMirror-Version sich wie erwartet verhält, nicht, dass die Anwendung im Browser
tatsächlich diesen Pfad nimmt.

---

## 4. Teil B — Echte Playwright-Browser-Tests

**Grundregel für diesen gesamten Abschnitt:** Jeder Testfall unten interagiert über
`page.keyboard.press(...)`, `page.keyboard.type(...)`, `.click()`, `input[type=file]
.setInputFiles(...)` und — wo ein Export stattfindet — `page.waitForEvent('download')` mit
anschließender Inspektion der **tatsächlichen Datei** über `fs.readFile` + `JSZip`. Kein
Testfall ruft `commands.ts`-Funktionen, `selectAll()` oder ProseMirror-APIs direkt aus dem
Testcode auf.

### 4.1 `tests/e2e/select-all.spec.ts` (neu)

Grundgerüst: `test.describe.configure({ mode: 'parallel' })` optional; `beforeEach` öffnet die
App, akzeptiert den Datenschutz-Hinweis (`getByRole('button', { name: /verstanden/i })`) und
erstellt ein neues ODT- **oder** DOCX-Dokument je nach Testfall (beide Formate über denselben
gemeinsamen Editor, siehe Anforderung Einleitung — mindestens die Kernfälle B1-1 bis B1-4
werden für **beide** Karten (`docxCard`/`odtCard`) parametrisiert ausgeführt, `test.each`/
Schleife über beide Locator-Helper).

| ID | Req-Bezug | Ablauf (echte Interaktion) | Prüfung |
|---|---|---|---|
| B1-1 | Testfall 1, Grenzfall 6 | `editor.click()`; `page.keyboard.type('Erster Absatz.\n\nZweiter Absatz.\n\nDritter Absatz.')`; `page.keyboard.press('ControlOrMeta+a')`; `page.keyboard.press('Delete')` | `expect(page.locator('.ProseMirror p')).toHaveCount(1)`; `expect(editor).toHaveText('')` |
| B1-2 | Grenzfall 1 | Frisches Dokument (nur leerer Absatz); `errors = collectPageErrors(page)`; `editor.click()`; `page.keyboard.press('ControlOrMeta+a')`; danach `page.keyboard.type('Text nach leer')` | `expect(errors).toHaveLength(0)`; `expect(editor).toContainText('Text nach leer')` |
| B1-3 | Grenzfall 2 | Text eintippen; `ControlOrMeta+a` zweimal hintereinander (kein Zwischenschritt); danach `Delete` | Kein `pageerror`; `.ProseMirror p` Anzahl = 1, leer (identisches Ergebnis wie B1-1 — beweist, dass das zweite Strg+A nichts zusätzlich/anders bewirkt) |
| B1-4 | Grenzfall 3, Frage 2 = (a) | `getByRole('button', { name: 'Tabelle einfügen' }).click()`; Text in zwei Zellen tippen; Cursor in eine Zelle klicken; `ControlOrMeta+a`; `Delete` | `expect(page.locator('.ProseMirror table')).toHaveCount(0)`; `expect(page.locator('.ProseMirror p')).toHaveCount(1)` — bestätigt „sofort ganzes Dokument“ als tatsächliches, beobachtetes Verhalten |
| B1-5 | Grenzfall 4 | Datei-Upload eines echten PNG über `label:has-text("🖼 Bild") input[type=file]`.`setInputFiles(...)`; Text davor/danach tippen; `ControlOrMeta+a`; `getByTitle('Ausrichtung: center')` bzw. `getByTitle('Ausrichtung: center')`-Äquivalent (title-Attribut `Ausrichtung: center`) klicken | Kein `pageerror`; `.ProseMirror img` Anzahl unverändert (=1); Text-Absätze haben `text-align: center` (per `expect(locator).toHaveCSS('text-align','center')`) |
| B1-6 | Grenzfall 5 | Text tippen; `ControlOrMeta+a`; neuen Text tippen (`'Komplett neu.'`) | `expect(editor).toHaveText('Komplett neu.')`; `.ProseMirror p` Anzahl = 1 |
| B1-7 | Grenzfall 8 | `page.keyboard.type('A-Absatz')`; `Enter`; `page.keyboard.type('B-Absatz')`; `ControlOrMeta+a` (reine Selektion, kein Folge-Dispatch); `ControlOrMeta+z` | Ergebnis entspricht dem Zustand **vor** der letzten inhaltlichen Eingabe (der zuletzt getippte Textteil wird rückgängig gemacht), **nicht** „nichts passiert“ — konkret per `expect(editor).not.toContainText('B-Absatz')` oder äquivalent je nach Undo-Granularität, zusammen mit `expect(editor).toContainText('A-Absatz')` |
| B1-8 | Grenzfall 9 (IME, näherungsweise) | `editor.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionstart')))`; `page.keyboard.press('ControlOrMeta+a')`; `editor.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend')))` | Kein `pageerror`; Editor bleibt danach tippbar (`page.keyboard.type('ok')` erscheint im Editor) — **dokumentierter Hinweis im Test:** simuliert reale IME-Interaktion nur näherungsweise, echte OS-IME ist mit Playwright nicht auslösbar |
| B1-9 | Grenzfall 10 | `page.getByLabel('Textfarbe').focus()` (Color-Input der Toolbar); `page.keyboard.press('ControlOrMeta+a')` | `.ProseMirror`-Inhalt bleibt exakt wie vor dem Tastendruck (kein editor-weiter Select-All-Effekt); optional: Editor-Selektion bleibt unverändert, geprüft indem direkt danach `Delete` gedrückt wird und der Editor-Inhalt **erhalten** bleibt |
| B1-10 | Grenzfall 11, Anforderung 2.3 letzter Punkt | Schleife: 300× `page.keyboard.type('Zeile.'); page.keyboard.press('Enter')` (oder schnellerer Bulk-Insert über wiederholtes Einfügen, falls Testlaufzeit kritisch wird); Zeitmessung `const t0 = Date.now(); await page.keyboard.press('ControlOrMeta+a'); const dt = Date.now() - t0` | `expect(dt).toBeLessThan(500)`; danach `Delete` → `.ProseMirror p` Anzahl = 1 (Beweis: Markierung reichte bis zum Dokumentende, nicht nur sichtbarer Ausschnitt) |
| B1-11 | Req-Testfall 3, Grenzfall 16 | `editor.evaluate(el => { const ev = new MouseEvent('contextmenu', {bubbles:true, cancelable:true}); el.dispatchEvent(ev); return ev.defaultPrevented })` | `expect(prevented).toBe(false)` — kein App-Handler unterdrückt das native Kontextmenü |
| B1-12 | Req-Testfall 12 (Matrix) | Kein eigener Testcode — B1-1 bis B1-3 laufen automatisch auf allen drei `playwright.config.ts`-Projekten (`Desktop Chrome`, `Mobile`/Pixel 7, `Tablet`/iPad Mini, WebKit-Engine) | Alle drei Projekte grün; Kommentar im Testfile verweist auf die Einschränkung zum nativen Mobile-Auswahl-Popup (siehe Abschnitt 4.6) |
| B1-13 | Anforderung 2.4 (Cursor-Kollaps) | Mehrere Absätze tippen; `ControlOrMeta+a`; `ArrowLeft`; `page.keyboard.type('X')` | `X` erscheint am **Anfang** des Dokuments; separat (neuer Testlauf): `ArrowRight` statt `ArrowLeft` → `X` erscheint am **Ende** |

Beispiel-Code für B1-4 (Tabellen-Grenzfall, konkret ausformuliert als Referenz für die
Implementierung):
```ts
test('select-all inside a table cell selects the whole document, not just the cell', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Zelle A')
  await cells.nth(1).click()
  await page.keyboard.type('Zelle B')

  await cells.nth(0).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')

  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor).toHaveText('')
})
```

### 4.2 `tests/e2e/select-all-roundtrip.spec.ts` (neu)

Grundgerüst identisch zu `tests/e2e/docx.spec.ts`/`tests/e2e/odt.spec.ts`: echter Datei-Upload
bzw. „Neu erstellen“, echte Tastatur-/Klick-Interaktion, echter Export über
`page.getByRole('button', { name: 'Exportieren' }).click()` **nach** `page.waitForEvent(
'download')`, danach `download.path()` → `fs.readFile` → `JSZip.loadAsync` → Inhalt der
**tatsächlich heruntergeladenen Datei** prüfen. Für **beide** Formate parametrisiert (DOCX:
`word/document.xml`; ODT: `content.xml`).

| ID | Req-Bezug | Ablauf | Prüfung an der heruntergeladenen Datei |
|---|---|---|---|
| RT-1 | 4.2 #1 (DOCX) | Neues DOCX-Dokument; 3 Absätze tippen; `ControlOrMeta+a`; `getByTitle('Fett').click()`; Export | `zip.file('word/document.xml')` enthält für **jeden** der drei Absätze einen `<w:r>` mit `<w:b/>` — explizit erster **und** letzter Absatz per String-Suche/Regex geprüft, nicht nur „irgendwo `<w:b/>`“ |
| RT-2 | 4.2 #2 (ODT) | Wie RT-1, ODT-Karte, Export | `content.xml` enthält für jeden Absatz einen Verweis auf einen Style mit `fo:font-weight="bold"` |
| RT-3 | 4.2 #3 (beide Formate) | `ControlOrMeta+a`; `Delete`; Export als DOCX, danach (separater Testfall) Export als ODT | Export erzeugt eine ladbare Zip-Datei; `word/document.xml` bzw. `content.xml` enthält genau einen leeren Absatz-Tag, kein Parserfehler beim erneuten `JSZip.loadAsync` |
| RT-4 | 4.2 #4 (Kopieren in neues Dokument) | Dokument mit Formatierung/Liste/Tabelle/Bild erzeugen; `ControlOrMeta+a`; `ControlOrMeta+c`; zweite Karte „Neu erstellen“ klicken (zweites, leeres Dokument im selben Browserkontext); dort `ControlOrMeta+v`; Export beider Formate | Struktur (Fett-Marker, Listenelemente, Tabellenzeilen, Bild-Relationship/`office:binary-data`) im Export des **neuen** Dokuments vorhanden. Nutzt `context.grantPermissions(['clipboard-read','clipboard-write'])`, nur auf `Desktop Chrome` verlässlich (WebKit/Firefox-Clipboard-Permissions abweichend — als bekannte Einschränkung im Test kommentiert) |
| RT-5 | 4.2 #5 (Tabelle) | Tabelle mit Inhalt in mind. 2 Zeilen/Spalten, eine Zelle mit `colspan`; Cursor in Zelle; `ControlOrMeta+a`; Fett; Export | Zeilen-/Spaltenanzahl in der exportierten Datei unverändert, `w:gridSpan`/`table:number-columns-spanned` erhalten, `<w:b/>`/`fo:font-weight="bold"` auch innerhalb der Zellen vorhanden |
| RT-6 | 4.2 #6 (Cross-Format DOCX→ODT) | — | `test.fixme(true, 'Blockiert durch fehlende "Exportieren als …"-UI, siehe alles-auswaehlen-code.md Abschnitt 3.3 (identischer Blocker wie kopieren-code.md §3.4 / ausschneiden-code.md §3.5).')` |
| RT-7 | 4.2 #7 (Cross-Format ODT→DOCX) | — | `test.fixme(...)`, gleicher Verweis |
| RT-8 | 4.2 #8 (doppelte Rundreise mit Formatwechsel) | — | `test.fixme(...)`, gleicher Verweis |
| RT-9 | 4.2 #9 (Regressionskette + Export) | Sequenz aus `selection-regression.spec.ts` Test 1 (Strg+A → Fett → Klick → Enter → Tippen) **zusätzlich** gefolgt von Export als DOCX **und** ODT | Nach `JSZip.loadAsync` der jeweils heruntergeladenen Datei: **beide** Absätze aus der Regressionssequenz (`'Hallo, das ist ein Test.'` und `'Zweiter Absatz.'`) sind im exportierten Text vorhanden — einziger Testfall, der die bestehende Selection-Sync-Fixlogik mit einer echten Datei-Rundreise verkettet |

Beispiel-Code für RT-1 (Referenzimplementierung für „jeder Block, inkl. erster/letzter“):
```ts
test('select-all + bold applies to every paragraph, exported DOCX proves it', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Mittlerer Absatz.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Letzter Absatz.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  for (const text of ['Erster Absatz.', 'Mittlerer Absatz.', 'Letzter Absatz.']) {
    const runIndex = documentXml.indexOf(text)
    expect(runIndex).toBeGreaterThan(-1)
    // Look backwards from the run for the enclosing <w:r> to confirm <w:b/> is present on it.
    const runStart = documentXml.lastIndexOf('<w:r>', runIndex)
    const runEnd = documentXml.indexOf('</w:r>', runIndex)
    const runXml = documentXml.slice(runStart, runEnd)
    expect(runXml).toContain('<w:b/>')
  }
})
```

### 4.3 `tests/e2e/selection-regression.spec.ts` (erweitert, bestehende 3 Tests unverändert)

**Pflichtbedingung:** Die drei bestehenden Tests (Zeilen 14–72 im heutigen Stand) bleiben
**wortgleich unverändert** und müssen weiterhin grün laufen (Anforderung Abschnitt 2.6/8,
Punkt 5). Neu ergänzt:

| ID | Req-Bezug | Ablauf | Prüfung |
|---|---|---|---|
| REG-4 | Abschnitt 2.6, letzter Punkt (Ausschneiden statt Fett) | Text tippen; `ControlOrMeta+a`; `ControlOrMeta+x`; Editor ist leer; `editor.click()`; `Enter`; `page.keyboard.type('Zweiter Absatz.')` | `expect(editor).toHaveText('Zweiter Absatz.')` — kein Rest des ausgeschnittenen Textes taucht wieder auf, keine Exception |
| REG-5 | Abschnitt 2.6, letzter Punkt (Kopieren statt Fett) | Text tippen; `ControlOrMeta+a`; `ControlOrMeta+c` (löst nie `dispatch` aus); `editor.click()`; `End`; `Enter`; `page.keyboard.type('Zweiter Absatz.')` | `expect(editor).toContainText('Hallo, das ist ein Test.')`; `expect(editor).toContainText('Zweiter Absatz.')`; `.ProseMirror p` Anzahl = 2 |

### 4.4 Visueller Kontrast-Check (Req-Testfall 14) — Teil von `select-all.spec.ts`

```ts
for (const scheme of ['light', 'dark'] as const) {
  test(`select-all selection background stays readable in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    // ... Dokument mit Text füllen ...
    await page.keyboard.press('ControlOrMeta+a')
    await expect(page.locator('.ProseMirror')).toHaveScreenshot(`select-all-${scheme}.png`)
  })
}
```
Baseline-Screenshots werden beim ersten Lauf erzeugt und **bewusst geprüft** (nicht blind
akzeptiert) — erwarteter Ausgang laut `alles-auswaehlen-code.md` Abschnitt 0, Fund 4: kaum
Unterschied zwischen Light/Dark, weil die editierbare Seite unabhängig vom Theme weiß bleibt.

### 4.5 Geräte-/Browser-Matrix und dokumentierte Lücken

| Projekt (`playwright.config.ts`) | Engine | Deckt ab | Bekannte Lücke |
|---|---|---|---|
| `Desktop Chrome` | Chromium | Alle B1-/RT-/REG-Tests | — |
| `Mobile` (Pixel 7) | Chromium (touch-emuliert) | B1-1–B1-3, B1-12 | Natives Touch-Auswahlpopup selbst ist Browser-/OS-Chrome, nicht durch Playwright anklickbar — Test verifiziert nur den zugrunde liegenden `ControlOrMeta+a`-Pfad, dokumentiert als Näherung (siehe `alles-auswaehlen-code.md` Abschnitt 8) |
| `Tablet` (iPad Mini) | **WebKit** | Alle B1-Tests inkl. B1-12; deckt WebKit-Codepfad von `selectAll`/`AllSelection` ab | Läuft touch-emuliert, **kein** echter macOS-Desktop-Test mit echter Cmd-Taste |
| — (nicht vorhanden) | Desktop Safari/macOS | — | **Offener Punkt**, solange kein `Desktop Safari`-Projekt existiert (Anforderung Abschnitt 8, Frage 4); sobald ein `Desktop Safari (Clipboard)`-Projekt aus einem Schwesterticket real angelegt wird, `testMatch` um `select-all*.spec.ts` erweitern statt eigenes Projekt anzulegen |

---

## 5. Rückverfolgbarkeits-Matrix (Traceability)

| Anforderung (`alles-auswaehlen-req.md`) | Test-ID(s) |
|---|---|
| Abschnitt 1, Testfall 1 (Strg+A markiert alles) | B1-1 |
| Abschnitt 1, Testfall 2 (Cmd+A macOS) | Abgedeckt durch `ControlOrMeta+a` auf allen Projekten; echtes macOS bleibt offen (4.5) |
| Abschnitt 1, Testfall 3 (Kontextmenü) | B1-11 |
| Abschnitt 1, Testfall 4 (Mobile/Tablet) | B1-12, 4.5 |
| Grenzfall 1 (leeres Dokument) | B1-2, UT-S1 |
| Grenzfall 2 (Idempotenz) | B1-3, UT-S5 |
| Grenzfall 3 (Tabellenzelle) | B1-4, RT-5, UT-D3/UT-O3 |
| Grenzfall 4 (nur Bild) | B1-5, UT-S4, UT-D5/UT-O5 |
| Grenzfall 5 (Strg+A → Tippen) | B1-6 |
| Grenzfall 6 (Strg+A → Entf) | B1-1, UT-S3 |
| Grenzfall 7 (Pflicht-Regressionstest) | bestehende 3 Tests in `selection-regression.spec.ts` (unverändert) |
| Grenzfall 8 (Undo-Neutralität) | B1-7, UT-S2 |
| Grenzfall 9 (IME) | B1-8 |
| Grenzfall 10 (Fokus außerhalb Editor) | B1-9 |
| Grenzfall 11 (Performance großes Dokument) | B1-10 |
| Grenzfall 12 (Strg+A → Kopieren/Ausschneiden) | REG-4, REG-5, RT-4 |
| Grenzfall 16 (kein `contextmenu`-Handler) | B1-11 |
| Abschnitt 2.6 (Selection-Sync + Alles auswählen) | 3 bestehende Tests (unverändert) + REG-4/REG-5 |
| Abschnitt 4.2, Testfall 1 (DOCX Formatierung) | RT-1, UT-D1 |
| Abschnitt 4.2, Testfall 2 (ODT Formatierung) | RT-2, UT-O1 |
| Abschnitt 4.2, Testfall 3 (vollständige Löschung) | RT-3, UT-D2/UT-O2 |
| Abschnitt 4.2, Testfall 4 (Kopieren in neues Dokument) | RT-4, UT-D5/UT-O5 |
| Abschnitt 4.2, Testfall 5 (Tabelle) | RT-5, UT-D3/UT-O3 |
| Abschnitt 4.2, Testfall 6/7/8 (Cross-Format) | `test.fixme` RT-6/RT-7/RT-8 (E2E-UI blockiert); Reader/Writer-Anteil bereits durch UT-D6/UT-O6 bewiesen |
| Abschnitt 4.2, Testfall 9 (Regressionskette + Export) | RT-9 |
| Abschnitt 6, Testfall 14 (visueller Kontrast) | 4.4 |

---

## 6. Nicht-Ziele / bewusste Lücken dieses Testplans

1. **Cross-Format-Export (`test.fixme` RT-6/RT-7/RT-8):** Blockiert durch die fehlende
   „Exportieren als …“-UI (`src/app/DocumentWorkspace.tsx::handleExport`), ein bereits an
   anderer Stelle gemeldeter, produktweiter Blocker — kein neuer Fix-Vorschlag hier, um keine
   dritte, konkurrierende Lösungsbeschreibung zu erzeugen (siehe `alles-auswaehlen-code.md`
   Abschnitt 3.3).
2. **Echtes natives Mobile-Auswahlpopup** (Android/iOS „Alles auswählen“-Menüpunkt): Playwright
   kann OS-Chrome nicht ansteuern; B1-12 verifiziert nur den zugrunde liegenden Tastaturpfad.
3. **Echte IME-Komposition** (B1-8): `CompositionEvent`-Simulation ist eine Näherung, kein
   Ersatz für echte OS-IME-Eingabe.
4. **Echtes macOS/Safari mit echter Cmd-Taste:** bleibt offener Punkt bis ein
   `Desktop Safari`-Playwright-Projekt existiert (siehe 4.5).
5. **Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung** (Anforderung Abschnitt 2.5,
   offene Frage 3): liegt laut `alles-auswaehlen-code.md` Abschnitt 1 an vier anderen Tickets
   (`fett-code.md`, `kursiv-code.md`, `durchgestrichen-code.md`,
   `unterstrichen-einfach-code.md`) — hier **nicht** erneut getestet, um keine fünfte,
   abweichende Erwartung an dieselbe noch nicht kanonisierte Implementierung zu binden. Sobald
   eines dieser Tickets landet, ist **ein** zusätzlicher Regressionstest fällig: derselbe Fix
   muss auch für eine echte `AllSelection` (nicht nur `TextSelection`) korrekt greifen.
6. **Toolbar-Button „Alles auswählen“:** existiert laut Entscheidung (Anforderung/Code-Plan
   Abschnitt 8/1, Frage 1 = „Nein“) nicht — kein Test dafür vorgesehen.

---

## 7. Ausführungsreihenfolge

1. `src/formats/docx/__tests__/select-all-roundtrip.test.ts` +
   `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (Teil A1) — schnellstes Signal,
   `npm run test`.
2. `src/formats/shared/editor/__tests__/select-all.test.ts` (Teil A2) — ebenfalls `npm run test`.
3. `tests/e2e/helpers/consoleErrors.ts` anlegen (Voraussetzung für B1-2/3/8).
4. `tests/e2e/select-all.spec.ts` (Teil B1) — `npm run test:e2e -- select-all.spec.ts`.
5. `tests/e2e/selection-regression.spec.ts` erweitern (Teil B3) — **zuerst** die 3 bestehenden
   Tests unverändert laufen lassen und grün bestätigen, **danach** REG-4/REG-5 hinzufügen und
   erneut den vollen Dateilauf grün bestätigen.
6. `tests/e2e/select-all-roundtrip.spec.ts` (Teil B2) inkl. `test.fixme` für RT-6/7/8.
7. Visueller Kontrast-Check (4.4) — Baseline-Screenshots erzeugen, manuell sichten, committen.
8. Vollständiger Lauf aller drei Playwright-Projekte (`npx playwright test`) vor Abnahme.

---

## 8. Abnahmekriterien (Definition of Done dieses Testplans)

Deckungsgleich mit `alles-auswaehlen-req.md` Abschnitt 8, Punkt 5:

- [ ] Alle Testfälle aus Anforderungs-Abschnitt 1, 3 und 6 sind als automatisierte,
      dauerhaft in der Suite verbleibende Tests vorhanden und grün (siehe Matrix Abschnitt 5).
- [ ] Die drei bestehenden Selection-Sync-Regressionstests laufen unverändert weiterhin grün
      **und** wurden um REG-4 (Ausschneiden) und REG-5 (Kopieren) ergänzt.
- [ ] Rundreise-Anforderung aus Abschnitt 4 ist für DOCX und ODT nachgewiesen, wo nicht durch
      den dokumentierten Cross-Format-Blocker verhindert (RT-6/7/8 bleiben `test.fixme`, mit
      Verweis auf den Blocker, nicht kommentarlos übersprungen).
- [ ] Visueller Kontrast-Check (4.4) ist durchgeführt, Baseline-Screenshots sind geprüft und
      committet.
- [ ] Alle Tests laufen auf allen drei `playwright.config.ts`-Projekten grün; Lücken (echtes
      macOS/Cmd+A, natives Mobile-Popup, echte IME) sind in Abschnitt 6 dokumentiert, nicht
      stillschweigend als erledigt markiert.
- [ ] `npm run test` (Vitest, Teil A) und `npm run test:e2e` (Playwright, Teil B) sind beide
      Bestandteil des CI-Laufs für dieses Feature.

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status `alles-auswaehlen` auf
„verifiziert“ gesetzt werden.
