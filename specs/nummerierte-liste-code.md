# Umsetzungsplan: Feature „Nummerierte Liste"

Bezug: `specs/nummerierte-liste-req.md` (verbindliche Anforderung). Dieses Dokument ist
der dateigenaue Umsetzungsplan gegen den tatsächlichen Code-Stand (Repo `E:\docs`,
Stand dieser Prüfung). Alle Aussagen unten zu „Ist-Stand" wurden durch tatsächliches
Lesen der genannten Dateien verifiziert (nicht aus der Anforderungsdatei übernommen,
auch wenn sie sich in den meisten Punkten decken).

Geschwister-Dokumente mit überlappendem Code (selbe Dateien, andere Blickrichtung):
`specs/aufzaehlungsliste-req.md`, `specs/liste-aufheben-req.md`,
`specs/liste-einruecken-tab-req.md`. Der Backlog kennt zusätzlich den noch nicht als
eigene Datei ausformulierten Slug `nummerierung-fortsetzen-neustarten` (Status
„teilweise", Priorität 3) — da `nummerierte-liste-req.md` Abschnitt 2.5/6.3 dieses
Verhalten explizit selbst fordert und keine eigene Anforderungsdatei existiert, deckt
dieser Plan es mit ab. Wo eine Änderung gleichzeitig eine Anforderung eines
Geschwister-Dokuments erfüllt, ist das vermerkt — es ersetzt aber nicht deren eigene
Abnahmekriterien (eigene E2E-Tests, eigene `aria-label`-Texte, eigenes
Bullet-Symbol-Handling usw.).

---

## 0. Zusammenfassung der Prüfung

Der in `nummerierte-liste-req.md` Abschnitt 5 dokumentierte Verdacht ist **fast
vollständig bestätigt**, und die Code-Prüfung hat zusätzlich mehrere **neue, bisher
nicht dokumentierte, konkrete Bugs** zutage gefördert, die schwerer wiegen als die
schon vermuteten:

- **Nummerierte Liste innerhalb einer Tabellenzelle geht beim DOCX-Import komplett
  verloren** (nicht nur die Ebene, wie bei der Kopfebene — die *gesamte*
  Listenerkennung fehlt in diesem Pfad, siehe §1.4). Das ist gravierender als alles,
  was in Abschnitt 5 der Anforderung vermutet wird, und betrifft Anforderung 2.8
  direkt.
- **`toggleList` ist kein echtes Toggle und kann beim erneuten Klick auf „1. Liste"
  innerhalb einer bereits bestehenden Liste eine ungewollte Liste-in-Liste-Verschachtelung
  erzeugen** oder je nach Cursor-Position ein stiller No-Op sein — durch Lesen von
  `prosemirror-schema-list` bestätigt, nicht nur vermutet (siehe §1.2). Das verletzt
  Anforderung 2.7 direkt („Es darf keine verschachtelte Liste-in-Liste entstehen").
- **ODT-Reader lässt `<text:list-header>` (unnummerierte Listen-Kopfzeile) komplett
  aus** — Textverlust, nicht nur Formatverlust (siehe §1.6), einschlägig für die
  Fixtures `ListHeading.odt`/`ListHeading2.odt`.
- **ODT-Reader mischt `styles.xml`-Automatikstile nie in die Body-Auflösung ein** —
  nur `content.xml`s eigene `office:automatic-styles` werden für den Dokumenttext
  verwendet; Listenstile, die (wie in `listStyleId.odt`/`ListStyleResolution.odt`)
  nur in `styles.xml` liegen, werden nicht gefunden und fallen auf „bullet" zurück
  (siehe §1.6).
- Alle in Abschnitt 5 der Anforderung genannten Verdachtspunkte (kein Ein-/Ausrücken,
  DOCX-Ebenen-Flatten bei Import *und* Export, feste globale Nummerierungs-ID,
  wirkungsloses `start`-Attribut, keine Fortsetzen/Neustart-Funktion, nur eine
  Formatdefinition pro Ebene, fehlender aktiver Button-Zustand, lückenhafte
  Testabdeckung) sind **bestätigt** — Fundstellen siehe unten.

Der Rest dieses Dokuments: §1 Bestätigte Befunde je Codebereich, §2 Zielentwurf/
Design-Entscheidungen, §3 dateigenauer Änderungsplan, §4 Testplan, §5 Umsetzungs­
reihenfolge, §6 offene, vor Umsetzung zu bestätigende Entscheidungen.

---

## 1. Bestätigte Befunde je Codebereich

### 1.1 Schema (`src/formats/shared/schema.ts`)

- `list_item` (Z. 98–104): `content: 'paragraph block*'` — **strukturell bereits
  verschachtelungsfähig**, da `bullet_list`/`ordered_list` zur Gruppe `'block'`
  gehören. Für Tab/Shift-Tab (`sinkListItem`/`liftListItem` aus
  `prosemirror-schema-list`) ist **keine Schemaänderung** nötig.
- `ordered_list` (Z. 83–96) hat bereits `attrs.start` (Default 1) und rendert es
  korrekt über natives `<ol start=…>`. Es gibt **keine** weiteren Attribute (kein
  Fortsetzen/Neustart-Flag, keine Ebenen-ID).
- Es gibt bewusst **keine** `listId`/Ebenen-Attribute — Verschachtelungstiefe ist rein
  strukturell (Anzahl der `list_item > (bullet_list|ordered_list)`-Verschachtelungen).
  Das ist für den Import/Export-Fix unten wichtig: Ebene und Zugehörigkeit zu einer
  „Nummerierungsfamilie" müssen beim Schreiben aus der **Baumposition** abgeleitet
  werden, nicht aus einem gespeicherten Attribut.

### 1.2 Commands (`src/formats/shared/editor/commands.ts`)

- `toggleList(ordered)` (Z. 57–60) ruft ausnahmslos `wrapInList(listType)` auf.
  Durch Lesen von `node_modules/prosemirror-schema-list/dist/index.js`
  (`wrapRangeInList`, dort Z. ~78–101) bestätigt:
  - Ist die Selektion der **erste** Punkt einer bestehenden, typkompatiblen Liste
    (Bullet und Ordered haben denselben Content-Ausdruck `list_item+`, gelten also
    als „kompatibel"), liefert `wrapRangeInList` `false` → **stiller No-Op**
    (`range.$from.index(range.depth - 1) == 0` → `return false`).
  - Ist die Selektion ein **späterer** Punkt derselben Liste, schlägt der Code den
    `doJoin`-Zweig ein und **verschachtelt den Punkt als Unterliste unter den
    vorherigen Geschwisterpunkt** — exakt die von Anforderung 2.7 verbotene
    „Liste-in-Liste".
  - Deckt sich mit `aufzaehlungsliste-req.md` Abschnitt 2.6/5.7, dort bereits mit
    Zeilenangaben aus der Bibliothek belegt.
  - **Zusätzlich bestätigt:** Ist die Selektion eine **ganze bestehende Liste**
    (mehrere/alle Punkte), landet `blockRange` beim `bullet_list`-Knoten selbst
    (`range.depth == 1`), der Sonderzweig greift nicht, `findWrapping` versucht, den
    Zielknotentyp direkt als Kind der bestehenden Liste einzufügen — das scheitert an
    `list_item+` als Content-Ausdruck der Liste (ein `ordered_list` ist kein
    `list_item`) → ebenfalls **stiller No-Op**.
- `liftFromList()` (Z. 62–64) ist ein reiner Alias für
  `liftListItem(wordSchema.nodes.list_item)`. Durch Lesen der Bibliothek bestätigt:
  Bei einem verschachtelten Punkt wird **nur eine Ebene** angehoben
  (`liftToOuterList`), erst auf der obersten Ebene wird vollständig in einen
  normalen Absatz umgewandelt (`liftOutOfList`) — **entspricht bereits der von
  Anforderung 2.6 gewünschten Word-Konvention**, muss nur noch mit einem echten Test
  nachgewiesen werden. Kein Codeänderungsbedarf an `liftFromList` selbst.
- `sinkListItem` wird **nirgends im Projekt importiert** (bestätigt per Grep über
  `src/`, keine Treffer außerhalb von `node_modules`). Es gibt keinen
  Einzugs-Befehl.
- Es gibt **keine** Funktion, die prüft, ob der Cursor in einer `ordered_list`/
  `bullet_list` steht (für `aria-pressed`), analog zu `isAlignActive`/`isInTable`.

### 1.3 Toolbar (`src/formats/shared/editor/Toolbar.tsx`)

- Button „1. Liste" (Z. 203–213): kein `aria-pressed`, kein `aria-label` — bestätigt,
  im Unterschied zu `MarkButton` (Z. 28–61, hat beides) und `AlignButton` (Z. 64–84).
- Keine Bedienelemente für Einzug (Tab-Ersatz für Maus/Screenreader), keine
  „Nummerierung fortsetzen/neu beginnen/Startwert"-UI — bestätigt, komplett
  abwesend (keine Selects, keine Popover, kein Kontextmenü irgendwo im Projekt).

### 1.4 Keymap (`src/formats/shared/editor/WordEditor.tsx`)

- Zwei `keymap()`-Plugins (Z. 71–80): eigenes mit `Mod-z/y/Shift-z`,
  `Enter: splitListItem(...)`, `Mod-b/i/u`; danach `keymap(baseKeymap)`. **Kein**
  `Tab`/`Shift-Tab`-Eintrag.
- `Enter: splitListItem(wordSchema.nodes.list_item)` (Z. 75) — durch Lesen der
  Bibliothek (`splitListItem`, `index.js` Z. 136–186) bestätigt:
  - Nicht-leerer Punkt → korrekter Split (Text bleibt erhalten).
  - Leerer Punkt am Ende einer **flachen** Liste: `splitListItem` selbst gibt
    `false` zurück (Bedingung `$from.depth == 3` in der Bibliothek), das Event
    fällt durch zum zweiten `keymap(baseKeymap)`-Plugin, dessen `Enter`-Kette
    (`newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock`,
    `prosemirror-commands/dist/index.js` Z. 812–814) den leeren Absatz per
    `liftEmptyBlock` aus der Liste hebt — **das ist bereits das in Anforderung 2.3
    gewünschte Verhalten**, funktioniert aber nur, *weil* zwei getrennte
    `keymap()`-Plugins existieren (ProseMirror reicht ein `false` an das nächste
    Plugin weiter). Muss mit echtem Test bestätigt werden, ist aber **kein**
    Implementierungslücke.
  - Bei einer **verschachtelten** Liste hebt `splitListItem` den leeren Punkt nur
    eine Ebene (Sonderfall Z. 144–176 der Bibliothek) — zu dokumentierendes,
    akzeptables Verhalten (deckt sich mit der Word-Konvention „eine Ebene pro
    Aktion").
- `Shift-Enter` ist **nirgends gebunden** (weder eigenes Plugin noch
  `baseKeymap`). Dieses konkrete Verhalten ist Gegenstand von
  `specs/zeilenumbruch-manuell-req.md` (eigener Slug) — dieser Plan **baut** die
  Tastenkombination nicht, verlangt aber einen eigenen Regressionstest, der prüft,
  dass Umschalt+Enter *innerhalb eines Listenpunkts* keinen neuen `list_item`
  erzeugt, sobald jenes Feature umgesetzt ist (§4).

### 1.5 DOCX (`src/formats/docx/reader.ts`, `writer.ts`, `styleDefs.ts`)

- `listMarkerFor` (`reader.ts` Z. 196–201): liest **nur** `w:numId`, **nicht**
  `w:ilvl`. Bestätigt.
- `groupLists` (`reader.ts` Z. 258–283): gruppiert rein nach `numId`-Gleichheit,
  erzeugt **eine flache** `list_item+`-Liste. Jede reale mehrstufige Datei (z. B.
  `ComplexNumberedLists.docx`) importiert dadurch komplett flach. Bestätigt.
- `parseNumberingXml` (`reader.ts` Z. 77–97): liest pro `abstractNum` **nur das
  erste** `<w:lvl>` (`firstChildNS(abstractEl, …, 'lvl')`, Z. 83) und ordnet dessen
  `numFmt` **der gesamten `numId` global** zu (`kindByNumId: Map<numId, kind>`).
  Weder Ebene noch Startwert/Override werden gelesen.
- **Neu bestätigt, schwerwiegender als vermutet — Liste in Tabellenzelle geht beim
  DOCX-Import komplett verloren:** `parseTable` (`reader.ts` Z. 210–256) baut
  Zelleninhalt über
  `childElements(tcEl, …, 'p').flatMap((p) => paragraphToBlocks(p, headingInfo, imageRels))`
  (Z. 236–238) — **ohne** `listMarkerFor`/`groupLists` aufzurufen. Absätze mit
  `w:numPr` innerhalb einer Zelle werden dadurch als **gewöhnliche Absätze**
  importiert, die komplette Listenstruktur (Aufzählung *und* Nummerierung) geht
  verloren. Das betrifft Anforderung 2.8 unmittelbar und ist gravierender als die in
  der Anforderung dokumentierten Verdachtspunkte (dort wird nur der Ebenenverlust
  vermutet, nicht der komplette Strukturverlust). Auf der Schreibseite (`writer.ts`,
  `tableToDocx` Z. 128–171 → `blockToDocx` generisch aufgerufen) funktioniert das
  Schreiben eines `ordered_list`/`bullet_list`-Knotens innerhalb einer Zelle
  hingegen **bereits** (mit denselben Ebenen-/ID-Mängeln wie überall sonst) — die
  Asymmetrie bedeutet: eine im Editor selbst erzeugte Liste-in-Tabellenzelle
  übersteht den Export, geht aber beim Reimport vollständig verloren.
- `blockToDocx` (`writer.ts` Z. 94–126): schreibt für **jeden** Absatz einer Liste
  hart `<w:ilvl w:val="0"/>` (Z. 103); der Fall `bullet_list`/`ordered_list`
  (Z. 112–118) berechnet die `numId` bei **jedem** rekursiven Aufruf neu allein aus
  dem Knotentyp (Z. 114), verwirft dabei den von außen hereingereichten
  `listNumId`-Parameter der äußeren Ebene vollständig — eine verschachtelte Liste
  wird beim Export vollständig flachgelegt (gleiche `numId`, `ilvl=0`, egal wie tief
  verschachtelt). Bestätigt.
- **Bestätigt: feste globale Nummerierungs-ID pro Typ.** `BULLET_NUM_ID = 1`,
  `ORDERED_NUM_ID = 2` (`styleDefs.ts` Z. 34–35) — **jede** nummerierte Liste im
  Dokument bekommt dieselbe `numId`. Das bestätigt den Verdacht aus Grenzfall 3.5:
  zwei unmittelbar aufeinanderfolgende, aber separat gemeinte Listen erzeugen beim
  Export identische, benachbarte `<w:p w:numId="2">`-Sequenzen ohne trennenden
  Nicht-Listen-Absatz dazwischen — `groupLists` beim Reimport verschmilzt sie dann
  zu **einer** durchlaufenden Liste, weil es nur nach `numId`-Wechsel bzw.
  Nicht-Listen-Absatz gruppiert (Z. 271–280). **Bestätigter, nicht nur vermuteter
  Bug.**
- `numberingXml()` (`styleDefs.ts` Z. 37–47): genau **ein** `<w:lvl ilvl="0">` je
  Typ, kein `w:startOverride`, keine Ebenen 1–8. Bestätigt.
- **`start`-Attribut wird beim Export nicht gelesen:** `blockToDocx`s
  `paragraph`-Fall (Z. 101–105) verwendet nur `listNumId`, nie `node.attrs.start`
  des umschließenden `ordered_list`. Beim Import wird `start` nie gesetzt (siehe
  oben, `groupLists` erzeugt das JSON-Objekt ohne `attrs` überhaupt, Z. 266) → selbst
  wenn der Export ihn schriebe, ginge er beim Reimport sofort wieder verloren.
  Doppelt bestätigter Bug (Schreiben *und* Lesen).

### 1.6 ODT (`src/formats/odt/reader.ts`, `writer.ts`, `styleRegistry.ts`)

- **Positiv bestätigt:** `elementToBlocks` (`reader.ts` Z. 164–206) rekursiert
  generisch; ein verschachteltes `<text:list>` innerhalb eines `<text:list-item>`
  erzeugt bereits heute eine echte, verschachtelte `bullet_list`/`ordered_list`-
  JSON-Struktur (Tiefenbegrenzung `MAX_NESTING_DEPTH = 25`). Der **Lesepfad** ist
  strukturell bereits mehrstufig-fähig — anders als DOCX. Ebenso schreibt
  `blockToOdt` (`writer.ts` Z. 75–85) verschachtelte Listenknoten korrekt als
  verschachteltes `<text:list>` innerhalb eines `<text:list-item>`.
- **Trotzdem nicht rundreisefähig, aus mehreren Gründen:**
  1. `listStyleDefs()` (`styleRegistry.ts` Z. 98–103) definiert je Typ nur
     **`text:level="1"`** — eine Ebene 2 referenziert denselben Stilnamen ohne
     dafür definierte Formatierung; wie LibreOffice/Word das rendern, ist ungeklärt
     (siehe `liste-einruecken-tab-req.md` Grenzfall 10).
  2. `BULLET_LIST_STYLE_NAME`/`ORDERED_LIST_STYLE_NAME` (Z. 95–96) sind **globale,
     fixe** Namen (`'LB'`/`'LO'`) — jede Liste im Dokument referenziert denselben
     Stil. Für ODF ist das anders als bei DOCX **nicht direkt** falsch (siehe
     nächster Punkt), aber unnötig, sobald ohnehin ein Registrierungsmechanismus für
     Ebenenformate gebaut wird (siehe §2).
  3. **`start`-Wert wird nirgends geschrieben oder gelesen.** ODF erwartet dafür
     `text:start-value` am **ersten** `<text:list-item>` einer Liste — weder
     `writer.ts` noch `reader.ts` kennen dieses Attribut.
  4. **Fortsetzen/Neustart wird nirgends abgebildet.** Weder `text:continue-
     numbering` noch `text:continue-list` werden geschrieben oder gelesen.
     `ContinueListTest.odt` (Fixture aus Abschnitt 4.2 der Anforderung) kann damit
     nachweislich nicht korrekt behandelt werden.
  5. **Neu bestätigt: `styles.xml`-Automatikstile fließen nie in die
     Body-Auflösung ein.** `readOdt` (Z. 239–285) parst `contentAutomaticStyles`
     (aus `content.xml`) für `bodyBlocks` (Z. 246–248), lädt `stylesXmlText`
     (Z. 252) aber **ausschließlich** für Kopf-/Fußzeilen (`stylesForChrome`,
     Z. 254–269) — nie für den Dokumenttext. Ein Listenstil, der (wie in
     `listStyleId.odt`/`ListStyleResolution.odt` zu erwarten) nur in `styles.xml`
     benannter, gemeinsamer Formatvorlagen liegt, wird für den Textkörper **nicht
     gefunden**; `elementToBlocks` (Z. 181) fällt dann auf `'bullet'` zurück — eine
     echte nummerierte Liste würde fälschlich als Aufzählung importiert. Bestätigter
     Bug, deckt sich mit `aufzaehlungsliste-req.md` Grenzfall 13, dort aus
     Bullet-Sicht beschrieben.
  6. **Neu bestätigt: `<text:list-header>` wird beim Import komplett ignoriert.**
     `elementToBlocks`s `text:list`-Fall (Z. 179–187) sammelt ausschließlich
     `childElements(el, …, 'list-item')` (Z. 182) — das laut ODF 1.2 §5.3.2 gültige
     Geschwisterelement `<text:list-header>` (eine nicht nummerierte Kopfzeile am
     Listenanfang) wird von `childElements` mangels passendem `localName` schlicht
     nie erfasst, sein gesamter Inhalt (Text!) verschwindet ersatzlos. Das ist ein
     **echter Textverlust**, keine reine Formatvereinfachung, und trifft exakt die
     Fixtures `ListHeading.odt`/`ListHeading2.odt` aus Abschnitt 4.2 der Anforderung.
  7. **Risiko einer Schema-Exception bei fehlendem führendem Absatz:** Enthält ein
     `<text:list-item>` als erstes Kind kein `<text:p>`, sondern direkt ein
     verschachteltes `<text:list>` (reales Muster mancher ODF-Erzeuger für reine
     „Container"-Unterlisten), erzeugt `elementToBlocks` ein `list_item`-JSON ohne
     führenden `paragraph`-Block — das verletzt den Content-Ausdruck `paragraph
     block*` des Schemas und lässt `wordSchema.nodeFromJSON(...)`
     (`WordEditor.tsx` Z. 65) mit einer Exception abbrechen (weiße Seite ohne
     Fehlermeldung, siehe Hauptspezifikation Abschnitt 1.2/18). Muss defensiv
     abgefangen werden (siehe §2.6).
- `listKinds` (`reader.ts` Z. 69–74) bestimmt „ordered" vs. „bullet" nur danach, ob
  *irgendein* `text:list-level-style-number` im Stil vorkommt — nicht je Ebene.
  Für eine einzelne, in sich konsistente Liste unkritisch, aber bei einem
  Listenstil, der auf verschiedenen Ebenen unterschiedliche Formatarten mischt
  (in Word/LibreOffice möglich), wird die **gesamte** Liste als ein einziger Typ
  eingeordnet statt je Ebene. Als bekannte Einschränkung zu dokumentieren, sofern
  keine reale Fixture das Gegenteil zeigt.

### 1.7 CSS (`src/index.css`)

- `.ProseMirror ul, .ProseMirror ol` (Z. 63–67): eine einzige Regel, unabhängig von
  Verschachtelungstiefe. Für nummerierte Listen ohne CSS-Zutun rendert jede
  verschachtelte `<ol>` bereits nativ mit eigener, bei 1 neu beginnender Zählung
  (kein Word-typisches „1.1"-Verbundformat, aber Anforderung 2.4 verlangt explizit
  nur „irgendeine unterscheidbare Nummerierung", kein Verbundformat) — das ist
  **grundsätzlich ausreichend**, es fehlt aber jede Regel für unterschiedliche
  `list-style-type` je Ebene (Anforderung 2.4: „Ebene 2 „a., b., c." oder „i., ii."").

### 1.8 Tests

- `src/formats/docx/__tests__/roundtrip.test.ts` Z. 135–171 und
  `src/formats/odt/__tests__/roundtrip.test.ts` Z. 135–160: nur flache Listen,
  Bullet-vs-Ordered-Unterscheidung, (nur DOCX) zwei Listen **mit** trennendem
  Absatz. Kein Mehrebenen-, Start-, Fortsetzen/Neustart-, Tabellenzellen- oder
  Adjazenz-ohne-Trenner-Test. Bestätigt.
- `external-fixtures.test.ts` (beide Formate): ausschließlich „Import stürzt nicht
  ab" über alle Fixtures hinweg (`for (const { name, buffer } of fixtures) { it('imports
  … without crashing', …) }`), **keine** inhaltlichen Assertions zu Listenstruktur,
  keine Rundreise. Bestätigt.
- Es existiert **keine** Testdatei für `commands.ts`/`Toolbar.tsx` auf Unit-Ebene und
  **kein** E2E-Test mit Bezug zu Listen (`tests/e2e/*.spec.ts` durchsucht, keine
  Treffer für „list"/„Liste"). Bestätigt.

---

## 2. Zielentwurf / Design-Entscheidungen

### 2.1 `toggleList` — echtes Umschalten statt `wrapInList`-Rohaufruf

Ersetzt die aktuelle 3-Zeilen-Implementierung durch eine Funktion, die den
tatsächlich betroffenen Bereich selbst klassifiziert, statt sich auf
`wrapInList`s Sonderfallbehandlung zu verlassen (die für „ganze Liste
umwandeln" nicht ausgelegt ist):

```
export function toggleList(ordered: boolean): Command {
  const targetType = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  return (state, dispatch) => {
    const { $from, $to } = state.selection
    const touchedLists = findTouchedListNodes(state.doc, $from.pos, $to.pos) // {pos, node}[]
    const touchedParagraphRuns = findConvertibleParagraphRuns(state.doc, $from.pos, $to.pos) // contiguous runs NOT inside a list

    if (touchedLists.length === 0 && touchedParagraphRuns.length === 0) return false

    if (dispatch) {
      const tr = state.tr
      // 1) Bestehende Listen, die bereits den Zieltyp haben UND vollständig von der
      //    Selektion erfasst sind → aufheben (echtes Toggle "aus").
      // 2) Bestehende Listen anderen Typs → in place per setNodeMarkup auf targetType
      //    umstellen (Attribute wie `start` möglichst übernehmen/zurücksetzen je
      //    nach Zieltyp), OHNE wrapInList — vermeidet die Verschachtelungs-/No-Op-Bugs.
      // 3) Nicht-Listen-Absätze (zusammenhängende Läufe) → klassisch wrapInList,
      //    genau wie heute (dieser Pfad ist unverändert korrekt).
      // Details siehe Pseudocode unten.
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

Präzisiertes Verhalten je Fall (ersetzt den heutigen alleinigen `wrapInList`-Aufruf):

| Ausgangslage der Selektion | Aktion |
|---|---|
| Vollständig außerhalb jeder Liste | Wie heute: `wrapInList(targetType)` auf den betroffenen zusammenhängenden Absatzlauf. |
| Vollständig innerhalb **einer** Liste, die **bereits** der Zieltyp ist | **Neu:** Liste aufheben (wie „Liste aufheben" auf den erfassten Bereich) — macht den Button zu einem echten Toggle „an/aus", behebt den heutigen stillen No-Op/die Verschachtelung bei erneutem Klick (§1.2). |
| Vollständig innerhalb **einer** Liste **anderen** Typs | **Neu:** `tr.setNodeMarkup(listPos, targetType, { start: node.attrs.start ?? 1 })` direkt auf den Listenknoten — kein `wrapInList`, keine Nested-List-Gefahr, funktioniert unabhängig von Cursor-Position (erster vs. späterer Punkt). |
| Mehrere Listen und/oder Mischung aus Liste(n) + normalen Absätzen | Jede vollständig/teilweise erfasste Liste einzeln nach obiger Regel behandeln; jeder zusammenhängende Nicht-Listen-Lauf einzeln per `wrapInList` in eine **neue** Liste verwandeln. Sonderfall Überschrift im erfassten Bereich: übersprungen (Schema erlaubt keine Heading in `list_item`), **nicht** die gesamte Aktion abbrechen (behebt den in `aufzaehlungsliste-req.md` Grenzfall 3.5 befürchteten Totalausfall). |
| Selektion deckt eine **ganze** bestehende Liste ab (Sonderfall der Zeile „eine Liste") | Wie „vollständig innerhalb einer Liste" behandeln (Sonderfall ist bereits durch `findTouchedListNodes` abgedeckt, kein extra Code nötig). |

`findTouchedListNodes`/`findConvertibleParagraphRuns` sind neue kleine Hilfsfunktionen
in `commands.ts`, implementiert über `state.doc.nodesBetween($from.pos, $to.pos, …)`
(gleiches Muster wie bereits in `setAlign`, Z. 17). Kein neuer Fremdimport nötig
außer ggf. `NodeRange`/`liftListItem`, die schon vorhanden sind.

### 2.2 Aktiver Button-Zustand

Neue Helfer in `commands.ts`, analog zu `isAlignActive`:

```
export function isListActive(state: EditorState, ordered: boolean): boolean {
  const type = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type === type) return true
  }
  return false
}
```

Wird für **beide** Listenbuttons ergänzt (Ordered ist durch `nummerierte-liste-req.md`
Punkt 1 explizit gefordert; Bullet wird aus Konsistenzgründen im selben Zug erledigt,
da exakt derselbe `Toolbar.tsx`-Codeblock angefasst wird — das erfüllt zugleich
`aufzaehlungsliste-req.md` Ist-Stand Punkt 9, ersetzt aber nicht dessen eigene
Abnahme).

### 2.3 Einzug (Tab/Shift-Tab)

Neue Commands (in `commands.ts`, Import von `sinkListItem` ergänzen):

```
export function indentListItem(): Command {
  return (state, dispatch) => {
    const inList = isInsideListItem(state) // Vorfahrenkette nach list_item absuchen
    if (sinkListItem(wordSchema.nodes.list_item)(state, dispatch)) return true
    // Kein Sink möglich (z. B. erster Punkt der (Unter-)Liste): innerhalb einer
    // Liste wird das Tab-Event trotzdem geschluckt (kein Fokusverlust, siehe
    // liste-einruecken-tab-req.md Grenzfall 1), außerhalb einer Liste NICHT
    // (Rückgabe false, Tab fällt durch an spätere Bindungen/Browser-Default).
    return inList
  }
}

export function outdentListItem(): Command {
  return liftListItem(wordSchema.nodes.list_item)
}
```

Bindung in `WordEditor.tsx`s erstem `keymap({...})`-Aufruf:

```
Tab: indentListItem(),
'Shift-Tab': outdentListItem(),
```

Kein `sinkListItem`-Attribut-Handling nötig: Die Bibliothek erzeugt beim Einrücken
eine neue Unterliste mit **Default-Attributen** (`start: 1`), das ist das erwartete
Verhalten (jede neue Verschachtelungsebene beginnt eigenständig bei 1, siehe
Anforderung 2.4). Kein Nachbessern der Attribute nötig.

Kreuzbezug: Damit ist die Kernanforderung aus `liste-einruecken-tab-req.md`
strukturell mit erledigt (dortiger eigener Abnahmeplan/eigene E2E-Tests bleiben
trotzdem separat zu erfüllen).

### 2.4 Nummerierung fortsetzen / neu starten / Startwert

**Datenmodell-Erweiterung** (`schema.ts`, `ordered_list.attrs`):

```
attrs: {
  start: { default: 1, validate: 'number' },
  numberingMode: { default: 'restart', validate: 'string' }, // 'restart' | 'continue'
}
```

- `restart` (Default): Liste beginnt bei `start` (Default weiterhin 1).
- `continue`: Liste zählt die Nummerierung der **unmittelbar vorangehenden**
  `ordered_list` gleichen Typs fort; `start` wird für diesen Fall vom System selbst
  berechnet (nicht vom Nutzer editierbar) und bei jeder Dokumentänderung aktuell
  gehalten (siehe unten, Plugin).

**Neuer ProseMirror-Plugin** `src/formats/shared/editor/listNumbering.ts` (neue
Datei): `appendTransaction`-Plugin, das nach jeder Transaktion, die den Dokument­
inhalt verändert hat, alle `ordered_list`-Knoten mit `numberingMode === 'continue'`
findet und deren `start` auf `(Summe der `list_item`-Kinder aller vorangehenden,
zusammengehörigen `ordered_list`-Knoten gleichen Typs, direkt durch Nicht-Listen-
Blöcke oder eine andere Liste getrennt oder nicht) + 1` neu berechnet, per
`tr.setNodeAttribute(pos, 'start', computed)`. Guard gegen Endlosschleifen: nur
dispatchen, wenn sich mindestens ein berechneter Wert geändert hat (gleiches Muster
wie der bestehende `sameDecorationSet`-Guard in `pagination.ts`, Z. 107–115).

**Toolbar-UI:** Neue Datei
`src/formats/shared/editor/ListNumberingMenu.tsx` — kleines Popover (visuell an
`PrivacyModal.tsx` angelehnt, aber als Dropdown unterhalb des Buttons statt
zentriertem Overlay), erreichbar über einen neuen kleinen „▾"-Button direkt neben
„1. Liste" in `Toolbar.tsx`. Inhalt:

- Radio „Bei 1 beginnen" (setzt `numberingMode: 'restart', start: 1`)
- Radio „Beginnen bei:" + Zahleneingabe (setzt `numberingMode: 'restart', start: N`)
- Radio „Nummerierung der vorherigen Liste fortsetzen" — nur aktivierbar, wenn
  rückwärts vom Cursor aus eine vorangehende `ordered_list` gefunden wird (sonst
  ausgegraut mit Tooltip-Begründung, kein stiller Fehlschlag); setzt
  `numberingMode: 'continue'`.

Neuer Command in `commands.ts`:

```
export function setListNumbering(mode: 'restart' | 'continue', start = 1): Command {
  return (state, dispatch) => {
    const pos = findEnclosingOrderedListPos(state) // null, wenn Cursor nicht in ordered_list
    if (pos == null) return false
    if (dispatch) {
      let tr = state.tr.setNodeAttribute(pos, 'numberingMode', mode)
      if (mode === 'restart') tr = tr.setNodeAttribute(pos, 'start', start)
      dispatch(tr)
    }
    return true
  }
}
```

### 2.5 DOCX-Export: eine `numId` je „Nummerierungsfamilie", `ilvl` aus Baumtiefe

Neue Datei `src/formats/docx/numberingRegistry.ts` (Muster wie
`ImageCollector`/`RelationshipRegistry`):

```
export class NumberingRegistry {
  // Vergibt für jede TOP-LEVEL-Liste (nicht selbst in einem list_item verschachtelt)
  // eine frische, im Dokument eindeutige numId. `continue`-Listen bekommen
  // stattdessen die numId der zuletzt gesehenen Top-Level-Liste GLEICHEN Typs
  // zurück (keine neue numId, keine startOverride) — das ist die eigentliche
  // Export-Seite von "Fortsetzen".
  allocate(kind: 'bullet' | 'ordered', start: number, mode: 'restart' | 'continue'): number
  // Liefert am Ende alle akkumulierten <w:num>-Einträge (inkl. w:lvlOverride/
  // w:startOverride für restart-Listen mit start !== 1) zur Einbettung in
  // numberingXml().
  serializeNumEntries(): string
}
```

`blockToDocx`/`blocksToDocx` (`writer.ts`) werden umgebaut: statt eines einzelnen
`listNumId: number | null`-Parameters bekommen sie einen
`listContext: { numId: number; level: number } | null`:

- `listContext == null` und Knoten ist `bullet_list`/`ordered_list` → **neue**
  Top-Level-Liste: `numId = registry.allocate(kind, node.attrs.start ?? 1,
  node.attrs.numberingMode ?? 'restart')`, `level = 0`.
- `listContext != null` und Knoten ist `bullet_list`/`ordered_list` (kommt nur vor,
  wenn wir gerade `list_item`-Inhalt rekursiv verarbeiten) → **verschachtelte**
  Liste derselben Familie: `numId` unverändert übernehmen, `level = min(level + 1,
  8)` (ab Ebene 9 wird Ebene 8 wiederholt — siehe §6, zu bestätigende
  Konvention, deckt Grenzfall 3.6). Wechselt der Knotentyp (Bullet↔Ordered) auf der
  tieferen Ebene, wird stattdessen eine **neue** Familie (`listContext = null`
  zurückgesetzt) begonnen — dokumentierte Vereinfachung, kein Crash/Datenverlust.
- `paragraph`-Fall: schreibt `<w:numPr><w:ilvl w:val="{level}"/><w:numId
  w:val="{numId}"/></w:numPr>`, sofern `listContext != null`.

`styleDefs.ts`/`numberingXml()`: `abstractNum` für Bullet und Ordered auf **9 Ebenen
(ilvl 0–8)** erweitern:
- Ordered: alternierendes Format `decimal` (0,3,6,…) / `lowerLetter` (1,4,7,…) /
  `lowerRoman` (2,5,8,…), passende `lvlText` (`%1.`, `%1)`, `%1.`) und
  aufsteigenden `w:ind`/`w:left` für die Einzugsdarstellung in Word selbst.
- Bullet: alternierendes Zeichen `•` / `○` / `▪` je Ebene (gängige Word-Konvention).
`numberingXml()` bekommt einen Parameter für die vom Writer akkumulierten,
dynamischen `<w:num>`-Einträge (aus `NumberingRegistry.serializeNumEntries()`),
zusätzlich zu den beiden statischen `abstractNum`-Blöcken.

### 2.6 DOCX-Import: `ilvl` lesen, Baum aus Stack rekonstruieren, Tabellenzellen einbeziehen

`listMarkerFor` liest zusätzlich `w:ilvl`:

```
interface ListMarker { numId: string | null; ilvl: number }
```

`parseNumberingXml` wird zu einer verschachtelten Struktur
`Map<numId, Map<ilvl, { kind: 'bullet'|'ordered'; start: number }>>` erweitert
(alle `<w:lvl>`-Kinder eines `abstractNum` lesen, nicht nur das erste; `w:start`
je Ebene; zusätzlich je `<w:num>` dessen `<w:lvlOverride>/<w:startOverride>`
einlesen und den jeweiligen Default überschreiben).

`groupLists` wird durch eine **Stack-basierte** Rekonstruktion ersetzt
(neue Funktion `buildListTree(items, numberingInfo)`):

- Stack-Frame: `{ numId, ilvl, listNode /* das im Aufbau befindliche JSON-Objekt */ }`.
- Gleiche `numId`, gleiche `ilvl` wie oberster Frame → neues `list_item` als
  Geschwister im obersten Frame anhängen.
- Gleiche `numId`, höhere `ilvl` → neuen Frame **innerhalb** des letzten
  `list_item` des aktuellen obersten Frames pushen (Überspringen mehrerer Ebenen in
  einem Schritt wird durch mehrfaches Pushen zwischenliegender Frames abgefangen —
  deckt „unordentliche" Dateien wie `NumberingWithOutOfOrderId.docx` ab).
- Gleiche `numId`, niedrigere `ilvl` → Frames poppen (jeweils den fertigen
  Listenknoten ins `list_item` des darunterliegenden Frames einhängen), bis die
  Ziel-Ebene erreicht ist oder der Stack leer ist (dann neuer Frame auf Ebene 0).
- Andere/keine `numId` → **gesamten Stack schließen** (alle offenen Frames
  auflösen und einhängen), danach normal weiterverarbeiten (Absatz/Bild/Tabelle als
  Geschwister).
- `start`/`numberingMode` je entstehendem `ordered_list`-Knoten aus
  `numberingInfo` auflösen (`start` je nach `numId`+`ilvl`; `numberingMode` bleibt
  vorerst immer `'restart'`, da OOXML keine dedizierte „continue"-Markierung
  kennt außer der bereits durch **geteilte** `numId` ausgedrückten Fortsetzung —
  siehe nächster Punkt).
- **Fortsetzen-Erkennung beim Import:** Wird `flush()` durch einen
  Nicht-Listen-Block ausgelöst und taucht **danach** wieder dieselbe `numId` auf,
  ist das laut OOXML-Semantik eine **fortgesetzte** Liste (Word behandelt gleiche
  `numId` nach einer Unterbrechung weiterhin als eine Zählkette, sofern kein
  `w:startOverride` das Gegenteil erzwingt). `buildListTree` muss deshalb pro
  `numId` die Gesamtzahl bereits emittierter `list_item`s auf Ebene 0
  mitzählen und für die **zweite** (und jede weitere) Gruppe mit derselben
  `numId` `numberingMode: 'continue'` sowie `start = <bisherige Anzahl> + 1`
  setzen — **außer** ein `w:startOverride` für diese Ebene ist gesetzt, dann hat
  Vorrang `numberingMode: 'restart'` mit dem Override-Wert (das ist exakt die
  Umkehrung des in Anforderung Grenzfall 3.5 beschriebenen Verschmelzungs-Risikos:
  nach dem Fix in §2.5 bekommt jede *bewusst neue* Liste eine **eigene** `numId`,
  sodass zwei benachbarte, getrennt gemeinte Listen beim Reimport garantiert
  getrennt bleiben; nur eine *bewusst fortgesetzte* Liste teilt sich absichtlich
  eine `numId`).

**Tabellenzellen-Fix:** `parseTable`s Zellinhalt-Aufbau (Z. 236–238) wird auf
denselben Pfad umgestellt wie `readBodyChildren` — neue gemeinsame Hilfsfunktion
`readParagraphsAndTables(children: Element[], headingInfo, imageRels, zip,
depth): Promise<JsonNode[]>`, die Absatz-/Tabellen-Kinder einliest, Listenmarker
erfasst und `buildListTree` aufruft. `readBodyChildren` und `parseTable` rufen
beide diese Funktion auf, statt eigenen/keinen Gruppierungscode zu haben. Das
behebt den in §1.5 beschriebenen Komplettverlust von Listen in Tabellenzellen.

### 2.7 ODT-Export: eigener Listenstil-Name je Top-Level-Liste, volle Ebenen-Defs, `start`/Fortsetzen

`styleRegistry.ts`:
- `listStyleDefs()` wird umgebaut zu einer Funktion, die für einen gegebenen
  **eindeutigen** Stilnamen (`LO1`, `LO2`, …/`LB1`, `LB2`, …) einen vollständigen
  Satz von 9 Ebenen-Definitionen erzeugt (gleiche Formatkette wie beim
  DOCX-Pendant: decimal/lowerLetter/lowerRoman bzw. •/○/▪), inkl. wachsendem
  `text:space-before` je Ebene.
- Neue Klasse `ListStyleRegistry` (gleiche Datei), analog zu `TextStyleRegistry`:
  vergibt bei jeder **Top-Level**-Liste (nicht selbst in einem `list_item`
  verschachtelt) einen frischen Namen und akkumuliert dessen volle
  Ebenen-Definition; verschachtelte Listen **derselben Familie** referenzieren
  denselben Namen (Ebene ergibt sich aus der `<text:list>`-Verschachtelungstiefe,
  ODF-nativ, keine weitere Buchführung nötig).

`writer.ts`:
- `blockToOdt`s `bullet_list`/`ordered_list`-Fall bekommt denselben
  `listContext`-Parameter wie der DOCX-Writer (siehe §2.5), nur dass statt einer
  `numId` ein Stilname aus `ListStyleRegistry` verwaltet wird.
- `start !== 1` (nur bei `numberingMode === 'restart'`): das **erste**
  `<text:list-item>` der Top-Level-Liste bekommt `text:start-value="{start}"`.
- `numberingMode === 'continue'`: das `<text:list>`-Element der Top-Level-Liste
  bekommt zusätzlich `text:continue-numbering="true"`.

### 2.8 ODT-Import: `styles.xml` einbeziehen, `start`/Fortsetzen lesen, `list-header` nicht verlieren, Schema-Absturz abfangen

`reader.ts`:
- `readOdt` lädt `stylesXmlText` **vor** dem Parsen von `bodyBlocks` und merged
  dessen `automatic-styles` (und, für Listenstile ausreichend, auch
  `office:styles`, dort können benannte, nicht-automatische Stile liegen) in
  dieselben `ParsedStyles`-Maps, die für den Textkörper verwendet werden
  (Präzedenz: `content.xml` gewinnt bei Namenskollision). Behebt §1.6 Punkt 5.
- `listKinds` wird (wie beim DOCX-Pendant) zu `Map<styleName, Map<level, 'bullet'|
  'ordered'>>`; zusätzlich wird pro Ebene der Startwert aus
  `text:list-level-style-number/@style:num-format` bzw. — für den tatsächlichen
  Listenstart — aus `text:start-value` am ersten `<text:list-item>` gelesen.
- `elementToBlocks`s `text:list`-Fall sammelt zusätzlich
  `childElements(el, ODF_NAMESPACES.text, 'list-header')`; deren Inhalt wird als
  **eigener Absatz-Block VOR** dem entstehenden `bullet_list`/`ordered_list`-Knoten
  eingefügt (nicht als Listenpunkt — unser Schema kennt keinen „unnummerierten
  Listenpunkt"; das ist eine bewusste, zu dokumentierende Vereinfachung, verhindert
  aber den heutigen Textverlust vollständig). Behebt §1.6 Punkt 6.
- `text:continue-numbering="true"`/`text:continue-list` am `<text:list>` →
  `numberingMode: 'continue'`, `start` wird wie beim DOCX-Import als „bisherige
  Anzahl der Punkte der vorangehenden, zusammengehörigen Liste + 1" berechnet
  (Buchführung über Stilname/Continue-Kette, analog zur `numId`-Buchführung).
- **Defensive Absicherung gegen Schema-Exceptions** (§1.6 Punkt 7): Nach dem Bau
  eines `list_item`-JSON-Objekts wird geprüft, ob `content[0]?.type === 'paragraph'`
  gilt; falls nicht (z. B. erstes Kind ist bereits eine verschachtelte Liste),
  wird ein leerer `{ type: 'paragraph', attrs: { align: 'left' }, content: [] }`
  vorangestellt. Verhindert die in Abschnitt 1.2 der Hauptspezifikation
  ausgeschlossene „weiße Seite ohne Fehlermeldung".

### 2.9 CSS

`src/index.css`: Regeln nach Verschachtelungstiefe ergänzen (ergänzt die
bestehende `padding-left`-Regel, ersetzt sie nicht):

```css
.ProseMirror ol { list-style-type: decimal; }
.ProseMirror ol ol { list-style-type: lower-alpha; }
.ProseMirror ol ol ol { list-style-type: lower-roman; }
.ProseMirror ol ol ol ol { list-style-type: decimal; }
.ProseMirror ul { list-style-type: disc; }
.ProseMirror ul ul { list-style-type: circle; }
.ProseMirror ul ul ul { list-style-type: square; }
.ProseMirror ul ul ul ul { list-style-type: disc; }
```

(Zyklus wiederholt sich alle 3 Ebenen — deckt sich mit der DOCX/ODT-Formatkette
aus §2.5/§2.7 und erfüllt Anforderung 2.4/3.6 „irgendeine unterscheidbare
Nummerierung je Ebene".)

---

## 3. Dateigenauer Änderungsplan

| Datei | Art der Änderung |
|---|---|
| `src/formats/shared/schema.ts` | `ordered_list.attrs` um `numberingMode` erweitern (§2.4). Kein sonstiger Schema-Eingriff. |
| `src/formats/shared/editor/commands.ts` | `toggleList` neu implementiert (§2.1); `isListActive` neu; `indentListItem`/`outdentListItem` neu (Import `sinkListItem` ergänzen, §2.3); `setListNumbering` + `findEnclosingOrderedListPos` neu (§2.4); kleine Hilfsfunktionen `findTouchedListNodes`, `findConvertibleParagraphRuns`, `isInsideListItem`. |
| `src/formats/shared/editor/Toolbar.tsx` | `aria-pressed`/`aria-label` an „1. Liste" (und „• Liste") ergänzen über `isListActive`; neuer „▾"-Button neben „1. Liste", öffnet `ListNumberingMenu`. |
| `src/formats/shared/editor/ListNumberingMenu.tsx` (neu) | Popover-Komponente für Fortsetzen/Neustart/Startwert (§2.4). |
| `src/formats/shared/editor/listNumbering.ts` (neu) | ProseMirror-Plugin zur Neuberechnung von `start` für `numberingMode: 'continue'`-Listen nach jeder Transaktion (§2.4). |
| `src/formats/shared/editor/WordEditor.tsx` | `Tab`/`Shift-Tab` in die bestehende `keymap({...})` ergänzen; neues Plugin aus `listNumbering.ts` in die Plugin-Liste aufnehmen. |
| `src/index.css` | Ebenenabhängige `list-style-type`-Regeln ergänzen (§2.9). |
| `src/formats/docx/reader.ts` | `listMarkerFor` liest `w:ilvl`; `parseNumberingXml` liefert verschachtelte `numId→ilvl→{kind,start}`-Struktur inkl. `w:lvlOverride`/`w:startOverride`; `groupLists` durch `buildListTree` (Stack-Algorithmus, §2.6) ersetzt; neue gemeinsame Funktion `readParagraphsAndTables` für Body **und** Tabellenzellen (behebt Zellverlust, §2.6); defensive Absicherung analog §2.8 (führender Absatz) auch hier ergänzen, falls durch Bild-Split o. Ä. ein `list_item` ohne Paragraph entstehen könnte. |
| `src/formats/docx/writer.ts` | `blockToDocx`/`blocksToDocx` auf `listContext: {numId, level} | null`-Parameter umgestellt (§2.5); `NumberingRegistry`-Instanz pro `writeDocx`-Aufruf anlegen und durchreichen; `tableToDocx` reicht `listContext` unverändert durch (Zellen sind bereits generisch angebunden, keine Änderung an der Zellrekursion selbst nötig außer Parameterweitergabe). |
| `src/formats/docx/numberingRegistry.ts` (neu) | `NumberingRegistry`-Klasse (§2.5). |
| `src/formats/docx/styleDefs.ts` | `numberingXml()` erweitert: 9 Ebenen je Typ (alternierendes Format), Parameter für dynamische `<w:num>`-Einträge aus der Registry. |
| `src/formats/odt/reader.ts` | `parseAutomaticStyles`-Aufruf für `styles.xml` ergänzen und mergen (§2.8); `listKinds` zu ebenenbewusster Struktur inkl. Startwert/Continue-Erkennung; `text:list-header`-Behandlung; defensive Absicherung „führender Absatz". |
| `src/formats/odt/writer.ts` | `blockToOdt`s Listenfall auf `listContext`-Parameter mit `ListStyleRegistry` umgestellt (§2.7); `text:start-value`/`text:continue-numbering` schreiben. |
| `src/formats/odt/styleRegistry.ts` | `listStyleDefs()` umgebaut (parametrisiert, 9 Ebenen); neue `ListStyleRegistry`-Klasse. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neue `describe`-Blöcke: Mehrebenen-Liste, Startwert-Rundreise, Fortsetzen-Rundreise, zwei Listen **ohne** trennenden Absatz (Grenzfall 3.5), Liste in Tabellenzelle. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analoge neue `describe`-Blöcke, zusätzlich „zwei Listen mit trennendem Absatz" (fehlt bisher ganz, nur DOCX hat das). |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Neue, fixture-spezifische `describe`-Blöcke (nicht nur der generische Crash-Test) für `ComplexNumberedLists.docx` (Ebenentiefe ≥ 3 erhalten), `Numbering.docx`, `NumberingWithOutOfOrderId.docx`, `NumberingWOverrides.docx` (Start-/Override-Werte korrekt aufgelöst) inkl. Rundreise-Assertion. |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Neue fixture-spezifische Blöcke für `ContinueListTest.odt`, `listLevel10.odt`, `listsInTable.odt`, `simple-table-with-lists.odt`, `ListRoundtrip.odt`, `brokenList.odt`/`ListOddity.odt` (definiertes Fallback statt Crash), `listStyleId.odt`/`ListStyleResolution.odt` (Stilauflösung über `styles.xml`), `ListHeading.odt`/`ListHeading2.odt` (Text der Kopfzeile bleibt erhalten). |
| `src/formats/shared/editor/__tests__/list-commands.test.ts` (neu) | Unit-Tests für `toggleList`, `isListActive`, `indentListItem`/`outdentListItem`, `setListNumbering` direkt auf `EditorState`-Ebene (kein DOM nötig, analog zum bestehenden Muster reiner Funktionstests in `pagination.test.ts`). |
| `tests/e2e/lists.spec.ts` (neu) | Echte Browser-Bedienung: Liste erzeugen (Cursor/Selektion), Enter-Fälle, Tab/Shift-Tab inkl. Fokus-Erhalt, Toggle Bullet↔Ordered ohne Verschachtelung, Startwert-UI + Downloadprüfung, Fortsetzen-UI, `aria-pressed`, Liste in Tabellenzelle, Undo/Redo-Sequenzen, Selection-Sync-Regressionsmuster mit Listenbedienung als auslösendem Schritt. |

---

## 4. Testplan (Kurzfassung, Details siehe Tabelle in §3 und Anforderung Abschnitt 6)

1. Unit (`list-commands.test.ts`): alle in §2.1–§2.4 beschriebenen Fallunterscheidungen
   von `toggleList`, plus `isListActive`, `indentListItem`/`outdentListItem`
   (inkl. „erster Punkt → No-Op ohne Fokusverlust-Signal", hier auf Command-Ebene
   als `return true ohne docChanged` geprüft), `setListNumbering`.
2. Unit (`roundtrip.test.ts`, beide Formate): jede Zeile aus §3-Tabelle,
   insbesondere die beiden bisher fehlenden „ohne trennenden Absatz"-Fälle (Kern
   von Grenzfall 3.5) und Liste-in-Tabellenzelle.
3. Unit (`external-fixtures.test.ts`, beide Formate): inhaltliche Assertions für
   jede in Anforderung Abschnitt 4.2 genannte Datei, nicht nur „stürzt nicht ab".
4. E2E (`tests/e2e/lists.spec.ts`): alle Punkte aus Anforderung Abschnitt 6,
   ausgeführt über echten Datei-Upload/-Download, echte Tastatur-/Maus-Events.
5. Unabhängige Validierung (Anforderung Punkt 11/12 in Abschnitt 6): exportierte
   DOCX-Datei mit `python-docx` (oder direktem XML-Assert gegen die OOXML-
   Struktur) auf korrekte `w:ilvl`/`w:numId`/`w:startOverride` prüfen; exportierte
   ODT-Datei gegen ein unabhängiges ODF-Schema/-Tool auf korrekt verschachtelte
   `text:list` sowie `text:start-value`/`text:continue-numbering` prüfen. Diese
   Prüfung wird als manueller/CI-separater Schritt dokumentiert, nicht Teil der
   Vitest-Suite (kein Python-Toolchain-Zwang für den regulären Testlauf).

---

## 5. Empfohlene Umsetzungsreihenfolge

1. Schema-Attribut `numberingMode` + CSS-Ebenenregeln (risikoarm, keine
   Bestandsänderung an bestehenden Dokumenten, da Default `'restart'`).
2. `toggleList`-Neuimplementierung + `isListActive` + Toolbar-`aria-pressed`
   (behebt die Kernbedienung, unabhängig von Import/Export testbar).
3. Tab/Shift-Tab (`indentListItem`/`outdentListItem`) + Keymap-Bindung.
4. DOCX: `NumberingRegistry` + `styleDefs.ts`-Erweiterung + Writer-Umbau
   (Export-Seite zuerst, damit Schritt 5 gegen echte Dateien testbar ist).
5. DOCX: Reader-Umbau (`ilvl` lesen, `buildListTree`, Tabellenzellen-Fix).
6. DOCX-Rundreise-Tests inkl. realer Fixtures grün ziehen.
7. ODT: `ListStyleRegistry` + `styleRegistry.ts`-Erweiterung + Writer-Umbau.
8. ODT: Reader-Umbau (`styles.xml`-Merge, `list-header`, Continue/Start,
   defensive Absicherung).
9. ODT-Rundreise-Tests inkl. realer Fixtures grün ziehen.
10. „Fortsetzen/Neustart"-UI (`ListNumberingMenu.tsx` + `listNumbering.ts`-Plugin)
    zuletzt, da sie auf einem bereits funktionierenden `start`/`numberingMode`-
    Rundreisepfad aufsetzt.
11. E2E-Suite (`tests/e2e/lists.spec.ts`) durchgängig, inkl. Selection-Sync-
    Regressionstest mit Listenbedienung.

---

## 6. Vor Umsetzung zu bestätigende Entscheidungen (dürfen laut DoD nicht offen bleiben)

1. **Tiefenbegrenzung der Ebenenformate:** Ab Ebene 9 (`ilvl` 8) wird das Format
   von Ebene 8 wiederholt (kein Absturz, keine 10. Formatdefinition) — vorgeschlagen
   in §2.5, muss aber als bewusste Produktentscheidung bestätigt werden (Grenzfall
   3.6 der Anforderung verlangt nur „sinnvolle visuelle Grenze", nicht diese
   konkrete Umsetzung).
2. **Bullet↔Ordered-Typwechsel auf einer tieferen Verschachtelungsebene:** Wird
   als „neue Nummerierungsfamilie ab diesem Punkt" behandelt (§2.5) statt in der
   Elternfamilie abgebildet — zu bestätigen, dass das für reale Dateien
   ausreicht (betrifft `liste-einruecken-tab-req.md` Grenzfall 7 mit).
3. **„Liste aufheben" bleibt unverändert (`liftListItem`, eine Ebene pro Klick).**
   Bereits korrekt laut Bibliothekscode (§1.2) — nur zu bestätigen, keine
   Codeänderung geplant; falls Produktentscheidung stattdessen „ein Klick = komplett
   raus, egal welche Ebene" verlangt, wäre das eine bewusste Abweichung vom
   Bibliotheksverhalten und separat zu spezifizieren (siehe auch
   `liste-aufheben-req.md` Abschnitt 3.6, dort als offene Frage geführt).
4. **Kein Toast/Statussystem für „nichts zu tun" bei No-Op-Aktionen.** Es gibt
   projektweit keine Benachrichtigungskomponente. Dieser Plan behebt „stille
   Fehlschläge" für die Listenfunktion ausschließlich über sichtbaren Button-Zustand
   (`aria-pressed`, ggf. `aria-disabled`) und echtes Toggle-Verhalten (§2.1/2.2),
   **nicht** über eine neue globale Toast-Infrastruktur — zu bestätigen, dass das
   für die Abnahme ausreicht, oder ob eine projektweite Lösung (übergreifend für
   alle Formate, nicht nur Listen) vorgezogen werden soll.
5. **`text:list-header`-Fallback als normaler, vorangestellter Absatz** (§2.8) statt
   eines eigenen, unnummerierten Schema-Konzepts — zu bestätigen als ausreichend
   für „kein Datenverlust", auch wenn die visuelle Sonderrolle (keine Nummer) beim
   Reimport nicht wiederhergestellt wird (rein additiv zur bisherigen Situation, in
   der der Inhalt komplett verschwand).
6. **Fortsetzen-Erkennung beim DOCX-Import allein über geteilte `numId` nach einer
   Unterbrechung** (§2.6) — funktional korrekt für alle nach diesem Plan selbst
   exportierten Dateien (da jede *bewusst neue* Liste ab jetzt eine eigene `numId`
   bekommt), bei **fremden** Dateien aber nur so gut wie deren eigene `numId`-Vergabe;
   abweichende Erzeuger, die aus anderen Gründen dieselbe `numId` für eigentlich
   unabhängige Listen wiederverwenden, würden fälschlich als „Fortsetzen" erkannt —
   als bekannte Grenze zu dokumentieren, nicht lösbar ohne zusätzliche,
   nicht-standardisierte Heuristik.
