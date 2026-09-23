import {REGIONS} from './campaign-data.js';
import {EXIT,inTown} from './world-map.js';
import {itemPower} from './progression.js';

const distance=(p,t)=>Math.hypot(p.x-t.x,p.z-t.z);
const nearest=(p,list)=>[...list].sort((a,b)=>distance(p,a)-distance(p,b))[0];
export function directionTo(player,target){
 const angle=Math.atan2(target.x-player.x,player.z-target.z);
 return ['N','NE','E','SE','S','SW','W','NW'][(Math.round(angle/(Math.PI/4))+8)%8];
}
// Derived from real state; no new save flags, mandatory tutorial or fake quest markers.
export function journeyGuide(campaign){
 const m=campaign.combat,p=m.player,d=campaign.progress.data,q=REGIONS[campaign.region],done=campaign.data.cleared[campaign.region];
 const mark=(kind,title,target,tip)=>({kind,title,target:target?{x:target.x,z:target.z}:null,distance:target?Math.round(distance(p,target)):0,direction:target?directionTo(p,target):'',tip});
 if(m.dead)return mark('retry','Return to safe ground',null,'Your equipment and earned quest progress are kept.');
 if(m.shard.blast>0)return mark('danger','Leave the violet blast circle!',null,'The shard is breaking. Move more than 4.2 m away.');
 if(done){
  const loot=nearest(p,d.drops);if(loot)return mark('loot','Collect your spoils',loot,d.items.length>=24?'Satchel full? Salvage spare gear at Borin in Hearthstead.':'Walk over loot to collect it. Open I to compare equipment.');
  const upgrade=d.items.find(i=>itemPower(i)>itemPower(campaign.progress.equipped(i.kind)));
  if(upgrade)return mark('gear','Stronger equipment in your satchel',null,'Open I to compare and equip it. Travel remains available in J.');
  return campaign.region<3?mark('travel',`Road open · ${REGIONS[campaign.region+1].short}`,EXIT,'Follow the north road, or use J to travel from safe ground.'):mark('complete','The March is free',null,'All four quests complete. Explore, or begin another expedition from the pause menu.');
 }
 if(p.hp<p.maxHp*.35)return mark('recover','Recover before the next fight',{x:0,z:11},d.potions>0?'Q / Heal: drink a draught, or return to the settlement.':'The central settlement restores health. Mara sells draughts.');
 const enemies=m.enemies.filter(e=>e.hp>0),near=nearest(p,enemies);
 if(campaign.region===3)return mark('boss','Defeat the Fallen Warden',near,'Gold sweep: dodge behind. Violet slam: leave the circle. Strike during recovery.');
 // Clear the scattered field guards first if they are closer, then follow the shard.
 if(near&&(m.shard.exploded||distance(p,near)<distance(p,m.shard)))return mark('guardian',m.shard.exploded?'Track the remaining guardians':'Clear the hunting fields',near,`${m.requiredKills-m.kills} guardians remain in this quest, including shard reinforcements. Gold warnings show where attacks land.`);
 return mark('shard',`Cleanse the ${q.shard}`,m.shard,inTown(p.x,p.z)?'Borin can forge a starter upgrade. Take supplies, then follow the marker.':'Breaking the shard calls two waves. Save stamina for a dodge.');
}

export function questSteps(campaign){
 const m=campaign.combat,d=campaign.progress.data,done=campaign.data.cleared[campaign.region];
 const steps=campaign.region===3?[{text:'Defeat the Fallen Warden',done}]:[
  {text:'Clear the hunting fields, side roads and southern pasture',done:m.enemies.filter(e=>e.id<=2||e.patrol).every(e=>e.hp<=0)},
  {text:`Cleanse the ${REGIONS[campaign.region].shard}`,done:m.shard.exploded},
  {text:`Defeat all guardians · ${m.kills} / ${m.requiredKills}`,done:m.enemies.length===m.requiredKills&&m.enemies.every(e=>e.hp<=0)},
 ];
 return [...steps,{text:'Collect the spoils and inspect your gear',done:done&&d.drops.length===0}];
}
