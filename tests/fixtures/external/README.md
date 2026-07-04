# Externe Testdateien (reale, komplexe DOCX/ODT)

Herkunft, zur Nachvollziehbarkeit und Sicherheit:

- `docx/` — 127 Dateien aus [apache/poi](https://github.com/apache/poi) (`test-data/document`),
  dem offiziellen Testkorpus der Apache POI Java-Bibliothek zum Lesen/Schreiben von
  Office-Formaten. Apache-2.0-Lizenz. Enthält u. a. gezielt "Crash"/Edge-Case-Dateien,
  mit denen echte Parser-Bugs in der Vergangenheit gefunden wurden.
- `odt/` — 202 Dateien aus [tdf/odftoolkit](https://github.com/tdf/odftoolkit)
  (`odfdom/src/test/resources/test-input`), dem offiziellen Testkorpus der ODF-
  Referenzbibliothek der Document Foundation. Enthält Kopf-/Fußzeilen, Bilder, Tabellen,
  Listen, Hyperlinks, Fußnoten, Kommentare, Änderungsverfolgung, Feldfunktionen u. v. m.

**Sicherheit:** Beide Quellen sind offizielle, seit Jahren aktiv gepflegte Testsuiten
etablierter Open-Source-Stiftungen (Apache Software Foundation, The Document Foundation),
keine beliebigen Filesharing-Seiten. Die Dateien werden in dieser App **ausschließlich**
über eigenen, sandboxed XML-Parsing-Code (`jszip` + `DOMParser`) gelesen — nie in einer
echten Office-Anwendung geöffnet, keine Makro-Ausführung. Zwei Dateien
(`bug53475-password-is-*.docx`) sind bewusst enthalten, um Fehlerbehandlung bei
passwortgeschützten Dateien zu testen.

Zweck: Realistische Import-Robustheitstests (siehe `FEATURE-SPEC-DOCX-ODT.md`,
Abschnitt 18) — deutlich über das hinausgehend, was mit selbst konstruierten
Testdaten geprüft werden kann.
