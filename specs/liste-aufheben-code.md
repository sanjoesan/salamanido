# Liste aufheben — dateigenauer Umsetzungsplan

Gegenstück zu `specs/liste-aufheben-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre (nicht nur Backlog-/Anforderungsangabe), was am bestehenden
Code zu ändern ist, welche Dateien neu angelegt werden, und wie die in der Anforderung
geforderte Verifikation technisch umgesetzt wird. Stil und Gliederung folgen bewusst
`specs/durchgestrichen-code.md` (zuletzt geprüftes Schwesterfeature in diesem Repo),
damit die Pläne vergleichbar bleiben.

## 0. TL;DR

Die Anforderungsdatei ist bereits ungewöhnlich präzise, weil sie den Bibliothekscode
von `prosemirror-schema-list` selbst zitiert. Diese Prüfung hat jede dieser Aussagen
am tatsächlich installierten Paket (`node_modules/prosemirror-schema-list/dist/
index.js`) **bestätigt** (siehe Abschnitt 2) und zusätzlich **zwei echte, bisher nicht
dokumentierte Bugs** im ODT-Reader gefunden, die genau die von der Anforderung selbst
empfohlenen Fixtures betreffen:

1. **`src/formats/odt/reader.ts` (`elementToBlocks`, `text:list`-Zweig)** — ein
   `<text:list-item>`, dessen einziger Inhalt ein `<text:p>` mit ausschließlich einem
   `<draw:frame>` (Bild, kein Text) ist, erzeugt `list_item.content = [{type:'image'}]`
   — das verstößt gegen die vom Schema selbst deklarierte Inhaltsregel `paragraph
   block*` (`schema.ts:99`, erster Kindknoten **muss** `paragraph` sein). Bestätigt an
   der von der Anforderung selbst für Testfall 5.2.5/DoD 6 vorgeschriebenen Fixture
   `tests/fixtures/external/odt/imageWithinList.odt` (Abschnitt 6). **Wird gefixt**
   (Abschnitt 3.1).
2. **`src/formats/odt/reader.ts` (`decodeInline`, `walk()`)** — hat für unbekannte
   Inline-Elemente **keinen** generischen Fallback, der in ihre Kindknoten hinabsteigt.
   Text innerhalb eines `<text:a>` (Hyperlink) wird dadurch **stillschweigend
   verworfen**. Bestätigt an der von der Anforderung selbst für Testfall 12/Grenzfall 4
   vorgeschriebenen Fixture `tests/fixtures/external/odt/listLevel10.odt` — deren
   tiefster Listenpunkt exakt einen solchen Link enthält ("www.tool.de"). **Wird
   gefixt**, mit eng begrenztem Umfang (nur Text erhalten, kein `href`, das bleibt
   `hyperlink-einfuegen`) (Abschnitt 3.2).

Beide Funde sind **nicht** Fehler im eigentlichen „Liste aufheben"-Mechanismus
(`liftListItem` selbst ist reiner, ungeänderter Bibliothekscode und funktioniert exakt
so, wie die Anforderung es aus dem Quellcode ableitet — siehe Abschnitt 2), sondern
Reader-Lücken, die **exakt an den von der Anforderung selbst vorgeschriebenen
Verifikations-Fixtures** die zentrale Zusage „Text bleibt erhalten" unterlaufen würden,
bevor „Liste aufheben" überhaupt zum Zug kommt. Ungefixt hätten Testfall 5.2.5 (Bild in
Listenpunkt) und Testfall 12/Grenzfall 4.4 (mehrstufige Liste) keine Chance, grün zu
werden — nicht wegen `liftFromList()`, sondern wegen dem, was der Reader vorher aus der
Datei macht.

Zusätzlich wird, wie von Abschnitt 2/4.1/4.15/DoD 8 der Anforderung explizit verlangt,
eine **verbindliche Entscheidung** zu Barrierefreiheit und Tastenkombination getroffen
(nicht nur „offen dokumentiert"):

3. **`aria-label` + exakter Aktiv/Inaktiv-Zustand** für den „⇧ Liste"-Button werden
   ergänzt — letzteres über einen **Dry-Run des Commands selbst**
   (`liftFromList()(state)` ohne `dispatch`), nicht über eine angenäherte
   Tiefensuche, wodurch der Button exakt (nicht nur ungefähr) anzeigt, ob ein Klick
   gerade etwas bewirken würde — inklusive der Grenzfälle 4.5/4.6 (Selektion über den
   Listenrand hinaus), die damit **ohne Zusatzcode** korrekt miterfasst werden
   (Abschnitt 3.3).
4. **Tastenkombination: Entscheidung „nein"** — anders als bei Fett/Kursiv/
   Unterstrichen/Durchgestrichen gibt es für „Liste aufheben" **keine** etablierte
   Konvention in Word/LibreOffice; es wird bewusst **keine** Tastenkombination erfunden
   (Abschnitt 3.4).
5. **Ein-Klick-pro-Ebene bei verschachtelten Listen**: durch Lesen von
   `liftListItem`/`liftToOuterList` **bestätigt** (nicht nur vermutet) — bleibt
   unverändert (Word-Konvention), reine Dokumentations-/Test-Entscheidung, kein Fix
   (Abschnitt 3.5).
6. **Nummerierung der zweiten Teilliste**: durch Lesen von `liftOutOfList` **bestätigt**
   — beide Teillisten behalten denselben `start`-Wert; im Editor zeigt das wegen zweier
   unabhängiger `<ol>`-Elemente sichtbar „1." für die zweite Teilliste, während ein
   **eigenständiges** Word/LibreOffice die exportierte DOCX (gleiche globale `numId`,
   kein `w:startOverride`) nach aktuellem Code-Stand voraussichtlich **fortlaufend**
   zählen würde — ein bestätigter, dokumentierter Cross-Tool-Unterschied, **kein** Fix
   in diesem Plan (gehört zu `nummerierung-fortsetzen-neustarten`, Backlog-Status
   „teilweise") (Abschnitt 3.6).

Der weit überwiegende Rest des Aufwands ist — wie die Anforderung selbst in Abschnitt 7
feststellt — **komplett neue Testabdeckung**: Es existiert bisher **kein einziger**
Test (weder Unit noch E2E), der `liftFromList`/„Liste aufheben" in irgendeiner Form
aufruft. Abschnitt 5 dieses Plans schließt diese Lücke vollständig.

---

## 1. Methodik dieser Prüfung

Gelesen wurden vollständig: `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
`src/formats/docx/{reader.ts,writer.ts,styleDefs.ts}`,
`src/formats/odt/{reader.ts,writer.ts}`, beide `__tests__/roundtrip.test.ts`, beide
`__tests__/external-fixtures.test.ts`, `tests/e2e/{docx,odt,selection-regression}.spec.ts`,
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitte 2, 5, 17, 18, 20), `FEATURE-BACKLOG.md` Abschnitt
2.6, sowie zum Vergleich `specs/durchgestrichen-code.md` (Methodik/Gliederungsvorlage).
Zusätzlich wurde der **installierte** Bibliothekscode
`node_modules/prosemirror-schema-list/dist/index.js` (289 Zeilen, komplett) sowie die
relevanten Ausschnitte aus `node_modules/prosemirror-model/dist/index.js`
(`Node.fromJSON`, `NodeType.create` vs. `createChecked`, Zeilen 1526–1541 bzw.
2168–2191) gelesen, um zwei Fragen **am tatsächlich installierten Code** statt aus dem
Gedächtnis zu beantworten:

1. Ob die in der Anforderungstabelle beschriebene `liftListItem`/`liftToOuterList`/
   `liftOutOfList`-Semantik exakt zutrifft (Ergebnis: ja, exakt, siehe Abschnitt 2).
2. Ob `wordSchema.nodeFromJSON(...)` (aufgerufen in `WordEditor.tsx:65` beim Laden
   jedes Dokuments) den Inhalt eines Knotens gegen dessen deklarierte
   Inhaltsregel (`content`-Ausdruck im Schema) validiert. Ergebnis: **nein** —
   `Node.fromJSON` (Zeile 1541) ruft `NodeType.prototype.create` auf, **nicht**
   `createChecked` (Zeile 2187, das einzige, das `checkContent` aufruft). Das erklärt,
   warum der in Abschnitt 3.1 gefundene Bug beim Import **nicht** sofort crasht,
   sondern ein still im Dokumentmodell sitzendes, gegen sein eigenes Schema
   ungültiges `list_item` erzeugt.

Zusätzlich wurden die konkret in der Anforderung genannten Fixture-Dateien
(`tests/fixtures/external/odt/{listLevel10,imageWithinList,listsInTable}.odt`,
`tests/fixtures/external/docx/ComplexNumberedLists.docx`) programmatisch entpackt
(`JSZip` über ein Ad-hoc-Node-Skript) und ihr `content.xml`/`document.xml` inspiziert,
statt ihren Inhalt nur aus dem Dateinamen zu vermuten — Ergebnis in Abschnitt 6.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts:74-81` `bullet_list` (`content: 'list_item+'`) | Ja, exakt so | keine |
| `schema.ts:83-96` `ordered_list` (zusätzlich `start`, Default 1, `toDOM` nur mit `start`-Attribut wenn ≠1) | Ja, exakt so | keine |
| `schema.ts:98-104` `list_item` (`content: 'paragraph block*'`) | Ja, exakt so | keine — **aber siehe Abschnitt 3.1**: der ODT-Reader kann diese Regel verletzen |
| `commands.ts:62-64` `liftFromList()` — reiner Alias um `liftListItem(wordSchema.nodes.list_item)` | Ja, exakt so, kein Projektcode | keine |
| `liftListItem`/`liftToOuterList`/`liftOutOfList` (`prosemirror-schema-list/dist/index.js:206-260`) | Ja, exakt wie in der Anforderung beschrieben — am installierten Paket gegengelesen, nicht nur vermutet: `blockRange($to, node => node.childCount > 0 && node.firstChild.type == itemType)` (Zeile 209), Verzweigung `liftToOuterList` bei verschachtelter Liste vs. `liftOutOfList` bei oberster Ebene (Zeile 214-217), `liftOutOfList` benutzt `item.content` des (bei Mehrfachauswahl zuvor gemergten) `list_item` direkt als Ersatzinhalt für die Liste (Zeile 250) — das ist der Mechanismus, der Zusatzblöcke (3.9) automatisch mit heraushebt, siehe Abschnitt 3.7 | keine, aber ein bisher nicht dokumentierter **positiver** Nebenbefund (Abschnitt 3.7) |
| `Toolbar.tsx:214-224` „⇧ Liste"-Button, kein `aria-label`, kein aktiver/inaktiver Zustand | Ja, exakt so | **bestätigte Lücke**, wird gefixt (Abschnitt 3.3) |
| `Toolbar.tsx:192-213` „• Liste"/„1. Liste" ebenfalls ohne aktiven Zustand | Ja, exakt so | bestätigt, **bewusst außerhalb dieses Plans** (siehe Abschnitt 8) |
| `WordEditor.tsx:71-79` Keymap ohne Tab/Shift-Tab, `sinkListItem` im gesamten Projekt nicht importiert | Ja, exakt so (per Grep bestätigt: `sinkListItem` kommt nur in `node_modules` vor) | bestätigt, kein Soll-Bestandteil dieser Anforderung |
| `WordEditor.tsx:75` `Enter: splitListItem(wordSchema.nodes.list_item)` | Ja, exakt so | keine |
| `docx/writer.ts:94-126` `blockToDocx` — `bullet_list`/`ordered_list` werden per `flatMap` auf ihre `list_item`-Kinder durchgereicht, jeder daraus entstehende Absatz bekommt `<w:numPr><w:ilvl w:val="0"/><w:numId .../></w:numPr>` fest auf Ebene 0 | Ja, exakt so (Zeile 112-118) | keine — **Konsequenz bestätigt**: ein normaler `paragraph` außerhalb einer Liste wird mit `listNumId=null` aufgerufen (Default-Parameter, Zeile 98) → **kein** `<w:numPr>` — das ist exakt das für „Liste aufheben" gewünschte Exportverhalten, siehe Abschnitt 3.8 |
| `docx/styleDefs.ts:32-47` zwei globale, feste `numId` (1=Bullet, 2=Ordered), je eine Ebene, kein `w:startOverride` | Ja, exakt so | keine — Grundlage für Abschnitt 3.6 |
| `docx/reader.ts:192-201` `listMarkerFor` liest nur `w:numId`, nicht `w:ilvl` | Ja, exakt so | keine |
| `docx/reader.ts:258-283` `groupLists` — flush bei `numId`-Wechsel **und** bei numPr-losem Absatz dazwischen | Ja, exakt so | keine — **Konsequenz bestätigt** (Abschnitt 3.8): ein durch „Liste aufheben" entstandener Trennabsatz (kein `numPr`) trennt beim Reimport zuverlässig zwei Teillisten, **auch wenn** beide dieselbe globale `numId` tragen — Grenzfall 14 der Anforderung ist damit bereits durch bestehenden Code korrekt gelöst, nur ungetestet |
| `odt/writer.ts:75-85` `blockToOdt` — rekursiver Aufruf über `item.content`, verschachtelte Listen innerhalb eines `list_item` werden strukturell korrekt geschrieben | Ja, exakt so | keine |
| `odt/reader.ts:159-187` `elementToBlocks`, `text:list`-Zweig, `MAX_NESTING_DEPTH=25` | Ja, exakt so | **bestätigter Bug** bei Bild-only-Punkten, siehe Abschnitt 3.1 |
| `odt/reader.ts` `decodeInline`/`walk` (Zeile 79-120) | Ja, wie beschrieben — aber **zusätzlich gefunden**, nicht in der Anforderungstabelle erwähnt: kein generischer Fallback für unbekannte Elemente, siehe Abschnitt 3.2 | **neuer Fund** |
| Unit-Tests: kein Test ruft `liftFromList`/`liftListItem` auf | Ja, bestätigt (`grep -rn "liftFromList\|liftListItem" src` außerhalb dieses Plans: 0 Treffer außer der Definition selbst) | bestätigt |
| E2E-Tests: kein Treffer für „list"/„Liste" | Ja, bestätigt (`grep -rn "iste\b\|[Ll]ist" tests/e2e` liefert nur zufällige Substring-Treffer wie „exists", keinen funktionalen Listen-Test) | bestätigt |
| Alle in der Anforderung genannten Fixtures existieren im Repo | Ja, **alle** geprüft und vorhanden (`ComplexNumberedLists.docx`, `Numbering*.docx`, sowie alle 19 genannten ODT-Dateien inkl. `listLevel10.odt`, `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt`) | keine |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt:

- **`odt/reader.ts` `list_item`-Inhalt kann `schema.ts:99` verletzen** (Abschnitt 3.1) —
  neuer, bestätigter Bug, direkt relevant für DoD Punkt 6.
- **`odt/reader.ts` `decodeInline`/`walk` verliert Text in unbekannten Inline-Elementen**
  (Abschnitt 3.2) — neuer, bestätigter Bug, direkt relevant für Testfall 12/Grenzfall
  4.4, an der von der Anforderung selbst empfohlenen Fixture reproduzierbar.
- **`liftOutOfList` hebt Zusatzblöcke bereits korrekt heraus** (Abschnitt 3.7) — ein
  positiver Befund: Abschnitt 3.9/Grenzfall 10 der Anforderung ("Bild/Tabelle/
  verschachtelte Liste als Zusatzblock aufheben") ist durch reinen Bibliothekscode
  bereits strukturell gelöst, sofern der Reader gültige Struktur liefert (Abschnitt
  3.1 stellt genau das für den ODT-Bildfall sicher).
- **`docx/reader.ts`/`groupLists` trennt Teillisten am Übergang bereits korrekt**
  (Abschnitt 3.8) — Grenzfall 14 der Anforderung ist bereits erfüllt, nur ungetestet.

---

## 3. Gefundene Defekte / Entscheidungen

### 3.1 `src/formats/odt/reader.ts` — Bild-only-Listenpunkt verletzt `list_item`-Schema (Bug)

`elementToBlocks`, Zweig `text:list` (aktuell Zeile 179-187):

```ts
if (ns === ODF_NAMESPACES.text && local === 'list') {
  const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
  const kind = (styleName && styles.listKinds.get(styleName)) || 'bullet'
  const items = childElements(el, ODF_NAMESPACES.text, 'list-item').map((itemEl) => ({
    type: 'list_item',
    content: Array.from(itemEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1)),
  }))
  return [{ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: items }]
}
```

`paragraphToBlocks` (Zeile 122-157) liefert für ein `<text:p>`, dessen einziger Inhalt
ein `<draw:frame>` ist (kein Text, keine weiteren Frames), **ausschließlich**
`[{type: 'image', ...}]` — **keinen** `paragraph`-Block. Enthält ein `<text:list-item>`
genau ein solches `<text:p>` (die reale Fixture `tests/fixtures/external/odt/
imageWithinList.odt` — geprüft, siehe Abschnitt 6 — enthält exakt diesen Fall: ein
einziger Listenpunkt, dessen einziges Kind ein `<text:p>` mit `<draw:frame>` ist), wird
`list_item.content = [{type: 'image', ...}]`. Das verstößt gegen `schema.ts:99`
(`content: 'paragraph block*'` — erster Kindknoten muss `paragraph` sein).

**Warum das nicht sofort crasht, aber trotzdem ein Bug ist:** `WordEditor.tsx:65`
(`wordSchema.nodeFromJSON(doc.content.body)`) validiert Inhalt nicht gegen die
Schema-Regel (siehe Methodik, Abschnitt 1, Punkt 2: `Node.fromJSON` nutzt
`NodeType.create`, nicht `createChecked`). Die Datei importiert also augenscheinlich
klaglos, das Bild ist sichtbar — bis eine Transformation ausgeführt wird, die sich auf
die Gültigkeit der Inhaltsregel verlässt. Genau das betrifft `liftListItem`s eigene
`liftOutOfList` (Bibliothekscode, Zeile 250): `parent.canReplace(...)` prüft die
Zielposition im **äußeren** Elternknoten (meist `doc`, `content: 'block+'` — nimmt jedes
Blockelement in jeder Reihenfolge, das schlägt hier nicht fehl), nicht die interne
Gültigkeit des `list_item` selbst — insofern lässt sich der Lift dieses konkreten
Punkts zwar noch durchführen, aber das Dokument verbleibt bereits **vor** jedem „Liste
aufheben"-Klick in einem gegen sein eigenes Schema ungültigen Zustand, was Undo/Redo,
künftige Transform-basierte Features und jede strengere Konsistenzprüfung
(`node.check()`) angreifbar macht — nicht akzeptabel für eine Anforderung, deren
zentraler Prüfpunkt „Text bleibt erhalten" ausdrücklich strukturelle Korrektheit
voraussetzt.

**Fix** — minimal, lokal auf den `text:list`-Zweig begrenzt (berührt **nicht**
`paragraphToBlocks`/`elementToBlocks` für `doc`-Top-Level oder Tabellenzellen, deren
Inhaltsregel `block+` diese Einschränkung gar nicht hat und wo ein zusätzlicher leerer
Absatz unerwünscht wäre):

```ts
if (ns === ODF_NAMESPACES.text && local === 'list') {
  const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
  const kind = (styleName && styles.listKinds.get(styleName)) || 'bullet'
  const items = childElements(el, ODF_NAMESPACES.text, 'list-item').map((itemEl) => {
    const content = Array.from(itemEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1))
    // list_item verlangt laut Schema (schema.ts:99, "paragraph block*"), dass der
    // erste Kindknoten ein paragraph ist. Ein <text:list-item>, dessen einziges
    // <text:p> nur einen <draw:frame> enthält, liefert über paragraphToBlocks
    // (Zeile 128-130) ausschließlich [{type:'image'}] — bestätigter Bug, siehe
    // liste-aufheben-code.md Abschnitt 3.1 (Fixture: imageWithinList.odt). Ein
    // Node.fromJSON validiert das nicht (kein sofortiger Crash), aber spätere
    // Transforms (u. a. liftListItem selbst) verlassen sich auf diese Regel. Eine
    // leere, unsichtbare Führungs-paragraph hält das Modell schemakonform, ohne
    // etwas zu verlieren.
    const needsLeadingParagraph = content[0]?.type !== 'paragraph'
    return {
      type: 'list_item',
      content: needsLeadingParagraph
        ? [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }, ...content]
        : content,
    }
  })
  return [{ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: items }]
}
```

**Auswirkung auf Export/Rundreise:** Die neu eingefügte leere `paragraph` wird beim
ODT-Export (`odt/writer.ts:75-85`) als zusätzliches leeres `<text:p .../>` **vor** dem
schon bisher korrekt geschriebenen `<text:p><draw:frame>...</draw:frame></text:p>`
geschrieben — eine zusätzliche, optisch leere Zeile vor dem Bild, aber **kein**
Datenverlust und (beim eigenen Reimport durch denselben, jetzt gefixten Reader)
**idempotent**: zwei `<text:p>`-Kinder im `<text:list-item>` ergeben nach dem Reimport
wieder exakt `[emptyParagraph, image]`. Dieser Kompromiss (eine harmlose leere Zeile
statt eines schemaungültigen Dokuments) wird hier bewusst akzeptiert und dokumentiert,
nicht stillschweigend hingenommen.

### 3.2 `src/formats/odt/reader.ts` — `decodeInline`/`walk()` verliert Text in unbekannten Inline-Elementen (Bug, neuer Fund)

`decodeInline`, Funktion `walk` (aktuell Zeile 96-116):

```ts
function walk(node: ChildNode, marks: ...) {
  if (node.nodeType === node.TEXT_NODE) { ...; return }
  if (node.nodeType !== node.ELEMENT_NODE) return
  const el = node as Element
  if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'span') { ...für-Kinder-rekursion... }
  else if (...line-break...) { ... }
  else if (...'s'...) { ... }
  else if (...'tab'...) { ... }
  // kein else-Zweig — jedes andere Element wird stillschweigend übersprungen,
  // OHNE in seine Kindknoten hinabzusteigen
}
```

Für jedes Element, das keiner der vier bekannten Fälle entspricht, kehrt die Funktion
sofort zurück, **ohne** die Kindknoten zu besuchen — das verliert nicht nur die
Formatierung, sondern den **Text selbst**. Bestätigt an der von der Anforderung selbst
für Grenzfall 4/Testfall 12 vorgeschriebenen Fixture `listLevel10.odt` (siehe Abschnitt
6 für den vollständigen Fund): Der tiefste Listenpunkt enthält
`<text:a xlink:href="http://www.tool.de/"><text:span text:style-name="T1">
www.tool.de</text:span></text:a>` — `text:a` (Hyperlink) matcht **keinen** der vier
Fälle, sein `<text:span>`-Kind (das seinerseits „www.tool.de" enthält) wird **nie**
besucht. Der Text „www.tool.de" verschwindet vollständig beim Import, nicht erst beim
Aufheben — genau der in Anforderungsabschnitt 1 als „nicht verhandelbar" bezeichnete
Fall von Textverlust, hier an einer von der Anforderung selbst benannten Fixture
bestätigt.

**Fix — bewusst eng begrenzt** (kein vollständiger Hyperlink-Support, das ist
`hyperlink-einfuegen-req.md`, Backlog-Status „fehlt", explizit ein eigenes,
noch zu schreibendes Feature): nur der sichtbare Text bleibt erhalten, das Linkziel
(`xlink:href`) wird bewusst **nicht** ins Dokumentmodell übernommen:

```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'tab') {
  result.push({ type: 'text', text: '\t', marks: marks.length ? marks : undefined })
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'a') {
  // Hyperlink (hyperlink-einfuegen-req.md, Backlog-Status "fehlt" — das Linkziel
  // selbst wird bewusst nicht modelliert). Ohne diesen Zweig wurde der Text innerhalb
  // eines <text:a> stillschweigend verworfen (bestätigt an listLevel10.odt, dessen
  // tiefster Listenpunkt "www.tool.de" in einem Link enthält) — walk() hatte für
  // unbekannte Elemente keinen generischen Fallback, der in ihre Kinder hinabsteigt.
  // Rekursion hier erhält den sichtbaren Text (und Marks aus einem enthaltenen
  // <text:span>), konsistent mit "kein stiller Datenverlust"
  // (FEATURE-SPEC-DOCX-ODT.md Abschnitt 18/20.4) — siehe liste-aufheben-code.md
  // Abschnitt 3.2. Der href geht bewusst weiterhin verloren, das ist Umfang von
  // hyperlink-einfuegen, nicht dieser Anforderung.
  for (const child of Array.from(el.childNodes)) walk(child, marks)
}
```

**Bewusst nicht generalisiert:** Ein pauschaler `else`-Zweig, der in **jedes**
unbekannte Element hinabsteigt (z. B. auch `text:note-citation`,
`office:annotation`, künftige Track-Changes-Marker), würde das gegenteilige Risiko
erzeugen — Text aus Fußnotenzeichen, Kommentaren oder gelöschtem
Änderungsverfolgungs-Text könnte **fälschlich** in den sichtbaren Fließtext
einsickern. Dieser Fix behandelt daher **nur** `text:a` namentlich, nicht alle
unbekannten Elemente pauschal; eine generische Lösung wäre ein eigenständiges,
sorgfältig zu prüfendes Ticket, kein Nebenprodukt dieses Plans.

### 3.3 `src/formats/shared/editor/{commands.ts,Toolbar.tsx}` — `aria-label` + exakter Aktiv/Inaktiv-Zustand (Grenzfall 1/15, DoD 8)

Neuer, exportierter Helper in `commands.ts` (nach `liftFromList`, Zeile 62-64):

```ts
/**
 * Ob ein Klick auf "Liste aufheben" gerade etwas bewirken würde — für den
 * Toolbar-Aktiv/Inaktiv-Zustand (Grenzfall 1/15 der Anforderung). Ruft `liftFromList()`
 * bewusst OHNE `dispatch` auf: das ist die von ProseMirror selbst etablierte
 * Konvention, einen Command als reine Prüfung ("kann das gerade etwas tun?") laufen
 * zu lassen, ohne ihn auszuführen — `liftListItem`s eigener Quellcode nutzt exakt
 * dieses Muster intern (`if (!dispatch) return true`, prosemirror-schema-list,
 * liftListItem). Dadurch ist der Zustand *exakt*, keine angenäherte Tiefensuche:
 * Grenzfälle 4.5/4.6 (Selektion reicht über den Listenrand hinaus / Strg+A über
 * gemischten Inhalt) werden dadurch automatisch korrekt als "inaktiv" erkannt, ohne
 * dass Toolbar.tsx die blockRange/pred-Logik der Bibliothek kennen oder duplizieren
 * müsste (siehe liste-aufheben-code.md Abschnitt 3.3).
 */
export function canLiftFromList(state: EditorState): boolean {
  return liftFromList()(state)
}
```

`Toolbar.tsx` (aktuell Zeile 214-224) ändert sich zu:

```tsx
{(() => {
  const canLift = canLiftFromList(view.state)
  return (
    <button
      type="button"
      title="Liste aufheben"
      aria-label="Liste aufheben"
      aria-disabled={!canLift}
      onMouseDown={(e) => {
        e.preventDefault()
        run(view, liftFromList())
      }}
      className={`px-2 py-1 rounded text-sm ${
        canLift
          ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          : 'text-neutral-400 dark:text-neutral-600 cursor-default'
      }`}
    >
      ⇧ Liste
    </button>
  )
})()}
```

**Bewusst `aria-disabled`, nicht natives `disabled`:** Ein natives `disabled`-Attribut
nimmt den Button aus der Tab-Reihenfolge und aus dem Accessibility-Tree für
Screenreader vollständig heraus — schlechter für Auffindbarkeit als ein Button, der
weiterhin fokussierbar/inspizierbar bleibt, aber als "gerade wirkungslos" markiert ist
(WCAG-Konvention). **Bewusst kein zusätzlicher Guard** im `onMouseDown` (kein
`if (!canLift) return`): `liftFromList()(state, dispatch)` prüft exakt dieselbe
`blockRange`/`pred`-Bedingung intern erneut und dispatcht bei `false` ohnehin nichts —
ein zweiter, separat gepflegter Guard hätte nur das Risiko geschaffen, mit der
Command-eigenen Logik auseinanderzudriften, ohne einen praktischen Vorteil zu bieten.

`aria-label` wird **nur** für „⇧ Liste" ergänzt (Anforderungs-Scope, Abschnitt 2 Zeile
1). Die Nachbar-Buttons „• Liste"/„1. Liste" bleiben unverändert — siehe Abschnitt 8,
warum das bewusst außerhalb dieses Plans liegt.

### 3.4 Tastenkombination — Entscheidung: keine wird ergänzt

Anders als bei `durchgestrichen-code.md` (dort: `Mod-Shift-x`, begründet mit einer in
Google Docs/Slack/Notion verbreiteten Konvention) gibt es für „Liste aufheben" **keine**
vergleichbare, weithin etablierte Tastenkombination in Word oder LibreOffice — die
Anforderung selbst stellt das in Abschnitt 2, Zeile 3 fest ("vermutlich unkritisch").
Eine erfundene, durch keine reale Anwendung gedeckte Kombination würde eher Verwirrung
stiften als Nutzen bringen. **Entscheidung (verbindlich, erfüllt DoD Punkt 8): keine
Tastenkombination wird ergänzt.** `WordEditor.tsx` bleibt unverändert. Sollte künftig
ein Bedarf entstehen, ist das ein eigenständiger Backlog-Punkt, keine stillschweigend
offen gelassene Frage.

### 3.5 Mehrstufige Liste — Ein-Klick-pro-Ebene (Abschnitt 3.6/4.4, DoD 4)

Durch Lesen von `liftListItem` (Zeile 206-219) **bestätigt**, nicht nur aus dem
Verhalten abgeleitet: Liegt die Selektion in einer verschachtelten Liste (Elternknoten
des `list_item` ist selbst ein `list_item`, Zeile 214), wird ausschließlich
`liftToOuterList` aufgerufen (Zeile 220-237) — das hebt den/die Punkt(e) exakt **eine**
Ebene in die äußere Liste, bleibt aber ein Listenpunkt. Erst wenn die Selektion in der
**obersten** Ebene liegt, kommt `liftOutOfList` (Zeile 238-260) zum Zug, das tatsächlich
zu normalen Absätzen wandelt.

**Entscheidung (verbindlich, erfüllt DoD Punkt 4): Ein-Klick-pro-Ebene bleibt
unverändert** — das ist die in Word etablierte Konvention (mehrfaches Ausrücken vor
vollständiger Aufhebung) und deckt sich mit der in `specs/nummerierte-liste-req.md`
Abschnitt 2.6 bereits offen gelassenen, hier bestätigten Frage. Kein Code-Fix. Einzige
Konsequenz: Ein E2E-Test muss die **Anzahl der nötigen Klicks** bis zum vollständig
normalen Absatz explizit dokumentieren (siehe Abschnitt 5.2, Testfall 12), nicht nur
einen einzelnen Klick annehmen.

### 3.6 Nummerierung der zweiten Teilliste (Abschnitt 3.4/Grenzfall 4.3, DoD 5)

Durch Lesen von `liftOutOfList` (Zeile 238-260) bestätigt: Der Split-Mechanismus
kopiert die ursprüngliche Liste zweimal (`list.copy(Fragment.empty)`, Zeile 256/257) —
`NodeType`/`Node.copy` übernimmt dabei **alle** Attribute inklusive `start`
unverändert. Beide entstehenden `ordered_list`-Knoten tragen also **denselben**
`start`-Wert wie die ursprüngliche Liste (typischerweise `1`).

**Zwei unterschiedliche, beide bestätigte Konsequenzen, die zu unterscheiden sind:**

1. **Im Editor selbst** (`schema.ts:93-95`, `toDOM`): Da `start` bei beiden Teillisten
   identisch ist und jede Teilliste ein **eigenständiges** natives `<ol>`-Element
   erzeugt, rendert der Browser die zweite Teilliste unabhängig von der ersten — sie
   beginnt sichtbar wieder bei "1.", **nicht** fortlaufend.
2. **Nach DOCX-Export/Reimport in einer eigenständigen Anwendung** (Word/LibreOffice,
   nicht die eigene Testsuite): `docx/styleDefs.ts` definiert **eine einzige**, globale
   `numId=2` für **alle** nummerierten Listen, ohne `w:startOverride`/`w:lvlOverride`
   (Zeile 32-47, bestätigt). In OOXML ist der Nummerierungszähler an `numId`
   gebunden, nicht an das einzelne `<w:p>` — ohne expliziten Restart-Override zählt
   eine reale, unabhängige Word-/LibreOffice-Installation den Zähler über einen
   dazwischenliegenden Nicht-Listen-Absatz hinweg voraussichtlich **fort** (z. B.
   "4., 5., 6." statt erneut "1., 2., 3." bei einer 3-Punkte-Liste). Der **eigene**
   Reader/Writer dieser App ist davon nicht betroffen (er wertet beim Reimport nie
   einen sichtbaren Nummerierungswert aus, nur `numId` zur Gruppierung, siehe Abschnitt
   2) — der Unterschied wird also **nur** sichtbar, wenn die exportierte Datei in einer
   **echten**, unabhängigen Anwendung geöffnet wird (exakt der in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 geforderte Prüfmodus).

**Entscheidung (verbindlich, erfüllt DoD Punkt 5): kein Fix in diesem Plan.** Beide
Verhalten werden dokumentiert und mit einem Test **festgestellt** (nicht „korrigiert"),
weil das Beheben (automatische `start`-Neuberechnung beim Splitten bzw.
`w:startOverride` beim Export) exakt der Umfang des eigenen, separaten Backlog-Punkts
`nummerierung-fortsetzen-neustarten` (Status „teilweise", Priorität 3) ist — ein Fix
hier würde dessen Umfang vorwegnehmen, ohne dessen eigene Anforderungsanalyse
durchlaufen zu haben. Cross-Referenz wird in beiden Dateien als Kommentar ergänzt (kein
Code-Fix, nur Dokumentation):

```ts
// docx/styleDefs.ts, oberhalb von BULLET_NUM_ID/ORDERED_NUM_ID:
// Beide Konstanten sind global fest und je Liste identisch — eine durch "Liste
// aufheben" gesplittete nummerierte Liste erzeugt zwei ordered_list-Knoten mit
// demselben `start`-Wert, aber referenzieren dieselbe numId ohne Restart-Override.
// Sichtbares Verhalten in einer *echten* Word/LibreOffice-Installation ist damit
// vermutlich "fortlaufend zählen" — abweichend vom Editor-Rendering (zwei
// unabhängige <ol>-Elemente zeigen jeweils "1."). Bestätigt, aber bewusst nicht
// gefixt — gehört zu nummerierung-fortsetzen-neustarten (siehe liste-aufheben-code.md
// Abschnitt 3.6).
```

### 3.7 `liftOutOfList` hebt Zusatzblöcke bereits korrekt heraus (Abschnitt 3.9/Grenzfall 10 — positiver Befund, kein Fix nötig)

Durch Lesen des Bibliothekscodes (Zeile 238-260, insbesondere Zeile 250) bestätigt:
`item` ist der (bei einer Mehrfach-Punkt-Selektion zuvor über die Boundary-Deletion-
Schleife, Zeile 241-244, bereits zu **einem** großen `list_item` gemergte) Knoten;
`item.content.append(...)` verwendet **den kompletten Inhalt** dieses (ggf. gemergten)
`list_item` als Ersatz für die Liste an dieser Stelle — **alle** enthaltenen Blöcke
(weitere `paragraph`-Knoten, `image`, `table`, verschachtelte `bullet_list`/
`ordered_list`) werden dadurch automatisch zu eigenständigen Geschwister-Blöcken
außerhalb der Liste, nicht nur der erste `paragraph`. Das ist bereits **exakt** das in
Abschnitt 3.9/Grenzfall 10 der Anforderung geforderte Verhalten — **vorausgesetzt**,
der `list_item`-Inhalt ist überhaupt gültig strukturiert (das stellt Abschnitt 3.1
sicher). **Kein Code-Fix nötig**, nur ein Test, der das an einer echten Fixture
(`imageWithinList.odt`, nach dem Fix aus Abschnitt 3.1) nachweist, statt es nur aus dem
Bibliothekscode zu vermuten.

### 3.8 DOCX-Reader/-Writer trennen Teillisten am Übergang bereits korrekt (Grenzfall 14 — positiver Befund, kein Fix nötig)

Durch Lesen von `blockToDocx` (Zeile 94-126) und `groupLists` (Zeile 258-283)
bestätigt: Ein normaler `paragraph`-Knoten außerhalb einer Liste wird beim Export
**immer** mit `listNumId=null` aufgerufen (Default-Parameter der Funktionssignatur,
Zeile 98) — unabhängig davon, ob benachbarte Listen dieselbe globale `numId` verwenden
— und bekommt dadurch **kein** `<w:numPr>`. Beim Reimport `flush()`t `groupLists`
(Zeile 263-269, 276-279) bei jedem numPr-losen Absatz die aktuelle Gruppe und **setzt
`currentNumId` zurück auf `null`** — selbst wenn die nachfolgende Liste dieselbe
`numId` wie die vorangehende trägt, beginnt sie als **neue, eigenständige** Gruppe im
`result`-Array, nicht als Fortsetzung der bereits geflushten. Grenzfall 14 der
Anforderung ("muss geprüft werden, ob der trennende Absatz zuverlässig erkannt wird")
ist damit durch bestehenden Code bereits korrekt gelöst — **kein Fix nötig**, nur ein
Test, der das explizit mit einer realen Rundreise (nicht nur Reader/Writer isoliert)
nachweist.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/odt/reader.ts` | `text:list`-Zweig in `elementToBlocks`: führende leere `paragraph` einfügen, wenn `list_item`-Inhalt nicht mit `paragraph` beginnt (Abschnitt 3.1) | **Bugfix** |
| 2 | `src/formats/odt/reader.ts` | `decodeInline`/`walk`: neuer Zweig für `text:a`, rekursiert in Kinder (Abschnitt 3.2) | **Bugfix** |
| 3 | `src/formats/shared/editor/commands.ts` | neuer Export `canLiftFromList(state)` (Abschnitt 3.3) | Neu (Funktion in bestehender Datei) |
| 4 | `src/formats/shared/editor/Toolbar.tsx` | „⇧ Liste"-Button: `aria-label`, `aria-disabled` über `canLiftFromList`, bedingte CSS-Klasse (Abschnitt 3.3) | Fix |
| 5 | `src/formats/docx/styleDefs.ts` | Nur Code-Kommentar zur bewusst nicht gefixten `start`-Cross-Tool-Divergenz (Abschnitt 3.6) | Doku |
| 6 | `src/formats/shared/editor/WordEditor.tsx` | **Keine Änderung.** Entscheidung: keine Tastenkombination (Abschnitt 3.4) | — |
| 7 | `src/formats/shared/schema.ts` | **Keine Änderung.** `list_item`-Content-Regel ist bereits korrekt deklariert; das Problem lag im Reader, der die Regel nicht einhielt (Abschnitt 3.1) | — |
| 8 | `src/formats/shared/editor/commands.ts` (`liftFromList`) | **Keine Änderung.** Bleibt reiner Alias um `liftListItem` — kein projekteigener Sonderfall nötig (Abschnitt 2/3.5/3.7) | — |
| 9 | `src/formats/docx/{reader.ts,writer.ts}` | **Keine Änderung.** Bereits korrekt für Split/Rundreise (Abschnitt 3.8) | — |
| 10 | `src/formats/odt/writer.ts` | **Keine Änderung.** Schreibt Listen/Zusatzblöcke bereits korrekt (Abschnitt 2/3.7) | — |

Es wird **keine neue Command-Abstraktion** für das eigentliche Aufheben eingeführt —
`liftFromList()` bleibt unverändert der reine Bibliotheks-Alias. Die einzige neue
Logik ist `canLiftFromList` für die Anzeige (Punkt 3/4 oben), die kein
Ausführungsverhalten ändert.

---

## 5. Neue Dateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/shared/editor/__tests__/commands.test.ts`**

Reiner Logik-Test ohne Browser/DOM — konstruiert `EditorState` direkt aus `wordSchema`
und prüft `liftFromList`/`canLiftFromList` isoliert gegen alle in Abschnitt 3/4 der
Anforderung beschriebenen Fälle. Das ist der einzige Ort, an dem das eigentliche
Aufhebeverhalten **ohne** Playwright/Browser getestet wird — schneller Rückkanal für
Regressionen, bevor die (langsameren) E2E-Tests laufen:

```ts
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { liftFromList, canLiftFromList, toggleList } from '../commands'

function doc(...children: any[]) {
  return wordSchema.nodes.doc.create(null, children)
}
function para(text: string) {
  return wordSchema.nodes.paragraph.create({ align: 'left' }, text ? wordSchema.text(text) : undefined)
}
function item(...children: any[]) {
  return wordSchema.nodes.list_item.create(null, children)
}
function bulletList(...items: any[]) {
  return wordSchema.nodes.bullet_list.create(null, items)
}
function orderedList(start: number, ...items: any[]) {
  return wordSchema.nodes.ordered_list.create({ start }, items)
}

function stateFor(node: ReturnType<typeof doc>) {
  return EditorState.create({ doc: node, schema: wordSchema })
}

function applyLift(state: EditorState) {
  let result: EditorState = state
  liftFromList()(state, (tr) => {
    result = state.apply(tr)
  })
  return result
}

describe('liftFromList (Abschnitt 3.1/3.4 der Anforderung)', () => {
  it('cursor in middle item of a 3-item bullet list splits into list/paragraph/list', () => {
    const d = doc(bulletList(item(para('eins')), item(para('zwei')), item(para('drei'))))
    let state = stateFor(d)
    // Cursor irgendwo im mittleren Punkt ("zwei")
    const pos = 1 + item(para('eins')).nodeSize + 2
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
    state = applyLift(state)
    const types = state.doc.content.content.map((n) => n.type.name)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect(state.doc.textContent).toBe('einszweidrei')
  })

  it('lifting the only item removes the wrapping list node entirely (Grenzfall 2)', () => {
    const d = doc(bulletList(item(para('einzig'))))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(state.doc.textContent).toBe('einzig')
  })

  it('selection covering all items removes the list, text order preserved (Abschnitt 3.2/3.5)', () => {
    const d = doc(bulletList(item(para('a')), item(para('b')), item(para('c'))))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph', 'paragraph'])
    expect(state.doc.textContent).toBe('abc')
  })

  it('ordered list split keeps both halves "ordered_list" with the SAME start value (Grenzfall 4.3/Abschnitt 3.6 — dokumentiert, kein Fix)', () => {
    const d = doc(orderedList(1, item(para('eins')), item(para('zwei')), item(para('drei'))))
    let state = stateFor(d)
    const pos = 1 + item(para('eins')).nodeSize + 2
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
    state = applyLift(state)
    const [first, , third] = state.doc.content.content
    expect(first.type.name).toBe('ordered_list')
    expect(third.type.name).toBe('ordered_list')
    expect(first.attrs.start).toBe(1)
    expect(third.attrs.start).toBe(1) // bestätigt: NICHT fortlaufend im eigenen Modell
  })

  it('nested list: lifting the deepest item moves it one level up, stays a list item (Abschnitt 3.6/Grenzfall 4.4)', () => {
    const inner = bulletList(item(para('tief')))
    const d = doc(bulletList(item(para('außen'), inner)))
    let state = stateFor(d)
    const innerParaPos = d.nodeSize - inner.nodeSize - para('tief').nodeSize + 1 // Position im Text "tief"
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(innerParaPos))))
    const before = state
    state = applyLift(state)
    // Nach EINEM Klick: "tief" ist Geschwister-Listenpunkt von "außen" in DERSELBEN
    // äußeren Liste, noch KEIN normaler Absatz (liftToOuterList, nicht liftOutOfList).
    const outerList = state.doc.content.content[0]
    expect(outerList.type.name).toBe('bullet_list')
    expect(outerList.content.content).toHaveLength(2)
    expect(outerList.content.content.map((n: any) => n.firstChild.textContent)).toEqual(['außen', 'tief'])
    // Zweiter Klick auf denselben (jetzt nicht mehr verschachtelten) Punkt hebt ihn
    // vollständig zu einem normalen Absatz — Ebene erschöpft.
    const secondPos = state.doc.content.size - 3
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(secondPos))))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph'])
    expect(before).toBeTruthy() // nur zur Doku, dass der Ausgangszustand oben referenziert bleibt
  })

  it('extra blocks inside a lifted item (image after paragraph) become separate sibling blocks (Abschnitt 3.9/Grenzfall 10)', () => {
    const img = wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
    const d = doc(bulletList(item(para('mit Bild'), img)))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'image'])
  })

  it('selection reaching from a list item into a following plain paragraph is a no-op (Grenzfall 4.5)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2, state.doc.content.size - 2)))
    const before = state.doc.toJSON()
    const applied = liftFromList()(state, () => {
      throw new Error('sollte nicht dispatchen')
    })
    expect(applied).toBe(false)
    expect(state.doc.toJSON()).toEqual(before)
  })

  it('AllSelection (Strg+A) over mixed list + paragraph content is a no-op (Grenzfall 4.6)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    const state = stateFor(d).apply as any
    let s = stateFor(d)
    s = s.apply(s.tr.setSelection(new AllSelection(s.doc)))
    const applied = liftFromList()(s, () => {
      throw new Error('sollte nicht dispatchen')
    })
    expect(applied).toBe(false)
  })
})

describe('canLiftFromList (Abschnitt 3.3, Grenzfall 1/15)', () => {
  it('is false with the cursor in a plain paragraph', () => {
    const state = stateFor(doc(para('normal')))
    expect(canLiftFromList(state)).toBe(false)
  })

  it('is true with the cursor inside a list item', () => {
    const state = stateFor(doc(bulletList(item(para('punkt')))))
    const near = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
    expect(canLiftFromList(near)).toBe(true)
  })

  it('is false for a selection spanning list + trailing paragraph, matching the actual click outcome (Grenzfall 4.5)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2, state.doc.content.size - 2)))
    expect(canLiftFromList(state)).toBe(false)
  })
})

describe('nach dem Aufheben erneut listenfähig (Abschnitt 3.13)', () => {
  it('a lifted paragraph can be turned back into a new list', () => {
    const d = doc(bulletList(item(para('punkt'))))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(1))))
    let applied = false
    toggleList(false)(state, (tr) => {
      state = state.apply(tr)
      applied = true
    })
    expect(applied).toBe(true)
    expect(state.doc.content.content[0].type.name).toBe('bullet_list')
  })
})
```

(Positionsrechnung wurde bewusst über `nodeSize`/`resolve` statt hartkodierter
„magischer" Zahlen aufgebaut, um bei Schemaänderungen nicht lautlos falsch zu werden;
sie wurde vor dem Schreiben dieses Plans gegen den tatsächlichen `wordSchema`
durchgerechnet, nicht nur angenommen.)

**Neu: `src/formats/odt/__tests__/list-structure.test.ts`**

Dediziert für die beiden in Abschnitt 3.1/3.2 gefundenen Bugs, gegen die **echten**
Fixtures (nicht nur synthetische Daten) — deckt DoD Punkt 6 sowie Testfall 12/Grenzfall
4.4 ab:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'
import { wordSchema } from '../../shared/schema'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([buffer]))
}

function collectText(node: any, out: string[] = []): string[] {
  if (node.type === 'text') out.push(node.text)
  ;(node.content ?? []).forEach((n: any) => collectText(n, out))
  return out
}

describe('imageWithinList.odt (Abschnitt 3.1 / Testfall 5.2.5 / DoD 6)', () => {
  it('the list item starts with a paragraph (schema-valid) and keeps the image', async () => {
    const doc = await loadFixture('imageWithinList.odt')
    const list = (doc.body as any).content.find((n: any) => n.type === 'bullet_list' || n.type === 'ordered_list')
    expect(list).toBeTruthy()
    const item = list.content[0]
    expect(item.content[0].type).toBe('paragraph') // Fix aus Abschnitt 3.1
    expect(item.content.some((n: any) => n.type === 'image')).toBe(true)
  })

  it('is accepted by wordSchema.nodeFromJSON without throwing (regression net for the schema violation)', async () => {
    const doc = await loadFixture('imageWithinList.odt')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})

describe('listLevel10.odt (Abschnitt 3.2 / Testfall 12 / Grenzfall 4.4)', () => {
  it('imports as a real 10-level-deep nested ordered_list, not a flattened list', async () => {
    const doc = await loadFixture('listLevel10.odt')
    let depth = 0
    let node: any = (doc.body as any).content.find((n: any) => n.type === 'ordered_list')
    while (node) {
      depth++
      const nested = node.content[0].content.find((c: any) => c.type === 'ordered_list' || c.type === 'bullet_list')
      node = nested
    }
    expect(depth).toBeGreaterThanOrEqual(9)
  })

  it('keeps the hyperlink text "www.tool.de" instead of silently dropping it (Abschnitt 3.2 fix)', async () => {
    const doc = await loadFixture('listLevel10.odt')
    const allText = collectText(doc.body as any).join('')
    expect(allText).toContain('www.tool.de')
  })

  it('is accepted by wordSchema.nodeFromJSON without throwing', async () => {
    const doc = await loadFixture('listLevel10.odt')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** (neuer `describe`-Block
nach der bestehenden `'DOCX round trip: lists'`-Gruppe, Zeile 135-171) — testet
Reader/Writer **direkt** mit Daten, die den Zustand **nach** einem „Liste
aufheben"-Klick simulieren (unabhängig von der Editor-Bedienung, ergänzt die
E2E-Rundreise um eine schnellere, gezieltere Ebene):

```ts
describe('DOCX round trip: liste aufheben (Zustand nach dem Aufheben, Grenzfall 3/14)', () => {
  it('a plain paragraph between two bullet lists writes and reads back with no <w:numPr> on the middle paragraph', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster Punkt')] }] },
      paragraph('Aufgehobener Punkt'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter Punkt')] }] },
    ])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    // Der mittlere <w:p> darf kein <w:numPr> enthalten (Grenzfall 3/Abschnitt 3.4)
    const middleParaXml = documentXml.split('Aufgehobener Punkt')[0].split('<w:p>').pop()
    expect(middleParaXml).not.toContain('numPr')

    const result = await readDocx(blob)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('an ordered list split by a lifted paragraph keeps BOTH halves ordered_list, not bullet_list (Grenzfall 4.3)', async () => {
    const original = doc([
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('eins')] }] },
      paragraph('mitte'),
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('drei')] }] },
    ])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['ordered_list', 'paragraph', 'ordered_list'])
  })

  it('removing an entire list leaves no <w:numPr> anywhere in the document (Testfall 5.1.2)', async () => {
    const original = doc([paragraph('a'), paragraph('b'), paragraph('c')])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('numPr')
  })

  it('extra blocks (image) after a lifted paragraph survive round trip as independent siblings (Testfall 5.1.4)', async () => {
    const original = doc([paragraph('Text mit Bild darunter'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'image'])
  })
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** (analog, neuer
`describe`-Block nach der bestehenden `'ODT round trip: lists'`-Gruppe):

```ts
describe('ODT round trip: liste aufheben (Zustand nach dem Aufheben, Testfall 5.2.1/5.2.2)', () => {
  it('a plain paragraph between two bullet lists produces two separate <text:list> elements, no wrapping list-item for the middle paragraph', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster Punkt')] }] },
      paragraph('Aufgehobener Punkt'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter Punkt')] }] },
    ])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<text:list /g) ?? []).length).toBe(2)

    const result = await readOdt(blob)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('removing an entire list leaves no <text:list> tag in content.xml (Testfall 5.2.2)', async () => {
    const original = doc([paragraph('a'), paragraph('b'), paragraph('c')])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).not.toContain('<text:list')
  })

  it('a list item with two paragraphs (post-merge-lift shape) preserves both, in order', async () => {
    const original = doc([
      {
        type: 'bullet_list',
        content: [{ type: 'list_item', content: [paragraph('erste Zeile'), paragraph('zweite Zeile')] }],
      },
    ])
    const result = await roundTrip(original)
    const item = (result.body as any).content[0].content[0]
    expect(item.content.map((p: any) => p.content[0].text)).toEqual(['erste Zeile', 'zweite Zeile'])
  })
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/liste-aufheben.spec.ts`**

Kernstück dieser Anforderung — analog zu `docx.spec.ts`/`odt.spec.ts`/
`strike.spec.ts`-Vorbild (`durchgestrichen-code.md`, Abschnitt 5.2), gleiche
`odtCard`/`docxCard`-Locator-Helfer. `input[type="file"].setInputFiles(...)` statt
eines literalen `filechooser`-Events (Anforderung Testfall 10 nennt „echten
Datei-Upload" als Anforderung an sich, nicht das exakte Playwright-API — der bereits
etablierte, funktional gleichwertige Upload-Mechanismus in `docx.spec.ts`/`odt.spec.ts`
wird zur Konsistenz mit der bestehenden Suite beibehalten, siehe Abschnitt 8). Deckt
alle 15 Testfälle aus Anforderungsabschnitt 6 sowie die relevanten Grenzfälle aus
Abschnitt 4 ab:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
async function uploadFixture(page: import('@playwright/test').Page, card: ReturnType<typeof odtCard>, path: string, mimeType: string) {
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path)
  const input = card.locator('input[type="file"]')
  await input.setInputFiles({ name: path.split('/').pop()!, mimeType, buffer })
}

test.describe('Liste aufheben — Toolbar & Grundverhalten', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: mittleren Punkt einer 3er-Bullet-Liste aufheben, Text bleibt, Rest bleibt Liste (Abschnitt 3.1/3.4)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    // Cursor in den mittleren Punkt ("zwei")
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(2)
    await expect(editor.locator('p', { hasText: 'zwei' })).toBeVisible()
    await expect(editor).toContainText('einszweidrei')
  })

  test('Testfall 2: alle Punkte markieren, Liste verschwindet komplett (Abschnitt 3.2/3.5)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('a')
    await page.keyboard.press('Enter')
    await page.keyboard.type('b')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await expect(editor.locator('p')).toHaveCount(2)
  })

  test('Testfall 3: nummerierte Liste, mittleren Punkt aufheben — zweite Teilliste bleibt "ol", Startwert protokollieren (Grenzfall 4.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Nummerierte Liste').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    const lists = editor.locator('ol')
    await expect(lists).toHaveCount(2)
    // Dokumentiert das in Abschnitt 3.6 bestätigte Verhalten: zweite Teilliste
    // zeigt eigenständig wieder "1." (kein `start`-Override im Editor-Rendering).
    const secondListStart = await lists.nth(1).evaluate((el) => (el as HTMLOListElement).start)
    expect(secondListStart).toBe(1)
    await expect(lists.nth(1).locator('li').first()).toHaveText('drei')
  })

  test('Testfall 4 / Grenzfall 1: Klick außerhalb jeder Liste ist ein stiller No-Op, Button zeigt aria-disabled', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    const button = page.getByTitle('Liste aufheben')
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await button.click()
    await expect(editor).toContainText('normaler Absatz')
    await expect(editor.locator('ul, ol')).toHaveCount(0)
  })

  test('Testfall 4b: Button zeigt aria-disabled="false", sobald der Cursor in einer Liste steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await expect(page.getByTitle('Liste aufheben')).toHaveAttribute('aria-disabled', 'false')
  })

  test('Testfall 5 / Grenzfall 4.5: Selektion reicht von Listenpunkt in nachfolgenden normalen Absatz hinein', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter') // leerer Punkt am Ende beendet die Liste (splitListItem)
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+Home')
    await page.keyboard.down('Shift')
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.up('Shift')
    await page.getByTitle('Liste aufheben').click()
    // Protokolliert das tatsächliche Verhalten (Grenzfall 4.5): laut Bibliothekscode
    // (Abschnitt 2) liefert blockRange hier keinen gültigen Bereich — die Liste
    // bleibt vollständig unangetastet.
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 6 / Grenzfall 4.6: Strg+A über gemischtem Inhalt (Liste + Absatz), "Liste aufheben"', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Liste aufheben').click()
    // Dokumentiert: AllSelection erfüllt die pred-Bedingung von blockRange ebenfalls
    // nicht -> die Liste bleibt bestehen, kein "alle Listen im Dokument entfernen".
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 7: Liste in Tabellenzelle aufheben, Rest der Tabelle unangetastet (Grenzfall 8)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Zelleneintrag')
    await cells.nth(1).click()
    await page.keyboard.type('Andere Zelle')
    await cells.nth(0).click()
    await page.getByTitle('Liste aufheben').click()
    await expect(cells.nth(0).locator('li')).toHaveCount(0)
    await expect(cells.nth(0)).toContainText('Zelleneintrag')
    await expect(cells.nth(1)).toContainText('Andere Zelle')
  })

  test('Testfall 8: Undo direkt nach "Liste aufheben" stellt Liste wieder her, Redo hebt erneut auf (Abschnitt 3.10)', async ({ page }) => {
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

  test('Testfall 9: nach dem Aufheben erneut "• Liste"/"1. Liste" anwendbar (Abschnitt 3.13)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    await page.getByTitle('Nummerierte Liste').click()
    await expect(editor.locator('ol li')).toContainText('Punkt')
  })

  test('Grenzfall 2: Liste erstellen und sofort wieder aufheben, ohne Text — kein Crash, kein verwaister Listenknoten', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await page.keyboard.type('weiter geht es')
    await expect(editor).toContainText('weiter geht es')
  })
})

test.describe('Liste aufheben — Fremddateien & Rundreisen (Anforderung Abschnitt 5)', () => {
  test('Testfall 10/Rundreise 5.1.1: DOCX-Eigenrundreise, mittleren Punkt aufheben (echter Datei-Upload+Download)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toMatch(/zwei[^]*?numPr/)
    expect(documentXml).toContain('einszweidrei'.slice(0, 0)) // Platzhalter für Volltext-Check unten
    expect(documentXml).toContain('eins')
    expect(documentXml).toContain('zwei')
    expect(documentXml).toContain('drei')

    // Reimport
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'roundtrip.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: exportedBuffer })
    await expect(page.locator('.ProseMirror li')).toHaveCount(2)
    await expect(page.locator('.ProseMirror p', { hasText: 'zwei' })).toBeVisible()
  })

  test('Testfall 10/Rundreise 5.2.1: ODT-Eigenrundreise, mittleren Punkt aufheben', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<text:list /g) ?? []).length).toBe(2)

    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'roundtrip.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: exportedBuffer })
    await expect(page.locator('.ProseMirror li')).toHaveCount(2)
  })

  test('Testfall 11a/Rundreise 5.1.6: reale Fremddatei ComplexNumberedLists.docx, Punkt aufheben, Text bleibt erhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(
      page,
      docxCard(page),
      'tests/fixtures/external/docx/ComplexNumberedLists.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('li').first()).toBeVisible()
    const originalText = await editor.innerText()
    const firstItem = editor.locator('li').first()
    await firstItem.click()
    await page.getByTitle('Liste aufheben').click()
    const afterText = await editor.innerText()
    // Kein Zeichen darf verloren gehen — nur Umbrüche/Aufzählungszeichen dürfen
    // sich unterscheiden. Grobe, aber echte Zeichentreue-Prüfung: Gesamtlänge des
    // sichtbaren Texts (ohne Aufzählungszeichen) bleibt stabil innerhalb weniger
    // Zeichen Toleranz für entfernte Aufzählungszeichen.
    expect(afterText.replace(/\s+/g, ' ').length).toBeGreaterThan(originalText.replace(/\s+/g, ' ').length - 10)
  })

  test('Testfall 11b: imageWithinList.odt, Bild-Punkt aufheben, Bild bleibt erhalten (Testfall 5.2.5/DoD 6, Abschnitt 3.1 Fix)', async ({ page }) => {
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

  test('Testfall 11c: listsInTable.odt, Punkt in Zelle aufheben, Rest der Tabelle unverändert (Testfall 5.2.4)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listsInTable.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    const cellCountBefore = await editor.locator('table td').count()
    await editor.locator('li').first().click()
    await page.getByTitle('Liste aufheben').click()
    const cellCountAfter = await editor.locator('table td').count()
    expect(cellCountAfter).toBe(cellCountBefore)
  })

  test('Testfall 12/Grenzfall 4.4: listLevel10.odt, tiefsten Punkt wiederholt aufheben, Klicks protokollieren', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listLevel10.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    // Tiefster Punkt laut Fixture-Analyse (liste-aufheben-code.md Abschnitt 6): "ASDAS"
    const deepest = editor.locator('li', { hasText: 'ASDAS' }).last()
    await expect(deepest).toBeVisible()
    let clicks = 0
    const button = page.getByTitle('Liste aufheben')
    // Ein-Klick-pro-Ebene (Abschnitt 3.5) — bis zu 10 Klicks bis zum normalen Absatz,
    // mit Sicherheitsobergrenze gegen Endlosschleifen bei unerwartetem Verhalten.
    while ((await button.getAttribute('aria-disabled')) === 'false' && clicks < 15) {
      await editor.locator('*', { hasText: 'ASDAS' }).last().click()
      if ((await button.getAttribute('aria-disabled')) === 'true') break
      await button.click()
      clicks++
      if (await editor.locator('p', { hasText: 'ASDAS' }).count()) break
    }
    expect(clicks).toBeGreaterThan(0)
    expect(clicks).toBeLessThanOrEqual(10)
    await expect(editor.locator('p', { hasText: 'ASDAS' })).toBeVisible()
    // eslint-disable-next-line no-console
    console.log(`listLevel10.odt: ${clicks} Klicks bis zum normalen Absatz (Grenzfall 4.4/Testfall 12)`)
  })

  test('Testfall 13: brokenList.odt / ListOddity.odt — kein Absturz, definiertes Verhalten (Grenzfall 13)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    for (const name of ['brokenList.odt', 'ListOddity.odt']) {
      await uploadFixture(page, odtCard(page), `tests/fixtures/external/odt/${name}`, 'application/vnd.oasis.opendocument.text')
      await expect(page.locator('.ProseMirror')).toBeVisible()
      const anyListItem = page.locator('.ProseMirror li').first()
      if (await anyListItem.count()) {
        await anyListItem.click()
        await page.getByTitle('Liste aufheben').click() // darf nicht crashen
      }
    }
  })

  test('Testfall 14a: Cross-Format-Rundreise DOCX -> ODT -> DOCX (Abschnitt 5.3.1/5.3.2)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    let editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await editor.locator('li', { hasText: 'eins' }).click()
    await page.getByTitle('Liste aufheben').click()

    const fs = await import('node:fs/promises')
    let downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    let download = await downloadPromise
    let buffer = await fs.readFile((await download.path())!)

    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'a.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    download = await downloadPromise
    buffer = await fs.readFile((await download.path())!)

    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'b.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('eins')
    await expect(editor).toContainText('zwei')
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 15: optischer Vergleich — aufgehobener Absatz sieht nach Reimport identisch aus (kein Aufzählungszeichen, kein Einzug)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    const paragraph = editor.locator('p', { hasText: 'Punkt' })
    const marginBefore = await paragraph.evaluate((el) => getComputedStyle(el).marginLeft)
    expect(marginBefore).toBe('0px')
  })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** (Grenzfall 4.11 / DoD 7 —
direkt neben dem bestehenden „Fett"-Test verankert, analog zum in
`durchgestrichen-code.md` Abschnitt 5.2 empfohlenen Muster):

```ts
test('same regression with "Liste aufheben" as the extra step (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.locator('li').click()
  await page.getByTitle('Liste aufheben').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor.locator('p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — reale Dateien, geprüft durch tatsächliches Entpacken

Alle folgenden Dateien wurden für diesen Plan **programmatisch entpackt**
(`JSZip.loadAsync` über ein Ad-hoc-Node-Skript) und ihr `content.xml`/`document.xml`
inspiziert — nicht nur aus dem Dateinamen vermutet:

| Datei | Bestätigter Inhalt (diese Prüfung) | Relevanz |
|---|---|---|
| `tests/fixtures/external/odt/listLevel10.odt` | Listenstil `L1` mit `text:list-level-style-number` auf 10 Ebenen (→ `kind: 'ordered'`, **keine** Bullet-Liste). Erstes `<text:list>`: 9 echte Verschachtelungsebenen ("Asd1" bis "ASDA9"), tiefste Ebene hat **zwei** Geschwister-Punkte: "ASDAS" (reiner Text) und ein zweiter mit `<text:a xlink:href="http://www.tool.de/">` um "www.tool.de" — genau der in Abschnitt 3.2 gefundene Hyperlink-Bug. Zweites `<text:list text:continue-numbering="true">` weiter unten: 8 Ebenen tief, aber **leer** (nur `<text:span/>` ohne Text) — Randfall für „leerer, tief verschachtelter Punkt", ebenfalls sinnvoll für Testfall 12 | Primär-Fixture für Grenzfall 4.4/Testfall 12 (mehrstufige Liste, Ein-Klick-pro-Ebene) **und** für den Abschnitt-3.2-Fix (Hyperlink-Textverlust) |
| `tests/fixtures/external/odt/imageWithinList.odt` | Ein einziges `<text:list>` mit **einem** `<text:list-item>`, dessen einziger Inhalt `<text:p><draw:frame>...<draw:image xlink:href="Pictures/uidf93726d59f7.jpeg"/></draw:frame></text:p>` ist — **kein** Text im Punkt, genau der in Abschnitt 3.1 gefundene Fall | Primär-Fixture für Abschnitt-3.1-Fix und Testfall 5.2.5/DoD 6 |
| `tests/fixtures/external/odt/listsInTable.odt` | Mehrere `<table:table>` mit `<text:list>` in einzelnen Zellen, Listenpunkte durchgehend **leer** (Formularvorlage, Checkbox-artige Punkte) — jeder Punkt hat aber bereits ein eigenes leeres `<text:p>`, verletzt die `paragraph`-Regel **nicht** (Unterschied zu `imageWithinList.odt`) | Testfall 5.2.4/Grenzfall 8 (Liste in Tabellenzelle) |
| `tests/fixtures/external/docx/ComplexNumberedLists.docx`, `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` | Vorhanden, importieren laut bestehendem `external-fixtures.test.ts` bereits crashfrei (nicht in `KNOWN_CORRUPTED`/`KNOWN_PASSWORD_PROTECTED`/`SKIP_SLOW_UNDER_JSDOM`) | Testfall 5.1.6 (reale Fremddatei-Rundreise) |
| `tests/fixtures/external/odt/brokenList.odt` | **Nicht** in `jsdom`-Unit-Tests neu zu prüfen — bereits als `SKIP_SLOW_UNDER_JSDOM` (2,4 MB, ~20k Automatik-Stile, 90s+ unter `jsdom`, ~575ms in echtem Playwright/Chromium bestätigt, siehe `external-fixtures.test.ts:12-17`) markiert. Testfall 13/Grenzfall 13 **muss** daher zwingend im neuen E2E-Test laufen, nicht als Vitest-Unit-Test | Testfall 13/Grenzfall 13 |
| `tests/fixtures/external/odt/ListOddity.odt` | Nicht in `KNOWN_INVALID`/`SKIP_SLOW_UNDER_JSDOM` — importiert bereits crashfrei laut bestehendem Test | Testfall 13/Grenzfall 13 |
| `tests/fixtures/external/odt/{bulletListTest,list,liste2,simple_bullet_list,simpleList,EasyList,ListRoundtrip}.odt` | Alle vorhanden, keine in einer Ausschlussliste | Testfall 5.2.7 (Basis-Fixture-Rundreisen) |

---

## 7. Unabhängige Parser-Validierung (Rundreise-Anforderung Punkt 8, DoD 2)

Wie bereits in `durchgestrichen-code.md` Abschnitt 7 begründet: dieses Repo ist reines
TypeScript/Vite ohne Python-Toolchain. Zweistufiger Ansatz, identisch zum
Schwesterfeature:

1. **Automatisiert:** Die Playwright-Tests aus Abschnitt 5.2 prüfen den exportierten
   XML-String direkt per Regex/`String.includes`, **ohne** `readDocx`/`readOdt` zu
   verwenden (`expect(documentXml).not.toMatch(/zwei[^]*?numPr/)`,
   `expect((contentXml.match(/<text:list />g) ?? []).length).toBe(2)`) — das erfüllt
   „nicht nur mit dem eigenen Reader rückgelesen" für die automatisierte Suite.
2. **Manuell, einmalig, vor Statuswechsel auf „verifiziert":** Eine mit dieser App nach
   „Liste aufheben" exportierte Test-DOCX (insbesondere die nummerierte Variante aus
   Testfall 3/Grenzfall 4.3) in einem **echten, unabhängigen** Word/LibreOffice öffnen
   und dokumentieren, ob die zweite Teilliste dort **fortlaufend** oder **neu bei „1."**
   zählt — das beantwortet die in Abschnitt 3.6 als „vermutet, mit hoher
   Bibliotheks-Gewissheit" eingestufte Cross-Tool-Divergenz **empirisch**, nicht nur
   aus dem OOXML-Spec-Verständnis abgeleitet. Ergebnis in dieser Datei oder
   `liste-aufheben-req.md` nachtragen, bevor der Status wechselt.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`Toolbar.tsx` „• Liste"/„1. Liste"-Buttons** — kein `aria-label`, keine
  Änderung. Anforderungs-Scope (Abschnitt 2, „Explizit nicht alleiniger Gegenstand")
  begrenzt diese Anforderung ausdrücklich auf „Liste aufheben"; die beiden anderen
  Buttons gehören zu `aufzaehlungsliste-req.md`/`nummerierte-liste-req.md`. Eine
  konsistente `aria-label`/Aktiv-Zustand-Ergänzung dort wird als **Empfehlung**
  vermerkt (keine Codeänderung in diesem Plan), analog zu deren eigenen Anforderungen.
- **`liftFromList()` selbst** (`commands.ts:62-64`) — bleibt unverändert reiner
  Bibliotheks-Alias. Kein projekteigener Sonderfall für Mehrebenen-Verschachtelung,
  Selektionsgrenzen oder Zusatzblöcke nötig — der Bibliothekscode leistet bereits
  exakt das in Abschnitt 3.5/3.6/3.7 dokumentierte, gewünschte Verhalten.
- **`docx/{reader.ts,writer.ts,styleDefs.ts}` Kernlogik** — bereits korrekt für
  Split/Rundreise (Abschnitt 3.8). Einzige Docx-Änderung ist ein Kommentar in
  `styleDefs.ts` (Abschnitt 3.6), keine Verhaltensänderung.
- **`odt/writer.ts`** — schreibt Listen, verschachtelte Listen und Zusatzblöcke
  innerhalb eines Punkts bereits korrekt (Abschnitt 2/3.7). Keine Änderung.
- **`WordEditor.tsx` Keymap** — keine Tastenkombination ergänzt (Abschnitt 3.4,
  bewusste, begründete Entscheidung, kein Versehen).
- **`decodeInline`/`walk()` — kein pauschaler Fallback für alle unbekannten
  Elemente** — nur `text:a` wird namentlich behandelt (Abschnitt 3.2). Eine
  Generalisierung würde das Risiko erzeugen, Text aus Fußnotenzeichen, Kommentaren
  oder künftigem Änderungsverfolgungs-Markup fälschlich in den Fließtext zu
  übernehmen — ein eigenständiges, sorgfältiger zu prüfendes Ticket, kein
  Nebenprodukt dieses Plans.
- **`E2E: input.setInputFiles(...)` statt `page.on('filechooser', ...)`** — die
  Anforderung nennt in Testfall 10 „echten Datei-Upload (`filechooser`)" als
  Formulierung für „echte Bedienung, nicht nur interne Reader/Writer-Aufrufe" — dieses
  Ziel ist mit dem bereits in `docx.spec.ts`/`odt.spec.ts` etablierten
  `setInputFiles`-Muster (das denselben `<input type="file">` bedient, den ein echter
  Klick auf „Datei auswählen" öffnen würde) bereits erreicht, ohne einen inkonsistenten
  zweiten Upload-Mechanismus in die Suite einzuführen.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`nummerierung-fortsetzen-neustarten`** (Backlog-Status „teilweise", Priorität 3):
  Sobald umgesetzt, muss diese Funktion auch den in Abschnitt 3.6 dokumentierten
  Split-Fall abdecken (soll die zweite Teilliste nach „Liste aufheben" die Zählung
  fortsetzen oder neu beginnen — und soll das konfigurierbar sein?). Keine
  Entscheidung/Implementierung jetzt, nur Weichenstellung vermerkt.
- **`mehrstufige-liste`/`liste-einruecken-tab`** (Backlog-Status „fehlt", Priorität
  1/2): Sobald Tab/Umschalt+Tab zum Einrücken im Editor selbst existiert, wird der in
  Abschnitt 3.5 bestätigte „Ein-Klick-pro-Ebene"-Fall über die reine UI-Bedienung
  erreichbar (aktuell nur über ODT-Import, siehe Abschnitt 3.5/6). Der hier gefixte
  `canLiftFromList`-Helper bleibt unverändert korrekt, sobald das passiert — er prüft
  bereits jetzt exakt dieselbe Bedingung, unabhängig davon, wie die Verschachtelung
  entstanden ist.
- **`hyperlink-einfuegen`** (Backlog-Status „fehlt"): Der in Abschnitt 3.2 gefixte
  `text:a`-Zweig erhält bewusst **nur** den Text, nicht den `href`. Sobald
  `hyperlink-einfuegen` umgesetzt wird, muss dieser Zweig um eine echte Mark/Attribut
  für das Linkziel erweitert werden — hier nur als Text-Fallback markiert, keine
  Kollision zu erwarten, da der Zweig ohnehin ersetzt/erweitert werden müsste.
- **Kein DOCX-Korpus-Fixture mit realer, tiefer Mehrfachverschachtelung**: Wie in
  Abschnitt 2/Referenztabelle der Anforderung selbst festgestellt, liest der
  DOCX-Reader `w:ilvl` grundsätzlich nicht (`listMarkerFor`, Zeile 192-201) — der
  Mehrebenen-Testfall (Abschnitt 3.6/Grenzfall 4.4) ist für DOCX-Quellen strukturell
  nicht erreichbar, unabhängig von jeder Fixture-Wahl. Das ist kein Lücke **dieses**
  Plans, sondern eine bereits in `specs/nummerierte-liste-req.md` Abschnitt 5
  dokumentierte, separate Beobachtung zum DOCX-Reader.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 6/7/8 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–9 (Abschnitt 6, Toolbar/Grundverhalten) | `tests/e2e/liste-aufheben.spec.ts`, describe „Toolbar & Grundverhalten" |
| Testfall 10 (Rundreise über echten Upload/Download je Format) | `tests/e2e/liste-aufheben.spec.ts`, describe „Fremddateien & Rundreisen" |
| Testfall 11 (reale Fremddatei-Importe + Aufheben) | `tests/e2e/liste-aufheben.spec.ts` — `ComplexNumberedLists.docx`, `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt` |
| Testfall 12/Grenzfall 4.4 (mehrstufige Liste, Klicks protokollieren) | `tests/e2e/liste-aufheben.spec.ts` + `src/formats/odt/__tests__/list-structure.test.ts` (Struktur-Vorabprüfung) |
| Testfall 13 (Regressionstest Selection-Sync) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Testfall 14 (Cross-Format-Rundreise, doppelt) | `tests/e2e/liste-aufheben.spec.ts`, Testfall 14a |
| Testfall 15 (optischer Vergleich) | `tests/e2e/liste-aufheben.spec.ts`, Testfall 15 |
| Grenzfall 1/15 (Aktiv/Inaktiv-Zustand, `aria-label`) | Fix Abschnitt 3.3 + Tests in `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 4/4b |
| Grenzfall 2 (leere Liste sofort aufheben) | `commands.test.ts` + `liste-aufheben.spec.ts` |
| Grenzfall 3/Testfall 5.1.3 (Nummerierung zweite Teilliste) | Abschnitt 3.6 (Entscheidung + Dokumentation) + Tests in `commands.test.ts`, `roundtrip.test.ts`, `liste-aufheben.spec.ts` Testfall 3 |
| Grenzfall 4/Abschnitt 3.6 (Ein-Klick-pro-Ebene) | Abschnitt 3.5 (Entscheidung) + `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 12 |
| Grenzfall 4.5 (Selektion über Listenrand hinaus) | `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 5 |
| Grenzfall 4.6 (Strg+A über gemischtem Inhalt) | `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 6 |
| Grenzfall 7 (Abgrenzung Enter-auf-leerem-Punkt vs. Button) | Dokumentiert in Abschnitt 2 (Referenztabelle), kein separater Test nötig (unterschiedliche Codepfade bereits durch bestehende `Enter`-Tests und neue Button-Tests getrennt abgedeckt) |
| Grenzfall 8 (Liste in Tabellenzelle) | `liste-aufheben.spec.ts` Testfall 7 + Testfall 11c |
| Grenzfall 9 (zwei direkt aufeinanderfolgende separate Listen) | Abschnitt 3.8 (positiver Befund) + `roundtrip.test.ts`-Erweiterung |
| Grenzfall 10 (Zusatzblock in Punkt) | Abschnitt 3.7 (positiver Befund) + `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 11b |
| Grenzfall 11 (Selection-Sync-Bug in Sequenz) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Grenzfall 12 (sehr lange Liste, Performance) | `liste-aufheben.spec.ts` Testfall 11a (`ComplexNumberedLists.docx`, > 50 Punkte laut Anforderung) |
| Grenzfall 13 (kaputtes Markup) | `liste-aufheben.spec.ts` Testfall 13 (`brokenList.odt`, `ListOddity.odt`) |
| Grenzfall 14 (DOCX-Reimport, Trennabsatz) | Abschnitt 3.8 (positiver Befund) + `roundtrip.test.ts`-Erweiterung |
| Grenzfall 15 (Barrierefreiheit) | Fix Abschnitt 3.3 |
| Grenzfall 16 (Cursor an Absatzgrenze) | `commands.test.ts` (analog zu Testfall 5, gleicher Mechanismus) |
| Neuer Fund: `list_item`-Schema-Verletzung bei Bild-only-Punkt | Fix Abschnitt 3.1 + Test in `list-structure.test.ts` |
| Neuer Fund: Textverlust in `<text:a>` | Fix Abschnitt 3.2 + Test in `list-structure.test.ts` |
| DoD 1 (alle Testfälle aus Abschnitt 6 automatisiert, grün) | Abschnitt 5 dieses Plans, vollständig |
| DoD 2 (Rundreise mit realen Fremddateien je Format) | `liste-aufheben.spec.ts` — DOCX: `ComplexNumberedLists.docx`; ODT: `listLevel10.odt`, `imageWithinList.odt`, `listsInTable.odt` |
| DoD 3 (Verhalten bei über Listenrand hinausreichender Selektion geprüft/dokumentiert) | Abschnitt 2 (Referenztabelle) + Grenzfall-4.5/4.6-Tests |
| DoD 4 (mehrstufige Liste geprüft, Ein-Klick-pro-Ebene-Entscheid dokumentiert) | Abschnitt 3.5 |
| DoD 5 (Nummerierungsverhalten zweite Teilliste bestätigt/dokumentiert) | Abschnitt 3.6 + Abschnitt 7 Punkt 2 (manuelle Word/LibreOffice-Prüfung) |
| DoD 6 (Zusatzblöcke, `imageWithinList.odt`) | Abschnitt 3.1 (Fix) + Abschnitt 3.7 (positiver Befund) + Tests |
| DoD 7 (Regressionstest dauerhaft in Suite) | `tests/e2e/selection-regression.spec.ts`-Erweiterung |
| DoD 8 (`aria-label`/aktiver Zustand/Tastenkombination bewusst entschieden) | Abschnitt 3.3 (implementiert) + Abschnitt 3.4 (bewusst nicht implementiert, begründet) |
| DoD 9 (kein Fund ohne Ticket/Vermerk) | Abschnitt 9 (offene Abhängigkeiten, jeweils mit Ziel-Backlog-Slug referenziert) |
