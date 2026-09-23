import {REGIONS,emptyEncounter,freshCampaign} from './campaign-data.js';
import {inTown,portalsFor} from './world-map.js';

export class Campaign {
 constructor(progress,combat){this.progress=progress;this.combat=combat;progress.data.campaign??=freshCampaign();}
 get data(){return this.progress.data.campaign;}
 get region(){return this.data.region;}
 get complete(){return this.data.cleared.every(Boolean);}
 get shards(){return [0,1,2].filter(i=>i===this.region?this.combat.shard.exploded:this.data.regions[i]?.world.exploded).length;}
 unlocked(region){return Number.isInteger(region)&&region>=0&&region<4&&(region===0||this.data.cleared.slice(0,region).every(Boolean));}
 get nearPortal(){const p=this.combat.player;return portalsFor(this.region).find(g=>Math.hypot(p.x-g.x,p.z-g.z)<3)||null;}
 get safe(){const m=this.combat,p=m.player;return !m.dead&&!p.action&&p.dodge<=0&&(inTown(p.x,p.z)||m.complete||!!this.nearPortal&&!m.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<12));}
 get nearGate(){return this.nearPortal?.id==='exit';}
 observe(){
  if(this.combat.dead||!this.combat.complete||this.data.cleared[this.region])return false;
  const d=this.progress.data,q=REGIONS[this.region];this.data.cleared[this.region]=true;
  d.gold=Math.min(1000000,d.gold+q.gold);d.potions=Math.min(20,d.potions+2);this.progress.experience(q.xp);this.progress.sync(this.combat);
  this.progress.touch(`Quest complete · ${q.quest} · +${q.gold} gold, ${q.xp} XP, 2 draughts`);return true;
 }
 travel(region){
  if(region===this.region||this.nearPortal?.destination!==region||!this.unlocked(region)||!this.safe)return false;
  const d=this.progress.data,c=this.data;this.progress.snapshot(this.combat);
  c.regions[c.region]=structuredClone({claimed:d.claimed,drops:d.drops,shardReward:d.shardReward,world:d.world});
  Object.assign(d,structuredClone(c.regions[region]||emptyEncounter(region)));c.regions[region]=null;c.region=region;
  this.progress.restore(this.combat);this.progress.potionCD=0;this.progress.touch(`Entered ${REGIONS[region].name}`);return true;
 }
 retry(){this.progress.snapshot(this.combat);this.progress.restore(this.combat);this.progress.potionCD=0;this.progress.touch('Returned to safe ground · quest progress preserved');}
 telemetry(){return {region:this.region,name:REGIONS[this.region].name,cleared:[...this.data.cleared],shards:this.shards,complete:this.complete,safe:this.safe,nearGate:this.nearGate,nearPortal:this.nearPortal,unlocked:REGIONS.map((_,i)=>this.unlocked(i))};}
}
