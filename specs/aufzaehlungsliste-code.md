# Umsetzungsplan: Feature „Aufzählungsliste (Bullet)"

Gegenstück zu `specs/aufzaehlungsliste-req.md` (Anforderung). Dateigenauer
Entwicklungsplan: was am bestehenden Code **nachweislich** falsch/unvollständig ist,
welche Dateien sich ändern, in welcher Reihenfolge, und welche Änderungen mit den
Geschwister-Plänen geteilt werden.

Alle Datei:Zeile-Angaben unten wurden am aktuellen Quellstand (dieser Sichtung)
direkt verifiziert. Symbolnamen sind maßgeblich, Zeilennummern können verrutschen.

---

## 0. Korrekturhinweis — diese Fassung ersetzt eine veraltete Vorfassung

> Die **vorherige** Fassung dieses Plans (und, Stand dieser Sichtung, ebenso
> `nummerierte-liste-code.md` und `liste-einruecken-tab-code.md`) beschrieb einen
> **älteren Codestand** und enthielt mehrere Aussagen, die gegen den **aktuellen**
> Quellcode **falsch** sind. `aufzaehlungsliste-req.md` warnt in Abschnitt 5 genau
> davor („ältere Fassungen … enthielten Aussagen, die inzwischen überholt sind").
> Die Vorfassung ist trotzdem in die Falle getappt. Konkret **widerlegt** durch die
> aktuelle Codesichtung (Belege in Abschnitt 1B):

| Behauptung der Vorfassung | Realität im aktuellen Code |
|---|---|
| „DOCX-Export ignoriert Verschachtelung, schreibt hart `w:ilvl=0`" | **Falsch.** `docx/writer.ts` führt `interface ListContext { numId, level }` (Z. 96–99), klammert auf `MAX_LIST_ILVL = 8` (Z. 103) und schreibt `<w:ilvl w:val="${listContext.level}"/>` mit der **tatsächlichen** Tiefe (Z. 115); ein verschachtelter Listenknoten erbt `numId` und erhöht `level` (Z. 134–136). |
| „DOCX-Import liest `w:ilvl` nicht" | **Falsch.** `listMarkerFor` liest `w:ilvl` (`docx/reader.ts` Z. 298–300); `groupLists` rekonstruiert die Verschachtelung aus der flachen `ilvl`-Sequenz über einen Frame-Stack (Z. 379–440). |
| „`numberingXml` definiert nur eine Ebene (`ilvl=0`)" | **Falsch.** `docx/styleDefs.ts` erzeugt **alle 9 Ebenen** je `abstractNum` über `bulletLevelsXml()`/`orderedLevelsXml()` (Z. 50–74), Bullet-Glyphen zyklisch `['•','◦','▪']` (Z. 43). |
| „`schema.ts` `list_item` = `paragraph block*`" | **Falsch.** `list_item.content` ist `'block+'` (`schema.ts` Z. 147), **bewusst** so, damit ein Punkt ohne führenden Absatz (reine Container-Unterliste oder Bild) gültig ist — der Kommentar Z. 139–145 nennt exakt `listLevel10.odt`/`imageWithinList.odt` als Grund. |
| „Es gibt keine Listen-E2E-Tests" | **Falsch.** `tests/e2e/roundtrip-fidelity.spec.ts` prüft die zweistufige Listen-Verschachtelung über Upload → Export → Reimport für **DOCX und ODT** (`.ProseMirror li ul, li ol` = 1 vor/nach, Z. 50/120/166/233). |

**Konsequenz:** Die Persistenz/Rundreise der Verschachtelung ist **bereits
implementiert und grün getestet** (Belege: `docx`/`odt` `roundtrip.test.ts`
„preserves a nested list two levels deep"; `roundtrip-fidelity.spec.ts`). Sie ist
**Regressionsschutz**, kein Bauauftrag. Zwei Fixvorschläge der Vorfassung sind
deshalb **zurückgezogen** bzw. **ersetzt**, weil sie diese grünen Tests **brechen**
würden (siehe Abschnitt 2, F6-alt und F7-alt).

---

## 1. Geltungsbereich, Geschwister-Pläne und geteilter Code

`bullet_list`/`ordered_list`/`list_item` (`schema.ts` Z. 115–152), `toggleList`/
`liftFromList` (`commands.ts` Z. 57–64), die drei Listen-Buttons (`Toolbar.tsx`
Z. 241–273) und der DOCX/ODT-Listencode werden von **vier** Backlog-Slugs geteilt.
Die zugehörigen Codepläne **existieren bereits alle** (anders als die Vorfassung
behauptete):

| Slug | Req | Code | Verhältnis zu diesem Plan |
|---|---|---|---|
| `aufzaehlungsliste` | `aufzaehlungsliste-req.md` | **dieser Plan** | Bullet-spezifische Abnahme + die bullet-eigenen Format-Robustheitsfixes. |
| `nummerierte-liste` | `nummerierte-liste-req.md` | `nummerierte-liste-code.md` (existiert) | **Autoritative Quelle des geteilten Editor-Codes:** echtes `toggleList` (dort §2.1), `isListActive`/aktiver Zustand (§2.2), `NumberingRegistry`/`numId` je Top-Level-Liste (§2.5) **und** der DOCX-Tabellenzellen-Import-Fix `readParagraphsAndTables` (§2.6, hier F9/2.2/4.5). Dieser Plan **implementiert diese geteilten Stellen nicht doppelt**, sondern übernimmt sie und ergänzt die Bullet-Abnahme. **F9 (§2.6) ist dabei kein optionaler Bonus für dieses Feature** — ohne ihn kann die in `aufzaehlungsliste-req.md` 4.1.5 geforderte DOCX-Rundreise „Liste in Tabellenzelle" nicht bestehen, unabhängig davon, ob `nummerierte-liste` ihn priorisiert. |
| `liste-aufheben` | `liste-aufheben-req.md` | `liste-aufheben-code.md` (existiert) | Eigenes Feature für „⇧ Liste". Dieser Plan liefert dort nur den `disabled`-Zustand mit (Abschnitt 4.3), nicht die mehrstufige Lift-Semantik. |
| `liste-einruecken-tab` | `liste-einruecken-tab-req.md` | `liste-einruecken-tab-code.md` (existiert) | Tab/Umschalt+Tab, `sinkListItem`. **Bewusst nicht hier** (Abschnitt 6). |

**Wichtige Koordinationslage:** `nummerierte-liste-code.md` §2.1 stellt selbst fest,
dass sein `toggleList`/`isListActive`-Umbau „zugleich `aufzaehlungsliste-req.md`
Ist-Stand Punkt 9 erfüllt, aber nicht dessen eigene Abnahme ersetzt". Genau diese
Arbeitsteilung übernimmt dieser Plan: **eine** Implementierung des geteilten Codes
(dort verortet), **zwei** Abnahmen (bullet-eigene Tests hier). Achtung: Auch
`nummerierte-liste-code.md`/`liste-einruecken-tab-code.md` tragen noch die in
Abschnitt 0 widerlegten Alt-Aussagen (u. a. „`numberingXml` hat nur `ilvl=0`",
„`schema` = `paragraph block*`"); ihre geteilten Fixes müssen als **Inkrement auf
dem bereits verschachtelungsfähigen Code** umgesetzt werden, nicht als Neubau (siehe
4.6/4.7). Dieser Widerspruch ist an die Pflegenden jener Pläne zu melden; dieser Plan
beschreibt nur den korrekten Zielzustand.

---

## 2. Verifizierte Fehler-/Lückenliste

„Muss" = blockierend für die Definition of Done (`aufzaehlungsliste-req.md`
Abschnitt 7). „Soll" = empfohlen, nicht blockierend. „Dokumentiert" = bewusst nicht
gebaut, als Einschränkung festzuhalten.

| # | Befund | Verifiziert an | Einstufung | Ort/Owner |
|---|---|---|---|---|
| F1 | `toggleList` ist kein echtes Toggle (nur `wrapInList`) | `commands.ts` Z. 57–60 | **Muss** | geteilt → `nummerierte-liste-code.md` §2.1; Bullet-Abnahme hier 4.2/5 |
| F2 | Kein `aria-pressed`/aktiver Zustand der Listen-Buttons | `Toolbar.tsx` Z. 241–273 (vgl. `MarkButton` Z. 75, `AlignButton` Z. 97, Tabelle Z. 281) | **Muss** | geteilt → §2.2; Bullet-Abnahme hier 4.3/5 |
| F3 | Kein sichtbares Feedback bei No-Op (Grenzfall 3.2/3.5/3.10) | dieselben Buttons, kein `disabled` | **Muss** | geteilt (Dry-Run-`disabled`); hier 4.3 |
| F4 | Tastatur-Aktivierung (Enter/Leertaste) am Button fehlt (nur `onMouseDown`) | `Toolbar.tsx` alle Buttons | **Muss** | geteilt (Toolbar); Bullet-Verifikation hier 4.3/5 |
| F5 | ODT: Listentyp-Fallback auf `'bullet'`, wenn Listenstil nur in `styles.xml` steht | `odt/reader.ts` Z. 364/288/374 | **Muss** | **bullet-eigen** (req 5.6/Grenzfall 3.13); hier 4.8 |
| F7 | DOCX: zwei benachbarte Bullet-Listen **ohne** Trennabsatz verschmelzen beim Reimport | `docx/writer.ts` Z. 136 + `docx/reader.ts` Z. 419 | **Muss** | geteilt → `NumberingRegistry` (§2.5), **muss Verschachtelung erhalten**; hier 4.6/4.7 |
| F8 | DOCX: `parseNumberingXml` wählt „erstes `<w:lvl>`", nicht gezielt `ilvl=0` | `docx/reader.ts` Z. 84 | **Soll** (latent) | hier 4.5 |
| F9 | **DOCX-Import: Eine Aufzählungsliste in einer Tabellenzelle wird komplett zu flachem Text ohne Listenstruktur** (kein `bullet_list`/`list_item`, nicht nur eine falsche `numId`) | `docx/reader.ts` `parseTable` Z. 337–339: Zellinhalt läuft über `childElements(tcEl,…,'p').flatMap((p) => paragraphToBlocks(p,…))` — **ohne** `listMarkerFor`/`groupLists`, anders als `readBodyChildren` Z. 474/482 | **Muss** | geteilt → `nummerierte-liste-code.md` §2.6 (`readParagraphsAndTables`); **hier zusätzlich verbindlich**, weil `aufzaehlungsliste-req.md` 2.7 und Rundreise 4.1.5 die Tabellenzellen-Rundreise explizit für **Aufzählungslisten in beiden Formaten** verlangt. Details/Testauftrag in 2.2 und 4.5 |
| T1 | Kein Unit-Test für `toggleList`/`liftFromList` | `commands.test.ts` (kein Treffer) | **Muss** | hier 5.1 |
| T2 | ODT-Test „zwei getrennte Listen mit Trennabsatz" fehlt (DOCX hat ihn) | `odt/roundtrip.test.ts` Z. 143–193; `docx/roundtrip.test.ts` Z. 167 | **Muss** | hier 5.1 |
| T3 | `external-fixtures.test.ts` prüft nur „stürzt nicht ab", keine Struktur | `docx`/`odt` `external-fixtures.test.ts` | **Muss** | hier 5.1 |
| T4 | Kein **dediziertes** Bullet-Abnahme-E2E-Spec (Erstellen/Toggle/aktiv/Tastatur) | `tests/e2e/*` (Bullet-Klicks nur als Setup in clipboard/cut/odt/docx-Specs) | **Muss** | hier 5.2 |
| F6-alt | ~~„`list_item` ohne führenden Absatz löst Schema-Crash aus"~~ | `schema.ts` Z. 146–152 (`block+`, bewusst) | **Zurückgezogen (Nicht-Bug)** | 2.1 |
| F11-alt | ~~„Verschachtelung wird bei DOCX-Export flachgelegt"~~ | `docx/writer.ts` Z. 96–140; grüne Tests | **Zurückgezogen (falsch)** | Abschnitt 0 |
| D1 | Kein eigenes Bullet-Zeichen / kein Zeichen je Ebene (ODT) | `schema.ts` (kein Attribut), `odt/styleRegistry.ts` Z. 98–103 (1 Ebene) | **Dokumentiert** | 7 |
| D2 | Keine Input-Rules („- "→ Liste) | kein `inputRules` im Projekt | **Dokumentiert** | 7 |
| F12 | Kein Tab/Umschalt+Tab-Einrücken im Editor | `WordEditor.tsx` Z. 77–99 (kein `Tab`) | **Übergabe** an `liste-einruecken-tab` | 6 |

### 2.1 Zurückgezogen: F6-alt („Schema-Crash bei Punkt ohne führenden Absatz") ist ein Nicht-Bug — und der vorgeschlagene Fix war schädlich

Die Vorfassung behauptete, ein `list_item`, dessen erster Block kein `paragraph`
ist (reine Container-Unterliste, Grenzfall 3.7; oder ein bild-only `text:p`,
Grenzfall 3.9), löse bei `wordSchema.nodeFromJSON` eine Schema-Exception aus, und
schlug vor, jedem solchen Punkt einen **leeren Absatz voranzustellen**.

Das ist **falsch und schädlich**:
- `schema.ts` Z. 146–152: `list_item: { content: 'block+' }` — **nicht**
  `paragraph block*`. Der Kommentar Z. 139–145 begründet ausdrücklich, dass
  `paragraph block*` „real, importierbare Dokumente in einen harten Importfehler"
  verwandelte und deshalb **absichtlich** auf `block+` geändert wurde, mit genau
  `listLevel10.odt`/`imageWithinList.odt` als Belegfixtures.
- `odt/reader.ts` Z. 289–297 erzeugt bereits gültige Punkte: `content` wird nur bei
  **komplett leerem** Inhalt auf `[emptyParagraph()]` zurückgesetzt (Z. 296); ein
  führender verschachtelter `bullet_list` oder ein `image` bleibt unangetastet und
  ist unter `block+` gültig.
- Der vorgeschlagene „leeren Absatz voranstellen"-Fix würde in **jeden**
  Container-/Bild-Punkt einen Fremd-Leerabsatz einschleusen, der beim Export wieder
  herausgeschrieben wird → Inhaltsänderung/Rundreise-Bruch — genau die Verschmutzung,
  die das `block+`-Schema vermeidet. **Nicht umsetzen.** Statt eines Fixes nur ein
  Absicherungstest (5.1), dass diese Punkte weiterhin ohne Crash und ohne
  Leerabsatz-Injektion importieren.

### 2.2 Neu identifiziert bei dieser Prüfung: F9 — DOCX verwirft eine Aufzählungsliste in einer Tabellenzelle beim Import vollständig

Weder die Vorfassung dieses Plans noch `aufzaehlungsliste-req.md` selbst benennen
diesen Befund; er wurde bei der direkten Sichtung von `docx/reader.ts` für diese
Prüfung gefunden und ist **schwerwiegender** als die in 4.6 behandelte
`numId`-Frage (F7), die nur die Top-Level-Zuordnung betrifft:

- `readBodyChildren` (`docx/reader.ts` Z. 464–485) liest für Body-Absätze **immer**
  zuerst `listMarkerFor(child)` (Z. 474) und reicht das Ergebnis an `groupLists`
  (Z. 482) durch, das daraus `bullet_list`/`ordered_list`/`list_item`-Knoten
  rekonstruiert.
- `parseTable` (Z. 311–364) tut das für den Inhalt einer Zelle **nicht**: Z. 337–339
  baut den Zellinhalt ausschließlich über
  `childElements(tcEl, …, 'p').flatMap((p) => paragraphToBlocks(p, headingInfo,
  imageRels))` — `listMarkerFor`/`groupLists` werden **nirgends** aufgerufen.
  Ein `<w:p>` mit `<w:numPr>` innerhalb einer Zelle liefert deshalb schlicht einen
  gewöhnlichen `paragraph`-Block; das `w:numPr` wird komplett ignoriert.
- **Konsequenz:** Eine Aufzählungsliste innerhalb einer Tabellenzelle — egal ob
  eine Ebene oder mehrstufig, egal ob Bullet oder Nummerierung — geht beim
  DOCX-**Import** vollständig verloren: kein `bullet_list`, kein `list_item`, kein
  Bullet-Symbol, nur der reine Text bleibt (als Absatzfolge) erhalten. Das ist
  **kein** Rand-/Kosmetikfehler, sondern echter Strukturverlust, exakt der von
  `aufzaehlungsliste-req.md` 2.7 verlangte Fall: „Eine Aufzählungsliste innerhalb
  einer Tabellenzelle muss möglich sein und bei Rundreise erhalten bleiben" — und
  Rundreise 4.1.5 verlangt das ausdrücklich für **DOCX und ODT**.
- **Export ist nicht betroffen.** `tableToDocx` (`writer.ts` Z. 158–201) ruft je
  Zellinhalt generisch `blockToDocx(child, images, rels)` auf (Z. 189); trifft dieser
  Aufruf auf einen `bullet_list`/`ordered_list`-Knoten, greift derselbe Listenfall wie
  im Body (Z. 125–140) und schreibt korrektes `w:numPr` — der Fehler ist eine reine
  **Import**-Asymmetrie, keine Export-Lücke (bestätigt durch Lesen von Z. 158–201).
- **ODT ist nicht betroffen.** `odt/reader.ts` `elementToBlocks` rekursiert für
  `table:table-cell` generisch über **dieselbe** Funktion, die auch den Body
  verarbeitet (Z. 307 ruft `elementToBlocks` rekursiv auf, derselbe Codepfad wie der
  `text:list`-Fall Z. 286–299) — eine ODT-Liste in einer Zelle wird deshalb schon
  heute korrekt erkannt. Das ist der Grund, warum die ODT-Fixtures `listsInTable.odt`/
  `simple-table-with-lists.odt` funktionieren, ein DOCX-Äquivalent davon im Korpus
  aber fehlt (per Verzeichnis-Listing bestätigt: kein `*.docx`-Fixture mit Tabelle **und**
  Liste existiert unter `tests/fixtures/external/docx/`) — der Bug wäre mit den
  vorhandenen Fixtures allein nicht aufgefallen, ein synthetischer Test ist nötig
  (5.1).
- **Fix liegt bereits geplant, aber unter einem anderen Namen/Scope.**
  `nummerierte-liste-code.md` §1.5/§2.6 beschreibt exakt diesen Befund (dort generisch
  für „Nummerierte/Aufzählungs-Liste") und plant die gemeinsame Hilfsfunktion
  `readParagraphsAndTables(children, headingInfo, imageRels, numberingInfo, depth)`,
  die sowohl `readBodyChildren` als auch der Zellpfad in `parseTable` aufrufen sollen.
  Diese Prüfung bestätigt: der Fix ist **kein** reines Nummerierungs-Anliegen,
  sondern eine **gemeinsame Voraussetzung** für die Rundreise-Pflicht dieses Plans
  (4.1.5) — die Fassung in 4.5 unten macht diese Abhängigkeit für die
  Bullet-Abnahme explizit, statt sie implizit dem Geschwisterplan zu überlassen.

---

## 3. Kernentscheidung: ein Muster für Toggle + aktiver Zustand + Deaktivierung (geteilt)

Für die drei Listen-Buttons wird **ein** Muster verwendet, das sich an vorhandene
Idiome anlehnt (`AlignButton`, `isInTable`, der bereits `disabled`-fähige
Ausschneiden-Button, `Toolbar.tsx` Z. 143–156):

1. **Aktiver Zustand** (`aria-pressed`) über `isListActive(state, ordered)` —
   Ahnenketten-Suche wie `isAlignActive` (`commands.ts` Z. 29–38), Design in
   `nummerierte-liste-code.md` §2.2.
2. **Deaktivierter Zustand** (`disabled`) über den **Dry-Run** eines Commands
   (`command(state, undefined)` liefert `true`/`false` ohne Nebenwirkung — dasselbe,
   was `canCut` (`commands.ts` Z. 126–128) und der Ausschneiden-Button schon nutzen).
3. **Echtes Toggle** statt `wrapInList`-Blindaufruf — Design in
   `nummerierte-liste-code.md` §2.1 (klassifiziert die Selektion selbst: Zieltyp
   bereits vorhanden → aufheben; anderer Typ → `setNodeMarkup`; kein Listenteil →
   `wrapInList`; Überschrift im Bereich → überspringen statt Totalausfall).

Damit fallen F1–F4 **in einem Zug** und **einmalig** (nicht je Slug) — für „• Liste"
**und** „1. Liste" **und** „⇧ Liste". Dieser Plan liefert dafür die **Bullet-Abnahme**
(4.2/4.3 Detailanforderungen, 5.1 Unit-Tests, 5.2 E2E).

**Dokumentierte Restgrenze (nicht zu lösen):** Der Dry-Run von `liftListItem` kann
`true` liefern, obwohl der echte Lift in einem Randfall doch `false` wäre
(`liftTarget === null`). Für den hier relevanten **einstufigen** Fall (im Editor
keine Verschachtelung erzeugbar) tritt das nicht auf; bei `liste-einruecken-tab`
(echte Mehrstufigkeit) erneut zu prüfen.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts` — keine Änderung

`bullet_list` (Z. 115–122), `ordered_list` (Z. 124–137), `list_item` (`block+`,
Z. 146–152) bleiben unverändert. **Kein** neues Bullet-Zeichen-Attribut (D1,
Abschnitt 7). `block+` **nicht** anfassen (siehe 2.1).

### 4.2 `src/formats/shared/editor/commands.ts` — echtes Toggle + `isListActive` (geteilt)

Die geteilte Implementierung ist in `nummerierte-liste-code.md` §2.1/§2.2 verortet.
Für den Bullet-Weg (`ordered=false`) sind dabei **verbindlich**:
- `toggleList(false)` mit Cursor in einem Bullet-Punkt → hebt die Punkte im
  erfassten Bereich **auf** (deterministisch, kein stiller No-Op, keine neue
  Verschachtelung) — deckt Grenzfälle 3.2/3.3/3.4.
- `toggleList(false)` auf eine bestehende **`ordered_list`** → `setNodeMarkup` auf
  `bullet_list` (kein Attribut nötig; `ordered_list.start` entfällt) — Typwechsel
  ohne Verschachtelung (req 2.6).
- `toggleList(false)` außerhalb jeder Liste → `wrapInList(bullet_list)` wie bisher.
- Selektion über Überschrift + Absätze (Grenzfall 3.5): Absatzläufe werden zur
  Liste, die Überschrift wird **übersprungen** (Schema lässt `heading` in
  `list_item` zwar zu, `wrapInList`/`findWrapping` aber nicht) — **kein**
  Totalausfall. Falls die geteilte Implementierung diesen Lauf-Split (noch) nicht
  liefert, greift ersatzweise der `disabled`-Zustand (4.3) als sichtbare Rückmeldung;
  das erfüllt die DoD („kein stiller Fehlschlag") ohne neue Toast-Infrastruktur (im
  `src` kein `aria-live`/`toast`/`snackbar` vorhanden — per Grep bestätigt).
- `liftFromList()` (`commands.ts` Z. 62–64) bleibt `liftListItem(list_item)`.

`isListActive(state, false)` muss `true` sein, sobald der Cursor in einem
`bullet_list` steht, sonst `false` (Ahnenketten-Suche, §2.2).

Kein neuer Fremdimport nötig außer den in §2.1/§2.2 genannten
(`NodeRange`/`liftListItem` bereits vorhanden, `wrapInList` bereits importiert
Z. 2).

### 4.3 `src/formats/shared/editor/Toolbar.tsx` — Buttons anpassen (geteilt) + Bullet-Verifikation

Aktueller Stand (verifiziert): drei Listen-Buttons Z. 241–273, alle **ohne**
`aria-pressed`, **ohne** `disabled`, Handler ausschließlich `onMouseDown`. Die
`disabled:`-Utility-Klassen existieren bereits am Ausschneiden-Button (Z. 153) und
sind wiederverwendbar (keine neue Infrastruktur).

Änderungen (gemeinsame Umsetzung, hier für die Bullet-Abnahme spezifiziert):
- „• Liste": `aria-pressed={isListActive(view.state, false)}`,
  `disabled={!toggleList(false)(view.state, undefined)}`, aktives/`disabled`-Styling
  analog `MarkButton`/`AlignButton` + `disabled:opacity-40
  disabled:cursor-not-allowed disabled:hover:bg-transparent`.
- „1. Liste": dieselbe Behandlung mit `ordered=true` (Owner: `nummerierte-liste`).
- „⇧ Liste": `disabled={!liftFromList()(view.state, undefined)}`, **kein**
  `aria-pressed` (keine sinnvolle „aktiv"-Semantik für eine Aus-der-Liste-Aktion).
  Deckt Grenzfall 3.10 (Button außerhalb einer Liste sichtbar deaktiviert).
- **F4 (Tastatur):** zusätzlich `onKeyDown` für `Enter`/`' '` auf allen
  Toolbar-Buttons, das denselben `run(view, command)` auslöst. Begründung: ein
  fokussierter `<button>` feuert bei Enter/Leertaste ein `click`, **kein**
  `mousedown`; ein reiner `onMouseDown`-Handler bleibt für Tastaturnutzer:innen
  wirkungslos. **Nicht** stattdessen `onClick` ergänzen — das würde bei echten
  Mausklicks (`mousedown` **und** `click`) doppelt auslösen. Für die Listen-Gruppe
  ist F4 laut req Abschnitt 1 Zeile 8 mit echter Browser-Bedienung zu verifizieren
  (5.2).

### 4.4 `src/formats/shared/editor/WordEditor.tsx` — keine Änderung

Keymap-Plugin (~Z. 85–107) bleibt: `Enter: splitListItem(list_item)` (Z. 96),
`Shift-Enter: insertHardBreak()` (Z. 97). **Kein** `Tab`/`Shift-Tab` (Abschnitt 6).
Das `splitListItem`-Verhalten (neuer Punkt / leerer Punkt beendet Liste / Split in
der Mitte) ist bisher **nicht** per Browser-Test belegt (nur Bibliotheks-Vertrauen)
— req 2.3 verlangt echten Nachweis → E2E in 5.2.

### 4.5 `src/formats/docx/reader.ts` — Fix F9 (Muss, geteilt) + Fix F8 (Soll, Härtung)

**F9 zuerst (blockierend für die Rundreise-Pflicht 4.1.5):** `parseTable`
(Z. 311–364), Zellinhalt Z. 337–339, muss denselben Weg wie `readBodyChildren`
(Z. 464–485: `listMarkerFor` + `groupLists`) gehen, statt Absätze roh über
`paragraphToBlocks` einzulesen. Konkret (Signatur/Name folgt der bereits in
`nummerierte-liste-code.md` §2.6 geplanten gemeinsamen Funktion, **hier nicht
zweit-implementieren**):

```ts
// gemeinsam mit readBodyChildren genutzt, statt Z. 337–339 direkt:
const cellItems = childElements(tcEl, OOXML_NAMESPACES.w, 'p').map((p) => ({
  marker: listMarkerFor(p),
  block: paragraphToBlocks(p, headingInfo, imageRels)[0], // siehe Anmerkung unten
}))
const content = groupLists(cellItems, kindByNumId)
```

(Die tatsächliche Umsetzung muss — wie `readBodyChildren` es bereits tut — auch den
Fall behandeln, dass ein `<w:p>` mehrere Blöcke liefert, z. B. Bild+Text gemischt;
`readParagraphsAndTables` aus `nummerierte-liste-code.md` §2.6 kapselt das bereits
korrekt für beide Aufrufer. Dieser Plan **fordert nur die Anwendung auf `parseTable`
ein**, nicht eine eigene, zweite Implementierung.) `kindByNumId` muss dafür bis in
`parseTable` durchgereicht werden (heute nicht Teil von dessen Parameterliste,
Z. 311) — reine Signaturerweiterung, keine Verhaltensänderung an bestehenden
Body-/Header-/Footer-Aufrufen.

**Test zuerst rot, dann grün (5.1):** Da im Fixture-Korpus **keine** DOCX-Datei mit
Tabelle **und** Liste existiert (Abschnitt 2.2, per Verzeichnis-Listing bestätigt),
muss der Nachweis über einen selbst geschriebenen Rundreise-Test laufen: Bullet-Liste
(2 Punkte) als `table_cell`-Inhalt konstruieren → `writeDocx` → `readDocx` →
`bullet_list`/`list_item` bleiben erhalten (heute: Test schlägt fehl, Zelle enthält
nur `paragraph`-Knoten mit dem reinen Text).

**Danach F8 (Soll, Härtung):** `parseNumberingXml` (Z. 78–98), Z. 84 wählt via
`firstChildNS` das **XML-erste**
`<w:lvl>`, unabhängig von dessen `w:ilvl`. Für eigene Exporte unschädlich
(`bulletLevelsXml` emittiert `ilvl=0` zuerst), aber latent falsch für Fremddateien
mit umsortierten Ebenen. Gezielt Ebene 0 suchen, Fallback „erstes Element":

```ts
const lvls = childElements(abstractEl, OOXML_NAMESPACES.w, 'lvl')
const lvl = lvls.find((l) => (l.getAttributeNS(OOXML_NAMESPACES.w, 'ilvl') ?? '0') === '0') ?? lvls[0] ?? null
```

Kein Verhaltensunterschied für bekannte Fixtures (`NumberingWithOutOfOrderId.docx`
hat verifiziert bereits `ilvl=0` als erstes `<w:lvl>`); schließt eine plausible
Fehlerquelle. Test: synthetisch umsortiertes `numbering.xml` (5.1).

**Kein Fix an `listMarkerFor`/`groupLists`** — beide sind korrekt und
regressionsgeschützt (Abschnitt 0). Nicht anfassen.

### 4.6 `src/formats/docx/writer.ts` — Fix F7: `numId` je Top-Level-Liste, **Verschachtelung erhalten**

**Problem (verifiziert):** Der `listContext=null`-Zweig (Z. 134–136) vergibt für
**jede** Top-Level-Liste dieselbe feste `BULLET_NUM_ID`/`ORDERED_NUM_ID`. Zwei
unmittelbar benachbarte Bullet-Listen ohne Trennabsatz werden dadurch als
`…<w:p numId=1 ilvl=0>A</w:p><w:p numId=1 ilvl=0>B</w:p>…` exportiert; `groupLists`
(`reader.ts` Z. 419: „gleiche numId, gleiches ilvl → nichts öffnen/schließen") fasst
sie beim Reimport zu **einer** Liste zusammen (Grenzfall 3.12, req 4.1.6 — echter
Strukturverlust). Der Fall **mit** Trennabsatz ist bereits korrekt (grüner DOCX-Test
Z. 167) und ODT ist strukturell nicht betroffen (jedes `<text:list>` ist
selbst-abgrenzend, `odt/writer.ts` Z. 99–109; `odt/reader.ts` Z. 286).

**Korrekter Fix (geteilt mit `nummerierte-liste-code.md` §2.5):** nur den
`listContext=null`-Zweig ändern — jede **Top-Level**-Liste erhält eine **frische**
`numId` aus einer `NumberingRegistry`; der **verschachtelte** Zweig bleibt
**unverändert** (erbt `numId` des Elternteils, `level+1`):

```ts
const kind = node.type === 'ordered_list' ? 'ordered' : 'bullet'
// UNVERÄNDERT (Verschachtelung): listContext != null
//   { numId: listContext.numId, level: Math.min(listContext.level + 1, MAX_LIST_ILVL) }
// GEÄNDERT (Top-Level): statt fester BULLET_NUM_ID/ORDERED_NUM_ID:
//   { numId: numbering.allocate(kind, node.attrs?.start ?? 1, node.attrs?.numberingMode ?? 'restart'), level: 0 }
```

> **Signatur ist NICHT frei wählbar — sie gehört `nummerierte-liste-code.md` §2.5.**
> Jener (autoritative) Plan definiert `NumberingRegistry.allocate(kind, start,
> mode)` samt `start`/`continue`-Semantik für die Nummerierung. Der Bullet-Weg
> ruft dieselbe Signatur mit **bedeutungslosen** Werten auf (`start=1`,
> `mode='restart'` — Bullets tragen keinen Zählwert, 2.2), damit **eine** Registry
> beide Typen bedient. Eine bullet-eigene `allocate('bullet'|'ordered')`-Kurzform
> **nicht** einführen — das wäre die zweite, divergierende Implementierung, die
> Abschnitt 1 gerade vermeiden will.

> **Kritisch — die zurückgezogene F7-alt-Variante NICHT bauen.** Die Vorfassung
> allokierte eine frische `numId` für **jeden** Listenknoten (auch verschachtelte)
> und verwarf `ListContext`/`level` ganz. Das gäbe einer Unterliste eine **andere**
> `numId` als ihrem Elternteil → `groupLists` rekonstruiert Verschachtelung nur
> **innerhalb derselben `numId` über `ilvl`** → die Unterliste würde zur
> gleichrangigen Schwesterliste **flachgelegt**. Das bricht den grünen Unit-Test
> „preserves a nested list two levels deep" (`docx/roundtrip.test.ts` Z. 178) **und**
> die E2E-Assertion `roundtrip-fidelity.spec.ts` Z. 120 → **DoD-Verletzung**
> (Verschachtelungs-Persistenz muss grün bleiben). Der Fix darf ausschließlich den
> Top-Level-Zweig betreffen.

`blockToDocx`/`blocksToDocx`/`tableToDocx`/`writeDocx` reichen **eine**
`NumberingRegistry`-Instanz (aus der neuen Datei `src/formats/docx/numberingRegistry.ts`,
§2.5) pro `writeDocx`-Aufruf durch (geteilt über Body/Header/Footer, damit `numId`-Werte
dokumentweit eindeutig sind). **Wichtig — `tableToDocx` (Z. 158–201) muss die Registry an
die Zell-Rekursion durchreichen** (heute ruft es `blockToDocx(child, images, rels)` ohne
Kontext, Z. 189), sonst erhält eine Liste **in einer Tabellenzelle** keine eigene `numId`
(Grenzfall 3.17 / Rundreise 4.1.5). **Das behebt nur die Export-`numId`-Zuordnung —
es ersetzt nicht den separaten, gravierenderen Import-Fix F9 (4.5/2.2): ohne F9 geht
die exportierte Zell-Liste beim Reimport ohnehin komplett verloren, unabhängig davon,
welche `numId` sie trägt.** Die Registry wird beim Erzeugen der
Body/Header/Footer-XML befüllt; die `<w:num>`-Einträge werden **danach** serialisiert.
Reihenfolge in `writeDocx` (Z. 256–296) passt bereits: die XML-Erzeugung (Z. 256/265/270)
befüllt die Registry, `numberingXmlContent` (Z. 282) entsteht erst danach — dort statt des
heutigen `numberingXml()` künftig `numberingXml(numbering.serializeNumEntries())` (die
`<w:num>`-Einträge kommen als Parameter, siehe 4.7).

**Bekannte, durch diesen Fix NICHT geänderte Grenze (dokumentieren):** Weil
`groupLists` Verschachtelung an gemeinsame `numId` + `ilvl` bindet, teilt eine
Unterliste zwangsläufig den **Typ** (bullet/ordered) ihres Elternteils. Gemischt
verschachtelte Typen (Bullet-in-Ordered) sind damit — wie **schon heute** — nicht
darstellbar. Das ist Sache von `liste-einruecken-tab`/`mehrstufige-liste`, kein durch
F7 eingeführtes Regress.

### 4.7 `src/formats/docx/styleDefs.ts` — nur `numberingXml`-Signatur; Registry liegt in eigener Datei (geteilt)

> **Korrektur/Abgleich mit der autoritativen Quelle.** Frühere Fassungen dieses
> Abschnitts verorteten die `NumberingRegistry`-Klasse selbst in `styleDefs.ts`.
> `nummerierte-liste-code.md` §2.5 legt sie jedoch in eine **neue eigene Datei**
> `src/formats/docx/numberingRegistry.ts` (Muster wie `RelationshipRegistry`), mit
> der Schnittstelle `allocate(kind, start, mode) → numId` und `serializeNumEntries()`.
> Diese Datei ist **dort** verortet und wird **einmal** gebaut; dieser Plan baut sie
> **nicht** erneut. `styleDefs.ts` bekommt nur die unten genannte Signaturänderung an
> `numberingXml`.

Vorhanden und **zu erhalten**: `BULLET_ABSTRACT_ID=0`/`ORDERED_ABSTRACT_ID=1`
(Z. 32–33), `BULLET_GLYPHS`/`ORDERED_FORMATS` (Z. 43–48), `bulletLevelsXml()`/
`orderedLevelsXml()` mit **9 Ebenen** (Z. 50–62). Die beiden `<w:abstractNum>` mit
je 9 Ebenen (Z. 68–69) bleiben **unverändert** (sonst verschwindet u. a. der „◦"-Glyph
auf Ebene 1, den req 4.1 Punkt 3 verlangt).

Ändern nur die `<w:num>`-Zuteilung:
- Die `<w:num>`-Einträge sind nicht mehr fest (heute die zwei bei Z. 70–71), sondern
  kommen aus `numberingRegistry.serializeNumEntries()` — ein `<w:num>` **je allokierter
  `numId`**, das auf `abstractNumId` 0 (bullet) bzw. 1 (ordered) verweist.
- `numberingXml()` (Z. 64–74) erhält dafür einen Parameter für diese Einträge, z. B.
  `numberingXml(numEntriesXml: string)`, und setzt ihn anstelle der festen zwei `<w:num>`
  ein. Die `<w:abstractNum>`-Definitionen bleiben unangetastet.
- `BULLET_NUM_ID`/`ORDERED_NUM_ID` (Z. 34–35) entfallen nach Umstellung von
  `writer.ts` (Grep über `src/` bestätigt: **nur** `styleDefs.ts` (Definition) und
  `writer.ts` (Import) referenzieren sie — sonst nichts).
- `styleDefs.test.ts` referenziert weder `numberingXml` noch `BULLET_NUM_ID` (Grep
  bestätigt), die Signaturänderung bricht dort also keinen Bestandstest; ein neuer
  Test für die dynamische `<w:num>`-Zuteilung gehört zu §2.5 bzw. 5.1 (T-F7).

> Dieselbe Warnung wie 4.6: **nicht** `numberingXml` auf eine Ebene (`ilvl=0`)
> reduzieren, wie es die Alt-Snippets zeigen. Die 9-Ebenen-`abstractNum` bleiben.

### 4.8 `src/formats/odt/reader.ts` — Fix F5 (Listentyp-Fallback), **kein** F6

**Problem (verifiziert):** `readOdt` baut `contentStyles` nur aus
`content.xml`/`office:automatic-styles` (Z. 363–364); der Body wird nur damit geparst
(Z. 366). `styles.xml` wird zwar gelesen, aber dessen `stylesForChrome` (Z. 374) nur
für Kopf-/Fußzeile genutzt (Z. 380/384), **nie** in die Body-`listKinds` gemischt;
`office:styles` (gemeinsame Vorlagen) wird gar nicht nach `text:list-style`
durchsucht. `elementToBlocks` fällt daher bei einem nur in `styles.xml`
referenzierten Listenstil auf `|| 'bullet'` (Z. 288) zurück → eine eigentlich
**nummerierte** Liste kommt als **Aufzählung** an (Grenzfall 3.13, req 5.6).

**Fix:** `parseAutomaticStyles` (Z. 37–78; iteriert bereits elementagnostisch über
`text:list-style`, Z. 70–75) zusätzlich auf **beide** Container aus `styles.xml`
anwenden (`office:automatic-styles` **und** `office:styles`) und die Ergebnisse für
den Body zusammenführen — `content.xml` gewinnt (speziellste Definition):

```ts
// in readOdt, vor readOfficeTextChildren:
const stylesAuto = stylesDoc ? stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null : null
const stylesCommon = stylesDoc ? stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null : null
const mergedListKinds = new Map([
  ...parseAutomaticStyles(stylesCommon).listKinds,
  ...parseAutomaticStyles(stylesAuto).listKinds,
  ...contentStyles.listKinds,
])
const bodyStyles = { ...contentStyles, listKinds: mergedListKinds }
// bodyBlocks mit bodyStyles statt contentStyles parsen
```

(`stylesDoc` wird heute erst im Kopf-/Fußzeilen-Zweig Z. 371–372 geparst; dafür
einmal weiter oben parsen und wiederverwenden.) Der `|| 'bullet'`-Fallback (Z. 288)
**bleibt** als letzte Stufe für Dateien, die den Stil wirklich nirgends definieren —
dann ist „bullet" die dokumentierte bewusste Vereinfachung (req 2.2).

**Kein F6-Fix** (siehe 2.1): der `list_item`-Zweig (Z. 289–297) bleibt unverändert;
`block+` erlaubt führende Nicht-Absätze. Nur Absicherungstests (5.1).

### 4.9 `src/formats/odt/writer.ts` / `4.10 styleRegistry.ts` — keine Änderung

`blockToOdt` (Z. 99–109) schreibt Verschachtelung bereits rekursiv korrekt; jede
Top-Level-Liste ist ein eigenes `<text:list>` → keine Verschmelzung, kein
F7-Äquivalent (verifiziert). `BULLET_LIST_STYLE_NAME='LB'` und die 1-Ebenen-
`listStyleDefs()` (Z. 95–103) bleiben; zusätzliche ODT-Ebenenstile sind
`liste-einruecken-tab`-Scope. Die DOCX/ODT-Symbol-Asymmetrie je Ebene (DOCX 3
Glyphen, ODT 1) ist bewusst und zu dokumentieren (req 2.2, Abschnitt 7).

### 4.11 `src/index.css` — keine Änderung

Die gemeinsame `.ProseMirror ul, .ProseMirror ol`-Regel genügt für einstufige
Listen; ebenenabhängige Darstellung ist `liste-einruecken-tab`/`mehrstufige-liste`.

---

## 5. Tests

### 5.1 Unit-Tests (Vitest)

**`src/formats/shared/editor/__tests__/commands.test.ts`** (T1 — heute **keine**
Listen-Testfälle):
- `toggleList(false)` auf einen Absatz (ohne Liste) → `bullet_list` mit einem Punkt.
- `toggleList(false)` erneut mit Cursor im Punkt → zurück zu `paragraph`
  (deterministisches Toggle-Off, Grenzfall 3.2 auf Command-Ebene).
- `toggleList(false)` auf `ordered_list` → `bullet_list`, gleicher Text/Reihenfolge,
  **kein** `list_item`, dessen Kind wieder eine Liste ist (req 2.6).
- `isListActive(state, false)` true innerhalb / false außerhalb eines `bullet_list`.
- `liftFromList()` als Dry-Run: `false` außerhalb jeder Liste (Grundlage für
  `disabled`, Grenzfall 3.10).

**`src/formats/docx/__tests__/roundtrip.test.ts`** (Block „DOCX round trip: lists",
Z. 143–204 — bestehende Tests **nicht** duplizieren):
- **T-F9 (neu, höchste Priorität — Rundreise-Pflicht 4.1.5):** Bullet-Liste (2 Punkte)
  als Inhalt einer `table_cell` konstruieren → Export → Reimport → die Zelle enthält
  weiterhin `bullet_list`/`list_item` mit beiden Punkten (nicht flache `paragraph`-
  Knoten). Muss **vor** Fix F9 (4.5) rot sein — kein reales Fixture deckt das ab
  (Abschnitt 2.2), dieser Test ist der **einzige** Nachweis. Zusätzlich: zweistufig
  verschachtelte Bullet-Liste in einer Zelle → beide Ebenen bleiben erhalten (deckt
  zugleich, dass `kindByNumId` korrekt bis in `parseTable` durchgereicht wird).
- **T-F7:** zwei unmittelbar aufeinanderfolgende Bullet-Listen **ohne** Trennabsatz
  → Export → Reimport → **zwei** `bullet_list`-Knoten. Muss **vor** Fix F7 rot sein.
- **Regressionswächter:** „preserves a nested list two levels deep" (Z. 178) muss
  nach Fix F7 **weiter grün** sein (explizit im Testlauf prüfen — der Fix darf ihn
  nicht brechen).
- **T-F8:** synthetisches `numbering.xml` mit `<w:lvl>` in vertauschter Reihenfolge
  (Ebene 1 vor 0) → `parseNumberingXml` erkennt Bullet/Ordered korrekt.

**`src/formats/odt/__tests__/roundtrip.test.ts`** (Block „ODT round trip: lists",
Z. 143–193):
- **T2:** „zwei getrennte Bullet-Listen **mit** Trennabsatz bleiben getrennt" —
  ODT-Äquivalent zum bestehenden DOCX-Test (schließt die in req 5.10 benannte Lücke).
- „zwei benachbarte Listen **ohne** Trennabsatz bleiben getrennt" — belegt die in 4.9
  begründete „kein Fix nötig"-Aussage mit einem echten Test (req 4.3 verlangt Test
  statt Argument).
- **T-F5:** konstruiertes ODT, dessen `text:list` einen nur in `styles.xml`
  (`office:styles`) mit `text:list-level-style-number` definierten Stil referenziert
  → nach Fix **`ordered_list`**, nicht `bullet_list`. Muss **vor** Fix F5 rot sein.
- **T-F6 (Absicherung, kein Fix):** `text:list-item` ohne führenden `text:p`
  (nur verschachtelter `text:list`), und Punkt mit bild-only `text:p` → Import wirft
  nicht, es wird **kein** Leerabsatz vorangestellt, der Nicht-Absatz-Inhalt bleibt
  als erster Block erhalten.

**`docx`/`odt` `external-fixtures.test.ts`** (T3 — heute nur „stürzt nicht ab"):
strukturelle Assertions je Fixture aus req 4.2 — Anzahl `bullet_list`/`ordered_list`
> 0 (wo laut Name erwartet), Summe der Punkt-Textinhalte identisch nach
Export→Reimport. Priorisiert:
- ODT einstufig: `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`,
  `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`,
  `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt`.
- ODT Verschachtelung: `EasyList.odt`, `EasyListForeignNamespace.odt`,
  `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` (Grenzfall 3.6/3.7 —
  Import ohne Crash, Ebenen erhalten).
- ODT in Tabellenzelle: `listsInTable.odt`, `simple-table-with-lists.odt`.
- ODT Bild-in-Punkt: `imageWithinList.odt` (Grenzfall 3.9 — Bild bleibt im Punkt).
- ODT Stilauflösung: `listStyleId.odt`, `ListStyleResolution.odt` (nach F5 korrekte
  Typunterscheidung).
- ODT kaputt: `brokenList.odt` (bewusst nur E2E, jsdom-Ausschluss beibehalten),
  `ListOddity.odt` — definierter Fallback.
- ODT Rundreise: `ListRoundtrip.odt`; Kontrolle Bullet-vs-Nummeriert:
  `ContinueListTest.odt`.
- ODT Basis (Textinhalt erhalten): `list.odt`, `liste2.odt`, `preparedList.odt`,
  `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`,
  `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt`.
- DOCX (verifiziert bullet-haltig): `Numbering.docx`, `NumberingWOverrides.docx`,
  `NumberingWithOutOfOrderId.docx` — Bullet-Ebenen bleiben nach Rundreise
  `bullet_list`. **`ComplexNumberedLists.docx` NICHT** in die Bullet-Suite (enthält
  kein `numFmt=bullet`; reines Nummerierungsmaterial → `nummerierte-liste`).

### 5.2 Neu: `tests/e2e/lists.spec.ts` (T4 — dediziertes Bullet-Abnahme-Spec)

Der Bullet-Button wird in `clipboard*.spec.ts`/`cut.spec.ts`/`odt.spec.ts`/
`docx.spec.ts` nur als **Setup** geklickt, und `roundtrip-fidelity.spec.ts` deckt die
**Verschachtelungs-Persistenz** ab. Was fehlt, ist ein Spec, das die
**Bedien-Akzeptanzkriterien** dieses Features per echtem Browser prüft (Konventionen
aus `docx.spec.ts`/`odt.spec.ts`: `page.getByTitle('Aufzählung')`,
`page.waitForEvent('download')` + `JSZip`; `docxCard`/`odtCard` lokal wie in den
Bestandsspecs):

1. Liste erstellen: Cursor ohne Selektion **und** Selektion über mehrere Absätze
   (jeder Absatz wird ein Punkt derselben Liste).
2. Enter-Verhalten (erstmaliger Browser-Nachweis, req 2.3): nicht-leerer Punkt (neuer
   Punkt), leerer Punkt (beendet Liste), Cursor mittig (Split ohne Textverlust),
   Umschalt+Enter (Zeilenumbruch, kein neuer Punkt).
3. Erneuter Klick „• Liste" bei aktiver Liste — erster Punkt / späterer Punkt /
   Ctrl+A über ganze Liste → nach Fix F1 jeweils **Rückwandlung zu Absätzen**, kein
   No-Op, keine Verschachtelung (Grenzfälle 3.2–3.4).
4. Wechsel Aufzählung ↔ Nummerierung ohne Verschachtelung/Datenverlust (req 2.6).
5. „⇧ Liste": Text bleibt erhalten; `disabled`, wenn Cursor **nicht** in Liste
   (Grenzfall 3.10).
6. `aria-pressed`: Cursor in/aus Bullet-Liste → sichtbarer Button-Zustandswechsel.
7. Tastatur: „• Liste" per `Tab` fokussieren (nicht klicken), `Enter`/Leertaste →
   Aktion läuft (F4, req 1.8).
8. Grenzfall 3.5: Selektion über Überschrift → Button `disabled` oder Absätze werden
   Liste unter Auslassung der Überschrift (das tatsächliche, dokumentierte Ergebnis
   assertieren), kein stiller Totalausfall.
9. **Dokumentationstest F12** (bewusst kein Fix): Cursor im Punkt, `Tab` → Assertion,
   dass sich die Dokumentstruktur **nicht** ändert (kein Sink); protokollieren, ob
   der Fokus den Editor verlässt. Erfüllt req Abschnitt 6 Testfall 6 wörtlich
   („falls nicht gebaut: expliziter Test, der das Fehlen nachweist").
10. Zusammenspiel: Fett/Kursiv/Farbe im Punkt, Ausrichtung eines einzelnen Punkts,
    Liste in Tabellenzelle (`insertTable` + Klick in Zelle + „• Liste"), Undo/Redo
    über gemischte Sequenz inkl. Toolbar-Klick + Klick-Neupositionierung
    (Selection-Sync-Regressionsmuster, `reconcileSelectionOnClick`
    `WordEditor.tsx` Z. 43–50; Muster aus `selection-regression.spec.ts`).
11. Rundreise über echten Upload/Export: einfache Bullet-Liste (3 Punkte), zwei
    getrennte Listen (mit/ohne Trennabsatz), Liste mit Zeichenformatierung, Liste in
    Tabellenzelle, Cross-Format (Editor-Liste → ODT → Reimport → DOCX → Reimport).
    **Abhängigkeit:** Der DOCX-Teilfall „Liste in Tabellenzelle" schlägt ohne Fix F9
    (4.5/2.2) fehl — dieser E2E-Fall darf erst nach F9 grün erwartet werden, sonst
    maskiert ein übersprungener/rot bleibender Test genau den in 2.2 beschriebenen
    Importverlust.
12. Import realer Fixture je Format (`bulletListTest.odt`, `Numbering.docx`) → ohne
    Bearbeitung exportieren → Download mit `JSZip` unabhängig prüfen (Punktzahl/Text/
    Typ; für DOCX `<w:numFmt w:val="bullet"/>`, `<w:lvlText w:val="•"/>` auf Ebene 0).

### 5.3 Optional (nicht blockierend)

`docxCard`/`odtCard` sind in mehreren Specs dupliziert; Extraktion nach
`tests/e2e/helpers.ts` bei Gelegenheit — nicht Teil dieses Plans.

---

## 6. Bewusste Nicht-Umsetzung: Tab/Umschalt+Tab (F12) — korrigierte Begründung

`aufzaehlungsliste-req.md` (Abschnitt 1 Zeile 5, 2.4) nennt Tab/Umschalt+Tab; dieser
Plan setzt es **nicht** um, sondern übergibt an `liste-einruecken-tab` (Req **und**
Code-Plan existieren bereits):

1. Eigenständiger Backlog-Slug mit eigener, deutlich detaillierterer Spezifikation
   (`liste-einruecken-tab-req.md`/`-code.md`, `-qa.md`).
2. **Korrektur der Vorfassungs-Begründung:** Die Vorfassung argumentierte, eine
   isolierte Tab-Bindung würde beim DOCX-Export „sofort wieder flachgelegt". Das ist
   **falsch** — die DOCX/ODT-Persistenz der Verschachtelung ist bereits implementiert
   und round-trippt (Abschnitt 0). Eine `Tab: sinkListItem`-Bindung würde also
   **korrekt** persistieren. Die Übergabe ist damit eine reine **Zuständigkeits-/
   Scope**-Entscheidung (ein Bedienweg-Feature), **nicht** durch einen Persistenzbug
   erzwungen; die Nachbarfeatures sind sogar billiger als die Vorfassung annahm, weil
   Reader/Writer bereits fertig sind.
3. req Abschnitt 6 Testfall 6 erlaubt genau diesen Umgang → Dokumentationstest 5.2/9.

**Kompatibilitätsauflage an `liste-einruecken-tab-code.md`:** dessen Einrück-Weg muss
auf der in 4.6/4.7 eingeführten `NumberingRegistry` aufsetzen (je Top-Level-Liste
eine `numId`, verschachtelte erben) und die 9-Ebenen-`abstractNum` **erhalten** — die
in jenem Plan noch enthaltenen Alt-Aussagen („`numberingXml` hat nur `ilvl=0`") sind
überholt.

Ebenfalls **nicht** hier: die mehrstufige Lift-Semantik von „⇧ Liste"
(`liste-aufheben-code.md`) — dieser Plan liefert dort nur den `disabled`-Zustand
(4.3).

---

## 7. Bewusst nicht umgesetzt (Backlog-Einschränkungen dokumentieren)

Im Backlog (`specs/FEATURE-BACKLOG.md`) als bewusste Einschränkung markieren:
- **Eigenes Aufzählungszeichen** (`eigene-aufzaehlungszeichen`, Priorität 4): kein
  Schema-Attribut, kein UI.
- **Symbol je Ebene / ODT-Ebenenstile**: DOCX cycelt `['•','◦','▪']` über 9 Ebenen
  (`styleDefs.ts`), ODT definiert nur Ebene 1 (`styleRegistry.ts` Z. 100). Diese
  Asymmetrie ist eine bewusste Vereinfachung (req 2.2); weitergehende Ebenen gehören
  zu `mehrstufige-liste`/`liste-einruecken-tab`.
- **Gemischt verschachtelte Typen** (Bullet-in-Ordered): durch die flache
  `numId+ilvl`-Repräsentation nicht darstellbar (Abschnitt 4.6) — unverändert
  gegenüber heute.
- **Input-Rules** („- "/„* " → Liste): im Projekt existieren keine `InputRule`s
  (Grep bestätigt) — Nice-to-have, nicht gebaut.
- **Kontextmenü „Aufzählung"**: kein Kontextmenü im Projekt (projektweite Lücke).

---

## 8. Phasenplan

1. **Phase A — geteilter Editor-Code (Abnahme):** F1–F4 werden in
   `nummerierte-liste-code.md` §2.1/§2.2 + `Toolbar.tsx` **einmal** umgesetzt; hier
   die Bullet-Abnahme dazu: `commands.test.ts`-Fälle (5.1) und die Toolbar-Anpassung
   für „• Liste"/„⇧ Liste" (4.3). Risikoärmster Schritt, unabhängig von den Readern.
2. **Phase B — ODT-Reader-Robustheit:** 4.8 (F5) + Absicherung F6-Nicht-Bug, mit den
   ODT-`roundtrip`-Tests (5.1) und der Struktur-Erweiterung von
   `odt/external-fixtures.test.ts` (5.1).
3. **Phase C — DOCX-Writer/Reader:** **zuerst F9** (4.5/2.2 — Tabellenzellen-Import,
   T-F9-Test vor Fix rot; schwerster, datenverlustkritischster Befund dieses Plans,
   analog zur Hardest-first-Reihenfolge von `nummerierte-liste-code.md` §5), danach
   F8 (4.5), danach 4.6+4.7 (F7 `NumberingRegistry`, **verschachtelungserhaltend**) mit
   dem T-F7-Test (vor Fix rot) **und** dem Regressionswächter für den grünen
   Nested-Test.
4. **Phase D — E2E:** `tests/e2e/lists.spec.ts` (5.2), abhängig von A–C. Der
   Tabellenzellen-Rundreise-Fall in Testfall 11 setzt **F9 aus Phase C** voraus
   (siehe 5.2 Anmerkung) — ohne F9 bleibt dieser Teil des E2E-Specs zwangsläufig rot
   oder muss provisorisch übersprungen und offen als Lücke vermerkt werden, nicht
   stillschweigend weggelassen.
5. **Phase E — Doku:** Backlog-Einschränkungen (Abschnitt 7); Meldung an
   `nummerierte-liste-code.md`/`liste-einruecken-tab-code.md`, dass deren
   Alt-Aussagen zur DOCX-Verschachtelung überholt sind.

---

## 9. Offene Entscheidungen vor Umsetzungsbeginn

1. Übernimmt `nummerierte-liste-code.md` §2.1 den vollen Lauf-Split für Grenzfall 3.5
   (Absätze werden Liste, Überschrift ausgelassen), oder genügt für die erste Abnahme
   der `disabled`-Zustand? (Empfehlung: `disabled` zuerst, Lauf-Split als Folge.)
2. Wird F5 hier (bullet-eigen) oder in `nummerierte-liste-code.md` verortet? Der Bug
   betrifft beide Typen (nummeriert → fälschlich bullet). Empfehlung: **hier** fixen
   (req 5.6 rahmt es als Bullet-Sicht), im Nummerierungsplan referenzieren.
3. Bestätigung, dass F7 als **echter** Fix (nicht nur Doku) gewünscht ist — er ist
   geteilt mit `nummerierte-liste-code.md` §2.5 und muss **einmal**, in der
   verschachtelungserhaltenden Variante (4.6), umgesetzt werden.
4. `NumberingRegistry` lebt laut §2.5 in der **neuen** Datei
   `src/formats/docx/numberingRegistry.ts` mit Signatur `allocate(kind, start, mode)` /
   `serializeNumEntries()` — **nicht** in `styleDefs.ts` (4.7 korrigiert). Bestätigen,
   dass der Bullet-Weg diese Signatur mit `(kind, 1, 'restart')` mitnutzt und keine
   zweite bullet-eigene Variante entsteht.
5. **F9 (neu, Abschnitt 2.2/4.5) muss vor dem DoD-Abschluss dieses Features behoben
   sein, nicht nur des Nummerierungs-Features.** `aufzaehlungsliste-req.md` 2.7 und
   Rundreise 4.1.5 verlangen die DOCX-Rundreise „Aufzählungsliste in Tabellenzelle"
   ausdrücklich für **dieses** Backlog-Item; der Fix selbst ist mit
   `nummerierte-liste-code.md` §2.6 geteilt (**eine** Implementierung,
   `readParagraphsAndTables`), aber die **Abnahmepflicht** ist eigenständig. Bestätigen,
   dass dies vor Abschluss von Phase C/D explizit nachgehalten wird, statt implizit
   auf den Zeitplan des Geschwisterplans zu vertrauen.
