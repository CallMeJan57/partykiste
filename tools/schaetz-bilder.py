#!/usr/bin/env python3
"""
Sucht für alle Fragen aus „Schätz mal!“ das Bild zum angegebenen Wikipedia-Artikel und schreibt
die Bildadressen nach js/games/schaetzen/images.js. Die Bilder selbst werden nicht heruntergeladen –
das Spiel lädt sie beim Spielen direkt von Wikipedia.

Aufruf im Projektordner:

    python3 tools/schaetz-bilder.py

Welches Bild eine Frage bekommt, steht in questions.js im Feld „image“: der Titel eines englischen
Wikipedia-Artikels, mit „de:“ davor ein deutscher Artikel, mit „File:“ davor direkt eine Bilddatei.
Am Ende listet das Skript alle Artikel ohne Bild auf.
"""

import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = ROOT / 'js/games/schaetzen/questions.js'
OUTPUT = ROOT / 'js/games/schaetzen/images.js'

# Die Wikipedia-Abfragen sind dieselben wie für Kiss, Marry, Kill – nur größere Bilder.
_spec = importlib.util.spec_from_file_location('kmk_bilder', ROOT / 'tools/kmk-bilder.py')
wiki = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wiki)
wiki.THUMB_SIZE = 640
wiki.USER_AGENT = 'Partykiste/1.0 (privates Partyspiel; Bildersuche fuer Schaetzfragen)'


def read_titles():
    source = QUESTIONS.read_text(encoding='utf-8')
    titles = [match[1] for match in re.findall(r"""image: (['"])(.+?)\1""", source)]
    return list(dict.fromkeys(titles))


def find_images(titles):
    options = {title: [wiki.classify(title)] for title in titles}
    # Notlösung: englische Artikel ohne Bild noch in der deutschen Wikipedia suchen
    for title, choices in options.items():
        choices += [('de', name) for source, name in choices if source == 'en']

    results = {}
    for source in ('en', 'de', 'file'):
        names = list(dict.fromkeys(name for choices in options.values() for s, name in choices if s == source))
        for start in range(0, len(names), 50):
            batch = names[start:start + 50]
            fetched = wiki.fetch_files(batch) if source == 'file' else wiki.fetch_thumbnails(batch, source)
            for name, url in fetched.items():
                results[(source, name)] = url

    found = {}
    for title, choices in options.items():
        for choice in choices:
            if choice in results:
                found[title] = results[choice]
                break
    return found


def write_output(titles, found):
    lines = [
        '// Automatisch erzeugt von tools/schaetz-bilder.py – nicht von Hand bearbeiten.',
        '// Die Bilder werden beim Spielen direkt von Wikipedia/Wikimedia geladen.',
        '',
        'export default {',
    ]
    for title in titles:
        if title in found:
            lines.append(f'  {json.dumps(title, ensure_ascii=False)}: {json.dumps(found[title])},')
    lines += ['};', '']
    OUTPUT.write_text('\n'.join(lines), encoding='utf-8')


def main():
    titles = read_titles()
    found = find_images(titles)
    write_output(titles, found)

    missing = [title for title in titles if title not in found]
    print(f'{len(found)} von {len(titles)} Bildern gefunden → {OUTPUT.relative_to(ROOT)}')
    if missing:
        print('Ohne Bild (anderen Artikel oder „File:…“ eintragen):')
        for title in missing:
            print(f'  - {title}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
