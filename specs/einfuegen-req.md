# Anforderungen: „Einfügen" (Zwischenablage → Cursor-Position)

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `einfuegen`, Priorität 1) als
„vorhanden" markiert. Diese Einstufung gilt als **nicht vertrauenswürdig** und muss
vollständig verifiziert werden, bevor sie erneut als „vorhanden" bestätigt werden darf.
Geltungsbereich: ausschließlich die Funktion „Inhalt der Zwischenablage an der
Cursor-Position einfügen" im gemeinsamen DOCX/ODT-Editor (`src/formats/shared/editor/`).
Das eng verwandte, laut Backlog fehlende Feature „Einfügen ohne Formatierung"
(`einfuegen-unformatiert`) wird als Abgrenzung mitbehandelt (Abschnitt 3.7), ist aber
kein Bestandteil der Freigabe von `einfuegen` selbst.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Einfügen → Export → Re-Import → Inhalt bleibt erhalten).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Kein dedizierter Einfügen-Mechanismus.** Weder `WordEditor.tsx` noch `Toolbar.tsx`
   noch `commands.ts` enthalten `handlePaste`, `handleDOMEvents.paste`,
   `transformPastedHTML`, `transformPasted`, `clipboardTextParser` oder einen
   `handleDrop`. Es gibt keinerlei Treffer für „paste"/„clipboard" im gesamten
   `src`-Verzeichnis.
2. **Kein Toolbar-Button „Einfügen".** Die Toolbar (`Toolbar.tsx`) enthält keine
   Buttons für Ausschneiden/Kopieren/Einfügen. Was heute funktioniert, funktioniert
   ausschließlich über das **native Browser-Verhalten** von `contenteditable`
   (Strg+V/Cmd+V, Rechtsklick-Kontextmenü „Einfügen", Bearbeiten-Menü des Browsers).
3. **Kein Custom-Parsing.** Was beim Einfügen aus einer externen Quelle (Word,
   LibreOffice, Browser, Notizprogramm) landet, hängt vollständig von ProseMirrors
   Standard-Zwischenablage-Verarbeitung plus den `parseDOM`-Regeln in
   `src/formats/shared/schema.ts` ab. Diese Regeln sind schmal: erkannt werden nur
   `p`, `h1`–`h6`, `strong`/`b`, `em`/`i`, `u`, `s`/`strike`, `ul`/`ol`/`li`, `img[src]`,
   `br`, Inline-Styles `font-weight`, `font-style`, `text-decoration`, `color`,
   `background-color`, sowie die Tabellen-Parsingregeln von `prosemirror-tables`.
   Alles andere (z. B. `div`, `span` ohne erkanntes Inline-Style, `blockquote`,
   verschachtelte Formatierungen aus Word-HTML mit `mso-*`-Styles, Fußnoten-Referenzen
   aus kopiertem Word-Text) wird von ProseMirrors Default-Verhalten entweder auf
   Klartext reduziert oder ignoriert — **das genaue Verhalten ist nicht getestet.**
4. **Keine Sonderbehandlung für Bild-Zwischenablage-Inhalte** (z. B. Screenshot per
   Strg+C/Strg+V, „Bild kopieren" aus einer anderen Anwendung ohne begleitendes HTML).
   ProseMirrors Default-Paste-Handling verarbeitet aus eigener Kraft nur
   `text/html`- und `text/plain`-Einträge der Zwischenablage; ein reiner
   `image/png`-Clipboard-Eintrag (kein HTML) wird **ohne** eigenen Code zur
   Dateibehandlung vermutlich **nicht** als Bild eingefügt. Das ist als klärungsbedürftig
   zu behandeln, nicht als bestätigtes Feature.
5. **Keine Tests.** Weder in `tests/e2e/*.spec.ts` noch in den Unit-Tests gibt es
   irgendeinen Test mit „paste"/„clipboard"/„einfüg" im Namen oder Inhalt. Die Aussage
   „vorhanden" im Backlog beruht ausschließlich darauf, dass native Browser-Paste in
   einem `contenteditable`-Element grundsätzlich nicht blockiert ist — **nicht** darauf,
   dass das Verhalten geprüft oder für dieses Schema abgesichert wurde.

**Konsequenz:** Diese Anforderungsdatei beschreibt den **Soll-Zustand**, gegen den der
Ist-Zustand aus Punkt 1–5 geprüft werden muss. Es ist ausdrücklich möglich (und aufgrund
obiger Analyse wahrscheinlich), dass die Verifikation mehrere der unten stehenden Punkte
als **nicht erfüllt** einstuft und daraus Implementierungsarbeit entsteht (z. B. Bild-
Paste, „Einfügen ohne Formatierung", sichtbare Fehlermeldung bei Zugriffsverweigerung).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Einfügen (Standard) | Tastenkombination Strg+V / Cmd+V | Nur natives Browser-Verhalten, ungetestet | Muss zuverlässig an der Cursor-Position bzw. anstelle der Selektion einfügen (Abschnitt 3) |
| 2 | Einfügen (Kontextmenü) | Rechtsklick im Editor → „Einfügen" | Nur natives Browser-Verhalten, ungetestet | Muss identisches Ergebnis zu Strg+V liefern |
| 3 | Einfügen ohne Formatierung | Strg+Umschalt+V / Cmd+Umschalt+V | **Fehlt** (kein Tastatur-Binding, kein Button; Backlog-Slug `einfuegen-unformatiert` = „fehlt") | Muss ergänzt werden: reduziert eingefügten Inhalt auf reinen Text im Zielabsatzformat (siehe 3.7) |
| 4 | Toolbar-Button „Einfügen" | Klick auf Toolbar-Icon | **Fehlt komplett** in `Toolbar.tsx` | Nice-to-have, kein Blocker — falls ergänzt: muss die asynchrone Clipboard-API nutzen und bei verweigerter Berechtigung eine sichtbare Fehlermeldung zeigen (nie stiller Fehlschlag, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4) |
| 5 | Toolbar-Button „Einfügen ohne Formatierung" | Klick | Fehlt | Nice-to-have, analog zu # 4 |
| 6 | Drag & Drop von Text/Bild aus externer Quelle in den Editor | Ziehen + Ablegen | Nicht verifiziert (kein `handleDrop`, `dropCursor()`-Plugin ist aktiv, das aber nur die visuelle Einfüge-Markierung liefert, keine Dateneingabe-Logik) | Muss definiert werden: mindestens kein Crash, idealerweise gleiches Ergebnis wie Einfügen per Zwischenablage |

**Klarstellung Kontextmenü/Tastenkombination:** Da der Editor auf einem nativen
`contenteditable` (via ProseMirror) beruht, sind Strg+V und das native Rechtsklick-Menü
grundsätzlich **immer verfügbar**, solange kein JavaScript-Handler sie unterdrückt
(`event.preventDefault()` auf `paste` oder `contextmenu`). Verifikation muss explizit
bestätigen, dass **kein** vorhandener Plugin/Keymap-Eintrag diese nativen Wege
versehentlich blockiert (z. B. durch eine zu breite `keymap(baseKeymap)`-Bindung).

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 2 („Ausschneiden/Kopieren/Einfügen — sowohl innerhalb des Editors als
  auch aus/nach extern") und der dort geforderte Testfall 4 („Einfügen von extern
  kopiertem, formatiertem Text").
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Einfügen ist ein
  **Hauptverdachtsfall**, da eine Paste-Operation die Selektion ersetzt/verschiebt —
  jede Einfügen-Testsequenz muss zusätzlich prüfen, dass die Editor-Selektion danach
  konsistent ist (Tippen direkt nach dem Einfügen darf nichts Falsches löschen).
- Abschnitt 20.4 („Kein stiller Fehlschlag") — gilt uneingeschränkt für Einfügen.
- Abschnitt 19 (Export-Robustheit & Rundreise) — gilt für jeden über Einfügen erzeugten
  Inhalt genauso wie für über die Toolbar erzeugten Inhalt.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Einfügen an leerer Cursor-Position (keine Selektion)
- Inhalt wird **genau an der Cursor-Position** eingefügt, nicht an einer zufälligen
  Stelle im Dokument.
- Text davor und danach im selben Absatz bleibt exakt erhalten (Zeichen für Zeichen,
  keine Verschiebung, keine doppelte/fehlende Leerstelle).
- Der Cursor steht nach dem Einfügen unmittelbar **hinter** dem eingefügten Inhalt.

### 3.2 Einfügen über eine bestehende Selektion
- Die Selektion wird durch den eingefügten Inhalt **ersetzt** (nicht ergänzt).
- Gilt auch für Selektionen, die einen ganzen Absatz, mehrere Absätze, eine ganze
  Tabellenzelle oder das gesamte Dokument (Strg+A) umfassen.
- Direkt folgendes Tippen darf sich **nicht** auf eine stale Selektion auswirken
  (Regressionstest, siehe Abschnitt 2 oben).

### 3.3 Einfügen von reinem Text (aus Notizprogramm, Terminal, o. Ä.)
- Mehrzeiliger Klartext (Zwischenablage enthält nur `text/plain`, kein `text/html`):
  gewünschtes Verhalten muss explizit festgelegt und dann getestet werden:
  - Leerzeilen-getrennte Blöcke → jeweils ein eigener Absatz.
  - Einzelne Zeilenumbrüche innerhalb eines zusammenhängenden Blocks → **ebenfalls
    als Absatzumbruch** oder wahlweise als `hard_break` (Zeilenumbruch, Umschalt+Enter-
    Äquivalent) — die tatsächlich vom Editor gezeigte Variante ist zu dokumentieren
    und mit einem Test abzusichern, da beide Varianten in bestehenden Editoren üblich
    sind und die Wahl nicht zufällig/inkonsistent sein darf.
- Kein Zeichen darf verloren gehen (keine abgeschnittene letzte Zeile, kein
  verschluckter erster/letzter Buchstabe — bekanntes Fehlerbild bei naiven
  Clipboard-Handlern).

### 3.4 Einfügen von extern kopiertem, formatiertem HTML
Quelle z. B. eine Webseite, eine echte Microsoft-Word-Instanz, LibreOffice Writer,
oder eine andere Instanz von Salamanido selbst.

- Von `schema.ts` erkannte Formate (fett, kursiv, unterstrichen, durchgestrichen,
  Textfarbe, Hervorhebungsfarbe, Überschriften 1–6, Aufzählungs-/nummerierte Listen,
  Bilder mit direktem `src`, Zeilenumbrüche, Tabellen) müssen **sinnvoll übernommen**
  werden — sichtbar identisch oder zumindest gleichwertig zur Quelle.
- Nicht abbildbare Formatierung (z. B. Word-spezifische `mso-*`-Stile, Schriftart,
  Schriftgröße, mehrspaltiges Layout, Kommentare/Änderungsverfolgung in der
  Zwischenablage, verschachtelte `div`/`span`-Strukturen ohne erkannten Stil) muss
  **sauber auf den nächstliegenden unterstützten Zustand reduziert werden** — der
  **Text selbst darf nie verloren gehen**, auch wenn die Formatierung vereinfacht wird
  (gleiches Prinzip wie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 für den Datei-Import).
- Bilder mit **externer URL** (`<img src="https://...">`, kein Data-URI): zu klären,
  ob und wie ein Netzwerk-Bild beim Einfügen geladen/eingebettet wird oder ob
  stattdessen ein definierter Fallback greift (z. B. Bild wird ignoriert, aber der
  umgebende Text bleibt erhalten, mit sichtbarem Hinweis statt stillem Verschwinden).
  Ein hängender/kaputter externer Bildverweis darf beim späteren DOCX-/ODT-Export
  nicht zu einer ungültigen Datei führen.

### 3.5 Einfügen von Bild-Inhalten direkt aus der Zwischenablage (kein HTML)
- Szenario: Screenshot-Tool oder „Bild kopieren" in einer anderen Anwendung legt nur
  einen `image/*`-Eintrag in die Zwischenablage (kein begleitendes `text/html`).
- **Muss verifiziert werden, ob dieser Fall aktuell überhaupt ein sichtbares Ergebnis
  erzeugt.** Laut Code-Befund (Abschnitt 0.4) ist das unwahrscheinlich, da kein
  Datei-/Blob-Handling für den Paste-Event-Pfad existiert (im Unterschied zum
  Toolbar-Bild-Button, der bewusst `FileReader`/Data-URI nutzt).
- Soll-Verhalten: Bild wird wie beim Toolbar-Weg als `image`-Node mit Data-URI an der
  Cursor-Position eingefügt, mit sinnvoller Standardgröße (siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7). Ist dieses Verhalten nicht vorhanden, ist
  das **kein Verifikationsfehler, sondern eine fehlende Funktion**, die genauso wie in
  Abschnitt 9 der Haupt-Spezifikation dokumentiert werden muss statt stillschweigend
  als „vorhanden" zu gelten.

### 3.6 Einfügen in strukturierten Kontexten
- **In einer Liste** (Cursor in einem `list_item`): eingefügter mehrabsätziger Inhalt
  darf die Liste nicht unkontrolliert aufbrechen oder Listenelemente duplizieren;
  eingefügte eigene Listen (verschachteltes `ul`/`ol` aus der Quelle) müssen als
  verschachtelte Liste ankommen oder zumindest lesbar linearisiert werden.
- **In einer Tabellenzelle**: eingefügter Inhalt bleibt auf die Zelle beschränkt
  (kein Aufbrechen der Tabellenstruktur); eine komplette externe Tabelle, die in eine
  bestehende Zelle eingefügt wird, ist ein Grenzfall (verschachtelte Tabelle) — siehe
  Abschnitt 4.
- **In einer Überschrift**: eingefügter mehrzeiliger/mehrabsätziger Inhalt darf nicht
  dazu führen, dass die Überschrift ungültig verschachtelten Blockinhalt enthält
  (`heading`-Node erlaubt laut Schema nur `inline*`) — zu prüfen, wie ProseMirror das
  aktuell aufteilt (z. B. Rest wird zu nachfolgendem Absatz).
- **In Kopf-/Fußzeile**, sobald diese laut Haupt-Spezifikation Abschnitt 9 bedienbar
  sind: identisches Verhalten zum Haupttext.

### 3.7 Einfügen ohne Formatierung (`einfuegen-unformatiert`, aktuell „fehlt")
- Eigene Tastenkombination (Strg+Umschalt+V) und/oder Toolbar-Befehl.
- Ergebnis: reiner Text ohne jede Zeichenformatierung (kein Fett/Kursiv/Farbe/Link),
  eingefügt im **Absatzformat der Zielposition** (übernimmt nicht die Absatzformate
  der Quelle wie Überschriften-Level).
- Mehrere Absätze aus der Quelle bleiben als mehrere Absätze erhalten (nur die
  Zeichenformatierung wird entfernt, nicht die Absatzstruktur).

### 3.8 Undo/Redo
- Ein Einfügen-Vorgang (gleich welcher Größe) ist **ein einziger Undo-Schritt** —
  Strg+Z macht die komplette Einfügung in einem Schritt rückgängig, nicht
  zeichenweise.
- Nach Undo: Cursor/Selektion entspricht dem Zustand unmittelbar vor dem Einfügen.
- Redo stellt den eingefügten Zustand identisch wieder her.

### 3.9 Rückmeldeverhalten (kein stiller Fehlschlag)
- Wird das Einfügen aus irgendeinem Grund verweigert oder schlägt fehl (z. B.
  Berechtigung für programmatischen Zwischenablagezugriff verweigert, falls ein
  Toolbar-Button ergänzt wird; oder ein Format wird erkannt, aber nicht verarbeitet),
  muss eine sichtbare Rückmeldung erfolgen — niemals ein Tastendruck/Klick, der
  ohne jede Reaktion bleibt.
- Ausnahme: eine **leere** Zwischenablage (nichts kopiert) beim Auslösen von Strg+V
  ist ein regulärer No-Op, keine Fehlermeldung nötig.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Einfügen an Position 0 (ganz am Dokumentanfang) | Inhalt erscheint vor dem bisherigen ersten Zeichen, keine führende leere Zeile |
| 2 | Einfügen ganz am Dokumentende | Inhalt hängt korrekt an, Cursor landet danach |
| 3 | Einfügen bei leerem Dokument (nur ein leerer Absatz) | Leerer Startabsatz wird sinnvoll ersetzt/erweitert, kein doppelter Leerabsatz |
| 4 | Sehr große Textmenge einfügen (mehrere Seiten) | UI friert nicht ein, Editor bleibt danach bedienbar, Undo funktioniert weiterhin als ein Schritt |
| 5 | Einfügen von Inhalt, der Zeichen außerhalb des Basic Multilingual Plane enthält (Emoji, seltene Unicode-Zeichen) | Zeichen bleiben erhalten, keine Verstümmelung (kaputte Surrogate-Paare) |
| 6 | Einfügen von Inhalt mit Tabulatorzeichen (`\t`) im Klartext | Tab bleibt als Tab-Zeichen erhalten, wird nicht zu Leerzeichen (Konsistenz mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4/15) |
| 7 | Einfügen von verschachtelter Tabelle (Tabelle-in-Tabelle aus der Quelle) | Kein Absturz; mindestens linearisierter/lesbarer Inhalt, siehe Haupt-Spezifikation Abschnitt 6 |
| 8 | Einfügen, während gerade eine IME-Komposition offen ist (z. B. bei asiatischer Eingabemethode) | Kein Datenverlust der Komposition, kein Crash |
| 9 | Wiederholtes schnelles Einfügen (mehrfach Strg+V in Folge) | Jede Einfügung erzeugt eigenen Undo-Schritt, keine Race Condition mit der Selection-Sync-Logik aus `WordEditor.tsx` |
| 10 | Einfügen von Inhalt aus einer schreibgeschützten Quelle vs. Einfügen in ein aktuell nicht fokussiertes Editor-Fenster | Einfügen wirkt nur, wenn der ProseMirror-Editor tatsächlich fokussiert ist; ein Paste-Event in einem anderen Eingabefeld der App (falls vorhanden, z. B. Dateiname-Feld) darf den Dokumentinhalt nicht verändern |
| 11 | Zwischenablage enthält sowohl `text/html` als auch `text/plain` mit unterschiedlichem Inhalt | HTML-Variante hat Vorrang (Standard-Browserverhalten), muss aber bestätigt werden |
| 12 | Bild-Zwischenablage-Inhalt ohne HTML (siehe 3.5) | Siehe dortige Anforderung — muss klar als „funktioniert" oder „fehlt" befundet werden, nicht offen bleiben |
| 13 | Einfügen direkt gefolgt von Toolbar-Aktion (z. B. Fett auf den gerade eingefügten Text) | Funktioniert wie auf jeder anderen Selektion — Regressionstest aus Abschnitt 2 der Haupt-Spezifikation gilt hier explizit mit |
| 14 | Cross-Origin/Cross-App Copy-Paste (Kopieren aus echtem Microsoft Word oder LibreOffice Writer, tatsächlich installiert, nicht nur simuliert) | Mindestens Klartext korrekt, Formatierung so gut wie im Schema abbildbar — höchste Priorität für Testabdeckung, da dies der Hauptanwendungsfall der Nutzerin ist |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen:

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch Einfügen-Arbeit nicht kaputtgehen)
Diese Prüfung existiert unabhängig vom Einfügen-Feature bereits in
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 1.2/1.3/19) und muss vor **und** nach jeder
Änderung an der Einfügen-Logik weiterhin bestehen:

1. Reale DOCX-Datei unverändert hochladen (kein Klick, keine Eingabe, insbesondere
   **kein** Einfügen-Vorgang) → sofort exportieren → erneut importieren → Inhalt
   entspricht inhaltlich dem Original.
2. Dasselbe mit einer realen ODT-Datei.
3. Beide Prüfungen müssen weiterhin grün sein, nachdem an der Einfügen-Funktion
   etwas geändert/repariert wurde (kein Nebenwirkungs-Regressions-Fehler durch neue
   Paste-Handler, z. B. globale `paste`-Listener, die auch beim reinen Import/Anzeigen
   ungewollt greifen).

### 5.2 Feature-Rundreise (Einfügen selbst)
Für **jede** der folgenden Kombinationen: Inhalt per Zwischenablage einfügen →
Dokument als DOCX exportieren → reimportieren → Inhalt/Formatierung erhalten; **und**
identisch als ODT; **und** zusätzlich Cross-Format (in ein ursprünglich als DOCX
importiertes Dokument einfügen und als ODT exportieren, sowie umgekehrt):

1. Reiner mehrabsätziger Text.
2. Formatierter Text (fett, kursiv, unterstrichen, durchgestrichen, Textfarbe,
   Hervorhebungsfarbe) aus externer HTML-Quelle eingefügt.
3. Überschriften (mind. zwei verschiedene Ebenen) aus externer Quelle eingefügt.
4. Aufzählungs- und nummerierte Liste aus externer Quelle eingefügt.
5. Bild (Data-URI-`<img>`) aus externer Quelle eingefügt.
6. Ergebnis von „Einfügen ohne Formatierung" (sobald implementiert, Abschnitt 3.7).
7. Einfügen **innerhalb** einer bestehenden Tabellenzelle bzw. eines bestehenden
   Listenpunkts (Struktur muss die Rundreise überstehen, nicht nur der reine Text).
8. Doppelte Rundreise an einem Dokument, das mehrere der obigen Einfüge-Ergebnisse
   gleichzeitig enthält (kumulativer Verlust prüfen, analog Haupt-Spezifikation
   Abschnitt 19, Testfall 3).

**Abnahmekriterium:** Formatierungsverluste bei Cross-Format-Konvertierung sind wie im
Rest der Spezifikation zu dokumentieren und akzeptabel; **Textverlust ist es nicht** —
weder bei 5.1 noch bei 5.2.

---

## 6. Testplan-Hinweise (E2E, Playwright)

Die vorhandenen E2E-Tests (`tests/e2e/*.spec.ts`) simulieren Tastatur-/Maus-Interaktion
direkt im Browser (`page.keyboard`, `page.locator('.ProseMirror')`, vgl.
`selection-regression.spec.ts`). Für Einfügen-Tests gilt zusätzlich:

1. **Bevorzugter Ansatz — deterministisch, ohne OS-Zwischenablage/Berechtigungen:**
   Im Browser-Kontext ein `ClipboardEvent('paste', { clipboardData: <DataTransfer> })`
   direkt auf das fokussierte `.ProseMirror`-Element dispatchen
   (`page.evaluate(...)`), mit frei wählbarem `text/html`- und/oder `text/plain`-Inhalt.
   Das ist plattformunabhängig, browserübergreifend stabil und bildet exakt den Pfad
   nach, den ProseMirrors Paste-Handler tatsächlich verarbeitet.
2. **Ergänzend — realistischer, aber weniger portabel:** `context.grantPermissions
   (['clipboard-read', 'clipboard-write'])` plus `navigator.clipboard.writeText(...)`
   gefolgt von echtem `page.keyboard.press('ControlOrMeta+V')`. Bekannte Einschränkung:
   Clipboard-Permissions/-API sind in Playwrights Firefox/WebKit-Runtern weniger
   zuverlässig als in Chromium — mindestens für das Projekt „Desktop Chrome" (siehe
   `playwright.config.ts`) verpflichtend, für „Mobile"/„Tablet" nice-to-have.
3. **Manuell/exploratory ergänzen:** mindestens einmal mit einer echten, lokal
   installierten Word- oder LibreOffice-Writer-Instanz tatsächlich formatierten Text
   kopieren und einfügen (Grenzfall 14) — automatisiertes Vortäuschen von
   „Word-HTML" reicht nicht aus, um die reale `mso-*`-Stil-Suppe abzudecken, die
   echtes Word erzeugt.
4. Jeder Einfügen-Test muss wie in Abschnitt 2 gefordert direkt im Anschluss eine
   Tipp- oder Formatierungsaktion ausführen und deren korrektes Ergebnis prüfen
   (Selection-Sync-Regressionsschutz), nicht nur den unmittelbaren Zustand nach dem
   Einfügen selbst.
5. Rundreise-Tests (Abschnitt 5) sind als Unit-Tests gegen Reader/Writer **und**
   zusätzlich als E2E-Test über echte Bedienung zu führen — reine Unit-Tests mit
   direkt konstruierten `ProseMirrorJSON`-Fixtures reichen nicht aus, wie die
   Haupt-Spezifikation in Abschnitt 17/21 für andere Features bereits als
   unzureichend eingestuft hat.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `einfuegen` darf erst dann wieder als **vorhanden** (unqualifiziert)
gelten, wenn:

- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert / funktioniert
  nicht und wird dokumentiert / wurde repariert),
- Abschnitt 5.1 (Baseline-Rundreise) nicht durch etwaige Änderungen gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide Cross-Format-Richtungen
  besteht,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug)
  explizit mit einer Einfügen-Sequenz nachgestellt und grün ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).
