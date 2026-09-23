// Deterministic combat rules, independent of rendering and browser input.
import {MAPS,inTown} from './world-map.js';
import {FIELD_PATROLS,guardianCount} from './campaign-data.js';
import {CLASS_IDS,classInfo,SKILLS,ARCANE_BOLT} from './class-data.js';
import {activateClassSkill,classHit,updateClassEffects,clearPath} from './class-combat.js';
export {SKILLS} from './class-data.js';
export const DODGE_DURATION=.34;
export const WEAPONS = {
  sword: { name:'Iron Sword', damage:22, range:2.1, arc:1.8, windup:.16, active:.13, recovery:.23, cost:8 },
  axe: { name:'Bearded Axe', damage:36, range:2.25, arc:2.5, windup:.34, active:.19, recovery:.34, cost:14 },
  spear: { name:'Ash Spear', damage:19, range:3.25, arc:.62, windup:.12, active:.12, recovery:.22, cost:7 },
};
export const basicAttack=p=>p.classId==='mage'?ARCANE_BOLT:WEAPONS[p.weapon];
const aimPoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.z)?{x:point.x,z:point.z}:null;
const ENEMIES={wolf:{hp:58,speed:2.45,range:1.4,damage:12,windup:.65,recovery:.9,radius:.48},raider:{hp:100,speed:1.65,range:1.9,damage:20,windup:.9,recovery:1.05,radius:.42},boss:{hp:1080,radius:.7}};
// Rendering and damage share these numbers: the warning is the actual danger zone.
export function enemyAttack(e){
 if(e.kind==='boss')return e.attackKind==='slam'?{name:'Ground Slam',hint:'Leave the circle',range:4.5,arc:Math.PI*2,windup:1.6,recovery:1.5,damage:60,color:0xb889f0}:{name:'Oathbreaker Sweep',hint:'Dodge behind him',range:3.2,arc:2.3,windup:1.05,recovery:1.1,damage:42,color:0xe0a949};
 const d=ENEMIES[e.kind];return {...d,name:e.kind==='wolf'?'Lunge':'Axe Sweep',hint:'Step out of the marked ground',arc:e.kind==='wolf'?1:1.8,color:0xe0a949};
}
export const windupProgress=e=>Math.max(0,Math.min(1,1-e.timer/enemyAttack(e).windup));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bearing=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function inArc(origin,target,range,arc,angle=origin.angle){
  return dist(origin,target)<=range+(target.radius||0)&&Math.abs(angleDelta(bearing(origin,target),angle))<=arc/2;
}

export class Combat {
  constructor(canStand=()=>true,canPass=canStand){this.canStand=canStand;this.canPass=canPass;this.reset();}
  reset(region=0){
    this.region=region;
    this.time=0;this.nextId=0;this.events=[];this.enemies=[];this.projectiles=[];this.bombs=[];this.effectSerial=0;this.attacks=0;this.hits=0;this.kills=0;this.dodges=0;this.damageTaken=0;this.skillsUsed=Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0]));this.weaponsUsed={sword:0,axe:0,spear:0};
    this.player={classId:'warrior',x:0,z:11,angle:Math.PI,hp:120,maxHp:120,stamina:100,weapon:'sword',action:null,queued:null,dodge:0,dodgeAge:0,dodgeCD:0,invulnerable:0,buff:0,smoke:0,ward:0,wardTime:0,combo:0,comboUntil:0,cooldowns:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0])),moving:false,walk:0,gait:0};
    this.shard={id:'shard',x:0,z:-10.5,hp:250,maxHp:250,radius:.8,stage:0,blast:0,exploded:false};
    this.player.region=region;
    Object.assign(this.shard,MAPS[region].shard);
    if(region===3){this.shard.hp=0;this.shard.exploded=true;this.spawn('boss',this.shard.x,this.shard.z);}
    else{this.spawn(region===2?'raider':'wolf',-35,7);this.spawn(region>0?'raider':'wolf',35,9);this.spawn('raider',this.shard.x-4,this.shard.z+3);this.spawn('raider',this.shard.x+4,this.shard.z+1);for(const e of FIELD_PATROLS)this.spawn(e.kind,e.x,e.z,e.id,true);}
  }
  get dead(){return this.player.hp<=0;}
  get requiredKills(){return guardianCount(this.region);}
  get complete(){return this.shard.exploded&&this.enemies.length===this.requiredKills&&this.enemies.every(e=>e.hp<=0);}
  get phase(){const a=this.player.action;if(!a)return'idle';return a.age<a.windup?'windup':a.age<a.windup+a.active?'active':'recovery';}
  spawn(kind,x,z,id=this.nextId+1,patrol=false){if(this.enemies.length>=32||this.enemies.some(e=>e.id===id))return;this.nextId=Math.max(this.nextId,id);const d=ENEMIES[kind],hp=Math.round(d.hp*(kind==='boss'?1:1+this.region*.18)),enemy={id,kind,patrol,x,z,homeX:x,homeZ:z,angle:Math.PI,hp,maxHp:hp,radius:d.radius,phase:'idle',timer:0,stagger:0,flash:0,walk:0,attackCount:0,enraged:false};this.enemies.push(enemy);return enemy;}
  emit(type,data={}){this.events.push({type,...data});}
  consume(){return this.events.splice(0);}
  equip(name){const p=this.player;if(this.dead||p.action||p.dodge>0||!WEAPONS[name])return false;p.weapon=name;p.combo=0;this.emit('equip',{weapon:name});return true;}
  cycleWeapon(){const keys=Object.keys(WEAPONS);return this.equip(keys[(keys.indexOf(this.player.weapon)+1)%keys.length]);}
  requestAttack(kind='basic',angle=this.player.angle,target=null){
    const p=this.player,a=p.action;if(this.dead||p.dodge>0||!(kind==='basic'||classInfo(p.classId).skills.includes(kind)))return false;
    if(!a)return this.startAttack(kind,angle,target);
    // A single late input is held briefly, never a whole automatic combo.
    if(a.windup+a.active+a.recovery-a.age>.20)return false;
    p.queued={kind,angle,target:aimPoint(target),until:this.time+.24};return true;
  }
  clearBufferedInput(){this.player.queued=null;}
  canChangeClass(){const p=this.player;return !this.dead&&inTown(p.x,p.z)&&!p.action&&!p.dodge&&!this.projectiles.length&&!this.bombs.length&&!this.enemies.some(e=>e.hp>0&&e.poison>0);}
  changeClass(id){
    const p=this.player;if(!CLASS_IDS.includes(id)||id===p.classId||!this.canChangeClass())return false;
    // Do not turn class switching into free healing, fresh cooldowns or stacked buffs.
    const remaining=Math.max(...Object.values(p.cooldowns));for(const key of Object.keys(p.cooldowns))p.cooldowns[key]=Math.max(p.cooldowns[key],remaining);
    p.classId=id;p.buff=p.smoke=p.ward=p.wardTime=p.combo=0;p.queued=null;this.emit('classChange',{classId:id});return true;
  }
  startAttack(kind='basic',angle=this.player.angle,target=null){
    const p=this.player;if(this.dead||p.action||p.dodge>0)return false;
    const basic=kind==='basic',d=basic?basicAttack(p):SKILLS[kind];if(!d||!basic&&!classInfo(p.classId).skills.includes(kind))return false;
    if(p.stamina<d.cost){this.emit('notice',{text:'Not enough stamina'});return false;}
    if(!basic&&p.cooldowns[kind]>0)return false;
    p.queued=null;p.stamina-=d.cost;p.angle=Number.isFinite(angle)?angle:p.angle;angle=p.angle;
    if(basic){p.combo=this.time<=p.comboUntil?p.combo%3+1:1;this.attacks++;this.weaponsUsed[p.weapon]++;}
    else{p.cooldowns[kind]=d.cooldown;this.skillsUsed[kind]++;}
    const multiplier=(p.damageMultiplier||1)*(basic&&p.combo===3?1.5:1)*(p.buff>0?1.35:1);
    p.action={...d,kind,weapon:p.weapon,age:0,angle,target:aimPoint(target),hits:new Set(),applied:false,combo:basic?p.combo:0,equipmentDamage:d.damage>0?(p.damageBonus||0)*multiplier:0,damage:(d.damage>0?d.damage+(p.damageBonus||0):0)*multiplier};
    this.emit('attack',{kind,weapon:p.weapon,combo:p.combo});return true;
  }
  dodge(x,z){const p=this.player;if(this.dead||p.dodge>0||p.dodgeCD>0||p.stamina<25||this.phase==='active')return false;
    const length=Math.hypot(x,z);p.dodgeX=length>.05?x/length:Math.sin(p.angle);p.dodgeZ=length>.05?z/length:Math.cos(p.angle);
    p.action=null;p.queued=null;p.stamina-=25;p.dodge=DODGE_DURATION;p.dodgeAge=0;p.dodgeCD=.65;p.invulnerable=.24;this.dodges++;this.emit('dodge');return true;
  }
  hurtPlayer(amount){const p=this.player;if(this.dead||p.invulnerable>0)return false;amount=Math.max(1,amount-(p.armor||0))*(p.smoke>0?.5:1);const absorbed=Math.min(p.ward,amount);p.ward-=absorbed;amount-=absorbed;p.hp=Math.max(0,p.hp-amount);p.invulnerable=.28;this.damageTaken+=amount;if(absorbed)this.emit('absorb',{amount:absorbed});if(amount)this.emit('hurt',{amount});if(this.dead){p.action=null;p.queued=null;p.dodge=0;this.projectiles.length=this.bombs.length=0;this.emit('death');}return true;}
  damageEnemy(e,amount,stagger=.22,feedback={}){if(e.hp<=0)return;const interrupted=e.kind!=='boss'&&e.phase==='windup';e.hp=Math.max(0,e.hp-amount);e.stagger=stagger;e.flash=.18;this.hits++;this.emit('hit',{id:e.id,x:e.x,z:e.z,amount,target:e.kind,interrupted,...feedback});if(e.hp<=0){e.phase='dead';this.kills++;this.emit('kill',{id:e.id});}}
  damageShard(amount,feedback={}){const s=this.shard;if(s.hp<=0)return;s.hp=Math.max(0,s.hp-amount);this.hits++;this.emit('hit',{id:'shard',x:s.x,z:s.z,amount,target:'shard',...feedback});
    const stage=s.hp<=0?3:s.hp<=s.maxHp/3?2:s.hp<=s.maxHp*2/3?1:0;
    while(s.stage<Math.min(stage,2)){s.stage++;for(const side of [-1,1])this.spawn(s.stage===1?'wolf':'raider',s.x+side*2,s.z+1.5,3+s.stage*2+(side===1?1:0));this.emit('wave',{wave:s.stage});}
    if(s.hp<=0){s.blast=1.4;this.emit('shardBreak');}
  }
  move(body,dx,dz){const allowed=(x,z)=>this.canStand(x,z)&&(body===this.player||!inTown(x,z));if(allowed(body.x+dx,body.z))body.x+=dx;if(allowed(body.x,body.z+dz))body.z+=dz;}
  updateBoss(e,dt){
    const p=this.player;
    if(!e.enraged&&e.hp<=e.maxHp/2){e.enraged=true;this.emit('notice',{text:'The Warden is enraged! Watch the violet ground slam.'});}
    // Boss windups cannot be cancelled by basic-hit stagger or Battle Cry.
    if(e.phase==='windup'){e.timer-=dt;if(e.timer<=0){const d=enemyAttack(e),slam=e.attackKind==='slam';if(inArc(e,{...p,radius:.28},d.range,d.arc,e.angle)&&clearPath(this,e,p))this.hurtPlayer(d.damage*(e.enraged?1.2:1));e.phase='recovery';e.timer=d.recovery;this.emit('bossStrike',{x:e.x,z:e.z,slam});}return;}
    if(e.phase==='recovery'){e.timer-=dt;if(e.timer<=0)e.phase='idle';return;}
    const aggro=!inTown(p.x,p.z)&&dist(e,p)<15&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)<18,target=aggro?p:{x:e.homeX,z:e.homeZ},distance=dist(e,target);
    if(aggro&&distance<3.15){e.attackKind=e.attackCount++%2?'slam':'sweep';e.phase='windup';e.timer=enemyAttack(e).windup;e.angle=bearing(e,p);this.emit('enemyWindup',{id:e.id});return;}
    if(distance>.2){const a=bearing(e,target),speed=(e.enraged?3.25:2.55)*(e.slow>0?e.slowFactor:1);e.angle+=angleDelta(a,e.angle)*Math.min(1,dt*7);this.move(e,Math.sin(a)*speed*dt,Math.cos(a)*speed*dt);e.walk+=dt*speed*2.5;}
  }
  update(dt,input={x:0,z:0,attack:false,aim:this.player.angle}){
    this.time+=dt;const p=this.player,s=this.shard;p.aimPoint=aimPoint(input.aimPoint);
    for(const key of Object.keys(p.cooldowns))p.cooldowns[key]=Math.max(0,p.cooldowns[key]-dt);
    p.buff=Math.max(0,p.buff-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.dodgeCD=Math.max(0,p.dodgeCD-dt);
    if(this.dead)return;
    updateClassEffects(this,dt);
    p.stamina=Math.min(100,p.stamina+dt*(p.action||p.dodge>0?4:23));
    if(inTown(p.x,p.z))p.hp=Math.min(p.maxHp,p.hp+dt*8);
    if(p.queued&&this.time>p.queued.until)p.queued=null;
    if(!p.action&&p.queued){const queued=p.queued;p.queued=null;this.startAttack(queued.kind,queued.angle,queued.target);}
    if(input.attack&&!p.action)this.startAttack('basic',input.aim);
    const moving=Math.hypot(input.x,input.z)>.05;p.moving=moving;
    if(moving)p.walk+=dt*9;p.gait+=((moving?1:0)-p.gait)*(1-Math.exp(-dt*18));
    if(p.dodge>0){const dodgeDt=Math.min(dt,p.dodge);this.move(p,p.dodgeX*7.8*dodgeDt,p.dodgeZ*7.8*dodgeDt);p.dodge=Math.max(0,p.dodge-dt);p.dodgeAge=Math.min(DODGE_DURATION,p.dodgeAge+dodgeDt);}
    else{const speed=(p.action?1.25:3.4)*(p.smoke>0?1.35:1);this.move(p,input.x*speed*dt,input.z*speed*dt);if(!p.action){const target=Number.isFinite(input.aim)?input.aim:moving?Math.atan2(input.x,input.z):p.angle;p.angle+=angleDelta(target,p.angle)*Math.min(1,dt*16);}}
    const a=p.action;
    if(a){
      a.age+=dt;p.angle=a.angle;
      if(a.age>=a.windup&&a.age<a.windup+a.active){
        if(!a.applied){a.applied=true;activateClassSkill(this,a);this.emit('swing',{kind:a.kind,projectile:a.projectile,weapon:a.weapon,x:p.x,z:p.z,angle:p.angle,combo:a.combo,arc:a.arc,range:a.range});if(a.kind==='cry'){p.buff=6;for(const e of this.enemies)if(e.hp>0&&e.kind!=='boss'&&dist(p,e)<5&&clearPath(this,p,e))e.stagger=1.8;}}
        const feedback={heavy:a.combo===3||a.kind==='slam'||a.kind==='cleave',finisher:a.combo===3,weapon:a.weapon};
        if(a.damage>0&&!['projectile','bomb'].includes(a.effect)){for(const e of this.enemies)if(e.hp>0&&!a.hits.has(e.id)&&inArc(p,e,a.range,a.arc,a.angle)&&clearPath(this,p,e)){a.hits.add(e.id);classHit(this,a,e);const d=dist(p,e)||1;this.move(e,(e.x-p.x)/d*.16,(e.z-p.z)/d*.16);}
          if(s.hp>0&&!a.hits.has('shard')&&inArc(p,s,a.range,a.arc,a.angle)&&clearPath(this,p,s)){a.hits.add('shard');this.damageShard(a.damage,feedback);}}
      }
      if(a.age>=a.windup+a.active+a.recovery){p.action=null;p.comboUntil=this.time+.85;}
    }
    for(const e of this.enemies){
      e.flash=Math.max(0,e.flash-dt);if(e.hp<=0)continue;
      if(e.kind==='boss'){this.updateBoss(e,dt);continue;}
      const d=enemyAttack(e);d.speed*=e.slow>0?e.slowFactor:1;
      if(e.stagger>0){e.stagger-=dt;e.phase='idle';continue;}
      if(e.phase==='windup'){e.timer-=dt;if(e.timer<=0){e.phase='recovery';e.timer=d.recovery;if(inArc(e,{...p,radius:.28},d.range,d.arc,e.angle)&&clearPath(this,e,p))this.hurtPlayer(d.damage*(1+this.region*.15));this.emit('enemyStrike',{id:e.id});}continue;}
      if(e.phase==='recovery'){e.timer-=dt;if(e.timer<=0)e.phase='idle';continue;}
      const distance=dist(e,p),aggro=!inTown(p.x,p.z)&&distance<10&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)<14;
      const patrol=e.patrol?{x:e.homeX+Math.sin(this.time*.19+e.id)*1.3,z:e.homeZ+Math.cos(this.time*.19+e.id)*.9}:{x:e.homeX,z:e.homeZ};
      const target=aggro?p:this.canStand(patrol.x,patrol.z)&&!inTown(patrol.x,patrol.z)?patrol:{x:e.homeX,z:e.homeZ};
      if(aggro&&distance<d.range+.06){e.phase='windup';e.timer=d.windup;e.angle=bearing(e,p);this.emit('enemyWindup',{id:e.id});continue;}
      if(dist(e,target)>.2){const a=bearing(e,target);e.angle+=angleDelta(a,e.angle)*Math.min(1,dt*8);const x=Math.sin(a)*d.speed*dt,z=Math.cos(a)*d.speed*dt,oldX=e.x,oldZ=e.z;this.move(e,x,z);if(Math.hypot(e.x-oldX,e.z-oldZ)<dt*.1){const turn=a+(e.id%2?1:-1)*1.2;this.move(e,Math.sin(turn)*d.speed*dt,Math.cos(turn)*d.speed*dt);}e.walk+=dt*d.speed*3;}
      for(const other of this.enemies){if(other===e||other.hp<=0)continue;const sep=dist(e,other);if(sep<.75&&sep>.001)this.move(e,(e.x-other.x)/sep*dt*.55,(e.z-other.z)/sep*dt*.55);}
    }
    if(s.blast>0){s.blast-=dt;if(s.blast<=0){s.exploded=true;if(dist(p,s)<4.2)this.hurtPlayer(38);for(const e of this.enemies)if(e.hp>0&&dist(e,s)<4.2)this.damageEnemy(e,85,1);this.emit('explosion',{x:s.x,z:s.z});}}
  }
  telemetry(){const p=this.player;return{hp:p.hp,stamina:p.stamina,weapon:p.weapon,attackPhase:this.phase,combo:p.combo,attacks:this.attacks,hits:this.hits,kills:this.kills,requiredKills:this.requiredKills,dodges:this.dodges,dodgeRemaining:p.dodge,dodgeAge:p.dodgeAge,damageTaken:this.damageTaken,skillsUsed:{...this.skillsUsed},weaponsUsed:{...this.weaponsUsed},cooldowns:{...p.cooldowns},buff:p.buff,shardHp:this.shard.hp,shardsDestroyed:this.region===3?0:this.shard.exploded?1:0,complete:this.complete,alive:this.enemies.filter(e=>e.hp>0).length,enemies:this.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,hp:e.hp,phase:e.phase,attackKind:e.attackKind,enraged:e.enraged,timer:e.timer}))};}
}
