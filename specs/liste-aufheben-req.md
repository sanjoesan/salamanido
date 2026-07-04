# Anforderung: Liste aufheben

Status: **vorhanden laut Backlog — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen
die die Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird,
bevor der Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 2.6 („Listen"), Zeile `liste-aufheben` —
Titel „Liste aufheben", Beschreibung „Wandelt Listenpunkte zurück in normale Absätze,
Text bleibt erhalten.", Priorität 1 (essenziell/fundamental).

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 5
„Listen") sowie an den bereits vorliegenden Einzel-Anforderungen
`specs/ausrichtung-links-req.md` und `specs/nummerierte-liste-req.md`: Referenztabelle
mit Code-Fundstellen, danach Soll-Verhalten in Fließtext/Listen je Aspekt, danach
Grenzfälle, danach Rundreise-Pflicht (Upload unverändert → Export → Re-Import erhält
Inhalt) für **beide** Formate (DOCX und ODT), danach nummerierte Testfälle.

Explizit **nicht** alleiniger Gegenstand dieser Anforderung (eigene bzw. noch zu
schreibende Backlog-Einträge/Anforderungsdateien):
- `aufzaehlungsliste` / `nummerierte-liste` — das *Erzeugen* einer Liste
  (`toggleList`/`wrapInList`). `specs/nummerierte-liste-req.md` existiert bereits und
  behandelt Erzeugen, Enter-Verhalten, Ein-/Ausrücken, Fortsetzen/Neustart im Detail.
  Diese Datei hier behandelt ausschließlich das **Aufheben** einer bestehenden Liste
  (Button „⇧ Liste" / `liftFromList()`), verweist aber an den Stellen, an denen beide
  Features denselben Code-Pfad oder dieselbe offene Frage teilen (insbesondere
  Mehrstufigkeit), explizit auf `specs/nummerierte-liste-req.md`, statt die dortige
  Analyse zu duplizieren.
- `mehrstufige-liste` / `liste-einruecken-tab` — laut Backlog Status „fehlt": Es gibt
  aktuell **keine** UI-Möglichkeit (kein Toolbar-Button, keine Tastenkombination), im
  Editor selbst eine mehrstufige/verschachtelte Liste zu erzeugen (siehe Referenztabelle,
  Zeile „Ein-/Ausrücken"). Das begrenzt den in der Praxis über die reine UI-Bedienung
  erreichbaren Anwendungsfall von „Liste aufheben" auf einstufige Listen — der
  mehrstufige Fall ist trotzdem **nicht** irrelevant, da er über einen ODT-Import einer
  echten verschachtelten Fremddatei sehr wohl im Dokumentmodell entstehen kann (siehe
  Abschnitt 3.6/4.4 unten) und dann ebenfalls per „Liste aufheben" bedient werden muss.

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen):

| Ebene | Fundstelle |
|---|---|
| Schema: Listenknoten | `src/formats/shared/schema.ts:74-81` (`bullet_list`, Content `list_item+`), `:83-96` (`ordered_list`, zusätzliches Attribut `start`, Default `1`), `:98-104` (`list_item`, Content **`paragraph block*`** — ein Listenpunkt kann also mehr als nur einen Absatz enthalten, z. B. eine verschachtelte Liste, ein Bild oder eine Tabelle als weiteren Block) |
| Befehl „Liste aufheben" | `src/formats/shared/editor/commands.ts:62-64`, `liftFromList()`: reiner Alias-Wrapper um `liftListItem(wordSchema.nodes.list_item)` aus der Bibliothek `prosemirror-schema-list` (Import `commands.ts:2`) — **kein** eigener Code, keine projektspezifische Sonderbehandlung |
| Semantik von `liftListItem` (Bibliothekscode, `node_modules/prosemirror-schema-list/dist/index.js`) | Ermittelt per `$from.blockRange($to, pred)` den von der Selektion abgedeckten Bereich, wobei `pred` verlangt, dass der unmittelbare Elternknoten der betroffenen Blöcke ein erstes Kind vom Typ `list_item` hat. Ist dieser Elternknoten selbst wieder ein `list_item` (d. h. die Selektion befindet sich in einer **verschachtelten** Liste), wird `liftToOuterList` aufgerufen: der/die betroffenen Punkte werden nur **eine Ebene** höher in die äußere Liste gehoben — bleiben also weiterhin ein Listenpunkt, nur weniger tief verschachtelt. Nur wenn die Selektion in der **obersten** Listenebene liegt, wird `liftOutOfList` aufgerufen, was die Punkte tatsächlich in normale Geschwister-Blöcke (`paragraph` bzw. sonstige im Punkt enthaltene Blöcke) außerhalb jeder Liste umwandelt. **Konsequenz:** Ein einzelner Klick auf „Liste aufheben" wandelt einen mehrstufig verschachtelten Punkt **nicht** direkt in einen normalen Absatz um, sondern rückt ihn zunächst nur aus — deckungsgleich mit der in `specs/nummerierte-liste-req.md` Abschnitt 2.6 offen gelassenen Frage („Word-Konvention: erst Ebene anheben, erst beim Erreichen der obersten Ebene zum normalen Absatz"), hier aber anhand des tatsächlichen Bibliothekscodes bestätigt, nicht nur vermutet |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:214-224`: `title="Liste aufheben"`, Label-Text `"⇧ Liste"` (Zeile 223), `onMouseDown` ruft `run(view, liftFromList())` (Zeile 219). **Kein** `aria-label`, **kein** `aria-pressed`/aktiver Zustand, **kein** `disabled`-Zustand außerhalb einer Liste — im Unterschied zu `MarkButton` (Fett/Kursiv/Unterstrichen/Durchgestrichen, `Toolbar.tsx:28-61`), das zusätzlich zu `title` auch `aria-label` und `aria-pressed` setzt |
| Nachbar-Buttons (Kontext) | `Toolbar.tsx:192-202` „• Liste" (`toggleList(false)`), `:203-213` „1. Liste" (`toggleList(true)`) — ebenfalls ohne aktiven Zustand; alle drei Listen-Buttons liegen in derselben Toolbar-Gruppe direkt hintereinander |
| Tastenkombination | **Keine vorhanden** — weder für „Liste aufheben" selbst noch für Ein-/Ausrücken. Kein `Tab`/`Shift-Tab`-Eintrag in der Keymap (`WordEditor.tsx:71-79`), `sinkListItem` wird im gesamten Projekt-Quellcode (außerhalb von `node_modules`) nirgends importiert oder verwendet |
| Enter-Verhalten (verwandter, aber separater Code-Pfad) | `WordEditor.tsx:75`: `Enter: splitListItem(wordSchema.nodes.list_item)`. `splitListItem` (Bibliothekscode) enthält einen Sonderfall für einen **leeren** Listenpunkt am Ende der Liste, der diesen unter bestimmten Tiefenbedingungen aus der Liste heraushebt („Enter auf leerem Punkt beendet Liste", siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 5 und `specs/nummerierte-liste-req.md` Abschnitt 2.3) — **das ist ein anderer Mechanismus als der explizite „Liste aufheben"-Button** und nicht Gegenstand dieser Anforderung, wird aber unten (Grenzfall 4.7) als Abgrenzung erwähnt, da beide bei der Verifikation leicht verwechselt werden können |
| DOCX-Export von Listen | `src/formats/docx/writer.ts:112-118`: `bullet_list`/`ordered_list` werden **nicht** als eigene XML-Elemente geschrieben, sondern rekursiv auf ihre `list_item`-Kinder „durchgereicht" (`flatMap`); jeder daraus entstehende Absatz bekommt über `blockToDocx(..., numId)` (Parameter `listNumId`, Zeile 98) ein `<w:numPr>` mit **fest** `<w:ilvl w:val="0"/>` (Zeile 103) — unabhängig von einer eventuell im Dokumentmodell vorhandenen tieferen Verschachtelung |
| DOCX-Nummerierungsdefinition | `src/formats/docx/styleDefs.ts:32-47`: genau **zwei** globale, feste Nummerierungs-IDs (`BULLET_NUM_ID=1`, `ORDERED_NUM_ID=2`), je nur **eine** Ebene (`w:ilvl="0"`) definiert; kein `w:startOverride`, kein zweites `w:lvl` für tiefere Ebenen |
| DOCX-Import von Listen | `src/formats/docx/reader.ts:192-201` (`listMarkerFor`) liest **nur** `w:numId`, **nicht** `w:ilvl`, aus `w:pPr/w:numPr`. `groupLists` (`reader.ts:258-283`) gruppiert Absätze rein anhand von `numId`-Gleichheit und beendet eine Gruppe, sobald ein Absatz **ohne** `numPr` dazwischen auftaucht (Zeile 276-279: `else { flush(); result.push(block) }`) — jede echte Ebenen-Information (`w:ilvl`) geht beim Import vollständig verloren, eine real mehrstufige DOCX-Liste (z. B. `ComplexNumberedLists.docx`) wird beim Import als **eine einzige flache** Liste abgebildet |
| ODT-Export von Listen | `src/formats/odt/writer.ts:75-85`: rekursiver, generischer Aufruf von `blockToOdt` über `item.content` — verschachtelte `bullet_list`/`ordered_list`-Knoten **innerhalb** eines `list_item` werden dadurch tatsächlich strukturell korrekt als verschachteltes `<text:list>` geschrieben (im Unterschied zu DOCX). Beide Ebenen referenzieren jedoch **denselben** Listenstil (`BULLET_LIST_STYLE_NAME`/`ORDERED_LIST_STYLE_NAME`, `styleRegistry.ts:95-96`), der nur eine einzige Formatdefinition für `text:level="1"` enthält (`styleRegistry.ts:98-101`) — für tiefere Ebenen ist damit keine eigene Einzugs-/Formatdefinition vorhanden |
| ODT-Import von Listen | `src/formats/odt/reader.ts:69-74` (Listenart Bullet/Ordered je Stilname), `:159-187` (`elementToBlocks`): rekursiv, ein verschachteltes `<text:list>` **innerhalb** eines `<text:list-item>` wird korrekt als verschachtelter `bullet_list`/`ordered_list`-Block im Dokumentmodell abgebildet (Tiefenbegrenzung `MAX_NESTING_DEPTH=25`, Zeile 162) — **im Unterschied zu DOCX kann über einen ODT-Import also tatsächlich eine echte Mehrfachverschachtelung im Editor-Dokumentmodell entstehen**, obwohl sie im Editor selbst nicht erzeugbar ist |
| Unit-Tests (Reader/Writer, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts:135-170` („DOCX round trip: lists"): Bullet-Liste mit mehreren Punkten, Ordered vs. Bullet Unterscheidung, zwei getrennte Listen mit trennendem Absatz. **Kein** Test ruft `liftFromList`/`liftListItem` auf oder prüft das Aufheben einer Liste in irgendeiner Form |
| E2E-Tests (echte Browser-Bedienung) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/lifecycle.spec.ts`, `tests/e2e/selection-regression.spec.ts` — **kein einziger Treffer** für „list"/„Liste" in der gesamten E2E-Suite (per Volltextsuche bestätigt). Diese Anforderung ist damit die **erste** systematische Behandlung des Features überhaupt, nicht nur eine Ergänzung |
| Reale Testfixtures mit Listen (bereits im Repo vorhanden) | DOCX: `tests/fixtures/external/docx/{ComplexNumberedLists,Numbering,NumberingWOverrides,NumberingWithOutOfOrderId}.docx`. ODT: `tests/fixtures/external/odt/{bulletListTest,list,liste2,simple_bullet_list,simpleList,simpleList3,EasyList,ListRoundtrip,listLevel10,listsInTable,simple-table-with-lists,imageWithinList,brokenList,ListOddity,ListHeading,ListHeading2,listStyleId,ListStyleResolution,ContinueListTest}.odt` u. a. (vollständige Liste siehe `specs/nummerierte-liste-req.md` Abschnitt 4.2) |

---

## 1. Ziel

Nutzer:innen können einen oder mehrere markierte Listenpunkte (Aufzählung oder
Nummerierung) über den Toolbar-Button „Liste aufheben" (⇧ Liste) in normale Absätze
zurückverwandeln, **ohne dass dabei Text verloren geht** — konsistent im
Editor-Rendering, beim DOCX-Export und beim ODT-Export, und das Ergebnis bleibt bei
jeder Rundreise (Export → Re-Import, Cross-Format) inhaltlich stabil.

Kernversprechen der Backlog-Beschreibung „Text bleibt erhalten" ist der zentrale,
nicht verhandelbare Prüfpunkt dieser Anforderung: Jede Verifikation, die zwar die
Listenstruktur korrekt entfernt, dabei aber auch nur ein Zeichen, ein Zeichenformat
(Fett etc.), eine Ausrichtung oder einen Zusatzblock (Bild/Tabelle/verschachtelte
Liste innerhalb eines Punkts) verliert, gilt als **nicht bestanden**, selbst wenn die
Liste selbst korrekt verschwindet.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „⇧ Liste" | Listen-Gruppe der Toolbar, dritter von drei Listen-Buttons, direkt nach „• Liste" und „1. Liste" (`Toolbar.tsx:214-224`) | Vorhanden, `title="Liste aufheben"`, ruft bei Klick `liftFromList()` auf. **Kein** `aria-label`, **kein** `aria-pressed`, **kein** sichtbarer Hinweis, ob der Cursor gerade in einer Liste steht | Muss per Maus-Klick (mousedown, Selektion darf nicht verloren gehen) die von der Selektion erfassten Listenpunkte in normale Absätze umwandeln; `aria-label` sollte ergänzt werden (Konsistenz zu `MarkButton`); ein aktiver/inaktiver Hinweiszustand (z. B. Button nur aktivierbar, wenn Cursor in einer Liste steht) ist zu klären — aktuell nicht vorhanden, siehe Grenzfall 4.1 |
| 2 | Icon „⇧ Liste" | Toolbar-Button | Text-Label mit Unicode-Pfeilsymbol „⇧", kein SVG | Analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20.1: Symbol muss auf Systemen ohne verlässliche Unicode-Glyphen weiterhin eindeutig als „Liste aufheben" (nicht verwechselbar mit „Einrücken"/„Ausrücken", falls diese Funktionen künftig ergänzt werden) erkennbar sein |
| 3 | Tastenkombination | — | **Nicht vorhanden.** In Word/LibreOffice existiert hierfür keine feste Standardtaste (anders als Fett/Kursiv), insofern ist das Fehlen vermutlich unkritisch — dennoch als offener Punkt zu dokumentieren, nicht stillschweigend zu übergehen | Zu klären, ob bewusst nicht im Scope |
| 4 | Umschalt+Tab (Ausrücken der Ebene, verwandte, aber **nicht** identische Funktion) | — | **Nicht vorhanden** (siehe Referenztabelle „Tastenkombination"/`sinkListItem`) | Kein Soll-Bestandteil **dieser** Anforderung — gehört zu `mehrstufige-liste`/`liste-einruecken-tab` im Backlog (Status „fehlt"). Wird hier nur erwähnt, weil Nutzer:innen naheliegend erwarten könnten, dass Umschalt+Tab am obersten Level dieselbe Wirkung wie „Liste aufheben" hat — das ist nach Code-Stand **nicht** der Fall, da die Taste gar nicht gebunden ist |
| 5 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden | Kein Soll-Bestandteil dieser Anforderung |
| 6 | Enter auf leerem Listenpunkt (verwandter, separater Mechanismus) | Editor, Keymap (`WordEditor.tsx:75`, `splitListItem`) | Vorhanden als Bibliotheksverhalten, siehe Referenztabelle | Kein Soll-Bestandteil **dieser** Anforderung (gehört zu Abschnitt 5 der Hauptspezifikation bzw. `specs/nummerierte-liste-req.md` Abschnitt 2.3); wird in Grenzfall 4.7 nur zur Abgrenzung von „Liste aufheben" erwähnt |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Cursor ohne Selektion in einem einstufigen Listenpunkt
- Cursor irgendwo im Text eines Listenpunkts (Aufzählung oder Nummerierung), keine
  Selektion nötig → Klick auf „Liste aufheben" → **genau dieser** Punkt wird zu einem
  normalen Absatz (`paragraph`), der Text (inkl. aller Zeichenformate, siehe 3.8) bleibt
  unverändert.
- Ist der aufgehobene Punkt der **einzige** Punkt der Liste, verschwindet der
  umschließende `bullet_list`/`ordered_list`-Knoten vollständig aus dem Dokumentmodell
  (kein leerer Hüllknoten bleibt zurück — laut Schema (`list_item+`, mindestens ein
  Kind) wäre ein leerer Listenknoten ohnehin strukturell ungültig, siehe Grenzfall 4.2).
- Ist der aufgehobene Punkt **nicht** der einzige, wird die Liste an dieser Stelle
  geteilt: vorangehende Punkte bleiben eine (erste) Liste, der aufgehobene Punkt wird
  ein normaler Absatz dazwischen, nachfolgende Punkte bilden eine (zweite,
  eigenständige) Liste desselben Typs (siehe Grenzfall 4.3 zur Nummerierung der zweiten
  Teilliste).

### 3.2 Selektion über mehrere Listenpunkte derselben, einstufigen Liste
- Eine Selektion, die zwei oder mehr Punkte derselben Liste ganz oder teilweise
  einschließt, wandelt **alle** davon betroffenen Punkte in normale Absätze um (analog
  zu `setAlign`s Verhalten über mehrere Absätze, siehe `specs/ausrichtung-links-req.md`
  Abschnitt 3.2 — hier jedoch über den Bibliotheksmechanismus `liftListItem`, nicht über
  eigenen Projektcode).
- Sind **alle** Punkte der Liste in der Selektion enthalten, verschwindet der
  Listenknoten vollständig (wie 3.1).

### 3.3 Selektion, die über den Rand der Liste hinausreicht
- Eine Selektion, die z. B. in einem Listenpunkt beginnt und in einem **nachfolgenden,
  normalen** Absatz außerhalb jeder Liste endet (oder umgekehrt), liefert bei
  `$from.blockRange($to, pred)` voraussichtlich **keinen** gültigen Bereich, da kein
  gemeinsamer Elternknoten die Bedingung „erstes Kind ist `list_item`" erfüllt.
  **Zu verifizieren:** Bricht die Aktion in diesem Fall vollständig ab (nichts
  passiert, auch der im Listenteil liegende Teil der Selektion bleibt unverändert —
  im Unterschied zu `setAlign`, das über `nodesBetween` auch bei gemischten Bereichen
  jeden zutreffenden Block einzeln erfasst), oder wird zumindest der in der Liste
  liegende Teil erfasst? Dieses Verhalten ist aus dem Bibliothekscode nicht triviale
  abzuleiten und **muss** mit einem echten Playwright-Test nachgestellt werden (siehe
  Grenzfall 4.5 und Testfall 6.5).
- Dasselbe gilt für „Alles auswählen" (Strg+A) in einem Dokument, das **sowohl**
  Listen als auch normale Absätze enthält (siehe Grenzfall 4.6) — ein besonders
  praxisrelevanter Fall, da Nutzer:innen intuitiv erwarten könnten, dass „Alles
  auswählen" + „Liste aufheben" **alle** vorhandenen Listen im Dokument auf einmal
  entfernt und den Rest unangetastet lässt.

### 3.4 Einen Punkt in der Mitte einer Liste aufheben
- Der markierte/Cursor-Punkt liegt weder am Anfang noch am Ende der Liste → Ergebnis
  ist eine Drei-Teilung: Teilliste (davor) → normaler Absatz (der aufgehobene Punkt) →
  Teilliste (danach), siehe 3.1.
- Bei einer **nummerierten** Liste: Die zweite Teilliste (danach) muss weiterhin als
  `ordered_list` erkennbar bleiben (nicht versehentlich zu `bullet_list` werden) —
  ihr `start`-Attribut wird beim Splitten der Bibliothek zufolge vom ursprünglichen
  Knoten übernommen (`list.copy(...)` in `liftOutOfList`), was bedeutet: **beide**
  entstehenden Teillisten tragen denselben `start`-Wert wie die ursprüngliche Liste
  (z. B. `start: 1`, sofern nicht zuvor bewusst verändert). Da die Zahlen-Anzeige im
  Editor über natives HTML `<ol start=...>` erfolgt (`schema.ts:93-95`) und **zwei
  getrennte** `<ol>`-Elemente vom Browser unabhängig voneinander nummeriert werden,
  ist zu erwarten, dass die zweite Teilliste **wieder bei „1." beginnt**, statt die
  Zählung der ersten Teilliste fortzusetzen — ein sehr wahrscheinliches, konkret zu
  bestätigendes Verhalten (siehe Grenzfall 4.3), das mit der als „teilweise" markierten
  Backlog-Funktion „Nummerierung fortsetzen/neu starten" zusammenhängt.

### 3.5 Ganze Liste markieren und aufheben
- Wie 3.2, Sonderfall „alle Punkte erfasst": Der Listenknoten verschwindet komplett,
  alle vormaligen Punkte erscheinen als aufeinanderfolgende normale Absätze in
  ursprünglicher Reihenfolge.

### 3.6 Mehrstufige/verschachtelte Liste (nur über ODT-Import erreichbar)
- Da im Editor selbst keine Verschachtelung erzeugbar ist (siehe Referenztabelle), ist
  dieser Fall nur relevant, wenn eine **importierte** ODT-Datei bereits eine echte
  verschachtelte `<text:list>`-Struktur enthält (z. B. `tests/fixtures/external/odt/
  listLevel10.odt`) und dadurch ein `list_item` im Dokumentmodell einen weiteren
  `bullet_list`/`ordered_list`-Block als Kind-Inhalt besitzt.
- Laut Bibliotheksmechanismus (siehe Referenztabelle) hebt „Liste aufheben" einen
  Punkt auf der **tiefsten** Ebene zunächst nur **eine Ebene** höher (bleibt ein
  Listenpunkt der äußeren Liste) — ein **zweiter** Klick an gleicher Stelle wäre nötig,
  um ihn vollständig zu einem normalen Absatz zu machen. **Offene Produktfrage, die
  vor Abnahme explizit entschieden und dokumentiert werden muss:** Ist „ein Klick pro
  Ebene" das gewünschte Verhalten (Word-Konvention, siehe `specs/
  nummerierte-liste-req.md` Abschnitt 2.6), oder soll „Liste aufheben" einen Punkt in
  **einem** Schritt vollständig aus **allen** Verschachtelungsebenen herausheben,
  unabhängig von der Tiefe? Die Backlog-Kurzbeschreibung („Wandelt Listenpunkte zurück
  in normale Absätze") lässt beide Lesarten zu.
- Unabhängig von der Antwort: Der Text selbst darf in keinem Zwischenschritt verloren
  gehen, auch wenn mehrere Klicks nötig sind.
- Da DOCX-Import Verschachtelungsebenen grundsätzlich nicht liest (siehe
  Referenztabelle „DOCX-Import von Listen"), ist dieser Grenzfall für DOCX-Quellen
  praktisch nicht erreichbar — für DOCX-importierten Inhalt operiert „Liste aufheben"
  nach aktuellem Code-Stand **immer** auf einer flachen (einstufigen) Liste, selbst
  wenn die Quelldatei ursprünglich mehrstufig war (der Informationsverlust ist dann
  aber bereits beim Import passiert, nicht erst beim Aufheben — siehe
  `specs/nummerierte-liste-req.md` Abschnitt 5, Verdachtspunkt 3).

### 3.7 Zusammenspiel mit Zeichenformatierung
- Fett/Kursiv/Unterstrichen/Durchgestrichen/Schriftfarbe/Hervorhebung innerhalb des
  Listenpunkt-Texts müssen nach dem Aufheben unverändert erhalten bleiben — nur die
  Listen-Hülle (Aufzählungszeichen/Nummer, Einzug) verschwindet, keine Zeichen-Marks
  werden entfernt oder verändert.

### 3.8 Zusammenspiel mit Ausrichtung
- Ein linksbündiger/zentrierter/rechtsbündiger/Blocksatz-Listenpunkt bleibt nach dem
  Aufheben mit **derselben** Ausrichtung erhalten (das `align`-Attribut sitzt am
  `paragraph`-Knoten selbst, nicht an `list_item`, und wird vom Aufheben nicht berührt)
  — cross-referenziert in `specs/ausrichtung-links-req.md` Grenzfall 4.7.

### 3.9 Zusammenspiel mit zusätzlichen Blöcken innerhalb eines Listenpunkts
- Da `list_item` laut Schema `paragraph block*` erlaubt (`schema.ts:99`), kann ein
  Punkt (typischerweise nur über Import entstanden, da der Editor selbst keinen Weg
  bietet, einen zweiten Block in einen bestehenden Punkt einzufügen) mehr als einen
  Block enthalten — z. B. eine verschachtelte Liste (siehe 3.6), ein Bild oder eine
  Tabelle. Wird ein solcher Punkt aufgehoben, müssen **alle** enthaltenen Blöcke (nicht
  nur der erste `paragraph`) als eigenständige, aufeinanderfolgende Blöcke außerhalb der
  Liste erhalten bleiben — mit einer echten Fixture-Datei zu prüfen (z. B.
  `tests/fixtures/external/odt/imageWithinList.odt`).

### 3.10 Undo/Redo
- Ein Klick auf „Liste aufheben" erzeugt genau einen Undo-Schritt, der die
  ursprüngliche Liste (inklusive exakter Verschachtelung/Reihenfolge/`start`-Wert)
  wiederherstellt; Redo stellt den aufgehobenen Zustand erneut her.

### 3.11 Fokus- und Selektionserhalt nach Klick
- `run()` (`Toolbar.tsx:23-26`) ruft nach jedem Toolbar-Befehl `view.focus()` auf — zu
  verifizieren, dass der Cursor nach dem Aufheben an einer nachvollziehbaren,
  sinnvollen Position im neu entstandenen Absatz steht (nicht an einer unerwarteten
  Stelle springt) und keine hängende Selektion zurückbleibt, die das im
  Referenz-Kontext bekannte Selection-Sync-Problem (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 2) begünstigen könnte (siehe Grenzfall 4.11).

### 3.12 Verhalten außerhalb jeder Liste (kein Ziel vorhanden)
- Klick auf „Liste aufheben", während der Cursor in einem normalen Absatz, einer
  Überschrift, einer Tabellenzelle ohne Liste oder ganz ohne Textinhalt steht →
  `liftFromList()` liefert `false` zurück (keine gültige `blockRange` gefunden), `run()`
  ignoriert diesen Rückgabewert (`Toolbar.tsx:23-26` prüft ihn nicht) → sichtbar
  **nichts** passiert. Das ist kein Absturz und keine Fehlermeldung, aber auch **keine
  positive Rückmeldung** („hier gibt es nichts aufzuheben") — ein Fall der generellen
  Anforderung „kein stiller Fehlschlag" aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4,
  hier konkretisiert (siehe Grenzfall 4.1).

### 3.13 Danach erneut eine Liste erzeugen
- Nach dem Aufheben muss derselbe Absatz erneut per „• Liste"/„1. Liste" in eine (neue)
  Liste umwandelbar sein — kein Zustand aus der vorherigen Listenzugehörigkeit darf
  hängen bleiben (z. B. verwaiste `numId`-ähnliche Zuordnung — im Datenmodell nicht
  vorhanden, da `numId` erst beim DOCX-Export erzeugt wird, aber im Editor-Zustand zu
  prüfen).

---

## 4. Grenzfälle

1. **Klick außerhalb jeder Liste:** Siehe 3.12 — stiller No-Op ohne Rückmeldung. Zu
   entscheiden: Soll der Button in diesem Zustand deaktiviert/ausgegraut dargestellt
   werden (analog zu einer sinnvollen `aria-disabled`-Umsetzung), damit Nutzer:innen
   gar nicht erst versuchen, ihn zu klicken?
2. **Liste erstellen und sofort wieder aufheben, ohne Text einzugeben:** Kein
   verwaister leerer `bullet_list`/`ordered_list`-Knoten im Dokumentmodell danach, kein
   Crash (Cross-Referenz `specs/nummerierte-liste-req.md` Grenzfall 3.1).
3. **Punkt in der Mitte einer nummerierten Liste aufheben (siehe 3.4):** Die danach
   entstehende zweite Teilliste beginnt nach aktuellem Code-Stand voraussichtlich
   wieder bei „1." statt die Zählung fortzusetzen — **mit einem echten Test zu
   bestätigen**, da dies unmittelbar sichtbar für Nutzer:innen ist und leicht als Fehler
   wahrgenommen werden könnte (Cross-Referenz `specs/nummerierte-liste-req.md`
   Abschnitt 2.5 und Grenzfall 3.10 zum generell nicht ausgewerteten `start`-Attribut).
4. **Mehrstufige Liste aus ODT-Import, Punkt auf tiefster Ebene aufheben (siehe 3.6):**
   Ein Klick hebt voraussichtlich nur eine Ebene aus, nicht direkt zu einem normalen
   Absatz. Mit `tests/fixtures/external/odt/listLevel10.odt` (oder einer einfacheren,
   z. B. 2-stufigen Fixture, falls auffindbar) zu bestätigen; Ergebnis inklusive Anzahl
   nötiger Klicks bis zum vollständig normalen Absatz zu dokumentieren.
5. **Selektion reicht von einem Listenpunkt in einen nachfolgenden normalen Absatz
   hinein (siehe 3.3):** Zu verifizieren, ob die Aktion komplett wirkungslos bleibt
   (wahrscheinlichster Fall laut Bibliothekscode) oder ob zumindest der Listenanteil
   erfasst wird.
6. **„Alles auswählen" (Strg+A) in einem Dokument mit sowohl Listen als auch normalen
   Absätzen, danach „Liste aufheben":** Analog zu Grenzfall 4.5, aber mit der gesamten
   Dokumentselektion — zu verifizieren, ob dabei **gar keine** Liste aufgehoben wird
   (weil der gemeinsame Bereich die `pred`-Bedingung nicht erfüllt), obwohl Nutzer:innen
   vermutlich erwarten, dass zumindest die enthaltenen Listen entfernt werden.
7. **Abgrenzung zu „Enter auf leerem Listenpunkt":** Das Beenden einer Liste durch
   Enter auf einem leeren Punkt (`splitListItem`, `WordEditor.tsx:75`, siehe
   Referenztabelle) ist ein anderer Mechanismus als der explizite Button — zu
   verifizieren, dass beide Wege zu strukturell gleichwertigem Ergebnis führen (normaler
   Absatz, kein Rest der Listenformatierung), falls beide im selben Testszenario
   vorkommen, und dass ein:e Testende:r sie nicht versehentlich verwechselt.
8. **Liste innerhalb einer Tabellenzelle aufheben:** Nur die Liste innerhalb der
   betroffenen Zelle wird verändert, der Rest der Tabelle (andere Zellen, Zellstruktur
   selbst) bleibt unangetastet (Cross-Referenz `specs/nummerierte-liste-req.md`
   Abschnitt 2.8, Fixture `tests/fixtures/external/odt/listsInTable.odt` bzw.
   `simple-table-with-lists.odt`).
9. **Zwei unmittelbar aufeinanderfolgende, aber separate Listen desselben Typs ohne
   trennenden Absatz** (z. B. durch Copy-Paste entstanden) → wird nur **ein** Punkt aus
   der ersten der beiden Listen aufgehoben (am Übergang), zu prüfen, ob korrekt nur
   diese eine Liste betroffen ist und nicht versehentlich beide als eine einzige Liste
   behandelt werden (hängt mit dem in `specs/nummerierte-liste-req.md` Grenzfall 3.5
   dokumentierten Verdacht zusammen, dass benachbarte gleichartige Listen bereits beim
   Reader/Writer zu einer verschmelzen könnten — falls das zutrifft, wäre auch das
   Aufheben eines einzelnen Punkts an dieser Nahtstelle betroffen).
10. **Bild/Tabelle/verschachtelte Liste als Zusatzblock in einem Punkt (siehe 3.9)**
    aufheben → alle Blöcke bleiben erhalten und werden zu eigenständigen Geschwister-
    Blöcken, keiner geht verloren (Fixture `imageWithinList.odt`).
11. **Zusammenspiel mit dem bekannten Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 2): Alles auswählen → Liste erzeugen → per Klick neu positionieren →
    Enter → weitertippen, anschließend „Liste aufheben" als zusätzlicher Schritt in
    der Sequenz — zu prüfen, ob derselbe Bug-Pfad auch mit „Liste aufheben" als
    auslösender oder nachfolgender Aktion reproduzierbar ist (bisher nur mit „Fett"
    als Beispiel dokumentiert).
12. **Sehr lange Liste (> 50 Punkte, z. B. aus `ComplexNumberedLists.docx` importiert),
    einzelnen Punkt in der Mitte aufheben:** Kein spürbarer Performance-Einbruch, alle
    übrigen Punkte bleiben unverändert (Stichprobenprüfung Anfang/Mitte/Ende).
13. **Reale Fremddatei mit „kaputtem"/ungewöhnlichem Listen-Markup**
    (`tests/fixtures/external/odt/brokenList.odt`, `ListOddity.odt`) importieren, einen
    Punkt aufheben → kein Absturz, definiertes Fallback-Verhalten statt stillem
    Datenverlust (Cross-Referenz Hauptspezifikation Abschnitt 18).
14. **DOCX-Reimport nach Aufheben:** Da die DOCX-Nummerierung über global feste
    `numId`-Werte läuft (`styleDefs.ts:34-35`) und die Gruppierung beim Reimport rein
    über `numId` + Unterbrechung durch listenfreie Absätze erfolgt (siehe
    Referenztabelle), muss geprüft werden, ob ein zuvor per „Liste aufheben"
    entstandener normaler Absatz **zwischen** zwei Teillisten nach Export/Reimport
    zuverlässig als trennender Nicht-Listen-Absatz erkannt wird (nicht versehentlich
    wieder mit einer der beiden Teillisten verschmilzt, nur weil beide Teillisten
    weiterhin dieselbe globale `numId` verwenden).
15. **Barrierefreiheit:** Button ohne `aria-label` und ohne jeden aktiven/inaktiven
    Zustand — Screenreader-Nutzer:innen erhalten keine Rückmeldung, ob sich der Cursor
    aktuell in einer Liste befindet, bevor sie den Button betätigen, und keine
    Bestätigung, ob der Klick tatsächlich etwas bewirkt hat (siehe 3.12).
16. **Cursor exakt an einer Absatzgrenze am Rand einer Liste** (z. B. ganz am Ende des
    letzten Listenpunkts, direkt vor einem nachfolgenden normalen Absatz) → zu
    dokumentieren, ob „Liste aufheben" in dieser Cursor-Position überhaupt einen
    gültigen Bereich findet und, falls ja, welchen der beiden angrenzenden Blöcke sie
    erfasst (analog zu `specs/ausrichtung-links-req.md` Grenzfall 4.5, dort für
    Ausrichtung, hier für die Listenzugehörigkeit).

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt: Datei mit einer Liste hochladen (bzw.
im Editor erzeugen) → einen oder mehrere Punkte per „Liste aufheben" in normale
Absätze umwandeln → unverändert exportieren → Ergebnis erneut importieren → der
umgewandelte Text erscheint als normaler Absatz (nicht mehr als Listenpunkt) an
exakt derselben Textstelle, unveränderter Inhalt, keine sonstigen Nebenwirkungen auf
den Rest des Dokuments.

### 5.1 DOCX
1. **Einstufige Liste, mittleren Punkt aufheben:** Bullet-Liste mit 3 Punkten im
   Editor anlegen, mittleren Punkt aufheben (→ Teilliste/Absatz/Teilliste, siehe 3.4),
   als DOCX exportieren, reimportieren → Struktur bleibt exakt erhalten: erste Liste
   mit 1 Punkt, normaler Absatz, zweite Liste mit 1 Punkt.
2. **Ganze Liste aufheben:** Alle Punkte einer 3-Punkte-Liste markieren, aufheben,
   DOCX-Export, Reimport → 3 aufeinanderfolgende normale Absätze, **kein**
   `<w:numPr>` mehr in `word/document.xml` für diese Absätze (unabhängig vom
   projekteigenen Reader zu prüfen, z. B. direktes Parsen des XML oder python-docx).
3. **Nummerierte Liste, mittleren Punkt aufheben:** Reimport bestätigt, dass die
   beiden verbleibenden Teillisten weiterhin als `ordered_list` (nicht `bullet_list`)
   erkannt werden; Nummerierungsverhalten der zweiten Teilliste gemäß Grenzfall 4.3
   dokumentieren.
4. **Punkt mit zusätzlichem Block (Bild) aufheben:** Sofern über Import erzeugbar
   (z. B. eine DOCX-Fremddatei mit Bild in einem Listenpunkt) — Bild bleibt nach
   Aufheben und Rundreise als eigenständiger Block erhalten.
5. **Cross-Format:** ODT mit Liste importieren, einen Punkt aufheben, als DOCX
   exportieren → Textinhalt bleibt erhalten.
6. **Reale Fremddatei:** `tests/fixtures/external/docx/ComplexNumberedLists.docx`
   importieren, mindestens einen Punkt aufheben, unverändert exportieren, reimportieren
   → Text jedes betroffenen und jedes unbeteiligten Punkts bleibt vollständig und
   zeichengetreu erhalten (zentraler Nachweis für „Text bleibt erhalten" aus der
   Backlog-Beschreibung, an einer echten, nicht selbst konstruierten Datei).

### 5.2 ODT
1. **Einstufige Liste, mittleren Punkt aufheben:** Analog zu 5.1.1.
2. **Ganze Liste aufheben:** Analog zu 5.1.2 — Reimport bestätigt, dass für die
   betroffenen Absätze kein `<text:list>`/`<text:list-item>` mehr vorhanden ist.
3. **Verschachtelte Liste aus Import, inneren Punkt aufheben (siehe 3.6):**
   `tests/fixtures/external/odt/listLevel10.odt` (oder eine Fixture mit geringerer,
   z. B. 2-facher Verschachtelung, falls für einen einfacheren ersten Test besser
   geeignet) importieren, prüfen, ob tatsächlich eine echte ProseMirror-Verschachtelung
   entsteht, dann „Liste aufheben" auf einen tief verschachtelten Punkt anwenden,
   Ergebnis (Anzahl nötiger Klicks, Zwischenzustände) exportieren und reimportieren →
   Text bleibt in jedem Zwischenschritt vollständig erhalten, auch wenn die
   Verschachtelungstiefe sich nur schrittweise reduziert.
4. **Punkt in einer Tabellenzelle aufheben:** `tests/fixtures/external/odt/
   listsInTable.odt` bzw. `simple-table-with-lists.odt` importieren, Listenpunkt in
   einer Zelle aufheben, Rundreise → Zellstruktur und übriger Zellinhalt bleiben
   unangetastet.
5. **Punkt mit Bild aufheben:** `tests/fixtures/external/odt/imageWithinList.odt`
   importieren, betroffenen Punkt aufheben, Rundreise → Bild bleibt als eigenständiger
   Block erhalten (siehe 3.9/3.10 Grenzfall).
6. **Cross-Format:** DOCX mit Liste importieren, einen Punkt aufheben, als ODT
   exportieren → Textinhalt bleibt erhalten.
7. **Weitere reale Basis-Fixtures** (mindestens `bulletListTest.odt`, `list.odt`,
   `liste2.odt`, `simple_bullet_list.odt`, `simpleList.odt`, `EasyList.odt`,
   `ListRoundtrip.odt`) — jeweils importieren, mindestens einen Punkt aufheben,
   unverändert exportieren, reimportieren → Textinhalt jedes Punkts (aufgehoben wie
   unbeteiligt) bleibt identisch zum ersten Import.
8. **Bekanntermaßen abweichendes Markup:** `brokenList.odt`, `ListOddity.odt`
   importieren, Aufheben-Aktion auf einen Punkt anwenden, sofern die Datei überhaupt
   sinnvoll editierbar importiert wird → definiertes Verhalten statt Crash
   dokumentieren.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. Liste im Editor anlegen, einen Punkt aufheben → Export als ODT → Reimport → Export
   zurück als DOCX → Struktur (Teillisten + dazwischenliegender Absatz) bleibt über
   beide Konvertierungen inhaltlich identisch.
2. Dieselbe Prüfung mit Startpunkt DOCX (Export zuerst als DOCX, dann ODT, dann wieder
   DOCX).
3. Eine reale Fremddatei mit Liste (z. B. `ComplexNumberedLists.docx`) importieren,
   einen Punkt aufheben, zweimal das Format wechseln (DOCX → ODT → DOCX) → kein
   kumulativer Textverlust, auch wenn optische Nummerierungs-Feinheiten (Startwert,
   Fortsetzung) sich dabei ändern dürfen (zu dokumentieren, nicht zu verschweigen).

---

## 6. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

Bereits vorhandene, aber für dieses Feature **nicht existente** Tests: Weder die
Unit-Tests in `src/formats/docx/__tests__/roundtrip.test.ts:135-170` /
`src/formats/odt/__tests__/roundtrip.test.ts` noch irgendeine Datei unter
`tests/e2e/` prüfen „Liste aufheben"/`liftFromList` in irgendeiner Form — alle
folgenden Testfälle sind vollständig neu zu schreiben, nicht nur zu ergänzen.

1. Bullet-Liste mit 3 Punkten anlegen, Cursor (ohne Selektion) in mittleren Punkt,
   echter Playwright-Klick auf „Liste aufheben" → mittlerer Punkt ist sichtbar ein
   normaler Absatz (kein `<li>`/Aufzählungszeichen mehr im DOM), Text unverändert,
   Liste davor/danach bleibt bestehen (Abschnitt 3.1/3.4).
2. Alle Punkte einer Liste markieren (Dreifachklick + Shift-Klick oder Strg+A
   innerhalb der Liste), „Liste aufheben" → Listenknoten verschwindet komplett aus dem
   DOM, alle Punkte sind normale Absätze (Abschnitt 3.2/3.5).
3. Nummerierte Liste, mittleren Punkt aufheben → zweite Teilliste bleibt sichtbar
   nummeriert, tatsächlicher Startwert der zweiten Teilliste protokollieren und mit
   Grenzfall 4.3 abgleichen.
4. Klick auf „Liste aufheben" außerhalb jeder Liste (Cursor in normalem Absatz) → kein
   Fehler, keine Konsolen-Exception, sichtbar keine Änderung (Grenzfall 4.1).
5. Selektion, die von einem Listenpunkt in einen nachfolgenden normalen Absatz
   hineinreicht, „Liste aufheben" anwenden → tatsächliches Verhalten protokollieren
   (Grenzfall 4.5).
6. Dokument mit gemischtem Inhalt (Liste + normale Absätze), Strg+A, „Liste aufheben"
   → tatsächliches Verhalten protokollieren (Grenzfall 4.6).
7. Liste in einer Tabellenzelle anlegen, Punkt in der Zelle aufheben → nur diese Zelle
   betroffen, Rest der Tabelle unverändert (Grenzfall 4.8).
8. Undo direkt nach „Liste aufheben" → ursprüngliche Liste (inkl. Nummerierung/
   Verschachtelung) exakt wiederhergestellt; Redo stellt den aufgehobenen Zustand
   wieder her (Abschnitt 3.10).
9. Nach dem Aufheben erneut „• Liste"/„1. Liste" auf denselben Absatz anwenden → neue
   Liste entsteht korrekt (Abschnitt 3.13).
10. Vollständiger Rundreisetest je Format (Abschnitt 5.1/5.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
    Reader/Writer-Funktionen.
11. Import von `ComplexNumberedLists.docx`, `bulletListTest.odt`, `listLevel10.odt`,
    `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt` —
    jeweils mindestens einen Listenpunkt aufheben und Rundreise wie in Abschnitt 5
    beschrieben durchführen.
12. Mehrstufige Liste aus `listLevel10.odt`, tiefsten Punkt wiederholt aufheben (jeden
    Klick einzeln protokollieren) → Anzahl der Klicks bis zum vollständig normalen
    Absatz dokumentieren, Text bleibt in jedem Zwischenschritt erhalten
    (Grenzfall 4.4).
13. Regressionstest analog `selection-regression.spec.ts`, aber mit „Liste aufheben"
    als zusätzlichem Schritt in der bekannten Bug-Sequenz (Grenzfall 4.11).
14. Cross-Format-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
15. Sichtprüfung/Screenshot-Vergleich: Aussehen eines aufgehobenen Absatzes im Editor
    (kein Aufzählungszeichen, kein Einzug) entspricht optisch dem Aussehen nach
    Re-Import derselben Datei.

---

## 7. Abgrenzung: Vorhandener Code vs. geforderter Nachweis

Der Backlog-Status „vorhanden" stützt sich ausschließlich darauf, dass der Toolbar-
Button existiert und einen Bibliotheksbefehl (`liftListItem`) aufruft
(`commands.ts:62-64`, `Toolbar.tsx:214-224`). Das beweist **nicht**, dass:
- der Button in einem echten Browser tatsächlich klickbar ist und sichtbar reagiert,
- die in Abschnitt 3/4 beschriebenen, aus dem Bibliothekscode abgeleiteten Verhaltens-
  annahmen (insbesondere Ein-Ebene-pro-Klick bei Verschachtelung, Verhalten bei
  über den Listenrand hinausreichender Selektion, Nummerierungsverhalten der
  Teillisten) tatsächlich so eintreten, wie aus dem Quellcode vermutet,
- Text, Zeichenformatierung, Ausrichtung und Zusatzblöcke (Bild/Tabelle/verschachtelte
  Liste) bei der Umwandlung tatsächlich vollständig erhalten bleiben — genau das
  zentrale Versprechen der Backlog-Beschreibung,
- die Rundreise (Export/Re-Import, Cross-Format) für **beide** Formate und für reale
  Fremddateien tatsächlich funktioniert — bisher existiert dafür **kein einziger**
  Test, weder Unit- noch E2E-Test.

Diese Punkte sind der eigentliche Kern der geforderten Verifikation und müssen durch
neue E2E-Tests (analog zu den für Fett/Kursiv/Ausrichtung bereits vorhandenen bzw.
geforderten Playwright-Tests) sowie neue Rundreise-Tests mit echten Fixture-Dateien
geschlossen werden, bevor der Backlog-Status von „vorhanden" auf „verifiziert"
geändert werden darf.

---

## 8. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt
sind:

1. Alle Testfälle aus Abschnitt 6 sind als automatisierte Tests vorhanden und grün.
2. Mindestens die Rundreise-Testfälle 6 aus Abschnitt 5.1 sowie 3, 7, 8 aus
   Abschnitt 5.2 sind mit echten, nicht selbst konstruierten Fremddateien bestanden.
3. Das Verhalten bei Selektionen, die über den Listenrand hinausreichen (Grenzfälle
   4.5/4.6), ist geprüft und dokumentiert (korrekt begrenzt vs. stiller Komplettausfall
   der Aktion); falls unerwünscht, ist ein Ticket dafür angelegt.
4. Das Verhalten bei mehrstufigen, aus ODT-Import entstandenen Listen (Grenzfall 4.4)
   ist geprüft, die Ein-Klick-pro-Ebene-Frage aus Abschnitt 3.6 ist als Produktentscheid
   dokumentiert (bestätigt als gewünscht oder als zu ändern markiert).
5. Das Nummerierungsverhalten der zweiten Teilliste beim Aufheben eines mittleren
   Punkts einer nummerierten Liste (Grenzfall 4.3) ist mit einem echten Test bestätigt
   und dokumentiert.
6. Zusatzblöcke innerhalb eines Listenpunkts (Bild, Tabelle, verschachtelte Liste,
   Abschnitt 3.9) bleiben nachweislich bei Rundreise erhalten, mit mindestens einer
   echten Fixture-Datei (`imageWithinList.odt`) belegt.
7. Der Regressionstest für den Selection-Sync-Bug mit „Liste aufheben" in der Sequenz
   (Grenzfall 4.11) ist dauerhaft Teil der Testsuite.
8. Das Fehlen von `aria-label`, aktivem Zustand und Tastenkombination (Abschnitt 2,
   Grenzfall 4.1/4.15) ist bewusst als „nicht im Scope" bestätigt oder als
   nachzuliefernde Funktion in den Backlog aufgenommen — nicht unentschieden offen
   gelassen.
9. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
