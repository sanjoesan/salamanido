# Umsetzungsplan: Feature „Zellen verbinden" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/zellen-verbinden-req.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand gegen jede Behauptung/jedes Verdachtsmoment der Anforderung
und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md` und `specs/ausrichtung-zentriert-code.md`. Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

Alle Befunde in Abschnitt 2 sind **nicht nur durch Lesen des Codes, sondern durch
tatsächliche Ausführung** verifiziert: dedizierte, danach wieder vollständig entfernte
Vitest-Reproduktionen (`writeDocx`→`readDocx`/`writeOdt`→`readOdt` mit **echten** Bytes,
keine Mocks; `EditorState` + `mergeCells`/`CellSelection`/`goToNextCell` aus
`prosemirror-tables@1.8.5`), plus JSZip-Inspektion der rohen `content.xml`/`document.xml`
der real vorhandenen Fixtures in `tests/fixtures/external/{docx,odt}/`. Nach jeder
Reproduktion wurde der Arbeitsbaum wieder exakt auf den Ausgangsstand zurückgesetzt —
dieser Plan selbst enthält **keine** der vorgeschlagenen Änderungen.

---

## 0. Verifikationsnotiz — was gegenüber dem vorigen Entwurf DIESER Datei korrigiert wurde

Der vorige Entwurf von `zellen-verbinden-code.md` war gegen einen **älteren** Codestand
geschrieben (dieselbe Falle, vor der `zellen-verbinden-req.md` Abschnitt 0 warnt) und an
zentralen Punkten überholt. Beim erneuten Abgleich gegen den **heutigen** Quellcode wurde
konkret korrigiert:

1. **Der ODT-Export ist bereits korrekt — der frühere „Fehler 2"/„Fehler 3" ist
   gegenstandslos.** `src/formats/odt/writer.ts` schreibt für **jede** verdeckte
   Gitterposition ein `<table:covered-table-cell/>` — horizontal für die von `colspan`
   überdeckten Spalten (**Zeile 160–162**) **und** vertikal über den `pending`-Tracker
   für die von `rowspan` überdeckten Folgezeilen (**Zeile 126, 135–139, 165–167**) — und
   berechnet `colCount` bereits **`colspan`-gewichtet** als Summe der ersten Zeile
   (**Zeile 115–116**), nicht als reine Zellenanzahl. Der vorige Entwurf zitierte für
   diese Funktion Code (`const colCount = rows[0]?.content?.length ?? 1`,
   `Math.random()`-Tabellenname), der im heutigen Stand **nicht mehr existiert**, und
   schlug als „Fix" ausgerechnet den bereits ausgelieferten Code vor. **Empirisch
   verifiziert:** ein 2×2-Merge exportiert nach ODT mit exakt 3 `<table:table-column/>`
   und 3 `<table:covered-table-cell/>` an den korrekten Positionen; ODT-Rundreise liefert
   wieder `colspan: 2, rowspan: 2`. **Konsequenz:** `odt/writer.ts` wird **nicht**
   geändert (Abschnitt 4.7). Es fehlen nur dedizierte Tests.

2. **Alle Zeilennummern des vorigen Entwurfs waren veraltet.** Sie sind unten vollständig
   gegen den aktuellen Stand neu geprüft (`schema.ts` Tabellen-Nodes: **154**, nicht 106;
   `Toolbar.tsx` Tabellen-Button: **277–289**, nicht 228–239; `docx/reader.ts`
   `parseTable`: **311–364**, nicht 210–256; `odt/writer.ts` `case 'table'`: **110–175**,
   nicht 86–111; `WordEditor.tsx` Plugins: **109–110**, nicht 81–82). Jede Angabe ist
   zusätzlich mit einem Symbolnamen versehen.

6. **3. Verifikationslauf (2026-07-05) — `WordEditor.tsx`-Nummern erneut nachgezogen und
   eine Faktenaussage korrigiert.** Der 2. Entwurf dieser Datei war selbst gegen einen
   inzwischen wieder um ~8 Zeilen gedrifteten `WordEditor.tsx` geschrieben (die Datei hat
   seither den `useAutoDismiss`-Helper samt `cutError`-Banner erhalten, **52–63/71/74/170**).
   Neu geprüft und synchronisiert: Plugin-Liste `columnResizing(), tableEditing()`
   **109–110** (vorher fälschlich 101–102), Keymap **85–107** (vorher 77–99),
   `CLICK_DRAG_THRESHOLD_PX = 3` **141** samt Maus-Handlern **143–155** (vorher 133–147),
   `dispatchTransaction`/`forceRender` **125–133/131** (vorher 117–124), Kontextmenü-Kommentar
   **117–121** (vorher 109–113); `reconcileSelectionOnClick` **43–50** war bereits korrekt.
   **Faktenkorrektur (Abschnitt 4.2):** die frühere Behauptung „die App hat keine Toast-/
   Fehlermeldungs-Infrastruktur" ist **falsch** — es existiert bereits ein transientes,
   selbst-quittierendes Fehlerbanner (`role="alert"`-`<span>` in `Toolbar.tsx` **157–161**,
   gespeist aus `cutError`/`setCutError` und `useAutoDismiss`, `WordEditor.tsx` **52–63/74**).
   Der `disabled`-Button bleibt trotzdem die bevorzugte Wahl (proaktiv statt reaktiv), aber
   die Begründung ist entsprechend berichtigt.

3. **Zwei Fehler bleiben gültig und sind hier erneut, gegen den heutigen Code,
   reproduziert** (Abschnitt 2): der DOCX-`rowspan`-Fehler bei kombiniertem Merge
   (vorher „Fehler 1") und der `CellSelection`-nach-Merge-Fehler (vorher „Fehler 4",
   Verdachtsmoment 5 der Anforderung). Beide sind echte, mit der **eigenen**
   Schreiber/Leser- bzw. `mergeCells`-Kette reproduzierbare Defekte.

4. **Faktenkorrektur an einer Fixture-Angabe:** `bug65649.docx` ist **0,45 MB** groß
   (nicht „12 MB" wie im vorigen Entwurf) und im Testcode bereits als
   `SKIP_SLOW_UNDER_JSDOM` geführt (`docx/__tests__/external-fixtures.test.ts` **Zeile
   42**) — jsdom-Langsamkeit, kein Produktbug.

5. **Icon-Entscheidung revidiert** (Abschnitt 5.2): der vorige Entwurf wollte den bereits
   für „Tabelle einfügen" benutzten Glyphen `⊞` ein zweites Mal verwenden — zwei Buttons
   mit identischem Basiszeichen widersprechen der Anforderung (Menüpunkt 4: „eindeutig
   erkennbar … bevorzugt eingebettetes SVG wie `ScissorsIcon`"). Stattdessen: ein
   **eigenes SVG** analog zu `ScissorsIcon`.

**Unverändert gültige Kernaussage** (deckt sich mit der Anforderung): Der Backlog-Status
„fehlt" trifft für die **Bedienoberfläche** vollständig zu (kein Button/Menü/Kürzel, keine
CSS-sichtbare Mehrzellen-Selektion), während der **Persistenz-Unterbau** (Lesen/Schreiben/
Rundreise bereits verbundener Zellen) für **beide** Formate vorhanden und getestet ist.
Die eigentliche Arbeit ist die UI **plus** die Behebung der zwei oben genannten, real
reproduzierten Defekte.

## 0.1 Vierter Verifikationslauf (heute) — unabhängige Nachstellung beider Fehler + zwei Faktenkorrekturen an Fixture-Zahlen

Dieser Durchlauf hat **nicht** dem Text des vorigen Entwurfs vertraut, sondern jede
zentrale Behauptung erneut selbst am Repository nachvollzogen: jede zitierte Zeile in
`schema.ts`, `WordEditor.tsx`, `commands.ts`, `Toolbar.tsx`, `docx/reader.ts`,
`docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts`, `index.css` sowie
`node_modules/prosemirror-tables/dist/index.js` wurde per `Read`/`Grep` gegengelesen —
**alle** stimmen exakt (inklusive der Bibliotheks-Zeilen 1548–1587, 1523–1541, 1594).
Zusätzlich wurden **beide** behaupteten Fehler mit eigenen, danach wieder vollständig
entfernten Vitest-Dateien gegen den echten, unveränderten Code nachgestellt (kein
Vertrauen auf die Beschreibung des vorigen Entwurfs):

1. **Fehler 1 (DOCX-Rundreise, kombinierter Merge) — erneut bestätigt.** Eingabe: 3×3-Gitter,
   linke obere 2×2-Fläche als eine Zelle `{ colspan: 2, rowspan: 2 }`, echter
   `writeDocx` → `readDocx`-Rundlauf. Ergebnis am heutigen Code: `rowspan === 3`
   (erwartet 2) — Assertion schlägt reproduzierbar fehl. Mit dem in Abschnitt 2.1/4.5
   vorgeschlagenen `extendedThisRow`-Set (probeweise in `docx/reader.ts` eingefügt,
   danach exakt zurückgesetzt — `git status` zeigt anschließend keine Änderung an der
   Datei) liefert derselbe Test `rowspan === 2`, und die komplette bestehende Suite
   `docx/__tests__/roundtrip.test.ts` (33 Tests) bleibt grün. Der Fix ist damit nicht nur
   plausibel, sondern **funktionsfähig verifiziert**.
2. **Fehler 2 (`CellSelection` nach Merge) — erneut bestätigt.** Echte `EditorState` mit
   `wordSchema`, zwei Zellen „AAA"/„BBB" in einer Zeile, `CellSelection.create` über
   beide, echtes `mergeCells` aus dem installierten `prosemirror-tables@1.8.5`. Ergebnis:
   Inhalt nach Merge korrekt `"AAA BBB"`, Selektionstyp nach Merge bestätigt
   `CellSelection`; ein anschließendes `state.tr.insertText('X')` (der Pfad, den
   ProseMirror für normales Tippen über einer Nicht-Text-Selektion nimmt) liefert
   Dokumenttext **`"X"`** — AAA und BBB sind vollständig weg. Mit dem in Abschnitt
   2.2/4.1 vorgeschlagenen Fix (Selektion **innerhalb derselben Transaktion**, vor dem
   `dispatch`, auf `TextSelection.near(...)` am Zellenende umsetzen) liefert derselbe
   Test nach `insertText('X')` **`"AAA BBBX"`** und der Selektionstyp ist korrekt
   `TextSelection`. Beide Prüfungen sind nach dem Fix grün.

Damit sind beide für dieses Feature kritischen Bugs nicht nur am Code plausibel gemacht,
sondern **ausgeführt und mit Vorher/Nachher-Ergebnis belegt** — dieselbe Vorgehensweise,
die der vorige Entwurf für sich in Anspruch nimmt, hier ein zweites Mal unabhängig
durchgeführt, mit identischem Ergebnis.

**Zwei Faktenkorrekturen an ODT-Fixture-Zahlen** (Ursache: eine naive
Teilstring-Suche nach `"covered-table-cell"` zählt bei einer **nicht** selbstschließenden
`<table:covered-table-cell>…</table:covered-table-cell>` sowohl den öffnenden als auch
den schließenden Tag mit — ein tatsächliches Auszählen der **vollständigen Tags** per
JSZip+Regex ergibt ein anderes Bild):

- **`tableCoveredContent.odt` hat tatsächlich 24, nicht 33 `<table:covered-table-cell>`-
  Elemente** (vorige Entwürfe dieser Datei und die Anforderungsdatei zitieren „33× covered“
  unverändert weiter — hier erstmals per vollständigem Tag-Parsing statt Teilstring-Zählung
  nachgezählt: 15 selbstschließende `<table:covered-table-cell/>` **plus** 9 **nicht**
  selbstschließende `<table:covered-table-cell><text:p .../></table:covered-table-cell>`
  mit je einem leeren, aber **stilisierten** Absatz darin — LibreOffice legt beim Verbinden
  offenbar manchmal einen leeren, formatierten Absatz in der verdeckten Zelle ab, statt sie
  komplett leer zu lassen. Eine naive Zählung von `(xml.match(/covered-table-cell/g) ??
  []).length` liefert `15 + 9*2 = 33` — genau die Zahl, die in Abschnitt 1/Testplan bisher
  unkritisch übernommen wurde. **Auswirkung auf Abschnitt 6.6:** Der bestehende Prüf-Idiom
  aus `odt/__tests__/roundtrip.test.ts` (`row.match(/<table:covered-table-cell\/>/g)`)
  matcht **nur** die selbstschließende Form und würde an dieser realen Datei **unterzählen**
  (15 statt 24) — für den eigenen Writer unschädlich (er erzeugt covered-table-cell
  **immer** selbstschließend, `odt/writer.ts:137/161`), aber **falsch**, sobald derselbe
  Regex-Test gegen eine reale Fremddatei wie `tableCoveredContent.odt` läuft. Der neue Test
  in 6.6 muss deshalb entweder beide Formen zählen (`/<table:covered-table-cell\b[^>]*\/?>/g`
  auf öffnende Tags, nicht `covered-table-cell` als Teilstring) oder ausdrücklich nur den
  eigenen Reader/Writer-Rundlauf prüfen (der ohnehin unabhängig von Selbstschluss-Form
  funktioniert, da `odt/reader.ts` nach exaktem Local-Name `table-cell` filtert und
  `covered-table-cell` — gleich in welcher Schreibweise — bereits automatisch überspringt,
  Abschnitt 3). Reine Zählung ohne dieses Detail ist ein stiller Test-Fallstrick, kein
  Produktbug.
- Der bestehende Reader ist von diesem Detail **nicht** betroffen: `childElements(rowEl,
  ODF_NAMESPACES.table, 'table-cell')` (`odt/reader.ts:304`) matcht ausschließlich den
  exakten Local-Name `table-cell` und überspringt jede `covered-table-cell`-Variante
  (selbstschließend oder nicht) automatisch — der leere Stil-Absatz aus der verdeckten
  Zelle geht beim Import so oder so nicht verloren, weil dort ohnehin nichts Sichtbares
  steht (alle 9 Instanzen enthalten nur `<text:p text:style-name="…"/>`, keinen Text).
  Kein Reader-Fix nötig, nur eine präzisere Testzahl.
- **Ergänzende Prüfung zu Abschnitt 6 Testfall 21 / DoD-Punkt 6** (betrifft die von der
  Anforderung zitierten, aber dort ungeprüft aus dem Dateinamen übernommenen Werte für
  `table-column-delete-with-merge.odt`/`-2-times.odt`): Die tatsächlichen Spannwerte in
  `table-column-delete-with-merge.odt` sind `colspan` **4 und 3** (kein `rowspan`
  überhaupt), in `-2-times.odt` `colspan` **2, 4 und 3** sowie **ein** `rowspan` mit Wert
  **2** — jeweils **mehrere unterschiedliche**, nicht ein einzelner Merge-Wert. Die
  `covered`-Zahlen **5** bzw. **7** aus Abschnitt 6.6 sind dagegen korrekt (per Tag-Zählung
  bestätigt). Für die Testimplementierung in 6.5/6.6 wichtig: Assertions auf diesen realen
  Dateien dürfen sich nicht auf einen einzigen erwarteten Spannwert verlassen, sondern
  müssen die tatsächliche Mehrfach-Merge-Struktur abbilden.

---

## 1. Verifikation der Ist-Stand-Tabelle aus `zellen-verbinden-req.md` Abschnitt 1

Die Ist-Stand-Tabelle der Anforderung ist mit dem heutigen Stand **durchgehend korrekt**
(sie wurde selbst am 2026-07-04 neu verifiziert). Ergänzende bzw. präzisierende Prüfung:

| Fundstelle (Symbol · aktuelle Zeile) | Ergebnis der Prüfung |
|---|---|
| `schema.ts` · `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (**154**) | Bestätigt. `colspan`/`rowspan`/`colwidth` kommen mit Defaults `1`/`1`/`null` aus `tableNodes()` selbst — **keine Schema-Änderung** für dieses Feature (Abschnitt 4.9). |
| `WordEditor.tsx` · Import (**8**), `columnResizing(), tableEditing()` (**109–110**) | Bestätigt. `tableEditing()` bringt sowohl den `CellSelection`-Unterbau (Maus-Drag erzeugt eine `CellSelection`) **als auch** die Decoration `drawCellSelection` mit, die jede markierte Zelle bereits mit der CSS-Klasse `selectedCell` versieht — es fehlt ausschließlich die CSS-Regel (Abschnitt 2.3/4.4). |
| `WordEditor.tsx` · `reconcileSelectionOnClick` (**43–50**), `CLICK_DRAG_THRESHOLD_PX = 3` (**141**, Maus-Handler **143–155**) | Bestätigt. Nach dem Merge-Fix (Abschnitt 4.1) endet ein Merge mit einem echten, kollabierten Text-Cursor, sodass dieser Mechanismus unverändert korrekt bleibt (Abschnitt 4.3). |
| `WordEditor.tsx` · `keymap({…})` (**85–107**) | Bestätigt: **kein** `Tab`/`goToNextCell`. Bestätigt zusätzlich, dass `prosemirror-commands`' `baseKeymap` `Tab` ebenfalls nicht bindet — Tab navigiert derzeit **nie** zwischen Zellen (Abschnitt 5.6, Menüpunkt 9). |
| `commands.ts` · `isInTable` re-exportiert (**3/6**), `insertTable` (**92–102**), `canCut` (**126–128**) | Bestätigt: **keine** Nutzung von `mergeCells`/`splitCell`/`CellSelection` irgendwo in `src/`. `canCut` + `disabled={!canCut(view.state)}` (`Toolbar.tsx` **147**) ist das vorhandene Muster für den `disabled`-Zustand, das der neue Button wiederverwendet (Abschnitt 4.2). |
| `Toolbar.tsx` · `ScissorsIcon` (**33–53**), `MarkButton` (**55–89**, `aria-label`+`title` **73–74**), `AlignButton` (**91–111**, nur `title` **96**), Tabellen-Button (**277–289**) | Bestätigt. `ScissorsIcon` ist der Präzedenzfall für ein **eingebettetes SVG** im Toolbar (Abschnitt 5.2). `MarkButton` (setzt `aria-label`) ist Positiv-, `AlignButton` (nur `title`) Negativvorbild für Menüpunkt 5. |
| `src/index.css` (88 Zeilen; Tabellenregeln **44–61**) | Bestätigt: **kein** `.selectedCell`, kein Import von `prosemirror-tables/style/tables.css`. Editierfläche ist bewusst dauerhaft hell (`.ProseMirror { color:#111827 }` **26**; `pageBackgroundStyle()` malt fest `white`, `pageLayout.ts:26`) — der Overlay-CSS braucht daher **keine** Dark-Mode-Variante (Abschnitt 4.4). |
| `docx/reader.ts` · `parseTable` (**311–364**), `anchors` (**317**), `isContinuation` (**328**), Inkrement (**332**), Anker-Zuweisung (**355–357**), `MAX_TABLE_NESTING_DEPTH=25` (**309**) | Grundstruktur bestätigt. **Aber:** genau hier steckt Fehler 1 — bei `colspan>1` wird **dieselbe** `cellNode` in mehrere `anchors[]`-Spalten eingetragen (**355–357**) und pro Fortsetzungs-`<w:tc>` einzeln hochgezählt (**332**). Siehe Abschnitt 2.1. |
| `docx/writer.ts` · `tableToDocx` (**158–201**), `colCount` colspan-gewichtet (**160**), Fortsetzungszelle (**172–176**), `gridSpan`/`vMerge restart` (**187–188**), `pending`-Setzen (**191–193**) | Bestätigt. Schreiber schreibt für eine Fortsetzungszeile **pro betroffener Gitterspalte** eine eigene `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>` **ohne** `gridSpan` — strukturell gültiges OOXML, aber Auslöser für Fehler 1 in Kombination mit dem Reader. |
| `odt/writer.ts` · `case 'table'` (**110–175**), `colCount` colspan-gewichtet (**115–116**), `covered` horizontal (**160–162**) + vertikal (**126/135–139/165–167**), `TableNameSequence` (**54–60**) | **Bereits vollständig korrekt** (siehe Abschnitt 0 Punkt 1 und Abschnitt 3). **Keine Änderung nötig.** |
| `odt/reader.ts` · `case 'table'` (**301–321**), exakter `table-cell`-Filter (**304**), `colspan`/`rowspan` aus Ankerzelle (**305–306**), `MAX_NESTING_DEPTH=25` (**218**) | Bestätigt: `covered-table-cell`-Geschwister werden durch den exakten Local-Name-Filter automatisch übersprungen; Spannen werden aus der Ankerzelle gelesen. **Real erprobt** gegen `tableCoveredContent.odt` (24× covered, siehe Korrektur Abschnitt 0.1) — Import ohne Fehler. Kein Reader-Fix nötig (Abschnitt 4.8). |
| Unit-/Roundtrip-Tests (`docx/__tests__/roundtrip.test.ts:261/279`, `odt/__tests__/roundtrip.test.ts`) | Bestätigt: je **getrennt** ein Test für reines `colspan` und reines `rowspan`. **Keiner** kombiniert `colspan>1` **und** `rowspan>1` auf **einer** Zelle — exakt die Lücke, die Fehler 1 verdeckt hielt. |

---

## 2. Gefundene, empirisch reproduzierte Fehler (priorisiert)

### 2.1 Fehler 1 (kritisch): Rechteckiger Merge (`colspan`+`rowspan` kombiniert) liefert nach DOCX-Rundreise einen zu hohen `rowspan`

**Datei:** `src/formats/docx/reader.ts`, `parseTable`, Fortsetzungszweig (**330–334**):

```ts
if (isContinuation) {
  const anchor = col < colCount ? anchors[col] : null
  if (anchor?.attrs) anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
  col += colspan
  continue
}
```

Bei einer Anker-Zelle mit `colspan > 1` trägt der reguläre Zweig (**355–357**)
**dieselbe** `cellNode`-Referenz in **mehrere** Gitterspalten von `anchors[]` ein.
`docx/writer.ts` (`tableToDocx`, **172–176**) schreibt für eine Fortsetzungszeile **pro
betroffener Gitterspalte eine eigene** `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`
(kein `gridSpan` auf der Fortsetzungszelle). Der Reader durchläuft diese Fortsetzungs-
`<w:tc>` **einzeln** und erhöht `rowspan` bei **jedem** um 1 — obwohl es **eine** logische
Fortsetzungszeile ist.

**Empirisch reproduziert** (dedizierte, danach entfernte Vitest-Datei, `writeDocx`→
`readDocx`, echte Bytes). Eingabe: 3×3-Gitter, linke obere 2×2-Fläche als eine Zelle
`{ colspan: 2, rowspan: 2 }` (Testfall 4). Das erzeugte `word/document.xml` enthielt für
die Fortsetzungszeile wörtlich **zwei** `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`
hintereinander:

```
Ausgabe nach Rundtrip: attrs.rowspan === 3   ✗ (erwartet: 2)
```

Zum Kontrast lief im selben Lauf ein reiner `rowspan: 2`-Fall (nur eine Gitterspalte,
also nur **eine** Fortsetzungszelle pro Zeile) **korrekt** durch (`rowspan === 2`) — genau
deshalb war der Fehler von den bestehenden Tests unentdeckt. Allgemein wächst der Fehler
mit der Breite: ein 3×3-Merge (`colspan: 3, rowspan: 3`) liefert `rowspan === 7`
(1 + 3 + 3), weil jede der zwei Fortsetzungszeilen drei Einzel-`<w:tc>` beisteuert.

**Auswirkung auf die Anforderung:** Testfall 4 (2×2), Testfall 5 (2×3, 3×3), die
DOCX-Rundreisen 5.3/5.4/5.7 und Grenzfall 3 schlagen mit dem aktuellen Code **still**
falsch fehl — keine Exception, sondern ein zu hoher `rowspan`, der beim Rendern zu viele
Folgezeilen „verschluckt" und beim Re-Export ein inkonsistentes Gitter erzeugen kann. Das
ist real gravierender als Verdachtsmoment 9 der Anforderung („nie mit echter Word-Datei
getestet") vermutet.

**Fix (Reader-seitig, autoritativ):** pro Zeile merken, welche Anker bereits hochgezählt
wurden, und **nur einmal pro Zeile** erhöhen — unabhängig davon, wie viele Fortsetzungs-
`<w:tc>` denselben Anker referenzieren:

```ts
const rows: JsonNode[] = rowEls.map((rowEl) => {
  const cells: JsonNode[] = []
  const extendedThisRow = new Set<JsonNode>()   // NEU
  let col = 0
  for (const tcEl of childElements(rowEl, OOXML_NAMESPACES.w, 'tc')) {
    // … (unverändert bis isContinuation)
    if (isContinuation) {
      const anchor = col < colCount ? anchors[col] : null
      if (anchor?.attrs && !extendedThisRow.has(anchor)) {   // GEÄNDERT
        anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
        extendedThisRow.add(anchor)
      }
      col += colspan
      continue
    }
    // … (unverändert)
  }
  return { type: 'table_row', content: cells }
})
```

**Verifiziert:** Mit exakt diesem Fix (probeweise angewendet, danach entfernt) liefert
derselbe 2×2-Reproduktionstest `rowspan === 2`, ein zusätzlich geprüfter ODT-2×2-Rundtrip
ebenfalls `rowspan === 2`, und **beide** bestehenden DOCX-Roundtrip-Tests (reines
`colspan`, reines `rowspan`) bleiben grün — der Fix ist robust gegen die bereits
abgedeckten Fälle (dort gibt es je Anker nur eine Gitterspalte, `extendedThisRow` ändert
nichts) und behebt den kombinierten Fall ohne Nebenwirkung. Dieser Fix wirkt **auch**
gegen echte Word-Dateien, die eine Fortsetzungszeile in mehrere `<w:tc>` aufteilen.

**Optionale Zusatzmaßnahme (Fidelity, nicht für Korrektheit nötig) — Abschnitt 4.6:**
`docx/writer.ts` so ergänzen, dass eine Fortsetzungszeile eines Merges mit `colspan > 1`
**eine** kombinierte `<w:tc><w:tcPr><w:gridSpan w:val="N"/><w:vMerge/></w:tcPr><w:p/></w:tc>`
schreibt (die Form, die echtes Word erzeugt), statt `N` einzelner 1-Spalten-Zellen. Der
Reader-Fix macht die Korrektheit davon **unabhängig**; die Writer-Änderung ist aufwendiger
(der `pending`-Tracker muss die Ankerbreite kennen) und rein kosmetisch/konventionell.

### 2.2 Fehler 2 (kritisch, bestätigt Verdachtsmoment 5): `CellSelection` nach dem Merge löscht bei sofortigem Tippen den gesamten zusammengeführten Inhalt

**Bibliothekscode:** `mergeCells` (`node_modules/prosemirror-tables/dist/index.js`) setzt
nach erfolgreichem Merge eine **`CellSelection`** auf die neue Zelle, deren Anker und Kopf
dieselbe Zelle sind — kein Text-Cursor. Tippt man in diesem Zustand ein Zeichen, ersetzt
`CellSelection.replaceWith` (über den normalen `replaceSelectionWith`-Pfad der Texteingabe)
den **kompletten** Inhalt der Zelle durch das eine getippte Zeichen.

**Empirisch reproduziert** (dedizierte, danach entfernte Vitest-Datei; echte `EditorState`,
Tabelle mit zwei Zellen „AAA"/„BBB", `CellSelection.create` über beide, `mergeCells`,
danach `insertText('X')`):

```
Nach Merge:                  Dokumenttext "AAA BBB"   (beide Inhalte erhalten, wie 3.4 fordert)
Selektionstyp nach Merge:    CellSelection
Nach insertText('X'):        Dokumenttext "X"         ✗ (AAA und BBB vollständig weg)
```

Das ist exakt Verdachtsmoment 5 / Testfall 6 der Anforderung („kritischster Einzeltest"),
hier als **echter** Bug belegt, nicht nur vermutet.

**Fix:** Die vom Merge-Befehl erzeugte `CellSelection` **innerhalb derselben Transaktion**,
vor dem `dispatch`, durch einen Text-Cursor am Ende des Zellinhalts ersetzen:

```ts
const cellPos = sel.$anchorCell.pos
const cellNode = tr.doc.nodeAt(cellPos)
if (cellNode) {
  const endPos = cellPos + cellNode.nodeSize - 1
  tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1))
}
```

**Verifiziert:** Mit diesem Fix liefert derselbe Reproduktionstest nach `insertText('X')`
den Dokumenttext **`"AAA BBBX"`** (Inhalt vollständig erhalten, `X` korrekt angehängt) und
der Selektionstyp ist danach **`TextSelection`**, keine `CellSelection` mehr. Die konkrete
Einbettung in `mergeSelectedCells` steht in Abschnitt 4.1. Diese Korrektur darf **nicht**
dem Bibliotheks-Default überlassen werden (DoD-Punkt 4).

### 2.3 Bestätigung (kein Fehler, nur fehlendes CSS): Mehrzellen-Selektions-Feedback ist bereits JS-seitig verdrahtet

`tableEditing()` (aktiv, `WordEditor.tsx:110`) liefert über seine `decorations`-Prop
`drawCellSelection`, das bei **jeder** `CellSelection` automatisch die Decoration-Klasse
`selectedCell` an jede markierte Zelle hängt — unabhängig davon, ob ein Merge-Befehl
existiert. Verdachtsmoment 3/Menüpunkt 3 der Anforderung ist also **kein** JS-/Plugin-,
sondern ausschließlich ein CSS-Problem (Abschnitt 4.4). Kein JS muss dafür geändert werden.

Zum `CLICK_DRAG_THRESHOLD_PX = 3`-Verdacht (Anforderung Verdachtsmoment 3, zweiter Teil):
Der Reconcile kollabiert die Selektion nur bei Bewegung **≤ 3 px** und nur auf eine
`TextSelection` **innerhalb desselben Textblocks** via `posAtCoords`. Ein echter
Cross-Zellen-Drag überschreitet 3 px praktisch immer; als Restrisiko bleibt ein extrem
kurzer Drag zwischen zwei sehr schmalen Nachbarzellen. Das ist **im E2E-Test** (Abschnitt
6.1 Punkt 1, realer Maus-Drag) zu prüfen, nicht am Code zu „reparieren", solange es nicht
auftritt — der Schwellenwert ist bewusst gesetzt (`WordEditor.tsx:138–141`).

---

## 3. Bereits korrekt — ausdrücklich bestätigt, nur Tests fehlen

Diese Punkte brauchen **keine** Code-Änderung; sie werden mit dediziertem Test abgesichert
und (wo nötig) als bewusste Produktentscheidung dokumentiert.

- **ODT-Export `covered-table-cell` + `colCount` (Verdachtsmoment 7):** vollständig
  vorhanden (Abschnitt 0 Punkt 1). Empirisch: 2×2-Merge → 3 Spalten, 3 covered an den
  korrekten Positionen. **Kein `odt/writer.ts`-Fix** (Abschnitt 4.7); nur Tests (6.4/6.6).
- **ODT-Import von `covered-table-cell` (Verdachtsmoment 8):** `odt/reader.ts` überspringt
  `covered-table-cell` korrekt und liest Spannen aus der Ankerzelle. Real erprobt gegen
  `tableCoveredContent.odt` (24× covered, Abschnitt 0.1), `mergedCells.odt` (colspan **ohne** covered,
  Grenzfall 13) und `table-column-delete-with-merge(-2-times).odt`. **Kein Reader-Fix**
  (Abschnitt 4.8); nur Tests (6.6).
- **Inhaltszusammenführung in Lesereihenfolge (3.4/Verdachtsmoment 6):** `mergeCells`
  hängt alle **nicht-leeren** Zellinhalte in Lesereihenfolge als weitere Absätze an die
  Ankerzelle an (leere Zellen via `isEmpty` übersprungen, verdeckte Positionen dedupliziert).
  Empirisch bestätigt (nach Merge „AAA BBB", beide erhalten). Als gewünschtes Produkt-
  verhalten **übernommen** (Abschnitt 5.1) — keine Code-Änderung.
- **`cellsOverlapRectangle`-Guard (3.6/Verdachtsmoment 4) und
  `$anchorCell.pos != $headCell.pos`-Guard (3.7):** `mergeCells` liefert bei nicht-
  rechteckiger/überlappender Auswahl bzw. bei nur einer Zelle bereits zuverlässig `false`,
  ohne Transaktion. Rein UI-seitig als `disabled` abzufragen (Abschnitt 4.2) — kein
  Bibliotheks-Fix.
- **Ein-Transaktions-Undo (3.12):** `mergeCells` baut eine einzige Transaktion → ein Klick
  = ein Undo-Schritt. Über Testfall 10 am laufenden Editor abgesichert (6.1 Punkt 11).
- **Erweitern eines bereits verbundenen Merges (3.8):** funktioniert über `TableMap`
  bereits für das größere Rechteck; nur Test (6.2), keine Sonderbehandlung.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (GEÄNDERT)

Imports erweitern (`TextSelection` als **Wert**; `mergeCells`/`CellSelection` zusätzlich zu
`isInTable`):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable, mergeCells, CellSelection } from 'prosemirror-tables'
import { wordSchema } from '../schema'
```

Neuer Befehl, direkt hinter `insertTable` (**92–102**):

```ts
/**
 * Führt die markierten Zellen (`CellSelection` mit ≥ 2 Zellen, rechteckig) über
 * `mergeCells` (prosemirror-tables) zu einer Zelle zusammen. Korrigiert dabei die von
 * `mergeCells` hinterlassene `CellSelection` auf einen Text-Cursor am Ende der neuen
 * Zelle — sonst würde das nächste getippte Zeichen den gesamten frisch zusammengeführten
 * Inhalt ersetzen (empirisch reproduziert, siehe zellen-verbinden-code.md Abschnitt 2.2).
 * Ohne `dispatch` (reine Verfügbarkeitsprüfung, z. B. für den `disabled`-Zustand des
 * Buttons) verhält sich der Befehl wie `mergeCells`: liefert true/false ohne Seiteneffekt.
 */
export function mergeSelectedCells(): Command {
  return (state, dispatch) =>
    mergeCells(
      state,
      dispatch &&
        ((tr) => {
          const sel = tr.selection
          if (sel instanceof CellSelection) {
            const cellPos = sel.$anchorCell.pos
            const cellNode = tr.doc.nodeAt(cellPos)
            if (cellNode) {
              const endPos = cellPos + cellNode.nodeSize - 1
              tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1))
            }
          }
          dispatch(tr)
        }),
    )
}
```

`mergeSelectedCells()(view.state)` (ohne zweites Argument) dient in `Toolbar.tsx` sowohl
der Ausführung (`run(view, mergeSelectedCells())`) als auch der reinen Verfügbarkeitsprüfung
für `disabled` — dasselbe idiomatische Muster wie `canCut`. `splitCell` (Backlog-Item
`zellen-teilen`, Menüpunkt 6) bleibt bewusst **unverdrahtet**.

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (GEÄNDERT)

Import ergänzen: `mergeSelectedCells` aus `./commands`.

Neues SVG-Icon neben `ScissorsIcon` (**33–53**) — eigenständiges, von `⊞`/`🖼`
unterscheidbares Symbol (zwei Zellen, die zu einer verschmelzen), erfüllt Menüpunkt 4:

```tsx
function MergeCellsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M12 4v6M12 14v6" />          {/* getrennte Zellgrenze oben/unten … */}
      <path d="M8 12h8M8 12l2-2M8 12l2 2" /> {/* … und ein Pfeil, der die Mitte „verbindet" */}
    </svg>
  )
}
```

Neue Button-Komponente, direkt vor `Toolbar` (Muster: `disabled` wie am Ausschneiden-Button
**147**, `aria-label`+`title` wie `MarkButton` **73–74**, nicht wie `AlignButton`):

```tsx
function MergeCellsButton({ view }: { view: EditorView }) {
  const canMerge = mergeSelectedCells()(view.state)   // reine Prüfung, kein dispatch
  return (
    <button
      type="button"
      title="Zellen verbinden"
      aria-label="Zellen verbinden"
      disabled={!canMerge}
      onMouseDown={(e) => { e.preventDefault(); run(view, mergeSelectedCells()) }}
      className={`px-2 py-1 rounded text-sm border border-transparent text-neutral-700 dark:text-neutral-300 ${
        canMerge ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                 : 'opacity-40 cursor-not-allowed'
      }`}
    >
      <MergeCellsIcon />
    </button>
  )
}
```

**Konsistenz-Hinweis (optional):** Der Ausschneiden-Button (**143–156**) drückt seinen
Deaktiviert-Zustand nicht über einen Klassen-Ternär, sondern über das native
`disabled`-Attribut **plus** die Tailwind-Utilities `disabled:opacity-40
disabled:cursor-not-allowed disabled:hover:bg-transparent` (**153**) aus. Für exakte
Konsistenz kann `MergeCellsButton` denselben Weg gehen (statisches `className` + `disabled:`-
Varianten) statt des oben gezeigten Ternärs; beide sind funktional gleichwertig, die
`disabled:`-Variante ist die im Projekt bereits etablierte.

Einbindung als neue Tabellen-Kontextgruppe direkt nach dem „⊞ Tabelle"-Button (**277–289**):

```tsx
<button /* ⊞ Tabelle, unverändert */>⊞ Tabelle</button>
<MergeCellsButton view={view} />
```

Damit sind Menüpunkt 1 (Button, verdrahtet über `mergeCells`), Menüpunkt 2 (alle drei
Deaktivierungsfälle — keine Tabelle / Einzelzelle / nicht-rechteckig — deckt der eine
`mergeSelectedCells()(view.state)`-Aufruf ab, weil `mergeCells` selbst alle drei prüft),
Menüpunkt 4 (eigenes SVG) und Menüpunkt 5 (`title`+`aria-label`) erfüllt. Ein deaktivierter
`<button>` löst nativ weder `click` noch `mousedown` aus — das erfüllt „kein stiller
Fehlschlag" (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4) **proaktiv**. Anders als der vorige
Entwurf behauptete, existiert im Übrigen **doch** eine transiente Fehlermeldungs-
Infrastruktur: das `cutError`-Banner (`role="alert"`-`<span>`, `Toolbar.tsx` **157–161**,
gespeist aus `setCutError` und selbst-quittierend über `useAutoDismiss`, `WordEditor.tsx`
**52–63/74**). Sie stünde als Klick-Zeit-Rückmeldung zur Verfügung; der `disabled`-Button
wird ihr dennoch bewusst vorgezogen, weil er die ungültige Aktion **proaktiv** verhindert
(kein Fehlklick möglich), statt sie **reaktiv** zu quittieren — das ist die schlankere und
für Menüpunkt 2/3.6 ausreichende Variante. Das Banner bleibt der dokumentierte Fallback,
falls doch eine Klick-Zeit-Meldung gewünscht wird.

**Re-Render-Hinweis:** `Toolbar` wird bei jeder Transaktion neu gerendert (die
`dispatchTransaction` in `WordEditor.tsx:125–133` ruft `forceRender` in **131**
**außerhalb** des `if (tr.docChanged)`, also auch bei reinen Selektions-Transaktionen), also wird
`canMerge` bei jeder Selektionsänderung neu ausgewertet — der `disabled`-Zustand folgt der
Auswahl live, ohne Zusatzverdrahtung (identisch zum bestehenden `canCut`-Button).

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (GEÄNDERT — nur falls Tab-Navigation in Scope, siehe 5.6)

Kein Eingriff in `reconcileSelectionOnClick` nötig (nach dem Merge-Fix aus 4.1 endet ein
Merge mit kollabiertem Text-Cursor). **Falls** die Tab-Navigation mitgenommen wird
(Entscheidung 5.6): Import (**8**) und Keymap (**85–107**) ergänzen:

```ts
import { tableEditing, columnResizing, goToNextCell } from 'prosemirror-tables'
// … in der ersten keymap({...}):
Tab: goToNextCell(1),
'Shift-Tab': goToNextCell(-1),
```

`goToNextCell` liefert außerhalb von Tabellen `false` (fällt auf Standard-Browserverhalten
zurück, keine Regression) und navigiert innerhalb über die `TableMap`, überspringt also
verdeckte Positionen automatisch korrekt — Menüpunkt 9/Testfall 11 wird damit erst
prüfbar. `goToNextCell` ist als Funktion aus `prosemirror-tables@1.8.5` exportiert
(verifiziert).

### 4.4 `src/index.css` (GEÄNDERT)

Ergänzung nach der `.ProseMirror th`-Regel (**58–61**). Bewusst **kein** Vollimport von
`prosemirror-tables/style/tables.css` (setzt zusätzlich `table-layout: fixed` und würde
das bestehende Spaltenbreiten-Verhalten der App ändern) — gezielt nur die für Testfall
1/Menüpunkt 3 fehlenden Regeln:

```css
.ProseMirror .tableWrapper { overflow-x: auto; }

/* Voraussetzung für das Overlay unten. td/th liegen sonst nicht `relative`.
   Alternativ (sauberer): `position: relative` in die bereits vorhandene
   `.ProseMirror td, .ProseMirror th`-Regel (**50–56**) aufnehmen, statt den
   Selektor hier ein zweites Mal zu deklarieren. */
.ProseMirror td,
.ProseMirror th { position: relative; }

/* Mehrzellen-Auswahl sichtbar machen. Die Klasse `selectedCell` setzt bereits
   tableEditing()'s drawCellSelection (Abschnitt 2.3) — hier fehlt nur das CSS. */
.ProseMirror .selectedCell:after {
  content: '';
  position: absolute;
  z-index: 2;
  inset: 0;
  background: rgba(120, 150, 255, 0.35);
  pointer-events: none;
}
```

Kein Dark-Mode-Gegenstück nötig: die Editierfläche ist dauerhaft hell (Abschnitt 1,
`pageBackgroundStyle()` malt fest `white`). **Bewusst nicht** mitbehoben:
`.column-resize-handle`/`.resize-cursor` (betrifft Spaltenbreiten-Anpassung, eigenes,
hier nicht angefordertes Verhalten — Scope-Grenze).

### 4.5 `src/formats/docx/reader.ts` (GEÄNDERT)

Fix aus Abschnitt 2.1 (`extendedThisRow`-Set im `rowEls.map`-Callback von `parseTable`,
Fortsetzungszweig **330–334**). Kein weiterer Eingriff.

### 4.6 `src/formats/docx/writer.ts` (OPTIONAL, empfohlen — siehe 2.1)

Kompaktere Fortsetzungszeilen-Kodierung für rechteckige Merges (`gridSpan` auf der
Fortsetzungszelle statt N Einzelzellen). **Nicht** für Korrektheit nötig (der Reader-Fix
in 4.5 genügt), nur für konventionelleres OOXML und strengere Fremd-Validierung. Erfordert,
dass der `pending`-Tracker (**163**) zusätzlich die Ankerbreite je Startspalte kennt; die
inneren, überdeckten Spalten werden übersprungen statt einzeln emittiert. Wenn umgesetzt,
gegen eine in echtem Word erzeugte, rechteckig gemergte Datei gegenprüfen (Abschnitt 5
Punkt 8 der Anforderung).

### 4.7 `src/formats/odt/writer.ts` (UNVERÄNDERT)

**Keine Änderung.** Der Writer schreibt `covered-table-cell` für beide Achsen und berechnet
`colCount` colspan-gewichtet bereits korrekt (Abschnitt 0 Punkt 1, empirisch verifiziert).
Der frühere Entwurf-„Fix" ist der bereits ausgelieferte Code.

### 4.8 `src/formats/odt/reader.ts` (UNVERÄNDERT)

**Keine Änderung** (Abschnitt 3). Nur neue Fixture-Tests (6.6).

### 4.9 `src/formats/shared/schema.ts` (UNVERÄNDERT)

`tableNodes()` liefert `colspan`/`rowspan`/`colwidth` bereits (**154**). `cellAttributes: {}`
bleibt bewusst leer (Zellhintergrund ist Gegenstand des separaten Backlog-Items
`tabelle-eigenschaften`, Grenzfall 5).

---

## 5. Offene Entscheidungen (explizit getroffen, nicht stillschweigend offengelassen)

### 5.1 Inhaltszusammenführung (3.4/Verdachtsmoment 6)
**Entscheidung:** Bibliotheks-Default übernehmen — alle nicht-leeren Zellinhalte in
Lesereihenfolge als weitere Absätze der Ankerzelle, Zeichenformatierung je Absatz erhalten.
Begründung: entspricht der Word/LibreOffice-Konvention; „nur Anker-Inhalt behalten" wäre
stiller Datenverlust. Keine Code-Änderung, nur Dokumentation + expliziter Test (6.2).

### 5.2 Icon (Menüpunkt 4)
**Entscheidung:** **eigenes eingebettetes SVG** (`MergeCellsIcon`, Abschnitt 4.2), **nicht**
Wiederverwendung des `⊞`-Glyphen. Begründung: Der `⊞`-Glyph ist bereits für „Tabelle
einfügen" belegt; zwei Buttons mit identischem Basiszeichen widersprechen Menüpunkt 4
(„eindeutig … von anderen Tabellen-Icons unterscheidbar"). `ScissorsIcon` belegt, dass
eingebettetes SVG im Toolbar bereits Präzedenz hat und zuverlässig rendert — die
Anforderung präferiert genau das. (Korrektur gegenüber dem vorigen Entwurf.)

### 5.3 Tastenkürzel (Menüpunkt 7)
**Entscheidung:** kein globales Kürzel für V1 (weder Word noch LibreOffice definieren
eines; ein erfundenes hätte keinen Wiedererkennungswert und Kollisionsrisiko). Toolbar-
Button genügt — dokumentiert, nicht offengelassen.

### 5.4 Kontextmenü (Menüpunkt 8)
**Entscheidung:** kein Rechtsklick-Menü für V1. Die App hat bewusst **kein** eigenes
Kontextmenü (damit das native Browser-Menü inkl. „Ausschneiden" erreichbar bleibt,
`WordEditor.tsx:117–121`). Ein Merge-Kontextmenü wäre eine editorweite Neuerung außerhalb
dieses Feature-Scopes.

### 5.5 Kopfzeile + Datenzelle verbinden (Grenzfall 12)
**Befund:** Weder `docx/reader.ts` noch `odt/reader.ts` erzeugen je einen `table_header`
(`grep -rn "table_header" src/` → 0). `mergeCells` behält den Typ der **Anker**-Zelle
(kein Typwechsel). **Entscheidung:** reader-seitige Kopfzeilenerkennung ist **nicht** Teil
dieses Plans (eigener Scope). Stattdessen ein handgebauter Unit-Test (6.2), der einen
`table_header`+`table_cell`-Knoten direkt im JSON aufbaut und den Typ-Erhalt der
Ankerzelle bestätigt; die fehlende Reader-Semantik wird als dokumentierter Folge-Punkt
vermerkt.

### 5.6 Tab-Navigation (Menüpunkt 9 / 3.10) — Scope-Entscheidung
**Befund:** Tab navigiert derzeit **gar nicht** zwischen Zellen (Abschnitt 1). Die
Anforderung führt Tab-nach-Merge selbst als **abhängigen**, erst nach Verdrahtung von
`goToNextCell` prüfbaren Punkt (Testfall 29). **Entscheidung/Empfehlung:** Die 2-zeilige
Verdrahtung (Abschnitt 4.3) mitnehmen, weil sie Testfall 11/29 erst ermöglicht und keinen
Nachteil hat (`goToNextCell` no-opt außerhalb von Tabellen). Streng genommen gehört sie zum
Nachbar-Item `tabelle-einfuegen`; falls der Scope eng gehalten werden soll, wird sie dorthin
zurückgestellt und Testfall 29 bleibt wie in der Anforderung als „abhängig" markiert. Diese
Wahl wird bewusst offen getroffen, nicht stillschweigend entschieden.

---

## 6. Testplan

Legende wie in der Anforderung: **[N]** neu, **[V]** vorhandener Pfad, hier für UI/reale
Datei zu bestätigen.

### 6.1 Neu: `tests/e2e/table-merge.spec.ts` (Playwright, echte Maus/Tastatur)
Vorlage: `tests/e2e/selection-regression.spec.ts` (existiert).
1. **[N]** 2×2 einfügen → realer `mouse.down/move/up`-Drag über zwei Nachbarzellen →
   `.ProseMirror .selectedCell` mit `count: 2` sichtbar; zusätzlich `toHaveCSS` auf den
   Overlay-Hintergrund (sichert den CSS-Fix 4.4; muss **vor** dem CSS-Fix scheitern).
2. **[N]** „Zellen verbinden" klicken → resultierende Zelle `td[colspan="2"]`, Text über
   volle Breite (Testfall 2).
3. **[N]** Vertikaler Merge über zwei Zeilen → `td[rowspan="2"]` (Testfall 3).
4. **[N]** 2×2-, 2×3-, 3×3-Rechteck → `colspan` **und** `rowspan` gleichzeitig (Testfall
   4/5; E2E-Regression für Fehler 1).
5. **[N]** Gemischter Inhalt (leer / ein Absatz / mehrere Absätze / fett+kursiv+farbig) →
   alle nicht-leeren Inhalte in Lesereihenfolge, Formatierung erhalten (Testfall 5).
6. **[N] Kritischster Test (Fehler 2):** direkt nach Merge ohne weiteren Klick `X` tippen →
   zusammengeführter Inhalt bleibt **vollständig** erhalten, `X` angehängt (Testfall 6;
   muss **vor** dem Fix 4.1 mit nur `"X"` scheitern).
7. **[N]** nicht-rechteckige/überlappende Auswahl → Button `disabled`, kein Klick möglich
   (Testfall 7).
8. **[N]** nur eine Zelle / reine Textauswahl → Button `disabled` (Testfall 8).
9. **[N]** bereits verbundene 2×1-Zelle + Nachbarzelle erneut verbinden → 2×2, keine
   Exception (Testfall 9).
10. **[N]** Strg+Z direkt nach Merge → **ein** Schritt stellt Originalzellen inkl. Inhalt
    wieder her; Strg+Y stellt Merge wieder her (Testfall 10).
11. **[N]** Rand der Tabelle (erste/letzte Zeile/Spalte) verbinden → identisch, danach
    editierbar (Testfall 11 / Grenzfall 1).
12. **[N]** gesamte Tabelle zu einer Zelle → editierbar, exportierbar (Grenzfall 2).
13. **[N]** verschachtelte Tabelle verbinden → kein Absturz, Inhalt lesbar (Grenzfall 6).
14. **[N] Selection-Sync-Regression (3.13/Testfall 14):** Merge → Klick außerhalb der
    Tabelle → Enter → weitertippen → kein Dokumentinhalt geht verloren.
15. **[N]** falls Tab verdrahtet (5.6): nach Merge Tab → Fokus zur nächsten **echten**
    Zelle, nicht in verdeckte Position (Testfall 29); sonst als „abhängig" dokumentiert.

### 6.2 Neu: `src/formats/shared/editor/__tests__/table-merge-commands.test.ts` (Vitest, echte `EditorState`)
- `mergeSelectedCells`: 2 horizontale → `colspan:2`; 2 vertikale → `rowspan:2`; 2×2 → beide;
  Einzelzelle → `false`, kein dispatch; nicht-rechteckig → `false`.
- **Regression für Fehler 2:** Merge zweier Textzellen, dann `insertText('X')` → Text
  enthält beide Originalinhalte **und** `X` (muss vor Fix 4.1 mit nur `"X"` scheitern).
- Selektion nach Merge ist `TextSelection`, keine `CellSelection` (direkter Test des Fixes).
- Kopfzeilen-Grenzfall (5.5): handgebauter `table_header`+`table_cell`, Merge → Node-Typ
  der Ankerzelle bleibt erhalten (beide Richtungen).
- Bereits verbundene Zelle + Nachbar erneut verbinden → größeres Rechteck, `colCount`
  bleibt über den Zyklus konsistent (Grenzfall 7).

### 6.3 Ergänzt: `src/formats/docx/__tests__/roundtrip.test.ts`
- **[N] Regression für Fehler 1:** `colspan:2, rowspan:2` auf **einer** Zelle → muss vor
  Fix 4.5 `rowspan:3` liefern, danach `rowspan:2`.
- **[N]** `colspan:3, rowspan:3` und `colspan:2, rowspan:3` (Testfall 5 auf Unit-Ebene).

### 6.4 Ergänzt: `src/formats/odt/__tests__/roundtrip.test.ts`
- **[N]** 2×2-Merge: zusätzlich zur Attribut-Prüfung nach Reimport die rohe `content.xml`
  per JSZip auf die exakte `<table:covered-table-cell/>`-Struktur (Regression, die die
  bereits korrekte Writer-Ausgabe **einfriert**, damit sie nicht später bricht).
- **[N]** reine `colspan`-Zelle in der **ersten** Zeile → Anzahl `<table:table-column>`
  korrekt (friert die korrekte `colCount`-Berechnung ein).
- **[N]** 2×3-/3×3-Rechteck.

### 6.5 Ergänzt/neu: DOCX-Fixtures
`src/formats/docx/__tests__/merge-fixtures.test.ts` (getrennt von
`external-fixtures.test.ts`, das nur „importiert ohne Absturz" prüft):
- **[V]** `bug57031.docx` (verifiziert: `gridSpan`=12, `vMerge`=8, 56 KB): importiertes
  JSON enthält ≥1 Zelle mit `colspan>1` **und** ≥1 mit `rowspan>1`; unverändert
  reexportieren → reimportieren → identische `colspan`/`rowspan` an denselben
  Textpositionen (Rundreise 5.1). Ergänzungskandidat `bug59058.docx` (nur horizontal,
  `gridSpan`=6).
- **[V]** `bug65649.docx` bleibt `SKIP_SLOW_UNDER_JSDOM`; als E2E-Performance-Stresstest
  (Muster `tests/e2e/large-document-import.spec.ts`).

### 6.6 Neu: `src/formats/odt/__tests__/merge-fixtures.test.ts`
- **[V]** `tableCoveredContent.odt` (**24**× `<table:covered-table-cell>` — per vollständigem
  Tag-Parsing gezählt, nicht per Teilstring-Suche; siehe Korrektur Abschnitt 0.1. **Wichtig
  für die Testimplementierung:** 15 davon sind selbstschließend (`<table:covered-table-cell/>`),
  9 sind es **nicht** (`<table:covered-table-cell><text:p .../></table:covered-table-cell>`,
  je ein leerer stilisierter Absatz) — ein Test, der nur die selbstschließende Form zählt
  (das im Projekt bereits etablierte Regex-Idiom aus `odt/__tests__/roundtrip.test.ts`,
  dort für den **eigenen**, immer selbstschließenden Writer-Output ausreichend), würde an
  dieser realen Fremddatei auf 15 statt 24 kommen. Entweder beide Tag-Formen zählen oder
  bewusst nur den Reader/Writer-Rundlauf prüfen (Zellzahl je Zeile, Inhalt), nicht die rohe
  `covered-table-cell`-Anzahl): erwartete Zellzahl je Zeile trotz vieler
  `covered-table-cell`, keine Spaltenverschiebung; Rundreise ohne Verlust.
- **[V]** `mergedCells.odt` (colspan **ohne** covered, Grenzfall 13): Import liefert
  `colspan:2`; Re-Export **ergänzt** `covered-table-cell` (Normalisierung) → keine
  Spaltenverschiebung nach der ersten Rundreise.
- **[V]** `table-column-delete-with-merge.odt` (covered=5, reale Spannwerte `colspan` **4
  und 3**, kein `rowspan`) / `-2-times.odt` (covered=7, reale Spannwerte `colspan` **2, 4
  und 3** sowie **ein** `rowspan` mit Wert **2** — mehrere unterschiedliche Merges, nicht
  ein einzelner Wert wie der Dateiname suggeriert; siehe Korrektur Abschnitt 0.1):
  Import ohne Absturz, unverändert reexportieren/reimportieren → kein zusätzlicher Verlust
  (Grenzfall 9, DoD-Punkt 9).

### 6.7 Zuordnung zu den Abnahmekriterien (Anforderung Abschnitt 8)
| DoD | Abdeckung |
|---|---|
| 1 Button + sichtbare Selektion, verdrahtet über `mergeCells` | 4.1–4.4 |
| 2 alle Testfälle aus Abschnitt 7 | 6.1–6.6 |
| 3 jedes Verdachtsmoment eingestuft | 1→behoben (4.x); 2→bestätigt, kein Fix (§1); 3→nur CSS (2.3/4.4); 4→UI-`disabled` (3/4.2); 5→**bestätigt+behoben** (2.2/4.1); 6→als Produktverhalten übernommen (5.1); 7→**bereits korrekt** (0/3/4.7); 8→bereits korrekt, Tests (3/6.6); 9→**bestätigt als Fehler 1, behoben** (2.1/4.5); 10→E2E neu (6.1); 11→Klarstellung (0) |
| 4 Verdachtsmoment 5 getestet + dokumentiert | 2.2/4.1/6.1(6)/6.2 |
| 5 E2E inkl. Selection-Sync-Regression | 6.1 Punkte 6, 14 |
| 6 Rundreise DOCX+ODT, Cross-Format, je reale Fixture, Spalte-löschen-Fixtures | 6.3–6.6 |
| 7 Inhaltszusammenführung bewusst bestätigt | 5.1 |
| 8 Tastenkürzel/Kontextmenü entschieden | 5.3/5.4 |
| 9 Wechselwirkung „Spalte/Zeile löschen kreuzt Merge" | 6.6 |

---

## 7. Reihenfolge der Umsetzung (härtestes/Kern zuerst)

1. **Kern & schärfster Bug zuerst:** `commands.ts` → `mergeSelectedCells` **inklusive**
   `CellSelection`→`TextSelection`-Fix (Fehler 2), zusammen mit
   `table-merge-commands.test.ts` (6.2). Das ist das inhaltliche Herz des Features und das
   gefährlichste UX-Risiko in einem Schritt.
2. **Zweiter Kern-Defekt:** `docx/reader.ts`-Fix (Fehler 1, 4.5) + die DOCX/ODT-Roundtrip-
   Regressionstests (6.3/6.4), die den Fehler dauerhaft festnageln und zugleich die bereits
   korrekte ODT-Ausgabe einfrieren.
3. **Bedienbarkeit herstellen:** `Toolbar.tsx` (Button + SVG, 4.2), `index.css` (4.4) und —
   je nach Entscheidung 5.6 — die Tab-Verdrahtung in `WordEditor.tsx` (4.3).
4. **Ende-zu-Ende absichern:** `tests/e2e/table-merge.spec.ts` (6.1), inkl. Testfall 6
   (Fehler-2-Regression) und Testfall 14 (Selection-Sync).
5. **Reale Fixtures:** `merge-fixtures.test.ts` DOCX/ODT (6.5/6.6) — setzt 1–2 voraus.
6. **Optional/Fidelity:** `docx/writer.ts`-Kompaktkodierung (4.6), nur falls gewünscht.
7. **Abschluss:** die in Abschnitt 5 getroffenen Entscheidungen (Icon, Kürzel, Kontextmenü,
   Inhaltszusammenführung, Kopfzeile, Tab-Scope) in `zellen-verbinden-req.md` nachtragen —
   dieser Plan ändert die Anforderungsdatei selbst nicht.

**Deploy-Hinweis (Projekt-Konvention):** nach **jedem** abgeschlossenen Schritt committen
und pushen und den GitHub-Actions-Lauf selbst auf grün prüfen, nicht erst am Phasenende.
