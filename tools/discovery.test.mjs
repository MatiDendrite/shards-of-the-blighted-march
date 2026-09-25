// Discoverables pay out once, persist in the save, reset with a new
// expedition, and a shrine blessing raises damage for 30 seconds only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';
import {sceneryLayout} from '../game/src/region-layout.js';

const finds=region=>sceneryLayout(region).props.filter(p=>p.id);
test('every region hides chests, herbs, ore, a shrine and barrels with stable ids',()=>{
 for(const r of [0,1,2,3]){const f=finds(r),kinds=new Set(f.map(p=>p.kind));for(const k of ['chest','herb','ore','shrine','barrel'])assert(kinds.has(k),`region ${r} lacks ${k}`);assert.equal(new Set(f.map(p=>p.id)).size,f.length);assert.deepEqual(finds(r).map(p=>p.id),f.map(p=>p.id));}
});
test('rewards are paid once and saved; a new expedition resets them',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);const f=finds(0),chest=f.find(x=>x.kind==='chest'),ore=f.find(x=>x.kind==='ore'),herb=f.find(x=>x.kind==='herb'),barrel=f.find(x=>x.kind==='barrel');
 const gold=p.data.gold,oreBefore=p.data.ore;assert.equal(p.discover(chest,m,0).kind,'chest');assert(p.data.gold>gold&&p.data.ore>oreBefore);assert.equal(p.discover(chest,m,0),false,'a chest opens once');
 assert.equal(p.discover(ore,m,0).kind,'ore');assert.equal(p.discover(barrel,m,0).kind,'barrel');m.player.hp=10;assert.equal(p.discover(herb,m,0).kind,'herb');assert.equal(m.player.hp,40);
 const save=p.snapshot(m);assert(validSave(save));assert.deepEqual(new Progression(save).data.found,p.data.found);
 const old=structuredClone(save);delete old.found;assert(validSave(old));assert.equal(validSave({...save,found:['0-chest-1','bad id']}),false);
 p.beginJourney(m);assert.deepEqual(p.data.found,[]);
});
test('shrines bless repeatedly; the blessing adds 20% damage and fades',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);const shrine=finds(0).find(x=>x.kind==='shrine');m.player.hp=5;m.player.stamina=0;
 assert.equal(p.discover(shrine,m,0).kind,'shrine');assert.equal(m.player.hp,m.player.maxHp);assert.equal(m.player.stamina,100);assert.equal(p.discover(shrine,m,0).kind,'shrine');assert(!p.data.found.includes(shrine.id));
 m.enemies=[];m.startAttack('basic',0);assert(Math.abs(m.player.action.damage/(22+(m.player.damageBonus||0))-1.2)<1e-9);
 for(let i=0;i<60*31;i++)m.update(1/60);assert.equal(m.player.blessed,0);
});
