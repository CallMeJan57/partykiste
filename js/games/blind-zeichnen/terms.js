// Begriffe für „Blind zeichnen“ und die optionalen Chaos-Regeln.
// Neue Kategorie: einfach einen weiteren Block nach demselben Muster ergänzen.

export const categories = {
  tiere: {
    label: 'Tiere',
    hint: 'Elefant, Schnecke, Krake',
    terms: [
      'Elefant', 'Giraffe', 'Schnecke', 'Krake', 'Pinguin', 'Schildkröte', 'Igel', 'Hase', 'Katze', 'Hund',
      'Fisch', 'Schmetterling', 'Spinne', 'Krokodil', 'Schwein', 'Kuh', 'Pferd', 'Eule', 'Frosch', 'Hai',
      'Kamel', 'Maus', 'Biene', 'Qualle', 'Flamingo', 'Dinosaurier', 'Löwe', 'Affe', 'Ente', 'Wal',
      'Seepferdchen', 'Pfau', 'Nashorn', 'Zebra', 'Tiger', 'Bär', 'Koala', 'Panda', 'Fledermaus', 'Papagei',
      'Hummer', 'Seestern', 'Raupe', 'Marienkäfer', 'Delfin', 'Storch', 'Hahn', 'Lama', 'Schaf', 'Eichhörnchen',
    ],
  },
  essen: {
    label: 'Essen',
    hint: 'Pizza, Brezel, Spiegelei',
    terms: [
      'Pizza', 'Banane', 'Hamburger', 'Eistüte', 'Brezel', 'Spiegelei', 'Ananas', 'Erdbeere', 'Torte', 'Hotdog',
      'Karotte', 'Birne', 'Popcorn', 'Sushi', 'Croissant', 'Pommes', 'Kirschen', 'Wassermelone', 'Spaghetti', 'Donut',
      'Apfel', 'Käse', 'Brokkoli', 'Taco', 'Lolli', 'Muffin', 'Zitrone', 'Gurke', 'Pilz', 'Waffel',
      'Avocado', 'Kokosnuss', 'Weintrauben', 'Erdnuss', 'Tomate', 'Paprika', 'Maiskolben', 'Kartoffel', 'Pfannkuchen', 'Hähnchenschenkel',
      'Sandwich', 'Cupcake', 'Schokoladentafel', 'Milchshake', 'Kaffeetasse', 'Teekanne', 'Sektglas', 'Bierkrug', 'Grillspieß', 'Salatschüssel',
    ],
  },
  dinge: {
    label: 'Dinge',
    hint: 'Brille, Fahrrad, Glühbirne',
    terms: [
      'Brille', 'Regenschirm', 'Fahrrad', 'Schere', 'Glühbirne', 'Schlüssel', 'Kerze', 'Wecker', 'Handy', 'Gitarre',
      'Kamera', 'Rakete', 'Toilette', 'Zahnbürste', 'Hammer', 'Koffer', 'Luftballon', 'Anker', 'Krone', 'Stuhl',
      'Schreibtischlampe', 'Flugzeug', 'Auto', 'Segelboot', 'Telefon', 'Sonnenbrille', 'Schuh', 'Zylinder', 'Kaktus', 'Leiter',
      'Kopfhörer', 'Laptop', 'Fernseher', 'Gießkanne', 'Trompete', 'Schlagzeug', 'Uhr', 'Bett', 'Badewanne', 'Kühlschrank',
      'Staubsauger', 'Rollschuh', 'Skateboard', 'Papierflieger', 'Fallschirm', 'Hubschrauber', 'U-Boot', 'Traktor', 'Briefumschlag', 'Geschenk',
    ],
  },
  orte: {
    label: 'Orte & Natur',
    hint: 'Burg, Vulkan, Regenbogen',
    terms: [
      'Haus', 'Burg', 'Leuchtturm', 'Vulkan', 'Insel', 'Regenbogen', 'Berg', 'Baum', 'Blume', 'Sonne',
      'Mond', 'Wolke', 'Schneemann', 'Zelt', 'Brücke', 'Kirche', 'Pyramide', 'Eiffelturm', 'Iglu', 'Windmühle',
      'Strand', 'Wasserfall', 'Palme', 'Tannenbaum', 'Stern', 'Gewitter', 'Zug', 'Riesenrad', 'Spielplatz', 'Achterbahn',
      'Höhle', 'Wüste', 'Fluss', 'Vogelnest', 'Schloss', 'Wolkenkratzer', 'Freiheitsstatue', 'Kolosseum', 'Ampel', 'Schaukel',
      'Sandburg', 'Gletscher', 'Tornado', 'Vollmond', 'Sternschnuppe', 'Lagerfeuer', 'Baumhaus', 'Hängebrücke', 'Oase', 'Staudamm',
    ],
  },
  knifflig: {
    label: 'Knifflig',
    hint: 'Ganze Szenen und Figuren',
    terms: [
      'Weihnachtsmann', 'Astronaut', 'Meerjungfrau', 'Drache', 'Roboter', 'Einhorn', 'Superheld', 'Pirat', 'Zauberer', 'Ritter',
      'Feuerwehrauto', 'Hochzeit', 'Fußballspiel', 'Geburtstagsparty', 'Zahnarzt', 'Picknick', 'Schneeballschlacht', 'Zirkus', 'Disco', 'Camping',
      'Gespenst', 'Vampir', 'Bauernhof', 'Weltall', 'Unterwasserwelt', 'Rockband', 'Selfie', 'Hexe auf dem Besen', 'Ufo', 'Ritterburg',
      'Ballett', 'Mondlandung', 'Bankraub', 'Zombie', 'Schmelzender Schneemann', 'Katze auf dem Baum', 'Hund geht Gassi', 'Wellenreiten', 'Feuerwerk', 'Stau',
      'Bergsteiger', 'Kaffeeklatsch', 'Tauziehen', 'Zahnfee', 'Tauchen mit Haien', 'Gartenzwerg', 'Kater nach der Party', 'Oktoberfest', 'Pinguin auf Eisscholle', 'Kissenschlacht',
    ],
  },
};

// Optionale Zusatzregel pro Runde.
export const twists = [
  'Mit der schwachen Hand',
  'Ohne den Stift abzusetzen',
  'Stift in der Faust halten',
  'Nur gerade Linien',
  'Blatt steht auf dem Kopf',
  'Nach 10 Sekunden dreht jemand dein Blatt',
  'Stift ganz hinten anfassen',
  'Mit ausgestrecktem Arm',
  'Nur Kreise und Punkte',
  'Blatt auf dem Rücken einer anderen Person',
  'Stift zwischen zwei Fingern',
  'Im Stehen, Blatt an die Wand halten',
  'Jemand hält dein Handgelenk fest',
  'Kopf zur Seite drehen',
];
