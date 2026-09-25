// Shore fishing: spots need real water and quiet surroundings; catches are
// saved, capped and eaten smallest-first; old saves stay valid.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Fishing,fishingSpot,FISH,FISH_LIMIT,CAST_TIME,BITE_WINDOW,pickFish} from '../game/src/fishing.js';
import {riverX,coastX,waterDistance} from '../game/src/geography.js';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';

const angler=(region,x,z,angle)=>({x,z,angle,hp:100,action:null,dodge:0});
const riverBank=()=>{const z=30,x=riverX(0,z)+4.1;return angler(0,x,z,-Math.PI/2);};
const step=(f,p,seconds,enemies=[])=>{for(let i=0;i<Math.round(seconds*60);i++)f.update(1/60,p,enemies);};

test('spots exist at rivers, the sea, the tarn and bridges, not in town',()=>{
 const bank=riverBank(),spot=fishingSpot(0,bank);assert(spot);assert(waterDistance(0,spot.x,spot.z)<0);
 assert(fishingSpot(2,angler(2,coastX(20)-3.4,20,Math.PI/2)),'sea shore');
 assert(fishingSpot(3,angler(3,47,38-10.2,0)),'tarn shore');
 assert(fishingSpot(0,angler(0,riverX(0,8)+1,8,Math.PI)),'bridge deck');
 assert.equal(fishingSpot(0,angler(0,0,8,0)),null,'market square');
 // Turning away still finds the water beside the angler.
 assert(fishingSpot(0,{...bank,angle:-Math.PI/2+1.2}));
});

test('enemies nearby or a fallen hero prevent a cast',()=>{
 const p=riverBank();assert.equal(fishingSpot(0,p,[{x:p.x+3,z:p.z,hp:10}]),null);assert(fishingSpot(0,p,[{x:p.x+3,z:p.z,hp:0}]));
 assert.equal(fishingSpot(0,{...p,hp:0}),null);
});

test('cast, wait, bite and hook lands a fish; late hooks reel in empty',()=>{
 const f=new Fishing(()=>.1),p=riverBank();assert(f.cast(0,p,[]));assert.equal(f.phase,'cast');assert(!f.cast(0,p,[]),'one line at a time');
 step(f,p,CAST_TIME+.05);assert.equal(f.phase,'wait');step(f,p,2.6);assert.equal(f.phase,'bite');
 const fish=f.hook();assert.equal(fish,FISH[0]);assert.equal(f.phase,'idle');assert.deepEqual(f.consume().map(e=>e.type),['cast','land','bite','catch']);
 assert(f.cast(0,p,[]));step(f,p,CAST_TIME+.05);assert.equal(f.hook(),null);assert.equal(f.phase,'idle');assert.equal(f.consume().at(-1).type,'reel');
});

test('a missed bite escapes and the float waits again',()=>{
 const f=new Fishing(()=>.5),p=riverBank();f.cast(0,p,[]);step(f,p,CAST_TIME+.05+2+.5*3.5+.05);assert.equal(f.phase,'bite');step(f,p,BITE_WINDOW+.05);assert.equal(f.phase,'wait');assert(f.consume().some(e=>e.type==='escape'));
});

test('moving, attacking, dodging or danger cancels the line',()=>{
 for(const change of [p=>{p.x+=.5;},p=>{p.action={kind:'basic'};},p=>{p.dodge=.2;}]){const f=new Fishing(()=>.2),p=riverBank();f.cast(0,p,[]);change(p);f.update(1/60,p,[]);assert.equal(f.phase,'idle');assert.equal(f.consume().at(-1).reason,'moved');}
 const f=new Fishing(()=>.2),p=riverBank();f.cast(0,p,[]);f.update(1/60,p,[{x:p.x+2,z:p.z,hp:20}]);assert.equal(f.consume().at(-1).reason,'danger');
});

test('rare fish are rare and every roll maps to a fish',()=>{
 assert.equal(pickFish(0),FISH[0]);assert.equal(pickFish(.7),FISH[1]);assert.equal(pickFish(.95),FISH[2]);assert.equal(pickFish(.9999),FISH[2]);
 assert(Math.abs(FISH.reduce((a,f)=>a+f.weight,0)-1)<1e-9);
});

test('the creel saves, caps and heals smallest fish first',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);assert.deepEqual(p.data.fish,[0,0,0]);
 assert(p.addFish(FISH[2]));assert(p.addFish(FISH[0]));assert.deepEqual(p.data.fish,[1,0,1]);
 m.player.hp=10;const eaten=p.eatFish(m);assert.equal(eaten,FISH[0]);assert.equal(m.player.hp,10+FISH[0].heal);assert.equal(p.eatFish(m),false,'short cooldown');
 p.tick(5);m.player.hp=m.player.maxHp;assert.equal(p.eatFish(m),false,'full health keeps the fish');
 m.player.hp=1;assert.equal(p.eatFish(m),FISH[2]);assert.equal(p.fishCount,0);
 for(let i=0;i<FISH_LIMIT;i++)assert(p.addFish(FISH[1]));assert.equal(p.addFish(FISH[1]),false);assert.equal(p.fishCount,FISH_LIMIT);
 const save=p.snapshot(m);assert(validSave(save));assert.deepEqual(new Progression(save).data.fish,[0,FISH_LIMIT,0]);
});

test('older saves without a creel load; malformed creels are rejected',()=>{
 const m=new Combat(),p=new Progression();p.restore(m);const save=p.snapshot(m);
 const old=structuredClone(save);delete old.fish;assert(validSave(old));assert.deepEqual(new Progression(old).data.fish,[0,0,0]);
 for(const fish of [[1,2],[1,2,-1],[1,2,99],'3',[1,2,1.5]])assert.equal(validSave({...save,fish}),false,JSON.stringify(fish));
});
