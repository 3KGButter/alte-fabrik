// Zusatz im Kraftwerk (Wunsch): zwei Bodenstrahler vor der Mecha-Bucht. Gleiche Strahler wie im Pförtnerhaus, Farben dieser Tageszeit.
// Nicht Teil der Übernahme aus dem Spiel – fürs Spiel muss interior.js sie zusätzlich zeichnen.
pal({"ぁ": "#825b5d", "あ": "#755155", "ぃ": "#8c5c42", "い": "#d9b6ab", "ぅ": "#b49997", "う": "#f7b862", "ぇ": "#8c604e", "え": "#94797a", "ぉ": "#f7cfa2", "お": "#8c6459", "か": "#6a464b", "が": "#785d5f", "き": "#64484a", "ぎ": "#573342", "く": "#542d38", "ぐ": "#613d42", "け": "#58353a", "げ": "#603c42"})
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
