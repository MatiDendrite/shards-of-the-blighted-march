import {FISH,FISH_LIMIT} from './fishing.js';
import { encounterComplete, emptyEncounter, freshCampaign, guardianCount, FIELD_PATROLS, ENCOUNTER_VERSION } from './campaign-data.js';
import {WORLD_LIMIT,NPCS} from './world-map.js';
import {sceneryLayout,canStandIn} from './region-layout.js';
import {CLASS_IDS,classInfo} from './class-data.js';
export const SAVE_KEY='shards.journey.v1';
export const KINDS=['sword','axe','spear','armor'];
export const RARITIES=['common','uncommon','rare'];
const NAMES={sword:'Iron Sword',axe:'Bearded Axe',spear:'Ash Spear',armor:'Marchguard Mail'};
export const SMITH={x:-3.8,z:13};
export const xpNeeded=level=>100+(level-1)*60;
export const itemPower=item=>(item?.power||0)+(item?.upgrade||0)*(item?.kind==='armor'?2:3);
export const itemName=item=>`${item.rarity==='rare'?'Runed ':item.rarity==='uncommon'?'Tempered ':''}${NAMES[item.kind]}${item.upgrade?` +${item.upgrade}`:''}`;
export const sellPrice=item=>18+RARITIES.indexOf(item.rarity)*12+item.power*3+item.upgrade*18;
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function validItem(i){return i&&integer(i.id,1,1000000)&&KINDS.includes(i.kind)&&RARITIES.includes(i.rarity)&&integer(i.power,0,30)&&integer(i.upgrade,0,3);}
export function validEncounter(s,region=0,version=ENCOUNTER_VERSION){
 const count=guardianCount(region,version);
 if(!s||!Array.isArray(s.claimed)||s.claimed.length>count||!s.claimed.every(i=>integer(i,1,count))||new Set(s.claimed).size!==s.claimed.length)return false;
 if(!Array.isArray(s.drops)||s.drops.length>count+1||!s.drops.every(d=>d&&typeof d.id==='string'&&d.id.length<40&&Number.isFinite(d.x)&&Math.abs(d.x)<=WORLD_LIMIT&&Number.isFinite(d.z)&&Math.abs(d.z)<=WORLD_LIMIT&&integer(d.gold,0,200)&&integer(d.ore,0,10)&&(!d.item||validItem(d.item))))return false;
 const w=s.world;return !!w&&Number.isFinite(w.shardHp)&&w.shardHp>=0&&w.shardHp<=250&&typeof w.exploded==='boolean'&&(!w.exploded||w.shardHp===0)&&typeof s.shardReward==='boolean'&&(region!==3||(w.exploded&&w.shardHp===0));
}
export function validSave(s){
 if(s?.classId!==undefined&&!CLASS_IDS.includes(s.classId))return false;
 if(s?.layoutVersion!==undefined&&s.layoutVersion!==2)return false;
 if(s?.geographyVersion!==undefined&&s.geographyVersion!==1)return false;
 if(s?.found!==undefined&&!(Array.isArray(s.found)&&s.found.length<=600&&s.found.every(id=>typeof id==='string'&&/^[0-3]-[a-z]+-\d{1,3}$/.test(id))))return false;
 if(s?.fish!==undefined&&!(Array.isArray(s.fish)&&s.fish.length===FISH.length&&s.fish.every(n=>integer(n,0,FISH_LIMIT))))return false;
 const encounterVersion=s?.encounterVersion===undefined?1:s.encounterVersion;if(![1,2,ENCOUNTER_VERSION].includes(encounterVersion))return false;
 if(!s||s.version!==1||!integer(s.level,1,8)||!integer(s.xp,0,1000)||!integer(s.gold,0,1000000)||!integer(s.ore,0,100000)||!integer(s.potions,0,20)||!integer(s.serial,5,1000000)||!integer(s.run,1,100000)||!integer(s.deaths,0,100000))return false;
 if(!Array.isArray(s.items)||s.items.length>24||s.items.length<4||!s.items.every(validItem)||new Set(s.items.map(i=>i.id)).size!==s.items.length)return false;
 if(!s.loadout||!KINDS.every(k=>s.items.some(i=>i.id===s.loadout[k]&&i.kind===k)))return false;
 if(!KINDS.slice(0,3).includes(s.weapon))return false;
 const c=s.campaign;
 if(c!==undefined){
  if(!c||!integer(c.region,0,3)||!Array.isArray(c.cleared)||c.cleared.length!==4||!c.cleared.every(v=>typeof v==='boolean')||!Array.isArray(c.regions)||c.regions.length!==4||c.regions[c.region]!==null)return false;
  for(let i=0;i<4;i++){const state=i===c.region?s:c.regions[i];if(state!==null&&!validEncounter(state,i,encounterVersion))return false;if((c.cleared[i]||state!==null)&&i>0&&!c.cleared[i-1])return false;if(c.cleared[i]&&(!state||!encounterComplete(state,i,encounterVersion)))return false;}
 }
 if(!validEncounter(s,c?.region||0,encounterVersion))return false;
 const drops=[...s.drops,...(c?c.regions.flatMap(r=>r?.drops||[]):[])],allIds=[...s.items.map(i=>i.id),...drops.flatMap(d=>d.item?[d.item.id]:[])];
 return new Set(allIds).size===allIds.length&&allIds.every(id=>id<s.serial)&&new Set(drops.map(d=>d.id)).size===drops.length;
}
export function saveStore(storage){let blocked=false,status='Not saved yet';return{
 get status(){return status;},
 load(){let raw;try{raw=storage.getItem(SAVE_KEY);}catch{status='Storage unavailable · not saved';return null;}if(raw===null)return null;try{const s=JSON.parse(raw);if(!validSave(s))throw Error('Invalid save');status='Journey restored';return s;}catch{blocked=true;status='Save unreadable · original kept';return null;}},
 write(data){if(blocked)return false;try{storage.setItem(SAVE_KEY,JSON.stringify(data));status='Saved on this browser';return true;}catch{status='Storage unavailable · not saved';return false;}},
 allowNew(){blocked=false;},
};}
export class Progression{
 constructor(saved=null){this.data=saved?structuredClone(saved):{version:1,encounterVersion:ENCOUNTER_VERSION,geographyVersion:1,level:1,xp:0,gold:60,ore:2,potions:3,serial:5,run:1,deaths:0,weapon:'sword',items:KINDS.map((kind,n)=>({id:n+1,kind,rarity:'common',power:kind==='armor'?2:0,upgrade:0})),loadout:{sword:1,axe:2,spear:3,armor:4},claimed:[],drops:[],shardReward:false,world:{shardHp:250,exploded:false}};
  const d=this.data;if((d.encounterVersion??1)<ENCOUNTER_VERSION){
   // Honour previously completed roads without granting retroactive loot or XP.
   // In-progress encounters keep their kills and gain the new living patrols.
   const oldVersion=d.encounterVersion??1;
   const migrate=(state,region)=>{if(state&&region!==3&&encounterComplete(state,region,oldVersion))state.claimed.push(...FIELD_PATROLS.filter(e=>e.id>guardianCount(region,oldVersion)).map(e=>e.id));};
   migrate(d,d.campaign?.region||0);d.campaign?.regions.forEach((state,region)=>migrate(state,region));d.encounterVersion=ENCOUNTER_VERSION;
  }
  d.classId??='warrior';d.fish??=FISH.map(()=>0);d.found??=[];this.fishCD=0;this.revision=0;this.messages=[];this.potionCD=0;
 }
 touch(message){this.revision++;if(message)this.messages.push(message);}
 equipped(kind){return this.data.items.find(i=>i.id===this.data.loadout[kind]);}
 sync(combat,heal=false){const p=combat.player,d=this.data,old=p.maxHp;p.classId=d.classId;p.maxHp=120+(d.level-1)*12;p.hp=heal?p.maxHp:p.hp<=0?0:Math.min(p.maxHp,p.hp+Math.max(0,p.maxHp-old));p.damageBonus=itemPower(this.equipped(p.weapon));p.damageMultiplier=1+(d.level-1)*.08;p.armor=itemPower(this.equipped('armor'));d.weapon=p.weapon;}
 chooseClass(id,combat){if(!combat.changeClass(id))return false;this.data.classId=id;this.touch(`${classInfo(id).name} · your equipment and journey are kept`);return true;}
 restore(combat){const d=this.data,w=d.world;if(d.layoutVersion!==2){for(const encounter of [d,...(d.campaign?.regions||[]).filter(Boolean)])encounter.drops.forEach((drop,i)=>{drop.x=(i%3-1)*1.2;drop.z=15+Math.floor(i/3)*.8;});d.layoutVersion=2;}if(d.geographyVersion!==1){const migrate=(state,region)=>{if(!state)return;const {colliders}=sceneryLayout(region);state.drops.forEach((drop,i)=>{if(!canStandIn(colliders,drop.x,drop.z)){drop.x=(i%3-1)*1.2;drop.z=15+Math.floor(i/3)*.8;}});};migrate(d,d.campaign?.region||0);d.campaign?.regions.forEach(migrate);d.geographyVersion=1;}combat.reset(d.campaign?.region||0);combat.player.weapon=d.weapon;if(w.shardHp<250)combat.damageShard(250-w.shardHp);if(w.exploded){combat.shard.exploded=true;combat.shard.blast=0;}for(const e of combat.enemies)if(d.claimed.includes(e.id)){e.hp=0;e.phase='dead';}combat.kills=d.claimed.length;combat.consume();this.sync(combat,true);}
 snapshot(combat){this.data.layoutVersion=2;this.data.world={shardHp:combat.shard.hp,exploded:combat.shard.exploded};this.data.weapon=combat.player.weapon;return structuredClone(this.data);}
 experience(amount){const d=this.data;if(d.level>=8)return;d.xp+=amount;while(d.level<8&&d.xp>=xpNeeded(d.level)){d.xp-=xpNeeded(d.level);d.level++;this.touch(`Level ${d.level} · health and damage increased`);}if(d.level===8)d.xp=0;}
 makeItem(kind,rarity,region=0){const d=this.data;return{id:d.serial++,kind,rarity,power:(kind==='armor'?2:0)+RARITIES.indexOf(rarity)*3+Math.max(0,Math.min(3,region))*2,upgrade:0};}
 events(events,combat){const d=this.data;for(const e of events){
  // Extra patrols supply XP, gold and smithing ore. Equipment stays on the
  // original guards and shard, keeping a full expedition within the 24-slot bag.
  // Camp bandits and the elite pay out at once and are never claimed.
  if(e.type==='kill'&&e.optional){const enemy=combat.enemies.find(n=>n.id===e.id);if(!enemy)continue;const seed=(e.id*131+d.run*17+Math.floor(combat.time))>>>0;
   if(enemy.elite){const gold=120+combat.region*30;d.gold=Math.min(1000000,d.gold+gold);d.ore=Math.min(100000,d.ore+4);this.experience(120);const item=this.makeItem(KINDS[seed%4],'rare',combat.region);let text=`Dread Champion defeated · +${gold} gold · +4 ore`;if(d.items.length<24){d.items.push(item);text+=` · rare ${item.kind}`;}else{d.gold+=60;text+=' · bag full, +60 gold';}this.touch(text);}
   else{const gold=6+seed%7;d.gold=Math.min(1000000,d.gold+gold);this.experience(enemy.kind==='brute'?30:enemy.kind==='wolf'?10:18);this.touch(`Bandit routed · +${gold} gold`);}
   continue;}
  if(e.type==='kill'&&!d.claimed.includes(e.id)){const enemy=combat.enemies.find(n=>n.id===e.id);if(!enemy)continue;d.claimed.push(e.id);const boss=enemy.kind==='boss',wolf=enemy.kind==='wolf',xp=boss?160:enemy.kind==='brute'?40:enemy.patrol?(wolf?12:22):wolf?25:45;this.experience(xp);const seed=e.id+d.run+combat.region;const item=boss?this.makeItem('armor','rare',combat.region):!wolf&&!enemy.patrol?this.makeItem(KINDS[((e.id*17+d.run*23)%11)%4],seed%3===0?'rare':'uncommon',combat.region):null;d.drops.push({id:`${d.run}-${combat.region}-${e.id}`,x:enemy.x,z:enemy.z,gold:boss?100:enemy.patrol?(wolf?7:14):wolf?12:24,ore:boss?4:wolf?0:1,item});this.touch(`+${xp} XP · loot dropped`);}
  if(e.type==='explosion'&&!d.shardReward){d.shardReward=true;this.experience(80);d.drops.push({id:`${d.run}-${combat.region}-shard`,x:combat.shard.x,z:combat.shard.z,gold:60,ore:3,item:this.makeItem(combat.player.weapon,'rare',combat.region)});this.touch('Shard cleansed · a rare weapon for your current fighting style dropped');}
  if(e.type==='death'){const lost=Math.floor(d.gold*.1);d.gold-=lost;d.deaths++;this.touch(`You lost ${lost} gold. Equipment and XP are safe.`);}
 }this.sync(combat);}
 collect(player){if(player.hp<=0)return false;let changed=false;for(let i=this.data.drops.length-1;i>=0;i--){const d=this.data.drops[i];if(Math.hypot(d.x-player.x,d.z-player.z)>1.55)continue;if(d.item&&this.data.items.length>=24){if(this.fullDrop!==d.id){this.messages.push('Inventory full · sell spare equipment to Mara or salvage it at Borin');this.fullDrop=d.id;}continue;}this.data.gold=Math.min(1000000,this.data.gold+d.gold);this.data.ore=Math.min(100000,this.data.ore+d.ore);if(d.item)this.data.items.push(d.item);this.data.drops.splice(i,1);this.fullDrop=null;this.touch(d.item?`Found ${itemName(d.item)}`:`Collected ${d.gold} gold${d.ore?` · ${d.ore} ore`:''}`);changed=true;}return changed;}
 equip(id,combat){const i=this.data.items.find(i=>i.id===id);if(!i||combat.dead||combat.player.action||combat.player.dodge>0)return false;this.data.loadout[i.kind]=i.id;if(i.kind!=='armor')combat.equip(i.kind);this.sync(combat);this.touch(`Equipped ${itemName(i)}`);return true;}
 nearSmith(player){return (this.data.campaign?.region||0)===0&&!(player.hp<=0)&&Math.hypot(player.x-SMITH.x,player.z-SMITH.z)<3;}
 price(item){return{gold:40+item.upgrade*35,ore:1+item.upgrade};}
 upgrade(id,player){const i=this.data.items.find(i=>i.id===id);if(!i||!this.nearSmith(player)||i.upgrade>=3)return false;const cost=this.price(i);if(this.data.gold<cost.gold||this.data.ore<cost.ore)return false;this.data.gold-=cost.gold;this.data.ore-=cost.ore;i.upgrade++;this.touch(`Forged ${itemName(i)}`);return true;}
 salvage(id,player){const i=this.data.items.find(i=>i.id===id);if(!i||!this.nearSmith(player)||Object.values(this.data.loadout).includes(id))return false;this.data.items=this.data.items.filter(i=>i.id!==id);this.data.gold=Math.min(1000000,this.data.gold+10+RARITIES.indexOf(i.rarity)*10);this.data.ore=Math.min(100000,this.data.ore+1);this.touch('Equipment salvaged · +1 ore');return true;}
 nearMerchant(player){const n=NPCS.find(n=>n.id==='merchant');return player.hp>0&&Math.hypot(player.x-n.x,player.z-n.z)<3;}
 sell(id,player){const d=this.data,item=d.items.find(i=>i.id===id);if(!item||!this.nearMerchant(player)||Object.values(d.loadout).includes(id))return false;const price=sellPrice(item);if(d.gold+price>1000000)return false;d.items=d.items.filter(i=>i.id!==id);d.gold+=price;this.touch(`Sold ${itemName(item)} · +${price} gold`);return true;}
 buyPotion(player){if(!this.nearSmith(player)||this.data.gold<25||this.data.potions>=20)return false;this.data.gold-=25;this.data.potions++;this.touch('Bought a healing draught');return true;}
 buySupplies(player){if(!this.nearMerchant(player)||this.data.gold<25||this.data.potions>=20)return false;this.data.gold-=25;this.data.potions++;this.touch('Mara · healing draught added');return true;}
 potion(combat){const p=combat.player;if(p.hp<=0||p.hp>=p.maxHp||this.data.potions<1||this.potionCD>0)return false;this.data.potions--;p.hp=Math.min(p.maxHp,p.hp+65);this.potionCD=8;this.touch('Healing draught · +65 health');return true;}
 beginJourney(combat,{fresh=false,classId=this.data.classId}={}){
  if(!CLASS_IDS.includes(classId))return false;
  if(fresh){this.data=new Progression().data;this.data.campaign=freshCampaign();}
  else{this.data.run++;Object.assign(this.data,emptyEncounter(),{found:[]});if(this.data.campaign)this.data.campaign=freshCampaign();}
  this.data.classId=classId;this.messages=[];this.fullDrop=null;this.potionCD=0;
  combat.reset();combat.player.weapon=this.data.weapon;this.sync(combat,true);
  this.touch(fresh?'A new journey begins':'A new expedition · your equipment and level are kept');return true;
 }
 nextRun(combat){return this.beginJourney(combat);}
 tick(dt){this.potionCD=Math.max(0,this.potionCD-dt);this.fishCD=Math.max(0,this.fishCD-dt);}
 // Discoveries pay out at once: nothing waits on the ground, so saves stay small.
 discover(prop,combat,region){const d=this.data,p=combat.player,seed=[...prop.id].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,d.run*977+region);
  if(prop.kind==='shrine'){p.hp=p.maxHp;p.stamina=100;p.blessed=30;this.touch('Shrine blessing · full health and +20% damage for 30 seconds');return{kind:'shrine'};}
  if(d.found.includes(prop.id))return false;
  if(prop.kind==='herb'){if(p.hp<=0)return false;d.found.push(prop.id);p.hp=Math.min(p.maxHp,p.hp+30);this.experience(4);this.touch('Moonleaf · +30 health');return{kind:'herb'};}
  if(prop.kind==='ore'){d.found.push(prop.id);const ore=2+seed%2;d.ore=Math.min(100000,d.ore+ore);this.touch(`Ore vein · +${ore} ore for Borin's upgrades`);return{kind:'ore',ore};}
  if(prop.kind==='barrel'){d.found.push(prop.id);const gold=6+seed%9;d.gold=Math.min(1000000,d.gold+gold);this.touch(`Smashed barrel · +${gold} gold`);return{kind:'barrel',gold};}
  if(prop.kind==='chest'){d.found.push(prop.id);const gold=30+seed%31+region*10,ore=1+seed%2;d.gold=Math.min(1000000,d.gold+gold);d.ore=Math.min(100000,d.ore+ore);let text=`Treasure chest · +${gold} gold · +${ore} ore`;
   if(seed%100<40){const item=this.makeItem(KINDS[seed%4],seed%3===0?'rare':'common',region);if(d.items.length<24){d.items.push(item);text+=` · ${item.rarity} ${item.kind}`;}else{d.gold+=25;text+=' · bag full, +25 gold instead';}}
   this.touch(text);return{kind:'chest',gold,ore};}
  return false;}
 get fishCount(){return this.data.fish.reduce((a,b)=>a+b,0);}
 addFish(fish){const i=FISH.indexOf(fish);if(i<0)return false;if(this.fishCount>=FISH_LIMIT){this.touch(`Your creel is full · ${fish.name} released`);return false;}this.data.fish[i]++;this.touch(`Caught a ${fish.name} · eat it with G to restore ${fish.heal} health`);return true;}
 // The smallest fish goes first, so a Golden Carp is saved for an emergency.
 eatFish(combat){const p=combat.player;if(p.hp<=0||p.hp>=p.maxHp||this.fishCD>0)return false;const i=this.data.fish.findIndex(n=>n>0);if(i<0)return false;const fish=FISH[i];this.data.fish[i]--;p.hp=Math.min(p.maxHp,p.hp+fish.heal);this.fishCD=4;this.touch(`${fish.name} · +${fish.heal} health`);return fish;}
}
