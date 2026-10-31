// Fälle für „Dunkle Rätsel“ – die Runde klärt per Ja/Nein-Fragen, was wirklich passiert ist.
// Eintrag: { title, story, solution, hints: [Tipps, vom vagen zum deutlichen] }
// story wird vorgelesen, solution sieht nur die Person, die den Fall leitet.
// Gute Fälle sind mehrteilig: Die Runde muss nicht nur das Was, sondern auch Wie und Warum herausfinden.
// Neue Fälle selbst ausdenken – keine Karten aus gekauften Rätselspielen abschreiben.

export default {
  mord: {
    label: 'Mordfälle',
    hint: 'Wer war es, wie und warum?',
    emoji: '🔪',
    cases: [
      {
        title: 'Der verriegelte Tresorraum',
        story: 'Der Juwelier Harald Brandt liegt tot in seinem Tresorraum. Die Stahltür war von innen verriegelt, der einzige Schlüssel steckt in seiner Westentasche. Die Kamera im Flur zeigt: Den ganzen Tag ist niemand außer ihm hineingegangen oder herausgekommen. An seinem Körper gibt es keine Verletzung. Trotzdem nimmt die Kommissarin noch am selben Abend seinen Geschäftspartner fest.',
        solution: 'Der Partner hatte Brandt beim gemeinsamen Frühstück ein langsam wirkendes Gift in den Kaffee gegeben. Brandt schloss sich wie jeden Morgen zur Inventur ein und starb dort allein. Der Täter musste den Raum nie betreten. Der verschlossene Tresor war sein perfektes Alibi – bis die Kommissarin die Gewohnheit des Opfers erfuhr.',
        hints: ['Niemand war zur Tatzeit bei ihm im Raum.', 'Das Tödliche geschah, bevor er den Tresorraum betrat.', 'Er hatte vorher mit jemandem gegessen.'],
      },
      {
        title: 'Die Gala',
        story: 'Bei einer Gala in einer eiskalten Winternacht wird der Gastgeber tot im Bankettsaal gefunden, mit einer tiefen Stichwunde im Rücken. Die Türen werden sofort geschlossen. Alle Gäste werden durchsucht, der Saal wird Zentimeter für Zentimeter abgesucht. Es gibt keine Waffe. Das Einzige, was auffällt, ist eine kleine Pfütze neben dem Toten und ein Schwan auf dem Buffet, der plötzlich nur noch einen Flügel hat.',
        solution: 'Der Schwan war eine Eisskulptur. Der Bildhauer brach die spitze Flügelkante ab, stach damit zu und ließ sie neben dem Opfer liegen. In der Wärme des Saals schmolz die Waffe zu einer Pfütze. Er wollte sich rächen, weil der Gastgeber sein Werk als eigenes ausgegeben hatte.',
        hints: ['Die Waffe war da, ist aber verschwunden.', 'Die Waffe hat sich nicht in Luft aufgelöst, sondern in etwas anderes.', 'Seht euch den Schwan genauer an.'],
      },
      {
        title: 'Der Rollstuhl',
        story: 'In einer Villa ohne Aufzug wird eine Erbtante im ersten Stock erschlagen. Ihr Neffe sitzt seit einem Unfall im Rollstuhl und scheidet deshalb sofort aus. Er ist der Einzige, der zur Tatzeit im Haus war, und erzählt unter Tränen, er habe nur Schritte gehört. Im Erdgeschoss enden seine Reifenspuren brav vor der Treppe. Die Kommissarin schaut ihm nur kurz auf die Füße und holt die Handschellen heraus.',
        solution: 'Die Sohlen seiner Schuhe waren abgelaufen. Das ist bei jemandem, der seit Jahren nicht gehen kann, unmöglich. Der Neffe hatte die Lähmung nur vorgetäuscht, um Versicherungsgeld zu kassieren, ging die Treppe hoch und erschlug die Tante wegen des Erbes.',
        hints: ['Der Unfall hat wirklich stattgefunden.', 'Nicht alles, was er behauptet, stimmt.', 'Etwas an seiner Kleidung passt nicht zu seinem Zustand.'],
      },
      {
        title: 'Die Pralinen',
        story: 'Frau Keller bekommt jede Woche anonym eine Schachtel Pralinen. Weil sie keinen Zucker verträgt, schenkt sie die Schachteln immer ihrer Nachbarin. Eines Tages stirbt die Nachbarin an vergifteten Pralinen. Die Polizei geht von einem Anschlag auf Frau Keller aus und stellt sie sogar unter Schutz. Drei Wochen später wird Frau Keller verhaftet.',
        solution: 'Frau Keller schickte sich die Pralinen selbst. Über Monate baute sie so die Gewohnheit auf, und jeder im Haus kannte die Geschichte. Das Gift galt von Anfang an der Nachbarin, die ein Verhältnis mit Frau Kellers Mann hatte. Als vermeintliches Opfer wollte sie über jeden Verdacht erhaben sein.',
        hints: ['Die Nachbarin starb nicht aus Versehen.', 'Die Absenderin ist keine Unbekannte.', 'Das scheinbare Ziel und die Täterin sind dieselbe Person.'],
      },
      {
        title: 'Vierzig Sekunden Dunkelheit',
        story: 'Sechs Gäste sitzen beim Abendessen in einer Villa, als der Strom ausfällt. Vierzig Sekunden lang ist es stockfinster. Als das Licht zurückkommt, liegt der Gastgeber mit einem Messer im Rücken über dem Tisch. Kein Stuhl ist umgefallen, niemand ist gestolpert, kein Glas ist zerbrochen. Der Stich sitzt millimetergenau. Die Ermittler halten das im Dunkeln für unmöglich.',
        solution: 'Die Täterin war die blinde Pianistin am Tisch. Für sie machte die Dunkelheit keinen Unterschied: Sie kannte jeden Schritt im Haus, in dem sie jahrelang unterrichtet hatte. Sie hatte die Sicherung vorher mit einer Zeitschaltuhr manipuliert. Der Gastgeber hatte ihre Kompositionen gestohlen.',
        hints: ['Der Stromausfall war geplant.', 'Für alle anderen war es stockdunkel – aber nicht für alle ein Problem.', 'Eine Person am Tisch sieht nie etwas.'],
      },
      {
        title: 'Der Notruf',
        story: 'Um 22:05 Uhr geht bei der Polizei ein Notruf ein. Ein Mann flüstert: „Hilfe, da ist jemand im Haus!“ Dann bricht die Verbindung ab. Fünf Minuten später findet die Streife ihn tot im Arbeitszimmer. Der Gerichtsmediziner schüttelt den Kopf: Der Mann ist seit mindestens vier Stunden tot. Seine Frau war um 22 Uhr auf einer Feier, vor fünfzig Zeugen.',
        solution: 'Die Frau hatte ihn gegen 18 Uhr getötet. Den Notruf hatte sie mit einer zeitgesteuerten App und zusammengeschnittenen Sprachnachrichten vorbereitet. So schien er um 22 Uhr noch zu leben, als sie ein Alibi hatte. Nur den Gerichtsmediziner hatte sie nicht bedacht.',
        hints: ['Der Tote hat nicht selbst angerufen.', 'Die Stimme war trotzdem wirklich seine.', 'Der Anruf sollte die Tatzeit verschieben.'],
      },
      {
        title: 'Das Gewächshaus',
        story: 'Eine berühmte Botanikerin wird leblos in ihrem Gewächshaus gefunden. Sie hat keine Verletzung, im Körper findet man kein Gift. Die Tür klemmte nur leicht. Ihre Pflanzen gedeihen prächtig. In einer Ecke stehen ein paar leere Styroporkisten, die niemand zuordnen kann. Am Tag davor hatte ihr Neffe ihr geholfen, alle Ritzen abzudichten.',
        solution: 'Der Neffe hatte Trockeneis in Styroporkisten ins abgedichtete Gewächshaus gestellt. Es verdampfte zu Kohlendioxid, verdrängte den Sauerstoff, und seine Tante erstickte. Danach verflog das Gas spurlos, nur die Kisten blieben. Er wollte das Grundstück erben.',
        hints: ['Es war Mord, aber ohne Gift im Körper.', 'Mit der Luft stimmte etwas nicht.', 'In den Kisten war etwas sehr Kaltes.'],
      },
      {
        title: 'Die Katze',
        story: 'Herr Lorenz kommt von einer zweiwöchigen Geschäftsreise zurück und findet seine Frau tot im Flur. Der Arzt schätzt: Sie liegt dort seit gut zehn Tagen. Herr Lorenz war die ganze Zeit nachweislich in Asien. Die Kommissarin geht durch die Küche, streichelt die gesunde, wohlgenährte Katze und verhaftet ihn.',
        solution: 'Die Katze hätte nach zehn Tagen ohne Futter ausgehungert sein müssen. Herr Lorenz hatte kurz vor der Reise einen Futterautomaten für drei Wochen aufgestellt. Er wusste also, dass bald niemand mehr da sein würde. Das Gift hatte er vor der Abreise in ihre Vorräte gemischt.',
        hints: ['Die Katze ist der entscheidende Hinweis.', 'Fragt euch, wer die Katze versorgt hat.', 'Der Täter wusste, dass bald niemand mehr füttern würde.'],
      },
      {
        title: 'Die stille Nacht',
        story: 'Auf einem einsamen Hof wird nachts der Bauer erschlagen. Sein Hofhund ist berüchtigt, er bellt schon, wenn ein Fremder nur am Tor vorbeigeht. Die Nachbarn schwören, sie hätten die ganze Nacht keinen Laut gehört. Die Polizei sucht tagelang nach einem Landstreicher. Dann lässt die Ermittlerin die Fahndung abbrechen und fährt zum Flughafen.',
        solution: 'Der Hund schlug nicht an, weil er den Täter kannte. Es war der Sohn des Bauern, der angeblich seit Jahren im Ausland lebte. Er war heimlich eingeflogen, um an das Land zu kommen. Am Flughafen fand die Ermittlerin seine Einreise.',
        hints: ['Dass der Hund nicht bellte, ist der Schlüssel.', 'Der Täter war kein Fremder.', 'Jemand aus der Familie war gar nicht so weit weg.'],
      },
      {
        title: 'Die Fernpartie',
        story: 'Professor Held spielte seit Jahren per Brief Schach mit einem alten Freund. Als er tot in seinem Sessel gefunden wird, steht die laufende Partie auf dem Brett. Sein Haushälter sagt, der Professor sei seit Wochen bettlägerig gewesen und habe niemanden empfangen. Der Gerichtsmediziner datiert den Tod auf vor einem Monat. Ein Blick auf das Brett genügt der Kommissarin.',
        solution: 'Auf dem Brett stand schon der Zug aus einem Brief, der erst vor einer Woche angekommen war. Der Haushälter hatte die Post geöffnet und weitergespielt. Er hatte den Professor vergiftet und täuschte vor, er lebe noch, um weiter dessen Pension zu kassieren.',
        hints: ['Der Tod lag lange zurück.', 'Jemand hat nach dem Tod noch etwas getan.', 'Der Freund hatte zuletzt einen neuen Zug geschickt.'],
      },
      {
        title: 'Die Hochzeitstorte',
        story: 'Braut und Bräutigam schneiden gemeinsam die Torte an und füttern sich gegenseitig das erste Stück. Minuten später bricht der Bräutigam tot zusammen. Hundert Gäste aßen von derselben Torte, und keinem fehlt etwas. Die Braut aß ebenfalls vom selben Stück und bleibt gesund. Im Labor findet man in den Tortenresten kein Gift.',
        solution: 'Die Trauzeugin hatte eine Seite des Tortenmessers mit Gift bestrichen. Beim Schnitt gelangte es nur auf die eine Schnittfläche, und genau diese Seite bekam der Bräutigam. Danach tauschte sie das Messer aus. Sie war seit Jahren seine heimliche Geliebte und wollte nicht zusehen, wie er eine andere heiratet.',
        hints: ['Die Torte selbst war in Ordnung.', 'Das Gift kam erst beim Anschneiden dazu.', 'Es war nur auf einer Seite von etwas.'],
      },
      {
        title: 'Das Logbuch',
        story: 'Zwei Brüder fahren mit einem offenen Fischerboot hinaus. Nur einer kommt zurück. Er berichtet, ein Sturm habe seinen Bruder über Bord gerissen. Der Wetterdienst bestätigt den Sturm, und im Logbuch steht jede Stunde sauber notiert. Die Kommissarin blättert darin und bittet ihn, sie aufs Revier zu begleiten.',
        solution: 'Das Logbuch war vollkommen trocken und die Schrift sauber. In einem offenen Boot im Sturm wäre beides unmöglich gewesen. Er hatte es erst an Land geschrieben. Den Bruder hatte er bei ruhiger See über Bord gestoßen, wegen der gemeinsamen Lebensversicherung.',
        hints: ['Der Sturm war echt.', 'Mit dem Logbuch stimmt etwas nicht.', 'Es sieht zu gut aus.'],
      },
      {
        title: 'Die letzte Aufnahme',
        story: 'Ein Autor wird erschossen an seinem Schreibtisch gefunden. Auf dem Tisch liegt ein Kassettenrekorder. Die Kommissarin drückt auf Wiedergabe und hört seine Stimme: „Mein Name ist Viktor Stein. Er ist hier. Er kommt die Treppe hoch. Nein, bitte nicht!“ Dann ein Schuss. Der Rekorder klickt. Sie lächelt und sagt: „Der Täter hat einen Fehler gemacht.“',
        solution: 'Die Kassette war ganz an den Anfang zurückgespult. Ein Toter kann nicht zurückspulen. Der Täter hatte die Aufnahme angehört, um sicherzugehen, dass sein Name nicht darauf ist, und sie dann bereitgelegt. Es musste also jemand nach dem Schuss im Zimmer gewesen sein.',
        hints: ['Die Aufnahme ist echt.', 'Überlegt, was nach dem Schuss noch passiert sein muss.', 'Wie stand die Kassette, als sie auf Wiedergabe drückte?'],
      },
    ],
  },

  krimi: {
    label: 'Verbrechen',
    hint: 'Alibis, Täter und Spuren',
    emoji: '🔍',
    cases: [
      {
        title: 'Aus derselben Flasche',
        story: 'Zwei Erzfeinde treffen sich nach zwanzig Jahren, um Frieden zu schließen. Sie öffnen gemeinsam eine alte Flasche Wein, der Kellner schenkt beiden aus derselben Flasche ein, beide trinken. Einer bricht noch am Tisch tot zusammen, der andere bleibt völlig gesund. Der Rest aus der Flasche ist nachweislich harmlos.',
        solution: 'Der Überlebende hatte das Gift vorher auf den Rand des Glases gestrichen, aus dem sein Feind immer trank: Es war dessen altes Lieblingsglas, das er als Friedensgeschenk mitbrachte. Der Wein spielte keine Rolle.',
        hints: ['Am Wein lag es nicht.', 'Jeder hatte sein eigenes Glas.', 'Eines der Gläser war ein Geschenk.'],
      },
      {
        title: 'Nichts gestohlen',
        story: 'Ein Einbrecher knackt nachts das Schloss einer Villa. Er durchwühlt keine Schublade, öffnet den Tresor nicht und lässt Bargeld auf dem Tisch liegen. Nach fünf Minuten verlässt er das Haus erleichtert. Am Morgen ruft die Besitzerin weinend die Polizei, aber nicht, um etwas zu melden, das fehlt.',
        solution: 'Er brachte etwas zurück: den Ehering, den er dort vor 20 Jahren gestohlen hatte. Er war todkrank und wollte reinen Tisch machen. Die Besitzerin weinte vor Freude, als er plötzlich wieder auf dem Nachttisch lag.',
        hints: ['Er hatte beim Gehen weniger bei sich als vorher.', 'Er kannte das Haus von früher.', 'Etwas Altes tauchte wieder auf.'],
      },
      {
        title: 'Scherben im Garten',
        story: 'Ein Hausbesitzer meldet aufgeregt einen Einbruch: Seine Münzsammlung im Wert von 80.000 Euro sei gestohlen worden. Das Fenster zur Terrasse ist eingeschlagen, die Schränke stehen offen. Die Kommissarin geht einmal um das Haus herum und verhaftet ihn wegen Versicherungsbetrugs.',
        solution: 'Die Scherben lagen draußen auf der Terrasse. Das Fenster war also von innen eingeschlagen worden. Die Münzen hatte er längst selbst verkauft, weil er Spielschulden hatte.',
        hints: ['Es geht um die Scherben.', 'Wo liegen Scherben, wenn jemand von außen einsteigt?', 'Der Einbruch hat nie stattgefunden.'],
      },
      {
        title: 'Die blinde Zeugin',
        story: 'Nach einem Bankraub gibt es keine Fingerabdrücke, und der Täter trug eine Maske. Die einzige Zeugin, die ihn identifizieren kann, ist seit ihrer Geburt blind. Trotzdem überführt sie ihn bei der Gegenüberstellung mit absoluter Sicherheit. Der Richter glaubt ihr sofort.',
        solution: 'Der Räuber hatte sie auf der Flucht angerempelt und sich entschuldigt. Sie erkannte seine Stimme mit dem leichten Lispeln wieder – und sein aufdringliches Rasierwasser, das er auch bei der Gegenüberstellung trug.',
        hints: ['Sie hat ihn nicht gesehen, aber wahrgenommen.', 'Er hatte auf der Flucht etwas zu ihr gesagt.', 'Zwei ihrer Sinne waren besonders gut.'],
      },
      {
        title: 'Nur eine Spur',
        story: 'Im frischen Schnee liegt ein Toter mitten auf einem Feld, erschlagen. Es führt genau eine Fußspur zu ihm hin, und keine führt weg. Die Spur stammt von seinen eigenen Stiefeln. Die Polizei findet weder Tatwaffe noch weitere Abdrücke und denkt zuerst an einen Unfall.',
        solution: 'Der Täter ging dicht hinter ihm her und trat genau in seine Fußstapfen. Nach der Tat ging er in denselben Abdrücken rückwärts zurück. Dass die Abdrücke tiefer waren als normal, fiel der Polizei erst später auf.',
        hints: ['Es waren zwei Personen auf dem Feld.', 'Eine Spur kann von zwei Menschen stammen.', 'Man kann auch rückwärts gehen.'],
      },
      {
        title: 'Die Uhr am falschen Arm',
        story: 'Ein Mann liegt tot am Fuß der Treppe, es sieht nach einem Sturz aus. Seine zerschlagene Armbanduhr zeigt 20:14 Uhr. Für genau diese Zeit hat sein Bruder ein Alibi: Er stand im Restaurant an der Kasse. Die Kommissarin betrachtet das Handgelenk des Toten und lächelt.',
        solution: 'Der Tote war Linkshänder und trug seine Uhr immer rechts. Sie hing aber links, denn der Bruder hatte sie ihm nach dem Mord umgelegt, verstellt und zerschlagen, um sich ein Alibi zu bauen.',
        hints: ['Die Uhrzeit stimmt nicht.', 'Die Kommissarin kannte eine Gewohnheit des Toten.', 'Achtet auf die Hand.'],
      },
      {
        title: 'Ohne Maske',
        story: 'Der Bankräuber trug keine Maske. Dutzende Menschen haben sein Gesicht gesehen, die Kamera hat ihn gestochen scharf gefilmt, und seine Fingerabdrücke sind nicht registriert. Der Verdächtige wird gefasst, alle Zeugen erkennen ihn wieder. Trotzdem spricht ihn das Gericht frei.',
        solution: 'Er hat einen eineiigen Zwillingsbruder. Niemand konnte beweisen, welcher der beiden in der Bank war, und beide bestritten es. Im Zweifel für den Angeklagten.',
        hints: ['Das Gesicht auf dem Video ist tatsächlich seines.', 'Das Gericht braucht Gewissheit, welche Person es war.', 'Es gibt das Gesicht zweimal.'],
      },
      {
        title: 'Gegen das Licht',
        story: 'Eine reiche Witwe stirbt, und ihr Neffe legt ein handschriftliches Testament von 1998 vor, das ihn zum Alleinerben macht. Die Unterschrift ist echt, die Tinte passt, das Papier ist vergilbt. Die Notarin hält das Blatt nur kurz gegen das Licht und greift zum Telefon.',
        solution: 'Das Wasserzeichen im Papier stammte von einem Hersteller, den es 1998 noch gar nicht gab. Der Neffe hatte eine echte Unterschrift durchgepaust und das Papier mit Tee gealtert.',
        hints: ['Der Text ist unauffällig, das Blatt nicht.', 'Das Papier ist jünger als das Datum.', 'Man sieht es nur im Gegenlicht.'],
      },
      {
        title: 'Grüß den Hund',
        story: 'Eine Frau ruft spätabends zu Hause an und sagt fröhlich: „Mir geht es gut, ich bleibe noch bei Sabine. Grüß den Hund von mir!“ Ihr Mann bedankt sich, legt auf und ruft sofort die Polizei. Eine Stunde später wird sie aus einem Lieferwagen befreit.',
        solution: 'Die beiden haben keinen Hund. Das war ihr vereinbartes Notfall-Codewort. Ein Entführer zwang sie zu dem Anruf, damit niemand sie vermisst.',
        hints: ['Der Satz ergibt für die beiden keinen Sinn.', 'Sie hatten das vorher abgesprochen.', 'Sie rief nicht freiwillig an.'],
      },
      {
        title: 'Die Tankquittung',
        story: 'Ein Geschäftsmann wird erstochen. Sein Kompagnon hat ein perfektes Alibi: eine Tankquittung, 300 Kilometer vom Tatort entfernt, mit Uhrzeit und seiner Kreditkarte. Die Tankstellenkamera zeigt nur einen Mann mit Kapuze. Die Polizistin liest die Quittung Zeile für Zeile und nimmt ihn fest.',
        solution: 'Auf der Quittung stand Diesel, sein Auto fährt mit Benzin. Ein Komplize hatte mit seiner Karte getankt, um ihm das Alibi zu verschaffen.',
        hints: ['Uhrzeit und Ort stimmen.', 'Es geht um das, was getankt wurde.', 'Er selbst war nicht an der Tankstelle.'],
      },
      {
        title: 'Der letzte Mitbewohner',
        story: 'Ein Rentner verschwindet spurlos. Seine Wohnung ist sauber geputzt, es gibt kein Blut und keinen Abschiedsbrief. Die Polizei will den Fall schon schließen. Dann nimmt eine Beamtin den einzigen übrig gebliebenen Bewohner mit aufs Revier – und löst damit einen Mord.',
        solution: 'Der Papagei des Rentners plapperte immer wieder: „Nicht schießen, Bernd!“ So kam die Polizei auf den Neffen Bernd, der die Wohnung geputzt hatte.',
        hints: ['Der einzige Bewohner ist kein Mensch.', 'Er hat etwas gehört.', 'Er wiederholt es ständig.'],
      },
      {
        title: 'Das Urlaubsfoto',
        story: 'Ein Verdächtiger legt als Alibi ein Foto vor: Er liegt am Strand, das Datum auf dem Bild passt genau zur Tatzeit, und das Meer leuchtet türkis. Die Ermittlerin sagt nichts, zoomt langsam hinein und nimmt ihn mit.',
        solution: 'In seiner Sonnenbrille spiegelte sich kein Meer, sondern ein Fotostudio mit Lampen. Der Strand war eine Fototapete, das Datum nachträglich eingefügt.',
        hints: ['Das Entscheidende ist winzig klein.', 'Es geht um eine Spiegelung.', 'Er war nie am Strand.'],
      },
    ],
  },

  makaber: {
    label: 'Makaber',
    hint: 'Seltsame letzte Momente',
    emoji: '💀',
    cases: [
      {
        title: 'Der Applaus',
        story: 'Ein Bergführer warnt seine Gruppe an einem tief verschneiten Hang ausdrücklich vor jedem Lärm. Oben feiert ein Junggesellenabschied mit Sekt seinen Gipfelerfolg. Dann hört der Bergführer begeisterten Applaus und lautes Gegröle. Er rennt los, aber es ist schon zu spät.',
        solution: 'Der Lärm der Feiernden löste im Tiefschnee eine Lawine aus, die die Gruppe am Hang verschüttete.',
        hints: ['Es ist Winter.', 'Der Applaus selbst war nicht das Gefährliche.', 'Am Hang liegt sehr viel Schnee.'],
      },
      {
        title: 'Der erste Arbeitstag',
        story: 'Ein Feinschmecker reist extra nach Japan, um ein berühmtes Gericht zu probieren. Er schwärmt, es sei das Beste seines Lebens. Noch am selben Abend ist er tot. In der Küche sitzt der junge Koch und weint, und der Chefkoch sucht verzweifelt nach einem Messer, das nicht mehr an seinem Platz liegt.',
        solution: 'Es war Kugelfisch. Der Koch hatte seinen ersten Tag und entfernte das giftige Organ nicht richtig. Der Chefkoch suchte das Spezialmesser, das nur er hätte benutzen dürfen.',
        hints: ['Niemand wollte ihn töten.', 'Das Gericht ist berühmt dafür, gefährlich zu sein.', 'Es ist ein Fisch.'],
      },
      {
        title: 'Das perfekte Foto',
        story: 'Ein Tourist wird tot am Fuß der Klippen gefunden, sein Handy liegt unbeschädigt oben am Rand. Die Polizei denkt an Mord und befragt seine Reisegruppe. Doch die letzten Bilder auf dem Handy sind wunderschön, und auf jedem steht er ein kleines Stück weiter hinten.',
        solution: 'Er stellte das Handy mit Selbstauslöser auf und ging Foto für Foto weiter zurück, damit alles aufs Bild passte – bis keine Klippe mehr da war.',
        hints: ['Niemand sonst war beteiligt.', 'Er wollte möglichst viel aufs Bild bekommen.', 'Vergleicht die Fotos.'],
      },
      {
        title: 'Der Rettungsring',
        story: 'Ein Mann ist über Bord gegangen und treibt im Hafenbecken. An Bord ist ein unbeliebter Steuermann, der ihm seit Wochen Schulden hinterherträgt. Er wirft ihm einen schweren Rettungsring zu, die Umstehenden applaudieren. Der Mann ertrinkt trotzdem. Bei der Obduktion bekommt die Polizei Zweifel an der Heldentat.',
        solution: 'Der Steuermann zielte genau: Der schwere Ring traf den Mann am Kopf und machte ihn bewusstlos. Vor allen Augen beging er einen Mord, den alle für eine Rettung hielten.',
        hints: ['Es sah nach Hilfe aus.', 'Es lag am Gewicht des Rings.', 'Der Wurf war Absicht.'],
      },
      {
        title: 'Der Abschied',
        story: 'Eine berühmte Tänzerin steigt in Nizza in ein offenes Sportauto. Ihre Freunde stehen winkend am Straßenrand, und sie ruft ihnen fröhlich zu: „Lebt wohl, ich gehe zum Ruhm!“ Der Wagen fährt an. Wenige Sekunden später ist sie tot, und niemand hat sie berührt.',
        solution: 'Ihr langer Seidenschal verfing sich im Hinterrad und riss sie aus dem Auto. So starb im Jahr 1927 wirklich die Tänzerin Isadora Duncan.',
        hints: ['Es geht um ein Kleidungsstück.', 'Es ist tatsächlich so passiert.', 'Es wurde vom Auto erfasst.'],
      },
      {
        title: 'Zu höflich',
        story: 'Ein vornehmer Herr stirbt in einer kalten Aprilnacht, weil er zu höflich war. Hätte er nur einen Satz nicht gesagt, wäre er am nächsten Morgen gerettet worden. Seine Familie erfuhr davon aus der Zeitung, und seine Taschenuhr wurde Monate später versteigert.',
        solution: 'Er überließ auf der sinkenden Titanic einer Dame seinen Platz im Rettungsboot mit den Worten: „Nach Ihnen, Madam.“',
        hints: ['Er war auf Reisen.', 'Die Plätze waren knapp.', 'Es ist ein berühmtes Unglück.'],
      },
      {
        title: 'Nur ein Foto',
        story: 'Eine Seilschaft erreicht bei strahlendem Sonnenschein den Gipfel. Ein Bergsteiger nimmt für das Erinnerungsfoto kurz seine Brille ab und lässt sie danach in die Jacke gleiten. Beim Abstieg wird er plötzlich immer langsamer. Zwei Tage später findet man ihn tot, nur 50 Meter neben der Hütte.',
        solution: 'Die grelle Sonne im Schnee machte ihn schneeblind. Er fand den Weg nicht mehr, verlor die anderen und erfror, obwohl die Hütte so nah war.',
        hints: ['Es war die Sonne.', 'Er konnte die Hütte nicht mehr sehen.', 'Der Schnee spielte eine Rolle.'],
      },
      {
        title: 'Die Trompete',
        story: 'Jahrelang beschwert sich eine alte Dame über ihren Nachbarn, der jeden Abend um acht Trompete spielt. Sie schreibt Briefe an die Hausverwaltung und ruft sogar die Polizei. Als er endlich auszieht, feiert sie. Drei Wochen später ist sie tot. Der Arzt findet eine volle Tablettendose.',
        solution: 'Sein Spiel war ihr unfreiwilliger Wecker: Jeden Abend beim Ertönen der Trompete fluchte sie und nahm dabei ihre Herztabletten. Ohne das Signal vergaß sie sie.',
        hints: ['Sein Lärm hatte eine Funktion.', 'Es hat mit ihrer Gesundheit zu tun.', 'Die Dose war noch voll.'],
      },
      {
        title: 'Standing Ovations',
        story: 'Ein berühmter Zauberer lässt sich vor ausverkauftem Haus gefesselt in einen Wassertank sperren. Sein Assistent zählt laut die Sekunden. Das Publikum tobt, als er verzweifelt zappelt. Nach drei Minuten steht der Saal und klatscht. Der Assistent lächelt, und erst als der Vorhang fällt, schreit jemand. Später findet man im Tank ein Schloss, das nicht zur Requisite gehörte.',
        solution: 'Der Assistent hatte das Trickschloss gegen ein echtes getauscht, weil der Zauberer ihm den Ruhm für seine Erfindungen verweigerte. Alle hielten das Zappeln für einen Teil der Show.',
        hints: ['Der Tod war kein Unfall.', 'Das Publikum dachte, alles gehöre dazu.', 'Jemand hat etwas ausgetauscht.'],
      },
      {
        title: 'Ein Schluck Limo',
        story: 'An einem heißen Tag sitzt eine Familie beim Grillen. Der Vater stellt seine Dose ab, geht kurz ans Feuer und nimmt dann einen großen Schluck. Eine Stunde später ist er tot. Die Polizei untersucht die Limo, das Fleisch und die Soßen. Nichts davon ist vergiftet.',
        solution: 'In die offene Dose war eine Wespe gekrabbelt. Sie stach ihn in den Hals, und er reagierte allergisch.',
        hints: ['Die Dose stand offen herum.', 'Es war etwas Lebendiges.', 'Es flog.'],
      },
      {
        title: 'Der große Fang',
        story: 'Ein Angler ist bekannt dafür, dass er immer übertreibt. Eines Morgens fängt er wirklich den größten Fisch seines Lebens. Trotzdem findet man ihn wenig später tot im flachen Wasser neben dem Steg. An seinem Handgelenk ist eine tiefe Spur, und im Fluss zieht ein Hecht mit Schnur davon.',
        solution: 'Er hatte sich die Schnur ums Handgelenk gewickelt, damit ihm der Fisch nicht entkommt. Der Hecht riss ihn vom Steg, er schlug mit dem Kopf auf und ertrank bewusstlos.',
        hints: ['Er wollte die Angel besonders gut festhalten.', 'Der Fisch war stärker als gedacht.', 'Beachtet das Handgelenk.'],
      },
      {
        title: 'Der schönste Schneemann',
        story: 'Im Januar baut Frau Meier im Vorgarten einen riesigen Schneemann, der im ganzen Dorf bewundert wird. Ihren Mann hat seit Neujahr niemand mehr gesehen, er sei angeblich auf Montage. Sie gießt den Schneemann sogar jeden Abend, damit er länger hält. Im März ruft der Nachbar die Polizei.',
        solution: 'Als die Sonne ihn schmelzen ließ, kam Herr Meier zum Vorschein. Sie hatte ihn in der Silvesternacht erschlagen und im Schneemann versteckt. Das Wasser sollte ihn zu Eis machen.',
        hints: ['Es wurde wärmer.', 'Im Schneemann war etwas.', 'Jemand fehlt seit Neujahr.'],
      },
    ],
  },

  grusel: {
    label: 'Gänsehaut',
    hint: 'Unheimlich – mit Auflösung',
    emoji: '🕯️',
    cases: [
      {
        title: 'Die Stimme im Babyfon',
        story: 'Mitten in der Nacht hört eine Mutter übers Babyfon eine fremde Männerstimme, die leise „Schlaf gut, mein Kind“ flüstert. Sie stürzt ins Kinderzimmer. Das Baby schläft friedlich, das Fenster ist zu, niemand ist da. In der nächsten Nacht hört sie die Stimme wieder, und diesmal sagt sie ihren Namen.',
        solution: 'Das Babyfon empfing den Funk des neuen Nachbarn, der seinem Kind vorlas und dessen Frau denselben Vornamen trug. Niemand war je im Zimmer. Dem Kind ging es die ganze Zeit gut.',
        hints: ['Dem Kind ging es gut.', 'Die Technik spielte ihr einen Streich.', 'Die Stimme gehört jemandem in der Nähe.'],
      },
      {
        title: 'Der Mann im Hintergrund',
        story: 'Beim Durchblättern alter Alben entdeckt eine Frau auf fast jedem Urlaubsfoto denselben Mann im Hintergrund, über 15 Jahre hinweg. Auf dem letzten Bild steht er direkt hinter ihr und lächelt in die Kamera. Sie bringt die Fotos zur Polizei. Ein Blick darauf, und ihre alte Mutter fängt an zu weinen.',
        solution: 'Es ist ihr leiblicher Vater. Nach der Trennung durfte er sie nie sehen und reiste der Familie heimlich hinterher, um sie aufwachsen zu sehen. Das letzte Foto machte er kurz vor seinem Tod.',
        hints: ['Er wollte niemandem etwas tun.', 'Die Mutter kennt ihn.', 'Er ist mit der Frau verwandt.'],
      },
      {
        title: 'Spuren an der Decke',
        story: 'Eine Frau zieht in eine günstige Altbauwohnung, in der vor Jahren ein Mord geschehen sein soll. In der ersten Nacht entdeckt sie im Schlafzimmer blasse Schuhabdrücke, die quer über die Decke laufen und direkt über ihrem Bett enden. Der Vermieter wird blass, als sie ihn darauf anspricht, und bietet ihr einen Mietnachlass an.',
        solution: 'Der Vormieter hatte sich einen Scherz erlaubt und die Abdrücke mit Schuhen an einem Besenstiel aufgestempelt. Der Vermieter wurde blass, weil er die Decke hätte streichen müssen. Der Mord war nur ein Gerücht.',
        hints: ['Niemand ist je an der Decke gelaufen.', 'Es war ein Streich.', 'Der Vermieter hatte ganz andere Sorgen.'],
      },
      {
        title: 'Die Anhalterin',
        story: 'Nachts nimmt ein Autofahrer auf einer Landstraße eine blasse Frau im dünnen Kleid mit. Sie spricht kein Wort und steigt am Friedhof aus. Am nächsten Tag geht er neugierig hin und erstarrt: Auf einem Grabstein ist ihr Foto. Sie starb vor drei Jahren.',
        solution: 'Das Foto zeigt ihre Zwillingsschwester, deren Mörder nie gefasst wurde. Die Anhalterin besucht das Grab jede Nacht nach der Spätschicht.',
        hints: ['Sie lebt.', 'Das Foto zeigt nicht sie selbst.', 'Sie hat ein Gesicht, das es zweimal gab.'],
      },
      {
        title: 'Das Klopfen',
        story: 'Jede Nacht um drei klopft es in der Wand, immer dreimal. Die Bewohnerin hält es für ihre Nachbarin und klopft manchmal zurück. Dann erfährt sie, dass die Nachbarin schon seit einer Woche tot in der Wohnung liegt. Das Klopfen geht weiter.',
        solution: 'Es sind die Heizungsrohre, die nachts abkühlen und sich zusammenziehen. Sie hat nie jemand anderem geantwortet.',
        hints: ['Niemand klopft.', 'Es passiert immer zur gleichen Zeit.', 'Es hat mit Wärme zu tun.'],
      },
      {
        title: 'Licht im leeren Haus',
        story: 'In einem Haus, das seit 30 Jahren leer steht, geht jeden Abend um 20 Uhr im oberen Fenster das Licht an. Die Kinder im Dorf erzählen von dem Mörder, der dort gewohnt haben soll. Die Polizei hat das Haus durchsucht und nur Staub gefunden, aber keine Stromrechnung bleibt unbezahlt.',
        solution: 'Der letzte Bewohner hatte eine Zeitschaltuhr eingebaut. Ein alter Nachbar zahlt bis heute heimlich den Strom, weil er dem Freund versprochen hatte, das Licht für seine vermisste Tochter brennen zu lassen.',
        hints: ['Es ist niemand im Haus.', 'Das Licht schaltet sich immer zur gleichen Zeit ein.', 'Jemand kümmert sich um die Rechnungen.'],
      },
      {
        title: 'Die wandernde Puppe',
        story: 'Eine alte Puppe auf dem Dachboden sitzt jeden Morgen an einer anderen Stelle. Die Familie stellt sie in eine Truhe und klappt den Deckel zu. Am nächsten Morgen liegt sie auf der Treppe. Als sie die Puppe wegwerfen, liegt sie Tage später wieder vor der Haustür.',
        solution: 'Die Katze trägt sie nachts herum und öffnet die Truhe mit der Pfote. Den Müll hatte der Nachbarsjunge durchsucht und die Puppe freundlich zurückgebracht.',
        hints: ['Es war jemand da, aber nicht immer ein Mensch.', 'Der Täter hat vier Beine.', 'An der Haustür half jemand anderes.'],
      },
      {
        title: 'Es klingelt',
        story: 'Mitten in der Beerdigung klingelt es laut aus dem Sarg. Die Trauergäste erstarren, der Pfarrer verstummt. Auf dem Display, das die Witwe nun bebend aus dem Sarg holt, leuchtet ein Name, den sie noch nie gehört hat. Der Anruf ändert alles, was sie über ihren Mann zu wissen glaubte.',
        solution: 'Der Bestatter hatte das Handy in der Jacke des Toten vergessen. Es rief seine heimliche zweite Familie an, die ihn seit Tagen vermisste.',
        hints: ['Der Tote ist wirklich tot.', 'Es ist ein alltäglicher Gegenstand.', 'Er hatte ein Geheimnis.'],
      },
      {
        title: 'Geburtstagsgrüße',
        story: 'Eine Witwe bekommt jedes Jahr an ihrem Geburtstag eine Nachricht von der Nummer ihres ermordeten Mannes: „Ich denke an dich.“ Die Polizei prüft den Vertrag und findet nichts Auffälliges. Beim zehnten Mal steht plötzlich etwas anderes dort.',
        solution: 'Er hatte die Nachrichten vor seinem Tod vorprogrammiert, weil er sich bedroht fühlte. Die letzte Nachricht nannte den Namen seines Mörders.',
        hints: ['Niemand benutzt sein Handy.', 'Er hat vorgesorgt.', 'Er wusste, dass er in Gefahr war.'],
      },
      {
        title: 'Spuren im Mehl',
        story: 'Jede Nacht hört eine Frau Schritte auf dem Dachboden. Sie streut Mehl auf den Boden und stellt eine Kamera auf, die aber nur Dunkelheit filmt. Am Morgen findet sie winzige Spuren, die mitten im Raum plötzlich enden. Es gibt keinen zweiten Ausgang.',
        solution: 'Es ist ein Eichhörnchen, das vom Boden auf die Dachbalken springt. Von dort kommt es durch einen Spalt unter den Ziegeln nach draußen.',
        hints: ['Die Spuren sind sehr klein.', 'Prüft, wohin man von dort noch kommen kann.', 'Der Weg führt nach oben.'],
      },
      {
        title: 'Uromas Lied',
        story: 'Ein kleines Mädchen summt eines Abends eine Melodie, die nur ihre lange verstorbene Urgroßmutter kannte. Niemand in der Familie hat sie ihr je beigebracht. Als die Großmutter fragt, woher sie das Lied kennt, sagt die Kleine: „Das singt die Oma oben.“',
        solution: 'Das Mädchen hatte auf dem Dachboden einen alten Kassettenrekorder gefunden, auf dem Uroma das Lied singt. „Die Oma oben“ war einfach die Stimme auf dem Dachboden.',
        hints: ['Es gibt eine ganz normale Erklärung.', 'Sie hat es irgendwo gehört.', 'Sucht auf dem Dachboden.'],
      },
      {
        title: 'Post von dir',
        story: 'Eine Frau bekommt einen Brief, geschrieben in ihrer eigenen Handschrift. Darin steht: „Hast du es geschafft? Ich weiß, was du getan hast.“ Sie hat ihn nie geschrieben, zumindest kann sie sich nicht erinnern. Sie schläft drei Nächte nicht.',
        solution: 'Ihre Lehrerin hatte die Klasse vor 20 Jahren Briefe an ihr zukünftiges Ich schreiben lassen und nun verschickt. „Was du getan hast“ bezog sich auf einen harmlosen Streich an der Schule.',
        hints: ['Sie hat ihn wirklich selbst geschrieben.', 'Das ist sehr lange her.', 'Ein Mensch hat ihn aufbewahrt.'],
      },
    ],
  },

  humor: {
    label: 'Schwarzer Humor',
    hint: 'Böse, aber lustig',
    emoji: '🖤',
    cases: [
      {
        title: 'Ein Stern',
        story: 'Ein Bestatter bekommt eine vernichtende Online-Bewertung mit nur einem Stern. Der Text lautet: „Sarg zu eng, Musik furchtbar, Personal schreckhaft.“ Das Seltsame ist: Geschrieben hat sie die Verstorbene selbst, und zwar mit dem Datum ihrer eigenen Beerdigung.',
        solution: 'Sie war nur scheintot und wachte bei der Aufbahrung wieder auf. Der Bestatter fiel in Ohnmacht, sie ging nach Hause und schrieb die Bewertung.',
        hints: ['Die Bewertung ist echt.', 'Sie war gar nicht tot.', 'Das Personal hatte einen guten Grund, schreckhaft zu sein.'],
      },
      {
        title: 'Lachen am Grab',
        story: 'Bei einer Trauerfeier senkt man gerade den Sarg ins Grab, als die ganze Gemeinde in schallendes Gelächter ausbricht. Die Witwe lacht Tränen, der Pfarrer muss sich setzen. Niemand ist empört. Alle sagen später, es sei die schönste Beerdigung ihres Lebens gewesen.',
        solution: 'Der Verstorbene hatte im Sarg einen Lautsprecher verstecken lassen, der plötzlich rief: „Hallo? Lasst mich hier raus! Ist da jemand?“ Sein letzter Streich.',
        hints: ['Das war geplant.', 'Der Verstorbene selbst steckt dahinter.', 'Etwas war im Sarg versteckt.'],
      },
      {
        title: 'Der leere Sitz',
        story: 'Eine Witwe bucht auf jeder Reise zwei Sitze im Flugzeug. Der Platz neben ihr bleibt immer frei, und sie bestellt trotzdem zwei Gläser Sekt. Die Stewardess hat sich längst daran gewöhnt. An der Sicherheitskontrolle kennt man sie inzwischen, denn ihr Handgepäck sorgt regelmäßig für Stirnrunzeln.',
        solution: 'Im Handgepäck auf dem Nachbarsitz reist die Urne ihres Mannes mit. Er wollte immer die Welt sehen, hatte aber nie Zeit dafür.',
        hints: ['Der Platz ist nicht wirklich leer.', 'Sie reist mit jemandem.', 'Er kann nichts mehr trinken.'],
      },
      {
        title: 'Sechzig Kilo',
        story: 'Ein Mann bucht einen Ernährungsberater, geht ins Fitnessstudio und wiegt sich jeden Morgen. Nichts hilft. Dann verliert er über Nacht sechzig Kilo und ist todunglücklich. Seine Freunde bringen ihm Bier vorbei und gratulieren ihm trotzdem.',
        solution: 'Seine Frau hat ihn verlassen. Das waren die sechzig Kilo, die er loswurde, und die Freunde fanden das eher eine Verbesserung.',
        hints: ['Sein eigenes Gewicht ist gleich geblieben.', 'Jemand ist weg.', 'Die Freunde mochten diese Person nicht.'],
      },
      {
        title: 'Endlich abgeschleppt',
        story: 'Ein Autofahrer bekommt einen Brief vom Ordnungsamt: Sein Wagen wurde abgeschleppt, er muss 280 Euro zahlen. Er jubelt, küsst den Brief und lädt seine Kollegen zum Essen ein. Die Rechnung bezahlt er gerne.',
        solution: 'Er suchte sein Auto seit drei Wochen, weil er nach einer Feier vergessen hatte, wo er es geparkt hatte. Der Brief verriet ihm endlich, wo es stand.',
        hints: ['Er wusste vorher nicht, wo das Auto war.', 'Jetzt weiß er es.', 'Er hatte schon lange gesucht.'],
      },
      {
        title: 'Je ein Apfel',
        story: 'Ein alter Geizhals stirbt. Die Familie versammelt sich beim Notar, gespannt auf das Erbe. Dort heißt es nur: „Jedem Enkel vermache ich einen Apfel.“ Die Enkel sind wütend und schimpfen auf den Alten. Einen Monat später kündigen alle ihre Jobs.',
        solution: 'Gemeint waren Apple-Aktien, die er in den 80er-Jahren gekauft hatte. Sie waren inzwischen ein Vermögen wert.',
        hints: ['Es hat nichts mit Obst zu tun.', 'Es ist viel mehr wert geworden.', 'Denkt an eine Firma.'],
      },
      {
        title: 'Der Hochzeitstag',
        story: 'Ein Mann ist stolz darauf, dass er den Hochzeitstag kein einziges Mal vergessen hat. Jedes Jahr reserviert er im selben Restaurant, bestellt Champagner und kauft Rosen. Trotzdem steht seine Frau genau an diesem Tag mit Koffern vor der Tür und überreicht ihm die Rechnung des Restaurants.',
        solution: 'Er feierte den Tag jedes Jahr – nur leider mit einer anderen. Die Rechnung wies zwei Personen aus, und sie selbst war nie dabei gewesen.',
        hints: ['Er feierte tatsächlich.', 'Es fehlte die richtige Begleitung.', 'Die Rechnung verriet ihn.'],
      },
      {
        title: 'Bestanden',
        story: 'Ein Verdächtiger will seine Unschuld beweisen und verlangt selbst einen Lügendetektor. Er bleibt ganz ruhig, sein Puls ändert sich nicht, die Nadeln zittern kaum. Er besteht mit Bravour. Die Beamten gratulieren ihm und verhaften ihn sofort.',
        solution: 'Auf die Frage „Waren Sie das?“ hatte er wahrheitsgemäß mit Ja geantwortet. Er dachte, nur wer lügt, fällt durch.',
        hints: ['Das Gerät funktionierte einwandfrei.', 'Er hat nicht gelogen.', 'Prüft, was er gesagt hat.'],
      },
      {
        title: 'Schrittzähler',
        story: 'Ein Mann schwört seiner Frau, er sei auf Dienstreise und gehe früh ins Bett. Um drei Uhr nachts schaut sie in die gemeinsame Fitness-App. Sie sagt kein Wort, packt seine Koffer und reicht am Morgen die Scheidung ein.',
        solution: 'Seine Uhr meldete um drei Uhr nachts einen Puls von 160 und 4.000 Schritte auf der Tanzfläche eines Clubs in der eigenen Stadt.',
        hints: ['Die Daten passen nicht zu seiner Erklärung.', 'Er war nicht auf Dienstreise.', 'Sein Körper hat ihn verraten.'],
      },
      {
        title: 'Ein Buchstabe',
        story: 'Ein Mann arbeitet seit zwölf Jahren in derselben Firma und ist auf Beförderung aus. Er schreibt seiner Chefin eine lange, höfliche Mail und drückt stolz auf Senden. Eine Stunde später räumt er seinen Schreibtisch. Schuld ist ein einziger Buchstabe.',
        solution: 'Die Autokorrektur machte aus „Liebe Frau Dr. Ziske“ die Anrede „Liebe Frau Dr. Zicke“.',
        hints: ['Es war ein Versehen.', 'Es stand ganz am Anfang der Mail.', 'Es geht um ihren Namen.'],
      },
      {
        title: 'Das Geständnis',
        story: 'Nach 30 Ehejahren setzt sich eine Frau mit zitternden Händen zu ihrem Mann und gesteht ihm ihr größtes Geheimnis. Er wird blass, schweigt lange, und bricht dann in Tränen aus – vor Lachen. Dann gesteht er genau dasselbe. Am nächsten Sonntag ist alles anders.',
        solution: 'Beide hassen Pfannkuchen, die sie sich seit 30 Jahren jeden Sonntag gegenseitig machen, weil der andere sie angeblich so liebt.',
        hints: ['Es ist völlig harmlos.', 'Es passiert jede Woche.', 'Es hat mit Essen zu tun.'],
      },
      {
        title: 'Das Wartezimmer',
        story: 'Ein Mann geht jeden Tag in dieselbe Arztpraxis, setzt sich ins Wartezimmer, liest und geht wieder. Er ist kerngesund und hat nie einen Termin. Die Sprechstundenhilfe hat aufgehört, ihn zu fragen, und stellt ihm inzwischen einen Keks hin. An dem Tag, an dem er fehlt, ruft die ganze Praxis bei ihm an.',
        solution: 'Er ist Rentner und einsam. Dort gibt es kostenlose Zeitschriften, Kaffee und jemanden zum Reden. Als er fehlte, machten sich alle Sorgen.',
        hints: ['Er will gar nicht zum Arzt.', 'Das Wartezimmer selbst ist das Ziel.', 'Es geht um Gesellschaft.'],
      },
    ],
  },

  kurios: {
    label: 'Kurios & harmlos',
    hint: 'Ganz ohne Tote',
    emoji: '🤔',
    cases: [
      {
        title: 'Freier Fall',
        story: 'Ein Fensterputzer arbeitet im 20. Stock eines Bürohauses. Plötzlich rutscht er von seiner Leiter ab und stürzt. Ein Kollege hört den Schrei und rennt los. Der Fensterputzer steht längst wieder auf und bleibt völlig unverletzt, ohne Seil und ohne Netz.',
        solution: 'Er stand nur auf der untersten Sprosse und putzte die Fenster von innen.',
        hints: ['Er fiel nicht tief.', 'Er war im Gebäude.', 'Es war nur eine kurze Leiter.'],
      },
      {
        title: 'Zwei Friseure',
        story: 'Ein Reisender kommt in ein kleines Dorf mit genau zwei Friseuren. Der eine trägt eine perfekte Frisur und hat einen blitzsauberen Laden. Der andere trägt eine Katastrophe auf dem Kopf, und in seinem Laden liegen Haare auf dem Boden. Der Reisende überlegt kurz und geht zum Zweiten.',
        solution: 'Die beiden schneiden sich gegenseitig die Haare. Die schlechte Frisur stammt also vom ersten, die gute vom zweiten Friseur.',
        hints: ['Es sind die einzigen Friseure im Dorf.', 'Niemand schneidet sich selbst die Haare.', 'Er schaut, wer wen frisiert hat.'],
      },
      {
        title: 'Der siebte Stock',
        story: 'Ein Junge wohnt im 12. Stock eines Hochhauses. Morgens fährt er mit dem Aufzug ganz nach unten. Abends fährt er nur bis in den 7. Stock und läuft den Rest zu Fuß. Nur wenn es regnet oder jemand mitfährt, fährt er bis ganz oben.',
        solution: 'Er ist zu klein und kommt nur bis zum Knopf der 7. Bei Regen drückt er die 12 mit dem Schirm, sonst bittet er jemanden.',
        hints: ['Es hat mit seiner Größe zu tun.', 'Der Regen selbst ist egal.', 'Er bräuchte etwas Langes.'],
      },
      {
        title: 'Falsche Richtung',
        story: 'Ein Busfahrer missachtet eine rote Ampel, nimmt eine Einbahnstraße in falscher Richtung und quert die Kreuzung diagonal. Ein Polizist steht direkt daneben und schaut ihm dabei zu. Er nickt ihm sogar freundlich zu und unternimmt nichts.',
        solution: 'Der Busfahrer hatte Feierabend und war zu Fuß unterwegs.',
        hints: ['Er hat keine Regel gebrochen.', 'Sein Beruf spielt gerade keine Rolle.', 'Er sitzt in nichts.'],
      },
      {
        title: 'Der 24. Geburtstag',
        story: 'Frau Meier feiert ihren 24. Geburtstag. Es gibt Torte mit 24 Kerzen, und ihre Enkel singen. Ihre Tochter gratuliert ihr, und der Bürgermeister kommt mit einem Blumenstrauß vorbei, weil sie die älteste Einwohnerin des Dorfes ist.',
        solution: 'Sie ist am 29. Februar geboren und hat nur alle vier Jahre richtig Geburtstag. In Wirklichkeit ist sie 96 Jahre alt.',
        hints: ['Ihr Kalender ist schuld.', 'Den Tag gibt es nicht jedes Jahr.', 'Sie ist tatsächlich sehr alt.'],
      },
      {
        title: 'Trocken im Kaffee',
        story: 'Einer Frau rutscht in der Küche ihr Ehering vom Finger und fällt mitten in den Kaffee. Sie erschrickt, greift hinein und zieht ihn wieder heraus. Der Ring ist völlig trocken, ihre Hand auch.',
        solution: 'Es war Kaffeepulver in der Dose, kein fertiger Kaffee.',
        hints: ['Der Kaffee war noch nicht fertig.', 'Es war nichts Flüssiges in der Dose.', 'Sie kochte gerade erst.'],
      },
      {
        title: 'Keine Zwillinge',
        story: 'Zwei Schwestern haben dieselben Eltern, kamen am selben Tag zur selben Stunde im selben Krankenhaus zur Welt und sehen sich zum Verwechseln ähnlich. Trotzdem sagen beide wahrheitsgemäß: „Wir sind keine Zwillinge.“',
        solution: 'Sie sind Drillinge. Die dritte Schwester war nur gerade nicht dabei.',
        hints: ['Sie sind tatsächlich Schwestern.', 'Es fehlt jemand.', 'Zählt noch einmal.'],
      },
      {
        title: 'Rasiert und bärtig',
        story: 'Ein Mann steht morgens um sieben auf und rasiert sich zwanzigmal am Tag, sechs Tage die Woche. Trotzdem trägt er seit Jahren einen langen, gepflegten Bart. Seine Frau findet das völlig normal.',
        solution: 'Er ist Barbier und rasiert seine Kunden, nicht sich selbst.',
        hints: ['Es geht um seinen Beruf.', 'Er rasiert nicht sich selbst.', 'Seine Kunden sehen danach anders aus.'],
      },
      {
        title: 'Zwei Zimmer',
        story: 'Ein Geschäftsmann bucht im Hotel immer zwei nebeneinanderliegende Zimmer. Er schläft nur in einem, das zweite betritt er nie, und das Personal darf es nicht reinigen. An der Rezeption nennt man ihn nur „den Mann mit dem Geisterzimmer“.',
        solution: 'Er will unbedingt seine Ruhe. So kann nebenan niemand schnarchen oder Lärm machen.',
        hints: ['Das zweite Zimmer bleibt leer, mit Absicht.', 'Es geht um Geräusche.', 'Er schläft sehr schlecht.'],
      },
      {
        title: 'Zehn Meter Seil',
        story: 'Ein Hund ist mit einem zehn Meter langen Seil am Halsband angebunden. Ein Knochen liegt 30 Meter entfernt. Niemand hilft ihm, und trotzdem frisst er den Knochen in aller Ruhe auf. Das Seil ist nicht gerissen.',
        solution: 'Das Seil war nur am Halsband befestigt, sonst nirgends.',
        hints: ['Niemand hat dem Hund geholfen.', 'Prüft, woran das Seil befestigt war.', 'Das andere Ende ist frei.'],
      },
      {
        title: 'Mein Bruder',
        story: 'Im Krankenhaus zeigt jemand vom Ärzteteam auf den Patienten und sagt bewegt: „Das ist mein Bruder.“ Der Patient sagt wahrheitsgemäß: „Ich habe keinen Bruder.“ Beide haben recht, und keiner ist verwirrt.',
        solution: 'Die Ärztin ist seine Schwester. Für sie ist er der Bruder, für ihn gibt es nur eine Schwester.',
        hints: ['Beide sagen die Wahrheit.', 'Prüft, von wem ihr ausgegangen seid.', 'Es geht um Geschlechter.'],
      },
      {
        title: 'Die Bordleiter',
        story: 'Am Schiff hängt eine Strickleiter, ihre unterste Sprosse berührt gerade das Wasser. Die Sprossen haben 30 Zentimeter Abstand. Die Flut steigt um zwei Meter. Ein Matrose schaut zu und wartet darauf, dass die oberste Sprosse nass wird. Er wartet vergeblich.',
        solution: 'Das Schiff schwimmt und steigt mit dem Wasser nach oben.',
        hints: ['Das Wasser steigt wirklich.', 'Das Schiff liegt nicht fest.', 'Es bewegt sich mit.'],
      },
    ],
  },
};
