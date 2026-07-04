# QA-Testplan: Exportieren/Speichern (`speichern-exportieren`)

Bezug: `E:\docs\specs\speichern-exportieren-req.md` (Soll-Zustand/Anforderungen, Abschnitte
zitiert als „Anforderung X.Y" bzw. „Testfall #" aus deren Abschnitt 6),
`E:\docs\specs\speichern-exportieren-code.md` (Code-Review-Befunde, zitiert als „Bug 1.1"–„1.7"),
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19/20/21.

Zweck dieser Datei: konkreter, abhakbarer Testplan, der Abschnitt 7 der Anforderungsdatei
(„Abnahmekriterium für Status „vorhanden"") tatsächlich erfüllt — nicht durch erneute
Behauptung, sondern durch benannte Testdateien, Testnamen und Prüfschritte auf zwei
Ebenen: (1) Unit-Tests für die Reader/Writer-Rundreise, (2) echte Playwright-Browser-Tests
mit tatsächlichen Klicks/Tastatureingaben/Datei-Uploads/-Downloads.

**Wichtiger Hinweis zum Ausführungszeitpunkt:** Die Code-Review-Datei weist mehrere
konkrete, noch **nicht behobene** Bugs nach (1.1–1.7). Ein Teil der hier definierten Tests
ist bewusst so geschrieben, dass er gegen den **aktuellen** Codestand **rot** ist (siehe
Abschnitt 6). Das ist beabsichtigt und kein Testplan-Fehler — diese Tests sind
Regressionstests für die in `speichern-exportieren-code.md` vorgeschlagenen Fixes und
müssen nach deren Umsetzung grün werden, bevor der Backlog-Status auf „vorhanden
(verifiziert)" wechseln darf.

---

## 0. Testphilosophie / Abgrenzung der beiden Ebenen

| Ebene | Zweck | Was sie **nicht** leisten kann |
|---|---|---|
| **Unit (Vitest + RTL)** | Schnelles, breites Prüfen der reinen Serialisierungslogik (`writeDocx`/`readDocx`, `writeOdt`/`readOdt`) sowie der `DocumentWorkspace`-Zustandslogik in Isolation (gemockte `module.exportFile`, gemocktes `URL.createObjectURL`). Deckt viele Formatierungs-/Struktur-Kombinationen günstig ab. | Beweist **nicht**, dass ein echter Klick auf „Exportieren" im Browser tatsächlich einen Dateidownload auslöst, dass `<a download>` korrekt funktioniert, dass kein Netzwerk-Request während des Exports stattfindet, oder dass die heruntergeladene Datei außerhalb der eigenen Test-Umgebung (jsdom) gültig ist. Ein Unit-Test, der `writeX()` gefolgt von `readX()` aufruft, prüft nur, dass Writer und Reader **sich selbst konsistent** sind — das exakte Risiko, das Abschnitt 19 der Feature-Spec und Abschnitt 2.3/7 der Anforderungsdatei als „Schreib- und Lesefehler gleichen sich gegenseitig aus" benennen. |
| **E2E (Playwright, echte Browser)** | Einziger Testtyp, der laut Abnahmekriterium (Anforderung, Abschnitt 7) zählt: „alle Testfälle aus Abschnitt 6 tatsächlich über echte Browser-Bedienung … grün". Treibt die App exakt wie eine Nutzerin: `page.getByRole(...).click()`, `page.keyboard.type(...)`, `input.setInputFiles(...)`, `page.waitForEvent('download')`, liest die tatsächlich auf Festplatte gelandete Datei per `node:fs`. | Ersetzt nicht die breite Formatierungs-Matrix der Unit-Tests (zu langsam für hunderte Kombinationen) und ersetzt nicht die externe Validierung außerhalb des Projekt-Codes (dafür reicht das bloße Wiedereinlesen mit `JSZip` im E2E-Test nicht, da `JSZip` auch vom Schreiber selbst verwendet wird). |

**Regel für diesen Plan:** Kein Testfall aus Abschnitt 6 der Anforderungsdatei gilt als
abgedeckt, nur weil eine interne Funktion (`writeDocx`, `handleExport`, `downloadBlob`)
direkt in einem Unit-Test aufgerufen wurde. Für jeden der 15 Testfälle muss mindestens
eine Zeile in der Traceability-Matrix (Abschnitt 5) auf eine **Playwright**-Spec verweisen.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 1.1 Bestehende Abdeckung (Ausgangsbasis — nicht neu zu schreiben, nur zu erweitern)

| Datei | Deckt bereits ab |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | Überschriften-Level, Absatzausrichtung, Zeichenformatierung (fett/kursiv/unterstrichen/durchgestrichen, kombiniert) via `writeDocx` → `readDocx`. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analoge Fälle für ODT, inkl. bestehendem Test „preserves merged cells (colspan/rowspan)" (Zeilen 194–209) — **dieser Test besteht aktuell trotz Bug 1.5, weil er nur gegen den eigenen `readOdt()` prüft; siehe 1.3 unten.** |
| `src/formats/docx/__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts` | Import-Robustheit gegen den realen POI-/ODF-Testkorpus (`tests/fixtures/external/{docx,odt}`). Nicht Export-fokussiert, aber relevante Ausgangsbasis für 1.4 unten. |
| `src/app/__tests__/DocumentWorkspace.test.tsx` | Grundfall Export → `onChange(dirty:false)`, Fehleranzeige bei werfendem `exportFile`, Schließen-Rückfrage bei `dirty`. **Deckt weder Doppelklick-Schutz (Bug 1.1) noch Race Condition während laufendem Export (Bug 1.2) ab.** |

### 1.2 Neue/erweiterte Unit-Tests je Bugfix-Ziel aus `speichern-exportieren-code.md`

| # | Datei | Neuer Test | Given/When/Then | Bezug |
|---|---|---|---|---|
| U1 | `src/app/__tests__/DocumentWorkspace.test.tsx` | `'ignores a second synchronous click while an export is already in flight'` | Zwei `fireEvent.click(button)` **ohne** `await`/`act`-Flush dazwischen (nicht `userEvent.click` zweimal mit await, das würde das Re-Render abwarten und den Bug verdecken) → `exportFile` darf nur **einmal** aufgerufen worden sein. | Bug 1.1, Anforderung 2.1, Testfall (Abschn. 3.5 Pkt. 2) |
| U2 | `src/app/__tests__/DocumentWorkspace.test.tsx` | `'does not clobber content edited while export is still pending'` | `exportFile` als steuerbares Deferred-Promise mocken (nicht sofort auflösen). Export anstoßen → **während** die Promise noch offen ist, Komponente mit neuem `document`-Prop (simulierter Edit, `dirty:true`, geänderter `content`) re-rendern → Promise aus dem Mock auflösen → `onChange` darf **nicht** mit `{ ...alterZustand, dirty:false }` aufgerufen werden; entweder gar nicht mehr aufgerufen oder mit dem **neuen** Content und weiterhin `dirty:true`. | Bug 1.2, Anforderung 2.3, 2.5 |
| U3 | `src/app/__tests__/DocumentWorkspace.test.tsx` | `'recovers when exportFile throws synchronously instead of rejecting'` | `exportFile: vi.fn(() => { throw new Error('kaputt') })` (kein `async`, keine Promise) → Fehleranzeige erscheint trotzdem, Button-Text kehrt zu „Exportieren" zurück, `disabled=false`. | Anforderung 2.1 (`finally`-Block in allen Codepfaden), Testfall 12 |
| U4 | `src/formats/docx/__tests__/roundtrip.test.ts` | `'writes explicit A4 page size and margins for a blank document'` | `writeDocx(createBlankWordDocument())` → resultierende `word/document.xml` (Blob zurück in Text lesen) enthält `<w:pgSz w:w="11906" w:h="16838"/>` und `<w:pgMar .../>`. | Bug 1.3, Anforderung 3.1 |
| U5 | `src/formats/odt/__tests__/roundtrip.test.ts` | `'declares one table-column per colspan unit, not per cell node'` | Tabelle mit erster Zeile `[{colspan:2}, {}]` (3 logische Spalten, 2 Zellknoten) → `writeOdt(...)` → generierte `content.xml` enthält **drei** `<table:table-column/>`-Elemente, nicht zwei. | Bug 1.4, Anforderung 5.2 |
| U6 | `src/formats/odt/__tests__/roundtrip.test.ts` | `'emits covered-table-cell placeholders for horizontal and vertical merges (ODF §9.1.1)'` | Tabelle mit horizontalem (`colspan:2`) **und** vertikalem (`rowspan:2`) Merge → `content.xml` parsen (DOMParser, nicht den eigenen Reader) → für **jede** `<table:table-row>` zählen: Anzahl `table:table-cell` + `table:covered-table-cell` muss exakt der deklarierten Spaltenanzahl (`table:table-column`-Count) entsprechen. Dies ist der Test, der den bestehenden „preserves merged cells"-Test (der nur über `readOdt()` prüft und den Bug deshalb verdeckt) ergänzt, nicht ersetzt. | Bug 1.5, Anforderung 2.3/5.2/5.3 dritter Punkt |
| U7 | `src/formats/docx/__tests__/roundtrip.test.ts` **und** `src/formats/odt/__tests__/roundtrip.test.ts` | `'compresses the generated package with DEFLATE (except the ODT mimetype entry)'` | Rohes Zip-Binärformat der erzeugten Blob lesen (kein `JSZip`, sondern die lokalen Zip-Dateikopf-Bytes direkt parsen: Compression-Methode steht 2 Bytes ab Offset 8 des Local File Headers; `0x00` = Stored, `0x08` = Deflate) → für `word/document.xml` bzw. `content.xml` muss `0x08` stehen; für den ODT-`mimetype`-Eintrag (muss laut ODF-Spec als allererster, unkomprimierter Eintrag stehen) weiterhin `0x00`. | Bug 1.6, Anforderung 3.3 |
| U8 | `src/lib/__tests__/useBeforeUnloadWarning.test.ts` (**neu**) | `'prevents default only while hasUnsavedWork is true'` + `'stops listening after unmount'` | `renderHook(({ dirty }) => useBeforeUnloadWarning(dirty), { initialProps: { dirty: true } })` → `window.dispatchEvent(new Event('beforeunload', { cancelable: true }))` → `event.defaultPrevented === true`. Rerender mit `dirty:false` → erneutes Dispatch → `defaultPrevented === false`. Unmount → Spy auf `removeEventListener` wurde mit demselben Handler aufgerufen. | Anforderung 2.5, Testfall 7 (Unit-Teil; E2E-Teil siehe Abschnitt 3) |

### 1.3 Externe Validierung außerhalb des projekteigenen Reader/Writer-Codes (Abnahmekriterium Abschnitt 7, dritter Punkt)

Ohne diesen Kanal ist **keiner** der Rundreise-Tests aussagekräftig für „echtes Office-Dokument", da `roundtrip.test.ts` sich selbst prüft (`writeX` → `readX`, dieselbe Codebasis).

| # | Datei | Werkzeug | Prüft |
|---|---|---|---|
| U9 | `src/formats/docx/__tests__/external-validation.test.ts` (**neu**) | `mammoth` (Dev-Dependency ergänzen; unabhängiger DOCX→HTML-Konverter ohne Codebezug zu `src/formats/docx`) | `writeDocx(...)` → `mammoth.convertToHtml({ buffer })` → HTML enthält `<h1>`-Überschrift, `<strong>`-Text und den erwarteten Fließtext. Deckt u. a. Bug 1.3 auf (mammoth ignoriert fehlendes `pgSz` nicht kritisch, aber der Test dient primär als unabhängiger Nachweis, dass die Datei überhaupt ein von einem Fremdparser interpretierbares OOXML-Dokument ist). |
| U10 | `src/formats/odt/__tests__/external-validation.test.ts` (**neu**) | `xmllint-wasm` gegen das offizielle OASIS-ODF-1.3-RelaxNG-/XSD-Schema | `writeOdt(...)` → `content.xml`/`styles.xml`/`manifest.xml` extrahieren → gegen Schema validieren → **muss** schemakonform sein. Dieser Kanal deckt Bug 1.5 (`covered-table-cell`) zuverlässig als Schemaverstoß auf, unabhängig von U6 — bewusst redundant, weil U6 eine projekteigene Zählung ist und U10 eine externe Schemaprüfung; beide sollen unabhängig grün sein. |
| U11 (optional, CI-Zusatz) | `.github/workflows/ci.yml`, neuer optionaler Schritt | `soffice --headless --convert-to txt` (LibreOffice) | Erzeugte `.odt`-Datei aus einem CI-Testlauf mit echter Office-Anwendung öffnen/konvertieren lassen → Text im Ergebnis enthält erwarteten Inhalt. Lokal übersprungen, falls `soffice` nicht installiert (`which soffice` prüfen); in CI verpflichtend, sobald eingerichtet. Erfüllt Abschnitt 7 „mindestens eine Validierung … außerhalb des projekteigenen Reader/Writer-Codes" auch für den Fall, dass U10 aus Zeitgründen zurückgestellt wird. |

**Reihenfolge-Hinweis:** U9–U11 sollten erst geschrieben werden, **nachdem** Bugs 1.3–1.5
behoben sind — sonst schlagen sie sofort fehl (was zulässig/beabsichtigt für die
Rot-Phase ist, siehe Abschnitt 6), aber der diagnostische Wert („extern bestätigt") ist
erst nach dem Fix erreicht.

### 1.4 Fixtures für die Unit-Ebene (Mindestabdeckung Anforderung 5.2)

Neue Datei `src/formats/shared/__tests__/fixtures/fullCoverageDocument.ts`: Eine
Builder-Funktion `buildFullCoverageContent(): WordDocumentContent` (gemeinsames internes
Modell, das sowohl `writeDocx` als auch `writeOdt` konsumieren), die **in einem Dokument**
alle in Anforderung 5.2 geforderten Elemente kombiniert:

- mehrere Absätze mit gemischter Zeichenformatierung (`strong`, `em`, `underline`,
  `strike`, `textColor`, `highlight`),
- eine Überschrift Level 1,
- eine `bullet_list` und eine `ordered_list`,
- eine Tabelle mit mind. 2 Zeilen/3 Spalten, einer verbundenen Zelle (`colspan:2`) **und**
  einer formatierten Zelle (fett),
- ein Bild (Data-URI, analog `TINY_PNG` in `docx/__tests__/roundtrip.test.ts`),
- Umlaute/Sonderzeichen im Fließtext (z. B. „Prüfüng äöüß").

Wird von U4–U7 sowie U9/U10 importiert (eine gemeinsame, in sich konsistente Vorlage statt
mehrerer Ad-hoc-Fixtures pro Test).

---

## 2. ECHTE Playwright-Browser-Tests

Diese Ebene ist der eigentliche Prüfmaßstab (Anforderung Abschnitt 7). **Kein** Testfall
hier darf sich auf `page.evaluate()`-Aufrufe interner App-Funktionen (`exportFile`,
`writeDocx`, `downloadBlob`) stützen, um Klicks/Tastatureingaben zu ersetzen. Zulässig ist
`page.evaluate()` ausschließlich zur **Beobachtung** von Browser-/DOM-Zustand (z. B.
`localStorage.length`, `performance.memory`, manuelles Dispatch eines `beforeunload`-Events
zur Prüfung von `defaultPrevented`, siehe 2.4.7) — niemals zum Umgehen einer echten
Bedienhandlung.

### 2.1 Infrastruktur-Vorbereitung (Refactor, vor den neuen Specs)

Aktuell definieren `tests/e2e/docx.spec.ts` und `tests/e2e/odt.spec.ts` ihre
Helper-Funktionen (`buildSampleDocx`/`buildSampleOdt`, `docxCard`/`odtCard`) lokal und
dupliziert. Für die neuen, formatübergreifenden Specs (2.3, 2.5, 2.6) werden diese Helper
mehrfach gebraucht.

**Neue Datei `tests/e2e/helpers/fixtures.ts`:**
- Verschiebt `buildSampleDocx`, `buildSampleOdt`, `docxCard`, `odtCard` hierher (Re-Export
  aus `docx.spec.ts`/`odt.spec.ts`, damit bestehende Importe/Tests unverändert bleiben).
- Ergänzt `buildFullCoverageDocx(): Promise<Buffer>` und `buildFullCoverageOdt(): Promise<Buffer>`
  — handgebaute Dateien (per `JSZip`, analog bestehendem Stil, **unabhängig** von
  `writeDocx`/`writeOdt`, da sie ja den **Import** der Ausgangsdatei A simulieren, siehe
  Anforderung Abschnitt 5) mit exakt der in Anforderung 5.2 geforderten Mindestabdeckung
  (Formatierungs-Mix, Überschrift, beide Listentypen, Tabelle mit Merge + formatierter
  Zelle, Bild, Umlaute). Inhaltlich analog zur Unit-Fixture aus 1.4, aber als rohe
  XML/Zip-Struktur, nicht als internes `WordDocumentContent`-Objekt — bewusst zwei
  unabhängige Repräsentationen derselben Anforderung.
- Ergänzt `buildLargeDocx(): Promise<Buffer>` / `buildLargeOdt(): Promise<Buffer>` für den
  Performance-Testfall (2.6): z. B. 25 eingebettete Bilder + eine 200-Zeilen/8-Spalten-Tabelle.

### 2.2 Testdatei-Übersicht

| Datei | Status | Testfälle (Abschnitt 6) | Bug-Bezug |
|---|---|---|---|
| `tests/e2e/docx.spec.ts` | erweitert | 8, 10 (teilweise) | 1.3, 1.4, 1.5 (indirekt über Rundreise) |
| `tests/e2e/odt.spec.ts` | erweitert | 9, 10 (teilweise) | 1.3, 1.4, 1.5 |
| `tests/e2e/save-export-lifecycle.spec.ts` | **neu** | 1, 2, 5, 6, 7, 10 (Grenzfall Dateiname ohne Endung), 11, 14, 15 | 1.1, 1.2, 1.6 |
| `tests/e2e/export-error-handling.spec.ts` | **neu** | 12 | — (siehe Grenzen in 2.7) |
| `tests/e2e/large-document-export.spec.ts` | **neu**, löst verwaisten Verweis aus Bug 1.7 auf | 13 | 1.6, 1.7 |
| `tests/e2e/network-isolation.spec.ts` | **neu** | (Anforderung 2.2, erster Punkt — kein separater nummerierter Testfall, aber explizit gefordert) | — |

### 2.3 `tests/e2e/docx.spec.ts` — neuer Test „round trip with full 5.2 minimum coverage"

```
test('round trip: full 5.2 minimum coverage — mixed formatting, heading, both list
types, merged/formatted table cell, image, umlauts in text and filename', async ({ page }) => {
```

Ablauf:
1. `buildFullCoverageDocx()` per `input.setInputFiles({ name: 'Bewerbung Müller (Entwurf).docx', ... })`
   hochladen (Umlaute/Sonderzeichen **im Dateinamen**, Anforderung 3.2/5.2).
2. Baseline erfassen: `.ProseMirror`-DOM-Zustand nach Import A prüfen — Text vorhanden,
   `<strong>`/`<em>`/`<u>`/`<s>`-Marks vorhanden (über `page.locator('.ProseMirror strong', ...)`
   o. ä., nicht nur Textstring), `ul`/`ol` beide vorhanden, Tabelle mit erwarteter
   Zeilen-/Spaltenzahl inkl. der verbundenen Zelle (`colspan`-Attribut oder sichtbare
   Zellbreite), `img`-Element mit gesetztem `src`.
3. **Ohne jede Bearbeitung** sofort `page.getByRole('button', { name: 'Exportieren' }).click()`
   bei gleichzeitig gesetztem `page.waitForEvent('download')`.
4. `download.suggestedFilename()` **exakt** gleich `'Bewerbung Müller (Entwurf).docx'`
   (Testfall 10).
5. Heruntergeladene Datei (`download.path()` → `fs.readFile`) als ZIP prüfen:
   `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/styles.xml` vorhanden.
6. Diese Datei **erneut** über denselben Datei-Upload-Input importieren (zweiter,
   unabhängiger `setInputFiles`-Aufruf — echter zweiter Upload, kein Wiederverwenden des
   In-Memory-Objekts).
7. Reimport-DOM-Zustand gegen Baseline aus Schritt 2 vergleichen: derselbe Text, dieselben
   Marks, beide Listentypen weiterhin vorhanden, Tabelle inkl. Merge weiterhin erkennbar,
   Bild weiterhin vorhanden. Kein stiller Textverlust (Abschnitt 5.3).
8. Optional/ergänzend: exportierte Datei zusätzlich durch `mammoth` schicken (dieselbe
   Hilfsfunktion wie U9, per Node-Import im Playwright-Test möglich, da Playwright-Tests
   in Node laufen) und Überschrift/fett im HTML-Ergebnis bestätigen — bindet die externe
   Validierung auch an den tatsächlichen Browser-Exportpfad, nicht nur an direkte
   `writeDocx()`-Aufrufe.

### 2.4 `tests/e2e/odt.spec.ts` — analoger Test für ODT

Gleicher Ablauf mit `buildFullCoverageOdt()`, Dateiname `Bewerbung Müller (Entwurf).odt`.
Zusätzlich ODT-spezifisch:
- `mimetype`-Eintrag ist der **erste** Eintrag im ZIP-Directory und exakt
  `application/vnd.oasis.opendocument.text` (Anforderung 2.3).
- `META-INF/manifest.xml` vorhanden und referenziert das Bild.
- Reimport-Vergleich analog Schritt 7 oben.
- Optional/ergänzend: `xmllint-wasm`-Schemaprüfung wie U10, angewendet auf die im Browser
  tatsächlich heruntergeladene Datei.

### 2.5 `tests/e2e/save-export-lifecycle.spec.ts` (neu) — Button-/Zustands-/Lifecycle-Testfälle

Struktur: `test.describe.each(['docx', 'odt'] as const)` oder zwei separate
`test.describe`-Blöcke (analog bestehendem Stil in `docx.spec.ts`/`odt.spec.ts`, über
`docxCard`/`odtCard` aus `helpers/fixtures.ts`), damit jeder Testfall für **beide** Formate
läuft, wo relevant.

| Testfall (Abschn. 6) | Testname | Ablauf |
|---|---|---|
| 1, 2 | `'exports a brand-new, untouched document and it re-imports as a valid empty document'` | „Neu erstellen" → **ohne** zu tippen sofort „Exportieren" klicken → `waitForEvent('download')` → Datei ist valides ZIP mit erwarteter Struktur (siehe 2.3/2.4 Schritt 5) → dieselbe Datei erneut hochladen → Editor zeigt leeres, aber bedienbares Dokument (ein leerer Absatz, kein Crash, `page.on('pageerror')` bleibt leer). |
| 5 | `'typing immediately after export (no click into editor) lands at the prior cursor position'` | Text tippen, Cursor per `ArrowLeft`-Wiederholungen an eine definierte Zwischenposition setzen → Export klicken (Download abwarten) → **ohne** erneuten Klick in den Editor sofort `page.keyboard.type('X')` → Text an der erwarteten Stelle prüfen (nicht am Ende/Anfang gelandet). |
| 6 | `'unsaved indicator disappears immediately after export and reappears after the next edit'` | Tippen → `page.getByText('● ungespeichert')` sichtbar → Export → Indikator sofort (ohne Reload) verschwunden → ein Zeichen tippen → Indikator wieder sichtbar. |
| 7 | `'beforeunload warning is suppressed right after export and re-armed after the next edit'` | Siehe detaillierte Umsetzung unten (2.5.1) — bewusst als eigener Unterabschnitt, da browserübergreifend nicht trivial. |
| 10 (Grenzfall) | `'keeps a filename without a matching extension unchanged on export'` | Upload einer Datei mit Namen ohne (oder falscher) Endung, z. B. `'Vertrag'` (roher Buffer aus `buildSampleDocx()`, aber mit `name: 'Vertrag'` statt `.docx`, siehe Anforderung 3.2 Grenzfall) → Export → `download.suggestedFilename() === 'Vertrag'` (unverändert, keine automatische Endungs-Korrektur — dokumentiert bestehendes, akzeptiertes Verhalten). |
| 11 | `'two consecutive exports without any change in between produce byte-identical files'` | Export einmal (Datei A speichern), **sofort** erneut Export klicken (Datei B) → `fs.readFile` beider Pfade → `Buffer.compare(a, b) === 0` (vollständiger Byte-Vergleich). Falls dieser Test fehlschlägt, weil ein Zeitstempel (`docProps/core.xml` bzw. ODT `meta.xml`) sich unterscheidet: **nicht** stillschweigend nur die betroffene Datei aus dem Vergleich ausschließen, sondern das explizit als eigenen Befund dokumentieren/melden (aktueller Kenntnisstand laut Code-Review: keiner der beiden Writer schreibt aktuell ein Änderungsdatum — der Test sollte diese Annahme absichern, nicht stillschweigend umgehen). |
| 14 | `'ten consecutive exports in the same tab without reload complete without error or leak'` | Schleife: 10× Export-Klick + `waitForEvent('download')`, jedes Mal Datei kurz validieren (nicht leer, gültiges ZIP) → nach der Schleife: `page.on('pageerror')`-Sammlung ist leer, alle 10 Downloads sind vollständige, valide Dateien. Zusätzlich (Chromium-Projekt „Desktop Chrome" only, da `performance.memory` nicht-standardisiert/nur Chromium): `page.evaluate(() => (performance as any).memory?.usedJSHeapSize)` vor und nach der Schleife vergleichen, großzügiger Schwellwert, **best effort** (kein hartes Fail-Kriterium auf Mobile/Tablet-Projekten, dort `test.skip` mit Begründung). |
| 15 | `'no confirmation dialog on closing after a clean export, unlike before it'` | Tippen → `page.on('dialog')`-Listener registrieren → „← Formate" klicken → Dialog erscheint (Rückfrage) → `dialog.dismiss()` (Abbrechen) → Editor bleibt offen → Export durchführen → „← Formate" erneut klicken → **kein** Dialog-Event innerhalb einer deterministischen kurzen Wartezeit (`page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)` liefert `null`) → Navigation zur Formatauswahl hat tatsächlich stattgefunden (`page.getByRole('heading', { name: /salamanido/i })` sichtbar). |

#### 2.5.1 Beforeunload-Test (Testfall 7) — Umsetzungsdetail

Zwei zulässige Techniken, in dieser Prioritätsreihenfolge:

1. **Bevorzugt, „echtester" Test:** `page.on('dialog', ...)`-Listener registrieren, dann
   `page.reload()` bzw. einen Navigationsversuch auslösen, der `beforeunload` real durch
   den Browser feuern lässt, und prüfen, ob ein Dialog vom Typ `beforeunload` auftritt.
   Muss pro Playwright-Projekt (`Desktop Chrome`, `Mobile` = Chromium, `Tablet` = WebKit,
   siehe `playwright.config.ts`) verifiziert werden, da sich das Verhalten von
   `beforeunload`-Dialogen zwischen Engines unterscheidet (Chromium zeigt einen nativen
   Dialog, den Playwright über `page.on('dialog')` abfangen kann; bei WebKit ggf. anderes
   Timing). Falls dies pro Engine zuverlässig funktioniert: **das** ist der Test.
2. **Fallback, falls (1) sich als browserübergreifend zu flaky erweist** (explizit als
   solcher im Test/Kommentar zu dokumentieren, nicht stillschweigend zu wählen): ein
   manuelles `window.dispatchEvent(new Event('beforeunload', { cancelable: true }))` über
   `page.evaluate` **nach** den echten Bedienschritten (Tippen/Exportieren per echtem
   Klick), und Prüfung von `event.defaultPrevented`. Dies testet weiterhin den echten,
   im Browser laufenden Event-Listener der App (`useBeforeUnloadWarning`), nicht eine
   interne Funktion — nur der Trigger-Mechanismus des Events ist synthetisch, nicht die
   vorangehende App-Bedienung.

Ablauf (unabhängig von Technik 1 oder 2): Dokument bearbeiten (`dirty:true`) → Warnung
aktiv nachweisen → Export (echter Klick, Download abwarten) → Warnung **nicht** mehr
aktiv → ein weiteres Zeichen tippen → Warnung wieder aktiv (Anforderung 2.5, exakter
Wortlaut des Testfalls in Abschnitt 6).

### 2.6 `tests/e2e/large-document-export.spec.ts` (neu) — Testfall 13, löst Bug 1.7 auf

```
test('exporting a large document (many images, large table) completes within budget
and keeps the UI responsive', async ({ page }) => {
```

- `buildLargeDocx()`/`buildLargeOdt()` (aus `helpers/fixtures.ts`, 2.1) hochladen, Ladezeit
  messen (`Date.now()` um den Upload/Render-Abschluss), Richtwert < 3 s (Feature-Spec 1.2)
  — informativ protokollieren, harte Grenze nur für den Export-Fall unten.
- Eine kleine Änderung vornehmen (ein Zeichen tippen), dann Export klicken; Zeitmessung
  vom Klick bis zum `download`-Event: **< 5000 ms** (Anforderung 3.3), harte Assertion.
- Während `exporting === true` (Button zeigt „Exportiere…", `disabled`): parallel eine
  **unabhängige** Interaktion versuchen (z. B. Hover/Fokus auf den „← Formate"-Button,
  Bounding-Box-Check bleibt stabil/reagiert auf Fokus) als Nachweis, dass die UI nicht
  vollständig eingefroren ist.
- Kein `page.on('pageerror')`, kein `page.on('crash')` während des gesamten Ablaufs.
- Ersetzt/erfüllt den in `external-fixtures.test.ts` (Bug 1.7) fälschlich referenzierten,
  nicht existierenden `tests/e2e/large-document-import.spec.ts` — nach Anlage dieser Datei
  muss der betroffene Kommentar in
  `src/formats/docx/__tests__/external-fixtures.test.ts` (Zeile 38f.) auf den tatsächlichen
  Dateinamen `large-document-export.spec.ts` korrigiert werden (Abgleich mit Dev, siehe
  Code-Review Abschnitt 1.7 „Fix").

### 2.7 `tests/e2e/export-error-handling.spec.ts` (neu) — Testfall 12, mit dokumentierter Einschränkung

Ein Serialisierungsfehler ist über reine UI-Bedienung nur schwer reproduzierbar, weil der
Editor strukturell kaum ein Dokumentmodell erzeugen kann, das den Writer zum Werfen bringt.
Zweistufiger Ansatz, beide Teile nötig, um Testfall 12 im Sinne des Abnahmekriteriums
(Abschnitt 7: „echte Browser-Bedienung") **und** pragmatisch abzudecken:

1. **Browser-Ebene, real auslösbarer Fehlerpfad:** Ein Bild einfügen, dessen
   Object-URL/Blob-Referenz vor dem Export ungültig gemacht wird (z. B. über
   `page.evaluate(() => URL.revokeObjectURL(...))` auf eine tatsächlich vom Bild-Insert
   erzeugte URL, **bevor** auf „Exportieren" geklickt wird) — ein realistischer, im Browser
   erreichbarer Zustand (keine synthetische App-interne Fehlerinjektion), der die
   `ImageCollector`-Logik beim Export zum Scheitern bringen kann. Falls dieser Pfad
   tatsächlich einen Fehler auslöst: sichtbare Fehlermeldung (`exportError`-Textfeld) statt
   stillem Fehlschlag/unbehandelter Exception prüfen, Button kehrt in bedienbaren Zustand
   zurück, `document.dirty` bleibt `true`.
2. **Falls (1) keinen zuverlässigen Fehler erzeugt** (abhängig davon, wie robust
   `ImageCollector` mit ungültigen Blob-URLs umgeht — muss beim Schreiben dieses Tests
   verifiziert werden): den entsprechenden Unit-Test U3 (Abschnitt 1.2 dieser Datei) als
   **komplementären, nicht gleichwertigen** Nachweis für die Komponentenebene betrachten
   und mit dem Entwicklungsteam klären, ob ein minimaler, ausschließlich für Tests
   aktivierter Hook (z. B. ein Build-Flag-gesteuerter `window.__testHooks__.forceExportError`,
   analog zu in anderen Projekten üblichen Test-Hooks) eingeführt werden soll, um Testfall
   12 zweifelsfrei auf echter Browser-Ebene abzudecken. **Dies ist als offener Punkt zu
   behandeln (siehe Abschnitt 7), nicht als bereits gelöst.**

### 2.8 `tests/e2e/network-isolation.spec.ts` (neu) — Anforderung 2.2, erster Punkt

```
test('exporting a document makes no network request carrying the document content', ...)
```

- `page.on('request', (req) => requests.push(req))` **vor** dem Export-Klick registrieren.
- Dokument bearbeiten, Export klicken, Download abwarten.
- Sammlung prüfen: keine Request mit `method() !== 'GET'` auf eine andere Origin als
  `baseURL`; keine Request, deren `postData()` Textfragmente aus dem Dokumentinhalt
  enthält. Ziel: nachweisen, dass die gesamte Erzeugung `Blob → Object-URL → <a download>`
  ist und **kein** Server kontaktiert wird (Kernversprechen laut `FormatPicker.tsx`).

---

## 3. Zusammenfassung neuer/erweiterter Dateien

| Datei | Ebene | Status |
|---|---|---|
| `src/formats/shared/__tests__/fixtures/fullCoverageDocument.ts` | Unit | neu |
| `src/app/__tests__/DocumentWorkspace.test.tsx` | Unit | erweitert (U1–U3) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Unit | erweitert (U4, U7) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Unit | erweitert (U5, U6, U7) |
| `src/formats/docx/__tests__/external-validation.test.ts` | Unit | neu (U9) |
| `src/formats/odt/__tests__/external-validation.test.ts` | Unit | neu (U10) |
| `src/lib/__tests__/useBeforeUnloadWarning.test.ts` | Unit | neu (U8) |
| `.github/workflows/ci.yml` | CI | optional erweitert (U11) |
| `tests/e2e/helpers/fixtures.ts` | E2E | neu (Refactor + neue Builder) |
| `tests/e2e/docx.spec.ts` | E2E | erweitert (2.3) |
| `tests/e2e/odt.spec.ts` | E2E | erweitert (2.4) |
| `tests/e2e/save-export-lifecycle.spec.ts` | E2E | neu (2.5) |
| `tests/e2e/large-document-export.spec.ts` | E2E | neu (2.6), löst Bug 1.7 auf |
| `tests/e2e/export-error-handling.spec.ts` | E2E | neu (2.7), mit dokumentierter Einschränkung |
| `tests/e2e/network-isolation.spec.ts` | E2E | neu (2.8) |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | — | Kommentarkorrektur (Bug 1.7) nach Anlage von 2.6 |

---

## 4. Fixture-Übersicht

| Builder/Datei | Format | Enthält | Verwendet von |
|---|---|---|---|
| `buildFullCoverageContent()` (`src/formats/shared/__tests__/fixtures/fullCoverageDocument.ts`) | intern (`WordDocumentContent`) | Formatierungs-Mix, Überschrift 1, beide Listentypen, Tabelle mit Merge + formatierter Zelle, Bild, Umlaute | U4–U7, U9, U10 |
| `buildFullCoverageDocx()` (`tests/e2e/helpers/fixtures.ts`) | rohes `.docx`-ZIP | dieselbe inhaltliche Abdeckung wie oben, unabhängig konstruiert | `docx.spec.ts` (2.3) |
| `buildFullCoverageOdt()` (`tests/e2e/helpers/fixtures.ts`) | rohes `.odt`-ZIP | dieselbe inhaltliche Abdeckung, ODT-Struktur | `odt.spec.ts` (2.4) |
| `buildLargeDocx()` / `buildLargeOdt()` (`tests/e2e/helpers/fixtures.ts`) | rohes ZIP | ~25 eingebettete Bilder, 200×8-Tabelle | `large-document-export.spec.ts` (2.6) |
| `buildSampleDocx()` / `buildSampleOdt()` (bestehend, verschoben nach `helpers/fixtures.ts`) | rohes ZIP | minimal (Überschrift + fett + Text) | bestehende Tests in `docx.spec.ts`/`odt.spec.ts`, `save-export-lifecycle.spec.ts` |

---

## 5. Traceability-Matrix (Anforderung Abschnitt 6 → Testebene → Datei)

| Testfall # | Beschreibung | Unit | E2E | Bug-Regression |
|---|---|---|---|---|
| 1 | Leeres DOCX exportieren/reimportieren | U4 (A4-Struktur) | `save-export-lifecycle.spec.ts` | 1.3 |
| 2 | Leeres ODT exportieren/reimportieren | — | `save-export-lifecycle.spec.ts` | — |
| 3 | Echter Download DOCX, valides ZIP/OOXML | — | `docx.spec.ts` (bestehend + erweiterte Struktur-Assertions) | — |
| 4 | Echter Download ODT, valides ZIP/ODF inkl. `mimetype` | — | `odt.spec.ts` (bestehend + erweiterte Struktur-Assertions) | — |
| 5 | Weitertippen nach Export ohne Klick | — | `save-export-lifecycle.spec.ts` | — |
| 6 | „● ungespeichert" verschwindet/erscheint | — | `save-export-lifecycle.spec.ts` | — |
| 7 | Beforeunload nach Export inaktiv/aktiv | U8 | `save-export-lifecycle.spec.ts` | — |
| 8 | DOCX-Rundreise Mindestabdeckung 5.2 | U4–U7, U9 | `docx.spec.ts` (2.3) | 1.3, 1.4, 1.5, 1.6 |
| 9 | ODT-Rundreise Mindestabdeckung 5.2 | U5–U7, U10 | `odt.spec.ts` (2.4) | 1.3, 1.4, 1.5, 1.6 |
| 10 | Sonderzeichen im Dateinamen (+ Grenzfall fehlende Endung) | — | `docx.spec.ts`/`odt.spec.ts` (2.3/2.4) + `save-export-lifecycle.spec.ts` (Grenzfall) | — |
| 11 | Zwei Exporte ohne Änderung → identisch | — | `save-export-lifecycle.spec.ts` | — |
| 12 | Erzwungener Fehler → sichtbare Meldung | U3 | `export-error-handling.spec.ts` (mit dokumentierter Einschränkung, Abschnitt 2.7) | — |
| 13 | Großes Dokument, Zeitbudget, kein Crash | — | `large-document-export.spec.ts` | 1.6, 1.7 |
| 14 | 10× Export ohne Reload, kein Leak | — | `save-export-lifecycle.spec.ts` | 1.1 (indirekt: kein doppelter Download pro Klick) |
| 15 | „← Formate" nach Export ohne Rückfrage | — | `save-export-lifecycle.spec.ts` | — |
| — | Kein Server-Request während Export (Anf. 2.2) | — | `network-isolation.spec.ts` | — |
| — | Kein doppelter Export bei Doppelklick | U1 | `save-export-lifecycle.spec.ts` (Testfall 14 deckt Symptom ab; expliziter Doppelklick-Test primär auf Unit-Ebene, da im Browser ein echter Doppelklick auf denselben Button laut Anforderung „muss standhalten" eher durch U1 zuverlässig reproduzierbar ist als durch Playwright-Timing) | 1.1 |
| — | Race Condition Edit-während-Export (Anf. 2.3/2.5) | U2 | (optional, falls in 2.6 durch Timing reproduzierbar — nicht als primärer Nachweis vorausgesetzt) | 1.2 |

---

## 6. Erwarteter Status vor/nach den Fixes aus `speichern-exportieren-code.md`

| Test | Vor Fixes (aktueller Codestand) | Nach Fixes |
|---|---|---|
| U1 (Doppelklick-Schutz) | **Rot** — kein `exportingRef`-Guard vorhanden | Grün |
| U2 (Race Condition) | **Rot** — kein `documentRef`-Snapshot-Vergleich | Grün |
| U4 (A4 `pgSz`) | **Rot** — `buildDocumentXml` schreibt kein `pgSz`/`pgMar` | Grün |
| U5 (colCount via colspan) | **Rot** — `colCount = rows[0]?.content?.length ?? 1` zählt Zellknoten, nicht Spalten | Grün |
| U6 (`covered-table-cell`) | **Rot** — Platzhalter fehlen vollständig | Grün |
| U7 (DEFLATE) | **Rot** — `generateAsync` ohne `compression: 'DEFLATE'` | Grün |
| U9 (mammoth) | Läuft vermutlich grün (mammoth ist tolerant), aber ohne Aussagekraft zu 1.3 solange dieser Bug besteht | Grün, jetzt mit Aussagekraft |
| U10 (xmllint-wasm) | **Rot** — Schemaverstoß durch Bug 1.5 | Grün |
| `docx.spec.ts` (2.3), `odt.spec.ts` (2.4) volle Abdeckung | **Rot** — Merge-Zellen-Teil scheitert an Bug 1.4/1.5 (ODT), ggf. auch am externen `mammoth`/`xmllint`-Zusatzcheck | Grün |
| `large-document-export.spec.ts` | Ggf. Rot/Grün abhängig von tatsächlicher Performance ohne Kompression (Bug 1.6) — muss gemessen werden, nicht angenommen | Sollte durch DEFLATE zuverlässiger unter dem 5s-Budget bleiben |

Alle anderen Tests in diesem Plan (U3, U8, `save-export-lifecycle.spec.ts` außer dem
DEFLATE-abhängigen Größenaspekt, `network-isolation.spec.ts`) sollten bereits **vor** den
Fixes grün sein, da sie bestehendes, korrektes Verhalten prüfen (`download.ts`,
`useBeforeUnloadWarning.ts` sind laut Code-Review bereits korrekt).

---

## 7. Offene Punkte / bekannte Grenzen

1. **Testfall 12 (erzwungener Serialisierungsfehler):** Kein zweifelsfrei rein UI-basierter
   Trigger identifiziert (siehe 2.7). Erfordert Abstimmung mit Dev, ob ein Test-only-Hook
   akzeptabel ist, oder ob der Unit-Test (U3) + der Best-Effort-Browser-Test (revozierte
   Bild-URL) als gemeinsam ausreichend gelten.
2. **Beforeunload-Test browserübergreifend (2.5.1):** Zuverlässigkeit von
   `page.on('dialog')` für `beforeunload` muss je Playwright-Projekt (`Desktop Chrome` =
   Chromium, `Mobile` = Chromium/Pixel 7, `Tablet` = WebKit/iPad Mini) verifiziert werden,
   bevor entschieden wird, ob Technik 1 oder der dokumentierte Fallback (Technik 2) zum
   Einsatz kommt.
3. **ODT-externe Validierung (U10/U11):** Wahl zwischen `xmllint-wasm` (rein npm-basiert,
   läuft in CI ohne Zusatzpaket) und optionalem LibreOffice-CLI-Schritt in `ci.yml` sollte
   vor Implementierung final entschieden werden — beide sind in diesem Plan als
   komplementär, nicht als Alternative mit „nur eine davon nötig" vorgesehen, aber U10
   allein erfüllt bereits das Abnahmekriterium in Abschnitt 7.
4. **`performance.memory`-Heap-Check (Testfall 14):** Nicht-standardisierte, nur in
   Chromium verfügbare API — als Best-Effort/weiche Assertion auf dem `Desktop
   Chrome`-Projekt zu behandeln, nicht als hartes Kriterium auf `Mobile`/`Tablet`.
5. **Byte-Determinismus (Testfall 11):** Falls sich beim Schreiben des Tests herausstellt,
   dass doch ein Zeitstempel geschrieben wird (aktueller Kenntnisstand: nein), muss die
   Anforderung an „inhaltlich identisch" mit dem PO/Anforderungsdokument abgeglichen
   werden, bevor der Vergleich auf einen Teilstring-/Whitelist-Vergleich abgeschwächt wird.

---

## 8. Ausführung

1. `npm run test` (Vitest) — schnelles Feedback, deckt Abschnitt 1 dieses Plans ab.
2. `npm run build && npm run test:e2e` (Playwright, alle drei Projekte aus
   `playwright.config.ts`: `Desktop Chrome`, `Mobile`, `Tablet`) — deckt Abschnitt 2 ab.
   Projektspezifische Einschränkungen (siehe Abschnitt 7, Punkte 2 und 4) sind über
   `test.skip(condition, reason)` mit explizitem Kommentar zu behandeln, nicht durch
   stillschweigendes Auslassen.
3. Backlog-Status `speichern-exportieren` darf erst nach vollständig grünem Durchlauf
   **beider** Ebenen (inkl. der in Abschnitt 6 als „Rot vor Fixes" markierten Tests, die
   dann grün sein müssen) sowie mindestens eines externen Validierungskanals (U10 oder
   U11) auf „vorhanden (verifiziert)" geändert werden — gemäß Anforderung Abschnitt 7.
