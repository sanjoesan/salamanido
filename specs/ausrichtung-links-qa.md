# Testplan „Ausrichtung links" — QA-Verifikation

Gegenstück zu `specs/ausrichtung-links-req.md` (Anforderung) und
`specs/ausrichtung-links-code.md` (Umsetzungsplan/Fehleranalyse). Dieses
Dokument legt fest, **welche Tests** geschrieben werden, **wo** sie liegen,
**wie** sie ausgeführt werden und **wann** ein Punkt als abgehakt gilt. Zwei
Ebenen, die sich ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar/Tastatur/
   echtem Datei-Dialog **und** blind gegenüber `setAlign`/`setHeading` selbst
   (die Rundreise-Unit-Tests rufen nie den Editor-Befehl auf, siehe
   `ausrichtung-links-code.md` Abschnitt 2, letzte Tabellenzeile).
2. **Echte Playwright-Browser-Tests** — Klicks auf die tatsächlichen
   Ausrichtungs-Buttons, echte Tastatureingabe (`Strg+L` etc.), echter
   `setInputFiles()`-Upload, echter `page.waitForEvent('download')`-Export,
   Prüfung der **tatsächlich heruntergeladenen Datei** (nicht nur ein
   interner Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`setAlign`).

Besonderheit dieser Anforderung gegenüber Fett/Kursiv/Unterstrichen: Ausrichtung
ist ein **Knoten-Attribut mit reiner Setzen-Semantik** (kein Toggle, siehe
Anforderung 3.3) und laut `ausrichtung-links-code.md` Abschnitt 0 aktuell durch
einen **kritischen Funktionsfehler** blockiert (`setAlign` wirft bei mehr als
einem betroffenen Block eine Exception). Ein großer Teil dieses Testplans
existiert deshalb explizit als **Regressionstest für die in `ausrichtung-links-code.md`
Abschnitt 3 beschriebenen Fixes**, nicht nur als Neuabdeckung der Anforderung.

Referenzierte Fixtures:
`tests/fixtures/external/docx/bug-paragraph-alignment.docx`,
`tests/fixtures/external/docx/rtl.docx`,
`tests/fixtures/external/docx/table-indent.docx`,
`tests/fixtures/external/docx/unicode-path.docx`,
`tests/fixtures/external/odt/EasyList.odt`,
`tests/fixtures/external/odt/feature_bullets_numbering.odt`,
`tests/fixtures/external/odt/tableRowDeletionTest.odt`,
`tests/fixtures/external/odt/FruitDepot-SeasonalFruits4.odt`,
`tests/fixtures/external/odt/fields.odt`,
`tests/fixtures/external/odt/feature_attributes_paragraph_MSO2013.odt`,
`tests/fixtures/external/odt/HelloWorld.odt` — alle Dateien bereits im
Repo vorhanden (`ls`-geprüft), keine neuen Fixtures zu beschaffen.

---

## 0. Ausführung und Reihenfolge

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Reihenfolge (deckt sich mit `ausrichtung-links-code.md` Abschnitt 9): zuerst
die Fixes aus `ausrichtung-links-code.md` Abschnitt 5 umsetzen (`align.ts`,
`commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`, `schema.ts`, beide Reader),
**dann** `commands.test.ts` (Abschnitt 1.1 hier) als erste Probe, ob Fehler 1/2/6
tatsächlich behoben sind, **dann** die restlichen Unit-Tests, **dann** die
E2E-Suite. Ohne die Fixes schlagen praktisch alle Mehrfach-Absatz- und
Tabellen-Testfälle unten erwartungsgemäß fehl — das ist beabsichtigt und kein
Testfehler, solange der zugrundeliegende Fix noch aussteht.

Beide Suiten müssen grün sein, bevor „Ausrichtung links" laut Anforderung
Abschnitt 8 (DoD) als „verifiziert" gelten darf.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 1.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

**Kernstück dieses gesamten Testplans** — die einzige Ebene, die den in
`ausrichtung-links-code.md` Abschnitt 3.1 beschriebenen kritischen Fehler 1
(Absturz bei Mehrfach-Absatz-Selektion) sowie Fehler 2 (Tabellen-Zellauswahl)
und Fehler 6 (Formatvorlagen-Wechsel setzt Ausrichtung zurück) überhaupt
fangen kann, weil `setAlign`/`setHeading` hier direkt gegen eine echte
`EditorView` mit derselben `dispatchTransaction`-Verdrahtung wie
`WordEditor.tsx` aufgerufen werden (Muster siehe `ausrichtung-links-code.md`
Abschnitt 6.1 — hier zu **Testfällen**, nicht Codeskizzen, ausgebaut).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Neuer, unberührter Absatz ist bereits `align: 'left'` | frisches Dokument aus `documentModel.ts`-Default | `doc.firstChild.attrs.align === 'left'`, ohne dass `setAlign` je aufgerufen wurde | Grenzfall 4.1 |
| 2 | **Regressionstest Fehler 1**: Selektion über zwei zentrierte Absätze, `setAlign('left')` | zwei Absätze `align: 'center'`, Selektion von Anfang bis Ende beider | `expect(() => setAlign('left')(state, dispatch)).not.toThrow()`; **beide** Absätze danach `align: 'left'` (nicht nur der erste) | Fehler 1 (kritisch), Anforderung 3.2, Testfall 4/13 |
| 3 | Dasselbe mit drei/vier Absätzen (Stichprobe „viele Absätze", Grenzfall 4.13) | vier Absätze, gemischte Ausgangsausrichtung | alle vier `align: 'left'`, kein Timeout/Exception | Grenzfall 4.13 |
| 4 | Klick auf „Links" bei bereits linksbündigem Absatz erzeugt **keine** neue Transaktion | ein Absatz `align: 'left'`, `setAlign('left')` aufgerufen | `applicable === true`, aber `view.state`/Objektidentität des Dokuments **unverändert** (kein `dispatch` mit wirkungsloser Transaktion) | Anforderung 3.9, Grenzfall 4.2 |
| 5 | Echte Ausrichtungsänderung erzeugt genau **einen** Undo-Schritt für **beide** Absätze | zwei zentrierte Absätze, Selektion über beide, `setAlign('left')`, dann `undo()` | nach `setAlign`: beide `left`; nach einem `undo()`: beide wieder `center` (nicht nur einer) | Anforderung 3.9, „ein Schritt für den ganzen Bereich" |
| 6 | Redo stellt „links" für beide Absätze wieder her | Fortsetzung von Testfall 5 | nach `redo()`: beide wieder `left` | Anforderung 3.9 |
| 7 | Selektion ohne jeden alignierbaren Knoten liefert `false`, wirft nicht | Selektion exakt auf einem eigenständigen Bild-Knoten außerhalb jedes Absatzes (falls Schema das zulässt) bzw. ein synthetischer Fall mit leerem Bereich | `setAlign('left')(...)` liefert `false`, keine Exception | Anforderung 3.5 |
| 8 | Selektion auf einem Absatz, der **nur** ein Bild als Inhalt hat | Absatz-Knoten mit einzigem Inline-Bild-Kind, Cursor/Selektion darauf | `setAlign('left')` liefert `true`, Absatz-Attribut wird gesetzt | Grenzfall 4.6 |
| 9 | Isoliertes `isAlignActive` an Absatzgrenze | Cursor exakt zwischen zwei unterschiedlich ausgerichteten Absätzen (Position am Ende von Absatz 1) | dokumentiertes, deterministisches Ergebnis (ProseMirym-Standard: Absatz, in dem `$from` liegt) — Ergebnis hier **festhalten**, nicht nur erwarten | Grenzfall 4.5 |
| 10 | `isAlignActive` bei gemischter Selektion zeigt Zustand des ersten Absatzes | Absatz 1 `center`, Absatz 2 `left`, Selektion über beide | `isAlignActive(state, 'left') === false` (weil `$from` in Absatz 1 liegt), obwohl Absatz 2 bereits links ist | Grenzfall 4.4, Anforderung 3.4 |
| 11 | **Regressionstest Fehler 2**: `CellSelection` über die mittlere Spalte einer 3×3-Tabelle | Tabelle über `wordSchema.nodes.table/table_row/table_cell` bauen, `CellSelection` von Zelle (1,1) nach Zelle (2,1) (mittlere Spalte, drei Zeilen) konstruieren (Muster: `cellAround()` + `CellSelection`-Konstruktor aus `prosemirror-tables`, wie im Reproduktionsskript in `ausrichtung-links-code.md` Abschnitt 3.2 beschrieben), `setAlign('left')` | **alle drei** Zellen der mittleren Spalte `align: 'left'`; Spalte 1 und 3 (links/rechts davon) **unverändert** in ihrer ursprünglichen Ausrichtung | Fehler 2, Grenzfall 4.8, Testfall 7 |
| 12 | Vorher/Nachher-Kontrast zu Testfall 11: unrepariert würde nur 1 von 3 Zellen geändert | derselbe Aufbau wie #11, Assertion zählt explizit `align === 'left'` über alle drei Zellen der mittleren Spalte (nicht nur „Spalten 1/3 unverändert", das allein hätte den Bug **nicht** erkannt, siehe `ausrichtung-links-code.md` Abschnitt 3.2 letzter Absatz) | genau 3 von 3 Zellen der mittleren Spalte geändert | Fehler 2, Testschärfung laut Codeplan |
| 13 | **Regressionstest Fehler 6**: Standard → Überschrift 1 behält vorherige Zentrierung | Absatz `align: 'center'`, `setHeading(1)` aufgerufen | resultierender Heading-Knoten hat `align: 'center'` (nicht hart auf `'left'` zurückgesetzt) | Fehler 6, Grenzfall 4.9 |
| 14 | Überschrift → Standard behält vorherige Rechtsausrichtung | Heading `level: 1, align: 'right'`, `setHeading(null)` aufgerufen | resultierender Paragraph-Knoten hat `align: 'right'` | Fehler 6, Grenzfall 4.9 |
| 15 | Ausrichtung ändert keine Zeichen-Marks im selben Absatz | Absatz mit Text, das teilweise `strong`/`em` trägt, `setAlign('left')` darauf angewendet | Marks am Text vor/nach dem Aufruf identisch (Diff der Textknoten-Marks) | Anforderung 3.8 |

### 1.2 Neu: `src/formats/docx/__tests__/alignment.test.ts`

Reiner Reader/Writer-Test (Ebene 1), unabhängig von `setAlign` — deckt die
XML-Mapping-Fehler (3, 4) sowie die Grenzfälle 4.10–4.12 der Anforderung.
Handgebaute `.docx`-Dateien im JSZip-Muster von `buildSampleDocx()`
(`tests/e2e/docx.spec.ts`), plus die realen Fixture-Dateien.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `w:jc w:val="left"` | handgebautes XML | `align: 'left'` | Basisfall |
| 2 | `w:jc` fehlt komplett | Absatz ohne `w:pPr`/`w:jc` | `align: 'left'` (Fallback) | Grenzfall 4.12 |
| 3 | `w:jc w:val="start"` | handgebautes XML | `align: 'left'` | Grenzfall 4.11 (Teilaspekt) |
| 4 | **`w:jc w:val="end"` → `'right'`, nicht `'left'`** | handgebautes XML | `align: 'right'` | **Fehler 4** (zentraler Regressionstest — vor dem Fix ergibt sich fälschlich `'left'`, exaktes Gegenteil) |
| 5 | `w:jc w:val="distribute"` | handgebautes XML | `align: 'justify'` (dokumentierte Näherung) | Grenzfall 4.11 |
| 6 | Groß-/Kleinschreibung `w:val="LEFT"` | handgebautes XML | `align: 'left'` (nicht roh case-sensitive verglichen) | Robustheit |
| 7 | **Reale Fixture `bug-paragraph-alignment.docx`, Absatz 1** (Ausrichtung nur über Formatvorlage `Title`, kein direktes `w:jc`) | `readDocx` auf die echte Datei | `align: 'center'` (nicht `'left'`) | **Fehler 3** (zentraler Regressionstest, kein synthetisches Fixture) |
| 8 | Dieselbe Fixture, Absatz 2 (direktes `w:jc w:val="left"` überschreibt Formatvorlage) | wie oben | `align: 'left'` — direkte Absatzformatierung gewinnt weiterhin gegen Formatvorlage | Fehler 3, Kaskaden-Präzedenz |
| 9 | Reale Fixture `rtl.docx` (`w:jc="start"`, RTL-Text) | `readDocx` | `align: 'left'` — bewusst dokumentierte LTR-Vereinfachung, siehe `ausrichtung-links-code.md` Abschnitt 4 „Klarstellungen" | Grenzfall 4.11, RTL-Hinweis |
| 10 | Reale Fixtures `table-indent.docx`, `unicode-path.docx` (`w:jc="start"`) | `readDocx` je Datei | `align: 'left'` | Grenzfall 4.11 |
| 11 | Zyklische/zu tiefe `w:basedOn`-Kette bei der Formatvorlagen-Ausrichtungsauflösung bricht kontrolliert ab | `styles.xml` mit `w:basedOn` auf sich selbst bzw. Kette über Tiefenlimit | Import wirft **nicht**, Fallback `'left'` | Robustheit, analog `unterstrichen-einfach-code.md`-Muster |

### 1.3 Neu: `src/formats/odt/__tests__/alignment.test.ts`

Analog für ODT — Fokus auf Fehler 5 (fehlende Normalisierung von
`fo:text-align`) und die Grenzfälle 4.10/5.2 Testfall 7, ausschließlich mit
**echten** Fremddateien aus dem vorhandenen Korpus (kein synthetisches Fixture
nötig, da bereits ausreichend reale Belege vorliegen laut
`ausrichtung-links-code.md` Abschnitt 3.5).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `EasyList.odt` (`fo:text-align="end"`) | `readOdt` | betroffene Absätze `align: 'right'` (nicht wörtlich `'end'`) | **Fehler 5** |
| 2 | `feature_bullets_numbering.odt`, `tableRowDeletionTest.odt` (`end`) | je Datei | `align: 'right'` | Fehler 5, zusätzliche Belege |
| 3 | `FruitDepot-SeasonalFruits4.odt`, `fields.odt` (`start`) | je Datei | `align: 'left'` | Fehler 5/Grenzfall 4.10 |
| 4 | `feature_attributes_paragraph_MSO2013.odt` (gemischt `center`/`end`/`justify` im selben Dokument) | `readOdt` | je Absatz korrekt unterschiedene Werte (`'center'`/`'right'`/`'justify'`), keine Vermischung zwischen Absätzen | Fehler 5, gemischter Fall |
| 5 | `HelloWorld.odt` (Absatz referenziert nur Formatvorlage „Standard", kein `fo:text-align`) | `readOdt` | `align: 'left'` (Fallback über `paragraphAligns.get(...) === undefined`) | Grenzfall 4.10, Anforderung 5.2 Testfall 7 |
| 6 | Nach Fix: interner Wert ist **niemals** wörtlich `'start'`/`'end'` | alle Fixtures aus #1–4 durchlaufen, Assertion prüft zusätzlich negativ (`align !== 'start' && align !== 'end'`) | keine rohen ODF-Werte im Dokumentmodell | Fehler 5, Abschluss-Check |

### 1.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`

Bestehende `it.each(['left','center','right','justify'])`-Fälle bleiben
unverändert bestehen (weiterhin gültig, decken die reine Reader/Writer-Parität
für einen einzelnen Absatz ab). **Ergänzt**, nicht ersetzt, um:

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Dokument mit **zwei** unterschiedlich ausgerichteten Absätzen in einem Schreib-/Lesevorgang | beide Ausrichtungen bleiben unterscheidbar erhalten (Absicherung, dass der Writer bei mehreren Blöcken pro Aufruf korrekt bleibt — betrifft nicht Fehler 1, das ist Editor-seitig, siehe Abschnitt 1.1 hier) |
| 2 | Absatz ohne jede explizite Formatierung exportiert immer noch ein explizites `<w:jc w:val="left"/>` (kein weggelassenes Element) | XML-String-Prüfung per Regex auf das exportierte `word/document.xml`, **nicht** über `readDocx` re-importiert (das würde nur die eigene Konsistenz, nicht das tatsächlich geschriebene Byte beweisen) — deckt Rundreise-Testfall 5.1.3 auf Unit-Ebene vor; die entscheidende Bestätigung mit einem unabhängigen Parser erfolgt in E2E (Abschnitt 2.5 #10 unten) |
| 3 | Listenpunkt-Absatz, linksbündig, Rundreise über beide Formate | Ausrichtung **und** Listenzugehörigkeit/-nummerierung gemeinsam erhalten | Grenzfall 4.7 |

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByTitle(...).click()`,
`page.keyboard.type(...)`/`.press(...)`, `input.setInputFiles(...)` für
Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen Datei
vom Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setAlign`/`isAlignActive`/
`setHeading` direkt importieren oder aufrufen — das wäre Ebene 1, nicht
Ebene 2. Wo eine Datei hochgeladen werden muss, wird sie entweder unabhängig
per JSZip von Hand gebaut (Muster `buildSampleDocx()`/`buildSampleOdt()` aus
`tests/e2e/docx.spec.ts`/`odt.spec.ts`) oder es wird eine der oben gelisteten
**echten** Fixture-Dateien direkt hochgeladen — das stellt sicher, dass ein
Rundreise-Test nicht zufällig nur beweist, dass Writer und Reader sich
gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/align-left.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

`beforeEach`: `page.goto('/')` → `page.getByRole('button', { name: /verstanden/i }).click()` →
je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (Muster aus
`selection-regression.spec.ts`).

**Hinweis Button-Beschriftung:** Nach dem in `ausrichtung-links-code.md`
Abschnitt 5.3 geplanten Fix heißen die Titel `"Linksbündig ausrichten"`,
`"Zentriert ausrichten"`, `"Rechtsbündig ausrichten"`, `"Blocksatz"` statt der
aktuellen technischen `"Ausrichtung: left"` usw. Solange dieser Fix noch
aussteht, referenzieren die Tests unten den **Ziel**-Titel — das lässt die
Suite so lange bewusst rot laufen, bis Abschnitt 2, Zeile 4 der Anforderung
(unlokalisierter Titel) tatsächlich behoben ist, statt den heutigen Ist-Titel
stillschweigend zu akzeptieren.

### 2.1 Default-Zustand und Grundverhalten (Grenzfall 4.1, Anforderung 3.1/3.3)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Neues Dokument ist ohne jeden Klick bereits linksbündig | `docxCard`/`odtCard` „Neu erstellen" → Cursor in leerem Absatz | `getByTitle('Linksbündig ausrichten')` hat `aria-pressed="true"` **ohne** vorherigen Klick auf irgendeinen Ausrichtungs-Button | Grenzfall 4.1 |
| 2 | Zentrieren, dann echter Klick auf „Links" | Text tippen, `Strg+A`, `getByTitle('Zentriert ausrichten').click()`, dann `getByTitle('Linksbündig ausrichten').click()` | Absatz im DOM: `p[style*="text-align: left"]`; `aria-pressed` von „Links" wird `true`, von „Zentriert" wird `false` | Testfall 2, Anforderung 3.1 |
| 3 | Klick auf „Links" bei bereits linksbündigem Absatz ist idempotent | frischer Absatz (bereits links), `getByTitle('Linksbündig ausrichten').click()` | keine sichtbare Änderung im DOM (`style="text-align: left"` vorher/nachher identisch); zusätzlich: `Strg+Z` direkt danach macht **nichts** rückgängig sichtbares (kein Doppel-Undo-Effekt), dokumentiert gemäß Grenzfall 4.2/Anforderung 3.9 | Testfall 3, Grenzfall 4.2 |
| 4 | Fokus bleibt nach Klick im Editor | Text markieren, `getByTitle('Linksbündig ausrichten').click()`, sofort weitertippen ohne erneuten Editor-Klick | getippter Text erscheint im Editor (Fokus nicht verloren) | Grenzfall 4.15 |

### 2.2 Mehrfach-Absatz-Selektion — kritischer Regressionstest für Fehler 1

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | **Kernregressionstest**: zwei Absätze zentrieren, dann per echtem Klick auf zwei Absätze linksbündig setzen | `editor.click()` → `type('Erster Absatz.')` → `Enter` → `type('Zweiter Absatz.')` → `ControlOrMeta+a` → `getByTitle('Zentriert ausrichten').click()` → `ControlOrMeta+a` erneut → `getByTitle('Linksbündig ausrichten').click()` | **keine** Konsolenfehler (`page.on('console', ...)`/`pageerror`-Listener registriert vor der Aktion, muss leer bleiben); **beide** `<p>` haben `style*="text-align: left"`; Button „Links" `aria-pressed="true"` | **Fehler 1** — vor dem Fix: Exception, nur der erste Absatz wird geändert |
| 2 | Gemischte Ausgangsausrichtung über zwei Absätze | Absatz 1 zentrieren, Absatz 2 unverändert (bereits links) lassen, beide selektieren, „Links" klicken | beide Absätze danach `text-align: left` im DOM | Testfall 4/Grenzfall 4.4 |
| 3 | Strg+A über ein Dokument mit vielen Absätzen (Grenzfall 4.13) | zehn Absätze per Schleife eintippen (`for`-Schleife über `page.keyboard.type`+`Enter`), `Strg+A`, „Links" klicken | Stichprobe: erster, mittlerer, letzter `<p>` jeweils `text-align: left`; Aktion bleibt innerhalb angemessener Zeit (`await expect(...).toHaveCount(10, { timeout: 5000 })` o. ä.), kein Hänger |
| 4 | Cursor an Absatzgrenze zwischen unterschiedlich ausgerichteten Absätzen | Absatz 1 zentrieren, Absatz 2 links, Cursor exakt ans Ende von Absatz 1 setzen (`End`-Taste am Ende von Absatz 1) | Button-Zustand für „Links"/„Zentriert" wird dokumentiert (welcher der beiden gilt) — Ergebnis hier **festhalten**, Test schlägt fehl, falls sich das Verhalten später unbemerkt ändert | Grenzfall 4.5 |

### 2.3 Listen und Tabellen (Anforderung 3.6/3.7, Grenzfälle 4.7/4.8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Liste zentrieren, auf „Links" zurücksetzen, Liste aufheben | Aufzählungsliste einfügen (`getByRole('button', { name: /Aufzählung/i })`), in einen Punkt tippen, markieren, „Zentriert" klicken, dann „Links" klicken, danach „Liste aufheben" | resultierender normaler Absatz ist weiterhin `text-align: left`, kein Rücksetzen auf einen anderen Default | Grenzfall 4.7, Testfall 6 |
| 2 | **Regressionstest Fehler 2 im Browser**: 3×3-Tabelle, nur mittlere Spalte markieren, „Links" anwenden | `getByRole('button', { name: 'Tabelle einfügen' })` (3×3 falls Dialog vorhanden, sonst Standardgröße nutzen und auf 3 Spalten prüfen), jede Zelle der mittleren Spalte mit unterschiedlichem Ausgangstext befüllen und zunächst zentrieren, dann per Maus-Drag/Shift-Klick über die drei Zellen der mittleren Spalte selektieren (`CellSelection` im Browser), `getByTitle('Linksbündig ausrichten').click()` | **alle drei** Zellen der mittleren Spalte zeigen `text-align: left`; Spalten 1 und 3 bleiben bei ihrer ursprünglichen (nicht-linken) Ausrichtung unverändert | **Fehler 2**, Testfall 7/Grenzfall 4.8 — kritischer Test, da vor dem Fix nur eine der drei Zellen betroffen wäre |

### 2.4 Formatvorlagen-Wechsel (Grenzfall 4.9, Fehler 6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Zentrierten Absatz zu „Überschrift 1" wechseln, dann zurück zu „Standard" | Text tippen, zentrieren, über das Absatzformat-Dropdown zu „Überschrift 1" wechseln, danach zurück zu „Standard" | nach dem Fix (`ausrichtung-links-code.md` Fehler 6): Absatz bleibt nach **beiden** Wechseln zentriert (`text-align: center`), **nicht** stillschweigend auf links zurückgesetzt — Ergebnis explizit gegen die in Abschnitt 7 des Codeplans getroffene Entscheidung geprüft |
| 2 | Rechtsbündige Überschrift zu „Standard" wechseln | Überschrift 1 erzeugen, rechtsbündig setzen, zu „Standard" wechseln | resultierender Absatz bleibt `text-align: right` |

### 2.5 Tastatur, Barrierefreiheit (Abschnitt 2 der Anforderung, Fehler 7/8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | `Strg+L` liefert identisches Ergebnis wie Klick auf „Links" | Absatz zentrieren, `page.keyboard.press('ControlOrMeta+l')` | Absatz `text-align: left`, kein Browser-Adressleisten-Sprung (Seite bleibt auf derselben URL) | Fehler 7, Anforderung 2 Zeile 2 (Entscheidung: nachzuliefern) |
| 2 | `Strg+E`/`Strg+R`/`Strg+J` funktionieren ebenso (Nebenabdeckung der Schwester-Features) | je ein Tastendruck nach Textselektion | jeweils passende `text-align`-Klasse/-Style, keine Kollision mit Browser-Shortcuts bei Editor-Fokus | Fehler 7 (gemeinsamer Fix aller vier Ausrichtungen) |
| 3 | Button per Tastatur (Tab + Enter/Space) auslösbar | `page.keyboard.press('Tab')` bis Fokus auf „Links"-Button, dann `Enter` | Ausrichtung wird angewendet, identisch zum Maus-Klick | **Fehler 8** |
| 4 | `aria-label` vorhanden und konsistent mit `title` | — | `getByTitle('Linksbündig ausrichten')` und `getByLabel('Linksbündig ausrichten')` referenzieren denselben Button | Grenzfall 4.16, Fehler 7 |
| 5 | `Strg+L` bei Fokus außerhalb des Editors wirkt nicht auf den Editor | Fokus auf ein anderes Steuerelement (z. B. Exportieren-Button) legen, `Strg+L` drücken | Editor-Inhalt/Ausrichtung unverändert |

### 2.6 Undo/Redo (Anforderung 3.9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Echte Ausrichtungsänderung, ein Undo macht sie rückgängig | zentrierten Absatz auf „Links" setzen, `ControlOrMeta+z` | Absatz wieder `text-align: center`, Text bleibt vollständig erhalten |
| 2 | Redo stellt „links" wieder her | Fortsetzung: `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) | Absatz wieder `text-align: left` |
| 3 | Mehrfach-Absatz-Fall: ein Undo macht die Änderung für **beide** Absätze rückgängig | zwei Absätze zentriert, „Links" auf beide angewendet, ein `Strg+Z` | **beide** Absätze wieder zentriert (nicht nur einer — bestätigt zugleich, dass Fehler 1 eine einzelne, atomare Transaktion erzeugt) |

### 2.7 Kombination mit Zeichenformaten (Anforderung 3.8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ausrichtung ändert keine Zeichen-Marks | Text mit Fett/Kursiv-Teilen, ganzen Absatz zentrieren dann links setzen | `strong`/`em`-Elemente im Absatz bleiben unverändert erhalten |

### 2.8 Rundreise — alle Pflicht-Szenarien aus Anforderung Abschnitt 5

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML lesen bzw.
für DOCX `word/document.xml`, für ODT `content.xml`), nicht nur, dass der
Editor nach Re-Import „irgendwie richtig aussieht".

**5.1 DOCX**

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | Eigenrundreise Absatz, echter Rückweg über zentriert | Absatz tippen, zentrieren, dann „Links" klicken, exportieren, exportierte Datei per `setInputFiles` erneut hochladen | `word/document.xml` (aus dem ersten Export) enthält `<w:jc w:val="left"/>` für den Absatz; nach Re-Import zeigt der Editor weiterhin `text-align: left` an derselben Textstelle |
| 2 | Eigenrundreise Überschrift, echte Toolbar-Bedienung | Überschrift 1 erzeugen, zentrieren, „Links" klicken, exportieren, re-importieren | dieselbe Prüfung wie #1 für eine Heading-Ebene |
| 3 | Absatz ohne jede explizite Formatierung | neuen Absatz unverändert exportieren | `word/document.xml` enthält `<w:jc w:val="left"/>` **explizit** (per Regex/`DOMParser` geprüft, nicht über `readDocx`) |
| 4 | Listenpunkt, linksbündig | Listenpunkt zentrieren, auf links zurücksetzen, exportieren, re-importieren | Ausrichtung **und** Listenzugehörigkeit/Nummerierung beide erhalten |
| 5 | Cross-Format ODT → DOCX | ODT mit linksbündigem Text hochladen (`odtCard`), als DOCX exportieren (Format-Wechsel über UI, sonst Re-Upload-Pfad wie in `kursiv-qa.md` Muster) | exportiertes `word/document.xml`: `<w:jc w:val="left"/>` |
| 6 | Reale Fremddatei `bug-paragraph-alignment.docx` importieren | Datei per `setInputFiles` hochladen | Absatz 1 im Editor **zentriert** angezeigt (`text-align: center`, Fix für Fehler 3), Absatz 2 `text-align: left`; Button-Zustand nach Cursor in Absatz 1: „Zentriert" aktiv, „Links" nicht |
| 7 | Reale Fremddatei mit `w:jc="start"` (`rtl.docx`/`table-indent.docx`) | Datei hochladen | Absatz optisch/im DOM linksbündig (`text-align: left`); Button „Links" zeigt `aria-pressed="true"` (nach Normalisierung in `normalizeAlign`, Fix aus Codeplan Abschnitt 5.5/5.6) |

**5.2 ODT**

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | Eigenrundreise Absatz, echter Rückweg über zentriert | analog DOCX #1 | `content.xml` referenziert einen Stil mit `fo:text-align="left"` |
| 2 | Eigenrundreise Überschrift | analog DOCX #2 | wie oben, Stilname `Heading{level}-left` |
| 3 | Zwei linksbündige Textläufe teilen sich einen Stil | zwei Absätze, beide links, exportieren | `content.xml`: beide referenzieren **denselben** `Ppara-left`-Stil (keine Duplizierung) |
| 4 | Listenpunkt, linksbündig | analog DOCX #4 | Ausrichtung und Listenzugehörigkeit erhalten |
| 5 | Cross-Format DOCX → ODT | DOCX mit linksbündigem Text hochladen, als ODT exportieren | `content.xml`: `fo:text-align="left"` |
| 6 | Reale Fremddatei `EasyList.odt` (`fo:text-align="end"`) importieren | Datei hochladen | betroffene Absätze im Editor `text-align: right` (**nicht** `start`/`end` wörtlich im DOM), Fix für Fehler 5 |
| 7 | Reale Fremddatei `HelloWorld.odt` (kein `fo:text-align`) importieren | Datei hochladen | Absatz `text-align: left`, Button „Links" aktiv |

**5.3 Doppelte Rundreise / Cross-Format**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | DOCX → ODT → DOCX | linksbündigen Absatz (über echten Rückweg via zentriert → links) als DOCX exportieren, hochladen als ODT-Export, wieder hochladen, erneut als DOCX exportieren | letzter Export: weiterhin `<w:jc w:val="left"/>` an derselben Textstelle |
| 2 | ODT → DOCX → ODT | spiegelbildlich | letzter Export: `fo:text-align="left"` |
| 3 | Dieselbe Prüfung mit einer Überschrift | wie #1/#2, aber Heading statt Absatz | Ausrichtung nach zwei Konvertierungen weiterhin „links" |

### 2.9 Unabhängige Validierung der exportierten Datei

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | DOCX-Export, Regex/`DOMParser`-Prüfung ohne `readDocx` | Export aus 2.8 DOCX #3 laden | `word/document.xml` enthält `<w:jc\s+w:val="left"\s*\/>` — geprüft per `DOMParser`/Regex direkt am String, **nicht** über den eigenen Reader (verhindert sich gegenseitig kompensierende Schreib-/Lesefehler) |
| 2 | ODT-Export, Regex/`DOMParser`-Prüfung | Export aus 2.8 ODT #1 laden | `content.xml` enthält `fo:text-align="left"` im referenzierten automatischen Stil |
| 3 | Manuelle Einmalvalidierung (außerhalb der CI-Suite) | eine exportierte Test-DOCX/-ODT mit „links"-Absatz außerhalb dieses Repos mit `python-docx` bzw. LibreOffice/einem ODF-Validator öffnen | Ergebnis in `ausrichtung-links-req.md` oder einer Folgedatei vermerkt — Pflicht-Checkliste-Punkt vor Abnahme (Abnahmekriterium 2 der Anforderung), kein automatisierter Testschritt |

### 2.10 Regressionstest Selection-Sync-Bug mit „Links" als Auslöser (Grenzfall 4.14, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — Anforderung DoD Punkt 6 verlangt „dauerhaft Teil
der Testsuite", eine zusätzliche, leicht vergessbare Datei widerspricht dem).
Exakt dasselbe Muster wie die bestehenden Fett-Varianten, aber mit einer
Ausrichtungsänderung **über zwei Absätze hinweg** als auslösendem Schritt —
das ist zugleich der Test, der **vor** dem Fix von Fehler 1 bereits an der
Ausrichtungs-Aktion selbst scheitern würde, nicht erst am eigentlichen
Selection-Sync-Symptom:

```ts
test('same regression with a multi-paragraph "Links"-alignment as the triggering action (Grenzfall 4.14)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Zentriert ausrichten').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Linksbündig ausrichten').click() // vor Fehler-1-Fix: Exception, zweiter Absatz bleibt zentriert
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(3)
  await expect(editor.locator('p[style*="text-align: left"]')).toHaveCount(3)
})
```

Zusätzlich: Tabellenzellen-Variante analog zum bestehenden Fett-Muster
(`same regression inside a table cell`), hier mit „Links" statt „Fett" auf
zwei Zellen einer Zeile.

### 2.11 Sichtprüfung/Screenshot (Testfall 15 der Anforderung)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Aussehen im Editor entspricht Aussehen nach Re-Import | Absatz linksbündig setzen, Screenshot/`getComputedStyle` nehmen, exportieren, re-importieren, erneut prüfen | `getComputedStyle(p).textAlign` identisch vor/nach Rundreise (`left` in beiden Fällen), optional visueller Screenshot-Vergleich (`toHaveScreenshot`) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-/Codeplan-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| Grenzfall 4.1 (Default „links") | Unit + E2E | `commands.test.ts` #1, `align-left.spec.ts` §2.1 #1 |
| Anforderung 3.1–3.3 (Setzen, kein Toggle, Idempotenz) | Unit + E2E | `commands.test.ts` #4, `align-left.spec.ts` §2.1 #2–3 |
| **Fehler 1** (Absturz bei Mehrfachselektion) | Unit + E2E | `commands.test.ts` #2/#3, `align-left.spec.ts` §2.2 #1–3 |
| Grenzfall 4.4/4.5 (gemischte Selektion, Absatzgrenze) | Unit + E2E | `commands.test.ts` #9/#10, `align-left.spec.ts` §2.2 #2/#4 |
| Grenzfall 4.6 (Absatz mit nur Bild) | Unit | `commands.test.ts` #8 |
| Grenzfall 4.7 (Liste) | E2E | `align-left.spec.ts` §2.3 #1 |
| **Fehler 2**/Grenzfall 4.8 (Tabellen-Zellauswahl) | Unit + E2E | `commands.test.ts` #11/#12, `align-left.spec.ts` §2.3 #2 |
| **Fehler 6**/Grenzfall 4.9 (Formatvorlagen-Wechsel) | Unit + E2E | `commands.test.ts` #13/#14, `align-left.spec.ts` §2.4 |
| **Fehler 3** (DOCX-Formatvorlagen-Ausrichtung ignoriert) | Unit + E2E | `docx/__tests__/alignment.test.ts` #7/#8, `align-left.spec.ts` §2.8 DOCX #6 |
| **Fehler 4** (`w:jc="end"` → fälschlich links) | Unit | `docx/__tests__/alignment.test.ts` #4 |
| **Fehler 5** (ODT `fo:text-align` nicht normalisiert) | Unit + E2E | `odt/__tests__/alignment.test.ts` #1–6, `align-left.spec.ts` §2.8 ODT #6 |
| Grenzfall 4.10/4.11/4.12 (ODF/OOXML-Wertevarianten) | Unit + E2E | `alignment.test.ts` (beide Formate), `align-left.spec.ts` §2.8 DOCX #7 |
| **Fehler 7** (Tastenkombination, `aria-label`, lokalisierter Titel) | E2E | `align-left.spec.ts` §2.5 #1/#2/#4 |
| **Fehler 8** (Button nur per Maus auslösbar) | E2E | `align-left.spec.ts` §2.5 #3 |
| Anforderung 3.9 (Undo/Redo) | Unit + E2E | `commands.test.ts` #5/#6, `align-left.spec.ts` §2.6 |
| Anforderung 3.8 (keine Nebenwirkung auf Zeichen-Marks) | Unit + E2E | `commands.test.ts` #15, `align-left.spec.ts` §2.7 |
| Grenzfall 4.13 (viele Absätze) | Unit + E2E | `commands.test.ts` #3, `align-left.spec.ts` §2.2 #3 |
| Grenzfall 4.14 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert), Abschnitt 2.10 hier |
| Grenzfall 4.15 (Fokus-Erhalt) | E2E | `align-left.spec.ts` §2.1 #4 |
| Grenzfall 4.16 (`aria-label`) | E2E | `align-left.spec.ts` §2.5 #4 |
| Rundreise Abschnitt 5.1/5.2 (alle Testfälle) | E2E (echter Upload/Download) | `align-left.spec.ts` §2.8 |
| Rundreise Abschnitt 5.3 (Doppel-/Cross-Format) | E2E | `align-left.spec.ts` §2.8 5.3 |
| Unabhängige Validierung (Abnahmekriterium 2) | E2E (automatisiert) + manuell (einmalig) | `align-left.spec.ts` §2.9 #1/#2, §2.9 #3 (manuell) |
| Testfall 15 (Sichtprüfung) | E2E | `align-left.spec.ts` §2.11 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] Alle acht Fehler aus `ausrichtung-links-code.md` Abschnitt 3 sind
      entweder mit Fix + grünem Regressionstest geschlossen, oder — falls ein
      Fund abweichend bewertet wird — hier explizit als bewusst akzeptierte
      Einschränkung dokumentiert (kein stiller Fehlschlag).
- [ ] `npm test` grün, inkl. `commands.test.ts`, `docx/alignment.test.ts`,
      `odt/alignment.test.ts` und der erweiterten `roundtrip.test.ts`-Dateien.
- [ ] `npm run test:e2e` grün, inkl. `align-left.spec.ts` und der Erweiterung
      von `selection-regression.spec.ts`.
- [ ] Der kritische Regressionstest für Fehler 1 (`commands.test.ts` #2,
      `align-left.spec.ts` §2.2 #1) ist **vor** dem Fix nachweislich rot
      gelaufen und **nach** dem Fix grün — nicht nur nachträglich grün
      geschrieben, ohne den Fehler je gesehen zu haben (Review-Punkt).
- [ ] Tabellen-Zellauswahl-Grenzfall (4.8/Fehler 2) geprüft, tatsächliches
      Verhalten (Unter-, nicht Überanwendung, siehe Codeplan Abschnitt 3.2)
      dokumentiert und mit Fix + Test geschlossen.
- [ ] Formatvorlagen-Wechsel-Grenzfall (4.9/Fehler 6) als behobener Fehler
      bestätigt (Entscheidung aus Codeplan Abschnitt 7 Punkt 1 umgesetzt).
- [ ] ODF-/OOXML-Wertevarianten (`start`/`end`/`distribute`) mit mindestens
      je einer echten Testdatei pro Format geprüft (Abschnitt 1.2/1.3 hier).
- [ ] Tastenkombination und `aria-label` sind nachgerüstet (Entscheidung aus
      Codeplan Abschnitt 7 Punkte 2/3), nicht unentschieden offen gelassen.
- [ ] Manuelle Einmalvalidierung einer exportierten Test-Datei gegen
      `python-docx`/LibreOffice bzw. einen ODF-Validator durchgeführt und in
      `ausrichtung-links-req.md` oder einer Folgedatei vermerkt
      (Abschnitt 2.9 #3 hier).
- [ ] Kein Test in `align-left.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`setAlign`/`isAlignActive`/`setHeading` direkt auf —
      stichprobenartig per Review bestätigt.
- [ ] Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/
      Vermerk zurück (Abnahmekriterium 8 der Anforderung).
