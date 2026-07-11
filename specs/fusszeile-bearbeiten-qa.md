# QA-Testplan: „Fußzeile bearbeiten"

Bezug: `specs/fusszeile-bearbeiten-req.md` (Anforderungen) und
`specs/fusszeile-bearbeiten-code.md` (verifizierter Ist-Stand §1, Architekturentscheidung
§2, dateigenaue Änderungen §3, Grenzfälle-Mapping §5, Tests §6, Deklarationspflicht §7,
DoD-Abgleich §8). Dieser Plan legt fest, **wie** jede Anforderung und jeder in der Code-Datei
benannte Befund/Fix nachweislich verifiziert wird — gemäß Req §9 (Definition of Done) Punkt
1/3 ausdrücklich **nicht nur** über Reader/Writer-Unit-Tests oder interne Command-Aufrufe,
sondern durch echte, Playwright-gesteuerte Browser-Interaktion (Klick, Tippen, Datei-Upload,
Datei-Download + Byte-/XML-Inspektion der heruntergeladenen Datei).

Status dieses Plans: Entwurf zur Umsetzung. Er beschreibt Soll-Testfälle; welche davon zum
Zeitpunkt der Umsetzung bereits grün/rot sind, ist beim Ausführen festzuhalten (Abschnitt 8).

> **Korrektur gegenüber der vorigen Fassung dieses QA-Plans (14:40).** Die frühere Fassung
> wurde gegen eine **überholte** Req/Code-Fassung geschrieben und ist in zwei Punkten falsch;
> diese Fassung korrigiert das (analog zur gleichlautenden Korrektur in
> `fusszeile-bearbeiten-code.md` Kopf):
>
> 1. **Das Seitenzahl-Feld ist NICHT Teil dieses Features.** Die aktuelle Req nimmt es
>    ausdrücklich aus der Abnahme (Req §1 Zeile 7, §3.7; Req §0.2/D bezeichnet das explizit als
>    „Korrektur gegenüber einer früheren Fassung … die das Feld als Teil der
>    Fußzeilen-Abnahme forderte"). Der Code-Plan baut folglich **keinen** `page_number_field`-
>    Schema-Node, **kein** Einfüge-Kommando, **keinen** `w:fldChar`/`text:page-number`-Writer
>    und **keinen** „Seitenzahl einfügen"-Button (Code §3.1, §3.3, §3.12.5, §10). Alle
>    entsprechenden Test-IDs (`pageNumberButton`-Locator, `page_number_field`-Rundreise, die
>    fldChar-XML-Positiv-Assertion, der disabled-Button-Test) sind hier **entfernt** bzw. in
>    einen **Text-Erhalt**-Test umgewandelt (siehe direkt Punkt 2). Für die Fußzeilen-Abnahme
>    zählt nur **Import-Robustheit**: der sichtbare Textwert eines bereits vorhandenen Feldes
>    muss die Rundreise überstehen (Req §3.7/§7).
> 2. **Feld → statischer Text ist das erwünschte Verhalten, nicht ein Bug.** Code §1.9
>    verifiziert am aktuellen Code, dass **beide** DOCX-Feldformen (`w:fldSimple` und
>    `w:fldChar`-Quadruple) sowie ODT `text:page-number` ihren **Cache-Textwert** heute schon
>    als statischen Text erhalten (kein „PAGE"-Leak, kein ersatzloses Verschwinden). Die vorige
>    QA-Fassung (U-F3) forderte das **Gegenteil** („beide ergeben `page_number_field`, keine
>    wird als Text interpretiert") — das widerspricht dem aktuellen Code direkt und ist
>    korrigiert.
> 3. **Abschnittsnummern realigniert.** Aktuelle Req-Gliederung: Menüpunkte = **§1**,
>    Verhalten/Editierparität = **§3/§3.2**, Layout = **§4**, Grenzfälle = **§5**, Rundreise =
>    **§6** (Baseline §6.1, Feature §6.2, Fixtures §6.3, Schema-Validierung §6.4),
>    Deklarationspflicht = **§7**, Testplan = **§8**, Definition of Done = **§9**, Offene Fragen
>    = **§10**. Aktuelle Code-Gliederung: `WordEditor.tsx` = **§3.10**, `FooterBands.tsx` =
>    **§3.11**, `Toolbar.tsx` = **§3.12**, `index.css` = **§3.13**, `DocumentWorkspace.tsx` =
>    **§3.14**; Bild-Rels-Bug = **§1.6**, `headerFooter.docx`-`default`-Wahl = **§1.7**,
>    ODT-Master-Page-Kette = **§1.8**, Feld-Text-Erhalt = **§1.9**, Fixture-Verifikation =
>    **§1.11**. Alle Verweise unten sind auf diese Nummerierung gezogen. Maßgeblich ist immer
>    der **Symbolname/Befund**, nicht die Zeile.

---

## 0. Grundprinzip: zwei getrennte, sich ergänzende Testebenen

| Ebene | Zweck | Zählt als Nachweis für DoD (Req §9)? |
|---|---|---|
| **Unit-Tests** (Vitest, `jsdom`) | Schnelle, deterministische Prüfung der reinen Datenmodell-Transformation `content.footer → writeDocx/writeOdt → readDocx/readOdt → content.footer`, inkl. der in Code §1.6–§1.9 verifizierten Bugfixes bzw. Befunde (Bild-Rels-Scoping §1.6, `w:type="default"`-Präferenz §1.7, ODT-Master-Page-Kette §1.8, Feld-Text-Erhalt §1.9) und der reinen Berechnung `footerBandTopPx` (Code §3.5/§6.1). Direkter Aufruf von `reader.ts`/`writer.ts`. | **Nein, allein nicht ausreichend** für DoD-Punkt 1, 3, 6, 8, 9 — Req §9 verlangt dort explizit „per echter Playwright-Interaktion"/„per echter Tastatur-/Maus-Interaktion". Unit-Tests sind Pflicht-Ergänzung für DoD-Punkt 5/6 (Rundreise-Korrektheit auf Datenebene) und der einzige praktikable Nachweis für die Bild-Rels- und Varianten-Auswahl-Fixes (§1.6/§1.7/§1.8), aber kein Ersatz für Teil B. |
| **E2E-Tests** (Playwright, echter Chromium-Prozess gegen den gebauten `preview`-Server) | Reale Nutzer:innen-Interaktion: Klick auf den Fußzeilen-Toggle, Tippen im Fußzeilenbereich, Toolbar-Formatierung bei Fußzeilen-Fokus, Fokuswechsel Body↔Footer, echter Datei-Upload über `<input type="file">`, echtes `download`-Event, XML-Inspektion der tatsächlich heruntergeladenen Datei, `window.confirm`-Dialogsteuerung, Undo. | **Ja** — dies ist die in Req §9 Punkt 1/3/6/9 und Req §8 Punkt 3/4/5 geforderte Nachweisebene. |

Eine E2E-Testzeile gilt in diesem Plan nur dann als „echt", wenn sie mindestens eine der
folgenden Aktionen über die echte Playwright-`Page`-API ausführt (**kein** direkter
Import/Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`toggleFooter`/
`mapClickToFooterPos` innerhalb einer `*.spec.ts`-Datei):

- `locator.click()` / `page.keyboard.type()` / `page.keyboard.press()` / `page.keyboard.insertText()`
- `locator.setInputFiles(...)` auf dem tatsächlich im DOM gerenderten `<input type="file">`
- `page.waitForEvent('download')` gefolgt vom Einlesen der **tatsächlich auf Disk
  geschriebenen** Datei (`download.path()` + `fs.readFile` + `JSZip.loadAsync`), nicht nur der
  Prüfung, dass „irgendein Download" stattfand
- `page.on('dialog', …)` für `window.confirm`-Interaktion (Bestätigen/Abbrechen)
- Der Klick-zu-Position-Pfad auf Klon-Bändern (Code §2.2.4) wird ausschließlich über echte
  `locator.click({ position: {…} })`-Koordinaten ausgelöst

### 0.1 Ausdrücklich NICHT Gegenstand dieser Abnahme (Scope-Abgrenzung)

Diese Punkte werden **nicht** getestet, weil sie laut Req/Code nicht zu diesem Slug gehören —
ihr Fehlen ist **kein** Test-Gap, sondern Scope-Grenze:

- **Seitenzahl-Feld als Node/Button/Feld-Writer** → Slug `seitenzahl-einfuegen`
  (`seitenzahl-einfuegen-qa.md`). Hier wird ausschließlich getestet, dass ein **bereits
  importiertes** Feld seinen sichtbaren Textwert behält (U-F2, U-F9; Code §1.9), und dass die
  Fußzeilen-Architektur einen späteren Feld-Node nicht verbaut (implizit: Schema unverändert,
  U-Regressionen bleiben grün — Code §3.1/§1.2).
- **„Erste Seite anders" / gerade-ungerade / Mehrfach-Sections als editierbare Funktion** →
  eigene Slugs (`erste-seite-anders`, `gerade-ungerade-anders`, `mit-vorheriger-verknuepfen`).
  Hier nur als **Import-Robustheit + Deklarationspflicht** getestet: deterministische Auswahl
  + sichtbarer Hinweis + kein Totalverlust (Req §5.9/§5.10/§7; U-F5, U-F8, E-N1–E-N3).

### 0.2 Determinismus-Leitplanken (verbindlich für JEDE E2E-Zeile)

Die Suite dieses Repos hatte belegte Flakes durch **Selektions-Sync-Races**: eine native,
per Tastatur/Klick ausgelöste Cursorbewegung wird von ProseMirror erst über das
asynchrone `selectionchange`-Event des Browsers nachgezogen; eine unmittelbar folgende
`press()`/`type()` ohne menschliche Reaktionspause kann dem zuvorkommen (siehe
`tests/e2e/selection-regression.spec.ts` Kommentar Z. 27–34 und die jüngsten Commits
„Fix flaky … async-selection-sync race"). Für **dieses** Feature ist das besonders relevant,
weil der Fokus zwischen **zwei** `EditorView`-Instanzen (Body ↔ Footer) wechselt (Req §5.7,
Code §3.10.3). Verbindliche Regeln:

1. **Web-first-Assertions als primäre Warte-Barriere.** Nach jeder Zustandsänderung wird auf
   ein **beobachtbares Signal** mit auto-retrying `expect(...)` gewartet
   (`toHaveCount`, `toContainText`, `toBeVisible`, `toHaveAttribute('aria-pressed', …)`,
   `toHaveText(/Bearbeite: Fußzeile/)`), **nie** auf einen festen `waitForTimeout` als
   Ersatz für ein Signal. Insbesondere nach einem Klick, der den aktiven Bereich wechselt,
   wird **vor** dem nächsten Tastendruck auf das Aktiv-Signal gewartet
   (`areaStatus`-Text bzw. `[data-footer-band]:focus-within` bzw. Toggle-`aria-pressed`).
2. **Fester Kurz-Wait nur für den signal-losen Caret-Move-Fall.** Wo ein nativer Caret-Move
   (`End`, Klick-Reposition **innerhalb** desselben Editors) **kein** DOM-Signal erzeugt, wird
   exakt das etablierte Muster übernommen: `await page.waitForTimeout(50)` **zwischen**
   Caret-Move und dem nächsten `press()`/`type()` — identisch zu
   `selection-regression.spec.ts` Z. 34/72/103. Der Wert (50 ms) wird als benannte Konstante
   `SELECTION_SYNC_MS` an den Kopf jeder neuen Spec-Datei gezogen, nicht als Magic-Number
   verstreut.
3. **Massen-Text deterministisch einfügen.** Für den mehrseitigen Zustand
   (`footer-multipage.spec.ts`) wird Fülltext mit **einem** `page.keyboard.insertText(long)`
   (ein einziges `beforeinput`, kein Inter-Key-Race) statt vieler `type()`-Tastendrücke
   erzeugt; danach wird auf die Paginierung mit `expect(footerBands(page)).toHaveCount(n)`
   (auto-retry überbrückt die `requestAnimationFrame`-Drosselung aus Code §3.4) gewartet,
   nicht mit einem Sleep.
4. **Dialog-Handler VOR dem Auslöser registrieren.** `page.on('dialog', …)` (bzw.
   `page.once('dialog', …)`) wird **vor** dem `footerToggle().click()` gesetzt, das den
   `window.confirm` auslöst (Code §3.10.4); sonst blockiert der native Dialog den Testlauf.
5. **Re-Upload nur über den Datei-Picker.** Der `<input type="file">` existiert **nur** auf
   dem Startbildschirm, **nicht** im geöffneten Editor (verifiziert in `docx.spec.ts` Z. 240
   f.). Vor jedem Reimport zuerst `page.getByRole('button', { name: /formate/i }).click()`,
   dann `setInputFiles` auf der Karte. Diese Reihenfolge ist Pflicht — ohne sie schlägt der
   Reimport nicht-deterministisch fehl (Locator findet keinen Input).

---

## 1. Vorbedingungen für alle E2E-Spezifikationsdateien

1. `playwright.config.ts` wird **unverändert** wiederverwendet
   (`baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut `npm run build && npm run
   preview` automatisch; Projekte „Desktop Chrome", „Mobile", „Tablet"; `retries: 1` nur in
   CI). Verbindlich für die Abnahme mindestens Projekt **Desktop Chrome**; die neuen Specs
   müssen auch unter **Mobile** (Pixel 7, Touch) grün sein — die jüngsten Commits zeigen, dass
   gerade das Mobile-Projekt selektions-sync-empfindlich ist (siehe §0.2).
2. Bevorzugt die **bestehende gemeinsame Fixture** `tests/e2e/fixtures.ts` wiederverwenden
   (`import { test, expect, docxCard, odtCard } from './fixtures'`): sie erledigt `page.goto('/')`
   + Privacy-Banner (`getByRole('button', { name: /verstanden/i }).click()`) im `page`-Setup
   **und** sammelt `pageerror`/console-error in `errors`. Am Ende **jedes** Tests
   `expect(errors, errors.join('\n')).toEqual([])` (Nachweis „keine unbehandelte Exception",
   Req §9 Punkt 11). Falls stattdessen `@playwright/test` direkt genutzt wird, denselben
   `beforeEach` + Fehler-Collector wie in `docx.spec.ts`/`selection-regression.spec.ts` nutzen.
3. Card-Locator identisch zu den bestehenden Specs:
   ```ts
   const docxCard = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
   const odtCard  = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
   ```
   Neues Dokument: `docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()`.
   Export: `page.getByRole('button', { name: 'Exportieren' }).click()`. Zurück zum Picker:
   `page.getByRole('button', { name: /formate/i }).click()`. Bold-Button: `page.getByTitle('Fett')`.
   (Alle aus `docx.spec.ts`/`selection-regression.spec.ts` verifiziert.)
4. **Fußzeilen-spezifischer Locator-Baukasten** (an den Kopf jeder neuen Spec-Datei):
   ```ts
   const SELECTION_SYNC_MS = 50 // siehe §0.2 Regel 2
   const footerToggle    = (page) => page.getByRole('button', { name: /Fußzeile (einblenden|ausblenden)/ })
   const footerBands     = (page) => page.locator('[data-footer-band]')
   const activeFooterBand= (page) => page.locator('[data-footer-band] .ProseMirror') // nur das aktive Band trägt die echte View
   const bodyEditor      = (page) => page.locator('.ProseMirror').first()            // Body rendert zuerst; siehe Hinweis E-F7
   const areaStatus      = (page) => page.getByText(/Bearbeite: (Haupttext|Fußzeile)/) // Code §3.12.4, nice-to-have
   const variantNotice   = (page) => page.getByText(/erste Seite anders|mehrere.*Varianten|Fußzeilen-Variante/i)
   ```
   **Hinweis:** Die genauen Selektoren (`data-footer-band`, `aria-label`-Texte des Toggles,
   `areaStatus`-Text) sind aus Code §3.11/§3.12 übernommen (Vorschlag, nicht als endgültige
   API festgeschrieben). Sie sind beim Implementieren gegen die tatsächlich gerenderte
   DOM-Struktur abzugleichen und bei Abweichung **hier nachzuziehen** — kein stiller Test-Skip
   bei Selektor-Mismatch (Req §3.9, §9 Punkt 11). Es gibt **keinen** `pageNumberButton` mehr
   (Scope, §0.1).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Ist-Zustand (bereits vorhanden, wiederverwenden, muss grün bleiben)

| Datei | Deckt ab |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts`, Block „header, footer, and metadata" | Rundreise von `footer` über direkt konstruierte `WordDocumentContent` (Req §0.1/G — bestehende Basis, **Regressionsschutz**, nicht neu zu schreiben). |
| `src/formats/odt/__tests__/roundtrip.test.ts`, analoger Block | Dasselbe für ODT. |
| `src/formats/docx/__tests__/external-fixtures.test.ts`, `.../odt/__tests__/external-fixtures.test.ts` | Reiner Crash-Sweep über alle realen Fixtures (Req §0.2/F — bleibt Basissicherung, wird in 2.2 um **inhaltliche** Prüfung ergänzt). |
| `src/formats/odt/__tests__/external-validation.test.ts` | ODT-Schema-Validierung (xmllint-wasm gegen `OpenDocument-v1.3-schema.rng`) — läuft heute mit `footer: null` (Req §0.3/3), wird in 2.2 um einen Export **mit** nicht-leerer Fußzeile erweitert. |

### 2.2 Neue Ergänzungen

Kein Test dieser Ebene erzeugt oder erwartet einen `page_number_field`-Node (§0.1).

| # | Datei | Ergänzung | Bezug (Req/Code) |
|---|---|---|---|
| U-F1 | `docx/__tests__/roundtrip.test.ts` | **§1.7-Regression (deterministische Referenzwahl):** synthetisches `sectPr` mit `w:footerReference w:type="even"/"default"/"first"` in genau der bei `headerFooter.docx` real gefundenen Reihenfolge → geladene Fußzeile entspricht inhaltlich der **`default`**-Variante, **nicht** `even` (heute wird via `firstChildNS` fälschlich `even` geladen); das Varianten-Signal (`meta.footerVariantNotice` oder der tatsächlich gewählte Kanal, s. Hinweis) ist gesetzt. | Req §5.9, Code §1.7, §3.6a |
| U-F2 | `docx/__tests__/roundtrip.test.ts` (**roher XML-String an `readDocx`, nicht der eigene Writer**) | **§1.9-Doku-Test (Feld → statischer Text, erwünscht):** `readDocx` mit handgebautem `footer1.xml` in (a) `w:fldSimple w:instr=" PAGE "`-Form **und** (b) `w:fldChar begin/instrText/separate/end`-Quadruple-Form, jeweils mit Cache-Run `<w:t>1</w:t>` → **beide** ergeben Fußzeile mit dem statischen Text „1"; **kein** Verlust, **kein** „PAGE"-Leak, und **kein** `page_number_field`-Node (den gibt es nicht). Hält die dokumentierte Einschränkung Req §7 fest. | Req §3.7/§7, Code §1.9, §7 |
| U-F3 | `docx/__tests__/roundtrip.test.ts` | **§1.6-Regression (Bild-Rels-Scoping, Leserichtung):** synthetisches `footer1.xml` mit `<w:drawing>`+`r:embed="rId1"` **und** eigener `word/_rels/footer1.xml.rels` (Ziel `media/image1.png`), während `word/_rels/document.xml.rels` für dieselbe ID `rId1` bewusst ein **anderes** Ziel (z. B. `styles.xml`) enthält → geladenes Bild ist der **PNG**-Inhalt, **nicht** `styles.xml` (kein `data:image/xml;base64,…`). Ohne den Fix lädt der Reader still die falsche Datei (Code §1.6). | Req §5.13, Code §1.6, §3.6c |
| U-F4 | `docx/__tests__/roundtrip.test.ts` | **§1.6-Regression (Schreibrichtung):** `WordDocumentContent` mit Bild in `footer` → `writeDocx`-Zip enthält `word/_rels/footer1.xml.rels` mit `Type=".../image"`, und `footer1.xml` referenziert dieselbe `r:id`; die Bild-`r:id` steht **nicht** in `document.xml.rels`. `[Content_Types].xml` unverändert (Default `Extension="rels"` deckt es ab, Code §3.7). | Req §5.13, Code §1.6, §3.7 |
| U-F5 | `odt/__tests__/roundtrip.test.ts` | **§1.8-Regression (ODT-Master-Page-Kette):** synthetisches `styles.xml` mit zwei `style:master-page`-Elementen, verkettet über `style:next-style-name` genau wie am realen `HeaderFirstAndEvenPageEnabled_MSO15.odt` verifiziert (Quelle = „erste Seite anders", Ziel = reguläre Folgeseite) → geladene Fußzeile stammt aus der **Kettenziel**-Master-Page, nicht aus der zufällig ersten im Dokument; Varianten-Signal gesetzt. | Req §5.9, Code §1.8, §3.8 |
| U-F6 | `odt/__tests__/roundtrip.test.ts` (**roher XML-String**) | **§1.9-Doku-Test ODT:** `<text:page-number …>1</text:page-number>` bzw. `<text:page-count>…` in einem `<style:footer>` → der Cache-Text „1" bleibt als statischer Text erhalten (kein Verlust), **kein** `page_number_field`-Node. | Req §7, Code §1.9 |
| U-F7 | `docx/__tests__/roundtrip.test.ts` **und** `odt/__tests__/roundtrip.test.ts` | **§1.5-Beweis (leere aktive Fußzeile bleibt erhalten):** `footer` = `emptyDocJSON()`-artiges Objekt (ein leerer Absatz) → `writeDocx`/`writeOdt` schreibt `footer1.xml`/`<style:footer>` (Teil existiert im Export), **nicht** `null`/ausgelassen. Bestätigt Req §5.1-Entscheidung „erhalten" + Import-Symmetrie (Reader macht daraus wieder `[emptyParagraph()]`, Req §0.1/F). | Req §5.1, Code §1.5, §0 Entscheidung 2 |
| U-F8 | `docx/__tests__/roundtrip.test.ts` **und** `odt/__tests__/roundtrip.test.ts` | **Grenzfall 5.8 (Überschrift in Fußzeile):** `heading` (mit `level`) als einziger Block in `footer` → nach Rundreise weiter `heading` mit korrektem `level`, kein Absturz. | Req §5.8, Code §5 |
| U-F9 | `docx/__tests__/roundtrip.test.ts` | **Kombinierte Formatierung als Vorbereitung für Teil B:** Fußzeile mit fett + `textColor` + Ausrichtung zentriert + Tabelle + Bild in **einem** Dokument → `writeDocx→readDocx` erhält alle Elemente gleichzeitig (Datenebene von Req §6.2 Testfall 3/4, bevor Teil B denselben Fall im Browser nachstellt). | Req §6.2.3/§6.2.4 |
| U-F10 | neu, `src/formats/shared/editor/__tests__/footerCrossFormat.test.ts` | **Cross-Format-Rundreise:** (a) Fußzeile in DOCX-`content` → `writeOdt` → `readOdt` → Text + Formatierung erhalten; (b) umgekehrt ODT → DOCX; (c) Doppel-Rundreise DOCX→ODT→DOCX an derselben, aus U-F9 kombinierten Fußzeile → **kein** zusätzlicher Verlust in Runde 2 (Struktur-/String-Vergleich Runde 1 vs. Runde 2). Formatierungssimplifizierung dokumentieren; **Textverlust ist Fehlschlag**. | Req §6.2.5/§6.2.6 |
| U-F11 | neu, `src/formats/shared/editor/__tests__/pageBands.test.ts` | **Code §3.5/§6.1:** `footerBandTopPx(0) === PAGE_CONTENT_HEIGHT_PX`; `footerBandTopPx(1) === PAGE_CONTENT_HEIGHT_PX + (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX)`; streng monoton steigend für `i = 0..5`. Reine Konstantenprüfung, kein DOM. | Code §3.5, §6.1 |
| U-F12 | `docx/__tests__/external-fixtures.test.ts` (Erweiterung) | **Inhaltsprüfung statt Crash-Sweep:** für **jede** DOCX-Datei aus Req §6.3 nach Import den Fußzeilentext extrahieren (`content.footer` → Klartext) und als **feste String-Assertion** festhalten → `writeDocx` (unverändert) → `readDocx` → Text identisch. Sonderfälle: `NoHeadFoot.docx` → `footer === null` vor **und** nach Rundreise (keine fälschlich erzeugte leere Fußzeile); `EmptyDocumentWithHeaderFooter.docx` → `footer !== null`, Body leer; `Headers.docx`/`ThreeColHead.docx` → `footer === null`, `header !== null` (Grenzfall 5.11 auf Datenebene). | Req §6.3 Testfall 1, §5.11, Code §6.2 |
| U-F13 | `odt/__tests__/external-fixtures.test.ts` (Erweiterung) | Dasselbe Muster für den ODT-Teil der Req §6.3-Tabelle (`HeaderFooter.odt`, `headfoot.odt`, `headerFinal.odt`, `headerFirstPage.odt`, die drei `*_MSO15.odt`-Varianten, `HeaderFirstPageDisabled_MSO15.odt`, `tabellen_header_DOC_LO4-1-0.odt`). | Req §6.3 Testfall 1, Code §6.2 |
| U-F14 | `docx/__tests__/external-fixtures.test.ts` + `odt/__tests__/external-fixtures.test.ts` | **Cross-Format-Export** für mind. je eine Fixture (`docx/headerFooter.docx` → `writeOdt`, `odt/HeaderFooter.odt` → `writeDocx`) → Reimport im anderen Format → Fußzeilentext erhalten (Formatierung darf simplifizieren, **Textverlust ist Fehlschlag**). | Req §6.3 Testfall 2 |
| U-F15 | `odt/__tests__/external-validation.test.ts` (+ DOCX-Analogon) | **Unabhängige Schema-Validierung mit nicht-leerer Fußzeile (Req §6.4):** ODT-Export **mit** befülltem `<style:footer>` gegen `OpenDocument-v1.3-schema.rng` (xmllint-wasm) validieren (heute läuft der Test mit `footer: null`). DOCX analog über einen unabhängigen OOXML-Check (`docx/__tests__/external-validation.test.ts` bzw. Struktur-Assertion, dass `footer1.xml`, `w:footerReference`, Content-Type-/Relationship-Einträge vorhanden und wohlgeformt sind) — **nicht** nur durch den eigenen Reader wieder einlesbar. | Req §6.4, §9 Punkt 8, Code §6.2 |

**Hinweis zum Varianten-Signal (U-F1/U-F5):** Der exakte Feldname/Ort (`meta.footerVariantNotice`
vs. separater Reader-Rückgabewert) ist in Code §3.9 nur als **Vorschlag** benannt, mit
ausdrücklichem Review-Vorbehalt. Die eigentliche Prüfaussage ist der **Vertrag** „bei mehreren
Varianten wird ein maschinenlesbares Signal gesetzt", nicht der Property-Name; U-F1/U-F5 sind
beim Implementieren gegen den tatsächlich gewählten Kanal abzugleichen.

### 2.3 Abgrenzung

Diese Ebene beweist ausschließlich die **Datenmodell-Transformation** `content.footer → Datei
→ content.footer` (inkl. der Fixes §1.6/§1.7/§1.8 und der dokumentierten Einschränkung §1.9).
Sie beweist **nicht**: dass der Toolbar-Button existiert/klickbar ist (Req §9 Punkt 1); dass
Tippen/Formatieren im Fußzeilenbereich per echter Interaktion wirkt (Punkt 3); dass der
Fokuswechsel-Grenzfall (Req §5.7) bei **zwei** DOM-gebundenen `EditorView`-Instanzen
fehlerfrei ist (die Unit-Ebene kennt keine zwei Instanzen); dass die tatsächlich
heruntergeladene Datei dem entspricht, was `writer.ts` isoliert erzeugt. Req §9 Punkt 1/3/6/9
gilt daher erst nach Teil B als erfüllt — Teil A ist notwendig, aber nicht hinreichend.

---

## 3. Teil B — Echte Playwright-Browser-Tests

### 3.1 Neue Spezifikationsdateien

| Datei | Deckt ab |
|---|---|
| `tests/e2e/footer.spec.ts` (**neu**) | Kernfunktionalität: Aktivieren (Button + Doppelklick), sofort-tippen ohne Zusatzklick, Formatieren bei Footer-Fokus, Fokuswechsel-Regression (Pflicht), getrennte Undo-Historien, Export + XML-Inspektion, echter Re-Import, Deaktivieren mit Bestätigungsdialog + Undo. Deckt Req §9 Punkt 1/3/4/6/9 sowie Grenzfälle 5.2/5.6/5.7/5.8/5.11. |
| `tests/e2e/footer-multipage.spec.ts` (**neu**) | Mehrseitiges Dokument: Fußzeile auf jeder Seite, Klon-Synchronität, Klick auf ein Band einer Nicht-Erst-Seite, Inhalt größer als Bandhöhe. Deckt Req §5.3/§5.4/§5.5 und Code §2.2. Bewusst getrennt, da vom aufwendiger zu erzeugenden mehrseitigen Zustand abhängig. |
| `tests/e2e/footer-fixtures.spec.ts` (**neu**) | „Upload unverändert" mit **echten** Fremddateien aus Req §6.3 — pro Datei: echter Upload → echter Export (unverändert) → echter Re-Import → Fußzeilentext im DOM identisch. Deckt Req §6.3 auf E2E-Ebene (ergänzt U-F12/U-F13 auf Datenebene). |
| `tests/e2e/footer-variant-notice.spec.ts` (**neu**) | Req §7 Deklarationspflicht: sichtbarer Hinweisbanner bei „erste Seite anders"/gerade-ungerade/Mehrfach-Section. Deckt Req §9 Punkt 11 (kein stiller Fehlschlag). |

Bestehende Dateien (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
`save-export-lifecycle.spec.ts`, `selection-regression.spec.ts`) bleiben **unverändert**;
keine Duplizierung.

### 3.2 Testfall-Tabelle: `footer.spec.ts`

| ID | Bezug | Format | Schritte (reale Aktionen) | Erwartung / Verifikation |
|---|---|---|---|---|
| E-F1 | Req §1 #1, §3.1 | DOCX | Neues Dokument → `footerToggle(page)` initial prüfen. | `aria-pressed="false"`; **kein** Fußzeilenbereich (`footerBands(page)` → `toHaveCount(0)`). |
| E-F2 | Req §1 #1/#3, §3.1 | DOCX | `footerToggle(page).click()`. | `toHaveAttribute('aria-pressed','true')`; **genau 1** `[data-footer-band]` (`toHaveCount(1)`); Fokus **sofort** im Footer: **ohne** Zusatzklick `page.keyboard.type('X')` → `X` erscheint in `activeFooterBand(page)`, **nicht** im `bodyEditor(page)` (Req §3.1 „kein zusätzlicher Klick nötig"). |
| E-F3 | Req §3.2 (Zeichenformat), Code §3.12 | DOCX | Weiter aus E-F2: Text tippen → `ControlOrMeta+a` → `page.getByTitle('Fett').click()`. | `activeFooterBand(page).locator('strong')` sichtbar; `bodyEditor(page)` bleibt **leer und unformatiert** (Toolbar wirkt kontextsensitiv auf den fokussierten Footer, Req §1 #5). |
| E-F4 | Req §3.2 (Absatzformat: zentriert) | DOCX | Ausrichtung „zentriert" im Footer anwenden (Toolbar-Button). | Footer-Absatz hat `text-align: center` (per `toHaveCSS`/style-Attribut); Body-Ausrichtung unverändert. |
| E-F5 | Req §3.2 (Listen) | DOCX | Im Footer eine Aufzählungsliste einfügen, 2 Einträge tippen (nach jedem `Enter` §0.2 Regel 1/2 beachten). | `activeFooterBand(page).locator('ul li')` → `toHaveCount(2)`; kein Absturz. |
| E-F6 | Req §3.2 (Tabelle+Bild), §6.2.4 | DOCX | Im Footer: Tabelle einfügen (`getByRole('button', { name: 'Tabelle einfügen' })`), eine Zelle füllen; Bild einfügen gemäß bestehendem Bild-Einfügen-E2E-Muster (siehe §7 Punkt 4). | Tabelle + Bild sichtbar im Footer-DOM; der Export (E-F10) enthält beide Strukturen im `footer1.xml` bzw. `word/_rels/footer1.xml.rels`. |
| **E-F7** | **Req §5.7, §9 Punkt 9 (Pflicht-Regressionstest)** | DOCX | Text „FooterText" im Footer tippen → **in den Body klicken** (`bodyEditor(page).click()`) → **auf Aktiv-Signal warten** (`await expect(areaStatus(page)).toHaveText(/Haupttext/)` bzw., falls `areaStatus` nicht implementiert, `await page.waitForTimeout(SELECTION_SYNC_MS)`) → „BodyText" tippen → zurück in den Footer klicken (`activeFooterBand(page).click()`) → Aktiv-Signal abwarten → „Mehr" tippen. **Zyklus 3× wiederholen** (Stresstest analog `selection-regression.spec.ts`). | Footer enthält **exakt** „FooterText…Mehr" (kein „BodyText"); Body enthält **exakt** „BodyText" (kein „FooterText"); keine Vermischung/kein Bereichsübergriff. Dauerhaft in der Suite, **kein** `test.skip`. |
| E-F7b | Req §3.5, §9 Punkt 4 (getrennte Undo) | DOCX | Footer fokussieren, „Eins" tippen → Body fokussieren (Signal abwarten), „Zwei" tippen → **im Body** `ControlOrMeta+z`. | Nur die Body-Eingabe wird rückgängig gemacht; **Footer bleibt „Eins"**. Umgekehrt: Footer fokussieren, `ControlOrMeta+z` → nur Footer-Änderung zurück, Body unberührt (getrennte `history()`-Instanzen, Code §4). |
| E-F8 | Req §6.2.1, §9 Punkt 6 (**XML-Inspektion, kein Sichttest**) | DOCX | Footer mit Text „Mustermann GmbH" + fett + zentriert (aus E-F3/E-F4) → `Exportieren` → `download`-Event → Datei von Disk lesen → `JSZip.loadAsync`. | `word/footer1.xml` enthält „Mustermann GmbH", `<w:b/>` und die Zentrier-Angabe (`w:jc w:val="center"`); `[Content_Types].xml` bzw. `document.xml` deklariert die `w:footerReference w:type="default"`. Negativprüfung: keine Konsolenfehler. |
| E-F9 | Req §6.2.4, §9 Punkt 6 | DOCX | Footer mit Text + Formatierung + Tabelle + Bild (E-F3–E-F6) → Export → `word/footer1.xml` + `word/_rels/footer1.xml.rels` extrahieren. | Enthält Text, `<w:b/>`, Tabellen-XML **und** einen Bild-Relationship-Eintrag in `footer1.xml.rels` (`Type=".../image"`) — alles in **einem** Export, nicht nur isoliert je Merkmal (deckt §1.6-Schreibfix end-to-end). |
| E-F10 | Req §6.2.1, §9 Punkt 6 (echter Re-Import) | DOCX | Export-Datei aus E-F8/E-F9 **erneut hochladen**: `getByRole('button', { name: /formate/i }).click()` → `docxCard(page).locator('input[type="file"]').setInputFiles({ …, buffer: exportedBuffer })` (§0.2 Regel 5). | Footer-Text + Formatierung weiter im DOM sichtbar; `footerToggle(page)` weiter `aria-pressed="true"`; Haupttext unverändert. |
| E-F11 | Req §6.2.2 | ODT | E-F2/E-F3/E-F8/E-F10 sinngemäß für die `odtCard` → Export → `styles.xml` enthält `<style:footer>` mit dem Text + Formatierung; Re-Import zeigt den Footer weiter. | Analoge Assertions, ODT-spezifisches XML (`<style:footer>` unter der Master-Page). |
| E-F12 | Req §6.2.5/§6.2.6 (Cross-Format) | DOCX↔ODT | Die App exportiert je Karte nur ihr **eigenes** Format (kein „Speichern unter"-Pfad, Code §3.14) → ein durchgängiger Browser-Cross-Format-Workflow ist **nicht** möglich. | `test.skip(...)` mit Begründungskommentar + Verweis, dass Cross-Format über Teil A (U-F10, U-F14) abgedeckt ist — analog zum in `datei-oeffnen-qa.md` etablierten Muster (offene Frage §6 Punkt 1). **Kein stiller Skip** — Grund im Kommentar. |
| E-F13 | Req §5.2, §3.6 (Deaktivieren, Abbrechen) | DOCX | Footer befüllt → **Dialog-Handler registrieren** (`page.once('dialog', d => { expect(d.message()).toMatch(/Fußzeile.*Inhalt|entfernen/i); d.dismiss() })`, §0.2 Regel 4) → `footerToggle(page).click()`. | Nach `dismiss()`: `aria-pressed` bleibt `"true"`, Footer-Inhalt **unverändert** (Abbrechen ändert nichts, Req §5.2). |
| E-F14 | Req §3.6, §9 Punkt 1 | DOCX | Weiter aus E-F13: Handler diesmal `d.accept()` → `footerToggle(page).click()`. | `aria-pressed="false"`; `footerBands(page)` → `toHaveCount(0)`; Export danach enthält **keine** `w:footerReference`/`footer1.xml` (keine verwaiste Referenz). |
| E-F15 | Req §5.6, §9 Punkt 6 (**Pflicht**) | DOCX | **Unmittelbar** nach E-F14 (Fokus auf dem Toggle-Button, nicht in einer View): `page.keyboard.press('ControlOrMeta+z')`. | Der zuletzt entfernte Fußzeileninhalt (Text + Formatierung) **kehrt zurück**; `aria-pressed` wieder `"true"` (Code §3.10.5 `pendingFooterRestore`). |
| E-F16 | Req §3.6 (leere Fußzeile ohne Rückfrage entfernbar) | DOCX | Footer aktivieren, **nicht** befüllen (leerer Absatz) → `footerToggle(page).click()`. | **Kein** `window.confirm` erscheint (leerer Inhalt, Code §3.10.4 `isChromeContentEmpty`); `aria-pressed="false"` sofort. |
| E-F17 | Req §1 #2, §3.1 (Doppelklick) | DOCX | Neues Dokument → Doppelklick in den unteren Seitenrandbereich (`page.mouse.dblclick` auf die per `footerBandTopPx(0)` erwartete Y-Position bzw. Doppelklick auf den Seiten-Wrapper unterhalb des Bodys). | Fußzeile wird aktiviert (`aria-pressed="true"`, `footerBands` erscheint) — kein ergebnisloser Doppelklick (Req §3.9). |
| E-F18 | Req §1 #9 (nice-to-have) | DOCX | Fokus abwechselnd Body/Footer setzen. | **Falls implementiert:** `areaStatus(page)` zeigt korrekt „Bearbeite: Haupttext"/„Bearbeite: Fußzeile". **Falls nicht:** `test.skip` mit Kommentar „nice-to-have, Req §1 #9 nicht blockierend, Status: nicht umgesetzt" — kein stiller Fehlschlag (Req §1 #9). |
| E-F19 | Req §5.11 | DOCX | Datei mit Kopf-, ohne Fußzeile importieren (`Headers.docx` bzw. selbst erzeugt `header != null`, `footer: null`) → Fußzeile aktivieren + befüllen → Export. | Kopfzeileninhalt im Export **unverändert** (String-Vergleich `header1.xml` vor/nach); Fußzeile zusätzlich vorhanden; keine fälschlich erzeugte leere Kopfzeile im Gegenfall. |

**Hinweis zu E-F7/E-F3 (Body-vs-Footer-Disambiguierung):** Body **und** aktives Footer-Band
rendern beide `.ProseMirror` (gemeinsame Editor-Komponente). Der aktive Footer-View liegt in
`[data-footer-band]`, der Body nicht → `activeFooterBand = [data-footer-band] .ProseMirror`
und `bodyEditor = .ProseMirror` **erste** Instanz (Body rendert vor den Bändern). Falls die
Implementierung ein explizites `data-area="body"` setzt, dieses bevorzugen. Der Abgleich ist
**Teil der Testimplementierung** (Code §3.10/§3.11) und hier nachzuziehen, nicht stillschweigend
im Testcode zu „reparieren".

### 3.3 Testfall-Tabelle: `footer-multipage.spec.ts`

| ID | Bezug | Schritte | Erwartung |
|---|---|---|---|
| E-M1 | Req §5.3, Code §2.2 | Neues Dokument → Footer aktivieren, „PageFoot" eingeben → in den Body wechseln (Signal abwarten) → **`page.keyboard.insertText(<langer Fülltext>)`** (§0.2 Regel 3), bis `footerBands(page)` mehr als 1 Element hat (`await expect(footerBands(page)).not.toHaveCount(1)`). | `footerBands(page)` → **> 1**; **jedes** Band `toContainText('PageFoot')` (Klon-Synchronität, Req §5.3). |
| E-M2 | Req §5.4 | Weiter aus E-M1: manuellen Seitenumbruch einfügen — **nur falls** `seitenumbruch`-Feature existiert; sonst `test.skip` mit Verweis auf `seitenumbruch-req.md` (Code §5 Zeile 5.4, §9). | Footer erscheint unverändert auf **beiden** durch den Umbruch entstehenden Seiten. |
| E-M3 | Req §5.5 | Footer mit mehrzeiligem Text/Tabelle befüllen, bis er die minimale Bandhöhe (`FOOTER_BAND_MIN_HEIGHT_PX`) überschreitet. | Band wächst sichtbar mit (`boundingBox().height > FOOTER_BAND_MIN_HEIGHT_PX`); `getComputedStyle(...).overflow !== 'hidden'`; **kein** verschwundener Text (`toContainText` bleibt erfüllt). Optische Überlappung mit der Folgeseite ist laut Code §2.1 **dokumentierte** Grenze, kein Fehlschlag — solange kein Inhalt verschwindet. |
| E-M4 | Req §5.3, Code §2.2.4 (Klick auf Nicht-Erst-Band) | Weiter aus E-M1: `footerBands(page).nth(1).click({ position: { x: 10, y: 5 } })` → Aktiv-Signal abwarten → `page.keyboard.type('Eingefügt')`. | Text erscheint im (einzigen) Footer-Inhalt, sichtbar auf **allen** Bändern (Klon-Sync); kein Crash; **entweder** an der geklickten Stelle **oder** am Ende (dokumentierter Fallback Code §2.2.4). Der Test assertiert auf **eines** der beiden konsistenten Ergebnisse, nicht „irgendein Verhalten". |
| E-M5 | Req §5.7 (Fokuswechsel im mehrseitigen Zustand) | Wiederholung von E-F7 **mit `pageCount > 1`**: Band 2 fokussieren, tippen → Body fokussieren (Signal abwarten), tippen. | Beide Bereiche behalten exakt ihren Inhalt — jetzt zusätzlich mit aktivem Reparenting-Mechanismus (Code §2.2.2). |

### 3.4 Testfall-Tabelle: `footer-fixtures.spec.ts` (Req §6.3, echte Fremddateien)

Für **jede** Datei: aus `tests/fixtures/external/{docx,odt}/` per `fs.readFile` einlesen, per
`setInputFiles({ name, mimeType, buffer })` auf der passenden Karte hochladen, sichtbaren
Fußzeilentext im DOM notieren, ohne Änderung exportieren (`Exportieren`), heruntergeladene
Datei über den Picker (`/formate/i`, §0.2 Regel 5) erneut hochladen, Fußzeilentext erneut
notieren, vergleichen. Alle Dateinamen sind im Repo als vorhanden verifiziert.

| ID | Datei | Format | Besonderheit (Req §6.3) | Zusätzliche Prüfung |
|---|---|---|---|---|
| E-X1 | `headerFooter.docx` | DOCX | Basisfall Kopf+Fuß; **hat laut Code §1.7 drei Varianten** (`even`/`default`/`first`) | Sichtbarer Footer-Text entspricht der **`default`**-Variante (nicht `even`) — Vergleich gegen den per U-F1 bekannten `default`-Inhalt; Varianten-Hinweisbanner sichtbar (siehe E-N1). |
| E-X2 | `HeaderFooterUnicode.docx` | DOCX | Unicode/Sonderzeichen (Req §5.15) | Zeichen **byteidentisch** nach Rundreise (`toBe`, nicht `toMatch`). |
| E-X3 | `FancyFoot.docx` | DOCX | Formatierte Fußzeile | Formatierung (fett/Farbe/Ausrichtung je Fixture) im DOM erkennbar erhalten. |
| E-X4 | `ThreeColFoot.docx` | DOCX | Dreispaltiges Layout (Tabstopps/Tabelle) | Text aus allen drei „Spalten" bleibt vollständig auffindbar, **kein** Textverlust (Darstellung darf vereinfachen). |
| E-X5 | `ThreeColHeadFoot.docx` | DOCX | Dreispaltig, Kopf+Fuß (Req §5.14) | Wie E-X4; zusätzlich Kopfzeile bleibt unabhängig/unverwechselt erhalten. |
| E-X6 | `SimpleHeadThreeColFoot.docx` | DOCX | Dreispaltig, Kopf+Fuß | Wie E-X4/E-X5. |
| E-X7 | `EmptyDocumentWithHeaderFooter.docx` | DOCX | Leeres Dok., **aktive** Fußzeile (Req §5.1) | `footerToggle(page)` ist direkt nach Import `aria-pressed="true"` (Req §3.1 letzter Punkt); Body leer, Editor öffnet fehlerfrei. |
| E-X8 | `NoHeadFoot.docx` | DOCX | Negativfall (Req §6.1) | `footerToggle(page)` ist `aria-pressed="false"` nach Import **und** bleibt es nach unverändertem Export/Reimport. |
| E-X9 | `DiffFirstPageHeadFoot.docx` | DOCX | „Erste Seite anders" (Req §5.9) | Mind. eine Variante sichtbar/editierbar (kein leerer Footer trotz Original-Inhalt); Hinweisbanner sichtbar; nach Rundreise bleibt der Text der **angezeigten** Variante erhalten (die andere darf vereinheitlicht werden — Req §7 dokumentiert zulässig, kein Textverlust der angezeigten). |
| E-X10 | `PageSpecificHeadFoot.docx` | DOCX | Seitenspezifisch (Req §5.9) | Wie E-X9. |
| E-X11 | `Headers.docx` | DOCX | Nur Kopfzeile (Req §5.11) | `footerToggle(page)` `aria-pressed="false"` nach Import; Fußzeile aktivieren+befüllen lässt die Kopfzeile unverändert (Datenprüfung ergänzt U-F12). |
| E-X12 | `ThreeColHead.docx` | DOCX | Nur Kopfzeile (Req §5.11) | Wie E-X11. |
| E-X13 | `HeaderFooter.odt` | ODT | Basisfall ODT (Req §5.14) | Analog E-X1 (ohne Mehrvarianten-Sonderfall, sofern nur eine Master-Page — bei Import verifizieren). |
| E-X14 | `headfoot.odt` | ODT | Basisfall ODT | Analog E-X13. |
| E-X15 | `headerFinal.odt` | ODT | Basisfall ODT | Analog E-X13. |
| E-X16 | `headerFirstPage.odt` | ODT | Erste-Seite-Variante (Req §5.9) | Analog E-X9, Hinweisbanner sichtbar. |
| E-X17 | `HeaderFirstPageEnabled_MSO15.odt` | ODT | Erste-Seite-Variante | Analog E-X16. |
| E-X18 | `HeaderFirstPageDisabled_MSO15.odt` | ODT | Erste-Seite-Variante (deaktiviert) | Verhalten wie Basisfall; verifizieren, dass **kein** unnötiger Hinweisbanner erscheint, falls effektiv nur eine Master-Page wirksam ist. |
| E-X19 | `HeaderFirstAndEvenPageEnabled_MSO15.odt` | ODT | Erste-Seite **und** gerade/ungerade (Req §5.9) | Analog E-X9; geladene Variante entspricht der in U-F5 verifizierten **Kettenziel**-Master-Page (Regression gegen Code §1.8). |
| E-X20 | `HeaderFirstAndEvenPageEnabledAndMarging_MSO15.odt` | ODT | Wie E-X19 + abweichende Ränder | Wie E-X19; Ränder sind **nicht** Gegenstand dieses Features → keine Rand-Assertion. |
| E-X21 | `tabellen_header_DOC_LO4-1-0.odt` | ODT | Tabelle im Kopf-/Fußbereich | Tabellenstruktur (Zeilen/Spalten) bleibt nach Rundreise erhalten, **sofern** die Tabelle im **Fuß**-Teil liegt (bei Import verifizieren; falls nur Kopf, informativ mitlaufen lassen und dem Schwester-Slug zuordnen). |

**Cross-Format-Ergänzung (Req §6.3 Testfall 2):** Für E-X1/E-X13 zusätzlich je ein
Cross-Format-Fall — jedoch dieselbe App-Strukturgrenze wie E-F12 (Karten exportieren nur ihr
eigenes Format). Bis zur Klärung (§6 Punkt 1) über Teil A (U-F14) abgedeckt; hier nur
`test.skip(...)` mit Begründung.

**Bild-in-Fußzeile-Sonderfall (Req §6.3 Testfall 3):** Laut Code §1.11 enthält **keine** reale
Fixture ein Bild im **Fuß**-Teil (`headerPic.docx` trägt es im Kopf). Der Fall „Bild in
Fußzeile bleibt bei Rundreise zugeordnet" wird daher **ausschließlich** über E-F6/E-F9
(selbst erzeugtes Dokument) + U-F3/U-F4 nachgewiesen — keine Testlücke, sondern durch das
Testmaterial vorgegeben und hier bewusst dokumentiert (kein stiller Fehlschlag).

### 3.5 Testfall-Tabelle: `footer-variant-notice.spec.ts` (Req §7 Deklarationspflicht)

| ID | Bezug | Schritte | Erwartung |
|---|---|---|---|
| E-N1 | Req §7 „Erste Seite anders" | `DiffFirstPageHeadFoot.docx` importieren. | Sichtbarer Hinweisbanner (`variantNotice(page)`); per „×"-Button schließbar; nach Schließen bleibt der Editor-Inhalt unverändert. |
| E-N2 | Req §7 gerade/ungerade | `HeaderFirstAndEvenPageEnabled_MSO15.odt` importieren. | Analoger Banner sichtbar. |
| E-N3 | Req §7 „mehrere Abschnitte" | Reale Mehrabschnitts-DOCX (falls im Repo identifizierbar) oder synthetisch (zwei `w:sectPr`, je eigene `footerReference`); sonst `test.skip` mit Kommentar „keine passende reale Fixture, Nachweis nur auf Unit-Ebene (U-F12) + Code §3.6b". | Der Reader nutzt deterministisch den **Body-Ende-`sectPr`** (= wirksame/letzte Section, Code §3.6b, **bewusst keine Regression** auf „erste Section"); kein Textverlust der wirksamen Fußzeile; Hinweis, falls mehrere `sectPr` vorhanden. |

---

## 4. Testdaten-Inventar

| Bedarf | Quelle |
|---|---|
| Basis-Rundreise, selbst erzeugt (Req §6.2) | Direkt im Browser über Toggle+Tippen (`footer.spec.ts`), kein Fixture-File. |
| Reale Fremddateien mit Fußzeile (Req §6.3) | Vorhanden unter `tests/fixtures/external/docx/` (12 relevante) und `.../odt/` (9 relevante) — vollständig in §3.4 aufgeführt, Existenz **aller** für diesen Plan geprüft. |
| Feld-Text-Erhalt-Regression (`w:fldSimple`/`w:fldChar`, `text:page-number`/`text:page-count`) | Synthetisch als roher XML-String im Unit-Test (U-F2, U-F6). Real vorhanden zur optionalen Korroboration: `docx/FldSimple.docx`, `docx/FieldCodes.docx`, `odt/feature_fields.odt`, `odt/fields.odt` — Fußzeileninhalt beim Implementieren verifizieren, synthetisch bleibt maßgeblich. |
| Bild-Rels-Scoping-Regression | Synthetisch im Unit-Test (U-F3/U-F4) — keine reale Footer-Bild-Fixture (Code §1.11). |
| Mehrseitiges Dokument (`footer-multipage.spec.ts`) | Programmatisch über `page.keyboard.insertText(<lang>)`; Schwellenwert experimentell ermitteln und als benannte Konstante im Test dokumentieren (§7 Punkt 1). |
| Mehrabschnitts-DOCX (E-N3) | Kein passendes Repo-Fixture identifiziert — synthetisch bauen oder als dokumentierte Lücke (E-N3) belassen. |

---

## 5. Rückverfolgbarkeits-Matrix

### 5.1 Req → Test (jede Anforderung mind. ein Test)

| Req-Abschnitt | Test-ID(s) |
|---|---|
| §1 #1 (Toggle-Button, SVG-Icon, `aria-pressed`) | E-F1, E-F2 |
| §1 #2 (Doppelklick unterer Rand) | E-F17 |
| §1 #3 (abgegrenzter Editierbereich) | E-F2, E-M1 |
| §1 #4 (Fokus-Übergang) | E-F7, E-M5 |
| §1 #5 (Toolbar kontextsensitiv) | E-F3, E-F4, E-F5 |
| §1 #6 (Deaktivieren/Entfernen + Bestätigung) | E-F13, E-F14, E-F16 |
| §1 #9 (Statusanzeige, nice-to-have) | E-F18 |
| §3.1 (Aktivierung, sofort tippen; Import mit/ohne Fußzeile) | E-F2, E-X7, E-X8 |
| §3.2 (Editierparität: Text, Zeichen-/Absatzformat, Listen, Tabellen, Bilder, Überschrift) | E-F3, E-F4, E-F5, E-F6, U-F8, U-F9 |
| §3.5 (getrennte Undo-Historien) | E-F7b |
| §3.6 (Leeren ≠ Entfernen; leere Fußzeile ohne Rückfrage entfernbar) | E-F16, U-F7 |
| §4 (Seitenlayout-Integration) | E-M1–E-M4, U-F11 |
| §5.1 (leere aktive Fußzeile bleibt erhalten) | U-F7 |
| §5.2 (Bestätigungsdialog, Abbrechen ändert nichts) | E-F13 |
| §5.3 (mehrseitig, jede Seite) | E-M1 |
| §5.4 (manueller Seitenumbruch) | E-M2 (bedingt, `seitenumbruch`-Feature) |
| §5.5 (Inhalt größer als Rand, kein Abschneiden) | E-M3 |
| §5.6 (Undo nach Deaktivieren) | E-F15 |
| §5.7 (Fokuswechsel-Regression, Pflicht) | E-F7, E-M5 |
| §5.8 (Überschrift in Fußzeile) | U-F8 |
| §5.9 (Import „erste Seite anders"/gerade-ungerade, kein Totalverlust) | U-F1, U-F5, E-X9, E-X10, E-X16–E-X20 |
| §5.10 (mehrere `sectPr`) | U-F12 (Datenebene), E-N3 (bedingt) |
| §5.11 (Fuß ändern lässt Kopf unangetastet, umgekehrt kein leerer Kopf) | E-F19, E-X11, E-X12, U-F12 |
| §5.12 (Seitenumbruch **in** Fußzeile) | Nicht anwendbar (kein Seitenumbruch-Node, Code §5) — als offener Folgepunkt dokumentiert |
| §5.13 (Bild in importierter Fußzeile) | U-F3, U-F4, E-F9 (selbst erzeugt; Code §1.11) |
| §5.14 (Kopf+Fuß gleichzeitig, versch. Text) | E-X5, E-X13, U-F12/U-F13 |
| §5.15 (Unicode) | E-X2 |
| §5.16 (Cross-Format nicht 1:1 abbildbar) | U-F10 (Text bleibt), U-F2/U-F6 (Feld→Text) |
| §6.1 (Baseline-Rundreise, `footer===null` bleibt) | E-X8, U-F12/U-F13, §2.1 Regressionsblöcke |
| §6.2 (Feature-Rundreise DOCX/ODT/Cross-Format inkl. Format/Bild/Kopf+Fuß/Entfernen) | E-F8–E-F14, E-F19, U-F9, U-F10 |
| §6.3 (Fremddatei-Rundreise, alle Fixtures) | E-X1–E-X21, U-F12–U-F14 |
| §6.4 (unabhängige Schema-Validierung mit Fußzeile) | U-F15 |
| §7 (Deklarationspflicht: erste Seite/gerade-ungerade/Mehrfach-Section/Feld→Text) | E-N1, E-N2, E-N3, U-F2, U-F6 |
| §9 Punkt 1 (Bedienelemente per echter Interaktion) | E-F1, E-F2, E-F13, E-F14, E-F17 |
| §9 Punkt 2 (Layout-Entscheidung §4 nachgewiesen) | E-M1–E-M4, U-F11 |
| §9 Punkt 3 (Editierfunktionen per echter Interaktion) | E-F3–E-F6 |
| §9 Punkt 4 (getrennte Undo) | E-F7b |
| §9 Punkt 5 (Baseline-Rundreise grün) | E-X8, §2.1 |
| §9 Punkt 6 (Feature-Rundreise, echter Zyklus) | E-F8–E-F11, E-F19 |
| §9 Punkt 7 (Fremddatei-Rundreise alle Fixtures) | E-X1–E-X21 |
| §9 Punkt 8 (unabhängige Schema-Validierung ODT+DOCX) | U-F15 |
| §9 Punkt 9 (Selection-Sync-Regressionstest dauerhaft in Suite) | E-F7 (permanent, kein `test.skip`) |
| §9 Punkt 10 (Reader-Lücken befundet/behoben/dokumentiert) | U-F3/U-F4 (Bild-Rels behoben), U-F1/U-F5 (Auswahlregel behoben), U-F2/U-F6 (Feld→Text dokumentiert) |
| §9 Punkt 11 (kein stiller Fehlschlag) | E-N1–E-N3, E-F17-Doppelklick-Feedback, `errors`-Assertion in jeder Spec |
| §9 Punkt 12 (Architektur verbaut `seitenzahl-einfuegen` nicht) | Implizit: Schema unverändert (Code §3.1) → U-F1–U-F14 bleiben grün; Verhältnis zu `kopfzeile-bearbeiten` = zwei Buttons (Code §0 Entsch. 5) |

### 5.2 Code-Befund → Regressionstest

| Code-Befund | Test-ID(s) |
|---|---|
| §1.5 (leere aktive Fußzeile, Writer bereits korrekt) | U-F7 |
| §1.6 (Bild-Rels-Scoping, Reader+Writer) | U-F3, U-F4, E-F9 |
| §1.7 (`w:type="default"`-Präferenz, `headerFooter.docx`) | U-F1, E-X1 |
| §1.8 (ODT-Master-Page-Kette) | U-F5, E-X19 |
| §1.9 (Feld → statischer Text erhalten, dokumentierte Einschränkung) | U-F2, U-F6 |
| §2 (FooterBands-Architektur, Reparenting, Klon-Sync) | E-M1–E-M5 |
| §3.4/§3.5 (`pageCount`-Callback, `footerBandTopPx`) | U-F11, E-M1 |
| §3.6b (Multi-Section = wirksame letzte Section, bewusst keine Regression) | U-F12, E-N3 (bedingt) |
| §3.10.3 (Selection-Sync über zweiten `mouseup`-Listener) | E-F7, E-M5 |
| §3.10.5 (`pendingFooterRestore`, Undo nach Deaktivieren) | E-F15 |

---

## 6. Offene Klärungsfragen vor Testimplementierung

1. **Cross-Format-Export-Pfad in der App-UI:** Code §3.14 bestätigt, dass
   `DocumentWorkspace.tsx` unverändert bleibt und jede Format-Karte **nur ihr eigenes** Format
   exportiert (kein „Speichern unter anderem Format"). Die Cross-Format-Rundreise (Req §6.2.5/
   §6.2.6, §6.3 Testfall 2) lässt sich daher **nicht** über einen einzigen durchgängigen
   Browser-Workflow (Upload Format A → Export Format B → Reimport) nachstellen. Bis zur
   Klärung, ob ein anderer vorhandener App-Pfad das erlaubt, wird dieser Teil **nur** über
   Teil A (U-F10, U-F14) verifiziert; E-F12 und die Cross-Format-Zeile in §3.4 bleiben
   `test.skip(...)` mit Begründungskommentar (etabliertes Muster aus `datei-oeffnen-qa.md`).
2. **Varianten-Signal-Kanal (U-F1/U-F5):** `meta.footerVariantNotice` ist in Code §3.9 nur
   Vorschlag mit Review-Vorbehalt (transientes Feld im persistierten Modell vs. separater
   Reader-Rückgabewert). Der zu prüfende **Vertrag** ist „bei mehreren Varianten wird ein
   maschinenlesbares Signal gesetzt + ein sichtbarer Hinweis gerendert" — U-F1/U-F5/E-N1/E-N2
   sind gegen den tatsächlich gewählten Kanal abzugleichen, nicht gegen den Property-Namen.
3. **Selektor-Feinabgleich:** Alle Fußzeilen-Locator (`[data-footer-band]`, Toggle-`aria-label`,
   `areaStatus`, `variantNotice`) sind Code §3.11/§3.12 entnommen (Vorschlag) und beim Schreiben
   gegen die reale Implementierung von `WordEditor.tsx`/`Toolbar.tsx`/`FooterBands.tsx`
   abzugleichen; Abweichungen sind hier nachzuziehen, nicht stillschweigend im Testcode zu
   „reparieren" (Req §3.9).

---

## 7. Bekannte Automatisierungsgrenzen (dokumentiert, nicht stillschweigend übersprungen)

1. **Schwellenwert „mehrseitiges Dokument" (E-M1):** Wie viel Text zu `pageCount > 1` führt,
   hängt von `PAGE_CONTENT_HEIGHT_PX` und der Viewport-Höhe ab und ist erst am laufenden Code
   exakt bestimmbar. Der Test ermittelt den Umfang einmalig und hält ihn als benannte Konstante
   fest (kein Magic-Number-Rätsel); als Warte-Barriere dient die auto-retrying
   `expect(footerBands(page)).not.toHaveCount(1)`, nicht ein Sleep (§0.2 Regel 3).
2. **`caretRangeFromPoint`/Klick-zu-Position (E-M4):** Verhalten bei verschachtelten Marks ist
   laut Code §2.2.4/§9 nicht im Voraus bewiesen (dokumentierter Fallback „Cursor ans Ende").
   E-M4 testet bewusst **beide** akzeptablen Ausgänge. Pixelgenaue Klick-Koordinaten sind
   font-rendering-abhängig und leicht flaky; bei Flackern ist eine Toleranz-Erhöhung (Klick-Ziel
   näher am Bandanfang) der erste Reparaturschritt, **kein** Testausschluss.
3. **`window.confirm`-Timing (E-F13/E-F14):** `page.on('dialog', …)`/`page.once('dialog', …)`
   muss **vor** dem auslösenden `footerToggle().click()` registriert sein (§0.2 Regel 4), sonst
   blockiert der native Dialog den Lauf.
4. **Bild-Einfüge-Mechanismus (E-F6):** Der exakte UI-Weg (Datei-Dialog/Toolbar/Drag&Drop) wird
   **nicht** neu festgelegt, sondern folgt dem etablierten Muster aus `specs/bild-einfuegen-qa.md`
   — dort nachschlagen statt einen zweiten, konkurrierenden Mechanismus zu erfinden.
5. **Selection-Sync-Race (alle Fokuswechsel):** siehe §0.2 — primär auf ein beobachtbares
   Aktiv-Signal warten (`areaStatus`/`aria-pressed`/`:focus-within`); nur beim signal-losen
   Caret-Move der feste `SELECTION_SYNC_MS`-Wait (identisch zum bestehenden
   `selection-regression.spec.ts`). Dieser Punkt ist für die Abnahme **kritisch**, weil Body↔
   Footer strukturell derselbe Fehlerfall wie der bereits behobene Bug ist (Req §5.7).
6. **Mobile-Projekt (Touch):** Die neuen Specs müssen auch unter „Mobile" (Pixel 7) grün sein;
   die jüngsten Commits zeigen, dass gerade dort der Selektions-Sync empfindlich ist. Touch-Taps
   (`tap()`) statt `click()` können nötig sein — beim Implementieren verifizieren.

---

## 8. Ausführungsplan

1. **Unit-Tests zuerst:** `npm test` (Vitest, `jsdom`) muss grün sein, bevor Teil B startet
   (schnelles Fail-Fast). Reihenfolge: Reader/Writer-Fix-Regressionen (U-F1–U-F8, U-F11) vor den
   größeren Fixture-Sweep-Erweiterungen (U-F12–U-F15), da letztere von den Fixes abhängen.
2. **E2E-Tests:** `npm run test:e2e` (Playwright, baut automatisch via `webServer`) —
   verbindlich **Desktop Chrome** und **Mobile** für die Abnahme. Reihenfolge: `footer.spec.ts`
   (Kern) → `footer-fixtures.spec.ts` (reale Dateien, höchste Priorität Req §6.3) →
   `footer-multipage.spec.ts` → `footer-variant-notice.spec.ts`.
3. Nach jedem Lauf: `playwright-report/` als Nachweis archivieren.
4. Offene Fragen (§6) **vor** Testimplementierung mit Lead/PO klären, insbesondere Punkt 1
   (Cross-Format-Pfad), da er die Struktur mehrerer Testfälle direkt beeinflusst.

---

## 9. Exit-Kriterien (Abnahme, siehe Req §9)

Der Status `fusszeile-bearbeiten` darf erst auf „vorhanden und verifiziert" gesetzt werden, wenn:

1. Alle Unit-Ergänzungen aus §2.2 (U-F1–U-F15) grün sind.
2. Alle E2E-Fälle aus §3.2–§3.5 (E-F1–E-F19, E-F7b, E-M1–E-M5, E-X1–E-X21, E-N1–E-N3) grün sind
   — inklusive **0 protokollierter** Konsolenfehler/unbehandelter Exceptions über den gesamten
   Ablauf (Import→Bearbeiten→Export→Reimport), geprüft per `errors`-Assertion je Spec.
3. Der Pflicht-Regressionstest für den Fokuswechsel-Grenzfall (E-F7, Req §5.7/§9 Punkt 9)
   dauerhaft und **ohne** `test.skip` in der Suite vorhanden ist — und die Determinismus-
   Leitplanken (§0.2) in **jeder** Fokuswechsel-Zeile eingehalten sind (keine ungesicherte
   Tastatureingabe direkt nach einem Fokus-/Caret-Wechsel).
4. Jede Zeile der Rückverfolgbarkeits-Matrix (§5.1/§5.2) einen grünen Test-ID-Verweis hat —
   keine Anforderungszeile ohne Test; jede als „nicht anwendbar"/„bedingt" markierte Zeile
   (§5.12 Seitenumbruch-Node, E-F18 nice-to-have, E-M2 `seitenumbruch`, E-F12/Cross-Format-Pfad)
   mit expliziter, hier dokumentierter Begründung.
5. Für **jeden** in Code §1.5–§1.9 benannten Befund ein regressionssichernder Test grün ist
   (U-F1, U-F2, U-F3, U-F4, U-F5, U-F6, U-F7) — diese sieben gelten als **nicht verhandelbarer**
   Mindestnachweis, da sie reale, am Fixture-Material verifizierte Befunde abdecken; U-F2/U-F6
   sichern zusätzlich die **dokumentierte Einschränkung** „Feld → statischer Text" (Req §7).
6. Die unabhängige Schema-Validierung eines Exports **mit** nicht-leerer Fußzeile für ODT **und**
   DOCX (U-F15) grün ist (Req §9 Punkt 8).
7. Die drei offenen Klärungsfragen (§6) entweder beantwortet und in zusätzliche grüne Tests
   überführt, oder als bewusste, hier dokumentierte Einschränkung stehen gelassen sind — kein
   stillschweigendes Liegenlassen.
