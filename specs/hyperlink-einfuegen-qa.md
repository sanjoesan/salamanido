# Testplan „Hyperlink einfügen" (inkl. Bearbeiten/Entfernen) — QA-Verifikation

Gegenstück zu `specs/hyperlink-einfuegen-req.md` (Anforderung) und
`specs/hyperlink-einfuegen-code.md` (Umsetzungsplan). Legt fest, **welche
Tests** geschrieben werden, **wo** sie liegen, **wie** sie ausgeführt werden
und **wann** ein Punkt als abgehakt gilt. Zwei Ebenen, die sich ergänzen, aber
**keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar-Button,
   Strg+K-Shortcut, echtem Dialog, echtem Klickverhalten im Editor-DOM, echtem
   Datei-Upload und echtem Undo-Stack im Browser.
2. **Echte Playwright-Browser-Tests** — Klicks auf den tatsächlichen
   Toolbar-Button „Link einfügen", echte Tastatureingabe (`ControlOrMeta+k`,
   Tippen in die Dialogfelder, `Enter`/`Escape`), echter
   `input.setInputFiles()`-Upload, echter `page.waitForEvent('download')`-
   Export, Prüfung der **tatsächlich heruntergeladenen Datei** (nicht nur ein
   interner Aufruf von `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setLink`/
   `removeLink`/`sanitizeHref`).

Ein Test, der nur `readDocx(buffer)`/`writeOdt(doc)`/`setLink(...)`/
`sanitizeHref(...)` direkt aufruft, zählt **nicht** als Ebene 2, auch wenn er
in `tests/e2e/` liegt. Beide Ebenen sind laut `hyperlink-einfuegen-req.md`
Abschnitt 6 Testplan-Punkt 4/9 („E2E-Test (Playwright) … über echten
Datei-Upload … und echten Download-Abfangmechanismus, nicht nur über intern
aufgerufene Reader/Writer-Funktionen") Pflicht für die Abnahme.

Referenzierte reale Fixtures (alle bereits im Repo vorhanden, **kein**
künstliches Beispiel für den kritischen Regressionsnachweis nötig):

- ODT (6, alle unter `tests/fixtures/external/odt/`): `hyperlink.odt`,
  `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`,
  `hyperlink_destination.odt` (enthält laut `hyperlink-einfuegen-code.md`
  Abschnitt 1 entgegen des Namens **kein** `<text:a>` — reiner Crash-Test,
  siehe 1.7/2.19), `Hyperlink-AOO401.odt`,
  `invalid_simple_overlapping_hyperlinks.odt` (verschachtelte `<text:a>`,
  Dedup-Test).
- DOCX (aus den vorhandenen 127 Fixtures unter
  `tests/fixtures/external/docx/`, gemäß `hyperlink-einfuegen-code.md`
  Abschnitt 1 mit echtem `w:hyperlink` verifiziert): `rtl.docx` (RTL/Unicode-
  Linktext, kritischer Regressionsnachweis für Befund 0.4), `56392.docx`
  (`mailto:`-Link), `bug65738.docx` (sowohl `r:id`-Links als auch reine
  `w:anchor`-Links ohne `r:id` in derselben Datei — deckt Grenzfall 4.17
  ohne synthetisches Fixture ab). Restliche neun (`58618.docx`, `61991.docx`,
  `TestDocument.docx`, `WordWithAttachments.docx`, `bug59058.docx`,
  `bug65649.docx`, `delins.docx`, `drawing.docx`, `smarttag-snippet.docx`)
  laufen bereits über den bestehenden pauschalen Crash-Test in
  `docx/__tests__/external-fixtures.test.ts` mit.

Dieser Plan geht davon aus, dass die in `hyperlink-einfuegen-code.md`
Abschnitt 4/7 beschriebene Umsetzung (Schema-Mark `link`, Commands, Reader-
Fixes für Befund 0.4/0.5, Writer inkl. `RELATIONSHIP_TYPES.hyperlink` +
`TargetMode="External"` + `escapeXml`-Fix auf `Relationship.target`,
Standardoptik über referenzierte Zeichenformatvorlage statt Inline-Styling,
Toolbar-Button, Strg+K, `LinkDialog`, `linkClickPlugin`) **vor** dem finalen
grünen Lauf dieser Suite vorliegt.

**Klarstellung zu Befund 0.4/0.5 — kein Datenverlust-Bug (load-bearing, darf
nicht wieder verwischt werden):** `hyperlink-einfuegen-req.md` §0.4/§0.5 und
`hyperlink-einfuegen-code.md` §0/§1 stellen ausdrücklich und mehrfach richtig,
dass die beiden Reader den **sichtbaren Linktext schon heute vollständig
bewahren** (DOCX über `collectRuns`, das in `<w:hyperlink>` absteigt; ODT über
den `else`-Zweig in `walk`, der in `text:a` absteigt — empirisch an `rtl.docx`
bestätigt). Die **einzige** Lücke ist die **Ziel-URL** (`href`). Dieser Plan
darf die von beiden Vorgängerdokumenten korrigierte Fehlbehauptung „der Reader
verschluckt den Text" **nicht wieder einführen**. Test 1.1 ist deshalb **kein**
Datenverlust-Test: seine Text-Erhalt-Assertion ist **bereits heute grün** (und
belegt genau, dass kein Datenverlust vorliegt); **rot** ist vor dem Fix
ausschließlich die zusätzliche `href`-Assertion. Nach dem Fix sind beide grün.
Damit setzt dieser Plan Testplan-Punkt 1 / §6.1 der Anforderung („bestehende
Text-Erhalt-Tests **erweitern**, nicht ersetzen") korrekt um.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Hyperlink einfügen" (sowie sinngemäß
„Hyperlink bearbeiten"/„Hyperlink entfernen") laut Freigabekriterium
(Anforderung Abschnitt 7) als **vorhanden** gilt. Empfohlene Reihenfolge
(deckt sich mit `hyperlink-einfuegen-code.md` Abschnitt 7): zuerst Test 1.1
(Regressionsnachweis) **vor** jedem Fix schreiben und rot laufen lassen, dann
Reader/Writer/Schema/Commands gemäß Codeplan umsetzen, parallel die
zugehörigen Unit-Tests aus Abschnitt 1 grün ziehen, danach UI (Toolbar/Dialog/
Shortcut/Klickverhalten) umsetzen und Abschnitt 2 grün ziehen, abschließend
gemeinsamer Lauf beider Suiten.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeder
Reader-/Writer-Grenzfall aus Abschnitt 4 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`, `sanitizeHref`,
`normalizeHref`, `setLink`, `removeLink`, `linkRangeAt`,
`buildLinkDialogRequest`) — das ist hier ausdrücklich erlaubt und richtig,
weil sie durch die Playwright-Ebene (Abschnitt 2) ergänzt, nicht ersetzt wird.

### 1.1 Regressionstest zuerst: href-Erfassung für Befund 0.4 (DOCX) / 0.5 (ODT)

Testplan-Punkt 1 der Anforderung verlangt ausdrücklich, die
**Reader-`href`-Tests vor dem Fix zu schreiben** (TDD) und die bestehenden
Text-Erhalt-Tests dabei zu **erweitern, nicht zu ersetzen** (§6.1). Zwei neue,
minimale Tests laufen gegen eine handgebaute XML-Struktur. **Wichtig (siehe
Klarstellung oben):** Es wird **kein** Textverlust nachgewiesen — die
Text-Erhalt-Assertion ist **schon vor** dem Fix grün und beweist, dass kein
Datenverlust vorliegt; **rot** ist vor dem Fix ausschließlich die neue
`href`-Assertion. Jeder Test prüft daher **beide** Aspekte getrennt (Text
vorhanden / `href` vorhanden), damit rot/grün eindeutig der href-Lücke
zugeordnet ist.

| # | Datei | Testfall | Eingabe | Erwartung **vor** Fix | Erwartung **nach** Fix (dauerhafter Regressionsschutz) |
|---|---|---|---|---|---|
| 1 | `src/formats/docx/__tests__/hyperlink.test.ts` (neu) | `<w:hyperlink r:id>`: Text erhalten (heute), `href` fehlt (heute) | per JSZip gebaute Mini-DOCX mit `<w:p><w:hyperlink r:id="rId4"><w:r><w:t>Beispieltext</w:t></w:r></w:hyperlink></w:p>` **plus** passender `word/_rels/document.xml.rels` (`rId4` → `Target="https://example.com/ziel"`, `TargetMode="External"`) (analog `buildSampleDocx()`-Muster aus `tests/e2e/docx.spec.ts`) → `readDocx(blob)` | Text „Beispieltext" **ist vorhanden** (Text-Erhalt-Assertion **schon grün**, kein Datenverlust), aber **kein** `link`-Mark / **kein** `href` → Test rot **allein** wegen der fehlenden href-Assertion | Text „Beispieltext" vorhanden **und** trägt `link`-Mark mit `href="https://example.com/ziel"` (aus `rId4` über die Relationship-Map aufgelöst) |
| 2 | `src/formats/odt/__tests__/hyperlink.test.ts` (neu) | `<text:a xlink:href>`: Text erhalten (heute), `href` fehlt (heute) | handgebautes `content.xml` mit `<text:p><text:a xlink:href="http://www.heise.de/">Beispieltext</text:a></text:p>` → `readOdt(blob)` | Text „Beispieltext" **ist vorhanden** (Text-Erhalt-Assertion **schon grün**), aber **kein** `link`-Mark / **kein** `href` → Test rot **allein** wegen der fehlenden href-Assertion | Text „Beispieltext" vorhanden **und** trägt `link`-Mark mit `href="http://www.heise.de/"` |

Beide Tests werden **vor** dem jeweiligen Reader-Fix geschrieben
(`hyperlink-einfuegen-code.md` §4.11 DOCX-Reader / §4.15 ODT-Reader — **nicht**
§4.10/§4.14, das sind die Writer) und rot laufen gelassen: Beleg, dass die
href-Assertion fehlschlägt, **während** die Text-Erhalt-Assertion schon grün
ist (Befund 0.4/0.5, kein Datenverlust). Nach dem Fix sind beide grün und
bleiben als permanenter Regressionsschutz. Ergebnis (href-Assertion rot vor
Fix / alles grün nach Fix; Text-Assertion in **beiden** Läufen grün) wird hier
nachgetragen.

### 1.2 Neu: `src/formats/shared/__tests__/url.test.ts`

Reine Funktionsaufrufe, kein DOM/Editor.

| # | Funktion | Eingabe | Erwartung |
|---|---|---|---|
| 1 | `sanitizeHref` | `http://…`, `https://…`, `mailto:a@b.de`, `tel:+491234` | unverändert akzeptiert (String zurückgegeben) |
| 2 | `sanitizeHref` | `javascript:alert(1)`, `data:text/html,<script>...`, `vbscript:msgbox(1)`, `file:///etc/passwd` | `null` (Sicherheitsgrenzfall 4.9) |
| 3 | `sanitizeHref` | `JavaScript:alert(1)` (gemischte Groß-/Kleinschreibung) | `null` (Schema-Erkennung case-insensitive) |
| 4 | `sanitizeHref` | `beispiel.de` (kein Schema) | unverändert durchgereicht (Ablehnung ist Sache von `normalizeHref`/Dialog, nicht dieser Funktion) |
| 5 | `sanitizeHref` | leerer String, nur Whitespace | `null` |
| 6 | `normalizeHref` | `beispiel.de` | `https://beispiel.de` (Grenzfall „URL ohne Protokoll", §3.2/3.3) |
| 7 | `normalizeHref` | `mailto:a@b.de`, `tel:+491234` | unverändert (nicht fälschlich `https://`-präfigiert, Grenzfall 7) |
| 8 | `normalizeHref` | `#anker`, `/absoluter/pfad`, `../andere-datei.docx` | unverändert (Grenzfall „relative Pfade", §3.3) |
| 9 | `sanitizeHref` + `normalizeHref` zusammen | URL mit > 2000 Zeichen (Grenzfall 5) | keine Kürzung, kein Crash, exaktes Ergebnis erhalten |
| 10 | `sanitizeHref` + `normalizeHref` zusammen | URL mit Sonderzeichen (Leerzeichen, Umlaute, `&`, `"`) | Rohwert unverändert durchgereicht — Escaping ist Aufgabe der Writer (Grenzfall 6), nicht dieser Funktionen |

### 1.3 Neu: `src/formats/shared/editor/__tests__/linkCommands.test.ts`

Reine Zustands-/Transaktions-Unit-Tests gegen `commands.ts` (kein DOM/
Browser), analog zum Umfang bestehender Command-Unit-Tests. Ergänzt, ersetzt
aber nicht die Browser-Bestätigung derselben Fälle in Abschnitt 2, da erst
Ebene 2 beweist, dass Toolbar-Button/Dialog/Shortcut tatsächlich so reagieren.

| # | Testfall | Eingabe | Erwartung |
|---|---|---|---|
| 1 | `linkRangeAt`: Cursor mitten in einem zusammenhängenden Link | Dokument mit Link über mehrere Runs mit unterschiedlichen Zusatz-Marks (fett/nicht-fett), gleicher `href` | `{ from, to, href }` über den **gesamten** zusammenhängenden Bereich, nicht nur den einen Run |
| 2 | `linkRangeAt`: Cursor genau zwischen zwei Links mit unterschiedlichem `href` | — | liefert den Link **vor** dem Cursor (Konvention wie `$from.marks()`) |
| 3 | `linkRangeAt`: Cursor außerhalb jedes Links | — | `null` |
| 4 | `setLink` auf gemischte Selektion (teils Link A, teils Link B, teils unverlinkt) | `state.tr`/echte `addMark`-Semantik über `wordSchema` | gesamte Selektion trägt danach einheitlich die neue URL (Grenzfall 4.2) |
| 5 | `setLink` mit leerer Selektion, Cursor in bestehendem Link | neue `href` | aktualisiert den **gesamten** Link-Bereich, nicht nur ab Cursor-Position (§3.4) |
| 6 | `setLink` mit leerer Selektion, Cursor **außerhalb** jedes Links | — | `false`/kein Dispatch (defensiver Fallback, den der Dialog laut Codeplan §4.3 normalerweise nie erreicht) |
| 7 | `removeLink` mit leerer Selektion, Cursor in bestehendem Link | Text zusätzlich mit `strong`-Mark | entfernt `link`-Mark über den gesamten Bereich, `strong` bleibt erhalten (§3.5) |
| 8 | `removeLink` auf Selektion mit gemischtem Inhalt (teils Link, teils nicht) | — | entfernt `link` überall dort, wo vorhanden, Rest bleibt unverändert, kein Crash |
| 9 | `insertLinkText` an Cursor-Position mit aktivem `strong`-Mark (Grenzfall §3.2 Variante b) | `href`, `text` | neuer Text trägt **beide** Marks (`link` **und** `strong`), keines verdrängt das andere |
| 10 | `insertLinkText` mit leerem `text` | — | `false`/kein Dispatch (kein leerer verlinkter Knoten) |
| 11 | `buildLinkDialogRequest`: leere Selektion außerhalb eines Links | — | `{ mode: 'insert', initialHref: '' }` |
| 12 | `buildLinkDialogRequest`: leere Selektion in bestehendem Link | — | `{ mode: 'edit', initialHref: <vorhandene URL> }` (Bedienelement 4) |
| 13 | `buildLinkDialogRequest`: nicht-leere, einheitlich verlinkte Selektion | — | `{ mode: 'edit', initialHref: <die eine URL> }` |
| 14 | `buildLinkDialogRequest`: nicht-leere, gemischte Selektion (unterschiedliche/keine Links) | — | `{ mode: 'edit', initialHref: '' }` (kein irreführender Vorbelegungswert) |

### 1.4 Neu: `src/formats/docx/__tests__/hyperlink.test.ts`

Reader-/Writer-Rundreise und -Grenzfälle für DOCX, über eine minimal per
JSZip gebaute `.docx`-Datei (Muster: `buildDocxWithRun(runXml)`/
`buildSampleDocx()` analog `tests/e2e/docx.spec.ts`) und `readDocx(blob)`
bzw. `writeDocx(doc)`, sowie echte `state.tr`-Sequenzen über `wordSchema` wo
mehrere Marks kombiniert werden.

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | (siehe 1.1) Regressionstest verschachtelter `<w:r>` in `<w:hyperlink>` | Text + `link`-Mark vollständig erhalten | Befund 0.4 |
| 2 | Writer: `link`-Mark mit `href` auf einfachem Text → Export | exakt `<w:hyperlink r:id="rIdN">` um den/die richtigen `<w:r>`-Lauf/-Läufe, kein anderer Text betroffen | Anforderung 3.12/5.1.1 |
| 3 | Writer erzeugt zugehörigen Relationship-Eintrag | `document.xml.rels` enthält für `rIdN` `Type=".../hyperlink"`, `Target="<url>"`, **`TargetMode="External"`** | Befund 0.7, Anforderung 5.1.1 (expliziter Test, da Fehlen dieses Attributs der naheliegendste Implementierungsfehler ist) |
| 4 | URL mit `&`, Anführungszeichen, Leerzeichen, Umlauten als `href` → Export | `document.xml.rels` bleibt **valides, parsebares** XML (`Target` korrekt escaped via `escapeXml`), `href` nach Reimport exakt erhalten | Grenzfall 4.6, Regressionstest für den in `hyperlink-einfuegen-code.md` §2.1 gefundenen fehlenden `escapeXml`-Aufruf auf `Relationship.target` |
| 5 | Sehr lange URL (> 2000 Zeichen) → Export + Reimport | keine Kürzung, kein Crash, `href` exakt identisch | Grenzfall 5 |
| 6 | `mailto:`-/`tel:`-Ziel → Export + Reimport | `href` exakt erhalten, kein `https://`-Präfix hinzugefügt | Grenzfall 7 |
| 7 | Link + Fett + Textfarbe gleichzeitig auf demselben Textlauf → Export + Reimport | alle drei Marks nach Rundreise gemeinsam vorhanden, **kein** zusätzliches implizites `textColor`/`underline` durch die Standardoptik-Stilreferenz | Anforderung 5.1.3, **wichtigster Einzeltest der Suite** — Regressionstest für die in `hyperlink-einfuegen-code.md` §2.4 beschriebene Round-Trip-Falle (Inline-Styling würde hier fälschlich zusätzliche Marks erzeugen) |
| 8 | Zwei unmittelbar aufeinanderfolgende Links mit unterschiedlichem `href`, kein Text dazwischen → Export | zwei getrennte `<w:hyperlink>`-Elemente, zwei getrennte Relationship-Einträge, **nicht** zusammengefasst | Grenzfall 4.8 |
| 9 | Link über einen `hard_break` hinweg → Export + Reimport | ein einziges `<w:hyperlink>`, das Text-Lauf vor dem Umbruch, den `<w:br/>`-Lauf **und** Text-Lauf danach umschließt; nach Reimport ein zusammenhängendes `link`-Mark über den ganzen `hard_break` hinweg | Grenzfall 4.10, setzt den in `hyperlink-einfuegen-code.md` §2.2 beschriebenen `hard_break`-Marks-Fix voraus |
| 10 | Link entfernt (vormals verlinkter Text) → Export | kein `<w:hyperlink>` mehr für diesen Bereich, kein verwaister Relationship-Eintrag in `document.xml.rels` ohne zugehörige Referenz in `document.xml` | Anforderung 5.1.4 |
| 11 | Link, der eine komplette Überschrift (`heading`) umfasst → Export + Reimport | Link bleibt erhalten, `heading`-Level unverändert | Grenzfall 12 |
| 12 | Link in einer Tabellenzelle → Export + Reimport | Zuordnung zur richtigen Zelle erhalten, kein Übergreifen auf Nachbarzellen | Grenzfall 11 |
| 13 | Entfernen des Links in einem leeren Listenpunkt/leerer Tabellenzelle | kein Rendering-Fehler, kein leerer `<w:r>` ohne Inhalt | Grenzfall 13 |
| 14 | `<w:hyperlink>` **ohne** `r:id`, aber mit `w:anchor` (interner Sprung) → Import | Text bleibt vollständig erhalten, **kein** `link`-Mark (dokumentierte, bewusste Einschränkung außerhalb des Geltungsbereichs) | Anforderung 3.13, Grenzfall 17 |
| 15 | `javascript:`-Ziel im Relationship-Target (simulierte manipulierte/fremde Datei) → Import | Text bleibt erhalten, **kein** `link`-Mark mit diesem `href` (kein XSS-fähiges `href` im internen Modell) | Grenzfall 4.9, Import-Pfad |
| 16 | Standardoptik-Stilreferenz (`w:styleId="Hyperlink"`/`w:rStyle`) wird beim Reimport **nicht** in ein `textColor`/`underline`-Mark übersetzt | Export eines Links → Reimport derselben Datei → Ergebnis trägt **nur** `link`-Mark, keine zusätzlichen impliziten Marks | direkter Regressionstest für `hyperlink-einfuegen-code.md` §2.4/§4.9-4.11 |

### 1.5 Erweitert: `src/formats/docx/__tests__/external-fixtures.test.ts`

Neue gezielte Assertions (zusätzlich zum bestehenden pauschalen „importiert
ohne Absturz"-Loop, der bereits alle 127 Fixtures abdeckt):

| # | Fixture | Testfall | Erwartung |
|---|---|---|---|
| 1 | `rtl.docx` | **Kritischer Regressionstest Befund 0.4** | mindestens ein `link`-Mark mit `href` beginnend `https://ar.wikipedia.org` vorhanden, **und** der sichtbare arabische Linktext ist Teil des importierten Dokuments (nicht nur der unverlinkte Fülltext) |
| 2 | `56392.docx` | `mailto:`-Link | `mailto:klienti@livetelecom.cz` korrekt als `href` aufgelöst |
| 3 | `bug65738.docx` | gemischte `r:id`-/`w:anchor`-Links in einer Datei | mindestens ein `link`-Mark mit `r:id`-basiertem `href` **und** Text aus den `w:anchor`-only-Hyperlinks (`OnLevel3`/`OnMainHeading`) vollständig vorhanden, letzterer **ohne** `link`-Mark (Grenzfall 4.17 mit realer Datei, kein synthetisches Fixture nötig) |

Die übrigen neun hyperlink-haltigen Fixtures (`58618.docx`, `61991.docx`,
`TestDocument.docx`, `WordWithAttachments.docx`, `bug59058.docx`,
`bug65649.docx`, `delins.docx`, `drawing.docx`, `smarttag-snippet.docx`)
bleiben durch den bestehenden pauschalen Crash-Test abgedeckt — kein
zusätzlicher gezielter Assertions-Bedarf, da sie keine besonderen Grenzfälle
gegenüber den drei oben genannten beitragen.

### 1.6 Neu: `src/formats/odt/__tests__/hyperlink.test.ts`

Analog zu 1.4, über `readOdt(blob)`/`writeOdt(doc)` und handgebautem
`content.xml`.

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | (siehe 1.1) `<text:a>`: `href`-Erfassung, während der `walk`-Abstieg in die Kind-Knoten (Text-Erhalt) erhalten bleibt | Text (bereits heute) + `link`-Mark mit `href` (neu) vollständig vorhanden | Befund 0.5 |
| 2 | Writer: `link`-Mark → Export | exakt `<text:a xlink:href="…" xlink:type="simple">…</text:a>` um den betroffenen Text | Anforderung 3.14/5.2.1 |
| 3 | Zusätzliche Zeichenformatierung innerhalb des Links (z. B. fett) → Export | innerer `text:span` mit eigener Formatvorlage bleibt **innerhalb** von `<text:a>` erhalten, keine der beiden Ebenen verdrängt die andere | Anforderung 3.14 |
| 4 | URL mit Sonderzeichen (`&`, Anführungszeichen, Leerzeichen, Umlaute) → Export | `xlink:href` korrekt XML-escaped (`escapeXml`), gültiges `content.xml` | Grenzfall 4.6 |
| 5 | Sehr lange URL (> 2000 Zeichen) → Export + Reimport | keine Kürzung, kein Crash | Grenzfall 5 |
| 6 | `mailto:`-/`tel:`-Ziel → Export + Reimport | exakt erhalten, kein `https://`-Präfix | Grenzfall 7 |
| 7 | Link + Fett + Textfarbe gleichzeitig → Export + Reimport | alle drei Merkmale gemeinsam erhalten, **kein** zusätzliches implizites `textColor`/`underline` durch die reservierte `Internet_20_Link`-Formatvorlage | Anforderung 5.2 sinngemäß zu 5.1.3, Regressionstest für die ODT-Seite der Round-Trip-Falle aus `hyperlink-einfuegen-code.md` §2.4 |
| 8 | Link entfernt → Export | kein `<text:a>` mehr für diesen Textlauf, verbleibender `text:span` (falls andere Marks vorhanden) bleibt korrekt bestehen | Anforderung 5.2.3 |
| 9 | Zwei unmittelbar aufeinanderfolgende Links mit unterschiedlichem `href`, kein Text dazwischen → Export | zwei getrennte `<text:a>`-Elemente, nicht zusammengefasst | Grenzfall 4.8 |
| 10 | Link über einen `hard_break` hinweg → Export + Reimport | ein zusammenhängendes `link`-Mark über beide Seiten des `<text:line-break/>` hinweg, nicht in zwei Links zerfallen | Grenzfall 4.10, setzt den ODT-seitigen `hard_break`-Marks-Fix voraus |
| 11 | Überlappende/verschachtelte `<text:a>`-Struktur (synthetisch nachgebaut, analog zur realen Fixture aus 1.7 #6) → Import | kein Absturz, Text vollständig erhalten, **genau ein** `link`-Mark pro Textknoten (kein doppelter Mark-Eintrag) | Grenzfall 16, Regressionstest für `Mark.setFrom`-Dedup-Lücke, `hyperlink-einfuegen-code.md` §2.3 |
| 12 | Reservierte Formatvorlage `Internet_20_Link` wird beim Reimport **nicht** in ein `textColor`/`underline`-Mark übersetzt | Export eines Links → Reimport → Ergebnis trägt **nur** `link`-Mark | Regressionstest für `hyperlink-einfuegen-code.md` §2.4/§4.15 |
| 13 | Link, der eine komplette Überschrift umfasst → Export + Reimport | Link bleibt erhalten, Überschriften-Level unverändert | Grenzfall 12 |
| 14 | Link in einer Tabellenzelle → Export + Reimport | Zuordnung zur richtigen Zelle erhalten | Grenzfall 11 |
| 15 | Cross-Format DOCX→ODT: `readDocx`-Ergebnis mit `link`-Mark → `writeOdt` | `href` bleibt exakt erhalten, korrekt als `<text:a>` erzeugt | Anforderung 5.2.4 |

### 1.7 Erweitert: `src/formats/odt/__tests__/external-fixtures.test.ts`

| # | Fixture | Testfall | Erwartung |
|---|---|---|---|
| 1 | `hyperlink.odt` | **Kritischer Regressionstest Befund 0.5** | mindestens ein `link`-Mark mit `href="http://www.heise.de/"` (oder dem tatsächlichen Fixture-Wert) **und** vollständig erhaltenem Linktext |
| 2 | `hyperlinkSpaces.odt` | Link mit Leerzeichen im Anzeigetext | Text inkl. Leerzeichen vollständig erhalten, `link`-Mark korrekt |
| 3 | `hyperlinkSpacesNoUnderline.odt` | Link ohne native Unterstreichung im Original | Text + `link`-Mark erhalten; App-eigene Standardoptik (blau/unterstrichen) greift unabhängig vom Original-Styling (dokumentierter, akzeptierter Unterschied laut Abnahmekriterium Abschnitt 5) |
| 4 | `Hyperlink-AOO401.odt` (echtes Apache OpenOffice 4.0.1) | Text + `link`-Mark erhalten | bestätigt Kompatibilität mit einem echten Fremd-Erzeuger, nicht nur der eigene Writer |
| 5 | `hyperlink_destination.odt` | **kein** Absturz | explizit im Test dokumentiert (Kommentar), dass diese Datei laut Verifikation in `hyperlink-einfuegen-code.md` Abschnitt 1 **keinen** `<text:a>` enthält — zählt hier nur als Crash-Test, nicht als Link-Inhaltstest |
| 6 | `invalid_simple_overlapping_hyperlinks.odt` | kein Absturz, Text „heise" (und umgebender Text „www."/".de") vollständig vorhanden | **genau ein** `link`-Mark pro Textknoten (Regressionstest für Dedup-Lücke, siehe 1.6 #11) — Grenzfall 16 |

### 1.8 Relationship-Registry: `escapeXml`-Fix isoliert getestet

Ergänzung in `src/formats/docx/__tests__/hyperlink.test.ts` (oder eigener
`relationships.test.ts`, je nach bestehender Testdatei-Struktur):

| # | Testfall | Erwartung |
|---|---|---|
| 1 | `RelationshipRegistry.add(RELATIONSHIP_TYPES.hyperlink, 'https://example.com/pfad?x=1&y=2', 'External')` → `serialize()` | erzeugtes XML ist per `DOMParser` **parsebar** (kein rohes `&`), `Target`-Attribut enthält `&amp;`, `TargetMode="External"` gesetzt |
| 2 | Bestehende Relationship-Typen (Bild, Header/Footer, Styles, Numbering) mit unveränderten, garantiert sauberen Targets | `escapeXml`-Fix ist **behavior-preserving** — identisches Ergebnis wie vor dem Fix (kein Escaping nötig, da keine Metazeichen enthalten) |

### 1.9 Validierung gegen unabhängigen Parser (Rundreise-Szenario Abschnitt 5 der Anforderung)

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die unabhängige
Validierung zweistufig (analog `specs/textmarker-farbe-qa.md` Abschnitt 1.6,
`specs/kursiv-qa.md` Abschnitt 1.5):

1. **Automatisiert, Teil der Unit-/E2E-Suite:** Prüfung des exportierten
   XML-Strings per `DOMParser`/gezieltem Attribut-Zugriff, **ohne** dabei
   `readDocx`/`readOdt` desselben Projekts zu benutzen (verhindert sich
   gegenseitig ausgleichende Schreib-/Lesefehler). Umgesetzt in Abschnitt 1.4
   Testfälle 2-3 (DOCX) sowie in den E2E-Szenarien aus Abschnitt 2.15 dieses
   Plans, da dort die real heruntergeladene Datei vorliegt.
2. **Manuell, einmalig vor Statuswechsel auf „vorhanden":**
   - eine exportierte Test-DOCX mit gesetztem Hyperlink außerhalb dieses
     Repos mit `python-docx` (`run.hyperlink`/Rohzugriff auf
     `document.xml.rels`) sowie in echtem Microsoft Word öffnen: Link muss
     klickbar sein, keine Reparaturmeldung beim Öffnen (bestätigt
     `TargetMode="External"` ist korrekt gesetzt — Befund 0.7).
   - dieselbe Datei: prüfen, ob Word den Linktext als mit der Formatvorlage
     „Hyperlink" formatiert erkennt (erwartet: ja, da `w:rStyle
     w:val="Hyperlink"` referenziert wird, siehe `hyperlink-einfuegen-code.md`
     §3.4).
   - eine exportierte Test-ODT mit LibreOffice öffnen: Link muss klickbar
     sein, blau/unterstrichen dargestellt, Zeichenformatvorlage „Internet
     Link" im Formatvorlagen-Fenster referenziert.
   - Kein Bestandteil der automatisierten CI-Suite, aber Pflicht-Checkliste-
     Punkt vor Abnahme (Abschnitt 4 dieses Plans).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByTitle(...)`/`getByRole(...)`
`.click()`, `page.keyboard.type(...)`/`.press(...)`, `input.setInputFiles(...)`
für Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen
Datei vom Datenträger für Exporte, `page.waitForEvent('popup')` für
Strg+Klick-Verhalten. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setLink`/`removeLink`/
`insertLinkText`/`sanitizeHref`/`normalizeHref` direkt importieren oder
aufrufen — das wäre Ebene 1, nicht Ebene 2. Wo eine Datei hochgeladen werden
muss, wird sie entweder (a) unabhängig vom Reader/Writer dieses Projekts per
JSZip von Hand gebaut (Muster `buildSampleDocx()`/`buildSampleOdt()` aus
`tests/e2e/docx.spec.ts`/`odt.spec.ts`), oder (b) eine reale externe Fixture
aus `tests/fixtures/external/` verwendet — niemals eine mit dem eigenen Writer
erzeugte Datei als Upload-Eingabe für einen reinen Rundreisetest ohne
zusätzliche unabhängige Prüfung, das würde Schreib-/Lesefehler gegenseitig
kompensieren lassen (die in 2.15 verlangte unabhängige XML-Prüfung der
heruntergeladenen Datei federt das ab).

### 2.0 Neue Datei: `tests/e2e/hyperlink.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function linkButton(page) {
  return page.getByRole('button', { name: 'Link einfügen' })
}
function linkDialog(page) {
  return page.getByRole('dialog')
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

### 2.0.1 Determinismus / keine Race-Conditions (verbindlich für alle Tests dieses Abschnitts)

Dieses Repo hat eine **dokumentierte, wiederkehrende Flakiness-Quelle**:
ProseMirror erfährt eine native, tastaturgetriebene Cursor-/Selektions­änderung
(z. B. `End`, Pfeiltasten) erst über das **asynchrone** `selectionchange`-Event
des Browsers. Feuert der nächste Tastendruck sofort danach (wie es
`page.keyboard.press()` ohne menschliche Reaktionszeit tut), kann er der
Selektions-Synchronisation **vorauslaufen** und auf der veralteten Position
wirken — genau der Fehler, den `selection-regression.spec.ts:26-34` mit einem
kurzen `await page.waitForTimeout(50)` **zwischen** caret-bewegender Taste und
Folgetaste abfängt (in der Git-Historie mehrfach als „async selection-sync
race" behoben, u. a. für die **Mobile-Projekt**-Läufe von `cut.spec.ts` und
`selection-regression.spec.ts`). Für die Link-Tests **verbindlich**:

1. **Selektions-Sync abwarten, nicht überrennen.** Nach jeder caret-bewegenden
   Tastenaktion (`End`, `Home`, Pfeiltasten, `editor.click()`-Neupositionierung)
   und **vor** dem nächsten `keyboard.press`/`type` denselben
   `await page.waitForTimeout(50)` einfügen wie `selection-regression.spec.ts`
   (mit demselben erklärenden Kommentar). Betrifft insbesondere die
   Pflichtsequenz §2.11 (markieren → Dialog bestätigen → klicken → `End` →
   `Enter` → tippen): Der Wait **muss** vor `Enter` stehen, sonst reproduziert
   der Test exakt die historische Cut-/Selection-Flakiness (die gerade auf dem
   Mobile- und Tablet-Projekt auftrat).
2. **URL-/Anzeigetext-Felder mit `locator.fill()` befüllen, nicht mit
   `keyboard.type()`.** `fill()` setzt den Wert atomar und wartet auf
   Editierbarkeit/Sichtbarkeit — deterministisch. Getipptes `keyboard.type()`
   in ein kontrolliertes React-Eingabefeld kann bei voller Geschwindigkeit
   Zeichen verlieren. `keyboard.type()` nur dort, wo bewusst das Tippen **in
   den Editor** (nicht ins Dialogfeld) geprüft wird.
3. **Auf beobachtbare Zustände warten, nicht auf feste Zeiten.** Vor jeder
   Assertion Playwright-Auto-Waiting nutzen (`await expect(locator).toHaveText/…`,
   `toHaveAttribute`, `toBeVisible`). Kein `waitForTimeout` als Ersatz für eine
   echte Bedingung; der 50-ms-Wait aus Punkt 1 ist die **einzige** erlaubte
   feste Wartezeit und ausschließlich für die native-`selectionchange`-Lücke
   reserviert.
4. **Dialog-Öffnen setzt die Selektion nicht zurück** (`hyperlink-einfuegen-
   code.md` §4.8: Felder liegen außerhalb `view.dom`, kein Fokuswechsel im
   Editor). Trotzdem gilt: Nach `ControlOrMeta+a` **direkt** den Link-Button
   klicken bzw. `ControlOrMeta+k` drücken (kein zwischengeschalteter caret-Move),
   damit der Dialog die stabile, vollständige Selektion liest — exakt wie
   `selection-regression.spec.ts` `ControlOrMeta+a` → `getByTitle('Fett').click()`
   ohne Zwischenschritt macht.
5. **Negativ-Assertions brauchen einen positiven Sync-Punkt.** Für „es passiert
   *nichts*" (z. B. `javascript:` abgelehnt, kein `alert`): erst den Listener
   registrieren (`page.on('dialog', …)` / `page.on('pageerror', …)`), dann die
   Aktion ausführen, dann **auf ein sichtbares positives Signal warten** (die
   Fehlermeldung `role="alert"` im Dialog `await expect(...).toBeVisible()`) und
   **erst danach** die Abwesenheit prüfen — nie „kurz warten und hoffen".
6. **Cross-Project.** `hyperlink.spec.ts` läuft laut `playwright.config.ts` auf
   `Desktop Chrome`, `Mobile` (Pixel 7, Touch) und `Tablet` (iPad Mini, WebKit
   Touch). Die Selektions-Sync-Lücke trat historisch **gerade auf Mobile/Tablet**
   auf — die Wait-Disziplin aus Punkt 1 ist dort nicht optional. Rein
   desktop-spezifische Interaktionen (Strg/Cmd+Klick-Popup) werden so geprüft,
   dass sie auch auf Touch-Projekten deterministisch sind (siehe §2.8-Hinweis).

### 2.1 Grundfunktion: Link setzen per Button-Klick (Bedienelement 1/3, Anforderung 3.1)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Text markieren, Button klicken, URL eingeben, „Übernehmen" | `editor.click()` → `keyboard.type('Testlink')` → `ControlOrMeta+a` → `linkButton(page).click()` → `linkDialog(page).getByLabel(/URL/i).fill('https://example.com')` → `Enter` | `editor.locator('a[href="https://example.com"]')` sichtbar, enthält Text „Testlink"; `title`-Attribut des `<a>` zeigt die URL (Bedienelement 8) |
| 2 | Bestätigen per „Übernehmen"-Button statt `Enter` | Fortsetzung analog #1, aber `getByRole('button', { name: 'Übernehmen' }).click()` | identisches Ergebnis |
| 3 | Alte URL wird bei erneuter Anwendung auf dieselbe Selektion vollständig ersetzt | Selektion erneut mit anderer URL bestätigen | nur die neue URL im `href`, kein Rest der alten (§3.1, kein Verschachteln zweier Links) |
| 4 | Gemischte Selektion (teils Link A, teils Link B, teils unverlinkt) → neue URL | zwei unterschiedliche Links setzen, dann Gesamtselektion über beide + unverlinkten Text mit neuer URL bestätigen | **gesamte** Selektion trägt danach einheitlich die neue URL (Grenzfall 4.2) |
| 5 | Aktion ist ein einzelner Undo-Schritt | Fortsetzung von #1: `ControlOrMeta+z` | Link vollständig verschwunden (nicht nur teilweise), Text bleibt erhalten |

### 2.2 Grundfunktion: Link setzen per Strg+K (Bedienelement 2)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Dieselbe Sequenz wie 2.1 #1, aber `ControlOrMeta+k` statt Button-Klick | Text markieren → `page.keyboard.press('ControlOrMeta+k')` → URL eingeben → `Enter` | identisches Ergebnis wie 2.1 #1 |
| 2 | Strg+K ohne Fokus im Editor | Fokus außerhalb des `.ProseMirror`-Elements, dann `ControlOrMeta+k` | kein Dialog öffnet sich (Shortcut ist editor-scoped, kein globaler Eingriff in Browser-Shortcuts außerhalb des Editors) |

### 2.3 Leere Selektion (nur Cursor) — Grenzfall 1/Anforderung 3.2

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Cursor ohne Selektion, `ControlOrMeta+k` | Text tippen, Cursor mit Pfeiltaste irgendwo hinbewegen (kein Shift), `ControlOrMeta+k` | Dialog öffnet sich mit **zusätzlichem** Anzeigetext-Feld (Entscheidung Variante b aus `hyperlink-einfuegen-code.md` §3.1) |
| 2 | Beide Felder ausfüllen, bestätigen | Anzeigetext + URL ausfüllen, `Enter` | neuer verlinkter Text exakt an der Cursor-Position sichtbar, restlicher Text unverändert |
| 3 | Anzeigetext leer, URL ausgefüllt, bestätigen | — | sichtbare Fehlermeldung im Dialog, Dialog bleibt offen, kein Text eingefügt (kein stiller No-Op, §3.16) |
| 4 | Neu eingefügter Linktext erbt aktives Format (z. B. Fett war beim Cursor aktiv) | `Fett`-Button aktivieren, dann Variante wie #2 | eingefügter Text trägt **sowohl** `link` **als auch** Fett |

### 2.4 Bearbeiten eines bestehenden Links (Bedienelement 4, Anforderung 3.4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Cursor (ohne Selektion) in bestehendem Link, `ControlOrMeta+k` | Link setzen wie 2.1 #1, Cursor mit Pfeiltasten mitten in den Linktext bewegen, `ControlOrMeta+k` | Dialog öffnet sich mit der **aktuell hinterlegten URL vorausgefüllt** im URL-Feld |
| 2 | Neue URL bestätigen | URL-Feld überschreiben, `Enter` | `href` auf dem **gesamten** zusammenhängenden Linkbereich aktualisiert, nicht nur ab Cursor-Position |
| 3 | Button zeigt „aktiven" Zustand, während Cursor im Link steht | Cursor in Link platzieren (ohne Dialog zu öffnen) | `linkButton(page)` hat `aria-pressed="true"` (Bedienelement 7, §3.7) |
| 4 | Button zeigt „inaktiven" Zustand außerhalb eines Links | Cursor auf unverlinkten Text | `aria-pressed="false"` |

### 2.5 Entfernen eines Links (Bedienelement 5, Anforderung 3.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | „Link entfernen" im Dialog | Link setzen → Cursor in Link → `ControlOrMeta+k` → `getByRole('button', { name: /entfernen/i }).click()` | `a[href]` verschwindet vollständig aus dem DOM, Text bleibt unverändert sichtbar |
| 2 | Andere Marks bleiben nach Entfernen erhalten | Link + Fett gemeinsam setzen, dann nur Link entfernen | Fett bleibt erhalten, nur `link`-Markup verschwindet |
| 3 | Entfernen ist ein einzelner Undo-Schritt | Fortsetzung von #1: `ControlOrMeta+z` | Link vollständig wiederhergestellt (inkl. exaktem `href`) |
| 4 | Entfernen in leerem Listenpunkt/leerer Tabellenzelle | Liste/Tabelle einfügen, leeren Eintrag mit Link versehen (Variante b aus 2.3) und wieder entfernen, ohne Text davor/danach | kein Rendering-Fehler, kein Crash (Grenzfall 13) |

### 2.6 URL-Validierung im Dialog (Anforderung 3.3, Grenzfälle 4/5/6/7/9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Leeres URL-Feld bestätigen | Text markieren → Dialog öffnen → URL-Feld leer lassen → `Enter`/„Übernehmen" | Dialog bleibt offen, sichtbare Fehlermeldung, **keine** Änderung am Dokument, kein `href=""` (Grenzfall 4, §3.16) |
| 2 | Escape schließt den Dialog ohne Änderung | Dialog öffnen, etwas eintippen, `Escape` | Dialog geschlossen, Dokument unverändert |
| 3 | URL ohne Protokoll eingeben (`beispiel.de`) | — | resultierendes `a[href]` beginnt mit `https://beispiel.de` (§3.2/3.3 Entscheidung: Autopräfix) |
| 4 | `mailto:`-Adresse eingeben | `mailto:test@beispiel.de` | `a[href="mailto:test@beispiel.de"]`, nicht mit `https://` präfigiert (Grenzfall 7) |
| 5 | `tel:`-Nummer eingeben | `tel:+491234567` | `a[href="tel:+491234567"]` (Grenzfall 7) |
| 6 | Sehr lange URL (> 2000 Zeichen) eingeben | per `page.keyboard.type` oder `input.fill` mit generiertem langen String | vollständig ohne Kürzung im `href` übernommen, kein Crash/Freeze (Grenzfall 5) |
| 7 | URL mit Sonderzeichen (Leerzeichen — sofern eingebbar —, `&`, Umlaute, Anführungszeichen) | z. B. `https://example.com/pfad?x=1&y=2` | `href` exakt wie eingegeben im DOM (Grenzfall 6; Export-Escaping separat in 2.15 geprüft) |
| 8 | `javascript:alert(1)` eingeben, bestätigen | — | sichtbare Fehlermeldung „Dieses Link-Ziel wird nicht unterstützt." (oder äquivalent), Dialog bleibt offen, **kein** `a[href^="javascript:"]` im DOM, kein `alert(1)` tatsächlich ausgeführt (`page.on('dialog')`-Listener bestätigt keinen JS-`alert` ausgelöst) — Grenzfall 4.9, sicherheitskritisch |
| 9 | `data:text/html,...` bzw. `vbscript:...` eingeben | — | analoge Ablehnung wie #8 |
| 10 | Relativer Pfad `../andere-datei.docx` eingeben | — | unverändert im `href` übernommen, kein Crash (Anforderung 3.3, dokumentierte Nicht-Auflösung) |

### 2.7 Kombination mit anderen Zeichenformaten (Anforderung 3.8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Link + Fett + Schriftfarbe gleichzeitig | Text markieren, Link setzen, Fett aktivieren, Schriftfarbe setzen | alle drei Formate gleichzeitig im DOM sichtbar, keines verdrängt ein anderes |
| 2 | Standardoptik (blau/unterstrichen) ohne explizite Zusatzformatierung | Link auf unformatierten Text setzen | `getComputedStyle` des `<a>` zeigt eine erkennbare Linkfarbe **und** `text-decoration` enthält `underline` (Anforderung 3.6, Bedienelement 6) |
| 3 | Explizite `textColor` überschreibt die implizite Link-Farbe optisch | Link setzen, danach zusätzlich explizite Schriftfarbe (z. B. Rot) auf denselben Text anwenden | sichtbare Textfarbe ist die explizite Farbe (Rot), **nicht** mehr die Default-Link-Farbe; `href` bleibt davon unberührt (§3.8 Design-Entscheidung, direkter Nachweis der Mark-Reihenfolge aus `hyperlink-einfuegen-code.md` §4.4) |
| 4 | Entfernen des Links bei zusätzlich expliziter `textColor` | Fortsetzung von #3: Link entfernen | explizite Textfarbe (Rot) bleibt bestehen, nur die Verlinkung verschwindet — bestätigt, dass die Standardoptik **nicht** als eigenständiger, nach dem Entfernen übrig bleibender Mark implementiert ist (Regressionstest für die in `hyperlink-einfuegen-code.md` §2.4 beschriebene Falle, jetzt auf Editor-Ebene statt nur Rundreise-Ebene) |

### 2.8 Klickverhalten innerhalb des Editors (Anforderung 3.9, Grenzfall 19)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Einfacher Klick auf verlinkten Text navigiert **nicht** weg | Link setzen, `editor.locator('a[href]').click()` | Seite bleibt auf der App (`page.url()` unverändert), kein neuer Tab/Popup geöffnet |
| 2 | Einfacher Klick platziert den Cursor zum Weiterbearbeiten | Fortsetzung von #1: direkt danach `page.keyboard.type('X')` | eingegebenes „X" erscheint an der Klickposition im Linktext (bestätigt, dass Caret-Platzierung trotz `preventDefault` auf die Navigation weiterhin funktioniert) |
| 3 | Strg/Cmd+Klick öffnet die Ziel-URL in neuem Tab | `const popupPromise = page.waitForEvent('popup')` **vor** `editor.locator('a[href]').click({ modifiers: ['ControlOrMeta'] })`, dann `const popup = await popupPromise` | Popup-Event feuert; `popup.url()` beginnt mit der erwarteten Ziel-URL. **Nicht** auf das *Laden* der externen Seite warten (die E2E-Umgebung ist netzwerkisoliert, siehe `tests/e2e/network-isolation.spec.ts`) — geprüft wird nur, dass `window.open` mit korrekter URL/`_blank` ausgelöst wurde; Popup anschließend `await popup.close()` |
| 4 | Doppelklick auf verlinkten Text selektiert das Wort, keine Navigation | `editor.locator('a[href]').dblclick()` | Wort ist selektiert (`window.getSelection()` bzw. sichtbare Textauswahl), kein neuer Tab, keine Navigation (Grenzfall 19, darf durch 3.9 nicht beeinträchtigt werden) |

**Touch-Projekte (Mobile/Tablet) und Determinismus:** einfacher Klick und
`click({ modifiers: ['ControlOrMeta'] })` werden von Playwright auch auf den
Touch-Projekten als echte Zeiger-Interaktion emuliert; die Assertions sind
bewusst zustands-/attributbasiert (`page.url()` unverändert, Cursor-Position
nach Klick, `popup.url()`), damit sie projektunabhängig deterministisch sind
und nicht vom externen Seitenladen abhängen. Der Tooltip (Bedienelement 8)
wird **nicht** über echtes Hover, sondern über den `title`-Attributwert des
`<a>` geprüft (§2.1 #1) — das funktioniert auf Desktop wie Touch gleichermaßen
deterministisch.

### 2.9 Zwischenablage (Anforderung 3.10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Intern kopierter verlinkter Text behält `link`-Mark | verlinkten Text markieren, `ControlOrMeta+c`, Cursor woanders hin, `ControlOrMeta+v` | eingefügter Text hat denselben `href` |
| 2 | Einfügen von extern kopiertem `<a href="…">…</a>`-HTML | synthetisches `ClipboardEvent`/`paste`-Event mit `text/html`-Payload `<a href="https://extern.example">Externer Link</a>` per `page.evaluate` auf den Editor dispatchen | eingefügter Text „Externer Link" erscheint als `a[href="https://extern.example"]` im DOM (§0.1/3.10 — `parseDOM`-Regel greift) |
| 3 | Einfügen von `<a href="javascript:alert(1)">Böse</a>` (Sicherheits-Grenzfall über Paste-Pfad) | wie oben | eingefügter Text „Böse" bleibt als reiner Text erhalten, **kein** `a[href^="javascript:"]` im DOM (schema-Filterung greift auch im `parseDOM`-Pfad) |
| 4 | Einfügen von reinem Text, der wie eine URL aussieht (`https://beispiel.de` getippt/eingefügt) | `page.keyboard.type('https://beispiel.de')` | bleibt unverlinkter Text (kein automatisches Autolinking, dokumentiert als bewusste Nicht-Umsetzung laut §3.10, kein Test-Fail) |

### 2.10 Undo/Redo (Anforderung 3.11)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Undo direkt nach Link-Setzen | Link setzen → `ControlOrMeta+z` | Link verschwindet vollständig, Text bleibt |
| 2 | Redo stellt Link inkl. exaktem `href` wieder her | Fortsetzung: `ControlOrMeta+y`/`ControlOrMeta+Shift+z` | Link wieder vorhanden, identischer `href`-Wert |
| 3 | Undo direkt nach Bearbeiten (neue URL) | Link bearbeiten (2.4 #2) → `ControlOrMeta+z` | alte URL wiederhergestellt |
| 4 | Undo direkt nach Entfernen | Link entfernen (2.5 #1) → `ControlOrMeta+z` | Link mit ursprünglichem `href` wiederhergestellt |

### 2.11 Selection-Sync-Regressionssequenz (Grenzfall 4.14, Pflicht)

Deckt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 sowie
`hyperlink-einfuegen-req.md` Freigabekriterium Abschnitt 7 explizit ab —
exakt das Muster aus `tests/e2e/selection-regression.spec.ts`, hier mit
„Link-Dialog bestätigen" statt „Fett-Button klicken" als Zwischenschritt.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Markieren → Link-Dialog öffnen und bestätigen → per Klick neu positionieren → weiter tippen | `keyboard.type('Hallo, das ist ein Test.')` → `ControlOrMeta+a` → Link setzen (2.1 #1-Muster) → `editor.click()` (Neupositionierung) → `End` → `Enter` → `keyboard.type('Zweiter Absatz.')` | beide Absätze vollständig und unverändert vorhanden (`editor` enthält beide Texte, `p`-Anzahl korrekt) — kein Zeichen fälschlich gelöscht/ersetzt |
| 2 | Dieselbe Sequenz innerhalb einer Tabellenzelle | analog zu `selection-regression.spec.ts`s Tabellen-Testfall, mit Link-Setzen als Zwischenschritt in Zelle 1 | Inhalt beider Zellen vollständig erhalten |
| 3 | Wiederholte Zyklen (Stresstest) | mehrfach: tippen → markieren → Link setzen → klicken → Enter, analog zum bestehenden Stresstest | alle Absätze am Ende vollständig vorhanden, keine Häufung von Fehlern über mehrere Zyklen |

### 2.12 Rundreise DOCX über echten Upload/Download (Anforderung 5.1, kritisch)

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → `word/document.xml`
und `word/_rels/document.xml.rels` aus dem Zip gelesen und per `DOMParser`
bzw. Regex geprüft), nicht nur, dass der Editor nach Re-Import „irgendwie
richtig aussieht".

**Pflicht-Zwischenschritt bei jedem Re-Import-/Cross-Format-Szenario (§2.12 #2,
#7; §2.13 #2, #4, #5, #6; §2.14):** Das Datei-`input[type="file"]` existiert nur
auf dem Format-Auswahl-Bildschirm, **nicht** im geöffneten Editor. Vor jedem
zweiten `setInputFiles` daher zurück zur Auswahl navigieren —
`await page.getByRole('button', { name: /formate/i }).click()` — exakt wie
`docx.spec.ts:241`/`docx.spec.ts:331`. Andernfalls ist der Upload-Locator gar
nicht vorhanden und das Szenario nicht ausführbar. Für den Re-Import stets die
**exakten heruntergeladenen Bytes** (`exportedBuffer`) verwenden, nicht das
In-Memory-Dokument aus Schritt 1.

**Cross-Format-Machbarkeit (§2.12 #7, §2.13 #4, §2.14):** Falls die App-UI
keinen direkten Wechsel des Export-Formats bei geladenem Dokument anbietet, wird
die Cross-Format-Rundreise auf **Unit-Ebene** abgesichert (§1.6 #15:
`readDocx`-Ergebnis mit `link`-Mark → `writeOdt`, und Gegenrichtung), und das
E2E-Cross-Format-Szenario wird nur ausgeführt, soweit der reale App-Workflow es
zulässt. Diese Feststellung ist beim Umsetzen einmalig zu treffen und hier zu
vermerken (Abschnitt 4), damit kein E2E-Szenario stillschweigend übersprungen
wird.

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | Basisfall: Link setzen, exportieren | Neu erstellen → tippen → markieren → Link mit `https://example.com/pfad?x=1&y=2` setzen → Export | `word/document.xml` enthält `<w:hyperlink r:id="rIdN">` um genau den erwarteten Run, kein anderer Text betroffen; `word/_rels/document.xml.rels` enthält für `rIdN` `Type=".../hyperlink"`, `Target="https://example.com/pfad?x=1&y=2"` (korrekt escaped, `DOMParser`-parsebar) **und** `TargetMode="External"` |
| 2 | Reimport derselben Datei | Datei aus #1 erneut via `setInputFiles` hochladen | `href` exakt an derselben Textstelle wiederhergestellt, restlicher Text weiterhin unverlinkt |
| 3 | Link + Fett + Schriftfarbe gemeinsam | alle drei setzen → Export → Reimport | alle drei Merkmale gemeinsam erhalten, nicht auf getrennte Läufe/Hyperlink-Wrapper aufgeteilt (Anforderung 5.1.3) |
| 4 | Link entfernt, dann exportiert | Link setzen, wieder entfernen, exportieren | kein `<w:hyperlink>` mehr für diesen Bereich, kein verwaister Relationship-Eintrag |
| 5 | **Kritischer Test:** reale, mit echtem Microsoft Word erzeugte Datei mit `<w:hyperlink>` importieren | `rtl.docx` via `setInputFiles` hochladen | sowohl Linktext (arabisch) als auch Ziel-URL vollständig im Editor sichtbar (Regressionsnachweis Befund 0.4, Grenzfall 15) |
| 6 | Link über `hard_break` | Zeile1 + Umschalt+Enter + Zeile2 komplett markieren, Link setzen, Export, Reimport | Link bleibt auf beiden Seiten des Umbruchs erhalten, nicht in zwei Links zerfallen |
| 7 | Cross-Format: ODT mit Link importieren → als DOCX exportieren | `hyperlink.odt` hochladen (in ODT-Karte) → Format wechseln/neu als DOCX exportieren, je nach App-Workflow — falls kein direkter Format-Wechsel existiert, Inhalt in neue DOCX-Karte übertragen laut App-UI | `href` bleibt erhalten, korrekt als `<w:hyperlink>` mit externer Relationship erzeugt (Anforderung 5.1.7) |

### 2.13 Rundreise ODT über echten Upload/Download (Anforderung 5.2)

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | Basisfall: Link setzen, exportieren | Neu erstellen (ODT) → tippen → markieren → Link setzen → Export | `content.xml` enthält `<text:a xlink:href="…" xlink:type="simple">…</text:a>` um genau den betroffenen Text, mit erhaltenem inneren `text:span` bei zusätzlicher Formatierung |
| 2 | Reimport derselben Datei | erneut hochladen | `href` exakt erhalten |
| 3 | Link entfernt, exportiert | setzen, entfernen, exportieren | `content.xml` enthält kein `<text:a>` mehr für diesen Textlauf, verbleibender `text:span` (falls vorhanden) bleibt bestehen |
| 4 | Cross-Format: DOCX mit Link (aus diesem Editor erzeugt) importieren → als ODT exportieren | DOCX aus 2.12 #1 hochladen (in DOCX-Karte) → Inhalt als ODT exportieren | `href` bleibt erhalten |
| 5 | **Kritischer Test:** alle vier inhaltstragenden realen ODT-Fixtures (die fünfte in Anforderung 5.2.5 genannte, `hyperlink_destination.odt`, enthält laut code.md §1 **kein** `<text:a>` und ist reiner Crash-Test, siehe 1.7 #5) | `hyperlink.odt`, `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`, `Hyperlink-AOO401.odt` einzeln hochladen | in jeder Datei: Linktext **und** Ziel-URL vollständig im Editor sichtbar (Regressionsnachweis Befund 0.5) |
| 6 | `invalid_simple_overlapping_hyperlinks.odt` | hochladen | kein Absturz, Text „heise" (und umgebender Text) mindestens vollständig lesbar sichtbar |

### 2.14 Doppelte Rundreise / Cross-Format hin und zurück (Anforderung 5.3)

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | DOCX → Editor → ODT → Reimport → zurück DOCX | DOCX mit Link hochladen → als ODT exportieren → ODT-Export erneut hochladen (ODT-Karte) → als DOCX exportieren | Link nach zwei Formatkonvertierungen an exakt derselben Textstelle, mit derselben URL, im finalen `document.xml` |
| 2 | ODT → Editor → DOCX → Reimport → zurück ODT | analog, Startpunkt ODT | wie oben, geprüft in `content.xml` |
| 3 | Mehrere unterschiedliche Links (drei verschiedene URLs, drei Textstellen) → doppelte Rundreise | Dokument mit drei Links erzeugen, zweifache Cross-Format-Konvertierung | jede einzelne URL bleibt korrekt der richtigen Textstelle zugeordnet, keine Vertauschung |

### 2.15 Sicherheitstest: `javascript:`-URL end-to-end (Testplan-Punkt 11 der Anforderung)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Eingegebene `javascript:`-URL führt zu keinem ausführbaren Code | siehe 2.6 #8 | kein `alert`/`console`-Fehler durch tatsächliche Ausführung (`page.on('dialog')`/`page.on('pageerror')` überwacht während des gesamten Testfalls) |
| 2 | Eingefügte `javascript:`-URL (Paste-Pfad) führt zu keinem ausführbaren Code | siehe 2.9 #3 | wie oben |
| 3 | Export nach eventuell doch reingerutschtem gefährlichem `href` (Verteidigung in der Tiefe) | Falls Testfall 1/2 aus irgendeinem Grund kein sauberes Ablehnen zeigen sollte: exportierte Datei prüfen | `document.xml`/`content.xml` enthält **kein** `javascript:`-Ziel — dieser Test dient als zusätzliches Sicherheitsnetz, primärer Schutz ist 1/2 |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| Befund 0.4 (DOCX href-Erfassung; Text-Erhalt heute schon gegeben, **kein** Datenverlust) | Unit + E2E | `docx/hyperlink.test.ts` §1.1/#1, `hyperlink.spec.ts` §2.12 #5, `external-fixtures.test.ts` §1.5 #1 |
| Befund 0.5 (ODT href-Erfassung; Text-Erhalt heute schon gegeben, **kein** Datenverlust) | Unit + E2E | `odt/hyperlink.test.ts` §1.1/#1, `hyperlink.spec.ts` §2.13 #5, `external-fixtures.test.ts` §1.7 #1 |
| Befund 0.7 (`TargetMode="External"`) | Unit + E2E | `docx/hyperlink.test.ts` #3, `hyperlink.spec.ts` §2.12 #1 |
| Bedienelemente 1-8 | E2E | `hyperlink.spec.ts` §2.1, §2.2, §2.4 #3-4, §2.7 #2 |
| Bedienelement 9 (Klickverhalten) | E2E | `hyperlink.spec.ts` §2.8 |
| Bedienelemente 10/11 (Kontextmenü/Menüleiste) | — | kein Blocker laut Anforderung, kein Test verlangt |
| 3.1 (Grundfall Selektion) | Unit + E2E | `linkCommands.test.ts` #4, `hyperlink.spec.ts` §2.1 |
| 3.2 (leere Selektion) | Unit + E2E | `linkCommands.test.ts` #9-10, `hyperlink.spec.ts` §2.3 |
| 3.3 (URL-Validierung/Normalisierung) | Unit + E2E | `url.test.ts`, `hyperlink.spec.ts` §2.6 |
| 3.4 (Bearbeiten) | Unit + E2E | `linkCommands.test.ts` #5,12, `hyperlink.spec.ts` §2.4 |
| 3.5 (Entfernen) | Unit + E2E | `linkCommands.test.ts` #7, `hyperlink.spec.ts` §2.5 |
| 3.6 (Standardoptik) | E2E | `hyperlink.spec.ts` §2.7 #2 |
| 3.7 (aktiver Button-Zustand) | E2E | `hyperlink.spec.ts` §2.4 #3-4 |
| 3.8 (Kombination mit Zeichenformaten) | Unit + E2E | `docx/hyperlink.test.ts` #7, `odt/hyperlink.test.ts` #7, `hyperlink.spec.ts` §2.7 |
| 3.9 (Klickverhalten) | E2E | `hyperlink.spec.ts` §2.8 |
| 3.10 (Zwischenablage) | E2E | `hyperlink.spec.ts` §2.9 |
| 3.11 (Undo/Redo) | E2E | `hyperlink.spec.ts` §2.10 |
| 3.12 (Export DOCX) | Unit + E2E | `docx/hyperlink.test.ts` #2-3,8,16, `hyperlink.spec.ts` §2.12 |
| 3.13 (Import DOCX inkl. `w:anchor`) | Unit + E2E | `docx/hyperlink.test.ts` #1,14, `external-fixtures.test.ts` §1.5 #3 |
| 3.14 (Export ODT) | Unit + E2E | `odt/hyperlink.test.ts` #2-4,12, `hyperlink.spec.ts` §2.13 |
| 3.15 (Import ODT inkl. Überlappung) | Unit + E2E | `odt/hyperlink.test.ts` #1,11, `external-fixtures.test.ts` §1.7 #6 |
| 3.16 (kein stiller Fehlschlag) | E2E | `hyperlink.spec.ts` §2.3 #3, §2.6 #1 |
| Grenzfall 1 (leere Selektion) | E2E | §2.3 |
| Grenzfall 2 (gemischte Selektion) | Unit + E2E | `linkCommands.test.ts` #4, §2.1 #4 |
| Grenzfall 3 (Bild-/Tabellengrenze) | — | bereits kostenlos korrekt (§2.5 des Codeplans), Testabdeckung optional/nice-to-have |
| Grenzfall 4 (leeres URL-Feld) | E2E | §2.6 #1 |
| Grenzfall 5 (sehr lange URL) | Unit + E2E | `url.test.ts` #9, `docx/hyperlink.test.ts` #5, `odt/hyperlink.test.ts` #5, §2.6 #6 |
| Grenzfall 6 (Sonderzeichen) | Unit + E2E | `docx/hyperlink.test.ts` #4, `odt/hyperlink.test.ts` #4, §2.6 #7, §2.12 #1 |
| Grenzfall 7 (`mailto:`/`tel:`) | Unit + E2E | `url.test.ts` #7, §2.6 #4-5 |
| Grenzfall 8 (zwei getrennte Links) | Unit + E2E | `docx/hyperlink.test.ts` #8, `odt/hyperlink.test.ts` #9 |
| Grenzfall 9 (`javascript:`) | Unit + E2E | `url.test.ts` #2-3, §2.6 #8-9, §2.9 #3, §2.15 |
| Grenzfall 10 (`hard_break`) | Unit + E2E | `docx/hyperlink.test.ts` #9, `odt/hyperlink.test.ts` #10, §2.12 #6 |
| Grenzfall 11 (Tabellenzelle) | Unit | `docx/hyperlink.test.ts` #12, `odt/hyperlink.test.ts` #14 |
| Grenzfall 12 (Überschrift) | Unit | `docx/hyperlink.test.ts` #11, `odt/hyperlink.test.ts` #13 |
| Grenzfall 13 (leerer Listenpunkt/Zelle) | Unit + E2E | `docx/hyperlink.test.ts` #13, §2.5 #4 |
| Grenzfall 14 (Selection-Sync-Regression) | E2E | §2.11, Pflichtsequenz |
| Grenzfall 15 (reale Word-DOCX) | E2E | §2.12 #5 |
| Grenzfall 16 (überlappende ODT-Fixture) | Unit + E2E | `odt/hyperlink.test.ts` #11, §2.13 #6 |
| Grenzfall 17 (interner Sprungziel `w:anchor`) | Unit | `docx/hyperlink.test.ts` #14, `external-fixtures.test.ts` §1.5 #3 |
| Grenzfall 18 (Cross-Format ODT→DOCX) | E2E | §2.12 #7 |
| Grenzfall 19 (Doppelklick) | E2E | §2.8 #4 |
| Abschnitt 5.1 (DOCX-Rundreise 1-7) | E2E | §2.12 |
| Abschnitt 5.2 (ODT-Rundreise 1-6) | E2E | §2.13 |
| Abschnitt 5.3 (doppelte Rundreise) | E2E | §2.14 |
| Abschnitt 6 (Testplan-Hinweise 1-12) | Unit + E2E | vollständig auf Abschnitt 1/2 dieses Plans abgebildet, siehe Zeilen oben |
| Abschnitt 7 (Freigabekriterium) | Unit + E2E + manuell | Abschnitt 4 dieses Plans |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „fehlt" → „vorhanden")

- [ ] `npm test` grün, inkl. `shared/__tests__/url.test.ts`,
      `shared/editor/__tests__/linkCommands.test.ts`,
      `docx/__tests__/hyperlink.test.ts`, `odt/__tests__/hyperlink.test.ts`
      (alle neu), sowie erweiterte `docx/__tests__/external-fixtures.test.ts`
      und `odt/__tests__/external-fixtures.test.ts`.
- [ ] `npm run test:e2e` grün, inkl. `tests/e2e/hyperlink.spec.ts`.
- [ ] Kein Test in `hyperlink.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`setLink`/`removeLink`/`insertLinkText`/`sanitizeHref`/
      `normalizeHref` direkt auf — stichprobenartig per Review bestätigt.
- [ ] **Kritischer Punkt (Befund 0.4):** In Regressionstest 1.1 #1 ist vor dem
      Reader-Fix **nur die `href`-Assertion** rot, die **Text-Erhalt-Assertion
      bereits grün** (belegt: kein Datenverlust); nach dem Fix sind beide grün.
      `rtl.docx`-Import (§2.12 #5) bestätigt Text **und** Link vollständig
      erhalten. (Kein Test behauptet an irgendeiner Stelle einen Textverlust.)
- [ ] **Kritischer Punkt (Befund 0.5):** In Regressionstest 1.1 #2 ist vor dem
      Reader-Fix **nur die `href`-Assertion** rot, die **Text-Erhalt-Assertion
      bereits grün**; nach dem Fix beide grün. Alle vier inhaltstragenden
      ODT-Fixtures (§2.13 #5) bestätigen Text **und** Link vollständig erhalten.
- [ ] **Determinismus (§2.0.1):** Jede caret-bewegende Tastenaktion in
      `hyperlink.spec.ts` ist vor der Folgetaste durch den `waitForTimeout(50)`
      aus `selection-regression.spec.ts` abgesichert (insb. §2.11 vor `Enter`);
      Dialogfelder werden per `fill()` befüllt; Negativ-Assertions haben einen
      positiven Sync-Punkt (`role="alert"` sichtbar). Suite ist auf **allen**
      Projekten (`Desktop Chrome`, `Mobile`, `Tablet`) mehrfach hintereinander
      grün (kein Retry-Maskieren einer Race-Condition).
- [ ] **Kritischer Punkt (Befund 0.7):** `TargetMode="External"` und
      `RELATIONSHIP_TYPES.hyperlink` sind mit unabhängigem Parser verifiziert
      (`docx/hyperlink.test.ts` #3, `hyperlink.spec.ts` §2.12 #1) **und**
      manuell in echtem Microsoft Word ohne Reparaturmeldung bestätigt
      (Abschnitt 1.9).
- [ ] **Round-Trip-Falle (`hyperlink-einfuegen-code.md` §2.4) widerlegt:**
      `docx/hyperlink.test.ts` #7/#16 und `odt/hyperlink.test.ts` #7/#12 sowie
      `hyperlink.spec.ts` §2.7 #3-4 bestätigen, dass die Standardoptik-
      Stilreferenz **kein** zusätzliches `textColor`/`underline`-Mark nach
      Rundreise erzeugt.
- [ ] **`escapeXml`-Fix auf `Relationship.target` (`hyperlink-einfuegen-code.md`
      §2.1) verifiziert:** Abschnitt 1.8, behavior-preserving für alle
      bestehenden Relationship-Typen bestätigt.
- [ ] **`hard_break`-Marks-Fix (`hyperlink-einfuegen-code.md` §2.2) verifiziert:**
      `docx/hyperlink.test.ts` #9, `odt/hyperlink.test.ts` #10,
      `hyperlink.spec.ts` §2.12 #6.
- [ ] **Dedup-Guard gegen doppelte `link`-Marks (`hyperlink-einfuegen-code.md`
      §2.3) verifiziert:** `odt/hyperlink.test.ts` #11,
      `invalid_simple_overlapping_hyperlinks.odt`-Test (§2.13 #6) bestätigt
      genau einen `link`-Mark pro Textknoten, kein Absturz.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 4 (1-19) hat mindestens einen
      grünen Test, der ihn entweder als „bestätigt funktionsfähig" oder als
      „bewusst dokumentierte Einschränkung" (Grenzfall 3, 17) schließt.
- [ ] Alle Rundreise-Anforderungen aus Abschnitt 5 (5.1.1-5.1.7, 5.2.1-5.2.6,
      5.3.1-5.3.3) grün, inklusive der unabhängigen XML-Validierung
      (Abschnitt 2.12/2.13 dieses Plans).
- [ ] **Sicherheitsgrenzfall `javascript:` (4.9) geklärt und abgesichert:**
      `url.test.ts` #2-3, `hyperlink.spec.ts` §2.6 #8-9, §2.9 #3, §2.15
      grün; kein tatsächlich ausgeführter Code in keinem der Testfälle.
- [ ] Selection-Sync-Regressionssequenz (Grenzfall 4.14,
      `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) ist mit einer Link-Einfüge-
      Sequenz nachgestellt und grün (`hyperlink.spec.ts` §2.11).
- [ ] Design-Entscheidungen aus `hyperlink-einfuegen-code.md` Abschnitt 3/5
      (Autopräfix `https://`, `javascript:` ablehnen statt neutralisieren,
      Standardoptik über Formatvorlage statt Inline-Styling, Mark-Reihenfolge
      `strike, link, textColor`, Klickverhalten, aktiver Button-Zustand) sind
      jeweils mit mindestens einem grünen Test belegt (siehe Mapping-Tabelle
      Abschnitt 3).
- [ ] Manuelle Einmalvalidierung einer exportierten Test-DOCX/-ODT mit
      Hyperlink gegen `python-docx`/echtes Microsoft Word bzw. LibreOffice
      durchgeführt und Ergebnis vermerkt (Abschnitt 1.9).
- [ ] `hyperlink-bearbeiten` und `hyperlink-entfernen` (Backlog-Nachbarslugs,
      siehe Geltungsbereich der Anforderung) sind über dieselbe Testsuite
      mit abgenommen — kein separater QA-Durchlauf für diese beiden Slugs
      nötig, da vollständig in Abschnitt 2.4/2.5 dieses Plans abgedeckt.
