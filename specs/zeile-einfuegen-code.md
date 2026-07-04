# Umsetzungsplan „Zeile einfügen (oberhalb/unterhalb)" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\zeile-einfuegen-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, insbesondere Abschnitt 6 „Tabellen", Abschnitt 2 Selection-Sync-
Regressionstest, Abschnitt 19 Export-Robustheit, Abschnitt 20.1/20.4). Code-Stand geprüft
am 2026-07-04 in `E:\docs` (kein Git-Repo im Arbeitsverzeichnis, Stand entspricht dem
Dateisystem zum Prüfzeitpunkt) — inklusive `node_modules/prosemirror-tables` Quellcode
(Paket-Version `1.8.5`, siehe `node_modules/prosemirror-tables/package.json`), nicht nur
dessen Typdeklarationen, damit Aussagen zum Bibliotheksverhalten (Grenzfall 2/3/5/8)
belegt und nicht nur vermutet sind.

Rolle dieses Dokuments: beantwortet, was am **bestehenden Code** fehlt bzw. falsch/
unvollständig ist, legt fest, welche Dateien geändert werden (kein einziges neues
Produktivmodul nötig — siehe Abschnitt 3), spezifiziert die ProseMirror-Schema-/Commands-
Änderungen (keine Schema-Änderung nötig, siehe Abschnitt 5), die Toolbar-Änderungen und
die Import-/Export-Anpassungen für OOXML (DOCX) und ODF (ODT). Ein zweiter, vom eigentlichen
Feature unabhängiger, aber durch dessen Abnahmekriterien zwingend berührter Bug wird in
Abschnitt 1 dokumentiert (analog zu `einfuegen-code.md` Abschnitt 1).

---

## 0. Bestätigung des Codebefunds aus `zeile-einfuegen-req.md` Abschnitt 0

Alle sieben Befundpunkte wurden gegen den tatsächlichen Dateiinhalt erneut verifiziert:

1. **Kein Bedienelement.** `src/formats/shared/editor/Toolbar.tsx:228-239` enthält genau
   einen Tabellen-Button (`title="Tabelle einfügen"`, ruft `insertTable(2, 2)` auf, Zeile
   234). Kein weiterer tabellenbezogener Button, kein Kontextmenü (`grep -rn
   "contextmenu" src/` liefert keinen Treffer), kein Tastatur-Shortcut für Zeilen
   überhaupt. Bestätigt.
2. **Kein Command.** `src/formats/shared/editor/commands.ts` (108 Zeilen) exportiert
   `isInTable` (Re-Export, Zeile 6), `setAlign`, `isAlignActive`, `setHeading`,
   `toggleList`, `liftFromList`, `insertImage`, `insertTable` (Zeilen 76-86, erzeugt
   **immer** eine komplett neue Tabelle über `state.tr.replaceSelectionWith(table)`),
   `applyMarkColor`, `clearMarkColor`. Keine Zeilen-Funktion. Bestätigt.
3. **Bibliothek installiert, aber ungenutzt.** `node_modules/prosemirror-tables/package.json`
   → Version `1.8.5`. Export-Liste (`node_modules/prosemirror-tables/dist/index.js:2625`)
   enthält u. a. `addRow`, `addRowAfter`, `addRowBefore`, `deleteRow`, `addColumnBefore`,
   `addColumnAfter`, `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`,
   `CellSelection`, `TableMap`, `goToNextCell`, `selectedRect`, `findTable`,
   `tableNodes`. `src/formats/shared/editor/WordEditor.tsx:81-82` bindet bereits
   `columnResizing()` und `tableEditing()` ein. Kein Zeilen-/Spalten-Command wird
   irgendwo importiert (`grep -rn "addRow\|addColumn\|deleteRow" src/` → keine Treffer
   außerhalb von `node_modules`). Bestätigt.
4. **Schema unterstützt beliebige Zeilenanzahl.** `src/formats/shared/schema.ts:106`:
   `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`.
   Bestätigt — siehe Abschnitt 5 unten für die Detailanalyse, warum hier **keine**
   Änderung nötig ist.
5. **Reader/Writer bereits mit Unit-Tests für mehrzeilige Tabellen abgesichert, aber nie
   über echte Bedienung erzeugt.** `src/formats/docx/__tests__/roundtrip.test.ts:173-249`
   (`describe('DOCX round trip: tables')`) und
   `src/formats/odt/__tests__/roundtrip.test.ts:162-210`
   (`describe('ODT round trip: tables')`) — beide bauen Tabellen direkt als JSON-Fixture.
   Bestätigt. **Wichtige Ergänzung, die der Befund in der Anforderungsdatei noch nicht
   hatte:** Der ODT-Rowspan-Test (`roundtrip.test.ts:194-209`, „preserves merged cells
   (colspan/rowspan)") testet in Wahrheit **nur colspan**, nicht rowspan über zwei Zeilen
   hinweg (anders als das DOCX-Pendant `docx/__tests__/roundtrip.test.ts:223-248`, das
   echtes `rowspan: 2` über zwei Zeilen mit unterschiedlicher Zellenzahl testet). Das ist
   kein Zufall, sondern kaschiert einen echten Bug — siehe Abschnitt 1.
6. **Spaltenzahl-Kollaps-Risiko beim Export.** `src/formats/docx/writer.ts:130`:
   `colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan
   ?? 1), 0) || 1` (berücksichtigt colspan). `src/formats/odt/writer.ts:88`:
   `colCount = rows[0]?.content?.length ?? 1` (**ignoriert** colspan komplett — schlechter
   als beim DOCX-Pendant). Bestätigt, mit einer wichtigen Präzisierung in Abschnitt 2
   unten: **dieses konkrete Grenzfall-5-Szenario (Zeile oberhalb der bisherigen ersten
   Zeile einfügen) triggert den Bug in der Praxis nicht**, weil `addRowBefore`/`addRowAfter`
   aus `prosemirror-tables` für eine frisch eingefügte Zeile grundsätzlich eine Zelle pro
   Spalte ohne colspan erzeugen (siehe Abschnitt 2, Punkt 2) — die **zugrunde liegende**
   Ungenauigkeit der ODT-Spaltenzahlberechnung bleibt aber ein eigenständiger, hier
   mitzubehebender Bug, weil sie mit dem in Abschnitt 1 gefundenen Bug zusammenhängt
   (beide sitzen im selben `case 'table'`-Block).
7. **Keine Tests.** `grep -rn "addRow\|insertRow\|Zeile einfügen" tests/ src/**/__tests__`
   liefert keinen Treffer. Bestätigt.

Der Befund aus `zeile-einfuegen-req.md` Abschnitt 0 ist damit vollständig bestätigt, mit
einer zusätzlichen, wichtigeren Präzisierung: ein erheblicher Teil der in Abschnitt 4 der
Anforderungsdatei aufgeführten Grenzfälle (2, 3, 5, 6, 7, 8) wird bereits durch
`prosemirror-tables`s eigene `addRow`-Implementierung korrekt behandelt — der
Implementierungsaufwand ist noch geringer als die Anforderungsdatei selbst einschätzt
(„überwiegend Verdrahtung"), **mit einer Ausnahme**: dem in Abschnitt 1 beschriebenen
ODT-Schreibfehler, der ohne diese Prüfung unentdeckt geblieben wäre.

---

## 1. Kritischer Zusatzbefund: `odt/writer.ts` erzeugt bei vertikalen Merges (rowspan) heute schon ungültige ODF-Struktur

**Das ist der wichtigste Fund dieser Prüfung**, weil er unabhängig vom Feature
„Zeile einfügen" existiert (jede vorhandene, importierte ODT-Tabelle mit `rowspan` ist
betroffen), aber durch die Abnahmekriterien dieses Tickets (Grenzfall 2, Anforderung 3.3,
Feature-Rundreise 5.2 Punkt 5) zwingend zu Tage tritt und **behoben werden muss**, weil
sonst kein einziger dieser Punkte für ODT wirklich abnahmefähig ist.

**Belegkette:**

- `src/formats/odt/writer.ts:86-111` (`case 'table'` in `blockToOdt`) mappt jede Zeile
  1:1 auf `(row.content ?? []).map(...)` — **ohne** Spalten-Positionsverfolgung. Für jede
  JSON-`table_cell` wird genau ein `<table:table-cell>` geschrieben, sonst nichts.
- ProseMirrors `tableNodes`-Modell speichert (wie bei DOCX) **keinen** eigenen Knoten für
  eine Zelle, die durch den `rowspan` einer Zelle in einer früheren Zeile „überdeckt"
  wird — die Folgezeile enthält in ihrem `content`-Array schlicht **eine Zelle weniger**
  an dieser Spaltenposition (siehe `docx/__tests__/roundtrip.test.ts:236-238`: Zeile 2
  hat nur 1 Zelle statt 2, weil Spalte 1 durch `rowspan: 2` aus Zeile 1 überdeckt ist).
- `docx/writer.ts:128-171` (`tableToDocx`) löst das korrekt mit einem `pending[]`-Array
  (Zeile 133, `pending[c] = rowspan - 1` bei Zeile 161-163), das bei jeder Folgezeile für
  überdeckte Spalten explizit einen `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`
  „Continuation"-Zellknoten in die OOXML-Ausgabe schreibt (Zeile 142-146) — **exakt das
  Gegenstück fehlt in `odt/writer.ts` komplett.** Der ODF-Standard verlangt für dieselbe
  Situation ein `<table:covered-table-cell/>`-Element pro überdeckter Rasterzelle (ODF
  1.3 Teil 1, §9.1.1/§9.1.4) — ohne dieses Element hat eine Zeile in der exportierten
  ODT-Datei **weniger `<table:table-cell>`/`<table:covered-table-cell>`-Kindelemente als
  `table:number-columns` deklariert**, was in einer echten Zielanwendung (LibreOffice)
  zu falsch ausgerichteten Spalteninhalten oder impliziter Reparatur/Datenverlust führt —
  genau das, was `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 („nicht nur durch unseren
  eigenen Reader wieder einlesbar") als Prüfmaßstab verlangt.
- **Warum das bisher nicht auffiel:** `src/formats/odt/reader.ts:189-203` filtert beim
  Einlesen ausschließlich auf `childElements(rowEl, ODF_NAMESPACES.table, 'table-cell')`
  (Zeile 192) — `<table:covered-table-cell>`-Elemente werden also beim Lesen ohnehin
  ignoriert/übersprungen (das ist für sich genommen **korrekt**, weil ODF im Gegensatz zu
  OOXML den `rowspan`-Wert bereits direkt als Attribut `table:number-rows-spanned` auf
  der Ursprungszelle trägt, Zeile 194 — die Folgezeilen-Elemente selbst tragen keine
  Zusatzinformation). Weil unser eigener Reader **und** Writer denselben (fehlenden)
  Blindpunkt teilen, besteht ein reiner Eigen-Rundtrip-Unit-Test (Reader liest zurück,
  was der Writer geschrieben hat) selbst mit dieser Lücke — das ist exakt die Falle, vor
  der `zeile-einfuegen-req.md` Befund 0.5 warnt („Reader/Writer... aber nur mit direkt
  konstruierten Test-Fixtures... nie über eine tatsächliche Zeilen-Einfügen-Bedienung").
  `roundtrip.test.ts:194-209` deckt deshalb nur `colspan` ab, nie ein zweizeiliges
  `rowspan`-Szenario — vermutlich genau deswegen, weil ein solcher Test bislang nie
  ergänzt wurde, nicht weil er bewusst als „funktioniert nicht" markiert worden wäre.

**Notwendige Behebung (Teil dieses Tickets, nicht optional):** `odt/writer.ts`s
`case 'table':` erhält denselben `pending[]`-Mechanismus wie `docx/writer.ts` **und**
dieselbe colspan-bewusste `colCount`-Berechnung (behebt zugleich Befund 0.6/Grenzfall 5
für ODT strukturell, nicht nur für den einen im Feature ausgelösten Spezialfall). Siehe
Abschnitt 6.4 für die konkrete Ersetzung.

---

## 2. Bestätigtes Bibliotheksverhalten von `prosemirror-tables` (Belegstellen)

Gegen `node_modules/prosemirror-tables/dist/index.js` (nicht nur `.d.ts`) geprüft, weil
mehrere Design-Entscheidungen unten direkt davon abhängen, **was die Bibliothek bereits
selbst tut** — das entscheidet, wie viel eigener Code überhaupt nötig ist.

| # | Frage | Fundstelle | Ergebnis |
|---|---|---|---|
| 1 | Verlängert `addRowBefore`/`addRowAfter` einen bestehenden vertikalen Merge korrekt (Anforderung 3.3, Grenzfall 2)? | `addRow` (Zeile 1418-1440): `if (row > 0 && row < map.height && map.map[index] == map.map[index - map.width]) { ...tr.setNodeMarkup(..., { ...attrs, rowspan: attrs.rowspan + 1 }); col += attrs.colspan - 1 }` | **Ja, bereits eingebaut.** Wird eine Zeile innerhalb eines rowspan-Bereichs eingefügt, wird die Ursprungszelle einfach um 1 verlängert, es entsteht **keine** neue Zelle und **keine** verwaiste Referenz. Muss nur mit Test bestätigt werden (Abschnitt 8), nicht selbst implementiert werden. |
| 2 | Übernimmt eine frisch eingefügte Zeile eine „plausible" Spaltenaufteilung, wenn die Nachbarzeile `colspan` hat (Grenzfall 3)? | `addRow`, `else`-Zweig (Zeile 1432-1437): pro Spaltenindex wird — sofern keine Fortsetzung eines Merges vorliegt — **eine einzelne** neue Zelle (`colspan` 1, per `createAndFill()`) erzeugt; die Schleife läuft pro Spalte (`col++`), es gibt **keinen** Code-Pfad, der eine neu erzeugte Zelle mit `colspan > 1` anlegt. | Eine neue Zeile hat **immer genau `map.width` Zellen** (je colspan 1) — Summe der effektiven Spalten stimmt per Konstruktion **immer** exakt mit dem Rest der Tabelle überein. Erfüllt die Minimalanforderung aus Grenzfall 3 automatisch, ohne eigenen Code. |
| 3 | Was passiert bei Grenzfall 5 (Zeile wird neue Zeile 1, vorherige Zeile 1 hatte colspan)? | Folgt aus Punkt 2: die **neue** Zeile 0 hat `map.width` Einzel-Zellen (kein colspan), unabhängig davon, welche colspan-Struktur die (nun verschobene) alte Zeile 1 hatte. | Für DOCX ist `colCount` (Summe der colspans der neuen Zeile 0) automatisch `= map.width`, exakt richtig. Für ODT ist das nach der Abschnitt-1-Korrektur (colspan-bewusste Summe) ebenso korrekt — **ohne** die Korrektur wäre `rows[0].content.length` zufällig auch richtig (da die neue Zeile keine colspans hat), aber nur, weil hier kein colspan mehr vorkommt; der zugrunde liegende Bug (Befund 0.6) besteht unabhängig fort und muss trotzdem behoben werden (Abschnitt 1). |
| 4 | Bleibt die Editor-Selektion nach dem Einfügen in derselben logischen Zelle (Anforderung 3.4)? | `addRow` dispatcht nur `tr.insert(rowPos, ...)`, **ohne** `tr.setSelection(...)` aufzurufen. `EditorState.apply()` (Standardverhalten von `prosemirror-state`, nicht `prosemirror-tables`) mappt die bestehende Selektion automatisch durch `tr.mapping`, wenn keine neue Selektion explizit gesetzt wird. | **Automatisch korrekt, kein eigener Code nötig.** Bei `addRowBefore` (Einfügung **vor** der aktuellen Zeile) verschiebt sich die absolute Cursor-Position um die Größe der neuen Zeile nach hinten — bleibt aber in derselben logischen Zelle. Bei `addRowAfter` ändert sich die Position gar nicht (Einfügung liegt vollständig danach). Muss nur mit Test verifiziert werden (Selection-Sync-Regressionsschutz, Abschnitt 2 der Hauptspezifikation). |
| 5 | Ein Undo-Schritt pro Aktion (Anforderung 3.6)? | `addRowBefore`/`addRowAfter` (Zeile 1446-1466) dispatchen jeweils **eine** Transaktion. `history()` (aus `prosemirror-history`, bereits in `WordEditor.tsx:70` eingebunden) fasst standardmäßig jede dispatchte Transaktion zu einem eigenen Undo-Eintrag zusammen. | Automatisch korrekt, kein eigener Code nötig. |
| 6 | Was tut `addRowBefore`/`addRowAfter` bei einer `CellSelection`, die mehrere Zeilen umspannt (Grenzfall 8)? | `selectedRect` (Zeile 1303-1315): `map.rectBetween(...)` liefert `{ left, top, right, bottom }` für die **gesamte** Selektion; `addRowBefore` ruft `addRow(tr, rect, rect.top)`, `addRowAfter` ruft `addRow(tr, rect, rect.bottom)` auf — **jeweils genau eine** neue Zeile relativ zur obersten/untersten Zeile der Selektion. | **Bibliotheksverhalten entspricht Variante (a)** aus der Anforderungsdatei (Abschnitt 4, Grenzfall 8): „es wird relativ zur ersten/letzten Zeile der Selektion je **eine** Zeile eingefügt" — **nicht** Variante (b) (N Zeilen für N selektierte Zeilen). Siehe Abschnitt 4 unten für die verbindliche Festlegung dieser Variante als Soll-Verhalten. |
| 7 | Repariert `tableEditing()` bereits heute eine strukturell inkonsistente (z. B. aus einer Fremddatei importierte) Tabelle, bevor unser Command überhaupt zum Zug kommt (Grenzfall 9)? | `tableEditing()` (Zeile 2593-2622) registriert `appendTransaction(_, oldState, state) { return normalizeSelection(state, fixTables(state, oldState), ...) }` — läuft nach **jeder** dispatchten Transaktion; `fixTables`/`fixTable` (Zeile 784-849) behebt `collision`/`missing`/`overlong_rowspan`/`zero_sized`-Probleme in der `TableMap` automatisch per Zusatztransaktion. | **Ja, mit einer Einschränkung:** `appendTransaction` läuft nicht für die allererste `EditorState.create(...)`-Initialisierung (`WordEditor.tsx:66-87`), sondern erst ab der ersten **dispatchten** Transaktion danach. Da unsere neuen Buttons aber erst aktivierbar sind, wenn `isInTable(state)` wahr ist — was voraussetzt, dass der Cursor bereits per Klick in eine Zelle gesetzt wurde, was selbst bereits eine dispatchte Transaktion ist (`view.dispatch` beim Setzen der Klick-Selektion) — hat `fixTables` zu diesem Zeitpunkt bereits mindestens einmal gegriffen. Trotzdem: kein Ersatz für einen expliziten Test mit einer absichtlich unregelmäßigen Tabelle (Abschnitt 8). |

**Konsequenz:** Die Kernlogik für Grenzfälle 1-8 (mit Ausnahme des ODT-Bugs aus
Abschnitt 1) ist bereits vollständig in `prosemirror-tables` vorhanden. Der verbleibende
Implementierungsaufwand ist tatsächlich reine Verdrahtung + der eine ODT-Bugfix + Tests
— **kein** neuer Tabellen-Manipulationsalgorithmus.

---

## 3. Architektur-Entscheidung

1. **Kein neues Modul nötig.** Anders als bei vergleichbaren Tickets (z. B.
   `einfuegen-code.md`, das `shared/editor/paste.ts` einführt) genügt hier eine
   Erweiterung von drei bestehenden Dateien (`commands.ts`, `Toolbar.tsx`,
   `WordEditor.tsx`) plus dem in Abschnitt 1 beschriebenen Bugfix in `odt/writer.ts`.
   Begründung: Es gibt keine wiederverwendbare „reine Logik ohne ProseMirror-Typen", die
   ein eigenes Modul rechtfertigen würde (anders als z. B. `splitPlainTextIntoParagraphs`
   in der Paste-Anforderung) — die gesamte Funktionalität besteht aus dünnen
   Command-Wrappern um bereits vorhandene, gut getestete Bibliotheksfunktionen.
2. **`commands.ts` bleibt der einzige Ort, an dem `Toolbar.tsx` Tabellen-Commands
   importiert** — analog zum bestehenden Muster `export { isInTable }` (Zeile 6).
   `Toolbar.tsx` importiert **nie** direkt aus `prosemirror-tables`, damit ein künftiger
   Wechsel/Wrapper (z. B. für `zeile-loeschen`, `spalte-einfuegen`) an einer Stelle
   gebündelt bleibt.
3. **Kein eigenes Tabellen-Kontextmenü.** Deckt sich mit der Anforderungsdatei
   (Abschnitt 1, # 3: „Nice-to-have, kein Blocker"). Wird **nicht** umgesetzt, um den
   Scope dieses Tickets nicht zu erweitern — Entscheidung, keine vergessene Anforderung
   (analog zu `einfuegen-code.md` Abschnitt 4.5 für das allgemeine Kontextmenü).
4. **Tab-Navigation zwischen Zellen ist ein notwendiger Nebeneffekt, keine
   Scope-Erweiterung.** Um Grenzfall 4 („Tab in letzter Zelle fügt Zeile hinzu")
   umzusetzen, muss zwingend zuerst `goToNextCell(1)` (normale Tab-Navigation zur
   nächsten Zelle) in einer `chainCommands`-Kette vorangestellt werden — der
   „Tab-in-letzter-Zelle"-Fall ist exakt der Fallback, wenn `goToNextCell(1)` `false`
   liefert (keine nächste Zelle mehr vorhanden). Es ist technisch nicht möglich, nur den
   Randfall zu binden, ohne die allgemeine Tab-Navigation als ersten Kettenglied
   mitzuliefern — das ist kein „scope creep", sondern zwingende Voraussetzung. Als
   spiegelbildliche Ergänzung wird `Shift-Tab` an `goToNextCell(-1)` gebunden (vorherige
   Zelle) — ohne Fallback-Zeilenerzeugung (dafür gibt es in Word/LibreOffice keine
   Konvention), liefert an der ersten Zelle einfach `false` (Standard-Browser-Verhalten
   greift dort unverändert wie heute überall).
   **Wichtig für Kompatibilität mit dem separaten Ticket `liste-einruecken-tab`**
   (`specs/liste-einruecken-tab-req.md:34-42`, bislang ebenfalls **nicht** implementiert,
   bestätigt: kein `Tab`/`Shift-Tab`-Eintrag in `WordEditor.tsx`): Die hier gebundene
   Tab-Kette **muss** `false` zurückgeben, wenn der Cursor sich außerhalb einer Tabelle
   befindet (das leisten sowohl `goToNextCell` als auch die neue Fallback-Funktion
   bereits von sich aus über `isInTable(state)`), damit ein künftiger, zweiter
   `chainCommands`-Eintrag für Listen-Einzug außerhalb von Tabellen weiterhin
   anschließbar bleibt, ohne diese Datei nochmals umbauen zu müssen.
5. **Keine Änderung an `reconcileSelectionOnClick`** (`WordEditor.tsx:42-53`) nötig:
   Zeilen-Einfügen läuft immer über eine reguläre, von `dispatchTransaction` verarbeitete
   Transaktion (Toolbar-Klick → `run()` → `command(state, dispatch)` → `view.dispatch`),
   nie über eine DOM-Mutation ohne Transaktion — der bekannte Selection-Sync-Bug entsteht
   nur dort. Muss trotzdem mit einem expliziten Regressionstest bestätigt werden
   (Abschnitt 8.2), weil genau das laut Anforderung Abschnitt 2 Pflicht ist.

---

## 4. Verbindliche Design-Entscheidungen zu offenen Fragen der Spezifikation

### 4.1 Grenzfall 8 (mehrzeilige `CellSelection`) — Entscheidung: Bibliotheksverhalten übernehmen

**Entscheidung: Variante (a).** Bei einer `CellSelection`, die mehrere Zeilen umspannt,
wird genau **eine** neue Zeile relativ zur obersten (Zeile-oberhalb-Aktion) bzw.
untersten (Zeile-unterhalb-Aktion) Zeile der Selektion eingefügt — das ist das
Standardverhalten von `addRowBefore`/`addRowAfter` (Abschnitt 2, Punkt 6) und wird
**unverändert übernommen**, nicht durch eigenen Code auf Variante (b) („N Zeilen für N
selektierte Zeilen") umgebaut. Begründung:

- Variante (b) würde bedeuten, `addRowBefore`/`addRowAfter` **nicht** direkt zu
  verwenden, sondern eine eigene Schleife über `rect.bottom - rect.top` Wiederholungen zu
  schreiben — das widerspricht der in der Anforderungsdatei selbst hervorgehobenen
  Erkenntnis (Befund 0.3), dass der Aufwand „überwiegend Verdrahtung" sein soll, und
  führt zusätzliche, ungetestete Eigenlogik ein, wo die Bibliothek bereits ein
  konsistentes, wohldefiniertes Verhalten liefert.
- Variante (a) ist zudem das in mehreren gängigen Rich-Text-Editoren (nicht nur
  ProseMirror-basierten) beobachtbare Verhalten für „eine Zeile einfügen" (im Unterschied
  zu einer eigenen „N Zeilen einfügen"-Funktion) — die Nutzerin bekommt exakt eine neue,
  leere Zeile, unabhängig davon, wie viele Zeilen sie zuvor markiert hatte.
- **Empfehlung an die Anforderungsseite:** Dieser Absatz gilt als die in
  `zeile-einfuegen-req.md` Abschnitt 6, Testplanhinweis 5 geforderte Dokumentation der
  gewählten Verhaltensvariante („muss zunächst in dieser Datei oder einem Folge-Commit
  dokumentiert... werden") und ist Grundlage für den in Abschnitt 8.1 unten festgelegten
  Test.

### 4.2 Formatierung/Zellinhalt der neuen Zeile (Anforderung 3.5) — keine Übernahme, weil `colwidth` heute nirgends erhalten bleibt

Geprüft: `src/formats/docx/reader.ts:244` und `src/formats/odt/reader.ts:197` setzen
`colwidth: null` **immer** (nie aus `w:gridCol`/`table:table-column` gelesen);
`docx/writer.ts:131` schreibt für **jede** Spalte pauschal `<w:gridCol w:w="2000"/>`;
`odt/writer.ts` schreibt `<table:table-column/>` **ohne** Breitenangabe. Das heißt: **kein**
bestehender Zellknoten (importiert oder per `insertTable` erzeugt) trägt heute je einen
von `null` abweichenden `colwidth`-Wert. Eine per `addRowBefore`/`addRowAfter` neu
erzeugte Zelle hat ebenfalls `colwidth: null` (Default von `cell.createAndFill()`) — sie
weicht damit von **keiner** bestehenden Zelle ab. Die in Anforderung 3.5 befürchtete
optische „Sprung"-Situation kann mit dem heutigen Code gar nicht auftreten, weil es keine
divergierenden `colwidth`-Werte gibt, die man erben/nicht erben könnte.
**Entscheidung:** keine Zusatzlogik zur `colwidth`-Übernahme — das wäre Vorgriff auf eine
Funktion (persistente Spaltenbreiten), die dieses Ticket nicht einführt.
Zeichenformatierung: `createAndFill()` liefert eine leere Zelle mit einem leeren
`paragraph` ohne Marks — entspricht bereits exakt der Anforderung „kein automatisches
Übernehmen von Formatierung". Keine Zusatzlogik nötig.

### 4.3 Grenzfall 9 (kein stiller Fehlschlag bei unerwartetem Fehler) — Entscheidung: defensiver Wrapper in `Toolbar.tsx`, kein globaler Umbau von `run()`

Wie in Abschnitt 2, Punkt 7 begründet, gibt es aktuell **keinen bekannten** Code-Pfad, auf
dem `addRowBefore`/`addRowAfter` — einmal `isInTable(state) === true` — `false`
zurückgeben oder eine Exception werfen (der Button ist ohnehin deaktiviert, solange
`isInTable` falsch ist, siehe Abschnitt 6.2). Trotzdem verlangt Anforderung 3.7/Grenzfall 9
ausdrücklich eine sichtbare Rückmeldung für den Fall, dass doch etwas fehlschlägt (z. B.
eine bislang unbekannte Interaktion mit einer besonders pathologischen Fremdstruktur).
**Entscheidung:** Ein schlanker, **lokal auf die zwei neuen Buttons beschränkter**
try/catch-Wrapper (nicht in `commands.ts`, sondern in `Toolbar.tsx`, siehe Abschnitt 6.2)
— bewusst **kein** Umbau des globalen `run()`-Helpers für alle bestehenden Buttons, um
den Scope dieses Tickets nicht auf unbeteiligte Funktionen (Fett, Ausrichtung, Listen...)
auszuweiten. `run()` selbst wird nur um einen Rückgabewert ergänzt (siehe unten), das ist
rückwärtskompatibel, weil alle elf bestehenden Aufrufstellen den Rückgabewert schlicht
ignorieren.

### 4.4 Cross-Format-Rundreise (Anforderung 5.2) — Entscheidung: nur auf Unit-Test-Ebene möglich, nicht per echter Bedienung

**Wichtiger, code-verifizierter Befund:** `src/formats/types.ts:15-28`
(`FormatModule<TContent>`) und `src/app/DocumentWorkspace.tsx` zeigen, dass ein
geöffnetes Dokument **ausschließlich** über `module.exportFile` in **sein eigenes**
Format re-exportiert werden kann (`docxModule.exportFile = writeDocx`,
`odtModule.exportFile = writeOdt`, siehe `src/formats/docx/docx.ts:12`) — es gibt in der
App **keine** Funktion „als anderes Format exportieren". Ein als DOCX geöffnetes und
bearbeitetes Dokument kann über die UI nicht als ODT exportiert werden und umgekehrt.
**Konsequenz:** Der in Anforderung 5.2 geforderte Cross-Format-Test („in ein ursprünglich
als DOCX importiertes Dokument eine Zeile einfügen und als ODT exportieren") **kann nicht
als E2E-Test über echte Bedienung** umgesetzt werden, weil die dafür nötige App-Funktion
schlicht nicht existiert (das ist eine Lücke außerhalb des Scopes dieses Tickets). Er wird
stattdessen als **Unit-Test** umgesetzt: `readDocx(...)` liefert `WordDocumentContent`,
dessen `body`-JSON (nach simuliertem Zeilen-Einfügen über eine direkt aufgerufene
ProseMirror-Transaktion, s. Abschnitt 8.1) direkt an `writeOdt(...)` übergeben wird, und
umgekehrt. Das ist konsistent mit Anforderung Abschnitt 6, Testplanhinweis 4 („sowohl als
Unit-Test... als auch zusätzlich als E2E-Test"), nur dass der Cross-Format-Teil aus
strukturellen Gründen ausschließlich der Unit-Test-Spielart zufällt — dieser Punkt gehört
in die Abnahme-Checkliste (Abschnitt 11) als dokumentierte Einschränkung, nicht als
stillschweigend erfüllt.

---

## 5. ProseMirror-Schema — keine Änderung nötig

`src/formats/shared/schema.ts:106`: `tableNodes({ tableGroup: 'block', cellContent:
'block+', cellAttributes: {} })` liefert bereits `colspan`/`rowspan`/`colwidth` als
Standardattribute jeder `table_cell`/`table_header`-Node sowie beliebige `block+`-Inhalte
pro Zelle (mehrere Absätze, verschachtelte Tabellen, Listen, Bilder). Eine per
`addRowBefore`/`addRowAfter` eingefügte Zelle ist strukturell identisch zu einer beim
Import bereits vorhandenen — keine neuen Attribute, kein neuer Node-Typ nötig. Bestätigt
insbesondere für Grenzfall 10 (verschachtelte Tabelle in einer Zelle): `cellContent:
'block+'` schließt `table` ein (da `table` selbst `tableGroup: 'block'` trägt, Zeile
106), das ist bereits heute so und bleibt unverändert.

---

## 6. Datei-für-Datei-Umsetzungsplan

### 6.1 GEÄNDERT: `src/formats/shared/editor/commands.ts`

Neuer Import-Block (ergänzt Zeile 1-4):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import {
  isInTable,
  addRowBefore,
  addRowAfter,
  addRow,
  goToNextCell,
  selectedRect,
  findTable,
  TableMap,
} from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable }
```

Neue Exporte (nach `insertTable`, Zeile 86, einzufügen):

```ts
/** Fügt eine neue, leere Zeile unmittelbar oberhalb der Zeile ein, in der sich die
 *  aktuelle Selektion befindet (Anforderung Abschnitt 3.1). Bei einer `CellSelection`,
 *  die mehrere Zeilen umspannt, bezieht sich „oberhalb" auf die oberste Zeile der
 *  Selektion (Grenzfall 8, Entscheidung siehe zeile-einfuegen-code.md Abschnitt 4.1) —
 *  reiner Re-Export der bereits korrekten `prosemirror-tables`-Implementierung, siehe
 *  zeile-einfuegen-code.md Abschnitt 2 für die Belegkette (Merge-Verlängerung,
 *  Spaltenkonsistenz, Selektions-/Undo-Verhalten sind bereits in der Bibliothek
 *  korrekt). */
export const insertRowBefore: Command = addRowBefore

/** Spiegelbildlich zu `insertRowBefore` (Anforderung Abschnitt 3.2). */
export const insertRowAfter: Command = addRowAfter

/** Navigation zur nächsten/vorherigen Tabellenzelle (Tab/Umschalt+Tab). Liefert `false`
 *  außerhalb einer Tabelle bzw. — für `direction: 1` — wenn keine nächste Zelle mehr
 *  existiert (das ist genau der Fall, den `insertRowOnTabAtTableEnd` unten als
 *  Fallback behandelt). */
export function goToTableCell(direction: 1 | -1): Command {
  return goToNextCell(direction)
}

/** Bindet Grenzfall 4 der Anforderung: Tab in der letzten Zelle der letzten Zeile fügt
 *  eine neue Zeile unterhalb an und setzt den Cursor in deren erste Zelle — in **einer**
 *  Transaktion (Anforderung 3.6: ein Undo-Schritt für den gesamten Vorgang, keine
 *  getrennte Selektions-Transaktion danach, die einen zweiten History-Eintrag erzeugen
 *  könnte). Muss in einer `chainCommands`-Kette **nach** `goToTableCell(1)` stehen, damit
 *  normale Tab-Navigation (nicht letzte Zelle) unverändert Vorrang hat — siehe
 *  zeile-einfuegen-code.md Abschnitt 3, Punkt 4/6.3. */
export function insertRowOnTabAtTableEnd(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false
    if (dispatch) {
      const rect = selectedRect(state)
      const tr = addRow(state.tr, rect, rect.bottom)
      const table = findTable(tr.doc.resolve(tr.mapping.map(rect.tableStart)))
      if (table) {
        const map = TableMap.get(table.node)
        const firstCellPos = table.start + map.positionAt(rect.bottom, 0, table.node)
        tr.setSelection(TextSelection.near(tr.doc.resolve(firstCellPos + 1)))
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

**Begründung der Positionsberechnung** (damit die Implementierung nicht „irgendwie"
nachgebaut wird, sondern gegen die Bibliotheksquelle abgesichert ist):
`node_modules/prosemirror-tables/dist/index.js:1266-1287` (`moveRow`) zeigt exakt dasselbe
Muster — nach einer Tabellenmutation wird die Tabelle **erneut** über
`findTable(tr.doc.resolve(...))` aus `tr.doc` aufgelöst (nicht die alte, vor der Mutation
gecachte Node verwendet), dann `TableMap.get(newTable)` neu berechnet, dann
`map.positionAt(row, col, newTable)` (Zeile 101-110) für die absolute Zellposition
verwendet. `rect.bottom` ist hier sicher als Zeilenindex der **neu eingefügten** Zeile
verwendbar, weil `addRow(tr, rect, rect.bottom)` diese Zeile exakt an Index `rect.bottom`
einfügt. `tr.mapping.map(rect.tableStart)` ist zwar in diesem konkreten Fall unverändert
(die Einfügung liegt immer **nach** `tableStart`, nie davor, weil dieser Pfad nur am Ende
der Tabelle feuert), wird aber trotzdem über `tr.mapping` gemappt statt den rohen Wert
wiederzuverwenden, um nicht von dieser Eigenschaft abhängig zu sein, falls der Code
künftig geändert wird. **Diese Positions-Arithmetik muss durch den in Abschnitt 8.1
geforderten Unit-Test verifiziert werden, bevor sie als korrekt gilt** — insbesondere der
`+ 1`-Offset (Sprung von der Zellgrenze in den ersten gültigen Cursor-Punkt darin), der
hier aus Analogie zu vergleichbaren Stellen in der Bibliothek angenommen, aber nicht
direkt aus einer identischen Bibliotheksstelle kopiert wurde.

**Kein Wrapper mit Zusatzlogik für `insertRowBefore`/`insertRowAfter` selbst** — bewusste
Entscheidung, siehe Abschnitt 2 (Bibliothek erledigt Merge-Verlängerung, Spaltenzahl,
Selektions-Mapping, Undo-Gruppierung bereits korrekt) und Abschnitt 4.3 (Fehlerbehandlung
lebt in `Toolbar.tsx`, nicht in `commands.ts`).

### 6.2 GEÄNDERT: `src/formats/shared/editor/Toolbar.tsx`

1. `run()` (Zeile 23-26) liefert neu den Rückgabewert des Commands zurück — rückwärts-
   kompatibel, da alle bisherigen 11 Aufrufstellen (`toggleMark`, `setAlign`,
   `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertTable`,
   `applyMarkColor`, `clearMarkColor`) den Rückgabewert schlicht nicht verwenden:

   ```ts
   function run(view: EditorView, command: (state: typeof view.state, dispatch: typeof view.dispatch) => boolean): boolean {
     const result = command(view.state, view.dispatch)
     view.focus()
     return result
   }
   ```

2. Neuer Import-Block (ergänzt Zeile 5-17):

   ```ts
   import {
     applyMarkColor,
     clearMarkColor,
     insertImage,
     insertRowAfter,
     insertRowBefore,
     insertTable,
     isAlignActive,
     isInTable,
     liftFromList,
     setAlign,
     setHeading,
     toggleList,
     type Align,
   } from './commands'
   ```

3. Neuer lokaler State für die in Abschnitt 4.3 festgelegte Fehlerrückmeldung
   (Grenzfall 9), analog zum bestehenden Muster `exportError` in
   `DocumentWorkspace.tsx:13-14/24-26`:

   ```tsx
   const [tableRowNotice, setTableRowNotice] = useState<string | null>(null)
   ```

   (erfordert `import { useState } from 'react'`, Toolbar ist aktuell eine reine
   Funktionskomponente ohne eigenen State — das ist die erste Stelle, die welchen
   braucht.)

4. Zwei neue Buttons, unmittelbar nach dem bestehenden Tabellen-Button (nach Zeile 239,
   vor dem schließenden `</button>`-Block für Bilder):

   ```tsx
   <button
     type="button"
     title="Zeile oberhalb einfügen"
     aria-label="Zeile oberhalb einfügen"
     disabled={!isInTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       try {
         if (!run(view, insertRowBefore)) {
           setTableRowNotice('Zeile konnte nicht eingefügt werden.')
         } else {
           setTableRowNotice(null)
         }
       } catch {
         setTableRowNotice('Zeile konnte nicht eingefügt werden.')
       }
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
   >
     Zeile ↑
   </button>
   <button
     type="button"
     title="Zeile unterhalb einfügen"
     aria-label="Zeile unterhalb einfügen"
     disabled={!isInTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       try {
         if (!run(view, insertRowAfter)) {
           setTableRowNotice('Zeile konnte nicht eingefügt werden.')
         } else {
           setTableRowNotice(null)
         }
       } catch {
         setTableRowNotice('Zeile konnte nicht eingefügt werden.')
       }
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
   >
     Zeile ↓
   </button>
   ```

   **Icon-Wahl-Begründung (Anforderung Abschnitt 2, Bezug `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 20.1):** `↑`/`↓` (U+2191/U+2193) statt eines neuen Emoji — diese beiden
   Zeichen gehören zum abgedeckten Basisbereich praktisch jeder Systemschriftart (deutlich
   verlässlicher als die bereits im Bestand befindlichen `⊞`/`⇧`/`≡`/`🖍`, die dieselbe
   Anforderung eigentlich schon einschränken sollte) und sind mit Textlabel kombiniert
   („Zeile ↑"/„Zeile ↓"), nicht alleinstehend — konsistent mit dem bestehenden Muster
   „⊞ Tabelle" (Zeile 238).

   **`disabled`-Attribut ist die erste Verwendung dieses Musters in `Toolbar.tsx`** —
   bisher hat kein Button einen deaktivierten Zustand (auch der Tabellen-Button nicht,
   der nutzt `aria-pressed` nur als Aktiv-Indikator, nie `disabled`). Die
   `disabled:opacity-40 disabled:cursor-not-allowed`-Utility-Klassen existieren im
   Projekt bereits (`DocumentWorkspace.tsx:62`: `disabled:opacity-50`), also kein neues
   CSS-Konzept, nur die erste Anwendung im Toolbar-Kontext.

5. Rendering des Fehlerbanners, direkt unterhalb der `role="toolbar"`-Zeile (nach Zeile
   246, vor dem schließenden `</div>` der Toolbar):

   ```tsx
   {tableRowNotice && (
     <div
       role="alert"
       className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 flex items-center justify-between"
     >
       <span>{tableRowNotice}</span>
       <button type="button" onClick={() => setTableRowNotice(null)} aria-label="Meldung schließen" className="ml-2">
         ×
       </button>
     </div>
   )}
   ```

   `role="alert"` (nicht `role="status"` wie im Paste-Ticket) — hier handelt es sich laut
   Anforderung 3.7 tatsächlich um einen Fehlerfall (Aktion ist fehlgeschlagen), nicht nur
   eine Information wie beim Paste-Bild-Platzhalter; konsistent mit
   `FormatPicker.tsx:44` (`role="alert"` für den Import-Fehler).

### 6.3 GEÄNDERT: `src/formats/shared/editor/WordEditor.tsx`

`keymap({...})`-Objekt (Zeile 71-79) ergänzen um zwei Einträge (Import-Zeile 1 um
`chainCommands` aus `prosemirror-commands` erweitern, Zeile 6 bereits vorhandenen Import
von `baseKeymap, toggleMark` erweitern; Import-Zeile ergänzt um
`goToTableCell, insertRowOnTabAtTableEnd` aus `../commands`):

```ts
import { baseKeymap, chainCommands, toggleMark } from 'prosemirror-commands'
// ...
import { goToTableCell, insertRowOnTabAtTableEnd } from './commands'
```

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  Tab: chainCommands(goToTableCell(1), insertRowOnTabAtTableEnd()),
  'Shift-Tab': goToTableCell(-1),
}),
```

Muss **vor** `keymap(baseKeymap)` (Zeile 80) registriert bleiben (unverändert
sichergestellt durch die bestehende Reihenfolge — `keymap`-Plugins mit demselben
Tastenkürzel werden in Registrierungsreihenfolge geprüft, das erste, das `true`
zurückliefert, gewinnt). Da `baseKeymap` selbst **kein** `Tab`/`Shift-Tab` bindet
(bestätigt gegen `node_modules/prosemirror-commands/dist/index.cjs:636-658`,
`pcBaseKeymap`/`macBaseKeymap`), gibt es hier keine Kollision. Außerhalb einer Tabelle
liefern sowohl `goToTableCell(1)` als auch `insertRowOnTabAtTableEnd()` `false`
(`isInTable(state)` schlägt fehl) — der native Browser-Tab (Fokus verlässt den Editor)
bleibt dort unverändert erhalten, exakt wie heute.

**Kein neues Plugin, keine Änderung an `plugins: [...]` (Zeile 69-86) nötig** —
`columnResizing()`/`tableEditing()` sind bereits vorhanden (Zeile 81-82), das ist alles,
was `addRowBefore`/`addRowAfter`/`goToNextCell` zur Laufzeit voraussetzen.

### 6.4 GEÄNDERT: `src/formats/odt/writer.ts` (Bugfix aus Abschnitt 1)

Ersetzt `case 'table':` (aktuell Zeile 86-111) vollständig:

```ts
case 'table': {
  const rows = node.content ?? []
  // Colspan-bewusste Spaltenzahl — behebt Befund 0.6 (bislang: rows[0]?.content?.length,
  // ignorierte colspan komplett; docx/writer.ts:130 macht es bereits richtig).
  const colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
  const columns = Array.from({ length: colCount }, () => '<table:table-column/>').join('')

  // Spalten-Pending-Tracker für vertikale Merges — analog zu docx/writer.ts:133/161-163.
  // Behebt den in zeile-einfuegen-code.md Abschnitt 1 dokumentierten Bug: ohne dieses
  // Array fehlt jeder von einem rowspan überdeckten Rasterzelle das laut ODF-Standard
  // erforderliche <table:covered-table-cell/>-Füllelement.
  const pending: number[] = Array.from({ length: colCount }, () => 0)

  const rowsXml = rows
    .map((row) => {
      const cellsXml: string[] = []
      let col = 0
      let cellIndex = 0
      const rowCells = row.content ?? []
      while (col < colCount) {
        if (pending[col] > 0) {
          pending[col] -= 1
          cellsXml.push('<table:covered-table-cell/>')
          col += 1
          continue
        }
        const cell = rowCells[cellIndex]
        cellIndex += 1
        if (!cell) {
          col += 1
          continue
        }
        const colspan = Number(cell.attrs?.colspan ?? 1)
        const rowspan = Number(cell.attrs?.rowspan ?? 1)
        const spanAttrs = [
          colspan > 1 ? `table:number-columns-spanned="${colspan}"` : '',
          rowspan > 1 ? `table:number-rows-spanned="${rowspan}"` : '',
        ]
          .filter(Boolean)
          .join(' ')
        const inner = (cell.content ?? []).map((child) => blockToOdt(child, styles, images)).join('')
        cellsXml.push(`<table:table-cell ${spanAttrs}>${inner || '<text:p/>'}</table:table-cell>`)
        if (rowspan > 1) {
          for (let c = col; c < col + colspan; c++) pending[c] = rowspan - 1
        }
        col += colspan
      }
      return `<table:table-row>${cellsXml.join('')}</table:table-row>`
    })
    .join('')
  const tableName = `Table${Math.round(Math.random() * 1_000_000)}`
  return `<table:table table:name="${tableName}">${columns}${rowsXml}</table:table>`
}
```

Kein Import-Änderungsbedarf (keine neuen Abhängigkeiten). Kein Änderungsbedarf an
`src/formats/odt/reader.ts` — der bestehende Filter auf `'table-cell'`
(`reader.ts:192`) überspringt `<table:covered-table-cell>`-Elemente bereits korrekt
(siehe Abschnitt 1, Begründung „Warum das bisher nicht auffiel").

### 6.5 `src/formats/docx/writer.ts` — keine Änderung nötig

`tableToDocx` (Zeile 128-171) behandelt `pending[]`/vMerge/colspan bereits korrekt
(Abschnitt 1). Ein neu über `addRowBefore`/`addRowAfter` erzeugter oder ein per Grenzfall
2 verlängerter rowspan-Bereich durchläuft exakt denselben, bereits funktionierenden Pfad
wie eine beim Import bereits vorhandene Struktur — aus Sicht des Writers ist eine
programmatisch eingefügte Zeile nicht von einer importierten unterscheidbar (siehe
Abschnitt 5). Muss dennoch mit dem Regressionstest aus Abschnitt 8.3 (Grenzfall 5,
DOCX-Seite) bestätigt werden, nicht nur angenommen werden.

### 6.6 `src/formats/shared/schema.ts` — keine Änderung nötig

Siehe Abschnitt 5.

---

## 7. Zusammenfassung Import/Export-Anpassungen OOXML/ODF

| Format | Reader | Writer |
|---|---|---|
| DOCX | Keine Änderung. `docx/reader.ts:210-256` (`parseTable`) verarbeitet `vMerge`/`gridSpan` bereits korrekt für beliebige Zeilenzahl, unabhängig davon, ob die Zeile importiert oder zuvor per Editor eingefügt wurde. | Keine Änderung. `docx/writer.ts:128-171` (`tableToDocx`) ist bereits korrekt (Abschnitt 6.5). |
| ODT | Keine Änderung. `odt/reader.ts:189-203` liest `number-rows-spanned`/`number-columns-spanned` direkt von der Ursprungszelle, überspringt `covered-table-cell` korrekt (das war nie das Problem). | **Pflichtänderung** (Abschnitt 1 + 6.4): `odt/writer.ts:86-111` erhält `pending[]`-Tracking für `<table:covered-table-cell/>` **und** eine colspan-bewusste `colCount`-Berechnung. Ohne diese Änderung ist Grenzfall 2/Anforderung 3.3/Feature-Rundreise 5.2 Punkt 5 für ODT nicht wirklich abnahmefähig (siehe Abschnitt 1). |

---

## 8. Tests

### 8.1 Neue Unit-Test-Datei: `src/formats/shared/editor/__tests__/tableRowCommands.test.ts`

Direkter Test der Commands aus Abschnitt 6.1 gegen einen mit `EditorState.create`
konstruierten Testzustand (Anforderung Abschnitt 6, Testplanhinweis 2) — unabhängig vom
Browser, Muster analog zu `src/formats/shared/editor/__tests__/pagination.test.ts`.
Aufbau: `wordSchema` direkt importieren, Testtabellen über `wordSchema.nodeFromJSON(...)`
bzw. `wordSchema.nodes.table.create(...)` konstruieren, `EditorState.create({ doc,
schema: wordSchema, plugins: [tableEditing()] })`, Command mit
`command(state, (tr) => { state = state.apply(tr) })` ausführen.

| Funktion | Testfälle |
|---|---|
| `insertRowBefore` | Grundfall (3.1): neue leere Zeile unmittelbar vor Zeile *Z*, `map.width` viele Zellen; Grenzfall 1 (Tabelle mit nur 1 Zeile); Grenzfall 2 (Cursor in einer Zeile, die von einem rowspan aus der Zeile darüber überdeckt wird → rowspan wird um 1 verlängert, keine neue Zelle an dieser Stelle, siehe Abschnitt 2 Punkt 1); Grenzfall 3 (Nachbarzeile hat `colspan` → neue Zeile hat trotzdem `map.width` Einzelzellen); Grenzfall 5 (Einfügen oberhalb der bisherigen ersten Zeile, alte Zeile 1 hatte `colspan` → resultierende `table.content[0].content.length` bzw. Summe der colspans der neuen Zeile 0 entspricht exakt `map.width`); Selektion bleibt in derselben logischen Zelle (Anforderung 3.4, Positionsvergleich vor/nach über den Zellinhalt, nicht die rohe Zahl); ein Undo-Schritt stellt exakten Vorzustand wieder her (Anforderung 3.6, inkl. Selektion) |
| `insertRowAfter` | Spiegelbildlich zu `insertRowBefore` (Anforderung 3.2), inkl. Grenzfall 11 (Tabelle am Dokumentende: nach Einfügen bleibt der Editor normal weiter bedienbar — Cursor kann aus der Tabelle heraus positioniert werden) |
| Grenzfall 6 (CellSelection über mehrere Zellen **derselben** Zeile) | Es entsteht genau **eine** neue Zeile, nicht eine pro markierter Zelle |
| Grenzfall 7 (CellSelection markiert **eine ganze** Zeile) | Verhalten identisch zum Grundfall |
| Grenzfall 8 (CellSelection über **mehrere Zeilen**) | Bestätigt die in Abschnitt 4.1 getroffene Entscheidung: **genau eine** neue Zeile relativ zur obersten/untersten Zeile der Selektion, expliziter Test mit einer 3×3-Selektion über eine 5-Zeilen-Tabelle |
| Grenzfall 10 (verschachtelte Tabelle in einer Zelle) | Zeile in der **äußeren** Tabelle einfügen lässt die innere Tabelle in der betroffenen Zelle strukturell unverändert; Zeile **innerhalb** der inneren Tabelle einfügen wirkt sich nicht auf die äußere aus |
| `goToTableCell`/`insertRowOnTabAtTableEnd` (Tab-Kette) | Tab in einer beliebigen Nicht-Endzelle → Selektion bewegt sich zur nächsten Zelle, **keine** neue Zeile; Tab in der letzten Zelle der letzten Zeile → neue Zeile wird angehängt, Cursor landet in deren erster Zelle (Grenzfall 4), alles in **einem** Undo-Schritt; Shift-Tab in der ersten Zelle → `false` (kein Crash, keine Zeile) |
| Grenzfall 9 (strukturell inkonsistente Tabelle) | Eine absichtlich unregelmäßige Tabelle wird direkt per `wordSchema.nodeFromJSON` (unter Umgehung von `fixTables`, um den worst case zu testen) konstruiert; nach dem ersten `state.apply(tr)` mit `tableEditing()`-Plugin aktiv wird geprüft, dass `fixTables` (Abschnitt 2, Punkt 7) sie normalisiert **bevor** `insertRowBefore`/`insertRowAfter` aufgerufen wird — kein Crash, Struktur bleibt valide |
| Grenzfall 12 (schnelles wiederholtes Auslösen) | Zwei aufeinanderfolgende `insertRowAfter`-Aufrufe erzeugen zwei separate Zeilen (keine verlorene/doppelte Zeile durch geteilten `state`) |
| Grenzfall 15 (Einfügen → Undo → Redo → erneut Einfügen) | Exakter Zwischenzustand nach jedem Schritt |

### 8.2 Ergänzung `tests/e2e/selection-regression.spec.ts` (Pflicht laut Anforderung Abschnitt 2/6.3)

Neuer `test()` **im bestehenden** `describe`-Block (nicht in einer neuen Datei, damit er
Teil der dauerhaften Regressions-Suite bleibt — Anforderung verlangt explizit
Wiederverwendung dieser Datei):

```ts
test('insert-row toolbar action followed by typing lands in the right cell', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click() // untere linke Zelle der 2×2-Tabelle
  await page.getByTitle('Zeile oberhalb einfügen').click()
  await page.keyboard.type('Nach Einfügen')

  await expect(editor).toContainText('Nach Einfügen')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
})
```

### 8.3 Neue E2E-Datei: `tests/e2e/zeile-einfuegen.spec.ts`

Aufbau wie `tests/e2e/docx.spec.ts`/`odt.spec.ts` (Privacy-Banner wegklicken, Karte per
Formatname auswählen, Muster `docxCard`/`odtCard` aus den bestehenden Dateien
übernehmen). Zentrale Technik laut Anforderung Abschnitt 6.1: Tabelle über den
bestehenden `⊞ Tabelle`-Button einfügen, Zelle per `page.locator('.ProseMirror
td').nth(n).click()` selektieren, neuen Button klicken, `page.locator('.ProseMirror
tr')`/`td` auszählen statt nur visuell zu prüfen.

Testfälle (Nummerierung folgt `zeile-einfuegen-req.md`):

1. **Abschnitt 1, # 1/# 2:** Beide Buttons sind über echte Browser-Interaktion auslösbar
   (Freigabekriterium Abschnitt 7, erster Punkt) — Klick auf „Zeile oberhalb einfügen"
   bzw. „Zeile unterhalb einfügen" erzeugt sichtbar eine weitere `<tr>`.
2. **Abschnitt 1, # 5:** Außerhalb einer Tabelle (Cursor in einem normalen Absatz) sind
   beide Buttons `disabled` (`await expect(button).toBeDisabled()`).
3. **3.1/3.2 Grundfall:** Zeile oberhalb der ersten Zeile bzw. unterhalb der letzten Zeile
   einer 3×2-Tabelle einfügen → `tr`-Anzahl und Zellinhalt-Reihenfolge stimmen.
4. **3.4 Cursor-Verhalten:** Nach „Zeile oberhalb einfügen" direkt weitertippen landet im
   erwarteten (unveränderten logischen) Zellinhalt, nicht in der neuen leeren Zeile.
5. **3.6 Undo/Redo:** Strg+Z nach Einfügen → `tr`-Anzahl wieder wie vorher; Strg+Y →
   wieder wie nach dem Einfügen.
6. **Grenzfall 4 (Tab in letzter Zelle):** Alle Zellen einer 2×2-Tabelle nacheinander per
   Tab durchlaufen, im letzten Tab-Druck (in Zelle 4) prüfen, dass eine 3. Zeile entsteht
   und der Cursor darin tippen lässt.
7. **Grenzfall 11 (Tabelle am Dokumentanfang/-ende):** Dokument beginnt direkt mit der
   Tabelle (kein Absatz davor) → Zeile oberhalb der ersten Zeile einfügen → Editor bleibt
   bedienbar, Cursor kann per Klick vor die Tabelle gesetzt werden.
8. **Grenzfall 12/13 (schnelle Wiederholung + Formatierung danach):** Button zweimal
   schnell hintereinander klicken → genau 2 neue Zeilen; direkt danach „Fett" auf die neue
   Zeile anwenden → funktioniert wie auf jeder anderen Selektion (Bezug Hauptspezifikation
   Abschnitt 2).
9. **Rundreise DOCX** (Anforderung 5.2, Punkt 1-3, 7): Zeile einfügen → Export →
   `JSZip`/`document.xml` prüfen (Muster `docx.spec.ts:76-82`) → reimportieren → Struktur
   erhalten.
10. **Rundreise ODT** (Anforderung 5.2, analog): Export → `content.xml` prüfen — **explizit
    auch für den Grenzfall-2-Fall (rowspan-Verlängerung)**: nach dem Export wird die rohe
    ODF-XML auf die korrekte Anzahl `<table:table-cell` + `<table:covered-table-cell`
    pro Zeile geprüft (nicht nur nach dem Reimport auf JSON-Ebene) — das ist der Test, der
    den Abschnitt-1-Bug **vor** der Behebung rot und danach grün werden lässt.

### 8.4 Ergänzung bestehender Unit-Roundtrip-Tests

- `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: tables')`,
  Zeile 173-249): neuer Testfall **Grenzfall 5** — Tabelle mit `colspan: 2` in Zeile 0,
  Reader→Editor-Transaktion simuliert „Zeile oberhalb der bisherigen Zeile 0 einfügen"
  (per `addRowBefore` auf einem `EditorState`, dann `state.doc.toJSON()` als neuer
  `original` in `roundTrip(...)` verwendet) → Export → `colCount`/Zellenzahl über die
  gesamte Tabelle konsistent (Pflicht-Regressionstest laut Anforderung Abschnitt 6,
  Testplanhinweis 6, darf nicht im allgemeinen Rundreise-Testfall „untergehen" — deshalb
  ein eigener, benannter `it(...)`-Block, nicht Teil eines bestehenden Tests).
- `src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round trip: tables')`,
  Zeile 162-210):
  - Ergänzung eines **echten** zweizeiligen `rowspan`-Testfalls (fehlte bisher, siehe
    Abschnitt 0, Punkt 5/Abschnitt 1) — Fixture identisch zum DOCX-Pendant
    (`docx/__tests__/roundtrip.test.ts:223-248`), nur mit `writeOdt`/`readOdt`.
  - Zusätzlicher Test, der **nicht** über `readOdt` reimportiert, sondern die von
    `writeOdt` erzeugte Zip-Datei direkt mit `JSZip.loadAsync` öffnet und `content.xml`
    als Text prüft: für eine Zeile, die eine von `rowspan` überdeckte Spalte enthält,
    muss die Anzahl `<table:table-cell` + `<table:covered-table-cell` in dieser Zeile
    exakt `colCount` ergeben — das ist der einzige Testtyp, der den in Abschnitt 1
    beschriebenen Bug tatsächlich aufdeckt (ein reiner Reader-Rückweg-Test würde ihn
    verdecken, siehe Begründung dort).
  - Analoger Grenzfall-5-Test wie beim DOCX-Pendant oben.
- **Cross-Format-Tests** (Anforderung 5.2, siehe Abschnitt 4.4 für die Begründung, warum
  nur auf dieser Ebene testbar): neue Testfälle in einer der beiden
  `roundtrip.test.ts`-Dateien (oder einer neuen gemeinsamen Datei
  `src/formats/shared/__tests__/cross-format-tablerow.test.ts`), die `readDocx(...)` →
  Zeile per `addRowBefore`/`addRowAfter` auf dem resultierenden `body`-JSON einfügen (über
  `wordSchema.nodeFromJSON` → Transaktion → `toJSON()`) → `writeOdt(...)` → `readOdt(...)`
  aufrufen, und umgekehrt.

---

## 9. Grenzfälle-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | Tabelle mit nur einer Zeile | Kein Zusatzcode — `addRow` funktioniert unabhängig von der Ausgangszeilenzahl, Test 8.1 |
| 2 | Einfügen innerhalb eines rowspan-Bereichs | Bereits in `addRow` eingebaut (Abschnitt 2, Punkt 1), Test 8.1 + 8.3 #10 (echte ODT-XML-Prüfung nach Abschnitt-1-Fix) |
| 3 | Nachbarzeile hat colspan | Automatisch korrekt (Abschnitt 2, Punkt 2), Test 8.1 |
| 4 | Tab in letzter Zelle | `insertRowOnTabAtTableEnd` (Abschnitt 6.1/6.3), Test 8.1 + 8.3 #6 |
| 5 | Spaltenzahl-Kollaps beim Export | Automatisch unkritisch für den konkreten Insert-Fall (Abschnitt 2, Punkt 3), zugrunde liegender ODT-Bug dennoch behoben (Abschnitt 1/6.4), dedizierter Test 8.4 |
| 6 | CellSelection über mehrere Zellen derselben Zeile | Automatisch: genau eine neue Zeile (`selectedRect` liefert `top===bottom-1`), Test 8.1 |
| 7 | CellSelection markiert eine ganze Zeile | Wie Grundfall, Test 8.1 |
| 8 | CellSelection über mehrere Zeilen | Verbindlich auf Variante (a) festgelegt (Abschnitt 4.1), Test 8.1 |
| 9 | Strukturell inkonsistente Fremdtabelle | `fixTables`/`tableEditing()` bereits aktiv (Abschnitt 2, Punkt 7) + defensiver try/catch in `Toolbar.tsx` (Abschnitt 4.3/6.2) für den unwahrscheinlichen Restfall, Test 8.1 |
| 10 | Verschachtelte Tabelle | Schema erlaubt es strukturell bereits (Abschnitt 5), Test 8.1 |
| 11 | Tabelle am Dokumentanfang/-ende | Kein Zusatzcode, Test 8.3 #7 |
| 12 | Schnelles wiederholtes Auslösen | Jede Transaktion unabhängig, kein gemeinsamer Zwischenzustand in den neuen Commands, Test 8.1 + 8.3 #8 |
| 13 | Einfügen + Formatierung danach | Regressionstest aus Hauptspezifikation Abschnitt 2, Test 8.2 + 8.3 #8 |
| 14 | Sehr große Tabelle, Zeile in der Mitte | Kein Sondercode nötig (ProseMirror-Transaktionen sind grössenunabhängig linear), manuelle Beobachtung „bleibt reaktionsfähig" empfohlen, kein separater automatisierter Performance-Test in diesem Ticket |
| 15 | Einfügen → Undo → Redo → erneut einfügen | Test 8.1 |

---

## 10. Reihenfolge der Umsetzung

1. **Bugfix zuerst, unabhängig vom Rest** (Abschnitt 1/6.4): `odt/writer.ts`s
   `case 'table':` ersetzen, dazugehörige Unit-Tests (Abschnitt 8.4, rowspan + raw-XML-
   Check) ergänzen. `npm run build` danach ausführen (TypeScript-`tsc -b`-Schritt prüft
   nicht durch `npm test`/`npm run test:e2e` abgedeckte Fehler wie unbenutzte Variablen).
2. `commands.ts` um `insertRowBefore`/`insertRowAfter`/`goToTableCell`/
   `insertRowOnTabAtTableEnd` ergänzen (Abschnitt 6.1) + Unit-Tests (Abschnitt 8.1).
3. `Toolbar.tsx` um die zwei Buttons, den Fehlerbanner und die `run()`-Rückgabewert-
   Änderung ergänzen (Abschnitt 6.2).
4. `WordEditor.tsx` um die Tab/Shift-Tab-Keymap-Einträge ergänzen (Abschnitt 6.3).
5. E2E-Tests: neue Datei `zeile-einfuegen.spec.ts` (Abschnitt 8.3) + Ergänzung
   `selection-regression.spec.ts` (Abschnitt 8.2).
6. Rundreise- und Cross-Format-Unit-Tests (Abschnitt 8.4).
7. Grenzfälle-Restliste (Abschnitt 9) einzeln abhaken, insbesondere Grenzfall 9
   (strukturell inkonsistente Tabelle) mit einer echten oder aus
   `tests/fixtures/external/{docx,odt}/` entnommenen unregelmäßigen Tabelle
   gegenprüfen (Korpus laut `tests/fixtures/external/README.md` — Apache-POI-/
   odftoolkit-Testdateien, die gezielt Edge-Case-Strukturen enthalten).
8. Baseline-Rundreise (Anforderung 5.1) erneut laufen lassen — insbesondere
   `docx.spec.ts`/`odt.spec.ts`/beide `roundtrip.test.ts` müssen nach Schritt 1 (ODT-
   Writer-Änderung betrifft **jede** Tabelle mit rowspan, nicht nur neu eingefügte
   Zeilen) weiterhin grün sein.

---

## 11. Abnahme-Checkliste und offene Punkte (Bezug: `zeile-einfuegen-req.md` Abschnitt 7)

- [ ] Beide Toolbar-Buttons (Abschnitt 1, # 1/# 2 der Anforderung) über echte
      Browser-Interaktion auslösbar (Test 8.3 #1).
- [ ] Alle Testfälle aus Abschnitt 8.1-8.4 automatisiert vorhanden und grün.
- [ ] Jeder Grenzfall aus Abschnitt 9 einzeln befundet.
- [ ] Baseline-Rundreise (Anforderung 5.1) läuft vor **und** nach den Code-Änderungen
      weiterhin grün — **besonders zu beachten:** der ODT-Writer-Bugfix (Abschnitt 1)
      ändert das Exportformat für **jede** Tabelle mit `rowspan`, nicht nur für neu
      eingefügte Zeilen; bestehende ODT-Tests mit rowspan (falls in
      `external-fixtures.test.ts` vorhanden) müssen erneut geprüft werden.
- [ ] Feature-Rundreise (Anforderung 5.2) für DOCX und ODT über echte Bedienung grün;
      Cross-Format-Richtungen **nur auf Unit-Test-Ebene** möglich (Abschnitt 4.4) — dieser
      Punkt ist eine dokumentierte, strukturelle Einschränkung der App, kein
      unvollständiger Teil dieses Tickets, muss aber im Freigabe-Status ausdrücklich so
      vermerkt werden, nicht stillschweigend als „E2E getestet" behauptet werden.
- [ ] Selection-Sync-Regressionstest mit Zeilen-Einfügen-Sequenz (Abschnitt 8.2) grün und
      dauerhaft Teil von `selection-regression.spec.ts`.
- [ ] Grenzfall 8 (mehrzeilige Selektion) — Verhalten ist in Abschnitt 4.1 verbindlich
      festgelegt (Variante a, Bibliotheksverhalten übernommen) und getestet (Abschnitt
      8.1), nicht offengelassen.
- [ ] Grenzfall 5 (Export-Spaltenzahl) — dedizierter Regressionstest (Abschnitt 8.4) für
      **beide** Formate grün; zugrunde liegender ODT-Bug (Abschnitt 1) behoben, nicht nur
      der eine ausgelöste Spezialfall.
- [ ] `npm run build` läuft nach allen Änderungen fehlerfrei durch (insbesondere nach dem
      `odt/writer.ts`-Bugfix, Abschnitt 10, Schritt 1).

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status von `zeile-einfuegen` von
„fehlt" auf **vorhanden** wechseln — mit der in Abschnitt 4.4 dokumentierten Einschränkung
zur Cross-Format-Testbarkeit, die auch im Freigabe-Vermerk selbst genannt werden sollte,
analog zur in der Anforderungsdatei referenzierten Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 sowie `specs/einfuegen-req.md` Abschnitt 7.
