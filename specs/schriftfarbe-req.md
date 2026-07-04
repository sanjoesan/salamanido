# Anforderung: Schriftfarbe

Status: **vorhanden laut Backlog — gilt als nicht vertrauenswürdig, muss vollständig
verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen die die
Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird, bevor der
Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 2.2, Zeile `schriftfarbe` — Titel
„Schriftfarbe", Beschreibung „Freie Farbwahl für die Zeichenfarbe der Selektion.",
Priorität 1 (essenziell/fundamental). Ergänzend `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3
(Tabellenzeile „Schriftfarbe — Freie Farbwahl (Farbwähler), Farbe bleibt nach
Formatwechsel erhalten") sowie Abschnitt 17 Zeile 3 („Textfarbe / Hervorhebung +
‚Entfernen'-Buttons — vorhanden — funktional prüfen, ‚Entfernen'-Symbol (⌫) ebenfalls
auf Rendering prüfen").

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md`: Anforderung in
Fließtext/Listen je Aspekt, danach nummerierte Testfälle, Fokus auf **beide** Formate
(DOCX und ODT) sowie auf die Rundreise (Upload unverändert → Export → Re-Import erhält
Inhalt).

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen — Code-Vorhandensein wurde bisher wiederholt mit
„funktioniert" verwechselt, siehe Vorgeschichte in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17):

| Ebene | Fundstelle |
|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts`, Mark `textColor`, `attrs: { color: { validate: 'string' } }`, `parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }]`, `toDOM` → `['span', { style: 'color: ' + mark.attrs.color }, 0]` |
| Toolbar-Bedienelement | `src/formats/shared/editor/Toolbar.tsx`, Zeilen 142–161: `<label title="Textfarbe">` mit sichtbarem Buchstaben „A" (`aria-hidden`) + `<input type="color" aria-label="Textfarbe">`, danach separater Button „⌫" mit `title="Textfarbe entfernen"` |
| Befehle | `src/formats/shared/editor/commands.ts`, `applyMarkColor('textColor', color)` (setzt Mark per `tr.addMark`) und `clearMarkColor('textColor')` (entfernt Mark per `tr.removeMark`) — **beide brechen mit `return false` ab, wenn `state.selection.empty` ist** (siehe Abschnitt 3.2) |
| Tastenkürzel | **keins** — `WordEditor.tsx` Keymap enthält nur `Mod-b`/`Mod-i`/`Mod-u`, kein Eintrag für Schriftfarbe |
| DOCX-Export | `src/formats/docx/writer.ts` Zeile 25: `mark.type === 'textColor'` → `<w:color w:val="RRGGBB"/>` (führendes `#` wird per `.replace('#', '')` entfernt, sonst keine Validierung/Normalisierung des Werts) |
| DOCX-Import | `src/formats/docx/reader.ts` Zeilen 107–109: liest `<w:color w:val="…">`, ignoriert Wert `"auto"`, setzt sonst `#` davor und übernimmt den Rest unverändert (keine Groß-/Kleinschreibungs-Normalisierung, keine Auswertung von `w:themeColor`) |
| ODT-Export | `src/formats/odt/styleRegistry.ts`: `buildTextStyleXml` → `fo:color="…"` als Attribut eines automatischen `style:style`-Elements (Familie „text"); `isEmpty()` behandelt jeden gesetzten `color`-String als „nicht leer" |
| ODT-Import | `src/formats/odt/reader.ts` Zeilen 57–58/91: liest `fo:color` aus `style:text-properties` innerhalb `office:automatic-styles` (sowohl aus `content.xml` als auch `styles.xml`), übernimmt den String unverändert als Mark-Attribut; **`office:styles` (benannte/gemeinsame Zeichenformatvorlagen) werden nicht ausgewertet** |
| Unit-Tests (Rundreise, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`, Testfall „preserves text color and highlight color" — testet ausschließlich `#ff0000`/`#ffff00`, direkt als ProseMirror-JSON konstruiert, nicht über UI erzeugt |
| E2E-Tests (echte Toolbar-Bedienung im Browser) | **keine gefunden** — `tests/e2e/` enthält keinen Treffer für „textColor", „Textfarbe" oder „Schriftfarbe". Das ist die zentrale Lücke, die diese Anforderung schließen soll. |
| Sichtbarer Aktiv-/Ist-Zustand | **nicht vorhanden** — anders als bei `strong`/`em`/`underline`/`strike` (`MarkButton` mit `aria-pressed` je nach `markType.isInSet(...)`) zeigt der Farbwähler-Button keinerlei Rückmeldung, welche Farbe an der aktuellen Cursor-Position/Selektion bereits aktiv ist; der sichtbare Farbchip im `<input type="color">` zeigt nur die zuletzt manuell gewählte Farbe dieser Sitzung, nicht die Farbe des selektierten Texts |

---

## 1. Ziel

Nutzer:innen können markiertem Text eine frei wählbare Zeichenfarbe (Schriftfarbe)
zuweisen und diese ebenso wieder entfernen — konsistent in Editor-Anzeige, DOCX-Export
und ODT-Export — und die Farbe bleibt bei jeder Rundreise (Import → Export,
Export → Re-Import, Cross-Format) exakt erhalten, inklusive Kombination mit anderen
Zeichenformaten (fett, kursiv, unterstrichen, durchgestrichen, Hervorhebungsfarbe).

Explizit **nicht** Gegenstand dieser Anforderung (separate Backlog-Einträge):
- `textmarker-farbe` (Hervorhebungsfarbe/Textmarker, Hintergrundfarbe der Selektion) —
  eigene Anforderung, Status ebenfalls „vorhanden laut Backlog", teilt sich Code-Pfade
  (`applyMarkColor`/`clearMarkColor`, Toolbar-Layout) mit dieser Anforderung, wird aber
  separat verifiziert. Diese Datei behandelt Hervorhebungsfarbe nur dort, wo sie mit
  Schriftfarbe **kombiniert** wird (Abschnitt 3.7) oder wo ein Fund aus dieser Datei
  identisch auf `textmarker-farbe` zutrifft (dann als Querverweis vermerkt, nicht doppelt
  ausformuliert).
- `formatierung-loeschen` (Status `fehlt`) — sobald umgesetzt, muss diese Funktion auch
  eine gesetzte Schriftfarbe zurücksetzen; bis dahin keine Anforderung an diese
  Kombination, siehe Abschnitt 3.6.
- `schriftart-waehlen`/`schriftgroesse-waehlen` (Status `fehlt`) — keine inhaltliche
  Abhängigkeit zur Schriftfarbe, nur als Nachbar-Toolbar-Gruppe laut
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3 relevant.
- Design-/Kontrastprüfung (automatische Warnung bei schlecht lesbaren Farbkombinationen,
  z. B. weißer Text auf weißem Hintergrund) — nicht gefordert, siehe Grenzfall 4.8.
- Theme-/Design-Farbpaletten (Word-„Designfarben", ODF-„Theme"-Konzept) — nicht
  gefordert; es wird ausschließlich mit expliziten RGB-Hex-Werten gearbeitet, siehe
  Abschnitt 5.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Sichtbares Label „A" | Zeichenformatierungs-Gruppe der Toolbar, direkt nach dem Trenner hinter „Durchgestrichen" | Reiner Buchstabe „A" (`aria-hidden`, kein Screenreader-Text), keine Farbe/kein Styling, das auf „Textfarbe" hindeutet außer dem benachbarten `title`-Attribut des umgebenden `<label>` | Muss für sehende Nutzer:innen unmissverständlich als „Schriftfarbe" erkennbar sein — verifizieren, ob ein reiner Buchstabe ohne Farbunterlegung/Icon dafür ausreicht (Vergleich mit Word/LibreOffice, die i. d. R. ein „A" mit farbigem Unterstrich als Vorschau der zuletzt gewählten Farbe zeigen) |
| 2 | Farbwähler-Eingabefeld (`<input type="color">`) | Direkt neben Label „A" | Natives Browser-Farbwahl-Widget, `aria-label="Textfarbe"`, `onChange` löst `applyMarkColor('textColor', …)` aus | Klick öffnet den systemeigenen Farbwähler-Dialog; nach Bestätigung wird die gewählte Farbe auf die aktuelle Selektion angewendet, siehe Abschnitt 3 |
| 3 | „Entfernen"-Button („⌫") für Schriftfarbe | Direkt nach dem Farbwähler-Eingabefeld | `title="Textfarbe entfernen"`, kein `aria-label` (Button-Inhalt ist der Unicode-Glyph „⌫" selbst, kein separates Label) | Muss die Schriftfarben-Mark auf der Selektion vollständig entfernen (Rückkehr zur automatischen/Vorgabefarbe); **Rendering des Glyphen „⌫" ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 explizit als potenziell unzuverlässig gelistet — auf Systemen ohne passende Glyphen-Unterstützung erscheint ggf. nur ein leeres Rechteck/Fragezeichen, muss auf mehreren Systemen/Browsern geprüft werden** |
| 4 | Aktiv-/Ist-Zustands-Anzeige | — | **Nicht vorhanden.** Anders als bei den Bool-Marks (Fett/Kursiv/Unterstrichen/Durchgestrichen) gibt es keinen visuellen Indikator, welche Farbe an der aktuellen Cursor-Position/Selektion bereits gesetzt ist. Der native Farbchip im `<input type="color">` zeigt ausschließlich die zuletzt in dieser Sitzung manuell gewählte Farbe, unabhängig vom tatsächlichen Selektionsinhalt. | Muss geklärt und dokumentiert werden, ob das als bewusste Design-Entscheidung gilt (dann hier festhalten) oder als Lücke zu schließen ist (z. B. Farbchip aktualisiert sich beim Bewegen des Cursors auf die Farbe an `$from`). Bis zur Klärung: **kein Soll-Verhalten unterstellen, nur Ist-Zustand verifizieren.** |
| 5 | Tastenkombination | — | Nicht vorhanden (kein Eintrag in der Keymap) | Kein Soll-Bestandteil dieser Anforderung (nicht im Backlog gefordert, Word/LibreOffice haben ebenfalls keine Standard-Tastenkombination für freie Farbwahl) — nur dokumentieren |
| 6 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden | Kein Soll-Bestandteil dieser Anforderung — nur dokumentieren, falls generell ein Kontextmenü existiert, dass „Schriftfarbe" dort fehlt |
| 7 | Farbpalette/Swatches/„Zuletzt verwendet" | — | Nicht vorhanden — ausschließlich das native Betriebssystem-/Browser-Widget von `<input type="color">`, keine eigene Palette, kein Hex-Eingabefeld, keine Liste kürzlich verwendeter Farben | Kein Soll-Bestandteil dieser Anforderung, siehe Abschnitt 5 — nur dokumentieren, dass die Farbwahl vollständig vom jeweiligen Browser/Betriebssystem abhängt (unterschiedliches Aussehen/Bedienung je nach Chrome/Firefox/Safari/Edge, je nach Windows/macOS/Linux) |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf bestehende Selektion
- Text markieren → Farbwähler öffnen (Klick auf das Eingabefeld) → Farbe im nativen
  Dialog bestätigen → gesamte Selektion wird in der gewählten Farbe dargestellt.
- Die Selektion selbst darf durch die Aktion nicht verändert werden (Auswahlgrenzen
  bleiben erhalten, damit direkt eine weitere Formatierung angewendet werden kann).
- Erneutes Öffnen des Farbwählers auf derselben Selektion und Wahl einer anderen Farbe →
  vorherige Farbe wird vollständig durch die neue ersetzt (kein additiver Effekt, kein
  Mischen, keine zweite gleichzeitige `textColor`-Mark).

### 3.2 Anwenden ohne Selektion (an der Schreibmarke) — bekannte Abweichung vom Verhalten der Bool-Marks
- **Aktuelle Implementierung:** `applyMarkColor` prüft `state.selection.empty` und gibt
  `false` zurück, **ohne** eine Transaktion zu dispatchen, wenn keine Selektion besteht.
  Das bedeutet: Steht der Cursor ohne Selektion im Text und wird die Farbe gewählt,
  passiert **nichts** — kein Fehler, aber auch keine sichtbare Rückmeldung, und
  insbesondere wird die Farbe **nicht** wie bei Fett/Kursiv/Unterstrichen (die über
  `toggleMark`/ProseMirror-„stored marks" auch ohne Selektion für nachfolgend getippten
  Text wirken) für neu getippten Text gemerkt.
- Das ist ein **Verstoß gegen das Prinzip „kein stiller Fehlschlag"** aus
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4: Ein Klick/eine Aktion, die aus
  irgendeinem Grund nicht ausgeführt werden kann, muss eine sichtbare Rückmeldung
  erzeugen. Hier tut der native Farbwähler-Dialog zwar sichtbar etwas (er öffnet sich),
  aber die anschließende Bestätigung hat keinerlei Wirkung auf das Dokument — für
  Nutzer:innen nicht von einem Bug unterscheidbar.
- **Anforderung an die Verifikation:** Dieses Verhalten muss zunächst als Ist-Zustand
  bestätigt werden (Test: Cursor ohne Selektion setzen, Farbe wählen, dann tippen →
  neuer Text bleibt in der Vorgabefarbe). Anschließend ist mit dem Auftraggeber/Backlog
  zu klären, ob:
  (a) dies als akzeptabler, zu dokumentierender Fallback gilt (dann muss der
  „Entfernen"-Button danebem konsistent ebenfalls ohne Selektion nichts tun, siehe
  Abschnitt 3.5, und beides muss in der UI klar kommuniziert werden, z. B. Button
  `disabled` bei leerer Selektion statt stillem No-Op), oder
  (b) die Funktion nachgerüstet werden muss (analoges Verhalten zu Fett/Kursiv über
  ProseMirror „stored marks", sodass neu getippter Text ab der Schreibmarke die gewählte
  Farbe annimmt).
  Bis zur Klärung gilt der Ist-Zustand (kein Effekt ohne Selektion) als das zu testende
  Verhalten, **nicht** als impliziter Fehlerbefund — aber er muss explizit in jedem
  Testlauf dokumentiert werden, nicht stillschweigend übergangen.

### 3.3 Anzeige des aktiven Zustands — bekannte Lücke
- Es gibt aktuell keinen Mechanismus, der den Farbchip im `<input type="color">` (oder
  irgendein anderes Element der Toolbar) auf die tatsächliche Farbe der aktuellen
  Selektion/Cursor-Position setzt. Bewegt sich der Cursor durch bereits farbigen Text,
  bleibt der angezeigte Farbchip unverändert auf dem zuletzt manuell gewählten Wert
  stehen.
- Zu verifizieren: Führt das in der Praxis zu Fehlbedienung (z. B. Nutzer:in denkt, der
  markierte Text habe die im Chip angezeigte Farbe, obwohl das nicht stimmt)? Ergebnis
  ist hier zu dokumentieren, unabhängig davon, ob daraus eine Korrektur folgt (siehe
  Abschnitt 2, Punkt 4).

### 3.4 Die Farbwahl-UI selbst (natives Browser-Widget)
- Die Farbauswahl erfolgt ausschließlich über das native `<input type="color">`-Widget
  des jeweiligen Browsers/Betriebssystems — keine eigene, plattformunabhängige
  Farbwähler-Komponente.
- Zu verifizieren auf mindestens den Ziel-Browsern des Projekts: Öffnet sich der Dialog
  zuverlässig per Klick/Tastatur (Enter/Leertaste bei Fokus per Tab)? Lässt sich ein
  beliebiger Hex-Wert eingeben (browserabhängig, i. d. R. ja über ein Hex-Feld im
  nativen Dialog)?
- **Kontinuierliches `onChange`-Feuern während des Ziehens im Farbwähler:** React bildet
  `onChange` auf das native `input`-Event ab, nicht auf `change`. Für
  `<input type="color">` feuern manche Browser (insbesondere Chrome) das `input`-Event
  fortlaufend, während der Farbregler im geöffneten Dialog gezogen wird — nicht nur
  einmalig beim Schließen des Dialogs. Das bedeutet potenziell: `applyMarkColor` wird
  während eines einzigen Auswahlvorgangs viele Male mit sich änderndem Zwischenwert
  aufgerufen, was viele einzelne Undo-Schritte erzeugen könnte (statt eines Schritts
  „Farbe gesetzt"). **Muss verifiziert werden:** Wie viele Undo-Schritte entstehen durch
  einen einzelnen Auswahlvorgang im Zielbrowser, und ist ein einzelnes Strg+Z danach
  noch sinnvoll nachvollziehbar?
- **`view.focus()` während offenem Farbwähler-Dialog:** Die gemeinsame `run()`-Hilfsfunktion
  (`Toolbar.tsx`) ruft nach jedem Befehl `view.focus()` auf, um den Editor-Fokus
  zurückzuholen. Feuert `onChange` mehrfach während der native Dialog noch geöffnet ist
  (siehe oben), wird `view.focus()` entsprechend mehrfach aufgerufen, während der
  Fokus eigentlich im nativen Farbwähler liegen sollte. **Muss verifiziert werden:** Führt
  das dazu, dass der native Farbwähler-Dialog vorzeitig geschlossen wird, bevor die
  gewünschte Farbe final bestätigt ist (Fokusentzug kann in manchen Browsern das
  Schließen von Popups auslösen)?

### 3.5 Entfernen der Farbe
- „⌫"-Button auf einer Selektion mit gesetzter Schriftfarbe klicken → Mark `textColor`
  wird vollständig entfernt (`tr.removeMark`), Text kehrt zur automatischen/geerbten
  Farbe zurück (typischerweise Schwarz, abhängig vom Basis-/Absatzformat).
- Wie in Abschnitt 3.2 beschrieben: `clearMarkColor` bricht ebenfalls mit `return false`
  ab, wenn die Selektion leer ist — Klick auf „Entfernen" ohne vorherige Markierung tut
  nichts (gleiches Muster, gleiche Anforderung an sichtbare Rückmeldung wie in 3.2).
- Entfernen auf einer Selektion, die **keine** Schriftfarbe trägt → `tr.removeMark` ist
  ein No-Op (keine Mark zum Entfernen vorhanden), darf keinen Fehler auslösen.
- Entfernen auf einer gemischten Selektion (teils farbig, teils nicht) → `removeMark`
  entfernt die Mark überall dort, wo sie vorkommt, lässt den Rest unverändert (kein
  Fehler, aber auch kein einheitliches „vorher/nachher"-Konzept wie ein Toggle — anders
  als bei den Bool-Marks gibt es hier kein `toggleMark`, sondern getrennte
  „setzen"/„entfernen"-Aktionen, siehe Grenzfall 4.6).

### 3.6 Kombination mit anderen Zeichenformaten
- Schriftfarbe muss unabhängig und gleichzeitig mit Fett, Kursiv, Unterstrichen,
  Durchgestrichen und Hervorhebungsfarbe auf demselben Textlauf anwendbar sein.
- Entfernen der Schriftfarbe darf die anderen Formatierungen nicht beeinflussen und
  umgekehrt (jede Mark ist unabhängig setz-/entfernbar).
- Sobald `formatierung-loeschen` (Backlog-Status `fehlt`) umgesetzt ist, muss diese
  Funktion auch die Schriftfarbe zuverlässig entfernen. Bis dahin: keine Anforderung an
  diese Kombination, im Test explizit als „nicht anwendbar, da Zielfunktion fehlt"
  vermerken.

### 3.7 Zusammenspiel mit Hervorhebungsfarbe (Backlog-Eintrag `textmarker-farbe`)
- Beide Marks (`textColor` für Zeichenfarbe, `highlight` für Hintergrund) sind technisch
  unabhängig (`ColorMarkName = 'textColor' | 'highlight'` in `commands.ts`) und über
  separate Toolbar-Bedienelemente steuerbar — beide gleichzeitig auf demselben Textlauf
  anwendbar (z. B. roter Text auf gelbem Hintergrund).
- Zu verifizieren: Führt das Setzen der einen Farbe (z. B. Schriftfarbe) versehentlich
  zum Verlust der anderen (z. B. Hervorhebung) auf derselben Selektion? Laut
  `applyMarkColor`-Implementierung (separates `addMark` je Markname) sollte das nicht
  der Fall sein, ist aber über echte Bedienung zu bestätigen, nicht nur durch
  Code-Lektüre.
- Export-technisch nutzt Hervorhebungsfarbe in DOCX bewusst `<w:shd w:val="clear"
  w:color="auto" w:fill="RRGGBB"/>` (Zellen-/Zeichen-Schattierung) statt des
  Word-eigenen, auf eine feste Farbpalette begrenzten `<w:highlight w:val="…"/>"-Elements
  — das ermöglicht freie RGB-Werte, ist aber semantisch „Schattierung", nicht der native
  Word-„Textmarker". Für die Schriftfarbe selbst (`<w:color w:val="…"/>`) besteht dieses
  Problem nicht, da Word `w:color` bereits für beliebige RGB-Werte vorsieht — hier nur
  als Kontext vermerkt, damit bei gemeinsamer Prüfung mit `textmarker-farbe` keine
  Verwechslung der beiden Exportmechanismen entsteht.

### 3.8 Exakte Farbwerterhaltung bei Rundreise
- Die im UI gewählte Farbe stammt aus `<input type="color">` und liegt damit laut
  HTML-Spezifikation immer als sechsstelliger, **kleingeschriebener** Hex-Code
  (`#rrggbb`, kein Alphakanal) vor.
- DOCX-Export schreibt den Wert ohne führendes „#" in `w:val` (z. B. `w:val="ff0000"`),
  DOCX-Import erwartet ebenfalls sechsstellige Hex-Zeichen und stellt beim Einlesen
  wieder ein „#" voran — beide Seiten führen **keine** Normalisierung der
  Groß-/Kleinschreibung durch (kein `.toLowerCase()`/`.toUpperCase()` im gesamten
  DOCX-/ODT-Lese-/Schreib-Code, verifiziert per Volltextsuche).
- **Grenzfall bei Fremddateien:** Reale, mit Microsoft Word erzeugte Dateien schreiben
  `w:val` häufig in Großbuchstaben (z. B. `w:val="FF0000"`). Diese Groß-/
  Kleinschreibung bleibt nach Import unverändert erhalten (`#FF0000`), unterscheidet
  sich also als reiner String von einer über die eigene UI gewählten Farbe
  (`#ff0000`) — visuell identisch (CSS-Farbwerte sind case-insensitiv), aber bei
  strikten Rundreise-Tests, die auf exakte String-Gleichheit prüfen, potenziell
  fälschlich als „Abweichung" gewertet. Testfälle müssen das berücksichtigen (Vergleich
  case-insensitiv oder nach Normalisierung, nicht als reiner String-Diff).
- ODT-Export/-Import übernimmt `fo:color` als rohen String ohne jede Formatprüfung —
  ein Import-Wert, der kein gültiger `#rrggbb`-Hex-String ist (z. B. ein benannter
  CSS-Farbname oder ein fehlerhafter Wert aus einer Fremddatei), wird unverändert als
  `color`-Mark-Attribut übernommen und landet unverändert im `style`-Attribut des
  gerenderten `<span>` (`toDOM` in `schema.ts`) — der Browser ignoriert ungültige
  CSS-Farbwerte dann typischerweise stillschweigend (Text erscheint in der geerbten
  Farbe statt in einer Fehlermeldung). Muss mit mindestens einem gezielten Testfall
  (ungültiger/exotischer Farbwert in einer Testdatei) geprüft und das Fallback-Verhalten
  dokumentiert werden.

### 3.9 „Farbe bleibt nach Formatwechsel erhalten" (Formulierung aus `FEATURE-SPEC-DOCX-ODT.md`)
- Zu klären, was mit „Formatwechsel" in der ursprünglichen Anforderung gemeint ist —
  mindestens folgende Lesarten sind zu prüfen und das Ergebnis hier festzuhalten:
  1. Wechsel des Dateiformats (DOCX ↔ ODT) — das ist durch die Rundreise-Anforderung in
     Abschnitt 6 abgedeckt.
  2. Wechsel des Absatzformats (z. B. Standard → Überschrift 1 und zurück) auf einem
     Textlauf mit gesetzter Schriftfarbe — zu verifizieren, dass `setHeading`
     (`commands.ts`) die Zeichen-Marks des enthaltenen Textes nicht antastet (der Code
     ändert nur den Block-Typ, nicht die Inline-Marks, sollte also unkritisch sein,
     ist aber über echte Bedienung zu bestätigen).
  3. Kombiniertes Ein-/Ausschalten anderer Zeichenformate (Fett an/aus) auf demselben
     Textlauf — zu verifizieren, dass ein `toggleMark`-Aufruf für `strong`/`em`/etc. die
     bereits gesetzte `textColor`-Mark nicht mit entfernt (ProseMirws `toggleMark`
     wirkt nur auf die eigene Mark-Art, sollte unkritisch sein).

---

## 4. Grenzfälle

1. **Cursor ohne Selektion (Schreibmarke):** Siehe Abschnitt 3.2 — sowohl Setzen als
   auch Entfernen der Farbe haben laut aktuellem Code keine Wirkung; kein JS-Fehler,
   aber auch keine Rückmeldung. Muss als Ist-Zustand bestätigt und explizit dokumentiert
   werden.
2. **Selektion über mehrere Absätze hinweg:** Markierung, die einen ganzen
   Absatzwechsel einschließt → Farbe wird auf alle enthaltenen Textläufe in beiden
   Absätzen angewendet, keine Elemente werden ausgelassen, der Absatzwechsel selbst
   bleibt unbeschädigt.
3. **Selektion über eine Tabellen-Zellgrenze hinweg:** Markierung über mehrere
   Tabellenzellen → Farbe wird konsistent in allen betroffenen Zellen gesetzt, kein
   Crash, keine Vermischung mit Nachbarzellen.
4. **Rein aus Leerzeichen bestehende Selektion:** Mark wird technisch gesetzt, auch wenn
   optisch kaum sichtbar — kein Sonderfall, der die Aktion verweigert.
5. **Selektion, die ein eingefügtes Bild einschließt (inline Node ohne Marks):** Aktion
   darf nicht abstürzen; auf das Bild selbst hat die Mark keine Wirkung, auf im selben
   Bereich enthaltenen Text schon.
6. **Gemischte Selektion (teils bereits farbig — ggf. in unterschiedlichen Farben —,
   teils ohne Farbe):** Anders als bei den Bool-Marks gibt es kein Toggle-Konzept.
   Setzen einer neuen Farbe überschreibt einheitlich die gesamte Selektion mit dieser
   einen Farbe (`tr.addMark` über den ganzen Bereich), unabhängig vom vorherigen
   Zustand einzelner Teilbereiche. Entfernen (`tr.removeMark`) entfernt die Mark überall
   dort, wo sie vorkommt. Dieses Verhalten ist zu verifizieren und explizit zu
   dokumentieren (kein „gemischt"-Zwischenzustand, keine Rückfrage an Nutzer:in).
7. **Erneutes Anwenden derselben Farbe:** Keine doppelten `textColor`-Marks, keine
   Fehler, Ergebnis bleibt identisch zum vorherigen Zustand.
8. **Schriftfarbe, die mit der Hintergrundfarbe (Seiten-/Hervorhebungsfarbe)
   übereinstimmt oder sehr ähnlich ist (z. B. Weiß auf Weiß):** Text wird faktisch
   unsichtbar. Kein automatischer Kontrast-Hinweis vorhanden und laut Abschnitt 1 auch
   nicht gefordert — nur verifizieren, dass die Anwendung selbst nicht abstürzt und die
   Farbe trotzdem korrekt gespeichert/exportiert wird (Datenintegrität unabhängig von
   Lesbarkeit).
9. **Explizit gesetztes Schwarz (`#000000`) versus keine Farbe gesetzt:** Beides
   erscheint optisch identisch (Standard-Textfarbe ist ebenfalls Schwarz), muss aber
   strukturell unterscheidbar bleiben — ein Dokument mit expliziter `textColor`-Mark
   `#000000` darf beim Export nicht mit einem Dokument ohne jede Farbmarkierung
   verwechselt werden (unterschiedliche Style-Definitionen in ODT via
   `TextStyleRegistry` bzw. unterschiedliches `<w:rPr>` in DOCX). Mit gezieltem
   Testfall prüfen, dass „#000000 explizit gesetzt" bei Rundreise als eigene Mark
   erhalten bleibt, nicht stillschweigend wegoptimiert wird.
10. **Farbwert mit Alphakanal oder ungültigem/exotischem Format aus Fremddateien:**
    Siehe Abschnitt 3.8 — Reader übernimmt jeden String unvalidiert; Verhalten bei
    ungültigen Werten (Text wird in geerbter Farbe statt in einer Fehlermeldung
    dargestellt) muss mit echter Testdatei geprüft und als bewusster Fallback
    dokumentiert werden, nicht als unentdeckter Bug stehen bleiben.
11. **Word-Theme-Farben (`w:themeColor`-Attribut statt/zusätzlich zu `w:val`):** Echte
    Word-Dateien können Zeichenfarbe über einen Theme-Farbverweis
    (`<w:color w:val="auto" w:themeColor="accent1"/>` oder ähnlich) statt über einen
    festen RGB-Wert setzen. Der aktuelle Reader wertet ausschließlich `w:val` aus und
    ignoriert `w:themeColor` vollständig — bei `w:val="auto"` wird gar keine
    `textColor`-Mark erzeugt, obwohl die Datei in Word/LibreOffice eine sichtbar
    andere (Theme-)Farbe zeigen kann. Muss mit einer echten Word-Datei, die
    Theme-Farben für Zeichen verwendet, geprüft und das Fallback-Verhalten
    (Farbinformation geht verloren, Text bleibt aber lesbar in Standardfarbe)
    dokumentiert werden.
12. **ODT-Import: Farbe über eine benannte/gemeinsame Zeichenformatvorlage
    (`office:styles`) statt über eine automatische Formatvorlage
    (`office:automatic-styles`):** Der aktuelle Reader liest Textstil-Definitionen
    ausschließlich aus `office:automatic-styles` (sowohl in `content.xml` als auch in
    `styles.xml`), nicht aus `office:styles`. Wird Schriftfarbe in einer echten
    LibreOffice-Datei über eine benannte Zeichenformatvorlage statt über direkte
    Formatierung vergeben, geht die Farbe beim Import vermutlich verloren (kein
    Absturz, aber stiller Datenverlust bei der Formatierung). Muss mit einer
    entsprechenden echten Testdatei geprüft werden.
13. **Cross-Format-Rundreise Namenskollision:** ODT-Export erzeugt automatische
    Textstil-Namen (`T1`, `T2`, …) über `TextStyleRegistry` je nach gesehener
    Merkmalskombination (inkl. exaktem Farbwert als Teil des Dedup-Schlüssels über
    `JSON.stringify(props)`). Bei einem Dokument mit vielen unterschiedlichen
    Farbwerten ist zu verifizieren, dass keine Kollision/Verwechslung zwischen
    Stilnamen auftritt und jede Farbe exakt der richtigen Textstelle zugeordnet
    bleibt. Zusätzlich: Farbwerte, die sich nur in Groß-/Kleinschreibung unterscheiden
    (`#FF0000` vs. `#ff0000`), erzeugen wegen des reinen String-Vergleichs im
    Dedup-Schlüssel zwei separate, aber optisch identische Stildefinitionen — keine
    Fehlfunktion, aber unnötige Style-Vervielfachung, die bei sehr farbenreichen
    Dokumenten die Datei unnötig aufbläht.
14. **Datei ohne jede Formatierung, nur Schriftfarbe gesetzt:** Export darf keine
    unnötigen leeren Style-Definitionen erzeugen und muss trotzdem valide bleiben
    (`isEmpty()`-Prüfung in `styleRegistry.ts` — mit genau einer aktiven, aber „nur
    Schriftfarbe"-Kombination testen, nicht nur in Kombination mit anderen Marks).
15. **Sehr viele unterschiedliche Farbwerte im selben Dokument (z. B. Regenbogen-Text,
    Wort für Wort andere Farbe):** Kein Performance-Einbruch beim Rendern/Export/
    Import, keine Style-Explosion, die die Datei unbrauchbar macht.
16. **Kontinuierliches `onChange` und `view.focus()` während offenem Farbwähler-Dialog:**
    Siehe Abschnitt 3.4 — zu verifizieren, ob dadurch (a) der native Dialog vorzeitig
    schließt oder (b) unnötig viele Undo-Schritte entstehen.
17. **Rückgängig/Wiederholen:** Strg+Z nach Farbwahl → Formatierung wird exakt
    rückgängig gemacht (nicht nur visuell, auch im zugrunde liegenden Dokumentmodell);
    Strg+Y/Strg+Umschalt+Z stellt sie wieder her. Muss auch nach einer Sequenz aus
    mehreren Formatierungsaktionen (Farbe setzen → andere Farbe setzen → entfernen)
    schrittweise korrekt rückgängig machbar sein — unter Berücksichtigung von
    Grenzfall 16 (möglicherweise mehr Zwischenschritte als erwartet).
18. **Kombiniert mit dem bekannten Selection-Sync-Bug** (siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Alles auswählen → Schriftfarbe anwenden →
    per Klick neu positionieren → Enter → weitertippen — beide entstehenden Absätze
    müssen erhalten bleiben UND ihre jeweils korrekte Farbe behalten. Da Abschnitt 2
    „Fett" als Beispiel nennt, muss geprüft werden, ob derselbe Bug-Pfad auch mit
    „Schriftfarbe" reproduzierbar ist.
19. **Fokus-Erhalt nach Bedienung:** Nach Abschluss der Farbwahl (Dialog geschlossen)
    bleibt der Editor fokussiert und die ursprüngliche Selektion sichtbar aktiv (kein
    Sprung des Cursors an eine andere Stelle) — unter Vorbehalt von Grenzfall 16.

---

## 5. Nicht-Ziele / bewusste Abgrenzung

Folgende, in vollwertigen Textverarbeitungen übliche Zusatzfunktionen rund um
Schriftfarbe sind **nicht** Gegenstand dieser Anforderung und dürfen bei der
Verifikation nicht als fehlend „mitgezählt" werden, solange sie nicht separat im
Backlog geführt werden:

- Eigene, plattformunabhängige Farbwähler-Komponente mit Palette/Swatches (statt
  nativem `<input type="color">`).
- Hex-Wert direkt als Text eingeben können, ohne den nativen Dialog zu öffnen.
- Liste „zuletzt verwendeter Farben" oder Design-/Theme-Farbpaletten.
- Automatische Kontrastprüfung/-warnung.
- Farbverläufe, Transparenz/Alphakanal.
- Auswertung von Word-„Designfarben" (Theme Colors) beim Import (siehe Grenzfall 4.11 —
  dort nur als zu dokumentierender Fallback, nicht als zu bauende Funktion).

---

## 6. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt: Datei mit farbigem Text hochladen (bzw.
im Editor erzeugen) → unverändert exportieren → Ergebnis erneut importieren → die
Schriftfarbe ist an exakt derselben Textstelle mit exakt demselben (case-insensitiv
verglichenen) Farbwert weiterhin vorhanden, kein sonstiger Inhaltsverlust.

1. **DOCX-Eigenrundreise:** Im Editor Text eingeben, Schriftfarbe setzen, als DOCX
   exportieren, die exportierte Datei erneut importieren → Farbe bleibt exakt an der
   richtigen Textstelle erhalten (bereits als Unit-Test mit konstruierten Testdaten
   vorhanden — hier zusätzlich über echte Toolbar-Bedienung im Browser nachstellen,
   siehe Abschnitt 8).
2. **ODT-Eigenrundreise:** Dasselbe für ODT.
3. **Cross-Format DOCX → ODT:** Eine DOCX-Datei mit farbigem Text importieren, als ODT
   exportieren, das Ergebnis importieren → Farbe bleibt erhalten.
4. **Cross-Format ODT → DOCX:** Umgekehrt.
5. **Doppelte Cross-Format-Rundreise:** DOCX → Editor → ODT → Editor → DOCX → Editor →
   Farbe bleibt auch nach zweifachem Formatwechsel vollständig erhalten (kein
   kumulativer Verlust, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
6. **Echte Fremddatei (nicht mit dem eigenen Editor erzeugt):** Mindestens eine reale,
   mit Microsoft Word erzeugte DOCX-Datei und mindestens eine reale, mit LibreOffice
   Writer erzeugte ODT-Datei, die jeweils farbigen Text enthalten (idealerweise mit
   Großbuchstaben-Hex bzw. Theme-Farben, siehe Grenzfälle 4.11/4.12), importieren →
   Farbe wird korrekt erkannt bzw. Fallback-Verhalten ist dokumentiert.
7. **Validierung des exportierten XML gegen unabhängigen Parser:** Exportierte
   DOCX-Datei mit farbigem Text mit einer unabhängigen Bibliothek (z. B. python-docx)
   öffnen und prüfen, dass `w:color` tatsächlich als Zeichenfarbe erkannt wird (nicht
   nur mit dem anwendungseigenen Reader rückgelesen). Analog ODT gegen eine
   unabhängige ODF-Bibliothek/odfvalidator.
8. **Kombinierte Rundreise mit anderen Formaten gleichzeitig:** Text, der gleichzeitig
   fett, unterstrichen **und** farbig ist, sowie zusätzlich ein zweiter Textlauf mit
   Schriftfarbe **und** Hervorhebungsfarbe gleichzeitig → alle Merkmale bleiben nach
   jeder der obigen Rundreisen gemeinsam korrekt erhalten.
9. **Explizites Schwarz (`#000000`) versus keine Farbe:** Rundreise eines Dokuments mit
   einem Textlauf mit expliziter Mark `#000000` und einem zweiten Textlauf ganz ohne
   Farbmarkierung → beide bleiben nach Export/Re-Import strukturell unterscheidbar
   (siehe Grenzfall 4.9).

---

## 7. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

1. Text eingeben, markieren, Farbwähler öffnen, Farbe wählen → Text wird sichtbar in
   der gewählten Farbe dargestellt.
2. Dieselbe Markierung, „Entfernen"-Button klicken → Farbe verschwindet, Text kehrt zur
   Standardfarbe zurück.
3. Cursor ohne Selektion setzen, Farbe wählen, dann tippen → dokumentiertes
   Ist-Verhalten aus Abschnitt 3.2 bestätigen (kein Effekt auf neu getippten Text).
4. Gemischte Selektion (teils farbig, teils nicht bzw. unterschiedlich farbig)
   formatieren → Verhalten entspricht Grenzfall 4.6, keine JS-Exception.
5. Kombination Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe auf demselben
   Textlauf setzen → alle vier gleichzeitig sichtbar und unabhängig wieder entfernbar.
6. Regressionstest Selection-Sync-Bug mit „Schriftfarbe" statt „Fett" (siehe
   Grenzfall 4.18) — Pflichttest, dauerhaft in der Suite.
7. Undo/Redo über eine Sequenz Tippen → Farbe A setzen → Farbe B setzen → Farbe
   entfernen → erneut Tippen — jeder Schritt einzeln korrekt rückgängig/
   wiederherstellbar, unter Beobachtung von Grenzfall 4.16 (Anzahl der tatsächlich
   entstehenden Undo-Schritte dokumentieren).
8. Rundreise-Testfälle 1–9 aus Abschnitt 6, jeweils als eigener automatisierter Test.
9. Grenzfälle 1–19 aus Abschnitt 4 — jeweils mindestens ein gezielter Test, kein
   Sammeltest, der Einzelergebnisse verschleiert.
10. Sichtprüfung/Screenshot-Vergleich: Aussehen der Schriftfarbe im Editor entspricht
    optisch dem Aussehen nach Re-Import derselben Datei.
11. Rendering-Prüfung des „⌫"-Glyphen auf mindestens zwei verschiedenen
    Betriebssystemen/Browser-Kombinationen (siehe Abschnitt 2, Punkt 3, und
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1).
12. Tastatur-Bedienbarkeit: Farbwähler-Eingabefeld und „Entfernen"-Button jeweils per
    Tab erreichbar, Farbwähler per Enter/Leertaste öffenbar (kein reiner Maus-only-Weg).

---

## 8. Abgrenzung: Vorhandener Unit-Test vs. geforderter Nachweis

Der bestehende Unit-Test „preserves text color and highlight color" (in beiden
`roundtrip.test.ts`-Dateien) konstruiert das ProseMirror-JSON direkt und prüft nur
Reader/Writer-Funktionen isoliert mit genau zwei Farbwerten (`#ff0000`, `#ffff00`). Er
beweist **nicht**, dass:
- der Farbwähler in der Toolbar tatsächlich bedienbar ist und sichtbar reagiert,
- das „Entfernen"-Symbol im echten Browser überhaupt lesbar dargestellt wird,
- das in Abschnitt 3.2 beschriebene Verhalten bei leerer Selektion tatsächlich so
  eintritt (kein automatisierter Test deckt diesen Pfad aktuell ab),
- ein über die UI erzeugtes Dokument (nicht künstlich zusammengesetztes JSON) beim
  Export dieselbe Struktur erzeugt,
- Groß-/Kleinschreibungs-Unterschiede bei Fremddateien tatsächlich unkritisch bleiben.

Diese Punkte sind der eigentliche Kern der geforderten Verifikation und müssen durch
neue oder erweiterte E2E-Tests (z. B. Playwright, analog zu den bereits für Fett über
Toolbar vorhandenen Tests in `tests/e2e/docx.spec.ts`) geschlossen werden, bevor der
Backlog-Status von „vorhanden" auf „verifiziert" geändert werden darf.

---

## 9. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt
sind:

1. Alle Testfälle aus Abschnitt 7 sind als automatisierte Tests vorhanden und grün.
2. Mindestens die Rundreise-Testfälle 1, 2, 6 und 7 aus Abschnitt 6 sind mit echten,
   nicht selbst erzeugten Prüfwerkzeugen (unabhängiger Parser bzw. reale Fremddatei)
   bestanden.
3. Der Regressionstest aus Grenzfall 4.18 ist dauerhaft in der Testsuite verankert.
4. Das Verhalten bei leerer Selektion (Abschnitt 3.2/3.5, Grenzfall 4.1) ist bestätigt,
   dokumentiert und mit dem Auftraggeber/Backlog abgeglichen, ob es als akzeptabel gilt
   oder nachgebessert werden muss — diese Entscheidung ist explizit in dieser Datei
   oder einer Nachfolgedatei festzuhalten, nicht offen gelassen.
5. Die in Abschnitt 4 genannten Grenzfälle 11 und 12 (Theme-Farben bzw. benannte
   ODT-Zeichenformatvorlagen) sind mit echten Fremddateien geprüft und das
   Fallback-Verhalten ist dokumentiert.
6. Die Rendering-Prüfung des „⌫"-Glyphen (Testfall 11 in Abschnitt 7) ist auf
   mindestens zwei Systemen durchgeführt und das Ergebnis dokumentiert.
7. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
