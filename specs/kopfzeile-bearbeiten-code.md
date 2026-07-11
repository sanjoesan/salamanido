# Umsetzungsplan (Code-Ebene): Feature „Kopfzeile bearbeiten"

Bezug: `specs/kopfzeile-bearbeiten-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/9/17/20/21,
`specs/fusszeile-bearbeiten-req.md` (Schwester-Feature, gemeinsamer Mechanismus), `FEATURE-BACKLOG.md`
Abschnitt 3.7. Dieser Plan wurde gegen den tatsächlichen Code-Stand im Repo (Stand 2026-07-04) verifiziert
— nicht nur gegen die Beschreibung in der Anforderung. Die Anforderung selbst wurde zusätzlich empirisch
gegen die fünf in ihr genannten realen Kopfzeilen-Fixtures geprüft (per Vitest-Wegwerf-Testdatei, siehe
Abschnitt 0); dabei wurden **zwei zusätzliche, bisher nicht dokumentierte, konkrete Reader/Writer-Bugs**
gefunden, die über das hinausgehen, was `kopfzeile-bearbeiten-req.md` Befund 2/3 bereits beschreibt.

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers". Es ändert selbst noch keinen Code. Es
beantwortet außerdem alle in der Anforderung offen gelassenen Architektur-/Produktfragen (insbesondere
Abschnitt 1 Zeile 128 „eigene Einfügen/Layout-Gruppe", Abschnitt 3.4 Priorisierung, Grenzfall 7/8/11),
damit die Umsetzung nicht an ungeklärten Fragen hängen bleibt.

---

## 0. Verifikation des Ist-Stands — inklusive neuer, empirisch belegter Befunde

Alle in `kopfzeile-bearbeiten-req.md` Abschnitt 0 (Befund 1–8) zitierten Fundstellen wurden erneut gegen
den Code gelesen. Ergebnis: **alle dortigen Angaben treffen zu.** Zusätzlich wurden die fünf in Abschnitt
5.1.3 der Anforderung genannten realen Fixture-Dateien tatsächlich durch `readDocx`/`readOdt` geschickt
(temporäre, nach Auswertung wieder gelöschte Vitest-Dateien — nicht Teil dieses Plans, nur zur
Verifikation) und die vom Writer erzeugte OOXML-Struktur für ein Kopfzeilen-Bild direkt im Zip inspiziert.
Das deckt zwei **zusätzliche, bisher nirgends dokumentierte Bugs** auf, die für die Abnahme dieser
Anforderung (insbesondere Abschnitt 5.1.3 und Grenzfall 6) unmittelbar relevant sind:

### 0.1 Bestätigter Befund aus der Anforderung: `headerFooter.docx` importiert aktuell eine **leere** Kopf-/Fußzeile statt des echten Inhalts

`tests/fixtures/external/docx/headerFooter.docx` enthält in seinem einzigen `w:sectPr`:
```
<w:headerReference w:type="even" r:id="rId4"/>     → header1.xml  → Text: "" (leer)
<w:headerReference w:type="default" r:id="rId5"/>  → header2.xml  → Text: "This is a simple header…"
<w:headerReference w:type="first" r:id="rId8"/>    → header3.xml  → Text: "" (leer)
<w:footerReference w:type="even" r:id="rId6"/>     → footer1.xml  → Text: "" (leer)
<w:footerReference w:type="default" r:id="rId7"/>  → footer2.xml  → Text: "…and this is a simple footer."
<w:footerReference w:type="first" r:id="rId9"/>    → footer3.xml  → Text: "" (leer)
```
`firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')` (`docx/reader.ts:352`) liefert das **erste**
Kindelement in Dokumentreihenfolge — das ist hier `w:type="even"`, nicht `"default"`. Empirisch mit
`readDocx()` gegen genau diese Datei verifiziert: **`doc.header` und `doc.footer` sind nach heutigem
Reader-Stand ein leerer Absatz**, nicht „This is a simple header…"/„…and this is a simple footer.". Das
ist keine theoretische Randbedingung, sondern der **tatsächliche, aktuelle Fehlschlag** genau auf der
Datei, die die Anforderung selbst in 5.1.3 als Pflicht-Rundreise-Fixture vorschreibt. Ohne den in Abschnitt
1.1 unten beschriebenen Fix **kann Testfall 5.1.3 für diese Datei nicht grün werden** — der Inhalt geht
schon beim ersten Import verloren, lange bevor die neue UI überhaupt beteiligt ist.

### 0.2 Neuer Befund: `headerPic.docx` — Bild im Kopfzeilen-Import wird durch `word/styles.xml` ersetzt

`tests/fixtures/external/docx/headerPic.docx` hat genau eine Kopfzeile (`w:type="default"`, `header1.xml`)
mit einem eingebetteten Bild. Das Bild referenziert `r:embed="rId1"`, aufgelöst über
**`word/_rels/header1.xml.rels`** (`rId1` → `media/image1.jpeg`) — nicht über `word/_rels/document.xml.rels`.
`docx/reader.ts:363` ruft aber `readBodyChildren(root, headingInfo, kindByNumId, documentRels, zip)` auf
und reicht dabei **`documentRels`** (die Relationships von `word/document.xml`) durch, in denen `rId1` auf
`styles.xml` zeigt (Type `styles`, nicht `image`). Empirisch verifiziert: Der resultierende `image`-Node
bekommt `src: "data:image/xml;base64,…"` mit dem **Base64-Inhalt von `word/styles.xml`** als Bilddaten —
ein stiller, kompletter Datenverlust des tatsächlichen Bildes, exakt der in Grenzfall 6 und Testfall 5.2.6
geforderte Fall („Kopfzeile mit eingefügtem Bild — … aus Fremddatei importiert"). Ursache: Kopf-/
Fußzeilen-Teile (`header1.xml` etc.) sind in OOXML **eigene Package-Parts** mit **eigenem**
Relationship-Namensraum (`word/_rels/header1.xml.rels`), unabhängig vom Namensraum von
`word/document.xml`. Der Reader kennt bisher nur einen einzigen, globalen Relationship-Namensraum.

### 0.3 Neuer Befund: DOCX-Writer registriert Bilder in Kopf-/Fußzeile im **falschen** Relationship-Namensraum — spiegelbildlicher Schreibfehler

Test: `writeDocx()` mit `header: { content: [{ type: 'image', … }] } }` aufgerufen und das Ergebnis-Zip
inspiziert. Befund: `header1.xml` enthält `<a:blip r:embed="rId1"/>`, aber **es wird keine
`word/_rels/header1.xml.rels`-Datei erzeugt** — `rId1` ist ausschließlich in `word/_rels/document.xml.rels`
definiert (`docx/writer.ts:234-243`, gemeinsame `documentRels`-Instanz für Haupttext **und** Kopf-/
Fußzeile). Das ist nach OPC/OOXML-Spezifikation **ungültig** (eine Relationship-ID ist immer relativ zum
Part, der sie referenziert — `header1.xml` muss seine eigene `.rels`-Datei haben). In echtem
Word/LibreOffice würde das eingebettete Bild in der Kopfzeile **nicht angezeigt** (nicht auflösbare
Relationship-ID). Dass das bisher nie auffiel, liegt exakt an Befund 6 aus der Anforderung: Die
bestehenden Unit-Tests round-tripen nur gegen den **eigenen** (gleich falschen) Reader — Schreib- und
Lesefehler heben sich gegenseitig auf, solange nur mit selbst erzeugten Dateien getestet wird. Sobald der
Reader-Bug aus 0.2 behoben wird (nötig für echte Fremddateien), **würde ohne einen zusätzlichen
Writer-Fix ein bis dahin unbemerkter Regressions-Rundtrip-Bruch für selbst erstellte Kopfzeilen-Bilder
entstehen** (Testfall 5.2.6). Reader- und Writer-Fix müssen daher **gemeinsam** umgesetzt werden.

### 0.4 ODT: Auswahl `[0]`-Master-Page ist für die zwei geprüften Fixtures zufällig korrekt, aber nicht durch Vertrag garantiert

`headerFinal.odt` und `headerFirstPage.odt` enthalten je zwei `style:master-page`-Elemente:
`style:name="Standard"` (Header „Header standard", Footer vorhanden) und
`style:name="Right_20_Page"` (ODF-Escape für „Right Page" — Header „Header right side", kein Footer;
das ist die gerade/ungerade- bzw. „andere rechte Seite"-Variante). `Standard` steht in beiden Dateien
zufällig an Index 0 in Dokumentreihenfolge in `styles.xml`, weshalb `stylesDoc.getElementsByTagNameNS(…,
'master-page')[0]` (`odt/reader.ts:257`) hier **zufällig** die richtige (die tatsächlich für den
Hauptseitenfluss verwendete) Master-Page liefert. Das ist **keine** durch den Code garantierte
Eigenschaft — eine Fremddatei, die `Right_20_Page` zuerst in `styles.xml` auflistet, würde ebenso
`[0]` zurückgeben und die falsche Kopf-/Fußzeile laden, ohne dass der Code das bemerkt. Muss auf eine
namensbasierte, dokumentierte Priorisierung umgestellt werden (Abschnitt 1.2).

### 0.5 Neuer Befund: `tabellen_header_DOC_LO4-1-0.odt` (in Anforderung 5.1.3 gelistet) enthält **gar keine** Seiten-Kopfzeile

Diese Datei wird in `kopfzeile-bearbeiten-req.md` Zeile 322 und Befund 7 als eine der fünf ungetesteten
„Kopfzeilen-Fixtures" geführt. Tatsächliche Prüfung von `styles.xml`: Es gibt genau **ein**
`style:master-page`-Element, `style:name="Standard"`, **selbstschließend** (`<style:master-page
style:name="Standard" style:page-layout-name="Mpm1"/>`) — **kein** `style:header`- oder
`style:footer`-Kindelement. Der Dateiname/die Herkunft (`tabellen_header_DOC_LO4-1-0` aus dem
ODF-Toolkit-Testkorpus) bezieht sich auf eine **Tabellen**-Kopfzeile: `content.xml` enthält eine Tabelle
(`table:name="Table1"`), deren erste Zeile eine über 4 Spalten verbundene, gesondert formatierte
„Überschriftszeile" ist („Zusatzinformationen von auswärtigen Personen") — eine normale
Dokumentstruktur, **kein** ODF-Seiten-Kopf-/Fußzeilen-Mechanismus. **Konsequenz für Testfall 5.1.3:**
Für diese Datei ist das korrekte, erwartete Ergebnis nach Import `header === null` **und**
`footer === null` — ein Fixture-Test, der hier Kopfzeilentext erwartet, würde fälschlicherweise
fehlschlagen. Der Test für diese Datei deckt de facto denselben Fall wie 5.1.1/5.1.2 ab („Datei ohne
Kopfzeile bleibt `header === null`"), nur zusätzlich mit einer Tabelle im Hauptinhalt. Dies muss in der
Testimplementierung (Abschnitt 7.2) korrekt reflektiert werden, sonst entsteht ein sofort roter,
aber inhaltlich falsch begründeter Test.

### 0.6 Einordnung gegenüber Anforderung Abschnitt 3.8

Abschnitt 3.8 der Anforderung geht davon aus, Reader/Writer erfüllten die Rundreise-Anforderung für den
„Standard"-Fall bereits vollständig und „dürfen nicht unnötig verändert werden". Die Befunde 0.1–0.3 oben
zeigen: **das trifft für reale Fremddateien mit mehreren Kopf-/Fußzeilen-Varianten (0.1) und für
Bilder in Kopf-/Fußzeile (0.2/0.3) nachweislich nicht zu.** Abschnitt 3.8 der Anforderung selbst
formuliert die Einschränkung „sofern sie die Rundreise-Anforderung aus Abschnitt 5 bereits erfüllen" —
diese Bedingung ist für die drei genannten Fälle nicht erfüllt, weshalb die in Abschnitt 1.1/1.3 dieses
Plans beschriebenen Reader/Writer-Änderungen **im Rahmen dieser Anforderung selbst** notwendig sind, nicht
optionale Zusatzarbeit.

### 0.7 Nachverifikation gegen den aktuellen Code (Stand 2026-07-05) — Korrekturen dieser Planfassung

Der Code wurde nach dem Merge des Nachbar-Slugs `ausschneiden` (Commits `9f8fa03`,
`db61c89`, `175d86d`, `29cbc80`) **erneut vollständig gegen den aktuellen Stand gelesen**. Ergebnis:
Alle **Symbolnamen und die Logik-/Bug-Analyse der Abschnitte 0.1–0.6 und 1–11 bleiben gültig**, aber
vier Dinge müssen korrigiert werden, weil frühere Fassungen dieses Plans gegen einen **älteren**
Code-Snapshot geschrieben wurden als die Anforderung selbst:

**(1) Zeilennummern in den DOCX-/ODT-Reader/Writer-Abschnitten waren veraltet.** Der Plan zitierte z. B.
`docx/reader.ts:352` und `odt/reader.ts:257`; die tatsächlichen (und mit der Anforderung Befund 2/4
übereinstimmenden) Stellen sind unten aufgeführt. Maßgeblich bleibt laut Anforderung der **Symbolname**;
die folgende Tabelle bringt die Zeilen auf den heutigen Stand, damit der Umsetzer nicht in die Irre geht:

| Symbol / Stelle | Datei | veraltet im Plan | **aktuell** |
|---|---|---|---|
| `firstChildNS(sectPr, w, 'headerReference')` / `'footerReference'` | `docx/reader.ts` | 352–353 | **509–510** |
| `sectPr = firstChildNS(bodyEl, w, 'sectPr')` | `docx/reader.ts` | 350 | **507** |
| Header-Ladeblock (`readBodyChildren(root, …, documentRels, zip)`) | `docx/reader.ts` | 357–365 | **514–522** (Aufruf Z. 520) |
| Footer-Ladeblock | `docx/reader.ts` | 366–374 | **523–531** (Aufruf Z. 529) |
| `readRelationships` | `docx/reader.ts` | 23–34 | **24–35** |
| `childElements` | `docx/reader.ts` | — | **16–18** |
| `readBodyChildren` (Signatur mit `imageRels`) | `docx/reader.ts` | 307–313 | **464–470** |
| `resolveImageSources` (hartkodiert `'word/document.xml'`) | `docx/reader.ts` | 285–305 | **442–462** (Pfad Z. 446) |
| `documentRels = readRelationships(…document.xml.rels)` | `docx/reader.ts` | — | **501** |
| `writeDocx` | `docx/writer.ts` | 222–267 | **252–318** |
| `if (header) { buildHeaderFooterXml('hdr', …) … }` (gemeinsame `documentRels`) | `docx/writer.ts` | 264–268 | **264–268** (Aufruf `blocksToDocx(header.content, images, documentRels)` Z. 265) |
| `if (footer) { … }` | `docx/writer.ts` | — | **269–273** |
| `buildContentTypesXml(!!header, !!footer, …)`-Aufruf | `docx/writer.ts` | 238 | **290** (Funktion 229–250; Header-`Override` Z. 238) |
| `<Default Extension="rels" …/>` | `docx/writer.ts` | 214 | **244** |
| `document.xml.rels` serialisieren | `docx/writer.ts` | 297 | **299** |
| `RelationshipRegistry` / `RELATIONSHIP_TYPES`-Import | `docx/writer.ts` | — | **4** (`./relationships`) |
| `getElementsByTagNameNS(style, 'master-page')[0]` | `odt/reader.ts` | 257 | **375** |
| Header/Footer-Extraktion aus Master-Page | `odt/reader.ts` | 258–269 | **376–388** |
| `style:master-page style:name="Standard"` (Writer) | `odt/writer.ts` | 149 | **226** (Funktion `buildStylesXml` 216–233) |
| `doc: { content: 'block+' }` | `shared/schema.ts` | 7 | **14** |

**Nachverifiziert in diesem Pipeline-Durchlauf (Stand 2026-07-05, nach dem `ausschneiden`-Merge):** Die
`WordEditor.tsx`-Zeilennummern sind **inzwischen gedriftet** (frühere Fassungen dieses Absatzes behaupteten
fälschlich, sie seien noch aktuell). Ursache: Die transiente `cutError`-Auto-Dismiss-Logik wurde aus dem
früheren **Inline-`useEffect`** in einen wiederverwendbaren Custom-Hook **`useAutoDismiss(value, setValue, ms)`**
(`WordEditor.tsx:52–63`, aufgerufen als `useAutoDismiss(cutError, setCutError)` in Z. 74) **ausgelagert**,
und `cutError` steht jetzt hinter dem lokalen `forceRender`-State. Dadurch hat sich der gesamte
Funktionsrumpf um ~8–13 Zeilen nach unten verschoben. Aktuelle Stellen (maßgeblich bleibt der **Symbolname**):

| Symbol / Stelle | veraltet in früheren Absatzfassungen | **aktuell** |
|---|---|---|
| `reconcileSelectionOnClick` | 43–50 | **43–50** (unverändert) |
| `useAutoDismiss`-Hook-Definition (ersetzt den früheren Inline-`useEffect`) | (Inline-`useEffect` 62–66) | **52–63** (Aufruf Z. 74) |
| `viewRef` | 54 | **67** |
| `onChangeRef` | 121 (`.current`-Aufruf) | **68** (Definition), `.current`-Aufruf in `dispatchTransaction` Z. **129** |
| `forceRender`-State (im Plan zu `setTick` umbenannt, 4.1 Punkt 3) | — | **70** (Deklaration), Bump in Z. **131** und **136** |
| `cutError`-State | 58 | **71** |
| Body-Seed (`wordSchema.nodeFromJSON(doc.content.body)`) | 71 | **79** |
| `'Shift-Enter': insertHardBreak()` | 89 | **97** |
| `'Shift-Delete': cutSelection({ onCutBlocked: setCutError })` | 98 | **106** |
| Mod-c/x/v-Verzicht-Kommentar | 78–84 | **86–92** |
| `createPaginationPlugin()` (argumentlos) | 105 | **113** |
| `new EditorView(...)` / `clipboardTextSerializer` | 114 | **122** / **124** |
| `dispatchTransaction` | 117–124 | **125–132** |
| mousedown/mouseup-Listener-Registrierung | 146–147 (bzw. „103–104" in 4.1 Punkt 7) | **154–155** |
| `<Toolbar view={viewRef.current} cutError=… setCutError=… />` | 162 | **170** |

`Toolbar.tsx`s **Kern-Symbole aus Punkt (2)** (`ToolbarProps` 22–26, `ScissorsIcon` 33–53, `run()` 28–31)
sind weiterhin **korrekt**. Aber die in Abschnitt 4.2 Punkt 1 genannte Einfüge-Ankerstelle „bestehende
Tabelle/Bild-Gruppe (`Toolbar.tsx:226–244`)" ist **veraltet** — die Tabelle-/Bild-Buttons stehen aktuell in
`Toolbar.tsx:277–294` (die neue Kopfzeilen-Gruppe wird nach dem `🖼 Bild`-`<label>` in Z. 291–294
angehängt); und der in 4.3 zitierte `run()`-Helper liegt in **28–31**, nicht „23–26". **Allgemein: Die noch
in den Prosa-Abschnitten 3.2/4.x/5.x/6.x verstreuten Inline-Zeilennummern können gegenüber dem heutigen
Code driften — verbindlich sind die Symbolnamen und die beiden Korrekturtabellen hier in 0.7, nicht die
Prosa-Zeilenzahlen.**

**Verifizierte API-Voraussetzung:** `RelationshipRegistry` (`docx/relationships.ts`) besitzt `.all(): Relationship[]`
(Z. 19–21) und `.serialize(): string` (Z. 23–31). Die in Abschnitt 1.3/5.2 verwendeten
`headerRels.all().length`- und `headerRels.serialize()`-Aufrufe sind damit gedeckt — **keine** Ergänzung
der Klasse nötig.

**(2) Der Ausschneiden-Merge macht `Toolbar` und `WordEditor` reicher als in Abschnitt 4 abgebildet —
Regressionsgefahr.** Der aktuelle Code enthält bereits:
- `ToolbarProps = { view; cutError: string | null; setCutError: (m: string | null) => void }`
  (`Toolbar.tsx:22–26`), ein eingebettetes `ScissorsIcon` (`Toolbar.tsx:33–53`, das exakt das in
  Abschnitt 3.3 geforderte SVG-Muster **bereits liefert** — `HeaderIcon` ist also 1:1 daran zu
  orientieren, nicht neu zu erfinden), sowie einen `run(view, command)`-Helper (`Toolbar.tsx:28–31`).
- In `WordEditor.tsx`: `const [cutError, setCutError] = useState<string | null>(null)` (Z. **71**), das
  Auto-Dismiss-Verhalten jetzt über den Custom-Hook `useAutoDismiss(cutError, setCutError)` (Z. **74**,
  Hook-Definition **52–63** — **nicht mehr** ein Inline-`useEffect`), die Body-Keymap-Bindung
  `'Shift-Delete': cutSelection({ onCutBlocked: setCutError })` (Z. **106**) und
  `'Shift-Enter': insertHardBreak()` (Z. **97**), und den Toolbar-Aufruf
  `<Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />` (Z. **170**).

**Konsequenz (bindend für Abschnitt 3.2, 4.1, 4.2):**
- Die in Abschnitt 4.2 vorgeschlagene `ToolbarProps`-Erweiterung darf `cutError`/`setCutError` **nicht
  entfernen**, sondern muss sie **behalten** und die vier neuen Kopfzeilen-Props **ergänzen** (korrigierte
  Fassung siehe Abschnitt 4.2 unten).
- Der `<Toolbar .../>`-Aufruf in Abschnitt 4.1 muss `cutError`/`setCutError` weiterhin durchreichen und
  das bestehende Cut-Fehler-Feedback (das heute unter der Toolbar gerendert wird) erhalten.
- Die **Kopfzeilen-`EditorView`** braucht für die von Anforderung 3.2 geforderte Funktionsparität
  (Ausschneiden/Kopieren/Einfügen, Shift-Enter) **denselben Plugin-/Keymap-Stack wie die Body-View minus
  `createPaginationPlugin()`** — inklusive `'Shift-Delete': cutSelection({ onCutBlocked: setCutError })`,
  `'Shift-Enter': insertHardBreak()`, `keymap(baseKeymap)`, `columnResizing()`, `tableEditing()`,
  `dropCursor()`, `gapCursor()` und `clipboardTextSerializer`. Der bewusste Verzicht auf `Mod-c/x/v`
  (native Clipboard-Behandlung, siehe `WordEditor.tsx:86–92`) gilt für die Kopfzeile identisch. Die in
  Abschnitt 3.2 gezeigte Keymap ist entsprechend zu ergänzen (korrigierte Fassung dort).
- `setCutError` ist gemeinsamer `WordEditor`-State und wird an **beide** Views (Body **und** Kopfzeile)
  als `onCutBlocked` gereicht; das eine Fehlerbanner unter der (kontextsensitiven) Toolbar deckt beide ab.

**(3) ODT-Master-Page-Auswahl muss mit dem Schwester-Plan `fusszeile-bearbeiten-code.md` §3.8
zusammenfallen — es ist derselbe Code-Pfad.** `odt/reader.ts` liest **eine** Master-Page (Z. 375) und
leitet daraus **sowohl** `headerEl` **als auch** `footerEl` ab (Z. 377–378). Kopf- und Fußzeilen-Feature
teilen sich diese Auswahl also zwingend. Der Schwester-Plan hat die Heuristik an der **härteren** realen
Datei `HeaderFirstAndEvenPageEnabled_MSO15.odt` verifiziert, in der **keine** Master-Page „Standard" heißt
(sie heißen `MP0`/`MPF0`, verkettet über `style:next-style-name`). Die in Abschnitt 1.2 dieses Plans
ursprünglich gewählte Heuristik „bevorzuge `style:name=\"Standard\"`, sonst die erste" wurde nur an
`headerFinal.odt`/`headerFirstPage.odt` (beide **haben** eine „Standard"-Page) geprüft und würde auf der
MSO15-Datei genau auf den in Befund 0.4 selbst benannten „nimm die erste in Dokumentreihenfolge"-Zufall
zurückfallen. **Entscheidung: Abschnitt 1.2 wird auf die robustere, gemeinsam genutzte Heuristik
umgestellt** (Ziel einer `next-style-name`-Kette zuerst, dann `Standard`, dann die erste gefundene — siehe
korrigierte Fassung in Abschnitt 1.2). Wer von beiden Features zuerst umsetzt, legt genau **eine**
`pickMasterPage`-Funktion an; der zweite verwendet sie unverändert.

**(4) Pagination-Signatur mit dem Schwester-Plan vereinheitlichen.** `createPaginationPlugin()` nimmt
heute **kein** Argument (`pagination.ts:72`). Dieser Plan (Abschnitt 1.6/4.4) und
`fusszeile-bearbeiten-code.md` §3.4 fügen **beide** einen Seitenzahl-Callback hinzu, aber mit
unterschiedlicher Signatur (Objekt-Form `{ onPageCountChange }` vs. Positional `onPageCountChange?`). Da
es dieselbe Funktion ist: **verbindlich die Positional-Form `createPaginationPlugin(onPageCountChange?:
(count: number) => void)`** verwenden (schlichter, und der Schwester-Plan hat sie so bereits ausformuliert).
Der bestehende argumentlose Aufruf bleibt gültig (Kopfzeilen-View bindet das Plugin ohnehin nicht ein).

---

## 1. Architektur-/Produktentscheidungen

### 1.1 DOCX-Reader: Typ-Priorisierung für `headerReference`/`footerReference` (setzt Anforderung 3.4 um, behebt Befund 0.1)

> **Gemeinsamer Code-Pfad mit `fusszeile-bearbeiten-code.md` §3.6a.** `pickReference` wählt aus **einem**
> `sectPr` sowohl die Kopf- als auch die Fußzeilen-Referenz (Z. 509–510). Beide Features müssen **eine**
> gemeinsame Helferfunktion nutzen; der Schwester-Plan nennt sie `pickSectionReference` und gibt zusätzlich
> ein `hasVariants`-Flag für einen sichtbaren „mehrere Kopf-/Fußzeilen-Varianten importiert"-Hinweis zurück.
> Wer zuerst umsetzt, legt genau eine Funktion an; die Prioritätsreihenfolge (`default` zuerst) ist in beiden
> Plänen identisch, nur die Rückgabesignatur ist im Schwester-Plan reicher (`{ el, hasVariants }`) — diese
> reichere Signatur übernehmen, damit der Varianten-Hinweis (Anforderung 3.4 „dokumentieren, welche
> übernommen wird") nicht verloren geht.

**Entscheidung:** Deterministische Priorität **`default` → `first` → `even` → (irgendein anderer
gefundener Typ)**, dokumentiert in Code-Kommentar und in diesem Plan. Begründung: `default` ist der in
jeder Word-Datei mit nur einer Kopfzeile allein vorkommende Typ und der inhaltlich „normale" Fall
(Abschnitt 3.3 der Anforderung: „Standard"-Kopfzeile auf jeder Seite); er ist damit die sinnvollste Wahl,
wenn mehrere Typen vorhanden sind, weil er in der Praxis meist auch der inhaltsreichste ist (siehe 0.1:
`default` = „This is a simple header…", `even`/`first` = leer). `first`/`even` als Fallback, weil sie
zumindest nicht „totale Leere" wären, falls einmal kein `default` vorhanden ist.

Neue Hilfsfunktion in `src/formats/docx/reader.ts`, oberhalb von `readDocx` (ersetzt die Verwendung von
`firstChildNS(sectPr, …, 'headerReference')`/`'footerReference'` an den Stellen `reader.ts:352-353`):
```ts
const HEADER_FOOTER_TYPE_PRIORITY = ['default', 'first', 'even'] as const

/** Picks one w:headerReference/w:footerReference from a sectPr that may contain up to three
 *  (default/first/even). Real files with "erste Seite anders" or "gerade/ungerade" (see
 *  kopfzeile-bearbeiten-req.md Abschnitt 3.4, fusszeile-bearbeiten-req.md Abschnitt 9) are not fully
 *  supported yet — this app shows exactly one variant. Priority: default, then first, then even, then
 *  whatever else is present, so the most likely "main content" variant wins deterministically instead
 *  of "whichever happened to be listed first in the XML" (see kopfzeile-bearbeiten-code.md Abschnitt 0.1
 *  for a real file where "first in document order" picked an empty header over the real one). */
function pickReference(sectPr: Element, localName: 'headerReference' | 'footerReference'): Element | null {
  const candidates = childElements(sectPr, OOXML_NAMESPACES.w, localName)
  if (candidates.length === 0) return null
  for (const type of HEADER_FOOTER_TYPE_PRIORITY) {
    const match = candidates.find((el) => el.getAttributeNS(OOXML_NAMESPACES.w, 'type') === type)
    if (match) return match
  }
  return candidates[0]
}
```
In `readDocx` (`reader.ts:352-353`):
```ts
const headerRef = pickReference(sectPr, 'headerReference')
const footerRef = pickReference(sectPr, 'footerReference')
```
(Rest der Funktion — Relationship-Auflösung, `readBodyChildren`-Aufruf — bleibt strukturell gleich,
siehe 1.3 für die zusätzliche Relationship-Namensraum-Korrektur derselben Stelle.)

**Dokumentationspflicht (Anforderung 3.4):** Dieser Plan selbst ist die geforderte Dokumentation der
Priorisierung; nach Umsetzung ist in `kopfzeile-bearbeiten-req.md` Abschnitt 3.4 nachzutragen: „Priorität
`default` → `first` → `even`, siehe `kopfzeile-bearbeiten-code.md` Abschnitt 1.1."

### 1.2 ODT-Reader: deterministische Master-Page-Auswahl (setzt Anforderung 3.4 um, behebt Befund 0.4)

> **Aktualisiert (siehe 0.7 Punkt 3):** Diese Auswahl ist **derselbe Code-Pfad** wie in
> `fusszeile-bearbeiten-code.md` §3.8 — `odt/reader.ts` liest genau **eine** Master-Page (Z. **375**) und
> leitet daraus **Kopf- und** Fußzeile ab (Z. 377–378). Beide Features müssen dieselbe `pickMasterPage`-
> Funktion verwenden. Die ursprünglich hier gewählte „nur `Standard`-bevorzugt"-Heuristik war nur an
> Fixtures mit `Standard`-Page verifiziert; der Schwester-Plan hat an `HeaderFirstAndEvenPageEnabled_MSO15.odt`
> gezeigt, dass reale Dateien Master-Pages `MP0`/`MPF0` (keine „Standard") führen. Deshalb die robustere,
> gemeinsame Heuristik unten.

**Entscheidung (verbindlich, mit `fusszeile-bearbeiten-code.md` §3.8 identisch):** Priorität
**(1) Ziel einer `style:next-style-name`-Kette** (die Folgeseiten-Master-Page; die Quelle einer solchen
Kette ist typischerweise die „erste Seite anders"-Variante) → **(2) Master-Page `style:name="Standard"`**
(u. a. von unserem eigenen Writer erzeugt, `odt/writer.ts:226`) → **(3) die erste in Dokumentreihenfolge**
(bewusst dokumentierter letzter Fallback, kein Absturz, kein Totalverlust). Begründung: Deckt sowohl die
`Standard`-Fixtures (0.4) als auch die MSO15-Mehrfach-Master-Page (Schwester-Plan §1.8) korrekt ab.

In `src/formats/odt/reader.ts`, Ersatz für die Inline-Auswahl `getElementsByTagNameNS(style,
'master-page')[0]` (**`reader.ts:375`**):
```ts
/** Picks one style:master-page deterministically from a styles.xml that may contain several
 *  (real files with "erste Seite anders"/gerade-ungerade do). Shared by header & footer, since
 *  odt/reader.ts derives both from a single master-page. Priority (see kopfzeile-bearbeiten-code.md
 *  Abschnitt 1.2/0.7 and fusszeile-bearbeiten-code.md §3.8):
 *   1. the TARGET of a style:next-style-name chain (the regular follow-on page — its source is
 *      usually the first-page variant), verified against HeaderFirstAndEvenPageEnabled_MSO15.odt;
 *   2. else the master-page literally named "Standard" (our own writer's name, and LibreOffice's
 *      non-localized default);
 *   3. else the first in document order — a documented, deterministic last resort, never a crash. */
function pickMasterPage(stylesDoc: Document): Element | null {
  const all = Array.from(stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page'))
  if (all.length <= 1) return all[0] ?? null
  const chainTargets = new Set(
    all
      .map((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'next-style-name'))
      .filter((v): v is string => !!v),
  )
  const chained = all.find((el) => chainTargets.has(el.getAttributeNS(ODF_NAMESPACES.style, 'name') ?? ''))
  if (chained) return chained
  const standard = all.find((el) => el.getAttributeNS(ODF_NAMESPACES.style, 'name') === 'Standard')
  return standard ?? all[0] ?? null
}
```
Aufruf (`reader.ts:375`):
```ts
const masterPage = pickMasterPage(stylesDoc)
```
**Dokumentationspflicht:** analog 1.1, Nachtrag in `kopfzeile-bearbeiten-req.md` Abschnitt 3.4: „ODT:
bevorzugt das Ziel einer `next-style-name`-Kette, sonst Master-Page `style:name=\"Standard\"`, sonst die
erste gefundene — identisch zum Fußzeilen-Feature."

### 1.3 DOCX Reader **und** Writer: eigener Relationship-Namensraum je Kopf-/Fußzeilen-Part (behebt Befund 0.2/0.3)

**Entscheidung: beide Seiten reparieren, gemeinsam in einem Schritt** (siehe 0.3 — getrennt umgesetzt
entstünde eine Regression). Kein neues Datenmodell-Attribut nötig, nur interne Reader/Writer-Mechanik.

**Reader** (`src/formats/docx/reader.ts`): `readBodyChildren` bekommt zusätzlich den Part-Pfad, aus dem
seine eigene `.rels`-Datei abgeleitet wird, und lädt diese **statt** pauschal `documentRels`
durchzureichen, wenn es sich um einen Header-/Footer-Part handelt:
```ts
function relsPathFor(partPath: string): string {
  const slash = partPath.lastIndexOf('/')
  const dir = slash >= 0 ? partPath.slice(0, slash) : ''
  const file = slash >= 0 ? partPath.slice(slash + 1) : partPath
  return dir ? `${dir}/_rels/${file}.rels` : `_rels/${file}.rels`
}
```
In `readDocx`, an den beiden Stellen `reader.ts:357-365`/`366-374` (Header- bzw. Footer-Auflösung): nach
Ermitteln von `path` (z. B. `word/header2.xml`) zusätzlich `const partRels = await
readRelationships(zip, relsPathFor(path))` laden und **diese** (statt `documentRels`) als
`imageRels`-Argument an `readBodyChildren` übergeben:
```ts
if (headerRelId && documentRels.has(headerRelId)) {
  const path = resolvePartPath('word/document.xml', documentRels.get(headerRelId)!)
  const text = await zip.file(path)?.async('text')
  if (text) {
    const headerDoc = parseXmlDocument(text)
    const root = headerDoc.documentElement
    const headerRels = await readRelationships(zip, relsPathFor(path))
    headerBlocks = await readBodyChildren(root, headingInfo, kindByNumId, headerRels, zip)
  }
}
```
(Analog für `footerRelId`/`footerBlocks`.) `readRelationships` existiert bereits (`reader.ts:23-34`) und
gibt eine leere `Map` zurück, wenn die Datei fehlt (z. B. eine Kopfzeile ganz ohne Bild hat oft gar keine
`.rels`-Datei) — kein zusätzlicher Sonderfall nötig.

Die `resolveImageSources`-Funktion (`reader.ts:285-305`) resolved Bildpfade weiterhin relativ zu
`'word/document.xml'` (hartkodiert). Das bleibt für diesen Plan **unverändert** — beide Fixtures und
alle realen Word-Header/Footer-Parts liegen im selben `word/`-Verzeichnis wie `document.xml`, daher
liefert `resolvePartPath('word/document.xml', 'media/image1.jpeg')` dasselbe Ergebnis wie
`resolvePartPath('word/header1.xml', 'media/image1.jpeg')` (beide Basispfade teilen sich denselben
Ordner). Eine Umstellung auf den tatsächlichen Part-Pfad wäre sauberer, ist aber durch keine der
Anforderungen/Grenzfälle erzwungen und wird als nicht-blockierende Folgearbeit vermerkt (Abschnitt 11).

**Writer** (`src/formats/docx/writer.ts`): eigene `RelationshipRegistry`-Instanz je Kopf-/Fußzeilen-Part,
zusätzlich zur bestehenden `documentRels` (für den Header-Reference-Eintrag selbst, der weiterhin in
`document.xml.rels` steht — das ist korrekt, nur die **innerhalb** von `header1.xml` referenzierten
Bild-IDs müssen in `header1.xml.rels` stehen). Ersatz für `writer.ts:222-267`:
```ts
export async function writeDocx(doc: WordDocumentContent): Promise<Blob> {
  const images = new ImageCollector()
  const documentRels = new RelationshipRegistry()
  const headerRels = new RelationshipRegistry()
  const footerRels = new RelationshipRegistry()

  const bodyXml = blocksToDocx((doc.body as unknown as { content: JsonNode[] }).content, images, documentRels)

  const header = doc.header as unknown as { content: JsonNode[] } | null
  const footer = doc.footer as unknown as { content: JsonNode[] } | null

  let sectPrExtra = ''
  let headerXml: string | null = null
  let footerXml: string | null = null
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
  // … (documentRels.add for styles/numbering, buildDocumentXml etc. — unverändert) …

  const wordFolder = zip.folder('word')!
  wordFolder.file('document.xml', documentXml)
  wordFolder.file('styles.xml', stylesXml)
  wordFolder.file('numbering.xml', numberingXmlContent)
  if (headerXml) wordFolder.file('header1.xml', headerXml)
  if (footerXml) wordFolder.file('footer1.xml', footerXml)
  wordFolder.folder('_rels')!.file('document.xml.rels', documentRels.serialize())
  if (headerXml && headerRels.all().length > 0) {
    wordFolder.folder('_rels')!.file('header1.xml.rels', headerRels.serialize())
  }
  if (footerXml && footerRels.all().length > 0) {
    wordFolder.folder('_rels')!.file('footer1.xml.rels', footerRels.serialize())
  }
  // … Bilddateien wie bisher (images.all(), gemeinsamer Medienordner bleibt korrekt — nur die
  // Relationship-ID-Namensräume mussten getrennt werden, nicht die physischen Bilddateien) …
}
```
`.rels`-Datei wird nur erzeugt, wenn tatsächlich mindestens eine Relationship (z. B. ein Bild) im
jeweiligen Teil vorkommt — eine reine Text-Kopfzeile braucht keine `header1.xml.rels`, genau wie ein
Text-`document.xml` ohne Bilder heute auch keine Bild-Relationships hat (Konsistenz mit bestehendem
Muster, kein leerer XML-Ballast).

**Warum das keine Verletzung von Anforderung 3.8 ist:** siehe Befund 0.6 — die Rundreise-Anforderung ist
für Bilder in Kopf-/Fußzeile ohne diesen Fix nachweislich nicht erfüllt (0.2/0.3), Abschnitt 3.8 verlangt
Zurückhaltung ausdrücklich nur, „sofern" die Rundreise bereits funktioniert.

### 1.4 Aktivierungs-/Entfernungs-Zustandsmodell (setzt Anforderung 3.1/3.5/3.6 um)

**Kein neuer Zustand im Datenmodell nötig** (Anforderung 3.8 bestätigt: `WordDocumentContent.header:
ProseMirrorJSON | null` reicht). Es werden zwei orthogonale Zustände unterschieden, die **beide** allein
aus vorhandenen bzw. minimal neuen React-State-Variablen ableitbar sind:

1. **Sichtbarkeit/Existenz** = `header !== null`. Import einer Datei mit Kopfzeile → sofort sichtbar
   (Anforderung 3.1, dritter Punkt). Neues Dokument/Datei ohne Kopfzeile → Bereich existiert, ist aber
   „leer/eingeklappt" bis zur ersten Aktivierung (siehe Abschnitt 1.6, Randbereich wird trotzdem für
   Doppelklick sensitiv gerendert — Requirement, dass ein Doppelklick auf einer beliebigen sichtbaren
   Seite funktionieren muss, auch bevor `header` existiert).
2. **Fokus/Edit-Modus** = ob die Kopfzeilen-`EditorView` aktuell den DOM-Fokus hat (verfolgt über einen
   neuen `focusedRegion: 'body' | 'header'`-State in `WordEditor.tsx`, siehe Abschnitt 1.5).

**Toolbar-Button „Kopfzeile bearbeiten" (Anforderung Abschnitt 1, Zeile 1) ist *kein* Toggle-Button für
Zustand 1** — er hat exakt zwei Wirkungen, je nach Zustand 1:
- `header === null`: `onChange({ ...content, header: emptyDocJSON() })` **und** Fokus auf die (dadurch neu
  gemountete) Kopfzeilen-`EditorView` setzen.
- `header !== null`: nur Fokus auf die bereits existierende Kopfzeilen-`EditorView` setzen (kein
  erneutes `onChange`).

  Begründung: Die Anforderungstabelle selbst führt „Kopfzeile aktivieren" (Zeile 1) und „Kopfzeile
  entfernen" (Zeile 5) als **zwei separate** Bedienelemente — kein Hinweis auf ein „erneuter Klick
  deaktiviert"-Verhalten. Das deckt sich mit dem in Word/LibreOffice tatsächlichen Verhalten (Ribbon-
  Button „Kopfzeile" öffnet/fokussiert nur, ein separater Menüpunkt „Kopfzeile entfernen" existiert
  eigenständig). `aria-pressed` des Buttons spiegelt stattdessen **Zustand 2** wider (`focusedRegion ===
  'header'`) — ergibt „kostenlos" die in `fusszeile-bearbeiten-req.md` Zeile 68 als „nice-to-have"
  bezeichnete Statusanzeige „wo bin ich" auch fürs Kopfzeilen-Pendant, ohne zusätzlichen Aufwand.

**Button „Kopfzeile entfernen" (Anforderung Zeile 132/3.6):** `onChange({ ...content, header: null })`,
keine Bestätigungsabfrage (anders als das Schwester-Feature `fusszeile-bearbeiten-req.md` Zeile 67, das
für Fußzeile explizit einen Bestätigungsdialog verlangt — diese Anforderungsdatei enthält **keine**
entsprechende Forderung für Kopfzeile; Abschnitt 3.6 verlangt nur „ein expliziter Weg … muss existieren",
keinen Schutz vor versehentlichem Klick). Da dies eine bewusste Abweichung vom Schwester-Feature ist,
wird sie hier explizit festgehalten (Anforderung, Geltungsbereich: „wo beide Funktionen … denselben
Mechanismus teilen … damit diese Abhängigkeit nicht übersehen wird" — hiermit vermerkt: **kein**
gemeinsamer Bestätigungsdialog-Mechanismus in dieser Iteration, da die beiden Anforderungstexte hier
tatsächlich unterschiedliche Vorgaben machen. Sollte sich das als Inkonsistenz für Nutzer:innen erweisen,
ist das ein Nachtrag für `fusszeile-bearbeiten-req.md`/diese Datei, nicht stillschweigend hier zu lösen).

**Geleerter, aber nicht entfernter Kopfzeilentext (Grenzfall 2, Anforderung 3.6 Satz 1):** Entf über den
gesamten Kopfzeilentext setzt lediglich den ProseMirror-Doc-Inhalt der Kopfzeile auf einen leeren Absatz
zurück (normales ProseMirror-Verhalten, keine Sonderbehandlung nötig) — `header` bleibt ein Objekt
(`{ type: 'doc', content: [...] }`), wird **nicht** zu `null`. Kein Zusatzcode nötig, ergibt sich
automatisch daraus, dass „Kopfzeile entfernen" ein separater, expliziter Button ist (siehe oben).

**Export einer aktivierten, aber leeren Kopfzeile (Grenzfall 11):** **Entscheidung: bleibt aktiv/leer
exportiert** (führt zu einem leeren, aber vorhandenen `<w:hdr/>`/`w:headerReference`
bzw. `<style:header/>`), **nicht** automatisch zu `null` normalisiert. Begründung: identisch zur bereits
getroffenen Entscheidung im Schwester-Feature (`fusszeile-bearbeiten-req.md` Zeile 174-176: „Empfehlung:
aktiver, aber leerer Zustand bleibt erhalten") — Konsistenz zwischen beiden Features ist hier sinnvoll,
da die Anforderung selbst in Grenzfall 11 explizit offenlässt, welche der beiden Optionen gewählt wird,
und keine gegenteilige Vorgabe wie bei der Bestätigungsdialog-Frage oben existiert. Kein zusätzlicher
Code nötig — Writer/Reader behandeln `header !== null` bereits identisch, ob leer oder befüllt
(`docx/writer.ts:264` `if (header)`, `odt/writer.ts:271` `header ? … : null`, beide prüfen nur die Existenz, nicht den Inhalt).

### 1.5 Zwei-`EditorView`-Architektur mit gemeinsamer, kontextsensitiver Toolbar

**Kernentscheidung:** Kopfzeile bekommt eine eigene, zweite ProseMirror-`EditorView`-Instanz mit eigenem
`EditorState`/`history()` (eigene, von `body` getrennte Undo-Historie — siehe Abschnitt 1.7 für die
Undo-Grenzfälle), analog der bereits in `fusszeile-bearbeiten-req.md` Abschnitt 4 getroffenen Festlegung
für Fußzeile. `Toolbar.tsx` bleibt **eine einzige** Komponenteninstanz (nicht dupliziert), operiert aber
auf einer **variablen** `view`-Prop statt fest auf die Body-View: Anforderung Zeile 136/201 verlangt
ausdrücklich „dieselbe Toolbar wie im Haupttext", nicht zwei separate Toolbars.

`src/formats/shared/editor/WordEditor.tsx` wird zur koordinierenden Komponente, die:
1. beide `EditorView`-Instanzen hält (`bodyViewRef`, `headerViewRef`),
2. einen gemeinsamen `focusedRegion: 'body' | 'header'`-State hält, aktualisiert über einen
   `handleDOMEvents.focus`-Callback in **beiden** Views' Plugin-Konfiguration,
3. einen gemeinsamen `tick`-State (statt des bisherigen lokalen `forceRender`-State, `WordEditor.tsx:70`,
   der heute in `dispatchTransaction` Z. 131/136 gebumpt wird) hält, der von **beiden** Views'
   `dispatchTransaction` hochgezählt wird, damit `Toolbar` (die auf `view.state` zugreift, ohne selbst
   zu subscriben) nach **jeder** Transaktion in **irgendeiner** der beiden Views neu rendert — sonst
   würde z. B. „Fett" im Kopfzeilentext angeklickt, aber der aktive/gedrückte Zustand des Fett-Buttons
   nicht aktualisiert, weil `WordEditor` nicht wüsste, dass sich etwas geändert hat,
4. `<Toolbar view={focusedRegion === 'header' ? headerViewRef.current : bodyViewRef.current} />`
   rendert — vor dem ersten Mount beider Views ist das wie bisher `null`-geschützt
   (`{viewRef.current && <Toolbar …/>}`-Muster aus `WordEditor.tsx:170` bleibt für die aktive View
   erhalten).

**Selection-Sync-Fix wird geteilt, nicht dupliziert (Grenzfall 3/9, Pflicht-Regressionsschutz):** Die
bestehende `reconcileSelectionOnClick`-Funktion (`WordEditor.tsx:43-50`, samt ihres Kommentarblocks
`WordEditor.tsx:20-42`) wird nach
`src/formats/shared/editor/selectionReconciliation.ts` (neue Datei) verschoben und **unverändert**
exportiert. Beide `EditorView`-Instanzen (Body **und** Header) binden sie identisch über
`view.dom.addEventListener('mouseup', (e) => reconcileSelectionOnClick(view, e))`. Begründung: Die
Anforderung benennt den Fokuswechsel zwischen zwei editierbaren Bereichen selbst als „Hauptverdachtsfall
für dieselbe Fehlerklasse" (Abschnitt 2, Zeile 158-162) — der Fix darf deshalb nicht nur an einer Stelle
liegen, sonst wäre die zweite `EditorView` von Anfang an ungeschützt gegen exakt den Bug, den die
Anforderung als Kernrisiko benennt. Eine zweite, separat gepflegte Kopie hätte dasselbe Risiko wie „Fix
vergessen mitzuziehen" bei künftigen Änderungen — eine gemeinsame, einmal exportierte Funktion schließt
das strukturell aus.

**Warum kein neuer Mechanismus für den Fokuswechsel *zwischen* den beiden Views nötig ist:** Der Wechsel
erfolgt entweder (a) per echtem Mausklick in die jeweils andere `view.dom` — dort greift deren **eigener**
`mouseup`-Handler bereits normal, oder (b) programmatisch über `Escape` (siehe Abschnitt 1.6) via
`otherView.focus()`, was die Selektion der Zielview überhaupt nicht anfasst (nur den DOM-Fokus) — die
Zielview hatte also entweder schon eine gültige Selektion (unverändert) oder wird beim nächsten Klick
hinein ohnehin durch ihren eigenen `mouseup`-Handler korrigiert. Es gibt keinen Codepfad, über den eine
Transaktion der einen View die `state.doc`/`state.selection` der anderen View verändern könnte (zwei
komplett unabhängige `EditorState`-Instanzen) — die in Grenzfall 3 befürchtete „fälschliche
Übertragung der Selektion in den Kopfzeilenkontext" ist strukturell ausgeschlossen, muss aber dennoch
über einen Regressionstest **nachgewiesen**, nicht nur analytisch behauptet werden (siehe Abschnitt 7.3).

### 1.6 Sichtbarkeit auf jeder Seite: Seitenband-Overlay statt N editierbarer Instanzen (setzt Anforderung 3.3/Grenzfall 10 um)

**Ausgangslage/Einschränkung (identisch zur bereits in `fusszeile-bearbeiten-req.md` Abschnitt 6
dokumentierten Analyse):** `pageLayout.ts`/`pagination.ts` simulieren mehrere A4-Seiten über ein
wiederholendes CSS-Hintergrundmuster **auf einer einzigen, durchlaufenden ProseMirror-Fläche** — es gibt
keine echten Pro-Seite-DOM-Container. Eine editierbare Kopfzeile, die „identisch auf jeder Seite"
erscheinen soll (Anforderung 3.3, Grenzfall 10 — anders als bei der Fußzeile-Datei **ohne** die dortige
„vorerst nur eine Seite, dokumentierte Einschränkung"-Ausweich-Option formuliert), braucht eine explizite
Lösung. Gewählt wird **Option (a)** aus `fusszeile-bearbeiten-req.md` Abschnitt 6 („Ein
fixiertes/absolut positioniertes Overlay-Element pro berechnetem Seiten-Band"), aus densel­ben Gründen
dort plus der zusätzlichen Überlegung, dass eine **einzige reale** `EditorView` ausreicht, wenn nur
**eine** davon interaktiv sein muss und der Rest reine visuelle Spiegelung ist (siehe unten) — Option (c)
(volle Pro-Seite-Container-Refaktorierung) wäre unverhältnismäßiger Aufwand für diese einzelne
Anforderung und Option (b) (nur eine sichtbare Kopfzeile am Dokumentende/-anfang) widerspricht Grenzfall
10 direkt, ohne dass die Anforderung — anders als die Fußzeile-Datei — diese Ausweichmöglichkeit anbietet.

**Geometrie** (neue Konstanten/Funktion in `src/formats/shared/editor/pageLayout.ts`, ergänzt nach
Zeile 15, keine bestehende Zeile verändert):
```ts
/** Y-offset (px, relative to the page-stack container's own top) of page i's (0-based) top-margin
 *  band — where its header lives. Derived from the same background-band geometry pageBackgroundStyle()
 *  already encodes: page i's content band starts at PAGE_MARGIN_PX + i * (PAGE_CONTENT_HEIGHT_PX +
 *  PAGE_GAP_PX); its header band is the PAGE_MARGIN_PX-tall zone directly above that. */
export function pageHeaderBandTop(pageIndex: number): number {
  return pageIndex * (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX)
}

/** Bounded max height for the header band's content — see kopfzeile-bearbeiten-code.md Abschnitt 1.7
 *  (Grenzfall 7: overflow is handled by an internal scrollbar within this cap, not by growing the whole
 *  page geometry, to avoid destabilizing pagination.ts's already-fragile layout, see
 *  FEATURE-SPEC-DOCX-ODT.md Abschnitt 8). */
export const HEADER_BAND_MAX_PX = PAGE_MARGIN_PX * 2
```
`pageCount` wird bereits (implizit) von `pagination.ts` berechnet (`computePageCount`,
`pagination.ts:27-29`), aber nirgends nach außen gemeldet. `createPaginationPlugin` (`pagination.ts:72-105`)
bekommt einen optionalen Parameter:
```ts
// Positional-Signatur (0.7 Punkt 4), identisch zu fusszeile-bearbeiten-code.md §3.4.
export function createPaginationPlugin(onPageCountChange?: (count: number) => void): Plugin {
  return new Plugin({
    // … unverändert …
    view(view) {
      const recompute = () => {
        const next = measureAndBuildDecorations(view)
        const current = paginationKey.getState(view.state)
        onPageCountChange?.(countPagesFromDecorations(next) /* siehe unten */)
        if (current && sameDecorationSet(current, next)) return
        view.dispatch(view.state.tr.setMeta(paginationKey, next))
      }
      // … unverändert …
    },
  })
}
```
(`countPagesFromDecorations`: kleine Hilfsfunktion, zählt `next.find().length + 1`, dieselbe Formel wie
`computePageCount` bereits verwendet, hier direkt auf die bereits gebauten Decorations angewandt, um keine
zweite Messung/kein zweites `getBoundingClientRect()` zu benötigen.) `WordEditor.tsx` hält
`const [pageCount, setPageCount] = useState(1)` und übergibt `setPageCount` (Positional) beim
Erzeugen des Plugins für die **Body**-View (Kopfzeile selbst paginiert nicht, braucht das Plugin nicht).

**Rendering (neue Komponente `src/formats/shared/editor/HeaderChrome.tsx`):**
```ts
interface HeaderChromeProps {
  pageCount: number
  header: ProseMirrorJSON | null
  headerViewRef: RefObject<EditorView | null>
  onHeaderChange: (json: ProseMirrorJSON) => void   // Rückschreiben via onChangeRef, siehe 4.1 Punkt 6
  focusedRegion: 'body' | 'header'
  onFocusChange: (region: 'body' | 'header') => void
  onTick: () => void                                 // Toolbar-Re-Render nach jeder Header-Transaktion (1.5 Punkt 3)
  onCutBlocked: (message: string | null) => void     // = setCutError, für Shift-Delete-Cut in der Kopfzeile (0.7 Punkt 2 / 3.2)
  onEscapeToBody: () => void
}
```
(Die einheitliche, oben stehende Prop-Liste ist maßgeblich — frühere Teilaufzählungen in Abschnitt 3.2/
4.1 werden hierdurch konsolidiert. `onActivate`/`onFocusHeader` aus einer früheren Fassung entfallen
zugunsten von `onHeaderChange` + `onFocusChange`: „Aktivieren" = `onHeaderChange(emptyDocJSON())` durch den
Doppelklick-Handler, „Fokus wechseln" = `onFocusChange('header')`.)
- Rendert `pageCount` absolut positionierte `<div>`s (`top: pageHeaderBandTop(i)`, `height: 'auto'`,
  `maxHeight: HEADER_BAND_MAX_PX`, `overflowY: 'auto'`) innerhalb des bestehenden Seiten-Stack-`<div>`
  aus `WordEditor.tsx:172-179` (dieser bekommt zusätzlich `position: 'relative'` in seinem `style`-Objekt
  — einzige nötige Änderung an diesem bestehenden Element außer dem neuen Kind).
- **Band 0** enthält entweder (a) bei `header === null`: einen dezenten Platzhalter-Text/-Rahmen
  („Doppelklick, um eine Kopfzeile hinzuzufügen") mit `onDoubleClick={onActivate}`, oder (b) bei
  `header !== null`: das `<div ref={headerContainerRef} />`-Mount-Ziel für die echte, interaktive
  `EditorView` (analog `WordEditor.tsx:180`, `containerRef`).
- **Bänder 1..pageCount-1** sind bei `header !== null` **rein visuelle, nicht editierbare Spiegel**
  desselben Inhalts: `contentEditable={false}`, Inhalt via `useEffect` einmal pro `header`-Änderung neu
  gerendert durch `DOMSerializer.fromSchema(wordSchema).serializeFragment(wordSchema.nodeFromJSON(header).content)`,
  in ein leeres Ziel-`div` gehängt (`replaceChildren(...)`). Kein eigener `EditorView` pro Seite — vermeidet
  N-fache Selection-Sync-Fläche und N-fache Undo-Historien, was der Anforderung (ein einziger
  Kopfzeileninhalt pro Dokument, Abschnitt 3.3) ohnehin entspricht: es gibt nur **einen** Inhalt, nur
  **eine** Stelle, an der er editiert wird.
- **Jedes** Band (Band 0 wie Spiegel) bekommt `onDoubleClick`: bei Band 0 fokussiert es die echte
  `EditorView` (`onFocusHeader`); bei einem Spiegel-Band (1..N-1) ruft es **ebenfalls** `onFocusHeader`
  auf, **zusätzlich** `headerViewRef.current?.dom.scrollIntoView({ block: 'center' })` — Doppelklick auf
  **jeder** sichtbaren Seite aktiviert/fokussiert zuverlässig denselben, einzigen Kopfzeilenbereich
  (erfüllt Anforderung Zeile 129 „Doppelklick in den oberen Seitenrandbereich **einer sichtbaren
  Seite**", nicht nur der ersten) — die Abweichung von echtem Word (wo man auf **jeder** Seite direkt
  eintippen kann) ist eine bewusste, hier dokumentierte Vereinfachung, siehe Abschnitt 11.
- Visuelle Abgrenzung (Anforderung Zeile 130/184, Testplan-Punkt 6): jedes Band bekommt eine untere
  Trennlinie (`border-bottom: 1px dashed`, identische Randfarbe `#9ca3af` wie bestehende Tabellenrahmen
  in `index.css:52`, für visuelle Konsistenz) sowie ein `aria-label="Kopfzeile"` auf dem Band-0-Container
  plus ein bei `:focus-within` sichtbares Label „Kopfzeile" (kleines `<span>`, `position: absolute`,
  oberhalb des Bandes, nur sichtbar wenn das Band den Fokus hat oder per `:hover` — analog zum in
  `fusszeile-bearbeiten-req.md` Zeile 63 beschriebenen Muster).

**Doppelklick-Aktivierung bei `header === null` auf einer Seite > 1:** funktioniert identisch — Band 0
(Seite 1) ist auch im „inaktiven" Zustand gerendert (Platzhalter), Bänder 1..N-1 zeigen im inaktiven
Zustand ebenfalls einen (schwächer sichtbaren) Platzhalter-Rahmen mit demselben `onDoubleClick={onActivate}`
— ein Doppelklick auf Seite 3s oberen Rand aktiviert die Kopfzeile genauso wie auf Seite 1, kein
Sonderfall nötig, weil `onActivate` unabhängig davon ist, welches Band den Klick ausgelöst hat.

### 1.7 Grenzfall 7 (Kopfzeileninhalt überragt die vorgesehene Zone) — bewusst begrenzte, dokumentierte Lösung

**Entscheidung:** Kopfzeilenband hat eine **CSS-`max-height` von `HEADER_BAND_MAX_PX`** (`= 2 ×
PAGE_MARGIN_PX`, siehe 1.6) mit `overflow-y: auto` (internes Scrollen), **kein** dynamisches Verdrängen
des übrigen Seitenlayouts. Begründung: Ein „echtes" Mitwachsen würde bedeuten, dass `pagination.ts`s
fest verdrahtete `PAGE_GAP_PX`-Spacer-Höhe (aktuell unabhängig von Kopf-/Fußzeileninhalt berechnet) für
jede Seite individuell um die tatsächliche Kopfzeilenhöhe wachsen müsste — das griffe tief in ein
System ein, das laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 bereits einen offenen, ungeklärten
Layout-Zweifelsfall hat („kein leerer/übergroßer Zwischenraum bei kurzen Dokumenten"), und wäre damit ein
unverhältnismäßig hohes Regressionsrisiko für eine einzelne, in Grenzfall 7 selbst als „zu
dokumentierendes Verhalten" (nicht als hartes Soll) eingestufte Randbedingung. Ein internes Scrollen
verliert (anders als reines Abschneiden) **keinen** Inhalt — erfüllt die Vorgabe „darf nicht zu
überlappendem, unlesbarem Rendering führen" strenger als die von der Anforderung selbst
tolerierte Abschneide-Option. **Dokumentiertes Ergebnis für Grenzfall 7:** „Kopfzeileninhalt über
`2 × PAGE_MARGIN_PX` (aktuell ≈ 189px bei A4/96dpi) hinaus wird intern scrollbar dargestellt, verdrängt
den Hauptbereich nicht." Nach Umsetzung in `kopfzeile-bearbeiten-req.md` Grenzfall 7 nachzutragen.

### 1.8 Undo-Grenze bei Aktivierung (Grenzfall 8)

**Entscheidung:** Die Aktivierung selbst (`header: null → emptyDocJSON()`) ist **kein** Schritt in der
ProseMirror-Undo-Historie der Kopfzeile — die Kopfzeilen-`EditorView` (inkl. ihres `history()`-Plugins)
wird überhaupt erst **beim** Aktivieren gemountet (React-`{header !== null && <HeaderEditorView .../>}`),
ihre Historie beginnt also frisch mit dem leeren Dokument als unterstem Zustand — exakt wie das
bestehende Verhalten der Body-`EditorView`, deren Historie ebenfalls erst ab dem initial geladenen
Dokument existiert (`WordEditor.tsx:80-115` `EditorState.create`, `history()` Z. 84). `Strg+Z`
direkt nach dem ersten Tippen macht die Eingabe rückgängig bis zum leeren Absatz; ein **weiteres** `Strg+Z`
ist ein No-Op (`undo()` liefert `false`, keine Historie mehr vorhanden) — der Bereich bleibt aktiv/leer,
wird **nicht** durch Undo wieder auf `header === null` zurückgesetzt. Kein Crash (per definitionem, da
`undo` bei leerer Historie in `prosemirror-history` bereits `false` statt eines Fehlers liefert — keine
Codeänderung nötig, nur zu verifizieren, siehe Testfall in Abschnitt 7.3). Nach Umsetzung in
`kopfzeile-bearbeiten-req.md` Grenzfall 8 nachzutragen.

### 1.9 Verhältnis zu `fusszeile-bearbeiten` (Geltungsbereich-Klärung)

Diese Umsetzung baut `HeaderChrome.tsx`, `pageHeaderBandTop`/`HEADER_BAND_MAX_PX` und die
`focusedRegion`/`tick`-Koordination in `WordEditor.tsx` bewusst so, dass eine spätere,
eigenständige Umsetzung von `fusszeile-bearbeiten-req.md` dieselben Bausteine **strukturell analog**
(nicht zwingend wiederverwendend) anwenden kann — z. B. eine eigene `pageFooterBandTop`-Funktion mit
identischer Formel (Fußzeilenband = untere `PAGE_MARGIN_PX`-Zone der Content-Bänder) und eine eigene
`focusedRegion`-Erweiterung auf `'body' | 'header' | 'footer'`. Diese Umsetzung **erweitert
`focusedRegion` nicht bereits jetzt auf `'footer'`** (kein spekulativer Code für ein noch nicht
freigegebenes Feature), dokumentiert aber hier explizit, dass `WordEditor.tsx`s neue interne Struktur
(Abschnitt 1.5) bei Umsetzung von `fusszeile-bearbeiten-req.md` **erneut angefasst** werden muss (State-
Union erweitern, ein drittes `EditorView`-Ref, ein drittes Band-Overlay) — das ist die in der
Geltungsbereich-Klausel der Anforderung geforderte Vermerkung dieser Abhängigkeit.

### 1.10 Explizit nicht Teil dieser Umsetzung

- Seitenzahl-Feld-Node (Anforderung 3.7) — nicht gebaut. Architektur-Check: `HeaderChrome`s
  `EditorView` nutzt denselben `wordSchema` wie die Body-View und dieselben Toolbar-Commands aus
  `commands.ts` — ein späterer `pageNumber`-Node-Typ (analog `image`, als eigene, atomare `NodeSpec`)
  ließe sich ohne strukturelle Änderung an `HeaderChrome`/`WordEditor` ergänzen (erfüllt die
  Architektur-Voraussetzung aus Anforderung 3.7 „darf … Nachrüsten nicht strukturell verbauen").
- „Erste Seite anders"/„Gerade-ungerade" (Anforderung 3.4/Abschnitt 1 Zeile 133-134) — UI zeigt dafür
  **keine** Checkbox/kein Bedienelement an (kein Vortäuschen einer nicht wirkenden Funktion, Anforderung
  Zeile 133/134 direkt umgesetzt durch schlichtes Fehlen jedes entsprechenden UI-Elements). Reader-Fix
  aus Abschnitt 1.1 sorgt dafür, dass beim Import einer solchen Datei mindestens eine (die `default`-)
  Variante erhalten bleibt, siehe Grenzfall 4/5.
- Gemeinsamer gepoolter Bestätigungsdialog-Mechanismus mit `fusszeile-bearbeiten` — siehe Abschnitt 1.4.

---

## 2. Schema (`src/formats/shared/schema.ts`) — keine Änderung nötig

`doc: { content: 'block+' }` (`schema.ts:7`) wird für **beide** `EditorView`-Instanzen (Body und
Kopfzeile) unverändert wiederverwendet — dieselbe `wordSchema`-Instanz, kein zweites Schema. Tabellen,
Listen, Bilder, alle Marks sind dadurch automatisch auch innerhalb der Kopfzeile ohne jede Schema-Änderung
verfügbar (erfüllt Anforderung 3.2 letzter Punkt „Tabellen und Listen … dürfen nicht zu Absturz/
Datenverlust führen" — sie sind schlicht strukturell erlaubt, exakt wie im Haupttext).

---

## 3. Neue Dateien

### 3.1 `src/formats/shared/editor/selectionReconciliation.ts`
Enthält **wortwörtlich** die aktuell in `WordEditor.tsx:20-50` lebende `reconcileSelectionOnClick`-Funktion
(inkl. ihres ausführlichen Kommentars) plus Export. Kein Verhaltensunterschied — reine Extraktion zur
gemeinsamen Nutzung durch Body- **und** Kopfzeilen-View (siehe Abschnitt 1.5).

### 3.2 `src/formats/shared/editor/HeaderChrome.tsx`
Neue Komponente wie in Abschnitt 1.6 spezifiziert. Verantwortlich für: Band-Rendering (echte Kopfzeilen-
`EditorView` in Band 0, read-only Spiegel in den übrigen Bändern), Aktivierungs-Platzhalter bei
`header === null`, Doppelklick-Handler, visuelle Abgrenzung (Trennlinie/Label), Escape-Keymap-Eintrag für
die Kopfzeilen-`EditorView` (siehe unten). Erhält von `WordEditor.tsx` als Props: `header`,
`onHeaderChange(json)`, `pageCount`, `focusedRegion`, `onFocusChange(region)`, `bodyViewRef` (für
Escape → Body fokussieren), sowie `tick`-Bump-Callback (damit `WordEditor` nach jeder Kopfzeilen-
Transaktion neu rendert, siehe 1.5 Punkt 3).

Erzeugt intern ihre eigene `EditorView` mit **demselben Plugin-/Keymap-Stack wie die Body-View**
(`WordEditor.tsx:83-114` Plugin-Array bzw. der `new EditorView`-Aufruf 122-133) **minus `createPaginationPlugin()`**
(die Kopfzeile paginiert nicht selbst) und **plus** einer `Escape`-Bindung. Wichtig (siehe 0.7 Punkt 2):
Die Kopfzeile braucht für die von Anforderung 3.2 geforderte Funktionsparität (Ausschneiden/Kopieren/
Einfügen, Shift-Enter-Zeilenumbruch) den **vollständigen** Body-Keymap, nicht nur die Formatier-Marks:
```ts
// gleicher Plugin-Stack wie Body: history(), keymap({...}) [siehe unten], keymap(baseKeymap),
// columnResizing(), tableEditing(), dropCursor(), gapCursor()  — OHNE createPaginationPlugin()
keymap({
  // Mod-c/Mod-x/Mod-v bewusst NICHT gebunden — native Clipboard-Behandlung wie in der Body-View
  // (WordEditor.tsx:86-92). clipboardTextSerializer wird beim EditorView-Konstruktor gesetzt.
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Shift-Enter': insertHardBreak(),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  // Windows-Sekundär-Cut, identisch zur Body-View (WordEditor.tsx:106); onCutBlocked reicht in den
  // gemeinsamen WordEditor-State setCutError (per Prop an HeaderChrome übergeben).
  'Shift-Delete': cutSelection({ onCutBlocked: onCutBlocked }),
  Escape: () => {
    onEscapeToBody()
    return true
  },
}),
```
`Enter: splitListItem(...)` **wird** übernommen (identisch zur Body-View) — die Kopfzeile hat zwar Listen
nicht als Hauptanwendungsfall, aber die Anforderung 3.2 verlangt volle Text-Grundfunktionsparität, und
`splitListItem` fällt bei Nicht-Listen ohnehin durch auf `baseKeymap`s normales `Enter`. `HeaderChrome`
erhält dafür einen zusätzlichen `onCutBlocked: (m: string | null) => void`-Prop (= das `setCutError` des
`WordEditor`, siehe Abschnitt 4.1) und den `EditorView`-Konstruktor mit `clipboardTextSerializer` (Import
aus `./clipboard`, wie `WordEditor.tsx:13`).

### 3.3 SVG-Icon für den Toolbar-Button
Kein separates Datei-Asset nötig (Projekt embettet SVGs bisher inline als JSX, siehe Muster-Suche unten)
— das Icon wird direkt inline in `Toolbar.tsx` als `<svg>`-JSX definiert (siehe Abschnitt 4.2), analog zur
in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 geforderten „eingebettete SVG-Icons statt Unicode/Emoji"-
Vorgabe. Motiv: zwei horizontale Linien mit einer betonten oberen Linie (klassisches „Kopfzeile"-Piktogramm,
wie in Word/LibreOffice-Ribbons verwendet), z. B.:
```tsx
function HeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.6" />
      <line x1="3" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
```

---

## 4. Geänderte Dateien — Editor-Kern

### 4.1 `src/formats/shared/editor/WordEditor.tsx`
1. Import ergänzen: `HeaderChrome` aus `./HeaderChrome`, `reconcileSelectionOnClick` aus
   `./selectionReconciliation` (statt der lokal definierten Funktion, die entfällt — Zeilen 18-53 werden
   entfernt, nicht dupliziert).
2. Neuer State (zusätzlich zum **bestehenden** `cutError`/`setCutError`-State aus `WordEditor.tsx:71`,
   der **erhalten bleibt** und jetzt beide Views bedient, siehe 0.7 Punkt 2):
   ```ts
   const [focusedRegion, setFocusedRegion] = useState<'body' | 'header'>('body')
   const [pageCount, setPageCount] = useState(1)
   const [tick, setTick] = useState(0)
   const headerViewRef = useRef<EditorView | null>(null)
   const [pendingHeaderFocus, setPendingHeaderFocus] = useState(false)  // Fokus erst nach dem Mount der Header-View, siehe 4.2 Punkt 2

   // onEditHeader-Handler (an Toolbar gereicht): aktiviert bzw. fokussiert nur.
   function handleEditHeader() {
     if (doc.content.header === null) {
       onChangeRef.current({ ...doc.content, header: emptyDocJSON() })
       setPendingHeaderFocus(true)        // headerViewRef existiert erst nach Re-Render
     } else {
       headerViewRef.current?.focus()
     }
   }
   ```
   `pendingHeaderFocus` wird in einem `useEffect` konsumiert, sobald `headerViewRef.current` gesetzt ist
   (`if (pendingHeaderFocus && headerViewRef.current) { headerViewRef.current.focus(); setPendingHeaderFocus(false) }`).
   (`viewRef` aus `WordEditor.tsx:67` wird zu `bodyViewRef` umbenannt, Semantik unverändert; der
   Auto-Dismiss-Custom-Hook-Aufruf `useAutoDismiss(cutError, setCutError)`, `WordEditor.tsx:74`
   (Hook-Definition 52–63), bleibt unverändert — er ist seit dem `ausschneiden`-Merge **kein** Inline-
   `useEffect` mehr, siehe 0.7 Korrekturtabelle.)
3. Body-`EditorView`-`dispatchTransaction` (`WordEditor.tsx:125-132`, `forceRender`-Bump Z. 131) bumpt zusätzlich `tick`:
   ```ts
   dispatchTransaction(tr) {
     const newState = view.state.apply(tr)
     view.updateState(newState)
     if (tr.docChanged) {
       onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() })
     }
     setTick((n) => n + 1)
   },
   ```
   (`forceRender` wird zu `setTick` umbenannt/vereinheitlicht — bisher rein lokal für die Body-View
   gedacht, jetzt gemeinsamer „irgendetwas hat sich geändert"-Trigger für **beide** Views, siehe 1.5
   Punkt 3. Funktional identisch zum bisherigen `forceRender`-Zweck, nur semantisch geteilt.)
4. Body-`EditorView`-Plugins bekommen `createPaginationPlugin(setPageCount)` (Positional-Signatur, siehe
   0.7 Punkt 4 — identisch zu `fusszeile-bearbeiten-code.md` §3.4) statt des heutigen argumentlosen
   `createPaginationPlugin()` (`WordEditor.tsx:113`, im `plugins`-Array Z. 83-114).
5. Body-Fokus-Tracking: neues Plugin-Prop bei der `EditorView`-Konstruktion (`WordEditor.tsx:122-133`):
   ```ts
   handleDOMEvents: {
     focus: () => { setFocusedRegion('body'); return false },
   },
   ```
6. JSX (`WordEditor.tsx:168-184`) wird um `HeaderChrome` ergänzt, äußerer Seiten-`<div>` bekommt
   `position: 'relative'`:
   ```tsx
   return (
     <div className="flex flex-col h-full">
       {(bodyViewRef.current || headerViewRef.current) && (
         <Toolbar
           view={focusedRegion === 'header' ? headerViewRef.current! : bodyViewRef.current!}
           cutError={cutError}          /* BEHALTEN — Ausschneiden-Feature, siehe 0.7 Punkt 2 */
           setCutError={setCutError}    /* BEHALTEN */
           isHeaderFocused={focusedRegion === 'header'}
           hasHeader={doc.content.header !== null}
           onEditHeader={handleEditHeader}     /* siehe 4.2 Punkt 2 */
           onRemoveHeader={() => onChangeRef.current({ ...doc.content, header: null })}
         />
       )}
       <div className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-950 flex justify-center py-8">
         <div
           style={{
             width: PAGE_WIDTH_PX,
             padding: `${PAGE_MARGIN_PX}px`,
             position: 'relative',
             ...pageBackgroundStyle(),
           }}
           className="shadow-lg"
         >
           <HeaderChrome
             header={doc.content.header}
             onHeaderChange={(headerJson) => onChangeRef.current({ ...doc.content, header: headerJson })}
             pageCount={pageCount}
             headerViewRef={headerViewRef}
             focusedRegion={focusedRegion}
             onFocusChange={setFocusedRegion}
             onTick={() => setTick((n) => n + 1)}
             onEscapeToBody={() => bodyViewRef.current?.focus()}
           />
           <div ref={containerRef} className="word-editor-surface outline-none" />
         </div>
       </div>
     </div>
   )
   ```
   (`onHeaderChange` liest bewusst `doc.content` zum Zeitpunkt des Callback-Aufrufs über `onChangeRef`,
   nicht über eine veraltete Closure-Variable — gleiches Muster wie das bestehende `onChangeRef.current`
   in `WordEditor.tsx:129`.)
7. **Bestehendes Verhalten unverändert:** `mouseup`-Listener der Body-View (`WordEditor.tsx:154-155`)
   nutzt jetzt die importierte, geteilte Funktion statt der lokalen — keine Verhaltensänderung.

### 4.2 `src/formats/shared/editor/Toolbar.tsx`
1. Neue Button-Gruppe „Einfügen/Layout" (Anforderung Zeile 128: „sinnvoll in einer eigenen
   Einfügen/Layout-Gruppe platziert") wird **zusätzlich** zur bestehenden Tabelle/Bild-Gruppe
   (`Toolbar.tsx:277-294`, endend mit dem `🖼 Bild`-`<label>`) angehängt, durch einen weiteren Trenner abgesetzt:
   ```tsx
   <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

   <button
     type="button"
     title="Kopfzeile bearbeiten"
     aria-label="Kopfzeile bearbeiten"
     aria-pressed={isHeaderFocused}
     onMouseDown={(e) => {
       e.preventDefault()
       onEditHeader()
     }}
     className={`px-2 py-1 rounded text-sm border flex items-center gap-1 ${
       isHeaderFocused
         ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'
         : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
     }`}
   >
     <HeaderIcon /> Kopfzeile
   </button>
   {hasHeader && (
     <button
       type="button"
       title="Kopfzeile entfernen"
       aria-label="Kopfzeile entfernen"
       onMouseDown={(e) => {
         e.preventDefault()
         onRemoveHeader()
       }}
       className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
     >
       Kopfzeile entfernen
     </button>
   )}
   ```
2. `ToolbarProps` wird um vier neue Werte **ergänzt** — die bestehenden `cutError`/`setCutError`
   (`Toolbar.tsx:22-26`, Ausschneiden-Feature) **bleiben erhalten** (siehe 0.7 Punkt 2; ihr Entfernen wäre
   eine Regression):
   ```ts
   interface ToolbarProps {
     view: EditorView
     cutError: string | null                       // BEHALTEN
     setCutError: (message: string | null) => void // BEHALTEN
     isHeaderFocused: boolean
     hasHeader: boolean
     onEditHeader: () => void
     onRemoveHeader: () => void
   }
   ```
   Diese werden in `WordEditor.tsx`s `<Toolbar .../>`-Aufruf (Abschnitt 4.1, Punkt 6) ergänzt:
   `isHeaderFocused={focusedRegion === 'header'}`, `hasHeader={doc.content.header !== null}`,
   `onEditHeader`: wenn `header === null` → `onChangeRef.current({ ...doc.content, header:
   emptyDocJSON() })` **und** (nach dem durch die State-Änderung ausgelösten Re-Render, in dem
   `HeaderChrome` die neue `EditorView` mountet) `headerViewRef.current?.focus()` — technisch über einen
   kleinen `useEffect`, der auf einen `pendingHeaderFocus`-Flag reagiert, da der `headerViewRef` erst
   **nach** dem Re-Render existiert (React-Effekt-Reihenfolge, analog zu bestehenden
   Mount-nach-Render-Mustern im Projekt, z. B. `WordEditor.tsx`s eigener `useEffect` beim Erst-Mount);
   ist `header` bereits vorhanden → sofort `headerViewRef.current?.focus()`. `onRemoveHeader`:
   `onChangeRef.current({ ...doc.content, header: null })`.
3. `MarkButton`/`AlignButton`/alle bestehenden Handler bleiben **unverändert** — sie lesen bereits
   generisch von der `view`-Prop, die jetzt je nach Fokus die Body- oder Kopfzeilen-View sein kann; kein
   Sonderfall nötig (das ist der eigentliche Kern von Entscheidung 1.5: Wiederverwendung ohne Verzweigung).

### 4.3 `src/formats/shared/editor/commands.ts`
**Keine Änderung nötig.** Alle bestehenden Commands (`setAlign`, `setHeading`, `toggleList`,
`liftFromList`, `insertImage`, `insertTable`, `applyMarkColor`, `clearMarkColor`) sind bereits
schema-/state-generisch (nehmen `state`/`dispatch` entgegen, nicht fest die Body-View) — sie
funktionieren unverändert, wenn `Toolbar` sie mit `view.state`/`view.dispatch` der Kopfzeilen-View statt
der Body-View aufruft (`run()`-Helper in `Toolbar.tsx:28-31` ist bereits generisch).

### 4.4 `src/formats/shared/editor/pagination.ts`
Ergänzung wie in Abschnitt 1.6 beschrieben: `createPaginationPlugin(onPageCountChange?:
(count: number) => void)` (Positional, siehe 0.7 Punkt 4), neue kleine Hilfsfunktion `countPagesFromDecorations(set: DecorationSet):
number` (extrahiert die bereits in `computePageCount` verwendete `+ 1`-Logik, hier auf ein bereits
gebautes `DecorationSet` statt auf rohe `heights[]` angewandt, um keine zweite Messung zu benötigen).
Rückwärtskompatibel: bestehender Aufruf `createPaginationPlugin()` (ohne Argument) bleibt gültig (Body-
Editor bekommt einfach keinen Callback, wenn keiner übergeben wird — für die Kopfzeilen-View, die dieses
Plugin ohnehin nicht einbindet, irrelevant).

### 4.5 `src/formats/shared/editor/pageLayout.ts`
Ergänzung wie in Abschnitt 1.6 beschrieben: `pageHeaderBandTop(pageIndex: number): number`,
`HEADER_BAND_MAX_PX`. Keine bestehende Zeile verändert, nur Ergänzung.

### 4.6 `src/formats/shared/documentModel.ts`
**Keine Änderung.** `header: ProseMirrorJSON | null` existiert bereits (`documentModel.ts:5`),
`emptyDocJSON()` (`documentModel.ts:10-12`) wird für die Aktivierung direkt wiederverwendet, wie in
Abschnitt 1.4 beschrieben.

---

## 5. DOCX Import/Export

### 5.1 `src/formats/docx/reader.ts`
Wie in Abschnitt 1.1 (Typ-Priorisierung, neue Funktion `pickReference`) und Abschnitt 1.3 (eigener
Relationship-Namensraum je Part, neue Funktion `relsPathFor`) im Detail spezifiziert. Beide Änderungen
betreffen ausschließlich die Header-/Footer-Auflösung in `readDocx` (`reader.ts:507-531`); die
Body-Verarbeitung (`readBodyChildren` selbst, `parseTable`, `paragraphToBlocks` etc.) bleibt
**vollständig unverändert** — `readBodyChildren`s Signatur ändert sich nicht (sie nimmt bereits eine
`imageRels`-Map als Parameter entgegen, siehe `reader.ts:464-470`; es ändert sich nur, **welche** Map an
den beiden Header-/Footer-Aufrufstellen übergeben wird).

### 5.2 `src/formats/docx/writer.ts`
Wie in Abschnitt 1.3 spezifiziert: zwei zusätzliche `RelationshipRegistry`-Instanzen (`headerRels`,
`footerRels`), durchgereicht an die jeweiligen `blocksToDocx`-Aufrufe für Kopf-/Fußzeile, zwei bedingt
erzeugte neue Zip-Einträge (`word/_rels/header1.xml.rels`, `word/_rels/footer1.xml.rels`). Der
`w:headerReference`/`w:footerReference`-Eintrag selbst bleibt unverändert `w:type="default"`
(Entscheidung: keine Mehrfach-Typ-Unterstützung beim Schreiben, siehe Anforderung 3.4 — nur beim Lesen
wird priorisiert ausgewählt).

`buildContentTypesXml` (`writer.ts:229-250`) — **keine Änderung nötig**: `[Content_Types].xml` deklariert
Content-Types nur für `header1.xml`/`footer1.xml` selbst (per `Override`), nicht für deren `.rels`-Dateien
— `.rels`-Dateien sind bereits pauschal über den bestehenden
`<Default Extension="rels" ContentType="…relationships+xml"/>`-Eintrag (`writer.ts:244`) abgedeckt, der
schon für `document.xml.rels` gilt und automatisch auch für die beiden neuen `.rels`-Dateien greift.

---

## 6. ODT Import/Export

### 6.1 `src/formats/odt/reader.ts`
Wie in Abschnitt 1.2 spezifiziert: neue Funktion `pickMasterPage(stylesDoc)`, ersetzt die Inline-Auswahl
`stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page')[0]` (`reader.ts:375`). Rest der
Kopf-/Fußzeilen-Verarbeitung (`reader.ts:376-388`) bleibt unverändert — die Auswahl ändert nur **welches**
`masterPage`-Element als Quelle für `headerEl`/`footerEl` dient, nicht wie deren Inhalt in Blöcke
umgewandelt wird.

### 6.2 `src/formats/odt/writer.ts`
**Keine Änderung nötig.** Der ODT-Writer schreibt bereits korrekt in ein einziges, benanntes
`style:master-page style:name="Standard"` (`writer.ts:226`) — das ist exakt der Name, den der reparierte
Reader (Abschnitt 6.1) jetzt aktiv **bevorzugt** sucht. Selbst erzeugte ODT-Dateien sind dadurch
automatisch mit dem neuen Reader-Verhalten konsistent, ohne Writer-Änderung.

### 6.3 `src/formats/odt/imageCollector.ts`, `src/formats/odt/styleRegistry.ts`
**Keine Änderung nötig.** ODF referenziert eingebettete Bilder über direkte, paket-relative
`xlink:href`-Pfade (`Pictures/imageN.ext`, global eindeutig durch `ImageCollector`, siehe
`odt/imageCollector.ts:22`) statt über ein per-Part-Relationship-System wie OOXML — der in Abschnitt 0.2/
0.3 gefundene Bug-Typ existiert für ODT strukturell nicht (empirisch bestätigt, siehe Abschnitt 0).

---

## 7. Tests

### 7.1 Neue/erweiterte Unit-Tests — Reader/Writer-Bugfixes (Regressionsschutz für Abschnitt 0/1)

| Datei | Test |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer Block „DOCX round trip: header/footer type priority": `WordDocumentContent` mit `header`/`footer` ist hier nicht konstruierbar (Writer schreibt nur `default`) — stattdessen ein **handgebauter** DOCX-Blob (analog `buildSampleDocx()` in `tests/e2e/docx.spec.ts`) mit drei `headerReference`-Typen (`even`, `default`, `first`) in beliebiger XML-Reihenfolge, `default` **nicht** zuerst gelistet → `readDocx()` liefert den `default`-Text, nicht den zuerst gelisteten. Deckt Abschnitt 1.1. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer Test „preserves an image embedded in the header via its own relationship part": `writeDocx()` mit Bild in `header.content` → exportiertes Zip enthält `word/_rels/header1.xml.rels` mit einer `image`-Relationship, **und** `readDocx()` auf dasselbe Ergebnis liefert das Bild (nicht `word/styles.xml` o. ä.) zurück. Deckt Abschnitt 1.3 (Reader **und** Writer gemeinsam, wie in 0.3 als notwendig begründet). |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Neuer Test „prefers the master-page named Standard over document order": handgebautes `styles.xml` (analog `buildSampleOdt()` in `tests/e2e/odt.spec.ts`) mit `Right_20_Page` **vor** `Standard` in Dokumentreihenfolge → `readOdt()` liefert `Standard`s Kopfzeileninhalt. Deckt Abschnitt 1.2. |

### 7.2 Neue Fixture-Rundreise-Tests (Baseline-Rundreise 5.1.3 der Anforderung, schließt Befund 7)

Neue Datei `src/formats/docx/__tests__/header-fixtures-roundtrip.test.ts`:
```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'
import { writeDocx } from '../writer'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')

async function roundTripFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  const original = await readDocx(new Blob([new Uint8Array(buffer)]))
  const exported = await writeDocx(original)
  const reimported = await readDocx(exported)
  return { original, reimported }
}

describe('DOCX header/footer fixtures: unmodified upload → export → re-import preserves content', () => {
  it('headerFooter.docx: default header/footer text survives (see Abschnitt 0.1/1.1)', async () => {
    const { reimported } = await roundTripFixture('headerFooter.docx')
    expect(JSON.stringify(reimported.header)).toContain('This is a simple header')
    expect(JSON.stringify(reimported.footer)).toContain('this is a simple footer')
  })

  it('headerPic.docx: header image survives as a real image (not word/styles.xml, see Abschnitt 0.2/1.3)', async () => {
    const { reimported } = await roundTripFixture('headerPic.docx')
    const image = (reimported.header as any).content.find((n: any) => n.type === 'image')
    expect(image.attrs.src).toMatch(/^data:image\/jpe?g;base64,/)
  })
})
```
Analog `src/formats/odt/__tests__/header-fixtures-roundtrip.test.ts` für `headerFinal.odt`,
`headerFirstPage.odt`, `tabellen_header_DOC_LO4-1-0.odt`:
```ts
it('headerFinal.odt: header text survives', async () => { /* expect header to contain "Header standard" */ })
it('headerFirstPage.odt: header text survives', async () => { /* dito */ })
it('tabellen_header_DOC_LO4-1-0.odt: has no page header/footer at all (see Abschnitt 0.5) — ' +
   'this fixture tests the table content round trip, not header/footer', async () => {
  const { reimported } = await roundTripFixture('tabellen_header_DOC_LO4-1-0.odt')
  expect(reimported.header).toBeNull()
  expect(reimported.footer).toBeNull()
  // Body-Tabelleninhalt bleibt separat durch die bestehende Tabellen-Rundreise-Suite abgedeckt.
})
```
(Dieser dritte Testfall verhindert genau das in Befund 0.5 beschriebene Risiko eines fälschlich rot
werdenden bzw. fälschlich falsch begründeten Tests.)

### 7.3 Neue Unit-/Komponententests — Editor-Kern

| Datei | Test |
|---|---|
| `src/formats/shared/editor/__tests__/pageLayout.test.ts` (**neu**) | `pageHeaderBandTop(0) === 0`; `pageHeaderBandTop(1) === PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX`; Werte sind monoton steigend. |
| `src/formats/shared/editor/__tests__/pagination.test.ts` (erweitert, falls bereits vorhanden — sonst neu) | `countPagesFromDecorations` liefert für ein leeres `DecorationSet` `1`, für ein Set mit zwei Breakpoints `3`. |
| `src/formats/shared/editor/__tests__/HeaderChrome.test.tsx` (**neu**, `@testing-library/react`) | Mount mit `header: null` → Platzhalter-Band sichtbar, Doppelklick löst `onActivate` (bzw. das übergebene `onHeaderChange`) aus; Mount mit befülltem `header` und `pageCount=3` → genau 3 Bänder gerendert, Band 0 enthält die editierbare Fläche (`.ProseMirror`), Bänder 1/2 enthalten identischen, aber `contenteditable="false"`-Text; Doppelklick auf Band 2 ruft `onFocusChange('header')` auf. |

### 7.4 E2E-Tests (Playwright, `tests/e2e/`)

**Neue Datei `tests/e2e/header-edit.spec.ts`** — deckt Anforderung Abschnitt 3.1/3.2/3.5/3.6, Grenzfall
1/2/3/8/9, Testplan-Punkte 3/5/6:

| Testfall | Testname (Vorschlag) |
|---|---|
| Aktivierung über Toolbar-Button (neues, leeres Dokument) | „clicking the header toolbar button reveals an empty, focused header area" |
| Aktivierung über Doppelklick auf den oberen Seitenrand | „double-clicking the top page margin reveals and focuses the header area" |
| Tippen + Formatierung (Fett) im Kopfzeilenbereich | „typing and bolding text in the header does not affect the body" |
| Visuelle Abgrenzung (Testplan Punkt 6) | „the header area has a visible label/border distinct from the body" (Locator-basierte Assertion auf Trennlinie/Label-Element, kein reiner Screenshot-Vergleich nötig) |
| Verlassen per Klick in den Haupttext | „clicking into the body ends header editing and moves focus/cursor there" |
| Verlassen per Escape | „pressing Escape in the header returns focus to the body" |
| Selection-Sync-Regression (Grenzfall 3/9, **Pflicht**) | „select-all in the body, then double-click the header, type there, then click back into the body and type — both areas keep their own correct content" (exakte Sequenz aus Grenzfall 9: Kopfzeile → Haupttext → Kopfzeile → Tippen, wiederholt) |
| Kopfzeile entfernen (Grenzfall 2) | „removing the header via the toolbar button clears it, and exporting afterwards contains no header reference" |
| Undo direkt nach Aktivierung (Grenzfall 8) | „Ctrl+Z right after typing in a freshly activated header undoes the typing without crashing or deactivating the header" |
| Mehrseitige Sichtbarkeit (Grenzfall 10) | „a header set on a short document also appears identically once the document grows past one page" (Text tippen, bis `pageCount > 1`, dann prüfen, dass ein zweites Band mit identischem Text sichtbar ist) |

**Neue Datei `tests/e2e/header-roundtrip.spec.ts`** — deckt Anforderung Abschnitt 5.2 (Feature-Rundreise):

- 5.2.1/5.2.2: Neues Dokument (DOCX bzw. ODT) → Kopfzeile aktivieren → „Firma Mustermann GmbH" tippen →
  exportieren (echter Download, `page.waitForEvent('download')`, Muster wie `tests/e2e/docx.spec.ts:70-83`)
  → reimportieren (`input.setInputFiles`) → Kopfzeilentext + Haupttext sichtbar.
- 5.2.3/5.2.4: Cross-Format DOCX→ODT→DOCX und ODT→DOCX→ODT — Kopfzeilentext bleibt über beide
  Konvertierungen (erfordert Umschalten zwischen den beiden Format-Karten im `FormatPicker`, erneuter
  Datei-Upload mit dem jeweils zuletzt heruntergeladenen Blob).
- 5.2.5: Kopfzeile mit Fett **und** Textfarbe → Rundreise erhält beides (XML-Inspektion:
  `<w:b/>`+`<w:color .../>` bzw. ODT-Textstyle mit beiden Eigenschaften).
- 5.2.6: Kopfzeile mit eingefügtem Bild (echter `filechooser`-Flow wie in
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 gefordert) → Rundreise erhält das Bild — **dieser Test ist der
  einzige E2E-Nachweis, dass Abschnitt 1.3 (Writer-Fix) tatsächlich zusammen mit dem Reader
  funktioniert**, da 7.1/7.2 nur den Reader gegen fremd-erzeugte bzw. Unit-Test-erzeugte Writer-Ausgabe
  prüfen.
- 5.2.7: Kopfzeile **und** Fußzeile gleichzeitig befüllt — da Fußzeile-UI in dieser Anforderung nicht
  gebaut wird (separater Slug), wird `footer` hierfür direkt über eine Testhilfsfunktion/via
  `page.evaluate` auf das In-Memory-Dokumentmodell gesetzt **oder** dieser Testfall wird als „nicht
  durchführbar, solange `fusszeile-bearbeiten` nicht umgesetzt ist" markiert und auf die Unit-Test-Ebene
  verschoben (Reader/Writer-seitige Unabhängigkeit von Kopf- und Fußzeile ist bereits durch die
  bestehenden `roundtrip.test.ts`-Blöcke „header, footer, and metadata" abgedeckt, siehe Anforderung
  Befund 6) — **Entscheidung: zweiteres**, da ein E2E-Test, der eine noch nicht existierende
  Fußzeilen-UI voraussetzt, nicht sinnvoll grün werden kann; wird als offener Punkt vermerkt, sobald
  `fusszeile-bearbeiten` umgesetzt ist (siehe Abschnitt 11).
- 5.2.8: Aus Fremddatei importierte Kopfzeile (`headerFooter.docx`) über die UI **ergänzen** (Satz
  anhängen) → Export → Reimport → ergänzter **und** ursprünglicher Text vorhanden.
- 5.2.9: Kopfzeile über UI komplett entfernen → Export enthält keine `w:headerReference`/
  `style:header` mehr, Reimport zeigt `header === null` (XML-Inspektion **und** Editor-Sichtprüfung).

**Bestehende Datei `tests/e2e/selection-regression.spec.ts`**: bleibt unverändert bestehen — die dort
geprüfte Sequenz (Body-only) ist von dieser Anforderung nicht betroffen, die **neue**,
kopfzeilenspezifische Sequenz lebt in `header-edit.spec.ts` (siehe oben), nicht als Ergänzung dieser
Datei, um deren bestehenden, laut Anforderung dauerhaft grünen Testbestand nicht anzufassen.

---

## 8. Grenzfälle (Anforderung Abschnitt 4) — Umsetzungsstatus je Punkt

| # | Grenzfall | Wie abgedeckt |
|---|---|---|
| 1 | Aktivierung bei brandneuem Dokument | Abschnitt 1.4 (Zustandsmodell), Test in `header-edit.spec.ts` |
| 2 | Kopfzeile entfernen → kein Geisterelement beim Export | Abschnitt 1.4 (expliziter `header: null`), Test in `header-edit.spec.ts` + `header-roundtrip.spec.ts` (5.2.9) |
| 3 | Doppelklick während aktiver Haupttext-Selektion | Abschnitt 1.5 (geteilter Selection-Sync-Fix, Analyse warum kein Übertrag möglich ist), Pflichttest in `header-edit.spec.ts` |
| 4 | Import „Erste Seite anders" (DOCX) | Abschnitt 1.1 (Typ-Priorisierung: `default` gewinnt, kein Totalverlust) |
| 5 | Import gerade/ungerade (`w:type="even"`) | Abschnitt 1.1 (dieselbe Priorisierung, `even` nur Fallback dritter Stufe) |
| 6 | Kopfzeile mit Bild, neu **und** importiert | Abschnitt 1.3 (Reader- **und** Writer-Fix), Tests 7.2/7.4 (5.2.6) |
| 7 | Kopfzeileninhalt überragt Zone | Abschnitt 1.7 (begrenzte Höhe + internes Scrollen, dokumentiert) |
| 8 | Undo direkt nach erster Eingabe in frisch aktivierter Kopfzeile | Abschnitt 1.8 (Undo-Grenze = Aktivierungszeitpunkt), Test in `header-edit.spec.ts` |
| 9 | Mehrfacher Fokuswechsel Kopfzeile ↔ Haupttext + Tippen | Abschnitt 1.5, Pflicht-Regressionstest in `header-edit.spec.ts` |
| 10 | Mehrseitiges Dokument, Kopfzeile auf jeder Seite | Abschnitt 1.6 (Band-Overlay, Spiegel-Bänder), Test in `header-edit.spec.ts` |
| 11 | Kopfzeile aktiviert, aber nie befüllt, Export | Abschnitt 1.4 (bleibt aktiv/leer, dokumentierte Entscheidung) |
| 12 | Formatierung (fett+Farbe) über Cross-Format-Rundreise | Bestehende Reader/Writer-Mark-Behandlung (unverändert, bereits korrekt laut Anforderungsbefund 1), Test in `header-roundtrip.spec.ts` (5.2.5) |
| 13 | Mehrere `w:sectPr`, davon manche „mit vorheriger verknüpft" | **Nicht vollständig gelöst** — der Reader liest weiterhin nur das `sectPr` am Ende von `w:body` (`reader.ts:350`, unverändert). Dokumentierte Einschränkung: Text aus einem mittleren Abschnitt mit eigener, nicht verknüpfter Kopfzeile wird nicht erkannt; mindestens der Body-Text selbst geht dabei nicht verloren (unverändertes bestehendes Verhalten für den Hauptinhalt), nur dessen Kopfzeile könnte fehlen. Als offener Punkt in Abschnitt 11 vermerkt. |
| 14 | Kopfzeile **und** Fußzeile gleichzeitig, unterschiedlicher Text | Bestehende, unveränderte Reader/Writer-Trennung von `header`/`footer` (zwei getrennte Felder/Parts) reicht bereits aus — kein Vermischungsrisiko durch diese Umsetzung, da Kopfzeilen-Änderungen den Footer-Codepfad nicht berühren. E2E-Nachweis siehe 5.2.7-Einschränkung oben. |

---

## 9. Abnahmekriterien (Anforderung Abschnitt 7) — wie jeder Punkt erfüllt wird

1. Alle Bedienelemente aus Abschnitt 1 der Anforderung → Toolbar-Button + Icon (Abschnitt 4.2), Doppelklick
   (Abschnitt 1.6/3.2), sichtbar abgegrenzter Bereich (Abschnitt 1.6, Trennlinie/Label), Verlassen
   (Klick + Escape, Abschnitt 3.2/4.1), Entfernen-Button (Abschnitt 4.2).
2. „Erste Seite anders"/„Gerade-ungerade"/Seitenzahl-Feld explizit dokumentiert statt stillschweigend
   fehlend → Abschnitt 1.10 dieses Plans, kein täuschendes UI-Element vorhanden.
3. Alle Testfälle aus Abschnitt 6 der Anforderung automatisiert → Abschnitt 7 dieses Plans (muss bei
   Umsetzung tatsächlich grün laufen).
4. Grenzfälle einzeln befundet → Abschnitt 8 dieses Plans.
5. Baseline-Rundreise 5.1 inkl. der fünf realen Fixtures nicht gebrochen → Abschnitt 7.2 (inkl. der
   Korrektur zu `tabellen_header_DOC_LO4-1-0.odt`, Befund 0.5).
6. Feature-Rundreise 5.2 für DOCX/ODT/Cross-Format → Abschnitt 7.4.
7. Selection-Sync-Regressionstest mit Kopfzeilen-Sequenz → Abschnitt 7.4, Pflichttest in
   `header-edit.spec.ts`.
8. Verhältnis zu `fusszeile-bearbeiten` geklärt → Abschnitt 1.9 dieses Plans.

---

## 10. Umsetzungsreihenfolge (Vorschlag)

1. `docx/reader.ts` (`pickReference`, `relsPathFor`) + `docx/writer.ts` (getrennte `headerRels`/
   `footerRels`) + zugehörige Unit-Tests (Abschnitt 7.1) — unabhängig von der UI, behebt die in
   Abschnitt 0 belegten, bereits **heute** aktiven Bugs zuerst.
2. `odt/reader.ts` (`pickMasterPage`) + Unit-Test — unabhängig, parallelisierbar zu Schritt 1.
3. Fixture-Rundreise-Tests (Abschnitt 7.2) — verifiziert Schritt 1/2 gegen die realen Dateien aus der
   Anforderung, inkl. der Korrektur zu `tabellen_header_DOC_LO4-1-0.odt`.
4. `selectionReconciliation.ts` extrahieren (reine Verschiebung, kein Verhaltensunterschied,
   bestehende Suite muss weiterhin grün bleiben) — Voraussetzung für Schritt 5.
5. `pageLayout.ts` (`pageHeaderBandTop`, `HEADER_BAND_MAX_PX`) + `pagination.ts`
   (`onPageCountChange`) + zugehörige Unit-Tests — unabhängig von der Toolbar-Verdrahtung.
6. `HeaderChrome.tsx` + Komponententests — kann gegen einen Mock-„WordEditor"-Kontext entwickelt werden,
   bevor Schritt 7 es tatsächlich einbindet.
7. `WordEditor.tsx`-Restrukturierung (Abschnitt 4.1: `focusedRegion`, `tick`, `headerViewRef`,
   `HeaderChrome`-Einbindung) — abhängig von 4/5/6.
8. `Toolbar.tsx`-Erweiterung (Button, Icon, Props) — abhängig von 7.
9. E2E-Tests `header-edit.spec.ts`, `header-roundtrip.spec.ts` — nach Abschluss von 1–8.
10. Volllauf `npm run test` und `npm run test:e2e`, Abgleich gegen Abschnitt 8/9 dieses Plans, danach
    Rückmeldung an `kopfzeile-bearbeiten-req.md` (Nachträge in Abschnitt 3.4, Grenzfall 7/8) und
    `FEATURE-BACKLOG.md` (Statusänderung „fehlt" → „vorhanden"/„teilweise", je nach tatsächlichem
    Testergebnis).

---

## 11. Bewusst nicht umgesetzt / Folgearbeiten

- Grenzfall 13 (mehrere `w:sectPr` an unterschiedlichen Stellen im Dokument, „mit vorheriger verknüpft")
  bleibt eine dokumentierte Einschränkung — Reader liest weiterhin nur das letzte `sectPr` in `w:body`.
  Volle Unterstützung mehrerer Abschnitte wäre eine grundlegende Datenmodell-Erweiterung
  (`WordDocumentContent.header` müsste zu einer Liste pro Abschnitt werden) und damit klar außerhalb des
  in Anforderung 3.8 vorgegebenen Rahmens „kein neues Datenmodell-Attribut nötig".
- Testfall 5.2.7 (Kopfzeile + Fußzeile gleichzeitig über echte UI-Bedienung) kann erst als vollwertiger
  E2E-Test geschrieben werden, wenn `fusszeile-bearbeiten` umgesetzt ist (siehe Abschnitt 7.4) — bis
  dahin nur auf Unit-Test-Ebene (bereits vorhanden) abgedeckt.
- Bild-Pfad-Auflösung in `resolveImageSources` (`docx/reader.ts`) bleibt hartkodiert relativ zu
  `word/document.xml` statt zum tatsächlichen Part-Pfad — siehe Abschnitt 1.3, funktional unkritisch für
  alle bekannten realen Fixtures (Header/Footer-Parts liegen stets im selben `word/`-Ordner), aber eine
  sauberere Lösung wäre möglich, falls je ein Gegenbeispiel auftaucht.
- „Erste Seite anders"/„Gerade-ungerade" bleiben vollständig ungebaut (eigene Backlog-Slugs); der
  Typ-Priorisierungs-Fix (Abschnitt 1.1) verhindert nur den Totalverlust beim Import, baut aber keine
  UI zur Auswahl/Bearbeitung der Nicht-`default`-Varianten.
- Seitenzahl-Feld (Anforderung 3.7) bleibt vollständig ungebaut — Architektur-Kompatibilität ist in
  Abschnitt 1.10 bestätigt, aber nicht umgesetzt.
- Echte Pro-Seite-DOM-Container (Option (c) aus Abschnitt 1.6) bleiben eine mögliche größere
  Refaktorierung für die Zukunft, falls die Band-Overlay-Lösung sich als unzureichend erweist (z. B. bei
  sehr dynamischen Kopfzeileninhalten oder falls Nutzer:innen echtes Pro-Seite-Editieren erwarten statt
  „ein Band ist editierbar, der Rest ist Spiegel").
