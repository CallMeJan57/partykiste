#!/usr/bin/env python3
"""
Sucht für alle Songs aus „Song-Raten“ die Hörprobe bei der iTunes-Suche von Apple und schreibt die
Adressen nach js/games/song-raten/previews.js. So muss das Handy beim Spielen nicht selbst bei Apple
suchen (Safari am iPhone blockiert diese Anfrage oft) – es lädt nur noch die Musikdatei.

Aufruf im Projektordner (dauert wegen Apples Limit von ~20 Anfragen pro Minute etwa 25 Minuten):

    python3 tools/song-hoerproben.py

Die Auswahl der besten Fundstelle entspricht js/games/song-raten/itunes.js. Am Ende werden alle Songs
ohne passende Hörprobe aufgelistet – die am besten in songs.js ersetzen.
"""

import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SONGS = ROOT / 'js/games/song-raten/songs.js'
OUTPUT = ROOT / 'js/games/song-raten/previews.js'

PAUSE = 3.2  # Sekunden zwischen zwei Anfragen
UNWANTED = re.compile(
    r'karaoke|tribute|cover version|made famous|in the style of|originally performed|instrumental version|'
    r'[(\[]instrumental|string quartet|klingelton|ringtone|sped up|slowed|8-bit|lullaby|piano version|kita|'
    r'kinderlieder|for kids',
    re.I,
)
FILLER = {'der', 'die', 'das', 'the', 'und', 'and', 'of', 'von'}


def normalize(text):
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower().replace('ß', 'ss')
    text = re.sub(r'\b([a-z])\.(?=[a-z]\.?)', r'\1', text)
    text = re.sub(r'\((?:feat|ft|with)[^)]*\)', ' ', text)
    text = re.sub(r'\b(?:feat|ft)\.?\s.*$', ' ', text)
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def core_title(title):
    return normalize(re.sub(r'[(\[].*?[)\]]', ' ', title)) or normalize(title)


def score(result, artist, title):
    wanted = core_title(title)
    found = normalize(result.get('trackName', ''))
    if wanted not in found and core_title(result.get('trackName', '')) not in wanted:
        return -1
    if UNWANTED.search(f"{result.get('artistName', '')} {result.get('collectionName', '')} {result.get('trackName', '')}"):
        return -1
    points = 1
    words = [w for w in normalize(artist).split() if len(w) > 1 and w not in FILLER]
    found_artist = normalize(f"{result.get('artistName', '')} {result.get('collectionName', '')}")
    if any(w in found_artist for w in words):
        points += 2
    if found == wanted:
        points += 1
    return points


def search(artist, title):
    short_title = re.sub(r'[(\[].*?[)\]]', ' ', title)
    params = urllib.parse.urlencode({
        'term': f'{artist} {short_title}', 'media': 'music', 'entity': 'song', 'country': 'DE', 'limit': '15',
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(f'https://itunes.apple.com/search?{params}', timeout=30) as response:
                return json.load(response).get('results', [])
        except (urllib.error.HTTPError, urllib.error.URLError):
            time.sleep(30 * (attempt + 1))
    return None


def read_songs():
    source = SONGS.read_text(encoding='utf-8')
    pattern = re.compile(r"\[\s*(['\"])(.+?)\1\s*,\s*(['\"])(.+?)\3\s*\]")
    return list(dict.fromkeys((m[1], m[3]) for m in pattern.findall(source)))


def main():
    songs = read_songs()
    found = {}
    missing = []
    for number, (artist, title) in enumerate(songs, 1):
        results = search(artist, title)
        time.sleep(PAUSE)
        ranked = sorted(((score(r, artist, title), r) for r in results or [] if r.get('previewUrl')), key=lambda x: -x[0])
        if not ranked or ranked[0][0] <= 0:
            missing.append(f'{artist} – {title}')
        else:
            best = ranked[0][1]
            found[f'{artist}|{title}'] = {
                'preview': best['previewUrl'],
                'cover': (best.get('artworkUrl100') or '').replace('100x100bb', '600x600bb') or None,
                'year': (best.get('releaseDate') or '')[:4],
                'link': best.get('trackViewUrl'),
                'foundArtist': best.get('artistName'),
                'foundTitle': best.get('trackName'),
            }
        print(f'{number}/{len(songs)}', file=sys.stderr, flush=True)

    lines = [
        '// Automatisch erzeugt von tools/song-hoerproben.py – nicht von Hand bearbeiten.',
        '// Hörproben-Adressen je „Interpret|Titel“; fehlt ein Song, sucht itunes.js beim Spielen live.',
        '',
        'export default {',
    ]
    for key, value in found.items():
        lines.append(f'  {json.dumps(key, ensure_ascii=False)}: {json.dumps(value, ensure_ascii=False)},')
    lines += ['};', '']
    OUTPUT.write_text('\n'.join(lines), encoding='utf-8')

    print(f'{len(found)} von {len(songs)} Songs mit Hörprobe → {OUTPUT.relative_to(ROOT)}')
    if missing:
        print('Ohne passende Hörprobe:')
        for entry in missing:
            print(f'  - {entry}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
