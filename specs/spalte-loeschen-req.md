# Feature „Spalte löschen" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe.** Backlog-Status ist „fehlt" und gilt laut Auftrag als
**nicht vertrauenswürdig** — jeder Punkt unten muss durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein, bevor der Status auf
„vorhanden" wechselt (siehe Abschnitt 9 „Verifikationsauftrag").

Bezug: `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 („Tabellen", höchste Priorität) und
Abschnitt 17 Zeile 20 („Tabellen-Kontextfunktionen … fehlt komplett in der UI — größte
Einzellücke im gesamten Funktionsumfang").

---

## 0.0 Kritische Nachprüfung dieser Fassung (Stand 2026-07-05, zweite Nachprüfung)

Diese Datei ist die **zweite** kritische Überarbeitung. Die erste Überarbeitung
(2026-07-04, Tabelle unten) hatte bereits mehrere Punkte der ursprünglichen Fassung
korrigiert — war aber selbst an einer zentralen Stelle noch **zu pessimistisch**: Ihr
„Befund 8" (ODT-`covered-table-cell`-Reader) wurde als offener **Blocker** geführt, obwohl
zum Zeitpunkt dieser zweiten Überarbeitung bereits zwei nachgelagerte, empirische
Verifikationen vorliegen (`specs/spalte-loeschen-code.md` Abschnitt 3, drei ausgeführte
Probe-Tests gegen echten Reader/Writer; `specs/spalte-loeschen-qa.md` Abschnitt A.4/D), die
zeigen: **Befund 8 ist kein Bug.** Diese zweite Nachprüfung hat das **unabhängig** direkt am
aktuellen Quelltext gegengeprüft (`src/formats/odt/reader.ts:301-321`,
`src/formats/odt/writer.ts:110-175`, siehe korrigierte Zeile unten) und übernimmt die
Korrektur nicht blind aus den Schwesterdokumenten. Zusätzlich wurden zwei weitere reale,
bisher unerwähnte Sachverhalte direkt verifiziert: **kein Cross-Format-Export über die UI**
(`src/app/DocumentWorkspace.tsx:68-95`, genau ein „Exportieren"-Button, `module.exportFile`
ist an das beim Öffnen gewählte Formatmodul gebunden) und eine **vorbestehende,
formatübergreifende `colCount`-aus-Zeile-0-Schwäche** in beiden Writern (relevant für reale
Fremddatei-Tests, siehe Abschnitt 4 Grenzfall 17/18 und Abschnitt 6.1).

Die erste Überarbeitung hatte ihrerseits die ursprüngliche Fassung Zeile für Zeile gegen
den **tatsächlichen aktuellen Code** geprüft (nicht nur gegen den früheren
`spalte-loeschen-code.md`, der teils schon veraltet war). Dabei wurden mehrere Aussagen
der Ursprungsfassung als **falsch oder veraltet** entlarvt und korrigiert — sie dürfen nicht
unbesehen übernommen werden. Die wichtigsten Korrekturen aus beiden Durchgängen:

| Thema | Frühere Fassung behauptete | Tatsächlicher Stand (2026-07-05, im Code verifiziert) | Konsequenz |
|---|---|---|---|
| CellSelection-Hervorhebung (Abschn. 1) | „wird von `prosemirror-tables` bereits mit einer Standard-Hervorhebung dargestellt … zu prüfen" | **Falsch.** `grep` über `src/` nach `selectedCell`/`tableWrapper`/`prosemirror-tables/style` liefert **null Treffer**; `src/index.css` hat keine `.selectedCell`-Regel und importiert die Bibliotheks-CSS nicht. Die markierte Spalte ist **aktuell komplett unsichtbar**. | Sichtbarkeit ist eine **zu bauende** Pflichtfunktion, kein „nur zu prüfen". Siehe Befund 12. |
| ODT-Writer `colCount` (vormals „Befund 7", offener Bug) | `odt/writer.ts` zähle nur die reine Zellenanzahl statt der `colspan`-Summe → Bug | **Bereits behoben.** `src/formats/odt/writer.ts:115-116` summiert die `colspan`-Werte (identisch zum DOCX-Writer) **und** schreibt `<table:covered-table-cell/>`-Platzhalter für `rowspan` (Zeile 137). | Kein offener Bug mehr — reduziert sich auf einen **Regressionstest**, der das so hält. Siehe Befund 7. |
| ODT-`covered-table-cell`-Reader (vormals „Befund 8", **in der ersten Überarbeitung noch als aktueller Blocker geführt**) | „Der Reader liest weiterhin **nur** `table-cell`. Damit bricht die Spaltenzuordnung auch bei **selbst erzeugten** ODT-Dateien mit `rowspan`" — echter Blocker für 5.2.3/5.2.4 | **Widerlegt, empirisch [in `spalte-loeschen-code.md` Abschn. 3 gemessen, hier unabhängig gegengeprüft].** `odt/reader.ts:304` überspringt `covered-table-cell` tatsächlich, aber **das ist für ODF korrekt**: `table:number-rows-spanned`/`-columns-spanned` sind explizite Attribute **am Anker** (ODF 1.3 §9.1.1) — anders als OOXML, wo `rowspan` implizit über gezählte `vMerge`-Fortsetzungen rekonstruiert werden muss (daher das Anker-Array in `docx/reader.ts`). `prosemirror-tables`s `TableMap` rekonstruiert die Spaltenposition allein aus `colspan`/`rowspan` der echten Zellen — die übersprungenen `covered-table-cell` sind reiner ODF-Pflicht-Padding und werden nicht gebraucht. Selbst erzeugte `rowspan`-ODTs **und** vier reale LibreOffice-Fixtures (u. a. `tableCoveredContent.odt`, 33 covered-cells, `rowspan` bis 6) reisen fehlerfrei rund. Ein Reader-Rewrite hätte `rowspan` sogar **doppelt gezählt** (Attribut **+** Folgezellen) und diese heute funktionierenden Fälle **zerstört**. | **Kein** Blocker, **keine** Reader-Änderung. Reduziert sich auf einen **Regressionstest**, der das bereits korrekte Verhalten absichert (Abschnitt 3.5, Grenzfall 6/18, Abschnitt 5.2.3/5.2.4, Abschnitt 6.2). |
| Kontextmenü-Frage (Abschn. 1 Zeile 4) | „offene Entscheidung, Kontextmenü-System ja/nein, null Treffer für `contextmenu`" | **Bereits entschieden.** `src/formats/shared/editor/WordEditor.tsx:117-121` dokumentiert die bewusste Projektentscheidung: **kein** eigenes Kontextmenü, **kein** `contextmenu`-`preventDefault` — das native Browser-Kontextmenü bleibt erreichbar. | Keine offene Frage mehr: Toolbar-Bedienelement, konsistent mit allen übrigen Aktionen. Siehe Befund 15. |
| „Befund 6" (DOCX-Writer `colCount`) | „muss verifiziert werden", potenzieller Bug bei `vMerge` in Zeile 0 | `docx/writer.ts:160` summiert `colspan` korrekt; `vMerge`-Fortsetzungen werden **nie** als eigene JSON-Zellen gespeichert → Zeile 0 kann strukturell keine enthalten. **Aktuell korrekt für reguläre Tabellen** — siehe aber die neu aufgenommene, unabhängige `colCount`-aus-Zeile-0-Schwäche bei irregulären Fremddateien (Abschnitt 6.1). | Kein Bug in der eigenen Erzeugung; nur eine Invariante, die per Test festgeschrieben wird — erst mit `zeile-loeschen` überhaupt strukturell relevant. Siehe Befund 6. |
| Cross-Format-Export über die UI (in keiner früheren Fassung erwähnt) | (implizit angenommen: Rundreise 5.1.5/5.2.5/5.3 über echten Upload/Download bedienbar) | **Nicht möglich.** `src/app/DocumentWorkspace.tsx:68-95,124-142`: genau **ein** „Exportieren"-Button, `handleExport` ruft `module.exportFile(...)` des beim Öffnen gebundenen Formatmoduls auf. Es gibt keinen Formatwähler beim Export. | Cross-Format-Rundreisen (5.1/5, 5.2/5, 5.3) sind **nicht** vollständig per echtem Browser-Upload/-Download nachweisbar, sondern nur bis zum Import in Format A per UI, dann auf Objektebene (`readX`/`writeY` direkt) fortzusetzen. Als reale Produktgrenze dokumentiert, nicht als Testlücke. |
| Zeilennummern durchgehend | z. B. `docx/writer.ts:130`, `odt/reader.ts:192`, `Toolbar.tsx:228-239` | **Alle gedriftet (am aktuellen Stand 2026-07-05 direkt nachgeprüft):** `docx/writer.ts:160`, `odt/writer.ts:115-116`, `odt/reader.ts:304`, `Toolbar.tsx:277-289` (Tabelle) bzw. `:143-156` (Ausschneiden/`disabled`-Muster) bzw. `:33-53` (`ScissorsIcon`), `commands.ts:6`, `WordEditor.tsx:109-110` (`columnResizing()`/`tableEditing()`) bzw. `:117-121` (Kontextmenü-Kommentar), `DocumentWorkspace.tsx:68-95` (`handleExport`). | Referenzen unten aktualisiert; wo Drift wahrscheinlich ist, wird das **Symbol** genannt, nicht nur die Zeile. |

Zusätzlich **neu aufgenommen**, da für eine korrekte Umsetzung und Abnahme wesentlich:
Befund 12 (Sichtbarkeit/Overflow), Befund 13 (Falle beim „deaktiviert"-Zustand), Befund 14
(Backspace/Entf löscht nur Zellinhalt), Befund 15 (Kontextmenü-Precedent), Befund 16 (die
korrigierte Einordnung von Befund 8 als Nicht-Bug), Befund 17 (vorbestehende
`colCount`-aus-Zeile-0-Schwäche, formatübergreifend, nicht durch dieses Feature
verursacht), sowie die Barrierefreiheits-/Testbarkeits-Anforderung „stabiler Accessible
Name" (Abschnitt 1 Zeile 7), die Basis-Rundreise ohne Änderung (Abschnitt 5.0) und die
UI-Grenze „kein Cross-Format-Export" (Abschnitt 5, Einleitung).

---

## 0. Bezug zum Backlog & Scope-Abgrenzung

| Slug | Titel | Beschreibung | Status | Prio | Teil dieser Datei? |
|---|---|---|---|---|---|
| `spalte-loeschen` | Spalte löschen | „Entfernt die markierte Tabellenspalte." | fehlt | 1 | **Ja — Kernumfang** |
| `tabelle-einfuegen` | Tabelle einfügen | wählbare Zeilen-/Spaltenzahl | teilweise | 1 | Nein — Voraussetzung, eigener Slug |
| `zeile-einfuegen` / `zeile-loeschen` | Zeile einfügen/löschen | analoge Zeilen-Operationen | fehlt | 1 | Nein — nur Abgrenzung (Abschn. 6) |
| `spalte-einfuegen` | Spalte einfügen (links/rechts) | neue Spalte einfügen | fehlt | 1 | Nein — eigener Slug, teilt Toolbar-Bereich |
| `zellen-verbinden` / `zellen-teilen` | Zellen verbinden/teilen | `colspan`/`rowspan` erzeugen/auflösen | fehlt | 1/2 | Nein — aber **Wechselwirkung ist Pflichtbestandteil** (Abschn. 2.4/2.5) |
| `tabelle-loeschen` | Tabelle komplett löschen | gesamte Tabelle entfernen | fehlt | 1 | Nein — nur als Grenzfall „letzte Spalte" (Abschn. 2.6) |
| `kopfzeile-wiederholen` | Kopfzeile auf Folgeseiten | Zeile 1 wiederholen | fehlt | 2 | Nein — nur Wechselwirkungshinweis (Abschn. 2.9) |

Kernumfang ist **ausschließlich** das Entfernen einer (oder mehrerer markierter) Spalte(n)
aus einer bestehenden Tabelle — inkl. korrektem Verhalten bei bestehenden Verbindungen
(`colspan`/`rowspan`) und inkl. Rundreise nach DOCX **und** ODT.

Architektur-Grundprinzip: DOCX und ODT teilen einen gemeinsamen internen Editor
(`src/formats/shared/editor/`, ProseMirror-Schema + Seitenansicht; Tabellen-Nodes aus
`prosemirror-tables` via `tableNodes(...)` in `src/formats/shared/schema.ts`). „Spalte
löschen" muss deshalb **unabhängig vom Ursprungsformat** funktionieren und darf die
Rundreise-Fähigkeit einer Datei **niemals** beeinträchtigen (Abschnitt 5).

---

## 1. Ist-Stand laut Code-Analyse (Befund vor Verifikation, Stand 2026-07-05)

**Zusammenfassung:** In der Oberfläche existiert die Funktion nicht im Ansatz. Der einzige
tabellenbezogene Bedienschritt ist der Button „⊞ Tabelle" zum Einfügen einer festen
2×2-Tabelle (`src/formats/shared/editor/Toolbar.tsx:277-289`, ruft `insertTable(2, 2)`,
`commands.ts:92-102`). Es gibt **kein** eigenes Kontextmenü, **keine** Tastenkombination
und **keinen** Command-Export `deleteColumn` in `commands.ts` (Zeile 6 exportiert nur
`isInTable`). Der Backlog-Status „fehlt" ist damit vollständig zutreffend.

Die Ausgangslage ist aber **nicht** „bei null anfangen", sondern „Werkzeug vorhanden,
nicht verdrahtet, mit einigen Detailfallen". Die folgenden Befunde sind für Umsetzung und
Abnahme zentral:

| # | Ort | Inhalt | Befund / Bedeutung |
|---|---|---|---|
| 1 | `package.json:29` | `"prosemirror-tables": "^1.8.5"` | Liefert `deleteColumn`, `removeColumn`, `selectedRect`, `CellSelection`, `TableMap` fertig (alle exportiert, verifiziert in `dist/index.d.ts:750`). Kein eigener Lösch-Algorithmus nötig — die Aufgabe ist **Verdrahtung + Grenzfall-Behandlung + Rundreise-Verifikation**. |
| 2 | `WordEditor.tsx:109-110` | `columnResizing()` und `tableEditing()` sind registriert | Eine `CellSelection` (Spalte per Maus-Drag markieren) **funktioniert bereits** rein durch diese Plugins — nur die Aktion „löschen" fehlt als Anknüpfung. **Aber:** die Markierung ist derzeit **visuell unsichtbar**, siehe Befund 12. |
| 3 | `prosemirror-tables/dist/index.js`, `deleteColumn` | Der Guard `if (rect.left == 0 && rect.right == rect.map.width) return false` steht **innerhalb** von `if (dispatch) { … }` (im Quelltext verifiziert) | Zwei Konsequenzen: (a) Wird der Command auf „alle Spalten markiert"/„letzte Spalte" **mit** `dispatch` aufgerufen, passiert **nichts** (kein Dispatch) — stiller Fehlschlag, wenn nicht abgefangen (Abschn. 2.6). (b) Ein `dispatch`-loser Aufruf `deleteColumn(state)` zur „wäre das möglich?"-Prüfung liefert **fälschlich `true`**, weil der Guard dann gar nicht durchlaufen wird — siehe Befund 13. |
| 4 | `prosemirror-tables`, `removeColumn` | iteriert über die **volle** Zeilenhöhe (`row < map.height`) | Cursor in **einer** Zelle oder eine `CellSelection` über nur einen Teil der Spalte löscht trotzdem die **gesamte** Spalte. Erwartungskonflikt „nur markierte Zellen" — muss dokumentiert/kommuniziert werden (Abschn. 2.1). |
| 5 | `prosemirror-tables`, `removeColumn` | für eine Zelle mit `colspan > 1`, die über die gelöschte Spalte **hinausragt**: `setNodeMarkup(..., removeColSpan(...))` statt Löschen | `colspan` wird nur um 1 reduziert, Inhalt bleibt. Muss mit Testfall belegt werden (Abschn. 2.4) — **kein** bestehender Test deckt diesen Pfad ab. |
| 6 | `src/formats/docx/writer.ts:160` | `colCount = (rows[0]?.content ?? []).reduce((s, c) => s + Number(c.attrs?.colspan ?? 1), 0) || 1` | **Aktuell korrekt** (summiert `colspan` aus Zeile 0). `vMerge`-Fortsetzungen werden nie als eigene JSON-Zellen gespeichert → Zeile 0 kann keine enthalten. Kein Bug; nur eine per Test festzuschreibende Invariante, erst mit `zeile-loeschen` real relevant. |
| 7 | `src/formats/odt/writer.ts:115-116` | `colCount` summiert `colspan` (identisch DOCX); Zeile 137 schreibt `<table:covered-table-cell/>` für `rowspan` | **Bereits behoben** (die Vorfassung beschrieb hier noch einen offenen Bug). Anforderung reduziert sich auf einen Regressionstest (Abschn. 5.2.2), der das korrekt hält. |
| 8 | `src/formats/odt/reader.ts:301-321` | `childElements(rowEl, …, 'table-cell')` liest **nur** `table-cell`, **nicht** `covered-table-cell` | **Kein Blocker — empirisch als korrekt verifiziert (Befund 16).** Der Writer (Befund 7) erzeugt `covered-table-cell` als ODF-Pflicht-Padding (jede Zeile muss `colCount` Zell-Elemente deklarieren, ODF 1.3 §9.1.1); der Reader liest `rowspan`/`colspan` direkt vom Anker-Attribut und überspringt die Platzhalter zu Recht — `TableMap` braucht sie nicht. Betrifft **keinen** `rowspan`-ODT-Rundreisetest negativ (Abschn. 5.2.3/5.2.4 sind Regressionstests, kein Blocker-Nachweis). |
| 9 | `src/formats/docx/reader.ts` (`parseTable`, `anchors`-Array) | ordnet `vMerge`-Fortsetzungszellen korrekt der Ursprungszelle zu | DOCX-Import ist bei vertikalen Verbindungen robust. **Asymmetrie** gegenüber dem ODT-Reader bleibt bestehen, ist aber **kein Bug in beiden Formaten** — sie folgt aus der unterschiedlichen Spezifikation (OOXML: `rowspan` implizit über gezählte Fortsetzungen; ODF: `rowspan` explizites Attribut, Befund 16). Als bekannter, unschädlicher Unterschied zu dokumentieren. |
| 10 | `docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts` (Tabellen-Blöcke) | konstruieren Test-JSON **direkt**, prüfen nur Schreiben/Lesen | **Kein** Test bedient die Oberfläche, **keiner** ruft `deleteColumn` auf. Bestätigt `FEATURE-SPEC-DOCX-ODT.md` Abschn. 6 Testfall 5. |
| 11 | `tests/e2e/` (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`) | kein `table*.spec.ts` | **Kein** E2E-Test weist irgendeine Tabellen-Interaktion über echte Bedienung nach. |
| 12 | `src/index.css` + `grep` über `src/` | keine `.selectedCell`-Regel, kein `.tableWrapper { overflow-x }`, `prosemirror-tables/style/tables.css` **nicht** importiert; `td/th` ohne `position: relative` | **Neu.** Die von `tableEditing()` gesetzte Klasse `selectedCell` ist **ungestylt** → markierte Spalte **unsichtbar** (verletzt Abschn. 1 Zeile 6). Zusätzlich kann eine breite Tabelle mangels `overflow-x` auf schmalen Viewports die Seite sprengen (relevant für Abschn. 1 Zeile 8). Beides muss gebaut werden. |
| 13 | Folge aus Befund 3 | „wäre Löschen möglich?"-Prüfung darf **nicht** über `deleteColumn(state)` (ohne `dispatch`) laufen | **Neu.** Ein solcher Aufruf liefert `true`, sobald `isInTable` gilt — auch bei markierten **allen** Spalten. Der deaktivierte Button (Abschn. 1 Zeile 3, DoD 4) muss den Guard **selbst nachbilden**: `isInTable(state) && !(rect.left === 0 && rect.right === rect.map.width)` über das exportierte `selectedRect`. Andernfalls bleibt der Button für die letzte Spalte fälschlich aktiv und der Klick ist ein stiller No-Op. |
| 14 | `prosemirror-tables/dist/index.js:2122-2125` | `tableEditing()` bindet `Backspace`/`Delete`/`Mod-Backspace`/`Mod-Delete` an `deleteCellSelection` (löscht nur den **Inhalt** markierter Zellen, Zeile 1841/1845) | **Neu.** Entf/Backspace auf einer markierten Spalte **leert die Zellen**, entfernt aber **nicht** die Spaltenstruktur. Muss dokumentiert werden, damit Nutzer:innen/Tester:innen das Leeren nicht mit „Spalte löschen" verwechseln — das explizite Bedienelement ist der **einzige** strukturelle Löschweg. |
| 15 | `WordEditor.tsx:117-121` | dokumentierte Entscheidung: kein eigenes Kontextmenü, kein `contextmenu`-`preventDefault`, natives Kontextmenü bleibt erreichbar | **Neu.** Die früher „offene" Kontextmenü-Frage ist durch Projekt-Precedent **entschieden** → Toolbar-Bedienelement (Abschn. 1 Zeile 4). |
| 16 | `odt/reader.ts:301-321` + `odt/writer.ts:110-175`, gegengeprüft mit 3 empirischen Probe-Durchläufen (`spalte-loeschen-code.md` Abschn. 3, hier unabhängig nachvollzogen) | eigen erzeugte `rowspan`-ODTs **und** vier reale LibreOffice-Fixtures (u. a. `tableCoveredContent.odt`) reisen fehlerfrei rund; ein Reader-Rewrite hätte `rowspan` doppelt gezählt | **Ersetzt den früheren „Befund 8"-Blocker.** Kein Reader-Fix nötig. Nur Regressionstests (Abschn. 5.2.3/5.2.4, 6.2), damit ein künftiger, gut gemeinter aber falscher „Fix" nicht die heute korrekte Rundreise bricht. |
| 17 | `docx/writer.ts:160` und `odt/writer.ts:115-116` (`colCount = Summe der colspan-Werte **aus Zeile 0**`), real beobachtbar an `tests/fixtures/external/odt/tableOps.odt` | beide Writer leiten die Spaltenzahl **ausschließlich aus der ersten Zeile** ab | **Neu, vorbestehend, formatübergreifend, außerhalb des Scopes dieses Features.** Ist eine spätere Zeile einer (meist per ODF-Kompressionsattribute wie `table:number-columns-repeated` irregulär eingelesenen) Tabelle breiter als Zeile 0, werden überzählige Zellen beim Export verworfen — Datenverlust, aber **nicht** durch `deleteColumn` ausgelöst (das hält die Tabelle immer rechteckig). Muss bei realen Fremddatei-Tests (Grenzfall 17/18, Abschn. 5.1.4/5.2.4) als **bekannte, nicht diesem Feature zuzurechnende** Einschränkung erkannt und dokumentiert werden, nicht als Fehlschlag von „Spalte löschen" fehlinterpretiert. |
| 18 | `src/app/DocumentWorkspace.tsx:68-95,124-142` | genau **ein** „Exportieren"-Button; `handleExport` ruft `module.exportFile(...)` des beim Öffnen gebundenen Formatmoduls, kein Formatwähler | **Neu.** Cross-Format-Rundreisen (Anforderung 5.1/5, 5.2/5, 5.3) sind **nicht vollständig** per echtem Browser-Upload/Klick/Download nachweisbar — es gibt keinen UI-Weg, „als anderes Format exportieren" zu wählen. Muss ab dem Export-Schritt auf Objektebene (`readX(...)`/`writeY(...)` direkt im Test) fortgesetzt werden. Reale Produktgrenze, kein Test- oder Feature-Defizit von „Spalte löschen". |

**Konsequenz:** Status „fehlt" ist zutreffend. Die Bibliotheksfunktion ist vorhanden und
tragfähig; die reale Arbeit ist (a) UI-Anbindung inkl. sichtbarer Markierung und korrektem
„deaktiviert"-Zustand, (b) Regressionsabsicherung des bereits korrekten ODT-`rowspan`-
Verhaltens (Befund 8/16 — **kein** Reader-Fix), (c) Nachweis der Rundreise inkl. der
bekannten Format-Asymmetrie (Befund 9) und der UI-Grenze „kein Cross-Format-Export"
(Befund 18).

---

## 2. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Spalte löschen" (neu) | fehlt | Neuer Button in `Toolbar.tsx`, direkt beim „⊞ Tabelle"-Button. **Inline-SVG-Icon** (kein Unicode/Emoji) — Precedent existiert bereits: `ScissorsIcon` (`Toolbar.tsx:33-53`, `currentColor`, `aria-hidden`). Löst `deleteColumn(state, dispatch, view)` aus. |
| 2 | Sichtbarkeit außerhalb einer Tabelle | n/a | Button **immer sichtbar**, aber `disabled`, wenn `isInTable(view.state)` `false` ist. Precedent für exakt dieses Muster existiert: der „Ausschneiden"-Button nutzt `disabled={!canCut(state)}` mit `disabled:opacity-40 disabled:cursor-not-allowed` (`Toolbar.tsx:143-156`). Kein Ausblenden (vermeidet Layout-Sprünge/E2E-Races). Kein stiller Klick ins Leere. |
| 3 | Deaktivierung bei „letzte verbleibende Spalte" | n/a | Button **zusätzlich** `disabled`, wenn die aktuelle Selektion alle Spalten umfasst. **Pflicht (Befund 13):** Die Prüfung darf **nicht** `deleteColumn(state)` ohne `dispatch` verwenden (liefert fälschlich `true`), sondern muss `isInTable && !(rect.left === 0 && rect.right === rect.map.width)` über `selectedRect` selbst nachbilden. `title`-Tooltip erklärt den Zustand. |
| 4 | Kontextmenü (Rechtsklick) | n/a | **Kein** eigenes Kontextmenü. Durch Projekt-Precedent entschieden (Befund 15, `WordEditor.tsx:117-121`): das native Browser-Kontextmenü bleibt erreichbar, alle Aktionen laufen über die Toolbar. Gilt einheitlich auch für die Geschwister-Features (`spalte-einfuegen`, `zeile-loeschen`, …). |
| 5 | Tastenkombination | keine | **Bewusst keine.** Word/LibreOffice definieren keine durchgängige Standard-Kombination. Wichtig (Befund 14): `Backspace`/`Delete` sind bereits durch `deleteCellSelection` belegt (leert Zellinhalt) und dürfen **nicht** für strukturelles Spaltenlöschen umgewidmet werden. |
| 6 | Sichtbare Markierung der betroffenen Spalte | **fehlt (unsichtbar)** | **Pflicht, zu bauen (Befund 12):** Vor dem Klick muss eindeutig erkennbar sein, welche Spalte(n) betroffen sind. `tableEditing()` setzt die Klasse `selectedCell`, aber es existiert **keine** CSS dafür. Eigene Overlay-Regel (`.ProseMirror .selectedCell::after`, hell/dunkel-tauglich, `pointer-events: none`) ergänzen; `td/th` benötigen dafür `position: relative`. |
| 7 | Barrierefreiheit / Testbarkeit: stabiler Accessible Name | n/a | **Neu — Pflicht.** Der Button muss einen stabilen Accessible Name via `aria-label="Spalte löschen"` haben (nicht nur `title`), konsistent mit `Ausschneiden`/`Tabelle einfügen`/`MarkButton` (alle setzen `aria-label`). Nur so ist er per `getByRole('button', { name: 'Spalte löschen' })` zuverlässig testbar und für Screenreader benannt. Für ein `<button>` gewinnt sonst der Text-Inhalt (name-from-content) über `title` — eine reine `title`-Beschriftung wäre nicht verlässlich adressierbar. |
| 8 | Mobile/Touch-Bedienung | ungeprüft | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini) verifizieren. Vorbedingung: `.tableWrapper` (von `columnResizing()` erzeugt) braucht `overflow-x: auto`, sonst sprengt eine breite Tabelle den Viewport (Befund 12). Mindestens der Fall „Cursor in einer Zelle, Button klicken" (ohne `CellSelection`) muss auf allen drei Projekten funktionieren. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Erkennung „die markierte Spalte"
Der Auftrag spricht von „der markierten Tabellenspalte" (Singular). Aus Befund 3/4 ergeben
sich drei Ausgangslagen, die **alle** zu einem nachvollziehbaren Ergebnis führen müssen:

1. **Nur Cursor, keine Selektion, in einer Zelle:** Es wird die Spalte dieser Zelle über
   die **gesamte** Tabellenhöhe gelöscht, nicht nur die aktuelle Zeile.
2. **`CellSelection` innerhalb einer Spalte, aber nicht über die volle Höhe** (z. B. 2 von
   3 Zeilen): Es wird trotzdem die **gesamte** Spalte gelöscht (Befund 4). Dieses Verhalten
   entspricht Word/LibreOffice, kann aber der naiven Erwartung „nur markierte Zellen"
   widersprechen und wird deshalb per `title`-Tooltip kommuniziert („Löscht die gesamte
   Spalte").
3. **`CellSelection` über mehrere Spalten:** Alle erfassten Spalten werden auf einen Klick
   gelöscht (`selectedRect` liefert das Rechteck). **Design-Entscheidung dieser Datei:**
   dem Bibliotheksverhalten folgen (konsistent mit Word/LibreOffice) — bestätigt, nicht
   stillschweigend angenommen.

### 3.2 Löschvorgang
- Die Gesamtspaltenzahl verringert sich um genau die Anzahl gelöschter Spalten.
- Verbleibende Spalten links/rechts rücken zusammen, ohne dass benachbarter Inhalt
  verändert wird.
- Der Zellinhalt der gelöschten Spalte (Text, Formatierung, Bilder) geht vollständig
  verloren — **destruktive** Aktion; Absicherung ausschließlich über Undo (Abschn. 3.8,
  kein Bestätigungsdialog, siehe Grenzfall 13).

### 3.3 Cursor-Platzierung nach dem Löschen
- Der Cursor steht danach an einer definierten, sinnvollen Position **innerhalb** der
  verbleibenden Tabelle (nachrückende Zelle bzw. linke Nachbarzelle, falls die rechteste
  Spalte gelöscht wurde). Kein Verlust des Fokus, kein Sprung an eine unerwartete
  Dokumentstelle (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 1.3). `CellSelection.map(...)` fällt
  bibliotheksseitig automatisch auf eine `TextSelection` zurück, sobald die markierten
  Zellen wegfallen — nur per E2E zu verifizieren.

### 3.4 Verhalten bei horizontal verbundenen Zellen (`colspan`)
- Eine Zelle, die über die gelöschte Spalte **hinausragt** (`colspan` > Anzahl gelöschter
  Spalten in ihrer Spanne), verliert nur die entsprechende Anzahl `colspan`-Einheiten;
  Inhalt bleibt vollständig (Befund 5).
- Eine Zelle, deren `colspan` **exakt** der Anzahl gelöschter Spalten entspricht, wird
  komplett entfernt.
- **Zu verifizieren (kein bisheriger Test):** `colspan: 2` → eine der beiden Spalten
  löschen → `colspan: 1`, Inhalt in der verbleibenden Zelle erhalten, nicht dupliziert,
  nicht verloren.

### 3.5 Verhalten bei vertikal verbundenen Zellen (`rowspan`)
- Eine `rowspan`-Zelle **innerhalb** der gelöschten Spalte wird vollständig entfernt (inkl.
  ihres über mehrere Zeilen verteilten Inhalts).
- **Zu verifizieren:** Löschen einer Spalte mit `rowspan`-Zelle, während eine Nachbarspalte
  bleibt → die **Zeilenanzahl** der Tabelle ändert sich **nicht**, nur die Spaltenzahl.
- **ODT (Befund 8/16, empirisch als korrekt verifiziert):** Der ODT-Reader überspringt
  `<table:covered-table-cell/>` bewusst und liest `rowspan` vom expliziten
  `table:number-rows-spanned`-Attribut des Ankers — für ODF spezifikationskonform, durch
  drei Probe-Läufe (eigen erzeugte `rowspan`-ODT plus vier reale LibreOffice-Fixtures,
  u. a. `tableCoveredContent.odt`) bestätigt. Dieser Fall ist **kein** Blocker; Abschn. 5.2.3
  ist ein **Regressionstest**, kein offener Verifikationspunkt.

### 3.6 Letzte verbleibende Spalte
- `deleteColumn` verweigert das Löschen, wenn die Selektion **alle** Spalten umfasst
  (`rect.left == 0 && rect.right == rect.map.width` → `false`, kein Dispatch, Befund 3).
- **Anforderung:** Das darf **nicht** als stiller Fehlschlag ankommen
  (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 20). Gewählter Weg: **Button ist in diesem Zustand
  `disabled`** (Abschn. 2 Zeile 3), erkannt über die **eigene** Guard-Nachbildung aus
  Befund 13 (nicht über einen `dispatch`-losen `deleteColumn`-Aufruf). Ein Tooltip erklärt:
  „Letzte verbleibende Spalte kann nicht einzeln gelöscht werden — ggf. Tabelle löschen."
- Eine 1-spaltige Tabelle und eine Mehrspaltentabelle mit **allen** Spalten markiert nehmen
  denselben Weg (identische Bibliotheksbedingung).

### 3.7 Interaktion mit Spaltenbreiten
- Das Schema-Attribut `colwidth` der verbleibenden Spalten bleibt unverändert (keine
  automatische Neuverteilung zwingend für „fertig"). Die Tabelle darf nach dem Löschen
  nicht optisch „zusammengequetscht" wirken oder schmaler als der Seiteninhalt werden —
  mindestens vergleichbar mit dem Verhalten von `columnResizing()`.

### 3.8 Undo/Redo
- Das Löschen erzeugt **einen** eigenständigen Undo-Schritt (Undo/Redo sind bereits über
  `history()` in `WordEditor.tsx` mit `Mod-z`/`Mod-y`/`Mod-Shift-z` vorhanden — kein
  Zusatzcode, nur E2E-Nachweis).
- Strg+Z stellt die gelöschte(n) Spalte(n) inkl. **vollständigem** Inhalt (Text,
  Zeichenformatierung, `colspan`/`rowspan`-Zustand der Nachbarzellen) an der exakten
  Ursprungsposition wieder her; Strg+Y/Strg+Umschalt+Z löscht erneut.
- Mehrere aufeinanderfolgende Löschvorgänge sind einzeln, in korrekter Reihenfolge
  rückgängig zu machen (nicht als ein zusammengefasster Schritt).

### 3.9 Wechselwirkung „Kopfzeile auf Folgeseiten wiederholen"
- `kopfzeile-wiederholen` ist nicht umgesetzt (Backlog, Status „fehlt"). Nicht im Scope;
  nur vermerkt: sobald vorhanden, muss das Spaltenlöschen die als Kopfzeile markierte erste
  Zeile konsistent mit verkürzen.

### 3.10 Regressionsrisiko Selection-Sync-Bug
- Tabellen sind laut `FEATURE-SPEC-DOCX-ODT.md` Abschn. 2 ein „Hauptverdachtsfall" für den
  bekannten Selection-Sync-Bug (stale Selektion nach Toolbar-Aktion + Klick). Der
  Spalten-Löschvorgang ist eine Toolbar-Transaktion auf eine (zellbasierte) Selektion und
  damit ein plausibler weiterer Auslöser.
- **Pflicht-Regressionstest:** Tabelle einfügen → in Zelle tippen → Spalte per
  `CellSelection` markieren → „Spalte löschen" → per Klick in eine verbleibende Zelle neu
  positionieren → weiter tippen → Text landet exakt an der geklickten Stelle. Der bestehende
  `tests/e2e/selection-regression.spec.ts` (Fall „inside a table cell", nutzt bereits
  `getByRole('button', { name: 'Tabelle einfügen' })`, funktioniert dank vorhandenem
  `aria-label`) ist die Vorlage — der neue Button muss aus demselben Grund ein `aria-label`
  tragen (Abschn. 2 Zeile 7).

### 3.11 Keyboard-Löschen vs. Strukturlöschen (Befund 14)
- Mit einer per `CellSelection` markierten Spalte **leert** `Backspace`/`Delete` die
  Zellen (Bibliotheks-Binding `deleteCellSelection`), entfernt aber die Spalte **nicht**.
  Das ist beabsichtigtes Verhalten, **kein** Bug. Anforderung: Dieser Unterschied muss
  Nutzer:innen nicht aktiv erklärt werden, aber im Test klar getrennt geprüft werden
  (Grenzfall 21) — „Spalte löschen" ist ausschließlich das explizite Toolbar-Bedienelement.

---

## 4. Grenzfälle

1. **Cursor ohne Selektion in einer Zelle:** löscht die Spalte über die volle Höhe (3.1/1).
2. **`CellSelection` in einer Spalte, Teilhöhe** (z. B. 2 von 3 Zeilen): löscht die
   **gesamte** Spalte (3.1/2) — mit Testfall belegen, da verwirrungsanfällig.
3. **`CellSelection` über mehrere Spalten:** löscht alle erfassten Spalten auf einen Klick
   (3.1/3).
4. **Spalte mit `colspan`-Zelle, die hinausragt:** `colspan` reduziert, Inhalt bleibt (3.4).
5. **Spalte, deren Breite von einer `colspan`-Zelle exakt gefüllt wird:** Zelle komplett
   entfernt (3.4).
6. **Spalte mit `rowspan`-Zelle:** Zelle über mehrere Zeilen vollständig entfernt,
   Zeilenanzahl bleibt gleich (3.5). **ODT: Befund 8/16 — empirisch als korrekt
   verifiziert, kein Risiko; Regressionstest, kein offener Klärungsbedarf.**
7. **Letzte verbleibende Spalte / alle Spalten markiert:** von der Bibliothek verweigert —
   Button `disabled`, sichtbare Rückmeldung statt stillem No-Op (3.6, **zentraler
   Pflicht-Testfall**).
8. **Tabelle mit genau 2 Spalten, eine löschen:** Ergebnis ist eine 1-spaltige Tabelle,
   weiterhin normal bearbeitbar, keine strukturelle Beschädigung.
9. **Spalte links / rechts / in der Mitte löschen:** alle drei Positionen funktionieren,
   Nachbarspalten rücken korrekt nach.
10. **Leere Zellen in der Spalte** (nur ein leerer Absatz): löschen ohne Absturz, keine
    Sonderbehandlung.
11. **Zelle mit mehreren Absätzen/gemischter Formatierung:** gesamter Zellinhalt wird
    mitgelöscht, keine Teilreste.
12. **Bild in einer Zelle der Spalte:** Bild wird mitgelöscht, keine verwaiste Bilddatei im
    Export-Zip (Analogie `FEATURE-SPEC-DOCX-ODT.md` Abschn. 7 Testfall 9).
13. **Bestätigungsdialog:** **kein** Dialog (wie Word/LibreOffice für „Spalte löschen").
    Undo genügt als Absicherung; konsistent mit „Bild löschen" (Entf, ohne Rückfrage) und
    dem Fehlen jeder Dialog-Infrastruktur.
14. **Verschachtelte Tabelle:** äußere Spalte löschen, deren Zelle eine vollständige innere
    Tabelle enthält → gesamte innere Tabelle wird mitgelöscht, kein Absturz
    (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 6 Testfall 8).
15. **Spalte löschen direkt nach „Tabelle einfügen"** (frische, leere 2×2-Tabelle, kein
    Tippen): funktioniert ohne Absturz.
16. **Mehrfaches schnelles Löschen in Folge:** jede Aktion einzeln korrekt; der letzte
    Versuch (nur noch eine Spalte übrig) wird gemäß Grenzfall 7 verweigert.
17. **Reale Fremddatei mit großer Tabelle** (`> 5` Spalten, `> 10` Zeilen, gemischte
    Formatierung): mittlere Spalte löschen, exportieren, reimportieren → verbleibende
    Spalten/Inhalte identisch, keine Verschiebung. Konkret verfügbar: `BigTable.odt`,
    `crazyTable.odt`, `OOStyledTable.odt` (`tests/fixtures/external/odt/`) sowie der
    DOCX-Korpus aus `src/formats/docx/__tests__/external-fixtures.test.ts`.
18. **Reale, mit LibreOffice erzeugte ODT mit vertikaler Verbindung**
    (`covered-table-cell`, Befund 8/16 — **empirisch bereits als korrekt verifiziert**,
    kein offener Verdacht; konkret geeignet: `tableCoveredContent.odt`, verifiziert 33×
    `covered-table-cell`, `rowspan` bis 6; weitere Kandidaten `crazyTable.odt`,
    `TableWidth.odt`, `feature_attributes_tables.odt` — vor Nutzung real auf
    `number-rows-spanned`/`covered-table-cell` prüfen): importieren, Spalte löschen,
    exportieren, reimportieren → Spaltenzuordnung wird als **korrekt importiert erwartet**
    (nicht mehr als offene Frage). Weicht ein konkretes Fixture wider Erwarten ab, ist
    **dieses Fixture** als Ausnahme zu dokumentieren, nicht „Spalte löschen" als
    gescheitert zu werten.
18a. **Reale ODT mit irregulärer Spaltenstruktur** (Befund 17, z. B.
    `tests/fixtures/external/odt/tableOps.odt`, nutzt `table:number-columns-repeated`/
    `table:number-rows-repeated`): Die vorbestehende, formatübergreifende
    `colCount`-aus-Zeile-0-Schwäche beider Writer (Befund 17) kann hier beim Export
    Zellen einer breiteren Folgezeile verwerfen. **Nicht** durch `deleteColumn` verursacht
    (das hält die Tabelle stets rechteckig) — bei einem solchen Fixture-Treffer als
    **bekannte, pre-existing Writer-Einschränkung** zu dokumentieren, nicht als
    Fehlschlag dieses Features.
19. **Selection-Sync-Regression** (3.10) — Pflicht-Regressionstest.
20. **Track-Changes-Abhängigkeit** (Phase 3, nicht umgesetzt): sobald vorhanden, muss das
    Spaltenlöschen bei aktiver Aufzeichnung als nachverfolgbare Änderung markiert werden
    (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 13 Testfall 8). Nicht im aktuellen Scope.
21. **Keyboard-Löschen ≠ Strukturlöschen (Befund 14):** Spalte per `CellSelection`
    markieren → `Backspace`/`Delete` → nur Zellinhalte werden geleert, Spalte bleibt
    bestehen. Muss als eigener Testfall vom Toolbar-„Spalte löschen" abgegrenzt werden
    (kein Bug, aber Verwechslungsgefahr).
22. **Cross-Format-Export ist kein UI-Weg (Befund 18):** Der Export-Button gibt immer im
    beim Öffnen gewählten Format aus (`DocumentWorkspace.tsx:68-95`). Rundreisen
    DOCX→ODT bzw. ODT→DOCX (5.1/5, 5.2/5, 5.3) sind deshalb ab dem Export-Schritt nur auf
    Objektebene (`readX`/`writeY` direkt im Test), nicht per echtem zweitem
    Browser-Download, nachweisbar. Kein Blocker für „Spalte löschen" selbst, aber
    verbindliche Rahmenbedingung für die Testebene dieser Fälle.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Grundregel (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 1.3/3/19): **Datei A hochladen → Spalte
löschen → exportieren → Ergebnis entspricht inhaltlich A abzüglich der gelöschten Spalte,
sonst keine Abweichung.** Export wird gegen einen **unabhängigen** Parser geprüft, nicht nur
gegen den eigenen Reader (sonst können sich Schreib- und Lesefehler gegenseitig
kaschieren). Über echten Datei-Upload (`filechooser`/`input[type=file]`) und echten
Download (`page.waitForEvent('download')` + `JSZip.loadAsync`).

**Verbindliche Randbedingung (Befund 18):** Der Export-Button gibt ausschließlich im beim
Öffnen gewählten Format aus (`DocumentWorkspace.tsx:68-95,124-142`) — es existiert **kein**
Formatwähler beim Export. **Gleichformat**-Rundreisen (Import Format X → … → Export
Format X) sind deshalb vollständig über echten Browser-Upload/-Download nachweisbar.
**Cross-Format**-Rundreisen (5.1/5, 5.2/5, 5.3) sind es **nicht**: Import über die UI ist
möglich, der Formatwechsel selbst muss aber auf Objektebene (`readX(...)` gefolgt von
direktem `writeY(...)` im Test, ohne zweiten UI-Export) erfolgen. Das ist eine reale
Produktgrenze, kein Test- oder Feature-Mangel von „Spalte löschen" — bei der Verifikation
ausdrücklich zu vermerken, nicht stillschweigend zu übergehen oder fälschlich als
UI-Bug zu werten.

### 5.0 Basis-Rundreise ohne Änderung (Pflicht-Absicherung)
Bevor überhaupt eine Spalte gelöscht wird, muss sichergestellt sein, dass die neue Funktion
bestehende Tabellen **nicht beschädigt**:
1. DOCX mit Tabelle hochladen → **unverändert** exportieren → reimportieren → Tabelle
   inhaltlich identisch (Spaltenzahl, Zellinhalte, Verbindungen).
2. Dasselbe für ODT — **inkl.** einer Tabelle mit `rowspan` (Regressionstest für Befund 7/8:
   der Writer erzeugt `covered-table-cell`, der Reader gewinnt die Spalten daraus korrekt
   zurück — empirisch bereits verifiziert, siehe Befund 16; dieser Testfall sichert das
   dauerhaft ab, ist aber **kein** offener Klärungspunkt mehr).

### 5.1 DOCX
1. 3×3-Tabelle importieren → mittlere Spalte per Cursor + „Spalte löschen" → als DOCX
   exportieren → unabhängig prüfen: `<w:tblGrid>` enthält genau 2 `<w:gridCol>`, jede
   `<w:tr>` genau 2 `<w:tc>`, Inhalt der verbleibenden Spalten korrekt.
2. Tabelle mit `colspan: 2` → eine überspannte Spalte löschen → verbleibende Zelle
   referenziert kein `<w:gridSpan>` mehr (bzw. `w:val="1"`), Inhalt erhalten.
3. Tabelle mit `rowspan: 2` → genau diese Spalte löschen → `<w:tr>`-Anzahl unverändert,
   `vMerge` verschwindet aus beiden betroffenen Zeilen.
4. Reale Fremddatei (Open-Source-Testkorpus, `FEATURE-SPEC-DOCX-ODT.md` Abschn. 18; für
   DOCX der bereits eingebundene Korpus aus `src/formats/docx/__tests__/external-fixtures.test.ts`)
   mit Tabelle `> 5` Spalten → eine Spalte löschen → exportieren → reimportieren →
   verbleibende Zellinhalte identisch.
5. **Cross-Format (Befund 18 — nur auf Objektebene, kein zweiter UI-Export):** ODT mit
   Tabelle importieren (echter UI-Upload) → Spalte löschen (echte Toolbar-Bedienung) →
   Zustand als Objekt entnehmen und direkt mit `writeDocx(...)` nach DOCX schreiben (kein
   UI-Weg vorhanden) → `readDocx` bestätigt erhaltenen Inhalt.
6. Zwei verschiedene Spalten nacheinander löschen (ohne Zwischen-Export) → dann exportieren
   → beide fehlen korrekt, keine „kommt durch Zufall zurück".

### 5.2 ODT
1. 3×3-Tabelle importieren → mittlere Spalte löschen → als ODT exportieren → `content.xml`
   enthält genau 2 `<table:table-column>` und pro `<table:table-row>` genau 2
   `<table:table-cell>`, Inhalt korrekt.
2. **Regressionstest Befund 7:** Tabelle mit `colspan: 2` in Zeile 0 (⇒ 3 logische
   Spalten, aber 2 JSON-Zellen) → exportieren → Assertion **direkt gegen die XML**: genau 3
   `<table:table-column>`-Vorkommen (nicht 2). Sicherstellen, dass der bereits behobene
   `colCount` korrekt bleibt.
3. Tabelle mit `rowspan: 2` → genau diese Spalte löschen → exportieren → Zeilenanzahl
   unverändert, Attribut/`covered-table-cell` konsistent. **Regressionstest, kein
   Blocker-Kandidat (Befund 8/16 — empirisch bereits als korrekt verifiziert):** Erwartung
   ist eine **korrekte** Spaltenzuordnung beim Reimport. Sollte ein konkreter Testlauf
   wider Erwarten abweichen, ist das ein neuer, eigenständig zu meldender Befund (nicht
   die Bestätigung eines bereits bekannten Risikos).
4. **Regressionstestfall Befund 8/16:** reale, mit LibreOffice/OpenOffice erzeugte ODT mit
   vertikaler Verbindung über `<table:covered-table-cell/>` importieren → **vor** jeder
   Lösch-Aktion prüfen, ob die Spaltenzuordnung korrekt importiert wurde — Erwartung:
   **korrekt**, wie bereits empirisch nachgewiesen (Befund 16). Ergebnis trotzdem
   dokumentieren. Konkrete, bereits im Repo vorhandene und für vertikale Verbindungen
   **verifizierte** Kandidaten aus `tests/fixtures/external/odt/`: `tableCoveredContent.odt`
   (33× `covered-table-cell`, `rowspan` bis 6 — Hauptkandidat), ergänzend `BigTable.odt`,
   `crazyTable.odt`, `OOStyledTable.odt`, `TableWidth.odt`, `coloredTable_MSO15.odt`,
   `Tabelle1.odt`, `feature_attributes_tables.odt`, `table-column-delete-with-merge.odt`,
   `table-column-delete-with-merge-2-times.odt` — vor Verwendung im Reader-Import auf
   tatsächlich enthaltene `covered-table-cell`/`rowspan` prüfen, statt blind anzunehmen.
5. **Cross-Format (Befund 18 — nur auf Objektebene):** DOCX mit Tabelle → Spalte löschen →
   Zustand direkt mit `writeOdt(...)` nach ODT schreiben (kein UI-Weg für einen zweiten
   Export im anderen Format) → `readOdt` bestätigt erhaltenen Inhalt.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück

**Randbedingung (Befund 18):** Da kein UI-Formatwähler beim Export existiert, laufen beide
Fälle als Import über die UI (Editor-Interaktion inkl. echtem „Spalte löschen"-Klick), die
**Formatwechsel selbst** aber direkt auf Objektebene (`readX`/`writeY`-Aufrufe im Test),
nicht als Kette echter Browser-Downloads.

1. DOCX → Editor → Spalte löschen (echte Toolbar-Bedienung) → `writeOdt` → `readOdt` →
   `writeDocx` → `readDocx` → verbleibende Spalteninhalte nach zwei Konvertierungen
   weiterhin identisch (Formatierungsverluste bei Cross-Format sind laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschn. 19 akzeptabel und zu dokumentieren, **Textverlust
   nicht**).
2. Dieselbe Prüfung mit Startpunkt ODT (Achtung `rowspan` — Befund 8/16 bereits als korrekt
   verifiziert, hier nur Regressionsschutz).

---

## 6. Explizit außerhalb des Scopes

- **`spalte-einfuegen`** (Prio 1): Gegenstück, eigener Slug; teilt voraussichtlich den
  Toolbar-Bereich, aber die Einfüge-Logik ist hier nicht gefordert.
- **`zeile-loeschen`** (Prio 1): strukturell ähnlich (`deleteRow`/`removeRow` fertig in der
  Bibliothek), eigener Slug/eigene Abnahme. Diese Datei behandelt **nur** Spalten.
- **`zellen-verbinden` / `zellen-teilen`** (Prio 1/2): das **Erzeugen/Auflösen** von
  Verbindungen ist nicht Gegenstand; hier nur das **Verhalten gegenüber bestehenden**
  Verbindungen (Abschn. 3.4/3.5).
- **`tabelle-loeschen`** (Prio 1): nur als Lösungsweg für „letzte Spalte" erwähnt
  (Abschn. 3.6), eigenes Feature.
- **Tabellen-Eigenschaften / -Formatvorlagen / Auto-Anpassung** (Rahmen, Schattierung,
  automatische Breitenneuverteilung): eigene, fehlende Features. Abschn. 3.7 fordert nur,
  dass das Layout nach dem Löschen nicht sichtbar bricht.
- **`kopfzeile-wiederholen`** (Prio 2): nur als künftige Abhängigkeit (Abschn. 3.9).
- **Track-Changes-Markierung von Struktur-Änderungen** (Phase 3): nicht im aktuellen
  Verifikationsauftrag.
- **Jeglicher Reader-/Writer-Umbau am ODT-Tabellenmodell wegen Befund 8:** entfällt —
  Befund 8 ist empirisch als korrektes Verhalten verifiziert (Befund 16), kein Fix-Auftrag.
- **Fix der `colCount`-aus-Zeile-0-Schwäche** (Befund 17, `docx/writer.ts:160` /
  `odt/writer.ts:115-116`): vorbestehend, formatübergreifend, nicht durch dieses Feature
  verursacht — eigenes, separates Ticket, hier nur zu dokumentieren, falls eine reale
  Fremddatei darauf trifft.
- **Ein zweiter Export-Format-Wähler in der UI** (Befund 18): eigenes, unabhängiges
  Feature; diese Datei nutzt für Cross-Format-Rundreisen die Objektebene als Ersatz.

---

## 7. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, laut Auftrag **nicht ausreichende** Tests (prüfen nur Lesen/Schreiben
direkt konstruierter Tabellen-JSON, keine Oberflächen-Bedienung, kein `deleteColumn`):
`src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`
(jeweils die Tabellen-`describe`-Blöcke).

Neu zu schreiben (z. B. `tests/e2e/table-columns.spec.ts`), durchgängig über echte
Toolbar-/Maus-Bedienung (`page.getByRole('button', { name: 'Spalte löschen' })`,
`page.mouse`, `page.mouse.move(..., { steps })` für `CellSelection`), **nicht** über direkte
Command-Aufrufe:

1. Tabelle einfügen, Cursor in mittlere Spalte einer 3×3-Tabelle, „Spalte löschen" →
   danach 2 Spalten, verbleibender Inhalt unverändert.
2. Cursor in normalem Absatz (außerhalb Tabelle) → Button `disabled`, keine Exception.
3. `CellSelection` über Teilhöhe einer Spalte (Maus-Drag über 2 von 3 Zeilen) → „Spalte
   löschen" → gesamte Spalte verschwindet (Grenzfall 2).
4. `CellSelection` über mehrere Spalten → „Spalte löschen" → alle markierten Spalten weg
   (Grenzfall 3).
5. **Sichtbarkeit (Befund 12):** Spalte per Maus-Drag markieren → die markierten Zellen
   sind **sichtbar hervorgehoben** (`.selectedCell`-Overlay vorhanden), bevor gelöscht wird.
6. Tabelle mit `colspan: 2` (per Fixture, da `zellen-verbinden` noch keine UI hat) → eine
   der beiden Spalten löschen → verbleibende Zelle zeigt Inhalt, `colspan` um 1 reduziert.
7. Tabelle mit `rowspan: 2` → genau diese Spalte löschen → Zeilenanzahl unverändert, Zelle
   vollständig entfernt.
8. Tabelle mit 2 Spalten → eine löschen → 1-spaltige Tabelle, weiterhin editierbar.
9. **Letzte Spalte / alle Spalten markiert → Button `disabled`, kein stiller No-Op**
   (zentraler Pflicht-Testfall, Grenzfall 7; prüft implizit Befund 13 — der Button muss
   auch dann deaktiviert sein, wenn eine `CellSelection` alle Spalten umfasst).
10. Bild in einer Zelle der Spalte (echter `filechooser`-Flow) → Spalte löschen → Bild
    verschwindet vollständig, keine Restspur.
11. `Backspace`/`Delete` auf markierter Spalte → **nur Zellinhalt geleert**, Spalte bleibt
    (Grenzfall 21, Befund 14) — klar abgegrenzt vom Toolbar-Löschen.
12. Undo (Strg+Z) direkt nach Löschen → Spalte inkl. Inhalt wiederhergestellt; Redo
    (Strg+Y) löscht erneut.
13. Zwei aufeinanderfolgende Löschvorgänge, dann zweimal Undo → beide Spalten in umgekehrter
    Reihenfolge einzeln wiederhergestellt.
14. **Selection-Sync-Regression** mit „Spalte löschen" als Auslöser (Abschn. 3.10/Grenzfall
    19): Tabelle → tippen → Spalte markieren+löschen → Klick in verbleibende Zelle →
    tippen → Text landet korrekt, kein Dokumentverlust.
15. Basis-Rundreise **ohne** Änderung je Format (Abschn. 5.0), inkl. ODT-`rowspan`.
16. Vollständige Rundreise je Format (Abschn. 5.1/5.2) über echten Upload/Download.
17. Cross-Format-Rundreise (Abschn. 5.3): DOCX→ODT→DOCX **und** ODT→DOCX→ODT.
18. Reale Fremddatei-Tests (Abschn. 5.1.4/5.2.4) — inkl. Dokumentation, falls durch Befund
    8 blockiert.
19. Verschachtelte Tabelle (Grenzfall 14) → äußere Spalte mit innerer Tabelle löschen →
    kein Absturz, innere Tabelle verschwindet mit.
20. Bedienung auf allen drei `playwright.config.ts`-Projekten (Desktop Chrome, Mobile/Pixel
    7, Tablet/iPad Mini) → mindestens Testfall 1 und 9 auf jedem Projekt grün; Tabelle
    sprengt den Viewport nicht (`.tableWrapper`-Overflow, Befund 12).

---

## 8. Testmatrix — Zusammenfassung

| Bereich | Unit (Reader/Writer) | E2E (echte Bedienung) | Rundreise (DOCX/ODT) |
|---|---|---|---|
| Grundfunktion: eine Spalte per Cursor löschen | fehlt | **fehlt komplett** | fehlt |
| Sichtbare `CellSelection`-Markierung (Befund 12) | n/a | **fehlt, zu bauen** | n/a |
| Button `disabled` außerhalb Tabelle | n/a | fehlt | n/a |
| Letzte Spalte: Button `disabled` (Befund 13) | n/a | **fehlt, zentraler Pflichttest** | n/a |
| `CellSelection` Teilhöhe / mehrere Spalten | n/a | fehlt | fehlt |
| Spalte mit `colspan` (Reduktion) | fehlt | fehlt | fehlt |
| Spalte mit `rowspan` | fehlt | fehlt | fehlt (ODT: Befund 8/16 — Regressionstest, kein Blocker) |
| Backspace ≠ Strukturlöschen (Befund 14) | n/a | fehlt | n/a |
| Bild in gelöschter Spalte | fehlt | fehlt | fehlt |
| Undo/Redo | n/a | fehlt | n/a |
| Selection-Sync-Regression × Spalte löschen | n/a | **fehlt, muss Pflicht werden** | n/a |
| Basis-Rundreise ohne Änderung (Abschn. 5.0) | teilw. vorhanden | fehlt | **fehlt** |
| ODT-`colCount` (Befund 7, bereits behoben) | **Regressionstest fehlt** | n/a | fehlt |
| ODT-`covered-table-cell`-Reader (Befund 8/16, **empirisch bereits als korrekt verifiziert**) | **Regressionstest fehlt** (kein offener Bug mehr) | fehlt | fehlt (Regressionsschutz, kein Blocker) |
| Reale Fremddatei DOCX (`>5` Spalten) | fehlt | fehlt | fehlt |
| Verschachtelte Tabelle | fehlt | fehlt | n/a |
| Cross-Format-Rundreise (Befund 18: nur Objektebene möglich) | fehlt (Objektebene) | n/a (kein UI-Weg) | fehlt (Objektebene) |
| Mobile/Tablet-Bedienung + Overflow | n/a | fehlt | n/a |
| `colCount`-aus-Zeile-0-Schwäche bei irregulären Fremddateien (Befund 17) | vorbestehend, außerhalb Scope | n/a | als bekannte Einschränkung zu dokumentieren, falls getroffen |

**Fazit:** Status „fehlt" ist zutreffend — keinerlei UI-Anbindung. `deleteColumn` ist
vorhanden und stabil; **kein** Verhaltensaspekt (Grenzfälle, Sichtbarkeit,
„deaktiviert"-Logik, Rundreise) ist bisher getestet oder über die Oberfläche erreichbar.
Befund 8 (ODT-`covered-table-cell`) ist **kein** offener Bug mehr, sondern empirisch als
korrekt verifiziert (Befund 16) — hier fehlt nur noch der dauerhafte Regressionstest, nicht
die Klärung selbst.

---

## 9. Verifikationsauftrag (zum Backlog-Status „nicht vertrauenswürdig")

Es gilt dieselbe Regel wie in `FEATURE-SPEC-DOCX-ODT.md` Abschn. 22: **Jeder Testfall dieser
Datei muss über echte Browser-Interaktion (sichtbarer Klick / Maus-Drag / Tastatureingabe)
nachgewiesen werden — nicht nur durch isolierte Command-/Unit-Tests.** Ein Unit-Test, der
`deleteColumn` mit konstruierten Dokumenten aufruft, beweist **nicht**, dass ein neuer
Toolbar-Button, eine echte `CellSelection` per Maus, die **sichtbare** Markierung und der
korrekte `disabled`-Zustand (Befund 13) im echten Editor funktionieren.

| Ebene | Ort | Deckt ab |
|---|---|---|
| Unit (Reader/Writer) | `docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts` (Erweiterung) | `colspan`/`rowspan`-Reduktion, Befund 6 (Invariante) / 7 (Regression) / 8+16 (Regressionsschutz für bereits korrektes Verhalten) |
| Unit (Command) | `src/formats/shared/editor/__tests__/commands.test.ts` (neu) | eigene „letzte Spalte?"-Guard-Nachbildung aus Befund 13 (inkl. dokumentiertem Bibliotheks-Fehlverhalten des `dispatch`-losen `deleteColumn`) |
| Unit (Cross-Format, Objektebene) | neue Datei, z. B. `src/formats/shared/__tests__/table-column-cross-format-roundtrip.test.ts` | Abschn. 5.1/5, 5.2/5, 5.3 — **einziger** Nachweisweg für Cross-Format, da laut Befund 18 kein UI-Weg existiert |
| E2E (Bedienung) | `tests/e2e/table-columns.spec.ts` (neu) | Button-Klick, sichtbare `CellSelection`, `disabled`-Zustände, Undo/Redo, Selection-Sync, Backspace-Abgrenzung |
| Rundreise (Gleichformat) | Erweiterung `tests/e2e/docx.spec.ts` / `odt.spec.ts` bzw. die neue Datei | Abschn. 5, außer Cross-Format-Teile (Befund 18) |
| Reale Fixtures | komplexe DOCX/ODT (`FEATURE-SPEC-DOCX-ODT.md` Abschn. 18) | Abschn. 5.1.4/5.2.4, Befund 8/16 (Regressionstest), Befund 17 (bekannte Ausnahme dokumentieren) |

Erst wenn alle Testfälle aus Abschn. 3–5/7 auf diesen Ebenen grün (oder mit dokumentierter,
begründeter Ausnahme, z. B. Befund 17 bei irregulären Fremddateien oder Befund 18 für
Cross-Format-Testebene) sind, darf der Backlog-Status auf „vorhanden" wechseln. Befund 8
ist **kein** zulässiger Grund mehr für eine Blocker-Kennzeichnung — er ist empirisch als
korrekt geklärt (Befund 16).

---

## 10. Definition of Done (Pflicht-Abnahmekriterien)

„Spalte löschen" gilt erst dann als **vorhanden**, wenn:

1. Ein echter, klickbarer Toolbar-Button existiert (mit `aria-label="Spalte löschen"`,
   Abschn. 2 Zeile 1/7), der `deleteColumn` sichtbar und nachvollziehbar auslöst.
2. Die markierte Spalte **vor** dem Klick sichtbar hervorgehoben ist (`.selectedCell`-Styling
   gebaut, Befund 12) — kein Löschen „ins Blinde".
3. Alle drei Erkennungsfälle (Abschn. 3.1: Cursor, `CellSelection` Teilhöhe, `CellSelection`
   über mehrere Spalten) einzeln getestet und ihr Verhalten dokumentiert sind.
4. Das Verhalten bei bestehenden Verbindungen (`colspan`/`rowspan`, Abschn. 3.4/3.5) durch
   dedizierte Testfälle nachgewiesen ist.
5. Der Grenzfall „letzte verbleibende Spalte" (Abschn. 3.6) über die **eigene**
   Guard-Nachbildung (Befund 13, **nicht** über `dispatch`-loses `deleteColumn`) als
   `disabled` zurückgemeldet wird — kein stiller No-Op.
6. Abgrenzung Backspace/Entf (nur Zellinhalt, Befund 14) getestet und nicht mit dem
   strukturellen Löschen verwechselt ist.
7. Der Selection-Sync-Regressionstest mit „Spalte löschen" als Auslöser (Abschn. 3.10/7.14)
   geschrieben, grün und dauerhaft Teil der Suite ist.
8. Die Rundreise-Anforderung (Abschn. 5, inkl. Basis-Rundreise 5.0, DOCX, ODT,
   Cross-Format, reale Fremddateien) über echten Upload/Download nachgewiesen ist.
9. Die Writer/Reader-Befunde 6–9 im Zusammenspiel mit „Spalte löschen" einzeln geprüft und
   ihr Ergebnis nachgetragen ist — insbesondere **Befund 7** (bereits behoben →
   Regressionstest) und **Befund 8** (ODT-`covered-table-cell`-Reader: **kein** offener
   Bug, empirisch als korrekt verifiziert — Befund 16 — nur Regressionstest nötig, **kein**
   Reader-Fix und **keine** Dialog-/Einschränkungs-Dokumentation als „nicht unterstützt"
   erforderlich).
10. Kein Testfall stillen Datenverlust (Inhalt einer **nicht** zu löschenden Spalte
    verschwindet) oder eine JS-Exception in der Konsole zeigt — mit Ausnahme der bereits
    als vorbestehend dokumentierten `colCount`-aus-Zeile-0-Schwäche (Befund 17) bei
    irregulären Fremddateien, die separat, nicht als Regression dieses Features zu führen
    ist.
11. Undo/Redo (Abschn. 3.8/7.12-13) zuverlässig funktioniert, auch über mehrere
    aufeinanderfolgende Löschvorgänge.
12. Bedienbarkeit auf Desktop-, Mobile- und Tablet-Viewport nachgewiesen ist (Abschn. 7/20),
    ohne dass eine breite Tabelle den Viewport sprengt (Befund 12).
13. Die Cross-Format-Rundreise (Abschn. 5.1/5, 5.2/5, 5.3) auf **Objektebene** nachgewiesen
    ist (Befund 18 — kein UI-Formatwähler beim Export vorhanden; das ist keine
    Abnahmelücke, sondern die für dieses Produkt korrekte Testebene).
14. Der Backlog-Eintrag `spalte-loeschen` erst nach Erfüllung von 1–13 auf „vorhanden"
    gesetzt wird; andernfalls „fehlt" bzw. „teilweise", sobald ein erster funktionierender,
    aber noch nicht vollständig verifizierter UI-Weg existiert.
