# Anforderungen: „Fußzeile bearbeiten"

Status: Entwurf zur Freigabe — Backlog-Status „fehlt", gilt als **nicht vertrauenswürdig**
und muss vollständig verifiziert werden, bevor es als „fertig" markiert wird.
Geltungsbereich: Diese Datei ist die verbindliche Anforderungs- und Testgrundlage für genau
ein Feature — „Fußzeile bearbeiten" (eigener editierbarer Bereich am unteren Seitenrand,
für DOCX **und** ODT, inklusive Rundreise). Sie konkretisiert und ersetzt für dieses Feature
Abschnitt 9 („Kopf- und Fußzeilen") und Zeile 8 der Tabelle in Abschnitt 17 von
`FEATURE-SPEC-DOCX-ODT.md`. Stil, Testfall-Nummerierung und Detailtiefe orientieren sich an
jenem Dokument.

Verwandtes, aber **nicht** Gegenstand dieser Datei: „Kopfzeile bearbeiten" ist ein
eigenständiges Schwester-Feature mit identischem Mechanismus (siehe Abschnitt 12). Wo beide
Features denselben Code/dieselbe Fläche teilen, wird das hier vermerkt, aber nicht im Detail
spezifiziert.

---

## 0. Bestandsaufnahme (Ist-Zustand laut Code, Stand dieser Prüfung)

Diese Bestandsaufnahme begründet, warum der Backlog-Status „fehlt/nicht vertrauenswürdig"
zutreffend ist, und dient als Ausgangspunkt für die Verifikation.

| Ebene | Datei | Zustand |
|---|---|---|
| Datenmodell | `src/formats/shared/documentModel.ts` | `WordDocumentContent.footer: ProseMirrorJSON \| null` existiert, ist bei neuen Dokumenten immer `null`. |
| DOCX-Reader | `src/formats/docx/reader.ts` | Liest `w:footerReference` aus `sectPr`, aber **ungeachtet des `w:type`-Attributs** (`default`/`first`/`even`) — es wird schlicht die erste gefundene Referenz genommen. |
| DOCX-Writer | `src/formats/docx/writer.ts` | Schreibt genau **eine** `footer1.xml` mit `w:type="default"`. Kein „erste Seite anders", keine geraden/ungeraden Seiten. |
| ODT-Reader | `src/formats/odt/reader.ts` | Liest `style:footer` aus dem **ersten** `style:master-page`-Element in `styles.xml` — bei Dateien mit mehreren Master-Pages (z. B. LibreOffice-Vorlagen mit abweichender erster Seite) potenziell die falsche Fußzeile. |
| ODT-Writer | `src/formats/odt/writer.ts` | Schreibt genau ein `style:footer` unter der Master-Page „Standard". |
| Feld „Seitenzahl" | — | **Existiert nirgends im Code** (kein Node-Typ im Schema, kein `w:fldSimple`/`PAGE`, kein `text:page-number`, kein `text:page-count`). |
| Editor-UI | `src/formats/shared/editor/Toolbar.tsx` | **Kein** Bedienelement für Fußzeile (kein Button, kein Menüpunkt, keine Erwähnung des Worts „Fußzeile"/„footer" im gesamten Datei). |
| Editor-Kern | `src/formats/shared/editor/WordEditor.tsx` | Instanziiert genau **eine** ProseMirror-Editor-Instanz für `document.content.body`. `header`/`footer` werden nirgends gelesen, gerendert oder editierbar gemacht. |
| Workspace | `src/app/DocumentWorkspace.tsx` | Reicht `document.content` beim Export unverändert durch — es gibt keinen Zustand/Handler, der `footer` je verändern könnte, weil es keinen UI-Eingang dafür gibt. |
| Seitenansicht | `src/formats/shared/editor/pageLayout.ts`, `src/formats/shared/editor/pagination.ts` | Die Mehrseiten-Darstellung ist eine **Hintergrundbild-Illusion** auf einer einzigen durchlaufenden ProseMirror-Fläche (Spacer-Widgets zwischen „Seiten"), **keine** echten Pro-Seite-DOM-Container. Eine Fußzeile „am unteren Rand jeder Seite" hat aktuell keinen strukturellen Ankerpunkt. |
| Tests (Unit) | `src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts` | Prüfen Rundreise von `footer`, aber ausschließlich über **direkt konstruierte** `WordDocumentContent`-Objekte — nie über tatsächliche Bedienung. |
| Tests (Fixture-Sweep) | `src/formats/docx/__tests__/external-fixtures.test.ts`, `.../odt/__tests__/external-fixtures.test.ts` | Prüfen nur „Import stürzt nicht ab" — **keine** Prüfung, ob Fußzeileninhalt der über 15 vorhandenen Head/Foot-Fixture-Dateien (siehe Abschnitt 8) tatsächlich erhalten bleibt. |
| Tests (E2E) | `tests/e2e/*.spec.ts` | Kein einziges Szenario zu Kopf-/Fußzeile. |

**Fazit:** Auf Datenmodell-/Reader-/Writer-Ebene existiert ein einfacher, ungetesteter
Mechanismus für genau eine (Standard-)Fußzeile. Auf UI-Ebene existiert **nichts** — das
Feature ist buchstäblich nicht bedienbar. Die Einstufung „fehlt" im Backlog ist für die
UI korrekt; „nicht vertrauenswürdig" ist für Reader/Writer korrekt, weil bisher nichts
davon über eine reale Datei mit realer Bedienung verifiziert wurde.

---

## 1. Ziel (Nutzerperspektive)

Als Nutzerin kann ich am unteren Rand jeder Seite meines Dokuments einen eigenen Text
(z. B. Seitenzahl, Firmenname, Copyright-Zeile) einblenden und bearbeiten, unabhängig vom
Haupttext. Der Bereich wird beim Export als echte Word-/ODF-Fußzeile geschrieben und bleibt
beim erneuten Import erhalten — sowohl in meiner eigenen App als auch (mindestens für reinen
Text) in Word/LibreOffice.

---

## 2. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Ort | Sollverhalten |
|---|---|---|---|
| 1 | Button „Fußzeile" (Toggle) | Haupt-Toolbar (`Toolbar.tsx`), eigene, klar erkennbare SVG-Ikone (kein Emoji/Buchstaben-Icon, siehe Abschnitt 20 der Haupt-Spezifikation) | Schaltet die Fußzeile für das gesamte Dokument ein/aus. `aria-pressed` spiegelt Aktiv-Zustand. Tooltip „Fußzeile einblenden"/„Fußzeile ausblenden" je nach Zustand. |
| 2 | Fußzeilen-Editierbereich | Unterer Rand jeder sichtbar gerenderten Seite in der Seitenansicht | Eigener, optisch abgesetzter Bereich (z. B. dünne gestrichelte Trennlinie + dezentes Label „Fußzeile" bei Fokus, analog Word/LibreOffice). Eigene ProseMirror-Editor-Instanz, gebunden an `document.content.footer`. |
| 3 | Fokus-Übergang | Klick in den Fußzeilenbereich / Klick zurück in den Haupttext | Klick in den Fußzeilenbereich verschiebt den Eingabefokus dorthin; ein Klick in den Haupttext verschiebt ihn zurück. Kein Tastatur-Shortcut zwingend erforderlich, aber Klick muss zuverlässig funktionieren (kein Bug analog Abschnitt 2 der Haupt-Spezifikation — insbesondere beim Wechsel zwischen zwei unterschiedlichen ProseMirror-Instanzen, siehe Grenzfall 7.7). |
| 4 | Formatierungs-Toolbar in der Fußzeile | Dieselbe Toolbar wie Haupttext, kontextsensitiv an die fokussierte Instanz gebunden | Alle Zeichen-/Absatzformat-Funktionen aus Abschnitt 3/4 der Haupt-Spezifikation wirken 1:1 auch auf die Fußzeile, wenn diese fokussiert ist. |
| 5 | „Seitenzahl einfügen" | Innerhalb der Fußzeilen-Toolbar (nur aktiv/sinnvoll bedienbar, wenn Fokus in Kopf- oder Fußzeile liegt) | Fügt an der Cursor-Position ein Feld ein, das sich als tatsächliche, sich aktualisierende Seitenzahl verhält (siehe Abschnitt 5). **Muss neu gebaut werden — es existiert aktuell kein Node-Typ dafür.** |
| 6 | Fußzeile deaktivieren (erneuter Klick auf Button #1) | Haupt-Toolbar | Bei leerer Fußzeile: sofortiges Ausblenden, `footer` wird wieder `null`. Bei **nicht-leerer** Fußzeile: Bestätigungsdialog vor Datenverlust (analog zum bestehenden Muster in `DocumentWorkspace.tsx`, `window.confirm` beim Schließen ungespeicherter Änderungen) — siehe Grenzfall 7.2. |
| 7 | Statusanzeige „wo bin ich" (nice-to-have) | z. B. dezenter Text/Icon in der Toolbar | Zeigt an, ob der Cursor aktuell im Haupttext oder in der Fußzeile steht. Kein Blocker, wenn nicht umgesetzt — dann aber explizit als „nicht umgesetzt" dokumentieren (kein stiller Fehlschlag, siehe Abschnitt 20 Punkt 4 der Haupt-Spezifikation). |

Ergänzung zur Tabelle in Abschnitt 17 der Haupt-Spezifikation: Zeile 8 „Kopf-/Fußzeile
bearbeiten — fehlt komplett in der UI" wird durch obige Tabelle für den Fußzeilen-Teil
vollständig ersetzt.

---

## 3. Aktivierungs-/Deaktivierungsverhalten im Detail

1. Neues, leeres Dokument → Button „Fußzeile" ist im inaktiven Zustand (`aria-pressed=false`),
   `document.content.footer === null`.
2. Klick auf „Fußzeile" → Fußzeilenbereich erscheint sofort am unteren Rand jeder aktuell
   sichtbaren Seite, mit einem leeren Absatz vorbelegt (analog `emptyDocJSON()` in
   `documentModel.ts`), Fokus springt automatisch in den neuen Bereich, Cursor blinkt
   bereit — **kein zusätzlicher Klick nötig**, um mit dem Tippen zu beginnen (Parität zu
   Abschnitt 1.1 der Haupt-Spezifikation: „Neues Dokument → sofort tippen möglich").
3. Import einer Datei **mit** vorhandener Fußzeile → Button „Fußzeile" ist von Anfang an im
   aktiven Zustand, Bereich zeigt den importierten Inhalt, ohne dass die Nutzerin ihn erst
   „aktivieren" müsste.
4. Import einer Datei **ohne** Fußzeile → Button inaktiv, Bereich unsichtbar, exakt wie bei
   Punkt 1.
5. Deaktivieren einer befüllten Fußzeile entfernt den Inhalt aus dem Dokumentmodell
   (`footer` wird `null`) erst nach Bestätigung (siehe Grenzfall 7.2); danach ist der
   Zustand identisch zu Punkt 1 und beim erneuten Aktivieren wieder leer (kein
   „Wiederherstellen" des zuletzt gelöschten Fußzeileninhalts zwingend erforderlich, aber
   wenn nicht umgesetzt, muss Undo direkt nach Deaktivieren den vorherigen Inhalt
   zurückholen können, siehe 7.6).

---

## 4. Editierverhalten innerhalb der Fußzeile (Funktionsparität zum Haupttext)

Der Fußzeilenbereich ist inhaltlich derselbe ProseMirror-Schema-Baum wie der Haupttext
(`wordSchema`, `doc: { content: 'block+' }`) und muss daher — sofern nicht explizit unter
Abschnitt 6 eingeschränkt — dieselbe Funktionalität bieten wie in
`FEATURE-SPEC-DOCX-ODT.md` beschrieben:

- **Text-Grundfunktionen** (Abschnitt 2 der Haupt-Spezifikation): Tippen, Löschen,
  Cursor-Navigation, Auswahl (Maus/Doppelklick/Dreifachklick/Strg+A), Ausschneiden/
  Kopieren/Einfügen, Undo/Redo.
- **Zeichenformatierung** (Abschnitt 3): Fett/Kursiv/Unterstrichen/Durchgestrichen,
  Hoch-/Tiefstellen, Schrift-/Hervorhebungsfarbe, Schriftart/-größe, Formatierung löschen.
- **Absatzformatierung** (Abschnitt 4): Ausrichtung, Formatvorlagen (inkl. Überschriften —
  siehe Grenzfall 7.8 zur Sinnhaftigkeit), Zeilen-/Absatzabstand, Einzüge, Tabstopps.
- **Listen** (Abschnitt 5): Aufzählung, Nummerierung, mehrstufig.
- **Tabellen** (Abschnitt 6) und **Bilder** (Abschnitt 7): vollständig einfügbar und
  editierbar innerhalb der Fußzeile (z. B. Firmenlogo in der Fußzeile — realer Anwendungsfall,
  siehe Fixture `ThreeColFoot.docx` / `SimpleHeadThreeColFoot.docx`).

**Undo/Redo-Historie:** Fußzeile und Haupttext sind getrennte ProseMirror-Editor-Instanzen
mit **getrennten** Undo-Historien. Strg+Z im Haupttext darf keine Fußzeilen-Änderung
rückgängig machen und umgekehrt. Dies muss explizit festgelegt und getestet werden, da es
im aktuellen Code keine Präzedenz gibt (es gibt bisher nur eine einzige Editor-Instanz).

---

## 5. Seitenzahl-Feld

- Einfügbar an der Cursor-Position innerhalb der Fußzeile (und optional Kopfzeile).
- Wird im Editor als sichtbarer, aber erkennbar „besonderer" Platzhalter dargestellt
  (z. B. grau hinterlegt, nicht direkt als Freitext löschbares Einzelzeichen, sondern als
  atomarer Node — analog zur Behandlung von Bildern im Schema).
- **Export DOCX:** echtes Word-Feld (`w:fldSimple w:instr="PAGE"` oder
  `w:fldChar`-Begin/Separate/End-Trio mit `PAGE`-Instruktion), das Word selbst berechnet —
  **nicht** eine zum Exportzeitpunkt hart eingesetzte Zahl „1".
- **Export ODT:** `<text:page-number text:select-page="current">…</text:page-number>`
  (mit einem beliebigen, beim Export berechneten Platzhaltertext als Kind-Inhalt, den LibreOffice
  beim Öffnen sofort neu berechnet).
- **Re-Import:** Feld wird als Seitenzahl-Node wiedererkannt, nicht als literaler Text „1"
  interpretiert (sonst Datenverlust der Feld-Eigenschaft bei Rundreise).
- Löschen: Markieren + Entf entfernt das Feld als Ganzes, umgebender Text bleibt erhalten.
- **Muss vollständig neu gebaut werden** (Schema-Node, Toolbar-Button, Reader, Writer) —
  aktuell existiert dafür nichts.

---

## 6. Seitenlayout-Integration (technisches Risiko, vor Umsetzung zu klären)

Die aktuelle Seitenansicht (`pageLayout.ts`, `pagination.ts`) simuliert mehrere A4-Seiten
über ein sich wiederholendes Hintergrundbild auf einer einzigen, durchlaufenden
ProseMirror-Fläche; es gibt keine echten Pro-Seite-Container im DOM. Eine Fußzeile, die
„am unteren Rand jeder Seite" erscheinen soll, kann deshalb **nicht** einfach wie ein
zusätzlicher Body-Absatz behandelt werden. Für die Umsetzung ist eine der folgenden
Lösungen zu wählen und explizit zu dokumentieren:

- (a) Ein fixiertes/absolut positioniertes Overlay-Element pro berechnetem Seiten-Band
  (die Seitenumbruch-Positionen werden bereits in `pagination.ts` berechnet und könnten
  wiederverwendet werden, um Fußzeilen-Kopien an den passenden Y-Positionen einzublenden).
- (b) Eine einzelne, sichtbare Fußzeile nur am Ende des Dokuments/der letzten Seite plus
  dokumentierte Einschränkung „Fußzeile erscheint aktuell nur einmal, nicht auf jeder
  Zwischenseite" (nur akzeptabel als **Übergangslösung**, muss im Feature-Status explizit
  vermerkt sein, kein stiller Fehlschlag).
- (c) Refaktorierung auf echte Pro-Seite-Container.

**Diese Entscheidung ist eine Voraussetzung für die Abnahme** und muss vor Implementierung
getroffen und hier nachgetragen werden. Bis dahin gilt Testfall 10.1 unten als nicht
erfüllbar.

---

## 7. Grenzfälle

1. **Leere Fußzeile beim Export:** Eine aktivierte, aber nur mit einem leeren Absatz
   gefüllte Fußzeile — wird sie als leerer `footer1.xml`/`style:footer` exportiert (Format
   bleibt aktiv, aber inhaltlich leer) oder beim Export automatisch wieder zu `null`
   normalisiert? **Muss festgelegt werden** (Empfehlung: aktiver, aber leerer Zustand bleibt
   erhalten — die Nutzerin hat die Fußzeile bewusst aktiviert, auch wenn sie noch nichts
   eingegeben hat).
2. **Deaktivieren einer befüllten Fußzeile:** Bestätigungsdialog vor Datenverlust
   (siehe Abschnitt 3, Punkt 5). Abbrechen der Bestätigung darf den Aktiv-Zustand nicht
   verändern.
3. **Mehrseitiges Dokument:** Fußzeileninhalt muss auf **jeder** Seite erscheinen (nicht
   nur der letzten/ersten) — abhängig von der in Abschnitt 6 getroffenen Entscheidung
   explizit zu verifizieren.
4. **Manueller Seitenumbruch** (Abschnitt 8/15 der Haupt-Spezifikation) mitten im Dokument
   → Fußzeile erscheint unverändert auf beiden dadurch entstehenden Seiten.
5. **Fußzeileninhalt größer als der verfügbare untere Seitenrand** (z. B. mehrzeiliger Text,
   Tabelle, großes Bild) → definiertes Verhalten nötig: entweder wächst der optisch
   reservierte Fußzeilenbereich sichtbar mit (bevorzugt, kein abgeschnittener Inhalt), oder
   es gibt eine sichtbare Warnung. **Kein stilles Abschneiden.**
6. **Undo direkt nach Deaktivieren der Fußzeile:** Stellt den zuletzt gelöschten
   Fußzeileninhalt wieder her (nicht nur den Aktivierungs-Zustand ohne Inhalt).
7. **Fokuswechsel zwischen zwei Editor-Instanzen (Haupttext ↔ Fußzeile):** Da es sich um
   zwei getrennte ProseMirror-Views handelt, ist hier ein eigener Regressionstest nötig,
   analog zum in Abschnitt 2 der Haupt-Spezifikation dokumentierten Selection-Sync-Bug:
   Text in der Fußzeile eingeben → in den Haupttext klicken → weiter tippen → **beide**
   Bereiche müssen ihren jeweils korrekten, unveränderten Inhalt behalten (kein
   Bereichs-Übergriff, keine Vermischung der Inhalte).
8. **Formatvorlage „Überschrift" innerhalb der Fußzeile:** Technisch durch die
   Schema-Wiederverwendung möglich (siehe Abschnitt 4) — muss weder verhindert noch
   speziell gefördert werden, darf aber nicht abstürzen und muss bei Rundreise erhalten
   bleiben, auch wenn eine Überschrift in einer Fußzeile inhaltlich unüblich ist.
9. **Import einer Datei mit „erste Seite anders" oder gerade/ungerade Fußzeilen**
   (siehe Abschnitt 9) — aktuell wird nur eine Variante gelesen/angezeigt; die
   *nicht* geladene(n) Variante(n) dürfen beim unveränderten Re-Export nicht ersatzlos aus
   der Datei verschwinden, wenn das technisch vermeidbar ist (siehe Abschnitt 9,
   Mindestanforderung „verlustfrei durchreichen").
10. **Cross-Format-Fußzeile mit Inhalt, den das Zielformat nicht 1:1 abbilden kann**
    (z. B. sehr spezifische DOCX-Feldarten) → mindestens der reine Text bleibt erhalten
    (kein stiller Totalverlust), Formatierungsverluste sind zu dokumentieren.
11. **Datei ganz ohne Fußzeile, aber mit Kopfzeile** (`Headers.docx`,
    `ThreeColHead.docx`) → Aktivieren/Bearbeiten der Fußzeile darf die vorhandene
    Kopfzeile nicht verändern oder entfernen.
12. **Sehr langer Fußzeilentext mit eigenem Seitenumbruch-Versuch:** Ein manueller
    Seitenumbruch (sobald als Node vorhanden, siehe Abschnitt 8 der Haupt-Spezifikation)
    darf **innerhalb** der Fußzeile nicht einfügbar sein bzw. muss beim Einfügeversuch
    sinnvoll abgefangen werden (kein Crash, keine kaputte Datei beim Export).

---

## 8. Rundreise-Anforderung (Pflicht, DOCX **und** ODT)

Kernanforderung laut Auftrag: **Datei hochladen (unverändert) → exportieren (ohne
inhaltliche Änderung) → erneut importieren → Fußzeileninhalt bleibt erhalten.** Dies muss
sowohl mit selbst erzeugten Dokumenten als auch mit realen Fremddateien nachgewiesen werden.

### 8.1 Selbst erzeugte Dokumente (Basis-Rundreise)
1. Neues Dokument → Fußzeile aktivieren → Text eingeben → als DOCX exportieren →
   reimportieren → Text identisch, Button „Fußzeile" wieder aktiv.
2. Dasselbe für ODT.
3. Fußzeile mit gemischter Formatierung (fett, farbig, Ausrichtung zentriert) → Rundreise
   DOCX und ODT erhält exakt diese Kombination (Parität zu Abschnitt 3, Testfall 4/5 der
   Haupt-Spezifikation).
4. Fußzeile mit Tabelle und Bild → Rundreise erhält Struktur und Bildzuordnung.
5. Fußzeile mit Seitenzahl-Feld → Rundreise: Feld bleibt als Feld erkennbar (nicht als
   hartkodierte Zahl), siehe Abschnitt 5.
6. Cross-Format: Fußzeile in DOCX erstellt → als ODT exportiert → reimportiert →
   Inhalt bleibt erhalten. Und umgekehrt (ODT → DOCX).
7. Doppelte Cross-Format-Rundreise (DOCX → ODT → DOCX) an einer Fußzeile mit allen
   Formaten aus 8.1.3–8.1.5 → kein zusätzlicher Verlust in der zweiten Runde.

### 8.2 „Upload unverändert" — reale Fremddateien (Pflicht, höchste Priorität)

Im Repository liegen bereits reale, unbearbeitete Test-Fixtures mit echten Fußzeilen vor
(`tests/fixtures/external/docx/`, `tests/fixtures/external/odt/`). Diese sind bislang **nur**
über den Crash-Sweep (`external-fixtures.test.ts`) abgedeckt, **nicht** inhaltlich geprüft.
Für jede der folgenden Dateien gilt: **importieren → ohne jede Änderung exportieren →
reimportieren → der ursprünglich sichtbare Fußzeilentext ist danach unverändert
wiederzufinden** (bei Cross-Format-Export sind reine Formatierungsverluste zu dokumentieren,
Textverlust ist nicht akzeptabel):

| Datei | Relevanz |
|---|---|
| `docx/headerFooter.docx` | Basisfall Kopf+Fuß |
| `docx/HeaderFooterUnicode.docx` | Sonderzeichen/Unicode in der Fußzeile |
| `docx/FancyFoot.docx` | Formatierte Fußzeile |
| `docx/ThreeColFoot.docx`, `docx/ThreeColHeadFoot.docx`, `docx/SimpleHeadThreeColFoot.docx` | Mehrspaltige/komplexe Fußzeilen-Layouts |
| `docx/EmptyDocumentWithHeaderFooter.docx` | Leeres Dokument, aber aktive Fußzeile — Abgrenzung zu Grenzfall 7.1 |
| `docx/NoHeadFoot.docx` | Negativfall — Button muss inaktiv bleiben |
| `docx/DiffFirstPageHeadFoot.docx`, `docx/PageSpecificHeadFoot.docx` | „Erste Seite anders" — siehe Abschnitt 9 |
| `odt/HeaderFooter.odt`, `odt/headfoot.odt`, `odt/headerFinal.odt` | Basisfall ODT |
| `odt/headerFirstPage.odt`, `odt/HeaderFirstPageEnabled_MSO15.odt`, `odt/HeaderFirstPageDisabled_MSO15.odt` | Erste-Seite-Variante ODT |
| `odt/HeaderFirstAndEvenPageEnabled_MSO15.odt`, `odt/HeaderFirstAndEvenPageEnabledAndMarging_MSO15.odt` | Gerade/ungerade + erste Seite kombiniert |
| `odt/tabellen_header_DOC_LO4-1-0.odt` | Tabelle im Kopf-/Fußbereich |

**Testfälle**
1. Für jede Datei aus obiger Tabelle: Import → unveränderter Export (identisches Format) →
   Reimport → Fußzeilentext(e) inhaltlich identisch zum ursprünglichen Import.
2. Für dieselben Dateien zusätzlich Cross-Format-Export (DOCX-Fixture → ODT-Export,
   ODT-Fixture → DOCX-Export) → Reimport → Fußzeilentext bleibt erhalten (Formatierung darf
   sich vereinfachen, Text nicht verschwinden).
3. Mindestens eine Datei mit Bild in der Fußzeile (`headerPic.docx`, falls Bild in Fußzeile
   statt Kopfzeile enthalten — sonst als Kopfzeilen-Äquivalent im Schwester-Feature zu
   prüfen) → Bild bleibt bei Rundreise zugeordnet.

---

## 9. Nicht unterstützte Varianten — Deklarationspflicht

Analog zum Prinzip in Abschnitt 9 der Haupt-Spezifikation gilt: Was nicht unterstützt wird,
muss **explizit dokumentiert**, nicht stillschweigend verworfen werden.

- **„Erste Seite anders"** (DOCX `w:type="first"`, ODT abweichende Master-Page für die
  erste Seite): Aktuell **nicht** über die UI einstellbar. Mindestanforderung: Wird eine
  Datei mit einer solchen abweichenden Variante importiert, muss zumindest eine der
  vorhandenen Varianten sichtbar/editierbar sein (nicht beide stillschweigend verschwinden),
  und die App muss erkennbar machen (z. B. Hinweistext), dass eine „erste Seite anders"
  im Original vorhanden war, aber beim Export vereinheitlicht wird.
- **Gerade/ungerade Seiten unterschiedliche Fußzeile:** Ebenso nicht unterstützt — gleiche
  Mindestanforderung wie oben.
- **Mehrere Abschnitte mit je eigener Fußzeile** (DOCX-Abschnittswechsel mit
  unterschiedlichen `sectPr`): Das Datenmodell kennt nur eine globale Fußzeile pro
  Dokument. Bei Import einer Datei mit mehreren Abschnitten wird aktuell vermutlich nur der
  erste Abschnitt berücksichtigt — muss geprüft und dokumentiert werden, welche Fußzeile(n)
  bei mehreren Abschnitten „gewinnen" bzw. ob Inhalte verloren gehen.

Diese drei Punkte gelten bis zur Klärung als **offen** und dürfen die Abnahme des
Grundfeatures (eine Fußzeile pro Dokument, DOCX+ODT, Rundreise) nicht blockieren, solange
sie hier dokumentiert bleiben.

---

## 10. Definition of Done / Abnahmekriterien

Das Feature gilt erst als „vorhanden und verifiziert" (nicht mehr „fehlt" bzw. „nicht
vertrauenswürdig"), wenn **alle** folgenden Punkte erfüllt sind:

1. Toolbar-Button „Fußzeile" existiert, ist per echtem Playwright-`click()` bedienbar
   (nicht nur als Command-Aufruf im Unit-Test) und schaltet einen sichtbaren, editierbaren
   Bereich am unteren Seitenrand ein/aus (Abschnitt 6 muss dafür entschieden sein).
2. Alle in Abschnitt 4 gelisteten Editierfunktionen sind innerhalb der Fußzeile per echter
   Tastatur-/Maus-Interaktion nachgewiesen, nicht nur über direkt konstruierte
   ProseMirror-JSON-Objekte.
3. Seitenzahl-Feld ist einfügbar, wird bei DOCX- und ODT-Export als echtes, von der
   Zielanwendung selbst berechnetes Feld geschrieben (Nachweis: XML-Inspektion des
   exportierten Feldelements, nicht nur Sichtprüfung einer Zahl).
4. Alle Testfälle aus Abschnitt 8.1 (Basis-Rundreise) sind grün.
5. Alle Testfälle aus Abschnitt 8.2 (Upload unverändert → Export → Re-Import, reale
   Fixtures) sind grün — insbesondere kein Regressions-Datenverlust bei den Dateien mit
   „erste Seite anders" (Abschnitt 9 dokumentiert deren Einschränkung, verursacht aber
   keinen unangekündigten Textverlust).
6. Regressionstest für den Fokuswechsel-Grenzfall (7.7) ist als dauerhafter Test in der
   Suite vorhanden (analog zum Selection-Sync-Regressionstest aus Abschnitt 2 der
   Haupt-Spezifikation).
7. Kein stiller Fehlschlag: Jede nicht unterstützte Kombination (Abschnitt 9) erzeugt
   entweder eine sichtbare Rückmeldung oder ist nachweislich hier dokumentiert.
8. E2E-Tests unter `tests/e2e/` decken mindestens: Aktivieren, Text eingeben, Formatieren,
   Seitenzahl einfügen, Export, Re-Import, Deaktivieren-mit-Bestätigung.

---

## 11. Offene Fragen (vor Umsetzungsbeginn zu klären)

1. Welche der drei Optionen aus Abschnitt 6 (Overlay pro Seitenband / einmalige Fußzeile
   am Dokumentende als Übergang / echte Pro-Seite-Container) wird umgesetzt?
2. Bleibt eine aktivierte, aber leere Fußzeile beim Export erhalten oder wird sie zu
   `null` normalisiert (Grenzfall 7.1)?
3. Wird „erste Seite anders" / gerade-ungerade (Abschnitt 9) in einer späteren Phase
   tatsächlich nachgebaut, oder bleibt es dauerhaft dokumentierte Einschränkung?
4. Teilt sich der Toolbar-Button mit dem Schwester-Feature „Kopfzeile bearbeiten" eine
   gemeinsame Bedienleiste (z. B. ein Dropdown „Kopf-/Fußzeile") oder zwei getrennte
   Buttons? (Beeinflusst Abschnitt 2, Punkt 1.)
