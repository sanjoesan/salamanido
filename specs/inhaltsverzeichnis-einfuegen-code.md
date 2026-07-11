# Umsetzungsplan (Code-Ebene): Feature „Inhaltsverzeichnis einfügen"

Bezug: `specs/inhaltsverzeichnis-einfuegen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 10/17/18/19/20, `FEATURE-BACKLOG.md` Zeile 309, `specs/inhaltsverzeichnis-aktualisieren-req.md`
Abschnitt 0.6 (Schwester-Feature, definiert die Mindest-Schnittstelle, die dieser Plan liefern muss).
Code-Stand gegen das tatsächliche Repo geprüft (Stand 2026-07-04, `E:\docs`, kein Git-Repo).

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers". Es ändert selbst noch keinen
Code. Es beantwortet außerdem die drei in der Anforderung offen gelassenen Architekturfragen
(Abschnitt 2.9, Grenzfall 15, DoD Punkt 10), damit die Umsetzung nicht an ungeklärten Fragen
hängen bleibt.

---

## 0'. Nachtrag — Re-Verifikation gegen den Live-Code (Stand 2026-07-05)

Dieser Plan wurde am 2026-07-05 **vollständig erneut** gegen das reale Repo gelesen (nicht nur
gegen eine frühere Fassung). Ergebnis in zwei Sätzen:

- **Alle substanziellen/architektonischen Befunde gelten unverändert.** Es gibt weiterhin
  **keinen** `toc`/`toc_entry`-Node (`schema.ts` komplett gelesen), **keinen**
  `insertTableOfContents`/`collectHeadings` in `commands.ts`, **keinen** ToC-Toolbar-Button, **kein**
  `bookmark`/`fldChar`/`fldSimple`-Schreiben in `docx/writer.ts`, **keinen** `text:table-of-content`-
  `case` in `odt/writer.ts`. Die beiden verifizierten Import-Totalverluste bestehen weiter:
  `docx/reader.ts` `readBodyChildren` behandelt nur `w:p`/`w:tbl` (block-level `<w:sdt>`-ToC fällt
  raus), `odt/reader.ts` `elementToBlocks` endet für `text:table-of-content` auf `return []`. Der
  Inline-Fallback in `collectRuns` (`w:fldSimple`/`w:sdt`) und die `unsupported_block`-Hülle
  existieren wie beschrieben. **Die gesamte Umsetzungsstrategie ab Abschnitt 1 bleibt gültig.**
- **Aber: fast alle Zeilennummern und zwei Zähl-Fakten in diesem Plan sind veraltet.** Seit der
  Erst-Fassung ist das Feature **„Ausschneiden" (cut)** eingezogen (`cutSelection`/`canCut`/
  `CutHandlers` in `commands.ts`, `ScissorsIcon` + führender Cut-Button in `Toolbar.tsx`,
  `Shift-Delete`-Keymap + `cutError`-State in `WordEditor.tsx`) und das Fixture-Korpus ist gewachsen.
  Dadurch sind Dateien länger geworden. **Wo dieser Plan unten eine Zeilennummer nennt, gilt die
  korrigierte Spalte dieser Tabelle, nicht die im Fließtext genannte Zahl.**

### 0'.1 Korrigierte Fundstellen (Plan-Angabe → tatsächlich, 2026-07-05)

| Datei / Symbol | Plan sagt | Tatsächlich | Anmerkung |
|---|---|---|---|
| `schema.ts` Gesamtlänge | 154 Zeilen | **202 Zeilen** | `unsupported_block`-Node (`schema.ts:87–113`) kam hinzu — genau der in Abschnitt 10 (Anforderung) genannte Fallback-Behälter, existiert bereits. |
| `schema.ts` `heading`-Node | „aktuell Zeilen 19–31" (Abschn. 2) | **26–38** | Attribute/Struktur unverändert (`level`, `...alignAttr`, `defining:true`), nur verschoben. |
| `Toolbar.tsx` Gesamtlänge | 247 Zeilen | **297 Zeilen** | |
| `Toolbar.tsx` `currentHeadingLevel()` | 87–95 (Abschn. 0.1) | **114–122** | Logik identisch (nur `$from`-Vorfahrenpfad). |
| `Toolbar.tsx` `insertTable(2,2)` direkt | „:234" (Abschn. 0.4) | **:284** | Tabellen-Dialog weiterhin **nicht** gebaut — Zusatzbefund C gilt. |
| `Toolbar.tsx` Absatzformat-`<select>` | 165–181 | **165–180** | unverändert nutzbar als Überschriften-Erzeuger. |
| `Toolbar.tsx` Bild-`<label>` (Anker für neue Gruppe) | „Zeile 241–244" (Abschn. 6) | **291–294** | Neue „Referenzen"-Gruppe wird **danach** angehängt. |
| `Toolbar.tsx` `ToolbarProps` | `{ view }` | **`{ view, cutError, setCutError }`** | **Umsetzungsdelta:** die in Abschnitt 6 ergänzte Datei muss die neuen Props durchreichen bzw. unangetastet lassen; der neue `tocDialogOpen`-State kommt zusätzlich. Ein führender „Ausschneiden"-Button (`ScissorsIcon`, `143–156`) ist jetzt das **erste** Toolbar-Element. |
| `Toolbar.tsx` `run(view, cmd)`-Helfer | (implizit) | **module-level, Zeile 28** | Abschnitt 6 nutzt `run(view, insertTableOfContents(maxLevel))` — Signatur passt unverändert. |
| `commands.ts` Gesamtlänge | (n/a) | **168 Zeilen** | Neu: `canCut` (126), `CutHandlers` (130), `cutSelection` (149). Die in Abschnitt 3 geplanten Exporte werden an die **bestehende** Exportfläche angehängt. |
| `WordEditor.tsx` Gesamtlänge | 134 Zeilen | **178 Zeilen** | |
| `WordEditor.tsx` `reconcileSelectionOnClick` | 42–53 (Abschn. 0.1) | **43–50** | |
| `WordEditor.tsx` `plugins: [...]`-Array | „Zeilen 69–86" (Abschn. 8) | **75–106** | Enthält jetzt zusätzlich `Shift-Delete: cutSelection(...)` (98) und `createPaginationPlugin()` (105). `createTocInteractionPlugin()` wird hier eingehängt (z. B. nach 105). |
| `WordEditor.tsx` `new EditorView(...)` | „:89" (Abschn. 8-Analyse) | **:114** | Selection-Sync-Argumentation unverändert gültig. |
| `WordEditor.tsx` `mouseup`-Listener-Registrierung | „103–104" (Abschn. 8-Analyse) | **146–147** | Die Reihenfolge-Analyse (PM-intern zuerst, dann `onMouseUp`) bleibt korrekt. |
| `docx/reader.ts` `paragraphToBlocks()` | „aktuell Zeilen 146–183" (Abschn. 10.1) | **229–280** | |
| `docx/reader.ts` `collectRuns` Inline-Fallback | 194–216 | **194–216** | stimmt (einziger unveränderter Treffer). |
| `docx/reader.ts` `readBodyChildren()` | „aktuell Zeilen 307–328" (Abschn. 10.2) | **464–485** | Nur `w:p`/`w:tbl` — Befund 8 gilt. |
| `docx/reader.ts` `readDocx`-Rückgabe (Verdrahtungspunkt) | „nach Zeile 346/363/372 vor Zeile 384" (Abschn. 11) | `bodyBlocks` **503**, `result` **547–554** | `resolveTocPlaceholders(...)` unmittelbar **vor** dem `result`-Aufbau (vor 547). |
| `docx/writer.ts` `blockToDocx` `case 'heading'` | „aktuell Zeilen 106–111" (Abschn. 9.2) | **119–124** | |
| `docx/writer.ts` `blockToDocx`-Signatur | „neuer Parameter `tocCtx`" | **`(node, images, rels, listContext=null)`** | **Umsetzungsdelta:** `tocCtx` muss **zusätzlich** durchgereicht werden — durch die rekursiven Aufrufe in `bullet_list`/`ordered_list` (137–139), `tableToDocx` (158–201), `unsupported_block` (152) **und** `blocksToDocx` (203–205). `paragraphPropsXml(align, extra)` (69–72) existiert wie angenommen. |
| `docx/writer.ts` `writeDocx` bodyXml/header/footer | „Zeilen 226–243" (Abschn. 9.5) | **256–273** | |
| `docx/styleDefs.ts` `headingStylesXml()` | „Zeile 22–29" (Abschn. 9.4) | **9–30**, `HEADING_STYLE_ID` **5–7** | `tocEntryStylesXml()` in die `styles`-Konkatenation (vor 27) aufnehmen. |
| `odt/writer.ts` `blockToOdt()`-`switch` | „Zeilen 61–123" (Abschn. 0.1 Pkt. 10) | **85–195** | |
| `odt/writer.ts` `case 'heading'` (bleibt unverändert) | „Zeile 69–74" (Abschn. 12.3) | **93–98** | |
| `odt/writer.ts` `buildContentXml()` (automatic-styles) | „Zeile 129–137/133" (Abschn. 12.2) | **206–214**, Konkat. bei **210** | Liegt in `writer.ts` (nicht `styleRegistry.ts`); `tocEntryStyleDefs()` dort einfügen. |
| `odt/styleRegistry.ts` `headingStyleName`/`headingStyleDefs` | (Anker) | **80 / 84** | `tocEntryStyleName`/`tocEntryStyleDefs` daneben ergänzen. |
| `odt/reader.ts` `elementToBlocks()` | „aktuell Zeilen 164–206" (Abschn. 13.1) | **250–324** | Neuen `table-of-content`-Zweig **vor** der `depth >= MAX_NESTING_DEPTH`-Prüfung (264) einordnen, analog zum `text:section`-Unpack (276–278). |
| `odt/reader.ts` `return []`-Default | „:323" (Abschn. 13.1) | **:323** | stimmt. |
| `odt/reader.ts` `readOdt` `bodyBlocks` (Verdrahtungspunkt) | „Nach Zeile 248 … vor 279–284" (Abschn. 13.2) | `bodyBlocks` **366**, `result` **401–408** | `resolveTocPlaceholders(...)` vor 401. `EMPTY_REDLINE_MARKER_NAMES` **80–87**. |
| `index.css` Gesamtlänge / letzter Block | „72 Zeilen, `.page-break-spacer` (69–71) letzter Block" (Abschn. 0.5) | **88 Zeilen** | Letzter Block ist jetzt das Dark-Mode-`@media`-`.unsupported-block` (**83–88**). Neue `.pm-toc`-Regeln (Abschn. 7) **nach Zeile 88** anhängen, **nicht** nach 71. |
| ODT-Fixtures gesamt | „179 Dateien" (Abschn. 0.2) | **202** | (deckt sich mit der Anforderung.) Die drei ToC-Fixtures (`test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt`) bestehen weiter. |
| DOCX-Fixtures gesamt | „106 Dateien" (Abschn. 0.3) | **127** | Weiterhin **0** mit echtem `TOC`-Feld → synthetische Fixture bleibt Pflicht. |
| `pagination.ts` (115) / `PrivacyModal.tsx` (38) / `documentModel.ts`-Shape | wie im Plan | **exakt gleich** | Keine Korrektur nötig. |

### 0'.2 Zusätzliche, aus dem Live-Code abgeleitete Umsetzungshinweise (Ergänzung, kein Widerruf)

1. **Dark-Mode-CSS für das Verzeichnis (Verbesserung an Abschnitt 7).** `index.css` hat seit der
   Plan-Fassung ein etabliertes Dark-Mode-Muster (`@media (prefers-color-scheme: dark)` für
   `.unsupported-block`, `83–88`). Die in Abschnitt 7 vorgeschlagenen `.pm-toc`-Regeln sind **rein
   hell** gefärbt (`background:#f3f4f6`, `border:#d1d5db`, …) und würden im Dark-Mode als greller
   Kasten erscheinen. **Ergänzung:** einen `@media (prefers-color-scheme: dark)`-Block mit
   abgedunkelten Werten für `.pm-toc`/`.pm-toc-header`/`.pm-toc-refresh`/`.pm-toc-entry:hover`
   hinzufügen (z. B. `background:#18181b; border-color:#52525b; color:#d4d4d8`), konsistent zum
   `.unsupported-block`-Dark-Block.
2. **Keine Interferenz mit dem `Shift-Delete`-Cut-Keybinding.** Der neue Keymap-Eintrag
   `Shift-Delete: cutSelection(...)` (`WordEditor.tsx:98`) berührt den ToC-Klick-/Selection-Sync-Pfad
   nicht; die Analyse in Abschnitt 8 bleibt gültig. Der Regressionstest (Testfall 10) sollte jedoch
   **zusätzlich** einmal mit `Shift-Delete` als Cut-Trigger vor dem ToC-Klick laufen, um die
   Wechselwirkung der beiden erst kürzlich stabilisierten Selection-Sync-Pfade
   (`cut.spec.ts`/`selection-regression.spec.ts`) mit dem neuen ToC-Klick nicht zu übersehen.
3. **Toolbar-Props sauber weiterreichen.** Weil `Toolbar` jetzt `{ view, cutError, setCutError }`
   erhält, muss die Erweiterung aus Abschnitt 6 den lokalen `tocDialogOpen`-State **additiv**
   einführen, ohne die Cut-Fehleranzeige (`cutError`-`<span role="alert">`, `157–161`) zu verdrängen —
   die neue „Referenzen"-Gruppe wird strikt als letztes Kind **nach** dem Bild-`<label>` (291–294)
   eingefügt.

### 0'.3 Zweite Re-Verifikation gegen den Live-Code (Stand 2026-07-05, zweiter Durchgang)

Alle in Abschnitt 0'.1 korrigierten Fundstellen wurden erneut Datei für Datei geöffnet.
`schema.ts` (heading 26–38, unsupported_block 87–113), `commands.ts` (canCut 126 / CutHandlers 130
/ cutSelection 149, 167 Zeilen), `Toolbar.tsx` (297 Zeilen, `run` @28, ScissorsIcon 33–53,
Cut-Button 143–156, cutError-`<span>` 157–161, currentHeadingLevel 114–122, Absatzformat-`<select>`
165–180, insertTable(2,2) @284, Bild-`<label>` 291–294), `docx/writer.ts` (blockToDocx-Signatur
`(node, images, rels, listContext=null)` 105–110, `case 'heading'` 119–124, paragraphPropsXml 69–72,
bullet/ordered-Rekursion 137–139, tableToDocx 158–201, unsupported_block 152, blocksToDocx 203–205,
writeDocx-Body/Header/Footer 256–273), `docx/reader.ts` (paragraphToBlocks 229–280, collectRuns
Inline-Fallback 194–216, readBodyChildren 464–485 **nur `w:p`/`w:tbl`**, readDocx bodyBlocks 503 /
result 547–554), `docx/styleDefs.ts` (HEADING_STYLE_ID 5–7, headingStylesXml 9–30, `styles`-Konkat
vor 27), `odt/writer.ts` (blockToOdt-`switch` 85–195, `case 'heading'` 93–98, buildContentXml
206–214 / automatic-styles-Konkat @210), `odt/styleRegistry.ts` (headingStyleName 80–82,
headingStyleDefs 84–93), `odt/reader.ts` (elementToBlocks 250–324, `return []`-Default @323,
`text:section`-Unpack 276–278, MAX_NESTING_DEPTH-Prüfung @264, EMPTY_REDLINE_MARKER_NAMES 80–87,
readOdt bodyBlocks 366 / result 401–408), `index.css` (88 Zeilen, letzter Block Dark-Mode-`@media`
`.unsupported-block` 83–88) — **treffen unverändert zu.**

**Genau eine Zeilennummern-Drift seit Abschnitt 0'.1** (kein architektonischer Belang):
`WordEditor.tsx` ist um ~8 Zeilen gewachsen (neuer `useAutoDismiss`-Hook 52–63 + `cutError`-
Auto-Dismiss). Korrigierte Anker:

| Symbol | 0'.1 sagt | Tatsächlich (2. Durchgang) |
|---|---|---|
| `WordEditor.tsx` Gesamtlänge | 178 | **185** |
| `reconcileSelectionOnClick` | 43–50 | **43–50** (unverändert korrekt) |
| `plugins: [...]`-Array | 75–106 | **83–114** |
| `Shift-Delete: cutSelection(...)` | 98 | **106** |
| `createPaginationPlugin()` (Einhängepunkt für `createTocInteractionPlugin()`) | 105 | **113** |
| `new EditorView(...)` | :114 | **:122** |
| `mouseup`-Listener-Registrierung | 146–147 | **154–155** |

→ In Abschnitt 8 gilt: `createTocInteractionPlugin()` wird ins `plugins`-Array **83–114**
eingehängt (z. B. direkt nach `createPaginationPlugin()` @113). Die Selection-Sync-Analyse in
Abschnitt 8 bleibt inhaltlich unberührt (nur die zitierten Zeilen `:89`/`103–104` lauten jetzt
`:122`/`154–155`).

**Vier substanzielle Verbesserungen in diesem zweiten Durchgang** (jeweils inline in den
Fachabschnitten eingearbeitet, hier nur als Änderungsindex):

1. **Block-level-`<w:sdt>`-Import war nicht abgedeckt (Kernlücke).** Die Erstfassung behandelte in
   Abschnitt 10 nur die klassische Feld-Form; der von DoD-Punkt 9 / Grenzfall 16 / Befund 8
   **ausdrücklich** geforderte block-level-`<w:sdt>`-Fall (moderne Word-Standardform) fehlte
   komplett und wäre stiller Totalverlust geblieben. → **neuer Abschnitt 10.3** (rekursiver
   `sdtContent`-Auspack in `readBodyChildren`), Fixture-Pflicht in **beiden** Formen.
2. **`toc`-`toDOM` fehleranfällig** (Header + Content-Hole `0` als Geschwister direkt unter `.pm-toc`
   → `.pm-toc` wäre `contentDOM`, ProseMirror könnte den statischen Header verwerfen/verdoppeln). →
   Abschnitt 2 verbindlich auf `['div', {class:'pm-toc-body'}, 0]` umgestellt; Platzhalter-CSS in
   Abschnitt 7 entsprechend auf `.pm-toc-body:empty::after` korrigiert (die alte `.pm-toc:empty`-
   Regel hätte **nie** gematcht, weil `.pm-toc` immer den Header enthält → Grenzfall 2 wäre stumm
   fehlgeschlagen).
3. **`resolveTocPlaceholders` id-Kollision** (Abschnitt 11): `usedIds` wurde nicht mit bereits
   vorhandenen `heading.tocId`-Werten (aus reimportierten `_Toc`-Bookmarks) vorbelegt → ein frisch
   generiertes `h0` konnte mit einem importierten `h0` kollidieren (verletzt Grenzfall 21). →
   PASS-0-Seeding ergänzt.
4. **Kopieren einer Überschrift dupliziert `tocId`** (Abschnitt 16 Punkt 6): als dokumentierte
   Einschränkung nachgetragen.

---

## 0. Verifikation des in der Anforderung referenzierten Ist-Stands + Zusatzbefunde

### 0.1 Bestätigt

Jede in `inhaltsverzeichnis-einfuegen-req.md` zitierte Fundstelle wurde erneut gegen den
tatsächlichen Dateiinhalt gelesen. **Alle Angaben treffen zu:**

1. `src/formats/shared/schema.ts` (154 Zeilen) — kein `toc`-Node, kein Feld-/Bookmark-Attribut
   irgendwo im Schema. Bestätigt Zeile für Zeile (`nodes`-Objekt Zeilen 6–107 vollständig gelesen).
2. `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen) — kein „Inhaltsverzeichnis"/„TOC"-Treffer.
   `currentHeadingLevel()` (87–95) durchläuft nur `$from`-Vorfahren, keine Volltext-Traversierung.
3. `src/app/PrivacyModal.tsx` (38 Zeilen) — einziges Modal-Muster, **ohne** Fokus-Falle/Escape/
   Klick-außerhalb (dieselbe Präzisierung wie bereits in `tabelle-einfuegen-code.md` Abschnitt 0
   festgehalten — gilt hier identisch, wird nicht erneut hergeleitet).
4. `src/formats/shared/editor/WordEditor.tsx` (134 Zeilen) — kein Scroll-/Sprungmechanismus,
   nur `reconcileSelectionOnClick` (42–53) für den Selection-Sync-Bug.
5. `src/formats/shared/editor/pagination.ts` (115 Zeilen) — rein visuell/viewport-abhängig,
   keine stabile Seiten-Zuordnung pro Knoten.
6. `src/formats/shared/documentModel.ts` — kein ToC-Konfigurationsfeld.
7. `src/formats/docx/reader.ts:52–75` — `parseStylesXml`/`headingLevelForStyle` robust (outlineLvl
   **und** Regex-Fallback). `src/formats/docx/writer.ts:106–111`, `styleDefs.ts` — konsistente
   `HeadingN`-Styles mit `outlineLvl`.
8. **Feldcode-Infrastruktur DOCX:** `grep -rniE "fldChar|fldSimple|instrText|w:field" src/formats/docx`
   erneut ausgeführt → 0 Treffer außerhalb von Testdaten. Bestätigt.
9. **Bookmark-Infrastruktur DOCX & ODT:** `grep -rniE "bookmark" src/formats/docx src/formats/odt`
   → 0 Treffer außerhalb von Testdaten. Bestätigt.
10. `src/formats/odt/reader.ts`/`writer.ts` — kein `text:table-of-content`-Handling. Bestätigt
    (`blockToOdt()`-`switch`, Zeilen 61–123, vollständig durchsucht — kein passender `case`).

### 0.2 Zusatzbefund A — reale ODT-Fixtures mit echtem `text:table-of-content` sind bereits im Repo vorhanden

Die Anforderung lässt in Grenzfall 17/Testfall 14 offen, „welche Fixtures tatsächlich ein TOC
enthalten — vor der Umsetzung zu prüfen". Durchsucht (`unzip -p *.odt content.xml | grep
table-of-content`, alle **202** Dateien in `tests/fixtures/external/odt` — 2026-07-05
re-verifiziert, „179" der Erst-Fassung veraltet, siehe Abschnitt 0'.1):

| Datei | Größe | Inhalt |
|---|---|---|
| `test1.odt` | 263 KB | Vollständiges, realistisches `<text:table-of-content text:name="Table of Contents1">` mit `text:table-of-content-source text:outline-level="6"`, 6 Entry-Templates, gefülltem `text:index-body` (verschachtelte Kapitel 1/1.1/1.2/1.2.1/1.2.2 …) — **die geeignetste Pflicht-Fixture** für Grenzfall 17/Testfall 14. |
| `compdocfileformat.odt` | 372 KB | Ebenfalls echtes `text:table-of-content` (`text:outline-level="2"`), aus Excel-Export stammend. |
| `excelfileformat.odt` | 7,2 MB | Dieselbe Struktur wie `compdocfileformat.odt`, aber zu groß für schnelle Unit-Tests (siehe `SKIP_SLOW_UNDER_JSDOM`-Muster in `external-fixtures.test.ts:17`) — nicht als Pflicht-Fixture verwenden. |

**Wichtiger Zusatzbefund zum Linkformat echter LibreOffice-ToC-Einträge** (`test1.odt`,
`text:index-body`, direkt aus dem Zip gelesen):
```xml
<text:p text:style-name="P58">
  <text:span text:style-name="Table-Of-Contents-Number">1</text:span>
  <text:tab/>
  <text:a xlink:type="simple" xlink:href="#1.Detailed Specification|outline">
    Detailed Specification<text:tab/>4
  </text:a>
</text:p>
```
Echte ODF-Verzeichniseinträge verlinken **nicht** über `text:bookmark`, sondern über die
Spezial-Fragment-Syntax `#<Überschriftentext>|outline` — ein von ODF-Konsumenten (LibreOffice)
nativ unterstützter Navigations-Mechanismus, der direkt auf eine Überschrift mit exakt diesem
Text springt, **ohne** dass ein Bookmark existieren muss. Das ist eine wichtige, die Umsetzung
vereinfachende Erkenntnis (siehe Abschnitt 1.5/9.2 unten) — ODT braucht **keine**
Bookmark-Infrastruktur, DOCX **jedoch schon** (OOXML kennt keine Text-basierte
Outline-Navigation für Hyperlinks).

### 0.3 Zusatzbefund B — kein einziges DOCX-Fixture mit echtem `TOC`-Feld im Korpus

Vollständiger Sweep aller **127** Dateien in `tests/fixtures/external/docx` (2026-07-05
re-verifiziert, „106" der Erst-Fassung veraltet, siehe Abschnitt 0'.1)
(`unzip -p *.docx word/document.xml | grep -oE 'instrText[^<]*TOC[^<]*'`): **0 Treffer.**
`FieldCodes.docx` enthält Felder (`AUTHOR`, `CREATEDATE`), `FldSimple.docx` enthält ein
`fldSimple`-Feld (`FILENAME`) — **keines davon ist ein TOC-Feld**. Das bedeutet:

- Grenzfall 16 („Import einer Fremddatei mit bereits vorhandenem DOCX-TOC-Feld") und Testfall 14
  (Abschnitt 5) **können nicht gegen eine bereits vorhandene reale Datei aus diesem Korpus**
  verifiziert werden.
- **Empfehlung/Konsequenz für die Umsetzung** (siehe Abschnitt 12.3): Eine synthetische, von Hand
  gebaute Fixture (analog zum bereits etablierten Muster in `tests/e2e/docx.spec.ts:7–48`,
  `buildSampleDocx()` mit eigenem `JSZip`) wird als Ersatz gebaut, die exakt das in Abschnitt 8.2
  unten spezifizierte Feld-Quadrupel (`fldChar begin/separate/end` + `instrText`) sowie
  `bookmarkStart`/`bookmarkEnd` um eine Überschrift enthält. Das deckt den Programmcode-Pfad ab,
  ist aber **kein** Ersatz für einen echten Word-Verifikationslauf (Abschnitt 4.1 Punkt 3 der
  Anforderung bleibt ein offener, nur manuell/mit echter Word-Installation nachweisbarer Punkt).
  Zusätzlich empfohlen: bei Gelegenheit eine reale `.docx`-Datei mit Word-generiertem TOC-Feld
  besorgen und dem Korpus hinzufügen (außerhalb des Scopes dieses Plans, siehe Abschnitt 14).

### 0.4 Zusatzbefund C — `InsertTableDialog.tsx` aus `tabelle-einfuegen-code.md` existiert nicht

`tabelle-einfuegen-code.md` (Abschnitt 2.2) plant eine `InsertTableDialog.tsx` — diese Datei
**existiert nicht** im Repo (`src/formats/shared/editor/` enthält nur `Toolbar.tsx`,
`WordEditor.tsx`, `commands.ts`, `pageLayout.ts`, `pagination.ts`). `Toolbar.tsx:234` ruft
`insertTable(2, 2)` weiterhin **direkt** ohne Dialog auf — jener Plan ist noch nicht umgesetzt.
**Konsequenz für diesen Plan:** Der neue Options-Dialog für das Inhaltsverzeichnis
(`InsertTocDialog.tsx`, Abschnitt 4 unten) wird eigenständig entworfen, **nicht** als
Wiederverwendung einer (nicht existierenden) `InsertTableDialog`-Komponente — nur das
Overlay-Strukturmuster aus `PrivacyModal.tsx` wird als Ausgangspunkt übernommen, wie es auch
`tabelle-einfuegen-code.md` bereits für seinen eigenen (noch ungebauten) Dialog vorsieht.

### 0.5 Zusatzbefund D — `index.css` (72 Zeilen, vollständig gelesen)

Bestätigt exakt den in `seitenumbruch-code.md` referenzierten Stand: `.page-break-spacer`
(Zeilen 69–71) ist der letzte Regelblock, `{ width: 100%; }` ohne Rahmen/Label — auch das
Seitenumbruch-Feature ist demnach noch nicht umgesetzt. Neue Regeln in Abschnitt 7 unten werden
**nach** Zeile 71 angehängt.

---

## 1. Architekturentscheidungen (beantworten Abschnitt 2.9, Grenzfall 15, DoD Punkt 10)

### 1.1 Node-Modellierung: **neuer `toc`- + `toc_entry`-Node, kein Attribut-Modell**

**Entscheidung:** Ein Inhaltsverzeichnis ist ein eigener Block-Node `toc` mit Kind-Knoten
`toc_entry` (je ein Eintrag), nicht ein Attribut auf bestehenden Absätzen (anders als die
Attribut-Entscheidung in `seitenumbruch-code.md` Abschnitt 1 für `breakBefore`).

**Begründung:** Ein Seitenumbruch ist ein Attribut *eines einzelnen* Absatzes; ein
Inhaltsverzeichnis ist strukturell eine **Sammlung** mehrerer, in sich geordneter Einträge mit
eigenem Text, eigener Ebene und eigenem Sprungziel — das lässt sich nicht sinnvoll als Attribut
eines einzigen Knotens abbilden, sondern braucht eine Container/Kind-Struktur, genau wie
`bullet_list`/`list_item` bereits im Schema existiert (`schema.ts:74–104`). Ein Attribut-Modell
(z. B. „jeder generierte Absatz trägt `tocEntryFor: <id>`") würde außerdem keinen einzigen
zusammenhängenden, klar abgegrenzten Bereich erzeugen (Anforderung Zeile 88: „muss als
zusammenhängende Einheit erkennbar sein, nicht als beliebige, einzeln editierbare Absätze") —
das wäre mit lose verstreuten Absätzen strukturell nicht darstellbar/durchsetzbar.

### 1.2 Editierbarkeit: **geschützt wie ein Word-/LibreOffice-Feld, nicht frei durchtippbar**

**Entscheidung:** `toc_entry` ist `atom: true` (Leaf-Node, Text kommt aus einem `text`-Attribut,
nicht aus editierbarem Inline-Inhalt), `selectable: false`. `toc` selbst ist **kein** Atom
(`content: 'toc_entry*'`, damit 0..n Einträge möglich sind — Grenzfall 2), aber `selectable: true`
(die Nutzerin kann das **gesamte** Verzeichnis als Einheit auswählen und löschen — analog zu
„ein Feld in Word markieren und Entf drücken" — aber keinen einzelnen Eintrag herauspicken oder
hineintippen).

**Begründung:** Direktes Reintippen würde die Einträge korrumpieren, ohne dass „Aktualisieren"
das je merken könnte (das Attribut-Modell hätte laut Anforderung genau dieses Risiko explizit
benannt, Zeile 188–190). Da `toc_entry` **kein** `inline`/`text`-Inhalt im Content-Model hat,
lehnt ProseMirrors eigene Schema-Validierung jeden Versuch, Zeichen hineinzutippen, auf
Transaktionsebene automatisch ab (derselbe eingebaute Mechanismus, der bereits `image`/
`hard_break` als Atome vor Texteingabe schützt — **kein** neuer Zusatzcode nötig, das Verhalten
ergibt sich direkt aus dem Content-Model). Das erfüllt die Anforderung aus Abschnitt 2.9 zweiter
Satz „es darf zu keinem Editor-Absturz oder inkonsistenten Dokumentzustand kommen" strukturell,
nicht nur zufällig.

### 1.3 Seitenzahl-Anzeige im Editor: **keine**, siehe Grenzfall 15

**Entscheidung:** Kein Seitenzahl-Feld in der In-App-Darstellung eines ToC-Eintrags. Nur
Einrückung nach Ebene + Text. Begründung: identisch zur eigenen Einschätzung der Anforderung
(Zeile 257–265) — `pagination.ts` hat keine stabile, exportierbare Seiten-Zuordnung pro Knoten,
jede angezeigte Zahl wäre bei jeder Fensterbreitenänderung falsch. Der Export bleibt davon
unberührt: Word/LibreOffice selbst berechnen beim Öffnen/Aktualisieren (F9) echte Seitenzahlen
aus dem tatsächlichen, von ihnen selbst paginierten Dokument — das ist die reguläre TOC-Feld-
Semantik, die durch das `TOC`-Feld bzw. `text:table-of-content` ohnehin automatisch greift.

### 1.4 Zuordnung Verzeichnis-Eintrag → Überschrift: **stabile `tocId` auf dem `heading`-Node**

**Entscheidung:** `heading` bekommt ein neues, nullbares Attribut `tocId: { default: null }`
(gleiches Muster wie `image.width`/`image.height`, `schema.ts:50–51`, die ebenfalls `default:
null` **ohne** `validate`-Schlüssel verwenden). Beim Einfügen eines Verzeichnisses bekommt jede
zu diesem Zeitpunkt im Dokument vorhandene Überschrift, die noch keine `tocId` hat, in derselben
Transaktion eine neue, dokumentweit eindeutige `tocId` zugewiesen (Erzeugung siehe Abschnitt 3.1).
Jeder `toc_entry` referenziert genau eine `tocId`.

**Begründung (verworfene Alternative: gespeicherte Dokumentposition statt Id):** Eine beim
Generieren gespeicherte rohe Zeichenposition (`pos: number`) würde bei **jeder** Bearbeitung
oberhalb der Zielüberschrift (Tippen, Bild einfügen, …) sofort veralten — Klick-Navigation würde
nicht „einfrieren" (das gewollte Verhalten aus Abschnitt 2.8), sondern **kaputtgehen** (an eine
falsche, verschobene Stelle springen). Das widerspricht Anforderung Abschnitt 2.6 direkt. Eine
node-gebundene `tocId` bleibt dagegen exakt an ihrem Knoten „kleben", unabhängig davon, wie sich
umgebender Text verschiebt (ProseMirror-Attribute wandern mit dem Knoten durch jede Transaktion),
und übersteht Undo/Redo verlustfrei (Attribute sind Teil des normalen Node-JSON, keine
Nebenverwaltung nötig). Zusätzlicher Vorteil: dieselbe `tocId` ist direkt der natürliche Anker für
den DOCX-Bookmark-Namen beim Export (Abschnitt 8) — eine Fliegen-mit-einer-Klappe-Lösung.
Zusätzliche Konsequenz (bewusst so gewählt): **alle** vorhandenen Überschriften bis zur maximal
möglichen Ebene 6 bekommen beim Einfügen eine `tocId` (nicht nur die bis zur gewählten Tiefe
gefilterten) — das kostet praktisch nichts, verhindert aber, dass eine spätere „Aktualisieren"-
Operation mit einer **größeren** Tiefe erneut bei Null anfangen müsste (Vorgriff auf die im
Schwester-Feature `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 0.6 geforderte
Tiefen-Persistenz).

### 1.5 Export-Zielformat DOCX: echtes Feld-Quadrupel + Bookmarks (siehe Abschnitt 8)
### 1.6 Export-Zielformat ODT: `text:table-of-content` + native `|outline`-Navigation, keine Bookmarks nötig (siehe Abschnitt 9)

Beide Entscheidungen im Detail in den jeweiligen Abschnitten begründet — sie ergeben sich direkt
aus Zusatzbefund A (Abschnitt 0.2).

### 1.7 Reihenfolge/Formatierung der Einträge (Grenzfall 6, Abschnitt 2.3)

**Entscheidung:** Reine Textübernahme (keine Marks aus der Überschrift werden in den Eintrag
übernommen), genau wie in der Anforderung selbst empfohlen (Zeile 124–129). `hard_break`
innerhalb einer Überschrift (Randfall, aber vom Schema erlaubt, `heading.content: 'inline*'`)
wird beim Zusammenbau des Klartexts durch ein einzelnes Leerzeichen ersetzt (kein Style-Chaos in
einem einzeiligen Eintrag).

### 1.8 Sehr lange Überschriftentexte (Grenzfall 5)

**Entscheidung:** CSS-Kürzung (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden`)
auf dem Entry-`toDOM`-Element, **zusätzlich** ein `title`-Attribut mit dem vollen Text (Tooltip
bei Hover) — keine JS-seitige Kürzungslogik nötig, siehe Abschnitt 7.

### 1.9 Mehrere Inhaltsverzeichnisse im selben Dokument (Grenzfall 9)

**Entscheidung: erlaubt, keine Sperre.** Da `tocId` pro **Überschrift** (nicht pro Verzeichnis)
vergeben wird (Abschnitt 1.4) und mehrere `w:hyperlink`/`text:a`-Verweise problemlos auf
dasselbe Bookmark/denselben Überschriftentext zeigen dürfen, kollidieren zwei unabhängig
eingefügte Verzeichnisse nie — beide funktionieren unabhängig voneinander, exakt wie von der
Anforderung gefordert.

### 1.10 Einfügen in Tabellenzelle/Listenelement (Grenzfall 8, Abschnitt 2.10)

**Entscheidung: erlaubt, Verzeichnis wird eingebettet (Struktur wird nicht unterbrochen)** —
analog zur Entscheidung 1.2 in `tabelle-einfuegen-code.md` für Tabellen in Tabellenzellen. Da
`toc` zur Gruppe `block` gehört und sowohl `list_item` (`content: 'paragraph block*'`,
`schema.ts:99`) als auch Tabellenzellen (`cellContent: 'block+'`, `schema.ts:106`) beliebige
weitere `block`-Knoten aufnehmen, fügt `state.tr.replaceSelectionWith(tocNode)` das Verzeichnis
strukturell genauso ein wie ein `insertTable`/`insertImage`-Aufruf an derselben Stelle bereits
heute funktioniert (verifiziert durch Schema-Lektüre, **muss** aber wie in
`tabelle-einfuegen-code.md` Abschnitt 1.2 durch einen dedizierten Test bestätigt werden, siehe
Abschnitt 12.1).

### 1.11 Umfang der „Aktualisieren"-Funktion in diesem Plan (Abgrenzung zum Schwester-Feature)

**Entscheidung:** Dieser Plan liefert eine **minimale, funktionierende** Aktualisierungs-Funktion
(`updateTableOfContentsAt`, Abschnitt 3.3) — genug, um Testfall 6 aus Abschnitt 5 der Anforderung
und DoD Punkt 4 zu erfüllen („Überschrift ändern → Aktualisieren auslösen → Verzeichnis spiegelt
Änderung wider"). Sie **berechnet immer vollständig neu** (kein partielles Update, keine
Wahlmöglichkeit „nur Seitenzahlen" vs. „Struktur+Seitenzahlen", kein Debounce, kein `F9`-Shortcut,
kein Zeitpunkt-Auslöser beim Export). Diese Feinheiten sind laut
`inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 3.2–3.11 explizit **eigener Umsetzungsumfang**
des Schwester-Slugs `inhaltsverzeichnis-aktualisieren` und werden **dort** verfeinert/erweitert —
dieser Plan liefert bewusst nur den in `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 0.6
verlangten Mindest-Unterbau (wiedererkennbares Element, respektierte Tiefen-Konfiguration, echtes
Exportfeld), nicht die komplette Aktualisierungs-Feature-Tiefe.

---

## 2. Schema-Änderungen — `src/formats/shared/schema.ts`

```ts
const tocEntryAttrs = {
  level: { default: 1, validate: 'number' },
  text: { default: '', validate: 'string' },
  tocId: { default: null }, // no `validate` — same convention as image.width/height (nullable)
}

// heading (aktuell Zeilen 19–31) — ein Attribut ergänzt:
heading: {
  group: 'block',
  content: 'inline*',
  attrs: { level: { default: 1, validate: 'number' }, ...alignAttr, tocId: { default: null } },
  defining: true,
  parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
    tag: `h${level}`,
    getAttrs: (dom) => ({
      level,
      align: (dom as HTMLElement).style.textAlign || 'left',
      tocId: (dom as HTMLElement).dataset.tocId || null,
    }),
  })),
  toDOM(node) {
    const attrs: Record<string, string> = { style: `text-align: ${node.attrs.align}` }
    if (node.attrs.tocId) attrs['data-toc-id'] = node.attrs.tocId
    return [`h${node.attrs.level}`, attrs, 0]
  },
},

// NEU — Einzeleintrag, atomarer Leaf-Node (siehe Entscheidung 1.2):
toc_entry: {
  attrs: tocEntryAttrs,
  atom: true,
  selectable: false,
  parseDOM: [
    {
      tag: 'div.pm-toc-entry',
      getAttrs: (dom) => {
        const el = dom as HTMLElement
        return {
          level: Number(el.dataset.level) || 1,
          text: el.textContent ?? '',
          tocId: el.dataset.tocId || null,
        }
      },
    },
  ],
  toDOM(node) {
    const { level, text, tocId } = node.attrs
    return [
      'div',
      {
        class: `pm-toc-entry pm-toc-level-${level}`,
        'data-level': String(level),
        'data-toc-id': tocId ?? '',
        title: text,
        contenteditable: 'false',
      },
      text || ' ',
    ]
  },
},

// NEU — Container, Group 'block', 0..n Einträge (Grenzfall 2: leeres Verzeichnis erlaubt):
toc: {
  group: 'block',
  content: 'toc_entry*',
  attrs: { maxLevel: { default: 3, validate: 'number' } },
  isolating: true,
  selectable: true,
  parseDOM: [
    {
      tag: 'div.pm-toc',
      getAttrs: (dom) => ({ maxLevel: Number((dom as HTMLElement).dataset.maxLevel) || 3 }),
    },
  ],
  toDOM(node) {
    return [
      'div',
      { class: 'pm-toc', 'data-toc': 'true', 'data-max-level': String(node.attrs.maxLevel) },
      ['div', { class: 'pm-toc-header', contenteditable: 'false' },
        ['span', { class: 'pm-toc-title' }, 'Inhaltsverzeichnis'],
        ['button', { type: 'button', class: 'pm-toc-refresh', 'data-toc-refresh': 'true', title: 'Inhaltsverzeichnis aktualisieren' }, 'Aktualisieren'],
      ],
      ['div', { class: 'pm-toc-body' }, 0], // ← Content-Hole in EIGENEM Kind, siehe Hinweis unten
    ]
  },
},
```

**Wichtiger technischer Hinweis für die Umsetzung (in 2. Re-Verifikation 2026-07-05 präzisiert und
KORRIGIERT — die ursprüngliche „Header + `0` als Geschwister direkt unter `.pm-toc`"-Fassung war
fehleranfällig):** In ProseMirror wird **dasjenige Element zum `contentDOM`, das das Content-Hole
`0` unmittelbar enthält.** Läge `0` — wie in der Erstfassung — direkt als Geschwister des
`pm-toc-header`-`<div>` im äußeren `.pm-toc`-Array, dann wäre `.pm-toc` **selbst** das `contentDOM`,
und der statische Header-`<div>` läge damit **innerhalb** des von ProseMirror verwalteten
Content-Bereichs. ProseMirrors `ViewTreeUpdater` gleicht die Kinder des `contentDOM` gegen die
`toc_entry`-Knoten des Modells ab und würde den fremden Header dabei je nach Update-Pfad
**entfernen oder verdoppeln**. Deshalb wird das Content-Hole hier verbindlich in ein **eigenes**
Kind `['div', { class: 'pm-toc-body' }, 0]` gekapselt: `contentDOM` = `.pm-toc-body`, der Header
sitzt als Geschwister **außerhalb** von `contentDOM` und wird von ProseMirror nicht angetastet.
Das ist das idiomatische PM-Muster für „nicht editierbare Chrome um editierbaren Inhalt". (Robuste
Alternative, falls sich der `<button>` im `toDOM` als schwer klickbar erweist: eine vollwertige
`NodeView` mit explizitem `dom`/`contentDOM` — nur nötig, falls `handleClickOn` den Button-Klick
nicht wie in Abschnitt 8 analysiert erreicht.)

**Konsequenz für die Platzhalter-CSS (Abschnitt 7):** Weil `.pm-toc` jetzt IMMER den Header enthält,
matcht `.pm-toc:empty` **nie** — der „Keine Überschriften gefunden"-Platzhalter (Grenzfall 2) muss
auf das leere Content-Kind zielen: `.pm-toc-body:empty::after` (siehe korrigierte Regel in
Abschnitt 7). Die Einrück-/Eintrags-Regeln bleiben unverändert.

**Keine Änderung** an `doc`, `paragraph`, `text`, `hard_break`, `image`, Listen-/Tabellen-Nodes.

---

## 3. Commands — `src/formats/shared/editor/commands.ts`

### 3.1 Hilfsfunktionen (neu, oberhalb der bestehenden Exporte)

```ts
export interface HeadingRef {
  pos: number
  level: number
  text: string
  tocId: string | null
}

/** Full-document traversal (not just the cursor path, unlike currentHeadingLevel() in Toolbar.tsx). */
export function collectHeadings(doc: PMNode): HeadingRef[] {
  const refs: HeadingRef[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      refs.push({ pos, level: node.attrs.level, text: headingPlainText(node), tocId: node.attrs.tocId ?? null })
    }
  })
  return refs
}

function headingPlainText(node: PMNode): string {
  let text = ''
  node.forEach((child) => {
    if (child.isText) text += child.text
    else if (child.type.name === 'hard_break') text += ' '
  })
  return text
}

function existingTocIds(doc: PMNode): Set<string> {
  const ids = new Set<string>()
  doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.tocId) ids.add(node.attrs.tocId)
  })
  return ids
}

function generateUniqueTocId(existing: Set<string>): string {
  let id: string
  do {
    id = `h${Math.random().toString(36).slice(2, 10)}`
  } while (existing.has(id))
  existing.add(id)
  return id
}
```

(`generateUniqueTocId` bewusst **nicht** nach dem `Math.random()`-Tabellennamen-Muster aus
`odt/writer.ts:109` gebaut, das in `tabelle-einfuegen-code.md` Abschnitt 5.1 Punkt 2 explizit als
Bug — Kollisionsgefahr ohne Eindeutigkeitsprüfung — identifiziert und dort korrigiert wurde;
hier wird von Anfang an gegen die bereits im Dokument vorhandenen Ids geprüft, keine Wiederholung
desselben Fehlers.)

### 3.2 `insertTableOfContents(maxLevel: number): Command` — neu

```ts
export function insertTableOfContents(maxLevel: number): Command {
  return (state, dispatch) => {
    const tr = state.tr
    const ids = existingTocIds(tr.doc)

    // Erste Teil-Passage: JEDER Überschrift (nicht nur den bis maxLevel gefilterten, siehe
    // Entscheidung 1.4) fehlende tocId zuweisen — alles in derselben Transaktion.
    tr.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && !node.attrs.tocId) {
        tr.setNodeAttribute(pos, 'tocId', generateUniqueTocId(ids))
      }
    })

    // Zweite Teil-Passage: Einträge aus den (jetzt garantiert id-tragenden) Überschriften
    // bis maxLevel bauen, dabei die ggf. in der ersten Passage frisch vergebenen Ids lesen
    // (aus tr.doc, nicht aus dem alten state.doc).
    const entries = collectHeadings(tr.doc)
      .filter((h) => h.level <= maxLevel)
      .map((h) => wordSchema.nodes.toc_entry.create({ level: h.level, text: h.text, tocId: h.tocId }))

    const toc = wordSchema.nodes.toc.create({ maxLevel }, entries)
    if (dispatch) {
      tr.replaceSelectionWith(toc)
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

Wichtig: `tr.setNodeAttribute` (mehrfach) + `tr.replaceSelectionWith` laufen auf **derselben**
`Transform`-Kette, ein einziger `dispatch`-Aufruf → ein einziger Undo-Schritt (Anforderung 2.7,
gleiches Muster wie `insertPageBreak` in `seitenumbruch-code.md` Abschnitt 3.2). Wenn `entries`
leer ist (kein Heading im Dokument bzw. keins ≤ `maxLevel`), entsteht ein `toc`-Node mit
`content: []` — sichtbar über CSS-Platzhalter (Abschnitt 7), erfüllt Grenzfall 2 ohne
Sonderfall-Code.

### 3.3 `updateTableOfContentsAt(pos: number): Command` — neu (Minimal-Umsetzung, siehe Entscheidung 1.11)

```ts
export function updateTableOfContentsAt(pos: number): Command {
  return (state, dispatch) => {
    const node = state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'toc') return false

    const tr = state.tr
    const ids = existingTocIds(tr.doc)
    tr.doc.descendants((n, p) => {
      if (n.type.name === 'heading' && !n.attrs.tocId) tr.setNodeAttribute(p, 'tocId', generateUniqueTocId(ids))
    })

    const maxLevel = node.attrs.maxLevel
    const entries = collectHeadings(tr.doc)
      .filter((h) => h.level <= maxLevel)
      .map((h) => wordSchema.nodes.toc_entry.create({ level: h.level, text: h.text, tocId: h.tocId }))

    if (dispatch) {
      const mappedPos = tr.mapping.map(pos)
      const target = tr.doc.nodeAt(mappedPos)
      if (!target || target.type.name !== 'toc') return false // structure changed unexpectedly mid-transaction — abort safely
      tr.replaceWith(mappedPos + 1, mappedPos + target.nodeSize - 1, entries)
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

Respektiert die beim Einfügen gewählte `maxLevel` (liest sie aus dem Node selbst, setzt sie nie
zurück) — erfüllt exakt die in `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 0.6 verlangte
Mindestanforderung „Konfiguration wird respektiert, nicht auf Standardwert zurückgesetzt".

### 3.4 `navigateToTocEntry(view: EditorView, tocId: string): boolean` — neu

```ts
export function navigateToTocEntry(view: EditorView, tocId: string): boolean {
  let targetPos: number | null = null
  view.state.doc.descendants((node, pos) => {
    if (targetPos !== null) return false
    if (node.type.name === 'heading' && node.attrs.tocId === tocId) {
      targetPos = pos
      return false
    }
    return true
  })
  if (targetPos === null) return false // Grenzfall 13 — Ziel existiert nicht mehr

  const $target = view.state.doc.resolve(targetPos + 1)
  const tr = view.state.tr.setSelection(TextSelection.near($target)).scrollIntoView()
  view.dispatch(tr)
  view.focus()
  return true
}
```

Volltext-Traversierung von `view.state.doc` bei jedem Klick (nicht die beim Einfügen gültige
Position, siehe Entscheidung 1.4) — funktioniert dokumentweit, unabhängig von
`pagination.ts`-Seitenumbrüchen (Anforderung 2.6) und unabhängig davon, ob die Zielüberschrift
seit dem Einfügen verschoben wurde.

### 3.5 Export-Ergänzung

`collectHeadings`, `insertTableOfContents`, `updateTableOfContentsAt`, `navigateToTocEntry`,
`HeadingRef` zur bestehenden Exportliste hinzufügen. Zusätzliche Importe:
`import type { Node as PMNode } from 'prosemirror-model'`, `import { TextSelection } from
'prosemirror-state'`, `import type { EditorView } from 'prosemirror-view'`.

---

## 4. Neue Datei: `src/formats/shared/tocConfig.ts`

Zentrale Konstanten, analog zu `tableConfig.ts` aus `tabelle-einfuegen-code.md` Abschnitt 2.1
(auch wenn jene Datei noch nicht existiert — dasselbe Muster wird hier unabhängig etabliert):

```ts
export const MIN_TOC_LEVEL = 1
export const MAX_TOC_LEVEL = 6
export const DEFAULT_TOC_LEVEL = 3
export const TOC_EMPTY_PLACEHOLDER_TEXT = 'Keine Überschriften gefunden'
```

---

## 5. Neue Datei: `src/formats/shared/editor/InsertTocDialog.tsx`

Kompletter neuer Dialog, gebaut auf dem `PrivacyModal.tsx`-Overlay-Muster (siehe Zusatzbefund D,
Abschnitt 0.4) — Fokus-Falle/Escape/Backdrop-Klick sind **komplett neu**, nicht übernommen.

```ts
interface InsertTocDialogProps {
  initialMaxLevel: number
  onConfirm: (maxLevel: number) => void
  onCancel: () => void
}
```

Verhalten (Anforderung Abschnitt 2.1/2.2, Grenzfall 1):
- Root: `role="dialog" aria-modal="true" aria-labelledby="insert-toc-dialog-title"`.
- Ein `<select aria-label="Ebenentiefe">` mit Optionen 1–6 (`MIN_TOC_LEVEL`…`MAX_TOC_LEVEL` aus
  `tocConfig.ts`), Standardwert `initialMaxLevel` (App-seitig immer `DEFAULT_TOC_LEVEL = 3` beim
  ersten Öffnen, siehe Toolbar-Anbindung Abschnitt 6). `<select>` statt Freitext-Zahlenfeld, weil
  die Werteliste klein und geschlossen ist (1–6) — keine Validierungsfehlermeldung wie beim
  Tabellen-Dialog nötig, jede Auswahl ist per Konstruktion gültig.
- `useEffect` beim Mount: Fokus auf das `<select>` (Anforderung Zeile 110: „Fokus liegt beim
  Öffnen auf dem ersten Eingabeelement").
- Fokus-Falle per `onKeyDown` (Tab/Shift+Tab zwischen `select`/„Abbrechen"/„Einfügen" umlaufend),
  `Escape` → `onCancel()`, Backdrop-`onMouseDown` mit
  `if (e.target === e.currentTarget) onCancel()` — identisches Muster wie in
  `tabelle-einfuegen-code.md` Abschnitt 2.2 spezifiziert.
- `<form onSubmit={(e) => { e.preventDefault(); onConfirm(Number(level)) }}>` — „Einfügen"
  (`type="submit"`) und „Abbrechen" (`type="button"`, `onClick={onCancel}`).
- **Kein** Fehlerzustand möglich (anders als beim Tabellen-Dialog) — jede Auswahl im `<select>`
  ist per Konstruktion eine gültige Ebene, daher kein `parseTableDimension`-Äquivalent nötig.

---

## 6. `src/formats/shared/editor/Toolbar.tsx` — neue Gruppe „Referenzen"

1. Neue Imports: `InsertTocDialog` aus `./InsertTocDialog`, `insertTableOfContents` aus
   `./commands`, `DEFAULT_TOC_LEVEL` aus `../tocConfig`.
2. Neuer lokaler State (gleiche Überlegung wie `tabelle-einfuegen-code.md` Abschnitt 3.3 Punkt 2 —
   `Toolbar` wird nur einmal pro `WordEditor`-Mount instanziiert, State überlebt
   öffnen/schließen-Zyklen innerhalb einer Sitzung, kein `localStorage`):
   ```ts
   const [tocDialogOpen, setTocDialogOpen] = useState(false)
   ```
3. Neue Gruppe **nach** dem bestehenden Bild-Label (Zeile 241–244), als letzte Gruppe der
   Toolbar (Anforderung Zeile 85: „eigene Gruppe 'Referenzen'"):
   ```tsx
   <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

   <button
     type="button"
     title="Inhaltsverzeichnis einfügen"
     aria-label="Inhaltsverzeichnis einfügen"
     aria-haspopup="dialog"
     aria-expanded={tocDialogOpen}
     onMouseDown={(e) => {
       e.preventDefault()
       setTocDialogOpen(true)
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
   >
     <TocIcon />
   </button>
   {tocDialogOpen && (
     <InsertTocDialog
       initialMaxLevel={DEFAULT_TOC_LEVEL}
       onConfirm={(maxLevel) => {
         run(view, insertTableOfContents(maxLevel))
         setTocDialogOpen(false)
       }}
       onCancel={() => {
         setTocDialogOpen(false)
         view.focus()
       }}
     />
   )}
   ```
4. **Kein** `view.focus()` beim Öffnen (Grenzfall 1: Cursor/Selektion bleiben exakt erhalten,
   gleiches Muster wie `tabelle-einfuegen-code.md` Abschnitt 3.3 Punkt 4).
5. `TocIcon` — eingebettetes SVG (kein Emoji/Unicode), analog zur in `seitenumbruch-code.md`
   Abschnitt 5 begründeten Konvention (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1): drei
   horizontale Linien unterschiedlicher Einzug-Länge, symbolisiert Verzeichnis-Einträge
   unterschiedlicher Ebene:
   ```tsx
   function TocIcon() {
     return (
       <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
         <path d="M2 3h12M2 8h9M4 13h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
       </svg>
     )
   }
   ```

---

## 7. `src/index.css` — Ergänzung nach Zeile 71 (siehe Zusatzbefund D)

```css
.ProseMirror .pm-toc {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.6em 0.8em;
  margin: 0.6em 0;
}

/* Zielt bewusst auf das leere Content-Kind `.pm-toc-body`, NICHT auf `.pm-toc`:
   `.pm-toc` enthält immer den statischen Header (Abschnitt 2), matcht `:empty` also nie. */
.ProseMirror .pm-toc-body:empty::after {
  content: 'Keine Überschriften gefunden';
  color: #6b7280;
  font-style: italic;
}

.ProseMirror .pm-toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4em;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.ProseMirror .pm-toc-refresh {
  font: inherit;
  font-weight: 400;
  font-size: 0.75rem;
  color: #2563eb;
  background: none;
  border: 1px solid #2563eb;
  border-radius: 3px;
  padding: 0.1em 0.6em;
  cursor: pointer;
}

.ProseMirror .pm-toc-entry {
  display: block;
  padding: 0.15em 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.ProseMirror .pm-toc-entry:hover {
  text-decoration: underline;
}

.ProseMirror .pm-toc-level-1 { padding-left: 0; font-weight: 600; }
.ProseMirror .pm-toc-level-2 { padding-left: 1.2em; }
.ProseMirror .pm-toc-level-3 { padding-left: 2.4em; }
.ProseMirror .pm-toc-level-4 { padding-left: 3.6em; }
.ProseMirror .pm-toc-level-5 { padding-left: 4.8em; }
.ProseMirror .pm-toc-level-6 { padding-left: 6em; }

/* Transient feedback when a clicked entry's target heading no longer exists (Grenzfall 13) —
   toggled/cleared directly via DOM classList from tocPlugin.ts, not driven by editor state. */
.ProseMirror .pm-toc-entry--missing {
  animation: pm-toc-missing-flash 1.2s ease-out;
}
@keyframes pm-toc-missing-flash {
  0% { background: #fee2e2; }
  100% { background: transparent; }
}
```

Einrückung pro Ebene bewusst via CSS-Klasse (`pm-toc-level-N`), nicht via Inline-`style` im
`toDOM` — konsistent mit dem restlichen Editor, der Ausrichtung ebenfalls über CSS-Klassen/Styles
statt Inline-Berechnung im Markup abbildet, und einfacher in Playwright über
`toHaveClass(/pm-toc-level-2/)` zu testen als über berechnete Pixel-Werte.

---

## 8. Neue Datei: `src/formats/shared/editor/tocPlugin.ts`

Eigene Datei für die ProseMirror-`Plugin`-Instanz (gleiches Architekturmuster wie
`pagination.ts` — Plugin-Logik separat von reinen `Command`-Funktionen in `commands.ts`).

```ts
import { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { navigateToTocEntry, updateTableOfContentsAt } from './commands'

export function createTocInteractionPlugin(): Plugin {
  return new Plugin({
    props: {
      handleClickOn(view: EditorView, pos, node, nodePos, event) {
        const target = event.target as HTMLElement

        if (node.type.name === 'toc' && target.closest('[data-toc-refresh]')) {
          updateTableOfContentsAt(nodePos)(view.state, view.dispatch)
          view.focus()
          return true
        }

        if (node.type.name === 'toc_entry') {
          const tocId = node.attrs.tocId as string | null
          const handled = tocId ? navigateToTocEntry(view, tocId) : false
          if (!handled) {
            const el = target.closest('.pm-toc-entry') as HTMLElement | null
            el?.classList.add('pm-toc-entry--missing')
            setTimeout(() => el?.classList.remove('pm-toc-entry--missing'), 1200)
          }
          return true
        }

        return false
      },
    },
  })
}
```

**Zusammenspiel mit `reconcileSelectionOnClick` (Grenzfall 18/Anforderung 2.6 letzter Satz) —
verifiziert durch Code-Lektüre, muss trotzdem per Test bestätigt werden:** ProseMirrors eigene
Klick-Erkennung (die `handleClickOn` aufruft) ist intern an denselben nativen `mouseup` gebunden,
den auch `reconcileSelectionOnClick` abhört (`WordEditor.tsx:103–104`). Da die `EditorView`
während ihrer Konstruktion (`WordEditor.tsx:89`) ihre eigenen internen DOM-Listener **vor** dem
zusätzlichen `view.dom.addEventListener('mouseup', onMouseUp)` (Zeile 104, läuft **nach**
Konstruktion) registriert, feuert ProseMirrors interne Klick-Verarbeitung (und damit
`handleClickOn`) **zuerst**. Ein erfolgreicher Sprung (`navigateToTocEntry` gibt `true` zurück)
setzt die Selektion bereits **vor** `reconcileSelectionOnClick` auf eine leere `TextSelection` an
der Zielüberschrift — `reconcileSelectionOnClick`s erste Zeile (`if (view.state.selection.empty)
return`) beendet die Funktion dann sofort, ohne einzugreifen. Kein Konflikt zu erwarten, **muss
aber** über die in Abschnitt 12.2 vorgesehene Testfall-10/Grenzfall-18-Regressionssequenz
**inklusive eines ToC-Klicks** bestätigt werden, nicht nur durch diese Analyse.

`WordEditor.tsx` — Ergänzung: Import `createTocInteractionPlugin` aus `./tocPlugin`, in das
bestehende `plugins: [...]`-Array (Zeilen 69–86) aufnehmen, z. B. direkt nach
`createPaginationPlugin()`. **Keine sonstige Änderung** an `WordEditor.tsx` nötig.

---

## 9. DOCX-Export — `src/formats/docx/writer.ts` + `src/formats/docx/styleDefs.ts`

### 9.1 Vorab-Durchlauf: referenzierte `tocId`s + Bookmark-Ids sammeln

Neue Hilfsklasse (gleiches Zähler-Registrierungsmuster wie `RelationshipRegistry`,
`relationships.ts:8–17`):

```ts
class BookmarkAllocator {
  private counter = 0
  private idByTocId = new Map<string, string>()

  /** Returns a stable numeric w:id string for a given tocId, allocating on first use. */
  idFor(tocId: string): string {
    let id = this.idByTocId.get(tocId)
    if (!id) {
      id = String(this.counter++)
      this.idByTocId.set(tocId, id)
    }
    return id
  }
}

function collectReferencedTocIds(nodes: JsonNode[] | undefined, into: Set<string>): void {
  for (const node of nodes ?? []) {
    if (node.type === 'toc') {
      for (const entry of node.content ?? []) {
        const id = entry.attrs?.tocId as string | null | undefined
        if (id) into.add(id)
      }
    }
    collectReferencedTocIds(node.content, into)
  }
}
```

In `writeDocx()`: vor dem Aufruf von `blocksToDocx(...)` einen `Set<string>` über `doc.body`
(und `doc.header`/`doc.footer`, defensiv — siehe Grenzfall 19) aufbauen und eine
`BookmarkAllocator`-Instanz erzeugen; beides zusätzlich durch `blockToDocx`/`blocksToDocx`
durchreichen (neuer Parameter `tocCtx: { referencedIds: Set<string>; bookmarks: BookmarkAllocator
}`, analog zu `images`/`rels`).

### 9.2 `blockToDocx` — Fall `'heading'` (aktuell Zeilen 106–111) — Bookmark-Wrapping

```ts
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
  const inner = `<w:p>${paragraphPropsXml(align, styleTag)}${inlineToRuns(node.content)}</w:p>`
  const tocId = node.attrs?.tocId as string | null | undefined
  if (tocId && tocCtx.referencedIds.has(tocId)) {
    const bmId = tocCtx.bookmarks.idFor(tocId)
    // bookmarkStart/End sit INSIDE the paragraph's own <w:p>, wrapped around its runs —
    // valid per OOXML (bookmarks may span partial paragraph content or a whole paragraph).
    // Simpler & safe here: wrap around the *entire* generated <w:p> is NOT valid XML nesting
    // (bookmarkStart/End must be siblings of runs, not of the <w:p> itself) — so this inserts
    // the bookmark tags as the first/last children *inside* the <w:p>, around the run content.
    return (
      `<w:p>${paragraphPropsXml(align, styleTag)}` +
      `<w:bookmarkStart w:id="${bmId}" w:name="_Toc${tocId}"/>` +
      `${inlineToRuns(node.content)}` +
      `<w:bookmarkEnd w:id="${bmId}"/>` +
      `</w:p>`
    )
  }
  return inner
}
```

### 9.3 `blockToDocx` — neuer Fall `'toc'`

```ts
const TOC_INSTR = (maxLevel: number) => ` TOC \\o "1-${maxLevel}" \\h \\z \\u `

case 'toc': {
  const maxLevel = Number(node.attrs?.maxLevel ?? 3)
  const entries = node.content ?? []

  const fieldStart =
    `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve">${TOC_INSTR(maxLevel)}</w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>`

  const cached = entries.length
    ? entries
        .map((entry) => {
          const level = Number(entry.attrs?.level ?? 1)
          const text = escapeXml(String(entry.attrs?.text ?? ''))
          const tocId = entry.attrs?.tocId as string | null | undefined
          const styleTag = `<w:pStyle w:val="${TOC_ENTRY_STYLE_ID(level)}"/>`
          const runs = tocId
            ? `<w:hyperlink w:anchor="_Toc${tocId}"><w:r><w:t>${text}</w:t></w:r></w:hyperlink>`
            : `<w:r><w:t>${text}</w:t></w:r>`
          return `<w:p>${paragraphPropsXml('left', styleTag)}${runs}</w:p>`
        })
        .join('')
    : `<w:p>${paragraphPropsXml('left')}<w:r><w:t>Keine Überschriften gefunden</w:t></w:r></w:p>`

  const fieldEnd = `<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`

  return fieldStart + cached + fieldEnd
}
```

`\\o "1-N" \\h \\z \\u` ist die vom `TOC`-Feld in echtem Word erzeugte Standard-Instruktion
(„Outline levels 1 bis N, Hyperlinks, ausgeblendete Seitenzahlen bei Weblayout unterdrücken,
Gliederungsebenen verwenden") — identisch zu dem in der Anforderung Zeile 91/304 selbst
genannten Beispiel. Die gecachten Absätze sind bewusst **einfach** gehalten (kein `PAGEREF`-Feld
für Seitenzahlen, siehe Entscheidung 1.3 — Word überschreibt den Cache bei F9 ohnehin komplett).

### 9.4 `styleDefs.ts` — neue `TOC1`…`TOC6`-Absatzformate

```ts
export function TOC_ENTRY_STYLE_ID(level: number): string {
  return `TOC${level}`
}

export function tocEntryStylesXml(): string {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => {
      const indentTwips = (level - 1) * 240
      return (
        `<w:style w:type="paragraph" w:styleId="${TOC_ENTRY_STYLE_ID(level)}"><w:name w:val="toc ${level}"/>` +
        `<w:basedOn w:val="Normal"/>` +
        `<w:pPr><w:ind w:left="${indentTwips}"/></w:pPr>` +
        `</w:style>`
      )
    })
    .join('')
}
```
In `headingStylesXml()` (Zeile 22–29) wird `tocEntryStylesXml()` in die Style-Konkatenation
aufgenommen (neben den bestehenden `HeadingN`-Styles), analog zum bereits etablierten Muster.

### 9.5 `writeDocx()` — Verdrahtung

`bodyXml`, `headerXml`, `footerXml` (Zeilen 226–243) erhalten den neuen `tocCtx`-Parameter in
ihren `blocksToDocx(...)`-Aufrufen; `tocCtx` wird **einmal pro `writeDocx()`-Aufruf** gebaut
(gemeinsam für Body **und** Header/Footer — dokumentweite Bookmark-Eindeutigkeit, siehe
Entscheidung 1.9).

---

## 10. DOCX-Import — `src/formats/docx/reader.ts`

### 10.1 Bookmark-Erkennung auf Überschriften

`paragraphToBlocks()` (aktuell Zeilen 146–183) liest zusätzlich `w:bookmarkStart`/`w:bookmarkEnd`
innerhalb des `<w:p>`: falls ein `w:bookmarkStart` mit `w:name` beginnend `_Toc` gefunden wird,
wird dessen (um das `_Toc`-Präfix bereinigter) Name als `tocId`-Attribut auf das erzeugte
`heading`-JsonNode gesetzt (nur relevant, wenn der Absatz ohnehin schon als Heading erkannt
wurde — ein Bookmark auf einem Nicht-Heading-Absatz wird ignoriert, das ist außerhalb des
Geltungsbereichs dieses Features).

### 10.2 Feld-Erkennung (`fldChar`/`instrText`-Quadrupel) — neue Vorab-Passage über `bodyEl.children`

**Kernidee:** `readBodyChildren()` (aktuell Zeilen 307–328) iteriert bereits linear über
`Array.from(bodyEl.children)`. Diese Iteration bekommt einen zusätzlichen Zustand
„befinde ich mich gerade innerhalb eines TOC-Feldes" (zwischen `fldCharType="begin"` mit
`TOC`-Instruktion und dem zugehörigen `fldCharType="end"`):

```ts
function paragraphFieldMarkers(pEl: Element): { begin: boolean; separate: boolean; end: boolean; instrText: string } {
  let begin = false, separate = false, end = false, instrText = ''
  for (const rEl of childElements(pEl, OOXML_NAMESPACES.w, 'r')) {
    for (const child of Array.from(rEl.children)) {
      if (child.localName === 'fldChar') {
        const type = child.getAttributeNS(OOXML_NAMESPACES.w, 'fldCharType')
        if (type === 'begin') begin = true
        if (type === 'separate') separate = true
        if (type === 'end') end = true
      }
      if (child.localName === 'instrText') instrText += child.textContent ?? ''
    }
  }
  return { begin, separate, end, instrText }
}

function tocMaxLevelFromInstr(instrText: string): number {
  const match = /\\o\s*"(\d)-(\d)"/.exec(instrText)
  return match ? Math.min(6, Math.max(1, Number(match[2]))) : 3
}
```

In `readBodyChildren` (bzw. einer neuen Variante davon, die den zusätzlichen Zustand hält):
solange kein `fldChar begin` mit `TOC`-Instruktion gesehen wurde, Verhalten **unverändert**. Wird
eins gefunden: alle nachfolgenden `<w:p>`-Kinder werden **konsumiert und verworfen** (nicht in
`items` aufgenommen), bis ein `<w:p>` mit `fldChar end` erscheint (inklusive dieses Absatzes) —
an dieser Stelle wird **ein** `{ type: 'toc', attrs: { maxLevel }, content: [] }`-Platzhalter in
`items` eingefügt (`content` wird erst im Post-Processing gefüllt, siehe Abschnitt 11). Wird bis
zum Ende von `bodyEl.children` **kein** `end` gefunden (korrupte/unerwartete Datei), wird der
Konsum-Zustand am Ende der Schleife sicherheitshalber abgebrochen und **kein** `toc`-Platzhalter
erzeugt — die konsumierten Absätze sind dann zwar verloren (seltener Grenzfall einer
kaputten Datei), aber es gibt **keinen Absturz und keine Endlosschleife**, was die
Mindestanforderung aus Grenzfall 16 erfüllt (kein Crash; ein Datenverlust bei nachweislich
korrupten Feld-Markierungen ohne `end` ist ein deutlich engerer, akzeptabler Rand- statt
Kernfall — **muss aber während der Umsetzung gegen die synthetische Fixture aus Abschnitt 12.3
verifiziert werden**, inklusive eines dedizierten „kein `end`-Marker vorhanden"-Testfalls).

**Fallback für Grenzfall 16 (kein stiller Totalverlust):** Falls unter den konsumierten
Cache-Absätzen sichtbarer Text steht, dieser aber nach dem Post-Processing (Abschnitt 11) zu
keinem einzigen Entry führt (z. B. weil keine der referenzierten Bookmarks im Dokument gefunden
wurde), wird ersatzweise der **rohe Text der konsumierten Cache-Absätze** als Entries mit
`tocId: null` verwendet (klickbar-inaktiv, aber sichtbar — siehe Abschnitt 11.3).

### 10.3 Block-level-`<w:sdt>` im Body — PFLICHT für DoD-Punkt 9 / Grenzfall 16 (in 2. Re-Verifikation 2026-07-05 als **fehlende Kernbehandlung** nachgetragen)

**Befund (Lücke der Erstfassung):** Abschnitt 10.2 oben behandelt **nur** die klassische Feld-Form,
bei der die Eintrags-`<w:p>` **direkte** Body-Kinder sind. Die Anforderung verlangt aber in
Befund 8 / Grenzfall 16 / DoD-Punkt 9 **ausdrücklich** auch die verlustfreie Behandlung der
**modernen Word-Standardform**, bei der das gesamte Verzeichnis in einen **block-level `<w:sdt>`**
gewickelt ist. Der bestätigte Ist-Stand (`reader.ts:472–481`, direkt gelesen 2026-07-05): die
Schleife in `readBodyChildren` prüft `child.localName` nur auf `'p'` und `'tbl'` — ein
block-level `<w:sdt>` (Kind von `<w:body>`) trifft **keinen** Zweig und wird **komplett
übersprungen** → stiller Totalverlust. Der `w:sdt`-Fallback in `collectRuns` (`reader.ts:209–211`)
greift **nur inline** innerhalb eines `<w:p>`, **nicht** für einen block-level-`<w:sdt>`-Rahmen um
mehrere Absätze. **Die Erstfassung dieses Plans hat diesen Fall nirgends adressiert — er ist hier
zwingend zu ergänzen, sonst bleibt DoD-Punkt 9 (DOCX-Teil) unerfüllt und Testfall 14 (block-level-
`<w:sdt>`-Fixture) rot.**

**Umsetzung:** In `readBodyChildren` einen dritten Zweig ergänzen, der einen block-level `<w:sdt>`
**auspackt** und dessen `<w:sdtContent>`-Kinder **rekursiv wie Body-Kinder** weiterverarbeitet.
Weil der Auspack-Schritt dieselbe Iterations-/Feld-Erkennungslogik (Abschnitt 10.2) auf die inneren
`<w:p>` anwendet, wird ein in `<w:sdt>` gewickeltes TOC-Feld dabei **automatisch** als `toc`-
Platzhalter erkannt; enthält der `<w:sdt>` beliebigen Nicht-TOC-Inhalt (irgendein Content-Control),
bleibt dessen sichtbarer Text als gewöhnliche Blöcke erhalten — beides erfüllt „kein stiller
Totalverlust" (Abschnitt 18 der Hauptspezifikation), nicht nur für Verzeichnisse.

```ts
// Refaktor: die eigentliche Iteration über eine Element-Kinderliste in eine
// wiederverwendbare Funktion ziehen, die readBodyChildren UND der sdtContent-Auspack teilen.
// (Der TOC-Feld-Zustand aus Abschnitt 10.2 wird als Parameter mitgereicht, damit ein Feld,
//  das eine sdt-Grenze überspannt, nicht mittendrin abreißt — im Normalfall liegt es
//  vollständig innerhalb genau eines sdtContent.)
function appendBodyLikeChildren(parentEl: Element, /* …headingInfo, imageRels, fieldState… */): void {
  for (const child of Array.from(parentEl.children)) {
    if (child.namespaceURI !== OOXML_NAMESPACES.w) continue
    if (child.localName === 'p') {
      // …unveränderte w:p-Behandlung inkl. TOC-Feld-Zustandsmaschine aus Abschnitt 10.2…
    } else if (child.localName === 'tbl') {
      // …unveränderte w:tbl-Behandlung…
    } else if (child.localName === 'sdt') {
      // NEU: block-level Structured Document Tag — in seinen sdtContent absteigen und
      // dessen Kinder so behandeln, als stünden sie direkt im Body (rekursiv, damit ein
      // darin liegendes TOC-Feld regulär als toc-Platzhalter erkannt wird).
      const sdtContent = firstChildNS(child, OOXML_NAMESPACES.w, 'sdtContent')
      if (sdtContent) appendBodyLikeChildren(sdtContent, /* … */)
      // Kein sdtContent → nichts sichtbar Verwertbares, überspringen (kein Crash).
    }
  }
}
```

**Minimal-Alternative, falls die Refaktorierung zu invasiv erscheint:** statt des rekursiven
Auspackens den block-level `<w:sdt>`-Inhalt in einen `unsupported_block` aufnehmen (dessen
`sdtContent`-Absätze über `paragraphToBlocks` als dessen `content`) — erhält den sichtbaren Text
(erfüllt DoD-Punkt 9 als Minimum), verliert aber die TOC-Wiedererkennung. **Bevorzugt wird das
rekursive Auspacken**, weil es die Rundreise-Anforderung (Abschnitt 4.1 Punkt 4, Form (b): „muss
grün werden") vollständiger erfüllt: das reimportierte Verzeichnis bleibt ein `toc`-Element, statt
zu `unsupported_block` zu degradieren.

**Synthetische Fixture (Abschnitt 15.3 erweitern):** die dort gebaute `buildDocxWithTocField()`-
Hilfe muss **beide** Formen liefern — (a) Feld-Tripel mit Eintrags-`<w:p>` als direkte Body-Kinder
**und** (b) denselben Inhalt zusätzlich in `<w:sdt><w:sdtContent>…</w:sdtContent></w:sdt>` gewickelt
— exakt wie Anforderung 4.1 Punkt 4 / Testfall 14 fordert. Zusätzlicher dedizierter Testfall: ein
block-level `<w:sdt>` **ohne** TOC-Feld (z. B. ein einfaches Content-Control um einen Absatz) →
Text bleibt erhalten, es entsteht **kein** `toc`-Knoten (Baseline-Regressionsschutz, Testfall 19).

---

## 11. Gemeinsame Nachbearbeitung — neue Datei `src/formats/shared/tocJson.ts`

Da sowohl der DOCX- als auch der ODT-Reader nach dem eigentlichen Parsen einen `toc`-Platzhalter
mit leerem `content` produzieren (Abschnitt 10.2 bzw. 13.1), aber die zugehörigen Überschriften
teils **später** im Dokument als der Platzhalter selbst geparst werden (ein Verzeichnis kann laut
Anforderung an beliebiger Cursor-Position stehen, auch **vor** allen referenzierten
Überschriften), braucht es einen **zweiten Durchlauf** über den bereits vollständig aufgebauten
Block-Baum — gemeinsam genutzt von beiden Readern, um Duplizierung zu vermeiden:

```ts
export interface JsonNodeLike {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNodeLike[]
}

/** In-place: assigns a fresh, unique tocId to every heading lacking one, IF at least one
 *  `toc` placeholder exists anywhere in the tree — mirrors insertTableOfContents()'s own
 *  lazy-assignment policy (commands.ts) so freshly-imported and freshly-inserted documents
 *  behave identically. */
export function resolveTocPlaceholders(blocks: JsonNodeLike[], fallbackCachedTextByTocIndex: string[][] = []): void {
  if (!containsTocPlaceholder(blocks)) return

  const headings: Array<{ level: number; text: string; node: JsonNodeLike }> = []
  let idCounter = 0
  const usedIds = new Set<string>()

  // PASS 0 (in 2. Re-Verifikation 2026-07-05 als Bugfix ergänzt): usedIds ZUERST mit ALLEN
  // bereits vorhandenen heading.tocId-Werten seeden. Beim DOCX-Reimport tragen Überschriften,
  // deren Bookmark `_Toc<id>` erkannt wurde (Abschnitt 10.1), bereits eine tocId wie `h0`.
  // Ohne dieses Seeding würde der Generator unten für eine id-lose Überschrift erneut `h0`
  // erzeugen (Zähler startet bei 0, prüft nur frisch vergebene ids) → Kollision zweier
  // Überschriften mit derselben tocId → Klick-/Bookmark-Ziel mehrdeutig (verletzt Grenzfall 21).
  visit(blocks, (node) => {
    if (node.type === 'heading' && node.attrs?.tocId) usedIds.add(String(node.attrs.tocId))
  })

  visit(blocks, (node) => {
    if (node.type === 'heading') {
      if (!node.attrs) node.attrs = {}
      if (!node.attrs.tocId) {
        let id: string
        do { id = `h${idCounter++}` } while (usedIds.has(id))
        usedIds.add(id)
        node.attrs.tocId = id
      }
      headings.push({ level: Number(node.attrs.level ?? 1), text: plainTextOf(node), node })
    }
  })

  let tocIndex = 0
  visit(blocks, (node) => {
    if (node.type === 'toc') {
      const maxLevel = Number(node.attrs?.maxLevel ?? 3)
      const filtered = headings.filter((h) => h.level <= maxLevel)
      node.content = filtered.length
        ? filtered.map((h) => ({ type: 'toc_entry', attrs: { level: h.level, text: h.text, tocId: h.node.attrs!.tocId } }))
        : (fallbackCachedTextByTocIndex[tocIndex] ?? []).map((text) => ({
            type: 'toc_entry',
            attrs: { level: 1, text, tocId: null },
          }))
      tocIndex += 1
    }
  })
}

function containsTocPlaceholder(blocks: JsonNodeLike[]): boolean {
  return blocks.some((b) => b.type === 'toc' || (b.content && containsTocPlaceholder(b.content)))
}

function visit(blocks: JsonNodeLike[], fn: (node: JsonNodeLike) => void): void {
  for (const b of blocks) {
    fn(b)
    if (b.content) visit(b.content, fn)
  }
}

function plainTextOf(node: JsonNodeLike): string {
  return (node.content ?? [])
    .map((c) => (c.type === 'text' ? String((c as { text?: string }).text ?? '') : c.type === 'hard_break' ? ' ' : ''))
    .join('')
}
```

Beide Reader rufen `resolveTocPlaceholders(bodyBlocks, cachedFallbackTexts)` (und analog für
`headerBlocks`/`footerBlocks`, defensiv, siehe Grenzfall 19) **nach** dem vollständigen Aufbau
des jeweiligen Block-Baums auf, unmittelbar bevor das Ergebnis in `WordDocumentContent`
zurückgegeben wird (`readDocx`: nach Zeile 346/363/372 vor Zeile 384; `readOdt`: nach Zeile 248
vor Zeile 279 — siehe Abschnitte 10/13). `fallbackCachedTextByTocIndex` transportiert die in
Abschnitt 10.2/13.2 beim ersten Durchlauf gesammelten rohen Cache-Texte (ein `string[]` pro
gefundenem `toc`-Platzhalter, in Auftrittsreihenfolge) für den in Abschnitt 10.2 beschriebenen
Fallback.

**Wichtig — bewusste Vereinfachung, dokumentiert:** Diese Funktion behandelt „Überschrift" rein
strukturell über `node.type === 'heading'`, unabhängig davon, ob sie innerhalb einer Tabelle/Liste
verschachtelt ist (`visit` steigt rekursiv in `content` ab) — konsistent mit der Tatsache, dass
`heading` im Schema selbst überall erlaubt ist, wo `block` erlaubt ist (siehe
`seitenumbruch-code.md` Abschnitt 1.3 für dieselbe Beobachtung bei `breakBefore`).

---

## 12. ODT-Export — `src/formats/odt/writer.ts` + `src/formats/odt/styleRegistry.ts`

### 12.1 `blockToOdt()` — neuer Fall `'toc'`

```ts
case 'toc': {
  const maxLevel = Number(node.attrs?.maxLevel ?? 3)
  const entries = node.content ?? []
  const entryTemplates = Array.from({ length: maxLevel }, (_, i) => {
    const level = i + 1
    return (
      `<text:table-of-content-entry-template text:outline-level="${level}" text:style-name="${tocEntryStyleName(level)}">` +
      `<text:index-entry-link-start text:style-name="Index_20_Link"/>` +
      `<text:index-entry-chapter/><text:index-entry-text/>` +
      `<text:index-entry-tab-stop style:type="right" style:leader-char="."/>` +
      `<text:index-entry-page-number/><text:index-entry-link-end/>` +
      `</text:table-of-content-entry-template>`
    )
  }).join('')

  const bodyParagraphs = entries.length
    ? entries
        .map((entry) => {
          const level = Number(entry.attrs?.level ?? 1)
          const text = escapeXml(String(entry.attrs?.text ?? ''))
          const styleName = tocEntryStyleName(level)
          // Native LibreOffice/AOO link convention verified against a real fixture
          // (tests/fixtures/external/odt/test1.odt) — "#<heading text>|outline" navigates
          // directly to the heading with that exact text, no bookmark required (see plan
          // Abschnitt 0.2/1.6). Falls back to a plain (non-linked) entry when text is empty.
          const inner = text
            ? `<text:a xlink:type="simple" xlink:href="#${encodeURIComponent(String(entry.attrs?.text ?? ''))}|outline">${text}</text:a>`
            : text
          return `<text:p text:style-name="${styleName}">${inner}</text:p>`
        })
        .join('')
    : `<text:p text:style-name="${tocEntryStyleName(1)}">Keine Überschriften gefunden</text:p>`

  return (
    `<text:table-of-content text:style-name="Sect1" text:name="TableOfContents1" text:protected="false">` +
    `<text:table-of-content-source text:outline-level="${maxLevel}">` +
    `<text:index-title-template text:style-name="Contents_20_Heading">Inhaltsverzeichnis</text:index-title-template>` +
    entryTemplates +
    `</text:table-of-content-source>` +
    `<text:index-body>` +
    `<text:index-title text:name="TableOfContents1_Head"><text:p text:style-name="Contents_20_Heading">Inhaltsverzeichnis</text:p></text:index-title>` +
    bodyParagraphs +
    `</text:index-body>` +
    `</text:table-of-content>`
  )
}
```

Struktur (`text:table-of-content` → `text:table-of-content-source` mit
`text:table-of-content-entry-template`s → `text:index-body` mit gecachten `text:p`) folgt exakt
dem in `test1.odt`/`compdocfileformat.odt` real beobachteten Aufbau (Abschnitt 0.2) — kein
frei erfundenes Format, sondern gegen echte LibreOffice-Ausgabe abgeglichen. `xlink:href` nutzt
`encodeURIComponent` für Sonderzeichen/Leerzeichen im Überschriftentext (Grenzfall 14) — muss
während der Umsetzung gegen LibreOffice-Verhalten verifiziert werden (reales `#Text|outline` in
`test1.odt` verwendet **unkodierte** Leerzeichen direkt im `href`, siehe Zitat in Abschnitt 0.2 —
ggf. `encodeURIComponent` durch reines `escapeXml` ersetzen, falls LibreOffice das codierte
Format nicht akzeptiert; als Fallback-Entscheidung vorgemerkt, siehe Abschnitt 14).

### 12.2 `styleRegistry.ts` — neue `TocN`-Absatzstile

```ts
export function tocEntryStyleName(level: number): string {
  return `Toc${level}`
}

export function tocEntryStyleDefs(): string {
  return Array.from({ length: 6 }, (_, i) => {
    const level = i + 1
    const indentCm = (level - 1) * 0.5
    return (
      `<style:style style:name="${tocEntryStyleName(level)}" style:family="paragraph" style:parent-style-name="Standard">` +
      `<style:paragraph-properties fo:margin-left="${indentCm}cm"/>` +
      `</style:style>`
    )
  }).join('')
}
```
In `buildContentXml()` (Zeile 129–137) wird `tocEntryStyleDefs()` in die
`office:automatic-styles`-Konkatenation aufgenommen (Zeile 133, neben `headingStyleDefs()` etc.).

### 12.3 Keine Bookmark-Infrastruktur für ODT nötig

Siehe Entscheidung 1.6/Zusatzbefund A — `odt/writer.ts`s bestehender `heading`-Fall (Zeile 69–74)
bleibt **unverändert**. Das ist eine bewusste, dokumentierte Asymmetrie zwischen den beiden
Formaten (DOCX: Bookmark-Wrapping nötig; ODT: nicht) und **kein** übersehener Fall.

---

## 13. ODT-Import — `src/formats/odt/reader.ts`

### 13.1 `elementToBlocks()` — neuer Fall

Neuer Zweig in `elementToBlocks()` (aktuell Zeilen 164–206), vor der `depth >= MAX_NESTING_DEPTH`-
Prüfung (Zeile 177) eingeordnet, da ein ToC-Platzhalter selbst keine Tiefenrekursion auslöst:

```ts
if (ns === ODF_NAMESPACES.text && local === 'table-of-content') {
  const sourceEl = firstChildNS(el, ODF_NAMESPACES.text, 'table-of-content-source')
  const maxLevel = Number(sourceEl?.getAttributeNS(ODF_NAMESPACES.text, 'outline-level') ?? '3') || 3

  // Cached body text as a fallback for Grenzfall 17 (see tocJson.ts Abschnitt 11) — plain
  // text per <text:p> inside <text:index-body>, hyperlink hrefs intentionally NOT parsed
  // (entries are regenerated fresh from the document's actual current headings instead).
  const indexBody = firstChildNS(el, ODF_NAMESPACES.text, 'index-body')
  const cachedTexts = indexBody
    ? childElements(indexBody, ODF_NAMESPACES.text, 'p')
        .map((p) => p.textContent?.trim() ?? '')
        .filter(Boolean)
    : []
  pendingTocFallbackTexts.push(cachedTexts) // collected per-file, see readOdt() wiring below

  return [{ type: 'toc', attrs: { maxLevel }, content: [] }]
}
```

(`pendingTocFallbackTexts` — ein lokales `string[][]`, in `readOdt()` deklariert und per
Closure/Parameter an `elementToBlocks` durchgereicht, analog zu `styles`, das bereits durchgereicht
wird — technisches Detail, während der Umsetzung entweder als zusätzlicher Funktionsparameter oder
als von `readOfficeTextChildren` zurückgegebener zweiter Wert zu lösen.)

### 13.2 `readOdt()` — Verdrahtung

Nach Zeile 248 (`const bodyBlocks = officeText ? await readOfficeTextChildren(...) : []`), vor
der Rückgabe (Zeile 279–284):
```ts
resolveTocPlaceholders(bodyBlocks, pendingTocFallbackTexts)
if (headerBlocks) resolveTocPlaceholders(headerBlocks, [])
if (footerBlocks) resolveTocPlaceholders(footerBlocks, [])
```

---

## 14. Grenzfall-Zuordnung (Abschnitt 3 der Anforderung → umsetzender Code-Abschnitt)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | Dialog abbrechen | Abschnitt 5 (kein `view.focus()` beim Öffnen, `onCancel` ändert nichts am Dokument) |
| 2 | Keine Überschrift vorhanden | Abschnitt 3.2 (`entries.length === 0` → leerer `toc`-Node), Abschnitt 7 (CSS `:empty::after`) |
| 3 | Genau eine Überschrift | Kein Sonderfall — `collectHeadings`/Filter funktionieren für n=1 identisch zu n>1 |
| 4 | 200 Überschriften | `doc.descendants` ist O(n), kein zusätzliches Re-Rendering-Problem gegenüber bestehenden Volltextdurchläufen (z. B. `pagination.ts`); **muss** per Testfall 15 (Abschnitt 15.2) performanceseitig verifiziert werden |
| 5 | Sehr langer Überschriftentext | Abschnitt 1.8/7 (CSS-Ellipsis + `title`-Tooltip) |
| 6 | Ebenen-Sprünge (1→4) | `insertTableOfContents`/`resolveTocPlaceholders` normalisieren `level` nicht — Original-Ebene bleibt erhalten, CSS-Einrückung `pm-toc-level-N` bildet sie 1:1 ab |
| 7 | (Duplikat-Nr. in Anforderung — siehe #6) | — |
| 8 | Einfügen in Tabellenzelle/Listenelement | Entscheidung 1.10 — Schema erlaubt es strukturell, **muss** per Test bestätigt werden (Abschnitt 15.1) |
| 9 | Mehrfaches Einfügen | Entscheidung 1.9 — `tocId` ist pro Überschrift, nicht pro Verzeichnis, kollisionsfrei |
| 10 | Einfügen bei aktiver Selektion | `tr.replaceSelectionWith(toc)` in `insertTableOfContents` (Abschnitt 3.2) — identisches Muster zu `insertImage`/`insertTable` |
| 11 | Undo direkt nach Einfügen + weiter tippen | Einzelne Transaktion (Abschnitt 3.2) → ein Undo-Schritt; **muss** per Test bestätigt werden (Abschnitt 15.2, Testfall 9) |
| 12 | Überschrift gelöscht/umbenannt ohne Aktualisieren | Bewusst kein automatisches Verhalten — `toc`-Node bleibt unverändert bis `updateTableOfContentsAt` (Abschnitt 3.3) aufgerufen wird (Entscheidung 1.11, entspricht Anforderung 2.8) |
| 13 | Klick auf Eintrag mit gelöschtem Ziel | `navigateToTocEntry` gibt `false` zurück → `tocPlugin.ts` zeigt `.pm-toc-entry--missing`-Flash (Abschnitt 7/8) |
| 14 | Sonderzeichen/Umlaute/Emoji | Keine Sonderbehandlung nötig — JS-Strings + bestehende `escapeXml()` sind bereits unicode-sicher (identisch zur bestehenden Heading-Text-Behandlung) |
| 15 | Seitenzahl-Anzeige | Entscheidung 1.3 — keine In-App-Anzeige, Export delegiert an Word/LibreOffice |
| 16 | Import DOCX-Fremddatei mit TOC-Feld | **Klassische Feld-Form:** Abschnitt 10.2 (Feld-Erkennung + Cache-Fallback). **Block-level-`<w:sdt>`-Form (Befund 8, DoD-Punkt 9):** Abschnitt 10.3 (rekursiver `sdtContent`-Auspack) — **in Erstfassung fehlend, jetzt ergänzt.** **Kein reales Fixture im Korpus** (Zusatzbefund B) — synthetische Fixture in **beiden** Formen nötig, siehe Abschnitt 15.3/10.3 |
| 17 | Import ODT-Fremddatei mit `text:table-of-content` | Abschnitt 13.1; reale Fixtures **vorhanden** (`test1.odt`, Zusatzbefund A) |
| 18 | Selection-Sync-Bug-Verdachtsfall bei ToC-Klick | Abschnitt 8 (Analyse) + Pflicht-Regressionstest (Abschnitt 15.2) |
| 19 | Verzeichnis in Kopf-/Fußzeile | Aktuell nicht erreichbar (keine Header/Footer-UI, siehe Anforderung Zeile 282–287) — Reader/Writer behandeln `header`/`footer` defensiv identisch zu `body` (Abschnitt 9.5/13.2), ohne dass dafür UI existiert; kein Blocker |

---

## 15. Tests

### 15.1 Unit-/Komponententests

| Datei | Inhalt |
|---|---|
| `src/formats/shared/editor/__tests__/tocCommands.test.ts` (**neu**) | `collectHeadings` (leeres Dokument, 1, mehrere, verschachtelt in Liste/Tabelle); `insertTableOfContents` — Ebenenfilter, Reihenfolge exakt Dokumentreihenfolge (Ebenen-Sprünge, Grenzfall 6/7), leeres Ergebnis bei 0 Treffern, vergibt `tocId` nur an Überschriften ohne vorhandene Id, vergibt Ids dokumentweit eindeutig auch bei wiederholtem Aufruf; Einfügen mit aktiver Selektion ersetzt sie (Grenzfall 10); Einfügen mit Cursor in `list_item`/Tabellenzelle (Grenzfall 8, Entscheidung 1.10) — Struktur bleibt erhalten, kein Crash; `updateTableOfContentsAt` respektiert gespeicherte `maxLevel`, erkennt hinzugefügte/umbenannte Überschriften; `navigateToTocEntry` — gefundene vs. fehlende `tocId` (Grenzfall 13). |
| `src/formats/shared/__tests__/tocJson.test.ts` (**neu**) | `resolveTocPlaceholders`: Platzhalter vor/nach den referenzierten Überschriften im Baum; verschachtelte Überschriften (Tabelle/Liste) werden gefunden; mehrere `toc`-Platzhalter mit unterschiedlichem `maxLevel` bekommen unabhängige Entry-Listen; Fallback auf `fallbackCachedTextByTocIndex`, wenn keine Überschriften gefunden werden, aber Cache-Text vorhanden ist. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer `describe('DOCX round trip: table of contents', …)`: Eigenes `insertTableOfContents`-Ergebnis (über eine kleine, direkt konstruierte `WordDocumentContent`-Fixture mit 5 Überschriften + `toc`-Node) exportieren → `word/document.xml` enthält `<w:instrText>` mit `TOC`, `<w:bookmarkStart w:name="_Toc…">` um jede referenzierte Überschrift, `<w:hyperlink w:anchor="_Toc…">` je Eintrag; reimportieren → Ergebnis enthält wieder einen `toc`-Node mit denselben Einträgen (Text/Ebene/Reihenfolge), referenzierte Überschriften tragen dieselben `tocId`s wie ihre Bookmarks. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analog: `<text:table-of-content>` mit `<text:table-of-content-source>`/`<text:index-body>` im exportierten `content.xml`; Reimport erkennt `toc`-Node weiterhin. |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Ergänzung: dedizierter Test „recognizes the real table-of-content in test1.odt as a toc node, not flattened text" — importiert `test1.odt` gezielt (nicht nur den bestehenden Crash-Sweep), prüft `doc.body.content` enthält mindestens einen `{ type: 'toc' }`-Knoten. |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Kein TOC-spezifischer Test möglich mangels realer Fixture (Zusatzbefund B) — stattdessen Verweis-Kommentar auf die neue synthetische Fixture in `roundtrip.test.ts`/Abschnitt 15.3. |

### 15.2 E2E-Tests (Playwright, `tests/e2e/`)

**Neue Datei `tests/e2e/toc-insert.spec.ts`** — deckt Anforderung Abschnitt 5, Testfälle 1–10:

| Testfall | Testname (Vorschlag) |
|---|---|
| 1 | „5 headings of different levels → inserting a ToC shows all 5 entries, correctly indented, in document order" |
| 2 | „clicking the toolbar button opens the level-depth dialog" |
| 3 | „confirming with the default depth (3) inserts a ToC filtering out level 4+ headings" |
| 4 | „pressing Escape closes the dialog without any document change" |
| 5 | „inserting with no headings in the document shows the 'Keine Überschriften gefunden' placeholder" |
| 6 | „renaming a heading and clicking 'Aktualisieren' updates the ToC entry text" |
| 7 | „clicking a ToC entry scrolls to and places the cursor at the referenced heading" |
| 8 | „clicking a ToC entry whose heading is on a different visual page still jumps correctly" |
| 9 | „Ctrl+Z right after inserting removes the whole ToC; Ctrl+Shift+Z restores it" |
| 10 | „Regression: type, select-all, bold, click a ToC entry, keep typing — no data loss" (Grenzfall 18, dauerhaft in der Suite, gleiche Sequenz wie `selection-regression.spec.ts`) |

Zusätzlich, direkt aus den Grenzfällen abgeleitet: „inserting with the cursor inside a table
cell/list item embeds the ToC without breaking the structure" (Grenzfall 8); „inserting two ToCs
in the same document — both remain independently clickable" (Grenzfall 9); „clicking an entry
whose heading was since deleted shows a visible flash, does not navigate, does not crash"
(Grenzfall 13); „200 generated headings — insert, scroll, and click remain responsive" (Grenzfall 4).

**Neue Datei `tests/e2e/toc-roundtrip.spec.ts`** — deckt Anforderung Abschnitt 4 (Rundreise):
- DOCX: ToC über Dialog einfügen → exportieren → `word/document.xml` per `JSZip` parsen (Muster
  aus `tests/e2e/docx.spec.ts:2`) → `<w:instrText>`-Treffer mit `TOC`, `<w:bookmarkStart
  w:name="_Toc…">`-Treffer vorhanden → Datei erneut importieren → Editor zeigt weiterhin einen
  `.pm-toc`-Bereich mit denselben Einträgen (4.1.1/4.1.2).
- ODT: analog, `<text:table-of-content>`/`<text:index-body>` im exportierten `content.xml`
  (4.2.1/4.2.2).
- Cross-Format: DOCX mit ToC → Editor → als ODT exportieren → reimportieren → als DOCX
  exportieren → ToC bleibt in beiden Richtungen als Element erkennbar, Einträge inhaltlich
  identisch (4.3.1/4.3.2).
- Import der realen Fixture `test1.odt` (Grenzfall 17, per `page.setInputFiles`) → ToC-Bereich im
  Editor sichtbar, kein Absturz (Testfall 14, ODT-Teil).

### 15.3 Synthetische DOCX-TOC-Fixture (ersetzt fehlende reale Fixture, siehe Zusatzbefund B)

Neue Hilfsfunktion `buildDocxWithTocField()` in `src/formats/docx/__tests__/roundtrip.test.ts`
bzw. einer neuen `tests/e2e/`-Hilfsdatei, analog zu `buildSampleDocx()` in `tests/e2e/docx.spec.ts:7–48`
— von Hand mit `JSZip` gebautes `word/document.xml`, das exakt das Feld-Quadrupel aus Abschnitt
9.3 sowie einen `w:bookmarkStart`/`w:bookmarkEnd` um eine echte Überschrift enthält, unabhängig
vom eigenen Writer. Verifiziert den **Lese**-Pfad (Abschnitt 10) unabhängig vom Schreib-Pfad —
wichtig, weil beide sich sonst gegenseitig unsichtbar kompensieren könnten (derselbe Grundsatz
wie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).

---

## 16. Bekannte Lücken / Folgearbeit (nicht Teil dieses Plans)

1. **Kein reales DOCX-Fixture mit TOC-Feld im Korpus** (Zusatzbefund B) — sollte bei Gelegenheit
   durch eine echte, mit Word erzeugte Datei ergänzt werden; bis dahin bleibt Testfall 14 (DOCX-
   Teil) auf die synthetische Fixture (Abschnitt 15.3) beschränkt, deckt also nicht jede
   Idiosynkrasie echter Word-Ausgabe ab (z. B. `w:sdt`-Wrapping, das manche Word-Versionen um das
   Feld legen — hier bewusst **nicht** nachgebildet, siehe Abschnitt 9.3, da für Feld-Erkennung
   nicht zwingend erforderlich).
2. **Kein echter Word-/LibreOffice-Verifikationslauf** (Anforderung 4.1 Punkt 3, 4.2 Punkt 3) —
   nur über echte Installationen nachweisbar, außerhalb der Möglichkeiten dieses Plans; wird als
   offener Punkt an die QA-Verifikation weitergereicht.
3. **`text:a xlink:href`-Kodierung für Sonderzeichen im ODT-Export** (Abschnitt 12.1) —
   `encodeURIComponent` vs. reines `escapeXml` muss gegen tatsächliches LibreOffice-Verhalten
   verifiziert werden; im Zweifel schadet ein „falsches" Href-Format der **eigenen**
   Rundreise-Fähigkeit nicht (wir parsen diese Hrefs beim Reimport ohnehin nicht, siehe Abschnitt
   13.1), betrifft nur die Klickbarkeit **innerhalb von LibreOffice selbst** nach Export.
4. **Volle „Aktualisieren"-Funktionstiefe** — bewusst Scope des Schwester-Slugs
   `inhaltsverzeichnis-aktualisieren` (Entscheidung 1.11).
5. **`toDOM`-Mischung aus statischem Vorspann + Content-Hole für `toc`** (Abschnitt 2) — in der
   2. Re-Verifikation (2026-07-05) auf die verbindliche `.pm-toc-body`-Kapselung des Content-Holes
   festgelegt (Header außerhalb `contentDOM`); `NodeView` bleibt robuste Rückfalloption, falls der
   `Aktualisieren`-Button-Klick `handleClickOn` wider Erwarten nicht erreicht.
6. **Kopieren/Einfügen einer Überschrift innerhalb des Editors dupliziert deren `tocId`** — weil
   `heading.parseDOM` das `data-toc-id` mitliest (Abschnitt 2), trägt eine per Editor-Clipboard
   duplizierte Überschrift dieselbe `tocId` wie das Original. `navigateToTocEntry` (Abschnitt 3.4)
   springt dann bei beiden Einträgen zur **ersten** Fundstelle (Grenzfall-21-nahe Mehrdeutigkeit,
   aber nur im Sonderfall „Heading kopiert"). Bewusst als **dokumentierte Einschränkung** geführt,
   nicht behoben — eine spätere `updateTableOfContentsAt`-Ausführung würde den ToC ohnehin neu
   berechnen; das eigentliche Duplikat-`tocId`-Problem gehört, wenn überhaupt, in einen
   allgemeinen „paste-time id-remap"-Mechanismus (außerhalb dieses Feature-Scopes). Optionaler,
   kleiner Härtungsschritt, falls gewünscht: `tocId` in `heading.parseDOM.getAttrs` bei einem
   Paste-Kontext auf `null` setzen — bewusst **nicht** als Pflicht aufgenommen, da es die
   Bookmark-Round-Trip-Erkennung (Abschnitt 10.1) nicht stören darf.

---

## 17. Abnahme-Rückverfolgung (Anforderung Abschnitt 6, DoD-Punkte 1–12)

| DoD-Punkt | Erfüllt durch |
|---|---|
| 1 | Abschnitt 5 (`InsertTocDialog.tsx`), Abschnitt 6 (Toolbar-Verdrahtung) |
| 2 | Abschnitt 3.1/3.2 (`collectHeadings`, `insertTableOfContents`) |
| 3 | Abschnitt 3.4 (`navigateToTocEntry`), Abschnitt 8 (`tocPlugin.ts`) |
| 4 | Abschnitt 3.3 (`updateTableOfContentsAt`), Abschnitt 2 (Refresh-Button im `toc`-`toDOM`) |
| 5 | Abschnitt 9 (DOCX-Feld-Export) |
| 6 | Abschnitt 12 (ODT-`text:table-of-content`-Export) |
| 7 | Abschnitt 10/11 (DOCX-Reimport-Erkennung), Abschnitt 13/11 (ODT-Reimport-Erkennung) |
| 8 | Cross-Format-Rundreise — Abschnitt 15.2 (`toc-roundtrip.spec.ts`) |
| 9 | Abschnitt 14 (Grenzfall-Zuordnungstabelle) |
| 10 | Abschnitt 1.1/1.2/1.3 (drei offene Entscheidungen explizit beantwortet) |
| 11 | Abschnitt 10.2/13.1 (Import-Fallback ohne stillen Datenverlust) |
| 12 | Abschnitt 8 (Analyse) + Abschnitt 15.2 Testfall 10 (dauerhafter Regressionstest) |
