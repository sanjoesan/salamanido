# QA-Testplan: Feature „Seitenzahl einfügen"

Rolle: QA-Antwort auf `specs/seitenzahl-einfuegen-req.md` (Anforderung) und
`specs/seitenzahl-einfuegen-code.md` (Entwicklerplan, datiert 2026-07-04). Dieses
Dokument nimmt **keinen** der beiden Vorgängertexte als bewiesen an. Anders als bei
anderen Features in diesem Repo ist hier zusätzlich zur üblichen Vorsicht gegenüber
einem „nur geplanten" Fix eine zweite, härtere Tatsache zu berücksichtigen: die
Anforderung selbst benennt in ihrem Abschnitt 3.1/7 eine **externe, harte
Abhängigkeit** (bedienbarer Kopf-/Fußzeilenbereich, Tickets
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`), die zum Zeitpunkt dieses Testplans
laut eigener Prüfung (Abschnitt 0 unten) ebenfalls **nicht** erfüllt ist. Das
bedeutet: ein Teil der in Anforderung Abschnitt 6 verlangten E2E-Tests kann beim
besten Willen noch nicht in seiner vollständigen (Kopf-/Fußzeilen-)Form geschrieben
werden — dieser Plan macht das explizit statt es stillschweigend auszulassen, und
liefert dafür den nach `seitenzahl-einfuegen-code.md` Kernentscheidung 3.6
tatsächlich heute schon möglichen Ersatznachweis auf Body-Ebene.

Stil/Gliederung orientiert an `aufzaehlungsliste-qa.md`/`fett-qa.md`.

> **Determinismus ist in diesem Feature nicht optional, sondern das zentrale
> Qualitätsrisiko.** Das Feld wird per Inline-Einfügung an der Cursor-Position
> erzeugt — genau der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 beschriebene
> Selection-Sync-Verdachtsfall. Die Git-Historie dieses Repos zeigt mehrere bereits
> behobene, **flaky** gewordene E2E-Tests (`selection-regression.spec.ts`,
> `cut.spec.ts`), deren Ursache jeweils dieselbe war: eine zu schnell auf einen
> nativen Cursor-Move folgende Tastatureingabe, die der asynchronen
> `selectionchange`-Synchronisation von ProseMirror vorauslief — reproduzierbar
> **nur** in den Mobile-/Tablet-Playwright-Projekten. Abschnitt 3.0 macht die daraus
> gelernten Determinismus-Regeln für diesen Testplan **bindend**; sie sind in die
> einzelnen Testschritte eingearbeitet.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `seitenzahl-einfuegen-code.md`)

Vor Aufstellung des Plans wurden die zentralen Tatsachenbehauptungen aus
`seitenzahl-einfuegen-code.md` direkt im aktuellen Code nachvollzogen. Load-bearing
ist das **Verhalten**; exakte Zeilennummern können je nach Stand leicht abweichen und
sind nicht das Prüfkriterium.

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Kein Treffer für `page_number_field`/`insertPageNumber`/`fldSimple`/`fldChar`/`page-count` im gesamten `src/`-Baum | `grep -rniE "page_number_field\|page-number\|insertPageNumber\|fldSimple\|fldChar\|page-count" src/` ausgeführt | **Bestätigt.** Einzige Treffer sind zufällige Substring-Treffer des Wortes „page" in anderem Kontext (Paginierung/Seitenlayout), **kein** Bezug zu einem Seitenzahl-Feld. Das Feature ist zum Zeitpunkt dieses Testplans **zu 0 % implementiert**, `seitenzahl-einfuegen-code.md` ist tatsächlich nur ein Plan. |
| `decodeParagraphRuns` steigt bereits **rekursiv** über `collectRuns` in `w:fldSimple`/`w:sdt`/`w:ins`/`w:hyperlink` ab; ein PAGE-Feld geht **nicht** verloren, sondern wird zu **statischem Text degradiert** (Cache-Ziffer bleibt sichtbar) | `src/formats/docx/reader.ts` `collectRuns`/`decodeRunElement` gelesen | **Bestätigt — Degradierung, nicht Totalverlust.** Deckt sich mit Anforderung §0.4 (Korrektur eines früheren Entwurfs) und Code-Plan Abschnitt 1 Zeile 4. Der zu behebende Fehler ist der **Verlust der Feldsemantik** (eingefrorenes, auf Folgeseiten falsches Literal), nicht ein verschwundener Text. |
| `headerRef`/`footerRef` nutzen `firstChildNS` ohne `w:type`-Filter → lesen bei Erste-Seite-/Gerade-Ungerade-Varianten die **falsche** (strukturell erste) Referenz | `readDocx`/`firstChildNS` gelesen; an `bug57031.docx` gegengezählt (even-Referenz steht vor default) | **Bestätigt** — F4 aus dem Code-Plan ist noch nicht behoben. |
| ODT-`walk()` besitzt bereits einen `else`-Fallback; ein `<text:page-number>` wird **nicht** übersprungen, sondern sein Cache-Text bleibt als **statischer Text** (Degradierung) | `src/formats/odt/reader.ts` `walk()` gelesen | **Bestätigt — Degradierung, nicht Totalverlust** (Anforderung §0.5-Korrektur). |
| Kein Toolbar-Eintrag „Seitenzahl"/„Kopfzeile"/„Fußzeile" | `src/formats/shared/editor/Toolbar.tsx` durchsucht | **Bestätigt**, kein Treffer. |
| Kein Kopf-/Fußzeilen-Editierbereich in der UI (Abhängigkeit aus Anforderung §3.1) | `WordEditor.tsx` seedet genau eine `EditorView` aus `doc.content.body`; `header`/`footer` werden in `WordEditor.tsx`/`Toolbar.tsx` nirgends referenziert | **Bestätigt.** Die harte Abhängigkeit ist ebenfalls unerfüllt — `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` haben zwar `-req.md`/`-code.md` in `specs/`, aber keine sichtbare Umsetzung im Code. |
| Reale Fixture-Dateien aus dem Code-Plan existieren tatsächlich im Repo | `ls tests/fixtures/external/{docx,odt}` gegen die genannten Namen abgeglichen | **Bestätigt**: u. a. `FancyFoot.docx`, `60316.docx`, `bug57031.docx`, `Bug54771a.docx`, `PageSpecificHeadFoot.docx`, `60329.docx`, `Bug60341.docx`, `Bug51170.docx`, `WordWithAttachments.docx`, `MultipleBodyBug.docx`, `odf-fields.odt`, `fields.odt`, `sample.odt`, `sample_numbering_DOC_LO41.odt` vorhanden. |
| Bestehende E2E-Muster (`docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`) und Upload-/Export-Konventionen wie im Code-Plan referenziert | `ls tests/e2e`; `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts` gelesen | **Bestätigt** — **mit einer wichtigen Korrektur gegenüber einer früheren Fassung dieses Plans**: der reale Upload-Pfad ist `card.locator('input[type="file"]').setInputFiles(...)` und für den Reimport zwingend die Rücknavigation über den „← Formate"-Button; **kein** dauerhaft sichtbarer „Datei hochladen"-Button im Editor (siehe Abschnitt 1 und 3.12). |

### 0.1 Konsequenz für diesen Testplan

Weil sowohl das Feature selbst **als auch** seine harte Abhängigkeit
(Kopf-/Fußzeilen-UI) zu 0 % umgesetzt sind, gliedert dieser Plan die
E2E-Anforderung aus Anforderung Abschnitt 6, Punkt 3/6/7 in **zwei Ebenen**, exakt
wie es der Code-Plan selbst in seiner Kernentscheidung 3.6 vorschlägt, hier aber
als verbindliche QA-Prüfmatrix statt als bloße Absichtserklärung:

- **Ebene „Body" (heute umsetzbar und Pflicht-Abnahmekriterium für diesen Plan):**
  Seitenzahl-Feld irgendwo im Hauptdokument einfügen, formatieren, löschen,
  exportieren, reimportieren — alles über echte Playwright-Bedienung. Das prüft
  Schema/Command/Toolbar/Reader/Writer vollständig, weil `page_number_field` ein
  gewöhnlicher Inline-Node ist, der überall im `inline*`-Content erlaubt ist, wo
  auch `text` erlaubt ist (siehe Code-Plan 4.1) — der Editor unterscheidet beim
  aktuellen Stand (nur eine, an `body` gebundene Editor-Instanz) ohnehin nicht
  zwischen „Body" und „Kopf-/Fußzeile".
- **Ebene „Kopf-/Fußzeile" (blockiert, kein Abnahmekriterium *dieses* Plans, aber
  zwingend nachzuholen):** identische Testfälle, sobald
  `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen fokussierbaren Editierbereich
  liefern. Diese Tests werden unten **bereits vollständig spezifiziert** (Abschnitt
  3.10), aber als **„BLOCKIERT"** markiert und dürfen nicht durch die Body-Ebene
  ersetzt/vorgetäuscht werden — das Freigabekriterium aus Anforderung §7 verlangt
  ausdrücklich den Kopf-/Fußzeilen-Nachweis, nicht nur den Body-Nachweis.

**Wichtige Einschränkung, die dieser Plan gegenüber dem Code-Plan zusätzlich
festhält:** Ein auf Body-Ebene grüner Test ist **kein** Ersatzbeweis für die in
Anforderung §5.1/§5.2 verlangte Kopf-/Fußzeilen-Rundreise — Reader/Writer laufen für
`header`/`footer` über **andere Code-Pfade** als für den `body` (DOCX: eigener
`readBodyChildren`-Aufruf pro Kopf-/Fußzeilen-Part mit eigener Relationship-Tabelle;
ODT: Kopf-/Fußzeile stammt aus `styles.xml` → `style:master-page`, **nicht** aus
`content.xml`). Auch wenn Code-Plan 4.2 „keine Änderung an `documentModel.ts` nötig"
sagt, beweist Body-Grün deshalb nicht automatisch Kopf-/Fußzeilen-Grün. Dieser Plan
verlangt daher in 2.1/2.2 (DU8/OU6) einen **zusätzlichen, gezielten** Unit-Test, der
`page_number_field` direkt in `header`/`footer` (nicht nur `body`) durch Reader/Writer
schickt — das ist bereits **heute**, ganz ohne UI-Abhängigkeit, ausführbar
(`WordDocumentContent.header`/`.footer` sind beschreibbares `ProseMirrorJSON | null`,
siehe Code-Plan 4.2) und schließt die vom Code-Plan selbst offen gelassene Lücke
zwischen „Body-E2E-Test grün" und „Kopf-/Fußzeile funktioniert wirklich".

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün und **stabil**
    sein (nicht nur auf Desktop; die bekannten Flakes traten ausschließlich in
    Mobile/Tablet auf — siehe 3.0).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`
    (Kartentitel: „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)").
  - Neues Dokument: `card.getByRole('button', { name: 'Neu erstellen' }).click()`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Seitenzahl-Button (**neu**, gemäß Code-Plan 4.4): der zugängliche Name ist
    „Seitenzahl einfügen" (per `aria-label` **und** `title`). Primär adressieren wie
    in Anforderung §6 Punkt 5 verlangt:
    `page.getByRole('button', { name: 'Seitenzahl einfügen' })` (gleichwertig:
    `page.getByTitle('Seitenzahl einfügen')`, analog `getByTitle('Fett')` in den
    bestehenden Tests).
  - Export: Download-Listener **vor** dem Klick registrieren —
    `const dl = page.waitForEvent('download')` → `page.getByRole('button', { name: 'Exportieren' }).click()` → `await dl`.
    Datei wie in `docx.spec.ts:82-88` vom Dateisystem lesen (`download.path()` +
    `fs.readFile`), **nicht** aus dem Speicher der ersten Session.
  - **Upload/Reimport (etablierte, reale Repo-Konvention — Korrektur einer früheren
    Fassung dieses Plans):**
    `card.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`.
    Das ist der **echte** Upload-Pfad: `setInputFiles` befüllt den realen `<input
    type="file">` und löst den echten `onChange`-Import-Handler der App aus — es ist
    **kein** „Umgehen" der UI. Der `Datei hochladen`-Button
    (`getByRole('button', { name: 'Datei hochladen' })`) **und** das versteckte
    `input[type="file"]` existieren nur auf dem **Format-Picker-Bildschirm**
    (`FormatPicker.tsx`), **nicht** im geöffneten Editor. Für einen Reimport nach dem
    Export daher **zwingend zuerst zurück zum Picker navigieren**:
    `page.getByRole('button', { name: /formate/i }).click()` (Button „← Formate",
    `DocumentWorkspace.tsx`), **dann** erneut
    `card.locator('input[type="file"]').setInputFiles(...)` (exakt das Muster in
    `docx.spec.ts:240-247`/`odt.spec.ts:217-223`). Ohne die Rücknavigation existiert
    kein Datei-Input → der Test scheitert.
  - Feld-Locator im DOM: `page.locator('.pm-field-page-number')` (gemäß Code-Plan
    4.1/4.5 — `span[data-field-type="page-number"]` mit Klasse
    `pm-field pm-field-page-number`).
- **Export-Fokus-Eigenheit (determinismus-/regressionsrelevant):** Nach einem Klick
  auf „Exportieren" kann der Fokus den Editor verlassen (der Button wird `disabled`,
  der Browser blurt das fokussierte Element auf `<body>`; `DocumentWorkspace.tsx`
  mildert das per `onMouseDown preventDefault`). Jeder Testfall, der **nach** einem
  Export weitertippt, muss vorher wieder in den Editor klicken
  (`await page.locator('.ProseMirror').click()`), sonst geht die Eingabe still ins
  Leere (bekannter Fund aus „speichern-exportieren"-QA).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Feld-Node ⇄
XML), unabhängig von der UI-Abhängigkeit aus Abschnitt 0.1. Dies ist der einzige
Testbereich, der laut Anforderung §6 Punkt 6 bereits **vollständig ohne**
Kopf-/Fußzeilen-UI grün werden kann und muss. Determinismus ist hier unkritisch
(kein Browser, keine asynchrone Selektion); die Determinismus-Regeln aus 3.0 gelten
nur für Teil B.

### 2.1 Neu: `src/formats/docx/__tests__/page-number-field.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| DU1 | `w:fldChar`-Quadruple (mit `\* MERGEFORMAT`) → interner Node | Synthetisches `<w:p>` mit `begin`/`instrText " PAGE   \* MERGEFORMAT "`/`separate`/`<w:t>2</w:t>`/`end` als Roh-XML → `readDocx` | Genau ein `page_number_field`-Node mit `cachedValue: '2'`; **kein** zusätzlicher `text`-Knoten mit Inhalt „2" (expliziter Regressionsbeweis gegen die in Anforderung §0.4 verifizierte Degradierung / Fix F3); Schaltertext `\* MERGEFORMAT` erscheint **nicht** als sichtbarer Text | Anforderung §3.6, §6.1, Grenzfall 8 | **ROT** (Feature nicht implementiert) |
| DU2 | `w:fldSimple` → interner Node, ohne Degradierung zu Text | Synthetisches `<w:p><w:t>Page </w:t><w:fldSimple w:instr=" PAGE "><w:r><w:t>2</w:t></w:r></w:fldSimple></w:p>` (Muster wie `FancyFoot.docx`) → `readDocx` | Absatz enthält Text „Page " gefolgt von genau einem `page_number_field`-Node; die „2" ist **nicht** mehr eigenständiger, statischer `text`-Knoten (Fix F2). **Kein** Datenverlust der umgebenden „Page " | Anforderung §3.6, Grenzfall 9 | **ROT** |
| DU3 | `w:fldChar`-Quadruple **ohne** `separate`/Cache-Wert | Synthetisches `begin`/`instrText PAGE`/`end` ohne `separate`/`<w:t>` dazwischen → `readDocx` | Feld wird trotzdem erkannt, `cachedValue` fällt auf `'1'` zurück (nie leerer String), kein Absturz | Code-Plan 6.1.3 | **ROT** |
| DU4 | `NUMPAGES`-Feld darf **nicht** als Seitenzahl gelesen werden | `w:fldChar`-Quadruple mit `instrText NUMPAGES` → `readDocx` | **Kein** `page_number_field`; Cache-Wert bleibt (wie heute, unverändertes Verhalten) statischer `text`-Knoten. **Achtung:** ein naiver `instr.includes('PAGE')`-Test schlägt hier fälschlich an, da „NUMPAGES" die Zeichenfolge „PAGE" enthält — dieser Test erzwingt **Tokenvergleich statt Substring** (`isPageFieldInstr`, Code-Plan 4.6) | Anforderung §3.6/§8, Grenzfall 11, Code-Plan 6.1.4 | Erwartet **GRÜN, sobald F3 mit korrektem Tokenvergleich implementiert** |
| DU5 | Reihenfolge-unabhängige Header-/Footer-Auflösung (F4) | Synthetisches `sectPr` mit `<w:footerReference w:type="even".../>` **vor** `<w:footerReference w:type="default".../>` (Reihenfolge wie real in `bug57031.docx`) → `readDocx` | Reader liest den `default`-Footer, nicht den strukturell ersten (`even`). Muss **vor** dem F4-Fix rot sein | Code-Plan 6.1.7, Fix F4 | **ROT** |
| DU6 | Schreiben eines Felds mit `strong`+`textColor`-Marks | `page_number_field`-Node mit Marks → `writeDocx` | Erzeugtes XML enthält das `w:fldChar`-Quadruple, **jeder** der fünf `<w:r>` trägt dieselbe `<w:rPr>` (`<w:b/>`, `<w:color .../>`) — per **unabhängigem** XML-Parsing geprüft (`DOMParser` mit Namespace, nicht String-`toContain`) | Anforderung §3.5/§3.10, Grenzfall 14 | **ROT** |
| DU7 | Vollständige Rundreise (write→read) für DU6 | Kombination aus DU6 + erneutem `readDocx` | Marks bleiben erhalten, Feld bleibt `page_number_field`, kein Abrutschen zu Text | Grenzfall 14 | **ROT** |
| DU8 | **Kopf-/Fußzeilen-spezifischer Datenebenen-Test (schließt Lücke aus 0.1)** | `page_number_field`-Node direkt in `WordDocumentContent.footer` (nicht `body`) platziert → `writeDocx` → `readDocx` | Feld bleibt in `footer` als `page_number_field` erhalten — **unabhängig** vom fehlenden UI-Einstiegspunkt, weil `header`/`footer` bereits beschreibbare Datenfelder sind und über einen **eigenen** Reader-/Writer-Pfad laufen | Anforderung §5.1/§5.2 (Kopf-/Fußzeilen-Rundreise auf Datenebene), 0.1 | **ROT**; **muss existieren, bevor „Body-only genügt" behauptet wird** |

**Reale Fixtures (Pflicht laut Anforderung §6 Punkt 8, ergänzend zu synthetischem XML):**

| Fixture | Deckt ab | Erwarteter Status |
|---|---|---|
| `docx/FancyFoot.docx` | `w:fldSimple`, PAGE, sauberer Einzel-`default`-Footer → primärer Regressionsbeweis Fix F2 (frei von F4-Interferenz) | **ROT** — aktueller Import **degradiert** das Feld zu statischem Text „1" im `footer`-Datenmodell (nicht Totalverlust; Anforderung §0.4). Nach Fix: `footer` enthält ein `page_number_field` |
| `docx/60316.docx` | sauberes `w:fldChar`-Quadruple **ohne** Schalter → Beweis Fix F3 unabhängig von Schaltern | **ROT** |
| `docx/bug57031.docx` | `w:fldChar`-Quadruple mit `\* MERGEFORMAT` **und** even-vor-default-Mehrfachreferenz → gemeinsamer Beweis Fix F3 **und** F4 (das real sichtbare „Page … of 14" liegt im `default`-Footer, nicht im ersten `even`-Footer) | **ROT** |
| `docx/Bug54771a.docx` | zweiter `w:fldChar`-mit-Schalter-Beleg | **ROT** |
| `docx/60329.docx` | PAGE **und** NUMPAGES in einer Fußzeile → Grenzfall 11 (Abgrenzung), **nicht** als reiner F3-Positivbeweis | **ROT** für den PAGE-Anteil (wird Feld); NUMPAGES bleibt Text |
| `docx/PageSpecificHeadFoot.docx` | zusätzlicher `w:fldSimple`-Fall in Fußzeile | **ROT** |
| `docx/WordWithAttachments.docx` | PAGE-Feld in der **Kopfzeile** (nicht Fußzeile) | **ROT** |
| `docx/FldSimple.docx` (falls vorhanden) bzw. ein FILENAME-Feld | Abgrenzungstest: Nicht-PAGE-`w:fldSimple` — Cache-Text bleibt erhalten, aber **kein** `page_number_field` (keine Regression des bestehenden Wrapper-Descent) | Erwartet **GRÜN, sobald F2 implementiert** |
| `docx/Bug60341.docx` | **Bewusst NICHT** als PAGE-Positiv-Fixture (enthält zusätzlich den Block-`w:sdt`-Bug F11, out-of-scope) — falls dennoch verwendet, muss der Test explizit „bekannt eingeschränkt wegen F11, nicht wegen Seitenzahl-Feld" kommentiert sein | Dokumentationspflichtig, kein Blocker |

### 2.2 Neu: `src/formats/odt/__tests__/page-number-field.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| OU1 | `<text:page-number>1</text:page-number>` → interner Node | Synthetisches ODT-XML mit Cache-Text → `readOdt` | Genau ein `page_number_field`-Node mit `cachedValue: '1'` | Anforderung §3.8, Grenzfall 10 | **ROT** |
| OU2 | Selbstschließendes `<text:page-number .../>` (Muster `fields.odt`) | Synthetisches ODT-XML ohne Cache-Text → `readOdt` | Feld erkannt, `cachedValue` fällt auf `'1'` zurück | Code-Plan 6.2.2 | **ROT** |
| OU3 | `<text:page-count>1</text:page-count>` darf **nicht** als Seitenzahl gelesen werden | Synthetisches ODT-XML → `readOdt` | **Kein** `page_number_field`; Cache-Text „1" bleibt normaler `text`-Knoten (Regressionstest Grenzfall 11 / Fix F6) | Anforderung §3.8/§8, Grenzfall 11 | **ROT** |
| OU4 | `<text:page-number>` **und** `<text:page-count>` im selben Absatz nebeneinander (exaktes Muster `odf-fields.odt`) | Synthetisches ODT-XML mit beiden Elementen direkt hintereinander → `readOdt` | Beide korrekt und **unterschiedlich** behandelt — page-number wird Feld, page-count bleibt Text; keine Verwechslung, kein gemeinsamer Node | Grenzfall 11 | **ROT** |
| OU5 | Schreiben/Rundreise mit `textColor`+`underline`-Marks | `page_number_field`-Node mit Marks → `writeOdt` → `readOdt` | `<text:span text:style-name="…">`-Wrapping bleibt erhalten, Feld bleibt Feld | Anforderung §3.10, Grenzfall 14 | **ROT** |
| OU6 | Kopf-/Fußzeilen-spezifischer Datenebenen-Test (analog DU8) | `page_number_field`-Node direkt in `WordDocumentContent.header` platziert → `writeOdt` → `readOdt` | Feld bleibt in `header` erhalten, unabhängig vom UI-Einstiegspunkt; deckt gezielt den ODT-Kopf-/Fußzeilenpfad (`styles.xml`, siehe Anmerkung 2.2.1) | 0.1 | **ROT** |

**Reale Fixtures:**

| Fixture | Deckt ab | Erwarteter Status |
|---|---|---|
| `odt/odf-fields.odt` | `<text:page-number>` **und** `<text:page-count>` im Dokumentkörper (`content.xml`) nebeneinander — primärer Regressionsbeweis F5/F6, **heute bereits ohne Kopf-/Fußzeilen-UI** vollständig test- und vorführbar | **ROT** — aktueller Import **degradiert** das `<text:page-number>` zu statischem Text „1" (die Ziffer bleibt sichtbar, aber ohne Feldsemantik; Anforderung §0.5 — **nicht** Totalverlust) |
| `odt/fields.odt` | Kopfzeile mit selbstschließendem `<text:page-number>` + `<text:page-count>`, in `<text:span>` gewrappt — Cache-loser Fall **und** Marks-Erhalt, aber **in `styles.xml`/`style:header`, nicht `content.xml`** (siehe Anmerkung 2.2.1) | **ROT** |
| `odt/sample.odt`, `odt/sample_numbering_DOC_LO41.odt` | weitere reale `text:page-number`(+`page-count`)-Belege in der Master-Page (Robustheit/Abgrenzung) | **ROT** für page-number; page-count bleibt Text |

**Anmerkung 2.2.1 (durch diese QA-Prüfung präzisiert):** `fields.odt` legt die
Kopfzeile in `styles.xml` (`style:master-page` → `style:header`) ab, nicht in
`content.xml`. Der Code-Plan behandelt in 4.9 nur `walk()` generisch. `walk()` wird
zwar von **beiden** Parse-Pfaden (Body aus `content.xml`, Kopf-/Fußzeile aus
`styles.xml`) aufgerufen, sodass die Erkennung strukturell an einer Stelle sitzt —
aber genau deshalb muss mindestens **ein** Test (OU6 / die `fields.odt`-Fixture)
ausdrücklich auf dem **`styles.xml`-Pfad** laufen, um zu beweisen, dass der
Kopf-/Fußzeilen-Reader `walk()` tatsächlich mit demselben Ergebnis nutzt und kein
zweiter, separater Parse-Zweig das Feld verschluckt.

### 2.3 Neu: `src/formats/shared/editor/__tests__/page-number-field.test.ts`

Schema-/Command-Ebene, formatunabhängig, schnellster Nachweis für F1/F8/F9
(`EditorState.create` + direkter Command-Aufruf, Muster wie
`editor/__tests__/commands.test.ts`):

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| CU1 | `insertPageNumberField()` an leerer Cursor-Position | Dokument enthält genau einen `page_number_field`-Node, Cursor direkt danach (§3.2) | **ROT** (Command existiert noch nicht) |
| CU2 | `insertPageNumberField()` über bestehende Textselektion | Selektion wird **ersetzt**, nicht ergänzt (§3.3) | **ROT** |
| CU3 | Einfügen mit aktiven `storedMarks` an der Cursor-Position | Eingefügter Node trägt dieselben Marks (§3.10) | **ROT** |
| CU4 | `wordSchema.nodeFromJSON` mit einem `page_number_field`, der (illegal) `content` trägt → `.check()` | Muss Schema-Validierungsfehler werfen (bestätigt echte `atom`-/content-lose Struktur, nicht nur Konvention) | **ROT** (Node existiert noch nicht) |
| CU5 | Klartext-Extraktion (`leafText`): Slice „A" + Feld + „B" durch `clipboardTextSerializer`/`nodeToPlainText` | Ergibt „A1B" (nicht „AB") — beweist, dass `leafText` greift und benachbarte Wörter im Klartext-Clipboard **nicht** verschmelzen (§0.1/§3.12) | **ROT** |
| CU6 | Undo/Redo (Grenzfall 13): einfügen → `undo` → Dokument identisch zum Ausgangszustand → `redo` → Feld wieder da | Exakte Wiederherstellung in beide Richtungen, ein einziger Undo-Schritt | **ROT** |
| CU7 | Enter direkt vor/nach dem Feld (Grenzfall 15) | Feld bleibt vollständig im ursprünglichen Absatz, kein Duplikat, kein Verschwinden | **ROT** |
| CU8 | Feld unmittelbar neben Text ohne Leerzeichen, z. B. „Seite" + Feld + „." (Grenzfall 4) | Bleiben getrennte Einheiten, kein Verschmelzen zu einem Textlauf | **ROT** |

### 2.4 Ergänzung bestehender Baseline-Regressionstests

| Datei | Neuer/geänderter Test | Zweck | Erwarteter Status |
|---|---|---|---|
| `docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts` | je: „Datei ohne jedes Seitenzahl-Feld bleibt nach Rundreise **ohne** `page_number_field`-Node" | Anforderung §5.1 Punkt 1/4 (kein Feld darf neu erfunden werden) | **GRÜN** heute (kein Node existiert) — **nach** Implementierung erneut ausführen, dann besteht erst das echte Regressionsrisiko |
| **Anpassung** `docx/__tests__/reader.test.ts` (der bestehende `<w:fldSimple w:instr=" PAGE ">`-Test) | Assertion „Text enthält 1" **ersetzen** durch „genau ein `page_number_field` mit `cachedValue === '1'`, **kein** eigenständiger Text-Node „1"" (direkt auf `doc.body.content` prüfen, nicht über den `allText`-Helper — der sammelt nur `text`-Schlüssel und liefert nach dem Fix `''` → alte Assertion würde **rot**) | Anforderung §0.7/§6 Punkt 4, Fix F10 | vorher grün, **nach naivem Fix rot**, nach korrekter Anpassung grün |
| **Anpassung** `odt/__tests__/reader.test.ts` (die beiden `<text:page-number>`-Tests) | erweitern auf „ein `page_number_field` (`cachedValue` „1" bzw. „3"); umgebender Text/„5" bleibt Text; die Ziffer ist **nicht** eigenständiger Text-Node" | Anforderung §0.7/§6 Punkt 4, Fix F10 | analog |
| `docx/__tests__/external-fixtures.test.ts`, `odt/__tests__/external-fixtures.test.ts` | **unverändert** (generische „importiert ohne Absturz"-Suite) | bewusste Trennung von den formatspezifischen Detailtests (2.1/2.2) | **GRÜN**, muss auch nach F1–F10 gegen alle in 2.1/2.2 genannten Fixtures ohne Absturz laufen |

### 2.5 Traceability: Anforderung §6 Punkt 1–4 (Unit-Test-Vorgaben) → Testfall hier

| §6-Vorgabe | Testfall(e) |
|---|---|
| Punkt 1 (DOCX: Writer erzeugt gewählte Form; Reader erkennt beide Formen inkl. Schalter; Regressionstest `<w:t>` zwischen `separate`/`end`) | DU1, DU2, DU3, DU6, DU7 + reale Fixtures `FancyFoot`/`60316`/`bug57031`/`Bug54771a`/`WordWithAttachments` |
| Punkt 2 (DOCX-Abgrenzung: NUMPAGES nicht als Seitenzahl) | DU4 + `60329.docx` |
| Punkt 3 (ODT: Writer erzeugt `<text:page-number>`; Reader erkennt es; `<text:page-count>` nicht verwechselt) | OU1, OU2, OU3, OU4, OU5 + `odf-fields.odt`/`fields.odt` |
| Punkt 4 (Bestandstests anpassen: Feld-Node statt „Ziffer sichtbar") | 2.4 (Anpassung `reader.test.ts` DOCX+ODT) |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wortgleich mit dem Auftrag zu diesem Plan):** Kein Testfall
in Teil B darf durch direkten Aufruf interner Funktionen
(`insertPageNumberField()`, `readDocx(...)`, `writeOdt(...)` etc.) im Node-Kontext
ersetzt werden. Jeder Testfall läuft über echte Nutzer:innen-Handlungen im Browser:
`locator.click()`, `page.keyboard.press(...)`/`.type(...)`, echter Datei-Upload
(`setInputFiles` auf den realen `<input type="file">`, siehe 1/3.12),
`page.waitForEvent('download')` + Auslesen und **strukturelles** Parsen der
heruntergeladenen Datei vom Dateisystem (nicht nur `.toContain`-String-Suche).

Alle Tests in 3.2–3.9 laufen auf **Body-Ebene** (siehe 0.1) — der heute einzig
mögliche vollständige Browser-Nachweis. Neue Datei:
`tests/e2e/page-number-field.spec.ts`, Konventionen wie
`docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`.

### 3.0 Determinismus-Regeln (bindend für ALLE Tests in Teil B)

Ursache der bekannten Flakes (belegt durch die Kommentare in
`selection-regression.spec.ts` und die Git-Historie: „Fix flaky Mobile-project …
same async-selection-sync race"): ProseMirror erfährt einen **nativen,
tastatur-/mausgetriebenen Cursor-Move** (Pfeiltasten, `Home`, `End`, oder ein
Klick zum Umsetzen der Schreibmarke) **nur** über das **asynchrone**
`selectionchange`-Event des Browsers. Eine unmittelbar danach — ohne menschliche
Reaktionszeit — abgefeuerte, selektionsabhängige Aktion (`Enter`, `type`,
`Backspace`, `Delete`, oder ein Toolbar-Button, der auf die aktuelle Selektion
wirkt) kann dieser Synchronisation **vorauslaufen** und auf der veralteten Position
arbeiten. Reproduzierbar bisher nur in den **Mobile-/Tablet**-Projekten.

Regeln (jede ist in die Schritte von 3.2–3.9 eingearbeitet):

1. **Nach jedem nativen Cursor-Move, der von einer mutierenden/selektionsabhängigen
   Aktion gefolgt wird, `await page.waitForTimeout(50)` einfügen — vor der Aktion.**
   Das ist exakt die etablierte Repo-Konvention (`selection-regression.spec.ts:34`).
   Betrifft in diesem Feature vor allem: `ArrowLeft`/`ArrowRight`, `End`, `Home` und
   `editor.click()`/Feld-Klick zum Umsetzen der Marke, jeweils **bevor** `Delete`,
   `Backspace`, `Enter`, `type()` oder ein Toolbar-Klick folgt.
2. **Nach dem Klick auf „Seitenzahl einfügen" zuerst auf das tatsächliche Erscheinen
   des Node warten, bevor die nächste Taste kommt:**
   `await expect(page.locator('.pm-field-page-number')).toBeVisible()`. Das ist eine
   web-first-Assertion (auto-retry, **kein** fester Sleep) und macht „Einfügen →
   sofort weitertippen" (P3) deterministisch, weil das Einfüge-Command eine
   Transaktion dispatcht, deren DOM-/Selektions-Sync asynchron ist.
3. **Fixe Timeouts nur an der einen dokumentierten Stelle (Regel 1).** Überall sonst
   auf **beobachtbare** Bedingungen warten: `expect(locator).toBeVisible()` /
   `toHaveCount(n)` / `toContainText(...)` / `toHaveClass(...)`. Kein
   `waitForTimeout` als „Angst-Sleep" zum Kaschieren echter Races.
4. **Kein blindes `page.keyboard.type()` für selektionsabhängige Folgesequenzen.**
   Reines Tippen in eine stabile Schreibmarke ist unkritisch (so nutzen es auch die
   Bestandstests). Sobald aber ein nativer Cursor-Move dazwischenliegt, gilt Regel 1;
   bei anhaltender Flakiness `type(text, { delay: 20 })` oder in `press`+Wait-Schritte
   zerlegen.
5. **Download-Listener immer vor dem „Exportieren"-Klick registrieren** (`const dl =
   page.waitForEvent('download')` → Klick → `await dl`) und die Datei vom
   Dateisystem lesen — nie „klicken und hoffen".
6. **Export-Fokus-Eigenheit (Regel für Tests, die nach dem Export tippen):** vor dem
   Weitertippen wieder in den Editor klicken (`await page.locator('.ProseMirror').click()`),
   siehe Abschnitt 1. Bei Cross-Format-Rundreisen (P17/P18) liegt zwischen den
   Schritten ohnehin eine Rücknavigation + Reupload, die den Fokus neu setzt.
7. **Node-Selektion des Feldes:** Ein Klick auf `.pm-field-page-number` erzeugt eine
   `NodeSelection` über das async `selectionchange`-Event. Vor einem folgenden
   `Delete`/Toolbar-Klick gilt daher **ebenfalls** Regel 1 (50 ms), bzw. besser: auf
   eine beobachtbare Folge des Selektionswechsels warten (z. B. `ProseMirror-selectednode`-Klasse
   am Feld, falls vorhanden), sonst die 50-ms-Regel.
8. **Drei-Projekt-Pflicht:** Jeder Testfall muss in Desktop **und** Mobile **und**
   Tablet stabil sein. „Grün auf Desktop, flaky auf Mobile" gilt hier ausdrücklich
   **nicht** als bestanden — genau dieses Muster war die Ursache der bereits
   behobenen Flakes. Reine Tastatur-Tests (siehe 3.11-Matrix) dürfen auf
   Mobile/Tablet dokumentiert best-effort sein, müssen aber, wenn ausgeführt,
   ebenfalls deterministisch sein.

Diese Regeln sind Abnahmekriterium: ein Testfall, der nur mit einem nicht durch
Regel 1/2 begründeten `waitForTimeout` grün wird, ist zurückzuweisen.

### 3.2 Grundfall: Einfügen an Cursor-Position (Anforderung §3.2)

| # | Test | Schritte (inkl. Determinismus-Guards) | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P1 | Feld an Cursor-Position ohne Selektion | Editor fokussieren, „Seite " tippen → Button klicken → **Regel 2: `await expect('.pm-field-page-number').toBeVisible()`** → „." tippen | Genau ein `.pm-field-page-number` unmittelbar nach „Seite "; sichtbar schattiert (`getComputedStyle` background ≠ transparent); das getippte „." landet **nach** dem Feld (Reihenfolge „Seite " · Feld · „.") | §3.2, §1 Zeile 4, Grenzfall 4 | **ROT** — Button existiert noch nicht |
| P2 | Einfügen über bestehende Selektion | „ABC" tippen, `Shift+Home` (native Selektion) → **Regel 1: `waitForTimeout(50)`** → Button klicken → Regel 2 | „ABC" verschwindet, Feld ersetzt die Selektion; genau ein `.pm-field-page-number`, kein „ABC"-Rest | §3.3 | **ROT** |

### 3.3 Selection-Sync-Regressionspflicht (Anforderung §6 Punkt 7, Grenzfall 5, `FEATURE-SPEC` §2)

| # | Test | Schritte (inkl. Determinismus-Guards) | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P3 | Feld einfügen, direkt weitertippen | Button klicken → **Regel 2 (auf Feld-Sichtbarkeit warten)** → sofort „ von 10" tippen (kein weiterer Klick) | Text erscheint korrekt direkt **nach** dem Feld; nichts vor dem Feld gelöscht/vertauscht; genau ein Feld. Muster aus `selection-regression.spec.ts`, aber mit Feld-Einfügung statt Fett-Toggle | §6.7, Grenzfall 5, `FEATURE-SPEC` §2 | **ROT** |
| P4 | Feld einfügen, Cursor per Klick umsetzen, dann formatieren | Feld einfügen → Regel 2 → an andere Textstelle klicken → **Regel 1: `waitForTimeout(50)`** → dortige Stelle selektieren (`Shift+Home`) → erneut Regel 1 → „Fett" klicken | Nur die neu selektierte Stelle wird fett; Feld unverändert; **kein** Übergreifen einer stale Selektion (der ursprüngliche Bug) | `FEATURE-SPEC` §2 | **ROT** |

### 3.4 Löschen als atomare Einheit (Anforderung §3.11, Grenzfall 6)

| # | Test | Schritte (inkl. Determinismus-Guards) | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P5 | Backspace unmittelbar nach dem Feld | Feld einfügen → Regel 2 (Cursor steht danach, keine native Bewegung nötig) → `Backspace` | Feld verschwindet vollständig; **kein** Rest-Text (kein „PAGE", keine hartkodierte Ziffer); `.pm-field-page-number` count = 0 | Grenzfall 6, §3.11 | **ROT** |
| P6 | Entf unmittelbar vor dem Feld | Feld einfügen → Regel 2 → `ArrowLeft` (nativ, davor) → **Regel 1: `waitForTimeout(50)`** → `Delete` | Feld verschwindet vollständig als Ganzes | Grenzfall 6 | **ROT** |
| P7 | Feld markieren (Klick auf das Feld) + Delete | Feld einfügen → Regel 2 → auf `.pm-field-page-number` klicken (Node-Selektion) → **Regel 7: `waitForTimeout(50)`** → `Delete` | Feld verschwindet, umgebender Text bleibt exakt erhalten | §3.11 | **ROT** |
| P8 | Backspace mit Text unmittelbar vor dem Feld | „Seite " tippen → Feld einfügen → Regel 2 → `Backspace` (Cursor direkt nach Feld) | Nur das Feld verschwindet, „Seite " bleibt **vollständig** erhalten (kein zusätzlich gelöschtes Zeichen) | §3.11 | **ROT** |

### 3.5 Formatierbarkeit (Anforderung §3.10, Grenzfall 14)

| # | Test | Schritte (inkl. Determinismus-Guards) | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P9 | Feld nachträglich markieren und fett formatieren | Feld einfügen → Regel 2 → auf Feld klicken (Node-Selektion) → **Regel 7: `waitForTimeout(50)`** → „Fett" klicken | Feld strukturell fett (z. B. `<strong>` um `span[data-field-type="page-number"]` bzw. `font-weight` am Feld) | §3.10 | **ROT** |
| P10 | Formatierung an Cursor-Position vor dem Einfügen | „Fett" aktivieren (Cursor, keine Selektion) → Feld einfügen → Regel 2 | Neu eingefügtes Feld ist bereits fett (kein zweiter Klick nötig) | §3.10 | **ROT** |

### 3.6 Kopieren/Einfügen (Anforderung §3.12, Grenzfall 7)

| # | Test | Schritte (inkl. Determinismus-Guards) | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P11 | Feld kopieren, an anderer Stelle einfügen | Feld einfügen → Regel 2 → auf Feld klicken (Node-Selektion) → **Regel 7: `waitForTimeout(50)`** → `ControlOrMeta+c` → an andere Stelle klicken → **Regel 1: `waitForTimeout(50)`** → `ControlOrMeta+v` → auf zweites Feld warten (`toHaveCount(2)`) | Zwei unabhängige, weiterhin **lebendige** Felder (`.pm-field-page-number` count = 2), kein hartkodierter Text-Schnappschuss | §3.12, Grenzfall 7 | **ROT** |

### 3.7 Rundreise über echten Upload/Export (Anforderung §5.2, §6 Punkt 5)

Jede Zeile: Zustand im Editor erzeugen → **echter** Export (Regel 5) →
heruntergeladene Datei mit **unabhängigem** Parser prüfen (`JSZip` + `DOMParser`,
**nicht** dem eigenen Reader; Muster 3.13) → **zurück zum Picker** (`getByRole('button', { name: /formate/i }).click()`)
→ Datei erneut per `setInputFiles` hochladen → Feld weiterhin vorhanden.

| # | Test | Prüfung nach Export (unabhängiger Parser) | Bezug | Erwarteter Status |
|---|---|---|---|---|
| P12 | Feld einfügen (DOCX) → Export | `word/document.xml`: ein `<w:fldChar w:fldCharType="begin"/>` **und** ein `<w:instrText>`, dessen erstes Token (Tokenvergleich, nicht Substring!) „PAGE" ist | §5.2.1, §6.3 | **ROT** |
| P13 | Reimport der P12-Datei | nach Rücknavigation + Reupload: `.pm-field-page-number` weiterhin sichtbar | §5.2.1 | **ROT** |
| P14 | Feld einfügen (ODT) → Export | `content.xml` enthält `<text:page-number` mit `text:select-page="current"` | §5.2.3, §6.3 | **ROT** |
| P15 | Reimport der P14-Datei | Feld weiterhin sichtbar | §5.2.3 | **ROT** |
| P16 | „Seite " + fett formatiertes Feld + „." → Export → Reimport, DOCX **und** ODT | Text, Formatierung **und** Feld bleiben nach Reimport erhalten (Grenzfall 14). Beim Weitertippen nach Export ggf. Regel 6 beachten | §5.2.6, Grenzfall 14 | **ROT** |
| P17 | Cross-Format: DOCX mit Feld → als ODT exportieren → über ODT-Karte reimportieren → als DOCX exportieren → über DOCX-Karte reimportieren | Feld bleibt über beide Konvertierungen ein Feld (kein Abrutschen zu Text). Jede Rücknavigation über „← Formate" | §5.2.4, Grenzfall 12 | **ROT** |
| P18 | Cross-Format umgekehrt: ODT → DOCX → ODT | spiegelbildlich zu P17 | §5.2.5, Grenzfall 12 | **ROT** |
| P19 | Undo (`ControlOrMeta+z`) direkt nach Einfügen, dann Export | Feld einfügen → Regel 2 → `ControlOrMeta+z` → auf `.pm-field-page-number` count = 0 warten → Export | Export enthält **kein** Feld (Undo hat vor dem Export vollständig zurückgesetzt) | Grenzfall 13 | **ROT** |

### 3.8 Import einer fremden, mit echtem Word/LibreOffice erzeugten Datei (Anforderung §5.2 Punkt 7/8, §6 Punkt 8)

Datei-Upload über den realen `input[type="file"]` der jeweiligen Karte (siehe 3.12).

| # | Test | Fixture | Prüfung | Erwarteter Status |
|---|---|---|---|---|
| P20 | Fremde DOCX mit `w:fldSimple`-PAGE, unverändert exportieren, reimportieren | `docx/FancyFoot.docx` | Nach erstem Import ist das Feld im Datenmodell erhalten (heute: zu statischem Text „1" degradiert; **Achtung:** liegt in der **Fußzeile**, die aktuell keine UI-Darstellung hat — die Sichtbarkeit im `.ProseMirror`-DOM ist erst nach der Kopf-/Fußzeilen-UI prüfbar, daher hier primär über den Export-Roundtrip belegen: nach Export enthält `word/footer*.xml`/`document.xml` das Feld-Markup) | **ROT** — heutiger Ist-Zustand ist Degradierung, kein aktualisierbares Feld |
| P21 | Fremde DOCX mit `w:fldChar`-Quadruple-PAGE inkl. even/default-Mehrfachreferenz | `docx/bug57031.docx` | Feld als aktualisierbares Feld erkannt (nicht als hartkodierter Text); F4 sichtbar daran, dass der `default`-Footer-Inhalt (das eigentliche „Page … of 14") gewählt wird, nicht der leere `even`-Footer | **ROT** |
| P22 | Fremde ODT mit `<text:page-number>` **im Body** | `odt/odf-fields.odt` | Feld im `.ProseMirror`-DOM sichtbar (`.pm-field-page-number`, weil im Body → heute schon darstellbar), nicht stillschweigend zu Text degradiert; Export/Reimport erhält es | **ROT** |
| P23 | Baseline: reale Datei **ohne** jedes Seitenzahl-Feld → Import → Export → Reimport | z. B. eine unauffällige Bestands-Fixture ohne PAGE-Feld | erzeugt **kein** neu erfundenes Feld (`.pm-field-page-number` count = 0 nach Reimport) | Erwartet **GRÜN** bereits heute, muss nach Implementierung im Browser erneut laufen |

### 3.9 Kompatibilität mit `pagination.ts` (Anforderung §3.14, Grenzfall 16)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P24 | Sehr langes Dokument (> 20 simulierte Seiten) mit Feld im Body | Genug Text erzeugen, um > 20 simulierte Seiten auszulösen (Muster wie `pagination.test.ts`), Feld irgendwo einfügen → Regel 2 | Kein Absturz (`page.on('pageerror')` leer), Feld bleibt an seiner Absatzposition, Paginierung weiter funktionsfähig. Die hochzählende Live-Anzeige über Seiten ist laut §3.9 ausdrücklich **offen/nicht blockierend** — hier nicht als Fehler werten | §3.14, Grenzfall 16 (Body-Teil) | **ROT bis Feature existiert**, danach **GRÜN** |

### 3.10 BLOCKIERT — Kopf-/Fußzeilen-Ebene (Anforderung §6 Punkt 3/6, §5.2 vollständig)

**Status: heute nicht schreib-/ausführbar**, weil kein fokussierbarer
Kopf-/Fußzeilenbereich existiert (Abschnitt 0). Diese Tabelle ist
**Pflichtbestandteil** dieses Plans (nicht optional) — sie muss 1:1 in
`tests/e2e/page-number-field.spec.ts` (oder eine dedizierte
`headers-page-number.spec.ts`) übernommen werden, **sobald**
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen Editierbereich liefern. Bis
dahin bleibt sie hier als vorab spezifizierte, blockierte Checkliste stehen, damit
sie beim Abschluss jener Tickets nicht neu erfunden werden muss und die Blockade
nicht stillschweigend verschwindet. **Alle Determinismus-Regeln aus 3.0 gelten
unverändert**, plus die neue Zwei-Editor-Klasse in Anmerkung 3.10.1.

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H1 | Fußzeile aktivieren, Cursor hinein, Feld einfügen | Fußzeile über die neue UI aktivieren, Cursor in den Fußzeilen-Editierbereich setzen (nativ → Regel 1), Button klicken → Regel 2 | Feld erscheint **im Fußzeilenbereich**, nicht im Haupttext | §5.2.1 |
| H2 | Dasselbe in der Kopfzeile | analog H1 | Feld im Kopfzeilenbereich | §5.2.2 |
| H3 | Button-Kontext-Gating | Cursor im Haupttext (nicht Kopf-/Fußzeile), Button-Zustand prüfen | Button sichtbar deaktiviert **oder** erklärender Tooltip — niemals ein ergebnisloser Klick (§3.15); verschärft P1, sobald Kontext existiert | §1 Zeile 1, §3.15, Grenzfall 1/2 |
| H4 | Rundreise Fußzeile, DOCX | Feld in Fußzeile → Export → `word/footer*.xml` enthält Feld-Markup → Reimport → Feld weiterhin in Fußzeile | §5.2.1 |
| H5 | Rundreise Kopf- **und** Fußzeile, ODT | analog H4 für ODT, beide Bereiche; ODT-Kopf-/Fußzeile in `styles.xml` (vgl. 2.2.1) | §5.2.3 |
| H6 | Cross-Format Kopf-/Fußzeile DOCX→ODT→DOCX / ODT→DOCX→ODT | analog P17/P18, aber im Kopf-/Fußzeilenbereich | §5.2.4/§5.2.5, Grenzfall 12 |
| H7 | Fremde Datei mit Feld **in tatsächlicher Kopf-/Fußzeile** importieren | `FancyFoot.docx`/`bug57031.docx` (Fußzeile), `WordWithAttachments.docx` (Kopfzeile), `fields.odt`/`sample.odt` (ODT-Master-Page) → im UI sichtbar im Kopf-/Fußzeilenbereich (nicht nur im Datenmodell). Hinweis: `odf-fields.odt` hat das Feld im **Body**, ist also **nicht** die richtige Fixture für die reine Kopf-/Fußzeilen-Variante | §5.1.1/§5.1.2, §5.2.7/§5.2.8 |
| H8 | Selection-Sync **innerhalb** des Kopf-/Fußzeilen-Editierbereichs | Feld in Fußzeile einfügen → Regel 2 → direkt weitertippen im selben Fußzeilen-Editierbereich | Text landet in der Fußzeile, kein Übergreifen auf den Haupttext, keine vertauschte Selektion zwischen den beiden Editierbereichen (siehe 3.10.1) | §6.7, Grenzfall 5 |
| H9 | Löschen/Backspace am Feldrand **innerhalb** Kopf-/Fußzeile | analog P5/P6/P7, im Fußzeilenbereich (Regeln 1/7) | Feld atomar gelöscht, Haupttext unberührt | Grenzfall 6 |

**Anmerkung 3.10.1 (durch diese QA-Prüfung neu identifiziert, in keinem der beiden
Vorgängerdokumente benannt):** Sobald zwei unabhängige ProseMirror-Editierbereiche
(Body und Kopf-/Fußzeile) gleichzeitig existieren, entsteht eine **neue Klasse** von
Selection-Sync-Risiko, die auf Body-Ebene strukturell gar nicht auftreten kann: ein
Cursor/eine Selektion, der/die nach einem Fokuswechsel im **falschen** Editierbereich
landet (z. B. ein Toolbar-Klick wirkt auf den zuletzt aktiven statt den gerade
fokussierten Bereich). Wegen der async `selectionchange`-Natur (3.0) ist gerade
dieser Fokuswechsel race-anfällig. H8 ist deshalb **nicht optional**, sondern der
naheliegendste neue Bug-Kandidat, sobald Kopf-/Fußzeile UI-fähig wird — und muss mit
den 3.0-Guards (insb. Regel 1 nach jedem Fokus-/Cursorwechsel zwischen den Bereichen)
geschrieben werden.

### 3.11 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (P1, P2, P5–P18, P20–P24) | Pflicht | Pflicht | Pflicht | `.click()` projektunabhängig; 3.0-Guards zwingend |
| Tastatur-lastige Tests (P3, P4, P6, P8, P19) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard` gerätunabhängig auslösbar; falls ausgeführt, **müssen** die 3.0-Guards greifen (genau hier lagen die Mobile-Flakes) |
| Kopf-/Fußzeilen-Tests (H1–H9) | Blockiert | Blockiert | Blockiert | Erst nach `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` |

### 3.12 Datei-Upload/Reimport: der reale, in diesem Repo etablierte Pfad

Für **alle** Tests in 3.7/3.8 mit Upload/Reimport (P13, P15, P17–P23) gilt der reale
Pfad aus `docx.spec.ts`/`odt.spec.ts` (**Korrektur** einer früheren Fassung dieses
Plans, die fälschlich einen `filechooser`-Button im Editor verlangte):

```ts
// Erster Upload (auf dem Picker): das versteckte, reale <input type="file"> der Karte.
await docxCard(page)
  .locator('input[type="file"]')
  .setInputFiles({
    name: 'bug57031.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })

// ... editieren, exportieren, Download-Buffer lesen ...

// Reimport NACH Export: der Datei-Input existiert nur auf dem Picker, nicht im Editor —
// deshalb ZWINGEND zuerst zurücknavigieren, dann erneut setInputFiles.
await page.getByRole('button', { name: /formate/i }).click() // "← Formate"
await docxCard(page)
  .locator('input[type="file"]')
  .setInputFiles({ name: 'reimport.docx', mimeType: '...', buffer: exportedBuffer })
```

`setInputFiles` ist ein **echter** Upload (löst den realen `onChange`/Import aus) —
kein Umgehen der UI. Gleichwertig, aber nicht die Repo-Konvention, wäre ein
`page.waitForEvent('filechooser')` in Kombination mit einem Klick auf den
`Datei hochladen`-Button **auf dem Picker-Bildschirm** (der Button triggert dort
`fileInput.click()`); die Bestandssuite nutzt durchgängig `setInputFiles`, daher
folgt dieser Plan dem.

### 3.13 Unabhängige, strukturelle Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für P12/P14/P16/P20–P22 wird strukturelles XML-Parsen verlangt (Muster wie
`docx.spec.ts:85-91`, aber mit Namespace-korrektem `DOMParser` statt roher
String-Suche):

```ts
import JSZip from 'jszip'

const download = await downloadPromise
const buf = await (await import('node:fs/promises')).readFile((await download.path())!)
const zip = await JSZip.loadAsync(buf)
const xml = await zip.file('word/document.xml')!.async('text')

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const doc = new DOMParser().parseFromString(xml, 'application/xml') // in Node: linkedom/jsdom
const fldChars = [...doc.getElementsByTagNameNS(W, 'fldChar')]
expect(fldChars.some((el) => el.getAttributeNS(W, 'fldCharType') === 'begin')).toBe(true)
const instr = [...doc.getElementsByTagNameNS(W, 'instrText')].map((el) => el.textContent?.trim())
// Tokenvergleich, NICHT Substring — sonst würde "NUMPAGES" fälschlich matchen:
expect(instr.some((t) => t?.split(/\s+/)[0]?.toUpperCase() === 'PAGE')).toBe(true)
```

Damit ist die Prüfung **strukturell** (richtiges Element mit richtigem Tokenwert),
nicht nur „die Zeichenkette PAGE kommt irgendwo vor" — relevant, weil sonst
„NUMPAGES" fälschlich als Treffer durchginge (dieselbe Falle wie DU4).

### 3.14 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` — **Pflichtbestandteil**, nach der
  Toolbar-Änderung (neuer Button in `Toolbar.tsx`, Code-Plan 4.4) erneut ausführen;
  der neue Button darf die dort abgesicherten Selektionssequenzen nicht stören.
- `tests/e2e/cut.spec.ts` — ebenfalls selektionssensibel (gleiche Flake-Klasse);
  nach Toolbar-Änderung erneut ausführen.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/lifecycle.spec.ts`
  — bleiben bestehen, keine inhaltliche Berührung erwartet, Teil der Dauer-Suite.

---

## 4. Zusätzliche, durch diese QA-Prüfung gefundene Punkte (in den Vorgängerdokumenten so nicht benannt)

1. **Determinismus/Flakiness ist das größte E2E-Risiko dieses Features und war in
   beiden Vorgängerdokumenten nur allgemein (als „Selection-Sync-Bug") erwähnt.**
   Dieser Plan macht daraus in 3.0 **konkrete, bindende Regeln** mit der real im
   Repo verwendeten Technik (`waitForTimeout(50)` nach nativem Cursor-Move;
   web-first-`toBeVisible()` statt Sleep nach dem Einfüge-Klick) und arbeitet sie in
   jeden betroffenen Testschritt ein. Grund: die Git-Historie belegt mehrere bereits
   behobene Mobile-/Tablet-Flakes exakt dieser Klasse.
2. **Der reale Upload-/Reimport-Pfad wurde korrigiert.** Eine frühere Fassung dieses
   Plans verlangte einen `filechooser`-Event über einen `Datei hochladen`-Button
   „auf der Karte" und untersagte `setInputFiles`. Tatsächlich ist `setInputFiles`
   auf den versteckten `input[type="file"]` die etablierte, **reale** Repo-Konvention,
   der `Datei hochladen`-Button existiert nur auf dem **Picker** (nicht im Editor),
   und ein Reimport erfordert zwingend die Rücknavigation über „← Formate". Ohne
   diese Korrektur wären P13/P15/P17/P18/P20–P23 nicht lauffähig gewesen (Abschnitt
   1/3.12).
3. **Der Reader-Befund ist „Degradierung zu statischem Text", nicht „Totalverlust".**
   Eine frühere Fassung beschrieb den Import von `FancyFoot.docx`/`odf-fields.odt` als
   „das Feld verschwindet komplett" bzw. „ohne jeden Hinweis auf die 1". Das
   widerspricht der **korrigierten** Anforderung §0.4/§0.5: die Cache-Ziffer bleibt
   sichtbar, verloren geht nur die **Feldsemantik**. Die Fixture-Erwartungen in
   2.1/2.2 sind entsprechend richtiggestellt (sonst prüfen die Tests auf einen
   Ist-Zustand, der gar nicht eintritt, und wären fälschlich „grün", weil die Ziffer
   ja doch da ist).
4. **Kopf-/Fußzeile läuft über einen anderen Reader-/Writer-Pfad als der Body** (0.1):
   DOCX über einen eigenen `readBodyChildren`-Aufruf pro Part mit eigener
   Relationship-Tabelle, ODT über `styles.xml` statt `content.xml`. Body-Grün beweist
   deshalb nicht Kopf-/Fußzeilen-Grün. DU8/OU6 schließen diese Lücke **heute schon**
   auf Datenebene und sind als **zusätzliche** Pflichttests zum Code-Plan zu
   ergänzen (im Code-Plan selbst nicht als eigener Testfall geführt).
5. **`Bug60341.docx` (F11, Block-`w:sdt`-Bug) darf nicht versehentlich als
   PAGE-Positiv-Fixture verwendet werden** — der Code-Plan schließt sie selbst aus;
   bei Testerstellung aktiv gegenprüfen, dass niemand sie „als noch eine PAGE-Fixture"
   ohne F11-Kommentar hinzufügt (2.1, letzte Fixture-Zeile).
6. **`isPageFieldInstr`/Token- statt Substring-Vergleich gegen `NUMPAGES`** ist als
   **eigenständiger** Testfall (DU4) und als **strukturelle** Export-Prüfung (3.13)
   verankert, statt implizit unter „Rundreise" subsumiert — genau der Fehlmodus
   („NUMPAGES" enthält „PAGE"), den ein naiver `includes('PAGE')`-Test durchließe.
7. **Die neue Zwei-Editor-Selection-Sync-Klasse (H8/3.10.1)** ist als nicht-optionaler
   Testfall festgehalten, sobald die Kopf-/Fußzeilen-UI existiert.
8. **Export-Fokus-Eigenheit** (Abschnitt 1, Regel 6): Tests, die nach dem Export
   tippen, müssen zuerst zurück in den Editor klicken — sonst still verpuffende
   Eingaben (bekannter „speichern-exportieren"-Fund).

---

## 5. Freigabekriterium für diesen Testplan

Dieser Testplan gilt als **vollständig abgearbeitet**, wenn:

- Teil A (Abschnitt 2, inkl. DU8/OU6 und der realen Fixtures) vollständig grün ist —
  unabhängig von der Kopf-/Fußzeilen-Abhängigkeit erreichbar und laut Anforderung §7
  ein Pflichtkriterium.
- Teil B, Abschnitt 3.2–3.9 (Body-Ebene) vollständig **und stabil in allen drei
  Playwright-Projekten** grün ist (Determinismus-Regeln 3.0 eingehalten), inklusive
  aller realen Fixture-Importe (3.8) und der unabhängigen strukturellen XML-Prüfung
  (3.13). Ein Testfall, der nur mit einem nicht durch Regel 1/2 begründeten
  `waitForTimeout` grün wird, gilt **nicht** als bestanden.
- Abschnitt 3.10 (Kopf-/Fußzeilen-Ebene) entweder vollständig grün ist (falls
  `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` inzwischen umgesetzt) — **oder** im
  Freigabebericht explizit als „blockiert durch externe Abhängigkeit, siehe
  Anforderung §3.1/§7" ausgewiesen ist. Ein stillschweigendes Weglassen dieses
  Abschnitts (weil „auf Body-Ebene ja schon alles grün ist") ist **kein** zulässiges
  Abnahmeergebnis für den Gesamtstatus „vorhanden" — nur für den Zwischenstatus
  „teilweise", exakt wie in Anforderung §7 vorgesehen.
- `selection-regression.spec.ts` **und** `cut.spec.ts` nach der Toolbar-Änderung in
  allen drei Projekten weiterhin stabil grün sind (kein durch den neuen Button
  eingeschleppter Selektions-Regress).

Nach heutigem Stand (Abschnitt 0) ist der Backlog-Status von
`seitenzahl-einfuegen` unverändert **„fehlt"** (nicht einmal „teilweise" — dafür
müsste mindestens Teil A umgesetzt und grün sein). Dieser Testplan wird erst nach
Umsetzung von `seitenzahl-einfuegen-code.md` Phasen A–D ausführbar; bis dahin
dokumentiert er das **Soll** in unmittelbar umsetzbaren, konkreten Testfällen samt
erwartetem (rotem) Ist-Status.
