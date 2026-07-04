# QA-Testplan: „Fußzeile bearbeiten"

Bezug: `specs/fusszeile-bearbeiten-req.md` (Anforderungen, Abschnitte 0–11) und
`specs/fusszeile-bearbeiten-code.md` (verifizierter Ist-Stand, Architekturentscheidung
§2, dateigenaue Änderungen §3, Grenzfälle-Mapping §5, DoD-Abgleich §7). Dieser Plan legt
fest, **wie** jede Anforderung und jeder in der Code-Datei benannte Befund/Fix
nachweislich verifiziert wird — gemäß Req §10 Punkt 1/2 ausdrücklich **nicht nur** über
Reader/Writer-Unit-Tests oder interne Command-Aufrufe, sondern durch echte,
Playwright-gesteuerte Browser-Interaktion (Klick, Tippen, Datei-Upload, Datei-Download +
Byte-/XML-Inspektion der heruntergeladenen Datei).

Status dieses Plans: Entwurf zur Umsetzung. Er beschreibt Soll-Testfälle; welche davon
zum Zeitpunkt der Umsetzung von `fusszeile-bearbeiten-code.md` bereits grün/rot sind, ist
beim Ausführen festzuhalten (Abschnitt 8).

---

## 0. Grundprinzip: zwei getrennte, sich ergänzende Testebenen

| Ebene | Zweck | Zählt als Nachweis für DoD-Punkt (Req §10)? |
|---|---|---|
| **Unit-Tests** (Vitest, `jsdom`) | Schnelle, deterministische Prüfung der reinen Datenmodell-Transformation `content.footer → writeDocx/writeOdt → readDocx/readOdt → content.footer`, inklusive der in `fusszeile-bearbeiten-code.md` §1.6–1.8 verifizierten Bugfixes (Bild-Rels-Scoping, `w:type`-Präferenz, ODT-Master-Page-Kette) und des neuen `page_number_field`-Schema-Node. Direkter Aufruf der Funktionen aus `reader.ts`/`writer.ts`. | **Nein, allein nicht ausreichend** für Punkt 1, 2, 3, 6, 8 — Req §10 verlangt dort explizit „per echtem Playwright-`click()`"/„per echter Tastatur-/Maus-Interaktion". Unit-Tests sind Pflicht-Ergänzung für Punkt 4 und 5 (Rundreise-Korrektheit auf Datenebene), aber kein Ersatz für Teil B. |
| **E2E-Tests** (Playwright, echter Chromium-Prozess gegen den gebauten `dist`/`preview`-Server) | Reale Nutzer:innen-Interaktion: Klick auf den Fußzeilen-Toggle, Tippen im Fußzeilenbereich, Toolbar-Formatierung bei Fußzeilen-Fokus, Klick auf „Seitenzahl einfügen", echter Datei-Upload über `<input type="file">`, echtes `download`-Event, XML-Inspektion der tatsächlich heruntergeladenen Datei, `window.confirm`-Dialogsteuerung. | **Ja** — dies ist die in Req §10 Punkt 1/2/3/6/8 geforderte Nachweisebene. |

Eine E2E-Testzeile gilt in diesem Plan nur dann als „echt", wenn sie mindestens eine der
folgenden Aktionen über die echte Playwright-`Page`-API ausführt (kein direkter
Import/Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`insertPageNumberField`/
`toggleFooter` innerhalb einer `*.spec.ts`-Datei):

- `locator.click()` / `page.keyboard.type()` / `page.keyboard.press()`
- `locator.setInputFiles(...)` auf dem tatsächlichen, im DOM gerenderten
  `<input type="file">`
- `page.waitForEvent('download')` gefolgt vom Einlesen der **tatsächlich auf Disk
  geschriebenen** heruntergeladenen Datei (`download.path()` + `fs.readFile` + `JSZip`),
  nicht nur Prüfung, dass „irgendein Download" stattfand
- `page.on('dialog', ...)` für `window.confirm`-Interaktion (Bestätigen/Abbrechen)
- `document.caretRangeFromPoint`-Klickpfad wird ausschließlich über echte
  `locator.click({ position: {...} })`-Koordinaten ausgelöst, nie durch direkten Aufruf
  von `mapClickToFooterPos(...)` in einem Test

---

## 1. Vorbedingungen für alle E2E-Spezifikationsdateien

1. `playwright.config.ts` (bereits vorhanden, `baseURL:
   'http://localhost:4173/salamanido/'`, `webServer` baut automatisch) wird unverändert
   wiederverwendet.
2. Jede neue Testdatei beginnt mit demselben `beforeEach` wie die bestehenden Specs
   (`tests/e2e/docx.spec.ts`, `tests/e2e/selection-regression.spec.ts`):
   ```ts
   test.beforeEach(async ({ page }) => {
     await page.goto('/')
     await page.getByRole('button', { name: /verstanden/i }).click() // Privacy-Banner wegklicken
   })
   ```
3. Card-Locator-Helfer wiederverwenden (identisch zu bestehenden Specs):
   ```ts
   const docxCard = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
   const odtCard  = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
   ```
4. Globale Konsolen-/Seitenfehler-Erfassung in **jeder** neuen Spec-Datei (Nachweis „kein
   Absturz" für sämtliche DoD-Punkte):
   ```ts
   test.beforeEach(async ({ page }) => {
     const errors: string[] = []
     page.on('pageerror', (e) => errors.push(String(e)))
     page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
     // am Ende jedes Tests: expect(errors, errors.join('\n')).toEqual([])
   })
   ```
5. Fußzeilen-spezifischer Locator-Baukasten (an den Kopf jeder neuen Spec-Datei, analog
   zu `docxCard`/`odtCard`):
   ```ts
   const footerToggle = (page) => page.getByRole('button', { name: /Fußzeile (einblenden|ausblenden)/ })
   const footerBands = (page) => page.locator('[data-footer-band]')
   const activeFooterBand = (page) => page.locator('[data-footer-band] .ProseMirror')
   const pageNumberButton = (page) => page.getByRole('button', { name: 'Seitenzahl einfügen' })
   const areaStatus = (page) => page.getByText(/Bearbeite: (Haupttext|Fußzeile)/)
   ```
   **Hinweis:** Die genauen Locator-Selektoren (`data-footer-band`, `aria-label`-Texte)
   sind aus `fusszeile-bearbeiten-code.md` §3.14–3.16 übernommen; sie müssen beim
   Implementieren gegen die tatsächlich gerenderte DOM-Struktur abgeglichen und bei
   Abweichung hier nachgezogen werden (kein stiller Test-Skip bei Selektor-Mismatch).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Ist-Zustand (bereits vorhanden, wiederverwenden, muss weiterhin grün bleiben)

| Datei | Deckt ab |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts`, Testblock „header, footer, and metadata" | Rundreise von `footer` über direkt konstruierte `WordDocumentContent`-Objekte (Req §0 Zeile 12 — bestehende Basis, **Regressionsschutz**, nicht neu zu schreiben). |
| `src/formats/odt/__tests__/roundtrip.test.ts`, analoger Block | Dasselbe für ODT. |
| `src/formats/docx/__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts` | Reiner Crash-Sweep über alle realen Fixtures (Req §0 Zeile 13 — bleibt als Basissicherung bestehen, wird in 2.2 um inhaltliche Prüfung ergänzt). |

### 2.2 Neue Ergänzungen

| # | Datei | Ergänzung | Bezug (Req/Code) |
|---|---|---|---|
| U-F1 | `docx/__tests__/roundtrip.test.ts` | Rundreise `page_number_field` in Fußzeile, ohne Marks: `writeDocx→readDocx` → Node bleibt `type: 'page_number_field'`, **nicht** literaler Text „1" oder „PAGE". | Req §5, Code §3.10/§3.11 |
| U-F2 | `docx/__tests__/roundtrip.test.ts` | Dasselbe mit `strong`+`textColor`-Marks auf dem Feld → beide Marks nach Rundreise erhalten (prüft `marks: '_'` auf dem Atom-Node, Code §3.1/§9 Spike). | Req §5, Code §3.1 |
| U-F3 | `docx/__tests__/roundtrip.test.ts` (**Regressionstest, roher XML-String statt eigenem Writer**) | `readDocx` direkt mit handgebautem `document.xml`/`footer1.xml` gefüttert: (a) `<w:fldSimple w:instr="PAGE">…</w:fldSimple>`-Form, (b) `w:fldChar begin/separate/end`-Quadruple-Form → **beide** ergeben `page_number_field`, keine der beiden wird als reiner Text „1" interpretiert. Deckt exakt den in Code §1.6/§3.10 benannten Bestandsfehler „stiller Verlust bei `fldSimple`, Herabstufung zu statischem Text bei `fldChar`" ab. | Code §1.7 Analogon (Feld-Erkennung), §3.10 |
| U-F4 | `docx/__tests__/roundtrip.test.ts` | Regressionstest für Code §1.7: synthetisches `sectPr` mit `w:footerReference w:type="even"/"default"/"first"` in dieser Dokumentreihenfolge (die von `headerFooter.docx` real gefundene Reihenfolge nachbilden) → geladene Fußzeile entspricht inhaltlich der `default`-Variante, **nicht** `even`; `meta.footerVariantNotice` (oder das tatsächlich gewählte Feldname-Äquivalent, siehe Hinweis unten) ist gesetzt. | Code §1.7, §3.6a |
| U-F5 | `docx/__tests__/roundtrip.test.ts` | Regressionstest für Code §1.6: synthetisches `footer1.xml` mit `<w:drawing>`+`r:embed="rId1"` **und** eigener `footer1.xml.rels` (Ziel `media/image1.png`), während `document.xml.rels` für dieselbe ID `rId1` bewusst ein **anderes** Ziel (z. B. `styles.xml`) enthält → geladenes Bild ist der PNG-Inhalt, **nicht** der XML-Inhalt von `styles.xml` (kein `data:image/xml;base64,...`). | Code §1.6, §3.6c |
| U-F6 | `docx/__tests__/roundtrip.test.ts` | Export-Test: `WordDocumentContent` mit Bild in `footer` → `writeDocx`-Ergebnis (Zip) enthält `word/_rels/footer1.xml.rels` mit korrektem `Type=".../image"`-Eintrag, `footer1.xml` referenziert dieselbe `r:id`. | Code §1.6 Schreibrichtung, §3.7 |
| U-F7 | `docx/__tests__/roundtrip.test.ts` | Regressionstest Code §1.5 (bewusst als Beweis, nicht als Bugfix): `footer` = `emptyDocJSON()`-artiges Objekt (ein leerer Absatz) → `writeDocx` schreibt `footer1.xml` (Teil existiert im Zip), **nicht** `null`/ausgelassen. | Req §7 Grenzfall 1, Code §1.5 |
| U-F8 | `docx/__tests__/roundtrip.test.ts` | Rundreise: `heading` (Formatvorlage „Überschrift") als einziger Block in `footer` → bleibt nach Rundreise als `heading` mit korrektem `level` erhalten, kein Absturz. | Req §7 Grenzfall 8 |
| U-F9 | `docx/__tests__/roundtrip.test.ts` | Cross-Format-Test **innerhalb der DOCX-Testdatei nur als Vorbereitung**: Fußzeile mit gemischter Formatierung (fett, Farbe, zentriert) + Tabelle + Bild + Seitenzahl-Feld in einem einzigen Dokument → einfacher `writeDocx→readDocx`-Zyklus erhält alle Elemente gleichzeitig (deckt Req §8.1.3/8.1.4/8.1.5 kombiniert auf Datenebene ab, bevor Teil B denselben Fall im Browser nachstellt). | Req §8.1.3–8.1.5 |
| U-F10 | `odt/__tests__/roundtrip.test.ts` | Rundreise `page_number_field` via `<text:page-number text:select-page="current">`, mit und ohne Marks. | Req §5, Code §3.12/§3.13 |
| U-F11 | `odt/__tests__/roundtrip.test.ts` | Regressionstest: `<text:page-count>` wird **nicht** als `page_number_field` interpretiert (anderer Feldtyp), aber der Cache-Textinhalt bleibt als normaler Text erhalten (kein stiller Verlust). | Req §7 Grenzfall 10, Code §3.12 |
| U-F12 | `odt/__tests__/roundtrip.test.ts` | Regressionstest für Code §1.8: synthetisches `styles.xml` mit zwei `style:master-page`-Elementen, verkettet über `style:next-style-name` exakt wie am realen Fixture `HeaderFirstAndEvenPageEnabled_MSO15.odt` verifiziert (Quelle = „erste Seite anders", Ziel = reguläre Folgeseite) → geladene Fußzeile stammt inhaltlich aus der **Kettenziel**-Master-Page, nicht aus der zufällig ersten im Dokument; Notice-Feld gesetzt. | Code §1.8, §3.8 |
| U-F13 | `odt/__tests__/roundtrip.test.ts` | Rundreise `heading` in Fußzeile (analog U-F8). | Req §7 Grenzfall 8 |
| U-F14 | neu, gemeinsam für DOCX+ODT (z. B. `src/formats/shared/editor/__tests__/footerCrossFormat.test.ts`) | Cross-Format-Rundreise: (a) Fußzeile in DOCX-Content erstellt → `writeOdt` → `readOdt` → Inhalt (Text, Formatierung, Seitenzahl-Feld) bleibt erhalten. (b) Umgekehrt ODT → DOCX. (c) Doppelte Rundreise DOCX→ODT→DOCX an derselben, alle Formate aus U-F9 kombinierenden Fußzeile → kein zusätzlicher Verlust in der zweiten Runde (String-/Struktur-Vergleich Runde 1 vs. Runde 2). | Req §8.1.6/§8.1.7 |
| U-F15 | neu, `src/formats/shared/editor/__tests__/pageBands.test.ts` | `footerBandTopPx(0) === PAGE_CONTENT_HEIGHT_PX`; `footerBandTopPx(1) === PAGE_CONTENT_HEIGHT_PX + (PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX)`; streng monoton steigend für `i = 0..5`. Reine Konstantenprüfung, kein DOM. | Code §3.5, §6.1 |
| U-F16 | `docx/__tests__/external-fixtures.test.ts` (Erweiterung) | Für **jede** Datei aus Req §8.2-Tabelle (DOCX-Teil): nach Import den Fußzeilentext extrahieren (`content.footer` → Klartext) und als feste String-Assertion festhalten (kein reiner Snapshot ohne Inhaltsprüfung) → `writeDocx` (unverändert) → `readDocx` → Fußzeilentext identisch zur ersten Extraktion. Für `NoHeadFoot.docx`: `footer === null` nach Import **und** nach Rundreise. Für `EmptyDocumentWithHeaderFooter.docx`: `footer !== null`, `body` ist leer. | Req §8.2 Testfall 1, Code §6.2 |
| U-F17 | `odt/__tests__/external-fixtures.test.ts` (Erweiterung) | Dasselbe Muster für den ODT-Teil der Req §8.2-Tabelle (`HeaderFooter.odt`, `headfoot.odt`, `headerFinal.odt`, `headerFirstPage.odt`, die drei `*_MSO15.odt`-Varianten, `tabellen_header_DOC_LO4-1-0.odt`). | Req §8.2 Testfall 1, Code §6.2 |
| U-F18 | `docx/__tests__/external-fixtures.test.ts` + `odt/__tests__/external-fixtures.test.ts` | Cross-Format-Export für mindestens je eine Datei aus der Req §8.2-Tabelle (z. B. `docx/headerFooter.docx` → `writeOdt`, `odt/HeaderFooter.odt` → `writeDocx`) → Reimport im jeweils anderen Format → Fußzeilentext bleibt erhalten (Formatierungssimplifizierung dokumentieren, Textverlust ist ein Fehlschlag). | Req §8.2 Testfall 2 |

**Hinweis zu `meta.footerVariantNotice`:** Der exakte Feldname/Ort dieses Hinweisfelds ist
in `fusszeile-bearbeiten-code.md` §3.6a als Vorschlag benannt, aber nicht als
endgültige, unveränderliche API festgelegt. Die Unit-Tests U-F4/U-F12 müssen beim
Implementieren gegen den tatsächlich gewählten Feldnamen (`WordDocumentContent.meta`
oder ein separates Reader-Rückgabefeld) abgeglichen werden — der **Vertrag** „bei
mehreren Varianten wird ein maschinenlesbares Signal gesetzt" ist die eigentliche
Prüfaussage, nicht der konkrete Property-Name.

### 2.3 Abgrenzung

Diese Ebene beweist ausschließlich, dass die **Datenmodell-Transformation**
`content.footer → Datei → content.footer` verlustfrei ist (inklusive der in
`fusszeile-bearbeiten-code.md` benannten Bugfixes). Sie beweist **nicht**:

- dass der Toolbar-Button überhaupt existiert und per Klick bedienbar ist (Req §10
  Punkt 1),
- dass Tippen/Formatieren im Fußzeilenbereich über echte Tastatur-/Maus-Interaktion
  funktioniert (Req §10 Punkt 2),
- dass der Fokuswechsel-Grenzfall (Req §7.7) bei zwei echten `EditorView`-Instanzen im
  Browser tatsächlich fehlerfrei ist (die Unit-Test-Ebene kennt nur eine
  `WordDocumentContent`-Transformation, keine zwei DOM-gebundenen Editor-Instanzen),
- dass die tatsächlich heruntergeladene Datei (Download-Pfad in
  `DocumentWorkspace.tsx`) exakt dem entspricht, was `writer.ts` isoliert erzeugt.

Req §10 gilt daher für die Punkte 1, 2, 3, 6, 8 erst nach Abschluss von Teil B als
erfüllt — Teil A ist notwendige, aber nicht hinreichende Bedingung.

---

## 3. Teil B — Echte Playwright-Browser-Tests

### 3.1 Neue Spezifikationsdateien

| Datei | Deckt ab |
|---|---|
| `tests/e2e/footer.spec.ts` (**neu**) | Kernfunktionalität: Aktivieren, Tippen, Formatieren, Fokuswechsel-Regression, Seitenzahl-Feld + XML-Inspektion, Export/Re-Import, Deaktivieren mit Bestätigungsdialog + Undo. Deckt Req §10 Punkt 1, 2, 3, 6, 8 sowie Grenzfälle 2/6/7/8 vollständig. |
| `tests/e2e/footer-multipage.spec.ts` (**neu**) | Mehrseitiges Dokument: Fußzeile auf jeder sichtbaren Seite, Klick auf ein Band einer Nicht-Erst-Seite, Klon-Synchronität. Deckt Req §7 Grenzfall 3/4/5 und Code §2.2 vollständig — bewusst getrennt von `footer.spec.ts`, da abhängig vom (aufwendiger zu erzeugenden) mehrseitigen Zustand. |
| `tests/e2e/footer-fixtures.spec.ts` (**neu**) | „Upload unverändert" mit **echten** Fremddateien aus Req §8.2 — pro Datei: echter Upload → echter Export (unverändert) → echter Re-Import → Fußzeilentext im DOM identisch. Deckt Req §8.2 vollständig auf E2E-Ebene (ergänzt U-F16/17, die dieselbe Aussage nur auf Datenmodell-Ebene treffen). |
| `tests/e2e/footer-variant-notice.spec.ts` (**neu**) | Req §9 Deklarationspflicht: sichtbarer Hinweisbanner bei „erste Seite anders"/gerade-ungerade, disabled-Button-Muster für „Seitenzahl einfügen" außerhalb der Fußzeile. Deckt Req §10 Punkt 7. |

Bestehende Dateien (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
`selection-regression.spec.ts`) bleiben unverändert; keine Duplizierung.

### 3.2 Testfall-Tabelle: `footer.spec.ts`

| ID | Bezug | Format | Schritte (reale Aktionen) | Erwartung / Verifikation |
|---|---|---|---|---|
| E-F1 | Req §3.1, §2 Zeile 1 | DOCX | Neues Dokument → `footerToggle(page)` prüfen: `aria-pressed="false"` initial. | Kein Fußzeilenbereich sichtbar (`footerBands(page)` hat 0 Elemente). |
| E-F2 | Req §3.2, §2 Zeile 1/2 | DOCX | `footerToggle(page).click()`. | `aria-pressed="true"`; genau 1 `[data-footer-band]`-Element sichtbar am unteren Seitenrand; Fokus ist **sofort** im Fußzeilenbereich (`page.keyboard.type('X')` **ohne** vorherigen zusätzlichen Klick → `X` erscheint im Footer, nicht im Body). |
| E-F3 | Req §4 (Zeichenformatierung), Code §3.16 | DOCX | Im Footer (aus E-F2 weiterlaufend) Text tippen → `ControlOrMeta+a` → `page.getByTitle('Fett').click()`. | Text im Footer ist `<strong>`-formatiert (`expect(activeFooterBand(page).locator('strong')).toBeVisible()`); Body bleibt **unformatiert und leer**. |
| E-F4 | Req §4 (Absatzformatierung: zentriert), Code §3.16 | DOCX | Ausrichtung „zentriert" im Footer anwenden. | `text-align: center` am Footer-Absatz; Body-Ausrichtung unverändert. |
| E-F5 | Req §4 (Listen), Code §4 | DOCX | Im Footer eine Aufzählungsliste einfügen, 2 Einträge tippen. | Liste erscheint im Footer-DOM (`ul li`-Locator, Anzahl 2); kein Absturz. |
| E-F6 | Req §4 (Tabelle+Bild), Req §8.1.4 | DOCX | Im Footer: Tabelle einfügen (2×2), eine Zelle mit Text füllen; Bild einfügen (`setInputFiles` auf dem Bild-Datei-Input, falls vorhanden, sonst Clipboard-/Drag-Simulation gemäß bestehendem Bild-Einfügen-E2E-Muster). | Tabelle + Bild sichtbar im Footer-DOM; Export (siehe E-F10) enthält beide Strukturen im `footer1.xml`. |
| E-F7 | Req §7 Grenzfall 7, Req §10 Punkt 6 (**Pflicht-Regressionstest**) | DOCX | Text „FooterText" im Footer tippen → in den Haupttext klicken (`page.locator('.ProseMirror').first().click()` bzw. expliziter Body-Locator, falls Footer/Body beide `.ProseMirror` rendern — dann über strukturelles Elternelement disambiguieren, siehe Hinweis unten) → weiter tippen „BodyText". | Footer enthält **exakt** „FooterText" (kein zusätzliches „BodyText"); Body enthält **exakt** „BodyText" (kein „FooterText"); `areaStatus(page)` (falls implementiert) zeigt „Bearbeite: Haupttext" nach dem Klick. Wiederholung des Zyklus 3× (Footer→Body→Footer→Body) als Stresstest, analog zum bestehenden Muster in `selection-regression.spec.ts`. |
| E-F8 | Req §5, Req §10 Punkt 3 | DOCX | Cursor im Footer positionieren → `pageNumberButton(page)` ist **enabled** (vorher, bei Body-Fokus: `toBeDisabled()`) → klicken. | `.page-number-field`-Element erscheint an der Cursor-Position im Footer-DOM; Markieren+Entf entfernt das Feld als atomare Einheit (umgebender Text bleibt). |
| E-F9 | Req §5, Req §10 Punkt 3 (**XML-Inspektion, kein Sichttest**) | DOCX | Weiterlaufend von E-F8: `page.getByRole('button', { name: 'Exportieren' }).click()` → `download`-Event abwarten → Datei von Disk lesen → `JSZip.loadAsync`. | `word/_rels/document.xml.rels` bzw. `word/footer1.xml` (je nachdem, in welchem Teil der Fokus lag) enthält **`w:fldChar w:fldCharType="begin"`** gefolgt von `w:instrText` mit `PAGE` und `w:fldCharType="separate"`/`"end"` — **nicht** nur eine hartkodierte Ziffer ohne Feld-Markup. Zusätzliche Negativ-Assertion: `documentXml`/`footerXml` enthält **keine** einzelne `<w:t>1</w:t>` ohne umgebendes `fldChar`-Konstrukt als einzigen Beleg für die Seitenzahl. |
| E-F10 | Req §8.1.1, Req §10 Punkt 8 | DOCX | Footer mit Text + Formatierung + Tabelle + Bild + Seitenzahl-Feld (kombiniert aus E-F3–E-F8) → Export → Download-Datei lesen → `word/footer1.xml` (oder äquivalent benannter Teil) extrahieren. | Enthält Text, `<w:b/>`, Tabellen-XML, Bild-Relationship (`word/_rels/footer1.xml.rels`), Feld-XML — alles in einem Export-Durchlauf, nicht nur isoliert je Merkmal. |
| E-F11 | Req §8.1.1/§10 Punkt 4 | DOCX | Export-Datei aus E-F10 **erneut hochladen** (`setInputFiles` mit dem gerade heruntergeladenen Buffer). | Footer-Text weiterhin sichtbar im DOM; `footerToggle(page)` weiterhin `aria-pressed="true"`; Seitenzahl-Feld weiterhin als `.page-number-field` erkennbar (nicht als literale Zahl „degradiert"). |
| E-F12 | Req §8.1.2 | ODT | E-F2/E-F3/E-F9/E-F11 sinngemäß wiederholt für die ODT-Karte (`odtCard`) → Export → `content.xml`/`styles.xml` enthält `<text:page-number text:select-page="current">`. | Analoge Assertions wie DOCX-Fall, ODT-spezifisches XML. |
| E-F13 | Req §8.1.6/§8.1.7 (Cross-Format) | DOCX→ODT bzw. ODT→DOCX | Fußzeile in DOCX-Karte erstellen und befüllen → **kein** direkter Export-Test hier (App exportiert nur im eigenen Format je Karte, sofern `speichern-unter-format` nicht existiert) → stattdessen: heruntergeladene DOCX-Datei erneut in die **ODT-Karte** hochladen ist **nicht** der vorgesehene Nutzerpfad laut aktueller App-Struktur — **Klärungsbedarf, siehe Abschnitt 6 Punkt 1.** Bis zur Klärung: dieser Testfall wird über Teil A (U-F14) abgedeckt; hier nur ein `test.skip(...)`-Platzhalter mit Verweis auf U-F14 und die offene Frage. | — |
| E-F14 | Req §3 Punkt 5, §7 Grenzfall 2 | DOCX | Footer mit Text befüllt → `footerToggle(page).click()` → `page.on('dialog', d => { expect(d.message()).toMatch(/Fußzeile.*Inhalt|entfernen/i); d.dismiss() })`. | Nach `dismiss()`: `aria-pressed` bleibt `"true"`, Footer-Inhalt unverändert (Abbrechen ändert nichts). |
| E-F15 | Req §3 Punkt 5, Req §10 Punkt 6 | DOCX | Weiterlaufend von E-F14: `footerToggle(page).click()` erneut → Dialog diesmal per `d.accept()` bestätigen. | `aria-pressed="false"`, `footerBands(page)` hat 0 Elemente (Bereich verschwindet). |
| E-F16 | Req §7 Grenzfall 6 (**Pflicht**) | DOCX | Unmittelbar nach E-F15: `page.keyboard.press('ControlOrMeta+z')` (Fokus liegt auf dem Toggle-Button, nicht in einer der beiden `EditorView`s). | Footer-Inhalt (Text + Formatierung von vorher) kehrt zurück; `aria-pressed` wieder `"true"`. |
| E-F17 | Req §2 Zeile 7 (nice-to-have) | DOCX | Fokus abwechselnd in Body/Footer setzen. | **Falls implementiert:** `areaStatus(page)` zeigt korrekt „Bearbeite: Haupttext"/„Bearbeite: Fußzeile". **Falls nicht implementiert:** Testfall wird als `test.skip` mit Kommentar „nice-to-have, laut Req §2 Zeile 7 nicht blockierend, Status: nicht umgesetzt" dokumentiert — kein stiller Fehlschlag, siehe Req §2 letzte Spalte. |
| E-F18 | Req §7 Grenzfall 11 | DOCX | `NoHeadFoot.docx`-analoges Szenario: Datei mit Kopfzeile, aber ohne Fußzeile importieren (Fixture `Headers.docx`/`ThreeColHead.docx`, sofern im Kopfzeilen-Feature bereits mit Import-Fähigkeit versehen; sonst per selbst erzeugtem Dokument mit `header` befüllt/`footer: null` nachgestellt) → Fußzeile aktivieren und befüllen → Export. | Kopfzeileninhalt bleibt im Export unverändert (String-Vergleich vor/nach im heruntergeladenen `header1.xml`), Fußzeile zusätzlich vorhanden. |

**Hinweis zu E-F7 (Locator-Disambiguierung):** Sowohl Body als auch Footer rendern
vermutlich `.ProseMirror` als Klassenname (gemeinsame Editor-Kern-Komponente). Die
Testdatei muss daher **vor** der Implementierung von `WordEditor.tsx` (Code §3.14) mit
den tatsächlich vergebenen Unterscheidungsmerkmalen abgeglichen werden — Vorschlag:
`page.locator('.editor-body .ProseMirror')` vs. `page.locator('[data-footer-band] .ProseMirror')`
oder ein analoges `data-area="body"/"footer"`-Attribut auf dem jeweiligen Wrapper. Dieser
Abgleich ist **Teil der Testimplementierung**, kein Blocker für diesen Plan, aber
explizit hier vermerkt, damit er nicht vergessen wird.

### 3.3 Testfall-Tabelle: `footer-multipage.spec.ts`

| ID | Bezug | Schritte | Erwartung |
|---|---|---|---|
| E-M1 | Req §7 Grenzfall 3, Code §2.2 | Neues Dokument → Footer aktivieren, Text „PageFoot" eingeben → in den Body wechseln → sehr viel Text eingeben (z. B. `page.keyboard.type('Zeile.\n'.repeat(200))` oder eine Testhilfsfunktion, die einen langen Absatz per `insertText`-artiger Aktion einfügt), bis `footerBands(page)` mehr als 1 Element zurückgibt. | `footerBands(page)` liefert **> 1** Elemente; **jedes** enthält den Text „PageFoot" (Klon-Synchronität, Req §7 Grenzfall 3/4). |
| E-M2 | Req §7 Grenzfall 4 | Weiterlaufend von E-M1: manuellen Seitenumbruch einfügen (**nur falls** `seitenumbruch`-Feature zum Testzeitpunkt bereits existiert — sonst `test.skip` mit Verweis auf `seitenumbruch-req.md`, analog zu Code §5 Zeile 4/12). | Footer erscheint unverändert auf beiden durch den Umbruch entstehenden Seiten. |
| E-M3 | Req §7 Grenzfall 5 | Footer mit mehrzeiligem Text/Tabelle befüllen, bis der Inhalt die minimale Bandhöhe (`FOOTER_BAND_MIN_HEIGHT_PX`) überschreitet. | Band wächst sichtbar mit (`getBoundingClientRect().height` des Bandes > `FOOTER_BAND_MIN_HEIGHT_PX`); **kein** abgeschnittener Inhalt (`overflow` des Bandes ist nicht `hidden`, per `getComputedStyle`-Check); optische Überlappung mit der nächsten Seite ist laut Code §2.1 eine **dokumentierte** Einschränkung, kein Testfehlschlag, solange kein Inhalt verschwindet (Text bleibt über `toContainText` auffindbar). |
| E-M4 | Req §7 Grenzfall 3 (Klick auf Nicht-Erst-Seiten-Band), Code §2.2.4 | Weiterlaufend von E-M1: `footerBands(page).nth(1).click({ position: { x: 10, y: 5 } })` → `page.keyboard.type('Eingefügt')`. | Text erscheint im (einzigen) Footer-Inhalt, sichtbar auf **allen** Bändern (Klon-Sync); kein Crash; **entweder** Text erscheint an der exakt geklickten Stelle **oder** am Ende des Footer-Inhalts (dokumentierter Fallback laut Code §2.2.4) — Testfall assertiert auf **eines** der beiden konsistenten Ergebnisse, nicht auf „irgendein Verhalten". |
| E-M5 | Req §10 Punkt 6 (dieser spezifische Regressionstest) | Wiederholung von E-F7 (Fokuswechsel-Regression) **im mehrseitigen Zustand**: Footer-Band 2 fokussieren, tippen → Body fokussieren, tippen. | Beide Bereiche behalten exakt ihren Inhalt (kein Übergriff), analog E-F7, jetzt zusätzlich mit Reparenting-Mechanismus (Code §2.2.2) aktiv. |

### 3.4 Testfall-Tabelle: `footer-fixtures.spec.ts` (Req §8.2, echte Fremddateien)

Für **jede** Datei aus der folgenden Tabelle (identisch zu Req §8.2): Datei aus
`tests/fixtures/external/{docx,odt}/` per `fs.readFile` einlesen, per
`setInputFiles({ name, mimeType, buffer })` auf der passenden Format-Karte hochladen,
sichtbaren Fußzeilentext im DOM notieren, ohne Änderung exportieren
(`page.getByRole('button', { name: 'Exportieren' }).click()`), heruntergeladene Datei
erneut hochladen, Fußzeilentext erneut notieren, vergleichen.

| ID | Datei | Format | Besonderheit laut Req §8.2 | Zusätzliche Prüfung |
|---|---|---|---|---|
| E-X1 | `headerFooter.docx` | DOCX | Basisfall Kopf+Fuß; **hat laut Code §1.7 drei Varianten** (`even`/`default`/`first`) | Sichtbarer Footer-Text entspricht der `default`-Variante (nicht `even`) — expliziter Textvergleich gegen den **vorher per Unit-Test (U-F4) bekannten** `default`-Inhalt; Variant-Hinweisbanner sichtbar (siehe `footer-variant-notice.spec.ts`). |
| E-X2 | `HeaderFooterUnicode.docx` | DOCX | Sonderzeichen/Unicode in der Fußzeile | Unicode-Zeichen (Emoji/Umlaute/kyrillisch, je nach Fixture-Inhalt) im DOM **byteidentisch** nach Rundreise (`toBe`, nicht `toMatch`). |
| E-X3 | `FancyFoot.docx` | DOCX | Formatierte Fußzeile | Formatierung (fett/Farbe/Ausrichtung, je nach Fixture) bleibt nach Rundreise im DOM erkennbar (`strong`/`style`-Attribut-Check). |
| E-X4 | `ThreeColFoot.docx` | DOCX | Mehrspaltiges Layout | Text aus allen drei „Spalten" (App stellt sie ggf. vereinfacht dar) bleibt vollständig auffindbar, kein Textverlust. |
| E-X5 | `ThreeColHeadFoot.docx` | DOCX | Mehrspaltig, Kopf+Fuß kombiniert | Wie E-X4, zusätzlich Kopfzeile bleibt unverändert (Req Grenzfall 11-Analogon). |
| E-X6 | `SimpleHeadThreeColFoot.docx` | DOCX | Mehrspaltig | Wie E-X4. |
| E-X7 | `EmptyDocumentWithHeaderFooter.docx` | DOCX | Leeres Dokument, aktive Fußzeile | `footerToggle(page)` ist `aria-pressed="true"` direkt nach Import (Req §3 Punkt 3); Body-Editor ist leer, aber Editor öffnet ohne Fehler. |
| E-X8 | `NoHeadFoot.docx` | DOCX | Negativfall | `footerToggle(page)` ist `aria-pressed="false"` nach Import **und** bleibt es nach unverändertem Export/Reimport. |
| E-X9 | `DiffFirstPageHeadFoot.docx` | DOCX | „Erste Seite anders" | Mind. eine Variante sichtbar/editierbar (kein leerer Footer trotz vorhandenem Original-Inhalt); Hinweisbanner sichtbar; nach Export/Reimport bleibt der Text der **angezeigten** Variante erhalten (kein Totalverlust, auch wenn die andere Variante beim Export vereinheitlicht/verworfen wird — das ist laut Req §9 dokumentiert zulässig). |
| E-X10 | `PageSpecificHeadFoot.docx` | DOCX | „Erste Seite anders"/seitenspezifisch | Wie E-X9. |
| E-X11 | `HeaderFooter.odt` | ODT | Basisfall ODT | Analog E-X1 (ohne Mehrvarianten-Sonderfall, sofern diese Datei nur eine Master-Page hat — bei Import verifizieren). |
| E-X12 | `headfoot.odt` | ODT | Basisfall ODT | Analog. |
| E-X13 | `headerFinal.odt` | ODT | Basisfall ODT | Analog. |
| E-X14 | `headerFirstPage.odt` | ODT | Erste-Seite-Variante | Analog E-X9, Hinweisbanner sichtbar. |
| E-X15 | `HeaderFirstPageEnabled_MSO15.odt` | ODT | Erste-Seite-Variante | Analog. |
| E-X16 | `HeaderFirstPageDisabled_MSO15.odt` | ODT | Erste-Seite-Variante (deaktiviert) | Verhalten wie Basisfall, da laut Dateiname deaktiviert — verifizieren, dass **kein** unnötiger Hinweisbanner erscheint, falls die Datei tatsächlich nur eine effektive Master-Page hat. |
| E-X17 | `HeaderFirstAndEvenPageEnabled_MSO15.odt` | ODT | Erste-Seite **und** gerade/ungerade kombiniert | Analog E-X9, zusätzlich: geladene Variante entspricht der in U-F12 verifizierten „Kettenziel"-Master-Page (regressionsgesichert gegen Code §1.8). |
| E-X18 | `HeaderFirstAndEvenPageEnabledAndMarging_MSO15.odt` | ODT | Wie E-X17, zusätzlich abweichende Ränder | Wie E-X17; Rand-Abweichung selbst ist **nicht** Gegenstand dieses Features (nur Fußzeileninhalt), daher keine zusätzliche Assertion zu Rändern nötig. |
| E-X19 | `tabellen_header_DOC_LO4-1-0.odt` | ODT | Tabelle im Kopf-/Fußbereich | Tabellenstruktur (Zeilen/Spalten-Anzahl) bleibt nach Rundreise erhalten, sofern die Tabelle tatsächlich im **Fuß**-Teil liegt (bei Import verifizieren — laut Dateiname evtl. nur im Kopf, dann als Kopfzeilen-Äquivalent im Schwester-Feature zu prüfen, hier nur informativ mitlaufen lassen). |

**Cross-Format-Ergänzung (Req §8.2 Testfall 2):** Für E-X1 (`headerFooter.docx`) und
E-X11 (`HeaderFooter.odt`) zusätzlich je ein Testfall mit Cross-Format-Export (DOCX-Karte
kann nur DOCX exportieren — dieselbe Einschränkung wie E-F13 oben; **bis zur Klärung der
offenen Frage in Abschnitt 6 Punkt 1 werden diese zwei Zeilen ausschließlich über Teil A
(U-F18) abgedeckt**, hier nur als `test.skip(...)`-Platzhalter mit Verweis).

**Bild-in-Fußzeile-Sonderfall (Req §8.2 Testfall 3):** Laut Code §1.10 enthält
**keine** der real vorhandenen Fixtures tatsächlich ein Bild im Footer-Teil (nur
`headerPic.docx`, und dort im Header). Dieser Plan übernimmt die in Code §1.10
dokumentierte Konsequenz: Testfall „Bild in Fußzeile bleibt bei Rundreise zugeordnet"
wird **ausschließlich** über E-F6/E-F10 (selbst erzeugtes Dokument) abgedeckt, **nicht**
über eine externe Fixture — das ist keine Testlücke, sondern durch das vorhandene
Testmaterial vorgegeben und hier bewusst dokumentiert (kein stiller Fehlschlag).

### 3.5 Testfall-Tabelle: `footer-variant-notice.spec.ts` (Req §9 Deklarationspflicht)

| ID | Bezug | Schritte | Erwartung |
|---|---|---|---|
| E-N1 | Req §9 „Erste Seite anders" | `DiffFirstPageHeadFoot.docx` importieren. | Sichtbarer Hinweisbanner mit Text, der auf „mehrere Fußzeilen-Varianten"/„erste Seite anders" hinweist (`page.getByText(/erste Seite anders|mehrere.*Varianten/i)`); Banner per „×"-Button schließbar; nach Schließen bleibt der Editor-Inhalt unverändert. |
| E-N2 | Req §9 gerade/ungerade | `HeaderFirstAndEvenPageEnabled_MSO15.odt` importieren. | Analoger Banner sichtbar. |
| E-N3 | Req §9 „mehrere Abschnitte" | Synthetische oder reale Mehrabschnitts-DOCX-Datei (falls im Repo vorhanden; sonst als `test.skip` mit Kommentar „keine passende reale Fixture identifiziert, Nachweis nur auf Unit-Ebene" — siehe Code §3.6b) importieren. | Nur der **erste** Abschnitt wird berücksichtigt (deterministisch, nicht mehr zufällig „letzter"); Hinweisbanner erscheint, falls mehr als ein `sectPr` gefunden wurde. |
| E-N4 | Req §2 Zeile 5, Req §10 Punkt 7 | Cursor im **Haupttext** (nicht Footer) belassen, `pageNumberButton(page)` prüfen. | Button ist `toBeDisabled()`; `title`/`aria-label` erklärt, warum („Erst in die Fußzeile klicken…"); Klick auf einen `disabled`-Button hat **keine** Wirkung (kein `.page-number-field` erscheint versehentlich im Body — Negativ-Assertion). |

---

## 4. Testdaten-Inventar

| Bedarf | Quelle |
|---|---|
| Basis-Rundreise, selbst erzeugt (Req §8.1) | Direkt im Browser über Toggle+Tippen erzeugt (`footer.spec.ts`), kein Fixture-File nötig. |
| Reale Fremddateien mit Fußzeile (Req §8.2) | Bereits vorhanden unter `tests/fixtures/external/docx/` (10 Dateien) und `tests/fixtures/external/odt/` (9 Dateien) — vollständig in Abschnitt 3.4 aufgeführt, Existenz aller Dateien für diesen Plan geprüft. |
| Feld-Erkennungs-Regressionsfixtures (`w:fldSimple`/`w:fldChar`, `text:page-number`/`text:page-count`) | Synthetisch in Unit-Tests gebaut (U-F3, U-F11) — kein Bedarf an zusätzlichen Repo-Dateien, da beide Feldformen bereits als roher XML-String im Test konstruierbar sind (Muster: `buildSampleDocx()` in `tests/e2e/docx.spec.ts`). |
| Bild-Rels-Scoping-Regressionsfixture | Synthetisch in Unit-Test gebaut (U-F5/U-F6) — kein externes Fixture mit Bild im Footer verfügbar (siehe 3.4 Bild-Sonderfall). |
| Mehrseitiges Dokument (für `footer-multipage.spec.ts`) | Programmatisch durch sehr viel eingetippten/eingefügten Text erzeugt — kein Fixture-File, Schwellenwert experimentell ermitteln und als Konstante im Test dokumentieren. |
| Mehrabschnitts-DOCX (Req §9 dritter Punkt) | Kein passendes Repo-Fixture identifiziert — entweder synthetisch bauen (zwei `w:sectPr`, je mit eigenem `footerReference`) oder als dokumentierte Lücke (E-N3) belassen. |

---

## 5. Rückverfolgbarkeits-Matrix (jede Anforderung → mind. ein Test)

| Anforderungsdatei-Abschnitt | Test-ID(s) |
|---|---|
| §2 Zeile 1 (Toggle-Button, `aria-pressed`) | E-F1, E-F2 |
| §2 Zeile 2 (Editierbereich, optische Absetzung) | E-F2, E-M1 |
| §2 Zeile 3 (Fokus-Übergang) | E-F7, E-M5 |
| §2 Zeile 4 (Toolbar kontextsensitiv) | E-F3, E-F4, E-F5 |
| §2 Zeile 5 („Seitenzahl einfügen", disabled außerhalb Footer) | E-F8, E-N4 |
| §2 Zeile 6 (Deaktivieren + Bestätigung) | E-F14, E-F15 |
| §2 Zeile 7 (Statusanzeige, nice-to-have) | E-F17 |
| §3 Punkt 1/2 (neues Dokument, Toggle inaktiv/aktiv, sofort tippen) | E-F1, E-F2 |
| §3 Punkt 3/4 (Import mit/ohne Fußzeile) | E-X7, E-X8 |
| §3 Punkt 5 (Deaktivieren nach Bestätigung, Zustand wie neu) | E-F14, E-F15 |
| §4 (alle Editierfunktionen: Text, Zeichen-/Absatzformat, Listen, Tabellen, Bilder) | E-F3, E-F4, E-F5, E-F6, U-F8/U-F13 (heading) |
| §4 letzter Absatz (getrennte Undo-Historien) | E-F7 (mittelbar), zusätzlicher expliziter Test empfohlen: Footer tippen → `Ctrl+Z` im Footer bleibt im Footer → Body unverändert (in `footer.spec.ts` als eigener Testfall E-F7b zu ergänzen, siehe Abschnitt 6 Punkt 2) |
| §5 (Seitenzahl-Feld, vollständig) | U-F1, U-F2, U-F3, U-F10, E-F8, E-F9, E-F12 |
| §6 (Seitenlayout-Integration) | E-M1–E-M4, U-F15 |
| §7 Grenzfall 1 (leere aktive Fußzeile) | U-F7 |
| §7 Grenzfall 2 (Bestätigungsdialog, Abbrechen ändert nichts) | E-F14 |
| §7 Grenzfall 3 (mehrseitig, jede Seite) | E-M1 |
| §7 Grenzfall 4 (manueller Seitenumbruch) | E-M2 (bedingt, abhängig von `seitenumbruch`-Feature) |
| §7 Grenzfall 5 (Inhalt größer als Rand, kein Abschneiden) | E-M3 |
| §7 Grenzfall 6 (Undo nach Deaktivieren) | E-F16 |
| §7 Grenzfall 7 (Fokuswechsel-Regression, Pflicht) | E-F7, E-M5 |
| §7 Grenzfall 8 (Überschrift in Fußzeile) | U-F8, U-F13 |
| §7 Grenzfall 9 (Import „erste Seite anders" — nicht ersatzlos verschwinden) | E-X9, E-X10, E-X14–E-X18, U-F4, U-F12 |
| §7 Grenzfall 10 (Cross-Format-Feldverlust nur bei unbekannten Feldtypen) | U-F11 |
| §7 Grenzfall 11 (Fußzeile ändern lässt Kopfzeile unangetastet) | E-F18, E-X5 |
| §7 Grenzfall 12 (Seitenumbruch in Fußzeile nicht einfügbar) | Nicht anwendbar (kein Seitenumbruch-Node vorhanden, siehe Code §5 Zeile 12) — als offener Folgepunkt dokumentiert, kein Test in diesem Plan. |
| §8.1 (Basis-Rundreise, alle 7 Punkte) | U-F1–U-F14, E-F2–E-F13 |
| §8.2 (Upload unverändert, reale Fixtures, alle 3 Testfälle) | E-X1–E-X19, U-F16–U-F18 |
| §9 (Deklarationspflicht, alle 3 Punkte) | E-N1, E-N2, E-N3 |
| §10 Punkt 1 (echter Klick schaltet Bereich) | E-F1, E-F2 |
| §10 Punkt 2 (Editierfunktionen per echter Interaktion) | E-F3–E-F6 |
| §10 Punkt 3 (Seitenzahl-Feld, XML-Inspektion) | E-F9, E-F12 |
| §10 Punkt 4 (§8.1 grün) | siehe Zeile „§8.1" oben |
| §10 Punkt 5 (§8.2 grün) | siehe Zeile „§8.2" oben |
| §10 Punkt 6 (Fokuswechsel-Regressionstest dauerhaft in Suite) | E-F7 (permanent in `footer.spec.ts`) |
| §10 Punkt 7 (kein stiller Fehlschlag bei nicht unterstützten Kombinationen) | E-N1–E-N4 |
| §10 Punkt 8 (E2E deckt vollen Zyklus ab) | `footer.spec.ts` gesamt (E-F1–E-F16) |
| Code §1.5 (leere aktive Fußzeile, Writer bereits korrekt) | U-F7 |
| Code §1.6 (Bild-Rels-Scoping, Reader+Writer) | U-F5, U-F6 |
| Code §1.7 (`w:type`-Präferenz, `headerFooter.docx`) | U-F4, E-X1 |
| Code §1.8 (ODT-Master-Page-Kette) | U-F12, E-X17 |
| Code §2 (FooterBands-Architektur, Reparenting) | E-M1–E-M4 |
| Code §3.1/§9 Spike (`marks: '_'` auf Atom-Node) | U-F2 |
| Code §3.6b (Multi-Section-Fallback) | E-N3 (bedingt) |

---

## 6. Offene Klärungsfragen vor Testimplementierung

1. **Cross-Format-Export-Pfad in der App-UI:** `fusszeile-bearbeiten-code.md` §3.18
   bestätigt, dass `DocumentWorkspace.tsx` unverändert bleibt und jede Format-Karte nur
   ihr eigenes Format exportiert (kein „Speichern unter anderem Format"-Mechanismus
   existiert laut Backlog). Die Cross-Format-Rundreise-Anforderung aus Req §8.1.6/§8.1.7
   und §8.2 Testfall 2 kann daher **nicht** über einen einzigen durchgängigen
   Browser-Workflow (Upload im einen Format → Export im anderen Format → Reimport)
   nachgestellt werden, solange dieser Mechanismus fehlt. Bis zur Klärung, ob
   Cross-Format-Export über einen anderen, bereits vorhandenen App-Pfad möglich ist
   (z. B. Copy-Paste des Inhalts zwischen den beiden Karten, oder ein programmatischer
   Zwischenschritt), wird dieser Teil **nur** über Teil A (U-F14, U-F18) verifiziert, und
   E-F13/die Cross-Format-Zeile in Abschnitt 3.4 bleiben als `test.skip(...)` mit
   Begründungskommentar bestehen — analog zum in `datei-oeffnen-qa.md` §3.5 Punkt 5
   bereits etablierten Muster für denselben strukturellen Fall.
2. **Expliziter Undo-Isolations-Test (§4 letzter Absatz):** Die Rückverfolgbarkeits-Matrix
   verweist auf E-F7 nur „mittelbar" — ein **direkter** Testfall (Footer: Text tippen →
   `Ctrl+Z` im Footer-Fokus → nur Footer-Änderung wird rückgängig gemacht, Body
   unberührt; und umgekehrt) sollte als eigener, benannter Testfall `E-F7b` in
   `footer.spec.ts` ergänzt werden, sobald die genaue Keymap-Bindung aus Code §3.14
   Punkt 5 (der `keydown`-Listener für `pendingFooterRestore`) implementiert ist — er darf
   den regulären `Mod-z` innerhalb einer fokussierten `EditorView` nicht stören. Dieser
   Plan benennt den Bedarf explizit, überlässt die exakte Formulierung aber der
   Implementierungsphase, da das Zusammenspiel der beiden `history()`-Plugins und des
   globalen `keydown`-Guards erst am echten Code beobachtbar ist.
3. **Selektor-Feinabgleich:** Wie in Abschnitt 3.2 („Hinweis zu E-F7") vermerkt, müssen
   alle in diesem Plan vorgeschlagenen Locator (`[data-footer-band]`,
   `aria-label`-Texte, `areaStatus`-Text) beim Schreiben der Tests gegen die tatsächliche
   Implementierung von `WordEditor.tsx`/`Toolbar.tsx`/`FooterBands.tsx` abgeglichen
   werden. Abweichungen sind hier nachzuziehen, nicht stillschweigend im Testcode zu
   „reparieren".

---

## 7. Bekannte Automatisierungsgrenzen (dokumentiert, nicht stillschweigend übersprungen)

1. **Schwellenwert „mehrseitiges Dokument" (E-M1):** Wie viel Text tatsächlich zu
   `pageCount > 1` führt, hängt von `PAGE_CONTENT_HEIGHT_PX` und der Viewport-Höhe ab und
   ist erst am laufenden Code exakt bestimmbar. Der Test ermittelt/dokumentiert den
   praktisch nötigen Textumfang einmalig und hält ihn als benannte Konstante in der
   Testdatei fest (kein Magic-Number-Rätsel für spätere Wartung).
2. **`caretRangeFromPoint`/Klick-zu-Position-Mapping (E-M4):** Laut Code §2.2.4/§9 ist
   das Verhalten bei exotischer DOM-Struktur (verschachtelte Marks) nicht im Voraus
   bewiesen und hat einen dokumentierten Fallback. E-M4 testet bewusst **beide**
   akzeptablen Ausgänge (exakte Position **oder** Fallback ans Ende), nicht nur den
   Idealfall — echte Pixel-genaue Klick-Koordinaten in Playwright sind zudem
   Font-Rendering-abhängig und leicht flaky; bei wiederholtem Flackern dieses konkreten
   Testfalls ist eine Toleranz-Erhöhung (z. B. Klick-Ziel näher am Bandanfang) der erste
   Reparaturschritt, kein Testausschluss.
3. **`window.confirm`-Timing:** Playwright registriert `page.on('dialog', ...)` global
   für die `Page`-Instanz; der Handler muss **vor** der auslösenden Aktion registriert
   werden (nicht danach), sonst blockiert der native Dialog den Testlauf. Alle
   Testfälle mit Bestätigungsdialog (E-F14, E-F15) registrieren den Handler daher
   unmittelbar vor dem jeweiligen `footerToggle(page).click()`.
4. **Bild-Einfüge-Mechanismus in E-F6:** Der exakte UI-Weg zum Einfügen eines Bildes
   (Datei-Dialog vs. Toolbar-Button vs. Drag&Drop) ist in diesem Plan nicht neu
   festgelegt, sondern folgt dem bereits an anderer Stelle etablierten E2E-Muster für
   „Bild einfügen" (`specs/bild-einfuegen-qa.md`, sofern vorhanden) — bei Abweichung dort
   nachschlagen statt hier einen zweiten, konkurrierenden Mechanismus zu erfinden.

---

## 8. Ausführungsplan

1. Unit-Tests: `npm test` (Vitest, `jsdom`) — muss grün sein, bevor Teil B gestartet wird
   (schnelleres Feedback, günstiger Fail-Fast). Reihenfolge innerhalb Teil A:
   Schema-/Reader-/Writer-Regressionstests (U-F1–U-F13) vor den größeren
   Fixture-Sweep-Erweiterungen (U-F16–U-F18), da letztere von den Erst-genannten
   Fixes abhängen.
2. E2E-Tests: `npm run test:e2e` (Playwright, baut automatisch via `webServer`) —
   mindestens Projekt „Desktop Chrome" verbindlich für die Abnahme. Reihenfolge:
   `footer.spec.ts` (Kernfunktionalität) → `footer-fixtures.spec.ts` (reale Dateien,
   höchste Priorität laut Req §8.2) → `footer-multipage.spec.ts` →
   `footer-variant-notice.spec.ts`.
3. Nach jedem Lauf: `playwright-report/` (HTML-Report) als Nachweis archivieren.
4. Offene Klärungsfragen aus Abschnitt 6 vor Beginn der Testimplementierung (nicht erst
   am Ende) mit dem Product Owner/Lead klären, insbesondere Punkt 1
   (Cross-Format-Export-Pfad), da er die Struktur mehrerer Testfälle direkt beeinflusst.

## 9. Exit-Kriterien (Abnahme, siehe Req §10)

Der Status `fusszeile-bearbeiten` darf erst auf „vorhanden und verifiziert" gesetzt
werden, wenn:

1. Alle Unit-Test-Ergänzungen aus Abschnitt 2.2 (U-F1–U-F18) grün sind.
2. Alle E2E-Testfälle aus Abschnitt 3.2–3.5 (E-F1–E-F18, E-M1–E-M5, E-X1–E-X19,
   E-N1–E-N4) grün sind — inklusive 0 protokollierten Konsolenfehlern/unbehandelten
   Exceptions über den jeweils gesamten Testablauf (Import→Bearbeiten→Export→Reimport).
3. Der Pflicht-Regressionstest für den Fokuswechsel-Grenzfall (E-F7) dauerhaft und ohne
   `test.skip` in der Suite vorhanden ist (Req §10 Punkt 6 — kein optionaler Test).
4. Jede Zeile der Rückverfolgbarkeits-Matrix (Abschnitt 5) einen grünen Test-ID-Verweis
   hat — keine Anforderungszeile ohne Test, keine als „nicht anwendbar"/„offen"
   markierte Zeile ohne explizite Begründung (Grenzfall 12, E-F17 nice-to-have, E-F13/
   Cross-Format-Export-Pfad).
5. Für jeden während der Umsetzung gefundenen, in `fusszeile-bearbeiten-code.md` bereits
   benannten Befund (§1.5–§1.8) ein regressionssichernder Test grün ist (U-F4, U-F5,
   U-F6, U-F7, U-F12) — diese fünf gelten als **nicht verhandelbarer** Mindestnachweis,
   da sie reale, am Fixture-Material verifizierte Fehlerquellen abdecken.
6. Die drei offenen Klärungsfragen aus Abschnitt 6 entweder beantwortet und in
   entsprechende zusätzliche grüne Tests überführt, oder als bewusste, hier dokumentierte
   Einschränkung stehen gelassen wurden — kein stillschweigendes Liegenlassen ohne
   Vermerk.
