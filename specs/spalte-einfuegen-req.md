# Feature „Spalte einfügen (links/rechts)" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe** — Backlog-Status ist „fehlt" und gilt aktuell als
**nicht vertrauenswürdig**. Diese Datei ersetzt keine Codeaussage, sondern definiert
verbindlich, was „fertig" für dieses Feature bedeutet. Bevor irgendein Status auf
„vorhanden" gesetzt wird, muss jeder Punkt unten durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein — siehe
Abschnitt 8 „Verifikationsauftrag".

Die Codeprüfung in Abschnitt 0 (durchgeführt direkt am aktuellen Quellstand vor dem
Schreiben dieser Datei) bestätigt: Der Backlog-Status „fehlt" trifft für „Spalte
einfügen" **zu** — es existiert **keine einzige** Codezeile in `src/`, die eine
Tabellenspalte gezielt einfügt (per Repository-Suche nach `addColumn`/`insertColumn`
bestätigt: null Treffer außerhalb von `node_modules`). **Achtung — Lehre aus einem
früheren Entwurf dieser Datei:** Ein vorheriger Durchlauf hat einen längst behobenen
ODT-Export-Fehler (`colCount` ohne `colspan`) als „verbindlichen Pflicht-Fix" geführt.
Dieser Fehler existiert **nicht mehr** (siehe Abschnitt 0, Zeile „ODT-Export" und
Abschnitt 6). Alle Angaben unten wurden gegen den **tatsächlichen** aktuellen Quelltext
mit exakten Fundstellen neu verifiziert, statt aus dem alten Entwurf übernommen zu
werden.

**Erneute kritische Prüfung am 2026-07-05:** Alle Fundstellen einer vorherigen Fassung
dieser Datei wurden gegenprobend nachvollzogen (jede zitierte Zeilennummer einzeln gegen
den aktuellen Quelltext geprüft, nicht nur übernommen) — sie waren **durchgehend
zutreffend**, keine wurde korrigiert. Zusätzlich neu recherchiert und ergänzt: das
tatsächliche Rendering-Verhalten sehr breiter Tabellen (vormals als offene
Design-Entscheidung geführter Grenzfall 4.7, jetzt mit Quelltext-Beleg aus
`prosemirror-tables` **und** dem Seiten-Layout-Code beantwortet, siehe Abschnitt 0) sowie
ein direkt kopierbares Code-Vorbild für den Aktiv-/Deaktiviert-Zustand der neuen Buttons
(Abschnitt 2, Punkt 3 — der bereits vorhandene Ausschneiden-Button).

Bezug zum Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt „3.2 Tabellen"):

| Slug | Titel | Status laut Backlog | Priorität | Teil dieser Spezifikation? |
|---|---|---|---|---|
| `spalte-einfuegen` | Spalte einfügen (links/rechts) | fehlt | 1 (essenziell) | **Ja — alleiniger Kernumfang dieser Datei** |
| `tabelle-einfuegen` | Tabelle einfügen | teilweise (feste 2×2-Größe) | 1 | Nein — eigener Backlog-Eintrag, hier nur als Ausgangspunkt relevant (Abschnitt 3.10) |
| `zeile-einfuegen` | Zeile einfügen (oberhalb/unterhalb) | fehlt | 1 | Nein — eigene Anforderungsdatei (`zeile-einfuegen-req.md`), strukturell analog |
| `spalte-loeschen` | Spalte löschen | fehlt | 1 | Nein — eigene Anforderungsdatei (`spalte-loeschen-req.md`), siehe Abschnitt 7 |
| `zellen-verbinden` | Zellen verbinden | fehlt | 1 | Nein — eigener Backlog-Eintrag |
| `zellen-teilen` | Zellen teilen | fehlt | 2 | Nein — eigener Backlog-Eintrag |
| `tabelle-loeschen` | Tabelle löschen | fehlt | 1 | Nein — eigener Backlog-Eintrag |

Die Aufgabenbeschreibung lautet wörtlich: „Fügt eine neue Tabellenspalte an gewählter
Position ein." Das deckt sich mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 („Spalte
einfügen (links/rechts), Spalte löschen") — dort als Teil der **„von der Nutzerin
explizit als nicht funktionsfähig gemeldeten, höchste Priorität"**-Gruppe geführt —
sowie Abschnitt 17, Zeile 20: „Tabellen-Kontextfunktionen (Zeile/Spalte einfügen/
löschen, verbinden/teilen) — fehlt komplett in der UI (nur Datenmodell-seitig über
Tests konstruiert) — **größte Einzellücke im gesamten Funktionsumfang**".

Architektur-Grundprinzip (wie in `FEATURE-SPEC-DOCX-ODT.md`): DOCX und ODT teilen sich
einen gemeinsamen internen Editor (`src/formats/shared/editor/`, ProseMirror-Schema in
`src/formats/shared/schema.ts` + Seitenansicht). „Spalte einfügen" muss deshalb
**unabhängig vom Ursprungsformat** funktionieren und die Rundreise-Fähigkeit
(Abschnitt 5) für **beide** Formate erhalten.

---

## 0. Code-Recherche (Referenz für die Verifikation, kein Ersatz für tatsächliches Testen)

Alle Fundstellen wurden am aktuellen Quellstand direkt geprüft. Zeilennummern sind eine
Momentaufnahme (der Code wächst); die **Symbolnamen** in Klammern sind der stabile
Anker, falls sich Zeilen verschieben.

| Ebene | Fundstelle | Befund |
|---|---|---|
| Schema | `src/formats/shared/schema.ts:2` (`import { tableNodes }`) und `:154` (`...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`) | Tabellen-Knoten (`table`, `table_row`, `table_cell`) kommen unverändert aus `prosemirror-tables`; `table_cell` besitzt dadurch die Standardattribute `colspan`, `rowspan`, `colwidth`. Das Datenmodell kann eine zusätzliche Spalte **ohne Schema-Änderung** abbilden. Es gibt **keinen** eigenen Header-Zell-Typ (kein `tableRole: 'header_cell'`) — die Header-Sonderpfade der Bibliotheksfunktion `addColumn` (`columnIsHeader`) greifen daher in dieser App nie. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx:277-289` (Tabellen-Button) | Es existiert genau **ein** Tabellen-Button („⊞ Tabelle"), der ausschließlich `insertTable(2, 2)` auslöst (`:284`, feste 2×2-Größe, separates Ticket `tabelle-einfuegen`). Der Button hat bereits `title` **und** `aria-label` (`:279-280`) und spiegelt `isInTable(view.state)` in `aria-pressed` (`:281`). **Kein** Button, **kein** Menüeintrag für „Spalte links/rechts einfügen" ist vorhanden. |
| Toolbar-Ausführungsmuster | `src/formats/shared/editor/Toolbar.tsx:28-31` (`run(view, command)`) und das `onMouseDown`+`e.preventDefault()`-Muster aller Buttons (z. B. `:282-285`) | `run()` ruft `command(view.state, view.dispatch, view)` und danach `view.focus()` — es **wertet den Rückgabewert des Commands nicht aus**. Ein „nicht möglich"-Zustand muss deshalb über `disabled`/`aria-pressed` am Button ausgedrückt werden, nicht aus dem Command-Ergebnis (siehe Abschnitt 2). Alle Toolbar-Buttons feuern bewusst auf `onMouseDown` mit `e.preventDefault()`, **nicht** `onClick` — nur so bleibt die Editor-Selektion (insb. die Zell-/Cursorposition in der Tabelle) beim Klick erhalten. Die neuen Buttons **müssen** dieses Muster übernehmen, sonst geht die Zellselektion beim Klick verloren und „Spalte links/rechts" verlöre seinen Bezugspunkt. |
| Befehle | `src/formats/shared/editor/commands.ts:92-102` (`insertTable(rows, cols)`), `:3`/`:6` (`import { isInTable }` / `export { isInTable }`) | Einzige tabellenbezogene Logik der Anwendung ist `insertTable` (erzeugt nur **ganze** Tabellen, `:95` `table_cell.createAndFill()`) plus der Re-Export von `isInTable`. **Keine** Funktion `addColumn`/`insertColumn` o. Ä. in `commands.ts`. |
| Editor-Plugins | `src/formats/shared/editor/WordEditor.tsx:8` (`import { tableEditing, columnResizing }`), `:109` (`columnResizing()`), `:110` (`tableEditing()`) | `tableEditing()` aktiviert Zellauswahl (`CellSelection`, Shift+Klick/Ziehen über mehrere Zellen) und die eingebaute Tab/Umschalt+Tab-Navigation; `columnResizing()` aktiviert Ziehpunkte zur Breitenänderung bestehender Spalten. **Keines der beiden Plugins fügt selbst Spalten ein** — sie sind reine Interaktions-/Darstellungs-Infrastruktur, auf der „Spalte einfügen" aufsetzt. Die Keymap (`:85-107`) enthält **keinen** Eintrag für Spalten-Operationen. |
| Kein Kontextmenü (verbürgt, nicht nur „nicht gefunden") | `src/formats/shared/editor/WordEditor.tsx:117-121` (Kommentar) | Der Editor verzichtet **bewusst** auf ein eigenes Kontextmenü und setzt keinen `contextmenu`-Listener; das native Browser-Kontextmenü bleibt erreichbar. Repository-weite Suche nach `contextmenu`/`onContextMenu`: null Treffer. „Spalte einfügen" per Rechtsklick ist damit **kein** Anschluss an Bestehendes (siehe Abschnitt 2, Punkt 4). |
| Verfügbare, ungenutzte Bausteine | `package.json:29` (`"prosemirror-tables": "^1.8.5"`); `node_modules/prosemirror-tables/dist/index.cjs` | Die Bibliothek exportiert fertige, getestete Befehle `addColumnBefore` (dist `:1344`) und `addColumnAfter` (dist `:1357`), die intern `addColumn` (dist `:1321`) über `selectedRect` (dist `:1303`) aufrufen. **Keiner** davon wird in `src/` importiert (Repository-Suche bestätigt). Die Implementierung kann sich also größtenteils auf vorhandene Bibliotheksfunktionen stützen. Das exakte Verhalten dieser Funktionen (Quelltext-Inspektion, s. Abschnitt 3.4) ist Grundlage der Anforderungen unten. |
| DOCX-Export | `src/formats/docx/writer.ts:158` (`tableToDocx`), `:160` (`colCount`), `:161` (`<w:tblGrid>`), `:163-193` (`pending`) | `colCount` = **Summe der `colspan`-Werte der ersten Zeile** (`:160`, `reduce(... colspan ...)`). `<w:tblGrid>` bekommt entsprechend viele `<w:gridCol w:w="2000"/>` (`:161`, **fest 2000 Twips pro Spalte**, unabhängig vom `colwidth`-Attribut). Ein `pending`-Array (`:163-193`) erzeugt korrekt `<w:vMerge/>`-Fortsetzungszellen für vertikale Verbindungen. |
| ODT-Export — **kein Fehler mehr** | `src/formats/odt/writer.ts:110` (`case 'table'`), `:115-116` (`colCount`), `:126-167` (`pending` + `covered-table-cell`) | `colCount` = **`(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1`** — **identisch** zum DOCX-Writer, d. h. `colspan` wird korrekt eingerechnet. Der Writer erzeugt zusätzlich ODF-konforme `<table:covered-table-cell/>`-Platzhalter sowohl für horizontale (`colspan`, `:160-162`) als auch für vertikale (`rowspan`, `pending`, `:135-138`, `:164-167`) Verbindungen. **Der in einem früheren Entwurf dieser Datei behauptete Fehler `const colCount = rows[0]?.content?.length ?? 1` existiert nicht (mehr).** Er ist bereits behoben **und** durch Unit-Tests abgesichert (siehe „Bestehende Tests"). Abschnitt 6 ist daher **Regressionsschutz**, nicht Bugfix. |
| Spaltenbreiten-Rundreise (vorbestehend) | `src/formats/docx/reader.ts:350` und `src/formats/odt/reader.ts:315` | Beide Reader setzen `colwidth: null` beim Import; kein Writer liest `node.attrs.colwidth` beim Export (DOCX schreibt fix `w:w="2000"`, ODT fix `<table:table-column/>` ohne Breite). Spaltenbreiten werden **grundsätzlich nicht** zwischen Datei und Editor übertragen — vorbestehende Einschränkung, nicht durch dieses Feature verursacht, aber relevant für Abschnitt 3.6. |
| Rendering sehr breiter Tabellen (Grenzfall 4.7) — **kein offener Entscheidungspunkt, sondern bereits beobachtbares Verhalten** | `node_modules/prosemirror-tables/dist/index.cjs:2287` (`TableView`, `this.dom.className = "tableWrapper"`), `:2307-2338` (`updateColumnsOnResize`); `src/index.css:44-48` (`.ProseMirror table { width: 100%; ... }`); `src/formats/shared/editor/WordEditor.tsx:171-181` (Seiten-Div mit **fester** Inline-Breite `width: PAGE_WIDTH_PX`, `src/formats/shared/editor/pageLayout.ts:7`, kein `overflow: hidden`) innerhalb des äußeren scrollbaren Containers `WordEditor.tsx:171` (`overflow-auto`) | Weil `columnResizing()` aktiv ist (`WordEditor.tsx:109`), rendert **jede** Tabelle über eine eigene `TableView`-NodeView der Bibliothek, die ein `<colgroup>` erzeugt und `updateColumnsOnResize` aufruft. Da `colwidth` immer `null` ist (Zeile oben), ist `hasWidth` für jede Spalte falsch → `fixedWidth = false` → die Funktion setzt `table.style.width = ''` (die CSS-Regel `width: 100%` aus `src/index.css:46` greift) **und** `table.style.minWidth = (Spaltenzahl × 100)px` (`defaultCellMinWidth`, Default-Parameter von `columnResizing()`, hier nicht überschrieben). Die Seite selbst hat aber eine **feste** Pixelbreite (`PAGE_WIDTH_PX`, kein `overflow: hidden` auf dem Seiten-Div) — überschreitet `minWidth` die verfügbare Seiteninnenbreite (`PAGE_CONTENT_WIDTH_PX`, `pageLayout.ts:14`), **wächst die Tabelle über den rechten Seitenrand hinaus** (kein automatisches Schrumpfen der Spalten unter dieses Minimum), sichtbar als Überstand in den grauen Bereich außerhalb der simulierten Seite. Der äußere Container ist `overflow-auto` (`WordEditor.tsx:171`), macht den Überstand also horizontal scrollbar erreichbar — es geht **kein** Inhalt verloren, aber die Seiten-Illusion („echtes Blatt Papier") wird für sehr breite Tabellen sichtbar durchbrochen. Grenzfall 4.7 ist damit **keine offene Entscheidung mehr, sondern ein zu verifizierender/zu dokumentierender Ist-Zustand** (siehe Grenzfall 4.7 unten) — sofern das Verhalten in der Abnahme nicht gewünscht ist, ist es ein eigenständiges (vorbestehendes, nicht durch „Spalte einfügen" verursachtes) Ticket zur Seiten-/Tabellendarstellung, nicht Teil des Scopes dieser Datei. |
| ODT-Reader & `covered-table-cell` | `src/formats/odt/reader.ts:301-320` (`case 'table'`), `:304` (`childElements(rowEl, ..., 'table-cell')`), `:305-306` (`number-columns-spanned`/`number-rows-spanned`) | Der Reader liest `colspan`/`rowspan` direkt aus den Attributen der **echten** `<table:table-cell>`-Elemente und **überspringt** `<table:covered-table-cell/>` (er selektiert nur `table-cell`). Für vom eigenen Writer erzeugte Dateien ist das korrekt (die übersprungenen Positionen sind genau die von `rowspan`/`colspan` überdeckten). Für **reale Fremddateien** (LibreOffice) mit vertikalen Verbindungen ist zu **verifizieren**, dass diese Annahme trägt — siehe Abschnitt 6 (Verifikationspunkt, kein bestätigter Bug). Der DOCX-Reader nutzt hierfür einen robusteren `anchors`-Mechanismus samt Tiefenlimit `MAX_TABLE_NESTING_DEPTH = 25` (`docx/reader.ts:309`/`:340`); der ODT-Reader hat `MAX_NESTING_DEPTH = 25` (`odt/reader.ts:218`). Diese Asymmetrie ist zu dokumentieren. |
| Bestehende Tests | `src/formats/odt/__tests__/roundtrip.test.ts:275`/`:310`, `:298`; `src/formats/docx/__tests__/roundtrip.test.ts` (analog); `src/formats/shared/editor/__tests__/commands.test.ts` | Es gibt bereits Unit-Tests, die die **korrekte** ODT-Merge-Ausgabe prüfen — u. a. „emits ODF-compliant covered-table-cell placeholders for a horizontal (colspan) merge" mit expliziter Prüfung `<table:table-column/>`-Anzahl `== 2` (`:298`) und das rowspan-Pendant (`:310`). Diese Tests konstruieren Tabellen-JSON **direkt** und prüfen Schreiben/Lesen — **nicht** das Einfügen einer Spalte über echte Bedienung. `tests/e2e/*.spec.ts` (u. a. `selection-regression.spec.ts`, `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`) enthält **keinen** Treffer für „Spalte"/„column"/`CellSelection` — es gibt keinen E2E-Tabellenbearbeitungstest. |

**Konsequenz für die Bewertung:** Der Backlog-Status „fehlt" ist zutreffend (keine
UI-Anbindung, kein Command). Die Bibliotheksfunktionen `addColumnBefore`/
`addColumnAfter` sind vorhanden und funktional vielversprechend; die Export-Pfade beider
Formate inklusive Merge-Behandlung sind **bereits korrekt und getestet**. Die
eigentliche Arbeit ist **(a)** UI-Anbindung (zwei Buttons + Aktivierungszustand),
**(b)** Klärung der in Abschnitt 3.3 offenen Mehrfachauswahl-Semantik und
**(c)** Nachweis der Rundreise inklusive der ODT-Reader-Frage aus Abschnitt 6 — **nicht**
das Beheben eines Export-Bugs.

---

## 1. Ziel / Zusammenfassung des Soll-Zustands

Nutzer:innen können, während sich der Cursor (oder eine Zellauswahl) in einer Tabelle
befindet, über zwei Bedienelemente „Spalte links einfügen" und „Spalte rechts
einfügen" eine neue, leere Tabellenspalte unmittelbar links bzw. rechts der aktuellen
Zelle einfügen — für **alle** Zeilen der Tabelle gleichzeitig, unter korrekter
Berücksichtigung bestehender horizontal/vertikal verbundener Zellen (`colspan`/
`rowspan`). Die neue Spalte bleibt bei Export nach DOCX **und** ODT sowie bei jeder
Rundreise (Import → Export, Export → Re-Import, Cross-Format) vollständig erhalten,
inklusive aller unveränderten Nachbarzellen und -formatierungen.

Explizit **nicht** Gegenstand dieser Datei (separate Backlog-Einträge, siehe Tabelle
oben, jeweils eigene Anforderungsdatei — Details in Abschnitt 7):
`zeile-einfuegen`, `spalte-loeschen`, `zellen-verbinden`, `zellen-teilen`,
`tabelle-loeschen`, sowie die feste 2×2-Größe von `tabelle-einfuegen` selbst.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Spalte links einfügen" | Tabellen-Gruppe der Toolbar, direkt neben dem bestehenden „⊞ Tabelle"-Button (`Toolbar.tsx:277-289`) | **Fehlt komplett** | Neu zu bauen. Eigenes SVG-Icon (kein Unicode-/Emoji-Zeichen — Lehre aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20 zum Icon-Rendering; als Vorbild dient das bereits vorhandene `ScissorsIcon`-SVG in `Toolbar.tsx:33-53`, **nicht** die Emoji-/Unicode-Buttons „⊞"/„🖼"). Von Anfang an `title` **und** `aria-label` setzen (wie der Tabellen-Button `:279-280`; der `AlignButton` `:91-111` hat nur `title` — dieses Defizit **nicht** übernehmen). Auslösung per `onMouseDown`+`e.preventDefault()` (Muster aus `:282-285`), damit die Zellselektion beim Klick erhalten bleibt. Ruft `addColumnBefore(state, dispatch)` auf. |
| 2 | Toolbar-Button „Spalte rechts einfügen" | Direkt neben Punkt 1 | Fehlt komplett | Analog zu Punkt 1, eigenes, klar von „links" unterscheidbares Icon (z. B. Spiegelung/Pfeilrichtung), **nicht** nur Farbwechsel. Ruft `addColumnAfter(state, dispatch)` auf. |
| 3 | Aktiv-/Deaktiviert-Zustand beider Buttons | Toolbar | Fehlt (es gibt keine Buttons) | Beide Buttons sind **sichtbar, aber deaktiviert** (`disabled`, nicht nur optisch abgeblendet), wenn der Cursor sich nicht innerhalb einer Tabelle befindet (`isInTable(view.state)`, bereits aus `commands.ts:6` importierbar). Da `run()` (`Toolbar.tsx:28-31`) den Command-Rückgabewert nicht auswertet, **muss** dieser Zustand am Button hängen — kein stiller Fehlschlag bei Klick außerhalb einer Tabelle (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 4). **Konkretes, bereits im Code vorhandenes Vorbild — direkt kopierbares Muster, keine Neuerfindung nötig:** der Ausschneiden-Button (`Toolbar.tsx:143-156`) macht exakt das Geforderte: `disabled={!canCut(view.state)}` (`:147`) plus die Tailwind-Klassen `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent` (`:153`). Für „Spalte einfügen" tritt `isInTable(view.state)` an die Stelle von `canCut(view.state)` — sonst identisches Muster (SVG-Icon, `title`+`aria-label`, `onMouseDown`+`preventDefault`). |
| 4 | Kontextmenü (Rechtsklick) auf einer Tabellenzelle | — | Nicht vorhanden; der Editor verzichtet **bewusst** darauf (`WordEditor.tsx:117-121`) | **Kein Soll-Bestandteil dieser Anforderung** — Kontextmenüs sind anwendungsweit nicht vorgesehen; die Toolbar-Buttons (Punkt 1/2) sind der verbindliche Bedienweg. Muss bei Abnahme explizit als „bewusst nicht gebaut" bestätigt werden, nicht stillschweigend offenbleiben. Betrifft alle Tabellen-Geschwisterfeatures gemeinsam — nicht pro Feature unterschiedlich lösen. |
| 5 | Tastenkombination | — | Nicht vorhanden | Word/LibreOffice definieren hierfür **keine** feste Standardtastenkombination (nur Ribbon/Menü) — kein Soll-Bestandteil. Die Buttons müssen aber über Tastatur erreichbar sein (Tab-Fokus + Enter/Leertaste löst aus), da sie reguläre `<button>`-Elemente sind. |
| 6 | Bedienung per Touch (Mobile/Tablet) | `playwright.config.ts:34-36` konfiguriert die Projekte „Desktop Chrome", „Mobile" (Pixel 7) und „Tablet" (iPad Mini) | Ungeprüft (Feature existiert nicht) | Mindestens der Fall „Cursor per Tipp in eine Zelle setzen, dann Button antippen" muss auf **allen drei** Projekten funktionieren. Eine `CellSelection` per Touch-Drag ist auf Touch-Geräten schwer bedienbar und **nicht** Pflichtvoraussetzung, aber der Cursor-Fall ist es. |
| 7 | Tab-Taste in der letzten Zelle der letzten Zeile | Editor | Fügt laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 eine neue **Zeile** hinzu (separates Feature `zeile-einfuegen`) | Kein Soll-Bestandteil dieser Datei — nur zur Abgrenzung erwähnt, damit „Tab" nicht fälschlich als bereits vorhandener Ersatz für „Spalte einfügen" missverstanden wird. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundverhalten „Spalte links einfügen" (Cursor in einer Zelle, keine Mehrfachauswahl)
- Cursor irgendwo innerhalb einer Zelle (keine Textselektion nötig) → Klick auf „Spalte
  links einfügen" fügt eine neue, leere Spalte **unmittelbar links** der Spalte ein, in
  der sich die aktuelle Zelle befindet (`addColumnBefore` → `addColumn(tr, rect,
  rect.left)`, dist `:1344-1350`).
- Die neue Spalte erstreckt sich über **alle** Zeilen der Tabelle, nicht nur über die
  aktuelle Zeile — die Bibliotheksfunktion iteriert über `map.height` (dist `:1324`),
  also über jede Tabellenzeile.
- Die Tabelle wächst dadurch insgesamt um genau eine Spalte (z. B. 2×2 → 3×2 „Spalten ×
  Zeilen"-Notation).

### 3.2 Grundverhalten „Spalte rechts einfügen"
- Analog zu 3.1, aber die neue Spalte entsteht **unmittelbar rechts** der aktuellen
  Zelle (`addColumnAfter` → `addColumn(tr, rect, rect.right)`, dist `:1357-1363`).
- Angewendet auf die Zelle in der **letzten** Spalte fügt „Spalte rechts" eine neue,
  letzte Spalte an (Tabelle wird am rechten Rand erweitert) — Grenzfall 4.3.
- Angewendet auf die Zelle in der **ersten** Spalte fügt „Spalte links" eine neue,
  erste Spalte an (Tabelle wird am linken Rand erweitert) — ebenfalls Grenzfall 4.3.

### 3.3 Verhalten bei einer Mehrfach-Zellauswahl (`CellSelection` über mehrere Spalten)
- Ist mittels Shift+Klick/Ziehen eine `CellSelection` über **mehrere** Spalten aktiv
  (durch das aktive Plugin `tableEditing()`, `WordEditor.tsx:110`, möglich), ermitteln
  `addColumnBefore`/`addColumnAfter` über `selectedRect` (dist `:1303`) das
  **umschließende Rechteck** der Auswahl und fügen **genau eine** neue Spalte an dessen
  linker (`rect.left`) bzw. rechter (`rect.right`) Grenze ein — **nicht** eine neue
  Spalte pro markierter Spalte.
- Das weicht vom in Word/LibreOffice üblichen Verhalten ab, wo eine Mehrfachauswahl von
  z. B. 3 markierten Spalten beim Einfügen **3** neue Spalten erzeugt. Dieser
  Unterschied ist **explizit als offener Klärungspunkt** zu behandeln (nicht
  stillschweigend hinzunehmen): entweder wird das Bibliotheksverhalten (eine Spalte,
  unabhängig von der Auswahlbreite) bewusst als für dieses Projekt ausreichend
  akzeptiert und dokumentiert, oder die Anwendung muss die Mehrfach-Einfüge-Semantik
  selbst nachbilden (z. B. `addColumnBefore`/`addColumnAfter` in einer Schleife einmal
  je markierter Spalte, mit korrekter Positionsverschiebung). Muss vor Abnahme
  entschieden und mit Testfall belegt werden (Grenzfall 4.4).

### 3.4 Verhalten an horizontal verbundenen Zellen (`colspan`) an der Einfügegrenze
- Reicht in einer Zeile eine bereits horizontal verbundene Zelle (`colspan > 1`) über
  die Einfügeposition hinweg, wird in **dieser Zeile keine neue Zelle eingefügt**,
  sondern die bestehende verbundene Zelle bekommt ihren `colspan`-Wert um 1 erhöht.
  Quelltext-Nachweis (dist `:1326-1330`): Die Bedingung `col > 0 && col < map.width &&
  map.map[index - 1] == map.map[index]` erkennt, dass die Spaltengrenze **mitten durch**
  eine verbundene Zelle verläuft, und ruft `tr.setNodeMarkup(..., addColSpan(cell.attrs,
  ...))` (Erhöhung des `colspan`) statt `tr.insert(...)` auf.
- In **anderen** Zeilen derselben Tabelle, in denen an derselben Spaltengrenze **keine**
  verbundene Zelle liegt, wird ganz normal eine neue, leere Zelle eingefügt
  (`type.createAndFill()`, dist `:1334`). Die Entscheidung fällt also **pro Zeile
  unabhängig** — eine Tabelle mit unregelmäßigen Merges bekommt in derselben
  Spalten-Einfügeaktion eine Mischung aus „Zelle verbreitert" und „neue leere Zelle
  eingefügt". Dies ist **gewünschtes**, mit einem gezielten Testfall zu belegendes
  Verhalten (Grenzfall 4.2), kein zu vermeidender Nebeneffekt.
- Für vertikal verbundene Zellen (`rowspan`) greift die Colspan-Erweiterung automatisch
  auch für alle überdeckten Fortsetzungszeilen: Die Schleife springt nach einer
  Verbreiterung über die vom `rowspan` überdeckten Zeilen hinweg (`row += cell.attrs.
  rowspan - 1`, dist `:1330`), sodass die verbundene Zelle nur **einmal** verbreitert
  wird und die Struktur konsistent bleibt (siehe Grenzfall 4.2).

### 3.5 Inhalt neuer Zellen
- Jede neu eingefügte Zelle ist **leer** (`type.createAndFill()`, dist `:1334`) — es wird
  **kein** Inhalt und **keine** Zeichenformatierung aus Nachbarzellen kopiert. Der
  Zelltyp wird zwar von einer Referenzspalte übernommen (dist `:1332`), es gibt in dieser
  App aber ohnehin nur einen Zelltyp (`table_cell`, keine Header-Zellen), sodass die neue
  Zelle stets eine schlichte leere Standardzelle ist.
- Eine neue, leere Zelle muss trotzdem sofort klickbar/tippbar sein: `createAndFill()`
  erzeugt gemäß Schema (`cellContent: 'block+'`, `schema.ts:154`) mindestens einen leeren
  `paragraph` — dieselbe Struktur, die auch `insertTable` (`commands.ts:95`) verwendet.

### 3.6 Spaltenbreite der neu eingefügten Spalte
- Da Spaltenbreiten (`colwidth`) im gesamten Import/Export-Pfad bereits nicht
  round-trip-fähig sind (Abschnitt 0 — beide Reader setzen `colwidth: null`, DOCX schreibt
  fix `w:w="2000"`, ODT `<table:table-column/>` ohne Breite), erhält die neue Spalte im
  Editor und beim Export dieselbe (Default-)Breite wie alle übrigen Spalten. Das ist
  **kein** durch dieses Feature verursachter Rundreiseverlust, sondern konsistent mit dem
  bestehenden Verhalten, und ist als solches zu dokumentieren.
- Beim Ziehen einer Spaltenbreite (aktives `columnResizing()`-Plugin, `WordEditor.tsx:109`) nach dem Einfügen: bestehende Nachbarspalten dürfen ihre zuvor per Ziehpunkt
  gesetzte Breite nicht verlieren (falls Breiten-Ziehen bereits funktioniert — sonst als
  bekannte Einschränkung dokumentieren).

### 3.7 Fokus-/Cursor-Verhalten nach dem Einfügen
- Nach dem Einfügen bleibt der Editor fokussiert (`view.focus()` in `run()`,
  `Toolbar.tsx:30`), und die Selektion bleibt an einer nachvollziehbaren Position —
  idealerweise weiterhin in der ursprünglichen (jetzt ggf. um eine Position
  verschobenen) Zelle, nicht automatisch in die neue, leere Spalte hineinspringend.
- **Kritischer Berührungspunkt mit dem bekannten Selection-Sync-Bug**
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2; Tabellen dort explizit als
  „Hauptverdachtsfall"; Reconciliation-Logik in `WordEditor.tsx:43` und `:146-152`):
  Spalte einfügen → per Klick in eine andere Zelle wechseln → Enter/Tippen → **kein**
  unbeabsichtigtes Überschreiben des gesamten Tabelleninhalts. Pflicht-Regressionstest,
  siehe Grenzfall 4.10. Ein solcher Test existiert für „Spalte einfügen" bisher **nicht**
  (`selection-regression.spec.ts` deckt nur den ursprünglichen Bold/Alles-auswählen-Fall
  ab, keine Tabellen-Spaltenaktion).

### 3.8 Undo/Redo
- Ein Klick auf „Spalte links/rechts einfügen" erzeugt **genau einen** Undo-Schritt,
  auch wenn dabei mehrere Zeilen gleichzeitig verändert werden (eine neue Zelle je Zeile
  bzw. eine Colspan-Erweiterung je betroffener Zeile, siehe 3.4) — das Einfügen läuft als
  **eine** ProseMirror-Transaktion (`addColumn` baut alle Änderungen in **eine** `tr`,
  dist `:1321-1338`). Ein einzelnes Strg+Z macht die komplette Spalten-Einfügeaktion
  rückgängig, nicht nur die Änderung an einer einzelnen Zeile.
- Undo direkt nach dem Einfügen stellt die Tabelle exakt in vorherigem Zustand wieder her
  (Spaltenanzahl, Zellinhalte, alle `colspan`/`rowspan`-Werte identisch). Redo stellt die
  neue Spalte wieder her.

### 3.9 Zusammenspiel mit verschachtelten Tabellen
- Befindet sich der Cursor in einer Tabelle, die selbst innerhalb einer Zelle einer
  äußeren Tabelle liegt (verschachtelte Tabelle, laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 6 mindestens beim Import nicht abstürzend zu behandeln), muss „Spalte
  einfügen" sich **ausschließlich** auf die innerste, den Cursor unmittelbar
  umschließende Tabelle auswirken — die äußere Tabelle darf nicht verändert werden.
  `selectedRect` ermittelt die relevante Tabelle über den nächsten Tabellen-Vorfahren
  relativ zur Selektion (dist `:1303`) — das Standardverhalten sollte dies korrekt
  handhaben, ist aber mit einem echten verschachtelten Testfall zu belegen
  (Grenzfall 4.5), nicht nur anzunehmen.

### 3.10 Zusammenspiel mit dem bestehenden „Tabelle einfügen"-Button (feste 2×2-Größe)
- Solange `tabelle-einfuegen` (separater Backlog-Eintrag) nur feste 2×2-Tabellen erzeugt
  (`Toolbar.tsx:284`, `insertTable(2, 2)`), ist „Spalte einfügen" der **einzige** Weg,
  eine bestehende Tabelle nachträglich zu verbreitern. Das begründet die hohe Priorität
  dieses Features zusätzlich zur bereits von der Nutzerin gemeldeten Dringlichkeit
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6).

### 3.11 Kein „Zeile-1-Kollaps"-Risiko (Abgrenzung zu `zeile-einfuegen`)
- Beide Writer leiten `colCount` **allein aus der ersten Zeile** ab (`docx/writer.ts:160`,
  `odt/writer.ts:115-116`). Beim **Zeilen**-Einfügen ist das ein echter Grenzfall (eine
  neue erste Zeile muss dieselbe effektive Spaltenzahl haben, siehe
  `zeile-einfuegen-req.md` Grenzfall 5). Beim **Spalten**-Einfügen tritt dieses Risiko
  **nicht** auf: `addColumn` erhöht die effektive Spaltenzahl **jeder** Zeile — inklusive
  Zeile 0 — um genau 1 (durch neue Zelle **oder** `colspan`-Erhöhung). Die von Zeile 0
  abgeleitete `colCount` bleibt daher automatisch konsistent mit dem Rest der Tabelle.
  Dieser Unterschied ist bewusst festgehalten, damit er in der Abnahme nicht fälschlich
  als fehlender Testfall geführt wird.

---

## 4. Grenzfälle

1. **Tabelle mit nur einer Spalte:** „Spalte links" bzw. „Spalte rechts" auf eine 1×n-
   Tabelle angewendet → Ergebnis ist eine 2×n-Tabelle, ursprünglicher Inhalt bleibt in
   der jeweils anderen Spalte vollständig erhalten.
2. **Zeilenübergreifend unregelmäßige Merges:** Tabelle mit einer horizontal
   verbundenen Zelle (`colspan: 2`) in genau einer Zeile, „normale" Einzelzellen in den
   übrigen Zeilen an derselben Spaltenposition → nach dem Einfügen wächst die verbundene
   Zelle auf `colspan: 3`, während die übrigen Zeilen eine zusätzliche, neue leere Zelle
   erhalten (siehe 3.4) — beides in derselben Aktion, mit konkretem Testfall (z. B.
   3-spaltige Tabelle, Zeile 1 verbunden über Spalte 2–3, Zeile 2 normal) zu belegen.
3. **Einfügen ganz am linken bzw. rechten Rand der Tabelle:** „Spalte links" auf die
   allererste Spalte fügt eine neue erste Spalte ein; „Spalte rechts" auf die letzte
   Spalte fügt eine neue letzte Spalte an — beide Male bleibt die Cursor-Zelle inhaltlich
   unverändert, nur ihre Position innerhalb der Tabelle verschiebt sich ggf. um eine
   Spalte.
4. **Mehrfach-Zellauswahl über mehrere Spalten (siehe 3.3):** Es wird **eine** einzelne
   Spalte eingefügt, nicht eine pro markierter Spalte — mit Testfall zu belegen
   (3×3-Tabelle, mittlere und rechte Spalte markiert, „Spalte rechts" anwenden, Ergebnis
   dokumentieren) und als bewusste Entscheidung zu bestätigen oder als nachzuliefernde
   Abweichung zu ticketieren.
5. **Verschachtelte Tabelle (Tabelle in Tabellenzelle):** Spalte in der inneren Tabelle
   einfügen → äußere Tabelle bleibt strukturell und inhaltlich unverändert (siehe 3.9).
   Neben der im Editor konstruierten Verschachtelung zusätzlich die reale Fixture
   `tests/fixtures/external/odt/subTables3-nested.odt` importieren und in der inneren
   Tabelle eine Spalte einfügen (Import-Pfad; Fixture-Existenz verifiziert).
6. **Export-Struktur bei Merge + neuer Spalte (Regressionsschutz, siehe Abschnitt 6):**
   Tabelle mit horizontal verbundener Zelle in Zeile 1, danach Spalte einfügen →
   exportierte `<table:table-column>`- bzw. `<w:gridCol>`-Anzahl entspricht **exakt** der
   tatsächlichen (um 1 erhöhten) Spaltenzahl, und jede Zeile deklariert die korrekte Zahl
   `table-cell`/`covered-table-cell` (ODT) bzw. `w:tc` (DOCX). Dieses Verhalten ist
   **bereits korrekt** und durch Unit-Tests abgesichert (`odt/roundtrip.test.ts:298`
   u. a.); der Grenzfall stellt sicher, dass „Spalte einfügen" es **nicht bricht** — er
   ist **kein** Bugfix-Auftrag.
7. **Sehr breite Tabelle nach mehrfachem Erweitern (> 10 Spalten):** Wiederholtes Klicken
   auf „Spalte rechts" (z. B. 10×) → kein Performance-Einbruch, keine JS-Exception,
   Tabelle bleibt bedienbar. **Das Grundsatzverhalten ist bereits durch Code-Recherche
   geklärt (siehe Abschnitt 0, Zeile „Rendering sehr breiter Tabellen"), keine offene
   Design-Entscheidung mehr:** Die aktive `columnResizing()`-NodeView setzt bei fehlender
   `colwidth` ein `min-width` von 100px je Spalte auf die Tabelle, während die Seite selbst
   eine feste Pixelbreite ohne `overflow: hidden` hat — die Tabelle **wächst über den
   rechten Seitenrand hinaus** (kein automatisches Schrumpfen der Spalten), erreichbar über
   den äußeren `overflow-auto`-Container (`WordEditor.tsx:171`). Zu verifizieren ist daher
   **nicht mehr die Grundsatzfrage**, sondern nur noch: (a) dass ab einer bestimmten
   Spaltenzahl (rechnerisch ab `Spaltenzahl × 100px > PAGE_CONTENT_WIDTH_PX`, mit den
   aktuellen A4-Maßen ca. 6–7 Spalten) der Überstand per Screenshot tatsächlich sichtbar
   ist wie hergeleitet, (b) dass dabei kein Zellinhalt abgeschnitten/verloren geht, und
   (c) ob dieses vorbestehende (nicht durch „Spalte einfügen" verursachte) Seiten-
   Darstellungsverhalten für die Abnahme dieses Features akzeptiert oder als eigenes
   Ticket zur Seiten-/Tabellendarstellung vermerkt wird — letzteres liegt außerhalb des
   Scopes dieser Datei (vgl. Abschnitt 7).
8. **Klick außerhalb einer Tabelle:** Cursor steht in einem normalen Absatz (keine
   Tabelle im Dokument oder Cursor schlicht nicht in einer) → Buttons sind deaktiviert
   (siehe Abschnitt 2, Punkt 3), kein Fehler, keine Wirkung.
9. **Undo/Redo unmittelbar nach dem Einfügen** (siehe 3.8) — Tabelle exakt wie vorher,
   inklusive aller Merges; Redo stellt neue Spalte inklusive korrekt wiederhergestellter
   Merge-Anpassungen wieder her.
10. **Selection-Sync-Regressionstest mit Tabellen** (siehe 3.7 und
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Spalte einfügen → Klick in eine andere Zelle
    zur Neupositionierung → Enter → weitertippen → **kein** Datenverlust im übrigen
    Tabelleninhalt. Pflicht-Regressionstest, dauerhaft Teil der Suite, im Stil von
    `tests/e2e/selection-regression.spec.ts` (dort für Tabellen-Spaltenaktion noch nicht
    vorhanden).
11. **Zelle mit mehreren Absätzen als Inhalt** an der Einfügeposition → Einfügen einer
    Nachbarspalte verändert den mehrabsätzigen Inhalt der Ausgangszelle nicht.
12. **Bild in einer Nachbarzelle der Einfügeposition** → nach dem Einfügen bleibt das Bild
    in seiner Zelle, die neue Spalte ist leer; keine verwaiste Bilddatei und keine
    Bildverdopplung im späteren Export-Zip.
13. **Reale Fremddatei mit bereits unregelmäßiger Tabellenstruktur** (z. B. aus
    `tests/fixtures/external/odt/` wie `crazyTable.odt`, `BigTable.odt`,
    `OOStyledTable.odt`, `TableWidth.odt` (im Fixture-Bestand als merge-frei verifiziert,
    geeignet für den reinen Grundfall großer/unregelmäßiger Tabellen) oder — für
    vorbestehende Merges — `tableComplex_DOC_LO41.odt` bzw.
    `table-column-delete-with-merge.odt` (verifiziert horizontale Merges), sowie analoge
    DOCX-Fremddateien aus dem
    Korpus in `src/formats/docx/__tests__/external-fixtures.test.ts`) importieren, danach
    eine Spalte einfügen → kein Absturz, auch wenn die Ausgangsdatei Grenzfälle wie
    fehlende Grid-Einträge oder inkonsistente Zeilenlängen enthält (Reader-seitig durch
    `MAX_TABLE_NESTING_DEPTH`/`MAX_NESTING_DEPTH = 25` gegen Tiefenexzesse geschützt, aber
    nicht notwendigerweise gegen jede Inkonsistenz — mit echter Datei zu prüfen).
14. **Fremd-ODT mit vertikaler Verbindung (`covered-table-cell`, siehe Abschnitt 6):**
    Konkret `tests/fixtures/external/odt/tableCoveredContent.odt` verwenden — im
    Fixture-Bestand als **einzige** ODT-Datei mit echten vertikalen Verbindungen
    verifiziert (5× `table:number-rows-spanned`, 33× `<table:covered-table-cell/>`); die
    oft genannten großen Tabellen (`BigTable.odt`, `OOStyledTable.odt`,
    `coloredTable_MSO15.odt`) sind **merge-frei** und können diesen Punkt nicht abdecken.
    Datei importieren → **vor** dem
    Einfügen prüfen, ob die Spaltenzuordnung korrekt importiert wurde; dann Spalte
    einfügen und exportieren. Falls die Reader-Annahme (Abschnitt 6) nicht trägt, ist der
    Befund als **Abhängigkeit** zu erfassen, nicht als „Spalte einfügen"-Fehler.
15. **Bedienung per Touch:** Grundfall (Cursor per Tipp in Zelle, Button antippen)
    funktioniert auf den Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini)
    (`playwright.config.ts:35-36`), nicht nur auf Desktop Chrome.

---

## 5. Rundreise-Anforderung (verbindlich, DOCX **und** ODT)

Wie in `FEATURE-SPEC-DOCX-ODT.md` gefordert, gilt für jede Interaktion mit „Spalte
einfügen" die Rundreise-Bedingung: **Datei/Tabelle exportieren → Ergebnis entspricht
inhaltlich dem Zustand nach dem Einfügen im Editor**, sowie zusätzlich für importierte
Fremddateien: **Datei A hochladen → Spalte einfügen → exportieren → Re-Import →
ursprünglicher Inhalt von A vollständig wiederzufinden, plus die neue, leere Spalte.**

### 5.1 DOCX
1. **Einfache Eigenrundreise:** Im Editor eine 2×2-Tabelle einfügen, Inhalt in alle 4
   Zellen tippen, „Spalte rechts einfügen" in der zweiten Spalte anwenden → 3×2-Tabelle
   → als DOCX exportieren → mit einem unabhängigen Parser (z. B. python-docx oder
   direktes Parsen von `word/document.xml`) verifizieren: `<w:tblGrid>` enthält genau
   3 `<w:gridCol>`, jede `<w:tr>` enthält genau 3 `<w:tc>` → Re-Import zeigt 3 Spalten
   mit identischem Original-Inhalt in den unveränderten Zellen und leeren Zellen in der
   neuen Spalte.
2. **Mit horizontal verbundener Zelle:** Tabelle mit einer `colspan: 2`-Zelle in Zeile 1
   (über konstruiertes Fixture, da `zellen-verbinden` noch keine UI hat), Spalte in einer
   nicht verbundenen Nachbarspalte einfügen → Rundreise erhält sowohl den ursprünglichen
   Merge (`w:gridSpan`) als auch die neue Spalte korrekt getrennt voneinander.
3. **Mit vertikal verbundener Zelle:** Tabelle mit einer `rowspan: 2`-Zelle, Spalte links
   davon einfügen → beide betroffenen Zeilen bekommen konsistent je eine neue, leere
   Zelle bzw. eine erweiterte Merge-Zelle (je nach Position, siehe Grenzfall 4.2);
   `w:vMerge`-Struktur bleibt nach Rundreise korrekt.
4. **Cross-Format:** ODT-Datei mit einer Tabelle importieren, im Editor eine Spalte
   einfügen, als DOCX exportieren → Re-Import zeigt korrekte Spaltenanzahl und
   unverändert erhaltenen Original-Zellinhalt.
5. **Reale Fremddatei:** Eine reale, komplexe DOCX-Testdatei mit Tabelle (aus dem Korpus
   von `src/formats/docx/__tests__/external-fixtures.test.ts`) importieren, eine Spalte
   einfügen, exportieren, erneut importieren → sämtlicher ursprünglicher Zellinhalt
   weiterhin vorhanden und unverändert, zusätzlich die neue Spalte.

### 5.2 ODT
1. **Einfache Eigenrundreise:** Analog zu 5.1.1 — zusätzlich verifizieren, dass die
   Anzahl der exportierten `<table:table-column>`-Elemente **exakt** der tatsächlichen
   Spaltenanzahl (3) entspricht und jede `<table:table-row>` genau 3
   `table-cell`/`covered-table-cell`-Elemente deklariert (ODF 1.3 §9.1.1). Dieses
   Verhalten ist bereits korrekt implementiert und in
   `src/formats/odt/__tests__/roundtrip.test.ts:275`/`:298` abgesichert — der E2E-Test
   stellt sicher, dass „Spalte einfügen" es nicht bricht.
2. **Mit horizontal verbundener Zelle:** Tabelle mit einer
   `table:number-columns-spanned="2"`-Zelle in Zeile 1 plus einer zusätzlich eingefügten
   Spalte → Anzahl `<table:table-column>` entspricht der Summe der spannweiten-
   gewichteten Zellen der ersten Zeile; die verbundene Zeile deklariert die korrekten
   `covered-table-cell`-Platzhalter.
3. **Mit vertikal verbundener Zelle:** `table:number-rows-spanned="2"`-Zelle, Spalte
   daneben einfügen → Re-Import erhält Struktur; die überdeckte Folgezeile trägt am
   richtigen Grid-Index `<table:covered-table-cell/>` (vgl. `odt/roundtrip.test.ts:310`).
4. **Cross-Format:** DOCX-Tabelle importieren, Spalte einfügen, als ODT exportieren →
   Re-Import zeigt korrekte Struktur und unveränderten Original-Inhalt.
5. **Reale Fremddatei:** Analog zu 5.1.5. Für den **merge-freien** Grundfall eignen sich
   z. B. `BigTable.odt`, `OOStyledTable.odt`, `coloredTable_MSO15.odt` (im Fixture-Bestand
   als merge-frei verifiziert). Für den Fall **mit** vorbestehenden Merges
   `tableComplex_DOC_LO41.odt` (horizontale Merges) bzw. `tableCoveredContent.odt`
   (vertikale Merges/`covered-table-cell`) verwenden und zusätzlich Abschnitt 6 beachten.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. Tabelle im Editor erzeugen, eine Spalte einfügen, als ODT exportieren → erneut
   importieren → als DOCX zurück-exportieren → Spaltenanzahl und Zellinhalt bleiben über
   beide Konvertierungen identisch (Formatierungsverluste bei Cross-Format sind laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 akzeptabel und zu dokumentieren, Text- bzw.
   Spaltenverlust nicht).
2. Dieselbe Prüfung mit Startpunkt DOCX → ODT → DOCX.

---

## 6. Regressionsschutz für den Merge-/Spaltenexport & offener Reader-Verifikationspunkt

**Kein Bugfix-Auftrag, sondern Absicherung von bereits korrektem Verhalten plus eine
klar benannte, noch offene Verifikation.** Ein früherer Entwurf dieser Datei hat hier
fälschlich einen „ODT-`colCount`-Fix" als Pflicht verlangt; dieser Fehler ist längst
behoben (Abschnitt 0).

### 6.1 Bereits korrekt — muss durch dieses Feature erhalten bleiben
- Beide Writer berechnen `colCount` als **Summe der `colspan`-Werte** der ersten Zeile
  (`docx/writer.ts:160`, `odt/writer.ts:115-116`) und erzeugen ODF-/OOXML-konforme
  Platzhalter für Verbindungen (`<table:covered-table-cell/>` bzw. `<w:vMerge/>` über die
  `pending`-Logik). Bestehende Unit-Tests (`odt/roundtrip.test.ts:275`/`:298`/`:310` und
  die DOCX-Pendants) sichern das ab.
- **Anforderung:** Nach Umsetzung von „Spalte einfügen" müssen diese Tests **weiterhin
  grün** sein, und die Rundreise-Testfälle aus Abschnitt 5 (insbesondere 5.2.1/5.2.2 mit
  Merge) dürfen keine Abweichung der `<table:table-column>`-/`<w:gridCol>`-Anzahl
  erzeugen. Kein neuer Testfall darf diesen Pfad **still** brechen.

### 6.2 Offener Verifikationspunkt — ODT-Reader und `covered-table-cell` bei Fremddateien
- Der ODT-Reader liest `colspan`/`rowspan` aus den echten `<table:table-cell>`-Elementen
  und **überspringt** `<table:covered-table-cell/>` (`odt/reader.ts:304`). Für vom eigenen
  Writer erzeugte Dateien ist das nachweislich korrekt (die übersprungenen Positionen sind
  exakt die überdeckten). Für **reale LibreOffice-Fremddateien** mit vertikalen
  Verbindungen ist bisher **nicht** getestet, ob diese Annahme die Spaltenzuordnung der
  Folgezeilen korrekt trägt.
- **Anforderung:** Mit `tests/fixtures/external/odt/tableCoveredContent.odt` (verifiziert:
  5× `table:number-rows-spanned`, 33× `<table:covered-table-cell/>` — die **einzige**
  Fixture des Bestands mit echten vertikalen Verbindungen; die großen Tabellen `BigTable`/
  `OOStyledTable`/`coloredTable_MSO15` sind merge-frei und ungeeignet) verifizieren, dass
  Import → Spalte einfügen → Export → Re-Import die Zellzuordnung erhält. Ergebnis
  dokumentieren:
  1. Trägt die Annahme → als bestätigt vermerken (kein weiterer Handlungsbedarf).
  2. Trägt sie nicht → als **eigenständige Reader-Abhängigkeit/Ticket** erfassen (nicht
     als „Spalte einfügen"-Fehler), da der Reader-Pfad unabhängig von diesem Feature ist.
- Dies ist **bewusst als Verifikations-, nicht als Fix-Anforderung** formuliert: es liegt
  kein bestätigter Reader-Bug vor, nur eine ungetestete Annahme. Ungetestete Annahmen als
  „bekannten Bug" zu deklarieren wäre derselbe Fehler wie der eingangs korrigierte.

---

## 7. Explizit außerhalb des Scopes dieser Spezifikation

Um Missverständnisse bei der späteren Abnahme zu vermeiden:

- **`zeile-einfuegen` (Priorität 1):** Strukturell analoges, aber eigenständiges Feature
  mit eigener Anforderungsdatei (`zeile-einfuegen-req.md`) — nicht Teil dieser Datei, auch
  wenn dieselben Bibliotheksbausteine (`addRowBefore`/`addRowAfter`) zum Einsatz kommen.
- **`spalte-loeschen` (Priorität 1):** Eigener Backlog-Eintrag, eigene Anforderungsdatei
  (`spalte-loeschen-req.md`). Wird hier nur insofern berührt, als Undo nach „Spalte
  einfügen" (3.8) den Effekt eines Löschens erzeugt, ohne dass ein „Löschen"-Befehl
  beteiligt ist.
- **`zellen-verbinden`/`zellen-teilen` (Priorität 1/2):** Eigene Backlog-Einträge.
  Relevant für diese Datei nur als Rand-/Grenzfall (3.4/4.2 — Verhalten der neuen Spalte
  an bereits bestehenden Merges), nicht als zu bauende Funktion selbst.
- **`tabelle-einfuegen` (feste 2×2-Größe durch wählbaren Dialog ersetzen, Priorität 1):**
  Eigener, als „teilweise" geführter Eintrag — hier nur als Ausgangspunkt/Kontext (3.10).
- **Kontextmenü (Rechtsklick) als zusätzlicher Bedienweg:** Siehe Abschnitt 2, Punkt 4 —
  bewusst nicht Teil dieser Anforderung, da die App bewusst kein Kontextmenü besitzt
  (`WordEditor.tsx:117-121`).
- **Spaltenbreiten-Rundreise (`colwidth` aus der Datei übernehmen und exportieren):**
  Vorbestehende, unabhängige Einschränkung (Abschnitt 0/3.6), eigenes Ticket.
- **ODT-`colCount`-„Fix":** Entfällt — bereits behoben (Abschnitt 0/6). Nur noch
  Regressionsschutz, kein Bau-Auftrag.

---

## 8. Verifikationsauftrag (Hinweis zum Backlog-Status „nicht vertrauenswürdig")

Da der Ausgangsstatus laut Backlog „fehlt" ist und durch die Code-Recherche in
Abschnitt 0 bestätigt wurde (keine Codezeile für Spalten-Einfügen), muss die Abnahme
dieselbe Regel erfüllen wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22: **Jeder einzelne
Testfall dieser Datei muss über echte Browser-Interaktion (Playwright, sichtbarer Klick/
Touch) nachgewiesen werden — nicht nur durch isolierte Unit-Tests, die
`addColumnBefore`/`addColumnAfter` direkt auf einem konstruierten ProseMirror-Dokument
aufrufen.** Ein solcher Unit-Test beweist nicht, dass die Toolbar-Buttons existieren,
korrekt (de)aktiviert sind und im echten Editor sichtbar wirken.

Vorgeschlagene Testebenen:

| Ebene | Beispiel-Datei/Ort | Deckt ab |
|---|---|---|
| Unit-Test (Befehls-Logik) | `src/formats/shared/editor/__tests__/commands.test.ts` (erweitert) | Korrektes Einfügen bei einfachen und bei Merge-haltigen Tabellen, Undo als **eine** Transaktion, Position relativ zur Cursor-Zelle |
| Unit-Test (Export-Regression) | `src/formats/odt/__tests__/roundtrip.test.ts` / `docx/__tests__/roundtrip.test.ts` (bestehend, ggf. um „nach Spalte einfügen"-Fall ergänzt) | Abschnitt 6.1 — `<table:table-column>`-/`<w:gridCol>`-Anzahl bleibt korrekt |
| E2E-Test (echte Bedienung) | `tests/e2e/tables.spec.ts` (neu) | Toolbar-Buttons, Aktiv-/Deaktiviert-Zustand außerhalb einer Tabelle, `onMouseDown`/Fokus-Erhalt, Mehrfachauswahl (4.4), verschachtelte Tabelle (4.5), Selection-Sync-Regression (4.10), Touch (4.15) |
| Rundreise-Test | Erweiterung `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` bzw. Reader/Writer-Unit-Tests | Abschnitt 5 |
| Reale Fixture-Datei | `tests/fixtures/external/odt/` — merge-frei: `BigTable.odt`; horizontale Merges: `tableComplex_DOC_LO41.odt`; vertikale Merges/`covered-table-cell`: `tableCoveredContent.odt` (verifiziert); verschachtelt: `subTables3-nested.odt` — plus DOCX-Korpus aus `docx/__tests__/external-fixtures.test.ts` | Grenzfälle 4.5/4.13/4.14 und Abschnitt 6.2 |
| Mehrere Projekte | `playwright.config.ts:34-36` (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) | Grenzfall 4.15 |

Erst wenn alle Testfälle aus Abschnitt 3–6 auf diesen Ebenen grün sind, darf der
Backlog-Status von `spalte-einfuegen` auf „vorhanden" geändert werden. Existiert ein
funktionierender, aber noch nicht vollständig verifizierter UI-Weg, ist „teilweise" zu
setzen und die offenen Punkte hier nachzutragen.

---

## 9. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Spalte links einfügen" | fehlt komplett | neu bauen (`addColumnBefore`), siehe Abschnitt 2/3.1 |
| 2 | Toolbar-Button „Spalte rechts einfügen" | fehlt komplett | neu bauen (`addColumnAfter`), siehe Abschnitt 2/3.2 |
| 3 | Aktiv-/Deaktiviert-Zustand beider Buttons (`isInTable`) | fehlt (keine Buttons) | `disabled` außerhalb einer Tabelle, siehe Abschnitt 2, Punkt 3 |
| 4 | `onMouseDown`+`preventDefault`-Auslösung (Fokus-/Selektionserhalt) | n/a | Pflichtmuster wie bestehende Buttons (`Toolbar.tsx:282-285`), siehe Abschnitt 2, Punkt 1 |
| 5 | Behandlung von `colspan`/`rowspan` an der Einfügegrenze | fehlt (keine Einfügefunktion) | `addColumn` übernimmt dies bereits korrekt, sofern eingebunden — siehe 3.4, 4.2 |
| 6 | ODT-/DOCX-Export: korrekte Spalten-/Zellzahl bei Merges | **bereits korrekt & getestet** | Regressionsschutz, siehe Abschnitt 6.1 |
| 7 | ODT-Reader `covered-table-cell` bei Fremddateien | ungetestet | Verifikationspunkt, siehe Abschnitt 6.2 |
| 8 | Touch-Bedienung (Mobile/Tablet) | ungeprüft | Grundfall auf allen drei Playwright-Projekten, siehe Abschnitt 2, Punkt 6 / 4.15 |
| 9 | Kontextmenü als Bedienweg | bewusst nicht vorhanden | **nicht** Teil dieser Anforderung, siehe Abschnitt 7 |
| 10 | Selection-Sync-Regressionstest mit „Spalte einfügen" | fehlt | siehe 3.7, 4.10 |
| 11 | Rendering sehr breiter Tabellen (Seitenüberstand) | durch Code-Recherche bereits erklärt (kein offener Entscheidungspunkt mehr), visueller Nachweis per Screenshot noch offen | siehe Abschnitt 0 „Rendering sehr breiter Tabellen", Grenzfall 4.7 |

---

## 10. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert"/„vorhanden" gelten, wenn **alle** folgenden
Punkte erfüllt sind:

1. Beide Toolbar-Buttons („Spalte links/rechts einfügen") existieren, lösen über echten
   Playwright-Klick `addColumnBefore`/`addColumnAfter` sichtbar aus und sind außerhalb
   einer Tabelle sichtbar deaktiviert. Auslösung per `onMouseDown`+`preventDefault`, ohne
   Verlust der Zellselektion.
2. Grundverhalten (3.1/3.2) inklusive Position der neuen Spalte relativ zur Cursor-Zelle
   ist per E2E-Test nachgewiesen.
3. Verhalten an horizontal/vertikal verbundenen Zellen (3.4, Grenzfall 4.2) ist mit einem
   konkreten Testfall (unregelmäßige Merge-Struktur) belegt.
4. Die Mehrfachauswahl-Abweichung (3.3, Grenzfall 4.4) ist geprüft und entweder als
   bewusst akzeptiertes Verhalten bestätigt oder per Ticket zur Nachbesserung vorgemerkt
   — nicht unentschieden offengelassen.
5. Die bestehenden Merge-Export-Unit-Tests (Abschnitt 6.1) bleiben grün, und die
   Rundreise-Testfälle 5.1/5.2 (mindestens 1–3 je Format) sind mit echten Datei-Uploads/
   Downloads bestanden — ohne Abweichung der Spalten-/Zellzahl.
6. Der ODT-Reader-Verifikationspunkt (Abschnitt 6.2) ist mit einer realen Fremddatei
   geprüft und sein Ergebnis (bestätigt / als eigene Abhängigkeit ticketiert) hier
   nachgetragen.
7. Der Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser (Grenzfall 4.10)
   ist geschrieben, grün und dauerhaft Teil der E2E-Suite.
8. Undo/Redo-Verhalten (3.8) inklusive korrekter Wiederherstellung von Merge-Zuständen
   als **einzelner** Undo-Schritt ist bestätigt.
9. Verschachtelte-Tabelle-Grenzfall (4.5) ist mit einem echten Testfall geprüft: kein
   Absturz, keine Verfälschung der äußeren Tabelle.
10. Der Touch-Grundfall (4.15) funktioniert auf den Projekten „Mobile" und „Tablet".
11. Das hergeleitete Rendering-Verhalten sehr breiter Tabellen (Grenzfall 4.7, Abschnitt 0)
    ist per Screenshot bestätigt (Tabelle wächst sichtbar über den rechten Seitenrand,
    kein Inhaltsverlust, horizontal erreichbar) und die Frage, ob dies für die Abnahme
    akzeptiert oder als eigenes Seiten-/Tabellendarstellungs-Ticket vermerkt wird, ist
    entschieden — nicht unentschieden offengelassen.
12. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück;
    der Backlog-Status wird erst nach Erfüllung von 1–11 auf „vorhanden" geändert,
    andernfalls auf „teilweise" mit hier nachgetragener Restliste.
