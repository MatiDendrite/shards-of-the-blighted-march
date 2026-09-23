import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {inTown,NPCS} from '../game/src/world-map.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
const step=(m,t)=>{for(let i=0;i<t*60;i++)m.update(1/60);};
test('legacy active and archived loot relocates once, preserving all rewards',()=>{
 const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);m.damageShard(999);step(m,1.6);for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();c.travel(1);m.damageEnemy(m.enemies[0],999);p.events(m.consume(),m);
 const old=p.snapshot(m);delete old.layoutVersion;for(const d of [...old.drops,...old.campaign.regions[0].drops]){d.x=-12;d.z=-3;}
 assert(validSave(old));const copy=structuredClone(old),r=new Progression(old);r.restore(m);const next=r.snapshot(m);assert.equal(next.layoutVersion,2);assert(validSave(next));assert.deepEqual(old,copy);
 for(const [region,drops] of [[1,next.drops],[0,next.campaign.regions[0].drops]]){const layout=sceneryLayout(region);for(const d of drops){assert(inTown(d.x,d.z));assert(canStandIn(layout.colliders,d.x,d.z));}}
 assert.deepEqual(next.items,old.items);assert.deepEqual(next.claimed,old.claimed);assert.equal(next.gold,old.gold);assert.deepEqual(next.campaign.cleared,old.campaign.cleared);
 assert.deepEqual(next.drops.map(({x,z,...d})=>d),old.drops.map(({x,z,...d})=>d));const again=new Progression(next);again.restore(m);assert.deepEqual(again.snapshot(m),next);
});
test('expanded save accepts distant drops and rejects positions beyond the map',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);m.damageEnemy(m.enemies[0],999);p.events(m.consume(),m);const s=p.snapshot(m);s.drops[0].x=58;s.drops[0].z=-57;assert(validSave(s));s.drops[0].x=61;assert(!validSave(s));
});
test('merchant requires proximity, funds and capacity, across all regions',()=>{
 const p=new Progression(),m=new Combat(),n=NPCS.find(n=>n.id==='merchant');assert(!p.buySupplies(m.player));Object.assign(m.player,n);assert(p.buySupplies(m.player));assert.equal(p.data.gold,35);assert.equal(p.data.potions,4);p.data.potions=20;assert(!p.buySupplies(m.player));p.data.potions=4;p.data.gold=24;assert(!p.buySupplies(m.player));p.data.gold=30;m.player.hp=0;assert(!p.buySupplies(m.player));
});
test('guardians cannot follow the player into the central sanctuary',()=>{
 const m=new Combat();m.enemies=[];m.spawn('wolf',20,8);m.player.x=18;m.player.z=8;const e=m.enemies[0];step(m,8);assert(!inTown(e.x,e.z));assert.equal(m.player.hp,120);assert.equal(e.phase,'idle');m.move(e,-4,0);assert(!inTown(e.x,e.z));
});
