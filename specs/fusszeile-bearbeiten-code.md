# Umsetzungsplan: Feature „Fußzeile bearbeiten"

Gegenstück zu `specs/fusszeile-bearbeiten-req.md`. Dieser Plan beschreibt den **tatsächlich
verifizierten** Code-Stand (Stichtag 2026-07-04, Repo `E:\docs`, Arbeitskopie ohne
Git-Historie) und die dateigenauen Änderungen zur Umsetzung. Alle Aussagen sind durch
Lesen des tatsächlichen Quellcodes **und** durch Inspektion der realen Test-Fixtures
(nicht nur der Spec) verifiziert; Fundstellen sind mit Pfad+Zeile zitiert. Zwei Befunde
gehen über das hinaus, was `fusszeile-bearbeiten-req.md` Abschnitt 0 bereits feststellt
(siehe §1.6/§1.7) — sie wurden durch Auspacken echter Fixture-Dateien entdeckt, nicht nur
durch Lesen der Anforderungsdatei.

---

## 0. Kurzfassung der Entscheidungen

| # | Offene Frage (Req §11) | Entscheidung dieses Plans |
|---|---|---|
| 1 | Seitenlayout-Integration (Req §6) | **Variante (a), pragmatische Ein-Instanz-Ausprägung**: pro berechneter Seite ein absolut positioniertes „Band"; **eine** einzige editierbare `EditorView`-Instanz wird per DOM-Reparenting in das Band der zuletzt fokussierten Seite verschoben, die übrigen Bänder zeigen einen synchron gehaltenen, nicht editierbaren HTML-Klon. Details in §2. |
| 2 | Leere, aber aktivierte Fußzeile beim Export | **Bleibt erhalten** (Empfehlung der Req wird übernommen) — **kein Code-Änderungsbedarf**, Writer tut das bereits heute korrekt (verifiziert, §1.5). Nur die UI muss `footer` korrekt auf ein leeres Dok-JSON statt `null` setzen. |
| 3 | „Erste Seite anders"/gerade-ungerade | Bleibt **dauerhaft dokumentierte Einschränkung** in dieser Iteration. Reader wird aber von „zufällig erste gefundene Referenz" auf **deterministisch, dokumentiert bevorzugt** umgestellt (§3.6/§3.8) — das ist eine Korrektheits-, keine Feature-Erweiterung. |
| 4 | Gemeinsamer Button mit „Kopfzeile bearbeiten"? | **Zwei getrennte Buttons** (kein gemeinsames Dropdown). `kopfzeile-bearbeiten-code.md` existiert noch nicht; die neue Infrastruktur (`FooterBands`, Reparenting-Mechanismus, Toolbar-Kontextbindung) wird so geschnitten, dass ein späteres, symmetrisches „Kopfzeile"-Feature sie wiederverwenden kann, ohne dass dieser Plan das selbst baut. |

**Zusätzlich in diesem Plan behoben (nicht in der Req explizit benannt, aber durch
Code-/Fixture-Verifikation gefunden):**

- **DOCX-Bild-Relationship-Scoping-Bug** (§1.6): Bilder in Kopf-/Fußzeilen werden beim
  Import aktuell über die **falsche** `.rels`-Datei aufgelöst (`document.xml.rels` statt
  der pro Word-Teil eigenen `header1.xml.rels`/`footer1.xml.rels`) — bei einer echten,
  mit Word erzeugten Datei mit Bild in Kopf-/Fußzeile führt das zu **stillem Laden der
  falschen Datei** (z. B. `styles.xml` als Bild interpretiert) statt des Bildes. Fix in
  §3.11/§3.12.
- **`headerFooter.docx` (die in Req §8.2 als „Basisfall" gelistete Datei) hat tatsächlich
  drei Fußzeilen-Varianten** (`w:type="even"`, `"default"`, `"first"`) — der aktuelle
  Reader lädt durch reine Dokumentreihenfolge **die `even`-Variante**, nicht die
  `default`-Variante (§1.7). Das bestätigt Req §9 nicht nur theoretisch, sondern für
  genau die Datei, die Req §8.2 als ersten Testfall vorschreibt.
- **ODT-Mehrfach-Master-Page-Realstruktur verifiziert**: `HeaderFirstAndEvenPageEnabled_MSO15.odt`
  nutzt zwei Master-Pages `MPF0`/`MP0` mit `style:next-style-name="MP0"`-Verkettung, **keine**
  davon heißt „Standard" (§1.8). Der ursprünglich in der Req vermutete Fix „bevorzuge
  Master-Page namens Standard" reicht allein nicht — Details und korrigierte Heuristik in §3.8.

---

## 1. Verifizierter Ist-Stand (Codebelege)

### 1.1 Datenmodell — `src/formats/shared/documentModel.ts` (21 Zeilen, komplett zitiert)
```ts
export interface WordDocumentContent {
  body: ProseMirrorJSON
  header: ProseMirrorJSON | null
  footer: ProseMirrorJSON | null
  meta: { title: string }
}
```
Bestätigt Req §0 Zeile 1 exakt. `emptyDocJSON()` (Z. 10–12) erzeugt `{type:'doc',
content:[{type:'paragraph', attrs:{align:'left'}}]}` — das ist die Vorlage für eine neu
aktivierte, leere Fußzeile (Req §3 Punkt 2).

### 1.2 Schema — `src/formats/shared/schema.ts` (153 Zeilen)
Node-Typen: `doc, paragraph, heading, text, hard_break, image, bullet_list, ordered_list,
list_item` + Tabellen-Nodes aus `prosemirror-tables` (Z. 6–107). **Kein** Feld-Node,
**kein** `marks`-Attribut auf irgendeinem bestehenden Node außer den impliziten
Text-Marks. Verifiziert per Volltextsuche: kein Treffer für „page_number"/„field" im
gesamten `src`. Bestätigt Req §5 letzter Punkt.

### 1.3 Editor-Kern — `src/formats/shared/editor/WordEditor.tsx` (133 Zeilen)
Genau **eine** `EditorView` (Z. 89–99), gebunden an `wordSchema.nodeFromJSON(doc.content.body)`
(Z. 65). `header`/`footer` werden im gesamten Datei **kein einziges Mal** referenziert
(verifiziert per Volltextsuche über die Datei). `reconcileSelectionOnClick` (Z. 42–53) ist
nur an die eine vorhandene `view.dom` gebunden (Z. 103–104). Bestätigt Req §0 Zeile 7/8
exakt.

### 1.4 Toolbar — `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen)
Alle Icons sind Unicode-Glyphen/Buchstaben (`F`, `K`, `U`, `S`, `⇤`, `↔`, `⇥`, `≡`, `⌫`,
`🖍`, `⊞`, `🖼`) — kein `<svg>` im gesamten Repo außer XML-Namespace-Strings in
`odt/xmlUtil.ts`. Kein Treffer für „Fußzeile"/„footer"/„Seitenzahl" in der Datei.
`ToolbarProps` ist `{ view: EditorView }` — die Toolbar kennt nur **eine** View, es gibt
keinen Mechanismus, um zwischen zwei Instanzen zu unterscheiden. Bestätigt Req §0 Zeile 8.

### 1.5 DOCX/ODT-Writer behandeln eine aktive, aber leere Fußzeile bereits korrekt
**Neuer, verifizierter Befund (widerspricht der Annahme, dass hierfür Code-Änderung
nötig wäre):** `src/formats/docx/writer.ts` Z. 228–243:
```ts
const footer = doc.footer as unknown as { content: JsonNode[] } | null
...
if (footer) {
  footerXml = buildHeaderFooterXml('ftr', blocksToDocx(footer.content, images, documentRels))
  ...
}
```
Die Prüfung ist `if (footer)` — ein Objekt wie `{type:'doc', content:[{type:'paragraph',
attrs:{align:'left'}, content:[]}]}` (leerer, aber aktivierter Zustand) ist **truthy**,
also wird `footer1.xml` mit einem leeren Absatz geschrieben, nicht verworfen. Analog
`src/formats/odt/writer.ts` Z. 190–195: `footerXml = footer ? blocksToOdt(...) : null` und
`buildStylesXml` schreibt `<style:footer>` bei jedem `!== null`-Wert, auch bei einem
Leerabsatz-Ergebnis (`<text:p text:style-name="…"></text:p>`, ein nicht-leerer String).
**Konsequenz für diesen Plan:** Req §7 Grenzfall 1 / §11 Frage 2 ist bereits durch den
bestehenden Writer korrekt gelöst — **keine** Writer-Änderung nötig, nur die UI muss beim
Deaktivieren wirklich `null` setzen (nicht `emptyDocJSON()` liegen lassen) und beim
Aktivieren wirklich ein Objekt (nicht `undefined`) setzen. Wird in §3.9 als Verhaltens-
vertrag festgeschrieben, nicht als Bugfix behandelt.

### 1.6 Neuer Befund: DOCX-Bild-Relationships in Kopf-/Fußzeile falsch aufgelöst
Verifiziert durch Auspacken von `tests/fixtures/external/docx/headerPic.docx`:
`word/_rels/header1.xml.rels` existiert **separat** von `word/_rels/document.xml.rels`
und enthält `rId1 → media/image1.jpeg`; `document.xml.rels` hat für `rId1` einen
komplett anderen Ziel-Typ (`styles.xml`). `header1.xml` referenziert das Bild mit
`r:embed="rId1"` — das ist laut OOXML-Spezifikation **relativ zum eigenen Teil**
(`header1.xml.rels`), nicht zu `document.xml.rels`.

`src/formats/docx/reader.ts` Z. 344 liest **nur** `word/_rels/document.xml.rels` in
`documentRels` und reicht **dieselbe** Map als `imageRels`-Parameter an
`readBodyChildren` für Body **und** Header **und** Footer durch (Z. 346, 363, 372).
Für ein Bild in echten Kopf-/Fußzeilen mit eigener `.rels`-Datei bedeutet das:
`imageRels.get('rId1')` liefert das **falsche** Ziel (z. B. `styles.xml` statt
`media/image1.jpeg`); `resolveImageSources` lädt dann den Inhalt von `word/styles.xml`,
labelt ihn fälschlich als Bild-Data-URL (Extension aus Pfad `.xml` → `data:image/xml;
base64,...`) — **stiller, konkreter Datenverlust/Korruption**, keine Exception, keine
Warnung. Der Bug betrifft **beide** Geschwister-Features (Kopf- **und** Fußzeile)
gleichermaßen, da `readBodyChildren` gemeinsam genutzt wird — Fix hier, weil Req §8.2
Testfall 3 „Bild bleibt bei Rundreise zugeordnet" für Fußzeile explizit fordert und der
zugrunde liegende Code-Pfad geteilt ist. Analoger Bug existiert **spiegelbildlich im
Writer**: `src/formats/docx/writer.ts` Z. 224 erzeugt nur **eine** `RelationshipRegistry`
(`documentRels`), die für Body-, Header- **und** Footer-Bilder gleichermaßen verwendet
wird (Z. 226, 235, 240) und ausschließlich als `word/_rels/document.xml.rels` serialisiert
wird (Z. 267) — es gibt **keine** `header1.xml.rels`/`footer1.xml.rels` im Export. Für den
eigenen Round-Trip fällt das aktuell nicht auf (Reader und Writer teilen denselben Fehler
symmetrisch), aber eine damit erzeugte Datei ist **nicht spezifikationskonform** und ein
Bild in der Fußzeile würde in echtem Word/LibreOffice, das die Teile-Trennung korrekt
erwartet, möglicherweise nicht auflösen (nicht mit dieser App verifizierbar, da unsere
eigene Implementierung den Fehler auf beiden Seiten spiegelt). Fix in §3.11/§3.12.

**ODT ist von dieser Bug-Klasse nicht betroffen** — `src/formats/odt/reader.ts` Z.
208–231 löst Bildpfade direkt über `zip.file(href)` mit paketwurzel-relativen Pfaden auf,
ohne Relationship-Indirektion.

### 1.7 Neuer Befund: `headerFooter.docx` lädt aktuell die `even`-Variante, nicht `default`
Verifiziert durch Auspacken von `tests/fixtures/external/docx/headerFooter.docx` — die
in Req §8.2 als **erste, wichtigste** Testdatei gelistete Datei:
```
<w:sectPr>
  <w:headerReference w:type="even" r:id="rId4"/>
  <w:headerReference w:type="default" r:id="rId5"/>
  <w:footerReference w:type="even" r:id="rId6"/>
  <w:footerReference w:type="default" r:id="rId7"/>
  <w:headerReference w:type="first" r:id="rId8"/>
  <w:footerReference w:type="first" r:id="rId9"/>
  ...
</w:sectPr>
```
`src/formats/docx/reader.ts` Z. 353 (`firstChildNS(sectPr, ns, 'footerReference')`)
nimmt in Dokumentreihenfolge das **erste** `w:footerReference`-Element — das ist hier
`w:type="even"` (`rId6`), **nicht** `default`. Für diese konkrete, von der Req als
Referenzfall benannte Datei zeigt die App aktuell also die **gerade-Seiten-Fußzeile**,
nicht die Standard-Fußzeile, rein durch Zufall der XML-Reihenfolge. Bestätigt Req §0
Zeile 3 („ungeachtet des `w:type`") und schärft sie: es ist nicht nur theoretisch falsch,
sondern für die konkrete Pflicht-Testdatei nachweislich die **falsche von drei**
Varianten. Fix in §3.6.

### 1.8 Neuer Befund: reale ODT-Mehrfach-Master-Page-Struktur
Verifiziert durch Auspacken von
`tests/fixtures/external/odt/HeaderFirstAndEvenPageEnabled_MSO15.odt`:
```xml
<style:master-page style:next-style-name="MP0" style:name="MPF0" style:page-layout-name="PL0">
  <style:header><text:p ...>First page header</text:p></style:header>
</style:master-page>
<style:master-page style:name="MP0" style:page-layout-name="PL0">
  <style:header><text:p ...>Header default</text:p></style:header>
  <style:header-left><text:p ...>Even/Gerade Header</text:p></style:header-left>
</style:master-page>
```
`content.xml` referenziert `master-page-name="MPF0"` als Start-Master-Page. Weder `MPF0`
noch `MP0` heißt „Standard" (nur unser **eigener** Writer benennt seine Master-Page so,
Req-Vermutung „bevorzuge Master-Page namens Standard" reicht als alleinige Heuristik
also **nicht** für reale Fremddateien). Stattdessen zeigt sich ein klares, wiedererkennbares
Muster: `MPF0` ist die Erste-Seite-Variante (referenziert von `content.xml` als Startpunkt,
verkettet via `style:next-style-name="MP0"` zur regulären Folgeseiten-Variante) — die
**Ziel**-Master-Page einer `next-style-name`-Kette ist die für „normale" (Folge-)Seiten
gemeinte, nicht die Quelle. `src/formats/odt/reader.ts` Z. 257
(`stylesDoc.getElementsByTagNameNS(style, 'master-page')[0]`) nimmt unabhängig davon
einfach das **erste** `<style:master-page>`-Element in Dokumentreihenfolge — hier zufällig
`MP0` (da `MPF0` in diesem konkreten File nach `MP0` im XML steht) oder umgekehrt, je nach
vom Autorenprogramm gewählter Reihenfolge; das ist nicht deterministisch vorhersagbar.
Korrigierte Heuristik in §3.8.

### 1.9 Seitenlayout — `pageLayout.ts` (30 Zeilen) + `pagination.ts` (115 Zeilen)
Bestätigt Req §0 Zeile 9 exakt: `pageBackgroundStyle()` (pageLayout.ts Z. 22–30) malt ein
sich wiederholendes CSS-Gradient-Hintergrundmuster auf einen **einzigen**
scrollenden Container; `createPaginationPlugin()` (pagination.ts Z. 72–105) fügt
`Decoration.widget`-Spacer **zwischen** Seiten ein, aber es gibt **keine** echten
Pro-Seite-DOM-Container. `computePageCount()` (Z. 27–29) existiert bereits und wird
intern verwendet, ist aber nicht nach außen (an `WordEditor.tsx`) exponiert — muss für
dieses Feature exponiert werden (§3.5).

### 1.10 Reale Fixture-Verifikation: alle in Req §8.2 gelisteten Dateien existieren
```
docx/: DiffFirstPageHeadFoot.docx, EmptyDocumentWithHeaderFooter.docx, FancyFoot.docx,
       HeaderFooterUnicode.docx, NoHeadFoot.docx, PageSpecificHeadFoot.docx,
       SimpleHeadThreeColFoot.docx, ThreeColFoot.docx, ThreeColHeadFoot.docx,
       headerFooter.docx
odt/:  HeaderFirstAndEvenPageEnabled_MSO15.odt, ..._AndMarging_MSO15.odt,
       HeaderFirstPageDisabled_MSO15.odt, HeaderFirstPageEnabled_MSO15.odt,
       HeaderFooter.odt, headerFinal.odt, headerFirstPage.odt, headfoot.odt,
       tabellen_header_DOC_LO4-1-0.odt
```
Keine der für Req §8.2 Testfall 3 („Bild in der Fußzeile") genannten Dateien
(`ThreeColFoot.docx`, `SimpleHeadThreeColFoot.docx`, `ThreeColHeadFoot.docx`,
`FancyFoot.docx`) enthält tatsächlich ein Bild in ihrem Footer-Teil (verifiziert: keine
`word/_rels/footerN.xml.rels` in diesen Dateien vorhanden, was ein Bild voraussetzen
würde). `headerPic.docx` hat das Bild nachweislich im **Header**, nicht im Footer
(bestätigt Req §8.2 Testfall 3 eigene Formulierung „…sonst als Kopfzeilen-Äquivalent im
Schwester-Feature zu prüfen"). **Konsequenz:** Testfall „Bild in der Fußzeile" wird für
dieses Ticket ausschließlich über einen **selbst erzeugten** Rundreise-Test abgedeckt
(Req §8.1.4), nicht über eine reale externe Fixture — das ist keine Lücke, sondern durch
das vorhandene Testmaterial vorgegeben, und wird in §6 explizit so vermerkt.

---

## 2. Architekturentscheidung zu Req §6 (Seitenlayout-Integration)

**Gewählt: Variante (a)**, in einer auf die bestehende Single-Surface-Paginierung
zugeschnittenen, pragmatischen Ausprägung — **nicht** Variante (c) (echte
Pro-Seite-Container; das wäre ein Rewrite von `pagination.ts`/`pageLayout.ts` und damit
außerhalb des Scopes dieses Tickets) und **nicht** Variante (b) (Fußzeile nur auf der
letzten Seite — verletzt Req §7 Grenzfall 3 als Dauerzustand, nur als Zwischenschritt
während der Implementierung akzeptabel, s. u.).

### 2.1 Grundidee
- `createPaginationPlugin()` berechnet bereits `computePageCount(heights,
  PAGE_CONTENT_HEIGHT_PX)` intern (pagination.ts Z. 27–29, 37). Diese Zahl wird über einen
  neuen, optionalen Callback-Parameter nach außen gereicht:
  ```ts
  export function createPaginationPlugin(onPageCountChange?: (count: number) => void): Plugin
  ```
  Innerhalb von `measureAndBuildDecorations`/dem `view.update`-Hook wird zusätzlich
  `onPageCountChange?.(computePageCount(heights, PAGE_CONTENT_HEIGHT_PX))` aufgerufen
  (nur bei tatsächlicher Änderung, analog zum bestehenden `sameDecorationSet`-Vergleich,
  um Render-Schleifen zu vermeiden).
- `WordEditor.tsx` hält `const [pageCount, setPageCount] = useState(1)` und übergibt
  `createPaginationPlugin(setPageCount)` beim Plugin-Setup.
- Ein neues Modul `src/formats/shared/editor/pageBands.ts` berechnet die Pixel-Y-Position
  jedes „Fußzeilen-Bands" relativ zum äußeren, gepolsterten Seiten-Wrapper (demselben
  Element, das `pageBackgroundStyle()` trägt):
  ```ts
  export function footerBandTopPx(pageIndex: number): number {
    return pageIndex * (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX) + PAGE_CONTENT_HEIGHT_PX
  }
  ```
  Das platziert Band `i` exakt an den Anfang der (bereits heute gemalten) Lücke nach
  Seite `i` — dort beginnt visuell der untere Seitenrand von Seite `i`. Höhe: mindestens
  `PAGE_MARGIN_PX`, wächst mit tatsächlichem Fußzeileninhalt (kein `max-height`/`overflow:
  hidden`) — erfüllt Req §7 Grenzfall 5 („kein stilles Abschneiden") strukturell.
  **Dokumentierte visuelle Einschränkung:** Wächst eine Fußzeile über `PAGE_MARGIN_PX +
  PAGE_SEPARATOR_PX` hinaus, überlappt sie optisch die bestehende Grau/Weiß-Hintergrund-
  Illusion der nächsten Seite (das Hintergrundmuster selbst passt sich nicht dynamisch an).
  Das ist eine bewusste, dokumentierte Grenze der Hintergrundbild-Illusion (Req §6 zweiter
  Absatz), kein neuer Bug.

### 2.2 Eine editierbare Instanz, viele visuelle Bänder
Es wird **eine** `EditorView` für den Footer erzeugt (eigene Undo-Historie, eigenes
`EditorState`, eigenes Schema-Dokument aus `document.content.footer`). Für `pageCount`
Bänder wird jedoch **eine** live-editierbare DOM-Stelle benötigt und `pageCount - 1`
rein visuelle, nicht editierbare Kopien:

1. `FooterBands.tsx` rendert `pageCount` absolut positionierte `<div>`-Container
   (`footerBandTopPx(i)`).
2. Der Container mit Index `activeBandIndex` (initial `0`) bekommt das reale
   `footerView.dom`-Element per `ref`-Callback via `containerEl.appendChild(footerView.dom)`
   zugewiesen (DOM-Knoten verschieben, **kein** `view.destroy()`/Neuerzeugen — die
   `EditorView`-Instanz und ihre Historie bleiben unangetastet, nur ihr DOM-Wurzelknoten
   wechselt den Elternknoten).
3. Alle anderen Bänder rendern einen reinen Anzeige-Klon:
   `<div aria-hidden="true" dangerouslySetInnerHTML={{ __html: footerHtmlSnapshot }} />`,
   wobei `footerHtmlSnapshot` bei jeder `dispatchTransaction` des Footer-Views aus
   `footerView.dom.innerHTML` aktualisiert wird (React-State in `WordEditor.tsx`).
   Da der Klon strukturell identisch zum echten DOM ist (dieselbe `toDOM`-Ausgabe),
   sehen alle Seiten optisch denselben, aktuellen Inhalt (erfüllt Req §7 Grenzfall 3/4).
4. **Klick auf ein Klon-Band fokussiert die echte Instanz an der richtigen Stelle:**
   Beim Klick auf ein Klon-Band wird die Klick-Position zunächst per
   `document.caretRangeFromPoint(x, y)` (Fallback `caretPositionFromPoint`) in eine
   `(domNode, offset)`-Position **innerhalb des Klons** aufgelöst. Da der Klon eine
   1:1-Kopie derselben `innerHTML` ist, wird der `domNode` über einen Kindindex-Pfad
   (`childIndexPath(node, root)`, von der Klick-Stelle bis zur Band-Wurzel gezählt)
   auf den strukturell identischen Knoten im **echten** `footerView.dom` abgebildet;
   `footerView.posAtDOM(matchedNode, offset)` liefert daraus eine echte ProseMirror-
   Position. Anschließend: `activeBandIndex` wird auf das geklickte Band gesetzt (löst
   das Reparenting aus §2.2.2 aus), danach `footerView.dispatch(tr.setSelection(
   TextSelection.near(footerView.state.doc.resolve(pos))))`, `footerView.focus()`.
   **Dokumentiertes Restrisiko:** Bricht die Pfad-Zuordnung bei exotischer, durch
   Marks/verschachtelte Inline-Knoten erzeugter DOM-Struktur ab, fällt der Klick auf
   „Cursor ans Ende des Fußzeileninhalts" zurück (kein Crash, kein falscher Bereich) —
   das ist als bewusste, dokumentierte Vereinfachung zu behandeln (Req-Prinzip „kein
   stiller Fehlschlag" erfüllt, da der Fokus in jedem Fall im Footer landet, nur die
   exakte Zeichenposition im Ausnahmefall approximiert wird). Muss während der
   Implementierung per manuellem Test verifiziert werden (als Spike-Punkt in §9
   vermerkt).
5. **Sonderfall `pageCount === 1`** (die weit überwiegende Mehrheit aller Dokumente):
   Es gibt nur ein Band, kein Reparenting/Klon-Mechanismus wird je ausgelöst — der
   komplexe Pfad in §2.2.2–4 ist vollständig totes Gleis für den Alltagsfall und nur für
   mehrseitige Dokumente relevant. Das reduziert das praktische Risiko dieser
   Architekturentscheidung erheblich.

### 2.3 Warum nicht einfach `pageCount` echte, unabhängige `EditorView`-Instanzen?
Verworfen: Req §4 letzter Absatz verlangt **eine** gemeinsame Undo-Historie pro
Fußzeile (nicht pro Seite) und **identischen** Inhalt auf jeder Seite (Req §3.3-Analogon
für Kopfzeile, hier §7 Grenzfall 3/4) — mehrere unabhängige Views würden entweder
`pageCount` separate Undo-Historien erzeugen (falsch) oder eine aufwendige
State-Synchronisation zwischen ihnen erfordern, die im Ergebnis exakt das ist, was der
Klon-Mechanismus in §2.2 bereits einfacher leistet.

---

## 3. Dateigenaue Änderungen

### 3.1 `src/formats/shared/schema.ts` (ändern)
Neuer Inline-Atom-Node, ans Ende von `nodes` ergänzt:
```ts
page_number_field: {
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  marks: '_', // Feld kann wie Text Marks tragen (fett, Farbe, ...) — neu ggü. image/hard_break
  attrs: { cachedValue: { default: '1', validate: 'string' } },
  toDOM(node) {
    return [
      'span',
      { class: 'page-number-field', contenteditable: 'false', 'data-page-number-field': 'true' },
      String(node.attrs.cachedValue),
    ]
  },
  parseDOM: [
    {
      tag: 'span[data-page-number-field]',
      getAttrs: (dom) => ({ cachedValue: (dom as HTMLElement).textContent || '1' }),
    },
  ],
},
```
`marks: '_'` ist im bestehenden Schema **neues Terrain** (Req §5, „neues Terrain im
Schema") — kein vorhandener Node nutzt dieses Feld. Muss während der Implementierung per
manuellem Test verifiziert werden, ob `toggleMark` auf eine `NodeSelection` dieses Atoms
zuverlässig wirkt (Spike-Punkt, §9). Als primärer, in jedem Fall funktionierender Pfad:
`insertPageNumberField()` (§3.3) übernimmt die an der Cursor-Position aktiven Marks
(`state.storedMarks || $from.marks()`) direkt beim Erzeugen des Node, sodass „fett tippen,
dann Seitenzahl einfügen" immer korrekt formatiert erscheint, unabhängig vom
Nachträglich-Formatieren-Fall.

Diese Node-Definition ist bewusst identisch zu der in `seitenzahl-einfuegen-req.md` §3.4
geforderten Struktur — dieser Plan **implementiert** sie hier (weil Req
`fusszeile-bearbeiten-req.md` §5/§10.3 sie als Teil der eigenen Abnahme verlangt), ein
künftiger `seitenzahl-einfuegen-code.md`-Plan muss darauf verweisen statt sie erneut zu
definieren (siehe §10).

### 3.2 `src/formats/shared/documentModel.ts` (ändern)
Neue Helper-Funktion, ergänzt Verhaltensvertrag aus §1.5:
```ts
/** True, wenn footer/header nur aus einem einzigen leeren Absatz besteht (keine
 * sichtbaren Inhalte) — Grundlage für "sofort deaktivieren ohne Bestätigung" (Req §3.5). */
export function isChromeContentEmpty(doc: ProseMirrorJSON | null): boolean {
  if (!doc) return true
  const content = (doc as { content?: unknown[] }).content ?? []
  if (content.length === 0) return true
  if (content.length > 1) return false
  const only = content[0] as { type?: string; content?: unknown[] }
  return only.type === 'paragraph' && (!only.content || only.content.length === 0)
}
```

### 3.3 `src/formats/shared/editor/commands.ts` (ändern)
Neue Exporte, ans Ende der Datei:
```ts
export function insertPageNumberField(): Command {
  return (state, dispatch) => {
    const marks = state.storedMarks || state.selection.$from.marks()
    const node = wordSchema.nodes.page_number_field.create({ cachedValue: '1' }, undefined, marks)
    if (dispatch) dispatch(state.tr.replaceSelectionWith(node))
    return true
  }
}
```
Kein `canInsertPageNumberField`-Guard nötig — `page_number_field` ist Teil der Gruppe
`inline`, überall zulässig, wo Inline-Content erlaubt ist (identisch zu Text); die
**Einschränkung** „nur sinnvoll in Kopf-/Fußzeile" (Req §2 Zeile 5) ist eine reine
UI-Sichtbarkeits-/Aktivierungsregel (Toolbar), keine Schema-Regel — siehe §3.4/§7
Grenzfall zu Abschnitt 4 der Sitzenzahl-Req.

### 3.4 `src/formats/shared/editor/pagination.ts` (ändern)
Signaturänderung (Details §2.1):
```ts
export function createPaginationPlugin(onPageCountChange?: (count: number) => void): Plugin {
  return new Plugin({
    ...
    view(view) {
      const recompute = () => {
        const next = measureAndBuildDecorations(view)
        const current = paginationKey.getState(view.state)
        if (!current || !sameDecorationSet(current, next)) {
          view.dispatch(view.state.tr.setMeta(paginationKey, next))
        }
        const heights = Array.from(view.dom.children as HTMLCollectionOf<HTMLElement>).map(
          (el) => el.getBoundingClientRect().height,
        )
        onPageCountChange?.(computePageCount(heights, PAGE_CONTENT_HEIGHT_PX))
      }
      ...
    },
  })
}
```
(Refactor: `measureAndBuildDecorations` misst `heights` bereits intern — pragmatisch für
diesen Plan wird die Höhen-Messung ein zweites Mal ausgeführt, um `measureAndBuildDecorations`
nicht anfassen zu müssen; sauberer wäre, `heights`/`pageCount` aus einer gemeinsamen
internen Helper-Funktion zurückzugeben — als kleine, unabhängige Aufräumarbeit in §9
vermerkt, kein Blocker.)

### 3.5 Neu: `src/formats/shared/editor/pageBands.ts`
Reine, ungetestete-bislang Konstantenberechnung (wird in §6.1 unit-getestet):
```ts
import { PAGE_CONTENT_HEIGHT_PX, PAGE_GAP_PX, PAGE_MARGIN_PX } from './pageLayout'

export function footerBandTopPx(pageIndex: number): number {
  return pageIndex * (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX) + PAGE_CONTENT_HEIGHT_PX
}

export const FOOTER_BAND_MIN_HEIGHT_PX = PAGE_MARGIN_PX
```

### 3.6 `src/formats/docx/reader.ts` (ändern) — deterministische Referenzwahl + Rels-Scoping-Fix
**a) Deterministische `w:type`-Präferenz** (behebt §1.7). Ersetzt die
`firstChildNS(sectPr, ns, 'headerReference'/'footerReference')`-Aufrufe (Z. 352–353)
durch:
```ts
function pickSectionReference(
  sectPr: Element, ns: string, localName: string,
): { el: Element | null; hasVariants: boolean } {
  const all = childElements(sectPr, ns, localName)
  if (all.length === 0) return { el: null, hasVariants: false }
  const byType = new Map(all.map((el) => [el.getAttributeNS(OOXML_NAMESPACES.w, 'type') ?? 'default', el]))
  const chosen = byType.get('default') ?? all[0]
  return { el: chosen, hasVariants: all.length > 1 }
}
```
`headerRef`/`footerRef` werden über `pickSectionReference(sectPr, w, 'headerReference'
/'footerReference')` bezogen; `hasVariants` wird in einer neuen Rückgabe-Eigenschaft
`meta.footerVariantNotice`/`meta.headerVariantNotice` (String oder `null`) verpackt, z. B.:
`'Diese Datei enthält mehrere Fußzeilen-Varianten (z. B. „erste Seite anders" oder
gerade/ungerade). Nur eine Variante wird angezeigt/bearbeitet; beim Export wird
vereinheitlicht.'` — erfüllt Req §9 Deklarationspflicht (Anzeige in §3.13).

**b) Multi-Section-Blindstelle dokumentieren, First-Section-Fallback ergänzen** (behebt
Req §9 Punkt 3 im begrenzten, dokumentierten Umfang). Aktuell (Z. 350) wird
ausschließlich `firstChildNS(bodyEl, ns, 'sectPr')` gelesen — das ist laut OOXML-Spezifikation
**immer nur die letzte Section** (frühere Sections tragen ihr `w:sectPr` verschachtelt
in `w:p > w:pPr`, nicht als direktes `w:body`-Kind). Fix: zusätzlich alle
`w:body > w:p > w:pPr > w:sectPr`-Vorkommen in Dokumentreihenfolge einsammeln und, falls
vorhanden, das **erste** davon (statt des body-abschließenden, letzten) für Header-/
Footer-Auflösung verwenden — das entspricht der intuitiven Erwartung „erster Abschnitt
gewinnt" und ist eine bewusste, im Code kommentierte Wahl:
```ts
const sectionSectPrs = [
  ...Array.from(bodyEl?.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'sectPr') ?? []),
]
const sectPr = sectionSectPrs[0] ?? null // erster Abschnitt gewinnt, siehe fusszeile-bearbeiten-code.md §3.6b
```
(`getElementsByTagNameNS` liefert **alle** Nachfahren-`sectPr` in Dokumentreihenfolge,
inklusive des body-abschließenden — das deckt sowohl in-Paragraph- als auch
Body-Top-Level-Vorkommen ab, ohne zwei getrennte Codepfade zu brauchen.) Bei mehr als
einem gefundenen `sectPr` wird ebenfalls ein `meta`-Hinweis gesetzt (wiederverwendet
dieselbe Warninfrastruktur wie a).

**c) Bild-Relationship-Scoping-Fix** (behebt §1.6). Header-/Footer-Teil-Pfad wird
weiterhin wie bisher über `documentRels` aufgelöst (das ist korrekt — die
`headerReference`/`footerReference` selbst leben in `document.xml.rels`), aber die
**Bild**-Relationships innerhalb des geladenen Header-/Footer-Parts werden aus einer
**eigenen**, für diesen Teil gelesenen `.rels`-Datei bezogen:
```ts
async function readPartOwnRelationships(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const dir = partPath.split('/').slice(0, -1).join('/')
  const base = partPath.split('/').pop()!
  return readRelationships(zip, `${dir}/_rels/${base}.rels`)
}
```
In den Header-/Footer-Lade-Blöcken (Z. 357–375) wird `readBodyChildren(root, headingInfo,
kindByNumId, documentRels, zip)` durch
`readBodyChildren(root, headingInfo, kindByNumId, await readPartOwnRelationships(zip, path), zip)`
ersetzt (`path` ist die bereits vorhandene, per `resolvePartPath` aufgelöste
Header-/Footer-Datei). `readRelationships` existiert bereits (Z. 23–34) und muss nicht
geändert werden — nur ein zusätzlicher Aufruf mit anderem Pfad.

### 3.7 `src/formats/docx/writer.ts` (ändern) — pro Teil eigene Relationship-Registry
Behebt §1.6 Schreibrichtung. `writeDocx` (Z. 222 ff.) bekommt zwei zusätzliche,
bedingt erzeugte Registries:
```ts
const headerRels = new RelationshipRegistry()
const footerRels = new RelationshipRegistry()
...
if (header) {
  headerXml = buildHeaderFooterXml('hdr', blocksToDocx(header.content, images, headerRels))
  const relId = documentRels.add(RELATIONSHIP_TYPES.header, 'header1.xml')
  sectPrExtra += `<w:headerReference w:type="default" r:id="${relId}"/>`
}
if (footer) {
  footerXml = buildHeaderFooterXml('ftr', blocksToDocx(footer.content, images, footerRels))
  const relId = documentRels.add(RELATIONSHIP_TYPES.footer, 'footer1.xml')
  sectPrExtra += `<w:footerReference w:type="default" r:id="${relId}"/>`
}
```
(`images`, der `ImageCollector`, bleibt **eine** gemeinsame Instanz — nur die
Relationship-**IDs**, nicht die Bilddateien selbst, sind pro Teil zu trennen.) Beim
Zip-Schreiben (Z. 257 ff.) zusätzlich:
```ts
if (headerXml && headerRels.all().length) {
  wordFolder.folder('_rels')!.file('header1.xml.rels', headerRels.serialize())
}
if (footerXml && footerRels.all().length) {
  wordFolder.folder('_rels')!.file('footer1.xml.rels', footerRels.serialize())
}
```
(Rels-Datei wird nur geschrieben, wenn der Teil tatsächlich ein Bild enthält — analog zu
echtem Word-Verhalten, verifiziert in §1.6.)

### 3.8 `src/formats/odt/reader.ts` (ändern) — deterministische Master-Page-Wahl
Behebt §1.8. Ersetzt Z. 257 (`getElementsByTagNameNS(style, 'master-page')[0]`) durch:
```ts
function pickMasterPage(stylesDoc: Document): { el: Element | null; hasVariants: boolean } {
  const all = Array.from(stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page'))
  if (all.length === 0) return { el: null, hasVariants: false }
  if (all.length === 1) return { el: all[0], hasVariants: false }

  // Wird eine Master-Page per style:next-style-name von einer anderen referenziert,
  // ist SIE die für reguläre Folgeseiten gemeinte (die Quelle ist meist die
  // "erste Seite anders"-Variante) — verifiziert an einer echten LibreOffice-Datei,
  // siehe fusszeile-bearbeiten-code.md §1.8.
  const chainTargets = new Set(
    all.map((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'next-style-name')).filter((v): v is string => !!v),
  )
  const chained = all.find((el) => chainTargets.has(el.getAttributeNS(ODF_NAMESPACES.style, 'name') ?? ''))
  if (chained) return { el: chained, hasVariants: true }

  // Fallback: eine Master-Page namens "Standard" (deckt u. a. unseren eigenen Writer ab).
  const standard = all.find((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'name') === 'Standard')
  if (standard) return { el: standard, hasVariants: true }

  // Letzter Fallback: erste gefundene, jetzt bewusst dokumentiert statt zufällig.
  return { el: all[0], hasVariants: true }
}
```
Analog zu §3.6a wird `hasVariants` in `meta.footerVariantNotice`/`headerVariantNotice`
verpackt. Bild-Relationship-Scoping-Fix ist für ODT **nicht nötig** (§1.6 letzter Satz).

### 3.9 `src/formats/docx/writer.ts` / `src/formats/odt/writer.ts` (odt: keine Änderung)
**Keine** weitere Änderung in `odt/writer.ts` nötig — Grenzfall „leere, aktive Fußzeile"
ist bereits korrekt (§1.5), Bild-Rels-Bug betrifft nur DOCX (§1.6). `docx/writer.ts`
erhält **nur** die in §3.7 beschriebene Änderung; der bestehende
„`if (footer)`"-Truthy-Check (Z. 239) bleibt **unverändert** (das ist bereits der
korrekte Vertrag aus §1.5).

### 3.10 Page-Number-Feld: `src/formats/docx/reader.ts` (ändern) — `w:fldSimple` und `w:fldChar`-Quadruple
Größte Einzeländerung dieses Plans. `decodeParagraphRuns` (Z. 124–143) iteriert aktuell
**nur** über `<w:r>`-Kinder eines `<w:p>` — `<w:fldSimple>` (paralleles Geschwister-
Element zu `<w:r>`) wird dadurch komplett übersehen. Umbau: iteriert stattdessen über
**alle** direkten Kinder von `<w:p>` und unterscheidet:

```ts
function decodeParagraphRuns(pEl: Element): RunLike[] {
  const runs: RunLike[] = []
  let fieldState: 'none' | 'instr' | 'cached' = 'none'
  let instrText = ''
  let cachedText = ''
  let cachedMarks: RunLike['marks']

  const flushField = () => {
    const isPageField = /\bPAGE\b/i.test(instrText)
    if (isPageField) {
      runs.push({ kind: 'pageNumber', text: cachedText || '1', marks: cachedMarks })
    } else if (cachedText) {
      // Unbekannter Feldtyp: mindestens sichtbaren Text erhalten (Req Grenzfall 10 /
      // seitenzahl-einfuegen-req.md Abschnitt 8, text:page-count-artige Fälle).
      runs.push({ kind: 'text', text: cachedText, marks: cachedMarks })
    }
    fieldState = 'none'; instrText = ''; cachedText = ''; cachedMarks = undefined
  }

  for (const child of Array.from(pEl.children)) {
    if (child.namespaceURI !== OOXML_NAMESPACES.w) continue

    if (child.localName === 'fldSimple') {
      // <w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple>
      const instr = child.getAttributeNS(OOXML_NAMESPACES.w, 'instr') ?? ''
      const innerR = firstChildNS(child, OOXML_NAMESPACES.w, 'r')
      const innerT = innerR && firstChildNS(innerR, OOXML_NAMESPACES.w, 't')
      const marks = marksFromRunProperties(innerR && firstChildNS(innerR, OOXML_NAMESPACES.w, 'rPr'))
      if (/\bPAGE\b/i.test(instr)) {
        runs.push({ kind: 'pageNumber', text: innerT?.textContent || '1', marks: marks.length ? marks : undefined })
      } else if (innerT?.textContent) {
        runs.push({ kind: 'text', text: innerT.textContent, marks: marks.length ? marks : undefined })
      }
      continue
    }

    if (child.localName !== 'r') continue
    const rPr = firstChildNS(child, OOXML_NAMESPACES.w, 'rPr')
    const marks = marksFromRunProperties(rPr)
    const fldChar = firstChildNS(child, OOXML_NAMESPACES.w, 'fldChar')
    const fldCharType = fldChar?.getAttributeNS(OOXML_NAMESPACES.w, 'fldCharType')

    if (fldCharType === 'begin') { fieldState = 'instr'; instrText = ''; continue }
    if (fldCharType === 'separate') { fieldState = 'cached'; cachedText = ''; continue }
    if (fldCharType === 'end') { flushField(); continue }

    if (fieldState === 'instr') {
      const instrTextEl = firstChildNS(child, OOXML_NAMESPACES.w, 'instrText')
      if (instrTextEl) instrText += instrTextEl.textContent ?? ''
      continue // instrText selbst nie als sichtbarer Text emittieren
    }
    if (fieldState === 'cached') {
      const t = firstChildNS(child, OOXML_NAMESPACES.w, 't')
      if (t) { cachedText += t.textContent ?? ''; cachedMarks = marks.length ? marks : cachedMarks }
      continue // der <w:t> zwischen separate/end ist Teil des Feldes, kein eigenständiger Run
    }

    // Normale Runs (unverändert ggü. bisherigem Verhalten)
    for (const c of Array.from(child.children)) {
      if (c.namespaceURI === OOXML_NAMESPACES.w && c.localName === 't') {
        runs.push({ kind: 'text', text: c.textContent ?? '', marks: marks.length ? marks : undefined })
      } else if (c.namespaceURI === OOXML_NAMESPACES.w && c.localName === 'br') {
        runs.push({ kind: 'break' })
      } else if (c.namespaceURI === OOXML_NAMESPACES.w && c.localName === 'drawing') {
        /* unverändert wie bisher */
      }
    }
  }
  return runs
}
```
`RunLike.kind` bekommt den neuen Wert `'pageNumber'`; `runsToInline` (Z. 185–190) bekommt
einen neuen Zweig: `r.kind === 'pageNumber' ? { type: 'page_number_field', attrs: {
cachedValue: r.text || '1' }, marks: r.marks } : ...`. Das behebt exakt die beiden in
`seitenzahl-einfuegen-req.md` §0 Punkt 4 verifizierten Bestandsfehler (stiller Verlust bei
`fldSimple`, Herabstufung zu statischem Text bei `fldChar`) — als Nebeneffekt auch für
Body-Text, nicht nur Kopf-/Fußzeile (der Codepfad ist gemeinsam genutzt, siehe §3.10
Einleitung).

### 3.11 `src/formats/docx/writer.ts` (ändern) — Feld-Export
`inlineToRuns` (Z. 39–65) bekommt einen neuen Knoten-Typ-Zweig **vor** der bestehenden
`if (node.type === 'text')`-Prüfung:
```ts
if (node.type === 'page_number_field') {
  flush()
  const cached = escapeXml(String(node.attrs?.cachedValue ?? '1'))
  const rPr = runPropertiesXml(node.marks)
  runs.push(
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r>${rPr}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r>${rPr}<w:t>${cached}</w:t></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`,
  )
}
```
**Entscheidung:** Export als `w:fldChar`-Quadruple, **nicht** `w:fldSimple` — Begründung:
das ist die von echtem Microsoft Word in der Praxis überwiegend erzeugte Form
(verifiziert/dokumentiert in `seitenzahl-einfuegen-req.md` §0 Punkt 4), maximiert also
Kompatibilität mit realer Rundreise durch Word selbst. Der **Reader** (§3.10) erkennt
beide Formen, unabhängig von dieser Schreib-Entscheidung.

### 3.12 `src/formats/odt/reader.ts` (ändern) — `text:page-number` erkennen
`decodeInline`s `walk()`-Funktion (Z. 96–116) hat aktuell **keinen** abschließenden
Zweig für unbekannte Elemente — `text:page-number` und `text:page-count` werden komplett
ignoriert, inklusive ihres Cache-Textinhalts (Req-Befund, bestätigt). Neuer Zweig,
eingefügt vor dem letzten `else if`:
```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-number') {
  result.push({
    type: 'page_number_field',
    attrs: { cachedValue: el.textContent || '1' },
    marks: marks.length ? marks : undefined,
  } as unknown as JsonNode)
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-count') {
  // Explizit NICHT als page_number_field interpretieren (andere Bedeutung,
  // siehe seitenzahl-einfuegen-req.md §3.8) — mindestens Text erhalten.
  const text = el.textContent ?? ''
  if (text) result.push({ type: 'text', text, marks: marks.length ? marks : undefined })
}
```
(`JsonNode`-Interface hat kein `type: 'page_number_field'` in seiner Deklaration —
Cast oder Interface-Erweiterung um `attrs?: Record<string, unknown>` — Feld existiert
in `JsonNode` bereits generisch als `attrs?: Record<string, unknown>`, nur der
Discriminant-Typ `type: string` ist ohnehin ein loser `string`, kein Union — **kein**
Cast nötig, `type: 'page_number_field'` ist als String bereits gültig.)

### 3.13 `src/formats/odt/writer.ts` (ändern) — Feld-Export
`inlineToOdt` (Z. 46–59) bekommt einen neuen Zweig vor der `text`-Prüfung:
```ts
if (node.type === 'page_number_field') {
  const cached = escapeXml(String(node.attrs?.cachedValue ?? '1'))
  const field = `<text:page-number text:select-page="current">${cached}</text:page-number>`
  const styleName = styles.styleNameFor(runPropsFromMarks(node.marks))
  return styleName ? `<text:span text:style-name="${styleName}">${field}</text:span>` : field
}
```

### 3.14 `src/formats/shared/editor/WordEditor.tsx` (ändern) — größter Umbau
1. **Zweite `EditorView`** für den Footer, gemountet nur wenn `doc.content.footer !==
   null`. Gleiches Plugin-Set wie Body (Historie, Keymap, Tabellen, Bilder), jedoch
   **ohne** `createPaginationPlugin()` (Fußzeile ist selbst nicht paginiert).
2. **`activeArea: 'body' | 'footer'`-State**, aktualisiert über `focus`-Listener
   (Capture-Phase) auf `bodyView.dom` bzw. `footerView.dom`.
3. **`reconcileSelectionOnClick`** (Z. 42–53, unverändert in der Logik) wird zusätzlich
   als `mouseup`-Listener an `footerView.dom` gebunden — behebt strukturell Req §7
   Grenzfall 7 (Fokuswechsel zwischen zwei Views ist exakt der Fall, für den dieser Fix
   ursprünglich gebaut wurde, jetzt auf eine zweite Instanz angewendet).
4. **`toggleFooter()`**:
   ```ts
   function toggleFooter() {
     if (doc.content.footer === null) {
       onChangeRef.current({ ...doc.content, footer: emptyDocJSON() })
       return // Fokus-Effekt (siehe Punkt 6) übernimmt das Hineinspringen
     }
     if (isChromeContentEmpty(doc.content.footer)) {
       onChangeRef.current({ ...doc.content, footer: null })
       return
     }
     if (!window.confirm('Die Fußzeile enthält Inhalt. Wirklich entfernen?')) return
     setPendingFooterRestore(doc.content.footer)
     onChangeRef.current({ ...doc.content, footer: null })
   }
   ```
   (`window.confirm` — identisches Muster zu `DocumentWorkspace.tsx` Z. 32, laut Req §2
   Zeile 6 explizit gefordert „analog zum bestehenden Muster".)
5. **Undo-nach-Deaktivieren** (Req §7 Grenzfall 6): `pendingFooterRestore` State
   (`ProseMirrorJSON | null`). Ein `keydown`-Listener auf dem äußeren Workspace-Container
   (nicht auf einer der beiden `EditorView`s, die Ctrl+Z bereits selbst über ihre eigene
   `history()`-Instanz behandeln) fängt `Mod-z` **nur dann** ab, wenn `pendingFooterRestore
   !== null` **und** weder `bodyView` noch `footerView` gerade fokussiert ist (d. h. der
   Fokus liegt noch auf dem gerade geklickten Toggle-Button) — stellt in diesem engen,
   klar definierten Fenster den Fußzeileninhalt wieder her und konsumiert
   `pendingFooterRestore` (auf `null` setzen). Jede andere Aktion (Tippen in Body/Footer,
   erneutes Aktivieren) setzt `pendingFooterRestore` ebenfalls auf `null` zurück — Req
   verlangt nur „Undo **direkt** nach Deaktivieren", kein dauerhafter Undo-Stack.
6. **Fokus-Effekt beim Aktivieren**: `useEffect`, das bei Übergang `footer: null → nicht
   null` (verglichen über eine Ref auf den vorherigen Wert) `footerView.focus()` +
   Cursor an Position 0 setzt — erfüllt Req §3 Punkt 2 „kein zusätzlicher Klick nötig".
7. **`footerHtmlSnapshot`-State** (§2.2.3) wird in `footerView`s
   `dispatchTransaction` nach `view.updateState(...)` aus `footerView.dom.innerHTML`
   aktualisiert.
8. **Toolbar-Aufruf** erweitert:
   ```tsx
   <Toolbar
     view={activeArea === 'footer' && footerViewRef.current ? footerViewRef.current : viewRef.current!}
     footerActive={doc.content.footer !== null}
     onToggleFooter={toggleFooter}
     isFooterFocused={activeArea === 'footer'}
     activeAreaLabel={doc.content.footer !== null ? (activeArea === 'footer' ? 'Fußzeile' : 'Haupttext') : null}
   />
   ```
9. **Variant-Hinweisbanner** (Req §9 Deklarationspflicht): kleine, dismissible Leiste
   oberhalb der Toolbar, sichtbar wenn `doc.content.meta.footerVariantNotice` gesetzt ist
   (aus dem Import übernommen, s. §3.6/§3.8); Text z. B. „Diese Datei enthielt mehrere
   Fußzeilen-Varianten (erste Seite anders / gerade-ungerade) — nur eine wird angezeigt,
   beim Export wird vereinheitlicht." Ein `×`-Button blendet sie aus (kein Datenmodell-
   Zustand nötig, rein visuell pro Sitzung).

### 3.15 Neu: `src/formats/shared/editor/FooterBands.tsx`
Kapselt §2.2 vollständig: Props `{ pageCount: number; footerView: EditorView;
footerHtml: string; activeBandIndex: number; onActivateBand: (index: number, clickEvent:
MouseEvent) => void }`. Rendert `pageCount` `<div>`s mit `style={{ position: 'absolute',
top: footerBandTopPx(i), left:0, right:0, minHeight: FOOTER_BAND_MIN_HEIGHT_PX }}`,
`data-footer-band={i}`, dünne gestrichelte Trennlinie (`border-top: 1px dashed`) und —
nur bei Fokus des Bandes — dezentes Label „Fußzeile" (Req §2 Zeile 2). Enthält die in
§2.2.4 beschriebene Klick-zu-Position-Übersetzung (`mapClickToFooterPos`) als eigene,
separat unit-testbare Funktion (reine DOM-Traversierung, kein React-State).

### 3.16 `src/formats/shared/editor/Toolbar.tsx` (ändern)
1. `ToolbarProps` erweitert um `footerActive: boolean`, `onToggleFooter: () => void`,
   `isFooterFocused: boolean`, `activeAreaLabel: string | null`.
2. **Neue Komponente `FooterIcon`** (SVG statt Unicode/Emoji, Req §2 Zeile 1 verlangt
   „eigene, klar erkennbare SVG-Ikone"):
   ```tsx
   function FooterIcon() {
     return (
       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
         <rect x="3" y="3" width="18" height="18" rx="1.5" />
         <line x1="3" y1="16" x2="21" y2="16" strokeDasharray="2 2" />
         <line x1="7" y1="19.5" x2="17" y2="19.5" />
       </svg>
     )
   }
   ```
3. **Neuer Toggle-Button** (eigene Gruppe am Ende der Toolbar):
   ```tsx
   <button
     type="button"
     title={footerActive ? 'Fußzeile ausblenden' : 'Fußzeile einblenden'}
     aria-label={footerActive ? 'Fußzeile ausblenden' : 'Fußzeile einblenden'}
     aria-pressed={footerActive}
     onMouseDown={(e) => { e.preventDefault(); onToggleFooter() }}
     className={/* aktiv/inaktiv analog MarkButton, s. bestehendes Muster Z. 53–57 */}
   >
     <FooterIcon />
   </button>
   ```
4. **Neuer Button „Seitenzahl einfügen"**, nur sinnvoll aktivierbar bei Footer-Fokus
   (Req §2 Zeile 5 / `seitenzahl-einfuegen-req.md` §3.15 „kein Klick, der ergebnislos
   bleibt"):
   ```tsx
   <button
     type="button"
     title={isFooterFocused ? 'Seitenzahl einfügen' : 'Erst in die Fußzeile klicken, um eine Seitenzahl einzufügen'}
     aria-label="Seitenzahl einfügen"
     disabled={!isFooterFocused}
     onMouseDown={(e) => { e.preventDefault(); run(view, insertPageNumberField()) }}
     className="… disabled:opacity-40 disabled:cursor-not-allowed"
   >
     <PageNumberIcon />
   </button>
   ```
   `disabled` verhindert nativ den wirkungslosen Klick (identisches Muster zu
   `ausschneiden-code.md` §3.2, dort bereits im Repo etabliert, sobald jenes Feature
   umgesetzt ist — unabhängig davon hier ohnehin die einfachste korrekte Lösung).
5. **Statusanzeige „wo bin ich"** (Req §2 Zeile 7, nice-to-have — **wird umgesetzt**,
   nicht nur dokumentiert, da mit < 5 Zeilen Aufwand realisierbar):
   ```tsx
   {activeAreaLabel && (
     <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto pr-1">
       Bearbeite: {activeAreaLabel}
     </span>
   )}
   ```

### 3.17 `src/index.css` (ändern)
Neue Regeln, ergänzt am Dateiende:
```css
.page-number-field {
  background: rgba(37, 99, 235, 0.12);
  border-radius: 2px;
  padding: 0 2px;
}

.footer-band {
  transition: outline-color 0.1s ease;
}
.footer-band:focus-within {
  outline: 1px dashed #9ca3af;
  outline-offset: 2px;
}
.footer-band-label {
  font-size: 11px;
  color: #6b7280;
}
```
(Bewusst **keine** `dark:`-Variante — konsistent mit bestehendem Muster: die editierbare
Papier-Fläche selbst ist immer hell/Druckseiten-artig, unabhängig vom App-Dark-Mode,
identisch zur bestehenden Behandlung von `.ProseMirror { color: #111827 }`, Z. 23–27.)

### 3.18 `src/app/DocumentWorkspace.tsx` — **keine Änderung**
`onChange`-Vertrag bleibt unverändert (`(content: WordDocumentContent) => void`); alle
neuen Zustände (Footer-Aktivierung, Feld-Einfügen, Undo-Restore) laufen bereits über den
bestehenden `onChange`-Callback aus `WordEditor.tsx`. Der bestehende
„ungespeicherte Änderungen"-Dialog (Z. 32) greift automatisch auch für
Footer-Änderungen, da `dirty: true` bereits bei jedem `onChange`-Aufruf gesetzt wird
(Z. 69, unverändert).

---

## 4. Undo/Redo- und Selection-Sync-Analyse (Req §4 letzter Absatz, §7 Grenzfall 6/7)

- **Getrennte Historien:** `history()` (Z. 70 in `WordEditor.tsx`, unverändert
  übernommen für die neue Footer-`EditorState`) ist pro `EditorState`-Instanz
  eigenständig — zwei separate `EditorView`s mit je eigenem `history()`-Plugin haben
  **strukturell** getrennte Undo-Stacks, ohne dass das explizit erzwungen werden müsste.
  Erfüllt Req §4 letzter Absatz ohne Zusatzcode; **muss** aber per Test verifiziert
  werden (§6.3), da es im bisherigen Code keine Präzedenz für zwei Instanzen gibt (Req
  formuliert das exakt so).
- **Aktivieren/Deaktivieren ist kein PM-Transaktions-Schritt:** Das ist der Grund, warum
  §3.14 Punkt 5 einen eigenen, engen Reparatur-Mechanismus statt einer generischen
  Lösung braucht — das Datenmodell-Feld `footer` lebt außerhalb jeder `EditorState`.
- **Selection-Sync-Regressionsfall (Req §7 Grenzfall 7):** identischer Mechanismus wie
  der bereits gelöste Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, jetzt auf eine
  zweite Instanz angewendet (§3.14 Punkt 3). Pflicht-Regressionstest in §6.3, analog zu
  `tests/e2e/selection-regression.spec.ts`, aber mit Footer↔Body statt Klick-innerhalb-
  derselben-Instanz.

---

## 5. Grenzfälle-Mapping (Req Abschnitt 7, vollständig)

| # | Grenzfall | Lösung | Beleg/Test |
|---|---|---|---|
| 1 | Leere Fußzeile beim Export bleibt aktiv | Bereits korrekt im Writer (§1.5), keine Änderung | §6.2 neuer Unit-Test (Regressionsbeweis) |
| 2 | Deaktivieren mit Bestätigung, Abbrechen ändert nichts | `window.confirm`-Guard in `toggleFooter()` (§3.14.4) | §6.3 E2E-Test |
| 3 | Mehrseitig: Fußzeile auf jeder Seite | `FooterBands` + Klon-Mechanismus (§2.2) | §6.3 E2E-Test (mehrseitiges Dokument) |
| 4 | Manueller Seitenumbruch → Fußzeile unverändert auf beiden Seiten | Fußzeile ist unabhängig vom Body-Inhalt, Bänder folgen `pageCount` | §6.3 (sobald `seitenumbruch`-Node existiert — aktuell **nicht vorhanden**, s. u.) |
| 5 | Fußzeileninhalt größer als Rand | Band wächst mit Inhalt, kein `overflow:hidden` (§2.1) | Manueller visueller Test + Kommentar in §2.1 |
| 6 | Undo direkt nach Deaktivieren | `pendingFooterRestore` + enger `keydown`-Guard (§3.14.5) | §6.3 E2E-Test |
| 7 | Fokuswechsel Footer↔Body | Zweiter `mouseup`-Listener (§3.14.3) | §6.3 Pflicht-Regressionstest |
| 8 | Formatvorlage „Überschrift" in Fußzeile | Schema-Wiederverwendung, `heading` ist bereits Teil von `block`, keine Sperre nötig | §6.2 Unit-Test (Rundreise mit `heading` in footer) |
| 9 | „Erste Seite anders"/gerade-ungerade beim Import | Deterministische Wahl + Hinweisbanner (§3.6/§3.8/§3.14.9) | §6.2 Unit-Test mit `headerFooter.docx` |
| 10 | Cross-Format-Feldverlust | `page_number_field` fällt beim Cross-Format-Schreiben nie auf reinen Text zurück (beide Writer kennen den Typ nativ); nur bei **unbekannten** Feldtypen (z. B. `text:page-count`) wird auf Text zurückgefallen (§3.12) | §6.2 Cross-Format-Unit-Test |
| 11 | Datei ohne Fußzeile, aber mit Kopfzeile | `footer`/`header` sind unabhängige Felder, Reader/Writer fassen sie separat an (unverändert) | §6.2 Regressionstest mit `Headers.docx`/`ThreeColHead.docx` |
| 12 | Manueller Seitenumbruch in Fußzeile | **Nicht anwendbar** — es existiert aktuell **kein** Seitenumbruch-Node im Schema (verifiziert, Volltextsuche ohne Treffer). Dokumentiert als offener Folgepunkt für `seitenumbruch-req.md`, sobald jener Node existiert (§10). | — |

---

## 6. Tests

### 6.1 Neu: `src/formats/shared/editor/__tests__/pageBands.test.ts`
- `footerBandTopPx(0)` === `PAGE_CONTENT_HEIGHT_PX`.
- `footerBandTopPx(1)` === `PAGE_CONTENT_HEIGHT_PX + (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX)`.
- Monoton steigend für `i = 0..5`.

### 6.2 Neu/erweitert: Reader/Writer-Unit-Tests
**`src/formats/docx/__tests__/roundtrip.test.ts`** (ergänzen, bestehende Tests bleiben
unverändert grün — Regressionsschutz):
- Rundreise: `page_number_field` in Fußzeile (mit und ohne Marks) → bleibt als
  `page_number_field`-Node erhalten, `cachedValue` beliebig, nicht als literaler Text „1"
  interpretiert.
- Rundreise: `page_number_field` mit `strong`+`textColor`-Marks → beide Marks erhalten.
- Regressionstest **explizit** für den in §1.6/§3.10 behobenen Bug: `w:fldSimple`- **und**
  `w:fldChar`-Quadruple-XML (Rohstring, nicht über den eigenen Writer erzeugt) direkt an
  `readDocx` übergeben (analog zum Muster in `tests/e2e/docx.spec.ts`s
  `buildSampleDocx()`, hier aber als reiner Unit-Test mit `JSZip` in Node) → beide Formen
  ergeben `page_number_field`, nicht statischen Text „1".
- Regressionstest für §1.7: `headerFooter.docx`-artiges `sectPr` mit `even`/`default`/
  `first`-Varianten (synthetisch konstruiert) → geladene Fußzeile entspricht der
  `default`-Variante, `meta.footerVariantNotice` ist gesetzt.
- Regressionstest für §1.6: synthetisches `footer1.xml` mit Bild + eigener
  `footer1.xml.rels` (Ziel weicht bewusst von `document.xml.rels`s Eintrag für dieselbe
  ID ab) → Bild wird korrekt aufgelöst (nicht `styles.xml`-Inhalt als Bild).
- Neuer Export-Test: Fußzeile mit Bild → Zip enthält `word/_rels/footer1.xml.rels` mit
  korrektem `Type=".../image"`-Eintrag.
- Bestehender Testblock „round trip: header, footer, and metadata" (Z. 278–308) bleibt
  unverändert grün (Regressionsschutz für den Grundfall).

**`src/formats/odt/__tests__/roundtrip.test.ts`** (ergänzen):
- Rundreise `page_number_field` (mit/ohne Marks) via `<text:page-number>`.
- Regressionstest: `<text:page-count>` wird **nicht** als `page_number_field`
  interpretiert, aber Textinhalt bleibt erhalten (kein stiller Verlust).
- Regressionstest für §1.8: synthetisches `styles.xml` mit zwei Master-Pages
  (`next-style-name`-Kette wie in §1.8 beschrieben) → geladene Fußzeile stammt aus der
  **Kettenziel**-Master-Page, `meta.footerVariantNotice` gesetzt.

**Neue Fixture-Sweep-Erweiterung** (in `external-fixtures.test.ts` beider Formate,
zusätzlich zum bestehenden reinen Crash-Test):
- Für jede Datei aus Req §8.2-Tabelle: Import → Fußzeilentext (falls vorhanden)
  extrahieren und in einer Snapshot-artigen Assertion festhalten → unverändert
  exportieren → reimportieren → Fußzeilentext identisch. Für `NoHeadFoot.docx`:
  `footer === null` nach Import **und** nach Rundreise.
- `EmptyDocumentWithHeaderFooter.docx`: `footer !== null`, Body ist leer.
- Cross-Format je einer DOCX- und einer ODT-Datei aus der Tabelle (Req §8.2 Testfall 2).

### 6.3 Neu: `tests/e2e/footer.spec.ts`
Analog zu `tests/e2e/selection-regression.spec.ts`/`docx.spec.ts` (echte Browser-
Interaktion). Deckt DoD-Punkte 1, 2, 6, 8 aus Req §10:

1. Neues Dokument → Toolbar-Button „Fußzeile einblenden" klicken → Bereich erscheint,
   `aria-pressed="true"`, Cursor ist sofort im Footer (direkt tippen ohne Klick).
2. Text tippen, Fett anwenden (Toolbar wirkt auf Footer, da fokussiert) → sichtbar
   formatiert im Footer, **nicht** im Body.
3. **Pflicht-Regressionstest** (Req §7 Grenzfall 7, DoD Punkt 6): Text in Footer tippen →
   in Body klicken → weiter tippen → beide Bereiche behalten exakt ihren jeweiligen,
   unveränderten Inhalt (kein Übergriff).
4. Seitenzahl-Feld: Cursor in Footer, Button „Seitenzahl einfügen" (bei Body-Fokus
   vorher: `toBeDisabled()`) → sichtbares Feld-Element (`.page-number-field`) erscheint;
   danach Export → `document.xml`/`content.xml` im Zip enthält
   `w:fldChar`/`text:page-number` (XML-Inspektion, nicht nur Sichtprüfung — erfüllt DoD
   Punkt 3).
5. Export → Re-Import (echter Download/Upload-Zyklus wie in `docx.spec.ts`) → Footer-Text
   weiterhin sichtbar, Toggle-Button weiterhin aktiv.
6. Deaktivieren einer befüllten Fußzeile → `window.confirm`-Dialog (Playwright:
   `page.on('dialog', ...)`) → Abbrechen lässt Zustand unverändert; erneuter Versuch +
   Bestätigen → Bereich verschwindet, `aria-pressed="false"`.
7. Direkt danach `ControlOrMeta+z` → Fußzeileninhalt kehrt zurück (Req Grenzfall 6).
8. Mehrseitiges Dokument (viel Text in Body tippen, bis `pageCount > 1` — Threshold
   experimentell ermitteln oder über eine Testhilfsfunktion, die direkt sehr langen Text
   einfügt) → Footer-Text erscheint auf **jeder** sichtbaren Seite (`page.locator(
   '[data-footer-band]')`-Anzahl > 1, alle mit identischem Text).
9. Klick auf ein Footer-Band einer **nicht-ersten** Seite → Fokus + Cursor landen im
   (einzigen) Footer, Tippen fügt an der erwarteten Stelle ein (deckt §2.2.4 ab, inkl.
   der dokumentierten Fallback-Vereinfachung).

### 6.4 Bestehende Tests — Regressionsschutz
`src/formats/docx/__tests__/roundtrip.test.ts` und
`src/formats/odt/__tests__/roundtrip.test.ts` (Testblock „header, footer, and
metadata") sowie beide `external-fixtures.test.ts` (reiner Crash-Sweep) müssen nach
allen Änderungen weiterhin grün sein — keiner der oben beschriebenen Fixes ändert
bestehendes, bereits getestetes Verhalten (nur bislang **unspezifiziertes** Verhalten
wie „welche von mehreren Referenzen gewinnt" wird jetzt deterministisch).

---

## 7. Abnahmekriterien — Abgleich mit Req Abschnitt 10

| # | DoD-Punkt | Abgedeckt durch |
|---|---|---|
| 1 | Echter Playwright-Klick schaltet Bereich sichtbar ein/aus | §6.3 Testfall 1/6, Architektur §2 |
| 2 | Editierfunktionen per echter Interaktion | §6.3 Testfall 2, wiederverwendet bestehende Toolbar-Mechanik (§3.16) |
| 3 | Seitenzahl-Feld als echtes Feld, XML-Inspektion | §6.3 Testfall 4, §3.10–3.13 |
| 4 | Alle Testfälle Req §8.1 grün | §6.2 (Unit) + §6.3 (E2E) |
| 5 | Alle Testfälle Req §8.2 grün, inkl. „erste Seite anders" ohne Regressionsverlust | §6.2 Fixture-Sweep-Erweiterung, §3.6/§3.8 Fixes |
| 6 | Fokuswechsel-Regressionstest dauerhaft in Suite | §6.3 Testfall 3 |
| 7 | Kein stiller Fehlschlag bei nicht unterstützten Kombinationen | Hinweisbanner §3.14.9, disabled-Button-Muster §3.16.4 |
| 8 | E2E deckt Aktivieren/Tippen/Formatieren/Seitenzahl/Export/Reimport/Deaktivieren-mit-Bestätigung | §6.3 vollständig |

---

## 8. Nicht unterstützte Varianten — Umsetzung der Deklarationspflicht (Req Abschnitt 9)

| Variante | Status nach diesem Plan | Umsetzung der Deklarationspflicht |
|---|---|---|
| „Erste Seite anders" | Weiterhin nicht editierbar über UI | Deterministische Wahl (§3.6/§3.8) + sichtbarer Hinweisbanner (§3.14.9) statt stillem Verschwinden |
| Gerade/ungerade Seiten | Weiterhin nicht editierbar über UI | Gleicher Mechanismus wie oben (`w:type="even"`/„-left"-Master-Page zählt als „hasVariants"). |
| Mehrere Abschnitte, je eigene Fußzeile | Nur der **erste** Abschnitt wird berücksichtigt (§3.6b, neu deterministisch statt zufällig „letzter") | Dokumentiert hier + Code-Kommentar in `reader.ts` (§3.6b) |

Diese drei Punkte bleiben laut Req §9 explizit **offen und nicht blockierend** für die
Abnahme des Grundfeatures — dieser Plan verbessert lediglich ihre Determinismus- und
Transparenz-Eigenschaften (deterministische Wahl statt XML-Reihenfolgen-Zufall,
sichtbarer Hinweis statt stillem Verhalten), baut sie aber nicht vollständig.

---

## 9. Offene Risiken / Spike-Punkte

- **`marks: '_'` auf einem Atom-Node** (§3.1): neues Terrain im Schema dieses Projekts.
  Muss früh in der Implementierung per kurzem manuellem Test verifiziert werden
  (`toggleMark` auf `NodeSelection` eines `page_number_field`). Fallback bereits in
  §3.3 eingebaut (Marks werden beim Einfügen übernommen, unabhängig vom Ausgang dieses
  Spikes).
- **Klick-zu-Position-Mapping auf Klon-Bändern** (§2.2.4): funktional beschrieben,
  aber die genaue Robustheit von `caretRangeFromPoint`/Kindindex-Pfad-Matching bei
  verschachtelten Marks ist nicht im Voraus bewiesen. Dokumentierter Fallback
  („Cursor ans Ende") deckt den Fehlerfall ab, sollte aber durch §6.3 Testfall 9 in der
  Praxis mit realistischem, formatiertem Inhalt verifiziert werden.
- **`pagination.ts`-Doppelmessung** (§3.4): pragmatisch zweite Höhenmessung statt
  Refactor von `measureAndBuildDecorations`, um Änderungsradius klein zu halten — kleine,
  unabhängige Aufräumarbeit für später (Performance-Auswirkung bei sehr langen Dokumenten
  nicht separat gemessen, sollte aber wegen `requestAnimationFrame`-Drosselung im
  bestehenden Code unkritisch sein).
- **Sichtbare Überlappung bei sehr großem Fußzeileninhalt** (§2.1, Req Grenzfall 5): kein
  Code-Fix vorgesehen, nur dokumentierte Einschränkung der Hintergrundbild-Illusion —
  falls das im Review als nicht akzeptabel bewertet wird, ist eine echte
  Pro-Seite-Container-Refaktorierung (Req §6 Variante c) nötig, die außerhalb dieses
  Plans liegt.
- **Abhängigkeit zu `seitenumbruch-req.md`** (Req Grenzfall 12): aktuell nicht
  anwendbar, da kein Seitenumbruch-Node existiert (verifiziert). Sobald jenes Feature
  einen Node einführt, muss dessen Schema/Keymap explizit prüfen, ob der aktuelle Fokus
  im Footer liegt, und die Einfügung dort verhindern/abfangen — als Nachfolgepunkt hier
  vermerkt, nicht Teil dieses Plans.
- **`kopfzeile-bearbeiten-code.md` existiert noch nicht**: Die hier gebaute
  Infrastruktur (`FooterBands`, Reparenting-Mechanismus, `activeArea`-State in
  `WordEditor.tsx`, Toolbar-Kontextbindung) ist bewusst so benannt/geschnitten
  (`FooterBands` statt z. B. `ChromeBands` generisch), dass ein künftiger
  Kopfzeilen-Plan sie **kopieren/parallelisieren**, nicht zwingend generalisieren muss —
  eine Generalisierung (z. B. gemeinsame `useChromeEditor(area: 'header'|'footer')`
  Hook) wäre eine sinnvolle, aber nicht in diesem Plan vorweggenommene Refaktorierung,
  sobald beide Features nebeneinander existieren.
- **`seitenzahl-einfuegen-code.md` existiert noch nicht**: Schema-Node, Reader- und
  Writer-Logik für `page_number_field` werden **hier** vollständig gebaut (§3.1,
  3.10–3.13), weil `fusszeile-bearbeiten-req.md` §5/§10.3 sie zur eigenen Abnahme macht.
  Ein künftiger `seitenzahl-einfuegen-code.md`-Plan muss das als bereits erledigt
  referenzieren (insbesondere für die Kopfzeile, sobald diese existiert — der Feld-Node
  selbst ist bereits header-tauglich, da schema-generisch) und darf die Node-Definition
  nicht ein zweites Mal einführen.
