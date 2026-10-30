// Yogapositionen für „Yoga-Challenge“.
//
// Jede Figur ist ein Strichmännchen aus Gelenkpunkten (x, y) in einem Feld von w × 100, Boden bei y = 92:
//   h = Kopf, n = Hals/Schultern, p = Hüfte
//   a = Arme   [[Ellbogen x, y, Hand x, y], …]   – der zweite Arm wird etwas blasser (hinten) gezeichnet
//   l = Beine  [[Knie x, y, Fuß x, y], …]        – das zweite Bein ebenso
// Duo-Positionen haben zwei Figuren; die zweite wird in einer anderen Farbe gezeichnet.

export const LEVELS = {
  leicht: { label: 'Leicht', hint: 'Zum Aufwärmen' },
  mittel: { label: 'Mittel', hint: 'Gleichgewicht gefragt' },
  schwer: { label: 'Schwer', hint: 'Nur für Mutige' },
};

export const solo = [
  {
    name: 'Baum', sanskrit: 'Vrikshasana', level: 'leicht',
    how: 'Auf einem Bein stehen, den anderen Fuß innen an den Oberschenkel legen, Hände über dem Kopf zusammen.',
    figures: [{ h: [60, 22], n: [60, 30], p: [60, 56], a: [[49, 15, 58, 4], [71, 15, 62, 4]], l: [[76, 68, 62, 64], [60, 74, 60, 92]] }],
  },
  {
    name: 'Krieger I', sanskrit: 'Virabhadrasana I', level: 'leicht',
    how: 'Großer Ausfallschritt, vorderes Knie über dem Fuß beugen, hinteres Bein gestreckt, Arme nach oben.',
    figures: [{ h: [58, 34], n: [58, 42], p: [58, 68], a: [[61, 28, 62, 14], [55, 28, 54, 14]], l: [[78, 70, 79, 92], [43, 80, 28, 92]] }],
  },
  {
    name: 'Krieger II', sanskrit: 'Virabhadrasana II', level: 'leicht',
    how: 'Breit stehen, vorderes Knie beugen, Arme waagerecht zu beiden Seiten ausstrecken, über die vordere Hand schauen.',
    figures: [{ h: [60, 30], n: [60, 38], p: [60, 64], a: [[74, 38, 88, 38], [46, 38, 32, 38]], l: [[80, 66, 82, 92], [44, 78, 28, 92]] }],
  },
  {
    name: 'Stuhl', sanskrit: 'Utkatasana', level: 'leicht',
    how: 'Füße zusammen, in die Knie gehen, als würdest du dich auf einen Stuhl setzen, Arme lang nach oben.',
    figures: [{ h: [61, 37], n: [58, 44], p: [50, 68], a: [[66, 33, 71, 21], [64, 32, 68, 20]], l: [[70, 72, 64, 92], [68, 73, 62, 92]] }],
  },
  {
    name: 'Dreieck', sanskrit: 'Trikonasana', level: 'leicht',
    how: 'Beine weit grätschen, zur Seite kippen, eine Hand ans Schienbein, die andere senkrecht nach oben.',
    figures: [{ h: [89, 43], n: [82, 48], p: [60, 62], a: [[83, 62, 84, 76], [81, 34, 80, 20]], l: [[75, 77, 90, 92], [45, 77, 30, 92]] }],
  },
  {
    name: 'Herabschauender Hund', sanskrit: 'Adho Mukha Svanasana', level: 'leicht',
    how: 'Hände und Füße am Boden, Po hoch nach oben schieben, sodass der Körper ein umgedrehtes V bildet.',
    figures: [{ h: [37, 77], n: [42, 70], p: [62, 48], a: [[36, 81, 30, 92], [33, 81, 26, 92]], l: [[76, 70, 90, 92], [74, 70, 86, 92]] }],
  },
  {
    name: 'Kobra', sanskrit: 'Bhujangasana', level: 'leicht',
    how: 'Auf dem Bauch liegen, Hände unter die Schultern und den Oberkörper aufrichten, Beine bleiben am Boden.',
    figures: [{ h: [78, 59], n: [72, 66], p: [50, 88], a: [[70, 78, 72, 90], [68, 78, 69, 90]], l: [[36, 89, 20, 90], [36, 90, 20, 91]] }],
  },
  {
    name: 'Krieger III', sanskrit: 'Virabhadrasana III', level: 'mittel',
    how: 'Auf einem Bein stehen, Oberkörper und das andere Bein waagerecht wie ein T, Arme nach vorne.',
    figures: [{ h: [89, 52], n: [81, 55], p: [56, 56], a: [[95, 52, 109, 50], [94, 54, 108, 53]], l: [[57, 74, 58, 92], [38, 56, 20, 56]] }],
  },
  {
    name: 'Tänzer', sanskrit: 'Natarajasana', level: 'mittel',
    how: 'Auf einem Bein stehen, den anderen Fuß hinten hochziehen und festhalten, freien Arm nach vorne oben strecken.',
    figures: [{ h: [80, 30], n: [74, 37], p: [58, 56], a: [[86, 29, 98, 20], [55, 40, 38, 40]], l: [[58, 74, 58, 92], [40, 62, 36, 40]] }],
  },
  {
    name: 'Boot', sanskrit: 'Navasana', level: 'mittel',
    how: 'Auf dem Po balancieren, Beine gestreckt anheben, Oberkörper zurücklehnen und Arme parallel zum Boden.',
    figures: [{ h: [35, 53], n: [40, 60], p: [56, 82], a: [[54, 62, 68, 62], [53, 64, 67, 64]], l: [[70, 68, 84, 54], [69, 70, 83, 56]] }],
  },
  {
    name: 'Einbeiniger Hund', sanskrit: 'Eka Pada Adho Mukha Svanasana', level: 'mittel',
    how: 'Aus dem herabschauenden Hund ein Bein gestreckt so hoch wie möglich nach hinten oben heben.',
    figures: [{ h: [37, 77], n: [42, 70], p: [62, 48], a: [[36, 81, 30, 92], [33, 81, 26, 92]], l: [[78, 37, 95, 26], [76, 70, 90, 92]] }],
  },
  {
    name: 'Halbmond', sanskrit: 'Ardha Chandrasana', level: 'mittel',
    how: 'Auf einem Bein, eine Hand am Boden, Oberkörper und anderes Bein waagerecht, obere Hand zur Decke.',
    figures: [{ h: [16, 57], n: [24, 58], p: [48, 60], a: [[25, 74, 26, 90], [23, 44, 22, 28]], l: [[46, 76, 44, 92], [66, 59, 84, 58]] }],
  },
  {
    name: 'Brücke', sanskrit: 'Setu Bandhasana', level: 'mittel',
    how: 'Auf dem Rücken liegen, Füße aufstellen und die Hüfte so weit wie möglich nach oben drücken.',
    figures: [{ h: [28, 86], n: [36, 85], p: [60, 64], a: [[48, 89, 60, 91], [48, 90, 61, 92]], l: [[76, 66, 76, 92], [74, 67, 74, 92]] }],
  },
  {
    name: 'Seitstütz', sanskrit: 'Vasisthasana', level: 'mittel',
    how: 'Auf einer Hand und der Fußkante seitlich stützen, Körper gerade wie ein Brett, oberen Arm nach oben.',
    figures: [{ h: [24, 61], n: [32, 64], p: [58, 74], a: [[31, 78, 30, 92], [33, 50, 34, 36]], l: [[76, 81, 94, 89], [76, 82, 94, 91]] }],
  },
  {
    name: 'Kerze', sanskrit: 'Sarvangasana', level: 'mittel',
    how: 'Auf den Rücken legen, Beine und Hüfte senkrecht nach oben, mit den Händen den unteren Rücken stützen.',
    figures: [{ h: [42, 88], n: [50, 86], p: [52, 58], a: [[62, 88, 58, 68], [61, 89, 57, 69]], l: [[52, 40, 52, 22], [53, 40, 54, 22]] }],
  },
  {
    name: 'Krähe', sanskrit: 'Bakasana', level: 'schwer',
    how: 'In der Hocke Hände auf den Boden, Knie auf die Oberarme legen, nach vorne lehnen und die Füße abheben.',
    figures: [{ h: [80, 64], n: [72, 66], p: [50, 58], a: [[66, 78, 72, 92], [64, 78, 68, 92]], l: [[64, 73, 47, 71], [62, 75, 46, 74]] }],
  },
  {
    name: 'Seitstütz mit Bein', sanskrit: 'Vasisthasana-Variante', level: 'schwer',
    how: 'Im Seitstütz das obere Bein gestreckt nach oben heben und den oberen Arm zur Decke strecken.',
    figures: [{ h: [24, 61], n: [32, 64], p: [58, 74], a: [[31, 78, 30, 92], [33, 50, 34, 36]], l: [[78, 82, 96, 90], [76, 62, 94, 50]] }],
  },
  {
    name: 'Kopfstand', sanskrit: 'Sirsasana', level: 'schwer',
    how: 'Unterarme auf den Boden, Hände hinter dem Kopf verschränken, Kopf ablegen und die Beine senkrecht hochstrecken.',
    figures: [{ h: [60, 86], n: [60, 79], p: [60, 52], a: [[46, 90, 56, 88], [74, 90, 64, 88]], l: [[60, 34, 60, 16], [61, 34, 62, 16]] }],
  },
  {
    name: 'Rad', sanskrit: 'Urdhva Dhanurasana', level: 'schwer',
    how: 'Aus der Rückenlage Hände neben den Kopf, durch Arme und Beine den ganzen Körper zu einem Bogen hochdrücken.',
    figures: [{ h: [36, 72], n: [40, 64], p: [64, 56], a: [[35, 78, 30, 92], [33, 78, 27, 92]], l: [[78, 70, 84, 92], [76, 71, 81, 92]] }],
  },
];

export const duo = [
  {
    name: 'Doppelbaum', level: 'leicht',
    how: 'Nebeneinander stehen, beide im Baum auf dem inneren Bein, innere Hände über den Köpfen fassen.',
    figures: [
      { h: [60, 22], n: [60, 30], p: [60, 56], a: [[72, 20, 80, 10], [52, 18, 58, 6]], l: [[44, 68, 58, 64], [60, 74, 60, 92]] },
      { h: [100, 22], n: [100, 30], p: [100, 56], a: [[88, 20, 80, 10], [108, 18, 102, 6]], l: [[116, 68, 102, 64], [100, 74, 100, 92]] },
    ],
  },
  {
    name: 'Rücken-an-Rücken-Stuhl', level: 'leicht',
    how: 'Rücken an Rücken stellen, gegeneinander lehnen und gemeinsam runtergehen, bis die Oberschenkel waagerecht sind.',
    figures: [
      { h: [74, 32], n: [76, 40], p: [76, 66], a: [[66, 48, 56, 48], [67, 50, 57, 50]], l: [[56, 66, 56, 92], [57, 68, 58, 92]] },
      { h: [86, 32], n: [84, 40], p: [84, 66], a: [[94, 48, 104, 48], [93, 50, 103, 50]], l: [[104, 66, 104, 92], [103, 68, 102, 92]] },
    ],
  },
  {
    name: 'Tempel', level: 'leicht',
    how: 'Gegenüber stehen, nach vorne lehnen und die Handflächen über den Köpfen gegeneinander drücken – wie ein Torbogen.',
    figures: [
      { h: [66, 34], n: [64, 41], p: [48, 60], a: [[72, 30, 80, 22], [71, 32, 79, 24]], l: [[42, 76, 36, 92], [44, 77, 40, 92]] },
      { h: [94, 34], n: [96, 41], p: [112, 60], a: [[88, 30, 80, 22], [89, 32, 81, 24]], l: [[118, 76, 124, 92], [116, 77, 120, 92]] },
    ],
  },
  {
    name: 'Zwillingsdreieck', level: 'leicht',
    how: 'Rücken an Rücken breitbeinig stehen, beide kippen in die Gegenrichtung ins Dreieck, Arme senkrecht nach oben.',
    figures: [
      { h: [45, 44], n: [52, 48], p: [72, 62], a: [[50, 62, 48, 76], [53, 34, 54, 20]], l: [[57, 77, 40, 92], [77, 77, 79, 92]] },
      { h: [115, 44], n: [108, 48], p: [88, 62], a: [[110, 62, 112, 76], [107, 34, 106, 20]], l: [[103, 77, 120, 92], [83, 77, 81, 92]] },
    ],
  },
  {
    name: 'Doppel-Boot', level: 'mittel',
    how: 'Gegenüber auf den Po setzen, Fußsohlen aneinander, Beine gemeinsam hochstrecken und dabei balancieren.',
    figures: [
      { h: [22, 53], n: [27, 60], p: [42, 82], a: [[41, 62, 55, 63], [40, 64, 54, 65]], l: [[60, 68, 78, 54], [59, 70, 77, 56]] },
      { h: [138, 53], n: [133, 60], p: [118, 82], a: [[119, 62, 105, 63], [120, 64, 106, 65]], l: [[100, 68, 82, 54], [101, 70, 83, 56]] },
    ],
  },
  {
    name: 'Doppel-Tänzer', level: 'mittel',
    how: 'Gegenüber im Tänzer stehen, die vorderen Handflächen aneinander drücken und gemeinsam die Balance halten.',
    figures: [
      { h: [72, 30], n: [66, 37], p: [50, 56], a: [[74, 28, 80, 18], [47, 40, 30, 40]], l: [[50, 74, 50, 92], [32, 62, 28, 40]] },
      { h: [88, 30], n: [94, 37], p: [110, 56], a: [[86, 28, 80, 18], [113, 40, 130, 40]], l: [[110, 74, 110, 92], [128, 62, 132, 40]] },
    ],
  },
  {
    name: 'Doppel-Krieger III', level: 'mittel',
    how: 'Gegenüber im Krieger III, Hände in der Mitte fassen und euch gegenseitig halten – zusammen bildet ihr einen Tisch.',
    figures: [
      { h: [69, 52], n: [62, 56], p: [40, 56], a: [[71, 63, 79, 68], [70, 64, 78, 70]], l: [[41, 74, 42, 92], [22, 56, 6, 56]] },
      { h: [91, 52], n: [98, 56], p: [120, 56], a: [[89, 63, 81, 68], [90, 64, 82, 70]], l: [[119, 74, 118, 92], [138, 56, 154, 56]] },
    ],
  },
  {
    name: 'Doppelter Hund', level: 'schwer',
    how: 'Eine Person macht den herabschauenden Hund, die andere stellt die Hände davor ab und die Füße auf deren unteren Rücken.',
    figures: [
      { h: [60, 77], n: [64, 70], p: [84, 48], a: [[58, 81, 52, 92], [56, 81, 49, 92]], l: [[97, 70, 110, 92], [95, 70, 106, 92]] },
      { h: [41, 67], n: [46, 60], p: [60, 34], a: [[40, 76, 34, 92], [38, 76, 31, 92]], l: [[72, 40, 80, 48], [71, 42, 79, 50]] },
    ],
  },
  {
    name: 'Brettturm', level: 'schwer',
    how: 'Eine Person geht ins Brett, die andere fasst deren Fußgelenke und legt die eigenen Füße auf ihre Schultern.',
    figures: [
      { h: [46, 67], n: [54, 70], p: [82, 76], a: [[53, 81, 52, 92], [51, 81, 49, 92]], l: [[98, 83, 114, 90], [98, 84, 114, 91]] },
      { h: [120, 59], n: [112, 62], p: [84, 56], a: [[113, 74, 114, 87], [111, 74, 111, 87]], l: [[70, 60, 56, 66], [70, 62, 57, 68]] },
    ],
  },
  {
    name: 'Flieger', level: 'schwer',
    how: 'Eine Person liegt auf dem Rücken und stützt mit den Füßen die Hüfte der anderen, die waagerecht darüber schwebt.',
    figures: [
      { h: [50, 86], n: [58, 88], p: [86, 88], a: [[60, 74, 62, 60], [61, 75, 63, 61]], l: [[87, 70, 88, 52], [88, 70, 90, 53]] },
      { h: [58, 44], n: [66, 46], p: [90, 48], a: [[61, 54, 62, 60], [63, 55, 64, 61]], l: [[108, 46, 126, 44], [108, 48, 126, 47]] },
    ],
  },
];
