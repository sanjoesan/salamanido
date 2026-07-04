# Anforderungsspezifikation: Feature „Ausrichtung rechts“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Slug `ausrichtung-rechts`, Abschnitt 2.3
„Absatzformatierung“, Priorität 1) als **vorhanden** geführt, Beschreibung dort:
„Richtet den Absatz rechtsbündig aus.“ Diese Datei ersetzt die Beschreibung nicht,
sondern macht sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt
über echte Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Ausschließlich die Absatzausrichtung „rechts“ (Attribut `align:
'right'` auf den Node-Typen `paragraph` und `heading` im gemeinsamen
ProseMirror-Schema, `src/formats/shared/schema.ts`). Die drei Geschwister-Werte
`left`/`center`/`justify` sind eigene Backlog-Einträge (`ausrichtung-links`,
`ausrichtung-zentriert`, `ausrichtung-blocksatz`) und nicht Gegenstand dieser Datei,
werden aber dort erwähnt, wo sie zur Abgrenzung nötig sind (Toggle-Verhalten
zwischen den vier Werten ist nur gemeinsam sinnvoll beschreibbar). Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim
Export eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise
(Datei hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich dem
Original). Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(dort Abschnitt 4 „Absatzformatierung“) sowie an den bereits vorliegenden
Einzel-Anforderungsdateien `specs/fett-req.md` und `specs/durchgestrichen-req.md`.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis
der Korrektheit — das ist Aufgabe der Verifikation):

| Ebene | Fundstelle | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts:4,12-16,22-30` | `alignAttr = { align: { default: 'left', validate: 'string' } }` auf `paragraph` **und** `heading` angewendet; `validate: 'string'` erlaubt **jeden** String, nicht nur die vier gültigen Werte `left`/`center`/`right`/`justify` — keine Enum-Absicherung auf Schema-Ebene. |
| Editor-Rendering | `src/formats/shared/schema.ts:15,29` | `toDOM` schreibt `style="text-align: ${node.attrs.align}"` direkt durch — ein invalider Wert würde als ungültiges CSS stillschweigend ignoriert (Browser fällt auf `text-align: start` zurück), nicht abgefangen. |
| Befehl (Setzen) | `src/formats/shared/editor/commands.ts:8-27` | `setAlign(align)` iteriert `state.doc.nodesBetween(from, to, …)`, setzt `align` auf **jeden** von der Selektion berührten `paragraph`/`heading`-Node einzeln über `setNodeAttribute`. `alignableTypes = new Set(['paragraph', 'heading'])`. |
| Befehl (Zustand) | `src/formats/shared/editor/commands.ts:29-38` | `isAlignActive(state, align)` prüft **nur** den Block an `$from` (Selektionsanfang), läuft die Tiefen von `$from.depth` abwärts bis der erste `paragraph`/`heading`-Vorfahre gefunden ist. Bei einer Selektion über mehrere Absätze mit unterschiedlicher Ausrichtung zeigt der Button nur den Zustand des **ersten** Absatzes. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx:64-84,185-188` | Vier Buttons `AlignButton` mit `label="⇤"` (links), `"↔"` (zentriert), `"⇥"` (rechts), `"≡"` (Blocksatz); `title={\`Ausrichtung: ${align}\`}` (also `title="Ausrichtung: right"` — englischer Wert im deutschen Tooltip-Text, keine Übersetzung); `aria-pressed={active}`; kein `aria-label` (nur `title`). |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx:71-79` | Nur `Mod-z`/`Mod-y`/`Mod-Shift-z` (Undo/Redo) sowie `Mod-b`/`Mod-i`/`Mod-u` (Fett/Kursiv/Unterstrichen) gebunden. **Kein Tastenkürzel für Ausrichtung rechts** (Word/LibreOffice-Standard wäre `Strg+R`). |
| DOCX-Import | `src/formats/docx/reader.ts:13,150-152` | `JC_TO_ALIGN = { left: 'left', center: 'center', right: 'right', both: 'justify' }`; liest `<w:jc w:val="…">` aus `pPr` **des Absatzes selbst**; fehlt `<w:jc>` oder ist `jcVal` nicht in der Map (z. B. `start`, `end`, `distribute`, `thaiDistribute`, `mediumKashida`, `highKashida`, `lowKashida`) → Fallback `'left'`, **unabhängig davon, was der eigentliche Wert war**. Es wird **nicht** die von der Absatzformatvorlage (`w:pStyle` → `styles.xml`) geerbte Ausrichtung berücksichtigt, wenn der Absatz selbst kein `<w:jc>` trägt. |
| DOCX-Export | `src/formats/docx/writer.ts:16,67-70,102,108` | `JC_BY_ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'both' }`; schreibt **immer** explizit `<w:jc w:val="…"/>` in `pPr`, auch für den Default `left` (keine Auslassung bei „ohnehin Standard“). Unbekannter/ungültiger `align`-Wert (z. B. durch obiges fehlendes Enum im Schema) → Fallback `'left'` beim Schreiben. |
| ODT-Import | `src/formats/odt/reader.ts:22-26,36-77,122-130,239-249` | `paragraphAligns` wird **ausschließlich** aus `office:automatic-styles` in `content.xml` (Funktionsparameter `contentStyles`) befüllt (`parseAutomaticStyles`, Zeile 62-66: liest `fo:text-align` aus `style:paragraph-properties` einer `style:style style:family="paragraph"`). Ein Absatz ohne eigenes `text:style-name` bzw. dessen referenzierter Automatik-Stil kein `fo:text-align` trägt, bekommt `'left'` als Fallback (Zeile 126: `|| 'left'`). **Es wird nicht in `office:styles` (benannte/gemeinsame Absatzformatvorlagen, z. B. in `styles.xml` oder im `office:styles`-Block von `content.xml`) nachgeschaut**, und es wird **keine** `style:parent-style-name`-Vererbungskette aufgelöst — eine Ausrichtung, die nur auf einer per Vererbung wirksamen Elternvorlage sitzt, geht beim Import verloren. |
| ODT-Export | `src/formats/odt/writer.ts:60-73`, `src/formats/odt/styleRegistry.ts:66-90` | Für jeden vorkommenden `align`-Wert wird eine eigene automatische Absatzformatvorlage erzeugt (`PARAGRAPH_ALIGN_STYLE_NAME[align]`, z. B. Name für „rechts“), referenziert über `text:style-name` auf `<text:p>`/`<text:h>`. Für Überschriften zusätzlich `headingStyleName(level, align)` (Zeile 80-81 in `styleRegistry.ts`), kombiniert mit `fo:font-weight="bold"` und Schriftgröße — **eine eigene Stildefinition pro Level-×-Ausrichtungs-Kombination**, keine Wiederverwendung/Vererbung. |
| Unit-/Roundtrip-Tests | `src/formats/docx/__tests__/roundtrip.test.ts:48-53`, `src/formats/odt/__tests__/roundtrip.test.ts:48-53` | `it.each(['left', 'center', 'right', 'justify'])('preserves "%s" alignment', …)` — Writer→eigener-Reader-Rundreise für einen einzelnen, isolierten Absatz je Wert. Prüft **nicht** Kombination mit Marks, Listen, Tabellenzellen, Kopf-/Fußzeilen, keine Fremddateien, keine der oben genannten Grenzfälle (`start`/`end`, style-vererbte Ausrichtung). |
| E2E-Tests (Browser) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` | **Kein einziger Treffer** für „align“/„Ausrichtung“/„rechts“ in beiden Dateien — es existiert **kein** E2E-Test, der den Button „Ausrichtung: right“ im Browser tatsächlich anklickt. Analog zu „Durchgestrichen“ (`specs/durchgestrichen-req.md`) ist auch hier die Absicherung ausschließlich Writer→eigener-Reader. |
| Fixture-Tests | `src/formats/docx/__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts` | **Kein Treffer** für „align“ — reale Fremddateien werden aktuell nicht auf korrekt erkannte Ausrichtung geprüft. |

**Konsequenz:** Der Backlog-Status „vorhanden“ ist für die reine Existenz des
Mechanismus (Button, Command, Reader/Writer-Zeile) zutreffend, aber unbelegt in
Bezug auf echte Browser-Bedienung, Fremddateien mit unüblichen `jc`/`text-align`-Werten,
style-vererbte Ausrichtung und Interaktion mit Listen/Tabellen/Kopf-Fußzeilen.
Abschnitt 6 dieser Datei listet die aus der Codeanalyse abgeleiteten konkreten
Verdachtsmomente, die die Verifikation gezielt prüfen muss.

---

## 1. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Ist-Verhalten laut Code | Soll-Verhalten |
|---|---|---|---|---|
| 1 | Toolbar-Button „Ausrichtung rechts“ (Glyphe „⇥“) | Formatierungsleiste, Gruppe Absatzausrichtung (nach der Farb-Gruppe, vor der Listen-Gruppe), vierter von vier Buttons nach links/zentriert/vor Blocksatz | `AlignButton` mit `align="right"`, `onMouseDown` → `preventDefault()` + `setAlign('right')`; `title="Ausrichtung: right"` (englischer Rohwert im Titel, siehe Verdachtsmoment 3) | Klick setzt die Ausrichtung **aller** vom `paragraph`/`heading`-Node abgedeckten Blöcke der aktuellen Selektion auf rechtsbündig. Muss unabhängig von Maus-Selektion, Tastatur-Selektion, Cursor ohne Selektion oder „Alles auswählen“ funktionieren. |
| 2 | Aktiv-Zustand des Buttons (`aria-pressed`) | derselbe Button | `isAlignActive(state, 'right')` prüft ausschließlich den Block an `$from` (Selektionsanfang) | Muss anzeigen, ob der Absatz an der aktuellen Cursor-Position/am Selektionsanfang rechtsbündig ist; aktualisiert sich sofort bei jeder Cursor-Bewegung, auch ohne Klick auf den Button selbst. Verhalten bei einer Selektion über mehrere Absätze mit **gemischter** Ausrichtung muss explizit festgelegt und getestet werden (siehe Grenzfall 4.2), nicht nur aus dem Code übernommen werden. |
| 3 | Icon/Beschriftung des Buttons | derselbe Button | Unicode-Glyphe „⇥“ (RIGHTWARDS ARROW TO BAR), keine Text-Alternative außer `title` | Muss auf allen Zielsystemen/Browsern eindeutig als „rechtsbündig“ von den drei Nachbar-Glyphen „⇤“/„↔“/„≡“ unterscheidbar sein; entspricht dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 4 („Ausrichtung … Pfeil-/Linien-Symbole … Rendering auf mehreren Systemen/Browsern verifizieren“) bereits vermerkten offenen Prüfauftrag. Kein `aria-label`, nur `title` — muss für Screenreader-Nutzung als ausreichend verifiziert oder ergänzt werden. |
| 4 | Tooltip/Titel-Attribut | derselbe Button | `title={\`Ausrichtung: ${align}\`}` → rendert wörtlich „Ausrichtung: right“ | **Muss korrigiert werden** auf einen durchgängig deutschen Text (z. B. „Ausrichtung: rechts“ oder „Rechtsbündig“) — der aktuelle Zustand mischt deutsche und englische Begriffe im selben Satz, was als Bug gilt, nicht als akzeptabler Zustand. |
| 5 | Tastenkürzel | Editor, global während Fokus im Dokument | **Nicht vorhanden** (`WordEditor.tsx:71-79` bindet nur Undo/Redo/Fett/Kursiv/Unterstrichen) | **Muss explizit entschieden und dokumentiert werden** (siehe Abschnitt 3.7) — Word/LibreOffice-Standard ist `Strg+R`. Diese Inkonsistenz zu Fett/Kursiv/Unterstrichen (die je ein Kürzel haben) gilt als zu klärender Punkt, nicht als bereits akzeptierter Zielzustand. |
| 6 | Absatzformat-Dropdown (Wechselwirkung) | `Toolbar.tsx:116-131` | Wechsel zwischen „Standard“ und „Überschrift 1–6“ über `setHeading(level)`; `setHeading(null)`-Zweig (zurück zu Standard) übernimmt **keine** explizite `align`-Angabe, `setHeading(level)` (Überschrift setzen) erzwingt dagegen `align: 'left'` fest (`commands.ts:43`) | Muss geprüft werden: Wechselt ein bereits **rechtsbündiger** Absatz zu „Überschrift N“, wird die Ausrichtung laut Code stillschweigend auf „links“ zurückgesetzt. **Das ist ein potenzieller Bug/unerwarteter Nebeneffekt und muss verifiziert und bewusst entschieden werden** (entweder Ausrichtung bei Formatwechsel bewusst beibehalten, oder das Zurücksetzen ist so gewollt und muss dokumentiert werden). |
| 7 | Kontextmenü/Rechtsklick-Äquivalent | — | Nicht vorhanden | Nicht gefordert (kein Rechtsklick-Kontextmenü im Scope), aber falls künftig eingeführt, muss „Ausrichtung rechts“ dort ebenfalls erscheinen. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf eine bestehende Selektion
- Text markieren (Maus-Ziehen, Doppelklick, Dreifachklick, Umschalt+Pfeil, Strg+A)
  → Klick auf „Ausrichtung rechts“ → **jeder** von der Selektion berührte Absatz
  bzw. jede berührte Überschrift wird rechtsbündig, unabhängig von der
  Selektionsmethode.
- Die Selektion muss **nicht** den ganzen Absatz umfassen — bereits eine
  Teil-Selektion innerhalb eines Absatzes genügt, damit der **gesamte** umgebende
  Absatz rechtsbündig wird (Absatzausrichtung ist eine Block-, keine
  Zeichen-Eigenschaft; das entspricht der Implementierung über
  `state.doc.nodesBetween` in `commands.ts:17`, muss aber mit Testfall bestätigt
  werden, nicht nur aus dem Code angenommen).
- Erstreckt sich die Selektion über **mehrere** Absätze/Überschriften (auch über
  Listenpunkte und Tabellenzellen hinweg, sofern diese `paragraph`/`heading`-Nodes
  enthalten): **alle** davon werden rechtsbündig, nicht nur der erste oder letzte.
- Die Aktion ist ein einzelner Undo-Schritt für die gesamte betroffene Selektion
  (ein Strg+Z macht die Ausrichtungsänderung aller betroffenen Absätze gemeinsam
  rückgängig, nicht Absatz für Absatz einzeln).

### 2.2 Anwenden ohne Textselektion (nur Cursor im Absatz)
- Cursor ohne Selektion irgendwo im Absatz positionieren → Klick auf „Ausrichtung
  rechts“ → der **gesamte umgebende Absatz** wird rechtsbündig (nicht nur ab
  Cursor-Position, da Ausrichtung eine Absatzeigenschaft ist, kein Zeichen-Mark).
- Gilt auch für einen leeren Absatz (kein Text vorhanden) — Umschalten darf nicht
  zu einem JS-Fehler führen, der Zustand muss beim späteren Eintippen sichtbar
  bereits rechtsbündig sein.

### 2.3 Umschalten zwischen den vier Ausrichtungswerten
- „Ausrichtung rechts“ ist **kein** reines Toggle wie bei Zeichen-Marks (Fett etc.),
  sondern setzt den Absatz auf genau den Wert `right` — ein linksbündiger,
  zentrierter oder Blocksatz-Absatz wird durch Klick auf „rechts“ zu rechtsbündig,
  unabhängig vom vorherigen Wert.
- **Zu klären:** Erneuter Klick auf „Ausrichtung rechts“, während der Absatz
  bereits rechtsbündig ist — muss dokumentiert festgelegt werden, ob dies (a) keine
  Änderung bewirkt (idempotent, aktuelles Codeverhalten: `setNodeAttribute` setzt
  denselben Wert erneut, erzeugt aber dennoch einen Transaktionsschritt) oder (b)
  zurück auf „links“ als Grundzustand wechselt (wie in manchen Editoren üblich).
  Aktuell laut Code: **Variante (a)**, da `setAlign` immer unbedingt setzt, ohne
  vorherigen Zustand abzufragen. Muss mit Testfall bestätigt und als Soll-Verhalten
  fixiert werden (inklusive Klärung, ob dieser „Leerlauf-Klick“ einen eigenen,
  unnötigen Undo-Schritt in der Historie erzeugt — siehe Grenzfall 4.9).

### 2.4 Kombination mit Zeichenformatierung
- Rechtsbündige Absatzausrichtung muss unabhängig von und gleichzeitig mit jeder
  Zeichenformatierung (Fett, Kursiv, Unterstrichen, Durchgestrichen, Schriftfarbe,
  Hervorhebung) auf dem enthaltenen Text funktionieren — das Setzen der Ausrichtung
  darf keine Zeichen-Marks verändern oder entfernen, und umgekehrt.

### 2.5 Interaktion mit Absatzformat-Wechsel (Standard ↔ Überschrift)
- Ein rechtsbündiger **Standard-Absatz**, der über das Dropdown zu „Überschrift N“
  gewechselt wird: laut Code (`commands.ts:43`, `setHeading`) wird beim Setzen
  einer Überschrift **immer** `align: 'left'` fest zugewiesen — die vorher gesetzte
  rechtsbündige Ausrichtung geht dabei **verloren**, unabhängig vom Nutzerwunsch.
  **Muss verifiziert werden und ist mit hoher Wahrscheinlichkeit ein Bug** (siehe
  Verdachtsmoment 6.6) — zu klären, ob das gewollt ist oder behoben werden muss.
- Umgekehrt: Eine rechtsbündige **Überschrift**, die zurück zu „Standard“
  gewechselt wird (`setHeading(null)`) — `attrs` wird dabei komplett `undefined`
  übergeben (`commands.ts:43`), das neue `paragraph`-Node fällt somit auf den
  Schema-Default `align: 'left'` zurück (`schema.ts:4`). Auch hier geht die
  rechtsbündige Ausrichtung verloren. **Muss ebenfalls verifiziert und als Bug
  oder bewusstes Verhalten dokumentiert werden.**

### 2.6 Interaktion mit Listen
- Ein Listenpunkt (Bullet oder nummeriert) muss ebenso rechtsbündig ausrichtbar
  sein wie ein normaler Absatz — der Listentext richtet sich rechtsbündig
  innerhalb der verfügbaren Zeilenbreite aus, das Aufzählungszeichen/die Nummer
  bleibt an ihrer vorgesehenen Position (Verhalten mit echtem Listen-Layout in
  Word/LibreOffice abgleichen, da rechtsbündige Listen dort ggf. ungewöhnlich
  wirken, aber technisch zulässig sind).

### 2.7 Interaktion mit Tabellen
- Eine Tabellenzelle mit rechtsbündigem Absatzinhalt: Ausrichtung gilt nur
  innerhalb der Zellbreite, keine Nebenwirkung auf Nachbarzellen oder die
  Tabellenstruktur selbst.

### 2.8 Interaktion mit Kopf-/Fußzeilen
- Sobald Kopf-/Fußzeile über die UI editierbar ist (laut
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 aktuell **fehlende** UI-Funktion, nur
  Datenmodell-seitig vorhanden): rechtsbündige Ausrichtung muss dort identisch
  funktionieren (Datenmodell-seitig sind Kopf-/Fußzeilen-Blöcke ebenfalls
  `paragraph`/`heading`-Nodes und damit technisch bereits kompatibel). Bis eine
  UI existiert, gilt dieser Fall als nicht end-to-end testbar und ist entsprechend
  zu vermerken, nicht stillschweigend auszulassen.

### 2.9 Visuelle Darstellung im Editor
- Im Editor: Absatzinhalt ist am rechten Rand der Textspalte/Seite ausgerichtet,
  linker Rand entsprechend „ausgefranst“ (kein Blocksatz-Verhalten).
- Bei mehrzeiligem, rechtsbündigem Absatz: **jede** Zeile ist einzeln rechtsbündig
  (Standard-CSS-Verhalten von `text-align: right`), nicht nur die letzte oder
  erste Zeile.

### 2.10 Undo/Redo
- Anwenden von „Ausrichtung rechts“ ist ein einzelner, eigenständiger Undo-Schritt.
- Undo direkt danach stellt exakt die vorherige Ausrichtung (nicht zwingend
  „links“, sondern den tatsächlichen vorherigen Wert — zentriert, Blocksatz oder
  links) wieder her.
- Redo stellt die rechtsbündige Ausrichtung erneut her.
- Funktioniert auch in gemischten Sequenzen (Tippen → rechtsbündig → zentriert →
  Undo mehrfach) in korrekter, umgekehrter Reihenfolge.

---

## 3. Grenzfälle

1. **Selektion über mehrere Absätze mit ursprünglich unterschiedlicher
   Ausrichtung** (z. B. erster Absatz links, zweiter bereits rechtsbündig, dritter
   zentriert) → Klick auf „Ausrichtung rechts“ muss **alle drei** einheitlich auf
   rechtsbündig setzen. `isAlignActive` (Button-Zustand) zeigt laut Code nur den
   Zustand des **ersten** Absatzes (`$from`) — muss verifiziert werden, ob das für
   Nutzer:innen irreführend ist, wenn z. B. nur der erste Absatz bereits
   rechtsbündig ist, die übrigen aber nicht, und der Button dennoch „aktiv“
   anzeigt.
2. **Selektion, die einen Absatz nur am äußersten Rand berührt** (z. B. Selektion
   endet exakt an der Grenze zum nächsten Absatz) → zu prüfen, ob der nächste
   Absatz durch `nodesBetween` fälschlich mit erfasst wird oder korrekt
   ausgeschlossen bleibt (Grenzverhalten von ProseMirror-Positionen).
3. **Cursor in einer leeren Überschrift ohne Text** → Umschalten auf rechtsbündig
   darf nicht abstürzen, muss beim späteren Eintippen sichtbar wirksam sein.
4. **Rechtsbündiger Absatz, der eine Bild-Inline-Node oder einen `hard_break`
   enthält** → Ausrichtung gilt für den gesamten Absatzinhalt inklusive Bild und
   Zeilenumbrüche, keine Sonderbehandlung.
5. **Absatzformat-Wechsel Standard → Überschrift bei bereits rechtsbündigem
   Absatz** (siehe 2.5) → vermutlicher Datenverlust der Ausrichtung, muss
   bestätigt/widerlegt und als Bug oder bewusstes Verhalten festgelegt werden.
6. **Import einer DOCX-Datei mit `<w:jc w:val="end"/>`** (in modernen,
   bidi-fähigen Word-Dokumenten alternative Schreibweise zu `right` in
   LTR-Kontext, ebenso `w:val="start"` als Alternative zu `left`): `JC_TO_ALIGN`
   (`docx/reader.ts:13`) kennt nur `left`/`center`/`right`/`both` — `end` fällt auf
   den Fallback `'left'` zurück (`?? 'left'`, Zeile 152), obwohl der **inhaltliche**
   Sinn in einem LTR-Dokument „rechtsbündig“ wäre. **Muss geprüft und ggf.
   korrigiert werden** (mindestens für den Regelfall LTR sollte `end` wie `right`
   behandelt werden, oder das Weglassen muss bewusst begründet werden).
7. **Import einer DOCX-Datei mit `<w:jc w:val="distribute"/>` oder
   `"thaiDistribute"`/`"highKashida"`/`"lowKashida"`/`"mediumKashida"`** (seltene,
   aber laut OOXML-Schema gültige Werte) → fällt ebenfalls stillschweigend auf
   `'left'` zurück. Muss mindestens **keinen Absturz** verursachen und als
   bewusster Fallback dokumentiert werden (Textinhalt darf nicht verloren gehen,
   auch wenn die exakte Ausrichtung vereinfacht wird).
8. **Import einer ODT-Datei mit `fo:text-align="end"`** (ODF-Pendant zu Fall 6) →
   `paragraphAligns` (`odt/reader.ts:64`) speichert den Rohwert `"end"` unverändert
   als `align`-Attribut im internen Modell — der Wert entspricht dann **keinem**
   der vier von `AlignButton`/`isAlignActive` erkannten Werte (`left`/`center`/
   `right`/`justify`). Folge: Button zeigt für **keine** der vier Optionen „aktiv“
   an, obwohl der Absatz visuell (CSS `text-align: end` ≈ `right` in LTR) wie
   rechtsbündig aussehen kann. **Muss geprüft und normalisiert werden**
   (`end`/`start` sollten beim Import auf `right`/`left` abgebildet werden,
   zumindest für den LTR-Regelfall dieser App).
9. **Absatz, dessen Ausrichtung nur über eine geerbte Formatvorlage
   (`w:pStyle` in DOCX bzw. `style:parent-style-name`/`office:styles` in ODT)
   wirksam ist, nicht über direkte Formatierung am Absatz selbst** → laut
   Codeanalyse (Fundstellen-Tabelle, Zeilen „DOCX-Import“/„ODT-Import“) wird diese
   Vererbung **nicht** aufgelöst; der Import fällt in beiden Formaten auf `'left'`
   zurück, selbst wenn die referenzierte Formatvorlage `right` deklariert. **Muss
   mit einer realen Fremddatei geprüft werden** (analog zum in
   `specs/fett-req.md` Grenzfall 10 dokumentierten Muster für Fett-über-Formatvorlage).
10. **Sehr lange Selektion über viele Seiten/viele Absätze** → kein spürbares
    Einfrieren der UI beim Anwenden von „Ausrichtung rechts“ auf alle betroffenen
    Absätze gleichzeitig.
11. **Wiederholtes schnelles Klicken** auf den Button → kein inkonsistenter
    Zwischenzustand (z. B. manche Absätze der Selektion rechtsbündig, andere nicht,
    durch Race Condition oder doppelte Handler-Aufrufe).
12. **Rechtsbündiger Text kombiniert mit RTL-Sprachinhalt** (z. B. arabischer oder
    hebräischer Text im Dokument) — Wechselwirkung zwischen tatsächlicher
    Schreibrichtung des Inhalts und expliziter `align: right`-Einstellung ist nicht
    Teil dieser App-Funktionalität (keine RTL-Unterstützung laut Codebasis
    erkennbar) und muss mindestens **nicht abstürzen**; volle RTL-Korrektheit ist
    kein Blocker für dieses Feature, aber der Fall darf nicht zu Datenverlust
    führen.
13. **Ungültiger `align`-Wert durch Fremdimport/Datenkorruption** (z. B. ein Wert
    wie `"foo"`, der wegen `validate: 'string'` ohne Enum-Prüfung ins Schema
    gelangen könnte, siehe Fundstelle „Datenmodell“) → Editor darf nicht abstürzen;
    `isAlignActive` gibt für alle vier bekannten Werte `false` zurück, Button zeigt
    korrekt „keiner aktiv“; Export muss einen sinnvollen Fallback schreiben
    (`JC_BY_ALIGN[align] ?? 'left'` bzw. `PARAGRAPH_ALIGN_STYLE_NAME[align] ??
    PARAGRAPH_ALIGN_STYLE_NAME.left`), nicht mit korruptem XML enden.
14. **Track-Changes-Kompatibilität (Zukunftsfall):** Änderungsverfolgung ist laut
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 noch nicht begonnen. Für die aktuelle
    Verifikation reicht die Feststellung, dass eine Ausrichtungsänderung künftig
    als eigene Art von „Formatierungsänderung“ nachverfolgbar sein müsste — keine
    Implementierung nötig, nur Dokumentation der Abgrenzung.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich A.“ Für „Ausrichtung rechts“ bedeutet
das konkret:

### 4.1 DOCX
1. **Upload unverändert:** Eine reale, außerhalb dieser App erzeugte DOCX-Datei mit
   mindestens einem rechtsbündigen Absatz importieren → **ohne jede Bearbeitung**
   sofort wieder exportieren → erneut importieren → der rechtsbündige Absatz ist
   inhaltlich (Text **und** `align: 'right'`) identisch zum Ausgangszustand.
2. **Rundreise nach eigener Bearbeitung:** Neues oder importiertes Dokument, im
   Editor einen Absatz rechtsbündig setzen → als DOCX exportieren → reimportieren
   → Ausrichtung und exakter Textinhalt bleiben erhalten.
3. Export nach DOCX validieren gegen einen vom eigenen Reader unabhängigen Parser
   (z. B. python-docx oder direktes Parsen von `word/document.xml`/OOXML-Schema-
   prüfung) → `<w:jc w:val="right"/>` korrekt im `pPr` des betroffenen Absatzes,
   kein anderer Absatz fälschlich mitbetroffen.
4. Rechtsbündiger Absatz, der eine Absatzgrenze/Zeilenumbruch (`hard_break`)
   einschließt → Ausrichtung bleibt für den ganzen Absatz inkl. beider Seiten des
   Umbruchs erhalten.
5. Rechtsbündige Überschrift (Ebene 1–6) → Rundreise erhält sowohl `align: 'right'`
   als auch das korrekte Heading-Level gemeinsam.
6. Rechtsbündiger Absatz in einer Tabellenzelle → Rundreise erhält Zuordnung zur
   richtigen Zelle, keine Nebenwirkung auf Nachbarzellen.
7. Rechtsbündiger Listenpunkt (Bullet **und** nummeriert) → Rundreise erhält sowohl
   Ausrichtung als auch Listenzugehörigkeit/Nummerierung.
8. Reale, komplexe Fremddatei (nicht mit diesem Editor erzeugt, z. B. aus einem
   Open-Source-Testkorpus) mit mindestens einem rechtsbündigen Absatz importieren
   → Ausrichtung bleibt sichtbar erhalten, kein Textverlust.
9. Reale Fremddatei mit `<w:jc w:val="end"/>` (Grenzfall 3.6) → Ergebnis nach
   Import muss dokumentiert festgelegtes Verhalten zeigen (idealerweise als
   „rechts“ erkannt in LTR-Kontext).

### 4.2 ODT
1. **Upload unverändert:** Eine reale ODT-Datei (idealerweise aus echtem
   LibreOffice Writer erzeugt, nicht nur aus dieser App selbst) mit mindestens
   einem rechtsbündigen Absatz importieren → **ohne jede Bearbeitung** sofort
   wieder exportieren → erneut importieren → Ausrichtung und Textinhalt identisch
   zum Ausgangszustand.
2. **Rundreise nach eigener Bearbeitung:** Im Editor einen Absatz rechtsbündig
   setzen, als ODT exportieren → `content.xml` enthält eine automatische
   Absatzformatvorlage mit `fo:text-align="right"` (`style:family="paragraph"`),
   referenziert über `text:style-name` auf dem betroffenen `<text:p>`.
3. Zwei unterschiedliche Absätze mit dergleichen Ausrichtung `right` im selben
   Dokument → Stilregistrierung dedupliziert nach Möglichkeit auf eine gemeinsame
   Stildefinition (zu verifizieren anhand von `styleRegistry.ts`), Rundreise
   bestätigt, dass beide weiterhin rechtsbündig sind.
4. Rechtsbündige Überschrift (Ebene 1–6) → eigener Stil `Heading{level}-right`
   (`styleRegistry.ts:80-81`) korrekt erzeugt und beim Reimport wieder als
   rechtsbündige Überschrift des richtigen Levels erkannt.
5. Rechtsbündiger Absatz in einer Tabellenzelle → Rundreise erhält Zuordnung.
6. Rechtsbündiger Listenpunkt (Bullet **und** nummeriert) → Rundreise erhält
   Ausrichtung und Listenstruktur gemeinsam.
7. Reale, komplexe Fremddatei (z. B. aus einem Open-Source-ODT-Testkorpus) mit
   mindestens einem rechtsbündigen Absatz importieren → Ausrichtung sichtbar
   erhalten.
8. Reale Fremddatei mit `fo:text-align="end"` (Grenzfall 3.8) → Ergebnis nach
   Import muss dokumentiert festgelegtes Verhalten zeigen.
9. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema →
   `fo:text-align="right"` korrekt vorhanden und korrekt referenziert.

### 4.3 Cross-Format-Rundreise
1. DOCX mit rechtsbündigem Absatz importieren → als ODT exportieren → Ausrichtung
   bleibt erhalten (`fo:text-align="right"` korrekt aus dem internen `align:
   'right'` erzeugt, unabhängig vom Ursprungsformat).
2. ODT mit rechtsbündigem Absatz importieren → als DOCX exportieren → Ausrichtung
   bleibt erhalten (`<w:jc w:val="right"/>`).
3. **Doppelte Cross-Format-Rundreise** (DOCX → ODT → DOCX) an einem Dokument mit
   rechtsbündigem Absatz **kombiniert** mit Fett/Kursiv/Farbe und innerhalb einer
   Überschrift → kein kumulativer Verlust der Ausrichtungsinformation über zwei
   Konvertierungen hinweg.
4. Dieselbe Prüfung mit Startpunkt ODT (ODT → DOCX → ODT).

---

## 5. Menü-/Toolbar-Zusammenhang (Bezug zu FEATURE-SPEC-DOCX-ODT.md)

Entspricht Zeile 4 der Tabelle in Abschnitt 17 des Hauptdokuments:
„Ausrichtung (links/zentriert/rechts/Blocksatz) — vorhanden, Pfeil-/Linien-Symbole —
Rendering auf mehreren Systemen/Browsern verifizieren.“ Diese Anforderungsdatei löst
diesen offenen Prüfauftrag für den Teilaspekt „rechts“ konkret auf: Testfälle 7.1–7.6
unten decken das Icon-Rendering-Risiko ab.

---

## 6. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Diese Liste benennt konkrete, aus dem Quellcode abgeleitete Verdachtspunkte, die die
QA-Verifikation **gezielt** widerlegen oder bestätigen muss — sie ersetzt nicht die
vollständige Testabdeckung aus Abschnitt 7, sondern lenkt die Priorität:

1. **DOCX-Import ignoriert `w:val="end"`/`"start"`/`"distribute"` bei `<w:jc>`**
   (`docx/reader.ts:13,152`) — potenzieller Bug bei echten, außerhalb dieser App
   erzeugten Dateien, die diese alternativen, gültigen OOXML-Werte verwenden.
   Bisherige Tests decken das nicht ab, da der eigene Writer diese Werte nie
   erzeugt.
2. **ODT-Import übernimmt `fo:text-align="end"`/`"start"` unnormalisiert**
   (`odt/reader.ts:64,126`) — Wert landet unverändert im internen Modell und wird
   von keinem der vier UI-Buttons als „aktiv“ erkannt, obwohl visuell ggf.
   äquivalent zu rechts/links.
3. **Keine Vererbung von Ausrichtung aus Formatvorlagen** (`office:styles`/
   `style:parent-style-name` in ODT, `w:pStyle` → `styles.xml` in DOCX) — Absätze,
   die Ausrichtung nur indirekt über eine Vorlage erhalten, werden beim Import auf
   `'left'` reduziert (siehe Grenzfall 9, analog zu `specs/fett-req.md` Grenzfall
   10 für Fettdruck-über-Formatvorlage).
4. **`setHeading` erzwingt `align: 'left'` beim Setzen einer Überschrift, verwirft
   `align: undefined` (→ Schema-Default `'left'`) beim Zurücksetzen zu Standard**
   (`commands.ts:43`) — ein bereits rechtsbündiger Absatz verliert seine
   Ausrichtung bei jedem Wechsel des Absatzformat-Dropdowns in beide Richtungen.
   **Hohe Priorität**, da dies ein alltäglicher Bedienschritt ist (Nutzer:in setzt
   zuerst Ausrichtung, ändert dann das Format, oder umgekehrt).
5. **`isAlignActive` wertet nur `$from` aus, nicht die gesamte Selektion**
   (`commands.ts:29-38`) — bei einer mehrteiligen Selektion mit gemischter
   Ausrichtung zeigt der Button ggf. ein irreführendes Bild, analog zum in
   `specs/durchgestrichen-req.md` Grenzfall 11 dokumentierten Muster für
   `aria-pressed` bei Marks.
6. **Kein Tastenkürzel** (`Strg+R`-Äquivalent fehlt) — Inkonsistenz zu den drei
   zeichenformatierenden Nachbar-Funktionen mit Kürzel (Fett/Kursiv/Unterstrichen),
   ungeklärt ob gewollt.
7. **Tooltip-Text mischt Deutsch und Englisch** (`title="Ausrichtung: right"`,
   `Toolbar.tsx:69`) — sichtbarer, leicht behebbarer Lokalisierungsfehler.
8. **Kein Enum/keine Validierung des `align`-Attributs im Schema** (`validate:
   'string'`, `schema.ts:4`) — theoretisch kann jeder String als Ausrichtung ins
   Dokument gelangen (z. B. durch einen fehlerhaften Import-Pfad oder manuell
   konstruiertes JSON), ohne dass das Schema dies verhindert; Fallback-Verhalten
   beim Export ist vorhanden (`?? 'left'`), aber ungetestet für diesen Fall.
9. **Kein E2E-Test über echte Toolbar-Bedienung** — anders als „Fett“
   (`tests/e2e/docx.spec.ts`) existiert für keinen der vier Ausrichtungs-Buttons,
   also auch nicht für „rechts“, ein Test, der den Button tatsächlich im Browser
   klickt. Bisherige Absicherung ist ausschließlich Writer→eigener-Reader
   (`roundtrip.test.ts`).
10. **Keine Fixture-Tests mit realen Fremddateien** — weder `external-fixtures.test.ts`
    (DOCX) noch das ODT-Äquivalent prüfen aktuell irgendeine Ausrichtung, auch
    nicht „rechts“.
11. **Icon „⇥“ ohne `aria-label`** — nur `title`, was von manchen Screenreadern
    anders behandelt wird als `aria-label`; zu verifizieren, ob das ausreichend
    zugänglich ist (analog zum generellen Icon-Rendering-Vorbehalt aus
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1).

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

1. Text markieren (Maus-Ziehen) → „Ausrichtung rechts“ klicken → Absatz sichtbar
   rechtsbündig, `aria-pressed` wechselt auf `true`.
2. Text markieren (Doppelklick = Wort) → „Ausrichtung rechts“ → der **gesamte**
   umgebende Absatz wird rechtsbündig, nicht nur das Wort.
3. Text markieren (Dreifachklick = Absatz) → „Ausrichtung rechts“ → Absatz
   rechtsbündig.
4. „Alles auswählen“ (Strg+A) bei mehreren Absätzen unterschiedlicher
   Ausgangsausrichtung → „Ausrichtung rechts“ → **alle** Absätze rechtsbündig,
   inkl. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (danach
   Klick-Neupositionierung + Enter + Tippen → beide entstehenden Absätze bleiben
   erhalten und rechtsbündig).
5. Cursor ohne Selektion im Absatz → „Ausrichtung rechts“ → gesamter Absatz wird
   rechtsbündig (nicht nur ab Cursor-Position).
6. Cursor in leerem Absatz → „Ausrichtung rechts“ → kein Fehler, beim Eintippen
   sichtbar rechtsbündig.
7. Selektion über mehrere Absätze mit gemischter Ausgangsausrichtung → nach Klick
   alle einheitlich rechtsbündig; Button-Zustand vor und nach Klick gemäß
   Abschnitt 6 Punkt 5 dokumentiert bewertet.
8. Wechsel von „rechts“ zu „zentriert“ zu „Blocksatz“ zu „links“ und zurück zu
   „rechts“ → jeder Wechsel korrekt und sofort sichtbar, Button-Zustand stimmt
   nach jedem Schritt.
9. Erneuter Klick auf „Ausrichtung rechts“, während der Absatz bereits
   rechtsbündig ist → Ergebnis gemäß der in 2.3 festgelegten Entscheidung
   (idempotent vs. Rückstellung).
10. Kombination mit Fett **und** Kursiv **und** Schriftfarbe im rechtsbündigen
    Absatz → alle Formate gleichzeitig sichtbar, keine gegenseitige Störung.
11. Absatzformat-Wechsel: rechtsbündigen Standard-Absatz auf „Überschrift 1“
    umstellen → prüfen, ob Ausrichtung erhalten bleibt oder auf „links“
    zurückspringt (Verdachtsmoment 6.4) — Ergebnis dokumentieren, ggf. als Bug
    melden und beheben.
12. Umgekehrter Wechsel: rechtsbündige Überschrift zurück auf „Standard“ → gleiche
    Prüfung.
13. Rechtsbündigkeit in einer Bullet-Liste und in einer nummerierten Liste →
    funktioniert identisch zu normalem Absatz, Nummerierung/Aufzählungszeichen
    unverändert an ihrer Position.
14. Rechtsbündigkeit in einer Tabellenzelle → funktioniert identisch, keine
    Nebenwirkung auf Nachbarzellen.
15. Rechtsbündiger Absatz mit `hard_break` (Umschalt+Enter) darin → Ausrichtung
    gilt für beide Zeilen des Absatzes.
16. Undo (Strg+Z) direkt nach Anwenden von „Ausrichtung rechts“ → vorherige
    Ausrichtung (nicht pauschal „links“, sondern der tatsächliche Vorwert) wird
    wiederhergestellt.
17. Redo (Strg+Y) danach → Rechtsbündigkeit kommt zurück.
18. DOCX-Rundreise: neues Dokument, Absatz rechtsbündig setzen, exportieren,
    reimportieren → Ausrichtung erhalten (Testfall 4.1.2).
19. ODT-Rundreise: dasselbe für ODT (Testfall 4.2.2).
20. Cross-Format-Rundreise DOCX → ODT: Ausrichtung erhalten (Testfall 4.3.1).
21. Cross-Format-Rundreise ODT → DOCX: Ausrichtung erhalten (Testfall 4.3.2).
22. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit rechtsbündiger Überschrift
    + Fett + Farbe kombiniert → kein Verlust der Ausrichtungsinformation
    (Testfall 4.3.3).
23. Upload einer realen, außerhalb der App erzeugten DOCX-Datei mit
    rechtsbündigem Absatz (unverändert) → Export → Reimport → Text und
    Ausrichtung identisch zum Original (Testfall 4.1.1).
24. Upload einer realen, außerhalb der App erzeugten ODT-Datei mit
    rechtsbündigem Absatz (unverändert) → Export → Reimport → Text und
    Ausrichtung identisch zum Original (Testfall 4.2.1).
25. Upload einer realen DOCX-Datei mit `<w:jc w:val="end"/>` → Import-Ergebnis
    prüfen und mit der in Grenzfall 6 verlangten Entscheidung abgleichen
    (Verdachtsmoment 6.1).
26. Upload einer realen ODT-Datei mit `fo:text-align="end"` → Import-Ergebnis
    prüfen und mit der in Grenzfall 8 verlangten Entscheidung abgleichen
    (Verdachtsmoment 6.2).
27. Upload einer realen Fremddatei, deren rechtsbündige Ausrichtung nur über eine
    referenzierte Formatvorlage (nicht direkt am Absatz) definiert ist → prüfen,
    ob die Ausrichtung erhalten bleibt oder verloren geht (Grenzfall 9,
    Verdachtsmoment 6.3).
28. E2E-Test über echte Browser-Bedienung (Playwright, analog zu
    `tests/e2e/docx.spec.ts` für „Fett“): Button `page.getByTitle('Ausrichtung:
    right')` (bzw. nach Fix des Tooltip-Texts der korrigierte deutsche Titel)
    anklicken, Text eingeben/markieren, `text-align: right` im DOM prüfen — **muss
    neu ergänzt werden**, da aktuell nicht vorhanden (Verdachtsmoment 6.9).
29. Export nach DOCX validieren gegen einen vom eigenen Reader unabhängigen Parser
    (z. B. python-docx oder OOXML-Schemaprüfung) → `<w:jc w:val="right"/>`
    korrekt vorhanden.
30. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema →
    `fo:text-align="right"` korrekt vorhanden.
31. Icon-Rendering-Test auf einem System ohne besondere Font-/Unicode-Unterstützung:
    Glyphe „⇥“ bleibt von „⇤“/„↔“/„≡“ eindeutig unterscheidbar (Verdachtsmoment 11
    bzw. Abschnitt 5).
32. Tooltip-Text-Korrektur verifizieren: `title` zeigt durchgängig deutschen Text
    (kein „Ausrichtung: right“ mehr), Testfall zur Regression nach Fix.
33. Tastenkürzel-Test: entweder das neu festgelegte Kürzel (z. B. Strg+R)
    funktioniert zuverlässig, oder das bewusste Fehlen ist dokumentiert und durch
    einen Test/Kommentar im Code nachvollziehbar gemacht (siehe 3.7 unten) —
    „stillschweigend fehlend“ gilt nicht als erfüllt.
34. Performance/Stabilität: „Ausrichtung rechts“ auf eine sehr lange Selektion
    (mehrere Seiten, viele Absätze) anwenden → UI bleibt reaktionsfähig, kein
    spürbares Einfrieren.
35. Schnelles Mehrfachklicken auf den Button innerhalb kurzer Zeit → kein
    inkonsistenter Zwischenzustand zwischen den betroffenen Absätzen.
36. Import einer Fremddatei mit ungültigem/unerwartetem Ausrichtungswert (z. B.
    `w:jc w:val="distribute"`) → kein Absturz, kein Textverlust, Fallback-Verhalten
    dokumentiert (Grenzfall 7).

---

## 8. Offene Entscheidungen (müssen vor Abnahme getroffen und hier nachgetragen werden)

1. **Tastenkürzel** (Abschnitt 1 Zeile 5, Abschnitt 3.7-Referenz): Wird `Strg+R`
   (oder ein anderes Kürzel) ergänzt, oder wird das Fehlen bewusst dokumentiert?
2. **Verhalten bei erneutem Klick auf bereits aktive Ausrichtung** (Abschnitt 2.3):
   idempotent (aktuelles Codeverhalten) oder Rückstellung auf „links“?
3. **Verlust der Ausrichtung bei Absatzformat-Wechsel** (Abschnitt 2.5,
   Verdachtsmoment 6.4): Bug, der behoben werden muss, oder bewusst gewolltes
   Verhalten (dann mit Begründung zu dokumentieren)?
4. **Normalisierung von `start`/`end`** (Grenzfälle 6 und 8): Werden diese beim
   Import auf `left`/`right` abgebildet, oder bleibt die App bei „nur die vier
   expliziten Werte werden erkannt“ — mit entsprechend dokumentiertem
   Informationsverlust bei solchen Fremddateien?
5. **`aria-pressed`/Button-Zustand bei gemischter Mehrfachselektion**
   (Verdachtsmoment 6.5): Wird auf „Zustand von `$from`“ belassen (aktuelles
   Verhalten) oder auf eine aussagekräftigere Berechnung (z. B. „aktiv nur wenn
   **alle** betroffenen Absätze rechtsbündig sind“) umgestellt?

Diese fünf Punkte sind für die Abnahme (Abschnitt 9) zwingend zu beantworten — ein
„aktuell so, unkommentiert“ gilt nicht als ausreichend.

---

## 9. Abnahmekriterien (Definition of Done)

Das Feature „Ausrichtung rechts“ gilt erst dann wieder als „vorhanden“ im Sinne von
vertrauenswürdig, wenn:

1. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt wurden (nicht nur die
   bereits vorhandenen Writer→eigener-Reader-Unit-Tests aus `roundtrip.test.ts`)
   und deren Ergebnis dokumentiert ist.
2. Jedes Verdachtsmoment aus Abschnitt 6 explizit als „bestätigt und behoben“,
   „bestätigt und bewusst als Grenzfall dokumentiert“ oder „widerlegt“ eingestuft
   wurde — keines bleibt unkommentiert offen.
3. Alle fünf offenen Entscheidungen aus Abschnitt 8 getroffen, umgesetzt (falls ein
   Code-Fix nötig ist) und das Ergebnis in dieser Datei nachgetragen wurde.
4. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) für den
   „Ausrichtung rechts“-Button dauerhaft in der Testsuite verankert ist
   (Testfall 28).
5. Die Rundreise-Anforderung aus Abschnitt 4 für DOCX **und** ODT, inklusive
   Cross-Format und inklusive mindestens einer realen (nicht app-eigenen)
   Testdatei je Format, nachweislich erfüllt ist.
6. Der Tooltip-Lokalisierungsfehler (Verdachtsmoment 6.7) behoben und mit einem
   Regressionstest abgesichert ist.
7. Mindestens ein Fixture-Test mit einer realen Fremddatei, die einen
   rechtsbündigen Absatz enthält, für **beide** Formate existiert und dauerhaft in
   der Suite bleibt (aktuell laut Codeanalyse nicht vorhanden, Verdachtsmoment
   6.10).

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden
(nicht vertrauenswürdig)“ auf „verifiziert“ geändert werden.
