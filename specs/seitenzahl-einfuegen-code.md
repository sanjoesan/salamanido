# Umsetzungsplan: Feature „Seitenzahl einfügen"

Gegenstück zu `specs/seitenzahl-einfuegen-req.md` (Anforderung). Dieses Dokument ist
der **dateigenaue Entwicklungsplan**: was am bestehenden Code nachweislich falsch/
unvollständig ist (durch eigene Codesichtung **und** eigene Ausführung des Readers
gegen reale Fixture-Dateien verifiziert, nicht nur aus der Anforderung übernommen),
welche Dateien sich ändern bzw. neu entstehen, und in welcher Reihenfolge. Alle
Datei:Zeile-Angaben wurden gegen den tatsächlichen Quellcode geprüft (Stand dieses
Plans, 2026-07-04); abweichende/ergänzende Befunde gegenüber der Anforderung sind
unten explizit als solche markiert.

---

## 0. Geltungsbereich, Abgrenzung, Kernaussage vorab

`seitenzahl-einfuegen-req.md` legt selbst offen, dass diese Funktion eine **harte,
nicht selbst zu bauende Abhängigkeit** hat: einen bedienbaren Kopf-/Fußzeilenbereich
(`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`, beide Priorität 1, beide selbst noch
nicht umgesetzt — verifiziert: `specs/kopfzeile-bearbeiten-code.md` und
`specs/fusszeile-bearbeiten-code.md` existieren nicht, siehe `specs/`-Verzeichnis).
Dieser Plan **baut diesen Bereich nicht** (Non-Goal, siehe Abschnitt 7) und kann
daher — wie die Anforderung selbst in Abschnitt 7 verlangt — den Backlog-Status nach
Umsetzung dieses Plans nicht auf „vorhanden", sondern nur auf **„teilweise"** heben.
Das ist keine Unterlassung dieses Plans, sondern folgt zwingend aus der in der
Anforderung selbst benannten Abhängigkeit.

**Was dieser Plan trotzdem vollständig liefert** (und was laut Anforderung
Abschnitt 6, Punkt 6 bereits *ohne* Kopf-/Fußzeilen-UI sinnvoll test- und
freigabefähig ist): das komplette Datenmodell, den kompletten DOCX/ODT-Lese- **und**
-Schreibpfad inklusive der Behebung zweier im Anforderungsdokument bereits
nachgewiesener, und **drei weiterer, durch diesen Plan selbst neu nachgewiesener**
Bestandsfehler (siehe 1a), sowie Command/Toolbar/Schema-Infrastruktur, die exakt an
der Stelle andockt, an der `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` ihren
Editierbereich bereitstellen werden.

---

## 1. Bestätigter Ist-Stand (Anforderung Abschnitt 0, Punkt für Punkt geprüft)

| # | Befund der Anforderung | Ergebnis der eigenen Prüfung |
|---|---|---|
| 1 | Kein Feld-Node/Mark im Schema | **Bestätigt.** `src/formats/shared/schema.ts:6-107` (`nodes`-Objekt) enthält ausschließlich `doc`, `paragraph`, `heading`, `text`, `hard_break`, `image`, `bullet_list`, `ordered_list`, `list_item`, plus `tableNodes(...)` (Zeile 106). Kein Node-Typ mit `atom`/Feld-Semantik. |
| 2 | Keine Kopf-/Fußzeilen-Bearbeitung in der UI | **Bestätigt.** `grep -rniE "header|footer" src/app/*.tsx` liefert **keinen** Treffer. `src/formats/shared/editor/WordEditor.tsx` instanziiert genau **eine** `EditorView` (Zeilen 89-99), gebunden ausschließlich an `bodyNode = wordSchema.nodeFromJSON(doc.content.body)` (Zeile 65). `header`/`footer` (`documentModel.ts:5-6`) werden nirgends in einer zweiten Editor-Instanz oder einem zweiten Teilbaum sichtbar gemacht. |
| 3 | Kein Toolbar-Button, kein Command | **Bestätigt.** `Toolbar.tsx` (vollständig gelesen, 247 Zeilen) hat keinen Eintrag „Seitenzahl"/„Kopfzeile"/„Fußzeile". `commands.ts` (108 Zeilen, vollständig gelesen) hat keinen `insertPageNumber`-artigen Befehl. |
| 4 | DOCX-Feld-Parsing fehlt, zwei konkrete Fehlerarten | **Bestätigt, und empirisch mit echten Fixtures reproduziert** (siehe 1a.1/1a.2 unten — der Fehler ist real und tritt an bereits im Repo vorhandenen Dateien auf, nicht nur an synthetischem Testmaterial). `decodeParagraphRuns` (`docx/reader.ts:124-143`) iteriert ausschließlich `childElements(pEl, w, 'r')` (Zeile 126) — `<w:fldSimple>` ist kein `<w:r>` und wird als direktes Kind von `<w:p>` nie besucht; innerhalb eines besuchten `<w:r>` werden nur `w:t`/`w:br`/`w:drawing` behandelt (Zeilen 130-138), `w:fldChar`/`w:instrText` werden still übersprungen, aber der `<w:r><w:t>` zwischen `separate` und `end` matcht Zeile 130 und wird als normaler Text gelesen. |
| 5 | ODT-Feld-Parsing fehlt | **Bestätigt, ebenfalls empirisch reproduziert** (siehe 1a.3). `walk()` (`odt/reader.ts:96-116`) behandelt nur `text:span`, `text:line-break`, `text:s`, `text:tab` (Zeilen 104-115) — kein `else`-Fallback, `<text:page-number>`/`<text:page-count>` fallen durch alle Bedingungen und werden komplett ignoriert, ihr Textinhalt geht ersatzlos verloren. |
| 6 | Keine Schreibunterstützung | **Bestätigt.** `inlineToRuns` (`docx/writer.ts:39-65`) kennt nur `text`/`hard_break`. `blockToOdt`/`inlineToOdt` (`odt/writer.ts:46-59`, `61-123`) kennen nur `hard_break`/`text` (inline) bzw. `paragraph`/`heading`/`bullet_list`/`ordered_list`/`table`/`image` (Block). |
| 7 | Kein Test | **Bestätigt.** Kein Treffer für „fldsimple"/„fldchar"/„instrtext"/„page-number"/„page-count"/„pagenumber" (Groß-/Kleinschreibung ignoriert) in `src/` oder `tests/` (per Grep verifiziert). |

### 1a. Zusätzliche, durch diese Sichtung neu gefundene Befunde (nicht in der Anforderung benannt)

Die Anforderung behauptet in Abschnitt 6, Punkt 5: „Reale Test-Fixtures … sind in
`tests/fixtures/external/docx` bzw. `tests/fixtures/external/odt` aufzunehmen —
laut aktueller Repo-Durchsicht dort nicht vorhanden." **Das ist nachweislich
falsch** — es wurden bereits vorhandene, unbenutzte reale Word-/LibreOffice-Fixtures
mit echten PAGE-Feldern gefunden und gegen den aktuellen Reader ausgeführt
(temporäre Explorations-Tests, danach wieder entfernt; Ergebnisse unten
protokolliert). Das ändert nichts an der Kernaussage „Feature fehlt", liefert aber
sofort einsatzbereites Testmaterial **und** deckt drei weitere, eigenständige
Bugs auf.

1. **DOCX `w:fldSimple`-Totalverlust, empirisch an `tests/fixtures/external/docx/FancyFoot.docx` reproduziert.**
   `word/footer1.xml` enthält
   `<w:t xml:space="preserve">Page </w:t><w:fldSimple w:instr=" PAGE   \* MERGEFORMAT "><w:r>…<w:t>2</w:t></w:r></w:fldSimple>`.
   Import mit dem aktuellen Reader liefert
   `footer: {"content":[{"type":"paragraph","content":[{"type":"text","text":"This is a fancy alphabet footer, with page number and everything"},{"type":"text","text":"Page "}]}, …]}`
   — das Feld samt Cache-Wert „2" ist vollständig weg, exakt wie in Anforderung §0
   Punkt 4 beschrieben, hier aber mit einer **bereits im Repo liegenden** Datei
   nachgewiesen statt nur theoretisch. `FancyFoot.docx` hat nur einen einzigen
   `<w:footerReference w:type="default">` (sauberer Fall, siehe Punkt 2 unten) und
   ist damit die **empfohlene primäre Regressions-Fixture** für den
   `w:fldSimple`-Fix.

2. **Neu entdeckter, von der Anforderung nicht erwähnter Bug: `headerReference`/`footerReference` wird ohne Rücksicht auf `w:type` gelesen — das erste strukturell vorkommende Element gewinnt, unabhängig davon, ob es `default`, `even` oder `first` ist.**
   `readDocx` (`docx/reader.ts:352-353`):
   ```ts
   const headerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')
   const footerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'footerReference')
   ```
   `firstChildNS`/`childElements` (Zeilen 15-21) filtern nur nach Namensraum/
   Elementname, **nicht** nach dem `w:type`-Attribut. Empirisch reproduziert an
   `tests/fixtures/external/docx/bug57031.docx`: `sectPr` enthält
   `<w:footerReference w:type="even" r:id="rId9"/><w:footerReference w:type="default" r:id="rId10"/>`
   (even **vor** default in Dokumentreihenfolge) — `rId9` → `footer1.xml` (leer),
   `rId10` → `footer2.xml` (enthält das eigentliche `Page … of 14`-Feld). Der
   aktuelle Reader liest **footer1.xml** (weil strukturell zuerst), der Import
   liefert einen leeren Footer, obwohl das reale Dokument in Word/LibreOffice
   sichtbar „Page 2 of 14" anzeigt. Dieselbe Struktur (even **vor** default) hat
   auch `PageSpecificHeadFoot.docx`. **Das betrifft nicht nur Seitenzahl-Felder,
   sondern jeden Kopf-/Fußzeileninhalt** in reale Dokumenten mit
   unterschiedlichen erste-Seite/gerade-ungerade-Kopf-/Fußzeilen — was laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 ohnehin ein häufiges reales Muster ist.
   **Einstufung: Muss in diesem Plan mitbehoben werden** (siehe Fix F2 in
   Abschnitt 2) — nicht weil es genuin ein Seitenzahl-Bug ist, sondern weil sonst
   die von der Anforderung selbst verlangten Baseline-Rundreise-Tests (§5.1) mit
   genau den beiden oben genannten, realistischen Mehr-Typ-Dateien am **falschen**
   Kopf-/Fußzeilenteil vorbeitesten würden und die eigentliche Reparatur des
   Feld-Parsings (Fix F1) fälschlich als „bestätigt" durchgewinkt werden könnte,
   obwohl sie am echten Footer nie ausgeführt wurde.
3. **Neu entdeckter, von der Anforderung nicht erwähnter, aber verwandter Bug (bewusst NICHT Teil dieses Plans, siehe Abschnitt 7): `<w:p>`-Elemente, die in `<w:sdt><w:sdtContent>` (Inhaltssteuerelement) eingebettet sind, werden beim Lesen von Kopf-/Fußzeile komplett übersprungen.**
   Empirisch an `tests/fixtures/external/docx/Bug60341.docx` reproduziert:
   `word/footer.xml` = `<w:ftr><w:sdt><w:sdtContent><w:sdt><w:sdtContent><w:p>…PAGE…NUMPAGES…</w:p></w:sdtContent></w:sdt></w:sdtContent></w:sdt></w:ftr>`.
   `readBodyChildren` (`docx/reader.ts:315-324`) iteriert nur
   `Array.from(bodyEl.children)` und behandelt ausschließlich direkte
   `w:p`/`w:tbl`-Kinder — das einzige direkte Kind von `<w:ftr>` ist hier
   `<w:sdt>`, der Import liefert `footer: {"content":[]}`, das komplette
   „Page X of Y"-Footer-Paragraph ist weg. **Dies ist ein eigenständiger,
   allgemeiner OOXML-Content-Control-Bug**, der jeden Absatzinhalt betrifft, der
   in ein Inhaltssteuerelement eingebettet ist — nicht spezifisch für
   Seitenzahl-Felder. Aus diesem Grund **wird `Bug60341.docx` nicht** als
   Pflicht-Fixture dieses Plans verwendet (siehe Abschnitt 6) — stattdessen
   `bug57031.docx`/`60329.docx`/`Bug54771a.docx` (kein `w:sdt`, siehe Abschnitt 6),
   und dieser Fund wird als separater, empfohlener Backlog-Eintrag
   („inhaltssteuerelemente-entpacken" o. Ä.) an dieser Stelle dokumentiert, statt
   stillschweigend unter den Tisch zu fallen.
4. **Neu entdeckter, von der Anforderung nicht erwähnter, aber verwandter Bug (bewusst NICHT Teil dieses Plans, siehe Abschnitt 7): Bilder in Kopf-/Fußzeile werden über die Beziehungstabelle des Hauptdokuments statt über die eigene `_rels/headerN.xml.rels`/`_rels/footerN.xml.rels`-Datei des jeweiligen Teils aufgelöst.**
   `readDocx` ruft für Kopf-/Fußzeile durchgehend `readBodyChildren(root, headingInfo, kindByNumId, documentRels, zip)` auf (Zeilen 363, 372) — `documentRels` ist die für `word/document.xml` gültige Relationship-Map, **nicht** die für `headerN.xml`/`footerN.xml` eigene. Empirisch reproduziert an
   `tests/fixtures/external/docx/Bug51170.docx`: `word/_rels/header1.xml.rels`
   definiert `rId1` → `media/image1.pdf`, aber `word/_rels/document.xml.rels`
   definiert `rId1` → `numbering.xml` — der Import liefert für das Kopfzeilenbild
   `src: "data:image/xml;base64,…"`, tatsächlich die Base64-codierten **Bytes von
   `numbering.xml`**, fälschlich als Bild interpretiert. **Betrifft nur Bilder in
   Kopf-/Fußzeile, keine Seitenzahl-Felder** — wird deshalb hier dokumentiert,
   aber **nicht** in diesem Plan behoben (siehe Abschnitt 7); empfohlen als
   eigener Fund für `kopfzeile-bearbeiten-code.md`/`fusszeile-bearbeiten-code.md`,
   da diese ohnehin die Kopf-/Fußzeilen-Lesepfade grundlegend anfassen werden.
5. **ODT-Totalverlust, empirisch an zwei bereits vorhandenen, echten LibreOffice-Fixtures reproduziert.**
   - `tests/fixtures/external/odt/odf-fields.odt`, `content.xml`: `…What pagenumber is it:<text:page-number text:select-page="current">1</text:page-number>?…What page count is it:<text:page-count>1</text:page-count>?…` — **im Dokumentkörper** (nicht Kopf-/Fußzeile), damit schon heute ohne jede Kopf-/Fußzeilen-UI vollständig test- und vorführbar. Aktueller Import liefert `"What pagenumber is it:"` und `"?"` als zwei benachbarte Textknoten **ohne** jeden Hinweis auf die dazwischenliegende „1" — exakt der in Anforderung §0 Punkt 5 beschriebene Totalverlust, hier aber mit echtem Testmaterial nachgewiesen. Diese Datei ist zugleich die ideale Fixture für Grenzfall 11 (page-number **und** page-count nebeneinander, dürfen nicht verwechselt werden).
   - `tests/fixtures/external/odt/fields.odt`, `styles.xml` (`style:header`): `<text:span …>Seite </text:span><text:span …><text:page-number text:select-page="current"/></text:span><text:span …> von </text:span><text:span …><text:page-count style:num-format="1">1</text:page-count></text:span>` — **wichtiger Zusatzbefund:** das `<text:page-number>`-Element ist hier **selbstschließend, ganz ohne Cache-Text** (im Gegensatz zu `odf-fields.odt`, wo es „1" enthält). Der Reparaturcode muss also **beide** Fälle behandeln: mit und ohne eingebettetem Cache-Wert. Aktueller Import liefert für den Header nur `"Seite "` und `" von "` als getrennte Absätze — Zahl und Gesamtzahl komplett verschwunden.

---

## 2. Priorisierte Fehler-/Lückenliste

„Muss" = blockierend für die in Abschnitt 8 dieses Plans bewertete Teilabnahme.
„Dokumentiert" = bewusst nicht behoben, siehe Abschnitt 7.

| # | Befund | Einstufung | Fix in Abschnitt |
|---|---|---|---|
| F1 | Kein Datenmodell/Node für ein Feld | **Muss** | 4.1 |
| F2 | `w:fldSimple`-Totalverlust (Anforderung §0.4, 1a.1) | **Muss** | 4.6 |
| F3 | `w:fldChar`-Quadruple wird zu hartkodiertem Text (Anforderung §0.4) | **Muss** | 4.6 |
| F4 | `headerReference`/`footerReference` ignoriert `w:type` (neu, 1a.2) | **Muss** | 4.6 |
| F5 | ODT `text:page-number` wird komplett übersprungen (Anforderung §0.5, 1a.5) | **Muss** | 4.9 |
| F6 | ODT `text:page-count` fälschlich als Seitenzahl interpretierbar, falls naiv gefixt (Grenzfall 11) | **Muss** | 4.9 |
| F7 | Kein Schreibpfad DOCX/ODT für das neue Feld | **Muss** | 4.7, 4.10 |
| F8 | Kein Toolbar-Button/Command | **Muss** | 4.3, 4.4 |
| F9 | Keine visuelle Feldschattierung | **Muss** | 4.1, 4.5 |
| F10 | Keine Tests | **Muss** | 6 |
| F11 | `<w:sdt>`-eingebettete Absätze in Kopf-/Fußzeile werden ignoriert (neu, 1a.3) | **Dokumentiert** (separates Ticket) | 7 |
| F12 | Kopf-/Fußzeilen-Bilder über falsche Rels-Datei aufgelöst (neu, 1a.4) | **Dokumentiert** (separates Ticket) | 7 |
| F13 | Kein bedienbarer Kopf-/Fußzeilenbereich (Abhängigkeit) | **Dokumentiert** (Non-Goal, fremdes Ticket) | 7 |

---

## 3. Kernentscheidungen

### 3.1 Schema: ein einziger, eng geschnittener Node — keine generische „Feld"-Abstraktion

Neuer Node `page_number_field` (Name direkt aus Anforderung §3.4 übernommen),
**inline, atom, selectable**, mit genau einem optionalen Attribut `cachedValue`.
Bewusst **kein** generischer `field`-Node mit einem `kind`/`fieldType`-Attribut,
der auch `NUMPAGES`/`text:page-count` abdecken könnte — das würde genau die in
Grenzfall 11 gewarnte Verwechslungsgefahr strukturell einladen (ein Node, der
„jedes Feld" sein kann, verleitet dazu, page-count versehentlich denselben Node
zuzuweisen). Ein eigener `page_count_field`-Node ist bewusst **nicht** Teil dieses
Plans (Non-Goal, siehe Abschnitt 7) und wird — falls `NUMPAGES`/„Seite X von Y"
später beauftragt wird — ein eigener, gleich benannter Node sein.

### 3.2 DOCX-Exportform: `w:fldChar`-Quadruple, nicht `w:fldSimple`

Begründung (Anforderung §3.5 verlangt eine begründete Wahl):
- Empirisch in diesem Repo: **8 von 10** gefundenen echten Word-Fixtures mit
  PAGE-Feld nutzen die `w:fldChar`-Quadruple-Form (`bug57031.docx`, `60316.docx`,
  `60329.docx`, `Bug51170.docx`, `Bug54771a.docx`, `MultipleBodyBug.docx`,
  `WordWithAttachments.docx`, `Bug60341.docx`), nur **2** nutzen `w:fldSimple`
  (`FancyFoot.docx`, `PageSpecificHeadFoot.docx`).
- `w:fldSimple` gilt in der OOXML-Praxis als die von Word selbst nur so lange
  beibehaltene Form, bis der Nutzer das Feld bearbeitet — danach wandelt Word es
  intern in die Quadruple-Form um. Direktes Erzeugen der Quadruple-Form vermeidet
  diese Word-seitige Umwandlung beim ersten Öffnen.
- **Import muss dennoch beide Formen erkennen** (Anforderung §3.6) — das ist
  unabhängig von der Exportwahl und wird in 4.6 für beide Formen umgesetzt.

### 3.3 ODT-Exportform: `<text:page-number text:select-page="current">N</text:page-number>`

Exakt das Element, das LibreOffice Writer selbst erzeugt (per Fixture
`odf-fields.odt`/`fields.odt` bestätigt, inklusive des Attributs
`text:select-page="current"`, das die real erzeugten Dateien tragen).

### 3.4 Cache-Wert-Strategie

`cachedValue` ist ein rein kosmetischer, niemals maßgeblicher Vorschauwert
(Anforderung §3.4/3.5/3.7). Konkrete Regel:
- **Neu eingefügtes Feld** (Toolbar-Klick): `cachedValue = '1'` (plausibler
  Platzhalter, Anforderung §3.9 — keine Pagination-Logik nötig/gefordert).
- **Import**: der im XML tatsächlich eingebettete Wert wird übernommen, falls
  vorhanden; falls das Element leer/selbstschließend ist (siehe `fields.odt`,
  1a.5) oder der `w:fldChar`-Quadruple kein `separate`/`<w:t>` enthält (siehe
  `Bug51170.docx`, `word/footer1.xml`), fällt der Reader ebenfalls auf `'1'`
  zurück — niemals leerer String, niemals Absturz.
- **Export**: `cachedValue` wird 1:1 in den Cache-Slot des erzeugten XML
  geschrieben (`<w:t>`-Run bzw. Text-Inhalt von `<text:page-number>`) — kein
  Neuberechnen, keine Pagination-Kopplung (Anforderung §3.5/3.7 verlangt
  ausdrücklich nur einen Fallback-Anzeigewert, keine echte Berechnung).

### 3.5 Toolbar-Gating ohne existierenden Kopf-/Fußzeilenbereich

Anforderung §1 Zeile 1 verlangt einen Button, „sinnvollerweise… nur
sichtbar/aktiv…, wenn der Fokus in Kopf- oder Fußzeile liegt", räumt aber in
Grenzfall 1 ausdrücklich eine zweite, gültige Option ein: bewusst auch im
Fließtext erlauben (wie Word selbst über „Einfügen → Feld → PAGE"). Da
`WordEditor.tsx` aktuell **nur eine** Editor-Instanz kennt (gebunden an `body`,
siehe 1, Punkt 2), gibt es **keinen** Kontext, den der Button unterscheiden
könnte. Entscheidung dieses Plans: **Grenzfall-1-Variante „bewusst erlaubt"** —
der Button ist immer aktiv und wirkt auf den jeweils fokussierten (aktuell
einzigen) Editierbereich. Das ist explizit dokumentiertes, konsistentes
Verhalten (keine zufällige Lücke) und erfüllt Anforderung §3.15 („niemals ein
Klick, der ergebnislos bleibt") bereits vollständig, weil es **nie** ins Leere
läuft. Sobald `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen zweiten,
fokussierbaren Bereich schaffen, muss hier eine echte Kontext-Prüfung
nachgerüstet werden (Markierung im Code, siehe 4.4).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts`

Neuer Node, eingefügt nach `hard_break` (Zeilen 35-43), vor `image` (Zeile 45):

```ts
  /**
   * Ein automatisch fortlaufendes Seitenzahl-Feld (Word PAGE-Feld bzw. ODF
   * <text:page-number>). Inline statt Block (im Gegensatz zu `image`), damit es
   * mitten im Text stehen kann ("Seite " + Feld + "."). `atom`+`selectable` ohne
   * eigenes `content` macht den Node zu einem echten Leaf-Atom — Löschen/Kopieren/
   * Cursor-Navigation funktioniert dadurch automatisch als atomare Einheit, exakt
   * wie beim bestehenden `image`-Node (siehe Anforderung §3.11/3.12). `marks: '_'`
   * erlaubt explizit Fett/Kursiv/Farbe usw. auf dem Feld selbst (Anforderung
   * §3.4/3.10) — anders als bei `hard_break`, wo Marks nie sichtbar zur Anwendung
   * kommen, ist das hier ein bewusst genutztes Feature, deshalb hier ausdrücklich
   * (statt nur implizit über den Schema-Default) gesetzt.
   */
  page_number_field: {
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    marks: '_',
    attrs: { cachedValue: { default: '1', validate: 'string' } },
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

Kein neues Mark. Keine Änderung an `tableNodes(...)` (Zeile 106) oder den
bestehenden Marks (Zeilen 109-148) — das Feld nutzt ausschließlich die bereits
vorhandenen Marks (`strong`/`em`/`underline`/`strike`/`textColor`/`highlight`)
über `marks: '_'`.

**Warum `parseDOM`/`toDOM` ausreichen und keine eigene NodeView nötig ist:** genau
wie beim bestehenden `image`-Node (`schema.ts:45-72`, ebenfalls ohne eigene
NodeView) genügt eine reine `toDOM`-Definition; ProseMirror nutzt dieselbe
`toDOM`/`parseDOM`-Definition automatisch auch für die Zwischenablage-
Serialisierung/-Deserialisierung — Kopieren/Einfügen des Feldes (Grenzfall 7,
Anforderung §3.12) inklusive angewandter Marks funktioniert dadurch ohne
zusätzlichen Code, weil Marks beim Rendern automatisch als umschließende
DOM-Elemente um den `toDOM`-Output gelegt werden (Standardverhalten, bereits
heute so für normalen Text genutzt).

### 4.2 `src/formats/shared/documentModel.ts` — keine Änderung

`WordDocumentContent.header`/`.footer` sind bereits `ProseMirrorJSON | null`
(Zeilen 5-6) — generisch genug, um Absätze mit dem neuen Node zu enthalten,
sobald `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sie befüllen. Kein
Typ-Update nötig.

### 4.3 `src/formats/shared/editor/commands.ts`

Neue Funktion, eingefügt nach `insertImage` (Zeilen 66-74), vor `insertTable`
(Zeile 76):

```ts
export function insertPageNumberField(): Command {
  return (state, dispatch) => {
    const nodeType = wordSchema.nodes.page_number_field
    const node = nodeType.create({ cachedValue: '1' })
    if (dispatch) {
      // inheritMarks (Default `true`) übernimmt automatisch Marks, die an der
      // aktuellen Cursor-Position aktiv sind (state.storedMarks / $from.marks()) —
      // erfüllt Anforderung §3.10 ("Formatieren an der Cursor-Position unmittelbar
      // davor, gefolgt vom Einfügen") ohne zusätzlichen Code.
      dispatch(state.tr.replaceSelectionWith(node))
    }
    return true
  }
}
```

Kein neuer Keymap-Eintrag in `WordEditor.tsx` nötig (kein Standard-Shortcut in
Word/LibreOffice, der zwingend nachgebildet werden müsste — Anforderung nennt
nur den Toolbar-Klick als Pflichtweg, siehe Anforderung §1 Zeile 1).

Kein zusätzlicher `isInHeaderFooterContext`-Helfer in dieser Datei (siehe
Kernentscheidung 3.5 — es gibt aktuell nichts zu unterscheiden).

### 4.4 `src/formats/shared/editor/Toolbar.tsx`

Neuer Button nach dem bestehenden Bild-Upload-Label (Zeilen 241-244), vor dem
schließenden `</div>` (Zeile 245):

```tsx
      <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

      {/*
        TODO(kopfzeile-bearbeiten / fusszeile-bearbeiten, siehe
        specs/kopfzeile-bearbeiten-req.md §3.1 und
        specs/seitenzahl-einfuegen-req.md §3.1 + Grenzfall 1/2): Es gibt aktuell nur
        eine, an `body` gebundene Editor-Instanz (WordEditor.tsx) — kein
        fokussierbarer Kopf-/Fußzeilenbereich. Bis dieser existiert, wirkt der
        Button bewusst auf den jeweils fokussierten (aktuell einzigen)
        Editierbereich (Grenzfall 1, Variante "bewusst erlaubt", siehe
        seitenzahl-einfuegen-code.md Abschnitt 3.5). Sobald ein Kopf-/
        Fußzeilenbereich existiert, hier eine echte Kontext-Prüfung ergänzen, die
        den Button deaktiviert/versteckt, wenn der Fokus nicht dort liegt
        (Anforderung §3.15).
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
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="3" y="1.5" width="14" height="17" rx="1.5" />
          <line x1="6" y1="6" x2="14" y2="6" />
          <line x1="6" y1="9.5" x2="14" y2="9.5" />
          <line x1="6" y1="13" x2="11" y2="13" />
          <circle cx="14.5" cy="15.3" r="2.7" fill="currentColor" stroke="none" />
          <text x="14.5" y="16.4" fontSize="3.6" fill="white" stroke="none" textAnchor="middle" fontFamily="sans-serif">1</text>
        </svg>
      </button>
```

Import-Zeile (Zeilen 5-17) um `insertPageNumberField` ergänzen. Kein
`aria-pressed` (Einfüge-Aktion, kein Umschalter — konsistent mit dem
Tabellen-/Bild-Button, die ebenfalls keinen aktiven Zustand haben). Bewusst
**ein eingebettetes SVG**, kein Unicode-/Emoji-Zeichen (Anforderung §1 Zeile 1
verlangt das explizit) — anders als der bestehende, mit Emoji arbeitende
„🖼 Bild"-Button (Zeile 242) und „🖍"-Hervorhebungslabel (Zeile 163), die beide
unverändert bleiben (außerhalb des Geltungsbereichs dieses Plans).

### 4.5 `src/index.css`

Neuer Block, eingefügt nach der `.ProseMirror img`-Regel (Zeilen 39-42):

```css
/*
 * Feldschattierung, analog zur in Word per Strg+F9 sichtbaren Markierung
 * (Anforderung §1 Zeile 4). Die editierbare "Seite" ist immer weiß hinterlegt
 * (siehe pageBackgroundStyle() in pageLayout.ts — ein bewusst App-Theme-
 * unabhängiges "Papier"-Layout), daher genügt ein einziger, nicht Dark-Mode-
 * abhängiger Grauton; er muss nur gegen weißen Seitenhintergrund lesbar sein,
 * nicht gegen die App-Chrome.
 */
.ProseMirror .pm-field {
  background: rgba(100, 116, 139, 0.22);
  border-radius: 2px;
  padding: 0 1px;
}
```

### 4.6 `src/formats/docx/reader.ts`

**F4 (Reihenfolge-unabhängiger Header-/Footer-Typ):** neue Hilfsfunktion,
eingefügt nach `firstChildNS` (Zeilen 19-21):

```ts
/**
 * `childElements(...)[0]` (wie in `firstChildNS`) liefert das erste Element in
 * Dokumentreihenfolge — bei mehreren `headerReference`/`footerReference`-
 * Einträgen (erste-Seite/gerade-ungerade-Varianten, in echten Word-Dokumenten
 * üblich, siehe z. B. tests/fixtures/external/docx/bug57031.docx) ist das nicht
 * notwendig der "default"-Eintrag. Bevorzugt gezielt `w:type="default"`, fällt
 * auf das erste vorhandene Element zurück, falls kein expliziter Default-Eintrag
 * existiert (bewahrt bisheriges Verhalten für den häufigen Ein-Typ-Fall).
 */
function referenceByType(sectPr: Element, localName: 'headerReference' | 'footerReference'): Element | null {
  const candidates = childElements(sectPr, OOXML_NAMESPACES.w, localName)
  return candidates.find((el) => el.getAttributeNS(OOXML_NAMESPACES.w, 'type') === 'default') ?? candidates[0] ?? null
}
```

Verwendung in `readDocx` (Zeilen 352-353), ersetzt:

```ts
// vorher:
const headerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')
const footerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'footerReference')
// nachher:
const headerRef = referenceByType(sectPr, 'headerReference')
const footerRef = referenceByType(sectPr, 'footerReference')
```

**F2/F3 (Feld-Erkennung):** `decodeParagraphRuns` (Zeilen 124-143) wird
grundlegend umgebaut. Der `w:fldChar`-Quadruple erstreckt sich über **mehrere
benachbarte** `<w:r>`-Geschwister innerhalb desselben `<w:p>` — die Erkennung
muss deshalb auf Absatzebene über alle direkten Kinder von `<w:p>` laufen (nicht
mehr nur `<w:r>` herausgefiltert wie bisher, Zeile 126), damit auch
`<w:fldSimple>` als eigenständiges direktes Geschwisterelement gesehen wird:

```ts
interface RunLike {
  kind: 'text' | 'break' | 'image' | 'field'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
  cachedValue?: string
}

/** Erstes Token des Feldcodes bestimmt die Feldart, tolerant gegenüber
 *  Whitespace und Schaltern (` PAGE `, `PAGE \* MERGEFORMAT`, `PAGE \* Arabic`,
 *  `PAGE \* ROMAN`, siehe Anforderung §3.6). Exakter Tokenvergleich (nicht
 *  Substring/Prefix) grenzt bewusst gegen `NUMPAGES`, `PAGEREF` u. Ä. ab, die
 *  ansonsten fälschlich als Seitenzahl-Feld gelesen würden (siehe
 *  tests/fixtures/external/docx/Bug60341.docx, das PAGE **und** NUMPAGES im
 *  selben Footer enthält, sowie Grenzfall-11-Analogon für DOCX). */
function isPageFieldInstr(instr: string): boolean {
  return instr.trim().split(/\s+/)[0]?.toUpperCase() === 'PAGE'
}

function decodeParagraphRuns(pEl: Element): RunLike[] {
  const runs: RunLike[] = []
  // Zustand eines gerade offenen `w:fldChar`-Quadruples (begin…separate…end),
  // das sich über mehrere <w:r>-Geschwister erstreckt. `null` = kein Feld aktiv.
  let field: {
    instr: string
    cachedValue: string
    cachedMarks?: Array<{ type: string; attrs?: Record<string, unknown> }>
    beginMarks: Array<{ type: string; attrs?: Record<string, unknown> }>
    sawSeparate: boolean
  } | null = null

  for (const child of Array.from(pEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'r') {
      const rPr = firstChildNS(child, OOXML_NAMESPACES.w, 'rPr')
      const marks = marksFromRunProperties(rPr)
      for (const grandchild of Array.from(child.children)) {
        const ns = grandchild.namespaceURI
        const local = grandchild.localName
        if (ns === OOXML_NAMESPACES.w && local === 'fldChar') {
          const type = grandchild.getAttributeNS(OOXML_NAMESPACES.w, 'fldCharType')
          if (type === 'begin') {
            field = { instr: '', cachedValue: '', beginMarks: marks, sawSeparate: false }
          } else if (type === 'separate') {
            if (field) field.sawSeparate = true
          } else if (type === 'end') {
            if (field) {
              if (isPageFieldInstr(field.instr)) {
                const fieldMarks = field.cachedMarks ?? field.beginMarks
                runs.push({
                  kind: 'field',
                  cachedValue: field.cachedValue || '1',
                  marks: fieldMarks.length ? fieldMarks : undefined,
                })
              }
              // Unbekannter Feldcode (z. B. AUTHOR/FILENAME/NUMPAGES): bewusst
              // keine Sonderbehandlung — bleibt beim bisherigen, dokumentierten
              // Verhalten (Cache-Wert wird, falls vorhanden, unten bereits als
              // gewöhnlicher Text erfasst, sobald `field` wieder null ist).
              field = null
            }
          }
        } else if (ns === OOXML_NAMESPACES.w && local === 'instrText') {
          if (field) field.instr += grandchild.textContent ?? ''
        } else if (ns === OOXML_NAMESPACES.w && local === 't') {
          if (field?.sawSeparate) {
            field.cachedValue += grandchild.textContent ?? ''
            field.cachedMarks = marks
          } else if (!field) {
            runs.push({ kind: 'text', text: grandchild.textContent ?? '', marks: marks.length ? marks : undefined })
          }
          // Falls `field` aktiv ist, aber `sawSeparate` noch falsch: ein <w:t>
          // zwischen begin/instrText ist laut OOXML nicht vorgesehen — bewusst
          // verworfen statt dupliziert/fälschlich als Text angehängt.
        } else if (ns === OOXML_NAMESPACES.w && local === 'br') {
          if (!field) runs.push({ kind: 'break' })
        } else if (ns === OOXML_NAMESPACES.w && local === 'drawing') {
          if (!field) {
            const blip = grandchild.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
            const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
            const docPr = grandchild.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
            runs.push({ kind: 'image', imageRelId: relId, imageAlt: docPr?.getAttribute('name') ?? '' })
          }
        }
      }
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'fldSimple') {
      // Der innere <w:r> ist Kind von <w:fldSimple>, NICHT von <w:p> — muss
      // rekursiv gesucht werden (getElementsByTagNameNS), sonst kompletter
      // Verlust (Anforderung §0 Punkt 4, empirisch an FancyFoot.docx bestätigt).
      const instr = child.getAttributeNS(OOXML_NAMESPACES.w, 'instr') ?? ''
      const nestedRuns = Array.from(child.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'r'))
      const cachedText = nestedRuns
        .map((r) => Array.from(r.getElementsByTagNameNS(OOXML_NAMESPACES.w, 't')).map((t) => t.textContent ?? '').join(''))
        .join('')
      const nestedMarks = marksFromRunProperties(nestedRuns[0] ? firstChildNS(nestedRuns[0], OOXML_NAMESPACES.w, 'rPr') : null)
      if (isPageFieldInstr(instr)) {
        runs.push({ kind: 'field', cachedValue: cachedText || '1', marks: nestedMarks.length ? nestedMarks : undefined })
      } else if (cachedText) {
        // Unbekanntes Simple-Feld (z. B. FILENAME, siehe FldSimple.docx): minimal
        // den Cache-Text erhalten statt Totalverlust — bleibt aber, wie bisher
        // für alle nicht spezifisch behandelten Felder, eingefrorener Text (kein
        // eigener Feld-Node; das ist außerhalb des Geltungsbereichs dieses Plans,
        // siehe Abschnitt 7 — FILENAME/AUTHOR/CREATEDATE sind eigenständige,
        // hier nicht beauftragte Feldarten).
        runs.push({ kind: 'text', text: cachedText, marks: nestedMarks.length ? nestedMarks : undefined })
      }
    }
  }
  return runs
}
```

`runsToInline` (Zeilen 185-190) um den neuen `'field'`-Fall ergänzt:

```ts
function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind !== 'image')
    .map((r) => {
      if (r.kind === 'break') return { type: 'hard_break' }
      if (r.kind === 'field') return { type: 'page_number_field', attrs: { cachedValue: r.cachedValue || '1' }, marks: r.marks }
      return { type: 'text', text: r.text ?? '', marks: r.marks }
    })
    .filter((n) => n.type !== 'text' || n.text)
}
```

Keine Änderung an `paragraphToBlocks` (Zeilen 146-183) nötig — Feld-Runs
durchlaufen denselben `runsToInline`/Buffer-Pfad wie Text-Runs, sowohl im
bild-freien als auch im bild-gemischten Zweig (Zeilen 158-161 bzw. 164-182),
weil sie (anders als `image`) **inline** bleiben, nicht zu einem eigenen
Block werden.

### 4.7 `src/formats/docx/writer.ts`

`inlineToRuns` (Zeilen 39-65) erhält einen neuen Zweig, der den bestehenden
Text-Buffer vor dem Feld flusht:

```ts
function inlineToRuns(nodes: JsonNode[] | undefined): string {
  if (!nodes) return ''
  const runs: string[] = []
  let buffer: { text: string; marks: JsonNode['marks'] } | null = null

  const flush = () => {
    if (!buffer) return
    runs.push(`<w:r>${runPropertiesXml(buffer.marks)}${encodeRunText(buffer.text)}</w:r>`)
    buffer = null
  }

  for (const node of nodes) {
    if (node.type === 'text') {
      if (buffer && JSON.stringify(buffer.marks) === JSON.stringify(node.marks)) {
        buffer.text += node.text ?? ''
      } else {
        flush()
        buffer = { text: node.text ?? '', marks: node.marks }
      }
    } else if (node.type === 'hard_break') {
      flush()
      runs.push('<w:r><w:br/></w:r>')
    } else if (node.type === 'page_number_field') {
      flush()
      // w:fldChar-Quadruple statt w:fldSimple (Begründung: Kernentscheidung 3.2).
      // Import muss weiterhin BEIDE Formen erkennen (docx/reader.ts, Abschnitt
      // 4.6) — hier wird bewusst nur eine Form geschrieben.
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
  }
  flush()
  return runs.join('')
}
```

Kein Import-/Signaturwechsel an anderer Stelle in dieser Datei nötig —
`inlineToRuns` wird bereits überall dort aufgerufen (`blockToDocx`, Zeilen
101-125), wo `page_number_field` als Kind eines `paragraph`/`heading`-Contents
vorkommen kann.

### 4.8 `src/formats/docx/xmlUtil.ts` — keine Änderung

`OOXML_NAMESPACES` (Zeilen 10-21) enthält bereits `w`, `r`, `a`, `wp` — alle für
`w:fldChar`/`w:instrText`/`w:fldSimple` benötigten Namensräume sind vorhanden
(diese Elemente liegen alle im `w`-Namensraum).

### 4.9 `src/formats/odt/reader.ts`

`walk()` (Zeilen 96-116) erhält zwei neue `else if`-Zweige, eingefügt nach dem
`text:tab`-Zweig (Zeilen 113-115):

```ts
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-number') {
      // Echtes Seitenzahl-Feld (LibreOffice: Einfügen → Kopf- und Fußzeile →
      // Seitenzahl). Kann selbstschließend/ohne Cache-Text sein (siehe
      // tests/fixtures/external/odt/fields.odt, Kopfzeile: <text:page-number
      // text:select-page="current"/>) oder einen Cache-Wert enthalten (siehe
      // odf-fields.odt: "…1…") — beide Fälle werden hier abgedeckt, mit '1' als
      // Fallback-Platzhalter (Anforderung §3.9), niemals leer.
      const cached = (el.textContent ?? '').trim()
      result.push({ type: 'page_number_field', attrs: { cachedValue: cached || '1' }, marks: marks.length ? marks : undefined })
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'page-count') {
      // Gesamtseitenzahl — bewusst NICHT derselbe Feld-Node (Grenzfall 11,
      // Anforderung §3.8, Non-Goal siehe Abschnitt 7 dieses Plans). Ohne
      // Sonderbehandlung würde dieser Zweig überhaupt nicht erreicht und das
      // Element stillschweigend übersprungen (der bestehende Bug) — stattdessen
      // wird wenigstens der Cache-Text als normaler, statischer Text erhalten,
      // ohne es fälschlich als Seitenzahl-Feld zu labeln.
      const cached = (el.textContent ?? '').trim()
      if (cached) result.push({ type: 'text', text: cached, marks: marks.length ? marks : undefined })
    }
```

Kein Änderungsbedarf an `decodeInline`/`paragraphToBlocks`/`elementToBlocks`
darüber hinaus — `walk()` wird bereits rekursiv mit den akkumulierten `marks`
aufgerufen (auch innerhalb von `text:span`, Zeilen 104-107), sodass sowohl
`<text:page-number>` direkt im Absatz (`odf-fields.odt`) als auch innerhalb
eines `<text:span>` (`fields.odt`) korrekt erfasst wird.

### 4.10 `src/formats/odt/writer.ts`

`inlineToOdt` (Zeilen 46-59) erhält einen neuen Fall:

```ts
function inlineToOdt(nodes: JsonNode[] | undefined, styles: TextStyleRegistry): string {
  if (!nodes) return ''
  return nodes
    .map((node) => {
      if (node.type === 'hard_break') return '<text:line-break/>'
      if (node.type === 'page_number_field') {
        const cached = escapeXml(String(node.attrs?.cachedValue ?? '1'))
        const field = `<text:page-number text:select-page="current">${cached}</text:page-number>`
        const styleName = styles.styleNameFor(runPropsFromMarks(node.marks))
        return styleName ? `<text:span text:style-name="${styleName}">${field}</text:span>` : field
      }
      if (node.type === 'text') {
        const text = encodeWhitespace(node.text ?? '')
        const styleName = styles.styleNameFor(runPropsFromMarks(node.marks))
        return styleName ? `<text:span text:style-name="${styleName}">${text}</text:span>` : text
      }
      return ''
    })
    .join('')
}
```

Wiederverwendet `runPropsFromMarks`/`TextStyleRegistry.styleNameFor` (bereits
generisch über `JsonNode['marks']`, `styleRegistry.ts:22-44`) — keine neue
Style-Infrastruktur nötig, identisches Muster wie beim `text`-Fall.

### 4.11 `src/formats/odt/xmlUtil.ts`, `src/formats/odt/styleRegistry.ts`, `src/formats/docx/styleDefs.ts` — keine Änderung

`ODF_NAMESPACES.text` (bereits vorhanden, `xmlUtil.ts:13`) deckt
`text:page-number`/`text:page-count` ab. Keine neue Formatvorlage nötig — das
Feld nutzt exakt dieselben Zeichen-Stildefinitionen wie normaler Text.

---

## 5. Grenzfall-Bewertung (Anforderung Abschnitt 4, alle 16 Fälle)

| # | Grenzfall | Bewertung nach diesem Plan |
|---|---|---|
| 1 | Feld im Haupttext (`body`) einfügen | **Bewusst erlaubt** (Kernentscheidung 3.5) — einzig sinnvolle Option ohne existierenden Kopf-/Fußzeilenbereich; dokumentiert, kein Zufall. |
| 2 | Klick ohne aktive Kopf-/Fußzeile | Aktuell strukturell nicht anders möglich (Grenzfall 1) — sobald `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren, per TODO in 4.4 nachzurüsten. |
| 3 | Mehrere Felder im selben Absatz | Trivial erfüllt — jede Toolbar-Betätigung erzeugt eine unabhängige Node-Instanz, keine Dedupe-Logik vorhanden oder nötig. |
| 4 | Feld neben Text ohne Leerzeichen | Erfüllt durch Schema-Eigenschaft: ProseMirror verschmilzt nie einen Atom-Node mit einem Text-Node, unabhängig vom Vorhandensein von Leerzeichen. |
| 5 | Selection-Sync-Regressionssequenz | Muss mit E2E-Test nachgestellt werden, sobald ein Editierbereich existiert; siehe 6.4 für den heute möglichen Body-Level-Ersatztest. |
| 6 | Backspace/Entf am Feldrand | Erfüllt durch `atom: true` (aus fehlendem `content` automatisch abgeleitet) + `contenteditable="false"` im `toDOM` — identisches, bereits bewährtes Muster wie beim `image`-Node; **muss** aber per echtem Browser-E2E-Test verifiziert werden (jsdom bildet natives contenteditable-Verhalten nicht ausreichend nach), siehe 6.4. |
| 7 | Kopieren/Einfügen | Automatisch über `toDOM`/`parseDOM`-basierte Zwischenablage-Serialisierung (siehe 4.1) — kein Zusatzcode. |
| 8 | Import `w:fldChar`-Quadruple mit `\* MERGEFORMAT` | Behoben, Fix F3 (4.6); Fixture `bug57031.docx`. |
| 9 | Import `w:fldSimple` | Behoben, Fix F2 (4.6); Fixture `FancyFoot.docx`. |
| 10 | Import `<text:page-number>` | Behoben, Fix F5 (4.9); Fixtures `odf-fields.odt`/`fields.odt`. |
| 11 | Import `<text:page-count>` nicht mit Seitenzahl verwechseln | Behoben, Fix F6 (4.9) — eigener, expliziter `else if`-Zweig statt Wiederverwendung des Seitenzahl-Zweigs; Fixture `odf-fields.odt` (enthält beide Elemente direkt nebeneinander). |
| 12 | Cross-Format-Rundreise DOCX→ODT→DOCX / ODT→DOCX→ODT | Ergibt sich aus 4.1 (gemeinsamer Node) + 4.6/4.7/4.9/4.10 (beide Reader/Writer erzeugen/lesen denselben `page_number_field`) — mit dediziertem Test abzusichern (6.1/6.2). |
| 13 | Undo/Redo | Ergibt sich aus der bereits global aktiven `history()`-Plugin-Instanz (`WordEditor.tsx:70`) ohne Zusatzcode — **erstmaliger** direkter Unit-Test für Undo/Redo in dieser Codebasis (siehe 6.3, bisher kein einziger Treffer für `undo(`/`redo(` in `src/`). |
| 14 | Formatierung + Rundreise | Ergibt sich aus `marks: '_'` (4.1) + `runPropertiesXml`/`runPropsFromMarks`-Wiederverwendung (4.7/4.10). |
| 15 | Enter direkt vor/nach dem Feld | Ergibt sich aus Standard-`splitBlock`-Verhalten von ProseMirror für Atom-Nodes (unverändert von `image`-Verhalten) — mit Unit-Test abzusichern (6.3). |
| 16 | Viele simulierte Seiten | Außerhalb der Kontrolle dieser App (Word/LibreOffice berechnet selbst, Anforderung §3.9) — nicht Gegenstand dieses Plans, siehe Non-Goal in Abschnitt 7. |

---

## 6. Tests

### 6.1 Neu: `src/formats/docx/__tests__/page-number-field.test.ts`

Unit-Tests gegen `readDocx`/`writeDocx`, Muster wie
`docx/__tests__/roundtrip.test.ts`:
1. Synthetisches `w:fldChar`-Quadruple (mit `\* MERGEFORMAT`) → Reader liefert
   genau einen `page_number_field`-Node mit `cachedValue` aus dem `<w:t>`
   zwischen `separate`/`end`; **kein** zusätzlicher Textknoten mit dem
   Cache-Wert (expliziter Regressionstest gegen Anforderung §0 Punkt 4/Fix F3).
2. Synthetisches `w:fldSimple` → Reader liefert genau einen
   `page_number_field`-Node, kein Totalverlust (Fix F2).
3. `w:fldChar`-Quadruple ohne `separate`/Cache-Wert (Muster wie
   `Bug51170.docx` `word/footer1.xml`) → Feld wird trotzdem erkannt,
   `cachedValue` fällt auf `'1'` zurück.
4. `NUMPAGES`-Feld (`w:fldChar`-Quadruple mit `instrText` „NUMPAGES") → **kein**
   `page_number_field`, sondern (unverändertes, bereits heute existierendes
   Verhalten) eingefrorener Cache-Text — Regressionstest gegen Verwechslung.
5. Schreiben eines `page_number_field`-Node mit `strong`+`textColor`-Marks →
   erzeugtes XML enthält `w:fldChar`-Quadruple, jeder der fünf `<w:r>` trägt
   dieselbe `<w:rPr>` mit `<w:b/>` und `<w:color .../>`.
6. Vollständige Rundreise (write → read) für Fall 5 → Marks bleiben erhalten,
   Feld bleibt Feld (Grenzfall 14).
7. Undo/Redo (Grenzfall 13, **neu**, erste ihrer Art in dieser Codebasis):
   `EditorState.create({ doc, schema: wordSchema, plugins: [history()] })` →
   `insertPageNumberField()` anwenden → `undo(state, dispatch)` → Dokument
   identisch zum Ausgangszustand → `redo(state, dispatch)` → Feld wieder da.
8. Enter direkt vor/nach dem Feld (Grenzfall 15) → Feld bleibt vollständig im
   ursprünglichen bzw. neuen Absatz, kein Duplikat, kein Verschwinden.
9. **Neu, deckt Fix F4:** synthetisches `sectPr` mit
   `<w:headerReference w:type="even".../><w:headerReference w:type="default".../>`
   (Reihenfolge even-vor-default, wie real in `bug57031.docx`) → Reader liest
   den `default`-Header, nicht den `even`-Header. Muss **vor** Fix F4 rot sein.

**Reale Fixtures** (ergänzend zu synthetischem XML, Anforderung §6 Punkt 5
verlangt ausdrücklich beides):
- `tests/fixtures/external/docx/FancyFoot.docx` — `w:fldSimple`, PAGE, sauberer
  Einzel-`default`-Footer (kein F4-Interferenz) → primärer Regressionsbeweis
  für Fix F2.
- `tests/fixtures/external/docx/bug57031.docx` — `w:fldChar`-Quadruple mit
  `\* MERGEFORMAT`, **und** even/default-Mehrfachreferenz → Regressionsbeweis
  für Fix F3 **und** Fix F4 gemeinsam (genau das im echten Footer sichtbare
  „Page 2 of 14").
- `tests/fixtures/external/docx/60329.docx` bzw. `Bug54771a.docx` —
  `w:fldChar`-Quadruple in einer Fußzeilentabellenzelle, sauberer
  Einzel-`default`-Header/-Footer → zusätzlicher, von F4 unabhängiger Beweis,
  dass Fix F3 auch innerhalb verschachtelter Tabellenzellen greift.
- `tests/fixtures/external/docx/PageSpecificHeadFoot.docx` — optional,
  zusätzlicher `w:fldSimple`-Fall mit even/default-Mehrfachreferenz.
- **Bewusst NICHT verwendet:** `tests/fixtures/external/docx/Bug60341.docx` —
  enthält zusätzlich den in 1a.3 dokumentierten, separaten `<w:sdt>`-Bug; würde
  ohne dessen Behebung (außerhalb dieses Plans) weiterhin fehlschlagen und
  fälschlich als „Fix F3 nicht funktionsfähig" gelesen werden.
- `tests/fixtures/external/docx/FldSimple.docx` — enthält ein **FILENAME**-Feld
  (kein PAGE), gut geeignet um den in 4.6 beschriebenen generischen
  `w:fldSimple`-Fallback (Cache-Text erhalten, kein eigener Feld-Node) zu
  testen, ohne PAGE/FILENAME zu verwechseln.

### 6.2 Neu: `src/formats/odt/__tests__/page-number-field.test.ts`

Unit-Tests analog, Muster wie `odt/__tests__/roundtrip.test.ts`:
1. Synthetisches `<text:page-number text:select-page="current">1</text:page-number>`
   → genau ein `page_number_field`-Node.
2. Synthetisches **selbstschließendes** `<text:page-number .../>` (ohne
   Cache-Text, Muster `fields.odt`) → Feld erkannt, `cachedValue` fällt auf
   `'1'` zurück.
3. Synthetisches `<text:page-count>1</text:page-count>` → **kein**
   `page_number_field`; stattdessen Cache-Text „1" als normaler Text erhalten
   (Regressionstest für Grenzfall 11/Fix F6).
4. `<text:page-number>` **und** `<text:page-count>` im selben Absatz
   nebeneinander → beide korrekt und unterschiedlich behandelt (deckt exakt das
   Muster aus `odf-fields.odt`).
5. Schreiben/Rundreise mit `textColor`+`underline`-Marks → `<text:span
   text:style-name="…">`-Wrapping bleibt erhalten, Feld bleibt Feld.

**Reale Fixtures:**
- `tests/fixtures/external/odt/odf-fields.odt` — `<text:page-number>` **und**
  `<text:page-count>` im Dokumentkörper nebeneinander; bereits heute ohne
  Kopf-/Fußzeilen-UI vollständig test- und vorführbar (liegt im `body`, nicht
  in `header`/`footer`) — primärer Regressionsbeweis für Fix F5/F6.
- `tests/fixtures/external/odt/fields.odt` — Kopfzeile mit „Seite " +
  selbstschließendem `<text:page-number>` (ohne Cache) + „ von " +
  `<text:page-count>` (mit Cache „1"), jeweils in `<text:span
  text:style-name="Page_20_Number">` gewrappt → Regressionsbeweis für den
  Cache-losen Fall **und** für Marks-Erhalt via Reader (auf `readOdt`-Ebene
  direkt testbar, auch ohne Kopf-/Fußzeilen-UI, siehe Anforderung §6 Punkt 6).

### 6.3 Neu: `src/formats/shared/editor/__tests__/page-number-field.test.ts`

Schema-/Command-Ebene, Muster wie das bereits vorhandene (Wegwerf-)Experiment
`__scratch_image_insert2.test.ts` (`EditorState.create` + direkter
Command-Aufruf), hier aber als dauerhafter, sauberer Testfall:
1. `insertPageNumberField()` an einer leeren Cursor-Position → Dokument enthält
   genau einen `page_number_field`-Node, Cursor direkt danach (Grenzfall 3.2).
2. `insertPageNumberField()` über eine bestehende Textselektion → Selektion
   wird ersetzt, nicht ergänzt (Anforderung §3.3).
3. Feld mit aktiven Marks an der Cursor-Position einfügen (`state.storedMarks`)
   → eingefügter Node trägt dieselben Marks (Anforderung §3.10).
4. `wordSchema.nodeFromJSON` mit einem `page_number_field`-Node, der zusätzlich
   `content` besäße → muss eine Schema-Validierungsfehler werfen (bestätigt,
   dass der Node tatsächlich `content`-los/atomar ist, nicht nur per Konvention).

### 6.4 Neu: `tests/e2e/page-number-field.spec.ts`

Folgt den Konventionen aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`
(`docxCard`/`odtCard`-Locator-Helfer lokal dupliziert, `page.waitForEvent
('download')` + `JSZip` für Export-Prüfung). Da aktuell **kein**
Kopf-/Fußzeilen-Editierbereich existiert (siehe Abschnitt 0), testet dieser
Spec die Funktion **auf Body-Ebene** (Kernentscheidung 3.5) — das ist der
heute einzig mögliche echte End-to-End-Nachweis, **kein** Ersatz für die in
Anforderung §6 Punkt 3/6 verlangten Kopf-/Fußzeilen-E2E-Tests, die erst nach
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sinnvoll ergänzt werden können
(hier per Kommentar im Testfile explizit als offen markiert, nicht
stillschweigend ausgelassen):
1. Neues Dokument, Klick auf „Seitenzahl einfügen" → sichtbares,
   schattiertes Feld-Element im DOM (`.pm-field-page-number`).
2. Direkt danach weitertippen (Selection-Sync-Regressionssequenz, Grenzfall 5) —
   Text vor/nach dem Feld bleibt korrekt, keine Beschädigung der Selektion,
   analog zum Muster in `selection-regression.spec.ts`.
3. Cursor unmittelbar vor/nach dem Feld, Backspace bzw. Entf → Feld verschwindet
   als Ganzes in einem Schritt, kein Rest-Text (Grenzfall 6 — **muss** hier statt
   in einem reinen Unit-Test verifiziert werden, siehe 5, Grenzfall 6).
4. Exportieren als DOCX → Downloaddatei enthält `<w:fldChar
   w:fldCharType="begin"/>` und `<w:instrText>` mit „PAGE" (unabhängige
   `JSZip`-Prüfung, Muster wie `docx.spec.ts:99-125`).
5. Reimport der soeben exportierten Datei → Feld weiterhin vorhanden
   (Feature-Rundreise, Anforderung §5.2 Punkt 1, hier auf Body-Ebene statt
   Fußzeile).
6. Dasselbe für ODT (Export → `<text:page-number>` im `content.xml`,
   Reimport → Feld weiterhin vorhanden).
7. Cross-Format: als DOCX erstelltes Dokument mit Feld → als ODT exportieren →
   reimportieren → als DOCX exportieren → reimportieren → Feld bleibt über
   beide Konvertierungen ein echtes Feld (Anforderung §5.2 Punkt 4/5, Grenzfall
   12) — hier auf Body-Ebene, mit Kommentar im Test, dass die
   Kopf-/Fußzeilen-Variante nachzuziehen ist, sobald 3.1 erfüllt ist.
8. Undo (Strg+Z) direkt nach Einfügen → Feld verschwindet vollständig,
   umgebender Text unverändert (Grenzfall 13, End-to-End-Ergänzung zu 6.3).

### 6.5 Ergänzung bestehender Baseline-Regressionstests

`src/formats/docx/__tests__/roundtrip.test.ts`: ein Test „Datei ohne jedes
Seitenzahl-Feld bleibt nach Rundreise ohne `page_number_field`-Node" (Anforderung
§5.1 Punkt 3) — einfache Ergänzung zum bestehenden Describe-Block-Muster, kein
neuer Testtyp nötig.

`src/formats/docx/__tests__/external-fixtures.test.ts` /
`src/formats/odt/__tests__/external-fixtures.test.ts`: bleiben **unverändert**
(generische „importiert ohne Absturz"-Suite) — die strukturellen Feld-Prüfungen
liegen bewusst in den neuen, dedizierten `page-number-field.test.ts`-Dateien
(6.1/6.2), um die bestehende generische Suite nicht mit formatspezifischen
Detailprüfungen zu vermischen (folgt derselben Trennung, die
`aufzaehlungsliste-code.md` Abschnitt 5.1 für Listen vorexerziert hat).

---

## 7. Bewusst nicht umgesetzte Punkte (Non-Goals dieses Plans)

- **Bedienbarer Kopf-/Fußzeilenbereich selbst** (F13). Eigene Tickets
  `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`. Dieser Plan liefert den in
  Anforderung §3.1 verlangten „minimalen Vertrag" (ein Inline-Node, der überall
  eingefügt werden kann, wo `inline*`-Content erlaubt ist) bereits vollständig
  vor — sobald jene Tickets einen zweiten Editierbereich schaffen, ist **keine**
  Schema-/Reader-/Writer-Änderung mehr nötig, nur die in 4.4 markierte
  Toolbar-Kontext-Prüfung.
- **`w:sdt`-eingebettete Absätze in Kopf-/Fußzeile werden ignoriert** (F11,
  Neufund 1a.3, `Bug60341.docx`). Eigenständiger, allgemeiner
  Content-Control-Bug, nicht spezifisch für Seitenzahl-Felder. Empfehlung:
  eigener Backlog-Eintrag, idealerweise aufgegriffen von
  `kopfzeile-bearbeiten-code.md`/`fusszeile-bearbeiten-code.md`.
- **Kopf-/Fußzeilen-Bilder über falsche Rels-Datei aufgelöst** (F12, Neufund
  1a.4, `Bug51170.docx`). Ebenfalls eigenständig, betrifft nur Bilder. Gleiche
  Empfehlung wie F11.
- **`NUMPAGES`/„Seite X von Y"** (Anforderung §8, kein eigener Backlog-Slug).
  Bewusst kein generischer Feld-Node (Kernentscheidung 3.1); NUMPAGES-Runs
  bleiben beim heutigen (unveränderten) Verhalten eingefrorener Text.
- **Seitenzahlformat/Startwert** (Anforderung §8, Slug `seitenzahl-format`,
  Priorität 3). Kein `\* ROMAN`/`\* Arabic`-Attribut am Node, kein Startwert.
- **„Erste Seite anders"/„Gerade-ungerade anders"** (Anforderung §8, eigene
  Slugs). Nicht berührt.
- **Kontextmenü-Eintrag** (Anforderung §1 Zeile 6, Nice-to-have). Kein
  Kontextmenü im Projekt vorhanden (projektweite Lücke, nicht
  feature-spezifisch, wie bereits in `aufzaehlungsliste-code.md` Abschnitt 7
  für Listen festgehalten).
- **Bequemer Einstieg mit Auto-Aktivierung einer Standard-Fußzeile**
  (Anforderung §1 Zeile 2, Nice-to-have). Setzt `fusszeile-bearbeiten` voraus,
  nicht Teil dieses Plans.

---

## 8. Freigabestatus nach Umsetzung dieses Plans (Bewertung gegen Anforderung Abschnitt 7)

| Freigabekriterium (Anforderung §7) | Status nach diesem Plan |
|---|---|
| Bedienbarer Kopf-/Fußzeilenbereich existiert | **Nicht erfüllt** — außerhalb des Geltungsbereichs (siehe Abschnitt 0/7). Blockiert die Gesamtabnahme unabhängig vom Rest dieser Tabelle. |
| Alle Bedienelemente aus Anforderung §1 funktionieren | **Teilweise** — Toolbar-Button, Feldschattierung, Löschen, Formatierbarkeit funktionieren (auf Body-Ebene, siehe Kernentscheidung 3.5); Kontextabhängigkeit „nur in Kopf-/Fußzeile aktiv" kann erst nach obigem Punkt nachgerüstet werden. |
| Alle Testfälle aus Anforderung §6 automatisiert grün | **Teilweise** — Unit-Tests (§6 Punkt 1/2) vollständig; E2E-Tests (§6 Punkt 3/4) nur auf Body-Ebene möglich (siehe 6.4), Kopf-/Fußzeilen-Variante blockiert. |
| Grenzfälle aus Anforderung §4 einzeln befundet | **Erfüllt** — siehe Abschnitt 5 dieses Plans, jeder der 16 Fälle bewertet. |
| Baseline-Rundreise (§5.1) nicht gebrochen | **Erfüllt**, inkl. neuem Regressionstest (6.5) und den beiden in Anforderung §0 bereits nachgewiesenen Bugs (F2/F3), plus dem hier zusätzlich gefundenen und mitbehobenen F4. |
| Feature-Rundreise (§5.2) für DOCX/ODT/Cross-Format | **Teilweise** — auf Body-Ebene vollständig nachgewiesen (6.4); Kopf-/Fußzeilen-Variante blockiert bis §3.1 erfüllt ist. |
| Selection-Sync-Regressionstest mit Feld-Einfüge-Sequenz | **Teilweise** — auf Body-Ebene nachgewiesen (6.4 Punkt 2); Kopf-/Fußzeilen-Variante blockiert. |

**Gesamtstatus nach Umsetzung dieses Plans: „teilweise"** — exakt wie von der
Anforderung selbst in Abschnitt 7 für genau diesen Fall vorgesehen („Andernfalls
ist der Status auf teilweise zu setzen und die konkret fehlenden Teilpunkte sind
hier nachzutragen"). Der einzige verbleibende Blocker für „vorhanden" ist die
außerhalb dieses Plans liegende Fertigstellung von
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` (siehe Abschnitt 3.1 der
Anforderung) — alles, was innerhalb des Geltungsbereichs dieses Plans liegt
(Datenmodell, Reader, Writer, Command, Toolbar, Schattierung, Tests), ist nach
Umsetzung vollständig und ohne bekannte offene Fehler.

---

## 9. Phasenplan

1. **Phase A (Schema/Command/Toolbar, formatunabhängig):** 4.1, 4.3, 4.4, 4.5 —
   inkl. Unit-Tests 6.3 (isoliert testbar ohne DOCX/ODT).
2. **Phase B (DOCX-Reader/-Writer):** 4.6 (F2/F3/F4), 4.7 (F7) — mit
   Unit-Tests 6.1, insbesondere den Regressionstests, die **vor** dem Fix
   nachweislich rot sein müssen.
3. **Phase C (ODT-Reader/-Writer):** 4.9 (F5/F6), 4.10 (F7) — mit
   Unit-Tests 6.2, analog zu Phase B.
4. **Phase D (Baseline-Regression + E2E):** 6.5 (Baseline-Ergänzung), 6.4
   (neues E2E-Spec) — abhängig von A-C.
5. **Phase E (Dokumentation):** Backlog-Status-Anmerkung gemäß Abschnitt 8
   dieses Plans; separate Backlog-Einträge für F11/F12 gemäß Abschnitt 7
   vorschlagen; Übergabe-Notiz an `kopfzeile-bearbeiten-code.md`/
   `fusszeile-bearbeiten-code.md` (sobald diese existieren) bezüglich der in
   4.4 markierten Toolbar-Kontext-Prüfung sowie der in Abschnitt 7 als F11/F12
   dokumentierten, dort möglicherweise ohnehin zu behebenden Bugs.

---

## 10. Offene Entscheidungen zur Freigabe vor Umsetzungsbeginn

1. Bestätigung, dass Fix F4 (`headerReference`/`footerReference`-Typauswahl)
   **innerhalb** dieses Plans behoben wird, obwohl er kein genuiner
   Seitenzahl-Bug ist — Begründung in 1a.2: ohne ihn testen die von der
   Anforderung selbst verlangten Baseline-Rundreise-Fixtures (`bug57031.docx`
   u. Ä.) am falschen Kopf-/Fußzeilenteil vorbei. Alternative: F4 als eigenen,
   vorgelagerten Mini-Fix/PR behandeln, dieser Plan setzt ihn dann nur voraus.
2. Bestätigung der Kernentscheidung 3.2 (`w:fldChar`-Quadruple statt
   `w:fldSimple` als Exportform) — beide sind laut Anforderung §3.5 zulässig,
   die Wahl ist nicht revidierbar-neutral (unterschiedliche Test-Erwartungen
   an das erzeugte XML).
3. Bestätigung der Kernentscheidung 3.5 (Button ohne Kopf-/Fußzeilen-Kontext
   bewusst auf `body` wirken lassen, statt ihn bis zur Fertigstellung von
   `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` unsichtbar/deaktiviert zu
   lassen). Beide Varianten sind laut Anforderung Grenzfall 1 zulässig.
4. Einordnung von F11 (`w:sdt`-Bug) und F12 (Kopf-/Fußzeilen-Bild-Rels-Bug) als
   **separate** Backlog-Einträge statt Teil dieses Plans — Bestätigung, dass
   das kein „stilles Verschweigen" darstellt, sondern (wie in Abschnitt 7
   dokumentiert) eine bewusste Abgrenzung, da beide Bugs generisch sind und
   nicht spezifisch mit Seitenzahl-Feldern zusammenhängen.
