// Zusatz im Kraftwerk (Wunsch): zwei Bodenstrahler vor der Mecha-Bucht. Gleiche Strahler wie im Pförtnerhaus, Farben dieser Tageszeit.
// Nicht Teil der Übernahme aus dem Spiel – fürs Spiel muss interior.js sie zusätzlich zeichnen.
pal({"ぁ": "#6e6166", "あ": "#5e545d", "ぃ": "#7b6246", "い": "#dad1c7", "ぅ": "#acadae", "う": "#ffd46d", "ぇ": "#7b6654", "え": "#85868a", "ぉ": "#ffefbc", "お": "#7b6c61", "か": "#504751", "が": "#626369", "き": "#49494f", "ぎ": "#393046", "く": "#362839", "ぐ": "#453c46", "け": "#3b323c", "げ": "#443a45"})
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
