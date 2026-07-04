# Testplan „Listenebene per Tab ändern" — QA-Verifikation

Gegenstück zu `specs/liste-einruecken-tab-req.md` (Anforderung) und
`specs/liste-einruecken-tab-code.md` (Umsetzungsplan). Dieses Dokument legt
fest, **welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie
ausgeführt werden und **wann** ein Punkt als abgehakt gilt. Stand zum Zeitpunkt
dieses Testplans (2026-07-04, gegen den echten Code verifiziert): Es existiert
**noch keine** Tab-/Umschalt+Tab-Bindung (`src/formats/shared/editor/WordEditor.tsx:71-80`
enthält kein `Tab`), `commands.ts:1-2` importiert `sinkListItem` nicht,
`Toolbar.tsx:214-224` hat nur den „⇧ Liste"-Button, `docx/styleDefs.ts` definiert
nur `w:ilvl="0"`, `docx/reader.ts` liest kein `w:ilvl`. Dieser Plan ist daher
sowohl Bauabnahme (Anforderung Abschnitt 7, komplett neu zu bauende Funktion,
analog `schriftart-waehlen-qa.md`) als auch Rundreise-Regressionsschutz.

Zwei Ebenen, die sich ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene, DOCX **und** ODT — schnell, präzise, aber blind gegenüber
   Toolbar/Tastatur/echtem Datei-Dialog **und** blind gegenüber
   `indentListItem()`/`outdentListItem()` selbst, sofern nicht separat gegen
   eine echte `EditorView` getestet (siehe Abschnitt 1.1).
2. **Echte Playwright-Browser-Tests** — echter `Tab`-/`Shift+Tab`-Tastendruck
   im Editor, echte Klicks auf Toolbar-Buttons, echter
   `input.setInputFiles()`-Upload, echter `page.waitForEvent('download')`-Export,
   Prüfung der **tatsächlich heruntergeladenen Datei** (nicht nur ein interner
   Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`indentListItem`/
   `outdentListItem`). Kein Test in Abschnitt 2 darf diese Funktionen direkt
   importieren.

Referenzierte Fixtures (Existenz per `ls` geprüft, keine neuen zu beschaffen):
`tests/fixtures/external/docx/ComplexNumberedLists.docx`;
`tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, `liste2.odt`,
`ListOddity.odt`, `ListStyleResolution.odt`, `listsInTable.odt`,
`simple-table-with-lists.odt`.

---

## 0. Ausführung und Reihenfolge

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Reihenfolge (deckt sich mit `liste-einruecken-tab-code.md` Abschnitt 16):

1. Editor-Verhalten (`commands.ts`, `WordEditor.tsx`, `Toolbar.tsx`) bauen —
   danach ist Abschnitt 1.1 dieses Plans lauffähig, unabhängig von
   Import/Export.
2. DOCX-Export (`styleDefs.ts`, `writer.ts`) — danach Abschnitt 1.2.
3. DOCX-Import (`reader.ts`) — danach ist die DOCX-Rundreise (Abschnitt 1.4/2.9)
   erstmals vollständig testbar (Anforderung Zeile 403-404: Import-Fix ist
   zwingende Voraussetzung, sonst schlägt bereits der erste Import fehl).
4. ODT (`styleRegistry.ts`, `reader.ts`) — danach Abschnitt 1.3/1.4.
5. Unit-Tests aus Abschnitt 1 vollständig grün.
6. E2E-Tests aus Abschnitt 2, inklusive Cross-Format-Fälle.
7. Manuelle Verifikation (Abschnitt 2.13) — LibreOffice-Sichtprüfung.

Beide automatisierten Suiten müssen grün sein, bevor „Listenebene per Tab
ändern" laut Anforderung Abschnitt 7 (DoD) als „verifiziert" gelten darf.
**Wichtiger Review-Punkt:** Da die Tastenbindung aktuell vollständig fehlt,
müssen die zentralen Regressionstests (No-Op ohne Fokusverlust, Testfall 1/2
unten) nachweislich **vor** dem Bau rot gelaufen sein und **danach** grün —
nicht rückwirkend geschrieben, ohne den Ist-Zustand je gesehen zu haben
(analog `ausrichtung-links-qa.md` Abschnitt 4, entsprechender Punkt).

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 1.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Prüft `indentListItem()`/`outdentListItem()` direkt gegen eine echte
`EditorView` mit derselben `dispatchTransaction`-Verdrahtung wie
`WordEditor.tsx` (Muster analog `ausrichtung-links-qa.md` Abschnitt 1.1) — die
einzige Ebene, die den in `liste-einruecken-tab-code.md` Abschnitt 1
getroffenen Design-Entscheidungen (immer konsumieren im Listenkontext, nie
konsumieren außerhalb) isoliert von Browser-Fokusverhalten nachweisen kann.
Falls `commands.test.ts` bereits Fälle für andere Befehle enthält (aus einem
parallel laufenden Feature), werden diese Fälle als **eigener** `describe`-Block
`'indentListItem / outdentListItem'` ergänzt, nicht die Datei ersetzt.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `indentListItem()` auf zweitem Punkt einer flachen Bullet-Liste | 3-Punkte-`bullet_list`, Cursor in Punkt 2 | `true` zurückgegeben; Punkt 2 liegt danach als `list_item` innerhalb einer neuen `bullet_list`, die Kind von Punkt 1 ist (nicht mehr Geschwister von Punkt 1/3) | Abschnitt 3.1, Testfall 1 |
| 2 | `indentListItem()` auf dem allerersten Punkt einer Liste | 3-Punkte-`bullet_list`, Cursor in Punkt 1 | `true` zurückgegeben (Fokus-Schutz), aber Dokumentstruktur **unverändert** (`sinkListItem`-No-Op intern), `state.tr` wird nicht dispatcht — Objektidentität des Dokuments bleibt gleich | Grenzfall 1, Abschnitt 3.2, Testfall 2 |
| 3 | `indentListItem()` außerhalb jedes Listenkontexts (Cursor in normalem Absatz) | ein `paragraph` ohne umgebende Liste | `false` zurückgegeben, kein `dispatch` | Grenzfall 17, Bedienelement 5 |
| 4 | `indentListItem()` bei Cursor mitten im Text eines Punkts (nicht am Anfang) | Punkt 2 mit Text „Zweiter Punkt", Cursor zwischen „Zweiter" und „Punkt" | identisches Ergebnis zu Testfall 1 — Position im Text ist irrelevant | Abschnitt 3.3 |
| 5 | `indentListItem()` bei Selektion über zwei Punkte | Selektion von Anfang Punkt 2 bis Ende Punkt 3 (Punkt 1 als Anker vorhanden) | **beide** Punkte 2 und 3 werden gemeinsam eine Ebene tiefer verschachtelt | Abschnitt 3.4, Testfall 15 |
| 6 | `outdentListItem()` auf einem Ebene-2-Punkt | Liste mit Punkt 2 bereits eine Ebene tief verschachtelt (Ergebnis von Testfall 1) | Punkt wird Ebene 1, bleibt `list_item` innerhalb derselben `bullet_list` (verlässt die Liste **nicht**) | Abschnitt 3.6, Testfall 3 |
| 7 | `outdentListItem()` auf einem Ebene-1-Punkt | flache 3-Punkte-Liste, Cursor in Punkt 2 | Punkt 2 wird zu einem normalen `paragraph`, verlässt die Liste komplett, Text unverändert | Abschnitt 3.5, Testfall 4 |
| 8 | `outdentListItem()`-Ergebnis identisch zu `liftFromList()` auf demselben Ausgangszustand | zwei identische Ausgangsdokumente, einmal `outdentListItem()`, einmal `liftFromList()` angewendet | resultierende `doc.toJSON()` sind für den Ebene-1-Fall **identisch** (Design-Entscheidung 3) | Grenzfall 18, Bedienelement 3 |
| 9 | `outdentListItem()` außerhalb jedes Listenkontexts | Cursor in normalem Absatz | `false`, kein `dispatch` | Grenzfall 17 (symmetrisch zu Testfall 3) |
| 10 | `outdentListItem()` auf Ebene-1-Punkt mit tiefer eingerückten Kind-Punkten | Punkt 1 (Ebene 1) hat eine Unterliste mit Kind-Punkten, `outdentListItem()` auf Punkt 1 selbst (nicht auf die Kinder) angewendet | dokumentiertes Ergebnis: Punkt 1 verlässt die Liste, die Kind-Punkte bleiben als eigene, jetzt oberste Unterliste strukturell erhalten (nicht automatisch mit ausgerückt) — Ergebnis **exakt** festhalten, nicht nur erwarten | Grenzfall 3 |
| 11 | `indentListItem()` bei gemischter Selektion (ein Listenpunkt + ein nachfolgender normaler Absatz) | Selektion von Anfang eines `list_item`-Texts bis Ende eines direkt darauffolgenden `paragraph` außerhalb der Liste | dokumentiertes Ergebnis (laut Code-Audit erwartet: `false`/No-Op, da `$from.blockRange` keinen Bereich mit `list_item`-Elternknoten mehr liefert) — Testfall bestätigt das tatsächliche Verhalten, nicht nur die Annahme | Grenzfall 4, Testfall 16 |
| 12 | Wiederholtes `indentListItem()` bis zur gedeckelten Maximaltiefe (`MAX_DOCX_LIST_LEVEL`/entsprechendes Editor-Limit aus Design-Entscheidung 4) | Liste mit genügend vorherigen Geschwister-Punkten je Ebene, 10× `indentListItem()` auf denselben Nachfolgepunkt angewendet | ab der gedeckelten Tiefe liefert der Aufruf weiterhin `true` (Fokus-Schutz), aber die Struktur wird nicht tiefer als die dokumentierte Obergrenze — kein Crash, keine undefinierte Ebene | Grenzfall 2 |
| 13 | Undo nach einer wirksamen `indentListItem()`-Aktion | Testfall 1, danach `undo()` auf derselben `EditorView`/History | Struktur wieder exakt wie vor der Aktion | Abschnitt 3.8, Grenzfall 11 |
| 14 | Kein leerer Undo-Schritt bei No-Op (Testfall 2) | Testfall 2, danach `undo()` | `undo()` verändert die Historie/den Zustand **nicht** (kein „leerer" Schritt konsumiert einen weiteren `undo()`-Aufruf) | Abschnitt 3.8 |
| 15 | Mehrfaches `indentListItem()` in Folge, jede Stufe einzeln per Undo rückgängig | genügend Geschwister-Punkte, 3× `indentListItem()` auf denselben Punkt, danach 3× `undo()` | nach jedem einzelnen `undo()` ist genau eine Ebene weniger vorhanden (kein Zusammenfassen mehrerer Aktionen zu einem History-Eintrag) | Grenzfall 12, Testfall 7 |
| 16 | Zeichenformatierung (Fett) bleibt bei Ebenenänderung unberührt | Punkt mit `strong`-Mark auf einem Teiltext, `indentListItem()` angewendet | Marks am Text vor/nach dem Aufruf identisch | Abschnitt 3.12 |
| 17 | Enter (`splitListItem`) gefolgt von `indentListItem()` auf dem neuen Punkt | Ebene-2-Punkt, `splitListItem(wordSchema.nodes.list_item)(state, dispatch)` am Ende simuliert, dann `indentListItem()` auf dem neu entstandenen (leeren) Punkt | funktioniert identisch zu einem „alten" Punkt, kein Sonderfall | Grenzfall 13, Abschnitt 3.7, Testfall 5 |
| 18 | Bild als einziger Inhalt eines Listenpunkts | `list_item` mit einem `image`-Knoten als einzigem Kind (kein Text) | `indentListItem()` wirkt trotzdem (Blockeigenschaft, unabhängig vom Inline-Inhalt) | Grenzfall 6 |

### 1.2 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`, `describe('DOCX round trip: lists')`

Bestehende Fälle „preserves bullet lists with multiple items" und „preserves
ordered lists distinctly from bullet lists" (Zeilen 136-159, beide **flach**)
bleiben unverändert bestehen. **Ergänzt** um:

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | 2-stufige Bullet-Liste (Abschnitt 5.1.1) | `bullet_list` mit `list_item` A, B, C; B enthält zusätzlich eine verschachtelte `bullet_list` mit `list_item` „B1" | nach `roundTrip`: B1 ist Kind von B (nicht Geschwister von A/B/C), Text aller vier Punkte unverändert, `bullet_list`-Typ auf beiden Ebenen erhalten | Abschnitt 5.1.1, Abnahmekriterien 2+3 |
| 2 | 3-stufig, gemischt Bullet/Nummeriert (Abschnitt 5.1.2) | `ordered_list` → `list_item` → verschachtelter `bullet_list` → `list_item` → verschachtelter `ordered_list` mit einem `list_item` | nach `roundTrip`: alle drei Ebenen behalten ihren jeweiligen Typ (`ordered_list`/`bullet_list`/`ordered_list`) **und** ihre Tiefe — deckt gezielt den in `liste-einruecken-tab-code.md` Abschnitt 0 Punkt 1 zusätzlich gefundenen Ebenen-blinden-Kind-Defekt (`parseNumberingXml` las bislang nur das erste `<w:lvl>`) | Abschnitt 5.1.2, Abnahmekriterium 2 |
| 3 | Zurückstufen vor Export (Abschnitt 5.1.3) | 3-stufige Liste im Modell aufbauen, danach modellseitig eine Ebene zurückstufen (Ebene 3 → 2), dann `roundTrip` | Ebene bleibt bei 2 (nicht wieder 3, nicht versehentlich 1) | Abschnitt 5.1.3 |
| 4 | Deckel bei maximaler Ebene (Grenzfall 2) | Liste mit 10 verschachtelten Ebenen im Modell konstruiert | Export darf **nicht** crashen; nach `roundTrip` liegt die tiefste erhaltene Ebene bei der dokumentierten Obergrenze (`MAX_DOCX_LIST_LEVEL`, 9 Ebenen/Index 0-8), keine `undefined`-Formatierung | Grenzfall 2 |
| 5 | Gemischter Listentyp über Ebenen hinweg, keine Datenverlust/Absturz (Grenzfall 7) | Bullet-Liste Ebene 1, nummerierte Unterliste Ebene 2 (wie ein synthetischer „Import einer echt gemischten Fremddatei"-Fall) | `roundTrip` wirft nicht, beide Ebenen bleiben mit ihrem jeweiligen Typ erhalten | Grenzfall 7 |

### 1.3 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`, `describe('ODT round trip: lists')`

Analoge fünf Fälle wie 1.2, ODT-Variante — Fall 2 deckt hier gezielt den in
`liste-einruecken-tab-code.md` Abschnitt 0 Punkt 2 gefundenen Defekt
(`listKinds` in `odt/reader.ts:69-74` war „ebenen-blind": prüfte nur
„irgendwo im Stil ein `text:list-level-style-number`", unabhängig vom
`text:level`-Attribut). Zusätzlich:

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 6 | Ebene 2 referenziert denselben Stilnamen wie Ebene 1, aber mit `text:level="2"` definiertem, abweichendem Symbol | handgebautes ODT-Modell/`writeOdt`-Ausgabe mit zwei verschachtelten `<text:list>` desselben `style-name` | `readOdt` ordnet der tieferen Ebene den Typ zu, der unter `text:level="2"` definiert ist, nicht den von `text:level="1"` | Abschnitt 0 Punkt 2 des Codeplans, Abnahmekriterium 4 |

### 1.4 Neu/erweitert: `src/formats/docx/__tests__/external-fixtures.test.ts`

**Ergänzender** `describe`-Block, der bestehende generische Crash-Test-Loop
(Zeilen 46-100, prüft nur „Import stürzt nicht ab") bleibt unverändert
bestehen:

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Import von `ComplexNumberedLists.docx` enthält mindestens eine `bullet_list`/`ordered_list`, deren `list_item`-Inhalt selbst wieder eine `bullet_list`/`ordered_list` ist (rekursive Tiefenprüfung > 1) | keine flache Liste mehr — Regressionstest gegen den in Anforderung Grenzfall 8 beschriebenen, vor dem Fix vorhandenen Ebenenverlust beim DOCX-Import | Abschnitt 5.1.4, Abnahmekriterium 2, Grenzfall 8 |
| 2 | Dieselbe Fixture: mindestens zwei unterschiedliche Ebenen tragen **unterschiedliche** Listentypen (dort, wo die Originaldatei das laut Dateiname/Inhalt vorsieht) | nicht beide Ebenen fälschlich auf denselben Typ reduziert (deckt den in `liste-einruecken-tab-code.md` Abschnitt 0 Punkt 1 gefundenen Zusatzdefekt an einer echten, nicht synthetischen Datei) | Abschnitt 0 Punkt 1 des Codeplans |
| 3 | Import → unverändert `writeDocx` → erneut `readDocx` | alle ursprünglichen Ebenen bleiben über beide Zyklen hinweg erhalten (nicht nur beim ersten Import) | Abschnitt 5.1.4 |
| 4 | Stichprobe weiterer Fremddateien mit Listen-Verdacht aus dem vorhandenen Fixture-Korpus (`Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx`) probeweise importieren/re-exportieren | kein Absturz, Ebenen soweit vorhanden erhalten — Ergebnis je Datei dokumentieren, nicht nur an einer einzigen Datei verifizieren | Abschnitt 5.1.6 |

### 1.5 Neu/erweitert: `src/formats/odt/__tests__/external-fixtures.test.ts`

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Import von `listLevel10.odt` enthält mindestens eine mehrfach (> 1 Ebene) verschachtelte Liste | Struktur wird tatsächlich erhalten, nicht nur „stürzt nicht ab" — der entscheidende Nachweis, ob die laut Code-Audit bereits vorbereitete generische ODT-Rekursion tatsächlich funktioniert | Abschnitt 5.2.4, Abnahmekriterium 6 |
| 2 | Import von `simpleList3.odt` und `liste2.odt`, jeweils Tiefenprüfung analog #1 | Ebenen sichtbar erhalten (mindestens 2 Ebenen bei einer der beiden Dateien, sofern die Originaldatei das enthält — sonst dokumentierte Feststellung „Datei ist flach") | Abschnitt 5.2.4 |
| 3 | Import → unverändert `writeOdt` → erneut `readOdt`, alle drei Dateien | Ebenen bleiben über beide Zyklen erhalten | Abschnitt 5.2.4, Anforderung „importieren → unverändert exportieren → erneut importieren" |
| 4 | `ListOddity.odt`, `ListStyleResolution.odt` probeweise importieren, Tiefe/Typ dokumentieren | kein Absturz, Ergebnis vermerkt (weitere reale Belege neben den in der Anforderung explizit genannten Dateien) | Abschnitt 5.1.6-Äquivalent für ODT |

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — echter `page.keyboard.press('Tab')`/
`'Shift+Tab'`, `page.getByTitle(...).click()`, `input.setInputFiles(...)` für
Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen Datei
vom Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`indentListItem`/`outdentListItem`/
`liftFromList` direkt importieren oder aufrufen. Wo eine Datei hochgeladen
werden muss, wird sie entweder unabhängig per JSZip von Hand gebaut (Muster
`buildSampleDocx()` aus `tests/e2e/docx.spec.ts`) oder es wird eine der oben
gelisteten **echten** Fixture-Dateien direkt hochgeladen.

### 2.0 Neue Datei: `tests/e2e/list-indent.spec.ts`

Locator-Helfer identisch zu den bestehenden Dateien (`docx.spec.ts`,
`selection-regression.spec.ts`):

```ts
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Types three bullet-list items via the existing "Aufzählung" toolbar button. */
async function buildThreeItemBulletList(page: import('@playwright/test').Page) {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Punkt')
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Punkt')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Punkt')
}
```

`beforeEach`: `page.goto('/')` → `page.getByRole('button', { name: /verstanden/i }).click()`
→ je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (Muster aus
`selection-regression.spec.ts`).

**Wichtig zu Button-Titeln:** Der bestehende Ausrück-Button heißt heute
`title="Liste aufheben"` (`Toolbar.tsx:216`). Nach dem in
`liste-einruecken-tab-code.md` Abschnitt 4 geplanten Ausbau lautet der Titel
`"Liste aufheben / Einzug verringern (Umschalt+Tab)"`, ein neuer Button hat
`title="Einzug erhöhen (Tab)"`. Die Tests unten referenzieren den **Ziel**-Titel
(`getByTitle(/Einzug erhöhen/)`/`getByTitle(/Liste aufheben/)` als Regex, damit
kleinere Formulierungsänderungen den Test nicht bei jedem Wortlaut brechen,
aber der neue Button eindeutig gefunden wird) — das lässt die Suite bewusst
rot laufen, bis der Button tatsächlich existiert, statt den heutigen
Ist-Zustand (kein Einrück-Button) stillschweigend zu akzeptieren.

### 2.1 Grundverhalten Tab/Umschalt+Tab (Testfälle 1-4 der Anforderung, Grenzfall 1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | **Kernregressionstest**: Tab auf zweitem Punkt verschachtelt sichtbar | `buildThreeItemBulletList(page)` → Cursor in „Zweiter Punkt" setzen (Klick hinein) → `page.keyboard.press('Tab')` | im DOM: `.ProseMirror li` für „Zweiter Punkt" liegt innerhalb eines verschachtelten `ul` im `li` von „Erster Punkt" (`editor.locator('li', { hasText: 'Erster Punkt' }).locator('ul li')` enthält „Zweiter Punkt"); Editor bleibt fokussiert (`await expect(editor).toBeFocused()`) |
| 2 | **Kritischer Regressionstest gegen heutiges Default-Verhalten**: Tab auf allererstem Punkt ist No-Op ohne Fokusverlust | `buildThreeItemBulletList(page)` → Cursor in „Erster Punkt" → Konsolen-/Fokus-Listener registrieren → `page.keyboard.press('Tab')` | **kein** sichtbares verschachteltes `ul`; `await expect(editor).toBeFocused()` unmittelbar nach dem Tab-Druck (vor diesem Fix würde der Fokus laut Code-Audit den Editor verlassen); Text sofort danach eingetippt (`page.keyboard.type('X')`) erscheint im Editor, nicht anderswo im DOM | Grenzfall 1, Testfall 2 |
| 3 | Umschalt+Tab auf Ebene-2-Punkt stuft eine Ebene zurück, bleibt Listenelement | Fortsetzung von #1 (Punkt 2 jetzt Ebene 2) → Cursor in Punkt 2 → `page.keyboard.press('Shift+Tab')` | Punkt 2 ist wieder auf Ebene 1 (kein verschachteltes `ul` mehr um ihn), aber weiterhin ein `li` innerhalb derselben Liste (kein `<p>`) | Abschnitt 3.6, Testfall 3 |
| 4 | Umschalt+Tab auf Ebene-1-Punkt entfernt ihn komplett aus der Liste | `buildThreeItemBulletList(page)` (alle drei Ebene 1) → Cursor in „Zweiter Punkt" → `page.keyboard.press('Shift+Tab')` | „Zweiter Punkt" ist danach ein normaler `<p>` außerhalb jedes `<ul>`, Text unverändert; Vergleichstest auf einem zweiten, identisch aufgebauten Dokument: Klick auf `getByTitle(/Liste aufheben/)` auf demselben Ausgangspunkt liefert **identisches** DOM-Ergebnis | Abschnitt 3.5, Testfall 4, Grenzfall 18 |

### 2.2 Enter-Zusammenspiel, Undo/Redo, schnelle Folgen (Testfälle 5-7, Grenzfälle 11-13)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Enter am Ende eines Ebene-2-Punkts, dann Tab auf neuem Punkt | Punkt 2 per Tab auf Ebene 2 bringen → Cursor ans Ende von Punkt 2 → `Enter` (neuer, leerer Punkt erbt Ebene 2) → `page.keyboard.type('Neuer Punkt')` → `page.keyboard.press('Tab')` | „Neuer Punkt" verschachtelt sich normal eine weitere Ebene tiefer (Ebene 3), identisch zu einem „alten" Punkt — kein Sonderfall | Grenzfall 13, Abschnitt 3.7, Testfall 5 |
| 2 | Undo direkt nach Tab macht Ebene rückgängig, Redo stellt sie wieder her | `Tab` auf Punkt 2 → `page.keyboard.press('ControlOrMeta+z')` → DOM prüfen → `page.keyboard.press('ControlOrMeta+y')` → DOM erneut prüfen | nach Undo: kein verschachteltes `ul` mehr; nach Redo: wieder verschachtelt | Testfall 6, Grenzfall 11 |
| 3 | Mehrfaches Tab in Folge, jede Stufe einzeln per Undo rückgängig | genügend Geschwisterpunkte anlegen (mindestens 4, damit 3× Tab auf denselben Punkt jeweils einen vorherigen Geschwister-Punkt hat) → 3× `Tab` auf denselben Punkt → nach jedem der 3 nachfolgenden `ControlOrMeta+z` die Verschachtelungstiefe im DOM prüfen | Tiefe nimmt mit jedem einzelnen Undo genau um eine Ebene ab (kein Zusammenfassen zu einem History-Eintrag) | Testfall 7, Grenzfall 12 |
| 4 | Umschalt+Tab auf Ebene 1 mit vorhandenen Kind-Punkten (Ebene 2) — dokumentiert Grenzfall 3 | Punkt 1 hat eine per Tab erzeugte Ebene-2-Unterliste unter einem anderen Ankerpunkt, `Shift+Tab` wird auf Punkt 1 selbst angewendet | tatsächliches DOM-Ergebnis wird geprüft und hier **dokumentiert** (laut Anforderung erwartet: Kind-Punkte bleiben als eigene, jetzt oberste Unterliste bestehen) — Test schlägt fehl, falls sich das Verhalten unbemerkt ändert | Grenzfall 3 |

### 2.3 Regressionstest Selection-Sync-Bug mit Tab als Auslöser (Grenzfall 14, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — analog zur in `ausrichtung-links-qa.md`
Abschnitt 2.10 begründeten Konvention: dauerhaft verankert statt einer
zusätzlichen, leicht vergessbaren Datei). Neuer Test im bestehenden
`describe`-Block, exakt nach dem Muster der bestehenden Fälle, aber mit `Tab`
als abschließendem Schritt statt Enter/Tippen:

```ts
test('same regression with Tab as the triggering action after bold + click-reposition (Grenzfall 14)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Punkt')
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Punkt')
  await page.keyboard.press('Tab')
  await page.keyboard.type(' weiter')
  await expect(editor).toContainText('Erster Punkt')
  await expect(editor).toContainText('Zweiter Punkt weiter')
})
```

Assertion: kein Content-Verlust, kein Absturz — analog zum bestehenden
Fett-Muster, hier mit Tab statt Enter als der Aktion, die den stale-Selection-
Bug reproduzieren könnte.

### 2.4 Import realer Fremddateien (Testfälle 9-10, Grenzfall 8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Import `ComplexNumberedLists.docx` | `docxCard`, `input.setInputFiles({ name: 'ComplexNumberedLists.docx', ..., buffer: readFileSync(...) })` | verschachteltes `<ul>`/`<ol>` im DOM sichtbar (mindestens ein `li` enthält ein weiteres `ul`/`ol` als Kind) — Regressionstest gegen den DOCX-Import-Ebenenverlust (Grenzfall 8) | Testfall 9 |
| 2 | Import `listLevel10.odt` | `odtCard`, Upload | verschachteltes `<ul>`/`<ol>` im DOM sichtbar, mehr als eine Verschachtelungsebene erkennbar | Testfall 10 |
| 3 | Import `simpleList3.odt` | `odtCard`, Upload | Ebenen wie im DOM sichtbar dokumentiert (Tiefe je nach tatsächlichem Dateiinhalt festhalten) | Testfall 10 |

### 2.5 Tab außerhalb eines Listenkontexts, Tabellen (Testfälle 13-14, Grenzfälle 5/17)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Tab in normalem Absatz außerhalb jeder Liste | neuen Absatz tippen (kein Listen-Button geklickt), Cursor darin, `page.keyboard.press('Tab')` | **keine** Listen-Einrückung ausgelöst; Verhalten identisch zum aktuellen/`tabulator-zeichen`-Stand (Regressionsschutz, kein neuer Effekt); Editor bleibt fokussiert | Grenzfall 17, Testfall 13 |
| 2 | Liste innerhalb einer selbst angelegten Tabellenzelle, Tab gedrückt | Tabelle einfügen (`getByRole('button', { name: 'Tabelle einfügen' })`) → in einer Zelle Text tippen, `getByTitle('Aufzählung').click()` → weiteren Punkt per Enter anlegen → Cursor im zweiten Punkt, `Tab` drücken | nur die Listenebene ändert sich (verschachteltes `ul` innerhalb der Zelle), **kein** Sprung des Cursors in die Nachbarzelle | Grenzfall 5, Testfall 14 |
| 3 | Fixture `listsInTable.odt`, Tab auf einem enthaltenen Listenpunkt | `odtCard`, Upload, Cursor in einen Listenpunkt innerhalb einer Tabellenzelle setzen, `Tab` drücken | Ergebnis gemäß Grenzfall 5 dokumentiert, kein Zellsprung, keine Exception | Testfall 14 |
| 4 | Fixture `simple-table-with-lists.odt`, Stichprobe | Upload, Sichtprüfung | kein Absturz beim Öffnen, Listen innerhalb der Tabelle sichtbar | Grenzfall 5 (zusätzlicher Beleg) |

### 2.6 Selektion über mehrere Punkte, gemischte Selektion (Testfälle 15-16, Grenzfall 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Selektion über zwei Listenpunkte, Tab gedrückt | `buildThreeItemBulletList(page)` → Cursor ans Ende von „Erster Punkt" → `page.keyboard.down('Shift')`/`page.keyboard.press('Shift+ArrowDown')` bis Selektion „Zweiter Punkt" und „Dritter Punkt" (bzw. Teile davon) einschließt → `Tab` | **beide** erfassten Punkte gemeinsam eine Ebene tiefer verschachtelt | Abschnitt 3.4, Testfall 15 |
| 2 | Gemischte Selektion: ein Listenpunkt + ein normaler, nachfolgender Absatz | Liste mit zwei Punkten anlegen, danach `Enter` + „Liste aufheben" auf einem dritten Punkt, um einen normalen Absatz direkt nach der Liste zu erzeugen, Selektion von Anfang des letzten Listenpunkts bis Ende des normalen Absatzes, `Tab` | tatsächliches Ergebnis dokumentiert (laut Code-Audit erwartet: No-Op, keine Änderung an Liste oder Absatz) — Test schlägt fehl, falls sich das Verhalten unbemerkt ändert | Grenzfall 4, Testfall 16 |

### 2.7 Barrierefreiheit / Maus-Alternativweg (Bedienelemente 4/7, Grenzfall 15)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Neuer Button „Einzug erhöhen" per Klick funktioniert identisch zu Tab | `buildThreeItemBulletList(page)` → Cursor in Punkt 2 → `page.getByTitle(/Einzug erhöhen/).click()` | identisches DOM-Ergebnis zu 2.1 #1 (Klick-Alternative funktioniert) | Bedienelement 4, Grenzfall 15 |
| 2 | Button-Tooltip/`aria-label` nennt die Tastenkombination | — | `getByTitle(/Einzug erhöhen \(Tab\)/)` und `getByLabel(/Einzug erhöhen \(Tab\)/)` referenzieren denselben Button; ebenso für den Ausrück-Button `getByTitle(/Umschalt\+Tab/)` | Bedienelement 7 |
| 3 | Bewusste Tab-Trap-Einschränkung dokumentiert, aber Maus-Fluchtweg funktioniert | Cursor in einem Listenpunkt, `Tab` drücken (bleibt im Editor/Listenkontext) → anschließend Klick auf einen Toolbar-Button außerhalb des Editors | Fokus verlässt den Editor **nur** über den Maus-Klick, nicht über Tab — bestätigt die in Grenzfall 15 verlangte, bewusst dokumentierte Einschränkung samt vorhandenem Alternativweg | Grenzfall 15 |

### 2.8 Sichtbare Darstellung je Ebene (Testfall 17, Abschnitt 3.9/3.10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Bullet-Liste: Ebene 2 optisch unterscheidbar von Ebene 1 | `buildThreeItemBulletList(page)` → Punkt 2 per Tab auf Ebene 2 | `getComputedStyle`/Screenshot-Vergleich zeigt sichtbar unterschiedlichen Einzug (`padding-left` kumuliert) und/oder unterschiedliches Aufzählungszeichen (UA-Stylesheet-Wechsel) zwischen Ebene 1 und Ebene 2 | Abschnitt 3.9, 3.10 |
| 2 | Nummerierte Liste: Ebene 2 zeigt eigene Nummerierung | analoger Aufbau mit `getByTitle('Nummerierte Liste')` | Ebene 2 beginnt sichtbar wieder bei „1." (oder eigenem Zähler), unterscheidbar von Ebene 1 | Abschnitt 3.9 |
| 3 | Sichtprüfung/Screenshot-Vergleich vor Export und nach Reimport | mehrstufige Liste anlegen, Screenshot/`getComputedStyle` nehmen, exportieren, re-importieren, erneut prüfen | Darstellung (Einzug, sichtbares Aufzählungsmerkmal je Ebene) vor/nach Rundreise identisch | Testfall 17 |

### 2.9 Rundreise — Pflicht-Szenarien aus Anforderung Abschnitt 5, echter Datei-Kreislauf

Jedes Szenario läuft über echten Upload (`filechooser`/`setInputFiles`) und
echten Download (`page.waitForEvent('download')` + `download.path()` →
`fs.readFile` → `JSZip.loadAsync` → `word/document.xml` bzw. `content.xml`
lesen), **nicht** nur über intern aufgerufene Reader/Writer-Funktionen
(Testfall 11 der Anforderung).

**5.1 DOCX**

| # | Szenario | Ablauf | Assertion an heruntergeladener/reimportierter Datei |
|---|---|---|---|
| 1 | Eigenrundreise, 2-stufige Liste | `buildThreeItemBulletList(page)` → `Tab` auf Punkt 2 → exportieren → exportierte Datei per `setInputFiles` erneut hochladen | `word/document.xml` enthält für Punkt 2 ein `<w:ilvl w:val="1"/>` (bzw. den gewählten Ebenen-Index), für Punkt 1/3 `<w:ilvl w:val="0"/>`; nach Re-Import: Punkt 2 weiterhin sichtbar verschachtelt, Text aller drei Punkte unverändert |
| 2 | 3-stufig gemischt Bullet/Nummeriert | je eine Bullet- und eine nummerierte Liste mit mindestens 3 Ebenen im Editor anlegen (mehrfaches `Tab` auf tiefer werdende Punkte), exportieren, reimportieren | jede Ebene bleibt dem richtigen Listentyp (`w:numFmt`) und der richtigen Tiefe (`w:ilvl`) zugeordnet |
| 3 | Zurückstufen vor Export | Punkt auf Ebene 3 anlegen, `Shift+Tab` einmal → Ebene 2, exportieren, reimportieren | Ebene bleibt bei 2 (nicht wieder 3, nicht versehentlich 1) |
| 4 | Reale Fremddatei `ComplexNumberedLists.docx` | hochladen → **ohne Änderung** exportieren → erneut hochladen | alle ursprünglichen Ebenen bleiben über beide Zyklen erhalten (DOM-Verschachtelung nach Re-Import identisch zur DOM-Verschachtelung direkt nach dem ersten Import) |
| 5 | Cross-Format DOCX → ODT | im Editor erzeugte mehrstufige Liste als ODT exportieren (Format-Wechsel über UI, sonst Re-Upload-Pfad wie in `kursiv-qa.md`/`ausrichtung-links-qa.md` beschrieben) | `content.xml` enthält verschachtelte `<text:list>`-Elemente mit erhaltener Tiefe |
| 6 | Weitere reale Fremddateien | `Numbering.docx`, `NumberingWOverrides.docx`, `NumberingWithOutOfOrderId.docx` probeweise importieren/exportieren | kein Absturz, Ebenen soweit im Original vorhanden erhalten — Ergebnis je Datei dokumentieren |

**5.2 ODT**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | Eigenrundreise, 2-stufige Liste | wie 5.1.1, ODT-Karte | `content.xml`: verschachteltes `<text:list>` innerhalb des `<text:list-item>` von Punkt 1, Punkt 2 darin enthalten |
| 2 | 3-stufig gemischt | wie 5.1.2, ODT-Variante | jede Ebene behält Typ und Tiefe |
| 3 | Zurückstufen vor Export | wie 5.1.3, ODT-Variante | Ebene bleibt bei 2 |
| 4 | Reale Fremddatei `listLevel10.odt`, `simpleList3.odt`, `liste2.odt` | hochladen → unverändert exportieren → erneut hochladen | Ebenen bleiben erhalten — der entscheidende Nachweis, ob die generische ODT-Rekursion tatsächlich hält |
| 5 | Cross-Format ODT → DOCX | DOCX-Fremddatei mit mehrstufiger Liste (`ComplexNumberedLists.docx`) importieren → als ODT exportieren | Ebenen bleiben nach dem Formatwechsel erhalten |
| 6 | Sichtprüfung tieferer Ebenen mit echter Zielanwendung | siehe Abschnitt 2.13 (manuell) | Ergebnis dort dokumentiert |

**5.3 Doppelte Rundreise / Cross-Format hin und zurück**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | DOCX → ODT → DOCX | im Editor 3-stufige Liste per Tab erzeugen → als ODT exportieren → hochladen → als DOCX exportieren | letzter Export: alle drei Ebenen an exakt derselben Textstelle erhalten |
| 2 | ODT → DOCX → ODT | spiegelbildlich, Startpunkt ODT-Karte | letzter Export: alle drei Ebenen erhalten |

### 2.10 Unabhängige Validierung der exportierten Datei (Testfall 18)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | DOCX-Export, Regex/`DOMParser`-Prüfung auf `w:ilvl` je Absatz, ohne `readDocx` | Export aus 2.9 DOCX #1 laden | `word/document.xml` enthält für den verschachtelten Absatz `<w:ilvl w:val="1"\/>` (bzw. korrekten Index), für die Geschwister `<w:ilvl w:val="0"\/>` — per Regex/`DOMParser` direkt am String geprüft, **nicht** über den eigenen Reader (verhindert sich gegenseitig kompensierende Schreib-/Lesefehler) |
| 2 | ODT-Export, Regex/`DOMParser`-Prüfung auf verschachtelte `text:list` | Export aus 2.9 ODT #1 laden | `content.xml` enthält ein `<text:list>` **innerhalb** eines `<text:list-item>` (verschachtelte Struktur im XML nachweisbar) |
| 3 | Manuelle Einmalvalidierung (außerhalb der CI-Suite) | eine exportierte Test-DOCX mit mehrstufiger Liste mit `python-docx` prüfen (Werte von `w:ilvl` je Absatz); eine exportierte Test-ODT mit einem unabhängigen ODF-Validator/LibreOffice prüfen | Ergebnis in `liste-einruecken-tab-req.md` oder dieser Datei (Abschnitt 2.13) vermerkt — Pflicht-Checkliste-Punkt vor Abnahme (Anforderung Testfall 18), kein automatisierter Testschritt |

### 2.11 Undo/Redo und Zeichenformatierung im Browser (Abschnitt 3.8/3.12, ergänzend zu 2.2)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Fett bleibt nach Tab erhalten | Text mit Fett-Teilen in einem Listenpunkt, `Tab` auf diesem Punkt | `strong`-Formatierung im DOM unverändert nach der Ebenenänderung | Abschnitt 3.12 |
| 2 | Fokus bleibt nach Tab/Umschalt+Tab im Editor, Cursor inhaltlich an derselben Textstelle | Cursor mitten im Text eines Punkts, `Tab` drücken, sofort weitertippen ohne erneuten Klick | getippter Text erscheint an der erwarteten Stelle im (jetzt verschachtelten) Punkt, kein Sprung an Dokumentanfang/-ende | Abschnitt 3.11 |

### 2.12 Stresstest (Grenzfall 16)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Lange, tief verschachtelte Liste, wiederholtes Tab | per Schleife 20 Listenpunkte anlegen, mehrere davon per Tab in unterschiedliche Ebenen verschachteln | kein spürbares Einfrieren der UI (`await expect(...).toBeVisible({ timeout: 5000 })` o. ä. bleibt innerhalb des Zeitbudgets), kein Konsolenfehler (`page.on('pageerror')`-Listener bleibt leer) |
| 2 | Export/Import derselben großen Liste | Export der aus #1 erzeugten Datei, Re-Import | kein Performance-Einbruch (abgeschlossen innerhalb des Standard-Timeouts der Suite), Ebenen bleiben erhalten |

### 2.13 Manuelle Verifikationsschritte (nicht automatisierbar, Pflicht vor Statuswechsel)

- **Grenzfall 10 / Abnahmekriterium 4:** Eine mit diesem Feature erzeugte,
  mindestens 3-stufige ODT-Datei in LibreOffice Writer öffnen und die
  Darstellung von Ebene 2/3 gegenüber Ebene 1 protokollieren (Einzug sichtbar
  unterschiedlich? Aufzählungszeichen auf jeder Ebene sichtbar?). Ergebnis
  hier nachtragen.
- **Design-Entscheidung 6 (`liste-einruecken-tab-code.md` Abschnitt 1):**
  Testweise eine Fremddatei mit Bullet auf Ebene 1 / Nummeriert auf Ebene 2 in
  LibreOffice erzeugen, mit dieser App importieren/re-exportieren, erneut in
  LibreOffice öffnen, Ebene/Symbol vergleichen. Ergebnis hier nachtragen.
- **Testfall 18 (unabhängiger Parser):** siehe Abschnitt 2.10 #3.

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-/Codeplan-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| Bedienelement 1/2 (Tab/Shift-Tab-Bindung) | Unit + E2E | `commands.test.ts` #1-3, `list-indent.spec.ts` §2.1 |
| Bedienelement 3 (Button „Liste aufheben" unverändert) | Unit + E2E | `commands.test.ts` #8, `list-indent.spec.ts` §2.1 #4 |
| Bedienelement 4 (neuer „Einzug erhöhen"-Button) | E2E | `list-indent.spec.ts` §2.7 #1 |
| Bedienelement 5 (Tab außerhalb Liste unverändert) | Unit + E2E | `commands.test.ts` #3/#9, `list-indent.spec.ts` §2.5 #1 |
| Bedienelement 6 (Tabellenzelle) | E2E | `list-indent.spec.ts` §2.5 #2-4 |
| Bedienelement 7 (Tooltip/`aria-label` mit Tastenhinweis) | E2E | `list-indent.spec.ts` §2.7 #2 |
| Abschnitt 3.1-3.4 (Sink-Semantik, erster Punkt, Cursor-Position, Mehrfachselektion) | Unit + E2E | `commands.test.ts` #1/2/4/5, `list-indent.spec.ts` §2.1, §2.6 #1 |
| Abschnitt 3.5/3.6 (Lift-Semantik Ebene 1 vs. ≥2) | Unit + E2E | `commands.test.ts` #6/7, `list-indent.spec.ts` §2.1 #3/4 |
| Abschnitt 3.7 (Enter-Zusammenspiel) | Unit + E2E | `commands.test.ts` #17, `list-indent.spec.ts` §2.2 #1 |
| Abschnitt 3.8 (Undo/Redo, kein leerer Schritt) | Unit + E2E | `commands.test.ts` #13/14/15, `list-indent.spec.ts` §2.2 #2/3 |
| Abschnitt 3.9/3.10 (Darstellung je Ebene) | E2E | `list-indent.spec.ts` §2.8 |
| Abschnitt 3.11 (Fokus-/Selektionserhalt) | E2E | `list-indent.spec.ts` §2.11 #2 |
| Abschnitt 3.12 (Zeichenformatierung unberührt) | Unit + E2E | `commands.test.ts` #16, `list-indent.spec.ts` §2.11 #1 |
| Abschnitt 3.13/Rundreise-Grundprinzip | Unit + E2E | Abschnitt 1.2-1.5 hier, `list-indent.spec.ts` §2.9 |
| Grenzfall 1 (No-Op, kein Fokusverlust) | Unit + E2E | `commands.test.ts` #2, `list-indent.spec.ts` §2.1 #2 |
| Grenzfall 2 (Maximaltiefe) | Unit | `commands.test.ts` #12, `docx roundtrip.test.ts` (Lists) #4 |
| Grenzfall 3 (Kind-Punkte beim Ausrücken der Elternebene) | Unit + E2E | `commands.test.ts` #10, `list-indent.spec.ts` §2.2 #4 |
| Grenzfall 4 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #11, `list-indent.spec.ts` §2.6 #2 |
| Grenzfall 5 (Liste in Tabellenzelle) | E2E | `list-indent.spec.ts` §2.5 #2/3 |
| Grenzfall 6 (Bild als einziger Inhalt) | Unit | `commands.test.ts` #18 |
| Grenzfall 7 (gemischte Listentypen über Ebenen) | Unit | `docx`/`odt roundtrip.test.ts` (Lists) #5 |
| Grenzfall 8 (reale mehrstufige Fremddatei) | Unit + E2E | `external-fixtures.test.ts` (beide Formate), `list-indent.spec.ts` §2.4 |
| Grenzfall 9 (DOCX-Export flachgelegt) | Unit + E2E | `docx roundtrip.test.ts` (Lists) #1/2, `list-indent.spec.ts` §2.9 5.1, §2.10 #1 |
| Grenzfall 10 (ODT-Listenstil Ebene 2+) | Unit + manuell | `odt roundtrip.test.ts` (Lists) #6, Abschnitt 2.13 hier |
| Grenzfall 11/12 (Undo/Redo, schnelle Folge) | Unit + E2E | `commands.test.ts` #13/15, `list-indent.spec.ts` §2.2 #2/3 |
| Grenzfall 13 (Tab unmittelbar nach Enter) | Unit + E2E | `commands.test.ts` #17, `list-indent.spec.ts` §2.2 #1 |
| Grenzfall 14 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert, §2.3 hier) |
| Grenzfall 15 (Tab-Trap/Barrierefreiheit) | E2E | `list-indent.spec.ts` §2.7 #1/3 |
| Grenzfall 16 (Stresstest) | E2E | `list-indent.spec.ts` §2.12 |
| Grenzfall 17 (Tab außerhalb Liste) | Unit + E2E | `commands.test.ts` #3/9, `list-indent.spec.ts` §2.5 #1 |
| Grenzfall 18 (Button vs. Shift-Tab bei Ebene ≥2) | Unit + E2E | `commands.test.ts` #8, `list-indent.spec.ts` §2.1 #4 |
| Rundreise Abschnitt 5.1 (alle 6 Testfälle) | Unit + E2E | Abschnitt 1.2/1.4 hier, `list-indent.spec.ts` §2.9 5.1 |
| Rundreise Abschnitt 5.2 (alle 6 Testfälle) | Unit + E2E | Abschnitt 1.3/1.5 hier, `list-indent.spec.ts` §2.9 5.2 |
| Rundreise Abschnitt 5.3 (Doppelrundreise) | E2E | `list-indent.spec.ts` §2.9 5.3 |
| Testfall 18 (unabhängige Validierung) | E2E (automatisiert) + manuell | `list-indent.spec.ts` §2.10 #1/2, §2.13 (manuell) |
| Testfall 17 (Sichtprüfung/Screenshot) | E2E | `list-indent.spec.ts` §2.8 #3 |
| Zwei zusätzliche Codeplan-Defekte (Abschnitt 0 Punkt 1/2) | Unit | `docx roundtrip.test.ts` (Lists) #2, `odt roundtrip.test.ts` (Lists) #6, `external-fixtures.test.ts` (DOCX) #2 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. neuem/erweitertem `commands.test.ts`, den
      erweiterten `describe('DOCX round trip: lists')`/
      `describe('ODT round trip: lists')`-Blöcken in beiden
      `roundtrip.test.ts`-Dateien sowie den neuen `describe`-Blöcken in
      beiden `external-fixtures.test.ts`-Dateien.
- [ ] `npm run test:e2e` grün, inkl. neuer Datei `tests/e2e/list-indent.spec.ts`
      und der Erweiterung von `tests/e2e/selection-regression.spec.ts`.
- [ ] Der kritische Regressionstest gegen den heutigen Fokusverlust
      (`commands.test.ts` #2, `list-indent.spec.ts` §2.1 #2) ist **vor** dem
      Bau der Tab-Bindung nachweislich rot gelaufen (kein Tab-Handling
      vorhanden) und **nach** dem Bau grün — nicht rückwirkend geschrieben
      (Review-Punkt, analog `ausrichtung-links-qa.md`).
- [ ] Die zwei in `liste-einruecken-tab-code.md` Abschnitt 0 zusätzlich zur
      Anforderung gefundenen Defekte (DOCX `parseNumberingXml` liest nur das
      erste `<w:lvl>`; ODT `listKinds` ist ebenen-blind) haben je einen
      eigenen, grünen Regressionstest (Abschnitt 1.2 #2, 1.3 #6 hier).
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 4 (1-18) hat mindestens einen
      grünen Test oder ist explizit dokumentiert (insbesondere Grenzfall 3
      und Grenzfall 4, deren Ergebnis laut Anforderung „mit Testfall zu
      bestätigen, nicht nur anzunehmen" ist).
- [ ] Vollständige Rundreise-Matrix aus Anforderung Abschnitt 5 (5.1, 5.2,
      5.3) grün, inklusive der drei realen Bestands-Fixtures
      (`ComplexNumberedLists.docx`, `listLevel10.odt`, `simpleList3.odt`) —
      über echten Upload/Download, nicht nur intern aufgerufene
      Reader/Writer-Funktionen.
- [ ] Grenzfall 15 (Tab-Trap) ist entweder durch den zusätzlichen
      Maus-Bedienweg entschärft und mit Test belegt (§2.7 hier) oder bewusst
      als akzeptierte Einschränkung dokumentiert — nicht unentschieden offen.
- [ ] Grenzfall 10 (ODT-Listenstil für Ebene 2+) mit LibreOffice oder einem
      unabhängigen ODF-Validator geprüft, Ergebnis in Abschnitt 2.13 vermerkt
      (Abnahmekriterium 4 der Anforderung).
- [ ] Testfall 18 (unabhängige Validierung) sowohl automatisiert
      (Regex/`DOMParser`, §2.10 #1/2) als auch einmalig manuell
      (`python-docx`/ODF-Validator, §2.10 #3) durchgeführt und vermerkt.
- [ ] Kein Test in `list-indent.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`indentListItem`/`outdentListItem`/`liftFromList` direkt
      auf — stichprobenartig per Review bestätigt.
- [ ] Die Abgrenzung zu `mehrstufige-liste` (kein Symbol-/Nummernformatwechsel
      je Ebene, Anforderung Abschnitt 1) ist im Backlog
      (`FEATURE-BACKLOG.md`, Zeile `liste-einruecken-tab`) vermerkt.
- [ ] Kein während der Verifikation oder Umsetzung gefundener Fehler bleibt
      ohne Ticket/Vermerk zurück (Abnahmekriterium 9 der Anforderung) —
      insbesondere der in `liste-einruecken-tab-code.md` Abschnitt 14 Punkt 4
      dokumentierte, unabhängige Dangling-Testverweis auf das nicht
      existierende `tests/e2e/large-document-import.spec.ts` in beiden
      `external-fixtures.test.ts`-Dateien ist separat vermerkt, nicht
      Gegenstand dieses Features.
