// Species and moves selected using the October 2026 Showdown Reg M-C usage tables.
// Each spread lists HP, Attack, Defense, Special Attack, Special Defense, Speed.
export const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const statLabels = ['HP', '攻撃', '防御', '特攻', '特防', '素早さ'];

const moves = {
  'Wood Hammer': 'ウッドハンマー', 'U-turn': 'とんぼがえり',
  'Close Combat': 'インファイト', 'Dire Claw': 'フェイタルクロー',
  'Flare Blitz': 'フレアドライブ', 'Darkest Lariat': 'DDラリアット',
  Psychic: 'サイコキネシス', 'Kowtow Cleave': 'ドゲザン',
  'Iron Head': 'アイアンヘッド', 'Flash Cannon': 'ラスターカノン',
  'Dragon Pulse': 'りゅうのはどう', 'Make It Rain': 'ゴールドラッシュ',
  'Shadow Ball': 'シャドーボール', Earthquake: 'じしん', 'Dragon Claw': 'ドラゴンクロー',
  'Hyper Voice': 'ハイパーボイス', 'Draco Meteor': 'りゅうせいぐん',
  Moonblast: 'ムーンフォース',
};

const natures = {
  Adamant: 'いじっぱり', Jolly: 'ようき', Timid: 'おくびょう',
  Modest: 'ひかえめ', Careful: 'しんちょう', Calm: 'おだやか',
  Sassy: 'なまいき', Bold: 'ずぶとい',
};

export const types = {
  Normal: 'ノーマル', Fire: 'ほのお', Water: 'みず', Electric: 'でんき',
  Grass: 'くさ', Ice: 'こおり', Fighting: 'かくとう', Poison: 'どく',
  Ground: 'じめん', Flying: 'ひこう', Psychic: 'エスパー', Bug: 'むし',
  Rock: 'いわ', Ghost: 'ゴースト', Dragon: 'ドラゴン', Dark: 'あく',
  Steel: 'はがね', Fairy: 'フェアリー',
};

// Terrain surges and entry effects are applied before the attack.
// These cases assume the two displayed Pokémon have just entered with their items.
export const roster = [
  ['Rillaboom', 'ゴリランダー', 'Grassy Surge', 'グラスメイカー', 'Miracle Seed', 'きせきのタネ', 'Adamant', [32,32,0,0,2,0], ['Wood Hammer','U-turn'], 'Grassy'],
  ['Sneasler', 'オオニューラ', 'Unburden', 'かるわざ', 'Life Orb', 'いのちのたま', 'Jolly', [2,32,0,0,0,32], ['Close Combat','Dire Claw']],
  ['Incineroar', 'ガオガエン', 'Intimidate', 'いかく', 'Chople Berry', 'ヨプのみ', 'Careful', [32,0,14,0,20,0], ['Flare Blitz','Darkest Lariat']],
  ['Kingambit', 'ドドゲザン', 'Defiant', 'まけんき', 'Black Glasses', 'くろいメガネ', 'Adamant', [32,32,0,0,2,0], ['Kowtow Cleave','Iron Head']],
  ['Archaludon', 'ブリジュラス', 'Stamina', 'じきゅうりょく', 'Leftovers', 'たべのこし', 'Calm', [32,0,0,2,32,0], ['Flash Cannon','Dragon Pulse']],
  ['Farigiraf', 'リキキリン', 'Armor Tail', 'テイルアーマー', 'Sitrus Berry', 'オボンのみ', 'Sassy', [32,0,0,2,32,0], ['Psychic','Hyper Voice']],
  ['Gholdengo', 'サーフゴー', 'Good as Gold', 'おうごんのからだ', 'Life Orb', 'いのちのたま', 'Modest', [2,0,0,32,0,32], ['Make It Rain','Shadow Ball']],
  ['Garchomp', 'ガブリアス', 'Rough Skin', 'さめはだ', 'Choice Scarf', 'こだわりスカーフ', 'Jolly', [2,32,0,0,0,32], ['Earthquake','Dragon Claw']],
  ['Salamence-Mega', 'メガボーマンダ', 'Aerilate', 'スカイスキン', 'Salamencite', 'ボーマンダナイト', 'Timid', [2,0,0,32,0,32], ['Hyper Voice','Draco Meteor']],
  ['Gardevoir-Mega', 'メガサーナイト', 'Pixilate', 'フェアリースキン', 'Gardevoirite', 'サーナイトナイト', 'Modest', [32,0,2,32,0,0], ['Hyper Voice','Moonblast']],
  ['Whimsicott', 'エルフーン', 'Prankster', 'いたずらごころ', 'Occa Berry', 'オッカのみ', 'Timid', [2,0,0,32,0,32], ['Moonblast']],
  ['Sylveon', 'ニンフィア', 'Pixilate', 'フェアリースキン', 'Fairy Feather', 'ようせいのハネ', 'Modest', [32,0,2,32,0,0], ['Hyper Voice','Moonblast']],
].map(([name, label, ability, abilityLabel, item, itemLabel, nature, sp, attacks, terrain]) => ({
  name, label, ability, abilityLabel, item, itemLabel, nature, natureLabel: natures[nature],
  sp, terrain, mega: name.endsWith('-Mega'),
  moves: attacks.map(name => ({name, label: moves[name]})),
}));
