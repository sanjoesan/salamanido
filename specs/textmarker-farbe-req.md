# Anforderungsspezifikation: Feature „Texthervorhebungsfarbe (Textmarker)“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Zeile 102, Slug `textmarker-farbe`, Abschnitt 2.2
„Zeichenformatierung“) als **vorhanden** geführt (Priorität 1/essenziell),
Beschreibung dort: „Freie Farbwahl für die Hintergrund-Hervorhebung der Selektion.“
Diese Datei ersetzt die Beschreibung nicht, sondern macht sie so detailliert und
einzeln abhakbar, dass ein QA-Agent jeden Punkt über echte Browser-Bedienung
(nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Ausschließlich das Zeichenformat „Hervorhebungsfarbe“
(`highlight`-Mark im gemeinsamen ProseMirror-Schema, `src/formats/shared/schema.ts`).
Nicht Teil dieser Anforderung: das strukturell identische, aber inhaltlich andere
Feature „Schriftfarbe“ (`textColor`-Mark) — dieses wird in einer eigenen
Anforderungsdatei behandelt, auch wenn beide dieselbe generische Toolbar-/Command-
Infrastruktur (`applyMarkColor`/`clearMarkColor`, `ColorMarkName`) teilen. Gilt für
**beide** Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als
auch beim Export eines im Editor erstellten/bearbeiteten Dokuments — inklusive
Rundreise (Datei hochladen → unverändert exportieren → Ergebnis entspricht
inhaltlich dem Original). Stil und Gliederung orientieren sich an
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` bzw. `specs/fett-req.md`.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein**
Nachweis der Korrektheit — das ist Aufgabe der Verifikation):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:141-147` | Mark `highlight`, Attribut `color: string` (keine Formatvalidierung außer „ist ein String“), `parseDOM` erkennt beliebige CSS `background-color`-Werte, `toDOM` rendert `<span style="background-color: …">` |
| `src/formats/shared/editor/Toolbar.tsx:162-170` | Farbwähler: `<label>` mit Emoji `🖍` (`aria-hidden`) und `<input type="color" aria-label="Hervorhebungsfarbe">`, `onChange` ruft `applyMarkColor('highlight', e.target.value)`. **Kein gebundener `value`** — das Element zeigt nie die tatsächlich an Cursor/Selektion vorhandene Farbe an |
| `src/formats/shared/editor/Toolbar.tsx:171-181` | „Entfernen“-Button, Glyph `⌫` (Unicode-Zeichen, kein SVG), ruft `clearMarkColor('highlight')` auf |
| `src/formats/shared/editor/commands.ts:88-106` | `ColorMarkName = 'textColor' \| 'highlight'`; `applyMarkColor`/`clearMarkColor` sind generisch für beide Farb-Marks; **beide brechen mit `return false` ab, wenn `state.selection.empty` ist** — es gibt keinen „Schreibmarken-Modus“ wie bei Fett/Kursiv |
| `src/formats/shared/editor/WordEditor.tsx:71-80` | Keymap enthält `Mod-b`/`Mod-i`/`Mod-u`, aber **keine** Tastenkombination für Hervorhebungsfarbe |
| `src/formats/docx/reader.ts:99-114` (`marksFromRunProperties`) | DOCX-Import liest **ausschließlich** `<w:shd w:fill="…">` aus `w:rPr` (Zeile 110-112, `fill !== 'auto'` → Mark `highlight`). Das eigentliche, von Word beim Klick auf „Text hervorheben“ erzeugte Element `<w:highlight w:val="…"/>` wird **an keiner Stelle im Reader ausgewertet** |
| `src/formats/docx/writer.ts:18-31` (`runPropertiesXml`) | DOCX-Export schreibt für `highlight` ausschließlich `<w:shd w:val="clear" w:color="auto" w:fill="RRGGBB"/>` (Zeile 26-28); `<w:highlight>` wird nie erzeugt |
| `src/formats/odt/reader.ts:47-61,92` | ODT-Import: `fo:background-color` in `style:text-properties` eines `text`-Familien-Styles → Mark `highlight` |
| `src/formats/odt/writer.ts:25-36` (`runPropsFromMarks`) | ODT-Export: Mark `highlight` → `props.highlight` |
| `src/formats/odt/styleRegistry.ts:9,13,57` | `fo:background-color="…"` in erzeugter `style:text-properties`; `TextStyleRegistry` dedupliziert je Markkombination (`T1`, `T2`, …) |
| `specs/FEATURE-BACKLOG.md:102` | Backlog-Eintrag `textmarker-farbe`, Status „vorhanden“, Priorität 1 |
| `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3 (Zeile 94) | „Hervorhebungsfarbe (Textmarker) — Freie Farbwahl, editierbar/entfernbar“ |
| `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17, Zeile 356 | „Textfarbe / Hervorhebung + „Entfernen“-Buttons — vorhanden — funktional prüfen, „Entfernen“-Symbol (⌫) ebenfalls auf Rendering prüfen“ |
| `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1, Zeile 442 | Emoji-Icons `🖍` und `⌫` explizit als Rendering-Risiko gelistet |
| `src/formats/docx/__tests__/roundtrip.test.ts:94-109` | Vorhandener, aber laut Auftrag **nicht vertrauenswürdiger** Unit-Test „preserves text color and highlight color“ — arbeitet mit direkt konstruierten `ProseMirrorJSON`-Testdaten, nicht über echte Editor-/Toolbar-Bedienung |
| `src/formats/odt/__tests__/roundtrip.test.ts:94-109` | Analoger Unit-Test für ODT |
| `tests/e2e/*.spec.ts` | **Keine einzige** der vorhandenen E2E-Dateien (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`, `selection-regression.spec.ts`) erwähnt Farbe/Hervorhebung überhaupt — es existiert aktuell **kein** E2E-Test für dieses Feature |
| `tests/fixtures/external/odt/` | Reale Fremddateien mit potenziell relevantem Hintergrund-/Hervorhebungs-Bezug bereits im Repo vorhanden, u. a. `coloredParagraph.odt`, `character-styles.odt`, `lostBackground.odt` (Name legt einen bereits bekannten Problemfall nahe), `TableFunkyBackground.odt`, `text-color-from-paragraph.odt`, `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt` |
| `tests/fixtures/external/docx/` | Kein Fixture-Dateiname deutet spezifisch auf Hervorhebung hin — vor Verifikation stichprobenartig prüfen, welche der ca. 100 Dateien tatsächlich `w:highlight` oder `w:shd` auf Run-Ebene enthalten |

---

## 1. Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Farbwähler „Hervorhebungsfarbe“ (`🖍`) | `Toolbar.tsx:162-169`, natives `<input type="color">` | Öffnet den systemeigenen (browser-/OS-abhängigen) Farbwahl-Dialog; `onChange` wendet die Farbe sofort auf die aktuelle Selektion an; **kein `value`-Binding**, zeigt also nie die tatsächlich vorhandene Hervorhebungsfarbe der Selektion an, sondern startet immer beim zuletzt intern vom Browser gemerkten bzw. Standardwert | Muss den tatsächlichen Zustand widerspiegeln: Farbvorschau entspricht der Farbe an der Selektion (bzw. an `$from`, analog zu `MarkButton`s `aria-pressed`), erkennbarer Zustand „keine Hervorhebung“ und erkennbarer Zustand „gemischte Farben in der Selektion“ (siehe Grenzfall 3.2) |
| 2 | „Entfernen“-Button (`⌫`) | `Toolbar.tsx:171-181` | Ruft `clearMarkColor('highlight')` auf; wirkt nur bei nicht-leerer Selektion, sonst stiller No-Op (kein Fehler, keine Rückmeldung) | Muss deaktiviert sein oder eine sichtbare Rückmeldung geben, wenn keine Selektion vorhanden ist (siehe FEATURE-SPEC Abschnitt 20 Punkt 4 „Kein stiller Fehlschlag“) |
| 3 | Tastenkombination | nicht vorhanden (`WordEditor.tsx:71-80` enthält nur `Mod-b`/`Mod-i`/`Mod-u`) | Keine Möglichkeit, Hervorhebungsfarbe per Tastatur zu setzen/entfernen | Zu klären, ob eine Tastenkombination erwartet wird (Backlog fordert nur „freie Farbwahl“, kein Shortcut) — falls nicht gefordert, explizit als bewusste Lücke dokumentieren statt stillschweigend fehlend zu lassen |
| 4 | Icon-Rendering (`🖍`, `⌫`) | `Toolbar.tsx:163,180`, reine Unicode-Emoji/-Zeichen, kein SVG | Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 als Risiko dokumentiert: auf Systemen ohne Emoji-Schriftart ggf. nicht erkennbar | Muss auf mind. einem System ohne Standard-Emoji-Unterstützung geprüft werden; `aria-label`/`title` sind vorhanden und mildern das Risiko für Screenreader, nicht aber für rein visuelle Erkennbarkeit |
| 5 | Aktiver-Zustand-Anzeige generell | nicht vorhanden — kein `aria-pressed`, keine CSS-Klasse analog zu `MarkButton` (`Toolbar.tsx:53-57`) | Im Gegensatz zu Fett/Kursiv/Unterstrichen/Durchgestrichen gibt es für Hervorhebungsfarbe **keinerlei** visuelle Kennzeichnung „ist an dieser Stelle bereits aktiv“ | Muss spezifiziert und nachgerüstet oder als bewusst nicht vorhandenes Verhalten dokumentiert werden |
| 6 | Kontextmenü (Rechtsklick) | nicht vorhanden | — | Wie bei Fett: nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren |
| 7 | Reihenfolge in der Toolbar | `Toolbar.tsx:140-183` | Hervorhebungsfarbe steht direkt nach Schriftfarbe, vor dem Trenner zu den Ausrichtungs-Buttons | Rein informativ — bei Änderungen an der Toolbar-Reihenfolge muss dieses Feature mitgeprüft werden |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf bestehende Selektion
- Ist mindestens ein Zeichen markiert → die gesamte Selektion erhält die gewählte
  Hervorhebungsfarbe (`commands.ts:90-97`, `addMark(from, to, …)`).
- War die Selektion zuvor **einheitlich** mit einer anderen Farbe hervorgehoben →
  die alte Farbe wird vollständig durch die neue ersetzt (ProseMirror schließt
  gleichnamige Marks standardmäßig gegenseitig aus, `highlight` hat kein
  explizites `excludes` in `schema.ts:141-147`, greift also der Default „schließt
  sich selbst aus“) — muss mit Testfall verifiziert werden, nicht nur angenommen.
- War die Selektion **gemischt** (teils andere Farbe, teils keine Hervorhebung) →
  siehe Grenzfall 3.2: definiertes Ergebnis (gesamte Selektion einheitlich neue
  Farbe) muss nachgewiesen werden.
- Die Aktion ist ein einzelner Undo-Schritt pro tatsächlich abgeschlossener
  Farbwahl (siehe 2.8 zur Event-Granularität des nativen Farbwählers).

### 2.2 Keine Anwendung an der Schreibmarke (bewusste Bereichsentscheidung)
- Anders als bei Fett/Kursiv/Unterstrichen/Durchgestrichen gibt es **keinen**
  „vorgemerkten Mark für zukünftige Eingabe“-Modus: `applyMarkColor`/
  `clearMarkColor` geben bei leerer Selektion sofort `false` zurück
  (`commands.ts:93,101`), es passiert nichts.
- Das deckt sich mit der Backlog-Formulierung „Hintergrund-Hervorhebung **der
  Selektion**“ (nicht „der Schreibmarke“) und ist damit vermutlich beabsichtigt,
  nicht aber irgendwo explizit als Absicht dokumentiert — muss bestätigt und
  hier nachgetragen werden.
- Unabhängig von der fachlichen Absicht: Das Fehlen jeder Rückmeldung bei diesem
  No-Op verstößt gegen den allgemeinen Grundsatz „kein stiller Fehlschlag“
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4) und muss behoben oder als
  bewusste Ausnahme begründet werden.

### 2.3 Anzeige des aktiven Zustands
- Aktuell zeigt weder der Farbwähler noch ein anderes Element an, ob und mit
  welcher Farbe der Text an der Cursor-Position/Selektion bereits hervorgehoben
  ist (siehe Bedienelement 1 und 5).
- Zu spezifizieren: Soll der Farbwähler beim Fokussieren/bei Cursorbewegung die
  aktuelle Farbe laden (analog zu `MarkButton`s `aria-pressed`, aber für einen
  Farbwert statt eines Booleans)? Wie soll eine gemischte Selektion dargestellt
  werden (z. B. kein vorausgewählter Wert, ein neutraler Zustand, ein Hinweistext)?
- Diese Klärung ist Voraussetzung, bevor der Status „vorhanden“ als
  vertrauenswürdig gelten kann, weil ohne sie Nutzer:innen nicht zuverlässig
  erkennen können, ob eine Selektion bereits (und mit welcher Farbe) markiert ist.

### 2.4 Kombination mit anderen Zeichenformaten
- Hervorhebungsfarbe lässt sich gleichzeitig mit Fett, Kursiv, Unterstrichen,
  Durchgestrichen und Schriftfarbe auf denselben Textlauf anwenden; keines der
  anderen Marks darf beim Setzen/Ändern/Entfernen der Hervorhebungsfarbe entfernt
  oder verändert werden (marks sind in ProseMirror unabhängig voneinander, sofern
  kein `excludes` zwischen ihnen definiert ist — für `highlight`/`textColor`
  ist keines gesetzt).
- Reihenfolge des Anwendens (z. B. erst Schriftfarbe, dann Hervorhebungsfarbe,
  oder umgekehrt) darf zu keinem unterschiedlichen Endergebnis führen.

### 2.5 Zusammenspiel mit Schriftfarbe (Kontrast)
- Schriftfarbe (Vordergrund, `textColor`) und Hervorhebungsfarbe (Hintergrund,
  `highlight`) sind vollständig unabhängige Marks ohne jede automatische
  Kontrastprüfung oder -anpassung.
- Werden beide auf denselben Text mit ähnlicher/identischer Farbe angewendet
  (z. B. schwarze Schrift auf schwarzer Hervorhebung), wird der Text im Editor
  und nach Export faktisch unlesbar — kein technischer Fehler, aber ein zu
  dokumentierender UX-Grenzfall (siehe 3.9).

### 2.6 Entfernen der Hervorhebung
- „Entfernen“ löscht das `highlight`-Mark vollständig aus dem gewählten Bereich
  (`commands.ts:99-106`, `removeMark`), unabhängig davon, welche Farbe(n) zuvor
  vorhanden waren — auch bei gemischten Farben innerhalb der Selektion wird der
  gesamte Bereich hervorhebungsfrei.
- Zu unterscheiden von „Hervorhebungsfarbe auf Weiß setzen“: Weiß ist eine
  gewöhnliche, explizit gespeicherte Farbe (`color: '#ffffff'`), keine
  Sondermarkierung für „keine Hervorhebung“ — beide Zustände müssen bei
  Rundreise unterscheidbar bleiben (siehe Grenzfall 3.6).

### 2.7 Zwischenablage / Kopieren & Einfügen
- Kopieren von hervorgehobenem Text innerhalb des Editors und Einfügen an
  anderer Stelle behält das `highlight`-Mark samt Farbwert.
- Einfügen von extern kopiertem Text mit inline `background-color`-Style (z. B.
  aus einer Webseite) wird als `highlight`-Mark erkannt (`schema.ts:143`,
  `parseDOM` auf CSS-Eigenschaft `background-color`) — **ungeprüft, welcher Wert
  das ist** (kein Regex/Format-Check, siehe Grenzfall 3.9 zu Named Colors/`rgba()`).
- Einfügen von Text mit `background-color: transparent` bzw. ganz ohne
  Hintergrundfarbe erzeugt erwartungsgemäß **kein** `highlight`-Mark.

### 2.8 Undo/Redo und Event-Granularität des Farbwählers
- Anwenden einer Hervorhebungsfarbe soll — wie bei Fett — einen einzelnen,
  eigenständigen Undo-Schritt erzeugen.
- Risiko: `<input type="color">` ist ein natives Browser-Element; je nach
  Browser/Betriebssystem kann das native `input`-Event (an das React `onChange`
  bindet) bereits **während** des Ziehens im systemeigenen Farbrad mehrfach
  feuern, bevor der Dialog geschlossen wird. Jedes Feuern löst in der aktuellen
  Implementierung sofort `applyMarkColor` und damit eine eigene
  ProseMirror-Transaktion aus. Ergebnis wäre eine Kette mehrerer Undo-Schritte
  für eine von der Nutzerin als **eine** Aktion wahrgenommene Farbwahl — muss
  browserübergreifend (mind. Chromium- und Firefox-basiert) geprüft werden.
- Redo stellt die zuletzt entfernte/geänderte Farbe korrekt wieder her.

---

## 3. Grenzfälle

1. **Leere Selektion (nur Cursor):** Farbe wählen oder „Entfernen“ klicken →
   aktuell vollständiger, unbemerkter No-Op (siehe 2.2). Muss geklärt werden:
   Steuerelemente deaktivieren, oder sichtbare Rückmeldung („bitte zuerst Text
   markieren“), statt stillschweigend nichts zu tun.
2. **Gemischte Selektion:** Selektion enthält Text mit unterschiedlichen
   bestehenden Hervorhebungsfarben und/oder gar keiner Hervorhebung → definiertes
   Verhalten (gesamte Selektion erhält einheitlich die neu gewählte Farbe) muss
   mit Testfall nachgewiesen werden; zusätzlich zu klären, was der Farbwähler in
   diesem Moment anzeigen soll (siehe 2.3).
3. **Hervorhebung über eine Bild-/Tabellengrenze hinweg:** Selektion, die Text,
   ein Bild und/oder eine Tabellenzelle umfasst (z. B. Strg+A über gemischten
   Inhalt) → darf nicht abstürzen; Hervorhebung wird nur auf textuelle
   Inline-Inhalte angewendet.
4. **Kontrastproblem:** Hervorhebungsfarbe ≈ Schriftfarbe bzw. ≈ Papierfarbe →
   kein Absturz, aber optisch unlesbarer Text; mindestens dokumentieren, ob dies
   bewusst der Verantwortung der Nutzerin überlassen bleibt (wie in echten
   Textverarbeitungen üblich) oder ob ein Warnhinweis erwartet wird.
5. **Erneutes Setzen derselben Farbe:** Wahl einer Farbe, die bereits exakt so
   auf der Selektion vorhanden ist → darf keinen Fehler verursachen; zu klären,
   ob ein „leerer“ Undo-Schritt entstehen darf oder vermieden werden muss.
6. **Hervorhebungsfarbe „Weiß“ bzw. Farbe identisch zur Papierfarbe:** Muss bei
   Rundreise weiterhin als **explizit gesetzte** Farbe erhalten bleiben und darf
   nicht mit dem Zustand „keine Hervorhebung“ verwechselt werden (weder beim
   Import noch beim Export) — siehe 2.6.
7. **Import einer echten, mit Microsoft Word erzeugten Datei, in der über das
   native Word-Werkzeug „Text hervorheben“ eine Farbe gesetzt wurde**
   (`<w:highlight w:val="yellow"/>` o. ä. in `w:rPr`, **nicht** `<w:shd>`):
   Der DOCX-Reader wertet ausschließlich `<w:shd w:fill="…">` aus
   (`docx/reader.ts:110-112`) und kennt `<w:highlight>` überhaupt nicht.
   **Verdacht: Diese Hervorhebung geht beim Import vollständig und unsichtbar
   verloren, ohne Fehlermeldung.** Das widerspricht dem Grundsatz aus
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 „ein Import darf niemals dazu führen,
   dass sichtbarer Inhalt der Originaldatei ersatzlos verschwindet“ — sichtbarer
   Inhalt hier ist zwar kein Text, aber eine für die Nutzerin bedeutungstragende
   Formatierung. Muss mit einer echten, in Word/LibreOffice erzeugten Testdatei
   verifiziert und das Ergebnis hier nachgetragen werden.
8. **Export-Kompromiss `w:shd` statt `w:highlight`:** Das native `<w:highlight>`
   von Word erlaubt nur eine feste Palette von ca. 15 Farben und ist daher mit
   der geforderten „freien Farbwahl“ unvereinbar — die App weicht bewusst (oder
   zumindest faktisch) auf `<w:shd>` (Schattierung) aus. Beim Öffnen einer
   exportierten Datei in echtem Word wird das „Text hervorheben“-Werkzeug für
   diesen Text vermutlich **nicht** als aktiv angezeigt, weil Word ein anderes
   XML-Element abfragt — visuell sieht es identisch aus, ist aber eine andere
   Word-Funktion. Muss mit echtem Word (oder einem gleichwertigen Prüfwerkzeug)
   verifiziert und als bewusster, dokumentierter Kompromiss festgehalten werden,
   nicht als unklarer Bug.
9. **Einfügen von extern kopiertem HTML mit CSS-Farbnamen oder `rgba()`:** z. B.
   `background-color: yellow` oder `background-color: rgba(255,255,0,0.4)`.
   `schema.ts:143` übernimmt den Rohwert ungeprüft (`validate: 'string'`, keine
   Format-/Regex-Prüfung). Beim DOCX-Export verarbeitet `writer.ts:26-28` diesen
   Wert nur mit `.replace('#', '')` und schreibt ihn direkt in `w:fill` — ein
   Wert wie „yellow“ oder ein `rgba(...)`-String ergibt ein laut OOXML-Schema
   **ungültiges** `w:fill`-Attribut (zulässig sind nur Hex-RRGGBB oder „auto“).
   Muss geprüft werden, ob eine Normalisierung/Validierung vor dem Export
   existiert (aktuell laut Codelage nicht) oder ob dieser Datenverlust-/
   Ungültigkeits-Pfad zumindest bekannt und dokumentiert ist.
10. **Entfernen in leerem Listenpunkt/leerer Tabellenzelle:** Umschalten ohne
    Text davor/danach → darf keinen Rendering-Fehler oder leeren
    `<w:r>`/`<text:span>` ohne Inhalt im Export erzeugen.
11. **Schnelles Ziehen im nativen Farbwähler:** siehe 2.8 — mögliche
    Mehrfachtransaktionen/-Undo-Schritte für eine wahrgenommene Aktion.
12. **Hervorhebungsfarbe = Schriftfarbe (Text de facto unsichtbar):** kein
    technischer Fehler, aber zu dokumentierender UX-Grenzfall (siehe 2.5).
13. **ODT: Absatz-Hintergrund vs. Zeichen-Hervorhebung:** `fo:background-color`
    kann in ODF sowohl auf `style:text-properties` (Zeichen-Hervorhebung, das,
    was dieses Feature abbildet) als auch auf `style:paragraph-properties`
    (Absatzhintergrund, ein anderes, hier nicht implementiertes Feature)
    vorkommen. `odt/reader.ts:47-66` behandelt beide Style-Familien getrennt und
    liest `background-color` nur aus der `text`-Familie — muss mit einer echten
    Datei verifiziert werden, die **nur** einen Absatzhintergrund (ohne
    Zeichen-Hervorhebung) enthält, damit keine Verwechslung stattfindet.
14. **Wiederholtes Entfernen ohne vorheriges Setzen:** „Entfernen“ auf eine
    Selektion ohne jede Hervorhebung → `removeMark` ist ein No-Op auf
    ProseMirror-Ebene, darf aber ebenfalls keinen leeren Undo-Schritt oder
    Fehler erzeugen.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Datei mit Hervorhebungsfarbe hochladen
(bzw. im Editor erzeugen) → **unverändert** exportieren → erneut importieren →
Hervorhebung ist inhaltlich exakt erhalten (gleiche Textstelle, gleicher
Farbwert, kein Verlust, keine zusätzliche/fehlende Hervorhebung an anderer
Stelle).

### 4.1 DOCX
1. Im Editor Text markieren, Hervorhebungsfarbe (z. B. `#ffff00`) setzen, als
   DOCX exportieren → mit einem unabhängigen Parser (z. B. python-docx oder
   direktes Parsen von `word/document.xml`) verifizieren, dass exakt
   `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>` im `w:rPr` des
   betroffenen Runs steht, kein anderer Run fälschlich mitbetroffen ist.
2. Dieselbe Datei erneut importieren → Farbe exakt (`#ffff00`) an derselben
   Textstelle wiederhergestellt, restlicher Text weiterhin ohne Hervorhebung.
3. Hervorhebungsfarbe + Fett + Schriftfarbe gleichzeitig auf denselben Textlauf
   → Rundreise erhält alle drei Merkmale gemeinsam auf demselben Textlauf, nicht
   versehentlich auf getrennte Runs aufgeteilt.
4. Hervorhebung entfernt (vormals hervorgehobener Text wird wieder normal) →
   Export enthält für diesen Run **kein** `<w:shd>` mehr.
5. **Kritischer Test (siehe Grenzfall 3.7):** reale, mit echtem Microsoft
   Word/LibreOffice erzeugte DOCX-Datei mit über das native Hervorhebungs-
   Werkzeug (`<w:highlight>`) gesetzter Farbe importieren → Ergebnis
   dokumentieren (bleibt erhalten oder geht wie vermutet verloren) und
   Konsequenz festlegen (Unterstützung nachrüsten oder Verlust bewusst in Kauf
   nehmen und dokumentieren).
6. Hervorgehobenes Wort, das einen `hard_break` einschließt → Hervorhebung
   bleibt auf beiden Seiten des Umbruchs erhalten.
7. Cross-Format: ODT mit Hervorhebung importieren → als DOCX exportieren →
   Farbe bleibt erhalten (wird korrekt als `<w:shd>` aus dem internen Mark
   erzeugt, unabhängig vom Ursprungsformat).

### 4.2 ODT
1. Im Editor Text markieren, Hervorhebungsfarbe setzen, als ODT exportieren →
   `content.xml` enthält eine automatische Text-Formatvorlage mit
   `fo:background-color="…"` (`style:family="text"`), referenziert über
   `text:style-name` auf dem betroffenen `text:span`.
2. Dieselbe Datei erneut importieren → Farbe exakt erhalten.
3. Zwei unterschiedliche Textläufe mit **derselben** Hervorhebungsfarbe (sonst
   keine weiteren Marks) im selben Dokument → `TextStyleRegistry`
   (`styleRegistry.ts`) dedupliziert auf **eine** gemeinsame Stildefinition,
   nicht zwei redundante.
4. Hervorhebung + Fett kombiniert → eine gemeinsame Stildefinition mit beiden
   Eigenschaften (`styleRegistry.ts:46-59`), nicht zwei getrennte, sich
   gegenseitig überschreibende `text:span`-Ebenen.
5. Hervorhebung entfernt → Export referenziert für diesen Textlauf keinen Stil
   mit `fo:background-color` mehr.
6. Cross-Format: DOCX mit Hervorhebung (aus diesem Editor als `<w:shd>` erzeugt)
   importieren → als ODT exportieren → Farbe bleibt erhalten.
7. Reale, mit echtem LibreOffice erzeugte ODT-Datei mit „Zeichen hervorheben“
   importieren → Hervorhebung sichtbar erhalten. Konkret zu prüfende, bereits
   im Repo vorhandene Fixtures: `tests/fixtures/external/odt/coloredParagraph.odt`,
   `character-styles.odt`, `lostBackground.odt` (Name legt einen bereits
   bekannten Problemfall nahe — vorrangig prüfen), `TableFunkyBackground.odt`,
   `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Hervorhebungsfarbe → Editor → Export als ODT → erneuter Import →
   Export zurück als DOCX → Farbe nach zwei Formatkonvertierungen weiterhin an
   exakt derselben Textstelle und mit demselben Hex-Wert vorhanden.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Falls beim Import einer Fremddatei ein nicht-Hex-Farbwert auftreten sollte
   (siehe Grenzfall 3.9) → doppelte Rundreise darf nicht zu stillschweigend
   unterschiedlichen Farbwerten in DOCX vs. ODT führen (Hex-only vs.
   potenziell tolerantere ODF-Darstellung).

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, aber laut Auftrag **nicht als vertrauenswürdig geltende**
Tests (arbeiten ausschließlich mit direkt konstruierten Testdaten, nicht über
echte Editor-/Toolbar-Bedienung):
- `src/formats/docx/__tests__/roundtrip.test.ts:94` „preserves text color and
  highlight color“
- `src/formats/odt/__tests__/roundtrip.test.ts:94` analog für ODT

**Aktuell nicht vorhanden und zu ergänzen** (es existiert bislang kein einziger
E2E-Test für dieses Feature):

1. Farbwähler (`🖍`) per echtem Playwright-Klick/-Eingabe auf eine Selektion
   anwenden (native `<input type="color">`-Bedienung, z. B. per
   `locator.evaluate` oder `fill` auf das Color-Input) → sichtbar
   `background-color` im DOM des markierten Textbereichs.
2. „Entfernen“-Button (`⌫`) klicken → `background-color` verschwindet aus dem
   DOM, restlicher Text unverändert.
3. Farbwähler bzw. „Entfernen“ **ohne** vorherige Selektion bedienen → definiertes
   Verhalten gemäß Grenzfall 3.1 nachweisen (kein Crash, dokumentierte
   Rückmeldung oder bewusster No-Op).
4. Gemischte Selektion (teils andere Farbe, teils keine) → definiertes Ergebnis
   gemäß Grenzfall 3.2 nachweisen.
5. Undo direkt nach Farbanwendung → Hervorhebung verschwindet, Text bleibt;
   Redo stellt sie wieder her.
6. Kombinierter Test Hervorhebung+Fett+Schriftfarbe auf demselben Textlauf,
   danach DOCX-Export → Validierung der `w:rPr`-Vollständigkeit über einen
   unabhängigen Parser.
7. Derselbe kombinierte Test für ODT.
8. Vollständiger Rundreisetest je Format (4.1/4.2) über echten
   Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
   (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
   Reader/Writer-Funktionen.
9. **Kritischer Importtest** mit einer echten, extern (Word/LibreOffice)
   erzeugten DOCX-Datei mit nativer `<w:highlight>`-Hervorhebung — Ergebnis
   dokumentieren (Grenzfall 3.7 / 4.1.5).
10. Importtest mit den genannten realen ODT-Fixtures
    (`coloredParagraph.odt`, `character-styles.odt`, `lostBackground.odt`,
    `TableFunkyBackground.odt`) — insbesondere `lostBackground.odt` vorrangig,
    da der Dateiname auf einen bereits bekannten Verlustfall hindeutet.
11. Test für ungültige/untypische Fremdfarbwerte beim Einfügen von Fremd-HTML
    (CSS-Farbname, `rgba()`) gemäß Grenzfall 3.9, inklusive Prüfung des
    resultierenden Exports auf Gültigkeit (OOXML-Schema für DOCX).
12. Cross-Format-Doppel-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal
    ODT→DOCX→ODT.
13. Sichtprüfung/Entscheidung zu Grenzfall 3.8 (bewusster `w:shd`- statt
    `w:highlight`-Kompromiss) — Ergebnis dieser Klärung ist hier nachzutragen.
14. Sichtprüfung/Entscheidung zu Abschnitt 2.3 (fehlende Zustandsanzeige) —
    Ergebnis dieser Klärung ist hier nachzutragen.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Texthervorhebungsfarbe“ darf erst dann wieder als
vertrauenswürdig gelten, wenn:

1. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
2. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch
   einen unabhängigen Parser bzw. durch erneuten Import bestätigt sind.
3. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches
   Verhalten dokumentiert ist — insbesondere der **kritische Verdacht aus
   Grenzfall 3.7** (unsichtbarer Verlust nativer Word-Hervorhebung beim Import),
   der vor Abnahme zwingend bestätigt oder widerlegt werden muss.
4. Der bewusste (oder zufällige) Kompromiss `w:shd` statt `w:highlight`
   (Grenzfall 3.8) explizit als Design-Entscheidung dokumentiert ist, inklusive
   der Konsequenz für Interoperabilität mit echtem Microsoft Word.
5. Die fehlende Zustandsanzeige (Abschnitt 2.3, Bedienelement 1 und 5) entweder
   behoben oder als bewusst nicht vorhandenes Verhalten dokumentiert wurde.
6. Die fehlende Rückmeldung bei leerer Selektion (Grenzfall 3.1, Abschnitt 2.2)
   entweder behoben oder als bewusst so gewolltes Verhalten dokumentiert wurde.
7. Der Umgang mit ungültigen/untypischen Fremdfarbwerten beim Einfügen externen
   HTML-Inhalts (Grenzfall 3.9) geklärt ist — insbesondere ob dadurch ungültiges
   OOXML entstehen kann.
8. Das Icon-Rendering-Risiko der Emoji `🖍`/`⌫` (Bedienelement 4) bewertet wurde
   (bewusst beibehalten oder auf SVG umgestellt).

Erst nach Erfüllung aller acht Punkte darf der Backlog-Status von „vorhanden
(nicht vertrauenswürdig)“ auf „verifiziert“ geändert werden.
