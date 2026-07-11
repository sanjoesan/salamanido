# Anforderungsspezifikation: Zeichenformatierung „Kursiv“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
Feature-Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt „2.2 Zeichenformatierung“, Slug
`kursiv`, Beschreibung: „Kursiv | Schaltet Kursivschrift auf Selektion bzw. an der
Schreibmarke um. | vorhanden | 1“) als **vorhanden** (Priorität 1/essenziell) geführt.
Dieser Status wird hier ausdrücklich als **nicht vertrauenswürdig** eingestuft und muss
vollständig neu verifiziert werden — sowohl auf tatsächliche Bedienbarkeit (echte
Toolbar-/Tastatur-Interaktion im Browser) als auch auf korrekte Rundreise (DOCX **und**
ODT) hin.

Diese Datei ersetzt keine bestehende Spezifikation, sondern konkretisiert Abschnitt 3
(„Zeichenformatierung“) von `E:\docs\FEATURE-SPEC-DOCX-ODT.md` auf das Detailniveau, das
für eine belastbare, einzeln abhakbare Abnahme genau dieser einen Funktion nötig ist.
Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

Geltungsbereich: ausschließlich die Zeichenformatierung „Kursiv“ (ProseMirror-Mark `em`,
DOCX `<w:i/>`, ODT `fo:font-style="italic"`). Andere Marks (Fett, Unterstrichen,
Durchgestrichen, Farben) sind nur insoweit relevant, wie sie mit Kursiv kombiniert
auftreten.

---

## Korrekturvermerk gegenüber der vorherigen Fassung

Diese Fassung ist eine **kritisch überarbeitete Neufassung** einer früheren
`kursiv-req.md`. **Alle** Code- und Testreferenzen wurden am **2026-07-05** direkt und
Zeile für Zeile gegen den tatsächlichen Quellcode in `E:\docs\src` bzw. `E:\docs\tests`
verifiziert — **nicht** aus der Vorfassung übernommen. Dabei wurden folgende **Schwächen
der Vorfassung korrigiert**, statt sie fortzuschreiben:

1. **Die Vorfassung trug veraltete Zeilennummern für `WordEditor.tsx` — und behauptete
   dennoch, genau diese seien bereits auf den Post-„Ausschneiden“-Stand korrigiert
   worden.** Das war nachweislich falsch: Sie führte `Mod-i` weiterhin auf „Zeile 91“,
   `dispatchTransaction`/`forceRender` auf „117–124/123“ und die Mouseup-Reconciliation
   auf „135–147“. Der tatsächliche Code (nach Einzug des Cut-Features, Commits
   `9f8fa03`/`db61c89`/…) hat `Mod-b` auf **98**, `Mod-i` auf **99**, `Mod-u` auf **100**;
   `dispatchTransaction` auf **125–132** (`tr.docChanged`→`onChange` **128–130**,
   `forceRender` **131**); die Mouseup-/Mousedown-Listener auf **143–155** (die Funktion
   `reconcileSelectionOnClick` bleibt bei **43–50**). Diese Fassung übernimmt damit nicht
   die Schwäche, die die Vorfassung selbst ihrer eigenen Vorfassung vorwarf. **Alle
   übrigen** Referenzen (`Toolbar.tsx`, `schema.ts`, beide Reader/Writer,
   `styleRegistry.ts`, `DocumentWorkspace.tsx` sowie sämtliche Unit-/E2E-Testdateien)
   waren unverändert gültig und wurden erneut gegengeprüft.
2. **Neu aufgenommen: der Kursiv-Button ist vermutlich nicht per Tastatur bedienbar.**
   Die Vorfassung listete unter Bedienelement 1 „Maus-Klick **und** Tastatur (Tab-Fokus +
   Enter/Space)“ als Auslöser — und unterstellte damit stillschweigend, dass die
   Tastatur-Aktivierung des Buttons funktioniert. Der geteilte `MarkButton`
   (`Toolbar.tsx:76`) verdrahtet jedoch **ausschließlich** `onMouseDown`; ein natives
   `<button>` feuert bei Tastatur-Aktivierung (Enter/Leertaste) `click`, **nicht**
   `mousedown`. Dieser reale Bedien-/Barrierefreiheitsdefekt (identisch zu „Defekt A“ in
   `specs/fett-req.md`) fehlte in der Vorfassung völlig und ist hier als Grenzfall 3.8
   ergänzt. *(Korrektur gegenüber einer weiteren, hier ebenfalls behobenen Schwäche: an
   vier Stellen — in Abschnitt 0, Abschnitt 0b und Abschnitt 1 — verwies die Vorfassung
   stattdessen fälschlich auf „Grenzfall 3.9“, obwohl Abschnitt 3.9 tatsächlich die davon
   unabhängige Tabelle „Weitere Grenzfälle“ ist, nicht die Tastatur-Bedienbarkeit.)*
3. **Die zentrale Behauptung der Ur-Vorfassung war sachlich falsch** (von der letzten
   Fassung bereits korrigiert, hier bestätigt): Es gibt sehr wohl substanzielle
   Kursiv-Abdeckung (u. a. `tests/e2e/clipboard-roundtrip.spec.ts:190` klickt real
   `getByTitle('Kursiv')`; `docx.spec.ts:300`/`odt.spec.ts:276` prüfen `em`-Rendering aus
   Import; `roundtrip-fidelity.spec.ts` prüft `em` über eine vollständige Rundreise). Der
   real vorhandene Bestand ist in **Abschnitt 0b** katalogisiert; die verbliebenen Lücken
   sind entsprechend eng gefasst.
4. **Cross-Format-Rundreise ist derzeit kein erfüllbares Pflicht-Abnahmekriterium.**
   Cross-Format-Export (DOCX→ODT, ODT→DOCX) ist über die UI **nicht verfügbar**
   (`DocumentWorkspace.handleExport`, `src/app/DocumentWorkspace.tsx:68`, ruft immer
   `module.exportFile` des Ursprungsformats auf, Zeile 81; kein Formatwähler), und die
   entsprechenden E2E-Tests sind bewusst `test.skip`
   (`roundtrip-fidelity.spec.ts:256-257`, „blocked on backlog slug
   `speichern-unter-format`“). Cross-Format ist unten als **blockierte Ziel-Anforderung**
   gekennzeichnet (Abschnitt 5.3), nicht als sofort erfüllbares Abnahmekriterium.
5. **Neu in dieser PO-Prüfrunde (2026-07-05, zweiter Durchgang) direkt gegen
   installierten Bibliothekscode, `playwright.config.ts` und die Datei-Upload-UI
   verifiziert — vier reale Lücken der Vorfassung geschlossen, statt sie
   fortzuschreiben:**
   1. **Grenzfall 3.2 war als bloßer „Verdacht" formuliert, obwohl das zugrunde
      liegende Fehlverhalten am tatsächlich installierten Bibliothekscode
      (`node_modules/prosemirror-commands/dist/index.js:679-699`,
      `prosemirror-commands@1.7.1` laut `package.json:20`) **nachweisbar und
      bestätigt** ist — exakt dieselbe Einstufung, die `specs/fett-req.md`
      („Defekt E") für den identischen, gemeinsam genutzten Code-Pfad bereits
      vornimmt. Da `Toolbar.tsx:78` und `WordEditor.tsx:99` denselben generischen
      `toggleMark(markType)`-Aufruf ohne Options-Argument nutzen wie die
      Fett-Aufrufstellen, gilt der Befund für „Kursiv" **identisch**, nicht nur
      analog. Grenzfall 3.2 ist unten entsprechend als bestätigter Defekt
      umformuliert, mit Zitat der tatsächlichen Implementierung (nicht nur der
      Typ-Deklaration).
   2. **Fehlender Grenzfall: Mehrzell-`CellSelection`.** `specs/fett-req.md`
      führt dies bereits als Grenzfall 15 (identischer Code-Pfad); diese Fassung
      übernahm ihn bisher nicht. Neu ergänzt als Grenzfall 3.10.
   3. **Fehlende Browser-Matrix-Einordnung.** Weder diese noch die Vorfassung
      erwähnte, dass `docx.spec.ts`/`odt.spec.ts`/`roundtrip-fidelity.spec.ts`
      (Kursiv-Rundreise/Import) laut `playwright.config.ts` **nur** auf Desktop
      Chrome, Mobile (Pixel 7) und Tablet (iPad Mini, WebKit) laufen, während
      `clipboard-roundtrip.spec.ts` (Button-Klick-Fall, `testMatch:
      /clipboard.*\.spec\.ts/`) zusätzlich auf Desktop Safari und Desktop
      Firefox läuft — beides direkt an `playwright.config.ts` verifiziert.
      Neu ergänzt in Abschnitt 0 und Abschnitt 6.
   4. **Fehlender Hinweis auf den umgangenen `filechooser`-Pfad.** Alle
      bestehenden Kursiv-berührenden Upload-Tests rufen `setInputFiles` direkt
      auf dem versteckten `<input type="file">` auf (`FormatPicker.tsx:96-98`)
      und umgehen damit den sichtbaren „Datei hochladen"-Button
      (`FormatPicker.tsx:82`) vollständig — identisch zur bereits in
      `specs/fett-req.md` (Testfall 10) dokumentierten Lücke. Neu ergänzt in
      Abschnitt 6.
6. **Neu in dieser PO-Prüfrunde (2026-07-05, dritter Durchgang) direkt gegen
   `tests/e2e/clipboard-roundtrip.spec.ts` verifiziert — eine reale, bisher in
   keiner Fassung dokumentierte Lücke im „echten Button-Klick"-Nachweis
   geschlossen:** Der R-7-Testfall für „Kursiv" (`FEATURE_CASES`-Eintrag
   `name: 'Kursiv'`, `clipboard-roundtrip.spec.ts:186-193`, ausgeführt in
   `test.describe('R-7: …')`, `:252-291`) enthält
   `test.skip(browserName === 'webkit', …)` (`:264`). Da sowohl das Projekt
   **Tablet** (`iPad Mini`) als auch **Desktop Safari (Clipboard)** in
   `playwright.config.ts` auf der WebKit-Engine laufen (`browserName ===
   'webkit'` für beide), wird dieser Testfall auf **beiden** tatsächlich
   **übersprungen** — obwohl `clipboard-roundtrip.spec.ts` laut `testMatch`
   dort mitläuft (Abschnitt 0, Zeile „Browser-Projekt-Matrix"; identisch zu dem
   bereits in `specs/durchgestrichen-req.md` Abschnitt 1.2 für denselben
   Testfall dokumentierten Befund, hier erstmals für „Kursiv" nachgezogen).
   **Konkret bedeutet das:** Der einzige vorhandene E2E-Nachweis für einen
   echten Klick auf den „Kursiv"-Button läuft faktisch nur auf **Desktop
   Chrome**, **Mobile (Pixel 7, Chromium)** und **Desktop Firefox
   (Clipboard)** — auf **keinem** WebKit-Projekt. Neu ergänzt in Abschnitt 0b,
   5.1 und 6.
7. **Neu in dieser PO-Prüfrunde (2026-07-05, vierter Durchgang) direkt gegen den
   aktuellen Stand von `E:\docs\src` und `E:\docs\tests` erneut Zeile für Zeile
   nachverifiziert (alle Fundstellen aus Abschnitt 0/0b bestätigt korrekt,
   inklusive der installierten `prosemirror-commands@1.7.1`- und
   `prosemirror-tables@1.8.5`-Bibliothekscodes) — dabei zwei konkrete
   Lücken **in dieser Datei selbst** gefunden und geschlossen, statt sie
   fortzuschreiben:**
   1. **Punkt 5.2 dieses Korrekturvermerks behauptete „Neu ergänzt als Grenzfall
      3.10" (Mehrzell-`CellSelection`) — dieser Abschnitt existierte im
      Dokumentkörper der geprüften Vorfassung jedoch nachweislich nicht** (Abschnitt 3
      endete bei 3.9). Das ist eine Instanz genau des Fehlers, den Korrekturvermerk-
      Punkt 1 oben der eigenen Ur-Vorfassung vorwirft: eine im Änderungsprotokoll
      behauptete, im Text aber nie vorgenommene Ergänzung. Jetzt als eigenständiger
      Abschnitt 3.10 nachgeholt (analog zu `specs/fett-req.md` Grenzfall 15, mit an
      `node_modules/prosemirror-tables/dist/index.js:508` verifizierter
      `CellSelection`-Implementierung).
   2. **Punkt 5.4 dieses Korrekturvermerks behauptete, der Hinweis auf den
      umgangenen `filechooser`-Pfad sei „ergänzt in Abschnitt 6" — tatsächlich
      kam der Begriff `filechooser` in der geprüften Vorfassung an keiner Stelle
      außerhalb dieses Änderungsprotokolls vor.** Jetzt als eigener, nummerierter
      Testfall 5.1.7 nachgeholt (mit gegen `FormatPicker.tsx:79,82,96-98`
      verifizierten Fundstellen) und in Abschnitt 6/8 verankert; die
      Nummerierung der übrigen Punkte in 5.2/5.3 sowie deren Querverweise in
      Abschnitt 6/7 entsprechend verschoben (7→8, 8→9, 9–11→10–12).

---

## 0. Ist-Stand des Codes (verifizierte Fundstellen, Basis dieser Spezifikation)

Die Referenzen dienen als Ausgangspunkt der Verifikation — sie sind **kein Nachweis der
Korrektheit**. Stand des Quellcodes: **2026-07-05**, direkt gegen `E:\docs\src`
verifiziert.

| Ebene | Datei:Zeile | Ist-Zustand |
|---|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts:164-169` | `marks.em`: `parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }]`; `toDOM` erzeugt `['em', 0]`. **Hinweis:** Der dritte Matcher ist `font-style=italic` (wertgenauer Style-Matcher) — er greift **nur** bei exakt `italic`, nicht bei `oblique` (siehe Grenzfall 3.6, gilt auch für Paste). |
| Toolbar-Button „Kursiv“ | `src/formats/shared/editor/Toolbar.tsx:185` | `<MarkButton view={view} mark="em" label="K" title="Kursiv" glyphClassName="italic" />` (zwischen „Fett“ Zeile 184 und „Unterstrichen“ Zeile 186) |
| Button-Komponente | `src/formats/shared/editor/Toolbar.tsx:55-89` (`MarkButton`) | generisch für F/K/U/S; rendert `<button aria-pressed={active} aria-label={title} title={title}>` mit einem `<span className={glyphClassName}>{label}</span>` |
| Aktiv-Zustand-Logik | `src/formats/shared/editor/Toolbar.tsx:69` | `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — liest **`$from.marks()`**, berücksichtigt **nicht** `state.storedMarks` (siehe Grenzfall 3.1) und mittelt **nicht** über die gesamte Selektion (siehe Grenzfall 3.2) |
| Toggle-Auslösung (Klick) | `src/formats/shared/editor/Toolbar.tsx:76-79` | **nur** `onMouseDown` mit `e.preventDefault()` (verhindert Fokus-/Selektionsverlust) → `run(view, toggleMark(markType))`. **Kein `onClick`, kein `onKeyDown`** (siehe Grenzfall 3.8). `run` (Zeile 28-31) ruft den Befehl auf und danach `view.focus()` |
| **Kein** dedizierter Befehl | `src/formats/shared/editor/commands.ts` (gesamt) | Anders als `setAlign`/`setHeading`/`toggleList`/`cutSelection` gibt es **keine** eigene, isoliert testbare `toggleEmphasis`/`toggleInlineMark`-Funktion — das Umschalten erfolgt direkt über `toggleMark(markType)` aus `prosemirror-commands` (in Toolbar **und** Keymap) |
| Installierte `toggleMark`-Implementierung | `node_modules/prosemirror-commands/dist/index.js:679-699` (`prosemirror-commands@1.7.1`, `package.json:20`) | `let removeWhenPresent = (options && options.removeWhenPresent) !== false` (Zeile 680) → ohne drittes Argument (wie bei **beiden** Kursiv-Aufrufstellen) bleibt es `true`. Bei nicht-leerer Selektion (Zeile 698-699): `if (removeWhenPresent) { add = !ranges.some(r => state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType)) }` — „vorhanden" gilt schon, wenn **irgendein** Zeichen im Bereich das Mark trägt (`.some`, nicht `.every`). Direkt am tatsächlich installierten Code verifiziert, nicht nur an der `.d.ts`-Doku (siehe Grenzfall 3.2, identischer Befund wie „Defekt E" in `specs/fett-req.md`) |
| Browser-Projekt-Matrix | `playwright.config.ts:27-54` | Projekte **Desktop Chrome**, **Mobile** (`Pixel 7`) und **Tablet** (`iPad Mini`, WebKit) haben **kein** `testMatch` → laufen über **den gesamten** `tests/e2e`-Ordner, also inkl. `docx.spec.ts`, `odt.spec.ts`, `roundtrip-fidelity.spec.ts`, `selection-regression.spec.ts`. **Desktop Safari (Clipboard)** und **Desktop Firefox (Clipboard)** sind auf `testMatch: /clipboard.*\.spec\.ts/` beschränkt — sie laufen **nur** über `clipboard.spec.ts`/`clipboard-roundtrip.spec.ts`, nicht über die übrigen Kursiv-Testdateien |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx:99` | `'Mod-i': toggleMark(wordSchema.marks.em)` (Strg+I / Cmd+I; benachbart `Mod-b` Zeile 98, `Mod-u` Zeile 100). Eigener `keymap`-Block **vor** `baseKeymap` registriert (Block ab Zeile 85, `baseKeymap` Zeile 108) |
| Toolbar-Re-Render | `src/formats/shared/editor/WordEditor.tsx:125-132` | `dispatchTransaction` ruft bei **jeder** Transaktion `forceRender((n) => n + 1)` (Zeile 131) → die Toolbar liest ihren Aktiv-Zustand bei jeder Selektions-/Dokumentänderung neu (relevant für Abschnitt 2.2/3.1). `onChange` nur bei `tr.docChanged` (Zeile 128-130) |
| Selektions-Reconciliation (Klick) | `src/formats/shared/editor/WordEditor.tsx:43-50, 143-155` | `reconcileSelectionOnClick` (43-50) plus Mousedown-/Mouseup-Vergleich (143-155, Schwelle `CLICK_DRAG_THRESHOLD_PX = 3`), der eine veraltete Selektion nach Toolbar-Aktion + Klick korrigiert (Fix für den Selection-Sync-Bug, siehe Grenzfall 3.7) |
| DOCX-Export | `src/formats/docx/writer.ts:24` | `if (mark.type === 'em') props.push('<w:i/>')` innerhalb `runPropertiesXml` (`<w:rPr>`, Zeile 20-33). Läufe mit **identischer** Mark-Liste werden zusammengefasst (`inlineToRuns`, Zeile 54: `JSON.stringify(buffer.marks) === JSON.stringify(node.marks)`) |
| DOCX-Import | `src/formats/docx/reader.ts:104` | `if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')) marks.push({ type: 'em' })` in `marksFromRunProperties` (100-115). Prüft **nur die Existenz** des `<w:i>`-Elements, **nicht** dessen `w:val`. **Auffälliger Kontrast:** die direkt folgende Unterstrichen-Prüfung (Zeile 105-106) wertet sehr wohl `getAttributeNS(w,'val') !== 'none'` aus — Kursiv nicht (siehe Grenzfall 3.3) |
| DOCX-Import: **kein** `w:rStyle` | `src/formats/docx/reader.ts` (gesamt) | `parseStylesXml` liest aus `styles.xml` **ausschließlich** `outlineLvl` (für Überschriften-Erkennung). Es gibt **keinen** Code-Pfad, der `w:rStyle` (Zeichenformatvorlagen-Verweis) liest oder auf eine Formatvorlage mit `<w:i/>` auflöst (siehe Grenzfall 3.4) |
| ODT-Export (Mark→Prop) | `src/formats/odt/writer.ts:36` | `if (mark.type === 'em') props.italic = true` in `runPropsFromMarks` (32-43). Deduplizierung der Mark-Kombinationen über `TextStyleRegistry`, Schlüssel = `JSON.stringify(props)` |
| ODT-Export (Stil-XML) | `src/formats/odt/styleRegistry.ts:49` | `if (props.italic) attrs.push('fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"')` in `buildTextStyleXml` (46-59), erzeugt eine automatische Zeichenformatvorlage (`T1`, `T2`, …) |
| ODT-Import | `src/formats/odt/reader.ts:53` | `if (props.getAttributeNS(ODF_NAMESPACES.fo, 'font-style') === 'italic') style.italic = true`; `marksFor` erzeugt daraus `{ type: 'em' }`. Prüft **exakt** auf `'italic'`, nicht `'oblique'` (Grenzfall 3.6) |
| ODT-Import: **nur** automatische Stile | `src/formats/odt/reader.ts` | `readOdt` wertet **ausschließlich** `office:automatic-styles` aus (aus `content.xml` und aus `styles.xml`). **Kein** Auflösen benannter Formatvorlagen aus `office:styles` und **kein** Auflösen von `style:parent-style-name` (Vererbung) an irgendeiner Stelle (siehe Grenzfall 3.5) |
| Editor-CSS | `src/index.css` | **Keine** Regel für `em` oder `font-style` vorhanden — kursive Darstellung im Editor kommt vom Browser-Standardstil (`em { font-style: italic }`), unverändert. Kein globaler Reset (auch nicht Tailwinds Preflight) neutralisiert dies (siehe Abschnitt 4) |

**Kernaussage:** Für „Kursiv“ existiert vollständige Schema-, Reader- und Writer-
Unterstützung, ein Toolbar-Button und ein Tastenkürzel — **und** bereits nennenswerte
automatisierte Abdeckung (Abschnitt 0b). Zu verifizieren sind daher nicht mehr „ob Kursiv
überhaupt getestet ist“, sondern die **konkret aus dem Code abgeleiteten Verdachtsstellen**
(Abschnitt 3) und die **präzise benannten Rest-Lücken** (Abschnitt 6).

---

## 0b. Ist-Stand der Testabdeckung (verifiziert — 2026-07-05)

**Bereits vorhandene, verifizierte Abdeckung für Kursiv:**

| Ebene | Fundstelle | Was tatsächlich geprüft wird |
|---|---|---|
| Unit-Rundreise DOCX | `src/formats/docx/__tests__/roundtrip.test.ts` | `em` allein, positionstreu, unabhängig von `strong`/`underline`/`strike`; zusätzlich `[strong, em]` auf **einem** Lauf |
| Unit-Rundreise ODT | `src/formats/odt/__tests__/roundtrip.test.ts` | analog zu DOCX (`em` allein + `[strong, em]`) |
| **Unabhängige** Schema-Validierung ODT | `src/formats/odt/__tests__/external-validation.test.ts:62` | Dokument mit `em` („kursiv“) wird gegen das **offizielle OASIS ODF-1.3-RelaxNG-Schema** (via `xmllint-wasm`) validiert — d. h. für ODT existiert bereits eine formatunabhängige Validierung, die Kursiv einschließt |
| E2E: **echter Button-Klick** | `tests/e2e/clipboard-roundtrip.spec.ts:186-190` (Fall „Kursiv“) | Text tippen → Strg+A → `page.getByTitle('Kursiv').click()` → Export nach DOCX → Assert `<w:i/>`. **Widerlegt** die Ur-Vorfassungs-Behauptung „kein Test klickt den Kursiv-Button“. **Aber (verifiziert, `:264`):** `test.skip(browserName === 'webkit', …)` überspringt diesen Fall auf **jedem** WebKit-Projekt — also auf **Tablet** (`iPad Mini`) **und** **Desktop Safari (Clipboard)** gleichermaßen. Tatsächlich ausgeführt wird er nur auf Desktop Chrome, Mobile (Pixel 7) und Desktop Firefox (Clipboard) |
| E2E: Import + Rendering DOCX | `tests/e2e/docx.spec.ts:300` | Import einer DOCX mit `<w:i/>` „Kursiv“ (Fixture `fullCoverageDocument.ts:117`) → Assert `.ProseMirror em` mit Text „Kursiv“ = 1; anschließend unveränderter Export + Re-Import im selben Test |
| E2E: Import + Rendering ODT | `tests/e2e/odt.spec.ts:276` | analog; ODT-Fixture nutzt `text:style-name="Italic"` (automatische Formatvorlage, `fullCoverageDocument.ts:212`) — deckt Kursiv-Import über **automatischen** Stilnamen ab |
| E2E: kombinierte Rundreise DOCX→DOCX | `tests/e2e/roundtrip-fidelity.spec.ts:54, 126` | Fixture `richDocument` (Kursiv als `<w:i/>` **kombiniert mit Farbe**, `richDocument.ts:89`) → Assert `.ProseMirror em` „kursiv-rot“ = 1 **vor und nach** vollständigem Export→Re-Import, plus zentrierte Ausrichtung |
| E2E: kombinierte Rundreise ODT→ODT | `tests/e2e/roundtrip-fidelity.spec.ts:176, 240` | analog; ODT-Kursiv als automatische Formatvorlage `ItalicRed` (`fo:font-style="italic" fo:color=…`, `richDocument.ts:168`) |

**Genau daraus abgeleitete, real verbleibende Lücken** (keine davon durch obige Tests
abgedeckt — siehe Abschnitt 3 und 6):

1. **Tastenkürzel Strg+I / Cmd+I** wird von **keinem** Test per echtem Tastendruck
   ausgelöst (die E2E-Abdeckung klickt ausschließlich den Button; kein `press('Mod-i')`).
2. **Tastatur-Bedienung des Kursiv-Buttons selbst** (Tab-Fokus + Enter/Leertaste) wird von
   keinem Test geprüft — und funktioniert vermutlich gar nicht (Grenzfall 3.8, nur
   `onMouseDown` verdrahtet).
3. **Aktiv-Zustand (`aria-pressed`) des Kursiv-Buttons** wird in **keinem** Zustand
   geprüft — insbesondere nicht die code-belegten Verdachtsfälle 3.1 (Toggle an leerer
   Schreibmarke) und 3.2 (gemischte Selektion).
4. **DOCX-Import `<w:i w:val="false"/>` / `w:val="0"`** — nicht getestet (Grenzfall 3.3).
5. **DOCX-Import von Kursiv über `w:rStyle`-Zeichenformatvorlage** — nicht getestet und
   im Reader gar nicht implementiert (Grenzfall 3.4).
6. **ODT-Import von Kursiv über eine *benannte* Formatvorlage in `office:styles` bzw.
   über `style:parent-style-name`-Vererbung** — nicht getestet und im Reader nicht
   implementiert (Grenzfall 3.5). *Achtung:* Kursiv über **automatische** Stilnamen ist
   dagegen bereits abgedeckt (siehe oben) — 3.5 betrifft ausschließlich den nicht
   abgedeckten Rest.
7. **ODT-Import `fo:font-style="oblique"`** — nicht getestet (Grenzfall 3.6).
8. **Selektions-Sync-Regression mit Kursiv als Auslöser** — `tests/e2e/selection-
   regression.spec.ts` verwendet ausschließlich `getByTitle('Fett')` (verifiziert: Zeilen
   20/52/68/94; Grenzfall 3.7).
9. **Unabhängige Parser-Validierung des Kursiv-Laufs für DOCX** — `src/formats/docx/
   __tests__/external-validation.test.ts` prüft explizit nur `strong`
   (`<strong>fettem</strong>`, Zeile 72), **nicht** einen `em`-Lauf. Für ODT existiert die
   Validierung inkl. `em` bereits.
10. **Cross-Format-Rundreise** (DOCX↔ODT) — über die UI derzeit **nicht möglich**
    (Abschnitt 5.3).
11. **Der einzige Button-Klick-E2E-Test für Kursiv läuft auf keinem WebKit-Projekt** —
    `test.skip(browserName === 'webkit', …)` in `clipboard-roundtrip.spec.ts:264` schließt
    sowohl Tablet (`iPad Mini`) als auch Desktop Safari (Clipboard) aus. Ein echter
    Klick-Nachweis auf WebKit fehlt für „Kursiv" vollständig (siehe Korrekturvermerk 6).

---

## 1. Bedienelemente / Menüpunkte

| # | Element | Ort | Auslöser | Soll-Verhalten |
|---|---|---|---|---|
| 1 | Toolbar-Button „Kursiv“ | Editor-Toolbar, Gruppe Zeichenformatierung (zwischen „Fett“ und „Unterstrichen“) | **Ist:** nur Maus (`onMouseDown` + `preventDefault`). **Soll zusätzlich:** Tastatur (Tab-Fokus + Enter/Leertaste) — vermutlich derzeit defekt, siehe Grenzfall 3.8 | Schaltet Kursiv auf der aktuellen Selektion bzw. an der Schreibmarke um (Toggle) — per Maus **und** per Tastatur gleichwertig |
| 2 | Tastenkombination Strg+I (Windows/Linux) bzw. Cmd+I (macOS) | global im Editor, solange dieser fokussiert ist | Tastendruck (Keymap, `WordEditor.tsx:99`) | identische Wirkung wie Klick auf den Button |
| 3 | Aktiv-Anzeige des Buttons | derselbe Button | passiv, aktualisiert sich bei jeder Selektionsänderung (Re-Render über `forceRender`, `WordEditor.tsx:131`) | `aria-pressed="true"` + visuell abgesetzter Hintergrund, wenn Schreibmarke/Selektion in kursivem Text steht (Sonderfälle: Abschnitt 3.1/3.2) |
| 4 | Tooltip / Accessible Name | derselbe Button | Hover bzw. Screenreader | `title="Kursiv"` **und** `aria-label="Kursiv"` (`Toolbar.tsx:73-74`) — muss unabhängig vom sichtbaren Glyph eindeutig sein |

**Explizit nicht vorhanden (muss dokumentiert, nicht stillschweigend fehlen):**
- Kein Kontextmenü-Eintrag „Kursiv“ (kein `contextmenu`-Handler; das native
  Browser-Kontextmenü bietet keinen Kursiv-Befehl) — nur Toolbar + Tastenkürzel.
- Kein „Formatierung löschen“-Befehl, der Kursiv gezielt (neben anderen Marks) entfernen
  würde — laut Backlog (`formatierung-loeschen`) generell „fehlt“. Einzige Möglichkeit,
  Kursiv zu entfernen, ist erneutes Toggle über denselben Button bzw. Strg+I.
- Kein separates SVG-Icon: der sichtbare Glyph ist der Buchstabe „K“ mit CSS-Klasse
  `italic` (`glyphClassName="italic"`), **kein** Unicode-/Emoji-Symbol. Kursiv ist damit
  vom Emoji-Rendering-Risiko aus Abschnitt 20 der Haupt-Spezifikation **nicht** betroffen,
  muss aber trotzdem visuell geprüft werden (ein kursives „K“ ist auf manchen
  Systemschriften kaum von einem aufrechten „K“ zu unterscheiden — geringes, aber reales
  Erkennbarkeitsrisiko; SVG-Präzedenz existiert bereits mit `ScissorsIcon`,
  `Toolbar.tsx:33-53`).

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundverhalten (Toggle)

1. **Mit Selektion:** Ist mindestens ein Zeichen markiert, wendet Klick/Strg+I Kursiv auf
   den gesamten markierten Bereich an, sofern nicht bereits (einheitlich) kursiv — dann
   wird Kursiv für den gesamten Bereich entfernt (echtes Toggle, nicht reines „Setzen“).
   *Technischer Vorbehalt:* Der aktuelle Aufruf `toggleMark(markType)` (ohne drittes
   Options-Argument, `Toolbar.tsx:78` und `WordEditor.tsx:98-100`) nutzt die
   Bibliotheks-Voreinstellung `removeWhenPresent: true`; damit **entfernt** ein Toggle bei
   einer **gemischten** Selektion die Formatierung, sobald sie irgendwo im Bereich
   vorkommt — das Gegenteil dieser Anforderung. Ob dies das gewünschte Word/LibreOffice-
   Verhalten ist, ist in Grenzfall 3.2 zu entscheiden und zu testen.
2. **Ohne Selektion (an der Schreibmarke):** Kursiv wird nicht auf umgebenden Text
   angewendet, sondern als „Stored Mark“ vorgemerkt (`state.storedMarks`) — der nächste
   getippte Text erscheint kursiv, bis erneut umgeschaltet oder die Schreibmarke bewegt
   wird (Standard-`toggleMark`-Verhalten).
3. **Setzen und Entfernen gleichwertig:** Ein- und Ausschalten müssen in beide Richtungen
   gleich zuverlässig funktionieren; beide sind zu testen, nicht nur das Setzen.
4. **Ein Undo-Schritt:** Eine Kursiv-Toggle-Aktion auf einer Selektion ist genau ein
   rückgängig machbarer Schritt (ein Strg+Z macht die gesamte Änderung rückgängig, nicht
   zeichenweise). Ein reines Umschalten des vorgemerkten Marks an leerer Schreibmarke
   (ohne Dokumentänderung) soll **keinen** eigenen Undo-Schritt erzeugen (die Transaktion
   ändert das Dokument nicht → `dispatchTransaction` löst kein `onChange` aus, da an
   `tr.docChanged` gebunden, `WordEditor.tsx:128-130`; zu bestätigen, dass
   `prosemirror-history` sie ebenfalls nicht als eigenen Schritt führt).

### 2.2 Aktiv-Zustand-Anzeige (kritisch, siehe Grenzfälle 3.1–3.2)

- Steht die Schreibmarke (ohne Selektion) in bereits kursivem Text, muss der Button sofort
  (ohne weitere Aktion) als aktiv erscheinen. Der Re-Render-Mechanismus dafür ist
  vorhanden (`forceRender` bei jeder Transaktion, `WordEditor.tsx:131`).
- Ist eine Selektion **durchgehend** kursiv, muss der Button aktiv erscheinen.
- Ist eine Selektion **gemischt** (teils kursiv, teils nicht), muss das Verhalten definiert
  und konsistent zu Word/LibreOffice sein (Grenzfall 3.2). Mindestens darf der Button
  keinen einheitlichen Zustand vortäuschen, der der Realität widerspricht.
- **Nach Toggle an leerer Schreibmarke** muss der Button den neuen Zustand sofort anzeigen,
  nicht erst nach dem ersten getippten Zeichen (Grenzfall 3.1 — code-belegter Verdacht auf
  einen Anzeigefehler).

### 2.3 Kombination mit anderen Formaten

- Kursiv muss gleichzeitig mit Fett, Unterstrichen, Durchgestrichen, Schriftfarbe und
  Hervorhebungsfarbe auf demselben Textlauf anwendbar sein, ohne dass sich die Marks
  gegenseitig verdrängen.
- Die **Reihenfolge** der Anwendung (erst Fett dann Kursiv oder umgekehrt) darf das
  Ergebnis nicht verändern. *Technischer Hinweis:* ProseMirror speichert Marks in
  Schema-Reihenfolge (`strong` vor `em`, `schema.ts:158/164`); der DOCX-Writer fasst Läufe
  über `JSON.stringify(marks)` zusammen (`writer.ts:54`) und der ODT-Writer dedupliziert
  Stile über `JSON.stringify(props)` — beide setzen damit implizit eine stabile
  Mark-Reihenfolge voraus. Dass diese Annahme auch bei über die UI in wechselnder
  Reihenfolge gesetzten Marks hält, ist zu verifizieren (kein doppelter Stil `T1`/`T2`
  für dieselbe visuelle Kombination).

### 2.4 Geltungsbereich innerhalb der Dokumentstruktur

Kursiv muss in **jedem** Inline-Kontext funktionieren, in dem Text vorkommen kann:
- Normale Absätze.
- Überschriften (Ebene 1–6). *Hinweis:* Beim Export laufen Überschriften über
  `w:pStyle`/`text:h`, der Inline-Text aber weiterhin über `inlineToRuns`/`inlineToOdt` —
  ein `em`-Mark innerhalb einer Überschrift wird also als Run-Kursiv geschrieben.
- Listenelemente (Aufzählung und nummeriert, auch mehrstufig).
- Tabellenzellen (inkl. mehrerer Absätze innerhalb einer Zelle).
- Kopf-/Fußzeilen (Reader/Writer verarbeiten `header`/`footer` bereits; sobald diese über
  die UI bedienbar sind — laut Haupt-Spezifikation Abschnitt 9 noch offen — gilt dieselbe
  Anforderung).
- Text vor und nach einem `hard_break` (Umschalt+Enter) innerhalb desselben Absatzes.
- Text unmittelbar vor/nach einem eingefügten Bild oder einer Tabelle (Grenzposition).

### 2.5 Zusammenspiel mit Undo/Redo

- Eine Kursiv-Toggle-Aktion ist ein eigener, rückgängig machbarer Schritt (siehe 2.1.4;
  Keymap `Mod-z`/`Mod-y`/`Mod-Shift-z`, `WordEditor.tsx:93-95`).
- Funktioniert in gemischter Sequenz mit Tipp-Vorgängen und anderen Toolbar-Aktionen
  (Haupt-Spezifikation Abschnitt 2, Testfall 5).
- Redo stellt die Kursiv-Anwendung wieder her.

### 2.6 Zusammenspiel mit Copy/Paste

- Kursiver Text, der **innerhalb** des Editors kopiert und eingefügt wird, behält seine
  Formatierung.
- **Von extern** kopierter Text wird als Kursiv erkannt, wenn er als `<em>`, `<i>` oder
  Inline-`font-style: italic` vorliegt (`schema.ts:165`, `parseDOM`). *Präzisierung:* Der
  Style-Matcher ist `font-style=italic` und greift **nur** bei exakt `italic` — extern
  kopiertes `font-style: oblique` wird beim Einfügen **nicht** als Kursiv erkannt
  (dieselbe Wurzel wie Grenzfall 3.6). End-to-end über den echten Zwischenablage-Vorgang
  zu verifizieren, nicht nur über die Schema-Definition. *Abhängigkeit:* Sobald eine
  Sanitizer-Pipeline für Paste eingeführt wird (`einfuegen`), muss sie `<em>`/`<i>`/
  `style="font-style: italic"` durchlassen, sonst regressiert dieser Fall stillschweigend.

---

## 3. Grenzfälle (Edge Cases) — mit code-belegter Einschätzung

Jeder Punkt ist aus dem tatsächlichen Code abgeleitet und braucht einen eigenen Test, der
das beobachtete Ist-Verhalten festhält (bestätigt den Verdacht **oder** widerlegt ihn).

### 3.1 Aktiv-Anzeige nach Toggle an leerer Schreibmarke (Verdacht: Anzeigefehler)

`Toolbar.tsx:69` ermittelt den Aktiv-Zustand über
`markType.isInSet(view.state.selection.$from.marks())`. `$from.marks()` liefert die Marks
aus dem **umgebenden Dokumentinhalt**, **nicht** `state.storedMarks` (die von ProseMirror
nach `toggleMark` auf leerer Selektion gesetzte Vormerkung für den nächsten Text).

> Schreibmarke in normalem (nicht-kursivem) Text, nichts selektiert → Klick auf „Kursiv“ →
> `storedMarks = [em]` (nächste Eingabe wird kursiv) → der Button liest weiterhin
> `$from.marks()` (unverändert) → **Verdacht: Button zeigt „nicht aktiv“, bis das erste
> Zeichen getippt wurde**, obwohl intern „Kursiv aktiv“ korrekt gesetzt ist.

**Anforderung:** entweder nachweisen, dass dieser Fall tatsächlich korrekt funktioniert,
oder als Fehler beheben (Standard-Fix: `state.storedMarks ?? $from.marks()`). In jedem Fall
ein Test: Cursor in Klartext → Kursiv umschalten (ohne Selektion) → **vor** dem Tippen
`aria-pressed` prüfen.

### 3.2 Aktiv-Anzeige und Toggle bei gemischter Selektion (Verdacht: falsch-positiv + falsches Toggle)

Dieselbe Zeile 69 prüft nur `$from.marks()` — bei einer Selektion über mehrere Läufe mit
unterschiedlicher Kursiv-Formatierung zählt **nur der Anfang** der Selektion, nicht der
gesamte Bereich (kein `rangeHasMark`/„every“-Test). Zusätzlich nutzt der Toggle-Aufruf
(`Toolbar.tsx:78`, `WordEditor.tsx:98-100`) `toggleMark(markType)` **ohne**
`removeWhenPresent`-Option, also die Voreinstellung `true`.

> Text „AB“, „A“ kursiv, „B“ nicht → beides markieren → Button spiegelt nur „A“ wider
> (voraussichtlich „aktiv“), obwohl die Selektion gemischt ist. Ein Klick würde mit
> `removeWhenPresent: true` die Kursivierung von „A“ **entfernen**, statt „B“ ebenfalls
> kursiv zu machen.

**Anforderung:** definieren und testen, was passieren soll (Word/LibreOffice-Konvention:
Button zeigt „nicht eindeutig aktiv“; ein erster Klick macht die **gesamte** Selektion
einheitlich kursiv, erst der nächste entfernt sie — entspricht `removeWhenPresent: false`).
Mindestens dokumentieren, ob das aktuelle Verhalten gewollt ist. Der Aktiv-Zustand darf
**vor** dem Klick keinen einheitlichen „aktiv“ vortäuschen. *(Umsetzungsmuster bereits im
Repo vorhanden und verifiziert: `isAlignActive` in `src/formats/shared/editor/commands.ts:29-37`
zeigt, dass ein Toolbar-Aktivzustand als eigener, isoliert testbarer Command-Helfer
implementiert werden kann statt inline in `Toolbar.tsx`; ein analoger `isMarkActive(state,
markType)`-Helfer — mit `storedMarks`-Fallback bei leerer Selektion und `rangeHasMark`-
Vollabdeckungsprüfung bei nicht-leerer Selektion — würde 3.1 und 3.2 gemeinsam beheben und
wäre unmittelbar unit-testbar, ohne einen View zu benötigen.)*

### 3.3 DOCX-Import: `<w:i w:val="false"/>` bzw. `w:val="0"` (Verdacht: Fehlinterpretation)

`marksFromRunProperties` (`docx/reader.ts:104`) prüft nur die **Existenz** von `<w:i>`,
nicht dessen `w:val`. In echten Word-Dokumenten schaltet `<w:i w:val="false"/>` bzw.
`w:val="0"` eine von einer Formatvorlage geerbte Kursivierung **gezielt aus**.
**Konkreter Beleg:** Die unmittelbar folgende Unterstrichen-Prüfung (Zeile 105-106) wertet
`w:val !== 'none'` aus — Kursiv (und ebenso Fett, Zeile 103) tut das nicht, der Code ist an
dieser Stelle also nachweislich inkonsistent. *(Der zugehörige Umsetzungsplan
`specs/kursiv-code.md` belegt diesen Fall zusätzlich an einer realen Repo-Fixture,
`tests/fixtures/external/docx/form_footnotes.docx` mit `<w:i w:val="0"/>`.)*

> **Verdacht:** `<w:i w:val="false"/>` wird fälschlich als „kursiv an“ interpretiert.

**Anforderung:** Testfall mit einer DOCX (real vorhandene Fixture oder minimal
konstruiert), die einen Lauf mit `<w:rPr><w:i w:val="false"/></w:rPr>` enthält → nach
Import darf dieser Lauf **nicht** kursiv sein. Bestätigt sich der Fehler, muss der Reader
`w:val` nach ST_OnOff auswerten (fehlend/`true`/`1`/`on` = an; `false`/`0`/`off` = aus).

### 3.4 DOCX-Import: Kursiv über Zeichenformatvorlage (`w:rStyle`) statt direktem `<w:i/>` (Verdacht: stiller Datenverlust)

`marksFromRunProperties` liest ausschließlich direkte Kind-Elemente von `w:rPr`. Ein
`<w:rStyle w:val="Emphasis"/>` (bzw. „Betont“), das auf eine in `word/styles.xml`
definierte Zeichenformatvorlage mit `<w:i/>` verweist, wird **nicht aufgelöst** — es gibt
im Reader **keinen** `w:rStyle`-Pfad (verifiziert: `parseStylesXml` liest nur `outlineLvl`).

> **Verdacht:** Text, der in einer echten Word-Datei nur über die Formatvorlage „Betont“
> kursiv ist, verliert die Kursivierung beim Import vollständig und stillschweigend — ein
> von Abschnitt 18 der Haupt-Spezifikation ausdrücklich verbotener stiller Datenverlust.

**Anforderung:** Testfall mit `word/styles.xml` mit einer Zeichenformatvorlage „Emphasis“
(`<w:i/>` in deren `w:rPr`) und einem Lauf `<w:rPr><w:rStyle w:val="Emphasis"/></w:rPr>` →
nach Import muss der Text kursiv sein. Bestätigt sich der Verdacht, muss der Reader
`w:rStyle` auf `styles.xml` auflösen (inkl. Vererbung über `w:basedOn`).

### 3.5 ODT-Import: Kursiv über benannte Formatvorlage (`office:styles`) / Vererbung (`style:parent-style-name`) (Verdacht: stiller Datenverlust)

`parseAutomaticStyles` (`odt/reader.ts`, ab Zeile 37) durchsucht **ausschließlich**
`office:automatic-styles`. Ein `text:style-name`, das auf eine in `office:styles`
definierte **benannte** Zeichenformatvorlage (z. B. „Emphasis“) verweist, wird nicht
gefunden (`textStyles.get(name)` → `undefined` → `marksFor` gibt `[]` zurück). Zusätzlich
wird `style:parent-style-name` (Vererbung) an **keiner** Stelle ausgewertet.

> **Verdacht:** Reale LibreOffice-/Word-ODT, die Kursiv über die eingebaute **benannte**
> Zeichenformatvorlage „Betont“ oder über einen kursiven Eltern-Stil anwenden, verlieren
> die Kursiv-Information beim Import.

*Abgrenzung (wichtig):* Kursiv über eine **automatische** Formatvorlage
(`text:style-name` → Definition in `office:automatic-styles`) funktioniert bereits und ist
E2E abgedeckt (Fixtures `fullCoverageDocument`/`richDocument`). Dieser Grenzfall betrifft
**nur** benannte Stile aus `office:styles` und die Vererbungskette.

**Anforderung:** (a) Testfall mit einer ODT, deren Textlauf über `text:style-name` auf eine
Formatvorlage in `office:styles` mit `fo:font-style="italic"` verweist; (b) Testfall mit
einer automatischen Formatvorlage, die Kursiv nur über `style:parent-style-name` erbt.
Beide → Text muss nach Import kursiv sein. Bestätigt sich der Verdacht, muss der Reader
`office:styles` und die Vererbungskette auflösen.

### 3.6 ODT-Import: `fo:font-style="oblique"` (Verdacht: nicht erkannt)

Der Reader prüft exakt `=== 'italic'` (`odt/reader.ts:53`); ODF erlaubt auch `oblique`.
Dieselbe Wurzel betrifft den Schema-`parseDOM`-Matcher `font-style=italic` (Paste, 2.6).

**Anforderung:** klären, ob `oblique` als Kursiv behandelt werden soll (vertretbare
Vereinfachung — beide gelten inhaltlich als „kursiv“; das PM-Schema hat ohnehin keine
Mark, die zwischen `italic` und `oblique` unterscheidet, ein importiertes `oblique` würde
beim Export immer als `italic` zurückgeschrieben). Falls ja: Reader (und ggf. `parseDOM`)
erweitern und mit Testfall absichern; falls bewusst nicht: explizit dokumentieren statt
stillschweigend zu ignorieren.

### 3.7 Selektions-Sync-Regression mit Kursiv statt Fett (Pflicht-Regressionstest fehlt)

Der bereits gefundene, laut Angabe behobene Selection-Sync-Bug (Haupt-Spezifikation
Abschnitt 2; Fix: `reconcileSelectionOnClick` + Mouseup-Vergleich, `WordEditor.tsx:43-50,
143-155`) ist in `tests/e2e/selection-regression.spec.ts` **ausschließlich mit „Fett“**
abgedeckt (`page.getByTitle('Fett').click()`, verifiziert: Zeilen 20/52/68/94). Da der Fix
generisch in der Editor-Ebene ansetzt, ist zu verifizieren, ob er auch greift, wenn
**Kursiv** die auslösende Aktion ist.

**Anforderung:** dieselben Testfälle aus `selection-regression.spec.ts` (einfache Sequenz,
Tabellenzellen-Variante, Mehr-Zyklen-Variante) zusätzlich mit „Kursiv“ als auslösender
Aktion und dauerhaft in der Suite.

### 3.8 Kursiv-Button nicht per Tastatur bedienbar (Verdacht: Bedien-/Barrierefreiheitsdefekt)

Der geteilte `MarkButton` (`Toolbar.tsx:55-89`) verdrahtet den Toggle **ausschließlich**
über `onMouseDown` (Zeile 76-79). Ein natives `<button>` feuert bei Tastatur-Aktivierung
(Tab-Fokus + Enter oder Leertaste) **kein** `mousedown`, sondern nur `click`.

> **Erwartung:** Tab zum „K“-Button, Enter/Leertaste → Kursiv schaltet um.
> **Vermutetes Ist:** nichts passiert. (Strg+I wirkt weiterhin, da über die Keymap
> `WordEditor.tsx:99` — der **Button** selbst bleibt aber tastaturunbedienbar.)

Der Verdacht deckt sich mit „Defekt A“ in `specs/fett-req.md` (identische Komponente).
**Anforderung:** Test mit `button.focus()` bzw. wiederholtem `Tab`, dann `Enter` und
separat `Space` → Toggle muss wirken. Bestätigt sich der Defekt, übliche Behebung: Toggle
nach `onClick` verschieben, `onMouseDown` behält nur `preventDefault()`. Da `MarkButton`
geteilt ist, betrifft (und behebt) dies Fett/Kursiv/Unterstrichen/Durchgestrichen
gemeinsam — die **Testabdeckung** dieser Anforderung bleibt auf Kursiv beschränkt.

### 3.9 Weitere Grenzfälle

| # | Fall | Erwartung |
|---|---|---|
| 1 | Kursiv am Dokumentanfang (Position 0) bzw. -ende | funktioniert identisch zu jeder anderen Position |
| 2 | Kursiv in leerem Absatz umschalten, danach tippen | getippter Text erscheint kursiv (Stored Mark) |
| 3 | Kursiv in leerer Tabellenzelle umschalten, danach tippen | wie 2, zusätzlich kein Übergriff auf Nachbarzellen; kein leerer `<w:r>`/`<text:span>` ohne Inhalt im Export (`storedMarks` erreichen den Writer nicht, da nicht Teil von `doc.toJSON()`) |
| 4 | Kursiv-Text unmittelbar vor einem `hard_break`, Text danach | Kursiv-Zustand beider Zeilenteile unabhängig korrekt; keine unbeabsichtigte Formatierung über den Umbruch hinweg |
| 5 | Kursiv gemeinsam mit Tabulator-Zeichen (`\t`) im selben Lauf | Tab-Zeichen bleibt erhalten (ODT: `<text:tab/>`, siehe Haupt-Spezifikation Abschnitt 15); Kursiv schließt das Tab konsistent ein oder aus |
| 6 | Strg+I, während der Fokus auf einem anderen Steuerelement liegt (Farbwähler-Input, Absatzformat-Dropdown) | darf nicht versehentlich auf den Editor wirken, wenn dieser nicht fokussiert ist |
| 7 | Sehr lange Selektion (Strg+A in langem Dokument) mit Kursiv-Toggle | funktioniert ohne spürbare Verzögerung, UI bleibt reaktionsfähig |
| 8 | Kursiv-Toggle unmittelbar gefolgt von Export (kein Zwischenklick) | Export enthält den gerade gesetzten/entfernten Zustand korrekt (keine Race-Condition; `dispatchTransaction` schreibt synchron in den Modellzustand, `WordEditor.tsx:126-127`) |
| 9 | Doppelter/sehr schneller Klick auf den Kursiv-Button | kein doppeltes Toggle durch Event-Bubbling |
| 10 | Kursiv über eine Selektion, die Text **und** ein Bild/Tabellenstruktur umfasst (z. B. Strg+A über gemischten Inhalt) | kein Absturz; Kursiv wirkt nur auf Inline-Text, Bilder/Tabellenstruktur bleiben unverändert |
| 11 | Zusammenspiel mit noch nicht existierender Änderungsverfolgung (Track Changes, Phase 3) | derzeit kein Verhalten definiert — nur als offener Punkt vermerkt, keine Testpflicht vor Umsetzung von Abschnitt 13 der Haupt-Spezifikation |

### 3.10 Mehrzell-Selektion (`CellSelection`) statt Textselektion (Nachtrag — war in Korrekturvermerk 5.2 angekündigt, aber in der Vorfassung nie tatsächlich ausformuliert)

**Korrekturvermerk zu diesem Punkt:** Der Korrekturvermerk-Absatz oben (Punkt 5.2) behauptete
„Neu ergänzt als Grenzfall 3.10" — in der geprüften Vorfassung existierte dieser Abschnitt
jedoch **nicht**, weder unter dieser noch unter einer anderen Nummer (Abschnitt 3 endete bei
3.9). Das ist selbst eine Instanz genau des Fehlers, den dieser Korrekturvermerk an anderer
Stelle bei der eigenen Vorfassung kritisiert: eine im Änderungsprotokoll behauptete
Ergänzung, die im Dokumentkörper nie tatsächlich vorgenommen wurde. Wird hiermit **nachgeholt**,
nicht nur protokolliert.

`prosemirror-tables@1.8.5` (`package.json:29`) erzeugt bei einer Mausauswahl über mehrere
ganze Tabellenzellen hinweg (Ziehen über Zellgrenzen, **nicht** Strg+A) eine `CellSelection`
(`node_modules/prosemirror-tables/dist/index.js:508ff`) mit einer eigenen, pro erfasster
Zelle aufgebauten `ranges`-Liste — anders als bei einer gewöhnlichen `TextSelection`.

- **Toggle:** `toggleMark(wordSchema.marks.em)` (identischer Aufruf wie in `Toolbar.tsx:78`
  und `WordEditor.tsx:99`) iteriert intern korrekt über **alle** `ranges` einer Selektion,
  unabhängig vom konkreten `Selection`-Subtyp — die Kursiv-Anwendung sollte also grundsätzlich
  jede erfasste Zelle erreichen, nicht nur die erste. Zu verifizieren: ein Test mit mehreren
  Zellen (eine bereits kursiv, eine nicht), per Ziehen über die Zellgrenze ausgewählt,
  „Kursiv" geklickt → **beide** Zellen tragen danach denselben, konsistenten Zustand (siehe
  auch Grenzfall 3.2 zur `removeWhenPresent`-Semantik, die hier identisch greift).
- **Aktiv-Anzeige (Verdacht, hängt an Grenzfall 3.2):** Die aktuelle Implementierung
  (`Toolbar.tsx:69`, `$from.marks()`) liest nur `selection.$from` — und `$from`/`from` einer
  `CellSelection` entsprechen laut Konstruktor den Grenzen von `ranges[0]`, also **nur der
  ersten** erfassten Zelle, nicht der Gesamtselektion. **Verdacht:** Bei einer
  Mehrzell-`CellSelection` mit gemischtem Kursiv-Zustand zeigt der Button einen Zustand, der
  ausschließlich von der ersten Zelle abhängt, nicht vom tatsächlichen Zustand aller
  markierten Zellen.

**Anforderung:** Eigener Testfall — mehrere Tabellenzellen anlegen, eine kursiv, eine nicht,
per Ziehen über die Zellgrenze auswählen (nicht Strg+A), dann: (a) `aria-pressed` **vor** dem
Klick prüfen (muss den Gesamtzustand widerspiegeln, nicht nur die erste Zelle — dieselbe
`isMarkActive`-Korrektur wie in Grenzfall 3.2 würde beide Fälle gemeinsam beheben), (b) nach
Klick prüfen, dass **alle** erfassten Zellen konsistent umgeschaltet wurden, nicht nur die
erste. Identisch zu `specs/fett-req.md` Grenzfall 15 (derselbe, geteilte Code-Pfad) — dort
bereits vorhanden, hier bisher nur angekündigt und jetzt nachgezogen.

---

## 4. Visuelle Darstellung

- Kursiver Text muss im Editor sichtbar schräggestellt dargestellt werden. Verifiziert:
  `src/index.css` enthält **keine** Regel für `em`/`font-style` und **keinen** globalen
  Reset (auch Tailwinds Preflight setzt `font-style` nicht zurück), der die Standard-
  `<em>`-Darstellung neutralisiert — Kursiv kommt somit aus dem Browser-Standardstil. Bei
  einer künftigen CSS-Änderung ist erneut zu prüfen, dass keine Regel
  `em { font-style: normal }` o. Ä. entsteht; der E2E-`getComputedStyle`-Test (5.2) hält
  diese stillschweigende Abhängigkeit einmal automatisiert fest.
- Der Button-Glyph „K“ muss im aktiven Zustand (`aria-pressed="true"`) denselben
  Kontrast/dieselbe Erkennbarkeit bieten wie „Fett“ („F“). Aktiv-Styling: dunkler
  Hintergrund im Light-Mode, heller im Dark-Mode (`Toolbar.tsx:80-84`) — in **beiden**
  Farbschemata zu verifizieren. Der Aktiv-Zustand, nicht der Neigungswinkel des Glyphs,
  ist das primäre Unterscheidungsmerkmal.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Grundprinzip der Haupt-Spezifikation: Datei A hochladen → **unverändert** exportieren →
Ergebnis entspricht inhaltlich A. Für Kursiv verbindlich für **beide** Formate, in
**beiden** Richtungen.

### 5.1 Pflicht-Szenarien (über echte UI-Bedienung, sofort abnahmerelevant)

1. **DOCX, Editor-Erzeugung:** Neu → Text tippen → Teil kursiv → Export DOCX → Re-Import →
   derselbe Teil (und nur er) ist kursiv. *(Teil-Abdeckung vorhanden:
   `clipboard-roundtrip.spec.ts:186-190` prüft Klick + `<w:i/>` im Export; um den
   **Re-Import** zu ergänzen. **Zusätzliche Lücke:** dieser Test läuft wegen
   `test.skip(browserName === 'webkit', …)` (`:264`) auf **keinem** WebKit-Projekt
   [Tablet, Desktop Safari (Clipboard)] — der Re-Import-Test sollte diese Lücke nicht
   einfach mit-erben, sondern WebKit explizit mit abdecken oder die Nichtabdeckung
   bewusst dokumentieren.)*
2. **ODT, Editor-Erzeugung:** dieselbe Sequenz als ODT. *(Ergänzen — für ODT existiert der
   Button-Klick-Export-Fall noch nicht explizit.)*
3. **DOCX-Fremddatei-Rundreise (unverändert):** unabhängig erzeugte DOCX mit
   `<w:rPr><w:i/></w:rPr>` hochladen → **ohne Änderung** exportieren → im exportierten
   `word/document.xml` ist derselbe Text weiterhin `<w:i/>`, kein anderer Text hat Kursiv
   gewonnen/verloren. *(Nahe abgedeckt durch `roundtrip-fidelity.spec.ts` DOCX→DOCX für
   „kursiv-rot“; für einen reinen Kursiv-Lauf zu bestätigen.)*
4. **ODT-Fremddatei-Rundreise (unverändert):** analog mit einer ODT, deren Lauf über
   `text:style-name` auf eine automatische Formatvorlage mit `fo:font-style="italic"`
   verweist. *(Nahe abgedeckt durch `roundtrip-fidelity.spec.ts` ODT→ODT.)*
5. **Kombination bei Rundreise:** Text gleichzeitig fett **und** kursiv **und** farbig →
   nach Export/Re-Import (je Format) bleiben alle drei Eigenschaften an genau diesem Lauf
   erhalten, keine Vermischung mit Nachbartext, keine Stil-Duplikate (siehe 2.3). *(Für
   fett+kursiv auf Unit-Ebene abgedeckt; E2E über echte Bedienung mit drei nacheinander
   gesetzten Marks zu ergänzen.)*
6. **Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise:** wie 1/2, aber innerhalb
   einer Überschrift, eines Listenpunkts und einer Tabellenzelle — jeweils einzeln.
7. **Echter Datei-Upload-Dialog statt direkter `setInputFiles`-Injektion.** *(Nachtrag —
   war in Korrekturvermerk 5.4 angekündigt, aber in der Vorfassung nirgends im
   Dokumentkörper tatsächlich als Anforderung formuliert, nur im Änderungsprotokoll
   erwähnt.)* Verifiziert: **jeder** heute Kursiv berührende Upload-Testfall
   (`docx.spec.ts`, `odt.spec.ts`, `roundtrip-fidelity.spec.ts` — je mehrfach
   `setInputFiles`) ruft `input.setInputFiles(...)` **direkt** auf dem versteckten
   `<input type="file">` auf (`FormatPicker.tsx:96-98`) und umgeht damit den sichtbaren
   „Datei hochladen"-Button (`FormatPicker.tsx:82`) samt dessen Klick-Handler
   (`FormatPicker.tsx:79`, `fileInputs.current[module.id]?.click()`) vollständig. Ein
   `waitForEvent('filechooser')`-Muster existiert im Repo bereits (nur in
   `file-open-edge-cases.spec.ts`), aber für keinen Kursiv-berührenden Test.
   **Anforderung:** Für **mindestens einen** Rundreise-Testfall je Format (DOCX **und**
   ODT) aus Punkt 1/2 oben ist zusätzlich der echte Klickpfad Pflicht:
   `page.waitForEvent('filechooser')` + Klick auf „Datei hochladen" statt direktem
   `setInputFiles`. Die schnelleren `setInputFiles`-Tests bleiben für die übrigen Fälle
   zulässig und ergänzend bestehen. Identisch zu `specs/fett-req.md` Testfall 10 (derselbe,
   geteilte Upload-Mechanismus) — dort bereits vorhanden, hier bisher nur angekündigt und
   jetzt nachgezogen.

### 5.2 Unabhängige Validierung (formatunabhängiger Parser)

8. **ODT:** Ein exportiertes Dokument mit Kursiv gegen das offizielle OASIS-ODF-1.3-Schema
   validieren. *(Infrastruktur + em-Abdeckung bereits vorhanden:
   `odt/__tests__/external-validation.test.ts:62` — bei Änderungen erhalten.)*
9. **DOCX:** Der exportierte Kursiv-Lauf muss zusätzlich mit einem vom eigenen Reader
   **unabhängigen** Mittel als korrekt erkannt werden (z. B. `mammoth` als DevDependency
   oder direkte `word/document.xml`-Prüfung auf `<w:i/>` im richtigen `w:rPr`, ohne
   `readDocx`). *(Lücke: `docx/__tests__/external-validation.test.ts` prüft aktuell nur
   `strong`, `<strong>fettem</strong>` Zeile 72 — um einen `em`-Lauf zu erweitern.)*

### 5.3 Cross-Format-Rundreise — **derzeit blockiert (Ziel-Anforderung, kein sofortiges Abnahmekriterium)**

Cross-Format-Export (DOCX→ODT und ODT→DOCX) ist über die UI **derzeit nicht möglich**:
`DocumentWorkspace.handleExport` (`src/app/DocumentWorkspace.tsx:68`) ruft immer
`module.exportFile` des **Ursprungs**-Moduls auf (Zeile 81); es gibt keinen Formatwähler.
Die entsprechenden E2E-Tests sind bewusst deaktiviert (`roundtrip-fidelity.spec.ts:256-257`,
`test.skip`, „blocked on backlog slug `speichern-unter-format`“).

**Anforderung (nachgelagert):** Sobald `speichern-unter-format` (Cross-Format-Export)
umgesetzt ist, gelten zusätzlich:
- **10.** DOCX mit Kursiv → als ODT exportieren → Kursiv bleibt (`fo:font-style="italic"`).
- **11.** ODT mit Kursiv → als DOCX exportieren → Kursiv bleibt (`<w:i/>`).
- **12.** Doppelte Rundreise DOCX → ODT → DOCX (bzw. umgekehrt) → Kursiv nach zwei
  Konvertierungen weiterhin an exakt derselben Stelle.

*Hinweis:* Da beide Writer (`writeDocx`/`writeOdt`) dasselbe interne Modell
(`WordDocumentContent`) verarbeiten, ist eine Cross-Format-Prüfung auf **Unit-/Writer-Ebene**
schon jetzt möglich (Modell → `writeOdt` → `readOdt` vs. `writeDocx` → `readDocx`) und
kann als Vorab-Absicherung geschrieben werden, auch bevor der UI-Weg existiert. Der
**E2E-Nachweis über echte Bedienung** bleibt bis `speichern-unter-format` blockiert.

### 5.4 Aus Abschnitt 3 übernommene, für Kursiv verbindliche Rundreise-Grenzfälle

Die Fälle 3.3–3.6 (`w:val="false"`, `w:rStyle`, ODT-benannte-Stile/Vererbung, `oblique`)
sind Teil der Rundreise-Anforderung: „unverändert exportieren“ darf nicht dazu führen,
dass eine beim Import bereits (fälschlich) verlorene oder hinzugefügte Kursiv-Information
zementiert wird.

---

## 6. Testplan — Zusammenfassung (Ist vs. Lücke)

| Ebene | Bereits vorhanden (verifiziert) | Zu ergänzen |
|---|---|---|
| Schema/Unit (konstruierte Daten) | `em` allein + `[strong, em]`, DOCX **und** ODT (`docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts`) | Grenzfälle 3.3–3.6 (w:val=false, w:rStyle, ODT-benannte-Stile/Vererbung, oblique) |
| E2E: Button-Klick „Kursiv“ | `clipboard-roundtrip.spec.ts:190` (Klick → Export → `<w:i/>`; läuft laut `:264` nur auf Chromium+Firefox, **nicht** auf Tablet/Desktop Safari) | Re-Import-Bestätigung (5.1.1); ODT-Pendant (5.1.2); **WebKit-Abdeckung des Klick-Falls selbst** (Korrekturvermerk 6) |
| E2E: Tastenkürzel Strg+I | — (keiner) | Neuer Test: Selektion → `press('ControlOrMeta+i')` → `em` gesetzt; ohne Selektion → tippen → kursiv |
| E2E: Button per Tastatur (Fokus + Enter/Space) | — (keiner) | Grenzfall 3.8: Tab-Fokus → Enter/Space → Toggle wirkt |
| E2E: Import + Rendering | DOCX `docx.spec.ts:300`, ODT `odt.spec.ts:276` (`.ProseMirror em`) | reiner Kursiv-Fremddatei-Rundreise-Fall (5.1.3/5.1.4) |
| E2E: kombinierte Rundreise (gleiches Format) | `roundtrip-fidelity.spec.ts` DOCX→DOCX & ODT→ODT (`em` „kursiv-rot“ + Farbe + Ausrichtung, vor/nach Zyklus) | fett+kursiv+farbig **über echte Bedienung** nacheinander gesetzt (5.1.5) |
| E2E: Aktiv-Zustand (`aria-pressed`) | — (keiner) | Grenzfälle 3.1 (leere Schreibmarke) und 3.2 (gemischte Selektion) |
| E2E: Selektions-Sync mit Kursiv | — (nur Fett) | Grenzfall 3.7: `selection-regression`-Fälle mit Kursiv |
| Unabhängige Validierung | ODT inkl. `em` (`external-validation.test.ts:62`) | DOCX: `em`-Lauf ergänzen (5.2.9) |
| E2E: echter Upload-Dialog (`filechooser`) | `file-open-edge-cases.spec.ts` (format-unabhängig, kein Kursiv-Bezug) | Mindestens 1 Rundreise-Test je Format mit echtem `waitForEvent('filechooser')` + Klick statt `setInputFiles` (5.1.7) |
| Cross-Format | — (E2E `test.skip`, blockiert) | Writer-Unit-Vorabsicherung jetzt möglich; E2E nach `speichern-unter-format` (5.3) |

---

## 7. Abnahmekriterien (Definition of Done)

„Kursiv“ gilt erst dann wieder als **vertrauenswürdig „vorhanden“**, wenn:

1. Alle Punkte aus Abschnitt 2 (Grundverhalten, Aktiv-Anzeige, Kombination,
   Geltungsbereich, Undo/Redo, Copy/Paste) automatisiert und grün sind — inklusive des
   **Tastenkürzels Strg+I per echtem Tastendruck** (nicht nur Button-Klick) **und** der
   **Tastatur-Bedienung des Buttons selbst** (Grenzfall 3.8).
2. Jeder Grenzfall aus Abschnitt 3 einzeln durch einen Test beantwortet ist — entweder
   „bestätigt funktionsfähig“ oder „Fehler gefunden und behoben, mit Regressionstest
   abgesichert“. Kein Punkt bleibt offen; für jeden in 3.2–3.6, 3.8 und 3.10 bestätigten
   Fehler liegt ein Fix vor **oder** die Einschränkung ist bewusst dokumentiert (kein
   stiller Fehlschlag, Haupt-Spezifikation Abschnitt 20).
3. Die Aktiv-Zustand-Anzeige (`aria-pressed`) ist für Kursiv in mindestens den Zuständen
   „Cursor in kursivem Text“, „Toggle an leerer Schreibmarke“ (3.1) und „gemischte
   Selektion“ (3.2) getestet.
4. Alle Pflicht-Rundreise-Szenarien aus **5.1** (gleiches Format, DOCX **und** ODT,
   inkl. Kombination und Struktur-Kontexte) grün sind.
5. Die unabhängigen Validierungen aus **5.2** grün sind — für ODT (vorhanden, erhalten)
   **und** für DOCX (um den `em`-Lauf ergänzt).
6. Der Selektions-Sync-Regressionstest (3.7) mit Kursiv dauerhaft Teil der Suite ist.
7. Das visuelle Erkennbarkeitsrisiko des „K“-Glyphs (Abschnitt 4) bewertet und das
   Ergebnis hier nachgetragen wurde (bewusst beibehalten oder auf SVG umgestellt).
8. Mindestens ein Rundreise-Test je Format den echten Datei-Upload-Dialog
   (`waitForEvent('filechooser')` + Klick auf „Datei hochladen") statt ausschließlich
   `setInputFiles` verwendet (5.1.7), und der Mehrzell-`CellSelection`-Grenzfall (3.10)
   beantwortet ist.

**Nicht Teil dieser Abnahme (nachgelagert, blockiert):** Die Cross-Format-Szenarien aus
**5.3** (Punkte 10–12) sind erst nach Umsetzung von `speichern-unter-format` abnahmerelevant.
Eine Writer-Unit-Vorabsicherung darf/soll bereits vorher geschrieben werden, ist aber kein
Blocker für den Status „vertrauenswürdig vorhanden“ von Kursiv.

Erst nach Erfüllung der Punkte 1–8 darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)“ auf „verifiziert“ geändert werden.
