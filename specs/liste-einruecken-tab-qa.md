# Testplan „Listenebene per Tab ändern" — QA-Verifikation

Gegenstück zu `specs/liste-einruecken-tab-req.md` (Anforderung, überarbeitete
Fassung **2026-07-05**) und `specs/liste-einruecken-tab-code.md` (Umsetzungsplan,
Fassung **2026-07-05**). Dieses Dokument legt fest, **welche Tests** geschrieben
werden, **wo** sie liegen, **wie** sie deterministisch ausgeführt werden und
**wann** ein Punkt als abgehakt gilt.

> **Zeilennummern am 2026-07-05 direkt am Quellcode neu bestätigt.** Diese Fassung
> zieht die in `-req.md`/`-code.md` (Stand 2026-07-05) korrigierten Fundstellen
> nach: das Keymap-Objekt ist durch das später gebaute `Shift-Delete`/Cut-Feature
> um ~8 Zeilen nach unten gewandert (`WordEditor.tsx:85-107` statt vormals `77-99`;
> `Enter: splitListItem` jetzt Z. 96, `Shift-Enter: insertHardBreak()` Z. 97).
> Der **Sachverhalt** (Tab/Shift-Tab fehlen als einziger echter Fehlstand) ist
> unverändert; Zeilennummern sind indikativ und vor der Umsetzung erneut zu prüfen.

> ## ⚠️ Diese Fassung korrigiert einen veralteten Vorgänger-Testplan
>
> Eine frühere Version dieser Datei baute — wie bei `-req.md`/`-code.md` — auf
> einem **deutlich älteren Codestand** auf und behauptete u. a.
> „`WordEditor.tsx:71-80` enthält kein `Tab`", „`Toolbar.tsx:214-224` hat nur
> den ⇧-Liste-Button", „`docx/styleDefs.ts` definiert nur `w:ilvl="0"`",
> „`docx/reader.ts` liest kein `w:ilvl`". Diese Aussagen sind **am aktuellen
> Quellcode (2026-07-05) verifiziert falsch**:
> - Keymap-Objekt liegt in `WordEditor.tsx:85-107` (`Enter: splitListItem` bei
>   96, `Shift-Enter: insertHardBreak()` bei 97, `Shift-Delete: cutSelection(...)`
>   bei 106) — dort ist **noch** kein `Tab`/`Shift-Tab` gebunden (das ist der
>   einzige echte Fehlstand). Der Import Z. 12 zieht bereits `cutSelection,
>   insertHardBreak` aus `./commands` — `commands.ts` ist also schon eingebunden.
> - Die Listen-Buttons stehen in `Toolbar.tsx:241-273` (`title="Aufzählung"`,
>   `"Nummerierte Liste"`, `"Liste aufheben"`).
> - `docx/styleDefs.ts` `numberingXml()` (50-74) definiert **alle 9 Ebenen**
>   für Bullet **und** Ordered.
> - `docx/reader.ts` `listMarkerFor` (294-302) **liest `w:ilvl`** und
>   `groupLists` (379-440) baut daraus per `Frame`-Stack eine korrekt
>   verschachtelte Struktur.
> - Die verschachtelte 2-Ebenen-Rundreise ist **bereits durch grüne Unit-Tests
>   belegt** (`docx/__tests__/roundtrip.test.ts` „preserves a nested list two
>   levels deep", `odt/__tests__/roundtrip.test.ts:169-194`).
>
> **Konsequenz für die QA-Strategie:** Die Reader/Writer-Verschachtelungs-
> maschinerie wird **verifiziert, nicht als fehlend behandelt**. Neu **gebaut**
> wird nur der Editor-Kern (Tab/Shift-Tab-Bindung + Commands + Button, drei
> Dateien) sowie — als Enhancements — die Ebenen-Typ-Reader-Fixes und tiefere
> Ebenen-Stile. Dieser Plan ist damit **überwiegend Regressions-/
> Verifikationsschutz** plus Bauabnahme des Editor-Kerns.

## Ist-Stand, gegen den getestet wird (verifiziert 2026-07-05)

| Bereich | Status | Fundstelle |
|---|---|---|
| Tab/Shift-Tab-Bindung | **fehlt** (einzig echter Fehlstand) | `WordEditor.tsx:85-107` (Keymap-Objekt) |
| `sinkListItem`/Einrück-Command | **fehlt** | `commands.ts:2` (nur `wrapInList, liftListItem`), `liftFromList` 62-64 |
| „Einzug erhöhen"-Button | **fehlt** | `Toolbar.tsx:241-273` |
| Schema-Nesting (`list_item = block+`) | **vorhanden** | `schema.ts:147` |
| DOCX-Import `w:ilvl` + Verschachtelung | **vorhanden** | `docx/reader.ts:294-302`, `groupLists` 379-440 |
| DOCX-Export `w:ilvl` je Tiefe + 9 Ebenen | **vorhanden** | `docx/writer.ts:96-140`, `docx/styleDefs.ts:50-74` |
| ODT-Import/-Export Rekursion | **vorhanden** | `odt/reader.ts:286-299`, `odt/writer.ts:99-109` |
| 2-Ebenen-Rundreise DOCX+ODT | **vorhanden + grün getestet** | `docx`/`odt roundtrip.test.ts` (nested-Test) |
| DOCX `parseNumberingXml` ebenen-blind | **Rest-Lücke** (nur erstes `<w:lvl>`) | `docx/reader.ts:78-98` |
| ODT `listKinds` ebenen-blind | **Rest-Lücke** (ignoriert `text:level`) | `odt/reader.ts:70-75` |
| ODT `listStyleDefs` nur Ebene 1 | **Rest-Lücke** (Ebene 2+ undefiniert) | `odt/styleRegistry.ts:98-103` |

Zwei Testebenen, die sich ergänzen, **von denen keine die andere ersetzt**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene, DOCX **und** ODT — schnell, präzise, aber blind gegenüber
   Toolbar/Tastatur/echtem Datei-Dialog. Ergänzt um direkte Command-Tests
   (`indentListItem`/`outdentListItem`), die den Fokus-Schutz isoliert
   absichern.
2. **Echte Playwright-Browser-Tests** — echter `Tab`-/`Shift+Tab`-Tastendruck
   im Editor, echte Klicks auf Toolbar-Buttons, echter
   `input.setInputFiles()`-Upload, echter `page.waitForEvent('download')`-Export
   und Prüfung der **tatsächlich heruntergeladenen Datei** (JSZip auf
   `word/document.xml` bzw. `content.xml`), **nicht** ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`indentListItem`/`outdentListItem`.
   Kein Test in Abschnitt 2 darf diese Funktionen direkt importieren.

Referenzierte Fixtures (Existenz per `ls` bestätigt, keine neuen zu beschaffen):
`tests/fixtures/external/docx/ComplexNumberedLists.docx`, `Numbering.docx`,
`NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx`;
`tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, `liste2.odt`,
`listsInTable.odt`, `simple-table-with-lists.odt`, `ListOddity.odt`,
`ListStyleResolution.odt`, `imageWithinList.odt`.

---

## 0. Ausführung, Reihenfolge, Determinismus

### 0.1 Befehle

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

`playwright.config.ts` definiert **fünf** Projekte: drei Basisprojekte
(`Desktop Chrome`, **`Mobile` = Pixel 7 (Touch)**, `Tablet` = iPad Mini) sowie
zwei **clipboard-spezifische** (`Desktop Safari (Clipboard)`,
`Desktop Firefox (Clipboard)`), die per `testMatch: /clipboard.*\.spec\.ts/`
**ausschließlich** die `clipboard*.spec.ts` ausführen (Konfig Z. 43-53). Die neue
Datei `list-indent.spec.ts` fällt **nicht** unter dieses `testMatch` und läuft
daher in genau den **drei Basisprojekten** — dort muss **jeder** neue Testfall
grün sein, insbesondere im `Mobile`-Projekt (dort sind zuletzt genau die unten
beschriebenen Selektions-Sync-Races als Flakes aufgetreten, siehe Commits
„Fix flaky Mobile-project …"). **Achtung Flake-Maskierung:** Die Konfig setzt
`retries: process.env.CI ? 1 : 0` (Z. 7) — ein im CI **beim zweiten Versuch**
grüner Test verdeckt einen Race. Determinismus ist deshalb lokal per
`npx playwright test list-indent --repeat-each=3` (bzw. gezielt `--project=Mobile`)
nachzuweisen, nicht allein am grünen CI-Lauf (siehe Abnahme-Checkliste).

### 0.2 Reihenfolge (deckt sich mit `liste-einruecken-tab-code.md` Abschnitt 11)

1. **Editor-Kern** (`commands.ts` → `WordEditor.tsx` → `Toolbar.tsx`) **inkl.
   der Command-Unit-Tests 1.1** — der Fokus-Schutz (Design-Entscheidung 1 im
   Codeplan) ist die eigentliche Fehlerquelle und wird zuerst isoliert grün
   gemacht. Danach ist das Feature im Editor bedienbar und für **gleichtypige**
   Listen in DOCX/ODT bereits rundreisefähig (Audit B).
2. **DOCX-/ODT-Gemischt-Entscheidung (Option B, siehe 1.2 Hinweis)** mit PO/Lead
   klären, bevor gegen die gemischt-typigen Rundreise-Tests gebaut wird.
3. **Reader-/Style-Enhancements** 4b/4d (Import-Anzeige) und 4a/4c (Darstellung
   tieferer Ebenen), je mit Regressionstest (1.2/1.3/1.4/1.5/1.6).
4. **E2E-Suite** `list-indent.spec.ts` (2.x), inkl. Cross-Format.
5. **Manuelle Verifikation** (2.13, LibreOffice-Sichtprüfung).

Beide automatisierten Suiten müssen grün sein, bevor das Feature laut
Anforderung Abschnitt 7 (DoD) als „verifiziert" gelten darf.

**Review-Pflicht (Rot-vor-Grün):** Da die Tastenbindung heute vollständig fehlt,
müssen die zentralen Regressionstests (No-Op **ohne Fokusverlust**, Unit 1.1 #2
und E2E 2.1 #2) nachweislich **vor** dem Bau **rot** gelaufen sein (Fokus verlässt
den Editor bzw. Command-Rückgabe `false`) und **danach grün** — nicht rückwirkend
geschrieben, ohne den Ist-Zustand je gesehen zu haben.

### 0.3 Determinismus / Selektions-Sync (verbindliche Regeln für Abschnitt 2)

Der Editor synchronisiert eine **tastatur- oder klickgetriebene Cursor-/
Selektionsänderung** teils **asynchron** in ProseMirrors Modell:

- Ein per Tastatur bewegter Cursor (`End`, `Home`, `ArrowUp/Down`, `Shift+Arrow`)
  erreicht das PM-Modell erst über das asynchrone `selectionchange`-Event des
  Browsers. Eine **sofort** danach abgefeuerte Playwright-Taste (`Tab`,
  `Shift+Tab`, `Enter`) kann diesem Nachlauf **vorauseilen** und noch auf der
  **alten** Position wirken (vgl. den ausführlichen Kommentar in
  `WordEditor.tsx:20-42` sowie `tests/e2e/selection-regression.spec.ts:27-34`).
- Ein Klick zum Neupositionieren wird über `reconcileSelectionOnClick`
  (`WordEditor.tsx:43-50`, ausgelöst auf `mouseup`) ins Modell gespiegelt; auf
  dem `Mobile`-Projekt (Touch/Tap) ist auch dieser Pfad zeitkritisch.

Daraus folgen **Pflichtregeln**, die jeder Testfall in Abschnitt 2 einhält:

1. **Nach jeder cursorbewegenden Eingabe** (`.click()` zum Positionieren, `End`,
   `Home`, `Arrow*`, `Shift+Arrow*`) und **vor** der auslösenden Aktionstaste
   (`Tab`/`Shift+Tab`/`Enter`/Tippen) wird die Sync-Nachlaufzeit abgewartet:
   ```ts
   /** Give ProseMirror's asynchronous selectionchange sync a chance to land
    *  after a keyboard-/click-driven caret move, before the action key. Same
    *  fix as tests/e2e/selection-regression.spec.ts + cut.spec.ts (Mobile flakes). */
   async function settleSelection(page: import('@playwright/test').Page) {
     await page.waitForTimeout(50)
   }
   ```
   Aufruf **unmittelbar** nach der Positionierung, z. B.
   `await editor.click(); await settleSelection(page); await page.keyboard.press('Tab')`.
2. **Cursor bevorzugt per Klick setzen** (synchrone Reconcile auf `mouseup`),
   nicht per Pfeiltasten, wo der Testfall es zulässt — reduziert Race-Fenster.
   Wo eine Selektion **über mehrere Punkte** nötig ist (2.6 #1), ist
   `Shift+ArrowDown` unvermeidlich → dort ist `settleSelection` zwingend.
3. **Zustands-Assertions ausschließlich web-first** (`await expect(locator)…`),
   nie synchrone `.count()`/`textContent()`-Momentaufnahmen. Web-first-
   Assertions pollen automatisch und warten die DOM-Aktualisierung nach
   `Tab`/`Shift+Tab` ab (Anforderung 3.10 „unmittelbare Aktualisierung"). Damit
   ist **kein** zusätzlicher Wait *nach* der Aktion nötig — nur *davor* (Regel 1).
4. **Zwischen mehreren `Tab`-Drücken in Folge** (2.2 #3) wird nach jedem Tab die
   erwartete Zwischentiefe web-first assertiert, **bevor** das nächste Tab
   folgt — so hängt der Test nicht an der Ausführungsreihenfolge zweier instant
   abgefeuerter Tasten und belegt zugleich „jede Stufe einzeln" (Grenzfall 12).
5. **Kein `page.keyboard.type` unmittelbar nach einem Klick/Caret-Move** ohne
   vorheriges `settleSelection` — sonst kann getippter Text die alte
   (ggf. selektierte) Range ersetzen statt einzufügen.
6. **Fokus explizit prüfen**, wo relevant: `await expect(editor).toBeFocused()`
   direkt nach `Tab` (Fokus-Regression, 2.1 #2). `toBeFocused` ist web-first und
   pollt selbst.
7. **`page.on('pageerror', …)`-Listener** in jedem Testfall registrieren und am
   Ende `expect(pageErrors).toEqual([])` — kein stiller Konsolen-/Laufzeitfehler
   (Grenzfälle 15/16, Anforderung 3).
8. **Kein `waitForTimeout` als Assertions-Ersatz** — die 50 ms sind **nur** der
   Selektions-Sync-Nachlauf (Regel 1). Alle *Ergebnis*-Prüfungen sind web-first.
9. **Export/Import strikt seriell**: `const dl = page.waitForEvent('download')`
   **vor** dem Klick auf „Exportieren" registrieren, dann `await dl`,
   `download.path()`, `fs.readFile`, `JSZip.loadAsync`. Re-Import erst nach
   Rückkehr zur Auswahl (`getByRole('button', { name: /formate/i }).click()`),
   dann `setInputFiles` mit den **heruntergeladenen Bytes** (Muster
   `docx.spec.ts:238-250`).

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) + Commands

### 1.1 Erweiterung: `src/formats/shared/editor/__tests__/commands.test.ts`

Die Datei **existiert bereits** (Cut-/Clipboard-Command-Tests). Ergänzt wird ein
**eigener** `describe('indentListItem / outdentListItem')`-Block (die Datei wird
nicht ersetzt). Muster: `EditorState.create({ doc: wordSchema.nodeFromJSON(...) })`,
Selektion per `TextSelection.create`/`NodeSelection` setzen, Command direkt
aufrufen `cmd(state, dispatch)`, Rückgabe **und** resultierendes `doc.toJSON()`
prüfen. Wo Undo/History nötig ist (Fälle 13-15), wird gegen eine echte
`EditorView` mit `history()`-Plugin und derselben `dispatchTransaction`-
Verdrahtung wie `WordEditor.tsx` getestet. Diese Ebene sichert den in
`liste-einruecken-tab-code.md` Abschnitt 1 getroffenen Fokus-Schutz **isoliert
von Browser-Fokusverhalten** ab.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `indentListItem()` auf zweitem Punkt einer flachen Bullet-Liste | 3-Punkte-`bullet_list`, Cursor in Punkt 2 | `true`; Punkt 2 liegt danach als `list_item` in einer neuen `bullet_list`, die Kind von Punkt 1 ist (nicht mehr Geschwister von 1/3) | 3.1, Testfall 1 |
| 2 | `indentListItem()` auf dem **allerersten** Punkt | 3-Punkte-`bullet_list`, Cursor in Punkt 1 | **`true`** (Fokus-Schutz), aber Doc **unverändert** — `dispatch` wurde **nicht** aufgerufen (Zähler/Spy = 0), Objektidentität `state.doc` bleibt gleich | Grenzfall 1, 3.2, Testfall 2 — **rot vor Bau** |
| 3 | `indentListItem()` außerhalb jedes Listenkontexts (Cursor in normalem `paragraph`) | ein `paragraph` ohne umgebende Liste | **`false`**, kein `dispatch` (keymap darf Tab weiterreichen) | Grenzfall 17, Bedienelement 5 |
| 4 | `indentListItem()` bei Cursor **mitten im Text** eines Punkts | Punkt 2 „Zweiter Punkt", Cursor zwischen „Zweiter" und „Punkt" | identisch zu #1 — Position im Text irrelevant | 3.3 |
| 5 | `indentListItem()` bei Selektion über zwei Punkte | Selektion Anfang Punkt 2 → Ende Punkt 3 | **beide** Punkte 2+3 gemeinsam eine Ebene tiefer | 3.4, Testfall 15 |
| 6 | `outdentListItem()` auf einem Ebene-2-Punkt | Ergebnis von #1 (Punkt 2 auf Ebene 2), Cursor darin | Punkt wird Ebene 1, bleibt `list_item` in der `bullet_list` (verlässt die Liste **nicht**) | 3.6, Testfall 3 |
| 7 | `outdentListItem()` auf einem Ebene-1-Punkt | flache Liste, Cursor in Punkt 2 | Punkt 2 wird `paragraph`, verlässt die Liste, Text unverändert | 3.5, Testfall 4 |
| 8 | `outdentListItem()`-Ergebnis **identisch** zu `liftFromList()` | zwei identische Ausgangsdocs, je einmal `outdentListItem()` bzw. `liftFromList()` angewendet | `doc.toJSON()` beider Ergebnisse identisch (Ebene-1- **und** Ebene-2-Fall) | Grenzfall 18, Bedienelement 3 |
| 9 | `outdentListItem()` außerhalb jedes Listenkontexts | Cursor in normalem `paragraph` | **`false`**, kein `dispatch` (symmetrisch zu #3) | Grenzfall 17 |
| 10 | `outdentListItem()` auf Ebene-1-Punkt **mit tiefer eingerückten Kind-Punkten** | Punkt 1 (Ebene 1) hat Unterliste; `outdent` auf Punkt 1 selbst | tatsächliches Ergebnis **exakt festhalten** (erwartet: Punkt 1 verlässt die Liste, Kinder bleiben als eigene, jetzt oberste Unterliste) — nicht nur annehmen | Grenzfall 3 |
| 11 | `indentListItem()` bei **gemischter** Selektion (ein `list_item` + folgender `paragraph` außerhalb der Liste) | Selektion Anfang `list_item`-Text → Ende Folge-`paragraph` | dokumentiertes Ist-Verhalten: `isInListItem`(`$from`) = `true` → `true` zurück, aber `sinkListItem` findet keine passende `NodeRange` → **No-Op ohne dispatch** (Codeplan 2.1) | Grenzfall 4, Testfall 16 |
| 12 | Wiederholtes `indentListItem()` bis zur Maximaltiefe | Liste mit genügend Geschwister-Punkten je Ebene, 10× `indent` auf denselben Nachfolgepunkt | ab der Tiefe liefert der Aufruf weiter `true` (Fokus-Schutz), Struktur wird nicht undefiniert tief, **kein Crash** | Grenzfall 2 |
| 13 | Undo nach wirksamer `indentListItem()`-Aktion | #1, danach `undo()` auf der `EditorView`/History | Struktur exakt wie vor der Aktion | 3.8, Grenzfall 11 |
| 14 | **Kein leerer Undo-Schritt** bei No-Op (#2) | #2, danach `undo()` | `undo()` verändert Historie/Zustand **nicht** (der No-Op hat keinen History-Eintrag erzeugt) | 3.8 |
| 15 | Mehrfaches `indentListItem()`, jede Stufe einzeln per Undo | genügend Geschwister, 3× `indent` auf denselben Punkt, dann 3× `undo()` | nach jedem `undo()` genau eine Ebene weniger (kein Zusammenfassen) | Grenzfall 12, Testfall 7 |
| 16 | Zeichenformatierung (Fett) bleibt unberührt | Punkt mit `strong`-Mark auf Teiltext, `indent` angewendet | Marks vor/nach identisch | 3.12 |
| 17 | `splitListItem` (Enter-Simulation) gefolgt von `indentListItem()` | Ebene-2-Punkt, `splitListItem(list_item)(state, dispatch)`, dann `indent` auf neuen Punkt | funktioniert wie bei „altem" Punkt, kein Sonderfall | Grenzfall 13, 3.7, Testfall 5 |
| 18 | **Bild als einziger Inhalt** eines Listenpunkts | `list_item` mit einzigem `image`-Kind (kein Text), Cursor als `NodeSelection` darauf | `indent` wirkt trotzdem (Block-, keine Zeicheneigenschaft), kein Abbruch | Grenzfall 6 |

### 1.2 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`, `describe('DOCX round trip: lists')`

Die bestehenden flachen Fälle sowie der **bereits grüne** Fall „preserves a
nested list two levels deep" bleiben unverändert (Audit-B-Beleg). **Ergänzt** im
vorhandenen Stil (`doc([...])`, `paragraph(...)`, `roundTrip(...)`):

> **Kernentscheidung Option B (aus `liste-einruecken-tab-code.md` Abschnitt 5) —
> hier verbindlich für die DOCX-Erwartung:** Der DOCX-Writer behält für eine
> verschachtelte Liste die **`numId` der Elternliste** und erhöht nur `w:ilvl`
> (`writer.ts:134-136`). Eine **gemischt-typige** Kette (z. B. Ordered→Bullet→
> Ordered) kollabiert dadurch beim Export auf **eine** `numId`, deren
> `abstractNum` durchgängig **einen** Typ trägt. Beim Reimport fällt die
> abweichend typisierte Unterebene daher auf den Typ der obersten Ebene zurück.
> **Die DOCX-Rundreise erhält bei gemischten Typen nur Tiefe + Typ der obersten
> Ebene, nicht den Typ je Ebene.** Das ist eine bewusste Abgrenzung zu
> `mehrstufige-liste` und **korrigiert die wörtliche Anforderung 5.1.2/4.7 /
> Abnahmekriterium 4** (die den Reader-Fix allein für ausreichend hält). Diese
> Abweichung ist **mit PO/Lead abzustimmen**, bevor Fall #2 gegen den Code
> gebaut wird. Der reine **Tab-Kernfall (gleicher Typ je Kette) ist voll
> rundreisefähig**, weil dort nie ein Typwechsel auftritt.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | 2-stufige **Bullet**-Liste (gleicher Typ) | `bullet_list` A/B/C; B enthält zusätzlich verschachtelte `bullet_list` mit „B1" | nach `roundTrip`: B1 ist Kind von B (nicht Geschwister), Text aller vier Punkte unverändert, `bullet_list`-Typ auf **beiden** Ebenen erhalten | 5.1.1, Abnahmekriterien 2+3 |
| 2 | 3-stufig, **gemischt** Ordered/Bullet/Ordered (Option B) | `ordered_list` → `list_item` → `bullet_list` → `list_item` → `ordered_list` (je 1 Punkt) | nach `roundTrip`: **Tiefe 3 erhalten**; **oberste** Ebene bleibt `ordered_list`; die gemischte Typkette der Unterebenen fällt gemäß Option B auf den `numId`-Typ zurück — Test assertiert **genau dieses Ist-Verhalten** und hält den Typ-Kollaps als bewussten, dokumentierten Befund fest (kein „soll", sondern belegte Einschränkung) | 5.1.2 (korrigiert), Abschnitt 5 Codeplan |
| 3 | Zurückstufen vor Export | 3-stufige Liste im Modell, eine Ebene zurück (3→2), dann `roundTrip` | Ebene bleibt **2** (nicht 3, nicht 1) | 5.1.3 |
| 4 | Deckel bei Maximaltiefe (Grenzfall 2) | 10-fach verschachtelte Liste im Modell | `writeDocx` **crasht nicht**; im erzeugten `word/document.xml` (per `JSZip`) **kein `w:ilvl` > 8** (Regex-Assertion `/<w:ilvl w:val="(\d+)"/g` → max ≤ 8); keine `undefined`-Formatierung | Grenzfall 2 |
| 5 | Gemischter Typ über Ebenen, **kein Datenverlust/Crash** | Bullet Ebene 1, Ordered Unterliste Ebene 2 | `roundTrip` wirft nicht, **Tiefe** + oberste Ebene erhalten, Texte aller Punkte vollständig (Typ-Kollaps der Unterebene wie #2 dokumentiert) | Grenzfall 7 |

### 1.3 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`, `describe('ODT round trip: lists')`

Bestehende flache Fälle + grüner nested-Test (169-194) bleiben. **Ergänzt**
analog zu 1.2 — **aber für ODT gilt Option B nicht**: `blockToOdt` wählt den
Stilnamen nach Knotentyp (`LB`/`LO`), eine gemischte Verschachtelung schreibt
`<text:list style="LB"> … <text:list style="LO"> …`, der Reader mappt je
Stilname korrekt → **Typ + Tiefe bleiben erhalten**.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | 2-stufige Bullet-Liste | wie 1.2 #1, ODT | B1 Kind von B, Typ+Text erhalten | 5.2.1 |
| 2 | 3-stufig **gemischt** Ordered/Bullet/Ordered | wie 1.2 #2, ODT | **Typ je Ebene** (`ordered`/`bullet`/`ordered`) **und** Tiefe 3 erhalten (funktioniert bei ODT vollständig) | 5.2.2, Abnahmekriterium 4 |
| 3 | Zurückstufen vor Export | wie 1.2 #3, ODT | Ebene bleibt 2 | 5.2.3 |
| 4 | Deckel bei Maximaltiefe | 10-fach verschachtelt | `writeOdt`/`readOdt` **ohne Crash**, Struktur bis Deckel erhalten | Grenzfall 2 |
| 5 | Gemischter Typ, kein Datenverlust | wie 1.2 #5, ODT | Typ+Tiefe beider Ebenen erhalten | Grenzfall 7 |
| 6 | **Ebenen-blinder `listKinds`-Defekt** (Codeplan 4d) | ODT-Modell, in dem Ebene 2 unter demselben Stilnamen einen `text:list-level-style-number` mit `text:level="2"` trägt, Ebene 1 `…-bullet` mit `text:level="1"` | `readOdt` ordnet der tieferen Ebene den unter `text:level="2"` definierten Typ zu, nicht den von Ebene 1 — eigener Regressionstest für den Reader-Fix 4d | Codeplan (C)/4d, Abnahmekriterium 4 |

### 1.4 Erweiterung: `src/formats/docx/__tests__/external-fixtures.test.ts`

Ergänzender `describe`-Block; die bestehende generische Crash-Loop bleibt.

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Import `ComplexNumberedLists.docx`: rekursive Tiefenprüfung | mindestens ein `list_item` enthält selbst wieder eine `bullet_list`/`ordered_list` (Tiefe > 1) — Regressionsschutz gegen Flachlegung beim DOCX-Import (Audit B) | 5.1.4, Abnahmekriterium 2, Grenzfall 8 |
| 2 | Dieselbe Fixture: **Typ je Ebene** nach Reader-Fix 4b | mindestens zwei Ebenen tragen **unterschiedliche** Typen, wo die Originaldatei das vorsieht (belegt den ebenen-blinden `parseNumberingXml`-Fix an echter Datei) — **Import-Anzeige**, nicht DOCX-Rundreise (siehe Option B) | Codeplan 4b |
| 3 | Import → unverändert `writeDocx` → erneut `readDocx` | Tiefe über beide Zyklen erhalten (Typ gemäß Option B) | 5.1.4 |
| 4 | Stichprobe `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` importieren/re-exportieren | kein Crash, Ebenen soweit vorhanden erhalten — Ergebnis **je Datei dokumentieren** | 5.1.6 |

### 1.5 Erweiterung: `src/formats/odt/__tests__/external-fixtures.test.ts`

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Import `listLevel10.odt`: Tiefenprüfung > 1 Ebene | verschachtelte Liste tatsächlich erhalten (nicht nur „kein Crash") — Nachweis der generischen ODT-Rekursion | 5.2.4, Abnahmekriterium 6 |
| 2 | Import `simpleList3.odt` und `liste2.odt`, Tiefenprüfung analog | Ebenen erhalten; falls eine Datei flach ist, **explizit dokumentieren** „Datei ist flach" statt anzunehmen | 5.2.4 |
| 3 | Import → `writeOdt` → `readOdt`, alle drei Dateien | Ebenen über beide Zyklen erhalten | 5.2.4 |
| 4 | `ListOddity.odt`, `ListStyleResolution.odt` probeweise importieren | kein Crash, Tiefe/Typ je Datei vermerken | zusätzlicher ODT-Beleg |

### 1.6 `src/formats/docx/__tests__/styleDefs.test.ts` (nur bei Umsetzung von Enhancement 4a)

Der bestehende Test ist an die neue `<w:lvl>`-Struktur nachzuziehen: pro Ebene
`w:ind` (per-Ebene-Einzug) vorhanden **und** `lvlText` der nummerierten Ebenen
referenziert den **eigenen** Zähler (`%${ilvl+1}.`, Fix des zyklischen
`%1./%2./%3.`-Defekts aus Codeplan (C)/4a). Ohne 4a bleibt die Datei unverändert.

---

## 2. Echte Playwright-Browser-Tests

**Grundregel:** Jeder Test bedient die App ausschließlich so, wie eine Person es
täte — echter `page.keyboard.press('Tab')`/`'Shift+Tab'`,
`page.getByTitle(...).click()`, `input.setInputFiles(...)` für Uploads,
`page.waitForEvent('download')` + Lesen der heruntergeladenen Datei vom
Datenträger für Exporte. **Kein Test in diesem Abschnitt** importiert oder ruft
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`indentListItem`/`outdentListItem`/
`liftFromList` direkt auf. Hochzuladende Dateien werden entweder unabhängig per
JSZip gebaut (Muster `buildSampleDocx()`/`buildSampleOdt()`) oder es wird eine der
oben gelisteten **echten** Fixtures direkt hochgeladen. **Alle** Testfälle
befolgen die Determinismus-Regeln aus 0.3.

### 2.0 Neue Datei: `tests/e2e/list-indent.spec.ts` — Helfer

Locator-Helfer identisch zu `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** See 0.3 Regel 1 — Selektions-Sync-Nachlauf nach Caret-Move, vor Aktionstaste. */
async function settleSelection(page: import('@playwright/test').Page) {
  await page.waitForTimeout(50)
}

/** Types a three-item bullet list via the existing "Aufzählung" toolbar button. */
async function buildThreeItemBulletList(page: import('@playwright/test').Page) {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Punkt')
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.press('End')
  await settleSelection(page)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Punkt')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Punkt')
}
```

`beforeEach`: `page.goto('/')` → `getByRole('button', { name: /verstanden/i }).click()`
→ je nach Testfall `docxCard`/`odtCard` „Neu erstellen" klicken. In jedem Test
`const pageErrors: string[] = []; page.on('pageerror', e => pageErrors.push(String(e)))`
und am Ende `expect(pageErrors, pageErrors.join('\n')).toEqual([])` (0.3 Regel 7).

**Button-Titel (Ziel-Zustand nach Bau):** Der Ausrück-Button heißt heute
`title="Liste aufheben"` (`Toolbar.tsx:265`); nach Codeplan Abschnitt 2.3 lautet
er `"Liste aufheben / Einzug verringern (Umschalt+Tab)"`, und ein **neuer**
Button trägt `title="Einzug erhöhen (Tab)"`. Die Tests referenzieren die
**Ziel**-Titel als Regex (`getByTitle(/Einzug erhöhen/)`,
`getByTitle(/Liste aufheben/)`) — das lässt die Suite bewusst rot laufen, bis der
Button existiert, statt den heutigen Ist-Zustand stillschweigend zu akzeptieren.

### 2.1 Grundverhalten Tab/Umschalt+Tab (Anforderungs-Testfälle 1-4, Grenzfall 1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | **Kernregression**: Tab auf zweitem Punkt verschachtelt sichtbar | `buildThreeItemBulletList(page)` → **Klick** in „Zweiter Punkt" → `settleSelection` → `Tab` | web-first: `await expect(editor.locator('li', { hasText: 'Erster Punkt' }).locator('ul li', { hasText: 'Zweiter Punkt' })).toHaveCount(1)`; `await expect(editor).toBeFocused()` |
| 2 | **Kritische Fokus-Regression**: Tab auf allererstem Punkt ist No-Op ohne Fokusverlust | `buildThreeItemBulletList(page)` → **Klick** in „Erster Punkt" → `settleSelection` → `Tab` | **kein** verschachteltes `ul` (`await expect(editor.locator('ul ul')).toHaveCount(0)`); `await expect(editor).toBeFocused()` **unmittelbar** nach dem Tab (vor dem Fix verließe der Fokus laut Ist-Stand den Editor); danach `page.keyboard.type('X')` → „X" erscheint im ersten Punkt, nicht anderswo | **rot vor Bau**, grün danach (Grenzfall 1, Testfall 2) |
| 3 | Umschalt+Tab auf Ebene-2-Punkt stuft eine Ebene zurück, bleibt Listenelement | Fortsetzung #1 → Klick in Punkt 2 → `settleSelection` → `Shift+Tab` | kein verschachteltes `ul` mehr um Punkt 2, aber weiterhin `li` in der Liste (kein `<p>`): `await expect(editor.locator('ul ul')).toHaveCount(0)` und Punkt 2 weiter unter `.ProseMirror ul li` | 3.6, Testfall 3 |
| 4 | Umschalt+Tab auf Ebene-1-Punkt entfernt ihn aus der Liste | `buildThreeItemBulletList` → Klick in „Zweiter Punkt" → `settleSelection` → `Shift+Tab` | „Zweiter Punkt" ist danach `<p>` außerhalb jedes `<ul>` (`await expect(editor.locator('p', { hasText: 'Zweiter Punkt' })).toHaveCount(1)`), Text erhalten; **Vergleich** auf zweitem, identischem Dokument: Klick auf `getByTitle(/Liste aufheben/)` liefert identisches DOM (Grenzfall 18) | 3.5, Testfall 4 |

### 2.2 Enter-Zusammenspiel, Undo/Redo, schnelle Folgen (Testfälle 5-7, Grenzfälle 3/11-13)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Enter am Ende eines Ebene-2-Punkts, dann Tab auf neuem Punkt | Punkt 2 per Tab auf Ebene 2 → Klick in Punkt 2 → `End` → `settleSelection` → `Enter` → `type('Neuer Punkt')` → `settleSelection` → `Tab` | „Neuer Punkt" eine weitere Ebene tiefer (Ebene 3) verschachtelt, wie ein „alter" Punkt | Grenzfall 13, 3.7, Testfall 5 |
| 2 | Undo nach Tab macht Ebene rückgängig, Redo stellt her | `Tab` auf Punkt 2 → web-first Verschachtelung prüfen → `ControlOrMeta+z` → `await expect(editor.locator('ul ul')).toHaveCount(0)` → `ControlOrMeta+y` → wieder verschachtelt | Testfall 6, Grenzfall 11 |
| 3 | Mehrfaches Tab, jede Stufe einzeln per Undo | ≥ 4 Geschwister anlegen → Tab, **web-first Tiefe 2 prüfen**, Tab, **Tiefe 3 prüfen**, Tab, **Tiefe 4 prüfen** (0.3 Regel 4) → dann 3× `ControlOrMeta+z`, nach **jedem** Undo Tiefe web-first prüfen | Tiefe nimmt je Undo um genau eine Ebene ab (kein Zusammenfassen) | Testfall 7, Grenzfall 12 |
| 4 | Umschalt+Tab auf Ebene 1 **mit** Kind-Punkten (Grenzfall 3) | Punkt 1 mit per Tab erzeugter Ebene-2-Unterliste → `Shift+Tab` auf Punkt 1 selbst | tatsächliches DOM-Ergebnis web-first prüfen **und hier dokumentieren** (erwartet: Kinder bleiben als eigene, jetzt oberste Unterliste); Test schlägt fehl, falls sich das Verhalten unbemerkt ändert | Grenzfall 3 |

### 2.3 Regression Selection-Sync-Bug mit Tab als Auslöser (Grenzfall 14, Pflicht)

**Erweiterung** von `tests/e2e/selection-regression.spec.ts` (dauerhaft
verankert, keine separate Datei). Neuer Test im bestehenden `describe`-Block,
exakt nach dem Muster der vorhandenen Fälle, aber mit `Tab` statt Enter/Tippen
als auslösendem Schritt — **inklusive `waitForTimeout(50)` nach dem
keyboard-`End`**, wie in allen dortigen Fällen:

```ts
test('same regression with Tab as the triggering action after bold + click-reposition (Grenzfall 14)', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Punkt')
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.click()            // reposition into the still-bold, still-selected text
  await page.keyboard.press('End')
  await page.waitForTimeout(50)   // let selectionchange sync land before Tab (0.3 Regel 1)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Punkt')
  await page.waitForTimeout(50)
  await page.keyboard.press('Tab')
  await page.keyboard.type(' weiter')
  await expect(editor).toContainText('Erster Punkt')
  await expect(editor).toContainText('Zweiter Punkt weiter')
  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})
```

Assertion: kein Content-Verlust, kein Absturz — der bekannte stale-Selection-
Pfad führt auch mit Tab als Folgeaktion nicht zu Inhaltsverlust.

### 2.4 Import realer Fremddateien (Testfälle 9-10, Grenzfall 8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Import `ComplexNumberedLists.docx` | `docxCard`, `input.setInputFiles({ name, mimeType, buffer: readFileSync(...) })` | `await expect(editor.locator('li ul, li ol')).not.toHaveCount(0)` — mindestens ein `li` enthält verschachtelte Liste (Grenzfall 8) | Testfall 9 |
| 2 | Import `listLevel10.odt` | `odtCard`, Upload | verschachteltes `ul`/`ol` sichtbar, > 1 Ebene (`editor.locator('li ul, li ol')` ≥ 1) | Testfall 10 |
| 3 | Import `simpleList3.odt` | `odtCard`, Upload | Tiefe je nach tatsächlichem Inhalt **dokumentiert** | Testfall 10 |

### 2.5 Tab außerhalb Listenkontext, Tabellen (Testfälle 13-14, Grenzfälle 5/17)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Tab in normalem Absatz außerhalb jeder Liste | neuen Absatz tippen (kein Listen-Button) → Klick hinein → `settleSelection` → `Tab` | **keine** Listen-Einrückung (`await expect(editor.locator('ul, ol')).toHaveCount(0)`); Editor bleibt fokussiert; Verhalten unverändert (`tabulator-zeichen`) | Grenzfall 17, Testfall 13 |
| 2 | Liste in selbst angelegter Tabellenzelle, Tab | `getByRole('button', { name: 'Tabelle einfügen' }).click()` → Klick in Zelle → Text tippen → `getByTitle('Aufzählung').click()` → `End`→`settleSelection`→`Enter` → zweiter Punkt → Klick hinein → `settleSelection` → `Tab` | nur Listenebene ändert sich (verschachteltes `ul` **innerhalb** der `td`), **kein** Cursor-Sprung in die Nachbarzelle (getippter Text bleibt in derselben Zelle) | Grenzfall 5, Testfall 14 |
| 3 | Fixture `listsInTable.odt`, Tab auf enthaltenem Listenpunkt | `odtCard`, Upload → Klick in Listenpunkt in einer Zelle → `settleSelection` → `Tab` | Ergebnis gemäß Grenzfall 5 dokumentiert, kein Zellsprung, keine Exception (`pageErrors` leer) | Testfall 14 |
| 4 | Fixture `simple-table-with-lists.odt`, Stichprobe | Upload, Sichtprüfung | kein Absturz, Listen in Tabelle sichtbar | Grenzfall 5 |

### 2.6 Selektion über mehrere Punkte, gemischte Selektion (Testfälle 15-16, Grenzfall 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Selektion über zwei Listenpunkte, Tab | `buildThreeItemBulletList` → Klick ans Ende „Erster Punkt" → `settleSelection` → `Shift+ArrowDown` (mind. bis „Zweiter Punkt" erfasst) → `settleSelection` (0.3 Regel 2, **zwingend** wegen Pfeiltaste) → `Tab` | **beide** erfassten Punkte gemeinsam eine Ebene tiefer | 3.4, Testfall 15 |
| 2 | Gemischte Selektion (Listenpunkt + folgender normaler Absatz), Tab | Liste anlegen, dahinter per „Liste aufheben" einen normalen Absatz erzeugen → Selektion vom letzten Listenpunkt bis Ende des Absatzes (`Shift+ArrowDown`) → `settleSelection` → `Tab` | tatsächliches Ergebnis **dokumentiert** (erwartet No-Op, keine Änderung an Liste/Absatz); Test schlägt fehl bei unbemerkter Verhaltensänderung | Grenzfall 4, Testfall 16 |

### 2.7 Barrierefreiheit / Maus-Alternativweg (Bedienelemente 4/7, Grenzfall 15)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Neuer Button „Einzug erhöhen" per Klick = Tab | `buildThreeItemBulletList` → Klick in Punkt 2 → `settleSelection` → `page.getByTitle(/Einzug erhöhen/).click()` | identisches DOM-Ergebnis zu 2.1 #1 (Klick-Alternative funktioniert) | Bedienelement 4, Grenzfall 15 |
| 2 | Tooltip/`aria-label` nennen die Tastenkombination | — | `getByTitle(/Einzug erhöhen \(Tab\)/)` **und** `getByLabel(/Einzug erhöhen \(Tab\)/)` referenzieren denselben Button; ebenso Ausrück-Button `getByTitle(/Umschalt\+Tab/)` | Bedienelement 7 |
| 3 | Tab-Trap bewusst, aber Maus-Fluchtweg funktioniert | Cursor im Listenpunkt → `Tab` (bleibt im Editor) → danach Klick auf Toolbar-Button | Fokus verlässt den Editor **nur** über den Maus-Klick, nicht über Tab — belegt die dokumentierte Einschränkung + Alternativweg | Grenzfall 15 |

### 2.8 Sichtbare Darstellung je Ebene (Testfall 17, 3.9/3.10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Bullet: Ebene 2 optisch unterscheidbar | `buildThreeItemBulletList` → Punkt 2 per Tab auf Ebene 2 | `getComputedStyle` der inneren `ul` zeigt größeren kumulierten `padding-left` als die äußere und/oder abweichendes Aufzählungszeichen (UA-Stylesheet) — sichtbar unterscheidbar | 3.9, 3.10 |
| 2 | Nummeriert: Ebene 2 eigene Nummerierung | analog mit `getByTitle('Nummerierte Liste')` | innere `ol` beginnt sichtbar wieder bei „1." (eigener Zähler), unterscheidbar von Ebene 1 | 3.9 |
| 3 | Sichtprüfung vor Export vs. nach Reimport | mehrstufige Liste → Messung (`getComputedStyle`/Screenshot) → Export → Reimport → erneute Messung | Einzug/sichtbares Merkmal je Ebene vor/nach Rundreise gleich | Testfall 17 |

### 2.9 Rundreise — Pflicht-Szenarien (Anforderung Abschnitt 5), echter Datei-Kreislauf

Jedes Szenario läuft über echten Upload (`setInputFiles`) und echten Download
(`page.waitForEvent('download')` + `download.path()` → `fs.readFile` →
`JSZip.loadAsync` → `word/document.xml` bzw. `content.xml`), **nicht** über
intern aufgerufene Reader/Writer. Determinismus-Regeln 0.3 (insb. Regel 9)
gelten.

**2.9.1 DOCX**

| # | Szenario | Ablauf | Assertion an heruntergeladener/reimportierter Datei |
|---|---|---|---|
| 1 | Eigenrundreise, 2-stufig | `buildThreeItemBulletList` → Klick in Punkt 2 → `settleSelection` → `Tab` → Export → exportierte Bytes reimportieren | `document.xml` enthält für Punkt 2 `<w:ilvl w:val="1"/>`, für Punkt 1/3 `<w:ilvl w:val="0"/>`; nach Reimport Punkt 2 weiter verschachtelt, Text aller drei erhalten |
| 2 | 3-stufig gemischt (**Option B**) | Bullet- und nummerierte Liste mit ≥ 3 Ebenen im Editor (mehrfaches `Tab` mit je `settleSelection`), Export, Reimport | **Tiefe** (`w:ilvl` 0/1/2) je Absatz erhalten; **oberste** Ebene behält Typ; gemischte Unterebenen-Typen kollabieren gemäß Option B (dokumentiert, nicht als Fehler gewertet) |
| 3 | Zurückstufen vor Export | Punkt auf Ebene 3 → `Shift+Tab` (→ Ebene 2) → Export → Reimport | `w:ilvl` des Punkts = 1 (Ebene 2), nicht 2, nicht 0 |
| 4 | Reale Fremddatei `ComplexNumberedLists.docx` | Upload → **ohne Änderung** Export → Reimport | DOM-Verschachtelung nach Reimport identisch zur Verschachtelung direkt nach dem ersten Import (Tiefe über beide Zyklen erhalten) |
| 5 | Cross-Format DOCX → ODT | im Editor mehrstufige Liste → als ODT exportieren | `content.xml` enthält verschachtelte `<text:list>` mit erhaltener Tiefe |
| 6 | Weitere Fremddateien | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` importieren/exportieren | kein Absturz, Ebenen soweit im Original erhalten — je Datei dokumentieren |

**2.9.2 ODT**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | Eigenrundreise, 2-stufig | wie 2.9.1 #1, ODT-Karte | `content.xml`: verschachteltes `<text:list>` im `<text:list-item>` von Punkt 1, Punkt 2 darin |
| 2 | 3-stufig gemischt | wie 2.9.1 #2, ODT | **Typ je Ebene und Tiefe erhalten** (ODT ist von Option B **nicht** betroffen) |
| 3 | Zurückstufen vor Export | wie 2.9.1 #3, ODT | Ebene bleibt 2 |
| 4 | Reale Fremddateien `listLevel10.odt`, `simpleList3.odt`, `liste2.odt` | Upload → unverändert Export → Reimport | Ebenen über beide Zyklen erhalten — Nachweis der generischen ODT-Rekursion |
| 5 | Cross-Format ODT → DOCX | `ComplexNumberedLists.docx` importieren → als ODT exportieren | Ebenen nach Formatwechsel erhalten (Tiefe; Typ ODT-seitig vollständig) |
| 6 | Sichtprüfung tieferer Ebenen | siehe 2.13 (manuell) | dort dokumentiert |

**2.9.3 Doppelte Rundreise / Cross-Format hin und zurück**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | DOCX → ODT → DOCX | im Editor 3-stufige (gleichtypige) Liste per Tab → als ODT exportieren → hochladen → als DOCX exportieren | letzter Export: alle drei Ebenen (`w:ilvl` 0/1/2) an derselben Textstelle erhalten |
| 2 | ODT → DOCX → ODT | spiegelbildlich | letzter Export: alle drei Ebenen erhalten |

### 2.10 Unabhängige Validierung der exportierten Datei (Testfall 18)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | DOCX-Export, Regex/`DOMParser` auf `w:ilvl`, **ohne** `readDocx` | Export aus 2.9.1 #1 laden | `word/document.xml`-String enthält für den verschachtelten Absatz `<w:ilvl w:val="1"/>`, für Geschwister `<w:ilvl w:val="0"/>` — direkt am String geprüft (verhindert sich gegenseitig kompensierende Schreib-/Lesefehler) |
| 2 | ODT-Export, Regex/`DOMParser` auf verschachtelte `text:list` | Export aus 2.9.2 #1 laden | `content.xml` enthält ein `<text:list>` **innerhalb** eines `<text:list-item>` |
| 3 | Manuelle Einmalvalidierung (außerhalb CI) | exportierte mehrstufige DOCX mit `python-docx` (Werte `w:ilvl` je Absatz); exportierte ODT mit unabhängigem ODF-Validator/LibreOffice | Ergebnis in 2.13 vermerkt — Pflicht-Checkliste, kein automatischer Schritt |

### 2.11 Undo/Redo und Zeichenformatierung im Browser (3.8/3.11/3.12)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Fett bleibt nach Tab erhalten | Text mit Fett-Teil in Listenpunkt, Klick hinein → `settleSelection` → `Tab` | `strong` im DOM unverändert nach der Ebenenänderung | 3.12 |
| 2 | Fokus/Selektion bleibt nach Tab, sofort weitertippen | Cursor mitten im Text → `settleSelection` → `Tab` → **sofort** `type('X')` (ohne erneuten Klick) | „X" erscheint an erwarteter Stelle im (jetzt verschachtelten) Punkt, kein Sprung an Doc-Anfang/-Ende | 3.11 |

### 2.12 Stresstest (Grenzfall 16)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Lange, tief verschachtelte Liste, wiederholtes Tab | per Schleife 20 Punkte anlegen (je Enter + `settleSelection`), mehrere per Tab in verschiedene Ebenen | kein spürbares Einfrieren (`await expect(...).toBeVisible({ timeout: 5000 })` bleibt im Budget), `pageErrors` leer | 
| 2 | Export/Import derselben großen Liste | Export aus #1, Reimport | kein Performance-Einbruch (im Standard-Timeout), Ebenen erhalten |

### 2.13 Manuelle Verifikation (nicht automatisierbar, Pflicht vor Statuswechsel)

- **Abnahmekriterium 5 / Grenzfall 10 (ODT Ebene 2+):** eine mit diesem Feature
  erzeugte, ≥ 3-stufige ODT in LibreOffice Writer öffnen; Einzug/Symbol je Ebene
  protokollieren (greifen die Enhancement-4c-Stile für `text:level` 2-9?).
  Ergebnis hier nachtragen.
- **Option B (Codeplan Abschnitt 5):** eine gemischt-typige DOCX (Bullet Ebene 1
  / Nummeriert Ebene 2) exportieren, in Word/LibreOffice öffnen — dokumentieren,
  dass die Unterebene den Typ der `numId` zeigt (erwartete, bewusst abgegrenzte
  Einschränkung). Mit PO/Lead abgestimmt.
- **Testfall 18 (unabhängiger Parser):** siehe 2.10 #3.

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-/Codeplan-Abschnitt | Ebene(n) | Datei(en) |
|---|---|---|
| Bedienelement 1/2 (Tab/Shift-Tab) | Unit + E2E | `commands.test.ts` #1-3, `list-indent.spec.ts` §2.1 |
| Bedienelement 3 (Button „Liste aufheben" unverändert) | Unit + E2E | `commands.test.ts` #8, §2.1 #4 |
| Bedienelement 4 (neuer „Einzug erhöhen"-Button) | E2E | §2.7 #1 |
| Bedienelement 5 (Tab außerhalb Liste) | Unit + E2E | `commands.test.ts` #3/#9, §2.5 #1 |
| Bedienelement 6 (Tabellenzelle) | E2E | §2.5 #2-4 |
| Bedienelement 7 (Tooltip/`aria-label`) | E2E | §2.7 #2 |
| 3.1-3.4 (Sink-Semantik, erster Punkt, Cursor-Position, Mehrfachselektion) | Unit + E2E | `commands.test.ts` #1/2/4/5, §2.1, §2.6 #1 |
| 3.5/3.6 (Lift Ebene 1 vs. ≥ 2) | Unit + E2E | `commands.test.ts` #6/7, §2.1 #3/4 |
| 3.7 (Enter-Zusammenspiel) | Unit + E2E | `commands.test.ts` #17, §2.2 #1 |
| 3.8 (Undo/Redo, kein leerer Schritt) | Unit + E2E | `commands.test.ts` #13/14/15, §2.2 #2/3 |
| 3.9/3.10 (Darstellung je Ebene) | E2E | §2.8 |
| 3.11 (Fokus-/Selektionserhalt) | E2E | §2.11 #2 |
| 3.12 (Zeichenformatierung unberührt) | Unit + E2E | `commands.test.ts` #16, §2.11 #1 |
| 3.13/Rundreise-Grundprinzip | Unit + E2E | §1.2-1.5, §2.9 |
| Grenzfall 1 (No-Op, kein Fokusverlust) | Unit + E2E | `commands.test.ts` #2, §2.1 #2 |
| Grenzfall 2 (Maximaltiefe) | Unit | `commands.test.ts` #12, `docx`/`odt roundtrip` Lists #4 |
| Grenzfall 3 (Kind-Punkte beim Ausrücken) | Unit + E2E | `commands.test.ts` #10, §2.2 #4 |
| Grenzfall 4 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #11, §2.6 #2 |
| Grenzfall 5 (Liste in Tabellenzelle) | E2E | §2.5 #2/3 |
| Grenzfall 6 (Bild als einziger Inhalt) | Unit | `commands.test.ts` #18 |
| Grenzfall 7 (gemischte Typen über Ebenen) | Unit | `docx`/`odt roundtrip` Lists #5 |
| Grenzfall 8 (reale mehrstufige Fremddatei) | Unit + E2E | `external-fixtures.test.ts` (beide), §2.4 |
| Grenzfall 9 (DOCX-Export je Tiefe) | Unit + E2E | `docx roundtrip` Lists #1/2, §2.9.1, §2.10 #1 |
| Grenzfall 10 (ODT-Stil Ebene 2+) | Unit + manuell | `odt roundtrip` Lists #6, §2.13 |
| Grenzfall 11/12 (Undo/Redo, schnelle Folge) | Unit + E2E | `commands.test.ts` #13/15, §2.2 #2/3 |
| Grenzfall 13 (Tab nach Enter) | Unit + E2E | `commands.test.ts` #17, §2.2 #1 |
| Grenzfall 14 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert, §2.3) |
| Grenzfall 15 (Tab-Trap/Barrierefreiheit) | E2E | §2.7 #1/3 |
| Grenzfall 16 (Stresstest) | E2E | §2.12 |
| Grenzfall 17 (Tab außerhalb Liste) | Unit + E2E | `commands.test.ts` #3/9, §2.5 #1 |
| Grenzfall 18 (Button vs. Shift-Tab) | Unit + E2E | `commands.test.ts` #8, §2.1 #4 |
| Rundreise 5.1 (DOCX, Option B für gemischt) | Unit + E2E | §1.2/1.4, §2.9.1 |
| Rundreise 5.2 (ODT, Typ+Tiefe) | Unit + E2E | §1.3/1.5, §2.9.2 |
| Rundreise 5.3 (Doppelrundreise) | E2E | §2.9.3 |
| Testfall 18 (unabhängige Validierung) | E2E + manuell | §2.10 #1/2, §2.13 |
| Testfall 17 (Sichtprüfung) | E2E | §2.8 #3 |
| Reader-Fixes DOCX 4b / ODT 4d | Unit | `docx roundtrip` Lists #2 + `external-fixtures` (DOCX) #2; `odt roundtrip` Lists #6 |
| Determinismus/Selektions-Sync (0.3) | E2E | alle §2-Fälle (`settleSelection`, web-first Assertions) |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. neuem `describe('indentListItem / outdentListItem')`
      in `commands.test.ts`, der erweiterten `describe('… round trip: lists')`
      in **beiden** `roundtrip.test.ts` und der neuen Fixture-Blöcke in **beiden**
      `external-fixtures.test.ts` (sowie `styleDefs.test.ts`, falls 4a gebaut).
- [ ] `npm run test:e2e` grün in **allen** Projekten (`Desktop Chrome`,
      **`Mobile`**, `Tablet`), inkl. neuer `tests/e2e/list-indent.spec.ts` und
      der Erweiterung von `tests/e2e/selection-regression.spec.ts`.
- [ ] **Determinismus:** Jeder E2E-Testfall befolgt 0.3 — `settleSelection`
      (50 ms) nach jedem Caret-Move/Klick **vor** der Aktionstaste, ausschließlich
      web-first Assertions für Ergebnisse, `page.on('pageerror')`-Guard leer.
      Kein Flake bei 3× Wiederholung lokal **und** im `Mobile`-Projekt.
- [ ] **Rot-vor-Grün:** Die Fokus-Regression (`commands.test.ts` #2,
      `list-indent.spec.ts` §2.1 #2) lief **vor** dem Bau nachweislich rot
      (Fokus verlässt Editor / Command `false`) und **danach** grün — nicht
      rückwirkend geschrieben.
- [ ] **Option B mit PO/Lead abgestimmt** und in `list-indent.spec.ts` §2.9.1 #2
      sowie `docx roundtrip` Lists #2 als *dokumentierte* Einschränkung
      abgebildet (DOCX-Gemischt: nur Tiefe + oberste Ebene; ODT: Typ+Tiefe).
      Abweichung von wörtlicher Anforderung 5.1.2/4.7 vermerkt.
- [ ] Reader-Fixes (DOCX `parseNumberingXml` ebenengenau, ODT `listKinds`
      ebenengenau) haben je einen eigenen, grünen Regressionstest
      (`docx roundtrip` Lists #2 / `external-fixtures` #2; `odt roundtrip` Lists #6).
- [ ] Jeder Grenzfall 1-18 hat mindestens einen grünen Test **oder** ist explizit
      dokumentiert (insb. Grenzfall 3 und 4: Ergebnis „mit Testfall bestätigt",
      nicht nur angenommen).
- [ ] Vollständige Rundreise-Matrix 5.1/5.2/5.3 grün, inkl. der realen Fixtures
      (`ComplexNumberedLists.docx`, `listLevel10.odt`, `simpleList3.odt`) über
      **echten** Upload/Download — nicht über intern aufgerufene Reader/Writer.
- [ ] Grenzfall 15 (Tab-Trap) durch den Maus-Button entschärft und mit Test
      belegt (§2.7) **oder** bewusst als Einschränkung dokumentiert — nicht offen.
- [ ] Grenzfall 10 (ODT-Stil Ebene 2+) mit LibreOffice/ODF-Validator geprüft,
      Ergebnis in §2.13 vermerkt (Abnahmekriterium 5).
- [ ] Testfall 18 automatisiert (Regex/`DOMParser`, §2.10 #1/2) **und** einmalig
      manuell (`python-docx`/ODF-Validator, §2.10 #3) durchgeführt und vermerkt.
- [ ] **Kein Test in `list-indent.spec.ts` bzw. der `selection-regression.spec.ts`-
      Erweiterung** ruft `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/
      `indentListItem`/`outdentListItem`/`liftFromList` direkt auf — per Review
      bestätigt (echte Bedienung + heruntergeladene Datei prüfen).
- [ ] Abgrenzung zu `mehrstufige-liste` (kein Symbol-/Nummernformatwechsel je
      Ebene, Anforderung Abschnitt 1) im Backlog (`FEATURE-BACKLOG.md`, Zeile
      `liste-einruecken-tab`) vermerkt.
- [ ] Kein während Verifikation/Umsetzung gefundener Fehler bleibt ohne
      Ticket/Vermerk (Abnahmekriterium 9/11) — insbesondere der vorbestehende,
      feature-unabhängige Befund „bildreiner Listenpunkt fällt beim DOCX-**Import**
      aus der Liste" (`docx/reader.ts` `readBodyChildren`, Codeplan Abschnitt 9
      Punkt 4) ist als eigenes Ticket festgehalten, nicht Teil dieses Features.
