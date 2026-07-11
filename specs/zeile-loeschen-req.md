# Anforderungsspezifikation: Feature „Zeile löschen" (Tabellenzeile entfernen)

Status: **Entwurf zur Freigabe.** Backlog-Status (`specs/FEATURE-BACKLOG.md`, Abschnitt
„3.2 Tabellen", Slug `zeile-loeschen`, Priorität **1** — essenziell): **„fehlt" — gilt
aktuell als nicht vertrauenswürdig und muss vollständig verifiziert werden.** „Nicht
vertrauenswürdig" gilt in **beide** Richtungen: Es darf weder unterstellt werden, dass
„fehlt" automatisch korrekt ist (evtl. existiert doch ein versteckter Weg), noch — erst
recht — später angenommen werden, dass ein „vorhanden" zutrifft, ohne dass **jeder** Punkt
dieser Datei einzeln über echte Browser-Bedienung (Playwright, nicht nur isolierter
Command-Aufruf) nachgewiesen ist (Freigabekriterium siehe Abschnitt 9).

Kurzbeschreibung (Backlog, wörtlich): „Entfernt die markierte Tabellenzeile."

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature `zeile-loeschen`, was
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 („Tabellen") pauschal als „Zeile einfügen
(oberhalb/unterhalb), Zeile löschen" fordert und Abschnitt 17 Zeile 20 als Teil der
Sammelposition „Tabellen-Kontextfunktionen … fehlt komplett in der UI … größte
Einzellücke im gesamten Funktionsumfang" führt. DOCX und ODT teilen sich einen gemeinsamen
internen Editor (`src/formats/shared/editor/WordEditor.tsx`, `Toolbar.tsx`, `commands.ts`,
`src/formats/shared/schema.ts`); Tabellenbearbeitung ist eine reine Editor-Operation und
darf sich zwischen den Formaten **nicht** unterscheiden — nur Import/Export
(`src/formats/docx/reader.ts`+`writer.ts`, `src/formats/odt/reader.ts`+`writer.ts`) sind
formatspezifisch. Jede Anforderung unten gilt für **beide** Formate inklusive Rundreise
(Datei A hochladen → Zeile löschen → exportieren → reimportieren → Ergebnis entspricht
inhaltlich A **minus** der gelöschten Zeile, sonst keine Abweichung).

**Abgrenzung:** Diese Datei behandelt **ausschließlich** das Entfernen einer (oder mehrerer
markierter) Zeile(n). Die verwandten, eigenständigen Backlog-Einträge `zeile-einfuegen`,
`spalte-einfuegen`, `spalte-loeschen`, `zellen-verbinden`/`zellen-teilen` und
`tabelle-loeschen` (alle Priorität 1–2, alle „fehlt") sind **nicht** Gegenstand dieser
Freigabe. Sie teilen mit diesem Feature dieselbe technische Grundlage (`prosemirror-tables`)
und dieselbe fehlende Kontext-Werkzeugleiste; wo eine Abgrenzung zur Klarheit nötig ist,
wird darauf verwiesen (insbesondere Abschnitt 2.2/2.4 gegenüber `spalte-loeschen-req.md`
und `tabelle-loeschen-req.md`).

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Die folgenden Befunde stammen aus tatsächlicher Durchsicht des aktuellen Quellcodes und der
installierten Bibliothek (nicht aus der Backlog-Beschreibung). Sie sind **zu bestätigende
Ansatzpunkte** für die Verifikation — Zeilennummern beziehen sich auf den Stand dieser
Datei und sind bei Umsetzung erneut zu prüfen (der Code wird laufend verändert; frühere
Nachbar-Spezifikationen nennen teils veraltete Zeilennummern, siehe Befund 9).

| # | Ort (Stand dieser Datei) | Inhalt | Befund / Konsequenz |
|---|---|---|---|
| 1 | `src/formats/shared/editor/Toolbar.tsx:277-289` | **Ein einziger** Tabellen-Button „⊞ Tabelle", `onMouseDown → insertTable(2, 2)`, mit `aria-pressed={isInTable(view.state)}` (281) als reinem Anzeige-Zustand | Es existiert **kein** Button, **kein** Untermenü und **keine** kontextabhängige Tabellen-Werkzeugleiste für „Zeile löschen" (ebenso wenig für Zeile/Spalte einfügen, Spalte löschen, verbinden/teilen, Tabelle löschen). Zusätzlich ist das Symbol ein Unicode-Glyph (⊞), das Bild-Label ein Emoji (🖼, 292) — für neue Tabellen-Buttons gilt die SVG-Icon-Pflicht aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 (vgl. bereits umgesetztes `ScissorsIcon` in `Toolbar.tsx:33-53`). |
| 2 | `src/formats/shared/editor/commands.ts:3,6` | Aus `prosemirror-tables` wird **nur** `isInTable` importiert und re-exportiert; `insertTable(rows, cols)` ist lokal definiert (92-102) und baut `table`/`table_row`/`table_cell` direkt aus dem Schema | Es gibt **keinen** `deleteRow`-/„Zeile-löschen"-Command in diesem Modul. Eine Volltextsuche über `src` und `tests` nach `deleteRow`, `removeRow`, `deleteTable`, `selectedRect` liefert **keinen** Treffer außer einem Kommentar in `clipboard.ts:18` und den „whole-cell table selection"-Roundtrip-Tests (Copy/Paste, **nicht** Löschen). |
| 3 | `package.json` (`"prosemirror-tables": "^1.8.5"`) | Die Bibliothek liefert `deleteRow`, `removeRow`, `addRowBefore`/`addRowAfter`, `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`, `selectedRect`, `CellSelection`, `TableMap` fix und fertig mit | Der Umsetzungskern für „Zeile löschen" ist **Verdrahtung** (UI + Command-Wrapper) plus Grenzfall-Behandlung (Befund 5!) und Rundreise-Nachweis — **nicht** die Neuentwicklung einer Tabellen-Manipulationslogik. Das darf aber **nicht** mit „ist schon vorhanden" verwechselt werden: keiner dieser Commands ist verdrahtet. |
| 4 | `src/formats/shared/editor/WordEditor.tsx:109-110` | Plugins `columnResizing()` und `tableEditing()` sind aktiv | Das Aufziehen einer `CellSelection` per Maus über mehrere Zellen/Zeilen funktioniert dadurch **bereits heute**; nur die Aktion „löschen" fehlt als Anknüpfungspunkt. Das eigene Editor-Keymap (85-107) bindet nur `Mod-z/y`, `Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` — **keine eigene** Bindung reagiert struktur-löschend auf eine `CellSelection`. Präzisierung gegenüber einer früheren, zu vorsichtigen Fassung dieser Zeile: Das ist **kein offener/ungeklärter Punkt** — `tableEditing()` selbst registriert über `props.handleKeyDown` (`node_modules/prosemirror-tables/dist/index.cjs:2113-2126,2615`) bereits `Backspace`/`Mod-Backspace`/`Delete`/`Mod-Delete` → `deleteCellSelection`, das laut Quelltext (`index.cjs:1845-1857`) **ausschließlich** je erfasster Zelle den Inhalt durch eine leere Zelle-Füllung ersetzt und `false` zurückgibt, falls keine `CellSelection` vorliegt — **niemals** Zeilen/Spalten strukturell entfernt. Selbst falls das eigene `keymap(baseKeymap)` (im Plugin-Array **vor** `tableEditing()` registriert) zuerst greift, landet man beim generischen `deleteSelection` aus `prosemirror-commands`, das intern `Selection.replace()` aufruft — und `CellSelection.replace()` (`index.cjs:579-586`) ersetzt ebenfalls nur die Inhalts-Ranges der erfassten Zellen, nie die Zellen/Zeilen-Knoten selbst. **Ergebnis: Entf/Rücktaste auf einer `CellSelection` leert schon heute, unabhängig von der Plugin-Reihenfolge, nachweislich nur den Inhalt** (siehe Abschnitt 2.2, Abgrenzung Entf) — zu verifizieren ist hier **nur noch ein Regressionstest**, keine neue Abgrenzungslogik. |
| 5 | `node_modules/prosemirror-tables` — `deleteRow(state, dispatch)` (aus `dist/index.js` verifiziert) | `if (!isInTable(state)) return false;` — und im Ausführungspfad: `const rect = selectedRect(state); ` **`if (rect.top == 0 && rect.bottom == rect.map.height) return false;`** danach Löschen der Zeilen von unten nach oben, dann `dispatch`. Ohne `dispatch` (reiner Verfügbarkeits-Check) wird **immer `true`** zurückgegeben, der `rect`-Guard also **nicht** ausgewertet. | **Zentraler Befund.** Umfasst die Selektion **alle** Zeilen (Cursor in einer 1-Zeilen-Tabelle **oder** `CellSelection` über sämtliche Zeilen), verweigert `deleteRow` die Aktion: kein Dispatch, Rückgabe `false`, **nichts passiert**. Das ist exakt das Gegenstück zum `deleteColumn`-Guard `rect.left == 0 && rect.right == rect.map.width` aus `spalte-loeschen-req.md` (dort Befund 3). Zwei harte Folgen: (a) Der Sonderfall „letzte Zeile löschen" (Abschnitt 2.4) wird von der Bibliothek **nicht** geleistet — er muss **eigens** behandelt werden (Erkennung + `deleteTable`/Absatz-Ersatz). (b) Ein naiver `disabled`-Zustand über den dispatch-losen Check meldet den Button als **aktiv**, obwohl der Klick ein **stiller No-Op** wäre — Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4 (siehe Abschnitt 2.4/2.8). |
| 6 | `node_modules/prosemirror-tables` — `removeRow(tr, rect, row)` | Für jede Rasterspalte der zu löschenden Zeile: liegt die Zelle **oberhalb** an (rowspan-Überdeckung von oben, `pos == map.map[index - width]`) → `rowspan` der Ankerzelle wird um 1 dekrementiert; ist die Zeile die **Ankerzeile** einer nach unten reichenden Verbindung (`pos == map.map[index + width]`) → es wird eine **Kopie mit `rowspan-1` und dem vollständigen `cell.content`** in die nächste Zeile eingefügt (Inhalts-Migration) | Die Rowspan-Behandlung (Dekrement bei Überdeckung, Inhalts-Migration bei Anker) ist von der Bibliothek bereits korrekt geleistet — **muss aber je mit einem eigenen Test belegt werden** (Abschnitt 2.3, Grenzfälle 5/6, Rundreise 5.2/3). Nicht annehmen, prüfen. |
| 7 | `src/formats/docx/writer.ts:158-197` (`tableToDocx`) | `colCount` = Summe der `colspan`-Werte von **Zeile 0** (160); ein `pending[]`-Tracker (163) schreibt für `rowspan>1` `<w:vMerge w:val="restart"/>` (188) und für Fortsetzungszeilen `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>` (174) | Der Writer leitet vMerge-Fortsetzungen **zur Exportzeit aus den aktuellen `rowspan`-Attributen** ab. Nachdem `removeRow` `rowspan` angepasst bzw. den Anker migriert hat, ist der Export daher strukturell konsistent — zu **verifizieren**, nicht anzunehmen. Zur `colCount`-aus-Zeile-0-Ableitung siehe Abschnitt 5.0 (für **Löschen** unkritisch, anders als für `zeile-einfuegen`). |
| 8 | `src/formats/odt/writer.ts:110-174` / `src/formats/odt/reader.ts:301-320` | **Writer:** `colCount` = **Summe der `colspan`-Werte** von Zeile 0 (115-116) — **nicht** die reine Zellenzahl; ein `pending[]`-Tracker emittiert `<table:covered-table-cell/>` für horizontale **und** vertikale Überdeckung (119-168), `table:number-rows-spanned` für `rowspan` (151). **Reader:** liest je Zeile **nur** `<table:table-cell>` (304), **nicht** `<table:covered-table-cell>`, und rekonstruiert `colspan`/`rowspan` aus `number-columns-/rows-spanned` (305-306) | **Achtung — Korrektur gegenüber `spalte-loeschen-req.md` Befund 7/8:** Der dort beschriebene ODT-`colCount`-Bug (reine Zellenzahl) ist im **aktuellen** Code **behoben** (Zeile 116 summiert korrekt `colspan`) und darf **nicht** erneut als offener Befund geführt werden. Das Überspringen von `covered-table-cell` im Reader ist für das ProseMirror-Modell **selbstkonsistent** (überdeckte Rasterpositionen dürfen im `content`-Array einer Zeile gar nicht auftauchen) und für **eigene** Exporte korrekt; für **fremde** ODT-Dateien mit vertikalen Verbindungen ist es dennoch als bekannte Asymmetrie mit einer realen Fixture zu **prüfen** (Rundreise 5.2, Fixture `tableCoveredContent.odt`) — als geteilte Import-Infrastruktur, nicht als `zeile-loeschen`-eigener Fehler. |
| 9 | `src/formats/docx/reader.ts:313-360` (`parseTable`) | `colCount` aus `<w:tblGrid>`; ein `anchors[]`-Array pro Rasterspalte; vMerge-Fortsetzungen (`val != 'restart'`) erhöhen den `rowspan` der Ankerzelle (331-332) | Robuste vMerge→`rowspan`-Rekonstruktion für DOCX-Fremddateien beim Import; für den Rundreise-Nachweis nach Zeilen-Löschung ist damit die DOCX-Seite solider als die ODT-Seite (Befund 8). Als Asymmetrie zwischen den Formaten zu dokumentieren, kein Blocker. |
| 10 | `src/formats/shared/schema.ts:154` | `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` | Standard-Schema mit `colspan`/`rowspan`/`colwidth`, `cellContent: 'block+'` (mehrere Absätze/Bilder/verschachtelte Tabellen je Zelle). `doc: { content: 'block+' }` (14) verlangt **mindestens einen** Block — relevant für den Sonderfall „letzte Zeile / einzige Tabelle" (Abschnitt 2.4). Keine Schema-Änderung nötig. |
| 11 | Tests: `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('… round trip: tables')` ab 229, Rowspan-Test 279-300), ODT-Äquivalent ab 219; `tests/e2e/` (u. a. `selection-regression.spec.ts`, `complex-import-fidelity.spec.ts`, `roundtrip-fidelity.spec.ts`, `docx.spec.ts`, `odt.spec.ts`) | Bestehende Tabellen-Tests konstruieren ProseMirror-JSON **direkt** und prüfen nur Schreiben/Lesen inkl. `colspan`/`rowspan`-Erhalt; **keiner** ruft `deleteRow` auf. Kein E2E-Test legt eine Tabelle über echte Toolbar-Bedienung an oder verändert sie (weil es die UI dafür nicht gibt) | Die Reader/Writer-Rundreise für **statische** Tabellen inkl. Merges ist grundsätzlich abgedeckt (guter Regressionsschutz-Ausgangspunkt), das **Verhalten einer Zeilen-Löschung** ist auf **keiner** Ebene getestet. |

**Konsequenz für die Bewertung:** Der Backlog-Status „fehlt" ist für `zeile-loeschen` nach
dieser Prüfung **bestätigt korrekt** — es gibt weder einen UI-Weg noch einen verdrahteten
Command noch einen Test, obwohl die Bibliothek die Kernbefehle mitliefert. Der wichtigste,
in der bisherigen Fassung dieser Datei fehlende Punkt ist **Befund 5** (der
`deleteRow`-Guard): Er macht den Sonderfall „letzte Zeile" zu **Bau-Arbeit** und ist die
konkreteste Gefahr für einen stillen Fehlschlag.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

Eine ernstzunehmende Textverarbeitung bietet „Zeile löschen" über mehrere gleichwertige
Wege an (Word: Ribbon „Tabellentools → Layout → Löschen → Zeilen löschen" bzw. Rechtsklick
→ „Zeilen löschen"; LibreOffice Writer: „Tabelle → Löschen → Zeilen" bzw. Symbolleiste
„Tabelle"). Jeder unten als „Soll" markierte Weg muss einzeln funktionieren und einzeln
getestet werden.

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | **Kontextabhängige Tabellen-Werkzeugleiste** mit Button „Zeile löschen" (nur sichtbar/aktiv, solange Cursor/Selektion in einer Tabelle) | **fehlt komplett** — nur der statische „⊞ Tabelle"-Einfügen-Button existiert (`Toolbar.tsx:277-289`) | **Verbindliche Mindestanforderung.** Neue Button-Gruppe (mind. „Zeile oberhalb/unterhalb einfügen", „Zeile löschen", „Spalte links/rechts einfügen", „Spalte löschen", „Zellen verbinden/teilen", „Tabelle löschen" — vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6), sichtbar/aktiv nur bei `isInTable(view.state)`, **SVG-Icon** (kein Emoji/Unicode-Glyph, Abschnitt 20.1), `aria-label="Zeile löschen"`, `disabled`-Logik gemäß Abschnitt 2.4 (letzte Zeile). |
| 2 | Rechtsklick-Kontextmenü innerhalb einer Tabellenzeile → „Zeilen löschen" | Es gibt **kein** eigenes Kontextmenü. `WordEditor.tsx:117-121` dokumentiert eine **bewusste** projektweite Entscheidung, **kein** `contextmenu` abzufangen, damit das native Browser-Kontextmenü (u. a. „Ausschneiden") erreichbar bleibt (vgl. `ausschneiden-req.md` Abschnitt 1) | **Nice-to-have, kein Blocker.** Diese Entscheidung ist **feature-übergreifend** (betrifft ebenso `spalte-loeschen`, `zellen-verbinden` etc.) und darf nicht pro Einzelfeature unterschiedlich getroffen werden. Zulässig: (a) beim Toolbar-Weg bleiben und den Kontextmenü-Weg **ausdrücklich als nicht unterstützt** dokumentieren, oder (b) projektweit ein tabellenbewusstes Kontextmenü einführen. Kein unklarer Zwischenzustand. |
| 3 | Tastenkombination | Word/LibreOffice definieren für „Zeile löschen" **keine** durchgängige Standard-Tastenkombination (anders als z. B. Fett = Strg+B) | **Kein Soll-Element** — bewusst nicht gefordert, hier nur zur Vollständigkeit dokumentiert, damit die Abwesenheit nicht als vergessene Lücke missverstanden wird (analog `ausschneiden-req.md` Abschnitt 1, `spalte-loeschen-req.md` Abschnitt 2 Zeile 5 — dortige Menüpunkte-Tabelle, nicht die Code-Analyse in deren Abschnitt 1). |
| 4 | Entf-/Rücktaste bei einer über eine Zeile aufgezogenen `CellSelection` | **Bereits korrekt, per Quellcode verifiziert** (Befund 4, Abschnitt 0): `tableEditing()`s eigenes `handleKeyDown` bindet Entf/Rücktaste auf `deleteCellSelection`, das nachweislich nur Zellinhalte leert; selbst der generische Fallback über `keymap(baseKeymap)` würde über `CellSelection.replace()` dasselbe sichere Ergebnis liefern | **Kein Bau-Auftrag mehr**, nur noch **Abgrenzungs-Regressionstest** (siehe Abschnitt 2.2 und `ausschneiden-req.md` Abschnitt 3): Entf/Rücktaste auf einer `CellSelection` leert **nur den Zellinhalt**, entfernt **niemals** Zeilen strukturell. „Zeile löschen" bleibt ausschließlich über Weg 1 (ggf. 2) erreichbar. Dauerhaft in der Suite zu halten, damit eine künftige Keymap-Änderung dieses Verhalten nicht versehentlich umwidmet. |
| 5 | Bestätigungsdialog vor dem Löschen | Nicht vorhanden (Funktion existiert nicht) | **Kein Soll-Element.** Referenzverhalten (Word/LibreOffice) verlangt **keine** Rückfrage; Rückgängig (Strg+Z) ist das Sicherheitsnetz (Abschnitt 2.6). Explizit dokumentiert, damit kein Dialog „nachgerüstet" wird. |
| 6 | Sichtbarer/aktiver Zustand außerhalb einer Tabelle | n/a (Button existiert nicht) | Button **ausgeblendet oder deaktiviert**, wenn `isInTable(view.state)` `false` ist — kein Klick, der stillschweigend nichts tut (Abschnitt 20.4). Diese Regel muss für **alle** Tabellen-Kontextfunktionen **gleich** gehandhabt werden, nicht gemischt. |
| 7 | Mobile/Touch | Nicht verifizierbar (Funktion fehlt); unklar, ob eine Zeilen-Selektion per Touch überhaupt möglich ist (keine „Zeilen-Griffleiste" links) | Auf den Playwright-Projekten `Mobile` (Pixel 7) und `Tablet` (iPad Mini) (`playwright.config.ts:34-36`) muss **mindestens ein** funktionierender Weg existieren, eine Zeile auszuwählen (mind. „Cursor in Zelle") und über die Tabellen-Werkzeugleiste zu löschen. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen
- „Zeile löschen" ist nur aktiv/sichtbar bei `isInTable(view.state) === true` — als
  kollabierter Cursor in einer Zelle **oder** als `CellSelection` über eine/mehrere
  Zellen/Zeilen.
- Außerhalb einer Tabelle: Button ausgeblendet (bevorzugt) oder deaktiviert (Abschnitt 1,
  Zeile 6) — konsistent für **alle** Tabellen-Kontextfunktionen.

### 2.2 Welche Zeile(n) betroffen sind
- **Kollabierter Cursor in genau einer Zelle:** Die **gesamte Zeile** dieser Zelle wird
  gelöscht — unabhängig von der Spaltenzahl.
- **`CellSelection` innerhalb **derselben** Zeile, aber nicht über alle Spalten** (z. B.
  Spalte 1–2 von 4): Es wird trotzdem die **komplette Zeile** gelöscht (Referenzverhalten
  Word/LibreOffice; „Zeile löschen" bezieht sich immer auf ganze Zeilen). Bewusst
  abzugrenzen von „Ausschneiden"/„Entf", die bei einer `CellSelection` **nur den Inhalt**
  leeren (siehe `ausschneiden-req.md` Abschnitt 2.2/3, Grenzfälle 6/7) — die zugrunde
  liegenden `prosemirror-tables`-Pfade sind verschieden: „Zeile löschen" muss **eigens**
  `deleteRow`/`removeRow` aufrufen (Befund 3/5/6), während Entf/Rücktaste bereits **heute**
  über `deleteCellSelection` (bzw. den gleichwertigen `CellSelection.replace()`-Fallback,
  Befund 4) korrekt nur den Inhalt entfernt — kein neuer Code für die Abgrenzung selbst,
  nur ein Regressionstest dafür.
- **`CellSelection` über mehrere Zeilen:** Alle von der Selektion **vollständig oder
  teilweise** berührten Zeilen werden in **einem** Undo-Schritt entfernt. `deleteRow`
  löscht dabei von `rect.bottom-1` bis `rect.top` (Befund 6), also von unten nach oben, um
  Indexverschiebung zu vermeiden.
- **Sonderfall „Selektion umfasst ALLE Zeilen":** Nach Befund 5 verweigert `deleteRow`
  genau diesen Fall (`rect.top == 0 && rect.bottom == rect.map.height` → `return false`,
  kein Dispatch). Das darf **nicht** als stiller No-Op beim Nutzer ankommen — es ist
  identisch zu behandeln wie „letzte verbleibende Zeile" (Abschnitt 2.4): entweder die
  **gesamte Tabelle** entfernen oder sichtbar rückmelden. Ein bloßer Weiterreichen des
  Bibliotheks-`false` ist **unzulässig**.

### 2.3 Verhalten bei verbundenen Zellen (Rowspan/Colspan)
- **Rowspan — gelöschte Zeile ist die Ankerzeile:** Der Zellinhalt **wandert** in die
  nächste noch vorhandene, von der Verbindung erfasste Zeile, `rowspan` wird dekrementiert
  (Befund 6, Migrationspfad). **Kein Inhaltsverlust.** Muss eigens getestet werden.
- **Rowspan — gelöschte Zeile wird nur „überdeckt" (nicht Ankerzeile):** `rowspan` der
  Ankerzelle sinkt um 1, der Zellinhalt selbst bleibt unberührt (Befund 6,
  Dekrement-Pfad).
- **Colspan (horizontal verbundene Zelle):** Liegt vollständig innerhalb **einer** Zeile.
  Wird diese Zeile gelöscht, verschwindet die Zelle **komplett mit der Zeile** — **keine**
  Migration (keine andere Zeile referenziert dieses `colspan`). Klar von „Rowspan"
  abzugrenzen und getrennt zu testen (Grenzfall 16).

### 2.4 Sonderfall: letzte verbleibende Zeile / Selektion aller Zeilen (**Pflicht-Sonderbehandlung**)
- **Ausgangslage (Befund 5):** `deleteRow` verweigert das Löschen, sobald die Selektion
  **alle** Zeilen umfasst — sei es, weil die Tabelle nur **eine** Zeile hat, oder weil eine
  `CellSelection` über sämtliche Zeilen aufgezogen wurde. Rückgabe `false`, **kein
  Dispatch**. Der dispatch-lose Verfügbarkeits-Check meldet in diesem Zustand **fälschlich
  `true`**.
- **Soll:** In diesem Fall wird die **gesamte Tabelle** entfernt (Referenzverhalten
  Word/LibreOffice: Löschen der letzten Zeile entfernt die Tabelle als Ganzes). Umsetzung
  über eine **eigene Vorprüfung** (`selectedRect` + Guard-Bedingung nachbilden) mit
  anschließendem `deleteTable` bzw. äquivalentem Entfernen des Tabellenknotens — **nicht**
  durch bloßes Aufrufen von `deleteRow` (das hier nichts tut).
- **Cursor danach:** landet an der Stelle, an der die Tabelle stand, in einem gültigen
  Absatz (bestehend oder neu eingefügt) — nie in einem leeren/kaputten Dokumentzustand.
- **Einzige Tabelle im Dokument:** Da `doc: { content: 'block+' }` (`schema.ts:14`)
  mindestens einen Block verlangt, muss beim Entfernen der einzigen Tabelle **automatisch
  ein leerer Standard-Absatz** eingesetzt werden, damit der Editor bedienbar bleibt (Cursor
  aktiv, Tippen möglich) — analog `ausschneiden-req.md` Abschnitt 3 Grenzfall 2 und
  `tabelle-loeschen-req.md` Abschnitt 2.4 (dort exakt dieselbe `schema.ts:14`-Begründung für
  den Absatz-Fallback beim Entfernen der einzigen/letzten Tabelle).
- **Alternativ zulässig (dokumentierte Entscheidung erforderlich):** statt automatischem
  Tabellen-Löschen den Button in diesem Zustand **deaktivieren** und per Tooltip auf
  „Tabelle löschen" verweisen. Genau **ein** Weg ist zu wählen und hier nachzutragen — ein
  stiller No-Op ist in **keinem** Fall zulässig.

### 2.5 Cursor-/Selektionszustand nach dem Löschen
- Bleibt nach dem Löschen mindestens eine Zeile: Cursor in eine sinnvolle Zelle der
  **nachfolgenden** Zeile (gleiche Spaltenposition); existiert keine nachfolgende Zeile
  (letzte Zeile gelöscht), in die **vorhergehende** Zeile an gleicher Spaltenposition.
- Wurde die gesamte Tabelle entfernt (2.4): Cursor in den nachfolgenden bzw. — falls keiner
  existiert — vorhergehenden/neu eingefügten Absatz.
- Der Editor bleibt in **jedem** Fall fokussiert und sofort weiter bedienbar (Tippen ohne
  weiteren Klick), konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 („kein Reset,
  kein Verlust des Fokus/der Selektion").

### 2.6 Undo/Redo-Verhalten
- „Zeile löschen" erzeugt **einen** Undo-Schritt — auch bei mehreren betroffenen Zeilen
  (`deleteRow` sammelt alle `removeRow`-Aufrufe in **einer** Transaktion, Befund 5/6) und
  auch im Sonderfall 2.4 (Tabellen-Entfernen + ggf. Absatz-Einfügen als **ein** Schritt).
- Strg+Z stellt Zeileninhalt, Zeilenreihenfolge, verbundene Zellen (colspan/rowspan) **und**
  eine sinnvolle Cursor-/Selektionsposition exakt wieder her. Strg+Y bzw. Strg+Umschalt+Z
  entfernt die Zeile(n) erneut identisch.
- Der Löschvorgang darf sich in der History **nicht** mit einer unmittelbar vorausgehenden,
  unabhängigen Aktion (z. B. Tippen in einer anderen Zelle) verschmelzen — beides bleibt
  separat rückgängig machbar.

### 2.7 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/20 beschreibt einen bereits gefundenen Fehler:
  nach einer Toolbar-Aktion auf eine Selektion, gefolgt von einem Klick zur
  Neupositionierung, blieb die interne ProseMirror-Selektion veraltet stehen, sodass
  nachfolgende Eingaben den gesamten Inhalt ersetzten/löschten. Der Fix (Mouseup-
  Reconciliation) liegt in `WordEditor.tsx:43` ff. (`reconcileSelectionOnClick`) und
  `141-153` (Mousedown/Mouseup-Handler mit `CLICK_DRAG_THRESHOLD_PX`). Abschnitt 6 nennt
  Tabellen ausdrücklich als „Hauptverdachtsfall, da Klicks zwischen Zellen ähnliche
  Selektionswechsel auslösen".
- **„Zeile löschen" ist ein zusätzlicher Verdachtsfall**, weil es — wie „Fett auf Alles
  auswählen" — eine Selektion (`CellSelection`/Cursor-in-Zelle) durch eine
  Struktur-Transaktion ersetzt und die anschließende Cursor-Position über einen anderen
  Codepfad bestimmt wird als beim Tippen. **Pflicht-Regressionstest** (Abschnitt 7, Punkt
  7; Grenzfall 14): Tabelle mit mehreren Zeilen → Zeile löschen → per Klick in eine
  verbleibende Zelle neu positionieren → Enter → weiter tippen → Dokument bleibt konsistent,
  keine unbeabsichtigte Komplett-Löschung/-Ersetzung.

### 2.8 Kein stiller Fehlschlag
- Jeder Versuch, „Zeile löschen" ohne gültigen Tabellenkontext auszulösen, muss entweder
  gar nicht möglich sein (Button aus) oder sichtbar rückmelden — **kein** Klick, der
  scheinbar etwas tut, aber nichts verändert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
- **Insbesondere der Guard-Fall aus Befund 5/Abschnitt 2.4** (Selektion = alle Zeilen) darf
  nicht als wortloses Nichtstun enden — das ist der wahrscheinlichste konkrete stille
  Fehlschlag dieses Features.
- Schlägt das Löschen aus einem unerwarteten Grund fehl (z. B. inkonsistente Tabelle nach
  Import einer exotischen Fremddatei), darf **kein** Teil-Löschen (nur manche Zellen
  entfernt, Tabelle danach invalide) entstehen — entweder vollständiger Erfolg oder
  unveränderter Ausgangszustand plus sichtbarer Hinweis.

---

## 3. Grenzfälle

1. **Kollabierter Cursor in genau einer Zelle:** löscht die gesamte Zeile, unabhängig von
   der Spaltenzahl.
2. **`CellSelection` innerhalb einer Zeile, nicht alle Spalten markiert:** löscht trotzdem
   die **komplette** Zeile (2.2) — nicht mit Inhalt-Leeren via Entf/Ausschneiden
   verwechseln.
3. **`CellSelection` über mehrere (aber nicht alle) Zeilen:** alle berührten Zeilen in
   einem Schritt entfernt, ein Undo stellt alle wieder her.
4. **`CellSelection` über ALLE Zeilen** (Guard-Fall, Befund 5): `deleteRow` verweigert —
   muss wie „letzte Zeile" behandelt werden (2.4), **kein** stiller No-Op. **Zentraler
   Pflicht-Testfall.**
5. **Löschen der einzigen verbleibenden Zeile:** gesamte Tabelle wird entfernt (2.4),
   Cursor in gültigem Absatz, bei einziger Tabelle bleibt ein leerer Absatz übrig.
6. **Ankerzeile einer vertikal verbundenen Zelle (`rowspan`) löschen:** Inhalt wandert in
   die nächste erfasste Zeile, `rowspan` korrekt dekrementiert — kein Inhaltsverlust (2.3).
7. **Nur „überdeckte" Zeile einer `rowspan`-Verbindung löschen (nicht Anker):** `rowspan`
   der Ankerzelle sinkt um 1, Zellinhalt unverändert (2.3).
8. **Erste Zeile löschen:** verbleibende Zeilen rücken korrekt nach, keine
   Off-by-one-Fehler bei Folgeoperationen; falls Zeile 0 eine `rowspan`-Ankerzelle trägt,
   greift die Migration (Befund 6) und die neue Zeile 0 bleibt voll-breit (relevant für den
   Export, siehe Abschnitt 5.0).
9. **Letzte Zeile (bei >1 Zeile) löschen:** Tabelle bleibt bestehen, Cursor in der neuen
   letzten Zeile.
10. **Tabelle direkt am Dokumentanfang/-ende:** Löschen (auch der letzten Zeile) bringt
    Cursor-Positionierung/`gapCursor` nicht in einen inkonsistenten Zustand — Editor bleibt
    normal bedienbar (Analogie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10).
11. **Zwei Tabellen direkt hintereinander (ohne trennenden Absatz):** Löschen einer Zeile in
    Tabelle A darf Tabelle B nicht berühren oder mit ihr verschmelzen.
12. **Zeile mit mehreren Absätzen / gemischter Formatierung / eingebettetem Bild in einer
    Zelle:** gesamter Inhalt verschwindet mit der Zeile — kein verwaister Knoten bleibt
    zurück; beim Export keine verwaiste Bilddatei im Zip (siehe 5.2, Testfall 6).
13. **Verschachtelte Tabelle (Tabelle in einer Zelle):** Löschen einer Zeile der **äußeren**
    Tabelle, die eine innere Tabelle enthält, darf nicht abstürzen; die innere Tabelle
    verschwindet mit der Zeile, gerät nicht in einen korrupten Zustand (Analogie Abschnitt
    6, Testfall 8; reale Fixtures `subTables*.odt`, `table-within-textBox-within-frame.odt`,
    `deep-table-cell.docx`).
14. **Pflicht-Regressionstest Selection-Sync-Bug** (2.7): Tabelle → Zeile löschen → Klick
    zur Neupositionierung → Enter → weiter tippen → Dokument konsistent, keine
    unbeabsichtigte Komplett-Löschung.
15. **„Zeile löschen" ohne Tabellenkontext** (Cursor im Fließtext): Button nicht
    sichtbar/aktivierbar, keine Konsole-Exception.
16. **Zeile mit reiner `colspan`-Zelle (keine `rowspan`-Beteiligung) löschen:** Zelle
    verschwindet vollständig mit der Zeile, keine Migration (2.3, Abgrenzung zu 6/7).
17. **Große Tabelle** (>5 Spalten, >10 Zeilen, Analogie Abschnitt 6 Testfall 9): Löschen
    einer mittleren Zeile verändert ausschließlich diese, alle übrigen Zellinhalte bleiben
    unverändert und in korrekter Reihenfolge, keine spürbare Verzögerung.
18. **Reale komplexe Fremddatei mit exotischer Tabellenstruktur** (unregelmäßige
    `gridSpan`/`vMerge` bzw. `covered-table-cell`-Kombinationen): importieren, eine Zeile
    löschen → kein Absturz, keine stille Korruption; wo eine Rowspan-Migration nicht
    eindeutig auflösbar ist, greift ein **dokumentiertes, deterministisches** Fallback (kein
    zufälliges Verhalten). Reale Fixtures: `tableRowDeletionTest.odt` (direkt einschlägig!),
    `tableOps.odt`, `tableCoveredContent.odt`, `tableComplex_DOC_LO41.odt`,
    `table-column-delete-with-merge.odt`.
19. **Schnelles Mehrfach-Auslösen** (mehrere Klicks/Tastendrücke in Folge): jede Löschung
    ein eigener Undo-Schritt, kein Event-Race, keine Race Condition mit der
    Selection-Reconcile-Logik aus `WordEditor.tsx`.
20. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht im Scope):** Sobald
    Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, Testfall 8 nennt
    „Tabellen-Struktur betreffende Änderung" ausdrücklich), muss „Zeile löschen" bei aktiver
    Aufzeichnung als Löschung markiert werden, statt sofort endgültig zu entfernen. Nur als
    künftige Abhängigkeit vermerkt.
21. **Mobile/Touch:** Zeile auf `Mobile` (Pixel 7) und `Tablet` (iPad Mini) auswählen und
    löschen — mind. ein funktionierender Weg auf beiden Projekten (Abschnitt 1, Zeile 7).

---

## 4. Erforderliche Code-Änderungen (Umsetzungsskizze — verbindlich ist Abschnitt 2/9, nicht diese Skizze)

Zur Aufwandseinordnung auf Basis von Abschnitt 0; die genaue Architektur legt das
zugehörige `zeile-loeschen-code.md` (Dev) fest:

1. `commands.ts`: neuer Command `deleteTableRow` — dünner Wrapper, der **zuerst** den
   Guard-Fall aus Befund 5 selbst prüft (`isInTable` → `selectedRect` →
   `rect.top === 0 && rect.bottom === rect.map.height`) und in diesem Fall auf ein
   Tabellen-Entfernen (`deleteTable` + ggf. Absatz-Einfügen, Abschnitt 2.4) umleitet,
   andernfalls `deleteRow` aus `prosemirror-tables` aufruft. Zusätzlich eine
   `canDeleteTableRow(state)`-Verfügbarkeitsfunktion, die den Guard **mit** auswertet (der
   dispatch-lose `deleteRow`-Check tut das nicht — Befund 5!), damit der Button-Zustand
   korrekt ist.
2. `Toolbar.tsx` bzw. eine neue Tabellen-Werkzeugleisten-Komponente: Button „Zeile löschen"
   analog zu `ScissorsIcon`-Muster (SVG), sichtbar/aktiv nur bei `isInTable`, `disabled`
   gemäß Punkt 1, `aria-label`.
3. Entscheidung Kontextmenü ja/nein (Abschnitt 1, Zeile 2) — feature-übergreifend, nicht
   isoliert für `zeile-loeschen`.
4. **Keine** Schema- oder Reader/Writer-Änderung nötig (Befund 7/8/9/10) — die
   Export/Import-Pfade behandeln beliebige Zeilenzahl inkl. Merges bereits; nur die
   Rundreise **nach** einer echten Löschung ist noch nicht getestet.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

### 5.0 Warum „Zeile 0 löschen" beim Export unkritisch ist (verifizierter Kontext)
Beide Writer leiten die Tabellen-Spaltenzahl **aus Zeile 0** ab (`docx/writer.ts:160`,
`odt/writer.ts:115-116`, je Summe der `colspan`-Werte). Für das **Einfügen** einer neuen
Zeile 0 ist das ein Risiko (siehe `zeile-einfuegen-req.md` Grenzfall 5). Für das **Löschen**
ist es unkritisch, weil `removeRow` beim Entfernen einer Ankerzeile eine `rowspan-1`-Kopie
in die Folgezeile migriert (Befund 6): Die neue Zeile 0 trägt danach stets Zellen mit
voller effektiver Spaltenbreite. Dieser Zusammenhang ist dennoch mit **Grenzfall 8** (erste
Zeile mit `rowspan`-Anker löschen → exportieren → reimportieren → Spaltenzahl unverändert)
explizit zu **belegen**, nicht bloß anzunehmen.

### 5.1 Baseline (Regressionsschutz — darf durch das neue Feature nicht brechen)
Wie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/19 fordert: DOCX-Datei mit mehrzeiliger
Tabelle (inkl. mind. einer `rowspan`- und einer `colspan`-Zelle) hochladen, **ohne
Änderung** exportieren, reimportieren → Ergebnis entspricht inhaltlich A (Zeilenzahl,
verbundene Zellen identisch). Ebenso ODT. Die bestehenden Unit-Tests
`describe('… round trip: tables')` (`docx/__tests__/roundtrip.test.ts:229`,
`odt/__tests__/roundtrip.test.ts:219`, inkl. Rowspan-Erhalt-Test DOCX:279-300) müssen grün
bleiben. Diese Baseline muss grün sein, damit ein späterer Rundreise-Fehler eindeutig der
Zeilen-Löschung zugeordnet werden kann.

### 5.2 „Zeile löschen"-spezifische Rundreise — Testfälle (je über **echte** Bedienung ausgelöst)
1. DOCX mit mehrzeiliger Tabelle importieren → eine Zeile im Editor löschen → als DOCX
   exportieren → reimportieren → gelöschte Zeile fehlt vollständig, alle übrigen
   Zeilen/Zellinhalte unverändert und in korrekter Reihenfolge, `w:tblGrid`/Spaltenzahl
   konsistent, kein verwaistes `<w:tr>`.
2. Dieselbe Sequenz für ODT (`table:table-row`-Elemente entsprechend reduziert,
   `<table:table-column>`-Anzahl unverändert).
3. Ankerzeile einer vertikal verbundenen Zelle (`rowspan`) löschen → Export → Reimport →
   `rowspan` (DOCX `w:vMerge`-Kette / ODT `table:number-rows-spanned`) der verbleibenden
   Zelle korrekt dekrementiert, migrierter Inhalt an richtiger Stelle, keine invalide
   Merge-Referenz.
4. Zeile mit horizontal verbundener Zelle (`colspan`) löschen → Export → Reimport → Zeile
   inkl. verbundener Zelle vollständig entfernt, `gridSpan`/`table:number-columns-spanned`
   der übrigen Zeilen für sich konsistent.
5. Nur „überdeckte" Zeile einer `rowspan`-Verbindung löschen (Anker bleibt) → Export →
   Reimport → `rowspan` um 1 reduziert, Ankerinhalt unverändert.
6. Zeile mit einem Bild in einer Zelle löschen → Export → Reimport → Bild korrekt nicht mehr
   enthalten **und** keine verwaiste Bilddatei im DOCX-/ODT-Zip (Analogie Abschnitt 7
   Testfall 9; `ausschneiden-req.md` Abschnitt 4.2 Testfall 6).
7. Letzte verbleibende Zeile löschen (Tabelle verschwindet, 2.4) → Export → Reimport → keine
   leere/kaputte Tabellenstruktur, umgebende Absätze unverändert; bei einziger Tabelle bleibt
   der eingefügte leere Absatz erhalten.
8. Mehrere Zeilen auf einmal löschen (Mehrzeilen-`CellSelection`, 2.2/Grenzfall 3) → Export →
   Reimport → exakt die erwarteten Zeilen fehlen, keine zusätzliche versehentlich entfernt.
9. **Fremddatei-Rundreise:** `tableRowDeletionTest.odt` importieren → eine Zeile löschen →
   Export → Reimport; zusätzlich `tableCoveredContent.odt` (vertikale Verbindung mit
   `covered-table-cell`, Befund 8) — zunächst prüfen, ob die Spaltenzuordnung überhaupt
   korrekt importiert wurde; falls durch die geteilte Import-Infrastruktur beeinflusst, als
   **Abhängigkeit** kennzeichnen, nicht als `zeile-loeschen`-Fehler.
10. Cross-Format: ODT mit Tabelle importieren → Zeile löschen → als DOCX exportieren →
    reimportieren → Struktur (verbleibende Zeilen, verbundene Zellen) konsistent.
11. Cross-Format umgekehrt: DOCX → Zeile löschen → als ODT exportieren → reimportieren.
12. Doppelte Rundreise (Formatwechsel hin und zurück, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19
    Testfall 3): DOCX → Editor (Zeile löschen) → ODT → Editor → DOCX → Inhalt nach zwei
    Konvertierungen weiterhin identisch zum erwarteten Nach-Löschen-Zustand;
    Formatierungsverluste bei Cross-Format sind zu dokumentieren, **Text-/Strukturverlust
    nicht** akzeptabel.
13. Große Tabelle (>5 Spalten, >10 Zeilen) → mittlere Zeile löschen → Export → Reimport →
    alle übrigen Zellinhalte identisch, keine Off-by-one-Verschiebung.

**Abnahmemaßstab:** Für **jede** exportierte Datei gilt die Validierungsregel aus
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 — prüfbar valide auch mit einem **unabhängigen**
Parser (nicht nur dem eigenen Reader), damit sich Schreib- und Lesefehler nicht gegenseitig
„unsichtbar" ausgleichen.

---

## 6. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Kontextabhängige Tabellen-Werkzeugleiste | fehlt komplett | neu bauen, sichtbar nur bei `isInTable(view.state)`, siehe Abschnitt 1 |
| 2 | Button „Zeile löschen" | fehlt komplett | neu bauen, SVG-Icon, `aria-label`, ruft `deleteTableRow` (Abschnitt 4) auf — inkl. Guard-Sonderbehandlung 2.4 |
| 3 | `canDeleteTableRow`-Verfügbarkeit für `disabled`-Zustand | fehlt (dispatch-loser `deleteRow`-Check ist im Guard-Fall irreführend, Befund 5) | eigene Prüfung inkl. Guard, damit kein stiller No-Op |
| 4 | Kontextmenü-Eintrag „Zeilen löschen" | bewusst kein Kontextmenü (`WordEditor.tsx:117-121`) | Nice-to-have; Entscheidung feature-übergreifend dokumentieren (Abschnitt 1, Zeile 2) |
| 5 | Entf/Rücktaste bei `CellSelection` | keine struktur-löschende Bindung | muss **nur** Inhalt leeren, nie Struktur — Abgrenzungs-Test (2.2) |
| 6 | Rowspan-Migration / Colspan-Komplettverlust | ungetestet (Bibliothek liefert es, Befund 6) | je eigener Test (2.3, Grenzfälle 6/7/16) |
| 7 | Sonderfall „letzte Zeile / alle Zeilen" (Guard) | fehlt, Bibliothek verweigert | eigene Sonderbehandlung + Test (2.4, Grenzfälle 4/5) |
| 8 | Dauerhafter Selection-Sync-Regressionstest × Zeile löschen | fehlt | Pflichttest (2.7, Grenzfall 14) |
| 9 | Mobile/Touch-Zugriff | ungeprüft | mind. ein Weg auf `Mobile`/`Tablet` (Abschnitt 1, Zeile 7) |

---

## 7. Testfälle (Zusammenfassung, E2E-Fokus)

Analog zum Playwright-Aufbau in `tests/e2e/selection-regression.spec.ts` (echte
Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, `getByRole`/`getByTitle`;
`CellSelection` per `page.mouse`/Shift-Klick; Datei-Upload via `filechooser`, Download via
`page.waitForEvent('download')`) — **keine** isolierten Command-Aufrufe:

1. Tabelle mit 3 Zeilen einfügen, Cursor in mittlere Zeile, „Zeile löschen" → mittlere Zeile
   verschwindet, Zeile 1 und 3 bleiben unverändert und rücken zusammen.
2. `CellSelection` über zwei komplette Zeilen (von 3) aufziehen, „Zeile löschen" → beide
   Zeilen verschwinden in einem Schritt, dritte bleibt.
3. Teilbereich **einer** Zeile markieren (nicht alle Spalten), „Zeile löschen" → komplette
   Zeile verschwindet (nicht nur markierte Zellen).
4. `CellSelection` über **alle** Zeilen aufziehen, „Zeile löschen" → gesamte Tabelle wird
   entfernt bzw. sichtbar rückgemeldet (Guard-Fall, Grenzfall 4) — **kein** stiller No-Op.
5. Tabelle mit genau einer Zeile → „Zeile löschen" → gesamte Tabelle verschwindet, Editor
   bleibt mit gültigem Absatz bedienbar (2.4).
6. Tabelle mit vertikal verbundener Zelle (`rowspan` über zwei Zeilen) → Ankerzeile löschen →
   verbleibende Zeile zeigt migrierten Inhalt, kein Datenverlust (2.3).
7. **Selection-Sync-Regressionstest (Pflicht, dauerhaft):** Tabelle → Zeile löschen → Klick
   zur Neupositionierung in verbleibender Zelle → Enter → weiter tippen → Dokument korrekt,
   keine unbeabsichtigte Löschung/Ersetzung (2.7/Grenzfall 14).
8. Entf-Taste bei markierten Zellen einer Zeile → nur Zellinhalte geleert, Zeile bleibt
   strukturell bestehen (Abgrenzungstest zu 1–4). Erwartetes Ergebnis ist bereits durch
   Quellcode-Analyse bestätigt (Befund 4/Abschnitt 1 Zeile 4) — dieser Test ist reiner
   Regressionsschutz, keine Verhaltens-Neuentdeckung.
9. Strg+Z direkt nach „Zeile löschen" → exakter Ursprungszustand (Inhalt, Reihenfolge,
   verbundene Zellen, Cursor); danach Strg+Y → Zeile(n) erneut identisch entfernt.
10. „Zeile löschen" ohne Tabellenkontext (Cursor im Fließtext) → Button nicht
    sichtbar/aktivierbar, keine Konsole-Exception (Grenzfall 15).
11. „Zeile löschen" → Export nach DOCX → Reimport → siehe 5.2 Testfall 1.
12. „Zeile löschen" → Export nach ODT → Reimport → siehe 5.2 Testfall 2.
13. Fremddatei-Import (`tableRowDeletionTest.odt`, `deep-table-cell.docx`) → mittlere Zeile
    per Toolbar löschen → Rundreise → übrige Zellinhalte unverändert (5.2 Testfall 9/13).
14. Verschachtelte Tabelle (`subTables*.odt`) → Zeile der äußeren Tabelle mit innerer Tabelle
    löschen → kein Absturz, innere Tabelle verschwindet mit (Grenzfall 13).
15. Kernverhalten (Punkte 1, 4, 5, 7) auf den drei Hauptprojekten `Desktop Chrome`, `Mobile`
    (Pixel 7), `Tablet` (iPad Mini) (`playwright.config.ts:34-36`).

---

## 8. Testmatrix — Zusammenfassung

| Bereich | Unit-Test (Reader/Writer) | E2E-Test (echte Bedienung) | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Basis-Löschen (eine Zeile, Cursor in Zelle) | fehlt | **fehlt komplett** | fehlt |
| Mehrzeilen-`CellSelection` (nicht alle) löschen | fehlt | fehlt | fehlt |
| **Guard: Selektion = alle Zeilen / letzte Zeile** | fehlt | **fehlt, zentraler Pflichttest** | fehlt |
| Abgrenzung Entf/`CellSelection` vs. Struktur-Löschen | n/a | fehlt | n/a |
| Rowspan-Ankerzeile löschen (Migration) | fehlt | fehlt | fehlt |
| Rowspan-überdeckte Zeile löschen (Dekrement) | fehlt | fehlt | fehlt |
| Colspan-Zeile löschen (keine Migration) | fehlt | fehlt | fehlt |
| Undo/Redo nach Zeile löschen | n/a | fehlt | n/a |
| Selection-Sync-Regressionstest × Zeile löschen | n/a | **Pflicht, fehlt** | n/a |
| Bild in gelöschter Zeile (keine verwaiste Datei) | fehlt | fehlt | fehlt |
| Cross-Format-Rundreise nach Zeile löschen | n/a | fehlt | fehlt |
| Große Tabelle (>5 Spalten, >10 Zeilen) | fehlt | fehlt | fehlt |
| Reale Fremddatei (`tableRowDeletionTest.odt` u. a.) | fehlt | fehlt | fehlt |
| Verschachtelte Tabelle | fehlt | fehlt | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „fehlt" ist für `zeile-loeschen` zutreffend — weder UI-Weg
noch verdrahteter Command noch Test, obwohl `prosemirror-tables` die Kernbefehle mitliefert.
Die größte konkrete Fehlerquelle ist der `deleteRow`-Guard (Befund 5): Ohne eigene
Sonderbehandlung entsteht genau dort ein stiller Fehlschlag.

---

## 9. Definition of Done / Freigabekriterium für „vorhanden"

Der Backlog-Status von `zeile-loeschen` darf erst von „fehlt" auf **vorhanden** geändert
werden, wenn:

1. Eine kontextabhängige Tabellen-Werkzeugleiste mit einem per Klick auslösbaren, über echte
   Browser-Interaktion (nicht nur Command-Aufruf) funktionierenden Button „Zeile löschen"
   existiert (Abschnitt 1, Zeile 1).
2. Für jeden weiteren Zugriffsweg aus Abschnitt 1 dokumentiert ist, ob er unterstützt wird —
   kein unklarer Zwischenzustand (insbesondere Kontextmenü und Entf-Abgrenzung).
3. Das Verhalten bei Cursor-in-Zelle, Teil-Zeilen-Selektion und Mehrzeilen-Selektion exakt
   Abschnitt 2.2 entspricht, inklusive der belegten Abgrenzung „ganze Zeile löschen" vs. „nur
   Zellinhalt leeren".
4. **Der Guard-Sonderfall (Befund 5 / Abschnitt 2.4 / Grenzfälle 4/5) implementiert und
   getestet ist** — Löschen der letzten Zeile bzw. einer Alle-Zeilen-Selektion führt zu
   sichtbarem, korrektem Verhalten (Tabelle entfernt **oder** deaktiviert mit Hinweis),
   **niemals** zu einem stillen No-Op; bei einziger Tabelle bleibt ein leerer Absatz übrig.
5. Rowspan-Migration (Anker), Rowspan-Dekrement (überdeckt) und Colspan-Komplettverlust je
   durch einen eigenen Test nachgewiesen sind (Abschnitt 2.3, Grenzfälle 6/7/16).
6. Der Pflicht-Regressionstest für den Selection-Sync-Bug × „Zeile löschen" geschrieben,
   grün und dauerhaft Teil der Suite ist (Abschnitt 2.7/7.7/Grenzfall 14).
7. Alle Rundreise-Testfälle aus Abschnitt 5 für DOCX **und** ODT grün sind (inkl.
   Cross-Format, Fremddatei-Fixtures und der Prüfung auf verwaiste Bilddateien im
   Zip-Container) und mit einem **unabhängigen** Parser validiert wurden.
8. Alle Grenzfälle aus Abschnitt 3 einzeln durch einen Test abgedeckt **oder** als bewusst
   nicht unterstützt mit Begründung dokumentiert sind.
9. Kein Testfall stillen Datenverlust (Zeileninhalt verschwindet ohne Undo-Möglichkeit) oder
   eine JS-Exception in der Konsole zeigt.
10. Andernfalls verbleibt der Status auf „fehlt" bzw. wird bei Teilerfüllung explizit auf
    „teilweise" korrigiert, mit den fehlenden Teilen als eigene Nachfolge-Aufgaben —
    analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und `spalte-loeschen-req.md`
    Abschnitt 10.
