# QA-Testplan: „Datei öffnen/importieren"

Bezug: `specs/datei-oeffnen-req.md` (Anforderungen, Abschnitte 1–7) und
`specs/datei-oeffnen-code.md` (Befunde/geplante Code-Änderungen, Abschnitte
0–12). Dieser Plan legt fest, **wie** jede Anforderung und jeder in der
Code-Datei benannte Befund nachweislich verifiziert wird — und zwar so, wie
Abschnitt 7 der Anforderungsdatei es verlangt: durch echte, im Browser
ausgeführte Bedienung, nicht nur durch Unit-Tests mit direkt konstruierten
Testdaten.

Status dieses Plans: Entwurf zur Umsetzung. Er beschreibt Soll-Testfälle;
welche davon zum Zeitpunkt der Umsetzung von `datei-oeffnen-code.md` bereits
grün/rot sind, ist beim Ausführen festzuhalten (Abschnitt 9).

---

## 0. Grundprinzip: zwei getrennte, sich ergänzende Testebenen

| Ebene | Zweck | Zählt als Nachweis für Abnahmekriterium §7.1? |
|---|---|---|
| **Unit-Tests** (Vitest, `jsdom`) | Schnelle, deterministische Prüfung der reinen Datenmodell-Transformation `content → writeDocx/writeOdt → readDocx/readOdt → content`. Direkter Aufruf der Funktionen aus `reader.ts`/`writer.ts`. | **Nein, allein nicht ausreichend.** Ergänzt E2E, ersetzt es nicht (Abschnitt 7.1 der Anforderungsdatei ist explizit: „nicht nur Reader/Writer-Unit-Test"). |
| **E2E-Tests** (Playwright, echter Chromium/Firefox/WebKit-Prozess gegen den gebauten `dist`/`preview`-Server) | Reale Nutzer:innen-Interaktion: Klick auf Buttons, Tastatureingabe, Datei-Upload über das echte `<input type="file">`, Abwarten des echten `download`-Events, Byte-für-Byte-Prüfung der tatsächlich heruntergeladenen Datei. | **Ja** — dies ist die in §7.1 geforderte Nachweisebene. |

Eine E2E-Testzeile gilt in diesem Plan nur dann als „echt", wenn sie
mindestens eine der folgenden Aktionen über die echte Playwright-`Page`-API
ausführt (kein direkter Import/Aufruf von `readDocx`/`readOdt`/
`writeDocx`/`writeOdt`/`module.importFile` innerhalb einer `*.spec.ts`-Datei):

- `locator.click()` / `page.keyboard.type()` / `page.keyboard.press()`
- `locator.setInputFiles(...)` auf dem tatsächlichen, im DOM gerenderten
  `<input type="file">` (das ist der von Playwright vorgesehene, offiziell
  unterstützte Weg, einen Datei-Upload ohne OS-Chrom zu simulieren — er
  löst das echte `onChange` des echten Elements aus und durchläuft die
  komplette echte `handleFile`-Pipeline inkl. `FileReader`/`JSZip`)
- `page.waitForEvent('download')` gefolgt vom Einlesen der **tatsächlich auf
  Disk geschriebenen** heruntergeladenen Datei (`download.path()` +
  `fs.readFile`), nicht nur Prüfung, dass „irgendein Download" stattfand
- `page.waitForEvent('filechooser')` für Tastatur-/Fokus-Fälle

---

## 1. Vorbedingungen für alle E2E-Spezifikationsdateien

1. `playwright.config.ts` bereits vorhanden und wiederverwendbar: `baseURL:
   'http://localhost:4173/salamanido/'`, `webServer` baut automatisch
   (`npm run build && npm run preview`). Neue Spec-Dateien brauchen keine
   Config-Änderung, außer ggf. höhere `test.setTimeout(...)` für den
   Großdatei-Test (Abschnitt 5).
2. Jede Testdatei beginnt mit demselben `beforeEach` wie die bestehenden
   Specs (`tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`):
   ```ts
   test.beforeEach(async ({ page }) => {
     await page.goto('/')
     await page.getByRole('button', { name: /verstanden/i }).click() // Privacy-Banner wegklicken
   })
   ```
3. Card-Locator-Helfer wiederverwenden/analog anlegen:
   ```ts
   const docxCard = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
   const odtCard  = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
   ```
4. In **jeder** neuen Spec-Datei global Konsolen-/Seitenfehler mitschneiden
   (Nachweis für §2.2.4 und §6 Kriterium 8 „kein Absturz"):
   ```ts
   test.beforeEach(async ({ page }) => {
     const errors: string[] = []
     page.on('pageerror', (e) => errors.push(String(e)))
     page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
     // am Ende jedes Tests: expect(errors, errors.join('\n')).toEqual([])
   })
   ```
   Am saubersten als kleiner Test-Fixture-Wrapper (`tests/e2e/fixtures.ts`,
   neu) statt Copy&Paste in vier Dateien.
5. Kein-Netzwerk-Nachweis (§2.1.4) einmal zentral, nicht pro Testfall:
   ```ts
   const requests: string[] = []
   page.on('request', (r) => requests.push(r.url()))
   // nach dem Upload:
   expect(requests.filter((u) => !u.startsWith(page.url()) && !u.includes('localhost:4173'))).toEqual([])
   ```

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Ist-Zustand (bereits vorhanden, wiederverwenden)

| Datei | Deckt ab |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | Überschriften-Ebenen, Absatzausrichtung, Zeichenformatierung (fett/kursiv/unterstrichen/durchgestrichen, kombiniert) — direkter `writeDocx`→`readDocx`-Zyklus auf handgebauten `WordDocumentContent`-Objekten. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analog für ODT. |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Import aller `tests/fixtures/external/docx/*.docx` (≥ 18 reale Fremddateien), bislang nur „stürzt nicht ab". |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Analog für `tests/fixtures/external/odt/*.odt` (≥ 50 reale Fremddateien), bislang nur „stürzt nicht ab" bzw. „wirft erwarteten Fehler" für `KNOWN_INVALID`. |

### 2.2 Geplante Ergänzungen

| # | Datei | Ergänzung | Bezug |
|---|---|---|---|
| U-1 | `roundtrip.test.ts` (DOCX + ODT) | Neue `describe`-Blöcke: **Listen** (Bullet + nummeriert, mind. 2 Verschachtelungsebenen), **Tabellen** (Zeilen/Spalten-Anzahl sowie `rowspan`/`colspan` bei verbundenen Zellen), **Bilder** (Anzahl, Reihenfolge im `content`-Array, `attrs.src`-Byte-Identität vorher/nachher), **Metadaten** (`meta.title` bleibt erhalten), **`unsupported_block`** (Inhalt bleibt nach Schreiben→Lesen als normaler Absatz erhalten, sobald der Node existiert — siehe `datei-oeffnen-code.md` §7). |
| U-2 | `roundtrip.test.ts` (DOCX + ODT) | Negativfall: Bild mit `attrs.src` = externe `http(s)://`-URL (kein `data:`-URI) → `writeDocx`/`writeOdt` wirft eine lesbare Exception, kein stiller Datenverlust (siehe `datei-oeffnen-code.md` §10.1 — hier nur als **dokumentierter, absichtlich fehlschlagender** Testfall, kein Bugfix-Auftrag). |
| U-3 | `docx/__tests__/external-fixtures.test.ts` | Für `FieldCodes.docx` und `FldSimple.docx`: zusätzlich zu „stürzt nicht ab" prüfen, dass `doc.body` den erwarteten Cache-Text enthält (nicht leer bzw. nicht nur der umgebende Absatz ohne Inhalt). Für `WithTabs.docx`/`bookmarks.docx`: Text bleibt vorhanden. |
| U-4 | `odt/__tests__/external-fixtures.test.ts` | Für `Hyperlink-AOO401.odt`, `hyperlink.odt`, `hyperlink_destination.odt`: Linktext muss in `doc.body` vorkommen. Für `FrameWithTable.odt`, `frame.odt`, `table-within-textBox-within-frame.odt`: Text im Rahmen/Textfeld muss vorkommen (nicht nur ein leerer `image`-Node). |
| U-5 | `src/formats/odt/__tests__/reader.test.ts` (**neu**) | Handgebautes `content.xml` mit `<text:placeholder>`, `<text:date>`, `<text:page-number>` → Assertion, dass der umgebende Lauftext trotzdem sichtbar bleibt. |
| U-6 | `src/formats/docx/__tests__/reader.test.ts` (**neu**, falls noch nicht vorhanden — prüfen) | Handgebautes `document.xml` mit `<w:hyperlink>`, `<w:ins>`, `<w:sdt>/<w:sdtContent>`, `<w:fldSimple>` → Linktext/Content-Control-Text/Feld-Cache-Text bleibt erhalten; `<w:del>` → gelöschter Text bleibt **nicht** sichtbar. |
| U-7 | `src/app/__tests__/App.test.tsx` bzw. `src/App.test.tsx` (prüfen, welche Datei existiert) | Fake-Modul, dessen `editor`-Komponente beim Mounten wirft → nach dem Absturz ist wieder der `FormatPicker` mit Fehlermeldung sichtbar, `render()` selbst wirft keine unbehandelte Exception (Nachweis für `EditorErrorBoundary`, `datei-oeffnen-code.md` §1). |
| U-8 | `src/formats/shared/__tests__/validateDocument.test.ts` (**neu**) | `assertLoadableDocument` wirft eine lesbare deutsche Fehlermeldung bei schema-inkompatiblem Content (z. B. `text`-Node direkt in `table_cell` ohne `paragraph`-Hülle); lässt valide Inhalte unverändert durch. |

### 2.3 Abgrenzung

Diese Ebene beweist ausschließlich, dass die **Datenmodell-Transformation**
verlustfrei ist. Sie beweist **nicht**, dass ein Klick auf „Datei
hochladen" im echten Browser tatsächlich zu genau diesem Ergebnis führt
(dafür Teil B), und **nicht**, dass die heruntergeladene Datei tatsächlich
diesen Inhalt hat (der Download-Pfad in `DocumentWorkspace.tsx` liegt
außerhalb von `writer.ts`). Abnahmekriterium §7.1 gilt daher erst nach Teil B
als erfüllt.

---

## 3. Teil B — Echte Playwright-Browser-Tests

### 3.1 Neue Spezifikationsdateien

| Datei | Deckt ab |
|---|---|
| `tests/e2e/file-open-edge-cases.spec.ts` (**neu**) | §3.1–3.12, §3.15–3.17, §5.1–5.4 der Anforderungsdatei (formatunabhängige Bedienlogik + Fehlerpfade), parametrisiert über beide Format-Karten wo zutreffend. |
| `tests/e2e/complex-import-fidelity.spec.ts` (**neu**) | §3.13 (Textbox, Feld, Platzhalter, mehrspaltig, OLE/Diagramm) und §3.14 (verschachtelte Tabelle) — je Fall mind. 1 DOCX- und 1 ODT-Fixture. |
| `tests/e2e/large-document-import.spec.ts` (**neu**) | §2.1.6 (Ladezeit < 3 s Richtwert) und §3.6 (große Datei, kein Tab-Freeze) — löst den in `datei-oeffnen-code.md` §8.1 benannten Beleg-Fehlbestand (referenzierte, nicht existierende Datei) ein. |
| `tests/e2e/roundtrip-fidelity.spec.ts` (**neu**) | §6 komplett — alle 8 Kriterien, DOCX→DOCX und ODT→ODT, mit realistischer Testdatei je Format. |

Bestehende Dateien `tests/e2e/docx.spec.ts`/`odt.spec.ts` bleiben wie sie
sind (decken bereits §2.1.1–2.1.5 im Erfolgsfall ab); nicht duplizieren.

### 3.2 Testfall-Tabelle: `file-open-edge-cases.spec.ts`

Format-Spalte „beide" bedeutet: als `test.each` bzw. zwei separate
`test(...)`-Blöcke für DOCX-Karte und ODT-Karte, mit demselben Skript.

| ID | Bezug | Format | Schritte (reale Aktionen) | Erwartung / Verifikation |
|---|---|---|---|---|
| E-3.1 | §3.1 | beide | `setInputFiles` mit Buffer `Buffer.from('nur Text, kein Zip')`, Dateiname `datei.docx`/`datei.odt` | Fehler-Banner (`page.getByRole('alert')`) sichtbar, enthält Dateinamen + Format-Label; **kein** Editor (`.ProseMirror` nicht vorhanden); 0 Konsolenfehler. |
| E-3.2 | §3.2 | beide | Leeres, aber valides Zip (`new JSZip()` ohne `word/document.xml` bzw. `content.xml`) hochladen | Fehlerbanner mit Text „…fehlt — keine gültige DOCX/ODT-Datei." (exakten Wortlaut aus `reader.ts` per `toContainText`/Regex prüfen, nicht nur „irgendein Fehler"). |
| E-3.3 | §3.3 | DOCX | Gültige, mit `buildSampleDocx()` erzeugte DOCX-Bytes, aber `setInputFiles({ name: 'datei.txt', mimeType: 'text/plain', buffer })` | Kein Absturz; entweder Editor öffnet mit Inhalt **oder** Fehlerbanner — Test dokumentiert das tatsächlich beobachtete, konsistente Verhalten als Regressionsanker (Assertion auf **eines** der beiden Ergebnisse, nicht „undefiniert"). |
| E-3.4 | §3.4 | beide, gekreuzt | ODT-Buffer über `docxCard(page).locator('input[type="file"]')` hochladen (und umgekehrt: DOCX-Buffer über `odtCard`) | Fehlerbanner „…konnte nicht als Word-Dokument (.docx) gelesen werden" bzw. „…als OpenDocument Text (.odt) gelesen werden"; kein korrumpierter Editor-Inhalt. |
| E-3.5 | §3.5 | beide | `setInputFiles({ name: 'leer.docx', buffer: Buffer.alloc(0) })` | Fehlerbanner, kein „leerer aber erfolgreich wirkender" Editor. |
| E-3.6 | §3.6 | beide | siehe `large-document-import.spec.ts` (Abschnitt 4) | — |
| E-3.7 | §3.7 | beide | Datei mit Namen `Bewerbung Müller & Co (Entwurf).docx`/`.odt` hochladen | Editor öffnet; Titel-/Dateiname-Anzeige (`DocumentWorkspace`-Header) enthält den vollständigen Namen inkl. Umlaut/Sonderzeichen unverändert (Locator auf den Titel-Text, exakter String-Vergleich, kein Transliterat wie `Mueller`). |
| E-3.8 | §3.8 | beide | Zwei Uploads: Dateiname `Vertrag` (keine Endung) und `Vertrag.docx.docx` | Import gelingt anhand Inhalt; Titel zeigt den Dateinamen unverändert (inkl. doppelter Endung). |
| E-3.9 | §3.9 | beide | Fixture `tests/fixtures/external/docx/bug53475-password-is-pass.docx` bzw. `tests/fixtures/external/odt/PasswordProtected.odt` hochladen | Fehlerbanner (kein Absturz, kein stilles leeres Dokument) — identisches Verhalten wie jeder andere ungültige Import (§2.2). |
| E-3.10 | §3.10 | DOCX | Synthetischer Buffer mit klassischem OLE2/CFBF-Signatur-Header (`D0 CF 11 E0 A1 B1 1A E1` + Füllbytes) als `alt.docx` hochladen (Alternative: falls im Zuge der Recherche eine echte `.doc`-Datei auftreibbar ist, diese verwenden) | Fehlerbanner, kein Absturz, kein Binärmüll sichtbar im Editor. |
| E-3.11 | §3.11 | beide | `page.waitForEvent('filechooser')` nach Klick auf „Datei hochladen", **kein** `setFiles(...)`-Aufruf (simuliert Abbruch) | Nach kurzer Wartezeit (`page.waitForTimeout` vermeiden — stattdessen `expect(...).not.toBeVisible()` mit implizitem Retry): kein Fehlerbanner, kein Editor, Startbildschirm unverändert. **Bekannte Automatisierungsgrenze**, siehe Abschnitt 6. |
| E-3.12 | §3.12 | beide | Zwei `setInputFiles`-Aufrufe auf **verschiedenen** Format-Karten kurz hintereinander ohne `await` zwischen Auslösen (z. B. `Promise.all([...])` oder beide `void`-Aufrufe vor dem ersten `await expect`) | Determinismus: entweder genau ein Editor öffnet sich mit einem der beiden Dokumente, oder ein sauberer Fehlerzustand — kein vermischter/korrupter Inhalt, 0 Konsolenfehler. |
| E-3.15 | §3.15 | beide | Valide Minimaldatei mit leerem `<w:body><w:p/></w:body>` bzw. leerem `<office:text><text:p/></office:text>` hochladen | Editor öffnet mit leerem, aber validem Dokument — kein Fehlerbanner, kein Crash. |
| E-3.16 | §3.16 | beide | `setInputFiles([fileA, fileB])` (zwei verschiedene gültige Dateien an denselben `<input>`) | Nur der Inhalt von `fileA` (erste Datei) erscheint im Editor. |
| E-3.17 | §3.17 | beide | Dokument A hochladen → `← Formate` klicken → Dokument B (anderes Format oder anderer Inhalt) hochladen | Editor zeigt **ausschließlich** Inhalt von B; kein Rest-Dirty-Flag, kein Rest-Fehlerbanner von A. |
| E-5.1 | §5.1 | beide | Fehlgeschlagenen Import auslösen (Fehlerbanner sichtbar) → sofort erneut auf „Datei hochladen" klicken, gültige Datei liefern | Zweiter Import gelingt, Fehlerbanner verschwindet, Editor öffnet. |
| E-5.2 | §5.2 | beide | `page.keyboard.press('Tab')` bis Button fokussiert (`toBeFocused()`), dann `page.keyboard.press('Enter')` **und** separat `page.keyboard.press('Space')`, jeweils mit `page.waitForEvent('filechooser')` | Für beide Tasten öffnet der (virtuelle) Dateiauswahl-Dialog zuverlässig (Event feuert). |
| E-5.3 | §5.3 | beide | Wie E-3.11 (Abbruch simulieren) → danach `page.evaluate(() => document.activeElement?.tagName + (document.activeElement as HTMLElement)?.textContent)` | Fokus liegt auf dem auslösenden Button (oder einem sinnvollen Ziel), **nicht** auf `<body>`. **Bekannte Automatisierungsgrenze**, siehe Abschnitt 6. |
| E-2.2.6 | §2.2 Punkt 6 | beide, gekreuzt | Fehlgeschlagenen Import auf DOCX-Karte auslösen → prüfen, dass ODT-Karte weiterhin normal funktioniert (und umgekehrt) | Kein globaler Fehlerzustand; zweite Karte importiert erfolgreich trotz Fehler auf der ersten. |

### 3.3 Testfall-Tabelle: `complex-import-fidelity.spec.ts`

| ID | Bezug | Fixture(n) | Erwartung |
|---|---|---|---|
| E-3.13a | Hyperlink | `tests/fixtures/external/docx/*` mit Hyperlink (`WithTabs.docx`/eigens gebaute Fixture mit `<w:hyperlink>`) und `tests/fixtures/external/odt/Hyperlink-AOO401.odt` | Linktext im `.ProseMirror`-Editor sichtbar (`toContainText`). |
| E-3.13b | Content Control / Feld | `tests/fixtures/external/docx/FieldCodes.docx`, `FldSimple.docx` | Erwarteter Cache-Text im Editor sichtbar, kein leerer Absatz an der Stelle. |
| E-3.13c | Textbox/Form ohne Bild | `tests/fixtures/external/odt/FrameWithTable.odt`, `frame.odt`; DOCX-Äquivalent: selbstgebaute Fixture mit `<w:drawing>`→`wps:txbx`/`v:textbox` ohne `a:blip` | Text aus dem Textfeld im Editor sichtbar, **kein** leeres Bild-Element (`img[src=""]` darf nicht vorkommen — per `page.locator('.ProseMirror img[src=""]')` Nicht-Existenz prüfen). |
| E-3.13d | Diagramm/OLE ohne Vorschau | selbstgebaute Fixture mit `<w:drawing>` ohne jede `a:blip`/`txbxContent` | `unsupported_block`-Platzhalter sichtbar (`.unsupported-block`-Locator), kein stiller Verlust, kein Absturz. |
| E-3.13e | Platzhalter/Datum (ODT) | selbstgebaute Fixture mit `<text:placeholder>`/`<text:date>` | Umgebender Lauftext bleibt sichtbar. |
| E-3.13f | Mehrspaltiges Layout | Fixture mit `w:cols`/ODF-Section mit Spalten | Text bleibt vollständig lesbar (Spalten dürfen vereinfacht dargestellt werden). |
| E-3.14 | Verschachtelte Tabelle | `tests/fixtures/external/odt/subTables3-nested.odt`, `table-within-textBox-within-frame.odt`; DOCX-Äquivalent aus `tests/fixtures/external/docx/deep-table-cell.docx` | Kein Absturz, Zelltext auf allen Ebenen im Editor auffindbar. |

Jeder Fall zusätzlich mit den globalen Konsolen-/Fehler-Listenern aus
Abschnitt 1 Punkt 4 — 0 unbehandelte Exceptions ist Pflichtbestandteil jeder
Assertion in dieser Datei.

### 3.4 `large-document-import.spec.ts` (löst §2.1.6 / §3.6 / Code-Plan §8.1)

1. DOCX-Fall: `tests/fixtures/external/docx/bug65649.docx` (oder falls zu
   klein für einen realistischen „mehrere zehn MB"-Nachweis: zusätzlich eine
   programmatisch generierte Großdatei mit vielen Absätzen + mehreren
   eingebetteten Bildern, on-the-fly per `JSZip` innerhalb des Tests gebaut,
   um keine große Binärdatei ins Repo aufzunehmen).
2. ODT-Fall: `tests/fixtures/external/odt/brokenList.odt` (2,4 MB, ~20k
   automatische Styles — genau die Datei, die laut
   `src/formats/odt/__tests__/external-fixtures.test.ts` unter `jsdom` zu
   langsam ist und bislang nur per Kommentar auf einen nicht existierenden
   Test verweist).
3. Pro Fall:
   ```ts
   const start = Date.now()
   await input.setInputFiles({ name: 'gross.odt', mimeType: '...', buffer })
   await expect(page.locator('.ProseMirror')).toBeVisible()
   await expect(page.locator('.ProseMirror')).toContainText(/* bekannter Textausschnitt */)
   const elapsedMs = Date.now() - start
   console.log(`Ladezeit ${elapsedMs} ms`) // protokollieren, nicht hart auf <3000ms assertieren (CI-Varianz)
   expect(elapsedMs).toBeLessThan(15_000) // harter Realitäts-Deckel
   ```
4. „Tab nicht eingefroren"-Nachweis unmittelbar nach dem Upload:
   ```ts
   await expect.poll(() => page.evaluate(() => document.title)).toBeTruthy()
   ```
   (schlägt fehl/hängt, falls der Haupt-Thread dauerhaft blockiert ist).
5. Nach Abschluss: die in `datei-oeffnen-code.md` §8.1 genannten Kommentare
   in `src/formats/docx/__tests__/external-fixtures.test.ts` und
   `src/formats/odt/__tests__/external-fixtures.test.ts` mit den tatsächlich
   gemessenen Werten abgleichen und ggf. korrigieren (kein Verweis mehr auf
   eine nicht existierende Datei).

### 3.5 `roundtrip-fidelity.spec.ts` — Abschnitt 6 der Anforderungsdatei, alle 8 Kriterien

**Testdaten-Anforderung (§6 „Testdaten-Anforderung"):** eine realistische
Datei je Format mit Überschriften, mehrstufiger Liste, Tabelle mit
verbundenen Zellen, mindestens einem Bild, gemischter Zeichenformatierung in
einem Textlauf — alles **in einer** Datei. Zwei Optionen, beide zulässig:

- (a) programmatisch in der Spec-Datei selbst gebaut (analog
  `buildSampleDocx`/`buildSampleOdt`, aber erweitert um alle fünf Merkmale),
  bevorzugt, da unabhängig von externen Binärdateien und für DOCX/ODT exakt
  vergleichbar aufgebaut;
- (b) `test.odt` (Repo-Root) als Ausgangsbasis für den ODT-Zyklus plus eine
  vergleichbar aufgebaute, neu erstellte DOCX-Datei für den DOCX-Zyklus.

Empfehlung: (a), in einer gemeinsamen Hilfsdatei
`tests/e2e/fixtures/richDocument.ts` (**neu**) als
`buildRichDocx()`/`buildRichOdt()`, damit beide Formate exakt denselben
inhaltlichen Aufbau spiegeln (1:1-Vergleichbarkeit der Prüfkriterien).

**Ablauf pro Format (Matrix-Pflichtzeilen aus §6: DOCX→DOCX, ODT→ODT):**

1. Datei A hochladen (`setInputFiles`) → warten bis Editor Inhalt zeigt.
2. **Ohne jede Änderung** sofort `Exportieren` klicken, `download`-Event
   abwarten, Bytes von Disk lesen (`download.path()` + `fs.readFile`).
3. Die soeben heruntergeladene Datei **erneut über denselben Importweg**
   hochladen (`setInputFiles({ name: download.suggestedFilename(), buffer:
   exportedBuffer })`).
4. Prüfkriterien, je einzeln als eigene Assertion/eigener `test(...)`-Block:

| # | Kriterium | Verifikationsmethode (real, nicht intern) |
|---|---|---|
| 1 | Text | `editor.textContent()` (bzw. mehrere gezielte `toContainText`-Assertions je Absatz/Zelle/Listeneintrag) vor dem Export mit dem Text nach dem Re-Import vergleichen — zeichengetreu, keine fehlenden/zusätzlichen Absätze (Anzahl der Absatz-Locators vergleichen). |
| 2 | Struktur | DOM-Vergleich vor/nach: `h1`–`h6`-Tags und deren Reihenfolge, `ul`/`ol`-Verschachtelungstiefe, Tabellenzeilen-/spaltenzahl (`tr`/`td`/`th`-Anzahl), `colspan`/`rowspan`-Attribute je Zelle. |
| 3 | Zeichenformatierung | Je Textlauf: Vorhandensein/Position von `<strong>`/`<em>`/`<u>`/`<s>` sowie berechneter Farbe (`getComputedStyle`/`style`-Attribut) — Vergleich **positionstreu** (derselbe Textlauf hat vor und nach Reimport dieselbe Markierung), nicht nur „kommt irgendwo vor". |
| 4 | Absatzausrichtung | `text-align`-Wert je Absatz-Locator vor/nach vergleichen. |
| 5 | Bilder | (a) Anzahl `img`-Elemente im Editor vor/nach identisch; (b) Reihenfolge im Textfluss identisch (Index unter den Block-Kindern); (c) Byte-Vergleich: eingebettete Bilddaten aus der **heruntergeladenen Zip-Datei** extrahieren (`JSZip.loadAsync(exportedBuffer)`, `media/*`/`word/media/*`) und mit dem Original-Bild-Buffer, das beim Bau von Datei A verwendet wurde, per `Buffer.equals()` vergleichen. |
| 6 | Metadaten | Dokumenttitel aus `docProps/core.xml` (`dc:title`) bzw. `meta.xml` (`dc:title`) der **heruntergeladenen** Datei mit dem in Datei A gesetzten Titel vergleichen. |
| 7 | Dateiname | `download.suggestedFilename()` gegen Originalnamen von Datei A + zielformatpassende Endung prüfen (bei Gleichformat-Rundreise identisch zu Datei A). |
| 8 | Kein Absturz | Globale `pageerror`/`console error`-Listener (Abschnitt 1) über den **gesamten** Zyklus Import→Export→Re-Import — harte Assertion auf 0 Treffer am Ende des Tests. |

5. Cross-Format-Zeilen (DOCX→ODT, ODT→DOCX) werden gemäß §6 der
   Anforderungsdatei bewusst **nicht** in dieser Datei verlangt (abhängig von
   `speichern-unter-format`, laut Backlog „fehlt") — als
   `test.skip('DOCX→ODT Rundreise', ...)`-Platzhalter mit Kommentar auf den
   Backlog-Slug anlegen, damit die Lücke sichtbar bleibt und nicht vergessen
   wird, sobald das Feature existiert.

---

## 4. Testdaten-Inventar

| Bedarf | Quelle |
|---|---|
| Standard-Erfolgsfall, minimal | `buildSampleDocx()`/`buildSampleOdt()` aus bestehenden Specs wiederverwenden. |
| Kaputtes Zip / kein Zip | inline per `Buffer.from(...)` bzw. `new JSZip()` ohne Kern-Datei — kein Fixture-File nötig. |
| Passwortgeschützt | `tests/fixtures/external/docx/bug53475-password-is-pass.docx`, `bug53475-password-is-solrcell.docx`; `tests/fixtures/external/odt/PasswordProtected.odt`. |
| `.doc`/OLE2-Binärmüll als `.docx` | Kein passendes Repo-Fixture vorhanden → synthetisch im Test erzeugen (OLE2-Signatur-Header + Füllbytes) oder bei Gelegenheit eine echte kleine `.doc`-Datei besorgen und unter `tests/fixtures/misc/legacy.doc` ablegen. |
| Hyperlink | DOCX: eigene Mini-Fixture mit `<w:hyperlink>` (Vorlage: `buildSampleDocx` erweitern); ODT: `Hyperlink-AOO401.odt`, `hyperlink.odt`, `hyperlink_destination.odt`. |
| Content Control / Feld | `tests/fixtures/external/docx/FieldCodes.docx`, `FldSimple.docx`. |
| Textbox ohne Bild | ODT: `FrameWithTable.odt`, `frame.odt`; DOCX: eigene Mini-Fixture (`wps:txbx` ohne `a:blip`). |
| Verschachtelte Tabelle | ODT: `subTables3-nested.odt`, `table-within-textBox-within-frame.odt`; DOCX: `deep-table-cell.docx`. |
| Große Datei | DOCX: `bug65649.docx` (+ ggf. generierte Großdatei); ODT: `brokenList.odt`. |
| Rundreise-Fidelity (Listen, Tabelle mit verbundenen Zellen, Bild, gemischte Formatierung, Überschriften) | neu zu bauen: `tests/e2e/fixtures/richDocument.ts` (`buildRichDocx`/`buildRichOdt`); alternativ `test.odt` (Repo-Root) als ODT-Ausgangsbasis. |

Alle bestehenden Fremd-Fixtures unter `tests/fixtures/external/{docx,odt}`
bleiben zusätzlich Grundlage der Unit-Test-Ebene (Abschnitt 2); für die
E2E-Ebene wird nur eine gezielte Teilmenge (siehe oben) tatsächlich über den
echten Browser-Upload gejagt, um Laufzeit vertretbar zu halten.

---

## 5. Rückverfolgbarkeits-Matrix (jede Anforderung → mind. ein Test)

| Anforderungsdatei-Abschnitt | Test-ID(s) |
|---|---|
| §2.1 (1–5) Erfolgsablauf | bestehend: `docx.spec.ts`/`odt.spec.ts` „uploads an existing … file" |
| §2.1.4 Kein Netzwerk-Request | Abschnitt 1 Punkt 5 (zentraler Request-Mitschnitt), in jeder Upload-Testdatei aktiv |
| §2.1.6 Ladezeit/kein Freeze | E-3.6 / `large-document-import.spec.ts` |
| §2.2 (1–5) Fehlerablauf | E-3.1, E-3.2, E-3.5, E-5.1 |
| §2.2.6 Karten-Unabhängigkeit | E-2.2.6 |
| §2.3 Zustand nach Import (dirty:false, fokussierbar) | Ergänzung in `file-open-edge-cases.spec.ts`: nach jedem Erfolgsimport `editor.click()` + sofortiges Tippen ohne vorherigen zusätzlichen Klick; „ungespeichert"-Badge (falls im UI vorhanden) nicht gesetzt |
| §3.1–3.17 | E-3.1 … E-3.17 (Tabelle Abschnitt 3.2/3.3) |
| §5.1–5.4 | E-5.1 … E-5.3, 5.4 durch bestehende Card-Locator-Exaktheit trivial mitabgedeckt |
| §6 (Kriterien 1–8, Matrix DOCX→DOCX/ODT→ODT) | `roundtrip-fidelity.spec.ts` (Abschnitt 3.5) |
| §7.1 (jeder §3/§5-Punkt per echtem Browser-Test) | erfüllt, sobald alle E-Tests in Abschnitt 3 grün |
| §7.2 (vollständige Rundreise-Matrix grün) | erfüllt, sobald `roundtrip-fidelity.spec.ts` grün |
| §7.3 (kein offener Befund unbeantwortet) | Abschnitt 6 dieses Plans (Ausführung & Exit-Kriterien) |
| `datei-oeffnen-code.md` §1 (Error Boundary) | U-7 (Unit) **und** empfohlen zusätzlich ein E2E-Fall in `file-open-edge-cases.spec.ts`, der einen bekannten Schema-Bruch (z. B. via Mini-Fixture, die vor der Reparatur laut §2–5 einen Crash auslösen würde) hochlädt und prüft, dass **kein** weißer Bildschirm, sondern ein Fehlerbanner erscheint |
| `datei-oeffnen-code.md` §2–5 (stiller Textverlust) | E-3.13a–f, E-3.14, U-3–U-6 |
| `datei-oeffnen-code.md` §6/§7 (`unsupported_block`) | E-3.13c/d, U-1 |
| `datei-oeffnen-code.md` §8.1 (Beleg-Fehlbestand) | `large-document-import.spec.ts` (Abschnitt 3.4) |

---

## 6. Bekannte Automatisierungsgrenzen (dokumentiert, nicht stillschweigend übersprungen)

1. **§3.11 (Dialog-Abbruch) und §5.3 (Fokus nach Abbruch):** Der native
   OS-Dateiauswahl-Dialog selbst ist von Playwright grundsätzlich nicht
   steuerbar (kein echtes OS-Fenster im automatisierten Testlauf). Ersatzweise
   Vorgehen: `page.waitForEvent('filechooser')` abfangen und **kein**
   `setFiles(...)` aufrufen — das ist die in der Playwright-Community
   übliche Annäherung an „Abbruch", deckt aber nicht jedes OS-spezifische
   Detail ab. Ergänzend: **manueller** Cross-Browser-Check (Chrome, Firefox,
   Safari/WebKit) einmalig vor Abnahme, protokolliert als Kommentar in der
   Testdatei (siehe auch `datei-oeffnen-code.md` §10.3, dieselbe
   Einschätzung).
2. **§3.6 harte 3-Sekunden-Grenze:** CI-Runner-Leistung schwankt; der Test
   protokolliert die tatsächliche Zeit und assertiert nur einen groben
   Realitäts-Deckel (15 s), keine harte 3-Sekunden-Schranke, um keine
   flakigen Fehlschläge durch reine Infrastruktur-Varianz zu erzeugen. Die
   3-Sekunden-Richtwert-Prüfung erfolgt manuell/informativ anhand des
   protokollierten Werts auf einem definierten Referenzrechner.
3. **Mehrfachauswahl im OS-Dialog (§3.16):** Playwright kann `setInputFiles`
   mit mehreren Dateien simulieren (deckt die Code-Reaktion `files?.[0]` ab),
   aber nicht das OS-eigene Mehrfachauswahl-UI selbst — für dieses Teilstück
   ausreichend, da das zu prüfende Verhalten auf Code-Seite liegt.

---

## 7. Ausführungsplan

1. Unit-Tests: `npm test` (Vitest, `jsdom`) — muss grün sein, bevor E2E
   gestartet wird (schnelleres Feedback, günstiger Fail-Fast).
2. E2E-Tests: `npm run test:e2e` (Playwright, baut automatisch via
   `webServer`) — mindestens Projekt „Desktop Chrome" verbindlich für die
   Abnahme; „Mobile"/„Tablet" (bereits in `playwright.config.ts` konfiguriert)
   informativ mitlaufen lassen, da Datei-Upload-Verhalten auf Touch-Geräten
   abweichen kann, aber nicht Kernbestandteil dieser Anforderungsdatei ist.
3. Nach jedem Lauf: `playwright-report/` (HTML-Report, bereits konfiguriert)
   als Nachweis archivieren/verlinken.

## 8. Exit-Kriterien (Abnahme, siehe §7 der Anforderungsdatei)

Der Status `datei-oeffnen` darf erst auf „verifiziert" gesetzt werden, wenn:

1. Alle Testfälle aus Abschnitt 3 (Teil B) grün sind, inklusive 0 protokollierten
   Konsolenfehlern/unbehandelten Exceptions und 0 unerwarteten
   Netzwerk-Requests während des Imports.
2. `roundtrip-fidelity.spec.ts` für **beide** Pflichtzeilen der Matrix aus
   §6 (DOCX→DOCX, ODT→ODT) mit allen 8 Kriterien grün ist.
3. Alle Unit-Test-Ergänzungen aus Abschnitt 2.2 grün sind.
4. Jede Zeile der Rückverfolgbarkeits-Matrix (Abschnitt 5) einen grünen
   Test-ID-Verweis hat — keine Zeile ohne Test.
5. Für jeden während der Umsetzung gefundenen Fehlerbefund (aus
   `datei-oeffnen-code.md` oder neu entdeckt) entweder: (a) behoben und durch
   einen der obigen Tests regressionsgesichert, oder (b) bewusst als bekannte
   Einschränkung in diesem Dokument (Abschnitt 6) oder in
   `datei-oeffnen-code.md` dokumentiert — kein stillschweigendes Ignorieren.
