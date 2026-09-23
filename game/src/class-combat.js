// Class effects are deterministic: visuals never decide hits or destinations.
import {SKILLS,projectileInfo} from './class-data.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function tracePath(canPass,from,angle,length){
 const steps=Math.ceil(length/.12);let end={x:from.x,z:from.z};
 for(let n=1;n<=steps;n++){const next={x:from.x+Math.sin(angle)*length*n/steps,z:from.z+Math.cos(angle)*length*n/steps};if(!canPass(next.x,next.z))break;end=next;}
 return end;
}
export function clearPath(combat,from,to){
 const end=tracePath(combat.canPass,from,Math.atan2(to.x-from.x,to.z-from.z),distance(from,to));return distance(end,to)<.02;
}
export function bombLanding(combat,from,angle,point=null){
 const valid=point&&Number.isFinite(point.x)&&Number.isFinite(point.z);
 const length=valid?Math.min(SKILLS.cinderbomb.range,distance(from,point)):SKILLS.cinderbomb.range;
 return tracePath(combat.canPass,from,valid?Math.atan2(point.x-from.x,point.z-from.z):angle,length);
}
export function splash(combat,origin,radius,damage,feedback={}){
 for(const e of combat.enemies)if(e.hp>0&&distance(origin,e)<radius+e.radius&&clearPath(combat,origin,e))combat.damageEnemy(e,damage,.5,feedback);
 const s=combat.shard;if(s.hp>0&&distance(origin,s)<radius+s.radius&&clearPath(combat,origin,s))combat.damageShard(damage,feedback);
}
export function activateClassSkill(combat,a){
 const p=combat.player,s=a;if(!s.effect)return;
 if(s.effect==='projectile'){
  const bonusTargets=new Set();
  for(const offset of a.kind==='venom'?[-.16,0,.16]:[0])combat.projectiles.push({id:combat.effectSerial++,kind:a.projectile||a.kind,x:p.x,z:p.z,angle:a.angle+offset,left:a.range,damage:a.damage,equipmentDamage:a.equipmentDamage,bonusTargets,combo:a.combo,speed:s.speed});
 }
 if(s.effect==='blink'||s.effect==='lunge'){
  const from={x:p.x,z:p.z},end=tracePath(combat.canStand,p,a.angle,s.effect==='blink'?a.range:1.5);Object.assign(p,end);
  if(s.effect==='blink')p.invulnerable=Math.max(p.invulnerable,.35);
  combat.emit('classMove',{kind:a.kind,from,to:end,color:s.color});
 }
 if(s.effect==='smoke')p.smoke=4;
 if(s.effect==='ward'){p.ward=50;p.wardTime=6;}
 if(s.effect==='bomb'){
  const end=bombLanding(combat,p,a.angle,a.target);combat.bombs.push({id:combat.effectSerial++,kind:a.kind,...end,age:0,fuse:1.1,radius:2.6,damage:a.damage});
 }
}
export function classHit(combat,a,e){
 if(a.kind==='frostnova'){e.slow=4;e.slowFactor=e.kind==='boss'?.725:.45;}
 const behind=a.kind==='shadowcut'&&Math.abs(delta(a.angle,e.angle))<Math.PI/3;
 combat.damageEnemy(e,a.damage*(behind?1.5:1),a.kind==='forgeblow'?1.4:a.kind==='slam'?1.1:a.weapon==='axe'?.5:.18,{heavy:behind||a.combo===3||['slam','cleave','forgeblow'].includes(a.kind),finisher:a.combo===3,weapon:a.weapon});
}
function projectileImpact(combat,shot,target){
 const skill=projectileInfo(shot.kind),feedback={heavy:!!skill.splash||shot.combo===3,finisher:shot.combo===3,weapon:'spell'};
 // One equipment bonus per victim per volley, while spread hits on different
 // victims keep their full bonus. Poison still refreshes instead of stacking.
 const repeated=shot.kind==='venom'&&target&&shot.bonusTargets.has(target.id);
 const damage=shot.damage-(repeated?shot.equipmentDamage:0);
 if(shot.kind==='venom'&&target)shot.bonusTargets.add(target.id);
 if(skill.splash)splash(combat,shot,skill.splash,shot.damage,feedback);
 else if(target?.id==='shard')combat.damageShard(damage,feedback);
 else if(target){combat.damageEnemy(target,damage,.15,feedback);if(skill.poison&&target.hp>0){target.poison=4;target.poisonTick=1;target.poisonDamage=6*(combat.player.damageMultiplier||1);}}
 combat.emit('classImpact',{x:shot.x,z:shot.z,color:skill.color,radius:skill.splash||.45});
}
export function updateClassEffects(combat,dt){
 const p=combat.player;
 p.smoke=Math.max(0,p.smoke-dt);p.wardTime=Math.max(0,p.wardTime-dt);if(!p.wardTime)p.ward=0;
 for(const e of combat.enemies){
  e.slow=Math.max(0,(e.slow||0)-dt);
  if(e.hp<=0||!(e.poison>0))continue;
  const elapsed=Math.min(dt,e.poison);e.poison=Math.max(0,e.poison-dt);e.poisonTick-=elapsed;
  if(e.poisonTick<=1e-8){e.poisonTick+=1;combat.damageEnemy(e,e.poisonDamage,0,{weapon:'poison'});}
 }
 for(let i=combat.projectiles.length-1;i>=0;i--){
  const shot=combat.projectiles[i],travel=Math.min(shot.left,shot.speed*dt),steps=Math.max(1,Math.ceil(travel/.12));let done=false;
  for(let n=0;n<steps;n++){
   const next={x:shot.x+Math.sin(shot.angle)*travel/steps,z:shot.z+Math.cos(shot.angle)*travel/steps};
   if(!combat.canPass(next.x,next.z)){projectileImpact(combat,shot);done=true;break;}
   Object.assign(shot,next);shot.left-=travel/steps;
   const target=[...combat.enemies,combat.shard].filter(e=>e.hp>0&&distance(shot,e)<e.radius+.22).sort((a,b)=>distance(shot,a)-distance(shot,b))[0];
   if(target){projectileImpact(combat,shot,target);done=true;break;}
  }
  if(done||shot.left<=1e-6)combat.projectiles.splice(i,1);
 }
 for(let i=combat.bombs.length-1;i>=0;i--){const bomb=combat.bombs[i];bomb.age+=dt;if(bomb.age+1e-8>=bomb.fuse){splash(combat,bomb,bomb.radius,bomb.damage,{heavy:true,weapon:'bomb'});combat.emit('classImpact',{...bomb,color:SKILLS.cinderbomb.color});combat.bombs.splice(i,1);}}
}
