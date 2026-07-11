# QA-Testplan: Feature „Nummerierte Liste"

Rolle: QA-Antwort auf `specs/nummerierte-liste-req.md` (Anforderung, Abschnitte 1–7)
und `specs/nummerierte-liste-code.md` (Entwicklerplan/Befunde, Abschnitte 0–6).
Dieses Dokument nimmt **keinen** der beiden Vorgängertexte als bewiesen an — auch
`nummerierte-liste-code.md` ist laut eigenem Titel ein *Umsetzungsplan*, keine
verifizierte Umsetzung. Ergebnis ist ein Testplan, kein Testbericht: die meisten
hier aufgeführten Testfälle sind zum Zeitpunkt dieses Dokuments **noch nicht
geschrieben**, und ein Teil davon prüft Verhalten, das laut direkter Code-Sichtung
noch **gar nicht gebaut** ist (Tab/Shift-Tab, aktiver Button-Zustand, Fortsetzen/
Neustart-UI, DOCX-Startwert-Rundreise, Tabellenzellen-Listen beim DOCX-Import,
`styles.xml`-Auflösung/`list-header` bei ODT). Diese Fälle werden unten bewusst als
**erwartet ROT** geführt (Abschnitt 5), nicht stillschweigend weggelassen — das ist
gerade der Sinn von Abschnitt 7 der Anforderung („kein Punkt darf offen bleiben").

Stil/Gliederung orientiert an `fett-qa.md`/`datei-oeffnen-qa.md` (gleiches Repo,
gleiche Konventionen für Testumgebung/Locator/Ausführung).

> **Revisionshinweis (wichtig, QA-intern).** Eine frühere Fassung dieses QA-Dokuments
> war — wie die von `nummerierte-liste-req.md`/`-code.md` bereits korrigierte
> „Vorfassung" der Entwicklerdokumente — gegen einen **veralteten** Code-Stand
> geschrieben. Ihre „Gegenkontrolle" (Abschnitt 0) behauptete u. a., der DOCX-Reader
> lese `w:ilvl` nicht und `ListMarker` habe „kein `ilvl`-Feld überhaupt im Typ", und
> stufte daraufhin mehrstufigen DOCX-Im/Export pauschal als **ROT** ein. Diese Behauptung
> ist durch die erneute **direkte** Code-Sichtung (siehe Abschnitt 0, mit heute gültigen
> Zeilennummern) **widerlegt**: Verschachtelung ist auf Reader- **und** Writer-Seite
> gebaut und für zwei Ebenen bereits als Unit-Test grün. Die Statusspalten unten sind
> entsprechend korrigiert; die Kernbefunde, die *wirklich* offen sind (kein echtes
> Toggle, kein Tab, kein aktiver Button-Zustand, Startwert-/Fortsetzen-Rundreise,
> Tabellenzellen-Listen bei DOCX-Import, ODT-`styles.xml`/`list-header`), bleiben
> bestätigt. Konsequenz für die QA-Disziplin: **jeder** „Status jetzt"-Eintrag ist beim
> ersten echten Testlauf gegen das Ist-Verhalten zu prüfen, nicht aus einer
> Dokument-Kette zu übernehmen.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle, erneut direkt verifiziert)

Alle folgenden Zeilen wurden im **aktuellen** Quellcode (Repo `E:\docs`, Stand dieses
Dokuments) einzeln nachgelesen — nicht aus `nummerierte-liste-code.md` übernommen. Die
Zeilennummern sind die **heute gültigen**.

| Behauptung (aus `-code.md`/`-req.md`) | QA-Gegenkontrolle (Datei:Zeile direkt gelesen) | Ergebnis |
|---|---|---|
| `toggleList` ruft ausnahmslos `wrapInList` auf, kein echtes Toggle | `commands.ts:57-60`: `export function toggleList(ordered){ const listType = ...; return wrapInList(listType) }` | **Bestätigt.** Keine Fallunterscheidung, kein „aus". |
| `liftFromList` ist reiner `liftListItem`-Alias | `commands.ts:62-64` | **Bestätigt.** |
| Kein `isListActive`; `sinkListItem` nirgends importiert | `commands.ts:1-2` importiert nur `wrapInList, liftListItem`; `grep -rn sinkListItem src/` = **0 Treffer**; keine `isListActive`-Funktion in `commands.ts` | **Bestätigt.** |
| Kein `Tab`/`Shift-Tab` in der Keymap | `WordEditor.tsx:85-107` (`keymap({...})`, gefolgt von `keymap(baseKeymap)` Z. 108): nur `Mod-z/y/Shift-z`, `Enter: splitListItem(...)` (Z. 96), `Shift-Enter: insertHardBreak()` (Z. 97), `Mod-b/i/u`, `Shift-Delete` (Z. 106) | **Bestätigt.** Keine Tab-Bindung. |
| `Shift-Enter` ist an `insertHardBreak()` gebunden | `WordEditor.tsx:97` | **Bestätigt — und korrigiert die alte QA-Fassung**, die „Shift-Enter nirgends gebunden" behauptete. `hard_break` ist im Editor erzeugbar (siehe L10). |
| `ordered_list.attrs` hat nur `start`, kein Fortsetzen/Neustart-Attribut | `schema.ts:124-137`: `attrs: { start: { default: 1, validate: 'number' } }` | **Bestätigt.** Kein `numberingMode`. |
| `list_item.content = 'block+'` (nicht `paragraph block*`) | `schema.ts:146-152` (mit ausführlichem Kommentar Z. 139–145) | **Bestätigt.** Ein `list_item`, dessen erstes Kind eine Unterliste/ein Bild ist, ist **schema-gültig** — die früher befürchtete Schema-Exception ist gegenstandslos (req.md Grenzfall 3.20). |
| **DOCX-Reader liest `w:ilvl` und rekonstruiert Verschachtelung** | `reader.ts:289-292` (`interface ListMarker { numId; ilvl: number }` — **hat** ein `ilvl`-Feld), `reader.ts:294-302` (`listMarkerFor` liest `numId` **und** `ilvl`), `reader.ts:380-439` (`groupLists` = stack-basierte Verschachtelungs-Rekonstruktion) | **Bestätigt gebaut.** Die alte QA-Behauptung „liest nur `numId`, kein `ilvl`-Feld" war **falsch**. |
| **DOCX-Writer schreibt wachsendes `w:ilvl` je Ebene** | `writer.ts:105-140`, insb. `writer.ts:135` (`{ numId: gleich, level: Math.min(listContext.level+1, 8) }`); `MAX_LIST_ILVL=8` (`writer.ts:103`) | **Bestätigt gebaut.** Kein festes `ilvl=0`. |
| `numberingXml()` definiert **9 Ebenen** je Typ | `styleDefs.ts:50-62` (`bulletLevelsXml`/`orderedLevelsXml`, je `Array.from({length:9})`), `styleDefs.ts:64-74` | **Bestätigt.** |
| Bestehender Unit-Test „nested list two levels deep" (nur **Bullet**) | `docx/…/roundtrip.test.ts:178-204` (Assertion auf `bullet_list`), `odt/…/roundtrip.test.ts:169` | **Bestätigt.** Verschachtelung ist grün — aber **nur für Bullet**; ein **Ordered**- und ein **≥3-Ebenen**-Fall fehlen. |
| Feste globale `numId` je Listentyp | `styleDefs.ts:34-35`: `BULLET_NUM_ID=1`, `ORDERED_NUM_ID=2`; im Writer hart übernommen (`writer.ts:136`) | **Bestätigt.** Grundlage des Verschmelzungsrisikos zweier benachbarter Listen (DL4). |
| `node.attrs.start` wird beim DOCX-Export nie gelesen | `writer.ts:114-116` (paragraph-Fall nutzt nur `listContext.level`/`.numId`), `writer.ts:136` | **Bestätigt.** Startwert geht schreibseitig verloren. |
| DOCX-Reader setzt `attrs.start` nie | `reader.ts:389-392` (`openFrame` erzeugt `ordered_list` **ohne** `attrs`) | **Bestätigt.** Startwert geht leseseitig verloren. |
| `parseNumberingXml` liest je `abstractNum` nur das **erste** `<w:lvl>` | `reader.ts:84` (`firstChildNS(abstractEl,…,'lvl')`), ordnet dessen `numFmt` **global** der `numId` zu; kein `w:start`/`w:startOverride`/`w:lvlOverride` | **Bestätigt.** Betrifft Formaterkennung je Ebene und Start-Overrides, **nicht** die Verschachtelung (die kommt aus `ilvl` am Absatz). |
| DOCX-Tabellenzellen verlieren Listen beim Import komplett | `reader.ts:311-364`, insb. `337-339`: Zellinhalt via `childElements(tcEl,…,'p').flatMap(p => paragraphToBlocks(...))` — **ohne** `listMarkerFor`/`groupLists` | **Bestätigt.** Reine DOCX-Import-Asymmetrie (Export/ODT korrekt). |
| ODT-Reader mischt `styles.xml`-Automatikstile nie in die Body-Auflösung | `reader.ts:357-409`: `contentStyles` für Body (Z. 364/366), `stylesForChrome` aus `styles.xml` **nur** für Kopf-/Fußzeile (Z. 374–388) | **Bestätigt.** Nur in `styles.xml` definierte Listenstile → `elementToBlocks` fällt auf `'bullet'` zurück (Z. 288). |
| ODT-Reader ignoriert `<text:list-header>` | `reader.ts:289`: nur `childElements(el, text, 'list-item')` gesammelt; kein `list-header`-Zweig; kein `text:start-value`/`text:continue-numbering` gelesen | **Bestätigt.** Echter Textverlust für `list-header`. |
| ODT-Writer: fixer Stilname je Typ, nur Ebene 1 formal, kein `start`/`continue` | `writer.ts:99-109` (fix `LO`/`LB`, Z. 101), `styleRegistry.ts:95-103` (`listStyleDefs()` nur `text:level="1"`) | **Bestätigt.** |
| ODT-Reader/Writer rundreisen Verschachtelung **strukturell** | `reader.ts:286-299` (Rekursion Z. 290, `list_item`-Leerfall → `emptyParagraph()` Z. 296), `writer.ts:99-109` (Rekursion Z. 104) | **Bestätigt gebaut.** Verschachtelung überlebt; nur das Ebenen-**Format** ist jenseits Ebene 1 undefiniert. |
| Toolbar-Buttons „Aufzählung"/„Nummerierte Liste"/„Liste aufheben" ohne `aria-pressed`/`aria-label` | `Toolbar.tsx:243/254/265` tragen nur `title`; `MarkButton` (`aria-pressed` Z. 75), `AlignButton` (Z. 97), Tabelle-Button (`aria-pressed={isInTable(...)}` Z. 281) im Kontrast | **Bestätigt.** Einzige stabile Locator-Grundlage ist derzeit `getByTitle(...)`. |
| CSS ohne ebenenabhängiges `list-style-type` | `index.css:63-65`: nur `padding-left: 1.4em` für `.ProseMirror ul, .ProseMirror ol` | **Bestätigt.** |
| Bestehende Rundreise-Tests: DOCX hat „zwei Listen mit trennendem Absatz", ODT nicht | `docx/…/roundtrip.test.ts:167`, in ODT-Datei **nicht** vorhanden | **Bestätigt.** ODT-Basisfall (OL4) fehlt. |

> **Zeilennummern-Abgleich in dieser Fassung (QA-Disziplin am eigenen Dokument
> angewandt):** Beim erneuten direkten Nachlesen fielen ausgerechnet die
> `WordEditor.tsx`-Keymap-Fundstellen als **veraltet** auf — die vorherige QA-Fassung
> trug hier noch `WordEditor.tsx:77-99` (Keymap-Block) und `:89` (`Shift-Enter`), also
> genau die Zeilen, die `nummerierte-liste-req.md`/`-code.md` bereits als „um 40–120
> Zeilen verschoben" korrigiert hatten. Live-Stand: `keymap({...})` = **85–107**,
> `Enter: splitListItem` = **96**, `Shift-Enter: insertHardBreak()` = **97**,
> `keymap(baseKeymap)` = **108**. Oben (und in L10) korrigiert. Alle übrigen in Abschnitt 0
> geführten Fundstellen (`commands.ts:57-64`, `schema.ts:124-137/146-152`,
> `Toolbar.tsx:243/254/265/75/97/281`, `index.css:63-65`, DOCX-`reader.ts`/`writer.ts`/
> `styleDefs.ts`, ODT-`reader.ts`/`writer.ts`/`styleRegistry.ts`) wurden in dieser Fassung
> Zeile für Zeile gegen den Live-Code geprüft und stimmen. Lehre für den ersten Testlauf:
> **kein** Status- oder Fundstellen-Eintrag wird aus der Dokumentkette übernommen, ohne ihn
> gegen den dann aktuellen Code gegenzuprüfen.

**Konsequenz für diesen Testplan (korrigiert gegenüber der QA-Vorfassung):**
- **Nicht** pauschal ROT (mehrstufiger Im/Export ist gebaut): Verschachtelungs-Rundreise
  DOCX **und** ODT. Für diese Fälle ist der Befund „**Test fehlt**" (Coverage-Lücke,
  insbesondere Ordered + ≥3 Ebenen), **nicht** „Bug". Erwartung: GRÜN, sobald der Test
  existiert — beim ersten Lauf verifizieren.
- **Weiterhin bestätigt ROT** (Bug/fehlende Funktion): echtes Toggle, `isListActive`/
  `aria-pressed`, Tab/Shift-Tab, DOCX-Startwert-Rundreise, zwei benachbarte Listen **ohne**
  Trenner (DOCX-Verschmelzung), Tabellenzellen-Liste beim DOCX-Import, ODT-`styles.xml`-
  Auflösung, ODT-`list-header`, Fortsetzen/Neustart (beide Formate).

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment). Rundreise-Helfer `roundTrip(...)`
  bereits in `roundtrip.test.ts` je Format vorhanden — wiederverwenden.
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Projekte laut `playwright.config.ts`: **Desktop Chrome**, **Mobile** (`Pixel 7`),
    **Tablet** (`iPad Mini`). Jeder neue Testfall muss in **allen** konfigurierten
    Projekten grün sein, sofern er nicht explizit auf reine physische Tastaturbedienung
    angewiesen ist (Tab/Shift-Tab, Abschnitt 3.4) — für solche Fälle die Projekt-
    Zuordnung explizit begründen (siehe Determinismus-Regel D8, Abschnitt 1a).
  - Clipboard: die Chromium-Projekte haben laut jüngstem Commit explizite
    `clipboard-read`/`clipboard-write`-Permissions — Copy/Paste-Fälle (L44/L45) nutzen das,
    kein `execCommand`-Workaround, solange die Permission greift.
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in neuen Tests beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Frisches Dokument: `docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()`
    (bzw. `odtCard(page)...`).
  - Listen-Buttons: `page.getByTitle('Nummerierte Liste')`, `page.getByTitle('Aufzählung')`,
    `page.getByTitle('Liste aufheben')` (aktuell die einzige stabile Locator-Grundlage,
    da `aria-label` bei diesen drei Buttons fehlt — Abschnitt 0). Sobald `aria-pressed`/
    `aria-label` ergänzt sind (Code-Doc §2.2), auf rollenbasierte Locator umstellen.
  - Datei-Upload: `input[type="file"]` innerhalb der jeweiligen Karte (`setInputFiles`),
    alternativ echter `filechooser`-Weg über den sichtbaren „Datei hochladen"-Button
    (Abschnitt 3.13, analog `fett-qa.md`).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`
    + `download.path()` + `fs.readFile` + `JSZip.loadAsync(...)` (DOCX: `word/document.xml`,
    ggf. `word/numbering.xml`; ODT: `content.xml`, ggf. `styles.xml`).
- In jeder neuen Spec-Datei global Konsolen-/Seitenfehler mitschneiden (Nachweis „kein
  Absturz"): `page.on('pageerror', ...)`, `page.on('console', msg => msg.type()==='error' && ...)`,
  am Testende `expect(errors).toEqual([])`.

---

## 1a. Determinismus / Flake-Vermeidung (bindend für alle E2E-Fälle in Teil B)

Der Auftrag verlangt ausdrücklich **deterministische** Tests ohne Race-Conditions durch
zu schnelle Tastatureingaben und mit abgewartetem Selektions-Sync. Diese Regeln sind
**nicht optional** und im Repo bereits durch echte Flake-Fixes belegt (Commits „Fix flaky
Mobile-project … same async-selection-sync race", „give async selection sync time before
the next keystroke"; Muster in `tests/e2e/selection-regression.spec.ts`).

- **D1 — Selektions-Sync nach nativem Cursor-Move abwarten.** Nach einer nativen,
  browsergetriebenen Cursor-Bewegung (`page.keyboard.press('End'/'Home'/'ArrowUp'/…)`
  oder `editor.click()` zum Neupositionieren) und **vor** dem nächsten wirksamen
  Tastendruck (`Enter`, `Tab`, tippen) ein `await page.waitForTimeout(50)` einfügen.
  Grund (wörtlich aus `selection-regression.spec.ts`): ProseMirror erfährt einen nativen
  Caret-Move nur über das **asynchrone** `selectionchange`-Event des Browsers; ein sofort
  folgender `press()` ohne menschliche Reaktionszeit kann diesem Catch-up davonlaufen und
  auf der **alten** Position wirken. Der Toolbar-Klick + anschließende Cursor-Neupositionierung
  ist genau das in req.md 2.8 referenzierte Selection-Sync-Regressionsmuster — bei
  **jedem** Listen-Toolbar-Test einzuhalten (L34, L2, L34, L42 besonders betroffen).
- **D2 — Nicht schneller tippen als der Editor synchronisiert.** Für mehrstufige
  Eingaben `page.keyboard.type('...', { delay: 20 })` statt eines Bulk-`type` ohne Delay,
  wenn zwischen den Zeichen Editor-State-abhängige Reaktionen (Input Rules, Listen-Split)
  entstehen könnten. Reines Freitext-Tippen in **einen** Absatz braucht keinen Delay.
- **D3 — Nach Toolbar-Klick auf die *Wirkung* warten, nicht auf Zeit.** Statt fixem
  Sleep nach `getByTitle('Nummerierte Liste').click()` auf das DOM-Ergebnis warten:
  `await expect(page.locator('.ProseMirror ol')).toHaveCount(1)`. Web-First-Assertions
  (`toHaveCount`/`toContainText`/`toHaveAttribute`) haben eingebautes Auto-Retry und sind
  der bevorzugte Synchronisationspunkt. `waitForTimeout` **nur** für den D1-Fall
  (async `selectionchange`), nie als Ersatz für eine prüfbare Bedingung.
- **D4 — Download deterministisch abfangen.** Immer `const [download] = await Promise.all([
  page.waitForEvent('download'), exportButton.click() ])`; danach `await download.path()`
  vor dem Lesen. Nie `click()` und `waitForEvent` sequenziell (Race: Event kann vor dem
  Warten feuern).
- **D5 — Re-Upload deterministisch.** Nach `setInputFiles`/`filechooser` auf ein
  sichtbares Import-Ergebnis warten (`expect(editor).toContainText(...)` bzw.
  `expect(page.locator('.ProseMirror ol li')).toHaveCount(n)`), bevor die nächste Aktion
  läuft.
- **D6 — Keine harten Sub-Sekunden-Performancegrenzen.** Performancefälle (L49) messen und
  **protokollieren** `elapsedMs`; als harte Grenze nur einen großzügigen Realitäts-Deckel
  (z. B. < 5000 ms für einen Tastenanschlag-Batch) verwenden, nie eine Sub-100ms-Behauptung
  (CI-Varianz).
- **D7 — Stabile, eindeutige Locator.** `.ProseMirror ol`/`ul`/`li` sind stabil; für
  Verschachtelung explizit `li ol`, `li ul` prüfen (nicht nur „irgendwo ein `ol`"). Keine
  Text-Locator, die sich mit Nummern-`::marker` überschneiden.
- **D8 — Tastatur-only-Fälle projektbewusst führen.** Tab/Shift-Tab (L11–L16, L43) und
  andere rein physische Tastenbindungen sind auf den mobilen Projekten ohne Hardware-
  Tastatur ggf. nicht sinnvoll ausführbar — solche Fälle explizit auf Desktop Chrome
  beschränken (`test.skip(({ browserName }) => …)` bzw. projektbezogene Guard) **mit
  sichtbarer Begründung**, nie stillschweigend.
- **D9 — Kein `test.only`, keine geteilte Mutable-State-Abhängigkeit zwischen Tests.**
  Jeder Test baut sein Dokument in `beforeEach` frisch auf; kein Test setzt auf den
  Endzustand eines vorherigen (Reihenfolge-Unabhängigkeit).

Für **Unit-Tests** (Teil A) besteht keine Race-Problematik (synchron, kein DOM/Async-
Selektion); dort ist Determinismus durch feste Eingabe-JSON und den `roundTrip`-Helfer
ohnehin gegeben.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene. Testet
ausschließlich `writeDocx`/`readDocx`/`writeOdt`/`readOdt`/`wordSchema`/`commands.ts`
direkt, **keine** Playwright-Interaktion. Diese Ebene allein genügt laut
`nummerierte-liste-req.md` §7 nicht als Abnahmenachweis (siehe Abschnitt 3 für die
Pflichtebene „echte Bedienung").

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `docx/__tests__/roundtrip.test.ts:142` | „preserves bullet lists with multiple items" | Grundfall 2.1 |
| `docx/__tests__/roundtrip.test.ts:159` | „preserves ordered lists distinctly from bullet lists" | Grundfall 2.1/2.7 (Ordered≠Bullet) |
| `docx/__tests__/roundtrip.test.ts:167` | „keeps two separate lists distinct when a paragraph separates them" | Teilaspekt Grenzfall 3.5 (nur **mit** trennendem Absatz, nur Bullet) |
| `docx/__tests__/roundtrip.test.ts:178` | „preserves a nested list two levels deep" (**Bullet**) | Verschachtelung 2 Ebenen — **beweist, dass die Nesting-Maschinerie grün ist** |
| `odt/__tests__/roundtrip.test.ts:144/161/169` | analog (Bullet-Mehrfach, Ordered≠Bullet, nested 2 Ebenen Bullet) | Grundfall 2.1/2.7 + Verschachtelung |
| `docx/…/external-fixtures.test.ts`, `odt/…/external-fixtures.test.ts` | Import aller Fixtures, bislang nur „stürzt nicht ab" (bzw. „lehnt bewusst kaputte ab") | Teilabdeckung §4.2 (nur Absturzfreiheit, **keine** inhaltliche Assertion) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **ergänzt**, nicht ersetzt.
Fehlend und in 2.2/2.3 nachzutragen: **Ordered**- und **≥3-Ebenen**-Verschachtelung,
der ODT-Fall „zwei Listen **mit** Trenner" (OL4) und alles zu Startwert/Fortsetzen/
Tabellenzelle.

### 2.2 Neue/erweiterte Testfälle — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| DL1 | **Ordered** mehrstufig (3 Ebenen) bleibt erhalten | `ordered_list` → `list_item` mit zweitem Block-Kind `ordered_list` → wiederum verschachtelt (3 Ebenen) → `roundTrip` | Verschachtelungstiefe identisch (3 `ordered_list` ineinander) | 2.4, 4.1.3/4.1.9 | **Erwartet GRÜN (Test fehlt)** — Nesting-Maschinerie ist gebaut (Writer `writer.ts:135` wachsendes `ilvl`, Reader `groupLists`), 2-Ebenen-Bullet-Fall bereits grün; der Ordered-3-Ebenen-Fall ist eine **Coverage-Lücke**, kein Bug. Beim ersten Lauf bestätigen. |
| DL2 | Alle Ebenen teilen dieselbe `numId`, unterschiedliches `ilvl` | Wie DL1, Assertion zusätzlich auf rohem `document.xml`: alle Absätze der drei Ebenen tragen `w:numId="2"`, `w:ilvl`=0/1/2 | Genau eine `numId`, aufsteigende `ilvl` | 2.4 | **Erwartet GRÜN (Test fehlt)** — `writer.ts:135` behält `numId` und erhöht `level`. Verifizieren. |
| DL3 | Individueller Startwert (`start: 5`) übersteht Rundreise | `ordered_list` mit `attrs: { start: 5 }` → `roundTrip` | `ordered_list.attrs.start === 5` | 3.7, 4.1.5 | **ROT** — `writer.ts:136` liest `attrs.start` nie; `numbering.xml` schreibt kein `w:startOverride`; `groupLists`/`openFrame` (`reader.ts:391`) erzeugt Liste ohne `attrs`. Schreib- **und** Leseseite defekt. |
| DL4 | Zwei **getrennt gemeinte** Listen bleiben getrennt **ohne** trennenden Absatz | `[ordered_list(A,B), ordered_list(C,D)]` direkt hintereinander (kein `paragraph` dazwischen) → `roundTrip` | Zwei `ordered_list`-Knoten mit je 2 `list_item` (nicht einer mit 4) | Grenzfall 3.5, 4.1.7 | **ROT** — feste `ORDERED_NUM_ID=2` (`styleDefs.ts:35`, `writer.ts:136`) → identische, aufeinanderfolgende `w:numId="2"`/`w:ilvl="0"`-Absätze; `groupLists` (`reader.ts:419`) fasst gleiche `numId`+`ilvl` zu **einer** Liste zusammen. |
| DL5 | Nummerierte Liste in Tabellenzelle übersteht Rundreise | `table` → `table_row` → `table_cell` mit `content:[ordered_list(...)]` → `roundTrip` | Zelle enthält nach Reimport weiterhin `ordered_list` mit denselben `list_item`-Texten | 2.8, 4.1.8 | **ROT** — Schreiben ok (generischer `blockToDocx` in `tableToDocx`), **Lesen verwirft die Liste** (`reader.ts:337-339` umgeht `listMarkerFor`/`groupLists`, bestätigter Komplettverlust). |
| DL6 | Sehr tiefe Verschachtelung (10 Ebenen) | 10-fach verschachtelter `ordered_list`-Baum → `roundTrip`; **zwei getrennte Assertions** | (a) kein Wurf/Exception **und** Text aller 10 Punkte vorhanden; (b) Ebenentiefe im Ergebnis | Grenzfall 3.6 | (a) **Erwartet GRÜN**; (b) **teilweise by design**: `MAX_LIST_ILVL=8` (`writer.ts:103`) klemmt `ilvl` bei 8 → Ebenen 9/10 werden beim Reimport zu Geschwistern auf Ebene 8. „bis Ebene 9 (ilvl 0–8) erhalten, tiefere geklemmt" ist **dokumentierte Grenze** (Code-Doc §6.1), kein Bug — genau so assertieren. |
| DL7 | Einzelner Listenpunkt exportiert als valide Liste | `ordered_list` mit genau einem `list_item` → `roundTrip` | `ordered_list` mit `content.length === 1`, kein Downgrade zu Absatz | Grenzfall 3.2 | Erwartet **GRÜN** |
| DL8 | „Nach Aufheben" hinterlässt keinen Listenrest | Modell ohne Listenknoten (nur Absätze) → `roundTrip` | Kein `ordered_list`/`list_item` im Ergebnis, kein Crash | Grenzfall 3.1 | Erwartet **GRÜN** (reine Datenebene) |
| DL9 | Umlaute/Sonderzeichen im Listenpunkt | `list_item`-Text `„Prüfung äöü ß – 100 % fertig?"` → `roundTrip` | Text zeichengetreu, Nummerierung unbeeinflusst | Grenzfall 3.12 | Erwartet **GRÜN** |
| DL10 | Individuelle Ausrichtung je Listenpunkt bleibt erhalten | Liste mit 2 `list_item`, deren innere `paragraph` verschiedene `align`-Werte tragen → `roundTrip` | Ausrichtung je Punkt individuell (nicht auf Listenstandard zurückgesetzt) | 2.8 | Erwartet **GRÜN** (nutzt bestehenden Ausrichtungs-Mechanismus) |
| DL11 | Lange Liste (60 Punkte) — Korrektheit | 60 `list_item` (`Punkt 1`…`Punkt 60`) → `roundTrip` | Alle 60 in korrekter Reihenfolge, keine Lücke/Duplikat | Grenzfall 3.13 | Erwartet **GRÜN** |
| DL12 | Cross-Format-Doppelrundreise (DOCX→ODT→DOCX) mehrstufig | siehe 2.7 (X1) | — | 4.1.10 | **Erwartet GRÜN**, sobald DL1/OL1 grün — beim Lauf bestätigen |

### 2.3 Neue/erweiterte Testfälle — `src/formats/odt/__tests__/roundtrip.test.ts`

Analoge Fälle OL7–OL13 spiegelbildlich zu DL5–DL11 (Assertions auf `<text:list>`/
`<text:list-item>` bzw. `text:start-value` in `content.xml` statt OOXML). Zusätzlich:

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| OL1 | **Ordered** mehrstufig (3 Ebenen) bleibt erhalten (Struktur) | Wie DL1, für ODT | Verschachtelungstiefe (3 `ordered_list` ineinander) erhalten | 2.4, 4.1.4/4.1.9 | **Struktur: erwartet GRÜN (Test fehlt)** — `reader.ts:286-299`/`writer.ts:99-109` rundreisen Verschachtelung. **Ebenen-Format: bekannte Grenze** — nur `text:level="1"` in `listStyleDefs()` (`styleRegistry.ts:101`), tiefere Ebenen erben kein eigenes Zahlenformat. Struktur- und Format-Assertion getrennt führen. |
| OL2 | Startwert (`start: 5`) übersteht Rundreise | Wie DL3, für ODT | `attrs.start === 5` nach Reimport | 3.7, 4.1.5 | **ROT** — `text:start-value` wird weder in `writer.ts:99-109` geschrieben noch in `reader.ts:286-299` gelesen. |
| OL3 | Zwei getrennte Listen **ohne** trennenden Absatz bleiben getrennt | Wie DL4, für ODT | Zwei separate `ordered_list`-Knoten | Grenzfall 3.5, 4.1.7 | **Zu verifizieren** — ODF-Listen werden über **echte Baumstruktur** gelesen (`reader.ts:286-299`), nicht über eine geteilte ID gruppiert wie OOXML; strukturell getrennte `<text:list>` bleiben plausibel getrennt trotz gemeinsamem Stilnamen `LO`. Der geteilte Stilname allein erzwingt **keine** Verschmelzung. Status durch Ausführung bestimmen, nicht annehmen. |
| OL4 | **Fehlender Basisfall**: „zwei Listen **mit** trennendem Absatz bleiben getrennt" | 1:1 wie DOCX-Test `roundtrip.test.ts:167`, für ODT bisher komplett fehlend (Abschnitt 0) | Zwei separate Listenknoten | 4.1.7 (Basis) | Erwartet **GRÜN**, aber als **fehlender Test** nachzutragen — die Lücke selbst ist der Befund |
| OL5 | Liste in Tabellenzelle | Wie DL5, für ODT | Zelle enthält Liste nach Reimport | 2.8, 4.1.8 | **Zu verifizieren** — ODT-Zellinhalt läuft über `elementToBlocks` (`reader.ts:307`), das den `text:list`-Zweig kennt; **kein** Komplettverlust wie bei DOCX erwartet. Durch Ausführung bestätigen. |
| OL6 | `text:continue-numbering="true"` → Fortsetzung | Reader-only gegen **handgebautes** `content.xml` (Writer kann das Attribut nicht erzeugen) — siehe 2.4/RO4 | Fortsetzungs-Semantik erkennbar, sobald Datenmodell existiert; bis dahin: Attribut wird **ignoriert**, kein Crash | 2.5, 4.1.6 | **ROT/dokumentierend** — Attribut nirgends gelesen; als RO4 formuliert |

### 2.4 Neue Dateien — Reader-fokussierte Tests mit handgebauten Dateien (nicht über eigenen Writer)

Mehrere Befunde lassen sich nur mit **fremd** aussehendem, handgebautem XML testen, da
der projekteigene Writer die betreffenden Konstrukte (mehrere `<w:lvl>` je `abstractNum`,
`w:lvlOverride`/`w:startOverride`, `<text:list-header>`, `styles.xml`-Style-Referenzen,
`text:continue-numbering`, `text:start-value`) noch nicht erzeugt. Muster wie
`buildSampleDocx`/`buildSampleOdt` in `docx.spec.ts`/`odt.spec.ts` (`JSZip` roh gebaut),
aber auf Unit-Ebene direkt gegen `readDocx`/`readOdt`.

**Neue Datei `src/formats/docx/__tests__/list-reader.test.ts`:**

| # | Testfall | Aufbau | Erwartung | Bezug | Status |
|---|---|---|---|---|---|
| RD1 | `w:ilvl` wird pro Absatz gelesen und verschachtelt | `document.xml` mit 3 Absätzen, `w:numId=1`, `w:ilvl`=0/1/0; `numbering.xml` definiert `numId=1` als ordered | Ergebnis-Baum: Punkt 1 und 3 auf oberster Ebene, Punkt 2 als verschachtelter Unterpunkt in Punkt 1 | 2.4 | **Erwartet GRÜN (Test fehlt)** — `listMarkerFor` (`reader.ts:298-301`) liest `ilvl`, `groupLists` (`reader.ts:421-423`) verschachtelt. Beweist die Leseseite direkt. |
| RD2 | Mehrere `<w:lvl>` je `abstractNum` | `abstractNum` mit `<w:lvl w:ilvl="0">`(decimal) und `<w:lvl w:ilvl="1">`(lowerLetter); Absätze `ilvl`=0/1 | Struktur: Ebene 1 verschachtelt unter Ebene 0, beide als `ordered_list` | 2.4 | **Struktur: erwartet GRÜN**; **Format je Ebene: bekannte Grenze** — `parseNumberingXml` (`reader.ts:84`) liest nur das **erste** `<w:lvl>` und klassifiziert die ganze `numId` einheitlich (ordered/bullet). Nur „Ebene 1 hat *lowerLetter*-Format" ist nicht rekonstruierbar; die **Verschachtelung** ist es. Beides getrennt assertieren. |
| RD3 | `w:startOverride` in `<w:num>` | `<w:num>…<w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride></w:num>`, ein Absatz mit dieser `numId` | `ordered_list.attrs.start === 5` | 3.7, Grenzfall 3.16 | **ROT** — weder `parseNumberingXml` noch `groupLists` werten Overrides aus. |
| RD4 | Unordentliche `numId`-Reihenfolge | `numId`-Werte nicht aufsteigend, mit expliziten Overrides (nach `NumberingWithOutOfOrderId.docx`-Muster) | Import ohne Absturz, Grundnummerierung/-ebene korrekt zugeordnet, Text vollständig | Grenzfall 3.16 | **Zu verifizieren** — `kindByNumId`-Zuordnung (`reader.ts:89-95`) ist reihenfolge-unabhängig; plausibel grün für Struktur/Text, Overrides bleiben (RD3) offen. |
| RD5 | Tabellenzelle mit `w:numPr`-Absatz | `parseTable`-Pfad mit Zelle, die einen nummerierten Absatz enthält | Zelle enthält `ordered_list`, nicht nur `paragraph` | 2.8 | **ROT** — `reader.ts:337-339` (Komplettverlust). |

**Neue Datei `src/formats/odt/__tests__/list-reader.test.ts`:**

| # | Testfall | Aufbau | Erwartung | Bezug | Status |
|---|---|---|---|---|---|
| RO1 | `<text:list-header>` wird nicht verschluckt | `<text:list><text:list-header><text:p>Kopfzeile</text:p></text:list-header><text:list-item>…</text:list-item></text:list>` | „Kopfzeile" kommt im Body-Text vor (als eigener Absatz vor der Liste, Design §2.8) | Grenzfall 3.18, Fixtures `ListHeading.odt`/`ListHeading2.odt` | **ROT** — `reader.ts:289` sammelt nur `list-item`. |
| RO2 | Listenstil nur in `styles.xml`, referenziert aus `content.xml` | `content.xml`: `<text:list text:style-name="L1">` ohne lokale Definition; `styles.xml`: `<office:automatic-styles><text:list-style style:name="L1">…<text:list-level-style-number …/>` | Liste als `ordered_list` erkannt (nicht fälschlich `bullet_list`) | Grenzfall 3.17, Fixtures `listStyleId.odt`/`ListStyleResolution.odt` | **ROT** — `styles.xml` nur für Chrome aufgelöst (`reader.ts:371-388`), Body fällt auf `'bullet'` zurück (`reader.ts:288`). |
| RO3 | `text:start-value` am ersten `<text:list-item>` | `<text:list-item text:start-value="5"><text:p>…` | `ordered_list.attrs.start === 5` | 3.7 | **ROT** — nirgends gelesen. |
| RO4 | `text:continue-numbering="true"` | Zweite `<text:list>` mit diesem Attribut nach erster gleichtypiger Liste | Fortsetzungs-Semantik (sobald Datenmodell existiert); bis dahin: Attribut ignoriert, **kein Crash** | 2.5 | **ROT/dokumentierend** |
| RO5 | `<text:list-item>` ohne führenden `<text:p>` (erstes Kind = verschachtelte `<text:list>`) | Erstes Kind eines `list-item` ist direkt ein `<text:list>` | Kein Wurf; `readOdt` liefert ein schema-valides `list_item` (Unterliste als Block, ggf. leerer Absatz via Fallback) | Grenzfall 3.20 | **Erwartet GRÜN (Test fehlt)** — `list_item.content='block+'` (`schema.ts:147`) **erlaubt** das; `emptyParagraph()`-Fallback (`reader.ts:296`) deckt den sonst leeren Fall. req.md 3.20: „konstruktiv ausgeschlossen". Der frühere ROT-Vermerk war falsch — Test dient dem **Nachweis**, dass kein Schema-Fehler entsteht. |

### 2.5 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT), je genannter Datei mit inhaltlicher Assertion

Anforderung §4.2 verlangt für **jede** dort genannte Fixture „(a) Import ohne
Absturz/Datenverlust **und** (b) Rundreise auf inhaltliche Gleichheit" — nicht nur
„stürzt nicht ab". Alle unten genannten Dateien wurden per `ls`
(`tests/fixtures/external/{docx,odt}/`) als tatsächlich vorhanden bestätigt.

**`src/formats/docx/__tests__/external-fixtures.test.ts` — neue, dateispezifische Blöcke:**

| # | Fixture | Zusätzliche Assertion | Bezug | Status jetzt |
|---|---|---|---|---|
| FD1 | `ComplexNumberedLists.docx` | Import ohne Absturz **und**: mindestens ein `list_item` liegt ≥2 Ebenen tief verschachtelt (nicht alles auf Ebene 0) | 4.2, Kernfixture 2.4/3.6 | **Erwartet GRÜN (Test fehlt)** — Nesting-Import gebaut (`groupLists`); vor der Assertion per `unzip`/`document.xml`-Sichtung bestätigen, welche `ilvl`-Werte die Datei enthält. |
| FD2 | `Numbering.docx` | Anzahl `ordered_list`-Punkte = Anzahl `w:numPr`-Absätze im Original | 4.2 | Zu verifizieren |
| FD3 | `NumberingWithOutOfOrderId.docx` | Import ohne Absturz, Text jedes Punkts vollständig trotz nicht aufsteigender `numId` | Grenzfall 3.16 | Zu verifizieren (RD4) |
| FD4 | `NumberingWOverrides.docx` | Mindestens ein `ordered_list.attrs.start !== 1`, wo die Datei `w:startOverride` enthält (erwarteten Wert vorab per `numbering.xml`-Sichtung bestätigen) | Grenzfall 3.16/3.7 | **ROT** — Override-Lesung fehlt (RD3). |
| FD5 | Rundreise für FD1–FD4 | Import → `writeDocx` (unverändert) → `readDocx` → Text jedes Punkts identisch zum ersten Import | §4.2 „Vorgabe" (a)+(b) | Erwartet GRÜN für FD1–FD3 (Text/Struktur), **ROT** für FD4 (Startwert) |

**`src/formats/odt/__tests__/external-fixtures.test.ts` — neue, dateispezifische Blöcke:**

| # | Fixture | Zusätzliche Assertion | Bezug | Status jetzt |
|---|---|---|---|---|
| FO1 | `ContinueListTest.odt` | Fortsetzungsverhalten erkennbar/dokumentiert (mind.: kein falscher Neustart, sofern Datei das erwartet — Inhalt vorab durch Öffnen bestätigen) | 2.5 | **ROT/zu verifizieren** (continue nicht gelesen) |
| FO2 | `listLevel10.odt` | Import ohne Absturz/Endlosschleife; Text aller Ebenen vorhanden | Grenzfall 3.6 | Zu verifizieren (unter jsdom nicht als „slow" ausgeschlossen — läuft) |
| FO3 | `listsInTable.odt` | Liste innerhalb Tabellenzelle importiert (nicht als reiner Absatz) | 2.8 | Zu verifizieren (OL5) |
| FO4 | `simple-table-with-lists.odt` | Analog FO3 | 2.8 | Zu verifizieren |
| FO5 | `ListRoundtrip.odt` | Import → unverändert exportieren → Reimport → Listenstruktur (Typ, Anzahl Punkte, Ebene) identisch | 4.2 (expliziter Rundreise-Fall) | Zu verifizieren |
| FO6 | `brokenList.odt` | Definierter Fallback statt Absturz/Datenverlust (Ergebnis dokumentieren). **Achtung:** unter Vitest/jsdom via `SKIP_SLOW_UNDER_JSDOM` **ausgeschlossen** (`external-fixtures.test.ts`); die inhaltliche Prüfung dieser Datei gehört daher in **E2E** (L62), nicht in den Unit-Lauf | Grenzfall 3.19 | Zu verifizieren (nur E2E), Crash-Freiheit ist Pflicht |
| FO7 | `ListOddity.odt` | Analog FO6, aber unter jsdom nicht ausgeschlossen → Unit möglich | Grenzfall 3.19 | Zu verifizieren |
| FO8 | `listStyleId.odt` | Als `ordered`/`bullet` korrekt über referenzierten Stil erkannt (nicht fälschlich Bullet-Fallback) | Grenzfall 3.17 | **ROT** (RO2) |
| FO9 | `ListStyleResolution.odt` | Analog FO8 | Grenzfall 3.17 | **ROT** (RO2) |
| FO10 | `ListHeading.odt` | Text der `<text:list-header>`-Kopfzeile nach Import **irgendwo** im Body auffindbar (nicht verschwunden) | Grenzfall 3.18 | **ROT** (RO1) |
| FO11 | `ListHeading2.odt` | Analog FO10 | Grenzfall 3.18 | **ROT** (RO1) |
| FO12 | Restliche Listen-Fixtures (`EasyList.odt`, `EasyListForeignNamespace.odt`, `EasyListForeignNamespaceMSO15_AOO.odt`, `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt`, `feature_bullets_numbering.odt`, `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`, `simple_bullet_list_1_pre_OX.odt`, `simple-list_MSO14.odt`, `simpleList.odt`, `simpleList3.odt`, `preparedList.odt`, `liste2.odt`, `list.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `imageWithinList.odt`) | Je Datei (`test.each`): Import ohne Absturz **und** Rundreise (Import→unverändert exportieren→Reimport) → Textinhalt jedes Listenpunkts identisch zum ersten Import | §4.2 letzter Punkt | Zu verifizieren je Datei; Ergebnis-Tabelle beim Ausführen nachtragen |

### 2.6 Neue Datei: `src/formats/shared/editor/__tests__/list-commands.test.ts`

Unit-Tests direkt auf `EditorState`-Ebene (kein DOM/Playwright), analog reiner
Funktionstests im Projekt (`pagination.test.ts`). Deckt Code-Doc §2.1–§2.4 ab, bevor
Browser-Testaufwand investiert wird.

| # | Testfall | Vorgehen | Erwartung | Bezug | Status jetzt |
|---|---|---|---|---|---|
| C1 | `toggleList(true)` außerhalb jeder Liste | State mit zwei Absätzen, Selektion über beide → `toggleList(true)(state, dispatch)` | `true`, Ergebnis: **eine** `ordered_list` mit 2 `list_item` | 2.1 | Erwartet **GRÜN** (unveränderter `wrapInList`-Pfad) |
| C2 | `toggleList(true)` auf **erstem** Punkt einer Ordered-Liste (Regression stiller No-Op) | `ordered_list` mit 2 Punkten, Cursor im ersten → `toggleList(true)` | **Muss** die Liste aufheben (echtes „aus"), **nicht** `false`/No-Op | 2.7, §2.1 Code-Doc | **ROT** — aktueller `wrapInList` liefert hier `false`. |
| C3 | `toggleList(true)` auf **späterem** Punkt derselben Liste (Regression Verschachtelung) | Wie C2, Cursor im zweiten Punkt | **Keine** verschachtelte Liste-in-Liste; Ergebnis bleibt flach | 2.7 | **ROT** — aktueller `wrapInList` verschachtelt laut Bibliotheksanalyse. |
| C4 | `toggleList(true)` auf bestehender **Bullet**-Liste (Formatwechsel) | `bullet_list` mit 2 Punkten, ganze Liste selektiert → `toggleList(true)` | **Ein** `ordered_list` mit denselben 2 Punkten, kein `bullet_list`, keine Verschachtelung | 2.7 | **ROT** — `wrapInList` toggelt Typ nicht um. |
| C5 | `isListActive(state, true)` erkennt Cursor in `ordered_list` | Cursor in `list_item` innerhalb `ordered_list` | `true` | 1.4, §2.2 | **ROT** — Funktion existiert nicht. |
| C6 | `isListActive(state, true)` liefert `false` außerhalb | Cursor in normalem Absatz | `false` | 1.4 | **ROT** — Funktion existiert nicht. |
| C7 | `indentListItem()` rückt zweiten Punkt ein | `ordered_list` mit 2 Punkten, Cursor im zweiten → `indentListItem()` | Zweiter Punkt wird verschachtelter `list_item` unter dem ersten | 2.4 | **ROT** — `sinkListItem` nirgends importiert. |
| C8 | `indentListItem()` auf **erstem** Punkt | Cursor im ersten Punkt → `indentListItem()` | Kein Sink; Rückgabe `true` **innerhalb** einer Liste (Tab geschluckt, kein Fokusverlust), Dokument unverändert | 2.4, `liste-einruecken-tab-req.md` Grenzfall 1 | **ROT** |
| C9 | `outdentListItem()` auf verschachteltem Punkt hebt **eine** Ebene | Punkt auf Ebene 2 → `outdentListItem()` | Punkt landet auf Ebene 1, nicht direkt als Absatz | 2.4/2.6 | **ROT** — Funktion existiert nicht. |
| C10 | `liftFromList()` auf verschachteltem Punkt hebt eine Ebene (vorhandenes Verhalten, ungetestet) | Punkt auf Ebene 2 → `liftFromList()` | Punkt landet auf Ebene 1 | 2.6 | **Erwartet GRÜN (Test fehlt)** — `liftListItem`-Verhalten, laut Bibliotheksanalyse korrekt, aber unbewiesen (Code-Doc §6.3). |
| C11 | `liftFromList()` auf oberster Ebene wandelt in Absatz | Punkt auf Ebene 1 → `liftFromList()` | Ergebnis `paragraph`, keine Listenreste | 2.6 | Erwartet **GRÜN** |
| C12 | `setListNumbering('restart', 5)` setzt Startwert | `ordered_list`, Cursor darin → `setListNumbering('restart', 5)` | `ordered_list.attrs.start === 5` | 2.5 | **ROT** — Funktion existiert nicht. |
| C13 | `setListNumbering('continue')` ohne Vorgängerliste liefert `false` | Erste/einzige Liste, kein Vorgänger → `setListNumbering('continue')` | `false` (kein stiller Erfolg ohne Wirkung) | 2.5, DoD „kein stiller Fehlschlag" | **ROT** — Funktion existiert nicht. |

### 2.7 Erweiterung — `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Status jetzt |
|---|---|---|---|---|
| X1 | Mehrstufige Ordered-Liste: DOCX→ODT→DOCX | `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` → `readDocx(writeDocx(...))` | Verschachtelungstiefe über beide Konvertierungen erhalten | **Erwartet GRÜN (Test fehlt)** — beide Nesting-Pfade gebaut; beim Lauf bestätigen |
| X2 | Ordered-Liste mit Startwert: ODT→DOCX→ODT | Spiegelbildlich | `start`-Wert über beide Konvertierungen erhalten | **ROT**, solange DL3/OL2 rot |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wortgleich zur Auftragsvorgabe):** Kein Testfall in Teil B darf
durch direkten Aufruf interner Funktionen (`toggleList(...)`, `isListActive(...)`,
`readDocx(...)` etc.) im Node-Kontext ersetzt werden. Jeder Testfall läuft über echte
Nutzer:innen-Handlungen im Browser: `locator.click()`, `page.keyboard.press(...)`/
`.type(...)`, echter Datei-Upload (`input.setInputFiles(...)` auf dem realen
`<input type="file">` bzw. echter `filechooser`-Weg), `page.waitForEvent('download')` +
Auslesen der **tatsächlich auf Disk geschriebenen** heruntergeladenen Datei. Alle
Determinismus-Regeln aus Abschnitt 1a (D1–D9) gelten hier durchgängig.

Neue Datei: `tests/e2e/lists.spec.ts`. `beforeEach` wie in Abschnitt 1 (Privacy-Banner
weg, frisches Dokument je Karte); für Rundreise-/Fixture-Fälle echter Upload.

### 3.1 Liste erstellen (Anforderung 2.1)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L1 | Cursor ohne Selektion → nur aktueller Absatz wird Liste | Text tippen (ein Absatz), Cursor darin, `getByTitle('Nummerierte Liste').click()`, dann D3-Warten | `.ProseMirror ol` sichtbar, genau 1 `li`, Text unverändert | Erwartet **GRÜN** |
| L2 | Selektion über mehrere Absätze → je eigener Punkt derselben Liste | Drei Absätze (mit `Enter`, je D1-Warten vor `Enter`), `ControlOrMeta+a`, Klick auf „Nummerierte Liste" | Genau **eine** `ol` mit 3 `li`, Original-Reihenfolge | Erwartet **GRÜN** |
| L3 | Bestehende Bullet-Liste → nummerierte Liste (keine Verschachtelung) | Bullet-Liste erzeugen, ganze Liste selektieren, „Nummerierte Liste" klicken | Genau **eine** `ol` (kein `ol` in `ul` o. u.), gleiche `li`-Anzahl | **ROT** (C4) |

### 3.2 Aktiver Button-Zustand (Anforderung 1, Element 4)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L4 | Button „gedrückt", wenn Cursor in nummerierter Liste | Liste erzeugen, Cursor hineinsetzen (D1-Warten) | `expect(getByTitle('Nummerierte Liste')).toHaveAttribute('aria-pressed','true')` | **ROT** (kein `aria-pressed`, Abschnitt 0) |
| L5 | Button „nicht gedrückt" außerhalb | Cursor aus der Liste in normalen Absatz (D1-Warten) | `aria-pressed` → `false` | **ROT** |
| L6 | Bullet- und Ordered-Button schließen sich aus | Cursor in Ordered-Liste | `getByTitle('Aufzählung')` `aria-pressed="false"`, `getByTitle('Nummerierte Liste')` `aria-pressed="true"` | **ROT** |

### 3.3 Enter-Verhalten (Anforderung 2.3)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L7 | Enter am Ende eines nicht-leeren Punkts | Liste mit 1 Punkt „Erster", Cursor ans Ende (D1), `Enter`, „Zweiter" tippen | 2 `li` „Erster"/„Zweiter" in derselben `ol` | Erwartet **GRÜN** |
| L8 | Enter am Ende eines **leeren** Punkts beendet die Liste | Liste „Text", `Enter` (leerer Punkt), nochmal `Enter` (D1 dazwischen) | Liste hat weiterhin 1 `li`, danach ein normaler `p` (kein zweiter leerer `li`) | Erwartet **GRÜN** (splitListItem→false→`liftEmptyBlock`, Code-Doc §1.4 — unbewiesen, jetzt nachweisen) |
| L9 | Enter in der Mitte teilt Text ohne Verlust | „AlphaBeta" tippen, Cursor zwischen „Alpha"/„Beta" (D1), `Enter` | 2 `li`: „Alpha"/„Beta", kein Zeichen verloren | Erwartet **GRÜN** |
| L10 | Umschalt+Enter → Zeilenumbruch **innerhalb** desselben Punkts | „Zeile1" tippen, `Shift+Enter`, „Zeile2" tippen | Weiterhin genau 1 `li` (kein neuer Punkt), Punkt enthält 2 Zeilen (`<br>`/`hard_break`) | **Erwartet GRÜN** — `Shift-Enter: insertHardBreak()` **ist gebunden** (`WordEditor.tsx:97`); Reader/Writer rundreisen `hard_break` bereits. (Korrigiert: die alte QA-Fassung hielt Shift-Enter fälschlich für ungebunden.) Im Listenkontext eigens nachweisen. |

### 3.4 Ein-/Ausrücken per Tab/Shift-Tab (Anforderung 2.4)

Rein physische Tastaturbindung → gemäß D8 primär auf Desktop Chrome, mobile Projekte mit
begründetem Guard.

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L11 | Tab am Zeilenanfang rückt ein | Liste mit 2 Punkten, Cursor am Anfang des zweiten (D1), `Tab` | Zweiter Punkt wird Unterpunkt: DOM `li ol li` bzw. `li ul li` | **ROT** — keine `Tab`-Bindung (Abschnitt 0) |
| L12 | Drei Ebenen, unterscheidbares Format je Ebene | Aus L11 heraus dritten Punkt zweimal einrücken | 3 verschachtelte Ebenen im DOM; `getComputedStyle(...).listStyleType` unterscheidet mind. Ebene 1 vs. 2 (z. B. `decimal` vs. `lower-alpha`) — setzt CSS-Ebenenregeln voraus (Code-Doc §2.9) | **ROT** |
| L13 | Shift+Tab rückt aus | Aus L11: Cursor im eingerückten Punkt, `Shift+Tab` | Punkt wieder auf oberster Ebene, weiterhin Teil derselben Liste | **ROT** |
| L14 | Shift+Tab auf oberster Ebene: festgelegtes, dokumentiertes Verhalten | Cursor im ersten, nicht eingerückten Punkt, `Shift+Tab` | Ergebnis protokollieren; deterministisch (No-Op **oder** Aufheben, je Design) | **ROT/zu entscheiden** (Code-Doc §6.3) |
| L15 | Tab **außerhalb** einer Liste löst kein Listenverhalten aus | Cursor in normalem Absatz, `Tab` | Kein Einzug/keine Umwandlung; Fokusverhalten konkret festhalten | Zu verifizieren nach Umsetzung (req.md 1, Element 5) |
| L16 | Ein-/Ausrücken stört Geschwister-Nummerierung nicht | 3 Punkte Ebene 1, zweiten einrücken und wieder ausrücken | Punkt 1 und 3 zeigen weiterhin „1."/„2." (kein Zähl-Versatz) | **ROT** (abhängig L11–L13) |

### 3.5 Liste aufheben (Anforderung 2.6)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L17 | Einstufig: Text bleibt, Nummerierung weg | Liste mit 2 Punkten, ganze Liste selektieren, „Liste aufheben" | Kein `ol`/`li`, 2 `p` mit unverändertem Text | Erwartet **GRÜN** |
| L18 | Mehrstufig: ein Klick hebt genau eine Ebene | Punkt auf Ebene 2 (setzt L11 voraus), „Liste aufheben" | Punkt landet auf Ebene 1, weiterhin Teil der Liste | **ROT** (setzt Tab/Indent voraus) |
| L19 | Oberste Ebene → normaler Absatz | Punkt auf Ebene 1, „Liste aufheben" | Ergebnis `p`, keine Listenreste | Erwartet **GRÜN** |

### 3.6 Wechsel Bullet ↔ Ordered ohne Verschachtelung (Anforderung 2.7)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L20 | „Nummerierte Liste" bei Cursor im **ersten** Punkt einer Ordered-Liste — echtes Toggle „aus" | Liste erzeugen, Cursor im ersten Punkt (D1), „Nummerierte Liste" erneut klicken | Liste aufgehoben (Text als `p`) — **kein** stiller No-Op | **ROT** (C2) |
| L21 | „Nummerierte Liste" bei Cursor im **zweiten** Punkt — keine Verschachtelung | Wie L20, Cursor im zweiten Punkt | **Keine** `ol`/`ul` verschachtelt in einem `li` derselben Liste | **ROT** (C3) |
| L22 | Ganze Bullet-Liste markiert → „Nummerierte Liste" | Bullet-Liste mit 3 Punkten, alle 3 selektieren, Klick | **Eine** `ol` mit 3 `li`, kein `ul` übrig | **ROT** (C4) |

### 3.7 Nummerierung fortsetzen/neu starten/Startwert (Anforderung 2.5, 1 Elemente 6/7)

Testet UI, die laut Code-Doc §1.3/§2.4 **noch nicht existiert** („▾"-Dropdown neben
„Nummerierte Liste"). Locator/Rollen unten sind **Platzhalter nach dem Entwurf** und beim
Schreiben an die tatsächlichen `aria-label`/Texte anzupassen (siehe Abschnitt 7, Punkt 6).

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L23 | Startwert per UI setzen, im Editor sichtbar | Liste erzeugen, Dropdown öffnen, „Beginnen bei:" `5`, bestätigen | Erster Punkt zeigt visuell „5." (`<ol start="5">`/`::marker`) | **ROT** (UI fehlt) |
| L24 | Startwert übersteht Export | Wie L23, DOCX exportieren (D4) | `numbering.xml` enthält für diese Liste `<w:startOverride w:val="5">` (oder äquivalent), `document.xml` referenziert die passende `numId` | **ROT** |
| L25 | „Fortsetzen" nur aktivierbar bei passender Vorgängerliste | Einzelne erste Liste, Dropdown öffnen | Option „fortsetzen" deaktiviert/ausgegraut mit erkennbarer Begründung (`aria-disabled` + Tooltip/Text) — kein stiller Fehlschlag | **ROT** |
| L26 | „Fortsetzen" nutzbar bei vorhandener Vorgängerliste | Erste Liste (3 Punkte), normalen Absatz einfügen, zweite Liste, Dropdown → „fortsetzen" | Erster Punkt der zweiten Liste zeigt „4." (nicht „1.") | **ROT** |
| L27 | Fortsetzen übersteht Export/Reimport | Wie L26, exportieren (D4), Datei erneut hochladen (D5) | Zweite Liste beginnt nach Reimport weiterhin bei „4." | **ROT** |

### 3.8 Liste innerhalb einer Tabellenzelle (Anforderung 2.8)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L28 | Liste in Zelle erzeugen, sichtbar | Tabelle einfügen, in Zelle klicken (D1), Text tippen, „Nummerierte Liste" | Zelle enthält `ol`/`li` | Erwartet **GRÜN** (reine Editor-Bedienung) |
| L29 | Rundreise DOCX: Liste in Zelle übersteht Export + Re-Upload | Wie L28, exportieren (D4), Datei erneut hochladen (D5) | Zelle enthält nach Re-Upload weiterhin `ol`/`li` mit unverändertem Text | **ROT** (bestätigter Komplettverlust, `reader.ts:337-339`) |
| L30 | Rundreise ODT: analog | Wie L29, ODT-Karte | Zelle enthält nach Re-Upload weiterhin Liste | Zu verifizieren (OL5/FO3/FO4) |

### 3.9 Undo/Redo inkl. Selection-Sync-Regressionsmuster (Anforderung 2.8 letzter Punkt)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L31 | Undo direkt nach Listenerstellung stellt Ursprung exakt her | Zwei Absätze, beide selektieren, „Nummerierte Liste", `ControlOrMeta+z` | Kein `ol`/`li`, Text/Absatzstruktur identisch zu vorher | Grenzfall 3.10, erwartet **GRÜN** |
| L32 | Redo stellt die Liste wieder her | Nach L31: `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) | Liste wieder vorhanden | Erwartet **GRÜN** |
| L33 | Gemischte Sequenz Undo | Tippen → Liste an → Tippen → Liste aufheben → mehrfach `ControlOrMeta+z` | Jeder Undo-Schritt macht exakt eine Aktion rückgängig, umgekehrte Reihenfolge | Erwartet **GRÜN** |
| L34 | **Selection-Sync-Regressionsmuster mit Listen-Toolbar-Klick als Auslöser** | `ControlOrMeta+a` → „Nummerierte Liste" klicken → `editor.click()` zur Cursor-Neupositionierung in der neuen Liste → `End` → **`await page.waitForTimeout(50)` (D1)** → `Enter` → tippen | Alle ursprünglichen Absätze bleiben als eigene Listenpunkte, neuer Punkt korrekt angehängt — kein Verlust durch den in req.md 2.8 referenzierten Selection-Sync-Bug (Muster aus `selection-regression.spec.ts`, hier mit Listen- statt Fett-Klick) | Zu verifizieren — konkreter Verdachtsfall, bisher kein Test |
| L35 | Bestehender `selection-regression.spec.ts` bleibt Pflicht | Kein neuer Test; Ausführungspflicht nach jeder `Toolbar.tsx`-Änderung (Listen-Fixes berühren dieselbe Datei) | Alle bestehenden Tests weiterhin grün | Nach jeder Umsetzungsphase erneut laufen |

### 3.10 Zusammenspiel: Zeichenformatierung/Ausrichtung in Listenpunkten (Anforderung 2.8)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L36 | Fett/Kursiv innerhalb eines Punkts | Punkt-Text selektieren, „Fett" klicken | Text im `li` fett, Nummerierung unbeeinflusst | Erwartet **GRÜN** |
| L37 | Individuelle Ausrichtung übersteht Rundreise | Zweipunktige Liste, zweiten Punkt zentrieren, exportieren (D4), erneut hochladen (D5) | Zweiter Punkt zentriert, erster links, nach Re-Upload weiterhin so | Erwartet **GRÜN** |

### 3.11 Grenzfälle aus Anforderung Abschnitt 3 (vollständig, 1 pro Nummer)

| # | Grenzfall | Test | Status jetzt |
|---|---|---|---|
| L38 | 3.1 Leere Liste | Liste erzeugen (Cursor, kein Text), sofort „Liste aufheben", ohne zu tippen | Kein Crash, kein Konsolenfehler, leerer `p` | Erwartet **GRÜN** |
| L39 | 3.2 Einzelner Listenpunkt | Ein Absatz zur Liste, exportieren (D4) | Export enthält valide Liste mit genau einem Punkt (DL7/OL entsprechend) | Erwartet **GRÜN** |
| L40 | 3.11 Liste am Dokumentanfang | Neues Dokument, ersten Absatz zur Liste, Cursor davor, neuen Absatz einfügen | Neuer Absatz **vor** der Liste einfügbar, kein Crash | Zu verifizieren |
| L41 | 3.11 Liste am Dokumentende | Letzten Absatz zur Liste, Cursor ans Ende (D1), `Enter` | Neuer nicht-leerer Punkt (kein impliziter Abschluss) | Erwartet **GRÜN** |
| L42 | 3.5 Zwei getrennte Listen ohne Trenner | Zwei Listen mit je 2 Punkten direkt hintereinander (konkreten UI-Weg beim Schreiben festlegen, D1 beim Cursor-Wechsel), exportieren (D4), erneut hochladen (D5) | Nach Reimport zwei separate Listen, je „1., 2." (nicht „1.–4.") | **ROT** (DOCX, DL4); ODT zu verifizieren (OL3) |
| L43 | 3.6 Sehr tiefe Verschachtelung (>4 Ebenen) | Über Tab wiederholt einrücken bis mind. 6 Ebenen | Kein Absturz/Endlosschleife, sichtbare Formatwiederholung ab dokumentierter Tiefe | **ROT** (setzt Tab voraus) |
| L44 | 3.8 Copy-Paste eines Punkts aus Bullet- in Ordered-Liste | Bullet-Punkt kopieren (`ControlOrMeta+c`), Cursor in Ordered-Liste (D1), einfügen (`ControlOrMeta+v`) | Eingefügter Punkt nummeriert (Zielformat gewinnt), Zielliste bleibt **eine** Liste | Zu verifizieren |
| L45 | 3.9 Copy-Paste von Listentext aus externer Quelle | Paste mit HTML-Payload `<ol><li>A</li><li>B</li></ol>` (echte Zwischenablage, Chromium-Permission; Fallback siehe Abschnitt 7.2) | Als Liste erkannt **oder** ohne Verlust als Klartext — Ergebnis konkret festhalten | Zu verifizieren |
| L46 | 3.10 Undo unmittelbar nach Listenerstellung | = L31 | Verweis auf L31 | Erwartet **GRÜN** |
| L47 | 3.7 Startwert ≠ 1 bei Anzeige **und** Rundreise | = L23/L24 | Verweis | **ROT** |
| L48 | 3.12 Sonderzeichen/Umlaute | Punkt „Prüfung äöü ß %" tippen | Text zeichengetreu im DOM, Nummerierung unbeeinflusst | Erwartet **GRÜN** |
| L49 | 3.13 Sehr lange Liste (>50 Punkte), Tippen in Punkt 50 performant | 55 Punkte erzeugen, in Punkt 50 zusätzlich tippen, Zeit messen (D6) | Kein Einfrieren; `elapsedMs` protokollieren, weicher Deckel < 5000 ms/Batch, **keine** Sub-100ms-Behauptung | Zu verifizieren |
| L50 | 3.14 Liste über manuellen Seitenumbruch | Liste über eine Seitengrenze (abhängig von `seitenumbruch`-Feature), letzten Punkt vor / ersten nach dem Umbruch prüfen | Nummerierung läuft über die Grenze weiter (kein Neustart bei „1.") | Zu verifizieren, feature-abhängig (Abschnitt 7.3) |
| L51 | 3.16 Fremddatei mit unordentlicher `numId` | Upload `NumberingWithOutOfOrderId.docx`/`NumberingWOverrides.docx` | Import ohne Absturz, Text/Grundnummerierung sichtbar | Zu verifizieren |
| L52 | 3.19 Bekannt „kaputtes" Listen-Markup | Upload `brokenList.odt`/`ListOddity.odt` | Definierter Fallback (kein weißer Bildschirm, kein Datenverlust) | Zu verifizieren, **muss** grün sein (kein Crash ist Pflicht) |

Grenzfälle 3.15/3.17/3.18/3.20 sind über die Fixture-Reihe 3.12 (L59/L60, L64/L65,
L66/L67 bzw. RO5) und die Tabellenzellen-Fälle abgedeckt.

### 3.12 Reale Fremddateien — echter Upload + echte Rundreise über Export/Re-Upload (Anforderung §4.2)

Je Zeile: echter Datei-Upload (`setInputFiles`/`filechooser`), Sichtprüfung im
`.ProseMirror`-Editor (D5), dann echter Export (`waitForEvent('download')`, D4) und
erneuter Re-Upload der heruntergeladenen Datei über denselben Weg.

| # | Fixture | Karte | Sichtprüfung nach Import | Rundreise-Prüfung |
|---|---|---|---|---|
| L53 | `docx/ComplexNumberedLists.docx` | DOCX | mehrstufige Liste, mind. ein Punkt weiter eingerückt | Nach Export+Re-Upload: Einrückungsunterschied bleibt |
| L54 | `docx/Numbering.docx` | DOCX | nummerierte Liste(n) | Punktanzahl/Text erhalten |
| L55 | `docx/NumberingWithOutOfOrderId.docx` | DOCX | kein Absturz, Text sichtbar | ohne Textverlust |
| L56 | `docx/NumberingWOverrides.docx` | DOCX | kein Absturz, Startwert-Override sichtbar (sonst Exportprüfung wie L24) | Override-Wert erhalten (**ROT**) |
| L57 | `odt/ContinueListTest.odt` | ODT | Liste(n), Fortsetzungsverhalten (Startzahl der zweiten Liste) dokumentieren | Fortsetzungsverhalten erhalten |
| L58 | `odt/listLevel10.odt` | ODT | kein Absturz, tiefe Verschachtelung sichtbar | ohne Absturz |
| L59 | `odt/listsInTable.odt` | ODT | Liste in Tabellenzelle sichtbar | Liste in Zelle erhalten |
| L60 | `odt/simple-table-with-lists.odt` | ODT | analog L59 | analog |
| L61 | `odt/ListRoundtrip.odt` | ODT | Liste sichtbar | identisch zum ersten Import |
| L62 | `odt/brokenList.odt` | ODT | kein Absturz (Pflicht), Fallback dokumentieren (E2E-only, unter jsdom ausgeschlossen — siehe FO6) | kein Absturz |
| L63 | `odt/ListOddity.odt` | ODT | analog L62 | analog |
| L64 | `odt/listStyleId.odt` | ODT | als nummeriert/Aufzählung **korrekt erkannt** (nicht Bullet-Fallback) | Erkennung erhalten (**ROT**) |
| L65 | `odt/ListStyleResolution.odt` | ODT | analog L64 | **ROT** |
| L66 | `odt/ListHeading.odt` | ODT | Kopfzeilentext sichtbar (nicht verschwunden) | Kopfzeilentext erhalten (**ROT**) |
| L67 | `odt/ListHeading2.odt` | ODT | analog L66 | **ROT** |
| L68 | Restliche ODT-Listen-Fixtures (Liste wie FO12) | ODT | je Datei kein Absturz, Text sichtbar (`test.each`) | Textinhalt jedes Punkts identisch zum ersten Import |

### 3.13 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

Analog `fett-qa.md`: mindestens **ein** Fall aus 3.12 pro Format (empfohlen L53 und L57)
zusätzlich über den sichtbaren „Datei hochladen"-Button statt des versteckten `<input>`:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'ComplexNumberedLists.docx', mimeType: '...', buffer })
```

### 3.14 Cross-Format-Rundreise über echten Upload/Download (Anforderung 4.1.10)

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L69 | Editor-erzeugte mehrstufige Liste: als ODT exportieren → reimportieren → als DOCX exportieren → reimportieren | 3 Ebenen im Editor (setzt Tab voraus), ODT-Export (D4), Upload (D5), DOCX-Export (D4), Upload (D5) | Verschachtelungsstruktur inhaltlich identisch (Optik darf sich ändern, Struktur nicht) | **ROT**, solange Tab-Erzeugung (3.4) fehlt — die reine Im/Export-Ebene ist gebaut, nur der Editor-Erzeugungsweg fehlt |

### 3.15 Unabhängige Validierung des Exports (Anforderung §6 Testfälle 11/12)

Nicht nur `.toContain(...)` auf rohem XML, sondern strukturelle Prüfung über einen vom
projekteigenen Reader unabhängigen Parsing-Weg (`DOMParser`/`jsdom`, analog `fett-qa.md`)
und, wo möglich, ein vollständig externes Werkzeug.

| # | Test | Schritte | Assertion | Status jetzt |
|---|---|---|---|---|
| L70 | DOCX-Export einer alle Fälle vereinenden Testdatei gegen `DOMParser` | Editor: mehrstufige Liste (3 Ebenen), Startwert 5, zwei getrennte Listen ohne Trenner, Liste in Zelle — in einem Dokument, exportieren (D4) | `DOMParser` auf `document.xml` **und** `numbering.xml`: je Absatz korrektes `<w:ilvl>`/`<w:numId>`; `<w:startOverride>` für Start-5-Liste; **zwei unterschiedliche** `numId` für die getrennten Listen | **ROT** (setzt alle Fixes voraus) |
| L71 | ODT-Export derselben Testdatei gegen `DOMParser` | Analog L70, ODT-Karte | `content.xml`: verschachtelte `<text:list>` korrekt, `text:start-value="5"`, zwei separate `<text:list>`-Bäume | **ROT** |
| L72 | Ergänzende vollständig externe Validierung (Vitest-/Playwright-getrennt) | Export aus L70 mit `python-docx` laden; Export aus L71 gegen ODF-Schema (`odfvalidator`/gleichwertig) | Kein Schema-Verstoß, Listenstruktur von unabhängigem Werkzeug bestätigt | Manueller/CI-separater Schritt (Abschnitt 7.4), Pflicht vor finaler Abnahme (Testfall 11/12) |

---

## 4. Traceability-Matrix (`nummerierte-liste-req.md` §6 → Testfall)

| Anforderung §6, Testfall | Testfall(e) in diesem Plan |
|---|---|
| 1. Liste erstellen (Cursor/Selektion) | L1, L2, C1 |
| 2. Enter-Verhalten (alle 4 Unterfälle) | L7, L8, L9, L10 |
| 3. Ein-/Ausrücken über ≥3 Ebenen inkl. Geschwister-Nummerierung | L11–L16, C7–C9 |
| 4. Fortsetzen/Neustart/beliebiger Startwert inkl. Rundreise | L23–L27, DL3, OL2, RD3, RO3, RO4, C12–C13 |
| 5. Liste aufheben (einstufig + mehrstufig) | L17–L19, C10–C11 |
| 6. Wechsel Bullet ↔ Ordered ohne Verschachtelung/Datenverlust | L3, L20–L22, C2–C4 |
| 7. Zusammenspiel (Format, Ausrichtung, Tabellenzelle, Undo/Redo, Selection-Sync) | L28–L37, DL5/OL5, DL10, L34/L35 |
| 8. Alle Grenzfälle 3.1–3.20 | L38–L52, RO5, DL6, DL7–DL9, OL3 |
| 9. Rundreise DOCX+ODT je Editor-Konfiguration (4.1.1–4.1.10) | DL1–DL12, OL1–OL13, X1–X2, L69 |
| 10. Import + Rundreise je reale Fixture (4.2) | FD1–FD5, FO1–FO12, RD1–RD5, RO1–RO5, L53–L68 |
| 11. Unabhängige DOCX-Validierung | L70, L72 |
| 12. Unabhängige ODT-Validierung | L71, L72 |

---

## 5. Erwarteter Ist-Status je Testfall (vor Umsetzung von `nummerierte-liste-code.md`)

Korrigiert gegenüber der QA-Vorfassung: mehrstufiger Im/Export ist **gebaut** → die
zugehörigen Rundreise-Fälle sind **Coverage-Lücken (erwartet GRÜN)**, nicht Bugs.

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (bestätigter Bug / fehlende Funktion) | C2–C9, C12–C13, DL3, DL4, DL5, OL2, RD3, RD5, RO1–RO4, FD4, FD5(nur FD4-Teil), FO8–FO11, L3–L6, L11–L14, L16, L18, L20–L27, L29, L42(DOCX-Teil), L43, L47, L56, L64–L67, L69–L71 | Bestätigte Befunde (Abschnitt 0): kein Tab/Shift-Tab, kein `aria-pressed`/`isListActive`, `toggleList` kein echtes Toggle, feste `numId` (Verschmelzung), Startwert nicht rundreisefähig (Schreib-+Leseseite), Tabellenzellen-Liste beim DOCX-Import komplett verloren, ODT `styles.xml`-Auflösung + `list-header`, Fortsetzen/Neustart fehlt |
| **Erwartet GRÜN, aber Test fehlt** (Maschinerie gebaut, nur Abdeckung nachzutragen) | DL1, DL2, DL6(Teil a), OL1(Struktur), RD1, RD2(Struktur), RD4, RO5, OL4, C1, C10, C11, X1, DL12, FD1 | Verschachtelung (Reader `groupLists` + Writer wachsendes `ilvl`) und `Shift-Enter`/`hard_break` sind gebaut und teils grün (2-Ebenen-Bullet); Ordered/≥3-Ebenen/Cross-Format sind unbelegt, aber plausibel grün — **beim ersten Lauf bestätigen** |
| **Erwartet GRÜN** (Grundverhalten, sollte bestehen) | L1, L2, L7–L9, L10, L17, L19, L28, L31–L33, L36–L39, L41, L46, L48, DL7–DL11, OL7–OL13 | Flache Liste erzeugen/aufheben, Enter-Grundfälle (inkl. Shift-Enter, Abschnitt 0), Formatierung/Ausrichtung in Punkten, Undo/Redo einfach |
| **Bekannte, zu dokumentierende Grenze (Teil-GRÜN/Teil-ROT by design)** | DL6(Teil b: >Ebene 9 geklemmt), OL1(Format je Ebene), RD2(Format je Ebene) | `MAX_LIST_ILVL=8` (DOCX), nur `text:level="1"` (ODT), `parseNumberingXml` liest nur erstes `<w:lvl>` — Produktentscheidungen (Code-Doc §6.1), als bekannte Grenze zu dokumentieren, nicht als Bug zu „fixen" |
| **Zu verifizieren, kein sicherer Vorab-Befund** | OL3, OL5, FD2, FD3, FO1–FO7, FO12, L15, L30, L40, L44, L45, L49–L52, L53–L55, L57–L63, L68 | Code-Doc äußert sich nicht abschließend bzw. Testausführung ist die einzige Quelle — Ergebnis beim Ausführen eintragen, nicht annehmen |

Sobald `nummerierte-liste-code.md` Abschnitte 2–3 umgesetzt sind, müssen alle als **ROT**
geführten Fälle einzeln auf **GRÜN** wechseln, und alle „erwartet GRÜN, Test fehlt"-Fälle
müssen mit tatsächlich geschriebenem Test grün laufen — das ist der maschinell prüfbare
Nachweis, dass die jeweilige Umsetzungsphase (Code-Doc §5) wirkt, nicht nur Code-Review.

---

## 6. Ausführungsreihenfolge (an `nummerierte-liste-code.md` §5 angelehnt)

1. **Vor jeder Umsetzung**: die „erwartet GRÜN, Test fehlt"-Rundreisen (DL1, DL2, RD1,
   RD2, OL1, OL4, RO5) **jetzt schreiben und laufen lassen** — bestätigt, dass die in
   Abschnitt 0 als gebaut behauptete Verschachtelungs-/Enter-Maschinerie real grün ist
   (Absicherung gegen die alte, falsche „alles ROT"-Annahme). Parallel die bestätigten
   Bugs bewusst rot schreiben (C2–C9, DL3–DL5, RD3, RD5, RO1–RO4, L4–L6, L11–L14,
   L20–L27, L29, L42).
2. Nach Schema-Erweiterung (`numberingMode`, CSS-Ebenenregeln): C12–C13 (Grundlage),
   L12-CSS-Teil.
3. Nach `toggleList`-Neuimplementierung + `isListActive`: C2–C6, L3–L6, L20–L22.
4. Nach Tab/Shift-Tab: C7–C9, L11–L16, L18, L43, L69 (Editor-Erzeugungsweg).
5. Nach DOCX-Writer-Umbau (`NumberingRegistry`, `start`/`continue`): DL3, DL4, L24, L70(Teil).
6. Nach DOCX-Reader-Umbau (Startwert lesen, Tabellenzellen-Fix, Fortsetzen): DL5, RD3–RD5,
   FD4, FD5, L29, L56, L51/L55.
7. DOCX-Rundreise (2.2/2.5) inkl. realer Fixtures grün ziehen.
8. Nach ODT-Writer/Reader-Umbau (`ListStyleRegistry`, 9 Ebenen, `styles.xml`-Merge,
   `list-header`, `start`/`continue`): OL2, RO1–RO4, FO8–FO11, L64–L67.
9. ODT-Rundreise grün ziehen, inkl. Fixtures (FO1–FO12, L57–L68).
10. Nach Fortsetzen/Neustart-UI (`ListNumberingMenu`, `listNumbering.ts`): L23–L27,
    C12–C13 vollständig.
11. Gesamte E2E-Suite `tests/e2e/lists.spec.ts`, inkl. L34/L35 und
    `selection-regression.spec.ts` erneut.
12. L70–L72 (unabhängige Validierung) zuletzt, gegen die finale, alle Fälle vereinende
    Testdatei.
13. Traceability (Abschnitt 4) und DoD (Abschnitt 8) final gegenprüfen, bevor der
    Backlog-Status auf „verifiziert" geändert wird.

---

## 7. Bekannte Automatisierungsgrenzen / offene Punkte für QA

1. **L42 (zwei getrennte Listen ohne Trenner) und L14 (Shift+Tab auf oberster Ebene)**
   hängen von einer noch zu treffenden UI-Konvention ab, *wie* man im Editor überhaupt
   zwei benachbarte, aber getrennt gemeinte Listen erzeugt bzw. wie Shift+Tab auf oberster
   Ebene reagiert — Bedienweg vor Testimplementierung mit dem Entwicklerplan
   (`nummerierte-liste-code.md` §6.3) abstimmen.
2. **L45 (Paste aus externer Quelle) und L49 (Performance)** können je nach Playwright-/
   Browser-Version instabil sein. Die Chromium-Projekte haben `clipboard-read`/`-write`-
   Permissions (Abschnitt 1) — L45 nutzt echte Zwischenablage; Fallback nur, falls die
   Permission in einem Projekt fehlt: `execCommand('insertHTML')`. L49 misst statt harter
   Zeitgrenze (D6).
3. **L50 (Seitenumbruch)** ist von `seitenumbruch-req.md` abhängig — ist jenes Feature
   noch nicht verifiziert, wird L50 als `test.skip(...)` mit Verweis auf den Backlog-Slug
   geführt, nicht stillschweigend weggelassen (D9-konform).
4. **L72 (externe Validierung, `python-docx`/ODF-Validator)** erfordert eine Python-/ODF-
   Toolchain außerhalb der Node/Vitest/Playwright-Umgebung — bewusst als manueller/CI-
   separater Schritt, kein Bestandteil von `npm test`/`npm run test:e2e`, aber
   Pflichtnachweis vor endgültiger Abnahme (Testfall 11/12).
5. **OL3/OL5/FO1–FO7/FD2–FD3** (ODT-Adjazenz, ODT-Zelle, diverse Fixtures) sind bewusst
   „zu verifizieren" statt vorab ROT/GRÜN, weil `nummerierte-liste-code.md` sich zu diesen
   konkreten Fällen nicht abschließend äußert — Ergebnis beim ersten Lauf ermitteln und in
   dieser Tabelle sowie in `nummerierte-liste-code.md` nachtragen.
6. **Locator für die noch nicht existierende Fortsetzen/Neustart-UI (Abschnitt 3.7)** sind
   Platzhalter nach dem Entwurf in `nummerierte-liste-code.md` §2.4 — bei abweichender
   tatsächlicher Umsetzung sind L23–L27 an die realen `aria-label`/Texte anzupassen, ohne
   die geprüfte Verhaltenslogik zu ändern.
7. **`brokenList.odt`** ist unter Vitest/jsdom via `SKIP_SLOW_UNDER_JSDOM` ausgeschlossen
   (`odt/…/external-fixtures.test.ts`) — seine inhaltliche Listen-Prüfung läuft nur über
   E2E (L62), nicht im Unit-Lauf. Nicht versehentlich als „im Unit-Test abgedeckt" führen.

---

## 8. Abgleich mit Definition of Done (`nummerierte-liste-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| Jeder Punkt aus §2 über echte Bedienung im Browser nachgewiesen | Abschnitt 3 komplett (L1–L72), Traceability Abschnitt 4 |
| Jeder Grenzfall aus §3 (1–20) hat einen dauerhaften Testfall | Abschnitt 3.11 (L38–L52) + RO5/DL6/OL3 für 3.15/3.17/3.18/3.20 |
| Rundreise §4 für beide Formate und alle Fixtures mit inhaltlichen Assertions | Abschnitt 2.2/2.3/2.5 (Unit) + 3.12/3.14 (E2E), Fixture-Inventar vollständig gegen §4.2 abgeglichen (auf Platte verifiziert) |
| Zu jedem Ist-Stand-Punkt aus §5 (Anforderung) / §1 (Code-Doc) ein eindeutiges Ergebnis | Abschnitt 0 (erneut direkt verifizierte Gegenkontrolle) + Abschnitt 5 (Status je Testfall) — jeder Punkt trägt „bestätigt ROT" / „erwartet GRÜN, Test fehlt" / „bekannte Grenze" / „zu verifizieren", keiner bleibt unbenannt. **Insbesondere** DoD-Pflichtpunkte: Liste-in-DOCX-Zelle (DL5/RD5/L29), Startwert (DL3/OL2/RD3/RO3/L24), ODT-Stilauflösung (RO2/FO8/FO9/L64/L65), `list-header` (RO1/FO10/FO11/L66/L67), kein echtes Toggle (C2–C4/L20–L22) |
| Kein Punkt führt zu stillem Fehlschlag | C13, L25 (deaktivierte „fortsetzen"-Option mit Begründung), L20 (echtes Toggle statt No-Op) — explizit als Testfälle, nicht nur als Nebenbemerkung |

Der Backlog-Status „nummerierte-liste" darf laut Anforderung §7 erst dann auf
„verifiziert" gesetzt werden, wenn jeder als **ROT** oder **erwartet GRÜN (Test fehlt)**
geführte Fall durch einen tatsächlichen, dokumentierten Testlauf (nicht durch Code-Review)
belegt grün ist und jede „bekannte Grenze" bewusst als solche dokumentiert wurde.
