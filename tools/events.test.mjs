// Bandit camps and the roaming elite are optional: they pay out at once,
// never count as quest guardians, stay out of the save and return later.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';
import {CAMPS,CAMP_IDS,ELITE_ID,hasElite} from '../game/src/camps.js';

for(const region of [0,1,2,3])test(`region ${region}: a camp${hasElite(region)?' and an elite':''} spawn as optional foes`,()=>{
 const m=new Combat();m.reset(region);const extra=m.enemies.filter(e=>e.optional);
 assert.deepEqual(extra.map(e=>e.id).sort((a,b)=>a-b),[...CAMP_IDS,...(hasElite(region)?[ELITE_ID]:[])]);
 assert.equal(m.guardians.length,region===3?1:20);assert(extra.every(e=>Math.hypot(e.x-CAMPS[region].x,e.z-CAMPS[region].z)<4||e.elite));
});
test('optional kills pay out, never claim, never count, and respawn once the hero is away',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);const elite=m.enemies.find(e=>e.elite),guard=m.enemies.find(e=>e.id===CAMP_IDS[0]);
 const gold=p.data.gold,items=p.data.items.length;m.damageEnemy(elite,elite.maxHp);m.damageEnemy(guard,guard.maxHp);p.events(m.consume(),m);
 assert.equal(m.kills,0);assert.deepEqual(p.data.claimed,[]);assert(p.data.gold>=gold+126);assert.equal(p.data.items.length,items+1);assert(validSave(p.snapshot(m)));
 Object.assign(m.player,{x:guard.homeX,z:guard.homeZ,hp:1e7,maxHp:1e7});for(let i=0;i<60*160;i++){for(const e of m.enemies)if(!e.optional){e.phase='recovery';e.timer=100;}m.update(1/60);if(m.dead)break;}
 assert.equal(guard.hp,0,'no respawn while the hero stands in the camp');
 m.player.hp=m.player.maxHp;m.player.x=0;m.player.z=11;m.update(1/60);assert.equal(guard.hp,guard.maxHp,'respawns once the hero is away');
});
