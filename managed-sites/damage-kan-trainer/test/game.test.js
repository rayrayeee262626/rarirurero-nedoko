import assert from 'node:assert/strict';
import {test} from 'node:test';
import {combatant, createPool, createRound, grade, MAX_GUESS, validateRoster} from '../src/game.js';
import {roster} from '../src/roster.js';

const pool = createPool();

test('Champions data and stat points produce the expected stats', () => {
  validateRoster();
  assert.deepEqual(combatant(roster[0]).stats, {hp: 207, atk: 194, def: 110, spa: 72, spd: 92, spe: 105});
});

test('All question ranges are well formed', () => {
  assert.equal(pool.length, 245);
  assert.equal(new Set(pool.map(q => q.id)).size, pool.length);
  for (const question of pool) {
    assert.ok(question.hp > 0 && question.low >= 0 && question.high >= question.low, question.id);
    if (Array.isArray(question.rolls)) {
      assert.equal(question.rolls.length, 16, question.id);
      assert.equal(question.min, Math.min(...question.rolls), question.id);
      assert.equal(question.max, Math.max(...question.rolls), question.id);
    } else {
      assert.equal(question.min, 0, question.id);
      assert.equal(question.max, 0, question.id);
    }
  }
});

test('Damage reference cases match the Champions battle simulator', () => {
  const references = [
    ['Sneasler/Incineroar/Close Combat', 202, 87, 103, 'Fighting'],
    ['Gholdengo/Sylveon/Make It Rain', 202, 179, 213, 'Steel'],
    ['Garchomp/Farigiraf/Earthquake', 227, 84, 100, 'Ground'],
    ['Gardevoir-Mega/Garchomp/Hyper Voice', 185, 206, 246, 'Fairy'],
    ['Rillaboom/Incineroar/Wood Hammer', 202, 54, 65, 'Grass'],
    ['Kingambit/Incineroar/Kowtow Cleave', 202, 72, 84, 'Dark'],
    ['Gholdengo/Farigiraf/Shadow Ball', 227, 0, 0, 'Ghost'],
  ];
  for (const [id, hp, min, max, type] of references) {
    const question = pool.find(q => q.id === id);
    assert.deepEqual([question.hp, question.min, question.max, question.move.type], [hp, min, max, type], id);
  }
});

test('Each round draws ten distinct questions without modifying the pool', () => {
  for (const random of [() => 0, () => 0.999, Math.random]) {
    const round = createRound(pool, random);
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map(q => q.id)).size, 10);
  }
  assert.equal(pool.length, 245);
});

test('Scoring includes both endpoints and penalizes distance in either direction', () => {
  const range = {low: 401, high: 500};
  for (const value of [401, 450, 500]) assert.deepEqual(grade(value, range), {error: 0, scoreTenths: 1000});
  assert.deepEqual(grade(400, range), {error: 1, scoreTenths: 999});
  assert.deepEqual(grade(506, range), {error: 6, scoreTenths: 994});
  assert.deepEqual(grade(1000, range), {error: 500, scoreTenths: 500});
  assert.deepEqual(grade(1501, range), {error: 1001, scoreTenths: 0});
  assert.deepEqual(grade(0, {low: 0, high: 0}), {error: 0, scoreTenths: 1000});
});

test('The slider maximum represents the range from 200% upward', () => {
  for (const range of [{low: 1900, high: 2000}, {low: 2100, high: 2500}]) {
    assert.deepEqual(grade(MAX_GUESS, range), {error: 0, scoreTenths: 1000});
  }
  assert.deepEqual(grade(MAX_GUESS, {low: 1700, high: 1977}), {error: 23, scoreTenths: 977});
  assert.deepEqual(grade(1999, {low: 2100, high: 2500}), {error: 101, scoreTenths: 899});
});
