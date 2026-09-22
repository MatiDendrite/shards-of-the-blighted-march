// Deterministic combat rules, independent of rendering and browser input.
export const WEAPONS = {
  sword: { name:'Iron Sword', damage:22, range:2.1, arc:1.8, windup:.16, active:.13, recovery:.23, cost:8 },
  axe: { name:'Bearded Axe', damage:36, range:2.25, arc:2.5, windup:.34, active:.19, recovery:.34, cost:14 },
  spear: { name:'Ash Spear', damage:19, range:3.25, arc:.62, windup:.12, active:.12, recovery:.22, cost:7 },
};
export const SKILLS = {
  cleave:{name:'Cleave',cost:20,cooldown:6,windup:.23,active:.15,recovery:.30,damage:42,range:3.4,arc:3.1},
  slam:{name:'Ground Slam',cost:30,cooldown:9,windup:.5,active:.18,recovery:.34,damage:32,range:3.5,arc:Math.PI*2},
  cry:{name:'Battle Cry',cost:25,cooldown:12,windup:.18,active:.1,recovery:.18,damage:0,range:5,arc:Math.PI*2},
};
const ENEMIES={wolf:{hp:58,speed:2.45,range:1.4,damage:12,windup:.65,recovery:.9,radius:.48},raider:{hp:100,speed:1.65,range:1.9,damage:20,windup:.9,recovery:1.05,radius:.42}};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bearing=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function inArc(origin,target,range,arc,angle=origin.angle){
  return dist(origin,target)<=range+(target.radius||0)&&Math.abs(angleDelta(bearing(origin,target),angle))<=arc/2;
}

export class Combat {
  constructor(canStand=()=>true){this.canStand=canStand;this.reset();}
  reset(){
    this.time=0;this.nextId=0;this.events=[];this.enemies=[];this.attacks=0;this.hits=0;this.kills=0;this.dodges=0;this.damageTaken=0;this.skillsUsed={cleave:0,slam:0,cry:0};this.weaponsUsed={sword:0,axe:0,spear:0};
    this.player={x:0,z:11,angle:Math.PI,hp:120,maxHp:120,stamina:100,weapon:'sword',action:null,dodge:0,dodgeAge:0,dodgeCD:0,invulnerable:0,buff:0,combo:0,comboUntil:0,cooldowns:{cleave:0,slam:0,cry:0},moving:false};
    this.shard={id:'shard',x:0,z:-10.5,hp:250,maxHp:250,radius:.8,stage:0,blast:0,exploded:false};
    this.spawn('wolf',-1.8,1.5);this.spawn('wolf',2.2,-1);this.spawn('raider',-3.6,-5);this.spawn('raider',3.7,-6.5);
  }
  get dead(){return this.player.hp<=0;}
  get complete(){return this.shard.exploded&&this.enemies.every(e=>e.hp<=0);}
  get phase(){const a=this.player.action;if(!a)return'idle';return a.age<a.windup?'windup':a.age<a.windup+a.active?'active':'recovery';}
  spawn(kind,x,z){if(this.enemies.filter(e=>e.hp>0).length>=10)return;const d=ENEMIES[kind];this.enemies.push({id:++this.nextId,kind,x,z,homeX:x,homeZ:z,angle:Math.PI,hp:d.hp,maxHp:d.hp,radius:d.radius,phase:'idle',timer:0,stagger:0,flash:0,walk:0});}
  emit(type,data={}){this.events.push({type,...data});}
  consume(){return this.events.splice(0);}
  equip(name){const p=this.player;if(this.dead||p.action||p.dodge>0||!WEAPONS[name])return false;p.weapon=name;p.combo=0;this.emit('equip',{weapon:name});return true;}
  cycleWeapon(){const keys=Object.keys(WEAPONS);return this.equip(keys[(keys.indexOf(this.player.weapon)+1)%keys.length]);}
  startAttack(kind='basic',angle=this.player.angle){
    const p=this.player;if(this.dead||p.action||p.dodge>0)return false;
    const basic=kind==='basic',d=basic?WEAPONS[p.weapon]:SKILLS[kind];if(!d)return false;
    if(p.stamina<d.cost){this.emit('notice',{text:'Not enough stamina'});return false;}
    if(!basic&&p.cooldowns[kind]>0)return false;
    p.stamina-=d.cost;p.angle=angle;
    if(basic){p.combo=this.time<=p.comboUntil?p.combo%3+1:1;this.attacks++;this.weaponsUsed[p.weapon]++;}
    else{p.cooldowns[kind]=d.cooldown;this.skillsUsed[kind]++;}
    p.action={...d,kind,weapon:p.weapon,age:0,angle,hits:new Set(),applied:false,combo:basic?p.combo:0,damage:d.damage*(basic&&p.combo===3?1.5:1)*(p.buff>0?1.35:1)};
    this.emit('attack',{kind,weapon:p.weapon,combo:p.combo});return true;
  }
  dodge(x,z){const p=this.player;if(this.dead||p.dodge>0||p.dodgeCD>0||p.stamina<25||this.phase==='active')return false;
    const length=Math.hypot(x,z);p.dodgeX=length>.05?x/length:Math.sin(p.angle);p.dodgeZ=length>.05?z/length:Math.cos(p.angle);
    p.action=null;p.stamina-=25;p.dodge=.34;p.dodgeAge=0;p.dodgeCD=.65;p.invulnerable=.24;this.dodges++;this.emit('dodge');return true;
  }
  hurtPlayer(amount){const p=this.player;if(this.dead||p.invulnerable>0)return false;p.hp=Math.max(0,p.hp-amount);p.invulnerable=.28;this.damageTaken+=amount;this.emit('hurt',{amount});if(this.dead){p.action=null;p.dodge=0;this.emit('death');}return true;}
  damageEnemy(e,amount,stagger=.22){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.stagger=stagger;e.flash=.14;this.hits++;this.emit('hit',{id:e.id,x:e.x,z:e.z,amount});if(e.hp<=0){e.phase='dead';this.kills++;this.emit('kill',{id:e.id});}}
  damageShard(amount){const s=this.shard;if(s.hp<=0)return;s.hp=Math.max(0,s.hp-amount);this.hits++;this.emit('hit',{id:'shard',x:s.x,z:s.z,amount});
    const stage=s.hp<=0?3:s.hp<=s.maxHp/3?2:s.hp<=s.maxHp*2/3?1:0;
    while(s.stage<Math.min(stage,2)){s.stage++;for(const side of [-1,1])this.spawn(s.stage===1?'wolf':'raider',s.x+side*2,s.z+1.5);this.emit('wave',{wave:s.stage});}
    if(s.hp<=0){s.blast=1.4;this.emit('shardBreak');}
  }
  move(body,dx,dz){if(this.canStand(body.x+dx,body.z))body.x+=dx;if(this.canStand(body.x,body.z+dz))body.z+=dz;}
  update(dt,input={x:0,z:0,attack:false,aim:this.player.angle}){
    this.time+=dt;const p=this.player,s=this.shard;
    for(const key of Object.keys(p.cooldowns))p.cooldowns[key]=Math.max(0,p.cooldowns[key]-dt);
    p.buff=Math.max(0,p.buff-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.dodgeCD=Math.max(0,p.dodgeCD-dt);
    if(this.dead)return;
    p.stamina=Math.min(100,p.stamina+dt*(p.action||p.dodge>0?4:23));
    if(p.z>6)p.hp=Math.min(p.maxHp,p.hp+dt*8);
    if(input.attack&&!p.action)this.startAttack('basic',input.aim);
    const moving=Math.hypot(input.x,input.z)>.05;p.moving=moving;
    if(p.dodge>0){this.move(p,p.dodgeX*7.8*dt,p.dodgeZ*7.8*dt);p.dodge=Math.max(0,p.dodge-dt);p.dodgeAge+=dt;}
    else{const speed=p.action?1.25:3.4;this.move(p,input.x*speed*dt,input.z*speed*dt);if(!p.action){const target=Number.isFinite(input.aim)?input.aim:moving?Math.atan2(input.x,input.z):p.angle;p.angle+=angleDelta(target,p.angle)*Math.min(1,dt*16);}}
    const a=p.action;
    if(a){
      a.age+=dt;p.angle=a.angle;
      if(a.age>=a.windup&&a.age<a.windup+a.active){
        if(!a.applied){a.applied=true;this.emit('swing',{kind:a.kind,weapon:a.weapon,x:p.x,z:p.z,angle:p.angle});if(a.kind==='cry'){p.buff=6;for(const e of this.enemies)if(e.hp>0&&dist(p,e)<5)e.stagger=1.8;}}
        if(a.damage>0){for(const e of this.enemies)if(e.hp>0&&!a.hits.has(e.id)&&inArc(p,e,a.range,a.arc,a.angle)){a.hits.add(e.id);this.damageEnemy(e,a.damage,a.kind==='slam'?1.1:a.weapon==='axe'?.5:.18);const d=dist(p,e)||1;this.move(e,(e.x-p.x)/d*.16,(e.z-p.z)/d*.16);}
          if(s.hp>0&&!a.hits.has('shard')&&inArc(p,s,a.range,a.arc,a.angle)){a.hits.add('shard');this.damageShard(a.damage);}}
      }
      if(a.age>=a.windup+a.active+a.recovery){p.action=null;p.comboUntil=this.time+.85;}
    }
    for(const e of this.enemies){
      e.flash=Math.max(0,e.flash-dt);if(e.hp<=0)continue;
      const d=ENEMIES[e.kind];
      if(e.stagger>0){e.stagger-=dt;e.phase='idle';continue;}
      if(e.phase==='windup'){e.timer-=dt;if(e.timer<=0){e.phase='recovery';e.timer=d.recovery;if(inArc(e,{...p,radius:.28},d.range,e.kind==='wolf'?1.0:1.8,e.angle))this.hurtPlayer(d.damage);this.emit('enemyStrike',{id:e.id});}continue;}
      if(e.phase==='recovery'){e.timer-=dt;if(e.timer<=0)e.phase='idle';continue;}
      const distance=dist(e,p),aggro=p.z<=6&&distance<10&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)<14;
      const target=aggro?p:{x:e.homeX,z:e.homeZ};
      if(aggro&&distance<d.range+.06){e.phase='windup';e.timer=d.windup;e.angle=bearing(e,p);this.emit('enemyWindup',{id:e.id});continue;}
      if(dist(e,target)>.2){const a=bearing(e,target);e.angle+=angleDelta(a,e.angle)*Math.min(1,dt*8);const x=Math.sin(a)*d.speed*dt,z=Math.cos(a)*d.speed*dt,oldX=e.x,oldZ=e.z;this.move(e,x,z);if(Math.hypot(e.x-oldX,e.z-oldZ)<dt*.1){const turn=a+(e.id%2?1:-1)*1.2;this.move(e,Math.sin(turn)*d.speed*dt,Math.cos(turn)*d.speed*dt);}e.walk+=dt*d.speed*3;}
      for(const other of this.enemies){if(other===e||other.hp<=0)continue;const sep=dist(e,other);if(sep<.75&&sep>.001)this.move(e,(e.x-other.x)/sep*dt*.55,(e.z-other.z)/sep*dt*.55);}
    }
    if(s.blast>0){s.blast-=dt;if(s.blast<=0){s.exploded=true;if(dist(p,s)<4.2)this.hurtPlayer(38);for(const e of this.enemies)if(e.hp>0&&dist(e,s)<4.2)this.damageEnemy(e,85,1);this.emit('explosion',{x:s.x,z:s.z});}}
  }
  telemetry(){const p=this.player;return{hp:p.hp,stamina:p.stamina,weapon:p.weapon,attackPhase:this.phase,combo:p.combo,attacks:this.attacks,hits:this.hits,kills:this.kills,dodges:this.dodges,damageTaken:this.damageTaken,skillsUsed:{...this.skillsUsed},weaponsUsed:{...this.weaponsUsed},cooldowns:{...p.cooldowns},buff:p.buff,shardHp:this.shard.hp,shardsDestroyed:this.shard.exploded?1:0,complete:this.complete,alive:this.enemies.filter(e=>e.hp>0).length,enemies:this.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,hp:e.hp,phase:e.phase}))};}
}
