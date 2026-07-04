# Feature „Spalte löschen" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe** — Backlog-Status ist „fehlt" und gilt aktuell als
**nicht vertrauenswürdig**. Diese Datei ersetzt keine Codeaussage, sondern definiert
verbindlich, was „fertig" für dieses Feature bedeutet. Bevor irgendein Status auf
„vorhanden" gesetzt wird, muss jeder Punkt unten durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein — siehe
Abschnitt 9 „Verifikationsauftrag".

Bezug zum Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt „3.2 Tabellen"):

| Slug | Titel | Beschreibung | Status laut Backlog | Priorität | Teil dieser Spezifikation? |
|---|---|---|---|---|---|
| `spalte-loeschen` | Spalte löschen | „Entfernt die markierte Tabellenspalte." | fehlt | 1 (essenziell) | **Ja — Kernumfang, Pflicht** |
| `tabelle-einfuegen` | Tabelle einfügen | Tabelle mit wählbarer Zeilen-/Spaltenzahl einfügen | teilweise | 1 | Nein — Voraussetzung, eigener Slug/eigene Datei |
| `zeile-einfuegen` / `zeile-loeschen` | Zeile einfügen/löschen | Analoge Zeilen-Operationen | fehlt | 1 | Nein — eigener Slug, nur als Analogie/Abgrenzung erwähnt (Abschnitt 7) |
| `spalte-einfuegen` | Spalte einfügen (links/rechts) | Neue Spalte an gewählter Position einfügen | fehlt | 1 | Nein — eigener Slug, nur als Abgrenzung erwähnt (Abschnitt 7) |
| `zellen-verbinden` / `zellen-teilen` | Zellen verbinden/teilen | colspan/rowspan erzeugen bzw. auflösen | fehlt | 1/2 | Nein — eigener Slug, aber **Wechselwirkung mit „Spalte löschen" ist zwingender Bestandteil dieser Datei** (Abschnitt 3.4/3.5), da eine zu löschende Spalte bereits verbundene Zellen enthalten kann |
| `tabelle-loeschen` | Tabelle komplett löschen | Entfernt die gesamte Tabelle | fehlt | 1 | Nein — eigener Slug, aber als Grenzfall relevant, wenn die letzte verbleibende Spalte gelöscht werden soll (Abschnitt 3.6) |
| `kopfzeile-wiederholen` | Kopfzeile auf Folgeseiten wiederholen | Wiederholt Zeile 1 auf Folgeseiten | fehlt | 2 | Nein — nicht Gegenstand, nur als Wechselwirkungshinweis (Abschnitt 3.9) |

Die Beschreibung im Aufgabenauftrag lautet wörtlich: „Entfernt die markierte
Tabellenspalte." Kernumfang dieser Spezifikation ist daher **ausschließlich** das
Entfernen einer (oder mehrerer markierter) Spalte(n) aus einer bereits bestehenden
Tabelle — inklusive korrektem Verhalten bei Verbindungen (colspan/rowspan), inklusive
Rundreise nach DOCX und ODT. Das **Einfügen** von Spalten (`spalte-einfuegen`) und
das Löschen von **Zeilen** (`zeile-loeschen`) sind eigene Backlog-Einträge mit eigener
Anforderungsdatei und werden hier nur zur Abgrenzung erwähnt.

Architektur-Grundprinzip (wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 „Tabellen"
und Abschnitt 17 Zeile 20 „Tabellen-Kontextfunktionen … fehlt komplett in der UI —
größte Einzellücke im gesamten Funktionsumfang"): DOCX und ODT teilen sich einen
gemeinsamen internen Editor (`src/formats/shared/editor/`, ProseMirror-Schema +
Seitenansicht, Tabellen-Nodes aus `prosemirror-tables` via `tableNodes(...)` in
`src/formats/shared/schema.ts:106`). „Spalte löschen" muss deshalb **unabhängig vom
Ursprungsformat** funktionieren und darf **niemals** die Rundreise-Fähigkeit einer
Datei beeinträchtigen (siehe Abschnitt 6 — Rundreise-Anforderung).

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

**Zusammenfassung: In der Oberfläche existiert diese Funktion nicht im Ansatz.** Es
gibt exakt **einen** tabellenbezogenen Bedienschritt in der gesamten Anwendung — den
Button „⊞ Tabelle" zum Einfügen einer festen 2×2-Tabelle
(`src/formats/shared/editor/Toolbar.tsx:228-239`, ruft `insertTable(2, 2)` auf,
`src/formats/shared/editor/commands.ts:76-83`). Es gibt **keinen** Button, **kein**
Kontextmenü (eine projektweite Suche nach `contextmenu`/`ContextMenu` liefert null
Treffer), **keine** Tastenkombination und **keinen** Command-Export namens
`deleteColumn` o. ä. in `commands.ts` oder `Toolbar.tsx`. Der Befund aus
`FEATURE-SPEC-DOCX-ODT.md` Zeile 373 („Tabellen-Kontextfunktionen … fehlt komplett in
der UI, nur Datenmodell-seitig über Tests konstruiert") ist damit für den Teilaspekt
„Spalte löschen" vollständig bestätigt.

Dennoch ist die Ausgangslage **nicht** „bei null anfangen", sondern eher
„Werkzeug vorhanden, aber nicht verdrahtet und mit ungeklärten Detailfragen" — folgende
Befunde sind für die Umsetzung und Abnahme zentral:

| # | Ort | Inhalt | Befund |
|---|---|---|---|
| 1 | `package.json:29` | `"prosemirror-tables": "^1.8.5"` | Bibliothek ist bereits Abhängigkeit und liefert fix und fertig `deleteColumn`, `removeColumn`, `selectedRect`, `CellSelection`, `TableMap` (bestätigt per `node.js`-Introspektion der installierten Version). Es muss **kein** eigener Lösch-Algorithmus geschrieben werden — die Aufgabe ist im Kern **Verdrahtung + Grenzfall-Behandlung + Rundreise-Verifikation**, nicht Neuentwicklung eines Tabellen-Editiermodells. |
| 2 | `src/formats/shared/editor/WordEditor.tsx:81-82` | `columnResizing()` und `tableEditing()` sind bereits als Plugins registriert | `CellSelection` (Auswahl mehrerer Zellen/einer ganzen Spalte durch Ziehen mit der Maus) funktioniert **bereits jetzt** rein durch diese beiden Plugins, ganz ohne eigenen Code — d. h. Nutzer:innen können schon heute eine Spalte per Maus-Drag markieren, nur die Aktion „löschen" fehlt als Anknüpfungspunkt. |
| 3 | `node_modules/prosemirror-tables` (`deleteColumn`) | `deleteColumn(state, dispatch)`: Wenn `!isInTable(state)` → `return false`. Sonst wird über `selectedRect(state)` die von Cursor **oder** `CellSelection` betroffene Spalten-Rechteck-Range ermittelt; **`if (rect.left == 0 && rect.right == rect.map.width) return false`** — die Bibliothek verweigert das Löschen, wenn die Selektion **alle** Spalten der Tabelle umfasst (verhindert eine 0-Spalten-Tabelle) | Wird der Command bei „letzte(n) verbleibende(n) Spalte(n)" aufgerufen, passiert **gar nichts** — kein Fehler, kein Dispatch, nur `false` als Rückgabewert. Ohne eigene Behandlung dieses Rückgabewerts entsteht ein stiller Fehlschlag (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 „Kein stiller Fehlschlag"), siehe Abschnitt 3.6. |
| 4 | `node_modules/prosemirror-tables` (`removeColumn`, aufgerufen aus `deleteColumn` für jede betroffene Spalte) | Iteriert **über die volle Zeilenhöhe der Tabelle** (`row < map.height`), unabhängig davon, wie hoch die tatsächliche `CellSelection` reicht | Steht der Cursor (ohne Selektion) nur in **einer** Zelle einer Spalte, oder ist nur ein Teil der Spalte markiert (z. B. 2 von 3 Zeilen), wird trotzdem die **gesamte** Spalte über alle Zeilen entfernt — kein Nutzer-Missverständnis „nur die markierten Zellen werden gelöscht" darf entstehen (siehe Abschnitt 2.1/3.1). |
| 5 | `node_modules/prosemirror-tables` (`removeColumn`) | Bei einer Zelle mit `colspan > 1`, die über die zu löschende Spalte **hinausragt**: `tr.setNodeMarkup(..., removeColSpan(attrs, ...))` statt vollständigem Löschen der Zelle | Eine verbundene Zelle (z. B. „über 3 Spalten verbunden") verliert beim Löschen einer ihrer Spalten korrekt nur eine Einheit `colspan` (wird zu „über 2 Spalten verbunden"), der Zellinhalt bleibt erhalten — muss aber explizit mit einem Testfall nachgewiesen werden (Abschnitt 3.4), da bisher **kein einziger** Test (weder Unit noch E2E) diesen Pfad prüft. |
| 6 | `src/formats/docx/writer.ts:130` | `const colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1` | Die Anzahl der `<w:gridCol>`-Einträge in `<w:tblGrid>` wird **ausschließlich aus Zeile 0** berechnet (Summe der `colspan`-Werte der ersten Zeile). Nach einem korrekten `deleteColumn` sollte jede Zeile (inkl. Zeile 0) um dieselbe effektive Spaltenzahl kürzer sein — **muss aber verifiziert werden**, insbesondere wenn die gelöschte Spalte in Zeile 0 durch eine `vMerge`-Fortsetzungszelle (aus einer darüberliegenden Zeile stammend — bei Zeile 0 nicht möglich, aber relevant sobald diese Logik mit `zeile-loeschen` kombiniert wird) oder durch eine dort beginnende `colspan`-Zelle repräsentiert ist. |
| 7 | `src/formats/odt/writer.ts:88` | `const colCount = rows[0]?.content?.length ?? 1` | **Abweichend vom DOCX-Writer**: Hier wird die reine **Zellenanzahl** von Zeile 0 gezählt, **nicht** die Summe der `colspan`-Werte. Enthält Zeile 0 eine verbundene Zelle (`colspan: 2`), unterschätzt `<table:table-column>` (Abschnitt „Spaltenanzahl" in `content.xml`) die tatsächliche logische Spaltenzahl der Tabelle um die Differenz. Dieser Bug ist **unabhängig von `spalte-loeschen`** bereits vorher vorhanden, wird aber durch jede Spalten-Lösch-Operation an einer Tabelle mit vorhandenen Verbindungen in Zeile 0 **zusätzlich verschärft geprüft**, da genau diese Kombination (Verbindung + Löschen) in Abschnitt 3.4/6.2 explizit gefordert wird. **Muss vor Abnahme geklärt werden, ob dieser Bug im Zuge dieses Features mitbehoben wird oder als bekannte, dokumentierte Einschränkung ausgewiesen wird.** |
| 8 | `src/formats/odt/reader.ts:192` | `childElements(rowEl, ODF_NAMESPACES.table, 'table-cell')` — liest **ausschließlich** `<table:table-cell>`, **nicht** `<table:covered-table-cell>` | Reale, außerhalb dieser App erzeugte ODT-Dateien (LibreOffice) mit einer vertikalen Zellverbindung enthalten in den von der Verbindung „verdeckten" Folgezeilen ein `<table:covered-table-cell/>`-Platzhalterelement zur Erhaltung der Spaltenausrichtung. Der Reader überspringt dieses Element ersatzlos (keine Zählung, kein Spaltenversatz-Ausgleich) — bei einer Tabelle mit vertikaler Verbindung **verschiebt sich dadurch die Spaltenzuordnung der Zellen in den betroffenen Folgezeilen**. Da der eigene Writer (`odt/writer.ts`) ebenfalls **keine** `covered-table-cell`-Platzhalter schreibt, ist die App **intern** selbstkonsistent (eigene Dateien exportieren/importieren fehlerfrei), das Problem tritt aber bei **realen Fremddateien** mit vertikalen Verbindungen auf — genau der Fall, den Abschnitt 6.2 (Rundreise mit realer Fremddatei) prüfen muss. Dieser Befund ist eine Altlast außerhalb des `spalte-loeschen`-Scopes, aber eine **Voraussetzung**, die vor einer belastbaren Verifikation von „Spalte löschen bei importierten Fremddateien mit Verbindungen" geklärt sein muss. |
| 9 | `src/formats/docx/reader.ts:210-256` (`parseTable`) | Verwendet `colCount` aus `<w:tblGrid>` und ein `anchors`-Array zur korrekten Zuordnung von `vMerge`-Fortsetzungszellen zur Ursprungszelle | Deutlich robuster als der ODT-Reader (Befund 8) — für DOCX-Fremddateien mit vertikalen Verbindungen ist die Spaltenzuordnung beim Import bereits korrekt gelöst. Kein Blocker, aber als Asymmetrie zwischen den Formaten zu dokumentieren. |
| 10 | `src/formats/docx/__tests__/roundtrip.test.ts:173-247`, `src/formats/odt/__tests__/roundtrip.test.ts:162-208` | Bestehende Tabellen-Tests konstruieren Test-JSON-Dokumente **direkt** (`{ type: 'table', content: [...] }`) und prüfen nur Schreiben/Lesen. **Keiner** dieser Tests bedient die Oberfläche, keiner ruft `deleteColumn` überhaupt auf. | Bestätigt exakt den Befund aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 5 („E2E-Test über echte Toolbar-Bedienung fehlt komplett"), hier für Spalten statt Zellen-Verbinden. |
| 11 | `tests/e2e/` (Verzeichnisinhalt: `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`) | Kein `table*.spec.ts` vorhanden | Es existiert **kein einziger** E2E-Test, der irgendeine Tabellen-Interaktion (Einfügen, Klicken, Tippen, geschweige denn Spalte löschen) über echte Browser-Bedienung nachweist. |

**Konsequenz für die Bewertung:** Der Backlog-Status „fehlt" ist vollständig zutreffend
— es gibt keinen benutzbaren Weg, eine Tabellenspalte zu löschen. Die zugrunde liegende
Bibliotheksfunktion ist jedoch bereits vorhanden und funktional vielversprechend; die
eigentliche Arbeit besteht aus (a) UI-Anbindung, (b) Klärung der in Befund 3–8
aufgeworfenen Verhaltensfragen, und (c) Nachweis der Rundreise inklusive der bereits
bekannten Writer/Reader-Asymmetrien.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Spalte löschen" (neu, SVG-Icon — **kein** Unicode-/Emoji-Zeichen, siehe Lehre aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 zum Icon-Rendering-Problem) | Fehlt komplett | Neuer Button in `Toolbar.tsx`, analog zum bestehenden „⊞ Tabelle"-Button, sichtbar/erreichbar sobald der Cursor sich innerhalb einer Tabelle befindet (siehe Zeile 2). Ruft `deleteColumn(state, dispatch)` auf. |
| 2 | Sichtbarkeit/Deaktivierung außerhalb einer Tabelle | Nicht anwendbar (Button existiert nicht) | Button ist entweder **ausgeblendet** oder sichtbar-aber-deaktiviert (`disabled`), wenn `isInTable(view.state)` `false` ist (dieselbe bereits vorhandene Helper-Funktion, die schon für den „Tabelle einfügen"-Button als `aria-pressed`-Indikator verwendet wird, `Toolbar.tsx:231`). Kein stiller Klick ins Leere. |
| 3 | Deaktivierung bei „letzte verbleibende Spalte" (siehe Befund 3/Abschnitt 3.6) | Nicht anwendbar | Muss **vor** dem Klick erkennbar sein (deaktivierter Button und/oder Tooltip „Letzte Spalte kann nicht einzeln gelöscht werden — Tabelle löschen?") statt eines stillen No-Op nach dem Klick. |
| 4 | Kontextmenü (Rechtsklick in einer Tabellenzelle) → „Spalte löschen" | Fehlt komplett — die App hat aktuell **kein** Kontextmenü-System für irgendeine Funktion (projektweite Suche liefert null Treffer) | **Zu entscheiden:** Wird ein komplettes Kontextmenü-System neu eingeführt (deutlich näher an Word/LibreOffice-Erwartung, aber größerer Aufbau) oder bleibt es bei einem Toolbar-Button (kleinerer Aufwand, aber Abweichung von der Nutzererwartung „Rechtsklick auf Spalte")? Diese Entscheidung ist **nicht** trivial und muss vor Umsetzung explizit getroffen und hier nachgetragen werden — sie betrifft auch die Geschwister-Features `zeile-loeschen`, `spalte-einfuegen`, `zellen-verbinden` etc. und sollte nicht pro Einzelfeature unterschiedlich gelöst werden. |
| 5 | Tastenkombination | Word/LibreOffice definieren hierfür **keine** durchgängige Standard-Tastenkombination (im Gegensatz zu z. B. Fett = Strg+B) | Kein Soll-Element — bewusst nicht gefordert, hier nur zur Vollständigkeit dokumentiert. |
| 6 | Visuelle Kennzeichnung „welche Spalte ist aktuell markiert" | `CellSelection` wird von `prosemirror-tables` bereits mit einer Standard-Hervorhebung der ausgewählten Zellen dargestellt (Default-CSS des Plugins bzw. eigenes Styling, zu prüfen) | Muss visuell eindeutig erkennbar sein, **bevor** der Löschen-Button geklickt wird — Nutzer:in muss sehen können, welche Spalte(n) von der Aktion betroffen sein werden. |
| 7 | Mobile/Touch-Bedienung (Spaltenauswahl per Touch-Drag, Button-Klick) | Ungeprüft | Auf den in `playwright.config.ts:20-22` konfigurierten Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini) verifizieren — Spaltenmarkierung per Touch-Drag über `prosemirror-tables`/`columnResizing` ist auf Touch-Geräten grundsätzlich schwieriger zu bedienen als per Maus; mindestens der Fall „Cursor in einer Zelle, Button klicken" (ohne CellSelection) muss auf allen drei Projekten funktionieren. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Erkennung „die markierte Spalte"
Der Aufgabentext spricht von „der markierten Tabellenspalte" (Singular). Auf Basis von
Befund 3/4 (Abschnitt 0) ergeben sich drei zu unterscheidende Ausgangslagen, die **alle**
zum selben nachvollziehbaren Ergebnis führen müssen:

1. **Nur Cursor, keine Selektion, innerhalb einer Zelle:** Es wird die Spalte gelöscht,
   in der sich der Cursor befindet — über die **gesamte** Höhe der Tabelle, nicht nur
   die aktuelle Zeile.
2. **`CellSelection` innerhalb einer einzelnen Spalte** (z. B. 2 von 3 Zeilen markiert):
   Es wird trotzdem die **gesamte** Spalte gelöscht (Befund 4) — dieses Verhalten weicht
   möglicherweise von der Nutzererwartung „nur die markierten Zellen werden entfernt" ab
   und **muss** deshalb entweder (a) so wie von der Bibliothek vorgegeben belassen und
   **sichtbar dokumentiert** werden (z. B. Tooltip/Hinweistext „Löscht die gesamte
   Spalte"), oder (b) bewusst durch eigene Vorprüfung abgefangen werden, falls dieses
   Verhalten als verwirrend bewertet wird. Diese Entscheidung ist vor Abnahme zu treffen.
3. **`CellSelection` über mehrere Spalten hinweg** (z. B. 3 Zellen in einer Zeile
   markiert): Nach Bibliotheksverhalten (Befund 3/`selectedRect`) werden **alle**
   erfassten Spalten auf einmal gelöscht. Zu klären: Ist das für den Slug
   `spalte-loeschen` (Singular in der Beschreibung) überhaupt im Scope, oder soll die
   Aktion in diesem Fall bewusst auf „nur eine Spalte" beschränkt werden (z. B. durch
   eigene Vorprüfung mit Fehlermeldung)? **Empfehlung dieser Spezifikation:** Dem
   Bibliotheksverhalten folgen (mehrere markierte Spalten werden auf einen Klick
   gelöscht, konsistent mit Word/LibreOffice, wo eine Mehrfachspalten-Selektion ebenfalls
   alle markierten Spalten auf einmal entfernt) — muss aber explizit bestätigt und hier
   nachgetragen werden, nicht stillschweigend angenommen.

### 2.2 Löschvorgang
- Nach dem Löschen verringert sich die Gesamtspaltenzahl der Tabelle um genau die Anzahl
  der gelöschten Spalten.
- Verbleibende Spalten links/rechts der gelöschten Spalte rücken zusammen, ohne dass
  Inhalt aus benachbarten Spalten verändert wird.
- Der Zellinhalt der gelöschten Spalte (Text, Formatierung, Bilder) geht vollständig
  verloren — dies ist eine **destruktive** Aktion; siehe Abschnitt 2.8 zu Undo als
  einzigem Absicherungsmechanismus (keine explizite Bestätigungs-Dialogbox wie bei
  Word/LibreOffice üblich, siehe Abschnitt 3.13 zur Klärung, ob ein Bestätigungsdialog
  gefordert ist).

### 2.3 Cursor-Platzierung nach dem Löschen
- Der Cursor muss nach dem Löschen an einer sinnvollen, definierten Position innerhalb
  der (verbleibenden) Tabelle stehen — z. B. in der Zelle, die an die Stelle der
  gelöschten Spalte nachrückt, oder in der links benachbarten Zelle, falls die gelöschte
  Spalte die letzte (rechteste) war. Kein Verlust der Editor-Selektion, kein Sprung an
  eine unerwartete Dokumentstelle (Bezug zum generellen Anspruch aus
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 „kein Reset, kein Verlust des Fokus").

### 2.4 Verhalten bei Spalten mit horizontal verbundenen Zellen (colspan)
- Eine Zelle, die über die zu löschende Spalte **hinaus** reicht (`colspan` > Anzahl der
  gelöschten Spalten innerhalb ihrer Spanne), verliert nur die entsprechende Anzahl an
  `colspan`-Einheiten; ihr Inhalt bleibt vollständig erhalten (Befund 5, Abschnitt 0).
- Eine Zelle, deren `colspan` **exakt** der Anzahl der gelöschten Spalten entspricht
  (z. B. eine über 2 Spalten verbundene Zelle, bei der beide Spalten gelöscht werden),
  wird komplett entfernt, samt Inhalt.
- **Zu verifizieren (kein bisheriger Test deckt dies ab):** Löschen einer der beiden
  Spalten, über die eine verbundene Zelle reicht (`colspan: 2` → `colspan: 1`) — Inhalt
  bleibt in der verbleibenden Zelle erhalten, Text wird nicht dupliziert und nicht
  verloren.

### 2.5 Verhalten bei Spalten mit vertikal verbundenen Zellen (rowspan)
- Eine Zelle mit `rowspan` > 1, die **innerhalb** der zu löschenden Spalte liegt (nicht
  über deren Grenze hinausragend — vertikale Verbindungen betreffen per Definition nur
  eine Spalte, keine mehreren), wird beim Löschen dieser Spalte vollständig entfernt,
  inklusive ihres über mehrere Zeilen verteilten Inhalts.
- **Zu verifizieren:** Löschen einer Spalte, die eine `rowspan`-Zelle enthält, während
  eine **Nachbarspalte** unangetastet bleibt — die Zeilenstruktur der Tabelle (Anzahl
  der `<w:tr>`/`<table:table-row>`-Elemente) darf sich dabei **nicht** ändern, nur die
  Spaltenzahl.

### 2.6 Letzte verbleibende Spalte
- Wie in Befund 3 (Abschnitt 0) beschrieben, verweigert die zugrunde liegende
  Bibliotheksfunktion das Löschen, wenn die Selektion alle Spalten der Tabelle umfasst
  (Ergebnis: `false`, kein Dispatch). **Anforderung:** Dieser Fall darf **nicht** als
  stiller Fehlschlag beim Nutzer ankommen (Verstoß gegen
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20). Zwei zulässige Lösungswege, von denen einer
  vor Abnahme gewählt werden muss:
  1. Button/Menüpunkt ist in diesem Zustand von vornherein deaktiviert (siehe
     Abschnitt 1, Zeile 3), oder
  2. Klick löst eine sichtbare Rückmeldung aus (z. B. Hinweistext oder Weiterleitung zum
     Feature „Tabelle löschen" — eigener Slug `tabelle-loeschen`, nicht Teil dieser
     Datei, siehe Abschnitt 7).
- Eine Tabelle mit **nur einer** Spalte, bei der „Spalte löschen" ausgelöst wird, muss
  denselben, oben definierten Weg nehmen wie eine Mehrspalten-Tabelle, bei der zufällig
  **alle** Spalten markiert sind (dieselbe Bibliotheksbedingung `rect.left == 0 &&
  rect.right == rect.map.width` trifft auf beide Fälle gleichermaßen zu).

### 2.7 Interaktion mit Spaltenbreiten
- `table_cell`-Attribut `colwidth` (Standard-Schema-Attribut aus `tableNodes(...)`,
  siehe `schema.ts:106`) der verbleibenden Spalten bleibt unverändert (keine
  automatische Neuverteilung der freiwerdenden Breite zwingend erforderlich für
  „fertig", aber die Tabelle darf durch das Löschen **nicht** insgesamt schmaler werden
  als der Seitenrand vorgibt bzw. optisch „zusammengequetscht" wirken — mindestens
  vergleichbar mit dem Verhalten, das `columnResizing()` (`WordEditor.tsx:81`) für
  manuelle Größenänderungen bereits bereitstellt).

### 2.8 Undo/Redo
- Das Löschen einer (oder mehrerer markierter) Spalte(n) erzeugt **einen** einzelnen,
  eigenständigen Undo-Schritt.
- Strg+Z stellt die gelöschte(n) Spalte(n) inklusive **vollständigem** Inhalt
  (Text, Zeichenformatierung, colspan/rowspan-Zustand benachbarter Zellen) exakt an der
  ursprünglichen Position wieder her.
- Strg+Y/Strg+Umschalt+Z (Redo) löscht die Spalte(n) erneut.
- Mehrere aufeinanderfolgende Spalten-Löschvorgänge müssen einzeln, in korrekter
  Reihenfolge rückgängig machbar sein (nicht als ein einziger zusammengefasster Schritt).

### 2.9 Wechselwirkung mit „Kopfzeile auf Folgeseiten wiederholen" (falls künftig umgesetzt)
- Aktuell nicht umgesetzt (`kopfzeile-wiederholen`, Backlog-Zeile 192, Status „fehlt").
  Für den aktuellen Verifikationsauftrag **nicht** im Scope, hier nur als künftige
  Abhängigkeit vermerkt: Sobald diese Funktion existiert, muss das Löschen einer Spalte
  auch die als „Kopfzeile" markierte erste Tabellenzeile konsistent mit verkürzen.

### 2.10 Regressionsrisiko Selection-Sync-Bug
- Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 beschrieben, sind Tabellen ein
  „Hauptverdachtsfall" für den bekannten Selection-Sync-Bug, da Klicks zwischen Zellen
  ähnliche Selektionswechsel auslösen wie das dort beschriebene Szenario. Der
  Spalten-Löschvorgang selbst ist eine Toolbar-Transaktion auf eine (ggf. zellbasierte)
  Selektion und daher ein plausibler weiterer Auslöser für eine Variante dieses Bugs.
  **Pflicht-Regressionstest:** Tabelle einfügen → in eine Zelle tippen → Spalte per
  CellSelection markieren → „Spalte löschen" → per Klick in eine verbleibende Zelle neu
  positionieren → weiter tippen → Text landet exakt an der geklickten Stelle, nicht an
  einer veralteten internen Selektion.

---

## 3. Grenzfälle

1. **Cursor ohne Selektion in einer Zelle:** löscht die Spalte dieser Zelle über die
   volle Tabellenhöhe (Abschnitt 2.1, Fall 1).
2. **`CellSelection` innerhalb einer Spalte, aber nicht über die volle Höhe** (z. B. 2
   von 3 Zeilen markiert): löscht trotzdem die **gesamte** Spalte (Abschnitt 2.1,
   Fall 2) — muss mit einem Testfall belegt werden, da dies leicht zu Verwirrung führen
   kann.
3. **`CellSelection` über mehrere Spalten:** löscht alle erfassten Spalten auf einen
   Klick (Abschnitt 2.1, Fall 3, Design-Entscheidung dokumentieren).
4. **Spalte mit horizontal verbundener Zelle, die über die Spaltengrenze hinausragt**
   (`colspan` reduziert sich, Inhalt bleibt, siehe 2.4).
5. **Spalte, deren gesamte Breite von einer verbundenen Zelle mit exakt passendem
   `colspan` eingenommen wird:** Zelle wird komplett entfernt (siehe 2.4).
6. **Spalte mit vertikal verbundener Zelle (`rowspan`):** Zelle über mehrere Zeilen wird
   vollständig entfernt, Zeilenanzahl bleibt gleich (siehe 2.5).
7. **Letzte verbleibende Spalte einer Tabelle (bzw. Selektion aller Spalten):** von der
   Bibliothek verweigert (`false`, kein Dispatch) — muss sichtbar rückgemeldet werden,
   nicht stiller No-Op (siehe 2.6, zentraler Pflicht-Testfall).
8. **Tabelle mit genau zwei Spalten, eine wird gelöscht:** Ergebnis ist eine einspaltige
   Tabelle — muss weiterhin normal bearbeitbar bleiben (Tippen, weitere Aktionen), keine
   strukturelle Beschädigung.
9. **Spalte am linken Tabellenrand löschen** vs. **Spalte am rechten Tabellenrand
   löschen** vs. **Spalte in der Mitte löschen:** alle drei Positionen müssen
   funktionieren, mit korrekt nachrückenden Nachbarspalten.
10. **Leere Zellen in der zu löschenden Spalte** (kein Text, nur ein leerer Absatz):
    löschen funktioniert ohne Absturz, keine „leere Zelle kann nicht gelöscht werden"-
    Sonderbehandlung nötig.
11. **Zelle mit mehreren Absätzen/gemischter Formatierung in der zu löschenden Spalte:**
    gesamter Zellinhalt (alle Absätze, alle Formate) wird mitgelöscht, keine Teilreste.
12. **Bild innerhalb einer Zelle der zu löschenden Spalte:** Bild wird mitgelöscht, keine
    verwaiste Bilddatei im späteren Export-Zip (Analogie zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 9 zum Bild-Löschen).
13. **Bestätigungsdialog:** Word/LibreOffice zeigen für „Spalte löschen" **keinen**
    Bestätigungsdialog (im Gegensatz zu z. B. „Tabelle löschen", wo teils nachgefragt
    wird) — zu entscheiden, ob dieses Verhalten übernommen wird (Empfehlung: kein
    Dialog, da Undo als Absicherung ausreicht und dies dem Verhalten anderer,
    bereits „vorhandener" destruktiver Aktionen in dieser App entspricht, z. B.
    Bild löschen ohne Rückfrage). Ergebnis der Entscheidung hier nachtragen.
14. **Verschachtelte Tabelle (Tabelle in Tabellenzelle):** Spalte einer **äußeren**
    Tabelle löschen, während eine Zelle dieser Spalte eine vollständige innere Tabelle
    enthält → die gesamte innere Tabelle muss mitgelöscht werden, ohne Absturz (Bezug zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 8, sowie der Tiefenbegrenzung
    `MAX_TABLE_NESTING_DEPTH`/`MAX_NESTING_DEPTH` in `docx/reader.ts:208` bzw.
    `odt/reader.ts:162`, die für den Import gilt, nicht für das Löschen selbst — hier nur
    als Kontext für realistische, tief verschachtelte Testdateien relevant).
15. **Spalte löschen unmittelbar nach „Tabelle einfügen" ohne vorheriges Tippen:**
    funktioniert ohne Absturz, auch bei komplett leerer, frisch eingefügter 2×2-Tabelle.
16. **Mehrfaches schnelles Hintereinander-Löschen** (z. B. dreimal in Folge dieselbe
    verbleibende erste Spalte löschen, bis nur noch eine übrig ist): jede Aktion einzeln
    korrekt, letzter Versuch wird gemäß Grenzfall 7 verweigert.
17. **Reale Fremddatei mit großer Tabelle** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6,
    Testfall 9: „> 5 Spalten, > 10 Zeilen, gemischte Formatierung") importieren, eine
    mittlere Spalte löschen, exportieren, reimportieren → verbleibende Spalten und
    -inhalte identisch zur Erwartung, keine Verschiebung.
18. **Reale, mit LibreOffice erzeugte ODT-Fremddatei mit vertikal verbundenen Zellen**
    (`covered-table-cell`, siehe Befund 8, Abschnitt 0) importieren, danach eine Spalte
    löschen, exportieren, reimportieren → zu dokumentieren, ob der bereits bekannte
    Spaltenzuordnungs-Fehler (Befund 8) das Ergebnis beeinflusst; falls ja, ist dies als
    **Abhängigkeit/Blocker** dieses Features zu erfassen, nicht als neuer, dem Feature
    „Spalte löschen" selbst zuzurechnender Fehler.
19. **Selection-Sync-Regression** (siehe Abschnitt 2.10) — Pflicht-Regressionstest.
20. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert, muss das Löschen einer Spalte bei aktiver
    Aufzeichnung als nachverfolgbare Änderung markiert werden (analog zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, Testfall 8, der explizit
    „Tabellen- … Struktur betreffende Änderung" als Grenzfall nennt). Für den aktuellen
    Verifikationsauftrag **nicht** im Scope, nur als künftige Abhängigkeit vermerkt.

---

## 4. Erforderliche Code-Änderungen (Umsetzungsskizze, kein Implementierungszwang im Detail)

Zur Einordnung des Aufwands — diese Liste ist eine Skizze auf Basis der Code-Analyse aus
Abschnitt 0, keine verbindliche Architekturvorgabe:

1. `src/formats/shared/editor/commands.ts`: Re-Export bzw. dünner Wrapper um
   `deleteColumn` aus `prosemirror-tables` (analog zum bereits bestehenden
   `export { isInTable }` in `commands.ts:6`), ggf. mit einer Vorprüfung für den
   „letzte Spalte"-Fall aus Abschnitt 2.6/3.7, damit der Aufrufer eine boolesche
   „wäre diese Aktion überhaupt möglich"-Information erhält (für den deaktivierten
   Button-Zustand aus Abschnitt 1, Zeile 3).
2. `src/formats/shared/editor/Toolbar.tsx`: neuer Button analog zu den Zeilen 228-239
   (bestehender „⊞ Tabelle"-Button), mit SVG-Icon statt Unicode-Zeichen, `disabled`-
   Zustand gemäß Punkt 1.
3. Klärung/Umsetzung der in Abschnitt 1, Zeile 4 offenen Frage (Kontextmenü-System ja/
   nein) — betrifft möglicherweise eine gemeinsame Basis-Komponente für alle
   Tabellen-Kontextfunktionen (Zeile/Spalte einfügen/löschen, verbinden/teilen), nicht
   nur „Spalte löschen" isoliert.
4. Ggf. Behebung des ODT-Writer-Bugs aus Befund 7 (`odt/writer.ts:88`, `colCount` sollte
   wie im DOCX-Writer die Summe der `colspan`-Werte statt der reinen Zellenanzahl
   verwenden) — **zu entscheiden, ob das Teil dieses Features ist** (da es durch dieses
   Feature verschärft testbar wird) oder als separater Bugfix-Ticket geführt wird.
5. Keine Schema-Änderung in `schema.ts` nötig — `table_cell`/`table_row`/`table`-Nodes
   aus `tableNodes(...)` unterstützen das Entfernen von Zellen bereits strukturell.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/3/19 gefordert, gilt für jede
Interaktion mit „Spalte löschen" die Rundreise-Bedingung: **Datei A hochladen →
Spalte löschen → exportieren → Ergebnis entspricht inhaltlich A abzüglich der
gelöschten Spalte, sonst keine Abweichung.** Zusätzlich gilt die allgemeine
Rundreise-Grundregel unverändert für den Fall, dass **keine** Spalte gelöscht wird
(reines Sicherstellen, dass die neue Funktion bestehende Tabellen nicht beschädigt).

### 5.1 DOCX
1. Einfache DOCX-Testdatei mit einer 3×3-Tabelle importieren → mittlere Spalte per
   Cursor-Klick + „Spalte löschen" entfernen → als DOCX exportieren → mit einem
   unabhängigen Parser (z. B. python-docx oder direktes Parsen von
   `word/document.xml`) verifizieren: `<w:tblGrid>` enthält genau 2 `<w:gridCol>`,
   jede `<w:tr>` enthält genau 2 `<w:tc>`, Inhalt der verbleibenden Spalten korrekt.
2. Tabelle mit horizontal verbundener Zelle (`colspan: 2`) importieren, eine der beiden
   überspannten Spalten löschen, exportieren → verbleibende Zelle referenziert **kein**
   `<w:gridSpan>` mehr (bzw. `w:val="1"`, je nach Implementierungswahl bezüglich
   expliziter vs. impliziter Angabe von `colspan: 1`), Inhalt bleibt erhalten.
3. Tabelle mit vertikal verbundener Zelle (`rowspan: 2`) importieren, genau diese Spalte
   löschen, exportieren → Zeilenanzahl (`<w:tr>`-Anzahl) unverändert, `vMerge`-Element
   für diese Spalte verschwindet vollständig aus beiden betroffenen Zeilen.
4. Reale, komplexe Fremddatei (z. B. aus einem Open-Source-Testkorpus wie
   Apache-POI-Testdaten, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) mit einer
   Tabelle > 5 Spalten importieren, eine Spalte löschen, exportieren, reimportieren →
   verbleibende Zellinhalte identisch zur Erwartung.
5. Cross-Format: ODT mit Tabelle importieren → Spalte löschen → als DOCX exportieren →
   Inhalt der verbleibenden Spalten bleibt erhalten.
6. Doppelte Aktion: zwei verschiedene Spalten nacheinander löschen (ohne
   zwischenzeitlichen Export) → erst danach exportieren → beide Spalten fehlen korrekt,
   keine der beiden „kommt durch einen Konvertierungs-Zufall" wieder zurück.

### 5.2 ODT
1. Einfache ODT-Testdatei mit einer 3×3-Tabelle importieren → mittlere Spalte löschen →
   als ODT exportieren → `content.xml` enthält genau 2 `<table:table-column>`-Elemente
   und pro `<table:table-row>` genau 2 `<table:table-cell>`, Inhalt korrekt.
2. Tabelle mit horizontal verbundener Zelle (`table:number-columns-spanned="2"`)
   importieren, eine überspannte Spalte löschen, exportieren → Attribut verschwindet
   bzw. reduziert sich korrekt, Inhalt bleibt erhalten. **Hierbei explizit den Befund 7
   (Abschnitt 0, `odt/writer.ts:88`) mitprüfen:** Stimmt die Anzahl der
   `<table:table-column>`-Elemente nach dem Löschen mit der tatsächlichen Zellenzahl der
   Zeile 0 überein, unabhängig von verbleibenden `colspan`-Werten?
3. Tabelle mit vertikal verbundener Zelle (`table:number-rows-spanned="2"`) importieren,
   genau diese Spalte löschen, exportieren → Zeilenanzahl unverändert, Attribut
   verschwindet vollständig.
4. **Pflicht-Testfall für Befund 8:** Reale, mit LibreOffice/OpenOffice erzeugte
   ODT-Datei mit einer Tabelle, die mindestens eine vertikale Verbindung über
   `<table:covered-table-cell/>`-Platzhalter abbildet, importieren → vor jeder
   Lösch-Aktion zunächst verifizieren, ob die Spaltenzuordnung überhaupt korrekt
   importiert wurde (bekanntermaßen fraglich, siehe Befund 8) — falls nicht, ist dieser
   Testfall als **blockiert durch bestehenden Reader-Bug** zu kennzeichnen, nicht als
   Fehlschlag von „Spalte löschen" selbst.
5. Cross-Format: DOCX mit Tabelle importieren → Spalte löschen → als ODT exportieren →
   Inhalt der verbleibenden Spalten bleibt erhalten.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Tabelle → Editor → Spalte löschen → Export als ODT → erneuter Import →
   Export zurück als DOCX → verbleibende Spalteninhalte nach zwei
   Formatkonvertierungen weiterhin identisch (Formatierungsverluste bei Cross-Format
   sind laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 akzeptabel und zu dokumentieren,
   Textverlust nicht).
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 6. Explizit außerhalb des Scopes dieser Spezifikation

Um Missverständnisse bei der späteren Abnahme zu vermeiden, wird hier festgehalten,
was **nicht** Teil von „Spalte löschen" (dieser Datei) ist, sondern eigene, separate
Backlog-Einträge mit eigener Priorität und eigener Anforderungsdatei bleiben:

- **`spalte-einfuegen` (Spalte einfügen links/rechts, Priorität 1):** Das Gegenstück
  zum Löschen ist ein eigenes Feature. Beide teilen sich voraussichtlich denselben
  Toolbar-Bereich/dieselbe Kontextmenü-Entscheidung (siehe Abschnitt 1, Zeile 4), aber
  die Einfüge-Logik selbst ist hier nicht gefordert.
- **`zeile-loeschen` (Zeile löschen, Priorität 1):** Strukturell sehr ähnlich (auch
  `prosemirror-tables` liefert `deleteRow`/`removeRow` fertig), aber ein eigener Slug
  mit eigener Abnahme. Diese Datei behandelt **ausschließlich** Spalten.
- **`zellen-verbinden` / `zellen-teilen` (Priorität 1/2):** Das **Erzeugen** bzw.
  **Auflösen** von `colspan`/`rowspan` ist nicht Gegenstand dieser Datei — hier wird nur
  das **Verhalten von „Spalte löschen" gegenüber bereits bestehenden** Verbindungen
  behandelt (Abschnitt 2.4/2.5/3.4-3.6).
- **`tabelle-loeschen` (Tabelle komplett löschen, Priorität 1):** Wird in Abschnitt 3.7
  nur als möglicher Lösungsweg für den Grenzfall „letzte Spalte" erwähnt, ist aber ein
  eigenständiges Feature mit eigener Abnahme.
- **`tabelle-eigenschaften` / `tabellenformatvorlagen` / `tabelle-autoanpassen`:**
  Rahmen, Schattierung, automatische Breitenanpassung nach dem Löschen sind eigene,
  fehlende Features (Backlog-Zeilen 190/191/197) — Abschnitt 2.7 dieser Datei fordert
  nur, dass das Tabellenlayout nach dem Löschen nicht sichtbar bricht, keine vollwertige
  automatische Neuverteilung.
- **`kopfzeile-wiederholen` (Priorität 2):** Nicht umgesetzt, nur als künftige
  Abhängigkeit in Abschnitt 2.9/3.20 vermerkt.
- **Track-Changes-Markierung von Struktur-Änderungen** (Phase 3, siehe Abschnitt 3.20):
  nicht Teil des aktuellen Verifikationsauftrags.

---

## 7. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, aber laut Auftrag **nicht ausreichende** Tests (prüfen nur
Lesen/Schreiben direkt konstruierter Tabellen-JSON-Dokumente, keine Oberflächen-
Bedienung, kein `deleteColumn`-Aufruf):
- `src/formats/docx/__tests__/roundtrip.test.ts:173-247` („DOCX round trip: tables")
- `src/formats/odt/__tests__/roundtrip.test.ts:162-208` („ODT round trip: tables")

Zusätzlich zu schreibende Testfälle (neue Datei, z. B. `tests/e2e/table-columns.spec.ts`),
damit alle Abschnitte 1–5 dieser Anforderung abgedeckt sind — durchgehend über echte
Toolbar-/Maus-Bedienung (`page.locator(...)`, `page.mouse`, `dragTo`/Shift-Klick für
`CellSelection`), nicht über direkte Command-Aufrufe:

1. Tabelle einfügen (bestehender Button), Cursor in mittlere Spalte einer 3×3-Tabelle
   setzen, „Spalte löschen" klicken → Tabelle hat danach nur noch 2 Spalten, Inhalt der
   verbleibenden Spalten unverändert.
2. Button/Menüpunkt außerhalb einer Tabelle (Cursor in normalem Absatz) → deaktiviert
   oder ohne Wirkung, keine Exception.
3. Spalte per Maus-Drag über mehrere Zellen derselben Spalte markieren (`CellSelection`,
   nicht über volle Höhe) → „Spalte löschen" → gesamte Spalte verschwindet (Grenzfall 2).
4. Mehrere Spalten per Maus-Drag markieren → „Spalte löschen" → alle markierten Spalten
   verschwinden auf einen Klick (Grenzfall 3, gemäß getroffener Design-Entscheidung).
5. Tabelle mit einer über 2 Spalten verbundenen Zelle (zunächst über Testdaten/Fixture
   vorbereitet, da `zellen-verbinden` selbst noch nicht über die UI erzeugbar ist) —
   eine der beiden Spalten löschen → verbleibende Zelle zeigt weiterhin den Inhalt,
   `colspan` ist um 1 reduziert (DOM-Prüfung `colspan`-Attribut bzw. internes
   Dokumentmodell).
6. Tabelle mit einer über 2 Zeilen verbundenen Zelle (`rowspan`) — genau diese Spalte
   löschen → Zeilenanzahl unverändert, Zelle vollständig entfernt.
7. Tabelle mit genau 2 Spalten — eine löschen → Ergebnis ist eine 1-spaltige Tabelle,
   weiterhin editierbar (Tippen funktioniert).
8. Tabelle mit genau 1 Spalte (bzw. alle Spalten einer Tabelle markiert) —
   „Spalte löschen" auslösen → **keine** Änderung an der Tabelle, sichtbare Rückmeldung
   statt stillem No-Op (zentraler Pflicht-Testfall, Grenzfall 7).
9. Bild in einer Zelle der zu löschenden Spalte einfügen (echter `filechooser`-Flow wie
   in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 gefordert) → Spalte löschen → Bild
   verschwindet vollständig, keine Restspur im Dokumentmodell.
10. Undo (Strg+Z) direkt nach „Spalte löschen" → Spalte inkl. vollständigem Inhalt wird
    exakt wiederhergestellt; Redo (Strg+Y) löscht sie erneut.
11. Zwei aufeinanderfolgende Spalten-Löschvorgänge, danach zweimal Undo → beide Spalten
    werden in umgekehrter Reihenfolge einzeln wiederhergestellt.
12. **Regressionstest analog `tests/e2e/selection-regression.spec.ts`**, aber mit
    „Spalte löschen" als auslösendem Schritt (siehe Abschnitt 2.10/Grenzfall 19):
    Tabelle einfügen → tippen → Spalte markieren und löschen → per Klick in
    verbleibende Zelle neu positionieren → weiter tippen → Text landet korrekt, kein
    Dokumentverlust.
13. Vollständiger Rundreisetest je Format (Abschnitt 5.1/5.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`).
14. Cross-Format-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
15. Reale Fremddatei-Tests aus Abschnitt 5.1.4/5.2.4 (Open-Source-Korpus bzw. mit
    LibreOffice erzeugte Datei mit vertikaler Verbindung — inkl. Dokumentation, falls
    durch Befund 8 blockiert).
16. Verschachtelte Tabelle (Tabelle in Tabellenzelle, Grenzfall 14) — äußere Spalte mit
    innerer Tabelle löschen → kein Absturz, gesamte innere Tabelle verschwindet mit.
17. Bedienung auf allen drei in `playwright.config.ts:20-22` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → mindestens Testfall 1 und 8
    funktionieren auf jedem Projekt.

---

## 8. Testmatrix — Zusammenfassung

| Bereich | Unit-Test (Reader/Writer) | E2E-Test (echte Bedienung) | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Grundfunktion: eine Spalte per Cursor löschen | fehlt | **fehlt komplett** | fehlt |
| `CellSelection` innerhalb einer Spalte (Teilhöhe) | n/a | fehlt | n/a |
| `CellSelection` über mehrere Spalten | n/a | fehlt | fehlt |
| Spalte mit `colspan`-Zelle (Reduktion statt Löschen) | fehlt | fehlt | fehlt |
| Spalte mit `rowspan`-Zelle | fehlt | fehlt | fehlt |
| Letzte verbleibende Spalte (Bibliotheks-Guard) | fehlt | **fehlt, zentraler Pflichttest** | n/a |
| Bild in gelöschter Spalte | fehlt | fehlt | fehlt |
| Undo/Redo nach Spalten-Löschung | n/a | fehlt | n/a |
| Selection-Sync-Regressionstest × Spalte löschen | n/a | **fehlt, muss Pflicht werden** | n/a |
| Reale Fremddatei DOCX (> 5 Spalten) | fehlt | fehlt | fehlt |
| Reale Fremddatei ODT mit vertikaler Verbindung (Befund 8) | fehlt, ggf. durch Reader-Bug blockiert | fehlt | fehlt |
| ODT-`colCount`-Bug (Befund 7) im Zusammenspiel mit Löschen | fehlt | fehlt | fehlt |
| Verschachtelte Tabelle | fehlt | fehlt | n/a |
| Cross-Format-Rundreise nach Spalten-Löschung | n/a | fehlt | fehlt |
| Mobile/Tablet-Bedienung | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „fehlt" ist für dieses Feature vollständig zutreffend —
es existiert keinerlei UI-Anbindung. Die zugrunde liegende Bibliotheksfunktion
(`deleteColumn`) ist zwar vorhanden und funktional stabil, aber **kein einziger Aspekt**
ihres Verhaltens (Grenzfälle, Rundreise, Wechselwirkung mit bereits bekannten
Writer/Reader-Bugs aus Befund 7/8) ist bisher getestet oder auch nur über die
Oberfläche erreichbar.

---

## 9. Verifikationsauftrag (Hinweis zum Backlog-Status „nicht vertrauenswürdig")

Da der Ausgangsstatus laut Backlog „fehlt" ist und dieses Feature vollständig neu
gebaut werden muss, gilt für die Abnahme dieselbe Regel wie in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 und in `suchen-req.md` Abschnitt 13 formuliert:
**Jeder einzelne Testfall dieser Datei muss über echte Browser-Interaktion (Playwright,
sichtbarer Klick/Maus-Drag/Tastatureingabe) nachgewiesen werden — nicht nur durch
isolierte Command-/Unit-Tests auf `commands.ts`- bzw. `prosemirror-tables`-Ebene.** Ein
Unit-Test, der `deleteColumn` direkt mit konstruierten ProseMirror-Dokumenten aufruft,
beweist nicht, dass ein neuer Toolbar-Button, eine echte `CellSelection` per Maus und
die sichtbare Aktualisierung der Tabelle im echten Editor tatsächlich funktionieren.

Vorgeschlagene Testebenen (analog zur Testmatrix in `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 21):

| Ebene | Beispiel-Datei/Ort | Deckt ab |
|---|---|---|
| Unit-Test (Reader/Writer) | `src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts` (Erweiterung) | Export/Import einer bereits verkürzten Tabelle inkl. `colspan`/`rowspan`-Reduktion, Befund 6/7 |
| E2E-Test (echte Bedienung) | `tests/e2e/table-columns.spec.ts` (neu) | Button-Klick, `CellSelection` per Maus, Undo/Redo, Selection-Sync-Regression, letzte-Spalte-Guard |
| Rundreise-Test | Erweiterung bestehender `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` | Abschnitt 5 dieser Datei |
| Reale Fixture-Datei | reale komplexe DOCX/ODT-Dateien (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) | Abschnitt 5.1.4/5.2.4, Befund 8 |

Erst wenn alle Testfälle aus Abschnitt 3–5 auf diesen Ebenen grün sind, darf der
Backlog-Status von `spalte-loeschen` auf „vorhanden" geändert werden.

---

## 10. Zusammenfassung der Pflicht-Abnahmekriterien (Definition of Done)

Das Feature „Spalte löschen" gilt erst dann als **vorhanden** im Sinne des Backlogs,
wenn:

1. Ein echter, klickbarer UI-Weg existiert (Toolbar-Button und/oder Kontextmenü, gemäß
   der in Abschnitt 1, Zeile 4 getroffenen Entscheidung), der `deleteColumn` sichtbar
   und nachvollziehbar auslöst.
2. Alle drei Erkennungsfälle aus Abschnitt 2.1 (Cursor ohne Selektion, `CellSelection`
   innerhalb einer Spalte, `CellSelection` über mehrere Spalten) einzeln getestet und
   ihr Verhalten explizit dokumentiert/entschieden ist.
3. Das Verhalten bei bestehenden Verbindungen (`colspan`/`rowspan`, Abschnitt 2.4/2.5)
   durch dedizierte Testfälle nachgewiesen ist — bisher deckt **kein** Test diesen Pfad
   ab.
4. Der Grenzfall „letzte verbleibende Spalte" (Abschnitt 2.6/3.7) sichtbar
   zurückgemeldet wird (deaktivierter Button oder Hinweistext), kein stiller
   Fehlschlag.
5. Der Selection-Sync-Regressionstest mit „Spalte löschen" als Auslöser (Abschnitt
   2.10/3.19/7.12) geschrieben, grün und dauerhaft Teil der Suite ist.
6. Die Rundreise-Anforderung aus Abschnitt 5 (DOCX, ODT, Cross-Format, reale
   Fremddateien) durch echten Datei-Upload/Download nachgewiesen ist.
7. Die bereits bekannten Writer/Reader-Befunde 6–9 aus Abschnitt 0 im Zusammenspiel mit
   „Spalte löschen" einzeln geprüft und ihr Ergebnis (behoben oder als bewusst
   akzeptierte, dokumentierte Einschränkung) hier nachgetragen wurden — insbesondere
   Befund 7 (ODT-`colCount`-Bug) und Befund 8 (ODT-`covered-table-cell`-Lücke bei realen
   Fremddateien).
8. Kein Testfall stillen Datenverlust zeigt (Inhalt einer **nicht** zu löschenden Spalte
   verschwindet unerwartet) oder eine JS-Exception in der Konsole erzeugt.
9. Undo/Redo (Abschnitt 2.8/7.10-11) zuverlässig funktioniert, auch über mehrere
   aufeinanderfolgende Löschvorgänge hinweg.
10. Der Backlog-Eintrag `spalte-loeschen` wird erst dann auf „vorhanden" geändert, wenn
    Punkte 1–9 erfüllt sind; andernfalls verbleibt der Status „fehlt" bzw. wird auf
    „teilweise" korrigiert, sobald ein erster funktionierender, aber noch nicht
    vollständig verifizierter UI-Weg existiert.
