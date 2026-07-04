# Anforderungsspezifikation: Feature „Ausrichtung Blocksatz“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Zeile „ausrichtung-blocksatz“, Abschnitt 2.3 „Absatz­formatierung“)
als **vorhanden** geführt (Priorität 1/essenziell), Beschreibung dort: „Richtet den Absatz
im Blocksatz aus.“ Diese Datei ersetzt die Beschreibung nicht, sondern macht sie so
detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über echte
Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Das Absatzformat „Blocksatz“ (`align: 'justify'` auf den Node-Attributen
`paragraph`/`heading` im gemeinsamen ProseMirror-Schema, `src/formats/shared/schema.ts`).
Blocksatz teilt sich Datenmodell, Befehle (`setAlign`, `isAlignActive`) und UI-Komponente
(`AlignButton`) vollständig mit den drei Geschwister-Ausrichtungen links/zentriert/rechts —
es gibt **keinen** eigenen Code-Pfad nur für Blocksatz. Diese Anforderung ist deshalb nicht
isoliert von den anderen drei Ausrichtungen zu verifizieren; wo ein Fehler alle vier
Ausrichtungen gleichermaßen betrifft (siehe Abschnitt 2.2), wird das explizit benannt, aber
stets aus der Perspektive „was bedeutet das für Blocksatz“ bewertet. Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim Export
eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich dem Original). Stil und Gliederung
orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` und `specs/fett-req.md`.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis der
Korrektheit — das ist Aufgabe der Verifikation; Punkt 3 unten wurde durch eine isolierte,
minimale Nachstellung des exakten Code-Pfads bestätigt, siehe Kasten in Abschnitt 2.2):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:4` | `alignAttr = { align: { default: 'left', validate: 'string' } }` — **kein Enum**, jeder String wird akzeptiert |
| `src/formats/shared/schema.ts:9-17` | Node `paragraph`: Attribut `align`, `parseDOM` liest `dom.style.textAlign \|\| 'left'` (nur **inline** `style`-Attribut, keine CSS-Klassen/Stylesheet-Regeln), `toDOM` rendert `text-align: ${align}` |
| `src/formats/shared/schema.ts:19-31` | Node `heading` (Ebene 1–6): identisches `align`-Attribut/Verhalten |
| `src/formats/shared/editor/commands.ts:8` | `export type Align = 'left' \| 'center' \| 'right' \| 'justify'` |
| `src/formats/shared/editor/commands.ts:10` | `alignableTypes = new Set(['paragraph', 'heading'])` |
| `src/formats/shared/editor/commands.ts:13-27` | `setAlign(align)`: iteriert per `state.doc.nodesBetween(from, to, …)` über **alle** treffenden Blöcke in der Selektion und ruft für **jeden einzelnen** `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf — `state` ist die ursprüngliche, unveränderte Closure-Variable, `state.tr` erzeugt bei jedem Aufruf eine **neue**, aber immer vom selben Ausgangsdokument abgeleitete Transaction (Zeile 21) |
| `src/formats/shared/editor/commands.ts:29-38` | `isAlignActive(state, align)`: prüft nur den Block an `$from` (dem Selektionsanfang), nicht die gesamte Selektion |
| `src/formats/shared/editor/commands.ts:40-55` | `setHeading(level)`: setzt beim Wechsel zu einer Überschrift `align` **hart auf `'left'`** (Zeile 43: `{ level, align: 'left' }`), unabhängig vom vorherigen Ausrichtungswert; beim Wechsel zurück zu „Standard“ (`level === null`) werden `attrs: undefined` übergeben → Schema-Default `align: 'left'` greift ebenfalls |
| `src/formats/shared/editor/Toolbar.tsx:64-84` | `AlignButton`: Button hat `title={"Ausrichtung: " + align}` und `aria-pressed`, aber **kein** `aria-label` (im Unterschied zu `MarkButton`, Zeile 44-47, das beides hat) |
| `src/formats/shared/editor/Toolbar.tsx:185-188` | Die vier Buttons werden mit reinen Unicode-Glyphen beschriftet: links `⇤`, zentriert `↔`, rechts `⇥`, **Blocksatz `≡`** — kein SVG, kein sichtbarer deutscher Text |
| `src/formats/shared/editor/WordEditor.tsx:71-79` | Tastatur-Keymap enthält `Mod-b`/`Mod-i`/`Mod-u`, aber **keine** Tastenkombination für irgendeine Ausrichtung (in Word/LibreOffice üblich: Strg+L/E/R/J) |
| `src/formats/shared/editor/WordEditor.tsx:91-98` | `dispatchTransaction(tr) { const newState = view.state.apply(tr); view.updateState(newState); … }` — wendet `tr` immer auf das **aktuelle** `view.state` an; siehe Abschnitt 2.2 für die Konsequenz in Kombination mit `commands.ts:21` |
| `src/formats/docx/reader.ts:13` | `JC_TO_ALIGN = { left: 'left', center: 'center', right: 'right', both: 'justify' }` — deckt nur diese vier `w:jc`-Werte ab |
| `src/formats/docx/reader.ts:150-152` | Liest `w:jc` **ausschließlich** aus dem direkten `w:pPr` des Absatzes; unbekannter/fehlender Wert → stiller Fallback auf `'left'`; **keine** Auswertung eines style-seitig ererbten `w:jc` aus der referenzierten `w:pStyle` |
| `src/formats/docx/reader.ts:236-238` | Tabellenzellen-Absätze durchlaufen dieselbe `paragraphToBlocks`-Funktion — Blocksatz in Zellen ist technisch derselbe Pfad wie im Fließtext |
| `src/formats/docx/writer.ts:16` | `JC_BY_ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'both' }` |
| `src/formats/docx/writer.ts:67-69` | `paragraphPropsXml`: schreibt **immer** ein explizites `<w:jc w:val="…"/>` (auch für den Default „links“); unbekannter `align`-Wert → stiller Fallback auf `'left'` |
| `src/formats/odt/reader.ts:24,38-64` | `paragraphAligns`: liest `fo:text-align` **roh** aus dem Style und übernimmt den String unverändert (keine Normalisierung von ODF-Werten wie `start`/`end` auf `left`/`right`) |
| `src/formats/odt/reader.ts:126,140,173-174` | Fehlt eine passende Stildefinition → Fallback auf `'left'` |
| `src/formats/odt/writer.ts:64-65,71-73` | `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left` — jeder nicht exakt passende Wert (z. B. `start`, `inherit`, `end`) fällt beim Export still auf `left` zurück |
| `src/formats/odt/styleRegistry.ts:61-93` | Feste Stildefinitionen `Ppara-justify`/`Heading{1-6}-justify` mit `fo:text-align="justify"`; Gegenstücke für links/rechts nutzen literal `"left"`/`"right"`, **nicht** die ODF-üblichen `"start"`/`"end"` |
| `src/formats/docx/__tests__/roundtrip.test.ts:17-18,48-52` | Vorhandener, aber laut Auftrag nicht vertrauenswürdiger Unit-Test „preserves justify alignment“ — konstruiert dabei **immer nur ein einzelnes** Absatz-JSON-Objekt, testet also nie eine Mehrfach-Absatz-Selektion |
| `src/formats/odt/__tests__/roundtrip.test.ts:17-18,48-52` | Analoger Test für ODT, dieselbe Einschränkung |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Prüft für reale Fremddateien nur „importiert ohne Absturz“ — **keine** Aussage über korrekt erkannte Ausrichtung |
| `tests/fixtures/external/docx/bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx`, `tests/fixtures/external/odt/tabelleAlignMargin.odt` | Liegen im Repo bereit, werden aber **nirgends** gezielt auf korrekte Ausrichtung nach Import/Export geprüft — reine Fixture-Leichen bislang |
| `tests/e2e/*.spec.ts` | **Kein einziger** E2E-Test erwähnt Ausrichtung/Blocksatz/justify — vollständige Lücke bei echter Browser-Bedienung dieses Features |

---

## 1. Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „≡“ (Blocksatz) | `Toolbar.tsx:188`, `AlignButton view={view} align="justify" label="≡"` | Ruft `setAlign('justify')` auf, `onMouseDown` mit `preventDefault()` | Muss per Maus **und** Tastatur (Tab-Fokus + Enter/Space) auslösbar sein; Klick darf nie eine unbehandelte Exception werfen (siehe 2.2) |
| 2 | Tastenkombination | nicht vorhanden (`WordEditor.tsx:71-79` enthält keinen Eintrag) | — | In Word/LibreOffice ist Strg+J Standard für Blocksatz — aktuell **komplett fehlend**; zu entscheiden, ob das als Lücke geschlossen werden muss oder bewusst offen bleibt (falls offen: explizit dokumentieren, nicht stillschweigend fehlen lassen) |
| 3 | Icon-Rendering des Buttons | `Toolbar.tsx:188`, reines Unicode-Zeichen `≡` | Kein SVG, keine sichtbare Textbeschriftung | Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 **explizit** als Risiko-Icon gelistet (`≡` wird dort namentlich als Kandidat für SVG-Umstellung genannt) — auf Systemen ohne verlässliche Unicode-Glyphen-Darstellung eindeutig prüfen |
| 4 | `aria-label`/Screenreader-Name des Buttons | `Toolbar.tsx:64-84` | Button hat **kein** `aria-label`; einziger zugänglicher Name ist der sichtbare Text-Inhalt, also das Glyphen-Zeichen `≡` selbst (der `title`-Wert „Ausrichtung: justify“ wird von der Accessible-Name-Berechnung nur als Fallback benutzt, wenn **kein** Text-Inhalt vorhanden ist — hier ist aber Text-Inhalt vorhanden) | Screenreader kündigen den Button vermutlich mit dem Unicode-Zeichennamen von „≡“ an, nicht mit „Blocksatz“/„Ausrichtung“ — muss mit echtem Screenreader (NVDA/VoiceOver) geprüft und ggf. durch `aria-label="Blocksatz"` behoben werden |
| 5 | Aktiver Zustand des Buttons | `Toolbar.tsx:65`, `isAlignActive(view.state, 'justify')`, prüft nur den Block an `$from` (`commands.ts:29-38`) | Zeigt „gedrückt“ nur für den Block, in dem der Cursor/Selektionsanfang steht | Bei Selektion über mehrere Absätze mit unterschiedlicher Ausrichtung muss die Anzeige eindeutig spezifiziert sein (siehe Grenzfall 3.4) |
| 6 | Kontextmenü (Rechtsklick) | nicht vorhanden | — | Kein Kontextmenü-Eintrag „Blocksatz“ vorhanden; nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren |
| 7 | Absatzformat-Dropdown (Wechselwirkung) | `Toolbar.tsx` (Heading-Dropdown), `commands.ts:40-55` (`setHeading`) | Setzt beim Wechsel zu einer Überschrift `align` hart auf `'left'` | Muss geklärt/dokumentiert werden, ob dieses Zurücksetzen so gewollt ist (siehe 2.5) — betrifft Blocksatz direkt, da ein zuvor im Blocksatz stehender Absatz beim Wechsel zu „Überschrift 1“ **kommentarlos** linksbündig wird |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf einen einzelnen Absatz/eine Überschrift
- Cursor ohne Selektion in einem Absatz, „Blocksatz“ geklickt → genau dieser Absatz erhält
  `align: 'justify'`, sichtbar an gleichmäßig ausgerichtetem linkem **und** rechtem
  Textrand (bis auf die letzte Zeile, browserüblich linksbündig).
- Selektion vollständig innerhalb eines einzelnen Absatzes (auch nur ein Wort markiert)
  → wirkt auf den **gesamten** umschließenden Absatz, nicht nur auf die Selektion (Absatz-,
  kein Zeichenformat).
- Erneuter Klick auf „Blocksatz“, wenn der Absatz bereits im Blocksatz ist → **kein**
  Toggle wie bei Zeichenformaten (Fett etc.); der Absatz bleibt im Blocksatz (die
  Ausrichtung ist ein 4-wertiger exklusiver Zustand, kein An/Aus-Schalter — es gibt keine
  Aktion, die Blocksatz „ausschaltet“ außer dem Klick auf eine der drei anderen
  Ausrichtungen).
- Die Aktion erzeugt für den Fall „genau ein betroffener Block“ einen einzelnen,
  eigenständigen Undo-Schritt.

### 2.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften — kritischer Verdachtsfall

> **Durch Code-Analyse hergeleiteter und durch isolierte Nachstellung des exakten
> Produktionscodepfads bestätigter Verdacht auf einen schwerwiegenden Fehler** (analog zum
> bereits dokumentierten Selection-Sync-Bug in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 —
> **muss** trotzdem noch einmal im echten Browser/E2E nachgewiesen werden, bevor er als
> endgültig bestätigt gilt, da die Nachstellung außerhalb der React-Komponente/DOM
> erfolgte):
>
> `setAlign` (`commands.ts:13-27`) ruft für **jeden** in der Selektion gefundenen
> alignierbaren Block `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf,
> wobei `state` über die gesamte Schleife hinweg die **ursprüngliche**, unveränderte
> `EditorState`-Instanz bleibt. `WordEditor.tsx:91-98` implementiert `dispatchTransaction`
> als `view.state.apply(tr)` — also angewandt auf das zu diesem Zeitpunkt **aktuelle**
> `view.state`. Nach dem ersten `dispatch()`-Aufruf hat sich `view.state.doc` bereits
> geändert (erster Block ist jetzt im Blocksatz); die zweite Transaction wurde aber
> weiterhin aus dem **alten** `state` gebaut. `EditorState.apply()` (ProseMirror-State,
> `applyInner`) verlangt zwingend, dass `tr.before` mit dem Dokument übereinstimmt, auf das
> angewendet wird (`this.doc`), und **wirft `RangeError: "Applying a mismatched
> transaction"`**, sobald sich beide unterscheiden — was hier bereits ab dem **zweiten**
> betroffenen Block der Fall ist, weil sich die `align`-Attribute unterscheiden und
> `Node.eq()` das erkennt.
>
> Eine minimale, aus dem echten Code (`commands.ts`, `WordEditor.tsx`) 1:1 nachgebaute
> Reproduktion (zwei bzw. drei Absätze, `setAlign('justify')` auf eine
> Ganz-Dokument-Selektion angewendet, mit demselben `dispatch`-Muster wie
> `dispatchTransaction`) wirft exakt diesen `RangeError` bereits beim zweiten Absatz; der
> erste Absatz wurde zu diesem Zeitpunkt bereits erfolgreich auf `justify` gesetzt, alle
> weiteren bleiben unverändert, und die Exception ist zu diesem Zeitpunkt **unbehandelt**
> (kein `try`/`catch` in `Toolbar.tsx`s `run()`, kein React-Error-Boundary im gesamten
> `src`-Baum — geprüft, keiner vorhanden).
>
> **Praktische Konsequenz, falls im Browser bestätigt:** Der mit Abstand häufigste
> Anwendungsfall — „Strg+A (Alles auswählen, laut Backlog bereits „vorhanden“), dann
> Blocksatz klicken, um das gesamte Dokument zu justieren“ — sowie jede Mehrfachzeilen-/
> Mehrfachabsatz-Selektion (auch eine markierte mehrzeilige Aufzählungsliste oder mehrere
> markierte Tabellenzellen) würde **nur den ersten betroffenen Block** tatsächlich in den
> Blocksatz versetzen und danach ohne jede sichtbare Rückmeldung fehlschlagen — ein
> direkter Verstoß gegen das in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4 geforderte
> Prinzip „Kein stiller Fehlschlag“. Das würde erklären, warum der Status „vorhanden“ im
> Backlog vermutlich nur anhand von Einzelabsatz-Tests (Cursor in einem Absatz, kein
> Mehrfachabsatz-Test) vergeben wurde: Weder die bestehenden Unit-Tests
> (`roundtrip.test.ts`, siehe Referenztabelle) noch die bestehenden E2E-Tests (keine
> vorhanden) decken je mehr als einen Absatz gleichzeitig ab.
>
> **Dies ist der wichtigste Einzelpunkt dieser gesamten Anforderungsdatei** und muss als
> Erstes verifiziert werden (Testfall 5.1).

Sollte sich der Verdacht bestätigen, gilt als Soll-Verhalten: Anwenden von „Blocksatz“ auf
eine Selektion über N Absätze/Überschriften hinweg muss **alle** N Blöcke in einem
einzigen, atomaren Vorgang (ein einziger Undo-Schritt) auf `justify` setzen, ohne
Exception, unabhängig davon, wie viele Blöcke betroffen sind (2, 20, 200 — inklusive
Blöcke innerhalb von Listenpunkten und Tabellenzellen).

### 2.3 Anzeige des aktiven Zustands
- Button zeigt `aria-pressed="true"` und optisch „gedrückt“ (`Toolbar.tsx:75-79`), wenn der
  Block an `$from` `align: 'justify'` hat.
- Zustand aktualisiert sich sofort bei jeder Cursor-Bewegung/Selektionsänderung.
- Bei einer Selektion über mehrere Blöcke mit **unterschiedlicher** Ausrichtung zeigt der
  Button aktuell ausschließlich den Zustand des **ersten** Blocks (`$from`) — zu
  verifizieren, ob das für Nutzer:innen nachvollziehbar ist oder ob ein
  „gemischt“-Zustand (analog zu Word: kein Button gedrückt, wenn die Selektion gemischte
  Ausrichtungen enthält) erwartet wird (siehe Grenzfall 3.4).

### 2.4 Kein Toggle-Charakter (Unterschied zu Zeichenformaten)
- Im Gegensatz zu Fett/Kursiv/Unterstrichen/Durchgestrichen (echte Toggle-Marks) ist
  Ausrichtung ein exklusiver 4-Werte-Zustand ohne „Aus“-Zustand. Erneutes Klicken auf
  „Blocksatz“, während der Absatz bereits im Blocksatz ist, muss **keine** sichtbare
  Änderung bewirken, darf aber auch **keinen** unnötigen zusätzlichen Undo-Schritt
  erzeugen, wenn technisch vermeidbar (nice-to-have, kein Blocker — zu dokumentieren,
  welches der beiden Verhalten tatsächlich vorliegt).

### 2.5 Zusammenspiel mit dem Absatzformat-Dropdown (Formatvorlagen)
- `setHeading()` (`commands.ts:40-55`) setzt beim Umwandeln eines Absatzes in eine
  Überschrift die Ausrichtung **hart auf `'left'`** zurück (Zeile 43), unabhängig vom
  vorherigen Wert. Ein Absatz, der im Blocksatz steht, verliert diesen beim Wechsel zu
  „Überschrift 1“–„Überschrift 6“ **ohne jede Rückmeldung**.
- Ebenso beim Zurückwechseln von einer Überschrift zu „Standard“ (`level === null`):
  `attrs: undefined` übergeben → Schema-Default `align: 'left'` greift, eine zuvor auf der
  Überschrift gesetzte Blocksatz-Ausrichtung geht verloren.
- **Zu klären und explizit zu dokumentieren:** Ist dieses Zurücksetzen so gewollt (jede
  Formatvorlagen-Änderung setzt die Absatzausrichtung bewusst zurück auf den
  Formatvorlagen-Standard, wie es in Word bei echten Formatvorlagen z. T. der Fall ist),
  oder wird erwartet, dass eine **manuell** gesetzte Ausrichtung formatvorlagen-übergreifend
  erhalten bleibt (wie es die meisten Nutzer:innen aus Word/LibreOffice gewohnt sind, wo
  direkte Formatierung eine Formatvorlagen-Änderung typischerweise überlebt)? Aktuell
  verliert das Editor-Modell die Information ersatzlos — es gibt keinen Mechanismus, der
  „vorher war explizit Blocksatz gesetzt“ getrennt von „Formatvorlagen-Default“ speichert.

### 2.6 Zusammenspiel mit Listen und Tabellenzellen
- Absätze innerhalb eines Listenpunkts (`list_item > paragraph`) sind laut
  `alignableTypes` (`commands.ts:10`) genauso alignierbar wie normale Absätze — Blocksatz
  auf einen einzelnen Listenpunkt muss funktionieren wie auf einen normalen Absatz.
- Absätze innerhalb einer Tabellenzelle (`table_cell > paragraph`) laufen durch denselben
  Mechanismus; Blocksatz muss sich unabhängig je Zelle setzen lassen.
- Eine Selektion, die mehrere Listenpunkte **oder** mehrere Tabellenzellen umfasst (z. B.
  eine markierte Zellspalte, eine `CellSelection` aus `prosemirror-tables`), ist ein
  Spezialfall von Abschnitt 2.2 (mehrere alignierbare Blöcke in einer Selektion) — muss
  denselben Verdachtsfall abdecken.

### 2.7 Zwischenablage / Einfügen von extern kopiertem Text
- Einfügen von extern kopiertem HTML mit **inline** `style="text-align: justify"` auf
  einem `<p>`-Element wird korrekt als `align: 'justify'` erkannt (`schema.ts:13`, liest
  `dom.style.textAlign`).
- Einfügen von extern kopiertem HTML, dessen Blocksatz-Formatierung **ausschließlich**
  über eine CSS-Klasse plus externes/eingebettetes Stylesheet zugewiesen ist (kein
  Inline-`style`) wird **nicht** erkannt, da `dom.style` nur das Inline-`style`-Attribut
  des Elements abbildet, keine berechneten/kaskadierten Werte — Grenzfall, siehe 3.7.
- Kopieren von Blocksatz-Text innerhalb des Editors und Einfügen an anderer Stelle behält
  die Ausrichtung des umgebenden Ziel-Absatzes bzw. übernimmt die eingefügte
  Absatzstruktur inklusive `align`-Attribut (zu verifizieren, welches der beiden greift,
  je nachdem ob ganze Absätze oder nur Inline-Inhalt eingefügt wird).

### 2.8 Undo/Redo
- Für den Einzelblock-Fall (2.1): Undo direkt nach „Blocksatz“ stellt die vorherige
  Ausrichtung wieder her, Redo stellt Blocksatz erneut her.
- Für den Mehrblock-Fall (2.2): **nach Behebung** des Verdachtsfalls muss ein einzelnes
  Undo alle im selben Klick geänderten Blöcke gemeinsam zurücksetzen (ein Schritt, nicht
  N Schritte) — aktuell nicht prüfbar, da der Vorgang mutmaßlich bereits vorher mit einer
  Exception abbricht.

### 2.9 Kombination mit Zeichenformaten und anderen Absatzeigenschaften
- Blocksatz lässt sich unabhängig von Fett/Kursiv/Unterstrichen/Durchgestrichen/Farben auf
  denselben Absatz anwenden; keines der Zeichenformate darf durch das Setzen der
  Ausrichtung verändert werden (unterschiedliche Attribut-Ebenen: Node-Attribut vs. Mark).
- Da es aktuell keine weiteren Absatzeigenschaften gibt (Zeilenabstand, Einzüge — laut
  `FEATURE-BACKLOG.md` Abschnitt 2.3 alle „fehlt“), ist eine Wechselwirkung damit aktuell
  nicht zu testen; als zukünftige Erweiterung vermerkt.

---

## 3. Grenzfälle

1. **Leerer Absatz/leeres Dokument:** „Blocksatz“ auf einen leeren Absatz (Cursor im
   leeren Dokument) → darf nicht abstürzen, setzt lediglich `align: 'justify'` auf den
   einzigen vorhandenen leeren Absatz; visuell keine sichtbare Änderung (kein Text zum
   Verteilen).
2. **Selektion über exakt zwei Absätze:** kleinstmöglicher Fall des Verdachts aus 2.2 —
   muss als allererstes einzeln nachgestellt werden (zwei Absätze markieren, „Blocksatz“
   klicken).
3. **„Alles auswählen“ (Strg+A) in einem Mehrfach-Absatz-Dokument, dann „Blocksatz“:** der
   vermutlich häufigste real genutzte Ablauf — direkte Instanz von 2.2 mit einer
   `AllSelection`, siehe `WordEditor.tsx:18-53` (Kommentar zur `AllSelection`-Behandlung
   an anderer Stelle im selben File, der zeigt, dass `AllSelection`s im Editor bereits als
   bekanntes Sonderselektionsobjekt behandelt werden müssen).
4. **Gemischte Selektion (teils Blocksatz, teils andere Ausrichtung):** Button-Zustand
   zeigt aktuell nur den Zustand des ersten Blocks (`$from`) — festzulegen, ob das
   akzeptabel ist oder ein „gemischt/inaktiv“-Zustand erwartet wird; unabhängig vom
   Anzeige-Verhalten darf das Anwenden von Blocksatz auf eine solche Selektion nicht zu
   inkonsistentem Ergebnis führen (manche Blöcke justiert, andere nicht, ohne
   Fehlermeldung) — siehe 2.2.
5. **Blocksatz + Überschrift:** siehe 2.5 — Wechsel des Formatvorlagen-Dropdowns setzt die
   Ausrichtung kommentarlos auf links zurück, unabhängig davon, ob vorher Blocksatz
   gesetzt war.
6. **Blocksatz auf eine Selektion, die Text und ein Bild umfasst:** Bild-Node ist nicht in
   `alignableTypes` enthalten und hat kein `align`-Attribut — darf nicht abstürzen;
   Blocksatz wirkt nur auf die textuellen Absatz-/Überschrift-Nodes in der Selektion,
   Bilder bleiben unverändert. Enthält die Selektion **ausschließlich** ein Bild (z. B.
   `NodeSelection` auf genau ein Bild ohne umgebenden Text in Reichweite), findet
   `setAlign` keinen alignierbaren Block, `applicable` bleibt `false`, der Klick tut
   sichtbar **gar nichts** — ebenfalls ein Fall von „stillem Fehlschlag“ ohne Rückmeldung,
   auch unabhängig vom Verdachtsfall aus 2.2.
7. **Fremdwert im `align`-Attribut nach externem Paste:** `schema.ts:4` deklariert
   `validate: 'string'` ohne Enum-Einschränkung; eingefügtes HTML mit
   `style="text-align: start"`, `"end"`, `"match-parent"` oder `"inherit"` würde diesen
   Literalwert unverändert als `align` übernehmen. Keiner der vier Toolbar-Buttons zeigt
   dann einen aktiven Zustand (`isAlignActive` vergleicht exakt auf
   `'left'|'center'|'right'|'justify'`), obwohl der Absatz visuell (dank gültiger
   CSS-Werte) plausibel aussehen kann — beim Export fällt der Wert still auf „links“
   zurück (`writer.ts`-Fallbacks in beiden Formaten). Zu verifizieren mit gezieltem
   Einfüge-Test.
8. **ODT-Import mit `fo:text-align="start"`/`"end"`** (ODF-übliche, bidi-neutrale Werte,
   die reale LibreOffice-Dokumente oft statt `"left"`/`"right"` verwenden): Reader
   übernimmt den Rohwert unverändert (`odt/reader.ts:64-65`), Toolbar zeigt keinen der
   vier Zustände aktiv, Re-Export normalisiert still auf `"left"`/rechts über
   `PARAGRAPH_ALIGN_STYLE_NAME`-Fallback — für Blocksatz selbst unkritisch (ODF nutzt für
   Blocksatz durchgehend den Literalwert `"justify"`, kein `"start"/"end"`-Äquivalent),
   aber relevant für die Nachbarabsätze im selben Testdokument und damit für die korrekte
   Beurteilung von Rundreise-Tests, die ein reales, gemischt ausgerichtetes Dokument
   verwenden.
9. **DOCX-Import mit `w:jc val="start"`/`"end"`/`"distribute"`/`"thaiDistribute"`:**
   `JC_TO_ALIGN` (`docx/reader.ts:13`) kennt nur `left/center/right/both`; jeder andere
   Wert fällt still auf `'left'` zurück (Zeile 152) — bei einer realen, mit einer neueren
   Word-Version oder für RTL/CJK-Text erzeugten Datei ist das ein potenzieller,
   unbemerkter Rundreise-Unterschied. Für Blocksatz konkret: `"both"` ist der einzige in
   Word übliche Blocksatz-Wert, daher für dieses Feature selbst eher theoretisch, aber als
   generelle Lücke der Ausrichtungs-Erkennung zu dokumentieren.
10. **`w:jc`/`fo:text-align` nur auf Formatvorlagen-Ebene (Style), nicht direkt am
    Absatz:** Reader liest ausschließlich die Absatz-eigene direkte Formatierung
    (`docx/reader.ts:150-152`); eine reale Datei, die Blocksatz nur über eine
    referenzierte, geerbte Absatzformatvorlage setzt (kein direktes `w:jc` im `w:pPr`
    des Absatzes selbst), würde beim Import fälschlich als „links“ gelesen — muss mit
    einer gezielten Testdatei geprüft werden.
11. **Doppelklick-/schnelles Mehrfachklicken auf denselben Button:** kein doppeltes
    Anwenden durch Event-Bubbling.
12. **Blocksatz in Kombination mit dem bereits bekannten Selection-Sync-Bug** (
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, `tests/e2e/selection-regression.spec.ts`):
    Alles auswählen → Blocksatz an (löst laut 2.2 vermutlich bereits selbst eine
    Exception aus) → per Klick neu positionieren → Enter → weiter tippen — zu prüfen, ob
    die Kombination beider Verdachtsfälle den Dokumentinhalt zusätzlich gefährdet.
13. **Sehr lange Selektion (gesamtes, mehrseitiges Dokument mit hunderten Absätzen):**
    unabhängig von 2.2 zu prüfen, ob die Anwendung – sobald 2.2 behoben ist –
    performant bleibt und nicht einfriert.
14. **Blocksatz auf einen Absatz mit einem einzigen, sehr langen Wort ohne Leerzeichen**
    (z. B. eine URL): Browser-Rendering von `text-align: justify` bei fehlenden
    Umbruchmöglichkeiten → darf nicht zu über die Seite hinausragendem Text führen, der
    beim Export verloren geht (rein visuelle Prüfung, kein Datenverlust zu erwarten, aber
    zu verifizieren).

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Datei mit Blocksatz-Formatierung hochladen (bzw.
im Editor erzeugen) → **unverändert** exportieren → erneut importieren → die
Blocksatz-Ausrichtung ist inhaltlich exakt erhalten (an derselben Textstelle, kein
Verlust, keine fälschliche zusätzliche Blocksatz-Zuweisung an anderer Stelle).

### 4.1 DOCX
1. Einfache DOCX-Datei mit einem Absatz im Blocksatz (`<w:jc w:val="both"/>`)
   importieren → im Editor sichtbar im Blocksatz → unverändert als DOCX exportieren →
   erneut importieren → Absatz weiterhin im Blocksatz, übrige Absätze weiterhin nicht.
2. Im Editor neuen Text eingeben (mehrere Sätze, damit Blocksatz sichtbar einen
   Unterschied macht), mit Toolbar-Button „Blocksatz“ formatieren, als DOCX exportieren →
   mit einem unabhängigen Parser (z. B. python-docx oder direktes Parsen von
   `word/document.xml`) verifizieren, dass exakt `<w:jc w:val="both"/>` im `w:pPr` des
   betroffenen Absatzes steht.
3. Mehrere aufeinanderfolgende Absätze markieren, Blocksatz anwenden (**abhängig vom
   Ausgang von Testfall 5.1** — falls der Verdachtsfall aus 2.2 zutrifft, ist dieser
   Rundreise-Test erst nach dessen Behebung sinnvoll durchführbar) → Rundreise erhält
   Blocksatz auf **allen** markierten Absätzen, nicht nur dem ersten.
4. Blocksatz + Fett + Schriftfarbe gleichzeitig auf denselben Absatz/Textlauf → Rundreise
   erhält alle Eigenschaften gemeinsam, ohne dass eine die andere verdrängt.
5. Überschrift (Ebene 1–6) im Blocksatz → Rundreise erhält sowohl den Überschriften-Level
   als auch die Blocksatz-Ausrichtung gemeinsam (`w:pStyle` **und** `w:jc` im selben
   `w:pPr`).
6. Blocksatz-Absatz innerhalb einer Tabellenzelle → Rundreise erhält die Ausrichtung
   zellenspezifisch, andere Zellen bleiben unberührt.
7. Blocksatz-Absatz, der einen Zeilenumbruch (`hard_break`) enthält → Ausrichtung gilt
   weiterhin für den gesamten Absatz über den Umbruch hinweg.
8. Cross-Format: ODT mit Blocksatz-Absatz importieren → als DOCX exportieren →
   Blocksatz bleibt erhalten (`<w:jc w:val="both"/>` wird korrekt aus dem internen
   `align: 'justify'` erzeugt, unabhängig vom Ursprungsformat).
9. Reale, komplexe Fremddatei mit Blocksatz-Absätzen (`tests/fixtures/external/docx/
   bug-paragraph-alignment.docx` — Name legt nahe, dass diese Datei genau für einen
   bekannten Ausrichtungs-Fehler in einer Fremdanwendung erstellt wurde; Inhalt bisher
   nicht gezielt gegen Blocksatz geprüft) importieren, unverändert exportieren, erneut
   importieren → Ausrichtung bleibt an jeder ursprünglich blocksatz-formatierten Stelle
   erhalten.
10. Absatz mit direkt gesetztem `w:jc`, dessen referenzierte `w:pStyle` einen
    **abweichenden** ererbten `w:jc`-Wert deklariert (Grenzfall 3.10) → Rundreise
    erhält mindestens den direkt gesetzten Wert (Style-Vererbung ist nicht zwingend
    Teil dieser Anforderung, aber die direkte Formatierung darf nicht verloren gehen).

### 4.2 ODT
1. Einfache ODT-Datei mit einem Absatz im Blocksatz (`fo:text-align="justify"` in der
   referenzierten `style:style`) importieren → im Editor sichtbar im Blocksatz →
   unverändert als ODT exportieren → erneut importieren → Absatz weiterhin im Blocksatz.
2. Im Editor neuen Text eingeben, mit Toolbar-Button „Blocksatz“ formatieren, als ODT
   exportieren → `content.xml`/`styles.xml` enthält eine `style:style
   style:family="paragraph"` mit `fo:text-align="justify"` (Stilname `Ppara-justify` laut
   `styleRegistry.ts:61-65`), referenziert über `text:style-name` auf dem betroffenen
   `text:p`.
3. Zwei unterschiedliche Absätze, beide im Blocksatz, im selben Dokument → beide
   referenzieren nach Rundreise denselben (oder einen inhaltlich gleichwertigen)
   Blocksatz-Stil, nicht zwei redundante, widersprüchliche Definitionen.
4. Mehrere aufeinanderfolgende Absätze markieren, Blocksatz anwenden (**abhängig vom
   Ausgang von Testfall 5.1**, siehe 4.1.3) → Rundreise erhält Blocksatz auf allen
   markierten Absätzen.
5. Überschrift im Blocksatz → Rundreise erhält Level **und** Ausrichtung gemeinsam
   (`headingStyleName(level, 'justify')`, `styleRegistry.ts:80-93`).
6. Blocksatz-Absatz innerhalb einer Tabellenzelle → Rundreise erhält die Ausrichtung
   zellenspezifisch.
7. Cross-Format: DOCX mit Blocksatz-Absatz importieren → als ODT exportieren →
   Blocksatz bleibt erhalten.
8. Reale, komplexe Fremddatei mit Tabellen-/Absatz-Ausrichtung
   (`tests/fixtures/external/odt/tabelleAlignMargin.odt`) importieren → Blocksatz-Absätze
   (falls in der Datei enthalten) bleiben nach Rundreise erhalten; mindestens kein
   Textverlust.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Blocksatz-Absatz → Editor → Export als ODT → erneuter Import → Export zurück
   als DOCX → Blocksatz nach zwei Formatkonvertierungen weiterhin an exakt derselben
   Textstelle vorhanden.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Dokument mit **allen vier** Ausrichtungen auf unterschiedlichen Absätzen gemeinsam
   (links/zentriert/rechts/Blocksatz) → doppelte Rundreise erhält für jeden einzelnen
   Absatz exakt seine ursprüngliche Ausrichtung, keine Vermischung zwischen Absätzen.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, aber laut Auftrag **nicht als vertrauenswürdig geltende** Tests (mit
der wichtigen Einschränkung, dass sie **nie mehr als einen Absatz gleichzeitig** prüfen):
- `src/formats/docx/__tests__/roundtrip.test.ts` (Zeilen 48-52) „preserves justify
  alignment“ (Unit-Test, einzelner Absatz)
- `src/formats/odt/__tests__/roundtrip.test.ts` (Zeilen 48-52) analog für ODT
- `src/formats/docx/__tests__/external-fixtures.test.ts` / `.../odt/__tests__/
  external-fixtures.test.ts` (nur „importiert ohne Absturz“, keine Ausrichtungsprüfung)

Zusätzlich zu schreibende Testfälle, damit alle Abschnitte 2–4 dieser Anforderung
abgedeckt sind — **Testfall 1 hat oberste Priorität**, da von seinem Ausgang abhängt, ob
die übrigen Mehrfachabsatz-Tests überhaupt sinnvoll durchführbar sind:

1. **Kernverdacht (2.2):** Im Editor mindestens drei Absätze anlegen, per Maus/Tastatur
   über alle drei selektieren (sowie separat: per Strg+A das gesamte Dokument
   selektieren), auf „Blocksatz“ klicken → erwartet: alle drei Absätze sind im
   Blocksatz, **kein** unbehandelter Fehler in der Browser-Konsole, Undo stellt den
   vorherigen Zustand aller drei Absätze in einem Schritt wieder her. Bei Abweichung:
   exaktes Fehlerbild (welche Absätze wurden geändert, welche nicht, welche
   Konsolenfehler) dokumentieren.
2. Toolbar-Button „Blocksatz“ per echtem Playwright-Klick (nicht nur Command-Aufruf) auf
   einen einzelnen Absatz anwenden → sichtbar `text-align: justify` im DOM, `aria-pressed`
   wechselt auf `true`.
3. Cursor ohne Selektion in einem Absatz, „Blocksatz“ anwenden → gesamter umschließender
   Absatz wird justiert (nicht nur ein Wort).
4. Formatvorlage von „Standard“ zu „Überschrift 1“ wechseln, während der Absatz im
   Blocksatz steht → Ergebnis (verliert Blocksatz ja/nein) dokumentieren und mit
   Abschnitt 2.5 abgleichen.
5. Blocksatz auf eine Tabellenzelle sowie auf einen einzelnen Listenpunkt anwenden →
   funktioniert wie auf einen normalen Absatz.
6. Blocksatz auf eine Selektion anwenden, die Text und ein Bild umfasst → kein Absturz,
   nur Textblöcke betroffen.
7. Blocksatz auf eine Selektion anwenden, die **ausschließlich** ein Bild markiert
   (`NodeSelection`) → Button-Klick bewirkt sichtbar nichts, kein Fehler (Grenzfall 3.6).
8. Einfügen von extern kopiertem HTML mit `style="text-align: justify"` → wird als
   Blocksatz erkannt (2.7).
9. Einfügen von extern kopiertem HTML mit klassenbasierter (nicht inline) Blocksatz-
   Formatierung → erwartetes Fallback-Verhalten (vermutlich Verlust) nachweisen und
   dokumentieren (Grenzfall 3.7).
10. Undo/Redo direkt nach Blocksatz-Anwendung auf einen einzelnen Absatz.
11. Vollständiger Rundreisetest je Format (Abschnitt 4.1/4.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`).
12. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT, mit allen
    vier Ausrichtungen gemeinsam in einem Dokument.
13. Screenreader-Stichprobe (NVDA oder VoiceOver) auf den Blocksatz-Button → welcher Name
    wird tatsächlich angekündigt (Grenzfall/Bedienelement Nr. 4 in Abschnitt 1)?
14. Import der bereitgestellten Fixture-Dateien `bug-paragraph-alignment.docx`,
    `table-alignment.docx`, `TestTableCellAlign.docx`, `tabelleAlignMargin.odt` mit
    gezielter Prüfung der resultierenden `align`-Attribute je Absatz/Zelle (bisher nur
    crash-frei importiert, nie inhaltlich gegen Ausrichtung verifiziert).
15. DOCX mit `w:jc val="start"` bzw. ODT mit `fo:text-align="start"` importieren →
    tatsächliches Verhalten (Fallback auf links, Button-Zustand) dokumentieren
    (Grenzfälle 3.8/3.9).

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Ausrichtung Blocksatz“ darf erst dann wieder als
vertrauenswürdig gelten, wenn:

1. Der Kernverdacht aus Abschnitt 2.2 (Mehrfachabsatz-Selektion wirft eine unbehandelte
   Exception und wendet die Ausrichtung nur auf den ersten Block an) im echten Browser
   nachgestellt und entweder widerlegt oder behoben wurde — inklusive eines dauerhaften
   Regressionstests, der exakt dieses Szenario abdeckt (Testfall 5.1).
2. Alle übrigen Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
3. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch einen
   unabhängigen Parser bzw. durch erneuten Import bestätigt sind — insbesondere die
   Mehrfachabsatz-Rundreise (4.1.3/4.2.4), die vom Ausgang von Punkt 1 abhängt.
4. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches Verhalten
   dokumentiert ist.
5. Die offenen Fragen aus Abschnitt 2.4 (Toggle-Charakter/Undo-Verhalten bei
   wiederholtem Klick) und 2.5 (Zurücksetzen der Ausrichtung beim Formatvorlagenwechsel)
   explizit beantwortet und das Ergebnis hier nachgetragen wurde.
6. Das `aria-label`-Defizit sowie das Icon-Rendering-Risiko aus Abschnitt 1 (Zeilen 3–4)
   bewertet wurden (bewusst beibehalten oder behoben).
7. Die bislang ungenutzten Fixture-Dateien (`bug-paragraph-alignment.docx`,
   `table-alignment.docx`, `TestTableCellAlign.docx`, `tabelleAlignMargin.odt`) mit einer
   gezielten, auf Ausrichtung prüfenden Testerweiterung angebunden sind (Testfall 5.14).

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)“ auf „verifiziert“ geändert werden.
