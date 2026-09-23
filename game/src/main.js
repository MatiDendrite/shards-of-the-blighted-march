import * as T from 'three';
import { ASSET } from '../lib/assetlib.js';
import { createRig } from '../lib/rig.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { Combat } from './combat-model.js';
import { createCombatView, loadCombatAssets, mergeJoints } from './combat-view.js';
import { createAudio } from './audio.js';
import { loadArt } from './art.js';
import { Progression,saveStore } from './progression.js';
import { createRpgView } from './rpg-view.js';
import { createItemPortraits } from './item-portraits.js';
import { Campaign } from './campaign.js';
import { REGIONS, freshCampaign } from './campaign-data.js';
import { createCampaignView } from './campaign-view.js';
import { createTownView } from './town-view.js';
import { createAtlasView } from './atlas-view.js';
import { setLandscapeLighting,applyLandscapePalette } from './landscape-lighting.js';
import {inTown,WORLD_LIMIT,EXIT,MAPS} from './world-map.js';
import {createFrameClock} from './frame-clock.js';
import {CameraOrbit,cameraRelative,cameraHeading} from './camera-orbit.js';

const $=s=>document.querySelector(s);
window.__READY__=false;
async function boot(){
  const canvas=$('#world'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,140);
  const rig=createRig(T,renderer,scene,{camera,tier:'phone',hour:16.5,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:36,exposure:1.15,sunColor:0xffe6bd,sunIntensity:2.25,fill:1.3,envIntensity:.5,bounce:.4,fogStart:19,fogDensity:.022});
  const artReady=loadArt(renderer),assetsReady=loadCombatAssets();
  const [world,hero,combatAssets]=await Promise.all([createWorld(scene,artReady),ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{keepHierarchy:true,height:1.85,surfaces:true}),assetsReady]);
  const snapshotObstacles=()=>Object.freeze(world.colliders.map(c=>Object.freeze({...c})));let diagnosticObstacles=snapshotObstacles();
  if(!hero.userData.joints?.leftLeg)throw new Error('The Wanderer joint hierarchy did not load.');
  mergeJoints(hero);
  scene.add(hero);hero.position.set(0,.06,11);hero.rotation.y=Math.PI;
  const ring=new T.Mesh(new T.RingGeometry(.40,.425,40),new T.MeshBasicMaterial({color:0xc9c4a0,transparent:true,opacity:.32,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
  const orbit=new CameraOrbit();
  const input=createInput(canvas,{canPlay:()=>window.__READY__===true&&started&&!paused&&!model.dead}),look=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),aim=new T.Vector3();
  const model=new Combat((x,z)=>world.canStand(x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12));
  const clearInput=input.clear;input.clear=()=>{clearInput();orbit.stop();model.clearBufferedInput();};
  const audio=createAudio(),combatView=await createCombatView(scene,hero,model,audio,{assets:combatAssets,prepare:root=>rig.refresh(root)});
  const store=saveStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}),saved=store.load();
  let progress=new Progression(saved);const campaign=new Campaign(progress,model);progress.restore(model);world.setRegion(campaign.region);diagnosticObstacles=snapshotObstacles();if(campaign.region!==0)rig.setTime(world.atmosphere);
  const save=()=>store.write(progress.snapshot(model));
  // Inventory photographs are only needed when its opaque, paused panel opens.
  // Do not force four GPU readbacks before the player can enter the world.
  let portraitCache;const portraits=()=>portraitCache??=createItemPortraits(renderer,combatView.portraitModels);
  const rpgView=await createRpgView(scene,progress,model,store,save,portraits,combatView.portraitModels);
  const campaignView=createCampaignView(scene,campaign,travel);
  const frameSeconds=createFrameClock();
  let started=false,paused=false,elapsed=0,acc=0,fps=60,hitStop=0,won=false,ended=false,saveTimer=0,actualSpeed=0,inventoryStill=0,renderDirty=true;
  let atlas;
  const townView=await createTownView(scene,model,progress,campaign,{open(){if(!started||model.dead||!$('#pause').hidden||!$('#victory').hidden)return false;atlas?.close(false);closeBag();closeJournal();paused=true;input.clear();return true;},close(){paused=false;input.clear();},journal:openJournal,save});
  atlas=createAtlasView(model,progress,campaign,{open(){if(!started||model.dead||!$('#pause').hidden||!$('#victory').hidden)return false;townView.close();closeBag();closeJournal();paused=true;input.clear();return true;},close(){paused=false;input.clear();}});
  if(saved)$('#startb').firstChild.textContent='Continue journey ';
  function closeBag(){if($('#inventory').hidden)return;$('#inventory').hidden=true;paused=false;input.clear();document.activeElement?.blur();}
  function openBag(mode){townView.close();atlas.close(false);if(!started||model.dead||!$('#victory').hidden||!$('#pause').hidden)return;if(!$('#journal').hidden)closeJournal();if(!$('#inventory').hidden){closeBag();return;}if(mode==='smith'&&!progress.nearSmith(model.player)){combatView.notice('Borin is in Hearthstead. Use J to return from safe ground.');return;}paused=true;input.clear();rpgView.open(mode);}
  function closeJournal(){if($('#journal').hidden)return;$('#journal').hidden=true;paused=false;input.clear();document.activeElement?.blur();}
  function openJournal(){townView.close();atlas.close(false);if(!started||model.dead||!$('#victory').hidden||!$('#pause').hidden)return;if(!$('#journal').hidden){closeJournal();return;}if(!$('#inventory').hidden)closeBag();paused=true;input.clear();campaignView.open();save();}
  function regionChanged(){atlas?.close(false);combatView.reset();rpgView.clearDrops();if(world.setRegion(campaign.region))rig.refresh(scene);diagnosticObstacles=snapshotObstacles();setLandscapeLighting(rig,world.atmosphere);input.clear();hitStop=0;acc=0;actualSpeed=0;inventoryStill=0;hero.rotation.set(0,Math.PI,0);hero.position.set(model.player.x,.06,model.player.z);$('#journal').hidden=true;$('#defeat').hidden=true;$('#victory').hidden=true;paused=ended=false;won=campaign.complete;save();combatView.notice(REGIONS[campaign.region].name);document.activeElement?.blur();}
  function travel(region){if(!started||!$('#inventory').hidden||!$('#victory').hidden||!$('#pause').hidden)return;if(campaign.travel(region))regionChanged();else combatView.notice('Return to the central settlement and finish the previous quest to travel.');}
  $('#journal-button').onclick=openJournal;$('#journal-close').onclick=closeJournal;$('#gate-button').onclick=()=>{if(!paused&&campaign.nearGate)travel(campaign.region+1);};
  $('#bag-button').onclick=()=>openBag('inventory');$('#smith-button').onclick=()=>openBag('smith');$('#bag-close').onclick=closeBag;
  $('#potion-button').onclick=()=>{if(started&&!paused&&progress.potion(model)){save();combatView.notice('Healing draught · +65 health');}};
  addEventListener('keydown',e=>{if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='KeyJ'){e.preventDefault();openJournal();}if(e.code==='KeyI'){e.preventDefault();openBag('inventory');}if(e.code==='KeyE'){e.preventDefault();if(!paused&&campaign.nearGate&&campaign.region<3)travel(campaign.region+1);else if(!paused){if(progress.nearSmith(model.player))openBag('smith');else if(!townView.open())combatView.notice('Approach a townsfolk or Borin to interact.');}}});
  addEventListener('pagehide',()=>{if(started)save();});
  addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();atlas.open();}});
  function resize(){input.clear();inventoryStill=0;renderDirty=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
  addEventListener('resize',resize);
  function resetCamera(){if(!started)return;input.clearCamera();orbit.reset(paused);inventoryStill=0;renderDirty=true;document.activeElement?.blur();}
  $('#camera-reset').onclick=()=>{if(!paused&&!model.dead)resetCamera();};$('#camera-defaults').onclick=resetCamera;
  function pause(value){if(!$('#atlas-dialog').hidden){atlas.close();return;}if(!$('#town-dialog').hidden){townView.close();return;}if(!started||model.dead||!$('#victory').hidden)return;if(!$('#journal').hidden){closeJournal();return;}if(!$('#inventory').hidden){closeBag();return;}paused=value;$('#pause').hidden=!value;input.clear();if(!value)audio.unlock();else save();}
  $('#menu-button').onclick=()=>pause(true);$('#resume').onclick=()=>pause(false);
  addEventListener('keydown',e=>{if(e.code==='Escape')pause(!paused);});
  addEventListener('blur',()=>{if($('#inventory').hidden&&$('#journal').hidden&&$('#town-dialog').hidden&&$('#atlas-dialog').hidden)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(started)save();if($('#inventory').hidden&&$('#journal').hidden&&$('#town-dialog').hidden&&$('#atlas-dialog').hidden)pause(true);}});
  $('#quality').onchange=e=>{renderer.setPixelRatio(e.target.value==='high'?Math.min(devicePixelRatio,1.5):1);resize();};
  function reset(fresh=false){if(fresh===true){progress.data.campaign=freshCampaign();model.reset();progress.potionCD=0;progress.messages.length=0;progress.sync(model,true);}else progress.nextRun(model);for(const id of ['#pause','#defeat','#victory','#inventory','#journal','#town-dialog'])$(id).hidden=true;regionChanged();orbit.reset(true);orbit.distance=0;audio.unlock();}
  function restart(){if(confirm('Restart all four quests and remove uncollected loot? Your equipment, level and gold are kept.'))reset();}
  $('#reset-view').onclick=restart;$('#replay').onclick=restart;$('#retry').onclick=()=>{campaign.retry();regionChanged();};
  $('#explore').onclick=()=>{$('#victory').hidden=true;paused=false;input.clear();};
  $('#sound').onchange=e=>audio.setMuted(!e.target.checked);
  $('#startb').onclick=()=>{audio.unlock();started=true;$('#welcome').hidden=true;$('#hud').hidden=false;input.clear();save();document.activeElement?.blur();};
  $('#reset-view').textContent='Restart expedition · keep equipment';
  const fresh=document.createElement('button');fresh.id='new-journey';fresh.textContent='New journey · erase local progress';$('#pause').append(fresh);fresh.onclick=()=>{if(!confirm('Erase your saved level, equipment and gold on this browser?'))return;progress.data=new Progression().data;progress.revision++;store.allowNew();reset(true);};
  await rig.ready;
  // An overcast palette: keep the rig's directional haze while removing sunset amber.
  // The correct environment is already built. Reapply only the sky palette;
  // rebuilding the same PMREM twice queues expensive, discarded GPU work.
  applyLandscapePalette(rig);
  rig.refresh(scene);
  function sim(dt){
    if(!started||paused||model.dead)return;
    const raw=input.read(),m={...raw,...cameraRelative(raw.x,raw.z,orbit.yaw)},p=model.player;
    const moving=Math.hypot(m.x,m.z)>.08;
    let angle=p.angle;
    if(moving)angle=Math.atan2(m.x,m.z);
    if(input.pointer.active&&!input.isTouch){ray.setFromCamera(input.pointer,camera);if(ray.ray.intersectPlane(plane,aim))angle=Math.atan2(aim.x-p.x,aim.z-p.z);}
    const actions=input.consume();
    if(input.isTouch&&(m.attack||actions.some(a=>['attack','cleave','slam'].includes(a)))){
      const candidates=[...model.enemies.filter(e=>e.hp>0),...(model.shard.hp>0?[model.shard]:[])].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<4.2).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
      if(candidates.length)angle=Math.atan2(candidates[0].x-p.x,candidates[0].z-p.z);
    }
    for(const action of actions){if(action==='weapon'){model.cycleWeapon();progress.sync(model);}else if(action==='potion'){if(progress.potion(model))save();}else if(action==='dodge')model.dodge(m.x,m.z);else model.requestAttack(action==='attack'?'basic':action,angle);}
    const oldX=p.x,oldZ=p.z;model.update(dt,{...m,aim:angle});actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;hero.position.set(p.x,.06,p.z);hero.rotation.y=p.angle;
    const revision=progress.revision,events=model.consume();progress.events(events,model);progress.tick(dt);progress.collect(p);const questCompleted=campaign.observe();if(questCompleted){campaignView.celebrate();audio.play('quest');}combatView.process(events);if(events.some(e=>e.type==='hit'))hitStop=events.some(e=>e.type==='hit'&&e.heavy)?.06:.03;
    if(progress.messages.length){if(!questCompleted)combatView.notice(progress.messages.at(-1));progress.messages.length=0;}
    saveTimer+=dt;if(progress.revision!==revision||saveTimer>5){save();saveTimer=0;}
    if(model.dead&&!ended){ended=true;input.clear();$('#defeat p').textContent='You lost 10% of your gold. Equipment, XP, completed quests and collected rewards are safe. Return to this region’s safe ground; surviving enemies recover their health.';$('#defeat').hidden=false;save();}
    if(campaign.region===3&&campaign.complete&&!won&&!model.dead){won=true;paused=true;input.clear();$('#victory-stats').textContent=`Three shards cleansed. The Fallen Warden defeated. All four quests complete · Level ${progress.data.level}. The lantern road belongs to the living once more. Stay to collect your final loot, or begin a new expedition with your equipment and XP.`;$('#victory').hidden=false;save();}
  }
  function frame(now){
    const realDt=frameSeconds(now);if(realDt>0)fps=T.MathUtils.lerp(fps,1/Math.max(realDt,.001),.05);const dt=Math.min(realDt,.1);elapsed+=dt;if(hitStop>0)hitStop=Math.max(0,hitStop-dt);else acc+=dt;
    const turn=input.consumeCamera();if(started&&!paused&&!model.dead){if(turn.reset)resetCamera();else{orbit.drag(turn.x,turn.y,turn.touch);orbit.wheel(turn.wheel);}orbit.advance(dt);}
    while(acc>=1/60){sim(1/60);acc-=1/60;}
    const portrait=innerWidth<innerHeight;
    look.copy(hero.position);look.y=.75;
    if(!started){look.set(-.7,.6,-4);desired.set(13,12,18);camera.position.lerp(desired,1-Math.exp(-dt*6));}
    else{const eye=orbit.position(model.player,paused?0:dt,portrait,world.cameraObstacles);camera.position.set(eye.x,eye.y,eye.z);}
    camera.lookAt(look);
    const heading=cameraHeading(orbit.yaw);if($('#camera-heading').textContent!==heading)$('#camera-heading').textContent=heading;
    ring.position.set(hero.position.x,.09,hero.position.z);ring.visible=started;
    if(!paused){world.dust.rotation.y=Math.sin(elapsed*.025)*.045;world.update(dt,model.player);}
    const shake=combatView.update(started&&!paused?dt:0,camera);if(started&&!paused&&$('#shake').checked&&shake>0){const eye=orbit.shaken(Math.sin(elapsed*110)*shake,Math.cos(elapsed*95)*shake*.5,world.cameraObstacles);camera.position.set(eye.x,eye.y,eye.z);}
    rpgView.update(started&&!paused?dt:0,camera);
    campaignView.update(started&&!paused?dt:0);townView.update(dt,camera);
    // Reuse settled pause/dialog/end-screen backgrounds instead of redrawing
    // the frozen 3D scene. Resize and region changes invalidate the cached frame.
    inventoryStill=started&&(paused||model.dead)?inventoryStill+dt:0;
    // The welcome screen keeps its fully rendered establishing shot. There is
    // no gameplay to redraw before Enter, and the GPU can finish that first frame.
    if(renderDirty||started&&inventoryStill<1.2){rig.render(camera,dt);renderDirty=false;}
    const targets=model.enemies.filter(e=>e.hp>0).map(e=>{const s=new T.Vector3(e.x,0,e.z).project(camera);return{id:e.id,x:e.x,z:e.z,hp:e.hp,kind:e.kind,sx:(s.x*.5+.5)*innerWidth,sy:(-s.y*.5+.5)*innerHeight,visible:s.z>-1&&s.z<1&&Math.abs(s.x)<1&&Math.abs(s.y)<1};});
    const shardScreen=new T.Vector3(model.shard.x,0,model.shard.z).project(camera);
    window.__GAME__={pos:[hero.position.x,hero.position.z],fps,speed:started&&!paused&&!model.dead?actualSpeed:0,score:model.kills,over:model.dead,draws:renderer.info.render.calls,tris:renderer.info.render.triangles,started,paused,stage:4,worldSize:WORLD_LIMIT*2,inTown:inTown(model.player.x,model.player.z),exit:{...EXIT},town:MAPS[campaign.region].town,...model.telemetry(),campaign:campaign.telemetry(),maxHp:model.player.maxHp,targets,rpg:{level:progress.data.level,xp:progress.data.xp,gold:progress.data.gold,ore:progress.data.ore,potions:progress.data.potions,items:progress.data.items.map(i=>({...i})),loadout:{...progress.data.loadout},drops:progress.data.drops.map(d=>({...d})),nearSmith:progress.nearSmith(model.player),save:store.status},shard:{x:model.shard.x,z:model.shard.z,sx:(shardScreen.x*.5+.5)*innerWidth,sy:(-shardScreen.y*.5+.5)*innerHeight,blast:model.shard.blast}};
    // A copied, read-only diagnostic map lets input tests route around scenery.
    window.__GAME__.obstacles=diagnosticObstacles;
    window.__GAME__.camera=orbit.telemetry();
    requestAnimationFrame(frame);
  }
  camera.position.set(13,12,18);camera.lookAt(0,0,-4);resize();
  world.update(0,model.player);combatView.update(0,camera);rpgView.update(0,camera);townView.update(0,camera);rig.update(camera,0);
  // Precompile when the driver supports non-blocking links. On fallback
  // drivers, the first draw compiles only materials actually in the view.
  if(renderer.extensions.has('KHR_parallel_shader_compile')){await renderer.compileAsync(scene,camera);}
  rig.render(camera,0);renderDirty=false;
  $('#loading').hidden=true;$('#welcome').hidden=false;window.__READY__=true;requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);$('#loading').hidden=true;$('#error').hidden=false;$('#error-detail').textContent=error.message;});
