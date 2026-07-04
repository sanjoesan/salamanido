# Testplan (QA): Feature „Fußnote einfügen“

Bezug: `specs/fussnote-einfuegen-req.md` (Anforderung, Abschnitte 1–6), `specs/fussnote-einfuegen-code.md`
(Umsetzungsplan des Entwicklers, Abschnitte 0–12). Dieses Dokument ist der **Nachweisplan** des
QA-Agenten: Es legt fest, mit welchen konkreten, ausführbaren Tests jeder Punkt aus der Anforderung
(Bedienelemente Abschnitt 1, Verhalten Abschnitt 2, Grenzfälle Abschnitt 3, Rundreise Abschnitt 4,
Testfälle Abschnitt 5, Abnahmekriterien Abschnitt 6) nachgewiesen oder widerlegt wird. Es ändert selbst
keinen Produktcode.

**Rollenteilung:** Anforderung (PO/Lead) → Umsetzungsplan (Dev) → dieser Testplan (QA) → Ausführung gegen
den tatsächlich gebauten Code → Rückmeldung an Backlog-Status. Jeder Testfall hier ist bewusst so konkret
(Selektoren, Dateien, exakte Assertions) formuliert, dass er direkt in Code umgesetzt/ausgeführt werden
kann, ohne weitere Interpretation.

---

## 0. Ausgangslage zum Zeitpunkt der Testplan-Erstellung (2026-07-04)

Gegen den Code verifiziert (deckt sich mit `fussnote-einfuegen-req.md` Zeilen 41–57 und
`fussnote-einfuegen-code.md` Abschnitt 0):

| Datei | Ist-Zustand jetzt |
|---|---|
| `src/formats/shared/editor/Toolbar.tsx:228-244` | Letzte zwei Elemente sind „⊞ Tabelle“ und „🖼 Bild“. **Kein** Fußnoten-Button, kein Import von `insertFootnote`. |
| `src/formats/shared/editor/commands.ts:1-107` | Enthält `insertImage`/`insertTable` nach dem `state.tr.replaceSelectionWith(node)`-Muster. **Kein** `insertFootnote`, `nextFootnoteId`, `deleteFootnoteAdjacent`. |
| `src/formats/shared/editor/WordEditor.tsx:71-86` | Keymap enthält `Mod-z`/`Mod-y`/`Mod-Shift-z`/`Enter`/`Mod-b`/`Mod-i`/`Mod-u`, **keine** `Backspace`/`Delete`-Sonderbehandlung; Plugin-Liste endet mit `createPaginationPlugin()`, **kein** `createFootnoteSyncPlugin`/`createFootnoteDisplayPlugin`. |
| `src/formats/shared/schema.ts` | `doc: { content: 'block+' }`, **keine** Knoten `footnote_reference`/`footnote_item`/`footnotes_area`. |
| `src/formats/docx/relationships.ts`, `docx/writer.ts`, `docx/reader.ts` | Kein `footnotes`-Relationship-Typ, kein `word/footnotes.xml`-Part, `<w:footnoteReference>` wird beim Import stillschweigend verworfen (Anforderung Zeile 51). |
| `src/formats/odt/writer.ts`, `odt/reader.ts` | Kein `<text:note>`-Fall, keine `<text:notes-configuration>`, `<text:note>` wird beim Import stillschweigend verworfen (Anforderung Zeile 53). |
| `tests/e2e/`, `src/formats/**/__tests__/` | **Kein einziger** Test mit „footnote“/„Fußnote“ im Namen oder Inhalt (bestätigt durch Projektsuche, deckt sich mit Anforderung Zeile 57 und `fussnote-einfuegen-code.md` Abschnitt 10). |
| `tests/fixtures/external/docx/footnotes.docx`, `table_footnotes.docx`, **`form_footnotes.docx`** | Alle drei existieren bereits im Repo. `form_footnotes.docx` wird in `fussnote-einfuegen-code.md` **nicht** erwähnt, ist aber eine zusätzliche reale Fixture mit Fußnoten — QA nutzt sie ergänzend (A.7) als zusätzliche Absicherung über die im Code-Plan explizit genannten zwei Dateien hinaus. |
| `tests/fixtures/external/odt/footnote.odt` | Existiert bereits, enthält laut Code-Plan Abschnitt 0 sowohl eine Fußnote („A footnote?“) als auch eine Endnote im selben Dokument — deckt Grenzfall 3.18 mit einer echten Datei ab. |

**Konsequenz für diesen Testplan:** Da das Feature laut Anforderung „vollständig neu zu bauen“ ist
(Zeile 15–16) und noch **keinerlei** Code existiert, sind **alle** unten aufgeführten Testfälle gegen den
heutigen Stand zwangsläufig entweder nicht ausführbar (referenzierte Funktionen/Selektoren existieren
nicht) oder rot. Das ist erwartet und dokumentiert exakt den Ist-Zustand „fehlt“. Dieser Testplan ist als
**Zielzustand** geschrieben (setzt die Umsetzung gemäß `fussnote-einfuegen-code.md` voraus) und dient
zugleich als Abnahme-Suite, die nach jeder Umsetzungs-Iteration erneut vollständig gegen den dann
aktuellen Code ausgeführt wird. Abschnitt E hält die Baseline (Stand heute, vor Umsetzung) fest, damit der
Fortschritt messbar ist. Alle konkreten Selektoren/Klassennamen (`sup.footnote-ref`, `.footnote-item`,
`.footnote-area`, Button-Text „Fußnote“/`title`/`aria-label` „Fußnote einfügen“ usw.) sind aus
`fussnote-einfuegen-code.md` Abschnitte 2–6 übernommen — **sollte die tatsächliche Umsetzung davon
abweichen** (z. B. andere CSS-Klassen), sind die betroffenen Selektoren von QA vor Testlauf entsprechend
anzupassen, ohne die dahinterliegende Prüfabsicht zu verändern.

---

## 1. Ausführungsumgebung

| Ebene | Befehl | Bemerkung |
|---|---|---|
| Unit-/Komponententests | `npm run test` (`vitest run`) | jsdom-Umgebung |
| Coverage (optional) | `npm run coverage` | insbesondere für `createFootnoteSyncPlugin`, `nextFootnoteId`, `parseFootnotesXml` |
| E2E (echter Browser) | `npm run test:e2e` (`playwright test`) | `playwright.config.ts`: `webServer` startet `npm run build && npm run preview -- --port 4173`, `baseURL: 'http://localhost:4173/salamanido/'`; drei Projekte (`Desktop Chrome`, `Mobile`, `Tablet`) laufen standardmäßig, wie bei den bestehenden Specs |
| E2E UI-Debug | `npm run test:e2e:ui` | zur manuellen Fehlersuche bei rotem Testfall |

Gemeinsame Konventionen (aus bestehenden Specs `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
übernommen, **nicht** neu erfinden):
- Jeder Test beginnt mit `page.goto('/')` + `page.getByRole('button', { name: /verstanden/i }).click()`
  (schließt `PrivacyModal`).
- Format-Karten: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
  bzw. `'OpenDocument Text (.odt)'`.
- Neues Dokument: `<Karte>.getByRole('button', { name: 'Neu erstellen' }).click()`.
- Datei-Upload: `<Karte>.locator('input[type="file"]')` + `setInputFiles({ name, mimeType, buffer })` — ein
  natives `<input type="file">` liegt bereits vor, kein `filechooser`-Event nötig. **„Echter
  Datei-Upload“** im Sinne der Anforderung (Abschnitt 5, Testfall 9/10/12) ist damit erfüllt.
- Export/Download: `const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportieren' }).click(); const download = await downloadPromise; const buf = await fs.readFile((await download.path())!)`.
- **Unabhängiger Parser** (Anforderung Abschnitt 4.1 Punkt 1: „mit einem unabhängigen Parser … verifizieren“):
  `JSZip.loadAsync(buffer)` + rohes XML-String-/Regex-Parsen — **kein** Aufruf einer eigenen
  `reader.ts`-Funktion der App in Abschnitt B. Für exakte **Zählungen**
  (`<w:footnoteReference`, `<w:footnote`, `<text:note`) wird **nicht** `toContain` verwendet, sondern
  `(xml.match(/<w:footnoteReference\b/g) ?? []).length`.
- Alle in diesem Plan referenzierten realen Testkorpus-Dateien liegen bereits im Repo unter
  `tests/fixtures/external/docx/{footnotes,table_footnotes,form_footnotes}.docx` und
  `tests/fixtures/external/odt/footnote.odt` — **keine** neuen Dateien müssen beschafft werden.

---

## 2. Abschnitt A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT), Schema, Commands, Sync-Plugin

Abschnitt A deckt die Anforderung an „Unit-Tests“ ab (Anforderung Zeile 11, Testmatrix-Spalte „Unit“) und
schafft die Grundlage, auf der Abschnitt B (echte Browser-Bedienung) aufbaut. **Kein** Test in Abschnitt A
ersetzt einen Test aus Abschnitt B — Reihenfolge/Nummerierungslogik z. B. wird hier auf reiner
Datenebene geprüft, das tatsächliche Klicken/Tippen im Browser separat in B.

### A.1 Bestehende Baseline (muss weiterhin grün bleiben, Regressionsschutz)

| Datei | Tests | Erwartung |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` (alle bestehenden `describe`-Blöcke: headings, alignment, text formatting, lists, tables, images, header/footer/metadata, whole-document fidelity) | Alle bestehenden Tests | Bleiben unverändert grün, **insbesondere** nach der Schema-Änderung `doc: 'block+'` → `doc: 'block+ footnotes_area?'` (Code-Plan Abschnitt 3.1/3.2) — der `doc()`-Test-Helper (Zeile 8–15) erzeugt weiterhin Dokumente ohne `footnotes_area`, was laut geändertem Content-Ausdruck weiterhin gültig sein muss |
| `src/formats/odt/__tests__/roundtrip.test.ts` (alle bestehenden Blöcke) | Alle bestehenden Tests | Analog, bleiben grün |
| `tests/e2e/docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`, `lifecycle.spec.ts` | Alle bestehenden Tests | Bleiben unverändert grün — insbesondere, weil die neuen Keymap-Einträge (`Backspace`/`Delete` in `WordEditor.tsx`, Code-Plan Abschnitt 5.1) **vor** `keymap(baseKeymap)` eingehängt werden: für jeden Nicht-Fußnoten-Fall liefern `deleteFootnoteAdjacent(±1)` `false` zurück, wodurch ProseMirror automatisch zum unveränderten `baseKeymap`-Verhalten durchreicht (kein Regressionsrisiko für normales Löschen von Text/Listen/Tabellenzellen) — **muss QA explizit durch einen gezielten Test verifizieren**, siehe A.2 |

### A.2 Neu: `src/formats/shared/editor/__tests__/footnotes.test.ts`

Reine State-/Command-Ebene (`EditorState.create` + `.apply`), kein Browser, aber mit **exakten**
Positions-/Struktur-Assertions (nicht nur „Dokument hat sich verändert“):

| Testname | Vorgehen | Assertion |
|---|---|---|
| `insertFootnote() fügt Referenz und leeren Eintrag in einer Transaktion ein` | Leeres Dokument, Cursor am Ende, `insertFootnote()(state, dispatch)` | Ergebnisdoc enthält genau einen `footnote_reference`-Knoten und, als **letztes Kind von `doc`**, einen `footnotes_area`-Knoten mit genau einem `footnote_item`, dessen `id`-Attribut mit dem der Referenz übereinstimmt; **eine einzige** resultierende Transaktion (kein zweiter `dispatch`-Aufruf) |
| `Cursor landet direkt hinter der neu eingefügten Referenz` | Wie oben, danach `tr.selection` prüfen | `selection.empty === true`, `selection.from` ist exakt die Position direkt nach dem `footnote_reference`-Knoten (nicht davor, nicht im `footnotes_area`-Bereich) — bestätigt Anforderung 2.1 und die im Code-Plan Abschnitt 0 zitierte `replaceSelectionWith`-Analyse |
| `zweimaliges Aufrufen erzeugt zwei verschiedene, deterministische IDs` | `insertFootnote()` zweimal auf fortlaufend aktualisiertem State aufrufen | Zwei `footnote_reference`-Knoten mit **unterschiedlichen** `id`-Werten; **erneuter** Testlauf mit demselben Ausgangsdokument liefert **dieselben** IDs (`"new1"`, `"new2"`) — Nachweis, dass `nextFootnoteId()` **kein** `Math.random()` verwendet (Grenzfall 3.15) |
| `nextFootnoteId() überspringt bereits vorhandene newN-IDs` | Dokument mit vorhandenem `footnote_reference`-Knoten `id: "new1"`, danach `insertFootnote()` | Neue ID ist `"new2"`, nicht `"new1"` (keine Kollision) |
| `deleteFootnoteAdjacent(1) (Delete) direkt vor der Referenz entfernt sie in einem Schritt` | Cursor direkt vor einer Referenz, `deleteFootnoteAdjacent(1)(state, dispatch)` | Referenz aus dem Fließtext verschwunden; `dispatch` wurde mit **einer** Transaktion aufgerufen (Löschung von `from`..`to` exakt der Knotengröße der Referenz, nicht mehr/weniger) |
| `deleteFootnoteAdjacent(-1) (Backspace) direkt hinter der Referenz entfernt sie in einem Schritt` | Analog rückwärts | wie oben |
| `NodeSelection auf der Referenz + deleteFootnoteAdjacent entfernt sie ebenso` | Referenz per `NodeSelection` selektiert (simuliert „Klick auf die Marke“), `deleteFootnoteAdjacent(1)(state, dispatch)` | Referenz entfernt |
| `deleteFootnoteAdjacent liefert false, wenn keine Referenz angrenzt` | Cursor zwischen zwei normalen Buchstaben, `deleteFootnoteAdjacent(±1)(state)` ohne `dispatch` | Rückgabewert `false` — **Regressionsschutz**: bestätigt, dass normales Zeichen-Backspace/Delete an `baseKeymap` durchgereicht wird (siehe A.1, letzte Zeile) |
| `createFootnoteSyncPlugin(): Löschen des gesamten Absatzes mit der Referenz entfernt den zugehörigen Eintrag (Grenzfall 3.4)` | Dokument mit Absatz „Text[ref]“ + `footnotes_area`; Transaktion, die den kompletten Absatz löscht (`tr.delete` über den ganzen Absatzbereich), durch `EditorState.apply` geschickt (damit `appendTransaction` greift) | Resultierender State hat **keinen** `footnotes_area`-Knoten mehr (letzte Referenz war die einzige) bzw. der zugehörige `footnote_item` fehlt, falls weitere Referenzen bestehen bleiben |
| `createFootnoteSyncPlugin(): Umsortierung nach Verschieben von Text (Grenzfall 3.5/2.6)` | Zwei Referenzen `A` (id `"x"`) vor `B` (id `"y"`) im Text; Transaktion, die die Textreihenfolge vertauscht, sodass `y` jetzt vor `x` in Lesereihenfolge steht | `footnotes_area`-Kinder-Reihenfolge nach `appendTransaction` ist `[y, x]` (Anzeigenummer wird separat in `footnoteDisplay.ts` berechnet, hier wird nur die interne Reihenfolge der `footnote_item`-Kinder geprüft) |
| `createFootnoteSyncPlugin(): tr.setMeta('uiEvent','cut') markierte Löschung entfernt den Eintrag NICHT sofort (Entscheidung 1.6)` | Referenz per `cut`-markierter Transaktion entfernt | `footnotes_area` enthält den zugehörigen `footnote_item` **weiterhin** unmittelbar nach dieser einen Transaktion |
| `createFootnoteSyncPlugin(): nach cut folgt ohne erneutes Auftauchen der Referenz eine normale (nicht-cut) Änderung → Eintrag wird entfernt` | Auf obigen `cut`-Zustand folgt eine weitere, **nicht** als `cut` markierte Transaktion, die die Referenz weiterhin nicht enthält | `footnote_item` jetzt entfernt — bestätigt den in Entscheidung 1.6 beschriebenen „Gnadenzeitraum“ konkret, nicht nur behauptet |
| `createFootnoteSyncPlugin(): defekte/fehlende Zuordnung erhält Platzhaltertext (Grenzfall 3.14)` | `footnote_reference` mit `id` existiert im Text, aber **kein** passender `footnote_item` in `footnotes_area` (synthetisch konstruiert) | Nach `appendTransaction` existiert ein `footnote_item` mit dieser `id`, dessen Textinhalt `FOOTNOTE_PLACEHOLDER_TEXT` (`"[fehlender Fußnotentext]"`) entspricht |
| `createFootnoteSyncPlugin() ist ein No-Op, wenn bereits synchron (Performance, Grenzfall 3.8)` | Dokument mit 50 bereits korrekt synchronisierten Referenzen/Einträgen, eine inhaltlich irrelevante Transaktion (z. B. reine Formatierungsänderung außerhalb der Fußnoten) | `appendTransaction` liefert `null` zurück (kein zusätzlicher Schritt) — per Spy/Wrapper um `appendTransaction` nachgewiesen, nicht nur indirekt vermutet |
| `Duplizierte Referenz-ID (Kopieren, Grenzfall 3.6): beide Referenzen zeigen weiterhin auf einen gemeinsamen Eintrag, Löschen einer der beiden lässt ihn bestehen` | Zwei `footnote_reference`-Knoten mit **identischer** `id` im Dokument, `footnotes_area` mit einem passenden Eintrag; eine der beiden Referenzen wird gelöscht | `footnote_item` mit dieser `id` bleibt **erhalten** (da die verbleibende Referenz sie weiterhin referenziert) — Nachweis der in Entscheidung 1.5 dokumentierten, bewusst vereinfachten Abweichung von Word |

### A.3 Neu: Schema-Tests (Datei `footnotes.test.ts` erweitert, oder `src/formats/shared/schema.test.ts`, falls vorhanden)

| Testname | Vorgehen | Assertion |
|---|---|---|
| `doc akzeptiert ein Dokument mit footnotes_area als letztem Kind` | `wordSchema.nodeFromJSON({ type: 'doc', content: [paragraph, footnotesArea] })` | Kein Wurf einer `RangeError`/Validierungsfehler |
| `doc akzeptiert weiterhin ein Dokument ganz ohne footnotes_area` | Wie bisher (`doc: 'block+'`-kompatibel) | Kein Fehler — Regressionsschutz für A.1 |
| `doc lehnt footnotes_area an einer anderen Position als der letzten ab` (falls Schema das strukturell erzwingt) | `footnotes_area` vor einem `paragraph` platziert | Wurf eines Validierungsfehlers **oder** explizit dokumentiert, falls das Schema dies nicht erzwingt (`footnotes_area?` als optionales, aber nicht zwingend *letztes* Element je nach exakter Grammatik — von QA gegen die tatsächliche Content-Expression zu prüfen, nicht anzunehmen) |
| `footnote_reference ist atom/selectable/inline` | `wordSchema.nodes.footnote_reference.spec` inspizieren | `inline === true`, `atom === true`, `selectable === true` |
| `footnote_item.content erlaubt mehrere Absätze` (Anforderung 2.5) | `footnote_item.create({id:'x'}, [paragraph('A'), paragraph('B')])` | Kein Fehler, `childCount === 2` |
| `footnote_item.content erlaubt (unterstützt, crasht aber nicht bei) Tabelle/Bild (Grenzfall 3.11)` | `footnote_item.create({id:'x'}, [tableNode])` | Kein Wurf — bestätigt die bewusste, dokumentierte Nicht-Absturz-Garantie aus Code-Plan Abschnitt 1.11 |

### A.4 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` — neuer Block `describe('DOCX round trip: footnotes', …)`

```ts
it('exports a single footnote reference and its text (Anforderung 4.1.1)', async () => {
  const original = doc([
    paragraph('Text mit Marke'), // enthält footnote_reference inline — Helper ggf. erweitert
  ])
  // ... konkretes JSON mit footnote_reference{id:'a'} im Absatz + footnotes_area/footnote_item{id:'a'} mit "Testfußnote eins"
  const { xml } = await writeDocxRaw(original) // roher document.xml + footnotes.xml, analog roundTripRaw aus tabelle-einfuegen-qa.md
  expect((xml.documentXml.match(/<w:footnoteReference\b/g) ?? []).length).toBe(1)
  expect(xml.footnotesXml).toMatch(/<w:footnote w:id="1">[\s\S]*Testfußnote eins[\s\S]*<\/w:footnote>/)
})

it('re-importing the exported file yields an identical reference, number 1, and identical text (4.1.2)', async () => {
  const roundTripped = await roundTrip(original)
  // footnote_reference an derselben Stelle, footnotes_area/footnote_item-Text identisch zu "Testfußnote eins"
})

it('two footnotes keep correct order and text after round trip (4.1.3)', async () => { /* ids in Textreihenfolge, xmlId 1 und 2 */ })

it('formatting (italic) inside the footnote text survives the round trip (4.1.5)', async () => {
  // footnote_item.content = [paragraph mit marks: [{type:'em'}]]
  // document.xml bzw. footnotes.xml enthält <w:i/> am erwarteten Lauf
})

it('an empty footnote text exports a valid, non-crashing <w:footnote> (Grenzfall 3.12)', async () => {
  // footnote_item.content = [paragraph('')]
  // kein Wurf, footnotesXml enthält <w:footnote w:id="1"><w:p>...</w:p></w:footnote> mit leerem Lauf, kein malformed XML
})

it('a footnote reference inside a table cell round-trips (synthetic, Grenzfall 3.9)', async () => {
  // table_cell.content = [paragraph mit footnote_reference]
  // xmlIds/footnotes.xml enthalten den Eintrag trotz Zellposition
})

it('a multi-paragraph footnote text with a hard_break survives the round trip (Grenzfall 3.13)', async () => {
  // footnote_item.content = [paragraph('Zeile1<br/>Zeile2'), paragraph('Zweiter Absatz')]
  // <w:br/> und beide Absätze im footnotes.xml wiedergefunden
})

it('exported w:id values are fresh sequential integers regardless of internal id shape (Entscheidung 1.3)', async () => {
  // interne id "ftn0" (wie aus ODT importiert) -> exportiertes w:id ist eine valide Ganzzahl, NICHT "ftn0"
  expect(xml.footnotesXml).toMatch(/<w:footnote w:id="\d+">/)
  expect(xml.footnotesXml).not.toContain('w:id="ftn0"')
})

it('word/footnotes.xml contains the required separator/continuationSeparator boilerplate entries', async () => {
  expect(xml.footnotesXml).toContain('w:type="separator"')
  expect(xml.footnotesXml).toContain('w:type="continuationSeparator"')
})

it('Content-Types override for /word/footnotes.xml is present only when footnotes exist', async () => {
  // Dokument OHNE footnotes_area exportieren -> kein Override, kein footnotes.xml im Zip
  // Dokument MIT footnotes_area -> Override vorhanden
})

it('the footnotes relationship is registered only when footnotes exist', async () => {
  // document.xml.rels enthält .../relationships/footnotes nur wenn readingOrderIds.length > 0
})
```

### A.5 Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts` — neuer Block `describe('ODT round trip: footnotes', …)`

```ts
it('exports a complete <text:note> with citation and body (Anforderung 4.2.1)', async () => {
  const contentXml = await exportOdtRaw(original)
  expect(contentXml).toMatch(/<text:note text:id="[^"]+" text:note-class="footnote">/)
  expect(contentXml).toMatch(/<text:note-citation>1<\/text:note-citation>/)
  expect(contentXml).toMatch(/<text:note-body>[\s\S]*Testfußnote eins[\s\S]*<\/text:note-body>/)
})

it('re-importing yields identical reference, number, and text (4.2.2)', async () => { /* wie A.4 analog */ })
it('two footnotes keep order and numbering (4.2.3)', async () => { /* text:note-citation 1 und 2 in Reihenfolge */ })
it('formatting inside the footnote text survives the round trip (4.2.5)', async () => { /* <text:span text:style-name="..."> mit Kursiv-Eigenschaft */ })

it('styles.xml contains <text:notes-configuration> for footnotes', async () => {
  const stylesXml = await exportOdtStylesRaw(original)
  expect(stylesXml).toMatch(/<text:notes-configuration text:note-class="footnote"[^/]*\/>/)
})

it('exported text:id never starts with a digit, regardless of internal id shape (Entscheidung 1.3)', async () => {
  // interne id "1" (wie aus DOCX importiert) -> exportiertes text:id ist z.B. "ftn1", NICHT "1"
  expect(contentXml).toMatch(/text:id="ftn1"/)
  expect(contentXml).not.toMatch(/text:id="1"/)
})

it('Cross-Format: DOCX with a footnote imported, then exported as ODT, keeps the footnote (4.1.6)', async () => {
  const docxDoc = doc([/* footnote_reference + footnotes_area, wie aus writeDocx/readDocx erzeugt */])
  const imported = await roundTripDocx(docxDoc) // readDocx(await writeDocx(docxDoc))
  const odtContentXml = await exportOdtRaw(imported)
  expect(odtContentXml).toContain('Testfußnote eins')
  expect(odtContentXml).toMatch(/<text:note text:note-class="footnote">/)
})

it('Cross-Format: ODT with a footnote imported, then exported as DOCX, keeps the footnote (4.2.6)', async () => {
  const odtDoc = doc([/* … */])
  const imported = await roundTripOdt(odtDoc) // writeOdt/readOdt
  const docxXml = (await writeDocxRaw(imported)).documentXml
  expect(docxXml).toContain('Testfußnote eins')
})

it('Doppelte Rundreise DOCX→ODT→DOCX behält den Fußnotentext (Anforderung 4.3.1)', async () => {
  // writeDocx -> readDocx -> writeOdt -> readOdt -> writeDocx -> readDocx, Text bleibt exakt erhalten
})
it('Doppelte Rundreise ODT→DOCX→ODT behält den Fußnotentext (Anforderung 4.3.2)', async () => {
  // analog umgekehrt
})
```

*Hinweis:* `writeDocxRaw`/`exportOdtRaw`/`exportOdtStylesRaw` sind kleine, non-invasive Erweiterungen der
bestehenden Test-Helper (liefern zusätzlich das rohe XML statt nur das rundgereiste JSON) — analog zum in
`tabelle-einfuegen-qa.md` Abschnitt A.4 bereits etablierten Muster (`roundTripRaw`).

### A.6 Neu: gezielte externe-Fixture-Tests

| Datei | Testfälle |
|---|---|
| `src/formats/docx/__tests__/external-fixtures.test.ts` | `footnotes.docx` importieren → genau **eine** Fußnote im `footnotes_area`, Text enthält „snoska“; reexportieren + reimportieren → Text weiterhin „snoska“ vorhanden, keine verwaisten Einträge (Testfall 12, Anforderung 4.1.4). `table_footnotes.docx` importieren → Fußnotenreferenz wird trotz Tabellenzell-Position gefunden (Grenzfall 3.9, real belegt); reexportieren + reimportieren → Text erhalten. **Zusätzlich** (über den Code-Plan hinaus, siehe Abschnitt 0 dieses Plans): `form_footnotes.docx` importieren → mindestens eine Fußnote erkannt, keine Exception, reexportieren + reimportieren verlustfrei. |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | `footnote.odt` importieren → **genau eine** Fußnote (nicht zwei — die Endnote im selben Dokument darf **nicht** mitgezählt werden, Grenzfall 3.18), Text „A footnote?“; reexportieren + reimportieren → weiterhin genau eine Fußnote mit identischem Text, Endnote bleibt getrennt (mindestens keine Fehlklassifizierung — Klartext-Fallback `[Endnote: …]` falls implementiert, sonst dokumentierter Verlust außerhalb des Geltungsbereichs) |

### A.7 Grenzfall-/Robustheits-Unit-Tests (defekte Fremddateien, Kollisionen)

| Testname | Vorgehen | Assertion |
|---|---|---|
| `readDocx: <w:footnoteReference w:id="7"/> ohne passenden <w:footnote w:id="7"> stürzt nicht ab (Grenzfall 3.14)` | Hand-gebautes DOCX (`JSZip`, analog `buildSampleDocx()` in `docx.spec.ts`) mit Referenz auf eine nicht existierende ID | `readDocx()` wirft **nicht**; resultierendes Dokument enthält einen `footnote_item` mit `FOOTNOTE_PLACEHOLDER_TEXT` |
| `readOdt: <text:note> ohne <text:note-body> stürzt nicht ab (Grenzfall 3.14)` | Hand-gebautes ODT ohne `note-body`-Kind | `readOdt()` wirft **nicht**; Platzhaltertext im Ergebnis |
| `readDocx: word/footnotes.xml fehlt komplett, obwohl <w:footnoteReference> im Text steht` | ZIP ohne `word/footnotes.xml`-Part | Kein Absturz, Platzhaltertext |
| `Zwei neu im Editor eingefügte Fußnoten in großer Zahl (100) erzeugen niemals kollidierende interne IDs (Grenzfall 3.15)` | 100× `insertFootnote()` in Folge auf demselben, sich entwickelnden State | `new Set(alleIds).size === 100` |
| `readDocx/readOdt: word/endnotes.xml bzw. text:note-class="endnote" wird nicht als Fußnote interpretiert (Grenzfall 3.18)` | Fixture mit Endnote (`footnote.odt` für ODT; für DOCX ein hand-gebautes Dokument mit `<w:endnoteReference>`) | Resultierender `footnotes_area` enthält **keinen** Eintrag für die Endnote; falls der empfohlene Klartext-Fallback (Code-Plan Abschnitt 1.9) umgesetzt ist: Haupttext enthält `[Endnote: …]` als reinen Text, **kein** `footnote_reference`-Knoten dafür |

### A.8 Erwartungs-Matrix Abschnitt A (Baseline heute vs. nach Umsetzung)

| Test (Kurzform) | Status **heute** (vor Umsetzung) | Status **nach** Umsetzung gemäß `fussnote-einfuegen-code.md` |
|---|---|---|
| A.2 (Commands/Sync-Plugin) | Kann nicht existieren — Datei/Funktionen fehlen vollständig | Muss grün sein |
| A.3 (Schema) | Kann nicht existieren — Knotentypen fehlen | Muss grün sein |
| A.4 (DOCX-Rundreise Fußnoten) | Kann nicht existieren — `writeDocx`/`readDocx` kennen keine Fußnoten | Muss grün sein |
| A.5 (ODT-Rundreise Fußnoten) | Kann nicht existieren | Muss grün sein |
| A.6 (externe Fixtures) | Rot/nicht ausführbar — Import verwirft Fußnoten heute lautlos (Anforderung Zeile 51/53) | Muss grün sein |
| A.7 (Grenzfälle/Robustheit) | Kann nicht existieren | Muss grün sein |

---

## 3. Abschnitt B — E2E-Tests (echte Playwright-Browser-Bedienung)

Alle Tests in diesem Abschnitt verwenden **ausschließlich** echte Nutzerinteraktion: `page.click()`,
`page.keyboard.type()`/`.press()`, `input.setInputFiles()`, `page.waitForEvent('download')` + tatsächliches
Einlesen der heruntergeladenen Datei von der Festplatte. **Kein** Test in diesem Abschnitt ruft
`insertFootnote()`, `nextFootnoteId()`, `createFootnoteSyncPlugin()` oder einen anderen internen
Funktions-/Command-Export direkt auf — das ist bewusst Abschnitt A vorbehalten. Genau das verlangt die
Anforderung ausdrücklich („nicht nur interne Funktionsaufrufe“, Zeile 11 der Anforderung).

### B.0 Gemeinsame Helper

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
async function openNewDocxEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
}
async function openNewOdtEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
}
async function insertFootnoteViaToolbar(page: Page) {
  await page.getByRole('button', { name: 'Fußnote einfügen' }).click()
}
function footnoteRefs(page: Page) {
  return page.locator('.ProseMirror sup.footnote-ref')
}
function footnoteItems(page: Page) {
  return page.locator('.ProseMirror .footnote-item')
}
```

Selektoren aus `fussnote-einfuegen-code.md` Abschnitt 3.1/5.2 übernommen (`sup.footnote-ref`,
`.footnote-item`, Button-Zugriffsname „Fußnote einfügen“) — bei Abweichung der tatsächlichen Umsetzung
entsprechend anzupassen (siehe Abschnitt 0 dieses Plans).

### B.1 Neue Datei `tests/e2e/footnote-insert.spec.ts` — Grundverhalten, Nummerierung, Undo/Redo, Navigation, Grenzfälle

Deckt Anforderung Abschnitt 5, Testfälle 1–8, 14, 16 sowie Abschnitt 2.9 (Begriffsabgrenzung).

| # (Anforderung §5) | Testname | Kernschritte | Assertion |
|---|---|---|---|
| — (Vorbedingung) | `the toolbar exposes a "Fußnote einfügen" button distinct from any footer control (Anforderung 2.9)` | `openNewDocxEditor(page)` | `page.getByRole('button', { name: 'Fußnote einfügen' })` ist sichtbar und **eindeutig** (`toHaveCount(1)`); sichtbarer Button-Text ist „Fußnote“ (nicht nur ein Icon); es existiert **kein** Button mit `name`/Text, der den Wortstamm „Fußzeile“ trägt (`page.getByRole('button', { name: /fußzeile/i })` → `toHaveCount(0)`, da diese Funktion laut Anforderung ohnehin noch nicht existiert) |
| 1 | `clicking "Fußnote einfügen" shows a superscript "1" and an editable footnote area` | `page.locator('.ProseMirror').click()`, `insertFootnoteViaToolbar(page)` | `footnoteRefs(page)` hat Count 1, Text `"1"`; `footnoteItems(page)` hat Count 1 und ist sichtbar (`toBeVisible()`) |
| 2 | `typing into the footnote area puts the text there, not in the main document` | Wie oben, dann `footnoteItems(page).first().locator('.footnote-item-body').click()`, `page.keyboard.type('Testfußnote eins')` | `footnoteItems(page).first()` enthält „Testfußnote eins“; der **Hauptabsatz** (`.ProseMirror > p` bzw. das erste Top-Level-Element) enthält den Text **nicht** |
| 3 | `inserting a second footnote before the first renumbers both correctly (Anforderung 2.6)` | Text „AB“ tippen, Cursor zwischen A/B (Home, `ArrowRight`), erste Fußnote einfügen und Text „Erste“ eintippen, danach Cursor an den **Anfang** des Dokuments setzen (`ControlOrMeta+Home`) und **dort** eine zweite Fußnote einfügen mit Text „Zweite“ | `footnoteRefs(page).nth(0)` zeigt `"1"` (die neu eingefügte, vor der ersten liegende), `footnoteRefs(page).nth(1)` zeigt `"2"`; `footnoteItems(page).nth(0)` enthält „Zweite“, `footnoteItems(page).nth(1)` enthält „Erste“ — Reihenfolge in `footnotes_area` folgt der Lesereihenfolge im Text, nicht der Einfüge-Reihenfolge |
| 4 | `deleting a footnote reference removes it and its text, renumbering the rest (Anforderung 2.7)` | Zwei Fußnoten wie oben, Klick auf die **erste** Referenzmarke im Text (setzt `NodeSelection`), `Delete` drücken | `footnoteRefs(page)` hat danach Count 1 und zeigt `"1"` (vormals „2“, jetzt neu nummeriert); `footnoteItems(page)` hat Count 1 mit dem Text der vormals zweiten Fußnote; der Text der gelöschten Fußnote ist **nirgends** mehr im DOM vorhanden |
| 5 | `Ctrl+Z right after inserting removes both the reference and the footnote area` | Text „Vorher.“ tippen, Fußnote einfügen, `ControlOrMeta+z` | `footnoteRefs(page)` Count 0, `footnoteItems(page)` Count 0, `.ProseMirror .footnote-area` nicht mehr im DOM (ganzer Bereich entfernt, nicht nur geleert); `.ProseMirror` enthält weiterhin „Vorher.“ |
| 6 | `Ctrl+Shift+Z restores the (empty) footnote after an undo` | Fortsetzung von Testfall 5, danach `ControlOrMeta+Shift+z` | `footnoteRefs(page)` Count 1 (Text `"1"`), `footnoteItems(page)` Count 1, Fußnotentext leer (kein Text außer ggf. Platzhalter-Whitespace) |
| 7 | `bold applied inside the footnote area renders correctly (Anforderung 2.5)` | In den Fußnotentext-Bereich klicken, Text „Fett“ tippen, `ControlOrMeta+a` **innerhalb** des Fußnotentext-Bereichs (nicht des ganzen Dokuments — Selektion per Dreifachklick auf den Fußnotentext-Absatz), `ControlOrMeta+b` bzw. Toolbar-Button „Fett“ | `footnoteItems(page).first().locator('strong, b')` enthält „Fett“ |
| 8 | `arrow-key navigation skips over the reference as a single atomic step (Anforderung 2.4)` | Text „A“ tippen, Fußnote einfügen (Cursor jetzt direkt hinter der Referenz), Text „B“ tippen (Ergebnis „A[ref]B“), `Home` drücken, dann **genau einmal** `ArrowRight` drücken, dann `X` tippen | `.ProseMirror`-Absatz-Text (ohne die Fußnoten-Ziffer) ist „AXB“, **nicht** „AXB“ mit `X` versehentlich vor der Referenz stehen geblieben oder die Referenz „zerteilt“ — konkret: `X` erscheint **zwischen** Referenz und „B“, was nur möglich ist, wenn der eine `ArrowRight`-Druck den gesamten Atom-Knoten in einem Schritt übersprungen hat |
| 8b | `Shift+ArrowRight over the reference selects it as a whole (Anforderung 2.4, Grenzfall 4)` | „A[ref]B“, Cursor vor der Referenz (`Home` + einmal `ArrowRight` reicht, um vor die Referenz zu kommen — je nach Ausgangslage anzupassen), `Shift+ArrowRight` einmal, danach `Delete` | Nach `Delete`: Referenz **und** ihr Fußnotentext-Eintrag sind vollständig weg (Count 0), „A“ und „B“ bleiben unverändert — bestätigt, dass die Selektion die atomare Einheit **vollständig** erfasste, nicht nur ein „unsichtbares“ Teilzeichen |
| 14 (Grenzfall 3.8) | `inserting 50 footnotes keeps the UI responsive and numbering correct` | 50× `insertFootnoteViaToolbar(page)` in einer Schleife (Cursor jeweils ans Dokumentende gesetzt zwischen den Klicks, `ControlOrMeta+End`) | `footnoteRefs(page)` Count 50; Texte `"1"`..`"50"` in aufsteigender Reihenfolge (`for`-Schleife über `nth(i)` → `toHaveText(String(i+1))`); die komplette Schleife läuft ohne Timeout des Test-Runners (Standard-Timeout nicht überschritten) — indirekter Reaktionsfähigkeits-Nachweis |
| 16 (Grenzfall 3.16) | `two fast real clicks insert exactly two footnotes, not one and not three` | `Promise.all([button.click(), button.click()])` (zwei native Klicks ohne `await` dazwischen) | `footnoteRefs(page)` Count **genau 2** (nicht 1 durch versehentliche Deduplizierung, nicht 3 durch doppeltes Event-Handling) |
| 15 | `clicking a reference scrolls the corresponding footnote item into view (Anforderung 2.8, optional aber laut Code-Plan umgesetzt)` | Genug Absätze tippen, damit die Fußnote weit vom Fußnotenbereich entfernt scrollt; Fußnote am Dokumentanfang einfügen, danach ans Ende scrollen; Klick auf `footnoteRefs(page).first()` | Nach dem Klick: `footnoteItems(page).first()` liegt innerhalb des sichtbaren Viewports (`await expect(footnoteItems(page).first()).toBeInViewport()`) |
| 15b | `clicking the backlink button in the footnote item scrolls back to the reference (Anforderung 2.8, Rückwärtsnavigation)` | Fortsetzung von 15, Klick auf `.footnote-item-backlink` | `footnoteRefs(page).first()` liegt im Viewport |
| — (Grenzfall 3.10) | `inserting a footnote inside a list item does not break the list` | Aufzählungsliste erzeugen, Text „ab“ tippen, Cursor zwischen a/b, Fußnote einfügen | Liste bleibt **ein** `<ul>` (nicht gesplittet); Referenzmarke liegt innerhalb desselben `<li>`; `footnotes_area` bleibt weiterhin als eigener Bereich außerhalb der Liste am Dokumentende sichtbar |
| — (Grenzfall 3.3) | `inserting a footnote at the very start/end of the document` | Neues leeres Dokument, sofort Fußnote einfügen (Dokumentanfang); separat: Text tippen, `End`, Fußnote einfügen (Dokumentende) | Kein Absturz; Cursor kann in beiden Fällen weiterhin vor/nach der Referenz positioniert und getippt werden |
| — (Grenzfall 3.1) | `inserting while text is selected replaces the selection (Anforderung 2.1)` | Text „Markiert“ tippen, `ControlOrMeta+a` (nur den Absatztext, nicht das ganze Dokument, falls das Dokument mehr enthält), Fußnote einfügen | Ursprünglicher Text „Markiert“ ist **weg**, Referenzmarke steht an dessen Stelle — bestätigt gewolltes Ersetzungsverhalten |
| — (Grenzfall 3.11) | `pasting a table into the footnote area does not crash the footnote editor` | Tabelle im Hauptdokument erzeugen, komplett markieren, kopieren (`ControlOrMeta+c`), in den Fußnotentext-Bereich klicken, einfügen (`ControlOrMeta+v`) | Keine Konsolenfehler (`page.on('console', …)`-Listener sammelt keine `'error'`-Einträge), Seite bleibt bedienbar (z. B. weiterer Text kann danach getippt werden) — **kein** Blocker, ob die Tabelle korrekt dargestellt wird, nur Absturzfreiheit ist Pflicht |
| — (Grenzfall 3.17, defensiv) | `no footnote button appears inside a not-yet-existing header/footer context` | Da `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` laut Anforderung selbst nicht existieren, ist dieser Testfall aktuell **nicht ausführbar** — als „nicht anwendbar, bis Fußzeilen-Feature existiert“ im Abnahmeprotokoll (Abschnitt D) zu vermerken, nicht stillschweigend auszulassen |

### B.2 Neue Datei `tests/e2e/footnote-roundtrip.spec.ts` — Rundreise DOCX/ODT/Cross-Format über echten Upload/Export

Deckt Anforderung Abschnitt 4 (komplett) und Abschnitt 5, Testfälle 9–13.

```ts
test('DOCX: a footnote inserted via toolbar round-trips through export/re-import with an independent parser (4.1.1/4.1.2)', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Text vor der Marke.')
  await insertFootnoteViaToolbar(page)
  await footnoteItems(page).first().locator('.footnote-item-body').click()
  await page.keyboard.type('Testfußnote eins')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // Unabhängiger Parser: JSZip + rohes XML
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  const footnotesXml = await zip.file('word/footnotes.xml')!.async('text')

  expect((documentXml.match(/<w:footnoteReference\b/g) ?? []).length).toBe(1)
  const idMatch = documentXml.match(/<w:footnoteReference w:id="(\d+)"\/>/)
  expect(idMatch).toBeTruthy()
  expect(footnotesXml).toMatch(new RegExp(`<w:footnote w:id="${idMatch![1]}">[\\s\\S]*Testfußnote eins`))

  // Re-Import (4.1.2)
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'export.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(footnoteRefs(page)).toHaveText(['1'])
  await expect(footnoteItems(page).first()).toContainText('Testfußnote eins')
})

test('DOCX: two footnotes preserve order and text after export/re-import (4.1.3)', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await insertFootnoteViaToolbar(page)
  await footnoteItems(page).first().locator('.footnote-item-body').click()
  await page.keyboard.type('Erste')
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('ControlOrMeta+End')
  await insertFootnoteViaToolbar(page)
  await footnoteItems(page).nth(1).locator('.footnote-item-body').click()
  await page.keyboard.type('Zweite')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(buffer)
  const footnotesXml = await zip.file('word/footnotes.xml')!.async('text')
  const order = ['Erste', 'Zweite'].map((t) => footnotesXml.indexOf(t))
  expect(order[0]).toBeGreaterThan(-1)
  expect(order[1]).toBeGreaterThan(order[0])

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'zwei.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(footnoteRefs(page)).toHaveText(['1', '2'])
  await expect(footnoteItems(page).nth(0)).toContainText('Erste')
  await expect(footnoteItems(page).nth(1)).toContainText('Zweite')
})

test('DOCX: a real foreign file with footnotes (footnotes.docx) round-trips without loss (4.1.4, Testfall 12)', async ({ page }) => {
  await openNewDocxEditor(page) // Karte anzeigen, dann direkt hochladen statt "Neu erstellen"
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const fixtureBuffer = await fs.readFile(path.resolve('tests/fixtures/external/docx/footnotes.docx'))
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'footnotes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: fixtureBuffer })

  await expect(footnoteRefs(page)).toHaveCount(1)
  await expect(footnoteItems(page).first()).toContainText('snoska')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exportedBuffer = await fs.readFile((await (await downloadPromise).path())!)

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input2 = docxCard(page).locator('input[type="file"]')
  await input2.setInputFiles({ name: 're-import.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: exportedBuffer })
  await expect(footnoteRefs(page)).toHaveCount(1)
  await expect(footnoteItems(page).first()).toContainText('snoska')
})

test('DOCX: a footnote reference inside a table cell survives real upload/export (table_footnotes.docx, Grenzfall 3.9)', async ({ page }) => {
  // analog zu obigem Test, mit tests/fixtures/external/docx/table_footnotes.docx
  // Assertion: footnoteRefs(page) Count >= 1, Tabelle bleibt sichtbar, Reexport verliert die Fußnote nicht
})

test('ODT: a footnote inserted via toolbar round-trips through export/re-import (4.2.1/4.2.2)', async ({ page }) => {
  await openNewOdtEditor(page)
  await page.locator('.ProseMirror').click()
  await insertFootnoteViaToolbar(page)
  await footnoteItems(page).first().locator('.footnote-item-body').click()
  await page.keyboard.type('Testfußnote eins')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(buffer)
  const contentXml = await zip.file('content.xml')!.async('text')

  expect(contentXml).toMatch(/<text:note[^>]*text:note-class="footnote"[^>]*>/)
  expect(contentXml).toMatch(/<text:note-citation>1<\/text:note-citation>/)
  expect(contentXml).toContain('Testfußnote eins')

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'export.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
  await expect(footnoteRefs(page)).toHaveText(['1'])
  await expect(footnoteItems(page).first()).toContainText('Testfußnote eins')
})

test('ODT: a real foreign file with a footnote AND an endnote (footnote.odt) keeps exactly one footnote after round trip (4.2.4, Grenzfall 3.18)', async ({ page }) => {
  await openNewOdtEditor(page)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const fixtureBuffer = await fs.readFile(path.resolve('tests/fixtures/external/odt/footnote.odt'))
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'footnote.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: fixtureBuffer })

  await expect(footnoteRefs(page)).toHaveCount(1) // NICHT 2 — die Endnote darf nicht mitgezählt werden
  await expect(footnoteItems(page).first()).toContainText('A footnote?')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exportedBuffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const contentXml = await zip.file('content.xml')!.async('text')
  expect((contentXml.match(/text:note-class="footnote"/g) ?? []).length).toBe(1)

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input2 = odtCard(page).locator('input[type="file"]')
  await input2.setInputFiles({ name: 're-import.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: exportedBuffer })
  await expect(footnoteRefs(page)).toHaveCount(1)
  await expect(footnoteItems(page).first()).toContainText('A footnote?')
})

test('Cross-Format: ODT footnote imported, exported as DOCX, keeps content (4.1.6)', async ({ page }) => {
  // footnote.odt auf ODT-Karte hochladen, dann Cross-Format-Export als DOCX (tatsächlicher Bedienweg der App
  // bei Umsetzung zu verifizieren, analog Hinweis in tabelle-einfuegen-qa.md B.8) -> word/document.xml und
  // word/footnotes.xml enthalten "A footnote?"
})

test('Cross-Format: DOCX footnote imported, exported as ODT, keeps content (4.2.6)', async ({ page }) => {
  // footnotes.docx hochladen, als ODT exportieren -> content.xml enthält "snoska"
})

test('Cross-Format double round trip: DOCX -> ODT -> DOCX keeps footnote text (4.3.1)', async ({ page }) => {
  // footnotes.docx hochladen -> als ODT exportieren -> diese ODT-Datei erneut hochladen -> als DOCX exportieren
  // -> word/footnotes.xml enthält weiterhin "snoska"; Nummerierungs-/Formatvorlagen-Feinheiten dürfen
  // abweichen (Anforderung Zeile 342-343), dafür KEINE eigene Assertion
})

test('Cross-Format double round trip: ODT -> DOCX -> ODT keeps footnote text (4.3.2)', async ({ page }) => {
  // footnote.odt hochladen -> als DOCX exportieren -> erneut hochladen -> als ODT exportieren
  // -> content.xml enthält weiterhin "A footnote?"
})

test('deleting the whole paragraph containing a reference removes the orphaned footnote after re-import (Testfall 13, Grenzfall 3.4)', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Zu löschender Satz')
  await insertFootnoteViaToolbar(page)
  await page.keyboard.press('Home')
  await page.keyboard.down('Shift')
  await page.keyboard.press('End')
  await page.keyboard.up('Shift')
  await page.keyboard.press('Delete')
  await expect(footnoteRefs(page)).toHaveCount(0)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(buffer)
  const footnotesXmlFile = zip.file('word/footnotes.xml')
  // Entweder gar kein footnotes.xml-Part mehr (keine Fußnoten mehr vorhanden) oder ein Part ohne
  // inhaltlichen Fußnoteneintrag außer der Pflicht-Boilerplate
  if (footnotesXmlFile) {
    const text = await footnotesXmlFile.async('text')
    expect((text.match(/<w:footnote w:id="\d+">/g) ?? []).length).toBe(0)
  }
})
```

---

## 4. Traceability-Matrix — Anforderung ↔ Testfall

| Anforderung | Testfall(e) in diesem Plan |
|---|---|
| §1 Zeile 65 (Toolbar-Button, eindeutige Beschriftung) | B.1 (Vorbedingung), A.2 (Button existiert nur mittelbar über `insertFootnote`-Aufruf) |
| §1 Zeile 66 (Command `insertFootnote`) | A.2 |
| §1 Zeile 67 (Schema-Knoten `footnote_reference`) | A.3 |
| §1 Zeile 68 (Datenmodell-Entscheidung) | A.3, A.1 (Regressionsschutz `documentModel.ts` unverändert) |
| §1 Zeile 69 (Nummerierung) | A.2 (`footnoteSync`-Reihenfolge), B.1 #3/#4/#14 |
| §1 Zeile 70 (Fußnotentext-Bereich) | B.1 #1/#2 |
| §1 Zeile 71 (Klick-Navigation) | B.1 #15/#15b |
| §1 Zeile 72 (Löschen mit Renumbering) | A.2, B.1 #4 |
| §1 Zeile 73 (Formatierung im Fußnotentext) | A.4/A.5 (Kursiv-Rundreise), B.1 #7 |
| §1 Zeile 74 (DOCX-Export-Struktur) | A.4, B.2 (DOCX-Tests) |
| §1 Zeile 75 (DOCX-Import) | A.4, A.6, A.7, B.2 |
| §1 Zeile 76 (ODT-Export-Struktur) | A.5, B.2 (ODT-Tests) |
| §1 Zeile 77 (ODT-Import) | A.5, A.6, A.7, B.2 |
| §1 Zeile 78 (Undo/Redo) | A.2, B.1 #5/#6 |
| §2.1 (Einfügen an Cursor-Position/Selektion) | B.1 (Grenzfall 3.1), A.2 |
| §2.2 (Nummerierung) | A.2, B.1 #3/#4/#14 |
| §2.3 (Architektur „am Seitenende“) | A.3 (Schema erlaubt `footnotes_area` als letztes `doc`-Kind), B.1 #1 (visuelle Existenz des Bereichs) |
| §2.4 (Atom-Verhalten, Cursor-Navigation) | B.1 #8/#8b |
| §2.5 (Formatierung/Mehrabsatz im Fußnotentext) | A.3, A.4, A.5, B.1 #7 |
| §2.6 (Zweite Fußnote vor bestehender) | A.2, B.1 #3 |
| §2.7 (Löschen) | A.2, B.1 #4 |
| §2.8 (Navigation) | B.1 #15/#15b |
| §2.9 (Begriffsabgrenzung) | B.1 (Vorbedingung) |
| §2.10 (Undo/Redo-Atomarität) | A.2, B.1 #5/#6 |
| §3 Grenzfall 1 (Selektion ersetzen) | B.1 |
| §3 Grenzfall 2 (zwei Fußnoten im Absatz) | A.2, B.1 #3 |
| §3 Grenzfall 3 (Dokumentanfang/-ende) | B.1 |
| §3 Grenzfall 4 (Absatz löschen) | A.2, B.2 (Testfall 13) |
| §3 Grenzfall 5 (Ausschneiden+Einfügen) | A.2 (`cut`-Gnadenzeitraum) |
| §3 Grenzfall 6 (Kopieren als Duplikat) | A.2 |
| §3 Grenzfall 7 (Undo + weiter tippen) | B.1 #5 |
| §3 Grenzfall 8 (100+ Fußnoten, Performance) | A.2, B.1 #14 |
| §3 Grenzfall 9 (Tabellenzelle) | A.3, A.4, A.6 (`table_footnotes.docx`), B.2 |
| §3 Grenzfall 10 (Listenelement) | B.1 |
| §3 Grenzfall 11 (Tabelle/Bild im Fußnotentext) | A.3, B.1 |
| §3 Grenzfall 12 (leerer Fußnotentext) | A.4 |
| §3 Grenzfall 13 (mehrere Absätze, `hard_break`) | A.4 |
| §3 Grenzfall 14 (defekte Referenz) | A.7 |
| §3 Grenzfall 15 (kollidierende IDs) | A.2, A.7 |
| §3 Grenzfall 16 (Mehrfachklick) | B.1 #16 |
| §3 Grenzfall 17 (Kopf-/Fußzeile) | B.1 (als „nicht anwendbar“ vermerkt) |
| §3 Grenzfall 18 (Fußnoten + Endnoten) | A.6, A.7, B.2 (`footnote.odt`) |
| §4.1 DOCX-Rundreise (1–6) | B.2 (DOCX-Tests), A.4 |
| §4.2 ODT-Rundreise (1–6) | B.2 (ODT-Tests), A.5 |
| §4.3 Cross-Format doppelte Rundreise | B.2, A.5 (Unit-Ebene der Cross-Format-Tests) |
| §5 Testfälle 1–15 | B.1, B.2 (siehe Kopfzeile je Unterabschnitt) |
| §6 DoD Punkt 1 (Architekturfrage 2.3 nachgetragen) | Dokumentationsprüfung (Abschnitt D) |
| §6 DoD Punkt 2 (Datenmodell-Frage entschieden/umgesetzt) | A.1, A.3 |
| §6 DoD Punkt 3 (Testfälle 1–8) | B.1 |
| §6 DoD Punkt 4 (Nummerierung, Testfälle 3–6, Grenzfälle 2/5/6) | A.2, B.1 |
| §6 DoD Punkt 5 (DOCX/ODT Export/Import, Rundreise 4.1/4.2) | A.4, A.5, B.2 |
| §6 DoD Punkt 6 (Cross-Format 4.3) | B.2, A.5 |
| §6 DoD Punkt 7 (alle Grenzfälle geprüft/dokumentiert) | A.7, B.1, Abschnitt D |
| §6 DoD Punkt 8 (Begriffsabgrenzung UI) | B.1 (Vorbedingung) |
| §6 DoD Punkt 9 (reale Fremddateien verlustfrei) | A.6, B.2 |
| §6 DoD Punkt 10 (alle §5-Testfälle grün, echte Browser-Interaktion) | gesamter Abschnitt B |

---

## 5. Abschnitt D — Abnahmeprotokoll-Vorlage

Für jeden Testfall aus Abschnitt A/B wird bei tatsächlicher Ausführung festgehalten:

| Testfall-ID | Ergebnis (Pass/Fail/Blocked/N.A.) | Datum | Ausgeführt gegen Commit/Version | Bei Fail: Fundstelle im Code | Bemerkung |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Zusätzlich, **zwingend** vor Status-Änderung „fehlt“ → „verifiziert“ (Anforderung Abschnitt 6, 10 Punkte):
- Schriftliche Bestätigung, dass die in `fussnote-einfuegen-code.md` Abschnitt 1.2 getroffene
  Architekturentscheidung (Option b, gesammelter Bereich am Dokumentende) tatsächlich so umgesetzt wurde
  **und** in `fussnote-einfuegen-req.md` Abschnitt 2.3 nachgetragen ist (DoD Punkt 1) — reine
  Dokumentationsprüfung, kein automatisierter Test.
- Schriftliche Bestätigung zu Grenzfall 3.6 (Kopieren): tatsächliches Verhalten (geteilter Text laut
  Entscheidung 1.5, A.2 letzter Testfall) entspricht der Entscheidung und ist in der Anforderungsdatei
  nachgetragen (DoD Punkt 7).
- Schriftliche Bestätigung zu Grenzfall 3.9 (Tabellenzelle): durch `table_footnotes.docx`-Testergebnis
  (A.6, B.2) real belegt, nicht nur behauptet.
- Explizite Prüfung, ob das im Code-Plan Abschnitt 3.1 selbst als **offen** markierte Detail — verschachteltes
  `contenteditable="false"`/`"true"` beim `footnotes_area`/`footnote_item`-`toDOM` — im echten Browser
  tatsächlich funktioniert (Fußnotentext editierbar, Bereich davor/dazwischen nicht) — **muss** über B.1
  Testfall 2 real nachgewiesen werden, jsdom-Unit-Tests reichen laut Code-Plan selbst ausdrücklich nicht.
- Bestätigung, dass **keine** bestehende Baseline-Testdatei (A.1) durch die Schema-/Keymap-Änderungen
  beschädigt wurde (Diff-Review der Testergebnisse vor/nach Umsetzung, nicht nur „ist grün“).

---

## 6. Abschnitt E — Baseline-Lauf (vor Umsetzung, Stand 2026-07-04)

Da die Umsetzung laut `fussnote-einfuegen-code.md` zum Zeitpunkt der Testplan-Erstellung **noch nicht**
erfolgt ist (die Anforderung selbst stellt fest: „keinerlei Vorarbeit — weder UI noch Command noch
Schema-Knoten noch Reader/Writer-Unterstützung“, Zeile 14–15), gilt für einen Testlauf gegen den heutigen
Code:

| Testgruppe | Erwartetes Ergebnis heute | Grund |
|---|---|---|
| A.1 (bestehende Unit-Tests) | Grün | Unverändert, bereits vorhanden; muss auch nach Umsetzung grün bleiben |
| A.2 (`footnotes.test.ts`, neu) | Kann nicht ausgeführt werden | `insertFootnote`/`nextFootnoteId`/`deleteFootnoteAdjacent`/`createFootnoteSyncPlugin` existieren nicht |
| A.3 (Schema-Tests, neu) | Kann nicht ausgeführt werden | `footnote_reference`/`footnote_item`/`footnotes_area` existieren nicht im Schema |
| A.4/A.5 (Writer/Reader-Rundreise, neu) | Kann nicht ausgeführt werden | `writeDocx`/`readDocx`/`writeOdt`/`readOdt` kennen keine Fußnoten-Knoten; jeder Versuch, ein Testdokument mit `footnote_reference` zu erzeugen, scheitert bereits an der fehlenden Schema-Validierung |
| A.6 (externe Fixtures, neu) | Rot | Reale Fixtures mit Fußnoten werden beim Import heute **lautlos verworfen** (Anforderung Zeile 51/53, direkter Verstoß gegen „kein stiller Datenverlust“) — genau das dokumentiert dieser Zustand |
| A.7 (Grenzfälle/Robustheit, neu) | Kann nicht ausgeführt werden | Abhängig von A.4/A.5 |
| B.0/Vorbedingung (Toolbar-Button) | Rot | `page.getByRole('button', { name: 'Fußnote einfügen' })` findet nichts |
| B.1 (Grundverhalten, Nummerierung, Undo/Redo, Navigation) | Rot/nicht ausführbar | Button, Command, Schema, Plugins fehlen vollständig |
| B.2 (Rundreise DOCX/ODT/Cross-Format) | Rot/nicht ausführbar | Export/Import-Pfade für Fußnoten existieren nicht; Upload-Tests mit den realen Fixtures (`footnotes.docx`, `table_footnotes.docx`, `footnote.odt`) laufen zwar technisch (Datei-Upload selbst funktioniert), zeigen aber **keine** Fußnoten im Editor — bereits das ist der erste, einfachste Nachweis des in der Anforderung beschriebenen Datenverlusts und sollte als **erster** Testlauf vorab ausgeführt werden, um den Ist-Zustand zu dokumentieren |
| Bestehende E2E-Suiten (`docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`, `lifecycle.spec.ts`) | Grün | Unverändert, unbetroffen vom fehlenden Feature |

**Empfohlener erster Schritt für QA vor jeder Umsetzungs-Iteration:** Testfall B.2 mit den drei realen
DOCX-Fixtures sowie `footnote.odt` gegen den **aktuellen** Code laufen lassen und das Ergebnis
(„Fußnoten verschwinden beim Import vollständig, kein Fehler, keine Warnung“) explizit in Abschnitt D als
Nullmessung protokollieren — dies ist der konkreteste, mit einer Zeile Testcode nachweisbare Beleg für den
in der Anforderung beschriebenen stillen Datenverlust.

Dieser Abschnitt dient als **Nullmessung**: Nach jeder Umsetzungs-Iteration wird derselbe vollständige Lauf
wiederholt und das Ergebnis in Abschnitt D protokolliert, bis alle zehn Punkte aus
`fussnote-einfuegen-req.md` Abschnitt 6 (Abnahmekriterien) erfüllt und grün sind.
