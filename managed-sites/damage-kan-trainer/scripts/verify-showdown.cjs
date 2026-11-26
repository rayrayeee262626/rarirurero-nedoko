// Optional cross-check against a separate Pokémon Showdown source checkout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {transformSync} = require('esbuild');

if (!process.argv[2]) throw new Error('Usage: node scripts/verify-showdown.cjs <Showdown checkout>');
const checkout = path.resolve(process.argv[2]);
require.extensions['.ts'] = (module, file) => {
  module._compile(transformSync(fs.readFileSync(file, 'utf8'), {
    loader: 'ts', format: 'cjs', sourcefile: file,
  }).code, file);
};

const {Battle} = require(path.join(checkout, 'sim/battle.ts'));
const {TeamValidator} = require(path.join(checkout, 'sim/team-validator.ts'));

function simSet(set, stats) {
  return {
    species: set.name,
    nature: set.nature,
    ability: set.ability,
    item: set.item,
    level: 50,
    moves: set.moves.map(move => move.name),
    evs: Object.fromEntries(stats.map((key, i) => [key, set.sp[i]])),
    ivs: Object.fromEntries(stats.map(key => [key, 31])),
  };
}

function simulate(question, multiplier, stats) {
  const battle = new Battle({formatid: 'gen9championsdoublescustomgame'});
  const spare = {species: 'Magikarp', moves: ['Splash'], level: 50};
  battle.setPlayer('p1', {team: [simSet(question.attacker, stats), spare]});
  battle.setPlayer('p2', {team: [simSet(question.defender, stats), spare]});
  if (battle.requestState === 'teampreview') battle.makeChoices('team 12', 'team 12');
  try {
    const attacker = battle.p1.active[0];
    const target = battle.p2.active[0];
    assert.equal(target.maxhp, question.hp, question.id);
    const move = battle.dex.getActiveMove(question.move.name);
    battle.runEvent('ModifyType', attacker, target, move, move);
    assert.equal(move.type, question.move.type, question.id);
    const targets = move.target === 'allAdjacent' || move.target === 'allAdjacentFoes';
    assert.equal(targets, question.move.spread, question.id);
    move.spreadHit = targets;
    move.willCrit = false;
    battle.randomizer = base => Math.floor(base * multiplier / 100);
    if (!battle.runEvent('TryHit', target, attacker, move)) return 0;
    return battle.actions.getDamage(attacker, target, move, true) || 0;
  } finally {
    battle.destroy();
  }
}

async function verify() {
  const {createPool} = await import('../src/game.js');
  const {roster, stats} = await import('../src/roster.js');
  const validator = TeamValidator.get('gen9championsvgc2026regmc');
  for (const set of roster) {
    assert.equal(validator.validateSet(simSet(set, stats), {}), null, set.name);
  }
  const pool = createPool();
  for (const question of pool) {
    const expected = Array.isArray(question.rolls) ? question.rolls : Array(16).fill(question.rolls);
    const observed = Array.from({length: 16}, (_, i) => simulate(question, i + 85, stats));
    assert.deepEqual(observed, expected, question.id);
  }
  console.log(`M-C set legality: ${roster.length}/${roster.length}. Damage rolls: ${pool.length * 16}/${pool.length * 16}.`);
}

verify().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
