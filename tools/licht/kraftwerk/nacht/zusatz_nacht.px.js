// Zusatz im Kraftwerk (Wunsch): zwei Bodenstrahler vor der Mecha-Bucht. Gleiche Strahler wie im Pförtnerhaus, Farben dieser Tageszeit.
// Nicht Teil der Übernahme aus dem Spiel – fürs Spiel muss interior.js sie zusätzlich zeichnen.
pal({"ぁ": "#3d3a60", "あ": "#36335c", "ぃ": "#443a50", "い": "#727190", "ぅ": "#5c5f84", "う": "#847263", "ぇ": "#443c57", "え": "#494c72", "ぉ": "#84808a", "お": "#443f5e", "か": "#2f2d56", "が": "#373b62", "き": "#2b2e55", "ぎ": "#232250", "く": "#221e4a", "ぐ": "#292850", "け": "#24234b", "げ": "#292750"})
const STRAHLER_X = [268, 372], STRAHLER_Y = 175   // linke obere Ecke der beiden Strahler (rechter gespiegelt)
const BODENSTRAHLER = layer("bodenstrahler", grid(STRAHLER_X[0], STRAHLER_Y, `
..ぁぁあぃ..
.ぁいいぅうぇ.
.あぅぅえうぉお
.かえぅがうぇ.
.かええきぎく.
..ぐきけく..
.げけきけげけ.
げがきがきがきけ
.げけげけげけ.`), grid(STRAHLER_X[1], STRAHLER_Y, `
..ぃあぁぁ..
.ぇうぅいいぁ.
おぉうえぅぅあ.
.ぇうがぅえか.
.くぎきええか.
..くけきぐ..
.けげけきけげ.
けきがきがきがげ
.けげけげけげ.`))
const STRAHLER_KEYS = "うぉ"   // Strahlerkopf (Glühbirne) – für den Schein
