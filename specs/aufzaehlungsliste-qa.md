# QA-Testplan: Feature „Aufzählungsliste (Bullet)"

Rolle: QA-Antwort auf `specs/aufzaehlungsliste-req.md` (Anforderung) und
`specs/aufzaehlungsliste-code.md` (Entwicklerplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an — `aufzaehlungsliste-code.md` ist laut
eigenem Titel ein *Umsetzungsplan*, keine verifizierte Umsetzung; keiner der dort
beschriebenen Fixes (F1–F15) ist zum Zeitpunkt dieses Testplans nachweislich im
Code angekommen (siehe Abschnitt 0 — die Gegenkontrolle bestätigt den *Ist*-Stand
unverändert gegenüber der Analyse in `aufzaehlungsliste-code.md` Abschnitt 1).
Jede Behauptung aus beiden Dokumenten wird hier auf einen konkreten, ausführbaren
Testfall abgebildet. Ergebnis ist ein Testplan, kein Testbericht — die hier
aufgeführten Tests sind zum Zeitpunkt dieses Dokuments größtenteils **noch nicht
geschrieben** (siehe Abschnitt 6, Spalte „Erwarteter Status").

Stil/Gliederung orientiert an `fett-qa.md`/`aufzaehlungsliste-req.md`/
`aufzaehlungsliste-code.md`/`FEATURE-SPEC-DOCX-ODT.md`.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `aufzaehlungsliste-code.md`)

Bevor der Plan aufgestellt wird, wurden die zentralen Behauptungen aus
`aufzaehlungsliste-code.md` Abschnitt 1 direkt im aktuellen Code nachvollzogen
(nicht nur aus dem Dokument übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| `toggleList` ruft ausnahmslos `wrapInList` auf, kein echtes Toggle | `src/formats/shared/editor/commands.ts:57-60` gelesen | **Bestätigt, wortgleich.** `export function toggleList(ordered: boolean): Command { const listType = ...; return wrapInList(listType) }` — keine Prüfung, ob die Selektion bereits im Ziel-Listentyp steckt. `liftFromList` (Zeilen 62-64) ist ein reiner `liftListItem`-Wrapper. |
| Listen-Toolbar-Buttons ohne `aria-pressed`/`disabled`, nur `onMouseDown` | `Toolbar.tsx:192-224` gelesen | **Bestätigt.** Alle drei Buttons („Aufzählung" Z.192-202, „Nummerierte Liste" Z.203-213, „Liste aufheben" Z.214-224) haben ausschließlich `onMouseDown`, keinen `onClick`/`onKeyDown`, kein `aria-pressed`, kein `disabled`. |
| Keine Tab/Umschalt+Tab-Bindung, `sinkListItem` nirgends importiert | `WordEditor.tsx:71-80` gelesen; `grep -rn sinkListItem src` ausgeführt | **Bestätigt.** Keymap bindet nur `Mod-z`/`Mod-y`/`Mod-Shift-z`/`Enter: splitListItem(...)`/`Mod-b`/`Mod-i`/`Mod-u` (Zeile 75 exakt: `Enter: splitListItem(wordSchema.nodes.list_item)`). Grep liefert **keinen** Treffer für `sinkListItem` außerhalb `node_modules`. |
| DOCX-Reader liest nur `w:numId`, ignoriert `w:ilvl` | `src/formats/docx/reader.ts:196-201` gelesen | **Bestätigt.** `listMarkerFor` extrahiert ausschließlich `w:numId`, kein Zugriff auf `w:ilvl` im gesamten Reader. |
| DOCX-Writer schreibt `w:ilvl` immer fest `"0"`, `BULLET_NUM_ID=1` global für alle Bullet-Listen | `src/formats/docx/writer.ts:103,114` und `src/formats/docx/styleDefs.ts:34` gelesen | **Bestätigt.** `<w:numPr><w:ilvl w:val="0"/>...` hart codiert; `BULLET_NUM_ID`/`ORDERED_NUM_ID` sind Modul-Konstanten (1/2), keine Pro-Instanz-Zuteilung — jede Bullet-Liste im Dokument bekommt dieselbe `numId`. |
| ODT-Reader fällt bei unbekanntem Listenstil auf `'bullet'` zurück, `listKinds` aus `styles.xml` wird nicht mit `content.xml` zusammengeführt | `src/formats/odt/reader.ts:181` und `readOdt` (Zeilen 239-269) gelesen | **Bestätigt.** Zeile 181: `const kind = (styleName && styles.listKinds.get(styleName)) || 'bullet'`. `readOdt` liest `styles.xml` zwar ein (Zeile 252-256, `stylesForChrome`), verwendet dessen `listKinds` aber **ausschließlich** für Kopf-/Fußzeilen (Zeilen 261-267), **nicht** für den Dokumentkörper (`bodyBlocks`, Zeile 248, nutzt nur `contentStyles`). |
| Kein einziger E2E-Test mit Bezug zu Listen | `grep -rniE "list|bullet" tests/e2e/*.spec.ts` ausgeführt | **Bestätigt.** Null Treffer in `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts` (die einzigen vier vorhandenen E2E-Dateien). |
| Alle in Anforderung Abschnitt 4.2 genannten Fixture-Dateien existieren tatsächlich im Repository | `ls tests/fixtures/external/{odt,docx}` gegen die vollständige Liste aus `aufzaehlungsliste-req.md` Abschnitt 4.2 abgeglichen | **Bestätigt**, alle genannten Dateien vorhanden, u. a. `bulletListTest.odt`, `EasyList.odt`, `listLevel10.odt`, `imageWithinList.odt`, `listStyleId.odt`, `ListStyleResolution.odt`, `brokenList.odt`, `ListOddity.odt`, `ListRoundtrip.odt`, `indentTest.odt`, `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx`. |

### 0.1 Zusätzlicher, durch diese QA-Prüfung neu gefundener Befund (in keinem der beiden Vorgängerdokumente benannt)

**Der in Grenzfall 3.16 der Anforderung sowie in beiden `external-fixtures.test.ts`-
Dateien referenzierte Test `tests/e2e/large-document-import.spec.ts` existiert
nicht im Repository.** Verifiziert per `find . -iname "*large-document*"` (kein
Treffer) und per vollständigem Listing von `tests/e2e/` (enthält ausschließlich
`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`).
Sowohl `src/formats/docx/__tests__/external-fixtures.test.ts`
(`SKIP_SLOW_UNDER_JSDOM = new Set(['bug65649.docx'])`, Kommentar: „Covered instead
by tests/e2e/large-document-import.spec.ts") als auch
`src/formats/odt/__tests__/external-fixtures.test.ts`
(`SKIP_SLOW_UNDER_JSDOM = new Set(['brokenList.odt'])`, identischer Kommentar)
verweisen auf diese Datei als Ersatzabdeckung. **Konsequenz: `brokenList.odt` (ODT)
und `bug65649.docx` (DOCX) haben aktuell buchstäblich keine einzige automatisierte
Testabdeckung** — weder auf Unit- noch auf E2E-Ebene. Für `brokenList.odt` heißt
das konkret: Die in Grenzfall 3.16 der Anforderung gestellte Frage („prüft dieser
E2E-Test die Listenstruktur dieser Datei überhaupt inhaltlich oder nur ‚stürzt
nicht ab'?") ist müßig — der Test existiert schlicht nicht. Dieser Befund wird
unten als eigener Testfall geführt (L41) und muss **vor** Abnahme dieses Features
behoben werden (entweder durch einen echten `large-document-import.spec.ts` oder
durch Wiedereinbindung dieser beiden Dateien in die Unit-Suite, falls die
Performance-Sorge sich als überholt herausstellt).

Konsequenz für diesen Testplan: Alle Punkte aus der obigen Tabelle werden unten als
**aktuell rot erwartete** Testfälle geführt (Regressionstests, die den jeweiligen
Bug/die jeweilige Lücke dokumentieren, bis `aufzaehlungsliste-code.md` Abschnitt 4
umgesetzt ist), nicht als hypothetische Grenzfälle.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern er
    nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe 3.13).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in `tests/e2e/lists.spec.ts` beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`
    (Kartentitel: „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)").
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Listen-Buttons: `page.getByTitle('Aufzählung')`, `page.getByTitle('Nummerierte Liste')`,
    `page.getByTitle('Liste aufheben')` (Titel exakt verifiziert gegen `Toolbar.tsx:194,205,216`).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Upload (bisheriges Muster): `docxCard(page).locator('input[type="file"]').setInputFiles(...)`;
    für „echte Bedienung" zusätzlich `page.waitForEvent('filechooser')` +
    `docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click()` (siehe 3.12).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Listenstruktur
⇄ XML). Diese Ebene ist von den UI-Bugs (fehlendes Toggle, fehlender
`aria-pressed`-Zustand) weitgehend entkoppelt — ein rotes Toolbar-Verhalten darf
hier keine Unit-Tests rot färben und umgekehrt (Ausnahme: die Toggle-Logik selbst,
siehe 2.4, ist bewusst auch auf Command-Ebene testbar). Testet ausschließlich
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` sowie `toggleList`/`isListActive`
direkt, **keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:136` („preserves bullet lists with multiple items") | Grundfall einstufige Bullet-Liste | Anforderung 4.1.1 (Grundfall) |
| `src/formats/docx/__tests__/roundtrip.test.ts:153` („preserves ordered lists distinctly from bullet lists") | Bullet/Ordered-Unterscheidung | Anforderung 2.1 |
| `src/formats/docx/__tests__/roundtrip.test.ts:161` („keeps two separate lists distinct when a paragraph separates them") | Grenzfall 3.11 (DOCX-Seite) | Anforderung 4.1.5, Grenzfall 3.11 |
| `src/formats/odt/__tests__/roundtrip.test.ts:136,153` | Grundfall + Bullet/Ordered-Unterscheidung, **kein** ODT-Äquivalent zum DOCX-Trennungstest | Anforderung 4.1.1/2.1; Lücke bestätigt (siehe 2.3, O3) |
| `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` | Import von 50+ Fremddateien je Format, bislang nur „stürzt nicht ab", keine Listenstruktur-Assertion | Teilabdeckung Anforderung 4.2 (siehe 2.5 für gezielte Erweiterung) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt,
sondern ergänzt.

### 2.2 Neue/erweiterte Testfälle — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status jetzt |
|---|---|---|---|---|---|
| DL1 | Echtes Toggle: erneuter `toggleList(false)`-Aufruf auf bereits existierende Bullet-Liste am ersten Punkt | `bullet_list` mit einem `list_item` als Testdatum, `toggleList(false)` (nicht `wrapInList` direkt) auf den Cursor darin anwenden | Ergebnis ist ein normaler `paragraph`, kein verschachtelter `bullet_list`-Knoten | F1, Grenzfall 3.2 | **ROT** — `wrapRangeInList` liefert laut Bibliothekscode aktuell ein stilles No-Op (Struktur bleibt unverändert `bullet_list`), kein Absatz |
| DL2 | Echtes Toggle an einem **späteren** Punkt einer Liste mit ≥ 2 Punkten | `bullet_list` mit 2 `list_item`s, `toggleList(false)` auf den Cursor im zweiten Punkt | Zweiter Punkt wird zu normalem Absatz, **keine** Verschachtelung | F1, Grenzfall 3.3 | **ROT** — laut Bibliotheksanalyse (`wrapRangeInList`, `doJoin=true`-Pfad) potenziell verschachtelte Unterliste statt Absatz |
| DL3 | Typwechsel `ordered_list` → `bullet_list` ohne Verschachtelung | `ordered_list` mit 3 Punkten als Testdatum, `toggleList(false)` auf vollständig selektierte Liste | Ergebnis: `bullet_list` mit identischem Text/Reihenfolge, **kein** `list_item`, dessen Kind wiederum eine Liste ist | Anforderung 2.6 | **ROT** — aktuell `wrapInList` auf bereits-Listen-Inhalt, Verschachtelungsrisiko lt. Bibliothekscode |
| DL4 | **Regressionstest F7** — zwei unmittelbar aufeinanderfolgende Bullet-Listen ohne Trennabsatz | Zwei separate `bullet_list`-JSON-Knoten ohne dazwischenliegenden Absatz → `writeDocx` → `readDocx` erneut | Nach Reimport weiterhin **zwei** getrennte `bullet_list`-Knoten, nicht zu einer Liste verschmolzen | F7, Grenzfall 3.12 | **ROT** — beide Listen erhalten identische feste `BULLET_NUM_ID=1`, `groupLists` (`docx/reader.ts:258-283`) gruppiert ausschließlich über `numId`-Wechsel → Verschmelzung zu erwarten |
| DL5 | Nebeneffekt-Test nach F7-Fix: synthetisch verschachtelter `bullet_list`-Knoten (wie er per ODT-Import entstehen könnte) | `list_item`, dessen Content ein weiterer `bullet_list`-Knoten ist, als Testdatum → `writeDocx` → `readDocx` | Nach Fix F7: Ergebnis sind zwei **benachbarte, flache** `bullet_list`-Knoten (nicht eine verschmolzene Liste, aber auch nicht mehr hierarchisch) — muss **nach** Umsetzung von F7 neu geschrieben/geprüft werden | F7-Nebenwirkung (`aufzaehlungsliste-code.md` Abschnitt 4.6) | **Blockiert** bis F7 umgesetzt ist |
| DL6 | **Härtungstest F8** — `<w:lvl>`-Elemente in vertauschter Reihenfolge | Synthetisches `numbering.xml` per JSZip: `abstractNum` mit `w:ilvl="1"` **vor** `w:ilvl="0"` deklariert, beide mit unterschiedlichem `w:numFmt` | `parseNumberingXml` erkennt trotzdem korrekt anhand `w:ilvl="0"`, welches Format (bullet/ordered) für die Ebene 0 gilt, statt des dokumentenreihenfolge-ersten `<w:lvl>` | F8 | **ROT bis Fix**, aber mit dem in `aufzaehlungsliste-code.md` Neufund 1a.2 dokumentierten Vorbehalt: kein bekannter *aktiver* Bug an realen Fixtures, rein synthetisch nachzuweisen |
| DL7 | **Dokumentationstest F15** — `<w:p>` mit `w:numPr` und reiner Bild-Drawing-Run ohne Textlauf | Synthetisches DOCX (JSZip, wie `buildSampleDocx()` in `docx.spec.ts`) mit einem `<w:p>`, das `w:numPr` **und** nur eine Bild-`<w:drawing>`-Run ohne `<w:t>` enthält | `readDocx` wirft **nicht**; Bild erscheint als eigenständiger `image`-Block außerhalb der `bullet_list` (heutiges, bewusst dokumentiertes Verhalten aus `docx/reader.ts:319`) — Testkommentar hält das explizit als bekannte, nicht behobene Einschränkung fest | F15 | **GRÜN erwartet** (dokumentiert existierendes Verhalten, kein Fix vorgesehen) |
| DL8 | Grenzfall 3.8 / Anforderung 4.3: zwei unabhängige Bullet-Listen teilen sich `BULLET_NUM_ID`, das hat für Bullets **keine** sichtbaren Zahlenauswirkungen | Zwei Bullet-Listen mit Trennabsatz, unterschiedlicher Content → Rundreise → beide Listen bleiben mit **identischem** Bullet-Symbol „•" auf jedem Punkt (kein fälschlich fortlaufender Zählwert, da Bullets ohnehin keinen haben) | Bestätigt die in `aufzaehlungsliste-req.md` Abschnitt 4.3 geforderte tatsächliche (nicht nur argumentative) Bestätigung | Anforderung 4.3 | **GRÜN erwartet** (bereits durch bestehenden Test `roundtrip.test.ts:161` teilweise abgedeckt, hier nur um die Bullet-spezifische Symbol-Assertion ergänzt) |

### 2.3 Neue/erweiterte Testfälle — `src/formats/odt/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Erwarteter Status jetzt |
|---|---|---|---|---|---|
| OL1 | Echtes Toggle (analog DL1/DL2) | `toggleList(false)` erneut auf bestehende ODT-Bullet-Liste (Command-Ebene, formatunabhängig — siehe 2.4) → danach `writeOdt` | Ergebnis: normaler Absatz statt verschachtelter Liste | F1 | **ROT** |
| OL2 | Typwechsel `ordered_list` → `bullet_list` ohne Verschachtelung | analog DL3 | `bullet_list` mit identischem Text, keine Verschachtelung | Anforderung 2.6 | **ROT** |
| OL3 | **Neu, schließt die in `aufzaehlungsliste-code.md` Punkt 10 benannte Lücke:** zwei getrennte Bullet-Listen **mit** trennendem Absatz bleiben nach ODT-Rundreise getrennt | ODT-Äquivalent zum bestehenden DOCX-Test `roundtrip.test.ts:161` — existiert für ODT laut eigener Prüfung (Grep über `describe('ODT round trip: lists'` Zeilen 135-160) **nicht** | Zwei `bullet_list`-Knoten bleiben nach Export/Reimport getrennt | Grenzfall 3.11, Verdacht 10 | **Status unklar bis geschrieben** — vermutlich GRÜN (ODT `text:list` ist selbstabgrenzend, siehe `aufzaehlungsliste-code.md` 4.6), aber laut Anforderung 4.3 „muss durch tatsächlichen Test bestätigt werden, nicht nur angenommen" — **muss geschrieben und ausgeführt werden**, bevor „GRÜN" behauptet werden darf |
| OL4 | Zwei unmittelbar aufeinanderfolgende Listen **ohne** trennenden Absatz bleiben getrennt | Zwei `bullet_list`-Knoten ohne dazwischenliegenden Block → `writeOdt` → rohes `content.xml` parsen: zwei separate `<text:list>`-Elemente vorhanden → `readOdt` | Zwei getrennte `bullet_list`-JSON-Knoten nach Reimport (kein DOCX-Äquivalent zu F7 nötig, da `<text:list>` selbstabgrenzend) | Grenzfall 3.12, Anforderung 4.3 | Erwartet **GRÜN**, muss aber tatsächlich ausgeführt werden (nicht nur argumentiert) |
| OL5 | **Regressionstest F5** — `text:list-style` nur in `styles.xml`/`office:styles` definiert, referenzierte Liste ist tatsächlich **nummeriert** | Rohes ODT per JSZip: `content.xml` referenziert `text:list-style="Num"` in einem `<text:list>`, **kein** entsprechender Stil in `content.xml`s `office:automatic-styles`; `styles.xml` enthält `<office:styles><text:list-style style:name="Num"><text:list-level-style-number .../></text:list-style></office:styles>` | Erwartet: Liste wird als `ordered_list` importiert, **nicht** als `bullet_list`. **Erwarteter Status jetzt: ROT** (Bug bestätigt: Fallback `\|\| 'bullet'` greift immer, da `styles.xml`-`listKinds` nur für Kopf-/Fußzeilen verwendet werden) | F5, Grenzfall 3.13 | **ROT** |
| OL6 | **Regressionstest F6, Fall A** — `text:list-item` ohne führenden `text:p`, direkt mit verschachteltem `text:list` als einzigem Kind | Rohes ODT per JSZip mit genau diesem Muster (Grenzfall 3.7) | `readOdt` wirft **keine** Exception; resultierender `list_item.content` beginnt mit einem (leeren) `paragraph`-Knoten, gefolgt vom ursprünglichen verschachtelten Listen-Inhalt | F6, Grenzfall 3.7 | **ROT bis Fix** — aktuell würde `wordSchema.nodeFromJSON(...)` bei genau diesem Muster eine Schema-Validierungs-Exception werfen (`schema.ts:99`, `content: 'paragraph block*'`) |
| OL7 | **Regressionstest F6, Fall B** — `text:list-item`, dessen `text:p` nur einen `draw:frame` (Bild) ohne vorausgehenden Text enthält | Rohes ODT mit genau diesem Muster (Grenzfall 3.9), unabhängig, nicht identisch mit `imageWithinList.odt` (siehe 3.11 für die reale Fixture) | Kein Crash, Bild bleibt als Block im `list_item` erhalten, mit vorangestelltem leerem `paragraph` | F6, Grenzfall 3.9 | **ROT bis Fix** |
| OL8 | Liste innerhalb einer Tabellenzelle, Rundreise | `table`-Knoten mit einer Zelle, deren Content eine `bullet_list` ist → `writeOdt` → `readOdt` | Liste bleibt strukturell in der Zelle erhalten, Text/Reihenfolge identisch | Anforderung 2.7, 4.1.4 | Erwartet **GRÜN** (keine bekannte Lücke hierzu), muss aber ausgeführt werden |
| OL9 | Aufzählungsliste mit Fett/Kursiv/Farbe im Listentext | `list_item` mit Marks auf dem Textinhalt → Rundreise | Zeichenformatierung bleibt zusätzlich zur Listenstruktur erhalten | Anforderung 4.1.3 | Erwartet **GRÜN** |

### 2.4 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts` (isoliert, formatunabhängig)

Laut `aufzaehlungsliste-code.md` Abschnitt 8 („Phase A") ist die Toggle-Reparatur
(F1) unabhängig von DOCX/ODT testbar — direkt gegen `toggleList`/`isListActive`
und ein `EditorState`, ohne Reader/Writer. Das ist der **schnellste** Nachweis,
dass F1 tatsächlich behoben ist, bevor überhaupt Format-Rundreisen betrachtet
werden:

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| CL1 | `toggleList(false)` auf Cursor im **einzigen** Punkt einer Bullet-Liste | Liftet zu Absatz (kein No-Op) | **ROT** |
| CL2 | `toggleList(false)` auf Cursor in einem **späteren** Punkt einer Bullet-Liste mit ≥ 2 Punkten | Liftet nur diesen Punkt zu Absatz (kein Verschachteln) | **ROT** |
| CL3 | `toggleList(false)` auf vollständig selektierte `ordered_list` | Wird zu `bullet_list`, keine Verschachtelung | **ROT** |
| CL4 | `isListActive(state, false)` mit Cursor in Bullet-Liste | `true` | **ROT** (Funktion existiert noch nicht) |
| CL5 | `isListActive(state, false)` mit Cursor außerhalb jeder Liste | `false` | **ROT** (Funktion existiert noch nicht) |
| CL6 | Dry-Run: `toggleList(false)(state, undefined)` (kein `dispatch`) bei Selektion, die eine Überschrift einschließt | `false` (kein Wrap möglich) — Grundlage für `disabled` in der Toolbar (F2/F3) | **ROT** (aktuelle Implementierung liefert das Ergebnis von `wrapInList`s Dry-Run, das für gemischte Selektionen ggf. `false` liefert — muss nach Einführung des neuen `toggleList` erneut geprüft werden) |

### 2.5 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT), löst Verdacht 10/F9

Aktuell nur „importiert ohne Absturz" (siehe 0). Ergänzen um **strukturelle**
Prüfungen für die in `aufzaehlungsliste-req.md` Abschnitt 4.2 gelisteten Fixtures:
Anzahl gefundener `bullet_list`/`ordered_list`-Knoten (wo laut Fixture-Name/Inhalt
zu erwarten) sowie Gesamtzahl der `list_item`-Textinhalte bleibt bei
Export→Reimport identisch.

| Gruppe | Fixtures | Mindestprüfung |
|---|---|---|
| Einstufige Kernfälle | `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`, `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` | Import → mindestens ein `bullet_list`-Knoten mit ≥ 1 Punkt → unverändert exportieren → Reimport → Punktzahl/Text/Typ identisch |
| Verschachtelung | `EasyList.odt`, `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` | Import wirft nach Fix F6 nicht (Grenzfall 3.6/3.7); falls das `list-item`-ohne-Absatz-Muster nicht vorkommt, Test dokumentiert das Nichtvorkommen explizit statt es zu übergehen |
| Liste in Tabellenzelle | `listsInTable.odt`, `simple-table-with-lists.odt` | Liste bleibt nach Rundreise strukturell in der Zelle |
| Bild im Listenpunkt | `imageWithinList.odt` | Nach Fix F6 kein Crash, Bild bleibt als Block im `list_item` erhalten |
| Listenstil-Auflösung | `listStyleId.odt`, `ListStyleResolution.odt` | Nach Fix F5 korrekte Bullet/Ordered-Unterscheidung, nicht mehr pauschal „bullet" |
| Bekanntes „kaputtes" Markup | `brokenList.odt`, `ListOddity.odt` | Weiterhin definierter Fallback statt Crash — **aber:** `brokenList.odt` ist unter Vitest/jsdom aus Performancegründen ausgeschlossen (siehe 0.1) und **muss** stattdessen über einen tatsächlich existierenden E2E-Test abgedeckt werden (siehe L41) |
| Expliziter Rundreisetest | `ListRoundtrip.odt` | Vollständige Rundreiseprüfung |
| Restliche Basis-Fixtures | `list.odt`, `liste2.odt`, `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`, `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt` | Mindestens: Textinhalt jedes Listenpunkts bleibt bei Rundreise erhalten |
| DOCX Bullet-Ebenen | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` | Enthaltene Bullet-Formate (per `w:numFmt`-Auszählung vorab bestätigt, siehe `aufzaehlungsliste-code.md` Neufund 1a.3) bleiben nach Rundreise als `bullet_list` erkennbar |
| Ausdrücklich **nicht** in die Bullet-Suite | `ComplexNumberedLists.docx` | Enthält laut Neufund 1a.3 kein `bullet`-Format (`w:numFmt`-Auszählung: nur `decimal`/`lowerLetter`/`lowerRoman`) — gehört zu `nummerierte-liste-req.md`; hier nur als **Negativ-Test** führen: „enthält erwartungsgemäß keine Bullet-Liste", damit die Abgrenzung nicht stillschweigend verloren geht |

### 2.6 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 4.1.7 (Cross-Format), schneller als E2E, ergänzt —
ersetzt nicht — den Browser-Test in 3.10:

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| XL1 | DOCX → ODT → DOCX | `WordDocumentContent` mit Bullet-Liste (3 Punkte) → `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` → erneut `readDocx(writeDocx(...))` | Weiterhin 3 Punkte, `bullet_list`, Reihenfolge/Text identisch nach beiden Konvertierungen |
| XL2 | ODT → DOCX → ODT | Spiegelbildlich zu XL1 | s. o. |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wortgleich mit dem Auftrag zu diesem
Plan):** Kein Testfall in Teil B darf durch direkten Aufruf interner Funktionen
(`toggleList(...)`, `isListActive(...)`, `readDocx(...)` etc.) im Node-Kontext
ersetzt werden. Jeder Testfall muss über echte Nutzer:innen-Handlungen im Browser
laufen: `locator.click()`, `page.keyboard.press(...)`/`.type(...)`, echter
Datei-Upload (`filechooser`-Event oder `setInputFiles` auf das sichtbare
Formularelement), `page.waitForEvent('download')` + Auslesen und **strukturelles**
Parsen der heruntergeladenen Datei vom Dateisystem (nicht nur `toContain`-String-
Suche). Löst vollständig Verdacht 11 aus `aufzaehlungsliste-req.md` (aktuell **kein
einziger** Listen-E2E-Test vorhanden).

### 3.1 Neue Datei: `tests/e2e/lists.spec.ts`

Folgt den bestehenden Konventionen aus `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (`docxCard`/`odtCard`-Locator-Helfer lokal
dupliziert, siehe `aufzaehlungsliste-code.md` Abschnitt 5.3 für die — hier nicht
blockierende — Empfehlung, sie stattdessen zu extrahieren). Eine `describe`-
Gliederung je Themenblock unten, ein `test` je Zeile.

#### 3.2 Liste erstellen (Anforderung 2.1, Testfallgruppe 1)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L1 | Liste erstellen per Cursor ohne Selektion | Text tippen (ein Absatz), Cursor hineinsetzen (keine Selektion), `page.getByTitle('Aufzählung').click()` | `editor.locator('ul li')` enthält genau 1 `li` mit dem getippten Text; visuell ein Bullet-Symbol sichtbar (`getComputedStyle`/`::marker` oder `ul`-Element vorhanden) | §6.1, 2.1 |
| L2 | Liste erstellen per Selektion über mehrere Absätze | Drei Absätze tippen (`Enter` zwischen jedem), `ControlOrMeta+a`, „Aufzählung" klicken | `editor.locator('ul > li')` hat genau 3 Einträge, jeder mit dem jeweiligen Originaltext, **eine** gemeinsame `ul` (keine 3 separaten Listen) | §6.1, 2.1 |

#### 3.3 Enter-Verhalten (Anforderung 2.3, Testfallgruppe 2)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L3 | Enter am Ende eines nicht-leeren Punkts | Liste mit einem Punkt „Eins" erzeugen, Cursor ans Ende, `Enter`, „Zwei" tippen | 2 `li`-Elemente, Text „Eins"/„Zwei", beide Teil derselben `ul` | §6.2, 2.3 |
| L4 | Enter am Ende eines **leeren** Punkts beendet die Liste | Wie L3, aber im zweiten (leeren) Punkt sofort erneut `Enter` ohne Text zu tippen | Liste hat wieder nur 1 `li` („Eins"), danach folgt ein normaler `<p>` (kein zweites, leeres `li`) — erstmaliger echter Browser-Nachweis für `splitListItem`-Verhalten in dieser App | §6.2, 2.3 |
| L5 | Enter mittig im Text splittet ohne Textverlust | Punkt „Vorname Nachname" erzeugen, Cursor zwischen „Vorname " und „Nachname" setzen (`ArrowLeft` zählen oder `page.mouse` verwenden), `Enter` | 2 `li`, exakt „Vorname" und „Nachname", kein Zeichen verloren/dupliziert | §6.2, 2.3 |
| L6 | Umschalt+Enter erzeugt Zeilenumbruch, keinen neuen Punkt | Punkt „Zeile1" erzeugen, `Shift+Enter`, „Zeile2" tippen | Weiterhin genau 1 `li`, das intern einen `<br>` zwischen „Zeile1" und „Zeile2" enthält | §6.2, 2.3 |

#### 3.4 Erneuter Klick bei bereits aktiver Liste (Grenzfälle 3.2–3.4, F1)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| L7 | Erneuter Klick am **ersten** Punkt einer Liste | Liste mit 1 Punkt erzeugen, Cursor darin, „Aufzählung" erneut klicken | Punkt wird zu normalem Absatz (kein `<ul>` mehr im Editor) | Grenzfall 3.2, F1 | **ROT** — laut Bibliothekscode aktuell stiller No-Op (weiterhin `<ul>` sichtbar, keine Veränderung) |
| L8 | Erneuter Klick an einem **späteren** Punkt (Liste mit ≥ 2 Punkten) | Liste mit „Eins"/„Zwei" erzeugen, Cursor in „Zwei", „Aufzählung" erneut klicken | „Zwei" wird zu normalem Absatz, „Eins" bleibt Listenpunkt — **kein** verschachteltes `<ul><li><ul>` | Grenzfall 3.3, F1 | **ROT** — tatsächliches Ergebnis (Verschachtelung? No-Op?) muss dokumentiert werden, laut Codeanalyse potenziell verschachtelte Unterliste |
| L9 | Erneuter Klick bei Selektion der **gesamten** Liste (`Strg+A`) | Dokument besteht nur aus einer Bullet-Liste, `ControlOrMeta+a`, „Aufzählung" klicken | Definiertes Ergebnis (keine zusätzliche Verschachtelungsebene um die gesamte bisherige Liste) — tatsächliches Verhalten dokumentieren | Grenzfall 3.4, F1 | **ROT/dokumentationspflichtig** |

#### 3.5 Wechsel Aufzählung ↔ Nummerierung (Anforderung 2.6, Testfallgruppe 4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L10 | Nummerierte Liste → Aufzählung | Liste mit „1. Liste" erzeugen, Cursor hinein, „Aufzählung" klicken | `<ol>` wird zu `<ul>`, Text/Reihenfolge identisch, **keine** Verschachtelung | 2.6 |
| L11 | Aufzählung → Nummerierte Liste (Gegenrichtung, in Abstimmung mit `nummerierte-liste-req.md`) | Bullet-Liste erzeugen, „1. Liste" klicken | `<ul>` wird zu `<ol>`, Text/Reihenfolge identisch | 2.6 |

#### 3.6 Liste aufheben (Anforderung 2.5, Grenzfall 3.10)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L12 | Liste aufheben, Text bleibt erhalten | Liste mit 2 Punkten erzeugen, `ControlOrMeta+a`, „Liste aufheben" klicken | Kein `<ul>` mehr, beide Textinhalte als normale Absätze vorhanden | §6.5 |
| L13 | „Liste aufheben" ohne dass Cursor in einer Liste steht | Normalen Absatz (kein Listenkontext) fokussieren, „Liste aufheben" klicken | Nach Fix F3: Button ist `disabled` (kein Klickeffekt möglich); **vor** Fix: Klick tut sichtbar nichts, **kein** Fehler in der Konsole (`page.on('pageerror')` überwachen) | Grenzfall 3.10, F3 |

#### 3.7 Ein-/Ausrücken per Tab/Umschalt+Tab — Dokumentationstest (F12, bewusst kein Fix)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| L14 | `Tab` in einem Listenpunkt sinkt **nicht** ein | Liste mit 2 Punkten, Cursor am Anfang von Punkt 2, `page.keyboard.press('Tab')` | Dokumentstruktur unverändert (keine Verschachtelung entstanden); zusätzlich protokollieren, ob der Tastaturfokus den Editor verlässt (bekanntes, in `aufzaehlungsliste-code.md` Abschnitt 6 dokumentiertes Risiko, da `Tab` sonst zum nächsten fokussierbaren Element springt) | Anforderung §6.6, F12 | **GRÜN erwartet** als Nachweis des *aktuellen* (fehlenden) Verhaltens — dieser Test bleibt **absichtlich** dauerhaft in der Suite, bis `liste-einruecken-tab-code.md` umgesetzt ist; wird er eines Tages rot, ist das ein *positives* Signal (Funktion wurde nachgerüstet) und der Test muss dann aktualisiert, nicht „gefixt" werden |
| L15 | `Umschalt+Tab` analog | Wie L14 mit `Shift+Tab` | Keine Ebenenänderung | Anforderung §6.6, F12 | **GRÜN erwartet**, gleiche Einordnung wie L14 |

#### 3.8 Zusammenspiel mit anderen Features (Anforderung 2.7, Testfallgruppe 7)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L16 | Zeichenformatierung in einem Listenpunkt | Listenpunkt erzeugen, Wort darin selektieren, „Fett" klicken | Wort optisch/strukturell fett, Listenstruktur unverändert | 2.7 |
| L17 | Absatzausrichtung eines einzelnen Listenpunkts | Liste mit 2 Punkten, einen Punkt zentrieren (`AlignButton`) | Nur dieser Punkt zentriert, der andere bleibt links; bleibt nach Export/Reimport individuell (siehe L31) | 2.7 |
| L18 | Liste in einer Tabellenzelle | Tabelle einfügen, in eine Zelle klicken, „Aufzählung" klicken, Text tippen | `<ul>` erscheint **innerhalb** der Zelle, restliche Zellen unverändert | 2.7 |
| L19 | Undo/Redo über gemischte Sequenz inkl. Toolbar-Klick + Cursor-Neupositionierung | Text tippen → Liste erzeugen (Klick) → Cursor per Mausklick an andere Stelle im Dokument neu positionieren → weiterer Text → mehrfach `ControlOrMeta+z` | Jeder Undo-Schritt macht exakt einen Schritt rückgängig; insbesondere: Cursor-Neupositionierung nach Toolbar-Klick darf **nicht** zum bekannten Selection-Sync-Bug führen (Muster aus `selection-regression.spec.ts` mit Listen-Aktion statt Fett wiederholen) | 2.7, Hauptspezifikation Abschnitt 2 |

#### 3.9 Zustandsanzeige und Tastaturbedienbarkeit des Buttons (F2, F4, Grenzfall 3.5)

| # | Test | Schritte | Assertion | Bezug | Erwarteter Status |
|---|---|---|---|---|---|
| L20 | `aria-pressed` folgt der Cursor-Position | Cursor in eine Bullet-Liste bewegen, dann per Klick außerhalb wieder herausbewegen | `expect(page.getByTitle('Aufzählung')).toHaveAttribute('aria-pressed', 'true')` innerhalb, `'false'` außerhalb | F2, §1 Zeile 4 | **ROT** — Attribut existiert aktuell überhaupt nicht (`Toolbar.tsx:192-202` hat kein `aria-pressed`) |
| L21 | Tastatur-Fokus + `Enter` aktiviert den Button | Wiederholt `page.keyboard.press('Tab')` bis `page.getByTitle('Aufzählung')` fokussiert ist (`toBeFocused()`), dann `Enter` | Liste wird angewendet (identisch zu L1) | F4, §1 Zeile 8 | **ROT** — nur `onMouseDown` registriert, ein fokussierter `<button>` feuert bei `Enter` kein `mousedown` |
| L22 | Tastatur-Fokus + `Leertaste` aktiviert den Button | Wie L21, mit `page.keyboard.press(' ')` statt `Enter` | Liste wird angewendet | F4, §1 Zeile 8 | **ROT**, gleicher Grund wie L21 |
| L23 | Grenzfall 3.5: Selektion über eine Überschrift hinweg | Überschrift + Absatz, beide markieren, „Aufzählung" klicken | Nach Fix F2/F3: Button ist `disabled`, kein Klickeffekt. **Vor** Fix: zu dokumentieren, ob der Klick für den gesamten Bereich wirkungslos bleibt oder nur für die Überschrift — beides ist laut Anforderung ein Kandidat für stillen Fehlschlag und muss protokolliert werden | Grenzfall 3.5, F2/F3 | **Dokumentationspflichtig**, Ergebnis vorab unbekannt |

#### 3.10 Weitere Grenzfälle (Anforderung Abschnitt 3)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L24 | Grenzfall 3.1: leere Liste erstellen und sofort aufheben | Leeren Absatz fokussieren, „Aufzählung" klicken, sofort „Liste aufheben" klicken, ohne je Text einzugeben | Kein verwaistes `<ul>`/`<li>` im DOM, keine Konsolen-/Seitenfehler | Grenzfall 3.1 |
| L25 | Grenzfall 3.14: Undo direkt nach Listenerstellung | Absatz tippen, „Aufzählung" klicken, `ControlOrMeta+z` | Exakter Zustand vor der Umwandlung (normaler Absatz, keine Listenreste) | Grenzfall 3.14 |
| L26 | Grenzfall 3.15: sehr lange Liste (> 50 Punkte) bleibt bedienbar | Liste mit 60 Punkten per Skript (`page.keyboard.type` in Schleife oder `page.evaluate` zum schnellen Befüllen) erzeugen, in einem späten Punkt tippen | Kein spürbares Einfrieren (Tipp-Latenz messen: Zeit zwischen `type()`-Aufruf und sichtbarem Zeichen bleibt unter einer definierten Schwelle, z. B. < 500 ms je Zeichen), kein Timeout |

#### 3.11 Rundreise über echten Upload/Export für im Editor erzeugte Konfigurationen (Anforderung Abschnitt 4.1)

Jede Zeile: Datei/Zustand **A** im Editor erzeugen → **unverändert** exportieren
(`page.waitForEvent('download')`) → heruntergeladene Datei mit **unabhängigem**
Parser prüfen (direktes XML-Parsen von `word/document.xml`/`word/numbering.xml`
bzw. `content.xml` per `JSZip` + `DOMParser`, **nicht** dem eigenen Reader) → dieselbe
Datei erneut über die Karte hochladen → Inhalt entspricht **A**.

| # | Test | Prüfung nach Export (unabhängiger Parser) | Bezug |
|---|---|---|---|
| L27 | Einfache Bullet-Liste (3 Punkte), DOCX | Jeder Absatz trägt `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="…"/></w:numPr>`; `word/numbering.xml` enthält passenden `<w:abstractNum>` mit `<w:numFmt w:val="bullet"/>` und `<w:lvlText w:val="•"/>` | 4.1.1 |
| L28 | Dasselbe, ODT | `content.xml` enthält `<text:list text:style-name="…">` mit 3 `<text:list-item>`; `office:automatic-styles` enthält `<text:list-style>` mit `<text:list-level-style-bullet text:bullet-char="•">` | 4.1.2 |
| L29 | Bullet-Liste mit Fett/Kursiv/Farbe im Text | Zeichenformatierung im Export nachweisbar zusätzlich zur Listenstruktur, DOCX **und** ODT | 4.1.3 |
| L30 | Bullet-Liste in Tabellenzelle | Export enthält Tabellenstruktur **und** Listenstruktur verschachtelt in der Zelle, DOCX **und** ODT | 4.1.4 |
| L31 | Zwei getrennte Listen **mit** Trennabsatz | Nach Reimport zwei getrennte `bullet_list`, DOCX **und** ODT | 4.1.5, Grenzfall 3.11 |
| L32 | Zwei getrennte Listen **ohne** Trennabsatz | Nach Reimport weiterhin zwei getrennte Listen, DOCX **und** ODT | 4.1.5, Grenzfall 3.12 — **erwartet ROT für DOCX** (F7 nicht behoben), Status ODT siehe OL4 |
| L33 | Wechsel Aufzählung ↔ Nummerierung, dann Export | Exportierter Zustand entspricht dem zuletzt gewählten Typ, keine Reste des anderen Typs, keine Verschachtelung | 4.1.6 |
| L34 | Cross-Format-Doppel-Rundreise | Im Editor erzeugte Bullet-Liste → als ODT exportieren → Download erneut über ODT-Karte hochladen → als DOCX exportieren → Download erneut über DOCX-Karte hochladen | Struktur (Punktzahl, Text, Typ) bleibt über beide Konvertierungen identisch | 4.1.7 |
| L35 | Liste direkt am Dokumentanfang/-ende | Nach Export/Reimport: Cursor lässt sich davor/danach positionieren, neuer Absatz einfügbar | 4.1.8 |

#### 3.12 Import + Rundreise realer Fixture-Dateien (Anforderung Abschnitt 4.2, Vorgabe „mindestens ein automatisierter Test pro Datei")

Datei-Upload über den **echten** Klickpfad (`filechooser`-Event statt `setInputFiles`
auf den versteckten Input, siehe `aufzaehlungsliste-code.md`/`fett-qa.md` Abschnitt
3.4-Muster):

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  odtCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bulletListTest.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
```

| # | Test | Fixtures | Prüfung |
|---|---|---|---|
| L36 | Einstufige Kernfixtures, je Datei ein Testfall | `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`, `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` | Import → `<ul>` mit ≥ 1 `<li>` sichtbar → unverändert exportieren → Reimport (erneuter Upload des Downloads) → Punktzahl/Text/Typ identisch zum ersten Import |
| L37 | Verschachtelungs-Fixtures | `EasyList.odt`, `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` | Import ohne Absturz/weiße Seite (Konsolenfehler-Überwachung), Rundreise erhält Textinhalt jedes Punkts; tatsächliches Ergebnis bzgl. sichtbarer Verschachtelung dokumentieren (Grenzfall 3.6) |
| L38 | Liste in Tabellenzelle | `listsInTable.odt`, `simple-table-with-lists.odt` | Liste bleibt nach Rundreise sichtbar innerhalb der Tabellenzelle |
| L39 | Bild im Listenpunkt | `imageWithinList.odt` | Import ohne Absturz (nach Fix F6), Bild bleibt sichtbar im/beim Listenpunkt, Rundreise ohne Datenverlust |
| L40 | Listenstil-Auflösung | `listStyleId.odt`, `ListStyleResolution.odt` | Nach Fix F5: korrekte visuelle Unterscheidung Bullet („•") vs. Nummerierung (Ziffern) im Editor, **nicht** pauschal als Bullet dargestellt |
| L41 | **Bekanntes „kaputtes" Markup — schließt die in 0.1 gefundene Testlücke** | `brokenList.odt`, `ListOddity.odt` | Import wirft keinen Fehler, definierter Fallback sichtbar (z. B. als normaler Text oder als Bullet-Liste, je nach tatsächlichem Ergebnis — dokumentieren, welcher Fall eintritt); **für `brokenList.odt` ist dies der einzige tatsächlich existierende automatisierte Test überhaupt** (siehe 0.1: der in den Unit-Test-Kommentaren referenzierte `large-document-import.spec.ts` existiert nicht) — dieser Test muss explizit die **Listenstruktur** prüfen (Anzahl erkennbarer Listenpunkte o. ä.), nicht nur „stürzt nicht ab", um die in Grenzfall 3.16 gestellte Frage tatsächlich zu beantworten |
| L42 | Expliziter Rundreisetest | `ListRoundtrip.odt` | Vollständige Rundreiseprüfung: Punktzahl/Text/Typ vor und nach Export/Reimport identisch |
| L43 | Restliche Basis-Fixtures | `list.odt`, `liste2.odt`, `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`, `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt` | Import ohne Absturz/Textverlust, Rundreise erhält Textinhalt jedes Listenpunkts (kann als parametrisierte Schleife über die Dateiliste geschrieben werden, analog zu `external-fixtures.test.ts`, aber mit echtem Upload/Download statt direktem Reader-Aufruf) |
| L44 | DOCX Bullet-Ebenen in Nummerierungsdateien | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` | Enthaltene Bullet-Absätze bleiben nach echtem Upload → Export → Reimport als sichtbare `<ul>`-Listen erkennbar; `NumberingWithOutOfOrderId.docx` zusätzlich als konkreter Testfall für die `w:lvl`-Reihenfolge-Frage aus F8 |
| L45 | Negativ-Abgrenzung | `ComplexNumberedLists.docx` | Import zeigt **keine** Bullet-Liste (nur nummerierte Formate) — Test hält das bewusst fest, damit diese Datei nicht versehentlich in zukünftige Bullet-Assertions hineingezogen wird |

### 3.13 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

Wie in `fett-qa.md` Abschnitt 3.4 festgestellt, umgehen die bestehenden
Upload-Tests (`docx.spec.ts`, `odt.spec.ts`) mit `input.setInputFiles(...)` direkt
auf dem versteckten `<input type="file">` den sichtbaren „Datei hochladen"-Button.
Für **alle** neuen Tests in 3.12 (L36–L45) sowie mindestens L34 gehört der
tatsächliche Klickpfad über `page.waitForEvent('filechooser')` +
`getByRole('button', { name: 'Datei hochladen' }).click()` zwingend dazu — das ist
Teil der Abgrenzung „echte Browser-Bedienung, keine internen Funktionsaufrufe"
aus dem Auftrag zu diesem Plan.

### 3.14 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Anforderung Abschnitt 6, Testfallgruppe 9, verlangt explizit einen „unabhängigen
Parser" statt reiner String-Suche. Für L27–L35 (Rundreise) wird empfohlen:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency, kein neues Package nötig
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const paragraphs = [...xmlDoc.getElementsByTagNameNS(W_NS, 'p')]
const withNumPr = paragraphs.filter((p) => p.getElementsByTagNameNS(W_NS, 'numPr').length > 0)
expect(withNumPr).toHaveLength(3)
const numId = withNumPr[0].getElementsByTagNameNS(W_NS, 'numId')[0]!.getAttributeNS(W_NS, 'val')
const abstractNum = [...xmlDoc.getElementsByTagNameNS(W_NS, 'abstractNum')].find(/* … referenziert von numId … */)
expect(abstractNum!.getElementsByTagNameNS(W_NS, 'numFmt')[0]!.getAttributeNS(W_NS, 'val')).toBe('bullet')
```

Dies stellt sicher, dass die Prüfung **strukturell** ist (richtiges Element mit
richtigem Attribut) statt nur „die Zeichenkette `bullet` kommt irgendwo in der
Datei vor" — relevant z. B. für L27 (genau 3 Absätze mit `numPr`, nicht mehr/weniger)
und für die Unterscheidung Bullet- vs. Ordered-Format in L44.

### 3.15 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle 3 Tests) — **Pflichtbestandteil**,
  bleibt bestehen. Nach jeder Änderung an `Toolbar.tsx` (F2/F3/F4-Fixes) erneut
  ausführen — Listenbedienung selbst ist laut Anforderung 2.7 ein Verdachtsfall
  für exakt dieses Regressionsmuster (Toolbar-Klick + Cursor-Neupositionierung),
  siehe L19.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen, decken
  andere Aspekte (Upload, Edit-nach-Upload) ab, die nicht rein listenbezogen sind.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Listen-Berührung erwartet,
  muss aber Teil der Dauer-Suite bleiben.

### 3.16 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (L1, L2, L7–L13, L16–L20, L23–L45) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-only-Tests (L14, L15, L21, L22, L25) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch-Geräte ohne Hardware-Tastatur — `page.keyboard.press` sendet CDP-Events unabhängig vom simulierten Gerät, reales Nutzer:innen-Verhalten auf Touch-Geräten ist aber gesondert zu dokumentieren, kein Testausschluss |
| Undo/Redo, Enter-Verhalten (L3–L6, L19) | Pflicht | Pflicht | Pflicht | Tastenkombinationen bleiben via `page.keyboard` unabhängig vom Projekt auslösbar |

---

## 4. Traceability-Matrix

### 4.1 Anforderung Abschnitt 6 (Pflicht-Testfälle 1–12) → Testfall(e) in diesem Plan

| §6, Testfall | Testfall(e) hier |
|---|---|
| 1 | L1, L2 |
| 2 | L3, L4, L5, L6 |
| 3 | L7, L8, L9 |
| 4 | L10, L11 |
| 5 | L12, L13 |
| 6 | L14, L15 |
| 7 | L16, L17, L18, L19 |
| 8 (Grenzfälle 1–16) | L7–L9, L13, L14–L15, L23–L26, L32, L36–L41 (siehe 4.2 für die vollständige 1:1-Zuordnung) |
| 9 (Rundreise 4.1) | L27–L35, DL1–DL8, OL1–OL9, XL1, XL2 |
| 10 (Fixture-Import 4.2) | L36–L45 |
| 11 (`aria-pressed`) | L20 |
| 12 (Tastaturbedienbarkeit ohne Maus) | L21, L22 |

### 4.2 Anforderung Abschnitt 3 (Grenzfälle 1–16) → Testfall(e)

| Grenzfall | Testfall(e) |
|---|---|
| 3.1 Leere Liste erstellen/aufheben | L24 |
| 3.2 Erneuter Klick, erster Punkt | L7, DL1, CL1 |
| 3.3 Erneuter Klick, späterer Punkt | L8, DL2, CL2 |
| 3.4 Erneuter Klick, gesamte Liste selektiert | L9 |
| 3.5 Selektion über Überschrift hinweg | L23 |
| 3.6 Reale ODT mit echter Verschachtelung (`listLevel10.odt`) | L37 |
| 3.7 `list-item` ohne führenden Absatz (Container-Unterliste) | OL6, L37 |
| 3.8 DOCX-Reimport mehrstufiger Liste (Ebenen ignoriert) | Dokumentiert als F11 (kein Fix, siehe 5) |
| 3.9 Bild/Tabelle als einziger Inhalt eines Listenpunkts | OL7, L39 |
| 3.10 „Liste aufheben" ohne Listenkontext | L13 |
| 3.11 Zwei getrennte Listen mit Trennabsatz | DL-Bestand (`roundtrip.test.ts:161`), OL3, L31 |
| 3.12 Zwei Listen ohne Trennabsatz (Verschmelzungsrisiko) | DL4, OL4, L32 |
| 3.13 ODT-Listenstil nur in `styles.xml` (Fehlklassifikation) | OL5, L40 |
| 3.14 Undo direkt nach Listenerstellung | L25 |
| 3.15 Sehr lange Liste (> 50 Punkte) | L26 |
| 3.16 Bekannt „kaputtes" Listen-Markup | L41 (schließt zusätzlich die in 0.1 gefundene Lücke) |

### 4.3 Verdachtsmomente/Fixes (Abschnitt 5 der Anforderung, F1–F15 aus `aufzaehlungsliste-code.md`) → Testfall(e)

| # | Punkt | Testfall(e) |
|---|---|---|
| F1 | `toggleList` kein echtes Toggle | CL1–CL3, DL1–DL3, OL1–OL2, L7–L9 |
| F2 | Kein `aria-pressed` | L20 |
| F3 | Kein sichtbares Feedback bei No-Op | L13, L23 |
| F4 | Tastatur-Aktivierung (Enter/Leertaste) funktioniert nicht | L21, L22 |
| F5 | ODT-Fallback auf „bullet" bei Stil nur in `styles.xml` | OL5, L40 |
| F6 | `list_item` ohne führenden Absatz → möglicher Schema-Crash | OL6, OL7, L37, L39 |
| F7 | DOCX: zwei Bullet-Listen ohne Trennabsatz verschmelzen | DL4, DL5, L32 |
| F8 | DOCX: `w:lvl`-Auswahl nach Dokumentreihenfolge statt `ilvl="0"` | DL6, L44 |
| F9 | Fehlende Struktur-Tests für reale Fixtures | Abschnitt 2.5, L36–L45 |
| F10 | Keine Listen-E2E-Tests | Gesamter Abschnitt 3 |
| F11 | DOCX-Export flacht Verschachtelung ab (dokumentiert, kein Fix hier) | L37 (Ergebnis dokumentieren), Übergabe an `liste-einruecken-tab` |
| F12 | Kein Tab/Umschalt+Tab (dokumentiert, kein Fix hier) | L14, L15 |
| F13 | Kein eigenes Bullet-Zeichen (dokumentiert, kein Fix) | Kein Testfall nötig — als bewusste Einschränkung im Backlog zu vermerken |
| F14 | Keine Input-Rules (dokumentiert, kein Fix) | Kein Testfall nötig |
| F15 | DOCX: Bild-einziger Listenpunkt „verlässt" die Liste (dokumentiert) | DL7 |

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `aufzaehlungsliste-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug/bestätigte Lücke) | CL1–CL3 (CL4/CL5 rot, da Funktionen fehlen), DL1–DL4, DL6, OL1–OL2, OL5–OL7, L7–L9, L20–L22, L32 (DOCX-Seite) | F1, F2, F4, F5, F6, F7, F8 — siehe Abschnitt 0 |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | L1–L6, L10–L12, L16–L19, L24–L31, L33–L35, L38, L42–L43, L45, DL7, DL8, OL8, OL9, XL1, XL2 | Basiert auf unverändertem, bereits funktionierendem Grundverhalten (Liste erstellen, Enter-Verhalten, einfache Rundreise, Liste in Tabellenzelle, Zeichenformatierung) |
| **Dokumentationspflichtig, Ausgang offen** | L23, L37, L39–L41, OL3, OL4, DL5 | Tatsächliches Verhalten muss durch Ausführung ermittelt und im Ergebnis festgehalten werden, bevor „grün"/„rot" behauptet werden kann (Selektion über Überschrift; Verschachtelungsverhalten; Fallback-Verhalten bei kaputtem Markup; F7-Nebeneffekt) |
| **Absichtlich dauerhaft GRÜN als Lückennachweis** | L14, L15 | Dokumentieren bewusst nicht gebautes Tab/Umschalt+Tab — wird dieser Test eines Tages rot, ist das ein *positives* Signal, siehe 3.7 |

Sobald `aufzaehlungsliste-code.md` Abschnitt 4 (Fixes F1–F9) umgesetzt ist, müssen
alle oben als „erwartet ROT" markierten Fälle auf GRÜN wechseln — das ist der
konkrete, maschinell prüfbare Nachweis, dass die Fixes wirken (nicht nur
Code-Review). F11–F14 bleiben **bewusst** dokumentiert-rot/nicht anwendbar, bis
die jeweils zuständigen Geschwister-Pläne (`liste-einruecken-tab-code.md`,
Backlog-Eintrag `eigene-aufzaehlungszeichen`) umgesetzt werden.

---

## 6. Abgleich mit der Definition of Done (`aufzaehlungsliste-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| Jeder Punkt aus Anforderung Abschnitt 2 über echte Bedienung im Browser nachgewiesen | Abschnitt 3.2–3.10 (L1–L26) |
| Jeder Grenzfall aus Abschnitt 3 hat einen dauerhaft verbleibenden Test | Traceability-Matrix 4.2 |
| Rundreise-Anforderung aus Abschnitt 4 für beide Formate und alle gelisteten Fixtures nachgewiesen | Abschnitt 2.2–2.6 (Unit), 3.11–3.12 (E2E, L27–L45) |
| Zu jedem Verdachtspunkt aus Abschnitt 5 ein eindeutiges Ergebnis (insbesondere F1/„echtes Toggle" und F5/„ODT-Fallback") | Traceability-Matrix 4.3, Abschnitt 5 (Statustabelle) |
| Vollständige Abwesenheit von Listen-E2E-Tests (Verdacht 11) behoben | Abschnitt 3 (gesamt, `tests/e2e/lists.spec.ts`) |
| Kein Punkt führt zu stillem Fehlschlag (insbesondere Grenzfälle 3.2, 3.5, 3.10) | L7, L13, L23 — jeweils mit expliziter Assertion auf sichtbares Feedback (`disabled`/`aria-pressed`) statt bloßer Wirkungslosigkeit |

**Zusätzlicher, in `aufzaehlungsliste-req.md` nicht enthaltener DoD-Ergänzungspunkt
aus dieser QA-Prüfung:** Der in 0.1 gefundene Verweis auf einen nicht
existierenden Test (`tests/e2e/large-document-import.spec.ts`) muss vor Abnahme
aufgelöst werden — entweder durch Erstellung dieser Datei (mit echter
Listenstruktur-Prüfung für `brokenList.odt`/`bug65649.docx`, nicht nur „stürzt
nicht ab") oder durch Anpassung der irreführenden Kommentare in beiden
`external-fixtures.test.ts`-Dateien, falls die Datei bewusst nie geschrieben
werden soll. Ohne Auflösung bleibt `brokenList.odt` — eine von der Anforderung
explizit als Kernfixture für Grenzfall 3.16 benannte Datei — vollständig
ungetestet.

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Gegenkontrolle (Abschnitt 0) reproduzieren** — vor jeder weiteren Arbeit
   sicherstellen, dass die hier dokumentierten Befunde (insbesondere 0.1, der
   fehlende `large-document-import.spec.ts`) beim aktuellen Code-Stand weiterhin
   zutreffen.
2. **CL1–CL6** (`commands.test.ts`) zuerst schreiben und bewusst rot laufen
   lassen — schnellster, formatunabhängiger Nachweis von F1/F2.
3. **DL1–DL8, OL1–OL9, XL1–XL2** (Abschnitt 2) — Reader/Writer-Rundreise-Ebene,
   inkl. bewusst rot laufender Regressionstests für F5–F8.
4. **Erweiterung `external-fixtures.test.ts`** (Abschnitt 2.5) für alle in
   Anforderung 4.2 gelisteten Fixtures.
5. **`tests/e2e/lists.spec.ts` Abschnitt 3.2–3.10** (L1–L26) — Grundbedienung,
   Toggle-Grenzfälle, Zustandsanzeige, Tastaturbedienbarkeit.
6. **`tests/e2e/lists.spec.ts` Abschnitt 3.11–3.12** (L27–L45) — Rundreise über
   echten Upload/Export, inkl. aller realen Fixture-Dateien.
7. Auflösung des in Abschnitt 0.1/6 benannten fehlenden
   `large-document-import.spec.ts` (oder Korrektur der darauf verweisenden
   Kommentare).
8. Nach Umsetzung von `aufzaehlungsliste-code.md` Abschnitt 4: alle als „ROT
   erwartet" markierten Fälle erneut ausführen, Statuswechsel auf GRÜN
   dokumentieren; `selection-regression.spec.ts` zusätzlich erneut laufen lassen
   (Abschnitt 3.15).
9. Traceability-Matrizen (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **Fehlender `tests/e2e/large-document-import.spec.ts`** (Abschnitt 0.1/6) muss
  vor Testimplementierung geklärt werden: Wird diese Datei nachträglich
  geschrieben (dann muss sie echte Listenstruktur-Assertions für `brokenList.odt`
  enthalten, nicht nur „stürzt nicht ab"), oder werden `brokenList.odt`/
  `bug65649.docx` stattdessen direkt in `lists.spec.ts` (L41) und eine
  allgemeine Performance-Suite aufgenommen? Diese Entscheidung betrifft auch
  Features außerhalb dieses Plans (jedes Feature, dessen Verifikation sich auf
  „siehe E2E-Großdatei-Test" beruft) und sollte zentral, nicht nur hier,
  vermerkt werden.
- **L8/L9/L23/L37** (Verschachtelungs-/No-Op-Verhalten) benötigen vor der
  endgültigen Testimplementierung eine kurze manuelle Sichtung im Browser, um
  festzustellen, welches der in der Anforderung als „potenziell" beschriebenen
  Ergebnisse tatsächlich eintritt — die Assertion kann erst nach dieser Sichtung
  präzise formuliert werden (aktuell nur als „dokumentieren" statt mit fixem
  erwarteten Wert geführt).
- **OL5/L40** (Grenzfall 3.13, ODT-Listenstil-Fehlklassifikation) profitiert von
  einer Vorab-Öffnung von `listStyleId.odt`/`ListStyleResolution.odt`, um zu
  bestätigen, ob eine der beiden Dateien bereits organisch den in F5 beschriebenen
  Fehlerfall (nummerierte Liste fälschlich als Bullet erkannt) enthält, oder ob
  dafür zusätzlich ein synthetisches Testdatum (OL5) nötig bleibt.
- **L26** (sehr lange Liste, Performance) benötigt eine projektweit konsistente
  Schwelle für „kein spürbares Einfrieren" — aktuell nur als Platzhalterwert
  (500 ms/Zeichen) vorgeschlagen; mit bestehenden Performance-Erwartungen anderer
  Feature-QA-Pläne (z. B. `datei-oeffnen-qa.md`) abgleichen, falls dort bereits
  ein Schwellenwert etabliert ist.
- **F13/F14** (eigenes Bullet-Zeichen, Input-Rules) bewusst ohne Testfall geführt
  — bei Freigabe dieses Plans bestätigen, dass „kein Test" hier tatsächlich der
  gewünschte QA-Umgang mit einer bewusst nicht gebauten Anforderung ist (analog
  zur Behandlung in `aufzaehlungsliste-code.md` Abschnitt 7), nicht eine
  versehentliche Lücke.
