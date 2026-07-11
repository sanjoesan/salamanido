# Liste aufheben — dateigenauer Umsetzungsplan

Gegenstück zu `specs/liste-aufheben-req.md`. Beschreibt nach **tatsächlicher Codelektüre
am aktuellen Quellstand (2026-07-04)** — nicht nach Backlog-/Anforderungsangabe — was am
bestehenden Code zu ändern ist, welche Dateien neu/erweitert werden und wie die geforderte
Verifikation technisch umgesetzt wird.

> **Kritische Überarbeitung eines früheren Durchlaufs dieser Datei (Stand 2026-07-04).**
> Der Vorentwurf dieser `-code.md` war an seinen **beiden zentralen Befunden** faktisch
> falsch, weil er gegen einen **veralteten** Quellstand geschrieben war. Er hätte zwei
> „Bugfixes" verlangt, von denen einer bereits behoben ist und der andere aktiv schädlich
> wäre, und seine Zeilennummern waren durchgängig verschoben. Diese Fassung ist gegen den
> installierten Code neu verifiziert. Die wichtigsten Korrekturen gegenüber dem Vorentwurf:
>
> 1. **„Bug 3.1" (Bild-only-Listenpunkt verletzt `paragraph block*`) existiert nicht mehr.**
>    Das Schema deklariert `list_item` heute als **`block+`** (`schema.ts:146-152`, Content
>    `:147`), mit einem **ausdrücklichen Kommentar** (`schema.ts:139-145`), dass genau diese
>    Änderung bewusst vorgenommen wurde, um `imageWithinList.odt`/`listLevel10.odt` zu
>    akzeptieren. Ein Punkt, der nur ein Bild enthält, ist damit **schemakonform**. Der im
>    Vorentwurf vorgeschlagene Fix (führenden Leerabsatz einfügen) ist **nicht** im Code,
>    wäre **falsch** (fügte vor jedem Bild eine unerwünschte Leerzeile ein) und widerspräche
>    dem dokumentierten Schema-Designentscheid. **Ersatzlos gestrichen** (Abschnitt 3.1).
> 2. **„Bug 3.2" (Textverlust in `<text:a>`) ist bereits behoben.** Der ODT-Reader hat
>    heute einen **generischen `else`-Fallback**, der in unbekannte Inline-Elemente
>    hinabsteigt (`reader.ts:160-167`), und schließt leere Redline-/Bookmark-Marker
>    ausdrücklich aus (`reader.ts:80-91`, `:157-159`) — er löst also **genau** das im
>    Vorentwurf beschriebene Problem (Text in `text:a` erhalten) **und** dessen selbst
>    benannte Gegen-Sorge (Fußnoten-/Kommentar-Text darf nicht durchsickern) bereits sauber.
>    „www.tool.de" aus `listLevel10.odt` überlebt den Import heute. **Ersatzlos gestrichen**
>    (Abschnitt 3.2).
> 3. **DOCX kann Mehrstufigkeit — schreiben und lesen.** Der Vorentwurf behauptete,
>    DOCX-Export schreibe fest `w:ilvl=0` (eine Ebene) und der Reader lese `w:ilvl` gar
>    nicht (`listMarkerFor`, angeblich „nur numId"). **Beides falsch.** Der Writer führt
>    einen `ListContext{numId, level}` bis `MAX_LIST_ILVL=8` (`writer.ts:96-140`), die
>    Nummerierungsdefinition definiert **je 9 Ebenen** (`styleDefs.ts:50-62`), der Reader
>    liest `w:numId` **und** `w:ilvl` (`reader.ts:294-302`) und rekonstruiert die
>    Verschachtelung über einen Frame-Stack (`groupLists`, `reader.ts:379-440`). Das ist
>    zusätzlich durch `tests/e2e/roundtrip-fidelity.spec.ts:36-50/108-119` bereits
>    abgesichert. Der mehrstufige DOCX-Testfall (5.1.4) ist daher **real erreichbar** —
>    der Vorentwurf hatte ihn fälschlich als „strukturell unerreichbar" abgetan.
> 4. **`commands.test.ts` existiert bereits** (`src/formats/shared/editor/__tests__/`,
>    aktuell `canCut`/`cutSelection`). Der Vorentwurf wollte es **neu anlegen** — es wird
>    stattdessen **erweitert**.
> 5. Sämtliche Zeilennummern wurden gegen den aktuellen Code korrigiert (der Vorentwurf war
>    durchgängig verschoben; die **Anforderungsdatei** `liste-aufheben-req.md` ist dagegen
>    zeilengenau korrekt und wurde als Referenz bestätigt).
> 6. **Live-Re-Verifikation 2026-07-05 (zusätzlicher Durchlauf gegen den aktuellen
>    Arbeitsbaum).** Alle tragenden Anker wurden erneut zeilengenau am Quellcode geprüft und
>    **bestätigt**: `schema.ts:115-152` (`bullet_list`=`list_item+` `:117`, `ordered_list`
>    `:124-137` mit `start`-Default `:127`, `list_item`=`block+` `:147`, Kommentar `:139-145`);
>    `commands.ts:57-64` (`toggleList`=roher `wrapInList` `:57-60`, `liftFromList`=`liftListItem`-Alias
>    `:62-64`) und `:126-128` (`canCut`); `Toolbar.tsx:143-156` (Ausschneiden-Button mit
>    `disabled={!canCut(...)}` `:147` + `disabled:`-CSS `:153`) und `:263-273` („⇧ Liste", **weiter
>    ohne** `aria-label`/`disabled` — die einzige Produktcode-Änderung dieses Plans steht noch aus);
>    `docx/writer.ts` (`interface ListContext` `:96`, `MAX_LIST_ILVL=8` `:103`, `<w:ilvl w:val="…">`
>    `:115`, verschachtelter Erb-Zweig `:135`); `docx/styleDefs.ts` (`BULLET_ABSTRACT_ID=0` `:32`,
>    `BULLET_NUM_ID=1` `:34`, `ORDERED_NUM_ID=2` `:35`, `bulletLevelsXml` `:50`, `orderedLevelsXml`
>    `:57`, je 9 Ebenen); `docx/reader.ts` (`ListMarker` `:289`, `listMarkerFor` `:294`, `groupLists`
>    `:379`, `closeAll` `:405/:411`, Bild aus `<w:p>` → `numId:null` `:476`). `canLiftFromList` ist
>    weiterhin **nur** in dieser `-code.md` und in `liste-aufheben-qa.md` beschrieben, **nicht** im
>    `src`-Code (per Grep bestätigt) — der Fix (Abschnitt 3.3) ist also unverändert offen.
>    **Einzige festgestellte Drift:** die Fundstellen in `WordEditor.tsx` (im 2026-07-04-Pass
>    ausdrücklich nicht zeilengenau nachgeprüft, siehe Punkt oben) sind gegenüber dem aktuellen
>    Stand um ~8 Zeilen verschoben und wurden in Abschnitt 2 **korrigiert** (aktuell:
>    `nodeFromJSON(doc.content.body)` `:79`; Keymap-Plugin `:85-107` mit `Enter: splitListItem`
>    `:96` und Undo/Redo `:93-95`; `reconcileSelectionOnClick`-Funktion unverändert `:43-50`, deren
>    mousedown/mouseup-Verdrahtung jetzt `:143-155`; `dispatchTransaction` `:125-133` mit
>    unbedingtem `forceRender` `:131`). Inhaltlich **keine** Änderung — nur die Zeilenzeiger; die
>    Aussagen (kein Tab/Shift-Tab, `sinkListItem` ungenutzt, `forceRender` außerhalb des
>    `docChanged`-Zweigs) gelten unverändert.
> 7. **Dritte, unabhängige kritische Prüfung (2026-07-05, dieser Durchlauf) — vollständiger
>    Datei-für-Datei-Abgleich statt Stichprobe.** Jede in Abschnitt 2 tabellierte Fundstelle
>    wurde erneut direkt am Quellcode gelesen (nicht nur die zuvor als „Drift" markierten
>    Stellen): `schema.ts` komplett (Zeilen 1-152, insbesondere `:115-152`), `commands.ts`
>    komplett (`:1-167`), `Toolbar.tsx` komplett (`:1-298`), `docx/writer.ts:85-154`,
>    `docx/styleDefs.ts:1-75`, `docx/reader.ts:280-440`, `odt/reader.ts:60-299`,
>    `odt/writer.ts:90-109`, `odt/styleRegistry.ts:95-101`, `WordEditor.tsx` komplett,
>    `playwright.config.ts` komplett, `tests/e2e/cut.spec.ts:465-535`,
>    `tests/e2e/selection-regression.spec.ts:1-110`, sowie die Köpfe und `lists`-Blöcke beider
>    `__tests__/roundtrip.test.ts` (DOCX **und** ODT) samt ihrer Helper (`doc`/`paragraph`/
>    `roundTrip`/`TINY_PNG`/`readOdt`-Signatur `File | Blob`). **Ergebnis: keine einzige
>    Zeilenangabe oder inhaltliche Behauptung dieser Datei wich vom tatsächlichen Code ab** —
>    weder in Abschnitt 2 noch in den Abschnitten 3.1–3.8. Zusätzlich wurden alle 25 in
>    Abschnitt 6 gelisteten Fixture-Pfade sowie `bulletListTest.odt` bis `ListStyleResolution.odt`
>    und die drei zusätzlichen `Numbering*.docx`-Dateien einzeln per Dateisystemprüfung
>    bestätigt (alle vorhanden), ebenso die Toolbar-Locator-Strings (`getByTitle('Aufzählung')`,
>    `getByTitle('Nummerierte Liste')`), die App-Locatoren `odtCard`/`docxCard`
>    (`div.rounded-lg` + `getByRole('heading', …)`, identisch zu `docx.spec.ts:59-60`/
>    `odt.spec.ts:43-44`) und `SKIP_SLOW_UNDER_JSDOM` für `brokenList.odt`
>    (`odt/__tests__/external-fixtures.test.ts:17`).
>
>    **Ein konkreter, bis dahin unentdeckter Fehler wurde jedoch in der Test-Beispielsyntax
>    selbst gefunden und ist unten korrigiert** (nicht im Produktcode, sondern in dieser
>    Plandatei): Die in Abschnitt 5.1 vorgeschlagene Positionsberechnung
>    `s.doc.nodeSize - inner.nodeSize - para('tief').nodeSize + 1` im Test „verschachtelt: tiefster
>    Punkt …" ist **rechnerisch falsch**. Nachrechnung anhand der konkreten Knotengrößen
>    (`para('tief')` nodeSize 6, `item(...)` 8, `inner` 10, äußerer `item` 19, äußere Liste 21,
>    `doc.nodeSize` **23** — nicht `21`, da `Node.nodeSize` grundsätzlich `2 + content.size`
>    liefert, **auch** für den Wurzelknoten `doc`, dessen gültiger Positionsbereich aber nur
>    `0..doc.content.size` ist) ergibt für die Formel den Wert **8** — das liegt nachweislich
>    **innerhalb des Texts „außen"** (Positionen 3–8), nicht im Text „tief" (Positionen 12–16,
>    per Schrittweise-Traversierung bestätigt). `TextSelection.near()` hätte diese ungültige/
>    falsch platzierte Position stillschweigend auf die nächstgelegene gültige Cursor-Position
>    „geglättet" — mit hoher Wahrscheinlichkeit in den äußeren, nicht den verschachtelten Punkt
>    hinein — und damit **einen anderen Listenpunkt getestet als beabsichtigt**, ohne dass der
>    Test sichtbar fehlgeschlagen wäre (falscher grüner Test). **Fix:** Ersatz der gesamten
>    handgerechneten `nodeSize`-Arithmetik in Abschnitt 5.1 durch einen robusten
>    `posBeforeText(doc, needle)`-Testhelfer (sucht die Zielposition über `doc.descendants`
>    anhand des tatsächlichen Textinhalts statt über manuell aufsummierte Knotengrößen) —
>    schließt diese ganze Fehlerklasse aus, statt nur den einen gefundenen Fall zu flicken.
>
> Die aus dem Bibliothekscode abgeleitete Verhaltensanalyse (`liftListItem`: ein Aufheben-
> Schritt pro Ebene, Teilung in zwei Listen, `start`-Übernahme, Dry-Run als
> Verfügbarkeitsprädikat) hat der erneuten Prüfung am installierten Paket
> (`prosemirror-schema-list@1.5.1`) über **drei** unabhängige Durchläufe hinweg
> **standgehalten** und ist unverändert übernommen. Der einzige in dieser dritten Prüfung
> gefundene Fehler betraf ausschließlich die illustrative Test-Positionsarithmetik dieser
> Plandatei (oben), **nicht** die Verhaltensanalyse selbst oder den Produktcode.

## 0. TL;DR

**Der „Liste aufheben"-Mechanismus selbst funktioniert bereits korrekt und braucht keine
Codeänderung.** `liftFromList()` ist ein reiner, ungeänderter Alias um `liftListItem`
(`commands.ts:62-64`); das Schema (`block+`), der ODT-Reader (generischer Inline-Fallback,
Bild-only-Punkte gültig), der DOCX-Reader/-Writer (echte Mehrstufigkeit über `w:ilvl`) und
der ODT-Writer sind auf dem Stand, den diese Anforderung voraussetzt. Die im Vorentwurf
behaupteten zwei Reader-Bugs sind **gegenstandslos** (Abschnitt 3.1/3.2).

Der tatsächliche Arbeitsumfang ist daher:

1. **Eine einzige Produktcode-Änderung (Barrierefreiheit, req Menüpunkt 1 / Grenzfall 15 /
   DoD 9):** `aria-label` und ein **exakter** Aktiv/Inaktiv-Zustand für den „⇧ Liste"-Button,
   letzterer über einen **Dry-Run des Commands** (`liftFromList()(state)` ohne `dispatch`).
   Ein neuer Helper `canLiftFromList(state)` in `commands.ts` — direkt analog zum bereits
   existierenden `canCut(state)` (`commands.ts:126-128`) und zum bereits `disabled`-fähigen
   „Ausschneiden"-Button derselben Toolbar (`Toolbar.tsx:143-156`). Kein neuer Command, keine
   Änderung am Aufhebe-Verhalten (Abschnitt 3.3).
2. **Zwei bewusste, verbindliche Entscheidungen (DoD 4/8/9):** keine Tastenkombination
   (Abschnitt 3.4); „ein Klick pro Ebene" bei Verschachtelung bleibt (Word-Konvention,
   Abschnitt 3.5).
3. **Die eigentliche Lücke: komplett neue Testabdeckung.** Kein einziger Test (Unit noch
   E2E) ruft heute `liftFromList`/„Liste aufheben" auf (per Grep bestätigt: die Symbole
   kommen nur in `commands.ts` als Definition und `Toolbar.tsx` als Aufruf vor). Abschnitt 5
   schließt das über eine Erweiterung von `commands.test.ts`, Erweiterungen beider
   `roundtrip.test.ts`, eine neue `tests/e2e/liste-aufheben.spec.ts` und einen Zusatztest in
   `selection-regression.spec.ts`.
4. **Zwei dokumentierte, bestätigte Verhaltensweisen ohne Fix** (jeweils eigener
   Backlog-Slug): Nummerierung der zweiten Teilliste (Abschnitt 3.6) und die
   Cross-Tool-Sicht in echtem Word/LibreOffice (Abschnitt 7).

Positiv-Befunde, die belegen, dass **kein** projekteigener Sonderfall nötig ist:
`liftOutOfList` hebt Zusatzblöcke (Bild/Tabelle/verschachtelte Liste) bereits vollständig
mit heraus (Abschnitt 3.7); `groupLists` trennt zwei Teillisten am durch das Aufheben
entstandenen Absatz bereits zuverlässig (Abschnitt 3.8).

---

## 1. Methodik dieser Prüfung

Vollständig gelesen (aktueller Stand, nicht aus dem Gedächtnis): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
`src/formats/docx/{reader.ts,writer.ts,styleDefs.ts}`, `src/formats/odt/{reader.ts,writer.ts}`,
`src/formats/shared/editor/__tests__/commands.test.ts`, beide `__tests__/roundtrip.test.ts`
(Kopf + Listen-Abschnitte), `tests/e2e/roundtrip-fidelity.spec.ts`,
`tests/e2e/selection-regression.spec.ts` (Struktur), sowie der **installierte**
Bibliothekscode `node_modules/prosemirror-schema-list/dist/index.js`
(`prosemirror-schema-list@1.5.1`, 289 Zeilen, komplett).

Zwei Fragen wurden am tatsächlich installierten Code beantwortet, nicht angenommen:

1. Ob `liftListItem`/`liftToOuterList`/`liftOutOfList` exakt die in `liste-aufheben-req.md`
   beschriebene Semantik haben. **Ergebnis: ja, zeilengenau** (Abschnitt 2, letzte
   Tabellenzeilen).
2. Ob der aktuelle ODT-Reader die im Vorentwurf behaupteten Bugs noch enthält. **Ergebnis:
   nein, beide sind behoben** (Abschnitt 3.1/3.2, jeweils mit Codezeilen belegt).

Zusätzlich wurden die in der Anforderung genannten Fixtures **programmatisch entpackt**
(`JSZip` über ein Ad-hoc-Node-Skript) und ihr `content.xml` inspiziert, statt ihren Inhalt
aus dem Dateinamen zu vermuten:
- `imageWithinList.odt`: Listenstil `L1` ist `text:list-level-style-bullet` (→ **Bullet**);
  ein Punkt, dessen einziges Kind ein `<text:p>` mit `<draw:frame><draw:image .../></draw:frame>`
  ist (kein Text). Ergebnis des Readers heute: `list_item.content = [{type:'image'}]` —
  **schemakonform unter `block+`** (Abschnitt 6).
- `listLevel10.odt`: `text:list-level-style-number` (→ **Ordered**, 10 Ebenen); tiefster
  Punkt enthält bestätigt `<text:a xlink:href="http://www.tool.de/"><text:span>www.tool.de</text:span></text:a>`.
  Ergebnis des Readers heute: „www.tool.de" bleibt erhalten (generischer `else`-Zweig,
  `reader.ts:160-167`).

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

Alle Zeilenangaben gegen den aktuellen Quellstand verifiziert. Die
**Anforderungsdatei** ist zeilengenau korrekt; Abweichungen unten betreffen ausschließlich
den **Vorentwurf dieser `-code.md`**.

| Fundstelle (aktuell verifiziert) | Verifiziert im Code | Anmerkung |
|---|---|---|
| `schema.ts:115-122` `bullet_list` (`content: 'list_item+'`) | Ja, exakt | — |
| `schema.ts:124-137` `ordered_list` (zusätzlich `start`, Default 1 `:127`; `toDOM` schreibt `start`-Attribut nur bei ≠1 `:134-136`) | Ja, exakt | — |
| `schema.ts:146-152` `list_item`, Content **`block+`** (`:147`) | Ja, exakt | Kommentar `:139-145` begründet `block+` ausdrücklich mit `imageWithinList.odt`/`listLevel10.odt`. **Vorentwurf behauptete `paragraph block*` — falsch.** |
| `commands.ts:62-64` `liftFromList()` — reiner Alias um `liftListItem(wordSchema.nodes.list_item)` (Import `:2`) | Ja, exakt, kein Projektcode | — |
| `commands.ts:126-128` `canCut(state)` — reines Verfügbarkeitsprädikat | Ja | **Vorbild** für den neuen `canLiftFromList` (Abschnitt 3.3) |
| `Toolbar.tsx:263-273` „⇧ Liste"-Button; `title` `:265`, `onMouseDown`+`preventDefault`+`run(view, liftFromList())` `:266-269`, Label `:272`; **kein** `aria-label`, **kein** aktiver/`disabled`-Zustand | Ja, exakt | Wird gefixt (Abschnitt 3.3). **Vorentwurf sagte `:214-224` — verschoben.** |
| `Toolbar.tsx:143-156` „Ausschneiden"-Button mit `disabled={!canCut(view.state)}` (`:147`) + `disabled:`-CSS (`:153`) | Ja | **lokaler Präzedenzfall** für nativen `disabled`-Zustand (Abschnitt 3.3) |
| `Toolbar.tsx:28-31` `run()` prüft Rückgabewert **nicht** | Ja, exakt | ein `false` (nichts aufzuheben) bleibt ohne Rückmeldung — durch `disabled`-Zustand künftig gar nicht erst klickbar |
| `Toolbar.tsx:55-89` `MarkButton` mit `aria-label` (`:74`) + `aria-pressed` (`:75`) | Ja | Konsistenz-Vorbild für `aria-label` |
| `WordEditor.tsx:79` `wordSchema.nodeFromJSON(doc.content.body)` beim Laden | Ja (2026-07-05) | validiert Content **nicht** gegen die Schema-Content-Regel (`Node.fromJSON`→`create`, nicht `createChecked`) — hier aber **kein** Problem, da der Reader bereits gültige `block+`-Struktur liefert |
| `WordEditor.tsx:85-107` Keymap ohne Tab/Shift-Tab; `Enter: splitListItem(...)` `:96`; Undo/Redo `:93-95`; `sinkListItem` nirgends importiert (`:7` importiert nur `splitListItem`) | Ja, exakt (2026-07-05, +8 Zeilen ggü. 2026-07-04-Pass) | kein Soll-Bestandteil dieser Anforderung |
| `WordEditor.tsx:43-50` `reconcileSelectionOnClick` (unverändert) + mousedown/mouseup-Verdrahtung `:143-155` | Ja, exakt (2026-07-05) | relevant für Grenzfall 4.11 (Abschnitt 5.2) |
| `WordEditor.tsx:125-133` `dispatchTransaction` ruft `forceRender` **unbedingt** (`:131`, außerhalb des `docChanged`-Zweigs `:128-130`) | Ja (2026-07-05) | wichtig: die Toolbar rendert bei **jeder** Transaktion — auch bei reinen Selektionsänderungen — neu, der `disabled`-Zustand bleibt daher live (Abschnitt 3.3) |
| `docx/writer.ts:96-140` `blockToDocx` mit `ListContext{numId, level}` (`:96-99`), `MAX_LIST_ILVL=8` (`:103`), `<w:ilvl w:val="${listContext.level}"/>` (`:114-115`), verschachtelte Liste teilt `numId` und geht eine Ebene tiefer (`:134-135`) | Ja, exakt | ein `paragraph` **ohne** `listContext` bekommt **kein** `<w:numPr>` (`:114`) — exakt das für „Liste aufheben" gewünschte Exportverhalten. **Vorentwurf behauptete festes `w:ilvl=0` — falsch.** |
| `docx/styleDefs.ts:32-35` `BULLET_ABSTRACT_ID=0`/`ORDERED_ABSTRACT_ID=1`/`BULLET_NUM_ID=1`/`ORDERED_NUM_ID=2`; `:50-62` **je 9 Ebenen**; kein `w:startOverride` | Ja, exakt | Grundlage für Abschnitt 3.6. **Vorentwurf behauptete „je eine Ebene" — falsch.** |
| `docx/reader.ts:289-302` `ListMarker{numId, ilvl}`, `listMarkerFor` liest **beide** | Ja, exakt | **Vorentwurf behauptete „nur numId, `:192-201`" — falsch.** |
| `docx/reader.ts:379-440` `groupLists` rekonstruiert Verschachtelung über Frame-Stack; numId-loser Block → `closeAll()`+push (`:410-414`); Bild aus `<w:p>` → `numId:null` (`:476`) | Ja, exakt | löst Grenzfall 14 bereits korrekt (Abschnitt 3.8) |
| `odt/reader.ts:286-299` `elementToBlocks`/`text:list`; leerer Punkt → `emptyParagraph()` (`:296`); Bild-only-Punkt → `[image]` (gültig unter `block+`); `MAX_NESTING_DEPTH=25` (`:218`) | Ja, exakt | **Vorentwurf „Bug 3.1" gegenstandslos** (Abschnitt 3.1) |
| `odt/reader.ts:138-172` `decodeInline`/`walk`; generischer `else`-Fallback in Kinder unbekannter Inline-Elemente (`:160-167`); leere Redline-/Bookmark-Marker ausgeschlossen (`:80-91`,`:157-159`) | Ja, exakt | **Vorentwurf „Bug 3.2" bereits behoben** (Abschnitt 3.2) |
| `odt/writer.ts:99-109` `blockToOdt`/Listen; rekursiv über `item.content` (`:104`); beide Listentypen teilen **einen** Stilnamen (`:101`) | Ja, exakt | verschachtelte Listen strukturell korrekt geschrieben; tiefere Ebenen ohne eigene Einzugsdefinition (bekannte, hinzunehmende Vereinfachung) |
| `prosemirror-schema-list@1.5.1 index.js:206-219` `liftListItem`: `blockRange($to, pred)` (`:209`), `!dispatch → return true` (`:212-213`), verschachtelt → `liftToOuterList` (`:214-215`), oberste Ebene → `liftOutOfList` (`:216-217`) | Ja, zeilengenau am installierten Paket | Grundlage für Abschnitt 3.3/3.5/3.6/3.7 |
| `…index.js:220-237` `liftToOuterList` (eine Ebene höher, bleibt Listenpunkt; Folgegeschwister werden Kinder `:222-227`) | Ja, zeilengenau | „ein Klick pro Ebene" (Abschnitt 3.5) |
| `…index.js:238-260` `liftOutOfList`: merge zu einem `list_item` (`:241-244`), `item.content.append(...)` als Ersatzinhalt (`:250`), `list.copy(Fragment.empty)` beim Teilen (`:256`) | Ja, zeilengenau | hebt Zusatzblöcke mit heraus (Abschnitt 3.7); beide Teillisten erben `start` (Abschnitt 3.6) |
| Kein Test ruft `liftFromList`/`liftListItem` auf | Ja (Grep: nur `commands.ts`-Definition + `Toolbar.tsx:15/268`) | die zu schließende Lücke |

---

## 3. Entscheidungen / Befunde

### 3.1 Kein Bug: Bild-only-Listenpunkt ist unter `block+` gültig (Vorentwurf-„Bug 3.1" gegenstandslos)

Der Vorentwurf behauptete, ein `<text:list-item>` mit nur einem Bild erzeuge
`list_item.content = [{type:'image'}]` und verletze damit `paragraph block*`. **Am aktuellen
Code ist das falsch:**

- `schema.ts:146-152` deklariert `list_item` als **`content: 'block+'`**. Der Kommentar
  `schema.ts:139-145` hält ausdrücklich fest, dass diese Regel bewusst von `paragraph block*`
  auf `block+` geändert wurde, „because real-world ODT/DOCX files routinely produce a list
  item whose only content is a nested list … or a bare image — see e.g. the
  `listLevel10.odt`/`imageWithinList.odt` fixtures". Ein Bild-only-Punkt ist damit
  **schemakonform**.
- `odt/reader.ts:289-297` erzeugt für einen Punkt mit Inhalt genau diesen Inhalt und fällt
  **nur bei leerem** Inhalt auf einen `emptyParagraph()` zurück (`:296`) — ein Bild-only-Punkt
  behält korrekt `[image]`.

**Konsequenz:** Kein Fix. Der im Vorentwurf vorgeschlagene führende Leerabsatz wäre aktiv
schädlich (er fügte vor jedem importierten Bild-Punkt eine sichtbare Leerzeile ein) und
widerspräche dem dokumentierten Schema-Entscheid. Statt eines Fixes wird das Verhalten durch
eine **Regressionsprobe** abgesichert (Abschnitt 5.1, `list-structure.test.ts`): der Punkt
beginnt mit `image`, `wordSchema.nodeFromJSON(...)` wirft nicht, und nach „Liste aufheben"
bleibt das Bild als eigenständiger Block erhalten (Abschnitt 3.7 erklärt, warum das
automatisch stimmt).

### 3.2 Kein Bug: Text in `<text:a>` bleibt erhalten (Vorentwurf-„Bug 3.2" bereits behoben)

Der Vorentwurf behauptete, `walk()` habe keinen generischen Fallback und verwerfe Text in
unbekannten Inline-Elementen (z. B. `text:a`). **Am aktuellen Code ist das behoben:**

`odt/reader.ts:160-167` enthält einen generischen `else`-Zweig, der in die Kinder jedes
unbekannten Inline-Elements hinabsteigt und deren Text mit denselben Marks übernimmt. Die im
Vorentwurf als Gegenargument angeführte Sorge (Fußnotenzeichen/Kommentar-Text dürfe nicht in
den Fließtext sickern) ist ebenfalls bereits adressiert: leere Redline-/Bookmark-Marker
werden über `isEmptyRedlineMarker` (`reader.ts:80-91`) im Zweig `:157-159` **ausgeschlossen**,
bevor der generische Fallback greift. Der Text „www.tool.de" aus `listLevel10.odt`
(bestätigt entpackt, Abschnitt 1) überlebt den Import heute vollständig.

**Konsequenz:** Kein Fix. Der `href` selbst wird weiterhin bewusst nicht modelliert (das
bleibt Umfang von `hyperlink-einfuegen`, Backlog „fehlt"). Abgesichert durch eine
Regressionsprobe (Abschnitt 5.1): der Gesamttext von `listLevel10.odt` enthält nach Import
„www.tool.de".

### 3.3 `commands.ts` + `Toolbar.tsx` — `aria-label` + exakter Aktiv/Inaktiv-Zustand (req Menüpunkt 1, Grenzfall 1/15, DoD 9) — **einzige Produktcode-Änderung**

Neuer, exportierter Helper in `commands.ts`, direkt nach `liftFromList` (`:64`) — `EditorState`
ist dort bereits importiert (`:1`), das Muster ist 1:1 `canCut` (`:126-128`):

```ts
/**
 * Ob ein Klick auf "Liste aufheben" gerade etwas bewirken würde — steuert den
 * Aktiv/Inaktiv-Zustand des Toolbar-Buttons (Grenzfall 1/15). Ruft das echte Command
 * bewusst OHNE `dispatch` auf: das ist ProseMirrors eigene Konvention für eine reine
 * Verfügbarkeitsprobe. `liftListItem` liefert `true` genau dann, wenn ein gültiger
 * Listen-Bereich existiert, sonst `false` (prosemirror-schema-list@1.5.1 index.js:210-213).
 * Weil es exakt dieselbe blockRange/pred-Prüfung ist, die der Klick ausführt, werden
 * Selektionen über den Listenrand hinaus (Grenzfall 4.5) und eine AllSelection über
 * gemischtem Inhalt (Grenzfall 4.6) automatisch als "inaktiv" erkannt — ohne dass Toolbar
 * oder Command-Logik dupliziert werden müssten. Analog zu canCut() oben.
 */
export function canLiftFromList(state: EditorState): boolean {
  return liftFromList()(state)
}
```

`Toolbar.tsx`: `canLiftFromList` in den bestehenden Import aus `./commands` aufnehmen
(`:6-20`, neben `liftFromList`) und den Button (`:263-273`) ändern:

```tsx
      <button
        type="button"
        title="Liste aufheben"
        aria-label="Liste aufheben"
        disabled={!canLiftFromList(view.state)}
        onMouseDown={(e) => {
          e.preventDefault()
          run(view, liftFromList())
        }}
        className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        ⇧ Liste
      </button>
```

**Warum natives `disabled` (nicht `aria-disabled`):** Der „Ausschneiden"-Button **derselben
Toolbar** (`Toolbar.tsx:143-156`) verwendet bereits exakt dieses Muster
(`disabled={!canCut(view.state)}` + `disabled:opacity-40 disabled:cursor-not-allowed
disabled:hover:bg-transparent`). Für lokale Konsistenz wird dasselbe Muster übernommen — das
ist der stärkere, konkrete Präzedenzfall gegenüber einer abstrakten WCAG-Abwägung. Der
Zustand bleibt **live**, weil `dispatchTransaction` bei **jeder** Transaktion `forceRender`
aufruft (`WordEditor.tsx:131`, auch bei reinen Selektionsänderungen), sodass die Toolbar neu
rendert und `canLiftFromList(view.state)` neu auswertet — identisch zur bereits
funktionierenden Live-Aktualisierung von `canCut`.

**Verhaltens-Konsequenz für Grenzfall 4.1** (bewusst, dokumentiert): Ein nativ `disabled`
Button ist außerhalb einer Liste **gar nicht klickbar** — das „stiller No-Op bei Klick"-Szenario
wird zur **stärkeren** Garantie „außerhalb einer Liste nicht auslösbar". Der Command-eigene
No-Op (`liftFromList()(state, dispatch)` gibt `false` zurück und dispatcht nichts) bleibt
zusätzlich auf Unit-Ebene abgesichert (Abschnitt 5.1). **Kein** zweiter Guard im `onMouseDown`
— der Command prüft dieselbe Bedingung ohnehin selbst; ein separater Guard könnte nur
auseinanderdriften.

**Alternative (falls das Team den Button fokussierbar halten will):** `aria-disabled={!canLift}`
statt `disabled`, plus `aria-disabled`-abhängige CSS und ein `if (!canLift) return` im
`onMouseDown`. Nachteil: weicht vom „Ausschneiden"-Präzedenzfall ab und braucht den
Extra-Guard. Empfehlung bleibt natives `disabled`.

`aria-label` wird **nur** für „⇧ Liste" ergänzt (Anforderungs-Scope). Die Nachbar-Buttons
„• Liste"/„1. Liste" bleiben unverändert (Abschnitt 8).

### 3.4 Tastenkombination — Entscheidung: keine (DoD 8/9)

Anders als Fett/Kursiv/Unterstrichen gibt es für „Liste aufheben" **keine** etablierte
Tastenkombination in Word oder LibreOffice; die Anforderung selbst stuft das Fehlen als
„vermutlich unkritisch" ein (req Abschnitt 2, Menüpunkt 3). Eine erfundene Kombination
stiftete mehr Verwirrung als Nutzen. **Verbindliche Entscheidung: keine Tastenkombination.**
`WordEditor.tsx` bleibt unverändert. Künftiger Bedarf wäre ein eigener Backlog-Punkt, keine
offen gelassene Frage.

### 3.5 Mehrstufige Liste — „ein Klick pro Ebene" bleibt (Abschnitt 3.6/Grenzfall 4.4, DoD 4)

Durch Lesen von `liftListItem` (`index.js:214-217`) **bestätigt**: Liegt die Selektion in
einer verschachtelten Liste (`$from.node(range.depth - 1).type == itemType`, `:214`), läuft
ausschließlich `liftToOuterList` (`:220-237`) — der Punkt wird **eine** Ebene in die äußere
Liste gehoben und bleibt Listenpunkt. Erst in der **obersten** Ebene greift `liftOutOfList`
(`:238-260`) und wandelt zu normalen Absätzen. **Verbindliche Entscheidung: unverändert
lassen** (Word-Konvention: mehrfaches Ausrücken vor vollständiger Aufhebung), deckungsgleich
mit `specs/nummerierte-liste-req.md` Abschnitt 2.6. Kein Fix. Konsequenz: der E2E-Test muss
die **Anzahl der Klicks** bis zum normalen Absatz protokollieren, nicht einen Klick annehmen
(Abschnitt 5.2, Testfall 12). Dieser Fall ist über **beide** Formate erreichbar
(`listLevel10.odt` **und** `ComplexNumberedLists.docx`), da beide Reader echte
Verschachtelung erzeugen (Abschnitt 2).

### 3.6 Nummerierung der zweiten Teilliste (Abschnitt 3.4/Grenzfall 4.3/4.14, DoD 5)

Durch Lesen von `liftOutOfList` (`:256`) bestätigt: Der Split kopiert die ursprüngliche Liste
zweimal per `list.copy(Fragment.empty)`; `Node.copy` übernimmt **alle** Attribute inklusive
`start`. Beide entstehenden `ordered_list`-Knoten tragen also **denselben** `start`-Wert
(i. d. R. `1`). Zwei zu unterscheidende, beide bestätigte Konsequenzen:

1. **Im Editor** (`schema.ts:134-136`): Zwei eigenständige `<ol>`-Elemente mit gleichem
   `start` → der Browser nummeriert die zweite Teilliste unabhängig, sie beginnt sichtbar
   wieder bei „1.".
2. **In echtem Word/LibreOffice nach DOCX-Export** (nicht in der eigenen Suite): `styleDefs.ts`
   definiert eine einzige globale `numId=2` für alle nummerierten Listen, ohne
   `w:startOverride` (`:32-35/64-74`). In OOXML ist der Zähler an `numId` gebunden — eine
   unabhängige Anwendung zählt über den dazwischenliegenden Nicht-Listen-Absatz hinweg
   **voraussichtlich fort**. Der **eigene** Reader wertet beim Reimport nie einen sichtbaren
   Nummerierungswert aus (nur `numId` zur Gruppierung), ist also nicht betroffen — der
   Unterschied wird nur beim Öffnen in einem echten Fremdwerkzeug sichtbar.

**Verbindliche Entscheidung: kein Fix hier.** Beide Verhalten werden getestet **festgestellt**
(nicht korrigiert); das Beheben (`start`-Neuberechnung beim Split bzw. `w:startOverride` beim
Export) ist exakt der Umfang des separaten Backlog-Punkts `nummerierung-fortsetzen-neustarten`
(Status „teilweise"). Optional (Doku, keine Verhaltensänderung) ein Kommentar in
`styleDefs.ts` oberhalb `BULLET_NUM_ID`/`ORDERED_NUM_ID` (`:34-35`), der auf diese
Cross-Tool-Divergenz und den Ziel-Slug verweist. Die Punkt-2-Hypothese ist vor Abnahme
**empirisch** zu prüfen (Abschnitt 7).

### 3.7 Positiver Befund: `liftOutOfList` hebt Zusatzblöcke bereits korrekt heraus (Abschnitt 3.9/Grenzfall 10, kein Fix)

`index.js:250` verwendet `item.content.append(...)` — den **kompletten** Inhalt des (bei
Mehrfachauswahl zuvor über die Boundary-Merge-Schleife `:241-244` zu einem gemergten)
`list_item` — als Ersatz für die Liste. **Alle** enthaltenen Blöcke (weitere `paragraph`,
`image`, `table`, verschachtelte Listen) werden dadurch zu eigenständigen Geschwister-Blöcken,
nicht nur der erste. Das ist bereits exakt das in Grenzfall 10 geforderte Verhalten —
**vorausgesetzt** gültige `list_item`-Struktur, die der Reader unter `block+` liefert
(Abschnitt 3.1). Kein Fix, nur Test an echter Fixture (`imageWithinList.odt`, Abschnitt 5.2).

### 3.8 Positiver Befund: `groupLists` trennt Teillisten am Übergang bereits korrekt (Grenzfall 14, kein Fix)

`docx/writer.ts:114` schreibt einen `paragraph` ohne `listContext` **immer** ohne `<w:numPr>`.
Beim Reimport schließt `groupLists` bei jedem numId-losen Block **alle** offenen Frames und
hängt den Absatz an (`closeAll()`+push, `reader.ts:410-414`) — eine nachfolgende Liste
derselben `numId` beginnt als **neue** Gruppe. Ein durch „Liste aufheben" entstandener
Trennabsatz trennt zwei Teillisten beim Export/Reimport also zuverlässig (Struktur
Liste/Absatz/Liste bleibt erhalten). Kein Fix, nur ein Rundreise-Test (Abschnitt 5.1).

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | Neuer Export `canLiftFromList(state)` nach `liftFromList` (`:64`); Muster wie `canCut` (`:126-128`) (Abschnitt 3.3) | Neu (Funktion in bestehender Datei) |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | „⇧ Liste"-Button (`:263-273`): `aria-label`, `disabled={!canLiftFromList(view.state)}`, `disabled:`-CSS; `canLiftFromList` in Import aus `./commands` (`:6-20`) (Abschnitt 3.3) | Fix (Barrierefreiheit) |
| 3 | `src/formats/docx/styleDefs.ts` | **Optional**: nur Kommentar zur bewusst nicht gefixten `start`/`numId`-Cross-Tool-Divergenz oberhalb `:34-35` (Abschnitt 3.6) | Doku (optional) |
| 4 | `src/formats/shared/schema.ts` | **Keine Änderung.** `list_item` = `block+` ist bereits korrekt und bewusst so (Abschnitt 3.1) | — |
| 5 | `src/formats/odt/reader.ts` | **Keine Änderung.** Bild-only-Punkt gültig, `text:a`-Text bereits erhalten (Abschnitt 3.1/3.2) | — |
| 6 | `src/formats/shared/editor/commands.ts` (`liftFromList`) | **Keine Änderung.** Bleibt reiner Bibliotheks-Alias (Abschnitt 3.5/3.6/3.7) | — |
| 7 | `src/formats/docx/{reader.ts,writer.ts,styleDefs.ts}` (Kernlogik) | **Keine Änderung.** Mehrstufigkeit + Split/Rundreise bereits korrekt (Abschnitt 2/3.8) | — |
| 8 | `src/formats/odt/writer.ts` | **Keine Änderung.** Listen/Zusatzblöcke bereits korrekt (Abschnitt 2/3.7) | — |
| 9 | `src/formats/shared/editor/WordEditor.tsx` | **Keine Änderung.** Keine Tastenkombination (Abschnitt 3.4) | — |

Es wird **keine** neue Command-Abstraktion für das Aufheben eingeführt. Die einzige neue
Logik ist `canLiftFromList` (reine Anzeige, ändert kein Ausführungsverhalten).

---

## 5. Neue / erweiterte Testdateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Erweiterung: `src/formats/shared/editor/__tests__/commands.test.ts`** (existiert bereits mit
`canCut`/`cutSelection`; die neuen `describe`-Blöcke werden angehängt, `import`-Zeile `:1-3` um
`liftFromList, canLiftFromList, toggleList` ergänzt). Reiner Logik-Test ohne Browser —
schneller Rückkanal für Regressionen. Positionen werden über `nodeSize`/`resolve` statt
„magischer" Zahlen gerechnet, damit sie bei Schemaänderungen nicht lautlos falsch werden:

```ts
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { liftFromList, canLiftFromList, toggleList } from '../commands'

const para = (t: string) => wordSchema.nodes.paragraph.create({ align: 'left' }, t ? wordSchema.text(t) : undefined)
const item = (...c: any[]) => wordSchema.nodes.list_item.create(null, c)
const bulletList = (...i: any[]) => wordSchema.nodes.bullet_list.create(null, i)
const orderedList = (start: number, ...i: any[]) => wordSchema.nodes.ordered_list.create({ start }, i)
const docOf = (...c: any[]) => wordSchema.nodes.doc.create(null, c)
const stateFor = (n: any) => EditorState.create({ doc: n, schema: wordSchema })

function applyLift(state: EditorState): EditorState {
  let out = state
  liftFromList()(state, (tr) => { out = state.apply(tr) })
  return out
}

/**
 * Resolves the position immediately before the (first) text node whose content is
 * exactly `needle`. Deliberately used everywhere below INSTEAD OF hand-computed
 * `nodeSize` arithmetic: a manual formula for a position inside `list_item(paragraph,
 * nestedList)` silently computed a position inside the WRONG list item in an earlier
 * draft of this test file (verified by step-by-step traversal: the formula
 * `doc.nodeSize - inner.nodeSize - para.nodeSize + 1` lands in the *outer* item's text
 * because `Node.nodeSize` is `2 + content.size` even for the root `doc`, whose valid
 * position range is only `0..content.size` — a two-position overcount that
 * `TextSelection.near()` would have silently "fixed" into a plausible-looking but wrong
 * position instead of throwing). Searching by actual text content instead of counting
 * node sizes cannot go stale when a fixture's shape changes.
 */
function posBeforeText(doc: PMNode, needle: string): number {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.isText && node.text === needle) {
      found = pos
      return false
    }
    return true
  })
  if (found === null) throw new Error(`posBeforeText: "${needle}" not found in fixture doc`)
  return found
}

describe('liftFromList (Aufheben-Verhalten)', () => {
  it('mittlerer Punkt einer 3er-Bullet-Liste → Liste/Absatz/Liste, Text erhalten (3.1/3.4)', () => {
    let s = stateFor(docOf(bulletList(item(para('eins')), item(para('zwei')), item(para('drei')))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'zwei')))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect(s.doc.textContent).toBe('einszweidrei')
  })

  it('einziger Punkt → Hüllknoten verschwindet vollständig (Grenzfall 2)', () => {
    let s = stateFor(docOf(bulletList(item(para('einzig')))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'einzig')))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(s.doc.textContent).toBe('einzig')
  })

  it('Selektion über alle Punkte → alle werden Absätze, Reihenfolge erhalten (3.2/3.5)', () => {
    let s = stateFor(docOf(bulletList(item(para('a')), item(para('b')), item(para('c')))))
    const from = posBeforeText(s.doc, 'a')
    const to = posBeforeText(s.doc, 'c') + 'c'.length
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, from, to)))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph', 'paragraph'])
    expect(s.doc.textContent).toBe('abc')
  })

  it('nummerierte Liste: beide Teillisten bleiben ordered_list mit GLEICHEM start (Grenzfall 4.3, dokumentiert, kein Fix)', () => {
    let s = stateFor(docOf(orderedList(1, item(para('eins')), item(para('zwei')), item(para('drei')))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'zwei')))))
    s = applyLift(s)
    const [first, , third] = s.doc.content.content
    expect(first.type.name).toBe('ordered_list')
    expect(third.type.name).toBe('ordered_list')
    expect(first.attrs.start).toBe(1)
    expect(third.attrs.start).toBe(1) // bestätigt: im eigenen Modell NICHT fortlaufend
  })

  it('verschachtelt: tiefster Punkt wird zunächst nur eine Ebene gehoben, bleibt Listenpunkt (3.6/Grenzfall 4.4)', () => {
    const inner = bulletList(item(para('tief')))
    let s = stateFor(docOf(bulletList(item(para('außen'), inner))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'tief')))))
    s = applyLift(s)
    const outer = s.doc.content.content[0]
    expect(outer.type.name).toBe('bullet_list')
    expect(outer.content.childCount).toBe(2) // 'außen' + hochgehobenes 'tief', noch KEIN Absatz
    // zweiter Klick auf denselben, jetzt obersten Punkt → normaler Absatz. Die Struktur hat
    // sich durch den ersten Lift verändert (kein `inner`-Wrapper mehr) — posBeforeText findet
    // 'tief' an seiner NEUEN Position, ohne dass hier erneut etwas nachgerechnet werden muss.
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'tief')))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph'])
  })

  it('Zusatzblock (Bild nach Absatz) im Punkt wird eigenständiger Geschwisterblock (3.9/Grenzfall 10)', () => {
    const img = wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
    let s = stateFor(docOf(bulletList(item(para('mit Bild'), img))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'mit Bild')))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'image'])
  })

  it('Selektion vom Listenpunkt in nachfolgenden normalen Absatz → No-Op (Grenzfall 4.5)', () => {
    const s0 = stateFor(docOf(bulletList(item(para('punkt'))), para('normal')))
    const from = posBeforeText(s0.doc, 'punkt')
    const to = posBeforeText(s0.doc, 'normal') + 2 // irgendwo innerhalb des Folgeabsatzes
    const s = s0.apply(s0.tr.setSelection(TextSelection.create(s0.doc, from, to)))
    const before = s.doc.toJSON()
    const applied = liftFromList()(s, () => { throw new Error('sollte nicht dispatchen') })
    expect(applied).toBe(false)
    expect(s.doc.toJSON()).toEqual(before)
  })

  it('AllSelection (Strg+A) über gemischtem Inhalt → No-Op (Grenzfall 4.6)', () => {
    const s0 = stateFor(docOf(bulletList(item(para('punkt'))), para('normal')))
    const s = s0.apply(s0.tr.setSelection(new AllSelection(s0.doc)))
    const applied = liftFromList()(s, () => { throw new Error('sollte nicht dispatchen') })
    expect(applied).toBe(false)
  })

  it('nach dem Aufheben wieder listenfähig (3.13)', () => {
    let s = stateFor(docOf(bulletList(item(para('punkt')))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'punkt')))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(posBeforeText(s.doc, 'punkt')))))
    let ok = false
    toggleList(false)(s, (tr) => { s = s.apply(tr); ok = true })
    expect(ok).toBe(true)
    expect(s.doc.content.content[0].type.name).toBe('bullet_list')
  })
})

describe('canLiftFromList (Abschnitt 3.3, Grenzfall 1/15)', () => {
  it('false im normalen Absatz', () => {
    expect(canLiftFromList(stateFor(docOf(para('normal'))))).toBe(false)
  })
  it('true mit Cursor im Listenpunkt', () => {
    const s0 = stateFor(docOf(bulletList(item(para('punkt')))))
    const s = s0.apply(s0.tr.setSelection(TextSelection.near(s0.doc.resolve(posBeforeText(s0.doc, 'punkt')))))
    expect(canLiftFromList(s)).toBe(true)
  })
  it('false für Selektion Liste→Folgeabsatz (deckungsgleich mit dem echten Klick-Ergebnis, Grenzfall 4.5)', () => {
    const s0 = stateFor(docOf(bulletList(item(para('punkt'))), para('normal')))
    const from = posBeforeText(s0.doc, 'punkt')
    const to = posBeforeText(s0.doc, 'normal') + 2
    const s = s0.apply(s0.tr.setSelection(TextSelection.create(s0.doc, from, to)))
    expect(canLiftFromList(s)).toBe(false)
  })
})
```

**Neu: `src/formats/odt/__tests__/list-structure.test.ts`** — sichert die in Abschnitt 3.1/3.2
belegten (bereits korrekten) Reader-Verhalten als **Regressionsnetz** gegen echte Fixtures ab
(DoD 6, Testfall 12/Grenzfall 4.4). Reine Reader-Prüfung, keine Aufhebe-Aktion:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'
import { wordSchema } from '../../shared/schema'

const DIR = join(__dirname, '../../../../tests/fixtures/external/odt')
const load = (name: string) => readOdt(new Blob([readFileSync(join(DIR, name))]))
const collectText = (n: any, out: string[] = []): string[] => {
  if (n.type === 'text') out.push(n.text)
  ;(n.content ?? []).forEach((c: any) => collectText(c, out))
  return out
}
const findList = (n: any): any =>
  n.type === 'bullet_list' || n.type === 'ordered_list' ? n : (n.content ?? []).map(findList).find(Boolean)

describe('imageWithinList.odt (Abschnitt 3.1 / Testfall 5.2.5 / DoD 6)', () => {
  it('Bild-only-Punkt ist schemakonform unter block+ und behält das Bild', async () => {
    const doc = await load('imageWithinList.odt')
    const list = findList(doc.body)
    expect(list).toBeTruthy()
    const it0 = list.content[0]
    // KEIN führender Leerabsatz erwartet — block+ erlaubt [image] direkt (Abschnitt 3.1)
    expect(it0.content[0].type).toBe('image')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})

describe('listLevel10.odt (Abschnitt 3.2 / Testfall 12 / Grenzfall 4.4)', () => {
  it('importiert als echte, tief verschachtelte ordered_list (nicht flach)', async () => {
    const doc = await load('listLevel10.odt')
    let node: any = findList(doc.body)
    let depth = 0
    while (node) {
      depth++
      node = (node.content?.[0]?.content ?? []).find((c: any) => c.type === 'bullet_list' || c.type === 'ordered_list')
    }
    expect(depth).toBeGreaterThanOrEqual(9)
  })
  it('erhält den Hyperlink-Text "www.tool.de" (Abschnitt 3.2 — bereits korrekt)', async () => {
    const doc = await load('listLevel10.odt')
    expect(collectText(doc.body).join('')).toContain('www.tool.de')
  })
  it('wird von wordSchema.nodeFromJSON akzeptiert', async () => {
    const doc = await load('listLevel10.odt')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** (neuer `describe`-Block nach
`'DOCX round trip: lists'`, `:141`; nutzt vorhandene Helfer `doc`/`paragraph`/`roundTrip`
`:14/23/27`, `TINY_PNG` `:11`) — prüft Reader/Writer direkt mit dem **Zustand nach** dem
Aufheben (schneller als E2E, unabhängige XML-Prüfung):

```ts
describe('DOCX round trip: Zustand nach Liste aufheben (Grenzfall 3/14)', () => {
  it('Absatz zwischen zwei Bullet-Listen: mittlerer <w:p> ohne <w:numPr>, Reimport ergibt Liste/Absatz/Liste', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster')] }] },
      paragraph('Aufgehoben'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter')] }] },
    ])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const xml = await zip.file('word/document.xml')!.async('text')
    const middle = xml.split('Aufgehoben')[0].split('<w:p>').pop()
    expect(middle).not.toContain('numPr')
    const result = await readDocx(blob)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('nummerierte Liste durch Absatz getrennt: beide Hälften bleiben ordered_list (Grenzfall 4.3)', async () => {
    const original = doc([
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('eins')] }] },
      paragraph('mitte'),
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('drei')] }] },
    ])
    const result = await roundTrip(original)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['ordered_list', 'paragraph', 'ordered_list'])
  })

  it('ganze Liste aufgehoben: kein <w:numPr> irgendwo (Testfall 5.1.2)', async () => {
    const blob = await writeDocx(doc([paragraph('a'), paragraph('b'), paragraph('c')]))
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('numPr')
  })

  it('Bild nach aufgehobenem Absatz überlebt als eigenständiger Block (Testfall 5.1.5)', async () => {
    const result = await roundTrip(doc([paragraph('Text'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }]))
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'image'])
  })
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** (analog, nach
`'ODT round trip: lists'` `:143`; Helfer `doc`/`paragraph`/`roundTrip` `:16/25/29`,
`writeOdt`/`readOdt` `:2-3`):

```ts
describe('ODT round trip: Zustand nach Liste aufheben (Testfall 5.2.1/5.2.2)', () => {
  it('Absatz zwischen zwei Bullet-Listen → zwei getrennte <text:list>, Reimport Liste/Absatz/Liste', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster')] }] },
      paragraph('Aufgehoben'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter')] }] },
    ])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(((await zip.file('content.xml')!.async('text')).match(/<text:list /g) ?? []).length).toBe(2)
    const result = await readOdt(blob)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('ganze Liste aufgehoben: kein <text:list in content.xml (Testfall 5.2.2)', async () => {
    const blob = await writeOdt(doc([paragraph('a'), paragraph('b'), paragraph('c')]))
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(await zip.file('content.xml')!.async('text')).not.toContain('<text:list')
  })

  it('Punkt mit zwei Absätzen (Form nach Merge-Lift) erhält beide, in Reihenfolge', async () => {
    const result = await roundTrip(doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('erste'), paragraph('zweite')] }] },
    ]))
    const it0 = (result.body as any).content[0].content[0]
    expect(it0.content.map((p: any) => p.content?.[0]?.text)).toEqual(['erste', 'zweite'])
  })
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/liste-aufheben.spec.ts`** — Kernstück der Anforderung. Übernimmt die
bereits in `docx.spec.ts`/`odt.spec.ts` etablierten `odtCard`/`docxCard`-Locator- und
`input[type="file"].setInputFiles(...)`-Upload-Muster (req Testfall 10 verlangt „echten
Datei-Upload" als Eigenschaft, nicht ein bestimmtes Playwright-API — der etablierte
`setInputFiles`-Mechanismus bedient denselben `<input>`, den ein echter Klick öffnete;
Begründung Abschnitt 8). Buttons werden über `getByTitle(...)` angesprochen; der
Aktiv/Inaktiv-Zustand über `toBeEnabled()`/`toBeDisabled()` (natives `disabled`, Abschnitt 3.3).

Abgedeckte Testfälle (req Abschnitt 6) und Grenzfälle:
- **TF 1** Bullet 3er, mittleren Punkt aufheben → 2 `li`, mittlerer als `p`, Text erhalten (3.1/3.4).
- **TF 2** alle Punkte (Strg+A in der Liste) → `ul,ol` verschwindet, nur `p` (3.2/3.5).
- **TF 3** nummeriert, mittlerer Punkt → zweite `ol` bleibt `ol`; `(ol).start` protokollieren (erwartet `1`, Grenzfall 4.3/3.6).
- **TF 4 / Grenzfall 1** Cursor im normalen Absatz → Button `toBeDisabled()`; **TF 4b** Cursor in Liste → `toBeEnabled()` (Grenzfall 15).
- **TF 5 / Grenzfall 4.5** Selektion Listenpunkt→Folgeabsatz: `li`-Anzahl unverändert (No-Op protokolliert).
- **TF 6 / Grenzfall 4.6** Strg+A über Liste+Absatz: `li` unverändert (kein „alle Listen entfernen").
- **TF 7 / Grenzfall 8** Liste in Tabellenzelle: nur diese Zelle betroffen, `td`-Anzahl + Nachbarzelle unverändert.
- **TF 8** Undo/Redo (`Mod-z`/`Mod-y`): Liste zurück / erneut aufgehoben (3.10).
- **TF 9** nach Aufheben erneut „1. Liste" → `ol li` mit Text (3.13).
- **Grenzfall 2** Liste erzeugen + sofort aufheben ohne Text → kein Crash, kein `ul/ol`.

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

const odtCard = (page: import('@playwright/test').Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
const docxCard = (page: import('@playwright/test').Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
async function uploadFixture(page: import('@playwright/test').Page, card: ReturnType<typeof odtCard>, path: string, mimeType: string) {
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path)
  await card.locator('input[type="file"]').setInputFiles({ name: path.split('/').pop()!, mimeType, buffer })
}

test.describe('Liste aufheben — Toolbar & Grundverhalten', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('TF1: mittleren Punkt aufheben, Text bleibt, Rest bleibt Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(2)
    await expect(editor.locator('p', { hasText: 'zwei' })).toBeVisible()
    await expect(editor).toContainText('einszweidrei')
  })

  test('TF4/Grenzfall1: außerhalb einer Liste ist der Button disabled; in einer Liste enabled (TF4b)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    await expect(page.getByTitle('Liste aufheben')).toBeDisabled()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await expect(page.getByTitle('Liste aufheben')).toBeEnabled()
  })

  test('TF3: nummeriert, mittleren Punkt aufheben — zweite Teilliste bleibt ol, start protokollieren', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Nummerierte Liste').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    const lists = editor.locator('ol')
    await expect(lists).toHaveCount(2)
    expect(await lists.nth(1).evaluate((el) => (el as HTMLOListElement).start)).toBe(1) // Abschnitt 3.6
    await expect(lists.nth(1).locator('li').first()).toHaveText('drei')
  })

  test('TF8: Undo/Redo um "Liste aufheben"', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('li')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('li')).toHaveCount(0)
  })

  // ... TF2, TF5, TF6, TF7, TF9, Grenzfall 2 analog (siehe Testfall-Liste oben)
})
```

**Fremddateien & Rundreisen (`liste-aufheben.spec.ts`, zweiter `describe`):**
- **TF 10 / Rundreise 5.1.1 & 5.2.1**: DOCX- bzw. ODT-Eigenrundreise über echten
  `page.waitForEvent('download')`; exportiertes XML **direkt** (ohne eigenen Reader) prüfen
  (`document.xml` ohne `numPr` am mittleren Absatz / genau 2 `<text:list `), dann Reimport.
- **TF 11a / 5.1.6 / Grenzfall 12**: `ComplexNumberedLists.docx` (> 50 Punkte) importieren,
  einen Punkt aufheben, sichtbaren Gesamttext vor/nach vergleichen (kein Zeichenverlust).
- **TF 11b / 5.2.5 / DoD 6**: `imageWithinList.odt` importieren (`img` sichtbar), Punkt
  aufheben → `ul,ol` verschwindet, `img` bleibt (Abschnitt 3.1/3.7).
- **TF 11c / 5.2.4 / Grenzfall 8**: `listsInTable.odt`, Punkt in Zelle aufheben, `td`-Anzahl
  unverändert.
- **TF 12 / Grenzfall 4.4 (ODT):** `listLevel10.odt`, tiefsten Punkt **wiederholt** aufheben
  (Schleife bis Button `toBeDisabled()` oder Zielabsatz sichtbar, Obergrenze 15 gegen
  Endlosschleife), Klickzahl per `console.log` protokollieren.
- **TF 12b / 5.1.4 / Grenzfall 4.4 (DOCX):** `ComplexNumberedLists.docx` — **neu gegenüber
  Vorentwurf**, da DOCX echte Verschachtelung erzeugt (Abschnitt 2): prüfen, dass verschachtelte
  `li ul, li ol` entstehen, tiefsten Punkt aufheben, Text jedes Zwischenschritts erhalten.
- **TF 13 / Grenzfall 13**: `brokenList.odt`, `ListOddity.odt` importieren, sofern editierbar
  je einen Punkt aufheben → kein Crash (`brokenList.odt` ist als `SKIP_SLOW_UNDER_JSDOM`
  markiert und **muss** daher hier im echten Chromium laufen, nicht als Vitest-Unit-Test).
- **TF 14 / 5.3**: Cross-Format DOCX→ODT→DOCX und ODT→DOCX→ODT, je einen Punkt aufheben, Text
  über beide Konvertierungen erhalten.
- **TF 15**: Sichtprüfung — aufgehobener Absatz hat `getComputedStyle(...).marginLeft === '0px'`
  (kein Listeneinzug).

```ts
test('TF11b/DoD6: imageWithinList.odt — Bild-Punkt aufheben, Bild bleibt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/imageWithinList.odt', 'application/vnd.oasis.opendocument.text')
  const editor = page.locator('.ProseMirror')
  await expect(editor.locator('img')).toHaveCount(1)
  await editor.locator('li').first().click()
  await page.getByTitle('Liste aufheben').click()
  await expect(editor.locator('ul, ol')).toHaveCount(0)
  await expect(editor.locator('img')).toHaveCount(1) // Bild darf nicht verschwinden
})

test('TF12/Grenzfall4.4: listLevel10.odt — tiefsten Punkt wiederholt aufheben, Klicks protokollieren', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listLevel10.odt', 'application/vnd.oasis.opendocument.text')
  const editor = page.locator('.ProseMirror')
  const button = page.getByTitle('Liste aufheben')
  const deepestText = 'ASDAS' // per Fixture-Analyse (Abschnitt 6)
  await expect(editor.locator('li', { hasText: deepestText }).last()).toBeVisible()
  let clicks = 0
  while (clicks < 15) {
    await editor.locator('li', { hasText: deepestText }).last().click()
    if (!(await button.isEnabled())) break
    await button.click(); clicks++
    if (await editor.locator('p', { hasText: deepestText }).count()) break
  }
  expect(clicks).toBeGreaterThan(0)
  await expect(editor.locator('p', { hasText: deepestText })).toBeVisible()
  // eslint-disable-next-line no-console
  console.log(`listLevel10.odt: ${clicks} Klicks bis zum normalen Absatz (Grenzfall 4.4/TF12)`)
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** (Grenzfall 4.11 / DoD 7 — neben dem
bestehenden „Fett"-Test, mit „Liste aufheben" als zusätzlichem Schritt in der bekannten
Bug-Sequenz):

```ts
test('gleiche Regression mit "Liste aufheben" als Zusatzschritt (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.locator('li').click()
  await page.getByTitle('Liste aufheben').click()
  await editor.click()
  await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor.locator('p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — reale Dateien, durch Entpacken geprüft

| Datei | Bestätigter Inhalt (diese Prüfung) | Relevanz |
|---|---|---|
| `tests/fixtures/external/odt/listLevel10.odt` | `text:list-level-style-number` (→ **ordered**, 10 Ebenen). Tiefster Punkt enthält `<text:a xlink:href="http://www.tool.de/"><text:span>www.tool.de</text:span></text:a>`. Reader heute: echte 9+-Ebenen-Verschachtelung **und** „www.tool.de" erhalten (Abschnitt 3.2). | TF 12 / Grenzfall 4.4 (mehrstufig, Klicks) + Regressionsnetz Hyperlink-Text |
| `tests/fixtures/external/odt/imageWithinList.odt` | **Bullet** (`text:list-level-style-bullet`), **ein** `<text:list-item>` mit nur `<text:p><draw:frame><draw:image .../></draw:frame></text:p>` (kein Text). Reader heute: `list_item.content = [image]` — **schemakonform unter `block+`** (Abschnitt 3.1), **kein** führender Leerabsatz. | TF 11b / 5.2.5 / DoD 6 |
| `tests/fixtures/external/odt/listsInTable.odt` | `<table:table>` mit `<text:list>` in Zellen; Punkte haben eigenes leeres `<text:p>` (verletzen die Struktur nicht) | TF 11c / 5.2.4 / Grenzfall 8 |
| `tests/fixtures/external/docx/ComplexNumberedLists.docx` (+ `Numbering*.docx`) | Vorhanden, importiert crashfrei; Reader rekonstruiert `w:ilvl`-Verschachtelung (`groupLists`, Abschnitt 2) → **echte** Mehrstufigkeit im Modell | TF 11a / 5.1.6 (reale Rundreise) + TF 12b / 5.1.4 (DOCX-mehrstufig) |
| `tests/fixtures/external/odt/brokenList.odt` | Als `SKIP_SLOW_UNDER_JSDOM` markiert (groß/langsam unter jsdom) → Grenzfall 13 **muss** im E2E laufen, nicht als Vitest-Test | TF 13 / Grenzfall 13 |
| `tests/fixtures/external/odt/ListOddity.odt` | importiert crashfrei | TF 13 / Grenzfall 13 |
| `tests/fixtures/external/odt/{bulletListTest,list,liste2,simple_bullet_list,simpleList,EasyList,ListRoundtrip,ContinueListTest,preparedList}.odt` | vorhanden | 5.2.7 (Basis-Rundreisen) |

---

## 7. Unabhängige Parser-Validierung (Rundreise-Punkt 8, DoD 2)

Reines TypeScript/Vite-Repo ohne Python-Toolchain. Zweistufig:

1. **Automatisiert:** Die E2E-Tests (Abschnitt 5.2) prüfen den exportierten XML-String
   **direkt** per Regex/`includes`, **ohne** `readDocx`/`readOdt` (`document.xml` ohne
   `numPr`; `content.xml` mit genau 2 `<text:list `). Damit ist „nicht nur mit dem eigenen
   Reader rückgelesen" für die automatisierte Suite erfüllt.
2. **Manuell, einmalig, vor Statuswechsel:** Eine nach „Liste aufheben" exportierte
   **nummerierte** Test-DOCX (TF 3) in einem echten, unabhängigen Word/LibreOffice öffnen und
   dokumentieren, ob die zweite Teilliste dort **fortlaufend** oder **neu bei „1."** zählt —
   das beantwortet die in Abschnitt 3.6 (Punkt 2) als Hypothese eingestufte Cross-Tool-Divergenz
   **empirisch**. Ergebnis in `liste-aufheben-req.md`/dieser Datei nachtragen.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`liftFromList()` selbst** (`commands.ts:62-64`) — bleibt reiner Bibliotheks-Alias. Kein
  projekteigener Sonderfall für Verschachtelung, Selektionsgrenzen oder Zusatzblöcke nötig
  (Abschnitt 3.5/3.6/3.7).
- **`schema.ts` `list_item`** — `block+` ist bereits korrekt und bewusst so (Abschnitt 3.1);
  jede Rückänderung auf `paragraph block*` würde `imageWithinList.odt`/`listLevel10.odt` beim
  Import brechen.
- **`odt/reader.ts`** — Bild-only-Punkt gültig, generischer Inline-Fallback erhält `text:a`-Text
  bereits (Abschnitt 3.1/3.2). Keine Änderung.
- **`docx/{reader.ts,writer.ts,styleDefs.ts}` Kernlogik** — Mehrstufigkeit + Split/Rundreise
  bereits korrekt (Abschnitt 2/3.8); höchstens ein optionaler Doku-Kommentar in `styleDefs.ts`
  (Abschnitt 3.6).
- **`odt/writer.ts`** — Listen/verschachtelte Listen/Zusatzblöcke bereits korrekt geschrieben.
- **`Toolbar.tsx` „• Liste"/„1. Liste"** — kein `aria-label`, keine Änderung; gehören zu
  `aufzaehlungsliste-req.md`/`nummerierte-liste-req.md`. Konsistente a11y-Ergänzung dort ist
  **Empfehlung** an jene Anforderungen, keine Codeänderung dieses Plans.
- **`WordEditor.tsx` Keymap** — keine Tastenkombination (Abschnitt 3.4, begründete Entscheidung).
- **E2E `setInputFiles(...)` statt `page.on('filechooser')`** — bedient denselben `<input>`;
  konsistent mit `docx.spec.ts`/`odt.spec.ts`, erfüllt „echter Datei-Upload" (req TF 10).

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`nummerierung-fortsetzen-neustarten`** (Backlog „teilweise"): muss den in Abschnitt 3.6
  dokumentierten Split-Fall abdecken (soll die zweite Teilliste fortsetzen oder neu beginnen —
  konfigurierbar?). Kein Fix hier.
- **`mehrstufige-liste`/`liste-einruecken-tab`** (Backlog „fehlt", Priorität 1/2): Sobald
  Tab/Shift-Tab zum Ein-/Ausrücken **im Editor selbst** existiert, wird der „ein Klick pro
  Ebene"-Fall (Abschnitt 3.5) auch ohne Import erreichbar. `canLiftFromList` bleibt dann
  unverändert korrekt (prüft dieselbe Bedingung, unabhängig von der Entstehung der
  Verschachtelung). **Anders als der Vorentwurf behauptete, ist der mehrstufige Fall schon
  heute über DOCX *und* ODT erreichbar** (Abschnitt 2) — der fehlende Editor-UI-Pfad begrenzt
  nur das Erzeugen, nicht das Aufheben.
- **`hyperlink-einfuegen`** (Backlog „fehlt"): der generische `text:a`-Fallback
  (`odt/reader.ts:160-167`) erhält bewusst nur den Text, nicht den `href`. Sobald
  `hyperlink-einfuegen` umgesetzt wird, ist dieser Zweig um eine echte Link-Mark zu erweitern —
  keine Kollision mit diesem Plan.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 6/7/8 → Umsetzung)

| Anforderung | Abgedeckt durch |
|---|---|
| TF 1–9 (Toolbar/Grundverhalten) | `tests/e2e/liste-aufheben.spec.ts`, „Toolbar & Grundverhalten" + `commands.test.ts` |
| TF 10 (Rundreise über echten Upload/Download je Format) | `liste-aufheben.spec.ts`, „Fremddateien & Rundreisen" |
| TF 11 (reale Fremddatei-Importe + Aufheben) | `liste-aufheben.spec.ts` — `ComplexNumberedLists.docx`, `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt` |
| TF 12 / Grenzfall 4.4 (mehrstufig, Klicks protokollieren) | `liste-aufheben.spec.ts` (ODT `listLevel10.odt` **und** DOCX `ComplexNumberedLists.docx`) + `list-structure.test.ts` (Struktur-Vorprüfung) |
| TF 13 (Regression Selection-Sync) | `selection-regression.spec.ts`, neuer Test |
| TF 14 (Cross-Format doppelt) | `liste-aufheben.spec.ts`, TF 14 |
| TF 15 (optischer Vergleich) | `liste-aufheben.spec.ts`, TF 15 |
| Grenzfall 1/15 (Aktiv/Inaktiv, `aria-label`) | Abschnitt 3.3 (Fix) + `commands.test.ts` (`canLiftFromList`) + `liste-aufheben.spec.ts` TF 4/4b |
| Grenzfall 2 (leere Liste sofort aufheben) | `commands.test.ts` + `liste-aufheben.spec.ts` |
| Grenzfall 3/4.3/4.14 (Nummerierung zweite Teilliste) | Abschnitt 3.6 + `commands.test.ts` + `roundtrip.test.ts` + `liste-aufheben.spec.ts` TF 3 + Abschnitt 7 Punkt 2 (manuell) |
| Grenzfall 4.4 / Abschnitt 3.6 (ein Klick pro Ebene) | Abschnitt 3.5 (Entscheidung) + `commands.test.ts` (verschachtelt) + `liste-aufheben.spec.ts` TF 12 |
| Grenzfall 4.5 (Selektion über Listenrand) | `commands.test.ts` + `liste-aufheben.spec.ts` TF 5 |
| Grenzfall 4.6 (Strg+A gemischt) | `commands.test.ts` + `liste-aufheben.spec.ts` TF 6 |
| Grenzfall 7 (Abgrenzung Enter-auf-leerem-Punkt) | Abschnitt 2 (getrennte Codepfade) — keine Verwechslung, bestehende `Enter`-Tests + neue Button-Tests getrennt |
| Grenzfall 8 (Liste in Tabellenzelle) | `liste-aufheben.spec.ts` TF 7 + TF 11c |
| Grenzfall 9 (zwei direkt aufeinanderfolgende Listen) | Abschnitt 3.8 + `roundtrip.test.ts`-Erweiterung |
| Grenzfall 10 (Zusatzblock im Punkt) | Abschnitt 3.7 + `commands.test.ts` + `liste-aufheben.spec.ts` TF 11b |
| Grenzfall 11 (Selection-Sync-Bug) | `selection-regression.spec.ts`, neuer Test |
| Grenzfall 12 (sehr lange Liste) | `liste-aufheben.spec.ts` TF 11a (`ComplexNumberedLists.docx`) |
| Grenzfall 13 (kaputtes Markup) | `liste-aufheben.spec.ts` TF 13 |
| Grenzfall 14 (DOCX-Reimport, Trennabsatz) | Abschnitt 3.8 + `roundtrip.test.ts`-Erweiterung |
| Grenzfall 16 (Cursor an Absatzgrenze) | `commands.test.ts` (gleicher Mechanismus wie 4.5) |
| Grenzfall 17 (verschachtelter Untertyp, nur DOCX) | dokumentierte Cross-Format-Einschränkung (Abschnitt 2, `writer.ts:134-135`: Unterknoten erbt `numId`+`level`); Text bleibt — Prüfung Texttreue in TF 12b |
| „Bug 3.1/3.2" des Vorentwurfs | **gegenstandslos** — beide bereits im Code gelöst (Abschnitt 3.1/3.2); als Regressionsnetz in `list-structure.test.ts` festgehalten |
| DoD 1 (alle TF automatisiert, grün) | Abschnitt 5, vollständig |
| DoD 2 (reale Fremddateien je Format) | DOCX `ComplexNumberedLists.docx`; ODT `listLevel10.odt`/`imageWithinList.odt`/`listsInTable.odt` |
| DoD 3 (Selektion über Listenrand geprüft/dokumentiert) | Abschnitt 2/3.3 + Grenzfall-4.5/4.6-Tests |
| DoD 4 (mehrstufig geprüft, Ein-Klick-pro-Ebene-Entscheid) | Abschnitt 3.5 + TF 12/12b |
| DoD 5 (Nummerierung zweite Teilliste bestätigt/dokumentiert) | Abschnitt 3.6 + Abschnitt 7 |
| DoD 6 (Zusatzblöcke, `imageWithinList.odt`) | Abschnitt 3.1/3.7 + `list-structure.test.ts` + TF 11b |
| DoD 7 (Regressionstest dauerhaft) | `selection-regression.spec.ts`-Erweiterung |
| DoD 8 (`aria-label`/Zustand/Tastenkombination bewusst entschieden) | Abschnitt 3.3 (implementiert) + Abschnitt 3.4 (bewusst keine Taste) |
| DoD 9/10 (kein Fund ohne Ticket/Vermerk) | Abschnitt 9 (Abhängigkeiten mit Ziel-Slug) |
