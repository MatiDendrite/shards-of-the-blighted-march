import * as T from 'three';
import { ASSET } from '../lib/assetlib.js';
import { createRig } from '../lib/rig.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { Combat } from './combat-model.js';
import { createCombatView, mergeJoints } from './combat-view.js';
import { createAudio } from './audio.js';
import { loadArt } from './art.js';
import { Progression,saveStore } from './progression.js';
import { createRpgView } from './rpg-view.js';

const $=s=>document.querySelector(s);
window.__READY__=false;
async function boot(){
  const canvas=$('#world'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,140);
  const rig=createRig(T,renderer,scene,{tier:'phone',hour:17.4,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:55,exposure:1.12,sunColor:0xd2d7cb,sunIntensity:1.8,fill:1.6,envIntensity:.45,bounce:.3,fogStart:12,fogDensity:.032});
  const art=await loadArt(renderer),world=await createWorld(scene,art);
  const hero=await ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{keepHierarchy:true,height:1.85,surfaces:true});
  if(!hero.userData.joints?.leftLeg)throw new Error('The Wanderer joint hierarchy did not load.');
  const joints=hero.userData.joints;
  mergeJoints(hero);
  scene.add(hero);hero.position.set(0,.06,11);hero.rotation.y=Math.PI;
  const ring=new T.Mesh(new T.RingGeometry(.40,.425,40),new T.MeshBasicMaterial({color:0xc9c4a0,transparent:true,opacity:.32,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
  const input=createInput(canvas),look=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),aim=new T.Vector3();
  const model=new Combat((x,z)=>world.canStand(x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12));
  const audio=createAudio(),combatView=await createCombatView(scene,hero,model,audio);
  const store=saveStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}),saved=store.load();
  let progress=new Progression(saved);progress.restore(model);
  const save=()=>store.write(progress.snapshot(model));
  const rpgView=await createRpgView(scene,progress,model,store,save);
  let started=false,paused=false,zoom=.88,walk=0,elapsed=0,acc=0,last=performance.now(),fps=60,hitStop=0,won=false,ended=false,saveTimer=0,actualSpeed=0;
  if(saved)$('#startb').firstChild.textContent='Continue journey ';
  function closeBag(){if($('#inventory').hidden)return;$('#inventory').hidden=true;paused=false;input.clear();document.activeElement?.blur();}
  function openBag(mode){if(!started||model.dead||!$('#victory').hidden||!$('#pause').hidden)return;if(!$('#inventory').hidden){closeBag();return;}if(mode==='smith'&&!progress.nearSmith(model.player)){combatView.notice('Borin is southwest of the starting lanterns.');return;}paused=true;input.clear();rpgView.open(mode);}
  $('#bag-button').onclick=()=>openBag('inventory');$('#smith-button').onclick=()=>openBag('smith');$('#bag-close').onclick=closeBag;
  $('#potion-button').onclick=()=>{if(started&&!paused&&progress.potion(model)){save();combatView.notice('Healing draught · +65 health');}};
  addEventListener('keydown',e=>{if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='KeyI'){e.preventDefault();openBag('inventory');}if(e.code==='KeyE'){e.preventDefault();openBag('smith');}});
  addEventListener('pagehide',()=>{if(started)save();});
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
  addEventListener('resize',resize);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.00045,.7,1.35);},{passive:false});
  function pause(value){if(!started||model.dead||!$('#victory').hidden)return;if(!$('#inventory').hidden){closeBag();return;}paused=value;$('#pause').hidden=!value;input.clear();if(!value)audio.unlock();else save();}
  $('#menu-button').onclick=()=>pause(true);$('#resume').onclick=()=>pause(false);
  addEventListener('keydown',e=>{if(e.code==='Escape')pause(!paused);});
  addEventListener('blur',()=>{if($('#inventory').hidden)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(started)save();if($('#inventory').hidden)pause(true);}});
  $('#quality').onchange=e=>{renderer.setPixelRatio(e.target.value==='high'?Math.min(devicePixelRatio,1.5):1);resize();};
  function reset(fresh=false){combatView.reset();rpgView.clearDrops();if(fresh===true){model.reset();progress.potionCD=0;progress.messages.length=0;progress.sync(model,true);}else progress.nextRun(model);input.clear();hitStop=0;won=ended=paused=false;acc=0;hero.rotation.x=0;hero.position.set(0,.06,11);hero.rotation.y=Math.PI;zoom=.88;for(const id of ['#pause','#defeat','#victory','#inventory'])$(id).hidden=true;save();audio.unlock();document.activeElement?.blur();}
  $('#reset-view').onclick=reset;$('#retry').onclick=reset;$('#replay').onclick=reset;
  $('#explore').onclick=()=>{$('#victory').hidden=true;paused=false;input.clear();};
  $('#sound').onchange=e=>audio.setMuted(!e.target.checked);
  $('#startb').onclick=()=>{audio.unlock();started=true;$('#welcome').hidden=true;$('#hud').hidden=false;input.clear();save();document.activeElement?.blur();};
  $('#reset-view').textContent='Start another hunt · keep equipment';
  const fresh=document.createElement('button');fresh.id='new-journey';fresh.textContent='New journey · erase local progress';$('#pause').append(fresh);fresh.onclick=()=>{if(!confirm('Erase your saved level, equipment and gold on this browser?'))return;progress.data=new Progression().data;progress.revision++;store.allowNew();reset(true);};
  await rig.ready;
  // An overcast palette: keep the rig's directional haze while removing sunset amber.
  for(const [key,rgb] of Object.entries({Horizon:[.16,.23,.26],Low:[.13,.20,.24],Mid:[.08,.13,.18],High:[.05,.09,.14],Zenith:[.035,.065,.10],Haze:[.16,.23,.26],Below:[.06,.09,.08],SunGlow:[.2,.24,.25]}))rig.atmos[`uAtm${key}`].value.setRGB(...rgb);
  rig.refresh(scene);
  function sim(dt){
    if(!started||paused||model.dead)return;
    const m=input.read(),p=model.player;
    const moving=Math.hypot(m.x,m.z)>.08;
    let angle=p.angle;
    if(moving)angle=Math.atan2(m.x,m.z);
    if(input.pointer.active&&!input.isTouch){ray.setFromCamera(input.pointer,camera);if(ray.ray.intersectPlane(plane,aim))angle=Math.atan2(aim.x-p.x,aim.z-p.z);}
    const actions=input.consume();
    if(input.isTouch&&(m.attack||actions.some(a=>['attack','cleave','slam'].includes(a)))){
      const candidates=[...model.enemies.filter(e=>e.hp>0),...(model.shard.hp>0?[model.shard]:[])].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<4.2).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
      if(candidates.length)angle=Math.atan2(candidates[0].x-p.x,candidates[0].z-p.z);
    }
    for(const action of actions){if(action==='weapon'){model.cycleWeapon();progress.sync(model);}else if(action==='potion'){if(progress.potion(model))save();}else if(action==='dodge')model.dodge(m.x,m.z);else model.startAttack(action==='attack'?'basic':action,angle);}
    const oldX=p.x,oldZ=p.z;model.update(dt,{...m,aim:angle});actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;hero.position.set(p.x,.06,p.z);hero.rotation.y=p.angle;
    const revision=progress.revision,events=model.consume();progress.events(events,model);progress.tick(dt);progress.collect(p);combatView.process(events);if(events.some(e=>e.type==='hit'))hitStop=.035;
    if(progress.messages.length){combatView.notice(progress.messages.at(-1));progress.messages.length=0;}
    saveTimer+=dt;if(progress.revision!==revision||saveTimer>5){save();saveTimer=0;}
    if(moving)walk+=dt*9;
    const swing=moving?Math.sin(walk)*.52:0;
    joints.leftLeg.rotation.x=T.MathUtils.damp(joints.leftLeg.rotation.x,swing,18,dt);
    joints.rightLeg.rotation.x=T.MathUtils.damp(joints.rightLeg.rotation.x,-swing,18,dt);
    joints.leftShin.rotation.x=Math.max(0,-swing)*.9;joints.rightShin.rotation.x=Math.max(0,swing)*.9;
    joints.leftArm.rotation.x=-swing*.65;joints.rightArm.rotation.x=swing*.65;
    joints.torso.position.y=1.13+(moving?Math.abs(Math.sin(walk))*.023:Math.sin(elapsed*1.6)*.006);
    if(model.dead&&!ended){ended=true;input.clear();$('#defeat p').textContent='You lost 10% of your gold. Your equipment and experience are safe. Return to camp and start another hunt.';$('#defeat').hidden=false;save();}
    if(model.complete&&!won&&!model.dead){won=true;paused=true;input.clear();$('#victory-stats').textContent=`${model.kills} guardians defeated · Level ${progress.data.level}. Stay to collect glowing loot and visit Borin. Starting another hunt leaves uncollected loot behind; collected equipment and XP are kept.`;$('#victory').hidden=false;save();}
  }
  function frame(now){
    const realDt=(now-last)/1000;last=now;fps=T.MathUtils.lerp(fps,1/Math.max(realDt,.001),.05);const dt=Math.min(realDt,.1);elapsed+=dt;if(hitStop>0)hitStop=Math.max(0,hitStop-dt);else acc+=dt;
    while(acc>=1/60){sim(1/60);acc-=1/60;}
    const portrait=innerWidth<innerHeight;
    look.copy(hero.position);look.y=.75;
    if(!started){look.set(-.7,.6,-4);desired.set(13,12,18);}else desired.copy(look).add(new T.Vector3(0,(portrait?12:10)*zoom,(portrait?13:11)*zoom));
    camera.position.lerp(desired,1-Math.exp(-dt*6));camera.lookAt(look);
    ring.position.set(hero.position.x,.09,hero.position.z);ring.visible=started;
    if(!paused)world.dust.rotation.y=Math.sin(elapsed*.025)*.045;
    const shake=combatView.update(started&&!paused?dt:0,camera);if(started&&!paused&&$('#shake').checked&&shake>0){camera.position.x+=Math.sin(elapsed*110)*shake;camera.position.y+=Math.cos(elapsed*95)*shake*.5;}
    rpgView.update(started&&!paused?dt:0,camera);
    rig.render(camera,dt);
    const targets=model.enemies.filter(e=>e.hp>0).map(e=>{const s=new T.Vector3(e.x,0,e.z).project(camera);return{id:e.id,x:e.x,z:e.z,hp:e.hp,kind:e.kind,sx:(s.x*.5+.5)*innerWidth,sy:(-s.y*.5+.5)*innerHeight,visible:s.z>-1&&s.z<1&&Math.abs(s.x)<1&&Math.abs(s.y)<1};});
    const shardScreen=new T.Vector3(model.shard.x,0,model.shard.z).project(camera);
    window.__GAME__={pos:[hero.position.x,hero.position.z],fps,speed:started&&!paused&&!model.dead?actualSpeed:0,score:model.kills,over:model.dead,draws:renderer.info.render.calls,tris:renderer.info.render.triangles,started,paused,stage:3,...model.telemetry(),maxHp:model.player.maxHp,targets,rpg:{level:progress.data.level,xp:progress.data.xp,gold:progress.data.gold,ore:progress.data.ore,potions:progress.data.potions,items:progress.data.items.map(i=>({...i})),loadout:{...progress.data.loadout},drops:progress.data.drops.map(d=>({...d})),nearSmith:progress.nearSmith(model.player),save:store.status},shard:{x:model.shard.x,z:model.shard.z,sx:(shardScreen.x*.5+.5)*innerWidth,sy:(-shardScreen.y*.5+.5)*innerHeight,blast:model.shard.blast}};
    requestAnimationFrame(frame);
  }
  camera.position.set(13,12,18);camera.lookAt(0,0,-4);resize();
  $('#loading').hidden=true;$('#welcome').hidden=false;window.__READY__=true;requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);$('#loading').hidden=true;$('#error').hidden=false;$('#error-detail').textContent=error.message;});
