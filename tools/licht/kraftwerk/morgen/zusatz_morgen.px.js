// Zusatz im Kraftwerk (Wunsch): zwei Bodenstrahler vor der Mecha-Bucht. Gleiche Strahler wie im Pförtnerhaus, Farben dieser Tageszeit.
// Nicht Teil der Übernahme aus dem Spiel – fürs Spiel muss interior.js sie zusätzlich zeichnen.
pal({"ぁ": "#756368", "あ": "#66575f", "ぃ": "#816449", "い": "#dccec5", "ぅ": "#b0abad", "う": "#ffd06e", "ぇ": "#816856", "え": "#8b868a", "ぉ": "#ffebba", "お": "#816e63", "か": "#594a54", "が": "#69656a", "き": "#514c52", "ぎ": "#423449", "く": "#3f2d3d", "ぐ": "#4e4049", "け": "#44363f", "げ": "#4d3e48"})
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
