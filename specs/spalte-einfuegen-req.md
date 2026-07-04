# Feature „Spalte einfügen (links/rechts)" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe** — Backlog-Status ist „fehlt" und gilt aktuell als
**nicht vertrauenswürdig**. Diese Datei ersetzt keine Codeaussage, sondern definiert
verbindlich, was „fertig" für dieses Feature bedeutet. Bevor irgendein Status auf
„vorhanden" gesetzt wird, muss jeder Punkt unten durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein — siehe
Abschnitt 8 „Verifikationsauftrag". Die Codeprüfung unten (durchgeführt vor dem
Schreiben dieser Datei) bestätigt, dass der Backlog-Status „fehlt" hier — anders als
bei einigen als „vorhanden" geführten Funktionen — tatsächlich zutrifft: Es existiert
**keine einzige** Codezeile, die eine Tabellenspalte gezielt einfügt.

Bezug zum Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt „3.2 Tabellen"):

| Slug | Titel | Status laut Backlog | Priorität | Teil dieser Spezifikation? |
|---|---|---|---|---|
| `spalte-einfuegen` | Spalte einfügen (links/rechts) | fehlt | 1 (essenziell) | **Ja — alleiniger Kernumfang dieser Datei** |
| `tabelle-einfuegen` | Tabelle einfügen | teilweise (feste 2×2-Größe) | 1 | Nein — eigener Backlog-Eintrag, hier nur als Ausgangspunkt relevant (Abschnitt 3.10) |
| `zeile-einfuegen` | Zeile einfügen (oberhalb/unterhalb) | fehlt | 1 | Nein — eigene Anforderungsdatei vorzusehen, strukturell analog |
| `spalte-loeschen` | Spalte löschen | fehlt | 1 | Nein — eigene Anforderungsdatei, aber siehe Abschnitt 7 (Abgrenzung) |
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
einen gemeinsamen internen Editor (`src/formats/shared/editor/`, ProseMirror-Schema +
Seitenansicht). „Spalte einfügen" muss deshalb **unabhängig vom Ursprungsformat**
funktionieren und die Rundreise-Fähigkeit (Abschnitt 5) für **beide** Formate erhalten.

---

## 0. Code-Recherche (Referenz für die Verifikation, kein Ersatz für tatsächliches Testen)

| Ebene | Fundstelle | Befund |
|---|---|---|
| Schema | `src/formats/shared/schema.ts:106`: `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` | Tabellen-Knoten (`table`, `table_row`, `table_cell`) kommen unverändert aus der Bibliothek `prosemirror-tables`; `table_cell` besitzt dadurch bereits die Standardattribute `colspan`, `rowspan`, `colwidth` — das Datenmodell kann eine zusätzliche Spalte also ohne Schema-Änderung abbilden. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx:228-239` | Es existiert genau **ein** Tabellen-Button („⊞ Tabelle"), der ausschließlich `insertTable(2, 2)` auslöst (feste 2×2-Größe, separates Ticket `tabelle-einfuegen`). **Kein** Button, kein Menüeintrag, kein Kontextmenü für „Spalte links/rechts einfügen" ist vorhanden. |
| Befehle | `src/formats/shared/editor/commands.ts:76-86`, Funktion `insertTable(rows, cols)` | Einzige tabellenbezogene Befehlsfunktion der Anwendung neben `isInTable` (Re-Export aus `prosemirror-tables`, Zeile 3/6). **Keine** Funktion `addColumn`/`insertColumn` o. Ä. in `commands.ts` vorhanden. |
| Editor-Plugins | `src/formats/shared/editor/WordEditor.tsx:8` (`import { tableEditing, columnResizing } from 'prosemirror-tables'`) und `:81-82` (`columnResizing()`, `tableEditing()` als aktive Plugins) | `tableEditing()` aktiviert Zellauswahl (`CellSelection`, Shift+Klick/Ziehen über mehrere Zellen) und die eingebaute Tab/Umschalt+Tab-Navigation; `columnResizing()` aktiviert Ziehpunkte zur Breitenänderung bestehender Spalten. **Keines der beiden Plugins fügt selbst Spalten ein** — beide sind reine Interaktions-/Darstellungs-Infrastruktur, auf der ein Spalte-einfügen-Feature aufsetzen kann, es aber nicht automatisch mitliefert. Auch die Keymap in `WordEditor.tsx:71-79` enthält keinen Eintrag für Spalten-Operationen. |
| Verfügbare, aber ungenutzte Bausteine | `node_modules/prosemirror-tables` (Version `1.8.5`, direkte Abhängigkeit lt. `package.json:29`, `"prosemirror-tables": "^1.8.5"`) | Die Bibliothek exportiert bereits fertige Befehle `addColumnBefore` und `addColumnAfter` (Quelltext-Fundstelle: `dist/index.cjs`, Funktionen `addColumnBefore`/`addColumnAfter`/`addColumn`/`selectedRect`). **Diese werden aktuell nirgends in `src/` importiert** (per Repository-Suche bestätigt) — die Implementierung dieses Features kann sich also größtenteils auf vorhandene, getestete Bibliotheksfunktionen stützen, statt Spalten-Logik komplett neu zu schreiben. Das exakte Verhalten dieser Bibliotheksfunktionen (ermittelt durch Quelltext-Inspektion, s. Abschnitt 3) ist Grundlage der Anforderungen unten. |
| DOCX-Export | `src/formats/docx/writer.ts:128-171`, Funktion `tableToDocx` | `colCount` wird korrekt als **Summe der `colspan`-Werte der ersten Zeile** berechnet (Zeile 130: `(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) \|\| 1`), das `<w:tblGrid>` bekommt entsprechend viele `<w:gridCol w:w="2000"/>`-Einträge (Zeile 131, **fest 2000 Twips pro Spalte**, unabhängig vom `colwidth`-Attribut). |
| ODT-Export — **gefundener Fehler** | `src/formats/odt/writer.ts:86-110`, `case 'table'` | `colCount` wird **fehlerhaft** als reine Zellenzahl der ersten Zeile berechnet (Zeile 88: `const colCount = rows[0]?.content?.length ?? 1`) — **ohne** `colspan` einzurechnen, im Unterschied zum DOCX-Writer. Enthält Zeile 1 eine horizontal verbundene Zelle (`colspan: 2`), erzeugt `writer.ts` zu wenige `<table:table-column>`-Elemente (Zeile 89). Dieser Fehler existiert bereits unabhängig von diesem Feature, wird aber durch „Spalte einfügen" voraussichtlich **regelmäßig sichtbar**, weil das Einfügen einer Spalte in eine Tabelle mit vorhandenem Merge ein alltäglicher Anwendungsfall ist. Siehe Abschnitt 6 — Fix ist Teil der Abnahmekriterien dieser Anforderung. |
| Spaltenbreiten-Rundreise (verwandtes, vorbestehendes Verhalten) | `src/formats/docx/reader.ts:244` und `src/formats/odt/reader.ts:197` | Beide Reader setzen `colwidth: null` fest beim Import; keiner der beiden Writer liest `node.attrs.colwidth` beim Export. Spaltenbreiten werden also **grundsätzlich nicht** zwischen Datei und Editor übertragen — vorbestehende Einschränkung, nicht durch dieses Feature verursacht, aber relevant für Abschnitt 3.6 (neue Spalte bekommt dieselbe Standardbreite wie alle anderen). |
| Kontextmenü | Repository-weite Suche nach `contextmenu`/`onContextMenu` | **Kein Treffer.** Es existiert aktuell keinerlei Rechtsklick-Kontextmenü in der Anwendung — falls „Spalte einfügen" auch per Kontextmenü erreichbar sein soll, ist das eine komplette Neubau-Entscheidung, kein Anschluss an Bestehendes (siehe Abschnitt 2, Punkt 5). |
| Bestehende Tests | `src/formats/docx/__tests__/roundtrip.test.ts:173-247`, `src/formats/odt/__tests__/roundtrip.test.ts` (analog) | Testen **Rundreise von manuell konstruierten** Tabellen-JSON-Strukturen (inkl. `colspan`/`rowspan`), **nicht** das Einfügen einer Spalte über echte Bedienung — es gibt schlicht keine Funktion, die getestet werden könnte. `tests/e2e/*.spec.ts` enthält keinen Treffer für „Spalte"/„column". |

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
oben, jeweils eigene Anforderungsdatei vorzusehen — Details in Abschnitt 7):
`zeile-einfuegen`, `spalte-loeschen`, `zellen-verbinden`, `zellen-teilen`,
`tabelle-loeschen`, sowie die feste 2×2-Größe von `tabelle-einfuegen` selbst.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Spalte links einfügen" | Tabellen-Gruppe der Toolbar, direkt neben dem bestehenden „⊞ Tabelle"-Button (`Toolbar.tsx:228-239`) | **Fehlt komplett** | Neu zu bauen. Eigenes SVG-Icon (kein Unicode-/Emoji-Zeichen — Lehre aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20: bestehende Icons wie „⊞"/„🖼" sind bereits als Rendering-Risiko dokumentiert, für ein **neues** Element darf dieser Fehler nicht wiederholt werden), zusätzlich `title` **und** `aria-label` (im Unterschied zum bestehenden `AlignButton`, der laut `ausrichtung-links-req.md` Abschnitt 2/4.16 nur `title` hat — hier von Anfang an beides setzen). |
| 2 | Toolbar-Button „Spalte rechts einfügen" | Direkt neben Punkt 1 | Fehlt komplett | Analog zu Punkt 1, eigenes, klar von „links" unterscheidbares Icon (z. B. Spiegelung/Pfeilrichtung), nicht nur Farbwechsel. |
| 3 | Aktiv-/Deaktiviert-Zustand beider Buttons | Toolbar | Fehlt (es gibt keine Buttons) | Beide Buttons sind **sichtbar, aber deaktiviert** (`disabled`, nicht nur optisch abgeblendet), wenn der Cursor sich nicht innerhalb einer Tabelle befindet (`isInTable(state)`, bereits importierbar aus `commands.ts:6`/`prosemirror-tables`). Kein stiller Fehlschlag bei Klick außerhalb einer Tabelle (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 4). |
| 4 | Kontextmenü (Rechtsklick) auf einer Tabellenzelle | — | Nicht vorhanden (Anwendung hat aktuell **kein** Kontextmenü, siehe Abschnitt 0) | **Kein Soll-Bestandteil dieser Anforderung** — Kontextmenüs sind anwendungsweit nicht vorgesehen; die Toolbar-Buttons (Punkt 1/2) sind der verbindliche Bedienweg. Muss bei Abnahme explizit als „bewusst nicht gebaut" bestätigt werden, nicht stillschweigend offenbleiben. |
| 5 | Tastenkombination | — | Nicht vorhanden | Word/LibreOffice definieren hierfür **keine** feste Standardtastenkombination (nur Ribbon/Menü) — kein Soll-Bestandteil. Die Buttons müssen aber über Tastatur erreichbar sein (Tab-Fokus + Enter/Leertaste löst aus), da sie reguläre `<button>`-Elemente sind. |
| 6 | Tab-Taste in der letzten Zelle der letzten Zeile | Editor | Fügt laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 eine neue **Zeile** hinzu (separates Feature `zeile-einfuegen`) | Kein Soll-Bestandteil dieser Datei — nur zur Abgrenzung erwähnt, damit „Tab" nicht fälschlich als bereits vorhandener Ersatz für „Spalte einfügen" missverstanden wird. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundverhalten „Spalte links einfügen" (Cursor in einer Zelle, keine Mehrfachauswahl)
- Cursor irgendwo innerhalb einer Zelle (keine Textselektion nötig) → Klick auf „Spalte
  links einfügen" fügt eine neue, leere Spalte **unmittelbar links** der Spalte ein, in
  der sich die aktuelle Zelle befindet.
- Die neue Spalte erstreckt sich über **alle** Zeilen der Tabelle, nicht nur über die
  aktuelle Zeile — jede Zeile bekommt an der entsprechenden Position eine neue, leere
  Zelle (Standardverhalten der Bibliotheksfunktion `addColumnBefore` aus
  `prosemirror-tables`, siehe Abschnitt 0; iteriert laut Quelltext über
  `map.height`, also über jede Tabellenzeile).
- Die Tabelle wächst dadurch insgesamt um genau eine Spalte (z. B. 2×2 → 3×2 „Spalten ×
  Zeilen"-Notation).

### 3.2 Grundverhalten „Spalte rechts einfügen"
- Analog zu 3.1, aber die neue Spalte entsteht **unmittelbar rechts** der aktuellen
  Zelle (Bibliotheksfunktion `addColumnAfter`, inseriert an der rechten Grenze der
  ermittelten Selektions-Rechteck-Koordinate).
- Angewendet auf die Zelle in der **letzten** Spalte fügt eine neue, letzte Spalte an
  (Tabelle wird am rechten Rand erweitert) — Grenzfall 4.3.
- Angewendet auf die Zelle in der **ersten** Spalte mit „Spalte links" fügt eine neue,
  erste Spalte an (Tabelle wird am linken Rand erweitert) — ebenfalls Grenzfall 4.3.

### 3.3 Verhalten bei einer Mehrfach-Zellauswahl (`CellSelection` über mehrere Spalten)
- Ist mittels Shift+Klick/Ziehen eine `CellSelection` über **mehrere** Spalten aktiv
  (durch das bereits aktive Plugin `tableEditing()`, `WordEditor.tsx:82`, möglich),
  ermitteln `addColumnBefore`/`addColumnAfter` laut Quelltext (`selectedRect`,
  `map.rectBetween(...)`) das **umschließende Rechteck** der Auswahl und fügen
  **genau eine** neue Spalte an dessen linker bzw. rechter Grenze ein — **nicht** eine
  neue Spalte pro markierter Spalte.
- Das weicht vom in Word/LibreOffice üblichen Verhalten ab, wo eine Mehrfachauswahl von
  z. B. 3 markierten Spalten beim Einfügen **3** neue Spalten erzeugt. Dieser
  Unterschied ist **explizit als offener Klärungspunkt** zu behandeln (nicht
  stillschweigend hinzunehmen): entweder wird das Bibliotheksverhalten (eine Spalte,
  unabhängig von der Auswahlbreite) bewusst als für dieses Projekt ausreichend
  akzeptiert und dokumentiert, oder die Anwendung muss die Mehrfach-Einfüge-Semantik
  selbst nachbilden (z. B. `addColumnBefore`/`addColumnAfter` in einer Schleife einmal
  je markierter Spalte aufrufen). Muss vor Abnahme entschieden und mit Testfall belegt
  werden (siehe Grenzfall 4.4).

### 3.4 Verhalten an horizontal verbundenen Zellen (`colspan`) an der Einfügegrenze
- Reicht in einer Zeile eine bereits horizontal verbundene Zelle (`colspan > 1`) über
  die Einfügeposition hinweg, wird in **dieser Zeile keine neue Zelle eingefügt**,
  sondern die bestehende verbundene Zelle bekommt ihren `colspan`-Wert um 1 erhöht
  (Quelltext-Fundstelle `addColumn`, Bedingung
  `map.map[index - 1] == map.map[index]` — erkennt, dass die Spaltengrenze mitten durch
  eine bereits verbundene Zelle verläuft, und ruft `tr.setNodeMarkup(..., addColSpan(...))`
  statt `tr.insert(...)` auf).
- In **anderen** Zeilen derselben Tabelle, in denen an derselben Spaltengrenze **keine**
  verbundene Zelle liegt, wird ganz normal eine neue, leere Zelle eingefügt. Das
  Verhalten wird also **pro Zeile unabhängig** entschieden — eine Tabelle mit
  unregelmäßigen Merges bekommt entsprechend eine Mischung aus „Zelle verbreitert" und
  „neue leere Zelle eingefügt" in derselben Spalten-Einfügeaktion. Dies ist
  **gewünschtes**, mit einem gezielten Testfall zu belegendes Verhalten (Grenzfall 4.2),
  nicht ein zu vermeidender Nebeneffekt.
- Dasselbe gilt sinngemäß für vertikal verbundene Zellen (`rowspan`): Die
  Fortsetzungszeilen eines `rowspan`-Bereichs teilen sich laut `TableMap` dieselbe
  Zellreferenz wie die Ankerzeile, wodurch die obige Colspan-Erweiterung automatisch
  auch für alle Zeilen greift, die von der verbundenen Zelle überdeckt werden (siehe
  Grenzfall 4.2).

### 3.5 Inhalt neuer Zellen
- Jede neu eingefügte Zelle ist **leer** (Bibliotheksfunktion erzeugt sie über
  `type.createAndFill()`), es wird **kein** Inhalt aus Nachbarzellen kopiert oder
  übernommen — auch keine Formatierung (Zellen-Textausrichtung etc.) der
  Nachbarspalte.
- Eine neue, leere Zelle muss trotzdem sofort klickbar/tippbar sein (mindestens ein
  leerer `paragraph`-Knoten als Inhalt, analog zum bestehenden Verhalten von
  `insertTable`, `commands.ts:79`, `wordSchema.nodes.table_cell.createAndFill()`).

### 3.6 Spaltenbreite der neu eingefügten Spalte
- Da Spaltenbreiten (`colwidth`-Attribut) im gesamten bestehenden Import/Export-Pfad
  bereits nicht round-trip-fähig sind (siehe Abschnitt 0 — beide Reader setzen
  `colwidth: null`, beide Writer ignorieren `colwidth` beim Export vollständig), erhält
  die neue Spalte im Editor und beim Export dieselbe (Default-)Breite wie alle übrigen
  Spalten — das ist **kein** durch dieses Feature verursachter Rundreiseverlust,
  sondern konsistent mit dem bestehenden Verhalten, und ist als solches zu dokumentieren
  statt fälschlich als neuer Bug behandelt zu werden.
- Beim Ziehen einer bestehenden Spaltenbreite (aktives `columnResizing()`-Plugin,
  `WordEditor.tsx:81`) nach dem Einfügen einer Spalte: bestehende Nachbarspalten dürfen
  ihre zuvor per Ziehpunkt gesetzte Breite nicht verlieren (falls Breiten-Ziehen bereits
  anderweitig funktionsfähig ist — sonst als bekannte Einschränkung dokumentieren).

### 3.7 Fokus-/Cursor-Verhalten nach dem Einfügen
- Nach dem Einfügen bleibt der Editor fokussiert (`view.focus()`, analog zum
  bestehenden Muster `run()` in `Toolbar.tsx:23-26`), und die Selektion bleibt an einer
  sinnvollen, nachvollziehbaren Position — idealerweise weiterhin in der ursprünglichen
  (jetzt ggf. um eine Position verschobenen) Zelle, nicht automatisch in der neuen,
  leeren Spalte hineinspringend.
- **Kritischer Berührungspunkt mit dem bekannten Selection-Sync-Bug**
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, Tabellen dort explizit als
  „Hauptverdachtsfall" genannt): Spalte einfügen → per Klick in eine andere Zelle
  wechseln → Enter/Tippen → **kein** unbeabsichtigtes Überschreiben des gesamten
  Tabelleninhalts. Pflicht-Regressionstest, siehe Grenzfall 4.10.

### 3.8 Undo/Redo
- Ein Klick auf „Spalte links/rechts einfügen" erzeugt **genau einen** Undo-Schritt,
  auch wenn dabei mehrere Zeilen gleichzeitig verändert werden (eine neue Zelle je
  Zeile bzw. eine Colspan-Erweiterung je betroffener Zeile, siehe 3.4) — ein einzelnes
  Strg+Z macht die komplette Spalten-Einfügeaktion rückgängig, nicht nur die Änderung
  an einer einzelnen Zeile.
- Undo direkt nach dem Einfügen stellt die Tabelle exakt in vorherigem Zustand wieder
  her (Spaltenanzahl, Zellinhalte, alle `colspan`/`rowspan`-Werte identisch zum Zustand
  vor dem Klick). Redo stellt die neue Spalte wieder her.

### 3.9 Zusammenspiel mit verschachtelten Tabellen
- Befindet sich der Cursor in einer Tabelle, die selbst innerhalb einer Zelle einer
  äußeren Tabelle liegt (verschachtelte Tabelle, laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 6 mindestens beim Import nicht abstürzend zu behandeln), muss „Spalte
  einfügen" sich **ausschließlich** auf die innerste, den Cursor unmittelbar
  umschließende Tabelle auswirken — die äußere Tabelle darf nicht verändert werden.
  ProseMirror ermittelt die relevante Tabelle über `$pos.node(-1)` (nächster
  Tabellen-Vorfahre relativ zur Selektion, siehe `selectedRect`-Quelltext in
  Abschnitt 0) — das Standardverhalten sollte dies bereits korrekt handhaben, ist aber
  mit einem echten verschachtelten Testfall zu belegen (Grenzfall 4.5), nicht nur
  anzunehmen.

### 3.10 Zusammenspiel mit dem bestehenden „Tabelle einfügen"-Button (feste 2×2-Größe)
- Solange `tabelle-einfuegen` (separater Backlog-Eintrag) weiterhin nur feste 2×2-Tabellen
  erzeugt (`Toolbar.tsx:234`, `insertTable(2, 2)`), ist „Spalte einfügen" der
  **einzige** Weg, eine bestehende Tabelle nachträglich zu verbreitern. Das begründet
  die hohe Priorität dieses Features zusätzlich zur bereits von der Nutzerin gemeldeten
  Dringlichkeit (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6).

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
   Spalte fügt eine neue letzte Spalte ein — beide Male bleibt die Cursor-Zelle
   inhaltlich unverändert, nur ihre Position innerhalb der Tabelle verschiebt sich ggf.
   um eine Spalte.
4. **Mehrfach-Zellauswahl über mehrere Spalten (siehe 3.3):** Es wird **eine** einzelne
   Spalte eingefügt, nicht eine pro markierter Spalte — mit Testfall zu belegen
   (3×3-Tabelle, mittlere und rechte Spalte markiert, „Spalte rechts" anwenden, Ergebnis
   dokumentieren) und als bewusste Entscheidung zu bestätigen oder als nachzuliefernde
   Abweichung zu ticketieren.
5. **Verschachtelte Tabelle (Tabelle in Tabellenzelle):** Spalte in der inneren Tabelle
   einfügen → äußere Tabelle bleibt strukturell und inhaltlich unverändert (siehe 3.9).
6. **Bestehender ODT-Spaltenzahl-Fehler (siehe Abschnitt 0/6):** Tabelle mit
   horizontal verbundener Zelle in Zeile 1 exportiert schon **vor** dieser Funktion
   eine zu geringe Anzahl `<table:table-column>`-Elemente. Nach Implementierung dieser
   Funktion wird genau dieser Fall (Tabelle mit Merge + zusätzliche Spalte) zum
   Alltagsfall — der Fix ist daher **verbindlicher Bestandteil** dieser Anforderung,
   nicht optional (siehe Abschnitt 6, Abnahmekriterium 2).
7. **Sehr breite Tabelle nach mehrfachem Erweitern (> 10 Spalten):** Wiederholtes
   Klicken auf „Spalte rechts" (z. B. 10×) → kein Performance-Einbruch, keine
   JS-Exception, Tabelle bleibt bedienbar. Zu klären und zu dokumentieren, wie mit einer
   Tabelle umgegangen wird, die breiter als die Seite wird (horizontales Scrollen der
   Tabelle vs. automatische Schrumpfung aller Spaltenbreiten) — „still falsch" ist
   keine akzeptable Antwort, eine der beiden Varianten muss bewusst gewählt sein.
8. **Klick außerhalb einer Tabelle:** Cursor steht in einem normalen Absatz (keine
   Tabelle im Dokument oder Cursor schlicht nicht in einer) → Buttons sind deaktiviert
   (siehe Abschnitt 2, Punkt 3), kein Fehler, keine Wirkung.
9. **Undo/Redo unmittelbar nach dem Einfügen** (siehe 3.8) — Tabelle exakt wie vorher,
   inklusive aller Merges; Redo stellt neue Spalte inklusive korrekt wiederhergestellter
   Merge-Anpassungen wieder her.
10. **Selection-Sync-Regressionstest mit Tabellen** (siehe 3.7 und
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Spalte einfügen → Klick in eine andere
    Zelle zur Neupositionierung → Enter → weitertippen → **kein** Datenverlust im
    übrigen Tabelleninhalt. Pflicht-Regressionstest, dauerhaft Teil der Suite, analog
    `tests/e2e/selection-regression.spec.ts`.
11. **Zelle mit mehreren Absätzen als Inhalt** an der Einfügeposition → Einfügen einer
    Nachbarspalte verändert den mehrabsätzigen Inhalt der Ausgangszelle nicht.
12. **Reale Fremddatei mit bereits unregelmäßiger Tabellenstruktur** (z. B. aus einem
    Open-Source-Testkorpus, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) importieren,
    danach eine Spalte einfügen → kein Absturz, auch wenn die Ausgangsdatei bereits
    Grenzfälle wie fehlende `w:tblGrid`-Einträge oder inkonsistente Zeilenlängen enthält
    (Reader-seitig bereits robust gegen Tiefenlimits, `docx/reader.ts:203-210`, aber
    nicht notwendigerweise gegen jede Inkonsistenz — mit echter Datei zu prüfen).

---

## 5. Rundreise-Anforderung (verbindlich, DOCX **und** ODT)

Wie in `FEATURE-SPEC-DOCX-ODT.md` gefordert, gilt für jede Interaktion mit „Spalte
einfügen" die Rundreise-Bedingung: **Datei/Tabelle unverändert exportieren → Ergebnis
entspricht inhaltlich dem Zustand nach dem Einfügen im Editor**, sowie zusätzlich für
importierte Fremddateien: **Datei A hochladen → Spalte einfügen → exportieren →
Re-Import → ursprünglicher Inhalt von A vollständig wiederzufinden, plus die neue,
leere Spalte.**

### 5.1 DOCX
1. **Einfache Eigenrundreise:** Im Editor eine 2×2-Tabelle einfügen, Inhalt in alle 4
   Zellen tippen, „Spalte rechts einfügen" in der zweiten Spalte anwenden → 3×2-Tabelle
   → als DOCX exportieren → mit einem unabhängigen Parser (z. B. python-docx oder
   direktes Parsen von `word/document.xml`) verifizieren: `<w:tblGrid>` enthält genau
   3 `<w:gridCol>`, jede `<w:tr>` enthält genau 3 `<w:tc>` → Re-Import zeigt 3 Spalten
   mit identischem Original-Inhalt in den unveränderten Zellen und leeren Zellen in der
   neuen Spalte.
2. **Mit horizontal verbundener Zelle:** Tabelle mit einer `colspan: 2`-Zelle in Zeile 1
   anlegen (z. B. über einen konstruierten Testfall/vorhandenes Fixture), Spalte in
   einer nicht verbundenen Nachbarspalte einfügen → Rundreise erhält sowohl den
   ursprünglichen Merge (`w:gridSpan`) als auch die neue Spalte korrekt getrennt
   voneinander.
3. **Mit vertikal verbundener Zelle:** Tabelle mit einer `rowspan: 2`-Zelle, Spalte
   links davon einfügen → beide betroffenen Zeilen bekommen konsistent je eine neue,
   leere Zelle bzw. eine erweiterte Merge-Zelle (je nach genauer Position, siehe
   Grenzfall 4.2); `w:vMerge`-Struktur bleibt nach Rundreise korrekt.
4. **Cross-Format:** ODT-Datei mit einer Tabelle importieren, im Editor eine Spalte
   einfügen, als DOCX exportieren → Re-Import zeigt korrekte Spaltenanzahl und
   unverändert erhaltenen Original-Zellinhalt.
5. **Reale Fremddatei:** Eine reale, komplexe DOCX-Testdatei mit einer Tabelle (z. B.
   aus einem Open-Source-Testkorpus wie den python-docx-Testfixtures) importieren, eine
   Spalte einfügen, danach exportieren, erneut importieren → sämtlicher ursprünglicher
   Zellinhalt weiterhin vorhanden und unverändert, zusätzlich die neue Spalte vorhanden.

### 5.2 ODT
1. **Einfache Eigenrundreise:** Analog zu 5.1.1 — zusätzlich verifizieren, dass die
   Anzahl der exportierten `<table:table-column>`-Elemente **exakt** der tatsächlichen
   Spaltenanzahl (3) entspricht, nicht der (fehlerhaft berechneten) Zellenzahl der
   ersten Zeile. **Dieser Testfall deckt den in Abschnitt 0/6 dokumentierten
   bestehenden Fehler unmittelbar auf, sobald Zeile 1 einen Merge enthält, und muss
   grün sein, bevor der Status auf „vorhanden" gesetzt werden darf.**
2. **Mit horizontal verbundener Zelle:** Tabelle mit einer `table:number-columns-
   spanned="2"`-Zelle in Zeile 1 plus einer zusätzlich eingefügten Spalte → Anzahl
   `<table:table-column>` muss der Summe aller spannweiten-gewichteten Zellen der
   ersten Zeile entsprechen (konkreter Bugfix-Nachweis, siehe Abschnitt 6).
3. **Cross-Format:** DOCX-Tabelle importieren, Spalte einfügen, als ODT exportieren →
   Re-Import zeigt korrekte Struktur und unveränderten Original-Inhalt.
4. **Reale Fremddatei:** Analog zu 5.1.5, mit einer realen ODT-Testdatei.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. Tabelle im Editor erzeugen, eine Spalte einfügen, als ODT exportieren → erneut
   importieren → als DOCX zurück-exportieren → Spaltenanzahl und Zellinhalt bleiben
   über beide Konvertierungen identisch (Formatierungsverluste bei Cross-Format sind
   laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 akzeptabel und zu dokumentieren,
   Textverlust bzw. Spaltenverlust nicht).
2. Dieselbe Prüfung mit Startpunkt DOCX → ODT → DOCX.

---

## 6. Technische Voraussetzung: Fix des ODT-Spaltenzahl-Fehlers (verbindlich)

**Keine optionale Beobachtung, sondern Teil des Abnahmekriteriums dieser
Anforderung:** Der in Abschnitt 0 dokumentierte Fehler in
`src/formats/odt/writer.ts:88` (`const colCount = rows[0]?.content?.length ?? 1`)
muss so korrigiert werden, dass `colCount` — analog zum bereits korrekten DOCX-Writer
(`src/formats/docx/writer.ts:130`) — die **Summe der `colspan`-Werte** der ersten Zeile
verwendet, nicht deren rohe Zellenzahl.

Begründung: Ohne diesen Fix exportiert jede Tabelle mit einem Merge in Zeile 1 eine zu
geringe Anzahl `<table:table-column>`-Elemente. Das kann dazu führen, dass ein externer
ODF-Konsument (LibreOffice Writer) die Spaltenbreiten falsch verteilt oder die Tabelle
als strukturell inkonsistent behandelt. Da „Spalte einfügen" typischerweise gerade an
Tabellen genutzt wird, die im Laufe der Bearbeitung bereits Merges enthalten, würde
dieser vorbestehende, bisher selten getroffene Fehler durch dieses Feature zum
regelmäßig auftretenden Praxisfall.

**Testfälle**
1. Tabelle mit `colspan: 2`-Zelle in Zeile 1 und einer normalen Zelle daneben (also 2
   Zellen, aber 3 tatsächliche Spalten) exportieren (auch **ohne** Nutzung von „Spalte
   einfügen") → `<table:table-column>`-Anzahl ist 3, nicht 2.
2. Dieselbe Tabelle, danach eine zusätzliche Spalte eingefügt → `<table:table-column>`-
   Anzahl ist 4, korrekt fortgeschrieben.
3. Regressionstest: Bestehende ODT-Rundreise-Unit-Tests für Merges
   (`src/formats/odt/__tests__/roundtrip.test.ts`, analog zu den DOCX-Äquivalenten in
   Abschnitt 0) müssen um eine explizite Prüfung der `<table:table-column>`-Anzahl
   erweitert werden, damit dieser Fehler zukünftig nicht unbemerkt wieder auftritt.

---

## 7. Explizit außerhalb des Scopes dieser Spezifikation

Um Missverständnisse bei der späteren Abnahme zu vermeiden:

- **`zeile-einfuegen` (Zeile einfügen oberhalb/unterhalb, Priorität 1):** Strukturell
  analoges, aber eigenständiges Feature mit eigener Anforderungsdatei — nicht Teil
  dieser Datei, auch wenn dieselben Bibliotheksbausteine (`prosemirror-tables`,
  `addRowBefore`/`addRowAfter`) zum Einsatz kommen dürften.
- **`spalte-loeschen` (Spalte löschen, Priorität 1):** Eigener Backlog-Eintrag, eigene
  Anforderungsdatei. Wird hier nur insofern berührt, als Undo nach „Spalte einfügen"
  (Abschnitt 3.8) den Effekt eines Löschens erzeugt, ohne dass ein eigener
  „Löschen"-Befehl beteiligt ist.
- **`zellen-verbinden`/`zellen-teilen` (Priorität 1/2):** Eigene Backlog-Einträge.
  Relevant für diese Datei nur als Rand-/Grenzfall (Abschnitt 3.4/4.2 — Verhalten der
  neuen Spalte an bereits bestehenden Merges), nicht als zu bauende Funktion selbst.
- **`tabelle-einfuegen` (feste 2×2-Größe durch wählbaren Dialog ersetzen, Priorität 1):**
  Eigener, bereits im Backlog als „teilweise" geführter Eintrag — wird hier nur als
  Ausgangspunkt/Kontext erwähnt (Abschnitt 3.10).
- **Kontextmenü (Rechtsklick) als zusätzlicher Bedienweg:** Siehe Abschnitt 2, Punkt 4
  — bewusst nicht Teil dieser Anforderung, da die Anwendung aktuell kein Kontextmenü
  besitzt und keines für dieses Feature neu eingeführt werden soll.
- **Spaltenbreiten-Rundreise (`colwidth` tatsächlich aus der Datei übernehmen und
  export­ieren):** Vorbestehende, unabhängige Einschränkung (siehe Abschnitt 0),
  kein Bestandteil dieser Anforderung — wird höchstens in einem eigenen Ticket zur
  Tabellen-Spaltenbreite behandelt.

---

## 8. Verifikationsauftrag (Hinweis zum Backlog-Status „nicht vertrauenswürdig")

Da der Ausgangsstatus laut Backlog „fehlt" ist und durch die Code-Recherche in
Abschnitt 0 bestätigt wurde (keine einzige Codezeile für Spalten-Einfügen vorhanden),
muss die Abnahme dieselbe Regel erfüllen wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22
formuliert: **Jeder einzelne Testfall dieser Datei muss über echte Browser-Interaktion
(Playwright, sichtbarer Klick) nachgewiesen werden — nicht nur durch isolierte
Unit-Tests, die `addColumnBefore`/`addColumnAfter` direkt auf einem konstruierten
ProseMirror-Dokument aufrufen.** Ein solcher Unit-Test beweist nicht, dass die
Toolbar-Buttons tatsächlich existieren, korrekt (de)aktiviert sind und im echten Editor
sichtbar wirken.

Vorgeschlagene Testebenen:

| Ebene | Beispiel-Datei/Ort | Deckt ab |
|---|---|---|
| Unit-Test (Befehls-Logik) | `src/formats/shared/editor/__tests__/commands.test.ts` (neu/erweitert) | Korrektes Einfügen bei einfachen und bei Merge-haltigen Tabellen, Undo-Verhalten als eine Transaktion |
| Unit-Test (Writer-Fix) | `src/formats/odt/__tests__/roundtrip.test.ts` (erweitert) | Der in Abschnitt 6 geforderte `colCount`-Fix |
| E2E-Test (echte Bedienung) | `tests/e2e/tables.spec.ts` (neu) | Toolbar-Buttons, Aktiv-/Deaktiviert-Zustand außerhalb einer Tabelle, Mehrfachauswahl-Grenzfall (4.4), verschachtelte Tabelle (4.5), Selection-Sync-Regression (4.10) |
| Rundreise-Test | Erweiterung `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` bzw. Reader/Writer-Unit-Tests | Abschnitt 5 dieser Datei |
| Reale Fixture-Datei | vorhandene/komplexe Test-DOCX/ODT mit Tabelle (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) | Grenzfall 4.12 |

Erst wenn alle Testfälle aus Abschnitt 3–6 auf diesen Ebenen grün sind, darf der
Backlog-Status von `spalte-einfuegen` auf „vorhanden" geändert werden.

---

## 9. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Spalte links einfügen" | fehlt komplett | neu bauen, siehe Abschnitt 2/3.1 |
| 2 | Toolbar-Button „Spalte rechts einfügen" | fehlt komplett | neu bauen, siehe Abschnitt 2/3.2 |
| 3 | Aktiv-/Deaktiviert-Zustand beider Buttons (`isInTable`) | fehlt (keine Buttons vorhanden) | siehe Abschnitt 2, Punkt 3 |
| 4 | Korrekte Behandlung von `colspan`/`rowspan` an der Einfügegrenze | fehlt (keine Einfügefunktion vorhanden) | siehe Abschnitt 3.4, 4.2 — Bibliotheksfunktion `addColumn` übernimmt dies bereits korrekt, sofern eingebunden |
| 5 | ODT-Export: korrekte `<table:table-column>`-Anzahl bei Merges | **vorbestehender Fehler**, unabhängig von diesem Feature | Pflicht-Fix, siehe Abschnitt 6 |
| 6 | Kontextmenü als Bedienweg | nicht vorhanden (anwendungsweit) | bewusst **nicht** Teil dieser Anforderung, siehe Abschnitt 7 |
| 7 | Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser | fehlt (Funktion existiert noch nicht) | siehe Abschnitt 3.7, 4.10 |

---

## 10. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert"/„vorhanden" gelten, wenn **alle** folgenden
Punkte erfüllt sind:

1. Beide Toolbar-Buttons („Spalte links/rechts einfügen") existieren, sind über echten
   Playwright-Klick bedienbar und außerhalb einer Tabelle sichtbar deaktiviert.
2. Grundverhalten (Abschnitt 3.1/3.2) inklusive Position der neuen Spalte relativ zur
   Cursor-Zelle ist per E2E-Test nachgewiesen.
3. Verhalten an horizontal/vertikal verbundenen Zellen (Abschnitt 3.4, Grenzfall 4.2)
   ist mit einem konkreten Testfall (unregelmäßige Merge-Struktur) belegt.
4. Die Mehrfachauswahl-Abweichung (Abschnitt 3.3, Grenzfall 4.4) ist geprüft und
   entweder als bewusst akzeptiertes Verhalten bestätigt oder per Ticket zur
   Nachbesserung vorgemerkt — nicht unentschieden offengelassen.
5. Der ODT-`colCount`-Fix (Abschnitt 6) ist umgesetzt, mit eigenem Testfall abgesichert
   und regressionssicher in die Testsuite aufgenommen.
6. Rundreise-Testfälle aus Abschnitt 5.1 und 5.2 (mindestens Testfälle 1–3 je Format)
   sind mit echten Datei-Uploads/Downloads (nicht nur intern aufgerufenen
   Reader/Writer-Funktionen) bestanden.
7. Der Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser
   (Grenzfall 4.10) ist dauerhaft Teil der E2E-Suite.
8. Undo/Redo-Verhalten (Abschnitt 3.8) inklusive korrekter Wiederherstellung von
   Merge-Zuständen ist bestätigt.
9. Verschachtelte-Tabelle-Grenzfall (4.5) ist mit einem echten Testfall geprüft, kein
   Absturz und keine Verfälschung der äußeren Tabelle.
10. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
