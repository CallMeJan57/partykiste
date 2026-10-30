// Wörter für „Storychaos³“ – jedes Paket liefert Wörter für alle drei Walzen:
//   wer = Figur, wo = Ort, was = Gegenstand
// Neues Paket: einfach einen weiteren Block nach demselben Muster ergänzen.
// Ein | in langen Wörtern markiert, wo das Wort auf der Walze umbrechen darf (z. B. 'Klassen|lehrer').

export default {
  alltag: {
    label: 'Alltag',
    hint: 'Oma, Baumarkt, Gartenzwerg',
    wer: [
      'Oma', 'Haus|meister', 'Postbotin', 'Nachbarin', 'Busfahrer', 'Zahn|ärztin', 'Klassen|lehrer', 'Baby', 'Polizist', 'Kassie|rerin',
      'Opa', 'Tierarzt', 'Pizzabote', 'Schwieger|mutter', 'Bürger|meister', 'Fitness|trainerin', 'Influen|cerin', 'Dackel', 'Katze', 'Taxi|fahrer',
    ],
    wo: [
      'Super|markt', 'Bahnhof', 'Warte|zimmer', 'Aufzug', 'Klein|garten', 'Wasch|salon', 'Fitness|studio', 'Baumarkt', 'Freibad', 'Autobahn',
      'Camping|platz', 'Eltern|abend', 'Kantine', 'Dachboden', 'Bus|haltestelle', 'Möbelhaus', 'Friseur|salon', 'Hochzeit', 'Flughafen', 'Parkhaus',
    ],
    was: [
      'Garten|zwerg', 'Staub|sauger', 'Einkaufs|wagen', 'Fern|bedienung', 'Kaffee|maschine', 'Regen|schirm', 'Bohr|maschine', 'Socke', 'Thermos|kanne', 'Rasen|mäher',
      'Zahn|bürste', 'Pfand|flasche', 'Lotto|schein', 'Wäsche|klammer', 'Ladekabel', 'Klopapier', 'Toaster', 'Kuchen|blech', 'Schlüssel|bund', 'Gummi|stiefel',
    ],
  },

  fantasie: {
    label: 'Fantasie',
    hint: 'Drache, Raumschiff, Zauberstab',
    wer: [
      'Drache', 'Zauberer', 'Einhorn', 'Vampir', 'Pirat', 'Meer|jungfrau', 'Roboter', 'Alien', 'Ritter', 'Hexe',
      'Zwerg', 'Geist', 'Prinzes|sin', 'Werwolf', 'Super|heldin', 'Dino|saurier', 'Troll', 'Fee', 'Mumie', 'Zeit|reisender',
    ],
    wo: [
      'Schloss', 'Raum|schiff', 'Vulkan', 'Unterwasser|stadt', 'Zauber|wald', 'Wüste', 'Mond', 'Geister|bahn', 'Dschungel', 'Iglu',
      'Piraten|schiff', 'Labyrinth', 'Wolken|kratzer', 'Tropfstein|höhle', 'Leucht|turm', 'Zirkus|zelt', 'Pyramide', 'Baumhaus', 'Nordpol', 'Parallel|universum',
    ],
    was: [
      'Zauber|stab', 'Schatz|karte', 'Kristall|kugel', 'Zeit|maschine', 'Laser|schwert', 'Wunder|lampe', 'Teleskop', 'Krone', 'Flaschen|post', 'Zauber|trank',
      'Kompass', 'Fliegender Teppich', 'Riesenei', 'Tarnkappe', 'Gold|barren', 'Drachen|zahn', 'Kanone', 'Zauber|spiegel', 'Schwert', 'Glücks|klee',
    ],
  },

  party: {
    label: 'Party',
    hint: 'Türsteher, Ballermann, Tequila',
    wer: [
      'Türsteher', 'DJ', 'Barkee|perin', 'Ex', 'Schlager|star', 'Animateur', 'Kegelclub', 'Reality-Star', 'Jung|gesellin', 'Erst|semester',
      'Karaoke|könig', 'Tanz|lehrerin', 'Bier|königin', 'Mallorca-Urlauber', 'Stammgast', 'Hochzeits|crasher', 'Geburtstags|kind', 'Rentner|band', 'Fußball|fan', 'Party|schreck',
    ],
    wo: [
      'Baller|mann', 'Après-Ski-Hütte', 'Karaoke-Bar', 'WG-Party', 'Festival', 'Club|toilette', 'Schützen|fest', 'Oktober|fest', 'Kreuzfahrt|schiff', 'Dönerbude',
      'Bierzelt', 'Hotelpool', 'Dorfdisco', 'Kneipe', 'Afterhour', 'Tanz|schule', 'Partybus', 'Kegelbahn', 'Silvester|party', 'Abschluss|ball',
    ],
    was: [
      'Tequila', 'Konfetti', 'Disco|kugel', 'Luft|matratze', 'Kater', 'Bierpong-Becher', 'Schlager|platte', 'Glitzer|hose', 'Selfie-Stick', 'Sombrero',
      'Partyhut', 'Blumen|kette', 'Wodka-Melone', 'Nebel|maschine', 'Pizza|karton', 'Einhorn|kostüm', 'Schnaps|glas', 'Megafon', 'Wasser|pistole', 'Plastik|krone',
    ],
  },

  urlaub: {
    label: 'Urlaub',
    hint: 'Reiseleiterin, Hotelbuffet, Sonnenbrand',
    wer: [
      'Reise|leiterin', 'Rettungs|schwimmer', 'Anima|teurin', 'Zoll|beamter', 'Flug|begleiterin', 'Back|packerin', 'Kapitän', 'Hotelpage', 'Surf|lehrer', 'Eis|verkäufer',
      'Sandalen|tourist', 'Wahr|sagerin', 'Schnorchler', 'Berg|führerin', 'Strand|verkäufer', 'Gepäck|träger', 'Ski|lehrerin', 'Pilot', 'Fischer', 'Kellner',
    ],
    wo: [
      'Hotel|buffet', 'Flugzeug|toilette', 'Strand|bar', 'Sauna', 'Gepäck|band', 'Ski|lift', 'Rettungs|boot', 'Jugend|herberge', 'Wohn|mobil', 'Souvenir|laden',
      'Aquarium', 'Duty-free-Shop', 'Hänge|matte', 'Tauch|basis', 'Gondel', 'Museum', 'Wasser|park', 'Zoll|kontrolle', 'Berg|gipfel', 'Strand|korb',
    ],
    was: [
      'Sonnen|creme', 'Reise|pass', 'Schnorchel', 'Postkarte', 'Sonnen|brand', 'Schwimm|flügel', 'Strohhut', 'Reise|führer', 'Kokos|nuss', 'Schnee|kugel',
      'Koffer', 'Reise|kissen', 'Kamera', 'Sand|burg', 'Muschel', 'Hawaii|hemd', 'Wander|schuh', 'Eis|becher', 'Flipflop', 'Fernglas',
    ],
  },
  krimi: {
    label: 'Krimi & Abenteuer',
    hint: 'Detektivin, Tresorraum, Lupe',
    wer: [
      'Detek|tivin', 'Bank|räuber', 'Kommis|sarin', 'Butler', 'Spionin', 'Geheim|agent', 'Schatz|sucher', 'Doppel|gängerin', 'Hacker', 'Taschen|diebin',
      'Erbin', 'Gärtner', 'Zeugin', 'Bodyguard', 'Kunst|fälscher', 'Gangster|boss', 'Archäo|login', 'Polizei|hund', 'Zirkus|direktor', 'Tresor|knacker',
    ],
    wo: [
      'Tresor|raum', 'Spiegel|kabinett', 'Villa', 'Orient|express', 'Gefängnis', 'Geheim|gang', 'Kasino', 'Wachsfiguren|kabinett', 'Tief|garage', 'Verhör|raum',
      'Kanali|sation', 'Dach|terrasse', 'Kunst|galerie', 'Burg|ruine', 'Lager|halle', 'Hub|schrauber', 'Yacht', 'Schrott|platz', 'Grusel|schloss', 'Labor',
    ],
    was: [
      'Notiz|buch', 'Lupe', 'Finger|abdruck', 'Diamant', 'Geheim|code', 'Hand|schellen', 'Tresor|schlüssel', 'Lösegeld|koffer', 'Taschen|lampe', 'Nachtsicht|brille',
      'Gift|fläschchen', 'Perücke', 'Flucht|auto', 'Brech|eisen', 'Erpresser|brief', 'Ehe|ring', 'Wanze', 'Testament', 'Seil|leiter', 'Tarn|umhang',
    ],
  },
};
