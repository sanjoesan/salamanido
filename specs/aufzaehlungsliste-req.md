# Anforderungsspezifikation: Feature „Aufzählungsliste (Bullet)"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 5 („Listen") von
`FEATURE-SPEC-DOCX-ODT.md` sowie den Backlog-Eintrag `aufzaehlungsliste` in
`specs/FEATURE-BACKLOG.md` (Abschnitt 2.6 „Listen", Beschreibung dort: „Wandelt
Absätze in eine unsortierte Liste um.", Priorität 1/essenziell) für den Teil
„Aufzählungsliste (Bullet)" und ersetzt dessen kurzen Stichpunkt durch eine
vollständige, einzeln abhakbare Anforderung inkl. Grenzfällen und Rundreise-Pflicht.
Es gilt weiterhin das Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: gemeinsamer
interner Editor (ProseMirror-Schema + Seitenansicht) für DOCX und ODT — jede
Anforderung unten muss für **beide** Formate gelten, sowohl beim Import einer
bestehenden Datei als auch beim Export einer im Editor erstellten/bearbeiteten Datei,
inklusive Rundreise (Datei A hochladen → unverändert exportieren → Ergebnis entspricht
inhaltlich A).

Geschwister-Dokument: `specs/nummerierte-liste-req.md` beschreibt das strukturell fast
identische Feature „Nummerierte Liste" (dieselbe Toolbar-Gruppe, derselbe
`toggleList`/`liftFromList`-Code). Wo Verhalten/Code identisch ist, wird hier darauf
verwiesen statt es zu duplizieren; wo es sich unterscheidet (insbesondere: Bullets
haben keinen Zählwert, aber ein Symbol; keine „fortsetzen/neu starten"-Frage; dafür
eine eigene Fehlerrichtung bei der ODT-Listentyp-Erkennung, siehe Abschnitt 3.7),
wird das explizit ausgeführt.

Backlog-Status laut Vorgabe: **„vorhanden" — gilt aktuell als nicht vertrauenswürdig,
muss vollständig verifiziert werden.** Dieses Dokument beschreibt sowohl den
Soll-Zustand als auch (Abschnitt 5) bereits durch Code-Sichtung auffindbare, konkrete
Verdachtsmomente, die die Verifikation gezielt bestätigen oder widerlegen muss.

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button „• Liste" (Aufzählung) | `src/formats/shared/editor/Toolbar.tsx:192-202`, Toolbar-Gruppe „Listen" | Reiner Textbutton, `onMouseDown` ruft `toggleList(false)` (`commands.ts:57-60`) → `wrapInList(wordSchema.nodes.bullet_list)` | Muss auf Absatz(en) **und** auf leerer Zeile funktionieren; siehe Abgrenzung zu 2.7 |
| 2 | Button „1. Liste" (Nummerierung) | `Toolbar.tsx:203-213` | vorhanden | eigene Spezifikation `nummerierte-liste-req.md`; hier nur relevant als Umschaltfall (Abschnitt 2.7) |
| 3 | Button „⇧ Liste" (Liste aufheben) | `Toolbar.tsx:214-224`, ruft `liftFromList()` (`commands.ts:62-64` → `liftListItem(wordSchema.nodes.list_item)`) | vorhanden | Muss auch bei (potenziell künftig) mehrstufigen Listen die korrekte Einzelebene anheben, nicht die ganze Liste in einem Schritt zerstören (siehe 3.10) |
| 4 | Aktiver Zustand des Buttons „• Liste" | `Toolbar.tsx:192-202` | **Kein `aria-pressed`, kein visuelles „aktiv"-Styling** — im Gegensatz zu `MarkButton` (`Toolbar.tsx:28-62`, Zeile 48 `aria-pressed={active}`) und `AlignButton` (`Toolbar.tsx:64-84`, Zeile 70) sowie dem Tabelle-Button (`Toolbar.tsx:231`, `aria-pressed={isInTable(view.state)}`) | Muss ergänzt werden: Cursor in einer Aufzählungsliste → Button zeigt sichtbar „aktiv" an, analog zu allen anderen Toggle-Buttons der Toolbar |
| 5 | Tastenkombination zum Ein-/Ausrücken (Tab / Umschalt+Tab) | Editor-Keymap, `WordEditor.tsx:71-79` | **Fehlt vollständig.** Weder `Tab` noch `Shift-Tab` ist in der Keymap gebunden; `sinkListItem` (aus `prosemirror-schema-list`, siehe `node_modules/prosemirror-schema-list/dist/index.js:265-287`) wird im gesamten Projekt **nirgends importiert**, auch nicht in `commands.ts` (dort nur `wrapInList`, `liftListItem` importiert, `commands.ts:2`) | Muss ergänzt werden: Tab am Zeilenanfang eines Listenpunkts rückt eine Ebene tiefer ein, Umschalt+Tab rückt aus; außerhalb einer Liste darf Tab keine Listenwirkung auslösen (Abgrenzung, siehe Hauptspezifikation Abschnitt 15) |
| 6 | Eigenes Aufzählungszeichen wählen (Symbol/Bild statt „•") | — | **Fehlt komplett**, sowohl UI als auch Datenmodell (`bullet_list`-Node in `schema.ts:74-81` hat **keine** Attribute, insbesondere kein Zeichen-/Symbol-Attribut) | Laut Backlog (`eigene-aufzaehlungszeichen`, Priorität 4) explizit „nice-to-have"; muss aber, falls nicht gebaut, als bewusst nicht unterstützt dokumentiert werden statt unklar zu bleiben |
| 7 | Automatische Umwandlung durch Tippen (z. B. „- " oder „* " am Zeilenanfang + Leerzeichen) | Editor, Input Rules | **Fehlt vollständig** — im gesamten Projekt existieren keine ProseMirror-`InputRule`s | Nice-to-have; falls nicht umgesetzt, muss das explizit als bewusst nicht unterstützt dokumentiert sein (kein stiller Fehlschlag, Hauptspezifikation Abschnitt 20) |
| 8 | Tastatur-Bedienbarkeit des Buttons selbst (Tab-Fokus + Enter/Space, ohne Maus) | `Toolbar.tsx:192-202`, Handler ausschließlich auf `onMouseDown` registriert (kein `onClick`) | Nicht verifiziert, ob ein per Tab fokussierter `<button>` bei Aktivierung per Enter/Leertaste tatsächlich ein `mousedown`-Ereignis auslöst (browserabhängig; bei reinem Enter i. d. R. **nicht**) | Muss browserübergreifend geprüft werden — betrifft strukturell **alle** Toolbar-Buttons dieser Codebasis identisch, ist hier aber erstmalig für die Listen-Gruppe explizit zu verifizieren |
| 9 | Symbol des Buttons | `Toolbar.tsx:198-202`, Text „• Liste" | Reiner Text inkl. echtem Bullet-Zeichen „•" (kein Emoji/SVG-Risiko wie bei Bild-/Tabellen-Button) | In Ordnung so; auf Konsistenz mit einer eventuellen künftigen SVG-Icon-Umstellung der übrigen Toolbar prüfen (Hauptspezifikation Abschnitt 20.1) |
| 10 | Kontextmenü (Rechtsklick) → „Aufzählung" | — | Nicht vorhanden | Kein Kontextmenü-Eintrag vorhanden; als fehlend dokumentieren, nicht Teil dieser Anforderung |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Liste erstellen
- Cursor in einem oder mehreren markierten Absätzen, Klick auf „• Liste" → jeder
  markierte Absatz wird zu einem eigenen Punkt derselben Aufzählungsliste.
- Funktioniert sowohl bei reiner Cursor-Position (kein markierter Text) — dann nur der
  aktuelle Absatz wird zur Liste — als auch bei einer Mehrfachauswahl über mehrere
  Absätze hinweg.
- Angewendet auf eine bereits vorhandene nummerierte Liste wandelt sie diese in eine
  Aufzählungsliste um (siehe 2.7), nicht in eine verschachtelte Liste-in-Liste.
- Jeder Punkt erhält dasselbe, feste Bullet-Symbol „•" (kein pro Punkt wählbares
  Zeichen, siehe Abschnitt 1, Zeile 6).

### 2.2 Das Bullet-Symbol ist statisch, nicht editierbar
- Anders als bei der nummerierten Liste gibt es keinen „Wert", der sich bei
  Einfügen/Löschen/Verschieben von Punkten automatisch neu berechnet — das Symbol ist
  für jeden Punkt identisch.
- Für DOCX wird das Symbol fest als `•` in `word/numbering.xml` hinterlegt
  (`src/formats/docx/styleDefs.ts:41`, `<w:lvlText w:val="•"/>`), für ODT ebenso fest
  als `text:bullet-char="•"` (`src/formats/odt/styleRegistry.ts:100`). Es gibt aktuell
  **keinen** Mechanismus, dieses Zeichen pro Dokument oder pro Liste zu ändern.
- Reale Fremddateien, die ein **anderes** Bullet-Zeichen verwenden (z. B. „○", „▪",
  „–"), müssen beim Import zumindest inhaltlich als Liste erkannt werden — das
  tatsächlich verwendete Fremd-Zeichen wird jedoch nicht übernommen: Der ODT-Reader
  bestimmt den Listentyp nur über „ist überhaupt ein Zahlenformat vorhanden ja/nein"
  (`src/formats/odt/reader.ts:72-73`), das konkrete Bullet-Zeichen selbst wird nicht
  ausgelesen. Das ist als bewusste Vereinfachung zu dokumentieren, nicht als
  unbemerkter Verlust.

### 2.3 Enter-Verhalten
- Enter am Ende eines nicht-leeren Listenpunkts → neuer Listenpunkt auf derselben
  Ebene.
- Enter am Ende eines **leeren** Listenpunkts beendet die Liste an dieser Stelle
  (Punkt wird zu einem normalen Absatz) statt einen weiteren leeren Punkt zu
  erzeugen. Dieses Verhalten kommt aus der Standardimplementierung von
  `splitListItem` (`WordEditor.tsx:75`, `node_modules/prosemirror-schema-list/dist/index.js:136-186`,
  Zeilen 144-176 behandeln exakt den „leerer Block am Ende"-Fall) — es ist **keine**
  projekteigene Logik, muss aber trotzdem mit einem echten Testfall in dieser App
  nachgewiesen werden, nicht nur unter Berufung auf die Bibliotheksdokumentation
  angenommen werden.
- Enter in der Mitte eines Listenpunkts (Cursor zwischen Text) teilt den Text korrekt
  auf zwei aufeinanderfolgende Listenpunkte auf, ohne Textverlust.
- Umschalt+Enter innerhalb eines Listenpunkts erzeugt einen Zeilenumbruch (`hard_break`)
  **innerhalb** desselben Punkts, keinen neuen Punkt.

### 2.4 Mehrstufige Listen (Einrücken/Ausrücken)
- Tab am Anfang einer Zeile innerhalb der Liste soll diese Zeile eine Ebene tiefer
  einrücken (Unterpunkt), Umschalt+Tab eine Ebene ausrücken.
- **Aktuell nicht bedienbar:** Es existiert weder Tastenkombination noch Toolbar-Aktion
  dafür (siehe Abschnitt 1, Zeile 5, und Abschnitt 5, Punkt 1). Das ProseMirror-Schema
  selbst würde eine Verschachtelung strukturell zulassen (`list_item`-Content ist
  `'paragraph block*'`, `schema.ts:98-104`, und `bullet_list` gehört zur Gruppe
  `'block'`, `schema.ts:74-81` — ein `bullet_list`-Knoten kann also als weiteres Kind
  eines `list_item` auftreten), aber ohne UI-Weg kann im Editor selbst **keine**
  mehrstufige Liste erzeugt werden.
- Der einzige Weg, wie überhaupt eine verschachtelte Aufzählungsliste in den Editor
  gelangen kann, ist der **Import einer Fremddatei** mit echter Verschachtelung
  (ODT, siehe 3.6) oder Copy-Paste von HTML mit `<ul><li><ul>…`. Beide Wege müssen
  einzeln geprüft werden (Editor kann so etwas empfangen, aber nicht selbst erzeugen).
- Mindestens 3–4 Ebenen tief müsste die Funktion (falls gebaut) zuverlässig
  funktionieren; reale Testdateien mit deutlich mehr Ebenen existieren bereits im
  Fixture-Korpus (`tests/fixtures/external/odt/listLevel10.odt`, siehe Abschnitt 4.2).

### 2.5 Liste aufheben
- Markierte Listenpunkte (oder Cursor in einem Punkt) → Klick auf „⇧ Liste" wandelt
  die betroffenen Punkte in normale Absätze um, Text bleibt vollständig erhalten,
  Bullet-Symbol verschwindet.
- Bei einer (aktuell nicht über die UI erzeugbaren, aber importierbaren) mehrstufigen
  Liste: Aufheben eines Punkts auf einer tieferen Ebene sollte zunächst nur eine Ebene
  anheben (Word-Konvention), nicht direkt in einen normalen Absatz springen — das
  tatsächliche Verhalten von `liftListItem` in diesem konkreten Fall ist zu
  verifizieren, nicht anzunehmen.

### 2.6 Wechsel zwischen Aufzählung und Nummerierung
- Eine bestehende nummerierte Liste per Klick auf „• Liste" in eine Aufzählungsliste
  umwandeln (und umgekehrt, siehe `nummerierte-liste-req.md` Abschnitt 2.7) — Text und
  Reihenfolge bleiben erhalten, nur das Symbol wechselt. Es darf **keine**
  verschachtelte Liste-in-Liste entstehen.
- **Konkreter, durch Lesen des Bibliothekscodes begründeter Verdacht (nicht nur
  Vermutung):** `toggleList` (`commands.ts:57-60`) ruft ausnahmslos `wrapInList` auf,
  es gibt **keine** vorgeschaltete Prüfung „ist die Selektion bereits vollständig eine
  Liste dieses Zieltyps? Dann stattdessen `liftListItem` aufrufen" — anders als z. B.
  `toggleMark` bei Fett/Kursiv, das ein echtes Toggle ist (`fett-req.md` Abschnitt 2.1).
  Ein Blick in `wrapRangeInList`
  (`node_modules/prosemirror-schema-list/dist/index.js:92-111`) zeigt: Steht die
  Selektion bereits am Anfang eines bestehenden Listenpunkts **und** ist dieser Punkt
  **nicht** der allererste Punkt der Liste, wird kein neuer Wrap verweigert, sondern
  ein „Join"-Pfad eingeschlagen (`doJoin = true`, Zeilen 95-104), der den Punkt
  potenziell in eine **verschachtelte Unterliste** des vorherigen Punkts verschiebt,
  statt ihn einfach im Typ umzuwandeln oder gar nichts zu tun. Ist der Punkt dagegen
  der allererste der Liste, wird der Klick zu einem stillen No-Op (Zeile 97-98: „Don't
  do anything if this is the top of the list"). **Beides muss mit echter
  Browser-Bedienung nachgestellt und das tatsächliche Ergebnis dokumentiert werden** —
  siehe Grenzfälle 3.2–3.4.

### 2.7 Zusammenspiel mit anderen Features
- Zeichenformatierung (fett, kursiv, Farbe, …) innerhalb eines Listenpunkts
  funktioniert identisch zu einem normalen Absatz (Hauptspezifikation Abschnitt 3).
- Absatzausrichtung eines einzelnen Listenpunkts bleibt individuell einstellbar und
  wird bei Rundreise nicht auf einen Listen-Standard zurückgesetzt.
- Eine Aufzählungsliste **innerhalb einer Tabellenzelle** muss möglich sein und bei
  Rundreise erhalten bleiben (reale Fixture-Dateien vorhanden, siehe Abschnitt 4.2:
  `listsInTable.odt`, `simple-table-with-lists.odt`).
- Ein Bild als zusätzlicher Block **innerhalb** eines Listenpunkts (mehrere
  Blöcke pro Punkt, z. B. Bildunterschrift nach Bild) — mindestens beim Import einer
  Fremddatei darf das nicht zu Datenverlust führen, auch wenn im eigenen Editor
  (mangels UI, siehe 3.9) nicht direkt erzeugbar. Reale Fixture:
  `tests/fixtures/external/odt/imageWithinList.odt`.
- Undo/Redo: Jede der obigen Aktionen (Liste erstellen, aufheben, Formatwechsel) muss
  einzeln rückgängig/wiederherstellbar sein, auch in Kombination mit reinem Tippen
  davor/danach — Listenbedienung ist ein Verdachtsfall für den in Abschnitt 2 der
  Hauptspezifikation dokumentierten Selection-Sync-Bug, da Toolbar-Klick + anschließende
  Cursor-Neupositionierung genau dessen Muster entspricht.
- Eine Überschrift (`heading`-Node) kann **nicht** direkt in einen Listenpunkt
  umgewandelt werden: `list_item` verlangt als Content-Ausdruck zwingend `paragraph
  block*` (`schema.ts:98-104`) — der erste Kindknoten muss vom Typ `paragraph` sein,
  nicht `heading`. Ein Klick auf „• Liste" bei markierter Überschrift dürfte deshalb
  strukturell scheitern (`findWrapping` liefert `null`) und zu einem stillen No-Op
  führen — siehe Grenzfall 3.5.

---

## 3. Grenzfälle

1. **Leere Liste**: Liste erstellen und sofort wieder aufheben, ohne je Text
   einzugeben → kein verwaistes leeres `bullet_list`/`list_item`-Element im
   Dokumentmodell, kein Crash.
2. **Einzelner Listenpunkt, erneuter Klick auf „• Liste"**: Liste mit genau einem
   Punkt, Cursor darin, nochmals auf „• Liste" geklickt → laut Bibliothekscode
   (`wrapRangeInList`, Zeilen 97-98) ist dieser Punkt zugleich der „allererste" der
   Liste → erwartetes Ergebnis ist ein **stiller No-Op** (Button tut sichtbar nichts).
   Das widerspricht dem Prinzip „kein stiller Fehlschlag" aus Abschnitt 20 der
   Hauptspezifikation und muss entweder als akzeptierte Ausnahme dokumentiert oder
   behoben werden (z. B. durch ein echtes Toggle, siehe 2.6).
3. **Zweiter oder späterer Listenpunkt, erneuter Klick auf „• Liste"** (Liste hat ≥ 2
   Punkte, Cursor im zweiten oder einem späteren Punkt): laut Codeanalyse (2.6)
   potenziell **Verschachtelung** statt No-Op oder Entfernen — muss mit echter
   Bedienung nachgestellt und das tatsächliche, sichtbare Ergebnis (verschachtelte
   Unterliste? unverändert? Fehler?) dokumentiert werden.
4. **Vollständige Selektion einer ganzen bestehenden Aufzählungsliste, erneuter Klick
   auf „• Liste"**: Selektion deckt die gesamte Liste ab (z. B. Strg+A über ein
   Dokument, das nur aus dieser Liste besteht) → zu prüfen, ob dies zu einer weiteren,
   die gesamte bisherige Liste umschließenden Verschachtelungsebene führt (bekanntes
   Verhalten von `wrapInList` bei bereits gleichartigem Inhalt) oder zu einem No-Op.
5. **Selektion über eine Überschrift hinweg**: Markierter Bereich enthält (auch)
   eine Überschrift, Klick auf „• Liste" → laut Schema-Analyse (2.7, letzter Punkt)
   strukturell unzulässig für den Überschriftsanteil; zu prüfen, ob der Klick dann
   für den **gesamten** markierten Bereich wirkungslos bleibt (auch für die
   mitmarkierten normalen Absätze) oder ob wenigstens die Absätze zur Liste werden und
   nur die Überschrift ausgenommen bleibt. Beides ist ein Kandidat für einen stillen
   Fehlschlag und muss dokumentiert werden.
6. **Reale ODT-Datei mit echter mehrstufiger Verschachtelung** (Fixture
   `tests/fixtures/external/odt/listLevel10.odt`, alternativ `EasyList.odt`)
   importieren → laut Code (`odt/reader.ts:164-187`, insbesondere die Rekursion in
   Zeile 184 `Array.from(itemEl.children).flatMap((child) => elementToBlocks(child,
   styles, depth + 1))`) **kann** eine echte Verschachtelung strukturell als
   ineinander liegende `bullet_list`/`ordered_list`-Knoten ankommen (begrenzt durch
   `MAX_NESTING_DEPTH = 25`, Zeile 162) — muss mit dieser konkreten Datei nachgewiesen
   werden, nicht nur angenommen.
7. **`text:list-item` ohne führenden Absatz, nur mit direkt verschachteltem
   `text:list`** (kommt bei manchen ODF-Erzeugern für reine „Container"-Unterlisten
   vor): Das ProseMirror-Schema verlangt für `list_item` zwingend `paragraph` als
   ersten Kindknoten (`schema.ts:99` `content: 'paragraph block*'`). Fehlt dieser beim
   Import, entsteht JSON, das beim späteren `wordSchema.nodeFromJSON(...)` in
   `WordEditor.tsx:65` eine Schema-Validierungs-Exception auslösen kann — mit dem
   Ergebnis „leere weiße Seite ohne verständliche Fehlermeldung", was
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2 ausdrücklich ausschließt. Muss gezielt mit
   Fixtures geprüft werden, die genau dieses Muster enthalten könnten (`listLevel10.odt`,
   `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`).
8. **DOCX-Reimport einer echten mehrstufigen Liste** (Fixture
   `tests/fixtures/external/docx/ComplexNumberedLists.docx`, sofern darin auch
   Bullet-Ebenen vorkommen, sonst zumindest `Numbering.docx`) → da `listMarkerFor`
   (`docx/reader.ts:196-201`) nur `w:numId` ausliest und `w:ilvl` **vollständig
   ignoriert**, werden alle Ebenen zu einer einzigen flachen Liste zusammengeführt.
   Das muss als bekannte, dokumentierte Grenze festgehalten werden (Text bleibt
   erhalten, Einrückungsstruktur geht verloren) — nicht als unbemerkter Verlust.
9. **Bild oder Tabelle als einziger Inhalt eines Listenpunkts** (kein Text davor) →
   schema-seitig nicht direkt darstellbar (`list_item` verlangt führenden `paragraph`);
   zu prüfen, ob die App beim Einfügen eines Bildes in einen leeren, aktiven
   Listenpunkt einen zusätzlichen leeren Absatz automatisch erzeugt oder abstürzt.
   Reale Fixture: `tests/fixtures/external/odt/imageWithinList.odt`.
10. **„Liste aufheben" ohne dass der Cursor in einer Liste steht**: Button ist jederzeit
    aktiv/klickbar (kein `disabled`, kein `aria-pressed`, siehe Abschnitt 1, Zeile 4/10)
    → `liftListItem` liefert in diesem Fall `false` und tut nichts, ohne jede sichtbare
    Rückmeldung. Auch dies ein Kandidat für einen stillen Fehlschlag im Sinne von
    Abschnitt 20 der Hauptspezifikation.
11. **Zwei getrennte Aufzählungslisten im selben Dokument** (durch normalen Absatz
    getrennt): Anders als bei nummerierten Listen (`nummerierte-liste-req.md`
    Grenzfall 3.5) hat die Tatsache, dass DOCX-Export beiden Listen dieselbe feste
    `BULLET_NUM_ID` zuweist (`docx/writer.ts:114`, `styleDefs.ts:34`), für
    Aufzählungslisten **keine sichtbare Auswirkung**, da Bullets keinen fortlaufenden
    Zählwert besitzen — eine geteilte Nummerierungs-ID führt hier nicht zu falschen
    Zahlen. Die **strukturelle** Trennung (zwei separate `<w:p>`-Gruppen mit
    dazwischenliegendem Nicht-Listen-Absatz) bleibt beim Reimport laut vorhandenem
    Unit-Test bereits nachgewiesen erhalten (`src/formats/docx/__tests__/roundtrip.test.ts:161-170`,
    „keeps two separate lists distinct when a paragraph separates them" — bislang nur
    mit Bullet-Listen getestet). Trotzdem mit echter Bedienung (nicht nur
    konstruierten Testdaten) nachstellen, inkl. der ODT-Seite, für die dieser Test
    **nicht existiert** (siehe Abschnitt 5, Punkt 9).
12. **Zwei unmittelbar aufeinanderfolgende, aber inhaltlich getrennte
    Aufzählungslisten ohne trennenden Absatz dazwischen** (z. B. durch Copy-Paste
    zweier Listen hintereinander) → müssen als zwei getrennte `bullet_list`-Knoten
    erkennbar bleiben und dürfen nicht zu einer einzigen Liste verschmelzen. Da
    `groupLists` (`docx/reader.ts:258-283`) beim Reimport ausschließlich anhand von
    `w:numId`-Wechsel und dem Auftreten eines Nicht-Listen-Blocks gruppiert, **nicht**
    anhand ursprünglicher Absatzgrenzen im Editor-Modell, ist zu prüfen, ob zwei
    exportierte, unmittelbar benachbarte Bullet-Listen (gleiche `numId`, kein
    trennender Absatz) beim Reimport fälschlich zu einer einzigen Liste
    zusammenfallen.
13. **ODT: `text:list-style` nur in `styles.xml` (gemeinsame Formatvorlagen) statt in
    `content.xml`s eigenem `office:automatic-styles` definiert.** `parseAutomaticStyles`
    (`odt/reader.ts:36-77`) liest `listKinds` ausschließlich aus den
    `text:list-style`-Elementen innerhalb des übergebenen `automaticStylesEl` von
    `content.xml` (Zeilen 69-74); wird der referenzierte Stilname dort nicht gefunden,
    greift in `elementToBlocks` (Zeile 181) der Fallback `|| 'bullet'`. **Für dieses
    Feature besonders relevant:** Eine tatsächlich **nummerierte** Liste, deren Stil nur
    in `styles.xml` definiert ist, würde dadurch fälschlich als **Aufzählungsliste**
    importiert — ein „falscher Positiv-Fall" speziell für dieses Feature (die
    Aufzählungsliste „gewinnt" Inhalt, der eigentlich eine Nummerierung war). Muss
    gezielt mit den Fixtures `tests/fixtures/external/odt/listStyleId.odt` und
    `tests/fixtures/external/odt/ListStyleResolution.odt` geprüft werden.
14. **Undo unmittelbar nach Listenerstellung** (ein Schritt zurück) → stellt exakt den
    Zustand vor der Umwandlung wieder her (normale Absätze, keine Reste der
    Listenstruktur).
15. **Sehr lange Liste** (z. B. > 50 Punkte) → bleibt performant bedienbar, kein
    spürbares Einfrieren beim Tippen in einem späten Punkt.
16. **Datei mit bereits als „kaputt"/abweichend bekanntem Listen-Markup** (Fixtures
    `tests/fixtures/external/odt/brokenList.odt`, `tests/fixtures/external/odt/ListOddity.odt`)
    → definierter Fallback statt stillem Datenverlust oder Absturz (vgl.
    Fallback-Anforderung aus Abschnitt 18 der Hauptspezifikation). `brokenList.odt` ist
    laut `src/formats/odt/__tests__/external-fixtures.test.ts:12-17` unter Vitest/jsdom
    bewusst aus den Unit-Tests ausgeschlossen (Performance des jsdom-DOM, nicht der
    App) und stattdessen nur über `tests/e2e/large-document-import.spec.ts` abgedeckt —
    zu prüfen, ob dieser E2E-Test die **Listenstruktur** dieser Datei überhaupt
    inhaltlich verifiziert oder nur „stürzt nicht ab".

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede der folgenden Kombinationen gilt: **Datei/Zustand A → unverändert
exportieren → Ergebnis erneut importieren → Inhalt entspricht A** (Listentyp
Aufzählung vs. Nummerierung, Punktzahl, Reihenfolge, ggf. Ebene). „Unverändert
exportieren" bedeutet: Datei wird hochgeladen bzw. im Editor erzeugt und **ohne jede
Bearbeitung** direkt wieder exportiert — dies deckt reine Lese-/Schreib-
Symmetriefehler auf, die bei aktiver Bearbeitung verdeckt bleiben könnten.

### 4.1 Im Editor selbst erzeugte Listen
1. Einfache einstufige Aufzählungsliste (3 Punkte) erzeugen → als DOCX exportieren →
   mit einem unabhängigen Parser (z. B. direktes XML-Parsen von `word/document.xml`
   und `word/numbering.xml`, nicht nur dem eigenen Reader) prüfen: jeder Absatz trägt
   `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`, `numbering.xml`
   enthält den passenden `<w:abstractNum>` mit `<w:numFmt w:val="bullet"/>` und
   `<w:lvlText w:val="•"/>` → reimportieren → weiterhin 3 Punkte, korrekte Reihenfolge,
   weiterhin als `bullet_list` erkennbar (nicht als nummerierte Liste oder Klartext).
2. Dasselbe als ODT: `content.xml` enthält `<text:list text:style-name="LB">` mit
   drei `<text:list-item>`, `automatic-styles` enthält `<text:list-style
   style:name="LB">` mit `<text:list-level-style-bullet text:bullet-char="•">`.
3. Aufzählungsliste mit Fett/Kursiv/Farbe im Listentext → Rundreise erhält
   Zeichenformatierung zusätzlich zur Listenstruktur, DOCX **und** ODT.
4. Aufzählungsliste innerhalb einer Tabellenzelle → Rundreise DOCX und ODT.
5. Zwei getrennte Aufzählungslisten (mit trennendem Absatz, siehe Grenzfall 3.11, und
   ohne trennenden Absatz, siehe Grenzfall 3.12) → Rundreise DOCX und ODT, beide
   Varianten bleiben nach Reimport als zwei getrennte Listen erkennbar.
6. Wechsel Aufzählung ↔ Nummerierung auf derselben Liste (siehe 2.6) → am Ende
   exportierter Zustand entspricht dem zuletzt gewählten Typ, keine Reste des anderen
   Typs, keine Verschachtelung.
7. Cross-Format: im Editor erzeugte Aufzählungsliste als ODT exportieren,
   reimportieren, als DOCX exportieren, reimportieren (doppelte Rundreise) → Struktur
   bleibt über beide Konvertierungen inhaltlich identisch.
8. Liste direkt am Dokumentanfang bzw. -ende → nach Export/Reimport weiterhin normal
   editierbar (Cursor davor/danach positionierbar, neuer Absatz einfügbar).

### 4.2 Import realer Fremddateien (bereits im Repository vorhandene Testfixtures)
Diese Dateien liegen bereits unter `tests/fixtures/external/docx/` bzw.
`tests/fixtures/external/odt/` und müssen für die Verifikation dieses Features
verwendet werden (nicht nur mit selbst konstruierten Minimalbeispielen):

- `tests/fixtures/external/odt/bulletListTest.odt`, `bullet_list.odt`,
  `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`,
  `feature_bullets_numbering.odt`, `ST_Bullets_Numbering.odt`,
  `ST_Bullets_Numbering2.odt` — Kernfixtures für die einfache, einstufige
  Aufzählungsliste; für jede gilt: Import → als Aufzählungsliste erkennbar → unverändert
  exportieren → Reimport → Punktzahl/Text/Typ identisch zum ersten Import.
- `tests/fixtures/external/odt/EasyList.odt`, `EasyListForeignNamespace.odt`,
  `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` — echte Verschachtelung,
  Kernfixtures für Grenzfall 3.6/3.7.
- `tests/fixtures/external/odt/listsInTable.odt`,
  `tests/fixtures/external/odt/simple-table-with-lists.odt` — Liste in Tabellenzelle,
  siehe Abschnitt 2.7.
- `tests/fixtures/external/odt/imageWithinList.odt` — Bild als Blockinhalt eines
  Listenpunkts, siehe Grenzfall 3.9.
- `tests/fixtures/external/odt/listStyleId.odt`,
  `tests/fixtures/external/odt/ListStyleResolution.odt` — Auflösung von Listenstilen
  über Referenzen statt Inline-Definition, siehe Grenzfall 3.13.
- `tests/fixtures/external/odt/brokenList.odt`, `tests/fixtures/external/odt/ListOddity.odt` —
  bekanntermaßen abweichendes/fehlerhaftes Listen-Markup, siehe Grenzfall 3.16.
- `tests/fixtures/external/odt/ListRoundtrip.odt` — expliziter Rundreise-Testfall.
- Restliche Listen-Fixtures mit vermutlich einfacherem Bullet-Inhalt (`list.odt`,
  `liste2.odt`, `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`,
  `ListHeading.odt`, `ListHeading2.odt`, `simple-list_MSO14.odt`,
  `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt`) — Basisabdeckung; für jede
  gilt mindestens: Import ohne Absturz/Textverlust, Rundreise erhält Textinhalt jedes
  Listenpunkts.
- `tests/fixtures/external/docx/ComplexNumberedLists.docx`, `Numbering.docx`,
  `NumberingWithOutOfOrderId.docx`, `NumberingWOverrides.docx` — DOCX-seitig gibt es
  keine dedizierten „nur Bullet"-Fixtures im Korpus; diese vier Dateien sind daher
  zusätzlich daraufhin zu prüfen, ob sie **auch** Aufzählungsebenen (nicht nur
  Nummerierung) enthalten, und entsprechend in die Bullet-Verifikation
  einzubeziehen. `NumberingWithOutOfOrderId.docx` ist zusätzlich der konkrete
  Testfall für den in Abschnitt 5, Punkt 7 beschriebenen Verdacht (falsche
  Bullet/Nummeriert-Erkennung durch `firstChildNS`).

**Vorgabe:** Für jede oben genannte Fixture-Datei ist mindestens ein automatisierter
Test erforderlich, der (a) den Import ohne Absturz/Datenverlust prüft und (b) die
Rundreise (unverändert exportieren → reimportieren) auf inhaltliche Gleichheit prüft.
Bloßes manuelles Anschauen genügt für die Abnahme dieses Features nicht.

### 4.3 Cross-Format-Kontrast Aufzählung vs. Nummerierung (nur zur Kenntnisnahme)
Im Unterschied zur nummerierten Liste (siehe `nummerierte-liste-req.md` Grenzfall 3.5
und Abschnitt 5, Punkt 4) hat die geteilte, feste Listen-ID/-Stilname pro Typ
(`BULLET_NUM_ID`/`BULLET_LIST_STYLE_NAME`) für **dieses** Feature keine sichtbare
Auswirkung auf den dargestellten Inhalt, da Bullets keinen Zählwert tragen. Diese
Einordnung selbst ist Teil der Verifikation: Sie muss durch einen tatsächlichen
Rundreise-Test mit **zwei** benachbarten Bullet-Listen bestätigt werden (nicht nur
durch diese Argumentation angenommen), da eine gemeinsame `numId`/ein gemeinsamer
Listenstil-Name in seltenen Randfällen dennoch zu ungewollter Vereinheitlichung von
Einrückung/Abstand (`text:space-before`, `text:min-label-width`,
`odt/styleRegistry.ts:100`) zwischen eigentlich unabhängigen Listen führen könnte.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer Durchsicht des aktuellen Quellcodes (Stand
dieser Spezifikation) und sind als **zu bestätigende oder zu widerlegende
Verdachtsmomente** zu verstehen — nicht als bereits abgenommene Fehlerliste. Sie
sollen der Verifikation gezielte Ansatzpunkte geben, analog zu Abschnitt 17 der
Hauptspezifikation und Abschnitt 5 von `nummerierte-liste-req.md`.

1. **Kein Ein-/Ausrücken implementiert.** Weder Tastenkombination (Tab/Umschalt+Tab)
   noch Toolbar-Button für das Ändern der Verschachtelungsebene existieren.
   `sinkListItem` wird im gesamten Projekt nicht importiert oder verwendet — identisch
   zum Befund in `nummerierte-liste-req.md` Abschnitt 5, Punkt 1, da beide Listentypen
   denselben `list_item`-Knoten und dieselbe Toolbar-Gruppe teilen.
2. **DOCX-Export ignoriert Verschachtelungsebenen.** `blockToDocx`
   (`docx/writer.ts:94-126`) schreibt für jeden Listenpunkt unabhängig von seiner
   tatsächlichen Verschachtelung im Dokumentmodell fest `<w:ilvl w:val="0"/>`
   (Zeile 103). Eine intern (z. B. durch ODT-Import) vorliegende verschachtelte
   Aufzählungsliste würde beim DOCX-Export vollständig auf eine Ebene abgeflacht, und
   zwar so, dass die Unterpunkte als zusätzliche, gleichrangige Punkte **derselben**
   Liste erscheinen (nicht als eigene Liste, nicht als separater Absatz), weil die
   `bullet_list`/`ordered_list`-Fallunterscheidung (Zeilen 112-118) beim rekursiven
   Aufruf für verschachtelte Listenknoten stets dieselbe globale `numId` und
   `ilvl="0"` erneut verwendet.
3. **DOCX-Import liest Ebenen nicht aus.** `listMarkerFor` (`docx/reader.ts:196-201`)
   wertet ausschließlich `w:numId` aus, nicht `w:ilvl`. Eine reale mehrstufige Liste
   würde dadurch voraussichtlich komplett flach importiert.
4. **Listen-ID/-Stil ist pro Typ global fix, aber für Bullets ohne sichtbare
   Konsequenz.** Sowohl DOCX (`BULLET_NUM_ID = 1`, `styleDefs.ts:34`) als auch ODT
   (`BULLET_LIST_STYLE_NAME = 'LB'`, `odt/styleRegistry.ts:95`) verwenden für **alle**
   Aufzählungslisten im Dokument dieselbe feste Kennung — anders als bei der
   nummerierten Liste (siehe Abschnitt 4.3) führt das für Bullets nicht zu falschen
   Zahlenwerten, muss aber dennoch mit einem echten Test auf Einrückung/Abstand
   bestätigt werden (siehe 4.3).
5. **Kein eigenes Aufzählungszeichen wählbar.** Weder UI noch Datenmodell erlauben ein
   anderes Symbol als das fest codierte „•" (Abschnitt 1, Zeile 6; Abschnitt 2.2).
   Laut Backlog als Priorität 4 „nice-to-have" eingestuft — muss aber, falls dauerhaft
   nicht gebaut, explizit als bewusste Einschränkung dokumentiert werden.
6. **Kein unterschiedliches Bullet-Symbol je Verschachtelungsebene.** Sowohl
   `numberingXml()` (`docx/styleDefs.ts:37-47`) als auch `listStyleDefs()`
   (`odt/styleRegistry.ts:98-102`) definieren nur je **eine** Ebene (`w:ilvl="0"`
   bzw. `text:level="1"`) mit dem Zeichen „•". Selbst wenn Mehrstufigkeit (Punkt 1/2)
   nachgerüstet würde, gäbe es aktuell keine Definition für ein in Word/LibreOffice
   übliches, je Ebene wechselndes Symbol (z. B. „•", „○", „▪").
7. **`toggleList` ist kein echtes Toggle.** `commands.ts:57-60` ruft ausnahmslos
   `wrapInList` auf; es fehlt die Prüfung „Selektion bereits vollständig Ziel-Listentyp
   → stattdessen `liftListItem`". Laut Lektüre von
   `node_modules/prosemirror-schema-list/dist/index.js:92-111` kann ein erneuter Klick
   auf „• Liste" bei bereits aktiver Liste je nach Cursor-Position entweder zu einem
   stillen No-Op (erster Punkt der Liste) oder zu einer ungewollten Verschachtelung
   (spätere Punkte) führen (siehe Abschnitt 2.6 und Grenzfälle 3.2–3.4). Dies ist ein
   **konkreter, im Bibliothekscode nachvollziehbarer** Verdacht, kein bloßes
   Bauchgefühl, und sollte mit höchster Priorität nachgestellt werden, da es die
   Kernbedienung („Aufzählung an/aus") betrifft.
8. **ODT-Listentyp-Erkennung fällt im Zweifel auf „bullet" zurück.**
   `elementToBlocks` (`odt/reader.ts:181`) verwendet `|| 'bullet'` als Fallback, wenn
   der referenzierte Listenstil nicht in den `listKinds` gefunden wird (z. B. weil er
   nur in `styles.xml` statt in `content.xml`s `office:automatic-styles` definiert
   ist, siehe Grenzfall 3.13). Für die Aufzählungsliste bedeutet das konkret: Sie kann
   fälschlich Inhalt „gewinnen", der eigentlich eine nummerierte Liste war — ein
   Fehlerbild, das speziell aus Sicht dieses Features (nicht des Nummerierungs-Features)
   geprüft werden muss.
9. **Aktiver Zustand des Toolbar-Buttons fehlt.** Anders als bei den
   Zeichenformatierungs- und Ausrichtungs-Buttons zeigt der „• Liste"-Button aktuell
   nicht an, ob der Cursor sich gerade in einer Aufzählungsliste befindet (Abschnitt 1,
   Zeile 4).
10. **Bereits vorhandene automatisierte Tests decken nur den einfachen Fall ab.**
    `src/formats/docx/__tests__/roundtrip.test.ts:135-171` und
    `src/formats/odt/__tests__/roundtrip.test.ts:135-160` prüfen: flache Liste mit
    zwei Punkten, Unterscheidung Bullet/Ordered, sowie (nur bei DOCX, Zeilen 161-170)
    „zwei Listen mit trennendem Absatz bleiben getrennt" — das ODT-Äquivalent dieses
    letzten Tests **fehlt komplett**. Verschachtelung, eigenes Bullet-Zeichen sowie
    sämtliche in Abschnitt 4.2 gelisteten realen Fixture-Dateien sind nach aktuellem
    Stand **nicht** in die automatisierte Testsuite eingebunden — auch die generischen
    Fixture-Tests (`external-fixtures.test.ts`, siehe Grenzfall 3.16) prüfen
    ausschließlich „stürzt nicht ab", nicht die tatsächliche Listenstruktur.
11. **In `tests/e2e/*.spec.ts` existiert aktuell kein einziger Test mit Bezug zu
    Listen** (weder „list" noch „Liste" noch „bullet" kommt in einer der vorhandenen
    E2E-Spec-Dateien vor, Stand dieser Spezifikation) — die gesamte Verifikation
    „echte Browser-Bedienung" für dieses Feature ist damit vollständig neu zu
    schreiben, es gibt keinen bestehenden (auch keinen unzuverlässigen) Ausgangstest,
    der erweitert werden könnte.

**Einordnung:** Der Backlog-Status „vorhanden" trifft nach dieser Code-Sichtung
bestenfalls auf den einfachsten Fall zu (einstufige Liste per Klick anlegen/aufheben,
Bullet von Nummeriert unterscheidbar) — und selbst dafür existiert noch **kein**
einziger E2E-Test, nur Unit-Tests auf Reader/Writer-Ebene. Alles, was über Abschnitt
2.1, 2.3 und 2.5 hinausgeht (insbesondere 2.4 Mehrstufigkeit, das in 2.6/Punkt 7
beschriebene Toggle-Verhalten sowie 2.2 eigenes Bullet-Symbol), ist nach dieser
Code-Sichtung mit hoher Wahrscheinlichkeit nicht oder nur unvollständig implementiert
und muss vor jeder Abnahme dediziert geprüft und ggf. nachgebaut werden.

---

## 6. Testfälle (Zusammenfassung, Pflichtumfang)

1. Liste erstellen (Cursor ohne Selektion; Selektion über mehrere Absätze) — beide
   Wege, per echtem Playwright-Klick auf den Toolbar-Button.
2. Enter-Verhalten: nicht-leerer Punkt (neuer Punkt), leerer Punkt (beendet Liste),
   Cursor mittig im Text (Split), Umschalt+Enter (Zeilenumbruch ohne neuen Punkt).
3. Erneuter Klick auf „• Liste" bei bereits aktiver Liste — einmal am ersten Punkt,
   einmal an einem späteren Punkt, einmal bei Selektion der gesamten Liste (Grenzfälle
   3.2–3.4) — tatsächliches Ergebnis jeweils dokumentieren.
4. Wechsel Aufzählung ↔ Nummerierung ohne Verschachtelung/Datenverlust (2.6, in beide
   Richtungen, in Zusammenspiel mit `nummerierte-liste-req.md`).
5. „Liste aufheben" — Text bleibt vollständig erhalten, auch wenn Cursor nicht in
   einer Liste steht (Grenzfall 3.10, No-Op-Verhalten dokumentieren).
6. Ein-/Ausrücken per Tab/Umschalt+Tab (Funktion muss ggf. erst gebaut werden, siehe
   Abschnitt 5, Punkt 1) — falls nicht gebaut: expliziter Test, der das aktuelle
   Fehlen nachweist und im Ergebnisbericht als offene Lücke markiert, statt
   stillschweigend übersprungen zu werden.
7. Zusammenspiel: Zeichenformatierung, Absatzausrichtung, Liste in Tabellenzelle,
   Bild in Listenpunkt (Fremddatei), Undo/Redo über gemischte Sequenzen inkl.
   Toolbar-Klick + Cursor-Neupositionierung (Selection-Sync-Regressionsmuster aus
   Abschnitt 2 der Hauptspezifikation).
8. Alle Grenzfälle aus Abschnitt 3 (1–16) einzeln als eigener Testfall.
9. Rundreise DOCX **und** ODT für jede im Editor erzeugbare Konfiguration
   (Abschnitt 4.1, Punkte 1–8), inklusive Validierung mit einem unabhängigen
   Parser/Schema (nicht nur dem projekteigenen Reader), analog Abschnitt 19 der
   Hauptspezifikation.
10. Import + Rundreise für jede reale Fixture-Datei aus Abschnitt 4.2 — kein Test gilt
    als abgeschlossen, solange nicht mindestens diese Dateien einbezogen wurden,
    inklusive gezielter Prüfung der ODT-Listentyp-Fallback-Frage (Grenzfall 3.13) und
    der DOCX-`w:lvl`-Reihenfolge-Frage (`NumberingWithOutOfOrderId.docx`).
11. `aria-pressed`/aktiver Zustand des „• Liste"-Buttons — Test, der Cursor in/außerhalb
    einer Aufzählungsliste bewegt und den sichtbaren Button-Zustand prüft (Funktion
    muss ggf. erst ergänzt werden, siehe Abschnitt 1, Zeile 4).
12. Tastatur-Bedienbarkeit des Buttons ohne Maus (Tab-Fokus + Enter/Leertaste,
    Abschnitt 1, Zeile 8).

---

## 7. Definition of Done

Das Feature „Aufzählungsliste (Bullet)" gilt erst dann als verifiziert und
vertrauenswürdig, wenn:

- jeder Punkt aus Abschnitt 2 (gewünschtes Verhalten) über echte Bedienung im Browser
  nachgewiesen ist (nicht nur über konstruierte Testdaten für Reader/Writer),
- jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite
  verbleibenden Test hat,
- die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
  gelisteten realen Fixture-Dateien nachgewiesen ist,
- zu jedem Verdachtspunkt aus Abschnitt 5 ein eindeutiges Ergebnis vorliegt (bestätigt
  und behoben / bestätigt und bewusst als bekannte Einschränkung dokumentiert /
  widerlegt) — insbesondere Punkt 7 (kein echtes Toggle) und Punkt 8 (ODT-Fallback auf
  „bullet") dürfen nicht offen bleiben, da beide die Kernbedienung bzw. die
  Typkorrektheit des Features direkt betreffen,
- die in Abschnitt 5, Punkt 11 festgestellte vollständige Abwesenheit von
  E2E-Tests für Listen behoben ist (mindestens die Testfälle aus Abschnitt 6),
- kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (siehe Abschnitt 20
  der Hauptspezifikation: jede nicht ausführbare Aktion muss sichtbar zurückmelden,
  statt wirkungslos zu bleiben) — insbesondere die Grenzfälle 3.2, 3.5 und 3.10.

Erst nach Erfüllung aller Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)" auf „verifiziert" geändert werden.
