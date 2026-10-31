// Fälle für „Dunkle Rätsel“ – die Runde klärt per Ja/Nein-Fragen, was wirklich passiert ist.
// Eintrag: { title, story, solution, hints: [Tipp 1, Tipp 2] }
// story wird vorgelesen, solution sieht nur die Person, die den Fall leitet.
// Neue Fälle selbst ausdenken – keine Karten aus gekauften Rätselspielen abschreiben.

export default {
  krimi: {
    label: 'Verbrechen',
    hint: 'Alibis, Täter und Spuren',
    emoji: '🔍',
    cases: [
      {
        title: 'Aus derselben Flasche',
        story: 'Zwei Erzfeinde schließen Frieden und trinken aus derselben Flasche Wein. Einer bricht noch am Tisch tot zusammen, der andere bleibt völlig gesund.',
        solution: 'Der Wein war harmlos. Der Überlebende hatte das Gift auf den Rand des Glases gestrichen, aus dem sein Feind immer trank.',
        hints: ['Am Wein lag es nicht.', 'Jeder hatte sein eigenes Glas.'],
      },
      {
        title: 'Nichts gestohlen',
        story: 'Ein Einbrecher knackt nachts ein Schloss, durchwühlt nichts, nimmt nichts mit und verlässt das Haus erleichtert.',
        solution: 'Er brachte etwas zurück: den Ring, den er dort vor 20 Jahren gestohlen hatte. Er wollte vor seinem Tod reinen Tisch machen.',
        hints: ['Er hatte nach dem Einbruch weniger bei sich als vorher.', 'Er kannte das Haus von früher.'],
      },
      {
        title: 'Scherben im Garten',
        story: 'Ein Hausbesitzer meldet aufgeregt einen Einbruch. Die Kommissarin wirft einen Blick auf das zerbrochene Fenster und verhaftet ihn wegen Versicherungsbetrugs.',
        solution: 'Die Scherben lagen draußen im Garten. Das Fenster war also von innen eingeschlagen worden.',
        hints: ['Es geht um die Scherben.', 'Wo liegen Scherben, wenn jemand von außen einsteigt?'],
      },
      {
        title: 'Die blinde Zeugin',
        story: 'Eine Zeugin, die seit ihrer Geburt blind ist, überführt einen Bankräuber bei der Gegenüberstellung mit absoluter Sicherheit.',
        solution: 'Er hatte sie auf der Flucht angerempelt und sich entschuldigt. Sie erkannte seine Stimme und seinen Sprachfehler wieder.',
        hints: ['Sie hat ihn nicht gesehen, aber wahrgenommen.', 'Er hatte während der Flucht etwas zu ihr gesagt.'],
      },
      {
        title: 'Nur eine Spur',
        story: 'Im frischen Schnee liegt ein Toter mitten auf dem Feld. Es führt nur eine einzige Fußspur zu ihm hin, und keine führt weg. Trotzdem war es Mord.',
        solution: 'Der Täter ging hinter dem Opfer her und danach rückwärts in dessen Fußstapfen zurück.',
        hints: ['Es waren zwei Personen auf dem Feld.', 'Eine Spur kann von zwei Menschen stammen.'],
      },
      {
        title: 'Die Uhr am falschen Arm',
        story: 'Ein Mann liegt tot am Fuß der Treppe, seine zerschlagene Armbanduhr zeigt 20:14 Uhr. Die Kommissarin lächelt: Der Täter hat sich selbst verraten.',
        solution: 'Der Tote war Linkshänder und trug seine Uhr immer rechts. Sie hing links, weil der Täter sie ihm angelegt und verstellt hatte, um sich ein Alibi zu bauen.',
        hints: ['Die Uhrzeit stimmt nicht.', 'Die Kommissarin kannte eine Gewohnheit des Toten.'],
      },
      {
        title: 'Ohne Maske',
        story: 'Der Bankräuber trug keine Maske, Dutzende Menschen haben sein Gesicht gesehen, die Kamera auch. Trotzdem spricht ihn das Gericht frei.',
        solution: 'Er hat einen eineiigen Zwillingsbruder. Niemand konnte beweisen, welcher der beiden in der Bank war.',
        hints: ['Das Gesicht auf dem Video ist tatsächlich seines.', 'Das Gericht braucht Gewissheit, welche Person es war.'],
      },
      {
        title: 'Gegen das Licht',
        story: 'Ein Testament von 1998 macht einen Neffen reich. Die Notarin hält das Blatt gegen das Licht und ruft die Polizei.',
        solution: 'Das Wasserzeichen im Papier stammte von einem Hersteller, den es 1998 noch gar nicht gab. Der Neffe hatte das Testament gefälscht.',
        hints: ['Der Text ist unauffällig, das Blatt nicht.', 'Das Papier ist jünger als das Datum.'],
      },
      {
        title: 'Grüß den Hund',
        story: 'Eine Frau ruft zu Hause an und sagt fröhlich: „Mir geht es gut, grüß den Hund von mir!“ Ihr Mann legt auf und ruft sofort die Polizei.',
        solution: 'Die beiden haben keinen Hund. Das war ihr vereinbartes Codewort: Sie wurde gezwungen anzurufen.',
        hints: ['Der Satz ergibt für die beiden keinen Sinn.', 'Sie hatten das vorher abgesprochen.'],
      },
      {
        title: 'Die Tankquittung',
        story: 'Ein Verdächtiger hat ein perfektes Alibi: eine Tankquittung, 300 Kilometer vom Tatort entfernt. Die Polizistin liest sie und nimmt ihn fest.',
        solution: 'Auf der Quittung stand Diesel, sein Auto fährt mit Benzin. Ein Komplize hatte mit seiner Karte getankt.',
        hints: ['Die Uhrzeit und der Ort stimmen.', 'Es geht um das, was getankt wurde.'],
      },
      {
        title: 'Der letzte Mitbewohner',
        story: 'Die Polizei findet in einer verlassenen Wohnung nichts außer einem Vogelkäfig – und löst dadurch den Fall.',
        solution: 'Der Papagei plapperte immer wieder: „Nicht schießen, Bernd!“ So hatte die Polizei den Namen des Täters.',
        hints: ['Der Käfig war nicht leer.', 'Der Bewohner hat etwas gehört und wiederholt es.'],
      },
      {
        title: 'Das Urlaubsfoto',
        story: 'Ein Verdächtiger legt als Alibi ein Foto von sich am Strand vor. Die Ermittlerin zoomt hinein und nimmt ihn mit.',
        solution: 'In seiner Sonnenbrille spiegelte sich kein Meer, sondern ein Fotostudio mit Lampen. Der Strand war eine Fototapete.',
        hints: ['Das Entscheidende ist winzig klein.', 'Es geht um eine Spiegelung.'],
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
        story: 'Ein Wanderer hört weit oben am Hang begeisterten Applaus. Er rennt los, aber es ist schon zu spät.',
        solution: 'Der Lärm der Ausflugsgruppe löste im Tiefschnee eine Lawine aus.',
        hints: ['Es ist Winter.', 'Der Applaus selbst war nicht das Gefährliche, sondern was er auslöste.'],
      },
      {
        title: 'Der erste Arbeitstag',
        story: 'Ein Feinschmecker isst das beste Gericht seines Lebens und stirbt noch am selben Abend. Der Koch weint.',
        solution: 'Es war Kugelfisch. Der Koch hatte seinen ersten Tag und das giftige Organ nicht richtig entfernt.',
        hints: ['Niemand wollte ihn töten.', 'Das Gericht ist berühmt dafür, gefährlich zu sein.'],
      },
      {
        title: 'Das perfekte Foto',
        story: 'Ein Tourist stirbt an den Klippen. Die letzten Bilder auf seinem Handy sind wunderschön.',
        solution: 'Er ging beim Selfie immer weiter zurück, um alles aufs Bild zu bekommen – bis keine Klippe mehr da war.',
        hints: ['Niemand sonst war beteiligt.', 'Er wollte möglichst viel aufs Bild bekommen.'],
      },
      {
        title: 'Der Rettungsring',
        story: 'Ein Mann treibt im Hafenbecken. Ein Matrose wirft ihm einen Rettungsring zu – und genau der wird ihm zum Verhängnis.',
        solution: 'Der schwere Ring traf ihn am Kopf.',
        hints: ['Der Matrose wollte wirklich helfen.', 'Es liegt am Gewicht des Rings.'],
      },
      {
        title: 'Der Abschied',
        story: 'Eine berühmte Tänzerin steigt in ein offenes Auto, winkt ihren Fans zum Abschied zu, lacht – und ist wenige Sekunden später tot.',
        solution: 'Ihr langer Seidenschal verfing sich im Hinterrad. So starb im Jahr 1927 wirklich die Tänzerin Isadora Duncan.',
        hints: ['Es geht um ein Kleidungsstück.', 'Es ist tatsächlich so passiert.'],
      },
      {
        title: 'Zu höflich',
        story: 'Ein Mann stirbt, weil er in einem entscheidenden Moment zu höflich war.',
        solution: 'Er überließ auf der sinkenden Titanic einer Dame seinen Platz im Rettungsboot.',
        hints: ['Er war auf Reisen.', 'Die Plätze waren knapp.'],
      },
      {
        title: 'Nur ein Foto',
        story: 'Ein Bergsteiger nimmt auf dem Gipfel kurz für ein Foto seine Brille ab. Zwei Tage später findet man ihn, nur 50 Meter neben der Hütte.',
        solution: 'Die grelle Sonne im Schnee machte ihn schneeblind. Er fand den Weg nicht mehr.',
        hints: ['Es war die Sonne.', 'Er konnte die Hütte nicht mehr sehen.'],
      },
      {
        title: 'Die Trompete',
        story: 'Jahrelang hat eine alte Dame sich über ihren Nachbarn beschwert. Als er auszieht, ist sie bald darauf tot.',
        solution: 'Er übte jeden Abend um acht Trompete. Das war ihr Signal, die Herztabletten zu nehmen.',
        hints: ['Sein Lärm hatte eine Funktion.', 'Es hat mit ihrer Gesundheit zu tun.'],
      },
      {
        title: 'Standing Ovations',
        story: 'Ein Zauberer stirbt auf der Bühne, während das Publikum begeistert klatscht.',
        solution: 'Beim Entfesselungstrick im Wassertank klemmte das Schloss. Alle hielten sein Zappeln für einen Teil der Show.',
        hints: ['Er hatte nicht geplant zu sterben.', 'Das Publikum dachte, alles gehöre dazu.'],
      },
      {
        title: 'Ein Schluck Limo',
        story: 'An einem heißen Tag nimmt ein Mann einen Schluck aus seiner Dose. Eine Stunde später ist er tot. In der Limo war kein Gift.',
        solution: 'In die offene Dose war eine Wespe gekrabbelt. Sie stach ihn in den Hals, und er war allergisch.',
        hints: ['Die Dose stand offen herum.', 'Es war etwas Lebendiges.'],
      },
      {
        title: 'Der große Fang',
        story: 'Ein Angler fängt den größten Fisch seines Lebens und ertrinkt dabei in knietiefem Wasser neben dem Steg.',
        solution: 'Er hatte sich die Schnur ums Handgelenk gewickelt. Der Fisch riss ihn vom Steg, er schlug mit dem Kopf auf und wurde bewusstlos.',
        hints: ['Er wollte die Angel besonders gut festhalten.', 'Der Fisch war stärker als gedacht.'],
      },
      {
        title: 'Der schönste Schneemann',
        story: 'Im ganzen Dorf wird der riesige Schneemann im Garten der Meiers bewundert. Im März ruft der Nachbar die Polizei.',
        solution: 'Als er schmolz, kam Herr Meier zum Vorschein, der seit Januar als vermisst galt.',
        hints: ['Es wurde wärmer.', 'Im Schneemann war etwas.'],
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
        story: 'Ein Fensterputzer fällt im 20. Stock von seiner Leiter und bleibt völlig unverletzt.',
        solution: 'Er stand auf der untersten Sprosse und putzte die Fenster von innen.',
        hints: ['Er fiel nicht tief.', 'Er war im Gebäude.'],
      },
      {
        title: 'Zwei Friseure',
        story: 'Ein Reisender kommt in ein Dorf mit zwei Friseuren. Der eine trägt eine perfekte Frisur, der andere eine Katastrophe. Der Reisende geht zum Zweiten.',
        solution: 'Die beiden schneiden sich gegenseitig die Haare. Die schlechte Frisur stammt vom anderen.',
        hints: ['Es sind die einzigen Friseure im Dorf.', 'Niemand schneidet sich selbst die Haare.'],
      },
      {
        title: 'Der siebte Stock',
        story: 'Ein Junge wohnt im 12. Stock. Morgens fährt er mit dem Aufzug ganz nach unten, abends nur bis in den 7. Stock und läuft den Rest. Nur bei Regen fährt er bis ganz oben.',
        solution: 'Er ist zu klein und kommt nur bis zum Knopf der 7. Bei Regen hat er einen Schirm dabei und drückt damit die 12.',
        hints: ['Es hat mit seiner Größe zu tun.', 'Der Regen selbst ist egal.'],
      },
      {
        title: 'Falsche Richtung',
        story: 'Ein Busfahrer missachtet eine rote Ampel, nimmt eine Einbahnstraße in falscher Richtung und quert die Kreuzung diagonal. Ein Polizist sieht alles und unternimmt nichts.',
        solution: 'Der Busfahrer war an diesem Tag zu Fuß unterwegs.',
        hints: ['Er hat keine Regel gebrochen.', 'Sein Beruf spielt gerade keine Rolle.'],
      },
      {
        title: 'Der sechste Geburtstag',
        story: 'Frau Meier feiert ihren sechsten Geburtstag. Ihre Enkel gratulieren ihr dazu.',
        solution: 'Sie ist am 29. Februar geboren und hat nur alle vier Jahre richtig Geburtstag.',
        hints: ['Ihr Kalender ist schuld.', 'Den Tag gibt es nicht jedes Jahr.'],
      },
      {
        title: 'Trocken im Kaffee',
        story: 'Einer Frau fällt ihr Ehering in den Kaffee, doch er wird nicht nass.',
        solution: 'Es war Kaffeepulver, kein fertiger Kaffee.',
        hints: ['Der Kaffee war noch nicht fertig.', 'Es war nichts Flüssiges in der Dose.'],
      },
      {
        title: 'Keine Zwillinge',
        story: 'Zwei Schwestern haben dieselben Eltern und kamen am selben Tag zur selben Stunde zur Welt. Trotzdem sind sie keine Zwillinge.',
        solution: 'Sie sind Drillinge. Die dritte Schwester war nur gerade nicht dabei.',
        hints: ['Sie sind tatsächlich Schwestern.', 'Es fehlt jemand.'],
      },
      {
        title: 'Rasiert und bärtig',
        story: 'Ein Mann rasiert sich zwanzigmal am Tag und trägt trotzdem einen langen Bart.',
        solution: 'Er ist Friseur und rasiert seine Kunden.',
        hints: ['Es geht um seinen Beruf.', 'Er rasiert nicht sich selbst.'],
      },
      {
        title: 'Zwei Zimmer',
        story: 'Ein Geschäftsmann bucht im Hotel immer zwei nebeneinanderliegende Zimmer, schläft aber nur in einem. Das zweite betritt er nie.',
        solution: 'Er will unbedingt seine Ruhe. So kann nebenan niemand schnarchen oder Lärm machen.',
        hints: ['Das zweite Zimmer bleibt leer, mit Absicht.', 'Es geht um Geräusche.'],
      },
      {
        title: 'Zehn Meter Seil',
        story: 'Ein Hund hängt an einem zehn Meter langen Seil. Ein Knochen liegt 30 Meter entfernt, und trotzdem frisst er ihn.',
        solution: 'Das Seil war nirgends festgebunden.',
        hints: ['Niemand hat dem Hund geholfen.', 'Prüft, woran das Seil befestigt war.'],
      },
      {
        title: 'Mein Bruder',
        story: 'Im Krankenhaus zeigt jemand vom Ärzteteam auf den Patienten und sagt: „Das ist mein Bruder.“ Der Patient sagt wahrheitsgemäß: „Ich habe keinen Bruder.“',
        solution: 'Die Ärztin ist seine Schwester.',
        hints: ['Beide sagen die Wahrheit.', 'Prüft, von wem ihr ausgegangen seid.'],
      },
      {
        title: 'Die Bordleiter',
        story: 'Am Schiff hängt eine Leiter, ihre unterste Sprosse berührt das Wasser. Die Flut steigt um zwei Meter, aber das Wasser erreicht die zweite Sprosse nie.',
        solution: 'Das Schiff schwimmt und steigt mit dem Wasser nach oben.',
        hints: ['Das Wasser steigt wirklich.', 'Das Schiff liegt nicht fest.'],
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
        story: 'Ein Bestatter bekommt eine vernichtende Online-Bewertung – von der Verstorbenen selbst.',
        solution: 'Sie war nur scheintot und wachte bei der Aufbahrung wieder auf. Den Service fand sie unterirdisch.',
        hints: ['Die Bewertung ist echt.', 'Sie war gar nicht tot.'],
      },
      {
        title: 'Lachen am Grab',
        story: 'Bei einer Trauerfeier bricht die ganze Gemeinde in lautes Lachen aus, und die Witwe freut sich darüber am meisten.',
        solution: 'Der Verstorbene hatte im Sarg einen Lautsprecher verstecken lassen, der rief: „Lasst mich hier raus!“ Sein letzter Streich.',
        hints: ['Das war geplant.', 'Der Verstorbene selbst steckt dahinter.'],
      },
      {
        title: 'Der leere Sitz',
        story: 'Eine Witwe bucht auf jeder Reise zwei Sitze. Der Platz neben ihr bleibt immer frei.',
        solution: 'Dort steht die Urne ihres Mannes im Handgepäck. Er wollte immer die Welt sehen.',
        hints: ['Der Platz ist nicht wirklich leer.', 'Sie reist mit jemandem.'],
      },
      {
        title: 'Sechzig Kilo',
        story: 'Ein Mann verliert über Nacht sechzig Kilo und ist todunglücklich.',
        solution: 'Seine Frau hat ihn verlassen.',
        hints: ['Sein eigenes Gewicht ist gleich geblieben.', 'Jemand ist weg.'],
      },
      {
        title: 'Endlich abgeschleppt',
        story: 'Ein Autofahrer erfährt, dass sein Wagen abgeschleppt wurde, und jubelt.',
        solution: 'Er suchte das Auto seit drei Wochen, weil er vergessen hatte, wo er es geparkt hatte.',
        hints: ['Er wusste vorher nicht, wo das Auto war.', 'Jetzt weiß er es.'],
      },
      {
        title: 'Je ein Apfel',
        story: 'Ein alter Geizhals vermacht jedem Enkel „einen Apfel“. Erst sind alle wütend, dann kündigen sie ihre Jobs.',
        solution: 'Gemeint waren Apple-Aktien aus den 80er-Jahren.',
        hints: ['Es hat nichts mit Obst zu tun.', 'Es ist seit Jahrzehnten viel mehr wert geworden.'],
      },
      {
        title: 'Der Hochzeitstag',
        story: 'Ein Mann hat den Hochzeitstag kein einziges Mal vergessen. Trotzdem verlässt ihn seine Frau genau an diesem Tag.',
        solution: 'Er feierte ihn jedes Jahr – nur leider mit einer anderen.',
        hints: ['Er feierte tatsächlich.', 'Es fehlte die richtige Begleitung.'],
      },
      {
        title: 'Bestanden',
        story: 'Ein Verdächtiger besteht den Lügendetektor mit Bravour und wird sofort verhaftet.',
        solution: 'Auf die Frage „Waren Sie das?“ hatte er wahrheitsgemäß mit Ja geantwortet.',
        hints: ['Das Gerät funktionierte einwandfrei.', 'Er hat nicht gelogen.'],
      },
      {
        title: 'Schrittzähler',
        story: 'Um drei Uhr nachts sieht sich eine Frau die Fitnessdaten ihres Mannes an und reicht die Scheidung ein.',
        solution: 'Er war angeblich auf Dienstreise und längst im Bett. Seine Uhr zeigte einen Puls von 160.',
        hints: ['Die Daten passen nicht zu seiner Erklärung.', 'Er behauptete, zu schlafen.'],
      },
      {
        title: 'Ein Buchstabe',
        story: 'Ein Mann verliert wegen eines einzigen Buchstabens seinen Job.',
        solution: 'Die Autokorrektur machte aus „Liebe Frau Dr. Ziske“ in der Mail an die Chefin „Liebe Frau Dr. Zicke“.',
        hints: ['Es war ein Versehen.', 'Er hatte eine Mail verschickt.'],
      },
      {
        title: 'Das Geständnis',
        story: 'Nach 30 Ehejahren gesteht eine Frau ihrem Mann ihr größtes Geheimnis. Er lacht Tränen und gesteht genau dasselbe.',
        solution: 'Beide hassen Pfannkuchen, die sie sich seit 30 Jahren jeden Sonntag gegenseitig machen.',
        hints: ['Es ist völlig harmlos.', 'Es passiert jede Woche.'],
      },
      {
        title: 'Das Wartezimmer',
        story: 'Ein Mann geht jeden Tag in dieselbe Arztpraxis, setzt sich ins Wartezimmer, liest und geht wieder. Er ist kerngesund.',
        solution: 'Er ist Rentner. Dort gibt es kostenlose Zeitschriften, Kaffee und jemanden zum Reden.',
        hints: ['Er will gar nicht zum Arzt.', 'Das Wartezimmer selbst ist das Ziel.'],
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
        story: 'Mitten in der Nacht hört eine Mutter übers Babyfon eine fremde Stimme, die leise ein Schlaflied singt. Sie stürzt ins Kinderzimmer. Dort ist niemand.',
        solution: 'Das Babyfon empfing das Signal der neuen Nachbarin, die nebenan ihr eigenes Kind in den Schlaf sang.',
        hints: ['Dem Kind ging es die ganze Zeit gut.', 'Die Technik spielte ihr einen Streich.'],
      },
      {
        title: 'Der Mann im Hintergrund',
        story: 'Eine Familie entdeckt beim Durchblättern alter Alben auf fast jedem Urlaubsfoto denselben Mann im Hintergrund. Ein Blick auf ihn lässt die Mutter weinen.',
        solution: 'Es ist der Vater der Kinder. Nach der Trennung reiste er heimlich hinterher, um sie aufwachsen zu sehen.',
        hints: ['Er wollte niemandem etwas tun.', 'Die Mutter kennt ihn.'],
      },
      {
        title: 'Spuren an der Decke',
        story: 'Eine Frau zieht in eine neue Wohnung und entdeckt im Schlafzimmer Schuhabdrücke, die quer über die Decke laufen.',
        solution: 'Der Vormieter hatte sich einen Scherz erlaubt und sie mit Schuhen an einem Besenstiel aufgestempelt.',
        hints: ['Niemand ist je an der Decke gelaufen.', 'Es war ein Streich.'],
      },
      {
        title: 'Die Anhalterin',
        story: 'Nachts nimmt ein Autofahrer eine blasse Frau mit. Sie steigt wortlos am Friedhof aus. Am nächsten Tag sieht er ihr Gesicht dort auf einem Grabstein.',
        solution: 'Das Foto zeigt ihre Zwillingsschwester, deren Grab sie jede Nacht nach der Spätschicht besucht.',
        hints: ['Sie lebt.', 'Das Foto zeigt nicht sie selbst.'],
      },
      {
        title: 'Das Klopfen',
        story: 'Jede Nacht um drei klopft es in der Wand. Die Bewohnerin hält es für die Nachbarin. Dann stirbt die Nachbarin, und das Klopfen geht weiter.',
        solution: 'Es sind die Heizungsrohre, die nachts abkühlen und sich zusammenziehen.',
        hints: ['Niemand klopft.', 'Es passiert immer, wenn die Heizung ausgeht.'],
      },
      {
        title: 'Licht im leeren Haus',
        story: 'In einem Haus, das seit 30 Jahren leer steht, geht jeden Abend um 20 Uhr im oberen Fenster das Licht an.',
        solution: 'Der letzte Bewohner hatte eine Zeitschaltuhr eingebaut, und ein Nachbar zahlt bis heute heimlich den Strom, damit das Haus bewohnt wirkt.',
        hints: ['Es ist niemand im Haus.', 'Das Licht schaltet sich immer zur gleichen Zeit ein.'],
      },
      {
        title: 'Die wandernde Puppe',
        story: 'Eine alte Puppe auf dem Dachboden sitzt jeden Morgen an einer anderen Stelle, obwohl niemand dort war.',
        solution: 'Die Katze zieht sie nachts als Beute durchs Haus.',
        hints: ['Es war jemand da, aber kein Mensch.', 'Der Täter hat vier Beine.'],
      },
      {
        title: 'Es klingelt',
        story: 'Mitten in der Beerdigung klingelt es laut aus dem Sarg. Die Trauergäste erstarren.',
        solution: 'Der Bestatter hatte das Handy in der Jackentasche des Toten vergessen, und der Akku hielt noch.',
        hints: ['Der Tote ist wirklich tot.', 'Es ist ein alltäglicher Gegenstand.'],
      },
      {
        title: 'Geburtstagsgrüße',
        story: 'Eine Witwe bekommt jedes Jahr an ihrem Geburtstag eine Nachricht von der Nummer ihres verstorbenen Mannes.',
        solution: 'Er hatte die Nachrichten vor seinem Tod vorprogrammiert, für die nächsten 20 Jahre.',
        hints: ['Niemand benutzt sein Handy.', 'Er hat vorgesorgt.'],
      },
      {
        title: 'Spuren im Mehl',
        story: 'Jede Nacht hört eine Frau Schritte auf dem Dachboden. Sie streut Mehl aus. Am Morgen findet sie winzige Spuren, die mitten im Raum plötzlich enden.',
        solution: 'Es ist ein Eichhörnchen, das vom Boden auf die Dachbalken springt.',
        hints: ['Die Spuren sind sehr klein.', 'Prüft, wohin man von dort noch kommen kann.'],
      },
      {
        title: 'Uromas Lied',
        story: 'Ein kleines Mädchen summt eine Melodie, die nur ihre lange verstorbene Urgroßmutter kannte. Die Familie erstarrt.',
        solution: 'Das Mädchen hatte auf dem Dachboden eine alte Kassette gefunden, auf der Uroma das Lied singt.',
        hints: ['Es gibt eine ganz normale Erklärung.', 'Sie hat es irgendwo gehört.'],
      },
      {
        title: 'Post von dir',
        story: 'Eine Frau bekommt einen Brief, geschrieben in ihrer eigenen Handschrift. Sie hat ihn nie abgeschickt.',
        solution: 'Ihre Lehrerin hatte die Klasse vor 20 Jahren Briefe an ihr zukünftiges Ich schreiben lassen und sie jetzt verschickt.',
        hints: ['Sie hat ihn wirklich selbst geschrieben.', 'Das ist sehr lange her.'],
      },
    ],
  },
};
