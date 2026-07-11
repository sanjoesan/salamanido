# Umsetzungsplan (Code-Ebene): Feature „Tabelle einfügen“

Bezug: `specs/tabelle-einfuegen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6/17,
`FEATURE-BACKLOG.md` Zeile 181. Dieser Plan ist gegen den **tatsächlichen** Code-Stand im Repo
(gelesen 2026-07-04, erneut vollständig verifiziert 2026-07-05) verifiziert, nicht nur gegen die
Anforderungsbeschreibung.

Rollenteilung: Dies ist der Bauplan des „Entwicklers“. Er ändert selbst noch keinen Code, sondern
legt dateigenau fest, was gebaut wird, und beantwortet die in der Anforderung offen gelassenen
Produktfragen (Grenzfälle 3.7/3.8 u. a.).

## Revisions-Hinweis (diese Fassung ersetzt eine fehlerhafte Vorfassung)

Die vorige Fassung dieses Dokuments war gegen einen **veralteten, kürzeren Code-Stand** geschrieben.
Drei Klassen von Fehlern wurden dabei korrigiert; Folge-Agenten müssen sie kennen, um sie nicht
erneut einzuschleppen:

1. **Alle Zeilennummern waren verschoben.** Sämtliche Fundstellen unten sind gegen den aktuellen
   Stand neu verankert. Die Quelldateien sind seit der Vorfassung gewachsen (z. B. `insertTable`
   nicht mehr bei `commands.ts:76`, sondern `:92`). **Im Zweifel per Textsuche verankern**
   (`insertTable`, `tableToDocx`, `TableNameSequence`, `MAX_TABLE_NESTING_DEPTH`), nicht blind der
   Zahl vertrauen.
2. **Die Vorfassung wollte zwei bereits behobene ODT-Fehler erneut „beheben“** — exakt die von
   `tabelle-einfuegen-req.md` Abschnitt 0 ausdrücklich verbotene übernommene Schwäche. Konkret sind
   **im aktuellen Code bereits erledigt und durch grüne Tests abgesichert**:
   - ODT-Spaltenzählung: `odt/writer.ts:115-116` summiert die `colspan`-Werte korrekt auf; Test
     `odt/__tests__/roundtrip.test.ts:298` prüft `.toBe(2)` für eine `colspan=2`-Zelle.
   - ODT-Tabellenname: Klasse `TableNameSequence` (`odt/writer.ts:54-60`, Aufruf `:173`) vergibt
     deterministisch „Table1“, „Table2“ …; **kein** `Math.random()` mehr; Test
     `odt/__tests__/roundtrip.test.ts:529-572` sichert Determinismus + zwei verschiedene Namen.
   Dieser Plan **behebt diese Punkte nicht erneut**, sondern hält die bestehenden Tests als
   Regressionsschutz grün (Abschnitt 5.1).
3. **Zwei konkrete Korrektheitsrisiken der Vorfassung sind entfernt:** (a) Der Keymap-Block wird
   **erweitert**, nicht ersetzt — die Vorfassung hätte `Shift-Enter` und `Shift-Delete`
   versehentlich gelöscht (Abschnitt 3.2). (b) `commands.test.ts` **existiert bereits** und wird
   erweitert, nicht neu angelegt (Abschnitt 6.1).
4. **Nachkontrolle 2026-07-05:** Sämtliche Fundstellen erneut direkt gegen `E:\docs\src` gelesen.
   Unverändert korrekt bestätigt: `commands.ts` (`insertTable :92-102`, `isInTable`-Re-Export
   `:3/:6`, Zeile `:1` ist `import type { Command, EditorState }`), `Toolbar.tsx` (Button `:277-289`,
   `run() :28-31`, `isInTable`-Import `:14`, Toolbar liefert ein einzelnes `<div role="toolbar">`
   `:137-296`), `schema.ts` (`tableNodes` `:2/:154`, `list_item` `content: 'block+'` `:146-152`),
   `docx/writer.ts` (`tableToDocx :158-201`, `colCount` = Σ colspan Zeile 0 `:160`, `w:w="2000"`
   hartkodiert `:161`, leeres `<w:tblPr/>` `:200`, **kein** `pageLayout`-Import), `odt/writer.ts`
   (`TableNameSequence :54-60`, Tabellenfall `:110-175`, `colCount :115-116`, `<table:table-column/>`
   `:117`, reale `table-cell`-Emission `:156`, `tableNames.next() :173`, `buildContentXml`-
   automatic-styles-Konkatenation `:210`), `styleRegistry.ts` (`paragraphAlignStyleDefs :68-75`, noch
   **kein** `TABLE_CELL_BORDER_STYLE_NAME`), `pageLayout.ts` (`PAGE_CONTENT_WIDTH_PX :14`),
   `prosemirror-tables@1.8.5` (`goToNextCell(direction)`, `addRowAfter(state, dispatch?)` exportiert).
   `tableConfig.ts` und `InsertTableDialog.tsx` weiterhin **nicht vorhanden**; `commands.test.ts`
   vorhanden. **Ausschließlich `WordEditor.tsx` war erneut gedriftet** (exakt der in Punkt 1 gewarnte
   Fall) und ist in dieser Fassung durchgehend nachgezogen: `history() :84`, keymap-Block `:85-107`,
   `Shift-Enter :97`, `Shift-Delete :106`, `keymap(baseKeymap) :108`, `columnResizing() :109`,
   `tableEditing() :110`, `dropCursor() :111`, `gapCursor() :112`, `createPaginationPlugin() :113`,
   `<Toolbar…>`-Render `:170`, `shadow-lg` `:178`. **Im Zweifel per Symbolsuche verankern**
   (`insertTable`, `tableTab`, `goToNextCell`, `TableNameSequence`, `MAX_TABLE_NESTING_DEPTH`), nicht
   blind auf die Zahl vertrauen.
5. **Erneute kritische Prüfung (2026-07-05, dieselbe Sitzung wie Punkt 4, aber gegen die vorige
   Fassung dieses Plans statt gegen den Produktcode):** Der komplette Plan wurde zusätzlich Satz für
   Satz gegen `tabelle-einfuegen-req.md` abgeglichen (nicht nur gegen `src`). Ergebnis: **vier
   konkrete Korrekturen**, davon zwei kritische Lücken, die die Vorfassung trotz ausdrücklicher
   Anforderungs-Textstellen komplett ausgelassen hatte:
   - **DoD 11 / Testfall 22 / Grenzfall 18 / Abschnitt 2.9 (Enter-Taste auf dem fokussierten
     Toolbar-Button) fehlte im gesamten Plan** (keine einzige Erwähnung von „Enter“, `onClick`
     zusätzlich zu `onMouseDown`, oder Testfall 22). Da der Button ausschließlich über
     `onMouseDown`+`preventDefault()` auslöst (`Toolbar.tsx:282-283`) und ein per **Enter**
     aktivierter `<button>` browserübergreifend **nur** ein `click`-Ereignis ohne vorausgehendes
     `mousedown` erzeugt, hätte der neue Button mit der in Abschnitt 3.3 ursprünglich vorgeschlagenen
     Implementierung (nur `onMouseDown`) **nicht** auf Enter reagiert — genau das von der Anforderung
     als „nicht hinnehmbarer Bedienbarkeits-Bug“ eingestufte Szenario. Korrigiert in Abschnitt 3.3
     (zusätzliche `onClick`-Bindung) und Abschnitt 6.2/7/8 (Testfall 22, Grenzfall 18, DoD 11).
   - **DoD 10 / Testfall 21 / Grenzfall 17 / Abschnitt 2.10 (Touch/Mobile/Tablet) fehlte ebenfalls
     vollständig** (keine Erwähnung von „Mobile“, „Tablet“ oder „Touch“ im gesamten Plan). Der
     bereits existierende Schwesterplan `spalte-einfuegen-code.md` Abschnitt 6.4 Punkt 8 löst dieselbe
     Anforderung bereits vor: neue Specs unter `tests/e2e/` laufen ohne `testMatch`-Einschränkung
     automatisch auf allen drei Standardprojekten (`playwright.config.ts:34-36`). Ergänzt in
     Abschnitt 2.2 (`inputMode="numeric"` für die native Zahlentastatur) und Abschnitt 6.2/7/8.
   - **Widerspruch im Dialog-Design (Grenzfall 3.16 / Testfall 14 / DoD 1):** Die Vorfassung übernahm
     für den Backdrop wörtlich `PrivacyModal.tsx`s **vollflächigen, klickblockierenden** Overlay
     (`fixed inset-0 z-50 … bg-black/50`, Klick auf den Overlay-`div` → `onCancel()`), behauptete aber
     in Abschnitt 3.3 Punkt 5 gleichzeitig, ein Klick „zurück ins Dokument“ **während der Dialog noch
     offen ist** würde die Modell-Selektion regulär aktualisieren. Beides gleichzeitig ist unmöglich:
     Ein vollflächiger Overlay-`div` liegt über dem gesamten Editor (`z-50`, `inset-0`) und fängt
     **jeden** Klick ab, bevor er die ProseMirror-Oberfläche erreicht — ein Klick „ins Dokument“ wäre
     also entweder technisch unmöglich (Klick trifft nur den Overlay) oder er schließt sofort den
     Dialog (`onCancel()`), womit der von Testfall 14 verlangte anschließende Klick auf „Einfügen“
     gar nicht mehr möglich ist (kein Dialog mehr vorhanden). Genau das von der Anforderung in
     Abschnitt 2.1 gewarnte „Implementierungs-Fallstrick“-Szenario, nur in der entgegengesetzten
     Richtung: nicht „Selektion geht verloren“, sondern „Dialog-Design macht das geforderte Verhalten
     strukturell unerreichbar“. Korrigiert in Abschnitt 2.2/3.3 (siehe dortige Begründung): kein
     vollflächiger, klickblockierender Backdrop mehr; „Klick außerhalb“ wird über einen
     dokumentweiten `mousedown`-Listener erkannt, der Klicks **innerhalb** von `.word-editor-surface`
     ausdrücklich ausnimmt (dort nur Selektion verschieben, Dialog bleibt offen), sonst überall
     `onCancel()`.
   - **DOCX-Spaltenbreiten-Fallback importierte unnötig aus der Editor-Schicht.** Abschnitt 4.1 bezog
     `PAGE_CONTENT_WIDTH_PX` aus `shared/editor/pageLayout.ts` — laut dessen eigenem Docstring in
     `shared/pageGeometry.ts:9` ausdrücklich nur für die **Bildschirm-Simulation in px** gedacht
     (`docx/writer.ts` ist dort explizit als **Twips**-Konsument von `pageGeometry.ts` selbst
     dokumentiert, `shared/pageGeometry.ts:10`). Das hätte zum einen die bisher saubere Trennung
     durchbrochen (`docx/writer.ts`/`odt/writer.ts` importieren aktuell **nichts** aus
     `shared/editor/*`, nur die Formatmodule `docx.ts`/`odt.ts` tun das), zum anderen unnötig
     Rundungsfehler eingeführt (mm→px-Rundung **vor** der px→dxa-Umrechnung: 9090 dxa statt der über
     `mmToTwips` direkt berechenbaren 9071 dxa). Korrigiert in Abschnitt 4.1: `CONTENT_WIDTH_DXA` wird
     direkt aus `shared/pageGeometry.ts` (`mmToTwips`) berechnet, kein neuer Import aus
     `shared/editor/*`.
   **Im Zweifel bei künftigen Revisionen:** Nicht nur den Code erneut verifizieren, sondern den
   gesamten Plan Satz für Satz gegen die aktuelle Fassung von `tabelle-einfuegen-req.md` abgleichen —
   Anforderungs-Revisionen (siehe dort Abschnitt 0) können neue Menüpunkte/Grenzfälle/Testfälle/DoD-
   Punkte einführen, die ein rein code-fokussierter Abgleich nicht auffängt.

---

## 0. Verifikation des Ist-Stands (gegen den aktuellen Code neu gelesen)

Alle in `tabelle-einfuegen-req.md` Abschnitt 0 (Tabelle, Zeilen 78–93) zitierten Fundstellen wurden
erneut gelesen. Ergebnis: **die Angaben der Anforderung treffen zu** (inkl. der beiden bereits
behobenen ODT-Punkte). Für die Umsetzung relevante Präzisierungen:

| Datei / Symbol | Aktueller Stand (verifiziert) |
|---|---|
| `commands.ts:92-102` `insertTable(rows, cols)` | Bereits parametrisiert. Erzeugt jede Zelle mit `table_cell.createAndFill()!` (`:95`), `replaceSelectionWith(table)` (`:98`). **Keine** Obergrenze, **keine** Verschachtelungs-Tiefenprüfung. `isInTable` wird aus `prosemirror-tables` re-exportiert (`:3,:6`). |
| `Toolbar.tsx:277-289` Button „⊞ Tabelle“ | `title`/`aria-label="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}` (`:281`); `onMouseDown`+`preventDefault()` (`:282-283`) ruft **fest** `run(view, insertTable(2, 2))` (`:284`). Helper `run()` (`:28-31`) führt Command aus und ruft `view.focus()`. `isInTable`-Import `:14`. Toolbar gibt **ein einzelnes** `<div role="toolbar">` zurück (`:137-296`). |
| `schema.ts:2,154` | `import { tableNodes }` (`:2`); `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (`:154`). Standardattribute `colspan`/`rowspan`/`colwidth` je Zelle. `tableGroup: 'block'` + `cellContent: 'block+'` ⇒ verschachtelte Tabellen schemaseitig erlaubt. `list_item` hat `content: 'block+'` (`:146-152`). |
| `WordEditor.tsx:8,85-107,108-113` | `import { tableEditing, columnResizing }` (`:8`). **Erster** `keymap({...})`-Block `:85-107` bindet `Mod-z/y`, `Mod-Shift-z`, `Enter=splitListItem`, **`Shift-Enter=insertHardBreak()` (`:97`)**, `Mod-b/i/u`, **`Shift-Delete=cutSelection(...)` (`:106`)** — **kein** `Tab`. `keymap(baseKeymap)` (`:108`) bindet `Tab` ebenfalls nicht. Plugins: `columnResizing()` (`:109`), `tableEditing()` (`:110`), `dropCursor()` (`:111`), `gapCursor()` (`:112`), `createPaginationPlugin()` (`:113`). `history()` (`:84`). `TextSelection` bereits importiert (`:2`). |
| `prosemirror-tables@1.8.5` | Verifiziert exportiert: `goToNextCell(direction: Direction): Command`, `addRowAfter`, `addRowBefore`, `selectionCell`, `selectedRect`, `isInTable`, `TableMap`, `deleteTable` u. v. m. `goToNextCell(dir)` liefert **`false`, wenn keine nächste Zelle existiert** — es erzeugt **selbst keine neue Zeile**. Für „Tab in letzter Zelle → neue Zeile“ (`FEATURE-SPEC-DOCX-ODT.md` Z. 153) ist eigene Logik nötig. Keine neue Abhängigkeit erforderlich. |
| `docx/reader.ts:309,311,313-315,350` | `MAX_TABLE_NESTING_DEPTH = 25` (`:309`); `parseTable()` ab `:311`; `colCount` aus `<w:tblGrid>/<w:gridCol>`-Anzahl (`:313-315`); liest `w:gridSpan`/`w:vMerge` korrekt (`:324-333`); `colwidth` **immer `null`** (`:350`). |
| `docx/writer.ts:158-201` `tableToDocx()` | `colCount` = Summe der `colspan` **von Zeile 0** (`:160`); `<w:gridCol w:w="2000"/>` **hartkodiert je Spalte** (`:161`); `pending`-Logik für `vMerge` korrekt; `<w:tbl><w:tblPr/>${grid}${rowsXml}</w:tbl>` (`:200`) — `<w:tblPr/>` **komplett leer**, kein `<w:tblBorders>`. |
| `odt/writer.ts:54-60,110-175` | **`TableNameSequence` (Klasse `:54-60`) — deterministisch, kein `Math.random()`** (Aufruf `tableNames.next()` `:173`). Tabellenfall `:110-175`; `colCount` = **Summe der `colspan` von Zeile 0**, korrekt (`:115-116`); erzeugt `colCount` × `<table:table-column/>` (`:117`); volle `pending`/`covered-table-cell`-Logik (`:126-169`). `<table:table-cell>` ohne `style-name`/Breite (`:156`). `buildContentXml` automatic-styles `:210`; `buildStylesXml` (Header/Footer) automatic-styles `:221-224`. |
| `odt/reader.ts:218,305-306,315` | `MAX_NESTING_DEPTH = 25` (`:218`, gilt gemeinsam für Listen **und** Tabellen); liest `table:number-columns-spanned`/`-rows-spanned` korrekt (`:305-306`); `colwidth` **immer `null`** (`:315`). |
| `pageLayout.ts:14` | `export const PAGE_CONTENT_WIDTH_PX = PAGE_WIDTH_PX - 2 * PAGE_MARGIN_PX` — mit A4/25 mm ≈ **606 px** (794 − 2·94). Reine Bildschirm-Simulationsgröße, **nicht** für den DOCX-Export zu verwenden (siehe nächste Zeile). |
| `pageGeometry.ts:1-22` | `PAGE_WIDTH_MM=210`, `PAGE_MARGIN_MM=25`, `mmToTwips(mm) = Math.round(mm * 1440/25.4)` (`:20-22`). Docstring (`:8-11`) benennt **`docx/writer.ts` explizit als Twips-Konsumenten dieser Datei** (`w:pgSz`/`w:pgMar` in `docx/pageSetup.ts:5-7` nutzen bereits genau diesen Pfad) — `shared/editor/pageLayout.ts` ist dort separat als reiner **px**-Konsument für die Bildschirm-Simulation gelistet. Für die DOCX-Spaltenbreiten-Reparatur (Abschnitt 4.1) ist deshalb `mmToTwips(PAGE_WIDTH_MM - 2*PAGE_MARGIN_MM)` = 9071 dxa der richtige, bereits etablierte Pfad — **nicht** der Umweg über `PAGE_CONTENT_WIDTH_PX` (der wäre 9090 dxa, 19 dxa Abweichung durch doppelte Rundung mm→px→dxa statt direkt mm→dxa). |
| `index.css:44-61` | `.ProseMirror table { border-collapse; width:100%; margin:.6em 0 }` (`:44-48`); `td,th { border:1px solid #9ca3af; padding:4px 8px; min-width:2em; vertical-align:top }` (`:50-56`); `th { background:#f3f4f6; font-weight:600 }` (`:58-61`). Rahmen sind **reine Editor-CSS-Deko**, unabhängig vom Export. |
| `PrivacyModal.tsx:1-38` | Einziges Modal-Muster: `fixed inset-0 z-50 … bg-black/50` + zentrierte Karte, ein „Verstanden“-Button. **Kein** Fokus-Trap, **kein** Escape, **kein** Klick-außerhalb. Nur **Styling-Vorlage** — alles Interaktive muss neu gebaut werden. |
| `selection-regression.spec.ts:43-59` | Einziger E2E-Test, der den Button klickt (`:46` `getByRole('button', { name: 'Tabelle einfügen' }).click()`), danach `.ProseMirror td` (`:48-49`). **Bricht ohne Anpassung**, sobald der Klick den Dialog öffnet statt sofort einzufügen — siehe Abschnitt 6.2 Pflichtänderung 1. |
| `commands.test.ts` (**existiert**) | Testet aktuell `canCut`/`cutSelection` (`src/formats/shared/editor/__tests__/commands.test.ts`). Wird **erweitert**, nicht neu angelegt. |
| `tableConfig.ts` / `InsertTableDialog.tsx` | **Existieren nicht** — werden neu angelegt (Abschnitt 2). |

---

## 1. Architektur-/Produktentscheidungen (beantworten die offenen Fragen der Anforderung)

Nach Umsetzung als Ergebnis in `tabelle-einfuegen-req.md` (Grenzfälle 3.7/3.8, DoD 5/7/8)
nachzutragen.

### 1.1 Grenzfall 3.7 — Einfügen bei Cursor in bestehender Tabellenzelle
**Entscheidung: Erlaubt (verschachtelte Tabelle), analog Word/LibreOffice.** Das Schema lässt es
zu (`schema.ts:154`), der Import ist mit `MAX_TABLE_NESTING_DEPTH = 25` (`docx/reader.ts:309`)
abstürzsicher. Damit auch **aktives** Einfügen „kein Absturz“ garantiert, bekommt `insertTable()`
einen Tiefen-Guard (Abschnitt 3.1): lehnt neue Tabelle ab (Command `false`), sobald die
Verschachtelungstiefe `MAX_TABLE_NESTING_DEPTH` erreicht; der Dialog zeigt dann eine Fehlermeldung.

### 1.2 Grenzfall 3.8 — Einfügen bei Cursor in einem Listenelement
**Entscheidung: Tabelle wird in das `list_item` eingebettet, die Liste bleibt durchgehend.**
Begründung: `list_item` hat `content: 'block+'` (`schema.ts:146-152`), `table` gehört zu `block`
(`tableGroup: 'block'`). `replaceSelectionWith(table)` findet die am wenigsten invasive gültige
Stelle: die Tabelle passt als weiteres Kind desselben `list_item` (der umschließende Absatz wird an
der Cursor-Position gesplittet). Erwartetes Ergebnis: `list_item` enthält danach
`[paragraph, table, paragraph]`. **Muss per Unit-Test bewiesen werden** (Abschnitt 6.1); trifft die
Analyse nicht zu, ist die tatsächliche Struktur hier zu dokumentieren, **nicht** stillschweigend
hinzunehmen.

### 1.3 Obergrenzen (Grenzfälle 3.3/3.4/3.14)
**Entscheidung: `MAX_TABLE_ROWS = 50`, `MAX_TABLE_COLS = 50`.** Grenzfall 3.4 fordert 20×20 als
funktionsfähig, 3.3 nennt 100×100 als abzulehnen. 50×50 = 2500 Zellen ist noch handhabbar (auch für
`columnResizing`/`tableEditing`/Pagination, die pro Transaktion messen); 100×100 = 10000 Zellen
riskiert spürbares Einfrieren.

### 1.4 „Zuletzt verwendete Größe“ — nur In-Memory, kein `localStorage`
**Entscheidung: `useState` in der Toolbar, keine Persistenz über Reload.** `PrivacyModal.tsx`
verspricht „nirgendwo gespeichert“; persistente Tabellengröße widerspräche dem. Die Anforderung
lässt „3×3 **oder** zuletzt verwendet“ zu (Zeile 102/137) — In-Memory erfüllt „zuletzt verwendet“
innerhalb der Sitzung und startet nach Reload wieder bei 3×3.

### 1.5 Rahmen-Frage beim Export (DoD 5)
**Entscheidung: Rahmen werden aktiv exportiert** (nicht nur dokumentiert). Der Editor zeigt per CSS
durchgehend Zellrahmen (`index.css:52`); „Rahmen sichtbar“ ist in `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 6 Soll-Kriterium. Ein rahmenloser Export wäre genau der Editor↔Ergebnis-Bruch, der als
„nicht funktional“ moniert wurde. Umsetzung: `<w:tblBorders>` in DOCX (Abschnitt 4.1), automatische
Zellrahmen-Formatvorlage in ODT (Abschnitt 5.2). Farbe einheitlich `#9ca3af` (= `index.css:52`).

### 1.6 Spaltenbreiten-Frage (Abschnitt 2.5 / DoD 8) — zweigeteilt
- **DOCX-Verteilung wird repariert:** `w:w="2000"` je Spalte ist ein **echter Overflow-Bug**. Bei
  20 Spalten ergibt 20·2000 = 40000 dxa ≈ 27,8″ gegenüber ca. `PAGE_CONTENT_WIDTH_PX·15 ≈ 9090`
  dxa nutzbarer A4-Breite; schon ab ~5 Spalten läuft die Tabelle über die Seite (Grenzfall 3.14).
  Ersetzt durch gleichmäßige Verteilung der Inhaltsbreite (Abschnitt 4.1).
- **Individuell gezogene `colwidth` wird beim DOCX-Export übernommen, sofern vorhanden** — schließt
  die in Abschnitt 2.5 benannte Lücke (im Editor per `columnResizing` gesetzte Breite ging bisher
  verloren).
- **Lesen** von Fremd-Spaltenbreiten beim **Import** bleibt bewusst `colwidth: null` — von der
  Anforderung selbst als akzeptable, zu dokumentierende Einschränkung eingestuft (Abschnitt 10).
- **ODT:** kein Overflow-Risiko (ODF-Konsumenten verteilen `<table:table-column/>` ohne Breite
  gleichmäßig) ⇒ **keine** Spaltenbreiten-Persistierung für ODT; bewusst dokumentierte
  Einschränkung (DoD 8 für ODT über diesen Plan erfüllt).

### 1.7 Explizit nicht Teil dieser Umsetzung (Anforderung selbst: optional/außerhalb Scope)
- Kontextmenü „Tabelle einfügen“ (Rechtsklick) — Anforderung Zeile 106.
- Tastenkombination zum Einfügen — Zeile 105 „kein Blocker … optional“.
- Sicherheitsabfrage beim Ersetzen einer Textselektion — Grenzfall 3.5 „ggf. erwägen“; Undo deckt
  es ab, zusätzliche Bestätigung widerspräche Word/LibreOffice.
- Zeilen-/Spalten-Kontextfunktionen — eigene Backlog-Slugs (Anforderung Zeile 22–33).

---

## 2. Neue Dateien

### 2.1 `src/formats/shared/tableConfig.ts` (neu)
Gemeinsame Konstanten für Dialog (UI-Validierung) **und** `insertTable()` (struktureller Guard),
statt Magic Numbers zu duplizieren. Ersetzt **nicht** die vorhandenen `MAX_TABLE_NESTING_DEPTH`
(`docx/reader.ts:309`) bzw. `MAX_NESTING_DEPTH` (`odt/reader.ts:218`) — deren Semantik (Reader-
Absturzschutz beim Import; bei ODT zusätzlich für Listen) ist eine andere.

```ts
export const MAX_TABLE_ROWS = 50
export const MAX_TABLE_COLS = 50
/** Same ceiling the DOCX reader uses for imported files (docx/reader.ts MAX_TABLE_NESTING_DEPTH),
 *  reused so actively inserting via the toolbar cannot exceed what an import could reach. */
export const MAX_TABLE_NESTING_DEPTH = 25
export const DEFAULT_TABLE_ROWS = 3
export const DEFAULT_TABLE_COLS = 3
```

### 2.2 `src/formats/shared/editor/InsertTableDialog.tsx` (neu)
Kompletter neuer Dialog. Von `PrivacyModal.tsx` wird **nur** die visuelle Kartenoptik übernommen
(zentrierte Karte mit `rounded-lg`/Schatten/Padding); **bewusst nicht** übernommen wird
`PrivacyModal.tsx`s vollflächiger, klickblockierender Overlay (`fixed inset-0 z-50 … bg-black/50` mit
Klick-auf-Overlay-schließt-Handler) — Begründung siehe unten, „Kein vollflächiger Backdrop“. Alles
Interaktive ist neu.

**Kein vollflächiger Backdrop (Korrektur ggü. einer früheren Fassung dieses Plans):** Ein Overlay-`div`
mit `fixed inset-0 z-50`, der über dem gesamten Editor liegt und selbst auf Klicks reagiert (wie
`PrivacyModal.tsx:13`), fängt **jeden** Klick ab, bevor er die ProseMirror-Oberfläche erreicht. Das
widerspricht Grenzfall 3.16/Testfall 14, die verlangen, dass die Nutzerin **während der Dialog noch
offen ist** zurück ins Dokument klickt, um die Einfügeposition zu ändern, und **danach** noch
„Einfügen“ klicken kann — mit einem vollflächigen Backdrop wäre dieser Klick entweder unmöglich
(Klick trifft nur den Overlay) oder er schlösse den Dialog sofort (kein „Einfügen“ mehr klickbar).
Stattdessen: **kein** übergreifender Overlay-`div`; die Dialog-Karte ist ein eigenständiges
`position: fixed`-Element (zentriert wie bisher), der Editor bleibt darunter normal klick- und
fokussierbar. „Klick außerhalb“ (Grenzfall 1) wird stattdessen über einen **dokumentweiten**
`mousedown`-Listener erkannt, der zwischen zwei Fällen unterscheidet:
```ts
useEffect(() => {
  function handleOutsideMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (dialogRef.current?.contains(target)) return // Klick in der Dialog-Karte selbst
    if (target.closest('.word-editor-surface')) return // Klick zurück ins Dokument: Editor
    onCancel()                                          // regelt Selektion selbst (WordEditor.tsx:143-155),
  }                                                      // Dialog bleibt offen (Grenzfall 3.16/TF 14)
  document.addEventListener('mousedown', handleOutsideMouseDown)
  return () => document.removeEventListener('mousedown', handleOutsideMouseDown)
}, [onCancel])
```
Ein Klick auf `.word-editor-surface` (`WordEditor.tsx:180`) erreicht damit ganz normal die
bestehenden `mousedown`/`mouseup`-Listener des Editors (`WordEditor.tsx:141-155`,
`reconcileSelectionOnClick`) — dieselbe Mechanik, die außerhalb des Dialogs bereits die
Modell-Selektion pflegt, läuft unverändert weiter, während der Dialog sichtbar offen bleibt. Ein Klick
auf **irgendein anderes** Element (Toolbar-Buttons, graue Seiten-Chrome außerhalb der Editor-Fläche,
…) gilt als „Klick außerhalb“ und schließt den Dialog (Testfall 5b). Effekt auf Abschnitt 3.3 Punkt 5:
dessen Aussage „kein manuelles Snapshotten nötig, die Modell-Selektion bleibt regulär aktuell“ ist
**nur mit dieser Korrektur** tatsächlich zutreffend — mit dem ursprünglich vorgeschlagenen
vollflächigen Backdrop wäre sie falsch gewesen (der Klick hätte den Editor nie erreicht).

**Bewusste, dokumentierte Spannung mit `aria-modal="true"`:** Ein „echtes“ ARIA-Modal impliziert, dass
Hintergrundinhalte für Assistive Technologien inert sind — hier bleibt der Editor für Maus/Touch
absichtlich bedienbar (Grenzfall 3.16). Diese Spannung wird **nicht** aufgelöst, indem `aria-modal`
entfernt wird: Für **Tastatur-/Screenreader-Nutzung** bleibt die Fokus-Falle (s. o.) die korrekte,
vom Screenreader erwartete Semantik (Tab zirkuliert innerhalb des Dialogs, exakt was `aria-modal="true"`
ankündigt); der Maus-/Touch-Klick-durch-Fall ist eine bewusst zusätzliche, rein zeigegeräte-bezogene
Ausnahme für Grenzfall 3.16, kein allgemeines „Hintergrund ist doch nicht inert“-Signal an
Assistive-Technology-Nutzer:innen. `aria-modal="true"` bleibt daher gesetzt.

Props:
```ts
interface InsertTableDialogProps {
  initialRows: number
  initialCols: number
  /** null on success (caller closes); a string is shown inline and the dialog stays open. */
  onConfirm: (rows: number, cols: number) => string | null
  onCancel: () => void
}
```

Verhalten (Anforderung 2.1/2.2, Grenzfälle 1/2/3/11):
- Root: `role="dialog" aria-modal="true" aria-labelledby="insert-table-dialog-title"`; der Titel-
  Knoten (`id="insert-table-dialog-title"`) trägt den Text **„Tabelle einfügen“** (damit
  `getByRole('dialog', { name: 'Tabelle einfügen' })` im E2E greift).
- Zwei kontrollierte `type="text"`-Inputs (nicht `type="number"` — vermeidet Spinner-Eigenheiten,
  erlaubt exakte Validierung inkl. zwischenzeitlich leerem Feld) **mit `inputMode="numeric"
  pattern="[0-9]*"`** — behält die Validierungsfreiheit von `type="text"`, öffnet auf Touch-Geräten
  aber gezielt die numerische Bildschirmtastatur statt der vollen Buchstabentastatur (Anforderung
  2.10 „Antippen eines Eingabefelds öffnet die native Bildschirmtastatur“, Testfall 21); lokaler
  String-State je Feld. Labels „Zeilen“/„Spalten“, per `htmlFor`/`id` verknüpft.
- `useEffect` beim Mount: erstes Feld `focus()` + `select()` (Tippen ersetzt den Vorgabewert).
- **Fokus-Falle:** `onKeyDown` am Root fängt `Tab`/`Shift+Tab` ab, ermittelt fokussierbare Elemente
  (`dialogRef.current.querySelectorAll('input, button')`) und springt am Rand um (erstes ↔ letztes).
- **Escape** (im selben `onKeyDown`) → `onCancel()`.
- **„Klick außerhalb“:** über den dokumentweiten `mousedown`-Listener oben („Kein vollflächiger
  Backdrop“) — **kein** Overlay-`div`, der Klicks selbst abfängt.
- Reine, exportierte Validierungsfunktion (für Unit-Tests):
  ```ts
  export function parseTableDimension(raw: string, max: number): { value: number } | { error: string } {
    const trimmed = raw.trim()
    if (trimmed === '') return { error: 'Bitte eine Zahl eingeben.' }
    if (!/^\d+$/.test(trimmed)) return { error: 'Bitte eine ganze Zahl ≥ 1 eingeben.' }
    const n = Number(trimmed)
    if (n < 1) return { error: 'Der Wert muss mindestens 1 sein.' }
    if (n > max) return { error: `Der Wert darf höchstens ${max} sein.` }
    return { value: n }
  }
  ```
  (Grenzfall 2: 0/negativ/nicht-numerisch/leer; Grenzfall 3: zu groß, mit Meldung statt stillem
  Abschneiden.)
- `<form onSubmit>` (`e.preventDefault()`; Enter in einem Feld löst Submit aus — Anforderung 2.2):
  validiert beide Felder mit `parseTableDimension(rows, MAX_TABLE_ROWS)` /
  `parseTableDimension(cols, MAX_TABLE_COLS)`. Bei Fehler: inline `role="alert"` je Feld, Dialog
  bleibt offen, **kein** `onConfirm`. Bei Erfolg: `const err = onConfirm(rows, cols)` — ist `err`
  ein String, inline anzeigen (Fall Tiefen-Guard aus 1.1); ist `err === null`, schließt der
  **Aufrufer** (Toolbar) den Dialog.
- **Doppel-Submit-Schutz (Grenzfall 11):** `submittedRef = useRef(false)`; **erst nach bestandener
  Validierung** `if (submittedRef.current) return; submittedRef.current = true`; Bestätigen-Button
  zusätzlich `disabled`, sobald gesendet. (Bei Validierungsfehler bleibt erneutes Absenden möglich.)
- Buttons: „Abbrechen“ (`type="button"`, `onClick={onCancel}`) und **„Einfügen“** (`type="submit"` —
  exakt dieser Text, damit `getByRole('button', { name: 'Einfügen' })` im Dialog eindeutig ist und
  nicht mit dem Toolbar-Button „Tabelle einfügen“ kollidiert).

---

## 3. Geänderte Dateien — Editor-Kern

### 3.1 `src/formats/shared/editor/commands.ts`
1. Imports ergänzen:
   `import { goToNextCell, addRowAfter } from 'prosemirror-tables'` (`isInTable` ist bereits
   importiert, `:3`) und `import { MAX_TABLE_NESTING_DEPTH } from '../tableConfig'`. **`TextSelection`
   wird von der unten gezeigten `tableTab`-/`insertTable`-Fassung NICHT benötigt** — erst falls die
   **optionale** „Cursor in die erste Zelle setzen“-Nachbesserung aus Abschnitt 3.3 Punkt 7 gebaut
   wird, dann als **separate** Importzeile `import { TextSelection } from 'prosemirror-state'` (Zeile
   `:1` ist ein reines `import type { Command, EditorState }` und kann die Wert-Klasse
   `TextSelection` nicht aufnehmen). `EditorState` (für die Signatur von `tableNestingDepth`) ist über
   dieses `import type` bereits verfügbar.
2. **Tiefen-Guard** in `insertTable` (aktuell `:92-102`). Berechnung **vor** `if (dispatch)`, damit
   ein Dry-Run (`insertTable(r,c)(state)` ohne dispatch, genutzt vom Dialog-Confirm in 3.3) die
   Ablehnung schon liefert — analog zu `setAlign` (`:13-27`), das seine Anwendbarkeit
   dispatch-unabhängig bestimmt. Die **eigentliche Einfüge-Logik bleibt unverändert** (Anforderung
   Zeile 104: an der Command-Funktion soll nichts geändert werden außer der Anbindung — der Guard
   ist die einzige, rein defensive Erweiterung):
   ```ts
   function tableNestingDepth(state: EditorState): number {
     const { $from } = state.selection
     let depth = 0
     for (let d = $from.depth; d >= 0; d--) {
       if ($from.node(d).type.spec.tableRole === 'table') depth++
     }
     return depth
   }

   export function insertTable(rows: number, cols: number): Command {
     return (state, dispatch) => {
       if (tableNestingDepth(state) >= MAX_TABLE_NESTING_DEPTH) return false
       if (dispatch) {
         const cell = () => wordSchema.nodes.table_cell.createAndFill()!
         const row = () => wordSchema.nodes.table_row.create(null, Array.from({ length: cols }, cell))
         const table = wordSchema.nodes.table.create(null, Array.from({ length: rows }, row))
         dispatch(state.tr.replaceSelectionWith(table))
       }
       return true
     }
   }
   ```
3. **Neu: `tableTab(direction: 1 | -1): Command`** — Tab/Umschalt+Tab inkl. „neue Zeile am Ende“
   (Anforderung Zeile 108, Grenzfall 3.9, `FEATURE-SPEC-DOCX-ODT.md` Z. 153). Bewusst **schlank**
   über die vorhandene `prosemirror-tables`-API, ohne manuelle Positions-Arithmetik: `goToNextCell`
   bewegt die Selektion; scheitert es in der letzten Zelle, wird eine Zeile angehängt und **erneut**
   `goToNextCell(1)` auf dem frischen `view.state` gerufen (die dispatchte `addRowAfter`-Transaktion
   hat den View bereits aktualisiert), was zielsicher in die erste Zelle der neuen Zeile springt:
   ```ts
   export function tableTab(direction: 1 | -1): Command {
     return (state, dispatch, view) => {
       if (!isInTable(state)) return false
       // Springe in eine vorhandene Nachbarzelle, falls es sie gibt.
       if (goToNextCell(direction)(state, dispatch, view)) return true
       if (direction === -1) return false // Shift-Tab in der allerersten Zelle: No-Op
       // Vorwärts-Tab in der letzten Zelle: Zeile anhängen und hineinspringen.
       if (!dispatch || !view) return addRowAfter(state) // reine Verfügbarkeitsprüfung
       if (!addRowAfter(state, dispatch)) return false
       goToNextCell(1)(view.state, view.dispatch, view)
       return true
     }
   }
   ```
   **Muss durch Unit-Test abgesichert werden** (Abschnitt 6.1): Cursor muss **nachweislich** im
   ersten Zellinhalt der neuen Zeile landen (exakte `state.selection.$from`-Position prüfen), nicht
   nur „Dokument hat eine Zeile mehr“. Sollte `goToNextCell(1)` nach `addRowAfter` wider Erwarten
   nicht in der ersten neuen Zelle landen (z. B. wenn die letzte Zeile Merges enthält), ist auf die
   `TableMap`-basierte Variante (Zelle `row=rows-1, col=0` per `TableMap.get(table)` auflösen)
   auszuweichen und das hier zu vermerken. Für die frisch eingefügte, gleichförmige Tabelle
   (alle `colspan=1`) ist der einfache Weg ausreichend.

### 3.2 `src/formats/shared/editor/WordEditor.tsx`
1. Import ergänzen: `tableTab` aus `./commands` (aktuell wird nur `cutSelection, insertHardBreak`
   importiert, `:12`).
2. **Den bestehenden ersten `keymap({...})`-Block (`:85-107`) NUR um zwei Einträge ERWEITERN** —
   **nicht ersetzen**. Der Block enthält aktuell u. a. `Shift-Enter: insertHardBreak()` (`:97`) und
   `Shift-Delete: cutSelection({ onCutBlocked: setCutError })` (`:106`); beide **müssen erhalten
   bleiben**. Ergänzt werden:
   ```ts
   Tab: tableTab(1),
   'Shift-Tab': tableTab(-1),
   ```
   `tableTab` gibt `false` zurück, wenn nicht in einer Tabelle (siehe 3.1); `Tab` **außerhalb** von
   Tabellen bleibt damit unverändert dem bisherigen Verhalten überlassen (`baseKeymap` `:100` bindet
   `Tab` nicht) — dessen Änderung ist ausdrücklich **nicht** Teil dieser Anforderung (Geltungs-
   bereich: Tab-Navigation **für die frisch eingefügte Tabelle**). Grenzfall 3.10 ist damit
   **innerhalb** von Tabellen gelöst; der Editor-weite Tab-Fokus außerhalb bleibt Status quo
   (Folgearbeit, Abschnitt 10).
3. Keine Änderung an Plugin-Reihenfolge: `columnResizing()`/`tableEditing()` (`:109-110`)
   registrieren keine eigene `Tab`-Keymap, kein Konflikt.

### 3.3 `src/formats/shared/editor/Toolbar.tsx`
1. Imports ergänzen: `InsertTableDialog` aus `./InsertTableDialog`; `DEFAULT_TABLE_ROWS`,
   `DEFAULT_TABLE_COLS` aus `../tableConfig`; `useState` aus `react`. `isInTable`-Import (`:14`)
   entfällt (siehe Punkt 3).
2. Neuer lokaler State (die Toolbar wird pro `WordEditor`-Mount einmal instanziiert, `WordEditor
   .tsx:170` — der State überlebt Öffnen/Schließen innerhalb derselben Sitzung, Entscheidung 1.4):
   ```ts
   const [tableDialogOpen, setTableDialogOpen] = useState(false)
   const [lastTableSize, setLastTableSize] = useState({ rows: DEFAULT_TABLE_ROWS, cols: DEFAULT_TABLE_COLS })
   ```
3. Der bestehende Button (`:277-289`) wird **ersetzt** — kein `insertTable(2, 2)` mehr, kein
   `aria-pressed`/`isInTable` (semantisch unpassend für einen Aktions-Button; kleiner A11y-Mangel,
   hier miterledigt, da dieselbe Zeile ohnehin angefasst wird):
   ```tsx
   <button
     type="button"
     title="Tabelle einfügen"
     aria-label="Tabelle einfügen"
     aria-haspopup="dialog"
     aria-expanded={tableDialogOpen}
     onMouseDown={(e) => {
       e.preventDefault()          // Selektion/Fokus im Editor nicht durch den Klick verlieren
       setTableDialogOpen(true)
     }}
     onClick={() => setTableDialogOpen(true)}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
   >
     ⊞ Tabelle
   </button>
   ```
   **`onClick` zusätzlich zu `onMouseDown` (DoD 11, Grenzfall 18, Testfall 22 — in einer früheren
   Fassung dieses Plans vollständig gefehlt):** Ein per **Enter** aktivierter, fokussierter `<button>`
   erzeugt browserübergreifend **nur** ein `click`-Ereignis, **kein** vorausgehendes `mousedown`
   (anders als die Leertaste, die zusätzlich ein synthetisches `mousedown`/`mouseup` erzeugt). Mit
   ausschließlich `onMouseDown` — wie bei allen anderen Toolbar-Buttons dieser Datei — würde Enter auf
   dem fokussierten Button **nichts** auslösen; seit die feste 2×2-Direkteinfügung durch einen Dialog
   ersetzt wird, wäre das der einzige Weg für rein tastaturgestützte Nutzer:innen, überhaupt eine
   Tabelle einzufügen. Die zusätzliche `onClick`-Bindung ist für Maus/Touch **harmlos redundant**:
   `e.preventDefault()` in `onMouseDown` verhindert nur den Fokuswechsel weg vom Editor, **nicht** das
   nachfolgende `click`-Ereignis (das feuert regulär bei `mouseup`); `setTableDialogOpen(true)` ein
   zweites Mal mit demselben Wert aufzurufen ist ein No-Op für React. Bei Maus/Touch öffnet also
   effektiv `onMouseDown` (zuerst), bei Enter öffnet `onClick` (einzig). Bewusst **nicht** auf alle
   anderen Toolbar-Buttons dieser Datei übertragen — das wäre ein sinnvoller, aber eigenständiger
   A11y-Backlog-Punkt (Abschnitt 10), außerhalb des Geltungsbereichs dieser Anforderung, die
   ausdrücklich nur den Tabelle-Button verlangt (Anforderung Menüpunkt 12/Abschnitt 2.9).
4. Dialog als Geschwister rendern. Da `Toolbar` aktuell nur **ein** `<div>` zurückgibt (`:137-296`),
   muss der Rückgabewert in ein Fragment `<>…</>` gefasst werden; der Dialog kommt hinter das
   `</div>` der Toolbar:
   ```tsx
   {tableDialogOpen && (
     <InsertTableDialog
       initialRows={lastTableSize.rows}
       initialCols={lastTableSize.cols}
       onConfirm={(rows, cols) => {
         const command = insertTable(rows, cols)
         if (!command(view.state)) {                    // Dry-Run: Tiefen-Guard (1.1)
           return 'Verschachtelungstiefe für Tabellen erreicht – hier nicht einfügbar.'
         }
         run(view, command)                              // führt aus und ruft view.focus() (:28-31)
         setLastTableSize({ rows, cols })
         setTableDialogOpen(false)
         return null
       }}
       onCancel={() => {
         setTableDialogOpen(false)
         view.focus()
       }}
     />
   )}
   ```
5. **Selektion über die Dialog-Lebensdauer (Grenzfall 3.16):** Es ist **kein** manuelles Snapshotten
   nötig. ProseMirrors Modell-Selektion (`view.state.selection`) bleibt stabil, während der Fokus in
   einem Dialog-Input liegt — das Fokussieren eines DOM-Inputs außerhalb des `contenteditable`
   dispatcht keine Transaktion. Beim Bestätigen fügt `insertTable` an `view.state.selection` ein.
   **Diese Aussage gilt nur, weil der Dialog laut Abschnitt 2.2 keinen vollflächigen, klickblockierenden
   Backdrop mehr hat** — der Editor (`.word-editor-surface`) bleibt während der gesamten
   Dialog-Lebensdauer normal klickbar. Klickt die Nutzerin während des offenen Dialogs zurück ins
   Dokument, erreicht dieser Klick unverändert die bestehenden `mousedown`/`mouseup`-Listener
   (`WordEditor.tsx:141-155`), aktualisiert die Modell-Selektion regulär, **schließt aber den Dialog
   nicht** (Abschnitt 2.2: `.word-editor-surface` ist von der „Klick außerhalb“-Erkennung
   ausgenommen) → die Tabelle landet beim anschließenden Klick auf „Einfügen“ an der zuletzt
   geklickten Stelle (genau das von Testfall 14 geforderte Verhalten, inklusive des noch möglichen
   dritten Schritts „Einfügen“). Der `onMouseDown`+`preventDefault()` am Button (Punkt 3) verhindert,
   dass bereits das *Öffnen* die Selektion verschiebt. Beim Abbrechen wird **nichts** dispatcht ⇒
   Cursor/Selektion exakt erhalten (Grenzfall 1).
6. Der Dialog nutzt `position: fixed`. Verifiziert: kein Vorfahre in `WordEditor.tsx`/`Toolbar.tsx`
   setzt `transform`/`filter`/`will-change` (nur `shadow-lg` auf dem Seiten-`div`,
   `WordEditor.tsx:178` — Box-Shadow erzeugt keinen Containing Block) ⇒ kein `createPortal` nötig.
   Da es (Abschnitt 2.2) keinen umschließenden Overlay-`div` mehr gibt, muss der Dialog zusätzlich
   selbst einen ausreichend hohen `z-index` mitbringen, um über der Seiten-Simulation
   (`WordEditor.tsx:171-179`, kein eigener `z-index`, aber später im DOM) zu liegen — ein einfacher
   Wert wie `z-40` (unter `PrivacyModal`s `z-50`, die beide ohnehin nie gleichzeitig sichtbar sind)
   genügt, da kein weiteres Element im Baum einen `z-index` setzt (verifiziert: einzige Fundstelle für
   `z-` im gesamten `src/` ist `PrivacyModal.tsx:13`).
7. **Cursor-Zielposition nach dem Einfügen (verifizieren):** `replaceSelectionWith(table)` setzt die
   Selektion per `Selection.near` nach der eingefügten Node; ob der Cursor dabei **in** der ersten
   Zelle oder direkt **hinter** der Tabelle landet, ist bei der Umsetzung zu prüfen (Anforderung 2.3
   „sinnvolle Zelle, idealerweise die erste“). Landet er hinter der Tabelle, ist als **optionale**
   Verbesserung die Selektion nach dem Dispatch in die erste Zelle zu setzen; das ist die einzige
   ggf. nötige Zusatzänderung an `insertTable` und nur einzubauen, falls der Test es erfordert.

### 3.4 `src/formats/shared/schema.ts`
**Keine Änderung.** `tableNodes(...)` (`:154`) liefert bereits `colspan`/`rowspan`/`colwidth` je
Zelle; das genügt für verschachtelte Tabellen, mehrere Absätze/Formatierung je Zelle und die
Einbettung in Listenelemente. Die Datei wird nur indirekt (über `wordSchema` in `commands.ts`)
genutzt.

---

## 4. DOCX Import/Export

### 4.1 `src/formats/docx/writer.ts` — `tableToDocx()` (`:158-201`)
Zwei Änderungen; die Merge-Logik (`gridSpan`/`vMerge`, `:163-198`) bleibt **unverändert korrekt**.

1. **Spaltenbreiten statt hartkodiert `2000`** (behebt den Overflow-Bug, Entscheidung 1.6). Neue
   Hilfsfunktionen oberhalb von `tableToDocx`. **Korrektur ggü. einer früheren Fassung dieses Plans:**
   die Gesamt-Inhaltsbreite wird **direkt** aus `shared/pageGeometry.ts` (`mmToTwips`) berechnet, statt
   über `PAGE_CONTENT_WIDTH_PX` aus `shared/editor/pageLayout.ts` umzurechnen. Zwei Gründe: (a)
   `pageGeometry.ts`s eigener Docstring (`:8-11`) listet `docx/writer.ts` bereits als vorgesehenen
   **Twips**-Konsumenten dieser Datei (genau wie `docx/pageSetup.ts:5-7` es für `w:pgSz`/`w:pgMar`
   bereits tut) — `shared/editor/pageLayout.ts` ist dort separat als reiner **px**-Konsument für die
   Bildschirm-Simulation gelistet; ein Import von dort in `docx/writer.ts` wäre der **erste** Fall, in
   dem ein Format-Writer aus `shared/editor/*` importiert (heute importieren nur `docx.ts`/`odt.ts`
   von dort, nicht `writer.ts`/`reader.ts` — verifiziert, keine Treffer für `shared/editor` in
   `docx/*.ts`/`odt/*.ts` außer den beiden Formatmodulen). (b) Der Umweg über `PAGE_CONTENT_WIDTH_PX`
   rundet zweimal (mm→px, dann px→dxa) und ergäbe **9090** dxa; der direkte Weg rundet nur einmal
   (mm→dxa) und ergibt **9071** dxa — die exaktere, bereits im Projekt etablierte Berechnung. Pfad von
   `docx/writer.ts` aus: `../shared/pageGeometry`:
   ```ts
   import { PAGE_WIDTH_MM, PAGE_MARGIN_MM, mmToTwips } from '../shared/pageGeometry'

   const PX_TO_DXA = 15 // 1440 dxa/in ÷ 96 px/in — nur für individuell gesetzte colwidth-Werte (in px)
   const CONTENT_WIDTH_DXA = mmToTwips(PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM) // = 9071 (A4, 25mm Rand)
   const MIN_COL_WIDTH_DXA = 100

   /** columnResizing() writes a colwidth array onto each cell for the columns it spans. */
   function collectColumnWidthsPx(rows: JsonNode[], colCount: number): Array<number | null> {
     const widths: Array<number | null> = Array.from({ length: colCount }, () => null)
     for (const row of rows) {
       let col = 0
       for (const cell of row.content ?? []) {
         const colspan = Number(cell.attrs?.colspan ?? 1)
         const colwidth = cell.attrs?.colwidth as Array<number | null> | null | undefined
         for (let i = 0; i < colspan && col + i < colCount; i++) {
           const w = colwidth?.[i]
           if (widths[col + i] == null && typeof w === 'number' && w > 0) widths[col + i] = w
         }
         col += colspan
       }
     }
     return widths
   }

   function columnWidthsDxa(rows: JsonNode[], colCount: number): number[] {
     const px = collectColumnWidthsPx(rows, colCount)
     const knownTotalDxa = px.reduce((s, w) => (w != null ? s + w * PX_TO_DXA : s), 0)
     const unknownCount = px.filter((w) => w == null).length
     const fallbackEachDxa = unknownCount > 0
       ? Math.max(MIN_COL_WIDTH_DXA, Math.floor(Math.max(CONTENT_WIDTH_DXA - knownTotalDxa, 0) / unknownCount))
       : 0
     return px.map((w) => (w != null ? Math.round(w * PX_TO_DXA) : fallbackEachDxa))
   }
   ```
   `:161` ersetzen durch:
   ```ts
   const widthsDxa = columnWidthsDxa(rows, colCount)
   const grid = `<w:tblGrid>${widthsDxa.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
   ```
2. **Explizite Rahmen** (Entscheidung 1.5). `:200` ersetzen:
   ```ts
   const TABLE_BORDERS_XML =
     '<w:tblBorders>' +
     ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
       .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="9CA3AF"/>`)
       .join('') +
     '</w:tblBorders>'

   return `<w:tbl><w:tblPr>${TABLE_BORDERS_XML}</w:tblPr>${grid}${rowsXml}</w:tbl>`
   ```
   `w:sz="4"` = 0,5 pt (Viertelpunkt-Einheit) ≈ CSS `1px solid`; Farbe `9CA3AF` = `index.css:52`
   (Editor↔Word optisch gleich). `<w:tblBorders>` mit `insideH`/`insideV` deckt alle Innenlinien
   ab — **keine** per-Zell-`<w:tcBorders>` nötig.

### 4.2 `src/formats/docx/reader.ts`
**Keine Pflichtänderung.** `colwidth` bleibt `null` (`:350`) — Entscheidung 1.6. Optionale
Folgearbeit (Abschnitt 10): `w:tblGrid/w:gridCol/@w:w` bzw. `w:tcW` auslesen und `/PX_TO_DXA` in
`colwidth` umrechnen. Nicht für die Abnahme nötig (Anforderung 4.1 Punkt 3 stuft diesen Verlust
selbst als akzeptable, nur zu dokumentierende Einschränkung ein).

---

## 5. ODT Import/Export

### 5.1 `src/formats/odt/writer.ts` — Tabellenfall (`:110-175`)
**Wichtig — keine Neu-„Behebung“ zweier bereits erledigter Punkte** (Anforderung Abschnitt 0):
- **Spaltenzählung:** `colCount` (`:115-116`) summiert `colspan` bereits korrekt und erzeugt exakt
  so viele `<table:table-column/>` — **unverändert lassen**. Regressionstest
  `odt/__tests__/roundtrip.test.ts:298` (`.toBe(2)`) bleibt grün.
- **Tabellenname:** `TableNameSequence` (`:54-60`, Aufruf `:173`) ist bereits deterministisch —
  **unverändert lassen**. Regressionstest `odt/__tests__/roundtrip.test.ts:529-572` bleibt grün.

Einzige Änderung hier: **Zellrahmen** (Entscheidung 1.5, Parität zum DOCX-Export). Die reale
`<table:table-cell …>`-Emission (`:156`) erhält einen `style-name`:
```ts
cellsXml.push(`<table:table-cell table:style-name="${TABLE_CELL_BORDER_STYLE_NAME}" ${spanAttrs}>${inner || '<text:p/>'}</table:table-cell>`)
```
(Import `TABLE_CELL_BORDER_STYLE_NAME` aus `./styleRegistry`.) Die `<table:covered-table-cell/>`
(`:137,:161`) bleiben ohne Rahmen — sie sind Teil einer verbundenen Zelle. `spanAttrs` darf weiter
leer sein (führt nur zu einem harmlosen Extra-Leerzeichen).

### 5.2 `src/formats/odt/styleRegistry.ts`
Neue Konstante + Funktion im Stil von `PARAGRAPH_ALIGN_STYLE_NAME`/`paragraphAlignStyleDefs`
(`:61-75`):
```ts
export const TABLE_CELL_BORDER_STYLE_NAME = 'TCBorder'

export function tableCellBorderStyleDef(): string {
  return (
    `<style:style style:name="${TABLE_CELL_BORDER_STYLE_NAME}" style:family="table-cell">` +
    `<style:table-cell-properties fo:border="0.5pt solid #9ca3af"/>` +
    `</style:style>`
  )
}
```
In `odt/writer.ts`, `buildContentXml` (`:206-214`), die `office:automatic-styles`-Konkatenation
(`:210`) um `tableCellBorderStyleDef()` erweitern:
`…${listStyleDefs()}${tableCellBorderStyleDef()}${styles.serializeDefs()}…`.

**Parität-Hinweis (bewusste Grenze):** Tabellen in **Kopf-/Fußzeile** landen in `styles.xml`
(`buildStylesXml`, automatic-styles `:221-224`), das — wie schon heute für
`paragraphAlignStyleDefs`/`headingStyleDefs`/`listStyleDefs` — diese Style-Defs **nicht** enthält.
Eine Tabelle in Kopf-/Fußzeile referenzierte `TCBorder` also ohne Definition. Das ist eine
**vorbestehende, konsistente** Einschränkung des Header/Footer-Style-Handlings (nicht durch dieses
Feature eingeführt) und wird hier bewusst **nicht** mitbehoben; falls gewünscht → eigener
Backlog-Eintrag (Abschnitt 10). Der Regelfall (Tabelle im Dokumentkörper) ist voll abgedeckt.

Farbe `#9ca3af` einheitlich zu DOCX (4.1) und `index.css:52`.

### 5.3 `src/formats/odt/reader.ts`
**Keine Pflichtänderung** (wie 4.2): `colwidth` bleibt `null` (`:315`);
`table:number-columns-spanned`/`-rows-spanned` (`:305-306`) bereits korrekt.

---

## 6. Tests

### 6.1 Unit-/Komponententests

| Datei | Änderung |
|---|---|
| `src/formats/shared/editor/__tests__/commands.test.ts` (**existiert — erweitern**, testet aktuell `canCut`/`cutSelection`) | Neue Blöcke: **`tableTab(1)`/`tableTab(-1)`** — Sprung zur nächsten/vorherigen Zelle; `Tab` in der letzten Zelle der letzten Zeile hängt eine Zeile an **und** platziert den Cursor **nachweislich** im ersten Zellinhalt der neuen Zeile (exakte `state.selection.$from`-Position, nicht nur „eine Zeile mehr“); `Shift-Tab` in der ersten Zelle → No-Op (`false`); `tableTab` außerhalb einer Tabelle → `false`. **`insertTable`-Tiefen-Guard**: Tabelle-in-Tabelle bis `MAX_TABLE_NESTING_DEPTH` erlaubt, ein Schritt darüber → `false`. **Grenzfall 3.8**: `bullet_list > list_item > paragraph("ab|cd")`, `insertTable(2,2)` ausführen, Ergebnis-JSON prüfen (`list_item.content` = `[paragraph("ab"), table, paragraph("cd")]`, Liste bleibt ein Element) — trifft die Analyse aus 1.2 nicht zu, tatsächliche Struktur dokumentieren statt hinnehmen. |
| `src/formats/shared/editor/__tests__/InsertTableDialog.test.tsx` (**neu**, `@testing-library/react`) | `parseTableDimension` direkt (0, negativ, Text, leer, Dezimal, `MAX_TABLE_COLS`, `+1`); Mount mit `initialRows/Cols=3` → Vorgaben sichtbar; beide Inputs haben `inputMode="numeric"`; ungültige Eingabe + Submit → Fehlermeldung sichtbar, `onConfirm` **nicht** gerufen; Escape → `onCancel`; Klick auf ein Element außerhalb der Dialog-Karte → `onCancel` (Grenzfall 1); **Klick auf ein daneben gerendertes `<div className="word-editor-surface">`-Stellvertreterelement → `onCancel` NICHT gerufen** (Abschnitt 2.2, deckt die Editor-Ausnahme der „Klick außerhalb“-Erkennung isoliert vom echten Editor ab); zweifaches schnelles Submit → `onConfirm` genau einmal. |
| `src/formats/docx/__tests__/roundtrip.test.ts` (im vorhandenen `describe('DOCX round trip: tables', …)` `:229`) | Neu: exportiertes `<w:tblPr>` enthält `<w:tblBorders>`. Neu: bei 5 Spalten ist `Σ w:gridCol/@w:w ≤ CONTENT_WIDTH_DXA` (kein Overflow). Optional-Regression: `<w:gridCol>`-Anzahl = `colCount` bei `colspan`-Zelle in Zeile 0. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Neu: jede reale `<table:table-cell>` referenziert `table:style-name="TCBorder"`. **Bestehende** Tests `:298` (Spaltenzahl `.toBe(2)`) und `:529-572` (Namens-Determinismus) bleiben unverändert Teil der Suite (Regressionsschutz, **nicht** neu geschrieben). |

### 6.2 E2E-Tests (Playwright, `tests/e2e/`)

**Pflichtänderung 1 (kritisch — sonst bricht der laut Anforderung dauerhaft grüne Pflichttest):**
`tests/e2e/selection-regression.spec.ts`, Test `:43-59`. Nach dem Klick (`:46`) muss der neue Dialog
bestätigt werden, **bevor** `.ProseMirror td` (`:48-49`) adressiert wird:
```ts
await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
await page.getByRole('dialog', { name: 'Tabelle einfügen' }).getByRole('button', { name: 'Einfügen' }).click()
```
Die Standardgröße 3×3 (Entscheidung 1.4) liefert ≥ 2 Zellen für `cells.nth(0)`/`nth(1)`.
Diese Änderung muss **im selben Commit** wie die Toolbar-Umstellung erfolgen. Der restliche Test
bleibt unverändert (DoD 9).

**Neu `tests/e2e/table-insert.spec.ts`** (Anforderung Abschnitt 5, Testfälle 1–13):

| TF | Testname (Vorschlag) |
|---|---|
| 1 | clicking the toolbar button opens the size dialog |
| 2 | rows=4, cols=3 + confirm inserts a 4×3 table (`.ProseMirror tr`=4, je `td`=3) |
| 3 | confirming defaults inserts the default size |
| 4 | invalid input (0 / negative / text) shows an error and inserts nothing |
| 5 | Escape / Abbrechen / Klick auf Element außerhalb (Toolbar/graue Seiten-Chrome) closes without any DOM/document change |
| 6 | typing into **every** cell of a fresh table lands in the right cell |
| 7 | Tab moves the cursor to the next cell |
| 8 | Tab in the last cell of the last row appends a new row |
| 9 | Ctrl+Z right after inserting removes the whole table (Text davor/danach intakt) |
| 10 | Ctrl+Shift+Z restores the table at the correct size |
| 11 | inserting between existing text keeps both text parts intact |
| 12 | inserting while text is selected replaces the selection |
| 13 | inserting with the cursor already inside a table cell → nested table, no crash |
| +  | inserting into an empty new document keeps it editable (Grenzfall 3.15) |
| +  | selection over dialog lifetime (Grenzfall 3.16 / TF 14): Dialog öffnen, ins Dokument zurückklicken, „Einfügen“ → Tabelle an der zuletzt geklickten Stelle |
| 22 | **`pressing Enter on the focused toolbar button opens the dialog`** (Grenzfall 18, DoD 11 — in einer früheren Fassung dieses Plans komplett gefehlt): `await page.locator('[aria-label="Tabelle einfügen"]').focus(); await page.keyboard.press('Enter')` (bewusst **kein** `.click()` — das simuliert die volle Maus-Ereignisfolge und würde den zu prüfenden Pfad umgehen) → `await expect(page.getByRole('dialog', { name: 'Tabelle einfügen' })).toBeVisible()`. Ergänzend eine zweite Variante mit `page.keyboard.press('Tab')`-Sequenz ab dem letzten Toolbar-Element bis zum Button, um `.focus()` (das Fokus-Styling/`:focus-visible` nicht auslöst) nicht als Krücke stehen zu lassen. |

**Testfall 21 (Touch-Grundfall, DoD 10, Grenzfall 17 — in einer früheren Fassung dieses Plans komplett
gefehlt):** Erfordert **keine** eigene Testdatei/keinen eigenen Testcode. `playwright.config.ts:27-36`
schränkt keines der drei Standardprojekte („Desktop Chrome“, „Mobile“ = Pixel 7 mit `hasTouch: true`,
„Tablet“ = iPad Mini) per `testMatch` auf bestimmte Specs ein — jede neue Datei unter `tests/e2e/`,
also auch `table-insert.spec.ts`, läuft automatisch auf allen drei Projekten. Die Testfälle 1–3 (Dialog
öffnen per Klick/Tap, Felder befüllen, „Einfügen“ antippen) decken damit den geforderten Grundfall auf
Mobile/Tablet **automatisch mit ab**, ohne gesonderten `test.describe`-Block — exakt dasselbe,
bereits etablierte Vorgehen wie in `spalte-einfuegen-code.md` Abschnitt 6.4 Punkt 8. Playwright
übersetzt `.click()` auf einem `hasTouch: true`-Projekt in ein Touch-Tap-Ereignis; eine
Mehrzellen-Auswahl per Touch-Drag ist ausdrücklich **nicht** Teil dieser Anforderung (Abschnitt 2.10).
Einzige Produktcode-Voraussetzung dafür, dass „Antippen eines Eingabefelds öffnet die native
Bildschirmtastatur“ mehr als nur „irgendeine Tastatur“ bedeutet: `inputMode="numeric"` auf beiden
Eingabefeldern (Abschnitt 2.2).

**Neu `tests/e2e/table-roundtrip.spec.ts`** (Abschnitt 4 + Testfälle 15–19), im Stil von
`tests/e2e/docx.spec.ts` (`page.waitForEvent('download')`, `JSZip.loadAsync`, direkte XML-Prüfung
als „unabhängiger Parser“):
- **DOCX:** 4×3 über Dialog → Export → `word/document.xml`: genau 4 `<w:tr>`, je 3 `<w:tc>`,
  Zellinhalte an richtiger Position (4.1.1); erneuter Import → identische Struktur (4.1.2);
  `<w:tblBorders>` vorhanden (4.1.4/DoD 5); Fremddatei mit `colspan`/`rowspan` → unverändert
  Export → Re-Import, Verbund erhalten (4.1.5, über echten Upload/Download); Cross-Format ODT→DOCX
  (4.1.6); große Fremddatei (>5 Spalten, >10 Zeilen) → Zellinhalte identisch (4.1.7/TF 19).
- **ODT:** 4×3 → `content.xml`: 4 `<table:table-row>`, je 3 `<table:table-cell>` (4.2.1);
  `colspan`-in-Zeile-0-Szenario über echten Export → `<table:table-column>`-Zahl korrekt (4.2.2,
  Regressions-Bestätigung); zwei Tabellen → zwei verschiedene `table:name` (4.2.6); `TCBorder`
  referenziert; Cross-Format DOCX→ODT (4.2.5).
- **Cross-Format doppelt (4.3):** DOCX→ODT→DOCX und ODT→DOCX→ODT — Struktur/Zellinhalt treu;
  Spaltenbreite/Rahmen-Feinheiten explizit **nicht** geprüft (Anforderung 4.3 nimmt sie aus).
- **Große Tabelle 20×20 (TF 18):** über Dialog einfügen; Export/Re-Import < 3 s (Anforderung 3.4);
  UI danach noch bedienbar (eine weitere Tastatureingabe hängt nicht).

### 6.3 Zuordnung Anforderung Abschnitt 5 → Umsetzung

| # | Testfall | Datei |
|---|---|---|
| 1–5, 11–14 | Dialog-Verhalten, Grenzfälle | `table-insert.spec.ts` |
| 6 | Alle Zellen tippbar | `table-insert.spec.ts` (+ `selection-regression.spec.ts` bleibt für den Sync-Bug) |
| 7–8 | Tab-Navigation | `table-insert.spec.ts` + Unit-Test `commands.test.ts` |
| 9–10 | Undo/Redo | `table-insert.spec.ts` |
| 15–19 | Rundreise/Cross-Format/große Datei | `table-roundtrip.spec.ts` |
| 20 | Selection-Sync-Regression bleibt | `selection-regression.spec.ts` (Pflichtänderung 1) |
| 21 | Touch-Grundfall auf Mobile/Tablet | `table-insert.spec.ts` TF 1–3, automatisch auf allen drei `playwright.config.ts`-Projekten (kein eigener Test nötig) |
| 22 | Enter-Taste auf fokussiertem Toolbar-Button | `table-insert.spec.ts` (neuer Test, `page.keyboard.press('Enter')` ohne `.click()`) |

---

## 7. Grenzfälle (Anforderung Abschnitt 3) — Abdeckung je Punkt

| # | Grenzfall | Abdeckung |
|---|---|---|
| 1 | Dialog abbrechen | `onCancel`, kein Dispatch vor Bestätigung (3.3 Punkt 5) |
| 2 | Ungültige Eingabe | `parseTableDimension` (2.2) |
| 3 | Sehr große Werte (100×100) | `MAX_TABLE_ROWS/COLS = 50` (1.3) |
| 4 | 20×20 zulässig | Performance-Test in `table-roundtrip.spec.ts` |
| 5 | Einfügen bei Selektion | `replaceSelectionWith` ersetzt (TF 12) |
| 6 | Dokumentanfang/-ende | `gapCursor` (`WordEditor.tsx:112`) vorhanden; gezielter Test |
| 7 | Verschachtelte Tabelle | Entscheidung 1.1 (erlaubt + Tiefen-Guard), TF 13, Unit-Test |
| 8 | Einfügen in Listenelement | Entscheidung 1.2, Unit-Test 6.1 |
| 9 | Tab in letzter Zelle | `tableTab` (3.1), TF 8 + Unit-Test |
| 10 | Tab verlässt Editor | **innerhalb** Tabellen gelöst (3.2); außerhalb Status quo → Abschnitt 10 |
| 11 | Mehrfach-Klick | Doppel-Submit-Schutz (2.2) |
| 12 | Undo + erneut tippen | kombinierter Test in `table-insert.spec.ts` |
| 13 | Selection-Sync beim Zellwechsel | bestehender Test bleibt (Pflichtänderung 1) |
| 14 | Spalten > Seitenbreite | DOCX-Verteilung repariert (4.1); visuelle Prüfung via TF 18 |
| 15 | Einfügen in leeres Dokument | `emptyDocJSON()` (`documentModel.ts:10`) + `replaceSelectionWith`; gezielter Test |
| 16 | Selektion über Dialog-Lebensdauer | 3.3 Punkt 5, 2.2 (Editor-Ausnahme von „Klick außerhalb“), TF 14 |
| 17 | Touch-Bedienung (Mobile/Tablet) | `inputMode="numeric"` (2.2); TF 1–3 laufen automatisch auf allen drei `playwright.config.ts`-Projekten (kein `testMatch`), TF 21 |
| 18 | Enter-Taste auf fokussiertem Toolbar-Button | zusätzliche `onClick`-Bindung (3.3 Punkt 3); TF 22 |

---

## 8. Abnahmekriterien (Anforderung Abschnitt 6) — Erfüllung

1. Dialog gebaut/verdrahtet, feste 2×2 entfernt, Selektion über Dialog-Lebensdauer korrekt →
   2.2, 3.3; TF 1–5, 14.
2. Tab/Umschalt+Tab inkl. neue Zeile am Ende; Tab verlässt Editor nicht (innerhalb Tabellen) →
   3.1, 3.2; TF 7–8 + Unit-Test.
3. Alle Testfälle Abschnitt 5 tatsächlich grün → 6.2/6.3 (dieser Plan legt Dateien/Fälle fest; die
   grüne Ausführung erfolgt in der Umsetzung).
4. Rundreise (DOCX/ODT/Cross) via unabhängigem Parser/Re-Import → 6.2. **Die zwei bereits behobenen
   ODT-Punkte sind KEINE offenen Defekte** — als Regression über `roundtrip.test.ts:298` bzw.
   `:529-572` grün gehalten (5.1), **nicht** neu behoben.
5. DOCX-Rahmenfrage explizit beantwortet → Entscheidung 1.5 (Rahmen exportiert, 4.1); Ergebnis nach
   Umsetzung in der Anforderung nachtragen.
6. Alle Grenzfälle geprüft/dokumentiert → Abschnitt 7 + tatsächliche Testergebnisse.
7. Grenzfall 3.7 beantwortet → Entscheidung 1.1 (erlaubt, Tiefen-Guard); in der Anforderung
   nachtragen.
8. Spaltenbreiten-Einschränkung behoben **oder** dokumentiert → Entscheidung 1.6: DOCX behoben
   (Verteilung + `colwidth`-Übernahme), ODT bewusst dokumentiert, Import bewusst `null`.
9. Selection-Sync-Regressionstest bleibt Teil der Suite → Pflichtänderung 1 passt ihn an die
   Dialog-UI an, statt ihn zu entfernen.
10. Touch-Grundfall auf „Mobile“/„Tablet“ nachgewiesen → 2.2 (`inputMode="numeric"`) + 6.2 (TF 1–3
    laufen automatisch auf allen drei Projekten, TF 21) — **in einer früheren Fassung dieses Plans
    vollständig gefehlt**, siehe Revisions-Hinweis Punkt 5.
11. Enter-Taste auf dem fokussierten Toolbar-Button öffnet den Dialog zuverlässig, per echter
    `page.keyboard.press('Enter')`-Aktivierung (nicht `.click()`) nachgewiesen → 3.3 Punkt 3
    (zusätzliche `onClick`-Bindung) + 6.2 (TF 22) — **in einer früheren Fassung dieses Plans
    vollständig gefehlt**, siehe Revisions-Hinweis Punkt 5.

---

## 9. Umsetzungsreihenfolge

1. `tableConfig.ts` anlegen; `commands.ts` (Tiefen-Guard, `tableTab`) + Unit-Tests in
   `commands.test.ts` **erweitern** — ohne UI verifizierbar.
2. `WordEditor.tsx` Keymap **erweitern** (Tab/Shift-Tab; bestehende Einträge erhalten) — nach 1.
3. `InsertTableDialog.tsx` + Komponententests — parallel zu 1/2.
4. `Toolbar.tsx` verdrahten (Fragment, Dialog, `insertTable`, **inkl. der zusätzlichen `onClick`-
   Bindung für Enter**, Abschnitt 3.3 Punkt 3) — nach 1 und 3.
5. **Im selben Schritt** Pflichtänderung 1 an `selection-regression.spec.ts`, sonst ist die Suite
   ab hier rot.
6. `docx/writer.ts` (Rahmen + Spaltenbreiten) und `odt/writer.ts`+`odt/styleRegistry.ts` (nur
   Zellrahmen — **kein** Anfassen von colCount/Tabellenname) + Unit-Tests — parallel zu 1–5.
7. `table-insert.spec.ts` (**inkl.** TF 22 „Enter auf fokussiertem Button“ und der Bestätigung, dass
   TF 1–3 unverändert auf „Mobile“/„Tablet“ laufen, TF 21), `table-roundtrip.spec.ts` — nach 1–6.
8. Volllauf `npm run test` + `npm run test:e2e` **auf allen drei Playwright-Projekten** (nicht nur
   Desktop Chrome), Abgleich gegen Abschnitt 6–8; danach Rückmeldung an Anforderung/Backlog für die
   Status-Änderung (Aufgabe der anschließenden QA, nicht dieses Plans).

---

## 10. Bewusst nicht umgesetzt / Folgearbeiten

- DOCX-Reader: Fremd-Spaltenbreiten (`w:tblGrid/w:gridCol`, `w:tcW`) beim Import in `colwidth`
  auslesen (4.2). Von der Anforderung selbst als akzeptable Einschränkung eingestuft.
- Tab-Verhalten **außerhalb** von Tabellen (Fokus verlässt evtl. den Editor, Grenzfall 3.10
  teilweise) — nur der Tabellenfall ist Scope.
- ODT-Zellrahmen für Tabellen in **Kopf-/Fußzeile** (styles.xml-Style-Defs) — vorbestehende,
  konsistente Header/Footer-Style-Grenze (5.2), eigener Backlog-Punkt.
- Individuelle ODT-Spaltenbreiten (`style:column-width`) — ohne Overflow-Bug nicht priorisiert (1.6).
- Kontextmenü / Tastenkombination zum Einfügen — Anforderung: explizit optional/außerhalb Scope.
- Alle in `tabelle-einfuegen-req.md` Zeile 22–33 ausgeschlossenen Tabellenfunktionen (Zeile/Spalte
  einfügen/löschen, Zellen verbinden/teilen, Tabelle löschen, Eigenschaften, Formatvorlagen,
  Kopfzeile wiederholen, Text↔Tabelle, Formel, Sortieren, Autoanpassen, Zeichnen) — eigene Slugs.
