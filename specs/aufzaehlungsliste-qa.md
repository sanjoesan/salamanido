# QA-Testplan: Feature „Aufzählungsliste (Bullet)"

Rolle: QA-Antwort auf `specs/aufzaehlungsliste-req.md` (Anforderung) und
`specs/aufzaehlungsliste-code.md` (Entwicklerplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an. `aufzaehlungsliste-code.md` ist laut
eigenem Titel ein *Umsetzungsplan*, keine verifizierte Umsetzung; die dort
beschriebenen Fixes (F1/F2/F3/F4/F5/F7/F8, T1–T4) sind zum Zeitpunkt dieses
Testplans **noch nicht** im Code angekommen (Beleg: Abschnitt 0). Ergebnis ist ein
**Testplan, kein Testbericht** — die hier aufgeführten Tests sind größtenteils noch
nicht geschrieben (siehe Spalte „Erwarteter Status" in Abschnitt 2/3 und Abschnitt 5).

> **Wichtiger Korrekturhinweis dieses QA-Dokuments.** Eine **frühere Fassung dieses
> QA-Plans** (Stand Jul 4) war gegen einen **veralteten Codestand** geschrieben und
> hat exakt die Aussagen als „im aktuellen Code bestätigt" markiert, die
> `aufzaehlungsliste-req.md` Abschnitt 5 und `aufzaehlungsliste-code.md` Abschnitt 0
> ausdrücklich als **überholt/falsch** kennzeichnen (u. a. „DOCX-Writer schreibt
> `w:ilvl` immer fest 0", „DOCX-Reader ignoriert `w:ilvl`", „`list_item` =
> `paragraph block*`", „kein einziger Listen-E2E-Test", „`large-document-import.spec.ts`
> existiert nicht"). Diese Fassung wurde **vollständig gegen den aktuellen Quellcode
> gegengeprüft** (Abschnitt 0) und die falschen Befunde samt der darauf aufgebauten
> Testfälle (F6-Schema-Crash, F11-Flachlegung, F15) sind **entfernt bzw. korrigiert**.

Stil/Gliederung orientiert an `fett-qa.md`/`aufzaehlungsliste-req.md`/
`aufzaehlungsliste-code.md`.

---

## 0. QA-Gegenkontrolle des Ist-Codes (direkt am aktuellen Quellstand verifiziert)

Alle folgenden Punkte wurden **im aktuellen Quellcode selbst** nachgelesen, nicht aus
einem der Vorgängerdokumente übernommen. Symbolnamen sind maßgeblich; Zeilennummern
sind „Stand dieser Sichtung".

### 0.1 Offene Lücken — bestätigt (diese Fixes sind NOCH NICHT im Code)

| Behauptung (`code.md`) | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| **F1** — `toggleList` ist kein echtes Toggle | `commands.ts:57-60`: `toggleList(ordered)` = `return wrapInList(listType)`, keine Prüfung auf bereits vorhandenen Listentyp; `liftFromList` (Z.62-64) = reiner `liftListItem(list_item)`-Wrapper | **Bestätigt offen.** |
| **F2** — keine `isListActive`-Hilfe / kein `aria-pressed` an Listen-Buttons | `commands.ts`: **keine** `isListActive`-Funktion vorhanden (nur `isAlignActive` Z.29-38, `isInTable` re-exportiert). `Toolbar.tsx`: „Aufzählung" (Z.243), „Nummerierte Liste" (Z.254), „Liste aufheben" (Z.265) haben **kein** `aria-pressed` — im Gegensatz zu `MarkButton` (Z.75), `AlignButton` (Z.97), Tabelle-Button (`aria-pressed={isInTable(view.state)}` Z.281) | **Bestätigt offen.** |
| **F3** — kein `disabled`/kein No-Op-Feedback an Listen-Buttons | `Toolbar.tsx` Z.243/254/265: **kein** `disabled`. Das Muster existiert im Haus (Ausschneiden-Button `disabled={!canCut(view.state)}` Z.147, Utility-Klassen Z.153) und ist wiederverwendbar | **Bestätigt offen.** |
| **F4** — Tastatur-Aktivierung fehlt (nur `onMouseDown`) | `Toolbar.tsx` Z.243/254/265: Handler ausschließlich `onMouseDown`, kein `onClick`/`onKeyDown`. Ein per Tab fokussierter `<button>` feuert bei Enter/Leertaste **kein** `mousedown` | **Bestätigt offen.** |
| **F5** — ODT-Listentyp fällt bei nur in `styles.xml` definiertem Stil auf `'bullet'` zurück | `odt/reader.ts`: `elementToBlocks` Fallback `const kind = (styleName && styles.listKinds.get(styleName)) \|\| 'bullet'` (Z.288). `readOdt` baut `contentStyles` nur aus `content.xml`/`office:automatic-styles` (Z.363-364), parst den Body nur damit (`bodyBlocks` Z.366). `styles.xml`-`stylesForChrome` (Z.374) wird **nur** für Kopf-/Fußzeilen genutzt (Z.380/384), **nie** in die Body-`listKinds` gemischt; `office:styles` wird gar nicht nach `text:list-style` durchsucht | **Bestätigt offen.** Eine nummerierte Liste kann fälschlich als Aufzählung ankommen (Grenzfall 3.13). |
| **F7** — zwei benachbarte Top-Level-Bullet-Listen **ohne** Trennabsatz verschmelzen beim DOCX-Reimport | `docx/styleDefs.ts`: `BULLET_NUM_ID = 1`/`ORDERED_NUM_ID = 2` sind **feste Modulkonstanten** (Z.34-35); `numberingXml()` (Z.64-71) schreibt genau **zwei** `<w:num>` (je Typ eine feste `numId`), nimmt **kein** Registry-Argument. `docx/writer.ts`: der Top-Level-Zweig vergibt fest `node.type === 'ordered_list' ? ORDERED_NUM_ID : BULLET_NUM_ID` (Z.136). `docx/reader.ts` `groupLists`: „gleiche `numId`, gleiches `ilvl` → nichts öffnen/schließen" (Z.419) → zwei benachbarte Top-Level-Bullet-Listen (beide `numId=1`, `ilvl=0`) werden zu **einer** Liste verschmolzen | **Bestätigt offen.** *Ursache ist die geteilte feste `numId`, NICHT — wie die alte QA-Fassung behauptete — ein hartcodiertes `ilvl=0`.* |
| **F8** — `parseNumberingXml` wählt das XML-erste `<w:lvl>` statt gezielt `ilvl=0` | `docx/reader.ts` `parseNumberingXml` (Z.78-98): nimmt das erste `<w:lvl>` unabhängig vom `w:ilvl`. Für eigene Exporte unschädlich (`bulletLevelsXml` emittiert `ilvl=0` zuerst), latent falsch für umsortierte Fremddateien | **Bestätigt offen (Soll/Härtung).** |
| **F12** — kein Tab/Umschalt+Tab, `sinkListItem` nirgends importiert | `WordEditor.tsx` Keymap (Z.77-100): nur `Mod-z`/`Mod-y`/`Mod-Shift-z`/`Enter: splitListItem(list_item)` (Z.88)/`Shift-Enter: insertHardBreak()` (Z.89)/`Mod-b/i/u`. Kein `Tab`/`Shift-Tab`. `grep -rn sinkListItem src` → **kein** Treffer außerhalb `node_modules` | **Bestätigt offen (Übergabe an `liste-einruecken-tab`).** |
| **T1** — kein Unit-Test für `toggleList`/`liftFromList` | `src/formats/shared/editor/__tests__/commands.test.ts` existiert, enthält aber **keinen** `toggleList`/`liftFromList`/`isListActive`-Testfall (grep leer) | **Bestätigt: Lücke.** |
| **T2** — ODT-Test „zwei getrennte Listen mit Trennabsatz" fehlt | `docx/__tests__/roundtrip.test.ts:167` „keeps two separate lists distinct when a paragraph separates them" existiert; das **ODT-Äquivalent fehlt** in `odt/__tests__/roundtrip.test.ts` (Block Z.143-... hat nur `bullet multi`, `ordered vs bullet`, `nested two levels`) | **Bestätigt: Lücke.** |
| **T3** — `external-fixtures.test.ts` prüft nur „stürzt nicht ab" | `docx`/`odt` `external-fixtures.test.ts` importiert die Korpus-Dateien, hat aber **keine** Struktur-Assertion (Anzahl `bullet_list`/Text-Erhalt) | **Bestätigt: Lücke.** |
| **T4** — kein **dediziertes** Bullet-Abnahme-E2E-Spec | Der Bullet-Button wird in `clipboard.spec.ts` (Z.182, 462), `clipboard-roundtrip.spec.ts` (Z.215; „Nummerierte Liste" Z.226), `cut.spec.ts` nur als **Setup** geklickt; `roundtrip-fidelity.spec.ts` deckt nur die **Verschachtelungs-Persistenz** ab. Ein Spec, das die **Bedien-Akzeptanzkriterien** (Erstellen/Toggle/aktiv/Tastatur) prüft, existiert nicht | **Bestätigt: Lücke.** |

### 0.2 Bereits implementiert / regressionsgeschützt — die alte QA-Fassung lag hier FALSCH

| Falscher Alt-Befund | Realität im aktuellen Code | Konsequenz für diesen Plan |
|---|---|---|
| „DOCX-Writer schreibt `w:ilvl` immer fest 0" | **Falsch.** `docx/writer.ts`: `interface ListContext { numId; level }` (Z.96-98), `MAX_LIST_ILVL = 8` (Z.103), `<w:numPr><w:ilvl w:val="${listContext.level}"/>…` mit **tatsächlicher** Tiefe (Z.115); verschachtelter Knoten erbt `numId`, `level+1` (Z.134-136) | Verschachtelung ist **Regressionsschutz**, nicht Bauauftrag. |
| „DOCX-Reader ignoriert `w:ilvl`" | **Falsch.** `docx/reader.ts` `listMarkerFor` liest `w:ilvl` (Z.298-301); `groupLists` rekonstruiert Verschachtelung aus der flachen `ilvl`-Sequenz über einen Frame-Stack (Z.379-432) | s. o. |
| „`numberingXml` definiert nur `ilvl=0`" | **Falsch.** `docx/styleDefs.ts`: `bulletLevelsXml()` erzeugt **9 Ebenen** (Z.50-53) mit zyklischen `BULLET_GLYPHS = ['•','◦','▪']` (Z.43); zwei `<w:abstractNum>` mit je 9 Ebenen (Z.68-69) | „◦" auf Ebene 1 ist Sollverhalten (req 4.1.3) und zu prüfen. |
| „`schema.ts` `list_item` = `paragraph block*` → Schema-Crash bei Punkt ohne führenden Absatz" | **Falsch.** `schema.ts:146-147`: `list_item.content = 'block+'`, **bewusst** so (Kommentar Z.139-145 nennt `listLevel10.odt`/`imageWithinList.odt` als Grund). Ein Punkt mit führendem verschachteltem `bullet_list` oder `image` ist gültig | **F6 ist ein Nicht-Bug.** Der Alt-Fix „leeren Absatz voranstellen" wäre schädlich (Rundreise-Bruch). Nur **Absicherungstest** (kein Crash, keine Leerabsatz-Injektion), siehe 2.3 OL5/OL6. |
| „Kein einziger Listen-E2E-Test" | **Falsch.** `tests/e2e/roundtrip-fidelity.spec.ts` prüft die zweistufige Verschachtelung per echtem Upload→Export→Reimport für **DOCX** (`li ul, li ol` = 1 vor Z.50 / nach Z.120) **und ODT** (Z.166/227) | „Verschachtelungs-Persistenz" ist bereits E2E-abgesichert und **muss grün bleiben**; die T4-Lücke betrifft nur die **Bedien**-Akzeptanz. |
| „`tests/e2e/large-document-import.spec.ts` existiert nicht" | **Falsch.** Die Datei **existiert** (`tests/e2e/large-document-import.spec.ts`), ebenso `large-document-export.spec.ts`, `roundtrip-fidelity.spec.ts`, `clipboard*.spec.ts`, `cut.spec.ts`, `complex-import-fidelity.spec.ts` u. a. — `tests/e2e/` enthält 18 Spec-Dateien, nicht 4 | Der in `external-fixtures.test.ts` genannte Ersatz-E2E für `brokenList.odt`/`bug65649.docx` **existiert**; ob er die **Listenstruktur** inhaltlich prüft, ist zu verifizieren (Grenzfall 3.16, siehe L41), aber die Behauptung „gar keine Abdeckung" ist falsch. |

**Konsequenz:** Nur die Punkte aus 0.1 werden unten als **erwartet ROT** geführt
(Regressionstests, die Bug/Lücke bis zur Umsetzung von `code.md` Abschnitt 4
dokumentieren). Die Punkte aus 0.2 werden als **erwartet GRÜN / Regressionswächter**
geführt und dürfen durch keinen Fix brechen.

---

## 1. Testumgebung

- **Unit-Tests:** `npm test` (Vitest, `jsdom`-Environment). Ordner:
  `src/formats/docx/__tests__/`, `src/formats/odt/__tests__/`,
  `src/formats/shared/editor/__tests__/`.
- **E2E-Tests:** `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`; `webServer` baut und startet
    `npm run build && npm run preview -- --port 4173` automatisch.
  - **Projekte (verifiziert in `playwright.config.ts`):** `Desktop Chrome`
    (mit `permissions: ['clipboard-read','clipboard-write']`), `Mobile` (Pixel 7,
    dieselben Permissions), `Tablet` (iPad Mini). Zusätzlich `Desktop Safari (Clipboard)`
    und `Desktop Firefox (Clipboard)` — laufen per `testMatch` **nur** für
    `clipboard*.spec.ts`; das neue `lists.spec.ts` läuft folglich auf Desktop Chrome,
    Mobile und Tablet.
- **Bestehende Konventionen** (aus `docx.spec.ts`/`odt.spec.ts`/`cut.spec.ts`/
  `selection-regression.spec.ts` übernommen, in `tests/e2e/lists.spec.ts` beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `await page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator lokal wie in `docx.spec.ts` (Z.59):
    `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '…' }) })`
    (Titel „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)").
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Listen-Buttons (Titel exakt gegen `Toolbar.tsx:243/254/265` verifiziert):
    `page.getByTitle('Aufzählung')`, `page.getByTitle('Nummerierte Liste')`,
    `page.getByTitle('Liste aufheben')`.
  - **Hilfssteuerelemente, die die Zusammenspiel-/Rundreise-Tests bedienen — Selektoren
    exakt am aktuellen `Toolbar.tsx` verifiziert, damit kein Testfall auf einen
    nicht existierenden Button zielt:**
    - Fett (L16/L29): `page.getByTitle('Fett')` (`Toolbar.tsx:184`, `MarkButton` setzt
      `aria-label={title}` Z.74, also alternativ `page.getByLabel('Fett')`).
    - Ausrichtung (L17/L29): `page.getByTitle('Ausrichtung: center')` bzw.
      `'Ausrichtung: left'`/`'right'`/`'justify'` (`Toolbar.tsx:96/234–237`,
      Titel = ``Ausrichtung: ${align}``).
    - Tabelle einfügen (L18/L30/OL8/L39): `page.getByTitle('Tabelle einfügen')`
      (`Toolbar.tsx:279`, `aria-label` Z.280 identisch).
    - **Überschrift (L23) ist KEIN Button, sondern das einzige `<select>` der Toolbar**
      (`Toolbar.tsx:165`, `aria-label="Absatzformat"` Z.166): Heading erzeugen mit
      `await page.getByLabel('Absatzformat').selectOption('1')` (Ebene 1),
      zurück zu Absatz mit `.selectOption('normal')`. Ein `getByTitle('Überschrift')`
      existiert **nicht** — L23 muss diesen Select-Weg nutzen, sonst schlägt der Test
      schon im Setup fehl.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
  - Download auslesen (Muster `docx.spec.ts:81-87`):
    ```ts
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)   // import JSZip from 'jszip'
    ```
  - Upload (Bestandsmuster): `docxCard(page).locator('input[type="file"]').setInputFiles(…)`;
    für „echte Bedienung" zusätzlich der Klickpfad über `page.waitForEvent('filechooser')`
    (siehe 3.13).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Listenstruktur ⇄
XML). Testet ausschließlich `writeDocx`/`readDocx`/`writeOdt`/`readOdt` sowie
`toggleList`/`liftFromList`/`isListActive` **direkt**, keine Playwright-Interaktion.

### 2.1 Bestand (bereits grün — als Regressionsschutz zu erhalten, NICHT neu bauen)

| Datei / Test | Deckt ab |
|---|---|
| `docx/__tests__/roundtrip.test.ts:142` „preserves bullet lists with multiple items" | req 4.1.1 (Grundfall) |
| `docx/__tests__/roundtrip.test.ts:159` „preserves ordered lists distinctly from bullet lists" | req 2.1 |
| `docx/__tests__/roundtrip.test.ts:167` „keeps two separate lists distinct when a paragraph separates them" | req 4.1.6, Grenzfall 3.11 (DOCX) |
| `docx/__tests__/roundtrip.test.ts:178` **„preserves a nested list two levels deep"** | req 4.1.3 / 2.4 — **Verschachtelungs-Persistenz (Regressionswächter)** |
| `odt/__tests__/roundtrip.test.ts:144/161/169` (Grundfall / Ordered-vs-Bullet / **nested two levels deep**) | req 4.1.1/2.1/2.4 — **ODT-Nesting grün**; **kein** ODT-„separate-lists"-Test (→ T2, siehe 2.3 OL3) |
| `docx/__tests__/external-validation.test.ts` (unabhängiger Parser, Bullet+Ordered) | req 4.1.1 / §6.10 (unabhängige Validierung) |
| `docx`/`odt` `external-fixtures.test.ts` | Import 50+ Fremddateien, bislang nur „kein Crash" → T3, siehe 2.5 |

Diese Tests bleiben unverändert; sie werden **ergänzt**, nicht ersetzt. **Nach jedem
Fix (insb. F7) ist `roundtrip.test.ts:178` und `odt` `:169` explizit als grün zu
bestätigen** (der F7-Fix darf ausschließlich den Top-Level-Zweig ändern).

### 2.2 Neu — `src/formats/shared/editor/__tests__/commands.test.ts` (T1, isoliert, formatunabhängig)

Schnellster Nachweis für F1/F2, ohne Reader/Writer. `code.md` Abschnitt 5.1/Phase A.

| # | Testfall | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|
| CL1 | `toggleList(false)` auf Cursor im **einzigen** Punkt einer `bullet_list` | Punkt wird zu `paragraph` (echtes Toggle-Off, kein No-Op, kein verschachtelter `bullet_list`) | F1, Grenzfall 3.2 | **ROT** — aktuell `wrapInList`, laut Bibliothek stiller No-Op |
| CL2 | `toggleList(false)` auf Cursor in einem **späteren** Punkt (Liste ≥ 2 Punkte) | Nur dieser Punkt wird `paragraph`, **keine** Verschachtelung | F1, Grenzfall 3.3 | **ROT** |
| CL3 | `toggleList(false)` auf vollständig selektierte `ordered_list` | `bullet_list` mit identischem Text/Reihenfolge; **kein** `list_item`, dessen Kind wieder eine Liste ist | req 2.6 | **ROT** |
| CL4 | `isListActive(state, false)` mit Cursor in `bullet_list` | `true` | F2 | **ROT** — Funktion existiert nicht |
| CL5 | `isListActive(state, false)` außerhalb jeder Liste | `false` | F2 | **ROT** — Funktion existiert nicht |
| CL6 | `liftFromList()` als **Dry-Run** (`(state, undefined)`) außerhalb jeder Liste | `false` (Grundlage für `disabled`, F3/Grenzfall 3.10) | F3, Grenzfall 3.10 | **GRÜN erwartet** — `liftListItem` liefert bereits `false`; Test dokumentiert die Grundlage für den späteren `disabled`-Zustand |
| CL7 | `toggleList(false)(state, undefined)` als Dry-Run bei Selektion, die eine Überschrift einschließt | Ergebnis dokumentieren (Basis für `disabled`, Grenzfall 3.5) — nach F1-Umbau erneut prüfen | F3, Grenzfall 3.5 | **Dokumentationspflichtig** |

### 2.3 Neu/erweitert — DOCX- und ODT-Rundreise (`roundtrip.test.ts`)

| # | Datei | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|---|
| DL1 | docx | **T-F7:** zwei aufeinanderfolgende Bullet-Listen **ohne** Trennabsatz | Zwei separate `bullet_list`-Knoten (kein Block dazwischen) → `writeDocx` → `readDocx` | Nach Reimport weiterhin **zwei** getrennte `bullet_list`-Knoten | F7, Grenzfall 3.12 | **ROT** — beide teilen `BULLET_NUM_ID=1`/`ilvl=0`; `groupLists` (`reader.ts:419`) verschmilzt sie |
| DL2 | docx | **Regressionswächter Verschachtelung** (Doppelprüfung) | `list_item` mit eingebettetem `bullet_list` (2 Ebenen) → `writeDocx` → `readDocx` | Innere Ebene bleibt im äußeren `list_item` eingebettet (`li > ul`), **nicht** flach; DOCX zusätzlich: Ebene 1 `<w:ilvl w:val="1"/>`, Glyph „◦" in `numbering.xml` | req 4.1.3, 0.2 | **GRÜN** — muss nach F7 grün **bleiben** |
| DL3 | docx | **T-F8:** `<w:lvl>` in vertauschter Reihenfolge | Synthetisches `numbering.xml` (JSZip): `abstractNum` mit `w:ilvl="1"` **vor** `w:ilvl="0"`, unterschiedliche `w:numFmt` | `parseNumberingXml` erkennt Bullet/Ordered anhand `ilvl=0`, nicht des XML-ersten `<w:lvl>` | F8 | **ROT bis Fix** (rein synthetisch; kein bekannter aktiver Bug an realen Fixtures) |
| DL4 | docx | Bullet-Symbol-Kontrast (req 4.3) | Zwei Bullet-Listen **mit** Trennabsatz → Rundreise | Beide bleiben getrennt (`roundtrip.test.ts:167` bereits grün), zusätzlich: jeder Punkt trägt Bullet-Zeichen „•", **kein** fälschlich fortlaufender Zählwert | req 4.3, Grenzfall 3.11 | **GRÜN erwartet** (ergänzt bestehenden Test um Symbol-Assertion) |
| OL1 | odt | Echtes Toggle-Off, formatunabhängig verankert | `toggleList(false)` erneut auf ODT-Bullet-Liste (Command-Ebene) → danach `writeOdt`/`readOdt` | Ergebnis: normaler Absatz statt verschachtelter Liste | F1 | **ROT** |
| OL2 | odt | Typwechsel `ordered_list` → `bullet_list` | analog CL3, mit ODT-Rundreise | `bullet_list`, identischer Text, keine Verschachtelung | req 2.6 | **ROT** |
| OL3 | odt | **T2:** zwei getrennte Bullet-Listen **mit** Trennabsatz | ODT-Äquivalent zu `docx/roundtrip.test.ts:167` (fehlt für ODT) → `writeOdt` → `readOdt` | Zwei `bullet_list`-Knoten bleiben getrennt | T2, Grenzfall 3.11, req §6/T2 | **GRÜN erwartet**, aber laut req 4.3 **durch tatsächlichen Test** zu belegen, nicht anzunehmen |
| OL4 | odt | Zwei benachbarte Bullet-Listen **ohne** Trennabsatz bleiben getrennt | Zwei `bullet_list`-Knoten ohne Block dazwischen → `writeOdt` → rohes `content.xml`: zwei separate `<text:list>` → `readOdt` | Zwei getrennte `bullet_list`-Knoten (kein DOCX-F7-Äquivalent, da `<text:list>` selbstabgrenzend, `writer.ts:99-109`) | Grenzfall 3.12, req 4.3 | **GRÜN erwartet**, muss ausgeführt werden |
| OL5 | odt | **T-F5:** `text:list-style` nur in `styles.xml`/`office:styles`, referenzierte Liste ist **nummeriert** | Rohes ODT (JSZip): `content.xml`-`<text:list text:style-name="Num">`, **kein** Stil in `content.xml`-`automatic-styles`; `styles.xml` enthält `<office:styles><text:list-style style:name="Num"><text:list-level-style-number …/></text:list-style></office:styles>` | Nach Fix: `ordered_list`, **nicht** `bullet_list` | F5, Grenzfall 3.13 | **ROT** — Fallback `\|\| 'bullet'` greift, `styles.xml`-`listKinds` nur für Kopf-/Fußzeile |
| OL6 | odt | **F6-Absicherung (kein Fix, kein Crash):** `text:list-item` ohne führenden `text:p`, nur mit verschachteltem `text:list` | Rohes ODT mit genau diesem Muster (Grenzfall 3.7) | `readOdt` wirft **nicht**; es wird **kein** Leerabsatz vorangestellt; der verschachtelte Listen-Inhalt bleibt erster Block (`block+` erlaubt das) | 0.2, Grenzfall 3.7 | **GRÜN erwartet** — `schema.ts:147` ist `block+`; **kein** Schema-Crash (alte QA-Erwartung „ROT" war falsch) |
| OL7 | odt | **F6-Absicherung, Bild-only:** `text:list-item`, dessen erster Block ein Bild (`draw:frame`) ohne führenden Text ist | Rohes ODT (Grenzfall 3.9), unabhängig von `imageWithinList.odt` | Kein Crash; Bild bleibt als Block im `list_item`, **kein** injizierter Leerabsatz | 0.2, Grenzfall 3.9 | **GRÜN erwartet** |
| OL8 | odt | Liste in Tabellenzelle, Rundreise | `table`-Knoten, Zelle enthält `bullet_list` → `writeOdt` → `readOdt` | Liste bleibt strukturell in der Zelle, Text/Reihenfolge identisch | req 2.7, 4.1.5 | **GRÜN erwartet**, ausführen |
| OL9 | odt | Bullet-Liste mit Fett/Kursiv/Farbe im Text | `list_item`-Text mit Marks → Rundreise | Zeichenformatierung bleibt zusätzlich zur Listenstruktur erhalten | req 4.1.4 | **GRÜN erwartet** |

### 2.4 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT), löst T3

Heute nur „importiert ohne Absturz". Ergänzen um **strukturelle** Prüfungen für die in
req 4.2 gelisteten Fixtures: Anzahl gefundener `bullet_list`/`ordered_list`-Knoten (wo
laut Name/Inhalt erwartet) sowie Summe der `list_item`-Textinhalte bleibt bei
Export→Reimport identisch.

| Gruppe | Fixtures | Mindestprüfung |
|---|---|---|
| Einstufige Kernfälle | `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`, `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` | ≥ 1 `bullet_list` mit ≥ 1 Punkt → unverändert exportieren → Reimport → Punktzahl/Text/Typ identisch |
| Verschachtelung | `EasyList.odt`, `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` | Import wirft **nicht** (bestätigt `block+`, Grenzfall 3.6/3.7), Ebenen bleiben erhalten (`li > ul`-Verschachtelung nachweisbar, begrenzt durch `MAX_NESTING_DEPTH=25`) |
| Liste in Tabellenzelle | `listsInTable.odt`, `simple-table-with-lists.odt` | Liste bleibt nach Rundreise strukturell in der Zelle |
| Bild im Listenpunkt | `imageWithinList.odt` | Kein Crash; Bild bleibt als Block im `list_item` (Grenzfall 3.9) |
| Listenstil-Auflösung | `listStyleId.odt`, `ListStyleResolution.odt` | Nach Fix F5 korrekte Bullet/Ordered-Unterscheidung statt pauschal „bullet" |
| Bekanntes „kaputtes" Markup | `brokenList.odt`, `ListOddity.odt` | Definierter Fallback statt Crash — **`brokenList.odt` bleibt unter Vitest/jsdom ausgeschlossen** (Performance, ~20k automatische Stile) und ist über E2E abzudecken (`large-document-import.spec.ts` **existiert**; ob er die Listenstruktur prüft, siehe L41) |
| Expliziter Rundreisetest | `ListRoundtrip.odt` | Vollständige Rundreiseprüfung |
| Kontrolle Bullet vs. Nummeriert | `ContinueListTest.odt` | Bullet-Teile kommen nicht fälschlich nummeriert an |
| Restliche Basis-Fixtures | `list.odt`, `liste2.odt`, `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`, `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt` | Textinhalt jedes Listenpunkts bleibt bei Rundreise erhalten |
| DOCX (auf Bullet-Ebenen prüfen) | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` | Vorab per `w:numFmt`-Auszählung bestätigen, ob Bullet-Ebenen enthalten; enthaltene Bullet-Formate bleiben nach Rundreise `bullet_list` |
| **Negativ-Abgrenzung** | `ComplexNumberedLists.docx` | Enthält voraussichtlich **kein** `numFmt=bullet` (reines Nummerierungsmaterial) → **nicht** in die Bullet-Assertions ziehen; als Negativ-Test „keine Bullet-Liste" führen, damit die Abgrenzung nicht still verloren geht |

### 2.5 Neu — `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für req 4.1.8 (Cross-Format), schneller als E2E; ergänzt (ersetzt nicht) den
Browser-Test L34.

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| XL1 | DOCX → ODT → DOCX | Bullet-Liste (3 Punkte) → `readOdt(writeOdt(readDocx(writeDocx(c))))` → erneut `readDocx(writeDocx(…))` | Weiterhin 3 Punkte, `bullet_list`, Reihenfolge/Text identisch; DOCX/ODT-Symbol-Asymmetrie je Ebene (req 2.2) als erwartet dokumentieren |
| XL2 | ODT → DOCX → ODT | spiegelbildlich | s. o. |

---

## 3. Teil B — Echte Playwright-Browser-Tests (`tests/e2e/lists.spec.ts`, T4)

**Grundsatz (bindend, wortgleich mit dem Auftrag):** Kein Testfall in Teil B darf durch
direkten Aufruf interner Funktionen (`toggleList(...)`, `readDocx(...)` etc.) ersetzt
werden. Jeder Testfall läuft über echte Handlungen: `locator.click()`,
`page.keyboard.press(...)`/`.type(...)`, echter Datei-Upload (`filechooser`-Event oder
`setInputFiles` auf das sichtbare Formularelement), `page.waitForEvent('download')` +
**strukturelles** Parsen der heruntergeladenen Datei vom Dateisystem (nicht nur
`toContain`-String-Suche). Der Bullet-Button wird heute nur als Setup in
`clipboard*`/`cut.spec.ts` geklickt; die **Bedien-Akzeptanz** dieses Features hat noch
kein eigenes Spec (T4).

### 3.1 Determinismus (PFLICHT — keine Race-Conditions)

Der Auftrag verlangt deterministische Tests. Die Codebasis hat einen dokumentierten
**Selection-Sync-Bug**: nach einer Toolbar-Aktion + Cursor-Neupositionierung landet die
DOM-Selektion asynchron über das `selectionchange`-Event; eine sofort folgende
Tasteneingabe wirkt sonst auf eine **veraltete** Selektion (`WordEditor.tsx:26-27`,
`reconcileSelectionOnClick` Z.43/144). Etablierte Gegenmaßnahmen (aus
`selection-regression.spec.ts:32-34` und `cut.spec.ts:72-74,176-178`, dort gegen echte
Mobile-Flakes verifiziert) sind in `lists.spec.ts` **zwingend** anzuwenden:

1. **Nach Toolbar-Klick + Klick-Neupositionierung, vor der nächsten Tasteneingabe:**
   `await page.waitForTimeout(50)`, damit der in-flight `selectionchange`-Sync landet
   (genau das Muster aus `selection-regression.spec.ts:32-34`). Gilt insbesondere für
   L2 (Strg+A + Klick „Aufzählung" + Enter/Tippen), L7–L9, L19, L34.
2. **Selektion vorzugsweise per Tastatur** (`Control+Home`, `Shift+ArrowRight`/
   `Shift+End`, `ControlOrMeta+a`) statt roher Maus-Offsets — reproduzierbarer als
   Klick-Drag auf berechnete Pixel. Für „Cursor mittig" (L5) `ArrowLeft`/`ArrowRight`
   zählen statt Pixelklick.
3. **Nicht auf DOM-Zustand tippen, bevor er da ist:** vor Assertions Playwright-eigenes
   Auto-Waiting nutzen (`await expect(locator).toHaveText(...)`/`.toHaveCount(...)`),
   nie `page.waitForTimeout` als Ersatz für eine Zustandsassertion. `page.keyboard.type`
   mit Bedacht; bei langen Eingaben (L26) nötigenfalls `{ delay }` setzen, damit keine
   Zeichen verschluckt werden.
4. **Nach jedem Klick, der die Selektion ändert**, vor Export/Weiterbedienung auf ein
   sichtbares Zwischenergebnis warten (`await expect(editor.locator('ul li')).toHaveCount(n)`),
   nicht blind exportieren.
5. `page.on('pageerror', …)` je Test registrieren und am Ende asserten, dass **keine**
   unerwartete Exception geworfen wurde (deckt „stiller Crash" ab).

### 3.2 Liste erstellen (req 2.1, §6.1)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L1 | Erstellen per Cursor ohne Selektion | Ein Absatz tippen, Cursor hinein, `getByTitle('Aufzählung').click()` | `editor.locator('ul li')` = genau 1 `li` mit dem Text; ein `<ul>` vorhanden | §6.1 |
| L2 | Erstellen per Selektion über mehrere Absätze | Drei Absätze tippen (`Enter` dazwischen), `ControlOrMeta+a`, **`waitForTimeout(50)`**, „Aufzählung" klicken | `editor.locator('ul > li')` = genau 3, jeweils der Originaltext, **eine** gemeinsame `ul` | §6.1 |

### 3.3 Enter-Verhalten (req 2.3, §6.2) — erstmaliger echter Browser-Nachweis für `splitListItem`

| # | Test | Schritte | Assertion |
|---|---|---|---|
| L3 | Enter am Ende eines nicht-leeren Punkts | Punkt „Eins", Cursor ans Ende, `Enter`, „Zwei" tippen | 2 `li` „Eins"/„Zwei", dieselbe `ul` |
| L4 | Enter am Ende eines **leeren** Punkts beendet die Liste | Wie L3, im leeren zweiten Punkt sofort `Enter` | Liste hat wieder 1 `li` „Eins", danach ein normaler `<p>` (kein zweites leeres `li`) |
| L5 | Enter mittig splittet ohne Textverlust | Punkt „Vorname Nachname", Cursor per `ArrowLeft`-Zählung zwischen „Vorname " und „Nachname", `Enter` | 2 `li` „Vorname"/„Nachname", kein Zeichen verloren/dupliziert |
| L6 | Umschalt+Enter = Zeilenumbruch, kein neuer Punkt | Punkt „Zeile1", `Shift+Enter`, „Zeile2" | Weiterhin genau 1 `li` mit `<br>` zwischen „Zeile1"/„Zeile2" |

### 3.4 Erneuter Klick bei aktiver Liste (Grenzfälle 3.2–3.4, F1)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L7 | Erneuter Klick am **ersten** Punkt | Liste mit 1 Punkt, Cursor darin, „Aufzählung" erneut klicken | Nach F1: Punkt wird zu Absatz (kein `<ul>` mehr) | **ROT** — aktuell stiller No-Op (`<ul>` bleibt) |
| L8 | Erneuter Klick an **späterem** Punkt (≥ 2) | Liste „Eins"/„Zwei", Cursor in „Zwei", erneut klicken | Nach F1: „Zwei" wird Absatz, „Eins" bleibt Punkt, **kein** `<ul><li><ul>` | **ROT/dokumentationspflichtig** — tatsächliches Ergebnis protokollieren |
| L9 | Erneuter Klick bei Selektion der **gesamten** Liste (`Strg+A`) | Dokument nur aus einer Bullet-Liste, `ControlOrMeta+a`, `waitForTimeout(50)`, klicken | Nach F1: definiertes Ergebnis (keine zusätzliche umschließende Ebene) | **ROT/dokumentationspflichtig** |

### 3.5 Wechsel Aufzählung ↔ Nummerierung (req 2.6, §6.4)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| L10 | Nummeriert → Aufzählung | „1. Liste" erzeugen, Cursor hinein, „Aufzählung" klicken | `<ol>` wird `<ul>`, Text/Reihenfolge identisch, keine Verschachtelung |
| L11 | Aufzählung → Nummeriert | Bullet-Liste erzeugen, „Nummerierte Liste" klicken | `<ul>` wird `<ol>`, Text/Reihenfolge identisch |

### 3.6 Liste aufheben (req 2.5, Grenzfall 3.10)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L12 | Aufheben, Text bleibt | Liste mit 2 Punkten, `ControlOrMeta+a`, „Liste aufheben" klicken | Kein `<ul>` mehr, beide Texte als normale Absätze | §6.5 |
| L13 | „Liste aufheben" ohne Listenkontext | Normalen Absatz fokussieren, „Liste aufheben" klicken | Nach F3: Button `disabled`. **Vor** Fix: sichtbar nichts, **keine** Exception (`pageerror`-Überwachung) | Grenzfall 3.10, F3 |

### 3.7 Tab/Umschalt+Tab — Dokumentationstest (F12, bewusst kein Fix hier)

| # | Test | Schritte | Assertion | Status |
|---|---|---|---|---|
| L14 | `Tab` in einem Punkt sinkt **nicht** ein | Liste mit 2 Punkten, Cursor am Anfang von Punkt 2, `Tab` | Dokumentstruktur unverändert (keine Verschachtelung); protokollieren, ob der Fokus den Editor verlässt | **GRÜN erwartet** als Nachweis des *fehlenden* Verhaltens; wird der Test rot, ist das ein *positives* Signal (`liste-einruecken-tab` umgesetzt) und der Test wird aktualisiert, nicht „gefixt" |
| L15 | `Umschalt+Tab` analog | Wie L14 mit `Shift+Tab` | Keine Ebenenänderung | **GRÜN erwartet**, gleiche Einordnung |

### 3.8 Zusammenspiel (req 2.7, §6.7)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| L16 | Zeichenformatierung im Punkt | Punkt erzeugen, Wort selektieren, „Fett" klicken | Wort fett, Listenstruktur unverändert |
| L17 | Ausrichtung eines einzelnen Punkts | Liste mit 2 Punkten, einen Punkt zentrieren | Nur dieser Punkt zentriert; bleibt nach Export/Reimport individuell (siehe L29) |
| L18 | Liste in Tabellenzelle | Tabelle einfügen, in Zelle klicken, `waitForTimeout(50)`, „Aufzählung", Text tippen | `<ul>` **innerhalb** der Zelle, restliche Zellen unverändert |
| L19 | Undo/Redo über gemischte Sequenz inkl. Toolbar-Klick + Cursor-Neupositionierung | Tippen → Liste erzeugen (Klick) → Cursor per Klick neu positionieren → `waitForTimeout(50)` → weiterer Text → mehrfach `ControlOrMeta+z` | Jeder Undo-Schritt genau ein Schritt; **kein** Selection-Sync-Bug (Muster aus `selection-regression.spec.ts` mit Listen-Aktion statt Fett) |

### 3.9 Zustandsanzeige & Tastaturbedienbarkeit (F2, F4, Grenzfall 3.5)

| # | Test | Schritte | Assertion | Status |
|---|---|---|---|---|
| L20 | `aria-pressed` folgt der Cursor-Position | Cursor in Bullet-Liste, dann per Klick außerhalb | `getByTitle('Aufzählung')` hat `aria-pressed='true'` innerhalb, `'false'` außerhalb | **ROT** — Attribut existiert nicht (`Toolbar.tsx:243`) |
| L21 | Tastatur-Fokus + `Enter` aktiviert Button | Absatz tippen, wiederholt `Tab` bis `getByTitle('Aufzählung')` `toBeFocused()`, `Enter` | Liste wird angewendet (wie L1) | **ROT** — nur `onMouseDown`, fokussierter Button feuert bei Enter kein `mousedown` |
| L22 | Tastatur-Fokus + `Leertaste` | Wie L21, `page.keyboard.press(' ')` | Liste wird angewendet | **ROT**, gleicher Grund |
| L23 | Grenzfall 3.5: Selektion über Überschrift | Via `Absatzformat`-Select (`getByLabel('Absatzformat').selectOption('1')`) einen Absatz zur Überschrift machen, darunter einen normalen Absatz; beide per `Control+Home`→`Shift`-Auswahl markieren, `waitForTimeout(50)`, „Aufzählung" klicken | Nach F2/F3: Button `disabled` **oder** nur Absätze werden Liste (Überschrift ausgelassen) — dokumentiertes Ergebnis asserten, **kein** stiller Totalausfall | **Dokumentationspflichtig** |

### 3.10 Weitere Grenzfälle (req Abschnitt 3)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| L24 | 3.1: leere Liste erstellen + sofort aufheben | Leeren Absatz fokussieren, „Aufzählung", sofort „Liste aufheben", ohne Text | Kein verwaistes `<ul>`/`<li>`, keine Seiten-/Konsolenfehler | 3.1 |
| L25 | 3.14: Undo direkt nach Erstellung | Absatz tippen, „Aufzählung", `ControlOrMeta+z` | Exakter Vorzustand (normaler Absatz, keine Listenreste) | 3.14 |
| L26 | 3.15: sehr lange Liste (> 50 Punkte) bleibt bedienbar | Liste mit 60 Punkten (Tippschleife mit `{ delay }` oder `page.evaluate`), in spätem Punkt tippen | Kein spürbares Einfrieren (Tipp-Latenz unter definierter Schwelle, siehe Abschnitt 8), kein Timeout | 3.15 |

### 3.11 Rundreise über echten Upload/Export für im Editor erzeugte Konfigurationen (req 4.1)

Jede Zeile: Zustand **A** im Editor erzeugen → **unverändert** exportieren
(`waitForEvent('download')`) → Download mit **unabhängigem** Parser prüfen (JSZip +
DOMParser auf `word/document.xml`/`word/numbering.xml` bzw. `content.xml`, **nicht** dem
eigenen Reader) → dieselbe Datei erneut über die Karte hochladen → Inhalt entspricht **A**.

| # | Test | Prüfung nach Export (unabhängiger Parser) | Bezug |
|---|---|---|---|
| L27 | Einfache Bullet-Liste (3 Punkte), DOCX | Jeder Absatz `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="…"/></w:numPr>`; `numbering.xml` mit `<w:abstractNum>` (`<w:numFmt w:val="bullet"/>`, `<w:lvlText w:val="•"/>` auf Ebene 0) | 4.1.1 |
| L28 | Dasselbe, ODT | `content.xml`: `<text:list text:style-name="…">` mit 3 `<text:list-item>`; `automatic-styles`: `<text:list-style>` mit `<text:list-level-style-bullet text:bullet-char="•">` | 4.1.2 |
| L29 | Bullet-Liste mit Fett/Kursiv/Farbe | Zeichenformatierung im Export zusätzlich zur Listenstruktur, DOCX **und** ODT | 4.1.4 |
| L30 | Bullet-Liste in Tabellenzelle | Export enthält Tabellen- **und** Listenstruktur verschachtelt in der Zelle, DOCX **und** ODT | 4.1.5 |
| L31 | Zwei getrennte Listen **mit** Trennabsatz | Nach Reimport zwei getrennte `bullet_list`, DOCX **und** ODT | 4.1.6, Grenzfall 3.11 |
| L32 | Zwei getrennte Listen **ohne** Trennabsatz | Nach Reimport weiterhin zwei getrennte Listen | 4.1.6, Grenzfall 3.12 — **erwartet ROT für DOCX** (F7 offen); ODT erwartet grün (OL4) |
| L33 | Wechsel Aufzählung ↔ Nummerierung, dann Export | Exportierter Zustand = zuletzt gewählter Typ, keine Reste des anderen, keine Verschachtelung | 4.1.7 |
| L34 | Cross-Format-Doppel-Rundreise | Editor-Bullet-Liste → als ODT exportieren → Download über ODT-Karte hochladen → als DOCX exportieren → Download über DOCX-Karte hochladen | Struktur (Punktzahl/Text/Typ) über beide Konvertierungen identisch | 4.1.8 |
| L35 | Zweistufige Verschachtelung als Rundreise (Regressionswächter, E2E) | Verschachtelte Liste per Fixture-Import erzeugen (Editor kann keine Verschachtelung erzeugen, F12) → Export → Reimport | `li ul, li ol` = 1 vor **und** nach (dupliziert bewusst **nicht** `roundtrip-fidelity.spec.ts`, sondern referenziert es als Pflicht-Grün); DOCX zusätzlich `w:ilvl="1"`/Glyph „◦" | 4.1.3, 0.2 |
| L36 | Liste am Dokumentanfang/-ende | Nach Export/Reimport: Cursor davor/danach positionierbar, neuer Absatz einfügbar | 4.1.9 |

### 3.12 Import + Rundreise realer Fixtures (req 4.2, „mindestens ein Test pro Datei")

| # | Test | Fixtures | Prüfung |
|---|---|---|---|
| L37 | Einstufige Kernfixtures, je Datei ein Test | `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`, `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` | Import → `<ul>` mit ≥ 1 `<li>` → unverändert exportieren → Reimport → Punktzahl/Text/Typ identisch |
| L38 | Verschachtelungs-Fixtures | `EasyList.odt`, `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` | Import ohne Absturz/weiße Seite (`pageerror`-Überwachung), Verschachtelung bleibt sichtbar (`li ul`), Rundreise erhält Textinhalt (Grenzfall 3.6/3.7) |
| L39 | Liste in Tabellenzelle | `listsInTable.odt`, `simple-table-with-lists.odt` | Liste bleibt nach Rundreise sichtbar in der Zelle |
| L40 | Bild im Listenpunkt | `imageWithinList.odt` | Kein Absturz (`block+`), Bild bleibt im/beim Punkt, Rundreise ohne Datenverlust |
| L41 | Listenstil-Auflösung | `listStyleId.odt`, `ListStyleResolution.odt` | Nach Fix F5: korrekte visuelle Unterscheidung Bullet („•") vs. Nummerierung, **nicht** pauschal Bullet |
| L42 | Bekannt „kaputtes" Markup | `brokenList.odt`, `ListOddity.odt` | Import wirft nicht, definierter Fallback; **Grenzfall 3.16 offen halten:** prüfen, ob der bestehende `large-document-import.spec.ts` (existiert!) `brokenList.odt` **inhaltlich** (Listenstruktur) prüft oder nur „stürzt nicht ab" — falls nur Letzteres, hier eine echte Struktur-Assertion ergänzen |
| L43 | Expliziter Rundreisetest | `ListRoundtrip.odt` | Punktzahl/Text/Typ vor/nach Export/Reimport identisch |
| L44 | Restliche Basis-Fixtures (parametrisierte Schleife) | `list.odt`, `liste2.odt`, `preparedList.odt`, `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`, `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt` | Import ohne Absturz/Textverlust, Rundreise erhält Textinhalt jedes Punkts (echter Upload/Download statt direktem Reader) |
| L45 | DOCX Bullet-Ebenen | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` | Enthaltene Bullet-Absätze bleiben nach echtem Upload→Export→Reimport als `<ul>` erkennbar; `NumberingWithOutOfOrderId.docx` zusätzlich als Testfall für die `w:lvl`-Reihenfolge-Frage (F8) |
| L46 | Negativ-Abgrenzung | `ComplexNumberedLists.docx` | Import zeigt **keine** Bullet-Liste (nur nummerierte Formate) — bewusst festhalten, damit die Datei nicht in künftige Bullet-Assertions gerät |

### 3.13 Datei-Upload: echter `filechooser`, nicht nur versteckter Input

Die bestehenden Upload-Tests (`docx.spec.ts`/`odt.spec.ts`) umgehen mit
`input.setInputFiles(...)` auf dem versteckten `<input type="file">` den sichtbaren
„Datei hochladen"-Button. Für **mindestens** L34 und je einen Fall aus L37/L45 gehört
der tatsächliche Klickpfad zwingend dazu:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  odtCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bulletListTest.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
```

### 3.14 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

req §6.10 verlangt einen **unabhängigen** Parser statt reiner String-Suche. Für L27–L36:

```ts
// exportedBuffer stammt aus fs.readFile(download.path()); zip = await JSZip.loadAsync(exportedBuffer)
const documentXml = await zip.file('word/document.xml')!.async('string')
const numberingXml = await zip.file('word/numbering.xml')!.async('string')
const parser = new DOMParser()   // im Node-Test via 'jsdom' (Devdependency): new JSDOM('').window.DOMParser
const doc = parser.parseFromString(documentXml, 'application/xml')
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const withNumPr = [...doc.getElementsByTagNameNS(W, 'p')].filter((p) => p.getElementsByTagNameNS(W, 'numPr').length > 0)
expect(withNumPr).toHaveLength(3)                                  // genau 3, nicht „irgendwo bullet"
const numId = withNumPr[0].getElementsByTagNameNS(W, 'numId')[0]!.getAttributeNS(W, 'val')
// numId → abstractNumId → abstractNum in numbering.xml auflösen, dann:
expect(abstractNum!.getElementsByTagNameNS(W, 'numFmt')[0]!.getAttributeNS(W, 'val')).toBe('bullet')
```

Sichert, dass die Prüfung **strukturell** ist (richtiges Element/Attribut), nicht nur
„die Zeichenkette `bullet` kommt vor" — relevant für L27 (genau 3 `numPr`) und die
Bullet-vs-Ordered-Unterscheidung in L45.

### 3.15 Bestehende Tests, die unverändert weiterlaufen müssen (Regressionsschutz)

- `tests/e2e/roundtrip-fidelity.spec.ts` — **Pflicht-Grün:** deckt die
  Verschachtelungs-Persistenz (`li ul, li ol` = 1 vor/nach) für DOCX **und** ODT ab.
  Nach jedem Fix (insb. F7 `NumberingRegistry`) erneut ausführen — der Fix darf ihn
  **nicht** brechen.
- `tests/e2e/selection-regression.spec.ts` (alle Tests) — Listenbedienung ist laut
  req 2.7 ein Verdachtsfall für exakt dieses Muster; nach jeder `Toolbar.tsx`-Änderung
  (F2/F3/F4) erneut ausführen (siehe L19).
- `tests/e2e/clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`, `cut.spec.ts` —
  klicken den Bullet-Button als Setup; müssen grün bleiben.
- `tests/e2e/docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
  `large-document-import.spec.ts`, `large-document-export.spec.ts` — unverändert Teil
  der Dauer-Suite.

### 3.16 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (L1, L2, L7–L13, L16–L20, L23–L46) | Pflicht | Pflicht | Pflicht | `.click()` projektunabhängig |
| Tastatur-only-Tests (L14, L15, L21, L22, L25) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch-Geräte ohne Hardware-Tastatur; `page.keyboard.press` sendet CDP-Events unabhängig vom simulierten Gerät, reales Touch-Verhalten separat dokumentieren, **kein** Testausschluss |
| Enter-Verhalten, Undo/Redo (L3–L6, L19) | Pflicht | Pflicht | Pflicht | Tastenkombinationen via `page.keyboard` projektunabhängig |

---

## 4. Traceability-Matrix

### 4.1 req Abschnitt 6 (Pflicht-Testfälle) → Testfall(e)

| §6 | Testfall(e) hier |
|---|---|
| 1 Liste erstellen | L1, L2 |
| 2 Enter-Verhalten | L3, L4, L5, L6 |
| 3 Erneuter Klick (3.2–3.4) | L7, L8, L9, CL1, CL2 |
| 4 Wechsel Aufzählung ↔ Nummerierung | L10, L11, CL3, OL2 |
| 5 Liste aufheben (inkl. No-Op 3.10) | L12, L13, CL6 |
| 6 Tab/Umschalt+Tab (Fehlen nachweisen) | L14, L15 |
| 7 Verschachtelungs-Rundreise (Persistenz) | L35, DL2, `roundtrip.test.ts:178`, `odt:169`, `roundtrip-fidelity.spec.ts` |
| 8 Zusammenspiel/Undo | L16, L17, L18, L19, L40 |
| 9 Grenzfälle 1–16 | siehe 4.2 |
| 10 Rundreise 4.1 inkl. unabhängiger Parser | L27–L36, DL1–DL4, OL1–OL9, XL1, XL2, `external-validation.test.ts` |
| 11 Fixture-Import 4.2 | L37–L46, Abschnitt 2.4 |
| 12 `aria-pressed` | L20, CL4, CL5 |
| 13 Tastaturbedienbarkeit ohne Maus | L21, L22 |
| 14 Unit-Test `toggleList`/`liftFromList` | CL1–CL7 |

### 4.2 req Abschnitt 3 (Grenzfälle 1–16) → Testfall(e)

| Grenzfall | Testfall(e) |
|---|---|
| 3.1 Leere Liste erstellen/aufheben | L24 |
| 3.2 Erneuter Klick, erster Punkt | L7, CL1 |
| 3.3 Erneuter Klick, späterer Punkt | L8, CL2 |
| 3.4 Erneuter Klick, ganze Liste selektiert | L9 |
| 3.5 Selektion über Überschrift | L23, CL7 |
| 3.6 Reale ODT mit Verschachtelung (`listLevel10.odt`) | L38, Abschnitt 2.4 |
| 3.7 `list-item` ohne führenden Absatz | OL6, L38, Abschnitt 2.4 |
| 3.8 DOCX-Reimport mehrstufiger Liste (Ebenen erhalten) | DL2, L45, 0.2 |
| 3.9 Bild als einziger Inhalt eines Punkts | OL7, L40 |
| 3.10 „Liste aufheben" ohne Listenkontext | L13, CL6 |
| 3.11 Zwei getrennte Listen mit Trennabsatz | `roundtrip.test.ts:167`, OL3, DL4, L31 |
| 3.12 Zwei Listen ohne Trennabsatz (Verschmelzung) | DL1 (DOCX ROT), OL4 (ODT), L32 |
| 3.13 ODT-Listenstil nur in `styles.xml` | OL5, L41 |
| 3.14 Undo direkt nach Erstellung | L25 |
| 3.15 Sehr lange Liste | L26 |
| 3.16 Bekannt „kaputtes" Markup | L42 (prüft, ob der existierende `large-document-import.spec.ts` die Listenstruktur inhaltlich abdeckt) |

### 4.3 Fixes/Lücken (`code.md`) → Testfall(e)

| # | Punkt | Testfall(e) | Status jetzt |
|---|---|---|---|
| F1 | `toggleList` kein echtes Toggle | CL1–CL3, OL1–OL2, DL1(indirekt), L7–L9 | ROT |
| F2 | Kein `aria-pressed`/`isListActive` | CL4, CL5, L20 | ROT |
| F3 | Kein `disabled`/No-Op-Feedback | CL6, L13, L23 | ROT (Verhalten), CL6 grün als Grundlage |
| F4 | Tastatur-Aktivierung | L21, L22 | ROT |
| F5 | ODT-Fallback auf „bullet" (Stil nur in `styles.xml`) | OL5, L41 | ROT |
| F7 | DOCX: benachbarte Listen ohne Trennabsatz verschmelzen | DL1, L32 (DOCX) | ROT |
| F8 | DOCX: `w:lvl`-Auswahl nach Dokumentreihenfolge | DL3, L45 | ROT bis Fix (synthetisch) |
| T1 | Kein Unit-Test für `toggleList`/`liftFromList` | CL1–CL7 | Lücke |
| T2 | ODT-Test „getrennte Listen mit Trennabsatz" fehlt | OL3 | Lücke |
| T3 | `external-fixtures.test.ts` ohne Struktur-Assert | Abschnitt 2.4 | Lücke |
| T4 | Kein dediziertes Bullet-E2E-Spec | Abschnitt 3 (gesamt) | Lücke |
| F6 | ~~`list_item` ohne führenden Absatz → Schema-Crash~~ | OL6, OL7 (**Absicherung, kein Crash**) | **Nicht-Bug** (`block+`), erwartet GRÜN |
| F12 | Kein Tab/Umschalt+Tab (Übergabe) | L14, L15 | Dokumentiert offen |
| D1 | Kein eigenes Bullet-Zeichen / Symbol je Ebene (ODT) | — (Backlog-Einschränkung, kein Testfall) | Dokumentiert |
| D2 | Keine Input-Rules | — (Backlog-Einschränkung) | Dokumentiert |

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `code.md` Abschnitt 4)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (bestätigter Bug/Lücke) | CL1–CL5, DL1, DL3, OL1, OL2, OL5, L7, L20, L21, L22, L32 (DOCX-Seite) | F1, F2, F4, F5, F7, F8 — Abschnitt 0.1 |
| **Erwartet GRÜN** (bereits funktionierendes Grundverhalten / Regressionswächter) | L1–L6, L10–L12, L16–L19, L24–L31, L33–L36, L39, L43, L44, L46, DL2, DL4, OL3, OL4, OL6, OL7, OL8, OL9, CL6, XL1, XL2 | Liste erstellen/Enter/einfache Rundreise/Liste in Zelle/Zeichenformat + **F6-Nicht-Bug** (OL6/OL7) + **Verschachtelungs-Persistenz** (DL2, L35) |
| **Dokumentationspflichtig, Ausgang offen** | L8, L9, L23, L38, L41, L42, CL7 | Tatsächliches Verhalten durch Ausführung ermitteln und festhalten (No-Op vs. Verschachtelung; Überschrift-Selektion; Fallback bei kaputtem Markup) |
| **Absichtlich dauerhaft GRÜN als Lückennachweis** | L14, L15 | Dokumentieren bewusst nicht gebautes Tab/Umschalt+Tab (F12) |

Sobald `code.md` Abschnitt 4 (F1–F8) umgesetzt ist, müssen **alle** „erwartet ROT"-Fälle
auf GRÜN wechseln — das ist der maschinell prüfbare Nachweis, dass die Fixes wirken. Die
Regressionswächter (DL2, L35, `roundtrip.test.ts:178`, `odt:169`,
`roundtrip-fidelity.spec.ts`) müssen dabei durchgängig **grün bleiben**; wechselt einer
auf ROT, hat ein Fix die Verschachtelungs-Persistenz gebrochen (DoD-Verletzung).

---

## 6. Abgleich mit der Definition of Done (`aufzaehlungsliste-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| Jeder Punkt aus req Abschnitt 2 über echte Browser-Bedienung nachgewiesen | Abschnitt 3.2–3.10 (L1–L26) |
| Jeder Grenzfall aus Abschnitt 3 hat einen dauerhaft verbleibenden Test | Traceability 4.2 |
| Rundreise aus Abschnitt 4 für **beide** Formate + **alle** Fixtures, inkl. unabhängigem Parser | Abschnitt 2.3–2.5 (Unit), 3.11–3.12 (E2E, L27–L46), `external-validation.test.ts` |
| **Verschachtelungs-Persistenz** durch dauerhaft grüne Unit- **und** E2E-Tests abgesichert | `roundtrip.test.ts:178`, `odt:169`, DL2, L35, `roundtrip-fidelity.spec.ts` (Regressionswächter) |
| Offene Lücken (F1 Toggle, F2 aktiver Zustand, F3 No-Op-Feedback) umgesetzt **oder** dokumentiert; **F1 darf nicht offen bleiben** | CL1–CL5, L7–L9, L20; Statuswechsel ROT→GRÜN als Nachweis |
| Lücke „kein dediziertes Listen-E2E-Spec" (req 5.9) geschlossen | Abschnitt 3 (`tests/e2e/lists.spec.ts`) |
| Fehlende ODT-Entsprechung „zwei getrennte Listen mit Trennabsatz" (req 5.10) ergänzt | OL3 (T2) |
| Kein Punkt führt zu stillem Fehlschlag (insb. 3.2, 3.5, 3.10) | L7, L13, L23 — Assertion auf sichtbares Feedback (`disabled`/`aria-pressed`) statt bloßer Wirkungslosigkeit |

**Von req nicht verlangter, aber empfohlener QA-Zusatz:** Grenzfall 3.16 auflösen — der
in beiden `external-fixtures.test.ts` als Ersatzabdeckung genannte
`large-document-import.spec.ts` **existiert**; zu verifizieren ist, ob er die
**Listenstruktur** von `brokenList.odt`/`bug65649.docx` inhaltlich prüft (nicht nur
„stürzt nicht ab"). Falls nicht, L42 um eine echte Struktur-Assertion ergänzen. (Die
frühere QA-Behauptung, die Datei existiere gar nicht, war falsch — siehe 0.2.)

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Gegenkontrolle Abschnitt 0 reproduzieren** — vor jeder weiteren Arbeit sicherstellen,
   dass die Befunde (0.1 offen, 0.2 bereits implementiert) beim aktuellen Stand gelten.
2. **CL1–CL7** (`commands.test.ts`) zuerst — schnellster, formatunabhängiger Nachweis von
   F1/F2, bewusst rot laufen lassen.
3. **DL1–DL4, OL1–OL9, XL1–XL2** (Abschnitt 2.3/2.5) — Reader/Writer-Rundreise, inkl.
   bewusst roter Regressionstests für F5/F7/F8 und der Absicherungstests OL6/OL7 (F6-Nicht-Bug).
   **Regressionswächter DL2 vor und nach jedem Fix grün bestätigen.**
4. **Erweiterung `external-fixtures.test.ts`** (Abschnitt 2.4) für alle Fixtures aus req 4.2.
5. **`tests/e2e/lists.spec.ts` Abschnitt 3.2–3.10** (L1–L26) — Grundbedienung, Toggle-Grenzfälle,
   Zustandsanzeige, Tastaturbedienbarkeit; Determinismus-Regeln aus 3.1 durchgängig anwenden.
6. **`tests/e2e/lists.spec.ts` Abschnitt 3.11–3.12** (L27–L46) — Rundreise über echten
   Upload/Export inkl. aller realen Fixtures.
7. **Grenzfall 3.16 klären** (L42): `large-document-import.spec.ts` auf inhaltliche
   Listenstruktur-Prüfung sichten, ggf. ergänzen.
8. **Nach Umsetzung von `code.md` Abschnitt 4:** alle „erwartet ROT"-Fälle erneut ausführen,
   Statuswechsel auf GRÜN dokumentieren; `roundtrip-fidelity.spec.ts` und
   `selection-regression.spec.ts` zusätzlich als Regressionswächter laufen lassen.
9. Traceability (Abschnitt 4) und DoD (Abschnitt 6) final gegenprüfen, bevor der
   Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **L8/L9/L23/L38** (Verschachtelungs-/No-Op-Verhalten) benötigen vor der endgültigen
  Testimplementierung eine kurze manuelle Browser-Sichtung, um festzustellen, welches der
  in req als „potenziell" beschriebenen Ergebnisse tatsächlich eintritt — die Assertion
  wird erst danach mit fixem Erwartungswert formuliert (aktuell „dokumentieren").
- **OL5/L41** (Grenzfall 3.13): Vorab `listStyleId.odt`/`ListStyleResolution.odt` öffnen,
  um zu bestätigen, ob eine der Dateien bereits organisch den F5-Fehlerfall (nummerierte
  Liste fälschlich Bullet) enthält, oder ob dafür das synthetische OL5 nötig bleibt.
- **L26** (sehr lange Liste): projektweit konsistente „kein spürbares Einfrieren"-Schwelle
  festlegen; mit `datei-oeffnen-qa.md`/`large-document-*` abgleichen, falls dort bereits ein
  Schwellenwert etabliert ist, statt einen Platzhalter (z. B. < 500 ms/Zeichen) zu erfinden.
- **Grenzfall 3.16 / L42:** Entscheidung, ob `brokenList.odt`/`bug65649.docx` über eine
  echte Listenstruktur-Assertion in `large-document-import.spec.ts` bzw. `lists.spec.ts`
  abgedeckt werden — betrifft auch andere Features, die sich auf denselben E2E-Großdatei-Test
  berufen, und sollte zentral vermerkt werden.
- **D1/D2** (eigenes Bullet-Zeichen, Input-Rules): bewusst ohne Testfall geführt; bei
  Freigabe bestätigen, dass „kein Test" hier der gewünschte QA-Umgang mit einer bewusst
  nicht gebauten Anforderung ist (analog `code.md` Abschnitt 7), nicht eine versehentliche
  Lücke.
