# Anforderungsdatei: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)“

Status: **Laut Feature-Backlog „vorhanden“ — gilt als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 2.4 „Formatvorlagen (Styles)“, Slug `absatzformat-dropdown`, Priorität 1)
bestätigt werden darf.

Kurzbeschreibung (Backlog): „Weist dem Absatz eine Formatvorlage aus einer Liste zu.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Absatzformat-Dropdown“,
was `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4 („Absatzformatierung“, Zeile „Formatvorlagen:
Standard, Überschrift 1–6 (mind.), Auswahl über Dropdown“) und Abschnitt 17
(Menü-/Toolbar-Übersicht, Zeile 1 „Absatzformat-Dropdown | vorhanden | siehe Abschnitt 4“)
nur pauschal fordern. Sie gilt für **beide** unterstützten Formate (DOCX und ODT) über
den gemeinsamen ProseMirror-Editor (`src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/schema.ts`, Node `heading`), inklusive Rundreise (Datei hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich dem Original) und inklusive
Cross-Format-Konvertierung.

**Ausdrücklich nicht Teil dieser Datei** (eigene Backlog-Einträge, andere Slugs):
- `formatvorlagen-katalog` (Schnellformate-Galerie) — fehlt komplett, nicht Gegenstand hier.
- `formatvorlage-erstellen` / `zeichenformatvorlage` — fehlen komplett, nicht Gegenstand hier.
- Zeichenformatierung „Fett“ selbst — dafür existiert `fett-req.md`; hier wird nur die
  **Wechselwirkung** zwischen Absatzformat und Fett behandelt (Abschnitt 2.9), nicht die
  Fett-Funktion an sich.
- Ausrichtung, Zeilenabstand, Einzüge als eigenständige Funktionen — eigene Anforderungen
  laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4; hier wird nur die **Wechselwirkung** mit
  dem Absatzformat-Wechsel behandelt (Abschnitt 2.6/3.7), weil genau dort ein konkreter
  Befund vorliegt.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Anders als bei mehreren anderen „vorhanden“-Einträgen (z. B. `ausschneiden-req.md`)
existiert hier tatsächlich ein echtes, benanntes, einzeln bedienbares UI-Element — das
Dropdown ist kein bloßes implizites Browser-Verhalten. Die Verifikation muss sich daher
weniger auf „existiert die Funktion überhaupt“ konzentrieren als auf **subtile, im Code
nachweisbare Verhaltens-Inkonsistenzen**, die beim oberflächlichen Test mit einem
einzelnen Absatz nicht auffallen:

| # | Ort | Inhalt | Befund |
|---|---|---|---|
| 1 | `src/formats/shared/editor/Toolbar.tsx:116-131` | `<select aria-label="Absatzformat">` mit Optionen „Standard“ + „Überschrift 1“–„Überschrift 6“, `onChange` ruft `setHeading(...)` | Echtes, natives `<select>`-Element — funktioniert grundsätzlich per Maus, Tastatur und (native Browser-Picker) auf Mobile/Tablet |
| 2 | `src/formats/shared/editor/Toolbar.tsx:87-95` | `currentHeadingLevel()` liest Node-Typ an `$from` (Tiefe absteigend), gibt `'normal'` zurück, sobald `paragraph` gefunden wird, sonst Level der `heading` | Zustand wird an **jeder** Selektionsänderung neu berechnet — reagiert korrekt auf Cursorbewegung |
| 3 | `src/formats/shared/editor/commands.ts:40-55` (`setHeading`) | `if (!$from.sameParent($to)) return false` | **Funktioniert nur, wenn Anfang und Ende der Selektion im selben Absatz/derselben Überschrift liegen.** Eine Selektion über mehrere Absätze hinweg (z. B. drei markierte Zeilen) macht das Dropdown zu einem stillen No-Op — anders als `setAlign` (`commands.ts:13-27`), das explizit `state.doc.nodesBetween(from, to, …)` über **alle** betroffenen Blöcke iteriert. Diese Asymmetrie zwischen Ausrichtung (funktioniert über mehrere Absätze) und Absatzformat (funktioniert nur pro Absatz) ist nirgends dokumentiert und widerspricht vermutlich der Nutzererwartung. |
| 4 | `src/formats/shared/editor/commands.ts:42-43` | `const attrs = level === null ? undefined : { level, align: 'left' }` | **Jeder** Formatwechsel setzt `align` hart auf `'left'` zurück (beim Wechsel zu einer Überschrift) bzw. auf den Node-Default `'left'` (beim Wechsel zurück zu Standard, da `attrs: undefined`). Eine zuvor zentrierte/rechtsbündige/Blocksatz-Ausrichtung geht dadurch bei **jedem** Absatzformat-Wechsel verloren, unabhängig davon, ob das gewollt ist. Word/LibreOffice behandeln direkte Ausrichtung üblicherweise als vom Formatvorlagenwechsel unabhängige Direktformatierung. |
| 5 | `src/formats/shared/schema.ts:98-104` (`list_item`) vs. `tableNodes({ cellContent: 'block+' })` (`schema.ts:106`) | `list_item.content = 'paragraph block*'` (erstes Kind **zwingend** vom Node-Typ `paragraph`, nicht nur der Gruppe `block`), Tabellenzellen dagegen `block+` (jede Position erlaubt jeden Block-Typ) | Über `prosemirror-transform`s `setBlockType` → `canChangeType` → `$pos.parent.canReplaceWith(index, index+1, type)` folgt: Der **erste** Absatz innerhalb eines Listenpunkts kann **nicht** in eine Überschrift umgewandelt werden (stiller No-Op, keine Fehlermeldung), ein zweiter/weiterer Absatz **innerhalb desselben Listenpunkts** dagegen schon. Innerhalb einer Tabellenzelle funktioniert die Umwandlung dagegen an **jeder** Position. Dieses uneinheitliche, tief in der Content-Modell-Definition verborgene Verhalten ist nirgends dokumentiert oder getestet. |
| 6 | `src/formats/odt/reader.ts:245-246` vs. `:252-256` | Body-Inhalt (`readOfficeTextChildren`, Zeile 248) verwendet **ausschließlich** `contentStyles`, geparst aus `office:automatic-styles` in `content.xml` (Zeile 245-246). Kopf-/Fußzeile (Zeile 261-267) verwenden zusätzlich `office:automatic-styles` aus `styles.xml`. **Nirgends** im Reader wird `office:styles` (der gemeinsame/benannte Stil-Container in `styles.xml`, in dem LibreOffice/OpenOffice die eingebauten Formatvorlagen wie „Heading 1“ typischerweise ablegt) ausgewertet | Ausrichtung (und jede weitere Eigenschaft) einer Überschrift, die ihre Formatierung über eine **benannte, gemeinsame** Formatvorlage statt über eine automatische Instanz-Formatvorlage bezieht, wird beim Import **still verloren** (Fallback auf `align: 'left'`) — kein Absturz, aber unbemerkter Informationsverlust bei genau der Art von Datei, die reale LibreOffice-Nutzer:innen typischerweise erzeugen. |
| 7 | `src/formats/docx/reader.ts:48-75` (`parseStylesXml`/`headingLevelForStyle`) | Erkennung über `w:outlineLvl` in `styles.xml` **oder** Regex `^Heading\s?([1-6])$` auf die Style-ID | Robuster als der ODT-Pfad (liest tatsächlich `styles.xml`), aber ungetestet gegen reale Word-Dateien mit lokalisierten Formatvorlagen-Namen (z. B. „Überschrift 1“ als sichtbarer Name bei gleichzeitig anderer interner Style-ID) oder Formatvorlagen, die per `w:basedOn` von „Heading N“ erben, ohne selbst ein `w:outlineLvl` zu deklarieren. |
| 8 | `src/formats/docx/styleDefs.ts:9-30`, `src/formats/odt/styleRegistry.ts:77-93` | Export schreibt für jede Überschriftenebene eine feste Formatvorlage mit fest hinterlegter Schriftgröße **und** `<w:b/>` bzw. `fo:font-weight="bold"` auf Stil-Ebene | Deckt sich mit dem bereits in `fett-req.md` Abschnitt 2.5 dokumentierten Befund: Eine Überschrift ist immer fett, unabhängig vom `strong`-Mark auf dem Text selbst — hier zusätzlich relevant, weil ein Wechsel „Überschrift → Standard“ diese Stil-gebundene Fettung korrekt entfernt (weil der ganze Node-Typ wechselt, nicht nur ein Mark), während das reine Fett-Mark-Toggle das nicht könnte. |
| 9 | `tests/e2e/docx.spec.ts:99`, `tests/e2e/odt.spec.ts:80` | Rundreise-Tests „preserves heading, text, and bold formatting“ | Diese Tests laden eine **bereits fertige** Testdatei mit vorhandenen Überschriften hoch und prüfen nur, dass unverändertes Exportieren den Zustand erhält. **Kein einziger Test im gesamten Repository bedient das Dropdown selbst** (Suche nach `Absatzformat`, `getByLabel`, `selectOption` in `tests/` liefert null Treffer) — es gibt also keinen Nachweis, dass ein:e Nutzer:in tatsächlich per Dropdown-Klick eine Überschrift **erzeugen** oder **ändern** kann; nur, dass bereits vorhandene Überschriften beim reinen Durchreichen überleben. |

**Konsequenz für die Bewertung:** Der Backlog-Status „vorhanden“ ist im Sinne der im
Backlog selbst definierten Methodik nur zur Hälfte gedeckt: Es gibt einen echten,
klickbaren UI-Weg (anders als bei `ausschneiden`), aber **keinen einzigen Test, der
diesen UI-Weg tatsächlich über einen echten Klick/Auswahl im Dropdown bedient**, und der
Code selbst enthält mindestens drei nicht dokumentierte, potenziell überraschende
Verhaltensweisen (Befunde 3, 4, 5), die vor einer Bestätigung des Status einzeln geklärt
werden müssen.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Dropdown „Absatzformat“ (`Toolbar.tsx:116-131`), Optionen „Standard“, „Überschrift 1“–„Überschrift 6“ | Vorhanden, natives `<select>`, `aria-label="Absatzformat"` | Muss per Maus, per Tastatur (Tab-Fokus + Pfeiltasten/Buchstaben-Sprung, Standardverhalten von `<select>`) und auf Touch-Geräten über den nativen Options-Picker bedienbar sein; ausgewählter Wert muss dem tatsächlichen Format an der Cursor-Position/Selektion entsprechen (siehe Befund 2). |
| 2 | Anzeige des aktuellen Formats im Dropdown | `currentHeadingLevel()` (`Toolbar.tsx:87-95`), reagiert auf jede Selektionsänderung | Muss sich **sofort** bei jeder Cursorbewegung, Klick oder Tastatur-Navigation aktualisieren, ohne zusätzliche Nutzeraktion; bei gemischter Mehrfachselektion (siehe Grenzfall 3.2) muss ein definiertes, nicht-widersprüchliches Verhalten festgelegt sein. |
| 3 | Tastenkombination zum direkten Setzen einer Ebene (z. B. Strg+Alt+1…6 für „Überschrift 1“–„6“, Strg+Alt+0 für „Standard“, wie in Word/LibreOffice üblich) | **Fehlt komplett** — keine `keymap`-Bindung in `WordEditor.tsx` | Kein Blocker für „vorhanden“, aber als bewusst fehlende Komfortfunktion zu dokumentieren, nicht stillschweigend zu übergehen (analog zur Dokumentationspflicht aus `ausschneiden-req.md` Abschnitt 1, Zeile 5). |
| 4 | Kontextmenü (Rechtsklick) → Absatzformat | Nicht vorhanden | Kein Soll-Element für diese Anforderung; als fehlend dokumentieren. |
| 5 | Formatvorlagen-Katalog/Galerie (Schnellformate mit Vorschau) | Fehlt komplett (eigener Backlog-Slug `formatvorlagen-katalog`, Priorität 3) | Nicht Gegenstand dieser Datei — nur zur Abgrenzung erwähnt. |
| 6 | Mobile/Touch: Dropdown-Bedienung über native Options-Auswahl (Android/iOS) | Ungeprüft | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) verifizieren, dass das `<select>` erreichbar und bedienbar bleibt (Toolbar nicht abgeschnitten/verdeckt). |
| 7 | Deaktivierter Zustand bei nicht anwendbarer Selektion (z. B. reine Bild- oder Tabellenzellen-Mehrfachselektion, bei der laut Befund 3 kein Format gesetzt werden kann) | Aktuell **nicht** deaktiviert — Dropdown bleibt klickbar, Auswahl wirkt aber wirkungslos (stiller No-Op) | Verstößt gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 „Kein stiller Fehlschlag“ — zu klären, ob das Dropdown in diesen Fällen deaktiviert werden soll oder eine sichtbare Rückmeldung („nicht auf diese Selektion anwendbar“) nötig ist. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundfunktion (Cursor ohne Selektion)
- Cursor steht in einem beliebigen Absatz/einer Überschrift, keine Selektion aktiv →
  Auswahl einer Option im Dropdown wandelt **genau diesen einen Block** in den gewählten
  Typ um (`paragraph` ↔ `heading` mit gewähltem `level`).
- Wechsel direkt von einer Ebene zur nächsten (z. B. „Überschrift 6“ → „Überschrift 1“ in
  einem einzigen Auswahlschritt) muss ohne Zwischenschritt über „Standard“ funktionieren.
- Der Cursor bleibt nach dem Wechsel im selben Block aktiv, der Editor bleibt sofort
  weiter bedienbar (kein Fokusverlust, kein Reset — konsistent mit der generellen
  Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3).

### 2.2 Anwendung auf eine Selektion innerhalb eines einzelnen Blocks
- Ist die gesamte Selektion innerhalb **eines** Absatzes/einer Überschrift (`$from` und
  `$to` haben denselben Elternknoten), wird dieser eine Block umgewandelt — unabhängig
  davon, wie viel Text markiert ist.

### 2.3 Anwendung auf eine Selektion über mehrere Blöcke hinweg
- **Aktuell (Befund 3):** Eine Selektion, die mehr als einen Absatz/eine Überschrift
  umfasst, führt zu einem stillen No-Op — `setHeading` gibt `false` zurück, ohne
  Dispatch, ohne sichtbare Fehlermeldung. Das Dropdown selbst zeigt kurzzeitig den neu
  gewählten Wert (Browser-natives Select-Verhalten), springt aber beim nächsten Render
  auf den alten, unveränderten Wert von `currentHeadingLevel()` zurück, da dieser Wert
  React-kontrolliert ist (`value={currentHeadingLevel()}`).
- **Zu klären/verifizieren:** Ist dieses Verhalten so gewollt (Analogie: nur ein Block
  pro Aktion, wie bei manchen Editoren), oder wird — wie bei der Ausrichtung
  (`setAlign`, die alle Blöcke der Selektion erfasst) — erwartet, dass **alle** von der
  Selektion erfassten Absätze/Überschriften auf einmal umgewandelt werden? Diese
  Asymmetrie zwischen den beiden strukturell sehr ähnlichen Absatzformatierungs-Aktionen
  ist der zentrale offene Punkt dieser Anforderung und muss vor Abnahme entschieden und
  dokumentiert werden.

### 2.4 Wechsel zurück zu „Standard“
- Auswahl von „Standard“ auf einer Überschrift wandelt den Node-Typ zurück zu `paragraph`
  — es genügt **nicht**, nur visuell wie ein Standard-Absatz auszusehen; der tatsächliche
  Node-Typ muss wechseln (prüfbar über `node.type.name` im Editor-State bzw. über das
  exportierte Element `<w:p>` ohne `w:pStyle` bzw. `<text:p>` statt `<text:h>`).

### 2.5 Erhalt der Ausrichtung beim Formatwechsel
- **Aktuell (Befund 4):** Jeder Wechsel des Absatzformats (in beide Richtungen) setzt
  `align` auf `'left'` zurück, unabhängig vom vorherigen Wert.
- **Zu klären/verifizieren:** Muss eine zuvor gesetzte Ausrichtung (zentriert/rechts/
  Blocksatz) den Formatwechsel überleben (so wie es Direktformatierung in Word/
  LibreOffice üblicherweise tut), oder ist der Reset auf „links“ bewusstes,
  dokumentiertes Verhalten? Bis zur Klärung gilt dieses Verhalten als **unverifizierter,
  wahrscheinlicher Fehler**, nicht als bestätigtes Feature.

### 2.6 Verhalten in Listen
- **Aktuell (Befund 5):** Der **erste** Absatz eines Listenpunkts kann wegen der
  Content-Regel `list_item.content = 'paragraph block*'` nicht in eine Überschrift
  umgewandelt werden (stiller No-Op). Ein zweiter oder weiterer Absatz **innerhalb
  desselben Listenpunkts** (z. B. nach einem manuellen Zeilenumbruch/zusätzlichen Absatz
  im selben `<li>`) kann dagegen sehr wohl umgewandelt werden.
- Zu klären: Ist eine Überschrift innerhalb eines Listenpunkts überhaupt ein sinnvoller
  Anwendungsfall (in Word/LibreOffice normalerweise nicht vorgesehen — dort würde man
  zuerst die Liste aufheben)? Falls nicht sinnvoll, muss das Dropdown das **konsistent**
  für **jede** Position innerhalb eines Listenpunkts verweigern (aktuell tut es das nur
  für die erste Position) — die aktuelle Uneinheitlichkeit ist in jedem Fall als Fehler
  zu werten, unabhängig vom Ausgang der grundsätzlichen Klärung.

### 2.7 Verhalten in Tabellenzellen
- Innerhalb einer Tabellenzelle (`table_cell`-Content `block+`) funktioniert die
  Umwandlung an **jeder** Position (jeder Absatz kann zu jeder Überschriftenebene und
  zurück werden), da das Schema hier keine Einschränkung wie bei Listen kennt.
- Eine `CellSelection` über **mehrere** Tabellenzellen hinweg führt zu einem stillen
  No-Op (unterschiedliche Elternknoten je Zelle, `sameParent` ist `false`) — konsistent
  mit dem generellen Verhalten aus 2.3, muss aber ebenso wie dort dokumentiert und mit
  einem Testfall abgesichert werden.

### 2.8 Zeilenumbruch/Enter-Verhalten innerhalb einer Überschrift
- Drücken von „Enter“ am **Ende** einer Überschrift erzeugt einen **neuen Standard-
  Absatz** (nicht automatisch eine weitere Überschrift derselben Ebene) — das ist das in
  Word/LibreOffice übliche Verhalten und ergibt sich aus der Reihenfolge der Node-Typen
  in `schema.ts` (`paragraph` vor `heading`, siehe `defaultBlockAt`-Logik der
  zugrundeliegenden `prosemirror-commands`-Bibliothek). Dieses Verhalten ist bisher
  **ungetestet** und muss explizit mit einem Testfall nachgewiesen werden.
- Drücken von „Enter“ **innerhalb** (nicht am Ende) einer Überschrift teilt den Text in
  zwei Überschriften **derselben Ebene** auf — ebenfalls ungetestet, muss verifiziert
  werden.
- Drücken von „Enter“ innerhalb eines Listenpunkts wird stattdessen von der eigenen
  `Enter`-Bindung (`WordEditor.tsx:75`, `splitListItem`) behandelt, bevor der
  Standard-Absatz-Fallback greift — Wechselwirkung mit einer Überschrift **innerhalb**
  eines Listenpunkts (siehe 2.6) ist gesondert zu prüfen.

### 2.9 Interaktion mit Zeichenformatierung („Fett“)
- Wie in `fett-req.md` Abschnitt 2.5 beschrieben, erscheinen Überschriften bereits über
  CSS (`.ProseMirror h1/h2/h3 { font-weight: 600 }`) fett, unabhängig vom `strong`-Mark.
  Ein Wechsel „Überschrift → Standard“ entfernt diese CSS-Fettung korrekt (weil der
  Node-Typ wechselt), lässt ein zuvor auf dem Text gesetztes `strong`-Mark aber
  unangetastet — nach dem Rückwechsel zu „Standard“ kann Text dadurch unerwartet **echt**
  fett erscheinen (über das Mark), obwohl er es vorher nur optisch über die
  Überschriften-CSS war. Dieser Übergang ist bisher nicht getestet und muss geprüft
  werden.
- Export-seitig (`styleDefs.ts`/`styleRegistry.ts`) deklariert die Formatvorlage
  „Heading N“ selbst bereits Fettdruck; ein Wechsel zurück zu „Standard“ entfernt diese
  Stil-Referenz vollständig korrekt, da der gesamte Absatz nun die Formatvorlage
  „Normal“/„Standard“ referenziert statt „Heading N“.

### 2.10 Undo/Redo
- Ein Formatwechsel per Dropdown erzeugt einen einzelnen, eigenständigen Undo-Schritt.
- Undo stellt exakt den vorherigen Node-Typ (**und**, sofern Abschnitt 2.5 zugunsten von
  „erhalten“ entschieden wird, die vorherige Ausrichtung) wieder her.
- Redo stellt den Formatwechsel erneut her.
- Mehrere aufeinanderfolgende Formatwechsel (z. B. Standard → Überschrift 1 → Überschrift
  3 → Standard) müssen einzeln, in korrekter Reihenfolge rückgängig machbar sein.

---

## 3. Grenzfälle

1. **Leerer Absatz/leeres Dokument:** Formatwechsel auf einen leeren Absatz (nur Cursor,
   kein Text) → funktioniert ohne Absturz, Cursor bleibt aktiv.
2. **Selektion über mehrere Absätze hinweg:** siehe 2.3 — stiller No-Op, Dropdown springt
   optisch auf alten Wert zurück. Muss mit einem Testfall nachgewiesen und die
   Design-Entscheidung (siehe 2.3) hier nachgetragen werden.
3. **Selektion, die einen Absatz und eine Überschrift gemeinsam umfasst** (unterschiedliche
   Node-Typen, aber ebenfalls unterschiedliche Elternknoten) → gleicher stiller No-Op wie
   Grenzfall 2, zusätzlich zu verifizieren, dass die Zustandsanzeige des Dropdowns in
   diesem Moment kein widersprüchliches/zufälliges Ergebnis zeigt.
4. **Cursor im ersten Absatz eines Listenpunkts:** Formatwechsel zu einer Überschrift wird
   von ProseMirror strukturell verweigert (`canReplaceWith` liefert `false`, siehe Befund
   5) — stiller No-Op, keine Fehlermeldung, Dropdown springt zurück.
5. **Cursor in einem zweiten/weiteren Absatz desselben Listenpunkts:** Formatwechsel
   funktioniert (siehe Befund 5) — im direkten Vergleich mit Grenzfall 4 inkonsistent;
   beide Fälle müssen mit Testfällen belegt und die Inkonsistenz im Rahmen der Abnahme
   aufgelöst oder als bewusst so akzeptiert dokumentiert werden.
6. **Cursor in einer Tabellenzelle:** Formatwechsel funktioniert an jeder Position
   innerhalb der Zelle (siehe 2.7).
7. **`CellSelection` über mehrere Tabellenzellen:** stiller No-Op (siehe 2.7).
8. **Ausrichtung vor dem Formatwechsel:** Absatz zunächst zentrieren, danach „Überschrift
   1“ wählen → Ausrichtung springt aktuell auf „links“ (Befund 4) — Pflicht-Testfall, bis
   zur Klärung von 2.5 als potenzieller Fehler zu behandeln.
9. **Sofortiger Rückwechsel:** Überschrift 1 setzen, unmittelbar danach „Standard“ wählen
   → Ausrichtung, die vor dem allerersten Wechsel bestand, ist nach zwei Wechseln
   nachweislich verloren (kumulativer Effekt von Befund 4), nicht nur nach einem.
10. **Direkter Ebenenwechsel ohne Zwischenschritt** (Überschrift 2 → Überschrift 5 in
    einem Klick): funktioniert in einem Schritt, kein Zwischenzustand „Standard“
    sichtbar/nötig.
11. **Enter am Ende einer Überschrift:** siehe 2.8 — neuer Block wird zu „Standard“, nicht
    zu einer weiteren Überschrift.
12. **Enter mitten in einer Überschrift:** siehe 2.8 — beide Hälften bleiben Überschriften
    derselben Ebene.
13. **Fett-Mark auf Überschriftentext, danach Rückwechsel zu Standard:** siehe 2.9 — Text
    kann unerwartet echt fett erscheinen.
14. **Regressionsrisiko Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/20):
    Text eingeben → Format auf „Überschrift 1“ setzen → per Klick neu positionieren →
    Enter → weiter tippen → Dokument darf nicht korrumpiert werden. Der
    Absatzformat-Wechsel ist wie „Fett“ eine Toolbar-Transaktion auf eine (ggf. leere)
    Selektion und daher ein plausibler weiterer Auslöser für eine Variante dieses Bugs —
    bisher nicht mit diesem konkreten Schritt getestet.
15. **Reale Fremddatei (ODT) mit Überschriften über eine gemeinsame/benannte
    Formatvorlage** (`office:styles`, nicht `office:automatic-styles`): Level und Text
    bleiben erhalten (da `text:outline-level` direkt am Element gelesen wird), die
    Ausrichtung der Überschrift geht jedoch nach aktuellem Stand still verloren (Befund
    6) — Pflicht-Testfall mit einer realen, außerhalb dieses Editors erzeugten
    ODT-Datei.
16. **Reale Fremddatei (DOCX) mit Überschriften-Formatvorlage ohne eigenes
    `w:outlineLvl`, nur per `w:basedOn` von „Heading N“ geerbt:** zu prüfen, ob
    `headingLevelForStyle` (`docx/reader.ts:68-75`) diesen Fall erkennt oder der Absatz
    fälschlich als „Standard“ importiert wird.
17. **Sehr viele aufeinanderfolgende Formatwechsel in kurzer Zeit** (z. B. per Pfeiltasten
    im geöffneten Dropdown schnell durchgeschaltet): kein doppeltes/verzögertes Dispatch,
    keine veraltete Zustandsanzeige.
18. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert, muss ein Absatzformat-Wechsel bei aktiver Aufzeichnung
    als nachverfolgbare Änderung markiert werden. Für den aktuellen
    Verifikationsauftrag **nicht** im Scope, hier nur als künftige Abhängigkeit vermerkt.

---

## 4. Rundreise-Anforderung (DOCX und ODT)

Für **jeden** der folgenden Fälle gilt: Datei mit Überschriften/Absätzen hochladen (bzw.
per Dropdown im Editor erzeugen) → **unverändert** exportieren → erneut importieren →
Absatzformat (Node-Typ **und** Ebene) ist inhaltlich exakt erhalten.

### 4.1 DOCX
1. Einfache DOCX-Datei mit einer „Heading 1“- und einer „Heading 2“-Formatvorlage
   importieren → im Editor als `heading`-Node mit korrektem `level` sichtbar → unverändert
   als DOCX exportieren → erneut importieren → Level und Text bleiben identisch.
2. Im Editor neuen Absatz eingeben, per Dropdown auf „Überschrift 3“ setzen, als DOCX
   exportieren → mit einem unabhängigen Parser (z. B. python-docx oder direktes Parsen
   von `word/document.xml`) verifizieren, dass exakt `<w:pStyle w:val="Heading3"/>` im
   `w:pPr` des betroffenen Absatzes steht.
3. Per Dropdown von „Überschrift 3“ zurück auf „Standard“ wechseln, exportieren →
   Export enthält für diesen Absatz **kein** `<w:pStyle>` mehr (bzw. `Normal`).
4. Ebenenwechsel „Überschrift 2“ → „Überschrift 5“ in einem Schritt, exportieren →
   Export referenziert ausschließlich `Heading5`, keine Reste von `Heading2`.
5. Absatz zentrieren, danach per Dropdown zu „Überschrift 1“ wechseln, exportieren,
   reimportieren → prüfen, ob `<w:jc w:val="center"/>` erhalten bleibt oder auf `left`
   zurückfällt (siehe Grenzfall 8/Befund 4) — Ergebnis ist hier nach Klärung
   nachzutragen, unabhängig vom Ausgang muss der tatsächliche Zustand durch einen Test
   belegt sein.
6. Cross-Format: ODT mit Überschriften importieren → als DOCX exportieren → Level und
   Text bleiben erhalten.
7. Reale, komplexe Fremddatei (z. B. aus einem Open-Source-Testkorpus, nicht mit diesem
   Editor erzeugt) mit mehrstufigen Überschriften importieren → mindestens Text und
   erkennbare Gliederungsebene bleiben erhalten (siehe Grenzfall 16 zur Vererbung über
   `w:basedOn`).

### 4.2 ODT
1. Einfache ODT-Datei mit `<text:h text:outline-level="1">` und `text:outline-level="2"`
   importieren → im Editor als `heading`-Node mit korrektem `level` sichtbar →
   unverändert als ODT exportieren → erneut importieren → Level und Text bleiben
   identisch.
2. Im Editor neuen Absatz eingeben, per Dropdown auf „Überschrift 4“ setzen, als ODT
   exportieren → `content.xml` enthält `<text:h text:style-name="Heading4-…"
   text:outline-level="4">` (`odt/writer.ts:69-74`, `styleRegistry.ts:80-93`).
3. Per Dropdown zurück auf „Standard“ wechseln, exportieren → Export enthält
   `<text:p>` statt `<text:h>`, kein `outline-level`-Attribut mehr.
4. Ebenenwechsel in einem Schritt (analog 4.1.4), exportieren → nur die neue Ebene ist im
   Export referenziert.
5. Absatz zentrieren, danach per Dropdown zu „Überschrift 1“ wechseln, exportieren,
   reimportieren → analog zu 4.1.5, Ergebnis hier nachtragen.
6. Cross-Format: DOCX mit Überschriften importieren → als ODT exportieren → Level und
   Text bleiben erhalten.
7. **Pflicht-Testfall für Befund 6:** Reale, mit LibreOffice/OpenOffice erzeugte ODT-Datei
   mit Überschriften, deren Formatierung über die gemeinsame `office:styles`-Formatvorlage
   „Heading 1“ (nicht über eine automatische Instanz-Formatvorlage) bezogen wird,
   importieren → Text und Gliederungsebene müssen erhalten bleiben (da `outline-level`
   direkt am Element steht); zusätzlich verifizieren, ob/dass die Ausrichtung dabei
   verloren geht, und diesen Befund als bestätigt oder widerlegt hier nachtragen.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Überschriften unterschiedlicher Ebenen → Editor → Export als ODT → erneuter
   Import → Export zurück als DOCX → Level und Text bleiben nach zwei
   Formatkonvertierungen identisch.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Im Editor erzeugter Formatwechsel (Standard → Überschrift → Standard, siehe 3.9)
   gefolgt von Cross-Format-Export/Reimport → Ergebnis entspricht dem tatsächlichen
   Nach-Wechsel-Zustand (inklusive der ggf. verlorenen Ausrichtung, sofern Befund 4 nicht
   behoben wird — dann muss das erwartete Ergebnis exakt den Verlust widerspiegeln, kein
   „unerwartetes“ Wiederauftauchen der alten Ausrichtung durch einen Konvertierungs-Zufall).

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, aber laut Auftrag **nicht ausreichende** Tests (prüfen nur
Rundreise vorhandener Überschriften, nicht die Dropdown-Bedienung selbst):
- `tests/e2e/docx.spec.ts:99` „round trip: uploading then exporting unchanged preserves
  heading, text, and bold formatting“
- `tests/e2e/odt.spec.ts:80` analog für ODT

Zusätzlich zu schreibende Testfälle, damit alle Abschnitte 1–4 dieser Anforderung
abgedeckt sind (durchgehend über `page.getByLabel('Absatzformat')` bzw.
`page.locator('select[aria-label="Absatzformat"]')` und Playwrights `selectOption`, nicht
über direkte Command-Aufrufe):

1. Cursor in einen neu getippten Absatz setzen, per Dropdown „Überschrift 1“ wählen →
   Text erscheint sichtbar als `<h1>` im DOM, Dropdown zeigt weiterhin „Überschrift 1“.
2. Direkt im Anschluss „Überschrift 4“ wählen (ohne Zwischenschritt „Standard“) → Text
   wird zu `<h4>`, kein Zwischenzustand.
3. „Standard“ wählen → Text wird wieder zu `<p>`.
4. Mehrere Absätze markieren (Maus-Drag über zwei Zeilen), „Überschrift 2“ wählen →
   Ergebnis gemäß der in 2.3 getroffenen Entscheidung nachweisen (entweder beide Absätze
   werden Überschriften, oder nachweislich keiner — Dropdown zeigt danach wieder den
   ursprünglichen Zustand).
5. Cursor in den ersten Absatz eines Listenpunkts setzen, „Überschrift 1“ wählen →
   Ergebnis gemäß Grenzfall 4 (aktuell: kein sichtbarer Effekt) nachweisen.
6. Cursor in einen zweiten Absatz **innerhalb desselben Listenpunkts** setzen (falls per
   UI erzeugbar, z. B. über Umschalt+Enter/zusätzlichen Absatz), „Überschrift 1“ wählen →
   Ergebnis gemäß Grenzfall 5 (aktuell: funktioniert) nachweisen — Inkonsistenz zwischen
   Test 5 und 6 explizit im Testreport festhalten.
7. Cursor in eine Tabellenzelle setzen, „Überschrift 2“ wählen → Zelle zeigt `<h2>`,
   restliche Tabelle unverändert.
8. Mehrere Tabellenzellen markieren (`CellSelection`), Format wählen → No-Op gemäß 2.7
   nachweisen.
9. Absatz zentrieren (Ausrichtungs-Button), danach „Überschrift 1“ wählen → Ausrichtung
   im DOM prüfen (siehe 2.5/Grenzfall 8), Ergebnis dokumentieren.
10. Enter am Ende einer Überschrift drücken, weiter tippen → neuer Absatz ist `<p>`, keine
    weitere Überschrift (siehe 2.8).
11. Enter mitten in einer Überschrift drücken → beide Hälften bleiben `<hN>` derselben
    Ebene.
12. Undo direkt nach einem Formatwechsel → vorheriger Node-Typ (und ggf. Ausrichtung)
    wird wiederhergestellt; Redo stellt den Wechsel erneut her.
13. Regressionstest analog `selection-regression.spec.ts`, aber mit Absatzformat-Wechsel
    als auslösendem Schritt statt Fett (siehe Grenzfall 14): Tippen → Format setzen →
    Klick zur Neupositionierung → Enter → weiter tippen → Dokument bleibt konsistent.
14. Vollständiger Rundreisetest je Format (4.1/4.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`).
15. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
16. Reale Fremddatei-Tests aus 4.1.7/4.2.7 (Open-Source-Korpus bzw. mit LibreOffice
    erzeugte Datei mit gemeinsamer Formatvorlage).
17. Dropdown-Bedienung auf allen drei in `playwright.config.ts` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → Kernfunktion (Test 1–3)
    funktioniert auf jedem Projekt.

---

## 6. Testmatrix — Zusammenfassung

| Bereich | Unit-Test (Reader/Writer) | E2E-Test (echte Dropdown-Bedienung) | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Grundfunktion Standard ↔ Überschrift 1–6 (Cursor, ein Block) | vorhanden (`roundtrip.test.ts`, aber nur für vorgefertigte Daten, nicht über den Command) | **fehlt komplett** | vorhanden für unveränderten Re-Export, fehlt für „im Editor erzeugt“ |
| Direkter Ebenenwechsel ohne Zwischenschritt | fehlt | fehlt | fehlt |
| Mehrfachselektion über mehrere Absätze | fehlt | fehlt | n/a |
| Verhalten in Listen (erster vs. weiterer Absatz im Listenpunkt) | fehlt | fehlt | n/a |
| Verhalten in Tabellenzellen (einzeln vs. `CellSelection`) | fehlt | fehlt | fehlt |
| Erhalt/Verlust der Ausrichtung beim Formatwechsel | fehlt | fehlt | fehlt |
| Enter-Verhalten am Ende/innerhalb einer Überschrift | fehlt | fehlt | n/a |
| Interaktion mit Fett-Mark beim Rückwechsel | fehlt | fehlt | fehlt |
| Undo/Redo nach Formatwechsel | fehlt | fehlt | n/a |
| Selection-Sync-Regressionstest × Absatzformat | fehlt | **fehlt, sollte Pflicht werden** | n/a |
| Reale Fremddatei mit gemeinsamer/benannter Formatvorlage (ODT `office:styles`) | fehlt | fehlt | fehlt |
| Reale Fremddatei mit vererbter Formatvorlage ohne eigenes `outlineLvl` (DOCX) | fehlt | fehlt | fehlt |
| Cross-Format-Rundreise nach Formatwechsel | n/a | fehlt | fehlt |
| Mobile/Tablet-Bedienung des Dropdowns | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ stützt sich bisher ausschließlich auf
Rundreise-Tests mit **vorgefertigten** Überschriften und auf die bloße Existenz eines
funktionierenden `<select>`-Elements. Es gibt keinen einzigen Test, der das Dropdown
selbst über eine echte Browser-Interaktion bedient, und mindestens drei im Code
nachweisbare Verhaltens-Inkonsistenzen (Befunde 3, 4, 5 aus Abschnitt 0) sind bisher
weder dokumentiert noch getestet.

---

## 7. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Absatzformat-Dropdown“ darf erst dann wieder als
vertrauenswürdig gelten, wenn:

1. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Dropdown-Bedienung im Browser, nicht nur Command-/Datenmodell-Ebene) und grün sind.
2. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch
   einen unabhängigen Parser bzw. durch erneuten Import bestätigt sind.
3. Die zentrale offene Design-Frage aus Abschnitt 2.3/Grenzfall 2 (Verhalten bei
   Mehrfachselektion über mehrere Absätze — analog zu `setAlign` erweitern oder bewusst
   auf einen Block beschränkt lassen) explizit entschieden und das Ergebnis hier
   nachgetragen wurde.
4. Die offene Frage aus Abschnitt 2.5/Grenzfall 8–9 (Erhalt oder Verlust der Ausrichtung
   beim Formatwechsel) explizit entschieden und das Ergebnis hier nachgetragen wurde.
5. Die Inkonsistenz aus Abschnitt 2.6/Grenzfall 4–5 (Überschrift im ersten vs. weiteren
   Absatz eines Listenpunkts) aufgelöst (einheitlich erlaubt oder einheitlich verweigert,
   mit sichtbarer Rückmeldung statt stillem No-Op) oder als bewusst akzeptierte,
   dokumentierte Inkonsistenz festgehalten wurde.
6. Der ODT-Importbefund zu `office:styles` (Abschnitt 0, Befund 6; Grenzfall 15;
   Testfall 4.2.7) an mindestens einer realen Fremddatei nachvollzogen und das Ergebnis
   (behoben oder bewusst als bekannte Einschränkung dokumentiert) hier nachgetragen
   wurde.
7. Der Regressionstest für den Selection-Sync-Bug in Kombination mit dem
   Absatzformat-Wechsel (Abschnitt 3.14/5.13) geschrieben, grün und dauerhaft Teil der
   Suite ist.
8. Kein Testfall stillen Datenverlust zeigt (Ausrichtung, Text oder Formatzustand
   verschwindet ohne sichtbare Rückmeldung) oder eine JS-Exception in der Konsole
   erzeugt, die nicht bereits in Abschnitt 3 als bekannter, zu klärender Punkt geführt
   wird.
9. Der Backlog-Eintrag `absatzformat-dropdown` wird erst dann weiterhin als „vorhanden“
   geführt, wenn Punkte 1–8 erfüllt sind; andernfalls ist der Status auf „teilweise“ zu
   korrigieren und die verbleibenden Punkte (voraussichtlich: Design-Entscheidung
   Mehrfachselektion, Ausrichtungs-Erhalt, Listen-Inkonsistenz, ODT-`office:styles`-Lücke)
   sind als eigene Nachfolge-Aufgaben zu erfassen.
