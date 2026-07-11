# Anforderungsspezifikation: Feature „Aufzählungsliste (Bullet)"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 5 („Listen") von
`FEATURE-SPEC-DOCX-ODT.md` sowie den Backlog-Eintrag `aufzaehlungsliste` in
`specs/FEATURE-BACKLOG.md`, Abschnitt 2.6 „Listen" (Beschreibung dort: „Wandelt
Absätze in eine unsortierte Liste um.", Status „vorhanden", Priorität 1/essenziell).
Es ersetzt den kurzen Stichpunkt durch eine vollständige, einzeln abhakbare Anforderung
inkl. Grenzfällen und Rundreise-Pflicht. Es gilt weiterhin das Grundprinzip aus
`FEATURE-SPEC-DOCX-ODT.md`: gemeinsamer interner Editor (ProseMirror-Schema +
Seitenansicht) für DOCX und ODT — jede Anforderung unten muss für **beide** Formate
gelten, sowohl beim Import einer bestehenden Datei als auch beim Export einer im Editor
erstellten/bearbeiteten Datei, inklusive Rundreise (Datei A hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich A).

Geschwister-Dokumente im selben Backlog-Abschnitt 2.6, deren Abgrenzung dieses Dokument
mehrfach braucht:
- `nummerierte-liste-req.md` — strukturell fast identisches Feature „Nummerierte Liste"
  (dieselbe Toolbar-Gruppe, derselbe `toggleList`/`liftFromList`-Code). Wo Verhalten/Code
  identisch ist, wird hier darauf verwiesen statt es zu duplizieren; wo es sich
  unterscheidet (insbesondere: Bullets haben keinen Zählwert, aber ein Symbol; keine
  „fortsetzen/neu starten"-Frage; eigene Fehlerrichtung bei der ODT-Listentyp-Erkennung,
  siehe 3.13), wird das explizit ausgeführt.
- `liste-aufheben-req.md` — „Liste aufheben" (⇧ Liste), hier nur als Teil des
  Gesamtablaufs relevant (Abschnitt 2.5).
- `liste-einruecken-tab` (Backlog-Status **fehlt**, Priorität 1), `mehrstufige-liste`
  (Backlog-Status **fehlt**, Priorität 2) und `einzugsebene-erhoehen`/
  `einzugsebene-verringern` (Backlog-Status **fehlt**, Priorität 2) — diese decken das
  **Erzeugen/Ändern der Verschachtelungsebene im Editor selbst** ab. Wichtige Abgrenzung
  (siehe Abschnitt 2.4 und 5): Die **Persistenz/Rundreise** verschachtelter
  Aufzählungslisten ist in Reader/Writer bereits implementiert und getestet; was fehlt,
  ist ausschließlich der **Bedienweg**, eine Verschachtelung im Editor zu erzeugen. Diese
  beiden Dinge dürfen bei der Verifikation nicht vermengt werden.

Backlog-Status laut Vorgabe: **„vorhanden" — gilt aktuell als nicht vertrauenswürdig,
muss vollständig verifiziert werden.** Dieses Dokument beschreibt sowohl den
Soll-Zustand als auch (Abschnitt 5) den durch aktuelle Code-Sichtung belegten Ist-Stand,
den die Verifikation gezielt bestätigen oder widerlegen muss.

> Hinweis zu Codeverweisen: Datei- und Symbolnamen (Funktionen, Konstanten) sind stabil
> und maßgeblich. Zeilennummern sind „Stand dieser Sichtung" und können durch spätere
> Änderungen verrutschen — im Zweifel gilt der genannte Symbolname, nicht die Zeile.
> Diese Spezifikation wurde gegen den **aktuellen** Quellstand gegengeprüft; ältere
> Fassungen dieses Dokuments enthielten Aussagen, die inzwischen überholt sind (siehe
> Abschnitt 5, Einleitung).

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button „• Liste" (Aufzählung) | `src/formats/shared/editor/Toolbar.tsx` (Listen-Gruppe, Button „• Liste", ~Z. 241–251); `onMouseDown` ruft `run(view, toggleList(false))` → `commands.ts` `toggleList` (Z. 57–60) → `wrapInList(wordSchema.nodes.bullet_list)` | Reiner Textbutton mit echtem Bullet-Zeichen „•"; kein `disabled`, kein `aria-pressed` | Muss auf einzelnem Absatz **und** auf Mehrfachauswahl über mehrere Absätze funktionieren; Abgrenzung zu 2.7 |
| 2 | Button „1. Liste" (Nummerierung) | `Toolbar.tsx` (~Z. 252–262), `toggleList(true)` | vorhanden | eigene Spezifikation `nummerierte-liste-req.md`; hier nur als Umschaltfall relevant (2.6) |
| 3 | Button „⇧ Liste" (Liste aufheben) | `Toolbar.tsx` (~Z. 263–273), ruft `liftFromList()` (`commands.ts` Z. 62–64 → `liftListItem(wordSchema.nodes.list_item)`) | vorhanden | Muss bei (importierten) mehrstufigen Listen die korrekte Einzelebene anheben, nicht die ganze Liste in einem Schritt auflösen (siehe 2.5, 3.10) |
| 4 | Aktiver Zustand des Buttons „• Liste" | `Toolbar.tsx` (~Z. 241–251) | **Kein `aria-pressed`, kein visuelles „aktiv"-Styling** — im Gegensatz zu `MarkButton` (`aria-pressed={active}`, ~Z. 75), `AlignButton` (~Z. 97) und dem Tabelle-Button (`aria-pressed={isInTable(view.state)}`, ~Z. 281) | Muss ergänzt werden: Cursor in einer Aufzählungsliste → Button zeigt sichtbar „aktiv" an, analog zu allen anderen Toggle-Buttons der Toolbar. Es existiert bisher **keine** `isInBulletList`-/`isListActive`-Hilfsfunktion in `commands.ts` |
| 5 | Ein-/Ausrücken per Tastatur (Tab / Umschalt+Tab) | Editor-Keymap, `WordEditor.tsx` (Keymap ~Z. 85–107) | **Fehlt vollständig.** Weder `Tab` noch `Shift-Tab` ist gebunden; `sinkListItem`/`liftListItem` sind für Tab **nicht** verdrahtet. `sinkListItem` (aus `prosemirror-schema-list`) wird im gesamten Projekt **nirgends** importiert (`commands.ts` importiert nur `wrapInList`, `liftListItem`, Z. 2; per Grep über `src/` bestätigt: kein einziger `sinkListItem`-Treffer). Gebunden sind lediglich `Enter: splitListItem(list_item)` (Z. 96) und `Shift-Enter: insertHardBreak()` (Z. 97) | Muss für die Editor-Erzeugung von Mehrstufigkeit ergänzt werden (Backlog `liste-einruecken-tab`, Priorität 1): Tab am Zeilenanfang eines Listenpunkts rückt eine Ebene tiefer, Umschalt+Tab rückt aus; außerhalb einer Liste darf Tab keine Listenwirkung auslösen (Abgrenzung, Hauptspezifikation Abschnitt 15) |
| 6 | Eigenes Aufzählungszeichen wählen (Symbol/Bild statt „•") | — | **Fehlt komplett** (UI und Datenmodell): der `bullet_list`-Node in `schema.ts` (~Z. 115–122) hat **keine** Attribute, insbesondere kein Zeichen-/Symbol-Attribut | Laut Backlog (`eigene-aufzaehlungszeichen`, Priorität 4) explizit „nice-to-have"; falls nicht gebaut, als bewusst nicht unterstützt zu dokumentieren statt unklar zu bleiben |
| 7 | Automatische Umwandlung durch Tippen (z. B. „- " oder „* " am Zeilenanfang + Leerzeichen) | Editor, Input Rules | **Fehlt vollständig** — im gesamten Projekt existieren keine ProseMirror-`InputRule`s (kein `inputRules`/`wrappingInputRule` in `src/`) | Nice-to-have; falls nicht umgesetzt, explizit als bewusst nicht unterstützt dokumentieren (kein stiller Fehlschlag, Hauptspezifikation Abschnitt 20) |
| 8 | Tastatur-Bedienbarkeit des Buttons selbst (Tab-Fokus + Enter/Leertaste, ohne Maus) | `Toolbar.tsx` (~Z. 241–251), Handler ausschließlich auf `onMouseDown` (kein `onClick`) | Nicht verifiziert, ob ein per Tab fokussierter `<button>` bei Aktivierung per Enter/Leertaste tatsächlich ein `mousedown`-Ereignis auslöst (browserabhängig; bei reinem Enter i. d. R. **nicht**) | Muss browserübergreifend geprüft werden — betrifft strukturell **alle** Toolbar-Buttons dieser Codebasis identisch, ist hier aber erstmalig für die Listen-Gruppe explizit zu verifizieren |
| 9 | Symbol des Buttons | `Toolbar.tsx` (~Z. 250), Text „• Liste" | Reiner Text inkl. echtem Bullet-Zeichen „•" (kein Emoji/SVG-Risiko wie beim Bild-Button „🖼 Bild" oder Tabelle-Button „⊞ Tabelle") | In Ordnung so; bei einer eventuellen künftigen SVG-Icon-Umstellung der übrigen Toolbar auf Konsistenz prüfen (Hauptspezifikation Abschnitt 20.1) |
| 10 | Kontextmenü (Rechtsklick) → „Aufzählung" | — | Nicht vorhanden | Kein Kontextmenü-Eintrag; als fehlend dokumentieren, nicht Teil dieser Anforderung |
| 11 | Auslösemechanismus des Buttons | `Toolbar.tsx` `run()` (~Z. 28–31), aufgerufen aus `onMouseDown` mit `e.preventDefault()` (~Z. 244–247) | `preventDefault()` verhindert, dass der Klick den Fokus/die Selektion aus dem Editor zieht → `toggleList` wirkt auf die **noch bestehende** Editor-Selektion; danach ruft `run()` `view.focus()` (Z. 31) und gibt den Fokus in den Editor zurück | **Load-bearing:** genau dieser Mechanismus macht „auf Selektion anwenden" (2.1) überhaupt möglich und ist bei der Verifikation als Wirkprinzip mitzudenken. Achtung: Bei der in Zeile 8 genannten reinen Tastaturbedienung greift dieser `mousedown`-Pfad **nicht** — dort ist der Wirknachweis separat zu führen |
| 12 | Einfügen von per Zwischenablage kopiertem HTML mit Listen-Markup (`<ul>`/`<ol>`/`<li>`) — z. B. aus einer echten Webseite/Word/LibreOffice, nicht nur aus dem eigenen Editor | Kein eigener `transformPasted`-Hook im gesamten Projekt (grep über `src/` bestätigt: `clipboard.ts` überschreibt ausschließlich `clipboardTextSerializer`, d. h. nur die **Klartext**-Repräsentation beim **Kopieren**); das **Einfügen** externen HTML läuft vollständig über ProseMirrors Standard-DOM-Parsing gegen die `parseDOM`-Regeln in `schema.ts` (`bullet_list` → Tag `ul`, Z. 118; `ordered_list` → Tag `ol` inkl. `start`-Attribut, Z. 128–133; `list_item` → Tag `li`, Z. 148) | Muss zu einer echten `bullet_list`/`ordered_list`-Struktur führen, nicht zu flachem, mit „•"/Zahlen durchsetztem Text. Teilweise bereits belegt: `tests/e2e/clipboard.spec.ts` „Testfall (2.2/4)" (~Z. 170–201) kopiert eine **einstufige** Liste aus dem **eigenen** Editor (Strg+C) und fügt sie in ein neues Dokument ein, Assertion `pastedEditor.locator('li')` — das deckt aber nur den Rundlauf über die **app-eigene** HTML-Serialisierung ab, nicht das Einfügen **fremd** erzeugten HTML-Markups (andere Attribute/Klassen/verschachtelte Struktur) und nicht mehrstufig verschachtelte Listen. Diese Lücke ist neu als Grenzfall 3.18 aufgenommen |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Liste erstellen
- Cursor in einem Absatz, Klick auf „• Liste" → der Absatz wird zu einem Punkt einer neuen
  Aufzählungsliste.
- Bei einer Mehrfachauswahl über mehrere Absätze hinweg → jeder markierte Absatz wird zu
  einem eigenen Punkt **derselben** Aufzählungsliste.
- Angewendet auf eine bereits vorhandene nummerierte Liste soll diese in eine
  Aufzählungsliste umgewandelt werden (siehe 2.6), nicht in eine verschachtelte
  Liste-in-Liste.
- Jeder Punkt erhält auf der obersten Ebene dasselbe Bullet-Symbol „•" (kein pro Punkt
  wählbares Zeichen, siehe Abschnitt 1, Zeile 6, und 2.2).

### 2.2 Das Bullet-Symbol ist nicht frei wählbar, variiert aber je Ebene automatisch
- Anders als bei der nummerierten Liste gibt es keinen „Wert", der sich bei
  Einfügen/Löschen/Verschieben von Punkten neu berechnet — das Symbol ist rein
  dekorativ und trägt keine Reihenfolge-Information.
- **DOCX:** Die Nummerierungsdefinition wird zentral in `docx/styleDefs.ts` erzeugt
  (`numberingXml`, ~Z. 64–74). Es sind **alle 9 OOXML-Ebenen** (`w:ilvl` 0–8) definiert;
  das Bullet-Zeichen wechselt je Ebene zyklisch über `BULLET_GLYPHS = ['•', '◦', '▪']`
  (~Z. 43, generiert in `bulletLevelsXml`, ~Z. 50–55). Auf der obersten Ebene ist das
  Zeichen also „•". Ein pro Dokument/pro Liste frei wählbares Zeichen gibt es weiterhin
  **nicht**.
- **ODT:** Der Listenstil `LB` (`odt/styleRegistry.ts`, `BULLET_LIST_STYLE_NAME = 'LB'`
  ~Z. 95; `listStyleDefs` ~Z. 98–103) definiert derzeit **nur eine** Ebene
  (`text:level="1"`, `text:bullet-char="•"`, ~Z. 100). Verschachtelte ODT-Ebenen
  referenzieren denselben Stil; ein je Ebene wechselndes ODT-Symbol ist **nicht**
  definiert. Diese Asymmetrie zu DOCX (dort 3 zyklische Zeichen, hier 1) ist bei der
  Verifikation der Cross-Format-Rundreise zu berücksichtigen und ggf. als bewusste
  Vereinfachung zu dokumentieren.
- Reale Fremddateien, die ein **anderes** Bullet-Zeichen verwenden (z. B. „○", „▪",
  „–"), müssen beim Import zumindest inhaltlich als Liste erkannt werden; das konkrete
  Fremd-Zeichen wird jedoch nicht übernommen. Der ODT-Reader bestimmt den Listentyp nur
  über „enthält der Stil ein `text:list-level-style-number`? → nummeriert, sonst
  Aufzählung" (`odt/reader.ts`, `parseAutomaticStyles`, ~Z. 70–75), das konkrete
  Bullet-Zeichen wird nicht ausgelesen. Der DOCX-Reader unterscheidet nur
  bullet vs. ordered über das `numFmt` der ersten Ebene (`parseNumberingXml`, ~Z. 78–98).
  Das ist als bewusste Vereinfachung zu dokumentieren, nicht als unbemerkter Verlust.

### 2.3 Enter-Verhalten
- Enter am Ende eines nicht-leeren Listenpunkts → neuer Listenpunkt auf derselben Ebene.
- Enter am Ende eines **leeren** Listenpunkts beendet die Liste an dieser Stelle (Punkt
  wird zu einem normalen Absatz) statt einen weiteren leeren Punkt zu erzeugen. Dieses
  Verhalten kommt aus der Standardimplementierung `splitListItem` (gebunden in
  `WordEditor.tsx` Z. 96) — es ist **keine** projekteigene Logik, muss aber trotzdem mit
  einem echten Testfall in dieser App nachgewiesen werden, nicht nur unter Berufung auf
  die Bibliotheksdokumentation angenommen werden.
- Enter in der Mitte eines Listenpunkts (Cursor zwischen Text) teilt den Text korrekt auf
  zwei aufeinanderfolgende Listenpunkte auf, ohne Textverlust.
- Umschalt+Enter innerhalb eines Listenpunkts erzeugt einen Zeilenumbruch (`hard_break`,
  `insertHardBreak`, `WordEditor.tsx` Z. 97) **innerhalb** desselben Punkts, keinen neuen
  Punkt.

### 2.4 Mehrstufige Listen (Verschachtelung) — Persistenz vorhanden, Editor-Erzeugung fehlt
Diese Unterscheidung ist zentral und war in einer früheren Fassung dieses Dokuments falsch
dargestellt:

- **Persistenz/Rundreise ist implementiert.** Das Schema erlaubt Verschachtelung
  (`list_item`-Content ist `'block+'`, `schema.ts` ~Z. 147 — ein `bullet_list` ist selbst
  in Gruppe `block` und darf damit als weiterer Block innerhalb eines `list_item`
  auftreten). Reader **und** Writer beider Formate bilden Verschachtelung ab:
  - DOCX-Writer (`docx/writer.ts`, `blockToDocx`, ~Z. 105–156): führt einen
    `ListContext { numId, level }`; ein verschachtelter `bullet_list`/`ordered_list`
    erbt die `numId` und erhöht `level` um 1 (geklammert auf `MAX_LIST_ILVL = 8`, ~Z. 103).
    Jeder Punkt schreibt `<w:numPr><w:ilvl w:val="…"/><w:numId w:val="…"/></w:numPr>` mit
    der **tatsächlichen** Ebene (~Z. 114–116).
  - DOCX-Reader (`docx/reader.ts`): `listMarkerFor` liest `w:numId` **und** `w:ilvl`
    (~Z. 294–302), und `groupLists` rekonstruiert die Verschachtelung aus der flachen
    `w:ilvl`-Sequenz über einen Stack offener Listen-Frames (~Z. 379–440).
  - ODT-Writer (`odt/writer.ts`, `blockToOdt`, list-Fall ~Z. 99–109): schreibt für jeden
    verschachtelten `bullet_list` rekursiv ein `<text:list>` **innerhalb** des
    `<text:list-item>`.
  - ODT-Reader (`odt/reader.ts`, `elementToBlocks`, list-Fall ~Z. 286–299): verarbeitet
    die Kinder jedes `text:list-item` rekursiv (~Z. 290), sodass ein verschachteltes
    `text:list` wieder als verschachtelter Knoten ankommt (begrenzt durch
    `MAX_NESTING_DEPTH = 25`, ~Z. 218).
  - Belegt durch bestehende, grüne Tests: `docx/__tests__/roundtrip.test.ts` „preserves a
    nested list two levels deep" und das ODT-Pendant in `odt/__tests__/roundtrip.test.ts`,
    sowie E2E in `tests/e2e/roundtrip-fidelity.spec.ts` (zweistufige Liste, Assertion
    `.ProseMirror li ul, .ProseMirror li ol` = 1 vor **und** nach Export→Reimport, für
    DOCX **und** ODT).
- **Editor-Erzeugung fehlt.** Es gibt **keinen** Bedienweg, im Editor selbst eine Ebene
  zu erzeugen/ändern: weder Tab/Umschalt+Tab noch ein Toolbar-Button, `sinkListItem` wird
  nirgends verwendet (Abschnitt 1, Zeile 5). Die einzigen Wege, wie eine verschachtelte
  Aufzählungsliste in den Editor gelangt, sind **Import** einer Fremddatei mit echter
  Verschachtelung (Abschnitt 3.6/3.7) oder Copy-Paste von HTML mit `<ul><li><ul>…` — Letzteres
  ist bislang **nur für den einstufigen, app-eigenen Fall** durch einen Test belegt
  (Abschnitt 1, Zeile 12; `clipboard.spec.ts` „Testfall (2.2/4)"), für **verschachteltes**
  oder **fremd** erzeugtes HTML-Markup dagegen unverifiziert und deshalb **anzunehmen, nicht
  zu behaupten** (neuer Grenzfall 3.18). Diese
  Editor-Erzeugung ist im Backlog als eigene, noch offene Features geführt
  (`liste-einruecken-tab`, `mehrstufige-liste`, `einzugsebene-*`, alle Status „fehlt").
- Für die Abnahme dieses Features (`aufzaehlungsliste`) ist die **Persistenz/Rundreise**
  der Verschachtelung Pflichtbestandteil (sie ist implementiert und muss dauerhaft grün
  bleiben); die **Editor-Erzeugung** ist ausdrücklich **nicht** Teil dieses Backlog-Slugs,
  ihr Fehlen ist jedoch als bekannte Lücke zu dokumentieren statt stillschweigend zu
  fehlen. Reale Testdateien mit vielen Ebenen liegen im Fixture-Korpus vor
  (`tests/fixtures/external/odt/listLevel10.odt`, siehe 4.2).

### 2.5 Liste aufheben
- Markierte Listenpunkte (oder Cursor in einem Punkt) → Klick auf „⇧ Liste" wandelt die
  betroffenen Punkte in normale Absätze um, Text bleibt vollständig erhalten,
  Bullet-Symbol verschwindet.
- Bei einer importierten mehrstufigen Liste: Aufheben eines Punkts auf einer tieferen
  Ebene sollte laut Word-Konvention zunächst nur eine Ebene anheben, nicht direkt in einen
  normalen Absatz springen — das tatsächliche Verhalten von `liftListItem` in diesem
  konkreten Fall ist zu verifizieren, nicht anzunehmen.

### 2.6 Wechsel zwischen Aufzählung und Nummerierung — und die „Toggle-off"-Frage
- Eine bestehende nummerierte Liste per Klick auf „• Liste" in eine Aufzählungsliste
  umwandeln (und umgekehrt, siehe `nummerierte-liste-req.md`) — Text und Reihenfolge
  bleiben erhalten, nur der Typ/das Symbol wechselt. Es darf **keine** verschachtelte
  Liste-in-Liste entstehen.
- **`toggleList` ist trotz seines Namens kein echtes Toggle.** `commands.ts` `toggleList`
  (Z. 57–60) ruft ausnahmslos `wrapInList(listType)` auf; es gibt **keine** vorgeschaltete
  Prüfung „Ist die Selektion bereits vollständig eine Aufzählungsliste? → stattdessen
  `liftListItem` (Liste aufheben) bzw. bei Nummerierung → in Aufzählung umwandeln". Anders
  als `toggleMark` bei Fett/Kursiv (`fett-req.md`) fehlt der „Aus"-Zweig völlig.
- Daraus folgen zwei Verdachtsmomente, die **empirisch** (echte Browser-Bedienung)
  nachzustellen und zu dokumentieren sind, statt sie anzunehmen:
  1. Erneuter Klick auf „• Liste", während der Cursor bereits in einer Aufzählungsliste
     steht → tut die Aktion sichtbar nichts (No-Op), erzeugt sie eine zusätzliche
     Verschachtelungsebene, oder hebt sie die Liste auf? `wrapInList` verweigert an der
     Spitze einer bestehenden Liste tendenziell die Aktion (stiller No-Op), kann bei
     späteren Punkten aber eine zusätzliche Wrap-/Join-Ebene einziehen — beides ist zu
     prüfen (Grenzfälle 3.2–3.4).
  2. Ein stiller No-Op widerspräche dem Prinzip „kein stiller Fehlschlag" (Hauptspezifikation
     Abschnitt 20) und muss entweder als akzeptierte Ausnahme dokumentiert oder durch ein
     echtes Toggle behoben werden.

### 2.7 Zusammenspiel mit anderen Features
- Zeichenformatierung (fett, kursiv, Farbe, …) innerhalb eines Listenpunkts funktioniert
  identisch zu einem normalen Absatz (Hauptspezifikation Abschnitt 3).
- Absatzausrichtung eines einzelnen Listenpunkts bleibt individuell einstellbar
  (`setAlign` wirkt auf `paragraph`/`heading`, `commands.ts` ~Z. 13–27) und wird bei
  Rundreise nicht auf einen Listen-Standard zurückgesetzt.
- Eine Aufzählungsliste **innerhalb einer Tabellenzelle** muss möglich sein und bei
  Rundreise erhalten bleiben (`table_cell`-Content ist `block+`; reale Fixtures vorhanden,
  siehe 4.2: `listsInTable.odt`, `simple-table-with-lists.odt`).
- Mehrere Blöcke pro Listenpunkt sind schema-seitig erlaubt (`list_item` = `block+`), z. B.
  ein Bild als zusätzlicher Block innerhalb eines Punkts. Beim Import einer Fremddatei darf
  das nicht zu Datenverlust führen (Reader fällt notfalls auf einen leeren Absatz zurück,
  damit `block+` erfüllt bleibt — `odt/reader.ts` ~Z. 296, `docx/reader.ts`). Reale
  Fixture: `tests/fixtures/external/odt/imageWithinList.odt`.
- Eine Überschrift (`heading`) ist schema-seitig als erster Block eines `list_item`
  **nicht** ausgeschlossen (`block+` erlaubt `heading`). Ob der Klick „• Liste" bei
  markierter Überschrift tatsächlich eine Liste erzeugt, hängt jedoch von `wrapInList`/
  `findWrapping` ab und ist empirisch zu prüfen (Grenzfall 3.5) — die frühere pauschale
  Aussage „scheitert strukturell" war unzutreffend und ist ersetzt.
- Undo/Redo: Jede der obigen Aktionen (Liste erstellen, aufheben, Typwechsel,
  Formatwechsel) muss einzeln rückgängig/wiederherstellbar sein, auch in Kombination mit
  reinem Tippen davor/danach. Listenbedienung ist ein Verdachtsfall für den in Abschnitt 2
  der Hauptspezifikation dokumentierten Selection-Sync-Bug, da Toolbar-Klick +
  anschließende Cursor-Neupositionierung genau dessen Muster entspricht
  (`reconcileSelectionOnClick`, `WordEditor.tsx` ~Z. 43–50).

---

## 3. Grenzfälle

1. **Leere Liste**: Liste erstellen und sofort wieder aufheben, ohne je Text einzugeben →
   kein verwaistes leeres `bullet_list`/`list_item`-Element im Dokumentmodell, kein Crash,
   `assertLoadableDocument` schlägt nicht an. Schema-Kontext (maßgeblich für die Prüfung):
   `bullet_list` = `'list_item+'` (`schema.ts` Z. 117), `list_item` = `'block+'` (Z. 147) —
   ein **strukturell** leeres `bullet_list` (ohne Punkt) bzw. `list_item` (ohne Block) ist
   damit schon schema-seitig **ungültig** und kann gar nicht erst entstehen. Der real zu
   prüfende Grenzfall ist deshalb nicht der leere Container, sondern ein zurückbleibender
   Listenpunkt mit nur einem leeren Absatz bzw. das saubere vollständige Verschwinden der
   Listenstruktur nach dem Aufheben.
2. **Einzelner Listenpunkt, erneuter Klick auf „• Liste"**: Liste mit genau einem Punkt,
   Cursor darin, nochmals „• Liste" → laut `wrapInList`-Verhalten voraussichtlich ein
   **stiller No-Op** (Button tut sichtbar nichts). Das widerspricht „kein stiller
   Fehlschlag" (Hauptspezifikation Abschnitt 20) und muss als akzeptierte Ausnahme
   dokumentiert oder behoben werden (echtes Toggle, siehe 2.6). Tatsächliches Ergebnis
   empirisch festhalten.
3. **Zweiter oder späterer Listenpunkt, erneuter Klick auf „• Liste"** (Liste ≥ 2 Punkte,
   Cursor im zweiten oder späteren Punkt): potenziell zusätzliche **Verschachtelung** statt
   No-Op oder Entfernen — mit echter Bedienung nachstellen und das sichtbare Ergebnis
   (verschachtelte Unterliste? unverändert? Fehler?) dokumentieren.
4. **Vollständige Selektion einer ganzen bestehenden Aufzählungsliste, erneuter Klick auf
   „• Liste"**: Selektion deckt die gesamte Liste ab (z. B. Strg+A über ein Dokument, das
   nur aus dieser Liste besteht) → prüfen, ob eine weitere, die gesamte Liste umschließende
   Verschachtelungsebene entsteht oder ein No-Op.
5. **Selektion über eine Überschrift hinweg**: Markierter Bereich enthält (auch) eine
   Überschrift, Klick auf „• Liste" → prüfen, ob (a) der gesamte Bereich (inkl.
   normaler Absätze) wirkungslos bleibt, (b) nur die Absätze zur Liste werden und die
   Überschrift ausgenommen bleibt, oder (c) auch die Überschrift Teil der Liste wird
   (schema-seitig zulässig, siehe 2.7). Beide „nichts passiert"-Varianten sind Kandidaten
   für einen stillen Fehlschlag und zu dokumentieren.
6. **Reale ODT-Datei mit echter mehrstufiger Verschachtelung** (Fixtures
   `tests/fixtures/external/odt/listLevel10.odt`, alternativ `EasyList.odt`) importieren →
   die Verschachtelung muss über die Rekursion in `elementToBlocks` (`odt/reader.ts`
   ~Z. 290) als ineinander liegende `bullet_list`/`ordered_list`-Knoten ankommen (begrenzt
   durch `MAX_NESTING_DEPTH = 25`) — mit dieser konkreten Datei nachweisen, nicht annehmen.
7. **`text:list-item` ohne führenden Absatz, nur mit direkt verschachteltem `text:list`**
   (bei manchen ODF-Erzeugern für reine „Container"-Unterlisten): Das Schema verlangt für
   `list_item` **nur** `block+` (`schema.ts` ~Z. 147) — ein Punkt, dessen einziger Inhalt
   ein verschachteltes `bullet_list` (oder ein Bild) ist, ist damit **gültig**. Der
   ProseMirror-Kommentar an dieser Stelle nennt exakt diesen Fall als Grund für `block+`
   statt `paragraph block*`. Frühere Fassungen dieses Dokuments behaupteten hier eine
   Schema-Validierungs-Exception („leere weiße Seite") — das ist **überholt/unzutreffend**.
   Trotzdem mit `listLevel10.odt`, `EasyListForeignNamespace.odt`,
   `EasyListForeignNamespaceMSO15_AOO.odt` prüfen, dass Import ohne Crash und ohne
   Textverlust gelingt.
8. **DOCX-Reimport einer echten mehrstufigen Liste** (Fixtures
   `tests/fixtures/external/docx/ComplexNumberedLists.docx`, `Numbering.docx`,
   `NumberingWOverrides.docx`) → da `listMarkerFor` (`docx/reader.ts` ~Z. 294–302) `w:ilvl`
   **mitliest** und `groupLists` (~Z. 379–440) daraus die Verschachtelung rekonstruiert,
   muss die Ebenenstruktur erhalten bleiben (nicht flach zusammenfallen). Frühere Fassungen
   behaupteten das Gegenteil („`w:ilvl` wird ignoriert, alles wird flach") — das ist
   **überholt**. Zu prüfen ist die tatsächliche Ebenen-Erhaltung, inkl. der Frage, ob diese
   Fixtures **Bullet**-Ebenen (nicht nur Nummerierung) enthalten.
9. **Bild oder Tabelle als einziger Inhalt eines Listenpunkts** (kein Text davor) →
   schema-seitig **zulässig** (`list_item` = `block+`). Zu prüfen: Import von
   `tests/fixtures/external/odt/imageWithinList.odt` erhält das Bild innerhalb des Punkts,
   und (falls über einen künftigen UI-Weg ein Bild in einen leeren aktiven Listenpunkt
   eingefügt wird) es entsteht kein Absturz. `insertImage` (`commands.ts` ~Z. 66–74) ersetzt
   die Selektion durch einen `image`-Node.
10. **„Liste aufheben" ohne dass der Cursor in einer Liste steht**: Button ist jederzeit
    klickbar (kein `disabled`, kein `aria-pressed`, Abschnitt 1 Zeile 3/4) → `liftListItem`
    liefert `false` und tut nichts, ohne sichtbare Rückmeldung. Kandidat für einen stillen
    Fehlschlag (Hauptspezifikation Abschnitt 20) — Verhalten dokumentieren oder Button
    kontextabhängig deaktivieren.
11. **Zwei getrennte Aufzählungslisten im selben Dokument, durch normalen Absatz getrennt**:
    Anders als bei nummerierten Listen hat die feste, geteilte `BULLET_NUM_ID`
    (`docx/styleDefs.ts` `BULLET_NUM_ID = 1`, ~Z. 34) für Aufzählungen **keine sichtbare
    Auswirkung**, da Bullets keinen fortlaufenden Zählwert besitzen. Die **strukturelle**
    Trennung bleibt beim Reimport erhalten: belegt durch `docx/__tests__/roundtrip.test.ts`
    „keeps two separate lists distinct when a paragraph separates them" (~Z. 167–176). Für
    ODT existiert dieser Unit-Test **nicht** (siehe Abschnitt 5, Punkt 8) und ist zu
    ergänzen; zusätzlich mit echter Bedienung (nicht nur konstruierten Daten) nachstellen.
12. **Zwei unmittelbar aufeinanderfolgende, inhaltlich getrennte Aufzählungslisten ohne
    trennenden Absatz** (z. B. durch Copy-Paste zweier Listen hintereinander) → sollen als
    zwei getrennte `bullet_list`-Knoten erkennbar bleiben. `groupLists` (`docx/reader.ts`)
    gruppiert beim Reimport anhand von `numId`/`ilvl`-Wechsel und dem Auftreten eines
    Nicht-Listen-Blocks, **nicht** anhand ursprünglicher Absatzgrenzen im Editor-Modell —
    daher ist zu prüfen, ob zwei benachbarte Bullet-Listen mit gleicher `numId` und ohne
    trennenden Absatz beim Reimport fälschlich zu einer einzigen Liste verschmelzen. (Für
    ODT entsteht durch die explizite `<text:list>`-Schachtelung eher keine Verschmelzung —
    beide Formate getrennt prüfen.)
13. **ODT: Listentyp-Fehlklassifikation zugunsten „bullet".** `parseAutomaticStyles`
    (`odt/reader.ts` ~Z. 70–75) liest `listKinds` ausschließlich aus den
    `text:list-style`-Elementen des `office:automatic-styles` von `content.xml`. Wird der
    referenzierte Stilname dort nicht gefunden (z. B. weil er nur in `styles.xml` definiert
    ist), greift in `elementToBlocks` der Fallback `|| 'bullet'` (~Z. 288). **Speziell für
    dieses Feature relevant:** Eine eigentlich **nummerierte** Liste würde dadurch
    fälschlich als **Aufzählungsliste** importiert — die Aufzählungsliste „gewinnt" Inhalt,
    der eine Nummerierung war. Gezielt mit `tests/fixtures/external/odt/listStyleId.odt` und
    `tests/fixtures/external/odt/ListStyleResolution.odt` prüfen.
14. **Undo unmittelbar nach Listenerstellung** (ein Schritt zurück) → stellt exakt den
    Zustand vor der Umwandlung wieder her (normale Absätze, keine Reste der Listenstruktur).
15. **Sehr lange Liste** (z. B. > 50 Punkte) → bleibt performant bedienbar, kein spürbares
    Einfrieren beim Tippen in einem späten Punkt.
16. **Datei mit bekannt abweichendem/„kaputtem" Listen-Markup** (Fixtures
    `tests/fixtures/external/odt/brokenList.odt`, `ListOddity.odt`) → definierter Fallback
    statt stillem Datenverlust oder Absturz (Hauptspezifikation Abschnitt 18).
    `brokenList.odt` ist in `odt/__tests__/external-fixtures.test.ts` bewusst aus den
    Vitest/jsdom-Tests ausgeschlossen (jsdom-Performance bei ~20k automatischen Stilen, kein
    Produktfehler) und stattdessen über `tests/e2e/large-document-import.spec.ts` abgedeckt —
    zu prüfen, ob dieser E2E-Test die **Listenstruktur** inhaltlich verifiziert oder nur
    „stürzt nicht ab".
17. **Aufzählungsliste im Editor innerhalb einer Tabellenzelle erzeugen**: Cursor in
    einer `table_cell` (Content-Modell `block+`), Klick auf „• Liste" → `wrapInList` soll den
    Zellabsatz zu einer Aufzählungsliste **innerhalb derselben Zelle** machen, ohne die
    Tabellenstruktur (Zeilen/Spalten/`colspan`/`rowspan`) zu beschädigen. Ergänzt den reinen
    Import-/Rundreise-Nachweis aus 2.7 (Fixtures `listsInTable.odt`,
    `simple-table-with-lists.odt`) um den **Erzeugungsweg über die Toolbar** — empirisch zu
    prüfen, weil `wrapInList`/`findWrapping` im Zellkontext ein zulässiges Wrapping finden
    muss; scheitert es, greift der geforderte `disabled`-Zustand (Grenzfall 3.10-Muster) als
    sichtbare Rückmeldung statt eines stillen No-Op.
18. **Externes HTML mit Listen-Markup per Zwischenablage einfügen** (Abschnitt 1, Zeile 12;
    Abschnitt 2.4): Da kein eigener `transformPasted`-Hook existiert, muss das Einfügen von
    HTML mit `<ul>`/`<ol>`/`<li>` — **nicht** aus dem eigenen Editor kopiert, sondern z. B.
    per `page.evaluate(...)` synthetisch auf die Zwischenablage geschrieben (die Chromium-/
    Mobile-E2E-Projekte gewähren bereits `clipboard-read`/`clipboard-write`,
    `playwright.config.ts` Z. 34–35) oder aus einer echten externen Quelle kopiert — zu einer
    echten `bullet_list`/`ordered_list`-Struktur führen, nicht zu flachem Text mit
    Aufzählungszeichen als Literalzeichen. Zwei Teilfälle, beide bislang **ungetestet**:
    1. **Einstufiges, fremd erzeugtes HTML** (z. B. `<ul><li>A</li><li>B</li></ul>` ohne
       app-eigene Attribute/Wrapper-Elemente) → prüfen, ob ProseMirrors Default-Parsing über
       die reinen Tag-Regeln (`ul`/`li`, ohne Abhängigkeit von app-spezifischem Markup) eine
       echte Liste erzeugt.
    2. **Zweistufig verschachteltes HTML** (`<ul><li>A<ul><li>B</li></ul></li></ul>`) → da der
       Editor selbst keine Verschachtelung erzeugen kann (Editor-Erzeugung fehlt, s. o.), wäre
       dies neben Fremddatei-Import der **einzige** Weg, eine verschachtelte Liste ohne Upload
       in den Editor zu bringen; empirisch klären, ob die Verschachtelung erhalten bleibt oder
       (z. B. durch generisches Aufräumen der Paste-Slice) auf eine Ebene abflacht.
    `tests/e2e/clipboard.spec.ts` „Testfall (2.2/4)" (Abschnitt 1, Zeile 12) deckt nur den
    Rundlauf app-eigenen HTMLs für eine **einstufige** Liste ab und ersetzt diesen Grenzfall
    nicht.

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede folgende Kombination gilt: **Datei/Zustand A → unverändert exportieren →
Ergebnis erneut importieren → Inhalt entspricht A** (Listentyp Aufzählung vs.
Nummerierung, Punktzahl, Reihenfolge, Verschachtelungsebene). „Unverändert exportieren"
bedeutet: Datei wird hochgeladen bzw. im Editor erzeugt und **ohne jede Bearbeitung**
direkt wieder exportiert — dies deckt reine Lese-/Schreib-Symmetriefehler auf.

### 4.1 Im Editor selbst erzeugbare bzw. programmatisch konstruierbare Listen
1. Einfache einstufige Aufzählungsliste (3 Punkte) → als DOCX exportieren → mit einem
   **unabhängigen** Parser (direktes XML-Parsen von `word/document.xml` und
   `word/numbering.xml`, nicht nur dem eigenen Reader) prüfen: jeder Absatz trägt
   `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`, `numbering.xml` enthält
   den `<w:abstractNum>` mit `<w:numFmt w:val="bullet"/>` und `<w:lvlText w:val="•"/>` auf
   Ebene 0 → reimportieren → weiterhin 3 Punkte, korrekte Reihenfolge, weiterhin
   `bullet_list` (nicht nummeriert, nicht Klartext). Ein unabhängiger-Parser-Test für den
   einfachen Fall existiert bereits (`docx/__tests__/external-validation.test.ts`) und ist
   einzubeziehen/zu erweitern.
2. Dasselbe als ODT: `content.xml` enthält `<text:list text:style-name="LB">` mit drei
   `<text:list-item>`; `automatic-styles` enthält `<text:list-style style:name="LB">` mit
   `<text:list-level-style-bullet text:bullet-char="•">`.
3. **Zweistufige (verschachtelte) Aufzählungsliste** → Rundreise DOCX **und** ODT: die
   innere Ebene bleibt eine eigene, im äußeren `list_item` eingebettete Liste (nicht
   flach). Für DOCX zusätzlich prüfen: Ebene 1 trägt `<w:ilvl w:val="1"/>` und (gemäß
   `BULLET_GLYPHS`) das Zeichen „◦". Dieser Fall ist bereits durch Unit-Tests
   („preserves a nested list two levels deep") und E2E (`roundtrip-fidelity.spec.ts`)
   abgedeckt und muss dauerhaft grün bleiben.
4. Aufzählungsliste mit Fett/Kursiv/Farbe im Listentext → Rundreise erhält
   Zeichenformatierung zusätzlich zur Listenstruktur, DOCX **und** ODT.
5. Aufzählungsliste innerhalb einer Tabellenzelle → Rundreise DOCX und ODT.
6. Zwei getrennte Aufzählungslisten (mit trennendem Absatz, Grenzfall 3.11, und ohne
   trennenden Absatz, Grenzfall 3.12) → Rundreise DOCX und ODT, beide Varianten bleiben
   nach Reimport als zwei getrennte Listen erkennbar. (ODT-Unit-Test hierfür fehlt bisher.)
7. Wechsel Aufzählung ↔ Nummerierung auf derselben Liste (2.6) → am Ende exportierter
   Zustand entspricht dem zuletzt gewählten Typ, keine Reste des anderen Typs, keine
   Verschachtelung.
8. Cross-Format: im Editor erzeugte Aufzählungsliste als ODT exportieren, reimportieren,
   als DOCX exportieren, reimportieren (doppelte Rundreise) → Struktur inhaltlich
   identisch über beide Konvertierungen; dabei die DOCX/ODT-Symbol-Asymmetrie je Ebene
   (2.2) explizit als erwartetes/dokumentiertes Verhalten festhalten.
9. Liste direkt am Dokumentanfang bzw. -ende → nach Export/Reimport weiterhin normal
   editierbar (Cursor davor/danach positionierbar, neuer Absatz einfügbar).

### 4.2 Import realer Fremddateien (bereits im Repository vorhandene Testfixtures)
Diese Dateien liegen unter `tests/fixtures/external/docx/` bzw. `…/odt/` und sind für die
Verifikation dieses Features zu verwenden (nicht nur selbst konstruierte Minimalbeispiele):

- ODT-Kernfixtures einfache Aufzählungsliste: `bulletListTest.odt`, `bullet_list.odt`,
  `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`,
  `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` — je: Import → als Aufzählungsliste
  erkennbar → unverändert exportieren → Reimport → Punktzahl/Text/Typ identisch.
- ODT echte Verschachtelung (für 3.6/3.7): `EasyList.odt`, `EasyListForeignNamespace.odt`,
  `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt`.
- ODT Liste in Tabellenzelle (für 2.7): `listsInTable.odt`, `simple-table-with-lists.odt`.
- ODT Bild als Blockinhalt eines Listenpunkts (für 3.9): `imageWithinList.odt`.
- ODT Auflösung von Listenstilen über Referenzen statt Inline-Definition (für 3.13):
  `listStyleId.odt`, `ListStyleResolution.odt`.
- ODT bekannt abweichendes/fehlerhaftes Markup (für 3.16): `brokenList.odt`, `ListOddity.odt`.
- ODT expliziter Rundreise-Testfall: `ListRoundtrip.odt`; Fortsetzungs-Liste:
  `ContinueListTest.odt` (v. a. für Nummerierung, hier zur Kontrolle, dass Bullet-Teile nicht
  fälschlich nummeriert ankommen).
- Restliche Listen-Fixtures mit vermutlich einfacherem Bullet-Inhalt (`list.odt`, `liste2.odt`,
  `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`,
  `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt`) —
  Basisabdeckung: Import ohne Absturz/Textverlust, Rundreise erhält den Textinhalt jedes Punkts.
- DOCX: dedizierte „nur Bullet"-Fixtures fehlen im Korpus; `ComplexNumberedLists.docx`,
  `Numbering.docx`, `NumberingWithOutOfOrderId.docx`, `NumberingWOverrides.docx` sind daraufhin
  zu prüfen, ob sie **auch** Aufzählungsebenen enthalten, und entsprechend einzubeziehen.
  `NumberingWithOutOfOrderId.docx` ist zusätzlich Testfall für die Frage, ob die Zuordnung
  `numId → bullet/ordered` (`parseNumberingXml`) bei nicht-fortlaufenden/`abstractNumId`-
  Umwegen korrekt bleibt.

**Vorgabe:** Für jede genannte Fixture ist mindestens ein automatisierter Test erforderlich,
der (a) den Import ohne Absturz/Datenverlust prüft und (b) die Rundreise auf inhaltliche
Gleichheit prüft. Der generische `external-fixtures.test.ts` prüft bislang nur „stürzt nicht
ab" (kein Struktur-Assert) — das genügt für die Abnahme dieses Features **nicht**.

### 4.3 Cross-Format-Kontrast Aufzählung vs. Nummerierung (zur Kenntnisnahme)
Im Unterschied zur nummerierten Liste hat die geteilte, feste Listen-ID/-Stilname pro Typ
(`BULLET_NUM_ID`/`BULLET_LIST_STYLE_NAME`) für Aufzählungen keine sichtbare Auswirkung auf den
dargestellten Inhalt, da Bullets keinen Zählwert tragen. Diese Einordnung ist selbst zu
verifizieren: durch einen Rundreise-Test mit **zwei** benachbarten Bullet-Listen bestätigen
(nicht nur argumentieren), da ein gemeinsamer Listenstil in Randfällen dennoch zu ungewollter
Vereinheitlichung von Einrückung/Abstand (`text:space-before`, `text:min-label-width`,
`odt/styleRegistry.ts` ~Z. 100) zwischen eigentlich unabhängigen Listen führen könnte.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer Durchsicht des **aktuellen** Quellcodes und sind als
zu bestätigende/zu widerlegende Ansatzpunkte zu verstehen. Wichtig: Eine frühere Fassung
dieses Dokuments beschrieb einen älteren Codestand und enthielt mehrere inzwischen
**überholte** Aussagen (u. a. „DOCX-Export/Import ignoriert Verschachtelungsebenen",
„nur ein Bullet-Symbol", „`list_item` verlangt `paragraph block*`", „kein einziger
Listen-E2E-Test"). Diese sind unten korrigiert.

**Weiterhin zutreffend (offene Lücken):**
1. **Kein Ein-/Ausrücken im Editor.** Weder Tab/Umschalt+Tab noch ein Toolbar-Button ändern
   die Verschachtelungsebene; `sinkListItem` wird nirgends importiert. Damit kann im Editor
   selbst **keine** mehrstufige Liste erzeugt werden (nur per Import/Paste). Backlog:
   `liste-einruecken-tab`/`mehrstufige-liste`/`einzugsebene-*`, alle „fehlt".
2. **`toggleList` ist kein echtes Toggle.** `commands.ts` (Z. 57–60) ruft ausnahmslos
   `wrapInList` auf; der „Aus"-/Typ-Umschalt-Zweig fehlt. Kernbedienung „Aufzählung an/aus" —
   höchste Priorität für die empirische Prüfung (Grenzfälle 3.2–3.4, Abschnitt 2.6).
3. **Aktiver Zustand des Toolbar-Buttons fehlt.** Der „• Liste"-Button hat kein
   `aria-pressed`/aktiv-Styling, im Gegensatz zu Mark-, Align- und Tabelle-Button; es gibt
   keine `isInBulletList`-Hilfsfunktion (Abschnitt 1, Zeile 4).
4. **Kein frei wählbares Aufzählungszeichen.** Weder UI noch Datenmodell erlauben ein anderes
   Zeichen als die fest definierten Glyphen (Abschnitt 1 Zeile 6; 2.2). Backlog
   `eigene-aufzaehlungszeichen`, Priorität 4 — falls dauerhaft nicht gebaut, explizit als
   Einschränkung dokumentieren.
5. **Keine Input Rules.** Kein Auto-Umwandeln von „- "/„* " in eine Liste (Abschnitt 1
   Zeile 7).
6. **ODT-Listentyp-Erkennung fällt im Zweifel auf „bullet" zurück** (`odt/reader.ts` ~Z. 288,
   `|| 'bullet'`). Für dieses Feature bedeutet das: eine Aufzählungsliste kann fälschlich
   Inhalt „gewinnen", der eigentlich nummeriert war (Grenzfall 3.13) — speziell aus Sicht
   dieses Features (nicht des Nummerierungs-Features) zu prüfen.
7. **Tastatur-Bedienbarkeit der Buttons unklar** (nur `onMouseDown`, kein `onClick`,
   Abschnitt 1 Zeile 8) — betrifft alle Toolbar-Buttons, hier für die Listen-Gruppe zu
   verifizieren.

**Korrigiert gegenüber der Vorfassung (nun implementiert / anders als behauptet):**
8. **Verschachtelung wird von Reader/Writer beider Formate abgebildet und round-trippt.**
   - DOCX-Export: `blockToDocx` mit `ListContext`, `MAX_LIST_ILVL = 8`, schreibt echtes
     `w:ilvl` (`docx/writer.ts` ~Z. 103–156).
   - DOCX-Import: `listMarkerFor` liest `w:ilvl` (~Z. 294–302), `groupLists` rekonstruiert
     die Schachtelung (~Z. 379–440).
   - `numberingXml` definiert alle 9 Ebenen mit zyklischen Glyphen `['•','◦','▪']`
     (`docx/styleDefs.ts` ~Z. 43/50–74).
   - ODT-Export/-Import bilden Schachtelung rekursiv ab (`odt/writer.ts` ~Z. 99–109;
     `odt/reader.ts` ~Z. 286–299).
   - Belegt durch grüne Tests: `docx`/`odt` `roundtrip.test.ts` „preserves a nested list two
     levels deep"; `tests/e2e/roundtrip-fidelity.spec.ts` (DOCX **und** ODT, `li ul, li ol`
     = 1 vor/nach Rundreise). → Die **Persistenz** der Verschachtelung ist damit
     Regressions-relevant und darf nicht brechen; sie ist **nicht** neu zu bauen.
9. **Es gibt bereits Listen-E2E-Tests.** Der „• Liste"-Button wird per echtem Playwright-Klick
   `getByTitle('Aufzählung')` bedient in `tests/e2e/clipboard.spec.ts` (~Z. 182, 462),
   `tests/e2e/clipboard-roundtrip.spec.ts` (~Z. 215; auch „Nummerierte Liste", ~Z. 226) und
   `tests/e2e/cut.spec.ts` (~Z. 306). Diese Klicks dienen größtenteils der Einrichtung von
   Clipboard-/Cut-Szenarien, **nicht** der Verifikation der Akzeptanzkriterien dieses
   Features — mit einer Ausnahme: `clipboard.spec.ts` „Testfall (2.2/4)" (~Z. 170–201)
   kopiert eine einstufige Liste aus dem eigenen Editor und prüft per Assertion
   (`pastedEditor.locator('li')`), dass sie nach Einfügen in ein neues Dokument als
   echte Liste (nicht als flacher Text) ankommt — das ist bereits ein echter, wenn auch
   auf den app-eigenen Rundlauf beschränkter Nachweis (siehe Punkt 12). → Darüber hinaus
   fehlt weiterhin ein **dediziertes** Listen-E2E-Spec (Erstellen aus Selektion /
   Mehrfach-Absatz, Toggle-off, Aufheben, Verschachtelungs-Rundreise, aktiver Zustand). Das
   ist zu ergänzen; die Behauptung der Vorfassung „kein einziger Listen-E2E-Test" war falsch.

**Bekannte Testabdeckung (Unit), damit nicht doppelt gebaut wird:**
10. `docx/__tests__/roundtrip.test.ts` deckt ab: Bullet mit mehreren Punkten, Bullet vs.
    Ordered, „zwei getrennte Listen mit trennendem Absatz" (nur DOCX, ~Z. 167–176),
    zweistufige Verschachtelung, sowie Bullet im Gesamt-/Mixed-Block-Dokument.
    `docx/__tests__/external-validation.test.ts` validiert eine Bullet+Ordered-Liste mit einem
    **unabhängigen** Parser. Das ODT-Pendant (`odt/roundtrip.test.ts`) deckt Bullet/Ordered/
    Verschachtelung ab, **nicht** aber „zwei getrennte Listen mit trennendem Absatz" — diese
    Lücke ist zu schließen.
11. **Kein Unit-Test für `toggleList`/`liftFromList`.** `src/formats/shared/editor/__tests__/
    commands.test.ts` enthält **keine** Listen-Testfälle. Das befehlsseitige Verhalten
    (insb. das Nicht-Toggle aus Punkt 2) ist bisher nirgends direkt getestet.
12. **Neu identifizierte Lücke dieser Prüfung: Listenerzeugung durch Einfügen fremden
    HTML-Markups ist unverifiziert.** Abschnitt 1 (Zeile 12) und Abschnitt 2.4 behaupten,
    dass Copy-Paste von HTML mit `<ul>/<li>` neben dem Fremddatei-Import der einzige Weg
    ist, eine (ggf. verschachtelte) Liste ohne die fehlende Editor-Ein-/Ausrück-Funktion in
    den Editor zu bringen. Es existiert **kein** eigener `transformPasted`-Hook (nur
    `clipboardTextSerializer` für die Klartext-Kopie, `clipboard.ts`), das Einfügen verlässt
    sich vollständig auf ProseMirrors Standard-Schema-Parsing. Der einzige existierende
    Test in diese Richtung (`clipboard.spec.ts` „Testfall (2.2/4)", Punkt 9) deckt nur eine
    **einstufige** Liste ab, die aus dem **eigenen** Editor kopiert wurde — nicht fremd
    erzeugtes HTML-Markup (andere Attribute/Struktur) und nicht Mehrstufigkeit. Neu als
    Grenzfall 3.18 aufgenommen und in Abschnitt 6 (Testfälle) referenziert.

**Einordnung:** Der Backlog-Status „vorhanden" trifft auf den Kern zu (einstufige Liste
anlegen/aufheben, Bullet von Nummeriert unterscheidbar, Verschachtelung persistiert), ist aber
in genau den Punkten 1–3 (kein Editor-Ein-/Ausrücken, kein echtes Toggle, kein aktiver
Button-Zustand), in der fehlenden dedizierten Verifikation (Punkt 9) und in der unverifizierten
Listenerzeugung per Fremd-HTML-Paste (Punkt 12, Grenzfall 3.18) noch **nicht
vertrauenswürdig abgenommen**.

---

## 6. Testfälle (Zusammenfassung, Pflichtumfang)

1. Liste erstellen (Cursor ohne Selektion; Selektion über mehrere Absätze) — beide Wege per
   echtem Playwright-Klick auf „• Liste".
2. Enter-Verhalten: nicht-leerer Punkt (neuer Punkt), leerer Punkt (beendet Liste), Cursor
   mittig (Split), Umschalt+Enter (Zeilenumbruch ohne neuen Punkt).
3. Erneuter Klick auf „• Liste" bei bereits aktiver Liste — am ersten Punkt, an einem späteren
   Punkt, bei Selektion der gesamten Liste (Grenzfälle 3.2–3.4) — tatsächliches Ergebnis
   jeweils dokumentieren.
4. Wechsel Aufzählung ↔ Nummerierung ohne Verschachtelung/Datenverlust (2.6, beide Richtungen,
   im Zusammenspiel mit `nummerierte-liste-req.md`).
5. „Liste aufheben" — Text bleibt vollständig erhalten; auch der No-Op-Fall (Cursor nicht in
   Liste, Grenzfall 3.10) mit dokumentiertem Verhalten.
6. Ein-/Ausrücken per Tab/Umschalt+Tab: Funktion fehlt (Abschnitt 5, Punkt 1) → expliziter
   Test, der das aktuelle **Fehlen** nachweist und im Ergebnisbericht als offene Lücke
   markiert, statt stillschweigend übersprungen zu werden.
7. **Verschachtelungs-Rundreise** (Persistenz vorhanden, Abschnitt 4.1 Punkt 3): zweistufige
   Bullet-Liste als Modell/Import → Rundreise DOCX **und** ODT → innere Ebene bleibt
   eingebettet; für DOCX zusätzlich `w:ilvl="1"` und Glyph „◦" prüfen. Bestehende grüne Tests
   nicht duplizieren, aber in die Feature-Abnahme referenzieren.
8. Zusammenspiel: Zeichenformatierung, Absatzausrichtung, Liste in Tabellenzelle, Bild in
   Listenpunkt (Fremddatei `imageWithinList.odt`), Undo/Redo über gemischte Sequenzen inkl.
   Toolbar-Klick + Cursor-Neupositionierung (Selection-Sync-Regressionsmuster,
   Hauptspezifikation Abschnitt 2).
9. Alle Grenzfälle aus Abschnitt 3 (1–18) einzeln als eigener Testfall — insbesondere
   Grenzfall 3.18 (Einfügen von fremd erzeugtem, ggf. verschachteltem HTML-Listen-Markup
   per Zwischenablage), der über den bestehenden, nur app-internen Rundlauf in
   `clipboard.spec.ts` „Testfall (2.2/4)" hinausgeht und bislang durch keinen Test
   abgedeckt ist.
10. Rundreise DOCX **und** ODT für jede Konfiguration aus Abschnitt 4.1, inkl. Validierung
    mit einem **unabhängigen** Parser/Schema (nicht nur dem eigenen Reader), analog
    Hauptspezifikation Abschnitt 19.
11. Import + Rundreise für jede reale Fixture aus Abschnitt 4.2 — kein Test gilt als
    abgeschlossen, solange nicht mindestens diese Dateien einbezogen wurden, inkl. der
    ODT-Listentyp-Fallback-Frage (Grenzfall 3.13).
12. `aria-pressed`/aktiver Zustand des „• Liste"-Buttons — Test, der den Cursor in/außerhalb
    einer Aufzählungsliste bewegt und den sichtbaren Button-Zustand prüft (Funktion muss ggf.
    erst ergänzt werden, Abschnitt 1 Zeile 4).
13. Tastatur-Bedienbarkeit des Buttons ohne Maus (Tab-Fokus + Enter/Leertaste, Abschnitt 1
    Zeile 8).
14. Unit-Test für `toggleList`/`liftFromList` (Abschnitt 5, Punkt 11) — insbesondere der
    Nicht-Toggle-Fall, damit ein späteres echtes Toggle als bewusste Änderung sichtbar wird.

---

## 7. Definition of Done

Das Feature „Aufzählungsliste (Bullet)" gilt erst dann als verifiziert und
vertrauenswürdig, wenn:

- jeder Punkt aus Abschnitt 2 (gewünschtes Verhalten) über echte Bedienung im Browser
  nachgewiesen ist (nicht nur über konstruierte Reader/Writer-Testdaten),
- jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite verbleibenden
  Test hat,
- die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
  gelisteten realen Fixtures nachgewiesen ist, inkl. mindestens einer Validierung mit einem
  unabhängigen Parser/Schema,
- die **Verschachtelungs-Persistenz** (Abschnitt 4.1 Punkt 3 / Abschnitt 5 Punkt 8) durch
  dauerhaft grüne Unit- **und** E2E-Tests abgesichert bleibt (Regressionsschutz),
- die noch offenen Lücken aus Abschnitt 5 (Punkte 1–3: Editor-Ein-/Ausrücken, echtes
  Toggle, aktiver Button-Zustand) entweder umgesetzt **oder** als bewusst nicht unterstützt
  klar dokumentiert sind — insbesondere Punkt 2 (kein echtes Toggle) darf nicht offen
  bleiben, da er die Kernbedienung „Aufzählung an/aus" betrifft,
- die in Abschnitt 5 Punkt 9 festgestellte Lücke „kein **dediziertes** Listen-E2E-Spec"
  geschlossen ist (mindestens die Testfälle aus Abschnitt 6),
- die in Abschnitt 5 Punkt 10 genannte fehlende ODT-Entsprechung des Tests „zwei getrennte
  Listen mit trennendem Absatz" ergänzt ist,
- die in Abschnitt 5 Punkt 12 / Grenzfall 3.18 festgestellte Lücke (Listenerzeugung durch
  Einfügen fremden bzw. mehrstufig verschachtelten HTML-Listen-Markups per Zwischenablage
  ist unverifiziert) durch mindestens je einen Test für den einstufigen und den
  verschachtelten Fall geschlossen ist,
- kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (Hauptspezifikation
  Abschnitt 20: jede nicht ausführbare Aktion muss sichtbar zurückmelden) — insbesondere die
  Grenzfälle 3.2, 3.5 und 3.10.

Erst nach Erfüllung aller Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)" auf „verifiziert" geändert werden.
