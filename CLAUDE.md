# Partykiste

Partyspiel-Sammlung fürs Handy. Reines HTML/CSS/JS mit nativen ES-Modulen, kein Build-Schritt (Node ist nicht installiert).
Lokal starten: `python3 tools/serve.py` (wie `python3 -m http.server 8000`, aber ohne Browser-Cache, damit geänderte Module sofort ankommen; Konfiguration in `.claude/launch.json`).

## Aufbau
- `js/games/index.js` – Liste aller Spiele; neue Spiele aus `js/games/_vorlage/` kopieren und hier eintragen – und in `sections` einem Abschnitt der Startseite zuordnen (Kacheln in zwei Spalten, sonst landet es unter „Weitere Spiele“)
- `js/games/<id>/` – ein Spiel: `index.js` (Metadaten + `mount(ctx)`), eigenes CSS (alle Regeln mit `.game-<id>` beginnen)
- Einstellungsseiten aller Spiele über `setupScreen()`/`setupRow()` aus `js/core/ui.js` aufbauen (Kopf mit Animation + kurzem Satz, Karten mit Symbol, Start-Knopf unten); Kategorien als `toggleList` mit `count`, Mitspieler mit `playerEditor` (klappt auf)
- Endbildschirme: Rangliste über `rankingList()`, Buchstaben-Animationen über `splitLetters()` (beides `js/core/ui.js`)
- Läuft ein Spiel, fragt die App vor dem Verlassen nach (`js/core/app.js`). Einstellungen (`.setup`) und Bildschirme mit `data-leave-free` (Endbildschirme) sind ausgenommen – neue Endbildschirme entsprechend markieren
- Als App installierbar und offline spielbar: `manifest.webmanifest`, `sw.js` (eigene Dateien „Netz zuerst“), Anmeldung in `js/core/offline.js`. App-Symbole in `icons/` aus `icons/icon.svg` mit `python3 tools/app-icons.py` erzeugen
- `js/core/` – gemeinsame Dienste (Router/App-Hülle, `ctx` mit auto-aufgeräumten Timern, Audio, FX, Storage, UI, app-weite Spielerliste)
- `css/` – Design-Tokens (helles + dunkles Theme), gemeinsame Bausteine, Startseite
- `js/dice/` + `css/dice.css` – Würfelbecher (kein Spiel): Würfel-Knopf in der Kopfzeile der Startseite, öffnet ein Fenster mit 1–5 Würfeln (flach in 2D – 3D-Würfel liefen ruckelig und fehlerhaft)
- Regelrad ist ein Werkzeug (`tool: true`): kein Eintrag in der Spieleliste, sondern ein Knopf in der Kopfzeile der Startseite (neben dem Würfel). Seine aktiven Regeln (`js/games/regelrad/active-rules.js`) erscheinen auch auf der Startseite
- UI-Texte auf Deutsch, Bezeichner im Code auf Englisch
- Song-Raten: Hörproben kommen zur Laufzeit von der iTunes-Suche (`js/games/song-raten/itunes.js`, CORS erlaubt, ~20 Anfragen/Minute); `songs.js` enthält nur Interpret + Titel. Am iPhone blockiert WebKit die Suche, deshalb liegen die Hörproben-Adressen vorab in `previews.js` (erzeugt von `tools/song-hoerproben.py`, nach Änderungen an `songs.js` erneut ausführen, dauert ~25 Min.); nur fehlende Songs werden live gesucht. Spotify bewusst nicht eingebunden.
- `tools/kmk-bilder.py` – erzeugt `js/games/kiss-marry-kill/images.js` (Wikipedia-Bildadressen) aus `characters.js`; nach Änderungen an den Namen erneut ausführen. Bilder werden nur verlinkt, nicht heruntergeladen. Bei Kiss, Marry, Kill nur Erwachsene (auch bei Figuren).
- `tools/schaetz-bilder.py` – erzeugt `js/games/schaetzen/images.js` aus den `image`-Feldern in `questions.js` (nutzt die Wikipedia-Abfragen aus `kmk-bilder.py`); nach Änderungen an den Bildern erneut ausführen und die Bilder kurz sichten (SVG-Grafiken sind oft unbrauchbar).

## GitHub & Veröffentlichen
- Projekt: github.com/CallMeJan57/partykiste (öffentlich). Seite: https://callmejan57.github.io/partykiste/ (GitHub Pages, liegt in einem Unterordner – deshalb nur relative Pfade verwenden)
- Zweige: `main` = Zwischenspeicher, `live` = veröffentlicht (GitHub Pages baut nur `live`)
- Änderungen committen und nach `main` pushen
- Erst wenn der Nutzer „go“ sagt: `main` nach `live` mergen und `live` pushen

## Artifact synchron halten
Nach jeder Änderung an der App das Artifact aktualisieren:
- URL: https://claude.ai/artifact/RVC8ho7GuvDBVsSJwNbEvA
- `file_path`: `index.html`, dazu in `files` **alle** Dateien unter `css/` und `js/` außer `js/games/_vorlage/`
- Gelöschte oder umbenannte Dateien zusätzlich mit `null` aus dem Artifact entfernen
