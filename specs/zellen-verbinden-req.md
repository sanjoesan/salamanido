# Anforderungen: „Zellen verbinden“ (Tabellen, horizontal & vertikal)

Status: **fehlt — gilt aktuell als nicht vertrauenswürdig, muss vollständig verifiziert
werden.** Diese Datei ist die verbindliche Anforderungsgrundlage für die Verifikation
des Features „Zellen verbinden“ aus `specs/FEATURE-BACKLOG.md` (Slug `zellen-verbinden`,
Abschnitt 3.2 „Tabellen“, Zeile 187, Priorität 1, Beschreibung: „Führt mehrere markierte
Zellen zu einer zusammen."). Sie ergänzt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6
(Tabellen) um die für dieses eine Feature nötige Detailtiefe: jedes Bedienelement, jedes
Detailverhalten, jeder Grenzfall und die Rundreise-Pflicht (DOCX **und** ODT).

Architektur-Grundprinzip bleibt wie im Hauptdokument: DOCX und ODT teilen sich einen
gemeinsamen internen Editor (ProseMirror-Schema, Tabellen-Nodes aus dem Paket
`prosemirror-tables`). „Zellen verbinden" ist untrennbar mit dem benachbarten,
ebenfalls fehlenden Backlog-Eintrag „Zellen teilen" (`zellen-teilen`, Priorität 2)
sowie mit „Zeile einfügen/löschen" und „Spalte einfügen/löschen" (beide Priorität 1,
Status `fehlt`) verzahnt — diese Datei behandelt ausschließlich das Verbinden, weist
aber an den relevanten Stellen explizit auf die Wechselwirkung hin.

---

## 1. Kontext & Ist-Zustand (Codeanalyse)

Der aktuelle Code wurde vor Erstellung dieser Anforderungen gesichtet, damit die
Verifikation zielgerichtet an den tatsächlich vorhandenen Mechanismen ansetzt:

| Ebene | Fundstelle | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts` (Zeile 106) | Tabellen-Nodes werden komplett von `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Paket `prosemirror-tables`) erzeugt. Dadurch existieren `colspan`, `rowspan`, `colwidth` als Standard-Attribute auf `table_cell`/`table_header` bereits **out of the box**. `cellAttributes: {}` bedeutet: **keine** eigenen Zusatzattribute (z. B. Zellhintergrund/-schattierung) — für „Zellen verbinden" selbst irrelevant, aber relevant für Grenzfall 5 (Abschnitt 4). |
| Editor-Plugins | `src/formats/shared/editor/WordEditor.tsx` (Zeile 8, 81–82) | `columnResizing()` und `tableEditing()` aus `prosemirror-tables` sind in die Plugin-Liste eingehängt. `tableEditing()` ist die Voraussetzung dafür, dass eine Maus-Ziehauswahl über mehrere Zellen überhaupt eine `CellSelection` erzeugt statt einer normalen Text-Selektion — der technische Unterbau für Mehrzellen-Auswahl ist also aktiv, auch ohne dass irgendeine Merge-Funktion ihn nutzt. |
| Fehlendes CSS für Zellauswahl | `src/index.css` (komplette Datei, 72 Zeilen) | Enthält **keinen** Import des von `prosemirror-tables` mitgelieferten Standard-Stylesheets (üblicherweise `prosemirror-tables/style/tables.css` mit `.selectedCell:after`-Overlay und `.column-resize-handle`). Es existieren nur eigene, minimale Regeln für `.ProseMirror table/td/th` (Zeile 44–61: `border-collapse`, feste `border: 1px solid`, `min-width: 2em`). **Konsequenz:** Selbst wenn eine `CellSelection` intern entsteht, ist sie aktuell vermutlich **visuell nicht erkennbar** — kein Rahmen, keine Hervorhebung der markierten Zellen. |
| Befehle | `src/formats/shared/editor/commands.ts` (vollständig gelesen, 108 Zeilen) | Enthält Befehle für Ausrichtung, Formatvorlagen, Listen, Bild-Einfügen, Tabelle-Einfügen (`insertTable`, Zeile 76–86) und Zeichenfarben — **keine einzige Zeile** importiert oder verwendet `mergeCells`/`splitCell`. Einzig `isInTable` wird aus `prosemirror-tables` re-exportiert (Zeile 3, 6) und nur für den Aktiv-Zustand des „Tabelle einfügen"-Buttons benutzt. |
| Bibliotheks-Fähigkeit ungenutzt | `node_modules/prosemirror-tables/dist/index.d.ts` (Export-Zeile) | Das Paket exportiert `mergeCells` und `splitCell` fix und fertig — die Merge-Logik selbst muss **nicht neu geschrieben** werden, sie liegt bereits vollständig in der Abhängigkeit vor und ist nur nirgends verdrahtet. Eine projektweite Suche nach `mergeCells`/`splitCell` in `src/` ergibt **null Treffer**. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx` (vollständig gelesen, 247 Zeilen; Tabellen-Button Zeile 228–239) | Die einzige tabellenbezogene Bedienmöglichkeit ist der Button „⊞ Tabelle" (`insertTable(2, 2)`, feste 2×2-Größe, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6/17 Punkt 6). Es gibt **keinen** Button, keinen Menüeintrag, kein Kontextmenü und kein Tastenkürzel für Zeile/Spalte einfügen/löschen **oder** Zellen verbinden/teilen — das gesamte Tabellen-Bearbeitungsmenü aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 373 fehlt geschlossen. |
| DOCX-Import | `src/formats/docx/reader.ts` (Funktion `parseTable`, Zeile 210–256) | Liest `<w:gridSpan>` (→ `colspan`) und die `<w:vMerge>`-Kette (→ `rowspan`) korrekt: Ein Array `anchors` verfolgt pro Gitterspalte, welche Zelle eine `vMerge`-Fortsetzung verlängert; `isContinuation` erkennt sowohl `w:val="continue"` als auch ein **wertloses** `<w:vMerge/>` (ECMA-376: fehlendes `val` bedeutet ebenfalls „continue") über die Bedingung `vMergeVal !== 'restart'` (Zeile 227). Schutz gegen absurd tief verschachtelte Tabellen via `MAX_TABLE_NESTING_DEPTH = 25` (Zeile 208, mit explizitem Kommentar zur `deep-table-cell.docx`-Fuzzing-Fixture). |
| DOCX-Export | `src/formats/docx/writer.ts` (Funktion `tableToDocx`, Zeile 128–171) | Schreibt `<w:gridSpan>` bei `colspan > 1` und `<w:vMerge w:val="restart"/>` bei `rowspan > 1` auf die Ankerzelle; ein `pending`-Array (Zeile 133, 161–163) erzeugt für jede weitere von `rowspan` betroffene Zeile eine eigene `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`-Fortsetzungszelle **ohne** `val`-Attribut (impliziert „continue", siehe Zeile 144). Schreiber und Leser sind also intern konsistent zueinander. |
| ODT-Import | `src/formats/odt/reader.ts` (Zeile 189–203, `childElements`-Hilfsfunktion Zeile 28–30) | Liest `table:number-columns-spanned`/`table:number-rows-spanned` direkt von jedem `<table:table-cell>`. Es gibt **keine** explizite Behandlung von `<table:covered-table-cell>` — der Filter `childElements(rowEl, ODF_NAMESPACES.table, 'table-cell')` matched aber ausschließlich den exakten Local-Name `table-cell`, wodurch `covered-table-cell`-Geschwisterelemente automatisch übersprungen werden, ohne eigens erkannt werden zu müssen. Das **dürfte** für wohlgeformte externe ODF-Dateien korrekt funktionieren, ist aber durch **keinen** Test mit einer echten Datei belegt (siehe Verdachtsmoment 8). |
| ODT-Export | `src/formats/odt/writer.ts` (Zeile 86–109) | Schreibt `table:number-columns-spanned`/`table:number-rows-spanned` ausschließlich auf die Ankerzelle; erzeugt an keiner Stelle im Code ein `<table:covered-table-cell/>`-Element für die durch den Merge verdeckten Positionen (projektweite Suche nach `covered-table-cell` in `src/` ergibt **null Treffer**, sowohl Reader als auch Writer). Laut ODF-1.2-Schema ist `table:covered-table-cell` für jede von `number-columns-spanned`/`number-rows-spanned` verdeckte Zellposition **pflichtig** — der aktuelle Export erzeugt damit vermutlich strukturell nicht konforme ODT-Dateien, sobald verbundene Zellen exportiert werden (siehe Verdachtsmoment 7). |
| Unit-/Roundtrip-Tests | `src/formats/docx/__tests__/roundtrip.test.ts` (Zeile 205–244), `src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 194–208) | Je ein Test „preserves merged cells (colspan)"/„… (rowspan)" (DOCX) bzw. „preserves merged cells (colspan/rowspan)" (ODT). Alle konstruieren das `table_cell`-JSON mit `colspan`/`rowspan` **direkt von Hand** und prüfen nur Writer→eigener-Reader — **nie** über eine tatsächliche Zellauswahl + Merge-Befehl, und **nie** gegen eine echte, extern erzeugte Datei mit `covered-table-cell`. |
| E2E-Tests (Browser) | `tests/e2e/*.spec.ts` (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`) | Volltextsuche nach `colspan`, `rowspan`, `merge`, `verbinden`, `Zelle` ergibt **einen** Treffer, und der ist keine Test-Assertion, sondern nur der Dateiname der Fixture `table-column-delete-with-merge-2-times.odt`. Es existiert **kein einziger** Playwright-Test, der Zellen im Browser auswählt und verbindet — diese Aktion existiert in der UI schlicht noch nicht. |
| Reale Testfixtures | `tests/fixtures/external/odt/` | Enthält bereits mehrere einschlägige, bisher ungenutzte Dateien: `mergedCells.odt` (Haupt-Kandidat), `tableCoveredContent.odt` (Name legt explizit `covered-table-cell`-Inhalt nahe), `table-column-delete-with-merge.odt` und `table-column-delete-with-merge-2-times.odt` (Wechselwirkung Merge + Spalte löschen), außerdem `crazyTable.odt`, `subTables3-nested.odt`, `subTables4.odt`, `BigTable.odt` für Grenzfälle. |
| Reale Testfixtures (DOCX) | `tests/fixtures/external/docx/` | **Keine** Datei trägt einen Namen, der eindeutig auf verbundene Zellen hindeutet (`TestTableCellAlign.docx`, `TestTableColumns.docx`, `table-alignment.docx`, `table-indent.docx`, `deep-table-cell.docx` sind die einzigen tabellenbezogenen Kandidaten) — muss vor der Verifikation geprüft werden, ob eine dieser Dateien tatsächlich `gridSpan`/`vMerge` enthält, oder ob eine zusätzliche externe Testdatei beschafft werden muss (siehe Abschnitt 5, Punkt 1). |
| Backlog-Status vs. Realität | `specs/FEATURE-BACKLOG.md` (Zeile 187, Status-Legende Zeile 33–39) | Backlog stuft „zellen-verbinden" pauschal als **fehlt** ein (Legende: „weder UI noch Datenmodell vorhanden"). Laut obiger Analyse ist das **nur zur Hälfte zutreffend**: Datenmodell samt Reader/Writer für DOCX **und** ODT existiert bereits und ist sogar per Unit-Test abgedeckt; **ausschließlich** die Bedienoberfläche (Button, sichtbare Mehrzellen-Selektion, Command-Verdrahtung) fehlt komplett. Für die Abnahme ist diese Unterscheidung wichtig: Es handelt sich nicht um eine Neuentwicklung von Null, sondern um „UI + reale Dateien nachrüsten" auf einem bereits vorhandenen, aber ungetesteten Unterbau. |

**Konsequenz:** Der Backlog-Status „fehlt" ist für die Bedienoberfläche zutreffend,
unterschätzt aber den bereits vorhandenen (wenn auch unverifizierten) Datenmodell- und
Bibliotheks-Unterbau. Abschnitt 6 dieser Datei listet die aus der Codeanalyse
abgeleiteten konkreten Verdachtsmomente — insbesondere den mutmaßlichen ODF-Schema-
Verstoß beim Export (fehlendes `table:covered-table-cell`) und die fehlende visuelle
Rückmeldung bei Mehrzellen-Selektion, ohne die eine Merge-Funktion praktisch unbedienbar
wäre.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Toolbar-Button „Zellen verbinden" | Formatierungsleiste, neue Tabellen-Kontextgruppe (neben „⊞ Tabelle") **oder** ausschließlich sichtbar/aktiv, wenn Cursor sich in einer Tabelle befindet (analog zum bestehenden `isInTable`-Muster des „⊞ Tabelle"-Buttons) | Muss **neu gebaut werden** — aktuell nicht vorhanden. Klick führt die aktuell ausgewählten Zellen (`CellSelection` mit ≥ 2 Zellen) zu einer einzigen Zelle zusammen. |
| 2 | Aktivierungs-/Deaktivierungslogik des Buttons | derselbe Button | **Muss** deaktiviert (oder zumindest wirkungslos mit sichtbarer Rückmeldung) sein, wenn (a) keine Tabelle fokussiert ist, (b) nur eine einzelne Zelle markiert ist, oder (c) die Auswahl keine rechteckige Zellfläche bildet (siehe `cellsOverlapRectangle`-Guard in `mergeCells`, Verdachtsmoment 3). Ein Klick, der aus einem dieser Gründe nichts bewirkt, verstößt sonst gegen das „kein stiller Fehlschlag"-Prinzip aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4. |
| 3 | Sichtbare Mehrzellen-Selektion | Tabellen-Editor-Oberfläche, alle Zellen | **Voraussetzung, die zuerst geschaffen werden muss:** Ein Ziehen der Maus über mehrere Zellen (oder Umschalt+Pfeiltasten) muss die betroffenen Zellen sichtbar hervorheben (Rahmen/Hintergrund), bevor „Verbinden" überhaupt sinnvoll bedienbar ist. Aktuell laut Codeanalyse (Abschnitt 1, „Fehlendes CSS für Zellauswahl") vermutlich **nicht** der Fall. |
| 4 | Icon/Beschriftung des Buttons | derselbe Button | Muss auf allen Zielsystemen eindeutig als „Zellen verbinden" erkennbar sein (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20, Icon-Rendering-Vorbehalt) — bevorzugt eingebettetes SVG-Icon statt Unicode-Symbol, konsistent mit den übrigen Toolbar-Icons dieser App. |
| 5 | Tooltip/`title` und `aria-label` | derselbe Button | Deutschsprachiger, klarer Text (z. B. „Zellen verbinden"), zusätzlich explizites `aria-label` (nicht nur `title`), analog zu `MarkButton` in `Toolbar.tsx` (Zeile 47), **nicht** analog zum inkonsistenten `AlignButton` (kein eigenes `aria-label`, siehe `ausrichtung-zentriert-req.md` Abschnitt 6 Punkt 7 desselben Projekts als bekanntes Gegenbeispiel). |
| 6 | Gegenstück „Zellen teilen" | eigener Button, direkt neben „Zellen verbinden" | **Nicht Bestandteil der Abnahme dieser Datei** (separates Backlog-Item `zellen-teilen`, Priorität 2), muss aber spätestens dann existieren, wenn Nutzerinnen eine fehlerhafte Verbindung rückgängig machen wollen, ohne auf Strg+Z angewiesen zu sein — wird hier nur als Randbedingung/Abgrenzung vermerkt. |
| 7 | Tastenkürzel | Editor, global während Fokus in einer Tabelle | Weder Word noch LibreOffice bieten hierfür standardmäßig ein globales Tastenkürzel an (anders als z. B. Strg+E für Zentrieren) — **muss explizit entschieden werden**, ob eines ergänzt wird oder der Menü-/Toolbar-Zugriff als ausreichend dokumentiert wird. Darf nicht stillschweigend offenbleiben. |
| 8 | Kontextmenü/Rechtsklick | — | Word/LibreOffice bieten „Zellen verbinden" standardmäßig im Tabellen-Rechtsklick-Kontextmenü an. Diese App hat aktuell **kein** Rechtsklick-Kontextmenü (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 361 ff., generelles Fehlen). Muss für V1 entweder bewusst zurückgestellt (Toolbar-Button genügt) oder explizit gefordert werden. |
| 9 | Zusammenspiel mit Tab-Navigation | Tabellen-Editor | Nach dem Verbinden muss die Tab-Taste (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6) die zusammengeführte Zelle als **eine** Tab-Stopp-Position behandeln, nicht als mehrere ehemalige Einzelzellen. |
| 10 | Zusammenspiel mit Zeile/Spalte einfügen/löschen | Tabellen-Editor (separate Backlog-Items `zeile-einfuegen`/`zeile-loeschen`/`spalte-einfuegen`/`spalte-loeschen`, alle ebenfalls Status `fehlt`) | Löschen einer Zeile/Spalte, die eine verbundene Zelle kreuzt, muss `colspan`/`rowspan` der betroffenen Zelle korrekt verkleinern (nicht auf einen ungültigen Wert stehen lassen, nicht abstürzen) — siehe exakt zu diesem Szenario passende Fixtures `table-column-delete-with-merge.odt`/`table-column-delete-with-merge-2-times.odt` in Abschnitt 5. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Horizontales Verbinden (zwei oder mehr Zellen in derselben Zeile)
- Zwei oder mehr **nebeneinanderliegende** Zellen derselben Zeile markieren (Maus-Ziehen
  über die Zellgrenze hinweg oder Umschalt+Pfeil-rechts, sobald eine `CellSelection`
  aktiv ist) → Klick auf „Zellen verbinden" → die Zellen werden zu einer einzigen Zelle
  mit `colspan = Summe der ursprünglichen Spaltenbreiten` zusammengeführt.
- Die neue Zelle beginnt an der Position der am weitesten links stehenden markierten
  Zelle (der „Anker", siehe `mergeCells`-Implementierung, `node_modules/prosemirror-tables/dist/index.js:1564–1566`).

### 3.2 Vertikales Verbinden (zwei oder mehr Zellen derselben Spalte über mehrere Zeilen)
- Analog zu 3.1, jedoch über Zeilengrenzen hinweg innerhalb einer Spalte → Ergebnis ist
  eine Zelle mit `rowspan = Anzahl der zusammengeführten Zeilen`.
- Nachfolgende Zeilen dürfen an dieser Spaltenposition **keine** eigene, weiterhin
  eingebbare Zelle mehr zeigen (die Position ist „verdeckt").

### 3.3 Rechteckiges Verbinden (mehrere Zeilen UND mehrere Spalten gleichzeitig)
- Eine Auswahl, die ein Rechteck aus z. B. 2 Zeilen × 2 Spalten (oder größer) umfasst →
  eine einzige resultierende Zelle mit sowohl `colspan > 1` **als auch** `rowspan > 1`.
- Muss mit mindestens 2×2, 2×3 und 3×3 getestet werden.

### 3.4 Inhaltszusammenführung beim Verbinden
- Laut Bibliotheksverhalten (`mergeCells`, `dist/index.js:1556–1582`) werden die
  Inhalte **aller** nicht-leeren markierten Zellen erhalten, nicht nur der Anker-Zelle:
  Sie werden in **Lesereihenfolge** (zeilenweise von oben nach unten, innerhalb einer
  Zeile von links nach rechts, mit Deduplizierung bereits verdeckter Positionen über
  `seen`) als zusätzliche Absätze an den Inhalt der Anker-Zelle angehängt. Vollständig
  leere Zellen tragen nichts bei (`isEmpty(cell)`-Prüfung).
- **Dies ist als Standardverhalten zu bestätigen und zu dokumentieren**, nicht nur
  stillschweigend aus der Bibliothek zu übernehmen — es ist die in Word/LibreOffice
  übliche Konvention, muss aber für dieses Produkt explizit als gewünscht freigegeben
  werden (Alternative wäre „nur Anker-Inhalt behalten, Rest verwerfen").
- Zeichenformatierung (fett, Farbe usw.) **innerhalb** jedes ursprünglichen Absatzes
  bleibt dabei erhalten, auch nach dem Zusammenführen mehrerer Zellen mit
  unterschiedlicher Formatierung.

### 3.5 Cursor-/Selektionszustand nach dem Verbinden
- Laut Bibliothek (`dist/index.js:1583`, `tr.setSelection(new CellSelection(...))`)
  steht nach einem erfolgreichen Merge eine **`CellSelection`** auf der neuen Zelle,
  **kein** Text-Cursor am Ende des zusammengeführten Inhalts.
- **Explizit zu verifizieren (siehe Verdachtsmoment 5):** Führt sofortiges Weitertippen
  direkt nach dem Merge dazu, dass der gesamte gerade zusammengeführte Zelleninhalt
  ersetzt wird (typisches ProseMirror-Verhalten beim Tippen über eine aktive
  Nicht-Text-Selektion)? Falls ja, muss die App die Selektion nach dem Merge aktiv auf
  einen Text-Cursor (z. B. Ende des letzten Absatzes der neuen Zelle) umsetzen — analog
  zur bereits bekannten Selection-Sync-Problematik aus `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 2.

### 3.6 Nicht-rechteckige oder überlappende Auswahl
- Eine Auswahl, die keine geschlossene Rechteckfläche bildet (z. B. weil sie eine
  bereits teilweise verbundene Zelle nur anschneidet, statt sie vollständig
  einzuschließen) → `mergeCells` liefert laut `cellsOverlapRectangle`-Prüfung
  (`dist/index.js:1552`) `false` zurück, es wird **keine** Transaktion ausgelöst.
- Die UI muss diesen Fall sichtbar behandeln (Button deaktiviert **oder** Fehlermeldung
  nach Klick) — ein Klick, der erkennbar nichts tut, ist laut
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4 explizit unzulässig.

### 3.7 Einzelzelle markiert (keine echte Mehrzellen-Selektion)
- `mergeCells` verlangt `sel.$anchorCell.pos != sel.$headCell.pos` (`dist/index.js:1550`)
  — bei nur einer markierten Zelle liefert der Befehl `false`. Der Button muss in diesem
  Zustand deaktiviert sein, nicht erst nach Klick scheitern.

### 3.8 Erweitern einer bereits verbundenen Zelle
- Eine bereits verbundene Zelle (z. B. 2×1) zusammen mit einer weiteren Nachbarzelle neu
  markieren und erneut „Verbinden" klicken → muss wie ein frischer Merge über das nun
  größere Rechteck funktionieren (z. B. Ergebnis 2×2), nicht abstürzen oder eine
  inkonsistente Gitterstruktur erzeugen.

### 3.9 Formatierung/Ausrichtung der zusammengeführten Zelle
- Absatzausrichtung, Zeichenformatierung usw. jedes einzelnen, ursprünglich
  eigenständigen Absatzes bleiben unverändert erhalten (siehe 3.4) — der Merge-Vorgang
  selbst verändert keine Zeichen- oder Absatzformatierung, nur die Zellstruktur.

### 3.10 Tab-Navigation nach dem Verbinden
- Siehe Menüpunkt 9 (Abschnitt 2): Tab/Umschalt+Tab dürfen nach dem Verbinden nicht mehr
  in die jetzt verdeckten ehemaligen Einzelzellen springen können.

### 3.11 Visuelle Darstellung im Editor
- Die verbundene Zelle muss sichtbar über die volle zusammengeführte Breite/Höhe
  gerendert werden (natives HTML-`colspan`/`rowspan`-Verhalten des `<td>`/`<th>`, siehe
  `schema.ts` `toDOM` der `tableNodes`-Zellen) — ungetestet, ob das bestehende, sehr
  einfache CSS (`src/index.css` Zeile 50–56: feste `min-width: 2em`, `border`) mit
  großen verbundenen Zellen visuell sauber zusammenspielt (z. B. keine doppelten
  Innenränder, kein optisches „Zerreißen" des Rahmens).

### 3.12 Undo/Redo
- Der Merge-Befehl baut **eine einzige** Transaktion auf (`const tr = state.tr` am
  Anfang, ein `dispatch(tr)` am Ende, `dist/index.js:1554–1584`) — im Unterschied zum
  bekannten Mehrfach-Transaktions-Verdacht bei `setAlign` über mehrere Absätze (siehe
  `ausrichtung-zentriert-req.md` Abschnitt 6 Punkt 4) ist hier **ein** Klick vermutlich
  auch **ein** Undo-Schritt. Muss dennoch mit einem expliziten Test bestätigt werden,
  nicht nur aus dem Quellcode angenommen.
- Strg+Z direkt nach dem Merge muss die ursprünglichen Einzelzellen mit exakt ihrem
  jeweiligen Originalinhalt wiederherstellen (kein Inhaltsverlust, keine Duplizierung).

### 3.13 Selection-Sync-Regressionsgefahr
- Analog zur in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 dokumentierten
  Selection-Sync-Regression: Toolbar-Aktion „Verbinden" auf eine Mehrzellen-Auswahl,
  danach Klick zur Neupositionierung außerhalb der Tabelle, danach Enter/weiter tippen
  → darf keinen Dokumentinhalt verschlucken. Tabellen gelten laut Hauptdokument bereits
  als „Hauptverdachtsfall" für diesen Bug-Typ.

---

## 4. Grenzfälle

1. **Verbinden am Rand der Tabelle** (erste/letzte Zeile, erste/letzte Spalte) →
   funktioniert identisch zu Zellen in der Mitte, keine Sonderbehandlung nötig, aber
   explizit zu testen (Grenzfall für Cursor-Positionierung/Tab-Navigation danach).
2. **Verbinden der gesamten Tabelle zu einer einzigen Zelle** (Auswahl aller Zellen) →
   Ergebnis ist eine 1×1-„Tabelle" mit einer Zelle, die den gesamten ursprünglichen
   Inhalt in Lesereihenfolge enthält; muss weiterhin editierbar und exportierbar sein.
3. **Verbinden, das eine ganze Zeile oder Spalte vollständig „verdeckt"** (z. B. eine
   Zeile, die danach nur noch aus verdeckten Positionen einer vertikal verbundenen Zelle
   besteht) → Tabelle bleibt strukturell gültig, keine „Geister-Zeile" ohne jede eigene
   Zelle.
4. **Verbinden von Zellen mit gemischtem Inhalt** (leere Zelle + Zelle mit mehreren
   Absätzen + Zelle mit einem Bild + Zelle mit fett/kursiv/farbig formatiertem Text) →
   alles bleibt in der zusammengeführten Zelle erhalten, in der in 3.4 definierten
   Reihenfolge.
5. **Zellhintergrund/-schattierung existiert im Schema aktuell nicht**
   (`cellAttributes: {}` in `schema.ts` Zeile 106) — es gibt daher aktuell **keinen**
   Konflikt zwischen unterschiedlich formatierten Zellhintergründen beim Verbinden zu
   lösen. Muss dokumentiert werden, dass dies der aktuelle (bewusste) Stand ist; sobald
   das separate Backlog-Item `tabelle-eigenschaften` (Rahmen/Schattierung, Status
   `fehlt`) umgesetzt wird, ist dieser Grenzfall neu zu bewerten.
6. **Verbinden in einer verschachtelten Tabelle** (Tabelle innerhalb einer
   Tabellenzelle) → muss innerhalb der von `MAX_TABLE_NESTING_DEPTH = 25`
   (`docx/reader.ts` Zeile 208) erlaubten Tiefe funktionieren; mindestens kein Absturz,
   siehe bereits vorhandene Fixtures `subTables3-nested.odt`, `subTables4.odt`.
7. **Wiederholtes Verbinden/Teilen** (sobald „Zellen teilen" existiert) über mehrere
   Zyklen hinweg → `colspan`/`rowspan` dürfen nicht „vergessen" auf einem Zwischenwert
   > 1 hängen bleiben, die Gitterspaltenzahl (`colCount`) der Tabelle muss über alle
   Zyklen konsistent bleiben.
8. **Undo direkt nach dem Merge** → exakte Wiederherstellung der Einzelzellen mit ihrem
   jeweiligen Originalinhalt (siehe 3.12) — kein Inhaltsverlust, keine doppelten Absätze.
9. **Verbinden inklusive der allerersten oder allerletzten Zelle der Tabelle**
   (Ecke oben-links/unten-rechts) → weiterhin editierbar danach, kein
   Cursor-Positionierungsfehler (Analogiefall zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6
   Testfall 10 für „Tabelle einfügen").
10. **Reale Fremddatei: Spalte/Zeile löschen, die eine bereits verbundene Zelle
    kreuzt** — exakt das Szenario der vorhandenen Fixtures
    `tests/fixtures/external/odt/table-column-delete-with-merge.odt` und
    `table-column-delete-with-merge-2-times.odt` (Name legt nahe: Spalte wird zweimal
    hintereinander gelöscht). `colspan`/`rowspan` der betroffenen Zelle müssen sich
    korrekt anpassen, keine korrupte Gitterstruktur, kein Datenverlust des noch
    sichtbaren Inhalts.
11. **Sehr große verbundene Fläche** (z. B. gesamte 10×10-Tabelle aus `BigTable.odt` zu
    einer Zelle verbunden) → UI bleibt bedienbar, keine spürbare Verzögerung.
12. **Mehrfach-Absatz-Zellen verbinden** (jede beteiligte Zelle enthält bereits mehrere
    Absätze) → alle Absätze aller beteiligten Zellen bleiben einzeln erhalten, in der in
    3.4 festgelegten Reihenfolge, keine versehentliche Verschmelzung zweier Absätze zu
    einem.
13. **Kopfzeile (`table_header`/`<th>`) mit Datenzelle (`table_cell`/`<td>`) verbinden**
    — `mergeCells` behält laut Bibliothekscode den Node-Typ der **Anker-Zelle** bei
    (`tr.setNodeMarkup(mergedPos, null, {...})` ohne Typwechsel, `dist/index.js:1574`).
    Diese App erzeugt selbst aktuell keine `table_header`-Zellen (der „⊞ Tabelle"-Button
    füllt nur `table_cell`), das Szenario ist daher nur beim **Import** einer externen
    Datei mit echter Kopfzeile relevant und muss dort geprüft werden (kein stiller
    Typverlust der Kopfzeilen-Semantik).

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich A." Für „Zellen verbinden" bedeutet das
konkret:

1. **DOCX-Rundreise (Upload unverändert):** Eine reale, außerhalb dieser App erzeugte
   DOCX-Datei mit mindestens einer horizontal **und** einer vertikal verbundenen Zelle
   importieren. **Kein Fixture-Name im vorhandenen Korpus deutet eindeutig auf verbundene
   Zellen hin** (Kandidaten zur Prüfung: `TestTableCellAlign.docx`, `table-alignment.docx`,
   `TestTableColumns.docx`) — vor der Verifikation muss geprüft werden, ob eine dieser
   Dateien tatsächlich `<w:gridSpan>`/`<w:vMerge>` enthält, andernfalls ist eine
   zusätzliche externe Testdatei zu beschaffen (z. B. aus dem Apache-POI- oder
   python-docx-Testkorpus). Nach Upload **ohne jede Bearbeitung** sofort wieder
   exportieren → erneut importieren → Zellstruktur (Text **und** `colspan`/`rowspan`)
   ist inhaltlich identisch zum Ausgangszustand.
2. **ODT-Rundreise (Upload unverändert):** Reale ODT-Datei mit verbundenen Zellen
   importieren — Kandidat: `tests/fixtures/external/odt/mergedCells.odt` (ersatzweise
   `tableCoveredContent.odt`, `table-column-delete-with-merge.odt`,
   `table-column-delete-with-merge-2-times.odt`) → identische Prüfung wie Punkt 1.
3. **Rundreise nach eigener Bearbeitung (DOCX):** Neue Tabelle im Editor einfügen,
   mehrere Zellen per Toolbar-Button horizontal **und** in einer zweiten Tabelle
   vertikal verbinden → als DOCX exportieren → reimportieren → `colspan`/`rowspan` und
   exakter Textinhalt bleiben erhalten.
4. **Rundreise nach eigener Bearbeitung (ODT):** Dasselbe für ODT — **zusätzlich**
   muss die exportierte ODT-Datei tatsächlich `<table:covered-table-cell>`-Elemente an
   den verdeckten Positionen enthalten (siehe Verdachtsmoment 7); dies ist der
   entscheidende Punkt, an dem sich die aktuell vermutete ODF-Schema-Verletzung beim
   Export bestätigt oder widerlegt.
5. **Cross-Format-Rundreise DOCX → ODT:** DOCX mit horizontal **und** vertikal
   verbundenen Zellen importieren → als ODT exportieren → reimportieren → beide
   Merge-Arten bleiben erhalten.
6. **Cross-Format-Rundreise ODT → DOCX:** Umgekehrt ebenso.
7. **Doppelte Cross-Format-Rundreise (DOCX → ODT → DOCX):** Eine Tabelle mit sowohl
   horizontal als auch vertikal verbundenen Zellen **kombiniert** mit Fett/Farbe/
   mehreren Absätzen pro Zelle → kein kumulativer Verlust der Zellstruktur über zwei
   Konvertierungen hinweg.
8. **Validierung gegen unabhängigen Parser:** Der exportierte `<w:gridSpan>`/
   `<w:vMerge>` (DOCX) bzw. `table:number-columns-spanned`/`table:number-rows-spanned`
   **plus** `table:covered-table-cell` (ODT) muss zusätzlich gegen eine vom eigenen
   Reader unabhängige Prüfung bestätigt werden (z. B. python-docx/odfpy-Äquivalent oder
   echtes Öffnen in Word/LibreOffice) — insbesondere für ODT, da hier laut
   Verdachtsmoment 7 die größte Wahrscheinlichkeit einer strukturellen Nichtkonformität
   besteht, die sich mit dem eigenen Reader allein **nicht** aufdecken ließe (Schreib-
   und Lesefehler könnten sich sonst gegenseitig „unsichtbar" ausgleichen, siehe
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
9. **Merge in einer verschachtelten Tabelle:** Rundreise DOCX/ODT — mindestens kein
   Datenverlust/Absturz, auch wenn die verschachtelte Struktur laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 allgemein als Risikofall gilt.
10. **E2E-Rundreise über echte Toolbar-Bedienung** (sobald der Button existiert):
    Playwright-Test, der Zellen per echtem Maus-Drag im Browser auswählt (nicht nur
    programmatisch die Selektion setzt), auf „Zellen verbinden" klickt, exportiert,
    reimportiert und prüft, dass die Tabellenstruktur im Editor sichtbar identisch ist
    — **muss neu ergänzt werden**, aktuell existiert kein einziger derartiger Test
    (siehe Abschnitt 1, Zeile „E2E-Tests").
11. **Spalte löschen, die eine verbundene Zelle kreuzt, danach exportieren/
    reimportieren:** Reale Fixture `table-column-delete-with-merge-2-times.odt` direkt
    verwenden, um zu prüfen, dass die im Dateinamen implizierte Zweifach-Operation nach
    dem Import korrekt abgebildet ist und eine anschließende Rundreise keinen weiteren
    Verlust erzeugt.

---

## 6. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Diese Liste benennt konkrete, aus dem Quellcode (App-Code **und** die verwendete
`prosemirror-tables`-Bibliothek) abgeleitete Verdachtspunkte, die die QA-Verifikation
**gezielt** widerlegen oder bestätigen muss:

1. **Komplettes Fehlen der Bedienoberfläche:** Weder Button noch Menüeintrag noch
   Kontextmenü noch Tastenkürzel existieren für Zellen verbinden/teilen (`Toolbar.tsx`,
   vollständig gelesen). Das ist der gewichtigste Einzelbefund — ohne UI ist das Feature
   unabhängig von der Qualität des Datenmodells schlicht nicht benutzbar.
2. **`mergeCells`/`splitCell` aus `prosemirror-tables` vollständig ungenutzt:** Das
   Paket liefert die Merge-/Split-Logik bereits fertig aus (`node_modules/prosemirror-tables/dist/index.d.ts`,
   Export-Zeile), eine projektweite Suche nach diesen Bezeichnern in `src/` ergibt
   **null Treffer**. Die Implementierung ist also überwiegend eine
   UI-/Verdrahtungsaufgabe, keine Neuentwicklung der Kernlogik — wichtig für die
   Aufwandseinschätzung, ändert aber nichts an der Verifikationspflicht.
3. **Keine visuelle Rückmeldung für Mehrzellen-Selektion:** `columnResizing()`/
   `tableEditing()` sind aktiv (`WordEditor.tsx` Zeile 81–82), aber das übliche
   `prosemirror-tables`-Stylesheet mit `.selectedCell:after`-Overlay wird nirgends
   importiert (`src/index.css`, komplette Datei geprüft). Eine Nutzerin, die versucht,
   mehrere Zellen zu markieren, bekäme aktuell vermutlich **keine sichtbare
   Bestätigung**, dass überhaupt eine Mehrzellen-Auswahl zustande gekommen ist — ein
   Blocker für die praktische Bedienbarkeit dieses Features, unabhängig vom
   Merge-Button selbst.
4. **Rechteck-Zwang ohne UI-Rückmeldung:** `cellsOverlapRectangle`-Guard
   (`dist/index.js:1552`) lässt `mergeCells` bei nicht-rechteckiger/überlappender
   Auswahl still `false` zurückgeben. Muss von der neuen UI aktiv abgefangen und
   sichtbar gemacht werden (siehe 3.6), sonst entsteht ein weiterer stiller Fehlschlag
   analog zu den bereits in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4 verlangten
   Prinzipien.
5. **`CellSelection` statt Text-Cursor nach dem Merge:** `dist/index.js:1583` setzt nach
   erfolgreichem Merge eine `CellSelection` auf die neue Zelle statt eines Text-Cursors.
   Sofortiges Weitertippen direkt nach dem Merge könnte dadurch den gesamten gerade
   zusammengeführten Inhalt ersetzen statt an ihn anzuhängen — ein enger Verwandter der
   bereits dokumentierten Selection-Sync-Regression aus `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 2. **Muss zwingend mit einem expliziten Test geprüft werden**, bevor dieses
   Feature als sicher gilt.
6. **Inhaltszusammenführungs-Reihenfolge nicht produktseitig bestätigt:** Die
   Bibliothek verkettet alle nicht-leeren Zellinhalte in Lesereihenfolge als zusätzliche
   Absätze der Ankerzelle (`dist/index.js:1556–1571`) — dieses Verhalten ist bisher
   nirgends im Produkt dokumentiert oder bewusst freigegeben worden und könnte ebenso
   gut als „nur Anker-Inhalt behalten" hätte umgesetzt werden. Muss als gewünschtes
   Verhalten explizit bestätigt werden (siehe 3.4).
7. **Vermuteter ODF-Schema-Verstoß beim Export:** `odt/writer.ts` (Zeile 86–109) schreibt
   für keine verdeckte Zellposition ein `<table:covered-table-cell>`-Element (Suche im
   gesamten `src/`-Baum ergibt null Treffer für diesen Bezeichner). Nach ODF-1.2-Schema
   ist dieses Element für jede von `number-columns-spanned`/`number-rows-spanned`
   verdeckte Position vorgeschrieben. Exportierte ODT-Dateien mit verbundenen Zellen
   sind daher **verdächtig, strukturell nicht ODF-konform** zu sein — ein potenziell
   gravierendes Rundreise-/Kompatibilitätsproblem (Öffnen in echtem LibreOffice/Word
   könnte fehlschlagen oder die Tabelle falsch darstellen), das vorrangig zu klären ist.
8. **ODT-Import von `covered-table-cell` plausibel, aber unverifiziert:** Der Reader
   (`odt/reader.ts` Zeile 189–203, 28–30) filtert Zeilen-Kinder exakt auf den Local-Name
   `table-cell`, wodurch `covered-table-cell`-Geschwister implizit übersprungen werden
   — vermutlich korrekt für wohlgeformte externe Dateien, aber durch **keinen** Test mit
   einer echten Datei belegt, obwohl passende Fixtures (`mergedCells.odt`,
   `tableCoveredContent.odt`) bereits im Repository vorhanden und bisher ungenutzt sind.
9. **DOCX-`vMerge`-Anker-Tracking nur gegen eigenen Schreiber getestet:** Die
   Anker-Logik in `docx/reader.ts` (Zeile 215–250), die eine Kette von
   `<w:vMerge w:val="continue">`-Zeilen wieder zu einem `rowspan`-Wert zusammenzählt,
   wird bisher ausschließlich mit dem eigenen, konsistenten Schreiber-Output geprüft
   (Roundtrip-Tests), nie mit einer real von Word erzeugten Datei, deren `vMerge`-Markup
   im Detail (z. B. Reihenfolge der `tcPr`-Kindelemente, zusätzliche Attribute) anders
   aussehen könnte.
10. **Kein E2E-Test vorhanden:** Volltextsuche über `tests/` nach `colspan`, `rowspan`,
    `merge`, `verbinden` ergibt außer einem Fixture-Dateinamen keinen Treffer. Die
    einzige Absicherung ist die Writer→eigener-Reader-Unit-Test-Kette in
    `roundtrip.test.ts` — vollständig ohne jede Interaktion mit einer tatsächlichen
    Zellauswahl im Browser.
11. **Backlog-Status „fehlt" trifft nur auf die UI zu, nicht auf das Datenmodell** (siehe
    Abschnitt 1, letzte Tabellenzeile) — bei der Abnahme darf nicht fälschlich davon
    ausgegangen werden, dass auch Reader/Writer bei null anfangen; deren bestehende
    Unit-Test-Abdeckung darf als Ausgangspunkt genutzt, muss aber um reale Dateien und
    E2E-Pfade ergänzt werden.

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

1. Zwei nebeneinanderliegende Zellen derselben Zeile markieren (Maus-Ziehen über die
   Zellgrenze) → sichtbare Mehrzellen-Hervorhebung erscheint (Voraussetzungstest für
   Verdachtsmoment 3, muss vor allen weiteren Tests bestehen).
2. „Zellen verbinden" auf diese Auswahl klicken → beide Zellen werden zu einer Zelle
   mit `colspan = 2`, Text sichtbar über die volle Breite.
3. Zwei Zellen derselben Spalte über zwei Zeilen hinweg markieren und verbinden →
   Ergebnis mit `rowspan = 2`.
4. 2×2-Rechteck markieren und verbinden → Ergebnis mit `colspan = 2` **und**
   `rowspan = 2` gleichzeitig.
5. 2×3- und 3×3-Rechteck ebenso.
6. Verbinden von Zellen mit unterschiedlichem Inhalt (leer, ein Absatz, mehrere Absätze,
   fett/kursiv/farbig) → alle nicht-leeren Inhalte erscheinen in der Ankerzelle, in
   Lesereihenfolge, mit erhaltener Zeichenformatierung (deckt 3.4/Verdachtsmoment 6 ab).
7. Direkt nach einem Merge ohne weiteren Klick zu tippen beginnen → prüfen, ob der
   gerade zusammengeführte Inhalt ersetzt wird oder der neue Text korrekt angehängt wird
   (deckt 3.5/Verdachtsmoment 5 ab — kritischster Einzeltest dieser Datei).
8. Eine nicht-rechteckige/überlappende Auswahl (z. B. teilweises Anschneiden einer
   bereits verbundenen Zelle) versuchen zu verbinden → Button ist deaktiviert **oder**
   es erscheint eine sichtbare Fehlermeldung, kein stiller No-Op (deckt 3.6/
   Verdachtsmoment 4 ab).
9. Nur eine einzelne Zelle markiert (keine echte Mehrzellen-Selektion) → Button
   deaktiviert (deckt 3.7 ab).
10. Bereits verbundene Zelle zusammen mit einer weiteren Nachbarzelle neu markieren und
    erneut verbinden → funktioniert wie ein frischer Merge über das größere Rechteck
    (deckt 3.8 ab).
11. Nach dem Verbinden Tab-Taste drücken → springt korrekt zur nächsten **echten**
    Zelle, nicht in eine verdeckte Position (deckt 3.10 ab).
12. Strg+Z direkt nach einem Merge → stellt die ursprünglichen Einzelzellen mit exakt
    ihrem jeweiligen Originalinhalt wieder her, in **einem** Schritt (deckt 3.12 ab).
13. Strg+Y (Redo) danach → Merge wird wiederhergestellt.
14. Verbinden am Rand der Tabelle (erste Zeile, letzte Spalte, erste Spalte, letzte
    Zeile) → funktioniert identisch, weiterhin editierbar danach (deckt Grenzfall 1/9
    ab).
15. Gesamte Tabelle zu einer Zelle verbinden → Ergebnis bleibt editierbar und
    exportierbar (deckt Grenzfall 2 ab).
16. Verbinden in einer verschachtelten Tabelle (Tabelle in Tabellenzelle) → kein
    Absturz, Inhalt bleibt lesbar (deckt Grenzfall 6 ab).
17. Sehr große verbundene Fläche (z. B. gesamte Fläche der `BigTable.odt`-Fixture nach
    Import) → UI bleibt reaktionsfähig (deckt Grenzfall 11 ab).
18. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2: Zellen verbinden →
    per Klick außerhalb der Tabelle neu positionieren → Enter → weiter tippen → kein
    Dokumentinhalt geht verloren (deckt 3.13 ab).
19. DOCX-Rundreise: neue Tabelle, Zellen horizontal **und** vertikal verbinden,
    exportieren, reimportieren → Struktur und Inhalt erhalten.
20. ODT-Rundreise: dasselbe für ODT — **zusätzlich** exportierte Datei auf Vorhandensein
    von `<table:covered-table-cell>` an verdeckten Positionen prüfen (deckt
    Verdachtsmoment 7 ab — zentraler Test dieser Datei).
21. Cross-Format-Rundreise DOCX → ODT mit horizontal **und** vertikal verbundenen
    Zellen → beide Merge-Arten bleiben erhalten.
22. Cross-Format-Rundreise ODT → DOCX ebenso.
23. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit kombiniertem horizontalem/
    vertikalem Merge, Fett, Farbe, mehreren Absätzen pro Zelle → kein kumulativer
    Verlust.
24. Upload einer realen externen DOCX-Datei mit verbundenen Zellen (zunächst
    `TestTableCellAlign.docx`/`table-alignment.docx`/`TestTableColumns.docx` auf
    tatsächliches Vorhandensein von `gridSpan`/`vMerge` prüfen, sonst neue Fixture
    beschaffen) → unverändert exportieren → reimportieren → Zellstruktur identisch.
25. Upload von `tests/fixtures/external/odt/mergedCells.odt` (unverändert) → Export →
    Reimport → Zellstruktur identisch zum Original.
26. Upload von `tests/fixtures/external/odt/tableCoveredContent.odt` → prüfen, ob
    `covered-table-cell`-Inhalte korrekt übersprungen/erkannt werden, keine
    Spaltenverschiebung im importierten Ergebnis (deckt Verdachtsmoment 8 ab).
27. Upload von `tests/fixtures/external/odt/table-column-delete-with-merge.odt` und
    `table-column-delete-with-merge-2-times.odt` → Import ohne Absturz, Inhalt lesbar,
    danach unverändert exportieren/reimportieren → kein zusätzlicher Verlust (deckt
    Grenzfall 10/Abschnitt 5 Punkt 11 ab).
28. Import einer realen Datei mit echter Kopfzeile (`table_header`), anschließendes
    Verbinden einer Kopfzeilen- mit einer Datenzelle → Node-Typ-Verhalten dokumentieren
    (deckt Grenzfall 13 ab).
29. Export nach DOCX validieren gegen einen vom eigenen Reader unabhängigen Parser
    (z. B. python-docx oder OOXML-Schemaprüfung) → `<w:gridSpan>`/`<w:vMerge>` korrekt
    vorhanden und schemakonform.
30. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema bzw.
    echtes Öffnen in LibreOffice → `table:number-columns-spanned`/
    `table:number-rows-spanned` **und** `table:covered-table-cell` korrekt vorhanden
    (zentraler Validierungstest für Verdachtsmoment 7).
31. E2E-Test über echte Browser-Bedienung (Playwright): Tabelle einfügen, Zellen per
    echtem Maus-Drag auswählen, „Zellen verbinden" klicken, Ergebnis visuell prüfen,
    exportieren, reimportieren — **muss neu ergänzt werden**, da aktuell nicht
    vorhanden (deckt Verdachtsmoment 10/Abschnitt 5 Punkt 10 ab).
32. Icon-Rendering-Test auf einem System ohne besondere Font-Unterstützung: Symbol für
    „Zellen verbinden" bleibt eindeutig erkennbar und von anderen Tabellen-Icons
    unterscheidbar.
33. Tastenkürzel-Test (falls eingeführt) bzw. Dokumentationstest (falls bewusst
    zurückgestellt) gemäß Menüpunkt 7.
34. Performance/Stabilität: sehr lange Zellauswahl über viele Zeilen einer großen
    Tabelle verbinden → UI bleibt reaktionsfähig, kein spürbares Einfrieren.

---

## 8. Abnahmekriterien (Definition of Done)

Das Feature „Zellen verbinden" gilt erst dann als „vorhanden" im Sinne von
vertrauenswürdig, wenn:

1. Ein tatsächlich klickbarer Toolbar-Button (inkl. sichtbarer Mehrzellen-Selektion als
   Voraussetzung, siehe Verdachtsmoment 3) existiert und über
   `mergeCells`/`prosemirror-tables` verdrahtet ist — nicht nur das darunterliegende
   Datenmodell.
2. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt wurden (nicht nur die bereits
   vorhandenen Writer→eigener-Reader-Unit-Tests) und deren Ergebnis dokumentiert ist.
3. Jedes Verdachtsmoment aus Abschnitt 6 explizit als „bestätigt und behoben",
   „bestätigt und bewusst als Grenzfall dokumentiert" oder „widerlegt" eingestuft
   wurde — keines bleibt unkommentiert offen. Insbesondere Verdachtsmoment 7 (fehlendes
   `table:covered-table-cell` beim ODT-Export) muss vorrangig geklärt werden, da es die
   grundsätzliche Dateikompatibilität betrifft, nicht nur Komfort.
4. Verdachtsmoment 5 (CellSelection statt Text-Cursor nach dem Merge) wurde konkret
   getestet und das Ergebnis — inklusive einer eventuell nötigen Korrektur — dokumentiert
   ist, bevor das Feature als sicher bedienbar gilt.
5. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) für den
   „Zellen verbinden"-Button dauerhaft in der Testsuite verankert ist (Testfall 31),
   inklusive des Selection-Sync-Regressionstests (Testfall 18).
6. Die Rundreise-Anforderung aus Abschnitt 5 für DOCX **und** ODT, inklusive
   Cross-Format, inklusive mindestens einer realen (nicht app-eigenen) Testdatei je
   Format (Testfall 24–25), inklusive der beiden „Spalte löschen kreuzt Merge"-Fixtures
   (Testfall 27) nachweislich erfüllt ist.
7. Die offene Entscheidung zu Tastenkürzel und Kontextmenü (Menüpunkte 7–8) getroffen
   und umgesetzt oder ausdrücklich begründet zurückgestellt wurde.
8. Das gewünschte Inhaltszusammenführungs-Verhalten (Abschnitt 3.4/Verdachtsmoment 6)
   bewusst als Produktentscheidung bestätigt ist — nicht nur zufällig aus dem
   Bibliotheks-Default übernommen.
9. Die Wechselwirkung mit dem separaten Feature „Zellen teilen" sowie mit
   „Zeile/Spalte einfügen/löschen" (Menüpunkt 10, Grenzfall 10) mindestens für den Fall
   „Spalte/Zeile löschen kreuzt eine verbundene Zelle" nachweislich funktioniert, auch
   wenn diese Nachbar-Features selbst noch nicht vollständig abgenommen sind.
