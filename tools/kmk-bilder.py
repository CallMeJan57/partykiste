#!/usr/bin/env python3
"""
Sucht für alle Namen aus „Kiss, Marry, Kill“ ein Bild bei Wikipedia und schreibt die
Bildadressen nach js/games/kiss-marry-kill/images.js. Die Bilder selbst werden nicht
heruntergeladen – das Spiel lädt sie beim Spielen direkt von Wikipedia.

Aufruf im Projektordner:

    python3 tools/kmk-bilder.py

Am Ende listet das Skript alle Namen ohne Bild auf. Für die trägst du unten bei WIKI_TITLES
den passenden Artikel der englischen Wikipedia ein (Titel aus der Adresszeile, z. B.
„Elsa (Frozen)“) und startest das Skript erneut. Mehrere Vorschläge als Liste sind erlaubt –
der erste, der ein Bild hat, gewinnt. Mit „de:“ davor wird die deutsche Wikipedia genutzt,
z. B. wenn das englische Foto ein Gruppenbild ist. Hat ein Artikel kein Hauptbild, kann auch
direkt eine Bilddatei angegeben werden, z. B. „File:Anna Frozen.png“.

Wichtig bei mehrdeutigen Namen: „Storm“, „Thor“ oder „Maui“ würden sonst ein Unwetter,
einen Gott oder eine Insel liefern. Fiktive Figuren deshalb immer hier eintragen.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHARACTERS = ROOT / 'js/games/kiss-marry-kill/characters.js'
OUTPUT = ROOT / 'js/games/kiss-marry-kill/images.js'

USER_AGENT = 'Partykiste/1.0 (privates Partyspiel; Bildersuche fuer Kiss Marry Kill)'
THUMB_SIZE = 320

# Name im Spiel  ->  Artikel der englischen Wikipedia (oder Liste von Vorschlägen)
WIKI_TITLES = {
    # Echte Personen, deren englisches Foto ein Gruppenbild ist
    'Justin Bieber': ['de:Justin Bieber', 'Justin Bieber'],
    'Lewis Hamilton': ['de:Lewis Hamilton', 'Lewis Hamilton'],
    'Michelle Hunziker': ['de:Michelle Hunziker', 'Michelle Hunziker'],

    # Musik
    'Drake': ['Drake (musician)'],
    'Cro': ['Cro (rapper)', 'Cro (singer)'],
    'Mark Forster': ['Mark Forster (singer)'],
    'Peter Fox': ['Peter Fox (musician)', 'Peter Fox (singer)'],
    'Adele': ['Adele'],

    # Deutsche Promis
    'Pietro Lombardi': ['Pietro Lombardi (singer)', 'Pietro Lombardi'],

    # Disney
    'Elsa': ['Elsa (Frozen)'],
    'Anna': ['Anna (Frozen)', 'File:Anna Frozen.png'],
    'Tiana': ['Tiana (Disney character)', 'Tiana (The Princess and the Frog)'],
    'Cinderella': ['Cinderella (Disney character)'],
    'Rapunzel': ['Rapunzel (Disney)', 'Rapunzel (Tangled)'],
    'Megara': ['Megara (Disney)', 'Megara (Hercules)'],
    'Pocahontas': ['Pocahontas (Disney character)', 'File:Pocahontas Disney.png'],
    'Jane Porter': ['Jane Porter (Disney)', 'Jane Porter (Tarzan)'],
    'Judy Hopps': ['File:Judy Hopps.webp'],
    'Elastigirl': ['Elastigirl', 'Helen Parr'],
    'Maleficent': ['Maleficent'],
    'Ursula': ['Ursula (The Little Mermaid)'],
    'Cruella de Vil': ['Cruella de Vil'],
    'Mutter Gothel': ['Mother Gothel'],
    'Die böse Königin': ['Evil Queen (Disney)'],
    'Aladdin': ['Aladdin (Disney character)'],
    'Flynn Rider': ['Flynn Rider'],
    'Kristoff': ['Kristoff (Frozen)', 'Kristoff (Disney)'],
    'Hans': ['Hans (Frozen)', "File:Hans from Disney's Frozen.png"],
    'Gaston': ['Gaston (Beauty and the Beast)'],
    'Dschinni': ['Genie (Aladdin)', 'Genie (Disney)'],
    'Dschafar': ['Jafar (Aladdin)', 'Jafar (Disney)'],
    'Maui': ['Maui (Moana)', 'Maui (Disney)'],
    'Mufasa': ['Mufasa'],
    'Buzz Lightyear': ['Buzz Lightyear'],
    'Woody': ['Woody (Toy Story)', 'Sheriff Woody'],
    'Kapitän Hook': ['Captain Hook (Disney)', 'Captain Hook'],
    'Mr. Incredible': ['Mr. Incredible', 'Bob Parr'],
    'Nick Wilde': ['File:Nick Wilde Zootopia 2.webp'],
    'Scar': ['Scar (The Lion King)'],

    # Marvel – bevorzugt die Filmversion, damit bekannte Gesichter erscheinen
    'Black Widow': ['Natasha Romanoff (Marvel Cinematic Universe)', 'Black Widow (Natasha Romanova)'],
    'Scarlet Witch': ['Wanda Maximoff (Marvel Cinematic Universe)', 'Scarlet Witch'],
    'Captain Marvel': ['Carol Danvers (Marvel Cinematic Universe)', 'Carol Danvers'],
    'Gamora': ['Gamora (Marvel Cinematic Universe)', 'Gamora'],
    'Nebula': ['Nebula (Marvel Cinematic Universe)', 'Nebula (Marvel Comics)'],
    'Storm': ['Storm (Marvel Comics)'],
    'Jean Grey': ['Jean Grey'],
    'Mystique': ['Mystique (Marvel Comics)'],
    'She-Hulk': ['Jennifer Walters (Marvel Cinematic Universe)', 'She-Hulk'],
    'Wasp': ['Hope van Dyne (Marvel Cinematic Universe)', 'Hope Pym', 'Wasp (character)'],
    'Okoye': ['Okoye (character)', 'Danai Gurira'],  # Schauspielerin, die Okoye spielt
    'Valkyrie': ['Valkyrie (Marvel Cinematic Universe)', 'Valkyrie (Marvel Comics)'],
    'Hela': ['Hela (Marvel Cinematic Universe)', 'Hela (character)'],
    'Pepper Potts': ['Pepper Potts (Marvel Cinematic Universe)', 'Pepper Potts'],
    'Mantis': ['Mantis (Marvel Cinematic Universe)', 'Mantis (Marvel Comics)'],
    'Jessica Jones': ['Jessica Jones (Marvel Cinematic Universe)', 'Jessica Jones'],
    'Elektra': ['Elektra (character)', 'Elektra (Marvel Comics)'],
    'Iron Man': ['Tony Stark (Marvel Cinematic Universe)', 'Iron Man'],
    'Captain America': ['Steve Rogers (Marvel Cinematic Universe)', 'Captain America'],
    'Thor': ['Thor (Marvel Cinematic Universe)', 'Thor (Marvel Comics)'],
    'Hulk': ['File:Mark Ruffalo as "Professor Hulk".jpeg', 'Bruce Banner (Marvel Cinematic Universe)'],
    'Black Panther': ["T'Challa (Marvel Cinematic Universe)", 'Black Panther (character)'],
    'Doctor Strange': ['Stephen Strange (Marvel Cinematic Universe)', 'Doctor Strange'],
    'Loki': ['Loki (Marvel Cinematic Universe)', 'Loki (Marvel Comics)'],
    'Thanos': ['Thanos (Marvel Cinematic Universe)', 'Thanos'],
    'Deadpool': ['Deadpool (film character)', 'Deadpool'],
    'Wolverine': ['Wolverine (film character)', 'Wolverine (character)'],
    'Ant-Man': ['Scott Lang (Marvel Cinematic Universe)', 'Scott Lang'],
    'Star-Lord': ['Peter Quill (Marvel Cinematic Universe)', 'Star-Lord'],
    'Hawkeye': ['Clint Barton (Marvel Cinematic Universe)', 'Hawkeye (Clint Barton)'],
    'Falcon': ['Sam Wilson (Marvel Cinematic Universe)', 'Sam Wilson (character)'],
    'Winter Soldier': ['Bucky Barnes (Marvel Cinematic Universe)', 'Bucky Barnes'],
    'Groot': ['Groot (Marvel Cinematic Universe)', 'Groot'],
    'Vision': ['Vision (Marvel Cinematic Universe)', 'Vision (Marvel Comics)'],
    'Nick Fury': ['Nick Fury (Marvel Cinematic Universe)', 'Nick Fury'],
    'Magneto': ['Magneto (Marvel Comics)', 'Magneto (film character)'],

    # Star Wars
    'Prinzessin Leia': ['Princess Leia'],
    'Rey': ['Rey (Star Wars)'],
    'Jyn Erso': ['Jyn Erso'],
    'Qi’ra': ["Qi'ra"],
    'Rose Tico': ['Rose Tico'],
    'Captain Phasma': ['Captain Phasma'],
    'Mon Mothma': ['Mon Mothma'],
    'Hera Syndulla': ['Hera Syndulla'],
    'Bo-Katan Kryze': ['Bo-Katan Kryze'],
    'Cara Dune': ['Cara Dune'],
    'Asajj Ventress': ['Asajj Ventress'],
    'Fennec Shand': ['Fennec Shand'],
    'Maz Kanata': ['Maz Kanata'],
    'Luke Skywalker': ['Luke Skywalker'],
    'Han Solo': ['Han Solo'],
    'Darth Vader': ['Darth Vader'],
    'Obi-Wan Kenobi': ['Obi-Wan Kenobi'],
    'Lando Calrissian': ['Lando Calrissian'],
    'Kylo Ren': ['Kylo Ren'],
    'Poe Dameron': ['Poe Dameron'],
    'Finn': ['Finn (Star Wars)'],
    'Yoda': ['Yoda'],
    'Chewbacca': ['Chewbacca'],
    'Boba Fett': ['Boba Fett'],
    'Der Mandalorianer': ['Din Djarin', 'The Mandalorian (character)'],
    'Qui-Gon Jinn': ['Qui-Gon Jinn'],
    'Mace Windu': ['Mace Windu'],
    'Count Dooku': ['Count Dooku'],
    'Imperator Palpatine': ['Palpatine'],
    'Cassian Andor': ['Cassian Andor'],
    'Darth Maul': ['Darth Maul'],
    'Jabba der Hutte': ['Jabba the Hutt'],

    # Serien
    'Penny (Big Bang Theory)': ['Penny (The Big Bang Theory)'],
    'Walter White': ['Walter White (Breaking Bad)', 'Walter White (character)'],
    'Jesse Pinkman': ['Jesse Pinkman'],
    'Dr. House': ['Gregory House'],
    'Michael Scott': ['Michael Scott (The Office)'],
    'Jon Snow': ['Jon Snow (character)'],
    'Don Draper': ['Don Draper'],
    'Skyler White': ['Skyler White'],
    'Olivia Pope': ['Olivia Pope', 'File:Kerry Washington Django avp.jpg'],
    'Pam Beesly': ['Pam Beesly'],
    'Meredith Grey': ['Meredith Grey'],
    'Lorelai Gilmore': ['Lorelai Gilmore'],
    'Carrie Bradshaw': ['Carrie Bradshaw'],
    'Cersei Lannister': ['Cersei Lannister'],
    'Daenerys Targaryen': ['Daenerys Targaryen'],
    'Robin Scherbatsky': ['Robin Scherbatsky'],
    'Phoebe Buffay': ['Phoebe Buffay'],
    'Monica Geller': ['Monica Geller'],
    'Rachel Green': ['Rachel Green'],
    'Joey Tribbiani': ['Joey Tribbiani'],
    'Chandler Bing': ['Chandler Bing'],
    'Ross Geller': ['Ross Geller'],
    'Barney Stinson': ['File:Barney Stinson HIMYM.jpg'],
    'Ted Mosby': ['Ted Mosby'],
    'Sheldon Cooper': ['Sheldon Cooper'],
    'Dwight Schrute': ['Dwight Schrute'],
    'Tyrion Lannister': ['Tyrion Lannister'],
    'Lily Aldrin': ['Lily Aldrin'],
    'Bernadette Rostenkowski': ['Melissa Rauch'],  # Schauspielerin – die Figur hat kein eigenes Bild
    'Amy Farrah Fowler': ['Amy Farrah Fowler'],
    'Brienne von Tarth': ['Brienne of Tarth'],
    'Margaery Tyrell': ['Margaery Tyrell'],
    'Samantha Jones': ['Samantha Jones (Sex and the City)'],
    'Miranda Hobbes': ['Miranda Hobbes'],
    'Charlotte York': ['Charlotte York Goldenblatt', 'Charlotte York'],
    'Cristina Yang': ['File:Sandra Oh 2016.jpg'],  # Schauspielerin
    'Claire Underwood': ['Claire Underwood'],
    'Joan Holloway': ['Joan Holloway', 'Joan Harris'],
    'Leslie Knope': ['Leslie Knope'],
    'Jessica Day': ['Jess Day', 'Jessica Day (New Girl)'],
    'Marshall Eriksen': ['Marshall Eriksen'],
    'Leonard Hofstadter': ['Leonard Hofstadter'],
    'Howard Wolowitz': ['Howard Wolowitz'],
    'Raj Koothrappali': ['Raj Koothrappali'],
    'Jim Halpert': ['Jim Halpert'],
    'Ned Stark': ['Eddard Stark'],
    'Jaime Lannister': ['Jaime Lannister'],
    'Daryl Dixon': ['Daryl Dixon'],
    'Saul Goodman': ['Saul Goodman'],
    'Derek Shepherd': ['Derek Shepherd'],
    'Frank Underwood': ['Frank Underwood (House of Cards)', 'Francis Underwood'],
    'Ron Swanson': ['Ron Swanson'],
    'Nick Miller': ['Jake Johnson'],  # Schauspieler – Artikelbild ist ein Gruppenbild
    'Tommy Shelby': ['Thomas Shelby', 'Tommy Shelby'],

    # Echte Personen mit mehrdeutigem Namen (Erweiterung)
    'Chris Evans': ['Chris Evans (actor)'],
    'Travis Scott': ['File:TravisScott-byPhilipRomano (cropped).jpg', 'Travis Scott'],
    'Sarah Connor': ['Sarah Connor (singer)'],
    'Chris Martin': ['Chris Martin'],
    'Usher': ['Usher (musician)'],
    'Madonna': ['Madonna'],
    'Michael Bully Herbig': ['Michael Herbig'],
    'Tom Schilling': ['Tom Schilling'],
    'Maria Scharapowa': ['Maria Sharapova'],

    # Disney (Erweiterung)
    'Giselle': ['Giselle (Enchanted)'],
    'Freude': ['Joy (Inside Out)'],
    'Nani': ['Nani Pelekai', 'Nani (Lilo & Stitch)'],
    'Nala': ['Nala (The Lion King)'],
    'Jessie': ['Jessie (Toy Story)'],
    'Bo Peep': ['Bo Peep (Toy Story)'],
    'Tinker Bell': ['Tinker Bell (Disney)', 'Tinker Bell'],
    'Daisy Duck': ['Daisy Duck'],
    'Edna Mode': ['Edna Mode'],
    'Lady Tremaine': ['Lady Tremaine'],
    'Herzkönigin': ['Queen of Hearts (Disney)', 'Queen of Hearts (Alice in Wonderland)'],
    'Sally': ['Sally (The Nightmare Before Christmas)'],
    'Gute Fee': ['Fairy Godmother (Cinderella)', 'Fairy Godmother (Disney)'],
    'Colette': ['Colette Tatou'],
    'Micky Maus': ['Mickey Mouse'],
    'Donald Duck': ['Donald Duck'],
    'Goofy': ['Goofy'],
    'Olaf': ['Olaf (Frozen)'],
    'Lightning McQueen': ['Lightning McQueen'],
    'Balu': ['Baloo'],
    'Pumbaa': ['Pumbaa', 'Timon and Pumbaa'],
    'Robin Hood': ['Robin Hood (Disney character)'],
    'Mike Glotzkowski': ['Mike Wazowski'],
    'Lumière': ['Lumière (Beauty and the Beast)', 'Lumière (Disney)'],
    'Sebastian': ['Sebastian (The Little Mermaid)'],

    # Marvel (Erweiterung)
    'Yelena Belova': ['Yelena Belova (Marvel Cinematic Universe)', 'Yelena Belova'],
    'Maria Hill': ['Maria Hill (Marvel Cinematic Universe)', 'Maria Hill'],
    'Peggy Carter': ['Peggy Carter (Marvel Cinematic Universe)', 'Peggy Carter'],
    'Sif': ['Sif (Marvel Cinematic Universe)', 'Sif (Marvel Comics)'],
    'Jane Foster': ['Jane Foster (Marvel Cinematic Universe)', 'Jane Foster'],
    'Monica Rambeau': ['Monica Rambeau (Marvel Cinematic Universe)', 'Monica Rambeau'],
    'Nakia': ["Lupita Nyong'o"],  # Schauspielerin – die Figur hat kein eigenes Bild
    'Ramonda': ['Ramonda'],
    'Agatha Harkness': ['Agatha Harkness (Marvel Cinematic Universe)', 'Agatha Harkness'],
    'Black Cat': ['Black Cat (Marvel Comics)'],
    'Psylocke': ['Psylocke'],
    'Emma Frost': ['Emma Frost'],
    'Domino': ['Domino (character)'],
    'Invisible Woman': ['Invisible Woman'],
    'Ghost': ['Hannah John-Kamen'],  # Schauspielerin – die Figur hat kein eigenes Bild
    'Echo': ['Maya Lopez (Marvel Cinematic Universe)', 'Echo (Marvel Comics)'],
    'Karen Page': ['Deborah Ann Woll'],  # Schauspielerin – Artikelbild ist ein Gruppenbild
    'Daredevil': ['Matt Murdock (Marvel Cinematic Universe)', 'Daredevil (Marvel Comics character)'],
    'Punisher': ['Frank Castle (Marvel Cinematic Universe)', 'Punisher'],
    'Moon Knight': ['Marc Spector (Marvel Cinematic Universe)', 'Moon Knight'],
    'Shang-Chi': ['Shang-Chi (Marvel Cinematic Universe)', 'Shang-Chi'],
    'Ultron': ['Ultron (Marvel Cinematic Universe)', 'Ultron'],
    'Red Skull': ['Red Skull (Marvel Cinematic Universe)', 'Red Skull'],
    'Killmonger': ['Erik Killmonger', "N'Jadaka"],
    'Drax': ['Drax the Destroyer (Marvel Cinematic Universe)', 'Drax the Destroyer'],
    'Rocket': ['Rocket Raccoon (Marvel Cinematic Universe)', 'Rocket Raccoon'],
    'Yondu': ['Yondu (Marvel Cinematic Universe)', 'Yondu'],
    'War Machine': ['James Rhodes (Marvel Cinematic Universe)', 'War Machine'],
    'Professor X': ['Professor X (film character)', 'Professor X'],
    'Cyclops': ['Cyclops (Marvel Comics)'],
    'Gambit': ['Gambit (Marvel Comics)'],
    'Ghost Rider': ['Ghost Rider (Johnny Blaze)', 'Ghost Rider'],
    'Luke Cage': ['Luke Cage (Marvel Cinematic Universe)', 'Luke Cage'],
    'Silver Surfer': ['Silver Surfer'],
    'Venom': ['Venom (character)', 'Venom (Marvel Comics character)'],
    'Kingpin': ['Kingpin (Marvel Cinematic Universe)', 'Kingpin (character)'],

    # Star Wars (Erweiterung)
    'Mara Jade': ['Mara Jade'],
    'Amilyn Holdo': ['Amilyn Holdo'],
    'Doctor Aphra': ['Doctor Aphra'],
    'Morgan Elsbeth': ['Diana Lee Inosanto'],  # Schauspielerin – Artikelbild ist ein Gruppenbild
    'Bix Caleen': ['Bix Caleen'],
    'Bastila Shan': ['Bastila Shan'],
    'Dedra Meero': ['Dedra Meero'],
    'Vel Sartha': ['Faye Marsay'],  # Schauspielerin – die Figur hat kein eigenes Bild
    'Val': ['Thandiwe Newton'],  # Schauspielerin
    'Thrawn': ['Thrawn'],
    'Moff Gideon': ['Moff Gideon'],
    'Grand Moff Tarkin': ['Grand Moff Tarkin', 'Wilhuff Tarkin'],
    'General Grievous': ['General Grievous'],
    'General Hux': ['Armitage Hux', 'General Hux'],
    'Wedge Antilles': ['Wedge Antilles'],
    'Jango Fett': ['Jango Fett'],
    'Captain Rex': ['Captain Rex'],
    'Kanan Jarrus': ['Kanan Jarrus'],
    'Cal Kestis': ['Cal Kestis'],
    'Saw Gerrera': ['Saw Gerrera'],
    'Chirrut Îmwe': ['Donnie Yen'],  # Schauspieler – Artikelbild ist ein Buchcover
    'Orson Krennic': ['Orson Krennic', 'Director Krennic'],
    'Greef Karga': ['Greef Karga'],
    'Bail Organa': ['Jimmy Smits'],  # Schauspieler – die Figur hat kein eigenes Bild
    'Luthen Rael': ['Luthen Rael'],
    'C-3PO': ['File:Parents of Earth, are your children fully immunized (4647268251) (cropped) auto color (cropped to C-3PO).jpg'],
    'R2-D2': ['R2-D2'],
}


def read_names():
    source = CHARACTERS.read_text(encoding='utf-8')
    names = []
    for block in re.findall(r"\b(?:female|male): \[(.*?)\]", source, re.S):
        names.extend(re.findall(r"'([^']+)'", block))
    return list(dict.fromkeys(names))


def usable(url):
    """Logos und Grafiken (z. B. Serien-Schriftzüge) sind keine brauchbaren Porträts."""
    lowered = urllib.parse.unquote(url).lower()
    return 'logo' not in lowered and '.svg' not in lowered


def get_json(url):
    """Lädt eine API-Antwort. Bremst Wikipedia („zu viele Anfragen“), wird kurz gewartet."""
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 3:
                raise
            wait = 15 * (attempt + 1)
            print(f'Wikipedia bremst – warte {wait} Sekunden …')
            time.sleep(wait)
        finally:
            time.sleep(0.5)  # freundlicher Abstand zwischen den Anfragen


def fetch_thumbnails(titles, lang):
    """Fragt bis zu 50 Artikel auf einmal ab. Liefert {angefragter Titel: Bildadresse}."""
    params = {
        'action': 'query', 'format': 'json', 'formatversion': '2', 'redirects': '1',
        'prop': 'pageimages', 'piprop': 'thumbnail', 'pithumbsize': str(THUMB_SIZE), 'pilicense': 'any',
        'titles': '|'.join(titles),
    }
    data = get_json(f'https://{lang}.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params))['query']

    # Weiterleitungen und Schreibweisen-Korrekturen zurückverfolgen
    final = {title: title for title in titles}
    for step in ('normalized', 'redirects'):
        mapping = {entry['from']: entry['to'] for entry in data.get(step, [])}
        final = {asked: mapping.get(current, current) for asked, current in final.items()}

    images = {
        page['title']: page['thumbnail']['source'].split('?')[0]  # ohne Tracking-Parameter
        for page in data.get('pages', []) if 'thumbnail' in page and usable(page['thumbnail']['source'])
    }
    return {asked: images[current] for asked, current in final.items() if current in images}


def fetch_files(files):
    """Verkleinerte Adressen für Bilddateien („File:…“). Liefert {Dateiname: Bildadresse}."""
    params = {
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': str(THUMB_SIZE),
        'titles': '|'.join(files),
    }
    data = get_json('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params))['query']

    final = {name: name for name in files}
    for entry in data.get('normalized', []):
        final = {asked: entry['to'] if current == entry['from'] else current for asked, current in final.items()}
    urls = {
        page['title']: (page['imageinfo'][0].get('thumburl') or page['imageinfo'][0]['url']).split('?')[0]
        for page in data.get('pages', []) if page.get('imageinfo')
    }
    return {asked: urls[current] for asked, current in final.items() if current in urls}


def classify(title):
    """Vorschlag → (Quelle, Titel). Quellen: 'en' / 'de' = Artikel, 'file' = Bilddatei."""
    if title.startswith('File:'):
        return ('file', title)
    if title.startswith('de:'):
        return ('de', title[3:])
    return ('en', title)


def find_images(names):
    candidates = {}
    for name in names:
        titles = WIKI_TITLES.get(name, [name])
        titles = [titles] if isinstance(titles, str) else titles
        candidates[name] = [classify(title) for title in titles]
        # Notlösung: dieselben Artikel zuletzt noch in der deutschen Wikipedia suchen
        candidates[name] += [('de', title) for source, title in candidates[name] if source == 'en']

    results = {}
    for source in ('en', 'de', 'file'):
        titles = list(dict.fromkeys(t for options in candidates.values() for s, t in options if s == source))
        for start in range(0, len(titles), 50):
            batch = titles[start:start + 50]
            fetched = fetch_files(batch) if source == 'file' else fetch_thumbnails(batch, source)
            for title, url in fetched.items():
                results[(source, title)] = url

    found = {}
    for name in names:
        for option in candidates[name]:
            if option in results:
                found[name] = results[option]
                break
    return found


def write_output(names, found):
    lines = [
        '// Automatisch erzeugt von tools/kmk-bilder.py – nicht von Hand bearbeiten.',
        '// Die Bilder werden beim Spielen direkt von Wikipedia/Wikimedia geladen.',
        '',
        'export default {',
    ]
    for name in names:
        if name in found:
            lines.append(f'  {json.dumps(name, ensure_ascii=False)}: {json.dumps(found[name])},')
    lines += ['};', '']
    OUTPUT.write_text('\n'.join(lines), encoding='utf-8')


def main():
    names = read_names()
    found = find_images(names)
    write_output(names, found)

    missing = [name for name in names if name not in found]
    print(f'{len(found)} von {len(names)} Namen haben ein Bild → {OUTPUT.relative_to(ROOT)}')
    if missing:
        print('Ohne Bild (in WIKI_TITLES eintragen):')
        for name in missing:
            print(f'  - {name}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
