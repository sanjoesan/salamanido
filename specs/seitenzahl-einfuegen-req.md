# Anforderungen: „Seitenzahl einfügen"

Status: Im Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt „3.7 Kopf- & Fußzeile",
Zeile 252, Slug `seitenzahl-einfuegen`, Priorität 1, Beschreibung „Fügt ein
automatisch fortlaufendes Seitenzahl-Feld ein.") als **„fehlt"** markiert. Diese
Einstufung galt laut Auftrag als **nicht vertrauenswürdig** und wurde für diese Datei
durch direkte Durchsicht des **aktuellen** Codes (Stand 2026-07-04, am 2026-07-05 gegen den
unveränderten Code erneut Zeile für Zeile bestätigt — Schema ohne Feld-Node, beide Reader
degradieren still, kein Command/Button) **verifiziert**:
Die Einfüge-Funktion fehlt vollständig, ihre Voraussetzung (bedienbare Kopf-/Fußzeile)
fehlt ebenfalls, und der Lesepfad degradiert reale Seitenzahl-Felder still zu statischem
Text. Siehe Abschnitt 0. Diese Datei beschreibt folglich den Soll-Zustand einer **neu zu
bauenden Funktion mit einer expliziten, ebenfalls noch fehlenden Abhängigkeit** und dient
zugleich als Abnahme-Checkliste.

Geltungsbereich: ausschließlich die Funktion „ein automatisch fortlaufendes
Seitenzahl-Feld an der Cursor-Position einfügen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`,
`src/formats/shared/documentModel.ts`) sowie deren Serialisierung/Deserialisierung in
`src/formats/docx/` und `src/formats/odt/`.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Seitenzahl-Feld einfügen → Export → Re-Import → Feld **und**
Inhalt bleiben erhalten).

> **Hinweis zur Überarbeitung:** Ein früherer Entwurf dieser Datei (12:40) beschrieb den
> Reader-Befund als „vollständigen, stillen Verlust" der Feldinhalte und behauptete, es
> gebe „keinen Test" und „keine realen Fixtures". Alle drei Aussagen sind gegen den
> aktuellen Code **nachweislich falsch** und wurden hier korrigiert — sie sind unten
> jeweils ausdrücklich als Korrektur markiert. Load-bearing ist stets das beschriebene
> **Verhalten**; die Zeilennummern gelten für den Stand 2026-07-04.
>
> **Zweiter Korrekturdurchgang (2026-07-05, nachmittags):** Alle Codeverweise dieser
> Datei wurden erneut direkt gegen den aktuellen Arbeitsstand nachgeschlagen (Datei für
> Datei gelesen, Fixtures per `unzip`/`grep` neu ausgezählt statt übernommen). Dabei zwei
> konkrete Korrekturen:
> 1. **Die `WordEditor.tsx`-Zeilenverweise in 0.2/0.3 waren tatsächlich veraltet, nicht
>    nur „Stand einer älteren Version"** — die Datei hat sich zwischen dem zitierten
>    Stand 2026-07-04 und jetzt um genau die Zeilen verschoben, die Commit `9f8fa03`
>    („Implement Ausschneiden (cut) toolbar action and keybinding") hinzugefügt hat
>    (`useAutoDismiss`/`cutError`, `Shift-Delete`-Keybinding, der
>    `clipboardTextSerializer`-Rechtsklick-Kommentar). Die vier betroffenen Verweise
>    (Z. 71, Z. 77–99, Z. 109–113, Z. 116) sind unten auf die tatsächlich aktuellen
>    Zeilen (Z. 79, Z. 85–107, Z. 117–121, Z. 124) korrigiert; das beschriebene
>    **Verhalten** (kein Kopf-/Fußzeilenbereich, kein Feld-Shortcut, bewusst kein
>    Kontextmenü, `clipboardTextSerializer` vorhanden) war und ist zutreffend. Das zeigt
>    zugleich, dass die Formulierung „am 2026-07-05 gegen den unveränderten Code erneut
>    bestätigt" in der Kopfzeile für `WordEditor.tsx` **nicht** wörtlich stimmte — die
>    Datei war zwischenzeitlich doch verändert worden (siehe Commit-Historie); alle
>    übrigen zitierten Dateien (`schema.ts`, `documentModel.ts`, beide Reader/Writer,
>    `commands.ts`, `Toolbar.tsx`, die Backlog- und Test-Zeilen) wurden neu
>    nachgeschlagen und stimmen exakt.
> 2. **Neuer, zuvor nicht festgehaltener Befund zu `fields.odt`:** Das dortige
>    `<text:page-number>` in `style:header` ist entgegen der bisherigen impliziten
>    Annahme **selbstschließend ohne Cache-Ziffer** (`<text:page-number
>    text:select-page="current"/>`), nicht `<text:page-number>1</text:page-number>` wie
>    bei `sample.odt`/`sample_numbering_DOC_LO41.odt`/`odf-fields.odt`. Näheres in 0.8
>    (Fußnote zur Fixture-Tabelle), 3.8 und Grenzfall 20 (neu).

---

## 0. Befund aus direkter Code-Verifikation (Stand 2026-07-04, erneut bestätigt 2026-07-05)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes, nicht auf
der Backlog-Beschreibung und nicht auf einem älteren Schnappschuss. Alle Kernbefunde (kein
Feld-Node in `schema.ts`; DOCX-`collectRuns`/`decodeRunElement` und ODT-`walk()`
degradieren; kein `insertPageNumber`-Command, kein Toolbar-Button) wurden am 2026-07-05
gegen den unverändert gebliebenen Code nachgeprüft und gelten fort.

### 0.1 Kein Datenmodell für Felder jeglicher Art
`src/formats/shared/schema.ts` kennt die Nodes `doc` (Z. 14), `paragraph` (Z. 16–24),
`heading` (Z. 26–38), `text` (Z. 40), `hard_break` (Z. 42–56), `image` (Z. 58–85),
`unsupported_block` (Z. 92–113), `bullet_list`/`ordered_list`/`list_item` (Z. 115–152)
sowie die Tabellen-Nodes aus `tableNodes(...)` (Z. 154). Marks: `strong`, `em`,
`underline`, `strike`, `textColor`, `highlight` (Z. 157–196). Es existiert **kein**
Node und **kein** Mark für ein dynamisches, sich selbst aktualisierendes Feld
(Seitenzahl, Datum, Gesamtseitenzahl). Der `text`-Node ist reiner, statischer
Zeichentext. Ein Seitenzahl-Feld lässt sich im aktuellen Datenmodell nicht einmal
ausdrücken.
- **Konkret zu beachten für die Umsetzung:** Die vorhandenen Inline-Blätter sind
  entweder markfrei (`hard_break`, Z. 42–56, `selectable: false`) oder Block-Nodes ohne
  Marks (`image`, Z. 58–85). Ein **markfähiges Inline-Atom** (fett/kursiv/Farbe direkt auf
  dem Feld) ist im Schema **neues Terrain** und muss bewusst modelliert werden (3.4/3.10).
- `hard_break` definiert bewusst `leafText: () => '\n'` (Z. 51), weil ProseMirror ein
  Leaf-Inline ohne `leafText` bei jeder Klartext-Extraktion (`textContent`,
  `textBetween`, Klartext-Clipboard) als **leeren String** behandelt. Ein neues Feld-Atom
  braucht daher zwingend ein eigenes `leafText` (z. B. den Cache-/Vorschauwert), sonst
  verschmelzen benachbarte Wörter beim Kopieren als Klartext (siehe 3.12).

### 0.2 Keine Kopf-/Fußzeilen-Bearbeitung in der UI — blockierende Voraussetzung
`header`/`footer` sind im Datenmodell vorhanden (`src/formats/shared/documentModel.ts`,
Z. 5–6: jeweils `ProseMirrorJSON | null`; `createBlankWordDocument` setzt beide auf
`null`, Z. 14–21) und werden von Reader **und** Writer beider Formate verarbeitet
(DOCX-Reader liest `sectPr → headerReference/footerReference`, `reader.ts` Z. 507–532;
DOCX-Writer schreibt `header1.xml`/`footer1.xml`, `writer.ts` Z. 258–273; ODT-Reader
liest `styles.xml` → `style:master-page` → `style:header`/`style:footer`, `reader.ts`
Z. 375–387; ODT-Writer schreibt dieselben Elemente, `writer.ts` Z. 216–233/271–272).
**Aber:** Der einzige Editor-Einstieg (`WordEditor.tsx`) instanziiert ausschließlich
`doc.content.body` (Z. 79, korrigiert vom früher zitierten Z. 71 — siehe Korrekturdurchgang
oben) — es gibt **keinen** fokussierbaren Kopf-/Fußzeilenbereich in
der Oberfläche, `Toolbar.tsx` und `WordEditor.tsx` referenzieren `header`/`footer`
**nirgends** (per Volltextsuche verifiziert). „Seitenzahl einfügen" setzt begrifflich
einen Ort voraus (Kopf-/Fußzeile), und dieser Ort ist in der Bedienoberfläche schlicht
nicht erreichbar. Deshalb ist dieses Feature von den ebenfalls als „fehlt"/Priorität 1
geführten Slugs `kopfzeile-bearbeiten` (Backlog Z. 250) und `fusszeile-bearbeiten`
(Z. 251) **hart abhängig** (siehe 3.1).

### 0.3 Kein Toolbar-Button, kein Command, kein Shortcut
`Toolbar.tsx` (vollständig durchgesehen) hat keinen Eintrag „Seitenzahl", „Kopfzeile"
oder „Fußzeile". `src/formats/shared/editor/commands.ts` enthält Commands für
Ausrichtung, Überschriften, Listen, Bild-/Tabelleneinfügung, Farb-Marks, Zeilenumbruch
und Ausschneiden — aber **keinen** `insertPageNumber`-artigen Befehl. Die `keymap({...})`
in `WordEditor.tsx` (Z. 85–107, korrigiert vom früher zitierten Z. 77–99) belegt
`Mod-z/y/Shift-z`, `Enter` (`splitListItem`), `Shift-Enter` (`insertHardBreak`),
`Mod-b/i/u`, `Shift-Delete` (`cutSelection`); kein Feld-Shortcut. Der Editor hat zudem
bewusst kein eigenes Kontextmenü (Kommentar `WordEditor.tsx` Z. 117–121, korrigiert vom
früher zitierten Z. 109–113) und übergibt einen `clipboardTextSerializer` an die
`EditorView` (Z. 124, korrigiert vom früher zitierten Z. 116) — für ein neues Feld-Atom
ohne eigenes `leafText` bliebe der Klartext-Clipboard-Pfad davon direkt betroffen (0.1).

### 0.4 DOCX-Reader — *(Korrektur eines früheren Entwurfs: keine „vollständige stille Löschung" mehr, sondern stille Degradierung zu statischem Text)*
Ein früherer Entwurf behauptete, `decodeParagraphRuns()` iteriere „nur über direkte
`<w:r>`-Kinder von `<w:p>`" und ein `w:fldSimple`-Feld gehe deshalb **vollständig
verloren**. Das ist gegen den aktuellen Code **falsch**. Tatsächlich:
- `decodeParagraphRuns()` (Z. 218) delegiert an `collectRuns()` (Z. 194–216), das
  **rekursiv** in genau die Wrapper absteigt, in die echte Word-Dateien Runs verpacken:
  `w:r` (Z. 203), `w:ins`/`w:hyperlink`/`w:smartTag` (Z. 207), `w:sdt`/`w:sdtContent`
  (Z. 209–211) **und `w:fldSimple`** (Z. 212–213). Der Doc-Kommentar (Z. 186–193) nennt
  „a simple field's cached result (`w:fldSimple`)" ausdrücklich als Grund. Ein tracked
  `w:del` wird bewusst übersprungen (Z. 205).
- `decodeRunElement()` (Z. 170–184) behandelt innerhalb eines `<w:r>` nur `w:t`
  (Z. 175), `w:br` (Z. 177) und `w:drawing`/`w:pict` (Z. 179). `w:instrText` und
  `w:fldChar` matchen keinen Fall und werden **nicht** als sichtbarer Text ausgegeben —
  der Feldcode leckt also **nicht** durch (gut).
- **Konsequenz für beide OOXML-Kodierungen eines PAGE-Feldes:**
  - **`w:fldSimple`-Form** (`<w:p><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>`):
    `collectRuns` steigt in `w:fldSimple` ab und liest den zwischengespeicherten
    Anzeigewert (`<w:t>1</w:t>`) als **statischen Text „1"**.
  - **`w:fldChar`-Quadruple-Form** (die in der Praxis häufigere Word-Form:
    `begin` / `instrText " PAGE "` / `separate` / `<w:t>1</w:t>` / `end`): Die
    `w:fldChar`-/`w:instrText`-Runs werden übersprungen, der `<w:t>1</w:t>`-Run zwischen
    `separate` und `end` matcht die `w:t`-Bedingung und wird ebenfalls als **statischer
    Text „1"** gelesen.
- **Verifizierter Ist-Zustand (kein Totalverlust, aber Feldsemantik-Verlust):** In
  **beiden** Formen wird ein echtes, aktualisierbares PAGE-Feld beim Import zu einem
  **eingefrorenen Literal** (typischerweise „1"). Das ist auf Folgeseiten sachlich falsch
  (die App/Word würde dort „1" statt 2, 3, … zeigen) und geht auf dem Rückweg dauerhaft
  als hartkodierter Text hinaus (siehe 0.6, 3.5). Genau das ist der zu behebende Fehler —
  nicht ein Totalverlust, sondern eine unauffällig plausibel aussehende **stille
  Degradierung**.

### 0.5 ODT-Reader — *(Korrektur eines früheren Entwurfs: `<text:page-number>` wird nicht mehr übersprungen)*
Ein früherer Entwurf behauptete, `walk()` habe „keinen Fallback-Zweig" und ein
`<text:page-number>`-Element werde „komplett übersprungen, der Cache-Wert geht ersatzlos
verloren". Auch das ist gegen den aktuellen Code **falsch**. `walk()`
(`src/formats/odt/reader.ts` Z. 138–168) behandelt Textknoten (Z. 139), `text:span`
(Z. 146), `text:line-break` (Z. 150), `text:s` (Z. 152), `text:tab` (Z. 155),
Redline-/Bookmark-Marker (Z. 157) **und besitzt einen abschließenden `else`-Fallback
(Z. 160–167)**, der in **jedes** andere Inline-Element mit denselben Marks absteigt. Der
Kommentar (Z. 160–165) nennt `text:date`/**`text:page-number`**/**`text:page-count`**/
`text:author-name` explizit. Ein `<text:page-number>1</text:page-number>` wird dadurch
**nicht** verworfen — sein Cache-Wert „1" bleibt als **statischer Text** erhalten (exakt
dieselbe Degradierung wie beim DOCX-Reader in 0.4, nicht der behauptete Totalverlust).
`text:page-count` (Gesamtseitenzahl) trifft dasselbe Verhalten und ist ein
**semantisch anderes** Feld (Non-Goal, Abschnitt 8; Grenzfall 11).

### 0.6 Kein Schreibpfad für Felder — *(und ein konkretes Regressionsrisiko bei der Umsetzung)*
- DOCX: `inlineToRuns()` (`src/formats/docx/writer.ts` Z. 41–67) kennt nur die Fälle
  `text` (Z. 53) und `hard_break` (Z. 60). Es gibt **kein** `else` — jeder andere
  Inline-Node wird **stillschweigend fallengelassen**.
- ODT: `inlineToOdt()` (`src/formats/odt/writer.ts` Z. 70–83) kennt nur `hard_break`
  (Z. 74) und `text` (Z. 75); alles andere ergibt `''` — ebenfalls stiller Wegfall.
- **Regressionsrisiko, das bei der Umsetzung zwingend zu beachten ist:** Wird das neue
  Feld-Atom (0.1/3.4) ins Schema aufgenommen, aber **einer** der beiden Inline-Serializer
  nicht erweitert, verschwindet das Feld beim Export in genau diesem Format **spurlos**.
  Beide Writer **und** das Schema-`toDOM`/`parseDOM` (für internes Kopieren/Einfügen über
  DOM, siehe 3.12) müssen den neuen Node kennen.

### 0.7 Bestehende Tests sichern *aktuell* das Degradierungs-Verhalten ab — *(Korrektur des „kein Test"-Befunds)*
Der frühere Entwurf behauptete, es gebe „keinen einzigen Treffer" für `fldSimple`,
`fldChar`, `text:page-number` o. Ä. Das ist **falsch**. Es existieren bereits Tests, die
das **heutige** „Text bleibt sichtbar"-Verhalten festschreiben:
- `src/formats/docx/__tests__/reader.test.ts` Z. 81: „keeps a simple field's cached
  result text visible (`<w:fldSimple>`)", Eingabe
  `<w:p><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>`,
  Assertion: der Text enthält „1".
- `src/formats/odt/__tests__/reader.test.ts` Z. 53: „keeps surrounding run text visible
  around a `<text:page-number>` field", Eingabe
  `Seite <text:page-number>1</text:page-number> von <text:page-count>5</text:page-count>`,
  Assertion: „Seite", „1", „von", „5" sind sichtbar; sowie Z. 63 ein kombinierter
  Feld-Test mit `<text:page-number>3</text:page-number>`.
- **Folge für die Umsetzung:** Diese Tests prüfen nur „Ziffer irgendwo im Klartext
  vorhanden" — nach Einführung des Feld-Nodes bleiben sie grün, **falls** dessen
  `leafText` den Cache-Wert liefert (0.1). Sie sind aber **kein** Nachweis, dass aus dem
  PAGE-Feld ein echtes Feld wurde. Sie müssen daher erweitert/ersetzt werden, sodass sie
  gezielt auf den Feld-Node prüfen (nicht nur auf das Vorhandensein der Ziffer). Der
  `page-count`/NUMPAGES-Anteil bleibt bewusst statischer Text (Non-Goal, Abschnitt 8).

### 0.8 Reale Test-Fixtures sind **bereits vorhanden** — *(Korrektur des „nicht vorhanden"-Befunds)*
Der frühere Entwurf behauptete, geeignete reale Dateien seien „laut Repo-Durchsicht nicht
vorhanden" und müssten erst erzeugt werden. **Falsch.** Unter
`tests/fixtures/external/{docx,odt}/` liegen zahlreiche geeignete reale Dateien; ihr
Inhalt wurde für diese Datei per Entpacken (`unzip -p … | grep -oE`) direkt gegen die
tatsächlichen ZIP-Inhalte **gezählt** (nicht aus Dateinamen erraten). Bemerkenswert: Bei
**allen** gefundenen DOCX-Fixtures sitzt das PAGE-Feld in einem **Kopf-/Fußzeilen-Part**
(`header*.xml`/`footer*.xml`) — genau der für dieses Feature relevante Ort.

| Datei | Verifizierter Inhalt (Part) | Rolle im Testplan |
|---|---|---|
| `docx/FancyFoot.docx` | `footer1.xml`: **1× `w:fldSimple` `w:instr=" PAGE   \* MERGEFORMAT "`** | `w:fldSimple`-Form **mit Schalter**, in echter Fußzeile — Haupt-Positivfall fldSimple (3.6) |
| `docx/PageSpecificHeadFoot.docx` | `footer1.xml`: **1× `w:fldSimple` `w:instr=" PAGE  \* MERGEFORMAT "`** | zweiter `w:fldSimple`-Beleg, Fußzeile |
| `docx/60316.docx` | `footer2.xml`: **2× `w:fldChar`-Quadruple ` PAGE `** (0× fldSimple) | sauberer `w:fldChar`-Positivfall ohne Schalter |
| `docx/Bug54771a.docx` | `footer1.xml`: **1× `w:fldChar` ` PAGE   \* MERGEFORMAT `** | `w:fldChar`-Form **mit Schalter** (3.6, Toleranz gegen `\* MERGEFORMAT`) |
| `docx/bug57031.docx` | `footer2.xml`: **1× `w:fldChar` ` PAGE   \* MERGEFORMAT `** | zweiter `w:fldChar`-mit-Schalter-Beleg |
| `docx/WordWithAttachments.docx` | `header1.xml` **und** `header2.xml`: je **1× `w:fldChar` `PAGE  `** | PAGE-Feld in der **Kopfzeile** (nicht Fußzeile) |
| `docx/Bug51170.docx` | `footer1.xml` **und** `footer2.xml`: je **1× `w:fldChar` `PAGE  `** | PAGE in zwei verschiedenen Fußzeilen einer Datei |
| `docx/60329.docx` | `footer1.xml`: **1× `PAGE ` + 1× `NUMPAGES `** (fldChar); zusätzlich 85× `<w:br/>`, 1× `lastRenderedPageBreak` (aus `seitenumbruch-req.md` 0.10) | **PAGE ≠ NUMPAGES**-Abgrenzung (Grenzfall 11) |
| `docx/Bug60341.docx` | `footer.xml`: **1× `PAGE ` + 1× `NUMPAGES  `** (fldChar) | zweiter PAGE+NUMPAGES-Beleg |
| `docx/MultipleBodyBug.docx` | `footer1.xml`: **1× ` PAGE ` + 1× ` NUMPAGES `** (fldChar) | dritter PAGE+NUMPAGES-Beleg |
| `odt/fields.odt` | `styles.xml` (Master-Page-Kopf/Fuß): **1× `text:page-number` + 1× `text:page-count`**¹ | ODT-Positivfall im Kopf-/Fußzeilen-Kontext **und** page-number/-count-Abgrenzung |
| `odt/sample.odt` | `styles.xml`: **1× `text:page-number`** | sauberer ODT-page-number-Positivfall (Kopf/Fuß) |
| `odt/sample_numbering_DOC_LO41.odt` | `styles.xml`: **1× `text:page-number` + 1× `text:page-count`** | zweiter ODT-Beleg mit beiden Feldtypen |
| `odt/odf-fields.odt` | `content.xml` (**Fließtext**): **1× `text:page-number` + 2× `text:page-count`** | Grenzfall: Seitenzahl-Feld **im Body**, nicht in Kopf-/Fußzeile (Grenzfall 1) |

¹ **Konkret nachgeprüft per Entpacken (nicht nur Dateiname/Zähler):** Das `<text:page-number>`
in `fields.odt`s Kopfzeile ist **selbstschließend und ohne Cache-Ziffer**
(`<text:page-number text:select-page="current"/>`), eingebettet in ein reales
„Seite … von …"-Muster: `<text:span>Seite </text:span><text:span><text:page-number
text:select-page="current"/></text:span><text:span> von </text:span><text:span>
<text:page-count style:num-format="1">1</text:page-count></text:span>`. Das unterscheidet
sich von `sample.odt`/`sample_numbering_DOC_LO41.odt`/`odf-fields.odt`, deren
`<text:page-number>` jeweils eine Cache-Ziffer als Textinhalt trägt
(`<text:page-number …>1</text:page-number>`). Beide Formen sind reales, gültiges ODF —
siehe 3.8 (neue Teilanforderung) und Grenzfall 20.

Weitere ODT-Dateien mit `text:page-number` in der Master-Page (`bulletListTest.odt`,
`fixedParagraphSize.odt`, `damaged.odt`, `error-ox.odt`, `compdocfileformat.odt`,
`excelfileformat.odt`, `nestedFrames.odt`, `test1.odt`, `tableComplex_DOC_LO41.odt`,
`table-within-textBox-within-frame.odt`) existieren zusätzlich und können als
Robustheits-Eingaben dienen. **Die Fixture-Anforderung ist damit ohne neue Dateien
erfüllbar** und im Testplan (Abschnitt 6) und in der Rundreise (Abschnitt 5) namentlich
zu verwenden. Rein synthetisch konstruiertes Test-XML allein genügt nicht, um reale
Word-/LibreOffice-Eigenheiten (insbesondere die `w:fldChar`-Quadruple-Form und die
Master-Page-Verortung in ODT) abzudecken.

### 0.9 Ikonografie der Toolbar (Kontext für Abschnitt 1)
Nur der Ausschneiden-Button nutzt ein eingebettetes SVG (`ScissorsIcon`, `Toolbar.tsx`
Z. 33–53). Alle übrigen Symbole sind Unicode-/Emoji-Zeichen (`⊞ Tabelle`, `🖼 Bild`,
`🖍`, `⌫`, `⇤ ↔ ⇥ ≡`) — genau das in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 gerügte
Rendering-Risiko. Ein neuer Seitenzahl-Button ist deshalb als **SVG** auszuführen (1, Zeile 1).

### 0.10 Konsequenz
Der Backlog-Status „fehlt" ist nach dieser Recherche **zutreffend**, aber präziser zu
fassen als im früheren Entwurf: Es fehlt (a) die Einfüge-Funktion selbst (Schema-Node,
Command, Toolbar-Button, Feldschattierung), (b) ihre zwingende Voraussetzung (bedienbare
Kopf-/Fußzeile, 0.2) **und** (c) ein korrekter Lese-/Schreibpfad — der bestehende
Lesepfad degradiert reale Felder still zu eingefrorenem, auf Folgeseiten falschem Literal
(0.4/0.5), der Schreibpfad kann Felder gar nicht erzeugen (0.6). Neu bzw. korrigiert zu
bauen sind: Schema-Erweiterung (markfähiges Inline-Atom mit `leafText`), Command,
SVG-Toolbar-Button, DOCX-Writer **und** -Reader (beide OOXML-Formen), ODT-Writer **und**
-Reader (`text:page-number`), Feldschattierung, sowie die Erweiterung/Ersetzung der
bestehenden Reader-Tests aus 0.7.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Button „Seitenzahl einfügen" | Klick, während der Fokus in einem Kopf-/Fußzeilenbereich liegt | **Fehlt komplett** in `Toolbar.tsx`; es gibt aktuell nicht einmal einen Kopf-/Fußzeilenbereich (0.2) | Ergänzen — sinnvollerweise in einer **kontextabhängigen** Werkzeugleiste, die nur aktiv/sichtbar ist, wenn der Fokus in Kopf-/Fußzeile liegt. **Eindeutiges, eingebettetes SVG-Icon** (kein Unicode/Emoji, 0.9). **Zugänglicher Name** („Seitenzahl einfügen") per `title` **und** `aria-label` — identisch nutzbar für Screenreader **und** E2E-Adressierung (`getByRole('button', { name: 'Seitenzahl einfügen' })`). |
| 2 | Bequemer Einstieg aus der Haupt-Toolbar (analog Word „Einfügen → Seitenzahl"), auch wenn noch keine Fußzeile aktiv ist | Klick | Nicht anwendbar — keine Fußzeilen-Aktivierung vorhanden | **Nice-to-have, kein Blocker.** Falls umgesetzt: Klick aktiviert automatisch eine Standard-Fußzeile (Abhängigkeit zu `fusszeile-bearbeiten`) und fügt das Feld dort ein. Andernfalls muss der Button sichtbar **deaktiviert** bleiben, solange kein Kopf-/Fußzeilenbereich fokussiert ist — nie ein wirkungsloser Klick (3.15). |
| 3 | Positionswahl (links/mittig/rechts) der Seitenzahl | Wiederverwendung der bestehenden Absatz-Ausrichtung auf dem Kopf-/Fußzeilenabsatz | Nicht anwendbar | **Kein neuer Mechanismus nötig:** die vorhandenen `AlignButton` (`FEATURE-SPEC` Abschnitt 4) auf dem Kopf-/Fußzeilenabsatz genügen. Eine dedizierte Schnellauswahl ist nice-to-have. |
| 4 | Sichtbare Feldschattierung im Editor | — (reine Darstellung) | **Fehlt** — keine visuelle Unterscheidung zwischen dynamischem Feld und getipptem Text | Muss visuell **und per DOM-Attribut** als Feld erkennbar sein (z. B. dezent grauer Hintergrund analog Word-Feldschattierung), damit die Nutzerin ein Feld von editierbarem Text unterscheiden und gezielt anklicken/entfernen kann. |
| 5 | Löschen eines Feldes | Cursor davor/danach + Entf/Backspace, oder Feld markieren | Nicht anwendbar | Als **atomare Einheit** löschbar (wie `image` heute `selectable`), niemals in ein korruptes Text-Fragment zerfallend (3.11). |
| 6 | Kontextmenü-Eintrag (Rechtsklick im Kopf-/Fußzeilenbereich) | Rechtsklick → „Seitenzahl einfügen" | Fehlt; der Editor hat bewusst kein eigenes Kontextmenü (`WordEditor.tsx` Z. 117–121) | **Nice-to-have, kein Blocker.** |
| 7 | Zeichenformatierung des Feldes (fett, Farbe, …) | Bestehende Zeichenformat-Toolbar auf markiertes Feld/umgebenden Text | Nicht anwendbar | Muss identisch zu normalem Text funktionieren (3.10). |
| 8 | „Seitenzahl formatieren/Startwert" (1,2,3 vs. i,ii,iii, Startzahl) | — | Fehlt; eigener Backlog-Slug `seitenzahl-format` (Prio 3, Backlog Z. 256) | **Außerhalb dieses Tickets** (Abschnitt 8). |
| 9 | „Seite X von Y" (Gesamtseitenzahl, `NUMPAGES`/`text:page-count`) | — | Fehlt; **kein eigener Backlog-Slug** | **Außerhalb dieses Tickets** (Abschnitt 8); beim Import nicht mit der einfachen Seitenzahl verwechseln (Grenzfall 11). |
| 10 | Voraussetzung „Kopfzeile/Fußzeile bearbeiten" | — | Fehlt komplett (Slugs `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`, beide Prio 1, beide ohne UI, 0.2) | **Harte Abhängigkeit** dieses Tickets (3.1, Abschnitt 6 Punkt 6). |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht `FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- **Abschnitt 9** („Kopf- und Fußzeilen"): „Seitenzahl als Feld einfügbar (aktualisiert
  sich mit tatsächlicher Seitenzahl beim Export, mindestens als korrektes Word/ODF-Feld,
  das die Zielanwendung selbst berechnet)." — die Kernanforderung, die diese Datei im
  Detail spezifiziert. Dort ebenfalls vermerkt: „es gibt noch keinen UI-Weg, eine
  Kopf-/Fußzeile über den Editor selbst zu erstellen/bearbeiten — das ist eine fehlende
  Funktion, kein reiner Test-Gap" (durch 0.2 konkret bestätigt).
- **Abschnitt 17**, Zeile 8: „Kopf-/Fußzeile bearbeiten — fehlt komplett in der UI — neu
  zu bauen."
- **Abschnitt 18** (Import-Robustheit): „kein stiller Datenverlust bei nicht vollständig
  unterstützten Elementen". Der bestehende Fallback erfüllt das für den **Text** (0.4/0.5:
  die Ziffer bleibt sichtbar), verletzt aber die **Feldsemantik** (das dynamische Feld
  wird zu einem eingefrorenen, auf Folgeseiten falschen Literal) — genau das ist zu
  beheben, ohne die bestehende „Text bleibt sichtbar"-Garantie zu brechen (Abschnitt 5.1).
- **Abschnitt 19** (Export-Robustheit & Rundreise) und **Abschnitt 20.4** (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- **Abschnitt 2** (Selection-Sync-Bug): Das Einfügen eines Inline-Elements an der
  Cursor-Position ist dort Hauptverdachtsfall; ein Seitenzahl-Feld ist strukturell genau
  das und muss mit derselben Regressionssequenz getestet werden (Grenzfall 5), sobald ein
  Kopf-/Fußzeilen-Editierbereich existiert.
- **Abschnitt 16** (Dokumentmetadaten) als methodisches Vorbild: dort wurde ebenfalls
  festgestellt, dass ein laut Datenmodell „vorhandenes" Feld (Titel) in der UI nicht
  setzbar ist — dieselbe Kategorie Lücke wie hier (Datenmodell/Reader/Writer vs.
  tatsächlich bedienbare Funktion).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Voraussetzung: bedienbarer Kopf-/Fußzeilenbereich (harte Abhängigkeit)
- Diese Funktion setzt voraus, dass ein Kopf- und/oder Fußzeilenbereich im Editor
  existiert, aktivierbar ist und einen eigenen, fokussierbaren Editierbereich (eigene
  ProseMirror-Instanz oder eigener Teilbaum mit eigenem Cursor) bereitstellt — Gegenstand
  der Slugs `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`.
- Diese Datei legt den **minimalen Vertrag** fest, den jene Abhängigkeit erfüllen muss:
  ein aktiver, fokussierter Absatz-Kontext innerhalb von `header`/`footer`, in den ein
  Inline-Node eingefügt werden kann, sowie eine Möglichkeit für die Toolbar, zuverlässig
  zu erkennen, ob der Fokus in einem solchen Bereich liegt (für Sichtbarkeit/Aktivierung
  des Buttons, 1, Zeile 1).
- Diese Datei **baut** diesen Editierbereich nicht selbst, verlangt aber ausdrücklich,
  dass „Seitenzahl einfügen" nicht als „vorhanden" gilt, solange die Voraussetzung fehlt
  (Abschnitt 7).

### 3.2 Grundfall: Einfügen an der Cursor-Position (keine Selektion)
- Das Feld wird **exakt an der Cursor-Position** innerhalb des Kopf-/Fußzeilenabsatzes
  eingefügt, nicht an zufälliger Stelle.
- Nach dem Einfügen steht der Cursor unmittelbar **hinter** dem Feld, bereit zum
  Weitertippen (z. B. „Seite " davor, „ von …" danach).

### 3.3 Einfügen über eine bestehende Selektion
- Eine vorhandene Selektion im Kopf-/Fußzeilenbereich wird durch das Feld **ersetzt**
  (nicht ergänzt) — Standardverhalten wie bei anderen Inline-Einfügungen (vgl.
  `insertImage` in `commands.ts` Z. 66–74, das über `replaceSelectionWith` einfügt).

### 3.4 Datenmodell-Repräsentation
- Neuer **Inline-Atom-Node** im gemeinsamen Schema (`schema.ts`), z. B.
  `page_number_field`, mit `group: 'inline', inline: true, atom: true, selectable: true`.
- Der Node hat **keinen** editierbaren, direkt eintippbaren Ziffern-Inhalt — die
  angezeigte Zahl ist ein berechneter Anzeigewert. Ein optionales Attribut für einen rein
  kosmetischen Cache-/Vorschauwert (`cachedValue: string`) ist zulässig, darf aber intern
  nie als maßgeblicher, eingefrorener Wert behandelt werden (3.5/3.7).
- Der Node muss **`leafText`** definieren (z. B. `() => attrs.cachedValue ?? ''`), sonst
  behandelt jede Klartext-Extraktion/das Klartext-Clipboard ihn als leeren String und
  benachbarte Wörter verschmelzen (0.1; analog `hard_break.leafText`).
- Der Node muss **Marks tragen** können (fett/kursiv/Farbe, perspektivisch
  Schriftart/-größe). Das ist gegenüber den bestehenden Inline-Blättern (`image` ist
  markloser Block, `hard_break` markfrei) neues Terrain und bewusst zu modellieren.
- `toDOM`/`parseDOM` sind so zu definieren, dass internes Kopieren/Einfügen (ProseMirror
  serialisiert über DOM desselben Schemas) das Feld erhält (3.12).

### 3.5 Export nach DOCX
- Serialisierung als echtes, in Word aktualisierbares Feld — eine der beiden zulässigen
  OOXML-Formen ist bewusst zu wählen und im Code zu begründen:
  - `<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple>`, oder
  - das vollständige `w:fldChar`-Quadruple (`begin` / `instrText PAGE` / `separate` /
    `<w:t>1</w:t>` / `end`) — die von echtem Word überwiegend erzeugte Form.
- **Beide** müssen jedoch beim **Import** erkannt werden (3.6), unabhängig von der
  Export-Wahl.
- **`inlineToRuns()` muss um genau diesen Fall erweitert werden** — sonst fällt das Feld
  laut 0.6 beim Export still weg.
- Der eingebettete Cache-/Anzeigewert dient nur als Fallback für Betrachter, die Felder
  nicht selbst berechnen; er muss in Word ein **aktualisierbares Feld (F9)** bleiben,
  nicht eingefrorener Text.

### 3.6 Import aus DOCX
- **Beide** in 3.5 genannten Formen (`w:fldSimple` **und** `w:fldChar`-Quadruple) müssen
  erkannt und in den internen Feld-Node überführt werden.
- Der Feldcode (`w:instr` bzw. `w:instrText`) ist tolerant gegen Whitespace und gängige
  Word-Schalter auszuwerten: ` PAGE `, `PAGE  `, `PAGE \* MERGEFORMAT`, `PAGE \* Arabic`,
  `PAGE \* ROMAN` → erkannt wird „PAGE-Feld"; die Schalter dürfen **nicht** als sichtbarer
  Text landen (reale Belege für Schalter: `Bug54771a.docx`, `bug57031.docx`,
  `FancyFoot.docx`, `PageSpecificHeadFoot.docx`, 0.8).
- **Explizit zu beheben (0.4):** Der `<w:t>`-Run zwischen `separate` und `end` (bzw. der
  innere `<w:r>` einer `w:fldSimple`) darf nicht mehr als eigenständiger, statischer Text
  gelesen werden — er ist Teil des Feldes.
- **`PAGE` ist strikt von `NUMPAGES` zu unterscheiden** — ein `NUMPAGES`-Feld
  (Gesamtseitenzahl, Non-Goal) darf nicht auf den Seitenzahl-Node abgebildet werden. Reale
  Belege mit beidem in einer Fußzeile: `60329.docx`, `Bug60341.docx`, `MultipleBodyBug.docx`
  (0.8; Grenzfall 11).
- **Verschachtelte Feldcodes (`{ IF { PAGE } … }` u. Ä.):** Ein `w:fldChar`-`begin` kann
  einen weiteren `begin` einschließen. Der erste erkannte `instrText`-Token entscheidet;
  ist er nicht `PAGE` (z. B. `IF`), bleibt der zwischengespeicherte Anzeigewert als
  statischer Text erhalten (verlustfreie Degradierung, kein Absturz, kein durchsickernder
  Feldcode). Ein echtes verschachteltes reines PAGE-Feld ist in keiner verifizierten
  Fixture vorhanden und Non-Goal (Abschnitt 8); die Erkennung darf daran nicht scheitern.
- **Feld über Absatzgrenzen hinweg (`begin` in einem `<w:p>`, `end` in einem anderen):**
  Word erlaubt technisch Felder, die eine Absatzmarke überspannen. Da die Faltung
  absatzweise erfolgt (ein `<w:p>` = ein interner Absatz), ist ein solches gespaltenes
  Feld **nicht** garantiert als ein Feld rekonstruierbar. **Erwartetes Verhalten:** kein
  Absturz, kein durchsickernder Feldcode/Schaltertext; der sichtbare Cache-Wert bleibt
  mindestens als statischer Text erhalten (Grenzfall 18). In keiner verifizierten Fixture
  belegt; als dokumentierte Vereinfachung geführt, nicht als Blocker.

### 3.7 Export nach ODT
- Serialisierung als `<text:page-number>N</text:page-number>` innerhalb des
  Kopf-/Fußzeilenabsatzes — identisch zu dem Element, das LibreOffice Writer bei
  „Einfügen → Kopf-/Fußzeile → Seitenzahl" erzeugt. `N` ist nur Cache-/Vorschauwert.
- **`inlineToOdt()` muss um genau diesen Fall erweitert werden** (0.6).
- Aktive Marks werden wie bei normalem Text in einen umschließenden `<text:span>`
  übersetzt (vgl. `inlineToOdt` Z. 76–78).

### 3.8 Import aus ODT
- Ein `<text:page-number>`-Element muss erkannt und in den internen Feld-Node überführt
  werden — statt (wie heute, 0.5) über den generischen Fallback nur seinen Cache-Text zu
  übernehmen. Reale Belege: `fields.odt`, `sample.odt`, `sample_numbering_DOC_LO41.odt`,
  `odf-fields.odt` (0.8).
- `<text:page-count>` (Gesamtseitenzahl) ist ein **eigenständiges, anderes** Feld
  (Non-Goal, Abschnitt 8) und darf **nicht** mit `<text:page-number>` verwechselt bzw. auf
  denselben Node abgebildet werden — eine Verwechslung erzeugte ein Dokument, das dauerhaft
  die Gesamtseitenzahl statt der laufenden Seitenzahl anzeigt.
- **ODF-Modifikatoren `text:select-page` und `text:page-adjust`:** Ein `<text:page-number>`
  kann `text:select-page="previous"|"current"|"next"` tragen (Seitenzahl der vorherigen/
  aktuellen/nächsten Seite — häufig in „Fortsetzung auf Seite …"-Konstruktionen) sowie
  `text:page-adjust="N"` (fester Offset auf die berechnete Zahl). Der Export schreibt
  bewusst `text:select-page="current"` ohne Offset (3.7). Beim **Import** wird jedes
  `<text:page-number>` unabhängig von diesen Modifikatoren als laufende Seitenzahl erkannt;
  `previous`/`next`/`page-adjust` werden dabei als **dokumentierte Vereinfachung** auf
  „aktuelle Seitenzahl" reduziert. **Pflicht:** kein Absturz, sichtbarer Cache-Wert bleibt
  erhalten (Grenzfall 17). Eine getreue Abbildung dieser Modifikatoren ist Non-Goal
  (Abschnitt 8).
- **Selbstschließendes `<text:page-number/>` ohne Cache-Ziffer** (real belegt in
  `fields.odt`, Kopfzeile, 0.8 Fußnote 1 — Gegenbeispiel zu den übrigen Fixtures, deren
  `<text:page-number>` stets eine Textziffer enthält): Der Reader darf **nicht** davon
  ausgehen, dass das Element zwingend einen Textknoten als Kind hat. Erkennung als
  Seitenzahl-Feld erfolgt über den **Elementnamen**, nicht über das Vorhandensein einer
  Ziffer; fehlt die Ziffer, ist der interne Feld-Node mit leerem/undefiniertem
  `cachedValue` zulässig (kein Absturz, keine erfundene Ziffer). Siehe Grenzfall 20.

### 3.9 Anzeige im Live-Editor (WYSIWYG)
- `header`/`footer` sind im Datenmodell **ein einziges, geteiltes Template**
  (`documentModel.ts` Z. 5–6: je ein `ProseMirrorJSON | null`, kein „je Seite eine
  Instanz"). Der Editor kann daher im laufenden Betrieb keine pro Simulationsseite
  unterschiedliche Zahl anzeigen.
- **Mindestanforderung (Pflicht):** Das Feld ist im Editor visuell eindeutig als Feld
  erkennbar (1, Zeile 4) und zeigt einen plausiblen Platzhalterwert (z. B. „1").
- **Offener, zu dokumentierender Punkt (kein Blocker, analog `FEATURE-SPEC` Abschnitt 8):**
  ob der Live-Editor über mehrere simulierte Seiten hinweg hochzählende Werte zeigt, hängt
  vom künftigen Ausbau der Kopf-/Fußzeilen-Darstellung ab und ist getrennt von der
  zwingenden Anforderung zu behandeln, dass der **Export** in Word/LibreOffice korrekt
  hochzählt (3.5/3.7 — das berechnet die Zielanwendung selbst).

### 3.10 Formatierbarkeit
- Zeichenformatierung (fett, kursiv, unterstrichen, durchgestrichen, Farbe, perspektivisch
  Schriftart/-größe) muss auf das Feld genauso anwendbar sein wie auf normalen Text in
  Kopf-/Fußzeile — durch Markieren des Feldes selbst **und** durch Formatieren an der
  Schreibmarke unmittelbar davor mit anschließendem Einfügen.

### 3.11 Löschen
- Das Feld wird als atomares Inline-Element behandelt: Markieren + Entf/Backspace entfernt
  es vollständig in einem Schritt. Es darf zu keinem Zeitpunkt in ein korruptes Fragment
  (sichtbarer Rest wie „PAGE" oder eine hartkodierte Ziffer) zerfallen.
- Backspace/Entf mit Cursor unmittelbar davor/danach löscht ausschließlich das Feld, nicht
  zusätzlich benachbarten Text.

### 3.12 Kopieren/Einfügen
- Kopieren des Feldes (innerhalb desselben oder in einen anderen Kopf-/Fußzeilenbereich)
  und erneutes Einfügen erzeugt wieder ein **lebendiges** Feld, keinen hartkodierten
  Text-Schnappschuss. Das erfordert korrektes `toDOM`/`parseDOM` (3.4) und ein sinnvolles
  Klartext-`leafText` (0.1) für den Klartext-Clipboard-Pfad
  (`clipboardTextSerializer`, `WordEditor.tsx` Z. 124).

### 3.13 Undo/Redo
- Einfügen des Feldes ist **ein** Undo-Schritt; Löschen ebenfalls **ein** Undo-Schritt und
  stellt den exakten Vorzustand wieder her. Redo stellt den jeweils rückgängig gemachten
  Zustand identisch wieder her.

### 3.14 Zusammenspiel mit der automatischen Paginierung (`pagination.ts`)
- Die rein DOM-höhenbasierte Paginierung (`src/formats/shared/editor/pagination.ts`, vgl.
  `FEATURE-SPEC` Abschnitt 8, `seitenumbruch-req.md` 3.8) betrifft nur den Hauptinhalt
  (`body`). Das Zusammenspiel mit einem Kopf-/Fußzeilen-Seitenzahlfeld ist zu klären und zu
  dokumentieren, sobald ein Kopf-/Fußzeilen-Editierbereich existiert — insbesondere, ob/wie
  die Kopf-/Fußzeile auf jeder simulierten Seite überhaupt wiederholt wird (aktuell: gar
  nicht, 0.2).

### 3.15 Rückmeldeverhalten (kein stiller Fehlschlag)
- Wird der Button betätigt, während der Fokus **nicht** in einem Kopf-/Fußzeilenbereich
  liegt (und ist keine Auto-Aktivierung, 1 Zeile 2, umgesetzt), muss der Button sichtbar
  **deaktiviert** sein und/oder eine erklärende Rückmeldung (Tooltip/Hinweis) liefern —
  niemals ein ergebnisloser Klick.

---

## 4. Grenzfälle (müssen explizit befundet werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Seitenzahl-Feld im Haupttext (`body`, außerhalb jeder Kopf-/Fußzeile) — **einfügen** bzw. **importieren** | **Import:** ein reales PAGE-/`text:page-number`-Feld im Body muss ebenso erkannt werden (reale Evidenz: `odf-fields.odt`, page-number in `content.xml`, 0.8) — die Reader-Erkennung ist positionsunabhängig. **Einfügen über UI:** entweder generell nicht möglich (Button dort inaktiv, 3.15) oder — wie in echtem Word über „Einfügen → Feld → PAGE" — bewusst erlaubt; in jedem Fall konsistent dokumentiert, kein zufälliges Verhalten. |
| 2 | Klick auf „Seitenzahl einfügen", obwohl noch **kein** Kopf-/Fußzeilenbereich aktiv (`header`/`footer === null`) | Entweder automatisch Standardbereich anlegen (Abhängigkeit zu `kopfzeile-`/`fusszeile-bearbeiten`) oder Button bleibt bis zur manuellen Aktivierung deaktiviert — kein Crash, keine stille Nichtwirkung. |
| 3 | Mehrere Seitenzahl-Felder im selben Kopf-/Fußzeilenabsatz | Beide bleiben unabhängig erhalten, keine automatische Deduplizierung, kein Crash. |
| 4 | Feld unmittelbar neben Text ohne Leerzeichen („Seite" + Feld + „.") | Text und Feld bleiben getrennte, korrekt nebeneinanderstehende Einheiten, kein Verschmelzen zu einem Textlauf. |
| 5 | Feld einfügen, danach direkt weitertippen bzw. Selektion neu setzen und tippen (Selection-Sync-Regression, `FEATURE-SPEC` Abschnitt 2) | **Pflicht-Testsequenz**, sobald ein Kopf-/Fußzeilen-Editierbereich existiert: Einfügen darf die interne Selektion nicht inkonsistent machen; nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 6 | Einzelnes Zeichen am Feldrand löschen (Backspace/Entf) | Feld wird als Ganzes atomar gelöscht, nicht in ein Teilfragment zerlegt (3.11). |
| 7 | Feld kopieren, an anderer Stelle einfügen (selber/anderer Kopf-/Fußzeilenbereich) | Bleibt lebendiges Feld, keine Umwandlung in hartkodierten Text (3.12). |
| 8 | Import einer mit echtem Word erzeugten DOCX mit PAGE-Feld in `w:fldChar`-Quadruple-Form **inkl. `\* MERGEFORMAT`** | Als Seitenzahl-Feld erkannt, Schaltertext nicht sichtbar. **Ist-Zustand (0.4):** wird zu statischem „1" degradiert — zu beheben. Reale Fixtures: `Bug54771a.docx`, `bug57031.docx`. |
| 9 | Import einer mit echtem Word erzeugten DOCX mit PAGE-Feld in `w:fldSimple`-Form | Ebenfalls erkannt. **Ist-Zustand (0.4):** wird zu statischem „1" degradiert (nicht mehr Totalverlust wie im alten Entwurf behauptet) — zu beheben. Reale Fixtures: `FancyFoot.docx`, `PageSpecificHeadFoot.docx`. |
| 10 | Import einer mit echtem LibreOffice erzeugten ODT mit `<text:page-number>` | Erkannt. **Ist-Zustand (0.5):** wo eine Cache-Ziffer vorhanden ist, bleibt sie als statischer Text erhalten, Feldsemantik verloren — zu beheben. Reale Fixtures: `sample.odt` (Cache-Ziffer „1" vorhanden). **Sonderfall `fields.odt`:** dort ist `<text:page-number>` selbstschließend **ohne** Cache-Ziffer (0.8 Fußnote 1) — eigens in Grenzfall 20 behandelt. |
| 11 | Import einer Datei mit `NUMPAGES` (DOCX) bzw. `<text:page-count>` (ODT) — Gesamtseitenzahl, verwandtes, aber **anderes** Feld | Darf **nicht** als Seitenzahl-Feld interpretiert werden; definiertes Fallback (mindestens Textinhalt erhalten, kein stiller Verlust, aber keine falsche Feldbedeutung). Reale Fixtures: `60329.docx`, `Bug60341.docx`, `MultipleBodyBug.docx` (PAGE+NUMPAGES), `fields.odt`, `sample_numbering_DOC_LO41.odt` (page-number+page-count). |
| 12 | Cross-Format-Rundreise DOCX → ODT → DOCX bzw. ODT → DOCX → ODT | Feld bleibt über beide Konvertierungen ein aktualisierbares Feld — kein Abrutschen zu statischem Text, keine kumulative Verschlechterung. |
| 13 | Rückgängig (Strg+Z) direkt nach dem Einfügen | Feld verschwindet vollständig in einem Schritt, umgebender Text unverändert (3.13). |
| 14 | Formatierung (fett, Farbe) auf das Feld anwenden, danach Rundreise | Formatierung bleibt erhalten, Feld bleibt Feld (3.10). |
| 15 | Feld mit Cursor unmittelbar davor, Enter (neuer Absatz in Kopf-/Fußzeile) | Feld bleibt vollständig im ursprünglichen Absatz, kein Duplizieren, kein Verschwinden. |
| 16 | Dokument mit sehr vielen simulierten Seiten (> 20) | Beim Öffnen der exportierten Datei in Word/LibreOffice zeigt jede Seite die korrekte, unterschiedliche Zahl (Zielanwendung berechnet selbst); die Live-Editor-Darstellung ist gemäß 3.9 ein separat dokumentierter, nicht blockierender Punkt. |
| 17 | Import eines `<text:page-number>` mit `text:select-page="previous"`/`"next"` bzw. `text:page-adjust="N"` (ODF) | Wird als laufendes Seitenzahl-Feld erkannt; die Modifikatoren werden als **dokumentierte Vereinfachung** auf „aktuelle Seite, kein Offset" reduziert (3.8). Kein Absturz, sichtbarer Cache-Wert bleibt erhalten. |
| 18 | Import eines Word-Feldes, das eine Absatzgrenze überspannt (`begin` und `end` in verschiedenen `<w:p>`) bzw. eines verschachtelten Feldcodes (`{ IF { PAGE } … }`) | Kein Absturz, kein durchsickernder Feldcode/Schaltertext; der sichtbare Cache-Wert bleibt mindestens als statischer Text erhalten (verlustfreie Degradierung, 3.6). Nicht garantiert als **ein** Feld rekonstruierbar — dokumentierte Vereinfachung, kein Blocker. |
| 19 | Seitenzahl-Feld in einer **Tabellenzelle** innerhalb der Kopf-/Fußzeile (reales Word-Layout für „links Datum, rechts Seite X") | Feld bleibt der Zelle korrekt zugeordnet; Rundreise (beide Formate) erhält Zelle **und** Feld, keine Verschiebung in einen Nachbarabsatz, keine Degradierung zu Text. Erkennung ist positionsunabhängig (der Reader-Pfad für Zellabsätze nutzt denselben Run-Decode-Weg). |
| 20 | Import eines **selbstschließenden** `<text:page-number/>` **ohne** Cache-Ziffer, eingebettet in ein „Seite … von …"-Muster aus mehreren `text:span` (real belegt: `fields.odt`, Kopfzeile, 0.8 Fußnote 1) | Wird trotz fehlender Ziffer als Seitenzahl-Feld erkannt (Erkennung über Elementnamen, nicht über Textinhalt); kein Absturz, keine erfundene Ziffer. Die umgebenden Textteile („Seite ", " von ", die `<text:page-count>`-Ziffer) bleiben unabhängig davon erhalten — das ist bereits **heute** (vor diesem Feature) der Fall, da der generische ODT-Fallback (0.5) positionsunabhängig arbeitet, und darf durch die neue Funktion nicht regredieren (3.8, Abschnitt 5.1). |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Prüfungen — analog `seitenumbruch-req.md` Abschnitt 5
und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18/19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht brechen)
1. Reale Datei **ohne** jedes Seitenzahl-Feld unverändert hochladen → sofort exportieren →
   reimportieren → es darf **kein** Feld neu erfunden/hinzugefügt werden.
2. Die bestehende „Text bleibt sichtbar"-Garantie für **out-of-scope** Felder darf nicht
   regredieren: Import einer Datei mit `NUMPAGES`/`text:page-count` → deren sichtbarer
   Zahlwert bleibt erhalten (kein neuer stiller Verlust). Pflicht-Fixtures: `60329.docx`,
   `Bug60341.docx`, `MultipleBodyBug.docx`, `fields.odt`, `sample_numbering_DOC_LO41.odt`.
3. Die bestehenden Reader-Tests aus 0.7 bleiben (ggf. angepasst, sodass sie den PAGE-Anteil
   als Feld-Node prüfen) **grün**.
4. Alle Prüfungen müssen weiterhin grün sein, nachdem Schema, Writer und Reader um die neue
   Funktion erweitert wurden (kein neuer Node darf beim reinen Reimport unbeteiligter
   Dateien ungewollt auftauchen).

### 5.2 Feature-Rundreise (Seitenzahl-Feld selbst)
Für jede Situation: Feld über Toolbar in einen aktiven Kopf-/Fußzeilenbereich einfügen →
als DOCX exportieren → reimportieren → Feld **und** Inhalt erhalten; **und** identisch als
ODT; **und** zusätzlich Cross-Format:

1. Neues Dokument, Fußzeile aktivieren, Feld einfügen → bleibt als Feld erkennbar (nicht zu
   Leerzeichen/statischem Text degradiert), Inhalt davor/danach unverändert.
2. Dasselbe in der Kopfzeile.
3. Dasselbe als ODT-Ursprungsdokument (Kopf- **und** Fußzeile).
4. Cross-Format DOCX → ODT → DOCX: Feld bleibt über beide Konvertierungen aktualisierbares
   Feld.
5. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
6. Feld kombiniert mit Text und Zeichenformatierung in derselben Fußzeile („Seite " + fett
   formatiertes Feld + „.") → Rundreise erhält Text, Formatierung **und** Feld.
7. Import einer **fremden, mit echtem Word erzeugten** DOCX mit PAGE-Feld — **beide**
   Encodings einzeln — unverändert exportieren, reimportieren → weiterhin Feld.
   Pflicht-Fixtures: `FancyFoot.docx`/`PageSpecificHeadFoot.docx` (`w:fldSimple`),
   `60316.docx`/`Bug54771a.docx`/`bug57031.docx` (`w:fldChar`), `WordWithAttachments.docx`
   (PAGE in der Kopfzeile).
8. Dasselbe mit einer **mit echtem LibreOffice erzeugten** ODT (`<text:page-number>`).
   Pflicht-Fixtures: `fields.odt`, `sample.odt`, `sample_numbering_DOC_LO41.odt`.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format sind zu dokumentieren
und akzeptabel; **das vollständige Verschwinden des Feldes, seine Degradierung zu
hartkodiertem Text oder der Verlust umgebenden Textinhalts sind es nicht** — weder in 5.1
noch in 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX:** interner Feld-Node → Writer erzeugt die gewählte Form
   (`w:fldSimple` **oder** `w:fldChar`-Quadruple) korrekt (0.6-Regression: Node darf nicht
   still wegfallen). Umgekehrt: **beide** legalen XML-Formen als Eingabe → Reader erzeugt
   jeweils den erwarteten Feld-Node, inkl. eines Tests **mit Schaltern** (`\* MERGEFORMAT`).
   Zusätzlich ein expliziter Regressionstest, dass der `<w:t>`-Run zwischen `separate` und
   `end` (bzw. der `w:fldSimple`-Innentext) **nicht** mehr eigenständiger, statischer Text
   ist (Absicherung von 0.4).
2. **Unit-Tests DOCX-Abgrenzung:** `NUMPAGES` wird **nicht** als Seitenzahl-Feld erkannt
   (Grenzfall 11), sein sichtbarer Wert bleibt aber erhalten. Pflicht-Fixtures `60329.docx`,
   `Bug60341.docx`, `MultipleBodyBug.docx`.
3. **Unit-Tests ODT:** interner Feld-Node → Writer erzeugt `<text:page-number>` (0.6);
   Reader: `<text:page-number>` → Feld-Node (Absicherung von 0.5); `<text:page-count>` wird
   **nicht** als Seitenzahl-Feld interpretiert.
4. **Bestehende Tests anpassen:** die Tests aus 0.7 (`docx/reader.test.ts` Z. 81,
   `odt/reader.test.ts` Z. 53/63) so erweitern/ersetzen, dass sie den PAGE-Anteil gezielt
   als **Feld-Node** prüfen — nicht nur, dass die Ziffer irgendwo im Klartext steht.
5. **E2E-Test (Playwright):** sobald ein Kopf-/Fußzeilen-Editierbereich existiert — Cursor
   in Fußzeile setzen, Button per `getByRole('button', { name: 'Seitenzahl einfügen' })`
   klicken → im DOM erscheint ein sichtbares, optisch **und per DOM-Attribut** als Feld
   erkennbares Element; Dokument exportieren (echter Download), erneut hochladen (echter
   Re-Upload) → Feld weiterhin vorhanden.
6. **Blocker-Hinweis:** Die E2E-Tests aus Punkt 5 können erst grün werden, nachdem
   `kopfzeile-`/`fusszeile-bearbeiten` einen echten, fokussierbaren Editier-Einstiegspunkt
   bereitstellen (0.2, 3.1). Bis dahin sind die Unit-Tests aus 1–4 gegen Reader/Writer
   möglich und bereits aussagekräftig genug, um den in 0.4/0.5 verifizierten
   Degradierungs-Fehler zu beheben.
7. **Regressionstest-Pflicht (Selection-Sync):** jeder E2E-Test aus Punkt 5 führt
   unmittelbar danach eine Tipp-/Formatierungsaktion aus und prüft deren korrektes Ergebnis
   (Grenzfall 5, `FEATURE-SPEC` Abschnitt 2).
8. **Reale Fixtures sind vorhanden** (0.8) und namentlich zu verwenden — es müssen **keine**
   neuen Word-/LibreOffice-Dateien erzeugt werden. Rundreise-Tests (Abschnitt 5) sind
   sowohl als Unit-Tests gegen Reader/Writer **als auch** — sobald 3.1 erfüllt ist — als
   E2E über echte Bedienung zu führen; reine JSON-Fixtures allein genügen nicht (vgl.
   `FEATURE-SPEC` Abschnitt 17/21).

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenzahl-einfuegen` darf erst als **vorhanden** (unqualifiziert)
gelten, wenn:

- die Abhängigkeit aus 3.1 (bedienbarer Kopf-/Fußzeilenbereich) erfüllt ist — d. h.
  `kopfzeile-bearbeiten` und/oder `fusszeile-bearbeiten` mindestens so weit umgesetzt sind,
  dass ein Feld dort per UI eingefügt werden kann,
- alle Bedienelemente aus Abschnitt 1 existieren und funktionieren (SVG-Button mit
  zugänglichem Namen, Feldschattierung, atomares Löschen, Formatierbarkeit),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind — einschließlich der
  Regressionstests für die in 0.4/0.5 verifizierte Degradierung (DOCX beide Encodings, ODT
  `text:page-number`) und der PAGE-≠-NUMPAGES-/page-count-Abgrenzung,
- der in 0.6 beschriebene Writer-Wegfall nicht eintritt (Feld überlebt Export in **beiden**
  Formaten),
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert /
  bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline) durch die neue Funktion nicht gebrochen wurde (inkl. „Text
  bleibt sichtbar" für out-of-scope-Felder und der angepassten Bestandstests aus 0.7),
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide Cross-Format-Richtungen besteht,
  inklusive der realen Fixtures aus echtem Word/LibreOffice (0.8),
- der Selection-Sync-Regressionstest (`FEATURE-SPEC` Abschnitt 2) explizit mit einer
  Seitenzahl-Feld-Einfüge-Sequenz nachgestellt und grün ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden Teilpunkte
sind hier nachzutragen (analog `FEATURE-SPEC` Abschnitt 17/21 und `seitenumbruch-req.md`
Abschnitt 7).

---

## 8. Non-Goals (bewusst außerhalb dieses Tickets)

- **Seitenzahlformat/Startwert** (arabisch/römisch/Buchstaben, Startzahl) — eigener
  Backlog-Slug `seitenzahl-format`, Priorität 3 (Backlog Z. 256). Diese Datei verlangt nur
  ein einfaches PAGE-Feld im Standardformat.
- **„Seite X von Y" (Gesamtseitenzahl, `NUMPAGES`/`text:page-count`)** — kein eigener
  Backlog-Slug; nicht verlangt, muss beim Import aber sauber von der einfachen Seitenzahl
  unterschieden werden (Grenzfall 11), damit ein künftiges Ticket dafür nicht durch eine
  falsche Vorfestlegung blockiert wird.
- **Getreue Abbildung der ODF-Modifikatoren `text:select-page="previous"/"next"` und
  `text:page-adjust`** sowie verschachtelter/absatzübergreifender Word-Felder — beim Import
  bewusst auf die einfache laufende Seitenzahl reduziert (3.6/3.8, Grenzfälle 17/18); kein
  stiller Verlust, aber keine originalgetreue Rekonstruktion. Eine spätere Beauftragung
  darf durch keine falsche Node-Vorfestlegung blockiert werden (analog `page-count`).
- **„Erste Seite anders" / „Gerade/ungerade Seiten anders"** — eigene Backlog-Slugs
  `erste-seite-anders` (Prio 3, Z. 253), `gerade-ungerade-anders` (Prio 4, Z. 254);
  betreffen unterschiedliche Kopf-/Fußzeilen-Inhalte je Seite, nicht das Feld selbst.
- **Bau von `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` selbst** — diese Datei
  spezifiziert nur den minimalen Vertrag (3.1), baut die Funktion aber nicht; sie sind
  eigene Backlog-Einträge mit eigenem Abnahmekriterium.
