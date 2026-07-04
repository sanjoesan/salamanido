# QA-Testplan: Feature „Nummerierte Liste"

Rolle: QA-Antwort auf `specs/nummerierte-liste-req.md` (Anforderung, Abschnitte 1–7)
und `specs/nummerierte-liste-code.md` (Entwicklerplan/Befunde, Abschnitte 0–6).
Dieses Dokument nimmt **keinen** der beiden Vorgängertexte als bewiesen an — auch
`nummerierte-liste-code.md` ist laut eigenem Titel ein *Umsetzungsplan*, keine
verifizierte Umsetzung. Ergebnis ist ein Testplan, kein Testbericht: die meisten
hier aufgeführten Testfälle sind zum Zeitpunkt dieses Dokuments **noch nicht
geschrieben** und ein erheblicher Teil davon prüft Verhalten, das laut Code-Sichtung
noch **gar nicht gebaut** ist (Tab/Shift-Tab, aktiver Button-Zustand, Fortsetzen/
Neustart-UI, mehrstufiger DOCX-Im/Export, Tabellenzellen-Listen beim DOCX-Import,
`styles.xml`-Auflösung/`list-header` bei ODT). Diese Fälle werden unten bewusst als
**erwartet ROT** geführt (Abschnitt 5), nicht stillschweigend weggelassen — das ist
gerade der Sinn von Abschnitt 7 der Anforderung („kein Punkt darf offen bleiben").

Stil/Gliederung orientiert an `fett-qa.md`/`datei-oeffnen-qa.md` (gleiches Repo,
gleiche Konventionen für Testumgebung/Locator/Ausführung).

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `nummerierte-liste-code.md`)

Vor Aufstellung des Plans wurden die zentralen Behauptungen aus
`nummerierte-liste-code.md` §1 direkt im aktuellen Code nachvollzogen (nicht nur aus
dem Dokument übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| `toggleList` ruft ausnahmslos `wrapInList` auf, kein echtes Toggle | `src/formats/shared/editor/commands.ts:57-60` gelesen | **Bestätigt.** `export function toggleList(ordered) { const listType = ...; return wrapInList(listType) }` — keine Fallunterscheidung. |
| `liftFromList` ist reiner `liftListItem`-Alias | `commands.ts:62-64` gelesen | **Bestätigt.** |
| Kein `Tab`/`Shift-Tab` in der Keymap, `sinkListItem` nirgends importiert | `src/formats/shared/editor/WordEditor.tsx` (`keymap({...})`-Block) gelesen; `grep -rn sinkListItem src/` ausgeführt | **Bestätigt.** Keymap enthält nur `Mod-z/y/Shift-z`, `Enter: splitListItem(...)`, `Mod-b/i/u`. Grep liefert **0** Treffer für `sinkListItem` in `src/`. |
| `ordered_list.attrs` hat nur `start`, kein Fortsetzen/Neustart-Attribut | `src/formats/shared/schema.ts:83-96` gelesen | **Bestätigt.** `attrs: { start: { default: 1, validate: 'number' } }`, kein `numberingMode` o. ä. |
| Feste globale `numId` je Listentyp | `src/formats/docx/styleDefs.ts:34-35` gelesen | **Bestätigt.** `export const BULLET_NUM_ID = 1`, `export const ORDERED_NUM_ID = 2`. |
| DOCX-Reader liest nur `w:numId`, nicht `w:ilvl` | `src/formats/docx/reader.ts:193-200` (`listMarkerFor`) gelesen | **Bestätigt.** `interface ListMarker { numId: string \| null }` — kein `ilvl`-Feld überhaupt im Typ. |
| DOCX-Tabellenzellen verlieren Listen beim Import komplett | `src/formats/docx/reader.ts:210-240` (`parseTable`) gelesen | **Bestätigt.** Zellinhalt wird ausschließlich über `childElements(tcEl,…,'p').flatMap(p => paragraphToBlocks(...))` gebaut — `listMarkerFor`/`groupLists` werden in dieser Funktion **nicht** aufgerufen. |
| ODT-Reader mischt `styles.xml`-Automatikstile nie in die Body-Auflösung | `src/formats/odt/reader.ts:239-260` (`readOdt`) gelesen | **Bestätigt.** `stylesXmlText`/`stylesAutomaticStyles` werden geladen, aber laut Code nur für Kopf-/Fußzeilen-Auflösung verwendet, nicht für `bodyBlocks`. |
| ODT-Reader ignoriert `<text:list-header>` | `src/formats/odt/reader.ts:182` gelesen | **Bestätigt.** `childElements(el, ODF_NAMESPACES.text, 'list-item')` — kein zweiter Aufruf für `'list-header'`. |
| Toolbar-Buttons „Aufzählung"/„Nummerierte Liste" ohne `aria-pressed`/`aria-label` | `src/formats/shared/editor/Toolbar.tsx` gelesen (Button-Block „• Liste"/„1. Liste"/„⇧ Liste") | **Bestätigt.** Nur `title`; im Unterschied dazu tragen `MarkButton` (`aria-pressed`+`aria-label`), `AlignButton` (`aria-pressed`) und der Tabellen-Button (`aria-pressed={isInTable(...)}`) beides bzw. Ersteres. |
| Bestehende Rundreise-Tests decken nur flache Listen ab; DOCX hat „zwei Listen mit trennendem Absatz", ODT nicht | `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`, Abschnitt „round trip: lists" gelesen | **Bestätigt.** DOCX-Datei hat zusätzlich den Test „keeps two separate lists distinct when a paragraph separates them" (Z. 161ff.), die ODT-Datei hat exakt diesen Test **nicht**. |

Konsequenz für diesen Testplan: Alle diese Punkte werden unten als **aktuell rot
erwartete** Testfälle geführt (dokumentieren den Bug bzw. die fehlende Funktion, bis
`nummerierte-liste-code.md` umgesetzt ist), nicht als hypothetische Grenzfälle.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern er
    nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe Abschnitt 3.14).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in neuen Tests beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Listen-Buttons: `page.getByTitle('Nummerierte Liste')`, `page.getByTitle('Aufzählung')`,
    `page.getByTitle('Liste aufheben')` (Titel laut `Toolbar.tsx`, aktuell die einzige
    stabile Locator-Grundlage, da `aria-label` bei diesen drei Buttons noch fehlt —
    siehe Abschnitt 0).
  - Datei-Upload: `input[type="file"]` innerhalb der jeweiligen Karte, alternativ
    echter `filechooser`-Weg über den sichtbaren „Datei hochladen"-Button (siehe
    Abschnitt 3.13 für den Unterschied, analog `fett-qa.md` Abschnitt 3.4).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`
    + `download.path()` + `fs.readFile` + `JSZip.loadAsync(...)` (DOCX:
    `word/document.xml`, ggf. `word/numbering.xml`; ODT: `content.xml`, ggf.
    `styles.xml`).
- In jeder neuen Spec-Datei global Konsolen-/Seitenfehler mitschneiden (Nachweis für
  „kein Absturz"): `page.on('pageerror', ...)`, `page.on('console', msg => msg.type()==='error' ...)`,
  am Testende `expect(errors).toEqual([])`.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene. Testet
ausschließlich `writeDocx`/`readDocx`/`writeOdt`/`readOdt`/`wordSchema`/`commands.ts`
direkt, **keine** Playwright-Interaktion. Diese Ebene allein genügt laut
`nummerierte-liste-req.md` §7 nicht als Abnahmenachweis (siehe Abschnitt 3 unten für
die Pflichtebene „echte Bedienung").

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:136` | „preserves bullet lists with multiple items" | Grundfall 2.1 |
| `src/formats/docx/__tests__/roundtrip.test.ts:153` | „preserves ordered lists distinctly from bullet lists" | Grundfall 2.1/2.7 |
| `src/formats/docx/__tests__/roundtrip.test.ts:161` | „keeps two separate lists distinct when a paragraph separates them" | Teilaspekt Grenzfall 3.5 (nur **mit** trennendem Absatz) |
| `src/formats/odt/__tests__/roundtrip.test.ts:136/153` | Analog zu den ersten beiden DOCX-Fällen | Grundfall 2.1/2.7 |
| `src/formats/docx/__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts` | Import aller Fixtures, bislang nur „stürzt nicht ab" | Teilabdeckung §4.2 (nur Absturzfreiheit, keine inhaltliche Assertion) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt, sondern
ergänzt. Fehlend und in 2.3 nachzutragen: der ODT-Fall „zwei Listen mit trennendem
Absatz bleiben getrennt" (siehe Abschnitt 0, letzte Zeile).

### 2.2 Neue/erweiterte Testfälle — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| DL1 | Mehrstufige Liste (3 Ebenen) bleibt erhalten | `ordered_list` mit `list_item`, dessen zweiter Block-Kind wiederum ein `ordered_list` ist (2 Ebenen tief geschachtelt, insgesamt 3 Ebenen) → `writeDocx` → `readDocx` | Verschachtelungstiefe im resultierenden JSON identisch zum Original (3 Ebenen `ordered_list` ineinander) | 2.4, 4.1.3 | **ROT** — `blockToDocx` schreibt `w:ilvl="0"` fix und verwirft `listNumId` bei jedem rekursiven Aufruf (§1.5 Code-Doc); Reader gruppiert zusätzlich rein flach nach `numId` |
| DL2 | Sinkende Nummernvergabe bei Umwandlung Ebene 2 ↔ Ebene 3 | Wie DL1, aber Assertion zusätzlich auf `<w:numId>`-Gleichheit aller drei Ebenen in `document.xml` (rohes XML parsen) | Alle drei Ebenen tragen dieselbe `numId`, unterschiedliches `ilvl` (0/1/2) | 2.4 | **ROT** |
| DL3 | Individueller Startwert (`start: 5`) übersteht Rundreise | `ordered_list` mit `attrs: { start: 5 }` → `writeDocx` → `readDocx` | `result` enthält weiterhin `ordered_list` mit `attrs.start === 5` | 3.10, 4.1.5 | **ROT** — `blockToDocx` liest `node.attrs.start` nie (§1.5); selbst wenn geschrieben, erzeugt `groupLists` beim Reimport JSON ohne `attrs` überhaupt |
| DL4 | Zwei unmittelbar aufeinanderfolgende, aber **getrennt gemeinte** Listen bleiben getrennt **ohne** trennenden Absatz dazwischen | `[ordered_list(A,B), ordered_list(C,D)]` direkt hintereinander im Content-Array (kein Paragraph dazwischen) → `writeDocx` → `readDocx` | `result.body.content` enthält **zwei** `ordered_list`-Knoten mit je 2 `list_item`s (nicht einen mit 4) | Grenzfall 3.5, 4.1.6 | **ROT** — bestätigter Kernverdacht: feste `numId=2` für jede `ordered_list`, `groupLists` gruppiert rein nach `numId`-Gleichheit (§1.5) |
| DL5 | Nummerierte Liste innerhalb einer Tabellenzelle übersteht Rundreise | `table` → `table_row` → `table_cell` mit `content: [ordered_list(...)]ähnlich` → `writeDocx` → `readDocx` | Zelle enthält nach Reimport weiterhin einen `ordered_list`-Knoten mit denselben `list_item`-Texten | 2.8, 4.1.7 | **ROT** — Schreiben funktioniert laut Code-Doc bereits (generischer `blockToDocx`-Aufruf in `tableToDocx`), Lesen verwirft die Liste vollständig (§1.5, bestätigter Komplettverlust, nicht nur Ebenenverlust) |
| DL6 | Sehr tiefe Verschachtelung (10 Ebenen) — kein Absturz | 10-fach verschachtelter `ordered_list`-Baum → `writeDocx` → `readDocx` | Kein Wurf/Exception; Ergebnis enthält mindestens den vollständigen Text aller 10 Punkte (Format-Wiederholung ab Ebene 9 ist zulässig, siehe `nummerierte-liste-code.md` §6 Punkt 1) | Grenzfall 3.6 | Aktuell **GRÜN erwartbar für „kein Absturz"** (flaches Import degradiert nur die Ebenen, wirft aber vermutlich nicht), **ROT für „Ebenen bleiben erhalten"** — beide Teilaussagen getrennt assertieren |
| DL7 | Einzelner Listenpunkt exportiert als valide Liste | `ordered_list` mit genau einem `list_item` → Rundreise | `result` enthält `ordered_list` mit `content.length === 1`, kein Spezialfall-Downgrade zu Absatz | Grenzfall 3.2 | Erwartet **GRÜN** |
| DL8 | Leere Liste erzeugen und sofort wieder aufheben hinterlässt keinen Rest | Modell direkt ohne Listenknoten bauen (simuliert „nach Aufheben") → `writeDocx` → `readDocx` | Kein `ordered_list`/`list_item` im Ergebnis, kein Crash | Grenzfall 3.1 | Erwartet **GRÜN** (reine Datenebene, kein Editor-Zustand betroffen) |
| DL9 | Umlaute/Sonderzeichen im Listenpunkt | `list_item`-Text `„Prüfung äöü ß – 100 % fertig?"` → Rundreise | Text zeichengetreu erhalten, Nummerierung unbeeinflusst | Grenzfall 3.11 | Erwartet **GRÜN** |
| DL10 | Absatzausrichtung eines einzelnen Listenpunkts bleibt individuell | Liste mit 2 `list_item`s, deren innerer `paragraph` unterschiedliche `align`-Werte hat → Rundreise | Ausrichtung je Punkt bleibt individuell (nicht auf Listenstandard zurückgesetzt) | 2.8 | Erwartet **GRÜN** (nutzt bereits getesteten Ausrichtungs-Mechanismus) |
| DL11 | Lange Liste (60 Punkte) — Korrektheit, nicht nur Performance | 60 `list_item`s mit fortlaufend nummeriertem Text (`Punkt 1`…`Punkt 60`) → Rundreise | Alle 60 Punkte in **korrekter Reihenfolge** vorhanden, keine Lücke/Duplikat | Grenzfall 3.12 | Erwartet **GRÜN** |
| DL12 | Cross-Format-Doppelrundreise (DOCX → ODT → DOCX) für mehrstufige Liste | Siehe Abschnitt 2.7 (`cross-format-roundtrip.test.ts`) | — | 4.1.8 | **ROT** solange DL1 rot ist |

### 2.3 Neue/erweiterte Testfälle — `src/formats/odt/__tests__/roundtrip.test.ts`

Analoge Fälle OL1–OL11 spiegelbildlich zu DL1–DL11 (Assertions auf `<text:list>`/
`<text:list-item>`-Verschachtelung bzw. `text:start-value` in `content.xml` statt
OOXML), zusätzlich:

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| OL1 | Mehrstufige Liste (3 Ebenen) bleibt erhalten | Wie DL1 | Verschachtelungstiefe erhalten | 2.4, 4.1.4 | **Positiv abweichend von DOCX erwartet halb-GRÜN**: `elementToBlocks` ist laut Code-Doc §1.6 bereits strukturell mehrstufig-fähig (Lese-**und**-Schreibpfad) — Test kann grün sein für die reine Struktur, aber **ROT** für Ebenenformat-Vollständigkeit (nur `text:level="1"` in `listStyleDefs()` definiert, §1.6 Punkt 1) |
| OL2 | Startwert (`start: 5`) übersteht Rundreise | Wie DL3 | `attrs.start === 5` nach Reimport | 3.10, 4.1.5 | **ROT** — `text:start-value` wird nirgends geschrieben/gelesen (§1.6 Punkt 3) |
| OL3 | Zwei getrennte Listen **ohne** trennenden Absatz bleiben getrennt | Wie DL4 | Zwei separate `ordered_list`-Knoten | Grenzfall 3.5, 4.1.6 | Zu verifizieren — Code-Doc äußert sich für ODT nicht explizit zu diesem Fall; **muss zuerst tatsächlich ausgeführt werden**, um Status zu bestimmen (ODT-Schreibpfad nutzt laut §1.6 ebenfalls einen globalen, festen Stilnamen `LO`/`LB`, was strukturell dieselbe Verschmelzungsgefahr wie bei DOCX nahelegt — aber ODF-Listen werden nicht wie OOXML rein über eine ID gruppiert, sondern über echte Baumstruktur, daher nicht automatisch derselbe Bug) |
| OL4 | **Neue Basis-Testgruppe**: „zwei Listen mit trennendem Absatz bleiben getrennt" | 1:1 wie der bestehende DOCX-Test `roundtrip.test.ts:161`, für ODT bisher komplett fehlend (siehe Abschnitt 0) | Zwei separate `ordered_list`/`bullet_list`-Knoten | 4.1.6 (Basisfall) | Erwartet **GRÜN**, aber als **fehlender Test** nachzutragen — Lücke selbst ist der Befund |
| OL5 | Liste innerhalb Tabellenzelle | Wie DL5 | Zelle enthält Liste nach Reimport | 2.8, 4.1.7 | Zu verifizieren — Code-Doc dokumentiert für ODT **keinen** Komplettverlust wie bei DOCX; Status durch Ausführung bestimmen, nicht annehmen |
| OL6 | `text:continue-numbering="true"` an einer zweiten Liste → Fortsetzung | Handgebautes `content.xml` (nicht über `writeOdt`, da Attribut fehlt) mit zwei `<text:list>`, zweite mit `text:continue-numbering="true"` → `readOdt` | `numberingMode`/berechneter `start` spiegelt Fortsetzung (sobald Attribut existiert) | 2.5, 4.1.5/6.4 | **ROT/blockiert** bis Schema-Erweiterung `numberingMode` existiert (§2.4 Code-Doc) — vorerst als Reader-only-Test gegen rohes XML formulierbar, siehe 2.5 unten |

### 2.4 Neue Dateien — Reader-fokussierte Tests mit handgebauten Dateien (nicht über eigenen Writer)

Mehrere Befunde lassen sich nur mit **fremd** aussehendem, handgebautem XML testen,
da der projekteigene Writer die betreffenden Konstrukte (mehrere `<w:lvl>` je
`abstractNum`, `w:lvlOverride`/`w:startOverride`, `<text:list-header>`,
`styles.xml`-Style-Referenzen, `text:continue-numbering`) noch gar nicht erzeugt.
Analog zum Muster in `docx.spec.ts`/`odt.spec.ts` (`buildSampleDocx`/`buildSampleOdt`,
über `JSZip` roh gebaut), aber auf Unit-Ebene direkt gegen `readDocx`/`readOdt`.

**Neue Datei `src/formats/docx/__tests__/list-reader.test.ts`:**

| # | Testfall | Aufbau | Erwartung | Bezug | Status |
|---|---|---|---|---|---|
| RD1 | `w:ilvl` wird pro Absatz gelesen | `document.xml` mit 3 Absätzen, `w:numId=1`, `w:ilvl` = 0/1/0 | Ergebnis-Baum: Punkt 1 und 3 auf oberster Ebene, Punkt 2 als verschachtelter Unterpunkt | 2.4, §1.5 Punkt 3 | **ROT** |
| RD2 | `numbering.xml` mit mehreren `<w:lvl>` je `abstractNum` | `abstractNum` mit `<w:lvl w:ilvl="0">`(decimal) und `<w:lvl w:ilvl="1">`(lowerLetter) | Ebene 0 als `ordered_list` mit Dezimalzahlen erkennbar, Ebene 1 strukturell tiefer verschachtelt | 2.4 | **ROT** (`parseNumberingXml` liest laut §1.5 nur das erste `<w:lvl>`) |
| RD3 | `w:startOverride` in `<w:num>` | `<w:num><w:abstractNumId .../><w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride></w:num>`, ein Absatz mit dieser `numId` | `ordered_list.attrs.start === 5` | 3.10, Grenzfall 3.14 | **ROT** |
| RD4 | Unordentliche `numId`-Reihenfolge (aus `NumberingWithOutOfOrderId.docx`-Muster nachgebaut) | `numId`-Werte nicht aufsteigend vergeben, mit expliziten Overrides | Import ohne Absturz, Grundnummerierung/-ebene korrekt zugeordnet | Grenzfall 3.14 | Zu verifizieren |
| RD5 | Tabellenzelle mit `w:numPr`-Absatz | `parseTable`-Pfad direkt mit Zelle, die einen nummerierten Absatz enthält | Zelle enthält `ordered_list`, nicht nur einen normalen `paragraph` | 2.8, §1.5 (Komplettverlust) | **ROT** |

**Neue Datei `src/formats/odt/__tests__/list-reader.test.ts`:**

| # | Testfall | Aufbau | Erwartung | Bezug | Status |
|---|---|---|---|---|---|
| RO1 | `<text:list-header>` wird nicht verschluckt | `<text:list><text:list-header><text:p>Kopfzeile</text:p></text:list-header><text:list-item>...</text:list-item></text:list>` | „Kopfzeile" kommt im resultierenden `body`-Text vor (als eigener Absatz vor der Liste, laut Design in §2.8) | §1.6 Punkt 6, Fixtures `ListHeading.odt`/`ListHeading2.odt` | **ROT** |
| RO2 | Listenstil nur in `styles.xml`, referenziert aus `content.xml` | `content.xml`: `<text:list text:style-name="L1">` ohne lokale Definition; `styles.xml`: `<office:automatic-styles><text:list-style style:name="L1">...<text:list-level-style-number .../>...` | Liste wird als `ordered_list` erkannt (nicht fälschlich als `bullet_list`) | §1.6 Punkt 5, Fixtures `listStyleId.odt`/`ListStyleResolution.odt` | **ROT** |
| RO3 | `text:start-value` am ersten `<text:list-item>` | `<text:list-item text:start-value="5"><text:p>...` | `ordered_list.attrs.start === 5` | 3.10 | **ROT** |
| RO4 | `text:continue-numbering="true"` | Zweite `<text:list>` mit diesem Attribut nach einer ersten gleichtypigen Liste | Fortsetzungs-Semantik erkennbar (sobald Datenmodell dafür existiert — bis dahin: Test dokumentiert zumindest, dass das Attribut aktuell **ignoriert** wird, kein Crash) | 2.5 | **ROT/dokumentierend** |
| RO5 | `<text:list-item>` ohne führenden `<text:p>` (Container-Unterliste) | Erstes Kind eines `list-item` ist direkt ein verschachteltes `<text:list>` | Kein Wurf beim späteren `wordSchema.nodeFromJSON(...)` — `readOdt` selbst liefert ein Schema-valides `list_item` (mit vorangestelltem leerem Absatz) | §1.6 Punkt 7 | **ROT** (aktuell keine defensive Absicherung) |

### 2.5 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT), je genannter Datei mit inhaltlicher Assertion

Anforderung §4.2 verlangt für **jede** dort genannte Fixture „(a) Import ohne
Absturz/Datenverlust **und** (b) Rundreise auf inhaltliche Gleichheit" — nicht nur
„stürzt nicht ab". Alle unten genannten Dateien wurden per `Glob`
(`tests/fixtures/external/{docx,odt}/`) als tatsächlich vorhanden bestätigt.

**`src/formats/docx/__tests__/external-fixtures.test.ts` — neue, dateispezifische Blöcke:**

| # | Fixture | Zusätzliche Assertion | Bezug | Status jetzt |
|---|---|---|---|---|
| FD1 | `ComplexNumberedLists.docx` | Import ohne Absturz **und**: mindestens ein `list_item` liegt strukturell mindestens 2 Ebenen tief verschachtelt vor (nicht alles auf Ebene 0) | 4.2, Kernfixture 2.4/3.6 | **ROT** (aktuell garantiert flach laut §1.5) |
| FD2 | `Numbering.docx` | Reguläre Nummerierungsdefinition korrekt aufgelöst: Anzahl `ordered_list`-Punkte entspricht Anzahl `w:numPr`-Absätzen im Original | 4.2 | Zu verifizieren |
| FD3 | `NumberingWithOutOfOrderId.docx` | Import ohne Absturz, Text jedes Listenpunkts vollständig vorhanden trotz nicht aufsteigender `numId`-Werte | Grenzfall 3.14 | Zu verifizieren |
| FD4 | `NumberingWOverrides.docx` | Start-/Ebenen-Overrides ausgelesen: mindestens ein `ordered_list.attrs.start !== 1`, wo die Datei einen `w:startOverride` enthält (vorab per `unzip`/`numbering.xml`-Sichtung bestätigen, welcher konkrete Wert erwartet wird) | Grenzfall 3.14, 3.10 | **ROT** (Override-Lesung fehlt laut §1.5) |
| FD5 | Rundreise für FD1–FD4 | Jede der vier Dateien zusätzlich: Import → `writeDocx` (unverändert) → `readDocx` → Textinhalt jedes Listenpunkts identisch zum ersten Import | §4.2 „Vorgabe" (a)+(b) | **ROT** für FD1/FD4, zu verifizieren für FD2/FD3 |

**`src/formats/odt/__tests__/external-fixtures.test.ts` — neue, dateispezifische Blöcke:**

| # | Fixture | Zusätzliche Assertion | Bezug | Status jetzt |
|---|---|---|---|---|
| FO1 | `ContinueListTest.odt` | Fortsetzungsverhalten erkennbar/dokumentiert (mindestens: kein falscher Neustart bei „1.", sofern Datei das erwartet — Inhalt vorab durch Öffnen bestätigen) | 2.5 | **ROT/zu verifizieren** |
| FO2 | `listLevel10.odt` | Import ohne Absturz/Endlosschleife; Text aller Ebenen vorhanden | Grenzfall 3.6 | Zu verifizieren |
| FO3 | `listsInTable.odt` | Liste innerhalb Tabellenzelle importiert (nicht als reiner Absatz) | 2.8 | Zu verifizieren (siehe OL5 oben) |
| FO4 | `simple-table-with-lists.odt` | Analog FO3 | 2.8 | Zu verifizieren |
| FO5 | `ListRoundtrip.odt` | Expliziter Rundreise-Test: Import → unverändert exportieren → Reimport → Listenstruktur (Typ, Anzahl Punkte, Ebene) identisch | 4.2 „expliziter Rundreise-Testfall" | Zu verifizieren |
| FO6 | `brokenList.odt` | Definierter Fallback statt Absturz/Datenverlust (Ergebnis dokumentieren: welcher Fallback tatsächlich greift) | Grenzfall 3.15 | Zu verifizieren, **muss** in jedem Fall grün sein (kein Crash ist Pflicht, unabhängig vom Nummerierungsergebnis) |
| FO7 | `ListOddity.odt` | Analog FO6 | Grenzfall 3.15 | Zu verifizieren |
| FO8 | `listStyleId.odt` | Als `ordered`/`bullet` korrekt über referenzierten Stil erkannt (nicht fälschlich Bullet-Fallback) | §1.6 Punkt 5 | **ROT** |
| FO9 | `ListStyleResolution.odt` | Analog FO8 | §1.6 Punkt 5 | **ROT** |
| FO10 | `ListHeading.odt` | Text der `<text:list-header>`-Kopfzeile ist nach Import **irgendwo** im Body-Text auffindbar (nicht verschwunden) | §1.6 Punkt 6 | **ROT** |
| FO11 | `ListHeading2.odt` | Analog FO10 | §1.6 Punkt 6 | **ROT** |
| FO12 | Restliche Listen-Fixtures (`EasyList*.odt`, `simpleList*.odt`, `simple_bullet_list*.odt`, `preparedList.odt`, `liste2.odt`, `list.odt`, `bulletListTest.odt`, `bullet_list.odt`, `imageWithinList.odt`) | Für jede Datei: Import ohne Absturz **und** Rundreise (Import → unverändert exportieren → Reimport) → Textinhalt jedes Listenpunkts identisch zum ersten Import (per `test.each` über die Dateiliste) | §4.2 letzter Punkt | Zu verifizieren je Datei, Ergebnis-Tabelle beim Ausführen nachtragen |

### 2.6 Neue Datei: `src/formats/shared/editor/__tests__/list-commands.test.ts`

Unit-Tests direkt auf `EditorState`-Ebene (kein DOM/Playwright nötig), analog zum
Muster reiner Funktionstests im Projekt (`pagination.test.ts`). Deckt
`nummerierte-liste-code.md` §2.1–§2.4 ab, bevor der Aufwand eines Browser-Tests
investiert wird.

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| C1 | `toggleList(true)` außerhalb jeder Liste | `EditorState` mit zwei normalen Absätzen, Selektion über beide → `toggleList(true)(state, dispatch)` | `true` zurückgegeben, Ergebnis-Dokument enthält einen `ordered_list` mit 2 `list_item`s | 2.1 | Erwartet **GRÜN** (unveränderter Pfad laut Design 2.1 Code-Doc) |
| C2 | `toggleList(true)` auf **erstem** Punkt einer bestehenden Ordered-Liste (Regressionstest stiller No-Op) | `ordered_list` mit 2 Punkten, Cursor im ersten Punkt → `toggleList(true)` | **Muss** die Liste aufheben (echtes Toggle „aus"), **nicht** `false`/No-Op zurückgeben | 2.7, §1.2 Code-Doc | **ROT** — aktueller `wrapInList`-Aufruf liefert laut Bibliotheksanalyse `false` in genau diesem Fall |
| C3 | `toggleList(true)` auf **späterem** Punkt derselben Liste (Regressionstest Verschachtelung) | Wie C2, aber Cursor im zweiten Punkt | Darf **keine** verschachtelte Liste-in-Liste erzeugen; Ergebnis bleibt eine flache Liste (aufgehoben oder unverändert, je nach finalem Design — mindestens keine Verschachtelung) | 2.7, Grenzfall aus Anforderung „keine verschachtelte Liste-in-Liste" | **ROT** — aktueller Code verschachtelt laut Bibliotheksanalyse (§1.2) |
| C4 | `toggleList(true)` auf einer bestehenden **Bullet**-Liste (Formatwechsel) | `bullet_list` mit 2 Punkten, ganze Liste selektiert → `toggleList(true)` | Ergebnis: **ein** `ordered_list` mit denselben 2 Punkten, kein `bullet_list` mehr, keine Verschachtelung | 2.7 | **ROT** (aktuell laut §1.2 stiller No-Op, wenn ganze Liste selektiert: `findWrapping` scheitert) |
| C5 | `isListActive(state, true)` erkennt Cursor in `ordered_list` | Cursor in einem `list_item` innerhalb `ordered_list` | `true` | 1, §2.2 Code-Doc | **ROT** — Funktion existiert noch nicht im Code |
| C6 | `isListActive(state, true)` liefert `false` außerhalb einer Liste | Cursor in normalem Absatz | `false` | 1 | **ROT** (nicht existent) |
| C7 | `indentListItem()` rückt zweiten Punkt eine Ebene ein | `ordered_list` mit 2 Punkten, Cursor im zweiten → `indentListItem()` | Zweiter Punkt wird zu verschachteltem `list_item` unter dem ersten | 2.4 | **ROT** — Funktion existiert nicht (`sinkListItem` nirgends importiert, siehe Abschnitt 0) |
| C8 | `indentListItem()` auf **erstem** Punkt einer (Unter-)Liste | Cursor im ersten Punkt → `indentListItem()` | Kein Sink möglich; Rückgabe `true` **innerhalb** einer Liste (Tab-Event wird geschluckt, kein Fokusverlust), aber kein strukturell verändertes Dokument | 2.4, `liste-einruecken-tab-req.md` Grenzfall 1 | **ROT** |
| C9 | `outdentListItem()` auf verschachteltem Punkt hebt nur eine Ebene | Punkt auf Ebene 2 → `outdentListItem()` | Punkt landet auf Ebene 1, nicht direkt als normaler Absatz | 2.4/2.6 | **ROT** (Funktion existiert nicht) |
| C10 | `liftFromList()` auf verschachteltem Punkt hebt nur eine Ebene (bereits vorhandenes Verhalten, nur bisher ungetestet) | Punkt auf Ebene 2 → `liftFromList()` | Punkt landet auf Ebene 1 | 2.6 | Erwartet **GRÜN** (laut Bibliotheksanalyse §1.2 bereits korrekt, aber unbewiesen — genau der in `nummerierte-liste-code.md` §6 Punkt 3 offen geführte Bestätigungsbedarf) |
| C11 | `liftFromList()` auf oberster Ebene wandelt in normalen Absatz | Punkt auf Ebene 1 (keine weitere Elternliste) → `liftFromList()` | Ergebnis ist `paragraph`, keine Listenreste | 2.6 | Erwartet **GRÜN** |
| C12 | `setListNumbering('restart', 5)` setzt Startwert | `ordered_list`, Cursor darin → `setListNumbering('restart', 5)` | `ordered_list.attrs.start === 5` | 2.5 | **ROT** — Funktion existiert nicht |
| C13 | `setListNumbering('continue')` außerhalb einer vorangehenden Liste liefert `false` | Erste/einzige Liste im Dokument, kein Vorgänger → `setListNumbering('continue')` | `false` (kein stiller Erfolg ohne Wirkung) | 2.5, DoD „kein stiller Fehlschlag" | **ROT** (Funktion existiert nicht) |

### 2.7 Erweiterung — `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Status jetzt |
|---|---|---|---|---|
| X1 | Mehrstufige Ordered-Liste: DOCX → ODT → DOCX | `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` → `readDocx(writeDocx(...))` | Verschachtelungstiefe bleibt über beide Konvertierungen erhalten | **ROT**, solange DL1 rot ist |
| X2 | Ordered-Liste mit Startwert: ODT → DOCX → ODT | Spiegelbildlich | `start`-Wert bleibt über beide Konvertierungen erhalten | **ROT**, solange DL3/OL2 rot sind |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wortgleich zur Vorgabe des Auftrags):**
Kein Testfall in Teil B darf durch direkten Aufruf interner Funktionen
(`toggleList(...)`, `isListActive(...)`, `readDocx(...)` etc.) im Node-Kontext
ersetzt werden. Jeder Testfall läuft über echte Nutzer:innen-Handlungen im Browser:
`locator.click()`, `page.keyboard.press(...)`/`.type(...)`, echter Datei-Upload
(`input.setInputFiles(...)` auf dem realen `<input type="file">` bzw. echter
`filechooser`-Weg), `page.waitForEvent('download')` + Auslesen der **tatsächlich auf
Disk geschriebenen** heruntergeladenen Datei.

Neue Datei: `tests/e2e/lists.spec.ts`. `beforeEach` wie in Abschnitt 1 (Privacy-Banner
wegklicken); je nach Testgruppe zusätzlich `docxCard(page).getByRole('button', {
name: 'Neu erstellen' }).click()` bzw. `odtCard(page)...` für frisch erzeugte
Dokumente, oder echter Upload für Rundreise-/Fixture-Fälle.

### 3.1 Liste erstellen (Anforderung 2.1)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L1 | Cursor ohne Selektion → nur aktueller Absatz wird Liste | Text tippen (ein Absatz), Cursor irgendwo darin, `page.getByTitle('Nummerierte Liste').click()` | `.ProseMirror ol` sichtbar, genau 1 `li`, Text unverändert | Erwartet **GRÜN** |
| L2 | Selektion über mehrere Absätze → jeder wird eigener Listenpunkt derselben Liste | Drei Absätze tippen (`Enter` dazwischen), `ControlOrMeta+a`, Klick auf „Nummerierte Liste" | Genau **eine** `ol` mit 3 `li`, in Original-Reihenfolge | Erwartet **GRÜN** |
| L3 | Umwandlung einer bestehenden Bullet-Liste in nummerierte Liste (keine Verschachtelung) | Bullet-Liste per „Aufzählung"-Button erzeugen, ganze Liste selektieren, „Nummerierte Liste" klicken | Genau **eine** `ol` (kein `ol` verschachtelt in `ul` oder umgekehrt), gleiche Anzahl `li` wie vorher | **ROT** (C4) |

### 3.2 Aktiver Button-Zustand (Anforderung §1 Zeile 1)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L4 | Button zeigt „gedrückt", wenn Cursor in nummerierter Liste steht | Liste erzeugen, Cursor hineinsetzen | `expect(page.getByTitle('Nummerierte Liste')).toHaveAttribute('aria-pressed', 'true')` | **ROT** (kein `aria-pressed` im Code, siehe Abschnitt 0) |
| L5 | Button zeigt „nicht gedrückt" außerhalb der Liste | Cursor aus der Liste heraus in einen normalen Absatz bewegen | `aria-pressed` → `false` | **ROT** |
| L6 | Bullet-Button und Ordered-Button schließen sich gegenseitig aus | Cursor in Ordered-Liste | `page.getByTitle('Aufzählung')` hat `aria-pressed="false"`, `page.getByTitle('Nummerierte Liste')` hat `aria-pressed="true"` | **ROT** |

### 3.3 Enter-Verhalten (Anforderung 2.3)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L7 | Enter am Ende eines nicht-leeren Punkts | Liste mit 1 Punkt „Erster", Cursor ans Ende, `Enter`, tippen „Zweiter" | 2 `li`, Text „Erster"/„Zweiter" je eigener `li`, beide innerhalb derselben `ol` | Erwartet **GRÜN** |
| L8 | Enter am Ende eines **leeren** Punkts beendet die Liste | Liste mit 1 Punkt „Text", `Enter` (neuer leerer Punkt), sofort nochmal `Enter` (ohne zu tippen) | Liste hat weiterhin nur 1 `li`, danach folgt ein normaler `p` (kein zweiter leerer `li`) | Erwartet **GRÜN** (laut Bibliotheksanalyse §1.4 Code-Doc bereits funktional, aber unbewiesen) |
| L9 | Enter in der Mitte eines Punkts teilt Text ohne Verlust | Punkt „AlphaBeta" tippen, Cursor zwischen „Alpha" und „Beta" setzen, `Enter` | 2 `li`: „Alpha" und „Beta", kein Zeichen verloren | Erwartet **GRÜN** |
| L10 | Umschalt+Enter erzeugt Zeilenumbruch **innerhalb** desselben Punkts | Punkt „Zeile1" tippen, `Shift+Enter`, tippen „Zeile2" | Weiterhin genau 1 `li` (kein neuer Listenpunkt), Punkt enthält sichtbar 2 Zeilen (`<br>` oder gleichwertig) | **ROT/dokumentierend** — laut Code-Doc §1.4 ist `Shift-Enter` aktuell **nirgends gebunden** (weder eigenes Plugin noch `baseKeymap`); Test hält das tatsächliche Ist-Verhalten fest (voraussichtlich Browser-Default oder No-Op) und wird erst nach Umsetzung von `zeilenumbruch-manuell-req.md` grün erwartet |

### 3.4 Ein-/Ausrücken per Tab/Shift-Tab (Anforderung 2.4, 3 Testfall Nr. 3)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L11 | Tab am Zeilenanfang rückt ein | Liste mit 2 Punkten, Cursor am Anfang des zweiten Punkts, `page.keyboard.press('Tab')` | Zweiter Punkt wird visuell/strukturell zu Unterpunkt (verschachteltes `ol`/`ul` innerhalb des ersten `li`); DOM: `li ol li` bzw. `li ul li` | **ROT** — keine `Tab`-Bindung im Code (Abschnitt 0) |
| L12 | Drei Ebenen erreichbar, unterscheidbares Format je Ebene | Ausgehend von L11, zusätzlichen dritten Punkt einrücken (`Tab` zweimal) | 3 verschachtelte Ebenen im DOM, `getComputedStyle(...).listStyleType` unterscheidet sich mindestens zwischen Ebene 1 und Ebene 2 (z. B. `decimal` vs. `lower-alpha`) | **ROT** |
| L13 | Shift+Tab rückt aus | Aus L11 fortgesetzt: Cursor im eingerückten Punkt, `Shift+Tab` | Punkt wieder auf oberster Ebene, weiterhin Teil derselben Liste (kein Aufheben aus der Liste) | **ROT** |
| L14 | Shift+Tab auf oberster Ebene ist festgelegtes, dokumentiertes Verhalten (No-Op **oder** Aufheben) | Cursor im ersten, nicht eingerückten Punkt, `Shift+Tab` | Ergebnis protokollieren (eines von beiden ist zulässig laut Anforderung 2.4, muss aber deterministisch und dokumentiert sein) | **ROT/zu entscheiden** — Design-Entscheidung noch offen (siehe `nummerierte-liste-code.md` §6 Punkt 3 verwandte offene Frage) |
| L15 | Tab **außerhalb** einer Liste löst kein Listenverhalten aus | Cursor in normalem Absatz, `Tab` drücken | Kein Einzug/keine Listenumwandlung; Fokus verhält sich wie Standard-Tab (dokumentiertes Ziel: Fokus verlässt ggf. den Editor oder Tab wird ignoriert — Ergebnis konkret festhalten) | Zu verifizieren nach Umsetzung (Anforderung Zeile 4 explizit: „außerhalb einer Liste darf Tab nicht versehentlich Listenverhalten auslösen") |
| L16 | Ein-/Ausrücken beeinflusst Geschwister-Nummerierung nicht | Liste mit 3 Punkten auf Ebene 1, zweiten Punkt einrücken und wieder ausrücken | Punkt 1 und 3 zeigen weiterhin „1." und „2." (nicht „1." und „3." durch einen Zähl-Versatz) | **ROT** (abhängig von L11–L13) |

### 3.5 Liste aufheben (Anforderung 2.6)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L17 | Einstufig: Text bleibt erhalten, Nummerierung verschwindet | Liste mit 2 Punkten, ganze Liste selektieren, „Liste aufheben" klicken | Kein `ol`/`li` mehr, 2 `p` mit unverändertem Text | Erwartet **GRÜN** |
| L18 | Mehrstufig: ein Klick hebt genau eine Ebene an | Punkt auf Ebene 2 (setzt L11 voraus), „Liste aufheben" klicken | Punkt landet auf Ebene 1, ist weiterhin Teil der Liste (kein normaler Absatz nach nur einem Klick) | **ROT** (setzt Tab/Indent aus 3.4 voraus, um Ebene 2 überhaupt zu erzeugen) |
| L19 | Auf oberster Ebene wandelt „Liste aufheben" in normalen Absatz | Punkt auf Ebene 1, „Liste aufheben" klicken | Ergebnis ist `p`, keine Listenreste | Erwartet **GRÜN** |

### 3.6 Wechsel Bullet ↔ Ordered ohne Verschachtelung (Anforderung 2.7)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L20 | Klick auf „Nummerierte Liste" während Cursor im **ersten** Punkt einer bestehenden Ordered-Liste — echtes Toggle „aus" | Liste erzeugen, Cursor im ersten Punkt, „Nummerierte Liste" erneut klicken | Liste wird aufgehoben (Text bleibt als `p` erhalten) — **kein** stiller No-Op | **ROT** (C2) |
| L21 | Klick auf „Nummerierte Liste" während Cursor im **zweiten** Punkt derselben Liste — keine Verschachtelung | Wie L20, Cursor im zweiten Punkt | DOM enthält **keine** `ol`/`ul` verschachtelt innerhalb eines `li` derselben Liste | **ROT** (C3, direkte Reproduktion des in `aufzaehlungsliste-req.md` §2.6/§5.7 referenzierten Bibliotheksverhaltens) |
| L22 | Ganze Bullet-Liste markiert, Klick auf „Nummerierte Liste" | Bullet-Liste mit 3 Punkten, `ControlOrMeta+a` (oder gezielte Selektion über alle 3), Klick | Ergebnis: **eine** `ol` mit 3 `li`, kein `ul` mehr übrig | **ROT** (C4) |

### 3.7 Nummerierung fortsetzen/neu starten/Startwert (Anforderung 2.5, 1 Zeile 6/7)

Diese Gruppe testet UI, die laut Code-Doc §1.3/§2.4 **noch nicht existiert**
(„▾"-Dropdown neben „Nummerierte Liste"). Die konkreten Locator/Rollen unten sind
**Platzhalter nach dem im Code-Doc dokumentierten Entwurf** und müssen beim
Schreiben der Tests an die tatsächlich gewählten `aria-label`/Texte angepasst
werden — das ändert nichts an der geforderten Prüftiefe.

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L23 | Startwert per UI setzen, im Editor sichtbar | Liste erzeugen, Dropdown öffnen, „Beginnen bei:" wählen, `5` eingeben, bestätigen | Erster Listenpunkt zeigt visuell „5." (`::marker`/`<ol start="5">`) | **ROT** (UI existiert nicht) |
| L24 | Startwert übersteht Export | Wie L23, danach exportieren (DOCX) | Heruntergeladene `document.xml` enthält für diesen Absatz ein `<w:numId>` mit zugehörigem `<w:startOverride w:val="5">` in `numbering.xml` (oder äquivalenter Mechanismus) | **ROT** |
| L25 | „Nummerierung fortsetzen" nur aktivierbar, wenn passende Vorgängerliste existiert | Einzelne, erste Liste im Dokument, Dropdown öffnen | Option „fortsetzen" ist deaktiviert/ausgegraut mit erkennbarer Begründung (kein stiller Fehlschlag, `aria-disabled` + Tooltip/Text) | **ROT** |
| L26 | „Nummerierung fortsetzen" aktiv nutzbar bei vorhandener Vorgängerliste | Erste Liste (3 Punkte) erzeugen, normalen Absatz einfügen, zweite Liste erzeugen, Dropdown → „fortsetzen" wählen | Erster Punkt der zweiten Liste zeigt „4." (nicht „1.") | **ROT** |
| L27 | Fortsetzen übersteht Export/Reimport | Wie L26, exportieren, exportierte Datei erneut hochladen | Zweite Liste zeigt nach Reimport weiterhin bei „4." beginnend | **ROT** |

### 3.8 Liste innerhalb einer Tabellenzelle (Anforderung 2.8)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L28 | Liste in Zelle erzeugen, sichtbar im Editor | Tabelle einfügen, in eine Zelle klicken, Text tippen, „Nummerierte Liste" klicken | Zelle enthält `ol`/`li` | Erwartet **GRÜN** (reine Editor-Bedienung, unabhängig vom Export-Bug) |
| L29 | Rundreise DOCX: Liste in Zelle übersteht Export **und** Re-Upload | Wie L28, exportieren, exportierte Datei erneut über „Datei hochladen" laden | Zelle enthält nach Re-Upload weiterhin `ol`/`li` mit unverändertem Text | **ROT** (bestätigter Komplettverlust laut §1.5) |
| L30 | Rundreise ODT: analog | Wie L29, ODT-Karte | Zelle enthält nach Re-Upload weiterhin Liste | Zu verifizieren (siehe OL5/FO3/FO4) |

### 3.9 Undo/Redo, inkl. Selection-Sync-Regressionsmuster (Anforderung 2.8 letzter Punkt)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L31 | Undo direkt nach Listenerstellung stellt Ursprungszustand exakt wieder her | Zwei Absätze tippen, beide selektieren, „Nummerierte Liste" klicken, `ControlOrMeta+z` | Kein `ol`/`li` mehr, ursprünglicher Text/Absatzstruktur identisch zu vorher | Grenzfall 3.9, erwartet **GRÜN** |
| L32 | Redo stellt die Liste wieder her | Direkt nach L31: `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) | Liste wieder vorhanden | Erwartet **GRÜN** |
| L33 | Gemischte Sequenz: Tippen → Liste an → Tippen → Liste aufheben → mehrfach Undo | Schritt für Schritt nachbauen, dann `ControlOrMeta+z` mehrfach | Jeder Undo-Schritt macht exakt eine Aktion rückgängig, in umgekehrter Reihenfolge | Erwartet **GRÜN** |
| L34 | **Selection-Sync-Regressionsmuster mit Listenbedienung als Auslöser** | `ControlOrMeta+a` (Alles auswählen) → Klick auf „Nummerierte Liste" → **danach** Klick zur Cursor-Neupositionierung **innerhalb** der neu entstandenen Liste → `End` → `Enter` → tippen | Beide (alle) ursprünglichen Absätze bleiben als eigene Listenpunkte erhalten, neuer Punkt korrekt angehängt — kein Text-/Strukturverlust durch den in `nummerierte-liste-req.md` 2.8 referenzierten Selection-Sync-Bug (`tests/e2e/selection-regression.spec.ts`-Muster, hier mit Listen-Toolbar-Klick statt Fett als auslösendem Schritt) | Zu verifizieren — konkreter Verdachtsfall laut Anforderung, bisher **kein** Test dafür vorhanden |
| L35 | Bestehender `selection-regression.spec.ts` bleibt unverändert Pflichtbestandteil | Kein neuer Test, nur Ausführungspflicht nach jeder `Toolbar.tsx`-Änderung (Listen-Fixes berühren dieselbe Datei) | Alle 3 bestehenden Tests weiterhin grün | Muss nach jeder Umsetzungsphase erneut laufen |

### 3.10 Zusammenspiel: Zeichenformatierung und Ausrichtung in Listenpunkten (Anforderung 2.8)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L36 | Fett/Kursiv innerhalb eines Listenpunkts | Listenpunkt-Text selektieren, „Fett" klicken | Text im `li` optisch fett, Nummerierung unbeeinflusst | Erwartet **GRÜN** |
| L37 | Individuelle Ausrichtung eines Listenpunkts übersteht Rundreise | Zweipunktige Liste, zweiten Punkt zentrieren (Ausrichtung-Button), exportieren, erneut hochladen | Zweiter Punkt bleibt zentriert, erster bleibt links, nach Re-Upload weiterhin so | Erwartet **GRÜN** (nutzt bereits abgesicherten Ausrichtungsmechanismus) |

### 3.11 Grenzfälle aus Anforderung Abschnitt 3 (vollständig, 1 pro Nummer)

| # | Grenzfall | Test | Status jetzt |
|---|---|---|---|
| L38 | 3.1 Leere Liste | Liste erzeugen (Cursor, kein Text), sofort „Liste aufheben" klicken, ohne je zu tippen | Kein Crash, kein Konsolenfehler, Editor zeigt leeren `p` | Erwartet **GRÜN** |
| L39 | 3.2 Einzelner Listenpunkt | Ein Absatz zur Liste machen, exportieren | Export enthält valide `ordered_list`/`<w:numId>`/`<text:list>` mit genau einem Punkt (DL7/OL entsprechend) | Erwartet **GRÜN** |
| L40 | 3.3 Liste am Dokumentanfang | Neues Dokument, ersten (einzigen) Absatz zur Liste machen, danach Cursor vor die Liste setzen und neuen Absatz einfügen (`Home`, dann Text + `Enter` davor simulieren bzw. `ArrowUp`-Pfad je nach Editor-Verhalten) | Neuer Absatz **vor** der Liste einfügbar, kein Crash | Zu verifizieren |
| L41 | 3.4 Liste am Dokumentende | Letzten Absatz zur Liste machen, Cursor ans Ende, `Enter` | Neuer, nicht-leerer Listenpunkt entsteht (kein impliziter Dokumentabschluss) | Erwartet **GRÜN** |
| L42 | 3.5 Zwei getrennte Listen ohne trennenden Absatz | Zwei Listen mit je 2 Punkten direkt hintereinander erzeugen (zweite Liste durch erneuten Klick auf „Nummerierte Liste" **nach** Verlassen und Wiederbetreten der Cursor-Position ohne Zwischenabsatz — konkreten UI-Weg beim Schreiben festlegen), exportieren, erneut hochladen | Nach Reimport weiterhin zwei separate Listen, je „1., 2." (nicht „1.–4.") | **ROT** (DL4) |
| L43 | 3.6 Sehr tiefe Verschachtelung (>4 Ebenen) | Über Tab wiederholt einrücken (setzt 3.4 voraus) bis mind. 6 Ebenen erreicht | Kein Absturz, keine Endlosschleife, sichtbare Formatwiederholung ab dokumentierter Tiefe | **ROT** (setzt Tab-Implementierung voraus) |
| L44 | 3.7 Copy-Paste eines Punkts aus Bullet- in Ordered-Liste | Bullet-Listenpunkt kopieren (`ControlOrMeta+c`), Cursor in Ordered-Liste setzen, einfügen (`ControlOrMeta+v`) | Eingefügter Punkt erscheint nummeriert (Zielformat setzt sich durch), Zielliste bleibt **eine** zusammenhängende Liste | Zu verifizieren |
| L45 | 3.8 Copy-Paste von Listentext aus externer Quelle | `page.evaluate` + simuliertes `ClipboardEvent`/`paste` mit HTML-Payload einer nummerierten Liste (`<ol><li>A</li><li>B</li></ol>`) | Text wird sinnvoll als Liste erkannt **oder** zumindest ohne Verlust als Klartext übernommen — Ergebnis konkret festhalten | Zu verifizieren |
| L46 | 3.9 Undo unmittelbar nach Listenerstellung | = L31 | Verweis auf L31 | Erwartet **GRÜN** |
| L47 | 3.10 Startwert ≠ 1 bleibt bei Anzeige **und** Rundreise erhalten | = L23/L24 | Verweis auf L23/L24 | **ROT** |
| L48 | 3.11 Sonderzeichen/Umlaute im Listentext | Listenpunkt mit Text „Prüfung äöü ß %" tippen | Text zeichengetreu im DOM, Nummerierung unbeeinflusst | Erwartet **GRÜN** |
| L49 | 3.12 Sehr lange Liste (>50 Punkte), Tippen in Punkt 50 bleibt performant | 55 Punkte per Skript erzeugen (`page.keyboard.type` in Schleife oder schnelleres Setzen über mehrfaches `Enter`+Text), danach in Punkt 50 zusätzlichen Text tippen und Zeit messen | Kein spürbares Einfrieren (`elapsedMs` protokollieren, harter Realitäts-Deckel z. B. < 5000 ms für den einzelnen Tastenanschlag-Batch, keine harte Sub-100ms-Behauptung wegen CI-Varianz) | Zu verifizieren |
| L50 | 3.13 Liste über manuellen Seitenumbruch hinweg | Liste mit vielen Punkten über eine Seitengrenze hinweg erzeugen (abhängig von `seitenumbruch-req.md`-Funktion), letzten Punkt vor und ersten Punkt nach dem Umbruch prüfen | Nummerierung läuft über die Seitengrenze korrekt weiter (kein Neustart bei „1.") | Zu verifizieren, abhängig von Seitenumbruch-Feature |
| L51 | 3.14 Reale Fremddatei mit unordentlicher `numId`-Reihenfolge | Upload `NumberingWithOutOfOrderId.docx`/`NumberingWOverrides.docx` (siehe 3.12 unten für vollständige Fixture-Serie) | Import ohne Absturz, Text und Grundnummerierung sichtbar | Zu verifizieren |
| L52 | 3.15 Bekannt „kaputtes" Listen-Markup | Upload `brokenList.odt`/`ListOddity.odt` | Definierter Fallback (kein weißer Bildschirm, kein Datenverlust) | Zu verifizieren, **muss** grün sein (kein Crash ist Pflicht) |

### 3.12 Reale Fremddateien — echter Upload + echte Rundreise über Export/Re-Upload (Anforderung §4.2)

Jede Zeile: echter Datei-Upload über `input.setInputFiles(...)` (oder `filechooser`),
Sichtprüfung im `.ProseMirror`-Editor, danach echter Export (`waitForEvent('download')`)
und erneuter echter Re-Upload der heruntergeladenen Datei über denselben Weg.

| # | Fixture | Karte | Sichtprüfung nach Import | Rundreise-Prüfung |
|---|---|---|---|---|
| L53 | `tests/fixtures/external/docx/ComplexNumberedLists.docx` | DOCX | Editor zeigt mehrstufige Liste, mindestens ein Punkt optisch weiter eingerückt als ein anderer | Nach Export+Re-Upload: Einrückungsunterschied bleibt sichtbar |
| L54 | `tests/fixtures/external/docx/Numbering.docx` | DOCX | Editor zeigt nummerierte Liste(n) | Rundreise erhält Punktanzahl/Text |
| L55 | `tests/fixtures/external/docx/NumberingWithOutOfOrderId.docx` | DOCX | Kein Absturz, Text sichtbar | Rundreise ohne Textverlust |
| L56 | `tests/fixtures/external/docx/NumberingWOverrides.docx` | DOCX | Kein Absturz, Startwert-Override sichtbar (falls visuell erkennbar, sonst Exportprüfung wie L24) | Rundreise erhält Override-Wert |
| L57 | `tests/fixtures/external/odt/ContinueListTest.odt` | ODT | Editor zeigt Liste(n), Fortsetzungsverhalten optisch (Startzahl der zweiten Liste) dokumentieren | Rundreise erhält Fortsetzungsverhalten |
| L58 | `tests/fixtures/external/odt/listLevel10.odt` | ODT | Kein Absturz, tief verschachtelte Liste sichtbar | Rundreise ohne Absturz |
| L59 | `tests/fixtures/external/odt/listsInTable.odt` | ODT | Liste innerhalb einer Tabellenzelle sichtbar | Rundreise erhält Liste in Zelle |
| L60 | `tests/fixtures/external/odt/simple-table-with-lists.odt` | ODT | Analog L59 | Analog |
| L61 | `tests/fixtures/external/odt/ListRoundtrip.odt` | ODT | Liste sichtbar | Rundreise identisch zum ersten Import |
| L62 | `tests/fixtures/external/odt/brokenList.odt` | ODT | Kein Absturz (Pflicht), definiertes Fallback-Ergebnis dokumentieren | Rundreise löst keinen Absturz aus |
| L63 | `tests/fixtures/external/odt/ListOddity.odt` | ODT | Analog L62 | Analog |
| L64 | `tests/fixtures/external/odt/listStyleId.odt` | ODT | Liste als nummeriert/Aufzählung **korrekt erkannt** (nicht fälschlich Bullet-Fallback) | Rundreise erhält Erkennung |
| L65 | `tests/fixtures/external/odt/ListStyleResolution.odt` | ODT | Analog L64 | Analog |
| L66 | `tests/fixtures/external/odt/ListHeading.odt` | ODT | Kopfzeilentext der Liste sichtbar im Editor (nicht verschwunden) | Rundreise erhält Kopfzeilentext |
| L67 | `tests/fixtures/external/odt/ListHeading2.odt` | ODT | Analog L66 | Analog |
| L68 | Restliche Listen-Fixtures (`EasyList*.odt`, `simpleList*.odt`, `simple_bullet_list*.odt`, `preparedList.odt`, `liste2.odt`, `list.odt`, `bulletListTest.odt`, `bullet_list.odt`, `imageWithinList.odt`) | ODT | Je Datei: kein Absturz, Text sichtbar (per `test.each` über die Dateiliste, analog zum Unit-Pendant FO12) | Rundreise: Textinhalt jedes Listenpunkts identisch zum ersten Import |

### 3.13 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

Analog `fett-qa.md` Abschnitt 3.4/„Befund": mindestens **ein** Testfall aus 3.12
(empfohlen L53 und L57 als je ein Vertreter pro Format) zusätzlich über den
tatsächlichen sichtbaren „Datei hochladen"-Button statt direkt auf den versteckten
`<input>`:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'ComplexNumberedLists.docx', mimeType: '...', buffer })
```

### 3.14 Cross-Format-Rundreise über echten Upload/Download (Anforderung 4.1.8)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L69 | Im Editor erzeugte mehrstufige nummerierte Liste: als ODT exportieren → reimportieren → als DOCX exportieren → reimportieren | Liste mit 3 Ebenen im Editor bauen (setzt Tab/Indent voraus), ODT-Export abfangen, heruntergeladene Datei über ODT-Karte hochladen, DOCX-Export abfangen, heruntergeladene Datei über DOCX-Karte hochladen | Nach beiden Konvertierungen: Verschachtelungsstruktur inhaltlich identisch (reine Optik darf sich ändern, Struktur nicht) | **ROT**, solange Mehrstufigkeit (3.4) und DOCX-Ebenen-Export/Import (2.5/2.6 Code-Doc) nicht umgesetzt sind |

### 3.15 Unabhängige Validierung des Exports (Anforderung §6 Testfall 11/12)

Nicht nur `.toContain(...)` auf rohem XML-Text, sondern strukturelle Prüfung über
einen vom projekteigenen Reader unabhängigen Parsing-Weg (`DOMParser`/`jsdom`, analog
`fett-qa.md` Abschnitt 3.6) — sowie, wo möglich, ergänzend ein vollständig externes
Werkzeug (siehe Hinweis unten).

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L70 | DOCX-Export einer komplexen, alle Fälle dieser Spezifikation vereinenden Testdatei gegen strukturellen `DOMParser` (statt eigenem Reader) | Im Editor: mehrstufige Liste (3 Ebenen), Startwert 5, zwei getrennte Listen ohne Trenner, Liste in Tabellenzelle — alles in einem Dokument, exportieren | `JSDOM`-`DOMParser` auf `word/document.xml` **und** `word/numbering.xml`: je Absatz korrektes `<w:ilvl>`/`<w:numId>`; `<w:startOverride>` für die Start-5-Liste; **zwei unterschiedliche** `numId`-Werte für die beiden getrennten Listen | **ROT** (Voraussetzung: alle referenzierten Fixes umgesetzt) |
| L71 | ODT-Export derselben komplexen Testdatei gegen strukturellen `DOMParser` | Analog L70, ODT-Karte | `content.xml`: verschachtelte `<text:list>` korrekt, `text:start-value="5"` gesetzt, zwei separate `<text:list>`-Bäume für die getrennten Listen | **ROT** |
| L72 | Ergänzende, vollständig externe Validierung (dokumentierter, von der Vitest-/Playwright-Suite getrennter Schritt) | Exportierte DOCX-Datei aus L70 zusätzlich mit `python-docx` (oder gleichwertigem, vom Projekt unabhängigem Tool) laden und Listenstruktur prüfen; exportierte ODT-Datei aus L71 gegen das ODF-Schema validieren (z. B. `odfvalidator`/gleichwertig) | Kein Schema-Verstoß, Listenstruktur von einem zweiten, unabhängigen Werkzeug bestätigt | Manueller/CI-separater Schritt, siehe `nummerierte-liste-code.md` §4 Punkt 5 — **kein** Blocker für die reguläre Testsuite, aber Pflichtbestandteil der finalen Abnahme laut Anforderung Testfall 11/12 |

---

## 4. Traceability-Matrix (`nummerierte-liste-req.md` §6 → Testfall)

| Anforderung §6, Testfall | Testfall(e) in diesem Plan |
|---|---|
| 1. Liste erstellen (Cursor/Selektion) | L1, L2 |
| 2. Enter-Verhalten (alle 4 Unterfälle) | L7, L8, L9, L10 |
| 3. Ein-/Ausrücken über ≥3 Ebenen inkl. Geschwister-Nummerierung | L11–L16, C7–C9 |
| 4. Fortsetzen/Neustart/beliebiger Startwert inkl. Rundreise | L23–L27, DL3, OL2, C12–C13 |
| 5. Liste aufheben (einstufig + mehrstufig) | L17–L19, C10–C11 |
| 6. Wechsel Bullet ↔ Ordered ohne Verschachtelung/Datenverlust | L3, L20–L22, C2–C4 |
| 7. Zusammenspiel (Format, Ausrichtung, Tabellenzelle, Undo/Redo, Selection-Sync) | L28–L37, DL5/OL5, L34/L35 |
| 8. Alle Grenzfälle 3.1–3.15 | L38–L52 |
| 9. Rundreise DOCX+ODT je Editor-Konfiguration (4.1.1–4.1.8) | DL1–DL12, OL1–OL6, L69 |
| 10. Import + Rundreise je reale Fixture (4.2) | FD1–FD5, FO1–FO12, RD1–RD5, RO1–RO5, L53–L68 |
| 11. Unabhängige DOCX-Validierung | L70, L72 |
| 12. Unabhängige ODT-Validierung | L71, L72 |

---

## 5. Erwarteter Ist-Status je Testgruppe (vor Umsetzung von `nummerierte-liste-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug/fehlende Funktion) | C2–C4, C7–C9, C12–C13, DL1–DL5, DL12, OL2, OL6, RD1–RD3, RD5, RO1–RO5, FD1, FD4, FD5(teilw.), FO8–FO11, L4–L6, L11–L27 (gesamte Gruppe 3.4/3.7), L29, L42, L43, L47, L69–L71 | Bestätigte Befunde aus Abschnitt 0/`nummerierte-liste-code.md` §1: kein Tab/Shift-Tab, kein `aria-pressed`, `toggleList` kein echtes Toggle, DOCX-Ebenen-Flatten Import+Export, feste `numId`, wirkungsloses `start`, keine Fortsetzen/Neustart-Funktion, Tabellenzellen-Listen-Komplettverlust bei DOCX-Import, ODT `styles.xml`/`list-header` |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | L1, L2, L7–L9, L17, L19, L28, L31–L33, L36–L41, L44–L46, L48, C1, C5(negativ als „existiert nicht" ROT, siehe oben), C10–C11, DL6(teilw.), DL7–DL11, OL1(teilw.) | Basiert auf unverändertem, bereits funktionierendem Grundverhalten (flache Liste erzeugen/aufheben, Enter-Grundfälle, Formatierung/Ausrichtung in Listenpunkten, Undo/Redo einfach) |
| **Zu verifizieren, kein sicherer Vorab-Befund** | OL3, OL5, FD2–FD3, FO1–FO7, FO12, L10, L45, L49–L52, L53–L68 (Basis-Sichtprüfung je Fixture) | Code-Doc äußert sich hierzu nicht abschließend bzw. Testausführung selbst ist die einzige Quelle — Ergebnis beim Ausführen eintragen, nicht annehmen |

Sobald `nummerierte-liste-code.md` Abschnitte 2–3 umgesetzt sind, müssen alle als
**ROT** geführten Testfälle einzeln auf **GRÜN** wechseln — das ist der konkrete,
maschinell prüfbare Nachweis, dass die jeweilige Umsetzungsphase (siehe
`nummerierte-liste-code.md` §5) tatsächlich wirkt, nicht nur Code-Review.

---

## 6. Ausführungsreihenfolge (Vorschlag, an `nummerierte-liste-code.md` §5 angelehnt)

1. **Vor jeder Umsetzung**: C2–C4, C7–C9, C12–C13, DL1–DL5, RD1–RD5, RO1–RO5,
   L4–L6, L11–L27 bewusst rot schreiben und laufen lassen — belegt, dass die in
   Abschnitt 0 bestätigten Befunde real und reproduzierbar sind, bevor irgendetwas
   gefixt wird.
2. Nach Schema-Erweiterung (`numberingMode`, CSS-Ebenenregeln): C12–C13
   (teilweise), Grundlage für alle weiteren Fortsetzen/Neustart-Tests.
3. Nach `toggleList`-Neuimplementierung + `isListActive`: C2–C6, L3–L6, L20–L22.
4. Nach Tab/Shift-Tab: C7–C9, L11–L16, L43.
5. Nach DOCX-Writer-Umbau (`NumberingRegistry`): DL2–DL4 (Schreibseite testbar,
   Leseseite noch nicht), L70, L72 (teilweise).
6. Nach DOCX-Reader-Umbau (`buildListTree`, Tabellenzellen-Fix): DL1, DL3–DL5, RD1–RD5,
   FD1, FD4, FD5, L18, L29, L53–L56.
7. DOCX-Rundreise-Tests (Abschnitt 2.2, 2.5) grün ziehen, inkl. realer Fixtures.
8. Nach ODT-Writer-/Reader-Umbau: OL2, OL6, RO1–RO5, FO8–FO11, L64–L67.
9. ODT-Rundreise-Tests grün ziehen, inkl. realer Fixtures (FO1–FO12, L57–L68).
10. Nach Fortsetzen/Neustart-UI (`ListNumberingMenu`, `listNumbering.ts`-Plugin):
    L23–L27, C12–C13 vollständig.
11. Gesamte E2E-Suite `tests/e2e/lists.spec.ts` durchgängig, inkl. L34/L35
    (Selection-Sync-Regressionstest) und `selection-regression.spec.ts` erneut.
12. L70–L72 (unabhängige Validierung) zuletzt, gegen die finale, alle Fälle
    vereinende Testdatei.
13. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 7 unten) final
    gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 7. Bekannte Automatisierungsgrenzen / offene Punkte für QA

1. **L42 (zwei getrennte Listen ohne Trenner) und L14 (Shift+Tab auf oberster
   Ebene)** hängen von einer noch zu treffenden UI-Konvention ab, *wie* man im
   Editor überhaupt zwei benachbarte, aber getrennt gemeinte Listen erzeugt bzw.
   wie Shift+Tab auf oberster Ebene reagieren soll — konkreter Bedienweg vor
   Testimplementierung mit dem Entwicklerplan (`nummerierte-liste-code.md` §6
   Punkt 3) abstimmen.
2. **L45 (Paste aus externer Quelle) und L49 (Performance bei langer Liste)**
   können je nach Playwright-/Browser-Version und CI-Sandbox-Einstellungen für
   Zwischenablage-Berechtigungen bzw. Timing instabil sein; Fallback auf
   `execCommand('insertHTML')` bzw. großzügige, protokollierende statt harte
   Zeitgrenzen vorsehen (analog `fett-qa.md` Abschnitt 8).
3. **L50 (Seitenumbruch)** ist von `seitenumbruch-req.md` abhängig — falls jenes
   Feature zum Zeitpunkt der Umsetzung dieses Plans noch nicht verifiziert ist,
   wird L50 vorerst als `test.skip(...)` mit Verweis auf den Backlog-Slug geführt,
   nicht stillschweigend weggelassen.
4. **L72 (externe Validierung mit `python-docx`/ODF-Validator)** erfordert eine
   Python-Toolchain bzw. ein separates ODF-Validierungswerkzeug außerhalb der
   Node/Vitest/Playwright-Umgebung dieses Projekts — bewusst als manueller/CI-separater
   Schritt geführt, kein Bestandteil von `npm test`/`npm run test:e2e`, aber
   Pflichtnachweis vor endgültiger Abnahme (Anforderung Testfall 11/12).
5. **FO1/FO3/FO4/OL3/OL5** (siehe Abschnitt 2.3/2.5) sind bewusst als „zu
   verifizieren" statt vorab als ROT/GRÜN eingestuft, weil `nummerierte-liste-code.md`
   sich zu diesen konkreten ODT-Fällen nicht abschließend äußert — Ergebnis ist
   beim ersten Testlauf zu ermitteln und anschließend in dieser Tabelle sowie in
   `nummerierte-liste-code.md` nachzutragen.
6. **Locators für die noch nicht existierende Fortsetzen/Neustart-UI (Abschnitt 3.7)**
   sind Platzhalter nach dem Entwurf in `nummerierte-liste-code.md` §2.4 — bei
   abweichender tatsächlicher Umsetzung (andere Textlabels/Rollen) sind L23–L27
   entsprechend anzupassen, ohne die geprüfte Verhaltenslogik selbst zu ändern.

---

## 8. Abgleich mit Definition of Done (`nummerierte-liste-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| Jeder Punkt aus Anforderung §2 über echte Bedienung im Browser nachgewiesen | Abschnitt 3 komplett (L1–L72), Traceability-Matrix Abschnitt 4 |
| Jeder Grenzfall aus §3 hat einen dauerhaften Testfall | Abschnitt 3.11 (L38–L52), einzeln nummeriert 3.1–3.15 |
| Rundreise-Anforderung §4 für beide Formate und alle Fixtures nachgewiesen | Abschnitt 2.2/2.3/2.5 (Unit) + Abschnitt 3.12/3.14 (E2E), Fixture-Inventar vollständig gegen §4.2 abgeglichen |
| Zu jedem Verdachtspunkt aus §5 (Anforderung) bzw. §1 (Code-Doc) ein eindeutiges Ergebnis | Abschnitt 0 (Gegenkontrolle) + Abschnitt 5 (Status je Testgruppe) — jeder Punkt trägt „bestätigt (ROT)"/„zu verifizieren"/„erwartet GRÜN", keiner bleibt unbenannt |
| Kein Punkt führt zu stillem Fehlschlag | C13, L25 (deaktivierte „fortsetzen"-Option mit Begründung statt stillem No-Op), L20 (echtes Toggle statt stillem No-Op) — explizit als Testfälle geführt, nicht nur als Nebenbemerkung |

Der Backlog-Status „nummerierte-liste" darf laut Anforderung §7 erst dann auf
„verifiziert" gesetzt werden, wenn jede Zeile in Abschnitt 5 dieses Plans von
**ROT/zu verifizieren** auf **GRÜN** gewechselt ist und dieser Wechsel durch einen
tatsächlichen, dokumentierten Testlauf (nicht durch Code-Review) belegt wurde.
