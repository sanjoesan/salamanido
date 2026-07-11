# Feature „Suchen" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe** — Backlog-Status ist „fehlt" und gilt aktuell als
**nicht vertrauenswürdig**. Diese Datei ersetzt keine Codeaussage, sondern definiert
verbindlich, was „fertig" für dieses Feature bedeutet. Bevor irgendein Status auf
„vorhanden" gesetzt wird, muss jeder Punkt unten durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein — siehe
Abschnitt 13 „Verifikationsauftrag".

Bezug zum Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt „2.5 Bearbeiten
(Suchen & Navigieren)"):

| Slug | Titel | Status laut Backlog | Priorität | Teil dieser Spezifikation? |
|---|---|---|---|---|
| `suchen` | Suchen | fehlt | 1 (essenziell) | **Ja — Kernumfang, Pflicht** |
| `suchen-ersetzen` | Suchen & Ersetzen | fehlt | 2 (wichtig) | Ja — Abschnitt 9, wünschenswerte Erweiterung |
| `suchen-ersetzen-erweitert` | Erweiterte Suche (Regex/Formatierung) | fehlt | 4 (Randfall) | Nein — explizit außerhalb des Scopes, siehe Abschnitt 10 |
| `gehe-zu` | Gehe zu (Seite/Abschnitt/Zeile) | fehlt | 3 | Nein — eigenes Feature, nur als Abgrenzung erwähnt (Abschnitt 10) |

Die Beschreibung im Aufgabenauftrag lautet wörtlich: „Findet Textstellen im Dokument
und hebt sie hervor." Das ist exakt der Kernumfang von Abschnitt 2–8 dieser Spezifikation
(reines **Suchen**, ohne Textänderung). Alles darüber hinaus (Ersetzen, Regex) ist als
klar abgegrenzte, optionale Erweiterung markiert, damit Umfang und Abnahmekriterien nicht
verwässert werden.

Architektur-Grundprinzip (wie in `FEATURE-SPEC-DOCX-ODT.md`): DOCX und ODT teilen sich
einen gemeinsamen internen Editor (`src/formats/shared/editor/`, ProseMirror-Schema +
Seitenansicht). Die Suche muss deshalb **unabhängig vom Ursprungsformat** funktionieren
und darf **niemals** die Rundreise-Fähigkeit einer Datei beeinträchtigen (siehe
Abschnitt 12 — Rundreise-Anforderung).

---

## 0. Ist-Stand laut Code-Analyse (verifiziert vor Verifikationsauftrag)

Geprüft am aktuellen Stand des Repos (`E:\docs`, Remote `sanjoesan/salamanido`):
`src/formats/shared/editor/WordEditor.tsx`, `Toolbar.tsx`, `commands.ts`,
`pagination.ts`, `src/formats/shared/schema.ts`, `src/app/DocumentWorkspace.tsx`,
`playwright.config.ts`, `tests/e2e/*`. Die folgenden Aussagen sind am Code belegt, nicht
angenommen — sie bilden die verbindliche Ausgangslage für Dev und QA.

- **Es existiert keinerlei Such-Funktionalität.** In `commands.ts` gibt es keinen
  Such-/Find-Befehl (der einzige Treffer für „highlight" ist der Typ
  `ColorMarkName = 'textColor' | 'highlight'`, also der **Textmarker**, nicht die Suche).
  In `Toolbar.tsx` beziehen sich alle „highlight"-Vorkommen auf den
  Hervorhebungsfarben-Button (`applyMarkColor('highlight', …)`), **kein** Suchen-Button.
  In `WordEditor.tsx` ist **keine** `Mod-f`-Bindung und **kein** Such-Plugin registriert.
  Eine Suche über den gesamten `src`-Baum liefert außerhalb dieser Marken-/Farb-Treffer
  keinen Such-Code. Der Backlog-Status „fehlt" ist damit korrekt — das Feature ist
  vollständig **neu zu bauen**.
- **Custom-Keymap-Ort und Nebenwirkungsrisiko:** Editor-Tastenkürzel werden in
  `WordEditor.tsx` in einem eigenen `keymap({ … })`-Block registriert (bindet u. a.
  `Mod-z`, `Mod-y`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete`). Ein
  ausdrücklicher Kommentar dort warnt: **jede neue Keymap-Bindung muss geprüft werden,
  dass sie nicht versehentlich die bewusst nicht gebundenen Zwischenablage-Kürzel
  (`Mod-c/x/v`) verschluckt.** Direkt danach wird `keymap(baseKeymap)` registriert;
  `baseKeymap` bindet **kein** `Mod-f`. Eine neue `Mod-f`-Bindung ist damit kollisionsfrei
  möglich, muss aber `true` zurückgeben (Kommando „handled"), damit die **native
  Browser-Suche** unterdrückt wird (`preventDefault`).
- **Plugin-Registrierung:** `createPaginationPlugin()` (aus `pagination.ts`) ist in der
  `plugins`-Liste von `WordEditor.tsx` registriert. Das Such-Plugin (eigenes
  ProseMirror-`Plugin` mit `DecorationSet`) wird **analog dort** registriert.
- **⚠ Verifizierte Falle — „dirty"-Kopplung:** `WordEditor.tsx` ruft die
  `onChange`-Callback **nur** auf, wenn `tr.docChanged === true`
  (`if (tr.docChanged) { onChangeRef.current(...) }`). `DocumentWorkspace.tsx` verdrahtet
  diese Callback als `onChange={(content) => onChange({ ...document, content, dirty: true })}`.
  **Folge:** Jede Transaktion, die als Dokumentänderung zählt, setzt `dirty: true` und
  löst damit die „nicht exportierte Änderungen"-Anzeige, die Schließen-Rückfrage
  (`window.confirm('Nicht exportierte Änderungen gehen verloren. …')`) und die
  beforeunload-Warnung aus. Die Such-Hervorhebung **darf deshalb niemals eine
  Dokumentänderung erzeugen** — Decoration-Transaktionen müssen über
  Transaktions-Meta laufen und `tr.docChanged` **false** halten. Sonst würde bloßes
  Suchen (Feld öffnen, tippen) eine unveränderte, frisch geöffnete Datei fälschlich als
  „geändert" markieren. Dies ist die zentrale, bisher **nicht** spezifizierte technische
  Bedingung (siehe Abschnitt 6 und Testfall 6.4).
- **`highlight`-Mark ist persistenter, exportierter Inhalt:** `schema.ts` definiert den
  Mark `highlight` mit `attrs.color` und `toDOM → span[style="background-color: …"]`.
  Er wird beim Export nach DOCX/ODT geschrieben. Die Such-Hervorhebung **darf diesen Mark
  nicht verwenden** (siehe Abschnitt 6) — und sie muss zusätzlich optisch **von** einer
  vom Nutzer gesetzten Textmarker-Hintergrundfarbe unterscheidbar sein, weil beide sonst
  als „gelber Hintergrund" verwechselbar wären (siehe Abschnitt 4).
- **Dokumentmodell (Grundlage der Treffer-Grenzen):** `paragraph` und `heading` sind
  Textblöcke mit `content: 'inline*'`; `text` und `hard_break` liegen in der Gruppe
  `inline` (`hard_break` ist ein inline-Leaf). Ein Suchtreffer lebt damit **innerhalb
  eines Textblocks** und kann einen `hard_break` (Umschalt+Enter) mit umfassen, aber
  **nicht** eine Absatz-/Überschriftsgrenze überspannen (siehe Abschnitt 3).
- **UI-/Barrierefreiheits-Konventionen sind etabliert und einzuhalten (mit einem am Code
  belegten Vorbehalt):** Der **neueste** Toolbar-Button „Ausschneiden" verwendet ein
  **inline-SVG-Icon** (`ScissorsIcon`, `stroke="currentColor"`, `aria-hidden="true"`,
  `focusable="false"`) — **das ist das nachzuahmende Vorbild.** Die **älteren** Buttons
  tun das noch **nicht**: Fett/Kursiv/Unterstrichen/Durchgestrichen sind bloße Buchstaben
  (`label="F"/"K"/"U"/"S"`, `Toolbar.tsx` ~Z. 184–187), Textfarbe ist ein „A"
  (`<span aria-hidden>A</span>`), Hervorhebung ist ein **Emoji** `🖍`
  (`<span aria-hidden>🖍</span>`, ~Z. 212). Genau diese Buchstaben/Emoji-Glyphen sind die
  in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 gemeldete Rendering-Falle. Der neue
  Suchen-Button **muss dem `ScissorsIcon`-SVG-Muster folgen** und **darf nicht** die
  Buchstaben-/Emoji-Variante kopieren. Durchgängig etabliert und zu übernehmen sind:
  `aria-label` **und** `title` an jedem Button (die E2E-Suite selektiert über
  `getByTitle(...)`, z. B. `getByTitle('Fett')`) sowie für Status-/Fehlertexte
  `role="status"` (`PrivacyBanner`) bzw. `role="alert"` (`FormatPicker`, Cut-Fehler in
  `Toolbar.tsx`). Der neue Suchen-Button und die Trefferanzeige **folgen diesen
  Konventionen** (siehe Abschnitt 2/4), statt neue Muster zu erfinden.
- **Testinfrastruktur:** `playwright.config.ts` definiert die Projekte **Desktop Chrome**,
  **Mobile** (Pixel 7) und **Tablet** (iPad Mini) sowie Clipboard-Sonderprojekte
  (Desktop Safari/Firefox). Suche ist deshalb auch auf **Mobile/Tablet** zu verifizieren
  (siehe Abschnitt 11/13) — nicht nur auf dem Desktop.
- **Selection-Sync-Regression ist bereits abgesichert und relevant:**
  `tests/e2e/selection-regression.spec.ts` stellt den bekannten Bug nach (Alles auswählen
  → Toolbar-Aktion → Klick → Enter → Tippen). Der Test enthält einen bewusst gesetzten
  `waitForTimeout(50)` mit ausführlichem Kommentar: eine **native, tastaturgetriebene
  Cursorbewegung** (dort „End") wird von ProseMirror nur asynchron über das Browser-Event
  `selectionchange` nachgezogen; ein sofort folgender Tastendruck kann diesem Nachziehen
  vorauslaufen. **Für „Suchen" heißt das:** Das Zurücksetzen des Cursors beim Schließen
  der Suche muss **synchron** als echte ProseMirror-Selektion (`tr.setSelection(...)`)
  erfolgen, nicht als nachträglich einzusammelnde native Caret-Bewegung — sonst ist das
  „Schließen → sofort tippen"-Verhalten derselben Race unterworfen (siehe Abschnitt 5).
- **⚠ Verifizierte Falle — unvollständige Rekursion in verschachtelten Strukturen:**
  `schema.ts` definiert `list_item` **und** die Tabellenzellen aus
  `tableNodes({ cellContent: 'block+', … })` **sowie** `unsupported_block` (Platzhalter
  für nicht vollständig interpretierte Fremdinhalte wie Textboxen/Diagramme/Objekte)
  nicht mit einem einzelnen Absatz als Inhalt, sondern mit `block+` — mehrere Absätze,
  eine verschachtelte Liste, eine verschachtelte Tabelle oder ein Bild können also
  **innerhalb** einer Zelle oder eines Listenpunkts liegen. Das ist keine theoretische
  Möglichkeit: Die Schema-Kommentare selbst begründen dies mit realen Fixture-Dateien
  (`listLevel10.odt`, `imageWithinList.odt` unter `tests/fixtures/external/odt`). Eine
  Suchimplementierung, die nur die **direkten** Kinder einer Zelle/eines Listenpunkts als
  Textblock behandelt, würde Treffer in einer verschachtelten Unterliste, einem zweiten
  Absatz derselben Zelle oder einer Tabelle-in-Tabellenzelle stillschweigend überspringen
  (siehe Abschnitt 8). *(Im früheren Entwurf nicht behandelt — „alle Tabellenzellen"
  klang nach flacher Struktur, die das Schema so nicht hergibt.)*
- **Etablierte Theme-Konvention (hell/dunkel), aber Editor-Seite bewusst fix hell:** Die
  App unterstützt bereits durchgängig einen dunklen Modus über Tailwinds `dark:`-Variante
  (`color-scheme: light dark` und `@media (prefers-color-scheme: dark)` in
  `src/index.css`; `dark:`-Klassen u. a. in `App.tsx` (`dark:bg-neutral-950`),
  `Toolbar.tsx` (`dark:border-neutral-800`, `dark:hover:bg-neutral-800` usw.),
  `PrivacyBanner.tsx`, `PrivacyModal.tsx`, `FormatPicker.tsx`). Die editierbare
  Dokumentseite selbst bleibt davon **bewusst unberührt**: `.ProseMirror` erhält in
  `src/index.css` eine feste Textfarbe (`color: #111827`) **ohne** Dark-Mode-Override —
  die Seite verhält sich wie bedrucktes Papier, unabhängig vom OS-/Browser-Theme. **Für
  Suchen heißt das:** Die Suchleisten-Chrome (Button, Eingabefeld, Zähler, Optionen)
  folgt dem etablierten `dark:`-Muster wie der Rest der Toolbar; die
  **Trefferhervorhebungsfarbe** dagegen ist ausschließlich gegen den weiterhin hellen
  Seitenhintergrund zu kalibrieren, nicht gegen ein angenommenes dunkles Seiten-Theme
  (siehe Abschnitt 2 und 4). *(Im früheren Entwurf nicht erwähnt.)*

**Konsequenz für die Bewertung:** Es gibt weder Code noch Test noch UI-Weg für „Suchen".
Diese Datei legt fest, was gebaut werden muss und woran „fertig" gemessen wird — inkl.
dreier am Code belegter Fallen (dirty-Kopplung, `selectionchange`-Race, unvollständige
Rekursion in verschachtelten Zellen/Listenpunkten), die eine naive Umsetzung mit hoher
Wahrscheinlichkeit zunächst übersieht.

---

## 1. Zusammenfassung des Soll-Zustands

„Suchen" ist eine flüchtige (nicht dokumentverändernde), jederzeit ein-/ausblendbare
Funktion, die:
1. eine Sucheingabe entgegennimmt,
2. alle Fundstellen im gesamten Dokument (Haupttext, Kopf-/Fußzeile falls vorhanden,
   Tabellenzellen, Listenelemente) ermittelt,
3. **alle** Fundstellen visuell hervorhebt,
4. die **aktuelle** Fundstelle zusätzlich abweichend hervorhebt und in den sichtbaren
   Bereich scrollt,
5. Navigation zwischen Fundstellen erlaubt (nächste/vorherige, mit Umbruch am
   Dokumentende/-anfang),
6. die Trefferanzahl und Position anzeigt („3 von 12") — auch für Screenreader hörbar,
7. beim Schließen/Leeren der Eingabe **spurlos** verschwindet — keine Restmarkierung,
   keine Veränderung am Dokumentinhalt, kein Eintrag in der Undo-Historie, **kein**
   Umschalten des `dirty`-Status.

---

## 2. Aktivierung / Bedienelemente

| # | Element | Beschreibung |
|---|---|---|
| 1 | Toolbar-Button „Suchen" | Neuer Button in `Toolbar.tsx`, eigenes **inline-SVG-Icon** (Lupe, `stroke="currentColor"`, `aria-hidden`, `focusable="false"`) mit `aria-label="Suchen"` **und** `title="Suchen"` (E2E-Auffindbarkeit via `getByTitle`) — **kein** Unicode-/Emoji-Zeichen (Lehre aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20). Öffnet/fokussiert die Suchleiste. |
| 2 | Tastenkürzel Strg+F (Cmd+F auf macOS) | Öffnet die Suchleiste und **unterdrückt die native Browser-Suche** (`preventDefault`), **sobald ein Dokument geöffnet ist** — nicht erst, wenn der ProseMirror-Editor bereits Fokus hat (siehe Abschnitt 2, „Fokus-Klarstellung", und Grenzfall 11: Suche muss direkt nach dem Import funktionieren, bevor in den Editor geklickt wurde). |
| 3 | Sucheingabefeld | Einzeiliges Textfeld, erhält beim Öffnen automatisch den Fokus. Vorbelegt mit der aktuellen Textselektion, falls beim Öffnen ein **einzeiliger** Textbereich markiert war (Standardverhalten wie in Word/LibreOffice/Browser-Suche); eine mehrabsätzige Selektion wird **nicht** übernommen. |
| 4 | „Nächster Treffer" (Pfeil runter / Enter) | Springt zum nächsten Treffer nach der aktuellen Trefferposition, mit Umbruch zum ersten Treffer nach dem letzten. |
| 5 | „Vorheriger Treffer" (Pfeil hoch / Umschalt+Enter) | Springt zum vorherigen Treffer, mit Umbruch zum letzten Treffer vor dem ersten. |
| 6 | Trefferzähler-Anzeige | Textanzeige „x von y" bzw. „Keine Treffer" neben dem Eingabefeld, ausgezeichnet als Live-Region (`role="status"`, `aria-live="polite"`), damit Screenreader die Trefferzahl ansagen (siehe Abschnitt 4). |
| 7 | Option „Groß-/Kleinschreibung beachten" | Checkbox/Toggle, Standard: aus (case-insensitive). |
| 8 | Option „Nur ganzes Wort" | Checkbox/Toggle, Standard: aus. **Wortgrenzen-Semantik ist verbindlich definiert** (siehe Abschnitt 3.2, inkl. Umlaut-Falle) — nicht dem Zufall einer naiven `\b`-Regex überlassen. |
| 9 | Schließen-Button (X) / Escape-Taste | Schließt die Suchleiste, entfernt alle Hervorhebungen und gibt den Fokus in den Editor zurück (Cursor-Zielposition: siehe Abschnitt 5). |

**Fokus-Klarstellung (Auflösung eines Widerspruchs im früheren Entwurf):** Strg+F muss
auch dann **unsere** Suche öffnen (statt der Browser-Suche), wenn der Fokus gerade **nicht**
im ProseMirror-Editor liegt, aber ein Dokument geöffnet ist (z. B. unmittelbar nach dem
Import, Fokus noch auf einem Toolbar-Element). Die Bindung wird deshalb auf Ebene der
geöffneten Dokumentansicht (Editor-Container/Workspace) gesetzt, nicht nur an der
`.ProseMirror`-Instanz. Ausnahme: Liegt der Fokus in einem echten Formular-Eingabefeld
außerhalb des Editors (z. B. Farbwert-Input), gilt das native Verhalten dieses Feldes.

**Fokus-Routing bei fokussiertem Suchfeld:** Solange der Cursor im Sucheingabefeld steht,
gehen Tastatureingaben an das **Feld**, nicht an das Dokument — insbesondere lösen
`Mod-b/i/u` dort **keine** Dokumentformatierung aus, und getippte Zeichen erscheinen
**nicht** im Dokument. Belegt genutzt werden im Feld nur: Enter (nächster Treffer),
Umschalt+Enter (vorheriger), Pfeil hoch/runter (vorheriger/nächster), Escape (schließen).

**Theme-Konsistenz (am Code belegt):** Die App unterstützt bereits durchgängig einen
dunklen Modus über Tailwinds `dark:`-Variante (siehe Abschnitt 0). Der neue
Suchen-Button und die gesamte Suchleiste (Eingabefeld, Zähler, Optionen,
Navigations-/Schließen-Buttons) **müssen** dieses etablierte Muster übernehmen — eigene
`dark:`-Klassen, keine hartkodierten hellen Hintergründe/Textfarben — nicht als
optionales Polish, sondern als Konsistenzpflicht mit dem Rest der Toolbar.

**UI-Konsistenz der Toggle-Optionen (am Code belegt):** Bestehende Toolbar-Toggles
(`MarkButton`, die Ausrichtungs-Buttons, der „Tabelle"-Button in `Toolbar.tsx`) zeigen
ihren aktiven Zustand einheitlich über `aria-pressed` an einem `<button>`, nicht über ein
natives `<input type="checkbox">`. Die Optionen „Groß-/Kleinschreibung beachten" und
„Nur ganzes Wort" (Punkte 7/8) **folgen demselben Muster** (Toggle-Button mit
`aria-pressed`), damit Tastatur-/Screenreader-Bedienung konsistent zum Rest der Toolbar
bleibt, statt einen zweiten Bedienstil einzuführen.

**Grenzfall:** Ist die Suchleiste bereits offen und wird erneut Strg+F gedrückt →
Fokus springt ins Sucheingabefeld, der vorhandene Suchtext wird **selektiert** (damit
sofortiges Überschreiben möglich ist), Trefferliste und Optionen bleiben erhalten; das
Feld wird **nicht** geleert oder neu geöffnet.

**Testfälle**
1. Strg+F bei geöffnetem Dokument (Editor fokussiert) → Suchleiste öffnet sich, native
   Browser-Suche erscheint **nicht**.
2. Strg+F **direkt nach Import**, ohne vorher in den Editor geklickt zu haben → Suchleiste
   öffnet sich trotzdem (kein „Editor muss erst fokussiert sein").
3. Toolbar-Button „Suchen" (`getByTitle('Suchen')`) → öffnet dieselbe Suchleiste wie
   Strg+F.
4. Suchleiste offen, im Feld tippen `abc`, dann `Strg+B` drücken → Text im Feld bleibt
   `abc`, im Dokument entsteht **keine** Fettung.
5. Suchleiste offen, erneut Strg+F → Fokus im Feld, bisheriger Suchtext ist selektiert,
   Treffer bleiben erhalten.
6. Suchleiste bei aktivem dunklem Betriebssystem-/Browser-Theme öffnen → Chrome
   (Hintergrund, Text, Buttons, Optionen) folgt dem dunklen Theme wie die übrige
   Toolbar, keine hartkodierten hellen Flächen.
7. „Groß-/Kleinschreibung beachten" und „Nur ganzes Wort" per Tastatur fokussieren und
   aktivieren → Zustand wird über `aria-pressed` angezeigt, konsistent zu den übrigen
   Toolbar-Toggles.

---

## 3. Sucheingabe & Live-Verhalten

### 3.1 Grundverhalten

- Die Suche startet **live**, während getippt wird (kein zusätzlicher „Suchen"-Klick
  nötig) — Debounce ist erlaubt (z. B. 150–250 ms bei sehr großen Dokumenten), darf
  sich aber nicht wie eine spürbare Verzögerung anfühlen.
- Groß-/Kleinschreibung standardmäßig **ignoriert** (Toggle in Abschnitt 2, Punkt 7).
- **Diakritika-Genauigkeit (verbindliche Entscheidung):** Die Suche ist
  **diakritik-sensitiv** — „u" findet **nicht** „ü", „a" findet **nicht** „á", und „ss"
  findet **nicht** „ß". Es findet aber „ü" das „ü", „ä" das „ä", „ß" das „ß" usw.
  zuverlässig (keine Unicode-Normalisierungsfehler, keine versehentliche
  Zusammenfaltung). Groß-/Kleinschreibung ist die **einzige** über einen Toggle
  steuerbare Unschärfe; akzent-/diakritik-unabhängige Suche ist **außerhalb des Scopes**
  (Abschnitt 10). *(Klarstellung gegenüber dem früheren Entwurf, der „ß darf nicht als ss
  gefunden werden" unpräzise mit der Umlaut-Findbarkeit vermischt hat.)*
- Sucheingabe wird als **reiner Literaltext** behandelt, keine ungewollte
  Regex-Interpretation (Zeichen wie `.`, `*`, `(`, `)`, `[`, `]`, `+`, `?`, `\`, `$`, `^`,
  `|`, `{`, `}` müssen buchstäblich gesucht werden, nicht als Metazeichen). Wird intern
  eine `RegExp` verwendet, ist der Suchbegriff **vollständig zu escapen**. Echte
  Regex-Suche ist ein separates, hier explizit ausgeschlossenes Feature (Abschnitt 10).
- **Nicht überlappende Treffer (verbindliche Entscheidung):** Treffer werden von links
  nach rechts **nicht überlappend** gezählt. Beispiel: Suche „aa" in „aaaa" → **2**
  Treffer (Positionen 0–2 und 2–4), nicht 3. Suche „ana" in „banana" → **1** Treffer.
  Dieses Verhalten ist zu dokumentieren und zu testen, damit die Trefferzahl vorhersagbar
  ist. *(Im früheren Entwurf gar nicht behandelt.)*
- Leere Sucheingabe → keine Hervorhebung, keine Fehlermeldung, Zähler zeigt keinen Wert
  bzw. „–" (kein „0 von 0", das wie ein Fehler aussieht).
- Suchbegriff ohne Treffer → Zähler zeigt „Keine Treffer" (oder gleichwertig), Eingabefeld
  bekommt **keine** Fehlerfarbe, die wie ein blockierender Fehler aussieht.
- Suchbegriff, der nur aus Leerzeichen besteht → wird bewusst wie „kein sinnvoller
  Suchbegriff" behandelt und erzeugt **keine** Highlight-Flut über jedes Leerzeichen
  (dokumentierte Entscheidung, siehe Grenzfall 14).

### 3.2 Treffergrenzen (Formatierung, Absätze, Zeilenumbrüche, ganzes Wort)

- Suchbegriff, der über eine **Formatierungsgrenze** hinweg im selben Textblock steht
  (z. B. „Wort" teils fett, teils normal, aber ein zusammenhängender Textinhalt) → wird
  als **ein** zusammenhängender Treffer erkannt. Die Suche arbeitet auf dem **reinen
  Textinhalt** des Textblocks (`inline*`), nicht auf einzelnen Formatierungs-Textläufen.
- Suchbegriff über eine **Absatz-/Überschriftsgrenze** hinweg → **kein** Treffer
  (Textblockgrenze ist harte Grenze; belegt durch das Schema: `paragraph`/`heading` sind
  getrennte `inline*`-Blöcke). Muss dokumentiert und getestet sein.
- Suchbegriff über einen **manuellen Zeilenumbruch** (`hard_break`, Umschalt+Enter)
  **innerhalb desselben Textblocks** → **wird** als Treffer erkannt. Verbindliche
  Festlegung, wie der `hard_break` beim Matching zählt: er wird als **ein** Zeichen im
  durchsuchbaren Text repräsentiert (z. B. `\n`); ein Suchbegriff, der genau diesen
  Umbruch überspannt, muss dann ein passendes Zeichen an der Stelle enthalten. Für den
  Regelfall (Suchbegriff enthält keinen Umbruch) heißt das: ein Treffer endet spätestens
  am `hard_break`, sofern der Suchbegriff selbst keinen Umbruch enthält — das Verhalten
  ist zu dokumentieren, damit „findet über die Zeile hinweg" nicht als Zufall gilt.
- **„Nur ganzes Wort" — Wortgrenzen-Semantik (verbindlich, inkl. Umlaut-Falle):**
  - Ein Treffer zählt nur, wenn links **und** rechts der Fundstelle eine **Wortgrenze**
    liegt: Anfang/Ende des Textblocks, oder ein Zeichen, das **kein** Wortzeichen ist.
  - **⚠ JavaScript-`\b`/`\w`-Falle:** Die eingebauten `\b`/`\w` in JS-Regex sind
    standardmäßig **ASCII-basiert**. „Wortzeichen" umfasst dort **nicht** ä, ö, ü, Ä, Ö,
    Ü, ß, é, á, à usw. Eine naive Umsetzung mit `\b…\b` würde deshalb bei „Straße",
    „über", „Café" **falsche** Wortgrenzen erkennen (z. B. „Stra" in „Straße" fälschlich
    als ganzes Wort, oder „Café" nie als ganzes Wort). Die Implementierung **muss**
    Unicode-bewusste Wortgrenzen verwenden — z. B. die `u`-Flag mit
    Unicode-Property-Klassen (`\p{L}`, `\p{N}`) oder eine manuelle Prüfung der
    Nachbarzeichen gegen eine Unicode-Wortzeichen-Definition (Buchstaben, Ziffern,
    typischerweise `_`). Ziffern und Bindestriche innerhalb eines Wortes sind bewusst zu
    entscheiden und zu dokumentieren (Vorschlag: Ziffern = Wortzeichen, Bindestrich =
    Grenze). *(Im früheren Entwurf nur als Toggle gelistet, ohne jede Semantik — das ist
    eine echte, reklamierbare Lücke.)*
  - „Nur ganzes Wort" **kombiniert** korrekt mit dem Literal-Escaping (der Suchbegriff
    wird escaped **und** in eine Unicode-bewusste Wortgrenzen-Prüfung eingebettet; die
    Grenzen dürfen nicht durch das Escaping verfälscht werden).

**Testfälle**
1. Tippen im Suchfeld → Hervorhebung erscheint ohne Klick auf einen „Suchen"-Button.
2. Groß-/Kleinschreibung-Toggle an/aus → Trefferzahl ändert sich korrekt bei gemischter
   Schreibung im Dokument.
3. Suche nach „ß", „ä", „é" in einem Dokument mit diesen Zeichen → korrekt gefunden;
   Gegenprobe: Suche „ss" findet **nicht** „ß", Suche „u" findet **nicht** „ü".
4. Suche nach `a.b*c` (Literalzeichen mit Regex-Bedeutung) in einem Dokument, das genau
   diese Zeichenfolge enthält → gefunden; ein Dokument mit „aXbYYYc" (was ein echter
   Regex `a.b*c` fälschlich träfe) → **nicht** gefunden.
5. Suche „aa" in Text „aaaa" → genau **2** Treffer (nicht überlappend).
6. Leeres Suchfeld → keine Hervorhebung, keine Konsolen-Exception; nur Leerzeichen →
   ebenfalls keine Highlight-Flut.
7. Suchbegriff ohne Treffer → verständliche „Keine Treffer"-Anzeige, kein Absturz.
8. Suchbegriff, der einen fett/normal-Übergang überspannt → als **ein** Treffer erkannt.
9. Suchbegriff, der zwei Absätze überspannen würde → korrekt **kein** Treffer.
10. Suchbegriff über einen manuellen Zeilenumbruch (Umschalt+Enter) im selben Absatz →
    Verhalten entspricht der dokumentierten Festlegung (Abschnitt 3.2).
11. „Nur ganzes Wort" an: Suche „Straße" in „Straße" und in „Hauptstraße" → nur das
    freistehende „Straße" zählt, „Straße" innerhalb „Hauptstraße" **nicht**; Suche
    „über" in „über" vs. „überall" → nur das freistehende Wort. **Explizit die
    Umlaut-Wortgrenze prüfen** (deckt die `\b`-Falle ab).
12. „Nur ganzes Wort" mit einem Suchbegriff, der Regex-Metazeichen enthält (z. B. `c++`)
    → korrekt literal **und** wortgrenzen-genau.

---

## 4. Trefferhervorhebung (Darstellung & Barrierefreiheit)

- **Alle** Fundstellen im Dokument werden gleichzeitig sichtbar markiert (z. B. gelber
  Hintergrund), nicht nur die aktuell aktive.
- Die **aktuell aktive** Fundstelle wird zusätzlich visuell abgesetzt (z. B. kräftigere
  Farbe **plus** Rahmen/Ring), damit sie sich eindeutig von den übrigen Stellen
  unterscheidet. Die Unterscheidung darf **nicht nur** über den Farbton laufen (Rücksicht
  auf Farbfehlsichtigkeit) — zusätzlich z. B. Umrandung/Fettung.
- **Abgrenzung zur Nutzer-Textmarkierung:** Da der `highlight`-Mark selbst als gelblicher
  `background-color`-Span gerendert wird (siehe Abschnitt 0), muss die Such-Hervorhebung
  optisch **von** einer echten Textmarker-Hintergrundfarbe unterscheidbar sein
  (z. B. Ring/Outline statt reinem Flächen-Gelb), damit „gefundene Stelle" und „vom Nutzer
  gelb markierte Stelle" nicht verwechselt werden.
- **Seite bleibt hell, Chrome folgt dem Theme (am Code belegt, siehe Abschnitt 0):**
  `.ProseMirror` hat in `src/index.css` eine feste Textfarbe ohne Dark-Mode-Override —
  die editierbare „Papierseite" bleibt bewusst **immer hell**, unabhängig vom
  OS-/Browser-Theme, während nur das App-Chrome (Toolbar, Banner, Suchleiste) dem
  `dark:`-Modus folgt. Die Such-Hervorhebungsfarbe(n) sind deshalb **ausschließlich
  gegen einen hellen Seitenhintergrund** zu kalibrieren — eine Farbe, die nur auf
  dunklem Hintergrund ausreichend Kontrast hätte, wäre auf der Seite selbst
  unsichtbar/kontrastarm, auch wenn das Betriebssystem ein dunkles Theme meldet.
- Die Hervorhebung darf die zugrunde liegende Zeichenformatierung (fett, Farbe, Links,
  bestehende Textmarker-Hervorhebung) **nicht verdecken oder ersetzen** — beide müssen
  gleichzeitig sichtbar bleiben (Such-Overlay mit Transparenz/Mischmodus bzw.
  Outline statt deckendem Hintergrund).
- Aktive Fundstelle wird automatisch in den sichtbaren Ansichtsbereich gescrollt
  (auch über Seitengrenzen der Seitenansicht hinweg, siehe `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 8 zur Paginierung).
- **Barrierefreiheit:** Die Trefferanzeige „x von y" / „Keine Treffer" ist eine Live-Region
  (`role="status"`, `aria-live="polite"`, konsistent zum bestehenden `PrivacyBanner`),
  damit Screenreader die aktuelle Trefferlage ansagen. Der Sprung zum aktiven Treffer
  bewegt den sichtbaren Fokus/Cursor nachvollziehbar (nicht nur eine rein visuelle
  Markierung ohne Bezug zur Fokusreihenfolge).
- Trefferanzahl und aktueller Index aktualisieren sich sofort, wenn während offener Suche
  weiter im Dokument getippt/gelöscht wird (siehe Abschnitt 7).

**Initiale aktive Fundstelle (verbindlich):** Sobald es Treffer gibt, wird **automatisch
eine** als aktiv gesetzt und ihr Index angezeigt — und zwar der **erste Treffer an oder
nach der aktuellen Cursor-/Selektionsposition** im Dokument; existiert danach keiner, wird
zum ersten Treffer im Dokument umgebrochen. **Existiert beim Öffnen der Suche noch gar
keine Editor-Selektion** (z. B. direkt nach dem Import, bevor in den Editor geklickt wurde
— siehe Abschnitt 2 „Fokus-Klarstellung" und Grenzfall 17), gilt der **Dokumentanfang** als
Referenzposition, d. h. der **erste Treffer im Dokument** wird aktiv (kein Absturz durch
eine fehlende Selektion). Der Zähler zeigt den 1-basierten Index dieses aktiven Treffers
(„z. B. 3 von 12"), **nicht** konstant „1 von …". *(Im früheren Entwurf nicht festgelegt.)*

**Testfälle**
1. Mehrere Treffer im Dokument → alle gleichzeitig sichtbar markiert.
2. Aktiver Treffer optisch von den übrigen unterscheidbar — geprüft über DOM-Klasse **und**
   nicht allein über Farbe (Rahmen/Ring vorhanden).
3. Treffer auf Seite 2 eines mehrseitigen Dokuments aktivieren → Ansicht scrollt
   automatisch dorthin.
4. Treffer in einem Textabschnitt, der bereits die Nutzer-Hervorhebungsfarbe
   (`highlight`-Mark) trägt → beide Hervorhebungen bleiben gleichzeitig erkennbar und
   unterscheidbar; der `highlight`-Mark-Wert bleibt unverändert (Prüfung im
   Dokumentmodell: Mark-Attribute vor/nach Suche identisch).
5. Treffer in fett/kursiv/farbigem Text → Zeichenformatierung bleibt sichtbar.
6. Cursor mitten im Dokument, dann Suchbegriff eingeben → aktiver Treffer ist der erste
   **nach** der Cursorposition; Zähler zeigt dessen tatsächlichen Index (nicht „1 von …",
   sofern davor Treffer liegen).
7. Screenreader-/`aria-live`-Prüfung: Trefferanzeige ist als Live-Region ausgezeichnet
   und ändert ihren Textinhalt bei jeder neuen Suche/Navigation.
8. Trefferhervorhebung bei aktivem dunklem Betriebssystem-/Browser-Theme geprüft →
   Hervorhebungsfarbe bleibt gegen die (weiterhin helle) Dokumentseite gut lesbar;
   die Seite selbst wechselt **nicht** in ein dunkles Erscheinungsbild.

---

## 5. Navigation zwischen Treffern & Schließen

- „Nächster"/„Vorheriger" bewegen die aktive Markierung entlang der **Dokumentreihenfolge**
  (nicht der visuellen Bildschirmreihenfolge; mehrspaltiges Layout ist nicht unterstützt,
  siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18, daher hier nicht relevant).
- Enter im Suchfeld = „Nächster Treffer". Umschalt+Enter = „Vorheriger Treffer".
- Erreichen des letzten Treffers + „Nächster" → springt zurück zum ersten Treffer
  (Umbruch/Wrap-Around), keine Sackgasse.
- Erreichen des ersten Treffers + „Vorheriger" → springt zum letzten Treffer.
- **Schließen der Suchleiste (Escape/X):** Cursor wird an der Position des zuletzt aktiven
  Treffers als **echte ProseMirror-Selektion** platziert (`tr.setSelection(...)`,
  **synchron** im selben Transaktions-/Dispatch-Schritt, in dem die Suche geschlossen
  wird), sodass direkt weitergetippt werden kann. Gab es keinen aktiven Treffer (leere
  Suche/keine Treffer), bleibt der Cursor an seiner vorherigen Position.
- **Dies ist der kritische Berührungspunkt mit dem bekannten Selection-Sync-Bug**
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/20; `tests/e2e/selection-regression.spec.ts`).
  Weil das Setzen der Selektion **synchron als PM-Transaktion** erfolgt (nicht als native
  Caret-Bewegung, die nur asynchron über `selectionchange` nachgezogen wird — siehe die
  am Code belegte Race in Abschnitt 0), darf „Schließen → sofort tippen" **niemals** den
  gesamten Dokumentinhalt ersetzen/löschen. Ein dedizierter Regressionstest ist Pflicht
  (Testfall 5 unten).

**Testfälle**
1. Mehrere Treffer → „Nächster" bewegt sich in Dokumentreihenfolge vorwärts.
2. Am letzten Treffer „Nächster" drücken → Umbruch zum ersten Treffer.
3. Am ersten Treffer „Vorheriger" drücken → Umbruch zum letzten Treffer.
4. Suche schließen → Cursor steht sichtbar UND als ProseMirror-Selektion an der Stelle des
   letzten aktiven Treffers.
5. **Regressionstest:** Suche schließen und **sofort** tippen → neuer Text erscheint exakt
   an dieser Stelle, **kein** Ersetzen/Löschen des gesamten Dokumentinhalts (analog zu
   `tests/e2e/selection-regression.spec.ts`; ohne künstlichen Timing-Workaround, weil die
   Selektion synchron gesetzt wird).
6. Suche schließen bei „Keine Treffer" → Cursor bleibt an der vorherigen Position, kein
   Sprung, kein Fehler.

---

## 6. Technische Anforderung: Hervorhebung als flüchtige Decoration

**Verbindliche Architekturentscheidung, kein Implementierungsdetail zur freien Wahl:**
Die Such-Hervorhebung **muss** über ProseMirror-`Decoration`/`DecorationSet` in einem
eigenen Plugin realisiert werden (analog registriert wie `createPaginationPlugin()` in
`WordEditor.tsx`), **nicht** über den bestehenden `highlight`-Mark aus `schema.ts`.

Begründung/Risiko bei falscher Umsetzung:
- Der `highlight`-Mark ist persistenter Dokumentinhalt, der beim Export nach DOCX
  (`w:highlight`/Schattierung) bzw. ODT (`fo:background-color`) geschrieben wird. Würde die
  Suche diesen Mark missbrauchen, würde jede Suche das Dokument tatsächlich verändern
  (Undo-Historie, Export-Inhalt, Rundreise) — nicht akzeptabel für eine reine Lesefunktion.
- Decorations sind rein darstellungsseitig, erzeugen **keinen** Undo-Schritt, sind
  **nicht** Teil von `doc.toJSON()`/des exportierten Inhalts und verschwinden beim
  Schließen der Suche vollständig, ohne Spuren im Dokumentmodell zu hinterlassen.

**⚠ Verbindlich (am Code belegt, siehe Abschnitt 0): Decoration-Updates dürfen den
`dirty`-Status nicht verändern.** Die Transaktionen, die das `DecorationSet` setzen/leeren,
müssen über Transaktions-Meta laufen und **`tr.docChanged === false`** halten. Da
`WordEditor.tsx` `onChange` nur bei `tr.docChanged` aufruft und `DocumentWorkspace.tsx`
daraufhin `dirty: true` setzt, würde ein doc-änderndes Such-Update eine unveränderte,
frisch geöffnete Datei fälschlich als „nicht exportiert" markieren und die
Schließen-/beforeunload-Warnung auslösen. Das ist ausdrücklich zu verhindern und zu testen.

**Testfälle**
1. Suche mit Treffern durchführen, danach Export (DOCX und ODT) **ohne** die Suche zu
   schließen → exportierte Datei enthält **keine** Such-Hervorhebung (weder als
   `highlight`-Mark-Attribut noch als sonstiges Element); Re-Import zeigt unverändertes
   Dokument.
2. Suche mit Treffern durchführen, danach Strg+Z (Undo) → **kein** Undo-Schritt wird durch
   die Suche selbst verbraucht (Undo wirkt auf die letzte tatsächliche Inhaltsänderung vor
   dem Öffnen der Suche).
3. Dokumentmodell (`doc.toJSON()`) vor und nach einer kompletten Such-Sitzung (öffnen,
   tippen, navigieren, schließen) ist **exakt identisch** (Struktur-Vergleich), sofern
   nicht ersetzt wurde (Ersetzen: Abschnitt 9).
4. **dirty-Test:** Datei importieren (Zustand „nicht dirty", kein „nicht exportiert"-Hinweis).
   Suche öffnen, tippen, navigieren, schließen → der „nicht exportierte Änderungen"-Hinweis
   erscheint **nicht**, und ein anschließendes „Schließen" bzw. Seiten-Reload löst
   **keine** „Änderungen gehen verloren"-Rückfrage aus (belegt, dass `dirty` unangetastet
   blieb).

---

## 7. Verhalten bei gleichzeitiger Dokumentbearbeitung & Dokumentwechsel

- Die Suchleiste kann geöffnet bleiben, während im Dokument weiter getippt/gelöscht/
  formatiert wird (kein Modal, das die Bearbeitung blockiert).
- Ändert sich der Dokumentinhalt während offener Suche (Text eingefügt/gelöscht, wodurch
  sich Trefferpositionen verschieben oder Treffer wegfallen/neu entstehen), wird die
  Trefferliste **automatisch neu berechnet** (kein manuelles erneutes Suchen nötig),
  Trefferzähler aktualisiert sich live.
- Löschen der aktuell aktiven Fundstelle durch Editieren → aktive Markierung springt
  sinnvoll zum nächsten verbleibenden Treffer (oder zeigt „Keine Treffer", falls keiner
  mehr existiert), ohne Absturz oder veraltete Referenz auf eine nicht mehr existierende
  Position.
- **Dokumentwechsel bei offener Suche (neu, wichtig):** Wird ein **neues Dokument
  importiert** oder „Neues Dokument" ausgelöst, während die Suchleiste offen ist, muss die
  Suche vollständig **zurückgesetzt** werden: alte Decorations verwerfen, Positionen nicht
  in den alten Dokumentbaum weiterreichen (sonst ungültige Positionen → Crash), Suchfeld
  gegen das **neue** Dokument neu auswerten (oder leeren). Eine stehen gebliebene
  Trefferliste aus dem alten Dokument ist ein Fehler. *(Im früheren Entwurf nur „Suche
  startet bei Reload leer" — der gefährliche Live-Fall Dokumentwechsel-bei-offener-Suche
  fehlte.)*

**Testfälle**
1. Suche mit 3 Treffern offen halten, einen Treffer durch Löschen des Wortes entfernen →
   Zähler aktualisiert sich auf 2, keine Exception.
2. Suche offen, neuen Text eintippen, der einen zusätzlichen Treffer erzeugt → Trefferzahl
   erhöht sich automatisch, neuer Treffer wird mitmarkiert.
3. Aktiven Treffer per Backspace löschen, während Suche offen ist → aktive Markierung
   wechselt kontrolliert zum nächsten Treffer, kein Crash, kein hängender Zustand.
4. Suche mit Treffern offen halten, dann **eine andere Datei importieren** → keine
   Exception durch veraltete Positionen; Treffer/Decorations beziehen sich auf das neue
   Dokument (oder Feld ist leer), keine „Geister-Highlights" aus dem alten Dokument.
5. Suche offen, „Neues Dokument" → analog Punkt 4, leeres Dokument → „Keine Treffer".

---

## 8. Suche über Dokumentstruktur hinweg (Tabellen, Listen, Kopf-/Fußzeile)

- Suche durchsucht den **gesamten** Dokumentinhalt: normale Absätze, Überschriften,
  Listenelemente (Aufzählung/Nummerierung), **alle** Tabellenzellen, sowie — sobald
  Kopf-/Fußzeilen editierbar sind (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9) — deren
  Inhalt.
- Reihenfolge folgt der Dokumentstruktur: Kopfzeile (falls vorhanden) → Haupttext in
  Lesereihenfolge (inkl. Tabellenzellen zeilenweise von links nach rechts) → Fußzeile
  (falls vorhanden). Diese Reihenfolge gilt konsistent für „Nächster"/„Vorheriger".
- Ein Treffer, der ausschließlich in der Kopf-/Fußzeile liegt, muss beim Navigieren
  erreichbar sein, auch wenn der Cursor aktuell im Haupttext steht.
- **Rekursion in verschachtelte Strukturen (am Schema belegt, siehe Abschnitt 0, kein
  Sonderfall):** `list_item` und Tabellenzellen (`cellContent: 'block+'`) sowie
  `unsupported_block` erlauben laut `schema.ts` **mehrere** Absätze, verschachtelte
  Listen, verschachtelte Tabellen oder Bilder **innerhalb** einer einzelnen Zelle oder
  eines einzelnen Listenpunkts — belegt durch reale Fixture-Dateien
  (`listLevel10.odt`, `imageWithinList.odt`). Die Suche muss deshalb den **gesamten
  Dokumentbaum rekursiv** durchlaufen (jeder Textblock auf jeder Verschachtelungstiefe),
  nicht nur die direkten Kinder von Zelle/Listenpunkt — sonst werden Treffer in einer
  verschachtelten Unterliste, einem zweiten Absatz derselben Zelle oder einer
  Tabelle-in-Tabellenzelle stillschweigend übersprungen.
- **Scope-Hinweis (am Code belegt):** `WordEditor.tsx` lädt aktuell nur den `body` in die
  `EditorView`; Kopf-/Fußzeile existieren als Datenfelder, aber (noch) nicht als
  gleichzeitig aktive Editor-Instanz (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9). Bis
  Kopf-/Fußzeile editierbar sind, bezieht sich die Suche auf den Haupttext (inkl. Tabellen/
  Listen); die Kopf-/Fußzeilen-Anforderung ist als **zukünftige** Erweiterung markiert,
  nicht als sofortiger Blocker — muss aber beim Bau der Kopf-/Fußzeile mitgezogen werden.

**Testfälle**
1. Suchbegriff kommt im Haupttext **und** in einer Tabellenzelle vor → beide gefunden,
   Navigation funktioniert zwischen beiden.
2. Suchbegriff in einem Listenelement → gefunden, Listenstruktur bleibt unangetastet.
3. Tabelle mit vielen Zellen, Suchbegriff in mehreren nicht benachbarten Zellen →
   Navigationsreihenfolge folgt nachvollziehbar der Zellreihenfolge (zeilenweise).
4. (Sobald Kopf-/Fußzeile editierbar ist) Suchbegriff nur in der Fußzeile, Cursor im
   Haupttext, „Nächster Treffer" → Sprung in die Fußzeile funktioniert.
5. Tabellenzelle mit **zwei** Absätzen, Suchbegriff nur im zweiten Absatz der Zelle →
   gefunden (deckt `cellContent: 'block+'` ab, statt nur den ersten Absatz je Zelle zu
   prüfen).
6. Listenpunkt, der eine **verschachtelte Unterliste** enthält, Suchbegriff nur in der
   Unterliste → gefunden, Navigationsreihenfolge bleibt nachvollziehbar
   (Dokument-Vorreihenfolge, nicht nur oberste Listenebene).
7. Verschachtelte Tabelle (Tabelle in Tabellenzelle) → Suchbegriff in der inneren Tabelle
   wird gefunden (analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 8).

---

## 9. Erweiterung: Suchen & Ersetzen (wünschenswert, `suchen-ersetzen`, Priorität 2)

Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 „idealerweise" zusätzlich zur reinen Suche
gewünscht. Es handelt sich um eine **dokumentverändernde** Erweiterung der Suchleiste
(zweites Eingabefeld „Ersetzen durch") und wird hier als eigener, klar abgegrenzter Satz
von Anforderungen geführt, damit die Kernfunktion „Suchen" (Abschnitt 1–8) unabhängig
davon abgenommen werden kann.

- Zweites Eingabefeld „Ersetzen durch", nur sichtbar/aktiv, wenn die Suchleiste im
  „Ersetzen"-Modus ist (Umschalter „Suchen" ↔ „Suchen & Ersetzen").
- „Ersetzen" (einzeln): ersetzt **nur** die aktuell aktive Fundstelle, springt danach
  automatisch zum nächsten verbleibenden Treffer.
- „Alle ersetzen": ersetzt **alle** Fundstellen im Dokument in einem Arbeitsschritt.
- **Positionsverschiebung bei „Alle ersetzen" (verbindlich):** Ist der Ersetzungstext
  **länger oder kürzer** als der Suchbegriff, verschieben sich die Positionen aller
  folgenden Treffer. Die Umsetzung muss dies korrekt behandeln (z. B. Ersetzungen von
  **hinten nach vorne** anwenden oder Positionen nach jeder Ersetzung neu berechnen), damit
  **kein** Treffer übersprungen oder doppelt verarbeitet wird. *(Im früheren Entwurf nicht
  explizit — nur die Endlosschleifen-Falle war abgedeckt.)*
- Jede Ersetzung übernimmt die **Zeichenformatierung inkl. `highlight`-Mark der ersetzten
  Textstelle** auf den neuen Text (Ersetzung ist keine Neuerzeugung von unformatiertem Text
  mitten in formatiertem Kontext) — die am `highlight`-Mark hängende Nutzer-Markierung
  bleibt erhalten. Grenzfall: Ersetzungstext, der über die ursprüngliche
  Formatierungsgrenze hinausragt (länger als das Original), übernimmt die Formatierung der
  Position, an der die Ersetzung **beginnt**.
- „Ersetzen"/„Alle ersetzen" erzeugt **genau einen** zusammenhängenden Undo-Schritt — ein
  einzelnes Strg+Z macht die komplette Ersetzungsaktion rückgängig.
- „Ersetzen durch" mit leerem Feld → entspricht Löschen der Fundstelle (gültiger, bewusst
  unterstützter Grenzfall, keine Fehlermeldung).
- Ersetzen ist **doc-verändernd** und darf/soll `dirty: true` setzen (im Gegensatz zur
  reinen Suche, Abschnitt 6) — das ist hier korrektes Verhalten.

**Testfälle**
1. Einzelnes „Ersetzen" auf aktivem Treffer → nur dieser Treffer wird ersetzt, übrige
   bleiben (Zähler reduziert sich um 1).
2. „Alle ersetzen" bei 5 Treffern → alle 5 ersetzt, Zähler „Keine Treffer" für den alten
   Begriff.
3. Ersetzung in fett formatiertem Text → Ersatztext ist ebenfalls fett; Ersetzung in
   Textmarker-markiertem Text → Ersatztext trägt den `highlight`-Mark weiterhin.
4. Strg+Z nach „Alle ersetzen" → gesamter Vorgang in einem Schritt rückgängig, alle 5
   Originaltexte wieder vorhanden.
5. „Ersetzen durch" leer + „Alle ersetzen" → alle Fundstellen entfernt, umgebender Text
   unangetastet.
6. **Längenänderung:** Suchbegriff „x" (1 Zeichen) durch „xxxxx" (5 Zeichen) an mehreren
   Stellen „Alle ersetzen" → alle Vorkommen korrekt ersetzt, **keiner** übersprungen oder
   doppelt (deckt die Positionsverschiebung ab).
7. Ersetzungstext enthält den Suchbegriff selbst („Katze" → „Katzenbaby") → **keine**
   Endlosschleife, jeder ursprüngliche Treffer genau einmal ersetzt.
8. Rundreise DOCX: Ersetzen → Export → Re-Import → Inhalt korrekt.
9. Rundreise ODT: Ersetzen → Export → Re-Import → Inhalt korrekt.

---

## 10. Explizit außerhalb des Scopes dieser Spezifikation

Um Missverständnisse bei der Abnahme zu vermeiden, wird festgehalten, was **nicht** Teil
von „Suchen" (dieser Datei) ist:

- **`suchen-ersetzen-erweitert` (Regex/Formatierungssuche, Priorität 4):** Suche nach
  regulären Ausdrücken oder nach Formatierungsmerkmalen ist **nicht** Teil dieser Datei.
  Der Suchbegriff wird gemäß Abschnitt 3 immer literal behandelt.
- **Akzent-/diakritik-unabhängige Suche** (z. B. „u" soll „ü" finden): explizit
  ausgeschlossen; die Suche ist diakritik-sensitiv (Abschnitt 3.1).
- **`gehe-zu` (Gehe zu Seite/Abschnitt/Zeile, Priorität 3):** direktes Springen zu einer
  Seitenzahl/Zeilennummer ohne Textsuche ist ein eigenes Feature.
- **Suche über mehrere gleichzeitig geöffnete Dokumente** — es existiert kein
  Mehrfenster-Feature; irrelevant.
- **Persistenz der letzten Sucheingabe** über Dokumentwechsel/Reload — nicht gefordert
  (Suche startet bei jedem neuen Dokument/Reload leer, siehe auch Abschnitt 7).

---

## 11. Grenzfälle (Pflicht-Regressionsliste)

1. Leere Sucheingabe — kein Fehler, keine Hervorhebung (Abschnitt 3.1).
2. Nur-Leerzeichen-Suchbegriff — wie leere Eingabe behandelt, keine Highlight-Flut
   (Abschnitt 3.1).
3. Kein Treffer — verständliche Anzeige, kein Absturz (Abschnitt 3.1).
4. Regex-Metazeichen im Suchbegriff — rein literal behandelt (Abschnitt 3.1).
5. Nicht überlappende Treffer („aa" in „aaaa" = 2) — dokumentiertes Verhalten
   (Abschnitt 3.1).
6. Suchbegriff über Formatierungsgrenze im selben Textblock — ein Treffer (Abschnitt 3.2).
7. Suchbegriff über Absatzgrenze — **kein** Treffer (Abschnitt 3.2).
8. Suchbegriff über `hard_break` im selben Textblock — gemäß Festlegung (Abschnitt 3.2).
9. „Nur ganzes Wort" mit Umlauten/ß (Straße/Hauptstraße, über/überall) — korrekte
   Unicode-Wortgrenzen, **nicht** die ASCII-`\b`-Falle (Abschnitt 3.2).
10. **Selection-Sync-Regressionstest beim Schließen der Suche** — Pflichttest, siehe
    Abschnitt 5, Testfall 5. Dauerhaft in der E2E-Suite, analog
    `tests/e2e/selection-regression.spec.ts`.
11. **dirty bleibt unangetastet** durch reine Suche (Abschnitt 6, Testfall 4).
12. Dokumentänderung während offener Suche (Treffer verschwindet/entsteht neu) —
    Abschnitt 7.
13. **Dokumentwechsel/Import bei offener Suche** — keine Geister-Highlights, kein Crash
    durch veraltete Positionen (Abschnitt 7, Testfälle 4/5).
14. Suche über Tabellenzellen- und Listengrenzen hinweg — Abschnitt 8.
15. Export/Re-Import während offener bzw. gerade geschlossener Suche — Hervorhebung landet
    **niemals** im exportierten Dokument (Abschnitt 6, Testfall 1).
16. Sehr großes Dokument (reale komplexe Fixture) mit sehr häufigem Suchbegriff
    (z. B. „der/die/das", hunderte Treffer) — UI bleibt reaktionsfähig, kein spürbares
    Einfrieren beim Tippen (Performance, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8,
    „< 3 Sekunden bei realistischer Testdatei").
17. Suche unmittelbar nach Import, bevor in den Editor geklickt wurde — muss funktionieren
    (Abschnitt 2, Fokus-Klarstellung; Strg+F darf nicht die Browser-Suche öffnen).
18. Suche unmittelbar nach „Neues Dokument" (leerer Editor) — kein Treffer, keine
    Exception bei leerem `doc`.
19. Mehrfaches schnelles Öffnen/Schließen (Strg+F, Escape, Strg+F, …) — kein doppelt
    registriertes Plugin, keine wachsende Zahl an Decorations/Memory-Leak.
20. **IME-Komposition im Suchfeld** (z. B. ostasiatische Eingabemethoden): Live-Suche wird
    nicht mitten in einer noch nicht bestätigten Komposition ausgelöst (auf
    `compositionend` warten), keine korrupte Eingabe, kein Crash.
21. **Mobile/Tablet** (Playwright-Projekte „Mobile"/Pixel 7, „Tablet"/iPad Mini): Suchleiste
    ist erreichbar und bedienbar, Eingabefeld erhält Fokus, Trefferanzeige sichtbar,
    Bildschirmtastatur verdeckt die Leiste nicht dauerhaft.
22. **Verschachtelte Dokumentstrukturen** — Zelle mit mehreren Absätzen, Listenpunkt mit
    Unterliste, Tabelle-in-Tabellenzelle: Suche muss rekursiv den gesamten Dokumentbaum
    abdecken, nicht nur die oberste Ebene (Abschnitt 0, Abschnitt 8, Testfälle 5–7).
23. **Dunkles Theme** — Suchleisten-Chrome folgt dem etablierten `dark:`-Muster der
    App; die Trefferhervorhebungsfarbe bleibt gegen die weiterhin helle Editor-Seite
    lesbar, die Seite selbst wechselt nicht ins Dunkle (Abschnitt 0, Abschnitt 2/4).

---

## 12. Rundreise-Anforderung (DOCX **und** ODT)

Wie in `FEATURE-SPEC-DOCX-ODT.md` gefordert, gilt die Rundreise-Bedingung: **Datei A
hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich A.**

Für „Suchen" bedeutet das konkret:

1. **Reine Suche verändert den Dokumentinhalt nie.** Eine DOCX- oder ODT-Datei wird
   importiert, eine beliebige Suchsitzung durchgeführt (öffnen, tippen, Treffer
   durchnavigieren, Groß-/Kleinschreibung-Toggle, „Nur ganzes Wort", schließen) — danach
   **ohne** weitere Änderung exportiert. Das Ergebnis muss inhaltlich (Textinhalt **und**
   alle Formatierungsattribute) der Originaldatei entsprechen (technische Unterschiede in
   Formatierungs-IDs/XML-Layout sind zulässig, der beim Re-Import gelesene Inhalt nicht).
2. Dieser Rundreisetest wird **je einmal für DOCX und einmal für ODT** durchgeführt, mit
   realistischen Testdateien, die mindestens Zeichenformatierung, eine Liste und eine
   Tabelle enthalten (die Suche muss durch alle diese Strukturen hindurch bedient worden
   sein, bevor exportiert wird).
3. Wird zusätzlich „Suchen & Ersetzen" (Abschnitt 9) genutzt, gilt die allgemeine
   Rundreise-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3/19: der geänderte
   Inhalt (ersetzter Text mit übernommener Formatierung) muss nach Export und Re-Import
   erhalten bleiben — sowohl nach DOCX als auch nach ODT, unabhängig vom Ursprungsformat.
4. Cross-Format-Rundreise mit Suche/Ersetzen: DOCX importieren → suchen/ersetzen → als ODT
   exportieren → wieder importieren → als DOCX zurück-exportieren. Auch nach diesem
   doppelten Formatwechsel darf **kein** durch Ersetzen eingefügter oder verbliebener Text
   verloren gehen (Formatierungsverluste bei Cross-Format sind laut Abschnitt 19
   akzeptabel und zu dokumentieren, Textverlust nicht).

**Testfälle**
1. DOCX-Testdatei mit Formatierung/Liste/Tabelle importieren → Suchsitzung (ohne Ersetzen)
   → Export → Re-Import → Diff gegen Originalinhalt zeigt **keine** Abweichung.
2. Dasselbe für ODT.
3. DOCX importieren → Suchen & Ersetzen an mehreren Stellen inkl. Tabellenzelle → Export
   DOCX → Re-Import → ersetzter Inhalt korrekt, nicht ersetzte Teile unverändert.
4. Dasselbe für ODT.
5. ODT importieren → Suchen & Ersetzen → Export **als DOCX** (Cross-Format) → Re-Import →
   Inhalt korrekt.
6. DOCX importieren → Suchen & Ersetzen → Export **als ODT** (Cross-Format) → Re-Import →
   Inhalt korrekt.

---

## 13. Verifikationsauftrag (Backlog-Status „nicht vertrauenswürdig")

Da der Ausgangsstatus „fehlt" ist und das Feature vollständig neu gebaut wird, gilt für die
Abnahme dieselbe Regel wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22: **Jeder Testfall
dieser Datei muss über echte Browser-Interaktion (Playwright, sichtbarer Klick/
Tastatureingabe) nachgewiesen werden — nicht nur durch isolierte Command-/Unit-Tests.** Ein
Unit-Test, der eine Suchfunktion direkt mit konstruierten ProseMirror-Dokumenten aufruft,
beweist nicht, dass Strg+F, der Toolbar-Button und das sichtbare Hervorheben im echten
Editor funktionieren.

| Ebene | Beispiel-Datei/Ort | Deckt ab |
|---|---|---|
| Unit-Test (Plugin-Logik) | `src/formats/shared/editor/__tests__/search.test.ts` (neu) | Treffer-Berechnung (nicht überlappend), Decoration-Erzeugung, Wrap-Around, Groß-/Kleinschreibung, **Unicode-Wortgrenzen inkl. Umlaute/ß**, Literal-Escaping, Ersetzungs-Positionslogik |
| E2E-Test (echte Bedienung) | `tests/e2e/search.spec.ts` (neu) | Strg+F (auch direkt nach Import), Toolbar-Button (`getByTitle('Suchen')`), Tippen im Feld, Live-Highlight, Navigation, aktive-Treffer-Darstellung, Schließen + **Selection-Sync-Regression**, **dirty-bleibt-false**, Dokumentwechsel-bei-offener-Suche, Ersetzen-Flow |
| E2E Mobile/Tablet | `tests/e2e/search.spec.ts` auf Projekten „Mobile"/„Tablet" | Erreichbarkeit/Bedienbarkeit der Suchleiste auf Pixel 7 / iPad Mini (Abschnitt 11, Grenzfall 21) |
| Rundreise-Test | Erweiterung `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` bzw. Reader/Writer-Unit-Tests | Abschnitt 12 |
| Reale Fixture-Datei | vorhandene komplexe Test-ODT/DOCX (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18, `tests/e2e/fixtures/`) | Suche über realistische Inhalte, Performance mit vielen Treffern (Grenzfall 16) |

Erst wenn alle Testfälle aus Abschnitt 3–12 auf diesen Ebenen grün sind, darf der
Backlog-Status von `suchen` auf „vorhanden" geändert werden.

---

## 14. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Suchen" (Lupe, inline-SVG, `title`/`aria-label`) | fehlt komplett | neu bauen, siehe Abschnitt 2 |
| 2 | Tastenkürzel Strg+F/Cmd+F | fehlt | neu bauen, überschreibt Browser-Suche sobald Dokument offen (Abschnitt 2) |
| 3 | Sucheingabefeld + Live-Trefferhervorhebung (Decoration) | fehlt | Abschnitt 3–4, 6 |
| 4 | Trefferzähler „x von y" (Live-Region) | fehlt | Abschnitt 2, 4 |
| 5 | Nächster/Vorheriger Treffer (Pfeile/Enter, Wrap-Around) | fehlt | Abschnitt 5 |
| 6 | Option Groß-/Kleinschreibung | fehlt | Abschnitt 3.1 |
| 7 | Option Nur ganzes Wort (Unicode-Wortgrenzen) | fehlt | Abschnitt 3.2 |
| 8 | Schließen-Button/Escape + synchrone Cursor-Rückgabe | fehlt | Abschnitt 2, 5 |
| 9 | Ersetzen-Feld + Ersetzen/Alle ersetzen | fehlt | Abschnitt 9 (Erweiterung) |

---

## 15. Zusammenfassung der Pflicht-Abnahmekriterien (Definition of Done)

Das Feature „Suchen" gilt erst dann als **vorhanden**, wenn:

1. Strg+F **und** ein Toolbar-Button öffnen zuverlässig dieselbe Suchleiste — auch direkt
   nach Import, ohne dass zuvor in den Editor geklickt wurde; die native Browser-Suche wird
   dabei unterdrückt.
2. Live-Suche mit korrektem Literal-Matching (kein ungewollter Regex), nicht überlappender
   Trefferzählung, Groß-/Kleinschreibung-Toggle, **Unicode-korrektem „Nur ganzes Wort"
   (inkl. Umlaute/ß)** und diakritik-sensitivem Verhalten funktioniert.
3. Alle Treffer werden hervorgehoben, der aktive Treffer ist zusätzlich **nicht nur per
   Farbe** unterscheidbar, die initiale aktive Fundstelle folgt der Cursorposition,
   Navigation (nächster/vorheriger, Wrap-Around) und Trefferzähler (als Live-Region)
   funktionieren.
4. Die Hervorhebung ist nachweislich eine flüchtige Decoration (Abschnitt 6, Testfälle 1–3)
   — kein Einfluss auf Undo-Historie, Export **oder `dirty`-Status** (Testfall 6.4).
5. Der Selection-Sync-Regressionstest beim Schließen der Suche (Abschnitt 5, Testfall 5)
   ist grün und dauerhaft Teil der Suite; das Cursor-Setzen erfolgt synchron als
   PM-Selektion.
6. Dokumentwechsel/Import bei offener Suche verursacht keine Geister-Highlights und keinen
   Crash (Abschnitt 7, Testfälle 4/5).
7. Die Rundreise-Anforderung aus Abschnitt 12 (DOCX **und** ODT, reine Suche) ist mit
   realistischen Testdateien nachgewiesen.
8. Alle Grenzfälle aus Abschnitt 11 sind einzeln als Testfall vorhanden und grün —
   inklusive Mobile/Tablet, IME, **rekursiver Suche in verschachtelten Zellen/
   Listenpunkten/Tabellen** und **dunklem Theme** (Grenzfälle 22/23).
9. (Optional, aber für Backlog-Status „vorhanden" von `suchen-ersetzen` erforderlich)
   Suchen & Ersetzen inkl. Positionsverschiebungs- und Rundreise-Testfällen aus Abschnitt 9
   ist umgesetzt.

Bis alle Punkte erfüllt und durch echte Browser-Tests (Abschnitt 13) belegt sind, bleibt
der Status **nicht vertrauenswürdig** bzw. „fehlt"/„teilweise" — unabhängig davon, ob
einzelne Teilfunktionen bereits im Code sichtbar sind.

---

## 16. Umsetzungsstand (2026-07-11)

**Umgesetzt und verifiziert:** Unit 781/781 (16 neue in `search.test.ts` — Literal-
Escaping, Diakritik-Sensitivität, Nicht-Überlappung, Formatierungs-/Block-/hard_break-
Grenzen, Unicode-Wortgrenzen inkl. der `\b`-Umlaut-Falle, Zellen/Listen, initialer
Aktiv-Index); E2E `suchen.spec.ts` 10 Testfälle grün auf Desktop Chrome, Mobile und
Tablet — darunter die vier kritischen: Strg+F ohne vorherigen Editor-Fokus, Fokus-
Routing (Strg+B im Feld formatiert nicht), Schließen-und-sofort-Tippen (Selection-Sync,
Selektion wird SYNCHRON in der Schließen-Transaktion gesetzt) und die volle
dirty-/Undo-/Export-Neutralität einer kompletten Such-Sitzung.

**Architektur exakt nach §6:** eigenes Decoration-Plugin (`search.ts`), ALLE
Zustandswechsel als Meta-only-Transaktionen (`docChanged === false` → kein dirty, kein
Undo-Schritt, kein Export-Inhalt); bei Dokumentänderungen rechnet das Plugin die
Trefferliste im `apply`-Hook gegen den NEUEN Baum neu (nie alte Positionen), der aktive
Index folgt der bisherigen Position über das Transaktions-Mapping (§7). Dokumentwechsel
remountet den Editor samt Plugin — keine Geister-Highlights (§7 Testfälle 4/5).

**Festgelegte Details:** hard_break zählt als `\n` (Begriff mit `\n` überspannt ihn);
Ziffern = Wortzeichen, Bindestrich = Grenze; „x von y"-Zähler 1-basiert mit aktivem
Treffer = erster an/nach der Cursorposition; leeres Feld zeigt „–", nur-Leerzeichen
sucht nicht; Ring+Transparenz-Optik gegen die immer helle Seite kalibriert, aktiver
Treffer zusätzlich per kräftigem Ring (nicht nur Farbton) abgesetzt.

**Bewusst offen (Scope):** Kopf-/Fußzeilen-Inhalte sind mangels Editier-/Anzeige-UI im
Editor derzeit nicht durchsuchbar (§8 — folgt mit `kopfzeile-bearbeiten`); Ersetzen ist
der separate Slug `suchen-ersetzen` (§9).
