# QA-Testplan: „Kopfzeile bearbeiten"

Rolle dieses Dokuments: Testplan der QA-Instanz, nicht des Dev-Plans selbst. Geprüft gegen
`E:\docs\specs\kopfzeile-bearbeiten-req.md` (Soll-Zustand, Grenzfälle, Rundreise-Anforderung) und
`E:\docs\specs\kopfzeile-bearbeiten-code.md` (Umsetzungsplan, Stand 2026-07-04). Zusätzlich gegen den
tatsächlichen Repo-Code verifiziert:

- **Feature ist noch nicht implementiert.** `grep -r "Kopfzeile|HeaderChrome|headerViewRef|focusedRegion" src`
  liefert nur zwei Treffer, beide in bestehenden Unit-Tests, die `header` direkt als Testdaten konstruieren
  (`src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts`) — exakt
  Befund 6 der Anforderung. `src/formats/shared/editor/WordEditor.tsx` erzeugt tatsächlich genau eine
  `EditorView`, `Toolbar.tsx` hat keinen Kopfzeilen-Button. Dieser Plan ist also **vor/während** der
  Umsetzung zu schreiben und nach Implementierung 1:1 auszuführen — nicht blind auf die im Code-Plan bereits
  vorgeschlagenen Testfälle (dortiger Abschnitt 7) zu vertrauen, sondern diese zu verifizieren, zu ergänzen
  und wo nötig zu widerlegen (siehe Abschnitt 0).
- **Die in `kopfzeile-bearbeiten-code.md` Abschnitt 0.1–0.4 behaupteten Reader/Writer-Bugs sind real und
  wurden hier unabhängig am tatsächlichen Code nachvollzogen** (nicht nur aus dem Code-Plan übernommen),
  siehe Abschnitt 0.1–0.3 unten.
- **Ein zusätzlicher, im Code-Plan nicht erkannter Befund:** Der in Code-Plan Abschnitt 7.4 vorgeschlagene
  echte Browser-E2E-Test für die Cross-Format-Rundreise (Anforderung 5.2, Punkte 3/4) ist mit der
  tatsächlichen App-Architektur **nicht** wie dort beschrieben durchführbar — siehe Abschnitt 0.4, analog
  zum bereits in `seitenumbruch-qa.md` Abschnitt 0.2 dokumentierten Präzedenzfall für dasselbe
  strukturelle Problem.

Zwei verpflichtende, **getrennte** Testebenen, wie vom Auftrag gefordert:

1. **Unit-Tests Reader/Writer-Rundreise** (DOCX + ODT) — Vitest, direkter Aufruf von
   `writeDocx`/`readDocx`/`writeOdt`/`readOdt` und der neuen Editor-Bausteine, ohne Browser.
2. **ECHTE Playwright-Browser-Tests** — echte Klicks, echtes Tippen über `page.keyboard`, echter
   Doppelklick, echter Datei-Upload über `input.setInputFiles(...)`, echter Datei-Download über
   `page.waitForEvent('download')` **und anschließende Inspektion der heruntergeladenen Datei** (JSZip
   gegen die reale ZIP/XML-Struktur) — **nicht** nur Aufrufe interner TypeScript-Funktionen innerhalb
   eines Browser-Kontexts (`page.evaluate(() => insertHeaderText(...))` o. ä. ist für diese Ebene
   unzulässig).

Referenz-Infrastruktur im Repo, gegen die tatsächlichen Dateien verifiziert (nicht aus dem Code-Plan
übernommen): `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`
(Helper `docxCard(page)`/`odtCard(page)`, Muster „echter Download → `download.path()` → `fs.readFile` →
`JSZip.loadAsync` → String-Prüfung gegen `word/document.xml`"/`content.xml`),
`src/formats/docx/__tests__/roundtrip.test.ts` (bestehender Block „DOCX round trip: header, footer, and
metadata"), `src/formats/odt/__tests__/roundtrip.test.ts` (analog), `src/formats/*/__tests__/external-fixtures.test.ts`.
Test-Runner: Vitest (Unit) + Playwright (E2E) — beide bereits im Repo eingerichtet, keine neue
Tooling-Wahl nötig.

---

## 0. Kritische Vorab-Befunde (vor bzw. während Testausführung zu berücksichtigen)

### 0.1 Bestätigt: DOCX-Reader übernimmt „irgendeine" statt der `default`-Kopf-/Fußzeile (Req Befund 2, Code-Plan 0.1/1.1)

Am tatsächlichen Code verifiziert (`src/formats/docx/reader.ts:352-353`):
```ts
const headerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')
const footerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'footerReference')
```
`firstChildNS` liefert das **erste** `headerReference`/`footerReference`-Kindelement in
Dokumentreihenfolge, ohne dessen `w:type`-Attribut auszuwerten. Das reale, im Repo bereits vorhandene
Fixture `tests/fixtures/external/docx/headerFooter.docx` listet `w:type="even"` **vor** `w:type="default"`
— nach heutigem Code-Stand liefert der Import also den **leeren** `even`-Header/-Footer statt des
tatsächlichen Inhalts „This is a simple header…"/„…and this is a simple footer.". **Konsequenz:** Der
Pflicht-Testfall zu genau dieser Fixture (Abschnitt 5.1.3 der Anforderung) kann nach heutigem Code-Stand
nicht grün sein — Abschnitt 1.2 unten macht daraus einen hart formulierten Pflichttest, der **vor** jedem
anderen Fixture-Test laufen und bei Rot die gesamte Abnahme blockieren muss (analog zur Methodik in
`seitenumbruch-qa.md` Abschnitt 0.1/4).

### 0.2 Bestätigt: DOCX Header/Footer-Bilder werden über den falschen Relationship-Namensraum aufgelöst/geschrieben (Req Grenzfall 6, Code-Plan 0.2/0.3/1.3)

Am tatsächlichen Code verifiziert:
- **Reader** (`reader.ts:357-374`): `readBodyChildren(root, headingInfo, kindByNumId, documentRels, zip)`
  wird für Header **und** Footer mit `documentRels` (den Relationships von `word/document.xml`) aufgerufen
  — nicht mit den tatsächlich zuständigen `word/_rels/header1.xml.rels`/`footer1.xml.rels`. Ein Bild in
  einer Kopfzeile, dessen `r:embed`-ID nur in der Header-eigenen `.rels`-Datei existiert, wird entweder gar
  nicht aufgelöst oder — schlimmer, empirisch mit `tests/fixtures/external/docx/headerPic.docx` reproduzierbar
  — fälschlich auf eine gleichnamige, aber inhaltlich andere ID in `document.xml.rels` gemappt (in diesem
  Fixture zeigt `rId1` dort auf `styles.xml`, nicht auf das Bild).
- **Writer** (`writer.ts:222-267`): eine einzige `documentRels`-Instanz wird für `bodyXml`, `headerXml`
  **und** `footerXml` gemeinsam verwendet; es wird zu keinem Zeitpunkt eine `word/_rels/header1.xml.rels`
  oder `word/_rels/footer1.xml.rels` erzeugt. Ein selbst eingefügtes Bild in der Kopfzeile bekäme eine
  `r:embed`-ID, die ausschließlich in `document.xml.rels` (falscher Namensraum für diesen Part) steht — nach
  OPC-Spezifikation ungültig, in echtem Word/LibreOffice nicht auflösbar.

**Konsequenz:** Ohne Reader- **und** Writer-Fix ist Grenzfall 6/Testfall 5.2.6 (Bild in der Kopfzeile,
Rundreise) strukturell nicht erfüllbar — weder für importierte Fremddateien noch für über die neue UI
eingefügte Bilder. Abschnitt 1.1/2.13 unten führen das als Pflichttest, nicht als optionale Ergänzung.

### 0.3 Bestätigt: ODT-Reader wählt Master-Page rein nach Dokumentreihenfolge, nicht nach Namen (Req Befund 3, Code-Plan 0.4/1.2)

Am tatsächlichen Code verifiziert (`src/formats/odt/reader.ts:257`):
```ts
const masterPage = stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page')[0]
```
`[0]` liefert das erste `style:master-page`-Element in `styles.xml`, unabhängig von dessen `style:name`.
Für die beiden im Repo vorhandenen Fixtures `headerFinal.odt`/`headerFirstPage.odt` (je zwei Master-Pages:
`Standard` und `Right_20_Page`) ist das aktuell **zufällig** richtig, weil `Standard` in beiden Dateien
zufällig zuerst in `styles.xml` steht — der Code garantiert das nicht. Kein reiner Test-Gap, sondern ein
Fix ist nötig, damit eine Fremddatei mit umgekehrter Reihenfolge nicht die falsche Kopf-/Fußzeile lädt
(siehe Pflichttest in Abschnitt 1.1).

### 0.4 Neuer Befund (nicht im Code-Plan erkannt): Cross-Format-E2E-Test (5.2.3/5.2.4) ist mit der tatsächlichen App-Architektur nicht wie in Code-Plan Abschnitt 7.4 vorgeschlagen durchführbar

Code-Plan Abschnitt 7.4 schlägt vor: „Cross-Format DOCX→ODT→DOCX … (erfordert Umschalten zwischen den
beiden Format-Karten im `FormatPicker`, erneuter Datei-Upload mit dem jeweils zuletzt heruntergeladenen
Blob)". Am tatsächlichen Code geprüft (`src/app/FormatPicker.tsx:14-26`, `src/app/DocumentWorkspace.tsx:17-29`,
`src/formats/registry.ts`):

- Jede „Karte" (DOCX/ODT) im `FormatPicker` ist über ihren eigenen, unsichtbaren `<input type="file">`
  **fest** an genau ein `AnyFormatModule` gebunden: `handleFile(module, file)` ruft ausschließlich
  `module.importFile(file)` **dieser** Karte auf (`FormatPicker.tsx:14-18`) — es gibt **keine**
  Format-Erkennung anhand des tatsächlichen Dateiinhalts, die auf die jeweils passende Karte umlenkt.
- `DocumentWorkspace.handleExport()` ruft ausschließlich `module.exportFile(...)` **desselben** Moduls
  auf, in dem das Dokument geöffnet wurde (`DocumentWorkspace.tsx:17-29`) — es gibt **keine**
  „Als anderes Format exportieren"-Funktion.
- **Konsequenz, empirisch nachvollzogen:** Eine im DOCX-Editor bearbeitete, heruntergeladene `.docx`-Datei
  über die ODT-Karte hochzuladen (`odtCard(page).locator('input[type="file"]').setInputFiles({..., buffer:
  exportedDocxBuffer})`) löst `odtModule.importFile(file)` → `readOdt()` auf einem DOCX-ZIP aus. DOCX- und
  ODT-ZIP-Strukturen sind inkompatibel (kein `mimetype`-Eintrag, kein `content.xml`, andere Relationship-
  Konventionen) — `readOdt()` wirft eine Exception, `FormatPicker.handleFile` fängt sie ab und zeigt
  lediglich die rote Fehlermeldung „„…docx" konnte nicht als OpenDocument Text (.odt) gelesen werden: …"
  (`FormatPicker.tsx:19-25`). Der Test würde also **planmäßig fehlschlagen**, nicht weil das
  Kopfzeilen-Feature fehlerhaft ist, sondern weil die App **strukturell keine Cross-Format-Konvertierung**
  anbietet — exakt dasselbe, bereits in `seitenumbruch-qa.md` Abschnitt 0.2 für ein anderes Feature
  dokumentierte Problem.

**Konsequenz für diesen Testplan:** Anforderung 5.2, Punkte 3/4 (Cross-Format-Rundreise) werden
ausschließlich auf **Unit-Ebene** geprüft (Abschnitt 1.6 unten, verkettete `writeDocx`/`readDocx`/`writeOdt`/
`readOdt`-Aufrufe in einem Testprozess) — das ist die einzig **heute** technisch mögliche Prüfung. Der
E2E-Teil dieser Anforderung wird als **dokumentierte, nicht ausführbare Lücke** geführt (Abschnitt 2.15),
nicht stillschweigend ausgelassen. Vor Abnahme mit PO/Dev zu klären, ob (a) das für diese Iteration
akzeptiert wird oder (b) eine eigenständige „Format konvertieren"-Funktion nachgeliefert werden muss
(außerhalb des Geltungsbereichs dieser Datei).

### 0.5 Klarstellung zu `tabellen_header_DOC_LO4-1-0.odt` (Req 5.1.3, Code-Plan Befund 0.5) — korrekt übernommen, hier zusätzlich verifiziert

Diese Datei wird in Anforderung Abschnitt 5.1.3 als eine der fünf Pflicht-Fixtures für die
Baseline-Rundreise geführt. Der Code-Plan (Befund 0.5) stellt fest, dass sie **keine** Seiten-Kopf-/
Fußzeile enthält, sondern eine Tabellen-Überschriftszeile im Hauptinhalt. Diese Einschätzung wird hier
übernommen, aber der Testfall muss das **aktiv prüfen** (`header === null`, `footer === null`), nicht nur
„keinen Fehler werfen" — sonst entsteht exakt das im Code-Plan selbst beschriebene Risiko eines
fälschlich falsch begründeten Tests. Abschnitt 1.2/2.12 unten formulieren das explizit als eigenen,
gegenteiligen Assertion-Fall (nicht „enthält Kopfzeilentext", sondern „`header`/`footer` bleiben `null`").

### 0.6 Zusätzliche reale Kopf-/Fußzeilen-Fixtures im Repo, über die fünf Pflicht-Fixtures der Anforderung hinaus (empfohlene Zusatzabdeckung, kein Abnahme-Blocker)

Im Repo zusätzlich vorhanden und ebenfalls aktuell von keinem Test referenziert:
`tests/fixtures/external/docx/EmptyDocumentWithHeaderFooter.docx`,
`tests/fixtures/external/docx/HeaderFooterUnicode.docx`, `tests/fixtures/external/docx/Headers.docx`,
`tests/fixtures/external/odt/HeaderFooter.odt`,
`tests/fixtures/external/odt/HeaderFirstAndEvenPageEnabled_MSO15.odt`,
`tests/fixtures/external/odt/HeaderFirstAndEvenPageEnabledAndMarging_MSO15.odt`,
`tests/fixtures/external/odt/HeaderFirstPageEnabled_MSO15.odt`,
`tests/fixtures/external/odt/HeaderFirstPageDisabled_MSO15.odt`. Diese sind **nicht** durch Anforderung
5.1.3 vorgeschrieben, decken aber zusätzliche, in Grenzfall 4/5 angesprochene Konstellationen
(„Erste Seite anders"/„gerade-ungerade" in Fremddateien, insbesondere Unicode-Text in Kopf-/Fußzeile) ab
und werden als **optionale** Zusatztests geführt (Abschnitt 1.2, Tabelle „Bonus"). Ihr Fehlen darf die
Abnahme nicht blockieren, ihr Vorhandensein erhöht aber die Verlässlichkeit der Typ-Priorisierungs-Fixes
aus 0.1/0.3.

### 0.7 Risikobereich: Zwei-`EditorView`-Koordination (`focusedRegion`/`tick`) ist der wahrscheinlichste Ort für einen neuen Selection-Sync-artigen Bug

Code-Plan Abschnitt 1.5 baut `WordEditor.tsx` von einer einzelnen zu einer zwei-`EditorView`-koordinierenden
Komponente um (`bodyViewRef`/`headerViewRef`, gemeinsamer `tick`-State, geteilter
`reconcileSelectionOnClick`). Das ist strukturell genau der Fall, den Anforderung Abschnitt 2 selbst als
„Hauptverdachtsfall für dieselbe Fehlerklasse" benennt. **Analytisch plausibel, aber nicht von selbst
bewiesen:** dass keine Transaktion einer View die Selektion der anderen beeinflusst. Dieser Testplan
behandelt den Regressionstest aus Abschnitt 2.7 deshalb als **scharfen Pflichttest**, nicht als
Nice-to-have — bei Rot ist das Feature unabhängig von allen anderen grünen Tests nicht abnahmefähig
(analog zu `UT-DOCX-RT-BREAK-OWN-TEXT` in `seitenumbruch-qa.md`).

---

## 1. Testebene 1 — Unit-Tests Reader/Writer-Rundreise (DOCX + ODT)

Ausführung: `npm run test` (Vitest, jsdom). Ziel: Reader/Writer-Symmetrie und Editor-Kern-Bausteine
**ohne** Browser, inklusive der realen Fixture-Dateien.

### 1.1 Reader/Writer-Bugfix-Tests (Regressionsschutz für Abschnitt 0.1–0.3) — Pflicht, vor allen anderen Tests

| ID | Datei | Testfall | Erwartung |
|---|---|---|---|
| **UT-DOCX-TYPE-PRIO** *(Pflicht, siehe 0.1)* | `src/formats/docx/__tests__/roundtrip.test.ts` (neuer Block) | Handgebauter DOCX-Blob (analog `buildSampleDocx()` in `tests/e2e/docx.spec.ts`) mit drei `w:headerReference`/`w:footerReference` (`even`, `default`, `first`), `default` **nicht** zuerst im XML gelistet → `readDocx()` | `doc.header`/`doc.footer` enthalten den `default`-Text, nicht den zuerst gelisteten (`even`)-Text. **Bei Rot ist der Reader vor jeder weiteren Abnahme zu korrigieren, unabhängig davon, was sonst grün ist** |
| UT-DOCX-TYPE-PRIO-02 | dito | Nur `first`/`even` vorhanden, kein `default` | Deterministischer Fallback (laut Code-Plan 1.1: `first` vor `even`), **keine** zufällige Auswahl — Test ruft zweimal mit vertauschter XML-Reihenfolge auf und erwartet **identisches** Ergebnis beide Male |
| **UT-DOCX-HDR-IMG-RELS** *(Pflicht, siehe 0.2)* | `src/formats/docx/__tests__/roundtrip.test.ts` (neuer Block) | `writeDocx()` mit Bild in `header.content` → resultierendes Zip inspizieren | `word/_rels/header1.xml.rels` existiert, enthält eine `image`-Relationship auf die tatsächliche Bilddatei; `header1.xml`s `r:embed`-ID löst **innerhalb dieser** `.rels`-Datei auf ein `media/*`-Ziel auf, nicht auf `document.xml.rels` |
| **UT-DOCX-HDR-IMG-ROUNDTRIP** *(Pflicht, siehe 0.2)* | dito | Ergebnis von `UT-DOCX-HDR-IMG-RELS` erneut durch `readDocx()` | Zurückgegebener `header`-Inhalt enthält einen `image`-Knoten mit `src` beginnend `data:image/…;base64,` und **exakt** den ursprünglichen Bilddaten — **nicht** dem Base64-Inhalt von `styles.xml` oder einer anderen Datei |
| UT-ODT-MASTERPAGE-NAME *(Pflicht, siehe 0.3)* | `src/formats/odt/__tests__/roundtrip.test.ts` (neuer Block) | Handgebautes `styles.xml` (analog `buildSampleOdt()` in `tests/e2e/odt.spec.ts`) mit `style:name="Right_20_Page"` **vor** `style:name="Standard"` in Dokumentreihenfolge, beide mit unterschiedlichem `<style:header>`-Text → `readOdt()` | Ergebnis enthält den Text aus `Standard`s Header, nicht aus `Right_20_Page` |
| UT-ODT-MASTERPAGE-FALLBACK | dito | Kein Master-Page namens `Standard` vorhanden (nur `Right_20_Page`) | Fällt auf das erste gefundene Master-Page zurück (dokumentiertes, kein zufälliges Verhalten) — kein Crash |

### 1.2 Fixture-Rundreise-Tests (Baseline-Rundreise 5.1.3 der Anforderung, schließt Befund 7)

Neue Datei `src/formats/docx/__tests__/header-fixtures-roundtrip.test.ts` (Muster: `readFileSync` +
`readDocx`/`writeDocx`, analog bestehendem `external-fixtures.test.ts`):

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-FIX-DOCX-01 *(Pflicht)* | `tests/fixtures/external/docx/headerFooter.docx` | Unverändert importieren → sofort exportieren → reimportieren | Kopfzeilentext enthält „This is a simple header", Fußzeilentext enthält „…and this is a simple footer" — **abhängig vom Fix aus UT-DOCX-TYPE-PRIO**, direkter Nachweis der in Req 5.1.3 geforderten Rundreise für diese konkrete Datei |
| UT-FIX-DOCX-02 *(Pflicht)* | `tests/fixtures/external/docx/headerPic.docx` | Unverändert importieren → sofort exportieren → reimportieren | Header enthält einen `image`-Knoten mit gültigen, nicht-leeren Bilddaten (Base64-Länge > triviale Platzhaltergröße) — **abhängig vom Fix aus UT-DOCX-HDR-IMG-*** |
| UT-FIX-ODT-01 *(Pflicht)* | `tests/fixtures/external/odt/headerFinal.odt` | Unverändert importieren → sofort exportieren → reimportieren | Kopfzeilentext enthält „Header standard" (nicht den Text der `Right_20_Page`-Variante) |
| UT-FIX-ODT-02 *(Pflicht)* | `tests/fixtures/external/odt/headerFirstPage.odt` | dito | Analog — Kopfzeilentext der `Standard`-Master-Page, nicht der Variante |
| **UT-FIX-ODT-03** *(Pflicht, siehe 0.5 — Gegenprobe, nicht „enthält Text")* | `tests/fixtures/external/odt/tabellen_header_DOC_LO4-1-0.odt` | Unverändert importieren | `header === null` **und** `footer === null` (diese Fixture hat keine Seiten-Kopf-/Fußzeile, nur eine Tabellen-Überschriftszeile im Hauptinhalt — ein Test, der hier Kopfzeilentext erwartet, ist falsch konstruiert, siehe 0.5) |
| UT-FIX-DOCX-BASE-01 | eine reale DOCX-Datei ohne jede Kopf-/Fußzeile (z. B. bereits vorhandenes Nicht-Header-Fixture aus `external-fixtures.test.ts`) | Import → Export → Reimport | `header`/`footer` bleiben `null` (Req 5.1.1) |
| UT-FIX-ODT-BASE-01 | analog für ODT (Req 5.1.2) | dito | `header`/`footer` bleiben `null` |

„Bonus" — optionale Zusatztests gegen die in 0.6 gefundenen weiteren Fixtures (kein Abnahme-Blocker,
erhöhen aber die Verlässlichkeit der Typ-Priorisierung, insbesondere für „Erste Seite anders"/Unicode):

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-BONUS-DOCX-01 | `HeaderFooterUnicode.docx` | Import → Export → Reimport | Nicht-lateinische Zeichen (laut Dateiname zu erwarten) bleiben verlustfrei erhalten |
| UT-BONUS-DOCX-02 | `EmptyDocumentWithHeaderFooter.docx` | Import | Kein Crash bei leerem Hauptinhalt + vorhandener Kopf-/Fußzeile (Grenzfall 11-artige Konstellation, aber aus Fremddatei statt selbst erzeugt) |
| UT-BONUS-ODT-01 | `HeaderFirstAndEvenPageEnabled_MSO15.odt` | Import | Mindestens eine Kopfzeile bleibt erhalten (Grenzfall 4/5), dokumentiert welche |

### 1.3 Editor-Kern — neue Bausteine (`pageLayout.ts`, `pagination.ts`, `HeaderChrome.tsx`)

| ID | Datei | Testfall | Erwartung |
|---|---|---|---|
| UT-LAYOUT-01 | `src/formats/shared/editor/__tests__/pageLayout.test.ts` (neu) | `pageHeaderBandTop(0)` | `0` |
| UT-LAYOUT-02 | dito | `pageHeaderBandTop(1)` | `PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX` (exakter Wert, nicht nur „größer als 0") |
| UT-LAYOUT-03 | dito | `pageHeaderBandTop(i)` für `i = 0..4` | streng monoton steigend, keine Kollisionen zwischen Bändern |
| UT-LAYOUT-04 | dito | `HEADER_BAND_MAX_PX` | `=== 2 * PAGE_MARGIN_PX` (exakter, dokumentierter Wert aus Abschnitt 1.7 des Code-Plans) |
| UT-PAG-HDR-01 | `src/formats/shared/editor/__tests__/pagination.test.ts` (erweitert) | Bestehende, parameterlose Aufrufe von `computePageBreakIndices`/`computePageCount`/`createPaginationPlugin()` | **Unverändert grün** — die neue optionale `options`-Signatur darf bestehende Aufrufe nicht brechen |
| UT-PAG-HDR-02 | dito | `createPaginationPlugin({ onPageCountChange })` an eine `EditorView` mit zwei Seiten Inhalt gebunden (jsdom-Messung ggf. gemockt, analog bestehender Testansatz für dieses Modul) | `onPageCountChange` wird mit dem korrekten, gegenüber dem parameterlosen Pfad identischen Seitenzahl-Wert aufgerufen |
| UT-HDRCHROME-01 | `src/formats/shared/editor/__tests__/HeaderChrome.test.tsx` (neu, `@testing-library/react`) | Mount mit `header: null` | Genau ein Platzhalter-Band sichtbar (Band 0), Doppelklick darauf löst die übergebene `onActivate`/`onHeaderChange`-Callback aus |
| UT-HDRCHROME-02 | dito | Mount mit befülltem `header`, `pageCount = 3` | Genau 3 Bänder gerendert; Band 0 enthält eine editierbare `.ProseMirror`-Fläche; Bänder 1/2 enthalten **identischen** Text, aber mit `contenteditable="false"` |
| UT-HDRCHROME-03 | dito | Doppelklick auf Band 2 (Spiegel-Band, nicht Band 0) | `onFocusChange('header')` (bzw. äquivalenter Callback) wird aufgerufen — Doppelklick auf **jeder** Seite muss zum selben, einzigen Kopfzeilenbereich führen, nicht nur auf Seite 1 |
| UT-HDRCHROME-04 | dito | `header`-Prop ändert sich (z. B. Text wird länger) während `pageCount = 2` | Beide Bänder (0 und 1) zeigen den **aktualisierten** Text — kein veraltetes Spiegel-Band |

### 1.4 Selection-Reconciliation-Extraktion (reine Verschiebung, Regressionsschutz)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-SELRECON-01 | `reconcileSelectionOnClick` aus `src/formats/shared/editor/selectionReconciliation.ts` importiert statt lokal in `WordEditor.tsx` definiert | Identisches Verhalten zur bisherigen, jetzt entfernten lokalen Funktion — bestehende Selection-Sync-Tests (`tests/e2e/selection-regression.spec.ts`) bleiben **unverändert grün** ohne Anpassung an deren Testcode (reine interne Verschiebung, keine sichtbare Verhaltensänderung) |

### 1.5 Baseline-Rundreise-Regression (Req 5.1.4: bestehende Fixture-Rundreisen dürfen nicht brechen)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-BASE-01 | Alle **bestehenden** Tests in `docx/__tests__/roundtrip.test.ts` (inkl. Block „header, footer, and metadata"), `docx/__tests__/external-fixtures.test.ts`, `odt/__tests__/roundtrip.test.ts`, `odt/__tests__/external-fixtures.test.ts` | Bleiben nach allen Änderungen **unverändert grün** — insbesondere der bestehende Testfall „preserves header and footer content" mit direkt konstruiertem `header`/`footer`-JSON |
| UT-BASE-02 | `npm run build` (`tsc -b`) | Läuft fehlerfrei durch, insbesondere nach Signaturänderungen an `readBodyChildren`-Aufrufstellen (Abschnitt 1.1 Code-Plan) und `WordEditor.tsx`-Umbau |

### 1.6 Cross-Format-Kette auf Unit-Ebene (einzige technisch mögliche Prüfung von Req 5.2.3/5.2.4, siehe Befund 0.4)

Neue Datei `src/formats/shared/__tests__/header-crossformat.test.ts`:

| ID | Testfall | Erwartung |
|---|---|---|
| UT-XFMT-HDR-01 | Dokument mit befülltem `header`+`body` → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | Kopfzeilentext **und** Haupttext bleiben über beide Formatwechsel erhalten (Req 5.2.3) |
| UT-XFMT-HDR-02 | Umgekehrte Kette: → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Analog (Req 5.2.4) |
| UT-XFMT-HDR-03 | Kopfzeile mit kombinierter Formatierung (fett **und** Textfarbe) über dieselbe Kette | Beide Formatierungseigenschaften bleiben erhalten, nicht nur der nackte Text (Grenzfall 12) |
| UT-XFMT-HDR-04 | Kopfzeile mit Bild über dieselbe Kette | Bild bleibt erhalten (kombiniert mit Fix aus 0.2, ODT-Bildpfade sind laut Code-Plan 6.3 strukturell unproblematisch) |
| UT-XFMT-HDR-05 | Kopfzeile **und** Fußzeile gleichzeitig, unterschiedlicher Text, über dieselbe Kette | Beide bleiben unabhängig korrekt zugeordnet, keine Vertauschung (Grenzfall 14, deckt zusätzlich den wegen fehlender Fußzeilen-UI nicht per E2E testbaren Teil von 5.2.7 ab, siehe Abschnitt 2.13) |

---

## 2. Testebene 2 — ECHTE Playwright-Browser-Tests

### 2.1 Testgrundsatz (verbindlich für alle Tests dieser Ebene)

Jeder Test in diesem Abschnitt **muss** ausschließlich über öffentlich sichtbare Browser-Interaktion
laufen:

- Klicks über `page.getByRole('button', {...})` / `page.getByTitle(...)` / `page.getByLabel(...)`,
- Doppelklick über `page.dblclick(...)` bzw. `locator.dblclick()` auf den tatsächlichen oberen
  Seitenrandbereich (nicht simuliert über `page.evaluate`),
- Tastatureingaben über `page.keyboard.type(...)` / `page.keyboard.press(...)`,
- Datei-Uploads über `input.setInputFiles({...})` auf das reale `<input type="file">` (auch für den
  Bild-Upload in die Kopfzeile: `input[type="file"][accept="image/*"]` innerhalb der gemeinsamen
  Toolbar, sichtbar/aktiv sobald die Kopfzeilen-View fokussiert ist),
- Downloads über `page.waitForEvent('download')` + `download.path()` + tatsächliches Einlesen der Datei
  von der Festplatte (`fs.readFile`) + `JSZip.loadAsync(...)` gegen die **reale** ZIP/XML-Struktur — genau
  wie in `tests/e2e/docx.spec.ts:70–83`/`tests/e2e/odt.spec.ts` bereits etabliert.

**Nicht zulässig** für diese Ebene: `page.evaluate(() => ...)`-Aufrufe interner Funktionen, direkte
Imports von `commands.ts`/`writer.ts`/`reader.ts` innerhalb eines E2E-Specs, oder jede andere Umgehung der
echten UI. Diese Ebene existiert genau deshalb, weil Unit-Tests (Ebene 1) die Editor-Verdrahtung
(Toolbar-Button tatsächlich vorhanden und klickbar, Doppelklick-Handler tatsächlich gebunden, zweite
`EditorView` tatsächlich gemountet und fokussierbar, Datei tatsächlich herunterladbar) nicht abdecken.

**Hinweis zu Locator-Namen:** Die unten verwendeten Locator (`getByTitle('Kopfzeile bearbeiten')`,
`getByTitle('Kopfzeile entfernen')`, CSS-Klasse/Attribut für die Bandabgrenzung) sind aus
`kopfzeile-bearbeiten-code.md` Abschnitt 3.2/4.2 übernommen (dortiger `title`/`aria-label`-Text). Sie sind
gegen die **tatsächlich implementierten** Werte zu verifizieren, sobald die UI existiert — weicht der
tatsächliche Text ab, sind ausschließlich die Locator-Strings in diesem Testplan anzupassen, nicht die
geprüfte Semantik.

### 2.2 Wiederverwendete Infrastruktur (bereits im Repo vorhanden, verifiziert)

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

Gemeinsamer `beforeEach`: `page.goto('/')` → Datenschutz-Banner wegklicken
(`page.getByRole('button', { name: /verstanden/i }).click()`) → Karte öffnen
(`docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()` bzw. `odtCard(...)`).

Neue Datei: `tests/e2e/header-edit.spec.ts` (Grundfunktion, Grenzfälle, Selection-Sync). Neue Datei:
`tests/e2e/header-roundtrip.spec.ts` (echte Datei-Rundreisen). Zusätzlich: ein Testfall wird **direkt** in
den bestehenden `describe`-Block von `tests/e2e/selection-regression.spec.ts` aufgenommen (siehe 2.7),
analog zum in `seitenumbruch-qa.md` Abschnitt 2.6 etablierten Muster.

### 2.3 Aktivierung (Toolbar-Button und Doppelklick)

| ID | Testfall (echte Bedienung) | Prüfung |
|---|---|---|
| E2E-ACT-01 | Neues Dokument (DOCX) → `page.getByTitle('Kopfzeile bearbeiten').click()` | Ein sichtbares, editierbares Kopfzeilenband erscheint am oberen Seitenrand; der Fokus liegt automatisch dort (sofort `page.keyboard.type('Test')` möglich, ohne zusätzlichen Klick — Anforderung 3.1 letzter Punkt) |
| E2E-ACT-02 | Neues Dokument → Doppelklick auf den oberen Seitenrandbereich der Seite (`page.locator(...).dblclick()` auf das per Code-Plan 1.6 vorgesehene Platzhalter-Band, **nicht** auf `.ProseMirror` selbst) | Identisches Ergebnis wie E2E-ACT-01 — beide Auslösewege führen zum selben sichtbaren, fokussierten Zustand |
| E2E-ACT-03 | Datei mit vorhandener Kopfzeile hochladen (`headerFooter.docx`) → Toolbar-Button klicken | Vorhandener Kopfzeilentext ist **sofort** sichtbar (kein leerer Bereich, kein zweiter Klick nötig) — Anforderung 3.1, vierter Punkt |
| E2E-ACT-04 | ODT-Karte, identischer Ablauf wie E2E-ACT-01/02 | Identisches Ergebnis auf der ODT-Karte (Feature ist formatunabhängig im selben Editor) |
| E2E-ACT-05 *(Grenzfall 1)* | Brandneues, leeres Dokument (`header === null`, `body` nur ein leerer Absatz) → Kopfzeile aktivieren | Leerer, editierbarer Bereich entsteht sofort; kein Crash, Editor bleibt bedienbar (Konsolen-Fehler-Assertion: `page.on('pageerror')` darf während des gesamten Tests nicht feuern) |
| E2E-ACT-06 | Toolbar-Button erneut klicken, während Kopfzeile bereits existiert und fokussiert ist | **Kein** Deaktivieren/Verschwinden (Code-Plan-Entscheidung 1.4: Button ist kein Toggle) — Bereich bleibt sichtbar und fokussiert |

### 2.4 Bearbeiten des Inhalts (Toolbar-Wiederverwendung, Anforderung 3.2)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-EDIT-01 | Kopfzeile aktivieren → `page.keyboard.type('Firma Mustermann GmbH')` | Text sichtbar **innerhalb** des Kopfzeilenbandes (Locator auf das Band, nicht auf `.ProseMirror` allgemein, da zwei `EditorView`-Instanzen existieren); Haupttext bleibt **unverändert** (leerer Absatz) |
| E2E-EDIT-02 | Im Kopfzeilenbereich: `ControlOrMeta+a` → `page.getByTitle('Fett').click()` | Text im Kopfzeilenband ist fett dargestellt (`<strong>`/CSS `font-weight`); Haupttext-Formatierung bleibt unberührt |
| E2E-EDIT-03 | Ausrichtung „zentriert" im Kopfzeilenbereich anwenden | Absatzausrichtung wirkt nur auf den Kopfzeileninhalt |
| E2E-EDIT-04 *(Grenzfall 6)* | Bild in die Kopfzeile einfügen (`page.locator('input[type="file"][accept="image/*"]').setInputFiles({name: 'logo.png', mimeType: 'image/png', buffer: pngBuffer})`, während die Kopfzeilen-View fokussiert ist) | Bild erscheint sichtbar innerhalb des Kopfzeilenbandes, nicht im Haupttext |
| E2E-EDIT-05 | Nach E2E-EDIT-01: Klick in den Haupttext, dort tippen | Haupttext-Eingabe erscheint **nicht** im Kopfzeilenband und umgekehrt — beide Bereiche bleiben inhaltlich unabhängig |

### 2.5 Visuelle Abgrenzung (Testplan-Punkt 6 der Anforderung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-VISUAL-01 | Kopfzeile aktivieren | Ein vom Haupttext sichtbar abgegrenztes DOM-Element ist vorhanden — konkret: eine untere Trennlinie **und/oder** ein `aria-label="Kopfzeile"` (bzw. äquivalentes sichtbares Label) auf dem Kopfzeilen-Container (`page.locator('[aria-label="Kopfzeile"]')` sichtbar, mit von `.ProseMirror`-Body verschiedener `getComputedStyle(...).borderBottomStyle`/Hintergrundfarbe) — Locator-basierte Assertion, kein reiner Screenshot-Vergleich nötig, wie in Code-Plan Testplan-Hinweis 6 gefordert |
| E2E-VISUAL-02 | Vor Aktivierung (`header === null`) | Ein Platzhalter/Hinweistext (z. B. „Doppelklick, um eine Kopfzeile hinzuzufügen") ist erkennbar vorhanden, kein leerer, nicht-interaktiver toter Bereich (Anforderung 3.9, kein stiller Fehlschlag) |

### 2.6 Verlassen des Kopfzeilenbereichs (Anforderung 3.5)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-LEAVE-01 | Kopfzeile aktivieren, tippen → Klick in den Haupttext-Bereich | Fokus/Cursor liegt danach nachweislich im Haupttext (`page.keyboard.type('X')` landet dort, nicht in der Kopfzeile) |
| E2E-LEAVE-02 | Kopfzeile aktivieren, tippen → `page.keyboard.press('Escape')` (laut Code-Plan 3.2 Keymap-Eintrag) | Fokus kehrt zum Haupttext zurück, analoge Prüfung wie E2E-LEAVE-01 |
| E2E-LEAVE-03 | Direkt nach E2E-LEAVE-01/02: `page.keyboard.type('Direkt danach')` | Text landet **ausschließlich** im Haupttext, **nicht** versehentlich in der Kopfzeile — erste, einfache Stufe des Selection-Sync-Risikos aus 0.7 |

### 2.7 Pflicht-Regressionstest Selection-Sync (Grenzfall 3/9, **scharf formuliert**, siehe 0.7)

Muss **sowohl** in der neuen Datei `header-edit.spec.ts` **als auch** direkt im bestehenden
`describe`-Block von `tests/e2e/selection-regression.spec.ts` verankert werden (analog zur in
`seitenumbruch-qa.md` Abschnitt 2.6 etablierten doppelten Verankerung, damit die Regressionssuite diesen
Fall bei künftigen Refactorings nicht aus dem Blick verliert):

```ts
test('header focus round trip + reselect + type — both areas keep their own correct content', async ({ page }) => {
  const body = page.locator('.ProseMirror').first()
  await body.click()
  await page.keyboard.type('Hauptinhalt Absatz eins.')

  // Grenzfall 3: Doppelklick auf den Kopfzeilenbereich, während im Haupttext eine Selektion aktiv ist.
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Kopfzeile bearbeiten').click()
  await page.keyboard.type('Kopfzeile A')

  // Grenzfall 9: mehrfacher Fokuswechsel Kopfzeile -> Haupttext -> Kopfzeile, jeweils gefolgt von Tippen.
  await body.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Zusatz eins.')

  await page.getByTitle('Kopfzeile bearbeiten').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Zusatz Kopfzeile.')

  await body.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Zusatz zwei.')

  const header = page.locator('[aria-label="Kopfzeile"]')
  await expect(header).toContainText('Kopfzeile A Zusatz Kopfzeile.')
  await expect(body).toContainText('Hauptinhalt Absatz eins. Zusatz eins. Zusatz zwei.')
  // Haupttext-Selektion von Alles-auswählen darf keinen Text gelöscht/vertauscht haben:
  await expect(body).not.toContainText('Kopfzeile A')
  await expect(header).not.toContainText('Hauptinhalt')
})
```

| ID | Testfall | Kernprüfung |
|---|---|---|
| **E2E-SELSYNC-01** *(Pflicht)* | wie oben | Beide Bereiche behalten exakt ihren eigenen, ungestörten Inhalt über den gesamten Fokuswechsel-Zyklus — **kein** Übertrag/keine Vermischung, kein Datenverlust |
| E2E-SELSYNC-02 | Wiederholung derselben Sequenz auf der ODT-Karte | Identisches Ergebnis, formatunabhängig |

### 2.8 Kopfzeile entfernen (Grenzfall 2, Anforderung 3.6)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-REMOVE-01 | Kopfzeile aktivieren, Text eingeben → `page.getByTitle('Kopfzeile entfernen').click()` | Kopfzeilenband verschwindet aus der Ansicht (bzw. kehrt zum inaktiven Platzhalter-Zustand zurück) |
| E2E-REMOVE-02 | Direkt danach: exportieren, heruntergeladene Datei inspizieren (JSZip) | **Keine** `w:headerReference`/`<style:header>` im Export vorhanden — kein „Geisterelement" |
| E2E-REMOVE-03 *(Grenzfall 2, Baseline-Gegenprobe)* | Nach E2E-REMOVE-01/02: Datei erneut hochladen | `header === null` im Editor sichtbar (kein leerer, aber „unsichtbar aktiver" Bereich) |
| E2E-EMPTY-01 *(Grenzfall 11)* | Kopfzeile aktivieren, **nie** über den leeren Absatz hinaus befüllen → exportieren | Kein Crash; dokumentiertes Ergebnis (laut Code-Plan-Entscheidung 1.4: bleibt als leerer, aber vorhandener `w:headerReference`/`style:header` erhalten) wird durch XML-Inspektion tatsächlich **bestätigt**, nicht nur angenommen — Testfall hält das **tatsächlich beobachtete** Verhalten fest |
| E2E-CLEAR-01 *(Grenzfall 2, Satz 1 der Anforderung 3.6)* | Kopfzeile befüllen → gesamten Kopfzeilentext markieren (Klick + `ControlOrMeta+a` **innerhalb** des Kopfzeilenbandes) → `Delete` | Bereich bleibt **aktiv** (Platzhalter für „entfernen"-Button bleibt sichtbar/klickbar), wird **nicht** automatisch deaktiviert — abweichend von E2E-REMOVE-01, das den expliziten Entfernen-Button nutzt |

### 2.9 Undo direkt nach Aktivierung (Grenzfall 8)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-UNDO-01 | Kopfzeile aktivieren (vorher `header === null`) → `page.keyboard.type('X')` → `ControlOrMeta+z` | Getippter Text verschwindet, Bereich bleibt aktiv (leer), **kein** Crash |
| E2E-UNDO-02 | Direkt danach: ein **weiteres** `ControlOrMeta+z` | No-Op — Bereich bleibt weiterhin aktiv (wird **nicht** durch Undo auf „nie aktiviert" zurückgesetzt, laut Code-Plan-Entscheidung 1.8); kein Konsolenfehler (`page.on('pageerror')`-Assertion) |
| E2E-UNDO-03 | `ControlOrMeta+Shift+z` (Redo) nach E2E-UNDO-01 | Getippter Text erscheint wieder |

### 2.10 Mehrseitige Sichtbarkeit (Grenzfall 10, Anforderung 3.3)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-MULTIPAGE-01 | Kopfzeile mit Text „Seitenkopf" aktivieren → in den Haupttext so viel Text tippen/einfügen, dass das Dokument nachweislich mehr als eine sichtbare Seite umfasst (z. B. wiederholtes `page.keyboard.type` eines langen Absatzes oder `page.keyboard.press('Enter')` in Schleife) | Mindestens zwei sichtbare Kopfzeilen-Bänder im DOM vorhanden, **beide** mit identischem Text „Seitenkopf" (Locator auf alle Bänder, `toHaveCount(>= 2)` und `toContainText` je Band) |
| E2E-MULTIPAGE-02 | Danach: Kopfzeilentext über das **primäre** (editierbare) Band ändern | Alle sichtbaren Spiegel-Bänder aktualisieren sich auf den neuen Text (keine veraltete Kopie) |
| E2E-MULTIPAGE-03 | Doppelklick auf ein Spiegel-Band einer **späteren** Seite (nicht Band 0) | Fokus springt zum echten, editierbaren Kopfzeilenbereich; unmittelbar folgendes Tippen erscheint korrekt im (einzigen) Kopfzeileninhalt |

### 2.11 Echte Datei-Rundreise über Download + Re-Upload, neu erstellter Inhalt (Req 5.2, Punkte 1/2)

```ts
test('header text and formatting survive a real export + re-upload round trip (DOCX)', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.getByTitle('Kopfzeile bearbeiten').click()
  await page.keyboard.type('Firma Mustermann GmbH')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  const editor = page.locator('.ProseMirror').last()
  await editor.click()
  await page.keyboard.type('Hauptinhalt.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const downloadedPath = await download.path()
  expect(downloadedPath).toBeTruthy()

  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile(downloadedPath!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  const headerXml = await zip.file('word/header1.xml')?.async('text')

  // Echte Prüfung der heruntergeladenen Datei, nicht nur des DOM:
  expect(documentXml).toContain('<w:headerReference')
  expect(headerXml).toContain('Firma Mustermann GmbH')
  expect(headerXml).toContain('<w:b/>')
  expect(documentXml).toContain('Hauptinhalt.')

  // Echter Re-Upload derselben Datei in eine frische Sitzung:
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'brief.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: exportedBuffer,
  })

  await expect(page.locator('[aria-label="Kopfzeile"]')).toContainText('Firma Mustermann GmbH')
  await expect(page.locator('.ProseMirror').last()).toContainText('Hauptinhalt.')
})
```

| ID | Testfall | Kernprüfung |
|---|---|---|
| E2E-RT-DOCX-01 *(= Req 5.2.1)* | wie oben | Kopfzeilentext + Fett-Formatierung in `word/header1.xml` der echten heruntergeladenen Datei, Haupttext in `word/document.xml`, Re-Upload zeigt beides |
| E2E-RT-ODT-01 *(= Req 5.2.2)* | identischer Ablauf auf der ODT-Karte | Heruntergeladene `.odt`-Datei enthält den Kopfzeilentext im `<style:header>` des referenzierten Master-Page-Styles (per JSZip gegen `styles.xml`); Re-Upload zeigt Text + Formatierung |
| E2E-RT-DOCX-02 *(Req 5.2.5)* | Kopfzeile mit Fett **und** Textfarbe → Export → Re-Upload | `word/header1.xml` enthält sowohl `<w:b/>` als auch `<w:color .../>` im selben Run/Style; nach Re-Upload beide Formatierungen sichtbar |
| **E2E-RT-DOCX-03** *(Req 5.2.6, Pflicht, hängt an Fix aus 0.2)* | Kopfzeile mit eingefügtem Bild (echter `setInputFiles`-Flow, siehe E2E-EDIT-04) → Export → Re-Upload | `word/_rels/header1.xml.rels` in der echten heruntergeladenen Datei enthält eine `image`-Relationship; Bild ist nach Re-Upload weiterhin sichtbar in der Kopfzeile. **Dies ist der einzige E2E-Nachweis, dass Reader- und Writer-Fix aus 0.2 tatsächlich zusammen funktionieren** — Unit-Tests (1.1) prüfen Reader und Writer teils isoliert gegeneinander |
| E2E-RT-DOCX-04 *(Req 5.2.9, Grenzfall 2)* | Kopfzeile über UI entfernen → Export → Re-Upload | Export enthält keine `w:headerReference` mehr (siehe auch E2E-REMOVE-02), Re-Upload zeigt `header === null` |

### 2.12 Baseline-Rundreise mit unveränderten Fremddateien (Req 5.1, echter Upload/Export/Reimport ohne jeden Klick im Editor)

| ID | Testfall (`input.setInputFiles` mit echter Datei vom Datenträger) | Prüfung |
|---|---|---|
| E2E-BASELINE-DOCX-NOHDR | Reale DOCX-Datei ohne jede Kopf-/Fußzeile hochladen (z. B. eine bereits in `docx.spec.ts` verwendete Fixture oder eine der Nicht-Header-Dateien aus `tests/fixtures/external/docx/`) → **kein Klick, keine Eingabe** → sofort exportieren → reimportieren | Inhalt entspricht dem Original; `header`-Band bleibt im inaktiven Platzhalter-Zustand (kein fälschlich erzeugter, sichtbar aktiver Bereich) — Req 5.1.1 |
| E2E-BASELINE-ODT-NOHDR | Analog für eine reale ODT-Datei ohne Kopfzeile | Req 5.1.2 |
| **E2E-BASELINE-FIX-01** *(Pflicht)* | `tests/fixtures/external/docx/headerFooter.docx` unverändert hochladen → sofort exportieren → reimportieren, **kein Klick im Editor** | Kopfzeilentext „This is a simple header" und Fußzeilentext bleiben inhaltlich erhalten — direkter End-to-End-Nachweis von UT-FIX-DOCX-01/UT-DOCX-TYPE-PRIO über die echte UI, nicht nur auf Unit-Ebene |
| **E2E-BASELINE-FIX-02** *(Pflicht)* | `tests/fixtures/external/docx/headerPic.docx` unverändert hochladen → sofort exportieren → reimportieren | Bild in der Kopfzeile bleibt sichtbar (nicht durch `styles.xml`-Inhalt ersetzt) — End-to-End-Nachweis von UT-FIX-DOCX-02 |
| E2E-BASELINE-FIX-03 | `tests/fixtures/external/odt/headerFinal.odt` unverändert hochladen → sofort exportieren → reimportieren | Kopfzeilentext „Header standard" bleibt erhalten |
| E2E-BASELINE-FIX-04 | `tests/fixtures/external/odt/headerFirstPage.odt` unverändert hochladen → sofort exportieren → reimportieren | Analog |
| **E2E-BASELINE-FIX-05** *(Gegenprobe, siehe 0.5)* | `tests/fixtures/external/odt/tabellen_header_DOC_LO4-1-0.odt` unverändert hochladen → sofort exportieren → reimportieren | Kopfzeilenband bleibt im **inaktiven** Zustand (kein Kopfzeilentext sichtbar); Tabelleninhalt im Hauptbereich bleibt vollständig erhalten — Test darf hier **nicht** fälschlich Kopfzeilentext erwarten |

### 2.13 Feature-Rundreise: Ergänzen einer importierten Kopfzeile, Kopf+Fuß gleichzeitig (Req 5.2, Punkte 7/8)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-APPEND-01 *(Req 5.2.8)* | `headerFooter.docx` hochladen → Kopfzeile aktivieren (zeigt vorhandenen Text) → ans Ende klicken (`End`) → zusätzlichen Satz tippen → exportieren → reimportieren | **Sowohl** der ursprüngliche („This is a simple header") **als auch** der ergänzte Text sind nach Reimport vorhanden |
| E2E-HDRFTR-01 *(Req 5.2.7, dokumentierte Teil-Lücke)* | Kopfzeile über die UI befüllen; Fußzeile-UI existiert in dieser Anforderung **nicht** (separater Slug `fusszeile-bearbeiten`) | Dieser Testfall kann als **vollwertiger E2E-Test mit beiden UI-Bereichen** nicht geschrieben werden, solange `fusszeile-bearbeiten` nicht umgesetzt ist — wird analog zur Entscheidung in Code-Plan Abschnitt 7.4/11 als **dokumentierte, vorübergehende Lücke** geführt, nicht stillschweigend ausgelassen. Die Reader/Writer-seitige Trennung von `header`/`footer` (keine Vertauschung) ist bereits durch UT-XFMT-HDR-05 (Unit-Ebene, Abschnitt 1.6) und den bestehenden Roundtrip-Testblock abgedeckt |

### 2.14 Cross-Format E2E (dokumentierte Lücke, siehe Befund 0.4)

Kein Testfall dieser Ebene für Req 5.2 Punkte 3/4 möglich, solange die App keine
Format-Konvertierungsfunktion anbietet (empirisch nachvollzogen in Abschnitt 0.4 — nicht nur vermutet).
Wird in der Abnahme (Abschnitt 4) als offener Punkt geführt, analog zu `seitenumbruch-qa.md` Abschnitt
2.11.

### 2.15 Baseline-E2E-Regression (Anforderung 5.1.4)

| ID | Testfall | Erwartung |
|---|---|---|
| E2E-BASE-01 | Alle **bestehenden** Tests in `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/lifecycle.spec.ts` | Bleiben nach Einführung des Features unverändert grün — insbesondere darf die neue zweite `EditorView`/der neue `Escape`-Keymap-Eintrag **keine** bestehende Tastenkombination oder das bestehende `.ProseMirror`-Locator-Muster (jetzt ggf. zwei Treffer statt einem — bestehende Tests, die `page.locator('.ProseMirror')` ohne `.first()`/`.last()` verwenden, müssen einzeln geprüft werden, ob sie nach Einführung der zweiten View weiterhin eindeutig auflösen) stören |
| E2E-BASE-02 | Bestehende Tests, die `page.locator('.ProseMirror')` verwenden (Singular-Erwartung) | Nach Einführung der Kopfzeilen-`EditorView` **weiterhin eindeutig** — falls nicht (weil jetzt zwei `.ProseMirror`-Elemente im DOM existieren, sobald `header !== null`), ist das ein **Regressionsfund**, der vor Abnahme behoben werden muss (z. B. durch eindeutig unterscheidbare CSS-Klassen für Body- vs. Header-View), nicht nur in diesem Testplan zu vermerken |

---

## 3. Traceability-Matrix (Anforderung → Testfall)

| Anforderungsteil | Abgedeckt durch |
|---|---|
| Abschnitt 1 (Toolbar-Button, Doppelklick, abgegrenzter Bereich, Verlassen, Entfernen) | E2E-ACT-01–06, E2E-VISUAL-01/02, E2E-LEAVE-01–03, E2E-REMOVE-01–03 |
| 3.1 (Aktivierung, sofort tippbar) | E2E-ACT-01–05 |
| 3.2 (Bearbeiten, Toolbar-Wiederverwendung, Bild) | E2E-EDIT-01–05, E2E-RT-DOCX-03 |
| 3.3 (Seitenübergreifende Wirkung) | UT-HDRCHROME-02–04, E2E-MULTIPAGE-01–03 |
| 3.4 (Erste Seite anders/gerade-ungerade, dokumentierter Nicht-Support) | UT-DOCX-TYPE-PRIO, UT-DOCX-TYPE-PRIO-02, UT-ODT-MASTERPAGE-* |
| 3.5 (Verlassen, kein Selection-Sync-Bug) | E2E-LEAVE-01–03, E2E-SELSYNC-01/02 |
| 3.6 (Deaktivieren/Leeren) | E2E-CLEAR-01, E2E-REMOVE-01–03, E2E-EMPTY-01 |
| 3.7 (Architektur-Kompatibilität Seitenzahl-Feld) | Kein automatisierter Test möglich (Architektur-Review, kein Laufzeitverhalten) — im Abnahmeprotokoll manuell gegen Code-Plan Abschnitt 1.10 zu bestätigen |
| 3.8 (Datenmodell-Wiederverwendung) | UT-BASE-01 (bestehender Roundtrip-Block bleibt grün, keine neuen Datenmodell-Felder) |
| 3.9 (kein stiller Fehlschlag) | E2E-VISUAL-02, E2E-EMPTY-01 |
| Grenzfall 1 | E2E-ACT-05 |
| Grenzfall 2 | E2E-REMOVE-01–03, E2E-RT-DOCX-04 |
| Grenzfall 3 | E2E-SELSYNC-01/02 (erste Sequenz-Hälfte) |
| Grenzfall 4/5 | UT-DOCX-TYPE-PRIO-02, UT-BONUS-ODT-01 |
| Grenzfall 6 | UT-DOCX-HDR-IMG-RELS/-ROUNDTRIP, UT-FIX-DOCX-02, E2E-EDIT-04, E2E-RT-DOCX-03 |
| Grenzfall 7 | Manuelle/visuelle Prüfung des dokumentierten Scroll-Verhaltens (Code-Plan 1.7) — kein harter Assertion-Test vorgeschrieben, aber im Abnahmeprotokoll zu vermerken, welches Verhalten tatsächlich eintrat |
| Grenzfall 8 | E2E-UNDO-01–03 |
| Grenzfall 9 | E2E-SELSYNC-01/02 (zweite Sequenz-Hälfte) |
| Grenzfall 10 | E2E-MULTIPAGE-01–03 |
| Grenzfall 11 | E2E-EMPTY-01 |
| Grenzfall 12 | UT-XFMT-HDR-03, E2E-RT-DOCX-02 |
| Grenzfall 13 | Nicht vollständig lösbar (Code-Plan 8, unverändert); dokumentierte Einschränkung, kein Testfall erzwingt hier eine Lösung, nur Abwesenheit eines Crashes bei mehreren `sectPr` — optional per Bonus-Fixture (0.6) abzudecken, falls eine passende Datei verfügbar ist |
| Grenzfall 14 | UT-XFMT-HDR-05, E2E-HDRFTR-01 (Teil-Lücke, dokumentiert) |
| Req 5.1 (Baseline-Rundreise, inkl. 5 Pflicht-Fixtures) | UT-FIX-DOCX-01/02, UT-FIX-ODT-01/02/03, UT-FIX-*-BASE-01, E2E-BASELINE-DOCX/ODT-NOHDR, E2E-BASELINE-FIX-01–05 |
| Req 5.2 Punkte 1/2 (Feature-Rundreise DOCX/ODT) | E2E-RT-DOCX-01, E2E-RT-ODT-01 |
| Req 5.2 Punkte 3/4 (Cross-Format) | UT-XFMT-HDR-01/02 (Unit); **E2E nicht ausführbar, siehe 0.4/2.14** |
| Req 5.2 Punkt 5 (kombinierte Formatierung) | UT-XFMT-HDR-03, E2E-RT-DOCX-02 |
| Req 5.2 Punkt 6 (Bild) | UT-DOCX-HDR-IMG-*, UT-XFMT-HDR-04, E2E-RT-DOCX-03 |
| Req 5.2 Punkt 7 (Kopf+Fuß gleichzeitig) | UT-XFMT-HDR-05 (Unit vollständig); E2E-HDRFTR-01 (dokumentierte Teil-Lücke) |
| Req 5.2 Punkt 8 (Ergänzen importierter Kopfzeile) | E2E-APPEND-01 |
| Req 5.2 Punkt 9 (Entfernen) | E2E-RT-DOCX-04 |
| Selection-Sync-Regression (Abschnitt 2 der Haupt-Spezifikation, Grenzfall 9 dieser Datei) | E2E-SELSYNC-01/02, zusätzlich in `selection-regression.spec.ts` verankert |
| Testplan-Hinweis 6, Visuelle Abgrenzung | E2E-VISUAL-01 |
| Testplan-Hinweis 7 (Unit **und** E2E für Cross-Format/Kombination) | Beide Ebenen jeweils oben geführt — E2E-Teil für Cross-Format ist die dokumentierte Ausnahme (0.4) |

---

## 4. Abnahmekriterien dieses Testplans

Der Status „vorhanden" (Req-Abschnitt 7) darf aus QA-Sicht erst vergeben werden, wenn:

- [ ] **UT-DOCX-TYPE-PRIO**, **UT-DOCX-HDR-IMG-RELS**, **UT-DOCX-HDR-IMG-ROUNDTRIP**,
      **UT-ODT-MASTERPAGE-NAME** grün sind (Abschnitt 0.1–0.3) — bei Rot sind die betroffenen
      Reader/Writer-Stellen vor jeder weiteren Abnahme zu korrigieren, unabhängig davon, was sonst grün
      ist.
- [ ] **E2E-SELSYNC-01/02** grün (Abschnitt 0.7/2.7) — bei Rot ist die Zwei-`EditorView`-Koordination
      (`focusedRegion`/`tick`, Code-Plan Abschnitt 1.5) vor Abnahme zu korrigieren, unabhängig von allen
      anderen grünen Tests.
- [ ] Alle Unit-Tests aus Abschnitt 1 grün (inkl. neuer Dateien `header-fixtures-roundtrip.test.ts`,
      `pageLayout.test.ts`, `HeaderChrome.test.tsx`, `header-crossformat.test.ts`) — die fünf
      Pflicht-Fixtures aus Req 5.1.3 eingeschlossen, mit korrekt reflektierter Gegenprobe für
      `tabellen_header_DOC_LO4-1-0.odt` (Abschnitt 0.5).
- [ ] Alle Playwright-Tests aus Abschnitt 2 grün, insbesondere die echten Datei-Rundreise-Tests (2.11–2.13),
      die tatsächlich heruntergeladene/hochgeladene Dateien prüfen, nicht nur DOM-Zustand.
- [ ] Baseline-Regression (1.5, 2.15) vollständig grün — insbesondere E2E-BASE-02 (bestehende
      `.ProseMirror`-Locator in alten Tests bleiben eindeutig, auch mit einer zweiten `EditorView` im DOM).
- [ ] Cross-Format-Anforderung (Req 5.2.3/5.2.4) ist mindestens auf Unit-Ebene (`UT-XFMT-HDR-01/02`) grün;
      die fehlende E2E-Abdeckung (Abschnitt 0.4/2.14) ist mit PO/Dev **explizit** besprochen und der
      Status entsprechend als „teilweise (App-seitige Cross-Format-UI fehlt, unabhängig vom
      Kopfzeilen-Feature — bereits als dasselbe strukturelle Problem in `seitenumbruch-qa.md` dokumentiert)"
      festgehalten, falls dort keine Einigung erzielt wird.
- [ ] Req 5.2.7 (Kopf+Fuß gleichzeitig) ist mindestens auf Unit-Ebene grün; der E2E-Teil bleibt als
      dokumentierte, an `fusszeile-bearbeiten` gekoppelte Teil-Lücke offen (Abschnitt 2.13), nicht
      stillschweigend als erledigt geführt.
- [ ] Alle 14 Grenzfälle aus Req-Abschnitt 4 sind einzeln mit Testergebnis befundet (funktioniert /
      bewusst abweichend + dokumentiert / repariert), nicht pauschal „erledigt" — insbesondere Grenzfall 7
      (Layout-Überlauf) und Grenzfall 13 (mehrere `sectPr`), für die kein harter Test, sondern nur eine
      dokumentierte Beobachtung vorgeschrieben ist.
- [ ] Verhältnis zu `fusszeile-bearbeiten` ist geklärt (Anforderung, Freigabekriterium letzter Punkt) —
      insbesondere ob/wie `focusedRegion`/`HeaderChrome`-Bausteine bei Umsetzung der Fußzeile erneut
      angefasst werden (Code-Plan Abschnitt 1.9), damit beide Slugs konsistent bleiben.

Andernfalls: Status „teilweise", mit Verweis auf die konkret offenen Punkte aus dieser Liste — analog zur
in `kopfzeile-bearbeiten-req.md` Abschnitt 7 und `seitenumbruch-qa.md` Abschnitt 4 festgelegten
Vorgehensweise.
