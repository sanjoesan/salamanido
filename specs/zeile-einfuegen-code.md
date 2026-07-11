# Umsetzungsplan „Zeile einfügen (oberhalb/unterhalb)" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\zeile-einfuegen-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, insbesondere Abschnitt 6 „Tabellen", Abschnitt 2 Selection-Sync-
Regressionstest, Abschnitt 19 Export-Robustheit, Abschnitt 20.1/20.4). Code-Stand geprüft
am **2026-07-04** in `E:\docs` (Stand entspricht dem Dateisystem zum Prüfzeitpunkt) —
inklusive `node_modules/prosemirror-tables` (installierte Version **1.8.5**,
`node_modules/prosemirror-tables/package.json`), nicht nur der Typdeklarationen, damit
Aussagen zum Bibliotheksverhalten belegt und nicht vermutet sind.

> **Entwickler-Zweitprüfung (2026-07-05):** Diese Fassung wurde erneut gegen den
> tatsächlichen, inzwischen Git-versionierten Arbeitsstand geprüft (`E:\docs` ist entgegen
> der ursprünglichen Notiz oben ein Git-Repo, `main`-Branch, letzter Commit
> `29cbc80` — die frühere Aussage „kein Git-Repo" war zum damaligen Prüfzeitpunkt korrekt,
> ist aber überholt und wurde hiermit berichtigt). Jede Zeilen-/Abschnittsangabe zu
> `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`, `schema.ts`, `docx/writer.ts` und
> `odt/writer.ts` wurde erneut Zeile für Zeile gegen den Ist-Code nachgezählt (nicht nur aus
> der Vorfassung übernommen) — **keine Abweichung gefunden**, alle Fundstellen weiterhin
> exakt zutreffend, kein Zeilen-Drift seit dem 2026-07-04-Stand. Zusätzlich wurde — über
> reines Quelltext-Lesen hinaus — die bislang als „noch zu verifizieren" markierte
> Kernarithmetik **tatsächlich ausgeführt**, siehe Abschnitt 2.1.

> **Wichtiger Hinweis zu dieser Fassung (Änderungshistorie in Abschnitt 12):** Eine frühere
> Fassung dieses Dokuments (Stand ~13:45) beschrieb als „wichtigsten Fund" einen Bug im
> **ODT-Writer** (fehlende `<table:covered-table-cell/>`-Ausgabe, colspan-blinde
> Spaltenzahl) und verlangte in Abschnitt 6.4 eine „Pflichtänderung" an
> `src/formats/odt/writer.ts`. **Diese Diagnose trifft auf den aktuellen Code nicht mehr
> zu** — der ODT-Writer wurde zwischenzeitlich unter dem Ticket `speichern-exportieren`
> vollständig korrigiert (siehe Abschnitt 1). Die damals vorgeschlagene Ersetzung würde
> heute (a) nicht kompilieren (falsche `blockToOdt`-Signatur) und (b) die Byte-Determinismus-
> Korrektur (`TableNameSequence` statt `Math.random()`) **wieder brechen**. Diese Fassung
> ersetzt die frühere; sie deckt sich mit `zeile-einfuegen-req.md` Befund 0.6 (korrigierter
> Befund) und wurde erneut Zeile für Zeile gegen den Ist-Code verifiziert. Das entspricht
> dem in der Anforderungsdatei selbst dokumentierten Vorgehen, einen überholten Befund zu
> korrigieren statt ihn ungeprüft weiterzutragen.

Rolle dieses Dokuments: beantwortet, was am **bestehenden Code** fehlt bzw. falsch/
unvollständig ist, legt fest, welche Dateien geändert werden, spezifiziert die
ProseMirror-Schema-/Commands-Änderungen, die Toolbar-Änderungen und die Import-/Export-
Situation für OOXML (DOCX) und ODF (ODT). **Kernaussage nach der Verifikation:** Dieses
Feature ist reine **Verdrahtung** von drei bestehenden Dateien (`commands.ts`,
`Toolbar.tsx`, `WordEditor.tsx`) um bereits fertige, getestete `prosemirror-tables`-
Commands — **keine** Schema-Änderung, **keine** Reader-/Writer-Änderung, **kein** neues
Produktivmodul. Alle Grenzfälle 1–10 werden von der Bibliothek bereits korrekt behandelt;
zu tun ist Bedienelement + Command-Aufruf + Tab-Bindung + Fehlerrückmeldung + Tests.

---

## 0. Verifizierter Codebefund (Ist-Zustand, geprüft gegen die tatsächlichen Dateien)

Alle acht Befundpunkte aus `zeile-einfuegen-req.md` Abschnitt 0 wurden gegen den echten
Dateiinhalt geprüft. Ergebnis inkl. Korrekturen (die Zeilennummern der früheren Fassung
waren durchgehend veraltet — die Quelldateien sind seither gewachsen; unten stehen die
**tatsächlichen** aktuellen Zeilen):

1. **Kein Bedienelement — bestätigt.** `src/formats/shared/editor/Toolbar.tsx` (298 Zeilen)
   enthält genau einen Tabellen-Button (`title/aria-label="Tabelle einfügen"`, Zeile
   277–289, ruft `insertTable(2, 2)` auf, Zeile 284). Kein Zeilen-/Spalten-Button, kein
   `contextmenu`-Listener, kein Zeilen-Shortcut. `isInTable(view.state)` wird bereits als
   `aria-pressed` am Tabellen-Button verwendet (Zeile 281) — die für die neuen Buttons
   nötige `isInTable`-Auswertung ist also schon importiert und im Einsatz.
2. **Kein Command — bestätigt, mit Korrektur der Aufzählung.**
   `src/formats/shared/editor/commands.ts` (168 Zeilen, **nicht** 108) re-exportiert
   `isInTable` (Zeile 3/6) und definiert `setAlign`, `isAlignActive`, `setHeading`,
   `toggleList`, `liftFromList`, `insertImage`, **`insertHardBreak`** (Zeile 83–90, in der
   früheren Fassung übersehen), `insertTable` (Zeile 92–102, erzeugt **immer** eine neue
   Tabelle über `replaceSelectionWith`), `applyMarkColor`, `clearMarkColor`, **`canCut`**
   (Zeile 126–128) und **`cutSelection`** (Zeile 149–166, samt `CutHandlers`-Interface,
   Zeile 130–134). **Keine** Zeilen-/Spalten-Funktion. Bestätigt.
3. **Bibliothek installiert, aber ungenutzt — bestätigt.** `prosemirror-tables@1.8.5`
   exportiert (verifiziert gegen `node_modules/prosemirror-tables/dist/index.d.ts`):
   `addRow`, `addRowBefore`, `addRowAfter`, `deleteRow`, `addColumnBefore`,
   `addColumnAfter`, `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`,
   `goToNextCell`, `selectedRect`, `findTable`, `TableMap`, `CellSelection`,
   `tableEditing`, `columnResizing`, `isInTable`, `tableNodes`. `WordEditor.tsx:109–110`
   bindet `columnResizing()` und `tableEditing()` bereits ein. Kein Zeilen-/Spalten-Command
   wird irgendwo importiert (nur `isInTable` in `commands.ts`, nur `tableEditing`/
   `columnResizing`/`tableNodes` in `WordEditor.tsx`/`schema.ts`). Bestätigt.
4. **Schema unterstützt beliebige Zeilenanzahl — bestätigt.** `src/formats/shared/schema.ts`
   **Zeile 154** (nicht 106): `...tableNodes({ tableGroup: 'block', cellContent: 'block+',
   cellAttributes: {} })`. `colspan`/`rowspan`/`colwidth` sind Standardattribute. Siehe
   Abschnitt 5 — keine Änderung nötig.
5. **Reader/Writer für mehrzeilige Tabellen abgesichert — bestätigt, mit korrigiertem
   Zusatzbefund.** `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round
   trip: tables')`, ab Zeile 229) enthält u. a. `it('preserves rows, columns, and cell
   text')` (230), `it('preserves merged cells (colspan)')` (261) und
   `it('preserves vertically merged cells (rowspan)')` (279–300, echtes `rowspan: 2` über
   zwei Zeilen). `src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round trip:
   tables')`, ab Zeile 219) enthält **inzwischen ebenfalls** einen echten
   Roh-XML-Rowspan-Test — siehe Korrektur unten. Alle Fixtures sind direkt konstruiert (nie
   über echte Bedienung erzeugt) — genau das ist die von Befund 0.5 beschriebene, noch
   offene Lücke.
   * **Korrektur gegenüber der früheren Fassung:** Die Behauptung, der ODT-Rowspan-Test
     „teste in Wahrheit nur colspan" und „kaschiere einen echten Bug", ist **falsch**.
     `odt/__tests__/roundtrip.test.ts` enthält **zwei dedizierte Roh-content.xml-Tests**:
     `it('emits ODF-compliant covered-table-cell placeholders for a horizontal (colspan)
     merge')` (Zeile 275, öffnet die Zip per `JSZip.loadAsync`, prüft `content.xml`-Text,
     Zeile 295–307) **und** `it('emits ODF-compliant covered-table-cell placeholders for a
     vertical (rowspan) merge')` (Zeile 310, prüft, dass Zeile 2 mit
     `<table:covered-table-cell/><table:table-cell` beginnt, Zeile 337). Ein echter
     zweizeiliger Rowspan-Fall **mit Roh-XML-Assertion** existiert also bereits.
6. **Export-Logik colspan/Merge — bestätigt korrekt in BEIDEN Formaten (Korrektur des
   früheren „ODT-Bug"-Befunds).**
   * `src/formats/docx/writer.ts` `tableToDocx` (ab Zeile 158): `colCount` als Summe der
     colspans der ersten Zeile (Zeile 160), `pending[]`-Tracker (Zeile 163),
     `<w:vMerge/>`-Continuation für überdeckte Rasterzellen (Zeile 174). Korrekt.
   * `src/formats/odt/writer.ts` `case 'table'` (Zeile 110–174): `colCount` **ebenfalls**
     als Summe der colspans (Zeile 115–116, **identisch** zu DOCX — **nicht**
     `rows[0]?.content?.length`, wie die frühere Fassung behauptete), `pending[]`-Tracker
     (Zeile 126), `<table:covered-table-cell/>` für horizontal (Zeile 160–162) und
     vertikal (Zeile 135–139 über `pending`, gesetzt in Zeile 165–167) überdeckte Zellen.
     Der ODF-Standard-konforme Export ist damit vorhanden **und** getestet (Punkt 5). Der
     ODT-Writer vergibt Tabellennamen zudem deterministisch über `TableNameSequence`
     (Zeile 54–60, `tableNames.next()` in Zeile 173) statt `Math.random()` — die frühere
     Fassung hätte das mit ihrer 6.4-Ersetzung wieder zerstört.
   * **Konsequenz:** Der einst als Hauptrisiko notierte „Spaltenzahl-Kollaps beim Export"
     ist **kein offener Bug**, sondern ein **Regressionsrisiko** (Grenzfall 5): Die neue
     Funktion darf diese bereits korrekte Export-Logik nicht brechen. Nachweis über
     Roh-XML gegen die vorhandenen Tests (Punkt 5) plus einen neuen, dedizierten
     Grenzfall-5-Test (Abschnitt 8.4).
7. **Keine Tests für Zeilenoperationen — bestätigt.** Kein Treffer für
   `addRow`/`insertRow`/„Zeile einfügen" in `tests/` oder `src/**/__tests__` (außer den
   generischen Tabellen-Roundtrips oben). `tests/e2e/selection-regression.spec.ts` prüft
   nur Zellwechsel, keine Zeilenoperation. `tests/e2e/` enthält u. a. `docx.spec.ts`,
   `odt.spec.ts`, `roundtrip-fidelity.spec.ts`, `complex-import-fidelity.spec.ts`,
   `selection-regression.spec.ts` — noch **keine** `zeile-einfuegen.spec.ts`.
8. **Kein Cross-Format-Export in der App — bestätigt.** Jedes `FormatModule.exportFile`
   schreibt nur sein eigenes Format (`docxModule` → `writeDocx`, `odtModule` → `writeOdt`).
   Cross-Format-Rundreise nur auf Adapter-/Unit-Ebene prüfbar (Abschnitt 4.4).

**Fazit:** Der Backlog-Status „fehlt" ist auf UI-/Command-Ebene korrekt. Der
Implementierungsaufwand ist **reine Verdrahtung** — es gibt keinen begleitenden Bug mehr
zu beheben (der früher vermutete ODT-Writer-Bug existiert im aktuellen Code nicht).

---

## 1. Import/Export ist bereits korrekt — Regressionsschutz statt Bugfix

**Es ist keine Änderung an Reader oder Writer nötig.** Dieser Abschnitt hält fest, was
bereits stimmt, damit die neue Funktion es nachweislich nicht bricht (Grenzfall 2/5,
Anforderung 3.3, Feature-Rundreise 5.2 Punkt 5).

**DOCX-Writer** (`src/formats/docx/writer.ts`, `tableToDocx`, Zeile 158–~200): berechnet
`colCount` als Summe der colspans der ersten Zeile (Zeile 160); führt `pending[c]` für
jede Spalte, die von einem `rowspan` überdeckt wird, und schreibt an diesen Positionen der
Folgezeilen eine `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`-Continuation-Zelle
(Zeile 172–176). Damit deklariert jede Zeile exakt `colCount` `<w:tc>`.

**ODT-Writer** (`src/formats/odt/writer.ts`, `case 'table'`, Zeile 110–174): berechnet
`colCount` **identisch** als Summe der colspans (Zeile 115–116); führt denselben
`pending[]`-Mechanismus (Zeile 126) und schreibt für jede von einem `rowspan` (vertikal,
Zeile 135–139) oder `colspan` (horizontal, Zeile 160–162) überdeckte Rasterzelle ein
`<table:covered-table-cell/>`. Damit hat jede Zeile exakt `colCount`
`<table:table-cell>` + `<table:covered-table-cell>` Kindelemente — ODF-1.3-konform.

**Warum das ein reines Regressionsthema ist:** Aus Sicht beider Writer ist eine per
`addRowBefore`/`addRowAfter` eingefügte Zeile von einer importierten **nicht
unterscheidbar** (dasselbe JSON-Datenmodell, Abschnitt 5). Eine frisch eingefügte Zeile
hat außerdem grundsätzlich `map.width` Einzelzellen ohne colspan (Abschnitt 2, Punkt 2),
verändert also die Merge-/Spaltenstruktur der übrigen Tabelle nicht. Der Nachweis muss
trotzdem geführt werden — gegen die **bereits vorhandenen** Roh-XML-Tests
(`odt/__tests__/roundtrip.test.ts:275/310`, `docx/__tests__/roundtrip.test.ts:261/279`)
**und** einen neuen dedizierten Grenzfall-5-Test (Abschnitt 8.4), damit eine spätere
Änderung diese korrekte Logik nicht unbemerkt bricht.

---

## 2. Bestätigtes Bibliotheksverhalten von `prosemirror-tables` (Belegstellen)

Gegen `node_modules/prosemirror-tables/dist/index.js` (nicht nur `.d.ts`) geprüft, weil
die Architekturentscheidung „reine Verdrahtung" davon abhängt, was die Bibliothek bereits
selbst leistet.

| # | Frage | Fundstelle (`dist/index.js`) | Ergebnis |
|---|---|---|---|
| 1 | Verlängert `addRowBefore`/`addRowAfter` einen bestehenden vertikalen Merge korrekt (3.3, Grenzfall 2)? | `addRow` (Zeile 1418 ff.): erkennt eine Zelle, die aus der Zeile darüber fortgesetzt wird (`map.map[index] == map.map[index - map.width]`) und erhöht deren `rowspan` per `setNodeMarkup`, statt eine neue Zelle zu erzeugen. | **Ja, eingebaut.** Merge wird um eine Zeile verlängert, keine verwaiste Referenz. Nur Test nötig (8.1). |
| 2 | Hat eine frisch eingefügte Zeile immer die richtige Spaltenzahl (Grenzfall 3)? | `addRow`, `else`-Zweig: pro Spalte genau **eine** Einzelzelle (`colspan` 1) via `createAndFill()`; kein Pfad erzeugt `colspan > 1`. | Neue Zeile hat **immer genau `map.width` Zellen** — Summe der effektiven Spalten stimmt per Konstruktion. Kein eigener Code. |
| 3 | Grenzfall 5 (neue Zeile wird Zeile 1, alte Zeile 1 hatte colspan)? | Folgt aus #2: neue Zeile 0 hat `map.width` Einzelzellen, unabhängig von der colspan-Struktur der verschobenen alten Zeile. | `colCount` (Summe colspans Zeile 0) = `map.width`, für DOCX **und** ODT automatisch korrekt. Reiner Regressionsschutz (Abschnitt 1), kein Fix. |
| 4 | Bleibt die Selektion in derselben logischen Zelle (3.4)? | `addRow` dispatcht nur `tr.insert(...)`, **ohne** `setSelection`. `EditorState.apply()` mappt die Selektion automatisch durch `tr.mapping`. | **Automatisch korrekt.** `addRowBefore` verschiebt die Cursor-Position mit, `addRowAfter` lässt sie unverändert. Nur Test (Selection-Sync, Abschnitt 8.2). |
| 5 | Ein Undo-Schritt pro Aktion (3.6)? | `addRowBefore`/`addRowAfter` dispatchen je **eine** Transaktion; `history()` (in `WordEditor.tsx:84`) macht daraus einen Undo-Eintrag. | Automatisch korrekt. |
| 6 | Mehrzeilige `CellSelection` (Grenzfall 8)? | `selectedRect` liefert `{ top, bottom, ... }` für die gesamte Selektion; `addRowBefore` → `addRow(tr, rect, rect.top)`, `addRowAfter` → `addRow(tr, rect, rect.bottom)`. | **Genau eine** neue Zeile relativ zur obersten/untersten Zeile = **Variante (a)** der Anforderung (Abschnitt 4.1). |
| 7 | Repariert `tableEditing()` inkonsistente Fremdtabellen (Grenzfall 9)? | `tableEditing()` registriert `appendTransaction(... fixTables(...) ...)`; `fixTable` behebt `collision`/`missing`/`overlong_rowspan`/`zero_sized` automatisch. | **Ja**, ab der ersten dispatchten Transaktion (der Klick, der `isInTable` wahr macht, ist bereits eine solche). Kein Ersatz für einen expliziten Test (8.1). |

`TableMap.positionAt(row, col, table)` (Zeile 101) liefert einen Offset **relativ zum
tableStart**; die absolute Position ist `tableStart + positionAt(...)` (belegt durch die
Bibliotheks-eigene Nutzung in `dist/index.js:1333–1334`:
`tr.insert(tr.mapping.map(tableStart + pos), ...)`). `findTable($pos)` liefert
`{ node, pos, start, depth }`, wobei `start` der tableStart ist. Beides wird von
`insertRowOnTabAtTableEnd` (Abschnitt 6.1) genutzt.

**Konsequenz:** Die Kernlogik für Grenzfälle 1–10 ist vollständig in `prosemirror-tables`
vorhanden. Verbleibender Aufwand = Verdrahtung + Tests, **kein** neuer Algorithmus, **kein**
Writer-Fix.

### 2.1 Entwickler-Verifikation (2026-07-05): Kernarithmetik empirisch bestätigt, nicht nur aus dem Quelltext abgeleitet

Die Tabelle in Abschnitt 2 sowie Abschnitt 6.1 stützten sich bislang ausschließlich auf
**Lesen** von `node_modules/prosemirror-tables/dist/index.cjs` — korrekt, aber noch keine
Ausführung. In dieser Prüfrunde wurde zusätzlich ein Wegwerf-Testskript gegen
`wordSchema` (`src/formats/shared/schema.ts`) und die echte installierte
`prosemirror-tables@1.8.5` geschrieben, per `npx vitest run` ausgeführt und danach wieder
gelöscht (kein Dauerartefakt; die **dauerhaften** Tests sind weiterhin in Abschnitt 8.1/8.3
zu erstellen). Ergebnis — **alle Fälle grün**:

| Geprüfter Fall | Aufbau | Ergebnis |
|---|---|---|
| `addRowBefore` hält den Cursor in derselben logischen Zelle (3.4) | 2×2-Tabelle, Cursor im Text „A2" (Zeile 2), `addRowBefore` ausgelöst | Tabelle danach 3 Zeilen; `newState.selection.$head.parent.textContent === 'A2'` — Cursor bleibt nachweislich in der ursprünglichen Zelle, nicht in der neuen leeren Zeile |
| rowspan-Verlängerung statt verwaister Zelle (3.3, Grenzfall 2) | Zeile 0 hat eine Zelle mit `rowspan: 2`, Cursor in Zeile 1, `addRowBefore` (Einfügeposition **innerhalb** des Merge-Bereichs) | Tabelle danach 3 Zeilen; die ursprüngliche Zelle hat jetzt `rowspan: 3` (verlängert) — **keine** zusätzliche, unverbundene Zelle an dieser Rasterposition |
| Mehrzeilige `CellSelection` → genau eine neue Zeile (Grenzfall 8, Variante (a)) | 3×2-Tabelle, `CellSelection` über Zeile 0–1 (beide Spalten), `addRowAfter` | Tabelle danach 4 Zeilen (nicht 5) — bestätigt Variante (a) exakt wie in 4.1 festgelegt |
| `insertRowOnTabAtTableEnd`-Arithmetik (Abschnitt 6.1, Grenzfall 4) | 1×2-Tabelle, Cursor in der letzten Zelle, das exakte Codeschnipsel aus 6.1 (inkl. `found.start + map.positionAt(rect.bottom, 0, found.node)` und `+ 1`) ausgeführt | **Ein** Dispatch (ein Undo-Schritt, 3.6); Tabelle danach 2 Zeilen; Cursor landet in einem leeren `paragraph` **innerhalb der neu eingefügten (zweiten) Zeile**, nicht in Zeile 1 — die Positions-Arithmetik ist korrekt, kein Off-by-one |
| Verschachtelte Tabelle (Grenzfall 10) | Äußere 2×2-Tabelle, eine Zelle enthält eine innere 1×2-Tabelle | `addRowBefore` auf die **äußere** Tabelle: äußere Tabelle danach 3 Zeilen, innere Tabelle strukturell und inhaltlich unverändert (weiterhin 1 Zeile, Text erhalten). `addRowAfter` mit Cursor **in der inneren** Tabelle: innere Tabelle danach 2 Zeilen, äußere Tabelle bleibt bei 2 Zeilen — keine Kreuzwirkung in beide Richtungen |

**Konsequenz für den Umsetzungsplan:** Der in Abschnitt 6.1 stehende Vorbehalt „Zu
verifizieren im Unit-Test (Abschnitt 8.1), bevor als korrekt gewertet" ist damit **erfüllt**
— das dort abgedruckte Codeschnipsel wurde nicht nur entworfen, sondern lauffähig
durchgespielt. Abschnitt 8.1 bleibt trotzdem verbindlich: Die hier verwendeten
Wegwerf-Tests sind **keine** Umsetzung der Testpflicht aus `zeile-einfuegen-req.md`
Abschnitt 6, sondern ausschließlich ein Vertrauens-/Risikoabbau für diesen Plan vor
Übergabe an die Umsetzung; die dauerhaften, benannten Tests aus 8.1/8.2/8.3/8.4 sind
weiterhin zu schreiben und müssen unabhängig grün sein.

---

## 3. Architektur-Entscheidungen

1. **Kein neues Modul.** Erweiterung von drei bestehenden Dateien (`commands.ts`,
   `Toolbar.tsx`, `WordEditor.tsx`). Keine wiederverwendbare „reine Logik ohne
   ProseMirror-Typen", die ein eigenes Modul rechtfertigen würde — alles sind dünne
   Command-Wrapper um getestete Bibliotheksfunktionen.
2. **`commands.ts` bleibt der einzige Ort, an dem Tabellen-Commands aus
   `prosemirror-tables` importiert werden** — analog zum bestehenden `export { isInTable }`
   (Zeile 6). `Toolbar.tsx`/`WordEditor.tsx` importieren Zeilen-Commands **nur** aus
   `./commands`, damit `zeile-loeschen`/`spalte-einfuegen` später an derselben Stelle
   andocken.
3. **Kein eigenes Tabellen-Kontextmenü.** Deckt sich mit Anforderung Abschnitt 1 # 3
   („Nice-to-have, kein Blocker"). Bewusst **nicht** umgesetzt (Scope), nicht vergessen.
   Analog zur bestehenden Entscheidung, das native Browser-Kontextmenü unangetastet zu
   lassen (`WordEditor.tsx:117–121`).
4. **Tab-Navigation zwischen Zellen ist zwingender Nebeneffekt, keine Scope-Erweiterung.**
   Grenzfall 4 („Tab in letzter Zelle fügt Zeile hinzu") erfordert eine
   `chainCommands(goToTableCell(1), insertRowOnTabAtTableEnd())`-Kette: `goToNextCell(1)`
   navigiert normal zur nächsten Zelle; nur wenn es `false` liefert (keine nächste Zelle),
   greift der Fallback. Es ist technisch nicht möglich, nur den Randfall zu binden.
   `Shift-Tab` = `goToTableCell(-1)` (vorherige Zelle, keine Zeilenerzeugung).
   **Kompatibilität mit `liste-einruecken-tab`** (`specs/liste-einruecken-tab-req.md`,
   ebenfalls noch nicht implementiert — kein `Tab`-Eintrag im aktuellen Keymap,
   `WordEditor.tsx:85–107` bestätigt): Die Kette **muss** außerhalb einer Tabelle `false`
   liefern (beide Kettenglieder prüfen `isInTable`), damit ein späterer Listen-Einzug an
   dieselbe Taste angehängt werden kann, ohne diese Datei erneut umzubauen. Der native
   Browser-Tab (Fokus verlässt Editor) bleibt außerhalb von Tabellen unverändert.
5. **Keine Änderung an `reconcileSelectionOnClick`** (`WordEditor.tsx:43–50`): Zeilen-
   Einfügen läuft immer über eine reguläre, von `dispatchTransaction` (`WordEditor.tsx:125`)
   verarbeitete Transaktion, nie über eine DOM-Mutation ohne Transaktion — der bekannte
   Selection-Sync-Bug entsteht nur dort. Dennoch Pflicht-Regressionstest (Abschnitt 8.2).
6. **Fehlerrückmeldung nutzt das bestehende `cutError`-Muster** (siehe Abschnitt 4.3) statt
   eines neuen, divergierenden Banners.

---

## 4. Verbindliche Design-Entscheidungen zu offenen Fragen der Spezifikation

### 4.1 Grenzfall 8 (mehrzeilige `CellSelection`) — Variante (a), Bibliotheksverhalten übernehmen

**Entscheidung: Variante (a).** Bei einer `CellSelection` über mehrere Zeilen wird genau
**eine** neue Zeile relativ zur obersten (Aktion „oberhalb") bzw. untersten (Aktion
„unterhalb") Zeile der Selektion eingefügt — das Standardverhalten von
`addRowBefore`/`addRowAfter` (Abschnitt 2, Punkt 6). Es wird **nicht** auf „N Zeilen für N
selektierte Zeilen" umgebaut. Begründung: Variante (b) verlangte eigene, ungetestete
Schleifenlogik statt des direkten Aufrufs; Variante (a) entspricht dem verbreiteten
„eine Zeile einfügen"-Verhalten. Dieser Absatz ist die von `zeile-einfuegen-req.md`
Abschnitt 6, Testplanhinweis 5 geforderte Dokumentation der Variante und Grundlage des
Tests in Abschnitt 8.1.

### 4.2 Formatierung/Zellinhalt der neuen Zeile (3.5) — keine Übernahme

Geprüft: `src/formats/odt/reader.ts:315` und `src/formats/docx/reader.ts:350` setzen
`colwidth: null` **immer**; `docx/writer.ts:161` schreibt pauschal `<w:gridCol w:w="2000"/>`,
`odt/writer.ts:117` schreibt `<table:table-column/>` ohne Breite. Es existiert also **kein**
von `null` abweichender `colwidth`-Wert, den man erben oder nicht erben könnte — die in 3.5
befürchtete optische „Sprung"-Situation ist mit dem heutigen Code unmöglich. Eine per
`addRowBefore`/`addRowAfter` erzeugte Zelle hat ebenfalls `colwidth: null` (Default von
`createAndFill()`) und einen leeren `paragraph` ohne Marks — exakt „kein automatisches
Übernehmen von Formatierung". **Keine Zusatzlogik.**

### 4.3 Grenzfall 9 (kein stiller Fehlschlag) — bestehendes `cutError`-Muster wiederverwenden

Es gibt **keinen bekannten** Pfad, auf dem `addRowBefore`/`addRowAfter` bei
`isInTable(state) === true` `false` zurückgeben oder werfen (der Button ist deaktiviert,
solange `isInTable` falsch ist, Abschnitt 6.2). Anforderung 3.7/Grenzfall 9 verlangt
dennoch sichtbare Rückmeldung für den unwahrscheinlichen Restfall.

**Entscheidung:** Das Projekt hat für genau diesen Zweck bereits ein etabliertes Muster —
den **`cutError`-Kanal**: `WordEditor.tsx:71` hält `const [cutError, setCutError] =
useState<string | null>(null)`. Die 4-Sekunden-Auto-Ausblendung ist inzwischen in einen
**wiederverwendbaren Hook `useAutoDismiss(value, setValue, ms = 4000)`** ausgelagert
(`WordEditor.tsx:57–63`), der für `cutError` per `useAutoDismiss(cutError, setCutError)`
aufgerufen wird (`WordEditor.tsx:74`). `Toolbar.tsx:157–161` rendert die Meldung als
`<span role="alert" …>` neben dem Ausschneiden-Button, und
`cutSelection({ onCutBlocked: setCutError })` (`commands.ts:149`) speist sie. Die
Zeilen-Einfügen-Rückmeldung wird **spiegelbildlich** dazu gebaut (paralleler
`rowError`/`setRowError`-State in `WordEditor`, per Props an die Toolbar, gleiches
`role="alert"`-Rendering) — **nicht** als neuer lokaler `useState` mit manuellem
Schließen-Button in der Toolbar. **Wichtig (Abweichung gegenüber einer früheren Fassung
dieses Plans):** Die Auto-Ausblendung wird **nicht** als zweiter, inline duplizierter
`useEffect` gebaut, sondern durch **denselben** vorhandenen Hook — ein zusätzlicher Aufruf
`useAutoDismiss(rowError, setRowError)` genügt (siehe 6.3, Punkt 3). Vorteile: konsistente
UX, Auto-Ausblendung „gratis" und ohne Code-Duplikat, und die (theoretisch ebenfalls
fehlbare) Tab-Bindung in `WordEditor` kann denselben State setzen, weil er dort und nicht
in der Toolbar lebt — exakt der Grund, aus dem `cutError` in `WordEditor` liegt (auch
`Shift-Delete` in `WordEditor.tsx:106` setzt ihn). `run()` wird nur um einen
**Rückgabewert** ergänzt (siehe 6.2), rückwärtskompatibel.

### 4.4 Cross-Format-Rundreise (5.2) — nur auf Unit-Ebene möglich

`src/formats/types.ts` (`FormatModule.exportFile`) und die Format-Module
(`docxModule.exportFile = writeDocx`, `odtModule.exportFile = writeOdt`) zeigen: ein
geöffnetes Dokument kann **ausschließlich** in sein eigenes Format re-exportiert werden;
es gibt **keine** UI-Funktion „als anderes Format exportieren". Der in 5.2 geforderte
Cross-Format-Test ist daher **nicht** als E2E über echte Bedienung umsetzbar, sondern nur
als Unit-Test: `readDocx(...)` → `body`-JSON per Transaktion (`addRowBefore`/`addRowAfter`
auf einem `EditorState`) ändern → `writeOdt(...)` → `readOdt(...)`, und umgekehrt. Als
**dokumentierte strukturelle Einschränkung** in die Abnahme (Abschnitt 11) aufnehmen,
nicht stillschweigend als „E2E getestet" ausgeben.

---

## 5. ProseMirror-Schema — keine Änderung nötig

`src/formats/shared/schema.ts:154`: `...tableNodes({ tableGroup: 'block', cellContent:
'block+', cellAttributes: {} })` liefert bereits `colspan`/`rowspan`/`colwidth` je Zelle
und `block+`-Inhalte (mehrere Absätze, verschachtelte Tabellen, Listen, Bilder). Eine per
`addRowBefore`/`addRowAfter` eingefügte Zelle ist strukturell identisch zu einer
importierten — kein neuer Node-Typ, kein neues Attribut. Grenzfall 10 (verschachtelte
Tabelle) ist durch `cellContent: 'block+'` bereits abgedeckt, unverändert.

---

## 6. Datei-für-Datei-Umsetzungsplan

Drei geänderte Dateien. **Keine** Änderung an `odt/writer.ts`, `docx/writer.ts`,
`*/reader.ts` oder `schema.ts`.

### 6.1 GEÄNDERT: `src/formats/shared/editor/commands.ts`

**Imports (Zeile 1–4) ergänzen** — `TextSelection` als Wert-Import (für die Tab-Kette) und
die Zeilen-Commands aus `prosemirror-tables`:

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

**Neue Exporte (am Ende der Datei, nach `cutSelection`, Zeile 166, anfügen):**

```ts
/** Fügt eine neue, leere Zeile unmittelbar oberhalb der Zeile ein, in der sich die
 *  aktuelle Selektion befindet (Anforderung 3.1). Bei einer mehrzeilige `CellSelection`
 *  bezieht sich „oberhalb" auf die oberste Zeile der Selektion (Grenzfall 8, Variante (a),
 *  siehe zeile-einfuegen-code.md Abschnitt 4.1). Reiner Re-Export der bereits korrekten
 *  prosemirror-tables-Implementierung — Merge-Verlängerung, Spaltenkonsistenz,
 *  Selektions-Mapping und Undo-Gruppierung sind dort bereits richtig (Abschnitt 2). */
export const insertRowBefore: Command = addRowBefore

/** Spiegelbildlich zu `insertRowBefore` (Anforderung 3.2). */
export const insertRowAfter: Command = addRowAfter

/** Tab/Umschalt+Tab-Navigation zur nächsten/vorherigen Tabellenzelle. Liefert außerhalb
 *  einer Tabelle `false` (native Tab-Semantik bleibt erhalten) und — für `direction: 1` —
 *  auch dann `false`, wenn keine nächste Zelle mehr existiert; genau dieser Fall wird von
 *  `insertRowOnTabAtTableEnd` als Fallback behandelt. */
export function goToTableCell(direction: 1 | -1): Command {
  return goToNextCell(direction)
}

/** Grenzfall 4: Tab in der letzten Zelle der letzten Zeile hängt eine neue Zeile unten an
 *  und setzt den Cursor in deren erste Zelle — in **einer** Transaktion (3.6: ein
 *  Undo-Schritt). Muss in einer `chainCommands`-Kette **nach** `goToTableCell(1)` stehen,
 *  damit normale Zellnavigation Vorrang hat (Abschnitt 3, Punkt 4). Positions-Arithmetik
 *  belegt gegen prosemirror-tables (Abschnitt 2): absolute Zellposition =
 *  `found.start + TableMap.positionAt(row, col, found.node)`. */
export function insertRowOnTabAtTableEnd(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false
    if (dispatch) {
      const rect = selectedRect(state)
      const tr = addRow(state.tr, rect, rect.bottom)
      const found = findTable(tr.doc.resolve(tr.mapping.map(rect.tableStart)))
      if (found) {
        const map = TableMap.get(found.node)
        // erste Zelle der neu eingefügten Zeile (Index rect.bottom); +1 = erster
        // gültiger Cursor-Punkt innerhalb der Zelle.
        const firstCellPos = found.start + map.positionAt(rect.bottom, 0, found.node)
        tr.setSelection(TextSelection.near(tr.doc.resolve(firstCellPos + 1)))
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

**Bereits empirisch verifiziert (Abschnitt 2.1), zusätzlich als dauerhafter Unit-Test in
Abschnitt 8.1 zu erstellen:** der `+ 1`-Offset (Zellgrenze → erster Cursor-Punkt) und die
Verwendung von `rect.bottom` als Index der neuen Zeile. Beides ist aus der
Bibliotheksnutzung (Abschnitt 2) abgeleitet, nicht 1:1 aus einer identischen
Bibliotheksstelle kopiert — ein Wegwerf-Testlauf in dieser Prüfrunde hat das Schnipsel
Zeile für Zeile wie oben abgedruckt ausgeführt und bestätigt (ein Dispatch, Cursor in der
neuen Zeile, siehe Abschnitt 2.1); das ersetzt **nicht** den in 8.1 geforderten,
eingecheckten Test. `insertRowBefore`/`insertRowAfter` bekommen **bewusst keinen** eigenen
Wrapper (Bibliothek erledigt alles, Fehlerbehandlung lebt in der Toolbar, Abschnitt 4.3).

### 6.2 GEÄNDERT: `src/formats/shared/editor/Toolbar.tsx`

1. **`run()` (Zeile 28–31) liefert den Command-Rückgabewert zurück — und behält den
   dritten `view`-Parameter** (den `cutSelection` zwingend braucht; die frühere Fassung
   ließ ihn fälschlich weg):

   ```ts
   function run(view: EditorView, command: Command): boolean {
     const ok = command(view.state, view.dispatch, view)
     view.focus()
     return ok
   }
   ```

   Rückwärtskompatibel: alle bestehenden Aufrufer ignorieren den Rückgabewert.

2. **`ToolbarProps` (Zeile 22–26) um den Fehlerkanal erweitern** (parallel zu `cutError`,
   siehe Abschnitt 4.3):

   ```ts
   interface ToolbarProps {
     view: EditorView
     cutError: string | null
     setCutError: (message: string | null) => void
     rowError: string | null
     setRowError: (message: string | null) => void
   }
   ```

3. **Import (Zeile 6–20) um `insertRowAfter`, `insertRowBefore` ergänzen** (`isInTable`
   ist bereits importiert, Zeile 14):

   ```ts
   import {
     applyMarkColor, canCut, clearMarkColor, cutSelection, insertImage,
     insertRowAfter, insertRowBefore, insertTable, isAlignActive, isInTable,
     liftFromList, setAlign, setHeading, toggleList, type Align,
   } from './commands'
   ```

4. **Zwei SVG-Icons** (nach `ScissorsIcon`, Zeile 53, im selben Stil — `viewBox="0 0 24 24"`,
   `stroke="currentColor"`, `aria-hidden`, `focusable="false"`). SVG statt Unicode-Glyphe,
   weil Anforderung Abschnitt 1 # 8 / `FEATURE-SPEC-DOCX-ODT.md` 20.1 SVG **bevorzugt** und
   das Projekt den Ausschneiden-Button gerade erst von einem Emoji auf `ScissorsIcon`
   umgestellt hat — die neuen Buttons folgen diesem frischen Hausmuster:

   ```tsx
   function InsertRowAboveIcon() {
     return (
       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
         <path d="M12 3v5M9.5 5.5 12 3l2.5 2.5" />
         <rect x="4" y="11" width="16" height="10" rx="1" />
         <line x1="4" y1="16" x2="20" y2="16" />
         <line x1="12" y1="11" x2="12" y2="21" />
       </svg>
     )
   }
   function InsertRowBelowIcon() {
     return (
       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
         <rect x="4" y="3" width="16" height="10" rx="1" />
         <line x1="4" y1="8" x2="20" y2="8" />
         <line x1="12" y1="3" x2="12" y2="13" />
         <path d="M12 21v-5M9.5 18.5 12 21l2.5-2.5" />
       </svg>
     )
   }
   ```

   *(Zulässiger Fallback, falls kein Icon gezeichnet werden soll: ein reines Textlabel
   „Zeile oberhalb" / „Zeile unterhalb" — Anforderung # 8 erlaubt „ein eindeutiges
   Textlabel" alternativ zum SVG. Eine alleinstehende Unicode-Pfeil-Glyphe `↑`/`↓` ohne
   Textlabel ist dagegen genau das, wovor # 8 warnt.)*

5. **Zwei Buttons unmittelbar nach dem „⊞ Tabelle"-Button** (nach Zeile 289, vor dem
   „🖼 Bild"-Label Zeile 291). `disabled`-Muster und Klassen **wörtlich** vom bereits
   bestehenden Ausschneiden-Button (Zeile 147/153) übernommen — das ist **kein** neues
   Muster (die frühere Fassung behauptete fälschlich „erste Verwendung von `disabled`"):

   ```tsx
   <button
     type="button"
     title="Zeile oberhalb einfügen"
     aria-label="Zeile oberhalb einfügen"
     disabled={!isInTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       setRowError(null)
       try {
         if (!run(view, insertRowBefore)) setRowError('Zeile konnte nicht eingefügt werden.')
       } catch {
         setRowError('Zeile konnte nicht eingefügt werden.')
       }
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
   >
     <InsertRowAboveIcon />
   </button>
   <button
     type="button"
     title="Zeile unterhalb einfügen"
     aria-label="Zeile unterhalb einfügen"
     disabled={!isInTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       setRowError(null)
       try {
         if (!run(view, insertRowAfter)) setRowError('Zeile konnte nicht eingefügt werden.')
       } catch {
         setRowError('Zeile konnte nicht eingefügt werden.')
       }
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
   >
     <InsertRowBelowIcon />
   </button>
   {rowError && (
     <span role="alert" className="text-xs text-red-600 dark:text-red-400 max-w-[16rem] truncate">
       {rowError}
     </span>
   )}
   ```

   `onMouseDown` + `e.preventDefault()` wie bei allen Toolbar-Buttons (verhindert
   Fokusverlust/Selektionskollaps vor der Aktion). Die `disabled`-Auswertung aktualisiert
   sich automatisch, weil `dispatchTransaction` (`WordEditor.tsx:125`) nach jeder
   Transaktion `forceRender` auslöst und die Toolbar `isInTable(view.state)` bei jedem
   Render frisch liest — identisch zum bestehenden `disabled={!canCut(view.state)}` und
   `aria-pressed={isInTable(view.state)}`.

### 6.3 GEÄNDERT: `src/formats/shared/editor/WordEditor.tsx`

1. **Import Zeile 6** um `chainCommands` erweitern:
   `import { baseKeymap, chainCommands, toggleMark } from 'prosemirror-commands'`
2. **Import Zeile 12** um die neuen Commands erweitern:
   `import { cutSelection, goToTableCell, insertHardBreak, insertRowOnTabAtTableEnd } from './commands'`
3. **Neuer State `rowError`** parallel zu `cutError` (Zeile 71) plus Auto-Ausblendung über
   den **bereits vorhandenen** `useAutoDismiss`-Hook (`WordEditor.tsx:57–63`, für `cutError`
   aufgerufen in Zeile 74) — **kein** zweiter, inline duplizierter `useEffect` (das ist die
   Korrektur gegenüber der früheren Fassung, siehe Abschnitt 4.3 und 12):

   ```ts
   const [rowError, setRowError] = useState<string | null>(null)
   // ... direkt nach useAutoDismiss(cutError, setCutError) (Zeile 74):
   useAutoDismiss(rowError, setRowError)
   ```

   Der Hook nimmt `(value, setValue, ms = 4000)` und ist genau für diesen Zweck gebaut
   (JSDoc in `WordEditor.tsx:52–56`); ein eigener Timeout-`useEffect` wäre eine unnötige
   Duplikation.

4. **Zwei Einträge zum bestehenden `keymap({...})`-Objekt** (Zeile 85–107) **hinzufügen** —
   additiv, die vorhandenen Bindungen `'Shift-Enter': insertHardBreak()` (Zeile 97),
   `'Shift-Delete': cutSelection({ onCutBlocked: setCutError })` (Zeile 106) und der
   load-bearing Kommentar zu `Mod-c/x/v` (Zeile 86–92) **bleiben unverändert erhalten**
   (die frühere Fassung zeigte ein gekürztes Keymap-Objekt, das diese Einträge
   versehentlich gelöscht hätte):

   ```ts
   // ... innerhalb des bestehenden keymap({ ... }), z. B. nach 'Mod-u':
   Tab: chainCommands(goToTableCell(1), insertRowOnTabAtTableEnd()),
   'Shift-Tab': goToTableCell(-1),
   ```

5. **`rowError`/`setRowError` an die Toolbar durchreichen** (Zeile 170):
   `<Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} rowError={rowError} setRowError={setRowError} />`

**Keine Änderung an `plugins: [...]`** — `columnResizing()`/`tableEditing()`
(Zeile 109–110) und `history()` (Zeile 84) sind bereits vorhanden; das ist alles, was
`addRowBefore`/`addRowAfter`/`goToNextCell` zur Laufzeit voraussetzen. Das eigene
`keymap({...})` steht bereits **vor** `keymap(baseKeymap)` (Zeile 108), sodass die
Tab-Kette Vorrang hat. `baseKeymap` bindet kein `Tab`/`Shift-Tab`, also keine Kollision;
außerhalb einer Tabelle liefert die Kette `false` und das native Tab greift wie bisher.

### 6.4 KEINE Änderung: `src/formats/odt/writer.ts`, `src/formats/docx/writer.ts`, `src/formats/*/reader.ts`, `src/formats/shared/schema.ts`

Der ODT-Writer schreibt `<table:covered-table-cell/>` und colspan-bewusstes `colCount`
bereits korrekt (Abschnitt 1, Zeile 110–174) — **die in der früheren Fassung als 6.4
geforderte „Pflichtänderung" entfällt vollständig und darf nicht durchgeführt werden**
(sie würde die deterministische `TableNameSequence` durch `Math.random()` ersetzen und die
`blockToOdt`-Signatur brechen). DOCX-Writer, beide Reader und das Schema sind unverändert
korrekt (Abschnitte 1, 4.2, 5). Der einzige Auftrag hier ist **Regressionsschutz** via
Tests (Abschnitt 8.4).

---

## 7. Zusammenfassung Import/Export OOXML/ODF

| Format | Reader | Writer |
|---|---|---|
| DOCX | **Keine Änderung.** `docx/reader.ts:316–356` liest `vMerge`/`gridSpan`, `colwidth: null` (Zeile 350). | **Keine Änderung.** `docx/writer.ts:158 ff.` (`tableToDocx`) schreibt `colCount`/`pending[]`/`vMerge` korrekt. |
| ODT | **Keine Änderung.** `odt/reader.ts:304–315` liest `number-rows-spanned`/`number-columns-spanned`, überspringt `covered-table-cell`, `colwidth: null` (Zeile 315). | **Keine Änderung.** `odt/writer.ts:110–174` schreibt colspan-bewusstes `colCount` und `covered-table-cell` bereits ODF-konform — nur per Regressionstest absichern (Abschnitt 8.4), **nicht** ändern. |

---

## 8. Tests

### 8.1 NEU: `src/formats/shared/editor/__tests__/tableRowCommands.test.ts`

Direkter Command-Test gegen `EditorState.create({ doc, schema: wordSchema, plugins:
[tableEditing()] })` (Muster analog `__tests__/pagination.test.ts`,
`__tests__/commands.test.ts`). Testtabellen über `wordSchema.nodeFromJSON(...)`
konstruieren; Command mit `command(state, (tr) => { state = state.apply(tr) })` ausführen.

| Funktion | Testfälle |
|---|---|
| `insertRowBefore` | Grundfall 3.1 (neue leere Zeile vor Zeile *Z*, `map.width` Zellen); Grenzfall 1 (1-Zeilen-Tabelle → danach 2 Zeilen); Grenzfall 2 (Cursor in einer von rowspan überdeckten Zeile → rowspan +1, keine neue Zelle dort); Grenzfall 3 (Nachbarzeile colspan → neue Zeile trotzdem `map.width` Einzelzellen); Grenzfall 5 (Einfügen oberhalb Zeile 0 mit colspan → Summe colspans neue Zeile 0 = `map.width`); Selektion bleibt in derselben logischen Zelle (3.4, Vergleich über Zellinhalt); ein Undo stellt exakten Vorzustand her (3.6) |
| `insertRowAfter` | Spiegelbildlich (3.2); Grenzfall 11 (Tabelle am Dokumentende, Editor danach bedienbar) |
| Grenzfall 6 | `CellSelection` über mehrere Zellen **derselben** Zeile → genau **eine** neue Zeile |
| Grenzfall 7 | `CellSelection` markiert **eine ganze** Zeile → wie Grundfall |
| Grenzfall 8 | `CellSelection` über **mehrere Zeilen** (3×3-Selektion in 5-Zeilen-Tabelle) → **genau eine** neue Zeile relativ zur obersten/untersten Zeile (Variante (a), Abschnitt 4.1) |
| Grenzfall 10 | Verschachtelte Tabelle: Zeile in **äußerer** Tabelle lässt innere unverändert; Zeile in **innerer** wirkt nicht nach außen |
| Tab-Kette | Tab in Nicht-Endzelle → Selektion rückt weiter, **keine** neue Zeile; Tab in letzter Zelle → neue Zeile unten, Cursor in deren erster Zelle (Grenzfall 4), **ein** Undo-Schritt; `Shift-Tab` in erster Zelle → `false`, kein Crash; außerhalb Tabelle: beide Kettenglieder `false` |
| Grenzfall 9 | Absichtlich unregelmäßige Tabelle per `nodeFromJSON`; nach erstem `apply` mit aktivem `tableEditing()` prüfen, dass `fixTables` normalisiert, danach `insertRowBefore`/`After` ohne Crash |
| Grenzfall 12 | Zwei aufeinanderfolgende `insertRowAfter` → zwei separate Zeilen |
| Grenzfall 15 | Einfügen → Undo → Redo → erneut Einfügen: exakter Zwischenzustand je Schritt |

### 8.2 Ergänzung `tests/e2e/selection-regression.spec.ts` (Pflicht, Anforderung Abschnitt 2/6.3)

Neuer `test()` **im bestehenden `describe`-Block** (dessen `beforeEach` das Privacy-Banner
via „verstanden" wegklickt und über die ODT-Karte „Neu erstellen" ein Dokument anlegt —
Muster aus der Datei übernehmen):

```ts
test('insert-row toolbar action followed by typing lands in the right cell', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click() // untere linke Zelle der 2×2-Tabelle
  await page.getByRole('button', { name: 'Zeile oberhalb einfügen' }).click()
  await page.keyboard.type('Nach Einfügen')

  await expect(editor).toContainText('Nach Einfügen')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
})
```

### 8.3 NEU: `tests/e2e/zeile-einfuegen.spec.ts`

Setup wie `docx.spec.ts`/`odt.spec.ts` (Privacy-Banner, Karten-Auswahl). Technik laut
Anforderung 6.1: Tabelle über „⊞ Tabelle" einfügen, Zelle per
`.ProseMirror td` `.nth(n).click()` wählen, Button klicken, `tr`/`td` **auszählen**
statt nur visuell zu prüfen. Testfälle:

1. **Freigabekriterium Abschnitt 7:** Beide Buttons über echte Interaktion auslösbar
   (`getByRole('button', { name: 'Zeile oberhalb/unterhalb einfügen' })`), erzeugen sichtbar
   je eine weitere `<tr>`.
2. **# 5:** Cursor in normalem Absatz → beide Buttons `await expect(...).toBeDisabled()`.
3. **3.1/3.2:** Zeile oberhalb erster / unterhalb letzter Zeile einer 3×2-Tabelle →
   `tr`-Anzahl und Zellinhalt-Reihenfolge stimmen.
4. **3.4:** Nach „Zeile oberhalb einfügen" direkt weitertippen landet im unveränderten
   logischen Zellinhalt, nicht in der neuen leeren Zeile.
5. **3.6:** Strg+Z → `tr`-Anzahl wie vorher; Strg+Y → wie nach Einfügen.
6. **Grenzfall 4:** Alle Zellen einer 2×2-Tabelle per Tab durchlaufen; letzter Tab (Zelle 4)
   erzeugt 3. Zeile, Cursor tippt darin.
7. **Grenzfall 11:** Dokument beginnt mit der Tabelle → Zeile oberhalb einfügen → Editor
   bleibt bedienbar (per `gapCursor`/Klick vor die Tabelle).
8. **Grenzfall 12/13:** Button zweimal schnell → genau 2 neue Zeilen; direkt danach „Fett"
   auf die neue Zeile → funktioniert (Bezug Hauptspezifikation Abschnitt 2).
9. **Grenzfall 16 (Touch):** dieselben Kernprüfungen (Einfügen + Undo + Selektions-
   konsistenz) laufen auf den `playwright.config.ts`-Projekten **Mobile** (Pixel 7) und
   **Tablet** (iPad Mini), nicht nur Desktop Chrome.

### 8.4 Ergänzung/Absicherung der Unit-Roundtrip-Tests

- **Bereits vorhanden — muss grün bleiben (Baseline-Regressionsschutz, Anforderung 5.1):**
  - `odt/__tests__/roundtrip.test.ts:275` (colspan, Roh-content.xml) und `:310` (rowspan,
    Roh-content.xml, Zeile 2 beginnt mit `covered-table-cell`).
  - `docx/__tests__/roundtrip.test.ts:261` (colspan) und `:279` (rowspan).
  - **Kein** Neuschreiben dieser Tests; die frühere Fassung hielt sie irrig für fehlend.
- **NEU (Grenzfall 5, dedizierter benannter Regressionstest — Anforderung 6, Hinweis 6):**
  je ein eigener `it(...)` in **beiden** `roundtrip.test.ts`, der eine Tabelle mit
  `colspan`/`rowspan` in Zeile 0 nimmt, per `addRowBefore` auf einem `EditorState` eine
  Zeile **oberhalb der bisherigen Zeile 0** einfügt (`state.doc.toJSON()` als neuer
  `body`), exportiert und die **Roh-XML** prüft: jede Zeile deklariert exakt `colCount`
  Zellen (`<w:tc>` bzw. `<table:table-cell>`+`<table:covered-table-cell>`), Merge-Struktur
  erhalten. Muss ein eigener, nicht im allgemeinen Rundreise-Test versteckter Block sein.
- **NEU (Cross-Format, Abschnitt 4.4):** `src/formats/shared/__tests__/cross-format-tablerow.test.ts`:
  `readDocx(...)` → `addRowBefore`/`addRowAfter` auf dem `body`-JSON (via
  `wordSchema.nodeFromJSON` → Transaktion → `toJSON()`) → `writeOdt(...)` → `readOdt(...)`,
  und umgekehrt; Struktur/Text erhalten.

---

## 9. Grenzfälle-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | 1-Zeilen-Tabelle | Kein Zusatzcode (`addRow`), Test 8.1 |
| 2 | Einfügen im rowspan-Bereich | In `addRow` eingebaut (2/#1), Test 8.1 + Roh-XML 8.4 (Bestand `:310`) |
| 3 | Nachbarzeile colspan | Automatisch `map.width` Zellen (2/#2), Test 8.1 |
| 4 | Tab in letzter Zelle | `insertRowOnTabAtTableEnd` (6.1/6.3), Test 8.1 + 8.3 #6 |
| 5 | Export-Spaltenzahl/Merge | Für den Insert-Fall automatisch unkritisch (2/#3); Writer bereits korrekt (Abschnitt 1); dedizierter Roh-XML-Regressionstest 8.4 |
| 6 | CellSelection mehrere Zellen einer Zeile | Genau eine Zeile, Test 8.1 |
| 7 | CellSelection ganze Zeile | Wie Grundfall, Test 8.1 |
| 8 | CellSelection mehrere Zeilen | Variante (a) (4.1), Test 8.1 |
| 9 | Inkonsistente Fremdtabelle | `fixTables`/`tableEditing()` (2/#7) + try/catch + `rowError` (4.3/6.2), Test 8.1 |
| 10 | Verschachtelte Tabelle | Schema deckt ab (5), Test 8.1 |
| 11 | Tabelle am Dokumentanfang/-ende | Kein Zusatzcode, Test 8.1/8.3 #7 |
| 12 | Schnelles Wiederholen | Je Transaktion unabhängig, Test 8.1 + 8.3 #8 |
| 13 | Einfügen + Formatierung danach | Regressionstest Hauptspez. Abschnitt 2, Test 8.2 + 8.3 #8 |
| 14 | Sehr große Tabelle, Mitte | Kein Sondercode (Transaktionen linear); manuelle Beobachtung, kein eigener Perf-Test |
| 15 | Einfügen → Undo → Redo → Einfügen | Test 8.1 |
| 16 | Touch/Mobile | Test 8.3 #9 (Projekte Mobile/Tablet) |

---

## 10. Reihenfolge der Umsetzung

1. `commands.ts`: `insertRowBefore`/`insertRowAfter`/`goToTableCell`/
   `insertRowOnTabAtTableEnd` + Import (6.1) **und** Unit-Tests (8.1) — insbesondere die
   Positions-Arithmetik von `insertRowOnTabAtTableEnd` zuerst absichern.
2. `Toolbar.tsx`: `run()`-Rückgabewert (mit `view`-Arg), zwei SVG-Buttons, `rowError`-Prop,
   Fehler-`span` (6.2).
3. `WordEditor.tsx`: `chainCommands`-Import, `rowError`-State + Auto-Ausblendung,
   additive `Tab`/`Shift-Tab`-Bindung, Toolbar-Props (6.3).
4. E2E: `zeile-einfuegen.spec.ts` (8.3) + Ergänzung `selection-regression.spec.ts` (8.2).
5. Grenzfall-5-Roh-XML-Tests (beide Formate) + Cross-Format-Unit-Tests (8.4).
6. Grenzfälle-Restliste (Abschnitt 9) einzeln abhaken; Grenzfall 9 zusätzlich gegen eine
   unregelmäßige Struktur aus `tests/fixtures/external/{docx,odt}/` (Korpus laut
   `tests/fixtures/external/README.md`).
7. `npm run build` (tsc -b) + `npm test` + `npm run test:e2e`. **Baseline-Rundreise
   (5.1)** erneut prüfen — die vorhandenen ODT-/DOCX-Merge-Tests (8.4, Bestand) müssen
   grün bleiben. Da **keine** Writer-/Reader-Änderung erfolgt, ist hier kein
   Format-Regressionsrisiko durch dieses Ticket zu erwarten; trotzdem verifizieren.

**Kein „Bugfix-zuerst"-Schritt** wie in der früheren Fassung (der beschriebene ODT-Bug
existiert im aktuellen Code nicht).

---

## 11. Abnahme-Checkliste (Bezug: `zeile-einfuegen-req.md` Abschnitt 7)

- [ ] Beide Toolbar-Buttons (# 1/# 2) über echte Browser-Interaktion auslösbar (8.3 #1),
      mit korrektem `disabled`-Zustand außerhalb einer Tabelle (# 5, 8.3 #2) und
      SVG-Icon + aussagekräftigem `aria-label` (# 8).
- [ ] Alle Tests aus 8.1–8.4 automatisiert und grün.
- [ ] Jeder Grenzfall aus Abschnitt 9 einzeln befundet; insbesondere Grenzfall 8
      (Variante (a), verbindlich) und Grenzfall 5 (dedizierter Roh-XML-Test **beide**
      Formate).
- [ ] Grenzfall 16 (Touch) auf Mobile und Tablet nachgewiesen (8.3 #9).
- [ ] Baseline-Rundreise (5.1) vor **und** nach der Änderung grün — die vorhandenen
      ODT-`covered-table-cell`-Tests (`roundtrip.test.ts:275/310`) und der
      DOCX-Rowspan-Test (`:279`) bleiben grün. **Regressionsschutz, kein Fix** — es wird
      kein Writer/Reader angefasst.
- [ ] Feature-Rundreise (5.2) für DOCX und ODT über echte Bedienung grün; Cross-Format
      **nur auf Unit-Ebene** (4.4) — als dokumentierte strukturelle Einschränkung im
      Freigabe-Vermerk nennen, nicht als „E2E getestet" ausgeben.
- [ ] Selection-Sync-Regressionstest mit Zeilen-Einfügen-Sequenz (8.2) grün und dauerhaft
      Teil von `selection-regression.spec.ts`.
- [ ] `npm run build` fehlerfrei.

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status von `zeile-einfuegen` von
„fehlt" auf **vorhanden** wechseln — mit der in 4.4 dokumentierten Cross-Format-
Einschränkung, analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und
`specs/einfuegen-req.md` Abschnitt 7.

---

## 12. Korrekturen gegenüber der früheren Fassung dieses Dokuments

Damit die bidirektionale Kette (PO/QA/Leiter) die Änderung nachvollziehen kann — die
frühere Fassung (~13:45) wurde gegen einen älteren Code-Stand geschrieben und ist in
mehreren Punkten überholt:

1. **ODT-Writer-„Bug" entfällt.** Die frühere Abschnitt 1/6.4-„Pflichtänderung"
   (`case 'table'` in `odt/writer.ts` ersetzen) ist gegenstandslos: `colCount` ist
   colspan-bewusst (Zeile 115–116), `<table:covered-table-cell/>` wird bereits geschrieben
   (Zeile 135–139/160–162), und beides ist getestet (`roundtrip.test.ts:275/310`). Die
   damalige Ersatz-Implementierung würde heute **nicht kompilieren** (sie ruft
   `blockToOdt(child, styles, images)` mit 3 statt 4 Argumenten auf — der aktuelle
   `blockToOdt` erwartet zusätzlich `tableNames`, Zeile 85) und würde die
   **Byte-Determinismus-Korrektur regressieren** (sie setzt `Table${Math.round(
   Math.random()...)}` statt `tableNames.next()`, `speichern-exportieren` Testfall 11).
2. **`run()`-Änderung korrigiert.** Der dritte Parameter `view` bleibt erhalten
   (`command(view.state, view.dispatch, view)`); die frühere Fassung ließ ihn weg, was
   `cutSelection` gebrochen hätte.
3. **Keymap additiv.** `Tab`/`Shift-Tab` werden zum bestehenden Keymap **hinzugefügt**; die
   früher gezeigte gekürzte Keymap hätte `'Shift-Enter': insertHardBreak()`,
   `'Shift-Delete': cutSelection(...)` und den Mod-c/x/v-Kommentar gelöscht.
4. **Fehler-Feedback über das `cutError`-Muster** (WordEditor-State + Props +
   Auto-Ausblendung) statt lokalem `useState` mit manuellem Schließen-Button.
5. **`disabled` ist kein neues Muster** — der Ausschneiden-Button nutzt es bereits
   (`Toolbar.tsx:147/153`); Klassen wörtlich übernehmen.
6. **Icon: SVG** (Hausmuster `ScissorsIcon`) statt Unicode-Pfeil, gemäß Anforderung # 8.
7. **Zeilennummern aktualisiert** auf den tatsächlichen Ist-Stand (schema `tableNodes`
   154; Reader `colwidth: null` 315/350; `insertTable` 92–102; `tableToDocx` 158;
   `run()` 28–31; Keymap 85–107; Toolbar-Tabellenbutton 277–289).
8. **Auto-Ausblendung nutzt jetzt den vorhandenen Hook, kein dupliziertes `useEffect`
   (neu in dieser Prüfrunde gefunden).** `WordEditor.tsx` hat die 4-Sekunden-Ausblendung
   seit der letzten Fassung in einen wiederverwendbaren Hook
   `useAutoDismiss(value, setValue, ms = 4000)` (Zeile 57–63) ausgelagert, der für
   `cutError` in Zeile 74 aufgerufen wird. Der Plan (4.3/6.3, Punkt 3) baut die
   `rowError`-Ausblendung deshalb per zusätzlichem `useAutoDismiss(rowError, setRowError)`
   statt — wie zuvor beschrieben — per eigenem, inline duplizierten Timeout-`useEffect`.
   Weil dieser Helper die Datei um ~9 Zeilen wachsen ließ, wurden alle
   `WordEditor.tsx`-Zeilenverweise neu synchronisiert: `cutError`-State 71 (vorher 58),
   `history()` 84 (76), Keymap-Objekt 85–107 (77–99), `Mod-c/x/v`-Kommentar 86–92 (78–84),
   `'Shift-Enter'` 97 (89), `'Shift-Delete'` 106 (98), `keymap(baseKeymap)` 108 (100),
   `columnResizing()/tableEditing()` 109–110 (101–102), natives Kontextmenü 117–121
   (109–113), `dispatchTransaction` 125 (117/123), Toolbar-Render 170 (162).
9. **Entwickler-Zweitprüfung (2026-07-05, neu in dieser Prüfrunde):** Alle Zeilen-/
   Abschnittsangaben dieses Dokuments wurden erneut gegen den (inzwischen
   Git-versionierten) Ist-Code nachgezählt — keine Abweichung, kein Zeilen-Drift seit
   2026-07-04. Zusätzlich wurde die zuvor nur aus dem Quelltext abgeleitete Kernarithmetik
   (`insertRowOnTabAtTableEnd`, rowspan-Verlängerung, mehrzeilige `CellSelection`,
   verschachtelte Tabellen) mit einem Wegwerf-Testskript gegen die echte, installierte
   `prosemirror-tables@1.8.5` und `wordSchema` tatsächlich ausgeführt (nicht nur gelesen) —
   siehe neuer Abschnitt 2.1. Ergebnis: **keine Korrektur nötig**, alle geprüften Fälle
   verhalten sich exakt wie in Abschnitt 2/6.1 angenommen. Keine Zeile Produktivcode wurde
   in dieser Prüfrunde geändert; die Wegwerf-Tests wurden nach Gebrauch wieder gelöscht
   (`git status` zeigt keine neuen Dateien unter `src/formats/shared/editor/__tests__/`).
