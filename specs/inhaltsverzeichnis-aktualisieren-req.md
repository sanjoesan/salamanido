# Anforderungen: „Inhaltsverzeichnis aktualisieren"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `inhaltsverzeichnis-aktualisieren`,
Priorität 1, Abschnitt „5.1 Verzeichnisse") als **„fehlt"** markiert. Beschreibung dort:
„Berechnet das Verzeichnis nach Überschriften-Änderungen neu." Diese Einstufung gilt
explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert werden — im
konkreten Fall bedeutet das: bestätigen, dass die Funktion tatsächlich komplett fehlt
(nicht nur ungetestet ist), und anschließend die vollständige Umsetzung gegen die unten
stehenden Anforderungen abnehmen.

Geltungsbereich: ausschließlich die Funktion „ein bereits im Dokument vorhandenes
Inhaltsverzeichnis nach Überschriften-Änderungen neu berechnen" im gemeinsamen
DOCX/ODT-Editor (`src/formats/shared/editor/`, `src/formats/shared/schema.ts`) sowie
deren Serialisierung/Deserialisierung in `src/formats/docx/` und `src/formats/odt/`.
Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Upload unverändert → Export → Re-Import erhält Inhalt).

**Wichtige Abgrenzung zu Beginn:** Das Erzeugen eines Inhaltsverzeichnisses aus dem
Nichts ist ein **eigener** Backlog-Eintrag (`inhaltsverzeichnis-einfuegen`, ebenfalls
Priorität 1, ebenfalls als „fehlt" markiert). Diese Datei behandelt ausschließlich die
**Aktualisierung** eines bereits vorhandenen Verzeichnisses. Da „aktualisieren" aber
denklogisch voraussetzt, dass überhaupt ein Verzeichnis existiert, das aktualisiert
werden könnte, und da zum jetzigen Zeitpunkt **keine** gesonderte Anforderungsdatei
`specs/inhaltsverzeichnis-einfuegen-req.md` existiert, definiert Abschnitt 0.6 unten das
Minimum an Voraussetzung, das „einfügen" liefern muss, damit „aktualisieren" überhaupt
sinnvoll verifizierbar ist. Diese Datei schließt diese Lücke nicht selbst — sie benennt
sie nur, damit sie bei der Umsetzungsreihenfolge nicht übersehen wird.

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Kein Datenmodell für ein Inhaltsverzeichnis.** `src/formats/shared/schema.ts`
   kennt die Node-Typen `doc`, `paragraph`, `heading` (mit `level`-Attribut 1–6),
   `text`, `hard_break`, `image`, `bullet_list`, `ordered_list`, `list_item` sowie die
   Tabellen-Nodes aus `prosemirror-tables`. Es existiert **kein** `table_of_contents`-
   bzw. `toc`-Node und **kein** Attribut, das einen Absatz/Textabschnitt als
   „automatisch generierter ToC-Eintrag" markieren würde.
2. **Kein allgemeiner Feld-Mechanismus.** Weder DOCX-Felder (`w:fldSimple`,
   `w:fldChar`/`w:instrText`-Tripel) noch ODF-Felder (`text:*-field`,
   `text:table-of-content`) haben irgendeine Entsprechung im Schema. Das betrifft nicht
   nur das Inhaltsverzeichnis, sondern auch das in `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 9 als „fehlend" dokumentierte Seitenzahl-Feld — beide Funktionen bräuchten
   denselben grundlegenden Baustein „aktualisierbares, aus Dokumentzustand berechnetes
   Feld", der aktuell komplett fehlt.
3. **Kein Command.** `src/formats/shared/editor/commands.ts` enthält Commands für
   Ausrichtung, Überschriften-Zuweisung (`setHeading`), Listen, Bild- und
   Tabelleneinfügung sowie Farb-Marks — keinen `insertTableOfContents`- oder
   `updateTableOfContents`-artigen Befehl, keine Funktion, die vorhandene
   `heading`-Nodes im Dokument sammelt/durchläuft.
4. **Kein Toolbar-Button.** `Toolbar.tsx` (247 Zeilen, vollständig gelesen) hat keinen
   Eintrag „Inhaltsverzeichnis" — weder zum Einfügen noch zum Aktualisieren. Auch kein
   Kontextmenü existiert, über das ein bestehendes Element im Dokument angeklickt und
   mit einer Aktion wie „Aktualisieren" versehen werden könnte.
5. **Kein Tastatur-Shortcut.** `WordEditor.tsx` bindet in seiner `keymap({...})` nur
   `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter` (Listen-Split), `Mod-b`, `Mod-i`, `Mod-u`
   sowie `baseKeymap`. Kein `F9` (der in Word/LibreOffice Writer für „Feld
   aktualisieren" reservierte Standard-Shortcut) ist gebunden oder blockiert.
6. **Kein DOCX-Schreib-/Lesepfad.** `src/formats/docx/writer.ts` und
   `src/formats/docx/reader.ts` (beide vollständig durchsucht) enthalten keinerlei
   Behandlung von `<w:sdt>` (Structured Document Tag, der moderne Weg, wie Word ein
   ToC-Feld umschließt), keine Erzeugung/Erkennung des klassischen Feld-Tripels
   `<w:fldChar w:fldCharType="begin"/>` … `<w:instrText>TOC \o "1-3" \h \z \u</w:instrText>`
   … `<w:fldChar w:fldCharType="separate"/>` … (gecachter Anzeige­text der Einträge) …
   `<w:fldChar w:fldCharType="end"/>`, und kein Attribut `w:dirty` (mit dem Word
   markiert, dass ein Feld beim nächsten Öffnen neu berechnet werden muss).
7. **Kein ODT-Schreib-/Lesepfad.** `src/formats/odt/writer.ts` und
   `src/formats/odt/reader.ts` (beide vollständig durchsucht) enthalten keine
   Behandlung von `<text:table-of-content>`, `<text:table-of-content-source>`,
   `<text:index-title-template>`, `<text:table-of-content-entry-template>` oder
   `<text:index-body>`.
8. **Überschriften selbst sind bereits solide unterstützt** — das ist die gute
   Nachricht und die Grundlage, auf der ein ToC aufsetzen könnte: `heading`-Nodes
   tragen ein `level`-Attribut (1–6), DOCX-Reader/Writer runden über
   `w:pStyle`/`w:outlineLvl` (`src/formats/docx/reader.ts` Zeilen 48–72,
   `src/formats/docx/styleDefs.ts`), ODT-Reader/Writer über `text:outline-level`
   (`src/formats/odt/reader.ts` Zeile 171, `src/formats/odt/writer.ts` Zeile 69–73)
   korrekt. Bereits vorhandene Roundtrip-Tests (`docx/__tests__/roundtrip.test.ts`,
   `odt/__tests__/roundtrip.test.ts`, jeweils `describe('… round trip: headings')`)
   bestätigen Level- und Text-Erhalt. Ein ToC müsste also „nur" diese bereits
   vorhandenen Daten auslesen und darstellen — es fehlt jedoch jeglicher Code, der das
   tatsächlich tut.
9. **Keine Seitenzahlen-Grundlage jenseits reiner Anzeige.** Die einzige vorhandene
   Paginierung (`src/formats/shared/editor/pagination.ts`,
   `computePageBreakIndices`/`createPaginationPlugin`) berechnet Seitenumbrüche
   ausschließlich aus **gemessenen DOM-Höhen** zur Laufzeit und legt reine
   Decoration-Widgets in die Anzeige — nicht in den Dokumentinhalt. Diese Werte sind
   grundsätzlich geeignet, um daraus näherungsweise die Seitenzahl abzuleiten, auf der
   ein bestimmter `heading`-Node aktuell im Editor angezeigt wird (Zählen, wie viele
   `breakIndices` kleiner sind als der Top-Level-Index der Überschrift) — es gibt aber
   **keinen** Code, der das tut, und die Werte sind nicht deckungsgleich mit dem, was
   Word/LibreOffice selbst beim Öffnen/Drucken berechnen würden (andere Schriftmetrik,
   andere Ränder-Rundung). Siehe Abschnitt 3.7 für die daraus folgende Anforderung.
10. **Kein Test.** Es gibt keinen einzigen Treffer für „toc", „table-of-content",
    „Inhaltsverzeichnis" oder „tableOfContents" im gesamten `src`-Verzeichnis
    (durchsucht mit projektweitem Pattern-Suchlauf).

**0.6 Voraussetzung aus dem Schwester-Feature „Inhaltsverzeichnis einfügen".**
Damit „aktualisieren" isoliert verifizierbar ist, muss „einfügen" mindestens Folgendes
liefern (unabhängig davon, welches konkrete Datenmodell dafür gewählt wird — eigener
Node, Attribut-Marker auf einer Absatzgruppe, oder reine Editor-Zustandsverwaltung
außerhalb des ProseMirror-Docs):

- Eine im Dokument **wiedererkennbare** Markierung „hier beginnt/endet ein
  Inhaltsverzeichnis", die „aktualisieren" ansteuern kann, ohne den Inhalt zu raten.
- Eine gespeicherte, vom Nutzer beim Einfügen gewählte **Konfiguration** (mindestens:
  maximale Ebene/Tiefe der einzuschließenden Überschriften), die „aktualisieren"
  **respektieren**, nicht auf einen Standardwert zurücksetzen darf (siehe Grenzfall 5
  unten).
- Export als echtes Feld gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10 (`w:sdt`/Feld-
  Tripel für DOCX, `text:table-of-content` für ODT), da „aktualisieren" ansonsten kein
  Feld hätte, das es aktualisieren könnte, sondern nur normalen Text vorfände.

**Konsequenz:** Bis „einfügen" umgesetzt ist, kann „aktualisieren" nicht end-to-end
gegen eine echte, über die App selbst erzeugte Datei getestet werden. Ein Teil der
Verifikation (siehe Abschnitt 5.2, Punkte 4–5) kann und muss aber unabhängig davon
bereits gegen **reale, mit echtem Microsoft Word/LibreOffice Writer erzeugte** Dateien
erfolgen, die dort bereits ein Inhaltsverzeichnis-Feld enthalten — für diesen Fall ist
„einfügen" nicht Voraussetzung, weil das Feld schon vorhanden in die App
hineinimportiert wird.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-/Kontext-Button „Inhaltsverzeichnis aktualisieren" | Klick, sichtbar wenn Cursor innerhalb eines ToC-Elements steht oder über ein beim Hover erscheinendes Overlay direkt am ToC | **Fehlt komplett** — kein Toolbar-Eintrag, kein Kontextmenü, keine ToC-Overlay-UI in `Toolbar.tsx`/`WordEditor.tsx` | Muss ergänzt werden — mindestens ein Button, sobald der Cursor innerhalb eines ToC-Bereichs steht, mit eindeutigem, eingebettetem SVG-Icon (kein Unicode/Emoji, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1) |
| 2 | Tastenkombination F9 | Tastendruck bei Cursor innerhalb eines ToC-Bereichs (Word-/LibreOffice-Standard „Feld aktualisieren") | **Fehlt** (kein `F9`-Eintrag in der `keymap({...})` von `WordEditor.tsx`) | Soll ergänzt werden — entspricht direkter Nutzererwartung aus beiden Referenzanwendungen |
| 3 | Rechtsklick-Kontextmenü-Eintrag „Felder aktualisieren" auf dem ToC | Rechtsklick auf ein ToC-Element | Fehlt; der Editor hat aktuell ohnehin kein eigenes Kontextmenü (vgl. `seitenumbruch-req.md` Abschnitt 1, Zeile 5, dieselbe Feststellung) | Nice-to-have, **kein Blocker** für die Freigabe dieser Funktion, sofern Element 1 (Button) zuverlässig funktioniert |
| 4 | Sichtbare Rückmeldung „Verzeichnis ist aktuell" vs. „Verzeichnis wurde aktualisiert" | — (reine Rückmeldung nach Klick) | Fehlt (keine UI-Rückmeldung, da die Funktion nicht existiert) | Muss vorhanden sein — mindestens eine kurze visuelle Bestätigung, dass die Aktualisierung ausgeführt wurde (siehe Abschnitt 20.4 der Hauptspezifikation: „kein stiller Fehlschlag") |
| 5 | Auswahldialog „Nur Seitenzahlen aktualisieren" vs. „Gesamtes Verzeichnis (Struktur + Seitenzahlen) aktualisieren" | Erscheint (in Word) beim Drücken von F9/Klick auf „Feld aktualisieren", wenn mehr als nur Seitenzahlen betroffen sein könnten | Nicht anwendbar (Funktion existiert nicht) | Zu entscheiden und zu dokumentieren: entweder wird dieser Dialog nachgebildet (Word-Parität), oder es gibt bewusst nur eine einzige „Aktualisieren"-Aktion, die immer beides neu berechnet (einfacher, aber Abweichung von der Referenzanwendung ist explizit zu dokumentieren) |
| 6 | Automatische Aktualisierung beim Export | — (kein Klick, passiert implizit) | Nicht anwendbar (weder Export-Feld-Erzeugung noch Aktualisierungslogik existieren) | Muss vorhanden sein: unabhängig davon, ob die Nutzerin manuell „Aktualisieren" geklickt hat, darf eine exportierte Datei **niemals** ein Verzeichnis enthalten, das von den zu diesem Zeitpunkt tatsächlich im Dokument vorhandenen Überschriften abweicht (siehe Abschnitt 3.2) |
| 7 | Eintrag in einer künftigen Menüleiste (`Referenzen`-analoge Gruppierung, vgl. `FEATURE-BACKLOG.md` Abschnitt 5.1) | Klick | Nicht anwendbar — App hat aktuell nur eine Toolbar, keine Menüleiste | Falls künftig eine Menüleiste eingeführt wird, dort ebenfalls verfügbar machen; kein Blocker für die aktuelle Umsetzung |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus `FEATURE-SPEC-DOCX-ODT.md`,
insbesondere:

- Abschnitt 10 („Inhaltsverzeichnis"), Testfall 2: „Überschrift nachträglich
  umbenennen/hinzufügen → „Aktualisieren" spiegelt Änderung wider." — das ist die
  Kernanforderung, die diese Datei im Detail spezifiziert.
- Abschnitt 10, Testfall 6: „Rundreise: ToC exportieren, reimportieren → weiterhin als
  ToC erkannt, nicht als normaler Text zerfallen." — gilt nach jeder Aktualisierung
  unverändert, nicht nur für den unveränderten Ausgangszustand.
- Abschnitt 17 (Menü-/Toolbar-Übersicht), Zeile 9: „Inhaltsverzeichnis
  einfügen/aktualisieren — fehlt (Phase 3) — siehe Abschnitt 10."
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust bei nicht
  vollständig unterstützten Elementen" gilt sinngemäß auch hier — ein in einer
  Fremddatei enthaltenes Inhaltsverzeichnis-Feld darf beim Import nicht ersatzlos
  verschwinden oder zu reinem, nicht mehr aktualisierbarem Text degradieren.
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Klick auf ein
  Aktualisieren-Steuerelement, gefolgt von einem Klick zum Neupositionieren des
  Cursors, ist strukturell derselbe Verdachtsfall (Klick + anschließende
  Editor-Interaktion) und muss mit derselben Regressionssequenz getestet werden (siehe
  Grenzfall 9 unten).
- Abschnitt 4 (Absatzformatierung), Testfall 2/3: Formatvorlagen-Wechsel
  Überschrift ↔ Standard-Absatz ändert das Element korrekt — genau dieser Wechsel ist
  der Haupttrigger, den „aktualisieren" erkennen und im ToC nachvollziehen muss
  (Abschnitt 3.3 unten).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Ausgangslage
„Aktualisieren" setzt voraus, dass im Dokument bereits (mindestens) ein
Inhaltsverzeichnis-Element existiert — entweder durch „Inhaltsverzeichnis einfügen"
innerhalb dieser App erzeugt, oder als bestehendes Feld aus einer importierten
Fremddatei (mit echtem Word/LibreOffice erzeugt). Beide Ursprungsarten müssen von
„aktualisieren" **gleich behandelt** werden — es darf keinen funktionalen Unterschied
machen, ob das Verzeichnis „hausgemacht" oder importiert ist (siehe Abschnitt 5.2,
Punkte 4–5).

### 3.2 Auslöser der Aktualisierung
Es gibt drei voneinander unabhängige Auslöser, die alle unterstützt werden müssen:

1. **Manuell durch Nutzeraktion** — Klick auf den Button/das Kontextmenü (Abschnitt 1,
   Elemente 1–3) bzw. Tastenkombination F9 bei Cursor innerhalb des ToC-Bereichs.
2. **Implizit beim Export** — unmittelbar vor dem Serialisieren nach DOCX/ODT wird das
   Verzeichnis in jedem Fall mit dem tatsächlichen, aktuellen Zustand der Überschriften
   abgeglichen, unabhängig davon, ob die Nutzerin zwischenzeitlich manuell
   aktualisiert hat. Begründung: Ein Export darf niemals ein sichtbar veraltetes
   Verzeichnis enthalten — das wäre ein stiller Datenkonsistenzfehler, den die
   Nutzerin beim Verlassen der App nicht mehr beheben kann.
3. **Explizit NICHT bei jedem einzelnen Tastenanschlag in einer Überschrift** — eine
   Aktualisierung bei jeder Änderung wäre performanceschädlich (insbesondere bei
   Dokumenten mit vielen Überschriften, siehe Grenzfall 6) und würde außerdem dazu
   führen, dass eine noch unfertig getippte Überschrift sofort (und ggf. mehrfach
   flackernd) im Verzeichnis erscheint. Stattdessen ist eine sinnvolle Verzögerung
   (Debounce) zulässig, falls eine „live" Aktualisierung überhaupt angeboten wird —
   das ist aber **kein Muss**, die manuelle Aktualisierung (Punkt 1) und die
   Export-Aktualisierung (Punkt 2) sind die verpflichtenden Mindestauslöser.

### 3.3 Erkennung von Überschriften-Änderungen
„Aktualisieren" muss folgende Änderungsarten seit der letzten Berechnung korrekt
erfassen:

- **Neue Überschrift hinzugefügt** (an beliebiger Position, nicht nur am Ende) →
  erscheint als neuer Eintrag an der richtigen Position in der Reihenfolge.
- **Überschrift gelöscht** → zugehöriger Eintrag verschwindet, keine „Geister-Einträge".
- **Überschriftstext geändert** (umbenannt) → Eintragstext ändert sich identisch,
  Zeichen für Zeichen (inklusive z. B. nachträglich hinzugefügter Formatierung
  innerhalb der Überschrift, sofern der Eintrag Formatierung überhaupt abbildet, siehe
  3.6).
- **Überschriften-Ebene geändert** (z. B. Überschrift 2 → Überschrift 1 über das
  Absatzformat-Dropdown) → Eintrag wandert auf die entsprechend andere
  Einrückungsebene im Verzeichnis.
- **Reihenfolge geändert** (Ausschneiden+Einfügen, oder Verschieben durch Löschen und
  Neueinfügen an anderer Stelle) → Verzeichnis-Reihenfolge folgt der **tatsächlichen
  Dokumentreihenfolge** (Auftreten im `doc`), nicht der Reihenfolge einer vorherigen
  Berechnung.
- **Überschrift zu normalem Absatz zurückgestuft** (`setHeading(null)`) → Eintrag
  verschwindet vollständig aus dem Verzeichnis.
- **Normaler Absatz zu Überschrift hochgestuft** (`setHeading(level)`) → erscheint als
  neuer Eintrag.

### 3.4 Aktualisierungsumfang
Bei jeder Aktualisierung — unabhängig vom Auslöser — werden **beide** folgenden
Aspekte gemeinsam neu berechnet, sofern die App keinen Dialog zur Auswahl (Abschnitt 1,
Element 5) anbietet:

1. **Struktur/Text/Ebene der Einträge** (siehe 3.3).
2. **Seitenzahlen der Einträge**, mit der in 3.7 dokumentierten Einschränkung.

Bietet die App den Auswahldialog „Nur Seitenzahlen" vs. „Gesamtes Verzeichnis" an
(Word-Parität), muss „Nur Seitenzahlen" die Struktur/Reihenfolge/den Text der
bestehenden Einträge unangetastet lassen, selbst wenn zwischenzeitlich Überschriften
geändert wurden — das ist in Word bewusst so und darf nicht verwechselt werden mit
einem Fehler dieser App.

### 3.5 Einträge-Tiefe/Filterung
Die beim Einfügen (siehe Abschnitt 0.6) gewählte maximale Ebene (Tiefe) wird bei jeder
Aktualisierung **respektiert**, nicht auf einen Standardwert zurückgesetzt:

- Ist die konfigurierte Tiefe z. B. „bis Ebene 3", nimmt eine nachträglich hinzugefügte
  Überschrift der Ebene 4 **nicht** am Verzeichnis teil.
- Wird eine zuvor außerhalb der Tiefe liegende Überschrift nachträglich auf eine
  eingeschlossene Ebene hochgestuft (z. B. Ebene 4 → Ebene 2), erscheint sie ab der
  nächsten Aktualisierung neu im Verzeichnis.
- Die konfigurierte Tiefe selbst wird durch „aktualisieren" **nicht** verändert — dafür
  gibt es (falls überhaupt vorhanden) eine gesonderte Einstellungsmöglichkeit, die nicht
  Teil dieser Datei ist.

### 3.6 Formatierung der Einträge
- Einrückung der Einträge entspricht der Überschriften-Ebene (Ebene 1 am wenigsten
  eingerückt, höhere Ebenen zunehmend eingerückt), konsistent mit dem, was Word/
  LibreOffice mit ihren eingebauten ToC-Formatvorlagen erzeugen.
- **Bekanntes, zu dokumentierendes Verhalten (Word-/LibreOffice-Parität):** Wird der
  Text eines ToC-Eintrags direkt im Verzeichnis-Bereich manuell bearbeitet (z. B. ein
  Tippfehler „von Hand" korrigiert, ohne die zugrunde liegende Überschrift zu ändern),
  **überschreibt** eine nachfolgende Aktualisierung diese manuelle Änderung
  kommentarlos mit dem aus der Überschrift neu berechneten Text — exakt wie in Word/
  LibreOffice. Dieses Verhalten ist beizubehalten (nicht als Bug zu werten), muss aber
  in der UI erkennbar kommuniziert werden (z. B. deutlich sichtbare Kennzeichnung des
  ToC-Bereichs als „automatisch generiert, hier direkt eingegebene Änderungen gehen bei
  Aktualisieren verloren"), damit es nicht als überraschender Datenverlust erlebt wird
  (siehe Grenzfall 13).

### 3.7 Seitenzahlen in Einträgen
- **Beim Export als echtes Feld** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10): Die
  tatsächliche Seitenzahlberechnung obliegt — wie bei einem echten Word-`TOC`-Feld
  oder einem ODF-`text:table-of-content` üblich — letztlich der **Zielanwendung**
  (Word/LibreOffice selbst berechnet beim Öffnen/Drucken die korrekten Seitenzahlen
  aus ihrer eigenen, exakten Paginierung). Salamanido muss deshalb keine perfekt
  korrekte Seitenzahl vorausberechnen, um das Feld korrekt zu exportieren — es genügt
  ein gültiges, aktualisierbares Feld mit einem plausiblen (ggf. auch nur zuletzt im
  eigenen Editor berechneten) Platzhalterwert als gecachtem Anzeigetext.
- **Innerhalb der eigenen Editor-Vorschau** (bevor exportiert wird): Da
  `pagination.ts` (siehe Abschnitt 0, Punkt 9) bereits Top-Level-Block-Seitenindizes
  aus gemessenen DOM-Höhen berechnet, **kann** dieselbe Berechnung genutzt werden, um
  jedem `heading`-Node eine Editor-interne Seitenzahl zuzuordnen (Zählen der
  `breakIndices`, die kleiner sind als der Top-Level-Index der Überschrift, plus 1).
  Diese Zahl ist **explizit als Näherungswert der eigenen Anzeige** zu behandeln, nicht
  als Garantie dafür, dass Word/LibreOffice exakt dieselbe Zahl anzeigen wird
  (unterschiedliche Schriftmetrik/Randberechnung, siehe Befund 9). Diese Differenz ist
  zu dokumentieren, nicht als Bug zu werten — vorausgesetzt, das exportierte Feld ist
  ein echtes, von der Zielanwendung selbst neu berechenbares Feld (siehe oben) und
  nicht bloß hartkodierter Text (das wäre ein Bug, siehe `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 10).
- Überschriften, die strukturell nicht auf Dokument-Top-Level liegen (z. B. — sofern
  das Schema das überhaupt zulässt — innerhalb einer Tabellenzelle oder eines
  Listenpunkts, da `list_item`s Inhalt `paragraph block*` und Tabellenzellen `block+`
  erlauben), sind ein zu dokumentierender Grenzfall für die Seitenzahl-Näherung (siehe
  Grenzfall 4) — mindestens darf ein solcher Fall nicht zum Absturz der Berechnung
  führen.

### 3.8 Zusammenspiel mit der Klick-Navigation (Schwester-Feature „einfügen")
Auch wenn die Klick-Navigation selbst nicht Gegenstand dieser Datei ist
(`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10, Testfall 3, gehört zu „einfügen"), darf
„aktualisieren" bestehende Navigations-Anker (z. B. `w:bookmarkStart`/`w:bookmarkEnd`
in DOCX, `text:bookmark`/interne bzw. Abschnitts-Referenzen in ODT) nicht verwaisen
lassen:

- Wird eine Überschrift umbenannt, bleibt der Anker auf **dieselbe** Überschrift
  bestehen (Text ändert sich, Ziel-Identität nicht).
- Wird eine Überschrift gelöscht, muss der zugehörige Eintrag inklusive Anker
  vollständig entfernt werden — kein toter Verweis, der ins Leere zeigt oder beim
  Klick einen Fehler wirft.
- Wird eine Überschrift verschoben, folgt der Anker der Überschrift an ihre neue
  Position (nicht an ihre alte Position „hängen bleiben").

### 3.9 Feld-Charakter beim Export
- Nach einer Aktualisierung bleibt das Verzeichnis beim Export **weiterhin ein echtes
  Feld** (`w:sdt`/Feld-Tripel mit `w:instrText`-Anweisung in DOCX,
  `text:table-of-content` mit `text:table-of-content-source` in ODT) — die
  Aktualisierung ersetzt nur den gecachten Anzeigetext zwischen den Feld-Markern
  (DOCX) bzw. den Inhalt von `text:index-body` (ODT), nicht die Feld-Definition selbst.
- Für DOCX ist zusätzlich zu entscheiden und zu dokumentieren, ob das
  `w:dirty`-Attribut am `w:fldChar` gesetzt wird (signalisiert Word, dass es das Feld
  beim nächsten Öffnen selbst neu berechnen soll) — beide Varianten (gesetzt/nicht
  gesetzt) sind akzeptabel, solange dokumentiert, welche gewählt wurde und warum.

### 3.10 Undo/Redo
- Eine Aktualisierungsaktion (egal ob manuell oder implizit beim Export ausgelöst,
  soweit letztere Undo-relevant ist) ist **ein einziger Undo-Schritt** für die
  manuelle Variante.
- Redo stellt den aktualisierten Zustand identisch wieder her.
- Undo einer Aktualisierung darf **nicht** versehentlich die zugrunde liegenden
  Überschriften-Änderungen selbst rückgängig machen — nur die Verzeichnis-Neuberechnung
  wird zurückgenommen, der übrige Dokumentinhalt bleibt unberührt.

### 3.11 Rückmeldeverhalten (kein stiller Fehlschlag)
- Klick auf „Aktualisieren", während **kein** Inhaltsverzeichnis im Dokument
  vorhanden ist (z. B. weil Element gelöscht wurde oder nie eingefügt war): sichtbare
  Rückmeldung statt wirkungslosem Klick — entweder ein Hinweistext („Kein
  Inhaltsverzeichnis im Dokument gefunden") oder — falls so spezifiziert — automatisches
  Anlegen eines neuen Verzeichnisses an der Cursor-Position; welche Variante gewählt
  wird, ist explizit festzulegen und zu dokumentieren.
- Enthält das Dokument nach der Aktualisierung **keine** einzige (mehr) einschließbare
  Überschrift, wird das Verzeichnis sichtbar als leer dargestellt (z. B. Platzhaltertext
  „Keine Überschriften gefunden") statt entweder unverändert den alten (jetzt falschen)
  Stand zu behalten oder ersatzlos zu verschwinden.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Aktualisieren bei einem Dokument ganz ohne Überschriften | Verzeichnis wird sichtbar leer/mit Platzhaltertext dargestellt, kein Absturz, kein stiller Verbleib des vorherigen (jetzt falschen) Inhalts (siehe 3.11). |
| 2 | Aktualisieren, obwohl das Dokument gar kein ToC-Element enthält | Sichtbare Rückmeldung statt wirkungslosem Klick (siehe 3.11) — kein Klick, der einfach nichts tut. |
| 3 | Zwei (oder mehr) unabhängige Inhaltsverzeichnisse im selben Dokument | Jedes für sich aktualisierbar; Aktualisieren des einen darf Text/Struktur des anderen **nicht** verändern. |
| 4 | Überschrift strukturell innerhalb einer Tabellenzelle oder eines Listenpunkts (vom Schema her möglich, siehe 3.7) | Definiertes, dokumentiertes Verhalten (einschließen mit ggf. ungenauer Seitenzahl-Näherung, oder bewusst ausschließen) — in jedem Fall kein Crash der Berechnung. |
| 5 | Konfigurierte Tiefe „bis Ebene 3" (aus „einfügen"), nachträglich Überschrift der Ebene 5 hinzugefügt | Ebene-5-Überschrift bleibt außerhalb des Verzeichnisses; die konfigurierte Tiefe selbst bleibt unverändert bei „3" (siehe 3.5). |
| 6 | Sehr viele Überschriften (z. B. 200 in einem sehr langen Dokument) | Aktualisierung bleibt in vertretbarer Zeit abgeschlossen, UI bleibt währenddessen reaktionsfähig (kein Einfrieren), vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2 (Performance-Erwartung bei komplexen Dateien). |
| 7 | Überschrift ohne jeden Text (leerer Absatz mit Überschriften-Formatvorlage) | Definiertes, dokumentiertes Verhalten: entweder als leerer Eintrag geführt oder bewusst aus dem Verzeichnis ausgelassen — muss konsistent mit dem Verhalten der Zielanwendung (Word/LibreOffice) sein oder die Abweichung ist explizit zu begründen. |
| 8 | Mehrere Überschriften mit identischem Text (z. B. „Einleitung" erscheint zweimal auf verschiedenen Ebenen/Positionen) | Beide erscheinen als getrennte Einträge; Klick-Navigation/interne Anker (Abschnitt 3.8) referenzieren jeweils die **korrekte, eigene** Instanz, nicht immer die erste Fundstelle im Dokument. |
| 9 | Klick auf „Aktualisieren" gefolgt von einem Klick zum Neupositionieren des Cursors im Haupttext (Selection-Sync-Regressionsfall aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | Pflicht-Testsequenz: Aktualisieren darf die interne Editor-Selektion nicht in einen inkonsistenten Zustand versetzen — nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 10 | Aktualisieren wird ausgelöst, während der Cursor noch mitten im Text einer gerade bearbeiteten Überschrift steht | Definiertes Verhalten: entweder wird der aktuelle (noch unfertige) Zwischenstand der Überschrift für das Verzeichnis übernommen, oder die Aktualisierung wartet den Fokuswechsel ab — Wahl ist zu dokumentieren, Hauptsache konsistent und nicht zufällig je nach Tastentiming unterschiedlich. |
| 11 | Rückgängig machen (Strg+Z) einer Überschriften-Umbenennung, danach „Aktualisieren" klicken | Verzeichnis muss den **tatsächlichen** (durch Undo zurückgesetzten) Überschriftentext widerspiegeln, nicht einen zwischenzeitlich zwischengespeicherten Stand vor dem Undo. |
| 12 | Import einer echten, mit Microsoft Word erzeugten DOCX-Datei mit vorhandenem TOC-Feld und anschließende Überschriften-Änderung + „Aktualisieren" in Salamanido | Funktioniert identisch zu einem in Salamanido selbst erzeugten Verzeichnis (siehe 3.1) — kein Sonderverhalten nur, weil das Feld ursprünglich aus Word stammt. |
| 13 | Nutzerin hat den Anzeigetext eines ToC-Eintrags direkt manuell überschrieben und klickt danach „Aktualisieren" | Manuelle Änderung geht verloren, Eintrag wird aus der Überschrift neu berechnet — bewusstes, dokumentiertes Word-Parität-Verhalten (siehe 3.6), **nicht** als Bug zu werten, aber UI muss vorher erkennbar machen, dass der Bereich automatisch generiert ist. |
| 14 | Sprung über Ebenen hinweg (z. B. eine Ebene-1-Überschrift, direkt gefolgt von einer Ebene-4-Überschrift ohne Ebene 2/3 dazwischen) | Einrückung entspricht weiterhin exakt der jeweiligen Ebene (Ebene 4 stärker eingerückt als Ebene 1), es werden **keine** künstlichen Zwischenebenen-Einträge erzeugt. |
| 15 | Löschen einer Überschrift, die zuvor Ziel eines Klick-Navigations-Sprungs war, gefolgt von „Aktualisieren" | Zugehöriger Eintrag verschwindet vollständig, kein toter Verweis, kein Absturz bei einem eventuell noch offenen/gecachten Sprungziel. |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`seitenumbruch-req.md` Abschnitt 5 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht kaputtgehen)
1. Reale DOCX-Datei **ohne** jedes Inhaltsverzeichnis unverändert hochladen (kein
   Klick, keine Eingabe) → sofort exportieren → erneut importieren → Inhalt entspricht
   inhaltlich dem Original, insbesondere entsteht **kein** Verzeichnis „aus dem
   Nichts" (z. B. durch versehentliche automatische Erzeugung beim Export, siehe
   Abschnitt 3.2, Punkt 2 — dieser Punkt betrifft ausdrücklich nur das
   **Aktualisieren** eines vorhandenen Verzeichnisses, nicht dessen ungefragtes
   Neu-Anlegen).
2. Dasselbe mit einer realen ODT-Datei.
3. Reale DOCX-Datei **mit** einem echten, mit Microsoft Word erzeugten TOC-Feld
   unverändert hochladen (kein Klick auf „Aktualisieren") → sofort exportieren →
   erneut importieren → Feld bleibt inhaltlich und als Feld (nicht als degradierter
   Text) identisch erhalten — reine Grundlagen-Rundreise, bevor die
   Aktualisierungs-Funktion überhaupt betätigt wird.
4. Dasselbe mit einer realen, mit LibreOffice Writer erzeugten ODT-Datei mit
   vorhandenem `text:table-of-content`.
5. Alle vier Prüfungen müssen weiterhin grün sein, nachdem Schema, Writer und Reader
   um die neue Funktion erweitert wurden (kein neuer Node-Typ/kein neues Attribut darf
   beim reinen Reimport unbeteiligter Dateien ungewollt auftauchen).

### 5.2 Feature-Rundreise (Aktualisieren selbst)
Für jede der folgenden Situationen: Überschriften ändern → Verzeichnis über
Toolbar/Shortcut/Export-Trigger aktualisieren → Dokument als DOCX exportieren →
reimportieren → aktualisierter Verzeichnisinhalt **und** die geänderten Überschriften
selbst bleiben erhalten; **und** identisch als ODT; **und** zusätzlich Cross-Format:

1. In einem Dokument mit vorhandenem Verzeichnis (aus „einfügen" oder aus
   importierter Fremddatei, siehe Abschnitt 0.6) eine Überschrift umbenennen →
   aktualisieren → Export DOCX → Reimport → Verzeichnis zeigt den neuen Text, bleibt
   weiterhin als echtes, aktualisierbares Feld erkennbar (nicht als statischer Text
   degradiert, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10, Testfall 6).
2. Dasselbe als ODT.
3. Neue Überschrift hinzufügen (nicht nur umbenennen) → aktualisieren → Rundreise
   erhält den neuen Eintrag an der richtigen Position, für DOCX und ODT.
4. Überschrift löschen → aktualisieren → Rundreise zeigt den entsprechend
   verkürzten Eintrags-Bestand, für DOCX und ODT.
5. Cross-Format DOCX → ODT → DOCX: aktualisiertes Verzeichnis bleibt über beide
   Konvertierungen hinweg als echtes Feld mit korrektem Inhalt erhalten (keine
   kumulative Verschlechterung).
6. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
7. **Import einer echten, mit Microsoft Word erzeugten DOCX-Datei** mit bereits
   vorhandenem TOC-Feld und mehreren echten Überschriften → in Salamanido eine
   Überschrift umbenennen und eine neue hinzufügen → „Aktualisieren" klicken → Export
   → Reimport → Verzeichnis spiegelt beide Änderungen wider, bleibt als Feld
   erkennbar.
8. Dasselbe mit einer echten, mit LibreOffice Writer erzeugten ODT-Datei.
9. Dokument mit zwei unabhängigen Verzeichnissen (Grenzfall 3) → Aktualisieren des
   einen → Rundreise bestätigt, dass nur dieses eine verändert wurde, das zweite
   unverändert blieb.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
sind wie im Rest der Spezifikation zu dokumentieren und akzeptabel (z. B. leichte
Abweichungen bei der intern berechneten Seitenzahl-Näherung, siehe 3.7);
**das vollständige Verschwinden eines Verzeichnisses, eines Eintrags oder von
Überschriften-Text ist es nicht** — weder bei 5.1 noch bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX:** gegebenes internes ToC-Element mit gegebenem Überschriften-Satz
   → Writer erzeugt eine gültige `w:sdt`/Feld-Tripel-Struktur mit korrektem
   `w:instrText` (`TOC \o "1-<Tiefe>" \h \z \u` oder äquivalent) und korrektem
   Anzeigetext zwischen den Feld-Markern; umgekehrt: gegebenes XML mit einem
   vorhandenen TOC-Feld → Reader erzeugt das erwartete interne Verzeichnis-Element mit
   korrekt erkannten Einträgen.
2. **Unit-Tests ODT:** gegebenes internes ToC-Element → Writer erzeugt gültiges
   `text:table-of-content` mit `text:table-of-content-source` (korrekte
   `text:outline-level`-Obergrenze) und befülltem `text:index-body`; umgekehrt:
   gegebenes ODT-XML mit vorhandenem `text:table-of-content` → Reader erzeugt das
   erwartete interne Verzeichnis-Element.
3. **Unit-Test „Aktualisieren"-Logik (formatunabhängig):** gegebener ProseMirror-`doc`
   mit einer Menge `heading`-Nodes und einem vorhandenen internen ToC-Element mit
   veraltetem Eintrags-Stand → Aufruf der Aktualisierungsfunktion → resultierendes
   ToC-Element enthält exakt die aktuellen Überschriften in Dokumentreihenfolge, mit
   korrekten Ebenen — unabhängig von Reader/Writer, rein auf Datenmodell-Ebene
   getestet (analog zur Trennung Datenmodell/Format in
   `src/formats/shared/__tests__`).
4. **E2E-Test (Playwright):** Dokument mit vorhandenem Verzeichnis im Editor öffnen,
   eine Überschrift per Toolbar/Tippen ändern, auf den „Aktualisieren"-Button klicken
   bzw. `F9` drücken → prüfen, dass der im DOM sichtbare Verzeichnistext sich
   entsprechend ändert.
5. **Regressionstest-Pflicht:** jeder E2E-Test aus Punkt 4 muss direkt im Anschluss
   eine Tipp- oder Formatierungsaktion im Haupttext ausführen und deren korrektes
   Ergebnis prüfen (Selection-Sync-Regressionsschutz, siehe Grenzfall 9 und
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) — nicht nur den unmittelbaren Zustand nach
   dem Klick selbst.
6. **Reale Test-Fixtures:** mindestens eine mit echtem Microsoft Word erzeugte
   DOCX-Datei und eine mit echtem LibreOffice Writer erzeugte ODT-Datei, die jeweils
   ein Inhaltsverzeichnis-Feld über mehrere echte Überschriften enthalten, sind ins
   Test-Fixture-Verzeichnis aufzunehmen (laut aktueller Repo-Durchsicht nicht
   vorhanden) — rein synthetisch konstruiertes Test-XML reicht nicht aus, um reale
   Word-/LibreOffice-Eigenheiten (z. B. exaktes `w:instrText`-Format, verschachtelte
   `w:sdt`-Struktur) abzudecken (analoges Prinzip wie in `seitenumbruch-req.md`
   Abschnitt 6, Punkt 5, und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).
7. **Export-Trigger-Test:** Dokument mit vorhandenem, absichtlich veraltetem
   Verzeichnis (Überschrift nach letzter manueller Aktualisierung geändert, aber
   „Aktualisieren" nicht geklickt) direkt exportieren (ohne vorherigen Klick auf
   „Aktualisieren") → exportierte Datei enthält dennoch den aktuellen Stand (Abschnitt
   3.2, Punkt 2) — eigener Testfall, da dieser Auslöser leicht vergessen wird, wenn nur
   der manuelle Button getestet wird.
8. Rundreise-Tests (Abschnitt 5) sind sowohl als Unit-Tests gegen Reader/Writer **als
   auch** als E2E-Test über echte Bedienung (Toolbar-Klick/Shortcut → echter
   Datei-Download → echter Re-Upload) zu führen — reine Unit-Tests mit direkt
   konstruierten ProseMirror-JSON-Fixtures allein reichen nicht aus (vgl.
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `inhaltsverzeichnis-aktualisieren` darf erst dann als
**vorhanden** (unqualifiziert) gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 tatsächlich existieren und funktionieren
  (mindestens Button/Kontext-Steuerelement, Tastenkombination F9, sichtbare
  Rückmeldung, Export-Trigger),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert
  / bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) durch die neue Funktion nicht gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide Cross-Format-Richtungen
  besteht, inklusive der beiden realen Fixture-Dateien aus echtem Word/LibreOffice
  (Punkte 7–8),
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Aktualisieren-Klick-Sequenz nachgestellt
  und grün ist,
- die Abhängigkeit vom Schwester-Feature „Inhaltsverzeichnis einfügen" (Abschnitt 0.6)
  entweder erfüllt ist (Feature existiert und liefert die dort genannten
  Voraussetzungen) oder — falls „einfügen" noch nicht umgesetzt ist — die Verifikation
  ausdrücklich auf importierte Fremddateien mit vorhandenem Feld beschränkt und dies
  im Abnahmeprotokoll vermerkt wird, statt den Status stillschweigend auf „vorhanden"
  zu setzen, obwohl ein Teil der Funktion mangels Gegenstück nicht end-to-end
  selbst erzeugt werden konnte.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md` Abschnitt 7).
