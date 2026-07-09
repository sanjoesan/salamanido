# Anforderungsspezifikation: „Basis-Stabilisierung" — die fünf gemeldeten Grundfunktions-Defekte

Status: **Entwurf zur Freigabe, nicht vertrauenswürdig bis einzeln über echte
Browser-Bedienung verifiziert.** Diese Datei hat **Vorrang vor jedem neuen Feature** im
Backlog (Nutzer-Vorgabe 2026-07-09, wörtlich sinngemäß: „bevor neue Features kommen, müssen
die Grundfunktionen rund sein"). Slug: `basis-stabilisierung`.

**Rollentrennung (verbindlich, `specs/UX-INVARIANTEN.md` Abschnitt 3):** Diese Datei ist aus
**Nutzersicht** geschrieben, kennt den Implementierungsaufwand bewusst nicht und fordert
deshalb die offensichtlichen Nutzererwartungen ein, statt sie wegzurationalisieren. **Kein
Code, keine Tests** — nur die Anforderung, an der sich Umsetzung (Dev) und Abnahme (QA)
messen lassen.

**Geltungsbereich — genau fünf vom Nutzer wörtlich gemeldete Defekte**, hier als
eigenständige, einzeln nachweisbare Teilanforderungen **B1–B5** gebündelt, plus ein
Querschnitts-Befund (fehlende Basis-Styles):

| Kürzel | Beschwerde (Nutzer, 2026-07-09) |
|---|---|
| **B1** | „Man klickt auf Buttons Fett, Kursiv etc. — nichts wird angezeigt/ausgewählt." |
| **B2** | „Man hat eine Tabelle drinnen und kann unter/über der Tabelle nicht mehr schreiben." |
| **B3** | „Manchmal klickt man hinein und nix passiert." |
| **B4** | „Neues Dokument: es wird keine ganze Seite dargestellt, sondern nur ein kleiner Teil." |
| **B5** | „Man wählt Textfarbe aus, nix passiert." |

**Ausdrücklich NICHT Teil dieser Datei:** neue Formatierungs-Features, neue Toolbar-Buttons,
neue Exportfähigkeiten. Es geht ausschließlich darum, dass die **bereits vorhandenen**
Grundfunktionen zuverlässig, sichtbar und wie erwartet funktionieren.

Stil/Gliederung orientieren sich an `specs/tabelle-erstellen-loeschen-req.md` und
`specs/dokument-darstellung-req.md` (identischer Detailgrad, identische Abschnittsnummerierung
inkl. UX-Invarianten- und Journey-Durchgang). **Zeilennummern sind Momentaufnahmen** (Stand
2026-07-09, gegen `E:\docs\src` frisch durch eigenes Lesen verifiziert, nicht aus
Vorgänger-Dateien übernommen) und bei Umsetzung per Symbolsuche neu zu verankern.

---

## 0. Verifizierter Ist-Stand

Jede Zeile unten wurde durch direktes Lesen des aktuellen Quellcodes bestätigt.

| # | Betrifft | Fundstelle | Befund |
|---|---|---|---|
| 1 | B1 | `Toolbar.tsx:78–112` (`MarkButton`), aktiver Ausdruck `Toolbar.tsx:92` | `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — verwendet **ausschließlich** `$from.marks()`. Enthält **weder** `state.storedMarks` (die von ProseMirrors `toggleMark` bei kollabierter Schreibmarke gesetzte, noch nicht „verbrauchte" Formatierungsabsicht) **noch** eine Prüfung über die **gesamte** Range-Selektion (`doc.rangeHasMark(from, to, type)`). Das ist exakt die aus dem Standard-ProseMirror-Muster (`storedMarks ?? $from.marks()` für leere Selektion, `rangeHasMark` für Range-Selektion) abweichende, unvollständige Variante. Betrifft alle vier Buttons, die `MarkButton` nutzen: Fett/Kursiv/Unterstrichen/Durchgestrichen (`Toolbar.tsx:348–351`). |
| 2 | B1 | `specs/durchgestrichen-req.md` Abschnitt 3.2/Grenzfall 12, `specs/alles-auswaehlen-req.md` Zeile „Toolbar-Zustandsanzeige" | Dieselbe Lücke wurde bereits **für Durchgestrichen einzeln** dokumentiert („Aktiv-Zustand des Buttons unvollständig — nur aus `$from.marks()`, weder `storedMarks` noch die restliche Selektion") und in `alles-auswaehlen-req.md` als bekannter, aber dort bewusst ausgeklammerter Fakt vermerkt („zeigt nur den Zustand des allerersten Zeichens ... Nicht dieses Ticket"). Frisch am heutigen Code (2026-07-09) erneut bestätigt: **weiterhin ungefixt**, für **alle vier** Mark-Buttons, nicht behoben. |
| 3 | B1 | `Toolbar.tsx:405–437` (Listen-Buttons „• Liste"/„1. Liste"/„⇧ Liste") | Diese drei Buttons haben **überhaupt kein** `aria-pressed` und **keine** aktive/inaktive Hintergrundfarben-Unterscheidung — schlechter als die Mark-Buttons, die immerhin eine (unvollständige) Berechnung versuchen. Ein Klick zeigt **keinerlei** sichtbaren oder für Screenreader wahrnehmbaren Rückmeldezustand, unabhängig davon, ob der Cursor gerade in einer Liste steht. |
| 4 | B1 | `Toolbar.tsx:114–134` (`AlignButton`), `commands.ts:46–55` (`isAlignActive`) | Im Unterschied zu den Mark-Buttons **funktioniert** die Ausrichtungs-Anzeige für den Grundfall (Cursor in einem Absatz): `align` ist ein Knoten-**Attribut**, kein Mark, daher kein `storedMarks`-Analogon nötig, und `isAlignActive` liest korrekt das Attribut des umschließenden Absatzes/der Überschrift. **Aber:** `isAlignActive` prüft nur die Tiefe ab `$from` — bei einer Selektion über **mehrere Absätze mit unterschiedlicher Ausrichtung** ist unklar/ungetestet, ob der Button einen sinnvollen Zustand (aktiv nur bei einheitlicher Ausrichtung) zeigt oder fälschlich den Zustand nur des ersten Absatzes. |
| 5 | B1 | `Toolbar.tsx:355–394` (Farbfelder `<input type="color">`) | Die beiden Farbfelder (Textfarbe/Hervorhebung) haben **kein** `value`-Attribut, das an den aktuellen Mark-Zustand der Selektion gebunden ist (unkontrollierte Inputs) — das Farbfeld selbst zeigt nie an, welche Farbe an der aktuellen Cursor-/Selektionsposition bereits gesetzt ist. Relevant sowohl für B1 (Format-Feedback allgemein) als auch für B5. |
| 6 | B2 | `WordEditor.tsx:10,259` | `gapCursor()` (aus `prosemirror-gapcursor`) ist als Plugin **aktiv** — die Bibliothek soll genau den Fall lösen, dass ein Cursor vor/nach/zwischen nicht-Text-Blöcken (hier: Tabellen) platziert werden kann. |
| 7 | B2 | Volltextsuche über `src\` (Grep) auf `gapcursor`/`ProseMirror-gapcursor` | Es gibt **keine** CSS-Regel für `.ProseMirror-gapcursor` irgendwo im Projekt — nur der JS-Plugin-Import, **kein** Import von `prosemirror-gapcursor/style/gapcursor.css` oder einer äquivalenten eigenen Regel in `src/index.css`. Das Paket liefert sein Stylesheet **nicht automatisch** mit (muss laut Bibliotheks-Doku manuell eingebunden werden). Dieselbe Lücke wurde bereits für die Bild-Domäne dokumentiert (`specs/bild-loeschen-code.md` §1.5: „`gapCursor()` **L112** (aktiv, aber ohne zugehöriges Stylesheet)"; §1.5 weiter: „Keine Regel für ... `.ProseMirror-gapcursor` ... Volltextsuche über `src\`: 0 Treffer"). **Neu bestätigt (2026-07-09): weiterhin ungefixt, projektweit**, nicht nur im Bild-Kontext. Ohne dieses Stylesheet ist ein an einer Tabellengrenze platzierter Gap-Cursor **unsichtbar** — Nutzer:innen können nicht erkennen, dass der Editor überhaupt reagiert hat. |
| 8 | B2 | `commands.ts:183–193` (`insertTable`) | Fügt die Tabelle über `state.tr.replaceSelectionWith(table)` ein, **ohne** sicherzustellen, dass davor/danach ein Absatz existiert. **Konkreter, leicht reproduzierbarer Fall:** In einem neuen/leeren Dokument (genau ein leerer Absatz) über den Dialog eine Tabelle einfügen → `replaceSelectionWith` ersetzt den einzigen Absatz → die Tabelle ist danach der **einzige** Dokumentknoten, ohne einen einzigen Absatz davor oder danach. Dieser Zustand ist über die normale Toolbar-Bedienung **in einem einzigen Schritt** erreichbar, kein Importrandfall. |
| 9 | B2 | `schema.ts:14` (`doc: { content: 'block+' }`), `schema.ts:171` (`tableNodes(...)`) | Das Schema erlaubt eine Tabelle als einzigen bzw. äußeren Block; ob `gapCursor()` in genau diesem Zustand (Tabelle ohne jeglichen Nachbarblock) tatsächlich eine benutzbare Gap-Position vor/nach der Tabelle liefert, ist **bibliotheksabhängiges Verhalten**, das am Code nicht abschließend beweisbar ist — deshalb unten als **Pflicht-Testfall**, nicht als bereits erwiesene Tatsache formuliert. Bewiesen ist nur: (a) das Plugin ist aktiv, (b) sein visuelles Feedback fehlt vollständig (Punkt 7), (c) der Auslösezustand ist trivial erreichbar (Punkt 8). |
| 10 | B3 | `WordEditor.tsx:322–336` | Die einzigen Klick-Reconciliation-Listener (`onMouseDown`/`onMouseUp` → `reconcileSelectionOnClick`) hängen **ausschließlich** an `view.dom` — also exakt der `.ProseMirror`-contentEditable-Fläche selbst, nicht an einem umgebenden Container. |
| 11 | B3 | `WordEditor.tsx:382–402` (Rendering: `scrollRef`-Div, äußeres Footprint-Div, `sheetRef`-Div, `containerRef`-Div) | Weder das äußere Scroll-Div (`scrollRef`, grauer Hintergrund `bg-neutral-200`/`bg-neutral-950`) noch das „Blatt"-Div (`sheetRef`, weiß, mit `padding: PAGE_MARGIN_PX` als optischer Seitenrand) haben einen eigenen `onClick`/Fokus-Handler. Ein Klick auf den grauen Bereich außerhalb des Blatts **oder** auf den weißen `PAGE_MARGIN_PX`-Rand des Blatts (der optisch wie Teil der Seite aussieht, aber **außerhalb** von `containerRef`/`view.dom` liegt) fokussiert den Editor nicht und bewegt den Cursor nicht — kein JS-Fehler, einfach keine Reaktion. |
| 12 | B3, B4 | siehe Punkt 14 (Seitenhöhe) | Da die tatsächliche Höhe des „Blatts" laut Punkt 14 nur inhaltsgetrieben ist (nicht die volle A4-Höhe), ist die Fläche „unterhalb des letzten Absatzes, aber innerhalb des optisch weiß wirkenden Bereichs" in der Praxis **kleiner als erwartet** bzw. bei kurzem Inhalt **gar nicht vorhanden** — trägt zur „toten Fläche"-Wahrnehmung (B3) bei, ist aber in erster Linie ein B4-Symptom. |
| 13 | B4 | `WordEditor.tsx:388–398` (Style des `sheetRef`-Divs) | Das „Blatt"-Div setzt **nur** `width` (`PAGE_WIDTH_PX`), `padding` (`PAGE_MARGIN_PX`), `transform: scale(zoom)` und `pageBackgroundStyle()` — **keine** `height`/`minHeight`. Seine tatsächliche Höhe ist daher vollständig **inhaltsgetrieben** (Standard-Blockfluss). |
| 14 | B4 | `index.css:23–27` (`.ProseMirror { min-height: 100%; ... }`) | Diese Regel bezieht sich auf die Höhe des **Elternteils** (das `sheetRef`-Div). Nach CSS-Spezifikation wird ein prozentualer `min-height`-Wert **wirkungslos** (löst sich zu `auto` auf), wenn der Elternteil selbst keine **explizit gesetzte** Höhe hat — was laut Punkt 13 hier der Fall ist. **Konsequenz, direkt am Code nachvollzogen:** Ein neues/kurzes Dokument (z. B. ein einzelner leerer Absatz) rendert ein „Blatt", das nur so hoch ist wie eine Zeile plus Padding — **nicht** `PAGE_HEIGHT_PX` (≈1123 px bei 100 %). Das entspricht exakt der Nutzerbeschwerde „es wird keine ganze Seite dargestellt, sondern nur ein kleiner Teil." |
| 15 | B4 | `WordEditor.tsx:136,172–181` (`sheetHeight`-State + `ResizeObserver` auf `sheetRef`) | `sheetHeight` wird zwar mit `PAGE_HEIGHT_PX` **initialisiert** (Zeile 136), aber unmittelbar nach dem Mount per `ResizeObserver` auf `el.offsetHeight` des `sheetRef`-Divs **überschrieben** (Zeilen 172–181) — also auf die tatsächliche, inhaltsgetriebene (kurze) Höhe aus Punkt 13/14. `sheetHeight` dient ausschließlich der **Scroll-Footprint-Reservierung** (Zeile 387: `height: sheetHeight * zoom` auf dem äußeren Wrapper), **nicht** als erzwungene Mindesthöhe des sichtbaren Blatts selbst — bestätigt, dass keine Stelle im Code eine volle A4-Seite als Untergrenze erzwingt. |
| 16 | B4 | `specs/dokument-darstellung-req.md` §3 Grenzfall 1, §9 „Umsetzungsstand" | Die Vorgänger-Spezifikation forderte bereits „**Leeres Dokument** → genau eine leere A4-Seite" und der dortige Dev-Abschnitt 9 vermerkt Zoom/Fit-to-Width/Paginierung als umgesetzt und verifiziert. Das dort behandelte Themenfeld war jedoch **Zoom-Korrektheit und Mobile-Fit**, nicht die Grundfrage „ist das Blatt bei wenig Inhalt trotzdem eine volle A4-Höhe" — diese Lücke (Punkt 13–15) wurde **nicht** durch jenes Ticket geschlossen und ist am heutigen Code weiterhin vorhanden. Wird hier als eigenständiger, zu behebender Befund (B4) aufgenommen. |
| 17 | B5 | `commands.ts:363–370` (`applyMarkColor`) | `if (empty) return false` — bei kollabierter Schreibmarke (keine Selektion) passiert **nichts**: kein Fehler, aber auch keine Wirkung, kein `storedMarks`-Äquivalent für Farbe. |
| 18 | B5 | `commands.ts:372–379` (`clearMarkColor`) | Identisches Muster: `if (empty) return false` — „Entfernen" ohne Markierung ist ebenfalls ein stiller No-Op. |
| 19 | B5 | `specs/schriftfarbe-req.md` §3.2/§3.5, Grenzfall 4.1 | Dieser exakte Ist-Zustand wurde dort bereits als „bekannte Abweichung von den Bool-Marks" (Fett/Kursiv/Unterstrichen wirken über `toggleMark`/`storedMarks` auch ohne Selektion) dokumentiert und als offener „Verstoß gegen kein stiller Fehlschlag" markiert, aber **nicht als PASS/FAIL entschieden** — die Entscheidung wurde dort ausdrücklich offengelassen („mit Auftraggeber/Backlog abgeglichen … Entscheidung ist explizit … festzuhalten"). **Diese Datei trifft die Entscheidung jetzt verbindlich** (Abschnitt 2.5): Farbe muss wie Fett/Kursiv/Unterstrichen über eine Schreibmarken-Analogie wirken. |
| 20 | Querschnitt | Volltextsuche über `src\` (Grep) auf `white-space`/`pre-wrap` | **Kein Treffer.** Es gibt **keine** explizite `white-space`-Regel für `.ProseMirror`/`.ProseMirror p` in `src/index.css` oder anderswo. Ohne eine solche Regel ist das Verhalten bei **mehreren aufeinanderfolgenden Leerzeichen** vom Default-Verhalten des jeweiligen Browsers für `contenteditable` abhängig — uneinheitlich zwischen Chromium/Firefox/WebKit und keine verlässliche, selbst kontrollierte Eigenschaft des Editors. Befund **bestätigt** (nicht nur vermutet) und gehört als Querschnitts-Fix mit in dieses Paket. |
| 21 | Querschnitt | `index.css` gesamt (162 Zeilen, vollständig gelesen) | Neben Punkt 7/20 fehlt auch weiterhin `.ProseMirror-hideselection` (aus `specs/bild-loeschen-code.md` §1.5 bereits für die Bild-Domäne notiert) — hier nur der Vollständigkeit halber vermerkt, **nicht** Teil des Geltungsbereichs dieses Tickets (kein Nutzerkomplaint dazu), aber als Reminder, falls die Basis-Style-Lücke in einem Rutsch geschlossen wird. |

**Fazit:** Alle fünf gemeldeten Symptome sind durch eigenes Lesen des heutigen Codes
**bestätigt**, nicht nur vermutet — und in vier von fünf Fällen (B1, B2, B5, Querschnitt)
deckt sich der Befund mit einer bereits **früher dokumentierten, aber nie behobenen** Lücke
in Vorgänger-`req.md`-Dateien. Das bestätigt die Nutzerwahrnehmung „die Grundfunktionen laufen
nicht rund" strukturell: es handelt sich nicht um neue Bugs, sondern um seit längerem bekannte,
liegen gebliebene Defizite, die jetzt gebündelt und verbindlich vor jedem neuen Feature zu
schließen sind.

---

## 1. Bedienelemente / Menüpunkte betroffen

| # | Element | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Buttons Fett/Kursiv/Unterstrichen/Durchgestrichen (`MarkButton`) | Aktiv-Zustand nur aus `$from.marks()`, ignoriert `storedMarks` und Gesamt-Range (Ist-Stand 1–2) | Aktiv-Zustand korrekt für kollabierten Cursor (inkl. `storedMarks`) **und** Range-Selektion (`rangeHasMark`-Semantik), siehe Abschnitt 2.1 |
| 2 | Listen-Buttons („• Liste"/„1. Liste"/„⇧ Liste") | Kein `aria-pressed`, keine visuelle Aktiv-Unterscheidung (Ist-Stand 3) | Zeigen sichtbar und für Screenreader an, ob der Cursor aktuell in einer Liste des jeweiligen Typs steht |
| 3 | Ausrichtungs-Buttons (`AlignButton`) | Funktioniert für Einzelabsatz, Verhalten bei gemischter Mehrabsatz-Selektion unklar (Ist-Stand 4) | Konsistentes, definiertes Verhalten für Einzel- **und** Mehrabsatz-Selektion, siehe Abschnitt 2.1 |
| 4 | Farbfelder (Textfarbe/Hervorhebung, `<input type="color">`) | Kein an die Selektion gebundener `value` — zeigt nie die aktuell gesetzte Farbe (Ist-Stand 5); bei kollabierter Schreibmarke wirkungslos (Ist-Stand 17–19) | Zeigt die an der Cursorposition/Selektion aktive Farbe an; wirkt bei kollabierter Schreibmarke auf nachfolgend Getipptes (Schreibmarken-Analogie), siehe Abschnitt 2.5 |
| 5 | Editierbare Fläche (`.ProseMirror`, `containerRef`) | Klick-Handler nur auf `view.dom`, keine Reaktion außerhalb (Ist-Stand 10–12) | Klick **überall** auf der dargestellten Seite (Ränder, Fläche unter dem Inhalt) fokussiert den Editor und setzt den Cursor sinnvoll, siehe Abschnitt 2.3 |
| 6 | Seiten-„Blatt" (`sheetRef`) | Höhe inhaltsgetrieben, keine A4-Mindesthöhe (Ist-Stand 13–16) | Zeigt immer eine vollständige A4-Seite (volle Höhe inkl. Rändern), auch bei wenig/keinem Inhalt, siehe Abschnitt 2.4 |
| 7 | Tabelle am Dokumentanfang/-ende bzw. zwischen zwei Tabellen | `gapCursor()` aktiv, aber unsichtbar (kein Stylesheet, Ist-Stand 6–7); trivial erreichbarer Randzustand „Tabelle ohne Nachbarabsatz" (Ist-Stand 8–9) | Mit Maus **und** Tastatur ist vor/hinter einer Rand-Tabelle ein sichtbarer Cursor erreichbar und Schreiben dort möglich, siehe Abschnitt 2.2 |
| 8 | `.ProseMirror`-Basis-Styles | Kein `white-space`/`pre-wrap` (Ist-Stand 20) | Mehrfache Leerzeichen werden zuverlässig, browserübergreifend erhalten, siehe Abschnitt 2.6 |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 B1 — Formatierungs-Feedback ist sichtbar und korrekt

- **Kollabierter Cursor (keine Selektion):** Ein Klick auf Fett/Kursiv/Unterstrichen/
  Durchgestrichen ohne vorherige Textselektion muss den Button **sofort** als aktiv anzeigen
  — sowohl visuell (Hintergrundfarbe wie bei einer aktiven Selektion) als auch über
  `aria-pressed`. Das **nächste getippte Zeichen** trägt diese Formatierung
  (Schreibmarken-/`storedMarks`-Semantik, wie es ProseMirrors `toggleMark` bereits intern
  vorsieht — die Toolbar muss diesen Zustand nur noch korrekt **auslesen**). Bewegt sich der
  Cursor (Klick, Pfeiltasten), bevor getippt wurde, wird der Anzeigezustand für die neue
  Position neu bewertet.
- **Range-Selektion:** Der Button zeigt „aktiv" **nur**, wenn die Formatierung über die
  **gesamte** Selektion durchgängig vorhanden ist (Analogie „Word/LibreOffice": eine
  teilweise formatierte Selektion zeigt „inaktiv" oder einen klar dokumentierten
  Zwischenzustand, nicht fälschlich „durchgehend aktiv" oder „durchgehend inaktiv").
- **Nach Strg+A (Alles auswählen):** Der Aktiv-Zustand jedes Format-Buttons muss den
  **gesamten** markierten Dokumentinhalt widerspiegeln, nicht nur das erste Zeichen — schließt
  die in `specs/alles-auswaehlen-req.md` bewusst ausgeklammerte Lücke jetzt.
- **Sichtbarer Unterschied aktiv/inaktiv:** Der optische Unterschied (Hintergrund-/Textfarbe)
  muss auch bei Hell- **und** Dunkelmodus klar erkennbar sein — nicht nur über `aria-pressed`
  im DOM, das für sehende Maus-/Touch-Nutzer:innen unsichtbar ist.
- **Listen-Buttons:** „• Liste"/„1. Liste" zeigen ebenfalls sichtbar (Hintergrund) und für
  Screenreader (`aria-pressed`) an, ob der Cursor aktuell in einer Liste des jeweiligen Typs
  steht — sinngemäß dieselbe Anforderung wie bei den Mark-Buttons, angepasst an
  Block-/Knotenattribute statt Marks.
- **Ausrichtungs-Buttons:** Bei einer Selektion über mehrere Absätze mit **einheitlicher**
  Ausrichtung zeigt genau ein Button aktiv; bei **uneinheitlicher** Ausrichtung zeigt **kein**
  Button aktiv (kein irreführender „Zufalls"-Zustand aus nur dem ersten Absatz).
- **Farbfelder:** Das Farbwahl-Element selbst zeigt die an der aktuellen
  Cursorposition/Selektion bereits gesetzte Farbe an (bzw. einen neutralen/„gemischt"-Zustand
  bei uneinheitlicher Farbe innerhalb der Selektion) — kein Farbfeld, das unabhängig vom
  Dokumentzustand immer denselben (zuletzt manuell gewählten) Wert zeigt.

### 2.2 B2 — Schreiben unmittelbar vor/nach/zwischen Tabellen ist immer möglich

- **Tabelle am Dokumentanfang:** Steht eine Tabelle als erster Dokumentknoten (kein Absatz
  davor — z. B. weil sie in einem leeren Dokument eingefügt wurde, Ist-Stand 8), muss man
  **mit der Maus** (Klick oberhalb/am oberen Rand der Tabelle) **und** mit der **Tastatur**
  (Pfeil-hoch vom ersten Zelleninhalt aus, bzw. direkt nach dem Einfügen) einen Cursor
  **vor** die Tabelle setzen und dort schreiben können. Das Tippen von Text an dieser
  Position erzeugt einen neuen Absatz vor der Tabelle.
- **Tabelle am Dokumentende:** Spiegelbildlich für das Schreiben **nach** einer Tabelle ohne
  nachfolgenden Absatz.
- **Zwischen zwei unmittelbar aufeinanderfolgenden Tabellen** (kein trennender Absatz):
  ebenso ein erreichbarer, beschreibbarer Cursor zwischen beiden.
- **Sichtbarer Cursor (Gap-Cursor):** An all diesen Stellen muss ein **sichtbarer** Cursor
  erscheinen (nicht nur ein interner Selektionszustand ohne visuelles Feedback, wie aktuell
  laut Ist-Stand 7) — Nutzer:innen müssen erkennen können, dass der Editor reagiert hat und
  wo genau sie sich befinden, bevor sie zu tippen beginnen.
- **Klick-Erreichbarkeit:** Ein Mausklick knapp oberhalb/unterhalb der Tabelle (innerhalb des
  sichtbaren „Blatt"-Bereichs) muss zuverlässig den Gap-Cursor treffen, nicht stattdessen
  wirkungslos bleiben oder überraschend in die erste/letzte Zelle springen.
- **Tastatur-Erreichbarkeit:** Pfeiltasten hoch/runter von der ersten/letzten Zeile einer
  Rand-Tabelle aus erreichen zuverlässig die Position davor/danach, ohne dass der Cursor in
  der Tabelle „gefangen" bleibt.

### 2.3 B3 — Ein Klick irgendwo auf die dargestellte Seite fokussiert immer

- Ein Klick **überall** innerhalb der sichtbar dargestellten A4-Seite — einschließlich der
  weißen Randbereiche (die den Dokumenträndern entsprechen) und der Fläche unterhalb des
  zuletzt geschriebenen Absatzes bis zum unteren Blattrand — muss den Editor fokussieren und
  den Cursor an die **nächstliegende sinnvolle Position** setzen (z. B. Zeilenanfang/-ende
  der nächstgelegenen Zeile, Dokumentanfang/-ende).
- Es darf **keine** sichtbare Fläche innerhalb des Blatts geben, auf die ein Klick **ohne**
  jede Reaktion bleibt („tote Fläche"). Das gilt unabhängig davon, ob diese Fläche technisch
  Teil der ProseMirror-`contenteditable`-Region ist oder (wie aktuell die
  `PAGE_MARGIN_PX`-Ränder, Ist-Stand 11) außerhalb davon liegt.
- Der graue Bereich **außerhalb** des Blatts (Scroll-Hintergrund) ist davon ausdrücklich
  **ausgenommen** — dort ist keine Reaktion korrekt, da er erkennbar nicht Teil der Seite ist.

### 2.4 B4 — Ein neues/leeres Dokument zeigt immer eine vollständige A4-Seite

- Unmittelbar nach dem Anlegen eines neuen Dokuments (und bei jedem Dokument mit wenig
  Inhalt) wird eine **vollständige** A4-Seite dargestellt: volle Höhe (~297 mm inkl. beider
  Ränder), nicht nur ein inhaltshoher Streifen.
- Dieses Verhalten bleibt bestehen, unabhängig davon, wie wenig Inhalt vorhanden ist (ein
  einzelner leerer Absatz, eine kurze Zeile Text) — die Seite „wächst" nicht erst ab einer
  bestimmten Inhaltsmenge auf volle Höhe.
- Kommt weiterer Inhalt hinzu, der eine Seite überschreitet, entsteht wie bisher eine
  **weitere** volle A4-Seite (Paginierung bleibt unverändert korrekt, siehe
  `specs/dokument-darstellung-req.md`) — diese Anforderung ändert nichts an der Paginierung
  mehrseitiger Dokumente, nur am Verhalten der **letzten/einzigen, nicht vollständig
  gefüllten** Seite.
- Gilt unter jedem Zoomfaktor/Fit-to-Width-Zustand gleichermaßen (keine Regression der in
  `specs/dokument-darstellung-req.md` bereits abgenommenen Zoom-/Responsiveness-Anforderungen).

### 2.5 B5 — Textfarbe wirkt immer, auch ohne Selektion

- **Mit Range-Selektion:** Farbwahl färbt die Selektion — funktioniert laut Ist-Stand bereits
  korrekt, hier nur als Regressionsschutz erneut gefordert.
- **Mit kollabiertem Cursor (keine Selektion):** Eine Farbwahl (Textfarbe **und**
  Hervorhebungsfarbe) muss **ab der aktuellen Cursorposition für nachfolgend getippten Text**
  gelten — analog zur Schreibmarken-Semantik von Fett/Kursiv/Unterstrichen (Abschnitt 2.1).
  Kein stiller No-Op mehr wie im aktuellen Ist-Stand (Ist-Stand 17–19).
- **Sichtbares Feedback:** Nach einer Farbwahl bei kollabiertem Cursor zeigt die Toolbar
  (Farbfeld-Zustand, siehe Abschnitt 2.1) erkennbar an, dass eine Farbe „vorgemerkt" ist —
  konsistent mit der Fett/Kursiv-Anzeige im selben Zustand.
- **Entfernen-Weg bei kollabiertem Cursor:** Der „⌫"-Entfernen-Button muss ebenfalls bei
  kollabiertem Cursor sinnvoll wirken (eine vorgemerkte Farbe zurücknehmen, bzw. bei
  bestehendem Text mit Farbe direkt links/rechts vom Cursor einen sinnvollen, dokumentierten
  Effekt haben) — kein stiller No-Op.
- **Bewegt sich der Cursor** (Klick, Pfeiltasten), bevor getippt wurde, wird der vorgemerkte
  Farbzustand für die neue Position neu bewertet (wie bei Fett/Kursiv/Unterstrichen).
- **Diese Datei entscheidet damit verbindlich** die in `specs/schriftfarbe-req.md` §3.2/§3.5
  offengelassene Frage: Farbe **muss** wie die Bool-Marks funktionieren, kein bewusst
  akzeptierter Ist-Zustand mehr.

### 2.6 Querschnitt — fehlende ProseMirror-Basis-Styles

- `.ProseMirror`/`.ProseMirror p` erhalten eine explizite `white-space`-Regel, die mehrere
  aufeinanderfolgende Leerzeichen zuverlässig und **browserübergreifend identisch** darstellt
  (nicht dem impliziten, uneinheitlichen `contenteditable`-Default der jeweiligen
  Browser-Engine überlassen, Ist-Stand 20).
- Diese Änderung darf die bestehende Zeilenumbruch-/Absatzdarstellung sowie die Paginierung
  (`pagination.ts`, misst `offsetHeight`) nicht verändern — reiner Darstellungsfix ohne
  Einfluss auf Dokumentmodell oder Export.

---

## 3. Grenzfälle

### B1
1. Fett aktivieren bei kollabiertem Cursor, ohne zu tippen, dann per Klick woanders hin
   springen → Aktiv-Anzeige verschwindet wieder (kein „hängender" Zustand an der falschen
   Position).
2. Selektion beginnt fett, endet nicht-fett (gemischt) → Button zeigt definiert „inaktiv"
   (nicht „aktiv" aufgrund des ersten Zeichens).
3. Strg+A über ein Dokument mit gemischter Formatierung → alle Format-Buttons zeigen den
   nach der jeweiligen Regel (2.1) korrekten, konsistenten Zustand.
4. Cursor in einer Tabellenzelle mit eigener Formatierung → Format-Buttons zeigen den Zustand
   der Zelle, nicht einen globalen/falschen Dokumentzustand.
5. Schnelles, wiederholtes Klicken auf denselben Format-Button → kein inkonsistenter
   Zwischenzustand (z. B. Mark an manchen, nicht an anderen Zeichen einer Selektion).
6. Tastaturaktivierung (Tab-Fokus + Enter/Leertaste, ohne Maus) → Aktiv-Anzeige aktualisiert
   sich identisch zur Mausbedienung.

### B2
7. Tabelle ist der **einzige** Dokumentinhalt (kein Absatz davor/danach) → Cursor vor **und**
   nach der Tabelle erreichbar und beschreibbar (Haupttestfall, direkt aus Ist-Stand 8
   abgeleitet).
8. Zwei unmittelbar aufeinanderfolgende Tabellen ohne trennenden Absatz → Cursor dazwischen
   erreichbar und beschreibbar.
9. Tabelle mit vorhandenem Absatz davor/danach (Normalfall) → weiterhin unverändert
   funktionsfähig (Regressionsschutz).
10. Schreiben unmittelbar vor einer Tabelle, danach Undo → der neu geschriebene Absatz
    verschwindet vollständig, Tabelle unverändert.
11. Verschachtelte Tabelle (Tabelle in einer Zelle) am Rand ihrer eigenen Zelle → sinngemäß
    dasselbe Cursor-Verhalten innerhalb der Zelle.

### B3
12. Klick auf den weißen Rand (Seitenrand) oberhalb des ersten Absatzes → Cursor springt an
    den Anfang des ersten Absatzes.
13. Klick auf die Fläche unterhalb des letzten Absatzes, aber noch innerhalb der sichtbaren
    Seite → Cursor springt ans Ende des letzten Absatzes.
14. Klick auf den grauen Bereich außerhalb des Blatts (z. B. beim Herauszoomen) → bewusst
    **keine** Reaktion (kein Cursor-Sprung), da erkennbar außerhalb der Seite.
15. Klick auf eine Tabellenzelle nahe ihrem Rand → Cursor landet in der Zelle, nicht
    fälschlich außerhalb.
16. Klick unter jedem Zoomfaktor (50 %–200 %, Fit-to-Width) → Fokussierung/Cursor-Setzung
    bleibt korrekt (Regressionsschutz zu `specs/dokument-darstellung-req.md` §2.2/Grenzfall 5).

### B4
17. Neues Dokument sofort nach dem Anlegen → volle A4-Seite, kein Zwischenzustand mit
    „springender" Höhe beim ersten Layout-Zyklus.
18. Ein einzelnes kurzes Wort als einziger Inhalt → weiterhin volle Seitenhöhe.
19. Inhalt wird nachträglich gelöscht, bis nur ein leerer Absatz übrig bleibt (z. B. nach
    „Tabelle löschen" bei einziger Tabelle) → Seite bleibt/wird wieder vollständig hoch, kein
    Schrumpfen auf einen Streifen.
20. Sehr langes, mehrseitiges Dokument → **jede** Seite (auch die letzte, ggf. nur teilweise
    gefüllte) zeigt volle A4-Höhe, nicht nur die erste.
21. Zoom-/Fit-to-Width-Wechsel bei kurzem Dokument → Seite bleibt bei jedem Zoom vollständig
    hoch (keine Regression zu bereits abgenommenem Zoom-Verhalten).

### B5
22. Farbe wählen bei kollabiertem Cursor, dann Klick woanders hin (ohne zu tippen) → die
    vorgemerkte Farbe wird für die **neue** Position neu bewertet (nicht an der alten Position
    "vergessen" angewendet).
23. Farbe wählen bei kollabiertem Cursor, tippen, dann Farbe erneut ändern, weiter tippen →
    zwei unterschiedlich gefärbte Textabschnitte im selben Lauf.
24. Kombination Fett + Textfarbe bei kollabiertem Cursor, beide vor dem Tippen gesetzt →
    getippter Text trägt **beide** Formatierungen.
25. Farbe entfernen bei kollabiertem Cursor ohne zuvor vorgemerkte Farbe → definiertes
    No-Op-Verhalten, kein JS-Fehler.
26. Farbwahl unmittelbar gefolgt von Undo (ohne zu tippen) → definiertes, nicht
    überraschendes Verhalten (zu klären: erzeugt das Vormerken einer Farbe einen eigenen
    Undo-Schritt oder keinen sichtbaren Dokumentzustand vor dem ersten getippten Zeichen?).

### Querschnitt
27. Drei/vier aufeinanderfolgende Leerzeichen eingeben, exportieren (DOCX **und** ODT),
    reimportieren → alle Leerzeichen bleiben erhalten (keine Kollabierung auf ein einzelnes).
28. Dieselbe Eingabe in Firefox/Chromium/WebKit (soweit im Playwright-Projektmatrix vorhanden,
    `playwright.config.ts`) → identisches Darstellungsverhalten.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme, wo Inhalte betroffen sind)

**B1 (Formatierungs-Feedback):** Reiner Anzeige-/UI-Zustandsfix — die zugrundeliegenden Marks
(Fett/Kursiv/Unterstrichen/Durchgestrichen) round-trippen bereits über bestehende, eigene
Anforderungen (`specs/fett-req.md`, `specs/kursiv-req.md`, `specs/durchgestrichen-req.md` etc.).
**Keine neue Rundreise-Anforderung** hier nötig — nur Regressionsschutz: die bestehenden
Rundreise-Tests dieser Features müssen vor/nach der B1-Behebung unverändert grün bleiben.

**B2 (Schreiben um Tabellen):** **Pflicht**, da neuer Inhalt (ein vor/nach/zwischen
Rand-Tabellen geschriebener Absatz) round-trippen muss:
1. Neues Dokument → Tabelle als einzigen Inhalt einfügen → davor **und** danach je einen
   Absatz mit Text schreiben (über den Gap-Cursor, Abschnitt 2.2) → als DOCX exportieren →
   reimportieren → beide Absätze samt Text an der richtigen Position vorhanden, Tabelle
   unverändert.
2. Dasselbe als ODT.
3. Zwei Tabellen ohne trennenden Absatz → einen Absatz dazwischen schreiben → DOCX- **und**
   ODT-Rundreise → der neue Absatz liegt nach Reimport weiterhin zwischen beiden Tabellen.

**B3 (Klick fokussiert):** Reiner Interaktionsfix ohne Dokumentänderung — **keine**
Rundreise-Anforderung (kein Inhalt betroffen).

**B4 (Ganze Seite):** Reiner Darstellungsfix (Layout/CSS) ohne Dokumentmodell-Bezug — **keine**
Rundreise-Anforderung; Regressionsschutz: bestehende Export-Rundreisen (`docx.spec.ts`,
`odt.spec.ts`, `roundtrip-fidelity.spec.ts`) bleiben unverändert grün, da Seitenhöhe nie Teil
von `doc.toJSON()` oder des Exports ist.

**B5 (Textfarbe):** **Pflicht**, da die stored-mark-basiert gefärbte Textstelle round-trippen
muss:
1. Kollabierten Cursor setzen, Textfarbe wählen, tippen → als DOCX exportieren →
   reimportieren → getippter Text trägt exakt die gewählte Farbe (`<w:color>`/CSS `color`),
   umgebender Text unverändert.
2. Dasselbe als ODT.
3. Kombination Fett + Textfarbe bei kollabiertem Cursor (Grenzfall 24) → DOCX- **und**
   ODT-Rundreise → beide Formatierungen bleiben am getippten Text erhalten.

**Abnahmemaßstab:** Formatierungs-/Inhaltsverluste außerhalb der unmittelbar betroffenen
Stelle sind nicht akzeptabel.

---

## 5. Testfälle (Soll)

Kein Test wird durch diese Datei implementiert — sie legt fest, was vor einem Statuswechsel
auf „behoben"/„verifiziert" nachzuweisen ist. E2E-Tests durchgängig über **echte**
Browser-Interaktion (`page.getByRole`, `page.keyboard`, `page.mouse`), inkl. der **Touch**-
Playwright-Projekte (`Mobile`, `Tablet`, `playwright.config.ts:34–36`), nicht nur Desktop
Chrome.

### 5.1 Unit-Tests
- B1: Aktiv-Zustands-Berechnung für Fett/Kursiv/Unterstrichen/Durchgestrichen — kollabierter
  Cursor mit `storedMarks` gesetzt vs. nicht gesetzt; Range-Selektion vollständig/teilweise/
  gar nicht formatiert (`rangeHasMark`-Fälle); nach `AllSelection` (Strg+A) mit gemischter
  Formatierung.
- B1: `isAlignActive`-Verhalten bei Mehrabsatz-Selektion mit einheitlicher vs. gemischter
  Ausrichtung.
- B2: `insertTable` in ein leeres Dokument → resultierendes Dokument hat Tabelle als einzigen
  Knoten (bestätigt den Ist-Stand-8-Auslösezustand als reproduzierbaren Testfall); Cursor-/
  Gap-Selektionsverhalten direkt vor/nach diesem Knoten.
- B4: Eine Funktion/ein Layout-Test, der bestätigt, dass die berechnete/angewendete
  Seiten-Mindesthöhe unabhängig vom Inhalt `PAGE_HEIGHT_PX` entspricht.
- B5: `applyMarkColor`/`clearMarkColor` (bzw. deren Nachfolge-Implementierung) bei kollabierter
  Schreibmarke — Ergebnis ist ein `storedMarks`-Effekt, kein `false`/No-Op mehr.

### 5.2 E2E-Tests (Playwright, echte Bedienung)

**B1:**
1. Cursor ohne Selektion setzen, „Fett" klicken → Button sofort sichtbar aktiv (visuell **und**
   `aria-pressed`), dann tippen → getippter Text ist fett.
2. Text markieren, der durchgehend fett ist → Button zeigt aktiv; Selektion mit gemischter
   Fett-Formatierung → Button zeigt inaktiv (bzw. definierten Zwischenzustand).
3. Strg+A über ein Dokument mit gemischter Formatierung → jeder Format-Button zeigt den nach
   2.1 korrekten Zustand.
4. „• Liste" anklicken, Cursor bleibt in der Liste → Button zeigt aktiv; Cursor per Klick
   außerhalb der Liste bewegen → Button zeigt inaktiv.
5. Tab-Fokus (kein Klick) + Enter **und separat** Leertaste auf jedem Format-Button → schaltet
   um, Aktiv-Anzeige aktualisiert sich identisch zur Mausbedienung.
6. Auf **Mobile**- und **Tablet**-Projekt: Antippen eines Format-Buttons zeigt denselben
   sichtbaren Aktiv-Zustand wie auf Desktop.

**B2:**
7. Neues Dokument → Tabelle über den Dialog einfügen (wird einziger Inhalt) → per Mausklick
   oberhalb der Tabelle klicken → sichtbarer Cursor erscheint dort → tippen → neuer Absatz vor
   der Tabelle enthält den getippten Text.
8. Dasselbe für **unterhalb** der Tabelle.
9. Dasselbe rein über Tastatur (Pfeil-hoch/-runter aus einer Zelle heraus, kein Klick).
10. Zwei Tabellen ohne trennenden Absatz einfügen → Cursor zwischen beiden setzen (Klick und
    Tastatur) → tippen → neuer Absatz zwischen beiden Tabellen.
11. Auf **Mobile**- und **Tablet**-Projekt: Antippen der Fläche vor/nach einer Rand-Tabelle
    setzt einen sichtbaren, beschreibbaren Cursor.

**B3:**
12. Klick auf den weißen Seitenrand oberhalb des Inhalts → Editor fokussiert, Cursor am
    Dokumentanfang.
13. Klick auf die Fläche unterhalb des letzten Absatzes (innerhalb der sichtbaren Seite) →
    Editor fokussiert, Cursor am Dokumentende.
14. Klick auf den grauen Bereich außerhalb des Blatts → bewusst keine Fokus-/
    Cursor-Änderung (Negativtest).
15. Klick-Tests unter mind. zwei Zoomstufen (100 % und Fit-to-Width) wiederholen →
    gleichbleibend korrekt.
16. Auf **Mobile**- und **Tablet**-Projekt: Antippen des Seitenrands fokussiert den Editor.

**B4:**
17. Neues Dokument öffnen → `data-testid="page-sheet"`-Element hat eine gerenderte Höhe, die
    (bei 100 % Zoom) `PAGE_HEIGHT_PX` entspricht (Toleranz für Rundung).
18. Kurzen Text eingeben (eine Zeile) → Seitenhöhe bleibt unverändert bei voller A4-Höhe.
19. Mehrseitiges Dokument importieren → jede einzelne Seite (auch die letzte, teilweise
    gefüllte) hat volle A4-Höhe.
20. Wiederholen unter Fit-to-Width auf **Mobile**- und **Tablet**-Projekt.

**B5:**
21. Cursor ohne Selektion setzen, Textfarbe wählen → tippen → getippter Text hat die gewählte
    Farbe (`style="color: …"` im DOM), umgebender Text unverändert.
22. Dasselbe für Hervorhebungsfarbe.
23. Farbe wählen, Cursor per Klick verschieben (nicht tippen) → an der ursprünglichen Position
    kein Effekt, an der neuen Position wird der vorgemerkte Zustand neu bewertet.
24. Kombination Fett + Textfarbe bei kollabiertem Cursor, tippen → beide Formatierungen am
    getippten Text.
25. „⌫ Textfarbe entfernen" bei kollabiertem Cursor mit vorgemerkter Farbe → vorgemerkte Farbe
    wird zurückgenommen, definiertes Verhalten.

**Querschnitt:**
26. Drei aufeinanderfolgende Leerzeichen eintippen → im DOM/gerenderten Text sichtbar
    erhalten (nicht auf ein Leerzeichen kollabiert); Export/Reimport (DOCX und ODT) erhält sie
    ebenfalls.

---

## 6. Definition of Done

„Basis-Stabilisierung" gilt als abnahmefähig, wenn:

1. **B1:** Jeder Format-Button (Fett/Kursiv/Unterstrichen/Durchgestrichen, Listen, Ausrichtung)
   zeigt einen korrekten, sichtbaren Aktiv-Zustand für kollabierten Cursor (inkl.
   `storedMarks`) und Range-Selektion (inkl. Strg+A), durch E2E-Tests belegt (Abschnitt 5.2,
   Testfälle 1–6).
2. **B2:** Vor/nach/zwischen Rand-Tabellen ist mit Maus **und** Tastatur ein sichtbarer Cursor
   erreichbar und Schreiben dort funktioniert, inkl. DOCX-/ODT-Rundreise (Abschnitt 4),
   E2E-belegt inkl. Touch-Projekte (Abschnitt 5.2, Testfälle 7–11).
3. **B3:** Ein Klick überall auf der sichtbar dargestellten Seite fokussiert den Editor und
   setzt den Cursor sinnvoll, keine „tote Fläche" mehr, E2E-belegt inkl. Touch-Projekte
   (Abschnitt 5.2, Testfälle 12–16).
4. **B4:** Ein neues/kurzes Dokument zeigt immer eine vollständige A4-Seite, unter jedem Zoom/
   Fit-to-Width, E2E-belegt inkl. Touch-Projekte (Abschnitt 5.2, Testfälle 17–20).
5. **B5:** Textfarbe (und Hervorhebungsfarbe) wirkt sowohl bei Range-Selektion als auch bei
   kollabiertem Cursor (Schreibmarken-Analogie zu Fett/Kursiv), inkl. DOCX-/ODT-Rundreise
   (Abschnitt 4), E2E-belegt (Abschnitt 5.2, Testfälle 21–25).
6. **Querschnitt:** `white-space`-Verhalten für mehrere Leerzeichen ist browserübergreifend
   definiert und getestet (Abschnitt 5.2, Testfall 26).
7. **Grenzfälle** aus Abschnitt 3 einzeln geprüft und ihr Verhalten dokumentiert.
8. **Regressionsschutz:** Alle bestehenden Rundreise- (`docx.spec.ts`, `odt.spec.ts`,
   `roundtrip-fidelity.spec.ts`, alle `roundtrip.test.ts`), Paginierungs- und
   Selection-Sync-Tests bleiben vor/nach unverändert grün; die volle E2E-Suite über alle
   Playwright-Projekte (Desktop Chrome, Mobile, Tablet, Desktop Safari, Desktop Firefox) ist
   grün.
9. Kein neues Feature/kein neuer Toolbar-Button wurde als Nebeneffekt eingeführt — der
   Geltungsbereich bleibt auf B1–B5 plus Querschnitt beschränkt.

Erst danach wird mit neuen Formatierungs-/Bearbeitungs-Features aus dem Backlog fortgefahren.

---

## 7. UX-Invarianten-Durchgang (`specs/UX-INVARIANTEN.md` §1 — Punkt für Punkt)

1. **View-Sync:** Direkt betroffen durch B2 (Gap-Cursor-Fokus muss beim Setzen sichtbar/im
   Blick sein, `scrollIntoView` wo nötig) und B3 (Klick muss die Ansicht nie „woanders stehen
   lassen" — der Cursor wird sichtbar an die geklickte/nächstliegende Stelle gesetzt).
   **Lücke → Anforderung ergänzt** (Abschnitt 2.2, 2.3).
2. **Zustands-Feedback:**
   - *Laden sichtbar:* nicht direkt betroffen (keine der fünf Beschwerden betrifft
     lange-laufende Aktionen) — **bewusst nicht relevant**.
   - *Erfolg sichtbar:* B1 und B5 sind im Kern **genau diese** Anforderung — ein
     Formatierungs-Klick/eine Farbwahl muss sichtbares Feedback erzeugen. **Lücke →
     Anforderung ergänzt** (Abschnitt 2.1, 2.5).
   - *Fehler sichtbar + Ausweg:* nicht direkt betroffen — B1/B5 sind stille **No-Ops**, keine
     Fehler im engeren Sinn; die Anforderung hier ist, dass sie **keine No-Ops mehr sind**,
     nicht dass ein Fehler sichtbar gemacht wird.
   - *Leerzustand hat Hinweis:* B4 ist die visuelle Ausprägung dieser Invariante für den
     Editor selbst — ein leeres/neues Dokument bekommt eine vollständige, erkennbare A4-Seite
     statt eines kommentarlosen kurzen Streifens. **Lücke → Anforderung ergänzt** (Abschnitt
     2.4).
3. **Fokus/Tastatur:** B1 fordert explizit die Tastaturaktivierung (Tab + Enter/Leertaste) mit
   korrekter Aktiv-Anzeige (Abschnitt 2.1, Grenzfall 6, Testfall 5); B2 fordert die
   **rein-tastaturbasierte** Erreichbarkeit von Cursor-Positionen um Tabellen (Abschnitt 2.2,
   Testfall 9). **Erfüllt durch die hier gestellten Anforderungen**, sofern umgesetzt.
4. **Responsiveness:** Alle fünf Teilanforderungen verlangen ausdrücklich E2E-Nachweis auf den
   **Mobile**- und **Tablet**-Playwright-Projekten (Abschnitt 5.2, Testfälle 6, 11, 16, 20),
   nicht nur Desktop Chrome. **Erfüllt durch die hier gestellten Anforderungen**, sofern
   umgesetzt.
5. **Persistenz (invertiert):** Keiner der fünf Defekte betrifft Persistenz; die Behebung
   ändert nichts an der bestehenden Nicht-Persistenz von Dokumentinhalt/Zoom/Scroll.
   **Bewusst nicht relevant.**
6. **Konsistenz:** Alle neuen/angepassten sichtbaren Zustände (Aktiv-Hintergrund der
   Format-/Listen-Buttons, Gap-Cursor-Darstellung, Seiten-Hintergrund) müssen in **Hell- und
   Dunkelmodus** gleichermaßen erkennbar sein (bestehendes `@media
   (prefers-color-scheme: dark)`-Muster, `index.css`, fortführen). **Lücke → Anforderung
   ergänzt**, da die aktuell fehlenden Styles (Gap-Cursor, Listen-Aktiv-Zustand) beide Modi
   von Grund auf neu berücksichtigen müssen, nicht nur einen.

## 8. Journey-Durchgang (`specs/UX-INVARIANTEN.md` §2)

1. Nutzer öffnet ein neues Dokument → *erwartet:* eine vollständige, leere A4-Seite, kein
   kurzer Streifen. → **B4**, aktuell verletzt (Ist-Stand 13–16), hier behoben (Abschnitt 2.4).
2. Nutzer klickt irgendwo auf die dargestellte Seite, um zu schreiben → *erwartet:* der Cursor
   erscheint dort oder in der Nähe, der Editor ist fokussiert. → **B3**, aktuell teilweise
   verletzt (tote Randflächen, Ist-Stand 10–12), hier behoben (Abschnitt 2.3).
3. Nutzer markiert Text und klickt „Fett" → *erwartet:* der Text wird sofort sichtbar fett,
   **und** der Button zeigt „aktiv". → funktioniert für den Basisfall bereits (das eigentliche
   Fett-Anwenden ist nicht der gemeldete Defekt); die **Button-Anzeige** ist der gemeldete
   Defekt (B1) und wird hier behoben.
4. Nutzer klickt „Fett" **ohne** vorherige Selektion und tippt weiter → *erwartet:* der Button
   zeigt sofort „aktiv", der neu getippte Text ist fett. → **B1**, aktuell verletzt (Ist-Stand
   1–2), hier behoben (Abschnitt 2.1).
5. Nutzer fügt eine Tabelle in ein neues/leeres Dokument ein und will danach einen erklärenden
   Absatz davor schreiben → *erwartet:* ein Klick/Pfeiltaste vor die Tabelle setzt einen
   sichtbaren Cursor, Tippen erzeugt den Absatz. → **B2**, aktuell verletzt (Ist-Stand 6–9),
   hier behoben (Abschnitt 2.2).
6. Nutzer wählt eine Textfarbe, ohne vorher etwas zu markieren, und tippt weiter → *erwartet:*
   der neu getippte Text erscheint in der gewählten Farbe. → **B5**, aktuell verletzt
   (Ist-Stand 17–19), hier behoben (Abschnitt 2.5).

Referenz: `specs/UX-INVARIANTEN.md` (verbindliche Methodik). Diese Datei wurde von einem
eigenständigen **PO-Agenten** geschrieben (Abschnitt 3 der Methodik-Datei), unabhängig vom
späteren Dev-Machbarkeits-Review.

---

## 9. Umsetzungsstand (2026-07-09)

Alle fünf Teilanforderungen plus Querschnitt sind umgesetzt und lokal verifiziert:
**Unit 649/649**, **E2E 982 passed / 0 failed / 137 skipped** (Skips = projektgebundene
Tests wie Drag-nur-Desktop) über alle fünf Playwright-Projekte, Lint/`tsc -b` sauber.

**B1** — `isMarkActive` (storedMarks + Ganz-Range), `isListActive`, `isAlignActive`
(Mehrabsatz: nur einheitliche Ausrichtung zeigt aktiv), Farbfelder als kontrollierte Inputs
über `activeColor` (einheitlich/vorgemerkt = Farbe, gemischt/ungesetzt = neutraler Default).
Entscheidung: `toggleMark(..., { removeWhenPresent: false })` — Word-Semantik, teils fette
Selektion wird erst durchgehend fett; „Button aktiv" heißt immer „nächster Klick schaltet ab".
Alle Format-Buttons aktivieren über `onClick` (Maus, Enter UND Leertaste), `onMouseDown` nur
noch `preventDefault` (Selektionserhalt).

**B2** — `gapCursor()` in der Plugin-Reihenfolge VOR `tableEditing()` (Pfeiltasten an
Rand-Zeilen erreichen die Gap-Position; innere Zeilen navigieren unverändert in der Tabelle,
weil dort kein gültiger Gap existiert) plus `.ProseMirror-gapcursor`-CSS in `index.css`
(das Paket liefert sein Stylesheet nicht mit — der Cursor war unsichtbar). Nebenwirkung
dokumentiert: Rückwärts-Pfeil zu einem Block-Bild hat jetzt einen zusätzlichen, korrekten
Gap-Stopp (`bild-groesse-aendern.spec.ts` §2.11 angepasst); vorwärts bleibt es ein Stopp.

**B3** — zweigleisig: (a) `focusEditorFromSheet` (mousedown auf dem Blatt außerhalb der
contenteditable-Fläche → Fokus + sinnvolle Cursorposition; vertikal außerhalb zählt die
Dokumentgrenze, bei Rand-Tabelle/-Bild als GapCursor); (b) die mouseup-Klick-Reparatur
repariert nur noch Klicks, die bis mouseup KEINE Selektionsänderung im Modell ausgelöst
haben („man klickt hinein und nix passiert", Chromium lässt Klick-Selektionen teils
ungeflusht) — frisch platzierte GapCursor/NodeSelections bleiben unangetastet. Ein pauschaler
`empty`-Frühausstieg wäre falsch (deaktivierte die Reparatur komplett; als Regression über
sechs rote E2E-Tests gefunden).

**B4** — Blatt-`minHeight` auf ganze Seiten aus der Inhalts-Flusshöhe abgeleitet
(`pageMinHeight`, ResizeObserver auf `containerRef`, nicht auf dem Blatt selbst —
Rückkopplung); `pageBackgroundStyle()` malt das volle Seitenband inkl. beider Ränder weiß.
Dazu App-Shell-Fix: im Editor-Modus `h-dvh` statt `min-h-screen` (`App.tsx`) — vorher
scrollte das FENSTER statt des internen Seitenbereichs, sobald das Blatt volle A4-Höhe hat;
die Zoom-Statusleiste blieb sonst nicht sichtbar.

**B5** — `applyMarkColor`/`clearMarkColor` wirken bei kollabierter Schreibmarke über
`addStoredMark`/`removeStoredMark` (kein stiller No-Op mehr); Rundreisen DOCX
(`<w:color>`) und ODT (`fo:color`) E2E-belegt.

**Querschnitt** — `white-space: pre-wrap` + `word-wrap: break-word` für `.ProseMirror`;
Mehrfach-Leerzeichen DOCX- (`xml:space="preserve"`) und ODT-Rundreise (`<text:s>`) belegt.

**Test-Anpassung außerhalb dieses Tickets:** Tf 23 (B5) bewegt den Cursor per Klick statt
`Strg+Pos1` (auf dem iPad-WebKit-Projekt keine Cursorbewegung; Klick entspricht dem
Grenzfall-22-Wortlaut).
