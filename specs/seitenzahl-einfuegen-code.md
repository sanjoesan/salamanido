# Umsetzungsplan: Feature „Seitenzahl einfügen"

Gegenstück zu `specs/seitenzahl-einfuegen-req.md` (Anforderung). Dieses Dokument ist
der **dateigenaue Entwicklungsplan**: was am bestehenden Code nachweislich falsch/
unvollständig ist, welche Dateien sich ändern bzw. neu entstehen, und in welcher
Reihenfolge. Alle Datei:Zeile-Angaben wurden gegen den **tatsächlichen** Quellcode
geprüft (Erstfassung Stand 2026-07-04; **am 2026-07-05 Zeile für Zeile erneut gegen den
aktuellen Code abgeglichen**); die zentralen Reader-/Writer-/Fixture-Aussagen zusätzlich
durch eigenes Entpacken (`unzip -p …`) realer Fixtures verifiziert. **Korrektur beim
2026-07-05-Abgleich:** Die zwischenzeitlich gemergten „Ausschneiden"-Commits (`cutError`-
State + `useAutoDismiss` in `WordEditor.tsx`) haben diese eine Datei um ~8 Zeilen nach
unten verschoben; alle `WordEditor.tsx`-Zeilenangaben unten sind entsprechend
nachgezogen (Body-Seed **Z. 79–81**, `keymap` **Z. 85–107**, `history()` **Z. 84**,
„kein Kontextmenü"-Kommentar **Z. 117–121**). Alle übrigen Dateien (`schema.ts`,
`docx/reader.ts`, `docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts`, `Toolbar.tsx`,
`commands.ts`, `clipboard.ts`, `index.css`, `validateDocument.ts`, `documentModel.ts`,
die Test-Fixtures) stimmen unverändert.

> **Hinweis zur Überarbeitung (dieselbe Korrektur, die `…-req.md` an sich selbst
> vornimmt):** Ein früherer Entwurf dieses Plans war gegen einen **veralteten
> Code-Stand** geschrieben. Er behauptete u. a. (a) `decodeParagraphRuns` iteriere „nur
> direkte `<w:r>`-Kinder", ein `w:fldSimple` gehe **vollständig verloren**; (b) `walk()`
> im ODT-Reader habe „keinen `else`-Fallback", `<text:page-number>` werde „komplett
> übersprungen, Cache-Wert ersatzlos verloren"; (c) es gebe „keinen Test" und die realen
> Fixtures seien „nicht vorhanden". **Alle drei Aussagen sind gegen den aktuellen Code
> nachweislich falsch** und unten korrigiert. Der aktuelle Reader **degradiert** ein
> echtes Seitenzahl-Feld beim Import zu **eingefrorenem, statischem Text** (auf
> Folgeseiten sachlich falsch) — er verliert es nicht. Genau diese **stille Degradierung**
> ist der zu behebende Fehler. Zusätzlich hatte der frühere Entwurf durchgehend um ~90
> Zeilen verschobene Zeilennummern, einen Reader-Umbau, der bestehende, grüne Tests
> (Hyperlink/`w:ins`/`w:sdt`/Textbox-Descent) **regrediert** hätte, sowie einen
> Schema-Node **ohne das laut Anforderung §0.1/§3.4/§3.12 zwingende `leafText`**. Diese
> Fassung behebt das.

---

## 0. Geltungsbereich, Abgrenzung, Kernaussage vorab

`seitenzahl-einfuegen-req.md` legt selbst offen (§0.2, §3.1, §7), dass diese Funktion
eine **harte, nicht selbst zu bauende Abhängigkeit** hat: einen bedienbaren
Kopf-/Fußzeilenbereich (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`, beide
Priorität 1, beide selbst noch nicht umgesetzt — verifiziert: unter `specs/` existiert
keine zugehörige `…-code.md`). Dieser Plan **baut diesen Bereich nicht** (Non-Goal,
Abschnitt 7) und kann daher den Backlog-Status nach Umsetzung nur auf **„teilweise"**,
nicht auf „vorhanden" heben (Abschnitt 8). Das folgt zwingend aus der von der
Anforderung selbst benannten Abhängigkeit, nicht aus einer Unterlassung dieses Plans.

**Was dieser Plan vollständig liefert** (und was laut Anforderung §6 Punkt 6 bereits
*ohne* Kopf-/Fußzeilen-UI test- und teil-freigabefähig ist): das komplette
Datenmodell (Schema-Node inkl. `leafText`), den kompletten DOCX/ODT-Lese- **und**
-Schreibpfad inklusive Behebung der in der Anforderung §0.4/§0.5 nachgewiesenen
**Degradierung**, sowie Command/Toolbar/Schattierung/Tests, die exakt an der Stelle
andocken, an der `kopfzeile-`/`fusszeile-bearbeiten` ihren Editierbereich bereitstellen
werden. Ein zusätzlicher, durch eigene Fixture-Verifikation belegter Bestandsbug (F4,
Header/Footer-Typauswahl) wird mitbehoben, weil sonst die von der Anforderung selbst
verlangten Baseline-Rundreise-Tests am falschen Kopf-/Fußzeilenteil vorbeitesten würden.

---

## 1. Bestätigter Ist-Stand (Anforderung §0, Punkt für Punkt gegen den *aktuellen* Code geprüft)

| # | Befund der Anforderung | Ergebnis der eigenen Prüfung (aktueller Code) |
|---|---|---|
| 1 | Kein Feld-Node/Mark im Schema (§0.1) | **Bestätigt.** `src/formats/shared/schema.ts` `nodes` (Z. 13–155): `doc` (14), `paragraph` (16–24), `heading` (26–38), `text` (40), `hard_break` (42–56), `image` (58–85), `unsupported_block` (92–113), `bullet_list`/`ordered_list`/`list_item` (115–152), `tableNodes(...)` (154). Marks (157–196): `strong`/`em`/`underline`/`strike`/`textColor`/`highlight`. **Kein** Atom-/Feld-Node. `hard_break` (42–56) setzt bewusst `leafText: () => '\n'` (51) — genau dieses Muster braucht das neue Feld (siehe 3.1). |
| 2 | Keine Kopf-/Fußzeilen-Bearbeitung in der UI (§0.2) | **Bestätigt.** `WordEditor.tsx` instanziiert genau **eine** `EditorView`, geseedet ausschließlich aus `doc.content.body` (Z. 79–81). `header`/`footer` (`documentModel.ts:5–6`, `ProseMirrorJSON \| null`) werden in `WordEditor.tsx`/`Toolbar.tsx` **nirgends** referenziert. Reader/Writer verarbeiten sie hingegen bereits (DOCX: `reader.ts:507–532`, `writer.ts:264–273`; ODT: `reader.ts:375–387`, `writer.ts:216–233/271–272`). |
| 3 | Kein Toolbar-Button/Command/Shortcut (§0.3) | **Bestätigt.** `Toolbar.tsx` (297 Z., vollständig gelesen) hat keinen „Seitenzahl"-/„Kopfzeile"-/„Fußzeile"-Eintrag. `commands.ts` (168 Z.) hat `setAlign`/`setHeading`/`toggleList`/`liftFromList`/`insertImage`/`insertHardBreak`/`insertTable`/`applyMarkColor`/`clearMarkColor`/`cutSelection` — **kein** `insertPageNumber`-artiges Command. `WordEditor.tsx` `keymap` (85–107): kein Feld-Shortcut. |
| 4 | DOCX-Lesepfad degradiert PAGE-Feld (§0.4 — **Degradierung, nicht Totalverlust**) | **Bestätigt — als Degradierung.** `decodeParagraphRuns` (Z. 218–222) delegiert an das **rekursive** `collectRuns` (194–216): steigt in `w:r` (203), `w:ins`/`w:hyperlink`/`w:smartTag` (207), `w:sdt`/`w:sdtContent` (209–211) **und `w:fldSimple`** (212–213) ab; `w:del` wird übersprungen (205). `decodeRunElement` (170–184) behandelt nur `w:t` (175)/`w:br` (177)/`w:drawing`/`w:pict` (179) — `w:instrText`/`w:fldChar` matchen **nichts** und lecken **nicht** durch. Konsequenz: **beide** PAGE-Kodierungen (der innere `<w:t>` eines `w:fldSimple`; der `<w:t>` zwischen `separate`/`end` eines `w:fldChar`-Quadruples) werden als **statischer Text** gelesen — auf Folgeseiten falsch, beim Export als hartkodierter Text verewigt. **Kein** Totalverlust. |
| 5 | ODT-Lesepfad degradiert `<text:page-number>` (§0.5 — **Degradierung, nicht Totalverlust**) | **Bestätigt — als Degradierung.** `walk()` (`odt/reader.ts:138–168`) behandelt Textknoten (139), `text:span` (146), `text:line-break` (150), `text:s` (152), `text:tab` (155), Redline/Bookmark (157) **und besitzt einen `else`-Fallback (160–167)**, der in jedes andere Inline-Element mit denselben Marks absteigt (Kommentar nennt `text:page-number`/`text:page-count` ausdrücklich). Ein `<text:page-number>1</text:page-number>` behält daher seinen Cache-Text „1" als **statischen Text** — es wird **nicht** übersprungen. |
| 6 | Kein Schreibpfad für Felder (§0.6) | **Bestätigt.** `inlineToRuns` (`docx/writer.ts:41–67`) kennt nur `text` (53)/`hard_break` (60), **kein `else`** → jeder andere Inline-Node fällt still weg. `inlineToOdt` (`odt/writer.ts:70–83`) kennt nur `hard_break` (74)/`text` (75); sonst `''` (80). |
| 7 | Tests sichern *aktuell das Degradierungs-Verhalten* ab (§0.7 — **es gibt Tests**) | **Bestätigt — Tests existieren.** `docx/__tests__/reader.test.ts:81` „keeps a simple field's cached result text visible (`<w:fldSimple>`)", Eingabe `…<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>…`, Assertion „Text enthält 1". `odt/__tests__/reader.test.ts:53` „keeps surrounding run text visible around a `<text:page-number>`", Eingabe `Seite <text:page-number>1</text:page-number> von <text:page-count>5</text:page-count>`, Assertion „Seite/1/von/5 sichtbar"; sowie `:63` ein kombinierter Feldtest mit `<text:page-number>3</text:page-number>`. Diese Tests prüfen nur „Ziffer irgendwo im Klartext" — sie sind **anzupassen**, sodass sie gezielt den **Feld-Node** prüfen (Abschnitt 6.3). |

### 1a. Eigene Zusatz-Verifikation (durch Entpacken realer Fixtures belegt)

Alle Fixtures in der Tabelle wurden von mir per `unzip -p … | grep` direkt gegen den
ZIP-Inhalt geprüft, nicht aus Dateinamen erraten (deckt sich mit `…-req.md` §0.8). Die
Fixtures **sind bereits im Repo vorhanden** — es müssen keine neuen erzeugt werden.

| Fixture | Verifizierter Inhalt | Rolle |
|---|---|---|
| `docx/FancyFoot.docx` | `footer1.xml`: `<w:fldSimple w:instr=" PAGE   \* MERGEFORMAT ">…<w:t>…</w:t>…` (einzelner `default`-Footer) | Primärer `w:fldSimple`-Positivfall **mit Schalter** (F2) |
| `docx/60316.docx` | `footer2.xml`: 2× `<w:instrText xml:space="preserve"> PAGE </w:instrText>` (fldChar, **ohne** Schalter) | Sauberer `w:fldChar`-Positivfall (F3) |
| `docx/bug57031.docx` | `document.xml` `sectPr`: `footerReference w:type="even" rId9` **vor** `w:type="default" rId10`; Rels: `rId9→footer1.xml` (**kein** PAGE), `rId10→footer2.xml` (`PAGE`, `\* MERGEFORMAT`) | Belegt **F4** *und* fldChar-mit-Schalter — siehe unten |
| `odt/odf-fields.odt` | `content.xml` (**Body**): `<text:page-number text:select-page="current">1</text:page-number>` + 2× `<text:page-count>1</text:page-count>` | ODT-Positivfall **im Body** (heute ohne Kopf-/Fußzeilen-UI vorführbar) + PAGE-≠-page-count-Abgrenzung (F5/F6) |
| `odt/fields.odt` | `styles.xml` (Kopf): `<text:page-number text:select-page="current"/>` (**selbstschließend, ohne Cache**) + `<text:page-count style:num-format="1">1</text:page-count>` | Belegt den **Cache-losen** Feldfall — der Fix muss `cachedValue` auf `'1'` zurückfallen lassen |
| `docx/Bug60341.docx` | `footer.xml`: `<w:ftr><w:sdt><w:sdtContent><w:sdt><w:sdtContent><w:p>…</w:p>…` | Belegt **F11** (Block-`w:sdt`, out-of-scope) |
| `docx/Bug51170.docx` | `_rels/header1.xml.rels`: `rId1→media/image1.pdf`; `_rels/document.xml.rels`: `rId1→numbering.xml` | Belegt **F12** (Kopf-/Fußzeilen-Bild-Rels, out-of-scope) |

Weitere in `…-req.md` §0.8 (dort per Entpacken verifizierte) Pflicht-/Robustheits-Fixtures
sind namentlich übernehmbar: `PageSpecificHeadFoot.docx` (fldSimple), `Bug54771a.docx`/
`bug57031.docx` (fldChar mit Schalter), `WordWithAttachments.docx` (PAGE in der
**Kopfzeile**), `60329.docx`/`Bug60341.docx`/`MultipleBodyBug.docx` (PAGE **+** NUMPAGES,
Grenzfall 11), `sample.odt`/`sample_numbering_DOC_LO41.odt` (ODT).

**F4 — neuer, von der Anforderung nicht benannter, selbst verifizierter Bestandsbug
(`headerReference`/`footerReference` ignorieren `w:type`).** `readDocx` (Z. 509–510)
liest die Referenzen mit `firstChildNS(sectPr, w, 'headerReference'/'footerReference')`
— das liefert das **erste in Dokumentreihenfolge** vorkommende Element.
`childElements`/`firstChildNS` (16–22) filtern nur nach Namensraum/Elementname, **nicht**
nach `w:type`. An `bug57031.docx` selbst nachgezählt: die erste `footerReference` ist
`w:type="even"` (`rId9→footer1.xml`, ohne PAGE), die `default`-Referenz
(`rId10→footer2.xml`, enthält das eigentliche `Page … of 14`) kommt strukturell
**danach**. Der aktuelle Reader liest folglich den **leeren even-Footer** und verfehlt
den sichtbaren PAGE-Footer. **Betrifft jeden Kopf-/Fußzeileninhalt** in Dateien mit
Erste-Seite-/Gerade-Ungerade-Varianten (laut `FEATURE-SPEC-DOCX-ODT.md` §9 ein häufiges
reales Muster). **Einstufung: Muss** — sonst würde die von `…-req.md` §5.1/§5.2 Punkt 7
verlangte Baseline-/Feature-Rundreise mit `bug57031.docx` (u. Ä.) am falschen Footer
vorbeitesten und den eigentlichen Feld-Fix (F3) fälschlich als „grün" durchwinken. Siehe
Fix in 4.6.

**F11/F12 — zwei weitere selbst verifizierte, aber bewusst *out-of-scope* Bestandsbugs**
(Abschnitt 7, jeweils generisch, nicht seitenzahlspezifisch): F11 = **Block-`w:sdt`** als
direktes Kind von `<w:ftr>`/`<w:hdr>`/`<w:body>` wird von `readBodyChildren` (464–485,
behandelt nur `w:p`/`w:tbl`) übersprungen (an `Bug60341.docx` verifiziert — Achtung:
**Run-**`w:sdt` innerhalb eines `<w:p>` wird bereits korrekt behandelt, `collectRuns`
209–211, Test `reader.test.ts:72`; die Lücke ist rein die **Block-**Ebene). F12 =
Kopf-/Fußzeilen-Bilder werden über `documentRels` statt über die eigene
`_rels/headerN.xml.rels`/`footerN.xml.rels` aufgelöst (`readDocx` reicht `documentRels`
an die Kopf-/Fußzeilen-`readBodyChildren` durch, Z. 520/529; an `Bug51170.docx`
verifiziert: `rId1` liefert dort die Bytes von `numbering.xml` statt des Bildes). Beide
werden **dokumentiert, nicht behoben** (empfohlen für `kopfzeile-`/`fusszeile-bearbeiten`,
die die Kopf-/Fußzeilen-Lesepfade ohnehin grundlegend anfassen).

---

## 2. Priorisierte Fehler-/Lückenliste

„Muss" = blockierend für die in Abschnitt 8 bewertete **Teil**abnahme. „Dokumentiert" =
bewusst nicht behoben (Abschnitt 7).

| # | Befund | Einstufung | Fix in |
|---|---|---|---|
| F1 | Kein Datenmodell/Node für ein Feld (§0.1) | **Muss** | 4.1 |
| F2 | `w:fldSimple`-PAGE wird zu statischem Text degradiert (§0.4) | **Muss** | 4.6 |
| F3 | `w:fldChar`-Quadruple-PAGE wird zu statischem Text degradiert (§0.4) | **Muss** | 4.6 |
| F4 | `headerReference`/`footerReference` ignorieren `w:type` (neu, 1a) | **Muss** | 4.6 |
| F5 | ODT `text:page-number` wird zu statischem Text degradiert (§0.5) | **Muss** | 4.9 |
| F6 | ODT `text:page-count` darf **nicht** als Seitenzahl gelabelt werden (Grenzfall 11) | **Muss** | 4.9 |
| F7 | Kein Schreibpfad DOCX/ODT für das neue Feld (§0.6) | **Muss** | 4.7, 4.10 |
| F8 | Kein Toolbar-Button/Command | **Muss** | 4.3, 4.4 |
| F9 | Keine visuelle Feldschattierung (§1 Zeile 4) | **Muss** | 4.1, 4.5 |
| F10 | Bestandstests prüfen nur „Ziffer sichtbar", nicht den Feld-Node (§0.7) | **Muss** | 6.3 |
| F11 | Block-`w:sdt` in Kopf-/Fußzeile ignoriert (neu, 1a) | **Dokumentiert** | 7 |
| F12 | Kopf-/Fußzeilen-Bilder über falsche Rels-Datei (neu, 1a) | **Dokumentiert** | 7 |
| F13 | Kein bedienbarer Kopf-/Fußzeilenbereich (Abhängigkeit) | **Dokumentiert** (fremdes Ticket) | 7 |

---

## 3. Kernentscheidungen

### 3.1 Schema: ein eng geschnittener Atom-Node **mit `leafText`** — keine generische Feld-Abstraktion

Neuer Node `page_number_field` (Name aus Anforderung §3.4), **inline, atom, selectable**,
`marks: '_'` (alle Marks erlaubt, §3.4/§3.10), ein optionales Attribut `cachedValue`, und
— **zwingend** — ein eigenes **`leafText`**. Ohne `leafText` behandelt **jede**
Klartext-Extraktion (`Node.textContent`, `textBetween`, und damit
`clipboardTextSerializer` über `nodeToPlainText`, `clipboard.ts:51–56`, Leaf-Zweig 53–55) diesen Leaf-Node
als **leeren String**; „Seite " + Feld + „." verschmölze beim Klartext-Kopieren zu
„Seite ." (Anforderung §0.1/§3.12 — exakt der Grund für `hard_break.leafText`,
`schema.ts:51`). Der frühere Entwurf ließ `leafText` weg — das ist hier behoben.

Bewusst **kein** generischer `field`-Node mit `kind`/`fieldType`-Attribut (der auch
`NUMPAGES`/`text:page-count` fassen könnte): das lädt genau die in Grenzfall 11 gewarnte
Verwechslung strukturell ein. Ein eigener `page_count_field`-Node ist **Non-Goal**
(Abschnitt 7) und würde — falls „Seite X von Y" später beauftragt wird — ein eigener,
gleich benannter Node.

### 3.2 DOCX-Exportform: `w:fldChar`-Quadruple, nicht `w:fldSimple`

Begründung (Anforderung §3.5 verlangt eine begründete Wahl): Die Quadruple-Form ist die
von echtem Word überwiegend erzeugte und beibehaltene Form (`w:fldSimple` wandelt Word
beim ersten Bearbeiten intern in die Quadruple-Form um) — direktes Schreiben der
Quadruple-Form vermeidet diese Word-seitige Umwandlung. In den real verifizierten
Repo-Fixtures überwiegt sie ebenfalls deutlich (`…-req.md` §0.8: `60316`/`Bug54771a`/
`bug57031`/`WordWithAttachments`/`Bug51170`/`60329`/`Bug60341`/`MultipleBodyBug` als
fldChar; nur `FancyFoot`/`PageSpecificHeadFoot` als fldSimple). **Der Import muss dennoch
beide Formen erkennen** (§3.6) — unabhängig von der Exportwahl (4.6).

### 3.3 ODT-Exportform: `<text:page-number text:select-page="current">N</text:page-number>`

Exakt das von LibreOffice Writer erzeugte Element (per `odf-fields.odt`/`fields.odt`
bestätigt, inkl. `text:select-page="current"`). `N` ist nur Cache-/Vorschauwert.

### 3.4 Cache-Wert-Strategie

`cachedValue` ist rein kosmetisch, nie maßgeblich (§3.4/§3.5/§3.7):
- **Neu eingefügt** (Toolbar): `cachedValue = '1'` (plausibler Platzhalter, §3.9 — keine
  Pagination-Kopplung nötig/gefordert).
- **Import**: der real eingebettete Cache-Wert wird übernommen; ist das Element
  leer/selbstschließend (`fields.odt`) oder fehlt im Quadruple `separate`/`<w:t>` (real
  möglich), fällt der Reader auf `'1'` zurück — **nie** leerer String, **nie** Absturz.
- **Export**: `cachedValue` wird 1:1 in den Cache-Slot geschrieben — kein Neuberechnen.

### 3.5 Reader-Integrationsstrategie (NICHT `decodeParagraphRuns` neu erfinden)

Der frühere Entwurf ersetzte `decodeParagraphRuns` durch eine Schleife über
`pEl.children`, die nur `w:r`/`w:fldSimple` kannte. Das hätte die **bereits vorhandene,
getestete** Wrapper-Rekursion (`w:ins`/`w:hyperlink`/`w:smartTag`/`w:sdt`, Tests
`reader.test.ts:60/72/103`) und die Textbox-/Bild-Logik (`decodeDrawingOrPict`, `w:pict`)
**regrediert**. Diese Fassung integriert stattdessen minimal-invasiv in die **bestehende**
Architektur `collectRuns` → `decodeRunElement` → Nachlauf (4.6): `w:instrText`/`w:fldChar`
werden als neue, transiente `RunLike`-Marker emittiert und in `decodeParagraphRuns` per
Nachlauf zu einem `field`-Run gefaltet; `w:fldSimple` wird in `collectRuns` gezielt
abgefangen. Alle bestehenden Wrapper-/Textbox-/Bild-Pfade **bleiben unverändert**.

### 3.6 Toolbar-Gating ohne existierenden Kopf-/Fußzeilenbereich

Anforderung §1 Zeile 1 wünscht einen nur in Kopf-/Fußzeile aktiven Button, räumt in
Grenzfall 1 aber die zweite gültige Option ein: bewusst auch im Fließtext erlauben (wie
Word „Einfügen → Feld → PAGE"). Da `WordEditor.tsx` **nur eine**, an `body` gebundene
`EditorView` kennt (Z. 79–81), gibt es keinen zu unterscheidenden Kontext. Entscheidung:
**Grenzfall-1-Variante „bewusst erlaubt"** — der Button ist immer aktiv und wirkt auf den
fokussierten (aktuell einzigen) Bereich. Das erfüllt §3.15 („nie ein ergebnisloser
Klick") vollständig, weil er nie ins Leere läuft. Sobald `kopfzeile-`/`fusszeile-bearbeiten`
einen zweiten fokussierbaren Bereich schaffen, ist die echte Kontext-Prüfung nachzurüsten
(TODO-Markierung im Code, 4.4).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts`

Neuer Node, eingefügt **nach `hard_break` (Z. 42–56), vor `image` (Z. 58)**:

```ts
  /**
   * Ein automatisch fortlaufendes Seitenzahl-Feld (Word PAGE / ODF
   * <text:page-number>). Inline-Atom (anders als das Block-`image`), damit es
   * mitten im Text stehen kann ("Seite " + Feld + "."). `atom`+`selectable` ohne
   * eigenes `content` macht es zu einem echten Leaf — atomares Löschen/Kopieren/
   * Cursor-Navigation ergeben sich automatisch, exakt wie beim `image`-Node
   * (Anforderung §3.11/§3.12). `marks: '_'` erlaubt Fett/Kursiv/Farbe direkt auf
   * dem Feld (§3.4/§3.10) — im Gegensatz zu `hard_break` ist das hier bewusst
   * genutzt. `leafText` ist PFLICHT (§0.1/§3.12): ohne es liefert jede
   * Klartext-Extraktion (Node.textContent/textBetween und damit der
   * clipboardTextSerializer über nodeToPlainText, clipboard.ts:51-56) einen
   * leeren String, und benachbarte Wörter verschmelzen beim Klartext-Kopieren
   * ("Seite ." statt "Seite 1.") — dieselbe Begründung wie hard_break.leafText (Z. 51).
   */
  page_number_field: {
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    marks: '_',
    attrs: { cachedValue: { default: '1', validate: 'string' } },
    leafText: (node) => String(node.attrs.cachedValue ?? ''),
    parseDOM: [
      {
        tag: 'span[data-field-type="page-number"]',
        getAttrs: (dom) => ({ cachedValue: (dom as HTMLElement).textContent?.trim() || '1' }),
      },
    ],
    toDOM(node) {
      return [
        'span',
        {
          class: 'pm-field pm-field-page-number',
          'data-field-type': 'page-number',
          contenteditable: 'false',
          title: 'Seitenzahl-Feld (wird beim Öffnen in Word/LibreOffice automatisch berechnet)',
        },
        String(node.attrs.cachedValue ?? '1'),
      ]
    },
  },
```

Kein neues Mark, keine Änderung an `tableNodes(...)` (154) oder den Marks (157–196) — das
Feld nutzt via `marks: '_'` die vorhandenen Marks.

**Warum keine eigene NodeView nötig ist:** wie beim `image`-Node (58–85, ebenfalls ohne
NodeView) genügt `toDOM`/`parseDOM`; ProseMirror nutzt dieselbe Definition automatisch für
die DOM-basierte Zwischenablage-Serialisierung, sodass internes Kopieren/Einfügen inkl.
umschließender Marks ohne Zusatzcode funktioniert (Grenzfall 7, §3.12). Der
Klartext-Clipboard-Pfad ist über `leafText` abgedeckt.

**Konsequenz für `validateDocument.ts`:** `assertLoadableDocument` (12–22) ruft
`wordSchema.nodeFromJSON(...).check()` für `body`/`header`/`footer`. Der Node muss also im
Schema registriert sein, **bevor** die Reader ihn erzeugen (Phasenreihenfolge A vor B/C,
Abschnitt 9). `check()` erzwingt zugleich die Atomarität (kein `content`) — Testfall 6.4.4.

### 4.2 `src/formats/shared/documentModel.ts` — keine Änderung

`header`/`footer` sind bereits `ProseMirrorJSON | null` (Z. 5–6) — generisch genug für
Absätze mit dem neuen Node, sobald `kopfzeile-`/`fusszeile-bearbeiten` sie befüllen.

### 4.3 `src/formats/shared/editor/commands.ts`

Neue Funktion, eingefügt nach `insertImage` (Z. 66–74):

```ts
export function insertPageNumberField(): Command {
  return (state, dispatch) => {
    const node = wordSchema.nodes.page_number_field.create({ cachedValue: '1' })
    if (dispatch) {
      // replaceSelectionWith(node) übernimmt (inheritMarks-Default) automatisch die
      // an der Cursor-Position aktiven Marks (storedMarks/$from.marks()) auf das
      // markfähige Feld — erfüllt §3.10 ("davor formatieren, dann einfügen") ohne
      // Zusatzcode; ersetzt zugleich eine bestehende Selektion (§3.3), exakt wie
      // insertImage (Z. 66-74) und insertTable (Z. 92-102).
      dispatch(state.tr.replaceSelectionWith(node).scrollIntoView())
    }
    return true
  }
}
```

Kein neuer Keymap-Eintrag in `WordEditor.tsx` (kein zwingend nachzubildender
Word-/LibreOffice-Standard-Shortcut; Anforderung §1 Zeile 1 nennt nur den Toolbar-Klick
als Pflichtweg). Kein `isInHeaderFooter`-Helfer (Kernentscheidung 3.6).

### 4.4 `src/formats/shared/editor/Toolbar.tsx`

Import (Z. 6–20) um `insertPageNumberField` ergänzen. Neuer Button **vor** dem
schließenden `</div>` (Z. 295), nach dem Bild-Label (291–294):

```tsx
      <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

      {/*
        TODO(kopfzeile-bearbeiten / fusszeile-bearbeiten): Es gibt aktuell nur eine,
        an `body` gebundene EditorView (WordEditor.tsx:79–81) — kein fokussierbarer
        Kopf-/Fußzeilenbereich. Bis dieser existiert, wirkt der Button bewusst auf den
        fokussierten (einzigen) Bereich (Grenzfall-1-Variante "bewusst erlaubt", siehe
        seitenzahl-einfuegen-code.md 3.6). Danach hier eine Kontext-Prüfung ergänzen,
        die den Button deaktiviert/versteckt, wenn der Fokus nicht in Kopf-/Fußzeile
        liegt (Anforderung §3.15).
      */}
      <button
        type="button"
        title="Seitenzahl einfügen"
        aria-label="Seitenzahl einfügen"
        onMouseDown={(e) => {
          e.preventDefault()
          run(view, insertPageNumberField())
        }}
        className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" focusable="false">
          <rect x="3" y="1.5" width="14" height="17" rx="1.5" />
          <line x1="6" y1="6" x2="14" y2="6" />
          <line x1="6" y1="9.5" x2="14" y2="9.5" />
          <line x1="6" y1="13" x2="11" y2="13" />
          <circle cx="14.5" cy="15.3" r="2.7" fill="currentColor" stroke="none" />
          <text x="14.5" y="16.4" fontSize="3.6" fill="white" stroke="none" textAnchor="middle" fontFamily="sans-serif">1</text>
        </svg>
      </button>
```

Bewusst **eingebettetes SVG** (Anforderung §0.9/§1 Zeile 1 verlangt das explizit; wie
`ScissorsIcon`, Z. 33–53), kein Emoji wie „🖼"/„🖍". Kein `aria-pressed` (Einfüge-Aktion,
kein Umschalter — konsistent mit Tabellen-/Bild-Button). Der **zugängliche Name**
„Seitenzahl einfügen" ist per `title` **und** `aria-label` gesetzt (identisch für
Screenreader und E2E-`getByRole('button', { name: 'Seitenzahl einfügen' })`, §6 Punkt 5).

### 4.5 `src/index.css`

Neuer Block nach der `.ProseMirror img`-Regel (Z. 39–42):

```css
/*
 * Feldschattierung, analog zur in Word sichtbaren Feld-Markierung (Anforderung §1
 * Zeile 4). Die editierbare "Seite" ist immer weiß hinterlegt (pageBackgroundStyle()
 * in pageLayout.ts, ein Theme-unabhängiges "Papier"-Layout; .ProseMirror-Text ist
 * #111827, siehe index.css:26) — daher genügt ein einziger, nicht Dark-Mode-
 * abhängiger Grauton, der nur gegen weißes Papier lesbar sein muss.
 */
.ProseMirror .pm-field {
  background: rgba(100, 116, 139, 0.22);
  border-radius: 2px;
  padding: 0 1px;
}
```

### 4.6 `src/formats/docx/reader.ts` (F2/F3/F4)

**F4 (typrichtige Referenzwahl):** Hilfsfunktion nach `firstChildNS` (Z. 20–22):

```ts
/**
 * Wählt die "default"-Kopf-/Fußzeilenreferenz. `firstChildNS` liefert das erste
 * Element in Dokumentreihenfolge — bei mehreren headerReference/footerReference
 * (Erste-Seite-/Gerade-Ungerade-Varianten, in echtem Word üblich, z. B.
 * tests/fixtures/external/docx/bug57031.docx: even VOR default) ist das NICHT
 * zwingend der default-Eintrag. Bevorzugt w:type="default", fällt sonst auf das
 * erste vorhandene Element zurück (bewahrt das bisherige Verhalten im Ein-Typ-Fall).
 */
function referenceByType(sectPr: Element, localName: 'headerReference' | 'footerReference'): Element | null {
  const candidates = childElements(sectPr, OOXML_NAMESPACES.w, localName)
  return candidates.find((el) => el.getAttributeNS(OOXML_NAMESPACES.w, 'type') === 'default') ?? candidates[0] ?? null
}
```

In `readDocx` (Z. 509–510) ersetzen:
```ts
// vorher:  const headerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')
//          const footerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'footerReference')
const headerRef = referenceByType(sectPr, 'headerReference')
const footerRef = referenceByType(sectPr, 'footerReference')
```

**F2/F3 (Feld-Erkennung, integriert in die bestehende Architektur — siehe 3.5):**

(a) `RunLike` (Z. 117–125) um Feld- und transiente Markerkinder erweitern (bestehende
Kinder `text`/`break`/`image`/`unsupported` **bleiben**):
```ts
interface RunLike {
  kind: 'text' | 'break' | 'image' | 'unsupported' | 'field' | 'fieldChar' | 'instr'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
  unsupportedKind?: 'textbox' | 'object'
  unsupportedBlocks?: JsonNode[]
  cachedValue?: string
  fldCharType?: 'begin' | 'separate' | 'end'
}
```

(b) `isPageFieldInstr` (nach `marksFromRunProperties`, Z. 100–115) — **exakter
Token**vergleich, grenzt gegen `NUMPAGES`/`PAGEREF` ab (Grenzfall 11):
```ts
/** True nur für ein PAGE-Feld. Tolerant gegen Whitespace und gängige Schalter
 *  (" PAGE ", "PAGE  ", "PAGE \* MERGEFORMAT", "PAGE \* Arabic", "PAGE \* ROMAN");
 *  exakter erster-Token-Vergleich schließt NUMPAGES/PAGEREF/PAGE\d bewusst aus
 *  (reale Belege mit PAGE+NUMPAGES in einer Fußzeile: 60329/Bug60341/MultipleBodyBug). */
function isPageFieldInstr(instr: string): boolean {
  return instr.trim().split(/\s+/)[0]?.toUpperCase() === 'PAGE'
}
```

(c) `decodeRunElement` (Z. 170–184): zwei Zweige ergänzen (bestehende `w:t`/`w:br`/
`w:drawing`/`w:pict`-Zweige bleiben). Der zwischengespeicherte `<w:t>` eines Quadruples
wird weiterhin vom bestehenden `w:t`-Zweig (mit seinen Marks) als `text`-Run emittiert und
erst im Nachlauf (e) gefaltet:
```ts
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'instrText') {
      out.push({ kind: 'instr', text: child.textContent ?? '' })
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'fldChar') {
      const fldCharType = child.getAttributeNS(OOXML_NAMESPACES.w, 'fldCharType') as 'begin' | 'separate' | 'end' | null
      if (fldCharType) out.push({ kind: 'fieldChar', fldCharType, marks: marks.length ? marks : undefined })
    }
```

(d) `collectRuns` (Z. 194–216): den `w:fldSimple`-Zweig (212–213) gezielt umbauen —
PAGE-fldSimple wird zum Feld, jedes andere fldSimple bleibt wie bisher (Descent, Cache-Text
sichtbar; **keine** Regression von `reader.test.ts`):
```ts
    } else if (child.localName === 'fldSimple') {
      const instr = child.getAttributeNS(OOXML_NAMESPACES.w, 'instr') ?? ''
      if (isPageFieldInstr(instr)) {
        // Innere Runs separat einsammeln (bewahrt den Wrapper-Descent), Cache-Text
        // und Marks daraus ableiten, als EIN Feld-Run ausgeben.
        const inner: RunLike[] = []
        collectRuns(child, inner, headingInfo, imageRels, depth)
        const cached = inner.filter((r) => r.kind === 'text').map((r) => r.text ?? '').join('')
        const marks = inner.find((r) => r.kind === 'text' && r.marks)?.marks
        runs.push({ kind: 'field', cachedValue: cached || '1', marks })
      } else {
        collectRuns(child, runs, headingInfo, imageRels, depth) // wie bisher (FILENAME o. Ä.)
      }
    }
```

(e) `decodeParagraphRuns` (Z. 218–222) um einen Faltungs-Nachlauf ergänzen. Der
`w:fldChar`-Quadruple erstreckt sich über mehrere `<w:r>`-Geschwister; `collectRuns`
liefert sie (auch aus Hyperlink/`w:ins`/`w:sdt`-Wrappern) in Dokumentreihenfolge flach —
der Nachlauf faltet `begin … instrText* … separate … <w:t>* … end` zu einem Feld:
```ts
function decodeParagraphRuns(pEl: Element, headingInfo: HeadingInfo, imageRels: Map<string, string>, depth = 0): RunLike[] {
  const raw: RunLike[] = []
  collectRuns(pEl, raw, headingInfo, imageRels, depth)
  return foldFieldChars(raw)
}

/**
 * Faltet w:fldChar-Quadruple-Sequenzen zu einem 'field'-Run, WENN der Feldcode PAGE
 * ist (isPageFieldInstr). Bei jedem anderen Feldcode (NUMPAGES/PAGEREF/AUTHOR/…) werden
 * nur die fieldChar/instr-Marker entfernt und der zwischengespeicherte <w:t>-Text als
 * gewöhnlicher statischer Text beibehalten — exakt das heute in reader.test.ts
 * abgesicherte "Cache-Text bleibt sichtbar"-Verhalten, nur ohne durchsickernden Feldcode.
 * Ein fehlendes 'end' (defektes XML) beendet die innere Schleife am Absatzende sauber.
 * VERSCHACHTELTE Felder (z. B. `{ IF { PAGE } … }`, ein reales, aber seltenes
 * Word-Muster): die innere Schleife bricht am ERSTEN 'end' ab, der äußere `begin`
 * verklebt beide instrText-Anteile (isPageFieldInstr sieht dann z. B. "IFPAGE" und
 * behandelt es bewusst als Nicht-PAGE → Cache-Text bleibt statischer Text). Das ist
 * eine bewusst in Kauf genommene, verlustfreie Degradierung (kein Absturz, kein
 * durchsickernder Feldcode); ein echtes verschachteltes PAGE-Feld ist in keiner der
 * verifizierten Fixtures (0.8/1a) vorhanden und Non-Goal. Falls später doch benötigt,
 * müsste die Schleife die begin/end-Tiefe mitzählen.
 */
function foldFieldChars(runs: RunLike[]): RunLike[] {
  const out: RunLike[] = []
  let i = 0
  while (i < runs.length) {
    const r = runs[i]
    if (r.kind === 'fieldChar' && r.fldCharType === 'begin') {
      let instr = ''
      let sawSeparate = false
      const cached: RunLike[] = []
      let fieldMarks = r.marks
      let j = i + 1
      for (; j < runs.length; j++) {
        const s = runs[j]
        if (s.kind === 'fieldChar' && s.fldCharType === 'end') break
        if (s.kind === 'fieldChar' && s.fldCharType === 'separate') { sawSeparate = true; continue }
        if (s.kind === 'instr') { instr += s.text ?? ''; continue }
        if (sawSeparate && s.kind === 'text') { cached.push(s); if (s.marks) fieldMarks = s.marks }
        // sonstige Runs im Feldkörper (z. B. verschachteltes Bild) werden ignoriert
      }
      if (isPageFieldInstr(instr)) {
        out.push({ kind: 'field', cachedValue: cached.map((c) => c.text ?? '').join('') || '1', marks: fieldMarks })
      } else {
        out.push(...cached) // Nicht-PAGE: Cache-Text als statischer Text erhalten
      }
      i = j + 1
      continue
    }
    if (r.kind === 'fieldChar' || r.kind === 'instr') { i++; continue } // verwaiste Marker verwerfen
    out.push(r)
    i++
  }
  return out
}
```

(f) `runsToInline` (Z. 282–287) um den `'field'`-Fall ergänzen:
```ts
function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind === 'text' || r.kind === 'break' || r.kind === 'field')
    .map((r) => {
      if (r.kind === 'break') return { type: 'hard_break' }
      if (r.kind === 'field') return { type: 'page_number_field', attrs: { cachedValue: r.cachedValue || '1' }, marks: r.marks }
      return { type: 'text', text: r.text ?? '', marks: r.marks }
    })
    .filter((n) => n.type !== 'text' || n.text)
}
```

**Keine** Änderung an `paragraphToBlocks` (229–280): `hasBlockRun` (244) prüft nur
`image`/`unsupported`; `'field'` ist inline und läuft im bild-freien wie im bild-gemischten
Zweig (265–277, `else`-Buffer) durch denselben `runsToInline`-Pfad wie Text. Nach
`foldFieldChars` existieren keine `fieldChar`/`instr`-Runs mehr.

### 4.7 `src/formats/docx/writer.ts` (F7)

`inlineToRuns` (Z. 41–67): neuer Zweig, flusht den Text-Buffer vor dem Feld:
```ts
    } else if (node.type === 'page_number_field') {
      flush()
      // w:fldChar-Quadruple (Kernentscheidung 3.2). Import erkennt beide Formen (4.6).
      // Dieselbe rPr auf allen fünf Runs -> Marks (fett/Farbe) round-trippen (Grenzfall 14).
      const rPr = runPropertiesXml(node.marks)
      const cached = encodeRunText(String(node.attrs?.cachedValue ?? '1'))
      runs.push(
        `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
          `<w:r>${rPr}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
          `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
          `<w:r>${rPr}${cached}</w:r>` +
          `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`,
      )
    }
```
`inlineToRuns` wird bereits überall aufgerufen, wo das Feld vorkommen kann (`blockToDocx`
`paragraph`/`heading`, Z. 112–124) — kein weiterer Signatur-/Aufrufwechsel nötig.

### 4.8 `src/formats/docx/xmlUtil.ts` — keine Änderung

`OOXML_NAMESPACES.w` deckt `w:fldChar`/`w:instrText`/`w:fldSimple` ab (alle im
`w`-Namensraum); `a`/`r`/`wp` für Bilder sind vorhanden.

### 4.9 `src/formats/odt/reader.ts` (F5/F6)

`walk()` (Z. 138–168): zwei `else if` **vor** dem finalen `else` (Z. 160), nach dem
`text:tab`-Zweig (155–156):
```ts
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-number') {
      // Echtes Seitenzahl-Feld. Selbstschließend/ohne Cache (fields.odt) ODER mit
      // Cache-Text (odf-fields.odt) — beide Fälle, '1' als Fallback (§3.9), nie leer.
      const cached = (el.textContent ?? '').trim()
      result.push({ type: 'page_number_field', attrs: { cachedValue: cached || '1' }, marks: marks.length ? marks : undefined })
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-count') {
      // Gesamtseitenzahl — bewusst NICHT der Seitenzahl-Node (Grenzfall 11/§3.8,
      // Non-Goal). Ohne diesen expliziten Zweig fiele page-count in den else-Fallback
      // (160-167) und bliebe ebenfalls sichtbarer Text; der Zweig kodifiziert dieses
      // Verhalten und schützt die PAGE-≠-page-count-Trennung gegen spätere Refactors.
      const cached = (el.textContent ?? '').trim()
      if (cached) result.push({ type: 'text', text: cached, marks: marks.length ? marks : undefined })
```
`walk()` wird rekursiv mit akkumulierten Marks aufgerufen (auch in `text:span`, 146–149),
also werden `<text:page-number>` sowohl direkt im Absatz (`odf-fields.odt`) als auch in
einem `<text:span>` (`fields.odt`, mit Marks) korrekt erfasst — kein Änderungsbedarf an
`decodeInline`/`paragraphToBlocks`/`elementToBlocks` darüber hinaus.

### 4.10 `src/formats/odt/writer.ts` (F7)

`inlineToOdt` (Z. 70–83): neuer Fall, wiederverwendet `runPropsFromMarks`/
`TextStyleRegistry.styleNameFor` wie der `text`-Fall (75–79):
```ts
      if (node.type === 'page_number_field') {
        const cached = escapeXml(String(node.attrs?.cachedValue ?? '1'))
        const field = `<text:page-number text:select-page="current">${cached}</text:page-number>`
        const styleName = styles.styleNameFor(runPropsFromMarks(node.marks))
        return styleName ? `<text:span text:style-name="${styleName}">${field}</text:span>` : field
      }
```

### 4.11 `odt/xmlUtil.ts`, `odt/styleRegistry.ts`, `docx/styleDefs.ts` — keine Änderung

`ODF_NAMESPACES.text` deckt `text:page-number`/`text:page-count` ab; das Feld nutzt exakt
dieselben Zeichen-Stildefinitionen wie normaler Text.

---

## 5. Grenzfall-Bewertung (Anforderung §4, alle 16)

| # | Grenzfall | Bewertung nach diesem Plan |
|---|---|---|
| 1 | Feld im Body einfügen/importieren | **Import positionsunabhängig** (Reader erkennt PAGE/`text:page-number` überall; Fixture `odf-fields.odt` liegt im Body). **UI-Einfügen bewusst erlaubt** (Kernentscheidung 3.6) — dokumentiert, kein Zufall. |
| 2 | Klick ohne aktive Kopf-/Fußzeile | Strukturell nicht anders möglich (Grenzfall 1); nach `kopfzeile-`/`fusszeile-bearbeiten` per TODO in 4.4 nachrüsten. Kein Crash, keine Nichtwirkung. |
| 3 | Mehrere Felder im selben Absatz | Trivial — jede Betätigung erzeugt eine unabhängige Node-Instanz, keine Dedupe. |
| 4 | Feld neben Text ohne Leerzeichen | Schema-Eigenschaft: ProseMirror verschmilzt einen Atom-Node nie mit Text. `leafText` (4.1) hält sie zudem im Klartext getrennt. |
| 5 | Selection-Sync-Regressionssequenz (`FEATURE-SPEC` §2) | E2E-Pflichttest, sobald ein Editierbereich existiert; heutiger Body-Level-Ersatztest in 6.5. |
| 6 | Backspace/Entf am Feldrand | `atom: true` + `contenteditable="false"` (4.1) → atomares Löschen, identisch zum `image`-Node. **Muss** per Browser-E2E verifiziert werden (jsdom bildet natives contenteditable nicht ab), 6.5. |
| 7 | Kopieren/Einfügen | Über `toDOM`/`parseDOM` (DOM-Clipboard) + `leafText` (Klartext-Clipboard) — kein Zusatzcode. |
| 8 | Import fldChar-Quadruple mit `\* MERGEFORMAT` | Behoben (F3, 4.6); Fixtures `bug57031.docx`/`Bug54771a.docx`. Schaltertext bleibt unsichtbar. |
| 9 | Import `w:fldSimple` | Behoben (F2, 4.6); Fixtures `FancyFoot.docx`/`PageSpecificHeadFoot.docx`. |
| 10 | Import `<text:page-number>` | Behoben (F5, 4.9); Fixtures `odf-fields.odt`/`fields.odt` (inkl. selbstschließend). |
| 11 | `<text:page-count>`/`NUMPAGES` nicht verwechseln | Behoben (F6, 4.9 eigener Zweig; DOCX: `isPageFieldInstr` exakter Token). Wert bleibt als Text erhalten. Fixtures `odf-fields.odt`, `60329.docx`. |
| 12 | Cross-Format-Rundreise | Aus 4.1 (gemeinsamer Node) + 4.6/4.7/4.9/4.10 (beide Reader/Writer, derselbe Node). Test 6.5 Punkt 7. |
| 13 | Undo/Redo | Aus dem global aktiven `history()` (`WordEditor.tsx:84`) ohne Zusatzcode; Unit-Test 6.4. |
| 14 | Formatierung + Rundreise | Aus `marks: '_'` (4.1) + `runPropertiesXml`/`runPropsFromMarks`-Wiederverwendung (4.7/4.10). |
| 15 | Enter vor/nach dem Feld | Standard-`splitBlock`-Verhalten für Atom-Nodes (wie `image`); Unit-Test 6.4. |
| 16 | Viele simulierte Seiten | Zielanwendung berechnet selbst (§3.9); Live-Editor-Darstellung ist separat dokumentierter Non-Blocker (Abschnitt 7). |

---

## 6. Tests

Bestehende und neue Tests werden **beide** gebraucht (Anforderung §6 Punkt 8: reine
JSON-/synthetische Fixtures genügen nicht, reale Dateien sind namentlich zu nutzen).

### 6.1 Neu: `src/formats/docx/__tests__/page-number-field.test.ts`

Muster wie `docx/__tests__/roundtrip.test.ts`/`reader.test.ts` (`buildDocx`-Helfer):
1. Synthetisches fldChar-Quadruple **mit `\* MERGEFORMAT`** → genau **ein**
   `page_number_field` mit `cachedValue` aus dem `<w:t>` zwischen `separate`/`end`; **kein**
   zusätzlicher `text`-Knoten mit dem Cache-Wert (Regressionsbeweis gegen §0.4/F3).
2. Synthetisches `w:fldSimple`-PAGE → genau ein `page_number_field` (F2), kein separater
   Text „1".
3. fldChar-Quadruple **ohne** `separate`/Cache → Feld erkannt, `cachedValue` = `'1'`.
4. `NUMPAGES`-Quadruple → **kein** `page_number_field`; Cache-Text bleibt statischer Text
   (Grenzfall 11).
5. Schreiben eines `page_number_field` mit `strong`+`textColor` → Ausgabe enthält das
   Quadruple, jeder der fünf `<w:r>` trägt `<w:rPr>` mit `<w:b/>` und `<w:color .../>`.
6. Rundreise (write→read) für Fall 5 → Marks erhalten, Feld bleibt Feld (Grenzfall 14).
7. **F4:** synthetisches `sectPr` mit `footerReference w:type="even"` **vor**
   `w:type="default"` (Reihenfolge wie real in `bug57031.docx`) → Reader liest den
   **default**-Footer. Muss **vor** dem F4-Fix rot sein.

**Reale Fixtures (Pflicht, ergänzend):**
- `docx/FancyFoot.docx` — fldSimple-PAGE mit Schalter, sauberer Einzel-`default`-Footer →
  primärer Beweis F2 (frei von F4-Interferenz).
- `docx/60316.docx` — sauberes fldChar-PAGE **ohne** Schalter → Beweis F3.
- `docx/bug57031.docx` — fldChar-PAGE mit Schalter **und** even-vor-default → Beweis F3
  **und** F4 gemeinsam (das real sichtbare „Page 2 of 14" in `footer2.xml`).
- `docx/60329.docx` — PAGE **und** NUMPAGES in einer Fußzeile → Beweis Grenzfall 11.
- **Bewusst NICHT als PAGE-Feld-Positivbeweis:** `Bug60341.docx` (enthält zusätzlich den
  Block-`w:sdt`-Bug F11, out-of-scope — würde F3 fälschlich als „kaputt" erscheinen
  lassen); dient stattdessen als F11-Dokumentationsbeleg.

### 6.2 Neu: `src/formats/odt/__tests__/page-number-field.test.ts`

Muster wie `odt/__tests__/roundtrip.test.ts` (`buildOdt`-Helfer):
1. `<text:page-number text:select-page="current">1</text:page-number>` → ein
   `page_number_field`.
2. **Selbstschließendes** `<text:page-number .../>` (Muster `fields.odt`) → Feld erkannt,
   `cachedValue` = `'1'`.
3. `<text:page-count>1</text:page-count>` → **kein** `page_number_field`; „1" als Text
   erhalten (Grenzfall 11/F6).
4. `<text:page-number>` **und** `<text:page-count>` nebeneinander → unterschiedlich
   behandelt (Muster `odf-fields.odt`).
5. Schreiben/Rundreise mit `textColor`+`underline` → `<text:span>`-Wrapping erhalten, Feld
   bleibt Feld.

**Reale Fixtures (Pflicht):** `odt/odf-fields.odt` (page-number **und** page-count im Body
— heute ohne Kopf-/Fußzeilen-UI vorführbar, primärer Beweis F5/F6); `odt/fields.odt`
(Kopf, selbstschließendes page-number in `<text:span>` → Cache-loser Fall **und**
Marks-Erhalt auf `readOdt`-Ebene).

### 6.3 Anpassung bestehender Reader-Tests (F10 — Pflicht, §0.7/§6 Punkt 4)

> **Mechanischer Zwang, nicht nur Verschärfung:** Der Test-Helper `allText`
> (`docx/__tests__/reader.test.ts:37–44`, wortgleich in `odt/…`) sammelt **ausschließlich**
> JSON-Werte unter dem Schlüssel `text`. Nach dem Fix trägt die „1" den Schlüssel
> `attrs.cachedValue`, **nicht** `text` — die bestehende Assertion `expect(text).toContain('1')`
> im **isolierten** fldSimple-Test (`:81`) wird also **rot** (`allText` liefert `''`). Die
> alte Zeile ist daher zu **ersetzen**, nicht bloß zu ergänzen; ein naives „zusätzliche
> Assertion anhängen" hinterlässt einen roten Test.

- `docx/__tests__/reader.test.ts:81` (`<w:fldSimple w:instr=" PAGE ">`): Assertion von
  „Text enthält 1" **ersetzen** durch „genau ein `page_number_field`-Node mit
  `cachedValue === '1'`, und **kein** eigenständiger Text-Node „1"" (Zugriff direkt auf die
  geparste JSON-Struktur `doc.body.content`, nicht über `allText`). Nach dem Fix wird aus
  diesem PAGE-fldSimple ein Feld — der bisherige reine „Ziffer sichtbar"-Test wäre sonst
  kein Nachweis der Feldsemantik.
- `odt/__tests__/reader.test.ts:53` (`Seite <page-number>1</page-number> von
  <page-count>5</page-count>`): erweitern auf „ein `page_number_field` (`cachedValue`
  „1"); „Seite"/„von"/„5" bleiben Text; die „1" ist **nicht** eigenständiger Text-Node".
- `odt/__tests__/reader.test.ts:63` (kombinierter Feldtest, `<page-number>3`): erweitern
  auf „`page_number_field` mit `cachedValue` „3"".

Diese drei müssen nach dem Fix **grün** bleiben und tatsächlich den Feld-Node prüfen.

### 6.4 Neu: `src/formats/shared/editor/__tests__/page-number-field.test.ts`

Schema-/Command-Ebene (`EditorState.create` + direkter Command-Aufruf, Muster wie
`editor/__tests__/commands.test.ts`):
1. `insertPageNumberField()` an leerer Cursor-Position → genau ein `page_number_field`,
   Cursor direkt danach (§3.2).
2. Über eine Textselektion → Selektion **ersetzt**, nicht ergänzt (§3.3).
3. Mit aktiven `storedMarks` an der Cursor-Position → Node trägt dieselben Marks (§3.10).
4. `wordSchema.nodeFromJSON` mit einem `page_number_field`, der (illegal) `content` trägt
   → `.check()` wirft (bestätigt echte Atomarität, nicht nur Konvention).
5. Klartext-Extraktion: `clipboardTextSerializer` über einen Slice „A"+Feld+„B" liefert
   „A1B" (nicht „AB") — beweist, dass `leafText` greift (§0.1/§3.12).
6. `history()`: einfügen → `undo` → Ausgangsdokument identisch → `redo` → Feld wieder da
   (Grenzfall 13).
7. Enter direkt vor/nach dem Feld → Feld bleibt vollständig, kein Duplikat/Verschwinden
   (Grenzfall 15).

### 6.5 Neu: `tests/e2e/page-number-field.spec.ts` (Body-Ebene, Blocker markiert)

Konventionen wie `tests/e2e/docx.spec.ts`/`odt.spec.ts` (`page.waitForEvent('download')`
+ `JSZip`-Prüfung des Exports). Da **kein** Kopf-/Fußzeilen-Editierbereich existiert
(Abschnitt 0), testet dieser Spec **auf Body-Ebene** (Kernentscheidung 3.6) — der heute
einzig mögliche echte E2E-Nachweis; die Kopf-/Fußzeilen-Variante (§6 Punkt 3/6) ist im
Testfile **explizit als offen kommentiert**, nicht stillschweigend ausgelassen:
1. Neues Dokument, `getByRole('button', { name: 'Seitenzahl einfügen' })` klicken →
   sichtbares, schattiertes `.pm-field-page-number` im DOM.
2. Direkt danach weitertippen (Selection-Sync, Grenzfall 5, `FEATURE-SPEC` §2) → Text
   vor/nach dem Feld korrekt, keine Selektionsbeschädigung.
3. Cursor unmittelbar davor/danach, Backspace bzw. Entf → Feld verschwindet als Ganzes,
   kein Rest-Text (Grenzfall 6).
4. DOCX-Export (echter Download) → enthält `<w:fldChar w:fldCharType="begin"/>` und
   `<w:instrText>` mit „PAGE" (unabhängige `JSZip`-Prüfung).
5. Reimport → Feld weiterhin vorhanden (Feature-Rundreise, §5.2 Punkt 1, Body-Ebene).
6. Dasselbe als ODT (Export → `<text:page-number>` im `content.xml`; Reimport → Feld).
7. Cross-Format DOCX→ODT→DOCX (und Kommentar für die umgekehrte Richtung) → bleibt Feld
   (Grenzfall 12).
8. Undo (Strg+Z) direkt nach Einfügen → Feld weg, umgebender Text unverändert (Grenzfall 13).

### 6.6 Baseline-Regression (§5.1)

- `docx/__tests__/roundtrip.test.ts` **und** `odt/__tests__/roundtrip.test.ts`: je ein Test
  „Datei ohne jedes Seitenzahl-Feld erhält nach Rundreise **keinen** `page_number_field`"
  (§5.1 Punkt 1/4 — kein Feld darf erfunden werden).
- „Text bleibt sichtbar" für out-of-scope-Felder (NUMPAGES/page-count) bleibt grün — durch
  6.1 Fall 4 und 6.2 Fall 3 abgedeckt (§5.1 Punkt 2).
- `external-fixtures.test.ts` (DOCX/ODT) bleiben **unverändert** (generische „importiert
  ohne Absturz"-Suite); die strukturellen Feld-Prüfungen liegen bewusst in den dedizierten
  neuen Dateien (6.1/6.2).

---

## 7. Bewusst nicht umgesetzt (Non-Goals)

- **Bedienbarer Kopf-/Fußzeilenbereich** (F13) — Tickets `kopfzeile-`/`fusszeile-bearbeiten`.
  Dieser Plan liefert den in §3.1 verlangten „minimalen Vertrag" (ein überall in
  `inline*`-Content einfügbarer Node) vollständig vor; danach ist **keine** Schema-/
  Reader-/Writer-Änderung mehr nötig, nur die in 4.4 markierte Toolbar-Kontext-Prüfung.
- **Block-`w:sdt` in Kopf-/Fußzeile** (F11, `Bug60341.docx`) — generischer
  Content-Control-Bug, nicht seitenzahlspezifisch. Empfehlung: eigener Backlog-Eintrag,
  ideal aufgegriffen von `kopfzeile-`/`fusszeile-bearbeiten-code.md`. (Run-`w:sdt` ist
  bereits abgedeckt, `collectRuns:209–211`.)
- **Kopf-/Fußzeilen-Bild-Rels** (F12, `Bug51170.docx`) — betrifft nur Bilder, gleiche
  Empfehlung wie F11.
- **`NUMPAGES`/„Seite X von Y"** (§8) — bewusst kein generischer Feld-Node (3.1);
  NUMPAGES-/page-count-Werte bleiben statischer Text (unverändertes Verhalten).
- **Seitenzahlformat/Startwert** (§8, Slug `seitenzahl-format`, Prio 3) — kein
  `\* ROMAN`/`\* Arabic`/Startwert-Attribut.
- **„Erste Seite anders"/„Gerade-ungerade anders"** (§8) — nicht berührt. (F4 macht den
  Reader nur robust gegen deren *Vorhandensein*, implementiert die Funktion aber nicht.)
- **Kontextmenü-Eintrag** (§1 Zeile 6, Nice-to-have) — kein Editor-Kontextmenü im Projekt
  (`WordEditor.tsx` bewusst ohne, Z. 117–121).
- **Auto-Aktivierung einer Standard-Fußzeile** (§1 Zeile 2, Nice-to-have) — setzt
  `fusszeile-bearbeiten` voraus.
- **Live-Editor: hochzählende Werte über simulierte Seiten** (§3.9) — separat
  dokumentierter Non-Blocker; hängt an der künftigen Kopf-/Fußzeilen-Darstellung.

---

## 8. Freigabestatus nach Umsetzung (gegen Anforderung §7)

| Freigabekriterium (§7) | Status nach diesem Plan |
|---|---|
| Bedienbarer Kopf-/Fußzeilenbereich existiert | **Nicht erfüllt** — out-of-scope (0/7). Blockiert die Gesamtabnahme unabhängig vom Rest. |
| Alle Bedienelemente aus §1 funktionieren | **Teilweise** — SVG-Button, Schattierung, atomares Löschen, Formatierbarkeit funktionieren (Body-Ebene, 3.6); die Kontextabhängigkeit „nur in Kopf-/Fußzeile" folgt erst nach obigem Punkt. |
| Alle Tests aus §6 automatisiert grün | **Teilweise** — Unit-/Reader-/Writer-Tests (6.1–6.4, 6.6) vollständig; E2E (6.5) nur auf Body-Ebene, Kopf-/Fußzeilen-Variante blockiert. |
| Grenzfälle §4 einzeln befundet | **Erfüllt** — Abschnitt 5, alle 16. |
| Baseline-Rundreise (§5.1) nicht gebrochen | **Erfüllt** — inkl. neuer Regressionstests (6.6) und der mitbehobenen F2/F3/F4. |
| Feature-Rundreise (§5.2) DOCX/ODT/Cross-Format | **Teilweise** — Body-Ebene vollständig (6.5); Kopf-/Fußzeilen-Variante blockiert. |
| Selection-Sync-Regressionstest mit Feld-Sequenz | **Teilweise** — Body-Ebene (6.5 Punkt 2); Kopf-/Fußzeilen-Variante blockiert. |

**Gesamtstatus: „teilweise"** — exakt wie in Anforderung §7 für diesen Fall vorgesehen.
Einziger verbleibender Blocker für „vorhanden" ist die out-of-scope-Fertigstellung von
`kopfzeile-`/`fusszeile-bearbeiten`. Alles im Geltungsbereich dieses Plans (Datenmodell
inkl. `leafText`, Reader, Writer, Command, Toolbar, Schattierung, Tests) ist danach
vollständig und ohne bekannte offene Fehler.

---

## 9. Phasenplan

1. **Phase A — Schema/Command/Toolbar/CSS (formatunabhängig):** 4.1, 4.3, 4.4, 4.5 + Tests
   6.4 (isoliert ohne DOCX/ODT lauffähig). Der Schema-Node muss zuerst existieren, sonst
   scheitert `assertLoadableDocument` an den Readern (4.1-Hinweis).
2. **Phase B — DOCX-Reader/-Writer:** 4.6 (F2/F3/F4), 4.7 (F7) + Tests 6.1 und
   Anpassung 6.3 (DOCX). Die Regressionstests (6.1 Fälle 1/2/7) müssen **vor** dem Fix
   nachweislich rot sein.
3. **Phase C — ODT-Reader/-Writer:** 4.9 (F5/F6), 4.10 (F7) + Tests 6.2 und Anpassung 6.3
   (ODT), analog Phase B.
4. **Phase D — Baseline + E2E:** 6.6, 6.5 (abhängig von A–C).
5. **Phase E — Dokumentation:** Backlog-Status „teilweise" gemäß Abschnitt 8; separate
   Backlog-Einträge für F11/F12 vorschlagen; Übergabe-Notiz an `kopfzeile-`/
   `fusszeile-bearbeiten-code.md` (sobald vorhanden) zur Toolbar-Kontext-Prüfung (4.4) und
   zu F11/F12.

Nach jeder abgeschlossenen Phase committen/pushen und CI-Status selbst prüfen.

---

## 10. Offene Entscheidungen vor Umsetzungsbeginn

1. **F4** (`headerReference`/`footerReference`-Typwahl) **innerhalb** dieses Plans beheben,
   obwohl kein genuiner Seitenzahl-Bug? Begründung 1a: ohne ihn testen die von der
   Anforderung selbst verlangten Rundreise-Fixtures (`bug57031.docx` u. Ä.) am falschen
   Footer vorbei. Alternative: F4 als eigener, vorgelagerter Mini-PR, dieser Plan setzt ihn
   dann nur voraus.
2. **Kernentscheidung 3.2** (`w:fldChar`-Quadruple als Exportform) bestätigen — beide Formen
   sind laut §3.5 zulässig, die Wahl ist nicht revidierbar-neutral (unterschiedliche
   Test-Erwartungen an das erzeugte XML).
3. **Kernentscheidung 3.6** (Button ohne Kopf-/Fußzeilen-Kontext bewusst auf `body` wirken
   lassen statt zu deaktivieren) bestätigen — beide Varianten sind laut Grenzfall 1 zulässig.
4. **F11/F12** als **separate** Backlog-Einträge statt Teil dieses Plans einordnen —
   Bestätigung, dass das (wie in Abschnitt 7 dokumentiert) eine bewusste Abgrenzung ist,
   kein stilles Verschweigen: beide sind generisch und nicht seitenzahlspezifisch.
