# Anforderungsspezifikation: Feature „Ausrichtung zentriert“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Slug `ausrichtung-zentriert`, Abschnitt 2.3
„Absatzformatierung“, Priorität 1/essenziell) als **vorhanden** geführt, Beschreibung
dort: „Richtet den Absatz zentriert aus.“ Diese Datei ersetzt die Beschreibung nicht,
sondern macht sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt
über echte Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Die Absatzausrichtung „zentriert“ (`align: 'center'` auf den
Node-Attributen `paragraph`/`heading` im gemeinsamen ProseMirror-Schema,
`src/formats/shared/schema.ts`). Die drei Geschwister-Werte `left`/`right`/`justify`
sind eigene Backlog-Einträge (`ausrichtung-links`, `ausrichtung-rechts`,
`ausrichtung-blocksatz`) mit je eigener Anforderungsdatei; sie teilen sich mit
„zentriert“ **vollständig** Datenmodell, Befehle (`setAlign`/`isAlignActive`) und
UI-Komponente (`AlignButton`) — es gibt **keinen** eigenen Code-Pfad nur für
„zentriert“. Deshalb betrifft jeder hier gefundene Fehler mit hoher Wahrscheinlichkeit
auch die anderen drei Ausrichtungen; wo das der Fall ist, wird es benannt, aber stets
aus der Perspektive „was bedeutet das für `center`“ bewertet, und alle Testfälle
verlangen explizit den Wert `center`. Gilt für **beide** Formate, DOCX und ODT, sowohl
beim Import einer bestehenden Datei als auch beim Export eines im Editor
erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich dem Original). Stil und Gliederung
orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` (dort Abschnitt 4
„Absatzformatierung“) sowie an den Geschwisterdateien `specs/ausrichtung-blocksatz-req.md`
und `specs/ausrichtung-rechts-req.md`.

> **PO-Revisionshinweis (diese Fassung).** Diese Datei existierte bereits aus einem
> früheren Durchlauf und wurde erneut gegen den tatsächlichen Quellstand geprüft
> (`schema.ts`, `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`, `docx/reader.ts`,
> `docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts`, `styleRegistry.ts` sowie die
> installierten `prosemirror-state`/`prosemirror-transform`-Quellen) — **jede** darin
> zitierte Zeilenangabe und jedes Codezitat hat sich als weiterhin exakt zutreffend
> bestätigt, auch gegenüber `ausrichtung-zentriert-code.md` und `ausrichtung-zentriert-qa.md`
> (die dieselben Fundstellen unabhängig nachgeprüft haben). An drei Stellen war die Anforderung
> selbst aber unvollständig bzw. unentschieden, obwohl das direkt aus dem Code oder aus dem
> Backlog ableitbar war — diese Fassung schließt die Lücken, statt sie zu übernehmen:
> (a) ein bisher **nicht als Anforderung erfasster** Bedienbarkeits-Fehler — der
> „Zentriert“-Button ist rein tastaturgesteuert (Tab-Fokus + Enter/Leertaste, ohne Maus)
> **nicht** auslösbar, da `AlignButton` nur `onMouseDown` verdrahtet; das war bislang nur
> eine Nebenbeobachtung in `ausrichtung-zentriert-code.md` Abschnitt 2.5 und mühsam auf
> Testfall 19 (der eigentlich vom Tastenkürzel handelt) zurückgebogen — jetzt eigener
> Anforderungspunkt mit eigenem Testfall (siehe 2 Zeile 6, 3.11, Grenzfall 16, Risiko 12,
> Testfall 36); (b) die Rundreise-Anforderung in Abschnitt 5.3 und Abnahmekriterium 6 setzten
> stillschweigend voraus, dass Cross-Format-Export über die Oberfläche bereits möglich ist —
> laut Backlog ist `speichern-unter-format` („Zielformat beim Export wählen“) aber weiterhin
> als **„fehlt“** geführt, und `tests/e2e/roundtrip-fidelity.spec.ts:256-257` führt beide
> Cross-Format-Richtungen bewusst als `test.skip` mit exakt diesem Slug als Begründung — analog
> zu `einfuegen-req.md`/`datei-oeffnen-req.md` jetzt explizit als Abhängigkeit vermerkt (siehe
> 5.3, Abnahmekriterium 6); (c) Abschnitt 9 („Offene Entscheidungen“) listete sieben Fragen, ohne
> sie zu beantworten, obwohl genau das die Aufgabe des Product Owners ist und
> `ausrichtung-zentriert-code.md` Abschnitt 5 bereits einen zur Übernahme geeigneten
> Entscheidungsvorschlag enthält — alle sieben sind jetzt entschieden (Abschnitt 9), die
> Nummerierung 1–7 bleibt unverändert, damit die Querverweise aus `-code.md`/`-qa.md`
> (`9.1`–`9.7`) weiter stimmen. Bestehende Nummerierungen (Testfälle 1–35, Grenzfälle 1–15,
> Risiken 1–11) wurden **nicht** verändert, um die Traceability-Matrizen der bereits
> vorliegenden `-code.md`/`-qa.md`-Dateien nicht zu invalidieren; alle Ergänzungen sind neue,
> angehängte Nummern.

> **PO-Revisionshinweis (erneute Prüfung, aktueller Durchlauf).** Diese Fassung wurde ein
> weiteres Mal unabhängig gegen den tatsächlichen Quellstand nachgeprüft — konkret erneut
> gelesen und zeilenweise abgeglichen: `schema.ts` (Attribut-Default/Validate, `parseDOM`,
> `toDOM` für `paragraph` **und** `heading`), `commands.ts` (`setAlign`, `isAlignActive`,
> `setHeading`), `Toolbar.tsx` (vollständige Button-Reihenfolge Formatvorlage → Fett/Kursiv/
> Unterstrichen/Durchgestrichen → Textfarbe/Hervorhebung → **Ausrichtung** → Liste, sowie
> `onMouseDown`-only/fehlendes `aria-label`/`title`-Text bei `AlignButton` versus
> `aria-label={title}` bei `MarkButton`), `WordEditor.tsx` (Keymap ohne Ausrichtungs-Kürzel,
> `dispatchTransaction` via `view.state.apply(tr)`), `docx/reader.ts` (`JC_TO_ALIGN`-Tabelle),
> `odt/styleRegistry.ts` (`PARAGRAPH_ALIGN_STYLE_NAME`, `headingStyleName`), der installierte
> `prosemirror-state`-Quellcode (`applyInner`, `tr.before.eq(this.doc)`-Prüfung) sowie die
> Existenz der in Abschnitt 5 referenzierten Fixture-Dateien (`bug-paragraph-alignment.docx`,
> `table-alignment.docx`, `TestTableCellAlign.docx`, `rtl.docx`, `CharacterParagraphFormat.odt`
> u. a. — alle im Repo vorhanden) und der `test.skip`-Stellen in
> `tests/e2e/roundtrip-fidelity.spec.ts` für die Cross-Format-Fälle. **Ergebnis: jede zitierte
> Codestelle und jeder daraus abgeleitete Befund hat sich als weiterhin exakt zutreffend
> bestätigt**, einschließlich des als „wichtigster Einzelpunkt“ markierten Mehrfachabsatz-Fehlers
> in `setAlign` (Abschnitt 3.2) und des fehlenden `onClick`/`onKeyDown` an `AlignButton`
> (Abschnitt 3.11). Einzige Korrektur dieses Durchlaufs: die Zeilenangabe zu `toDOM` in der
> Tabelle in Abschnitt 1 war um eine Zeile ungenau (`21,36` statt `21-22,35-36`, da die
> `style="text-align:…"`-Zeile beim Absatz auf der Zeile **nach** der `toDOM(node) {`-Signatur
> steht) und wurde präzisiert; inhaltlich änderte das nichts. Keine der sieben+eins in
> Abschnitt 9 getroffenen Entscheidungen, keines der 36 Testfälle, keiner der 16 Grenzfälle und
> keines der 12 Risiken musste geändert werden — diese Anforderungsdatei gilt damit als
> inhaltlich stabil und weiterhin als verbindliche Grundlage für Dev/QA.

> **PO-Revisionshinweis (dritter unabhängiger Check, aktueller Durchlauf).** Diese Fassung
> wurde ein drittes Mal vollständig gegen den aktuellen Quellstand nachgeprüft — jede in
> Abschnitt 1 zitierte Zeile erneut einzeln gelesen und abgeglichen: `schema.ts:4,19-23,29,
> 31-37`, `commands.ts:8,10,13-27,29-38,40-55`, `Toolbar.tsx:74,91-111,235`,
> `WordEditor.tsx:85-107,122-133`, `docx/reader.ts:14,236-241`, `docx/writer.ts:18,69-71`,
> `odt/reader.ts:37-68`, `odt/styleRegistry.ts:61-66,80-89`, `odt/writer.ts:88-97`, sowie der
> installierte `prosemirror-state`-Quellcode (`applyInner`, Zeile 830-832: `if
> (!tr.before.eq(this.doc)) throw new RangeError(...)`) und `prosemirror-transform`
> (`get before()`, Zeile 1950). Zusätzlich erneut geprüft: alle zehn in Abschnitt 5
> referenzierten Fixture-Dateien (per Dateisystemzugriff bestätigt vorhanden), die
> `FEATURE-BACKLOG.md`-Einträge `ausrichtung-zentriert` (Zeile 113, weiterhin „vorhanden“,
> Priorität 1, identischer Beschreibungstext), `speichern-unter-format` (Zeile 59, weiterhin
> „fehlt“) sowie `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` (Zeilen 250-251, weiterhin
> „fehlt“ — relevant für Grenzfall 12), und die `test.skip`-Stellen für die Cross-Format-Fälle
> in `tests/e2e/roundtrip-fidelity.spec.ts:254-257`. Diese Prüfung war unabhängig von den
> beiden vorherigen (anderer Zeitpunkt, während parallel an einem **anderen** Feature im
> selben Arbeitsbaum entwickelt wurde — genau das Szenario, in dem eine Spec sonst leicht
> gegenüber dem Code veraltet). **Ergebnis: Ausnahmslos jede zitierte Codestelle, jede
> Zeilenangabe und jeder daraus abgeleitete Befund — einschließlich des Mehrfachabsatz-
> `RangeError` in `setAlign` (3.2, weiterhin der wichtigste Einzelpunkt) und des fehlenden
> `onClick`/`onKeyDown` an `AlignButton` (3.11) — hat sich als unverändert zutreffend
> bestätigt.** Es gab in diesem Durchlauf **keine** inhaltliche Korrektur: keine der acht
> Entscheidungen in Abschnitt 9, keiner der 36 Testfälle, keiner der 16 Grenzfälle und
> keines der 12 Risiken musste geändert werden. Diese Anforderungsdatei bleibt damit die
> geprüfte, verbindliche Grundlage für Dev/QA.

---

## 1. Kontext & Ist-Zustand (Codeanalyse, gegen den aktuellen Quellstand geprüft)

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis der
Korrektheit — das ist Aufgabe der Verifikation; Code-Vorhandensein wurde bisher mit
„funktioniert“ verwechselt, das ist der Grund für diese Anforderung). Der in Abschnitt 3
beschriebene Kernfehler wurde zusätzlich gegen den tatsächlich installierten
ProseMirror-Quellcode geprüft (`node_modules/prosemirror-state/dist/index.js`,
`node_modules/prosemirror-transform/dist/index.js`).

| Ebene | Fundstelle | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts:4` | `alignAttr = { align: { default: 'left', validate: 'string' } }`, angewendet auf `paragraph` (Zeile 19) **und** `heading` (Zeile 29). `validate: 'string'` erlaubt **jeden** String, **kein** Enum — die vier gültigen Werte `left/center/right/justify` sind nirgends auf Schema-Ebene erzwungen. |
| Editor-Rendering | `src/formats/shared/schema.ts:21-22,35-36` | `toDOM` schreibt `style="text-align: ${node.attrs.align}"` direkt auf `<p>` bzw. `<h1>`–`<h6>`. Ein ungültiger Wert würde als ungültiges CSS stillschweigend ignoriert (Browser-Fallback `text-align: start`), nicht abgefangen. |
| HTML-/Paste-Import | `src/formats/shared/schema.ts:20,33` | `parseDOM getAttrs` liest `(dom as HTMLElement).style.textAlign || 'left'` — nur das **inline** `style`-Attribut, keine CSS-Klassen/Stylesheet-Regeln, keine berechneten Werte. |
| Befehl „Setzen“ | `src/formats/shared/editor/commands.ts:13-27` | `setAlign(align)`: iteriert per `state.doc.nodesBetween(from, to, …)` über **alle** treffenden Blöcke der Selektion und ruft für **jeden einzelnen** `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf (Zeile 21). `state` ist die ursprüngliche, über die ganze Schleife **unveränderte** Closure-Variable; `state.tr` erzeugt bei jedem Zugriff eine **neue**, aber immer vom selben Ausgangsdokument abgeleitete Transaktion. → siehe Abschnitt 3, **Kernverdacht** (bestätigter Fehler). |
| Befehl „Aktiv-Zustand“ | `src/formats/shared/editor/commands.ts:29-38` | `isAlignActive(state, align)` prüft **nur** den alignierbaren Vorfahren an `$from` (Selektionsanfang), nicht die gesamte Selektion, und vergleicht strikt `node.attrs.align === align`. |
| Formatvorlagen-Wechsel | `src/formats/shared/editor/commands.ts:40-55` | `setHeading(level)`: setzt beim Wechsel **zu** einer Überschrift `attrs = { level, align: 'left' }` (Zeile 43) — **hart „links“**, unabhängig von der vorher gesetzten Ausrichtung; beim Wechsel **zurück** zu „Standard“ (`level === null`) wird `attrs = undefined` übergeben → Schema-Default `'left'` greift. Beide Richtungen verwerfen also eine zuvor gesetzte Zentrierung. Wirkt nur bei Einzelblock-Selektion (`if (!$from.sameParent($to)) return false`, Zeile 45). |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:91-111,235` | Eigene Komponente `AlignButton` (kein Wrapper von `MarkButton`). Instanz für „zentriert“: `<AlignButton view={view} align="center" label="↔" />` (Zeile 235). `title={`Ausrichtung: ${align}`}` → rendert wörtlich „Ausrichtung: center“ (interner Bezeichner, kein deutsches Wort). `aria-pressed={active}`, `onMouseDown` mit `preventDefault()` → `setAlign('center')`. **Kein** `aria-label` — im Unterschied zu `MarkButton`, das `aria-label={title}` setzt (Zeile 74). |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx:85-107` | Keymap bindet `Mod-z`/`Mod-y`/`Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b`/`Mod-i`/`Mod-u`, `Shift-Delete` (Ausschneiden) — **kein** Kürzel für irgendeine Ausrichtung (Word/LibreOffice-Standard für „zentriert“ wäre Strg+E). |
| DOCX-Import | `src/formats/docx/reader.ts:14,236-241,253-254` | `JC_TO_ALIGN = { left, center, right, both→justify }` (Zeile 14). Der Reader liest zwar `w:pStyle` (Zeile 236-237, `styleId`), verwendet es aber **ausschließlich** zur Ermittlung der Überschriftsebene (`headingLevelForStyle`, Zeile 241) — **nicht** für die Ausrichtung. Die Ausrichtung stammt **allein** aus dem direkten `<w:pPr><w:jc w:val="…"/>` des Absatzes (Zeile 238-240); ein fehlendes oder unbekanntes `w:jc` (`start`, `end`, `distribute` u. a.) fällt über `?? 'left'` still auf „links“ zurück. Eine über die Formatvorlage in `styles.xml` geerbte Ausrichtung wird **nie** ausgewertet. |
| DOCX-Export | `src/formats/docx/writer.ts:18,69-71` | `JC_BY_ALIGN = { …, justify→both }`. `paragraphPropsXml` schreibt bei **jedem** Absatz/jeder Überschrift explizit `<w:jc w:val="${jc}"/>`, auch für „links“ (Default wird nicht weggelassen); unbekannter `align`-Wert → Fallback `'left'`. |
| ODT-Import | `src/formats/odt/reader.ts:37-68,178,259,364,374` | `parseAutomaticStyles` liest `fo:text-align` **nur** aus `style:style`-Elementen mit `style:family="paragraph"` in `office:automatic-styles` (Zeile 63-66) in die Map `paragraphAligns`. Für den **Fließtext** wird ausschließlich `office:automatic-styles` aus `content.xml` herangezogen (Zeile 364); die aus `styles.xml` geparsten Automatikstile (Zeile 374) dienen nur den Kopf-/Fußzeilen. Weder `office:styles` (benannte/gemeinsame Formatvorlagen) noch eine `style:parent-style-name`-Vererbungskette werden aufgelöst. Ohne Treffer: Fallback `'left'` (Zeile 178, 259). |
| ODT-Export | `src/formats/odt/writer.ts:88-97` + `src/formats/odt/styleRegistry.ts:61-72,80-89` | Für jede Ausrichtung ein fester Automatikstil: `PARAGRAPH_ALIGN_STYLE_NAME` (`Ppara-center` u. a., mit `fo:text-align="center"`, `parent-style-name="Standard"`) bzw. `headingStyleName(level, align)` → `Heading{level}-center`. Referenziert über `text:style-name` auf `<text:p>`/`<text:h>`; unbekannter Wert → Fallback `PARAGRAPH_ALIGN_STYLE_NAME.left`. |
| Unit-Rundreise-Tests | `src/formats/docx/__tests__/roundtrip.test.ts:47-50,54-58` und `src/formats/odt/__tests__/roundtrip.test.ts` (analog) | Je ein Test „preserves heading alignment“ mit `center` (Zeile 47-50) und ein `it.each(['left','center','right','justify'])('preserves "%s" alignment', …)` für Absätze (Zeile 54-58). Prüft **ausschließlich** Writer→eigener-Reader an **einem einzelnen, isolierten** Absatz/Heading — nie eine Mehrfachabsatz-Selektion, nie innerhalb Tabellenzelle/Liste, nie über einen Formatvorlagen-Wechsel, nie gegen eine externe Referenz. |
| E2E-Test (Browser) | `tests/e2e/roundtrip-fidelity.spec.ts:56-58,128-129,178-179,242-243` + Fixture `tests/e2e/fixtures/richDocument.ts:87,141` | **Es gibt bereits** einen echten Browser-Rundreisetest, der prüft, dass ein **zentrierter** Absatz Upload → unveränderter Export → Re-Import in **beiden** Formaten übersteht (Kriterium 4, `toHaveCSS('text-align', 'center')`). **Aber:** Er importiert eine **vorkonstruierte** Datei mit `<w:jc w:val="center"/>` (DOCX) bzw. `fo:text-align="center"` (ODT-Stil „Centered“) — er **klickt nie** den „Zentriert“-Button, ruft also `setAlign` **nie** auf, und enthält nur **einen einzigen** zentrierten Absatz. Der eigentliche Bedien-Pfad (Button → `setAlign`) und der Mehrfachabsatz-Fall (Abschnitt 3) sind damit von **keinem** Test abgedeckt. |
| Reale Testfixtures (vorhanden, für Ausrichtung ungenutzt) | `tests/fixtures/external/docx/`, `tests/fixtures/external/odt/` | Einschlägige, im Repo vorhandene Dateien: `bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx`, `rtl.docx` (DOCX) sowie `CharacterParagraphFormat.odt`, `CharacterParagraphFormat_MSO15.odt`, `feature_attributes_paragraph_MSO2013.odt`, `feature_attributes_paragraph_MSO2013_doc-AO.odt`, `paragraphWithPageStyle.odt`, `tabelleAlignMargin.odt` (ODT) — bislang **nicht** gezielt gegen korrekt erkannte Ausrichtung geprüft (nur „importiert ohne Absturz“). |

**Konsequenz:** Der Backlog-Status „vorhanden“ trifft für die reine Existenz des
Mechanismus (Button, Command, Reader/Writer-Zeilen) sowie für die **Einzelabsatz-**
Import→Export-Rundreise (durch `roundtrip-fidelity.spec.ts` tatsächlich abgesichert) zu.
Er ist aber unbelegt bzw. **nachweislich fehlerhaft** in Bezug auf die tatsächliche
Button-Bedienung (`setAlign`), den Mehrfachabsatz-Fall, den Formatvorlagen-Wechsel,
Fremddateien mit stilbasierter Ausrichtung sowie Verschachtelung in Tabellen/Listen.
Abschnitt 3 und die Risikoliste in Abschnitt 7 benennen die konkreten Verdachtspunkte.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Ist-Verhalten laut Code | Soll-Verhalten |
|---|---|---|---|---|
| 1 | Toolbar-Button „Zentriert“ (Glyphe `↔`) | Formatierungsleiste, Gruppe Absatzausrichtung (nach der Farb-Gruppe, vor der Listen-Gruppe), zweiter von vier Buttons (nach „Links“, vor „Rechts“/„Blocksatz“) | `AlignButton align="center" label="↔"`, `onMouseDown` → `preventDefault()` + `setAlign('center')` | Klick setzt die Ausrichtung **aller** von der Selektion bzw. der Schreibmarke berührten `paragraph`/`heading`-Blöcke auf `center`, in **einem** atomaren, mit **einem** Strg+Z rückgängig machbaren Vorgang. Muss unabhängig von Maus-Selektion, Tastatur-Selektion, Cursor ohne Selektion oder „Alles auswählen“ funktionieren (siehe Abschnitt 3 — aktuell im Mehrfachabsatz-Fall **defekt**). |
| 2 | Aktiv-Zustand des Buttons (`aria-pressed`) | derselbe Button | `isAlignActive(state, 'center')`, nur `$from` | Muss anzeigen, ob der Absatz an der Schreibmarke/am Selektionsanfang zentriert ist; aktualisiert sich sofort bei jeder Cursor-Bewegung, auch ohne Klick. Verhalten bei gemischter Mehrfachselektion muss festgelegt und getestet werden (Abschnitt 3.4). |
| 3 | Icon/Beschriftung | derselbe Button | Unicode-Glyphe `↔` (LEFT RIGHT ARROW), keine Text-Alternative außer `title` | Muss auf allen Zielsystemen/Browsern eindeutig als „zentriert“ erkennbar und von `⇤`/`⇥`/`≡` unterscheidbar sein (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 4 und Abschnitt 20.1, Icon-Rendering-Vorbehalt). `↔` ist **zusätzlich semantisch riskant**, da es in vielen UI-Konventionen für „verschieben“/„Breite ändern“ statt „zentrieren“ steht — Umstellung auf ein eindeutiges (idealerweise SVG-)Zentrier-Symbol prüfen. |
| 4 | Tooltip/Titel-Attribut | derselbe Button | `title="Ausrichtung: center"` (interner englischer Bezeichner im ansonsten deutschen UI) | **Zu korrigieren** auf durchgängig deutschen Text (z. B. „Zentriert“ oder „Ausrichtung: zentriert“). Muss per Hover **und** Screenreader tatsächlich vorgelesen/angezeigt werden. Relevant auch für künftige `getByTitle(...)`-E2E-Selektoren. |
| 5 | `aria-label` | derselbe Button | **Nicht gesetzt** (anders als `MarkButton`, `Toolbar.tsx:74`) | Muss geprüft werden, ob ein Screenreader ohne `aria-label` (nur `title`) einen sinnvollen Namen ansagt — der `title`-Fallback auf den zugänglichen Namen ist browserabhängig und keine Garantie. Bei negativem Befund: `aria-label="Zentriert"` ergänzen. |
| 6 | Tastatur-Bedienbarkeit des Buttons selbst (Tab-Fokus + Enter/Leertaste, **ohne** Maus) | derselbe Button | **Defekt, bestätigter Bug.** `AlignButton` (`Toolbar.tsx:91-111`) verdrahtet ausschließlich `onMouseDown` (Z. 98-101), **kein** `onClick`/`onKeyDown`. Ein natives `<button>` löst bei Tastatur-Aktivierung (Tab-Fokus, dann Enter oder Leertaste) ein `click`-, **kein** `mousedown`-Ereignis aus → der Button lässt sich **rein per Tastatur nicht bedienen**, unabhängig vom Tastenkürzel aus Zeile 7. | **Muss behoben werden** (WCAG 2.1.1 „Keyboard“ — jedes interaktive Steuerelement muss ohne Maus bedienbar sein; kein optionales Komfortmerkmal). Ein Klick per Tab+Enter/Leertaste muss `setAlign('center')` identisch zum Mausklick auslösen. Siehe 3.11, Grenzfall 16, Risiko 12, Testfall 36. |
| 7 | Tastenkürzel | Editor, global während Fokus im Dokument | **Nicht vorhanden** | **Entschieden** (Abschnitt 3.10/9.6): Strg/Cmd+E wird ergänzt (Word/LibreOffice-Standard). Zu unterscheiden von Zeile 6 — ein Kürzel ersetzt nicht die native Tastaturbedienbarkeit des Buttons selbst. |
| 8 | Formatvorlagen-Dropdown (Standard/Überschrift 1–6) | Formatierungsleiste, `Toolbar.tsx:165-180` → `setHeading` | Setzt beim Wechsel `align` hart auf „links“ zurück (`commands.ts:43`) | **Interagiert mit diesem Feature:** Ein Wechsel der Formatvorlage darf eine zuvor gesetzte Zentrierung nicht kommentarlos verwerfen (siehe Abschnitt 3.5 und Risiko 7.1 — laut Codeanalyse aktuell doch der Fall). |
| 9 | Kontextmenü/Rechtsklick | — | Nicht vorhanden | Kein Soll-Bestandteil dieser Anforderung; nur zu dokumentieren, falls künftig ein Kontextmenü eingeführt wird — dann muss „Zentriert“ dort erscheinen. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf einen einzelnen Absatz/eine Überschrift (mit oder ohne Selektion)
- Cursor irgendwo in einem Absatz/einer Überschrift platzieren (keine Textselektion
  nötig, da Ausrichtung eine **Block-**, keine Zeicheneigenschaft ist) → Klick auf
  „Zentriert“ → der **gesamte** umschließende Block wird sofort zentriert dargestellt,
  unabhängig von der Cursor-Position innerhalb des Blocks und davon, ob/wie viel Text
  markiert war.
- Gilt identisch für eine Überschrift (Ebene 1–6).
- Für den Einzelblock-Fall erzeugt die Aktion **einen** eigenständigen Undo-Schritt.

### 3.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften — **bestätigter kritischer Fehler**

> **Durch Codeanalyse hergeleiteter und gegen den installierten ProseMirror-Quellcode
> bestätigter Fehler** (muss dennoch zusätzlich im echten Browser/E2E nachgewiesen
> werden, bevor er als endgültig verifiziert gilt — die Bestätigung erfolgte bisher
> über die Bibliotheks-Interna, nicht über eine laufende Editor-Instanz):
>
> `setAlign` (`commands.ts:13-27`) ruft für **jeden** in der Selektion gefundenen
> alignierbaren Block `dispatch(state.tr.setNodeAttribute(pos, 'align', 'center'))` auf,
> wobei `state` über die gesamte Schleife die **ursprüngliche**, unveränderte
> `EditorState`-Instanz bleibt (die Closure-Variable wird nie neu zugewiesen).
> `WordEditor.tsx:125-132` implementiert `dispatchTransaction` als
> `view.state.apply(tr)` — angewandt auf das zum jeweiligen Zeitpunkt **aktuelle**
> `view.state`. Nach dem **ersten** `dispatch()` hat sich `view.state.doc` bereits
> geändert (erster Block ist jetzt zentriert); die **zweite** Transaktion wird aber
> weiterhin aus dem **alten** `state` gebaut, ihr `tr.before` ist also das
> Ausgangsdokument.
>
> Der installierte ProseMirror-State prüft in `applyInner`
> (`node_modules/prosemirror-state/dist/index.js:830-832`) zwingend
> `if (!tr.before.eq(this.doc)) throw new RangeError("Applying a mismatched
> transaction")`, wobei `tr.before` (`node_modules/prosemirror-transform/dist/index.js:1950`,
> `get before()`) das Dokument **vor dem ersten Schritt** ist. Sobald der erste Block
> tatsächlich seinen Wert geändert hat (Normalfall: „links“ → „zentriert“), stimmt
> `tr.before` (Ausgangsdoc) **nicht** mehr mit `this.doc` (bereits geändertes
> `view.state.doc`) überein → **`RangeError` bereits ab dem zweiten betroffenen Block.**
>
> Zu diesem Zeitpunkt ist der erste Absatz bereits zentriert, alle weiteren bleiben
> unverändert, und die Exception ist **unbehandelt** (kein `try`/`catch` in `run()`
> (`Toolbar.tsx:28-31`), kein React-Error-Boundary im `src`-Baum — geprüft, keiner
> vorhanden). Da die Exception im `nodesBetween`-Callback fliegt, wird die Iteration
> abgebrochen; das nachfolgende `view.focus()` in `run()` läuft nicht mehr.
>
> **Praktische Konsequenz:** Der mit Abstand häufigste Anwendungsfall —
> „Strg+A (Alles auswählen, laut Backlog `alles-auswaehlen` bereits „vorhanden“), dann
> Zentriert klicken“ — sowie **jede** Mehrfachabsatz-/Mehrfachzeilen-Selektion (auch
> eine markierte mehrzeilige Liste oder mehrere markierte Tabellenzellen) zentriert
> **nur den ersten** betroffenen Block und schlägt danach ohne sichtbare Rückmeldung
> fehl — ein direkter Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4
> („Kein stiller Fehlschlag“). Das erklärt, warum der Status „vorhanden“ vergeben
> wurde: Weder die Unit-Tests (`roundtrip.test.ts`, nur Einzelabsatz) noch der einzige
> E2E-Ausrichtungstest (`roundtrip-fidelity.spec.ts`, ein einzelner **vorkonstruiert**
> zentrierter Absatz, kein Button-Klick) decken je mehr als einen Absatz gleichzeitig
> ab oder rufen `setAlign` überhaupt auf.
>
> **Erschwerend:** Nach dem Teilfehlschlag steht `$from` im ersten (nun zentrierten)
> Absatz, sodass `isAlignActive` (`commands.ts:29-38`) den Button als „aktiv“ anzeigt —
> die UI signalisiert also fälschlich „ganze Selektion zentriert“, obwohl nur ein
> Absatz betroffen ist.
>
> Dieser Punkt ist der **wichtigste Einzelpunkt dieser gesamten Anforderungsdatei** und
> muss als Erstes verifiziert werden (Testfall 8.3/8.4). Er ist identisch zu dem in
> `specs/ausrichtung-blocksatz-req.md` Abschnitt 2.2 dokumentierten Kernverdacht — beide
> Dateien beschreiben denselben, gemeinsam genutzten `setAlign`-Fehler.

**Soll-Verhalten (nach Behebung):** Anwenden von „Zentriert“ auf eine Selektion über N
Blöcke muss **alle** N Blöcke (2, 20, 200 — inklusive Blöcke in Listenpunkten und
Tabellenzellen) in **einem** atomaren Vorgang (ein einziger Undo-Schritt, ein einziger
`onChange`-Aufruf) auf `center` setzen, ohne Exception. Die naheliegende Behebung ist,
in `setAlign` **eine** Transaktion über die ganze Selektion aufzubauen (`let tr =
state.tr; …; tr.setNodeAttribute(pos, 'align', align); …; dispatch(tr)` **nach** der
Schleife) statt N Einzeldispatches; die konkrete Umsetzung liegt beim Dev, die
Anforderung fordert nur das beobachtbare Ergebnis.

### 3.3 Kein Toggle-Aus — Ausrichtung ist ein exklusiver Vier-Zustand
- Anders als Fett/Kursiv/Unterstrichen/Durchgestrichen (echte Toggle-Marks) gibt es
  **kein** „Aus“: Ein bereits zentrierter Absatz bleibt bei erneutem Klick auf
  „Zentriert“ zentriert (keine Rückkehr zu „links“). Um die Zentrierung aufzuheben,
  muss aktiv eine der drei anderen Ausrichtungen geklickt werden.
- Die vier Buttons verhalten sich wie eine Radio-Gruppe: zu jedem Zeitpunkt ist genau
  einer der vier Zustände aktiv, nie zwei zugleich und nie keiner (Ausnahme: ein aus
  einer Fremddatei importierter Fremdwert wie `start`/`end`, siehe 4.2/7.3, für den
  **kein** Button aktiv ist).
- **Entschieden (siehe 9.1):** Ein erneuter Klick auf den bereits aktiven „Zentriert“-Button
  darf **keinen** zusätzlichen, wirkungslosen Undo-Schritt erzeugen (No-Op-Kurzschluss, wenn
  bereits alle betroffenen Blöcke `align: 'center'` haben). `setAlign` setzt aktuell
  unbedingt via `setNodeAttribute`, ohne den Vorwert abzufragen — das erzeugt einen
  wirkungslosen Undo-Schritt und ist zusammen mit der Behebung von 3.2 zu beheben, nicht
  separat (Grenzfall 9).

### 3.4 Aktiv-Zustand-Anzeige bei gemischter Selektion
- `isAlignActive` berechnet den Zustand nur aus dem alignierbaren Vorfahren von `$from`.
  Bei einer Selektion, die mit einem zentrierten Absatz **beginnt**, aber weitere,
  anders ausgerichtete Absätze enthält, zeigt der „Zentriert“-Button „aktiv“, obwohl ein
  (funktionierender) Klick alle betroffenen Absätze überschreiben würde. **Entschieden
  (siehe 9.5):** aktiv nur, wenn **alle** von der Selektion betroffenen Blöcke `center`
  sind (Word/LibreOffice-Analogie); bei gemischter Selektion ist **kein** Button aktiv.

### 3.5 Zusammenspiel mit dem Formatvorlagen-Dropdown (Standard/Überschrift 1–6)
- **Kernanforderung, entschieden (siehe 9.2):** Wird ein bereits zentrierter Absatz über das
  Dropdown in eine Überschrift umgewandelt (oder umgekehrt, oder von einer Überschriftsebene
  in eine andere), **muss die bestehende Zentrierung erhalten bleiben**, sofern die Nutzerin
  sie nicht aktiv ändert.
- Laut Codeanalyse (`commands.ts:43`, `attrs = { level, align: 'left' }` bzw.
  `attrs = undefined` → Schema-Default `'left'`) ist genau das aktuell **nicht** der
  Fall — jeder Formatvorlagen-Wechsel setzt die Ausrichtung hart auf „links“ zurück. Dies
  ist ein zu behebender Bug (Risiko 7.2), **kein** akzeptierter oder bewusst gewollter
  Ist-Zustand — ein „Formatvorlage setzt Ausrichtung zurück“-Verhalten wird hiermit
  ausdrücklich **nicht** als Soll akzeptiert.

### 3.6 Interaktion mit Listen und Tabellenzellen
- Ein Absatz innerhalb eines Listenpunkts (`list_item > paragraph`) oder einer
  Tabellenzelle (`table_cell > paragraph`) muss sich identisch zentrieren lassen wie ein
  freistehender Absatz — `alignableTypes` prüft nur den Node-Typ, nicht die
  Elternstruktur. Bislang durch **keinen** Test (Unit oder E2E) belegt.
- Bei einem zentrierten Listenpunkt wird — wie in Word/LibreOffice üblich — nur der
  **Textinhalt** zentriert, das Aufzählungszeichen/die Nummer bleibt an seiner Position.
  Dieses Verhalten ist zu bestätigen, nicht anzunehmen.
- Eine Selektion, die **mehrere** Listenpunkte oder Tabellenzellen umfasst (z. B. eine
  `CellSelection` aus `prosemirror-tables`), ist ein Spezialfall von 3.2 (mehrere
  alignierbare Blöcke) und löst denselben `RangeError` aus — muss im selben Zug
  mitgeprüft werden.
- Ein zentrierter Absatz in einer über `colspan`/`rowspan` verbundenen Zelle darf keine
  Nebenwirkung auf Nachbarzellen haben.

### 3.7 Visuelle Darstellung
- Im Editor: `text-align: center` auf `<p>`/`<h1>`–`<h6>` (`schema.ts` `toDOM`), sichtbar
  als mittig ausgerichteter Text innerhalb der Satzspiegelbreite der Seitenansicht (siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8).
- Bei mehrzeilig umbrechendem Text muss **jede** einzelne Zeile zentriert sein, auch bei
  sehr kurzem (ein Wort) und sehr langem Inhalt.

### 3.8 Kombination mit Zeichenformatierung
- Zentrierung (Node-Attribut) muss unabhängig von und gleichzeitig mit jeder
  Zeichenformatierung (Fett, Kursiv, Unterstrichen, Durchgestrichen, Schriftfarbe,
  Hervorhebung) auf demselben Textlauf funktionieren — beide Ebenen dürfen sich nicht
  gegenseitig verändern oder verdrängen (unterschiedliche Ebenen: Node-Attribut vs. Mark).

### 3.9 Undo/Redo
- Zentrieren eines einzelnen Absatzes ist ein einzelner, undoable Schritt (Strg+Z macht
  genau diesen Ausrichtungswechsel rückgängig, Strg+Y stellt ihn wieder her).
- Für den Mehrblock-Fall gilt: **nach Behebung** von 3.2 muss ein einzelnes Strg+Z alle
  im selben Klick geänderten Blöcke gemeinsam zurücksetzen (ein Schritt, nicht N) — bis
  dahin nicht sinnvoll prüfbar, da der Vorgang bereits mit der Exception abbricht.
- Selection-Sync-Regressionsgefahr (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2,
  `tests/e2e/selection-regression.spec.ts`, Mechanismus in `WordEditor.tsx:43-50,138-155`):
  Toolbar-Aktion auf „Alles auswählen“ gefolgt von Klick-Neupositionierung darf keine
  Dokumentteile verschlucken. Da der Zentrier-Schritt bei „Alles auswählen“ laut 3.2
  aktuell selbst eine Exception wirft, ist diese Regression erst **nach** Behebung von
  3.2 vollständig durchspielbar; die Kombination beider Fehlerpfade ist explizit zu
  prüfen (Grenzfall 4.11).

### 3.10 Tastenkürzel — **entschieden** (siehe 9.6)
- Strg/Cmd+E wird für „Zentriert“ ergänzt (Word/LibreOffice-Standard) und muss zuverlässig
  funktionieren, solange der Editor fokussiert ist, unabhängig von Selektion/Cursor-Position.
  Die anderen drei Ausrichtungen klären ihr jeweiliges Kürzel in ihrer eigenen
  Anforderungsdatei (`ausrichtung-links/-rechts/-blocksatz-req.md`); diese Datei trifft dafür
  keine Aussage.

### 3.11 Tastatur-Erreichbarkeit des Buttons selbst (unabhängig vom Tastenkürzel) — **bestätigter Fehler**
- Zu unterscheiden von 3.10: Hier geht es **nicht** um ein zusätzliches globales Kürzel,
  sondern darum, dass der „Zentriert“-Button als natives `<button>`-Element wie jedes andere
  interaktive Steuerelement per Tastatur ohne Maus erreichbar und auslösbar sein muss — Tab
  fokussiert den Button, Enter oder Leertaste löst ihn aus.
- **Durch Codeanalyse bestätigt:** `AlignButton` (`Toolbar.tsx:91-111`) registriert
  ausschließlich `onMouseDown` (Z. 98-101, mit `preventDefault()`), keinen `onClick`- und
  keinen `onKeyDown`-Handler. Ein Browser feuert bei Tastatur-Aktivierung eines fokussierten
  `<button>` ein `click`-Ereignis, **kein** `mousedown` — der Handler greift also nicht.
  Praktische Folge: Ein:e Nutzer:in, die ausschließlich mit der Tastatur arbeitet (Screenreader,
  motorische Einschränkung, oder schlicht Tab-Navigation durch die Toolbar), kann den Button
  fokussieren (`aria-pressed`/`title` werden angesagt), aber **nicht aktivieren** — ein
  stiller, nicht einmal per Fehlermeldung sichtbarer Fehlschlag (Verstoß gegen
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4, siehe auch Abschnitt 3.2 dieser Datei für
  den analogen Grundsatz bei einer anderen Aktion).
- **Soll-Verhalten:** Tab-Fokus auf den Button, dann Enter **oder** Leertaste, löst
  `setAlign('center')` identisch zu einem Mausklick aus (gleiche Wirkung auf Selektion,
  Undo-Historie, `aria-pressed`-Update). Der Mausklick-Pfad (`onMouseDown` +
  `preventDefault()`, damit der Editor-Fokus/die Selektion beim Klick erhalten bleibt) darf
  dabei nicht regressieren.
- Betrifft strukturell auch die drei Geschwister-Buttons (`AlignButton` ist eine gemeinsame
  Komponente) sowie potenziell weitere reine `onMouseDown`-Buttons in `Toolbar.tsx` — diese
  Datei fordert die Behebung nur für „Zentriert“ verbindlich ein; die Geschwisterdateien
  entscheiden für sich, ob sie denselben Fund für ihre Ausrichtung ebenfalls verlangen.

---

## 4. Grenzfälle

1. **Zentrierung in einer Fremddatei über eine Formatvorlage statt direkter
   Absatzformatierung** (DOCX: `w:pStyle` verweist auf einen Stil in `styles.xml`, der
   `w:jc w:val="center"` definiert, der Absatz selbst hat kein eigenes `w:jc`; ODT: ein
   referenzierter Stil erbt `fo:text-align="center"` nur über `style:parent-style-name`
   oder liegt in `office:styles`) → laut Abschnitt 1 wird das **nicht** ausgewertet, der
   Absatz würde fälschlich als „links“ importiert. Muss geprüft und bewusst entschieden
   werden — dies ist ein in echten Word-/LibreOffice-Dokumenten gängiges Muster (z. B.
   „Titel“/„Untertitel“-Formatvorlagen, die zentriert vordefiniert sind).
2. **`w:jc`/`fo:text-align`-Werte außerhalb von `left/center/right/both|justify`**
   (`start`, `end`, `distribute`, `thaiDistribute`, `highKashida`/`lowKashida`/
   `mediumKashida`, `numTab`) → fallen still auf „links“ zurück (DOCX `reader.ts:240`)
   bzw. werden roh übernommen (ODT `reader.ts:65-66`) und von **keinem** der vier Buttons
   als aktiv erkannt. Ein Import darf dadurch **keinen** sichtbaren Text verlieren; das
   Fallback-Verhalten für die Ausrichtung ist zu dokumentieren. Für `center` selbst
   unkritisch (der Wert ist eindeutig), aber relevant für Nachbarabsätze in gemischt
   ausgerichteten Testdokumenten.
3. **Formatvorlagen-Wechsel setzt Zentrierung zurück** (siehe 3.5/7.2/9.2, **entschieden:
   Bug**) — zentrierten Absatz per Dropdown in „Überschrift 1“ umwandeln, dann zurück zu
   „Standard“, sowie zwischen zwei Überschriftsebenen → Ausrichtung muss in **jedem** dieser
   Fälle erhalten bleiben; geht sie verloren, ist das ein zu behebender Bug, bevor das
   Feature wieder als „vorhanden“ gilt — kein akzeptables „gewolltes Verhalten“.
4. **Gemischte Selektion über mehrere Absätze mit unterschiedlicher Ausgangsausrichtung**
   → nach (funktionierendem) Klick auf „Zentriert“ müssen **alle** betroffenen Absätze
   zentriert sein, keiner bei seiner ursprünglichen Ausrichtung verbleiben. Aktuell durch
   den Fehler aus 3.2 verhindert.
5. **Leerer, zentrierter Absatz** (kein Text) → darf beim Setzen nicht abstürzen; beim
   späteren Eintippen erscheint der Text zentriert; beim Export bleibt der zentrierte
   leere Absatz als solcher erhalten (verschwindet nicht als Absatz ohne
   Ausrichtungsinformation).
6. **Zentrierte Überschrift kombiniert mit Zeichenformatierung** (fett/farbig) im selben
   Textlauf → beide Ebenen bleiben unabhängig erhalten (siehe 3.8).
7. **Zentrierter Absatz in einer Tabellenzelle** (insbesondere in einer über
   `colspan`/`rowspan` verbundenen Zelle) → bleibt unabhängig von Nachbarzellen (3.6).
8. **Zentrierter Listeneintrag** (Bullet und nummeriert, ein- und mehrstufig) → nur der
   Text wird zentriert, das Listensymbol bleibt an seiner Position (3.6).
9. **Wiederholtes/schnelles Klicken** auf den bereits aktiven „Zentriert“-Button → keine
   Nebenwirkung, keine unnötig aufgeblähte Undo-Historie durch wiederholtes Setzen
   desselben Werts (Klärung zu 3.3).
10. **Copy/Paste von extern zentriertem Text** (z. B. Webseite mit inline
    `style="text-align: center"` oder per Zwischenablage kopierter Word-Text) →
    `parseDOM` liest `style.textAlign` (`schema.ts:20,33`) und sollte die Zentrierung
    übernehmen. Ist die Zentrierung dagegen **nur** über eine CSS-Klasse plus
    Stylesheet zugewiesen (kein Inline-`style`), wird sie **nicht** erkannt (`dom.style`
    bildet nur das Inline-Attribut ab) — erwartetes Fallback (vermutlich Verlust der
    Zentrierung) nachweisen und dokumentieren. Test mit echtem Browser-Clipboard, nicht
    nur synthetisch.
11. **Zentrierung in Kombination mit dem bekannten Selection-Sync-Bug** (3.9) — „Alles
    auswählen“ → „Zentriert“ (löst laut 3.2 aktuell selbst eine Exception aus) → per
    Klick neu positionieren → Enter → weiter tippen: zu prüfen, ob die Kombination beider
    Fehlerpfade den Dokumentinhalt zusätzlich gefährdet.
12. **Zentrierter Absatz in Kopf-/Fußzeile** — die Kopf-/Fußzeilen-Bearbeitung fehlt laut
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 komplett in der UI; dieser Fall ist deshalb
    aktuell **nicht** end-to-end über die Oberfläche testbar und ist entsprechend zu
    vermerken (nicht stillschweigend auszulassen). Auf Datenmodell-/Reader-/Writer-Ebene
    (direkt konstruierte `header`/`footer`-Inhalte, bzw. Import einer der
    `Header…_MSO15.odt`-Fixtures) ist er prüfbar.
13. **RTL-Dokument** (Fixture `tests/fixtures/external/docx/rtl.docx`) → „zentriert“ ist
    richtungsunabhängig und muss unabhängig von der Textrichtung visuell mittig bleiben;
    der Import darf `center` nicht mit RTL-spezifischen `start`/`end`-Werten verwechseln
    (siehe Grenzfall 2).
14. **Sehr lange Selektion über viele Seiten** zentrieren → **nach** Behebung von 3.2:
    kein spürbares Einfrieren der UI, alle Absätze tatsächlich betroffen (Stichprobe am
    Anfang, in der Mitte und am Ende).
15. **Ungültiger `align`-Wert durch Fremdimport/Datenkorruption** (z. B. `"foo"`, das
    wegen `validate: 'string'` ohne Enum ins Schema gelangen kann) → Editor darf nicht
    abstürzen; `isAlignActive` gibt für alle vier bekannten Werte `false` zurück (kein
    Button aktiv); Export schreibt einen sinnvollen Fallback (`?? 'left'`), kein korruptes
    XML.
16. **Zentrieren ausschließlich per Tastatur, ohne jede Maus-Interaktion** (siehe 3.11) →
    Editor mit der Tastatur fokussieren, per Umschalt+Tab/Tab zum „Zentriert“-Button
    navigieren, mit Enter oder Leertaste auslösen → identische Wirkung wie ein Mausklick.
    Aktuell laut Codeanalyse **nicht** möglich (`AlignButton` reagiert nur auf `mousedown`).
    Getrennt vom Tastenkürzel Strg+E (3.10) zu prüfen — beide Wege müssen unabhängig
    voneinander funktionieren.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert exportieren
→ Ergebnis entspricht inhaltlich A.“ Für „Ausrichtung zentriert“ konkret — für **jeden**
Fall gilt: kein Textverlust, keine fälschliche zusätzliche Zentrierung an anderer Stelle,
Zentrierung an exakt derselben Textstelle erhalten.

### 5.1 DOCX
1. **Upload unverändert:** Reale, außerhalb der App erzeugte DOCX-Datei mit mindestens
   einem zentrierten Absatz importieren (Kandidat: `bug-paragraph-alignment.docx`,
   ersatzweise `table-alignment.docx`, `TestTableCellAlign.docx`) → **ohne** Bearbeitung
   sofort exportieren → reimportieren → zentrierter Absatz (Text **und** `align: center`)
   identisch zum Ausgangszustand.
2. **Rundreise nach eigener Bearbeitung:** Neues/importiertes Dokument, einen Absatz über
   den Toolbar-Button zentrieren → als DOCX exportieren → reimportieren → Zentrierung und
   exakter Text erhalten.
3. **Validierung gegen unabhängigen Parser:** Der Export enthält `<w:jc w:val="center"/>`
   im `w:pPr` des betroffenen Absatzes, bestätigt durch ein **vom eigenen Reader
   unabhängiges** Werkzeug (python-docx, direktes Parsen von `word/document.xml` oder
   OOXML-Schemaprüfung), kein anderer Absatz fälschlich mitbetroffen (siehe
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
4. **Zentrierte Überschrift (Ebene 1–6):** Rundreise erhält `align: center` **und**
   Heading-Level gemeinsam (`w:pStyle` + `w:jc` im selben `w:pPr`).
5. **Zentrierter Absatz in einer Tabellenzelle:** Rundreise erhält Zuordnung zur
   richtigen Zelle, keine Nebenwirkung auf Nachbarzellen (aktuell durch **keinen** Test
   abgedeckt).
6. **Zentrierter Listeneintrag (Bullet und nummeriert):** Rundreise erhält Ausrichtung
   und Listenzugehörigkeit/Nummerierung gemeinsam (aktuell durch **keinen** Test
   abgedeckt).
7. **Mehrfachabsatz-Rundreise:** Mehrere aufeinanderfolgende Absätze markieren,
   zentrieren, exportieren, reimportieren → **alle** markierten Absätze zentriert, nicht
   nur der erste (**abhängig von der Behebung von 3.2** — erst danach sinnvoll
   durchführbar).

### 5.2 ODT
1. **Upload unverändert:** Reale ODT-Datei mit mindestens einem zentrierten Absatz
   importieren (Kandidat: `CharacterParagraphFormat.odt`, ersatzweise
   `CharacterParagraphFormat_MSO15.odt`, `feature_attributes_paragraph_MSO2013.odt`,
   `feature_attributes_paragraph_MSO2013_doc-AO.odt`, `paragraphWithPageStyle.odt`) →
   unverändert exportieren → reimportieren → Zentrierung und Text identisch.
2. **Rundreise nach eigener Bearbeitung:** Im Editor einen Absatz zentrieren, als ODT
   exportieren → `content.xml` enthält einen `style:style style:family="paragraph"` mit
   `fo:text-align="center"` (Stilname `Ppara-center`, `styleRegistry.ts:61-72`),
   referenziert über `text:style-name` auf dem betroffenen `text:p`.
3. **Deduplizierung:** Zwei zentrierte Absätze im selben Dokument referenzieren nach
   Rundreise denselben (oder einen inhaltlich gleichwertigen) Stil, keine redundanten
   Definitionen.
4. **Zentrierte Überschrift:** eigener Stil `Heading{level}-center`
   (`styleRegistry.ts:80-89`) korrekt erzeugt und beim Reimport wieder als zentrierte
   Überschrift des richtigen Levels erkannt.
5. **Tabellenzelle / Listeneintrag:** wie 5.1 Punkt 5/6.
6. **Validierung gegen unabhängigen Parser/ODF-Schema:** `fo:text-align="center"` korrekt
   vorhanden und korrekt referenziert.
7. **Mehrfachabsatz-Rundreise:** wie 5.1 Punkt 7 (abhängig von 3.2).

### 5.3 Cross-Format & doppelte Rundreise

> **Abhängigkeit (bislang in dieser Datei unvermerkt, jetzt ergänzt):** Die Punkte 1-5
> setzen einen über die **Oberfläche** wählbaren Export-Zielformat voraus. Dieses Feature
> (Backlog-Slug `speichern-unter-format`, „Zielformat beim Export wählen“) ist laut
> `FEATURE-BACKLOG.md` weiterhin als **„fehlt“** geführt; `tests/e2e/roundtrip-fidelity.spec.ts`
> führt die Cross-Format-Fälle deshalb bereits bewusst als `test.skip` mit exakt diesem Slug
> als Begründung (Zeilen 253-257). Solange `speichern-unter-format` fehlt, ist Export **immer**
> im Ursprungsformat — ein DOCX-Upload lässt sich derzeit nicht über die UI als ODT
> herunterladen und umgekehrt. Analog zu `einfuegen-req.md`/`datei-oeffnen-req.md` gilt daher:
> Die Punkte 1-5 bleiben als **Anforderung** an das Feature „Ausrichtung zentriert“ bestehen
> (sobald `speichern-unter-format` existiert, müssen sie ohne Formatierungsverlust der
> Zentrierung erfüllt sein), sind aber **bis dahin nicht über einen echten Browser-Upload/
> -Download-Zyklus prüfbar** und werden ersatzweise auf Reader/Writer-Ebene nachgewiesen
> (direktes Verketten von `readDocx`/`writeDocx`/`readOdt`/`writeOdt` ohne UI, siehe
> `ausrichtung-zentriert-code.md` Abschnitt 6.7 und die dortigen Tests X1-X3). Das gilt
> **nicht** als „erfüllt“ im Sinne von Abnahmekriterium 6, sondern als **zurückgestellter,
> aber weiterhin geforderter** Teilnachweis — der Backlog-Status darf diesen Punkt nicht
> stillschweigend als abgehakt behandeln, sondern muss ihn als „blockiert durch
> `speichern-unter-format`“ ausweisen, bis das Feature existiert und der volle
> UI-Rundreise-Nachweis nachgeholt wurde.

1. **DOCX → ODT:** DOCX mit zentriertem Absatz importieren → als ODT exportieren →
   Zentrierung erhalten (`fo:text-align="center"` korrekt aus internem `align: center`).
2. **ODT → DOCX:** umgekehrt ebenso (`<w:jc w:val="center"/>`).
3. **Doppelte Cross-Format-Rundreise** (DOCX → ODT → DOCX **und** ODT → DOCX → ODT) an
   einem Dokument mit zentriertem Absatz **kombiniert** mit Fett/Farbe/Überschrift-Ebene
   → kein kumulativer Verlust der Zentrierung über zwei Konvertierungen hinweg.
4. **Formatvorlagen-Wechsel vor Export:** Absatz zentrieren → per Dropdown in
   „Überschrift 2“ umwandeln → exportieren → reimportieren → Zentrierung muss erhalten
   geblieben sein (deckt den Verdacht aus 3.5/7.2 über den vollen Rundreise-Pfad ab).
   **Nicht** von der `speichern-unter-format`-Abhängigkeit betroffen (kein Formatwechsel,
   nur Formatvorlagen-Wechsel innerhalb desselben Formats) — muss unabhängig davon über die
   UI prüfbar sein und bleibt uneingeschränkter Bestandteil des Abnahmekriteriums.
5. **Reale Fremddatei mit stilbasierter Zentrierung:** mindestens ein Testfall, der
   gezielt eine Datei mit über eine Formatvorlage (nicht direkt) zentriertem Absatz
   importiert, unverändert exportiert und reimportiert — Ergebnis und ggf. Abweichung vom
   Original dokumentieren (Grenzfall 1). Export erfolgt hier im **Ursprungsformat** (keine
   Cross-Format-Wahl nötig) — von der `speichern-unter-format`-Abhängigkeit **nicht**
   betroffen.

---

## 6. Menü-/Toolbar-Zusammenhang (Bezug zu FEATURE-SPEC-DOCX-ODT.md)

Entspricht Zeile 4 der Tabelle in Abschnitt 17 des Hauptdokuments: „Ausrichtung
(links/zentriert/rechts/Blocksatz) — vorhanden, Pfeil-/Linien-Symbole — Rendering auf
mehreren Systemen/Browsern verifizieren.“ Diese Anforderungsdatei löst diesen offenen
Prüfauftrag für den Teilaspekt „zentriert“ konkret auf (Bedienelement 3/4 in Abschnitt 2,
Testfälle 8.17/8.18) und ergänzt ihn um den in Abschnitt 3.2 gefundenen
Bedien-Funktionsfehler, der über reines Icon-Rendering hinausgeht.

---

## 7. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Konkrete, aus dem Quellcode abgeleitete Verdachtspunkte, die die QA-Verifikation
**gezielt** widerlegen oder bestätigen muss — sie ersetzt nicht die Testabdeckung aus
Abschnitt 8, sondern lenkt die Priorität:

1. **`setAlign` wirft bei Mehrfachabsatz-Selektion einen unbehandelten `RangeError` und
   zentriert nur den ersten Block** (`commands.ts:13-27` + `WordEditor.tsx:125-132`, gegen
   `prosemirror-state` `applyInner` und `prosemirror-transform` `get before()` bestätigt).
   **Höchste Priorität — der gewichtigste Einzelfehler dieser Datei.** Betrifft „zentriert“
   ebenso wie die drei anderen Ausrichtungen (siehe `ausrichtung-blocksatz-req.md` 2.2).
2. **Formatvorlagen-Wechsel setzt Zentrierung hart auf „links“ zurück**
   (`commands.ts:43`, `setHeading`) — in beide Richtungen (Standard↔Überschrift,
   Überschrift↔Überschrift), unabhängig vom Vorwert. Kein Test deckt das ab. Alltäglicher
   Bedienschritt, daher hohe Priorität.
3. **Kein Import stilbasierter/geerbter Zentrierung** (DOCX: `w:pStyle` → `styles.xml`,
   nur für Heading-Level gelesen, nicht für `w:jc`, `reader.ts:236-241`; ODT: keine
   Auswertung von `office:styles`/`style:parent-style-name`, `reader.ts:37-68,178,259`).
   Reale Dokumente mit zentrierten Formatvorlagen (Titel/Untertitel) werden fälschlich als
   „links“ importiert.
4. **Unvollständige `jc`-/`text-align`-Wertetabelle** (`docx/reader.ts:14`, ODT roh
   übernommen): Werte wie `start`/`end`/`distribute` fallen still auf „links“ zurück bzw.
   werden von keinem Button als aktiv erkannt — betrifft die generelle Robustheit, `center`
   selbst ist korrekt gemappt.
5. **`isAlignActive` nur aus `$from`** (`commands.ts:29-38`): bei gemischter Selektion
   ggf. irreführender Button-Zustand; verschärft den stillen Teilfehlschlag aus Risiko 1
   (Button zeigt nach dem Teilfehler „aktiv“).
6. **Kein Enum/keine Validierung des `align`-Attributs** (`schema.ts:4`,
   `validate: 'string'`): jeder String kann als Ausrichtung ins Dokument gelangen;
   Export-Fallback (`?? 'left'`) vorhanden, aber ungetestet.
7. **Fehlendes `aria-label` am `AlignButton`** (`Toolbar.tsx:91-111` vs. `MarkButton`
   Zeile 74): inkonsistent zu den Zeichenformat-Buttons.
8. **Title-Attribut zeigt internen englischen Bezeichner** (`Toolbar.tsx:96`):
   „Ausrichtung: center“ statt deutscher Beschriftung — Lokalisierungsfehler, relevant für
   künftige `getByTitle(...)`-Selektoren.
9. **Icon-Rendering + semantische Uneindeutigkeit von `↔`** (`Toolbar.tsx:235`): bereits
   generelles Rendering-Risiko (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20); `↔` steht in
   vielen UI-Konventionen für „verschieben“, nicht „zentrieren“.
10. **Kein Tastenkürzel** (`WordEditor.tsx:85-107`): weder für „zentriert“ (Strg+E) noch
    für die anderen drei — Inkonsistenz zu Fett/Kursiv/Unterstrichen.
11. **Kein Test ruft `setAlign` überhaupt auf.** Der einzige E2E-Ausrichtungstest
    (`roundtrip-fidelity.spec.ts`) importiert einen vorkonstruiert zentrierten Absatz und
    prüft nur Import→Export→Reimport-Treue; die Unit-Tests (`roundtrip.test.ts`) prüfen
    Writer→eigener-Reader an einem Einzelabsatz. Der Bedien-Pfad (Button-Klick →
    `setAlign`), der Mehrfachabsatz-Fall, der Formatvorlagen-Wechsel, Tabellen/Listen und
    Fremddateien mit stilbasierter Ausrichtung sind ungetestet.
12. **`AlignButton` ist rein per Tastatur nicht auslösbar** (`Toolbar.tsx:91-111`, nur
    `onMouseDown`, kein `onClick`/`onKeyDown`, Zeile 98-101) — ein natives `<button>` feuert
    bei Tastatur-Aktivierung (Tab+Enter/Leertaste) ein `click`-, kein `mousedown`-Ereignis.
    Neu identifiziert in dieser Fassung (3.11/Grenzfall 16/Testfall 36); bislang **nicht**
    Bestandteil der Anforderung, obwohl bereits in `ausrichtung-zentriert-code.md` als
    Fehler 5 (Teilaspekt) und in `ausrichtung-zentriert-qa.md` als Testfall Z38 aufgetaucht —
    dort aber ohne sauberen Anforderungs-Bezug (fälschlich auf Testfall 19, das Tastenkürzel,
    zurückgeführt). Betrifft strukturell auch die drei Geschwister-Ausrichtungs-Buttons.

---

## 8. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

Bereits vorhandene, aber laut Auftrag **nicht als vertrauenswürdig geltende** Tests, die
im Rahmen der Verifikation erneut zu prüfen und zu ergänzen sind:
- `src/formats/docx/__tests__/roundtrip.test.ts:47-50,54-58` (+ ODT-Äquivalent) —
  Writer→eigener-Reader, **einzelner** Absatz/Heading, konstruierte Daten.
- `tests/e2e/roundtrip-fidelity.spec.ts` Kriterium 4 — echter Browser-Rundreisetest für
  einen **einzelnen, vorkonstruiert** zentrierten Absatz (DOCX **und** ODT), **ohne**
  Button-Klick.

Zusätzlich zu schreibende Testfälle — **8.3/8.4 haben oberste Priorität**, da von ihrem
Ausgang abhängt, ob die übrigen Mehrfachabsatz-Tests überhaupt sinnvoll durchführbar sind:

1. Cursor in einen Absatz (ohne Selektion) → „Zentriert“ klicken → Absatz sichtbar
   zentriert (`text-align: center` im DOM), `aria-pressed` wechselt auf `true`.
2. Text markieren (Maus-Ziehen, Doppelklick, Dreifachklick) → „Zentriert“ → der
   **gesamte** umgebende Absatz zentriert, nicht nur das markierte Wort.
3. **Kernfehler (3.2), Mehrfachselektion:** ≥3 Absätze anlegen, per Maus/Tastatur über
   alle selektieren → „Zentriert“ klicken → erwartet: **alle** zentriert, **kein**
   unbehandelter Fehler in der Browser-Konsole (Playwright `errors`-Fixture wie in
   `roundtrip-fidelity.spec.ts:135`), Undo stellt den Vorzustand aller Absätze in **einem**
   Schritt wieder her. Bei Abweichung exaktes Fehlerbild dokumentieren (welche Absätze
   geändert, welcher Konsolenfehler).
4. **Kernfehler (3.2), „Alles auswählen“:** Strg+A über ein Mehrfachabsatz-Dokument →
   „Zentriert“ → identische Erwartung wie 8.3 (häufigster realer Ablauf).
5. Mehrere Absätze mit **gemischter** Ausgangsausrichtung markieren → „Zentriert“ → alle
   einheitlich zentriert (nach Behebung von 3.2).
6. Erneuter Klick auf „Zentriert“ bei bereits zentriertem Absatz → keine Veränderung, kein
   Fehler, Undo-Verhalten gemäß 3.3/Grenzfall 4.9 protokollieren.
7. „Links“/„Rechts“/„Blocksatz“ auf einen zentrierten Absatz → Zentrierung wird korrekt
   ersetzt (nie zwei Ausrichtungen gleichzeitig).
8. Button zeigt aktiven Zustand korrekt, wenn der Cursor (ohne Selektion) in bereits
   zentriertem Text steht; wechselt sofort bei Cursor-Bewegung in anders ausgerichteten
   Text.
9. Button-Zustand bei gemischter Mehrfachselektion → Verhalten gemäß 3.4 festgelegt und
   dokumentiert.
10. Zentrierung einer Überschrift (Ebene 1–6) → identisch zu einem normalen Absatz.
11. **Formatvorlagen-Wechsel-Regressionstest (Risiko 7.2):** Absatz zentrieren → per
    Dropdown zu „Überschrift 1“ → prüfen, ob Zentrierung erhalten bleibt; dann zurück zu
    „Standard“; dann zwischen zwei Überschriftsebenen — jedes Ergebnis dokumentieren und
    mit der in 3.5 getroffenen Entscheidung abgleichen.
12. Zentrierung in einer Tabellenzelle → nur diese Zelle betroffen, keine Nebenwirkung auf
    Nachbarzellen; zusätzlich in einer über `colspan`/`rowspan` verbundenen Zelle.
13. Zentrierung eines Listeneintrags (Bullet **und** nummeriert) → nur der Text zentriert,
    Listensymbol bleibt an seiner Position.
14. Kombination von Zentrierung mit Fett/Kursiv/Schriftfarbe auf demselben Textlauf → alle
    gleichzeitig sichtbar, keine verdrängt die andere.
15. Copy/Paste von extern zentriertem Text mit inline `style="text-align: center"` → wird
    als zentriert erkannt; separat: klassenbasierte (nicht inline) Zentrierung → erwartetes
    Fallback (vermutlich Verlust) nachweisen (Grenzfall 10).
16. Leeren Absatz zentrieren, danach Text tippen → getippter Text erscheint zentriert.
17. Icon-Rendering-Test auf einem System ohne besondere Font-Unterstützung: `↔` bleibt von
    `⇤`/`⇥`/`≡` eindeutig unterscheidbar (Risiko 9).
18. Tooltip-/`aria-label`-Prüfung: `title` durchgängig deutsch (kein „Ausrichtung: center“
    mehr), Screenreader kündigt einen sinnvollen Namen an (Risiken 7/8).
19. Tastenkürzel-Test: entweder das neu festgelegte Kürzel (z. B. Strg+E) funktioniert
    zuverlässig, oder das bewusste Fehlen ist dokumentiert (3.10) — „stillschweigend
    fehlend“ gilt nicht als erfüllt.
20. Undo (Strg+Z) direkt nach Zentrieren eines Einzelabsatzes → Vorzustand; Redo (Strg+Y)
    → Zentrierung zurück.
21. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2: „Alles auswählen“ →
    „Zentriert“ → per Klick neu positionieren → Enter → weiter tippen → beide entstehenden
    Absätze bleiben erhalten und zentriert (durchspielbar erst nach Behebung von 3.2;
    Kombination beider Fehlerpfade prüfen, Grenzfall 4.11).
22. DOCX-Rundreise (eigene Bearbeitung, 5.1.2) über echten Datei-Upload (`filechooser`) und
    echten Download-Abfang (`page.waitForEvent('download')`).
23. ODT-Rundreise (eigene Bearbeitung, 5.2.2) analog.
24. Cross-Format-Rundreise DOCX→ODT und ODT→DOCX (5.3.1/5.3.2).
25. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX und ODT→DOCX→ODT) mit Zentrierung +
    Fett + Farbe + Überschrift kombiniert → kein kumulativer Verlust (5.3.3).
26. Upload `bug-paragraph-alignment.docx` (unverändert) → Export → Reimport → zentrierte
    Absätze inhaltlich identisch zum Original (5.1.1).
27. Upload `CharacterParagraphFormat.odt` (unverändert) → Export → Reimport → zentrierte
    Absätze inhaltlich identisch (5.2.1).
28. Upload einer Fremddatei mit **stilbasierter** (nicht direkter) Zentrierung → prüfen, ob
    korrekt als „zentriert“ erkannt oder gemäß Risiko 7.3 fälschlich als „links“ importiert
    — Ergebnis dokumentieren (5.3.5).
29. Upload `rtl.docx` → Zentrierung (falls vorhanden) wird unabhängig von der Textrichtung
    korrekt erkannt/dargestellt (Grenzfall 13).
30. Export-Validierung gegen unabhängigen Parser: `<w:jc w:val="center"/>` (DOCX) bzw.
    `fo:text-align="center"` (ODT) korrekt vorhanden (5.1.3/5.2.6).
31. Zentrierte Absätze in Tabellenzellen und Listeneinträge → Rundreise DOCX **und** ODT
    (5.1.5/5.1.6/5.2.5).
32. Mehrfachabsatz-Rundreise (5.1.7/5.2.7) — nach Behebung von 3.2: mehrere zentrierte
    Absätze überstehen Export/Reimport gemeinsam.
33. Performance/Stabilität: sehr lange Selektion (mehrere Seiten) zentrieren → UI bleibt
    reaktionsfähig, alle Absätze betroffen (Grenzfall 14, nach Behebung von 3.2).
34. Import einer Fixture mit Fremdwert `w:jc w:val="distribute"` bzw. `fo:text-align="end"`
    → kein Absturz, kein Textverlust, Fallback-Verhalten dokumentiert (Grenzfall 2).
35. Import eines Dokuments mit ungültigem `align`-Wert (`"foo"`) → kein Absturz, kein Button
    aktiv, Export schreibt gültiges Fallback-XML (Grenzfall 15).
36. **Reine Tastaturbedienung ohne Maus** (Grenzfall 16, Risiko 12): Editor-Toolbar per Tab
    erreichen, zum „Zentriert“-Button navigieren (`toBeFocused()`), mit Enter auslösen,
    separat mit Leertaste auslösen → beide Male identische Wirkung wie ein Mausklick
    (`text-align: center`, `aria-pressed` wechselt). Getrennt vom Tastenkürzel-Test 19 zu
    protokollieren, auch wenn beide zufällig an derselben Testdatei hängen.

---

## 9. Offene Entscheidungen — **entschieden in dieser Fassung** (PO-Festlegung)

Frühere Fassungen führten diese sieben Punkte als offene Fragen „vor Abnahme zu treffen“,
ohne sie zu beantworten — das war eine Lücke, die dieser Durchlauf schließt. Die
Nummerierung 1–7 bleibt **unverändert** (Kompatibilität zu den Querverweisen `9.1`–`9.7`
in `ausrichtung-zentriert-code.md` Abschnitt 5 und `ausrichtung-zentriert-qa.md`), jeder
Punkt trägt jetzt eine verbindliche Entscheidung statt nur der Frage:

1. **Behebung von 3.2** (Mehrfachabsatz-`RangeError`). **Entschieden: Ja, Pflichtbehebung**
   (war bereits durch das „Soll-Verhalten (nach Behebung)“ in Abschnitt 3.2 bindend, hier
   nur formal bestätigt) — Umsetzung als **eine** Transaktion über die ganze Selektion, ein
   einziger Undo-Schritt/`onChange`-Aufruf. Keine akzeptable Alternative (z. B. „nur den
   ersten Block ändern“ oder „Fehler anzeigen“) — beides verstieße gegen `FEATURE-SPEC-
   DOCX-ODT.md` Abschnitt 20 Punkt 4.
2. **Zentrierung bei Formatvorlagen-Wechsel** (3.5/7.2). **Entschieden: Bug beheben** —
   die Ausrichtung überträgt sich bei jedem Formatvorlagenwechsel (Standard↔Überschrift,
   Überschrift↔Überschrift), in beide Richtungen, unabhängig vom Vorwert. Begründung:
   entspricht dem etablierten Word-/LibreOffice-Verhalten (ein Formatvorlagenwechsel ändert
   die Absatzstruktur/Semantik, nicht die manuell gesetzte Ausrichtung) und deckt sich mit
   der bereits als „Kernanforderung“ formulierten Erwartung in 3.5. Ein bewusstes
   Zurücksetzen wäre für Nutzer:innen überraschend und nicht dokumentierbar ohne die
   Erfahrung zu verschlechtern.
3. **Stilbasierte/geerbte Zentrierung beim Import** (Grenzfall 1/7.3). **Entschieden:
   Auflösen** — der Reader muss eine über die Formatvorlage (DOCX `w:pStyle`/`w:basedOn`;
   ODT `office:styles`/`style:parent-style-name`) vererbte Zentrierung erkennen, mit
   direkter Absatzformatierung als Vorrang vor der Formatvorlage. Begründung: Titel-/
   Untertitel-Formatvorlagen mit vordefinierter Zentrierung sind ein gängiges, reales Muster
   (siehe `bug-paragraph-alignment.docx`); ohne Auflösung importiert die App sichtbar
   zentrierten Text als „links“ — ein stiller, für die Nutzerin nicht nachvollziehbarer
   Informationsverlust, den das „kein stiller Fehlschlag“-Prinzip ausschließt.
4. **Normalisierung von `start`/`end`** (Grenzfall 2/7.4). **Entschieden: Auf `left`/`right`
   abbilden**, unter Berücksichtigung des am selben Absatz vorhandenen Bidi-/Schreibrichtungs-
   Flags (DOCX `w:bidi`, ODT `style:writing-mode`) — ohne dieses Flag physisch links/rechts
   im LTR-Regelfall. Begründung: „nur vier explizite Werte“ beizubehalten hieße, dass
   `isAlignActive` für jeden mit `start`/`end` importierten Absatz dauerhaft „kein Button
   aktiv“ anzeigt und der Cross-Format-Export ihn fälschlich auf „links“ zurückstuft
   (bestätigt an `rtl.docx`) — eine vollständige RTL-Textrichtungsunterstützung (Zeichen-
   Shaping, `dir`-Attribut) ist damit **nicht** verlangt, siehe Grenzfall 13.
5. **`aria-pressed` bei gemischter Selektion** (3.4/7.5). **Entschieden: Aktiv nur, wenn
   alle betroffenen Blöcke denselben Wert haben** (Word/LibreOffice-Konvention) — nicht der
   bisherige Zustand „nur `$from`“. Begründung: „Nur `$from`“ zeigt nach dem in 3.2
   beschriebenen Teilfehlschlag fälschlich „aktiv“ an, obwohl nur ein Block geändert wurde;
   unabhängig davon ist „ein Button aktiv, obwohl ein Klick auf ihn weitere, andersartig
   ausgerichtete Blöcke überschreiben würde“ irreführend.
6. **Tastenkürzel** (3.10/7.10). **Entschieden: Strg/Cmd+E ergänzen** für „Zentriert“
   (Word/LibreOffice-Standard, in keinem verbreiteten Desktop-Browser reserviert). Die
   anderen drei Ausrichtungen entscheiden ihr jeweiliges Kürzel eigenständig in ihrer
   eigenen Anforderungsdatei — diese Entscheidung bindet nur „Zentriert“.
7. **Tooltip-Text und `aria-label`** (7.7/7.8). **Entschieden: Beides ergänzen** — `title`
   und `aria-label` zeigen durchgängig deutschen Text (z. B. „Ausrichtung: Zentriert“ statt
   „Ausrichtung: center“), analog zum bereits vorhandenen Muster bei `MarkButton`
   (`aria-label={title}`). Kein „title genügt, aria-label optional“ — beide Attribute dienen
   unterschiedlichen Zugriffspfaden (Hover-Tooltip vs. Screenreader-Name) und müssen beide
   gesetzt sein.
8. **(Neu in dieser Fassung) Tastatur-Erreichbarkeit des Buttons selbst** (3.11/Risiko 12).
   **Entschieden: Muss behoben werden**, keine Abwägung nötig — dies ist keine Produkt-/UX-
   Entscheidung wie 1–7, sondern eine grundlegende Bedienbarkeitsanforderung (WCAG 2.1.1):
   ein natives `<button>` muss per Tastatur auslösbar sein. Der Fix (zusätzlicher `onClick`-
   Handler neben dem bestehenden `onMouseDown`) ist risikoarm und ändert das
   Mausklick-Verhalten nicht.

Ein „aktuell so, unkommentiert“ gilt für keinen dieser Punkte als ausreichend. Die
tatsächliche Umsetzung (Code) und ihr Nachweis (Tests) sind **nicht** Gegenstand dieser
Anforderungsdatei, sondern von `ausrichtung-zentriert-code.md`/`ausrichtung-zentriert-qa.md`
— diese Datei legt nur das **gewünschte** Verhalten fest.

---

## 10. Abnahmekriterien (Definition of Done)

Das Feature „Ausrichtung zentriert“ gilt erst dann wieder als „vorhanden“ im Sinne von
vertrauenswürdig, wenn:

1. Der Kernfehler aus Abschnitt 3.2 (Mehrfachabsatz-`RangeError`, nur erster Block
   zentriert, stiller Teilfehlschlag) im echten Browser nachgestellt und **behoben** ist —
   inklusive eines dauerhaften Regressionstests, der exakt dieses Szenario abdeckt
   (Testfälle 8.3/8.4), sowie der zugehörigen Mehrfachabsatz-Rundreise (Testfall 32).
2. Alle Testfälle aus Abschnitt 8 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und ihr Ergebnis dokumentiert ist.
3. Jedes Verdachtsmoment aus Abschnitt 7 explizit als „bestätigt und behoben“, „bestätigt
   und bewusst als Grenzfall dokumentiert“ oder „widerlegt“ eingestuft wurde — keines
   bleibt unkommentiert offen.
4. Alle acht Entscheidungen aus Abschnitt 9 (bereits in dieser Fassung getroffen) **umgesetzt**
   sind (Code-Fix, wo einer nötig ist) und der Nachweis dafür in `ausrichtung-zentriert-qa.md`
   dokumentiert ist.
5. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) den „Zentriert“-Button
   tatsächlich **anklickt** (`setAlign` ausführt) — nicht nur, wie bislang, einen
   vorkonstruiert zentrierten Absatz importiert — und dauerhaft in der Suite verankert ist
   (Testfälle 1/3/4), inklusive des Formatvorlagen-Wechsel-Regressionstests (11) **und** des
   Tastatur-only-Tests ohne jede Maus-Interaktion (Testfall 36, Abschnitt 3.11).
6. Die Rundreise-Anforderung aus Abschnitt 5 für DOCX **und** ODT, inklusive Tabellenzellen
   und Listen, und inklusive mindestens einer realen (nicht app-eigenen) Testdatei je Format
   (Testfälle 26/27), gegen einen vom eigenen Reader unabhängigen Parser (Testfall 30)
   nachweislich erfüllt ist. **Cross-Format** (Abschnitt 5.3) ist davon ausgenommen, **solange**
   `speichern-unter-format` laut Backlog „fehlt“ — dafür genügt bis dahin der Reader/Writer-
   Nachweis ohne UI (X1-X3), und der Backlog-Eintrag muss diesen Teilpunkt explizit als
   „blockiert durch `speichern-unter-format`“ statt als erfüllt ausweisen; sobald das Feature
   existiert, ist der volle UI-Rundreise-Nachweis nachzuholen, bevor dieser Punkt als
   abgeschlossen gilt.
7. Der in Abschnitt 3.11/Risiko 12 bestätigte Fehler (Button per Tastatur ohne Maus nicht
   auslösbar) behoben und durch Testfall 36 dauerhaft abgesichert ist.

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)“ auf „verifiziert“ geändert werden.
