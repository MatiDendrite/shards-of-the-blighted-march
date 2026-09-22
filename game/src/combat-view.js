import * as T from 'three';
import { ASSET, bakeStatic } from '../lib/assetlib.js';
import { WEAPONS } from './combat-model.js';

export function mergeJoints(root){const nodes=[],owned=[];root.traverse(n=>{if(n.isGroup)nodes.push(n);});for(const node of nodes){const meshes=node.children.filter(n=>n.isMesh);if(meshes.length<2)continue;const rigid=new T.Group();meshes.forEach(m=>rigid.add(m));const baked=bakeStatic(rigid);baked.traverse(o=>{if(o.isMesh)owned.push(o.geometry);});node.add(baked);}return owned;}

export async function createCombatView(scene,hero,model,audio){
 const ids={sword:'iron_sword',axe:'bearded_axe',spear:'ash_spear',wolf:'blighted_wolf',shard:'blighted_shard'};
 const assets={};await Promise.all(Object.entries(ids).map(async([id,file])=>{const asset=await ASSET(new URL(`../assets/${file}.js`,import.meta.url).href,{keepHierarchy:id==='wolf',surfaces:true});let count=0;asset.traverse(o=>{if(o.isMesh)count++;});if(!count)throw Error(`Missing combat asset: ${file}`);assets[id]=asset;}));
 const joints=hero.userData.joints,weaponMount=new T.Group();weaponMount.position.set(0,-.53,.04);weaponMount.rotation.x=Math.PI/2;joints.rightArm.add(weaponMount);
 let weapon='';const views=new Map(),labels=document.querySelector('#enemy-labels'),effects=[],numbers=[];
 const shard=assets.shard;shard.position.set(model.shard.x,.05,model.shard.z);scene.add(shard);
 const shardLight=new T.PointLight(0x9972e0,9,10,2);shardLight.position.set(model.shard.x,1.8,model.shard.z);scene.add(shardLight);
 const shardLabel=makeLabel('Blighted Shard',true);let flash=0,shake=0,noticeTimer=0;
 const blastRing=new T.Mesh(new T.RingGeometry(3.9,4.2,64),new T.MeshBasicMaterial({color:0xbe85ff,side:T.DoubleSide,transparent:true,opacity:.5,depthWrite:false}));blastRing.rotation.x=-Math.PI/2;blastRing.position.set(model.shard.x,.09,model.shard.z);blastRing.visible=false;scene.add(blastRing);
 function makeLabel(name,isShard=false){const el=document.createElement('div');el.className='enemy-label'+(isShard?' shard':'');const title=document.createElement('span');title.textContent=name;const bar=document.createElement('div'),fill=document.createElement('i');bar.append(fill);el.append(title,bar);labels.append(el);return{el,fill};}
 function createEnemy(e){
  const root=(e.kind==='wolf'?assets.wolf:hero).clone(true);
  // Hero clone includes the player's weapon; remove it before attaching enemy equipment.
  if(e.kind==='raider'){root.traverse(o=>{if(o.name==='heroWeaponMount')o.visible=false;});}
  const nodes={};root.traverse(o=>{if(o.isGroup&&o.name)nodes[o.name]=o;if(o.isMesh){o.material=o.material.clone();if(e.kind==='raider'){o.material.color.multiplyScalar(.62);if(o.material.name==='fabric')o.material.color.setHex(0x39463a);}}});
  const ownedGeometries=e.kind==='wolf'?mergeJoints(root):[];
  if(e.kind==='raider'&&nodes.rightArm){const blade=assets.axe.clone();blade.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});blade.position.set(.12,-.76,.02);blade.rotation.x=Math.PI/2;nodes.rightArm.add(blade);}
  const telegraph=new T.Mesh(new T.CircleGeometry(e.kind==='wolf'?1.65:2.2,28,-Math.PI/2-.9,1.8),new T.MeshBasicMaterial({color:0xe0a949,side:T.DoubleSide,transparent:true,opacity:.32,depthWrite:false}));telegraph.rotation.x=-Math.PI/2;telegraph.visible=false;scene.add(telegraph);scene.add(root);
  const label=makeLabel(e.kind==='wolf'?'Blighted Wolf':'Hollow Raider');const view={root,nodes,telegraph,label,ownedGeometries,deathAge:0};views.set(e.id,view);return view;
 }
 weaponMount.name='heroWeaponMount';
 function equip(){if(weapon===model.player.weapon)return;weapon=model.player.weapon;weaponMount.clear();const obj=assets[weapon].clone();obj.position.y=weapon==='sword'?-.21:weapon==='axe'?-.26:-.85;if(weapon==='axe')obj.position.x=.15;weaponMount.add(obj);document.querySelector('#weapon-name').textContent=WEAPONS[weapon].name;document.querySelector('#weapon-button span').textContent=WEAPONS[weapon].name;}
 function ring(x,z,color,size=1){const mesh=new T.Mesh(new T.RingGeometry(.8,1,40),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.75,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.12,z);scene.add(mesh);effects.push({mesh,age:0,life:.45,size});}
 function notice(text){document.querySelector('#notice').textContent=text;document.querySelector('#notice').hidden=false;noticeTimer=2.5;}
 function process(events){for(const e of events){
  if(e.type==='swing'){audio.play(e.kind==='cry'?'cry':'swing');if(e.kind==='slam'||e.kind==='cry')ring(e.x,e.z,e.kind==='cry'?'#c3c992':'#d1ad70',e.kind==='cry'?5:3.5);else{const arc=model.player.action?.arc||1.8,range=model.player.action?.range||2;const mesh=new T.Mesh(new T.RingGeometry(range-.2,range,24,1,-Math.PI/2-arc/2,arc),new T.MeshBasicMaterial({color:e.weapon==='axe'?0xe6b377:0xd3e3db,side:T.DoubleSide,transparent:true,opacity:.55,depthWrite:false}));mesh.rotation.set(-Math.PI/2,0,e.angle);mesh.position.set(e.x,.8,e.z);scene.add(mesh);effects.push({mesh,age:0,life:.16,size:1,fixed:true});}}
  if(e.type==='hit'){audio.play('hit');const el=document.createElement('div');el.className='damage-number';el.textContent=Math.round(e.amount);labels.append(el);numbers.push({el,x:e.x,z:e.z,age:0});shake=.05;}
  if(e.type==='hurt'){audio.play('hurt');flash=.5;shake=.13;}
  if(e.type==='dodge'){audio.play('dodge');ring(model.player.x,model.player.z,0xc1d6c5,.65);}
  if(e.type==='equip')audio.play('equip');
  if(e.type==='wave')notice(`The shard calls its guardians · Wave ${e.wave}`);
  if(e.type==='shardBreak')notice('Get back! The shard is about to erupt.');
  if(e.type==='explosion'){audio.play('explosion');ring(e.x,e.z,0xbf8aff,4.2);shake=.23;}
  if(e.type==='notice')notice(e.text);
  if(e.type==='death')audio.play('death');
 }}
 const projected=new T.Vector3();
 function positionLabel(label,x,y,z,camera){projected.set(x,y,z).project(camera);const sx=(projected.x*.5+.5)*innerWidth,sy=(-projected.y*.5+.5)*innerHeight;const mobile=document.body.classList.contains('touch');const behindHud=label.fill&&(mobile?sy<245||(sy>innerHeight-250&&sx>innerWidth-195):sy<205&&(sx<265||sx>innerWidth-300));const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.2&&!behindHud;label.el.hidden=!visible;if(visible){label.el.style.left=`${sx}px`;label.el.style.top=`${sy}px`;}}
 function update(dt,camera){
  equip();const p=model.player,a=p.action;
  for(const e of model.enemies){const v=views.get(e.id)||createEnemy(e);v.root.position.set(e.x,.06,e.z);v.root.rotation.y=e.angle;
    if(e.hp<=0){v.deathAge+=dt;v.root.rotation.z=Math.min(Math.PI/2,v.deathAge*3);v.root.position.y=.06-Math.max(0,v.deathAge-1)*.5;v.root.visible=v.deathAge<2.8;v.label.el.hidden=true;v.telegraph.visible=false;continue;}
    v.root.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissive.setHex(e.flash>0?0x76442e:0x000000);});
    const swing=Math.sin(e.walk)*.48;
    if(e.kind==='wolf'){for(const [name,sign] of [['leftFront',1],['rightFront',-1],['leftRear',-1],['rightRear',1]])if(v.nodes[name])v.nodes[name].rotation.x=swing*sign;v.nodes.head.rotation.x=e.phase==='windup'?-.23:0;v.root.position.y+=e.phase==='windup'?-.1:e.phase==='recovery'?Math.sin(Math.min(1,(.9-e.timer)/.3)*Math.PI)*.23:0;}
    else{v.nodes.leftLeg.rotation.x=swing;v.nodes.rightLeg.rotation.x=-swing;v.nodes.rightArm.rotation.x=e.phase==='windup'?-2.2:e.phase==='recovery'?-.9:0;}
    v.telegraph.visible=e.phase==='windup';v.telegraph.position.set(e.x,.10,e.z);v.telegraph.rotation.z=e.angle;v.telegraph.material.opacity=.25+.25*Math.sin(model.time*20)**2;
    positionLabel(v.label,e.x,e.kind==='wolf'?1.55:2.1,e.z,camera);v.label.fill.style.width=`${e.hp/e.maxHp*100}%`;
  }
  if(a){const duration=a.windup+a.active+a.recovery,t=a.age/duration,peak=Math.sin(Math.min(1,t)*Math.PI);joints.rightArm.rotation.x=a.weapon==='spear'?-1.1-peak*.5:-.6-peak*1.7;joints.rightArm.rotation.y=a.weapon==='spear'?-.15:Math.sin(t*Math.PI*2)*(a.combo===2?-1:1)*1.15;joints.torso.rotation.y=a.weapon==='spear'?0:Math.sin(t*Math.PI*2)*.25;weaponMount.position.z=a.weapon==='spear'?peak*.8:.04;}
  else{joints.rightArm.rotation.y=0;joints.torso.rotation.y=0;weaponMount.position.z=.04;}
  hero.rotation.x=p.dodge>0?-.35:0;
  shard.visible=model.shard.hp>0;shardLight.intensity=shard.visible?6+Math.sin(model.time*2)*2:0;blastRing.visible=model.shard.blast>0;blastRing.material.opacity=.3+Math.sin(model.time*25)**2*.45;
  shardLabel.el.hidden=model.shard.hp<=0;if(model.shard.hp>0){positionLabel(shardLabel,model.shard.x,3.6,model.shard.z,camera);shardLabel.fill.style.width=`${model.shard.hp/model.shard.maxHp*100}%`;}
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;if(!e.fixed)e.mesh.scale.setScalar(e.size*(.3+e.age/e.life*.7));e.mesh.material.opacity=Math.max(0,1-e.age/e.life)*.6;if(e.age>=e.life){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1);}}
  for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.age+=dt;positionLabel({el:n.el},n.x,1.8+n.age,n.z,camera);n.el.style.opacity=1-n.age/.7;if(n.age>.7){n.el.remove();numbers.splice(i,1);}}
  flash=Math.max(0,flash-dt*2);shake=Math.max(0,shake-dt);document.querySelector('#damage-flash').style.opacity=flash;
  noticeTimer-=dt;if(noticeTimer<=0)document.querySelector('#notice').hidden=true;
  document.querySelector('#hp-fill').style.width=`${p.hp/p.maxHp*100}%`;document.querySelector('#hp-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
  document.querySelector('#stamina-fill').style.width=`${p.stamina}%`;document.querySelector('#stamina-text').textContent=Math.floor(p.stamina);
  document.querySelector('#status-text').textContent=p.buff>0?`Battle Cry · ${Math.ceil(p.buff)}s · +35% damage`:p.z>6?'Safe ground · health recovers here':`Combo ${p.combo || '—'} · ${model.kills} defeated`;
  for(const [name,cost] of [['cleave',20],['slam',30],['cry',25]]){const button=document.querySelector(`#${name}`);button.querySelector('small').textContent=p.cooldowns[name]>0?`${Math.ceil(p.cooldowns[name])}s`:`${cost} stamina`;button.classList.toggle('unavailable',p.cooldowns[name]>0||p.stamina<cost);}
  document.querySelector('#dodge').classList.toggle('unavailable',p.stamina<25||p.dodgeCD>0);
  document.querySelector('#objective-text').textContent=model.shard.hp>0?'Destroy the shard beyond the lanterns.':model.shard.blast>0?'Get outside the violet blast circle!':model.complete?'The clearing is safe again.':'Defeat the remaining guardians.';
  return shake;
 }
 function reset(){for(const v of views.values()){scene.remove(v.root,v.telegraph);v.label.el.remove();v.telegraph.geometry.dispose();v.telegraph.material.dispose();v.ownedGeometries.forEach(g=>g.dispose());v.root.traverse(o=>{if(o.isMesh)o.material.dispose();});}views.clear();for(const n of numbers)n.el.remove();numbers.length=0;for(const e of effects){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}effects.length=0;noticeTimer=flash=shake=0;document.querySelector('#notice').hidden=true;}
 return{update,process,reset,notice};
}
