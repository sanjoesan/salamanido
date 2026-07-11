# Anforderung: Ausrichtung links

Status: **vorhanden laut Backlog — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen
die die Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird,
bevor der Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 2.3 „Absatzformatierung", Zeile 112 —
Slug `ausrichtung-links`, Titel „Ausrichtung links", Beschreibung „Richtet den Absatz
linksbündig aus.", Status „vorhanden", Priorität 1 (essenziell/fundamental).

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 4
„Absatzformatierung") sowie an den Schwesterdateien `specs/ausrichtung-zentriert-req.md`,
`specs/ausrichtung-rechts-req.md`, `specs/ausrichtung-blocksatz-req.md`, `specs/fett-req.md`
und `specs/unterstrichen-einfach-req.md`: Anforderung in Fließtext/Listen je Aspekt, danach
nummerierte Testfälle, Fokus auf **beide** Formate (DOCX und ODT) sowie auf die Rundreise
(Upload unverändert → Export → Re-Import erhält Inhalt).

> **Korrektur-/Verifikationshinweis (wichtig).** Eine frühere Fassung dieser Datei
> enthielt (a) durchgehend veraltete Code-Zeilennummern (sie verwiesen auf einen
> älteren Stand: z. B. `AlignButton` bei `Toolbar.tsx:64-84` — dort steht heute
> `MarkButton`) und (b) die faktisch **falsche** Aussage „keine E2E-Tests decken
> Ausrichtung überhaupt ab". Genau diese Art ungeprüfter Einzelpass-Behauptung ist der
> Grund, warum das Feature als „nicht vertrauenswürdig" gilt. Für die vorliegende
> Fassung wurde **jede** Code- und Testreferenz am aktuellen Arbeitsstand des Repos
> (`sanjoesan/salamanido`) frisch nachgeprüft. Verbindlicher Anker ist immer der
> **Symbolname** (Funktion/Konstante/Testtitel); die zusätzlich angegebene Zeilennummer
> ist eine Momentaufnahme und im Zweifel gegen das Symbol zu prüfen, nicht umgekehrt.
>
> **Nachgeführt in dieser Fassung (Re-Verifikation gegen den Working Tree nach dem
> „Ausschneiden"-Feature).** Der zwischenzeitlich in `WordEditor.tsx` eingefügte
> `Shift-Delete`-/Cut-Pfad hat die dortige Keymap um ~8 Zeilen nach unten verschoben.
> Alle `WordEditor.tsx`-Zeilenangaben sind daher **neu gesetzt**: Keymap `85–107`
> (vorher zitiert `77–99`), `Mod-b/i/u` `98–100` (vorher `90–92`), `dispatchTransaction`
> `125–133` (vorher `117–124`), `onChange`-Aufruf `128–130` (vorher `120–122`),
> `mouseup`-Handler `146–155` (vorher `138–145`). `reconcileSelectionOnClick` (`43`) und
> **alle** Anker in `schema.ts`, `commands.ts`, `Toolbar.tsx`, `docx/reader.ts`+`writer.ts`,
> `odt/reader.ts`+`writer.ts`+`styleRegistry.ts` wurden erneut geprüft und sind **unverändert
> korrekt**. Genau dieses erneute Nachziehen (statt „sieht plausibel aus, übernehme ich")
> ist die im Kasten oben geforderte Disziplin.
>
> **Erneut re-verifiziert am 2026-07-05 (Working Tree nach den Cut-Stabilisierungs-Commits
> `db61c89`/`175d86d`/`29cbc80`/`0797d13`, die *nach* der ersten Cut-Implementierung landeten).**
> Diese Folge-Commits betrafen nur Test-Flakiness, Clipboard-Permissions und einen
> CI-Skip — **keine** Produktivdatei aus der Referenztabelle. Direkt gegen den aktuellen
> Stand nachgeprüft und **alle** hier zitierten Anker weiterhin korrekt: `commands.ts`
> `setAlign` `13–27` (`nodesBetween` `17`, `dispatch` in der Schleife `21`), `isAlignActive`
> `29–38` (`=== align` `34`), `setHeading` `40–55` (`align:'left'` `43`, `sameParent`-Guard
> `45`), `type Align`/`alignableTypes` `8`/`10`; `schema.ts` `alignAttr` `4`,
> `paragraph`/`heading` `parseDOM.getAttrs` `20`/`33`, `toDOM` `21–23`/`35–37`;
> `Toolbar.tsx` `AlignButton` `91–111` (`title` `96`, `aria-pressed` `97`, `onMouseDown`
> `98–99`, `run(setAlign)` `100`, weiterhin **kein** `aria-label`), Instanzen `234–237`,
> `MarkButton` `55–89` (`aria-label` `74`), `run`/`view.focus()` `28–31`/`30`; `WordEditor.tsx`
> Keymap `85–107`, `dispatchTransaction` `125–133`, `reconcileSelectionOnClick` `43`;
> `docx/reader.ts` `JC_TO_ALIGN` `14` (Konsum `240`), `docx/writer.ts` `JC_BY_ALIGN` `18` /
> `paragraphPropsXml` `69–72`; `odt/reader.ts` `parseAutomaticStyles` `37–78`,
> `odt/styleRegistry.ts` `PARAGRAPH_ALIGN_STYLE_NAME` `61` / `headingStyleName` `80`,
> `odt/writer.ts` `89`/`97`; E2E `tests/e2e/roundtrip-fidelity.spec.ts` „Criterion 4"
> `56–58` (Re-Verify `129`/`179`/`243`). **Keine** Referenz war zu korrigieren — was zeigt,
> dass die vorherige Fassung diesmal sauber gearbeitet hat, und was den Anker-vor-Zeile-Grundsatz
> bestätigt (die Symbolnamen hätten auch bei einer Verschiebung getragen).
>
> **Unabhängige Vierte Re-Verifikation (2026-07-05, PO-Rolle, gegen denselben Working Tree
> nach `29cbc80`).** Statt die vorherigen Prüfvermerke zu übernehmen, wurden **alle** Anker
> dieser Datei erneut direkt am Quellcode nachgezählt (nicht nur überflogen): `schema.ts`
> `alignAttr` Z. 4, `paragraph`/`heading` `getAttrs`/`toDOM` Z. 20–24/31–38 — exakt bestätigt.
> `commands.ts` (vollständig gelesen, Z. 1–168): `setAlign` Z. 13–27 **enthält weiterhin** den
> in `specs/ausrichtung-links-code.md` Abschnitt 3.1 durch Ausführung nachgewiesenen Bug
> unverändert (`dispatch(state.tr.setNodeAttribute(...))` **innerhalb** der
> `nodesBetween`-Callback-Schleife, Z. 20–22 — noch **nicht** auf die dort vorgeschlagene
> Ein-Transaktion-Fassung umgestellt); `isAlignActive` Z. 29–38, `setHeading` Z. 40–55 (`align:
> 'left'` Z. 43) ebenfalls unverändert. `Toolbar.tsx` Z. 85–112 und Z. 228–238 sowie
> `WordEditor.tsx` Z. 80–154 (Keymap, `dispatchTransaction` Z. 125–133, `onMouseUp` Z. 146–153)
> Zeile für Zeile gegengelesen — **alle** zitierten Zeilen treffen exakt zu. `docx/reader.ts`
> Z. 1–20 und Z. 225–280 sowie `docx/writer.ts` Z. 1–80 gelesen: `JC_TO_ALIGN` Z. 14,
> `paragraphToBlocks`/`jc`-Auswertung Z. 229–280/238–240, `emptyParagraph` Z. 225,
> `JC_BY_ALIGN` Z. 18, `paragraphPropsXml` Z. 69–72 — exakt bestätigt. `odt/reader.ts`
> `parseAutomaticStyles` Z. 37–78 (`fo:text-align` ungeprüft in die Map, Z. 65–66) und
> `odt/styleRegistry.ts`/`odt/writer.ts` (`PARAGRAPH_ALIGN_STYLE_NAME` Z. 61–66,
> `paragraphAlignStyleDefs` Z. 68–75, `headingStyleName` Z. 80–82, `headingStyleDefs` Z. 84–93,
> Writer-Konsum Z. 89/97) ebenso exakt bestätigt. **Zusätzlich neu geprüft in dieser Fassung**
> (über reine Zeilenkontrolle hinaus): (a) `docx/__tests__/roundtrip.test.ts` — Heading-Align-Test
> tatsächlich Z. 47–51, `it.each(['left','center','right','justify'])` tatsächlich Z. 54–59;
> `odt/__tests__/roundtrip.test.ts` analog Z. 49–53/56–61 — **beide auf die Zeile genau**, keine
> Korrektur nötig. (b) Alle 14 in Abschnitt 5 zitierten externen Testdateien
> (`bug-paragraph-alignment.docx`, `emptyPPr.docx`, `table-alignment.docx`,
> `TestTableCellAlign.docx`, `heading123.docx`, `Styles.docx`, `rtl.docx`,
> `CharacterParagraphFormat.odt`, `feature_attributes_paragraph_MSO2013.odt`,
> `tabelleAlignMargin.odt`, `paragraphWithPageStyle.odt`, `indentTest.odt`, `EasyList.odt`,
> `FruitDepot-SeasonalFruits4.odt`) per Dateisystem-Check auf tatsächliches Vorhandensein unter
> `tests/fixtures/external/{docx,odt}/` geprüft — **alle vorhanden**, keine Phantom-Referenz.
> (c) `specs/FEATURE-BACKLOG.md` Zeile 112 direkt eingesehen — Slug, Titel, Beschreibung, Status
> „vorhanden", Priorität 1 exakt wie in der Kopfzeile dieser Datei zitiert. **Ergebnis dieser
> vierten Prüfrunde: keine einzige Korrektur nötig** — weder an Symbolen noch an Zeilen noch an
> Fixture-Referenzen. Das ist selbst ein Datenpunkt: Der in R4/Abschnitt 3.1 des begleitenden
> `ausrichtung-links-code.md` beschriebene `RangeError`-Bug in `setAlign` ist **zum Zeitpunkt
> dieser Prüfung nach wie vor nicht behoben** (reiner Anforderungs-/Analyse-Stand, kein
> Implementierungsstand) — Abnahmekriterium 10 in Abschnitt 9 bleibt entsprechend offen, bis ein
> Dev-Durchlauf den dort skizzierten Fix tatsächlich einspielt.
>
> **Fünfte, unabhängige PO-Re-Verifikation (2026-07-05, gegen denselben Working Tree nach
> `29cbc80`).** Statt die vierte Prüfrunde ungeprüft zu übernehmen, wurden in dieser Runde alle
> in dieser Datei zitierten Quelldateien erneut **direkt geöffnet und Zeile für Zeile
> gegengelesen** (nicht nur überflogen): `schema.ts` (Z. 1–45), `commands.ts` (vollständig),
> `Toolbar.tsx` (vollständig), `WordEditor.tsx` (vollständig), `docx/reader.ts`
> (Z. 1–20, 220–281), `docx/writer.ts` (Z. 1–75), `odt/reader.ts` (Z. 30–79, 170–185, 253–262),
> `odt/styleRegistry.ts` (Z. 55–93), `odt/writer.ts` (Z. 80–99), `docx/__tests__/roundtrip.test.ts`
> und `odt/__tests__/roundtrip.test.ts` (Ausrichtungs-Describe-Blöcke), `tests/e2e/roundtrip-fidelity.spec.ts`
> (alle drei „Criterion 4"/„Re-verify criterion 4"-Stellen), sowie ein direkter
> Dateisystem-Check aller 14 in Abschnitt 5 zitierten externen Fixtures. **Ergebnis: alle
> Symbol- und Zeilenangaben dieser Datei treffen exakt zu, keine einzige Korrektur nötig** —
> inklusive der feingranularen Zeilen in Abschnitt 2/3 (`schema.ts:4/20-23/33-37`,
> `commands.ts:13-27/29-38/40-55`, `Toolbar.tsx:28-31/55-89/91-111/234-237`,
> `WordEditor.tsx:85-107/125-133/146-153`). Zusätzlich in `src/formats/shared/editor/__tests__/commands.test.ts`
> nach `setAlign`/`isAlignActive`/`align` gesucht — **kein Treffer**, was die in Abschnitt 6.2
> behauptete Testlücke bestätigt (kein bloßes Versäumnis der Recherche).
>
> **Ein genuiner, bis dahin nicht dokumentierter Befund dieser Runde:** `AlignButton`
> (`Toolbar.tsx:91-111`) bindet ausschließlich `onMouseDown` (Z. 98–99) und besitzt **kein**
> `onClick`/`onKeyDown` — ein per Tab fokussierter Button feuert bei Enter/Leertaste zwar ein
> synthetisches `click`-Event, das hier aber ins Leere läuft. Das ist eine von der bereits
> dokumentierten fehlenden Tastenkombination (Zeile 4/R7) **unabhängige** Lücke: selbst mit
> Strg+L nachgerüstet bliebe der Button selbst für Tastaturnutzer:innen ohne Maus unerreichbar.
> Neu aufgenommen als Zeile 9 in Abschnitt 2, Grenzfall 4.17, Risiko R11, Testfall 6.4-17 und
> DoD-Punkt 8. Genau das ist der in dieser Datei wiederholt geforderte Verifikationsstandard:
> nicht nur bestehende Behauptungen nachzählen, sondern aktiv nach nicht erfassten Lücken suchen.
>
> **Sechste, unabhängige PO-Re-Verifikation (2026-07-05, gegen den Working Tree nach den beiden
> seit der fünften Runde neu hinzugekommenen Commits `d65cde0` „Implement Kopieren (copy) …" und
> `c9eb367` „Install Firefox in CI …").** Beide Commits wurden gezielt daraufhin geprüft, ob sie
> eine der hier zitierten Dateien/Zeilen verschoben haben — **keine** der beiden betrifft
> `schema.ts`, `commands.ts`, `Toolbar.tsx` oder die für Ausrichtung relevanten Abschnitte von
> `WordEditor.tsx` inhaltlich; `commands.ts` und `schema.ts` haben durch die Kopieren-Arbeit zwar
> neue Funktionen/Kommentare am Dateiende bzw. bei `hard_break` erhalten, aber **keine** Zeile vor
> ihrem jeweiligen Ende wurde verschoben. Um das nicht nur zu behaupten, sondern zu belegen, wurden
> in dieser Runde **erneut alle** Kernzitate direkt am Quellcode nachgezählt: `schema.ts:4/20-23/33-37`,
> `commands.ts:13-27/29-38/40-55`, `Toolbar.tsx:91-111/234-237/55-89/28-31`, `WordEditor.tsx:85-107/125-133/146-155/43-50`,
> `docx/reader.ts:14/224-226/229-280/238-240`, `docx/writer.ts:18/69-72/113-123`, `odt/reader.ts:37-78/178/259`,
> `odt/styleRegistry.ts:61-93`, `odt/writer.ts` (`PARAGRAPH_ALIGN_STYLE_NAME`/`headingStyleName`-Konsum),
> `docx/__tests__/roundtrip.test.ts:47-59`, `odt/__tests__/roundtrip.test.ts:49-61`, sowie alle 14 externen
> Fixtures (Dateisystem-Check) und `specs/FEATURE-BACKLOG.md` Zeile 112 (Slug/Titel/Beschreibung/Status/
> Priorität exakt wie zitiert) — **alle exakt bestätigt, keine Korrektur nötig.** Zusätzlich in
> `src/formats/shared/editor/__tests__/commands.test.ts` erneut nach `setAlign`/`isAlignActive`/`align`
> gesucht — weiterhin **kein Treffer** (bestätigt Abschnitt 6.2). Zwei genuine Zusatzbefunde dieser Runde,
> die über reine Bestätigung hinausgehen:
> 1. Der neue, in `9f8fa03`/`d65cde0` hinzugekommene „Ausschneiden"-Toolbar-Button (`Toolbar.tsx:143-156`)
>    zeigt **denselben** Defekt wie Risiko R11: Er registriert ausschließlich `onMouseDown` (Z. 148), **kein**
>    `onClick`/`onKeyDown` — per Tab erreichbar, aber mit Enter/Leertaste nicht auslösbar. Das bestätigt, dass
>    R11 kein auf `AlignButton`/`MarkButton` beschränkter Altlast-Fund ist, sondern ein **durchgängiges Muster
>    der gesamten Toolbar**, das auch in zeitlich nach dieser Anforderung entstandenem Code unverändert
>    fortgeschrieben wurde — relevant für die Priorisierung eines etwaigen Fixes (Abschnitt 7, R11).
> 2. Derselbe neue Button hat, anders als `AlignButton`, sehr wohl ein `aria-label="Ausschneiden"`
>    (`Toolbar.tsx:146`) — ein weiterer, jüngerer Beleg dafür, dass das Fehlen von `aria-label` bei
>    `AlignButton` (Risiko R8) kein durchgängiger Toolbar-Standard ist, sondern eine tatsächliche,
>    isoliert behebbare Inkonsistenz gerade dieser vier Buttons.
> Praktischer Hinweis für die anstehende QA-Umsetzung von Testfall 6.4-2 (echter Klick auf „Links"):
> Die aktuellen Playwright-Projekte (`playwright.config.ts`) heißen `Desktop Chrome`, `Mobile`, `Tablet`,
> `Desktop Safari (Clipboard)` und `Desktop Firefox (Clipboard)` — der neue `AlignButton`-Klicktest
> braucht keine Zwischenablage-Rechte und sollte daher primär in `Desktop Chrome` (+ `Mobile`/`Tablet`
> für Grenzfall 8.5 „Editor auf Tablet/Mobile-Viewport") laufen; ein Cross-Browser-Nachweis in den
> beiden `(Clipboard)`-Projekten ist optional, aber sinnvoll, weil `onMouseDown`-basierte Handler
> (siehe R11) browserabhängig unterschiedlich mit Fokus/Selektion interagieren können.

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen — Code-Vorhandensein wurde bisher mit „funktioniert"
verwechselt, das ist ja der Grund für diese Anforderung):

| Ebene | Fundstelle (Symbol @ aktuelle Zeile) | Befund |
|---|---|---|
| Schema (Knoten-Attribut, **nicht** Mark) | `src/formats/shared/schema.ts` → `alignAttr` (Z. 4) | `const alignAttr = { align: { default: 'left', validate: 'string' } }`, gestreut auf den Knoten `paragraph` (Z. 16–24) **und** `heading` (Z. 26–38). Default bereits `'left'`. |
| Editor-Rendering | `schema.ts` → `paragraph.toDOM` (Z. 21–23), `heading.toDOM` (Z. 35–37) | Schreibt `style="text-align: ${node.attrs.align}"` direkt auf `<p>` bzw. `<h1>`–`<h6>`. |
| HTML-Import (Paste/DOM-Parsing) | `schema.ts` → `paragraph.parseDOM.getAttrs` (Z. 20), `heading.parseDOM.getAttrs` (Z. 33) | Liest `(dom as HTMLElement).style.textAlign`, Fallback `'left'` wenn nicht gesetzt. |
| Befehl „Setzen" | `src/formats/shared/editor/commands.ts` → `setAlign` (Z. 13–27), `alignableTypes` (Z. 10), `type Align` (Z. 8) | Iteriert **alle** Knoten vom Typ `paragraph`/`heading` zwischen `selection.from` und `.to` via `state.doc.nodesBetween` (Z. 17) und ruft je Treffer **einzeln** `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` (Z. 21). **Kein Toggle**, reines Setzen. Rückgabe `applicable` (Z. 25): `false`, wenn kein alignierbarer Knoten im Bereich lag. |
| Aktiv-Zustand-Prüfung | `commands.ts` → `isAlignActive` (Z. 29–38) | Läuft vom `$from`-Knoten (Selektions**anfang**) nach oben bis zum nächsten alignierbaren Vorfahren und vergleicht `node.attrs.align === align` (Z. 34). Bezieht sich **nur** auf `$from`, nicht auf die gesamte Selektion. |
| Formatvorlagen-Wechsel (Standard ↔ Überschrift) | `commands.ts` → `setHeading` (Z. 40–55) | Z. 43: `attrs = level === null ? undefined : { level, align: 'left' }`. Wechsel **zu** Überschrift setzt hart `align:'left'`; Wechsel **zu** Standard setzt `attrs=undefined` ⇒ ProseMirror nimmt den Schema-Default `'left'`. **Beide Richtungen setzen „links" als Nebeneffekt**, unabhängig vom „Links"-Button. Zusätzlich Z. 45: `if (!$from.sameParent($to)) return false` — wirkt nur, wenn die Selektion in **einem** Block liegt (Formatwechsel ist keine Mehrabsatz-Operation). |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx` → `AlignButton` (Z. 91–111), Instanz `align="left" label="⇤"` (Z. 234) | `title={`Ausrichtung: ${align}`}` (Z. 96) ⇒ Tooltip-Text ist wörtlich „Ausrichtung: left" (interner Bezeichner, **nicht** lokalisiert). `aria-pressed={active}` (Z. 97). **Kein** `aria-label` — anders als `MarkButton` (Z. 55–89), das zusätzlich `aria-label={title}` setzt (Z. 74). `onMouseDown` mit `e.preventDefault()` (Z. 98–99), dann `run(view, setAlign('left'))` (Z. 100). **Kein** `onClick`/`onKeyDown` — per Tab fokussiert und mit Enter/Leertaste bedient, löst der Button **nichts** aus (siehe Zeile 9 in Abschnitt 2, Grenzfall 4.17, Risiko R11). |
| Fokus nach Klick | `Toolbar.tsx` → `run` (Z. 28–31) | `run` führt das Command aus und ruft danach `view.focus()` — der Editor soll nach dem Toolbar-Klick fokussiert bleiben. |
| Tastenkombination | `src/formats/shared/editor/WordEditor.tsx` → Keymap (Z. 85–107) | Gebunden sind u. a. `Mod-b/i/u` (Z. 98–100), `Mod-z/y` (Z. 93–95), `Enter`/`Shift-Enter` (Z. 96–97), `Shift-Delete` (Z. 106). **Kein** Kürzel für irgendeine der vier Ausrichtungen (Word/LibreOffice: üblich Strg+L/E/R/J). |
| Transaktions-/onChange-Verhalten | `WordEditor.tsx` → `dispatchTransaction` (Z. 125–133) | Ruft `onChange` bei **jeder** `tr.docChanged`-Transaktion (Z. 128–130) und wendet zuvor `view.state.apply(tr)` gegen den **bereits aktualisierten** `view.state` an. Da `setAlign` je Absatz eine eigene, aus dem **ursprünglichen** `state` abgeleitete Transaktion dispatcht, löst ein einziger Klick bei Mehrfach-Selektion **mehrere** `onChange`-Aufrufe (und ggf. mehrere Undo-Schritte) aus — siehe Grenzfall 4.13 / Risiko R4. **Verschärfung dieses Punkts (siehe Kasten oben):** genau diese Konstellation (zweite Transaktion trägt `tr.before` = Original-Doc, `view.state.doc` ist aber schon geändert) ist der Verdacht auf einen **harten Abbruch** bei ≥ 2 Blöcken — als Pflicht-Testfall zu prüfen, nicht nur als „Undo-Granularität". |
| Selection-Sync-Fix | `WordEditor.tsx` → `reconcileSelectionOnClick` (Z. 43–50) + `mouseup`-Handler (`onMouseUp` Z. 146–155, ruft `reconcileSelectionOnClick` Z. 152) | Der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 beschriebene Fix (Klick-Neupositionierung nach Toolbar-Aktion). Relevant für Grenzfall 4.14. |
| DOCX-Import | `src/formats/docx/reader.ts` → `JC_TO_ALIGN` (Z. 14), `paragraphToBlocks` (Z. 229 ff.) | `JC_TO_ALIGN = { left, center, right, both→justify }`. Liest `<w:jc w:val="…"/>` aus `w:pPr` (Z. 238–239, Fallback `'left'`), dann `align = JC_TO_ALIGN[jcVal] ?? 'left'` (Z. 240). **`w:pStyle` wird zwar gelesen (Z. 236–237), aber nur für die Überschriften-Ebene** (`headingLevelForStyle`, Z. 241) — **nicht** für stilvererbte Ausrichtung. Emit Absatz/Überschrift Z. 253–254; `emptyParagraph()` (Z. 224–226) ⇒ `align:'left'`. |
| DOCX-Export | `src/formats/docx/writer.ts` → `JC_BY_ALIGN` (Z. 18), `paragraphPropsXml` (Z. 69–72) | `JC_BY_ALIGN = { left, center, right, justify→both }`. `paragraphPropsXml` schreibt **immer** `<w:jc w:val="${jc}"/>` (Z. 71, `jc = JC_BY_ALIGN[align] ?? 'left'`, Z. 70) — auch bei „left", das Element wird **nicht** weggelassen. Absatz Z. 113/117, Überschrift Z. 121/123, jeweils `align = (node.attrs?.align) ?? 'left'`. |
| ODT-Import | `src/formats/odt/reader.ts` → `parseAutomaticStyles` (Z. 37–78) | Liest `fo:text-align` aus `style:paragraph-properties` eines `style:style` mit `style:family="paragraph"` **nur innerhalb von `office:automatic-styles`** (Z. 63–66) in die Map `paragraphAligns`. Absatz-Align: `(styleName && styles.paragraphAligns.get(styleName)) || 'left'` (Z. 177–178), Überschrift analog (Z. 258–259). **Keine** Normalisierung von `start`/`end` auf `left`/`right`; **keine** Auswertung von `office:styles` (benannte Vorlagen) oder `style:parent-style-name`-Vererbung. |
| ODT-Export | `src/formats/odt/styleRegistry.ts` → `PARAGRAPH_ALIGN_STYLE_NAME` (Z. 61–66), `paragraphAlignStyleDefs` (Z. 68–75); `src/formats/odt/writer.ts` (Z. 88–91) | Vier feste Automatikstile (`Ppara-left/center/right/justify`, je `fo:text-align`, `style:parent-style-name="Standard"`). Writer: `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left` (Z. 89) ⇒ unbekannte Align-Werte (z. B. importiertes `start`) fallen beim Export auf „left" zurück. |
| ODT-Export Überschriften | `styleRegistry.ts` → `headingStyleName` (Z. 80–82), `headingStyleDefs` (Z. 84–93); `writer.ts` (Z. 95–97) | Pro Ebene (1–6) **und** pro der vier Ausrichtungen ein eigener Stil `Heading{level}-{align}`. |
| Unit-Tests (Rundreise, konstruierte Daten) | `src/formats/docx/__tests__/roundtrip.test.ts` (Z. 47–59), `src/formats/odt/__tests__/roundtrip.test.ts` (Z. 49–60) | `it.each(['left','center','right','justify'])('preserves "%s" alignment', …)` (DOCX Z. 54–59, ODT Z. 56–60) **inkl. `left`** + je ein Heading-Align-Test mit `center`. Prüfen **ausschließlich** Writer→eigener Reader mit direkt konstruiertem ProseMirror-JSON — nie über die UI, nie in Tabellen/Listen, nie über einen Formatvorlagen-Wechsel. |
| Unabhängige Export-Validierung (existiert bereits!) | `src/formats/docx/__tests__/external-validation.test.ts` (**mammoth**), `src/formats/odt/__tests__/external-validation.test.ts` (**OASIS ODF 1.3 RelaxNG** via `xmllint-wasm`) | Prüfen den Export gegen **fremde** Implementierungen — aber bisher **nicht** gezielt auf den Ausrichtungswert (siehe Abschnitt 6.3 zur genauen Reichweite). |
| E2E-Abdeckung von Ausrichtung (existiert — entgegen früherer Fassung) | `tests/e2e/roundtrip-fidelity.spec.ts`, „Criterion 4: Absatzausrichtung" (Z. 56–58, wiederholt Z. 129/179/243) | Prüft `text-align: center` an einem rundgereisten Absatz für DOCX→DOCX **und** ODT→ODT (+ Cross-Format-Re-Verify) über echten Datei-Upload/-Download. **Aber:** nur für den Wert `center`, mit konstruierten Reichdokumenten (`buildRichDocx`/`buildRichOdt`), **ohne** je einen `AlignButton` zu klicken. Siehe Abschnitt 6 für die **präzise** Lückenanalyse. |

---

## 1. Ziel

Nutzer:innen können den Cursor-Absatz bzw. jeden Absatz/jede Überschrift innerhalb einer
Selektion linksbündig ausrichten — über die Toolbar (und, sofern ergänzt, über Tastatur) —
konsistent in Editor-Anzeige, DOCX-Export und ODT-Export, und die Ausrichtung bleibt bei
jeder Rundreise (Import → Export, Export → Re-Import, Cross-Format) erhalten.

**Das Besondere an genau diesem Feature (und der Kern der Verifikationsschwierigkeit):**
„links" ist der **Schema-Default** (`schema.ts` `alignAttr`, Z. 4). Daraus folgt:

- Ein neuer, unformatierter Absatz ist bereits linksbündig, **ohne** dass der Button je
  gedrückt wurde. Ein Test, der nur „sieht links aus", beweist **nichts** über den Button.
- Fällt irgendein Import-Pfad auf den Fallback `'left'` zurück (fehlendes/unbekanntes
  Attribut, nicht ausgewertete Stilvererbung), **sieht** das Ergebnis ebenfalls korrekt
  linksbündig aus — kann aber bedeuten, dass eine **andere** Original-Ausrichtung
  stillschweigend verloren ging (siehe Risiko R2). „Links" ist damit zugleich das
  gewünschte Ergebnis **und** die Tarnfarbe für Datenverlust.

Deshalb gilt für die Verifikation von „Ausrichtung links" eine verschärfte Regel:
**Der Nachweis muss immer über den aktiven Rückweg geführt werden** — ein Absatz wird
zuerst nachweislich auf eine andere Ausrichtung (typischerweise „zentriert") gesetzt und
dann per „Links"-Button zurückgesetzt; nur so ist belegt, dass der Button aktiv wirkt und
nicht bloß den ohnehin bestehenden Default anzeigt.

Explizit **nicht** alleiniger Gegenstand dieser Anforderung (eigene Backlog-Einträge,
gleiche Priorität 1, Status ebenfalls „vorhanden"/zu verifizieren, jeweils eigene
Anforderungsdatei): `ausrichtung-zentriert`, `ausrichtung-rechts`, `ausrichtung-blocksatz`.
Da alle vier Ausrichtungen **denselben** Code-Pfad teilen (`setAlign`/`isAlignActive`,
dieselbe Attribut-Definition, dieselben DOCX-/ODT-Mapping-Tabellen), betrifft jeder hier
gefundene Mechanismus-Fehler mit hoher Wahrscheinlichkeit auch die anderen drei — und
umgekehrt. Die Testfälle prüfen deshalb bewusst auch die **Übergänge** von/zu „links".

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (verifiziert, zu bestätigen) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „⇤" (Linksbündig) | Absatzausrichtungs-Gruppe der Toolbar, **erster** von vier Ausrichtungs-Buttons, direkt hinter dem Trenner nach den Farb-Buttons (`Toolbar.tsx:234`) | Vorhanden. `title="Ausrichtung: left"`, `aria-pressed` gebunden an `isAlignActive`, **kein** `aria-label`. Klick via `onMouseDown`+`preventDefault` → `setAlign('left')` | Muss per Maus-Klick (die Selektion darf nicht verloren gehen) die/den alignierbaren Absatz/Überschrift der aktuellen Selektion linksbündig setzen. `title`/`aria-label` sollten konsistent zu den übrigen Buttons lokalisiert werden („Linksbündig ausrichten" statt technischem „Ausrichtung: left") |
| 2 | Icon „⇤" | Toolbar-Button | Unicode-Pfeilsymbol, kein SVG (`Toolbar.tsx:234`) | Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 (Zeile 4) und Abschnitt 20.1 generelles Icon-Rendering-Risiko: muss auf Systemen ohne verlässliche Unicode-Pfeil-Glyphen eindeutig als „Linksbündig" erkennbar bleiben und von `↔`/`⇥`/`≡` unterscheidbar sein. Bevorzugt SVG-Icon |
| 3 | Aktiv-Zustand des Buttons (`aria-pressed`) | Toolbar | `aria-pressed = isAlignActive(state, 'left')` — prüft **nur** den nächsten alignierbaren Vorfahren von `$from`, nicht die gesamte Selektion | Muss anzeigen, ob der Absatz/die Überschrift an der aktuellen Cursor-Position/am Selektionsanfang linksbündig ist; bei Mehrabsatz-Selektion mit gemischter Ausrichtung siehe Grenzfall 4.4 und Risiko R5 |
| 4 | Tastenkombination | — | **Nicht vorhanden** (Keymap `WordEditor.tsx:85-107` bindet kein Ausrichtungskürzel), obwohl Word/LibreOffice Strg+L für linksbündig verwenden | Bewusst entscheiden: gewollt (nicht im Scope) oder fehlende Funktion? Für diese Anforderung als **offener Punkt** dokumentiert (siehe DoD 8.7), nicht stillschweigend übergangen |
| 5 | Fehlendes `aria-label` | Toolbar-Button | `AlignButton` (Z. 91–111) hat nur `title`, kein `aria-label` — im Unterschied zu `MarkButton` (`aria-label={title}`, Z. 74) | Prüfen, ob `title` allein als zugänglicher Name für Screenreader ausreicht, oder ob es eine echte Barrierefreiheits-Lücke ist (siehe Grenzfall 4.16) |
| 6 | Absatzformat-Dropdown (Standard/Überschrift 1–6) | Toolbar, `<select aria-label="Absatzformat">` (`Toolbar.tsx:165-180`), ruft `setHeading` | Formatvorlagen-Wechsel setzt Ausrichtung implizit auf „links" zurück (`commands.ts:43`) und wirkt nur auf **einen** Block (`sameParent`-Guard, Z. 45) | Nebenwirkung dokumentieren und mit Testfall absichern (Grenzfall 4.9 / Risiko R1) — nicht Teil des „Links"-Buttons, aber der naheliegendste Weg, wie „links" **ungewollt/unbemerkt** entsteht |
| 7 | Kontextmenü (Rechtsklick) | — | Kein eigenes Kontextmenü (bewusst, siehe `WordEditor.tsx`-Kommentar zum nativen Menü) | Kein Soll-Bestandteil dieser Anforderung |
| 8 | Lineal-/Tabstopp-Interaktion | — | Nicht vorhanden (Feature `lineal-anzeigen` laut Backlog „fehlt") | Kein Soll-Bestandteil dieser Anforderung |
| 9 | Tastatur-Auslösbarkeit des Buttons selbst (unabhängig von Zeile 4/Strg+L) | Toolbar-Button „⇤" | **Verifiziert, echter Fehler:** `AlignButton` (`Toolbar.tsx:91-111`) registriert **ausschließlich** `onMouseDown` (Z. 98–99), **kein** `onClick`. Ein `<button>` ist zwar per Tab erreichbar (Standard-Fokusreihenfolge) und der Browser feuert bei Enter/Leertaste auf einem fokussierten Button ein synthetisches `click`-Event — aber ohne `onClick`-Handler bewirkt das **nichts**. Ein Tastaturnutzer, der den Button per Tab erreicht und Enter/Leertaste drückt, kann „Links" **überhaupt nicht auslösen** (identischer Defekt bei `MarkButton`, `Toolbar.tsx:76`, dort ebenfalls nur `onMouseDown`). Das ist eine eigenständige Lücke, **verschieden** von Zeile 4 (fehlendes Ctrl+L-Kürzel) und Zeile 5 (fehlendes `aria-label`) — selbst mit Ctrl+L nachgerüstet bliebe der Button selbst per Tab+Enter/Leertaste toter Code | Muss behoben werden (siehe Grenzfall 4.17, Risiko R11): entweder `onClick` zusätzlich zu `onMouseDown` (das dann nur noch `preventDefault()` für den Fokus-/Selektionserhalt übernimmt), oder ein äquivalenter `onKeyDown`-Handler für Enter/Leertaste |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden ohne Selektion (Cursor in einem Absatz)
- Cursor irgendwo in einem Absatz oder einer Überschrift (keine Textselektion nötig, da
  Ausrichtung eine **Block-**, keine Zeicheneigenschaft ist) → Klick auf „Links" → der
  **gesamte umschließende Absatz/die Überschrift** wird linksbündig, unabhängig von der
  genauen Cursor-Position innerhalb des Absatzes.
- Ist der Absatz bereits linksbündig, ändert ein erneuter Klick nichts sichtbar
  (siehe 3.3 — kein Toggle, idempotentes Setzen).

### 3.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften
- **Soll (verbindlich, härtester Kernfall):** Eine Selektion, die zwei oder mehr
  Absätze/Überschriften ganz oder teilweise einschließt, setzt in **einem** Klick
  **alle** betroffenen Blöcke auf linksbündig — **ohne Exception**, ohne Verlust eines
  Blocks, ohne Fokusverlust, und als **eine** mit einem einzigen Strg+Z vollständig
  rückgängig machbare Aktion. Dieser Fall (inkl. „Alles auswählen → Links" auf einem
  Dokument mit > 1 Absatz) ist der zentrale, mit Vorrang zu verifizierende Nachweis;
  ein Feature, das nur an einem einzelnen Block funktioniert, gilt als **nicht** erfüllt.
- Aktueller Code-Pfad: `setAlign` iteriert via `nodesBetween(from, to)` (`commands.ts:17-24`)
  und dispatcht je Treffer **einzeln** — siehe die Verdachtsanalyse weiter unten.
- Ein Absatz gilt bereits als „betroffen", wenn die Selektion auch nur ein einziges
  Zeichen (oder den Absatzübergang) in seinem Bereich berührt — analog zu Word/LibreOffice.
- **Zu verifizieren (Risiko R4):** Erscheint dieser eine Klick als **eine** mit einem
  einzigen Strg+Z rückgängig machbare Aktion, oder — wie die Codeanalyse nahelegt — als
  mehrere Transaktionen (eine `setNodeAttribute`-Transaktion pro Absatz, jede aus dem
  ursprünglichen `state` abgeleitet), was mehrere `onChange`-Aufrufe und möglicherweise
  mehrere Undo-Schritte erzeugt (`dispatchTransaction`, `WordEditor.tsx:128-130`)?
  **Verschärft in dieser Fassung:** Da `dispatchTransaction` (`WordEditor.tsx:125-133`)
  jeden Dispatch sofort per `view.state.apply(tr)`/`view.updateState` einspielt, `setAlign`
  aber jede seiner N Transaktionen aus dem **ursprünglichen** `state` ableitet (`state.tr`,
  `commands.ts:21`), ist der zweite und jeder weitere Dispatch verdächtig auf einen
  **`RangeError: Applying a mismatched transaction`** (Transaktion trägt `tr.before` =
  Original-Doc, `view.state.doc` ist bereits verändert). Das ist **kein** Randdetail,
  sondern würde den in 3.2 geforderten Kernfall („Selektion über mehrere Absätze",
  „Alles auswählen → Links") komplett brechen (erster Absatz gesetzt, Rest verloren,
  Fokus weg). Deshalb Pflicht-Testfall 6.4-4/-13 mit expliziter Exception-Freiheit
  **und** Ergebnisprüfung aller Blöcke — nicht bloß Undo-Zählung.
  **Statusupdate (2026-07-05):** Dieser Verdacht ist **kein Verdacht mehr** — die
  begleitende Entwickler-Analyse (`specs/ausrichtung-links-code.md` Abschnitt 3.1) hat den
  `RangeError: Applying a mismatched transaction` durch **tatsächliche Ausführung** des echten
  `setAlign` gegen eine echte `EditorView` reproduziert (Ergebnis nach dem Crash:
  `['left','center']` — erster Absatz gesetzt, zweiter verloren). Die Anforderung selbst bleibt
  unverändert („darf nicht crashen, alle Blöcke müssen gesetzt werden"); der QA-Testfall ist
  damit aber ein **Regressionsnachweis für einen bestätigten Fehler**, nicht mehr eine offene
  Ja/Nein-Frage, und hat entsprechend höchste Priorität in der Verifikation.

### 3.3 Kein Toggle — reines Setzen (Unterschied zu Zeichenformaten wie Fett)
- Im Unterschied zu Fett/Kursiv/Unterstrichen/Durchgestrichen (echte Marks mit
  Toggle-Semantik) ist Ausrichtung ein **Knoten-Attribut mit genau einem Wert zur Zeit**.
  Es gibt keinen Zustand „keine Ausrichtung"; jeder Absatz/jede Überschrift hat immer
  genau eine von vier Ausrichtungen, defaultmäßig „links".
- Die vier Ausrichtungs-Buttons verhalten sich wie eine Radiogruppe: zu jedem Zeitpunkt
  ist genau **einer** aktiv, nie zwei gleichzeitig und nie keiner.
- Klick auf „Links" bei bereits linksbündigem Absatz macht die Ausrichtung nicht
  „unbestimmt" — es bleibt „links" (idempotent). Um „links" aufzuheben, muss aktiv ein
  anderer Ausrichtungs-Button geklickt werden.
- Das ist explizit zu verifizieren und zu dokumentieren, damit „Ausrichtung links" nicht
  fälschlich nach dem Fett-Muster (Toggle mit Aus-Zustand) getestet wird.

### 3.4 Anzeige des aktiven Zustands
- Steht der Cursor (ohne Selektion) in einem linksbündigen Absatz/einer linksbündigen
  Überschrift, zeigt der „Links"-Button sofort `aria-pressed="true"` — ohne Klick, allein
  durch Cursor-Bewegung.
- Bewegt sich der Cursor in einen anders ausgerichteten Absatz, wechselt der Button
  unmittelbar auf `aria-pressed="false"`.
- Da `isAlignActive` (`commands.ts:29-38`) nur den alignierbaren Vorfahren von `$from`
  prüft: Bei einer Selektion über mehrere Absätze mit **gemischter** Ausrichtung zeigt der
  Button den Zustand **des Absatzes am Selektionsanfang**, nicht einen kombinierten/
  unbestimmten Zustand. Gewünschtes Anzeigeverhalten festlegen (Word/LibreOffice: bei
  gemischter Selektion meist **kein** Button aktiv) und mit Test absichern (Grenzfall 4.4).

### 3.5 „Falsches Links" durch nicht ausgewertete Stilvererbung (zentrale Fehlerquelle)
- Der DOCX-Reader liest die Ausrichtung **ausschließlich** aus dem direkten
  `<w:jc>` am Absatz (`reader.ts:238-240`). Ein `w:pStyle`, der auf eine Formatvorlage in
  `styles.xml` mit eigenem `w:jc` verweist, wird für die Ausrichtung **nicht** ausgewertet
  (`w:pStyle` dient nur der Überschriften-Ebene).
- Der ODT-Reader liest `fo:text-align` **nur** aus `office:automatic-styles`
  (`parseAutomaticStyles`, `reader.ts:37-78`); benannte Vorlagen aus `office:styles` und
  `style:parent-style-name`-Vererbung werden **nicht** aufgelöst.
- Folge: Ein in einer realen Datei über eine **Formatvorlage** (nicht direkt) z. B.
  zentriert gesetzter Absatz wird als `align:'left'` importiert und **sieht linksbündig
  aus**, obwohl das Original zentriert war. Für das Feature „links" ist das der
  gefährlichste Fall, weil der Datenverlust unter der Default-Farbe „links" unsichtbar
  bleibt. Dieses Verhalten ist zu **bestätigen** und als bewusster Grenzfall zu
  dokumentieren **oder** als Fehler zu behandeln (siehe Risiko R2, Grenzfälle 4.10/4.11).

### 3.6 Gültigkeitsbereich: nur Absätze und Überschriften
- Ausrichtung gilt nur für Knoten vom Typ `paragraph` und `heading` (`alignableTypes`,
  `commands.ts:10`). Tabellen als Ganzes und eigenständige Bild-Blöcke besitzen kein
  `align`-Attribut. Absätze **innerhalb** von Listenpunkten und Tabellenzellen sind
  weiterhin `paragraph`-Knoten und damit alignierbar.
- Liegt in der Selektion **kein** alignierbarer Knoten (z. B. Selektion exakt nur auf einem
  eigenständigen Bild-Block), liefert `setAlign` `false` (`applicable` bleibt `false`,
  `commands.ts:16,25`) — die Aktion darf dann sichtbar nichts tun, aber **keinen** Fehler
  werfen.

### 3.7 Zusammenspiel mit Listen
- Absätze in Listenpunkten (`list_item` → `paragraph`) sind alignierbar; „Links" ändert die
  Textausrichtung innerhalb des Punktes, ohne Aufzählungszeichen/Nummerierung oder
  Verschachtelung zu verändern.
- Rundreise muss Ausrichtung **und** Listenzugehörigkeit gemeinsam erhalten (Grenzfall 4.7).

### 3.8 Zusammenspiel mit Tabellenzellen
- Absätze in Tabellenzellen sind alignierbar. Eine `CellSelection` (aus
  `prosemirror-tables`) liefert für `state.selection.from`/`.to` Positionen, die den
  **gesamten Dokumentbereich** zwischen erster und letzter markierter Zelle überspannen —
  inklusive dazwischenliegender, bei rechteckiger (nicht vollzeiliger) Auswahl **nicht**
  markierter Zellen. Da `setAlign` ungeprüft `nodesBetween(from, to)` anwendet
  (`commands.ts:17`, keine `CellSelection`-Sonderbehandlung), ist zu verifizieren, ob dabei
  versehentlich Absätze in nicht ausgewählten Zellen mit-ausgerichtet werden (Grenzfall 4.8,
  Risiko R6) — kein unterstellter Fehler, aber ein konkret zu prüfender Punkt.

### 3.9 Kombination mit Zeichenformaten
- Linksbündige Ausrichtung ist vollständig unabhängig von Zeichen-Marks (Fett, Kursiv,
  Farbe usw.) auf demselben Absatz — das Setzen der Ausrichtung darf keine Marks im
  Absatzinhalt verändern oder entfernen und umgekehrt.

### 3.10 Undo/Redo
- Undo nach einer echten Ausrichtungsänderung (z. B. zentriert → links) macht exakt diesen
  einen Schritt rückgängig (Absatz wird wieder zentriert); Redo stellt „links" wieder her.
- Zu verifizieren: Erzeugt ein Klick auf „Links" bei einem **bereits** linksbündigen Absatz
  trotzdem eine (wirkungslose) Transaktion und damit einen „nutzlosen" Undo-Schritt?
  `setAlign` ruft `setNodeAttribute` unabhängig vom Vorwert auf (`commands.ts:21`) — eine
  wirkungslose, aber vorhandene Transaktion ist wahrscheinlich. Ergebnis dokumentieren
  (Grenzfall 4.2).
- Zusätzlich das Mehrabsatz-/Mehrfach-Transaktions-Verhalten aus 3.2 (Risiko R4).

### 3.11 Copy/Paste von extern
- Beim Einfügen von HTML (`paragraph.parseDOM.getAttrs`, `schema.ts:20`) wird
  `style.textAlign` gelesen, Fallback `'left'`. Extern linksbündiger oder ausrichtungsloser
  Text landet damit als `align:'left'`. Zu prüfen mit echtem Browser-Clipboard (nicht nur
  synthetisch), insbesondere die Abgrenzung „extern zentriert → bleibt zentriert" vs.
  „extern ohne Angabe → wird links".

---

## 4. Grenzfälle

1. **Neuer, unberührter Absatz:** Ist per Default bereits linksbündig (`schema.ts:4`) — ein
   Testfall muss nachweisen, dass dieser Default korrekt greift, **ohne** dass der
   „Links"-Button je gedrückt wurde, und dass `aria-pressed="true"` bereits ohne Klick
   anliegt (Abgrenzung zu einem Bug, bei dem zufällig alles links aussieht, aber kein
   Attribut gesetzt ist).
2. **Klick auf „Links" bei bereits linksbündigem Absatz:** Keine sichtbare Änderung
   (idempotent); verifizieren, ob unnötig ein Undo-Schritt/`onChange` erzeugt wird (3.10).
3. **Wechsel zentriert/rechts/Blocksatz → links und zurück:** Beliebig oft wiederholbar,
   ohne Text- oder Formatierungsverlust; jeder Wechsel einzeln per Undo rückgängig.
4. **Selektion mit gemischter Ausgangsausrichtung** (z. B. Absatz 1 zentriert, Absatz 2
   bereits links) → Klick auf „Links" setzt **beide** auf links; der Button-Zustand **vor**
   dem Klick zeigt nur den Zustand von Absatz 1 (Selektionsanfang). Verifizieren, dass das
   Ergebnis nach dem Klick trotzdem **beide** Absätze erfasst.
5. **Cursor exakt an einer Absatzgrenze** (Ende Absatz 1 / Anfang Absatz 2,
   unterschiedliche Ausrichtung) → eindeutig festlegen und per Test belegen, welcher der
   beiden als „aktueller" für die Button-Anzeige gilt (ProseMirror-Standard: `$from`-
   Traversal nach oben).
6. **Selektion nur auf einem eigenständigen Inline-Element ohne Text** (z. B. ein Bild als
   einziger Inhalt eines Absatzes): Der umschließende Absatz bleibt alignierbar — „Links"
   muss wirken und darf nicht fälschlich `false` liefern, nur weil kein Text markiert ist.
7. **Ausrichtung + Liste kombiniert:** Linksbündiger Text in einem Listenpunkt, danach Liste
   aufheben (`liste-aufheben`) → Ausrichtung bleibt auf dem entstehenden Absatz erhalten
   (keine Rücksetzung durch die Umwandlung).
8. **Ausrichtung über eine Tabellen-Zellgrenze (siehe 3.8):** Rechteckige, nicht vollzeilige
   Zellauswahl über mehrere Spalten/Zeilen → verifizieren, ob `setAlign` nur die tatsächlich
   markierten Zellen erfasst oder (mangels `CellSelection`-Behandlung) dazwischenliegende,
   nicht markierte Zellen mit-ausrichtet. Konkreter Testfall: 3×3-Tabelle, nur mittlere
   Spalte markieren, „Links" anwenden, prüfen, ob Spalte 1 und 3 unverändert bleiben.
9. **Formatvorlagen-Wechsel setzt Ausrichtung implizit zurück:** Ein zentrierter/
   rechtsbündiger/Blocksatz-Absatz wird über das Dropdown zu „Überschrift 1" (oder umgekehrt
   Überschrift → „Standard") → laut `commands.ts:43` wird die Ausrichtung dabei
   **stillschweigend auf „links" zurückgesetzt**. Als bewusstes, dokumentiertes Verhalten
   bestätigen **oder** als Fehler markieren (Risiko R1). Zusätzlich: Der `sameParent`-Guard
   (`commands.ts:45`) bewirkt, dass ein Formatwechsel über eine Mehrabsatz-Selektion gar
   nicht ausgeführt wird — mitdokumentieren.
10. **Reale ODT-Fremddatei mit `fo:text-align="start"`/`end` oder stilvererbter
    Ausrichtung:** Der ODT-Reader übernimmt `fo:text-align` unverändert (keine
    `start`→`left`-Normalisierung) bzw. wertet Vererbung nicht aus. Auswirkung verifizieren
    und dokumentieren:
    - Im Editor (CSS `text-align: start`) sieht der Absatz in einem LTR-Dokument weiter
      linksbündig aus.
    - Der „Links"-Button zeigt **keinen** aktiven Zustand (`isAlignActive` vergleicht strikt
      `=== 'left'`, `commands.ts:34`), obwohl der Absatz optisch linksbündig erscheint —
      potenziell verwirrend.
    - Beim Export fällt der unbekannte Wert `'start'` in beiden Writern auf „left" zurück
      (`writer.ts` DOCX/ODT `?? 'left'`), Inhalt bleibt linksbündig, der interne Attributwert
      wird beim Reimport aber **nicht** auf den kanonischen Wert `'left'` normalisiert.
      Mit echter Testdatei nachstellen (Kandidaten in Abschnitt 5.2).
11. **DOCX-Fremddatei mit `w:jc`-Werten `start`/`end`/`distribute` oder stilvererbter
    Ausrichtung:** `JC_TO_ALIGN` (`reader.ts:14`) kennt nur `left/center/right/both`; jeder
    andere Wert (und stilvererbte Ausrichtung) fällt auf „links" zurück. Verifizieren, ob
    z. B. `w:jc w:val="distribute"` (in Word ein eigener Modus) stillschweigend als „links"
    statt einer sinnvolleren Näherung erscheint — relevant, weil Dokumente dadurch
    fälschlich als „bereits korrekt links" gelten könnten (Risiko R2/R3).
12. **Fehlendes `w:jc` ganz allgemein** (in realen Word-Dateien der Normalfall für
    linksbündige Absätze): Muss korrekt als „links" interpretiert werden
    (`reader.ts:239`, Fallback `?? 'left'` vor dem Mapping; `emptyPPr.docx` als Fixture) —
    Regressionsgefahr, falls die Fallback-Kette künftig verändert wird.
13. **Sehr viele Absätze in einer Selektion (Strg+A über ein langes Dokument), „Links"
    anwenden — härtester Kernfall, mit Vorrang zu prüfen:** Kein Performance-Einbruch,
    **keine JS-Exception** (insbesondere **kein** `RangeError: Applying a mismatched
    transaction`, siehe 3.2 und Risiko R4), alle Absätze tatsächlich betroffen (Stichprobe
    Anfang/Mitte/Ende — es genügt **nicht**, nur den ersten Absatz zu prüfen, weil ein
    Abbruch nach dem ersten Dispatch genau dort noch „korrekt links" aussähe). Verhalten der
    Mehrfach-Transaktionen aus 3.2 beobachten (viele `onChange`-Aufrufe / viele
    Undo-Schritte). Dies ist der alltäglichste denkbare Fall („alles markieren, linksbündig")
    und deshalb der Lackmustest des gesamten Features.
14. **Zusammenspiel mit dem bekannten Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 2): Alles auswählen → „Links" anwenden → per Klick neu positionieren → Enter →
    weitertippen — beide entstehenden Absätze müssen erhalten **und** weiterhin linksbündig
    sein. Da Abschnitt 2 nur „Fett" als Auslöser nennt, prüfen, ob der Bug-Pfad auch mit
    einer Absatzformat-Aktion wie „Links" reproduzierbar ist (der Fix in
    `reconcileSelectionOnClick`, `WordEditor.tsx:43-50`, muss auch hier greifen).
15. **Fokus-Erhalt nach Klick auf den Button:** `AlignButton` nutzt `onMouseDown` +
    `preventDefault` (`Toolbar.tsx:98-99`) und `run` ruft danach `view.focus()`
    (`run`, `Toolbar.tsx:28-31`, `view.focus()` Z. 30) — verifizieren, dass Editor-Fokus und Cursor-Position/Selektion nach
    dem Klick erhalten bleiben (kein Sprung).
16. **Fehlendes `aria-label`:** `AlignButton` hat nur `title`, kein `aria-label` (im
    Unterschied zu `MarkButton`, `Toolbar.tsx:74`). Für Screenreader prüfen, ob `title`
    allein als zugänglicher Name vorgelesen wird oder ob eine echte Barrierefreiheits-Lücke
    besteht.
17. **Button per Tab erreicht, dann Enter/Leertaste gedrückt — löst nichts aus:** `AlignButton`
    (`Toolbar.tsx:91-111`) bindet ausschließlich `onMouseDown` (Z. 98–99); es existiert **kein**
    `onClick` und kein `onKeyDown`. Ein Tastaturnutzer ohne Maus kann „Links" dadurch **auf
    keinem Weg** auslösen — auch nicht, falls Grenzfall/Zeile 4 (Ctrl+L) ungelöst bliebe, denn
    das beträfe nur das Kürzel, nicht den Button selbst. Zu verifizieren: Tab-Reihenfolge
    erreicht den Button (Standard-`<button>`-Fokus, vermutlich ja), Enter **und** Leertaste
    jeweils einzeln geprüft (beide lösen bei einem korrekt verdrahteten `<button>` denselben
    `click` aus, aktuell aber wirkungslos in beiden Fällen). Betrifft identisch `MarkButton`
    (`Toolbar.tsx:76`) und damit potenziell die gesamte Toolbar — hier als Pflicht-Testfall für
    „Links" dokumentiert, weil es das für diese Anforderung zu verifizierende Element ist
    (siehe Risiko R11, DoD 8).

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** Kombination gilt: Datei mit linksbündigem Absatz/linksbündiger Überschrift
hochladen (bzw. im Editor erzeugen, dabei zwecks echtem Nachweis erst zentrieren, dann auf
„Links" zurücksetzen) → unverändert exportieren → erneut importieren → Ausrichtung an exakt
derselben Textstelle weiterhin „links", kein sonstiger Inhaltsverlust.

### 5.1 DOCX
1. **Eigenrundreise, Absatz (aktiver Rückweg):** Absatz eingeben, explizit zentrieren, dann
   per „Links"-Button zurücksetzen, als DOCX exportieren, reimportieren → weiterhin
   linksbündig. Der Test **muss** den Weg über „zentriert → links" nehmen (siehe Abschnitt
   1), nicht bloß den Default prüfen.
2. **Eigenrundreise, Überschrift:** Dieselbe Prüfung für eine Überschrift Ebene 1–6
   (Unit-Basis vorhanden, `roundtrip.test.ts:47-51`; hier zusätzlich per echter
   Toolbar-Bedienung im Browser).
3. **Absatz ohne explizite Formatierung (reiner Default):** Als DOCX exportieren → mit einem
   vom eigenen Reader **unabhängigen** Mittel prüfen, was tatsächlich geschrieben wird
   (`paragraphPropsXml`, `writer.ts:69-72`, schreibt **immer** `<w:jc w:val="left"/>`). Zwei
   sinnvolle Prüfungen: (a) direkter Zugriff auf `word/document.xml` und Vergleich des
   `w:jc`-Werts; (b) die bestehende mammoth-Validierung (`docx/__tests__/external-validation.test.ts`)
   bestätigt Parseierbarkeit/Text/Struktur durch eine Fremdimplementierung. Bestätigen, dass
   das explizite `w:jc w:val="left"` von Word/LibreOffice genauso als „links" gilt wie ein
   fehlendes Element.
4. **Absatz in einem Listenpunkt, linksbündig:** Rundreise erhält Ausrichtung **und**
   Listenzugehörigkeit/-nummerierung gemeinsam (Grenzfall 4.7).
5. **Cross-Format:** ODT mit linksbündigem Text importieren → als DOCX exportieren →
   Ausrichtung bleibt „links".
6. **Reale Fremddatei, direktes/fehlendes `w:jc`:** z. B. `tests/fixtures/external/docx/emptyPPr.docx`
   (leeres `w:pPr`, kein `w:jc` → Fallback-Pfad) sowie `bug-paragraph-alignment.docx`,
   `table-alignment.docx`, `TestTableCellAlign.docx`, `heading123.docx` → alle betroffenen
   Absätze korrekt als „links" erkannt (Grenzfälle 4.11/4.12).
7. **Reale Fremddatei mit `w:jc w:val="start"`/`distribute` oder stilvererbter Ausrichtung**
   (z. B. `Styles.docx`, oder aus neueren Word-/LibreOffice-Exporten) → Ergebnis gemäß
   Grenzfall 4.11 / Risiko R2 dokumentieren, insbesondere ob eine Nicht-links-Ausrichtung
   fälschlich als „links" ankommt.

### 5.2 ODT
1. **Eigenrundreise, Absatz (aktiver Rückweg):** Absatz eingeben, zentrieren, per „Links"
   zurücksetzen, als ODT exportieren, reimportieren → referenziert nach Re-Import wieder
   einen Stil mit `fo:text-align="left"` (`styleRegistry.ts:61-66,68-75`) ⇒ intern
   `align:'left'`.
2. **Eigenrundreise, Überschrift:** Dieselbe Prüfung für Ebene 1–6 (Unit-Basis
   `roundtrip.test.ts:49-52`; Stilname `Heading{level}-left`, `styleRegistry.ts:80-82`).
3. **Zwei linksbündige Textläufe im selben Dokument:** Beide referenzieren denselben Stil
   `Ppara-left` (`paragraphAlignStyleDefs`, `styleRegistry.ts:68-75`) — keine unnötige
   Stil-Duplizierung; Rundreise bestätigt beide als „links".
4. **Absatz in einem Listenpunkt, linksbündig:** Rundreise erhält Ausrichtung und
   Listenzugehörigkeit gemeinsam.
5. **Cross-Format:** DOCX mit linksbündigem Text importieren → als ODT exportieren →
   Ausrichtung bleibt „links". Zusätzlich Export-Struktur gegen das offizielle ODF-1.3-Schema
   prüfen (bestehende Harness `odt/__tests__/external-validation.test.ts`, `xmllint-wasm`).
6. **Reale Fremddatei:** z. B. `tests/fixtures/external/odt/CharacterParagraphFormat.odt`,
   `feature_attributes_paragraph_MSO2013.odt`, `tabelleAlignMargin.odt`,
   `paragraphWithPageStyle.odt`, `indentTest.odt` → korrekt als „links" erkannt, unabhängig
   davon, ob die Datei `left` oder (spezifikationskonform) `start` bzw. eine Vererbung nutzt.
   Ergebnis gemäß Grenzfall 4.10 / Risiko R2 dokumentieren.
7. **Absatz ganz ohne referenzierten Ausrichtungsstil / ohne `style:paragraph-properties`**
   (häufig, wenn nur die geerbte `Standard`-Vorlage genutzt wird): `paragraphAligns.get(...)`
   liefert `undefined` → Fallback `'left'` (`reader.ts:177-178`) — mit echter Testdatei
   bestätigen.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit linksbündigem Text (nach vorherigem Zentrieren zurückgesetzt) → Editor → Export
   als ODT → Import → Export zurück als DOCX → Ausrichtung nach zwei Formatkonvertierungen
   weiterhin „links" an exakt derselben Textstelle.
2. Dieselbe Prüfung mit Startpunkt ODT (ODT→DOCX→ODT).
3. Dieselbe Prüfung mit einer Überschrift statt eines normalen Absatzes.

---

## 6. Testabdeckung: Ist-Stand (präzise) und geforderter Nachweis

### 6.1 Was bereits existiert (und die frühere Fassung übersehen/falsch beschrieben hat)
- **Unit-Rundreise inkl. `left`:** `docx/__tests__/roundtrip.test.ts:54-59` und
  `odt/__tests__/roundtrip.test.ts:56-60` prüfen per `it.each(['left','center','right','justify'])`
  **auch `left`** (Writer→eigener Reader, konstruiertes JSON), plus je ein Heading-Align-Test
  (`center`).
- **Unabhängige Export-Validierung existiert:** `docx/__tests__/external-validation.test.ts`
  (mammoth) und `odt/__tests__/external-validation.test.ts` (OASIS ODF 1.3 RelaxNG via
  `xmllint-wasm`). Diese Harnessen sind vorhanden und lauffähig — der frühere DoD-Wunsch
  „unabhängiger Parser (z. B. python-docx)" ist damit teilweise bereits erfüllt und muss
  nicht neu erfunden, sondern **erweitert** werden.
- **E2E-Ausrichtung existiert (für `center`):** `tests/e2e/roundtrip-fidelity.spec.ts`
  „Criterion 4: Absatzausrichtung" prüft `text-align: center` an einem rundgereisten Absatz
  für DOCX→DOCX **und** ODT→ODT (Re-Verify nach Cross-Format, Z. 129/179/243), über echten
  `setInputFiles`-Upload und `waitForEvent('download')`. Grundlage sind `buildRichDocx`/
  `buildRichOdt` (`tests/e2e/fixtures/richDocument.ts`): DOCX zentrierter Absatz via
  `<w:jc w:val="center"/>` (Z. 87) und Überschrift mit explizitem `<w:jc w:val="left"/>`
  (Z. 60); ODT „Centered"-Automatikstil `fo:text-align="center"` (Z. 141).

### 6.2 Die tatsächliche Lücke (was fehlt)
- **Kein E2E-Test klickt jemals einen `AlignButton`.** Der komplette Toolbar-Pfad
  (`run` → `setAlign`, Fokus-Erhalt, `aria-pressed`) ist E2E **unerprobt**. Muster zum
  Nachbauen: `page.getByTitle('Fett').click()` (`tests/e2e/docx.spec.ts:77`); für „links"
  aktuell `page.getByTitle('Ausrichtung: left')` (bzw. der lokalisierte Titel, falls gemäß
  Abschnitt 2 geändert).
- **Kein Test prüft den Wert `left` end-to-end über die UI** (nur `center` wird per
  Fidelity-Test rundgereist, und das ohne Button-Interaktion).
- **Kein Test** deckt: aktiven Button-Zustand, den Rückweg „zentriert → links",
  gemischte Selektion, Tabellen-Zellauswahl (Risiko R6), Formatvorlagen-Wechsel-Reset
  (Risiko R1), stilvererbte/`start`-Ausrichtung (Risiko R2), Undo-Granularität (Risiko R4).

### 6.3 Reichweite der vorhandenen unabhängigen Validierung (ehrlich abgrenzen)
- **mammoth** (DOCX) konvertiert nach HTML und lässt direkte Absatzformatierung wie `w:jc`
  bewusst weitgehend fallen — es belegt **Parseierbarkeit + Text/Struktur** durch eine
  Fremdimplementierung, **nicht** den Ausrichtungswert. Für den `left`-Wert ist ein
  **direkter** `word/document.xml`-Check (`<w:jc w:val="left"/>` bzw. dessen bewusste
  Präsenz) die verlässliche Prüfung.
- **ODF-RelaxNG** (ODT) validiert, dass der erzeugte `fo:text-align`-Automatikstil
  **schemakonform** ist, **nicht**, dass sein Wert `left` ist. Der semantische Wert ist
  über einen direkten XML-Check des referenzierten Stils zu prüfen.

### 6.4 Neu zu schreibende Tests (damit Abschnitte 2–5 abgedeckt sind)
1. Neues Dokument, Cursor in leerem Absatz → „Links"-Button hat bereits `aria-pressed="true"`
   **ohne** Klick (Default-Nachweis, Grenzfall 4.1).
2. Absatz per „Zentriert" zentrieren, dann echter Playwright-Klick auf „Links" → Absatz im
   DOM wieder `style="text-align: left"`, `aria-pressed` „Links"→true, „Zentriert"→false
   (Kern-E2E, Grenzfall 4.3). Praktischer Hinweis zur Projekt-Auswahl: Die aktuellen
   Playwright-Projekte (`playwright.config.ts`) heißen `Desktop Chrome`, `Mobile`, `Tablet`,
   `Desktop Safari (Clipboard)` und `Desktop Firefox (Clipboard)`. Ein `AlignButton`-Klick
   braucht keine Zwischenablage-Rechte; der Test sollte daher mindestens in `Desktop Chrome`
   laufen (plus `Mobile`/`Tablet` für Grenzfall 8.5), ein Zusatzlauf in den beiden
   `(Clipboard)`-Projekten ist optional, aber wegen R11 (`onMouseDown`-Verhalten kann
   browserabhängig variieren) sinnvoll.
3. Klick auf „Links" bei bereits linksbündigem Absatz → keine sichtbare Änderung;
   Undo-/`onChange`-Verhalten protokollieren (Grenzfall 4.2 / Risiko R4).
4. Selektion über zwei Absätze mit gemischter Ausgangsausrichtung → „Links" → beide
   linksbündig; Anzahl nötiger Strg+Z bis vollständiger Rückkehr protokollieren
   (Grenzfälle 4.4/4.13, Risiko R4/R5).
5. Cursor an einer Absatzgrenze zwischen unterschiedlich ausgerichteten Absätzen →
   Button-Zustand gemäß Grenzfall 4.5 dokumentiert.
6. Absatz in einem Listenpunkt zentrieren, auf „Links" zurücksetzen, Liste aufheben →
   Ausrichtung bleibt erhalten (Grenzfall 4.7).
7. 3×3-Tabelle, nur mittlere Spalte markieren, „Links" anwenden → Spalten 1 und 3
   unverändert (Grenzfall 4.8, Risiko R6) — kritischer Test, keine `CellSelection`-Behandlung
   im Code erkennbar.
8. Absatz zentrieren, per Dropdown zu „Überschrift 1" und zurück zu „Standard" → Ausrichtung
   nach beiden Wechseln protokollieren (erwartet „links" gemäß Grenzfall 4.9 / Risiko R1);
   zusätzlich prüfen, dass ein Formatwechsel über eine Mehrabsatz-Selektion nicht ausgeführt
   wird (`sameParent`-Guard).
9. Undo direkt nach echter Änderung (zentriert → links) → wieder zentriert; Redo → wieder
   links.
10. Vollständiger Rundreisetest je Format (5.1/5.2) über echten `filechooser`-Upload und
    `page.waitForEvent('download')` — für „links" mit aktivem Rückweg (nicht nur Default).
11. Cross-Format-Rundreise (5.3) DOCX→ODT→DOCX und ODT→DOCX→ODT.
12. Regressionstest analog `tests/e2e/selection-regression.spec.ts`, aber mit „Links" (bzw.
    einer Ausrichtungsänderung) als auslösendem Schritt statt „Fett" (Grenzfall 4.14).
13. Import realer Fremddateien mit `w:jc w:val="start"`/`distribute` bzw.
    `fo:text-align="start"`/stilvererbter Ausrichtung → Ergebnis inkl. Button-Zustand nach
    Import gemäß Grenzfälle 4.10/4.11 dokumentieren (Risiko R2/R3).
14. Import realer Fremddateien ganz ohne explizite Ausrichtung (DOCX `emptyPPr.docx`, ODT
    ohne referenzierten Ausrichtungsstil) → korrekt als „links" erkannt (Grenzfälle
    4.12/5.2-7).
15. Direkter Export-Wert-Check: nach „links" exportieren, `word/document.xml` enthält
    `<w:jc w:val="left"/>` bzw. der ODT-Absatz referenziert einen Stil mit
    `fo:text-align="left"` — **zusätzlich** zur (strukturellen) mammoth-/RelaxNG-Validierung
    (Abschnitt 6.3).
16. Sichtprüfung/Screenshot-Vergleich: linksbündiger Absatz im Editor vs. nach Re-Import
    derselben Datei — optisch identisch.
17. Absatz zentrieren, dann den „Links"-Button **ausschließlich per Tastatur** bedienen (Tab bis
    der Button den Fokus hat, danach einmal Enter, in einem zweiten Durchlauf einmal Leertaste)
    → protokollieren, ob der Absatz linksbündig wird. Erwartung nach aktuellem Code: **nein**,
    keine sichtbare Änderung in beiden Fällen (Grenzfall 4.17, Risiko R11) — Testfall dient als
    Nachweis/Regressionsschutz, unabhängig davon, ob R11 vor Abnahme behoben wird.

---

## 7. Verdachtsmomente aus der Codeanalyse (Risikoliste — priorisiert)

Konkrete, aus dem aktuellen Quellcode abgeleitete Punkte, die die QA-Verifikation gezielt
bestätigen oder widerlegen muss. Reihenfolge = Priorität für „Ausrichtung links".

- **R1 — Formatvorlagen-Wechsel setzt Ausrichtung auf „links" zurück** (`commands.ts:43`).
  `setHeading` setzt `align:'left'` bzw. den Schema-Default bei **jedem** Wechsel der
  Formatvorlage — unabhängig von der vorherigen Ausrichtung. Für „links" doppelt relevant:
  Es ist der naheliegendste Weg, wie ein Absatz **ungewollt** linksbündig wird. Höchste
  Priorität. Als bewusstes Verhalten dokumentieren **oder** beheben.
- **R2 — „Falsches Links" durch nicht ausgewertete Stilvererbung** (`docx/reader.ts:238-240`
  wertet nur direktes `w:jc`; `odt/reader.ts:37-78` nur `office:automatic-styles`). Über eine
  Formatvorlage gesetzte Nicht-links-Ausrichtung wird als „links" importiert und ist unter
  der Default-Farbe unsichtbar. Muss mit realer Fremddatei geprüft und entschieden werden.
- **R3 — Unvollständige Wertetabellen** (`JC_TO_ALIGN` `docx/reader.ts:14`; fehlende
  `start`/`end`-Normalisierung im ODT-Reader). `start/end/distribute` u. a. fallen still auf
  „links". Betrifft die Robustheit der links-Erkennung.
- **R4 — Mehrfach-Transaktion bei Mehrabsatz-Selektion, führt zum harten Crash** (`setAlign`
  dispatcht je Absatz eine eigene, aus dem **ursprünglichen** `state` abgeleitete Transaktion,
  `commands.ts:17-24`; `dispatchTransaction` spielt jeden Dispatch sofort gegen den bereits
  aktualisierten `view.state` ein, `WordEditor.tsx:125-133`). **Nicht mehr nur Undo-Granularität,
  sondern ein bestätigter Abbruch:** Der zweite Dispatch trägt `tr.before` = Original-Doc gegen
  ein schon verändertes `view.state.doc` ⇒ `RangeError: Applying a mismatched transaction`. In
  `specs/ausrichtung-links-code.md` Abschnitt 3.1 **durch Ausführung reproduziert** (Doc-Zustand
  danach `['left','center']`). Damit von „mittleres Verdachtsmoment" auf **kritisch/Priorität 1**
  hochgestuft — dieser eine Bug bricht den alltäglichsten Anwendungsfall („Alles auswählen →
  linksbündig" bei > 1 Absatz) und betrifft über den gemeinsamen `setAlign`-Pfad auch die drei
  Schwester-Ausrichtungen. Muss behoben und mit dauerhaftem Regressionstest (6.4-4/-13)
  abgesichert werden.
- **R5 — `isAlignActive` nur aus `$from`** (`commands.ts:29-38`). Bei gemischter Selektion
  spiegelt der Button nur den Selektionsanfang. Gewünschtes Anzeigeverhalten festlegen.
- **R6 — Keine `CellSelection`-Sonderbehandlung** (`setAlign` nutzt lineares
  `nodesBetween`). Rechteckige Zellauswahl könnte nicht markierte Zwischenzellen
  mit-ausrichten. Kritisch, konkret testen (Testfall 6.4-7).
- **R7 — Kein Tastenkürzel** (`WordEditor.tsx:85-107`). Priorität-1-Funktion ohne Strg+L,
  obwohl Word/LibreOffice es anbieten. Entscheiden und dokumentieren.
- **R8 — Fehlendes `aria-label` am `AlignButton`** (`Toolbar.tsx:91-111` vs. `MarkButton`
  Z. 74). Inkonsistent zu den Zeichenformat-Buttons; Barrierefreiheit prüfen. Sechste
  PO-Verifikationsrunde (Korrekturhinweis oben) bestätigt zusätzlich: auch der neue
  „Ausschneiden"-Button (`Toolbar.tsx:146`) hat ein `aria-label` — das Fehlen ist also
  **keine** Toolbar-weite Konvention, sondern eine isoliert behebbare Lücke gerade der
  vier Ausrichtungs-Buttons.
- **R9 — Nicht lokalisiertes `title`** (`Toolbar.tsx:96`): `title="Ausrichtung: left"` zeigt
  den internen Bezeichner statt „Linksbündig ausrichten". Relevant für Nutzer:innen **und**
  für künftige `getByTitle(...)`-E2E-Selektoren.
- **R10 — Icon-Rendering** (`Toolbar.tsx:234`, Unicode `⇤`). Rendering-Risiko gemäß
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20; auf mehreren Systemen prüfen, ggf. SVG.
- **R11 — `AlignButton` per Tastatur (Tab + Enter/Leertaste) nicht auslösbar** (`Toolbar.tsx:91-111`,
  nur `onMouseDown` Z. 98–99, kein `onClick`/`onKeyDown`). Eigenständig von R7 (fehlendes
  Kürzel) und R8 (fehlendes `aria-label`) — selbst mit behobenem R7/R8 bliebe der Button für
  Tastaturnutzer:innen ohne Maus komplett unerreichbar, nicht nur schwerer auffindbar. Identischer
  Defekt bei `MarkButton` (`Toolbar.tsx:76`). Muss behoben und mit Testfall abgesichert werden
  (Grenzfall 4.17). Sechste PO-Verifikationsrunde (Korrekturhinweis oben): identischer Defekt
  auch beim zeitlich später hinzugekommenen „Ausschneiden"-Button (`Toolbar.tsx:143-156`, nur
  `onMouseDown` Z. 148) — R11 ist damit kein Altlast-Einzelfund, sondern ein bis in den
  aktuellsten Code fortbestehendes, durchgängiges Toolbar-Muster.

Jeder Punkt ist am Ende der Verifikation als **„bestätigt und behoben"**, **„bestätigt und
bewusst als Grenzfall dokumentiert"** oder **„widerlegt"** einzustufen — keiner bleibt
unkommentiert offen.

---

## 8. Abgrenzung: Vorhandener Test vs. geforderter Nachweis

Die bestehenden Unit-Tests (`it.each([...'left'...])`, beide `roundtrip.test.ts`) und der
Fidelity-E2E-Test (`center`) beweisen **nicht**, dass:
- der „Links"-Button tatsächlich klickbar ist und sichtbar reagiert (kein E2E-Klick auf
  einen `AlignButton` existiert),
- der aktive Button-Zustand sich korrekt mit der Cursor-Position mitbewegt,
- ein über die UI zentrierter und dann per „Links" zurückgesetzter Absatz (nicht ein von
  vornherein links konstruierter) beim Export dieselbe Struktur erzeugt wie ein nie
  berührter Default-Absatz,
- die Grenzfälle aus Abschnitt 4 (Tabellen-Zellauswahl, Formatvorlagen-Wechsel, ODF-Werte
  `start`/`end`, Stilvererbung) sich in der Praxis so verhalten wie im Code vermutet.

Diese Punkte sind der Kern der geforderten Verifikation und müssen durch neue/erweiterte
Tests (analog zu den für Fett/Kursiv vorhandenen Playwright-Tests und den bestehenden
Validierungs-Harnessen) geschlossen werden, bevor der Backlog-Status von „vorhanden" auf
„verifiziert" gehoben werden darf.

---

## 9. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** Punkte erfüllt sind:

1. Alle Testfälle aus Abschnitt 6.4 sind als automatisierte Tests vorhanden und grün,
   inklusive mindestens **eines** E2E-Tests, der einen `AlignButton` real anklickt und den
   Wert `left` über die UI nachweist (schließt die in Abschnitt 6.2 benannte Kernlücke).
2. Die Rundreise-Testfälle 1, 2, 6 aus 5.1 sowie 1, 2, 6 aus 5.2 sind bestanden — je mit
   **aktivem Rückweg** (zentriert → links), nicht nur Default, und je mit mindestens einer
   realen, nicht app-eigenen Fremddatei.
3. Der Export-Wert wird **zusätzlich** direkt geprüft (`word/document.xml` `w:jc="left"`
   bzw. referenzierter ODT-Stil `fo:text-align="left"`), nicht nur über die strukturellen
   Fremd-Validierungen mammoth/RelaxNG (deren Reichweite gemäß 6.3 dokumentiert ist).
4. Risiko R1 (Formatvorlagen-Wechsel-Reset) ist geprüft und als bewusstes Verhalten
   bestätigt **oder** als zu behebender Fehler markiert (mit Ticket).
5. Risiko R6 (Tabellen-Zellauswahl) ist geprüft; das tatsächliche Verhalten (korrekt begrenzt
   vs. übergreifend) ist dokumentiert; falls fehlerhaft, ist ein Ticket angelegt.
6. Risiko R2/R3 (Stilvererbung, `start`/`end`/`distribute`) ist mit je mindestens einer
   echten Testdatei je Format geprüft, Ergebnis hier oder in einer Nachfolgedatei
   dokumentiert — insbesondere, ob eine Nicht-links-Ausrichtung fälschlich als „links"
   ankommt.
7. Der Selection-Sync-Regressionstest mit Ausrichtung als auslösendem Schritt (Grenzfall
   4.14) ist dauerhaft Teil der Suite.
8. Das Fehlen von Tastenkombination (R7), `aria-label` (R8) und echter Tastatur-Auslösbarkeit
   des Buttons selbst — Tab + Enter/Leertaste (R11, Grenzfall 4.17) — ist **bewusst** als „nicht
   im Scope" bestätigt oder als nachzuliefernde Funktion in den Backlog aufgenommen — nicht
   unentschieden offen gelassen. R11 ist von R7 zu unterscheiden: R7 betrifft das fehlende
   Kürzel, R11 die fehlende Auslösbarkeit des Buttons selbst ohne Maus — beide müssten
   unabhängig voneinander entschieden werden, auch wenn beide behoben würden.
9. Jeder Punkt der Risikoliste (Abschnitt 7) ist final als „behoben" / „bewusst
   dokumentiert" / „widerlegt" eingestuft; kein während der Verifikation gefundener Fehler
   bleibt ohne Ticket/Vermerk.
10. **Blockierend, keine „dokumentiert"-Ausnahme zulässig:** Risiko R4 — der bereits durch
    Ausführung reproduzierte `RangeError: Applying a mismatched transaction` bei Selektion über
    ≥ 2 alignierbare Blöcke (`specs/ausrichtung-links-code.md` Abschnitt 3.1) — ist **behoben**
    (nicht nur beschrieben). Nachweis: ein Test setzt eine Selektion über ≥ 2 Absätze und wendet
    „Links" an; es tritt **keine** Exception auf, **alle** betroffenen Blöcke stehen danach auf
    `left` (Stichprobe Anfang/Mitte/Ende, nicht nur der erste Block), der Editor-Fokus bleibt
    erhalten, und der Vorgang ist mit **einem** Strg+Z vollständig rückgängig zu machen. Da alle
    vier Ausrichtungen denselben `setAlign`-Pfad teilen, gilt dieses Kriterium für „links" als
    stellvertretenden, mit Vorrang zu behebenden Fall für die gesamte Ausrichtungs-Familie.
