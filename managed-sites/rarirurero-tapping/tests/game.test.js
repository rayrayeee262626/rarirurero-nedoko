import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config,randomPoints,Round} from '../dist/config.js';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
test('random points include 1 and 100',()=>{assert.equal(randomPoints(()=>0),1);assert.equal(randomPoints(()=>.999999),100);});
test('10 second deadline blocks late taps; finish is idempotent',()=>{const r=new Round();assert.equal(r.tap(0),0);r.start(500);assert.equal(r.tap(500,()=>0),1);assert.equal(r.tap(10499,()=>.9999),100);assert.equal(r.tap(10500),0);assert.equal(r.score,101);assert.equal(r.taps,2);assert.equal(r.remaining(12000),0);assert.equal(r.finish(),true);assert.equal(r.finish(),false);assert.equal(r.tap(510),0);});
test('all 10 remainders match the supplied manifest and PNG assets',()=>{const manifest=JSON.parse(readFileSync('dist/manifest.json','utf8'));assert.equal(config.forms.length,10);assert.deepEqual(config.forms,manifest);for(let i=0;i<10;i++){assert.equal(config.selectForm(100+i,config.forms),config.forms[i]);const data=readFileSync('dist/'+config.forms[i].image);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}assert.equal(config.selectForm(0,config.forms),config.forms[0]);assert.equal(config.selectForm(9,config.forms),config.forms[9]);assert.equal(config.selectForm(10,config.forms),config.forms[0]);assert.ok(existsSync('dist/'+config.normalImage));});
test('restart resets score and deadline',()=>{const r=new Round();r.start(0);r.tap(1);r.finish();r.start(20000);assert.equal(r.score,0);assert.equal(r.taps,0);assert.equal(r.remaining(20000),10000);});

test('only the ten new results and normal character remain in the release',()=>{assert.equal(readdirSync('dist/results').filter(n=>n.endsWith('.png')).length,10);assert.deepEqual(readdirSync('dist/assets'),['normal.png']);assert.ok(!existsSync('dist/results/001.png'));});
