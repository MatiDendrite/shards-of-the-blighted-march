import * as T from 'three';
import {inTown} from './world-map.js';
import { ASSET, bakeStatic } from '../lib/assetlib.js';
import { WEAPONS,enemyAttack,windupProgress } from './combat-model.js';
import { REGIONS } from './campaign-data.js';
import { attackPose,createHeroMotion } from './combat-motion.js';
import { createCombatEffects } from './combat-effects.js';
import { createCombatRings } from './combat-rings.js';
import { createTextWriter } from './hud-bindings.js';

export function mergeJoints(root){const nodes=[],owned=[];root.traverse(n=>{if(n.isGroup)nodes.push(n);});for(const node of nodes){const meshes=node.children.filter(n=>n.isMesh);if(meshes.length<2)continue;const rigid=new T.Group();meshes.forEach(m=>rigid.add(m));const baked=bakeStatic(rigid);baked.traverse(o=>{if(o.isMesh)owned.push(o.geometry);});node.add(baked);}return owned;}

// Three clones userData through JSON. Live joint references are animation
// handles, not serializable model data: copying them duplicates whole subtrees.
export function cloneActor(root){
 const originals=[];root.traverse(node=>{if(Object.hasOwn(node.userData,'joints')){originals.push([node,node.userData]);const {joints,...metadata}=node.userData;node.userData=metadata;}});
 try{return root.clone(true);}finally{for(const [node,metadata] of originals)node.userData=metadata;}
}

export async function loadCombatAssets(){
 const ids={sword:'iron_sword',axe:'bearded_axe',spear:'ash_spear',wolf:'blighted_wolf',boss:'fallen_warden',shard:'blighted_shard'};
 const assets={};await Promise.all(Object.entries(ids).map(async([id,file])=>{const asset=await ASSET(new URL(`../assets/${file}.js`,import.meta.url).href,{keepHierarchy:id==='wolf'||id==='boss',surfaces:true});let count=0;asset.traverse(o=>{if(o.isMesh)count++;});if(!count)throw Error(`Missing combat asset: ${file}`);assets[id]=asset;}));
 // Rigid geometry is identical for every instance: merge once, not per spawn.
 for(const kind of ['wolf','boss']){mergeJoints(assets[kind]);assets[kind].traverse(o=>{delete o.userData.joints;});}
 return assets;
}
export async function createCombatView(scene,hero,model,audio,options={}){
 const assets=options.assets||await loadCombatAssets(),prepare=options.prepare||(()=>{});
 // Freeze a neutral, unequipped actor, not the live player's current attack pose.
 // Cloning yaw PI canonicalises Euler angles to (PI, 0, PI). Updating only yaw
 // and roll then left a hidden pitch PI: the raider's body pointed underground.
 assets.raider=cloneActor(hero);assets.raider.position.set(0,0,0);assets.raider.rotation.set(0,0,0);
 // Enemy joints are resolved by name below. Serialized Object3D declarations
 // are not animation state and would otherwise duplicate large JSON trees on clone.
 assets.raider.traverse(o=>{delete o.userData.joints;});
 const impacts=createCombatEffects(scene),rings=createCombatRings(scene,prepare),text=createTextWriter();
 const joints=hero.userData.joints,weaponMount=new T.Group();weaponMount.position.set(0,-.53,.04);weaponMount.rotation.x=Math.PI/2;joints.rightArm.add(weaponMount);
 const animateHero=createHeroMotion(hero);
 let weapon='';const views=new Map(),labels=document.querySelector('#enemy-labels'),numbers=[];
 const shard=assets.shard;shard.position.set(model.shard.x,.05,model.shard.z);scene.add(shard);
 const shardLight=new T.PointLight(0x9972e0,9,10,2);shardLight.position.set(model.shard.x,1.8,model.shard.z);scene.add(shardLight);
 const shardLabel=makeLabel('Blighted Shard',true);let flash=0,shake=0,noticeTimer=0;
 const blastRing=new T.Mesh(new T.RingGeometry(3.9,4.2,64),new T.MeshBasicMaterial({color:0xbe85ff,side:T.DoubleSide,transparent:true,opacity:.5,depthWrite:false}));blastRing.rotation.x=-Math.PI/2;blastRing.position.set(model.shard.x,.09,model.shard.z);blastRing.visible=false;scene.add(blastRing);
 function makeLabel(name,isShard=false){const el=document.createElement('div');el.className='enemy-label'+(isShard?' shard':'');const title=document.createElement('span');title.textContent=name;const bar=document.createElement('div'),fill=document.createElement('i');bar.append(fill);el.append(title,bar);labels.append(el);return{el,fill};}
 function createEnemy(e){
  const root=assets[e.kind].clone(true);root.rotation.set(0,0,0);
  // Hero clone includes the player's weapon; remove it before attaching enemy equipment.
  if(e.kind!=='wolf'){root.traverse(o=>{if(o.name==='heroWeaponMount')o.visible=false;});}
  const nodes={},materials=new Map();root.traverse(o=>{if(o.isGroup&&o.name)nodes[o.name]=o;if(o.isMesh){if(!materials.has(o.material)){const m=o.material.clone();if(e.kind==='raider'){m.color.multiplyScalar(.76);if(m.name==='fabric')m.color.setHex(0x39463a);}m.userData.restEmissive=m.emissive.clone();materials.set(o.material,m);}o.material=materials.get(o.material);}});
  if(e.kind!=='wolf'&&nodes.rightArm){const blade=assets.axe.clone();blade.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.userData.restEmissive=o.material.emissive.clone();}});blade.position.set(.12,e.kind==='boss'?-.98:-.76,.02);blade.rotation.x=Math.PI/2;if(e.kind==='boss')blade.scale.setScalar(1.65);nodes.rightArm.add(blade);}
  const d=enemyAttack({...e,attackKind:'sweep'}),sweep=new T.CircleGeometry(d.range+.28,48,-Math.PI/2-d.arc/2,d.arc),slam=e.kind==='boss'?new T.CircleGeometry(enemyAttack({...e,attackKind:'slam'}).range+.28,64):null;
  const telegraph=new T.Mesh(sweep,new T.MeshBasicMaterial({color:0xe0a949,side:T.DoubleSide,transparent:true,opacity:.32,depthWrite:false}));telegraph.rotation.x=-Math.PI/2;telegraph.visible=false;scene.add(telegraph);scene.add(root);
  const name=e.kind==='boss'?'The Fallen Warden':e.kind==='wolf'?'Blighted Wolf':'Hollow Raider';
  const edgeGeometry=new T.RingGeometry(d.range+.20,d.range+.28,48,1,-Math.PI/2-d.arc/2,d.arc),slamEdge=e.kind==='boss'?new T.RingGeometry(4.7,4.78,64):null;
  const edge=new T.Mesh(edgeGeometry,new T.MeshBasicMaterial({color:d.color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));edge.rotation.x=-Math.PI/2;edge.visible=false;scene.add(edge);
  const label=makeLabel(name),flashMaterials=new Set();root.traverse(o=>{if(o.isMesh&&o.material.emissive)flashMaterials.add(o.material);});prepare(root);prepare(telegraph);prepare(edge);const view={root,nodes,telegraph,edge,edgeGeometry,slamEdge,name,label,flashMaterials,flashing:false,sweep,slam,deathAge:0};views.set(e.id,view);return view;
 }
 weaponMount.name='heroWeaponMount';
 function equip(){if(weapon===model.player.weapon)return;weapon=model.player.weapon;weaponMount.clear();const obj=assets[weapon].clone();obj.position.y=weapon==='sword'?-.21:weapon==='axe'?-.26:-.85;if(weapon==='axe')obj.position.x=.15;weaponMount.add(obj);document.querySelector('#weapon-name').textContent=WEAPONS[weapon].name;document.querySelector('#weapon-button span').textContent=WEAPONS[weapon].name;}
 const ring=rings.pulse;
 function notice(text,duration=3.5){document.querySelector('#notice').textContent=text;document.querySelector('#notice').hidden=false;noticeTimer=duration;}
 function process(events){for(const e of events){
  if(e.type==='swing'){audio.play(e.kind==='cry'?'cry':e.weapon==='axe'?'heavySwing':'swing');if(e.kind==='slam'||e.kind==='cry')ring(e.x,e.z,e.kind==='cry'?'#c3c992':'#d1ad70',e.kind==='cry'?5:3.5);else rings.swing(e);}
  if(e.type==='hit'){audio.play(e.heavy?'heavyHit':'hit');impacts.burst(e);const el=document.createElement('div');el.className='damage-number'+(e.heavy?' heavy':'');el.textContent=`${Math.round(e.amount)}${e.finisher?' · FINISHER':e.interrupted?' · INTERRUPT':''}`;labels.append(el);numbers.push({el,x:e.x,z:e.z,y:e.target==='boss'?3.45:e.target==='shard'?3.85:e.target==='wolf'?1.95:2.5,age:0});shake=e.heavy?.085:.04;}
  if(e.type==='hurt'){audio.play('hurt');flash=.5;shake=.13;}
  if(e.type==='dodge'){audio.play('dodge');ring(model.player.x,model.player.z,0xc1d6c5,.65);}
  if(e.type==='equip')audio.play('equip');
  if(e.type==='wave')notice(`The shard calls its guardians · Wave ${e.wave}`);
  if(e.type==='shardBreak')notice('Get back! The shard is about to erupt.');
  if(e.type==='explosion'){audio.play('explosion');ring(e.x,e.z,0xbf8aff,4.2);shake=.23;}
  if(e.type==='bossStrike'){audio.play(e.slam?'explosion':'swing');if(e.slam)ring(e.x,e.z,0xb58aed,4.5);shake=e.slam?.2:.08;}
  if(e.type==='notice')notice(e.text);
  if(e.type==='death')audio.play('death');
 }}
 const projected=new T.Vector3(),hudPanels=[...document.querySelectorAll('#action-bar,#location,#utility,#objective,#navigation-map,#boss-bar')];let hudBounds=[];
 function positionLabel(label,x,y,z,camera){projected.set(x,y,z).project(camera);const sx=(projected.x*.5+.5)*innerWidth,sy=(-projected.y*.5+.5)*innerHeight;const behindHud=label.fill&&hudBounds.some(r=>sx+45>r.left&&sx-45<r.right&&sy>r.top&&sy-32<r.bottom);const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.2&&!behindHud;label.el.hidden=!visible;if(visible){label.el.style.left=`${sx}px`;label.el.style.top=`${sy}px`;}}
 function update(dt,camera){
  equip();const p=model.player,a=p.action;impacts.update(dt);hudBounds=hudPanels.map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
  animateHero(p,model.time);
  for(const e of model.enemies){const near=(e.x-p.x)**2+(e.z-p.z)**2<44**2;let v=views.get(e.id);if(!v){if(e.hp<=0||!near)continue;v=createEnemy(e);}v.root.position.set(e.x,.06,e.z);v.root.rotation.set(0,e.angle,0);
    if(e.hp<=0){v.deathAge+=dt;v.root.rotation.z=Math.min(Math.PI/2,v.deathAge*3);v.root.position.y=.06-Math.max(0,v.deathAge-1)*.5;v.root.visible=v.deathAge<2.8;v.label.el.hidden=true;v.telegraph.visible=v.edge.visible=false;continue;}
    v.root.visible=near;if(!near){v.label.el.hidden=true;v.telegraph.visible=v.edge.visible=false;continue;}
    const flashing=e.flash>0;if(flashing!==v.flashing){for(const m of v.flashMaterials){if(flashing)m.emissive.setHex(0x392e20);else m.emissive.copy(m.userData.restEmissive);}v.flashing=flashing;}
    v.root.rotation.z=e.flash>0?Math.sin(e.flash/.18*Math.PI)*.075:0;
    const d=enemyAttack(e),charge=windupProgress(e),swing=e.phase==='idle'?Math.sin(e.walk)*.48:0;
    if(e.kind==='wolf'){for(const [name,sign] of [['leftFront',1],['rightFront',-1],['leftRear',-1],['rightRear',1]])if(v.nodes[name])v.nodes[name].rotation.x=swing*sign;v.nodes.head.rotation.x=e.phase==='windup'?-.23:0;v.root.position.y+=e.phase==='windup'?-.1:e.phase==='recovery'?Math.sin(Math.min(1,(.9-e.timer)/.3)*Math.PI)*.23:0;}
    else{v.nodes.leftLeg.rotation.x=swing;v.nodes.rightLeg.rotation.x=-swing;const follow=e.phase==='recovery'?Math.max(0,1-(d.recovery-e.timer)/.4):0;v.nodes.rightArm.rotation.x=e.phase==='windup'?-1.1-charge*1.25:e.phase==='recovery'?-.35-follow*.4:0;v.nodes.rightArm.rotation.z=e.phase==='windup'&&e.attackKind!=='slam'?-.35*charge:0;v.nodes.torso.rotation.y=e.phase==='windup'?-.22*charge:follow*.22;
      if(v.nodes.leftShin)v.nodes.leftShin.rotation.x=Math.max(0,-swing)*.8;if(v.nodes.rightShin)v.nodes.rightShin.rotation.x=Math.max(0,swing)*.8;
    }
    if(e.kind==='boss'){v.telegraph.geometry=e.attackKind==='slam'?v.slam:v.sweep;v.telegraph.material.color.setHex(e.attackKind==='slam'?0xb889f0:0xe0a949);}
    v.telegraph.visible=v.edge.visible=e.phase==='windup';v.telegraph.position.set(e.x,.11,e.z);v.telegraph.rotation.z=e.angle;v.telegraph.material.opacity=.12+charge*.30;
    v.edge.geometry=e.kind==='boss'&&e.attackKind==='slam'?v.slamEdge:v.edgeGeometry;v.edge.material.color.setHex(d.color);v.edge.position.set(e.x,.115,e.z);v.edge.rotation.z=e.angle;v.edge.material.opacity=.55+charge*.4;
    const title=e.phase==='windup'?`${d.name} · ${Math.max(0,e.timer).toFixed(1)}s`:v.name;if(v.label.el.firstChild.textContent!==title)v.label.el.firstChild.textContent=title;
    positionLabel(v.label,e.x,e.kind==='boss'?3.1:e.kind==='wolf'?1.55:2.1,e.z,camera);v.label.fill.style.width=`${e.hp/e.maxHp*100}%`;
    // The dedicated boss HUD already shows health and cast timing. A second
    // world-space name overlaps it when the Warden is north of the player.
    if(e.kind==='boss')v.label.el.hidden=true;
  }
  if(a){const pose=attackPose(a),slam=a.kind==='slam',cry=a.kind==='cry',thrust=a.weapon==='spear'&&!slam&&!cry;
    joints.rightArm.rotation.x=cry?-1.6*pose.lift:thrust?-1.05-pose.thrust*.45:-.25-2*pose.lift+1.9*pose.cut;
    joints.rightArm.rotation.y=slam||cry?0:thrust?-.12:pose.twist*1.25;
    joints.torso.rotation.y=slam||cry?0:pose.twist*.32;weaponMount.position.z=thrust?-.12*pose.lift+pose.thrust*.72:.04;
    if(cry||slam)joints.leftArm.rotation.x=-1.5*pose.lift+1.2*pose.cut;
  }
  else{joints.rightArm.rotation.y=0;joints.torso.rotation.y=0;weaponMount.position.z=.04;}
  if(!p.dodge){if(joints.leftForearm)joints.leftForearm.rotation.x=p.moving?-.12:0;if(joints.rightForearm)joints.rightForearm.rotation.x=a?-.22:0;}
  shard.position.set(model.shard.x,.05,model.shard.z);shardLight.position.set(model.shard.x,1.8,model.shard.z);blastRing.position.set(model.shard.x,.09,model.shard.z);const shardTitle=REGIONS[model.region].shard||'';if(shardLabel.el.firstChild.textContent!==shardTitle)shardLabel.el.firstChild.textContent=shardTitle;
  shard.visible=model.shard.hp>0;shardLight.intensity=shard.visible?6+Math.sin(model.time*2)*2:0;blastRing.visible=model.shard.blast>0;blastRing.material.opacity=.3+Math.sin(model.time*25)**2*.45;
  shardLabel.el.hidden=model.shard.hp<=0;if(model.shard.hp>0){positionLabel(shardLabel,model.shard.x,3.6,model.shard.z,camera);shardLabel.fill.style.width=`${model.shard.hp/model.shard.maxHp*100}%`;}
  rings.update(dt);
  for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.age+=dt;positionLabel({el:n.el},n.x,n.y+n.age,n.z,camera);n.el.style.opacity=1-n.age/.7;if(n.age>.7){n.el.remove();numbers.splice(i,1);}}
  flash=Math.max(0,flash-dt*2);shake=Math.max(0,shake-dt);document.querySelector('#damage-flash').style.opacity=flash;
  noticeTimer-=dt;if(noticeTimer<=0)document.querySelector('#notice').hidden=true;
  document.querySelector('#hp-fill').style.width=`${p.hp/p.maxHp*100}%`;text('#hp-text',`${Math.ceil(p.hp)} / ${p.maxHp}`);
  document.querySelector('#stamina-fill').style.width=`${p.stamina}%`;text('#stamina-text',Math.floor(p.stamina));
  text('#status-text',p.buff>0?`Battle Cry · ${Math.ceil(p.buff)}s · +35% damage`:inTown(p.x,p.z)?'Settlement · health recovers here':`Combo ${p.combo || '—'} · ${model.kills} defeated`);
  for(const [name,cost] of [['cleave',20],['slam',30],['cry',25]]){const button=document.querySelector(`#${name}`);text(`#${name} small`,p.cooldowns[name]>0?`${Math.ceil(p.cooldowns[name])}s`:`${cost} stamina`);button.classList.toggle('unavailable',p.cooldowns[name]>0||p.stamina<cost);}
  document.querySelector('#dodge').classList.toggle('unavailable',p.stamina<25||p.dodgeCD>0);
  return shake;
 }
 function reset(){impacts.clear();rings.clear();for(const v of views.values()){scene.remove(v.root,v.telegraph,v.edge);v.label.el.remove();v.sweep.dispose();v.slam?.dispose();v.edgeGeometry.dispose();v.slamEdge?.dispose();v.telegraph.material.dispose();v.edge.material.dispose();v.flashMaterials.forEach(m=>m.dispose());}views.clear();for(const n of numbers)n.el.remove();numbers.length=0;noticeTimer=flash=shake=0;document.querySelector('#notice').hidden=true;}
 return{update,process,reset,notice,portraitModels:{sword:assets.sword,axe:assets.axe,spear:assets.spear,armor:assets.raider}};
}
