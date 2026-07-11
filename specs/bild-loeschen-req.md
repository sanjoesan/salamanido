# Anforderung: Bild löschen

Status: **vorhanden laut Backlog — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen
die die Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird, bevor
der Status auf „verifiziert" gehoben werden darf. „Nicht vertrauenswürdig" gilt in **beide**
Richtungen: „vorhanden" darf weder ungeprüft als falsch noch ungeprüft als richtig
angenommen werden — jeder Punkt dieser Datei muss einzeln nachgewiesen werden.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 3.3 „Bilder & Grafiken" — Slug `bild-loeschen`,
Titel „Bild löschen", Beschreibung „Entfernt ein markiertes Bild samt Anker ohne
Nebenwirkungen auf den Text.", Status „vorhanden", Priorität 1. Übergeordnete Spezifikation:
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 „Bilder" (Bilder dort als „von der Nutzerin explizit
als nicht funktionsfähig gemeldet — höchste Priorität"; Anforderung „Bild löschen (Markieren
+ Entf) ohne Nebenwirkungen auf umgebenden Text"; Testfall 9 „Bild löschen → Rundreise-Export
enthält es korrekt nicht mehr, keine verwaisten Bilddateien im Zip"). Stil/Methodik
orientieren sich an `FEATURE-SPEC-DOCX-ODT.md` und an den Schwesterdateien
`specs/ausrichtung-links-req.md`, `specs/bild-einfuegen-req.md`, `specs/ausschneiden-req.md`,
`specs/zeile-loeschen-req.md`.

Geltungsbereich: „Bild löschen" ist eine reine Editor-Operation und muss sich zwischen DOCX
und ODT **nicht** unterscheiden — beide teilen denselben ProseMirror-Editor
(`src/formats/shared/schema.ts`, `src/formats/shared/editor/WordEditor.tsx`,
`.../Toolbar.tsx`, `.../commands.ts`). Formatspezifisch sind nur Import/Export
(`src/formats/docx/reader.ts`+`writer.ts`+`imageCollector.ts`,
`src/formats/odt/reader.ts`+`writer.ts`+`imageCollector.ts`) und damit der Rundreise-Nachweis
(Abschnitt 5).

> **Korrektur-/Verifikationshinweis (wichtig — bitte vor dem Weiterarbeiten lesen).**
> Eine frühere Fassung dieser Datei (Erststand des Backlog-Durchlaufs) enthielt mehrere
> ungeprüfte Behauptungen, die sich am **aktuellen** Repo-Stand (`sanjoesan/salamanido`)
> als falsch oder veraltet erwiesen haben. Genau diese Art Einzelpass-Behauptung ist der
> Grund, warum das Feature als „nicht vertrauenswürdig" gilt. Für die vorliegende Fassung
> wurde **jede** Code- und Testreferenz frisch am Quellcode nachgeprüft (Stand 2026-07-05;
> `WordEditor.tsx` = 185 Z., `Toolbar.tsx` = 297 Z., `commands.ts` = 167 Z., `schema.ts` =
> 202 Z.). Konkret korrigiert:
>
> 1. **Veraltete Zeilennummern.** Der `image`-Node steht in `schema.ts` heute bei **Z. 58–85**
>    (nicht „45–72"); `keymap(baseKeymap)` bei `WordEditor.tsx` **Z. 108**, `dropCursor()`
>    **Z. 111**, `gapCursor()` **Z. 112** (nicht „80/83/84"); `reconcileSelectionOnClick`
>    **Z. 43–50** mit `mouseup`-Handler **Z. 146–153** (nicht „42–53"); der Bild-Einfügen-
>    `<label>` in `Toolbar.tsx` **Z. 291–294** (nicht „241–244"). **Verbindlicher Anker ist
>    immer der Symbolname** (Funktion/Konstante/Testtitel); jede zusätzlich genannte
>    Zeilennummer ist eine Momentaufnahme und im Zweifel gegen das Symbol zu prüfen.
> 2. **Falsche Absolutaussage „es gibt keinen einzigen Bild-E2E-Test".** Das ist heute
>    nachweislich unzutreffend. Es existiert bereits erhebliche Bild-Abdeckung (siehe
>    Abschnitt 6.1) — u. a. genau der Zip-Verwaisungs-Test, den die alte Fassung als
>    „nirgends geprüft" bezeichnete (`tests/e2e/cut.spec.ts` → „Rundreise 6 (Bild)"). Die
>    tatsächliche Lücke ist **enger und präziser** (Abschnitt 6.2) und betrifft speziell den
>    **Entf/Rücktaste-Pfad** (nicht den bereits getesteten Ausschneiden-Pfad).
> 3. **Falsches Schema-Detail.** `list_item` ist `content: 'block+'` (`schema.ts` Z. 146–152),
>    **nicht** „paragraph block*". Ein Bild darf damit alleiniger Inhalt eines Listenpunkts
>    sein; das ändert das erwartete Verhalten beim Löschen (Grenzfall 8 in Abschnitt 4 /
>    Risiko R5 — siehe auch die dort neu gefasste, laufzeitverifizierte Erwartung).
> 4. **Neu erkannter, in der alten Fassung übersehener Verdachtsfall (R2).** Der
>    Klick-Reconcile-Handler (`reconcileSelectionOnClick`) könnte die durch einen Bild-Klick
>    erzeugte `NodeSelection` sofort in einen Text-Caret kollabieren — ein konkreter,
>    codegestützter Grund, warum „Bild anklicken + Entf" scheitern könnte. Siehe R2.
> 5. **Falsche Muss-Erwartung bei Grenzfall 8 (Listenpunkt).** Eine Vorfassung schrieb vor, der
>    geleerte Listenpunkt müsse „erhalten bleiben (Auffüllen mit leerem Absatz)". Die real
>    ausgeführte Laufzeit-Sonde (`specs/bild-loeschen-code.md` §2) belegt das **Gegenteil**: der
>    Punkt wird **entfernt** (als vermeintlich Word-/LibreOffice-konform eingeschätzt, valider
>    Zustand). Grenzfall 8, R5 und DoD Punkt 5 wurden entsprechend korrigiert; die
>    Retain-vs-Remove-Frage wurde als offene PO-Entscheidung **OE-1** geführt, nicht als
>    unhaltbare Muss-Anforderung. Verifizierte Fakten schlagen eine ungeprüfte Wunsch-Formulierung
>    — genau die Disziplin, die diese Datei fordert. **Diese Einschätzung wird jedoch in Punkt 6
>    unten präzisiert und die offene Frage dort abschließend entschieden** — der Vergleich mit
>    Word/LibreOffice war zu ungenau (siehe Punkt 6).
> 6. **PO-Entscheidung zu OE-1 (dieser Durchlauf, 2026-07-05).** Punkt 5 ließ die
>    Retain-vs-Remove-Frage bewusst offen, weil die Sonde nur zeigen konnte, *was* der generische
>    `deleteSelection`-Pfad tut, nicht *was* er tun **soll**. Als Product Owner entscheide ich
>    **OE-1 hiermit verbindlich**: **Der Listenpunkt muss erhalten bleiben** — geleert und mit
>    einem leeren Absatz aufgefüllt —, er darf **nicht** entfernt werden, und erst recht darf eine
>    ganze Liste nicht durch das Löschen eines einzigen Bildes verschwinden. Begründung: In Word
>    (OOXML `w:p`) und ODF (`text:p`) ist die Listenzugehörigkeit eine **Absatz-Eigenschaft**
>    (`w:numPr`/Listenstil), kein umschließender Container, der beim Leeren mitentfernt wird —
>    das Löschen eines eingebetteten Bildes entfernt dort **nie** den Absatz selbst, geschweige
>    denn im Extremfall einer einzeiligen Liste die **gesamte Liste**. Genau das tut aber der
>    aktuelle generische ProseMirror-Pfad (`specs/bild-loeschen-code.md` §2: „Ganze Liste
>    kollabiert" bei einem einzelnen Listenpunkt). Eine Bildlöschung, die nebenbei eine ganze
>    Aufzählung zum Verschwinden bringt, ist eine **Nebenwirkung auf den Text** im Sinne der
>    Backlog-Beschreibung „…ohne Nebenwirkungen auf den Text" — genau das, was dieses Feature
>    ausschließen soll. Die frühere Einschätzung „Word-/LibreOffice-konform" aus Punkt 5 wird
>    hiermit **korrigiert**: Sie verglich nur *Gültigkeit* (kein Absturz), nicht *Struktur*
>    (Absatz- vs. Container-Modell) mit den Referenzanwendungen. Grenzfall 8, R5 und DoD Punkt 5
>    sind unten als **verbindliche Muss-Anforderung** gefasst (nicht mehr als offene Frage). Das
>    bedeutet zusätzlichen, gezielten Implementierungsaufwand — einen auf genau diesen Fall
>    beschränkten Custom-Command statt des reinen `deleteSelection`-Wrappers, siehe
>    `specs/bild-loeschen-code.md` §3.2 („falls PO auf ‚leerer Punkt bleibt' besteht") — dieser
>    Mehraufwand ist hiermit als PO-Vorgabe **angeordnet**, nicht mehr optional. Die real
>    ausgeführte Sonde aus Punkt 5 bleibt als **Beleg des aktuellen, noch zu behebenden**
>    Verhaltens gültig; sie ändert nichts an der **Soll**-Anforderung, die von hier an gilt.

---

## 0. Ist-Stand laut frischer Code-Analyse (Referenz für die Verifikation, **kein** Ersatz für echtes Testen)

Code-Vorhandensein wurde in diesem Projekt wiederholt mit „funktioniert" verwechselt — das
ist der Anlass dieser Anforderung. Die folgende Tabelle hält den **verifizierten** Ist-Stand
fest, gegen den die QA die Soll-Anforderung (Abschnitte 1–5) prüft.

| Ebene | Fundstelle (Symbol @ Momentaufnahme) | Befund |
|---|---|---|
| Bild-Knoten | `src/formats/shared/schema.ts` → `nodes.image` (Z. 58–85) | `group: 'block'`; Attribute `src` (Pflicht), `alt` (Default `''`), `width`/`height` (Default `null`); `draggable: true` (Z. 66). **Kein** `selectable: false` — anders als `hard_break` (Z. 45). Damit ist das Bild nach ProseMirror-Standard per Klick als `NodeSelection` selektierbar. Das ist die **einzige** Grundlage für „Markieren" — kein eigener Auswahlmechanismus, keine Ziehpunkte. |
| Lösch-Befehl | `src/formats/shared/editor/commands.ts` | Es existiert **nur** `insertImage(src, alt='')` (Z. 66–74, `replaceSelectionWith(image)`). **Kein** `deleteImage`, keine bildspezifische Löschlogik. |
| Entf/Rücktaste-Quelle | `WordEditor.tsx` → eigenes `keymap({…})` (Z. 85–107) **und** `keymap(baseKeymap)` (Z. 108) | Das eigene Keymap bindet Delete/Backspace **nicht** (nur `Mod-z/y`, `Mod-Shift-z`, `Enter`→`splitListItem`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete`→`cutSelection`). Löschen läuft **ausschließlich** über `baseKeymap` (prosemirror-commands): „Delete" = `chainCommands(deleteSelection, joinForward, selectNodeForward)`, „Backspace" = `chainCommands(deleteSelection, joinBackward, selectNodeBackward)`. `deleteSelection` ist generisch (entfernt jede nicht-leere Selektion) — **keine** eigene, getestete Bild-Funktion. |
| Klick-Selektions-Reconcile | `WordEditor.tsx` → `reconcileSelectionOnClick` (Z. 43–50) + `onMouseUp` (Z. 146–153), Schwelle `CLICK_DRAG_THRESHOLD_PX = 3` (Z. 141) | Bei jedem „Plain-Click" (Maus < 3 px bewegt) wird die Selektion auf `TextSelection.near(posAtCoords)` gesetzt, falls sie sich von der aktuellen unterscheidet. Eine Bild-`NodeSelection` ist **nicht-leer** und **ungleich** einer Text-Selektion → dieser Handler könnte die per Klick gesetzte Bild-NodeSelection sofort überschreiben (Risiko R2). |
| Cursor-Randfälle | `WordEditor.tsx` → `gapCursor()` (Z. 112), `dropCursor()` (Z. 111) | Relevant für Bild am Dokumentanfang/-ende und für Drag-Verhalten (Grenzfälle 4.3/4.4/4.13). |
| Transaktion/Undo | `WordEditor.tsx` → `dispatchTransaction` (Z. 125–132) | Feuert `onChange` bei `tr.docChanged`; ein einzelnes Löschen ist **eine** Transaktion ⇒ **ein** `onChange` ⇒ **ein** Undo-Schritt (günstiger als `setAlign`, das je Absatz eine eigene Transaktion dispatcht). |
| Einfüge-Bedienelement | `Toolbar.tsx` → `handleImagePick` (Z. 124–135) + `<label>🖼 Bild <input type=file accept="image/*">` (Z. 291–294) | Einziges bildbezogenes UI-Element ist der **Einfügen**-Weg; Alt-Text = `file.name` (Z. 134). **Kein** „Bild löschen"-Button, **keine** kontextabhängige Bild-Werkzeugleiste, keine Alt-Text-/Größen-Nachbearbeitung. `event.target.value=''` (Z. 126) erlaubt Wiederauswahl derselben Datei. `insertImage`s `replaceSelectionWith` hinterlässt eine `NodeSelection` **auf** dem frisch eingefügten Bild. |
| Toolbar-Icon | `Toolbar.tsx` (Z. 292) | `🖼` ist ein **Emoji** (ebenso `🖍` Z. 212, `⌫`, `⇤↔⇥≡`, `•/1./⇧`, `⊞`). Nur der Ausschneiden-Button nutzt bereits ein echtes Inline-SVG (`ScissorsIcon`, Z. 33–53). Der barrierefreie Name des Bild-Controls ist der **Text „Bild"** im Label — deshalb finden ihn die Tests via `label:has-text("Bild")` auch dann, wenn das Emoji als Tofu rendert. Icon-Rendering-Risiko gemäß `FEATURE-SPEC-DOCX-ODT.md` §17/§20 (Risiko R9). |
| Sichtbares Auswahl-Feedback | `src/index.css` (Z. 39–42: `.ProseMirror img{max-width:100%;height:auto}`); Volltextsuche in `src/` | `prosemirror-view` setzt bei einer Node-Selektion die Klasse `.ProseMirror-selectednode`, liefert das zugehörige Styling (`outline`) aber nur über ein **separat einzubindendes** Stylesheet. Eine Volltextsuche über `src/` nach `ProseMirror-selectednode` / `prosemirror-view/style` / `prosemirror.css` liefert **null Treffer**; `main.tsx` importiert nur `./index.css`. **Konsequenz: Ein selektiertes Bild hat aktuell keinerlei sichtbaren Rahmen/Outline** (Klasse im DOM, aber keine CSS-Regel). Wahrscheinliche Mitursache der Meldung „Bild löschen funktioniert nicht": Von außen nicht erkennbar, ob ein Klick das Bild überhaupt markiert hat (Risiko R1). |
| Export-Bildsammlung (DOCX) | `src/formats/docx/writer.ts` → `blockToDocx` `case 'image'`→`imageParagraphXml` (Z. 74–77, `images.add(src)`), `blocksToDocx` (Z. 203), `writeDocx` (`new ImageCollector()` Z. 253, Baum-Walk Z. 256/265/270, `[Content_Types].xml` aus `images.all()` Z. 290, Media nur bei `images.all().length` Z. 300) | Der Export **baut die Bildliste bei jedem Aufruf frisch aus dem aktuellen Dokumentbaum** auf. Ein gelöschtes Bild wird nicht mehr besucht ⇒ landet **konstruktiv** nicht in `word/media/`, `[Content_Types].xml` oder `document.xml.rels`. „Keine verwaisten Bilder" ist damit architektonisch abgesichert — der Nachweis für den **Entf-Pfad** fehlt aber noch (bisher nur Ausschneiden-Pfad geprüft, s. u.). |
| Export-Bildsammlung (ODT) | `src/formats/odt/writer.ts` → `blockToOdt` `case 'image'` (Z. 176–182, `images.add(src)`), `blocksToOdt` (Z. 197), `writeOdt` (`ImageCollector` Z. 262, Walk Z. 266/271/272, `buildManifestXml(images.all())` Z. 277, Dateien Z. 285–286) | Analog zu DOCX. Bild wird beim Export als eigener `<text:p>` mit `<draw:frame … text:anchor-type="as-char"><draw:image …/>` geschrieben (Z. 182) — beim ODT-Export ist der „Anker" also ein As-Char-Anker im eigenen Absatz. |
| Bild-Sammler / Dedupe | `src/formats/{docx,odt}/imageCollector.ts` → `ImageCollector.add` (Z. 15–28) | Dedupe über `fileNameByDataUrl` (Map, Schlüssel = vollständige `data:`-URL): identische Bilder ⇒ **eine** Zieldatei, beide Knoten referenzieren sie. `add` **wirft** bei nicht-`data:`-Quelle: `'Bilder müssen als data-URL vorliegen, um eingebettet zu werden.'` — relevant für verknüpfte/externe Bildquellen (Risiko R10). |
| Reader / Blockmodell | `src/formats/docx/__tests__/roundtrip.test.ts` (Z. 307–330, 537–548), `.../odt/__tests__/roundtrip.test.ts` (Z. 341 ff.) | Bild wird als eigenständiger **Block** importiert; „splits a paragraph containing both text and an image into separate blocks" (docx Z. 317) und „keeps the image isolated … `['paragraph','image','paragraph']`" (docx Z. 537–548) belegen: Nachbarabsätze bleiben getrennt erhalten. Negativfall „externe Bild-URL wirft lesbaren Fehler statt stillem Verlust" (docx Z. 222–224, odt Z. 212–214). |

**Konsequenz für die Bewertung:** Der Backlog-Status „vorhanden" stützt sich ausschließlich
auf generisches ProseMirror-Bibliotheksverhalten (`NodeSelection` + `baseKeymap`s
`deleteSelection`) **ohne** eigene Implementierung, **ohne** sichtbares Auswahl-Feedback
(fehlendes CSS, R1) und **ohne** einen einzigen Test, der Entf/Rücktaste auf einer
Bild-Selektion drückt (getestet ist bisher nur der **Ausschneiden**-Pfad). Diese Datei legt
fest, was nachgewiesen — und ggf. nachgebessert — werden muss, damit „vorhanden" zu Recht
bestehen bleibt.

---

## 1. Ziel und Besonderheit dieses Features

Nutzer:innen können ein markiertes Bild vollständig entfernen — „samt Anker" und **ohne**
Nebenwirkung auf den umgebenden Text — konsistent im Editor sowie in DOCX- und ODT-Export,
und ein anschließender Export/Reimport enthält weder das Bild noch eine verwaiste Bilddatei.

**Das Besondere an genau diesem Feature (Kern der Verifikationsschwierigkeit):**

- „Bild löschen" ist im Code **keine benannte Funktion**, sondern ein Nebenprodukt zweier
  generischer Bibliotheks-Mechanismen (`NodeSelection` per Klick, `deleteSelection` aus
  `baseKeymap`). Ein grüner Test muss deshalb **die Bedienung** nachweisen (Markieren + Entf
  über die echte UI), nicht nur, dass ein konstruierter Doc-Baum ohne Bild exportierbar ist.
- Der der Backlog-Beschreibung zugrunde liegende erste Schritt — **„Markieren"** — ist aktuell
  optisch **nicht nachweisbar** (kein `.ProseMirror-selectednode`-Styling, R1). Solange nicht
  sichtbar ist, ob ein Klick das Bild selektiert hat, ist „Markieren + Entf" als Bedienweg
  faktisch nicht belegbar, selbst wenn die interne Selektion korrekt sitzt.
- Es besteht ein **konkreter, codegestützter Verdacht**, dass der Klick-Reconcile-Handler die
  per Klick erzeugte Bild-`NodeSelection` sofort in einen Text-Caret kollabiert (R2) — was
  „anklicken, dann Entf" unbemerkt brechen könnte. Dieser Punkt ist **nicht** unterstellt,
  sondern gezielt zu verifizieren; er steht in Spannung zu einem bestehenden Test, der
  „Bild anklicken + Strg+X" erfolgreich durchführt (Abschnitt 6.1).
- Vorhandene Bild-Tests decken den **Ausschneiden**-Pfad (`execCommand('cut')`) ab, **nicht**
  den **Löschen**-Pfad (`deleteSelection`). Beide entfernen zwar einen Node, sind aber
  unterschiedliche Codepfade; die Backlog-Beschreibung nennt ausdrücklich „Markieren + Entf".

Explizit **nicht** Gegenstand dieser Datei (eigene Backlog-Einträge): `bild-einfuegen`
(Status „vorhanden"), `bild-groesse-aendern` (Status „fehlt"), `bild-alt-text` (Status
„teilweise"). Löschen muss unabhängig davon funktionieren, ob `width`/`height` gesetzt sind
oder der Alt-Text nachträglich geändert wurde.

---

## 2. Menüpunkte / Bedienelemente

Referenzverhalten realer Textverarbeitungen: Word — Bild anklicken → Rahmen mit Ziehpunkten →
Entf; LibreOffice Writer — identisch, zusätzlich Rechtsklick → „Löschen". Jeder unterstützte
Zugriffsweg muss **einzeln** funktionieren und **einzeln** getestet werden; jeder nicht
unterstützte Weg muss **bewusst dokumentiert** werden (kein unklarer Zwischenzustand).

| # | Zugriffsweg | Ist-Zustand (verifiziert) | Soll |
|---|---|---|---|
| 1 | Bild per **Klick** markieren, dann **Entf/Rücktaste** | Markierung technisch via `NodeSelection` möglich, **aber ohne sichtbares Feedback** (R1) **und** durch `reconcileSelectionOnClick` möglicherweise sofort in einen Text-Caret kollabiert (R2). Löschen selbst nur über `baseKeymap` (`deleteSelection`). | Muss durchgängig **und sichtbar** funktionieren: Klick auf ein Bild zeigt einen erkennbaren Auswahlrahmen; danach entfernt Entf/Rücktaste das Bild vollständig samt Anker, ohne Nebenwirkung auf Text davor/danach. R1 und R2 sind Vorbedingungen. |
| 2 | Bild per **Tastatur** markieren (`selectNodeBackward`/`-Forward`), dann Entf | Funktioniert: von der Textposition unmittelbar nach dem Bild wählt `ArrowLeft` (= `selectNodeBackward` aus `baseKeymap`) das Bild als `NodeSelection` — genau der Weg, den `clipboard.spec.ts` bewusst nutzt, weil der Klick auf ein ungrößtes Testbild unzuverlässig ist. | Als vollwertiger, barrierefreier Weg bestätigen und testen (auch weil er den R2-Verdacht umgeht). |
| 3 | Kontextabhängiger **Toolbar-Button „Bild löschen"** (nur bei Bild-Selektion sichtbar) | **fehlt komplett** — nur der Einfügen-`<label>` „🖼 Bild" existiert. | Ergänzen **oder** bewusst als „nicht unterstützt, Entf/Rücktaste genügt" dokumentieren. Für Touch (Weg 7) ist ein solcher Button faktisch der einzige verlässliche Lösch-Weg ohne physische Entf-Taste. |
| 4 | **Rechtsklick-Kontextmenü** → „Löschen" | Kein eigenes, dokumentbewusstes Kontextmenü (bewusst kein `contextmenu`-`preventDefault`, siehe `WordEditor.tsx`-Kommentar Z. 117–121); es erscheint nur das native Browser-Menü ohne Dokumentbezug zum Löschen. | Verifizieren bzw. bewusst entscheiden: eigenes bildbewusstes Kontextmenü bauen **oder** explizit als „nicht unterstützt" dokumentieren. |
| 5 | **`Mod-Backspace`** (Strg/Cmd+Rücktaste) auf selektiertem Bild | Ungeprüft — `baseKeymap` bindet auch `Mod-Backspace` generisch. | Verifizieren, dass es bei einer Bild-`NodeSelection` identisch zu Backspace wirkt (Bild löschen) und keinen ungewollten Nebeneffekt hat. |
| 6 | **Ausschneiden** (Strg+X / `Shift-Delete` / Toolbar-Schere) | Vorhanden und **getestet** (`cut.spec.ts` Testfall 8 & Rundreise 6). Entfernt das Bild ebenfalls, legt es aber zusätzlich in die Zwischenablage. | Kein Ersatz für „Bild löschen": anderer Codepfad (`execCommand('cut')` statt `deleteSelection`). Als benachbarter, bereits abgedeckter Fall referenzieren, nicht als Erfüllung von „Bild löschen" werten. |
| 7 | **Mobile/Touch** (Pixel 7, iPad Mini laut `playwright.config.ts`): Bild antippen, dann löschen | Nicht verifizierbar, solange R1 (unsichtbare Selektion) besteht; ohne physische Entf-Taste ist unklar, über welchen Weg gelöscht wird. | Mindestens **ein** funktionierender Weg muss auf beiden Touch-Projekten existieren (bevorzugt Weg 3, ein Touch-erreichbarer Button, unabhängig von einer physischen Entf-Taste). |
| 8 | **Bestätigungsdialog** vor dem Löschen | Nicht vorhanden. | **Kein** Soll-Element — Referenzverhalten löscht sofort, Undo (Strg+Z) ist das Sicherheitsnetz. Explizit dokumentieren, damit keine „fehlende Sicherheitsabfrage" nachgerüstet wird. |
| 9 | **Drag** des Bildes (`draggable:true` + `dropCursor`) | Ungeprüft. Kein vorgesehener Lösch-Weg. | Verifizieren, dass ein **abgebrochener** Drag (Drop außerhalb gültiger Ziele, Esc) das Bild **nicht** löscht (Grenzfall 4.13). |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Selektierbarkeit
- Ein Klick direkt auf das Bild erzeugt eine `NodeSelection` auf genau diesem `image`-Node
  (kein Text davor/danach wird mitselektiert).
- **Zu verifizieren (R2):** Bleibt diese `NodeSelection` nach dem `mouseup`-Reconcile
  erhalten, oder wird sie durch `reconcileSelectionOnClick` in einen benachbarten Text-Caret
  kollabiert? Falls Letzteres, ist entweder der Reconcile-Handler für Node-Selektionen
  auszunehmen oder ein anderer verlässlicher Markier-Weg (Weg 2/3) verbindlich zu machen.
- Der Tastaturweg (`Home` an den Anfang des Folgeabsatzes, dann `ArrowLeft` =
  `selectNodeBackward`) muss ein Bild verlässlich als `NodeSelection` auswählen können —
  auch als Barrierefreiheits-Anforderung (Tastatur-only).

### 3.2 Sichtbares Feedback bei Selektion (Pflicht-Vorbedingung, R1)
- Ein selektiertes Bild muss optisch erkennbar sein (Rahmen/Outline). Umsetzung: entweder
  `prosemirror-view/style/prosemirror.css` einbinden oder eine eigene Regel für
  `.ProseMirror-selectednode` in `src/index.css` ergänzen.
- Ohne diesen Nachweis gilt „Markieren" aus der Backlog-Beschreibung als **nicht erfüllt**,
  selbst wenn das anschließende Löschen technisch klappt.
- Nach dem Löschen darf **keine** Geister-Markierung an einem Nachbar-Element zurückbleiben.

### 3.3 Was genau entfernt wird („samt Anker")
- Das **gesamte** `image`-Element (Node samt `src`/`alt`/`width`/`height`) wird entfernt. Da
  Bilder im Schema als eigenständiger **Block**-Node modelliert sind (nicht als inline im
  Absatz verankertes Objekt), ist der „Anker" mit dem Node identisch; es bleibt **kein**
  Rest-Element und **keine** verwaiste Referenz zurück.
- Text unmittelbar vor und nach dem Bild bleibt **exakt** erhalten. Weil `image` ein reiner
  Block-Node ist, entfernt das Löschen nie Zeichen aus einem Nachbarabsatz, und die Absätze
  davor/danach bleiben **getrennte** Absätze (werden **nicht** verschmolzen) — belegt durch
  das Blockmodell (`roundtrip.test.ts` Z. 537–548: `['paragraph','image','paragraph']`).

### 3.4 Cursor-/Fokuszustand nach dem Löschen
- Nach dem Löschen steht der Cursor als kollabierte `TextSelection` in unmittelbarer Nähe der
  alten Bildposition (bevorzugt am Anfang des Folgeblocks, ersatzweise am Ende des
  Vorgängerblocks) — bei Bild am Dokumentanfang/-ende ist `gapCursor` (Z. 112) zu
  berücksichtigen.
- Der Editor bleibt fokussiert und sofort weiter bedienbar (Tippen ohne weiteren Klick),
  konsistent mit `FEATURE-SPEC-DOCX-ODT.md` §1.3 und §7.

### 3.5 Undo/Redo
- „Bild löschen" ist **eine** Transaktion (`dispatchTransaction`, Z. 125–132) ⇒ **ein**
  Undo-Schritt. Strg+Z stellt das Bild mit **exakt** denselben Attributen (`src`, `alt`,
  `width`, `height`) an der ursprünglichen Position wieder her — keine Neucodierung der
  `data:`-URL, kein Qualitätsverlust. Redo entfernt es erneut identisch.
- Das Löschen darf sich in der History **nicht** mit einer unmittelbar vorausgehenden,
  unabhängigen Aktion (z. B. Tippen direkt vor dem Bild) zu **einem** Undo-Schritt
  verschmelzen. Hinweis: `prosemirror-history` gruppiert zeitnahe Transaktionen
  (`newGroupDelay` ~500 ms) — Tests müssen wie in `cut.spec.ts` Testfall 9 eine kurze
  Settle-Pause einplanen, damit die Undo-Granularität real geprüft wird und nicht durch
  Automations-Timing verfälscht ist.

### 3.6 Interaktion mit dem bekannten Selection-Sync-Bug (R4)
- `FEATURE-SPEC-DOCX-ODT.md` §2/§20 beschreibt den Fehler „veraltete Selektion nach
  Toolbar-Aktion + Neupositionierungsklick". Der Fix ist `reconcileSelectionOnClick`
  (Z. 43–50). Eine Bild-`NodeSelection` ist eine **nicht-leere** Selektion und damit ein
  direkter Anwendungsfall dieser Logik — Bild-Selektion ist ein **zusätzlicher Verdachtsfall**.
- Pflicht-Testsequenz: Text vor/nach einem Bild eingeben → Bild markieren → an anderer Stelle
  im Text klicken (Neupositionierung) → Enter → weiter tippen → Dokument bleibt konsistent,
  Text vor/nach dem Bild vollständig erhalten. `tests/e2e/selection-regression.spec.ts` nutzt
  bisher **nur „Fett"** als Auslöser — die Bild-Variante fehlt und ist zu ergänzen.

### 3.7 Kein stiller Fehlschlag / keine verwaisten Ressourcen
- Entf/Rücktaste **ohne** Bild-Selektion (Cursor im normalen Fließtext) folgt dem normalen
  Text-Löschverhalten — es darf **nicht** versehentlich ein Bild oder Nachbartext gelöscht
  werden, keine Konsolen-Exception.
- Nach Löschen + Export darf im DOCX-/ODT-Zip **keine** verwaiste Bilddatei zurückbleiben
  (architektonisch durch den frischen `ImageCollector`-Walk abgesichert; für den **Entf-Pfad**
  und für **ODT** praktisch nachzuweisen, s. Abschnitt 5).
- Kein Teilzustand: entweder vollständiger Erfolg oder unveränderter Ausgangszustand plus
  sichtbarer Hinweis (`FEATURE-SPEC-DOCX-ODT.md` §20 Punkt 4).

---

## 4. Grenzfälle

1. **Text unmittelbar vor und nach dem Bild** → beide Textteile bleiben exakt erhalten
   (Kern-Risiko aus `FEATURE-SPEC-DOCX-ODT.md` §7).
2. **Bild ist das einzige Element im Dokument:** `doc` ist `content: 'block+'` (`schema.ts`
   Z. 14) ⇒ nach dem Löschen muss **mindestens ein** leerer, gültiger Absatz übrig bleiben,
   Editor weiter bedienbar. Verifizieren, dass `deleteSelection` diesen Auffüll-Fall korrekt
   erzeugt und keinen invaliden Doc-Zustand hinterlässt.
3. **Bild direkt am Dokumentanfang** → `gapCursor` bleibt konsistent; Cursor landet in einem
   gültigen Block am Anfang.
4. **Bild direkt am Dokumentende** → analog am Ende.
5. **Mehrere Bilder, mittleres löschen** → nur das markierte verschwindet; die übrigen bleiben
   an ihrer Position und unterscheidbar (`FEATURE-SPEC-DOCX-ODT.md` §7 Testfall 6).
6. **Zwei Bilder mit identischer `data:`-URL, eines löschen:** Der `ImageCollector` dedupt beim
   Export beide auf **eine** Zieldatei (`fileNameByDataUrl`). Nach dem Löschen des einen muss
   das verbleibende Bild nach Export/Reimport weiterhin korrekt referenziert sein — die
   Zieldatei darf **nicht** fälschlich mitentfernt werden.
7. **Bild in einer Tabellenzelle löschen:** `cellContent: 'block+'` (`schema.ts` Z. 154) ⇒ nur
   das Bild verschwindet, die Zelle bleibt gültig (mind. leerer Absatz), Tabellenstruktur
   (Zeilen/Spalten, `colspan`/`rowspan`) unverändert.
8. **Bild als alleiniger Inhalt eines Listenpunkts löschen:** `list_item` ist `block+`
   (`schema.ts` Z. 146–152, bewusst — Fixtures `imageWithinList.odt`) ⇒ das Bild **darf**
   alleiniger Inhalt sein.
   **Verbindliche Anforderung (Gültigkeit):** Der Dokumentzustand bleibt nach dem Löschen gültig
   — es entsteht **niemals** ein invalider `list_item` (0 Blöcke).
   **Verbindliche Anforderung (Verhalten) — entschieden, ehemals offene Frage OE-1 (siehe
   Korrekturhinweis Punkt 6):** Der Listenpunkt **bleibt erhalten** — er wird mit einem leeren
   Absatz aufgefüllt, **nicht entfernt**; erst recht darf eine mehrstufige oder einzeilige Liste
   **nicht** durch das Löschen eines Bildes vollständig verschwinden bzw. zu einem
   Top-Level-Absatz kollabieren. Die Nummerierung der übrigen Punkte bleibt konsistent, kein
   Nachbartext geht verloren.
   Der **aktuelle** generische `deleteSelection`-Pfad (`baseKeymap`) erfüllt das **nicht**: Eine
   real ausgeführte Laufzeit-Sonde gegen den echten `wordSchema` (dokumentiert in
   `specs/bild-loeschen-code.md` §2, Grenzfall 8) zeigt, dass der Punkt stattdessen **komplett
   entfernt** wird (mehrgliedrige Liste schrumpft um ein Item; einzelnes Item ⇒ die ganze Liste
   kollabiert zu einem leeren Top-Level-Absatz). Das ist ein **valider**, aber **nicht
   akzeptierter** Zustand: Das Verschwinden einer ganzen Liste als Nebeneffekt einer
   Bildlöschung zählt als Nebenwirkung auf den Text im Sinne der Backlog-Beschreibung und ist
   daher **abzustellen**, nicht hinzunehmen (Begründung siehe Korrekturhinweis Punkt 6).
   Konsequenz für die Umsetzung: Der reine `deleteSelection`-Wrapper genügt für diesen einen Fall
   **nicht**; ein auf „Bild ist einziges Kind eines `list_item`" beschränkter Custom-Command (der
   dort statt `deleteSelection` ein Auffüllen mit leerem Absatz auslöst) ist erforderlich — siehe
   `specs/bild-loeschen-code.md` §3.2, dort als „falls PO auf ‚leerer Punkt bleibt' besteht"
   beschrieben. Der zugehörige Test muss das **geforderte** Verhalten prüfen (Punkt bleibt,
   aufgefüllt) — nicht das aktuelle abweichende Verhalten als Sollzustand einfrieren.
9. **Verschachtelte Tabelle, Bild in innerer Zelle** → Löschen stürzt nicht ab, äußere/innere
   Struktur bleiben konsistent (`FEATURE-SPEC-DOCX-ODT.md` §6 Testfall 8; Fixtures
   `subtables.odt`, `nested.odt`).
10. **Sehr großes Bild** (mehrere MB `data:`-URL) löschen → UI bleibt reaktionsfähig, kein
    Einfrieren (benachbarter Nachweis: `clipboard.spec.ts` Grenzfall 7 kopiert bereits ein
    großes eingebettetes Bild ohne UI-Freeze).
11. **Löschen, dann sofort Undo** → Bild mit identischen Attributen an ursprünglicher Position
    wieder da. **Undo, dann Redo** → erneut identisch entfernt.
12. **Bild unmittelbar nach dem Einfügen löschen** (Selektion stammt noch aus `insertImage`s
    `replaceSelectionWith`, also bereits eine `NodeSelection` auf dem Bild — ohne
    zwischenzeitlichen Klick) → funktioniert identisch; **kein** R2-Reconcile involviert (dies
    ist der „saubere" Löschweg und ein guter Kontrast zum Klick-Weg).
13. **Abgebrochener Drag** (Bild anfassen, Drop außerhalb gültiger Ziele oder Esc) → Bild
    bleibt unverändert; ein abgebrochener Drag darf **nicht** als Löschung enden.
14. **Entf/Rücktaste ohne Bild-Selektion** (Cursor im Fließtext) → normales Textlöschen, kein
    Bild betroffen, keine Exception.
15. **Bild löschen, danach neues Bild an gleicher Stelle einfügen** → neues Bild ersetzt die
    Position sauber, keine Vermischung mit Attributen/Alt-Text des gelöschten Bildes.
16. **Verknüpftes/externes Bild** (nicht `data:`, z. B. aus `odt-images-linked.odt`): Der
    Reader/Export wirft bei nicht-`data:`-Quelle (`imageCollector.add`); **Löschen** eines
    solchen Bildes muss dennoch trivial funktionieren (der Node wird entfernt) und darf den
    Fehlerpfad nicht auslösen. Verifizieren, wie solche Bilder überhaupt importiert werden
    (inline gemacht vs. externer href) und dass das Löschen sie sauber entfernt.
17. **Reale komplexe Fremddatei mit mehreren, unterschiedlich großen Bildern** importieren
    (`VariousPictures.docx`, `images.odt`, `odf-test-images.odt`), eines löschen → genau das
    erwartete Bild verschwindet, alle anderen bleiben unverzerrt sichtbar.
18. **Bild in Kopf-/Fußzeile** (Writer sammelt auch Header/Footer-Bilder, `writeDocx` Z. 265/270,
    `writeOdt` Z. 271/272; Fixture `headerPic.docx`): sofern eine Kopf-/Fußzeilen-Bearbeitung
    existiert bzw. importiert wurde — Löschen eines Bildes dort betrifft nur die Kopf-/Fußzeile,
    nicht den Haupttext. (Kopf-/Fußzeilen-UI ist laut `FEATURE-SPEC` §9 noch nicht vollständig;
    ggf. als „nur Import-Fall" dokumentieren.)
19. **Mobile/Touch** (Pixel 7, iPad Mini) → mindestens ein funktionierender Markier-+Lösch-Weg
    nachweisbar, unabhängig von einer physischen Entf-Taste.
20. **Track-Changes-Abhängigkeit (Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` §13), muss „Bild löschen" bei
    aktiver Aufzeichnung als **Löschung markiert** werden statt sofort endgültig zu entfernen.
    Für den aktuellen Auftrag **nicht** im Scope, aber als bekannte künftige Abhängigkeit
    dokumentiert.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

### 5.1 Baseline (Voraussetzung für Aussagekraft)
Datei mit mindestens einem eingebetteten Bild **unverändert** hochladen → ohne Änderung
exportieren → reimportieren → Bild an gleicher Position, identische Bilddaten, kein
Qualitätsverlust. Teil-Abdeckung besteht bereits: Unit-Rundreise mit konstruiertem Bildknoten
(`docx/__tests__/roundtrip.test.ts` „DOCX round trip: images" Z. 307 ff.; ODT-Äquivalent
Z. 341 ff.) und E2E-Fidelity über echte Datei-Uploads mit eingebettetem Bild
(`tests/e2e/roundtrip-fidelity.spec.ts` auf Basis von `tests/e2e/fixtures/richDocument.ts` /
`fullCoverageDocument.ts`, die für **beide** Formate ein echtes Bild einbetten). Diese Baseline
muss grün sein, damit ein späterer Rundreise-Fehler eindeutig dem **Löschen** zugeordnet
werden kann und nicht mit einem allgemeinen Bild-Reader/Writer-Fehler verwechselt wird.

### 5.2 „Bild löschen"-spezifische Rundreise — Testfälle
1. **DOCX**, ein Bild importieren → im Editor löschen (**Entf/Rücktaste**, nicht Ausschneiden)
   → als DOCX exportieren → reimportieren → Bild fehlt vollständig, umgebender Text unverändert
   und vollständig; `[Content_Types].xml` enthält keinen überflüssigen Bild-`Default` mehr
   (sofern es das einzige Bild war), `word/_rels/document.xml.rels` keine verwaiste
   `Relationship`, `word/media/` keine verwaiste Datei.
2. **ODT**, dieselbe Sequenz → `META-INF/manifest.xml` enthält keinen Eintrag mehr für die
   gelöschte Datei im `Pictures/`-Ordner, keine verwaiste Datei im Zip. **Dieser ODT-Fall
   fehlt bislang** (der vorhandene Zip-Verwaisungs-Test `cut.spec.ts` Rundreise 6 prüft nur
   **DOCX** und nur den **Ausschneiden**-Pfad — beides ist zu ergänzen).
3. **Mehrere Bilder, nur eines löschen** → Export → Reimport → genau das erwartete Bild fehlt,
   alle anderen bleiben korrekt zugeordnet (kein Verwechslungs-/Verlustrisiko; Grenzfälle 5/6).
4. **Bild in Tabellenzelle löschen** → Export → Reimport → Zelle gültig, Tabellenstruktur
   (inkl. `colspan`/`rowspan`) konsistent.
5. **Löschen, dann Undo, dann Export** (Bild via Undo wiederhergestellt) → Reimport → Bild ist
   weiterhin vorhanden (bestätigt, dass Undo den **Export**-Zustand beeinflusst, nicht nur die
   Anzeige).
6. **Alle Bilder nacheinander löschen** → Export → Reimport → keinerlei Bild-Referenzen mehr,
   restlicher Text vollständig, Datei valide (kein kaputter Media-/`Pictures`-Verweis).
7. **Cross-Format:** ODT mit Bild importieren → Bild löschen → als DOCX exportieren →
   reimportieren → Bild bleibt korrekt entfernt (kein Wiederauftauchen durch die Konvertierung).
   Hinweis: Ein Cross-Format-**Export** über die UI existiert derzeit nicht (der einzige
   „Exportieren"-Button exportiert im Ursprungsformat, siehe `cut.spec.ts`-Kommentar
   Z. 575–584) — der Cross-Format-Nachweis ist daher ggf. auf Unit-/Adapter-Ebene zu führen
   oder als offener Punkt zu markieren, nicht stillschweigend als UI-Test zu behaupten.
8. **Cross-Format umgekehrt** (DOCX → löschen → ODT), unter demselben Vorbehalt wie 7.
9. **Doppelte Rundreise** (Format hin/zurück) an einem Dokument, in dem zuvor ein Bild gelöscht
   wurde → keine „Wiederauferstehung" aus einem zwischenzeitlich unbereinigten Zustand.
10. **Reale Fremddatei** (`VariousPictures.docx` bzw. `images.odt`/`odf-test-images.odt`), ein
    mittleres Bild löschen → Export → Reimport → genau das erwartete Bild fehlt, alle anderen
    bleiben sichtbar und unverzerrt.

---

## 6. Testabdeckung: Ist-Stand (präzise) und geforderter Nachweis

### 6.1 Was bereits existiert (und die alte Fassung fälschlich als „fehlend" bezeichnete)
- **E2E — Bild anklicken und entfernen (via Ausschneiden):** `tests/e2e/cut.spec.ts`
  „Testfall 8: Bild anklicken und mit Strg+X ausschneiden entfernt es, umgebender Text bleibt"
  (Z. 211) — fügt ein Bild über den echten `label:has-text("Bild")`-Dateiinput ein,
  **klickt** das `img`, drückt `ControlOrMeta+x`, erwartet `img`-Count 0 **und** „Text davor."
  bleibt. (Dieser Test klickt das Bild und entfernt es erfolgreich — direkt relevant für R2.)
- **E2E — Zip-Verwaisung nach Entfernen:** `cut.spec.ts` „Rundreise 6 (Bild): … DOCX-Export
  enthält keine word/media-Datei mehr" (Z. 552) — genau der Nachweis „keine verwaisten
  Bilddateien im Zip", den die alte Fassung als „nirgends geprüft" bezeichnete. **Aber:** nur
  **DOCX** und nur der **Ausschneiden**-Pfad.
- **E2E — Bild-Selektionsmechanik:** `tests/e2e/clipboard.spec.ts` „Grenzfall 6" (Z. 266)
  dokumentiert, dass `insertImage`s `replaceSelectionWith` eine `NodeSelection` **auf** dem
  Bild hinterlässt und dass `ArrowLeft` (= `selectNodeBackward`) „die exakt gleiche Art
  Selektion erzeugt, die ein echter Klick auf das Bild erzeugt hätte" — **und** dass ein
  koordinatenbasierter **Klick** auf ein ungrößtes Testbild „unzuverlässig" ist. „Grenzfall 7"
  (Z. 573) belegt, dass ein großes eingebettetes Bild die UI nicht einfriert.
- **E2E — echter Bild-Einfügen-Flow:** `tests/e2e/export-error-handling.spec.ts` (Z. 33–78)
  fügt ein Bild über das sichtbare „🖼 Bild"-Control ein und belegt, dass die Einbettung eine
  `data:`-URL nutzt (kein `createObjectURL`).
- **E2E — Rundreise mit Bild:** `tests/e2e/docx.spec.ts` „round trip: full §5.2 minimum
  coverage — … image, umlauts …" (Z. 253) und `roundtrip-fidelity.spec.ts` (über die
  Bild-Fixtures) reisen ein Bild rund.
- **Unit — Bild-Rundreise + Negativfall:** `docx/__tests__/roundtrip.test.ts` (Z. 307–330,
  537–548) und ODT-Äquivalent (Z. 341 ff.) prüfen Erhalt eines konstruierten Bildknotens sowie
  „externe Bild-URL wirft lesbaren Fehler" (docx Z. 222–224, odt Z. 212–214). Zusätzlich
  existieren `cut-roundtrip.test.ts` (beide Formate) und `external-fixtures.test.ts`.

### 6.2 Die tatsächliche Lücke (was fehlt)
- **Kein Test drückt Entf/Rücktaste (`deleteSelection`) auf einer Bild-Selektion.** Getestet
  ist nur der **Ausschneiden**-Pfad (`execCommand('cut')`) — ein anderer Codepfad. Die
  Backlog-Beschreibung nennt aber „Markieren + **Entf**".
- **Kein Test deckt R1 auf** (fehlendes `.ProseMirror-selectednode`-Styling): Es gibt keine
  Zusicherung, dass ein selektiertes Bild sichtbar markiert ist. Beide vorhandenen Tests
  umgehen die Unsichtbarkeit (Tastaturselektion bzw. Klick ohne Prüfung eines Sichtzustands).
- **R2 ist unaufgeklärt:** kein Test isoliert „Bild **anklicken** → **Entf**" (Testfall 8
  nutzt Klick + **Cut**; Grenzfall 6 meidet den Klick bewusst). Genau die Kombination
  Klick + Entf ist der Verdachtsfall.
- **Kein Bild-Regressionstest für den Selection-Sync-Bug** (`selection-regression.spec.ts`
  nutzt nur „Fett").
- **Kein ODT-Zip-Verwaisungs-Test** nach Löschen (`Pictures/` + `manifest.xml`) und **kein**
  DOCX-Zip-Verwaisungs-Test über den **Entf**-Pfad.
- **Kein Test** für: Bild als einziges Doc-Element (leerer Auffüll-Absatz), Bild in Liste
  (`list_item` `block+`), abgebrochener Drag, gezieltes Löschen bei identischer `data:`-URL,
  Touch-Löschweg.

### 6.3 Reichweite der vorhandenen unabhängigen Validierung (ehrlich abgrenzen)
- **DOCX:** `docx/__tests__/external-validation.test.ts` nutzt **`mammoth`** (unabhängige
  DOCX→HTML-Konvertierung) — belegt Parseierbarkeit/Text/Struktur, **nicht** zwingend den
  Media-Ordner-Zustand. Für den Verwaisungs-Nachweis ist daher der **direkte** Zip-Check die
  verlässliche Prüfung (Media-Dateien zählen, wie in `cut.spec.ts` Rundreise 6).
- **ODT:** `odt/__tests__/external-validation.test.ts` validiert per **`xmllint-wasm`** gegen
  das offizielle **OASIS ODF 1.3 RelaxNG**-Schema — belegt Schemakonformität des erzeugten
  XML, **nicht** die Abwesenheit einer verwaisten `Pictures/`-Datei. Auch hier ist der direkte
  `manifest.xml`-/Zip-Check die verlässliche Prüfung.

### 6.4 Neu zu schreibende / zu erweiternde Tests (damit Abschnitte 2–5 abgedeckt sind)
Muster: echte Browser-Interaktion wie in `cut.spec.ts`/`clipboard.spec.ts` (Bild via
`page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(...)`,
`editor.locator('img')`), Zip-Prüfung via `JSZip`, Undo-Settle wie in `cut.spec.ts` Testfall 9.

1. **R1-Nachweis:** Bild einfügen, markieren (Klick **und** Tastatur) → sichtbarer
   Auswahlzustand ist prüfbar vorhanden (z. B. `.ProseMirror-selectednode` mit Outline).
2. **Kern-E2E (Entf-Pfad):** Bild einfügen → **anklicken** → **Entf** → `img`-Count 0,
   umgebender Text erhalten. Zusätzlich dieselbe Sequenz mit **Rücktaste** und mit
   **Tastaturselektion** (`Home`+`ArrowLeft`) statt Klick.
3. **R2-Aufklärung:** unmittelbar nach dem Klick den Selektionstyp prüfen (Bild-`NodeSelection`
   vs. kollabierter Text-Caret) und belegen, ob „Klick + Entf" das Bild entfernt oder erst ein
   zweites Entf nötig ist; Ergebnis als „behoben"/„bewusst dokumentiert"/„widerlegt" einstufen.
4. **Text vor/nach Bild** eingeben, Bild löschen → beide Textteile exakt erhalten.
5. **Undo/Redo** nach Löschen (mit Settle-Pause) → identische Wiederherstellung, ein Schritt;
   plus Nachweis, dass ein vorheriges, unabhängiges Tippen ein **separater** Undo-Schritt
   bleibt (Analogie `cut.spec.ts` Testfall 9 / „Zusatz §2.5").
6. **Mehrere Bilder**, mittleres löschen → nur dieses verschwindet.
7. **Bild in Tabellenzelle** löschen → Zelle/Tabelle konsistent.
8. **Bild als einziges Doc-Element** löschen → gültiger leerer Absatz bleibt, Editor bedienbar.
9. **Bild als alleiniger Listenpunkt-Inhalt** löschen → gültiger `list_item`, Nummerierung ok.
10. **Selection-Sync-Regression mit Bild** (Analogie `selection-regression.spec.ts`, aber Bild
    als Auslöser): Text vor/nach Bild → Bild markieren → Klick zur Neupositionierung → Enter →
    tippen → beide Textteile überleben. **Dauerhafter Pflichttest.**
11. **Entf ohne Bild-Selektion** → nur normales Textlöschen, kein Bild betroffen.
12. **Abgebrochener Drag** → Bild bleibt.
13. **Zip-Verwaisung nach Entf-Pfad:** DOCX (Erweiterung von Rundreise 6 auf den Entf-Pfad)
    **und** neu ODT (`Pictures/` + `manifest.xml` prüfen).
14. **Rundreise 5.2** (DOCX & ODT) über echten Upload/Download; inkl. „löschen → Undo → Export
    enthält Bild wieder".
15. **Reale Fremddatei** (`VariousPictures.docx`, `images.odt`) importieren, ein Bild löschen →
    alle übrigen bleiben unverändert.
16. **Touch:** Kernpunkte (2, 4, 10) auf den Projekten „Mobile"/„Tablet".

---

## 7. Risikoliste (aus der Code-Analyse abgeleitet, priorisiert)

Reihenfolge = Priorität für „Bild löschen". Jeder Punkt ist am Ende der Verifikation als
**„bestätigt und behoben"**, **„bestätigt und bewusst als Grenzfall dokumentiert"** oder
**„widerlegt"** einzustufen — keiner bleibt unkommentiert offen.

- **R1 — Kein sichtbares Auswahl-Feedback** (`src/index.css` ohne `.ProseMirror-selectednode`;
  0 Treffer für das prosemirror-view-Stylesheet in `src/`). „Markieren" ist optisch nicht
  nachweisbar. Höchste Priorität; Pflicht-Vorbedingung. Behebbar durch Einbinden von
  `prosemirror-view/style/prosemirror.css` oder eine eigene Outline-Regel.
- **R2 — Klick-Reconcile könnte die Bild-`NodeSelection` kollabieren**
  (`reconcileSelectionOnClick`, `WordEditor.tsx` Z. 43–50; `mouseup` Z. 146–153). Ein Klick auf
  ein Bild könnte die von ProseMirror gesetzte `NodeSelection` durch
  `TextSelection.near(posAtCoords)` ersetzen → „anklicken + Entf" löscht ggf. nichts / erst
  beim zweiten Entf (`selectNodeForward`). **Spannungsfeld:** `cut.spec.ts` Testfall 8 (Klick +
  Strg+X) entfernt das Bild dennoch, während `clipboard.spec.ts` den Klick bewusst als
  „unreliable" meidet. Gezielt mit einem Klick-+-Entf-Test aufklären — nicht annehmen.
- **R3 — „Bild löschen" ist keine eigene, getestete Funktion.** Kein `deleteImage`-Command;
  Entf/Rücktaste nur über generisches `baseKeymap`/`deleteSelection`; kein Test drückt Entf auf
  einer Bild-Selektion (nur Ausschneiden ist getestet — anderer Pfad `execCommand('cut')`).
- **R4 — Selection-Sync-Bug × Bild.** Bild-`NodeSelection` ist non-empty ⇒ direkter
  Anwendungsfall von `reconcileSelectionOnClick`; kein Regressionstest mit Bild
  (`selection-regression.spec.ts` nutzt nur „Fett"). Dauerhaften Bild-Regressionstest ergänzen.
- **R5 — Gültiger Dokumentzustand nach Löschen des einzigen Inhalts, UND kein Verschwinden der
  Listenstruktur.** `doc`, `list_item` und `table_cell` sind `block+` (`schema.ts` Z.
  14/146–152/154). Löschen des einzigen Bildes darf **nie** einen invaliden Doc-Zustand
  (0-Block-Container) erzeugen (sonst `assertLoadableDocument`-/Export-Risiko) — bei `doc` und
  `table_cell` erfüllt der generische `deleteSelection`-Pfad das bereits (**verifiziert**,
  `specs/bild-loeschen-code.md` §2: automatisches Auffüllen mit leerem Absatz). Beim `list_item`
  erfüllt derselbe generische Pfad zwar die Gültigkeit, **aber nicht** das geforderte Verhalten:
  Er entfernt den Punkt (bzw. bei einem einzelnen Punkt die ganze Liste) statt ihn leer
  aufzufüllen — siehe die entschiedene Anforderung in Grenzfall 8. Das ist ein **offener,
  bestätigter Fix-Bedarf** (nicht mehr „bewusst dokumentierte Abweichung"): ein gezielter
  Custom-Command für exakt diesen Fall ist Teil des Umsetzungsauftrags, siehe
  `specs/bild-loeschen-code.md` §3.2/§4.2.
- **R6 — ODT- und Entf-Pfad-Verwaisung ungeprüft.** `cut.spec.ts` Rundreise 6 prüft nur DOCX +
  Ausschneiden. Die Architektur (frischer `ImageCollector`-Walk je Export) legt „keine
  Verwaisung" nahe, aber der Nachweis für ODT (`Pictures/`+`manifest.xml`) und für den
  Entf-Pfad fehlt.
- **R7 — Abgebrochener Drag** (`draggable:true`, `dropCursor()`). Darf nicht als Löschung enden;
  ungeprüft.
- **R8 — Touch/Mobile ohne physische Entf-Taste** (Pixel 7, iPad Mini). Wie wird ohne Entf-Taste
  und ohne sichtbare Selektion (R1) gelöscht? Kein Weg getestet; ggf. Weg 2/3 aus Abschnitt 2
  verbindlich machen.
- **R9 — Icon-Rendering `🖼`** (`Toolbar.tsx` Z. 292, Emoji). Wahrscheinliche Mitursache der
  Meldung „nicht auffindbar"; mildernd wirkt der Label-Text „Bild". Auf SVG umstellen erwägen
  (der Ausschneiden-Button ist mit `ScissorsIcon` bereits SVG). Betrifft primär das Einfügen,
  aber die Wahrnehmung der gesamten Bild-UI.
- **R10 — Externe/verknüpfte Bildquelle.** `imageCollector.add` wirft bei nicht-`data:`-URL
  (Fixture `odt-images-linked.odt`). Löschen eines solchen Bildes muss trivial funktionieren
  (Node entfernen), ohne den Export-Fehlerpfad auszulösen; klären, wie verknüpfte Bilder
  importiert werden.

---

## 8. Abgrenzung: vorhandener Test vs. geforderter Nachweis

Die bestehenden Tests (Bild-Ausschneiden in `cut.spec.ts`, Bild-Kopieren in `clipboard.spec.ts`,
konstruierte Bild-Rundreisen in `roundtrip.test.ts`, Fidelity-Rundreise mit Bild) beweisen
**nicht**, dass:
- **Entf/Rücktaste** (nicht Ausschneiden) ein markiertes Bild löscht — der geforderte Codepfad
  (`deleteSelection`) ist E2E unerprobt;
- ein per **Klick** markiertes Bild überhaupt sichtbar selektiert ist (R1) und die Selektion
  den `mouseup`-Reconcile übersteht (R2);
- das Löschen in den Sonderkontexten (einziges Doc-Element, Listenpunkt, Tabellenzelle,
  Dokumentanfang/-ende) einen gültigen Dokumentzustand hinterlässt;
- der Export nach dem **Löschen** (Entf-Pfad, und für **ODT** überhaupt) frei von verwaisten
  Bilddateien ist;
- der Selection-Sync-Bug mit einem Bild als Auslöser nicht reproduzierbar ist.

Diese Punkte sind der Kern der geforderten Verifikation und über die Tests aus Abschnitt 6.4 zu
schließen, bevor der Backlog-Status von „vorhanden" auf „verifiziert" gehoben werden darf.

---

## 9. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** Punkte erfüllt sind:

1. Ein selektiertes Bild ist im Editor sichtbar markiert (R1 behoben) — belegt durch einen
   Test. Ohne diesen Nachweis gilt „Markieren" als nicht erfüllt.
2. **Entf** und **Rücktaste** auf einem selektierten Bild (Klick- **und** Tastaturselektion)
   entfernen es zuverlässig samt Anker, ohne Nebenwirkung auf Text davor/danach — je ein
   grüner E2E-Test.
3. R2 ist aufgeklärt und final eingestuft (behoben/dokumentiert/widerlegt): Es ist belegt, ob
   „Klick + Entf" das Bild in einem Schritt entfernt oder welcher verlässliche Markier-Weg
   stattdessen verbindlich gilt.
4. Für jeden weiteren Zugriffsweg aus Abschnitt 2 (Toolbar-Button, Kontextmenü, `Mod-Backspace`,
   Drag, Touch, Bestätigungsdialog) ist dokumentiert, ob er unterstützt wird — kein unklarer
   Zwischenzustand.
5. Die Sonderfälle „einziges Doc-Element" (R5), „Bild in Tabellenzelle", „Bild als
   Listenpunkt-Inhalt", „Bild am Dokumentanfang/-ende" sind je durch einen Test nachgewiesen und
   hinterlassen einen gültigen Dokumentzustand. Für den Listenpunkt-Fall gilt zusätzlich die
   entschiedene Anforderung aus Grenzfall 8 (ehemals offene Frage OE-1, siehe Korrekturhinweis
   Punkt 6): Der Test muss belegen, dass der Punkt **erhalten bleibt** (mit leerem Absatz
   aufgefüllt) — **nicht**, dass er entfernt wird. Solange der aktuelle generische
   `deleteSelection`-Pfad den Punkt stattdessen entfernt (Ist-Zustand laut Sonde), gilt dieser
   DoD-Punkt als **nicht erfüllt**, und der Backlog-Status bleibt auf „teilweise", bis der in
   `specs/bild-loeschen-code.md` §3.2/§4.2 beschriebene Custom-Command umgesetzt ist.
6. Der Selection-Sync-Regressionstest **mit Bild** als Auslöser (R4) ist geschrieben, grün und
   dauerhaft Teil der Suite.
7. Alle Rundreise-Testfälle aus 5.2 sind für DOCX **und** ODT grün — inklusive des direkten
   Zip-Checks auf verwaiste Bilddateien nach dem **Entf-Pfad** (DOCX **und** neu ODT), nicht nur
   über die strukturellen Fremd-Validierungen (mammoth/RelaxNG, deren Reichweite in 6.3
   abgegrenzt ist).
8. Undo/Redo nach Löschen sind nachgewiesen (identische Wiederherstellung, korrekte
   Undo-Granularität mit Settle-Pause).
9. Kein Testfall zeigt stillen Datenverlust (Nachbartext verschwindet; Bild verschwindet ohne
   Undo-Möglichkeit; verwaiste Datei im Zip) oder eine JS-Exception in der Konsole.
10. Jeder Punkt der Risikoliste (Abschnitt 7) ist final als „behoben" / „bewusst dokumentiert" /
    „widerlegt" eingestuft. Sind Punkte offen (voraussichtlich mindestens R1, R5/Listenpunkt-Fix
    und die fehlenden Entf-Pfad-Tests), ist der Backlog-Status auf „teilweise" zu korrigieren und
    die fehlenden Teile sind als eigene Nachfolge-Aufgaben zu erfassen.
