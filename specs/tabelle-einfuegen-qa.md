# Testplan (QA): Feature „Tabelle einfügen“

Bezug: `specs/tabelle-einfuegen-req.md` (Anforderung, Abschnitte 0–6), `specs/tabelle-einfuegen-code.md`
(Umsetzungsplan des Entwicklers, Abschnitte 0–10). Dieses Dokument ist der **Nachweisplan** des
QA-Agenten: Es legt fest, mit welchen konkreten, ausführbaren Tests jeder Punkt aus der Anforderung
(Bedienelemente §1, Verhalten §2, Grenzfälle §3, Rundreise §4, Testfälle §5, Abnahmekriterien §6)
nachgewiesen oder widerlegt wird. Es ändert selbst keinen Produktcode.

**Rollenteilung:** Anforderung (PO/Lead) → Umsetzungsplan (Dev) → dieser Testplan (QA) → Ausführung
gegen den tatsächlich gebauten Code → Rückmeldung an Backlog-Status. Jeder Testfall ist bewusst so
konkret (Selektoren, Dateien, exakte Assertions), dass er direkt in Code umgesetzt/ausgeführt werden
kann, ohne weitere Interpretation.

---

## 0. Ausgangslage (gegen den tatsächlichen Code neu gelesen, 2026-07-05)

Sämtliche Fundstellen unten wurden am 2026-07-05 direkt im Repo verifiziert (nicht aus der Vorfassung
übernommen). Die Vorfassung dieses Testplans enthielt an dieser Stelle **inhaltlich falsche Angaben**
zum ODT-Writer und durchgehend **verschobene Zeilennummern**; beides ist hier korrigiert. Warnung an
Folge-Agenten: Zeilennummern driften weiter — im Zweifel per Textsuche verankern (`insertTable`,
`TableNameSequence`, `tableToDocx`, `w:tblPr`).

### 0.1 Bereits korrekt und durch grüne Tests abgesichert — NUR Regressionsschutz, KEINE Neu-„Behebung“

Die Anforderung (Abschnitt 0, Punkt 2) und der Umsetzungsplan (Abschnitt 0/5.1) sind hier eindeutig:
Zwei ODT-Punkte, die eine ältere Fassung fälschlich als offene Defekte führte, sind **im aktuellen
Code bereits erledigt**. Sie dürfen **nicht** als „zu findende/zu behebende Bugs“ auftauchen — das
wäre exakt die von der Anforderung verbotene „übernommene Schwäche“.

| Punkt | Ist-Zustand jetzt (verifiziert) | Bestehender grüner Test |
|---|---|---|
| ODT-Spaltenzahl bei `colspan` | `odt/writer.ts:115-117` summiert die `colspan`-Werte der Zeile 0 korrekt auf und erzeugt exakt so viele `<table:table-column/>`. **Kein** `rows[0].content.length`. | `odt/__tests__/roundtrip.test.ts:298` — `expect((contentXml.match(/<table:table-column\/>/g) ?? []).length).toBe(2)` für eine `colspan=2`-Zelle in Zeile 0. **Bereits grün.** |
| ODT-`table:name`-Determinismus | `odt/writer.ts:54-60` Klasse `TableNameSequence` (Kommentar `:46-50` benennt die alte `Math.random()`-Implementierung als ersetzt), Aufruf `tableNames.next()` `:173`. Vergibt deterministisch „Table1“, „Table2“ … | `odt/__tests__/roundtrip.test.ts:512-529` (`describe('ODT writer: export determinism')`), Test `:529` — zwei Tabellen, byte-identischer Export zweier Läufe. **Bereits grün.** |

**QA-Regel für beide:** In diesem Plan tauchen sie ausschließlich als **Regressionsschutz** auf
(Abschnitt A.1/A.5, B.7) — Erwartung „bleibt grün“, nicht „wird von rot auf grün gebracht“. Der
korrekte Klassenname ist **`TableNameSequence`** (nicht „TableNameGenerator“).

### 0.2 Noch zu bauen bzw. noch offen (hier zwangsläufig rot gegen den heutigen Code)

| Datei | Ist-Zustand jetzt (verifiziert) | Soll (Umsetzungsplan) |
|---|---|---|
| `src/formats/shared/editor/Toolbar.tsx:279-288` | Button ruft **direkt** `run(view, insertTable(2, 2))` auf (`:284`); `aria-pressed={isInTable(view.state)}` (`:281`), kein Dialog. | Dialog statt fester 2×2 (Code §2.2/§3.3) |
| `src/formats/shared/editor/commands.ts:92` | `insertTable(rows, cols)` parametrisiert, aber **kein** Tiefen-Guard; **kein** `tableTab`. `isInTable` aus `prosemirror-tables` re-exportiert (`:3,:6`). | Tiefen-Guard + `tableTab(direction)` (Code §3.1) |
| `src/formats/shared/editor/WordEditor.tsx:77-102` | Erster `keymap({...})`-Block (`:77`) ohne `Tab`/`Shift-Tab`; `baseKeymap` (`:100`) bindet `Tab` ebenfalls nicht; `columnResizing()` (`:101`), `tableEditing()` (`:102`). | `Tab`/`Shift-Tab` an `tableTab` binden, bestehende Einträge erhalten (Code §3.2) |
| `src/formats/docx/writer.ts:160-200` | `colCount` summiert `colspan` **bereits korrekt** (`:160`), **aber** `<w:gridCol w:w="2000"/>` hartkodiert je Spalte (`:161`) und `<w:tblPr/>` **leer** (`:200`, kein `<w:tblBorders>`). | Spaltenbreiten-Verteilung + `colwidth`-Übernahme + `<w:tblBorders>` (Code §4.1) |
| `src/formats/odt/writer.ts:156` | Reale `<table:table-cell>` ohne `table:style-name` (keine Zellrahmen-Formatvorlage). | `TCBorder`-Style referenzieren (Code §5.1/5.2) |
| `src/formats/shared/editor/InsertTableDialog.tsx`, `src/formats/shared/tableConfig.ts` | **Existieren nicht.** | Neu (Code §2.1/2.2) |
| `tests/e2e/selection-regression.spec.ts:43-59` | Test „same regression inside a table cell“; klickt „Tabelle einfügen“ (`:46`) und adressiert **unmittelbar danach** `.ProseMirror td` (`:48-49`). | Muss nach Dialog-Umstellung angepasst werden (B.0) |

**Konsequenz:** Alle Testfälle, die den Dialog, Tab-Navigation, DOCX-Rahmen/Spaltenbreiten oder den
ODT-`TCBorder` voraussetzen, sind gegen den heutigen Code **erwartbar rot** — das dokumentiert exakt
den in der Anforderung als „nicht vertrauenswürdig“/„nicht funktional“ eingestuften Zustand. Dieser
Plan ist als **Zielzustand** geschrieben und dient zugleich als Abnahme-Suite, die nach jeder
Umsetzungs-Iteration erneut vollständig läuft. Abschnitt E hält die Nullmessung fest.

---

## 1. Ausführungsumgebung

| Ebene | Befehl | Bemerkung |
|---|---|---|
| Unit-/Komponententests | `npm run test` (`vitest run`) | jsdom-Umgebung; `@testing-library/react` + `@testing-library/user-event` für `InsertTableDialog` |
| Coverage (optional) | `npm run coverage` | v. a. `parseTableDimension`, `tableTab`, `columnWidthsDxa`/`collectColumnWidthsPx` |
| E2E (echter Browser) | `npm run test:e2e` (`playwright test`) | `playwright.config.ts`: `webServer` = `npm run build && npm run preview -- --port 4173`, `baseURL: 'http://localhost:4173/salamanido/'`. Standard-Projekte, in denen Tabellen-Specs laufen: **Desktop Chrome**, **Mobile** (Pixel 7, `hasTouch: true`), **Tablet** (iPad Mini) — die bestehenden Tabellen-berührenden Specs (`docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`) schränken die Projekte nicht ein, dieser Plan ebenfalls nicht. |
| E2E UI-Debug | `npm run test:e2e:ui` | manuelle Fehlersuche |

Gemeinsame Konventionen (aus den bestehenden Specs übernommen, **nicht neu erfinden**):
- Testbeginn: `await page.goto('/')` + `await page.getByRole('button', { name: /verstanden/i }).click()`
  (schließt `PrivacyModal`; vgl. `docx.spec.ts:65-66`, `odt.spec.ts`).
- Format-Karten: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
  bzw. `'OpenDocument Text (.odt)'` (vgl. `docx.spec.ts:59-61`).
- Neues Dokument: `<Karte>.getByRole('button', { name: 'Neu erstellen' }).click()`.
- Datei-Upload: `<Karte>.locator('input[type="file"]')` + `setInputFiles({ name, mimeType, buffer })`
  (natives `<input type="file">`, kein `filechooser`-Event nötig; vgl. `docx.spec.ts:96-101`). Das ist
  „echter Datei-Upload“ im Sinne der Anforderung §5.15.
- Zurück zur Auswahl (für Re-Import): **`await page.getByRole('button', { name: /formate/i }).click()`**
  (Schaltfläche „← Formate“, `DocumentWorkspace.tsx:113`). Das `<input type="file">` existiert **nur**
  auf dem Auswahlbildschirm, nicht im geöffneten Editor — daher dieser Weg statt `page.reload()`
  (etabliertes Repo-Idiom, `docx.spec.ts:241`).
- Export/Download: `const dl = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportieren' }).click(); const download = await dl; const buf = await (await import('node:fs/promises')).readFile((await download.path())!)`.
- **Unabhängiger Parser** (Anforderung §4.1.1 „z. B. python-docx oder direktes Parsen von
  `word/document.xml`“): etabliertes Projekt-Muster ist `JSZip.loadAsync(buffer)` + rohes
  XML-String-Parsen (`docx.spec.ts:87-88`, `:230-236`) — **kein** python-docx nötig, das Ziel („nicht
  die App sich selbst bestätigen lassen“) ist durch Zip-Entpacken + generisches String-Parsen erfüllt.
  Für **Zählungen** wird **nicht** `toContain` verwendet (prüft nur Vorhandensein), sondern
  `(xml.match(/<w:tr\b/g) ?? []).length` bzw. das ODT-Äquivalent.
- **Absturz-/Fehlererkennung:** In jedem E2E-Test `const pageErrors: string[] = []; page.on('pageerror', e => pageErrors.push(String(e)))` und am Ende `expect(pageErrors, pageErrors.join('\n')).toEqual([])` (Repo-Idiom, `docx.spec.ts:256-257,342`). Wo ausdrücklich „keine Konsolenfehler“ gefordert ist, zusätzlich `page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })`.

### 1.1 Determinismus-Regeln (VERPFLICHTEND für alle E2E-Tests)

Dieses Projekt hat eine **bekannte, dokumentierte asynchrone Selektions-Synchronisation**, die bei zu
schnellen, automatisierten Tastatureingaben zu Flakiness führt. Belege im Repo: `WordEditor.tsx`
(Mouseup-Reconciliation `reconcileSelectionOnClick`), der ausführliche Kommentar in
`tests/e2e/selection-regression.spec.ts:26-34` sowie die Commits `0797d13` („give async selection sync
time before the next keystroke“) und `db61c89`/`175d86d` (dieselbe Race in `cut.spec.ts`, speziell im
**Mobile**-Projekt). Jeder neue Tabellen-Test **muss** diese Regeln befolgen, sonst wird er im
CI (v. a. Mobile) sporadisch rot:

1. **Native Cursor-Bewegung → abhängige Folgetaste braucht eine Wartezeit.** ProseMirror erfährt eine
   **native, tastaturgetriebene** Cursor-Bewegung (`End`, `Home`, `ArrowLeft/Right/Up/Down`,
   `ControlOrMeta+End/Home`) nur über das **asynchrone** DOM-Event `selectionchange`. Eine unmittelbar
   danach gefeuerte Folgetaste, deren Wirkung von der neuen Cursor-Position abhängt (`Enter`, `Tab`,
   oder Tippen, das an der neuen Stelle landen muss), kann diesem Nachziehen **vorauslaufen**. Deshalb
   **zwischen** solcher Cursor-Bewegung und der abhängigen Taste:
   ```ts
   await page.keyboard.press('End')
   await page.waitForTimeout(50) // async selectionchange nachziehen lassen (selection-regression.spec.ts:34)
   await page.keyboard.press('Enter')
   ```
   50 ms ist der im Repo bereits etablierte, ausreichende Wert (`selection-regression.spec.ts:34,72`).
2. **Assertion vor Wartezeit bevorzugen.** Wo eine beobachtbare Zwischen­größe existiert, wird sie mit
   auto-retry­endem `expect` **abgewartet** statt blind zu schlafen — das ist strikt deterministisch:
   - `await expect(dialog).toBeVisible()` bevor im Dialog getippt/geklickt wird;
   - `await expect(page.locator('.ProseMirror td')).toHaveCount(n)` bevor über Zellen iteriert wird;
   - `await expect(page.locator('.ProseMirror table')).toHaveCount(0|1)` als Undo/Redo-Anker;
   - `await expect(input).toHaveValue('4')` nach `fill()` vor dem Bestätigen.
3. **Dialog-Eingaben mit `fill()`, nicht `type()`.** `fill()` setzt den Wert atomar (kein Zeichen-für-
   Zeichen-Race, keine Abhängigkeit von Fokus-Timing). `type()` nur, wo bewusst Tastatur-Eingabe im
   `contenteditable` getestet wird.
4. **Klick → Tippen braucht KEINE Zusatz-Wartezeit** (Race Nr. 1 gilt hier nicht): Die
   Mouseup-Reconciliation läuft synchron innerhalb des Event-Turns, bevor die nächste Playwright-Aktion
   startet — belegt durch den stabil grünen bestehenden Test `selection-regression.spec.ts:43-59`
   (`cells.nth(0).click()` → sofort `type(...)`). Es werden also **keine** überflüssigen Waits
   gestreut; Wartezeiten stehen ausschließlich an den Stellen aus Regel 1.
5. **Keine bewusst rasenden `Promise.all([click(), click()])`** außer im dafür vorgesehenen
   Doppel-Submit-Test (B.1 #11) — dort ist das Rennen der Prüfgegenstand.
6. **Alle drei Projekte.** Kein `test.skip` für Mobile/Tablet ohne dokumentierten Grund. Die Waits aus
   Regel 1 sind **unbedingt** (nicht desktop-only) — die historische Flakiness trat gerade im
   Mobile-Projekt auf.

---

## 2. Abschnitt A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) und Editor-Commands

Rein auf Modul-/State-Ebene (`vitest`, `EditorState.create`+`apply`, `readDocx`/`writeDocx`/
`readOdt`/`writeOdt` direkt) — **ohne** Browser. Bewusst getrennt von Abschnitt B (echte Bedienung).

### A.1 Bestehende Baseline (muss weiterhin grün bleiben — Regressionsschutz)

| Datei | Tests (aktuelle Fundstelle) | Erwartung |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | `describe('DOCX round trip: tables')` `:229` — „preserves rows, columns, and cell text“ `:230`, „preserves merged cells (colspan)“ `:261`, „preserves vertically merged cells (rowspan)“ `:279`; zusätzlich „whole-document fidelity“ `:366` (Tabelle enthalten) | Bleiben unverändert grün; Fundament für A.4 |
| `src/formats/odt/__tests__/roundtrip.test.ts` | `describe('ODT round trip: tables')` `:219` — „preserves rows, columns, and cell text“ `:220`, „preserves merged cells (colspan/rowspan)“ `:251`, „covered-table-cell“ horizontal `:275` **inkl. `<table:table-column/>`-Zählung `.toBe(2)` `:298`**, vertikal `:310`; **`describe('ODT writer: export determinism')` `:512`**, `table:name`-Determinismus `:529` | Bleiben unverändert grün. `:298` und `:529` sind der Regressionsschutz für die **bereits behobenen** Punkte aus §0.1 |

Diese Tests arbeiten mit **direkt konstruierten** JSON-Testdaten (`doc([...])`/`paragraph()`-Helper,
`roundtrip.test.ts:20-30`), nicht über Toolbar/Dialog — deshalb zusätzlich Abschnitt B (echte
Bedienung).

### A.2 Neu: `src/formats/shared/editor/__tests__/commands.test.ts` (**existiert — erweitern**)

Die Datei testet aktuell `canCut`/`cutSelection`. Neue Blöcke, vollständig auf Command-/State-Ebene
mit **exakten Positions-Assertions** (nicht nur „Dokument hat sich verändert“):

| Testname | Vorgehen | Assertion |
|---|---|---|
| `tableTab(1) springt von Zelle (0,0) zu (0,1)` | 2×2-Tabelle, Cursor in (0,0), `tableTab(1)(state, dispatch, view)` | `dispatch` mit einem `tr` aufgerufen, dessen `selection.$from` innerhalb (0,1) liegt (Position über `TableMap`/Zellgrenzen berechnet, nicht geraten) |
| `tableTab(-1) springt von (0,1) zu (0,0)` | Analog rückwärts | wie oben, umgekehrt |
| `Shift-Tab in der ersten Zelle ist No-Op` | Cursor in (0,0), `tableTab(-1)(state)` ohne `dispatch` | Rückgabe `false`, `dispatch` **nicht** aufgerufen |
| `tableTab außerhalb einer Tabelle liefert false` | Cursor in normalem Absatz | `tableTab(1)(state)` → `false` |
| `Tab in der letzten Zelle hängt eine Zeile an und fokussiert deren erste Zelle` | 2×2, Cursor in (1,1), `tableTab(1)(state, dispatch, view)` | Ergebnis hat **3** `table_row`-Kinder; **zusätzlich**: `view.state.selection` ist eine `TextSelection`, deren `$from.pos` **nachweislich in der ersten Zelle der neuen dritten Zeile** liegt (über Auflösen der neuen Zeilen-/Zellposition, nicht „irgendwo im Dokument“) — deckt die Warnung aus Code §3.1 (TableMap-Fallback) ab |
| `insertTable respektiert MAX_TABLE_NESTING_DEPTH` | `insertTable(1,1)` `MAX_TABLE_NESTING_DEPTH`-mal ineinander (Cursor je in die neue Zelle), letzter Versuch eine Ebene darüber | Die ersten `MAX_TABLE_NESTING_DEPTH` Aufrufe → `true` + Dokument geändert; der Aufruf, der die Grenze überschreiten würde → `false`, **dispatcht nichts** |
| `insertTable in einem Listenelement bettet ein, ohne die Liste zu unterbrechen` | `bullet_list > list_item > paragraph("ab|cd")`, Cursor zwischen „ab“/„cd“, `insertTable(2,2)(state, dispatch)` | Ergebnis-JSON: **ein** `bullet_list` mit **einem** `list_item`, dessen `content` `[paragraph("ab"), table, paragraph("cd")]` entspricht. **Weicht das Verhalten ab**, ist das ein **Befund** (Abschnitt D), kein automatisch bestandener Test — die tatsächliche Struktur wird dokumentiert, nicht hingenommen (Code-Entscheidung §1.2) |

### A.3 Neu: `src/formats/shared/editor/__tests__/InsertTableDialog.test.tsx` (`@testing-library/react`)

| Testname | Vorgehen | Assertion |
|---|---|---|
| `parseTableDimension` — alle Grenzfälle | Direktaufruf mit `''`, `'0'`, `'-1'`, `'abc'`, `'3.5'`, `'50'`, `'51'`, `'1'` (bei `max=50`) | `''`/`'abc'`/`'3.5'`/`'0'`/`'-1'`/`'51'` → `{ error: <nicht-leerer String> }`; `'50'` → `{ value: 50 }`; `'1'` → `{ value: 1 }` |
| Mount mit Standardwerten zeigt 3×3 | `render(<InsertTableDialog initialRows={3} initialCols={3} onConfirm={fn} onCancel={fn} />)` | Beide Inputs `'3'`; erstes Feld hat Fokus (`document.activeElement`), Inhalt vorausgewählt (`selectionStart===0`, `selectionEnd===1`) |
| Ungültige Eingabe + Submit zeigt Fehler, ruft `onConfirm` nicht | `userEvent.clear`+`type('0')` im Zeilenfeld, Submit | `screen.getByRole('alert')` sichtbar; `onConfirm` **nicht** aufgerufen; Dialog bleibt im DOM |
| Escape ruft `onCancel` | `fireEvent.keyDown(dialog, { key: 'Escape' })` | `onCancel` genau einmal; `onConfirm` nicht |
| Backdrop-Klick ruft `onCancel` | Klick auf das äußere Overlay (nicht auf `role="dialog"`) | `onCancel` aufgerufen |
| Klick auf die Dialog-Box schließt NICHT | Klick auf ein Element in `role="dialog"` | `onCancel` **nicht** aufgerufen |
| Doppel-Submit (Grenzfall 11) | Gültige Werte, `fireEvent.submit` **zweimal** ohne `await` dazwischen | `onConfirm` **genau einmal** |
| Fokus-Falle | `fireEvent.keyDown(dialog, { key: 'Tab' })` mit Fokus auf letztem Button | Fokus danach auf erstem Input (nicht außerhalb des Dialogs) |
| `onConfirm` liefert String (Tiefen-Guard) → Fehler statt Schließen | `onConfirm: () => 'Verschachtelungstiefe erreicht'` | Fehlertext sichtbar; Dialog bleibt im DOM (Aufrufer entscheidet) |

### A.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts` — neue Tests in `describe('DOCX round trip: tables')` (`:229`)

Genuin **neue** Prüfungen (im heutigen Code rot, siehe §0.2), zusätzlich zur Baseline A.1:

```ts
it('exported <w:tblPr> contains <w:tblBorders>', async () => {
  const original = doc([/* 2x2-Tabelle */])
  const { documentXml } = await roundTripRaw(original) // liefert rohes XML zusätzlich zum reimportierten JSON
  expect(documentXml).toMatch(/<w:tblPr>[\s\S]*<w:tblBorders>[\s\S]*<\/w:tblBorders>[\s\S]*<\/w:tblPr>/)
})

it('column widths for a 20-column table stay within the page content width (no overflow)', async () => {
  const original = doc([/* 1 Zeile, 20 Zellen */])
  const { documentXml } = await roundTripRaw(original)
  const widths = [...documentXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]))
  expect(widths).toHaveLength(20)
  expect(widths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(CONTENT_WIDTH_DXA)
})

it('an editor-set colwidth attribute is carried into the exported gridCol width', async () => {
  const original = doc([/* Tabelle, cell.attrs.colwidth = [300] auf Spalte 0 */])
  const { documentXml } = await roundTripRaw(original)
  const widths = [...documentXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]))
  expect(widths[0]).toBe(Math.round(300 * PX_TO_DXA))
})
```

*Helper-Hinweis:* Der bestehende `roundTrip()` (`roundtrip.test.ts:29`) liefert nur das reimportierte
JSON. Für die XML-Assertions ist ein zusätzlicher, non-invasiver Test-Helper `roundTripRaw()` nötig,
der neben dem JSON auch den rohen `word/document.xml`-String zurückgibt (`await (await
writeDocx(content)).arrayBuffer()` → `JSZip.loadAsync` → `.file('word/document.xml').async('text')`).
`CONTENT_WIDTH_DXA`/`PX_TO_DXA` aus dem Produktcode importieren, nicht im Test duplizieren.

### A.5 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

**Wichtig (§0.1):** Die Spaltenzahl-bei-`colspan`- und die `table:name`-Determinismus-Prüfung sind
**bereits vorhanden und grün** (`:298`, `:529`) und werden **nicht neu geschrieben** — sie bleiben als
Regressionsschutz Teil der Suite (A.1). Genuin **neu** ist nur die Zellrahmen-Prüfung:

```ts
it('every real table cell references the border style name TCBorder', async () => {
  const original = doc([{ type: 'table', content: [/* 2x2 */] }])
  const contentXml = await exportOdtRaw(original) // roher content.xml-String
  const cellCount = (contentXml.match(/<table:table-cell\b/g) ?? []).length
  const bordered = (contentXml.match(/<table:table-cell[^>]*table:style-name="TCBorder"/g) ?? []).length
  expect(cellCount).toBeGreaterThan(0)
  expect(bordered).toBe(cellCount)
})
```

*Optional (zusätzliche Absicherung, keine Neu-Behebung):* Eine `colspan=3`-Variante des bereits
grünen `:298`-Tests (Zeile 0: eine Zelle `colspan=3`; Zeile 1: drei Zellen → `<table:table-column/>`
`.toBe(3)`). Sie ist ein breiterer Regressionsanker desselben, **bereits korrekten** Verhaltens —
**nicht** als „vor dem Fix schlägt es fehl“ zu kommentieren.

### A.6 Neu: Cross-Format-Rundreise auf Modul-Ebene (Anforderung §4.1.6/§4.2.5/§4.3)

Die App bietet **keinen** Cross-Format-Export über die UI (nur eine „Exportieren“-Schaltfläche, die im
Format des geladenen Dokuments exportiert — `DocumentWorkspace.tsx:141`). Die Cross-Format-Rundreise
(§4.3) wird daher **deterministisch auf Modul-Ebene** über die realen Reader/Writer nachgewiesen
(`readDocx`/`writeDocx`/`readOdt`/`writeOdt` nehmen `File|Blob` bzw. liefern `Blob`), nicht spekulativ
über einen nicht existierenden UI-Pfad. Neue Datei
`src/formats/shared/__tests__/tableCrossFormat.test.ts`:

| Testname | Vorgehen | Assertion |
|---|---|---|
| `DOCX-Tabelle → ODT → DOCX behält Struktur/Inhalt` | `writeDocx(orig)` → `readDocx` (Kontrolle) → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Zeilen-/Spaltenzahl und **alle** Zellinhalte identisch zum Original; `colspan`/`rowspan` erhalten. Spaltenbreite/Rahmen ausdrücklich **nicht** geprüft (§4.3 nimmt sie aus) |
| `ODT-Tabelle → DOCX → ODT behält Struktur/Inhalt` | Analog mit Start ODT | wie oben |
| `ODT mit Tabelle importiert → als DOCX geschrieben` (§4.1.6) | `writeOdt(orig)`→`readOdt`→`writeDocx`→`readDocx` | Zeilen-/Spaltenzahl + Zellinhalte identisch |
| `DOCX mit Tabelle importiert → als ODT geschrieben` (§4.2.5) | Umgekehrt | wie oben |

### A.7 Erwartungs-Matrix Abschnitt A (heute vs. nach Umsetzung)

| Test (Kurzform) | Status **heute** | Status **nach** Umsetzung |
|---|---|---|
| A.1 DOCX/ODT-Tabellen-Baseline inkl. `:298`/`:529` | **Grün** (bereits vorhanden — inkl. der zwei „bereits behobenen“ ODT-Punkte) | Bleibt grün (Regressionsschutz) |
| `tableTab`/Tiefen-Guard/Listen-Einbettung (A.2) | Existiert nicht (`tableTab` fehlt) | Muss grün sein |
| `InsertTableDialog`-Tests (A.3) | Existiert nicht (Komponente fehlt) | Muss grün sein |
| `<w:tblBorders>` vorhanden (A.4) | **Rot** — `<w:tblPr/>` leer (`docx/writer.ts:200`) | Muss grün sein |
| 20-Spalten-Breitensumme ≤ Seitenbreite (A.4) | **Rot** — `20 × 2000` dxa ≫ `CONTENT_WIDTH_DXA` (`docx/writer.ts:161`) | Muss grün sein |
| `colwidth`-Übernahme (A.4) | **Rot** — Attribut ignoriert | Muss grün sein |
| ODT `TCBorder`-Referenz je Zelle (A.5) | **Rot** — Attribut existiert nicht (`odt/writer.ts:156`) | Muss grün sein |
| Cross-Format Modul-Rundreise (A.6) | Voraussichtlich grün (Struktur/Inhalt schon heute treu, Reader/Writer vorhanden) — **muss dennoch ausgeführt** werden, bisher kein eigener Test | Bleibt grün |

**Kein** Eintrag „ODT-Spaltenzahl / ODT-Tabellenname wird von rot auf grün gebracht“ — beide sind
bereits grün (§0.1). Wer sie erneut als offenen Defekt führt, verstößt gegen Anforderung Abschnitt 0.

---

## 3. Abschnitt B — E2E-Tests (echte Playwright-Browser-Bedienung)

Alle Tests hier nutzen **ausschließlich** echte Nutzerinteraktion (`click()`, `keyboard.type()`/
`.press()`, `input.setInputFiles()`, `waitForEvent('download')` + tatsächliches Einlesen der Datei von
der Festplatte). Kein Test in Abschnitt B ruft `insertTable()`, `parseTableDimension()` oder einen
anderen internen Export direkt auf — das ist Abschnitt A vorbehalten. **Alle Tests befolgen die
Determinismus-Regeln aus §1.1.**

### B.0 Pflichtänderung: `tests/e2e/selection-regression.spec.ts` (`:43-59`)

Der Test „same regression inside a table cell (click between cells after formatting)“ klickt „Tabelle
einfügen“ (`:46`) und erwartet **sofort** `.ProseMirror td` (`:48-49`). Nach der Dialog-Umstellung
öffnet der Klick zunächst den Dialog. Anpassung **ohne** Änderung des Prüfzwecks:

```ts
await editor.click()
await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
const dialog = page.getByRole('dialog', { name: 'Tabelle einfügen' })
await expect(dialog).toBeVisible()                                  // §1.1 Regel 2
await dialog.getByRole('button', { name: 'Einfügen' }).click()      // Standard 3×3 → ≥ 2 Zellen
// ... Rest unverändert (cells.nth(0)/nth(1))
```

**Abnahmekriterium:** Diff-Review durch QA — es darf **keine** Assertion des ursprünglichen Tests
entfernt/abgeschwächt werden; nur die Klick-/Bestätigungs-Sequenz kommt hinzu (DoD §6.9, Anforderung
§5.20). Änderung **im selben Commit** wie die Toolbar-Umstellung.

### B.1 Neue Datei `tests/e2e/table-insert.spec.ts` — Dialog, Grundverhalten, Grenzfälle

Gemeinsame Helper (in der Spec definieren):

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
async function openNewDocxEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.locator('.ProseMirror')).toBeVisible()
}
async function openInsertTableDialog(page: Page) {
  await page.locator('.ProseMirror').click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tabelle einfügen' })
  await expect(dialog).toBeVisible()   // §1.1 Regel 2 — vor jeder Dialog-Interaktion
  return dialog
}
async function insertTableViaDialog(page: Page, { rows, cols }: { rows: number; cols: number }) {
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill(String(rows))   // §1.1 Regel 3 — fill, nicht type
  await dialog.getByLabel(/spalten/i).fill(String(cols))
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
  await expect(page.locator('.ProseMirror table')).toHaveCount(1)
}
async function insertDefaultTable(page: Page) {
  const dialog = await openInsertTableDialog(page)
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
  await expect(page.locator('.ProseMirror table')).toHaveCount(1)
}
```

| # (§5) | Testname | Kernschritte | Assertion |
|---|---|---|---|
| 1 | `clicking the toolbar button opens the size dialog` | `openInsertTableDialog(page)` | Dialog sichtbar; erstes Eingabefeld fokussiert (`await expect(dialog.locator('input').first()).toBeFocused()`) |
| 2 | `entering rows=4, cols=3 and confirming inserts a 4×3 table` | `insertTableViaDialog(page, { rows: 4, cols: 3 })` | `await expect(page.locator('.ProseMirror tr')).toHaveCount(4)`; jede Zeile hat 3 `td` (Schleife über `tr.locator('td')`, je `toHaveCount(3)`) |
| 3 | `confirming with default values inserts the default size` | `insertDefaultTable(page)` | 3 `tr`, je 3 `td` (`DEFAULT_TABLE_ROWS/COLS = 3`) |
| 4a–c | `invalid input (0 / negative / text) shows an error and inserts nothing` | Je Sub-Fall: Dialog öffnen, `rowsInput.fill('0'|'-1'|'abc')`, „Einfügen“ | `dialog.getByRole('alert')` sichtbar; Dialog bleibt offen; `page.locator('.ProseMirror td')` `toHaveCount(0)`; `pageErrors`/console-`error` leer |
| 4d | `value above the maximum (100) shows an error, not silent clamping/freeze` | `rowsInput.fill('100')`, `colsInput.fill('100')`, „Einfügen“ | Fehler sichtbar; keine `.ProseMirror table`; Seite reagiert weiter (`dialog.getByRole('button', { name: 'Abbrechen' }).click()` schließt) |
| 5 | `Escape closes the dialog without any document change` | Text tippen, `Home`, **`waitForTimeout(50)`**, Dialog öffnen, `Escape` | Dialog aus dem DOM; keine `td`; Cursor unverändert (danach tippen und Zielposition prüfen) |
| 5b | `backdrop click closes without inserting` | Dialog öffnen, Klick auf Overlay außerhalb der Box | Dialog weg; keine Tabelle |
| 11 | `double-clicking "Einfügen" quickly does not insert twice` | Dialog öffnen, gültige Werte, `Promise.all([btn.click(), btn.click()])` | `await expect(page.locator('.ProseMirror table')).toHaveCount(1)` (nicht 2) |

### B.2 Alle Zellen anklicken und beschreiben (Testfall 6)

```ts
test('typing into every cell of a fresh 4×3 table lands in the right cell', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 4, cols: 3 })
  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(12)                 // §1.1 Regel 2 — vor der Iteration
  for (let i = 0; i < 12; i++) {
    await cells.nth(i).click()
    await page.keyboard.type(`Z${i}`)                 // Klick→Tippen: kein Wait nötig (§1.1 Regel 4)
  }
  for (let i = 0; i < 12; i++) {
    await expect(cells.nth(i)).toHaveText(`Z${i}`)
  }
})
```

Erweitert bewusst den bestehenden Zwei-Zellen-Test (`selection-regression.spec.ts:43-59`) auf **alle**
Zellen, um positionsabhängige Fehler (falsch berechnete Zellgrenzen) aufzudecken.

### B.3 Tab-/Umschalt+Tab-Navigation (Testfälle 7–8, Grenzfall 9/10)

```ts
test('Tab moves the cursor to the next cell', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertDefaultTable(page)
  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(9)
  await cells.nth(0).click()
  await page.keyboard.type('A')
  await page.keyboard.press('Tab')      // Tab = PM-Command (synchroner dispatch), kein selectionchange-Race
  await page.keyboard.type('B')
  await expect(cells.nth(0)).toHaveText('A')
  await expect(cells.nth(1)).toHaveText('B')
})

test('Tab in the last cell appends a new row and focuses its first cell', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 2, cols: 2 })
  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(4)
  await cells.nth(3).click()            // letzte Zelle
  await page.keyboard.press('Tab')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)   // §1.1 Regel 2 — Struktur abwarten
  await expect(page.locator('.ProseMirror td')).toHaveCount(6)
  await page.keyboard.type('X')
  await expect(page.locator('.ProseMirror td').nth(4)).toHaveText('X')  // Cursor MUSS in erster neuer Zelle stehen
})
```

**Erwarteter Status heute:** Beide rot (Anforderung §3.9/§3.10, „gilt bis zum Gegenbeweis als
fehlend“). Dokumentierter Ist-Zustand, kein Testfehler. *Hinweis:* `Tab`/`Shift-Tab` sind nach der
Umsetzung keymap-gebundene PM-Commands (synchroner `dispatch`), daher an dieser Stelle **kein**
`selectionchange`-Race (Regel 1 greift hier nicht); der Übergang wird dennoch mit `toHaveCount`
abgewartet (Regel 2), bevor die Folge-Assertion tippt.

### B.4 Undo/Redo (Testfälle 9–10, Grenzfall 12)

```ts
test('Ctrl+Z right after inserting removes the whole table', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Vorher.')
  await insertDefaultTable(page)
  await expect(page.locator('.ProseMirror table')).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)   // Undo abwarten
  await expect(page.locator('.ProseMirror')).toContainText('Vorher.')
})

test('Redo restores the table at the correct size', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 4, cols: 3 })
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(4)
})

test('Undo after insert, then typing at the restored position keeps content (Grenzfall 12)', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Text davor. ')
  await insertDefaultTable(page)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)   // §1.1 Regel 2 — Undo abwarten, BEVOR getippt wird
  await page.keyboard.type('Text danach.')
  await expect(page.locator('.ProseMirror')).toContainText('Text davor. Text danach.')
})
```

### B.5 Cursor-Position, Selektion, Sonderpositionen (Testfälle 11–13/14, Grenzfälle 5/6/7/8/15/16)

| Testname | Kernschritte | Assertion |
|---|---|---|
| `inserting between existing text keeps both parts intact` | „AB“ tippen, `Home`, `ArrowRight`, **`waitForTimeout(50)`** (§1.1 Regel 1 — native Cursor-Bewegung vor dem einfügenden Klick), Tabelle einfügen | „A“ und „B“ als getrennte Textknoten **vor bzw. nach** der Tabelle (DOM-Reihenfolge geprüft, nicht nur `toContainText`) |
| `inserting while text is selected replaces the selection` | Text tippen, `ControlOrMeta+a`, Tabelle einfügen | Ursprungstext **weg** (`not.toContainText`), `.ProseMirror table` `toHaveCount(1)` — Grenzfall 5 als gewolltes Verhalten |
| `inserting at the very start of the document` | Neues leeres Dokument, sofort Tabelle einfügen | Tabelle erstes Element; danach per Klick über der Tabelle Text ergänzbar (Grenzfall 6/15), kein Fehlerzustand |
| `inserting at the very end of the document` | Text tippen, `End`, **`waitForTimeout(50)`**, Tabelle einfügen | Tabelle nach dem Text; Cursor danach setzbar und beschreibbar |
| `inserting with the cursor inside an existing cell → nested table, no crash` | Tabelle einfügen, in eine Zelle klicken, **erneut** „Tabelle einfügen“ + bestätigen | Kein Absturz (`pageErrors` leer, Editor sichtbar); verschachtelte Tabelle nachweisbar: **`page.locator('.ProseMirror td table')`** `toHaveCount(≥1)` (Tabelle **innerhalb** einer Zelle) — bestätigt Code-Entscheidung §1.1 |
| `inserting inside a list item does not break the list (Grenzfall 8)` | Aufzählung erzeugen, „ab“ tippen, Cursor zwischen a/b (`ArrowLeft` + **`waitForTimeout(50)`**), Tabelle einfügen | Liste bleibt **ein** `<ul>` (`page.locator('.ProseMirror ul')` `toHaveCount(1)`); Tabelle innerhalb desselben `<li>` (`page.locator('.ProseMirror li table')` `toHaveCount(1)`) |
| `selection over dialog lifetime (TF 14 / Grenzfall 16)` | Text tippen, Dialog öffnen, **ins Dokument an eine bestimmte Stelle zurückklicken**, „Einfügen“ | Tabelle landet an der **zuletzt geklickten** Position (Text davor/danach in erwarteter Reihenfolge), nicht am ursprünglichen Cursor |

### B.6 Rundreise DOCX — echter Upload/Export (Anforderung §4.1) — neue Datei `tests/e2e/table-roundtrip.spec.ts`

```ts
test('DOCX: 4×3 table via dialog round-trips through export/re-import (independent parser)', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 4, cols: 3 })
  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(12)
  for (let i = 0; i < 12; i++) {
    await cells.nth(i).click()
    await page.keyboard.type(`Zelle${i}`)
  }

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await dl
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  const zip = await JSZip.loadAsync(buffer)                         // unabhängiger Parser, NICHT reader.ts
  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect((documentXml.match(/<w:tr\b/g) ?? []).length).toBe(4)
  for (const row of documentXml.split(/(?=<w:tr\b)/).filter((s) => s.startsWith('<w:tr'))) {
    expect((row.match(/<w:tc\b/g) ?? []).length).toBe(3)
  }
  expect(documentXml).toContain('Zelle0')
  expect(documentXml).toContain('Zelle11')
  expect(documentXml).toMatch(/<w:tblBorders>/)                    // §4.1.4 / DoD 5

  // Re-Import der exakten heruntergeladenen Bytes über die Auswahl (§1 „Formate“-Idiom)
  await page.getByRole('button', { name: /formate/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'export.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(4)
  await expect(page.locator('.ProseMirror td').nth(0)).toHaveText('Zelle0')
  await expect(page.locator('.ProseMirror td').nth(11)).toHaveText('Zelle11')
  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})

test('DOCX: merged cells from an uploaded foreign file survive real upload/export (§4.1.5)', async ({ page }) => {
  const buffer = await buildSampleDocxWithMergedCells()   // hand-gebaut, analog docx.spec.ts:169-200
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'merged.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror table')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exported = await fs.readFile((await (await dl).path())!)
  const documentXml = await (await JSZip.loadAsync(exported)).file('word/document.xml')!.async('text')
  expect(documentXml).toMatch(/<w:gridSpan w:val="2"\/>/)
  expect((documentXml.match(/<w:gridCol\b/g) ?? []).length).toBe(2)   // colspan-Summe, nicht Zellenzahl
})
```

Konstante `DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'` wie in
`docx.spec.ts`. `buildSampleDocxWithMergedCells()` folgt dem hand-gebauten Fixture-Muster aus
`docx.spec.ts:169-200` (`gridSpan`/`vMerge`) — bewusst **unabhängig** vom eigenen Writer.

### B.7 Rundreise ODT — echter Upload/Export (Anforderung §4.2)

**Framing (§0.1):** Die folgenden ODT-Prüfungen sind **Regressions-Absicherung** für **bereits
korrektes** Verhalten (Spaltenzahl bei `colspan`, deterministischer `table:name`) über den echten
Upload/Export-Weg — **nicht** der Nachweis einer Fehlerbehebung. Kein Kommentar „vor dem Fix schlägt
es fehl“.

```ts
test('ODT: 4×3 table via dialog exports the correct row/column structure', async ({ page }) => {
  await openNewOdtEditor(page)
  await insertTableViaDialog(page, { rows: 4, cols: 3 })
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const contentXml = await (await JSZip.loadAsync(await fs.readFile((await (await dl).path())!)))
    .file('content.xml')!.async('text')
  expect((contentXml.match(/<table:table-row\b/g) ?? []).length).toBe(4)
  const rows = contentXml.split(/(?=<table:table-row\b)/).filter((s) => s.startsWith('<table:table-row'))
  for (const row of rows) expect((row.match(/<table:table-cell\b/g) ?? []).length).toBe(3)
  expect((contentXml.match(/<table:table-cell[^>]*table:style-name="TCBorder"/g) ?? []).length).toBeGreaterThan(0)
})

test('ODT: table:table-column count stays correct with a colspan cell in row 0 (regression, §4.2.2)', async ({ page }) => {
  // Der Dialog erzeugt nur gleichförmige Tabellen; für eine colspan-Zelle in Zeile 0 braucht es eine
  // Fremddatei (Zeile 0: 1 Zelle colspan=3; Zeile 1: 3 Zellen) — das in §4.2.2 verlangte Szenario.
  const buffer = await buildSampleOdtWithColspanInFirstRow()   // hand-gebaut, analog odt.spec.ts
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'colspan-row0.odt', mimeType: ODT_MIME, buffer })
  await expect(page.locator('.ProseMirror table')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const contentXml = await (await JSZip.loadAsync(await fs.readFile((await (await dl).path())!)))
    .file('content.xml')!.async('text')
  expect((contentXml.match(/<table:table-column\b/g) ?? []).length).toBe(3)   // bereits korrekt (odt/writer.ts:115) — Regressionsanker
})

test('ODT: two tables in one document keep distinct table:name values on real export (§4.2.6)', async ({ page }) => {
  await openNewOdtEditor(page)
  await insertDefaultTable(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.waitForTimeout(50)                 // §1.1 Regel 1 — native Cursor-Bewegung vor Enter
  await page.keyboard.press('Enter')
  await insertDefaultTable(page)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const contentXml = await (await JSZip.loadAsync(await fs.readFile((await (await dl).path())!)))
    .file('content.xml')!.async('text')
  const names = [...contentXml.matchAll(/<table:table table:name="([^"]+)"/g)].map((m) => m[1])
  expect(names).toHaveLength(2)
  expect(new Set(names).size).toBe(2)           // deterministisch via TableNameSequence
})
```

`openNewOdtEditor`/`odtCard` analog zu B.1, mit Überschrift „OpenDocument Text (.odt)“;
`ODT_MIME = 'application/vnd.oasis.opendocument.text'`.

### B.8 Cross-Format (Anforderung §4.1.6/§4.2.5/§4.3) — bewusst auf Modul-Ebene

**Kein E2E-Cross-Format-Test.** Die UI bietet **keinen** Cross-Format-Export: die einzige
„Exportieren“-Schaltfläche (`DocumentWorkspace.tsx:141`) exportiert stets im Format des geladenen
Dokuments; es gibt keinen „als DOCX/ODT exportieren“-Umschalter. Ein DOCX→ODT→DOCX-Weg lässt sich
daher **nicht** über echte Klicks erzeugen. Die Anforderung §4.3 verlangt ausdrücklich nur das
**Ergebnis** (Struktur-/Inhaltstreue), keinen bestimmten Klickpfad — dieses Ergebnis wird
deterministisch über die realen Reader/Writer in **A.6** nachgewiesen. Sollte künftig ein
Cross-Format-Export-Steuerelement in die UI kommen, ist hier ein echter E2E-Test nachzuziehen; QA
verifiziert bei der Abnahme, dass dieser UI-Pfad tatsächlich (nicht) existiert.

### B.9 Große Tabelle — Reaktionsfähigkeit (Testfall 18, Grenzfall 3/4)

```ts
test('20×20 table: insert, edit, export/import stay responsive', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 20, cols: 20 })
  await expect(page.locator('.ProseMirror td')).toHaveCount(400)

  // Kern-Determinismus: UI hängt nicht — eine Folge-Eingabe landet innerhalb des expect-Timeouts
  await page.locator('.ProseMirror td').first().click()
  await page.keyboard.type('Ecke')
  await expect(page.locator('.ProseMirror td').first()).toHaveText('Ecke')

  const t0 = Date.now()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await dl).path())!)
  const exportMs = Date.now() - t0
  const documentXml = await (await JSZip.loadAsync(buffer)).file('word/document.xml')!.async('text')
  expect((documentXml.match(/<w:tr\b/g) ?? []).length).toBe(20)

  // Wall-clock-Schwelle NUR als weiche, protokollierte Kennzahl (CI-Last variiert). Die harte
  // Determinismus-Aussage ist die erfolgreiche Folge-Eingabe oben, nicht diese Zeitmessung.
  console.log(`[metric] 20x20 DOCX export: ${exportMs} ms`)
  expect(exportMs).toBeLessThan(8000)   // großzügige Obergrenze gegen echtes Einfrieren; Zielwert < 3 s (§3.4) als Kennzahl protokolliert
})

test('101 rows/cols (above the maximum) is rejected with an error, not a frozen UI', async ({ page }) => {
  await openNewDocxEditor(page)
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill('100')
  await dialog.getByLabel(/spalten/i).fill('100')
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
})
```

*Begründung Determinismus:* Ein hartes `toBeLessThan(3000)` auf die reine Wall-Clock ist auf geteilten
CI-Runnern flaky. Deterministischer Kern ist die **erfolgreiche Folge-Interaktion** (kein Hänger); die
Zeit wird als Kennzahl protokolliert und nur gegen eine großzügige „echtes Einfrieren“-Schwelle
geprüft. Der Zielwert < 3 s aus §3.4 wird im Abnahmeprotokoll (Abschnitt D) mit dem geloggten Wert
belegt.

### B.10 Reale komplexe Fremddatei (Testfall 19, Anforderung §4.1.7)

```ts
test('a realistic large foreign DOCX table (6 cols × 12 rows, mixed formatting) round-trips without cell-content loss', async ({ page }) => {
  const buffer = await buildLargeSampleDocxWithTable({ cols: 6, rows: 12 })  // hand-gebaut, analog docx.spec.ts
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'gross.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(12)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exported = await fs.readFile((await (await dl).path())!)

  await page.getByRole('button', { name: /formate/i }).click()
  const input2 = docxCard(page).locator('input[type="file"]')
  await input2.setInputFiles({ name: 're-import.docx', mimeType: DOCX_MIME, buffer: exported })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(12)
  // Stichproben mehrerer Zellinhalte + Formaterhalt (z. B. eine fett gesetzte Zelle bleibt <strong>)
})
```

**Fixture-Prüfpflicht:** Vor Testerstellung erneut in `tests/e2e/fixtures/` und `src/**/__tests__`
prüfen, ob bereits eine passende große Tabellen-Fixture existiert (`fullCoverageDocument` in
`tests/e2e/fixtures/` deckt derzeit nur eine 2-Zeilen-Tabelle ab, `docx.spec.ts:285`), statt ungeprüft
eine neue zu bauen.

### B.11 Regressionstest (Testfall 20)

`tests/e2e/selection-regression.spec.ts` (**alle** Tests des `describe`-Blocks, nicht nur der
Tabellen-Test) wird als **Pflichtbestandteil** jedes Volllaufs erneut ausgeführt und muss grün bleiben
— mit der inhaltlich neutralen Anpassung aus B.0.

---

## 4. Traceability-Matrix — Anforderung ↔ Testfall

| Anforderung | Testfall(e) |
|---|---|
| §1 (Dialog statt fester 2×2) | B.1 #1–3, A.3 |
| §1 (Tab-Navigation) | B.3, A.2 |
| §1 (Undo direkt nach Einfügen) | B.4 |
| §2.1/2.2 (Dialogverhalten, Validierung) | B.1, A.3 |
| §2.3 (Einfügen an Cursor/Selektion) | B.5 |
| §2.4 (sofortige Bearbeitbarkeit) | B.2 |
| §2.5 (Spaltenbreite: Darstellung + Export-Lücke) | A.4 (`colwidth`-Übernahme, Breitensumme), B.9 |
| §2.6 (Undo/Redo) | B.4 |
| §2.7 (Selection-Sync-Bug in Tabellen) | B.0, B.11 |
| §2.8/Grenzfall 7/8 (verschachtelt/Liste) | B.5, A.2 |
| §3 Grenzfall 1 (Abbrechen) | B.1 #5, #5b, A.3 |
| §3 Grenzfall 2 (ungültige Eingabe) | B.1 #4a–c, A.3 |
| §3 Grenzfall 3 (100×100 abgelehnt) | B.1 #4d, B.9 |
| §3 Grenzfall 4 (20×20 performant) | B.9 |
| §3 Grenzfall 5 (Ersetzen bei Selektion) | B.5 |
| §3 Grenzfall 6 (Dokumentanfang/-ende) | B.5 |
| §3 Grenzfall 7 (verschachtelte Tabelle) | B.5, A.2 |
| §3 Grenzfall 8 (Listenelement) | B.5, A.2 |
| §3 Grenzfall 9/10 (Tab letzte Zelle / Fokus) | B.3 |
| §3 Grenzfall 11 (Mehrfachklick) | B.1 #11, A.3 |
| §3 Grenzfall 12 (Undo + erneut tippen) | B.4 |
| §3 Grenzfall 13 (Selection-Sync Zellwechsel) | B.0, B.11 |
| §3 Grenzfall 14 (Spaltenzahl > Seitenbreite) | A.4, B.9 |
| §3 Grenzfall 15 (leeres Dokument) | B.5 |
| §3 Grenzfall 16 (Selektion über Dialog-Lebensdauer) | B.5 (TF 14) |
| §4.1 DOCX-Rundreise (1–7) | B.6, A.4, B.10 |
| §4.2 ODT-Rundreise (1–7) | B.7, A.5 (Regression `:298`/`:529`) |
| §4.3 Cross-Format doppelte Rundreise | **A.6** (Modul-Ebene; UI bietet keinen Cross-Format-Export, B.8) |
| §5 Testfälle 1–20 | B.0–B.11, A.1–A.6 |
| §6 DoD 1 (Dialog) | B.1, A.3 |
| §6 DoD 2 (Tab-Navigation) | B.3, A.2 |
| §6 DoD 3 (alle §5-Testfälle grün) | gesamter Abschnitt B |
| §6 DoD 4 (Rundreise; die zwei ODT-Punkte als Regression, NICHT als Neu-Behebung) | A.1 (`:298`/`:529`) + A.4/A.5 + B.6/B.7 |
| §6 DoD 5 (DOCX-Rahmenfrage beantwortet) | A.4 (`<w:tblBorders>`), B.6 |
| §6 DoD 6 (Grenzfälle dokumentiert) | Abschnitt D |
| §6 DoD 7 (Grenzfall 3.7 beantwortet) | A.2, B.5 |
| §6 DoD 8 (Spaltenbreiten-Einschränkung dokumentiert/behoben) | A.4, Abschnitt D |
| §6 DoD 9 (Regressionstest bleibt) | B.0, B.11 |

---

## 5. Abschnitt D — Abnahmeprotokoll-Vorlage

| Testfall-ID | Ergebnis (Pass/Fail/Blocked) | Datum | Commit/Version | Bei Fail: Fundstelle | Bemerkung |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Zwingend vor Status-Änderung „teilweise“ → „verifiziert“ (Anforderung §6):
- Schriftliche Antwort auf Grenzfall 3.7 (verschachtelte Tabelle) — QA bestätigt per A.2/B.5, ob das
  Ist-Verhalten der Entscheidung (Code §1.1, erlaubt + Tiefen-Guard) entspricht, und trägt das
  Ergebnis in `tabelle-einfuegen-req.md` nach.
- Schriftliche Antwort auf Grenzfall 3.8 (Listenelement) analog über A.2/B.5.
- Bestätigung, dass DOCX-Rahmen (§6.5) exportiert werden (A.4/B.6) und die Spaltenbreiten-Einschränkung
  (§6.8) behoben (DOCX) bzw. bewusst dokumentiert (ODT/Import) ist.
- Geloggter 20×20-Export-Wert (B.9) gegen den Zielwert < 3 s (§3.4) protokolliert.
- Diff-Review, dass `tests/e2e/selection-regression.spec.ts` nach B.0 **inhaltlich** unverändert ist
  (nicht nur „grün“).
- **Ausdrücklicher Vermerk (Anforderung §0):** Die ODT-Punkte Spaltenzahl (`:298`) und `table:name`
  (`:529`) sind **keine** in diesem Durchlauf behobenen Defekte, sondern grün gehaltener
  Regressionsschutz für bereits vorhandenen Code (`TableNameSequence`, colspan-summiertes `colCount`).

---

## 6. Abschnitt E — Nullmessung (vor Umsetzung, Stand 2026-07-05)

| Testgruppe | Erwartetes Ergebnis heute | Grund |
|---|---|---|
| A.1 (Baseline, inkl. ODT `:298`/`:529`) | **Grün** | Bereits vorhanden; die zwei „bereits behobenen“ ODT-Punkte sind heute grün |
| A.2 (`commands.test.ts` neu) | Nicht ausführbar (`tableTab`/Guard fehlen) | Code §3.1 noch nicht gebaut |
| A.3 (`InsertTableDialog.test.tsx` neu) | Nicht ausführbar | Komponente fehlt |
| A.4 (DOCX-Writer-Erweiterungen) | **Rot** bzw. nicht ausführbar bis `roundTripRaw`-Helper existiert | `<w:tblPr/>` leer, `w:w="2000"` hartkodiert |
| A.5 (ODT `TCBorder`) | **Rot** | `table:style-name` an Zellen fehlt (`odt/writer.ts:156`) |
| A.6 (Cross-Format Modul) | Voraussichtlich **grün**, aber neu zu schreiben und tatsächlich auszuführen | Reader/Writer bereits vorhanden |
| B.0/B.11 (Regression) | Heute **grün** im unveränderten Zustand (Button fügt direkt ein) | Nach B.0-Anpassung erneut prüfen, sobald der Dialog existiert |
| B.1 (Dialogverhalten) | Rot/nicht ausführbar (`getByRole('dialog', …)` findet nichts) | Dialog fehlt |
| B.2 (alle Zellen tippbar) | Grün, **wenn** vorübergehend auf die feste 2×2-Einfügung angepasst; sonst rot (Dialog fehlt) | Basisbearbeitbarkeit besteht, nur die Größenwahl fehlt |
| B.3 (Tab-Navigation) | **Rot** | Anforderung §3.9/§3.10, bestätigt fehlend |
| B.4 (Undo/Redo) | Voraussichtlich grün (generischer `history()`), **muss dennoch real ausgeführt** werden | Bisher kein eigener Test |
| B.5–B.10 | Größtenteils rot/nicht ausführbar (dialogabhängig); Fremddatei-/Rundreise-Teile teils schon über den Upload-Pfad möglich | Siehe Einzelfälle |

Nach jeder Umsetzungs-Iteration wird derselbe vollständige Lauf wiederholt und in Abschnitt D
protokolliert, bis alle neun Punkte aus `tabelle-einfuegen-req.md` Abschnitt 6 erfüllt und grün sind.
