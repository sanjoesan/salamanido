# QA-Testplan: „Inhaltsverzeichnis aktualisieren"

Rolle dieses Dokuments: Testplan der QA-Instanz, nicht des Dev-Plans selbst. Geprüft gegen
`E:\docs\specs\inhaltsverzeichnis-aktualisieren-req.md` (Soll-Zustand, 15 Grenzfälle,
Rundreise-Anforderung Abschnitt 5) und `E:\docs\specs\inhaltsverzeichnis-aktualisieren-code.md`
(Umsetzungsplan, Stand 2026-07-04, gegen den Code geprüft). Zusätzlich gegen den tatsächlichen
Repo-Code selbst nachverifiziert (nicht nur aus den beiden Spezifikationsdateien übernommen):

- `grep -rniE "toc|table-of-content|inhaltsverzeichnis" src` liefert **keinen** Treffer — Feature
  ist bestätigt **noch nicht implementiert**. Dieser Plan ist vor/während der Umsetzung zu
  schreiben und nach Implementierung 1:1 auszuführen, nicht blind auf den im Code-Plan bereits
  vorgeschlagenen Testfällen (dortiger Abschnitt 14) zu vertrauen, sondern diese zu verifizieren,
  zu ergänzen und wo nötig zu widerlegen (siehe Abschnitt 0 unten — drei konkrete Zusatzbefunde).
- `for f in tests/fixtures/external/docx/*.docx; do unzip -p "$f" word/document.xml | grep -q
  TOC && echo "$f"; done` liefert **0 Treffer** über alle 127 vorhandenen DOCX-Fixtures — Befund
  „R1: keine reale, mit Word erzeugte DOCX-Datei mit TOC-Feld im Repo" aus dem Code-Plan
  (Abschnitt 0.2/17) ist **bestätigt**.
- `unzip -p tests/fixtures/external/odt/test1.odt content.xml | grep -o table-of-content`
  liefert **Treffer** — Befund „ODT-Fixtures mit echtem `text:table-of-content` liegen bereits
  vor" (`test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt`) ist ebenfalls **bestätigt**.
- `src/formats/shared/editor/Toolbar.tsx` (vollständig gelesen, aktueller Stand) hat kein
  ToC-Steuerelement — bestätigt Befund 4 aus der Anforderungsdatei. `select[aria-label=
  "Absatzformat"]` mit Optionen „Standard"/„Überschrift 1"–„Überschrift 6" ist das existierende,
  wiederverwendbare Steuerelement, mit dem E2E-Tests unten Überschriften erzeugen/umbenennen.
- `package.json`: `test` = `vitest run`, `test:e2e` = `playwright test`
  (`playwright.config.ts`: `testDir: './tests/e2e'`, `baseURL: 'http://localhost:4173/salamanido/'`).

Zwei verpflichtende, **getrennte** Testebenen, wie vom Auftrag gefordert:

1. **Unit-Tests Reader/Writer-Rundreise** (DOCX + ODT) — Vitest, direkter Aufruf von
   `writeDocx`/`readDocx`/`writeOdt`/`readOdt`, des neuen Moduls `src/formats/shared/toc.ts` und
   der neuen Commands, ohne Browser.
2. **ECHTE Playwright-Browser-Tests** — echte Klicks, echtes Tippen über `page.keyboard`, echter
   Datei-Upload über `input.setInputFiles(...)`, echter Download über
   `page.waitForEvent('download')` **und anschließende Inspektion der heruntergeladenen Datei**
   (JSZip gegen die reale ZIP/XML-Struktur) — **nicht** nur Aufrufe interner TypeScript-Funktionen
   innerhalb eines Browser-Kontexts (`page.evaluate(...)` auf `commands.ts`/`toc.ts`/`writer.ts`
   ist für diese Ebene **nicht zulässig**, siehe Abschnitt 0.3 zur direkten Konsequenz daraus für
   den ToC-Ausgangszustand in E2E-Tests).

**Determinismus (verbindliche Auftragsvorgabe, siehe ausformuliert Abschnitt 2.1a):** Kein
E2E-Test dieses Plans darf durch zu schnelle Tastatureingaben flackern. Die im Repo bereits
grün gelöste, asynchrone Selektions-Sync-Race (`tests/e2e/selection-regression.spec.ts`,
Kommentar Zeilen 26–33: nach einem nativen `End`/Klick erst `await page.waitForTimeout(50)`,
dann die nächste Taste) ist die maßgebliche Vorlage und wird von **jedem** ToC-Test 1:1
übernommen. Zustands-Prüfungen laufen ausschließlich über auto-wiederholende Web-First-
Assertions (`expect(locator).toContainText(...)`), nie über Sofort-Lesungen direkt nach einem
Klick.

Referenz-Infrastruktur im Repo, gegen die tatsächlichen Dateien verifiziert:
`tests/e2e/docx.spec.ts` (Helfer `buildSampleDocx()` — handgebautes DOCX per JSZip, unabhängig
vom eigenen Writer, zum Testen des Imports), `tests/e2e/odt.spec.ts`,
`tests/e2e/selection-regression.spec.ts` (Helper `docxCard(page)`/`odtCard(page)`, Muster „echter
Download → `download.path()` → `fs.readFile` → `JSZip.loadAsync` → String-Prüfung"),
`src/formats/docx/__tests__/{roundtrip,external-fixtures}.test.ts`, analog für ODT (beide
Verzeichnisse enthalten aktuell nur diese zwei Dateien). `src/formats/shared/__tests__/` existiert
als Verzeichnis, ist aber **leer** (Code-Plan Zusatzbefund B, Abschnitt 0.3) — `toc.test.ts` wird
dort die erste Datei.

---

## 0. Kritische Vorab-Befunde am Umsetzungsplan (vor Testausführung zu klären)

Vier Punkte, beim Gegenlesen von `inhaltsverzeichnis-aktualisieren-code.md` gefunden — keine
Spitzfindigkeiten, sondern sie bestimmen direkt, welche Testfälle unten als **Pflicht, scharf
formuliert** aufgenommen wurden.

### 0.1 Verdacht: `cachedPage`-Attribut sabotiert die „bereits aktuell"-Erkennung dauerhaft (Anforderung Abschnitt 1, Element 4)

Durchgerechnet gegen den im Code-Plan Abschnitt 4.2/3 gezeigten Pseudocode:

- `buildEntries()` (Code-Plan Abschnitt 3, Zeilen 393–401) erzeugt frische `toc_entry`-Knoten mit
  **ausschließlich** `attrs: { level, targetHeadingId }` — **kein** `cachedPage`-Feld.
- `attemptUpdateTableOfContents()` (Abschnitt 4.2) vergleicht
  `JSON.stringify(recomputed.content) === JSON.stringify(tocJson.content)`, um zwischen
  `'already-current'` und `'updated'` zu unterscheiden.
- Sobald ein ToC **einmal** re-importiert wurde (Abschnitt 9.4: „importierte `toc_entry`-Knoten
  enthalten … `cachedPage`") oder einmal exportiert und danach im selben Editor weiterbearbeitet
  wird, tragen die **bestehenden** `tocJson.content`-Einträge ein `cachedPage`-Attribut, während
  die frisch von `buildEntries()` erzeugten `recomputed.content`-Einträge dieses Attribut **nie**
  besitzen.
- **Konsequenz:** der `JSON.stringify`-Vergleich schlägt bei jedem einzelnen Klick auf
  „Aktualisieren" fehl, **auch wenn sich strukturell/textlich nichts geändert hat** — die
  Funktion würde immer `'updated'` statt des korrekten `'already-current'` zurückgeben, sobald
  ein ToC mindestens einmal die Reader-Seite durchlaufen hat. Das betrifft **genau** den in
  Anforderung Abschnitt 1 Element 4 verlangten Unterschied „Verzeichnis ist aktuell" vs. „wurde
  aktualisiert" — ein potenziell dauerhaft falsches UI-Signal, nicht nur ein kosmetisches Detail.
- **Pflicht-Testfall unten:** `UT-CMD-06`/`E2E-FEEDBACK-02` prüfen genau diesen Fall (ein bereits
  über Reader importierter oder einmal exportierter/reimportierter ToC, danach ohne jede
  Überschriften-Änderung erneut „Aktualisieren" geklickt → erwartete Meldung „ist bereits
  aktuell", nicht „wurde aktualisiert"). Schlägt der Test fehl, ist entweder die
  Vergleichslogik in `attemptUpdateTableOfContents` um eine Normalisierung (z. B. Vergleich ohne
  `cachedPage`) zu ergänzen, oder `buildEntries` muss `cachedPage` aus dem alten Eintrag
  übernehmen, bevor verglichen wird — vor Freigabe zu entscheiden und zu dokumentieren.

### 0.2 Bookmark-`w:id`-Eindeutigkeit über Überschriften **und** ToC-Container hinweg nicht spezifiziert

Der Code-Plan (Abschnitt 9.2/9.3) führt **zwei unabhängige** numerische `w:id`-Vergaberegeln ein:
ToC-Container-Bookmarks über `1000 + tocIndex` (Abschnitt 9.2, „Endgültige Struktur") und
Überschriften-Bookmarks über eine nicht weiter spezifizierte Funktion `bookmarkIdFor(headingId)`
(Abschnitt 9.3, „`bookmarkIdFor(headingId!)`" — Implementierung nirgends gezeigt). OOXML verlangt
**eindeutige** `w:id`-Werte für **alle** Bookmarks im Dokument gleichzeitig (nicht nur pro
Kategorie); kollidieren beide Vergabe-Schemata zufällig (z. B. `bookmarkIdFor` liefert ebenfalls
einen Wert `≥ 1000`), entsteht eine ungültige, von Word ggf. mit „Reparatur"-Dialog quittierte
Datei. **Pflicht-Testfall unten:** `UT-DOCX-W-04` prüft bei einem Dokument mit **mehreren**
Überschriften **und** mehreren ToCs, dass jedes `w:bookmarkStart/@w:id` im exportierten XML
**global eindeutig** ist (nicht nur pro Bookmark-Typ) — dieser Test steht **zusätzlich** zu den im
Code-Plan selbst vorgeschlagenen Tests (Abschnitt 14), da dort keine `w:id`-Eindeutigkeitsprüfung
vorgesehen ist.

### 0.3 Keine echte Insert-UI vorhanden + keine reale DOCX-ToC-Fixture (R1) — Konsequenz für den E2E-Ausgangszustand

Zwei Tatsachen zusammen begrenzen, wie ein ToC-Ausgangszustand in echten Playwright-Tests
**ohne** `page.evaluate`-Umgehung hergestellt werden kann:

- `inhaltsverzeichnis-einfuegen` (Schwester-Feature) liefert laut Code-Plan bewusst **keine**
  eigene Toolbar-UI (Abschnitt 4.4/Risiko R2) — die einzige In-App-Möglichkeit, einen `toc`-Knoten
  zu erzeugen, ist die interne Testhilfe `insertMinimalTableOfContents`, die **nicht** über die
  Toolbar erreichbar ist. Ein Playwright-Test dürfte sie nur über `page.evaluate(...)` aufrufen —
  das ist laut Testgrundsatz (Abschnitt 2.1 unten, identisch zu `seitenumbruch-qa.md`) für die
  E2E-Ebene **ausdrücklich unzulässig**.
- Für DOCX existiert zusätzlich **keine** reale, mit Word erzeugte Fixture mit TOC-Feld (R1,
  Abschnitt 0 oben, durch eigenen `unzip`-Lauf bestätigt).

**Konsequenz/Strategie dieses Plans:** Alle E2E-Tests, die einen bereits vorhandenen ToC als
Ausgangspunkt brauchen, verwenden ausschließlich **echte Datei-Uploads**, nicht die interne
Testhilfe:

- **ODT:** echte Fixtures `tests/fixtures/external/odt/test1.odt` (mehrere echte Überschriften +
  echtes `text:table-of-content`), `compdocfileformat.odt`, `excelfileformat.odt` — per
  `input.setInputFiles({ name: ..., buffer: await fs.readFile(...) })`, ein echter, unveränderter
  Upload einer vom Datenträger gelesenen Datei.
- **DOCX:** mangels realer Fixture ein **handgebautes** DOCX per JSZip (exakt dieselbe, im Repo
  bereits etablierte Technik wie `docx.spec.ts`s `buildSampleDocx()` — real gültiges XML, real
  hochgeladen über `input.setInputFiles`, **kein** `page.evaluate`), das ein klassisches
  `w:fldChar`/`w:instrText`-TOC-Feld über 2–3 `w:p`-Überschriften enthält. Das ist eine
  **legitime** echte Browser-Upload-Prüfung (deckt Reader-Robustheit und UI-Verdrahtung ab),
  ersetzt aber **nicht** die in Anforderung Abschnitt 6 Punkt 6 geforderte reale
  Word-erzeugte Fixture — dieser Unterschied ist im Abnahmeprotokoll (Abschnitt 4 unten)
  **explizit** als offener Punkt (R1) zu vermerken, nicht stillschweigend als gleichwertig zu
  behandeln.
- Für Szenarien, die **zwingend** einen frischen, leeren ToC ohne jede Vorgeschichte brauchen
  (z. B. Grenzfall 1 „Dokument ganz ohne Überschriften"), wird ebenfalls ein handgebautes
  Mini-DOCX/ODT mit einem leeren `w:fldChar`/`text:table-of-content`-Gerüst hochgeladen, nicht die
  interne Testhilfe.

### 0.4 Undo einer Aktualisierung nimmt implizit auch frisch vergebene `headingId`s zurück — Verhaltens-Randfall, nicht in Code-Plan-Testliste enthalten

Der Code-Plan begründet in Abschnitt 4.3 explizit, warum `attemptUpdateTableOfContents` einen
**Voll-Dokument**-`replaceWith` durchführt (auch neu vergebene `heading.headingId`-Werte müssen in
derselben Transaktion landen wie die neuen `toc_entry`s, sonst wäre Anforderung 3.10 „ein
einziger Undo-Schritt" verletzt). Das bedeutet aber auch: ein `Strg+Z` **direkt nach** der ersten
Aktualisierung setzt **auch** die gerade vergebenen `headingId`s zurück (`undefined`/`null`).
Klickt die Nutzerin danach **erneut** „Aktualisieren", vergibt `collectHeadings` **neue**, andere
`headingId`-Werte (der Generator ist zeit-/zufallsbasiert, Abschnitt 3, `generateHeadingId`) —
funktional unsichtbar für die Nutzerin (Anforderung: „keine Auswirkung auf Darstellung"), aber ein
Wert, der z. B. in einer bereits exportierten Datei als Bookmark-Name gecacht war, wäre danach
nicht mehr derselbe. **Testfall unten (`UT-TOC-09`/`E2E-EDGE-09`):** Undo direkt nach der
allerersten Aktualisierung eines frisch importierten/erstellten ToC, danach erneut aktualisieren
→ Verzeichnis bleibt inhaltlich korrekt (kein Crash, keine doppelten/fehlenden Einträge), auch
wenn die interne `headingId` sich dabei ändert — dokumentiert als bewusst akzeptierter
Seiteneffekt, sofern der Test zeigt, dass er **funktional folgenlos** bleibt.

### 0.5 Cross-Format-Anforderung (Req-Abschnitt 5.2, Punkte 5/6) ist mit der aktuellen App-UI nicht per echtem Browser-Test ausführbar

Identischer, bereits in `seitenumbruch-qa.md` Abschnitt 0.2 für das Schwester-Ticket
dokumentierter App-Befund, hier erneut gegen `src/app/DocumentWorkspace.tsx`/`FormatPicker.tsx`
bestätigt: Die App bietet **keine** Format-Konvertierungsfunktion; jede Karte ist starr an ihr
eigenes Format gebunden. Req-Abschnitt 5.2 Punkte 5/6 („Cross-Format DOCX→ODT→DOCX" und
umgekehrt) sind deshalb **nur auf Unit-Ebene** prüfbar (Abschnitt 1.10 unten), nicht als echter
Browser-E2E-Test — als dokumentierte Lücke geführt (Abschnitt 2.11), nicht stillschweigend
ausgelassen.

---

## 1. Testebene 1 — Unit-Tests Reader/Writer-Rundreise (DOCX + ODT)

Ausführung: `npm run test` (Vitest, jsdom).

### 1.1 `src/formats/shared/__tests__/toc.test.ts` (neu) — formatunabhängige Aktualisierungs-Logik

| ID | Testfall | Erwartung |
|---|---|---|
| UT-TOC-01 | `recomputeAllTablesOfContents` auf `doc([heading(1,'A'), heading(2,'B'), heading(4,'zu tief'), toc(3)])` | Einträge exakt `['A','B']` in Dokumentreihenfolge, Ebene-4-Überschrift ausgeschlossen (Anforderung 3.3/3.5) |
| UT-TOC-02 | Überschrift „B" nach einmaligem Aufbau entfernen, erneut aufrufen | Kein „Geister-Eintrag" für „B", Eintrag „A" behält seine ursprüngliche `targetHeadingId` (Anforderung 3.3, „gelöscht") |
| UT-TOC-03 | Zwei Überschriften mit identischem Text „Einleitung" | Zwei **getrennte** Einträge mit **unterschiedlicher** `targetHeadingId` (Grenzfall 8) |
| UT-TOC-04 | Überschriften-Reihenfolge im `doc` vertauschen (Ausschneiden+Einfügen simuliert durch Neuanordnung des Arrays) | ToC-Reihenfolge folgt der **neuen** Dokumentreihenfolge, nicht einer alten (Anforderung 3.3, „Reihenfolge geändert") |
| UT-TOC-05 | Überschrift zu `paragraph` degradiert (kein `heading`-Typ mehr) | Zugehöriger Eintrag verschwindet vollständig (Anforderung 3.3, „zurückgestuft") |
| UT-TOC-06 | `paragraph` zu `heading` hochgestuft (neuer Knoten) | Erscheint als neuer Eintrag (Anforderung 3.3, „hochgestuft") |
| UT-TOC-07 | `maxLevel: 3` konfiguriert, danach Ebene-5-Überschrift hinzugefügt, erneut aktualisiert | Ebene-5-Überschrift bleibt außerhalb; `toc.attrs.maxLevel` bleibt exakt `3` (nicht verändert) — Grenzfall 5 |
| UT-TOC-08 | Manuell in einen bestehenden `toc_entry.content` hineingeschriebener Text, danach `recomputeAllTablesOfContents` erneut aufgerufen | Manuelle Änderung wird **kommentarlos** durch den aus der Überschrift neu berechneten Text ersetzt (Anforderung 3.6/Grenzfall 13 — bewusstes Verhalten, keine Ausnahme einbauen) |
| UT-TOC-09 | Zwei unabhängige `toc`-Knoten mit unterschiedlichem `maxLevel` im selben Dokument | Aktualisieren des einen (`recomputeOneTableOfContents`) verändert **nicht** den Inhalt/`content` des anderen (Grenzfall 3) |
| UT-TOC-10 | Dokument **ohne** jeden `toc`-Knoten | `recomputeAllTablesOfContents` ist ein **Kein-Op** bezüglich `headingId`-Vergabe — keine Überschrift erhält eine neue `headingId` (Baseline-Voraussetzung für Req 5.1, deckt die im Code-Plan Abschnitt 9.3 selbst als „Korrektur" benannte Vorbedingung `findAllTocNodes(...).length > 0` ab) |
| UT-TOC-11 | Dokument ganz ohne Überschriften, aber mit einem `toc`-Knoten | `toc.content` wird zu `[]`; **kein** Absturz (Grenzfall 1) — Writer-seitige Darstellung des Platzhaltertexts wird separat in 1.4/1.7 geprüft, hier nur die reine Datenmodell-Seite |
| UT-TOC-12 | Überschrift ohne jeden Text (`content: []`) | Erzeugt trotzdem einen Eintrag mit leerem `content` (kein Wurf/Skip) — Grenzfall 7, Verhalten hier **festgeschrieben**, nicht nur vermutet |
| UT-TOC-13 | Sprung über Ebenen (Ebene 1 direkt gefolgt von Ebene 4) | Beide Einträge vorhanden mit ihrer jeweils **echten** `level` (`1` und `4`), **keine** künstlichen Zwischenebenen-Einträge erzeugt (Grenzfall 14) |
| UT-TOC-14 | Löschen einer Überschrift, deren `headingId` zuvor in einem `targetHeadingId` referenziert war | Kein Absturz, Eintrag verschwindet, keine verwaiste Referenz im restlichen Baum (Grenzfall 15) |
| UT-TOC-15 | Überschrift innerhalb eines `list_item`/einer Tabellenzelle (verschachtelter `content`-Baum) | Wird trotzdem korrekt in `collectHeadings` erfasst und erscheint im ToC (Anforderung 3.7 letzter Punkt/Grenzfall 4 — **kein** Crash, korrekte Text-/Ebenenerfassung trotz Nicht-Top-Level-Position) |
| UT-TOC-16 *(Performance, Grenzfall 6)* | Synthetisches Dokument mit 200 `heading`-Knoten + 1 `toc` | `recomputeAllTablesOfContents` bleibt in einer für einen einzelnen Testlauf vertretbaren Zeit (z. B. < 200 ms, projektüblicher Richtwert) abgeschlossen, alle 200 Einträge korrekt in Reihenfolge |

### 1.2 `src/formats/shared/editor/__tests__/commands.test.ts` (neu) — `findEnclosingToc`/`attemptUpdateTableOfContents`

| ID | Testfall | Erwartung |
|---|---|---|
| UT-CMD-01 | `findEnclosingToc(state)` mit Cursor innerhalb eines `toc_entry` | Liefert `{pos, node}` mit `node.type.name === 'toc'` |
| UT-CMD-02 | `findEnclosingToc(state)` mit Cursor im Haupttext, außerhalb jedes ToC | Liefert `null` |
| UT-CMD-03 | `attemptUpdateTableOfContents(view)` ohne jeden `toc`-Knoten im Dokument | Rückgabe `'not-found'`, **keine** Transaktion dispatcht (Grenzfall 2/Anforderung 3.11) |
| UT-CMD-04 | `attemptUpdateTableOfContents(view)` mit ToC, dessen Einträge bereits exakt dem aktuellen Überschriften-Stand entsprechen **und noch nie** über Reader/Export gelaufen sind (kein `cachedPage`) | Rückgabe `'already-current'`, **keine** Transaktion dispatcht |
| **UT-CMD-05** *(Pflicht, siehe 0.1)* | Wie UT-CMD-04, aber der ToC wurde zuvor **einmal** über `readOdt`/`readDocx` importiert (Einträge tragen `cachedPage`), Überschriften seither **unverändert** | Rückgabe **muss weiterhin** `'already-current'` sein — bei Rot ist die in Abschnitt 0.1 beschriebene Vergleichslogik vor jeder weiteren Abnahme zu korrigieren |
| UT-CMD-06 | `attemptUpdateTableOfContents(view)` mit tatsächlich geänderter Überschrift | Rückgabe `'updated'`, genau **eine** Transaktion dispatcht, `view.state.doc` enthält die neuen Einträge |
| UT-CMD-07 | Nach UT-CMD-06: genau **ein** `undo()` | Dokument (inkl. ToC-Inhalt) entspricht exakt dem Zustand vor dem Klick — Anforderung 3.10, „ein einziger Undo-Schritt" |
| UT-CMD-08 | Nach UT-CMD-07 (Undo) erneut `attemptUpdateTableOfContents(view)` aufrufen | Kein Crash, Einträge inhaltlich korrekt — deckt Abschnitt 0.4 ab (neu vergebene `headingId`s nach Undo funktional folgenlos) |
| UT-CMD-09 | Zwei ToCs im Dokument, Cursor in ToC Nr. 2 → `attemptUpdateTableOfContents` | **Nur** ToC Nr. 2 verändert sich; ToC Nr. 1 bleibt Objekt-identisch/inhaltsgleich (Grenzfall 3) |
| UT-CMD-10 | `insertMinimalTableOfContents(3)` (interne Testhilfe) mit leerer Selektion | Erzeugt einen `toc`-Knoten mit `maxLevel: 3`, `content: []` an der Cursor-Position — **nur** als Vorbereitungshilfe für weitere Unit-Tests genutzt, nicht als Ersatz für eine E2E-Insert-UI (Abschnitt 0.3) |

### 1.3 `pagination.test.ts` — Erweiterung um `pageNumberForTopLevelIndex`

Bestehende Tests **müssen unverändert grün bleiben** (Baseline).

| ID | Testfall | Erwartung |
|---|---|---|
| UT-PAG-01 | `pageNumberForTopLevelIndex(0, [5, 10])` | `1` |
| UT-PAG-02 | `pageNumberForTopLevelIndex(7, [5, 10])` | `2` |
| UT-PAG-03 | `pageNumberForTopLevelIndex(12, [5, 10])` | `3` |
| UT-PAG-04 | `pageNumberForTopLevelIndex(idx, [])` (kein einziger Umbruch) | `1` für jeden `idx` |
| UT-PAG-05 | `computeHeadingPageApprox`-Äquivalent: Überschrift innerhalb einer Tabellenzelle (kein Top-Level-Kind von `doc`) | Erhält **keinen** Eintrag in der zurückgegebenen Map (kein Crash) — Grenzfall 4, wird von 8.3 des Code-Plans so vorgesehen, hier **explizit** festgehalten statt implizit angenommen |

### 1.4 DOCX-Export — Unit-Test gegen `writeDocx`/`tocBlockToDocx` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-DOCX-W-01 | `toc`-Knoten mit 2 Einträgen, `maxLevel: 3` | XML enthält genau ein `<w:fldChar w:fldCharType="begin"` … `<w:instrText>` mit Inhalt `TOC \o "1-3" \h \z \u` (oder äquivalent) … `<w:fldChar w:fldCharType="separate"/>` … Anzeigetext beider Einträge … `<w:fldChar w:fldCharType="end"/>` — vollständiges Feld-Tripel, **kein** `<w:sdt>`-Wrapper (endgültige Entscheidung Abschnitt 9.1/9.2 des Code-Plans — falls doch ein `<w:sdt>` im Output auftaucht, ist das ein direkter Widerspruch zur eigenen, im selben Dokument getroffenen Entscheidung und ein Blocker) |
| UT-DOCX-W-02 | ToC mit `dirty: true` vs. `dirty: false` | `w:dirty="1"` bzw. `w:dirty="0"` exakt am `fldChar[begin]`-Element, konsistent mit der in Code-Plan Abschnitt 15 dokumentierten Entscheidung |
| UT-DOCX-W-03 | ToC mit `content: []` (keine einschließbaren Überschriften) | XML enthält den Platzhaltertext „Keine Überschriften gefunden" statt eines leeren `w:p`-Rumpfs (Grenzfall 1/Anforderung 3.11) |
| **UT-DOCX-W-04** *(Pflicht, siehe 0.2)* | Dokument mit **3 Überschriften und 2 unabhängigen ToCs** | Jeder `w:bookmarkStart/@w:id`-Wert im gesamten exportierten `document.xml` ist **global eindeutig** (kein doppelter numerischer Wert, egal ob Überschrift oder ToC-Container) — bei Rot: OOXML-Korruptionsrisiko, vor Freigabe zu beheben |
| UT-DOCX-W-05 | Überschrift **ohne** `headingId` (Dokument ganz ohne ToC) | **Kein** `w:bookmarkStart`/`w:bookmarkEnd` um diese Überschrift (Abschnitt 9.3-Korrektur des Code-Plans — Baseline-Absicherung, siehe UT-DOCX-RT-06) |
| UT-DOCX-W-06 | ToC-Eintrag mit `level: 2` vs. `level: 1` | Unterschiedlicher `<w:ind w:left="…">`-Wert, `level 2` stärker eingerückt als `level 1`, linear skalierend (Anforderung 3.6) |
| UT-DOCX-W-07 | Kein Eintrag hat einen bekannten `cachedPage`-Wert (frischer, nie exportierter ToC) | PAGEREF-Feldergebnis fällt auf den dokumentierten Platzhalter `'1'` zurück, kein Crash (Anforderung 3.7, „plausibler Platzhalterwert genügt") |

### 1.5 DOCX-Import — Unit-Test gegen `readDocx`/`parseTocField` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-DOCX-R-01 | Synthetisches XML mit klassischem `w:fldChar`/`w:instrText`-TOC-Tripel (analog zu `UT-DOCX-W-01`s Output) | Ergebnis enthält einen `toc`-Knoten mit korrekt erkannten Einträgen (Text, `level` aus `<w:ind>`-Rückrechnung), `targetHeadingId: null` (Abschnitt 9.4, „bleibt beim reinen Import zunächst null") |
| UT-DOCX-R-02 | Dasselbe XML, zusätzlich mit `w:bookmarkStart`/`-End` um die referenzierten Überschriften-Absätze (eigene Erzeugungskonvention) | `heading.attrs.headingId` wird aus dem Bookmark-Namen übernommen (stabile Korrelation über Baseline-Rundreise, Abschnitt 9.4 letzter Absatz) |
| UT-DOCX-R-03 | Synthetisches XML mit `w:sdt`/`w:docPartGallery w:val="Table of Contents"`-Variante (Abschnitt 9.1, „Reader erkennt zusätzlich") | Wird ebenfalls als `toc`-Knoten erkannt — **explizit als rein synthetisch getesteter Fall markieren** (nicht gegen eine reale Fixture verifiziert, R1) |
| UT-DOCX-R-04 | Absichtlich unvollständiges/beschädigtes Feld-Tripel (z. B. `fldChar[begin]` ohne zugehöriges `[end]`) | **Kein** Absturz; Fallback laut Anforderung Abschnitt 18 (kein stiller Totalverlust) — das tatsächlich gewählte Fallback-Verhalten wird hier **festgeschrieben**, nicht nur vermutet |
| UT-DOCX-R-05 | Dokument **ohne** jedes TOC-Feld (gewöhnliche Absätze) | Kein `toc`-Knoten im Ergebnis, **keine** `headingId`/Bookmark-Attribute an irgendeiner Überschrift (Baseline) |

### 1.6 DOCX-Rundreise (Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts`)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-DOCX-RT-01 | ToC + 2 Überschriften, unverändert → Rundreise | `maxLevel`, Eintragsanzahl, Text, Ebene bleiben erhalten; Ergebnis-Knoten ist weiterhin `type === 'toc'`, **nicht** zu `paragraph`s degradiert (Anforderung 3.9/Req 5.2.1 Rest-Teil) |
| UT-DOCX-RT-02 | Überschrift **umbenennen** → `attemptUpdateTableOfContents`-Äquivalent (`recomputeAllTablesOfContents`) → Rundreise | ToC-Eintrag zeigt neuen Text nach Reimport (Req 5.2.1) |
| UT-DOCX-RT-03 | Neue Überschrift **hinzufügen** (nicht am Ende) → aktualisieren → Rundreise | Neuer Eintrag an der **richtigen Position** in der Reihenfolge (Req 5.2.3) |
| UT-DOCX-RT-04 | Überschrift **löschen** → aktualisieren → Rundreise | Entsprechend verkürzter Eintrags-Bestand, kein Geister-Eintrag (Req 5.2.4) |
| UT-DOCX-RT-05 | Absatz mit **eigenem Text**, der zugleich Ziel eines ToC-Eintrags ist (Bookmark trägt Text + `w:t`) → Rundreise | Überschriftentext **und** ToC-Eintragstext beide vollständig erhalten — Analogiefall zum in `seitenumbruch-qa.md` Abschnitt 0.1 gefundenen Text-vor-Feld-Verlustmuster; hier **eigens** verifiziert, nicht nur analog angenommen |
| UT-DOCX-RT-06 | Baseline-Gegenprobe: Dokument **ohne** jeden `toc`-Knoten → Rundreise | **Kein** neues Attribut (`headingId`) an irgendeiner Überschrift nach Reimport, **kein** `toc`-Knoten „aus dem Nichts" (Req 5.1.1, Anforderung 3.2 Punkt 2 Gegenprobe) |
| UT-DOCX-RT-07 | Zwei unabhängige ToCs → nur einen aktualisieren → Rundreise | Nur der aktualisierte ToC zeigt neuen Inhalt, der zweite bleibt exakt wie vor der Aktualisierung (Req 5.2.9/Grenzfall 3) |

### 1.7 DOCX — reale Fremddatei-Fixtures (neu: `src/formats/docx/__tests__/toc-fixtures.test.ts`)

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-DOCX-FIX-01 *(blockiert durch R1)* | — | Import einer **echten**, mit Microsoft Word erzeugten DOCX-Datei mit TOC-Feld | **Nicht ausführbar**, solange keine solche Fixture im Repo vorliegt — als offener Punkt (nicht „bestanden") im Abnahmeprotokoll zu führen, siehe Abschnitt 4 |
| UT-DOCX-FIX-02 | beliebige bestehende Fixture ohne TOC (z. B. `60329.docx`, bereits im Baseline-Test des Seitenumbruch-Tickets verwendet) | `readDocx(buffer)` nach dieser Feature-Einführung | Ergebnis weiterhin **ohne** `toc`-Knoten, **ohne** neue `headingId`-Attribute — Regressionsschutz, dass das neue Feature bestehende Fixtures nicht verändert |

### 1.8 ODT-Export — Unit-Test gegen `writeOdt`/`tocBlockToOdt`/`styleRegistry` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-ODT-W-01 | `toc`-Knoten mit 2 Einträgen, `maxLevel: 2` | Erzeugtes `<text:table-of-content text:protected="true">` mit `<text:table-of-content-source text:outline-level="2">`, Entry-Templates für Ebene 1–2, gefülltem `<text:index-body>` mit beiden Einträgen |
| UT-ODT-W-02 | ToC mit `content: []` | Platzhaltertext „Keine Überschriften gefunden" im `text:index-body` (Grenzfall 1) |
| UT-ODT-W-03 | Überschrift **mit** `headingId` | `<text:bookmark-start text:name="SalamanidoHeading_<id>">`/`-end` um den `<text:h>`-Absatz, ToC-Eintrag verlinkt via `<text:a xlink:href="#SalamanidoHeading_<id>">` auf **dieselbe** Kennung (Abschnitt 11.2) |
| UT-ODT-W-04 | Überschrift **ohne** `headingId` (kein ToC im Dokument) | **Kein** `text:bookmark-start`/`-end` erzeugt (Baseline-Absicherung, analog UT-DOCX-W-05) |
| UT-ODT-W-05 | Zwei ToCs, mehrere Überschriften | Alle `text:bookmark`-Namen sind eindeutig (abgeleitet aus `headingId`, kollisionsfrei per Konstruktion — Gegenprobe zu UT-DOCX-W-04, da ODT anders als DOCX **keine** numerischen IDs, sondern Namens-Eindeutigkeit braucht) |
| UT-ODT-W-06 | `tocEntryStyleDefs(maxLevelSeen)` | Erzeugt `Contents_20_N`-Stile mit stufenweise wachsendem `fo:margin-left` für jede tatsächlich vorkommende Ebene, plus `Contents_20_Heading` |

### 1.9 ODT-Import — Unit-Test gegen `readOdt`/`parseTocElement` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-ODT-R-01 | Synthetisches XML mit `text:table-of-content`, eigener `text:bookmark`-Konvention (wie von UT-ODT-W-03 erzeugt) | Ergebnis-`toc`-Knoten mit korrekt aufgelöster `targetHeadingId` je Eintrag (Bookmark-Pfad, Abschnitt 11.3, erster Zweig) |
| **UT-ODT-R-02** *(reale Konvention, siehe Zusatzbefund A)* | Synthetisches XML mit `<text:a xlink:href="#1.1.Abstract|outline">` (reale LibreOffice-`\|outline`-Konvention, **nicht** `text:bookmark`) | Wird über den **Fallback**-Zweig (Textabgleich nach Abschneiden von `\|outline`) korrekt aufgelöst — deckt exakt die in `test1.odt` real beobachtete Konvention ab, nicht nur die eigene |
| UT-ODT-R-03 | `text:table-of-content-source` fehlt/ist beschädigt | Fallback: sichtbarer Text wird als gewöhnliche `paragraph`-Folge übernommen, **kein** stiller Totalverlust, aber Feld-Charakter geht in diesem Fall bewusst verloren (Abschnitt 11.4, dokumentierter Grenzfall) |
| UT-ODT-R-04 | Dokument **ohne** jedes `text:table-of-content` | Kein `toc`-Knoten, keine `headingId`-Vergabe (Baseline) |

### 1.10 ODT-Rundreise (Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`)

Analog zu 1.6 (DOCX), IDs `UT-ODT-RT-01`–`UT-ODT-RT-07`, inhaltlich identische Fallabdeckung
(unverändert/umbenannt/hinzugefügt/gelöscht/Text-neben-Bookmark/Baseline/zwei-ToCs).

### 1.11 ODT — reale Fremddatei-Fixtures (neu: `src/formats/odt/__tests__/toc-fixtures.test.ts`)

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-ODT-FIX-01 | `test1.odt` | `readOdt(buffer)` | `body.content` enthält mindestens einen `toc`-Knoten mit `maxLevel === 6` (aus `text:outline-level="6"`), Eintragstext „Abstract" ist unter den Einträgen wiederzufinden, **kein** Absturz |
| UT-ODT-FIX-02 | `compdocfileformat.odt` | `readOdt(buffer)` | `toc`-Knoten mit `maxLevel === 2` (`text:outline-level="2"`), kein Absturz |
| UT-ODT-FIX-03 | `excelfileformat.odt` | `readOdt(buffer)` | Analog, `toc`-Knoten vorhanden, kein Absturz |
| UT-ODT-FIX-04 | `test1.odt` | Reimport → Überschrift „Abstract" in `attemptUpdateTableOfContents`-Äquivalent umbenennen → `writeOdt` → erneut `readOdt` (volle Rundreise mit Fremddatei) | Neuer Text erscheint im ToC-Eintrag, ToC bleibt als `type: 'toc'`-Knoten erkennbar (Req 5.2.8) |
| UT-ODT-FIX-05 | `test1.odt` **unverändert** hochladen → sofort `writeOdt` (kein Aktualisieren-Aufruf) → `readOdt` | ToC bleibt inhaltlich **und** als Feld identisch erhalten (Req 5.1.3/5.1.4-Äquivalent für ODT, reine Grundlagen-Rundreise vor jeder Aktualisierung) |

### 1.12 Cross-Format-Kette auf Unit-Ebene (neu: `src/formats/shared/__tests__/toc-crossformat.test.ts`)

Deckt Req-Abschnitt 5.2 Punkte 5/6 ab — einzige heute technisch mögliche Prüfung (Begründung
Abschnitt 0.5).

| ID | Testfall | Erwartung |
|---|---|---|
| UT-XFMT-01 | ToC + 2 Überschriften, eine umbenannt → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | ToC bleibt über beide Formatwechsel als `toc`-Knoten mit korrektem, umbenanntem Eintrag erhalten (Req 5.2.5) |
| UT-XFMT-02 | Umgekehrte Kette: → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Analog (Req 5.2.6) |
| UT-XFMT-03 | Zwei ToCs, Kette DOCX→ODT→DOCX | Beide ToCs bleiben getrennt und inhaltlich korrekt über beide Konvertierungen (keine kumulative Verschlechterung/Vermischung) |

### 1.13 Baseline-Regression (Anforderung 5.1)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-BASE-01 | Alle **bestehenden** Tests in `docx/__tests__/{roundtrip,external-fixtures}.test.ts`, `odt/__tests__/{roundtrip,external-fixtures}.test.ts`, `shared/editor/__tests__/pagination.test.ts` | Bleiben nach allen Änderungen **unverändert grün** |
| UT-BASE-02 | `npm run build` (`tsc -b`) | Läuft fehlerfrei durch, insbesondere nach den Signaturänderungen an `blockToDocx`/`blockToOdt`/`readBodyChildren`/`elementToBlocks` |
| UT-BASE-03 | Alle 100+ vorhandenen DOCX-Fixtures **ohne** TOC-Bezug (`tests/fixtures/external/docx/*.docx`, außer den 7 bereits bekannten Feldcode-Dateien) via `readDocx` einlesen | **Kein** Absturz, **kein** neuer `toc`-Knoten „erfunden", **keine** neuen `headingId`/Bookmark-Attribute (Req 5.1.5, „kein neuer Node-Typ darf beim reinen Reimport ungewollt auftauchen") |

---

## 2. Testebene 2 — ECHTE Playwright-Browser-Tests

### 2.1 Testgrundsatz (verbindlich für alle Tests dieser Ebene)

Jeder Test in diesem Abschnitt **muss** ausschließlich über öffentlich sichtbare
Browser-Interaktion laufen: Klicks über `page.getByRole('button', {...})`/`page.getByTitle(...)`,
Tastatureingaben über `page.keyboard.type(...)`/`page.keyboard.press(...)`, Datei-Uploads über
`input.setInputFiles({...})` auf das reale `<input type="file">`, Downloads über
`page.waitForEvent('download')` + `download.path()` + tatsächliches Einlesen der Datei von der
Festplatte (`fs.readFile`) + `JSZip.loadAsync(...)` gegen die **reale** ZIP/XML-Struktur.

**Nicht zulässig:** `page.evaluate(() => insertMinimalTableOfContents()(...))`, direkte Imports
von `commands.ts`/`toc.ts`/`writer.ts` innerhalb eines E2E-Specs, oder jede andere Umgehung der
echten UI — siehe Abschnitt 0.3 zur direkten Konsequenz für den ToC-Ausgangszustand (echte
Datei-Uploads statt interner Testhilfe).

### 2.1a Determinismus-Disziplin (verbindlich für JEDEN Test dieser Ebene)

Nicht optional. Diese fünf Regeln adressieren genau die im Repo bereits dokumentierte,
asynchrone Selektions-Sync-Race (`tests/e2e/selection-regression.spec.ts`, Kommentar Zeilen
26–33) sowie zwei beim Gegenlesen dieses Plans gefundene Race-/Korrektheitsfehler in den
zuerst skizzierten Testschritten. Die dortige, bereits grüne Lösung ist die maßgebliche
Vorlage; jeder neue ToC-Test übernimmt sie unverändert.

**Regel D1 — Nach jedem nativen Cursor-/Selektionswechsel WARTEN, bevor die nächste Taste
kommt.** ProseMirror erfährt eine native, per Tastatur/Klick ausgelöste Cursorbewegung
(`End`, `Home`, Pfeiltasten, Klick zum Neupositionieren, Dreifachklick) nur über das
**asynchrone** `selectionchange`-Event des Browsers. Feuert der Test die Folgetaste sofort
(wie jede `press()`-Sequenz ohne menschliche Reaktionszeit), kann sie dem Sync zuvorkommen
und auf der **alten** Position wirken. Zwingend deshalb zwischen einem nativen
Positionswechsel und der nächsten wirkungsabhängigen Taste:

```ts
await editor.click()                // oder press('End')/('Home')/Dreifachklick
await page.waitForTimeout(50)        // exakt der etablierte 50-ms-Puffer aus selection-regression.spec.ts
await page.keyboard.press('Enter')   // erst jetzt sicher auf der neuen Position
```

Das ist **kein** willkürliches `sleep`, sondern der im Repo bereits verwendete, begründete
50-ms-Puffer für genau diese Race — er darf nicht wegoptimiert werden. Er gilt genauso vor
dem `F9`-Auslöser und vor dem „Aktualisieren"-Klick, wenn diesen unmittelbar ein
Klick/Cursorwechsel vorausging.

**Regel D2 — Zustands-Assertions ausschließlich über auto-wiederholende Web-First-
Assertions.** Nach „Aktualisieren"/`F9` wird der geänderte ToC-Text nur über
`await expect(locator).toContainText(...)`/`toHaveText(...)` geprüft (Playwright wiederholt
bis zum Timeout), **niemals** über ein einmaliges `await locator.textContent()` unmittelbar
nach dem Klick. Erscheinen/Verschwinden der Rückmeldung (Abschnitt 2.4) wird über
`expect(...).toBeVisible()`/`toBeHidden({ timeout })` geprüft, nicht über feste Wartezeiten.
Der ProseMirror-Dispatch selbst ist zwar synchron, die React-Rückmeldung und ein evtl.
`onChange`-Round-Trip zum Eltern-Zustand sind es aber nicht — die auto-retrying Assertion
deckt beides deterministisch ab.

**Regel D3 — Vor einer Folgeaktion, die vom aktualisierten ToC abhängt, das Landen der
Aktualisierung nachweislich abwarten.** Wo ein Test nach „Aktualisieren" **sofort** eine
weitere Aktion auslöst (v. a. `E2E-EDGE-09`: Aktualisieren → Undo → Aktualisieren), wird
zwischen den Schritten zuerst der sichtbare Zielzustand per `expect(...)` bestätigt (die
Aktualisierung ist damit beweisbar im DOM angekommen), erst danach folgt `ControlOrMeta+Z`.
Ein „sofort" ohne zwischengeschaltete Assertion ist unzulässig — es wäre exakt die Art
Timing-Abhängigkeit, die dieser Auftrag ausschließt.

**Regel D4 — Eine einzelne Überschrift umbenennen, ohne das ganze Dokument zu treffen
(Korrektur eines Fehlers in den ersten Testskizzen).** `ControlOrMeta+a` löst in ProseMirror
über `baseKeymap` ein `selectAll` über das **gesamte** Dokument aus (nicht zeilenweise — im
Code gegen `WordEditor.tsx`/`baseKeymap` verifiziert). Es anschließend zu übertippen würde
das komplette Dokument inklusive ToC und aller anderen Überschriften löschen und den Test
sinnlos machen. Zum Umbenennen **einer** Überschrift daher zeilenweise selektieren und dabei
D1 beachten:

```ts
await headingLine.click()
await page.waitForTimeout(50)
await page.keyboard.press('Home')
await page.waitForTimeout(50)
await page.keyboard.press('Shift+End')   // markiert nur diese eine Zeile
await page.keyboard.type('Neuer Text')   // ersetzt nur die Überschrift, nicht das Dokument
```

Alternativ ein Dreifachklick auf die Überschrift + D1-Wartezeit; beide Wege sind
deterministisch, `ControlOrMeta+a` ist es für diesen Zweck **nicht** und ist hier verboten.

**Regel D5 — Große Eingabemengen per Fixture-Upload, nicht per Tipp-Schleife.** Tests mit
vielen Überschriften (`E2E-EDGE-04`, 200 Stück) laden ein vorbereitetes Fixture hoch, statt
200-mal `page.keyboard.type` zu schleifen — eine solche Schleife ist langsam und race-anfällig
(jede Zeile erneut D1). Die Tipp-Schleife ist ausdrücklich nur als letzter Ausweg zulässig und
dann mit D1 an jeder Iteration.

### 2.2 Wiederverwendete Infrastruktur

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

Gemeinsamer `beforeEach`: `page.goto('/')` → Datenschutz-Banner wegklicken
(`page.getByRole('button', { name: /verstanden/i }).click()`).

Neue Datei: `tests/e2e/toc-update.spec.ts`. Zusätzlich ein Testfall **direkt** im bestehenden
`describe`-Block von `tests/e2e/selection-regression.spec.ts` (siehe 2.7).

Für den DOCX-Ausgangszustand ohne reale Word-Fixture (Abschnitt 0.3) wird ein wiederverwendbarer
Helfer nach dem Vorbild von `docx.spec.ts`s `buildSampleDocx()` bereitgestellt, hier
`buildSampleDocxWithToc(headings: string[])`, der ein reales, klassisches
`w:fldChar`/`w:instrText`-TOC-Feld über die übergebenen Überschriften-Texte erzeugt (echtes,
gültiges OOXML — von Hand mit JSZip zusammengesetzt, **nicht** über den eigenen Writer dieser
App).

### 2.3 Grundfunktion — Aktualisieren per Toolbar-Klick und F9

Für **alle** Umbenenn-/Tipp-/Klick-Schritte dieser und der folgenden Tabellen gilt
verbindlich die Determinismus-Disziplin aus Abschnitt 2.1a (D1 Warten nach nativem
Cursorwechsel, D2 auto-retrying Assertions, D4 zeilenweises Selektieren statt
`ControlOrMeta+a`). Die Tabellenzeilen benennen nur das Fachziel; die
Race-Absicherung ist in jeder Zeile mitzudenken, nicht optional.

| ID | Testfall (echte Bedienung) | Prüfung |
|---|---|---|
| E2E-UPDATE-01 | ODT-Karte → echten Upload von `test1.odt` (`input.setInputFiles`) → erste Überschriftzeile anklicken, **D1-Wartezeit**, dann **zeilenweise** selektieren (`Home` → D1 → `Shift+End`, **nicht** `ControlOrMeta+a`, siehe D4) → neuen Text tippen → Klick auf `page.getByRole('button', { name: 'Inhaltsverzeichnis aktualisieren' })` | DOM-Text des zugehörigen ToC-Eintrags (`.pm-toc-entry`) ändert sich sichtbar auf den neuen Überschriftentext; Prüfung via `await expect(page.locator('.pm-toc-entry').first()).toHaveText(...)` (D2), nicht via Sofort-Lesung. Übrige Überschriften/Einträge bleiben unverändert (Gegenprobe, dass D4 eingehalten wurde) |
| E2E-UPDATE-02 | Gleicher Ablauf, aber Auslösung über `page.keyboard.press('F9')` mit Cursor **innerhalb** eines `.pm-toc-entry` statt Toolbar-Klick | Identisches DOM-Ergebnis wie E2E-UPDATE-01 — beide Auslösewege führen zum selben sichtbaren Zustand |
| E2E-UPDATE-03 | DOCX-Karte → Upload von `buildSampleDocxWithToc(['Kapitel A', 'Kapitel B'])` → Überschrift „Kapitel A" über `page.getByLabel('Absatzformat')` erneut auf „Überschrift 1" setzen und Text ändern → „Aktualisieren" klicken | ToC-Eintrag zeigt neuen Text — Grundfunktion auch auf der DOCX-Karte (Editor ist formatunabhängig) |
| E2E-UPDATE-04 | Neue Überschrift **zwischen** zwei bestehenden einfügen (`Enter` am Ende einer Überschrift, `Absatzformat` auf „Überschrift 2" setzen, Text tippen) → aktualisieren | Neuer Eintrag erscheint an der **richtigen Position** zwischen den beiden bestehenden Einträgen (Anforderung 3.3) |
| E2E-UPDATE-05 | Eine Überschrift vollständig löschen (`Backspace`/`Delete` bis Absatz verschwindet oder `Absatzformat` auf „Standard" zurücksetzen) → aktualisieren | Zugehöriger Eintrag verschwindet vollständig aus dem DOM, keine Geister-Zeile |

### 2.4 Rückmeldeverhalten (Anforderung Abschnitt 1 Element 4, kein stiller Fehlschlag)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-FEEDBACK-01 | Frisches Dokument (`Neu erstellen`), **kein** ToC vorhanden, `F9` drücken | Statusmeldung „Kein Inhaltsverzeichnis im Dokument gefunden." erscheint (`page.getByRole('status')`) und verschwindet nach ca. 2,5 s wieder (`expect(...).toBeHidden({ timeout: 4000 })` o. ä.) — Grenzfall 2 |
| **E2E-FEEDBACK-02** *(Pflicht, siehe 0.1)* | `test1.odt` hochladen (ToC-Einträge tragen bereits `cachedPage` aus dem Import) → **ohne jede Überschriften-Änderung** direkt auf „Aktualisieren" klicken | Statusmeldung „Inhaltsverzeichnis ist bereits aktuell." erscheint — **nicht** „wurde aktualisiert". Schlägt dieser Test fehl, bestätigt das den in Abschnitt 0.1 vermuteten Bug im Browser, nicht nur auf Unit-Ebene |
| E2E-FEEDBACK-03 | Nach einer tatsächlichen Textänderung „Aktualisieren" klicken | Statusmeldung „Inhaltsverzeichnis wurde aktualisiert." erscheint |
| E2E-FEEDBACK-04 | Der `.pm-toc`-Bereich selbst (unabhängig vom Klick-Feedback) | Enthält sichtbar den Hinweistext „automatisch generiert, manuelle Änderungen … gehen … verloren" (oder gleichwertig) **bevor** überhaupt geklickt wird — Anforderung 3.6 letzter Satz/Grenzfall 13, muss **vorab** erkennbar sein |

### 2.5 Grenzfälle im Editor (echte Bedienung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-EDGE-01 | Handgebautes Mini-DOCX/ODT mit leerem ToC-Gerüst, **ohne** jede Überschrift, hochladen → „Aktualisieren" klicken | ToC-Bereich zeigt sichtbar Platzhaltertext („Keine Überschriften gefunden" o. ä.), kein Absturz, keine leere/verschwundene Fläche (Grenzfall 1) |
| E2E-EDGE-02 | `test1.odt` hochladen, Cursor testweise in eine Tabellenzelle einer Überschrift setzen (falls im Dokument vorhanden) **oder** synthetisches Dokument mit Überschrift in Tabellenzelle bauen → aktualisieren | Kein Absturz der UI (Grenzfall 4) |
| E2E-EDGE-03 | Handgebautes Dokument mit `maxLevel: 3`, danach im Editor eine Ebene-5-Überschrift hinzufügen (`Absatzformat` bietet nur bis Ebene 6, hier Ebene 5 wählen) → aktualisieren | Ebene-5-Überschrift erscheint **nicht** im ToC (Grenzfall 5) |
| E2E-EDGE-04 | 200 Überschriften **primär per handgebautem Fixture-Upload** (D5); die `page.keyboard.type`-Schleife nur als letzter Ausweg und dann mit D1 je Iteration → aktualisieren | UI bleibt reaktionsfähig (Klick auf einen anderen Button unmittelbar danach funktioniert ohne merkliches Einfrieren), Aktualisierung schließt in vertretbarer Zeit ab (Grenzfall 6) |
| E2E-EDGE-05 | Überschrift ohne Text erzeugen (`Absatzformat` auf „Überschrift 1" setzen, keinen Text eingeben) → aktualisieren | Konsistentes, dokumentiertes Verhalten (leerer Eintrag ODER bewusst ausgelassen) tritt tatsächlich ein — kein Crash (Grenzfall 7) |
| E2E-EDGE-06 | Zwei Überschriften mit identischem Text „Einleitung" auf unterschiedlichen Ebenen erzeugen → aktualisieren | Beide erscheinen als getrennte Einträge im DOM (`page.locator('.pm-toc-entry')` Anzahl `2` für diesen Text) — Grenzfall 8 |
| E2E-EDGE-07 | In einen `.pm-toc-entry` klicken (D1-Wartezeit), Eintragstext **zeilenweise** überschreiben (D4, kein `ControlOrMeta+a`) → „Aktualisieren" klicken | Manuelle Änderung verschwindet, ursprünglicher (aus der Überschrift berechneter) Text erscheint wieder; Prüfung via auto-retrying `expect(...)` (D2) — Grenzfall 13 |
| E2E-EDGE-08 | Ebene-1-Überschrift direkt gefolgt von Ebene-4-Überschrift (keine 2/3 dazwischen) → aktualisieren | Beide Einträge im DOM mit unterschiedlichem `margin-left`/Einrückung entsprechend ihrer echten Ebene, keine künstlichen Zwischeneinträge (Grenzfall 14) |
| E2E-EDGE-09 *(siehe 0.4, D3)* | Aktualisieren klicken → **zuerst per `expect(...)` bestätigen, dass der neue ToC-Text im DOM steht** (D3, kein „sofort" ohne Assertion) → `ControlOrMeta+Z` (Undo) → erneut „Aktualisieren" klicken | Kein Crash, ToC-Einträge weiterhin inhaltlich korrekt |
| E2E-EDGE-10 | Zwei unabhängige ToCs (handgebautes Fixture oder zwei Mal `test1.odt`-artige Struktur simuliert) im selben Dokument, Cursor in ToC Nr. 1, „Aktualisieren" klicken | Nur der DOM-Inhalt von ToC Nr. 1 ändert sich, ToC Nr. 2 bleibt textlich unverändert (Grenzfall 3) |

### 2.6 Löschen einer zuvor verlinkten Überschrift (Grenzfall 15)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-EDGE-11 | `test1.odt` hochladen → eine der referenzierten Überschriften vollständig löschen → „Aktualisieren" klicken | Zugehöriger ToC-Eintrag verschwindet vollständig aus dem DOM, kein Absturz, keine tote Referenz |

### 2.7 Pflicht-Regressionstest Selection-Sync (Grenzfall 9, verpflichtend in `selection-regression.spec.ts`)

Identische Technik wie die bestehenden Tests dieser Datei, erweitert um die
ToC-Aktualisieren-Sequenz:

```ts
test('toc update + reselect + type — selection stays consistent', async ({ page }) => {
  // Voraussetzung: Upload von test1.odt (oder DOCX-Äquivalent) als ToC-Ausgangszustand,
  // siehe 2.2/0.3 — kein page.evaluate.
  const editor = page.locator('.ProseMirror')
  // ... Überschrift antippen (D1-Wartezeit), zeilenweise selektieren (D4), Text ändern ...
  await page.getByRole('button', { name: 'Inhaltsverzeichnis aktualisieren' }).click()
  // D3: erst das Landen der Aktualisierung im DOM bestätigen, dann weiter.
  await expect(page.locator('.pm-toc-entry').first()).toHaveText(/Neuer/)

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  // Reproduziert exakt den bekannten Selection-Sync-Bug-Auslöser: erneuter Klick in den
  // jetzt fett markierten, noch selektierten Text im Haupttext (außerhalb des ToC).
  await editor.click()
  await page.keyboard.press('End')
  // D1 (PFLICHT, identisch zu selection-regression.spec.ts Zeilen 26–34): ProseMirror
  // lernt den nativen "End"-Caret-Move nur über das asynchrone selectionchange-Event.
  // Ohne diesen Puffer kann das folgende "Enter" der Sync zuvorkommen und auf der alten
  // Position wirken — genau die Race, die dieser Auftrag ausschließt. NICHT weglassen.
  await page.waitForTimeout(50)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Neuer Absatz nach dem Aktualisieren-Klick.')

  await expect(editor).toContainText('Neuer Absatz nach dem Aktualisieren-Klick.')
  // ... weitere Assertions je nach konkretem Fixture-Inhalt ...
})
```

Muss **zusätzlich** zur neuen Datei `toc-update.spec.ts` direkt im bestehenden `describe`-Block
von `selection-regression.spec.ts` verankert werden — sonst verliert die Regressionssuite diesen
Fall aus dem Blick (analog zur bereits für das Seitenumbruch-Ticket getroffenen Feststellung).

### 2.8 Datei-Rundreise über echten Download + echten Re-Upload (Req-Abschnitt 5.2, Punkte 1–4)

**ODT (real, `test1.odt` als Basis):**

```ts
test('toc reflects a renamed heading after a real export + re-upload round trip (ODT)', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: /öffnen|hochladen|datei/i }).click() // tatsächlicher Upload-Auslöser prüfen
  const fs = await import('node:fs/promises')
  const original = await fs.readFile('tests/fixtures/external/odt/test1.odt')
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'test1.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: original })

  const editor = page.locator('.ProseMirror')
  // ... Überschrift "Abstract" umbenennen: anklicken → D1-Wartezeit → zeilenweise
  //     selektieren (Home → D1 → Shift+End, KEIN ControlOrMeta+a, siehe D4) → tippen ...
  await page.getByRole('button', { name: 'Inhaltsverzeichnis aktualisieren' }).click()
  // D3: erst bestätigen, dass der neue Text im ToC-DOM steht (und damit über onChange in den
  //     zu exportierenden document.content-Zustand gelangt ist), DANN erst exportieren —
  //     sonst könnte der Export einen noch nicht propagierten Stand serialisieren.
  await expect(page.locator('.pm-toc-entry').first()).toContainText('Neuer')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const exportedBuffer = await fs.readFile((await download.path())!)

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(exportedBuffer)
  const contentXml = await zip.file('content.xml')!.async('text')

  expect(contentXml).toContain('<text:table-of-content')
  expect(contentXml).toContain('<Neuer Überschriftentext>') // Platzhalter für den tatsächlich getippten Text
  expect(contentXml).not.toContain('Abstract') // alter Text darf nicht mehr als ToC-Eintrag auftauchen

  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input2 = odtCard(page).locator('input[type="file"]')
  await input2.setInputFiles({ name: 'test1-updated.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: exportedBuffer })
  await expect(page.locator('.ProseMirror')).toContainText('<Neuer Überschriftentext>')
})
```

| ID | Testfall | Kernprüfung |
|---|---|---|
| E2E-RT-ODT-01 | wie oben (Umbenennen) | `content.xml` enthält weiterhin `<text:table-of-content`, neuer Text im ToC-Eintrag, alter Text verschwunden, Re-Upload zeigt neuen Text |
| E2E-RT-ODT-02 | Neue Überschrift hinzufügen statt umbenennen, sonst identischer Ablauf | Neuer Eintrag in `content.xml` an richtiger Position, Re-Upload bestätigt (Req 5.2.3) |
| E2E-RT-ODT-03 | Überschrift löschen, sonst identischer Ablauf | Verkürzter Eintrags-Bestand in `content.xml`, Re-Upload bestätigt (Req 5.2.4) |
| E2E-RT-DOCX-01 | Identischer Ablauf mit `buildSampleDocxWithToc(...)` als Upload statt `test1.odt` | Downloadete `document.xml` enthält weiterhin `<w:instrText>` mit `TOC`, **kein** `<w:sdt>` (Abschnitt 9.1-Entscheidung), neuer Text im Feld-Anzeigetext, Re-Upload bestätigt |
| E2E-RT-DOCX-02 | Analog Hinzufügen/Löschen für DOCX | Wie E2E-RT-ODT-02/03, DOCX-seitig |

### 2.9 Baseline-Rundreise (Req-Abschnitt 5.1, echte Bedienung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-RT-BASELINE-DOCX-01 | Reale DOCX-Datei **ohne** jedes Inhaltsverzeichnis (z. B. `HelloWorld`-artige einfache Fixture aus dem Bestand, sofern eine `.docx`-Entsprechung existiert, sonst `buildSampleDocx()` ohne ToC) unverändert hochladen (kein Klick, keine Eingabe) → sofort exportieren | Heruntergeladene Datei enthält **kein** `w:instrText` mit `TOC`, **kein** neuer `w:bookmarkStart` — kein Verzeichnis „aus dem Nichts" (Req 5.1.1) |
| E2E-RT-BASELINE-ODT-01 | Reale ODT-Datei **ohne** jedes Inhaltsverzeichnis (z. B. `empty.odt`/`sample.odt`) unverändert hochladen → sofort exportieren | Kein `text:table-of-content` in der exportierten Datei (Req 5.1.2) |
| **E2E-RT-BASELINE-ODT-02** | `test1.odt` (**mit** echtem ToC-Feld) unverändert hochladen (kein Klick auf „Aktualisieren") → sofort exportieren → Re-Import | ToC bleibt inhaltlich **und** als `<text:table-of-content>`-Feld identisch erhalten, insbesondere Text „Abstract" weiterhin vorhanden — reine Grundlagen-Rundreise, bevor „Aktualisieren" überhaupt betätigt wird (Req 5.1.3) |
| E2E-RT-BASELINE-DOCX-02 *(blockiert durch R1)* | Analoger Test mit einer **echten**, mit Word erzeugten DOCX-Datei mit TOC-Feld | **Nicht ausführbar** mangels Fixture — als offener Punkt im Abnahmeprotokoll geführt (Req 5.1.4) |

### 2.10 Import echter Fremddateien + Re-Export + Re-Import (Req 5.2, Punkte 7/8)

| ID | Testfall (`input.setInputFiles` mit echter Datei vom Datenträger) | Prüfung |
|---|---|---|
| E2E-IMPORT-01 | `tests/fixtures/external/odt/test1.odt` in ODT-Karte hochladen | Editor zeigt einen sichtbaren ToC-Bereich mit mehreren Einträgen, darunter „Abstract" |
| E2E-IMPORT-02 | Direkt im Anschluss: eine Überschrift umbenennen **und** eine neue hinzufügen → „Aktualisieren" klicken → Export → Re-Upload | Verzeichnis spiegelt **beide** Änderungen wider, bleibt als Feld erkennbar (Req 5.2.8) |
| E2E-IMPORT-03 | `tests/fixtures/external/odt/compdocfileformat.odt` hochladen | ToC sichtbar, kein Absturz |
| E2E-IMPORT-04 *(blockiert durch R1)* | Echte, mit Word erzeugte DOCX-Datei mit TOC-Feld hochladen, Überschrift umbenennen + hinzufügen, aktualisieren, Export, Re-Upload | **Nicht ausführbar** mangels Fixture (Req 5.2.7) — Ersatzweise `buildSampleDocxWithToc(...)`-Variante (E2E-RT-DOCX-01/02) deckt die **strukturelle** Funktionalität ab, aber **nicht** reale Word-Eigenheiten — im Abnahmeprotokoll getrennt auszuweisen |

### 2.11 Cross-Format E2E (dokumentierte Lücke, siehe Abschnitt 0.5)

Kein Testfall dieser Ebene für Req 5.2 Punkte 5/6 möglich, solange die App keine
Format-Konvertierungsfunktion anbietet. Wird in der Abnahme (Abschnitt 4) als offener Punkt
geführt, nicht stillschweigend als „erledigt" markiert.

### 2.12 Baseline-E2E-Regression (Anforderung 5.1)

| ID | Testfall | Erwartung |
|---|---|---|
| E2E-BASE-01 | Alle **bestehenden** Tests in `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/lifecycle.spec.ts` | Bleiben nach Einführung des Features unverändert grün — insbesondere darf der neue `F9`-Keymap-Eintrag **keine** bestehende Tastenkombination stören, und der neue kontextuelle Toolbar-Button darf die bestehenden, immer sichtbaren Buttons nicht verdrängen/verschieben in einer Weise, die bestehende Locator (`getByTitle(...)`) bricht |

---

## 3. Traceability-Matrix (Anforderung → Testfall)

| Anforderungsteil | Abgedeckt durch |
|---|---|
| Abschnitt 1 (Bedienelemente: Button, F9, Rückmeldung, Export-Trigger) | E2E-UPDATE-01/02, E2E-FEEDBACK-01–04, E2E-RT-*-01 (Export-Trigger implizit, siehe 3.2 unten) |
| 3.1 (Gleichbehandlung hausgemacht/importiert) | UT-TOC-01–16 (formatunabhängig), E2E-IMPORT-01/02 |
| 3.2 (drei Auslöser: manuell, Export-implizit, kein Live-Debounce-Zwang) | E2E-UPDATE-01/02 (manuell), UT-DOCX-RT-02/UT-ODT-RT-02 + E2E-RT-*-01 (Export-implizit — Export ohne vorherigen Klick liefert dennoch aktuellen Stand, siehe eigener Testfall unten) |
| **Export-Trigger-Testfall (Anforderung 6 Punkt 7, eigens hervorzuheben)** | UT-DOCX-RT-02 in Variante „kein `attemptUpdateTableOfContents`-Aufruf vor `writeDocx`" + E2E-Variante: Überschrift ändern, **ohne** auf „Aktualisieren" zu klicken, direkt exportieren → exportierte Datei zeigt dennoch aktuellen Stand — als `UT-DOCX-RT-08`/`E2E-RT-EXPORT-TRIGGER-01` zu ergänzen |
| 3.3 (Erkennung von Änderungsarten) | UT-TOC-01/02/04/05/06, E2E-UPDATE-04/05 |
| 3.4 (Struktur+Seitenzahlen gemeinsam, kein Dialog) | UT-DOCX-W-07, Code-Plan-Entscheidung Abschnitt 15 — Test bestätigt nur „ein Klick aktualisiert beides", kein gesonderter Dialog-Test nötig |
| 3.5 (Tiefe respektiert) | UT-TOC-07, E2E-EDGE-03 |
| 3.6 (Formatierung/Einrückung, manuelle Überschreibung) | UT-TOC-08, UT-DOCX-W-06, E2E-EDGE-07, E2E-FEEDBACK-04 |
| 3.7 (Seitenzahlen-Näherung, Grenzfall 4) | UT-PAG-01–05, UT-DOCX-W-07 |
| 3.8 (Anker/Klick-Navigation-Verwaisung) | UT-DOCX-R-02, UT-ODT-R-01/02, E2E-EDGE-11 |
| 3.9 (Feld-Charakter bleibt erhalten) | UT-DOCX-RT-01, UT-ODT-RT-01, E2E-RT-ODT-01/E2E-RT-DOCX-01 |
| 3.10 (Undo/Redo, ein Schritt) | UT-CMD-07/08, E2E-EDGE-09 |
| 3.11 (kein stiller Fehlschlag) | UT-CMD-03, E2E-FEEDBACK-01, E2E-EDGE-01 |
| Grenzfall 1 | UT-TOC-11, UT-DOCX-W-03/UT-ODT-W-02, E2E-EDGE-01 |
| Grenzfall 2 | UT-CMD-03, E2E-FEEDBACK-01 |
| Grenzfall 3 | UT-TOC-09, UT-CMD-09, UT-DOCX-RT-07, E2E-EDGE-10 |
| Grenzfall 4 | UT-TOC-15, UT-PAG-05, E2E-EDGE-02 |
| Grenzfall 5 | UT-TOC-07, E2E-EDGE-03 |
| Grenzfall 6 | UT-TOC-16, E2E-EDGE-04 |
| Grenzfall 7 | UT-TOC-12, E2E-EDGE-05 |
| Grenzfall 8 | UT-TOC-03, E2E-EDGE-06 |
| Grenzfall 9 | E2E-Regression Abschnitt 2.7 |
| Grenzfall 10 | Konsistenz-Argument (kein separater Entwurfszustand) — Testfall: Überschrift **während** des Tippens (kein `blur`) aktualisieren, Ergebnis entspricht dem `state.doc`-Stand zum Klickzeitpunkt — als `E2E-EDGE-12` zu ergänzen |
| Grenzfall 11 | UT-CMD-07 (Undo einer Umbenennung wird korrekt reflektiert, da `attemptUpdateTableOfContents` immer den aktuellen `state.doc` liest) |
| Grenzfall 12 | UT-DOCX-FIX-01 (**blockiert**, R1), UT-ODT-FIX-04 |
| Grenzfall 13 | UT-TOC-08, E2E-EDGE-07, E2E-FEEDBACK-04 |
| Grenzfall 14 | UT-TOC-13, E2E-EDGE-08 |
| Grenzfall 15 | UT-TOC-14, E2E-EDGE-11 |
| Req 5.1 (Baseline-Rundreise, Punkte 1–5) | UT-BASE-01–03, UT-DOCX-RT-06, UT-ODT-FIX-05, E2E-RT-BASELINE-DOCX-01/ODT-01/ODT-02, E2E-RT-BASELINE-DOCX-02 (**blockiert**, R1) |
| Req 5.2 Punkte 1–4 (Feature-Rundreise DOCX/ODT) | UT-DOCX-RT-01–04, UT-ODT-RT-01–04, E2E-RT-ODT-01–03, E2E-RT-DOCX-01/02 |
| Req 5.2 Punkte 5/6 (Cross-Format) | UT-XFMT-01–03 (Unit); **E2E nicht ausführbar, siehe 0.5/2.11** |
| Req 5.2 Punkte 7/8 (reale Fremddateien) | UT-ODT-FIX-01–05, E2E-IMPORT-01–03; **DOCX-Seite blockiert durch R1**, siehe UT-DOCX-FIX-01, E2E-IMPORT-04 |
| Req 5.2 Punkt 9 (zwei ToCs, Rundreise) | UT-DOCX-RT-07, E2E-EDGE-10 |
| Anforderung Abschnitt 6, Testplan-Hinweise Punkte 1–8 | Punkt 1/2 (Reader/Writer-Struktur): UT-DOCX-W/R-*, UT-ODT-W/R-*; Punkt 3 (formatunabhängige Logik): UT-TOC-*; Punkt 4/5 (E2E + Regressionspflicht): E2E-UPDATE-*, Abschnitt 2.7; Punkt 6 (reale Fixtures): UT-ODT-FIX-*/**UT-DOCX-FIX-01 blockiert**; Punkt 7 (Export-Trigger): siehe Zeile oben; Punkt 8 (Unit **und** E2E für Rundreise): Abschnitte 1.6/1.10/1.12 **und** 2.8/2.9/2.10, keine der beiden Ebenen ersetzt die andere |
| Kritische Vorab-Befunde (Abschnitt 0) | UT-CMD-05/E2E-FEEDBACK-02 (0.1), UT-DOCX-W-04 (0.2), gesamte Abschnitt-2-Strategie (0.3), UT-CMD-08/E2E-EDGE-09 (0.4), Abschnitt 2.11 (0.5) |

---

## 4. Abnahmekriterien dieses Testplans

Der Status „vorhanden" (Req-Abschnitt 7) darf aus QA-Sicht erst vergeben werden, wenn:

- [ ] **UT-CMD-05 / E2E-FEEDBACK-02** grün sind (Abschnitt 0.1) — bei Rot ist die
      `attemptUpdateTableOfContents`-Vergleichslogik vor jeder weiteren Abnahme zu korrigieren,
      unabhängig davon, was sonst grün ist.
- [ ] **UT-DOCX-W-04** grün ist (Abschnitt 0.2) — bei Rot ist die Bookmark-`w:id`-Vergabe vor
      Freigabe zu korrigieren (OOXML-Korruptionsrisiko).
- [ ] Alle Unit-Tests aus Abschnitt 1 (Unterabschnitte 1.1–1.13) grün, inklusive der neuen
      Dateien `shared/__tests__/toc.test.ts`, `shared/editor/__tests__/commands.test.ts`,
      `docx/__tests__/toc-fixtures.test.ts`, `odt/__tests__/toc-fixtures.test.ts`,
      `shared/__tests__/toc-crossformat.test.ts`.
- [ ] Alle Playwright-Tests aus Abschnitt 2 grün — insbesondere die Datei-Rundreise-Tests 2.8/2.9,
      die tatsächlich heruntergeladene/hochgeladene Dateien prüfen, nicht nur DOM-Zustand.
- [ ] Baseline-Regression (1.13, 2.12) vollständig grün — insbesondere bestätigt UT-BASE-03, dass
      keine der 127 vorhandenen DOCX-Fixtures durch dieses Feature einen ungewollten `toc`-Knoten
      oder neue Attribute erhält.
- [ ] Alle 15 Grenzfälle aus Req-Abschnitt 4 sind einzeln mit Testergebnis befundet (funktioniert /
      bewusst abweichend + dokumentiert / repariert), nicht pauschal „erledigt".
- [ ] Cross-Format-Anforderung (Req 5.2.5/5.2.6) ist mindestens auf Unit-Ebene (UT-XFMT-*) grün;
      die fehlende E2E-Abdeckung (Abschnitt 0.5/2.11) ist mit PO/Dev **explizit** besprochen und
      der Status entsprechend dokumentiert, falls dort keine Einigung erzielt wird.
- [ ] **R1 (keine reale, mit Word erzeugte DOCX-Datei mit TOC-Feld) ist im Abnahmeprotokoll
      explizit als offener Punkt vermerkt**, nicht stillschweigend durch die
      `buildSampleDocxWithToc`-Ersatzkonstruktion (E2E-RT-DOCX-01/02) als gleichwertig erledigt
      markiert — diese Ersatzkonstruktion deckt Struktur-/Verdrahtungsfehler ab, **nicht** reale
      Word-Eigenheiten (Anforderung Abschnitt 6 Punkt 6 verlangt ausdrücklich eine reale Datei).
- [ ] Die Abhängigkeit von `inhaltsverzeichnis-einfuegen` (Req-Abschnitt 0.6/Abschnitt 7 letzter
      Punkt) ist im Abnahmeprotokoll klar benannt: Verifikation dieses Tickets stützt sich mangels
      eigener Insert-UI ausschließlich auf **importierte** ToCs (echte Fremddateien) — das ist laut
      Anforderung selbst der explizit zulässige Zwischenzustand, **kein** Grund für „vorhanden"
      ohne Einschränkung, solange „einfügen" nicht nachgezogen ist.
- [ ] Der Regressionstest aus Abschnitt 2.7 (Selection-Sync mit ToC-Klick-Sequenz) ist grün und
      dauerhaft in `selection-regression.spec.ts` verankert, nicht nur in der neuen Datei geführt.
- [ ] **Determinismus-Disziplin (Abschnitt 2.1a) ist in jedem E2E-Test tatsächlich umgesetzt** —
      insbesondere: kein `ControlOrMeta+a`-Übertippen zum Einzel-Umbenennen (D4), der 50-ms-Puffer
      nach nativem Caret-Move vor der Folgetaste (D1), auto-retrying Web-First-Assertions statt
      Sofort-Lesungen (D2), keine „sofort"-Folgeaktion ohne zwischengeschaltete Zustandsbestätigung
      (D3). Der Testlauf muss über mind. 3 Wiederholungen (`--repeat-each=3`) flake-frei bleiben;
      ein einziger sporadischer Fehlschlag gilt als Rot und ist zu beheben, nicht zu wiederholen.

Andernfalls: Status „teilweise", mit Verweis auf die konkret offenen Punkte aus dieser Liste —
analog zur in `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 7 und `seitenumbruch-req.md`
Abschnitt 7 festgelegten Vorgehensweise.
