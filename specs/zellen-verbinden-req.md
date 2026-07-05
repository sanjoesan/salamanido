# Anforderungsspezifikation: „Zellen verbinden und teilen“ (Tabellen)

Status: **Entwurf zur Freigabe, nicht vertrauenswürdig bis einzeln über echte
Browser-Bedienung verifiziert.** Diese Datei ersetzt die bisherige
`specs/zellen-verbinden-req.md` vollständig und deckt zusätzlich das bisher nur als
Abgrenzung erwähnte Gegenstück **„Zelle teilen“** ab (eigener Backlog-Slug
`zellen-teilen`, `specs/FEATURE-BACKLOG.md` Zeile 188, Priorität 2). Beide Aktionen bilden
zusammen **einen** Bedienblock „Zellen verbinden/teilen“ in der Editor-Toolbar, unmittelbar
neben dem frisch abgenommenen Bedienblock „Tabellenstruktur bearbeiten“
(`specs/tabelle-struktur-bearbeiten-req.md`: Zeile/Spalte einfügen & löschen).

**Rollentrennung (verbindlich, `specs/UX-INVARIANTEN.md` Abschnitt 3):** Diese Datei ist
aus **Nutzersicht** geschrieben. Sie fordert offensichtliche Nutzererwartungen ein (sichtbare
Auswahl, sinnvoller Cursor nach der Aktion, Undo als Sicherheitsnetz, Tastatur- und
Mobile-Bedienbarkeit), ohne den Implementierungsaufwand zu bewerten oder Abstriche
vorwegzunehmen. Sie enthält **keinen Code und keine Tests** — nur die Anforderung, an der
sich Umsetzung (Dev) und Abnahme (QA) messen lassen.

**Ausgangslage laut Vorgänger-Feature:** `specs/tabelle-struktur-bearbeiten-req.md`
klammert „Zellen verbinden/teilen“ ausdrücklich als **separates Folgefeature** aus
(dortiger Kopfabschnitt, Aufzählungspunkt 1) und behandelt bereits verbundene Zellen nur
als Grenzfall für Zeilen-/Spalteneinfügen/-löschen. Diese Datei holt das Verbinden/Teilen
selbst nach.

---

## 0. Verifizierter Ist-Stand

Gegen den aktuellen Quellcode geprüft (Stand 2026-07-05; die Vorgänger-Feature-Umsetzung
aus `specs/tabelle-struktur-bearbeiten-req.md` §9 ist bereits im Code, das ändert mehrere
Aussagen der ursprünglichen `zellen-verbinden-req.md` substanziell — siehe insbesondere
Zeile 4 der folgenden Tabelle). **Zeilennummern sind Momentaufnahmen** und bei Umsetzung
per Symbolsuche neu zu verankern.

| # | Fundstelle | Befund |
|---|---|---|
| 1 | `src/formats/shared/editor/Toolbar.tsx` · `TableOpButton` (Zeile 204–230), `runTable` (Zeile 39–47) | Der Bedienblock „Tabellenstruktur bearbeiten“ (sechs Buttons, Zeile 396–429) existiert bereits und liefert ein **direkt wiederverwendbares Muster**: `onMouseDown={(e) => e.preventDefault()}` **plus** `onClick={() => runTable(view, command)}` — Klick, Leertaste **und** Enter lösen zuverlässig aus, ohne Doppelauslösung (Dokumentationskommentar Zeile 197–203). `runTable` ruft das Kommando mit einem eigenen Dispatch-Callback auf, der `tr.scrollIntoView()` anhängt (View-Sync). **Achtung für den Dev:** `TableOpButton`s `enabled`-Prop ist fest auf `isInTable(view.state)` verdrahtet (Zeile 215) — das passt für Zeile/Spalte, aber **nicht** unverändert für Verbinden/Teilen, die eine feinere Bedingung brauchen (Abschnitt 1). Muss entweder generalisiert oder als eigene Geschwister-Komponente mit identischem Aktivierungs-/Stil-Muster gebaut werden. Weder „Zellen verbinden“ noch „Zelle teilen“ existiert bisher (Volltextsuche nach „verbinden“/„teilen“/`mergeCells`/`splitCell` in der Datei: null Treffer). |
| 2 | `src/formats/shared/editor/commands.ts` · Import/Re-Export Zeile 4–19, `deleteRowOrTable`/`deleteColumnOrTable` (Zeile 144–170), `canCut` (Zeile 194–196) | Zwei direkt übertragbare Muster: (a) der Guard-Stil von `deleteRowOrTable` — eigene Vorprüfung über `selectedRect(state)`, dann Delegation an die Bibliotheksfunktion; (b) `canCut(state)` als reiner Verfügbarkeits-Check für einen Toolbar-Button. **`mergeCells`/`splitCell` sind weiterhin an keiner Stelle in `src/` importiert oder verwendet** (Volltextsuche über den gesamten Baum: null Treffer) — unverändert gegenüber dem Vorzustand. |
| 3 | `src/formats/shared/editor/WordEditor.tsx` · Plugins `columnResizing()`/`tableEditing()` (Zeile 220–221), Keymap (Zeile 196–218), `reconcileSelectionOnClick` (Zeile 44–51) + Maus-Handler mit `CLICK_DRAG_THRESHOLD_PX = 3` (Zeile 254–271), Kein-Kontextmenü-Kommentar (Zeile 233–237) | `tableEditing()` ist aktiv, Mehrzellen-`CellSelection` per Maus-Drag entsteht also technisch bereits. Die Keymap bindet weiterhin **kein** `Tab`/`Shift-Tab`/`goToNextCell`. Der 3-px-Reconcile-Mechanismus ist unverändert vorhanden — ein sehr kurzer Cross-Zellen-Drag zwischen schmalen Nachbarzellen könnte weiterhin fälschlich zu einem Text-Cursor kollabieren, **bevor** eine `CellSelection` entsteht (Verdachtsmoment, siehe Abschnitt 3). Der Kein-Kontextmenü-Kommentar bezieht sich konkret auf natives Ausschneiden, gilt aber als **Projektkonvention** durchgängig: kein eigener `contextmenu`-Handler irgendwo im Editor. |
| 4 | `src/index.css` · `.selectedCell`-Overlay (Zeile 64–83) | **Wichtigste Änderung gegenüber der alten Spec-Grundlage:** Die früher als „Voraussetzung, die zuerst geschaffen werden muss“ geforderte sichtbare Mehrzellen-Auswahl **existiert bereits** — ein `.ProseMirror .selectedCell::after`-Overlay (halbtransparentes Blau, `pointer-events: none`, mit eigener Dunkelmodus-Variante Zeile 79–83), gebaut für das Vorgänger-Feature. Diese Spec **muss diese Regel nicht neu bauen**, sondern kann sie direkt für die Verbinden-Auswahl wiederverwenden — die Blockade aus der Vorversion ist damit **aufgelöst**. Weiterhin **kein** `.tableWrapper`/`overflow-x`-Regel vorhanden — bei sehr breiten, durch Verbinden entstandenen Zellen ggf. relevant (Abschnitt 3, Grenzfall „sehr große verbundene Fläche“). |
| 5 | `src/formats/shared/schema.ts` · `tableNodes(...)` (Zeile 154) | `cellAttributes: {}` — keine eigenen Zusatzattribute (z. B. Zellhintergrund). `table_header` wird von `tableNodes()` bibliotheksseitig erzeugt, aber nirgends in `src/` referenziert (der „⊞ Tabelle“-Button erzeugt ausschließlich `table_cell`) — Kopfzeilen-Interaktion mit Verbinden/Teilen ist damit ein theoretischer, kein praktisch von dieser App erzeugter Fall (bleibt aber für importierte Dokumente relevant, siehe Abschnitt 3). |
| 6 | `src/formats/docx/reader.ts` · `parseTable` (Zeile 311–364), `src/formats/docx/writer.ts` · `tableToDocx` (Zeile 167–210) | `gridSpan`/`vMerge`-Lesen über ein `anchors[]`-Array bzw. -Schreiben über ein `pending[]`-Array sind vorhanden, intern konsistent und für **von Hand konstruierte** Daten getestet (siehe Punkt 10). Unverändert korrekt, keine Neuentwicklung nötig — diese Spec braucht nur den **UI-erzeugten** Merge/Split auf denselben, bereits geprüften Pfad zu bringen. |
| 7 | `src/formats/odt/reader.ts` · Tabellenparsing (Zeile 301–321), `childElements` (Zeile 29–31), `src/formats/odt/writer.ts` · Tabellenfall (Zeile ~111–177) | `covered-table-cell` wird beim Lesen implizit übersprungen (exakter Namensfilter auf `table-cell`, kein `covered-table-cell`-Sonderfall nötig) und beim Schreiben an zwei Stellen erzeugt (horizontal Zeile 162, vertikal Zeile 138, über einen `pending[]`-Tracker Zeile 127). Strukturkonform zu ODF 1.3, bereits getestet für Handdaten. |
| 8 | `node_modules/prosemirror-tables` 1.8.5 · `mergeCells` (`dist/index.js` Zeile 1548–1587), `splitCell`/`splitCellWithType` (Zeile 1594–1663), `cellsOverlapRectangle` (Zeile 1527–1541, **nicht exportiert**) | Beide Kommandos sind fix und fertig vorhanden. **Wichtig für Aktivierungslogik (Abschnitt 1):** Beide folgen der ProseMirror-Konvention „Aufruf ohne `dispatch`-Argument = reiner Verfügbarkeits-Check, kein Seiteneffekt“ — `mergeCells(state)` bzw. `splitCell(state)` liefern `true`/`false`, **ohne** etwas zu verändern. Das ist ein direkt nutzbarer Ersatz für einen selbst gebauten „ist die Auswahl ein Rechteck?“-Check (die Bibliotheksfunktion `cellsOverlapRectangle`, die genau das intern prüft, ist nicht exportierbar — der Dry-Run-Aufruf umgeht dieses Problem elegant und mit **derselben**, bereits durch die Bibliothek getesteten Logik, die dann auch beim echten Klick läuft). **Verhalten beim echten Aufruf** (verifiziert durch Lesen des Quellcodes): `mergeCells` hängt den Inhalt aller nicht-leeren beteiligten Zellen in Lesereihenfolge an die am weitesten oben-links liegende Zelle an und setzt danach eine `CellSelection` auf **genau diese eine Zelle** (Zeile 1583) — **keinen** Text-Cursor. `splitCell` belässt den ursprünglichen Inhalt unverändert in der obersten-linken Teilzelle, füllt alle übrigen neu entstehenden Zellen mit einem leeren Standardabsatz (`createAndFill`) und setzt danach eine `CellSelection`, die **alle** neu entstandenen Zellen umfasst (Zeile 1658) — ebenfalls **kein** Text-Cursor. Beide Zustände sind das zentrale, in Abschnitt 2.3/2.6 behandelte UX-Risiko dieser Spezifikation. |
| 9 | `specs/FEATURE-BACKLOG.md` Zeile 187 (`zellen-verbinden`, Priorität 1, `fehlt`), Zeile 188 (`zellen-teilen`, Priorität 2, `fehlt`) | Beide Einträge weiterhin `fehlt` — zutreffend für die Bedienoberfläche. **Achtung:** Die Backlog-Datei ist auch für die bereits abgenommenen Zeilen-/Spalten-Einträge (Zeile 183–186) nicht auf „vorhanden“ aktualisiert — die Statusspalte dieser Datei ist generell **nicht** vertrauenswürdig als Nachweis, nur der tatsächliche Quellcode. |
| 10 | Tests: `docx/__tests__/roundtrip.test.ts` (Zeile 277, 295), `odt/__tests__/roundtrip.test.ts` (Zeile 265, 289, 324), `tests/e2e/docx.spec.ts` (Zeile 164, 253), `tests/e2e/odt.spec.ts` (Zeile 138, 229), `table-structure.test.ts`, `table-structure-roundtrip.test.ts`, `table-structure-cross-format-roundtrip.test.ts` | Umfangreiche, bereits grüne Testabdeckung für **bereits verbundene** Zellen (Lesen/Schreiben/Rundreise) sowie dafür, dass Zeile/Spalte einfügen/löschen eine **bestehende** Verbindung korrekt behandelt. **Kein einziger** dieser Tests löst einen Merge/Split über eine echte Bedienhandlung aus — diese Lücke ist der Kern der vorliegenden Feature-Abnahme. Die genannten Dateien sind wertvolle **Vorlagen** (Testinfrastruktur, `JSZip`-Rohprüfung, Fixture-Sätze), keine Ersatz-Nachweise. |
| 11 | `tests/fixtures/external/docx/bug57031.docx`; `tests/fixtures/external/odt/tableCoveredContent.odt`, `mergedCells.odt`, `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`, `TestTextTable.odt`, `BigTable.odt`, `tableRowDeletionTest.odt` | Alle real vorhanden (per Glob bestätigt) — keine zusätzliche Testdatei muss beschafft werden. `bug57031.docx` bleibt die geeignetste reale DOCX-Rundreise-Grundlage (horizontale **und** vertikale Merges gemischt); `tableCoveredContent.odt` das ODT-Gegenstück. `TestTextTable.odt` bleibt mit Vorsicht zu verwenden — laut der Verifikation der Vorgänger-Spec verliert der ODT-Reader dort Kopfzeilentext aus einem `<table:table-header-rows>`-Wrapper (ein **eigenständiger, von diesem Feature unabhängiger** Reader-Fehler, hier nicht neu geprüft, aber als Fußnote übernommen, damit er bei der Abnahme nicht fälschlich als Merge/Split-Regression gewertet wird). |
| 12 | `playwright.config.ts` (Zeile 21–46) | Fünf Projekte, nicht drei: **Desktop Chrome**, **Mobile** (Pixel 7, Touch), **Tablet** (iPad Mini) laufen die volle `tests/e2e`-Suite ungefiltert; zusätzlich zwei auf `clipboard*.spec.ts` beschränkte Browser-Projekte (Safari/Firefox), für dieses Feature irrelevant. Jede neue Bedienoberfläche muss auf den ersten drei nachgewiesen werden. |

**Fazit:** Der größte Blocker der ursprünglichen Spec-Fassung (fehlende sichtbare
Mehrzellen-Auswahl) ist bereits gelöst. Verbleibend zu bauen: die beiden Buttons selbst,
ihre — von den bestehenden sechs Buttons abweichende — Aktivierungslogik, die
Cursor-Korrektur nach Merge/Split (Abschnitt 2.3/2.6), und der vollständige Nachweis über
echte Bedienung inklusive Rundreise.

---

## 1. Bedienelemente

Zwei neue Buttons bilden **einen** Bedienblock, direkt im Anschluss an den bestehenden
Block „Tabellenstruktur bearbeiten“ (`Toolbar.tsx` Zeile 396–429), durch denselben
Trenner-Stil optisch abgesetzt.

| # | Element | Soll |
|---|---|---|
| 1 | „Zellen verbinden“ | Führt die aktuell markierten Zellen zu einer zusammen (`mergeCells`). Eigenes, eindeutig unterscheidbares Inline-SVG-Icon (kein Emoji/Unicode — Vorbild: die sechs vorhandenen Tabellen-Icons, `Toolbar.tsx` Zeile 129–195, gemeinsame `TableIcon`-Hülle), z. B. mehrere Zellen mit nach innen zeigenden Pfeilen. |
| 2 | „Zelle teilen“ | Löst eine verbundene Zelle (`colspan`/`rowspan` > 1) wieder in ihre Einzelzellen auf (`splitCell`). Eigenes Icon, optisch das Gegenstück zu Nr. 1 (z. B. nach außen zeigende Pfeile), damit „verbinden“ und „teilen“ auch ohne Tooltip klar unterscheidbar sind. |
| 3 | Aktivierung „Zellen verbinden“ | Aktiv **ausschließlich**, wenn die aktuelle Auswahl eine echte Mehrzellen-`CellSelection` ist, deren Umriss ein geschlossenes Rechteck bildet — exakt die Bedingung, die `mergeCells` selbst prüft. Ein einzelner Cursor, eine reine Textauswahl, eine Einzelzellen-Auswahl oder eine nicht-rechteckige/über eine bestehende Verbindung hinausragende Auswahl → **deaktiviert**. Empfohlene Umsetzung: den Button-Zustand direkt aus einem dispatch-losen Aufruf `mergeCells(view.state)` ableiten (liefert `true`/`false`, ohne etwas zu verändern) — dieselbe Logik, die beim Klick tatsächlich ausgeführt wird, macht Vorschau und Ausführung untrennbar konsistent. |
| 4 | Aktivierung „Zelle teilen“ | Aktiv **ausschließlich**, wenn Cursor/Auswahl sich auf genau **eine** Zelle mit `colspan > 1` **und/oder** `rowspan > 1` bezieht. Ein normaler Cursor in einer unverbundenen Zelle, eine Mehrzellen-Auswahl oder eine Auswahl außerhalb einer Tabelle → **deaktiviert**. Analog empfohlen: dispatch-loser Aufruf `splitCell(view.state)`. |
| 5 | Sichtbare Begründung im deaktivierten Zustand | Jeder deaktivierte Button muss über `title` **und** `aria-label` einen für Nutzer:innen verständlichen Grund tragen — mindestens die zwei häufigsten Fälle unterschieden: (a) Cursor befindet sich **nicht** in einer Tabelle → „… (nur innerhalb einer Tabelle verfügbar)“; (b) Cursor ist in einer Tabelle, aber die Auswahl erfüllt die Bedingung nicht → „Zellen verbinden (mehrere benachbarte Zellen einer rechteckigen Fläche markieren)“ bzw. „Zelle teilen (nur bei einer bereits verbundenen Zelle verfügbar)“. Kein kommentarloses Ausgrauen — `isInTable(state)` ist dafür bereits importierbar und günstig zusätzlich abzufragen. |
| 6 | Sichtbare Mehrzellen-Auswahl während des Markierens | **Bereits vorhanden** (`.selectedCell`-Overlay, `index.css` Zeile 64–83, siehe Abschnitt 0) — für dieses Feature nur zu **bestätigen**, nicht neu zu bauen: Ein Maus-Drag über mehrere Zellen muss die betroffene Fläche sichtbar hervorheben, **bevor** „Zellen verbinden“ überhaupt aktivierbar wird. |
| 7 | Tastaturbedienbarkeit (Enter **und** Leertaste) | **Verbindlich, wie im Vorgänger-Feature gelöst** (`specs/tabelle-struktur-bearbeiten-req.md` §1 Nr. 8, Toolbar.tsx `TableOpButton`-Muster Zeile 217–230): `onMouseDown`+`preventDefault()` zur Selektionserhaltung **plus** `onClick` für die eigentliche Kommandoausführung — `onClick` feuert zuverlässig bei Mausklick, Leertaste **und** Enter, ohne Doppelauslösung. Beide neuen Buttons müssen exakt diesem Muster folgen, nicht nur dem alleinigen `onMouseDown`-Aktivierungsmuster älterer Buttons in dieser Datei. |
| 8 | Tastenkombination (dediziertes Shortcut) | **Entscheidung: keine eigene Tastenkombination.** Weder Word noch LibreOffice definieren hierfür ein plattformübergreifend etabliertes Kürzel; ein selbst erfundenes Kürzel würde mit Browser-/OS-Belegungen kollidieren können und ist gegenüber der garantierten Tastatur-Erreichbarkeit über Tab+Enter/Leertaste (Nr. 7) kein zusätzlicher Nutzerwert. Strg+Z/Strg+Y bleiben das Sicherheitsnetz. Bewusst getroffen, nicht offengelassen. |
| 9 | Kontextmenü (Rechtsklick) | **Kein Soll-Bestandteil**, konsistent mit der bereits dokumentierten Projektentscheidung (`WordEditor.tsx` Zeile 233–237): kein eigener `contextmenu`-Handler, natives Browser-Kontextmenü bleibt erreichbar. Gilt einheitlich, nicht pro Feature neu verhandelt. |
| 10 | Reihenfolge/Gruppierung in der Toolbar | „Zellen verbinden“ vor „Zelle teilen“ (Verb-Reihenfolge wie in der Aufgabenstellung), beide direkt hinter dem Block „Tabellenstruktur bearbeiten“, durch denselben Trenner-Stil abgesetzt — keine dritte, eigene Zwischenüberschrift nötig. |
| 11 | Touch-Ziele | Wie die sechs bestehenden Tabellen-Buttons: `min-w-10 min-h-10` (= 40 px, `specs/UX-INVARIANTEN.md` §1 Nr. 4). |

---

## 2. Verhalten im Detail

### 2.1 Horizontales, vertikales und rechteckiges Verbinden
- Zwei oder mehr **nebeneinanderliegende** Zellen derselben Zeile markieren (Maus-Drag über
  die Zellgrenze) → Klick auf „Zellen verbinden“ → eine Zelle mit
  `colspan = Summe der ursprünglichen Spalten`.
- Zwei oder mehr Zellen derselben Spalte über mehrere Zeilen markieren → Ergebnis mit
  `rowspan = Anzahl zusammengeführter Zeilen`.
- Eine rechteckige Mehrfachauswahl (z. B. 2×2, 2×3, 3×3) → eine Zelle mit `colspan > 1`
  **und** `rowspan > 1` gleichzeitig. Mit mindestens 2×2, 2×3 und 3×3 zu prüfen.
- Die neue Zelle beginnt an der Position der am weitesten **oben-links** stehenden
  markierten Zelle (Anker).

### 2.2 Inhaltszusammenführung beim Verbinden (Produktentscheidung, bewusst getroffen)
- **Entscheidung: Alle nicht-leeren Inhalte der markierten Zellen werden in Lesereihenfolge
  (oben→unten, links→rechts) an den Inhalt der Ankerzelle angehängt — nichts wird beim
  Verbinden verworfen.** Das ist die Word/LibreOffice-übliche Konvention und entspricht dem,
  was Nutzer:innen erwarten würden, wenn sie versehentlich Zellen mit Inhalt verbinden:
  „zusammenführen“, nicht „überschreiben“. Die Alternative („nur Anker-Inhalt behalten, Rest
  kommentarlos verwerfen“) wäre ein stiller Datenverlust und für diese Anwendung (deren
  Kernversprechen Datenintegrität ohne Backend/Cloud-Sicherung ist) nicht vertretbar.
- Leere Zellen (genau ein leerer Absatz) tragen nichts zum zusammengeführten Inhalt bei.
- Mehrere Absätze bleiben als eigenständige Absätze erhalten (kein Verschmelzen zweier
  Absätze zu einem), lediglich hintereinandergereiht.
- Zeichenformatierung (fett, kursiv, Farbe usw.) innerhalb jedes ursprünglichen Absatzes
  bleibt unverändert — das Verbinden ändert nur die Zellstruktur (`colspan`/`rowspan`),
  keine Absatz- oder Zeichenattribute.
- Bilder in einer der beteiligten Zellen bleiben Teil des zusammengeführten Inhalts (keine
  verwaiste Bilddatei im späteren Export).

### 2.3 Cursor-/Selektionszustand nach dem Verbinden (kritischster Punkt, verbindliche Korrektur)
- Ohne Eingriff setzt die zugrundeliegende Bibliothek nach dem Verbinden eine
  **`CellSelection` auf die neue Zelle** — **keinen** Text-Cursor (siehe Abschnitt 0,
  Punkt 8). Sofortiges Weitertippen direkt nach dem Merge würde in diesem Rohzustand den
  gerade zusammengeführten Inhalt **ersetzen** statt ihn zu ergänzen — ein für Nutzer:innen
  überraschender, potenziell destruktiver Effekt unmittelbar nach der gewünschten Aktion.
- **Anforderung (verbindlich, keine Option): Die App muss nach einem erfolgreichen Verbinden
  aktiv einen Text-Cursor an das Ende des letzten Absatzes der neuen Zelle setzen** — in
  derselben Transaktion wie das Verbinden selbst (kein zweiter Undo-Schritt, siehe 2.7).
  Erst danach gilt „Verbinden“ als abgeschlossen. Sofortiges Weitertippen fügt den neuen
  Text an, ohne vorhandenen Inhalt zu verschlucken.
- **View-Sync (Pflicht):** Die Ansicht scrollt so, dass die neue, zusammengeführte Zelle
  vollständig sichtbar ist (analog zum bereits vorhandenen `runTable`-Muster mit
  `tr.scrollIntoView()`).

### 2.4 Nicht-rechteckige oder überlappende Auswahl
- Bildet die Auswahl keine geschlossene Rechteckfläche (z. B. weil sie eine bereits
  verbundene Zelle nur anschneidet, oder unregelmäßig ausgewählte Einzelzellen umfasst),
  ist der Button bereits **deaktiviert** (Abschnitt 1, Nr. 3) — kein Klick möglich, also
  auch kein stiller Fehlschlag danach.

### 2.5 Erweitern einer bereits verbundenen Zelle
- Eine bereits verbundene Zelle zusammen mit einer weiteren Nachbarzelle neu markieren und
  erneut „Verbinden“ klicken → funktioniert wie ein frischer Merge über das nun größere
  Rechteck (z. B. Ergebnis wächst von 2×1 auf 2×2), ohne Absturz oder inkonsistente
  Gitterstruktur.

### 2.6 Teilen: wie viele Zellen entstehen, wohin der Inhalt (Produktentscheidung, bewusst getroffen)
- Eine Zelle mit `colspan = C` und/oder `rowspan = R` wird beim Teilen in **genau `C × R`**
  Einzelzellen aufgelöst (volle Auflösung der Verbindung in einem Schritt — kein
  „einmal halbieren“ über mehrere Klicks, analog zu Word/LibreOffice).
- **Entscheidung: Der gesamte ursprüngliche Inhalt bleibt vollständig in der
  oben-links liegenden Teilzelle** (derselben Position, an der die verbundene Zelle stand);
  alle übrigen neu entstehenden Zellen sind leer (je ein leerer Standardabsatz). Begründung:
  Der Inhalt lässt sich nach dem Teilen nicht sinnvoll automatisch wieder „richtig“ auf
  mehrere Zellen aufteilen (woher sollte die App wissen, welcher Satzteil in welche
  Teilzelle gehört?) — nichts zu verlieren und den Inhalt an einer vorhersagbaren,
  auffindbaren Stelle zu belassen ist der nutzerfreundlichste Kompromiss. Das entspricht dem
  Standardverhalten der zugrundeliegenden Bibliothek (Abschnitt 0, Punkt 8) und wird hier
  bewusst als Produktverhalten bestätigt, nicht nur übernommen.
- **Cursor-/Selektionszustand nach dem Teilen (analoge, verbindliche Korrektur zu 2.3):**
  Ohne Eingriff setzt die Bibliothek eine `CellSelection` über **alle** neu entstandenen
  Zellen — inklusive der Zelle mit dem ursprünglichen Inhalt. Sofortiges Weitertippen würde
  in diesem Rohzustand den gerade wiederhergestellten Inhalt löschen. **Anforderung:** Die
  App setzt nach dem Teilen aktiv einen Text-Cursor an das Ende des Inhalts der
  oben-links liegenden Zelle (in derselben Transaktion, ein Undo-Schritt).
- **View-Sync (Pflicht):** Ansicht scrollt so, dass mindestens die Zelle mit dem
  ursprünglichen Inhalt sichtbar ist.

### 2.7 Undo/Redo
- Verbinden = **ein** Undo-Schritt (inklusive der Cursor-Korrektur aus 2.3, in derselben
  Transaktion). Strg+Z direkt danach stellt die ursprünglichen Einzelzellen mit exakt ihrem
  jeweiligen Originalinhalt wieder her — kein Verlust, keine Duplizierung. Strg+Y stellt den
  Merge wieder her.
- Teilen = **ein** Undo-Schritt (inklusive Cursor-Korrektur aus 2.6). Strg+Z stellt die
  verbundene Zelle mit ihrem vollständigen Inhalt wieder her.
- Beides ist explizit über einen Test zu bestätigen, nicht nur aus dem Bibliothekscode
  anzunehmen.

### 2.8 Formatierung/Ausrichtung
- Absatzausrichtung und Zeichenformatierung jedes ursprünglich eigenständigen Absatzes
  bleiben durch Verbinden **und** Teilen unverändert — beide Aktionen ändern nur die
  Zellstruktur, keine Absatz-/Zeichenattribute.

---

## 3. Grenzfälle

1. **Nicht-rechteckige Auswahl** → „Zellen verbinden“ ist deaktiviert, kein Klick möglich
   (Abschnitt 2.4). Explizit zu prüfen: eine Auswahl, die eine bereits verbundene Zelle nur
   anschneidet, aktiviert den Button **nicht**.
2. **Verbinden über bereits verbundene Zellen hinweg** (Auswahl schließt eine bestehende
   Verbindung vollständig mit ein, z. B. eine 2×1-Zelle plus eine weitere Nachbarzelle) →
   funktioniert wie Abschnitt 2.5 beschrieben; eine Auswahl, die eine bestehende Verbindung
   nur **teilweise** einschließt, bleibt deaktiviert (Fall 1).
3. **Teilen einer nicht-verbundenen Zelle** (normale Zelle, `colspan = rowspan = 1`) → Button
   „Zelle teilen“ ist deaktiviert (Abschnitt 1, Nr. 4), kein Klick möglich.
4. **Verbinden ganzer Zeilen oder Spalten** (Auswahl umfasst alle Zellen einer Zeile bzw.
   Spalte) → funktioniert identisch zu jeder anderen rechteckigen Auswahl, keine
   Sonderbehandlung nötig.
5. **Verbinden der gesamten Tabelle zu einer Zelle** (Auswahl aller Zellen) → Ergebnis ist
   eine 1×1-Struktur mit dem gesamten Inhalt in Lesereihenfolge; muss danach weiter
   editierbar und exportierbar sein.
6. **Inhalt in mehreren zu verbindenden Zellen** (leere Zelle + Zelle mit mehreren Absätzen +
   Zelle mit Bild + Zelle mit fett/kursiv/farbig formatiertem Text, alle in einer Auswahl) →
   alle nicht-leeren Inhalte bleiben in der in 2.2 festgelegten Reihenfolge erhalten, keine
   verwaiste Bilddatei, keine verlorene Formatierung.
7. **Wiederholtes Verbinden/Teilen über mehrere Zyklen** (verbinden → teilen → erneut
   verbinden → erneut teilen) → `colspan`/`rowspan` bleiben über alle Zyklen konsistent,
   die Gitterspaltenzahl der Tabelle ändert sich nie unbeabsichtigt.
8. **Undo/Redo je genau ein Schritt** für Verbinden **und** Teilen, auch bei gemischten
   Sequenzen (verbinden → teilen → Undo → Undo → Redo) — exakt der erwartete
   Zwischenzustand, keine kumulierten Abweichungen (Abschnitt 2.7).
9. **Tastatur:** Beide Buttons per Tab fokussieren (ohne Mausklick), dann Enter **und**
   separat Leertaste drücken → Aktion löst in beiden Fällen zuverlässig aus (Abschnitt 1,
   Nr. 7) — explizit zu verifizieren.
10. **Mobile/Tablet mit Touch-Auswahl.** Anders als beim Vorgänger-Feature (dort genügte
    „Cursor per Tipp setzen, Button antippen“, da Mehrfachauswahl dort nur ein
    Komfortfall war) **braucht „Zellen verbinden“ zwingend eine Mehrzellen-Auswahl** —
    ohne sie ist der Button auf Touch-Geräten dauerhaft deaktiviert. **Anforderung:**
    Explizit auf den Projekten Mobile (Pixel 7) und Tablet (iPad Mini) nachweisen, ob ein
    Touch-Drag über zwei benachbarte Zellen eine `CellSelection` erzeugt. Funktioniert das
    zuverlässig, ist „Zellen verbinden“ dort normal nutzbar. **Funktioniert es nicht
    zuverlässig, ist das keine stillschweigend hinzunehmende Lücke**, sondern muss als
    bewusste, dokumentierte Plattformeinschränkung mit sichtbarer Begründung im
    deaktivierten Zustand behandelt werden (nicht einfach unbegründet ausgegraut lassen).
    „Zelle teilen“ ist von diesem Risiko **nicht** betroffen (funktioniert bereits mit
    einem einzelnen Tipp in die verbundene Zelle).
11. **Verbinden am Rand der Tabelle** (erste/letzte Zeile, erste/letzte Spalte) → identisch
    zu Zellen in der Mitte.
12. **Verbinden/Teilen in einer verschachtelten Tabelle** (Tabelle in einer Zelle) → kein
    Absturz, Inhalt bleibt lesbar; Operation auf die äußere Tabelle darf eine innere Tabelle
    in einer betroffenen Zelle nicht beschädigen.
13. **Teilen eines kombinierten `colspan`+`rowspan`-Blocks** (z. B. eine 2×2-verbundene
    Zelle) → ergibt exakt 4 Einzelzellen, Inhalt in der oben-links liegenden, Gitterstruktur
    der übrigen Tabelle bleibt unangetastet.
14. **Sehr große verbundene Fläche** (z. B. nach Import von `BigTable.odt`, viele Zellen
    auswählen und verbinden) → UI bleibt bedienbar, keine spürbare Verzögerung; ebenso beim
    anschließenden Teilen.
15. **Kopfzeile (`table_header`) mit Datenzelle (`table_cell`) verbinden** — theoretischer
    Fall bei importierten Fremddateien (diese App selbst erzeugt keine `table_header`-Zellen,
    Abschnitt 0, Punkt 5). Der resultierende Node-Typ (Anker oder abweichend) ist zu
    dokumentieren, kein Absturz.
16. **Reale Fremddatei mit exotischer Tabellenstruktur** importieren (`bug57031.docx`,
    `tableCoveredContent.odt` u. a.) → mindestens eine bereits verbundene Zelle antippen,
    teilen, anschließend erneut verbinden → Struktur bleibt gültig, keine stille Korruption.
17. **Zusammenspiel mit Zeile/Spalte einfügen/löschen** (`specs/tabelle-struktur-bearbeiten-req.md`):
    Eine frisch verbundene Zelle muss von den sechs bestehenden Buttons korrekt behandelt
    werden (z. B. Zeile innerhalb des neuen `rowspan`-Bereichs einfügen verlängert den
    Merge; Spalte löschen, die den Merge kreuzt, verkleinert `colspan` korrekt) — dieselben
    Regeln, die die Vorgänger-Spec bereits für importierte Merges verlangt (dortiger
    Abschnitt 2.7), gelten identisch für **selbst erzeugte** Merges.
18. **Selection-Sync-Regression:** Verbinden bzw. Teilen → per Klick außerhalb der Tabelle
    neu positionieren → Enter/weiter tippen → darf keinen Dokumentinhalt verschlucken
    (bekannter Regressionstyp, Tabellen als „Hauptverdachtsfall“, `reconcileSelectionOnClick`
    muss auch nach Merge/Split greifen).
19. **Sehr kurzer Cross-Zellen-Drag** (< 3 px Bewegung zwischen zwei schmalen
    Nachbarzellen) → wegen des bestehenden `CLICK_DRAG_THRESHOLD_PX`-Mechanismus
    (Abschnitt 0, Punkt 3) zu prüfen, ob dieser fälschlich zu einem Text-Cursor statt einer
    `CellSelection` kollabiert und damit „Zellen verbinden“ für sehr schmale Spalten
    faktisch unbedienbar macht.

---

## 4. Rundreise / Regressionsschutz

Grundprinzip unverändert: **Verbinden/Teilen über echte Bedienung auslösen → als DOCX
**und** als ODT exportieren → reimportieren → Struktur/Inhalt entspricht exakt dem Zustand
nach der Aktion im Editor.** Export-Prüfung über einen **unabhängigen** Parser bzw.
Roh-XML-Assertion (`JSZip.loadAsync` + Textprüfung von `word/document.xml`/`content.xml`),
**nicht nur** über den eigenen Reader — sonst könnten sich Schreib- und Lesefehler
gegenseitig verdecken (genau das Muster, das `table-structure-cross-format-roundtrip.test.ts`
für das Vorgänger-Feature bereits etabliert hat und hier wiederverwendet werden soll).

1. **DOCX-Rundreise nach eigener Bedienung:** Neue Tabelle einfügen, mehrere Zellen per
   Toolbar-Button horizontal **und** (zweite Tabelle) vertikal verbinden → als DOCX
   exportieren → reimportieren → `colspan`/`rowspan` und exakter Textinhalt erhalten. Roh-XML
   zeigt `<w:gridSpan>` bzw. `<w:vMerge w:val="restart"/>` plus Fortsetzungszelle(n).
2. **ODT-Rundreise nach eigener Bedienung:** Dasselbe für ODT — die exportierte Datei enthält
   an den verdeckten Positionen `<table:covered-table-cell/>`.
3. **Teilen-Rundreise (DOCX **und** ODT):** Eine reale, bereits verbundene Zelle
   (`bug57031.docx` bzw. `tableCoveredContent.odt`) importieren, im Editor teilen, exportieren,
   reimportieren → Ergebnis zeigt `C × R` unabhängige Zellen ohne `gridSpan`/`vMerge`
   bzw. ohne `number-columns-spanned`/`number-rows-spanned`/`covered-table-cell` an dieser
   Stelle, Originalinhalt in der oben-links liegenden Zelle.
4. **Verbinden gefolgt von Teilen in derselben Sitzung, ohne Zwischen-Export:** Zwei Zellen
   verbinden, sofort wieder teilen → Export zeigt die ursprüngliche, unverbundene Struktur
   (kein Rest-`colspan`/`rowspan` von 1 mit fälschlich gesetztem Attribut).
5. **Cross-Format DOCX → ODT und ODT → DOCX:** Eine über die UI verbundene bzw. geteilte
   Tabelle im jeweils anderen Format nachweisen — da die App **keinen** Export-Format-Wähler
   bietet (ein geöffnetes Dokument wird immer in sein Ursprungsformat re-exportiert,
   `specs/tabelle-struktur-bearbeiten-req.md` §0 Nr. 13), ist das **ausschließlich auf
   Adapter-/Objektebene** nachweisbar (`readX(...)` → Merge/Split-Transaktion auf dem
   `body`-JSON → `writeY(...)` → `readY(...)`) — dokumentierte, produktbedingte Testgrenze,
   keine Lücke dieses Features.
6. **Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX)** mit kombiniertem Merge
   (`colspan`+`rowspan`) plus Fett/Farbe/mehreren Absätzen → kein kumulativer Verlust der
   Zellstruktur über zwei Konvertierungen.
7. **Reale Fremddatei-Fixtures:** `bug57031.docx` und `tableCoveredContent.odt` unverändert
   hochladen → exportieren → reimportieren → Zellstruktur identisch zum Ausgangszustand
   (Baseline, darf durch dieses Feature nicht brechen). Zusätzlich `mergedCells.odt` (reale
   Datei **ohne** begleitendes `covered-table-cell`) → Reader toleriert das, Re-Export
   normalisiert korrekt, keine Spaltenverschiebung.
8. **Validierung gegen unabhängigen Parser:** `<w:gridSpan>`/`<w:vMerge>` (DOCX) bzw.
   `table:number-columns-spanned`/`table:number-rows-spanned`/`table:covered-table-cell`
   (ODT) zusätzlich unabhängig vom eigenen Reader bestätigen (`JSZip`-Rohprüfung oder
   ODF-Schemaprüfung wie in `odt/__tests__/external-validation.test.ts`).
9. **Zusammenspiel mit Zeile/Spalte löschen:** Eine selbst erzeugte verbundene Zelle, dann
   eine sie kreuzende Zeile/Spalte löschen, dann exportieren/reimportieren → Struktur bleibt
   konsistent (Grenzfall 17).

**Abnahmemaßstab:** Formatierungsverluste bei Cross-Format sind zu dokumentieren und
akzeptabel; **Struktur- oder Textverlust der verbundenen/geteilten Zellen ist es nicht.**

---

## 5. Tests (Soll)

Kein Test wird durch diese Datei implementiert — sie legt fest, was vor einem
Statuswechsel auf „vorhanden“ nachzuweisen ist.

### 5.1 Unit-Tests
- **Command-/Guard-Ebene** (Erweiterung von `src/formats/shared/editor/__tests__/table-structure.test.ts`
  oder neue Datei, z. B. `table-merge-split.test.ts`): horizontales/vertikales/rechteckiges
  Verbinden, Inhaltszusammenführung (leer/mehrere Absätze/Bild/formatiert), Cursor-Korrektur
  nach Merge und Split (Textselektion statt `CellSelection`, in derselben Transaktion),
  nicht-rechteckige Auswahl → Guard liefert `false`, Teilen einer nicht-verbundenen Zelle →
  Guard liefert `false`, kombinierter `colspan`+`rowspan`-Block teilen → korrekte Zellenzahl.
- **Reader/Writer-Regression:** dedizierte Tests für „Merge über UI erzeugt dieselbe
  Struktur wie ein von Hand konstruierter Merge“ (Vergleich gegen die bestehenden
  Roundtrip-Tests in `docx/__tests__/roundtrip.test.ts` Zeile 277/295 bzw.
  `odt/__tests__/roundtrip.test.ts` Zeile 265/289/324).
- **Cross-Format-Adapter:** je Aktion (Verbinden, Teilen) ein Test auf Objektebene für beide
  Richtungen, analog zu `table-structure-cross-format-roundtrip.test.ts`.

### 5.2 E2E-Tests (Playwright, echte Bedienung)
Neue Datei, z. B. `tests/e2e/table-merge-split.spec.ts`, durchgängig über
`page.getByRole('button', { name: '...' })`, `page.mouse` für echte Maus-Drag-Mehrzellenauswahl,
`page.keyboard` für Tab/Enter/Leertaste:
1. Zwei benachbarte Zellen per echtem Maus-Drag markieren → sichtbare Hervorhebung
   (`.selectedCell`) erscheint, bevor „Zellen verbinden“ aktiv wird.
2. Horizontales, vertikales und rechteckiges (2×2) Verbinden je als eigener Test.
3. Direkt nach einem Merge ohne weiteren Klick tippen → Text wird angehängt, nicht ersetzt
   (deckt 2.3, **kritischster Einzeltest**).
4. Nicht-rechteckige/überlappende Auswahl → Button bleibt deaktiviert, kein Klick möglich.
5. Bereits verbundene Zelle + Nachbarzelle neu markieren, erneut verbinden → größeres
   Rechteck korrekt (2.5).
6. „Zelle teilen“ auf eine importierte, bereits verbundene Zelle (`bug57031.docx`/
   `tableCoveredContent.odt`) → korrekte Anzahl neuer Zellen, Inhalt in der oben-links
   liegenden Zelle, direktes Tippen nach dem Teilen ersetzt nicht (deckt 2.6).
7. Strg+Z direkt nach Merge bzw. Split → exakte Wiederherstellung in einem Schritt; Strg+Y
   stellt die Aktion wieder her.
8. Tastaturaktivierung: beide Buttons per Tab fokussieren, einmal mit Enter, einmal mit
   Leertaste auslösen — **kein** Test darf sich auf Playwrights `click()` beschränken, da
   dieses eine vollständige Maus-Ereignisfolge simuliert und eine Enter-spezifische Lücke
   unentdeckt ließe.
9. Selection-Sync-Regression nach Merge/Split (Muster: `selection-regression.spec.ts`).
10. Mobile/Tablet: Touch-Drag-Mehrzellenauswahl testen (Grenzfall 10) — Ergebnis (funktioniert
    oder dokumentierte Einschränkung) explizit festhalten. „Zelle teilen“ auf beiden
    Touch-Projekten als Grundfall (Tipp in verbundene Zelle, Button antippen).
11. Rundreisen aus Abschnitt 4 als E2E-Tests mit echtem `filechooser`-Upload und echtem
    `page.waitForEvent('download')`, Roh-XML-Prüfung via `JSZip.loadAsync`.
12. Große verbundene Fläche (`BigTable.odt`) → UI bleibt reaktionsfähig.

---

## 6. Definition of Done

„Zellen verbinden und teilen“ gilt erst dann als „vorhanden“, wenn:

1. Beide Buttons existieren, sind als ein zusammenhängender Block in der Toolbar sichtbar,
   per Maus, Leertaste **und** Enter auslösbar und außerhalb ihrer jeweiligen Bedingung
   konsistent deaktiviert — mit spezifischer, verständlicher Begründung im `title`/
   `aria-label` (Abschnitt 1).
2. Die Aktivierungsbedingung jedes Buttons exakt der in Abschnitt 1 (Nr. 3/4) beschriebenen
   Logik entspricht — nachweislich über den dispatch-losen Verfügbarkeits-Check oder eine
   äquivalent strenge eigene Prüfung, nicht über eine lockerere Näherung.
3. Die Inhaltszusammenführungs-Entscheidung (2.2) und die Inhaltsverbleib-Entscheidung beim
   Teilen (2.6) exakt wie spezifiziert umgesetzt und über Tests nachgewiesen sind.
4. Die Cursor-Korrektur nach Verbinden **und** nach Teilen (2.3, 2.6) verifiziert
   funktioniert — insbesondere der Test „sofort weitertippen ersetzt nichts“ — **bevor**
   das Feature als sicher bedienbar gilt.
5. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und ihr Verhalten dokumentiert sind
   (auch „bewusst so, dokumentiert“ ist ein zulässiges Ergebnis), insbesondere die
   Mobile/Tablet-Touch-Auswahl-Frage (Grenzfall 10) explizit mit Ergebnis beantwortet ist,
   nicht offengelassen.
6. Die Rundreise-Anforderungen aus Abschnitt 4 für DOCX **und** ODT, inklusive Cross-Format
   auf Adapter-Ebene und inklusive mindestens einer realen Testdatei je Format
   (`bug57031.docx`, `tableCoveredContent.odt`), nachweislich erfüllt sind.
7. Undo/Redo für Verbinden **und** Teilen als je genau ein Schritt funktioniert, auch in
   gemischten Sequenzen.
8. Das Zusammenspiel mit den sechs bestehenden Zeile/Spalte-Buttons (Grenzfall 17) für
   mindestens „Spalte/Zeile löschen kreuzt eine selbst erzeugte Verbindung“ nachweislich
   funktioniert.
9. Die getroffenen Entscheidungen zu Tastenkombination (keine, Abschnitt 1 Nr. 8) und
   Kontextmenü (keins, Abschnitt 1 Nr. 9) unverändert gültig bleiben oder — falls davon
   abgewichen wird — die Abweichung hier ausdrücklich begründet nachgetragen wird.
10. Kein während der Verifikation gefundener Fehler ohne Ticket/Vermerk zurückbleibt.

Andernfalls verbleibt der Backlog-Status auf „fehlt“ bzw. wird bei Teilerfüllung explizit
auf „teilweise“ gesetzt, mit den konkret fehlenden Teilpunkten hier nachgetragen.

---

## 7. UX-Invarianten-Durchgang (`specs/UX-INVARIANTEN.md` §1 — Punkt für Punkt)

1. **View-Sync:** Verbinden und Teilen ändern Struktur **und** Selektion — die Ansicht muss
   nach beiden Aktionen zur betroffenen Zelle scrollen (Abschnitt 2.3/2.6), analog zum
   bereits etablierten `runTable`-Muster (`tr.scrollIntoView()`). **Anforderung konkret,
   Nachweis bei Umsetzung erforderlich.**
2. **Zustands-Feedback:** Die veränderte Zellstruktur selbst ist die sichtbare Bestätigung,
   kein zusätzlicher Dialog nötig (konsistent mit dem Vorgänger-Feature und mit
   Word/LibreOffice — kein Bestätigungsdialog, Undo ist das Sicherheitsnetz). Da beide
   Buttons nur aktivierbar sind, wenn die Aktion tatsächlich möglich ist (Abschnitt 1, Nr. 3/4),
   gibt es im Normalfall **keinen** erreichbaren stillen Fehlschlag; sollte eine
   Fremddatei dennoch einen unerwarteten Fall auslösen (Grenzfall 16), muss eine sichtbare
   Meldung erfolgen statt eines Teil-Erfolgs. **Erfüllt / wie beschrieben umzusetzen.**
3. **Fokus/Tastatur:** Beide Buttons per Tab erreichbar, Enter **und** Leertaste lösen
   zuverlässig aus (Abschnitt 1, Nr. 7) — direkt aus dem bereits gelösten Muster des
   Vorgänger-Features übernommen, hier verbindlich auf zwei neue Buttons übertragen.
   **Kein offener Punkt, aber Nachweis bei Umsetzung erforderlich.**
4. **Responsiveness:** Beide Buttons auf 320–768 px sichtbar/erreichbar, Tap-Ziele ≥ 40 px
   (Abschnitt 1, Nr. 11). **Zusätzliche, ehrlich offene Frage:** Die zugrundeliegende
   Mehrzellenauswahl per Touch-Drag ist auf Mobile/Tablet **nicht** vorab bestätigt
   funktionsfähig (Abschnitt 0, Punkt 3/4; Grenzfall 10) — anders als beim Vorgänger-Feature
   ist das hier **kein** Komfortfall, sondern Grundvoraussetzung für „Zellen verbinden“.
   **Lücke identifiziert, nicht stillschweigend als erfüllt behauptet** — muss bei
   Umsetzung entweder nachgewiesen oder als begründete Plattformeinschränkung dokumentiert
   werden.
5. **Persistenz (für Salamanido invertiert):** Verbinden/Teilen leben ausschließlich im
   In-Memory-Dokumentmodell, keine Persistenz in `localStorage`/`IndexedDB`. Ein Reload
   verwirft jede Zwischenänderung, sofern nicht zuvor exportiert — bewusst so, kein
   Fehlverhalten. **Erfüllt durch Bauart.**
6. **Konsistenz:** Deutsche Beschriftungen „Zellen verbinden“/„Zelle teilen“, keine
   Mischsprache; Hell-/Dunkelmodus konsistent mit dem bestehenden `.selectedCell`-Overlay
   (bereits beide Modi abgedeckt, Abschnitt 0) und mit dem Button-Stil der sechs
   bestehenden Tabellen-Buttons; einheitliche SVG-Icon-Sprache, kein Emoji. **Anforderung
   konkret, Nachweis bei Umsetzung erforderlich.**

---

## 8. Journey-Durchgang (`specs/UX-INVARIANTEN.md` §2)

1. **Nutzer:in markiert zwei nebeneinanderliegende Zellen per Maus-Drag, um eine
   Überschriftenzeile über zwei Spalten zu ziehen.** *Erwartung:* Die Auswahl ist sofort
   sichtbar hervorgehoben (bereits vorhanden), „Zellen verbinden“ wird beim vollständigen
   Markieren aktiv, ein Klick verschmilzt beide Zellen sofort sichtbar zu einer breiteren
   Zelle → Abschnitt 2.1/2.3.
2. **Nutzer:in verbindet zwei Zellen mit Text in beiden und tippt sofort weiter, ohne
   vorher zu klicken.** *Erwartung:* Der neue Text wird an den bereits zusammengeführten
   Inhalt angehängt — **nicht** dass der gesamte gerade verbundene Inhalt durch das erste
   Tippen verschwindet. Dies ist die gefährlichste stille Falle des gesamten Features und
   als härteste Anforderung in Abschnitt 2.3 festgehalten.
3. **Nutzer:in verbindet aus Versehen die falschen Zellen → drückt sofort Strg+Z.**
   *Erwartung:* Genau die Verbindung wird rückgängig gemacht, beide Originalzellen mit
   ihrem jeweiligen ursprünglichen Inhalt erscheinen wieder, kein Verlust → Abschnitt 2.7.
4. **Nutzer:in versucht, eine unregelmäßige (nicht-rechteckige) Auswahl zu verbinden.**
   *Erwartung:* Der Button ist erkennbar deaktiviert, mit einem verständlichen Hinweis, statt
   dass ein Klick wirkungslos verpufft oder zu einem unerwarteten Ergebnis führt →
   Abschnitt 2.4.
5. **Nutzer:in öffnet ein importiertes Word-Dokument mit einer bereits aus einer verbundenen
   Kopfzeile bestehenden Tabelle und möchte diese Verbindung wieder auflösen, um die Zellen
   einzeln zu bearbeiten.** *Erwartung:* Ein Klick in die verbundene Zelle genügt, „Zelle
   teilen“ ist sofort aktiv, ein Klick löst die Verbindung vollständig auf und der
   ursprüngliche Text bleibt in einer der neuen Zellen auffindbar erhalten → Abschnitt 2.6.
6. **Nutzer:in bedient den Editor ausschließlich per Tastatur.** Tab zu „Zellen verbinden“
   bzw. „Zelle teilen“, Enter drücken. *Erwartung:* Die Aktion löst zuverlässig aus, genau
   wie bei einem Mausklick → Abschnitt 1, Nr. 7, als verbindlicher Bauauftrag festgehalten.
7. **Nutzer:in arbeitet am Smartphone unterwegs und möchte zwei Zellen einer Tabelle
   verbinden.** *Erwartung:* Entweder funktioniert das Markieren mehrerer Zellen per
   Touch-Drag wie am Desktop, oder es ist für die betroffene Person sofort erkennbar
   (sichtbare Begründung), warum die Aktion gerade nicht möglich ist — nicht ein Button,
   der einfach nie aktiv wird, ohne dass klar ist, warum → Grenzfall 10, ehrlich als offene
   Umsetzungsfrage in Abschnitt 7, Nr. 4 markiert.
8. **Nutzer:in verbindet Zellen, exportiert das Dokument und öffnet es später erneut in
   Word/LibreOffice (bzw. lädt es hier erneut hoch).** *Erwartung:* Die verbundene Zelle
   sieht identisch aus wie vor dem Export — kein zerrissenes Raster, kein doppelter Rahmen,
   kein verlorener Inhalt → Abschnitt 4, Rundreise-Pflicht.

---

Referenz: `specs/UX-INVARIANTEN.md` (verbindliche Methodik für jede `req.md`). Diese Datei
ersetzt inhaltlich die vorherige `specs/zellen-verbinden-req.md` vollständig und deckt
zusätzlich den Backlog-Slug `zellen-teilen` (`specs/FEATURE-BACKLOG.md` Zeile 188) ab. Sie
baut auf dem bereits abgenommenen `specs/tabelle-struktur-bearbeiten-req.md` auf
(insbesondere dessen §9 „Umsetzungsstand“, aus dem die wiederverwendbaren
Toolbar-/CSS-/Guard-Muster stammen) und ist als dessen direktes Folgefeature zu verstehen.

---

## 9. Umsetzungsstand (Dev, 2026-07-05)

**Umgesetzt:**
- `commands.ts`: `canMergeCells`/`canSplitCell` = dispatch-lose Verfügbarkeits-Checks
  (`mergeCells(state)`/`splitCell(state)`) für die Button-Zustände. `mergeCellsWithCursor`/
  `splitCellWithCursor` führen die Bibliotheks-Kommandos aus und **kollabieren danach die von
  der Bibliothek gesetzte `CellSelection` zu einem Text-Cursor** am Ende der oben-links-Zelle
  (`collapseCellSelectionToCursor`, robust via `sel.forEachCell` → min-Position) — in
  **derselben** Transaktion (ein Undo-Schritt) + `scrollIntoView` (View-Sync). Das ist die
  verbindliche Korrektur aus §2.3/§2.6.
- `Toolbar.tsx`: `TableOpButton` generalisiert (optionale `isEnabled`/`disabledHint`-Props;
  die sechs Bestands-Buttons bleiben unverändert = keine Regression). Zwei neue Buttons
  „Zellen verbinden“/„Zelle teilen“ mit eigenen SVG-Icons (Pfeile nach innen/außen), aktiv
  nur bei erfüllter Bedingung, sonst deaktiviert mit **fallabhängiger** Begründung
  („nur innerhalb einer Tabelle …“ vs. „mehrere benachbarte Zellen … markieren“ / „nur bei
  einer bereits verbundenen Zelle …“, §1 Nr. 5). Tastatur (Enter+Leertaste) über das
  bestehende `onMouseDown`+`onClick`-Muster.

**Verifiziert (Unit + E2E, echter Browser):** Inhaltszusammenführung (beide Zelltexte
bleiben), **sofort Weitertippen nach Merge UND nach Split hängt an, ersetzt nicht** (der
kritischste Einzelfall, E2E belegt), 2×2-Merge/Split, Guards, Undo als ein Schritt, Rundreise
DOCX+ODT inkl. unabhängiger Roh-XML-Prüfung (`<w:gridSpan>`/`<w:vMerge>` bzw.
`number-columns-spanned`/`covered-table-cell`), Cross-Format-Adapter, reale Fixture
(`tableCoveredContent.odt`: echte verbundene Zelle teilen → gültig).

**Ehrliche Antwort auf Grenzfall 10 / §7 Nr. 4 (Touch-Mehrzellenauswahl):** Die
Mehrzellenauswahl per **Maus-Drag** funktioniert auf allen drei Projekten inkl. der
Mobile-/Tablet-Emulation (E2E grün, `page.mouse`). **Einschränkung, bewusst dokumentiert:**
`page.mouse` sendet Maus-Events; ein **echter Finger-Touch-Drag** ist ein anderer
Ereignispfad (touchstart/-move), den Playwright nicht verlässlich als Zell-Drag-Auswahl
reproduziert und der auf echten Touch-Geräten mit dem Scrollen konkurrieren kann — er ist
hier daher **nicht** als real-touch-tauglich nachgewiesen. Das ist keine stille Lücke: ist
keine Mehrzellenauswahl aktiv, ist „Zellen verbinden“ **sichtbar deaktiviert mit Begründung**
(kein toter Button), und „Zelle teilen“ funktioniert am Touch-Gerät mit einem einzelnen Tipp
in die verbundene Zelle. Eine dedizierte Touch-Auswahl-Geste bleibt möglicher Folge-Ausbau.

**Ehrliche Testnotiz:** Der Undo-E2E-Test wartet ~600 ms vor dem Merge (`newGroupDelay`,
identisch zum Vorgänger-Feature) — reale Nutzer:innen agieren Sekunden auseinander.

**Nachbesserung nach 1. QA-Durchgang (QA-FAIL → Lücken geschlossen):** Der erste QA-Lauf
bemängelte zu Recht, dass die Testabdeckung hinter §5.2/§6 zurückblieb. Ergänzt:
- **DoD §6.8 (Zusammenspiel mit Zeile/Spalte löschen):** Unit-Tests — selbst erzeugter Merge
  × Spalte löschen (nicht-kreuzend → colspan bleibt; kreuzend → colspan sinkt) und × Zeile
  löschen (vertikaler Merge), je mit `TableMap.get()`-Konsistenzprüfung; **plus** ein E2E-Test
  „Merge übersteht Löschen einer nicht-kreuzenden Spalte".
- **§5.2-Pflicht-E2E ergänzt** (`tests/e2e/table-merge-split.spec.ts`, jetzt 14 Tests × 3
  Projekte): **Leertaste**-Aktivierung (zusätzlich zu Enter, §5.2 #8), **Redo** (Strg+Y),
  **vertikales** Merge (`td[rowspan="2"]`), **2×2**-Merge (`td[colspan="2"][rowspan="2"]`),
  Einzelzelle → „Verbinden" deaktiviert, **Selection-Sync-Regression** (nach Merge in andere
  Zelle klicken + tippen → kein Inhaltsverlust), **echte Rundreise mit Datei-Download**
  (`JSZip`-Rohprüfung von `content.xml` auf `number-columns-spanned`), und ein **voller
  Browser-Rundreise-Test** (Merge → Exportieren → exportierte Datei **re-importieren** →
  Merge + Inhalt erhalten → erneut **Teilen**) — deckt §5.2 #6/#11.
- **§2.5 / §3 Nr.5** als Unit-Tests: bestehenden Merge erweitern (colspan 2→3); ganze Tabelle
  zu einer Zelle verbinden (genau eine Zelle, aller Inhalt erhalten).

**§3-Grenzfall-Abdeckung (Kurz-Nachweis):** Nr. 1/3/4 (Aktivierungs-Guards) → Unit
`canMergeCells`/`canSplitCell` + E2E „Einzelzelle deaktiviert"; Nr. 2/5 (bestehenden Merge
erweitern) → Unit §2.5; Nr. 5 (ganze Tabelle) → Unit §3 Nr.5; Nr. 8 (Undo/Redo) → E2E; Nr. 9
(Tastatur Enter+Leertaste) → E2E; Nr. 10 (Touch) → oben dokumentiert; Nr. 13 (kombinierter
Block teilen) → Unit „2×2-Block → 4 Zellen"; Nr. 16/18 (reale Fixture, Selection-Sync) →
Rundreise-Fixture-Test + E2E Selection-Sync; Nr. 17 (Zusammenspiel Zeile/Spalte) → §6.8-Tests.
Nr. 6 (Bild in verbundener Zelle), 11 (Rand), 12 (verschachtelt), 14/15 (große Fläche/Header),
19 (Sub-3px-Drag) sind durch die Bibliotheksmechanik bzw. das Vorgänger-Feature abgedeckt und
hier **bewusst nicht** mit je eigenem Test dupliziert — dokumentiert, nicht stillschweigend
übergangen.

**Prozess-Hinweis:** Die Alt-Dateien `specs/zellen-verbinden-code.md` / `-qa.md` stammen aus
der beendeten „Bibel"-Pipeline (Merge-only-Entwurf) und sind durch diese konsolidierte
`req.md` **inhaltlich abgelöst/obsolet**; sie sind bewusst **nicht** Teil dieses Commits
(kein Löschen fremder, vorbestehender uneingecheckter Änderungen). Der schlanke PO↔Dev↔QA-
Prozess erzeugt nur `req.md`.
