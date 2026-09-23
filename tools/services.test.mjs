import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave,sellPrice,SMITH} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {NPCS,EXIT,RETURN,portalsFor} from '../game/src/world-map.js';
import {mapLocations} from '../game/src/cartography.js';
const merchant=NPCS.find(n=>n.id==='merchant');
const setup=()=>{const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);return{m,p,c};};
function clear({m,p,c}){m.damageShard(999);for(let n=0;n<100;n++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();}
test('merchant pays the exact quoted price once; sale persists without changing other equipment',()=>{
 const {m,p}=setup(),item=p.makeItem('sword','rare',2);item.upgrade=2;p.data.items.push(item);const loadout={...p.data.loadout},gear=structuredClone(p.data.items.slice(0,4)),gold=p.data.gold;
 assert(!p.sell(item.id,m.player));Object.assign(m.player,merchant);assert(p.sell(item.id,m.player));assert.equal(p.data.gold,gold+sellPrice(item));assert(!p.sell(item.id,m.player));assert.deepEqual(p.data.loadout,loadout);assert.deepEqual(p.data.items,gear);
 const saved=p.snapshot(m);assert(validSave(saved));const restored=new Progression(saved);restored.restore(m);assert.equal(restored.data.gold,p.data.gold);assert(!restored.data.items.some(i=>i.id===item.id));
});
test('merchant protects all four loadout slots, dead players, invalid IDs and full gold balance',()=>{
 const {m,p}=setup();Object.assign(m.player,merchant);for(const id of Object.values(p.data.loadout))assert(!p.sell(id,m.player));assert(!p.sell(999,m.player));
 const item=p.makeItem('armor','uncommon');p.data.items.push(item);const before=structuredClone(p.data);m.player.hp=0;assert(!p.sell(item.id,m.player));assert.deepEqual(p.data,before);m.player.hp=120;p.data.gold=1000000;assert(!p.sell(item.id,m.player));assert(p.data.items.includes(item));
});
test('every settlement trades; forging still requires Borin and pays its resource costs',()=>{
 const {m,p,c}=setup();for(let region=0;region<4;region++){c.data.region=region;Object.assign(m.player,merchant);const item=p.makeItem('axe','common');p.data.items.push(item);assert(p.sell(item.id,m.player));}
 c.data.region=0;Object.assign(m.player,SMITH);const item=p.data.items[0],gold=p.data.gold,ore=p.data.ore;assert(p.upgrade(item.id,m.player));assert.equal(item.upgrade,1);assert.equal(p.data.gold,gold-40);assert.equal(p.data.ore,ore-1);
});
test('an unlocked road cannot teleport from town; only the matching physical portal can travel',()=>{
 const s=setup();Object.assign(s.m.player,EXIT);assert(!s.c.travel(1));Object.assign(s.m.player,{x:0,z:11});clear(s);assert(s.c.safe);assert(!s.c.travel(1));
 Object.assign(s.m.player,{x:EXIT.x+3,z:EXIT.z});assert(!s.c.travel(1));Object.assign(s.m.player,EXIT);assert(!s.c.travel(2));assert(!s.c.travel(0));s.m.player.action={};assert(!s.c.travel(1));s.m.player.action=null;s.m.player.dodge=.1;assert(!s.c.travel(1));s.m.player.dodge=0;assert(s.c.travel(1));assert(validSave(s.p.snapshot(s.m)));
 assert(!s.c.travel(0));Object.assign(s.m.player,RETURN);assert(s.c.nearPortal);assert(!s.c.nearGate);assert(s.c.travel(0));assert(s.m.complete);assert(validSave(s.p.snapshot(s.m)));
});
test('an unfinished region permits returning, but not with an enemy beside its portal',()=>{
 const s=setup();clear(s);Object.assign(s.m.player,EXIT);assert(s.c.travel(1));Object.assign(s.m.player,RETURN);const enemy=s.m.enemies[0],original={x:enemy.x,z:enemy.z};Object.assign(enemy,{x:RETURN.x+2,z:RETURN.z});assert(!s.c.travel(0));Object.assign(enemy,original);s.m.player.hp=0;assert(!s.c.travel(0));s.m.player.hp=120;assert(s.c.travel(0));assert(!s.c.data.cleared[1]);
});
test('atlas portal entries exactly match physical destinations, including the final return route',()=>{
 for(let region=0;region<4;region++){const portals=portalsFor(region),locations=mapLocations(region);assert.equal(portals.length,region===0||region===3?1:2);for(const portal of portals){const entry=locations.find(n=>n.id===portal.id);assert(entry);assert.equal(entry.x,portal.x);assert.equal(entry.z,portal.z);assert.equal(entry.destination,portal.destination);}}
 assert.equal(portalsFor(3)[0].id,'return');assert.equal(portalsFor(0)[0].id,'exit');
});
