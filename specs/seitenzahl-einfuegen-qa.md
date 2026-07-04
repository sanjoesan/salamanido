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
liefert dafür den nach `seitenzahl-einfuegen-code.md` Kernentscheidung 3.5
tatsächlich heute schon möglichen Ersatznachweis auf Body-Ebene.

Stil/Gliederung orientiert an `aufzaehlungsliste-qa.md`/`fett-qa.md`.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `seitenzahl-einfuegen-code.md`)

Vor Aufstellung des Plans wurden die zentralen Tatsachenbehauptungen aus
`seitenzahl-einfuegen-code.md` direkt im aktuellen Code nachvollzogen:

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Kein Treffer für `page_number_field`/`insertPageNumber`/`fldSimple`/`fldChar`/`page-count` im gesamten `src/`-Baum | `grep -rniE "page_number_field\|page-number\|insertPageNumber\|fldSimple\|fldChar\|page-count" src/` ausgeführt | **Bestätigt.** Einzige Treffer (3 Dateien: `WordEditor.tsx`, `pagination.ts`, `pageLayout.ts`) sind zufällige Substring-Treffer des Wortes „page" in anderem Kontext (Paginierung/Seitenlayout), **kein** Bezug zu einem Seitenzahl-Feld. Das Feature ist zum Zeitpunkt dieses Testplans **zu 0 % implementiert**, `seitenzahl-einfuegen-code.md` ist tatsächlich nur ein Plan. |
| `decodeParagraphRuns` (`docx/reader.ts:124`) iteriert nur `<w:r>`, keine Feld-Erkennung | Datei gelesen, Zeile 124 exakt geprüft | **Bestätigt**, wortgleich mit Anforderung §0.4/Code-Plan Abschnitt 1. |
| `headerRef`/`footerRef` nutzen `firstChildNS` ohne `w:type`-Filter (`docx/reader.ts:352-353`) | Zeilen 352-353 exakt geprüft | **Bestätigt**, wortgleich — F4 aus dem Code-Plan ist ebenfalls noch nicht behoben. |
| `walk()` (`odt/reader.ts:96`) kennt nur `text:span`/`text:line-break`/`text:s`/`text:tab`, kein Fallback | Datei gelesen | **Bestätigt.** |
| Kein Toolbar-Eintrag „Seitenzahl" | `grep -n "getByTitle\|title=" src/formats/shared/editor/Toolbar.tsx` ausgeführt | **Bestätigt**, kein Treffer für „Seitenzahl"/„Kopfzeile"/„Fußzeile". |
| Kein Kopf-/Fußzeilen-Editierbereich in der UI (Abhängigkeit aus Anforderung §3.1) | `grep -rniE "header\|footer" src/app/` (0 Treffer) und `grep -in "header\|footer" src/formats/shared/editor/WordEditor.tsx` (0 Treffer) ausgeführt | **Bestätigt.** Die harte Abhängigkeit ist zum Zeitpunkt dieses Testplans ebenfalls unerfüllt — `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` haben zwar bereits eigene `-req.md`/`-code.md`-Dateien in `specs/`, aber keine sichtbare Umsetzung im Code. |
| Reale Fixture-Dateien aus dem Code-Plan existieren tatsächlich im Repo | `ls tests/fixtures/external/docx` / `tests/fixtures/external/odt` gegen die im Code-Plan genannten Namen abgeglichen | **Bestätigt**, alle genannten Dateien vorhanden: `FancyFoot.docx`, `bug57031.docx`, `60329.docx`, `Bug54771a.docx`, `PageSpecificHeadFoot.docx`, `FldSimple.docx`, `Bug60341.docx`, `Bug51170.docx`, `odf-fields.odt`, `fields.odt`. |
| Bestehende Testdateien/-muster (`roundtrip.test.ts`, `external-fixtures.test.ts`, `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`) existieren wie im Code-Plan referenziert | `ls src/formats/{docx,odt}/__tests__`, `ls tests/e2e` ausgeführt | **Bestätigt**, exakt die vier vorhandenen E2E-Dateien (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`), kein `page-number-field.spec.ts`/`headers.spec.ts`. |

### 0.1 Konsequenz für diesen Testplan

Weil sowohl das Feature selbst **als auch** seine harte Abhängigkeit
(Kopf-/Fußzeilen-UI) zu 0 % umgesetzt sind, gliedert dieser Plan die
E2E-Anforderung aus Anforderung Abschnitt 6, Punkt 3/6/7 in **zwei Ebenen**, exakt
wie es der Code-Plan selbst in seiner Kernentscheidung 3.5 vorschlägt, hier aber
als verbindliche QA-Prüfmatrix statt als bloße Absichtserklärung:

- **Ebene „Body" (heute umsetzbar und Pflicht-Abnahmekriterium für diesen Plan):**
  Seitenzahl-Feld irgendwo im Hauptdokument einfügen, formatieren, löschen,
  exportieren, reimportieren — alles über echte Playwright-Bedienung. Das prüft
  Schema/Command/Toolbar/Reader/Writer vollständig, weil `page_number_field` ein
  gewöhnlicher Inline-Node ist, der überall im `inline*`-Content erlaubt ist, wo
  auch `text` erlaubt ist (siehe Code-Plan 4.1) — der Editor unterscheidet beim
  aktuellen Stand (keine zweite Editor-Instanz) ohnehin nicht zwischen „Body" und
  „Kopf-/Fußzeile".
- **Ebene „Kopf-/Fußzeile" (blockiert, kein Abnahmekriterium *dieses* Plans, aber
  zwingend nachzuholen):** identische Testfälle, sobald
  `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen fokussierbaren Editierbereich
  liefern. Diese Tests werden unten **bereits vollständig spezifiziert** (Abschnitt
  3.9), aber als **„BLOCKIERT"** markiert und dürfen nicht durch die Body-Ebene
  ersetzt/vorgetäuscht werden — das Freigabekriterium aus Anforderung §7 verlangt
  ausdrücklich den Kopf-/Fußzeilen-Nachweis, nicht nur den Body-Nachweis.

**Wichtige Einschränkung, die dieser Plan gegenüber dem Code-Plan zusätzlich
festhält:** Ein auf Body-Ebene grüner Test ist **kein** Ersatzbeweis für die in
Anforderung §5.1/§5.2 verlangte Kopf-/Fußzeilen-Rundreise — Reader/Writer könnten
sich für `header`/`footer` (eigene Objektstruktur in `documentModel.ts`, getrennt
vom `body`) prinzipiell anders verhalten, auch wenn Code-Plan Abschnitt 4.2 „keine
Änderung nötig" behauptet. Dieser Plan verlangt deshalb in 2.5 einen **zusätzlichen,
gezielten** Unit-Test, der `page_number_field` direkt in `header`/`footer` (nicht
nur `body`) durch Reader/Writer schickt — das ist bereits **heute**, ganz ohne
UI-Abhängigkeit, ausführbar (`WordDocumentContent.header`/`.footer` sind bereits
beschreibbares `ProseMirrorJSON | null`, siehe Code-Plan 4.2) und schließt die vom
Code-Plan selbst offen gelassene Lücke zwischen „Body-E2E-Test grün" und
„Kopf-/Fußzeile funktioniert wirklich".

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern er
    nicht explizit auf reine Tastaturbedienung angewiesen ist.
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`
    (Kartentitel: „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)").
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Seitenzahl-Button (**neu**, gemäß Code-Plan 4.4): `page.getByTitle('Seitenzahl einfügen')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Upload, **echter Klickpfad** (nicht `setInputFiles` auf den versteckten Input,
    siehe Abschnitt 3.11 unten): `page.waitForEvent('filechooser')` +
    `docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click()` +
    `fileChooser.setFiles(...)`.
  - Feld-Locator im DOM: `page.locator('.pm-field-page-number')` (gemäß Code-Plan
    4.1/4.5 — `span[data-field-type="page-number"]` mit Klasse `pm-field
    pm-field-page-number`).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Feld-Node ⇄
XML), unabhängig von der UI-Abhängigkeit aus Abschnitt 0.1. Dies ist der einzige
Testbereich, der laut Anforderung §6 Punkt 6 bereits **vollständig ohne**
Kopf-/Fußzeilen-UI grün werden kann und muss.

### 2.1 Neu: `src/formats/docx/__tests__/page-number-field.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| DU1 | `w:fldChar`-Quadruple (mit `\* MERGEFORMAT`) → interner Node | Synthetisches `<w:p>` mit `begin`/`instrText " PAGE   \* MERGEFORMAT "`/`separate`/`<w:t>2</w:t>`/`end` als Roh-XML → `readDocx` | Genau ein `page_number_field`-Node mit `cachedValue: '2'`; **kein** zusätzlicher `text`-Knoten mit Inhalt „2" (expliziter Regressionsbeweis gegen Anforderung §0 Punkt 4/Fix F3) | Anforderung §3.6, §6.1, Grenzfall 8 | **ROT** (Feature nicht implementiert) |
| DU2 | `w:fldSimple` → interner Node, kein Totalverlust | Synthetisches `<w:p><w:t>Page </w:t><w:fldSimple w:instr=" PAGE ">...<w:t>2</w:t>...</w:fldSimple></w:p>` (Muster wie `FancyFoot.docx`) → `readDocx` | Absatz enthält Text „Page " gefolgt von genau einem `page_number_field`-Node, kein Datenverlust (Fix F2) | Anforderung §3.6, Grenzfall 9 | **ROT** |
| DU3 | `w:fldChar`-Quadruple **ohne** `separate`/Cache-Wert (Muster `Bug51170.docx` `footer1.xml`) | Synthetisches `begin`/`instrText PAGE`/`end` ohne `separate`/`<w:t>` dazwischen → `readDocx` | Feld wird trotzdem erkannt, `cachedValue` fällt auf `'1'` zurück, kein Absturz | Code-Plan 6.1.3 | **ROT** |
| DU4 | `NUMPAGES`-Feld darf **nicht** als Seitenzahl gelesen werden | `w:fldChar`-Quadruple mit `instrText NUMPAGES` → `readDocx` | **Kein** `page_number_field`; Cache-Wert bleibt (wie heute bereits, unverändertes Verhalten) eingefrorener `text`-Knoten | Anforderung §8 (Non-Goal-Abgrenzung), Code-Plan 6.1.4 | Erwartet **GRÜN sobald F3 implementiert ist** (Abgrenzungslogik `isPageFieldInstr` muss Substring-Fehlmatches wie `NUMPAGES` explizit ausschließen — **Achtung:** ein naiver `instr.includes('PAGE')`-Test würde hier fälschlich anschlagen, da „NUMPAGES" die Zeichenfolge „PAGE" enthält; dieser Test deckt genau dieses Risiko ab und muss auf Tokenvergleich statt Substring bestehen) |
| DU5 | Reihenfolge-unabhängige Header-/Footer-Auflösung (F4) | Synthetisches `sectPr` mit `<w:headerReference w:type="even".../>` **vor** `<w:headerReference w:type="default".../>` (Muster `bug57031.docx`) → `readDocx` | Reader liest den `default`-Header, nicht den strukturell ersten (`even`) | Code-Plan 6.1.9, Fix F4 | **ROT** |
| DU6 | Schreiben eines Felds mit `strong`+`textColor`-Marks | `page_number_field`-Node mit Marks → `writeDocx` | Erzeugtes XML enthält `w:fldChar`-Quadruple, **jeder** der fünf `<w:r>` trägt dieselbe `<w:rPr>` (`<w:b/>`, `<w:color .../>`) — per unabhängigem XML-Parsing geprüft (`DOMParser`, nicht String-`toContain`) | Anforderung §3.5/§3.10, Grenzfall 14 | **ROT** |
| DU7 | Vollständige Rundreise (write→read) für DU6 | Kombination aus DU6 + erneutem `readDocx` | Marks bleiben erhalten, Feld bleibt `page_number_field`, kein Abrutschen zu Text | Grenzfall 14 | **ROT** |
| DU8 | **Kopf-/Fußzeilen-spezifischer Test (schließt Lücke aus Abschnitt 0.1)** | `page_number_field`-Node direkt in `WordDocumentContent.footer` (nicht `body`) platziert → `writeDocx` → `readDocx` | Feld bleibt in `footer` als `page_number_field` erhalten — **unabhängig** vom fehlenden UI-Einstiegspunkt, weil `header`/`footer` bereits heute beschreibbare Datenfelder sind | Anforderung §5.1/§5.2 (Kopf-/Fußzeilen-Rundreise auf Datenebene), Abschnitt 0.1 dieses Plans | **ROT**, **muss vor „Body-only als ausreichend" behauptet werden geschrieben sein** |
| DU9 | Undo/Redo auf Schema-/Command-Ebene (siehe 2.3) referenziert hier nur zur Vollständigkeit — eigentliche Prüfung in 2.3 | — | — | — | siehe 2.3 |

**Reale Fixtures (Pflicht laut Anforderung §6 Punkt 5, ergänzend zu synthetischem XML):**

| Fixture | Deckt ab | Erwarteter Status |
|---|---|---|
| `tests/fixtures/external/docx/FancyFoot.docx` | `w:fldSimple`, PAGE, sauberer Einzel-`default`-Footer → primärer Regressionsbeweis Fix F2 | **ROT** — aktueller Import verliert das Feld laut Code-Plan 1a.1 komplett (verifiziert: `footer` enthält nach Import nur „Page " ohne Zahl) |
| `tests/fixtures/external/docx/bug57031.docx` | `w:fldChar`-Quadruple mit `\* MERGEFORMAT` **und** even/default-Mehrfachreferenz → gemeinsamer Beweis Fix F3 **und** F4 | **ROT** |
| `tests/fixtures/external/docx/60329.docx` bzw. `Bug54771a.docx` | `w:fldChar`-Quadruple in Fußzeilentabellenzelle, sauberer Einzel-Header/-Footer → F3 unabhängig von F4 | **ROT** |
| `tests/fixtures/external/docx/PageSpecificHeadFoot.docx` | Zusätzlicher `w:fldSimple`-Fall mit even/default-Mehrfachreferenz | **ROT** |
| `tests/fixtures/external/docx/FldSimple.docx` | FILENAME-Feld (kein PAGE) — Abgrenzungstest, Cache-Text bleibt erhalten, aber **kein** `page_number_field` | Erwartet **GRÜN sobald F2 implementiert** |
| `tests/fixtures/external/docx/Bug60341.docx` | **Bewusst NICHT** als Pflicht-Fixture verwendet (separater `w:sdt`-Bug F11, siehe Abschnitt 4 dieses Plans) — falls dennoch ein Test dafür geschrieben wird, muss er explizit als „bekannt rot wegen F11, nicht wegen Seitenzahl-Feld" kommentiert sein, sonst entsteht ein irreführendes rotes Testergebnis | Dokumentationspflichtig, kein Blocker |

### 2.2 Neu: `src/formats/odt/__tests__/page-number-field.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| OU1 | `<text:page-number>1</text:page-number>` → interner Node | Synthetisches ODT-XML mit Cache-Text → `readOdt` | Genau ein `page_number_field`-Node mit `cachedValue: '1'` | Anforderung §3.8, Grenzfall 10 | **ROT** |
| OU2 | Selbstschließendes `<text:page-number .../>` (Muster `fields.odt`) | Synthetisches ODT-XML ohne Cache-Text → `readOdt` | Feld erkannt, `cachedValue` fällt auf `'1'` zurück | Code-Plan 6.2.2 | **ROT** |
| OU3 | `<text:page-count>1</text:page-count>` darf **nicht** als Seitenzahl gelesen werden | Synthetisches ODT-XML → `readOdt` | **Kein** `page_number_field`; Cache-Text „1" bleibt als normaler `text`-Knoten erhalten (Regressionstest Grenzfall 11/Fix F6) | Anforderung §3.8, §8, Grenzfall 11 | **ROT** |
| OU4 | `<text:page-number>` **und** `<text:page-count>` im selben Absatz nebeneinander (exaktes Muster `odf-fields.odt`) | Synthetisches ODT-XML mit beiden Elementen direkt hintereinander → `readOdt` | Beide korrekt und **unterschiedlich** behandelt — keine Verwechslung, kein gemeinsamer Node | Grenzfall 11 | **ROT** |
| OU5 | Schreiben/Rundreise mit `textColor`+`underline`-Marks | `page_number_field`-Node mit Marks → `writeOdt` → `readOdt` | `<text:span text:style-name="…">`-Wrapping bleibt erhalten, Feld bleibt Feld | Anforderung §3.10, Grenzfall 14 | **ROT** |
| OU6 | Kopf-/Fußzeilen-spezifischer Test (analog DU8) | `page_number_field`-Node direkt in `WordDocumentContent.header` platziert → `writeOdt` → `readOdt` | Feld bleibt in `header` erhalten, unabhängig vom UI-Einstiegspunkt | Abschnitt 0.1 dieses Plans | **ROT** |

**Reale Fixtures:**

| Fixture | Deckt ab | Erwarteter Status |
|---|---|---|
| `tests/fixtures/external/odt/odf-fields.odt` | `<text:page-number>` **und** `<text:page-count>` im Dokumentkörper nebeneinander — primärer Regressionsbeweis F5/F6, **heute bereits ohne Kopf-/Fußzeilen-UI** vollständig test- und vorführbar | **ROT** — verifiziert: aktueller Import liefert „What pagenumber is it:" und „?" als zwei benachbarte Textknoten ohne jeden Hinweis auf die dazwischenliegende „1" (Code-Plan 1a.5, per eigener Lektüre der Anforderung §0.5 nachvollzogen) |
| `tests/fixtures/external/odt/fields.odt` | Kopfzeile mit „Seite " + selbstschließendem `<text:page-number>` + „ von " + `<text:page-count>` (mit Cache „1"), in `<text:span>` gewrappt — Cache-loser Fall **und** Marks-Erhalt, direkt auf `readOdt`-Ebene testbar (**wichtig:** liegt in `styles.xml`/`style:header`, nicht in `content.xml` — Reader muss beide Quellen abdecken, siehe Anmerkung 2.2.1) | **ROT** |

**Anmerkung 2.2.1 (zusätzlicher, durch diese QA-Prüfung präzisierter Punkt):**
`fields.odt` legt die Kopfzeile in `styles.xml` (`style:header`) ab, nicht in
`content.xml`. Der Code-Plan behandelt in 4.9 nur `walk()` generisch, ohne
gesondert zu erwähnen, dass `readOdt` für `header`/`footer` einen **separaten**
Parse-Pfad (`styles.xml` statt `content.xml`) nutzt (siehe Anforderung §0 Zeile
45: „ODT (`src/formats/odt/reader.ts` Zeilen 250–282)"). Test OU6/die
`fields.odt`-Fixture müssen deshalb ausdrücklich auf **diesem** Pfad ausgeführt
werden, nicht nur auf dem `content.xml`-Pfad — sonst bliebe ein zweiter,
unentdeckter Bug bestehen, obwohl `content.xml`-Tests grün sind.

### 2.3 Neu: `src/formats/shared/editor/__tests__/page-number-field.test.ts`

Schema-/Command-Ebene, formatunabhängig, schnellster Nachweis für F1/F8/F9:

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| CU1 | `insertPageNumberField()` an leerer Cursor-Position | Dokument enthält genau einen `page_number_field`-Node, Cursor direkt danach | **ROT** (Command existiert noch nicht) |
| CU2 | `insertPageNumberField()` über bestehende Textselektion | Selektion wird ersetzt, nicht ergänzt (Anforderung §3.3) | **ROT** |
| CU3 | Einfügen mit aktiven `storedMarks` an der Cursor-Position | Eingefügter Node trägt dieselben Marks (Anforderung §3.10) | **ROT** |
| CU4 | `wordSchema.nodes.page_number_field` mit zusätzlichem `content` instanziieren | Muss Schema-Validierungsfehler werfen (bestätigt `atom`/content-los, nicht nur Konvention) | **ROT** (Node existiert noch nicht) |
| CU5 | Undo/Redo (Grenzfall 13): `insertPageNumberField()` anwenden → `undo(state, dispatch)` → Dokument identisch zum Ausgangszustand → `redo(state, dispatch)` → Feld wieder da | Exakte Wiederherstellung in beide Richtungen, ein einziger Undo-Schritt | **ROT** |
| CU6 | Enter direkt vor/nach dem Feld (Grenzfall 15) | Feld bleibt vollständig im ursprünglichen bzw. neuen Absatz, kein Duplikat, kein Verschwinden | **ROT** |
| CU7 | Feld unmittelbar neben Text ohne Leerzeichen, z. B. „Seite" + Feld + „." (Grenzfall 4) | Bleiben als getrennte Einheiten, kein Verschmelzen zu einem Textlauf | **ROT** |

### 2.4 Ergänzung bestehender Baseline-Regressionstests

| Datei | Neuer Test | Zweck | Erwarteter Status |
|---|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | „Datei ohne jedes Seitenzahl-Feld bleibt nach Rundreise ohne `page_number_field`-Node" | Anforderung §5.1 Punkt 3 (kein Feld darf neu erfunden werden) | Erwartet **GRÜN bereits heute** (da es keinen Feld-Node gibt, kann keiner „neu erfunden" werden) — **muss aber nach Implementierung erneut ausgeführt werden**, da erst dann ein echtes Regressionsrisiko besteht |
| `src/formats/docx/__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts` | Unverändert (generische „importiert ohne Absturz"-Suite) | Bewusste Trennung von den formatspezifischen Detailtests (2.1/2.2) | **GRÜN** (unverändert), muss aber gegen alle unter 2.1/2.2 genannten Fixtures weiterhin ohne Absturz laufen, auch **nachdem** F1–F10 implementiert wurden (Regressionsschutz gegen die generische Suite) |

### 2.5 Traceability: Anforderung §6 Punkt 1/2 (Unit-Test-Vorgaben) → Testfall hier

| §6-Vorgabe | Testfall(e) |
|---|---|
| Punkt 1 (DOCX: Writer erzeugt gewählte Form; Reader erkennt beide Formen inkl. Schalter; Regressionstest `<w:t>` zwischen `separate`/`end`) | DU1, DU2, DU3, DU6, DU7 + reale Fixtures |
| Punkt 2 (ODT: Writer erzeugt `<text:page-number>`; Reader erkennt es; `<text:page-count>` nicht verwechselt) | OU1, OU2, OU3, OU4, OU5 + reale Fixtures |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wortgleich mit dem Auftrag zu diesem Plan):** Kein Testfall
in Teil B darf durch direkten Aufruf interner Funktionen
(`insertPageNumberField()`, `readDocx(...)`, `writeOdt(...)` etc.) im Node-Kontext
ersetzt werden. Jeder Testfall läuft über echte Nutzer:innen-Handlungen im Browser:
`locator.click()`, `page.keyboard.press(...)`/`.type(...)`, echter Datei-Upload
(`filechooser`-Event), `page.waitForEvent('download')` + Auslesen und
**strukturelles** Parsen der heruntergeladenen Datei vom Dateisystem (nicht nur
`.toContain`-String-Suche).

### 3.1 Neue Datei: `tests/e2e/page-number-field.spec.ts`

Folgt den Konventionen aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`.
Alle Tests in diesem Abschnitt (3.2–3.8) laufen auf **Body-Ebene** (siehe
Abschnitt 0.1) — das ist der heute einzig mögliche vollständige Browser-Nachweis.

#### 3.2 Grundfall: Einfügen an Cursor-Position (Anforderung §3.2)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P1 | Feld an Cursor-Position ohne Selektion | Text „Seite " tippen, `page.getByTitle('Seitenzahl einfügen').click()` | `.pm-field-page-number` erscheint unmittelbar nach „Seite ", sichtbar schattiert (`getComputedStyle` background ≠ transparent); Cursor direkt danach, weiteres Tippen von „." landet **nach** dem Feld | Anforderung §3.2, §1 Zeile 4 | **ROT** — Button existiert noch nicht |
| P2 | Einfügen über bestehende Selektion | Wort „ABC" tippen, selektieren (`page.keyboard.press('Shift+Home')` o. ä.), Button klicken | „ABC" verschwindet, Feld ersetzt die Selektion (Anforderung §3.3) | Anforderung §3.3 | **ROT** |

#### 3.3 Selection-Sync-Regressionspflicht (Anforderung §6 Punkt 4, Grenzfall 5)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P3 | Feld einfügen, direkt weitertippen | Feld einfügen → sofort „ von 10" tippen (kein zusätzlicher Klick) | Text erscheint korrekt direkt nach dem Feld, keine vertauschte/verlorene Selektion — Muster aus `selection-regression.spec.ts` mit Feld-Einfüge-Aktion statt Fett-Toggle wiederholen | Anforderung §6.4, Grenzfall 5, Hauptspezifikation Abschnitt 2 | **ROT** |
| P4 | Feld einfügen, Cursor per Mausklick an andere Stelle neu setzen, dann Formatierung anwenden | Feld einfügen → Klick an anderer Textstelle → „Fett" klicken auf dortige Selektion | Nur die neu selektierte Stelle wird fett, Feld unverändert — kein Übergreifen der stale Selektion | Hauptspezifikation Abschnitt 2 (Selection-Sync-Bug) | **ROT** |

#### 3.4 Löschen als atomare Einheit (Anforderung §3.11, Grenzfall 6)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P5 | Backspace unmittelbar nach dem Feld | Feld einfügen, Cursor steht danach, `Backspace` einmal drücken | Feld verschwindet vollständig, **kein** Rest-Text (kein „PAGE", keine hartkodierte Ziffer) im DOM | Grenzfall 6 | **ROT** |
| P6 | Entf unmittelbar vor dem Feld | Feld einfügen, Cursor per `ArrowLeft` davor setzen, `Delete` drücken | Feld verschwindet vollständig als Ganzes | Grenzfall 6 | **ROT** |
| P7 | Feld markieren (Klick auf das Feld selbst) + `Delete` | Auf `.pm-field-page-number` klicken (Node-Selektion, kein Cursor mitten im Text), `Delete` | Feld verschwindet, umgebender Text bleibt exakt erhalten | Anforderung §3.11 | **ROT** |
| P8 | Backspace mit Text unmittelbar vor dem Feld | „Seite " + Feld tippen/einfügen, Cursor direkt nach dem Feld, `Backspace` | Nur das Feld verschwindet, „Seite " bleibt **vollständig** erhalten (kein zusätzliches Zeichen von „Seite " gelöscht) | Anforderung §3.11 | **ROT** |

#### 3.5 Formatierbarkeit (Anforderung §3.10, Grenzfall 14)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P9 | Feld nachträglich markieren und fett formatieren | Feld einfügen, auf das Feld klicken (Node-Selektion), „Fett" klicken | Feld visuell/strukturell fett (z. B. `font-weight` am `<span data-field-type="page-number">`) | Anforderung §3.10 | **ROT** |
| P10 | Formatierung an Cursor-Position vor dem Einfügen | „Fett" aktivieren (Cursor, keine Selektion), dann Feld einfügen | Neu eingefügtes Feld ist bereits fett (kein zweiter Klick nötig) | Anforderung §3.10 | **ROT** |

#### 3.6 Kopieren/Einfügen (Anforderung §3.12, Grenzfall 7)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P11 | Feld kopieren, an anderer Stelle einfügen | Feld einfügen, markieren, `ControlOrMeta+c`, Cursor an andere Stelle, `ControlOrMeta+v` | Zwei unabhängige, weiterhin **lebendige** Felder im DOM (beide `.pm-field-page-number`, kein hartkodierter Text-Schnappschuss) | Anforderung §3.12, Grenzfall 7 | **ROT** |

#### 3.7 Rundreise über echten Upload/Export (Anforderung §5.2, §6 Punkt 3)

Jede Zeile: Zustand im Editor erzeugen → **echter** Export
(`page.waitForEvent('download')`) → heruntergeladene Datei mit **unabhängigem**
Parser prüfen (`JSZip` + `DOMParser`, **nicht** dem eigenen Reader) → Datei über
den echten Klickpfad erneut hochladen → Feld weiterhin vorhanden.

| # | Test | Prüfung nach Export (unabhängiger Parser) | Bezug | Erwarteter Status |
|---|---|---|---|---|
| P12 | Feld einfügen (DOCX-Dokument) → Export | `word/document.xml` enthält `<w:fldChar w:fldCharType="begin"/>` gefolgt von `<w:instrText>` mit Token „PAGE" (Tokenvergleich, nicht Substring — Abgrenzung gegen mögliche künftige `NUMPAGES`-Verwechslung) | Anforderung §5.2.1, §6.3 | **ROT** |
| P13 | Reimport der P12-Exportdatei | Nach Upload: `.pm-field-page-number` weiterhin sichtbar im DOM | Anforderung §5.2.1 | **ROT** |
| P14 | Feld einfügen (ODT-Dokument) → Export | `content.xml` enthält `<text:page-number text:select-page="current">` | Anforderung §5.2.3, §6.3 | **ROT** |
| P15 | Reimport der P14-Exportdatei | Feld weiterhin sichtbar | Anforderung §5.2.3 | **ROT** |
| P16 | Feld + Text + Formatierung kombiniert (z. B. „Seite " + fett formatiertes Feld + „.") → Export → Reimport, DOCX **und** ODT | Text, Formatierung **und** Feld bleiben nach Reimport unverändert (Grenzfall 14, Anforderung §5.2.6) | Anforderung §5.2.6 | **ROT** |
| P17 | Cross-Format: als DOCX erzeugtes Dokument mit Feld → als ODT exportieren → Download erneut über ODT-Karte hochladen → als DOCX exportieren → Download erneut über DOCX-Karte hochladen | Feld bleibt über beide Konvertierungen als echtes, aktualisierbares Feld erhalten (kein Abrutschen zu Text) | Anforderung §5.2.4, Grenzfall 12 | **ROT** |
| P18 | Cross-Format umgekehrt: ODT → DOCX → ODT | Spiegelbildlich zu P17 | Anforderung §5.2.5, Grenzfall 12 | **ROT** |
| P19 | Undo (`ControlOrMeta+z`) direkt nach Einfügen, dann Export | Export enthält **kein** Feld (Undo hat vor dem Export vollständig zurückgesetzt) | Grenzfall 13 | **ROT** |

#### 3.8 Import einer fremden, mit echtem Word/LibreOffice erzeugten Datei (Anforderung §5.2 Punkt 7/8, §6 Punkt 5)

Datei-Upload über den **echten** Klickpfad (`filechooser`-Event, siehe 3.11).

| # | Test | Fixture | Prüfung | Erwarteter Status |
|---|---|---|---|---|
| P20 | Fremde DOCX mit `w:fldSimple`-PAGE-Feld importieren, unverändert exportieren, reimportieren | `tests/fixtures/external/docx/FancyFoot.docx` | Nach erstem Import: Feld sichtbar im DOM (nicht als Datenverlust „Page " ohne Zahl); nach Export/Reimport weiterhin vorhanden | Anforderung §5.1.1, §5.2.7, Grenzfall 9 | **ROT** — heutiger Ist-Zustand zeigt nachweislich Datenverlust (siehe Abschnitt 0/2.1) |
| P21 | Fremde DOCX mit `w:fldChar`-Quadruple-PAGE-Feld inkl. even/default-Mehrfachreferenz | `tests/fixtures/external/docx/bug57031.docx` | Feld wird als aktualisierbares Feld erkannt (nicht als hartkodierter Text „2"), Reihenfolge-unabhängige Header-/Footer-Auflösung (F4) sichtbar am korrekt angezeigten „Page 2 of 14" | Anforderung §5.1.1, §5.2.7, Grenzfall 8 | **ROT** |
| P22 | Fremde ODT mit `<text:page-number>` | `tests/fixtures/external/odt/odf-fields.odt` | Feld sichtbar (nicht stillschweigend verschwunden), Export/Reimport erhält es | Anforderung §5.1.2, §5.2.8, Grenzfall 10 | **ROT** |
| P23 | Baseline: reale Datei **ohne** jedes Seitenzahl-Feld | Beliebige unauffällige Fixture, z. B. `tests/fixtures/external/docx/sample.docx` | Import → Export → Reimport erzeugt **kein** neu erfundenes Feld | Anforderung §5.1.3 | Erwartet **GRÜN** bereits heute (siehe 2.4), muss aber im Browser **nach** Implementierung erneut ausgeführt werden |

### 3.9 BLOCKIERT — Kopf-/Fußzeilen-Ebene (Anforderung §6 Punkt 3/6/7, §5.2 vollständig)

**Status: kann heute nicht geschrieben/ausgeführt werden**, weil kein
fokussierbarer Kopf-/Fußzeilenbereich existiert (siehe Abschnitt 0). Diese Tabelle
ist **Pflichtbestandteil** dieses Plans (nicht optional) — sie muss 1:1 in
`tests/e2e/page-number-field.spec.ts` (oder eine dedizierte
`headers-page-number.spec.ts`) übernommen werden, **sobald**
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen Editierbereich liefern. Bis
dahin bleibt sie hier als vorab spezifizierte, blockierte Checkliste stehen, damit
sie beim Abschluss jener Tickets nicht neu erfunden werden muss und damit die
Blockade nicht stillschweigend verschwindet.

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H1 | Fußzeile aktivieren, Cursor hineinsetzen, Feld einfügen | Fußzeile über `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`-UI aktivieren, Cursor in den Fußzeilen-Editierbereich setzen, „Seitenzahl einfügen" klicken | Feld erscheint **im Fußzeilenbereich**, nicht im Haupttext | Anforderung §5.2.1, §6.3 |
| H2 | Dasselbe in der Kopfzeile | analog H1 mit Kopfzeile | Feld erscheint im Kopfzeilenbereich | Anforderung §5.2.2 |
| H3 | Button-Kontext-Gating | Cursor im Haupttext (nicht Kopf-/Fußzeile), Button-Zustand prüfen | Button sichtbar deaktiviert **oder** erklärender Tooltip — niemals ein Klick, der ergebnislos bleibt (Anforderung §3.15); ersetzt/verschärft P1, sobald Kontext existiert | Anforderung §1 Zeile 1, §3.15, Grenzfall 1/2 |
| H4 | Rundreise Fußzeile, DOCX | Feld in Fußzeile einfügen → Export → `word/footer*.xml` enthält Feld-Markup → Reimport → Feld weiterhin in Fußzeile | Anforderung §5.2.1 |
| H5 | Rundreise Kopf- **und** Fußzeile, ODT | analog H4 für ODT, beide Bereiche | Anforderung §5.2.3 |
| H6 | Cross-Format Kopf-/Fußzeile DOCX→ODT→DOCX / ODT→DOCX→ODT | analog P17/P18, aber im Kopf-/Fußzeilenbereich statt Body | Anforderung §5.2.4/§5.2.5, Grenzfall 12 |
| H7 | Fremde Word-/LibreOffice-Datei mit Feld **in tatsächlicher Kopf-/Fußzeile** importieren | `FancyFoot.docx`/`bug57031.docx`/`odf-fields.odt` (Achtung: `odf-fields.odt` hat das Feld im **Body**, nicht Header — für die reine Kopf-/Fußzeilen-Variante ist `fields.odt` die richtige Fixture) → Import → im UI sichtbar im Kopf-/Fußzeilenbereich (nicht nur im Datenmodell) | Anforderung §5.1.1/§5.1.2, §5.2.7/§5.2.8 |
| H8 | Selection-Sync-Regressionssequenz **innerhalb** des Kopf-/Fußzeilen-Editierbereichs | Feld in Fußzeile einfügen, direkt weitertippen im selben Fußzeilen-Editierbereich | Kein Übergreifen auf den Haupttext, keine vertauschte Selektion zwischen den beiden Editierbereichen (neues Risiko, das auf Body-Ebene gar nicht existieren kann, siehe Anmerkung 3.9.1) | Anforderung §6.4, Grenzfall 5 |
| H9 | Löschen/Backspace am Feldrand **innerhalb** Kopf-/Fußzeile | analog P5/P6/P7, im Fußzeilenbereich | Feld atomar gelöscht, Haupttext unberührt | Grenzfall 6 |

**Anmerkung 3.9.1 (zusätzlicher, durch diese QA-Prüfung neu identifizierter
Risikopunkt, in keinem der beiden Vorgängerdokumente benannt):** Sobald zwei
unabhängige ProseMirror-Editierbereiche (Body und Kopf-/Fußzeile) gleichzeitig
existieren, entsteht ein **neuer** Klassen von Selection-Sync-Risiko, der auf
Body-Ebene strukturell gar nicht auftreten kann: eine Selektion/ein Cursor, der im
**falschen** Editierbereich landet, nachdem der Fokus zwischen beiden gewechselt
hat (z. B. Toolbar-Klick wirkt versehentlich auf den zuletzt aktiven statt den
gerade fokussierten Bereich). H8 deckt das nur an, sobald H1–H9 geschrieben werden
können — dieser Plan hält fest, dass H8 **nicht** optional ist, sondern der
naheliegendste neue Bug-Kandidat, sobald Kopf-/Fußzeile UI-fähig wird.

### 3.10 Kompatibilität mit `pagination.ts` (Anforderung §3.14)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| P24 | Sehr langes Dokument (> 20 simulierte Seiten laut automatischer Paginierung) mit Feld im Body | Genug Text tippen/einfügen, um > 20 simulierte Seiten zu erzeugen (vgl. Muster in bestehenden Paginierungstests `pagination.test.ts`), Feld irgendwo einfügen | Kein Absturz, Feld bleibt an seiner Absatzposition erhalten, Paginierung funktioniert weiterhin (bestehendes Verhalten nicht durch das neue Atom-Node gebrochen) | Anforderung §3.14, Grenzfall 16 (Body-Teil, Editor-Live-Anzeige über mehrere Seiten bleibt laut Anforderung §3.9 explizit ein offener, nicht-blockierender Punkt) | **ROT bis Feature existiert**, danach erwartet **GRÜN** |

### 3.11 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

Für **alle** Tests in 3.7/3.8, die einen Upload/Reimport beinhalten (P13, P15,
P17–P23), gehört der tatsächliche Klickpfad zwingend dazu:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bug57031.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
```

### 3.12 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für P12/P14/P20–P22 wird strukturelles XML-Parsen verlangt (Muster wie
`aufzaehlungsliste-qa.md` Abschnitt 3.14, `docx.spec.ts:99-125`):

```ts
import JSZip from 'jszip'
import { JSDOM } from 'jsdom'

const zip = await JSZip.loadAsync(downloadBuffer)
const documentXml = await zip.file('word/document.xml')!.async('text')
const dom = new JSDOM('').window.DOMParser
const xmlDoc = new dom().parseFromString(documentXml, 'application/xml')
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const fldChars = [...xmlDoc.getElementsByTagNameNS(W_NS, 'fldChar')]
expect(fldChars.some((el) => el.getAttributeNS(W_NS, 'fldCharType') === 'begin')).toBe(true)
const instrTexts = [...xmlDoc.getElementsByTagNameNS(W_NS, 'instrText')].map((el) => el.textContent?.trim())
expect(instrTexts.some((t) => t?.split(/\s+/)[0]?.toUpperCase() === 'PAGE')).toBe(true)
```

Dies stellt sicher, dass die Prüfung **strukturell** ist (richtiges Element mit
richtigem Tokenwert), nicht nur „die Zeichenkette PAGE kommt irgendwo in der Datei
vor" — relevant, weil sonst z. B. „NUMPAGES" fälschlich als Treffer durchgehen
könnte.

### 3.13 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` — Pflichtbestandteil, nach jeder
  Toolbar-Änderung (neuer Button in `Toolbar.tsx`, siehe Code-Plan 4.4) erneut
  ausführen.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/lifecycle.spec.ts`
  — bleiben bestehen, keine inhaltliche Berührung erwartet, aber Teil der
  Dauer-Suite.

### 3.14 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (P1, P2, P5–P18, P20–P24) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-lastige Tests (P3, P4, P19) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard` bleibt gerätunabhängig auslösbar, reales Touch-Verhalten separat dokumentieren |
| Kopf-/Fußzeilen-Tests (H1–H9) | Blockiert | Blockiert | Blockiert | Erst nach `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einplanbar |

---

## 4. Zusätzliche, durch diese QA-Prüfung neu gefundene Punkte (in keinem der beiden Vorgängerdokumente in dieser Form benannt)

1. **Der Code-Plan behauptet in Abschnitt 4.2, `documentModel.ts` brauche keine
   Änderung, weil `header`/`footer` bereits generisches `ProseMirrorJSON | null`
   sind — das ist strukturell richtig, verdeckt aber, dass Reader/Writer für
   Kopf-/Fußzeile über einen anderen Code-Pfad laufen als für den Body**
   (siehe Anmerkung 2.2.1: ODT-Kopfzeile kommt aus `styles.xml`, nicht
   `content.xml`; DOCX-Kopf-/Fußzeile hat einen eigenen `readBodyChildren`-Aufruf
   mit eigener Relationship-Tabelle, siehe Code-Plan Neufund 1a.4). Ein
   ausschließlich auf Body-Ebene grüner Test-Satz beweist deshalb **nicht**
   automatisch, dass Kopf-/Fußzeile funktioniert — DU8/OU6 (Abschnitt 2.1/2.2)
   schließen diese Lücke bereits heute auf Datenebene, sind aber im Code-Plan
   selbst nicht als eigener Testfall aufgeführt und müssen als **zusätzliche**
   Pflichttests zum Code-Plan ergänzt werden.
2. **`Bug60341.docx` (F11, `w:sdt`-Bug) darf nicht versehentlich in die
   Pflicht-Fixture-Liste für Fix F3 rutschen** — der Code-Plan schließt sie
   selbst explizit aus (Abschnitt 6.1), dieser Punkt wird hier als
   QA-Prüfschritt festgehalten: bei Testerstellung aktiv gegenprüfen, dass
   niemand aus Bequemlichkeit `Bug60341.docx` als „noch eine PAGE-Fixture"
   hinzufügt, ohne den F11-Zusammenhang zu kommentieren (siehe 2.1, letzte
   Fixture-Zeile).
3. **Der neue Selection-Sync-Risikopunkt zwischen zwei Editierbereichen**
   (Anmerkung 3.9.1) ist in keinem der beiden Vorgängerdokumente als eigener
   Testfall benannt — Anforderung §2 (Hauptspezifikation-Verweis) erwähnt den
   Selection-Sync-Bug nur allgemein, der Code-Plan geht auf das Zwei-Editor-
   Szenario überhaupt nicht ein (folgerichtig, da er dieses Szenario nicht baut).
   Dieser Plan hält H8 deshalb als **nicht optionalen** Testfall fest, sobald
   3.9 einplanbar wird.
4. **`isPageFieldInstr`/Token-Vergleich gegen `NUMPAGES`-Substring-Fehlmatch**
   (DU4): Der Code-Plan spezifiziert in 4.6 selbst einen korrekten
   Tokenvergleich (`instr.trim().split(/\s+/)[0]?.toUpperCase() === 'PAGE'`), aber
   der Testplan-Abschnitt 6 des Anforderungsdokuments erwähnt diesen konkreten
   Fehlmodus (Substring-Match würde „NUMPAGES" fälschlich matchen) nicht
   explizit. Dieser QA-Plan macht DU4 deshalb zu einem **eigenständigen,
   benannten** Testfall statt ihn implizit unter „Rundreise" zu subsumieren.

---

## 5. Freigabekriterium für diesen Testplan

Dieser Testplan gilt als **vollständig abgearbeitet**, wenn:

- Teil A (Abschnitt 2, inkl. DU8/OU6 und der realen Fixtures) vollständig grün ist
  — das ist unabhängig von der Kopf-/Fußzeilen-Abhängigkeit erreichbar und bereits
  laut Anforderung §7 ein Pflichtkriterium.
- Teil B, Abschnitt 3.2–3.8 (Body-Ebene) vollständig grün ist, inklusive aller
  realen Fixture-Importe (3.8) und der unabhängigen XML-Prüfung (3.12).
- Abschnitt 3.9 (Kopf-/Fußzeilen-Ebene) entweder vollständig grün ist (falls
  `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` inzwischen umgesetzt wurden) —
  **oder** im Freigabebericht explizit als „blockiert durch externe Abhängigkeit,
  siehe Anforderung §3.1/§7" ausgewiesen ist. Ein stillschweigendes Weglassen
  dieses Abschnitts (z. B. weil „auf Body-Ebene ja schon alles grün ist") ist
  **kein** zulässiges Abnahmeergebnis für den Gesamtstatus „vorhanden" — nur für
  den Zwischenstatus „teilweise", exakt wie in Anforderung §7 selbst vorgesehen.

Nach heutigem Stand (Abschnitt 0) ist der Backlog-Status von
`seitenzahl-einfuegen` unverändert **„fehlt"** (nicht einmal „teilweise" — dafür
müsste mindestens Teil A umgesetzt und grün sein). Dieser Testplan wird erst nach
Umsetzung von `seitenzahl-einfuegen-code.md` Phasen A–D ausführbar; bis dahin
dokumentiert er das **Soll** in unmittelbar umsetzbaren, konkreten Testfällen samt
erwartetem (rotem) Ist-Status.
