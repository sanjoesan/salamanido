# Umsetzungsplan (Code-Ebene): Feature „Tabelle löschen"

Bezug: `specs/tabelle-loeschen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6
(Zeile 157) und Abschnitt 17/20, `FEATURE-BACKLOG.md` Slug `tabelle-loeschen`. Dieser Plan wurde
gegen den **tatsächlichen** Code-Stand im Repo (Stand 2026-07-04) verifiziert — jede Datei wurde
gelesen, nicht nur die Anforderungsdatei übernommen — und zusätzlich durch **echte Testläufe**
gegen die installierte `prosemirror-tables@1.8.5` abgesichert (Abschnitt 2): mehrere Verhaltens-
annahmen, die man allein durch Code-Lesen nur vermuten könnte, wurden über eigens geschriebene,
danach wieder entfernte Vitest-Proben empirisch bestätigt oder widerlegt. Abweichungen von der
Anforderungsdatei sind unten explizit markiert.

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers". Es ändert selbst noch keinen
Code.

---

## 0. Geltungsbereich

Gemeinsamer Editor (`src/formats/shared/editor/*`, `src/formats/shared/schema.ts`) für DOCX und
ODT; Import/Export bleibt formatspezifisch (`src/formats/docx/*`, `src/formats/odt/*`). Betroffene
Kern-Dateien (aktueller Stand, mit exakten Zeilenangaben, gegengelesen):

| Datei | Rolle heute |
|---|---|
| `src/formats/shared/schema.ts` | `doc: { content: 'block+' }` (Zeile 7); `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Zeile 106) |
| `src/formats/shared/editor/commands.ts` | Zeile 1–6: Imports/Re-Export von `isInTable`; Zeile 76–86: `insertTable(rows, cols)`. **Kein** `deleteTable`/`removeTable` vorhanden — Anforderung Abschnitt 5, Punkt 1 bestätigt. |
| `src/formats/shared/editor/Toolbar.tsx` | Zeile 228–239: Einfüge-Button „⊞ Tabelle" (`title="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`, `onMouseDown → insertTable(2, 2)`), danach direkt (Zeile 241–244) das Bild-Label. **Kein** zweiter Tabellen-Button — Anforderung Abschnitt 5, Punkt 2 bestätigt. |
| `src/formats/shared/editor/WordEditor.tsx` | Zeile 71–79: eigenes `keymap({...})` (`Mod-z/y/Shift-z`, `Enter`, `Mod-b/i/u`); Zeile 80: `keymap(baseKeymap)`; Zeile 81–82: `columnResizing()`, `tableEditing()`. **Kein** Eintrag für Tabellen-Löschen — Anforderung Abschnitt 5, Punkt 4 bestätigt. |
| `src/formats/docx/writer.ts` / `reader.ts` | `tableToDocx`/`parseTable` lesen/schreiben Tabellen vollständig aus dem *aktuellen* ProseMirror-Dokument zum Zeitpunkt des Aufrufs (siehe Abschnitt 5). |
| `src/formats/odt/writer.ts` / `reader.ts` | Analog für ODT (siehe Abschnitt 6). |

---

## 1. Verifikation der „Ist-Stand"-Verdachtspunkte aus `tabelle-loeschen-req.md` Abschnitt 5

| # | Verdachtspunkt der Anforderung | Ergebnis eigener Prüfung |
|---|---|---|
| 1 | Kein Löschen-Befehl im Datenmodell/Editor | **Bestätigt.** `commands.ts` exportiert nur `insertTable`; `deleteTable` aus `prosemirror-tables` wird nirgends importiert (projektweite Suche: 0 Treffer außer in `node_modules`). |
| 2 | Kein Toolbar-Button für Löschen | **Bestätigt**, exakt wie in der Anforderung beschrieben (`Toolbar.tsx:228-239`). |
| 3 | Kein Kontextmenü | **Bestätigt**, projektweite Suche nach `contextmenu`/`onContextMenu` liefert 0 Treffer. |
| 4 | Keine Tastenkombination fürs Löschen | **Bestätigt für eine explizit dafür angelegte Bindung** — aber siehe Abschnitt 2.3 unten: es gibt einen **bereits heute funktionierenden, ungewollten Nebenweg** über `baseKeymap`s Standard-Backspace-Verhalten, der die Anforderungsdatei nicht kennt. Das ist eine **Präzisierung**, keine Widerlegung: ein *für diesen Zweck entworfener* Tastaturweg existiert nicht, ein *zufällig bereits funktionierender* schon. |
| 5 | Keine Node-Selektion für ganze Tabellen vorbereitet | **Bestätigt für „vorbereitet"** (kein eigener Code dafür), **aber empirisch widerlegt für „nicht erreichbar"**: Eine `NodeSelection` auf dem ganzen `table`-Knoten entsteht bereits heute automatisch, ganz ohne neuen Code, in einer konkreten, realistischen Situation (Abschnitt 2.3). Das ist eine für die Umsetzung wichtige Präzisierung, keine Kritik an der Anforderungsdatei — der Effekt ist im Code nicht offensichtlich, ohne `prosemirror-commands`s `selectNodeBackward`-Quelltext zu lesen. |
| 6 | Kein Fallback für „Tabelle ist einziger Dokumentinhalt" | **Bestätigt für „kein eigener Code"**, **aber empirisch widerlegt für „muss von Grund auf gebaut werden"**: ProseMirrors eigene `Transform.replace`-Logik löst dies bereits **automatisch und korrekt**, sobald überhaupt ein `delete(from, to)` auf den Tabellenknoten dispatcht wird — siehe Abschnitt 2.1, empirisch nachgewiesen. **Kein eigener Fallback-Code nötig**, das ist eine wesentliche Vereinfachung gegenüber dem, was die Anforderungsdatei befürchtet. |
| 7 | Kein Aufräumen verwaister Bild-Ressourcen geprüft | **Bestätigt als „noch nicht durch Test bestätigt"**, aber die in der Anforderung selbst geäußerte Vermutung („sollte automatisch richtig sein") wird hier durch Code-Lesen (Abschnitt 5/6) **erhärtet**: sowohl `ImageCollector` (DOCX) als auch die Bild-Sammlung in `odt/writer.ts` werden pro Schreibvorgang neu instanziiert und ausschließlich durch Ablaufen des zum Exportzeitpunkt aktuellen (bereits reduzierten) Dokuments befüllt. Bleibt trotzdem Pflicht-Testfall (Abschnitt 7 unten), wie von der Anforderung gefordert. |
| 8 | Verschachtelte Tabellen ungetestet für Löschzwecke | **Bestätigt als „ungetestet"**, aber das zugrunde liegende Verhalten wurde empirisch geprüft und ist **bereits korrekt**: `prosemirror-tables`' `deleteTable` trifft beim Auflösen von „welche Tabelle ist gemeint" automatisch die *innerste* umschließende Tabelle (Abschnitt 2.2). Kein Sonderfall-Code nötig, nur Tests. |
| 9 | Keine Tests für Tabellen-Löschen | **Bestätigt**, projektweite Suche nach `deleteTable`/„Tabelle löschen" in `__tests__`/`tests/e2e` liefert 0 Treffer außerhalb dieses Plans. |
| 10 | Verhältnis zu `zeile-loeschen`/`spalte-loeschen` | **Bestätigt und ergänzt:** Für beide Nachbar-Features existieren bereits eigene Umsetzungspläne (`specs/zeile-loeschen-code.md`, `specs/spalte-loeschen-code.md`), die **unabhängig voneinander** und **mit sich widersprechenden Architekturentscheidungen** entstanden sind (Details Abschnitt 4). Das ist ein eigener, für die Gesamt-Integration relevanter Befund — siehe Abschnitt 9. |

**Fazit:** Die Anforderungsdatei trifft den Ist-Stand korrekt. Die eigene Prüfung zeigt aber, dass
der tatsächliche Bauaufwand **kleiner** ist, als Abschnitt 5 der Anforderung vermuten lässt: Drei
der größten befürchteten Baustellen (Grenzfall „einziger Dokumentinhalt", verschachtelte Tabellen,
Bild-Aufräumen) sind bereits durch vorhandene Bibliotheks-/Architektur-Mechanismen strukturell
gelöst und brauchen nur noch **Verdrahtung + Tests**, keinen neuen Lösch-Algorithmus von Grund auf.

---

## 2. Eigene, durch echte Testläufe verifizierte Zusatzbefunde

Diese Befunde stehen in keiner der beiden Anforderungsdateien (`tabelle-loeschen-req.md` und den
Nachbarplänen) und wurden durch tatsächliche Ausführung ermittelt: Es wurden temporäre,
danach vollständig wieder entfernte Vitest-Dateien gegen echte `EditorState`/`Transaction`-Objekte
mit dem Projekt-Schema (`wordSchema`) und der installierten `prosemirror-tables@1.8.5` ausgeführt
(kein Produktivcode wurde dafür angelegt oder verändert). Ergebnisse:

### 2.1 „Tabelle ist einziger Dokumentinhalt" wird von ProseMirror selbst korrekt aufgelöst

Dokument `doc([table(row(cell('A1'), cell('B1')))])`, Cursor in Zelle A1,
`deleteTable(state, dispatch)` (aus `prosemirror-tables`) aufgerufen → resultierendes Dokument:

```json
{ "type": "doc", "content": [{ "type": "paragraph", "attrs": { "align": "left" } }] }
```

`deleteTable` dispatcht schlicht `state.tr.delete($pos.before(d), $pos.after(d))` — **kein**
eigener Fallback-Code. Der leere Absatz entsteht automatisch aus ProseMirrors
`Transform.replace`-Fitting-Algorithmus, der bei einem Schema mit `doc: 'block+'` selbständig
einen `defaultType`-Block einsetzt, wenn sonst ein leeres, ungültiges Dokument entstünde.
**Konsequenz:** Grenzfall 1 der Anforderung braucht **keinen** eigenen Zeilen-Code (kein
`if (parent.childCount === 1) { insert paragraph }`-Wrapper wie ihn `zeile-loeschen-code.md`
Abschnitt 3.1 für den analogen Zeilen-Fall noch selbst bauen musste) — bei „Tabelle löschen" löst
die Bibliothek das bereits vollständig selbst.

### 2.2 Verschachtelte Tabellen: `deleteTable` trifft automatisch die richtige (innerste) Tabelle

Dokument: äußere Tabelle, Zeile 1 enthält in Zelle 1 eine innere 1×2-Tabelle
(„inner-a"/„inner-b"), Zeile 1 Zelle 2 = „outer-b1", Zeile 2 = „outer-a2"/„outer-b2". Cursor
(`TextSelection`) im Text „inner-a" der inneren Tabelle, `deleteTable(state, dispatch)` aufgerufen
→ Ergebnis: äußere Tabelle bleibt mit **beiden** Zeilen und **allen** übrigen Zellen
(„outer-b1", „outer-a2", „outer-b2") vollständig erhalten; nur die Zelle, die die innere Tabelle
enthielt, hat jetzt einen leeren Absatz statt der inneren Tabelle.

Grund (Quelltext `node_modules/prosemirror-tables/dist/index.js`, Funktion `deleteTable`,
Zeile 1832–1839):
```js
function deleteTable(state, dispatch) {
  const $pos = state.selection.$anchor;
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.spec.tableRole == "table") {
    if (dispatch) dispatch(state.tr.delete($pos.before(d), $pos.after(d)).scrollIntoView());
    return true;
  }
  return false;
}
```
Die Schleife läuft von der **größten** Tiefe (`$pos.depth`, also von innen) nach außen und
verwendet den **ersten** Treffer — das ist bei verschachtelten Tabellen immer die **innerste**
umschließende Tabelle relativ zur aktuellen Selektion. Damit ist Abschnitt 2.5 der
Anforderungsdatei (Cursor in innerer Tabelle → nur innere löschen; Cursor in äußerer Zelle
außerhalb der inneren Tabelle → äußere löschen samt Inhalt) bereits **exakt** durch reine
Bibliotheksnutzung erfüllt — kein eigener Tiefen-Auflösungscode nötig. Das entspricht auch
Rundreise-Testfall 4.1.7 wortwörtlich („ersetzt durch einen leeren Absatz in dieser Zelle").

Dieselbe Testreihe bestätigte zusätzlich: Eine `CellSelection`, die mehrere Zellen der
**äußersten** Tabelle markiert (z. B. durch Maus-Drag), führt beim Aufruf von `deleteTable`
ebenfalls korrekt zur vollständigen Entfernung dieser Tabelle (inkl. Fallback-Absatz, falls sie
das einzige Dokumentelement war) — `deleteTable` liest nur `state.selection.$anchor`, das bei
`CellSelection` stets innerhalb der betroffenen Tabelle liegt.

### 2.3 Cursor-Ziel nach dem Löschen ist bereits deterministisch richtig — ohne eigenen Code

Drei Szenarien empirisch geprüft (`deleteTable(state, dispatch)`, Cursor vorher in der Tabelle):

| Ausgangslage | Ergebnis-Dokument | Cursor nach der Transaktion |
|---|---|---|
| Tabelle + Absatz „After" danach | `[paragraph("After")]` (kein extra leerer Absatz, da „After" bereits `block+` erfüllt) | `selection.from = 1` → **Anfang** von „After" (`TextSelection`) |
| Absatz „Before" + Tabelle danach | `[paragraph("Before")]` | `selection.from = 7` → **Ende** von „Before" |
| Zwei Tabellen hintereinander, erste gelöscht | `[table(„T2A")]` unverändert | — |

Das entspricht exakt Grenzfall 4/5/6 der Anforderung, **ohne** dass der Command selbst die
Selektion setzen muss: `deleteTable` dispatcht keine explizite `setSelection`, also mappt
`EditorState.apply` die alte Selektion automatisch durch die Transaktion (`Selection.near` an
der Löschstelle) — das landet zufällig (aber zuverlässig, weil es sich aus der
Positions-Arithmetik ergibt) exakt an der von der Anforderung gewünschten Stelle. **Trotzdem
Pflicht, dies über einen echten Test abzusichern** (siehe Abschnitt 7) — die Anforderungsdatei
selbst verlangt „über echte Bedienung im Browser nachgewiesen, nicht nur Argumentation aus dem
Lesen von Code" (Abschnitt 7 DoD), und dieses Verhalten ist ein Detail der `Transform`-Bibliothek,
kein dokumentierter Vertrag — ein zukünftiges `prosemirror-transform`-Update könnte es ändern,
ohne dass das ein Breaking Change der öffentlichen API wäre.

### 2.4 Eine `NodeSelection` direkt auf der Tabelle wird von `deleteTable` **nicht** erkannt — stiller Fehlschlag, wenn nicht behandelt

Konstruiertes Dokument mit genau einer Tabelle als einzigem Kind, Selektion explizit
`NodeSelection.create(doc, 0)` (also die Tabelle selbst ausgewählt, nicht eine Zelle darin) →
`deleteTable(state, dispatch)` liefert `ran: false` — **kein Wurf, aber auch keine Wirkung.**
Grund: `deleteTable`s Schleife liest `state.selection.$anchor.depth` aufwärts; bei einer
`NodeSelection` auf einem Top-Level-Kind von `doc` liegt `$anchor` **vor** dem Tabellenknoten
(Tiefe des *Elternknotens*, hier `doc`, Tiefe 0), sodass die Schleifenbedingung `d > 0` gar nicht
erst greift.

**Warum das praktisch relevant ist, nicht nur ein theoretischer Randfall:** `prosemirror-commands`'
`baseKeymap` (bereits aktiv über `keymap(baseKeymap)`, `WordEditor.tsx:80`) bindet
`Backspace: chainCommands(deleteSelection, joinBackward, selectNodeBackward)`. Per Quelltextanalyse
(`node_modules/prosemirror-commands/dist/index.js`, Funktionen `selectNodeBackward`/
`findCutBefore`, Zeile 148–173) gilt: Steht der Cursor am **Anfang eines nicht-leeren Absatzes,
der direkt auf eine Tabelle folgt** (Top-Level-Geschwister, keine gemeinsame Zelle), dann liefert
`joinBackward` `false` (eine Tabelle ist kein Textblock, kann nicht verschmolzen werden), und
`selectNodeBackward` greift: Es findet die Tabelle als `$cut.nodeBefore`, prüft
`NodeSelection.isSelectable(node)` (per Schema-Default `true`, da `table` in
`tableNodes()` kein `selectable: false` setzt, siehe `node_modules/prosemirror-tables/dist/index.js`
Zeile 298–307) und wandelt die Selektion in eine `NodeSelection` auf der **ganzen Tabelle** um.
Ein **zweites** Backspace trifft dann auf eine nicht-leere Selektion → `deleteSelection` (erstes
Glied der `chainCommands`-Kette) greift sofort und löscht die Tabelle vollständig
(`tr.deleteSelection()`).

**Das bedeutet: Ein Weg „gesamte Tabelle als Objekt markieren + Backspace" existiert bereits
heute, ganz ohne neuen Code** — allerdings nur für die Cursor-Position „unmittelbar nach der
Tabelle" (Dokument-Ebene), nicht für „irgendwo innerhalb der Tabelle". Das ist exakt das in
Abschnitt 1, Zeile 47 der Anforderung genannte Beispiel („Alles in der Tabelle markieren gefolgt
von einer weiteren Markier-Aktion"), nur dass es sich um eine **Doppel-Backspace-Geste an der
Tabellengrenze** handelt statt um einen Rahmen-Anfasser-Klick. Dieser bereits vorhandene Weg wird
in Abschnitt 4 als dokumentiertes, getestetes (Bonus-)Verhalten übernommen, **ersetzt aber nicht**
den unten (Abschnitt 3.2) explizit neu gebauten Tastaturweg, der von **jeder** Cursor-Position
innerhalb der Tabelle aus funktioniert.

**Konsequenz für die Umsetzung:** Sowohl der neue Löschen-Befehl als auch die
Button-Aktivierungslogik müssen diesen `NodeSelection`-auf-Tabelle-Fall **explizit** behandeln —
sonst wäre genau in dem Moment, in dem eine Nutzerin per Backspace bereits die ganze Tabelle
markiert hat und sich dann doch für den Toolbar-Button entscheidet (oder der zweite Backspace aus
irgendeinem Grund nicht ankommt), der Button fälschlich deaktiviert bzw. ein Klick darauf ein
stiller No-Op — ein direkter Verstoß gegen Abschnitt 20, Punkt 4 der Hauptspezifikation („kein
stiller Fehlschlag"). Siehe `canDeleteTable`/`deleteTable` in Abschnitt 3.1.

### 2.5 Entf/Backspace auf Zellinhalt ist bereits heute korrekt auf „nur Inhalt leeren" beschränkt — kein neuer Code nötig

Zwei voneinander unabhängige, bereits aktive Mechanismen stellen sicher, dass Abschnitt 2.2 der
Anforderung ohne jede Codeänderung gilt:

1. `tableEditing()` (bereits registriert, `WordEditor.tsx:82`) bindet intern
   (`node_modules/prosemirror-tables/dist/index.js`, Zeile 2113–2125) `Backspace`, `Delete`,
   `Mod-Backspace`, `Mod-Delete` auf `deleteCellSelection`, das **ausschließlich** den Inhalt jeder
   markierten Zelle durch eine leere Zellfüllung ersetzt (`tr.replace(pos+1, pos+cell.nodeSize-1,
   new Slice(baseContent, 0, 0))`) und `false` zurückgibt, wenn die Selektion keine
   `CellSelection` ist — die Tabellenstruktur (Zeilen/Zellen selbst) wird nie angefasst.
2. `table_cell`/`table_header` sind im Schema `isolating: true`
   (`node_modules/prosemirror-tables/dist/index.js`, Zeile 316–349). Das verhindert, dass
   `baseKeymap`s `joinBackward`/`joinForward` bei einem einfachen Cursor (kein `CellSelection`) am
   Anfang/Ende einer Zelle jemals über die Zellgrenze hinweg mit einer Nachbarzelle verschmilzt —
   ein Backspace am Zellanfang ist dort schlicht wirkungslos (kein Crash, kein Struktur­verlust),
   nicht „löscht versehentlich die Zellstruktur".

Beides ist bereits aktiv, unabhängig von diesem Feature. **Es ist trotzdem ein Pflicht-Testfall
laut Anforderung** (Abschnitt 6, Testfall 3) — hier wird nur **kein Produktivcode**, sondern
ausschließlich ein Regressionstest benötigt (Abschnitt 7).

### 2.6 Keine verwaisten Formatvorlagen-/Nummerierungs-Definitionen möglich — strukturell ausgeschlossen

Zusätzlich zur in der Anforderung (Abschnitt 5, Punkt 7) selbst schon vermuteten
Bild-Aufräum-Automatik gilt dasselbe Prinzip auch für Listen-Formatvorlagen, was die
Anforderungsdatei nicht anspricht, aber Abschnitt 2.6 der Anforderung („Liste in einer
Zelle … keine losgelöste Listendefinition") indirekt berührt:

- DOCX: `numberingXml()` (`src/formats/docx/styleDefs.ts:37-47`) erzeugt **immer** exakt zwei
  feste Definitionen (`BULLET_NUM_ID = 1`, `ORDERED_NUM_ID = 2`), unabhängig davon, ob überhaupt
  eine Liste im Dokument vorkommt — es gibt keine dynamische, pro Vorkommen erzeugte
  Nummerierungsdefinition, die nach einer Tabellen-Löschung „verwaist" zurückbleiben könnte.
- ODT: `listStyleDefs()` (`src/formats/odt/styleRegistry.ts:98-103`) ist ebenso ein **statischer**
  String mit genau den zwei Listenstil-Namen (`LB`, `LO`).
- Zeichenformatierungs-Formatvorlagen (`TextStyleRegistry`, `src/formats/odt/styleRegistry.ts:22-44`)
  **sind** dynamisch, aber werden pro `writeOdt()`-Aufruf **neu instanziiert** und ausschließlich
  während desselben Baum-Durchlaufs befüllt, der auch `bodyXml` erzeugt (`writer.ts:186`) — eine
  bereits aus dem Dokument entfernte Tabelle wird bei diesem Durchlauf nie besucht, ihre
  Formatierungen (fett/kursiv/Farbe in einer gelöschten Zelle) tauchen daher nie in
  `serializeDefs()` auf. Analog für DOCX, wo Formatierung ohnehin inline im `<w:rPr>` jedes Runs
  steht (kein globales Formatvorlagen-Register für Zeichenformate).

**Konsequenz:** Für DOCX **und** ODT ist „keine Geisterreste von Formatvorlagen/Nummerierung nach
Tabellen-Löschung" **strukturell garantiert**, nicht nur zufällig richtig — es gibt schlicht keinen
Mechanismus im Schreibpfad, der unabhängig vom aktuellen Dokumentbaum Referenzen anlegen könnte.
Trotzdem: Pflicht-Testfall bleibt (Abschnitt 7), da die Anforderung „nachgewiesen, nicht nur
plausibel" verlangt.

---

## 3. Architektur-/Produktentscheidungen

### 3.1 Wohin kommt der neue Befehl? — `commands.ts` erweitern, keine neue Datei

`specs/spalte-loeschen-code.md` (Abschnitt 3.1) hat für die strukturell identische Frage
(„Spalte löschen") bereits entschieden, `commands.ts` direkt zu erweitern (`deleteColumn`,
`canDeleteSelectedColumns`), **ohne** eine neue Datei anzulegen. `specs/zeile-loeschen-code.md`
(Abschnitt 2/3.1) hat stattdessen unabhängig ein **neues** Modul `tableCommands.ts` entworfen und
`insertTable` dorthin verschoben. Diese beiden bereits vorliegenden Pläne widersprechen sich in
der Architektur (siehe Abschnitt 9, Integrationsrisiko). Für „Tabelle löschen" wird hier bewusst
die **`commands.ts`-Erweiterung** übernommen (Präzedenz von `spalte-loeschen-code.md`, das den
Ist-Zustand ohne Umbau am wenigsten anfasst und daher unabhängig von der Reihenfolge, in der die
drei Tabellen-Features tatsächlich gebaut werden, konfliktfrei anwendbar bleibt): **keine** neue
`tableCommands.ts`; `deleteTable`/`canDeleteTable` werden direkt in `commands.ts` ergänzt. Sollte
`zeile-loeschen` vor diesem Feature umgesetzt und `insertTable` dabei tatsächlich nach
`tableCommands.ts` verschoben worden sein, gilt diese Regel unverändert sinngemäß für die dann
existierende Datei — der Name des Moduls ist hier kein Korrektheitskriterium, nur die Bündelung an
einem einzigen, nicht dritten neuen Ort.

### 3.2 Wohin kommt der neue Button? — `Toolbar.tsx`, direkt neben „⊞ Tabelle"

Die Anforderung selbst ist hier eindeutig (Abschnitt 1, Zeile 45): „Toolbar, Gruppe „Tabelle"
(**neben** dem bestehenden Button „⊞ Tabelle" zum Einfügen)". Das spricht für eine Erweiterung der
**bestehenden** `Toolbar.tsx` an genau dieser Stelle — exakt das Muster, das
`spalte-loeschen-code.md` (Abschnitt 3.2) für „Spalte löschen" bereits gewählt hat. Der
**abweichende** Ansatz aus `zeile-loeschen-code.md` (Abschnitt 2/3.6: neue, nur innerhalb einer
Tabelle sichtbare zweite Werkzeugleiste `TableToolbar.tsx`) widerspricht dem expliziten
Wortlaut dieser Anforderung („neben dem bestehenden Button", nicht „in einer separaten zweiten
Leiste") und wird hier **nicht** übernommen. Entscheidung: **`Toolbar.tsx` erweitern.**
(Siehe Abschnitt 9 für die daraus resultierende Cross-Feature-Inkonsistenz und einen
Lösungsvorschlag für die Integration.)

### 3.3 Sichtbar+deaktiviert statt ausgeblendet

Row 6 der Anforderung erlaubt beides („deaktiviert (oder ausgeblendet)"); Grenzfall 13 verwendet
konkret das Wort „deaktiviert". Entscheidung wie bei `spalte-loeschen-code.md` (Abschnitt 2, Punkt
4) und konsistent mit dem bereits vorhandenen „⊞ Tabelle"-Button (immer sichtbar): **immer
sichtbar, `disabled`-Attribut statt bedingtem Rendering.** Begründung: keine Layout-Sprünge, keine
Sichtbarkeits-/Klick-Race in E2E-Tests, ein Element bleibt für Playwright-Locators durchgehend
ansprechbar (nur `disabled` wechselt).

### 3.4 Kein Bestätigungsdialog

Wie von der Anforderung selbst empfohlen (Abschnitt 1, Zeile 48) und konsistent mit dem bereits
etablierten Muster „Bild löschen" (Entf-Taste, kein Rückfragedialog) sowie den beiden
Nachbarplänen (`zeile-loeschen-code.md`, `spalte-loeschen-code.md`, jeweils „kein Dialog"):
Undo (`history()`, bereits aktiv über `Mod-z`) ist der alleinige Schutzmechanismus.

### 3.5 Kein Kontextmenü

Wie in beiden Nachbarplänen entschieden: Es existiert projektweit keinerlei
Kontextmenü-Infrastruktur; ein neues generisches System nur für dieses eine Feature aufzubauen ist
unverhältnismäßig. Die Anforderung selbst stuft dies als „Nice-to-have" ein (Abschnitt 1, Zeile
46). **Nicht Teil dieser Umsetzung.**

### 3.6 Tastaturweg: zwei Bausteine — ein neuer, allgemeingültiger Shortcut **plus** Dokumentation des bereits vorhandenen Boundary-Backspace-Verhaltens

Reine Beobachtung des bereits vorhandenen Backspace-Verhaltens (Abschnitt 2.4) deckt nur den
Spezialfall „Cursor direkt hinter der Tabelle" ab, nicht „Cursor irgendwo in der Tabelle" — die
Anforderung (Abschnitt 1, Zeile 47) verlangt aber „mindestens ein zuverlässiger Weg", ohne diesen
auf die Tabellengrenze einzuschränken. Entscheidung: **zusätzlicher, expliziter Keymap-Eintrag**
`Mod-Alt-Backspace` → ruft **denselben** `deleteTable()`-Befehl auf, den auch der Toolbar-Button
nutzt (siehe Abschnitt 3.7) — das erfüllt Abschnitt 2.2 der Anforderung („muss dasselbe Ergebnis
liefern wie der Toolbar-Button") **konstruktiv**, nicht nur zufällig, weil es exakt dieselbe
Funktion aufruft. `Mod-Alt-Backspace` ist aktuell in keinem der beiden registrierten Keymaps
(eigener `keymap({...})`, `WordEditor.tsx:71-79`, oder `baseKeymap`, Zeile 80) belegt — verifiziert
durch Lesen beider Objekte. Das bereits vorhandene Boundary-Backspace-Verhalten (Abschnitt 2.4)
bleibt zusätzlich als dokumentiertes, getestetes Verhalten bestehen (kein Code nötig, da es aus
`baseKeymap` selbst folgt), wird aber **nicht** als der primäre Tastaturweg im Sinne der
Anforderung dargestellt, weil er positionsabhängig und für Erstnutzer:innen nicht auffindbar ist.

### 3.7 Ein einziger, wiederverwendeter Befehl statt getrennter Implementierungen für Button/Tastatur

Sowohl der Toolbar-Button als auch der neue Keymap-Eintrag rufen exakt denselben exportierten
`deleteTable()`-Befehl auf (siehe Abschnitt 4.1). Das ist die einfachste, beweisbar korrekte Art,
Abschnitt 2.2 der Anforderung zu erfüllen: Es gibt keine zwei Code-Pfade, die divergieren könnten.

---

## 4. Geänderte/neue Dateien — Editor-Kern

### 4.1 `src/formats/shared/editor/commands.ts` (ändern)

Aktuell (Zeile 1–6):
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable } from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable }
```

Ändern zu:
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { NodeSelection } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable, deleteTable as pmDeleteTable } from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable }
```
(Import-Alias `pmDeleteTable`, damit der neue eigene Export unten unverändert `deleteTable`
heißen kann — konsistent mit dem bestehenden Namensmuster `insertTable`/`deleteTable`. Falls
`spalte-loeschen` zu diesem Zeitpunkt bereits `deleteColumn`/`selectedRect` in dieselbe
Import-Zeile aus `prosemirror-tables` ergänzt hat, wird `deleteTable as pmDeleteTable` dort
einfach mit angehängt — keine Kollision, da unterschiedliche Bezeichner.)

Neu ergänzen (Position: direkt nach `insertTable`, Zeile 76–86 im aktuellen Stand):
```ts
/**
 * Whether "Tabelle löschen" would currently remove anything — used for den Toolbar-Button
 * (Anforderung tabelle-loeschen-req.md Abschnitt 1, Zeile 50: Button muss deaktiviert sein,
 * wenn der Klick wirkungslos bliebe).
 *
 * `isInTable` allein reicht nicht: Eine `NodeSelection`, die bereits die *ganze* Tabelle als
 * Objekt markiert, hat ihren Anker *vor* der Tabelle, nicht in einer Zeile/Zelle darin —
 * `isInTable` (das nur die Ahnenkette von `$head` prüft) liefert dort fälschlich `false`.
 * Dieser Zustand ist keine Theorie: `baseKeymap`s Standard-`Backspace`
 * (`chainCommands(deleteSelection, joinBackward, selectNodeBackward)`) erzeugt ihn bereits
 * heute automatisch, wenn der Cursor am Anfang eines Absatzes direkt nach einer Tabelle steht
 * (siehe tabelle-loeschen-code.md Abschnitt 2.4, empirisch verifiziert) — der Button darf in
 * genau diesem Moment nicht grundlos deaktiviert wirken.
 */
export function canDeleteTable(state: EditorState): boolean {
  if (isInTable(state)) return true
  const { selection } = state
  return selection instanceof NodeSelection && selection.node.type === wordSchema.nodes.table
}

/**
 * Entfernt die Tabelle, die die aktuelle Selektion umschließt — bei verschachtelten Tabellen
 * automatisch die *innerste* umschließende (verifiziert, siehe tabelle-loeschen-code.md
 * Abschnitt 2.2: `prosemirror-tables`' eigener `deleteTable` durchläuft die Ahnenkette von
 * `state.selection.$anchor` von der größten Tiefe aus nach außen und nimmt den ersten
 * Treffer — das ist bereits exakt das in Abschnitt 2.5 der Anforderung verlangte Verhalten,
 * ganz ohne eigenen Tiefen-Auflösungscode). Fällt für den Fall zurück, dass die ganze Tabelle
 * bereits als `NodeSelection` markiert ist (siehe `canDeleteTable`) — die Bibliotheksfunktion
 * selbst gibt dafür `false` zurück (empirisch verifiziert: ihr `$pos.depth`-Aufstieg erreicht
 * nie eine Tiefe *vor* der Tabelle), was ohne diese Fallunterscheidung ein stiller Fehlschlag
 * wäre (Hauptspezifikation Abschnitt 20, Punkt 4).
 */
export function deleteTable(): Command {
  return (state, dispatch) => {
    const { selection } = state
    if (selection instanceof NodeSelection && selection.node.type === wordSchema.nodes.table) {
      if (dispatch) dispatch(state.tr.deleteSelection().scrollIntoView())
      return true
    }
    return pmDeleteTable(state, dispatch)
  }
}
```

Kein Tiefen-Guard, keine Sonderbehandlung für große Tabellen nötig — `tr.delete(from, to)` ist ein
einzelner strukturneutraler Schritt unabhängig von der Zellenzahl (siehe Grenzfall 3, Performance:
Aufwand ist die Größe des gelöschten Teilbaums, kein quadratischer/rekursiver Mehraufwand).

### 4.2 `src/formats/shared/editor/tableIcons.tsx` (neu — **oder** ergänzen, falls durch `spalte-loeschen` bereits angelegt)

`spalte-loeschen-code.md` (Abschnitt 3.3) legt für „Spalte löschen" bereits eine Datei exakt
dieses Namens mit `DeleteColumnIcon` an, explizit „als Vorlage für künftige Tabellen-Aktionen".
Falls diese Datei zum Umsetzungszeitpunkt bereits existiert, wird hier **ergänzt**, nicht
dupliziert; falls nicht, wird sie mit exakt diesem Inhalt neu angelegt:

```tsx
/** Inline SVG icons for table toolbar actions — `currentColor` so they inherit the button's
 *  text color (incl. disabled/dark-mode variants); `aria-hidden` since the accessible name
 *  always comes from the button's own `aria-label`, never from the icon (Hauptspezifikation
 *  Abschnitt 20, Punkt 1: kein Emoji-/Unicode-Symbol). */

export function DeleteTableIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2.5" y1="3.5" x2="13.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="13.5" y1="3.5" x2="2.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
```
(Vollständiges Tabellengitter mit großem „X" darüber, zur Unterscheidung von
`DeleteColumnIcon`/`DeleteRowIcon`, die nur einen Ausschnitt durchstreichen. Exakte
Pfad-/Geometrie-Feinabstimmung ist beim Bau frei, verbindlich ist nur: inline SVG,
`currentColor`, `aria-hidden`, kein Unicode/Emoji.)

### 4.3 `src/formats/shared/editor/Toolbar.tsx` (ändern)

1. Import ergänzen:
   ```ts
   import { deleteTable, canDeleteTable, ... } from './commands'
   import { DeleteTableIcon } from './tableIcons'
   ```
2. Neuer Button, eingefügt **innerhalb des Tabellen-Bereichs** der Toolbar — direkt nach dem
   bestehenden „⊞ Tabelle"-Button (Zeile 228–239 im aktuellen Stand) und vor dem Bild-Label
   (Zeile 241). Falls `spalte-loeschen`/`zeile-loeschen` zu diesem Zeitpunkt bereits eigene
   Tabellen-Buttons an derselben Stelle ergänzt haben, wird **danach** angehängt (exakte
   Reihenfolge innerhalb des Tabellen-Buttons-Clusters ist nicht sicherheitsrelevant — nur „im
   Tabellen-Bereich, vor dem Bild-Label" muss stimmen, Anforderung Abschnitt 1, Zeile 45):
   ```tsx
   <button
     type="button"
     title={
       canDeleteTable(view.state)
         ? 'Tabelle löschen'
         : 'Tabelle löschen (Cursor muss in einer Tabelle stehen)'
     }
     aria-label="Tabelle löschen"
     disabled={!canDeleteTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       run(view, deleteTable())
     }}
     className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
       canDeleteTable(view.state)
         ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
         : 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
     }`}
   >
     <DeleteTableIcon />
     <span>Tabelle löschen</span>
   </button>
   ```
   `onMouseDown` + `e.preventDefault()` folgt exakt demselben Muster wie **jeder** bestehende
   Toolbar-Button (verhindert, dass der Klick auf den Button selbst dem Editor den Fokus/die
   Selektion entzieht, **bevor** `command(view.state, view.dispatch)` in `run()` liest — das ist
   für dieses Feature besonders wichtig, siehe Grenzfall 9/Abschnitt 7 unten: `view.state`
   spiegelt zum Zeitpunkt des Klicks bereits die zuletzt per Maus positionierte Selektion wider,
   weil `reconcileSelectionOnClick`s `mouseup`-Handler (`WordEditor.tsx:42-53`) bei einem
   vorherigen Klick in eine andere Zelle bereits synchron gelaufen ist, **bevor** dieser
   Button-Klick überhaupt beginnt).
3. `run()` (lokale Funktion, Zeile 23–26) wird **unverändert wiederverwendet**, keine Extraktion
   in eine eigene Datei nötig (abweichend von `zeile-loeschen-code.md`s `runCommand.ts`-Vorschlag —
   dieser Plan folgt hier stattdessen der von `spalte-loeschen-code.md` übernommenen Architektur,
   siehe Abschnitt 3.1).
4. **Bewusst kein `aria-pressed`** am neuen Button (Aktion, kein Umschaltzustand) — `disabled`
   ist die semantisch korrekte Eigenschaft, exakt wie bei `spalte-loeschen-code.md`s
   `DeleteColumnButton` begründet.
5. Der bestehende „⊞ Tabelle"-Button selbst wird durch dieses Feature **nicht** verändert. Sein
   genaues Markup/Verhalten steht laut `tabelle-einfuegen-code.md` (eigener, unabhängiger Plan)
   möglicherweise vor einer Umstellung auf einen Dialog; die eigenen E2E-Tests dieses Features
   (Abschnitt 7.4) verankern ihre Locators daher **ausschließlich** am neuen eigenen
   `aria-label="Tabelle löschen"`, nicht an Annahmen über das Nachbar-Element.

### 4.4 `src/formats/shared/editor/WordEditor.tsx` (ändern)

1. Neuer Import: `import { deleteTable } from './commands'`.
2. Im bestehenden eigenen `keymap({...})`-Block (Zeile 71–79) einen Eintrag ergänzen:
   ```ts
   keymap({
     'Mod-z': undo,
     'Mod-y': redo,
     'Mod-Shift-z': redo,
     Enter: splitListItem(wordSchema.nodes.list_item),
     'Mod-b': toggleMark(wordSchema.marks.strong),
     'Mod-i': toggleMark(wordSchema.marks.em),
     'Mod-u': toggleMark(wordSchema.marks.underline),
     'Mod-Alt-Backspace': deleteTable(),
   }),
   ```
   `deleteTable()` gibt außerhalb einer Tabelle (und ohne `NodeSelection` auf einer Tabelle)
   bereits selbst `false` zurück (delegiert an `pmDeleteTable`, das intern keinen Treffer in der
   Ahnenkette findet) — kein zusätzlicher `isInTable`-Guard im Keymap-Eintrag nötig, das
   `Command`-Vertrag-Verhalten „gibt `false` zurück, wenn nicht anwendbar" reicht,
   `keymap()` fällt dann automatisch zum nächsten Plugin/Standardverhalten durch.
3. Keine Änderung an `columnResizing()`/`tableEditing()` (Zeile 81–82) oder an
   `reconcileSelectionOnClick` (Zeile 42–53) nötig — Letzteres ist bereits generisch genug, um
   auch vor einem Struktur-Löschklick zu greifen (muss aber per Test verifiziert werden, nicht nur
   angenommen, siehe Abschnitt 7, Grenzfall 9).

### 4.5 `src/formats/shared/schema.ts` — keine Änderung

`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Zeile 106)
reicht unverändert aus. `doc: { content: 'block+' }` (Zeile 7) ist genau die Bedingung, die
ProseMirrors eigene Fitting-Logik bereits automatisch erfüllt (Abschnitt 2.1) — kein
`content: 'block*'`-Downgrade nötig oder gewollt (würde ein leeres `doc` erlauben, was die
Anforderung explizit ausschließt: „kein leeres/ungültiges Wurzelelement").

### 4.6 `src/index.css` — keine zwingende Änderung

Das bereits von den Nachbarplänen (`zeile-loeschen-code.md` Abschnitt 3.8,
`spalte-loeschen-code.md` Abschnitt 3.4) identifizierte Fehlen einer `.selectedCell`-CSS-Regel
betrifft dieses Feature nur am Rande: „Tabelle löschen" ist so entworfen, dass **ein einzelner
Klick bei irgendeiner Cursor-Position** genügt (Abschnitt 2.1 der Anforderung) — eine sichtbare
`CellSelection` ist dafür keine Voraussetzung. Kein Code-Beitrag dieses Features hierzu; falls
`zeile-loeschen`/`spalte-loeschen` die Regel zuerst ergänzen, profitiert „Tabelle löschen"
kostenlos mit (dieselbe `CellSelection` bliebe dann auch beim Übergang zu „ganze Tabelle löschen"
sichtbar).

---

## 5. DOCX Import/Export — keine Anpassung nötig

`src/formats/docx/reader.ts` (`parseTable`, Zeile 210–256) und `src/formats/docx/writer.ts`
(`tableToDocx`, Zeile 128–171, `blocksToDocx`, Zeile 173–175) lesen bzw. schreiben die
Tabellenstruktur bei **jedem** Export/Import vollständig neu aus dem zum Zeitpunkt des Aufrufs
aktuellen ProseMirror-Dokument. Da „Tabelle löschen" ausschließlich den ProseMirror-Zustand
verändert (Abschnitt 4.1), spiegelt ein nachfolgender Export automatisch die fehlende Tabelle
wider:

- Eine gelöschte Tabelle ist im JSON-Baum schlicht nicht mehr vorhanden — `blocksToDocx` iteriert
  nur über tatsächlich vorhandene Top-Level-Blöcke, es gibt keinen separaten Tabellen-Katalog, aus
  dem etwas händisch entfernt werden müsste.
- **Bilder** in einer gelöschten Zelle verschwinden automatisch aus dem Export: `ImageCollector`
  (`src/formats/docx/imageCollector.ts`) wird pro `writeDocx()`-Aufruf **neu instanziiert**
  (`writer.ts:223`) und ausschließlich durch `imageParagraphXml()` befüllt, das nur beim
  tatsächlichen Ablaufen des (bereits reduzierten) Dokumentbaums aufgerufen wird
  (`blockToDocx`/`tableToDocx`, Zeile 94–171). Ein gelöschtes Bild wird nie besucht, landet nie in
  der Collector-Liste, damit auch nie im ZIP unter `word/media/` und nie als
  `<a:blip r:embed="…"/>`-Relationship. Analog für `RelationshipRegistry`
  (`src/formats/docx/relationships.ts`) — auch diese wird pro Export neu angelegt.
- **Fußnoten** (`table_footnotes.docx`, Grenzfall/Testfall siehe Abschnitt 4.2 Punkt letzter
  Absatz der Anforderung): Der aktuelle Reader/Writer hat **keinerlei** Fußnoten-Unterstützung
  (projektweite Suche nach `footnote`/`w:footnote` in `src/formats/docx/` liefert 0 Treffer außer
  in Kommentaren/Tests, die reines Text-Parsing prüfen — siehe `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 11, als eigene, noch nicht umgesetzte Phase-3-Baustelle geführt). Für „Tabelle löschen"
  bedeutet das konkret: Ein Fußnoten-**Verweis** innerhalb einer Tabellenzelle wird beim Import
  schlicht als Text übernommen bzw. ignoriert (je nachdem, wie `w:footnoteReference` von
  `decodeParagraphRuns`, `reader.ts:124-143`, behandelt wird — aktuell: nicht erkannt, landet also
  weder als eigener Node noch als Sonderzeichen im Dokument, der Lauftext um die Referenz herum
  bleibt aber erhalten). Eine „verwaiste Fußnote" im Sinn der Anforderung (Zeile 289–291,
  „referenzierte Fußnoten sauber mit entfernt … statt verwaiste Fußnoten-Referenzen zu
  hinterlassen") kann mit dem heutigen Funktionsumfang **gar nicht erst entstehen**, weil es noch
  keine eigenständige Fußnoten-Repräsentation gibt, die verwaisen könnte — das ist eine **bewusst
  dokumentierte, bestehende Einschränkung außerhalb des Scopes dieses Features** (gehört zu
  Fußnoten-Unterstützung allgemein, eigener Backlog-Bereich laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 11), keine neu durch „Tabelle löschen" eingeführte Lücke. Der Pflicht-Testfall zu
  `table_footnotes.docx` (Abschnitt 7.6 unten) prüft entsprechend nur: Import ohne Crash,
  Tabellen-Löschung funktioniert, Reimport nach Export enthält keine kaputte
  XML-Struktur — **nicht** eine (heute nicht vorhandene) Fußnotenverwaltung.

**Fazit:** Für DOCX ist dieses Feature eine reine Editor-Änderung; Reader/Writer bleiben
unangetastet. Muss trotzdem durch die Rundreise-Tests in Abschnitt 7 **bestätigt**, nicht nur
behauptet werden.

---

## 6. ODT Import/Export

### 6.1 Für die Löschfunktion selbst: keine Anpassung nötig

Exakt dieselbe Argumentation wie Abschnitt 5 gilt für `src/formats/odt/writer.ts`
(`blockToOdt`, Fall `'table'`, Zeile 86–111) und `src/formats/odt/reader.ts`
(`elementToBlocks`, Fall `table`, Zeile 189–203): Beide arbeiten ausschließlich auf dem zum
Zeitpunkt des Aufrufs aktuellen Dokumentbaum. Bilder (`ImageCollector`, neu instanziiert je
`writeOdt()`-Aufruf, `writer.ts:185`) und Zeichenformat-Definitionen (`TextStyleRegistry`, neu
instanziiert je Aufruf, `writer.ts:184/188`, siehe Abschnitt 2.6 oben) verschwinden aus demselben
Grund automatisch mit einer gelöschten Tabelle.

### 6.2 Abhängigkeit von einem bereits andernorts identifizierten ODT-Bug — nicht selbst zu beheben, aber blockierend für einen Teil der Rundreise-Tests

Sowohl `zeile-loeschen-code.md` (Abschnitt 1, Punkt 4, Abschnitt 5.2) als auch
`spalte-loeschen-code.md` (Befund 7/8, Abschnitt 3.7/3.8) haben **unabhängig voneinander** exakt
denselben Bug in denselben zwei Dateien gefunden und einen Fix dafür geplant:

1. `src/formats/odt/writer.ts:88` — `colCount = rows[0]?.content?.length ?? 1` berücksichtigt
   `colspan` nicht (unterschätzt die Spaltenzahl, wenn Zeile 0 eine `colspan`-Zelle enthält).
2. `src/formats/odt/writer.ts`, Fall `'table'` — es wird kein
   `<table:covered-table-cell/>`-Platzhalter für Zellen erzeugt, die von einer `rowspan`-Zelle
   einer vorherigen Zeile überdeckt werden (nach ODF-Spezifikation zwingend für eine valide
   Tabelle).
3. `src/formats/odt/reader.ts:189-203` — liest `covered-table-cell` aus echten Fremddateien
   nicht, wodurch `rowspan` beim Import über mehr als eine überdeckte Zeile falsch bzw. gar nicht
   rekonstruiert wird (`spalte-loeschen-code.md` Abschnitt 3.7 hat hierfür bereits ein
   Anchor-Array-Muster analog zu `docx/reader.ts:210-256` entworfen).

**Relevanz für „Tabelle löschen":** Dieses Feature ändert an Rowspan-/Colspan-Handling selbst
nichts — es löscht ganze Tabellen, es baut keine neuen um. Der Bug wird aber **indirekt**
relevant für einen Teil der in Abschnitt 4.1 der Anforderung geforderten Rundreise-Tests: Punkt 5
(„Zwei Tabellen im Dokument, nur eine löschen → die verbleibende Tabelle bleibt vollständig und
unverändert erhalten"). Hat die **verbleibende** (nicht gelöschte) Tabelle selbst mehrzeilige
`rowspan`-Zellen, würde ein ODT-Export dieser überlebenden Tabelle unabhängig von „Tabelle
löschen" bereits fehlerhaftes `covered-table-cell`-freies XML erzeugen — ein Testfehler, der
**nicht** durch dieses Feature verursacht wäre, aber einen Rundreise-Test dieses Features
fälschlich rot erscheinen ließe, wenn die Test-Fixtures ungünstig gewählt werden.

**Entscheidung:** Dieser Bug wird **nicht erneut** von diesem Plan behoben (das wäre
Doppelarbeit an denselben Zeilen wie zwei bereits vorliegende Pläne) — stattdessen:
- Die eigenen Rundreise-Tests dieses Features (Abschnitt 7.3) vermeiden bewusst
  mehrzeilige mit einer Tabelle konfliktbehaftete `rowspan`-Konstellationen als
  **Grundmuster** in **selbst konstruierten** Testfällen, wählen für den „zwei Tabellen, eine
  bleibt übrig"-Fall (4.1.5) aber **zusätzlich** eine Variante, bei der die verbleibende Tabelle
  einen mehrzeiligen `rowspan` enthält, um den Bug **sichtbar zu machen und explizit als
  bekannte, bereits andernorts adressierte Blockade zu dokumentieren**, statt ihn stillschweigend
  zu umgehen (siehe Testtabelle Abschnitt 7.3 — dieser eine Testfall ist bewusst `test.todo`/als
  bekannter, verlinkter Fail markiert, bis einer der beiden Nachbarpläne umgesetzt ist).
- Bei den **Fixture-Tests** (Abschnitt 7.5): Für Fixtures mit bekannten mehrzeiligen Rowspans
  (`BigTable.odt`, `crazyTable.odt`, `table-column-delete-with-merge*.odt` — enthalten laut
  Dateiname-Konvention genau solche Strukturen) wird die Assertion **bewusst nicht** auf
  „exportiertes XML ist vollständig ODF-valide" geprüft (das würde am nicht-eigenen Bug
  scheitern), sondern nur auf die für dieses Feature tatsächlich relevanten Punkte: (a) kein
  Absturz beim Import, (b) die gelöschte Tabelle fehlt nach Reimport vollständig, (c) der Rest des
  Dokuments (nicht die überlebenden Tabellen mit Rowspan-Eigenheiten) ist inhaltlich unverändert.
  Sobald einer der beiden Nachbarpläne den Bug behebt, kann diese Einschränkung ersatzlos entfernt
  werden (kein Code in diesem Feature hängt davon ab).

---

## 7. Tests

### 7.1 NEU: `src/formats/shared/editor/__tests__/tableCommands.test.ts`

Reine Unit-Tests gegen `deleteTable()`/`canDeleteTable()` über direkt konstruierte
`EditorState`s (kein DOM/View nötig — Muster wie das für diesen Plan selbst verwendete, danach
entfernte Probe-Setup, Abschnitt 2). Deckt ab:

| Testfall | Grenzfall/Abschnitt der Anforderung |
|---|---|
| Cursor in einer Zelle einer 2×2-Tabelle → gesamte Tabelle verschwindet, unabhängig davon, in welcher Zelle | 2.1 |
| `CellSelection` über mehrere Zellen/Zeilen → ganze Tabelle verschwindet trotzdem (nicht nur markierte Zellen) | 2.1 |
| Tabelle = einziges Dokumentelement → nach Löschung genau ein leerer `paragraph`, kein leeres `doc` | 3.1 (Grenzfall 1) |
| 1×1-Tabelle → Löschung funktioniert identisch zu größeren | 3.2 (Grenzfall 2) |
| Tabelle am Dokumentanfang, Absatz danach → Ergebnis-Dokument hat nur noch diesen Absatz, Cursor an dessen Anfang | 3.4 (Grenzfall 4) |
| Tabelle am Dokumentende, Absatz davor → Ergebnis-Dokument hat nur noch diesen Absatz, Cursor an dessen Ende | 3.5 (Grenzfall 5) |
| Zwei aufeinanderfolgende Tabellen ohne trennenden Absatz, erste gelöscht → zweite bleibt unverändert, keine Verschmelzung | 3.6 (Grenzfall 6) |
| Verschachtelte Tabelle: Cursor in innerer Tabelle → nur innere verschwindet, äußere (inkl. übriger Zellen) bleibt vollständig, betroffene Zelle bekommt leeren Absatz | 2.5, 3.7 (Grenzfall 7) |
| Verschachtelte Tabelle: Cursor in äußerer Zelle außerhalb der inneren Tabelle → äußere Tabelle inkl. innerer Tabelle vollständig weg | 2.5, 3.7 |
| `NodeSelection` direkt auf dem Tabellenknoten (simuliert den Zustand nach einem Boundary-Backspace) → `deleteTable()` entfernt die Tabelle trotzdem (Regressionstest für den in Abschnitt 2.4 dokumentierten Bibliotheks-Fallstrick) | 2.2 (Konsistenzpflicht) |
| `canDeleteTable`: `false` außerhalb einer Tabelle, `false` bei `NodeSelection` auf einem Bild direkt vor einer Tabelle, `true` bei Cursor in einer Zelle, `true` bei `NodeSelection` auf der Tabelle selbst | 3.13 (Grenzfall 13), Abschnitt 1 Zeile 50 |
| Große Tabelle (12 Spalten × 25 Zeilen, synthetisch erzeugt) → `deleteTable()` läuft ohne Timeout/Exception, exakt ein Absatz bleibt übrig | 3.3 (Grenzfall 3, Performance-Teil — echtes Timing wird zusätzlich per E2E gegen `BigTable.odt` geprüft, Abschnitt 7.5) |
| Tabelle mit `colspan`/`rowspan`-Zellen (verbundene Zellen) → verschwindet vollständig, keine Sonderbehandlung nötig | 2.6 |
| Mehrfaches Undo/Redo (`history()` + `undo`/`redo` aus `prosemirror-history` direkt gegen den `EditorState` angewendet, kein DOM nötig) → Dokument nach jedem Undo bit-genau (`toJSON()`-Vergleich) identisch zum Zustand vor dem jeweiligen Löschen, über mindestens 3 Zyklen | 2.4, 3.11 (Grenzfall 11) |
| Tabelle mit mehreren Absätzen + gemischter Formatierung (fett, kursiv, Ausrichtung je Absatz) in einer Zelle → Löschen entfernt alles, Undo stellt alles inkl. jeder Formatierungsdetails wieder her | 2.4, 3.12 (Grenzfall 12) |
| Löschen unmittelbar nach `insertTable()` ohne dazwischenliegenden Dispatch → funktioniert identisch | 3.10 (Grenzfall 10) |

### 7.2 ERWEITERN: `src/formats/docx/__tests__/roundtrip.test.ts`

Neue Tests im bestehenden `describe('DOCX round trip: tables', …)`-Block (aktuell Zeile 173ff.),
die **den echten Befehl** anwenden (nicht nur fertige JSON-Strukturen direkt konstruieren, wie es
die bestehenden Tests in dieser Datei tun) — Ablauf: `EditorState` mit Tabelle(n) aufbauen →
`deleteTable()` anwenden → `state.doc.toJSON()` in `WordDocumentContent.body` einsetzen →
`writeDocx` → `readDocx` → Struktur/Text prüfen:
1. Einfache 2×2-Tabelle mit Absatz davor/danach, sofort gelöscht → Reimport zeigt nur die beiden
   Absätze, `word/document.xml` enthält kein `<w:tbl>` mehr (Rundreise 4.1.1).
2. Tabelle mit Text, Formatierung, Bild, verschachtelter Liste befüllt, dann gelöscht → Reimport
   zeigt weder Tabellen- noch Zellinhalt, umgebender Text unverändert; zusätzlich: aus dem
   erzeugten `Blob` per `JSZip.loadAsync` die Dateiliste unter `word/media/` prüfen — **keine**
   Bilddatei vorhanden (Rundreise 4.1.3, Grenzfall 14).
3. Zwei Tabellen, nur eine gelöscht → verbleibende Tabelle bit-identisch zum ursprünglichen JSON
   (Rundreise 4.1.5).
4. Verschachtelte Tabelle, äußere gelöscht → Reimport: komplette Struktur (äußere + innere) fehlt,
   umgebender Inhalt bleibt (Rundreise 4.1.6).
5. Verschachtelte Tabelle, nur innere gelöscht → Reimport: äußere Tabelle mit allen übrigen Zellen
   vollständig vorhanden, betroffene Zelle enthält nur noch einen leeren Absatz (Rundreise 4.1.7).
6. `table_footnotes.docx`-artiges Minimaldokument (handgebaut analog zum Muster in
   `tests/e2e/docx.spec.ts:buildSampleDocx`, mit einer Tabelle und einem einfachen Fußnotenverweis
   im Fließtext) → Löschen der Tabelle, Export/Reimport → kein Crash, restlicher Text
   (inkl. der vom Reader ohnehin nicht interpretierten Fußnotenreferenz-Reste) bleibt unverändert
   (siehe Abschnitt 5, Fußnoten-Einschränkung — dieser Test verifiziert „kein Crash/kein
   XML-Bruch", nicht eine nicht vorhandene Fußnotenverwaltung).

### 7.3 ERWEITERN: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog zu 7.2, im bestehenden `describe('ODT round trip: tables', …)`-Block (Zeile 162ff.),
Testfälle 1–5 wortgleich für ODT (`writeOdt`/`readOdt`). Zusätzlich:
6. **Bekannter, dokumentierter Blocker** (siehe Abschnitt 6.2): Zwei Tabellen, die verbleibende
   Tabelle enthält eine über zwei Zeilen reichende `rowspan`-Zelle, die andere wird gelöscht →
   als `test.todo('bleibt rot bis odt/writer.ts covered-table-cell emittiert — siehe
   zeile-loeschen-code.md Abschnitt 5.2 / spalte-loeschen-code.md Abschnitt 3.7-3.8', ...)`
   eingetragen, **nicht** stillschweigend ausgelassen — macht die Abhängigkeit im Testlauf
   sichtbar (rot/`todo`, nicht „gar nicht vorhanden").
7. Bild in einer Zelle einer gelöschten Tabelle → nach Export: Dateiliste im ZIP-Root (ODT legt
   Bilder aktuell ohne `Pictures/`-Unterordner direkt im Wurzelverzeichnis ab, siehe
   `writer.ts:206`) enthält keine Bilddatei mehr; `META-INF/manifest.xml` enthält keinen
   `manifest:file-entry` für ein nicht mehr vorhandenes Bild (Grenzfall 14, ODT-Teil).
8. Liste in einer Zelle einer gelöschten Tabelle → nach Export: `listStyleDefs()` bleibt
   unverändert vorhanden (statische Definition, siehe Abschnitt 2.6), aber es taucht **keine**
   `<text:list>`-Instanz mehr im `content.xml` auf (Abschnitt 2.6 der Anforderung: „keine
   losgelöste Listendefinition ohne Inhalt").

### 7.4 NEU: `src/formats/shared/editor/__tests__/tableDelete.crossFormat.test.ts`

Deckt Rundreise 4.1.8 (Abschnitt 4.1, Punkt 8 der Anforderung) sowie Grenzfall 15:
1. Im Editor-Modell erzeugte, dann per `deleteTable()` gelöschte Tabelle → als ODT exportieren →
   reimportieren → als DOCX exportieren → reimportieren → Tabelle bleibt über beide
   Konvertierungen hinweg korrekt abwesend, umgebender Text bleibt exakt erhalten.
2. Umgekehrte Richtung: DOCX → ODT.
3. Grenzfall 15 wortgleich: DOCX-Datei (handgebaut, mit Tabelle + umgebendem Text) importieren,
   Tabelle im Editor-Modell löschen, als ODT exportieren, reimportieren → Tabelle bleibt
   abwesend, umgebender Text bleibt über den Formatwechsel hinweg vollständig erhalten.

### 7.5 NEU: Fixture-getriebene Tests für **alle** in Abschnitt 4.2 der Anforderung gelisteten Dateien

Zwei neue Dateien, `src/formats/docx/__tests__/tableDelete.fixtures.test.ts` und
`src/formats/odt/__tests__/tableDelete.fixtures.test.ts`, im selben Lade-Stil wie das bereits
vorhandene `external-fixtures.test.ts` (`readFileSync`/`readdirSync` gegen
`tests/fixtures/external/{docx,odt}`), aber mit einem zusätzlichen Schritt: statt nur zu
importieren, wird für jede gelistete Datei

1. `readOdt`/`readDocx` aufgerufen (Ist-Zustand),
2. eine `EditorState` mit `wordSchema.nodeFromJSON(doc.body)` aufgebaut,
3. die **erste** im Dokument gefundene `table`-Node lokalisiert (`state.doc.descendants(...)`,
   Cursor per `TextSelection.near` in deren erste Zelle gesetzt),
4. der **echte, exportierte** `deleteTable()`-Befehl angewendet (dieselbe Funktion, die auch der
   Toolbar-Button aufruft — siehe Abschnitt 9 zur Einordnung, warum das nicht dasselbe ist wie
   eine echte Playwright-Browser-Bedienung, aber mehr ist als am Dokumentmodell konstruierte
   Testdaten),
5. `writeOdt`/`writeDocx` → `readOdt`/`readDocx` erneut aufgerufen,
6. Assertions: (a) kein Absturz in Schritt 1–5, (b) das reimportierte Dokument enthält **eine
   Tabelle weniger** als das Original (Zählung über `descendants`), (c) der restliche
   Text-Inhalt (alle `text`-Knoten außerhalb von Tabellen, verkettet) ist zwischen Original-Import
   und Nach-Löschen-Reimport **identisch**.

Exakte Dateiliste (wortgleich aus Anforderung Abschnitt 4.2 übernommen, jede Zeile ein eigener
`it(...)`, keine Sammelschleife ohne Einzel-Reporting — Muster wie
`external-fixtures.test.ts`, das ebenfalls pro Datei einen eigenen Testfall registriert, damit ein
einzelner Fixture-Fehlschlag nicht den gesamten Lauf verdeckt):

- ODT: `BigTable.odt`, `crazyTable.odt`, `subTables.odt`, `subTables2.odt`,
  `subTables3-nested.odt`, `subTables3-onlyOneColumn.odt`, `subTables4.odt`,
  `table-within-textBox-within-frame.odt`, `table-column-delete-with-merge.odt`,
  `table-column-delete-with-merge-2-times.odt`, `tableRowDeletionTest.odt`, `tableOps.odt`,
  `tableCoveredContent.odt`, `OOStyledTable.odt`, `coloredTable_MSO15.odt`,
  `TableFunkyBackground.odt`, `feature_attributes_tables.odt`,
  `feature_attributes_tables-backgroundTableOnly.odt`,
  `feature_attributes_tables-backgroundTableOnly-AO341.odt`,
  `feature_attributes_tables_FunnyTable_With_xmlid.odt`, `feature_attributes_tables_SMALL.odt`,
  `table_1x3_paragraph_background-MSO2013-LO3_6.odt`, `TableWidth.odt`, `tableNotFullWidth.odt`,
  `simple-table.odt`, `simpleTable.odt`, `simple_table.odt`, `simple-table-with-lists.odt`,
  `listsInTable.odt`, `table.odt`, `table_simple.odt`, `TestTextTable.odt`,
  `doc_heading_table.odt`, `empty4table.odt` (alle Dateien wurden per `ls` gegen das tatsächliche
  Verzeichnis `tests/fixtures/external/odt/` verifiziert — vorhanden, siehe Abschnitt 0).
- DOCX: `TestTableCellAlign.docx`, `TestTableColumns.docx`, `deep-table-cell.docx`,
  `table-alignment.docx`, `table-indent.docx`, `table_footnotes.docx` (ebenfalls verifiziert
  vorhanden).

Für `deep-table-cell.docx` gilt zusätzlich: Dieselbe Datei wird bereits im bestehenden Reader
(`docx/reader.ts:203-208`, `MAX_TABLE_NESTING_DEPTH = 25`) als Absturz-Schutz-Testfall für
pathologisch tiefe Verschachtelung referenziert — der neue Test hier prüft dasselbe Dokument
zusätzlich für den Löschpfad (Schritt 3 „erste gefundene Tabelle" landet dabei ggf. bereits auf
einer der oberen Verschachtelungsebenen, was für diesen Testzweck ausreicht: Absturzfreiheit über
den vollen Lösch-Export-Reimport-Zyklus, nicht Vollständigkeit jeder Verschachtelungsebene).

**Bekannte, dokumentierte Einschränkung dieser Fixture-Tests** (siehe Abschnitt 6.2 und Abschnitt
9): Für ODT-Fixtures mit mehrzeiligem `rowspan` in einer **überlebenden** Tabelle (relevant nur,
wenn eine Datei mehr als eine Top-Level-Tabelle enthält, was für die meisten oben gelisteten
Dateien nicht zutrifft) wird Schritt (c) auf den textlichen Inhalt beschränkt, nicht auf
XML-Validität der überlebenden Tabelle geprüft — siehe Abschnitt 6.2.

### 7.6 NEU: `tests/e2e/table-delete.spec.ts`

Echte Playwright-Bedienung, im selben Stil wie `tests/e2e/selection-regression.spec.ts` und
`tests/e2e/docx.spec.ts` (`docxCard`/`odtCard`-Helper, `.ProseMirror`-Locator, echte
Browser-Interaktion). **Wichtig, aus Abschnitt 9 übernommen:** Locators für den neuen Button
verwenden ausschließlich `page.getByRole('button', { name: 'Tabelle löschen' })` **oder**
`page.getByTitle('Tabelle löschen')` (beide funktionieren, da `aria-label` **und** `title`
gesetzt sind) — **nicht** `page.getByTitle('Tabelle einfügen')`/Annahmen über den Nachbar-Button,
dessen Markup laut `tabelle-einfuegen-code.md` zum Umsetzungszeitpunkt bereits anders aussehen
könnte. Läuft ohne Projekt-Einschränkung, damit automatisch auf allen drei in
`playwright.config.ts` konfigurierten Projekten (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad
Mini).

Testfälle (Abschnitt 6 der Anforderung, 1:1 nummeriert wo zutreffend):

1. Button erscheint deaktiviert, solange der Cursor außerhalb einer Tabelle steht; nach Klick in
   eine Zelle wird er ohne weiteren Klick aktiv (Testfall 1/Abschnitt 1, Zeile 45/50).
2. Tabelle einfügen, in eine beliebige Zelle klicken (nicht Zelle 0), „Tabelle löschen" klicken →
   komplette Tabelle inkl. Inhalt weg (Testfall 2).
3. Text in eine Zelle tippen, per Maus markieren, Entf drücken → nur der Zellinhalt ist leer, die
   Tabelle (Zeilen/Spalten) bleibt sichtbar bestehen (Testfall 3, Abschnitt 2.2).
4. **Pflicht-Regressionstest** (Testfall 9, Grenzfall 9, Abschnitt 2.4 der Anforderung): Text in
   eine Zelle tippen → per Klick den Cursor in eine **andere** Zelle neu positionieren → sofort
   „Tabelle löschen" klicken → Tabelle vollständig weg, kein Crash, keine falsch adressierte
   Tabelle (bei einem Dokument mit **zwei** Tabellen zusätzlich: die jeweils andere bleibt
   unangetastet) — Nachbau des exakten Interaktionsmusters aus dem bereits vorhandenen
   `tests/e2e/selection-regression.spec.ts`-Test „same regression inside a table cell", nur mit
   einer echten Struktur-Löschung am Ende statt einer Formatierungs-Aktion.
5. Cursor direkt nach dem Einfügen (kein Klick dazwischen) → „Tabelle löschen" funktioniert
   ebenso zuverlässig (Grenzfall 10).
6. Tabelle als einziges Dokumentelement (neues leeres Dokument → sofort Tabelle einfügen → sofort
   löschen) → Editor bleibt bedienbar, Tippen funktioniert direkt, kein Crash (Grenzfall 1,
   Testfall 5).
7. Tabelle am Dokumentanfang mit Folgeinhalt, Tabelle am Dokumentende mit vorherigem Inhalt (zwei
   Sub-Tests) → Cursor landet nach dem Löschen deterministisch im jeweils benachbarten Absatz,
   kein Inhaltsverlust (Grenzfall 4/5).
8. Zwei Tabellen ohne trennenden Absatz dazwischen → nur die per Cursor ausgewählte verschwindet
   (Grenzfall 6).
9. Verschachtelte Tabelle (im Editor selbst durch Einfügen-in-Einfügen erzeugt, siehe
   `tabelle-einfuegen-req.md` Grenzfall 3.7/Entscheidung 1.1) → Cursor in innerer Tabelle
   löschen, danach (neues Setup) Cursor in äußerer Tabelle außerhalb der inneren löschen →
   jeweils erwartetes Ziel (Grenzfall 7, Abschnitt 2.5, beide Richtungen einzeln).
10. Strg+Z direkt nach „Tabelle löschen" → exakter Ursprungszustand (Zellen, Formatierung,
    Inhalt sichtbar identisch); Strg+Y danach → Tabelle erneut vollständig entfernt (Testfall 6,
    Grenzfall 11 — zusätzlich mehrfacher Zyklus: löschen → Undo → Redo → Undo, 3 Runden).
11. Cursor in einem Bild direkt **vor** einer Tabelle (nicht in der Tabelle selbst) →
    „Tabelle löschen"-Button bleibt deaktiviert; falls er (Testabsicherung gegen zukünftige
    Regressionen) trotzdem angeklickt würde, ändert sich das Dokument nicht (Grenzfall 13).
12. `Mod-Alt-Backspace` mit Cursor irgendwo in der Tabelle (nicht nur am Rand) → identisches
    Ergebnis zum Button-Klick (Abschnitt 2.2/3.6 dieses Plans).
13. Bereits vorhandenes Boundary-Backspace-Verhalten (Abschnitt 2.4 dieses Plans, **kein neuer
    Code**, reiner Dokumentations-/Regressionstest): Cursor am Anfang eines Absatzes direkt nach
    einer Tabelle, zweimal Backspace drücken → erste Taste markiert die Tabelle sichtbar
    (`NodeSelection`-Rahmen, Standard-ProseMirror-Darstellung), zweite Taste entfernt sie
    vollständig.
14. Export nach DOCX über echten Download-Flow (Muster wie `tests/e2e/docx.spec.ts`) → Reimport
    → Tabelle bleibt abwesend, `word/media/` enthält keine verwaiste Bilddatei (Grenzfall 14,
    Testfall 11).
15. Dasselbe für ODT über echten Download-Flow (Muster wie `tests/e2e/odt.spec.ts`).
16. Repräsentative Teilmenge der Fixture-Dateien aus Abschnitt 7.5 **über echten Datei-Upload**
    (nicht nur Unit-Ebene) — konkret: `simple-table.odt`, `BigTable.odt`,
    `subTables3-nested.odt`, `table-column-delete-with-merge.odt`, `TestTableColumns.docx`,
    `table_footnotes.docx`. Datei hochladen → Cursor in die (sichtbar erste) Tabelle klicken →
    „Tabelle löschen" → Export → Download-Buffer mit `JSZip` öffnen → keine Tabellen-XML mehr
    vorhanden. Diese sechs Dateien sind bewusst so gewählt, dass sie je einen der Haupt-Risikofälle
    abdecken (groß/performant, verschachtelt, exotische Merge-Struktur, Fußnotenbezug) — die
    **volle** Breite aller ~40 Fixture-Dateien wird stattdessen auf Unit-/Integrationsebene
    (Abschnitt 7.5) geprüft, wo die tatsächliche `deleteTable()`-Funktion ebenfalls direkt (nicht
    nachgebaut) aufgerufen wird. Diese zweistufige Strategie wird hier bewusst **nicht** unter
    Verweis auf eine anderswo „bereits vorhandene" E2E-Datei ausgelagert: Eine Prüfung ergab, dass
    `external-fixtures.test.ts` zwar auf eine `tests/e2e/large-document-import.spec.ts` verweist
    (Kommentar in beiden `external-fixtures.test.ts`-Dateien, DOCX wie ODT), **diese Datei aber
    tatsächlich nicht existiert** (`ls tests/e2e/` zeigt nur `lifecycle.spec.ts`, `odt.spec.ts`,
    `docx.spec.ts`, `selection-regression.spec.ts`) — ein bereits bestehender, unabhängig von
    diesem Feature zu behebender Dokumentationsfehler (siehe Abschnitt 9, Punkt 4), der hier nicht
    als Präzedenz für „das ist schon anderswo abgedeckt" herangezogen wird, ohne selbst
    tatsächlich eine entsprechende Testdatei anzulegen.

---

## 8. Grenzfall- und Zugriffswege-Abgleich

### 8.1 Zugriffswege (Abschnitt 1 der Anforderung)

| # | Weg | Entscheidung | Umsetzung |
|---|---|---|---|
| 1 | Toolbar-Button „Tabelle löschen" | **Verbindliche Mindestanforderung — umgesetzt** | Abschnitt 4.3 |
| 2 | Rechtsklick-Kontextmenü | **Bewusst nicht umgesetzt (Nice-to-have laut Anforderung)** | Abschnitt 3.5 |
| 3 | Tastenkombination | **Umgesetzt**, zwei Bausteine: neuer `Mod-Alt-Backspace` (funktioniert von jeder Cursor-Position in der Tabelle aus) + dokumentiertes, bereits vorhandenes Boundary-Backspace-Verhalten (nur an der Tabellengrenze) | Abschnitt 3.6/4.4, Tests 7.6 Punkt 12/13 |
| 4 | Bestätigungsdialog | **Bewusst nicht umgesetzt** | Abschnitt 3.4 |
| 5 | Icon | SVG (`DeleteTableIcon`), kein Emoji | Abschnitt 4.2 |
| 6 | Sichtbar/aktiver Zustand außerhalb einer Tabelle | **`disabled`, immer sichtbar** | Abschnitt 3.3, `canDeleteTable` |

### 8.2 Grenzfälle (Abschnitt 3 der Anforderung) → Testort

| Grenzfall | Kurzfassung | Abgedeckt durch |
|---|---|---|
| 1 | Einzige Tabelle, einziges Dokumentelement | 7.1, 7.6 Punkt 6 |
| 2 | 1×1-Tabelle | 7.1 |
| 3 | Sehr große Tabelle, Performance | 7.1 (synthetisch), 7.5/7.6 (`BigTable.odt`/`crazyTable.odt`) |
| 4 | Tabelle am Dokumentanfang | 7.1, 7.6 Punkt 7 |
| 5 | Tabelle am Dokumentende | 7.1, 7.6 Punkt 7 |
| 6 | Zwei aufeinanderfolgende Tabellen | 7.1, 7.6 Punkt 8 |
| 7 | Verschachtelte Tabelle, beide Richtungen | 7.1, 7.6 Punkt 9, Fixtures `subTables*.odt` (7.5) |
| 8 | Bereits gemergte/gelöschte Spalten (Fremddatei-Eigenheiten) | 7.5 (`table-column-delete-with-merge*.odt`) |
| 9 | Selection-Sync-Regressionsmuster | 7.6 Punkt 4 (Pflicht) |
| 10 | Löschen unmittelbar nach Einfügen | 7.1, 7.6 Punkt 5 |
| 11 | Mehrfaches Undo/Redo | 7.1, 7.6 Punkt 10 |
| 12 | Mehrere Absätze/gemischte Formatierung in einer Zelle | 7.1 |
| 13 | Löschen während Bild-/Fremdauswahl außerhalb der Tabelle | 7.1 (`canDeleteTable`), 7.6 Punkt 11 |
| 14 | Bild in Zelle löschen, danach exportieren | 7.2 Punkt 2, 7.3 Punkt 7, 7.6 Punkt 14 |
| 15 | Rundreise mit Format-Wechsel (Cross-Format) | 7.4 |
| 16 | Reale Fremddatei: Rundreise ohne Löschen bleibt unbeeinträchtigt | 7.5 (Schritt 1 jeder Fixture ist bereits der bestehende `external-fixtures.test.ts`-Import; zusätzlich wird in 7.5 Schritt (c) explizit der **unveränderte** Nicht-Tabellen-Inhalt vor und nach dem Lösch-Workflow verglichen) |

---

## 9. Integrationsrisiken zwischen den drei parallelen Tabellen-Feature-Plänen

Dieser Plan, `specs/zeile-loeschen-code.md` und `specs/spalte-loeschen-code.md` wurden
unabhängig voneinander gegen denselben, zum jeweiligen Zeitpunkt identischen Ist-Code verfasst.
Vier konkrete Konflikte, die vor/während der tatsächlichen Umsetzung aufgelöst werden müssen:

1. **Architektur der Tabellen-UI:** `zeile-loeschen-code.md` plant eine neue, separat
   gerenderte `TableToolbar.tsx` (nur sichtbar innerhalb einer Tabelle); `spalte-loeschen-code.md`
   und dieser Plan erweitern stattdessen die bestehende `Toolbar.tsx` direkt. **Empfehlung:**
   Whichever der drei Featurespläne zuerst tatsächlich umgesetzt wird, legt die Architektur für
   die beiden anderen fest — der `Toolbar.tsx`-Ansatz sollte bevorzugt werden, weil (a) er dem
   expliziten Wortlaut der `tabelle-loeschen`-Anforderung folgt (Abschnitt 3.2 dieses Plans),
   (b) zwei von drei Plänen ihn unabhängig voneinander gewählt haben, (c) er weniger neue
   Infrastruktur (keine zweite Werkzeugleiste, kein neues Sichtbarkeits-/Layout-Verhalten)
   einführt.
2. **`commands.ts` vs. `tableCommands.ts`:** Analog — dieser Plan und `spalte-loeschen-code.md`
   erweitern `commands.ts` direkt, `zeile-loeschen-code.md` verschiebt `insertTable` in ein neues
   Modul. Wird zuerst `zeile-loeschen` umgesetzt und existiert `tableCommands.ts` bereits, gilt
   Abschnitt 3.1 dieses Plans sinngemäß für die dann existierende Datei.
3. **Icon-Dateiname:** `spalte-loeschen-code.md` und dieser Plan verwenden `tableIcons.tsx`;
   `zeile-loeschen-code.md` verwendet `icons.tsx`. Da beide Dateien ausschließlich benannte
   Exporte ohne Namenskollision enthalten würden (`DeleteColumnIcon`/`DeleteTableIcon` vs.
   `RowDeleteIcon`), ist das kein Blocker, aber ein optischer/Wartbarkeits-Makel, falls beide
   Dateien parallel entstehen — sollte im Rahmen der Integration auf **eine** Datei
   konsolidiert werden (Empfehlung: `tableIcons.tsx`, da bereits von zwei der drei Pläne genutzt).
4. **`odt/writer.ts`/`odt/reader.ts` „covered-table-cell"-Fix:** Sowohl `zeile-loeschen-code.md`
   als auch `spalte-loeschen-code.md` planen, denselben Bug in denselben Zeilen zu beheben (siehe
   Abschnitt 6.2 dieses Plans). Wer auch immer zuerst umsetzt, sollte ihn beheben; die beiden
   anderen Pläne (inkl. dieser hier) sollten ihn danach nur noch **verifizieren**, nicht
   erneut patchen. **Zusätzlicher, in keinem der drei Pläne bisher erwähnter Fund:** Der Kommentar
   in `src/formats/docx/__tests__/external-fixtures.test.ts` (Zeile 16) und
   `src/formats/odt/__tests__/external-fixtures.test.ts` (Zeile ~15) verweist auf eine Datei
   `tests/e2e/large-document-import.spec.ts`, die **nicht existiert** — unabhängig von allen drei
   Tabellen-Features zu klären (entweder die Datei nachliefern oder den Kommentar korrigieren),
   aber relevant, weil dieser Plan (Abschnitt 7.6) bewusst **keine** Tests darauf stützt.

Keiner dieser vier Punkte blockiert die Umsetzung **dieses** Features für sich genommen — sie
sind hier dokumentiert, damit die Integration (Lead/PO-Schritt laut Pipeline) sie bewusst
auflösen kann, statt sie erst beim Zusammenführen der drei Branches zu entdecken.

---

## 10. Abnahmekriterien-Abgleich (Definition of Done, Anforderungsdatei Abschnitt 7)

| DoD-Punkt | Abgedeckt durch |
|---|---|
| Jeder Punkt aus Abschnitt 2 über echte Bedienung im Browser nachgewiesen | Abschnitt 7.6 (E2E), ergänzt um Unit-/Integrationstests (Abschnitt 7.1–7.5) für die Fälle, die die Anforderung selbst als „durch konstruierte Testdaten für Reader/Writer" zulässt (Rundreise-Struktur) |
| Jeder Grenzfall aus Abschnitt 3 hat einen dauerhaften Test | Tabelle in Abschnitt 8.2 |
| Rundreise für beide Formate, alle gelisteten Fixture-Dateien | Abschnitt 7.5 (alle ~40 Dateien einzeln), Abschnitt 7.6 Punkt 16 (repräsentative Teilmenge über echten Upload) |
| Jeder Verdachtspunkt aus Abschnitt 5 der Anforderung eindeutig aufgelöst | Abschnitt 1 dieses Plans (Tabelle mit „bestätigt/präzisiert/widerlegt" je Punkt) |
| Kein stiller Fehlschlag | `canDeleteTable`/`disabled`-Button (Abschnitt 3.3/4.1), explizite `NodeSelection`-Fallback-Behandlung in `deleteTable()` (Abschnitt 2.4/4.1) |
| Backlog-Statuswechsel erst nach Erfüllung aller obigen Punkte | Nicht Teil dieses Codeplans — obliegt dem Backlog-Pflegeprozess nach grünen Tests |

---

## 11. Bewusst nicht im Scope

- **Rechtsklick-Kontextmenü** (Abschnitt 3.5) — von der Anforderung selbst als Nice-to-have
  eingestuft.
- **Fußnoten-Verwaltung allgemein** (Abschnitt 5) — eigener, noch nicht umgesetzter
  Funktionsbereich (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11), nicht durch „Tabelle löschen"
  neu geschaffen oder verschärft.
- **`covered-table-cell`-ODT-Fix** (Abschnitt 6.2/9) — bereits von zwei Nachbarplänen geplant,
  hier nur dokumentiert/verifiziert, nicht erneut implementiert.
- **`TableToolbar.tsx`/`tableCommands.ts`-Migration** — falls die Integration
  (Abschnitt 9) sich für die von `zeile-loeschen-code.md` vorgeschlagene Architektur statt für die
  hier gewählte entscheidet, ist eine Nacharbeit an diesem Feature nötig (Button-Bewegung von
  `Toolbar.tsx` nach `TableToolbar.tsx`); das ist eine bewusst spät gehaltene Entscheidung, keine
  Unterlassung dieses Plans.
- **Migration der bestehenden Emoji/Unicode-Buttons in `Toolbar.tsx` auf SVG** — vorbestehende,
  allgemeine Abweichung von Abschnitt 20 der Hauptspezifikation, gehört zu keinem Einzel-Slug.
- **`tests/e2e/large-document-import.spec.ts` nachliefern/Kommentar korrigieren** (Abschnitt 9,
  Punkt 4) — unabhängiger Dokumentationsfehler, nicht Teil dieses Slugs.
