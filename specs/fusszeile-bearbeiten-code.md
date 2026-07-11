# Umsetzungsplan: Feature „Fußzeile bearbeiten"

Gegenstück zu `specs/fusszeile-bearbeiten-req.md`. Beschreibt den **tatsächlich am Code
verifizierten** Ist-Stand (Stichtag 2026-07-04, **erneut Datei für Datei nachgeprüft am
2026-07-05**, Repo `E:\docs`) und die dateigenauen Änderungen. Alle Fundstellen wurden durch
Lesen des aktuellen Quellcodes **und** durch Auspacken der realen Fixtures geprüft;
Zeilennummern sind auf diesen Stand aktualisiert. **Ergebnis der Nachprüfung 2026-07-05:** Alle
Reader-/Writer-/Schema-/Pagination-/Toolbar-/Workspace-Fundstellen stimmen zeilengenau; einzig
`WordEditor.tsx` ist seit Erstschrift um +8 Zeilen gewachsen (Cut/Copy-Features, §1.3) — die
dortigen Zeilennummern wurden entsprechend korrigiert. Maßgeblich ist immer der **Symbolname**
(Funktion/Node/Attribut), die Zeile kann pro Pipeline-Durchlauf driften.

> **Wichtige Korrektur gegenüber der vorigen Fassung dieses Plans (14:02).** Die frühere
> Fassung wurde gegen eine **ältere** `fusszeile-bearbeiten-req.md` geschrieben und ist in
> drei Punkten überholt; diese Fassung korrigiert das:
> 1. **Abschnittsnummern der Req.** Die aktuelle Req (22:04) ist neu gegliedert: Layout =
>    **§4** (vorher §6), Grenzfälle = **§5** (vorher §7), Rundreise/Fixtures = **§6/§6.3**
>    (vorher §8.1/§8.2), Deklarationspflicht = **§7** (vorher §9), Testplan = **§8**,
>    Definition of Done = **§9** (vorher §10), Offene Fragen = **§10** (vorher §11). Alle
>    Verweise unten sind auf diese aktuelle Nummerierung gezogen.
> 2. **Seitenzahl-Feld ist NICHT Teil dieses Features.** Die aktuelle Req nimmt das
>    Seitenzahl-Feld ausdrücklich aus der Abnahme heraus (§1 Zeile 7, §3.7; §0.2 nennt das
>    explizit eine „Korrektur gegenüber einer früheren Fassung … die das Feld als Teil der
>    Fußzeilen-Abnahme forderte"). Die vorige Fassung dieses Plans baute dennoch den
>    kompletten `page_number_field`-Node samt Einfüge-Kommando, DOCX-`fldChar`- und
>    ODT-`text:page-number`-Writer und Toolbar-Button. **Das ist Scope des Nachbar-Slugs
>    `seitenzahl-einfuegen` (`seitenzahl-einfuegen-req.md`, Geltungsbereich Z. 14–18) und
>    wird hier vollständig entfernt.** Für die Fußzeilen-Abnahme genügt Import-Robustheit —
>    und die ist bereits erfüllt (§1.9): Beide Reader erhalten den **Textwert** eines
>    vorhandenen Seitenzahl-Feldes schon heute als statischen Text.
> 3. **Mehrere überholte Code-Aussagen** der vorigen Fassung sind gegen den aktuellen Code
>    nachweislich falsch und werden unten je als Korrektur markiert (SVG-Icons existieren
>    bereits; der ODT-Reader verwirft `text:page-number` **nicht**; `w:fldSimple` wird
>    **nicht** still verschluckt; der geplante Multi-Section-Umbau hätte Req §5.10
>    **regressiert**).

---

## 0. Kurzfassung der Entscheidungen (Abgleich mit Req §10, Offene Fragen)

| # | Req §10 Frage | Entscheidung dieses Plans |
|---|---|---|
| 1 | Layout-Integration (Req §4) | **Variante (a)**, pragmatische Ein-Instanz-Ausprägung: pro berechneter Seite ein absolut positioniertes „Fußzeilen-Band"; **eine** editierbare `EditorView` wird per DOM-Reparenting in das Band der zuletzt fokussierten Seite verschoben, die übrigen Bänder zeigen einen synchron gehaltenen, nicht editierbaren HTML-Klon (§2). **Dokumentierter Rückfall:** Erweist sich das Reparenting/Klonen in der Umsetzung als instabil, gilt Variante (b) (Fußzeile nur am Dokumentende) als explizit vermerkte Einschränkung — Req §9 DoD-Punkt 2 lässt das ausdrücklich zu. |
| 2 | Leere, aber aktivierte Fußzeile beim Export (Req §5.1) | **Bleibt erhalten.** **Kein** Writer-Änderungsbedarf — beide Writer tun das bereits korrekt (verifiziert, §1.5). Die UI muss nur beim Deaktivieren wirklich `null` und beim Aktivieren wirklich `emptyDocJSON()` setzen (§3.10). Import-Asymmetrie (Reader macht leere Fußzeile zu `[emptyParagraph()]`, Req §0.1/F) ist damit **konsistent**: aktiv-leer bleibt aktiv-leer über die Rundreise. |
| 3 | Auswahlregel bei mehreren Referenzen/Master-Pages (Req §0.3/2, §5.9) | Reader von „zufällig erstes Element in Dokumentreihenfolge" auf **deterministisch, dokumentiert bevorzugt** umstellen (DOCX: `w:type="default"`, §3.6; ODT: Ziel einer `next-style-name`-Kette, §3.8) + sichtbarer Hinweis. Korrektheits-, keine Feature-Erweiterung. |
| 4 | Reader-Lücken (Req §0.3/1, §0.3/5) | **Bild-Rels (§0.3/1): behoben** — verifizierter, konkreter Bug (§1.6), Fix in §3.6c/§3.7. **Seitenzahl-Feld (§0.3/5): als dokumentierte Einschränkung** — Reader erhält bereits den Textwert als statischen Text (§1.9); die „Feld-Natur" (Auto-Aktualisierung) geht verloren und wird erst durch `seitenzahl-einfuegen` nachgerüstet. Kein Datenverlust, daher hier keine Code-Änderung. |
| 5 | Gemeinsamer Modus mit `kopfzeile-bearbeiten` (Req §10 Frage 5) | **Zwei getrennte Buttons.** Die neue Infrastruktur (`FooterBands`, Reparenting, `activeArea`-State, Toolbar-Kontextbindung) wird so geschnitten, dass ein späteres, spiegelbildliches Kopfzeilen-Feature sie wiederverwenden/parallelisieren kann, ohne dass dieser Plan das mitbaut. |
| — | **Seitenzahl-Feld** | **Ausdrücklich außerhalb dieses Plans** (Req §1 Zeile 7, §3.7). Gehört zu `seitenzahl-einfuegen`. Dieser Plan (a) verbaut den künftigen Feld-Node nicht (Schema bleibt offen, `validateDocument` bleibt tolerant, §1.2) und (b) verlässt sich darauf, dass ein importiertes Feld seinen Text bereits behält (§1.9). |

**Zusätzlich in diesem Plan behoben, durch Code-/Fixture-Verifikation gefunden (nicht in
der Req namentlich, aber von Req §0.3/1, §5.9, §5.13, §9 DoD-Punkt 10 abgedeckt):**

- **DOCX-Bild-Relationship-Scoping-Bug** (§1.6): Bilder in Kopf-/Fußzeilen werden beim
  Import über die **falsche** `.rels`-Datei aufgelöst. An `headerPic.docx` verifiziert:
  `word/_rels/header1.xml.rels` bildet `rId1 → media/image1.jpeg`, aber
  `word/_rels/document.xml.rels` bildet **denselben** `rId1 → styles.xml`. Der Reader nutzt
  für Kopf-/Fußzeilen fälschlich `documentRels` → er würde `styles.xml` als Bild laden.
  Fix in §3.6c (Reader) und §3.7 (Writer, spiegelbildlich).
- **`headerFooter.docx` (Req §6.3 „Basisfall") lädt die falsche Fußzeilen-Variante**
  (§1.7): Sein `sectPr` enthält `footerReference` in der Reihenfolge `even`(rId6) →
  `default`(rId7) → `first`(rId9); der Reader nimmt via `firstChildNS` die **`even`**-Variante.
  Für genau die von Req §6.3 als ersten Testfall genannte Datei zeigt die App heute also die
  Gerade-Seiten-Fußzeile. Fix in §3.6a.
- **ODT-Mehrfach-Master-Page verifiziert** (§1.8): `HeaderFirstAndEvenPageEnabled_MSO15.odt`
  hat zwei Master-Pages `MP0` und `MPF0` (`style:next-style-name="MP0"`); `content.xml`
  startet mit `MPF0`. Keine heißt „Standard". Korrigierte, verifizierte Heuristik in §3.8.

---

## 1. Verifizierter Ist-Stand (Codebelege, Stand 2026-07-04)

### 1.1 Datenmodell — `src/formats/shared/documentModel.ts` (22 Zeilen)
`WordDocumentContent` (Z. 3–8) hat `footer: ProseMirrorJSON | null` (Z. 6);
`createBlankWordDocument()` (Z. 14–21) setzt `footer: null` (Z. 18). `emptyDocJSON()`
(Z. 10–12) liefert `{ type:'doc', content:[{ type:'paragraph', attrs:{align:'left'} }] }`
— die Vorlage für eine neu aktivierte, leere Fußzeile. **Kein neues Datenmodell-Feld
nötig** (Req §3.8). `meta` ist heute `{ title: string }` (Z. 7) — für den Varianten-Hinweis
optional zu erweitern, siehe §3.9.

### 1.2 Schema — `src/formats/shared/schema.ts` (202 Zeilen)
Nodes: `doc, paragraph, heading, text, hard_break, image, unsupported_block, bullet_list,
ordered_list, list_item` + `tableNodes(...)` (Z. 13–155). Marks: `strong, em, underline,
strike, textColor, highlight` (Z. 157–196). **Kein** Feld-/Seitenzahl-Node. Eine Fußzeile
kann also statischen Text, Bilder, Tabellen, Listen, Formatierung enthalten — **das ist für
dieses Feature ausreichend** (Req §3.2). `unsupported_block` (Z. 92–113, `content: 'block+'`)
ist der Auffang-Node. **Konsequenz für den Scope:** Der Fußzeilen-Editor braucht **keine**
Schema-Änderung. Ein späterer `page_number_field`-Node (Slug `seitenzahl-einfuegen`) lässt
sich additiv ergänzen, ohne dieses Feature zu berühren.

**Harte Randbedingung** (`src/formats/shared/validateDocument.ts`,
`assertLoadableDocument()` Z. 12): Z. 16 ruft `wordSchema.nodeFromJSON(content.footer).check()`
für jede nicht-`null`-Fußzeile beim Laden auf. Der Fußzeilen-Editor darf also **nie** ein
`footer`-JSON erzeugen, das nicht schemakonform ist — was gegeben ist, solange er dasselbe
`wordSchema` verwendet.

### 1.3 Editor-Kern — `src/formats/shared/editor/WordEditor.tsx` (186 Zeilen)
Genau **eine** `EditorView` (`new EditorView(...)` Z. 122), initialisiert aus
`wordSchema.nodeFromJSON(doc.content.body)` (Z. 79). Rückschreibvertrag: `dispatchTransaction`
(Z. 125–132) ruft `onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() })`
(Z. 129, im `if (tr.docChanged)`-Zweig) — ersetzt **nur** `body`, reicht `header`/`footer` per
Spread unverändert durch. Das ist zugleich (a) der Grund, warum eine importierte Fußzeile den
Export unbeschadet übersteht, und (b) der Beweis, dass es heute **keinen** Code-Pfad gibt, der
`footer` verändert. `header`/`footer` werden in der ganzen Datei nicht referenziert.
`reconcileSelectionOnClick` (Z. 43–50, unverändert) korrigiert stale Selektionen nach Klick;
heute nur an die eine `view.dom` gebunden (mousedown/mouseup Z. 154–155, Drag-Schwelle
`CLICK_DRAG_THRESHOLD_PX` Z. 141–155). Der Fußzeilen-Editor setzt genau am `onChange`-Vertrag
an (`{ ...doc.content, footer }`, §3.10).

**Aktualisierung gegenüber der Erstschrift dieses Plans (verifiziert 2026-07-05):**
`WordEditor.tsx` ist seither um die Ausschneiden/Kopieren-Features gewachsen (+8 Zeilen,
Commits `9f8fa03`/`d65cde0`) — daher die nach unten verschobenen Zeilennummern (Symbolnamen
bleiben maßgeblich). **Für den Fußzeilen-Editor relevant:** Der Body-Editor bindet heute
**zusätzlich** den `clipboardTextSerializer` als `EditorView`-Prop (Z. 124) sowie im Keymap
`Enter → splitListItem` (Z. 96), `Shift-Enter → insertHardBreak()` (Z. 97), `Mod-b/i/u`
(Z. 98–100) und `Shift-Delete → cutSelection({ onCutBlocked: setCutError })` (Z. 106); ein
`cutError`-State + `useAutoDismiss` (Z. 57–63) speist die rote Fehlermeldung der Toolbar.
`forceRender((n) => n + 1)` läuft in `dispatchTransaction` **außerhalb** des
`docChanged`-Guards (Z. 131), damit die Toolbar ihre Aktiv-Zustände auch bei reiner
Selektionsänderung nachzieht. **Diese komplette Ausstattung muss die zweite (Fußzeilen-)
`EditorView` spiegeln** (§3.10.1/§3.10.7), sonst fehlen in der Fußzeile Ausschneiden,
Kopieren-Serializer und Formatier-Tastaturkürzel entgegen der Funktionsparität-Forderung
Req §3.2.

### 1.4 Toolbar — `src/formats/shared/editor/Toolbar.tsx` (297 Zeilen)
`ToolbarProps` ist `{ view: EditorView; cutError: string | null; setCutError: (m) => void }`
(Z. 22–26). **Korrektur gegenüber der vorigen Fassung dieses Plans:** Die Toolbar verwendet
**bereits ein eingebettetes SVG-Icon** (`ScissorsIcon`, Z. 33–53) — die Behauptung „kein
`<svg>` im Repo" ist überholt. Für den neuen Fußzeilen-Button ist also **kein neues Muster**
nötig, sondern `ScissorsIcon` (inkl. `viewBox`, `aria-hidden`, `focusable="false"`) ist die
zu kopierende Vorlage; das erfüllt Req §1 Zeile 1 (eingebettetes SVG, kein Emoji) ohne
Zusatzrisiko. Die übrigen Buttons nutzen `MarkButton` (Z. 55–89, mit `aria-pressed`) und
`AlignButton` (Z. 91–111) — dieselbe Struktur, die der Toggle-Button übernimmt. Kein Treffer
für „Fußzeile"/„footer" in der Datei. Die Toolbar kennt heute genau **eine** `view` — für die
Kontextbindung an die fokussierte Instanz muss diese Prop dynamisch werden (§3.12).

### 1.5 Writer behandeln eine aktive, aber leere Fußzeile bereits korrekt (keine Änderung nötig)
`src/formats/docx/writer.ts`, `writeDocx` (Z. 252): `const footer = doc.footer ...` (Z. 259),
`if (footer) { footerXml = buildHeaderFooterXml('ftr', ...) ... }` (Z. 269–273). Der Test ist
`if (footer)` — ein Objekt `{ type:'doc', content:[{ type:'paragraph', ... }] }` (aktiv-leer)
ist **truthy** → `footer1.xml` wird mit leerem Absatz geschrieben, nicht verworfen. Analog
`src/formats/odt/writer.ts`: `footerXml = footer ? blocksToOdt(...) : null` (Z. 272);
`buildStylesXml` schreibt `<style:footer>` bei jedem `footerXml !== null` (Z. 228). **Req §5.1
/ §10 Frage 2 ist damit schon durch den bestehenden Writer gelöst** — keine Writer-Änderung,
nur der UI-Vertrag (§3.10) muss `null` vs. Objekt sauber setzen.

### 1.6 Verifizierter Bug: DOCX-Bild-Relationships in Kopf-/Fußzeile falsch aufgelöst
Verifiziert durch Auspacken von `tests/fixtures/external/docx/headerPic.docx`:
- `word/_rels/header1.xml.rels`: `rId1 → media/image1.jpeg` (Typ `.../image`).
- `word/_rels/document.xml.rels`: **derselbe** `rId1 → styles.xml` (Typ `.../styles`).
- `word/header1.xml`: `r:embed="rId1"`.

`src/formats/docx/reader.ts` liest nur `documentRels = readRelationships(zip,
'word/_rels/document.xml.rels')` (Z. 501) und reicht **dieselbe** Map als `imageRels` an
`readBodyChildren` für Body (Z. 503), Header (Z. 520) **und** Footer (Z. 529). Für ein Bild
in einer echten Kopf-/Fußzeile liefert `imageRels.get('rId1')` daher das **falsche** Ziel
(hier `styles.xml`); `paragraphToBlocks` setzt `src` auf dieses Ziel (Z. 268–269),
`resolveImageSources` (Z. 442–462) lädt dann `word/styles.xml` und labelt ihn als
`data:image/xml;base64,...` — **stiller Datenverlust/Korruption**, keine Exception. Betrifft
Kopf- **und** Fußzeile, weil `readBodyChildren` geteilt ist. Fix §3.6c.

Spiegelbildlich im Writer: `writeDocx` erzeugt **eine** `documentRels`-Registry (Z. 254),
die für Body-, Header- **und** Footer-Bilder benutzt (Z. 256, 265, 270) und ausschließlich
als `word/_rels/document.xml.rels` serialisiert wird (Z. 299) — **keine**
`header1.xml.rels`/`footer1.xml.rels`. Der eigene Round-Trip fällt nicht auf (Reader und
Writer spiegeln den Fehler), aber die Datei ist nicht OOXML-konform und ein Footer-Bild
könnte in echtem Word nicht auflösen. Fix §3.7.

**ODT ist nicht betroffen** — `src/formats/odt/reader.ts`, `resolveImageSources` (Z. 326–349)
löst Bildpfade direkt über `zip.file(href)` mit paketwurzel-relativen Pfaden auf (Z. 334),
ohne Relationship-Indirektion; der ODT-Writer schreibt Bildpfade direkt (writer Z. 182).

### 1.7 Verifizierter Bug: `headerFooter.docx` lädt die `even`- statt der `default`-Fußzeile
Verifiziert durch Auspacken von `tests/fixtures/external/docx/headerFooter.docx` (Req §6.3
erste, wichtigste Datei). Sein `sectPr`:
```
<w:headerReference w:type="even"    r:id="rId4"/>
<w:headerReference w:type="default" r:id="rId5"/>
<w:footerReference w:type="even"    r:id="rId6"/>
<w:footerReference w:type="default" r:id="rId7"/>
<w:headerReference w:type="first"   r:id="rId8"/>
<w:footerReference w:type="first"   r:id="rId9"/>
```
`src/formats/docx/reader.ts` Z. 510 (`footerRef = firstChildNS(sectPr, w,
'footerReference')`) nimmt das **erste** `footerReference` in Dokumentreihenfolge — hier
`w:type="even"` (rId6, `footer2.xml`), **nicht** `default` (rId7). Die App zeigt für diese
Datei heute die Gerade-Seiten-Fußzeile, rein durch XML-Reihenfolge. Bestätigt Req §0.1/B und
schärft sie an der konkreten Pflicht-Testdatei. Fix §3.6a.

### 1.8 Verifizierter Ist-Stand: reale ODT-Mehrfach-Master-Page
Verifiziert durch Auspacken von `HeaderFirstAndEvenPageEnabled_MSO15.odt`:
```xml
<style:master-page style:name="MP0"  style:page-layout-name="PL0"> … </style:master-page>
<style:master-page style:next-style-name="MP0" style:name="MPF0" style:page-layout-name="PL0"> … </style:master-page>
```
`content.xml` referenziert `master-page-name="MPF0"` als Start. Weder `MPF0` noch `MP0` heißt
„Standard" (nur unser eigener Writer benennt so, writer Z. 226). `src/formats/odt/reader.ts`
Z. 375 (`getElementsByTagNameNS(style, 'master-page')[0]`) nimmt das erste Element in
Dokumentreihenfolge — hier `MP0` (steht im XML zuerst). Erkennbares, deterministisch
nutzbares Muster: `MPF0` ist die Erste-Seite-Variante (Startpunkt, verkettet via
`next-style-name` zur Folgeseiten-Variante `MP0`); das **Ziel** der `next-style-name`-Kette
ist die für Normalseiten gemeinte. Heuristik §3.8.

### 1.9 Verifizierter Ist-Stand: importiertes Seitenzahl-Feld behält seinen Text bereits (BEIDE Formate)
**Korrektur gegenüber der vorigen Fassung dieses Plans**, die behauptete, `w:fldSimple`
werde still verschluckt und der ODT-Reader ignoriere `text:page-number`. Beides ist gegen
den aktuellen Code falsch:

- **DOCX** (`docx/reader.ts`, `collectRuns` Z. 194–216): `w:fldSimple` wird **rekursiv**
  betreten (`else if (child.localName === 'fldSimple') collectRuns(child, ...)`, Z. 212–213)
  → der Cache-Run `<w:r><w:t>1</w:t></w:r>` darin wird als normaler Text „1" erfasst. Für
  `w:fldChar`-Felder verarbeitet `decodeRunElement` (Z. 170–184) jeden `<w:r>`; die
  `fldChar`/`instrText`-Elemente sind keine `t`/`br`/`drawing` und werden ignoriert (die
  Instruktion „PAGE" leakt also **nicht**), der Cache-Run `<w:t>1</w:t>` wird als Text „1"
  erfasst. → **Der sichtbare Feldwert bleibt in beiden DOCX-Feldformen als statischer Text
  erhalten.**
- **ODT** (`odt/reader.ts`, `decodeInline` → `walk` Z. 138–168): Es existiert ein
  abschließender `else`-Zweig (Z. 160–167), der **jedes** nicht eigens behandelte Inline-
  Element (namentlich kommentiert: „`text:date`/`text:page-number`/`text:page-count`/…")
  betritt und dessen Textkinder mit denselben Marks als Text erfasst. → `text:page-number`s
  Cache-Text „1" bleibt erhalten.

**Konsequenz für den Scope:** Req §3.7/§5.16/§7 („mindestens dessen aktueller Textwert die
Rundreise überstehen — kein ersatzloses Verschwinden") ist für Fußzeilen **bereits ohne
Reader-Änderung erfüllt.** Es geht nur die Auto-Aktualisierung (Feld-Natur) verloren — das
ist eine **dokumentierte Einschränkung** (§7) und wird erst vom Slug `seitenzahl-einfuegen`
behoben (`seitenzahl-einfuegen-req.md` §0 benennt genau dieses „Degradieren zu statischem
Text" als dessen eigenen Befund). **Kein Code-Änderungsbedarf hier.**

### 1.10 Seitenlayout — `pageLayout.ts` (31 Zeilen) + `pagination.ts` (115 Zeilen)
`pageBackgroundStyle()` (pageLayout Z. 23–31) malt ein sich wiederholendes
CSS-Gradient-Muster auf **einen** scrollenden Container; Konstanten `PAGE_CONTENT_HEIGHT_PX`
(Z. 13), `PAGE_MARGIN_PX` (Z. 9), `PAGE_GAP_PX = 2*PAGE_MARGIN_PX + PAGE_SEPARATOR_PX`
(Z. 16), `PAGE_SEPARATOR_PX` (Z. 11). `createPaginationPlugin()` (pagination Z. 72–105) fügt
`Decoration.widget`-Spacer zwischen Seiten ein — **keine** echten Pro-Seite-Container (Req
§0.2/E bestätigt). `computePageCount(heights, pageContentHeight)` (Z. 27–29) existiert bereits,
wird aber nur intern in `measureAndBuildDecorations` (Z. 33–63) verwendet und ist **nicht** an
`WordEditor.tsx` exponiert — muss dafür exponiert werden (§3.4). `createPaginationPlugin()`
nimmt heute **kein** Argument (Aufruf `WordEditor.tsx` Z. 113).

### 1.11 Fixture-Verifikation (Req §6.3)
Alle in Req §6.3 gelisteten Dateien existieren (`tests/fixtures/external/docx/`, `.../odt/`).
**Keine** der DOCX-Footer-Fixtures (`ThreeColFoot`, `SimpleHeadThreeColFoot`,
`ThreeColHeadFoot`, `FancyFoot`, `headerFooter`) enthält ein **Bild im Footer** (verifiziert:
keine `word/_rels/footerN.xml.rels`, kein Footer-`media`). `headerPic.docx` trägt das Bild im
**Header**, nicht im Footer. **Konsequenz:** Der Fall „Bild in der Fußzeile" (Req §5.13,
§6.3 Testfall 3) ist über ein **selbst im Editor erzeugtes** Dokument nachzuweisen (§6),
plus den Reader-Bugfix §3.6c an `headerPic.docx` (Header-Bild, gemeinsamer Codepfad) — das
ist keine Lücke, sondern durch das Testmaterial vorgegeben.

---

## 2. Architekturentscheidung Req §4 (Seitenlayout-Integration)

**Gewählt: Variante (a)** in einer auf die Single-Surface-Paginierung zugeschnittenen
Ausprägung — nicht (c) (echte Pro-Seite-Container = Rewrite von `pagination.ts`, außerhalb
des Scopes) und nicht (b) als Dauerzustand (verletzt Req §5.3). Der Datenmodell-/Export-Pfad
(eine Fußzeile, DOCX+ODT, Rundreise) funktioniert **unabhängig** von der Darstellung
vollständig — die Layout-Illusion beeinflusst die Datenkorrektheit nicht (Req §4 letzter
Absatz).

### 2.1 Grundidee
- `createPaginationPlugin()` reicht die intern ohnehin berechnete Seitenzahl über einen neuen,
  optionalen Callback nach außen (§3.4).
- `WordEditor.tsx` hält `const [pageCount, setPageCount] = useState(1)`.
- Neues Modul `pageBands.ts` berechnet die Y-Position jedes Fußzeilen-Bands relativ zum
  gepolsterten Seiten-Wrapper (dem Element mit `pageBackgroundStyle()`):
  `footerBandTopPx(i) = i * (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX) + PAGE_CONTENT_HEIGHT_PX`.
  Band `i` sitzt am Anfang der (schon heute gemalten) Lücke nach Seite `i` — dort beginnt der
  untere Seitenrand. Höhe ≥ `PAGE_MARGIN_PX`, wächst mit Inhalt (kein `overflow: hidden`) →
  erfüllt Req §5.5 („kein stilles Abschneiden") strukturell. **Dokumentierte visuelle Grenze:**
  Wächst die Fußzeile über `PAGE_MARGIN_PX + PAGE_SEPARATOR_PX` hinaus, überlappt sie optisch
  das statische Hintergrundmuster der Folgeseite (das Muster passt sich nicht an) — bewusste,
  dokumentierte Grenze der Hintergrundbild-Illusion, kein neuer Bug.

### 2.2 Eine editierbare Instanz, viele visuelle Bänder
Es wird **eine** Footer-`EditorView` erzeugt (eigenes `EditorState`/`history()`, eigenes
Dokument aus `doc.content.footer`). Für `pageCount` Bänder:
1. `FooterBands.tsx` rendert `pageCount` absolut positionierte `<div>` (`footerBandTopPx(i)`).
2. Der Container mit `activeBandIndex` (initial `0`) bekommt `footerView.dom` per
   `ref`-Callback (`containerEl.appendChild(footerView.dom)`) — **DOM-Knoten verschieben**,
   kein `view.destroy()`; Instanz und Historie bleiben unangetastet.
3. Alle anderen Bänder rendern einen nicht-editierbaren Klon
   `<div aria-hidden="true" dangerouslySetInnerHTML={{ __html: footerHtmlSnapshot }} />`;
   `footerHtmlSnapshot` wird bei jeder Footer-`dispatchTransaction` aus `footerView.dom.innerHTML`
   aktualisiert. Da strukturell identisch, sehen alle Seiten denselben aktuellen Inhalt (Req
   §5.3/§5.4).
4. Klick auf ein Klon-Band aktiviert die echte Instanz an der richtigen Stelle:
   `caretRangeFromPoint(x, y)` (Fallback `caretPositionFromPoint`) → `(domNode, offset)` im
   Klon → über einen Kindindex-Pfad (`childIndexPath`) auf den strukturell identischen Knoten
   im echten `footerView.dom` abgebildet → `footerView.posAtDOM(node, offset)` → `activeBandIndex`
   setzen (löst Reparenting 2 aus) → `dispatch(setSelection(TextSelection.near(...)))`,
   `footerView.focus()`. **Dokumentierter Fallback:** Bricht die Zuordnung bei exotischer
   Mark-Struktur ab, landet der Cursor am Ende des Fußzeileninhalts (kein Crash, kein falscher
   Bereich) — Req „kein stiller Fehlschlag" bleibt erfüllt (Fokus landet stets im Footer).
   Spike-Punkt §9.
5. **Sonderfall `pageCount === 1`** (überwiegende Mehrheit): nur ein Band, kein
   Reparenting/Klon — der komplexe Pfad 2–4 ist totes Gleis für den Alltagsfall, was das
   praktische Risiko dieser Entscheidung stark senkt.

### 2.3 Warum keine `pageCount` echten Views
Verworfen: Req §3.5 verlangt **eine** gemeinsame Undo-Historie pro Fußzeile und §3.3
**identischen** Inhalt auf jeder Seite — mehrere Views erzeugten entweder getrennte Historien
(falsch) oder eine Synchronisation, die genau das ist, was der Klon-Mechanismus einfacher
leistet.

---

## 3. Dateigenaue Änderungen

### 3.1 `src/formats/shared/schema.ts` — **keine Änderung**
Der Fußzeilen-Editor nutzt das bestehende `wordSchema` unverändert (Req §3.2). **Kein**
`page_number_field`-Node (das ist `seitenzahl-einfuegen`-Scope, siehe §10). Damit bleibt
`assertLoadableDocument` (§1.2) automatisch erfüllt.

### 3.2 `src/formats/shared/documentModel.ts` (ändern) — kleiner Helfer
Für „leere Fußzeile ohne Rückfrage deaktivieren" (Req §3.6) ein reiner Prädikat-Helfer:
```ts
/** True, wenn footer/header nur aus einem einzigen leeren Absatz besteht. */
export function isChromeContentEmpty(doc: ProseMirrorJSON | null): boolean {
  if (!doc) return true
  const content = (doc as { content?: unknown[] }).content ?? []
  if (content.length === 0) return true
  if (content.length > 1) return false
  const only = content[0] as { type?: string; content?: unknown[] }
  return only.type === 'paragraph' && (!only.content || only.content.length === 0)
}
```
Optional zusätzlich `meta`-Typ um transiente Import-Hinweise erweitern (§3.9).

### 3.3 `src/formats/shared/editor/commands.ts` — **keine Änderung**
Die Fußzeile nutzt exakt dieselben Kommandos wie der Body (`setAlign`, `setHeading`,
`toggleList`, `insertImage`, `insertTable`, `applyMarkColor`, …), gebunden an die
**fokussierte** View (§3.12). **Kein** `insertPageNumberField` (entfällt mit dem
Seitenzahl-Scope). Kommandos sind view-agnostisch (nehmen `state`/`dispatch`), funktionieren
also auf der zweiten Instanz ohne Änderung.

### 3.4 `src/formats/shared/editor/pagination.ts` (ändern) — Seitenzahl nach außen
**Verifizierter Ist-Stand:** `createPaginationPlugin()` nimmt heute **kein** Argument (Z. 72),
`computePageCount(heights, pageContentHeight)` (Z. 27–29) **und** `computePageBreakIndices`
(Z. 12–25) sind bereits exportiert, `PAGE_CONTENT_HEIGHT_PX` ist bereits importiert (Z. 3).
Die `recompute`-Funktion nutzt eine **Guard-Clause** (`if (current && sameDecorationSet(current,
next)) return`, Z. 92), **nicht** ein umschließendes `if`. Der Callback wird an genau dieser
Stelle nach der Dispatch-Entscheidung ergänzt:
```ts
export function createPaginationPlugin(onPageCountChange?: (count: number) => void): Plugin {
  // … Rest unverändert bis view(view):
  view(view) {
    const recompute = () => {
      const next = measureAndBuildDecorations(view)
      const heights = (Array.from(view.dom.children) as HTMLElement[]).map(
        (el) => el.getBoundingClientRect().height,
      )
      onPageCountChange?.(computePageCount(heights, PAGE_CONTENT_HEIGHT_PX))
      const current = paginationKey.getState(view.state)
      if (current && sameDecorationSet(current, next)) return   // bestehende Guard-Clause (Z. 92)
      view.dispatch(view.state.tr.setMeta(paginationKey, next))
    }
    // … requestAnimationFrame-Logik unverändert (Z. 96–102)
  }
}
```
Der Callback läuft **vor** der Guard-Clause, damit `pageCount` auch dann aktualisiert wird,
wenn sich die Dekorationen nicht geändert haben (z. B. reine Höhenänderung ohne neuen
Seitenumbruch). `WordEditor.tsx` übergibt `createPaginationPlugin(setPageCount)` (statt heute
ohne Argument, Z. 113); `setPageCount` ist idempotent (React rendert bei gleichem Wert nicht
neu), verhindert also Render-Schleifen trotz Aufruf bei jedem `recompute`. **Kleine
Doppelmessung** der Höhen (einmal in `measureAndBuildDecorations`, einmal hier) bewusst in
Kauf genommen, um `measureAndBuildDecorations` nicht anzufassen — Aufräum-Kandidat, kein
Blocker (§9).

### 3.5 Neu: `src/formats/shared/editor/pageBands.ts`
```ts
import { PAGE_CONTENT_HEIGHT_PX, PAGE_GAP_PX, PAGE_MARGIN_PX } from './pageLayout'

/** Y-Position (px) des Fußzeilen-Bands von Seite `pageIndex`, relativ zum Seiten-Wrapper. */
export function footerBandTopPx(pageIndex: number): number {
  return pageIndex * (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX) + PAGE_CONTENT_HEIGHT_PX
}

export const FOOTER_BAND_MIN_HEIGHT_PX = PAGE_MARGIN_PX
```
Reine Berechnung, unit-getestet in §6.1.

### 3.6 `src/formats/docx/reader.ts` (ändern) — deterministische Referenzwahl + Bild-Rels-Fix
**a) Deterministische `w:type`-Präferenz** (behebt §1.7). Ersetzt `firstChildNS(sectPr, w,
'headerReference'/'footerReference')` (Z. 509–510) durch eine Auswahl, die `w:type="default"`
bevorzugt:
```ts
function pickSectionReference(sectPr: Element, localName: string): { el: Element | null; hasVariants: boolean } {
  const all = childElements(sectPr, OOXML_NAMESPACES.w, localName)
  if (all.length === 0) return { el: null, hasVariants: false }
  const byType = new Map(
    all.map((el) => [el.getAttributeNS(OOXML_NAMESPACES.w, 'type') ?? 'default', el]),
  )
  return { el: byType.get('default') ?? all[0], hasVariants: all.length > 1 }
}
```
`headerRef`/`footerRef` daraus beziehen. `hasVariants` fließt in einen transienten
`footerVariantNotice`/`headerVariantNotice` (§3.9). **Wichtig:** `childElements` (Z. 16–18)
existiert bereits — nur nutzen.

**b) Multi-Section: bewusst KEINE Änderung** (Korrektur gegenüber der vorigen Fassung).
Der Reader liest heute `firstChildNS(bodyEl, w, 'sectPr')` (Z. 507) — das ist per OOXML der
**Body-Ende-`sectPr`, also die letzte/wirksame Section**. Req §5.10 verlangt ausdrücklich,
dass „mindestens der Text der **wirksamen (letzten)** Fußzeile" erhalten bleibt — das leistet
das heutige Verhalten bereits. Der in der vorigen Fassung geplante Umbau (alle `sectPr` via
`getElementsByTagNameNS` einsammeln und die **erste** nehmen) hätte auf die **erste** Section
umgestellt und damit Req §5.10 **regressiert**. Daher: unverändert lassen; Mehrfach-Section
mit abweichenden Fußzeilen bleibt dokumentierte Einschränkung (§7).

**c) Bild-Relationship-Scoping-Fix** (behebt §1.6). Die Kopf-/Fußzeilen-Blöcke werden mit
einer **teil-eigenen** `.rels`-Map statt `documentRels` geladen:
```ts
async function readPartOwnRelationships(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const dir = partPath.split('/').slice(0, -1).join('/')
  const base = partPath.split('/').pop()!
  return readRelationships(zip, `${dir}/_rels/${base}.rels`)  // readRelationships liefert leere Map, wenn Datei fehlt
}
```
In den Lade-Blöcken (Z. 514–531) `readBodyChildren(root, headingInfo, kindByNumId,
documentRels, zip)` durch `readBodyChildren(root, headingInfo, kindByNumId, await
readPartOwnRelationships(zip, path), zip)` ersetzen (`path` ist die schon per `resolvePartPath`
aufgelöste Header-/Footer-Datei, Z. 515/524). `resolveImageSources` (Z. 442–462) löst den
Bildpfad danach korrekt relativ zu `word/` auf (der Part liegt in `word/`, Z. 446 passt).
`readRelationships` (Z. 24–35) bleibt unverändert.

### 3.7 `src/formats/docx/writer.ts` (ändern) — pro Teil eigene Relationship-Registry
Behebt §1.6 Schreibrichtung. `writeDocx` (Z. 252) bekommt zwei bedingte Registries:
```ts
const headerRels = new RelationshipRegistry()
const footerRels = new RelationshipRegistry()
// …
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
(`images` bleibt **eine** gemeinsame `ImageCollector`-Instanz — nur die Relationship-**IDs**,
nicht die Bilddateien, sind pro Teil zu trennen; die Rel-Ziele `media/...` bleiben identisch.)
Beim Zip-Schreiben (nach `document.xml.rels`, Z. 299) zusätzlich:
```ts
if (headerXml && headerRels.all().length) wordFolder.folder('_rels')!.file('header1.xml.rels', headerRels.serialize())
if (footerXml && footerRels.all().length) wordFolder.folder('_rels')!.file('footer1.xml.rels', footerRels.serialize())
```
Rels-Datei nur bei tatsächlichem Teil-Bild — wie echtes Word (§1.6). `RelationshipRegistry`
bietet `all(): Relationship[]` (relationships.ts Z. 19) **und** `serialize()` (Z. 23) bereits —
kein neuer Helfer nötig; `all().length === 0` ist das gewünschte „kein Teil-Bild"-Prädikat.

**Zwei harte Reihenfolge-Randbedingungen** (sonst nicht-deterministischer/kaputter Export):
1. Beide `.file(...)`-Aufrufe müssen **vor** `stampZipEntriesForDeterminism(zip)` (Z. 311)
   und damit vor `zip.generateAsync(...)` (Z. 313) stehen — der Determinismus-Stempel muss
   nach **jedem** `zip.file()`-Aufruf laufen (Kommentar Z. 307–311). Der Einfügepunkt „nach
   Z. 299" erfüllt das.
2. **Kein** `[Content_Types].xml`-Eintrag nötig: `buildContentTypesXml` (Z. 229) deklariert
   bereits `<Default Extension="rels" .../>` (Z. 244), der **alle** `*.rels`-Parts abdeckt —
   `header1.xml.rels`/`footer1.xml.rels` fallen automatisch darunter. `buildContentTypesXml`
   bleibt daher **unverändert** (nur die `hasHeader`/`hasFooter`-Overrides für `header1.xml`
   /`footer1.xml` selbst existieren schon, Z. 238–239).

### 3.8 `src/formats/odt/reader.ts` (ändern) — deterministische Master-Page-Wahl
Behebt §1.8. Ersetzt `getElementsByTagNameNS(style, 'master-page')[0]` (Z. 375):
```ts
function pickMasterPage(stylesDoc: Document): { el: Element | null; hasVariants: boolean } {
  const all = Array.from(stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page'))
  if (all.length === 0) return { el: null, hasVariants: false }
  if (all.length === 1) return { el: all[0], hasVariants: false }

  // Ist eine Master-Page das ZIEL eines style:next-style-name, ist sie die für reguläre
  // Folgeseiten gemeinte (die Quelle ist meist die "erste Seite anders"-Variante) —
  // verifiziert an HeaderFirstAndEvenPageEnabled_MSO15.odt (§1.8).
  const chainTargets = new Set(
    all.map((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'next-style-name')).filter((v): v is string => !!v),
  )
  const chained = all.find((el) => chainTargets.has(el.getAttributeNS(ODF_NAMESPACES.style, 'name') ?? ''))
  if (chained) return { el: chained, hasVariants: true }

  // Fallback: Master-Page namens "Standard" (u. a. unser eigener Writer).
  const standard = all.find((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'name') === 'Standard')
  if (standard) return { el: standard, hasVariants: true }

  return { el: all[0], hasVariants: true }  // letzter Fallback, jetzt bewusst dokumentiert
}
```
`hasVariants` fließt wie in §3.6a in `footerVariantNotice`/`headerVariantNotice`. Ein
Bild-Rels-Fix ist für ODT nicht nötig (§1.6).

### 3.9 Varianten-Hinweis: `documentModel.ts` `meta` (ändern) + Writer bleiben unberührt
Damit §3.6a/§3.8 einen sichtbaren Hinweis (Req §7 Deklarationspflicht) erzeugen können, ohne
den Rückschreibvertrag zu belasten:
```ts
meta: { title: string; footerVariantNotice?: string | null; headerVariantNotice?: string | null }
```
Die Writer serialisieren **ausschließlich** `meta.title` (`docx/writer.ts` Z. 283/220–227;
`odt/writer.ts` Z. 276/235–242) — die Zusatzfelder werden also naturgemäß **nicht** exportiert
(rein transiente Import-Diagnose, überlebt die Rundreise bewusst nicht). **Alternative** (falls
das Verschmutzen des persistierten Modells unerwünscht ist): den Hinweis nicht in `meta`,
sondern als separaten Rückgabewert/`OpenDocument`-Feld führen — mehr Verdrahtung, sauberer;
Entscheidung im Review. `odt/writer.ts` und der `if(footer)`-Truthy-Check in `docx/writer.ts`
bleiben **unverändert** (§1.5).

### 3.10 `src/formats/shared/editor/WordEditor.tsx` (ändern) — größter Umbau
1. **Zweite `EditorView`** für den Footer, gemountet nur wenn `doc.content.footer !== null`.
   **Vollständig gleiches Plugin-/Prop-Set wie der Body** — Req §3.2 verlangt Funktionsparität,
   deshalb reicht die frühere Kurzliste („history, keymap, Tabellen, dropCursor, gapCursor")
   nach dem Cut/Copy-Ausbau (§1.3) nicht mehr aus. Konkret dieselbe Plugin-Reihe wie Body
   (WordEditor Z. 83–114): `history()`, der **komplette** Body-Keymap (`Mod-z/Mod-y/Mod-Shift-z`,
   `Enter → splitListItem(list_item)`, `Shift-Enter → insertHardBreak()`, `Mod-b/i/u`,
   `Shift-Delete → cutSelection({ onCutBlocked: setCutError })`), `keymap(baseKeymap)`,
   `columnResizing()`, `tableEditing()`, `dropCursor()`, `gapCursor()` — **ohne**
   `createPaginationPlugin()` (die Fußzeile ist selbst nicht paginiert). Die zweite
   `EditorView` erhält zudem denselben `clipboardTextSerializer`-Prop wie der Body (Z. 124),
   sonst bricht Kopieren/Ausschneiden aus der Fußzeile mit strukturiertem Inhalt. Der
   `cutError`-Kanal (rote Toolbar-Meldung) wird geteilt: dieselbe `setCutError`-State-Funktion
   an beide Views. Eigenes `dispatchTransaction`, das bei `tr.docChanged`
   `onChangeRef.current({ ...doc.content, footer: newState.doc.toJSON() })` schreibt — exakt
   spiegelbildlich zum Body-Vertrag (Z. 129).
2. **`activeArea: 'body' | 'footer'`-State**, aktualisiert über `focus`-Listener
   (Capture-Phase) auf `bodyView.dom` bzw. `footerView.dom`. Bestimmt, an welche View die
   Toolbar gebunden ist (§3.12).
3. **`reconcileSelectionOnClick`** (Z. 43–50, Logik unverändert) zusätzlich als
   `mouseup`-Listener an `footerView.dom` binden (mit derselben mousedown/mouseup-Drag-Schwelle
   `CLICK_DRAG_THRESHOLD_PX` wie Z. 141–155) — behebt Req §5.7 strukturell (Fokuswechsel zwischen zwei Views ist genau
   der Fall, für den der Fix gebaut wurde).
4. **`toggleFooter()`**:
   ```ts
   function toggleFooter() {
     const footer = doc.content.footer
     if (footer === null) { onChangeRef.current({ ...doc.content, footer: emptyDocJSON() }); return }
     if (isChromeContentEmpty(footer)) { onChangeRef.current({ ...doc.content, footer: null }); return }
     if (!window.confirm('Die Fußzeile enthält Inhalt. Wirklich entfernen?')) return  // Abbrechen: Zustand unverändert (Req §5.2)
     setPendingFooterRestore(footer)
     onChangeRef.current({ ...doc.content, footer: null })
   }
   ```
   `window.confirm` ist Hausmuster (`DocumentWorkspace.tsx` Z. 98, Req §3.6).
5. **Undo-nach-Deaktivieren** (Req §5.6): `pendingFooterRestore`-State. Ein `keydown`-Listener
   am äußeren Workspace-Container fängt `Mod-z` **nur**, wenn `pendingFooterRestore !== null`
   **und** weder Body- noch Footer-View fokussiert ist (Fokus liegt auf dem Toggle-Button),
   stellt den Inhalt wieder her und konsumiert `pendingFooterRestore`. Jede andere Aktion
   setzt ihn auf `null` (Req verlangt nur „Undo **direkt** danach").
6. **Fokus-Effekt beim Aktivieren**: `useEffect` bei Übergang `footer: null → nicht null`
   (verglichen über eine Ref) → `footerView.focus()` + Cursor auf Position 0 → Req §3.1
   „kein zusätzlicher Klick nötig".
7. **`footerHtmlSnapshot`-State** (§2.2.3), aktualisiert in Footer-`dispatchTransaction`.
   Das Footer-`dispatchTransaction` ruft — wie der Body (Z. 131) — **außerhalb** des
   `docChanged`-Guards `forceRender`/eine State-Aktualisierung auf, damit die Toolbar ihre
   Aktiv-Zustände (Fett/Ausrichtung/Überschrift) an die **Fußzeilen**-Selektion nachzieht,
   wenn die Fußzeile die fokussierte Instanz ist (§3.12). Ohne diesen Trigger blieben die
   Button-Zustände auf dem letzten Body-Stand stehen.
8. **`pageCount`-State** (§3.4) + **`activeBandIndex`-State** für `FooterBands` (§3.11).
9. **Doppelklick auf den unteren Seitenrand** (Req §1 #2): `dblclick`-Listener auf dem
   Seiten-Wrapper; liegt der Klick-Y in einem Bandbereich (`footerBandTopPx`), `toggleFooter()`
   bei `footer === null` bzw. Fokus in die Fußzeile bei bereits aktiver. Kein ergebnisloser
   Doppelklick (Req §3.9).
10. **Rendern**: unter der Papierfläche `<FooterBands … />` (nur wenn `footer !== null`), plus
    optionales Varianten-Hinweisbanner oberhalb der Toolbar (sichtbar bei gesetztem
    `meta.footerVariantNotice`, `×`-Button rein visuell).
11. **Toolbar-Aufruf** (§3.12) mit dynamischer `view` + neuen Props.

### 3.11 Neu: `src/formats/shared/editor/FooterBands.tsx`
Kapselt §2.2. Props `{ pageCount; footerView; footerHtml; activeBandIndex;
onActivateBand: (index: number, ev: MouseEvent) => void }`. Rendert `pageCount` `<div>` mit
`position:absolute`, `top: footerBandTopPx(i)`, `left/right:0`, `minHeight:
FOOTER_BAND_MIN_HEIGHT_PX`, `data-footer-band={i}`, dünne gestrichelte Trennlinie und — nur bei
Fokus — dezentes Label „Fußzeile" (Req §1 #3). Die Klick-zu-Position-Übersetzung
(`mapClickToFooterPos`, §2.2.4) als eigene, unit-testbare reine DOM-Funktion.

### 3.12 `src/formats/shared/editor/Toolbar.tsx` (ändern) — Kontextbindung + Toggle-Button
1. `ToolbarProps` erweitern: `footerActive: boolean`, `onToggleFooter: () => void`,
   `activeAreaLabel: string | null`. Die `view`-Prop wird vom Aufrufer bereits auf die
   **fokussierte** Instanz gesetzt (`activeArea === 'footer' ? footerView : bodyView`), sodass
   alle bestehenden Buttons/Kommandos automatisch auf die Fußzeile wirken, wenn sie fokussiert
   ist (Req §1 #5) — **keine** Änderung an den einzelnen Buttons nötig.
2. **`FooterIcon`** analog `ScissorsIcon` (Z. 33–53, vorhandenes SVG-Muster kopieren):
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
3. **Toggle-Button** (eigene Gruppe am Ende), Struktur analog `MarkButton` (Z. 71–87):
   ```tsx
   <button type="button"
     title={footerActive ? 'Fußzeile ausblenden' : 'Fußzeile einblenden'}
     aria-label={footerActive ? 'Fußzeile ausblenden' : 'Fußzeile einblenden'}
     aria-pressed={footerActive}
     onMouseDown={(e) => { e.preventDefault(); onToggleFooter() }}
     className={/* aktiv/inaktiv wie MarkButton Z. 80–84 */}>
     <FooterIcon />
   </button>
   ```
4. **Statusanzeige „Bearbeite: Haupttext/Fußzeile"** (Req §1 #9, nice-to-have, < 5 Zeilen):
   ```tsx
   {activeAreaLabel && <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto pr-1">Bearbeite: {activeAreaLabel}</span>}
   ```
5. **KEIN** „Seitenzahl einfügen"-Button (entfällt mit dem Seitenzahl-Scope, §10).

### 3.13 `src/index.css` (ändern) — Band-Stile
Am Dateiende (nach Z. 88):
```css
.footer-band { transition: outline-color 0.1s ease; }
.footer-band:focus-within { outline: 1px dashed #9ca3af; outline-offset: 2px; }
.footer-band-label { font-size: 11px; color: #6b7280; }
```
Bewusst **keine** `.page-number-field`-Regel (Seitenzahl-Scope). Bewusst keine `dark:`-Variante
für die Papierfläche — konsistent mit `.ProseMirror { color: #111827 }` (Z. 23–27), die auch im
App-Dark-Mode hell/druckseitenartig bleibt.

### 3.14 `src/app/DocumentWorkspace.tsx` — **keine Änderung**
Der `onChange`-Vertrag bleibt `(content) => onChange({ ...document, content, dirty: true })`
(Z. 146). Footer-Änderungen laufen über denselben Callback aus `WordEditor.tsx`, setzen also
automatisch `dirty: true`; der „ungespeicherte Änderungen"-Dialog (Z. 98) greift automatisch.

---

## 4. Undo/Redo- und Selection-Sync-Analyse (Req §3.5, §5.7)
- **Getrennte Historien:** Zwei `EditorView`s mit je eigenem `history()`-Plugin haben
  **strukturell** getrennte Undo-Stacks — Req §3.5 ohne Zusatzcode erfüllt, aber per Test
  nachzuweisen (§6.3), da es im heutigen Code (eine Instanz) keine Präzedenz gibt.
- **Aktivieren/Deaktivieren ist keine PM-Transaktion:** deshalb der eigene, enge
  `pendingFooterRestore`-Mechanismus (§3.10.5) statt einer generischen Lösung — `footer` lebt
  außerhalb jedes `EditorState`.
- **Selection-Sync (Req §5.7):** identischer Mechanismus wie der gelöste Bug aus
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, jetzt auf die zweite Instanz angewandt (§3.10.3).
  Pflicht-Regressionstest §6.3, analog `tests/e2e/selection-regression.spec.ts`, aber
  Footer↔Body.

---

## 5. Grenzfälle-Mapping (Req §5, vollständig)

| Req # | Grenzfall | Lösung | Test |
|---|---|---|---|
| 5.1 | Leere aktive Fußzeile beim Export bleibt erhalten | Writer bereits korrekt (§1.5); UI setzt sauber `emptyDocJSON()`/`null` (§3.10) | §6.2 Unit |
| 5.2 | Befüllte Fußzeile entfernen, Abbrechen ändert nichts | `window.confirm`-Guard in `toggleFooter()` (§3.10.4) | §6.3 E2E |
| 5.3 | Mehrseitig: Fußzeile auf jeder Seite | `FooterBands` + Klon (§2.2) | §6.3 E2E |
| 5.4 | Manueller Seitenumbruch → Fußzeile auf beiden Seiten | Fußzeile unabhängig vom Body, Bänder folgen `pageCount` | §6.3 (sobald Seitenumbruch-Node existiert — heute keiner, §9) |
| 5.5 | Fußzeileninhalt größer als Rand | Band wächst mit Inhalt, kein `overflow:hidden` (§2.1) | Manueller visueller Test + Kommentar §2.1 |
| 5.6 | Undo direkt nach Deaktivieren | `pendingFooterRestore` + enger `keydown`-Guard (§3.10.5) | §6.3 E2E |
| 5.7 | Fokuswechsel Footer↔Body + Tippen | Zweiter `mouseup`-Listener (§3.10.3) | §6.3 Pflicht-Regressionstest |
| 5.8 | „Überschrift" in Fußzeile | `heading` ist Teil von `block`, Schema-Wiederverwendung, keine Sperre | §6.2 Unit (heading in footer rundreist) |
| 5.9 | „Erste Seite anders"/gerade-ungerade Import | Deterministische Wahl + Hinweis (§3.6a/§3.8/§3.9) | §6.2 Unit mit `headerFooter.docx`/MSO15-Fixture |
| 5.10 | Mehrere `sectPr` (Section-Wechsel) | Body-Ende-`sectPr` = wirksame/letzte Section bleibt erhalten (heute schon; §3.6b bewusst keine Änderung) | §6.2 Unit + §7 Doku |
| 5.11 | Datei ohne Fuß-, mit Kopfzeile (bzw. umgekehrt) | `footer`/`header` unabhängige Felder, Reader/Writer fassen sie separat an | §6.2 Regression mit `Headers.docx`/`ThreeColHead.docx` |
| 5.12 | Seitenumbruch **in** der Fußzeile | Nicht anwendbar — kein Seitenumbruch-Node im Schema (verifiziert); Folgepunkt für `seitenumbruch` (§9) | — |
| 5.13 | Bild in importierter Fußzeile | Rels-Scoping-Fix (§3.6c); da keine Footer-Bild-Fixture existiert (§1.11): Nachweis über selbst erzeugtes Dokument + `headerPic.docx` (Header, gemeinsamer Pfad) | §6.2/§6.3 |
| 5.14 | Kopf + Fuß gleichzeitig, versch. Text | Unabhängige Felder, keine Vertauschung | §6.2 mit `headerFooter.docx`/`HeaderFooter.odt` |
| 5.15 | Unicode/Sonderzeichen | Reader/Writer sind bytegetreu (bestehende `escapeXml`-Pfade) | §6.3 mit `HeaderFooterUnicode.docx` |
| 5.16 | Cross-Format nicht 1:1 abbildbar (z. B. Feldart) | Mindestens Text bleibt (§1.9); Formatierungsverlust dokumentiert (§7) | §6.2 Cross-Format |

---

## 6. Tests

### 6.1 Neu: `src/formats/shared/editor/__tests__/pageBands.test.ts`
`footerBandTopPx(0) === PAGE_CONTENT_HEIGHT_PX`; `footerBandTopPx(1) === PAGE_CONTENT_HEIGHT_PX
+ (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX)`; monoton steigend für `i = 0..5`.

### 6.2 Reader/Writer-Unit-Tests (bestehende bleiben grün)
**`src/formats/docx/__tests__/roundtrip.test.ts`** (ergänzen; Block „DOCX round trip: header,
footer, and metadata" Z. 334–351 bleibt unverändert grün):
- **§1.7-Regression:** synthetisches `sectPr` mit `even`/`default`/`first`-`footerReference` →
  geladene Fußzeile = **`default`**-Variante; `meta.footerVariantNotice` gesetzt.
- **§1.6-Regression:** synthetisches `footer1.xml` mit Bild + eigener `footer1.xml.rels`
  (Ziel weicht bewusst vom `document.xml.rels`-Eintrag derselben ID ab) → Bild korrekt
  aufgelöst (nicht der `styles.xml`-Inhalt). Plus Export-Test: Fußzeile mit Bild → Zip enthält
  `word/_rels/footer1.xml.rels` mit `Type=".../image"`.
- **§1.9-Doku-Test (Seitenzahl-Feld-Text bleibt):** Roh-XML mit `w:fldSimple w:instr=" PAGE "`
  **und** `w:fldChar`-Quadruple direkt an `readDocx` → Fußzeile enthält den Cache-Text als
  statischen Text (kein Verlust, kein „PAGE"-Leak). Hält die dokumentierte Einschränkung §7
  fest (Feld → statischer Text).
- `heading` in Fußzeile rundreist (Req §5.8).

**`src/formats/odt/__tests__/roundtrip.test.ts`** (ergänzen):
- **§1.8-Regression:** synthetisches `styles.xml` mit zwei Master-Pages (`next-style-name`-Kette)
  → Fußzeile aus der **Kettenziel**-Master-Page; `meta.footerVariantNotice` gesetzt.
- **§1.9-Doku-Test:** `<text:page-number>1</text:page-number>` in Footer → Text „1" bleibt als
  statischer Text erhalten.

**Fixture-Inhaltstests** (neu, ergänzen den reinen Crash-Sweep in
`docx/__tests__/external-fixtures.test.ts` / `odt/__tests__/external-fixtures.test.ts`): Für
jede Datei aus Req §6.3 Import → Fußzeilentext extrahieren → unverändert exportieren →
reimportieren → Text identisch. `NoHeadFoot.docx`: `footer === null` vor **und** nach
Rundreise. `EmptyDocumentWithHeaderFooter.docx`: `footer !== null`. Cross-Format je einer
DOCX- und ODT-Datei (Req §6.2 Testfall 5/6).

**Unabhängige Schema-Validierung** (Req §6.4): `odt/__tests__/external-validation.test.ts` um
einen Export **mit nicht-leerer Fußzeile** erweitern (xmllint-wasm gegen
`OpenDocument-v1.3-schema.rng`, heute läuft er mit `footer: null`). DOCX analog über
`docx/__tests__/external-validation.test.ts`.

### 6.3 Neu: `tests/e2e/footer.spec.ts` (Playwright, echte Interaktion)
1. Neues Dokument → Button „Fußzeile einblenden" → Bereich erscheint, `aria-pressed="true"`,
   Cursor sofort im Footer (direkt tippen ohne Klick).
2. Text tippen, Fett + Zentriert (Toolbar wirkt auf fokussierten Footer) → sichtbar formatiert
   im Footer, **nicht** im Body (DOM-Assertion Abgrenzung).
3. **Pflicht-Regression (Req §5.7):** Footer tippen → in Body klicken → tippen → zurück in
   Footer → tippen → beide behalten exakt ihren Inhalt, keine Vermischung. Dauerhaft in Suite.
4. **Getrennte Undo (Req §3.5):** Strg+Z im Body macht keine Footer-Änderung rückgängig, und
   umgekehrt.
5. Export → echter Re-Upload (Muster `docx.spec.ts`/`odt.spec.ts`) → Footer-Text + Formatierung
   weiter sichtbar, Toggle weiter `aria-pressed="true"`.
6. Deaktivieren befüllter Fußzeile → `window.confirm` (`page.on('dialog', …)`): Abbrechen lässt
   Zustand unverändert; erneut + Bestätigen → Bereich weg, `aria-pressed="false"`.
7. Direkt danach `ControlOrMeta+z` → Fußzeileninhalt kehrt zurück (Req §5.6).
8. Mehrseitiges Dokument (langer Body bis `pageCount > 1`) → `[data-footer-band]`-Anzahl > 1,
   alle mit identischem Text; Klick auf ein Nicht-Erste-Seite-Band → Fokus/Cursor im Footer
   (deckt §2.2.4 inkl. Fallback ab).
9. Doppelklick unterer Seitenrand aktiviert die Fußzeile (Req §1 #2).

### 6.4 Regressionsschutz
`docx/__tests__/roundtrip.test.ts` + `odt/__tests__/roundtrip.test.ts` (Block „header, footer,
and metadata"), beide `external-fixtures.test.ts` (Crash-Sweep) und beide
`external-validation.test.ts` müssen grün bleiben. Keiner der Fixes ändert bereits getestetes
Verhalten; nur bislang **unspezifiziertes** Verhalten („welche Referenz gewinnt") wird
deterministisch.

---

## 7. Nicht unterstützte Varianten — Deklarationspflicht (Req §7)

| Variante | Status nach diesem Plan | Deklaration |
|---|---|---|
| „Erste Seite anders" (`w:type="first"` / abweichende Master-Page) | Nicht über UI editierbar | Deterministische Wahl (`default`/Kettenziel, §3.6a/§3.8) + sichtbares Hinweisbanner (§3.9/§3.10.10) statt stillem Verschwinden |
| Gerade/ungerade (`w:type="even"` / `header-left`) | Nicht über UI editierbar | Gleicher Mechanismus (`hasVariants`) |
| Mehrere Sections, je eigene Fußzeile | Nur wirksame (letzte) Section (§3.6b, unverändert) | Dokumentiert hier + Code-Kommentar reader.ts |
| Automatische Seitenzahl (`w:fldChar`/`fldSimple PAGE`, `text:page-number`) | Feld → **statischer Text** (§1.9) | Textwert bleibt; Auto-Aktualisierung erst mit `seitenzahl-einfuegen`; dokumentierte Einschränkung, kein Datenverlust |

Alle vier bleiben laut Req §7 **nicht blockierend**. Dieser Plan verbessert Determinismus und
Transparenz (deterministische Wahl statt XML-Zufall, sichtbarer Hinweis), baut die Varianten
aber nicht.

---

## 8. Abnahmekriterien — Abgleich mit Req §9 (Definition of Done)

| Req §9 # | DoD-Punkt | Abgedeckt durch |
|---|---|---|
| 1 | Bedienelemente per echter Playwright-Interaktion | §3.10/§3.11/§3.12, §6.3 Testfall 1/2/6/9 |
| 2 | Layout-Entscheidung §4 getroffen/umgesetzt, 5.3 nachgewiesen (oder (b) vermerkt) | §2, §6.3 Testfall 8 |
| 3 | Editierfunktionen per echter Interaktion | §3.12 (Kontextbindung), §6.3 Testfall 2 |
| 4 | Getrennte Undo-Historien | §4, §6.3 Testfall 4 |
| 5 | Baseline-Rundreise grün, nicht gebrochen | §6.4 |
| 6 | Feature-Rundreise DOCX/ODT/Cross-Format inkl. Formatierung/Bild/Kopf+Fuß/Entfernen | §6.2/§6.3 |
| 7 | Fremddatei-Rundreise alle Fixtures grün, „erste Seite anders" ohne Datenverlust | §6.2 Fixture-Inhaltstests, §3.6a/§3.8 |
| 8 | Unabhängige Schema-Validierung Export **mit** Fußzeile (ODT + DOCX) | §6.2 (external-validation) |
| 9 | Selection-Sync-Regressionstest dauerhaft in Suite | §6.3 Testfall 3 |
| 10 | Reader-Lücken befundet + behoben/dokumentiert: Bild-Rels (0.3/1), Auswahlregel (0.3/2), Seitenzahl-Feld (0.3/5) | §3.6c/§3.7 (behoben), §3.6a/§3.8 (behoben), §1.9/§7 (dokumentiert) |
| 11 | Kein stiller Fehlschlag | Hinweisbanner (§3.9/§3.10.10), Doppelklick-Feedback (§3.10.9), keine Konsolen-Exception in Tests |
| 12 | Architektur verbaut `seitenzahl-einfuegen` nicht; Verhältnis zu `kopfzeile-bearbeiten` geklärt | §3.1 (Schema offen), §10; §0 Entscheidung 5 |

---

## 9. Offene Risiken / Spike-Punkte
- **Klick-zu-Position-Mapping auf Klon-Bändern** (§2.2.4): `caretRangeFromPoint`/Kindindex-Pfad
  bei verschachtelten Marks nicht im Voraus bewiesen; dokumentierter Fallback („Cursor ans
  Ende") deckt den Fehlerfall. Für `pageCount === 1` (Alltagsfall) irrelevant. Über §6.3
  Testfall 8 mit formatiertem Inhalt verifizieren.
- **`pagination.ts`-Doppelmessung** (§3.4): bewusst, um `measureAndBuildDecorations` nicht
  anzufassen; Aufräum-Kandidat. `requestAnimationFrame`-Drosselung (Z. 96–99) hält das
  unkritisch.
- **Sichtbare Überlappung bei sehr großer Fußzeile** (§2.1, Req §5.5): kein Code-Fix, nur
  dokumentierte Grenze der Hintergrundbild-Illusion. Falls im Review nicht akzeptabel → echte
  Pro-Seite-Container (Req §4 Variante c), außerhalb dieses Plans.
- **Kein Seitenumbruch-Node** (Req §5.4/§5.12): verifiziert, Schema hat keinen. Sobald
  `seitenumbruch` einen einführt, muss dessen Keymap prüfen, ob der Fokus im Footer liegt, und
  die Einfügung dort abfangen — Folgepunkt, nicht Teil dieses Plans.
- **`meta.footerVariantNotice`-Platzierung** (§3.9): transientes Feld im persistierten Modell
  vs. separater Kanal — im Review entscheiden.
- **`kopfzeile-bearbeiten` existiert noch nicht als Code:** Infrastruktur (`FooterBands`,
  Reparenting, `activeArea`, Toolbar-Kontextbindung) bewusst so geschnitten, dass ein
  Kopfzeilen-Feature sie parallelisieren/generalisieren (z. B. `useChromeEditor(area)`) kann —
  Generalisierung erst, wenn beide existieren.

---

## 10. Scope-Abgrenzung zu `seitenzahl-einfuegen` (verbindlich)
Der Slug `seitenzahl-einfuegen` (`seitenzahl-einfuegen-req.md`, Geltungsbereich Z. 14–18)
**besitzt** den Feld-Node und dessen Ein-/Ausgabe. Dieser Plan baut davon **nichts**:
- **Kein** `page_number_field`-Schema-Node (§3.1), **kein** Einfüge-Kommando (§3.3), **kein**
  `w:fldChar`/`text:page-number`-**Writer**, **kein** „Seitenzahl einfügen"-Button (§3.12.5).
- Dieser Plan stellt nur sicher, dass (a) die Fußzeilen-Editor-Architektur einen künftigen
  Feld-Node **nicht verbaut** (Schema bleibt additiv erweiterbar, `validateDocument` bleibt
  tolerant, §1.2/§3.1) und (b) ein **bereits vorhandenes** Feld seinen Textwert behält — was
  der Reader schon heute tut (§1.9).
- Ein künftiger `seitenzahl-einfuegen-code.md` führt den Feld-Node **einmalig** ein und darf
  sich für die Fußzeilen-Bearbeitbarkeit (seine blockierende Voraussetzung,
  `seitenzahl-einfuegen-req.md` §0.2) auf die hier gebaute zweite Editor-Instanz stützen.
