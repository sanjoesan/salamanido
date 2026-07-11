# Anforderungsspezifikation: Feature „Nummerierte Liste"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 5 („Listen") von
`FEATURE-SPEC-DOCX-ODT.md` sowie den Backlog-Eintrag `nummerierte-liste` in
`specs/FEATURE-BACKLOG.md` (Zeile 155: „Nummerierte Liste — Wandelt Absätze in eine
fortlaufend nummerierte Liste um.", Status „vorhanden", Priorität 1/essenziell) und
ersetzt dessen kurzen Stichpunkt durch eine vollständige, einzeln abhakbare Anforderung
inkl. Grenzfällen und Rundreise-Pflicht. Es gilt weiterhin das Grundprinzip aus
`FEATURE-SPEC-DOCX-ODT.md`: gemeinsamer interner Editor (ProseMirror-Schema +
Seitenansicht) für DOCX und ODT — jede Anforderung unten muss für **beide** Formate
gelten, sowohl beim Import einer bestehenden Datei als auch beim Export einer im Editor
erstellten/bearbeiteten Datei, inklusive Rundreise (Datei A hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich A).

Geschwister-Dokumente / abhängige Backlog-Slugs: `specs/aufzaehlungsliste-req.md`
(strukturell fast identisches Bullet-Feature, teilt sich denselben
`toggleList`/`liftFromList`-Code und dieselbe Toolbar-Gruppe), `specs/liste-aufheben-req.md`,
`specs/liste-einruecken-tab-req.md`. Der Backlog kennt zusätzlich
`mehrstufige-liste` (Status „fehlt", Priorität 2), `liste-einruecken-tab` („fehlt", P1),
`nummerierung-fortsetzen-neustarten` („teilweise", P3) und `eigenes-nummernformat`
(„fehlt", P4). Wo Verhalten/Code mit dem Bullet-Geschwister identisch ist, wird darauf
verwiesen statt es zu duplizieren; wo es sich unterscheidet (nummerierte Listen tragen
einen **Zählwert** mit Startwert und Fortsetzungs-/Neustart-Semantik, den Bullets nicht
haben), wird das explizit ausgeführt.

Backlog-Status laut Vorgabe: **„vorhanden" — gilt aktuell als nicht vertrauenswürdig,
muss vollständig verifiziert werden.** Dieses Dokument beschreibt sowohl den
Soll-Zustand als auch (Abschnitt 5) den durch **direkte Code-Sichtung** festgestellten
Ist-Zustand mit dateigenauen Fundstellen, die die verhaltensseitige Verifikation gezielt
bestätigen oder widerlegen muss.

> **Korrektur gegenüber der Vorfassung dieses Dokuments (wichtig für Dev/QA):** Eine
> frühere Fassung vermutete, dass mehrstufige (verschachtelte) nummerierte Listen beim
> DOCX-Import **und** -Export „höchstwahrscheinlich nicht implementiert" seien. Diese
> Annahme ist durch die aktuelle Code-Sichtung **widerlegt**: Der DOCX-Reader liest
> `w:ilvl` aus und rekonstruiert die Verschachtelung stack-basiert
> (`docx/reader.ts:294-302` und `groupLists`, `docx/reader.ts:379-440`); der DOCX-Writer
> schreibt pro Verschachtelungsebene ein wachsendes `w:ilvl`
> (`docx/writer.ts:105-140`, `MAX_LIST_ILVL=8`); `word/numbering.xml` definiert für
> beide Listentypen alle 9 OOXML-Ebenen (`docx/styleDefs.ts:43-73`). Der ODT-Pfad
> rundreist Verschachtelung ebenfalls strukturell (`odt/reader.ts:286-299`,
> `odt/writer.ts:99-109`). Für **beide** Formate existiert bereits ein grüner
> Unit-Test „preserves a nested list two levels deep" (`docx/__tests__/roundtrip.test.ts:178-204`,
> `odt/__tests__/roundtrip.test.ts:169-194`). Der Fokus dieser Verifikation verschiebt
> sich damit weg von „Verschachtelung überhaupt bauen" hin zu den **tatsächlich noch
> offenen** Lücken (kein UI-Weg, um Verschachtelung zu erzeugen; Startwert wird beim
> Export verworfen; keine Fortsetzen/Neustart-Semantik; nummerierte Liste in
> Tabellenzelle geht beim DOCX-Import verloren; ODT-Listenstil-Auflösung; fehlender
> aktiver Button-Zustand). Details je Punkt in Abschnitt 5.

> **Unabhängige Neuverifikation dieser Fassung (2026-07-05):** Jede in diesem Dokument
> zitierte Fundstelle wurde erneut einzeln am aktuellen Quellcode nachvollzogen —
> `Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`, `schema.ts`, `docx/reader.ts`,
> `docx/writer.ts`, `docx/styleDefs.ts`, `odt/reader.ts`, `odt/writer.ts`,
> `odt/styleRegistry.ts`, `src/index.css`, die zitierten Stellen in
> `docx/__tests__/roundtrip.test.ts` und `odt/__tests__/roundtrip.test.ts` sowie die
> Existenz aller in Abschnitt 4.2 gelisteten Fixture-Dateien und der Backlog-Eintrag
> in `specs/FEATURE-BACKLOG.md:155`. Alle Zeilenangaben und Codezitate erwiesen sich
> als **weiterhin zutreffend**; keine der Vorfassung entnommenen Fundstellen musste
> korrigiert werden. Einzige inhaltliche Ergänzung dieser Runde: eine bislang fehlende
> ODT-Nummerierungs-Fixture in Abschnitt 4.2 (`sample_numbering_DOC_LO41.odt`) sowie
> eine unabhängig nachvollziehbare Quellenangabe für den Tailwind-Preflight-Befund in
> 2.2/5.13 (`node_modules/tailwindcss/preflight.css:197-200`).

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort (dateigenau) | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button „1. Liste" (Nummerierung) | `src/formats/shared/editor/Toolbar.tsx:252-262`, Toolbar-Gruppe „Listen" | Reiner Textbutton „1. Liste", `onMouseDown` ruft `toggleList(true)` (`commands.ts:57-60`) → `wrapInList(wordSchema.nodes.ordered_list)` | Muss auf Absatz(en) **und** auf leerer Zeile funktionieren; siehe Abgrenzung zu 2.7 (echtes Umschalten) |
| 2 | Button „• Liste" (Aufzählung) | `Toolbar.tsx:241-251`, ruft `toggleList(false)` | vorhanden | eigene Spezifikation `aufzaehlungsliste-req.md`; hier nur relevant als Umschaltfall (Abschnitt 2.7) |
| 3 | Button „⇧ Liste" (Liste aufheben) | `Toolbar.tsx:263-273`, ruft `liftFromList()` (`commands.ts:62-64` → `liftListItem(wordSchema.nodes.list_item)`) | vorhanden | Muss bei mehrstufigen Listen die korrekte Einzelebene anheben, nicht die ganze Liste in einem Schritt zerstören (siehe 2.6) |
| 4 | Aktiver Zustand des Buttons „1. Liste" | `Toolbar.tsx:252-262` | **Kein `aria-pressed`, kein `aria-label`, kein „aktiv"-Styling** — im Gegensatz zu `MarkButton` (`Toolbar.tsx:75`, `aria-pressed={active}`), `AlignButton` (`Toolbar.tsx:97`) und dem Tabelle-Button (`Toolbar.tsx:281`, `aria-pressed={isInTable(view.state)}`) | Muss ergänzt werden: Cursor in einer nummerierten Liste → Button zeigt sichtbar „aktiv" an; es fehlt bislang jede Helferfunktion `isListActive` (analog zu `isAlignActive`, `commands.ts:29-38`) |
| 5 | Ein-/Ausrücken per Tastatur (Tab / Umschalt+Tab) | Editor-Keymap, `WordEditor.tsx:85-107` | **Fehlt vollständig.** Weder `Tab` noch `Shift-Tab` ist gebunden; `sinkListItem` (aus `prosemirror-schema-list`) wird im gesamten Projekt **nirgends** importiert (`commands.ts:2` importiert nur `wrapInList`, `liftListItem`) | Muss ergänzt werden: Tab am Zeilenanfang eines Listenpunkts rückt eine Ebene tiefer ein, Umschalt+Tab rückt aus; außerhalb einer Liste darf Tab keine Listenwirkung auslösen (Abgrenzung, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15). Ohne dieses Element gibt es **keinen** Weg, im Editor selbst eine mehrstufige Liste zu erzeugen (siehe 2.4). Deckt zugleich Backlog `liste-einruecken-tab`/`mehrstufige-liste`, ersetzt aber nicht deren eigene Abnahme |
| 6 | Startwert der Liste ändern (z. B. bei „5." statt „1." beginnen) | — | Datenmodell hat `ordered_list.attrs.start` (Default 1, `schema.ts:124-137`) und rendert es im Editor korrekt als `<ol start=…>` (`schema.ts:135`), **aber keine UI**, um den Wert zu setzen; zudem verwirft der Export ihn (siehe 5, Punkt 6) | UI-Element (mind. Eingabefeld/Kontextaktion) ergänzen; Export **und** Import müssen den Wert erhalten |
| 7 | Nummerierung fortsetzen / neu beginnen | — | **Fehlt komplett** (weder UI noch Import/Export-Semantik). Backlog `nummerierung-fortsetzen-neustarten` = „teilweise", P3 | Muss gebaut werden, siehe 2.5 |
| 8 | Eigenes Nummernformat (1. / a) / i.) je Liste/Ebene wählen | — | **Fehlt in der UI.** Format ist fest: pro Ebene zyklisch decimal/lowerLetter/lowerRoman im DOCX-Export (`styleDefs.ts:44-48`), im ODT-Export nur `style:num-format="1"` auf Ebene 1 (`styleRegistry.ts:101`) | Backlog `eigenes-nummernformat` = „fehlt", P4 (nice-to-have). Falls nicht gebaut, ausdrücklich als bewusst nicht unterstützt dokumentieren (kein stiller Fehlschlag, Hauptspez. Abschnitt 20) |
| 9 | Automatische Umwandlung durch Tippen („1. " am Zeilenanfang + Leerzeichen) | Editor, Input Rules | **Fehlt vollständig** — im gesamten Projekt existieren keinerlei ProseMirror-`InputRule`s | Nice-to-have; falls nicht umgesetzt, explizit als bewusst nicht unterstützt dokumentieren |
| 10 | Tastatur-Bedienbarkeit des Buttons selbst (Tab-Fokus + Enter/Leertaste, ohne Maus) | `Toolbar.tsx:252-262`, Handler ausschließlich auf `onMouseDown` (kein `onClick`) | Nicht verifiziert, ob ein per Tab fokussierter `<button>` bei Aktivierung per Enter/Leertaste tatsächlich ein `mousedown`-Ereignis auslöst (browserabhängig; bei reinem Enter i. d. R. **nicht**) | Browserübergreifend prüfen — betrifft strukturell **alle** Toolbar-Buttons dieser Codebasis identisch, ist hier aber für die Listen-Gruppe explizit zu verifizieren |
| 11 | Symbol des Buttons „1. Liste" | `Toolbar.tsx:261`, Text „1. Liste" | Reiner Text (kein Emoji/SVG-Risiko wie bei Bild-/Tabellen-Button) | In Ordnung so; auf Konsistenz mit einer eventuellen künftigen SVG-Icon-Umstellung der übrigen Toolbar prüfen (Hauptspez. Abschnitt 20.1) |
| 12 | Kontextmenü (Rechtsklick) → „Nummerierung" | — | Nicht vorhanden | Kein Kontextmenü-Eintrag; als fehlend dokumentieren, nicht Teil dieser Anforderung |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Liste erstellen
- Cursor in einem oder mehreren markierten Absätzen, Klick auf „1. Liste" → jeder
  markierte Absatz wird zu einem eigenen Punkt derselben nummerierten Liste.
- Funktioniert sowohl bei reiner Cursor-Position (kein markierter Text) — dann nur der
  aktuelle Absatz wird zur Liste — als auch bei einer Mehrfachauswahl über mehrere
  Absätze hinweg.
- Angewendet auf eine bereits vorhandene Aufzählungsliste (Bullet) wandelt sie diese in
  eine nummerierte Liste um (siehe 2.7), **nicht** in eine verschachtelte
  Liste-in-Liste.
- Neue Liste beginnt bei „1." (bzw. bei einem tiefen-abhängigen Format auf Unterebenen,
  siehe 2.4), sofern nicht ausdrücklich ein anderer Startwert gewählt (2.5, Element 6)
  oder eine Fortsetzung eingestellt wurde (2.5, Element 7).

### 2.2 Nummerierung ist automatisch und fortlaufend
- Die angezeigte Nummer wird nie manuell eingegeben, sondern vom Editor/Renderer
  berechnet und bei jeder Änderung (Punkt einfügen, löschen, verschieben, Ebene wechseln)
  sofort neu dargestellt.
- **Grundvoraussetzung, zuerst zu verifizieren (aktuell nach Code-Lage konkret gefährdet):**
  Die berechnete Nummer muss im Editor überhaupt **sichtbar** gerendert werden. Tailwind v4
  ist über `@import 'tailwindcss'` (`src/index.css:1`) inkl. Preflight aktiv; Preflight
  setzt global `ol, ul, menu { list-style: none; }`. Die einzige projekteigene Listenregel
  `.ProseMirror ul, .ProseMirror ol` (`src/index.css:63-67`) setzt **nur** `padding-left`
  und `margin`, **kein** `list-style-type`/`list-style-position` — der Reset wird also nie
  zurückgenommen. Unabhängig gegengeprüfte Fundstelle des Resets selbst:
  `node_modules/tailwindcss/preflight.css:197-200` (`ol, ul, menu { list-style: none; }`).
  Nach Code-Lage ist damit **im Editor kein Nummernmarker sichtbar**
  (Aufzählungszeichen ebenso). Für ein Feature namens „Nummerierte Liste" wäre das der
  schwerwiegendste denkbare Befund und ist deshalb **als Allererstes visuell (Screenshot)
  zu bestätigen bzw. zu beheben**, noch vor allen Verschachtelungs-/Rundreise-Feinheiten.
  Erst eine `list-style-type`-Regel auf `.ProseMirror ol`/`ul` (siehe Ebenenformat 2.4)
  stellt den Marker wieder her; die Rundreise-/Export-Nummerierung (OOXML/ODF) ist davon
  unberührt und darf nicht mit der reinen Editor-Darstellung verwechselt werden (siehe
  Ist-Stand-Punkt 5.13).
- Einfügen eines neuen Punkts in der Mitte einer Liste verschiebt alle nachfolgenden
  Nummern korrekt um eins.
- Löschen eines Punkts in der Mitte schließt die Nummerierungslücke automatisch.
- Anders als bei der Aufzählungsliste (statisches „•") ist dieser Zählwert das
  charakteristische Merkmal dieses Features — jede Rundreise-Prüfung muss deshalb nicht
  nur „ist noch eine Liste", sondern „hat die erwartete Nummernfolge/den erwarteten
  Startwert" prüfen.

### 2.3 Enter-Verhalten
- Enter am Ende eines nicht-leeren Listenpunkts → neuer Listenpunkt auf derselben Ebene,
  fortlaufend nummeriert (`Enter: splitListItem(wordSchema.nodes.list_item)`,
  `WordEditor.tsx:96`).
- Enter am Ende eines **leeren** Listenpunkts beendet die Liste an dieser Stelle (Punkt
  wird zu einem normalen Absatz), statt einen weiteren leeren nummerierten Punkt zu
  erzeugen. Dieses Verhalten entsteht aus dem Zusammenspiel zweier Keymap-Plugins:
  `splitListItem` gibt für den leeren Endpunkt `false` zurück, woraufhin die
  `baseKeymap`-Kette (`WordEditor.tsx:108`) den leeren Block per `liftEmptyBlock` aus der
  Liste hebt. Es ist **keine** projekteigene Logik und muss trotzdem mit einem echten
  Testfall nachgewiesen, nicht aus der Bibliotheksdoku angenommen werden.
- Enter in der Mitte eines Listenpunkts (Cursor zwischen Text) teilt den Text korrekt auf
  zwei aufeinanderfolgende Listenpunkte auf, ohne Textverlust.
- Umschalt+Enter innerhalb eines Listenpunkts erzeugt einen Zeilenumbruch (`hard_break`)
  **innerhalb** desselben nummerierten Punkts (kein neuer, eigens nummerierter Punkt).
  `Shift-Enter` ist zu `insertHardBreak()` gebunden (`WordEditor.tsx:97`) — dieses
  Element existiert also, muss aber im Listenkontext eigens getestet werden (Abgrenzung
  zu `splitListItem`).

### 2.4 Mehrstufige Listen (Einrücken/Ausrücken)
- **Soll:** Tab am Anfang einer Zeile innerhalb der Liste rückt diese Zeile eine Ebene
  tiefer ein (Unterpunkt der vorherigen Zeile) und stellt das Nummerierungsformat gemäß
  Ebene um (Konvention: Ebene 1 „1., 2., 3.", Ebene 2 „a., b., c.", Ebene 3 „i., ii.,
  iii." — mindestens muss die Unterebene unabhängig von der Elternebene fortlaufend und
  optisch unterscheidbar sein). Umschalt+Tab rückt eine Ebene aus.
- **Aktuell nicht im Editor erzeugbar:** Es existiert weder eine Tastenkombination noch
  eine Toolbar-Aktion zum Ändern der Ebene (Abschnitt 1, Element 5). Das Schema selbst
  erlaubt Verschachtelung bereits (`list_item.content = 'block+'`, `schema.ts:146-152`;
  `ordered_list`/`bullet_list` gehören zur Gruppe `block`), aber ohne UI-Weg kann im
  Editor **keine** mehrstufige Liste angelegt werden.
- **Import/Export sind für Verschachtelung dagegen bereits gebaut** (siehe Korrektur oben
  und Abschnitt 5, Punkt 1): Der einzige Weg, wie eine mehrstufige nummerierte Liste
  aktuell in den Editor gelangt, ist der **Import** einer Fremddatei (DOCX über
  `w:ilvl`; ODT über verschachtelte `<text:list>`) oder Paste von entsprechendem HTML.
  Beide Wege müssen einzeln geprüft werden (Editor kann so etwas empfangen und wieder
  exportieren, aber nicht selbst erzeugen).
- Ein-/Ausrücken (sobald gebaut) darf die Nummerierung der Geschwister-Ebenen nicht
  durcheinanderbringen.
- Mindestens 4 Ebenen tief müssen zuverlässig funktionieren; reale Testdateien mit ~10
  Ebenen existieren im Fixture-Korpus (`tests/fixtures/external/odt/listLevel10.odt`,
  siehe 4.2). Ab welcher Tiefe ein eigenes Format vs. Wiederholung greift, ist zu
  dokumentieren: DOCX definiert 9 Ebenen und klemmt tiefere auf Ebene 8
  (`docx/writer.ts:103,135`, `docx/styleDefs.ts:43-73`); ODT definiert bislang nur
  Ebene 1 formal (`styleRegistry.ts:98-103`), tiefere Ebenen erben kein eigenes
  Zahlenformat — das ist eine reale, zu dokumentierende bzw. zu behebende Grenze.

### 2.5 Nummerierung fortsetzen, neu starten oder mit beliebigem Startwert beginnen
- Eine zweite, inhaltlich eigenständige nummerierte Liste (z. B. durch dazwischenliegenden
  normalen Text getrennt) muss standardmäßig bei „1." **neu** beginnen.
- Es muss möglich sein, eine Liste bewusst **fortzusetzen** (Nummerierung einer
  vorherigen, gleichartigen Liste weiterzählen, z. B. Liste geht bei „4." weiter).
- Es muss möglich sein, eine Liste bewusst mit einem **beliebigen Startwert** beginnen zu
  lassen (z. B. bei „5." starten), unabhängig von einer vorherigen Liste.
- Alle drei Fälle (neu starten / fortsetzen / beliebiger Start) müssen die Rundreise für
  DOCX **und** ODT überstehen. **Aktuell ist keiner dieser Fälle exportierbar** (siehe
  Abschnitt 5, Punkte 6 und 7): Der Startwert wird verworfen, und eine
  Fortsetzungs-/Neustart-Angabe existiert im Datenmodell gar nicht.

### 2.6 Liste aufheben
- Markierte Listenpunkte (oder Cursor in einem Punkt) → Klick auf „⇧ Liste" wandelt die
  betroffenen Punkte in normale Absätze um; der Text bleibt vollständig erhalten, nur
  Nummer/Einzug verschwinden.
- Bei einer mehrstufigen Liste: `liftFromList()` = `liftListItem` (`commands.ts:62-64`)
  hebt laut Bibliotheksverhalten **eine** Ebene pro Aufruf an (erst auf der obersten
  Ebene wird der Punkt zum normalen Absatz) — das entspricht der Word-Konvention und ist
  **zu verifizieren, nicht anzunehmen** (Fixture-basiert, da im Editor keine
  Mehrstufigkeit erzeugbar ist). Genaues Verhalten dokumentieren (vgl.
  `liste-aufheben-req.md`).

### 2.7 Wechsel zwischen Aufzählung und Nummerierung
- Eine bestehende Aufzählungsliste per Klick auf „1. Liste" in eine nummerierte Liste
  umwandeln (und umgekehrt) — Text und Reihenfolge bleiben erhalten, nur das
  Darstellungsformat wechselt. Es darf **keine** verschachtelte Liste-in-Liste entstehen.
- **Konkreter, im Bibliothekscode begründeter Verdacht (nicht bloße Vermutung):**
  `toggleList` (`commands.ts:57-60`) ruft ausnahmslos `wrapInList` auf; es fehlt jede
  vorgeschaltete Prüfung „ist die Selektion bereits vollständig eine Liste (dieses oder
  des anderen Typs)?". Anders als `toggleMark` bei Fett/Kursiv ist dies **kein** echtes
  Toggle. Laut `prosemirror-schema-list` (`wrapRangeInList`) führt ein erneuter Klick auf
  „1. Liste" bei bereits aktiver Liste je nach Cursor-Position entweder zu einem stillen
  No-Op (Cursor im ersten Punkt) oder zu einer **ungewollten Verschachtelung** (Cursor in
  einem späteren Punkt) — beides muss mit echter Browser-Bedienung nachgestellt und das
  tatsächliche, sichtbare Ergebnis dokumentiert werden (siehe Grenzfälle 3.2–3.4). Da
  Bullet und Ordered denselben Content-Ausdruck haben, gilt dieselbe Analyse wie in
  `aufzaehlungsliste-req.md` Abschnitt 2.6.

### 2.8 Zusammenspiel mit anderen Features
- Zeichenformatierung (fett, kursiv, Farbe, …) innerhalb eines Listenpunkts funktioniert
  identisch zu einem normalen Absatz (Hauptspez. Abschnitt 3).
- Absatzausrichtung eines einzelnen Listenpunkts (links/zentriert/rechts/Blocksatz)
  bleibt individuell einstellbar und wird bei Rundreise nicht auf den Listen-Standard
  zurückgesetzt.
- Eine nummerierte Liste **innerhalb einer Tabellenzelle** muss möglich sein und bei
  Rundreise erhalten bleiben. **Konkreter, schwerwiegender Befund (DOCX):** Der
  DOCX-Import zerstört diese Struktur — `parseTable` baut Zelleninhalt über
  `childElements(tcEl, …, 'p').flatMap(paragraphToBlocks)` (`docx/reader.ts:337-339`),
  **ohne** `listMarkerFor`/`groupLists` aufzurufen; ein Absatz mit `w:numPr` in einer
  Zelle wird dadurch als **gewöhnlicher Absatz** importiert, die gesamte Listenstruktur
  (Nummerierung **und** Aufzählung) geht verloren. Der DOCX-**Export** einer im Editor
  vorhandenen Liste-in-Zelle funktioniert dagegen (generischer `blockToDocx`-Aufruf,
  `docx/writer.ts:189`) — die Asymmetrie bedeutet: exportieren ok, reimportieren
  zerstört. Der ODT-Pfad ist hier korrekt (Zellinhalt läuft über `elementToBlocks`,
  `odt/reader.ts:307`), muss aber ebenfalls getestet werden. Reale Fixtures:
  `listsInTable.odt`, `simple-table-with-lists.odt` (siehe 4.2).
- Undo/Redo: Jede der obigen Aktionen (Liste erstellen, aufheben, Formatwechsel,
  einfügen davor/danach) muss einzeln rückgängig/wiederherstellbar sein — Listenbedienung
  ist ein Verdachtsfall für den in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 dokumentierten
  Selection-Sync-Bug, da Toolbar-Klick + anschließende Cursor-Neupositionierung genau
  dessen Muster entspricht.
- Ein Bild oder eine Tabelle als zusätzlicher Block **innerhalb** eines Listenpunkts
  (mehrere Blöcke pro Punkt) ist schema-seitig zulässig (`list_item.content = 'block+'`,
  `schema.ts:146-152`) — beim Import einer Fremddatei darf das nicht zu Datenverlust
  führen. Reale Fixture: `tests/fixtures/external/odt/imageWithinList.odt`.

### 2.9 Kein stiller Fehlschlag
- Jede Listenaktion, die aus irgendeinem Grund nicht ausgeführt werden kann (Button-Klick
  ohne passenden Kontext, erneutes Toggle im No-Op-Fall aus 2.7, „Liste aufheben" ohne
  dass der Cursor in einer Liste steht), muss eine sichtbare Rückmeldung erzeugen oder
  über einen erkennbaren Button-Zustand (`aria-pressed`/`aria-disabled`) begründet sein —
  nie ein Klick, der einfach wirkungslos bleibt (Hauptspez. Abschnitt 20.4).

---

## 3. Grenzfälle

1. **Leere Liste**: Liste erstellen und sofort wieder aufheben, ohne je Text einzugeben →
   kein verwaistes leeres `ordered_list`/`list_item`-Element im Dokumentmodell, kein
   Crash.
2. **Einzelner Listenpunkt, erneuter Klick auf „1. Liste"**: Liste mit genau einem Punkt,
   Cursor darin, nochmals „1. Liste" → laut `wrapRangeInList` ist dieser Punkt zugleich
   der „erste" der Liste → erwartetes Ergebnis ist ein **stiller No-Op**. Widerspricht dem
   Prinzip „kein stiller Fehlschlag" (2.9) und muss entweder als akzeptierte Ausnahme
   dokumentiert oder durch ein echtes Toggle (2.7) behoben werden.
3. **Zweiter oder späterer Listenpunkt, erneuter Klick auf „1. Liste"** (Liste mit ≥ 2
   Punkten, Cursor im zweiten oder späteren Punkt): laut Codeanalyse (2.7) potenziell
   **Verschachtelung** statt No-Op — tatsächliches, sichtbares Ergebnis nachstellen und
   dokumentieren.
4. **Vollständige Selektion einer ganzen nummerierten Liste, erneuter Klick auf „1.
   Liste"**: zu prüfen, ob dies zu einer weiteren umschließenden Verschachtelungsebene
   oder zu einem No-Op führt.
5. **Zwei unmittelbar aufeinanderfolgende, aber inhaltlich getrennte nummerierte Listen
   ohne trennenden Absatz** (z. B. durch Copy-Paste zweier Listen hintereinander): Müssen
   als zwei getrennte Listen mit je eigenem Start („1., 2." / „1., 2.") erkennbar bleiben
   und dürfen bei Rundreise **nicht** zu einer durchlaufenden Liste („1.–4.")
   verschmelzen. **Konkreter, bestätigter Verdacht (DOCX-spezifisch):** Der DOCX-Export
   vergibt für **jede** nummerierte Liste dieselbe feste `ORDERED_NUM_ID = 2`
   (`docx/styleDefs.ts:35`, `docx/writer.ts:136`); der Reimport gruppiert rein nach
   `numId`+`ilvl` (`groupLists`, `docx/reader.ts:379-440`). Zwei benachbarte,
   getrennt gemeinte Listen ohne trennenden Nicht-Listen-Absatz erhalten dadurch beim
   Export identische, unmittelbar aufeinanderfolgende `w:numId="2"`/`w:ilvl="0"`-Absätze
   und verschmelzen beim Reimport zu **einer** Liste. Der Fall **mit** trennendem Absatz
   ist bereits durch einen Unit-Test abgedeckt (`docx/__tests__/roundtrip.test.ts:167-176`,
   nur Bullet), der Fall **ohne** Trenner **nicht**. Auf der ODT-Seite bleiben zwei
   `<text:list>`-Elemente strukturell getrennt (jedes wird als eigener Listenknoten
   gelesen, `odt/reader.ts:286-299`) — trotzdem eigens testen, da es dafür bislang gar
   keinen Test gibt.
6. **Sehr tiefe Verschachtelung** (mehr als 4 Ebenen, bis ~10 Ebenen wie in
   `listLevel10.odt`) → kein Absturz, keine Endlosschleife, sinnvolle visuelle Grenze
   (DOCX klemmt auf Ebene 8, `docx/writer.ts:135`; ODT-Ebenenformat jenseits Ebene 1
   ist derzeit undefiniert, siehe 2.4 — Ergebnis dokumentieren/beheben).
7. **Startwert ungleich 1** (z. B. Liste beginnt bewusst bei „5."): Im Editor korrekt
   dargestellt (`<ol start="5">`, `schema.ts:135`), aber **bei der Rundreise verloren** —
   der Export liest `node.attrs.start` weder für DOCX noch für ODT aus (siehe 5, Punkt 6).
   Muss geprüft und behoben werden.
8. **Copy-Paste eines Listenpunkts aus einer anderen Liste** (z. B. aus einer
   Bullet-Liste in eine nummerierte hinein) → Zielformat (Nummerierung) setzt sich durch,
   kein Bruch der Zielliste in zwei Teile.
9. **Copy-Paste von nummeriertem Listentext aus einer externen Quelle** (Word/LibreOffice)
   → wird sinnvoll als Liste erkannt oder zumindest als Klartext ohne Verlust übernommen
   (Hauptspez. Abschnitt 2 zu externem Paste).
10. **Undo unmittelbar nach Listenerstellung** (ein Schritt zurück) → stellt exakt den
    Zustand vor der Umwandlung wieder her (normale Absätze, keine Reste der
    Listenstruktur).
11. **Liste am Dokumentanfang bzw. -ende** → weiterhin normal editierbar; Cursor
    davor/danach positionierbar, neuer Absatz einfügbar; Enter am Ende des letzten
    nicht-leeren Punkts erzeugt weiterhin einen neuen Punkt.
12. **Liste mit Sonderzeichen/Umlauten im Text** eines Punkts → kein Effekt auf
    Nummerierung, Text bleibt zeichengetreu erhalten.
13. **Sehr lange Liste** (> 50 Punkte) → Nummerierung bleibt performant korrekt, kein
    spürbares Einfrieren beim Tippen in einem späten Punkt.
14. **Nummerierte Liste über einen manuellen Seitenumbruch hinweg** → Nummerierung läuft
    über die Seitengrenze korrekt weiter.
15. **Nummerierte Liste in einer Tabellenzelle** (siehe 2.8) → Rundreise erhält sowohl
    Zellzuordnung als auch Listenstruktur. **Bekannter DOCX-Import-Verlust** —
    dedizierter Testfall, der genau diese Struktur prüft (nicht nur „Zelle enthält Text").
16. **Reale Fremddatei mit „unordentlicher" Nummerierungs-Definition** (numId nicht
    aufsteigend, Ebenen-/Start-Überschreibungen) → importierbar bleiben, mindestens Text
    und Grundnummerierung ohne Absturz. Fixtures `NumberingWithOutOfOrderId.docx`,
    `NumberingWOverrides.docx` (siehe 4.2). Hinweis: `parseNumberingXml`
    (`docx/reader.ts:78-98`) liest je `abstractNum` nur das **erste** `<w:lvl>` und
    ordnet dessen Format der gesamten `numId` zu — pro-Ebene-Formate,
    `w:start`/`w:startOverride` werden nicht ausgewertet; Auswirkung mit diesen Fixtures
    prüfen.
17. **ODT-Datei, deren nummerierter Listenstil nur in `styles.xml` (statt in `content.xml`)
    definiert ist** → wird derzeit fälschlich als **Aufzählungsliste** importiert, weil
    `readOdt` die Listenstile aus `styles.xml` nur für Kopf-/Fußzeile auflöst, nie für den
    Textkörper (`odt/reader.ts:363-388`), und `elementToBlocks` dann auf `|| 'bullet'`
    zurückfällt (`odt/reader.ts:288`). „Falscher Positiv" speziell für dieses Feature (die
    Nummerierung wird zur Aufzählung degradiert). Fixtures `listStyleId.odt`,
    `ListStyleResolution.odt`.
18. **ODT-Datei mit `<text:list-header>`** (unnummerierte Kopfzeile am Listenanfang) → ihr
    Text darf nicht verschwinden. Aktuell sammelt der `text:list`-Zweig nur
    `list-item`-Kinder (`odt/reader.ts:289`), `list-header` wird ignoriert → **echter
    Textverlust**. Fixtures `ListHeading.odt`, `ListHeading2.odt`.
19. **Datei mit bekannt abweichendem/„kaputtem" Listen-Markup** (`brokenList.odt`,
    `ListOddity.odt`) → definierter Fallback statt stillem Datenverlust oder Absturz
    (Hauptspez. Abschnitt 18). Hinweis: `brokenList.odt` ist unter Vitest/jsdom aus
    Performancegründen ausgeschlossen und nur über E2E abgedeckt
    (`odt/__tests__/external-fixtures.test.ts:12-17`) — prüfen, ob dieser E2E-Test die
    **Listenstruktur** inhaltlich verifiziert oder nur „stürzt nicht ab".
20. **`text:list-item` ohne führenden Absatz** (erstes Kind ist direkt eine verschachtelte
    `<text:list>`): Dank `list_item.content = 'block+'` (`schema.ts:146-152`, bewusst
    **nicht** `paragraph block*`) und des Fallbacks auf einen leeren Absatz bei sonst
    leerem Item (`odt/reader.ts:296`) ist dies schema-gültig und importierbar — der früher
    befürchtete „weiße Seite / Schema-Exception"-Fall ist damit **konstruktiv
    ausgeschlossen**; trotzdem mit `listLevel10.odt`/`EasyList*.odt` bestätigen.

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede der folgenden Kombinationen gilt: **Datei/Zustand A → unverändert exportieren →
Ergebnis erneut importieren → Inhalt entspricht A** (Nummerierungstyp, Reihenfolge, Ebene,
Startwert je nach Grenzfall). „Unverändert exportieren" bedeutet: Datei wird hochgeladen
bzw. im Editor erzeugt und **ohne jede Bearbeitung** direkt wieder exportiert — dies deckt
reine Lese-/Schreib-Symmetriefehler auf, die bei aktiver Bearbeitung verdeckt bleiben
könnten. Wo eine der unten geforderten Eigenschaften laut Abschnitt 5 aktuell **nicht**
rundreisefähig ist (Startwert, Fortsetzen/Neustart, Liste-in-DOCX-Zelle), ist der Test
trotzdem zu schreiben und muss nach der Behebung grün sein — bis dahin dokumentiert er die
offene Lücke, statt sie zu überspringen.

### 4.1 Im Editor selbst erzeugte Zustände
1. Einfache einstufige nummerierte Liste (3 Punkte) → DOCX-Export → Reimport → 3 Punkte,
   korrekte Reihenfolge, weiterhin als `ordered_list` erkennbar (nicht als Bullet-Liste
   oder Klartext). Validierung zusätzlich per **unabhängigem** XML-Blick: jeder Absatz
   trägt `<w:numPr>` mit `<w:ilvl w:val="0"/>` und einer `<w:numId>`, deren zugehöriger
   `<w:abstractNum>` in `numbering.xml` auf Ebene 0 `<w:numFmt w:val="decimal"/>` definiert.
   **Bewusst nicht** über den konkreten `numId`-Zahlenwert zusichern: heute ist er fest `2`
   (`ORDERED_NUM_ID`), doch der Fix „numId je Top-Level-Liste" (Abschnitt 5, Punkt 4 zur
   Verschmelzungs-Vermeidung, Grenzfall 3.5) macht ihn dynamisch — der Test muss die
   `numId`→`abstractNum`→`decimal`-Kette auflösen, nicht die Zahl `2` festnageln.
2. Dasselbe als ODT: `content.xml` enthält `<text:list text:style-name="LO">` mit drei
   `<text:list-item>`, `automatic-styles` enthält `<text:list-style style:name="LO">` mit
   `<text:list-level-style-number>`.
3. Nummerierte Liste mit Fett/Kursiv/Farbe im Text → Rundreise erhält Zeichenformatierung
   zusätzlich zur Listenstruktur, DOCX **und** ODT.
4. Nummerierte Liste mit einzeln unterschiedlich ausgerichteten Punkten → Ausrichtung je
   Punkt bleibt erhalten, DOCX **und** ODT.
5. Nummerierte Liste mit individuellem Startwert (≠ 1) → Rundreise DOCX und ODT. **(Aktuell
   erwartet fehlschlagend — siehe 5, Punkt 6.)**
6. Fortgesetzte vs. neu gestartete Liste (2.5) → Rundreise DOCX und ODT. **(Aktuell
   erwartet fehlschlagend — siehe 5, Punkt 7.)**
7. Zwei getrennte nummerierte Listen **ohne** trennenden Absatz (Grenzfall 3.5) →
   Rundreise DOCX und ODT, beide bleiben getrennt.
8. Nummerierte Liste innerhalb einer Tabellenzelle → Rundreise DOCX und ODT. **(DOCX
   aktuell erwartet fehlschlagend beim Import — siehe 2.8 / 5, Punkt 5.)**
9. Mehrstufige nummerierte Liste (mind. 3 Ebenen) — sofern über eine importierte Datei
   bereitgestellt (im Editor mangels UI nicht erzeugbar) — Rundreise DOCX und ODT: Ebenen
   bleiben erhalten. Der einfache Zwei-Ebenen-Fall ist bereits als Unit-Test grün
   (`docx/__tests__/roundtrip.test.ts:178-204`, `odt/__tests__/roundtrip.test.ts:169-194`,
   bislang nur Bullet) — um einen **Ordered**-Mehrebenenfall erweitern.
10. Cross-Format: im Editor erzeugte nummerierte Liste als ODT exportieren, reimportieren,
    als DOCX exportieren, reimportieren (doppelte Rundreise) → Nummerierungsstruktur bleibt
    inhaltlich identisch (reine Optik-Verluste dokumentieren, Strukturverlust nicht).

### 4.2 Import realer Fremddateien (bereits im Repository vorhandene Testfixtures)
Diese Dateien liegen unter `tests/fixtures/external/docx/` bzw.
`tests/fixtures/external/odt/` (Existenz für dieses Dokument einzeln verifiziert) und
müssen für die Verifikation verwendet werden — nicht nur selbst konstruierte
Minimalbeispiele:

- **DOCX, Kern für Nummerierung:** `ComplexNumberedLists.docx` (mehrstufige nummerierte
  Listen, Kernfixture für 2.4/3.6), `Numbering.docx` (reguläre Nummerierung),
  `NumberingWithOutOfOrderId.docx` und `NumberingWOverrides.docx` (unordentliche
  numId-Reihenfolge bzw. Ebenen-/Start-Überschreibungen, Grenzfall 3.16).
- **ODT, Nummerierung/Struktur:** `ContinueListTest.odt` (Fortsetzen, 2.5),
  `listLevel10.odt` (sehr tiefe Verschachtelung, 3.6), `ListRoundtrip.odt` (expliziter
  Rundreise-Fall), `sample_numbering_DOC_LO41.odt` (LibreOffice-4.1-Export einer
  nummerierten Liste; per Quellcode-Suche bestätigt bislang in **keinem** Test
  referenziert, daher gezielt als eigener Nummerierungs-Testfall aufzunehmen),
  `listStyleId.odt` und `ListStyleResolution.odt` (Stilauflösung über Referenz/`styles.xml`,
  Grenzfall 3.17),
  `ListHeading.odt` und `ListHeading2.odt` (Listen-Kopfzeile, Grenzfall 3.18),
  `listsInTable.odt` und `simple-table-with-lists.odt` (Liste in Tabellenzelle, 2.8),
  `imageWithinList.odt` (Block innerhalb eines Punkts, 2.8), `brokenList.odt` und
  `ListOddity.odt` (abweichendes Markup, Grenzfall 3.19).
- **ODT, Basisabdeckung (Bullet/gemischt):** `EasyList.odt`,
  `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`,
  `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt`, `feature_bullets_numbering.odt`,
  `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`,
  `simple_bullet_list_1_pre_OX.odt`, `simple-list_MSO14.odt`, `simpleList.odt`,
  `simpleList3.odt`, `preparedList.odt`, `liste2.odt`, `list.odt`,
  `ListTest_AO_MSO15-where_is-blue.odt` — jede mindestens ohne Absturz/Textverlust
  importierbar; für jede: Import → unverändert exportieren → Reimport → Textinhalt jedes
  Listenpunkts identisch zum ersten Import.

**Vorgabe:** Für jede oben genannte Fixture ist mindestens ein automatisierter Test
erforderlich, der (a) den Import ohne Absturz/Datenverlust prüft und (b) die Rundreise auf
inhaltliche Gleichheit prüft. Die vorhandenen generischen Fixture-Tests prüfen bislang
**nur** „Import stürzt nicht ab" (`odt/__tests__/external-fixtures.test.ts:46-61`, analog
DOCX) — **keine** inhaltliche Listenstruktur; das genügt für die Abnahme nicht.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer direkten Durchsicht des aktuellen Quellcodes (Stand
dieser Spezifikation) mit dateigenauen Fundstellen. Sie sind als **verhaltensseitig zu
bestätigende bzw. zu behebende** Punkte zu verstehen — Code-Lesen ersetzt nicht den echten
Browser-/Rundreise-Nachweis, gibt ihm aber gezielte Ansatzpunkte (analog Hauptspez.
Abschnitt 17).

1. **Verschachtelung ist auf Datenmodell-/Import-/Export-Ebene bereits implementiert (positiv,
   korrigiert die Vorfassung).** DOCX-Reader liest `w:ilvl` (`docx/reader.ts:294-302`) und
   rekonstruiert die Baumstruktur stack-basiert (`groupLists`, `docx/reader.ts:379-440`);
   DOCX-Writer schreibt wachsendes `w:ilvl` je Ebene (`docx/writer.ts:105-140`); 9 Ebenen
   sind in `numbering.xml` definiert (`docx/styleDefs.ts:43-73`). ODT-Reader/-Writer
   rundreisen verschachtelte `<text:list>` (`odt/reader.ts:286-299`,
   `odt/writer.ts:99-109`). Zwei-Ebenen-Rundreise ist als Unit-Test grün (beide Formate,
   bislang nur Bullet). → Verifikation muss dies für **Ordered** und für **≥ 3 Ebenen**
   bestätigen, nicht neu bauen.
2. **Kein UI-Weg, um Verschachtelung zu erzeugen.** Weder Tab/Umschalt+Tab noch ein
   Toolbar-Button ändert die Ebene; `sinkListItem` wird nirgends importiert
   (`commands.ts:2`; Keymap `WordEditor.tsx:85-107` ohne `Tab`). Mehrstufige Listen können
   damit nur **importiert**, nicht im Editor **erstellt** werden (2.4). Backlog
   `liste-einruecken-tab`/`mehrstufige-liste`.
3. **Nummerierte Liste in Tabellenzelle geht beim DOCX-Import komplett verloren.**
   `parseTable` (`docx/reader.ts:311-364`, insb. `337-339`) ruft für Zellabsätze
   `paragraphToBlocks` **ohne** `listMarkerFor`/`groupLists` auf → `w:numPr` wird ignoriert,
   die Liste wird zu gewöhnlichen Absätzen. Export (`docx/writer.ts:189`) und der gesamte
   ODT-Pfad (`odt/reader.ts:307`) sind korrekt — reine DOCX-Import-Asymmetrie, betrifft
   Anforderung 2.8 direkt. Gravierender als reiner Ebenenverlust.
4. **Nummerierungs-ID pro Listentyp global fix.** DOCX: `ORDERED_NUM_ID = 2`
   (`docx/styleDefs.ts:35`, verwendet in `docx/writer.ts:136`). ODT: `ORDERED_LIST_STYLE_NAME
   = 'LO'` (`odt/styleRegistry.ts:96`, verwendet in `odt/writer.ts:101`). Für DOCX führt das
   zum Verschmelzungsrisiko aus Grenzfall 3.5 (zwei benachbarte, getrennt gemeinte Listen
   ohne Trenner). Für ODT bleiben getrennte `<text:list>` strukturell getrennt, der geteilte
   Stilname ist unkritischer, aber unnötig.
5. **Startwert-Attribut wird beim Export verworfen und beim Import nie gesetzt.** Das Schema
   hat `ordered_list.attrs.start` (`schema.ts:124-137`) und rendert es im Editor korrekt.
   Aber: DOCX-Writer liest `node.attrs.start` nicht (`docx/writer.ts:114-118,136`),
   `numbering.xml` schreibt kein `w:start`/`w:startOverride` (`docx/styleDefs.ts:43-73`);
   DOCX-Reader erzeugt `ordered_list` ohne `attrs.start` (`docx/reader.ts:391`).
   ODT-Writer schreibt kein `text:start-value`, ODT-Reader liest keines
   (`odt/writer.ts:99-109`, `odt/reader.ts:286-299`). → Startwert ≠ 1 überlebt keine
   Rundreise (Grenzfall 3.7 / 4.1 Punkt 5).
6. **Keine „Nummerierung fortsetzen/neu starten"-Funktion.** Weder Datenmodell (kein
   Fortsetzungs-Attribut in `schema.ts`) noch Import/Export (`text:continue-numbering`,
   `w:startOverride` werden nirgends geschrieben/gelesen) bilden das ab. Backlog
   `nummerierung-fortsetzen-neustarten` = „teilweise" ist optimistisch; effektiv fehlt es
   (2.5 / 4.1 Punkt 6).
7. **ODT: Listenstile aus `styles.xml` werden für den Textkörper nicht aufgelöst.**
   `readOdt` (`odt/reader.ts:357-388`) nutzt `content.xml`-Automatikstile für den Body,
   lädt `styles.xml` aber **nur** für Kopf-/Fußzeile (`stylesForChrome`). Ein nummerierter
   Listenstil, der nur in `styles.xml` liegt, wird nicht gefunden → Fallback `|| 'bullet'`
   (`odt/reader.ts:288`) → die Nummerierung wird zur Aufzählung degradiert (Grenzfall 3.17).
8. **ODT: `<text:list-header>` wird beim Import ignoriert.** Der `text:list`-Zweig sammelt
   nur `list-item`-Kinder (`odt/reader.ts:289`); der Textinhalt einer Listen-Kopfzeile
   verschwindet ersatzlos — echter Textverlust (Grenzfall 3.18).
9. **`toggleList` ist kein echtes Toggle.** `commands.ts:57-60` ruft ausnahmslos
   `wrapInList`; erneuter Klick auf „1. Liste" bei aktiver Liste führt je nach
   Cursor-Position zu stillem No-Op oder ungewollter Verschachtelung (2.7, Grenzfälle
   3.2–3.4). Konkreter, im Bibliothekscode nachvollziehbarer Verdacht, nicht Bauchgefühl.
10. **Aktiver Zustand des Toolbar-Buttons fehlt.** „1. Liste" hat kein `aria-pressed`/
    `aria-label` (`Toolbar.tsx:252-262`), anders als Mark-/Align-/Tabelle-Buttons; es fehlt
    eine `isListActive`-Helferfunktion (Abschnitt 1, Element 4).
11. **ODT-Listentyp-Erkennung nur „grob".** `parseAutomaticStyles` klassifiziert einen
    Listenstil als „ordered", sobald **irgendeine** Ebene ein `list-level-style-number`
    enthält (`odt/reader.ts:70-75`) — nicht je Ebene. Bei Listen, die je Ebene Zahl/Bullet
    mischen, wird die gesamte Liste einheitlich eingeordnet. Als bekannte Einschränkung zu
    dokumentieren, sofern keine reale Fixture das Gegenteil erzwingt.
12. **Testabdeckung.** Vorhanden und grün: flache Bullet-Liste, Ordered-vs-Bullet-
    Unterscheidung, zwei Listen **mit** Trenner (nur DOCX,
    `docx/__tests__/roundtrip.test.ts:167-176`), Zwei-Ebenen-Verschachtelung (beide
    Formate, nur Bullet). **Fehlt komplett:** Ordered-Mehrebenen-Rundreise, Startwert,
    Fortsetzen/Neustart, zwei Listen **ohne** Trenner, Liste-in-Tabellenzelle, sämtliche
    realen Fixtures aus 4.2 mit **inhaltlichen** (nicht nur Crash-)Assertions, sowie jeder
    E2E-Test mit Listenbezug (`tests/e2e/*.spec.ts` enthält keinen).
13. **Nummernmarker im Editor nach Code-Lage unsichtbar (schwerster user-sichtbarer
    Verdacht).** Tailwind v4 ist über `@import 'tailwindcss'` (`src/index.css:1`) inkl.
    Preflight aktiv; Preflight setzt global `ol, ul, menu { list-style: none; }`
    (unabhängig gegengeprüft: `node_modules/tailwindcss/preflight.css:197-200`). Die
    einzige projekteigene Listenregel `.ProseMirror ul, .ProseMirror ol`
    (`src/index.css:63-67`) ergänzt nur `padding-left`/`margin`, aber **kein**
    `list-style-type`/`list-style-position` → der Reset bleibt bestehen, im Editor erscheint **kein** „1., 2.,
    3." (und kein Bullet). Betrifft die reine **Editor-Darstellung**, **nicht** den Export
    (OOXML/ODF tragen die Nummerierung als Feld, unabhängig vom Editor-CSS) — genau deshalb
    schlagen alle bisherigen Reader/Writer-Rundreise-Tests grün an, während die Nummer für
    die Nutzerin im Editor fehlt. Muss visuell (Screenshot) bestätigt und behoben werden
    (eine `list-style-type`-Regel je Ebene deckt zugleich 2.4/Grenzfall 3.6). DoD-relevant,
    da die Kernfunktion sonst für die Nutzerin faktisch fehlt, obwohl das Datenmodell stimmt.

**Einordnung:** Der Backlog-Status „vorhanden" trifft nach dieser Sichtung auf den
einfachen, einstufigen Fall im **Datenmodell** (Liste per Klick anlegen/aufheben, Ordered
von Bullet unterscheidbar) sowie — überraschend positiv — auf die **importierte**
Mehrstufigkeit zu. Er trifft jedoch **nicht** auf die für die Nutzerin sichtbare
Grundfunktion zu: Nach Code-Lage erscheint im Editor gar keine sichtbare Nummer (5.13). Nicht
erfüllt sind darüber hinaus: echtes Toggle (2.7), Ein-/Ausrücken über die UI (2.4),
Startwert-Rundreise (2.5), Fortsetzen/Neustart (2.5), Liste-in-DOCX-Zelle (2.8),
ODT-Stilauflösung und `list-header` (3.17/3.18) sowie der sichtbare aktive Button-Zustand
(1.4). Diese Punkte sind vor jeder Abnahme dediziert zu prüfen und ggf. nachzubauen.

---

## 6. Testfälle (Zusammenfassung, Pflichtumfang)

1. Liste erstellen — Cursor ohne Selektion; Selektion über mehrere Absätze — beide Wege per
   echtem Playwright-Klick auf „1. Liste".
2. Enter-Verhalten: nicht-leerer Punkt (neuer Punkt), leerer Punkt (beendet Liste), Cursor
   mittig (Split), Umschalt+Enter (Zeilenumbruch ohne neuen Punkt).
3. Erneuter Klick auf „1. Liste" bei aktiver Liste — am ersten Punkt, an einem späteren
   Punkt, bei Selektion der ganzen Liste (Grenzfälle 3.2–3.4) — tatsächliches Ergebnis
   dokumentieren.
4. Wechsel Bullet ↔ Ordered ohne Verschachtelung/Datenverlust (2.7, beide Richtungen).
5. Liste aufheben — einstufig und (fixture-basiert) mehrstufig; Text bleibt vollständig
   erhalten; auch „aufheben" ohne Cursor in einer Liste (No-Op sichtbar begründet).
6. Ein-/Ausrücken per Tab/Umschalt+Tab über mind. 3 Ebenen inkl. Format je Ebene (Funktion
   muss ggf. erst gebaut werden, 5/Punkt 2) — falls nicht gebaut: expliziter Test, der das
   Fehlen nachweist und im Bericht als offene Lücke markiert, statt still zu überspringen.
7. Startwert ≠ 1 setzen (UI muss ggf. erst gebaut werden) → Anzeige im Editor **und**
   Rundreise DOCX/ODT (Grenzfall 3.7).
8. Fortsetzen vs. neu starten (2.5) → Rundreise DOCX/ODT (Funktion muss ggf. erst gebaut
   werden).
9. Zusammenspiel: Zeichenformatierung, Ausrichtung je Punkt, Liste in Tabellenzelle
   (inkl. des DOCX-Import-Verlusts als expliziter Test), Bild als Block im Punkt
   (Fremddatei), Undo/Redo über gemischte Sequenzen inkl. Toolbar-Klick +
   Cursor-Neupositionierung (Selection-Sync-Regressionsmuster, Hauptspez. Abschnitt 2).
10. `aria-pressed`/aktiver Zustand des „1. Liste"-Buttons — Cursor in/außerhalb einer
    nummerierten Liste bewegen und sichtbaren Zustand prüfen (Funktion muss ggf. erst
    ergänzt werden).
11. Alle Grenzfälle aus Abschnitt 3 (1–20) einzeln als eigener Testfall.
12. Rundreise DOCX **und** ODT für jede im Editor erzeugbare Konfiguration (4.1, Punkte
    1–10), inkl. Validierung mit einem **unabhängigen** Parser/Schema (nicht nur dem
    projekteigenen Reader), analog Hauptspez. Abschnitt 19.
13. Import + Rundreise für jede reale Fixture aus 4.2 mit **inhaltlichen** Assertions
    (Listenstruktur, Ebenen, Text je Punkt) — kein Test gilt als abgeschlossen, solange
    nicht mindestens diese Dateien einbezogen sind.
14. **Vorbedingung, zuerst prüfen (2.2 / 5.13):** Nummernmarker-**Sichtbarkeit** im Editor —
    Liste per „1. Liste" anlegen und visuell (E2E-Screenshot oder berechneter
    `list-style-type` via `getComputedStyle`) bestätigen, dass tatsächlich „1., 2., 3."
    (bzw. je Ebene das erwartete Format) angezeigt wird und nicht durch den
    Tailwind-Preflight-Reset unterdrückt ist. Analog für Aufzählungszeichen.

---

## 7. Definition of Done

Das Feature „Nummerierte Liste" gilt erst dann als verifiziert und vertrauenswürdig, wenn:

- jeder Punkt aus Abschnitt 2 über echte Bedienung im Browser nachgewiesen ist (nicht nur
  über konstruierte Reader/Writer-Testdaten),
- jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite verbleibenden
  Test hat,
- die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
  gelisteten realen Fixtures mit inhaltlichen Assertions nachgewiesen ist,
- zu jedem Ist-Stand-Punkt aus Abschnitt 5 ein eindeutiges Ergebnis vorliegt (bestätigt und
  behoben / bestätigt und bewusst als bekannte Einschränkung dokumentiert / widerlegt) —
  insbesondere dürfen **Punkt 3** (Liste-in-DOCX-Zelle), **Punkt 5** (Startwert),
  **Punkt 7** (ODT-Stilauflösung), **Punkt 8** (`list-header`), **Punkt 9** (kein echtes
  Toggle) und **Punkt 13** (unsichtbarer Nummernmarker im Editor) nicht offen bleiben, da sie
  Datenverlust, die Kernbedienung bzw. die für die Nutzerin sichtbare Grundfunktion betreffen,
- die in Abschnitt 5, Punkt 12 festgestellte Abwesenheit von Ordered-Mehrebenen-,
  Startwert-, Fortsetzen-, Adjazenz-ohne-Trenner-, Zell- und E2E-Tests behoben ist,
- kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (Hauptspez. Abschnitt
  20: jede nicht ausführbare Aktion meldet sichtbar zurück oder ist über einen erkennbaren
  Button-Zustand begründet).

Erst nach Erfüllung aller Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)" auf „verifiziert" geändert werden.
