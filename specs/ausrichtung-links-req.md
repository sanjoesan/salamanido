# Anforderung: Ausrichtung links

Status: **vorhanden laut Backlog — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen
die die Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird,
bevor der Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 2.3, Zeile `ausrichtung-links` — Titel
„Ausrichtung links", Beschreibung „Richtet den Absatz linksbündig aus.", Priorität 1
(essenziell/fundamental).

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md` sowie an den
bereits vorliegenden Einzel-Anforderungen `specs/fett-req.md` und
`specs/unterstrichen-einfach-req.md`: Anforderung in Fließtext/Listen je Aspekt, danach
nummerierte Testfälle, Fokus auf **beide** Formate (DOCX und ODT) sowie auf die
Rundreise (Upload unverändert → Export → Re-Import erhält Inhalt).

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen — Code-Vorhandensein wurde bisher mit „funktioniert"
verwechselt, das ist ja der Grund für diese Anforderung):

| Ebene | Fundstelle |
|---|---|
| Schema (Knoten-Attribut, nicht Mark!) | `src/formats/shared/schema.ts:4`, `const alignAttr = { align: { default: 'left', validate: 'string' } }` — als Attribut auf den Knoten `paragraph` (Zeile 12) **und** `heading` (Zeile 22) definiert, Default-Wert bereits `'left'` |
| Editor-Rendering | `src/formats/shared/schema.ts:14-16` (Paragraph) bzw. `:28-30` (Heading): `toDOM` schreibt `style="text-align: ${node.attrs.align}"` direkt auf `<p>`/`<h1>`–`<h6>` |
| HTML-Import (Paste/DOM-Parsing) | `src/formats/shared/schema.ts:13,26`: `getAttrs` liest `dom.style.textAlign`, Fallback `'left'`, wenn nicht gesetzt |
| Befehl „Setzen" | `src/formats/shared/editor/commands.ts:13-27`, `setAlign(align)`: iteriert **alle** Knoten vom Typ `paragraph`/`heading` (`alignableTypes`, Zeile 10) zwischen `selection.from` und `selection.to` (`state.doc.nodesBetween`) und setzt `align` per `setNodeAttribute` — **kein Toggle**, reines Setzen |
| Aktiv-Zustand-Prüfung | `src/formats/shared/editor/commands.ts:29-38`, `isAlignActive(state, align)`: läuft vom `$from`-Knoten nach oben bis zum nächsten alignierbaren Vorfahren und vergleicht dessen `align`-Attribut — bezieht sich **nur** auf die Position `$from`, nicht auf die gesamte Selektion |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:64-84` (`AlignButton`), eingebunden `:185`: `<AlignButton view={view} align="left" label="⇤" />` — Titel „Ausrichtung: left" (nicht übersetzt/lokalisiert), **kein** `aria-label` (im Unterschied zu `MarkButton`, das zusätzlich zu `title` auch `aria-label` setzt, vgl. `Toolbar.tsx:47`) |
| Tastenkombination | **keine vorhanden** — im Unterschied zu Fett (Strg+B)/Kursiv/Unterstrichen (Strg+U) existiert für keine der vier Ausrichtungen ein Tastaturkürzel (in Word/LibreOffice üblich: Strg+L/E/R/J) |
| DOCX-Import | `src/formats/docx/reader.ts:13`, `JC_TO_ALIGN = { left: 'left', center: 'center', right: 'right', both: 'justify' }`; `:150-152`: liest `<w:jc w:val="...">` aus `w:pPr`, fehlt `w:jc` komplett oder ist der Wert nicht in der Tabelle enthalten (z. B. `start`, `end`, `distribute`) → Fallback `'left'` |
| DOCX-Export | `src/formats/docx/writer.ts:16`, `JC_BY_ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'both' }`; `:67-69` (`paragraphPropsXml`) schreibt immer `<w:jc w:val="..."/>` (auch für „left", nicht weggelassen); `:100-104` (Absatz) und `:106-110` (Überschrift) übergeben `node.attrs.align ?? 'left'` |
| ODT-Import | `src/formats/odt/reader.ts:36-77` (`parseAutomaticStyles`): liest `fo:text-align` aus `style:paragraph-properties` einer referenzierten `style:style` (Zeile 64-65) in eine `paragraphAligns`-Map; `:126,173`: `(styleName && styles.paragraphAligns.get(styleName)) || 'left'` — **kein Mapping/Normalisierung** von ODF-Werten wie `start`/`end` auf `left`/`right`, diese werden unverändert als Align-Wert übernommen |
| ODT-Export | `src/formats/odt/styleRegistry.ts:61-66`, `PARAGRAPH_ALIGN_STYLE_NAME = { left: 'Ppara-left', center: 'Ppara-center', right: 'Ppara-right', justify: 'Ppara-justify' }`; `:68-75` (`paragraphAlignStyleDefs`) deklariert vier feste automatische Absatzstile mit `fo:text-align`; `src/formats/odt/writer.ts:64-65`: `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left` — unbekannte Align-Werte (z. B. importiertes `start`) fallen beim Export automatisch auf „left" zurück |
| ODT-Export Überschriften | `src/formats/odt/styleRegistry.ts:77-92` (`headingStyleDefs`/`headingStyleName`): pro Ebene (1–6) **und** pro der vier Ausrichtungen ein eigener, vorab generierter Stil `Heading{level}-{align}` |
| Umstellung Formatvorlage (Standard ↔ Überschrift) | `src/formats/shared/editor/commands.ts:40-55` (`setHeading`): Beim Wechsel **von** Standard **zu** Überschrift wird `attrs = { level, align: 'left' }` fest gesetzt (Zeile 43) — verwirft eine zuvor gesetzte andere Ausrichtung. Beim Wechsel **von** Überschrift **zu** Standard wird `attrs = undefined` gesetzt, wodurch ProseMirror den Schema-Default `align: 'left'` verwendet — verwirft ebenfalls jede zuvor gesetzte andere Ausrichtung. **Beide Richtungen setzen also implizit „links" als Nebeneffekt**, unabhängig vom „Ausrichtung links"-Button. |
| Unit-Tests (Rundreise, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts:48-53` und `src/formats/odt/__tests__/roundtrip.test.ts:48-53`: `it.each(['left','center','right','justify'])('preserves "%s" alignment', ...)`; zusätzlich Heading-Ausrichtung einzeln getestet (`:41-45` in beiden Dateien) |
| E2E-Tests (echte Toolbar-/Tastatur-Bedienung im Browser) | **keine gefunden** — `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/lifecycle.spec.ts`, `tests/e2e/selection-regression.spec.ts` enthalten keinen einzigen Treffer für „align"/„Ausrichtung". Das ist die zentrale Lücke, die diese Anforderung schließen soll — identisch zur Feststellung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4, Testfall 1 („bereits vorhanden, muss aber in Testsuite bleiben"). |

---

## 1. Ziel

Nutzer:innen können den Cursor-Absatz bzw. jeden Absatz/jede Überschrift innerhalb
einer Selektion linksbündig ausrichten — sowohl über die Toolbar als auch (sofern
ergänzt) über Tastatur — konsistent in Editor-Anzeige, DOCX-Export und ODT-Export, und
die Ausrichtung bleibt bei jeder Rundreise (Import → Export, Export → Re-Import,
Cross-Format) vollständig erhalten. Da „links" der Schema-Default ist, gilt zusätzlich:
ein neuer, unformatierter Absatz ist bereits linksbündig, ohne dass der Button
überhaupt betätigt werden muss.

Explizit **nicht** alleiniger Gegenstand dieser Anforderung (separate Backlog-Einträge,
gleicher Priorität 1, Status ebenfalls „vorhanden"/zu verifizieren, aber jeweils eigene
Anforderungsdatei vorzusehen):
- `ausrichtung-zentriert` — zentrierte Ausrichtung.
- `ausrichtung-rechts` — rechtsbündige Ausrichtung.
- `ausrichtung-blocksatz` — Blocksatz.

Da alle vier Ausrichtungen durch **denselben** Code-Pfad (`setAlign`/`isAlignActive`,
dieselbe Knoten-Attribut-Definition, dieselbe DOCX-/ODT-Mapping-Tabelle) realisiert
sind, lässt sich „links" nicht vollständig isoliert verifizieren — die Testfälle unten
prüfen deshalb an mehreren Stellen bewusst auch den **Wechsel weg von** und **zurück
zu** links (z. B. zentriert → links), weil genau dieser Übergang der eigentliche
Nachweis ist, dass der Button „Links" nicht nur zufällig den ohnehin bestehenden
Default-Zustand anzeigt, sondern aktiv wirkt.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „⇤" (Linksbündig) | Absatzformatierungs-Gruppe der Toolbar, erster von vier Ausrichtungs-Buttons, direkt nach dem Trenner hinter den Zeichenformat-Buttons | Vorhanden (`Toolbar.tsx:185`), `title="Ausrichtung: left"`, **kein** `aria-label` | Muss per Maus-Klick (mousedown, Selektion darf nicht verloren gehen) den/die alignierbaren Absätze der aktuellen Selektion linksbündig setzen; `title`/`aria-label` sollten konsistent zu den übrigen Buttons lokalisiert sein („Linksbündig ausrichten" statt technischem „Ausrichtung: left") |
| 2 | Tastenkombination | — | **Nicht vorhanden.** Kein `Mod-l`/`Ctrl+L`-Eintrag in der Keymap (`WordEditor.tsx`), obwohl Word/LibreOffice standardmäßig Strg+L für Linksbündig verwenden | Zu klären: Ist das Fehlen bewusst (nicht im Scope) oder eine fehlende Funktion? Für diese Anforderung als **offener Punkt** dokumentiert, nicht stillschweigend übergangen |
| 3 | Visueller Aktiv-Zustand des Buttons | Toolbar | `aria-pressed` abhängig von `isAlignActive(state, 'left')` (`Toolbar.tsx:65`, `commands.ts:29-38`) — prüft **nur** den nächsten alignierbaren Vorfahren von `$from`, nicht die gesamte Selektion | Muss korrekt anzeigen, ob der Absatz/die Überschrift an der aktuellen Cursor-Position linksbündig ist; bei Selektion über mehrere Absätze mit gemischter Ausrichtung siehe Grenzfall 4.4 |
| 4 | Icon „⇤" | Toolbar-Button | Unicode-Pfeilsymbol, kein SVG (`Toolbar.tsx:185`, Label `"⇤"`) | Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17, Zeile 4 und Abschnitt 20.1 als generelles Icon-Rendering-Risiko dokumentiert: Muss auf Systemen ohne verlässliche Unicode-Pfeil-Glyphen weiterhin eindeutig als „Linksbündig" erkennbar sein (aktuell nur über `title`, keine visuell redundante Beschriftung) |
| 5 | Absatzformat-Dropdown (Standard/Überschrift 1–6) | Toolbar, separates Element (`Toolbar.tsx`, `currentHeadingLevel`/`setHeading`) | Wechsel der Formatvorlage setzt Ausrichtung implizit auf „links" zurück (siehe Referenztabelle oben, `commands.ts:40-55`) | Nebenwirkung ist zu dokumentieren und mit Testfall abzusichern (siehe Grenzfall 4.9); nicht Teil des „Links"-Buttons selbst, aber ein Weg, wie „links" ungewollt/unbemerkt entsteht |
| 6 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden | Kein Soll-Bestandteil dieser Anforderung (nicht in Backlog gefordert) — nur dokumentieren, falls in der Anwendung generell ein Kontextmenü existiert und „Ausrichtung" dort fehlt |
| 7 | Lineal-Klick/Tabstopp-Interaktion | — | Nicht vorhanden (Lineal fehlt laut Backlog komplett, `lineal-anzeigen` Status „fehlt") | Kein Soll-Bestandteil dieser Anforderung |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden ohne Selektion (Cursor in einem Absatz)
- Cursor irgendwo in einem Absatz oder einer Überschrift (keine Textselektion nötig,
  da die Ausrichtung eine **Block-**, keine Zeicheneigenschaft ist) → Klick auf „Links"
  → der **gesamte umschließende Absatz/die Überschrift** wird linksbündig, unabhängig
  von der genauen Cursor-Position innerhalb des Absatzes.
- Ist der Absatz bereits linksbündig, ändert ein erneuter Klick nichts sichtbar (siehe
  3.3 — kein Toggle, reines, idempotentes Setzen).

### 3.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften hinweg
- Eine Selektion, die zwei oder mehr Absätze/Überschriften ganz oder teilweise
  einschließt, setzt **alle** davon betroffenen Blöcke auf linksbündig
  (`commands.ts:17-24`, `state.doc.nodesBetween(from, to, ...)` iteriert jeden
  alignierbaren Knoten im Bereich, nicht nur den ersten).
- Ein Absatz gilt bereits dann als „betroffen", wenn die Selektion auch nur ein
  einziges Zeichen (oder den Absatzübergang) innerhalb seines Bereichs berührt —
  analog zum Standardverhalten von Word/LibreOffice bei Absatzformaten.

### 3.3 Kein Toggle — reines Setzen (wichtiger Unterschied zu Zeichenformaten wie Fett)
- Im Unterschied zu Fett/Kursiv/Unterstrichen/Durchgestrichen (die echte Marks mit
  Toggle-Semantik sind) ist Ausrichtung ein **Knoten-Attribut mit genau einem
  Wert zur Zeit** — es gibt keinen Zustand „keine Ausrichtung"; jeder Absatz/jede
  Überschrift hat immer genau eine von vier Ausrichtungen, defaultmäßig „links"
  (`schema.ts:4`).
- Klick auf „Links" bei bereits linksbündigem Absatz entfernt **nichts** und macht die
  Ausrichtung nicht „unbestimmt" — es bleibt bei „links" (idempotent, kein Aus-Zustand
  wie bei einem Mark-Toggle).
- Das ist explizit zu verifizieren und zu dokumentieren, damit „Ausrichtung links"
  nicht fälschlich nach dem Fett/Unterstrichen-Muster (Toggle) getestet wird.

### 3.4 Anzeige des aktiven Zustands
- Steht der Cursor (ohne Selektion) in einem linksbündigen Absatz/einer linksbündigen
  Überschrift, zeigt der „Links"-Button sofort `aria-pressed="true"` — ohne Klick,
  allein durch Cursor-Bewegung.
- Bewegt sich der Cursor in einen anders ausgerichteten Absatz, wechselt der Button
  unmittelbar zurück auf `aria-pressed="false"`.
- Da `isAlignActive` (`commands.ts:29-38`) nur den nächsten alignierbaren Vorfahren von
  `$from` prüft: Bei einer Selektion über mehrere Absätze mit **gemischter**
  Ausrichtung zeigt der Button den Zustand **des Absatzes am Selektionsanfang**, nicht
  einen kombinierten/unbestimmten Zustand — zu verifizieren, ob das nachvollziehbar
  bleibt (siehe Grenzfall 4.4).

### 3.5 Gültigkeitsbereich: nur Absätze und Überschriften
- Ausrichtung gilt ausschließlich für Knoten vom Typ `paragraph` und `heading`
  (`alignableTypes`, `commands.ts:10`). Andere Blockelemente (Tabellen als Ganzes,
  Bilder als eigenständige Inline-Knoten außerhalb eines Absatzes) besitzen selbst kein
  `align`-Attribut — die Anforderung bezieht sich nur auf **Textabsätze**, inklusive
  Absätzen innerhalb von Listenpunkten und Tabellenzellen (dort sind es weiterhin
  `paragraph`-Knoten).
- Ist die Selektion so gewählt, dass **kein** alignierbarer Knoten im Bereich liegt
  (z. B. Selektion, die exakt nur ein eigenständiges Bild ohne umgebenden Text
  trifft), liefert `setAlign` `false` zurück (`commands.ts:25-26`, `applicable` bleibt
  `false`) — die Aktion darf dann sichtbar nichts tun, aber auch keinen Fehler werfen.

### 3.6 Zusammenspiel mit Listen
- Absätze innerhalb von Listenpunkten (`list_item` → `paragraph`) sind ebenfalls
  alignierbar; „Links" auf einen Listenpunkt angewendet ändert die Textausrichtung
  innerhalb des Punktes, ohne die Listenstruktur (Aufzählungszeichen/Nummerierung)
  zu beeinflussen.
- Rundreise (DOCX: `writer.ts:100-104` übergibt `numPr` unabhängig vom `align`-Wert;
  ODT: `blockToOdt` „paragraph"-Fall verwendet denselben Stil-Namen unabhängig davon,
  ob der Absatz in einer Liste steht) muss Ausrichtung **und** Listenzugehörigkeit
  gemeinsam erhalten (siehe Grenzfall 4.7).

### 3.7 Zusammenspiel mit Tabellenzellen
- Absätze innerhalb von Tabellenzellen sind ebenfalls alignierbar. Eine Selektion, die
  sich über mehrere Zellen erstreckt (ProseMirror-`CellSelection` aus
  `prosemirror-tables`), liefert für `state.selection.from`/`.to` Positionswerte, die
  den **gesamten Dokumentbereich zwischen erster und letzter selektierter Zelle**
  überspannen können — inklusive dazwischenliegender Zellen, die bei einer
  rechteckigen, aber nicht vollzeiligen Auswahl **nicht** Teil der eigentlich
  markierten Zellgruppe sind. Da `setAlign` ungeprüft `nodesBetween(from, to)` über
  den gesamten Bereich anwendet (`commands.ts:17`), ist zu verifizieren, ob dabei
  versehentlich auch Absätze in nicht ausgewählten Zellen mit-ausgerichtet werden
  (siehe Grenzfall 4.8) — kein unterstellter Fehler, aber ein konkret zu prüfender
  Punkt, da der Code keine Sonderbehandlung für `CellSelection` enthält.

### 3.8 Kombination mit Zeichenformaten
- Linksbündige Ausrichtung ist vollständig unabhängig von Zeichenformaten (Fett,
  Kursiv, Farbe usw.) auf demselben Absatz — das Setzen der Ausrichtung darf keine
  Zeichen-Marks im Absatzinhalt verändern oder entfernen.

### 3.9 Undo/Redo
- Anwenden von „Links" (auch wenn der Absatz bereits links war, siehe 3.3) erzeugt
  einen Undo-Schritt sobald sich mindestens ein Knotenattribut tatsächlich geändert
  hat. Zu verifizieren: Erzeugt ein Klick auf „Links" bei einem **bereits**
  linksbündigen Absatz trotzdem eine leere Transaktion/einen leeren Undo-Schritt
  (potenzieller „nutzloser" Eintrag in der Undo-Historie), oder wird in diesem Fall gar
  keine Transaktion dispatcht? `commands.ts:21` ruft `setNodeAttribute` unabhängig vom
  vorherigen Wert auf — vermutlich wird auch beim Setzen des bereits vorhandenen Werts
  eine (wirkungslose, aber vorhandene) Transaktion erzeugt. Zu bestätigen.
- Undo nach einer echten Ausrichtungsänderung (z. B. zentriert → links) macht exakt
  diesen einen Schritt rückgängig (Absatz wird wieder zentriert), Redo stellt „links"
  wieder her.

---

## 4. Grenzfälle

1. **Neuer, unberührter Absatz:** Ist per Definition bereits linksbündig
   (Schema-Default `align: 'left'`, `schema.ts:4`) — ein Testfall muss explizit
   nachweisen, dass dieser Default korrekt ist, ohne dass jemals der „Links"-Button
   gedrückt wurde (Abgrenzung zu einem Bug, bei dem zufällig alles links aussieht, aber
   kein Attribut tatsächlich gesetzt ist).
2. **Klick auf „Links" bei bereits linksbündigem Absatz:** Keine sichtbare Änderung
   (idempotent, siehe 3.3); zu verifizieren, ob dabei unnötig ein Undo-Schritt erzeugt
   wird (siehe 3.9).
3. **Wechsel zentriert/rechts/Blocksatz → links und zurück:** Muss beliebig oft
   wiederholbar sein, ohne dass Text oder andere Formatierung verloren geht; jeder
   Wechsel ist einzeln per Undo rückgängig machbar.
4. **Selektion mit gemischter Ausgangsausrichtung** (z. B. Absatz 1 zentriert,
   Absatz 2 bereits links) → Klick auf „Links" setzt **beide** auf links
   (`nodesBetween` erfasst beide, `commands.ts:17-24`); der Button-Zustand vor dem
   Klick zeigt nur den Zustand von Absatz 1 (Selektionsanfang) — zu verifizieren, dass
   das Ergebnis nach dem Klick trotzdem korrekt **beide** Absätze erfasst, auch wenn
   die Anzeige vor dem Klick ggf. nicht den Zustand von Absatz 2 widerspiegelte.
5. **Cursor exakt an einer Absatzgrenze** (z. B. ganz am Ende von Absatz 1, direkt vor
   Absatz 2, unterschiedliche Ausrichtung) → eindeutig festlegen, welcher der beiden
   Absätze als „aktueller" für die Button-Zustandsanzeige gilt (ProseMirror-Standard:
   `$from.depth`-Traversal nach oben ausgehend vom durch die Selektion definierten
   Elternknoten) — mit Testfall nachweisen, nicht nur annehmen.
6. **Selektion, die ausschließlich ein eigenständiges Inline-Element ohne Text
   trifft** (z. B. ein Bild als einziger Inhalt eines Absatzes, Cursor/Selektion exakt
   darauf): Der umschließende Absatz ist weiterhin alignierbar (Bild steckt in einem
   `paragraph`-Knoten) — „Links" muss trotzdem wirken und darf nicht fälschlich
   `false`/keine Wirkung zurückgeben, nur weil kein Text markiert ist.
7. **Ausrichtung + Liste kombiniert:** Linksbündiger Text in einem Listenpunkt,
   danach die Liste aufgehoben (`liste-aufheben`) → Ausrichtung bleibt auf dem
   entstehenden normalen Absatz erhalten (keine Rücksetzung auf einen anderen
   Default durch die Umwandlung).
8. **Ausrichtung über eine Tabellen-Zellgrenze hinweg (siehe 3.7):** Rechteckige,
   nicht vollzeilige Zellauswahl über mehrere Spalten/Zeilen → verifizieren, ob
   `setAlign` nur die tatsächlich markierten Zellen erfasst oder (aufgrund von
   linearer `nodesBetween`-Traversal ohne `CellSelection`-Sonderbehandlung)
   versehentlich auch dazwischenliegende, nicht markierte Zellen mit-ausrichtet.
   Konkret mit einem Testfall zu belegen (z. B. 3×3-Tabelle, nur die mittlere Spalte
   markiert, „Links" anwenden, prüfen, ob Spalte 1 und 3 unverändert bleiben).
9. **Formatvorlagen-Wechsel setzt Ausrichtung implizit zurück:** Ein zentrierter/
   rechtsbündiger/Blocksatz-Absatz wird über das Formatvorlagen-Dropdown zu
   „Überschrift 1" (oder umgekehrt von Überschrift zu „Standard") gewechselt →
   laut `commands.ts:40-55` wird die Ausrichtung dabei **stillschweigend auf „links"
   zurückgesetzt**, unabhängig vom „Links"-Button. Das muss als bewusstes,
   dokumentiertes Verhalten bestätigt werden (oder als Fehler markiert, falls
   Nutzer:innen erwarten, dass die Ausrichtung beim Formatwechsel erhalten bleibt) —
   nicht stillschweigend unverifiziert bleiben, da es der naheliegendste Weg ist, wie
   ein Absatz **ungewollt** linksbündig wird.
10. **Reale Fremddatei mit ODF-Werten `start`/`end` statt `left`/`right`:** Der
    ODT-Reader übernimmt `fo:text-align` unverändert in die `paragraphAligns`-Map
    (`reader.ts:64-65`) ohne Normalisierung. Eine mit LibreOffice/einem anderen
    ODF-Werkzeug erzeugte reale Datei, die (spezifikationskonform) `start` für
    „logisch am Zeilenanfang" statt des wörtlichen `left` schreibt, würde intern als
    `align: 'start'` im Dokument landen. Auswirkung zu verifizieren:
    - Im Editor (CSS `text-align: start`) sieht der Absatz visuell weiterhin linksbündig
      aus (in einem LTR-Dokument).
    - Der „Links"-Button zeigt **keinen** aktiven Zustand (`isAlignActive` vergleicht
      strikt auf `=== 'left'`, `commands.ts:34`), obwohl der Absatz optisch linksbündig
      erscheint — potenziell verwirrend für Nutzer:innen.
    - Beim Export (DOCX **und** ODT) fällt der unbekannte Wert `'start'` in beiden
      Writern auf den Default „links" zurück (`writer.ts` DOCX `JC_BY_ALIGN[align] ??
      'left'`; ODT `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left`)
      — Inhalt bleibt also korrekt linksbündig erhalten, aber der interne Attributwert
      wird beim Reimport nicht auf den kanonischen Wert `'left'` normalisiert. Muss mit
      einer echten Testdatei nachgestellt und das Ergebnis hier dokumentiert werden.
11. **DOCX-Fremddatei mit `w:jc`-Werten `start`/`end`/`distribute` statt
    `left`/`right`/`both`:** Analog zu Grenzfall 10 — `JC_TO_ALIGN` (`reader.ts:13`)
    kennt nur `left`/`center`/`right`/`both`; jeder andere Wert (inklusive komplett
    fehlendem `<w:jc>`) fällt über `?? 'left'` auf „links" zurück. Zu verifizieren:
    Führt das bei einer Datei mit `w:jc w:val="distribute"` (Verteilter Blocksatz,
    in Word ein eigener, von Blocksatz verschiedener Modus) zu einer stillschweigend
    falschen Darstellung als „links" statt einer sinnvolleren Näherung (z. B.
    Blocksatz)? Kein Blocker für „Ausrichtung links" selbst, aber relevant, weil damit
    Dokumente fälschlich als „bereits korrekt links" erscheinen könnten, obwohl das
    Original etwas anderes war.
12. **Fehlendes `w:jc`-Element ganz allgemein** (Absatz ohne jede explizite
    Ausrichtungsangabe, was in realen Word-Dateien der Normalfall für linksbündige
    Absätze ist): Muss korrekt als „links" interpretiert werden (`reader.ts:151`,
    Fallback `?? 'left'` bereits vor dem Mapping) — Regressionsgefahr, falls diese
    Fallback-Kette künftig verändert wird.
13. **Sehr viele Absätze in einer Selektion (Strg+A über ein langes Dokument),
    „Links" anwenden:** Kein Performance-Einbruch, keine JS-Exception, alle Absätze
    tatsächlich betroffen (Stichprobenprüfung am Anfang, in der Mitte und am Ende des
    Dokuments).
14. **Zusammenspiel mit dem bekannten Selection-Sync-Bug** (siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Alles auswählen → „Links" anwenden → per
    Klick neu positionieren → Enter → weitertippen — beide entstehenden Absätze müssen
    erhalten bleiben **und** weiterhin korrekt linksbündig sein. Da Abschnitt 2 bisher
    nur „Fett" als Auslöser-Beispiel nennt, ist zu prüfen, ob derselbe Bug-Pfad auch
    mit einer Absatzformat-Aktion wie „Links" reproduzierbar ist.
15. **Fokus-Erhalt nach Klick auf den Toolbar-Button:** `AlignButton` verwendet
    ebenfalls `onMouseDown` mit `preventDefault()` (`Toolbar.tsx:71-72`) — zu
    verifizieren, dass der Editor nach dem Klick fokussiert bleibt und die
    ursprüngliche Cursor-Position/Selektion erhalten bleibt (kein Sprung).
16. **Fehlendes `aria-label`:** Im Unterschied zu `MarkButton` (Fett/Kursiv/
    Unterstrichen/Durchgestrichen) hat `AlignButton` nur ein `title`-Attribut, kein
    `aria-label` (`Toolbar.tsx:64-84` vs. `:44-52`). Für Screenreader-Nutzer:innen
    ist zu prüfen, ob `title` allein als zugänglicher Name ausreichend vorgelesen wird
    oder ob das eine echte Barrierefreiheits-Lücke ist, die zu schließen ist.

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt: Datei mit linksbündigem Absatz/
linksbündiger Überschrift hochladen (bzw. im Editor erzeugen, ggf. nach vorherigem
Zentrieren/Rechtsbündig-Setzen wieder auf links zurückgesetzt) → unverändert
exportieren → Ergebnis erneut importieren → Ausrichtung ist an exakt derselben
Textstelle weiterhin „links", kein sonstiger Inhaltsverlust.

### 5.1 DOCX
1. **Eigenrundreise, Absatz:** Im Editor einen Absatz eingeben, explizit zentrieren,
   dann wieder auf „Links" zurücksetzen, als DOCX exportieren, erneut importieren →
   Absatz ist weiterhin linksbündig (nicht nur zufällig linksbündig, weil es der
   Default ist — der Test muss den expliziten Rückweg über „zentriert → links"
   nehmen, um echten Nachweis zu erbringen, siehe Abschnitt 1).
2. **Eigenrundreise, Überschrift:** Dieselbe Prüfung für eine Überschrift-Ebene 1–6
   (bereits als Unit-Test vorhanden, `roundtrip.test.ts:41-45`, hier zusätzlich per
   echter Toolbar-Bedienung im Browser nachzustellen).
3. **Absatz ohne jede explizite Formatierung (reiner Default):** Als DOCX exportieren
   → mit einem unabhängigen Parser (z. B. python-docx oder direktes Parsen von
   `word/document.xml`) verifizieren, was tatsächlich geschrieben wird
   (`paragraphPropsXml`, `writer.ts:67-69`, schreibt **immer** `<w:jc w:val="left"/>`,
   auch beim Default — kein weggelassenes Element). Zu bestätigen, dass ein externer
   Parser (Word, LibreOffice) dieses explizite `w:jc w:val="left"` genauso als
   „links" interpretiert wie das Fehlen des Elements.
4. **Absatz in einem Listenpunkt, linksbündig:** Rundreise erhält sowohl Ausrichtung
   als auch Listenzugehörigkeit/-nummerierung gemeinsam (siehe Grenzfall 4.7).
5. **Cross-Format:** ODT mit linksbündigem Text importieren → als DOCX exportieren →
   Ausrichtung bleibt „links".
6. **Reale, komplexe Fremddatei** (nicht mit diesem Editor erzeugt, aus einem
   Open-Source-Testkorpus, z. B. python-docx-Testfixtures) mit überwiegend
   linksbündigem Text (Normalfall ohne explizites `w:jc` oder mit explizitem
   `w:jc w:val="left"`) importieren → alle betroffenen Absätze werden korrekt als
   „links" erkannt, siehe Grenzfall 4.12.
7. **Reale Fremddatei mit `w:jc w:val="start"`** (falls auftreibbar, z. B. aus neueren
   Word-Versionen oder LibreOffice-Export) → Ergebnis gemäß Grenzfall 4.11
   dokumentieren.

### 5.2 ODT
1. **Eigenrundreise, Absatz:** Im Editor einen Absatz eingeben, zentrieren, wieder auf
   „Links" zurücksetzen, als ODT exportieren, erneut importieren → Absatz referenziert
   nach Re-Import wieder (ggf. unter neu vergebenem, aber inhaltlich gleichwertigem
   Stilnamen) einen Stil mit `fo:text-align="left"` (`styleRegistry.ts:61-66,
   68-75`) → im internen Modell `align: 'left'`.
2. **Eigenrundreise, Überschrift:** Dieselbe Prüfung für eine Überschrift-Ebene 1–6
   (bereits als Unit-Test vorhanden, `roundtrip.test.ts:41-45`; Stilname
   `Heading{level}-left`, `styleRegistry.ts:80-82`).
3. **Zwei unterschiedliche linksbündige Textläufe im selben Dokument:** Beide
   referenzieren denselben vorab deklarierten Stil `Ppara-left`
   (`paragraphAlignStyleDefs`, `styleRegistry.ts:68-75`) — keine unnötige
   Stil-Duplizierung, Rundreise bestätigt beide weiterhin als „links".
4. **Absatz in einem Listenpunkt, linksbündig:** Rundreise erhält Ausrichtung und
   Listenzugehörigkeit gemeinsam.
5. **Cross-Format:** DOCX mit linksbündigem Text importieren → als ODT exportieren →
   Ausrichtung bleibt „links".
6. **Reale, komplexe Fremddatei** (z. B. aus einem Open-Source-ODT-Testkorpus oder
   eine mit echtem LibreOffice Writer erzeugte Datei) mit linksbündigem Text
   importieren → korrekt als „links" erkannt, unabhängig davon, ob die Datei `left`
   oder (spezifikationskonform) `start` verwendet — Ergebnis gemäß Grenzfall 4.10
   dokumentieren.
7. **Absatz ganz ohne referenzierten Stil / ohne `style:paragraph-properties`**
   (in freier Wildbahn nicht selten, wenn der Absatz nur die geerbte
   `Standard`-Formatvorlage nutzt): `paragraphAligns.get(styleName)` liefert
   `undefined` → Fallback `'left'` (`reader.ts:126,173`) — muss mit einer echten
   Testdatei ohne explizites Ausrichtungsattribut bestätigt werden.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit linksbündigem Text (nach vorherigem Zentrieren zurückgesetzt) → Editor →
   Export als ODT → erneuter Import → Export zurück als DOCX → Ausrichtung bleibt nach
   zwei Formatkonvertierungen weiterhin „links" an exakt derselben Textstelle.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Dieselbe Prüfung mit einer Überschrift statt eines normalen Absatzes.

---

## 6. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

Bereits vorhandene, aber laut Auftrag **nicht als vertrauenswürdig geltende** Tests
(müssen im Rahmen dieser Verifikation erneut geprüft und um echte Browser-Bedienung
ergänzt werden, da bisher **ausschließlich** Unit-Tests mit konstruierten
ProseMirror-JSON-Daten existieren):
- `src/formats/docx/__tests__/roundtrip.test.ts:41-45,48-53` — Heading- und
  Absatz-Ausrichtung, konstruierte Testdaten.
- `src/formats/odt/__tests__/roundtrip.test.ts:41-45,48-53` — dasselbe für ODT.
- **Keine** vorhandenen E2E-Tests (`tests/e2e/*.spec.ts`) decken Ausrichtung
  überhaupt ab — vollständig neu zu schreiben.

Zusätzlich zu schreibende Testfälle, damit alle Abschnitte 2–5 dieser Anforderung
abgedeckt sind:

1. Neues Dokument, Cursor in leerem Absatz, Toolbar-Button „Links" zeigt bereits
   `aria-pressed="true"` **ohne** vorherigen Klick (Default-Nachweis, Grenzfall 4.1).
2. Absatz per Toolbar-Button „zentriert" zentrieren, danach echten Playwright-Klick
   (nicht nur Command-Aufruf) auf „Links" → Absatz sichtbar wieder linksbündig im DOM
   (`style="text-align: left"`), `aria-pressed` von „Links" wechselt auf `true`, von
   „Zentriert" auf `false`.
3. Klick auf „Links" bei bereits linksbündigem Absatz → keine sichtbare Änderung,
   Undo-Verhalten gemäß Grenzfall 4.2 protokollieren.
4. Selektion über zwei Absätze mit gemischter Ausgangsausrichtung → „Links" anwenden
   → beide Absätze sind danach linksbündig (Grenzfall 4.4).
5. Cursor an einer Absatzgrenze zwischen unterschiedlich ausgerichteten Absätzen →
   Button-Zustand gemäß Grenzfall 4.5 dokumentiert.
6. Absatz in einem Listenpunkt zentrieren, dann auf „Links" zurücksetzen, Liste
   anschließend aufheben → Ausrichtung bleibt erhalten (Grenzfall 4.7).
7. 3×3-Tabelle anlegen, nur mittlere Spalte markieren, „Links" anwenden → Spalten 1
   und 3 bleiben unverändert (Grenzfall 4.8) — kritischer Test, da aktuell keine
   `CellSelection`-Sonderbehandlung im Code erkennbar ist.
8. Absatz zentrieren, danach über das Formatvorlagen-Dropdown zu „Überschrift 1"
   wechseln, danach zurück zu „Standard" → Ausrichtung nach beiden Wechseln
   protokollieren und mit Grenzfall 4.9 abgleichen (erwartet: „links", auch wenn
   ursprünglich zentriert).
9. Undo direkt nach einer echten Ausrichtungsänderung (zentriert → links) → Absatz
   wird wieder zentriert; Redo stellt „links" wieder her.
10. Vollständiger Rundreisetest je Format (Abschnitt 5.1/5.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
    Reader/Writer-Funktionen.
11. Cross-Format-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
12. Regressionstest analog `selection-regression.spec.ts`, aber mit „Links" (bzw.
    einer Ausrichtungsänderung) als auslösendem Formatierungsschritt statt „Fett"
    (Grenzfall 4.14).
13. Import einer realen Fremddatei mit `w:jc w:val="start"` bzw.
    `fo:text-align="start"` (DOCX bzw. ODT) → Ergebnis gemäß Grenzfall 4.10/4.11
    dokumentieren, insbesondere Button-Zustand nach Import.
14. Import einer realen Fremddatei ganz ohne explizites Ausrichtungsattribut (DOCX
    ohne `w:jc`, ODT ohne referenzierten Ausrichtungsstil) → korrekt als „links"
    erkannt (Grenzfall 4.12/5.2 Testfall 7).
15. Sichtprüfung/Screenshot-Vergleich: Aussehen eines linksbündigen Absatzes im Editor
    entspricht optisch dem Aussehen nach Re-Import derselben Datei.

---

## 7. Abgrenzung: Vorhandener Unit-Test vs. geforderter Nachweis

Die bestehenden Unit-Tests `it.each(['left','center','right','justify'])('preserves
"%s" alignment', ...)` (beide `roundtrip.test.ts`-Dateien) konstruieren das
ProseMirror-JSON direkt und rufen Reader/Writer isoliert auf. Sie beweisen **nicht**,
dass:
- der Toolbar-Button „Links" tatsächlich klickbar ist und sichtbar reagiert,
- der Button-Aktiv-Zustand sich korrekt mit der Cursor-Position mitbewegt,
- ein über die UI tatsächlich zentrierter und dann wieder auf „links" zurückgesetzter
  Absatz (nicht ein von vornherein linksbündig konstruierter Testfall) beim Export
  dieselbe Struktur erzeugt wie ein nie berührter Default-Absatz,
- die in Abschnitt 4 dokumentierten Grenzfälle (insbesondere Tabellen-Zellauswahl,
  Formatvorlagen-Wechsel, ODF-Werte `start`/`end`) sich in der Praxis tatsächlich so
  verhalten wie im Code vermutet.

Diese Punkte sind der eigentliche Kern der geforderten Verifikation und müssen durch
neue oder erweiterte E2E-Tests (analog zu den für Fett/Kursiv bereits vorhandenen
Playwright-Tests) geschlossen werden, bevor der Backlog-Status von „vorhanden" auf
„verifiziert" geändert werden darf.

---

## 8. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt
sind:

1. Alle Testfälle aus Abschnitt 6 sind als automatisierte Tests vorhanden und grün.
2. Mindestens die Rundreise-Testfälle 1, 2, 6 aus Abschnitt 5.1 sowie 1, 2, 6 aus
   Abschnitt 5.2 sind mit echten, nicht selbst erzeugten Prüfwerkzeugen (unabhängiger
   Parser bzw. reale Fremddatei) bestanden.
3. Der Tabellen-Zellauswahl-Grenzfall (4.8) ist geprüft und das tatsächliche Verhalten
   (korrekt begrenzt vs. versehentlich übergreifend) ist dokumentiert; falls
   fehlerhaft, ist ein Ticket dafür angelegt.
4. Der Formatvorlagen-Wechsel-Grenzfall (4.9) ist geprüft und als bewusstes Verhalten
   bestätigt oder als zu behebender Fehler markiert.
5. Die ODF-/OOXML-Wertevarianten `start`/`end`/`distribute` (Grenzfälle 4.10/4.11)
   sind mit mindestens je einer echten Testdatei geprüft, Ergebnis hier oder in einer
   Nachfolgedatei dokumentiert.
6. Der Regressionstest für den Selection-Sync-Bug mit Ausrichtung als auslösendem
   Schritt (Grenzfall 4.14) ist dauerhaft Teil der Testsuite.
7. Das Fehlen von Tastenkombination und `aria-label` (Abschnitt 2, Zeilen 2 und 4;
   Grenzfall 4.16) ist bewusst als „nicht im Scope" bestätigt oder als nachzuliefernde
   Funktion in den Backlog aufgenommen — nicht unentschieden offen gelassen.
8. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
