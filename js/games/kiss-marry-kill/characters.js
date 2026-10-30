// Namenspools für „Kiss, Marry, Kill“ – pro Kategorie getrennt nach weiblich und männlich.
//
// WICHTIG: Nur Erwachsene eintragen – auch bei Figuren. Wer in der Geschichte minderjährig ist
// (z. B. Arielle, Spider-Man, Harry/Ron/Hermine), gehört hier nicht hinein.
//
// Neue Kategorie: einfach einen weiteren Block nach demselben Muster ergänzen.
// Sie erscheint automatisch in der Auswahl.
// Nach Änderungen an den Namen die Bilder neu suchen lassen: python3 tools/kmk-bilder.py

export default {
  hollywood: {
    label: 'Hollywood',
    hint: 'Schauspielerinnen und Schauspieler',
    female: [
      'Margot Robbie', 'Scarlett Johansson', 'Jennifer Lawrence', 'Zendaya', 'Anne Hathaway',
      'Emma Stone', 'Emma Watson', 'Angelina Jolie', 'Natalie Portman', 'Gal Gadot',
      'Sydney Sweeney', 'Jennifer Aniston', 'Florence Pugh', 'Anya Taylor-Joy', 'Meryl Streep',
      'Julia Roberts', 'Sandra Bullock', 'Nicole Kidman', 'Charlize Theron', 'Kate Winslet',
      'Cate Blanchett', 'Reese Witherspoon', 'Megan Fox', 'Blake Lively', 'Mila Kunis',
      'Keira Knightley', 'Penélope Cruz', 'Salma Hayek', 'Halle Berry', 'Ana de Armas',
    ],
    male: [
      'Brad Pitt', 'Leonardo DiCaprio', 'Ryan Gosling', 'Ryan Reynolds', 'Chris Hemsworth',
      'Keanu Reeves', 'Tom Hanks', 'Zac Efron', 'Timothée Chalamet', 'Pedro Pascal',
      'Henry Cavill', 'Dwayne Johnson', 'Jason Momoa', 'Robert Pattinson', 'Tom Holland',
      'George Clooney', 'Will Smith', 'Tom Cruise', 'Hugh Jackman', 'Chris Evans',
      'Chris Pratt', 'Michael B. Jordan', 'Idris Elba', 'Matt Damon', 'Jake Gyllenhaal',
      'Austin Butler', 'Jacob Elordi', 'Paul Mescal', 'Glen Powell', 'Cillian Murphy',
    ],
  },

  musik: {
    label: 'Musik',
    hint: 'Popstars, Rapper und Schlager',
    female: [
      'Taylor Swift', 'Beyoncé', 'Rihanna', 'Ariana Grande', 'Billie Eilish',
      'Dua Lipa', 'Lady Gaga', 'Shakira', 'Adele', 'Miley Cyrus',
      'Sabrina Carpenter', 'Helene Fischer', 'Shirin David', 'Nina Chuba', 'Lena Meyer-Landrut',
      'Katy Perry', 'Selena Gomez', 'Olivia Rodrigo', 'Doja Cat', 'Cardi B',
      'Nicki Minaj', 'Lana Del Rey', 'Madonna', 'Britney Spears', 'Christina Aguilera',
      'Alicia Keys', 'Kylie Minogue', 'Charli XCX', 'Sarah Connor', 'Vanessa Mai',
    ],
    male: [
      'Harry Styles', 'Ed Sheeran', 'Justin Bieber', 'Bruno Mars', 'The Weeknd',
      'Drake', 'Eminem', 'Shawn Mendes', 'Bad Bunny', 'Post Malone',
      'Mark Forster', 'Cro', 'Apache 207', 'Peter Fox', 'Rea Garvey',
      'Kendrick Lamar', 'Travis Scott', 'Snoop Dogg', 'Jay-Z', 'Michael Bublé',
      'Lewis Capaldi', 'Robbie Williams', 'Chris Martin', 'Adam Levine', 'Pharrell Williams',
      'Usher', 'Calvin Harris', 'Jon Bon Jovi', 'Herbert Grönemeyer', 'Udo Lindenberg',
    ],
  },

  promis: {
    label: 'Deutsche Promis',
    hint: 'Fernsehen, Film und Moderation',
    female: [
      'Heidi Klum', 'Barbara Schöneberger', 'Palina Rojinski', 'Sophia Thomalla', 'Lena Gercke',
      'Karoline Herfurth', 'Nora Tschirner', 'Diane Kruger', 'Jella Haase', 'Michelle Hunziker',
      'Verona Pooth', 'Sonya Kraus', 'Sylvie Meis', 'Daniela Katzenberger', 'Annemarie Carpendale',
      'Laura Wontorra', 'Judith Rakers', 'Janin Ullmann', 'Iris Berben', 'Veronica Ferres',
      'Pamela Reif', 'Ruth Moschner', 'Alexandra Maria Lara', 'Motsi Mabuse',
    ],
    male: [
      'Joko Winterscheidt', 'Klaas Heufer-Umlauf', 'Jan Böhmermann', 'Elyas M’Barek', 'Matthias Schweighöfer',
      'Stefan Raab', 'Daniel Brühl', 'Kai Pflaume', 'Pietro Lombardi', 'Riccardo Simonetti',
      'Thomas Gottschalk', 'Florian Silbereisen', 'Günther Jauch', 'Hape Kerkeling', 'Michael Bully Herbig',
      'Oliver Pocher', 'Dieter Bohlen', 'Tim Mälzer', 'Christian Ulmen', 'Tom Schilling',
      'Moritz Bleibtreu', 'Jürgen Vogel', 'Daniel Hartwich', 'Jan Josef Liefers', 'Bastian Pastewka',
      'Steven Gätjen',
    ],
  },

  sport: {
    label: 'Sport',
    hint: 'Fußball, Tennis, Formel 1 und mehr',
    female: [
      'Serena Williams', 'Venus Williams', 'Simone Biles', 'Steffi Graf', 'Alexandra Popp',
      'Naomi Osaka', 'Malaika Mihambo', 'Gina Lückenkemper', 'Lindsey Vonn', 'Ronda Rousey',
      'Alex Morgan', 'Angelique Kerber', 'Giulia Gwinn', 'Magdalena Neuner', 'Maria Scharapowa',
      'Aryna Sabalenka', 'Iga Świątek', 'Coco Gauff', 'Lena Oberdorf', 'Lea Schüller',
      'Alexia Putellas', 'Aitana Bonmatí', 'Mikaela Shiffrin', 'Katarina Witt', 'Franziska van Almsick',
      'Shelly-Ann Fraser-Pryce', 'Allyson Felix', 'Caitlin Clark',
    ],
    male: [
      'Cristiano Ronaldo', 'Lionel Messi', 'Thomas Müller', 'Manuel Neuer', 'LeBron James',
      'Roger Federer', 'Lewis Hamilton', 'Usain Bolt', 'Dirk Nowitzki', 'Kylian Mbappé',
      'Jamal Musiala', 'Toni Kroos', 'Erling Haaland', 'Alexander Zverev', 'Sebastian Vettel',
      'Rafael Nadal', 'Novak Djokovic', 'Carlos Alcaraz', 'Jannik Sinner', 'Max Verstappen',
      'Michael Phelps', 'Tom Brady', 'Stephen Curry', 'Mohamed Salah', 'Harry Kane',
      'Neymar', 'Florian Wirtz', 'Joshua Kimmich', 'Bastian Schweinsteiger', 'Wladimir Klitschko',
    ],
  },

  disney: {
    label: 'Disney',
    hint: 'Prinzessinnen, Helden und Bösewichte',
    female: [
      'Elsa', 'Anna', 'Tiana', 'Cinderella', 'Rapunzel',
      'Megara', 'Pocahontas', 'Jane Porter', 'Judy Hopps', 'Elastigirl',
      'Maleficent', 'Ursula', 'Cruella de Vil', 'Mutter Gothel', 'Die böse Königin',
      'Giselle', 'Freude', 'Nala', 'Jessie', 'Bo Peep',
      'Tinker Bell', 'Nani', 'Daisy Duck', 'Edna Mode', 'Lady Tremaine',
      'Herzkönigin', 'Sally', 'Gute Fee', 'Colette',
    ],
    male: [
      'Aladdin', 'Flynn Rider', 'Kristoff', 'Hans', 'Gaston',
      'Dschinni', 'Dschafar', 'Maui', 'Kapitän Hook', 'Mr. Incredible',
      'Nick Wilde', 'Scar', 'Mufasa', 'Buzz Lightyear', 'Woody',
      'Micky Maus', 'Donald Duck', 'Goofy', 'Olaf', 'Lightning McQueen',
      'Balu', 'Pumbaa', 'Robin Hood', 'Mike Glotzkowski', 'Lumière', 'Sebastian',
    ],
  },

  marvel: {
    label: 'Marvel',
    hint: 'Heldinnen, Helden und Schurken',
    female: [
      'Black Widow', 'Scarlet Witch', 'Captain Marvel', 'Gamora', 'Nebula',
      'Storm', 'Jean Grey', 'Mystique', 'She-Hulk', 'Wasp',
      'Okoye', 'Valkyrie', 'Hela', 'Pepper Potts', 'Mantis',
      'Jessica Jones', 'Elektra', 'Yelena Belova', 'Maria Hill', 'Peggy Carter',
      'Sif', 'Jane Foster', 'Monica Rambeau', 'Nakia', 'Ramonda',
      'Agatha Harkness', 'Black Cat', 'Psylocke', 'Emma Frost', 'Domino',
      'Invisible Woman', 'Ghost', 'Echo', 'Karen Page',
    ],
    male: [
      'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Panther',
      'Doctor Strange', 'Loki', 'Thanos', 'Deadpool', 'Wolverine',
      'Ant-Man', 'Star-Lord', 'Hawkeye', 'Falcon', 'Winter Soldier',
      'Groot', 'Vision', 'Nick Fury', 'Magneto', 'Daredevil',
      'Punisher', 'Moon Knight', 'Shang-Chi', 'Ultron', 'Red Skull',
      'Killmonger', 'Drax', 'Rocket', 'Yondu', 'War Machine',
      'Professor X', 'Cyclops', 'Gambit', 'Ghost Rider', 'Luke Cage',
      'Silver Surfer', 'Venom', 'Kingpin',
    ],
  },

  'star-wars': {
    label: 'Star Wars',
    hint: 'Jedi, Sith und Schmuggler',
    female: [
      'Prinzessin Leia', 'Rey', 'Jyn Erso', 'Qi’ra', 'Rose Tico',
      'Captain Phasma', 'Mon Mothma', 'Hera Syndulla', 'Bo-Katan Kryze', 'Cara Dune',
      'Asajj Ventress', 'Fennec Shand', 'Maz Kanata', 'Mara Jade', 'Amilyn Holdo',
      'Doctor Aphra', 'Morgan Elsbeth', 'Bix Caleen', 'Bastila Shan', 'Dedra Meero',
      'Vel Sartha', 'Val',
    ],
    male: [
      'Luke Skywalker', 'Han Solo', 'Darth Vader', 'Obi-Wan Kenobi', 'Lando Calrissian',
      'Kylo Ren', 'Poe Dameron', 'Finn', 'Yoda', 'Chewbacca',
      'Boba Fett', 'Der Mandalorianer', 'Qui-Gon Jinn', 'Mace Windu', 'Count Dooku',
      'Imperator Palpatine', 'Cassian Andor', 'Darth Maul', 'Jabba der Hutte', 'Thrawn',
      'Moff Gideon', 'Grand Moff Tarkin', 'General Grievous', 'General Hux', 'Wedge Antilles',
      'Jango Fett', 'Captain Rex', 'Kanan Jarrus', 'Cal Kestis', 'Saw Gerrera',
      'Chirrut Îmwe', 'Orson Krennic', 'Greef Karga', 'Bail Organa', 'Luthen Rael',
      'C-3PO', 'R2-D2',
    ],
  },

  serien: {
    label: 'Serien',
    hint: 'Kultfiguren aus Serien',
    female: [
      'Rachel Green', 'Monica Geller', 'Phoebe Buffay', 'Robin Scherbatsky', 'Penny (Big Bang Theory)',
      'Daenerys Targaryen', 'Cersei Lannister', 'Carrie Bradshaw', 'Lorelai Gilmore', 'Meredith Grey',
      'Pam Beesly', 'Olivia Pope', 'Skyler White', 'Lily Aldrin', 'Bernadette Rostenkowski',
      'Amy Farrah Fowler', 'Brienne von Tarth', 'Margaery Tyrell', 'Samantha Jones', 'Miranda Hobbes',
      'Charlotte York', 'Cristina Yang', 'Claire Underwood', 'Joan Holloway', 'Leslie Knope',
      'Jessica Day',
    ],
    male: [
      'Joey Tribbiani', 'Chandler Bing', 'Ross Geller', 'Barney Stinson', 'Ted Mosby',
      'Walter White', 'Jesse Pinkman', 'Sheldon Cooper', 'Dr. House', 'Michael Scott',
      'Dwight Schrute', 'Jon Snow', 'Tyrion Lannister', 'Don Draper', 'Marshall Eriksen',
      'Leonard Hofstadter', 'Howard Wolowitz', 'Raj Koothrappali', 'Jim Halpert', 'Ned Stark',
      'Jaime Lannister', 'Daryl Dixon', 'Saul Goodman', 'Derek Shepherd', 'Frank Underwood',
      'Ron Swanson', 'Nick Miller', 'Tommy Shelby',
    ],
  },
};
