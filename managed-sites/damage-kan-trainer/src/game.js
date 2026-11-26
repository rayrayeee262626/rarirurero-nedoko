import {calculate, Field, Generations, Move, Pokemon, toID} from '@smogon/calc';
import {roster, stats} from './roster.js';

export const QUESTION_COUNT = 10;
export const MAX_GUESS = 2000; // 200% or more, in tenths of a percentage point.
const champions = Generations.get(0);

export function combatant(set) {
  return new Pokemon(champions, set.name, {
    level: 50,
    nature: set.nature,
    ability: set.ability,
    abilityOn: set.ability === 'Intimidate',
    item: set.item,
    // For Champions, the package's legacy evs argument carries SP directly.
    evs: Object.fromEntries(stats.map((key, index) => [key, set.sp[index]])),
  });
}

export function resolve(attacker, defender, attack) {
  const user = combatant(attacker);
  const target = combatant(defender);
  const move = new Move(champions, attack.name);
  const spread = ['allAdjacent', 'allAdjacentFoes'].includes(move.target);
  const terrain = attacker.terrain ?? defender.terrain;
  const field = new Field({gameType: 'Doubles', terrain});
  const result = calculate(champions, user, target, move, field);
  const [min, max] = result.range();
  const hp = target.maxHP();
  return {
    id: [attacker.name, defender.name, attack.name].join('/'),
    attacker: {...attacker, types: user.types},
    defender: {...defender, types: target.types},
    move: {...attack, type: result.move.type, category: move.category, spread},
    terrain, hp, min, max, rolls: result.damage,
    low: Math.round(min * 1000 / hp), high: Math.round(max * 1000 / hp),
  };
}

export function createPool() {
  return roster.flatMap(attacker => roster.filter(defender => defender !== attacker)
    // Avoid the ordering dependency between Mega Evolution and Intimidate.
    .filter(defender => !(attacker.mega || defender.mega) ||
      ![attacker, defender].some(set => set.ability === 'Intimidate'))
    .flatMap(defender => attacker.moves.map(move => resolve(attacker, defender, move))));
}

export function createRound(pool, random = Math.random) {
  const candidates = [...pool];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const j = i + Math.floor(random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, QUESTION_COUNT);
}

export function grade(guess, {low, high}) {
  const error = guess === MAX_GUESS ? Math.max(guess - high, 0) : Math.max(low - guess, guess - high, 0);
  return {error, scoreTenths: Math.max(0, 1000 - error)};
}

export function validateRoster() {
  for (const set of roster) {
    if (set.sp.some(value => !Number.isInteger(value) || value < 0 || value > 32) ||
        set.sp.reduce((sum, value) => sum + value, 0) !== 66) {
      throw new Error(`Invalid SP: ${set.name}`);
    }
    for (const [data, names] of [
      [champions.species, [set.name]], [champions.abilities, [set.ability]],
      [champions.items, [set.item]], [champions.natures, [set.nature]],
      [champions.moves, set.moves.map(move => move.name)],
    ]) {
      for (const name of names) {
        if (!data.get(toID(name))) throw new Error(`Missing Champions data: ${name}`);
      }
    }
  }
}
