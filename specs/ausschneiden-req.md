# Anforderungsdatei: Feature „Ausschneiden“ (Cut)

Status: **Laut Feature-Backlog „vorhanden“ — gilt als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 2.1 „Zwischenablage“, Slug `ausschneiden`, Priorität 1) bestätigt werden darf.

Kurzbeschreibung (Backlog): „Entfernt die Selektion und legt sie in die Zwischenablage.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Ausschneiden“, was
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2, „Text-Grundfunktionen“) nur pauschal als
„Ausschneiden/Kopieren/Einfügen — sowohl innerhalb des Editors als auch aus/nach extern“
fordert. Sie gilt für **beide** unterstützten Formate (DOCX und ODT) über den
gemeinsamen ProseMirror-Editor (`src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/schema.ts`), da Ausschneiden eine reine Editor-Operation ist und
sich zwischen den Formaten nicht unterscheiden darf.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Vor der eigentlichen Anforderung hier der nachvollziehbare Befund, warum der Backlog-Status
„vorhanden“ **nicht** ungeprüft übernommen werden darf:

- In `src/formats/shared/editor/commands.ts` existiert **kein** `cut`-Befehl. Es gibt
  keine Funktion, die Selektion löscht **und** explizit in die Zwischenablage schreibt.
- In `src/formats/shared/editor/Toolbar.tsx` existiert **kein** Button/Icon „Ausschneiden“.
  Es gibt keinen einzigen klickbaren, benannten UI-Weg für diese Funktion — anders als
  z. B. Fett/Kursiv/Ausrichtung, die je einen eigenen Button haben.
- In `src/formats/shared/editor/WordEditor.tsx` ist in der `keymap({...})`-Konfiguration
  **keine** eigene Bindung für `Mod-x` (Strg+X/Cmd+X) hinterlegt.
- Es existiert **kein** einziger Test (weder Unit- noch E2E-Test) im gesamten Repository,
  der Ausschneiden/Zwischenablage in irgendeiner Form prüft (`tests/e2e/*.spec.ts`,
  `src/**/__tests__/*`) — Suche nach „cut“, „clipboard“ liefert keinen Treffer.
- Die Funktion „funktioniert“ nach aktuellem Stand ausschließlich, weil der Editor-Container
  ein von ProseMirror verwaltetes `contenteditable`-Element ist und Browser auf einem
  solchen Element das native `cut`-DOM-Event (ausgelöst durch Strg+X, Kontextmenü oder das
  Betriebssystem-Bearbeiten-Menü) automatisch verarbeiten: ProseMirror serialisiert die
  Selektion in die Zwischenablage und löscht sie anschließend aus dem Dokument — **ohne
  dass eine einzige Zeile Anwendungscode dafür geschrieben wurde.**

**Konsequenz für die Bewertung:** Nach der im Backlog selbst definierten Methodik
(„Existiert die Funktion als echter, klickbarer UI-Button… oder existiert nur
Datenmodell-/Browser-Grundverhalten ohne eigene Implementierung/Test/Absicherung?“)
ist der Status „vorhanden“ mindestens fragwürdig: Es gibt **keinen entdeckbaren UI-Weg**
(kein Button, kein Menüeintrag), **keine eigene Fehlerbehandlung**, **keine Tests** und
**keine verifizierte Interaktion** mit dem bekannten Selection-Sync-Bug
(`FEATURE-SPEC-DOCX-ODT.md`, Abschnitt 2/20). Diese Anforderungsdatei legt fest, was
erfüllt sein muss, damit „vorhanden“ tatsächlich zutrifft.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

Eine ernstzunehmende Textverarbeitung bietet „Ausschneiden“ über mehrere gleichwertige
Wege an. Jeder dieser Wege muss einzeln funktionieren und einzeln getestet werden:

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Ausschneiden“ (Scheren-Icon) | **fehlt komplett** | Muss ergänzt werden: eigener Button in `Toolbar.tsx`, SVG-Icon (kein Emoji/Unicode-Glyphe, siehe Abschnitt 20 der Feature-Spec zum Icon-Rendering-Problem), `aria-label="Ausschneiden"`, sichtbar deaktiviert (`disabled`/reduzierte Deckkraft), wenn keine Selektion vorhanden ist — kein stiller Klick ins Leere (siehe Abschnitt 20 „Kein stiller Fehlschlag“). |
| 2 | Rechtsklick-Kontextmenü → „Ausschneiden“ | Kein eigenes Kontextmenü implementiert; es erscheint das Browser-Standardkontextmenü, **sofern der Editor kein `contextmenu`-`preventDefault()` einsetzt** (aktuell nicht der Fall, aber nie verifiziert) | Muss verifiziert werden: Rechtsklick auf eine bestehende Selektion zeigt das native Kontextmenü mit funktionierendem „Ausschneiden“-Eintrag, ODER es wird bewusst ein eigenes Kontextmenü gebaut — Entscheidung ist zu dokumentieren, kein unklarer Zwischenzustand. |
| 3 | Tastenkombination Strg+X (Windows/Linux) / Cmd+X (macOS) | Keine eigene `keymap`-Bindung; funktioniert nur über das native Browser-`cut`-Event auf dem `contenteditable`-Element | Muss über alle Zielbrowser (mind. Chromium, wie in `playwright.config.ts` als „Desktop Chrome“/„Mobile“/„Tablet“ konfiguriert) verifiziert werden. Falls das native Verhalten in einem Fall nicht ausreicht (siehe Grenzfälle unten), ist ein expliziter Befehl in `commands.ts` + `keymap`-Eintrag in `WordEditor.tsx` zu ergänzen. |
| 4 | Tastenkombination Umschalt+Entf (Windows-übliche Zweit-Belegung für Ausschneiden) | Nicht getestet, keine eigene Bindung | Verifizieren, ob der Browser das nativ abbildet; falls nicht, bewusst als „nicht unterstützt“ dokumentieren statt stillschweigend nichts zu tun. |
| 5 | Anwendungs-Menü „Bearbeiten → Ausschneiden“ | Existiert nicht — Salamanido hat keine eigene Menüleiste, nur die Toolbar aus Abschnitt 1 | Kein Soll-Element (Menüleiste ist nicht Teil des Produkts), aber diese Abwesenheit ist hier explizit zu dokumentieren, damit sie nicht als vergessene Lücke missverstanden wird. |
| 6 | Mobile/Touch: „Ausschneiden“ im Auswahl-Popup des Betriebssystems (Android/iOS-Textauswahlblase) | Nicht verifiziert | Auf den in `playwright.config.ts` bereits konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) mindestens rudimentär prüfen, dass die Selektion überhaupt aufziehbar ist und der Editor nach einem systemseitigen Ausschneiden einen konsistenten Zustand zeigt. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen
- „Ausschneiden“ ist nur bei **nicht-leerer Selektion** sinnvoll aktiv: Textbereich
  (`TextSelection`), ein einzelnes Bild (`NodeSelection` auf `image`), eine oder mehrere
  ganze Tabellenzellen (`CellSelection` aus `prosemirror-tables`), oder eine
  „Alles auswählen“-Selektion (`AllSelection`, Strg+A).
- Bei leerem Cursor ohne Selektion: Toolbar-Button ist deaktiviert; Tastenkombination
  und Kontextmenü dürfen keine Fehlermeldung werfen, aber auch keine sichtbare Wirkung
  zeigen außer ggf. einer kurzen, nicht-blockierenden Rückmeldung („nichts ausgewählt“ ist
  akzeptabel als stiller No-Op **nur** bei diesem einen, für Anwender:innen selbsterklärenden
  Fall — abweichend von der generellen „kein stiller Fehlschlag“-Regel aus Abschnitt 20,
  weil dies dem Verhalten jeder realen Textverarbeitung entspricht).

### 2.2 Was genau entfernt wird
- Die exakt markierte Selektion wird aus dem Dokument entfernt — nicht mehr, nicht weniger.
- Bei einer Selektion über mehrere Absätze hinweg: Die Absätze werden korrekt
  zusammengeführt (der Rest-Anfang des ersten und das Rest-Ende des letzten betroffenen
  Absatzes verschmelzen zu einem Absatz), analog zum normalen Löschverhalten (Entf/Backspace).
- Bei einer `NodeSelection` auf ein Bild: Das gesamte Bild-Element wird entfernt, der
  umgebende Text bleibt unangetastet (Regressionsrisiko identisch zu dem in
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 beschriebenen Bild-Bug).
- Bei einer `CellSelection` über mehrere Tabellenzellen: **Nur der Zellinhalt wird
  geleert**, die Tabellenstruktur (Zeilen-/Spaltenzahl, verbundene Zellen) bleibt
  unverändert — analog zum Referenzverhalten von Word/LibreOffice. Es ist **nicht**
  zulässig, dass Ausschneiden über mehrere Zellen versehentlich Zeilen/Spalten aus der
  Tabelle entfernt.
- Bei `AllSelection` (Strg+A → Ausschneiden): Das gesamte Dokument wird geleert, der
  Editor muss danach in einem gültigen Zustand bleiben (mindestens ein leerer Absatz,
  kein kaputtes/leeres ProseMirror-Dokument, weiterhin bedienbar mit Cursor aktiv).

### 2.3 Was genau in die Zwischenablage gelangt
- Innerhalb des Editors (Einfügen per Strg+V an anderer Stelle im selben oder einem
  zweiten Salamanido-Dokument-Tab): Die **vollständige Formatierung** der ausgeschnittenen
  Selektion muss erhalten bleiben — alle Marks (`strong`, `em`, `underline`, `strike`,
  `textColor`, `highlight`), Node-Struktur (Listen, Tabellenzellen-Inhalt, Bilder,
  `hard_break`).
- Beim Einfügen in eine externe Anwendung (z. B. Editor, Notizzettel, E-Mail): mindestens
  reiner Klartext muss ankommen (kein leeres Clipboard, kein Steuerzeichen-Müll).
- Beim Einfügen aus Salamanido in eine andere Office-Anwendung (Word/LibreOffice) sollte,
  wo möglich, auch die HTML-Repräsentation mit Formatierung übertragen werden — das ist
  aber ein „Nice-to-have“ und kein Blocker, sofern der Klartext-Fallback zuverlässig
  funktioniert.

### 2.4 Cursor-/Selektionszustand nach dem Ausschneiden
- Nach dem Ausschneiden steht der Cursor exakt an der Stelle, an der die Selektion
  begann (kollabierte `TextSelection` an der ehemaligen Startposition).
- Der Editor bleibt fokussiert und sofort weiter bedienbar (Tippen funktioniert ohne
  weiteren Klick) — konsistent mit der generellen Anforderung „kein Reset, kein Verlust
  des Fokus“ aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3.

### 2.5 Undo/Redo-Verhalten
- Ausschneiden erzeugt **einen** Undo-Schritt (Strg+Z stellt exakt den ursprünglichen
  Inhalt **und** eine sinnvolle Selektion an der ursprünglichen Stelle wieder her).
- Redo (Strg+Y bzw. Strg+Umschalt+Z) nach einem Undo entfernt den Inhalt erneut.
- Ausschneiden darf sich in der Undo-Historie **nicht** mit einer zufällig unmittelbar
  vorausgehenden Toolbar-Aktion verschmelzen (z. B. „Fett“ direkt vor „Ausschneiden“ —
  beides muss separat rückgängig machbar bleiben).

### 2.6 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2 und 20) beschreibt einen bereits gefundenen
  Fehler: Nach einer Toolbar-Aktion auf eine Selektion, gefolgt von einem Klick zur
  Neupositionierung, blieb die interne ProseMirror-Selektion veraltet stehen, sodass
  nachfolgende Eingaben ungewollt den gesamten Inhalt ersetzten. Der Fix dafür
  (`reconcileSelectionOnClick` in `WordEditor.tsx`, `mouseup`-Handler) reagiert auf
  „DOM zeigt kollabierten Cursor, Modell hält noch nicht-leere Selektion“.
- **Ausschneiden ist ein Haupt-Verdachtsfall für eine Variante dieses Bugs**, weil es
  wie „Fett auf Alles auswählen“ eine nicht-leere Selektion durch eine Transaktion
  ersetzt und der native `cut`-Event-Pfad ggf. nicht über denselben Code läuft wie
  Toolbar-Befehle. Pflicht-Testsequenz (siehe Testfälle unten): Text eingeben → Alles
  auswählen → Ausschneiden → Klick zur Neupositionierung → Enter → weiter tippen →
  Dokument darf nicht korrumpiert werden.

### 2.7 Zwischenablage-Berechtigungen/Fehlerfälle
- Native `cut`-Events (ausgelöst durch echte Nutzer:innen-Eingabe wie Strg+X) benötigen
  in modernen Browsern **keine** explizite Clipboard-Berechtigung — das muss aber pro
  Zielbrowser verifiziert werden, nicht angenommen werden.
- Sollte künftig ein eigener Toolbar-Button „Ausschneiden“ programmatisch über die
  asynchrone `navigator.clipboard`-API schreiben (statt ein natives `cut`-Event
  auszulösen), muss geprüft werden, ob der Browser das ohne Berechtigungsdialog zulässt.
  **Kritische Anforderung:** Schlägt der Zwischenablage-Zugriff fehl, darf der Text
  **niemals** trotzdem aus dem Dokument gelöscht werden, ohne dass die Nutzerin eine
  Fehlermeldung sieht — kein stiller Datenverlust (Abschnitt 20, „Kein stiller
  Fehlschlag“). Bevorzugte Umsetzung: zuerst in die Zwischenablage schreiben, **erst bei
  Erfolg** die Löschtransaktion dispatchen.

---

## 3. Grenzfälle

1. **Leere Selektion / nur Cursor:** Ausschneiden-Button ist deaktiviert; Tastenkombination
   und Kontextmenü tun sichtbar nichts, aber ohne Absturz oder Konsole-Exception.
2. **Alles auswählen (Strg+A) → Ausschneiden:** Gesamtes Dokument wird geleert, Editor
   bleibt in gültigem, weiterhin bedienbarem Zustand (mind. ein leerer Absatz).
3. **Selektion über mehrere Absatzgrenzen hinweg** (teilweise markierter erster und
   letzter Absatz): Reste werden korrekt zu einem Absatz zusammengeführt, keine doppelten
   oder verschluckten Zeichen an der Nahtstelle.
4. **Selektion über eine komplette Liste hinweg** (mehrere Listenpunkte ganz oder
   teilweise markiert): Ausschneiden entfernt die markierten Punkte; verbleibende
   Listenpunkte bleiben eine konsistente Liste mit korrekt fortlaufender Nummerierung
   (bei nummerierten Listen).
5. **Selektion eines einzelnen Bildes** (`NodeSelection`): Bild verschwindet vollständig
   aus dem Dokument, landet in der Zwischenablage; erneutes Einfügen (Strg+V) fügt exakt
   dieses Bild wieder ein (gleiche Bilddaten, kein Qualitätsverlust).
6. **Selektion einzelner Tabellenzellen (`CellSelection`) über mehrere Zellen:** Nur
   Zellinhalte werden geleert, Tabellenstruktur (Zeilen/Spalten/verbundene Zellen) bleibt
   unverändert bestehen — siehe 2.2.
7. **Selektion, die eine ganze Tabellenzeile oder -spalte einschließt, aber nicht über
   den Umweg einer eigenen „Zeile/Spalte löschen“-Funktion:** Muss klar von echtem
   Struktur-Löschen (Abschnitt 6 der Feature-Spec, dort separat als „Zeile löschen“
   gefordert) abgegrenzt sein — Ausschneiden darf niemals unbeabsichtigt Tabellenzeilen/
   -spalten strukturell entfernen.
8. **Gemischt formatierter Text** (z. B. fett **und** farbig **und** Link innerhalb
   derselben Selektion): Beim Wiedereinfügen innerhalb des Editors bleibt die exakte
   Kombination erhalten.
9. **Ausschneiden, danach Einfügen in ein zweites Salamanido-Dokument** (zweiter
   Browser-Tab/zweites Fenster): Funktioniert wie system-weites Kopieren, da Ausschneiden
   intern „Kopieren + Löschen“ ist.
10. **Ausschneiden, danach Einfügen in eine externe Anwendung** (z. B. Texteditor, andere
    Webseite): Mindestens Klartext kommt korrekt an.
11. **Zwischenablage-Zugriff vom Browser verweigert/blockiert:** Kein Datenverlust im
    Dokument, sichtbare Fehlermeldung statt stillem Fehlschlag (siehe 2.7).
12. **Direkt aufeinanderfolgendes Ausschneiden mehrerer Selektionen ohne Zwischen-Paste:**
    Jede neue Ausschneiden-Aktion überschreibt den vorherigen Zwischenablage-Inhalt
    vollständig (kein Zwischenablage-Verlauf/Stapel erwartet — Standardverhalten).
13. **Ausschneiden direkt am Dokumentanfang bzw. -ende** (Selektion reicht bis Position 0
    bzw. bis zum letzten Zeichen): Editor bleibt weiterhin editierbar, Cursor landet an
    sinnvoller Position, kein Off-by-one-Fehler bei der Restauswahl.
14. **Fokus liegt nicht im Editor** (z. B. Cursor gerade in einem Toolbar-Eingabefeld wie
    dem Farbwähler-Input): Ein systemweites Strg+X darf **nicht** versehentlich
    Editor-Inhalt manipulieren, wenn der Editor gar nicht fokussiert ist.
15. **Pflicht-Regressionstest für den Selection-Sync-Bug** (siehe 2.6): Text eingeben →
    Alles auswählen → Ausschneiden → Klick zur Neupositionierung → Enter → weiter tippen
    → Dokument bleibt konsistent, keine unbeabsichtigte Komplett-Löschung/-Ersetzung.
16. **Ausschneiden unmittelbar gefolgt von Undo:** Stellt exakt den Ursprungszustand
    (Inhalt **und** Selektion) wieder her, kein doppeltes Undo nötig.
17. **Ausschneiden in einer Zelle, die die einzige verbleibende Zelle mit Inhalt in der
    gesamten Tabelle ist:** Zelle bleibt als leere, aber gültige Zelle bestehen (mindestens
    ein leerer Absatz je ProseMirror-Schema `cellContent: 'block+'`), keine invalide
    Tabellenstruktur.
18. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13), muss
    Ausschneiden bei aktiver Aufzeichnung als Löschung markiert werden statt sofort zu
    entfernen. Für den aktuellen Verifikationsauftrag ist das **nicht** im Scope, aber
    hier als bekannte künftige Abhängigkeit dokumentiert, damit sie nicht vergessen wird.

---

## 4. Rundreise-Anforderung (DOCX und ODT)

Ausschneiden selbst erzeugt keine Datei — die Anforderung gilt dem Zusammenspiel aus
Editor-Zustand nach der Aktion und dem bestehenden Export/Import. Es gelten **zwei**
Ebenen:

### 4.1 Baseline (Voraussetzung, damit Cut-Rundreisen überhaupt aussagekräftig sind)
Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 gefordert: Datei A (DOCX) hochladen,
**ohne jede Änderung** exportieren, erneut importieren → Ergebnis entspricht inhaltlich A.
Ebenso für ODT. Diese Baseline muss vor den Cut-spezifischen Testfällen grün sein, damit
ein späterer Rundreise-Fehler eindeutig dem Ausschneiden zugeordnet werden kann und nicht
mit einem allgemeinen Reader/Writer-Fehler verwechselt wird.

### 4.2 Cut-spezifische Rundreise — Testfälle
1. DOCX-Datei importieren → definierten Textbereich per Ausschneiden entfernen →
   Ergebnis als DOCX exportieren → reimportieren → ausgeschnittener Text bleibt entfernt,
   der gesamte übrige Inhalt ist unverändert vorhanden, keine Strukturkorruption
   (keine leeren `<w:p>`-Fragmente, keine kaputten Nummerierungsreferenzen).
2. Dieselbe Sequenz für eine ODT-Datei (Import → Ausschneiden → Export als ODT →
   Reimport).
3. Ausschneiden, danach Einfügen an anderer Stelle im selben Dokument („Verschieben“ per
   Cut+Paste) → Export/Reimport in beiden Formaten → Text erscheint korrekt an der neuen
   Stelle, ist an der alten Stelle nicht mehr vorhanden, Formatierung bleibt erhalten.
4. Cross-Format: ODT importieren → Text ausschneiden → als DOCX exportieren →
   reimportieren → Inhalt (abzüglich des Ausgeschnittenen) bleibt konsistent.
5. Cross-Format umgekehrt: DOCX importieren → Text ausschneiden → als ODT exportieren →
   reimportieren.
6. Bild per Ausschneiden entfernen → Export → Reimport → Bild fehlt korrekt, **keine
   verwaisten Bilddateien** im DOCX-/ODT-Zip-Container (Analogie zu
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 9).
7. Inhalt einer oder mehrerer Tabellenzellen per Ausschneiden leeren → Export → Reimport
   → Tabellenstruktur (Zeilen-/Spaltenzahl, `colspan`/`rowspan`) bleibt vollständig
   konsistent, keine leeren `<w:tr>`/`<table:table-row>`-Fragmente, keine fehlenden
   Zellen.
8. Ausschneiden einer kompletten Liste (alle Punkte) → Export → Reimport → Liste ist
   vollständig verschwunden, umgebende Absätze bleiben unverändert, keine
   Nummerierungs-Definition ohne zugehörige Listeneinträge im Export übrig.
9. Doppelte Rundreise (Format-Wechsel hin und zurück) an einem Dokument, in dem zuvor
   ausgeschnitten wurde: DOCX → Editor (ausschneiden) → ODT → Editor → DOCX → Inhalt
   bleibt nach zwei Konvertierungen weiterhin identisch zum erwarteten
   Nach-Ausschneiden-Zustand.
10. Ausschneiden des **gesamten** Dokumentinhalts (Strg+A → Ausschneiden) → Export →
    Reimport → Ergebnis ist eine valide, leere Datei (analog zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.1, Testfall 2), kein defekter Export.

---

## 5. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Ausschneiden“ | fehlt komplett | neu bauen, SVG-Icon, deaktiviert bei leerer Selektion, siehe Abschnitt 1 |
| 2 | Kontextmenü-Eintrag | ungeprüftes Browser-Standardverhalten | verifizieren oder Entscheidung dokumentieren, siehe Abschnitt 1 |
| 3 | Strg+X / Cmd+X | funktioniert nur implizit über natives `cut`-Event | über alle Zielbrowser/-projekte aus `playwright.config.ts` verifizieren |
| 4 | Umschalt+Entf | ungeprüft | verifizieren oder als „nicht unterstützt“ dokumentieren |
| 5 | Mobile/Touch-Auswahlblase „Ausschneiden“ | ungeprüft | auf „Mobile“/„Tablet“-Playwright-Projekten mindestens rudimentär prüfen |
| 6 | Eigener `cut`-Befehl in `commands.ts` | fehlt | nur bei Bedarf ergänzen, falls natives Verhalten in Grenzfällen (Bild, Zellen, Zwischenablage-Fehlerfall) nicht ausreicht |
| 7 | Dauerhafter Regressionstest Selection-Sync-Bug × Ausschneiden | fehlt | Pflichttest gemäß Abschnitt 2.6/3.15 |

---

## 6. Testfälle (Zusammenfassung, E2E-Fokus)

Analog zum Playwright-Aufbau in `tests/e2e/selection-regression.spec.ts` (echte
Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, `getByTitle`/
`getByRole`, keine isolierten Command-Aufrufe):

1. Text eingeben, per Maus markieren, Strg+X → Text verschwindet aus dem Editor.
2. Strg+V direkt danach an anderer Stelle → Text erscheint dort unverändert samt
   Formatierung.
3. Ausschneiden ohne Selektion (nur Cursor) → keine Veränderung, kein Fehler in der
   Konsole.
4. Strg+A → Strg+X → Editor zeigt validen leeren Zustand, weiterhin tippbar.
5. Regressionstest (Pflicht, dauerhaft in der Suite): Tippen → Strg+A → Strg+X → Klick
   zur Neupositionierung → Enter → weiter tippen → Dokument bleibt korrekt, keine
   unbeabsichtigte Löschung/Ersetzung (siehe Abschnitt 2.6/3.15).
6. Ausschneiden innerhalb einer Tabellenzelle (nur Zelltext) → nur der Zellinhalt
   verschwindet, Tabelle bleibt strukturell unverändert.
7. Ausschneiden über mehrere markierte Tabellenzellen (`CellSelection`) → nur Inhalte
   werden geleert, keine Zeilen/Spalten verschwinden.
8. Bild markieren (Klick auf Bild) → Strg+X → Bild verschwindet, Text davor/danach bleibt
   erhalten (Analogie zum in Abschnitt 7 der Feature-Spec beschriebenen Bild-Risiko).
9. Strg+Z direkt nach Ausschneiden → exakter Ursprungszustand wird wiederhergestellt.
10. Ausschneiden → Export nach DOCX → Reimport → siehe Abschnitt 4.2, Testfall 1.
11. Ausschneiden → Export nach ODT → Reimport → siehe Abschnitt 4.2, Testfall 2.
12. Ausschneiden von extern eingefügtem, aus einer echten Word-/LibreOffice-Datei
    kopiertem Text, danach erneutes Ausschneiden dieses Textes innerhalb des Editors →
    Formatierung bleibt über beide Schritte hinweg konsistent (Verkettung mit dem
    „Einfügen von extern formatiertem Text“-Testfall aus Abschnitt 2 der Feature-Spec).
13. Ausschneiden auf allen drei in `playwright.config.ts` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → Kernverhalten (Punkte 1–5)
    funktioniert auf jedem Projekt.

---

## 7. Testmatrix — Zusammenfassung

| Bereich | Unit-Test | E2E-Test | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Basis-Ausschneiden (Text, Maus-Selektion) | fehlt | fehlt — muss neu gebaut werden | fehlt |
| Strg+X / Tastenkombination | fehlt | fehlt | n/a |
| Alles auswählen + Ausschneiden | fehlt | fehlt | fehlt |
| Bild ausschneiden | fehlt | fehlt | fehlt |
| Tabellenzellen ausschneiden (Inhalt vs. Struktur) | fehlt | fehlt | fehlt |
| Liste ausschneiden | fehlt | fehlt | fehlt |
| Undo/Redo nach Ausschneiden | fehlt | fehlt | n/a |
| Selection-Sync-Regressionstest × Ausschneiden | fehlt | **Pflicht, fehlt aktuell** | n/a |
| Cross-Format-Rundreise nach Ausschneiden | n/a | fehlt | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ stützt sich ausschließlich auf implizites
Browser-Standardverhalten eines `contenteditable`-Elements — es gibt weder einen
entdeckbaren UI-Weg noch einen einzigen Test. Bevor der Status bestätigt werden kann,
müssen mindestens die Pflicht-Testfälle aus Abschnitt 6 (insbesondere Punkt 5, der
Selection-Sync-Regressionstest) grün sein und die Rundreise-Anforderungen aus
Abschnitt 4 nachgewiesen werden.

---

## 8. Abnahmekriterien (Definition of Done)

1. Für jeden Zugriffsweg aus Abschnitt 1 ist dokumentiert, ob er unterstützt wird — kein
   unklarer Zwischenzustand.
2. Alle Grenzfälle aus Abschnitt 3 sind einzeln durch einen Test abgedeckt oder als
   bewusst nicht unterstützt mit Begründung dokumentiert.
3. Der Pflicht-Regressionstest für den Selection-Sync-Bug in Kombination mit Ausschneiden
   (Abschnitt 2.6/3.15/6.5) ist geschrieben, grün und dauerhaft Teil der Suite.
4. Alle Rundreise-Testfälle aus Abschnitt 4.2 sind für DOCX **und** ODT grün.
5. Kein Testfall zeigt stillen Datenverlust (Text verschwindet ohne in der Zwischenablage
   zu landen) oder eine JS-Exception in der Konsole.
6. Der Backlog-Eintrag `ausschneiden` wird erst dann weiterhin als „vorhanden“ geführt,
   wenn Punkte 1–5 erfüllt sind; andernfalls ist der Status auf „teilweise“ zu korrigieren
   und die fehlenden Teile (voraussichtlich: Toolbar-Button, Kontextmenü-Verifikation,
   Tests) sind als eigene Nachfolge-Aufgaben zu erfassen.
