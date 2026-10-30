#!/usr/bin/env python3
"""
Erzeugt die App-Symbole der Partykiste aus icons/icon.svg (nur macOS: nutzt qlmanage und sips).

Aufruf im Projektordner:  python3 tools/app-icons.py

Ergebnis in icons/:
  icon-512.png, icon-192.png   – fürs Web-App-Manifest
  icon-maskable-512.png        – mit Rand, damit Android den Inhalt beim Zuschneiden (Kreis, Tropfen …) nicht abschneidet
  apple-touch-icon.png (180)   – Symbol auf dem iPhone-Home-Bildschirm
"""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / 'icons'
SOURCE = ICONS / 'icon.svg'
MASKABLE_SCALE = 0.78  # Inhalt im sicheren Bereich (innere 80 %) halten


def render(svg_text, size, target):
    with tempfile.TemporaryDirectory() as tmp:
        svg = Path(tmp) / 'icon.svg'
        svg.write_text(svg_text, encoding='utf-8')
        subprocess.run(['qlmanage', '-t', '-s', str(size), '-o', tmp, str(svg)], check=True, capture_output=True)
        shutil.move(Path(tmp) / 'icon.svg.png', target)


def resize(source, size, target):
    shutil.copy(source, target)
    subprocess.run(['sips', '-z', str(size), str(size), str(target)], check=True, capture_output=True)


def maskable(svg_text):
    # Alles nach dem Hintergrund-Rechteck verkleinert in die Mitte setzen
    offset = 512 * (1 - MASKABLE_SCALE) / 2
    parts = re.split(r'(<rect width="512" height="512"[^>]*/>)', svg_text, maxsplit=1)
    body, end = parts[2].rsplit('</svg>', 1)
    return f'{parts[0]}{parts[1]}<g transform="translate({offset} {offset}) scale({MASKABLE_SCALE})">{body}</g></svg>{end}'


def main():
    svg = SOURCE.read_text(encoding='utf-8')
    big = ICONS / 'icon-512.png'
    render(svg, 512, big)
    resize(big, 192, ICONS / 'icon-192.png')
    resize(big, 180, ICONS / 'apple-touch-icon.png')
    render(maskable(svg), 512, ICONS / 'icon-maskable-512.png')
    for path in sorted(ICONS.glob('*.png')):
        print(path.relative_to(ROOT))


if __name__ == '__main__':
    main()
