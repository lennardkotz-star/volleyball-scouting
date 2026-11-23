# Volleyball Scouting

Web-App zum Scouten von Volleyballspielen, vor allem nachträglich aus dem Video. Die App sucht die Ballwechsel im Video, springt beim Scouten über die Pausen und wertet das Spiel auf Deutsch aus. Jeder Spieler bekommt per Link nur seine eigenen Werte.

Die App kommt ohne Build-Schritt, Server und Konten aus. Alle Daten bleiben im Browser des Geräts, Videos werden nirgends hochgeladen.

## Starten

```bash
python3 -m http.server 8377
```

Danach http://localhost:8377 öffnen. Am besten läuft die App in Chrome oder Edge auf dem Laptop.

## Veröffentlichen

Der Ordner lässt sich unverändert auf jeden statischen Webspace legen, etwa GitHub Pages, Netlify oder Cloudflare Pages. HTTPS ist nötig, sonst funktionieren Offline-Modus und Mikrofon nicht.

Vor der ersten öffentlichen Nutzung fehlen noch Impressum und Datenschutzerklärung. Sie müssen eure echten Angaben enthalten und sind deshalb nicht vorausgefüllt. `tests/` muss nicht mit hochgeladen werden.

Nach einer Änderung an den App-Dateien in `sw.js` die Versionsnummer `CACHE` erhöhen und neue Dateien in `FILES` eintragen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `css/app.css` | Farben und Schriften als Tokens, Grundbausteine |
| `css/look.css` | Erscheinungsbild: Tafel, Spielfeld, Video-Arbeitsplatz |
| `js/core.js` | Spielablauf, Regeln, Statistik, Trainingsfokus, Sprach- und Textparser |
| `js/app.js` | Oberfläche: Scouten, Spiele, Spieler, Daten, Speicher |
| `js/idb.js` | Browser-Datenbank (IndexedDB) |
| `js/rally.js` | Ballwechsel-Schnitt: Messung im Browser und Erkennung aus Pfiffen und Bewegung |
| `js/video.js` | Video-Arbeitsplatz: Player, Sprünge über die Pausen, Korrektur, Scout-Zeit |
| `js/zones.js` | Detailstufen, Zonen-Eingabe, Zonen-Auswertung, Muster-Finder, Detailrunde |
| `js/share.js` | Spielerkarte und Trainer-Ansicht als Link, Pilot-Kennzahlen |
| `js/main.js` | Verbindet die Module, meldet den Offline-Modus an |

## Tests

`tests/unit.html` im Browser öffnen, während der Server läuft. Die Seite prüft den Ballwechsel-Schnitt an simulierten Spielen mit bekannter Lösung sowie Parser und Spiellogik. `tests/testvideo.js` erzeugt ein künstliches Spielvideo für Durchläufe von Anfang bis Ende.

Diese Tests beweisen nicht, dass der Schnitt echte Hallenvideos schafft. Das misst erst der Pilot-Test: Daten → Pilot-Test zeigt die Trefferquote aus euren Korrekturen.

## Technik

Reines Frontend aus HTML, CSS und JavaScript, ohne Framework und ohne Build-Schritt. Es gibt noch kein Backend: Die Daten liegen in der IndexedDB des jeweiligen Browsers. `python3 -m http.server` liefert nur die Dateien aus.

In `docs/recherche/` liegen der Designbericht und die Recherchenotizen.

## Bewusst noch nicht gebaut

Die Marktanalyse sieht diese Teile erst vor, wenn die Kriterien im April 2027 erfüllt sind:

- Team-Konten und gemeinsamer Speicher auf einem Server. Bis dahin tauschen zwei Scouts die Daten per Backup-Datei.
- Bezahlung. Im Pilot läuft die Vorkasse von Hand.
- KI-Videoanalyse. Laut Analyse ist sie verworfen.

Aus dem Plan zum Detail-Scouting fehlen noch: explizites Zuspiel als eigene Aktion, Angriffs- und Aufschlagarten, Subzonen A–D, Wischgeste im Feld und der `.dvw`-Export.
