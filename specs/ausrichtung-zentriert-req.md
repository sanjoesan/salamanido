# Anforderungen: „Ausrichtung zentriert“ (Absatzausrichtung, Fokus: `center`)

Status: **vorhanden, aber nicht vertrauenswürdig — vollständige Verifikation angefordert.**
Diese Datei ist die verbindliche Anforderungsgrundlage für die Verifikation des Features
„Ausrichtung zentriert“ aus `specs/FEATURE-BACKLOG.md` (Slug `ausrichtung-zentriert`,
Abschnitt 2.3 „Absatzformatierung“, Priorität 1). Sie ergänzt `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 4 (Absatzformatierung) um die für dieses eine Feature nötige Detailtiefe: jedes
Bedienelement, jedes Detailverhalten, jeder Grenzfall und die Rundreise-Pflicht (DOCX
**und** ODT).

Architektur-Grundprinzip bleibt wie im Hauptdokument: DOCX und ODT teilen sich einen
gemeinsamen internen Editor (ProseMirror-Schema, Knoten-Attribut `align` auf `paragraph`
und `heading`). Da die vier Ausrichtungswerte (`left`, `center`, `right`, `justify`)
technisch **einen einzigen Mechanismus** teilen (`setAlign`/`isAlignActive`/`AlignButton`),
gilt: Jeder hier gefundene Fehler betrifft mit hoher Wahrscheinlichkeit auch die drei
anderen Ausrichtungen. Der fachliche Fokus dieser Datei liegt aber auf `center`
(„zentriert“), da dies der zu verifizierende Backlog-Eintrag ist — alle Testfälle
verlangen deshalb explizit den Wert `center`, auch wo der Mechanismus generisch ist.

---

## 1. Kontext & Ist-Zustand (Codeanalyse)

Der aktuelle Code wurde vor Erstellung dieser Anforderungen gesichtet, damit die
Verifikation zielgerichtet an den tatsächlich vorhandenen Mechanismen ansetzt:

| Ebene | Fundstelle | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts` (Zeile 4, 12–16, 22–30) | Eigenes Attribut `align` (Default `'left'`) auf den Node-Typen `paragraph` **und** `heading`. `toDOM` rendert `style="text-align: …"`, `parseDOM` liest `style.textAlign` beim Einfügen von HTML. |
| Befehle | `src/formats/shared/editor/commands.ts` (Zeile 8, 10, 13–27, 29–38) | `type Align = 'left' \| 'center' \| 'right' \| 'justify'`; `alignableTypes = Set(['paragraph', 'heading'])`; `setAlign(align)` iteriert per `state.doc.nodesBetween(from, to, …)` über die Selektion und setzt bei **jedem** gefundenen Absatz/jeder Überschrift das Attribut; `isAlignActive(state, align)` liest nur den nächstgelegenen alignierbaren Vorfahren von `$from` (Selektionsanfang). |
| Formatvorlagen-Wechsel | `src/formats/shared/editor/commands.ts` (Zeile 40–55) | `setHeading(level)` setzt beim Wechsel der Formatvorlage `attrs = { level, align: 'left' }` (Zeile 43) bzw. beim Zurückwechseln zu „Standard“ `attrs = undefined` (⇒ Schema-Default `'left'`) — **unabhängig davon, welche Ausrichtung der Absatz vorher hatte.** |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx` (Zeile 64–84, 185–188) | Eigene Komponente `AlignButton` (kein Wrapper von `MarkButton`), vier Instanzen mit Labels `⇤` (links), `↔` (zentriert), `⇥` (rechts), `≡` (Blocksatz). `title={`Ausrichtung: ${align}`}` — der interne Bezeichner (`center` u. a.), **nicht** das deutsche Wort „zentriert“, landet im Tooltip. Anders als `MarkButton` (Zeile 47: `aria-label={title}`) setzt `AlignButton` **kein** eigenes `aria-label`. |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` (Zeile 71–79) | Keymap enthält `Mod-b/i/u` für Fett/Kursiv/Unterstrichen, aber **kein** Kürzel für irgendeine der vier Ausrichtungen (in Word/LibreOffice üblich: Strg+E zentriert, Strg+L/R/J links/rechts/Blocksatz). |
| DOCX-Import | `src/formats/docx/reader.ts` (Zeile 13, 150–152) | `JC_TO_ALIGN = { left, center, right, both→justify }`; liest **ausschließlich** `<w:pPr><w:jc w:val="…"/></w:pPr>` **direkt am Absatz**. Kein Rückgriff auf eine über `w:pStyle` referenzierte Formatvorlage in `styles.xml`. Unbekannte `jc`-Werte (`start`, `end`, `distribute` u. a.) fallen über `?? 'left'` still auf „links“ zurück. |
| DOCX-Export | `src/formats/docx/writer.ts` (Zeile 16, 67–69) | `JC_BY_ALIGN = { left, center, right, justify→both }`; schreibt bei **jedem** Absatz/jeder Überschrift explizit `<w:jc w:val="…"/>`, auch bei `left` (Default wird nicht weggelassen — unschädlich, aber erwähnenswert für Diff-Vergleiche mit Fremddateien). |
| ODT-Import | `src/formats/odt/reader.ts` (Zeile 36–77, 126, 173) | `parseAutomaticStyles` liest `fo:text-align` **nur** aus `style:style`-Elementen mit `style:family="paragraph"` innerhalb von `office:automatic-styles`. Weder `office:styles` (benannte/gemeinsame Formatvorlagen) noch eine `style:parent-style-name`-Vererbungskette werden ausgewertet. Ohne Treffer wird `'left'` angenommen (Zeile 126, 173). |
| ODT-Export | `src/formats/odt/writer.ts` (Zeile 61–73) + `src/formats/odt/styleRegistry.ts` (Zeile 68–89) | Für jede Ausrichtung wird ein fester Automatikstil-Name erzeugt (`PARAGRAPH_ALIGN_STYLE_NAME`, `headingStyleName(level, align)`), jeweils mit `fo:text-align="…"` in `office:automatic-styles`. |
| Unit-/Roundtrip-Tests | `src/formats/docx/__tests__/roundtrip.test.ts` (Zeile 41–53), `src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 41–53) | Je ein `it.each(['left','center','right','justify'])`-Test für Absätze sowie ein dedizierter Test „preserves heading alignment“ mit `center`. Prüft **ausschließlich** Schreiben→eigenes Lesen (Writer→Reader desselben Moduls), nicht gegen eine externe Referenzimplementierung, nicht innerhalb von Tabellenzellen/Listen, nicht über einen Formatvorlagen-Wechsel hinweg. |
| E2E-Tests (Browser) | `tests/e2e/*.spec.ts` | Eine Volltextsuche über `tests/` nach `align`/`Ausrichtung` ergab **keinen Treffer**. Es existiert kein einziger Test, der einen der vier Ausrichtungs-Buttons tatsächlich im Browser anklickt — anders als bei „Fett“ (`getByTitle('Fett')` in `docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`). |
| Reale Testfixtures | `tests/fixtures/external/docx/`, `tests/fixtures/external/odt/` | Enthalten bereits konkret einschlägige Dateien, u. a. `bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx`, `rtl.docx` (DOCX) sowie `CharacterParagraphFormat.odt`, `CharacterParagraphFormat_MSO15.odt`, `feature_attributes_paragraph_MSO2013.odt`, `feature_attributes_paragraph_MSO2013_doc-AO.odt`, `paragraphWithPageStyle.odt`, `tabelleAlignMargin.odt` (ODT) — bisher ungenutzt für Ausrichtungs-Tests. |

**Konsequenz:** Der Backlog-Status „vorhanden“ ist für die reine Existenz des Mechanismus
zutreffend, aber unbelegt in Bezug auf echte Browser-Bedienung, Formatvorlagen-Wechsel,
Fremd-Dateien mit stilbasierter Ausrichtung und Verschachtelung in Tabellen/Listen.
Abschnitt 6 dieser Datei listet die aus der Codeanalyse abgeleiteten konkreten
Verdachtsmomente — insbesondere den mutmaßlichen Bug, dass ein Wechsel der Formatvorlage
eine vorher gesetzte Zentrierung stillschweigend auf „links“ zurücksetzt.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Toolbar-Button „Zentriert“ (`↔`) | Formatierungsleiste, Gruppe Absatzausrichtung (neben Links/Rechts/Blocksatz) | Klick setzt die Ausrichtung des/der Absätze bzw. Überschrift(en), die von der aktuellen Selektion bzw. der Schreibmarke betroffen sind, auf `center`. Muss unabhängig von Maus-Selektion, Tastatur-Selektion oder „Alles auswählen“ funktionieren. |
| 2 | Aktiv-Zustand des Buttons (`aria-pressed`) | derselbe Button | Zeigt an, ob der Absatz an der Schreibmarke/am Selektionsanfang bereits zentriert ist. Muss sich sofort aktualisieren, wenn der Cursor bewegt wird — auch ohne Klick auf den Button selbst. |
| 3 | Icon/Beschriftung des Buttons | derselbe Button | Aktuell das Unicode-Zeichen `↔`. Muss auf allen Zielsystemen eindeutig als „zentriert“ erkennbar und von „links“ (`⇤`), „rechts“ (`⇥`) und „Blocksatz“ (`≡`) unterscheidbar sein (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20, Icon-Rendering-Vorbehalt). `↔` ist zusätzlich riskant, da es in vielen UI-Konventionen für „verschieben“/„Breite ändern“ statt „zentrieren“ steht. |
| 4 | Tooltip/Titel-Attribut | derselbe Button | Aktuell `title="Ausrichtung: center"` (interner Bezeichner, nicht die deutsche Beschriftung „zentriert“) — **muss geklärt werden**, ob das gewollt ist oder auf „Ausrichtung: Zentriert“ o. Ä. geändert werden soll. Muss per Hover **und** Screenreader tatsächlich vorgelesen/angezeigt werden. |
| 5 | `aria-label` | derselbe Button | Aktuell **nicht gesetzt** (anders als bei den Zeichenformat-Buttons, die `aria-label={title}` explizit setzen) — muss geprüft werden, ob Screenreader trotzdem einen sinnvollen Namen ansagen (Fallback auf `title` ist browserabhängig, keine Garantie). |
| 6 | Tastenkürzel | Editor, global während Fokus im Dokument | **Muss explizit entschieden und dokumentiert werden** — aktuell nicht vorhanden. Bei einer Priorität-1-Funktion, die in Word/LibreOffice standardmäßig ein Kürzel hat (Strg+E), wiegt das Fehlen schwerer als bei Nice-to-have-Funktionen. |
| 7 | Formatvorlagen-Dropdown (Standard/Überschrift 1–6) | Formatierungsleiste, links neben den Zeichenformat-Buttons | **Interagiert mit diesem Feature:** Ein Wechsel der Formatvorlage darf die zuvor gesetzte Zentrierung nicht stillschweigend verändern (siehe Abschnitt 3.6 und Abschnitt 6 Punkt 1 — laut Codeanalyse aktuell vermutlich doch der Fall). |
| 8 | Kontextmenü/Rechtsklick-Äquivalent | — | Nicht gefordert (kein Rechtsklick-Kontextmenü im Scope), aber falls künftig eingeführt, muss „Zentriert“ dort ebenfalls erscheinen. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf einen einzelnen Absatz (mit oder ohne Selektion)
- Cursor in einem Absatz platzieren (keine Textselektion nötig, da Ausrichtung eine
  **Absatzeigenschaft** ist, keine Zeichen-Mark) → Klick auf „Zentriert“ → der gesamte
  Absatz wird sofort zentriert dargestellt, unabhängig davon, ob/wie viel Text markiert war.
- Gilt identisch für eine Überschrift (Ebene 1–6).

### 3.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften hinweg
- Eine Selektion, die mehrere Absätze und/oder Überschriften umfasst (z. B. per
  Maus-Ziehen über drei Zeilen, per „Alles auswählen“) → Klick auf „Zentriert“ → **jeder**
  von der Selektion (auch nur teilweise) berührte Absatz/jede Überschrift wird zentriert,
  laut Code (`commands.ts:13-27`, `nodesBetween`) ohne Ausnahme.
- **Explizit zu verifizieren:** Ob dieser eine Klick als **eine** atomare, mit einem
  einzigen Strg+Z rückgängig machbare Aktion im Undo-Verlauf erscheint, oder — wie die
  Codeanalyse vermuten lässt (siehe Abschnitt 6 Punkt 4) — als mehrere separate
  Undo-Schritte (einer pro betroffenem Absatz).

### 3.3 Kein Toggle-Aus — Ausrichtung ist ein Vier-Zustand-Attribut
- Anders als bei Fett/Kursiv/Unterstrichen/Durchgestrichen gibt es **kein** „Aus“:
  Ein bereits zentrierter Absatz bleibt bei erneutem Klick auf „Zentriert“ zentriert
  (keine Rückkehr zu „links“). Um die Zentrierung aufzuheben, muss aktiv einer der
  anderen drei Ausrichtungs-Buttons geklickt werden (typischerweise „Links“).
- Die vier Ausrichtungs-Buttons verhalten sich wie eine Radio-Button-Gruppe: zu jedem
  Zeitpunkt ist genau einer der vier Zustände aktiv, nie zwei gleichzeitig und nie keiner.

### 3.4 Aktiv-Zustand-Anzeige bei gemischter Selektion
- `isAlignActive` (`commands.ts:29-38`) berechnet den Aktiv-Zustand ausschließlich aus
  dem alignierbaren Vorfahren von `$from` (Selektionsanfang). Bei einer Selektion, die
  mit einem zentrierten Absatz beginnt, aber weitere, anders ausgerichtete Absätze
  enthält, zeigt der „Zentriert“-Button „aktiv“, obwohl ein Klick **alle** betroffenen
  Absätze überschreiben würde. Das gewünschte Anzeigeverhalten bei gemischter Selektion
  muss festgelegt (Analogie zu Word/LibreOffice: meist wird dann **kein** Button als
  aktiv markiert) und mit einem Test abgesichert werden.

### 3.5 Zusammenspiel mit der Formatvorlagen-Auswahl (Standard/Überschrift 1–6)
- **Kernanforderung:** Wird ein bereits zentrierter Absatz über das Dropdown in eine
  Überschrift umgewandelt (oder umgekehrt, oder von einer Überschriftsebene in eine
  andere), **muss die bestehende Zentrierung erhalten bleiben**, sofern die Nutzerin sie
  nicht aktiv ändert.
- Laut Codeanalyse (`commands.ts:40-55`, Zeile 43: `attrs = { level, align: 'left' }`)
  ist genau das aktuell **nicht** der Fall — jeder Wechsel der Formatvorlage setzt die
  Ausrichtung hart auf `'left'` zurück. Dies gilt als **zu bestätigender Fehler**, nicht
  als akzeptierter Ist-Zustand (siehe Abschnitt 6 Punkt 1).

### 3.6 Interaktion mit Listen und Tabellenzellen
- Ein Absatz innerhalb eines Listenpunkts (`list_item`) oder einer Tabellenzelle
  (`table_cell`) muss sich identisch zentrieren lassen wie ein freistehender Absatz —
  `alignableTypes` prüft nur den Node-Typ (`paragraph`/`heading`), nicht dessen
  Elternstruktur, daher sollte der Mechanismus grundsätzlich funktionieren; dies ist
  aber bisher durch **keinen** Test (weder Unit noch E2E) belegt.
- Bei einem zentrierten Listenpunkt: Wie in Word/LibreOffice üblich wird nur der
  **Textinhalt** zentriert, das Aufzählungszeichen/die Nummer bleibt an ihrer Position
  (kein „Mitwandern“ des Symbols) — dieses Verhalten muss dokumentiert und bestätigt
  werden, nicht nur angenommen.
- Ein zentrierter Absatz in einer Tabellenzelle darf keine Nebenwirkung auf Nachbarzellen
  oder auf über `colspan`/`rowspan` verbundene Zellen haben.

### 3.7 Visuelle Darstellung
- Im Editor: `text-align: center` auf dem `<p>`/`<h1>`–`<h6>`-Element (siehe
  `schema.ts` `toDOM`), sichtbar als mittig ausgerichteter Text innerhalb der Satzspiegel-
  breite der Seitenansicht (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Seitenlayout).
- Muss auch bei sehr kurzem Text (ein Wort) und bei sehr langem, mehrzeilig umbrechendem
  Text korrekt jede einzelne Zeile zentrieren (kein Verrutschen bei Zeilenumbruch).

### 3.8 Kombination mit Zeichenformatierung
- Zentrierung (Absatzebene) muss unabhängig von Zeichenformatierung (Fett, Kursiv,
  Farbe usw.) auf demselben Textlauf funktionieren — beide Ebenen dürfen sich nicht
  gegenseitig beeinflussen oder verdrängen.

### 3.9 Undo/Redo
- Zentrieren eines einzelnen Absatzes ist ein einzelner, undoable Schritt (Strg+Z macht
  genau diesen einen Ausrichtungswechsel rückgängig).
- Bei einer Mehrabsatz-Selektion siehe den offenen Verifikationspunkt in Abschnitt 3.2 —
  falls sich mehrere Transaktionen bestätigen, ist zu entscheiden, ob das als Bug
  behoben oder als akzeptables (wenn auch unschönes) Verhalten dokumentiert wird.
- Selection-Sync-Regressionsgefahr laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2: Toolbar-
  Aktion (Zentrieren) auf „Alles auswählen“ gefolgt von Klick-Neupositionierung darf
  keine Dokumentteile verschlucken.

### 3.10 Tastenkürzel (offene Entscheidung)
- **Zu klären und verbindlich festzulegen:** Entweder wird ein Tastenkürzel ergänzt
  (Analogie zu Word/LibreOffice: Strg+E für zentriert, ggf. auch Strg+L/R/J für die
  anderen drei), oder das Fehlen wird bewusst als Soll-Zustand dokumentiert. Diese
  Anforderungsdatei fordert **keine** vorgegebene Antwort, sondern verlangt, dass die
  Entscheidung getroffen, umgesetzt und mit einem Test abgesichert wird.

---

## 4. Grenzfälle

1. **Zentrierung, die in einer Fremddatei über eine Formatvorlage statt direkter
   Absatzformatierung gesetzt ist** (DOCX: `w:pStyle` verweist auf einen Stil in
   `styles.xml`, der `w:jc w:val="center"` definiert, der Absatz selbst hat kein
   eigenes `w:jc`; ODT: ein referenzierter Stil erbt `fo:text-align="center"` nur über
   `style:parent-style-name`, ohne es selbst zu wiederholen) — laut Codeanalyse
   (Abschnitt 1, DOCX-Import- und ODT-Import-Zeilen) wird das **nicht** ausgewertet,
   der Absatz würde fälschlich als „links“ importiert. **Muss geprüft und ggf.
   korrigiert werden** — dies ist ein in echten Word-/LibreOffice-Dokumenten gängiges
   Muster (z. B. „Titel“/„Untertitel“-Formatvorlagen, die zentriert vordefiniert sind).
2. **`w:jc`-Werte außerhalb von `left/center/right/both`** (`start`, `end`,
   `distribute`, `thaiDistribute`, `mediumKashida`, `highKashida`, `lowKashida`,
   `numTab`) in einer realen, außerhalb dieser App erzeugten DOCX-Datei — fallen laut
   `docx/reader.ts:13,152` still auf „links“ zurück. Ein Import darf dadurch **keinen**
   sichtbaren Text verlieren, sollte die Ausrichtung aber möglichst korrekt (oder
   zumindest nachvollziehbar dokumentiert als bewusster Fallback) behandeln.
3. **Formatvorlagen-Wechsel setzt Zentrierung zurück** (siehe 3.5/Abschnitt 6 Punkt 1) —
   zentrierten Absatz per Dropdown in „Überschrift 1“ umwandeln, dann zurück zu
   „Standard“ → Ausrichtung muss geprüft werden; falls sie verloren geht, gilt das als
   Bug, der behoben werden muss, bevor das Feature wieder als „vorhanden“ gilt.
4. **Gemischte Selektion über mehrere Absätze mit unterschiedlicher Ausgangsausrichtung**
   → nach Klick auf „Zentriert“ müssen **alle** betroffenen Absätze zentriert sein, keiner
   darf bei seiner ursprünglichen Ausrichtung verbleiben (Testfall zur Bestätigung nötig,
   da die Schleifenlogik in `setAlign` das zwar vorsieht, aber ungetestet ist).
5. **Leerer, zentrierter Absatz** (kein Text) → muss beim Export als zentrierter, leerer
   Absatz erhalten bleiben, nicht als Absatz ohne Ausrichtungsinformation verschwinden.
6. **Zentrierte Überschrift kombiniert mit Zeichenformatierung** (fett/farbig) im
   selben Textlauf → beide Ebenen bleiben unabhängig erhalten (siehe 3.8).
7. **Zentrierter Absatz in einer Tabellenzelle** (insbesondere in einer über `colspan`
   oder `rowspan` verbundenen Zelle) → bleibt unabhängig von Nachbarzellen (siehe 3.6).
8. **Zentrierter Listeneintrag** (Bullet und nummeriert, ein- und mehrstufig) → nur der
   Text wird zentriert, das Listensymbol bleibt an seiner Position (siehe 3.6).
9. **Zentrierter Absatz in Kopf-/Fußzeile** — Kopf-/Fußzeile-Bearbeitung fehlt laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 komplett in der UI; dieser Fall ist deshalb
   aktuell **nicht end-to-end über die Oberfläche testbar** und muss entsprechend
   vermerkt (nicht stillschweigend ausgelassen) werden — auf Datenmodell-/Reader-/
   Writer-Ebene (direkt konstruierte `header`/`footer`-Inhalte) ist er aber prüfbar.
10. **RTL-Dokument** (die Fixture `tests/fixtures/external/docx/rtl.docx` existiert
    bereits im Testkorpus) → „zentriert“ ist richtungsunabhängig und muss unabhängig
    von Textrichtung visuell mittig bleiben; Import darf nicht versehentlich `center`
    mit einem RTL-spezifischen `start`/`end`-Wert verwechseln (siehe Grenzfall 2).
11. **Sehr lange Selektion über viele Seiten** zentrieren → kein spürbares Einfrieren
    der UI, insbesondere falls sich Verdachtsmoment 4 aus Abschnitt 6 bestätigt (viele
    Einzel-Transaktionen bei vielen betroffenen Absätzen).
12. **Wiederholtes schnelles Klicken** auf den bereits aktiven „Zentriert“-Button →
    keine Nebenwirkung, keine unnötig aufgeblähte Undo-Historie durch wiederholtes
    Setzen desselben Werts.
13. **Copy/Paste von extern zentriertem Text** (z. B. aus einer Webseite mit
    `style="text-align: center"` oder aus echtem, per Zwischenablage kopiertem
    Word-Text) → `paragraph`/`heading`-`parseDOM` liest `style.textAlign` (`schema.ts`
    Zeile 13, 26) und sollte die Zentrierung beim Einfügen übernehmen — Testfall mit
    echtem Browser-Clipboard nötig, nicht nur synthetisch.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert exportieren
→ Ergebnis entspricht inhaltlich A.“ Für „Ausrichtung zentriert“ bedeutet das konkret:

1. **DOCX-Rundreise (Upload unverändert):** Eine reale, außerhalb dieser App erzeugte
   DOCX-Datei mit mindestens einem zentrierten Absatz importieren — Kandidat:
   `tests/fixtures/external/docx/bug-paragraph-alignment.docx` (ersatzweise
   `table-alignment.docx`, `TestTableCellAlign.docx`) — → **ohne jede Bearbeitung**
   sofort wieder exportieren → erneut importieren → der zentrierte Absatz ist inhaltlich
   (Text **und** Zentrierung) identisch zum Ausgangszustand.
2. **ODT-Rundreise (Upload unverändert):** Dasselbe mit einer realen ODT-Datei —
   Kandidat: `tests/fixtures/external/odt/CharacterParagraphFormat.odt` (ersatzweise
   `CharacterParagraphFormat_MSO15.odt`, `feature_attributes_paragraph_MSO2013.odt`,
   `feature_attributes_paragraph_MSO2013_doc-AO.odt`, `paragraphWithPageStyle.odt`).
3. **Rundreise nach eigener Bearbeitung (DOCX):** Neues oder importiertes Dokument, im
   Editor einen Absatz über den Toolbar-Button zentrieren → als DOCX exportieren →
   reimportieren → Zentrierung und exakter Textinhalt bleiben erhalten.
4. **Rundreise nach eigener Bearbeitung (ODT):** Dasselbe für ODT.
5. **Cross-Format-Rundreise DOCX → ODT:** DOCX mit zentriertem Absatz importieren →
   als ODT exportieren → reimportieren → Zentrierung bleibt erhalten.
6. **Cross-Format-Rundreise ODT → DOCX:** Umgekehrt ebenso.
7. **Doppelte Cross-Format-Rundreise:** DOCX → ODT → DOCX an einem Dokument mit
   zentriertem Absatz **kombiniert** mit Fett/Farbe/Überschrift-Ebene → kein
   kumulativer Verlust der Zentrierung über zwei Konvertierungen hinweg.
8. **Zentrierte Überschrift (Ebene 1–6):** Rundreise DOCX und ODT — bereits mit
   Unit-Test abgedeckt (`roundtrip.test.ts` Zeile 41–45, jeweils Writer→eigener Reader),
   muss aber zusätzlich mit einer realen externen Datei **und** einem E2E-Test über
   echte Toolbar-Bedienung (Formatvorlagen-Dropdown + Ausrichtungs-Button) abgesichert
   werden.
9. **Zentrierter Absatz innerhalb einer Tabellenzelle:** Rundreise DOCX/ODT — aktuell
   durch **keinen** bestehenden Test abgedeckt.
10. **Zentrierter Listeneintrag** (Bullet und nummeriert): Rundreise DOCX/ODT — aktuell
    durch **keinen** bestehenden Test abgedeckt.
11. **Formatvorlagen-Wechsel vor Export:** Absatz zentrieren → per Dropdown in
    „Überschrift 2“ umwandeln → exportieren → reimportieren → Zentrierung muss erhalten
    geblieben sein (deckt den Verdacht aus Abschnitt 3.5/6.1 über den vollen Rundreise-
    Pfad ab, nicht nur im laufenden Editor-Zustand).
12. **Validierung gegen unabhängigen Parser:** Der exportierte `<w:jc w:val="center"/>`
    (DOCX) bzw. der referenzierte `fo:text-align="center"`-Automatikstil (ODT) muss
    zusätzlich gegen eine vom eigenen Reader unabhängige Prüfung bestätigt werden
    (z. B. python-docx/odfpy-Äquivalent oder echtes Öffnen in Word/LibreOffice), damit
    sich Schreib- und Lesefehler nicht gegenseitig „unsichtbar“ ausgleichen (siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
13. **Reale Fremddatei mit stilbasierter Zentrierung:** Mindestens ein Testfall, der
    gezielt eine Datei mit über eine Formatvorlage (nicht direkt) zentriertem Absatz
    importiert, unverändert exportiert und reimportiert — Ergebnis und ggf. Abweichung
    vom Original muss dokumentiert werden (siehe Grenzfall 1).

---

## 6. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Diese Liste benennt konkrete, aus dem Quellcode abgeleitete Verdachtspunkte, die die
QA-Verifikation **gezielt** widerlegen oder bestätigen muss — sie ersetzt nicht die
vollständige Testabdeckung aus Abschnitt 7, sondern lenkt die Priorität:

1. **Formatvorlagen-Wechsel setzt Zentrierung zurück** (`commands.ts:40-55`,
   `setHeading`): `attrs = { level, align: 'left' }` wird bei **jedem** Wechsel der
   Formatvorlage (Standard→Überschrift X, Überschrift X→Überschrift Y, Überschrift
   X→Standard) hart gesetzt bzw. auf den Schema-Default zurückgesetzt — unabhängig von
   der zuvor gesetzten Ausrichtung. Kein bestehender Test deckt das ab. **Dies ist der
   gewichtigste Einzelverdacht dieser Anforderungsdatei**, da er die Kernfunktion
   „zentriert“ in einem alltäglichen Bedienschritt (Formatvorlage wechseln) unbemerkt
   zerstören würde.
2. **Keine Berücksichtigung stilbasierter/geerbter Ausrichtung beim Import**
   (`docx/reader.ts:150-152`, `odt/reader.ts:62-65,126,173`): Beide Reader lesen
   Ausrichtung ausschließlich aus direkten Absatzeigenschaften — nicht aus dem
   Formatvorlagen-Baum (DOCX: `w:pStyle` → `styles.xml`; ODT: `style:parent-style-name`-
   Kette oder `office:styles`). Reale Dokumente, die Zentrierung über eine
   Formatvorlage statt direkter Formatierung setzen (in Word/LibreOffice gängig, z. B.
   für „Titel“/„Untertitel“), würden fälschlich als „links“ importiert.
3. **Unvollständige `jc`-Wertetabelle** (`docx/reader.ts:13,152`): `JC_TO_ALIGN` kennt
   nur `left/center/right/both`; andere laut ECMA-376 gültige Werte fallen still auf
   `'left'` zurück — betrifft die generelle Robustheit der Ausrichtungserkennung, auch
   wenn `center` selbst korrekt gemappt ist.
4. **Mehrfach-Transaktion bei Mehrabsatz-Selektion** (`commands.ts:13-27`, `setAlign`):
   Die Schleife über `state.doc.nodesBetween` ruft `dispatch(state.tr.setNodeAttribute(...))`
   für **jeden** gefundenen Absatz/jede Überschrift einzeln auf; `state.tr` erzeugt bei
   jedem Zugriff eine neue, vom ursprünglichen (unveränderten) `state` abgeleitete
   Transaktion. In Kombination mit dem in `WordEditor.tsx` (Zeile 91–98) registrierten
   `dispatchTransaction`, das `view.state` synchron nach jedem `dispatch`-Aufruf
   aktualisiert, dürfte das Enddokument zwar korrekt konvergieren (da `setNodeAttribute`
   die Dokumentgröße nicht verändert und Positionen deshalb gültig bleiben), es
   entstehen dabei aber vermutlich **mehrere separate Undo-Schritte und mehrere
   `onChange`-Aufrufe** für einen einzigen Klick auf „Zentriert“, sobald die Selektion
   mehrere Absätze umfasst. Muss mit einem expliziten Mehrabsatz-Test verifiziert
   werden (ein Klick → wie viele `Strg+Z` nötig, um vollständig zurückzurollen?).
5. **`isAlignActive` nur aus `$from`** (`commands.ts:29-38`): Der aktive Zustand wird
   ausschließlich aus dem alignierbaren Vorfahren des Selektionsanfangs berechnet, nicht
   aus der gesamten Selektion. Bei gemischter Selektion zeigt der Button ggf. „aktiv“,
   obwohl ein Klick alle betroffenen Absätze überschreiben würde — gewünschtes
   Anzeigeverhalten muss festgelegt werden (siehe 3.4).
6. **Kein Tastenkürzel** (`WordEditor.tsx:71-79`): Weder für „Zentriert“ noch für eine
   der drei anderen Ausrichtungen ist ein Tastenkürzel gebunden, obwohl es sich um eine
   Priorität-1-Funktion handelt, für die Word/LibreOffice standardmäßig eines anbieten
   (Strg+E).
7. **Fehlendes `aria-label` am `AlignButton`** (`Toolbar.tsx:64-84` vs. `MarkButton`
   Zeile 47): `MarkButton` setzt explizit `aria-label={title}`, `AlignButton` verlässt
   sich ausschließlich auf `title` als zugänglichen Namen — inkonsistent zu den
   Nachbar-Buttons.
8. **Title-Attribut zeigt internen Bezeichner** (`Toolbar.tsx:69`):
   `title={`Ausrichtung: ${align}`}` rendert wörtlich „Ausrichtung: center“ statt
   „Ausrichtung: zentriert“ — inkonsistent zur sonst durchgehend deutschen
   Beschriftung der App und relevant für künftige `getByTitle(...)`-E2E-Selektoren.
9. **Icon-Rendering** (`Toolbar.tsx:185-188`): Die vier Ausrichtungs-Buttons nutzen die
   Unicode-Zeichen `⇤ ↔ ⇥ ≡`, bereits laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20
   als generelles Rendering-Risiko vermerkt. `↔` für „zentriert“ ist zusätzlich
   semantisch uneindeutig (wird in vielen UI-Konventionen für „verschieben“ verwendet).
10. **Kein E2E-Test vorhanden** — Volltextsuche über `tests/` nach `align`/`Ausrichtung`
    ergab keinen Treffer. Die einzige Absicherung ist die Writer→eigener-Reader-
    Unit-Test-Kette in `roundtrip.test.ts`.
11. **Unit-Tests kennen keine Kombination mit Tabellen/Listen/Formatvorlagen-Wechsel** —
    die vorhandenen Roundtrip-Tests prüfen Ausrichtung ausschließlich an freistehenden
    Absätzen/Überschriften, nie innerhalb `table_cell`- oder `list_item`-Inhalten und nie
    über einen `setHeading`-Aufruf hinweg.

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

1. Cursor in einen Absatz setzen (ohne Selektion) → „Zentriert“ klicken → Absatz
   sichtbar zentriert.
2. Text markieren (Maus-Ziehen, Doppelklick, Dreifachklick, Strg+A) → „Zentriert“
   klicken → jede Selektionsmethode führt zum identischen Ergebnis.
3. Mehrere Absätze markieren (unterschiedliche Ausgangsausrichtung) → „Zentriert“
   klicken → **alle** betroffenen Absätze sind danach zentriert.
4. Direkt im Anschluss an Testfall 3: Strg+Z drücken → prüfen, wie viele Tastendrücke
   nötig sind, um vollständig zum Vorzustand zurückzukehren (Verdachtsmoment 6.4).
5. Erneuter Klick auf „Zentriert“ bei bereits zentriertem Absatz → keine Veränderung,
   kein Fehler, keine unnötige neue Undo-Stufe.
6. „Links“/„Rechts“/„Blocksatz“ auf einen zentrierten Absatz anwenden → Zentrierung wird
   korrekt durch die neue Ausrichtung ersetzt (kein gleichzeitiges Bestehen zweier
   Ausrichtungen).
7. Toolbar-Button „Zentriert“ zeigt aktiven Zustand korrekt, wenn Cursor in bereits
   zentriertem Text steht (ohne Selektion).
8. Toolbar-Button-Zustand bei gemischter Mehrabsatz-Selektion → Verhalten wie in
   Abschnitt 3.4/6.5 festgelegt.
9. Zentrierung einer Überschrift (Ebene 1–6) → funktioniert identisch zu einem
   normalen Absatz.
10. **Formatvorlagen-Wechsel-Regressionstest (Kernverdacht 6.1):** Absatz zentrieren →
    per Dropdown zu „Überschrift 1“ wechseln → prüfen, ob Zentrierung erhalten bleibt.
11. Dasselbe umgekehrt: zentrierte Überschrift → per Dropdown zurück zu „Standard“ →
    prüfen, ob Zentrierung erhalten bleibt.
12. Dasselbe zwischen zwei Überschriftsebenen (z. B. Überschrift 1 → Überschrift 3) →
    Zentrierung bleibt erhalten.
13. Zentrierung in einer Tabellenzelle anwenden → nur diese Zelle betroffen, keine
    Nebenwirkung auf Nachbarzellen.
14. Zentrierung in einer über `colspan`/`rowspan` verbundenen Zelle anwenden →
    funktioniert identisch.
15. Zentrierung eines Listeneintrags (Bullet) → nur der Text wird zentriert, das
    Aufzählungszeichen bleibt an seiner Position.
16. Zentrierung eines Listeneintrags (nummeriert) ebenso.
17. Kombination von Zentrierung mit Fett/Kursiv/Schriftfarbe auf demselben Textlauf →
    alle Formatierungen gleichzeitig sichtbar, keine verdrängt die andere.
18. Copy/Paste von extern zentriertem Text (z. B. Webseite mit
    `style="text-align: center"`) in den Editor → Zentrierung bleibt erhalten.
19. Leeren Absatz zentrieren, danach Text eintippen → getippter Text erscheint zentriert.
20. Undo (Strg+Z) direkt nach Zentrieren eines einzelnen Absatzes → Ausrichtung geht
    zurück zum Vorzustand.
21. Redo (Strg+Y) danach → Zentrierung kommt zurück.
22. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2: „Alles auswählen“ →
    „Zentriert“ klicken → per Klick neu positionieren → Enter → weiter tippen → beide
    entstehenden Absätze bleiben erhalten (und zentriert).
23. DOCX-Rundreise: neues Dokument, Absatz zentrieren, exportieren, reimportieren →
    Zentrierung erhalten.
24. ODT-Rundreise: dasselbe für ODT.
25. Cross-Format-Rundreise DOCX → ODT: Zentrierung erhalten.
26. Cross-Format-Rundreise ODT → DOCX: Zentrierung erhalten.
27. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit Zentrierung + Fett + Farbe +
    Überschrift-Ebene kombiniert → kein Verlust der Zentrierung.
28. Upload von `tests/fixtures/external/docx/bug-paragraph-alignment.docx` (unverändert)
    → Export → Reimport → zentrierte Absätze inhaltlich identisch zum Original.
29. Upload von `tests/fixtures/external/odt/CharacterParagraphFormat.odt` (unverändert)
    → Export → Reimport → zentrierte Absätze inhaltlich identisch zum Original.
30. Upload einer Fremddatei mit **stilbasierter** (nicht direkter) Zentrierung → prüfen,
    ob sie korrekt als „zentriert“ erkannt wird oder wie in Verdachtsmoment 6.2
    beschrieben fälschlich als „links“ importiert wird — Ergebnis dokumentieren.
31. Upload von `tests/fixtures/external/docx/rtl.docx` → prüfen, dass Zentrierung
    (falls vorhanden) unabhängig von der Textrichtung korrekt erkannt/dargestellt wird.
32. Zentrierte Absätze innerhalb einer Tabellenzelle → Rundreise DOCX und ODT.
33. Zentrierte Listeneinträge → Rundreise DOCX und ODT.
34. E2E-Test über echte Browser-Bedienung (Playwright, analog zu `tests/e2e/docx.spec.ts`
    Zeile 68 für „Fett“): Button „Zentriert“ per `page.getByTitle(...)` (aktueller
    Titeltext oder ggf. korrigierter deutscher Titel) anklicken, Text eingeben,
    sichtbar zentriert prüfen — **muss neu ergänzt werden**, da aktuell nicht vorhanden.
35. Export nach DOCX validieren gegen einen vom eigenen Reader unabhängigen Parser
    (z. B. python-docx oder OOXML-Schemaprüfung) → `<w:jc w:val="center"/>` korrekt
    vorhanden.
36. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema →
    `fo:text-align="center"` korrekt vorhanden.
37. Icon-Rendering-Test auf einem System ohne besondere Font-Unterstützung: Zeichen
    `↔` (zentriert) bleibt von `⇤`/`⇥`/`≡` eindeutig unterscheidbar.
38. Tastenkürzel-Test: entweder das neu festgelegte Kürzel funktioniert zuverlässig,
    oder das bewusste Fehlen ist dokumentiert und nachvollziehbar gemacht (siehe 3.10) —
    „stillschweigend fehlend“ gilt nicht als erfüllt.
39. Performance/Stabilität: sehr lange Selektion (mehrere Seiten Text, viele Absätze)
    zentrieren → UI bleibt reaktionsfähig, kein spürbares Einfrieren.
40. Schnelles Mehrfachklicken auf den bereits aktiven „Zentriert“-Button → kein
    inkonsistenter Zwischenzustand, keine unnötig aufgeblähte Undo-Historie.

---

## 8. Abnahmekriterien (Definition of Done)

Das Feature „Ausrichtung zentriert“ gilt erst dann wieder als „vorhanden“ im Sinne von
vertrauenswürdig, wenn:

1. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt wurden (nicht nur die bereits
   vorhandenen Writer→eigener-Reader-Unit-Tests) und deren Ergebnis dokumentiert ist.
2. Jedes Verdachtsmoment aus Abschnitt 6 explizit als „bestätigt und behoben“,
   „bestätigt und bewusst als Grenzfall dokumentiert“ oder „widerlegt“ eingestuft wurde —
   keines bleibt unkommentiert offen. Insbesondere Punkt 1 (Formatvorlagen-Wechsel
   setzt Zentrierung zurück) muss vorrangig geklärt werden, da er die Kernfunktion
   dieses Features in einer alltäglichen Bedienabfolge betrifft.
3. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) für den
   „Zentriert“-Button dauerhaft in der Testsuite verankert ist (Testfall 34), inklusive
   des Formatvorlagen-Wechsel-Regressionstests (Testfall 10–12).
4. Die Rundreise-Anforderung aus Abschnitt 5 für DOCX **und** ODT, inklusive
   Cross-Format, inklusive Tabellenzellen und Listen, und inklusive mindestens einer
   realen (nicht app-eigenen) Testdatei je Format (Testfall 28–29), nachweislich
   erfüllt ist.
5. Die offene Entscheidung zum Tastenkürzel (Abschnitt 3.10) getroffen und umgesetzt
   oder ausdrücklich begründet zurückgestellt wurde.
6. Die Frage, ob und wie stilbasierte (nicht direkte) Zentrierung aus Fremddateien
   erkannt werden soll (Grenzfall 1, Verdachtsmoment 6.2), bewusst entschieden und
   dokumentiert ist — nicht nur zufällig aus dem aktuellen Verhalten abgeleitet.
