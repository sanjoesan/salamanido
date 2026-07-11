# Umsetzungsplan: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/absatzformat-dropdown-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (Symbol- **und** zeilengenau) gegen jede Behauptung der
Spezifikation und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil
orientiert an `specs/fett-code.md`. **Kein Punkt hier ist bereits umgesetzt — dies ist der
Plan, nicht der Vollzug.**

> **Diese Fassung ersetzt eine frühere Planfassung vollständig.** Die frühere Fassung war
> gegen einen älteren Code-/Anforderungsstand geschrieben und ist in mehreren tragenden
> Punkten überholt (siehe Abschnitt 0.1). Wer die alte Fassung kennt: die dortige
> Kernmaßnahme (Schema-Fix `list_item`) ist **bereits im Code** und entfällt; dafür kommt
> die in der alten Fassung **komplett fehlende** Ebenen-Begrenzung (Befund 6) neu hinzu.

---

## 0. Kurzfassung

Das Feature existiert real und funktioniert im Grundpfad (Ebene 1/2 erzeugen, auf
Standard zurück, rendern, DOCX/ODT exportieren) — und ist dort, anders als bei vielen
anderen „vorhanden"-Einträgen, **bereits end-to-end getestet** (`clipboard.spec.ts`,
`clipboard-roundtrip.spec.ts`). Die Ist-Stand-Tabelle der Anforderung (Abschnitt 0,
Befunde 1–13) ist gegen den tatsächlichen Code geprüft und **inhaltlich in allen 13
Zeilen korrekt** (Symbolnamen treffen; Zeilennummern der Anforderung stimmen im aktuellen
Baum, siehe Abschnitt 1). **Korrektur gegenüber einer früheren Fassung dieses Plans:**
Abschnitt 1 prüfte dort nur Befunde 1–10 und ließ die Befunde 11 (fehlende visuelle
Abstufung), 12 (`AllSelection`/Strg+A-No-Op) und 13 (Bild-`NodeSelection`-No-Op)
unverifiziert und ohne Fix-/Testzuordnung liegen — obwohl Abnahmekriterium 3 (Anforderung
Abschnitt 7) explizit verlangt, dass die beiden Sonderfälle 12/13 **eigenständig**
entschieden und getestet werden, und Abnahmekriterium 10 eine explizite Entscheidung zu
Befund 11 fordert. Beide Lücken sind unten geschlossen (3.1 bzw. 3.6/4.9).

Zu behebende Punkte, in Reihenfolge des Aufwands/Risikos (Kernarbeit zuerst):

1. **Befund 3 — Mehrblock-No-Op** (`setHeading`, `commands.ts:45`): Selektion über mehrere
   Blöcke → stiller No-Op. **Entscheidung: erweitern** (alle erfassten Blöcke umwandeln),
   siehe 3.1/4.1. Dieselbe Konstruktion (Zielsuche per `nodesBetween` statt
   `sameParent`/Eltern-Tiefe) löst als **Nebeneffekt, hier explizit gemacht und getestet**,
   auch Befund 12 (`AllSelection`/Strg+A) und Befund 13 (Bild-`NodeSelection`) — siehe 3.1.
2. **Befund 4 — Ausrichtungsverlust** (`commands.ts:43`, hartes `align: 'left'`):
   **Entscheidung: Ausrichtung erhalten** (Direktformatierung überlebt den Stilwechsel),
   siehe 3.2/4.1.
3. **Befund 6 — Ebenen > 6** (kein Clamp an irgendeiner Stelle; DOCX-Rundreise-Datenverlust):
   **Entscheidung: beim Import auf 1–6 klemmen** — verlustfreie, formatsymmetrische
   Rundreise statt stillem Absturz-auf-Standard (DOCX). Siehe 3.4/4.4/4.5. **In der
   früheren Planfassung vollständig fehlend.**
4. **Befund 7 — ODT `office:styles`** (`odt/reader.ts`, nur `office:automatic-styles`
   gelesen): benannte/vererbte Formatvorlagen werden ignoriert → Ausrichtungsverlust beim
   Import. **Entscheidung: beheben**, abgestimmt mit `fett-code.md` §4.8 (dieselbe
   Funktion), siehe 3.5/4.5.
5. **Befund 8 — DOCX `w:basedOn`** (`docx/reader.ts:69`, Regex/`outlineLvl` ohne
   Vererbung): geerbte Überschriften-Vorlagen ohne eigenes `outlineLvl` → als Standard
   importiert. **Entscheidung: beheben** (Kette auflösen), siehe 4.4.
6. **Befund 11 — fehlende visuelle Abstufung der Überschriften im Editor**
   (`index.css:29-37`, nur `margin`, keine `font-size`/`font-weight`): **Entscheidung:
   beheben** — gestaffelte `font-size` je Ebene, abgestimmt mit den Export-Schriftgrößen
   (`HEADING_FONT_SIZES`). **In der bisherigen Planfassung vollständig fehlend** (Abnahme
   10 war unadressiert) — siehe 3.6/4.9. **Muss mit `fett-code.md` §4.5 koordiniert werden**
   (dieselbe CSS-Regel `.ProseMirror h1…h6`).
7. **Deaktivierter Zustand** (Anforderung Abschnitt 1 Zeile 7 / Abnahme 8): Dropdown bei
   nicht anwendbarer Selektion sichtbar deaktivieren statt wirkungslosen Klick zulassen,
   siehe 4.2.
8. **Optional, kein Blocker**: Tastenkürzel `Mod-Alt-0…6` (Anforderung 1.3), siehe 4.8.

Zusätzlich **eigene Code-Befunde** über die Anforderung hinaus (Abschnitt 2):
Finding A/B (`CellSelection`-Semantik — betrifft, wie der `setHeading`-Fix **nicht**
gebaut werden darf), Finding C (Überschriften sind im Editor **nicht** per CSS fett —
korrigiert Anforderung 2.9), Finding F (`docx/writer.ts` verliert `<w:numPr>` bei
Überschrift-in-Liste) **und Finding F2** (`docx/reader.ts` streift die
Listenzugehörigkeit einer Überschrift beim **Reimport** wieder ab — der Writer-Fix
allein reicht für eine funktionierende Rundreise **nicht**, siehe 2.5a/4.6).

### 0.1 Was sich gegenüber der früheren Planfassung geändert hat (Pflichtlektüre für QA/Lead)

| Punkt | Frühere Fassung | Aktueller, verifizierter Stand |
|---|---|---|
| **Schema `list_item`** | „muss von `'paragraph block*'` auf `'block+'` geändert werden" (eigener Abschnitt, mehrere Findings, Umsetzungsschritt 1) | **Bereits im Code**: `schema.ts:147` ist `content: 'block+'` (mit erklärendem Kommentar zu realen verschachtelten Fixtures). Die Anforderung bestätigt das selbst in Befund 5 („Korrektur gegenüber früherer Fassung"). → Kein Fix mehr nötig; die damals darauf gestützten „Findings E/E2/E3" (Absturz, `wrapInList`-No-Op) sind **bereits gelöst**. Nur noch als **Regressions-Sperre** testabgesichert, siehe 2.4/5.5. |
| **Dropdown-Testabdeckung** | „kein einziger Test bedient das Dropdown" (§1 Zeile 9) | **Falsch/überholt.** `clipboard.spec.ts:174/179` und `clipboard-roundtrip.spec.ts:38/43/90/95` bedienen `getByLabel('Absatzformat').selectOption(...)`. Anforderung Befund 10 dokumentiert das. → Neue Tests bauen **darauf auf**, duplizieren nicht. |
| **Ebenen > 6 (Befund 6)** | **fehlt komplett** | Neu aufgenommen als Kern-Entscheidung (Clamp auf 1–6), siehe 3.4/4.4/4.5. |
| **Zeilennummern** | pre-„Ausschneiden"-Toolbar (z. B. `<select>` bei 116–131) | Aktualisiert auf den heutigen Baum (z. B. `<select>` bei **165–180**), siehe Abschnitt 1. |
| **Finding F Fix** | `numPr` mit hartem `w:ilvl w:val="0"`, Parameter „`listNumId`" | Korrigiert: der reale Parameter heißt `listContext` (`{numId, level}`); der Fix muss `listContext.level`/`listContext.numId` nutzen und `pStyle` **vor** `numPr` setzen, siehe 4.6. |
| **Finding F2 (neu)** | fehlte — Finding F wurde als reiner Writer-Fix behandelt | **Neu belegt:** `docx/reader.ts:476` streift den Listenmarker jeder Nicht-Paragraph-Zeile (also auch der Überschrift) beim Reimport ab → der Writer-Fix allein ergibt keine funktionierende Rundreise. Reader muss `'heading'` mit aufnehmen. Siehe 2.5a/4.6-Teil-2; Test 5.6(b). |
| **`WordEditor.tsx`-Zeilen** | (nicht adressiert) | Anforderung nennt `keymap` bei Z. 77–99 und `forceRender` bei Z. 123; im heutigen Baum: erster `keymap`-Block **85–107**, `dispatchTransaction` **125**, `forceRender` **131**. Korrigiert in §1 (Befund 2) und §4.8. |
| **Befund 11 (visuelle Abstufung) / Abnahme 10** | **Fehlte vollständig** — §1 verifizierte nur Befunde 1–10, §3/§4 hatten keine Entscheidung, §4.7 erklärte `index.css` explizit für „keine Änderung", §5/§6 erwähnten Test 19/Abnahme 10 der Anforderung nirgends. | **Nachgetragen:** Entscheidung 3.6 (gestaffelte `font-size`, koordiniert mit `fett-code.md` §4.5), Fix 4.9, Test 5.1(18), DoD-Zeile 10 in §6. |
| **Befund 12/13 (`AllSelection`/Bild-`NodeSelection`) / Abnahme 3** | **Fehlte vollständig** — kein einziges Vorkommen von „Befund 12", „Befund 13", „AllSelection" oder „NodeSelection" in der vorigen Fassung, obwohl die Anforderung diese als per Test verifizierte, eigenständig abzunehmende Sonderfälle führt (Abnahme 3 verlangt ausdrücklich, dass eine Mehrblock-Entscheidung, die diese beiden Fälle ausspart, **nicht** als vollständig gilt). | **Nachgetragen:** 3.1 macht explizit, dass die gewählte `nodesBetween`-Konstruktion (nicht `sameParent`) beide Fälle als Konsequenz mitlöst, mit dem jeweils erwarteten Verhalten; Tests 5.1(19a/19b), 5.2. |

---

## 1. Verifikation der Ist-Stand-Tabelle (`absatzformat-dropdown-req.md` Abschnitt 0)

Alle Zeilen gegen den heutigen Baum geprüft. „Symbol ✓ / Zeile ✓" heißt: Symbolname trifft
und die in der Anforderung genannte Zeile stimmt im aktuellen Code.

| Befund | Fundstelle (Anforderung) | Ergebnis der Prüfung |
|---|---|---|
| 1 | `Toolbar.tsx` `<select aria-label="Absatzformat">` (Z. 165–180) | **Symbol ✓ / Zeile ✓.** `<select>` Z. 165, `value={currentHeadingLevel()}` Z. 167, `onChange` → `setHeading(value === 'normal' ? null : Number(value))` Z. 168–171, Optionen Standard + 1–6 Z. 174–179. |
| 2 | `Toolbar.tsx` `currentHeadingLevel()` (Z. 114–122); Re-Render via `WordEditor.tsx` `dispatchTransaction`→`forceRender` (Anforderung nennt Z. 123) | **Symbol ✓ / Zeile korrigiert.** Tiefensuche `$from.node(depth)`, `'normal'` bei `paragraph`, sonst `String(node.attrs.level)`. Die Anforderung nennt für den `forceRender`-Aufruf Z. 123; im **heutigen** Baum sitzt `dispatchTransaction` bei `WordEditor.tsx:125` und `forceRender((n)=>n+1)` bei **:131** (Aufruf bei **jeder** Transaktion; ein zweiter Aufruf beim Mount, :136). Nur der Symbolname war maßgeblich (Anforderung Abschnitt 0-Hinweis) — Verhalten unverändert bestätigt. Für `level > 6` gibt es keine passende `<option>` (nur 1–6, `Toolbar.tsx:175`) → `<select>` zeigt nichts an. Bestätigt. |
| 3 | `setHeading` `if (!$from.sameParent($to)) return false` (`commands.ts:45`); Vergleich `setAlign` `nodesBetween` (`commands.ts:13-27`) | **Symbol ✓ / Zeile ✓.** No-Op bei Mehrblock. `setAlign` iteriert per `state.doc.nodesBetween(from, to, …)` (Z. 17) über alle Blöcke. Asymmetrie bestätigt. |
| 4 | `setHeading` `const attrs = level === null ? undefined : { level, align: 'left' }` (`commands.ts:43`) | **Symbol ✓ / Zeile ✓.** Bei Wechsel zu Überschrift hart `align: 'left'`; bei Wechsel zu Standard `attrs === undefined` → `setBlockType` nimmt Node-Default, der laut `alignAttr` (`schema.ts:4`) ebenfalls `'left'` ist. Verlust bestätigt. Zusatzprüfung: DOCX-/ODT-Reader **und** -Writer geben `align` in beiden Richtungen korrekt durch (`JC_TO_ALIGN`/`JC_BY_ALIGN`, `paragraphAligns`/`headingStyleName(level, align)`); der Verlust entsteht **ausschließlich** in dieser Editor-Zeile. |
| 5 | `list_item` `content: 'block+'` (`schema.ts:146-152`); `tableNodes({ cellContent: 'block+' })` (Z. 154) | **Symbol ✓ / Zeile ✓.** `list_item.content` ist `'block+'` (Z. 147). Überschrift an jeder Position im Listenpunkt erzeugbar; die frühere „erster vs. weiterer Absatz"-Inkonsistenz existiert nicht mehr. Offen bleibt nur die **Export**-Rundreise (Finding F, Abschnitt 4.6). |
| 6 | `heading.attrs.level` `{ default: 1, validate: 'number' }` (`schema.ts:29`); DOCX `outlineLvl+1` (`docx/reader.ts:72`); ODT `Number(outline-level) \|\| 1` (`odt/reader.ts:257`) | **Symbol ✓ / Zeile ✓.** Keine Begrenzung auf 1–6. `toDOM` (`schema.ts:35`) erzeugt `h${level}` → `h7`…`h10`. DOCX schreibt `Heading7` (undefiniert, `styleDefs.ts` kennt nur 1–6) → Reimport verliert Ebene; ODT behält sie über `text:outline-level`. Asymmetrie + DOCX-Verlust bestätigt. **Fix: Abschnitt 3.4/4.4/4.5.** |
| 7 | `odt/reader.ts` `parseAutomaticStyles` (Z. 37–78) nur mit `office:automatic-styles` aufgerufen (Content Z. 363–364; Chrome Z. 373–374); Heading-Align `styles.paragraphAligns.get(styleName) \|\| 'left'` (Z. 259) | **Symbol ✓ / Zeile ✓.** `office:styles` (benannte Stile in `styles.xml`) wird nirgends ausgewertet; `style:parent-style-name` nirgends aufgelöst. Ausrichtungsverlust bei realen LibreOffice-Dateien bestätigt. **Fix: 4.5, abgestimmt mit `fett-code.md` §4.8 (Lücke B, dieselbe Funktion).** |
| 8 | `docx/reader.ts` `parseStylesXml` (Z. 53–67) + `headingLevelForStyle` (Z. 69–76), `w:outlineLvl` **oder** Regex `^Heading\s?([1-6])$` | **Symbol ✓ / Zeile ✓.** `w:basedOn` wird nirgends gelesen → Vererbung ungelöst. Bestätigte (nicht nur theoretische) Lücke. **Fix: 4.4.** |
| 9 | Export `headingStylesXml` (`docx/styleDefs.ts:9-30`, `<w:b/>`+`<w:sz>`), `headingStyleDefs` (`odt/styleRegistry.ts:84-93`, `font-weight="bold"`+`font-size`) | **Symbol ✓ / Zeile ✓.** Beide je Ebene 1–6 fest Fett + Größe auf Stil-Ebene. Wechsel „Überschrift → Standard" entfernt die stilgebundene Fettung korrekt (Node-Typ + Stilreferenz wechseln). Keine Änderung nötig (siehe 4.7). |
| 10 | `clipboard.spec.ts:170–194`; `clipboard-roundtrip.spec.ts` R-1/R-2; `docx.spec.ts`/`odt.spec.ts` | **Bestätigt.** Grep nach `Absatzformat`/`selectOption`: Treffer in `clipboard.spec.ts:174,179` und `clipboard-roundtrip.spec.ts:38,43,90,95`. Grundpfad Ebene 1/2 (erzeugen/zurück/rendern/Export) **ist** end-to-end getestet. Neue Tests erweitern gezielt die Grenzfälle. |
| 11 | `src/index.css`, `.ProseMirror h1…h6` (Z. 29–37, **nur** `margin`); `.ProseMirror th` (Z. 58–60, `font-weight: 600`) | **Symbol ✓ / Zeile ✓.** Gegen die Datei geprüft: der `h1`–`h6`-Block (Z. 29–37) enthält ausschließlich `margin: 0 0 0.6em`, keine `font-size`/`font-weight`-Deklaration; die einzige `font-weight`-Regel im Stylesheet ist `.ProseMirror th { font-weight: 600 }` (Z. 60), nicht auf Überschriften anwendbar. Überschriften sind im Editor damit optisch praktisch identisch zu einem Standard-Absatz. **In der vorigen Planfassung nicht verifiziert, keine Entscheidung getroffen — nachgeholt in 3.6/4.9.** |
| 12 | `setHeading` (`commands.ts:44-47`), `AllSelection` (`prosemirror-state`) | **Symbol ✓, Verhalten bestätigt (durch Code-Lektüre, nicht durch erneuten Ad-hoc-`vitest`-Lauf).** Eine `AllSelection` hat `$from = doc.resolve(0)`, Tiefe 0, `$from.parent === doc`; `alignableTypes.has('doc')` ist `false` → `setHeading` liefert `false`, unabhängig von der Blockanzahl — auch im Ein-Absatz-Dokument. `currentHeadingLevel()` (`Toolbar.tsx:116-121`) durchläuft bei Tiefe 0 nur `doc`, findet weder `heading` noch `paragraph` → deterministisch `'normal'`. Beide Teilbefunde bestätigt. **In der vorigen Planfassung nicht verifiziert, kein Fix/Test zugeordnet — nachgeholt in 3.1/5.1(19a)/5.2.** |
| 13 | `setHeading` (`commands.ts:44-47`), `NodeSelection` auf `image` (`schema.ts:58-85`, `group: 'block'`, kein `content`) | **Symbol ✓, Verhalten bestätigt.** Eine `NodeSelection` auf einem atomaren `image`-Knoten hat `$from`/`$to` mit Elternknoten `doc` (bzw. `table_cell`) — nie `paragraph`/`heading`; `alignableTypes.has(...)` liefert `false` → `setHeading` liefert `false`, unabhängig von der gewählten Ebene, ohne Rückmeldung. **In der vorigen Planfassung nicht verifiziert, kein Fix/Test zugeordnet — nachgeholt in 3.1/5.1(19b)/5.2.** |

**Fazit Abschnitt 1:** Die Anforderung ist sachlich und zeilengenau zutreffend — inklusive
der Befunde 11–13, die eine frühere Fassung dieses Plans überhaupt nicht geprüft hatte
(siehe 0.1). Keine der 13 Fundstellen musste korrigiert werden.

---

## 2. Zusätzliche Code-Befunde über die Anforderung hinaus

### 2.1 Finding A — `CellSelection`-Semantik (bestimmt die Fix-Konstruktion)

`prosemirror-tables` modelliert eine `CellSelection` als **eine `SelectionRange` pro
Zelle** (`selection.ranges`). Der von `Selection` geerbte `selection.from`/`selection.to`
leitet sich aber nur aus `ranges[0]` ab und deckt daher **nur die erste (Anker-)Zelle**
ab. Konsequenz: Ein `state.doc.nodesBetween(selection.from, selection.to, …)` — exakt das
Muster von `setAlign` (`commands.ts:17`) — erreicht bei einer Mehrzellen-`CellSelection`
nur die erste Zelle, nicht alle sichtbar markierten. Der `setHeading`-Fix (4.1) muss
daher über `selection.ranges` iterieren, **nicht** naiv `setAlign` kopieren.

Die Anforderung nennt in Grenzfall 2.7 als Ursache des `CellSelection`-No-Op
„unterschiedliche Elternknoten je Zelle, `sameParent` ist `false`". Das ist unpräzise:
Bei einer `CellSelection` liegen `$from`/`$to` in **derselben** Kopf-Zelle, `sameParent`
ist `true`. Der heutige No-Op entsteht über die **nächste** Zeile, `commands.ts:47`
(`alignableTypes.has(parent.type.name)` — `parent` ist `table_cell`, nicht
`paragraph`/`heading`). Beobachtbares Verhalten (No-Op) deckt sich mit der Anforderung;
nur die Begründung ist zu korrigieren.

Dieselbe `parent.type.name`-Prüfung ist auch die gemeinsame Ursache der beiden in der
Anforderung als eigenständig verifiziert geführten Befunde 12 (`AllSelection`/Strg+A) und
13 (Bild-`NodeSelection`) — bei beiden ist der unmittelbare Elternknoten `doc` bzw.
`table_cell`, nie `paragraph`/`heading`, strukturell identisch zum `CellSelection`-Fall
hier. Die in 3.1 gewählte Fix-Konstruktion (Zielsuche über `nodesBetween` statt über
`parent`/`sameParent`) behebt daher alle drei Fälle mit demselben Mechanismus — siehe 3.1
für das im Einzelnen erwartete Verhalten je Fall.

### 2.2 Finding B — `setAlign` hat denselben `CellSelection`-Teilfehler (außerhalb Scope)

Weil `setAlign` (`commands.ts:13-27`) bereits produktiv `nodesBetween(selection.from,
selection.to, …)` nutzt, richtet der Ausrichtungs-Button bei einer Mehrzellen-
`CellSelection` heute nur die Kopf-Zelle aus; die übrigen markierten Zellen bleiben still
unverändert (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 „kein stiller
Fehlschlag"). Gehört fachlich zu `ausrichtung-*-req.md`, **nicht** zu dieser Datei — hier
nur als Präzedenzfall dokumentiert, **warum** `setHeading` nicht `setAlign` kopieren darf.
`setAlign` bleibt in diesem Plan unverändert (nur ein Cross-Reference-Kommentar, 4.1).

### 2.3 Finding C — Überschriften sind im Editor **nicht** per CSS fett

Die Anforderung übernimmt in 2.9 aus `fett-req.md` die Annahme, Überschriften erschienen
im Editor „bereits über CSS/Editor-Styling fett". Gegen `src/index.css` geprüft: Es gibt
eine Regel `.ProseMirror h1…h6` (Z. 29–37), sie setzt aber **nur** `margin`, **kein**
`font-weight`. Das einzige `font-weight: 600` (Z. 60) steht in `.ProseMirror th`
(Tabellenkopf), nicht bei Überschriften. Im Editor sind Überschriften also aktuell
**nicht** fett dargestellt — die in 2.9/Grenzfall 14 beschriebene optische Verwechslungs-
gefahr mit einem `strong`-Mark besteht **im Editor** so nicht (im **Export** dagegen
schon, dort trägt die Stilvorlage Fett, Befund 9). Kein Fix in dieser Datei; nur als
Korrektur der Anforderungsprämisse dokumentiert (deckt sich mit `fett-code.md`).

### 2.4 Finding D (früher „Finding E") — Schema-Fix bereits erledigt, nur noch zu sichern

Die frühere Planfassung wollte `list_item.content` von `'paragraph block*'` auf `'block+'`
ändern und stützte darauf drei Findings (u. a. einen reproduzierten Absturz beim
`splitListItem` auf eine Überschrift-als-einziges-Kind, und einen `wrapInList`-No-Op).
**Der Code ist bereits `'block+'`** (`schema.ts:147`); beide Fehlerbilder sind damit
**schon behoben**. Es bleibt nur die Pflicht, das nicht unbemerkt zu regredieren:
- **Regressions-Sperre 1 (E2E):** reale Fixture `listStyleId.odt` (Überschrift als
  einziges Kind eines Listenpunkts) importieren, Cursor ans Ende, **Enter**, weiter tippen
  → kein Absturz. Siehe 5.5.
- **Regressions-Sperre 2 (Unit):** `wrapInList` auf eine einzelne Überschrift liefert
  `true`. Siehe 5.2.

### 2.5 Finding F — `docx/writer.ts` verliert `<w:numPr>` bei Überschrift-in-Liste

`blockToDocx` (`docx/writer.ts:105-156`) bekommt für Kinder eines Listenpunkts einen
`listContext` (`{numId, level}`) durchgereicht (Listen-Fall Z. 125–140, `nextContext`
Z. 134–136). Der `'paragraph'`-Fall (Z. 112–118) wertet ihn aus und schreibt `<w:numPr>`
(Z. 114–117); der `'heading'`-Fall (Z. 119–124) **ignoriert** ihn. Folge: Eine
Überschrift innerhalb eines Listenpunkts (durch das `block+`-Schema an **jeder** Position
möglich, und über reale ODT-Fixtures `ListHeading.odt`/`ListHeading2.odt` real
vorkommend) verliert beim **DOCX**-Export ihre Listenzugehörigkeit. Der **ODT**-Writer hat
das Problem nicht (ODF bildet Listenmitgliedschaft rein strukturell durch Verschachtelung
ab; `blockToOdt`-Listen-Fall Z. 99–109 reicht jedes Kind unverändert weiter). **Fix: 4.6.**

### 2.5a Finding F2 (neu, in der bisherigen Planfassung fehlend) — `docx/reader.ts` streift die Listenzugehörigkeit einer Überschrift beim Reimport ab

**Der Writer-Fix (4.6) allein genügt nicht.** `readBodyChildren` (`docx/reader.ts:464-485`)
baut die Liste über `groupLists` aus einem `marker` je Block auf. Die entscheidende Zeile
`docx/reader.ts:476` lautet:

```ts
items.push({ marker: block.type === 'paragraph' ? marker : { numId: null, ilvl: 0 }, block })
```

Der von `listMarkerFor` gelesene `numPr`-Marker wird also **nur** an `'paragraph'`-Blöcke
gehängt; jeder Nicht-Paragraph — insbesondere ein `'heading'` — bekommt zwangsweise
`{ numId: null, ilvl: 0 }`, wird damit in `groupLists` (Z. 410–414) als
listenfremd behandelt, schließt die offene Liste und landet als **eigenständiger** Block
außerhalb. Konsequenz: Selbst **nach** dem Writer-Fix (4.6) — der `<w:numPr>` korrekt auf
die Überschrift schreibt — geht die Listenzugehörigkeit beim **Reimport** wieder verloren.
Der `<w:numPr>`-Nachweis auf XML-Ebene wäre grün, die **echte Rundreise** (Editor →
DOCX → Editor) aber nicht — genau der Typ „stiller Datenverlust“, den Abnahme 9 verbietet.
Der Grund für die bestehende Guard-Bedingung ist real: ein einzelnes `<w:p>` kann über
`paragraphToBlocks` **mehrere** Blöcke erzeugen (Bild-/`unsupported`-Runs, Z. 257–279), und
ein aus einem Absatz herausgelöster Bild-/Objektblock darf den Listenmarker **nicht** erben.
Ein `'heading'` entsteht aber ausschließlich im `!hasBlockRun`-Zweig (Z. 253) und ist dann
der **einzige** Block des Absatzes — für ihn ist die Markerübernahme sicher. **Fix: 4.6
(Teil 2, Reader).**

---

## 3. Design-Entscheidungen (beantwortet Abnahmekriterien 3–6)

### 3.1 Abschnitt 2.3 / Grenzfall 2 — Mehrblock-/`CellSelection`-Selektion

**Entscheidung: Erweitern — alle erfassten geeigneten Blöcke auf einmal umwandeln**
(nicht nur den ersten, nicht gar keinen), in **einer** akkumulierten Transaktion (ein
Undo-Schritt). Umsetzung **nicht** durch Kopieren von `setAlign` (Finding A/B), sondern:
- Zielsuche über `selection.ranges` (deckt `CellSelection` korrekt über alle Zellen ab);
  für Nicht-`CellSelection` genau ein Range (`selection.from`/`.to`).
- **Eine** Transaktion, auf die `tr.setBlockType(pos, pos+nodeSize, type, attrs)` mehrfach
  angewandt wird. Sicher, weil `paragraph ↔ heading` **größenerhaltend** ist (beide sind
  `inline*`-Textblöcke): vorab gesammelte `pos`-Werte bleiben über die ganze Schleife
  gültig, auch über mehrere Tabellenzellen hinweg.

Das ändert das erwartete Ergebnis für Grenzfall 2.7 / Testfall 5.8 von „No-Op" zu „alle
selektierten Zellen erhalten das Format" — genau die von der Anforderung selbst als
konsistente Fortführung von 2.3 vorgezeichnete Linie (PO-Empfehlung: an `setAlign`
angleichen).

**Explizite Konsequenz für Befund 12/13 (Abnahme 3 verlangt das ausdrücklich, siehe 0.1):**
Weil `collectHeadingTargets` über `state.doc.nodesBetween(from, to, …)` sucht — und
`nodesBetween` unabhängig von der Tiefe/dem unmittelbaren Elternknoten der
Selektionsgrenzen jeden im Bereich liegenden Nachfahrknoten besucht, nicht nur
Geschwister eines gemeinsamen Elternknotens —, sind beide strukturell verwandten
Sonderfälle aus der Anforderung durch **dieselbe** Konstruktion mitgelöst, nicht durch
einen zusätzlichen Fix:
- **Grenzfall 21/Befund 12 (`AllSelection`/Strg+A):** `selection.from = 0`,
  `selection.to = doc.content.size`. `nodesBetween(0, doc.content.size, …)` findet **jeden**
  `paragraph`/`heading`-Knoten im gesamten Dokument, unabhängig von dessen Tiefe —
  einschließlich solcher, die in Listenpunkten oder Tabellenzellen verschachtelt sind. Für
  das in der Anforderung geschilderte Ein-Absatz-Dokument liefert das genau **ein** Target
  → der Absatz wird zur gewählten Überschrift, `canSetHeading` ist `true`, das Dropdown
  zeigt korrekt den neuen Zustand (löst zugleich die in Befund 12 zusätzlich beschriebene
  Anzeige-Falschmeldung, weil `currentHeadingLevel` in 4.2 dieselbe Zielsuche nutzt). Bei
  einem größeren Dokument werden **konsequent alle** gefundenen Absätze/Überschriften
  überall im Dokument umgewandelt — bewusst in Kauf genommene, dokumentierte Konsequenz der
  „erweitern"-Entscheidung oben, nicht ein Sonderfall mit eigener Regel: Strg+A markiert
  strukturell das gesamte Dokument, und „alle erfassten Blöcke umwandeln" gilt hierfür
  genauso wie für eine Mehrblock-Selektion per Maus.
- **Grenzfall 22/Befund 13 (Bild-`NodeSelection`):** `selection.from`/`.to` umschließen
  exakt den atomaren `image`-Knoten (kein eigener Inhalt, `schema.ts:58-85`).
  `nodesBetween` besucht dabei nur den `image`-Knoten selbst (kein `paragraph`/`heading`
  darin, nichts davor/danach im Bereich) → **keine** Targets, `canSetHeading` ist `false`
  → das Dropdown wird deaktiviert (4.2) statt einen wirkungslosen Klick zuzulassen. Anders
  als bei Befund 12 ändert sich das Ergebnis gegenüber heute nicht („kein Format
  anwendbar" bleibt richtig), aber die Rückmeldung wird von stillem No-Op auf sichtbare
  Deaktivierung verbessert — das ist der eigentliche, in Abnahme 3/9 geforderte Fix.

Beide Fälle brauchen **keinen** eigenen Code-Pfad — nur einen eigenen, expliziten
Testnachweis (5.1 Testfälle 19a/19b, 5.2), weil sie in der Anforderung als per Test
verifiziert und laut Abnahme 3 als eigenständig abzunehmen geführt werden, nicht weil der
Fix selbst unterschiedlich wäre.

### 3.2 Abschnitt 2.5 / Grenzfall 8–9 — Erhalt der Ausrichtung

**Entscheidung: Ausrichtung bleibt erhalten** (Direktformatierung überlebt den
Stilwechsel, wie in Word/LibreOffice). Da beide Import-/Export-Pfade `align` bereits
korrekt durchreichen (Abschnitt 1, Befund 4), ist es ein reiner Editor-Command-Fix:
`setHeading` übernimmt je Block dessen **eigenes** vorhandenes `align`-Attribut statt hart
`'left'`. Damit ist auch der kumulative Verlust aus Grenzfall 9 gelöst. Bei
Mehrblock-Umwandlung behält jeder Block seine individuelle vorherige Ausrichtung (pro
Block aufgelöst, nicht global).

### 3.3 Abschnitt 2.6 / Grenzfälle 4–5 — Überschrift im Listenpunkt

**Entscheidung: Einheitlich erlauben** — und zwar ohne Schema-Änderung, weil
`list_item.content` bereits `'block+'` ist (Finding D/2.4). Reale Fixtures
(`ListHeading.odt`, `ListHeading2.odt`, `listStyleId.odt`) beweisen den Anwendungsfall;
ein nachträgliches Verbot würde bereits importierbare reale Inhalte unreparierbar machen.
Kehrseite: die DOCX-**Rundreise** muss die Listenzugehörigkeit einer solchen Überschrift
erhalten — und zwar auf **beiden** Seiten: Writer (`<w:numPr>` schreiben, Finding F) **und**
Reader (den Marker beim Reimport nicht abstreifen, Finding F2). Fix beider in 4.6. ODT
braucht dafür nichts (Listenmitgliedschaft strukturell; der ODT-Reader baut das list_item
aus den Kindern von `<text:list-item>` auf, `elementToBlocks`-Listen-Fall
`odt/reader.ts:286-299`, und behandelt `<text:h>` dort wie jedes andere Kind).

### 3.4 Befund 6 / Grenzfall 11 — Ebenen > 6 (neu; Abnahme 6)

**Entscheidung: Beim Import auf 1–6 klemmen** (`Math.min(level, 6)`, untere Grenze
`Math.max(1, …)`), an **beiden** Reader-Grenzen (DOCX `headingLevelForStyle`, ODT
`elementToBlocks`-Fall `'h'`). Begründung:
- Beseitigt den **stillen DOCX-Datenverlust** (Ebene 7 → aktuell Standard-Absatz) und
  macht die Rundreise **formatsymmetrisch** und **verlustfrei innerhalb des unterstützten
  Bereichs** (7–10 werden einheitlich zu 6, in DOCX **und** ODT gleich).
- Hält `toDOM` (`schema.ts:35`, `h${level}`) immer bei gültigem `h1`…`h6`; das Dropdown
  hat für jeden importierten Zustand eine passende Option (behebt Befund 2 für diesen Fall).
- Die App unterstützt bewusst nur Ebene 1–6 (Toolbar, Export-Stilvorlagen `styleDefs.ts`/
  `styleRegistry.ts` definieren nur 1–6). Der Editor selbst erzeugt ohnehin nie > 6.

Trade-off, ausdrücklich dokumentiert: die Unterscheidung „Ebene 7/8/9/10" geht gegenüber
dem Originaldokument verloren (auf 6 normalisiert). Das ist der bewusst gewählte Preis für
eine verlustfreie, formatunabhängige Rundreise im unterstützten Bereich und für „kein
stiller Fehlschlag". Alternative (Ebenen > 6 durchreichen + „nur 1–6 unterstützt"
dokumentieren) wird **verworfen**, weil sie den DOCX-Datenverlust bestehen ließe.

Kein Schema-Zwang nötig: `heading.attrs.level` bleibt `{ default: 1, validate: 'number' }`
(ein klemmendes `validate` ist in ProseMirror nicht ausdrückbar — es würde werfen statt
normalisieren; Klemmung gehört an die Import-Grenze). Optionale Härtung: `toDOM` und
`HEADING_STYLE_ID` defensiv mit `Math.min(level, 6)` (4.3/4.6), damit ein etwaiger
Fremd-Pfad nie ungültiges HTML/undefinierte Stil-IDs erzeugt.

### 3.5 Befund 7 / Grenzfall 16 — ODT `office:styles` (benannte/vererbte Vorlagen)

**Entscheidung: Beheben** — `office:styles` zusätzlich zu `office:automatic-styles`
auswerten, inkl. `style:parent-style-name`-Kette. **Wichtig:** Exakt dieselbe Funktion
(`odt/reader.ts` `parseAutomaticStyles`, Z. 37–78) ist bereits Gegenstand von
`fett-code.md` §4.8 (Lücke B, dort für die `text`-Familie/Marks). Diese Anforderung
braucht dieselbe Kaskade zusätzlich für die `paragraph`-Familie (Ausrichtung). **Beide
Änderungen müssen in einer gemeinsamen Umsetzung landen**, nicht nacheinander unabhängig,
sonst überschreibt eine die andere. Details 4.5.

### 3.6 Abschnitt 2.11 / Grenzfall 20 / Befund 11 — sichtbare Darstellung der Überschriften im Editor (neu; Abnahme 10)

**Bisher unentschieden** (siehe 0.1) — die vorige Planfassung verifizierte Befund 11 in §1
nicht einmal und erklärte `index.css` in §4.7 pauschal für „keine Änderung", ohne
Abnahmekriterium 10 der Anforderung zu adressieren. Abnahme 10 verlangt ausdrücklich
entweder eine sichtbar gestaffelte Darstellung **oder** eine bewusst dokumentierte
Einschränkung — „stillschweigend belassen" ist explizit ausgeschlossen.

**Entscheidung: Beheben, per gestaffelter `font-size`.** `.ProseMirror h1`…`h6`
(`index.css:29-37`) erhält je Ebene eine eigene `font-size`, exakt aus den bereits für den
**Export** genutzten Werten übernommen (`HEADING_FONT_SIZES` — `docx/styleDefs.ts:3`:
`{1:48,2:40,3:36,4:32,5:28,6:26}` Halbpunkte; `odt/styleRegistry.ts:77`:
`{1:24,2:20,3:18,4:16,5:14,6:13}` Punkte — beide Tabellen sind bereits identisch, `48`
Halbpunkte = `24`pt). CSS kennt `pt` als reguläre absolute Längeneinheit, daher lässt sich
derselbe Zahlenwert **unverändert** übernehmen (`h1 { font-size: 24pt }` usw.) — kein
Umrechnungsschritt, kein Rundungsrisiko, und exakt der von der Anforderung geforderte
Gleichlauf „Editor-Anzeige und Export laufen nicht optisch auseinander" (2.11,
PO-Empfehlung). Details und Diff: 4.9.

**Bewusst ausgeklammert: `font-weight` (Fettung).** Die Anforderung selbst trennt in 2.11
die geforderte **Unterscheidbarkeit** (mindestens Schriftgröße, Pflicht) von der Frage, ob
Überschriften zusätzlich fett dargestellt werden sollen (das berührt `fett-*`, nicht
diese Datei). **Kritischer Befund bei der Prüfung dieses Plans:** `fett-code.md` §4.5
plant bereits einen eigenen Fix für **dieselbe** CSS-Regel `.ProseMirror h1…h6` — dort
soll `font-weight: 700` ergänzt werden (Defekt D, Überschriften im Editor nicht fett).
Beide Änderungen betreffen exakt denselben Selektor-Block in derselben Datei und **müssen
als eine gemeinsame Bearbeitung landen** (identisches Koordinationsmuster wie 3.5/`odt/
reader.ts`) — sonst überschreibt, wer zuletzt commitet, den anderen Fix ersatzlos. Der
kombinierte Block ist in 4.9 bereits so ausgeschrieben, dass er beide Anforderungen in
einem Schritt erfüllt; wird `fett-code.md` §4.5 unabhängig zuerst umgesetzt, muss diese
Datei dessen `font-weight: 700`-Zeile **erhalten**, nicht überschreiben, wenn `font-size`
ergänzt wird (und umgekehrt).

Kein Eingriff in `docx/styleDefs.ts`/`odt/styleRegistry.ts` nötig — beide `HEADING_FONT_
SIZES`-Tabellen sind bereits die Quelle der Wahrheit, nur `index.css` zieht bisher nicht
nach.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert) — Kernarbeit

Import ergänzen (Z. 3, `CellSelection` zusätzlich zum bereits importierten `isInTable`):

```ts
import { isInTable, CellSelection } from 'prosemirror-tables'
```

`setHeading` (aktuell Z. 40–55) durch eine geteilte Zielsuche plus drei Exporte ersetzen:

```ts
interface HeadingTarget {
  pos: number
  node: Parameters<typeof wordSchema.nodes.paragraph.create>[1] extends never ? never : import('prosemirror-model').Node
}

/**
 * Sammelt jeden von der Selektion erfassten paragraph/heading-Block, der für einen
 * Standard<->Überschrift-Wechsel geeignet ist. Eine CellSelection braucht einen eigenen
 * Zweig: selection.from/.to (und damit ein naives nodesBetween(selection.from,
 * selection.to, ...) wie in setAlign) deckt nur die Kopf-Zelle ab, nie das ganze
 * markierte Rechteck (prosemirror-tables: eine SelectionRange pro Zelle in
 * selection.ranges — siehe absatzformat-dropdown-code.md §2.1, Finding A/B). Listenpunkte
 * werden bewusst NICHT ausgeschlossen (list_item ist bereits 'block+', §3.3).
 *
 * AllSelection/NodeSelection (Strg+A bzw. ein markiertes Bild) brauchen dagegen KEINEN
 * eigenen Zweig: nodesBetween(selection.from, selection.to, ...) im else-Zweig unten
 * findet für eine AllSelection ohnehin jeden paragraph/heading im ganzen Dokument (siehe
 * absatzformat-dropdown-code.md §3.1, Befund 12) und für eine bild-NodeSelection
 * korrekt keinen (Befund 13) — ein zusätzlicher instanceof-Check dafür wäre unnötig.
 */
function collectHeadingTargets(state: EditorState): HeadingTarget[] {
  const { selection } = state
  const targets: HeadingTarget[] = []
  const visit = (from: number, to: number) => {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) targets.push({ pos, node })
    })
  }
  if (selection instanceof CellSelection) {
    for (const range of selection.ranges) visit(range.$from.pos, range.$to.pos)
  } else {
    visit(selection.from, selection.to)
  }
  return targets
}

/** Gibt es für die aktuelle Selektion überhaupt ein Ziel? Treibt den disabled-Zustand
 *  des Dropdowns (FEATURE-SPEC-DOCX-ODT.md §20, „kein stiller Fehlschlag"). */
export function canSetHeading(state: EditorState): boolean {
  return collectHeadingTargets(state).length > 0
}

/** Auch für Toolbar.tsx (Anzeige, §4.2) — nutzt exakt dieselbe Zielsuche, damit Anzeige
 *  und tatsächliches Verhalten nie auseinanderlaufen. */
export function headingTargetsInSelection(state: EditorState): HeadingTarget[] {
  return collectHeadingTargets(state)
}

export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const targets = collectHeadingTargets(state)
    if (targets.length === 0) return false
    if (dispatch) {
      let tr = state.tr
      for (const { pos, node } of targets) {
        // Jeder Block behält seine eigene bisherige Ausrichtung (Direktformatierung
        // überlebt den Typwechsel, §3.2). Pro Block aufgelöst, nicht global.
        const attrs = level === null ? { align: node.attrs.align } : { level, align: node.attrs.align }
        tr = tr.setBlockType(pos, pos + node.nodeSize, type, attrs)
      }
      dispatch(tr)
    }
    return true
  }
}
```

Hinweise:
- `HeadingTarget.node` ist ein `prosemirror-model`-`Node`; die obige Typkonstruktion nur
  zur Illustration — in der Umsetzung schlicht `import type { Node as PMNode } from
  'prosemirror-model'` und `node: PMNode` verwenden.
- **Eine** Transaktion, mehrfach `setBlockType`, **einmal** `dispatch` — garantiert einen
  Undo-Schritt und kein Rennen mit zwischenzeitlich veraltetem State (anders als `setAlign`,
  das je Knoten neu vom Ursprungs-`state.tr` dispatcht; das funktioniert dort nur, weil
  `setNodeAttribute` größenerhaltend ist — für `setBlockType` wäre Mehrfach-Dispatch
  fragil).
- Direkter Ebenenwechsel (z. B. 2 → 5) fällt automatisch mit ab: `setBlockType` auf einen
  bestehenden `heading` mit neuen `attrs` genügt, kein Zwischenschritt über Standard.

`setAlign` (Z. 13–27) und `isAlignActive` (Z. 29–38) bleiben **unverändert**; nur ein
Cross-Reference-Kommentar direkt über `setAlign`:

```ts
// TODO(ausrichtung-*-req.md): setAlign erreicht bei einer CellSelection über mehrere
// Zellen nur die Kopf-Zelle (selection.from/.to = ranges[0]). Siehe
// absatzformat-dropdown-code.md §2.1/§2.2 (Finding A/B). Bewusst nicht in dieser Datei
// gefixt; setHeading (oben) umgeht das über selection.ranges.
```

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

Import (Z. 6–20) um `canSetHeading` und `headingTargetsInSelection` ergänzen.

`currentHeadingLevel()` (Z. 114–122) auf dieselbe Zielsuche umstellen — Anzeige und
Verhalten können nie divergieren; behebt nebenbei, dass die alte Tiefensuche für eine
`CellSelection` (deren `$from` innerhalb der `table_cell`-Grenze liegt) immer „Standard"
zeigte:

```tsx
function currentHeadingLevel(): string {
  const target = headingTargetsInSelection(view.state)[0]
  if (!target) return 'normal'
  return target.node.type.name === 'heading' ? String(target.node.attrs.level) : 'normal'
}
```

Bei gemischter Selektion (Grenzfall 3) zeigt das Dropdown den Typ des **ersten** erfassten
Blocks — bewusste, dokumentierte Tie-Break-Regel (Abnahme 2, „definiertes, nicht-
widersprüchliches Verhalten"), kein künstlicher „gemischt"-Eintrag.

`<select>` (Z. 165–180) erhält `disabled` + erklärendes `title` (Anforderung 1 Zeile 7,
Abnahme 8):

```tsx
<select
  aria-label="Absatzformat"
  value={currentHeadingLevel()}
  disabled={!canSetHeading(view.state)}
  title={canSetHeading(view.state) ? undefined : 'Für die aktuelle Auswahl nicht verfügbar'}
  onChange={(e) => {
    const value = e.target.value
    run(view, setHeading(value === 'normal' ? null : Number(value)))
  }}
  className="text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {/* Optionen unverändert Z. 174–179 */}
</select>
```

Damit ist der No-Op durch eine sichtbare Deaktivierung ersetzt; der in Anforderung 2.3
beschriebene „falscher Wert bleibt bis zur nächsten Transaktion stehen"-Effekt entfällt,
weil bei aktivierter Selektion der Klick jetzt tatsächlich wirkt (Mehrblock-Umwandlung)
und bei nicht anwendbarer Selektion das Element gar nicht bedienbar ist.

### 4.3 `src/formats/shared/schema.ts` (nur optionale Härtung)

**Keine `list_item`-Änderung** — bereits `'block+'` (Z. 147, siehe 2.4). Optionale
Defense-in-Depth für Befund 6 (nach dem Import-Clamp aus 4.4/4.5 theoretisch nicht mehr
nötig, aber billig):

```diff
   heading: {
     ...
     toDOM(node) {
-      return [`h${node.attrs.level}`, { style: `text-align: ${node.attrs.align}` }, 0]
+      const level = Math.min(Math.max(1, Number(node.attrs.level) || 1), 6)
+      return [`h${level}`, { style: `text-align: ${node.attrs.align}` }, 0]
     },
   },
```

### 4.4 `src/formats/docx/reader.ts` (geändert) — Befund 8 (`w:basedOn`) + Befund 6 (Clamp)

`HeadingInfo` (Z. 49–51) um `basedOnByStyleId` erweitern; `parseStylesXml` (Z. 53–67)
zusätzlich `w:basedOn` einsammeln; `headingLevelForStyle` (Z. 69–76) die Vererbungskette
auflösen und das Ergebnis auf 1–6 klemmen:

```ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  basedOnByStyleId: Map<string, string>
}

function parseStylesXml(stylesDoc: Document | null): HeadingInfo {
  const outlineLvlByStyleId = new Map<string, number>()
  const basedOnByStyleId = new Map<string, string>()
  if (!stylesDoc) return { outlineLvlByStyleId, basedOnByStyleId }
  for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
    const styleId = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
    if (!styleId) continue
    const pPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'pPr')
    const outlineLvl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'outlineLvl')
    if (outlineLvl) {
      const val = Number(outlineLvl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '0')
      outlineLvlByStyleId.set(styleId, val)
    }
    const basedOn = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'basedOn')
    const basedOnVal = basedOn?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (basedOnVal) basedOnByStyleId.set(styleId, basedOnVal)
  }
  return { outlineLvlByStyleId, basedOnByStyleId }
}

// Gleiches Schutzmuster wie MAX_TABLE_NESTING_DEPTH weiter unten — eine fehlerhafte oder
// zyklische w:basedOn-Kette darf den Import nicht aufhängen/abstürzen lassen.
const MAX_STYLE_INHERITANCE_DEPTH = 25

function headingLevelForStyle(styleId: string | null, info: HeadingInfo): number | null {
  if (!styleId) return null
  const seen = new Set<string>()
  let current: string | null = styleId
  for (let depth = 0; current && depth < MAX_STYLE_INHERITANCE_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const fromStyles = info.outlineLvlByStyleId.get(current)
    // Befund 6: auf 1–6 klemmen, mit unterer Grenze (symmetrisch zum ODT-Clamp 4.5, der
    // Math.max(1, …) nutzt) — ein fehlerhaftes negatives w:outlineLvl darf kein h0/h-1 ergeben.
    if (fromStyles !== undefined) return Math.max(1, Math.min(fromStyles + 1, 6))
    const match = /^Heading\s?([1-9])$/i.exec(current)               // 1-9 statt 1-6, dann klemmen,
    if (match) return Math.max(1, Math.min(Number(match[1]), 6))    // damit „Heading7..9" erkannt statt verworfen wird
    current = info.basedOnByStyleId.get(current) ?? null
  }
  return null
}
```

Wirkung: (a) Grenzfall 16 — geerbte „Heading N"-Vorlage ohne eigenes `outlineLvl` wird
korrekt erkannt statt als Standard importiert; (b) Befund 6 — eine Ebene 7 (`outlineLvl`
6 → 7, oder Style-ID „Heading7") wird zu 6 geklemmt statt (bei undefinierter Stilvorlage)
beim Reimport ganz verloren zu gehen. Der Editor/Writer erzeugt danach `Heading6`
(definiert) → verlustfreie Rundreise auf Ebene 6.

### 4.5 `src/formats/odt/reader.ts` (geändert) — Befund 7 (`office:styles`) + Befund 6 (Clamp), abgestimmt mit `fett-code.md` §4.8

**(a) Clamp (isoliert, unabhängig von der Kaskade):** `elementToBlocks`-Fall `'h'`
(Z. 256–262), Zeile 257:

```diff
-    const level = Number(el.getAttributeNS(ODF_NAMESPACES.text, 'outline-level') ?? '1') || 1
+    const level = Math.min(Math.max(1, Number(el.getAttributeNS(ODF_NAMESPACES.text, 'outline-level') ?? '1') || 1), 6)
```

Als Kontrast zu DOCX (4.4) belegt das Grenzfall/Testfall 4.2.6: ODT behielt die Ebene
bisher (verlor sie nicht), wird jetzt aber **ebenfalls** auf 6 normalisiert → beide
Formate verhalten sich identisch.

**(b) `office:styles` + `parent-style-name` (gemeinsam mit `fett-code.md` §4.8):**
`parseAutomaticStyles` (Z. 37–78) zu einer Kaskade erweitern, die **beide** Familien und
**beide** Container bedient. `ParsedStyles` (Z. 23–27) bekommt ein Feld
`parentByName: Map<string, string>`. Skizze der geteilten Funktion (die `text`-Familie
liefert `fett-code.md`, die `paragraph`-Familie diese Datei):

```ts
function collectStyleFamilies(
  containerEl: Element | null,
  textStyles: Map<string, RunStyle>,
  paragraphAligns: Map<string, string>,
  listKinds: Map<string, 'bullet' | 'ordered'>,
  parentByName: Map<string, string>,
): void {
  if (!containerEl) return
  for (const styleEl of childElements(containerEl, ODF_NAMESPACES.style, 'style')) {
    const name = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    const family = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'family')
    if (!name) continue
    const parent = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'parent-style-name')
    if (parent && !parentByName.has(name)) parentByName.set(name, parent)
    if (family === 'text' && !textStyles.has(name)) {
      /* ... bestehende family==='text'-Logik (fo:font-weight, ..., fett-code.md §4.8) ... */
    } else if (family === 'paragraph' && !paragraphAligns.has(name)) {
      const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
      const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
      if (align) paragraphAligns.set(name, align)
    }
  }
  // list-style-Verarbeitung (Z. 70–75) unverändert übernehmen.
}

const MAX_STYLE_PARENT_DEPTH = 25

function resolveParagraphAlign(
  styleName: string,
  paragraphAligns: Map<string, string>,
  parentByName: Map<string, string>,
): string | undefined {
  const seen = new Set<string>()
  let current: string | undefined = styleName
  for (let depth = 0; current && depth < MAX_STYLE_PARENT_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const direct = paragraphAligns.get(current)
    if (direct) return direct
    current = parentByName.get(current)
  }
  return undefined
}
```

`readOdt` (Z. 357–409) sammelt Stile mit klarer Vorrangordnung: **automatische zuerst**
(Namensvorrang), dann `office:styles` aus `content.xml` (falls vorhanden) und `styles.xml`.
Der `office:styles`-Container aus `styles.xml` (`stylesDoc`) wird dort bereits geladen
(Z. 372), aber bisher nur dessen `automatic-styles` (Z. 373) genutzt:

```ts
const textStyles = new Map<string, RunStyle>()
const paragraphAligns = new Map<string, string>()
const listKinds = new Map<string, 'bullet' | 'ordered'>()
const parentByName = new Map<string, string>()
collectStyleFamilies(contentAutomaticStyles, textStyles, paragraphAligns, listKinds, parentByName)
// stylesAutomaticStyles (Chrome) analog ...
const contentOfficeStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
const stylesOfficeStyles = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
collectStyleFamilies(contentOfficeStyles, textStyles, paragraphAligns, listKinds, parentByName)
collectStyleFamilies(stylesOfficeStyles, textStyles, paragraphAligns, listKinds, parentByName)
```

`paragraphToBlocks` (Z. 175–213, Align Z. 178) und `elementToBlocks`-Fall `'h'`
(Z. 256–262, Align Z. 259) lösen die Ausrichtung nun über die Kette auf:

```diff
- const align = (styleName && styles.paragraphAligns.get(styleName)) || 'left'
+ const align = (styleName && resolveParagraphAlign(styleName, styles.paragraphAligns, styles.parentByName)) || 'left'
```

Wirkung: Eine Überschrift, deren Ausrichtung über eine gemeinsame/benannte Vorlage in
`office:styles` (ggf. per `parent-style-name` vererbt) kommt, verliert sie beim Import
nicht mehr still (Befund 7, Grenzfall 16). `MyHeading1.odt` (Stil `Heading2` nur in
`office:styles`) belegt die **strukturelle** Seite; für den quantitativen
Ausrichtungs-Nachweis dient eine synthetische Fixture (5.3), da `MyHeading1.odt`s
`Heading2` selbst kein `fo:text-align` deklariert.

### 4.6 `src/formats/docx/writer.ts` + `src/formats/docx/reader.ts` (geändert) — Finding F **und** F2

**Beide Änderungen sind zwingend gemeinsam nötig** — der Writer-Fix allein erzeugt nur ein
`<w:numPr>` auf XML-Ebene, das der Reader danach wieder wegwirft (Finding F2/2.5a). Erst
zusammen entsteht eine funktionierende Rundreise.

**Teil 1 — Writer (`docx/writer.ts`, Finding F):** `blockToDocx`-Fall `'heading'`
(Z. 119–124) den durchgereichten `listContext` genauso auswerten wie der `'paragraph'`-Fall
(Z. 114–117), `pStyle` **vor** `numPr` (OOXML-`pPr`-Reihenfolge):

```diff
     case 'heading': {
       const level = Number(node.attrs?.level ?? 1)
       const align = (node.attrs?.align as string) ?? 'left'
-      const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
-      return `<w:p>${paragraphPropsXml(align, styleTag)}${inlineToRuns(node.content)}</w:p>`
+      const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(Math.min(level, 6))}"/>`
+      const numPr = listContext
+        ? `<w:numPr><w:ilvl w:val="${listContext.level}"/><w:numId w:val="${listContext.numId}"/></w:numPr>`
+        : ''
+      return `<w:p>${paragraphPropsXml(align, styleTag + numPr)}${inlineToRuns(node.content)}</w:p>`
     }
```

(`Math.min(level, 6)` ist reine Härtung — nach dem Import-Clamp aus 4.4/4.5 ist `level`
bereits ≤ 6.) `odt/writer.ts` bleibt unverändert (Finding F betrifft nur DOCX, siehe 2.5).

**Teil 2 — Reader (`docx/reader.ts`, Finding F2):** In `readBodyChildren`
(`docx/reader.ts:464-485`) die Markerbedingung `docx/reader.ts:476` so erweitern, dass auch
ein `'heading'` seinen Listenmarker behält — Bild-/`unsupported`-Blöcke aber **weiterhin
nicht** (deren Guard ist der eigentliche Zweck der Zeile, siehe 2.5a):

```diff
       for (const block of paragraphToBlocks(child, headingInfo, imageRels)) {
-        items.push({ marker: block.type === 'paragraph' ? marker : { numId: null, ilvl: 0 }, block })
+        // Ein 'heading' aus paragraphToBlocks entsteht nur im !hasBlockRun-Zweig und ist
+        // dann der einzige Block des <w:p> — er darf, wie ein 'paragraph', den numPr-Marker
+        // seines Absatzes behalten (Finding F2). Nur aus einem Absatz herausgelöste
+        // image/unsupported_block-Blöcke dürfen ihn NICHT erben.
+        const carriesMarker = block.type === 'paragraph' || block.type === 'heading'
+        items.push({ marker: carriesMarker ? marker : { numId: null, ilvl: 0 }, block })
       }
```

Nachweis, dass beide Teile zusammenwirken: Rundreise-Test 5.6 wird auf **Reimport** verschärft
(nicht nur XML-Assertion): Editor-Dokument mit Überschrift innerhalb eines Listenpunkts →
`writeDocx` → `readDocx` → die Überschrift liegt wieder **innerhalb** eines
`bullet_list`/`ordered_list` (nicht als Top-Level-Block daneben). Dieser Test schlägt mit
**nur** Teil 1 fehl und wird erst mit Teil 2 grün. (Bekannte, inhärente DOCX-Grenze, die er
**nicht** prüft: ein ODT-`list_item` mit mehreren Kindern — z. B. `[paragraph, heading]` aus
`ListHeading.odt` — wird beim DOCX-Export in getrennte flache Listenzeilen zerlegt, weil
OOXML pro `<w:p>` genau eine Listenzeile kennt; entscheidend ist nur, dass die Überschrift
**überhaupt** Listenmitglied bleibt.)

### 4.7 Keine Änderung (verifiziert, zur Vollständigkeit)

- `src/formats/docx/styleDefs.ts` (`HEADING_FONT_SIZES` Z. 3 nur 1–6; `headingStylesXml`
  Z. 9–30) und `src/formats/odt/styleRegistry.ts` (`HEADING_FONT_SIZES` Z. 77 nur 1–6;
  `headingStyleDefs` Z. 84–93) — korrekt und **konsistent mit der Clamp-Entscheidung 3.4**
  (nur 1–6 definiert). Die stilgebundene Fettung ist laut `fett-code.md` bewusst
  akzeptiert.
- `src/formats/odt/writer.ts` — korrekt (Listenmitgliedschaft strukturell, kein `numId`).

**Korrektur gegenüber der vorigen Planfassung:** `src/index.css` stand hier bisher fälschlich
als „keine Änderung" — das war nur für die **Fettung** zutreffend (Finding C ist eine reine
Prämissenkorrektur; *ob* Überschriften zusätzlich fett dargestellt werden, gehört zu
`fett-*`). Die **Schriftgrößen-Abstufung** (Befund 11/Abnahme 10) ist dagegen Gegenstand
dieser Anforderung selbst und **erfordert** eine Änderung — siehe 4.9.

### 4.8 `src/formats/shared/editor/WordEditor.tsx` (optional, kein Blocker)

Anforderung 1 Zeile 3: Tastenkürzel fehlen, **kein** Blocker, aber nicht stillschweigend
zu übergehen. Empfehlung wegen minimalen Aufwands ergänzen — in den bestehenden ersten
`keymap({...})`-Block (`WordEditor.tsx:85-107`; die Anforderung nennt veraltet Z. 77–99),
`setHeading` in den `./commands`-Import (`WordEditor.tsx:12`,
`import { cutSelection, insertHardBreak } from './commands'`) aufnehmen:

```ts
'Mod-Alt-0': setHeading(null),
'Mod-Alt-1': setHeading(1),
// ... bis
'Mod-Alt-6': setHeading(6),
```

Falls **nicht** umgesetzt: als bewusst fehlende Komfortfunktion im Backlog vermerken,
nicht stillschweigend übergehen.

### 4.9 `src/index.css` (geändert) — Befund 11 / Abnahme 10, koordiniert mit `fett-code.md` §4.5

Nach dem `h1`–`h6`-Margin-Block (Z. 29–37) ergänzen. **Dieser Block muss sowohl die
`font-size`-Staffelung dieser Anforderung als auch das `font-weight: 700` aus
`fett-code.md` §4.5 enthalten** (3.6) — unabhängig davon, welcher der beiden Fixes zuerst
umgesetzt wird, darf die jeweils andere Deklaration beim Zusammenführen nicht verloren
gehen:

```css
.ProseMirror h1 { font-size: 24pt; }
.ProseMirror h2 { font-size: 20pt; }
.ProseMirror h3 { font-size: 18pt; }
.ProseMirror h4 { font-size: 16pt; }
.ProseMirror h5 { font-size: 14pt; }
.ProseMirror h6 { font-size: 13pt; }

.ProseMirror h1,
.ProseMirror h2,
.ProseMirror h3,
.ProseMirror h4,
.ProseMirror h5,
.ProseMirror h6 {
  font-weight: 700; /* fett-code.md §4.5, Defekt D — hier nur mitgeführt, nicht neu entschieden */
}
```

Werte 1:1 aus `HEADING_FONT_SIZES` übernommen (`docx/styleDefs.ts:3` Halbpunkte ÷ 2,
`odt/styleRegistry.ts:77` Punkte — beide bereits identisch, siehe 3.6); `pt` ist eine
gültige CSS-Längeneinheit, daher keine Umrechnung nötig. Wirkung: Der Formatwechsel im
Dropdown wird im Editor jetzt **sichtbar** (Testfall 5.1/18, `getComputedStyle`-Vergleich
gegen einen benachbarten `<p>`), nicht mehr nur am exportierten Ergebnis ablesbar — behebt
Befund 11 und erfüllt Abnahme 10 durch tatsächliche Abstufung (nicht durch dokumentierte
Einschränkung).

Keine Änderung an `docx/styleDefs.ts`/`odt/styleRegistry.ts` — deren `HEADING_FONT_SIZES`
sind bereits die Quelle der hier übernommenen Werte.

---

## 5. Testplan (Zuordnung zu Anforderung Abschnitt 5)

### 5.1 Neu: `tests/e2e/absatzformat.spec.ts`

Durchgehend `page.getByLabel('Absatzformat')` + `selectOption`, echter `filechooser`-
Upload/`waitForEvent('download')` — **baut auf** der bestehenden Abdeckung (Befund 10) auf,
statt sie zu duplizieren; Fokus auf die bisher ungetesteten Grenzfälle:

1. Neuer Absatz → „Überschrift 1" → `h1` im DOM, Dropdown zeigt „Überschrift 1".
2. Direkt „Überschrift 4" ohne Zwischenschritt → `h4` (Grenzfall 10).
3. „Standard" → wieder `p` (echte Node-Typ-Änderung, 2.4).
4. Zwei Zeilen per Maus-Drag markieren, „Überschrift 2" → **beide** werden `h2`
   (Ergebnis gemäß 3.1 — ersetzt die offene Erwartung aus Testfall 5.4).
5. Cursor im (einzigen) Absatz eines Listenpunkts, „Überschrift 1" → funktioniert (`h1`
   in `li`), gemäß 3.3/Grenzfall 4.
6. Cursor im zweiten Block desselben Listenpunkts → funktioniert ebenfalls, **konsistent**
   mit 5 (Grenzfall 5).
7. Cursor in Tabellenzelle, „Überschrift 2" → Zelle `h2`, Rest unverändert.
8. Mehrere Tabellenzellen (`CellSelection`), Format wählen → **alle** selektierten Zellen
   erhalten das Format (Ergebnis gemäß 3.1/Finding A — ersetzt „No-Op" aus 5.8).
9. Absatz zentrieren, dann „Überschrift 1" → Ausrichtung bleibt `center` (3.2/Grenzfall 8);
   danach „Standard" → immer noch `center` (Grenzfall 9, kumulativ).
10. Enter am Ende einer Überschrift, weiter tippen → neuer Block ist `p`, **ohne**
    manuelles `selectOption('normal')` (2.8).
11. Enter mitten in einer Überschrift → beide Hälften bleiben `hN` derselben Ebene.
12. Undo direkt nach Formatwechsel → vorheriger Node-Typ **und** Ausrichtung wieder da;
    Redo stellt beides her; Kette mehrerer Wechsel einzeln rückgängig (2.10).
13. **Ebene > 6 (Befund 6/Grenzfall 11):** DOCX-Fixture mit „Heading 7" hochladen → nach
    Clamp `h6` im DOM, Dropdown zeigt „Überschrift 6"; exportieren/reimportieren → Ebene
    bleibt 6 (kein Abfall auf Standard). ODT-Variante (`text:outline-level="7"`) → ebenfalls
    `h6`. **Muss vor dem Clamp aus 4.4/4.5 fehlschlagen (DOCX: Standard), danach grün.**
14. **Selection-Sync-Regression mit Absatzformat als Auslöser** (Grenzfall 15): Tippen →
    „Überschrift 1" → Klick zur Neupositionierung → Enter → weiter tippen → beide Absätze
    erhalten (analog `selection-regression.spec.ts`, jetzt mit Absatzformat statt Fett).
    Pflichttest.
15. Vollständige Rundreise je Format (4.1/4.2), inkl. Ebene 3–6, echter Upload/Download.
16. Cross-Format-Rundreise (4.3): DOCX→ODT→DOCX und ODT→DOCX→ODT.
17. Dropdown-Bedienung auf allen drei `playwright.config.ts`-Projekten (Desktop Chrome,
    Mobile/Pixel 7, Tablet/iPad Mini) → Kernfunktion 1–3 je Projekt.
18. **Sichtbare Darstellung (Befund 11/Grenzfall 20/Abnahme 10, neu — in der vorigen
    Planfassung komplett gefehlt, siehe 0.1):** Neuen Absatz eingeben, „Überschrift 1"
    wählen → `getComputedStyle` der resultierenden `h1` gegen einen benachbarten `<p>`
    vergleichen, `fontSize` muss messbar größer sein (nach 4.9: `24pt`/`32px` vs.
    Fließtext-Größe); Ebene 6 gegen Ebene 1 (`13pt` < `24pt`) zur Kontrolle der Staffelung;
    ergänzend ein Screenshot-Vergleich auf dem Desktop-Chrome-Projekt. **Muss vor 4.9
    fehlschlagen** (Editor-`h1` hat dieselbe berechnete `font-size` wie `<p>`), **danach
    grün**.
19. **Strukturell verwandte, eigenständig zu testende Sonderfälle (Befund 12/13,
    Grenzfall 21/22, Abnahme 3 — in der vorigen Planfassung komplett gefehlt, siehe 0.1):**
    - (a) Neues Dokument mit genau einem Absatz, Text eingeben, `Strg+A`/`Cmd+A`, dann
      „Überschrift 1" wählen → der Absatz wird `h1` (Ergebnis gemäß 3.1: die
      „erweitern"-Entscheidung gilt für `AllSelection` genauso wie für Mehrblock); Dropdown
      zeigt währenddessen **nicht** fälschlich „Standard" (behebt die in Befund 12
      zusätzlich beschriebene Anzeige-Falschmeldung). Ergänzend: dieselbe Bedienung in
      einem Mehr-Absatz-Dokument → **alle** Absätze/Überschriften werden zur gewählten
      Ebene (bewusste, in 3.1 dokumentierte Konsequenz — kein Sonderfall-Ausschluss).
    - (b) Ein Bild einfügen, per Klick markieren (`NodeSelection`), „Überschrift 1"
      wählen → Dropdown ist deaktiviert (4.2), kein Effekt, keine JS-Exception (behebt den
      stillen No-Op aus Befund 13 durch sichtbare Deaktivierung statt stillschweigenden
      Fehlschlags).

### 5.2 `src/formats/shared/editor/__tests__/commands.test.ts` (ergänzt)

Datei existiert (bisher `canCut`/`cutSelection`). Neuer `describe`-Block für
`collectHeadingTargets`/`canSetHeading`/`setHeading` (Vitest, ohne DOM):
- Collapsed Cursor in Absatz/Überschrift → genau ein Target.
- Selektion über zwei Absätze → zwei Targets; `setHeading` wandelt beide, jeder behält
  seine eigene `align`; genau ein `tr` (`tr.docChanged`, ein Undo-Schritt).
- `CellSelection` über 2×2 Zellen → vier Targets, alle in **einer** Transaktion umgewandelt.
- `CellSelection` über eine reine Bild-Zelle → keine Targets, `canSetHeading === false`.
- Cursor im ersten **und** im zweiten Kind eines Listenpunkts → je ein Target
  (Regressions-Sperre für den bereits vorhandenen `block+`-Zustand, 2.4).
- **`wrapInList` auf eine einzelne Überschrift liefert `true`** (Regressions-Sperre für
  Finding D/2.4 — schlägt mit dem alten `'paragraph block*'`-Schema fehl).
- Direkter Ebenenwechsel (2 → 5) → funktioniert, `align` bleibt.
- **`AllSelection` über ein Ein-Absatz-Dokument** (Befund 12, neu) → genau ein Target;
  `setHeading(1)` liefert `true` und wandelt den Absatz um (Gegenprobe zum alten
  Verhalten, das hier laut Anforderung nachweislich `false` lieferte). Zusätzlich:
  `AllSelection` über ein Mehr-Absatz-Dokument (inkl. eines Absatzes in einem Listenpunkt)
  → ein Target je gefundenem `paragraph`/`heading`, unabhängig von der Tiefe.
- **`NodeSelection` auf einem `image`-Knoten** (Befund 13, neu) → keine Targets,
  `canSetHeading` liefert `false`, `setHeading(1)` liefert `false` ohne zu dispatchen.

**Koordinationshinweis:** `fett-code.md` §6.2 plant eine Datei desselben Pfads (für
`isMarkActive`). Beide Testgruppen in **derselben** Datei zusammenführen (je ein
`describe`), nicht zwei konkurrierende Dateien.

### 5.3 Neu: `src/formats/odt/__tests__/reader-edge-cases.test.ts`

Hand-gebaute minimale ODT-Zips (Muster: `odt.spec.ts`s `buildSampleOdt()`, hier per JSZip
auf Unit-Ebene):
- `<text:h text:style-name="Common1">` mit `Common1` **nur** in `office:styles`, explizit
  `fo:text-align="center"` → nach 4.5 wird `align: 'center'` gelesen (**vor dem Fix
  fehlschlagend, danach grün**).
- Dieselbe Konstruktion mit `style:parent-style-name`-Kette (A erbt von B, nur B hat
  `fo:text-align`) → über die Kette aufgelöst.
- `text:outline-level="8"` → nach 4.5 `level: 6` (Clamp).

### 5.4 Neu: `src/formats/docx/__tests__/reader-edge-cases.test.ts`

- `styles.xml`-Ausschnitt: Stil `CustomHeading` mit `<w:basedOn w:val="Heading1"/>`, ohne
  eigenes `w:outlineLvl` → `readDocx` erkennt Level 1 (**vor 4.4 fehlschlagend, danach
  grün** — Finding D/Grenzfall 16).
- Zyklischer `w:basedOn` (A↔B) → kein Hang/Absturz, `null`.
- Stil-ID „Heading7" bzw. `outlineLvl`-8-Vorlage → Level 6 (Clamp, Befund 6).
- `heading123.docx` (reale Fixture, existiert) → Level/Text korrekt (Abnahme 4.1.7).

### 5.5 `src/formats/odt/__tests__/external-fixtures.test.ts` (ergänzt)

- `listStyleId.odt`: **über den reinen „importiert ohne Absturz"-Test hinaus** —
  `wordSchema.nodeFromJSON(doc.body)`, `EditorView` mounten, `splitListItem` an der
  Überschrift-im-Listenpunkt-Position als Dry-Run (`command(state, undefined)`) darf
  **nicht** werfen. Regressions-Sperre für den bereits behobenen Absturz (2.4).
- `MyHeading1.odt`: `Heading2`-Überschrift trotz Definition nur in `office:styles` als
  `level: 2` erkannt.
- `ListHeading.odt`/`ListHeading2.odt`: `list_item` mit zwei Kindern (`paragraph`,
  `heading`) korrekt.

### 5.6 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

Bestehend: `describe('DOCX round trip: headings')` (Z. 32) mit „preserves heading levels
and text" (Ebene 1/2, Z. 33) und „preserves heading alignment" (nur `center`, Z. 47).
Ergänzen:
- „preserves heading alignment" auf `it.each(['left','center','right','justify'])` erweitern
  (analog Absatz-Parametrisierung Z. 55).
- Ebene 3–6 (bisher nur 1/2).
- Struktur-Assertion: nach `writeDocx` das rohe `word/document.xml` direkt auf
  `<w:pStyle w:val="Heading3"/>` prüfen (Abnahme 4.1.2); Wechsel „Heading3 → Standard" →
  kein `w:pStyle` mehr (Abnahme 4.1.3).
- **Überschrift innerhalb eines Listenpunkts — zwei getrennte Assertions** (Finding F **und**
  F2, 4.6):
  - (a) XML-Ebene: nach `writeDocx` enthält das `<w:p>` der Überschrift ein `<w:numPr>`
    (schlägt ohne Writer-Teil-1 fehl).
  - (b) **Rundreise-Ebene (entscheidend, deckt F2 auf):** `writeDocx` → `readDocx` → die
    Überschrift liegt wieder **innerhalb** eines `bullet_list`/`ordered_list`, nicht als
    Top-Level-Block daneben. Diese Assertion bleibt **rot, solange nur Writer-Teil-1**
    umgesetzt ist (der Reader streift den Marker ab), und wird erst mit Reader-Teil-2 grün.
    Ohne diesen Test bliebe der stille Reimport-Verlust unbemerkt (Abnahme 9).
- Ebene-7-Import (Fixture/synthetisch) → Rundreise landet verlustfrei auf Ebene 6 (Befund 6).

### 5.7 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

Analog 5.6: alle vier Ausrichtungen für Überschriften, Ebene 3–6, Wechsel zurück zu
`<text:p>` (Abnahme 4.2.2/4.2.3), Überschrift im Listenpunkt (ohne Finding-F-Gegenstück
nötig, nur zur Vollständigkeit), Ebene-7-Import → Ebene 6 (Clamp, Kontrast zu 5.6).

---

## 6. Zuordnung zu den Abnahmekriterien (Anforderung Abschnitt 7)

| DoD | Abdeckung |
|---|---|
| 1. Testfälle Abschnitt 5 real im Browser, inkl. Ebene 3–6 | 5.1 (`absatzformat.spec.ts`, 19 Punkte) |
| 2. Rundreise (Abschnitt 4) per unabhängigem Parser/Reimport | 5.1 (15–16) + 5.6/5.7 |
| 3. Mehrblock-Selektion entschieden, **einschließlich** `AllSelection` (Befund 12) und Bild-`NodeSelection` (Befund 13) | 3.1: **erweitern** (Ranges-sicher, eine Transaktion), mit explizit ausformuliertem Verhalten für `AllSelection` (wandelt alle gefundenen Blöcke) und `NodeSelection` (kein Target, deaktiviert); Tests 5.1(19a/19b), 5.2. **In der vorigen Planfassung nicht erfüllt — Abnahme 3 verlangt beide Sonderfälle ausdrücklich, siehe 0.1.** |
| 4. Ausrichtungserhalt entschieden | 3.2: **erhalten** |
| 5. Überschrift in Liste/Zelle entschieden + getestet | 3.3: **erlauben** (Schema bereits `block+`); + Finding-F/F2-Fix 4.6 (Writer **und** Reader); Tests 5.1/5.5/5.6 (inkl. Reimport-Assertion) |
| 6. Ebenen > 6 entschieden, DOCX-Verlust beseitigt | 3.4: **Clamp auf 1–6** an beiden Readern (4.4/4.5); Tests 5.1(13)/5.3/5.4/5.6/5.7 |
| 7. ODT-`office:styles` (Befund 7) + DOCX-`w:basedOn` (Befund 8) an realer Datei nachvollzogen | 3.5/4.5 (`MyHeading1.odt` + synthetisch 5.3); 4.4 (`CustomHeading` 5.4) |
| 8. Selection-Sync-Regression × Absatzformat, dauerhaft grün | 5.1 (14) |
| 9. Kein stiller Datenverlust/keine JS-Exception | 4.2 (`disabled`), 4.1 (atomare Transaktion/Ausrichtung), 4.4/4.5 (Clamp statt Verlust), 4.6-Teil-2 (Reader behält Listenmarker der Überschrift — kein stiller Reimport-Verlust), 5.5 (Absturz-Sperre), 5.6(b) (Reimport-Assertion) |
| 10. Sichtbare Darstellung (Befund 11/Grenzfall 20) entschieden — gestaffelte Schriftgröße oder dokumentierte Einschränkung | 3.6: **beheben** (gestaffelte `font-size`, koordiniert mit `fett-code.md` §4.5); Fix 4.9; Test 5.1(18). **In der vorigen Planfassung komplett unadressiert — siehe 0.1.** |
| 11. Backlog-Status | Nicht Gegenstand dieser Datei; nach grünem Abschnitt 5 kann `absatzformat-dropdown` als „vorhanden" bestätigt werden, sonst „teilweise". |

---

## 7. Reihenfolge der Umsetzung (Kernarbeit zuerst)

1. **`commands.ts` (4.1)** — `setHeading`/`canSetHeading`/`headingTargetsInSelection`
   (Mehrblock + `CellSelection`-Ranges + Ausrichtungserhalt, eine atomare Transaktion).
   Kernstück, behebt Befund 3 **und** 4 — und, als Konsequenz derselben
   `nodesBetween`-Konstruktion (3.1), auch Befund 12/13. Begleitend Unit-Tests 5.2.
2. **`Toolbar.tsx` (4.2)** — `disabled`-Zustand, vereinfachte `currentHeadingLevel`.
3. **`docx/reader.ts` (4.4)** — `w:basedOn`-Kette (Befund 8) + Clamp (Befund 6).
4. **`odt/reader.ts` (4.5)** — Clamp (isoliert, sofort) und `office:styles`+`parent`-Kaskade
   (Befund 7), **abgestimmt mit `fett-code.md` §4.8 — in einem Zug**.
5. **`docx/writer.ts` + `docx/reader.ts` (4.6)** — Finding-F-`numPr`-Writer-Fix **und**
   Finding-F2-Reader-Fix (Listenmarker der Überschrift beim Reimport behalten); **zwingend
   zusammen**, sonst nur XML-grün, aber Rundreise-rot.
6. **`index.css` (4.9)** — gestaffelte `font-size` (Befund 11); **abgestimmt mit
   `fett-code.md` §4.5 (`font-weight: 700`) — derselbe CSS-Block, in einem Zug**, sonst
   überschreibt eine Umsetzung die andere.
7. **`schema.ts` (4.3)** — optionale `toDOM`-Härtung.
8. **`WordEditor.tsx` (4.8)** — optionale Tastenkürzel.
9. Testergänzungen 5.3–5.7 (Unit/Reader), zuletzt 5.1 (E2E), jeder Fix vor Bestätigung des
   Backlog-Status (DoD 11) einzeln grün abgesichert.
