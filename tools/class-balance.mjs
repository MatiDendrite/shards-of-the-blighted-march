// Controlled rules simulation, not human play or an earned campaign. No potions,
// loot, level-up healing or town recovery. Vary weapon, gear, layout and tactics.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat,WEAPONS,basicAttack,enemyAttack,inArc} from '../game/src/combat-model.js';
import {CLASS_IDS,SKILLS} from '../game/src/class-data.js';
import {Progression} from '../game/src/progression.js';

const out='_artifacts/class-balance',dt=1/60,round=n=>Math.round(n*100)/100;
const tiers=[{name:'starter',level:1,bonus:0,armor:2,region:0},{name:'mid',level:4,bonus:6,armor:5,region:1},{name:'end',level:8,bonus:10,armor:10,region:2},{name:'late',level:8,bonus:21,armor:20,region:2}];
function setup(id,tier,weapon){
 const m=new Combat((x,z)=>Math.abs(x)<16&&z>-53&&z<-17),progress=new Progression();progress.data.classId=id;progress.data.level=tier.level;
 m.enemies=[];m.events=[];m.region=tier.region;m.shard.hp=0;m.shard.exploded=true;m.shard.blast=0;
 Object.assign(m.player,{weapon,x:0,z:-35,angle:0});progress.equipped(weapon).power=tier.bonus;progress.equipped('armor').power=tier.armor;progress.sync(m,true);return m;
}
function choose(m,target,order){
 const p=m.player,id=p.classId,d=Math.hypot(target.x-p.x,target.z-p.z),near=m.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<4).length;
 const choices={warrior:order?['cry','cleave','slam']:['cry','slam','cleave'],mage:order?['firebolt','frostnova']:['frostnova','firebolt'],ninja:order?['venom','shadowcut','smoke']:['shadowcut','venom','smoke'],dwarf:order?['ironward','forgeblow','cinderbomb']:['cinderbomb','ironward','forgeblow']}[id];
 for(const skill of choices){
  if(p.cooldowns[skill]>0||p.stamina<SKILLS[skill].cost+18)continue;
  const usable={cry:d<4.8,cleave:d<3.5,slam:d<3.5,firebolt:d<10,frostnova:d<3.8,venom:d<8.5,shadowcut:d>1.4&&d<3.8,smoke:d<4&&(near>1||p.hp<p.maxHp*.8),ironward:d<4.8&&p.ward<1,forgeblow:d<2.9,cinderbomb:d<5.5}[skill];
  if(usable)return skill;
 }
 return null;
}
function encounter(id,tier,weapon,scenario,style,seed){
 const m=setup(id,{...tier,region:scenario==='boss'?3:tier.region},weapon),p=m.player;
 const angle=(seed%6)*Math.PI/3,kinds=scenario==='boss'?['boss']:scenario==='group'?['wolf','wolf','raider','raider']:['raider'];
 for(const [i,kind] of kinds.entries()){const a=angle+(i-(kinds.length-1)/2)*.3,d=5.8+(i%2)*.6;m.spawn(kind,Math.sin(a)*d,p.z+Math.cos(a)*d);}
 let nextDecision=0,lowStamina=0;
 for(let frame=0;frame<60*180&&!m.dead&&m.enemies.some(e=>e.hp>0);frame++){
  const target=m.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz)||1,aim=Math.atan2(dx,dz),basic=basicAttack(p);
  const danger=style==='pressure'?null:m.enemies.find(e=>e.hp>0&&e.phase==='windup'&&e.timer<.25&&inArc(e,{...p,radius:.28},enemyAttack(e).range,enemyAttack(e).arc,e.angle));
  const desired=style==='tactical'&&id==='mage'?6.5:WEAPONS[weapon].range-.2;
  let x=d>desired+.15?dx/d:0,z=d>desired+.15?dz/d:0;
  if(style==='tactical'&&id==='mage'&&d<desired-.8){x=-dx/d;z=-dz/d;}
  if(danger){const length=Math.hypot(p.x-danger.x,p.z-danger.z)||1;x=(p.x-danger.x)/length;z=(p.z-danger.z)/length;}
  if(!m.canStand(p.x+x*.6,p.z+z*.6)){const old=x;x=-z;z=old;}
  if(m.time>=nextDecision){
   nextDecision=m.time+.15;
   if(danger&&p.stamina>=25&&!p.dodge){
    if(style==='tactical'&&id==='mage'&&p.cooldowns.blink<=0&&!p.action)m.requestAttack('blink',Math.atan2(x,z));else m.dodge(x,z);
   }else if(style!=='basic'&&!p.action&&!p.dodge){const skill=choose(m,target,Math.floor(seed/6));if(skill)m.requestAttack(skill,aim,target);}
  }
  const attack=!danger&&d<basic.range+target.radius-.08&&p.stamina>=basic.cost+18;
  m.update(dt,{x,z,aim,attack});m.consume();if(p.stamina<25)lowStamina+=dt;
 }
 return {class:id,tier:tier.name,weapon,scenario,style,seed,win:!m.dead&&m.enemies.every(e=>e.hp<=0),seconds:round(m.time),damage:round(m.damageTaken),hp:round(p.hp),dodges:m.dodges,lowStamina:round(lowStamina),skills:{...m.skillsUsed}};
}
const runs=[];
for(const tier of tiers){
 for(const weapon of Object.keys(WEAPONS))for(const scenario of ['raider','group','boss'])for(const style of ['basic','melee','tactical','pressure'])for(let seed=0;seed<12;seed++)for(const id of CLASS_IDS)runs.push(encounter(id,tier,weapon,scenario,style,seed));
 console.log(`${tier.name}: completed ${runs.length} encounters`);
}
const median=values=>{const a=[...values].sort((x,y)=>x-y);return round(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2);};
const summaries=[];
for(const tier of tiers)for(const weapon of Object.keys(WEAPONS))for(const scenario of ['raider','group','boss'])for(const style of ['basic','melee','tactical','pressure'])for(const id of CLASS_IDS){const r=runs.filter(v=>v.class===id&&v.tier===tier.name&&v.weapon===weapon&&v.scenario===scenario&&v.style===style),wins=r.filter(v=>v.win);summaries.push({class:id,tier:tier.name,weapon,scenario,style,wins:wins.length,total:r.length,medianSeconds:wins.length?median(wins.map(v=>v.seconds)):null,medianDamage:median(r.map(v=>v.damage)),maxDamage:Math.max(...r.map(v=>v.damage))});}
for(const r of runs.filter(v=>v.style==='basic'&&v.class==='warrior'))for(const id of ['ninja','dwarf']){const other=runs.find(v=>v.class===id&&v.tier===r.tier&&v.weapon===r.weapon&&v.scenario===r.scenario&&v.style===r.style&&v.seed===r.seed);for(const k of ['win','seconds','damage'])assert.equal(other[k],r[k]);}
const report={scope:'Deterministic arena matrix, not human play. Basic = basic + dodge; melee = skills + basic + dodge; tactical = melee except Mage kites at 6.5 m and may Blink; pressure = melee without evasion. Six start angles, two skill priorities. No potions or healing. Bot policies are not optimal play. Late gear is not required for a first boss clear.',tiers,count:runs.length,runs:summaries};
await fs.mkdir(out,{recursive:true});await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await fs.writeFile(`${out}/raw-runs.json`,JSON.stringify(runs,null,2));
console.table(summaries.filter(r=>r.tier==='end'&&r.weapon==='sword'&&r.scenario==='boss'));
