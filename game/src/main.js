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
import { REGIONS } from './campaign-data.js';
import { createCampaignView } from './campaign-view.js';
import { createTownView } from './town-view.js';
import { createAtlasView } from './atlas-view.js';
import { setLandscapeLighting,applyLandscapePalette,LANDSCAPE_RENDER_OPTIONS } from './landscape-lighting.js';
import {applyVisualQuality} from './visual-quality.js';
import {inTown,WORLD_LIMIT,EXIT,MAPS} from './world-map.js';
import {createFrameClock} from './frame-clock.js';
import {CameraOrbit,cameraRelative,cameraHeading} from './camera-orbit.js';
import {createClassView} from './class-view.js';
import {classInfo,skillForSlot,SLOT_IDS} from './class-data.js';
import {touchAim} from './combat-targeting.js';
import {intersectGroundRay} from './terrain-height.js';
import {drapeGround} from './ground-projection.js';

const $=s=>document.querySelector(s);
window.__READY__=false;
async function boot(){
  const canvas=$('#world'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,140);
  const rig=createRig(T,renderer,scene,{...LANDSCAPE_RENDER_OPTIONS,camera});
  const artReady=loadArt(renderer),assetsReady=loadCombatAssets();
  const [world,hero,combatAssets]=await Promise.all([createWorld(scene,artReady),ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{keepHierarchy:true,height:1.85,surfaces:true}),assetsReady]);
  const snapshotObstacles=()=>Object.freeze(world.colliders.map(c=>Object.freeze({...c})));let diagnosticObstacles=snapshotObstacles();
  if(!hero.userData.joints?.leftLeg)throw new Error('The Wanderer joint hierarchy did not load.');
  mergeJoints(hero);
  scene.add(hero);hero.position.set(0,world.heightAt(0,11)+.06,11);hero.rotation.y=Math.PI;
  const ring=new T.Mesh(new T.RingGeometry(.40,.425,40),new T.MeshBasicMaterial({color:0xc9c4a0,transparent:true,opacity:.32,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
  const orbit=new CameraOrbit();let cameraLooking=false;
  const input=createInput(canvas,{canPlay:()=>window.__READY__===true&&started&&!paused&&!model.dead}),look=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster();
  const model=new Combat((x,z)=>world.canStand(x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12),(x,z)=>world.canStand(x,z));
  const clearInput=input.clear;input.clear=()=>{clearInput();orbit.stop();cameraLooking=false;model.clearBufferedInput();};
  const audio=createAudio(),combatView=await createCombatView(scene,hero,model,audio,{assets:combatAssets,prepare:root=>rig.refresh(root)});
  const store=saveStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}),saved=store.load();
  let progress=new Progression(saved);const campaign=new Campaign(progress,model);progress.restore(model);world.setRegion(campaign.region);diagnosticObstacles=snapshotObstacles();if(campaign.region!==0)rig.setTime(world.atmosphere);
  await combatView.loadClass(progress.data.classId);combatView.setClass(progress.data.classId);
  const save=()=>store.write(progress.snapshot(model));
  // Inventory photographs are only needed when its opaque, paused panel opens.
  // Do not force four GPU readbacks before the player can enter the world.
  const portraitCache=new Map();const portraits=()=>{const id=progress.data.classId;if(!portraitCache.has(id))portraitCache.set(id,createItemPortraits(renderer,{...combatView.portraitModels,character:combatView.characterPortrait()}));return portraitCache.get(id);};
  const rpgView=await createRpgView(scene,progress,model,store,save,portraits,combatView.portraitModels);
  const campaignView=createCampaignView(scene,campaign);
  const frameSeconds=createFrameClock();
  let started=false,paused=false,elapsed=0,acc=0,fps=60,hitStop=0,won=false,ended=false,saveTimer=0,actualSpeed=0,inventoryStill=0,renderDirty=true;
  let atlas,classView,journeyOrigin=null;
  const townView=await createTownView(scene,model,progress,campaign,{open(){if(!started||model.dead||(classView?.busy||classView?.journey)||!$('#pause').hidden||!$('#victory').hidden)return false;classView?.close(false);atlas?.close(false);closeBag();closeJournal();paused=true;input.clear();return true;},close(){paused=false;input.clear();},journal:openJournal,trade:()=>openBag('merchant'),save});
  atlas=createAtlasView(model,progress,campaign,{open(){if(!started||model.dead||(classView?.busy||classView?.journey)||!$('#pause').hidden||!$('#victory').hidden)return false;classView?.close(false);townView.close();closeBag();closeJournal();paused=true;input.clear();return true;},close(){paused=false;input.clear();}});
  classView=createClassView(model,progress,{
    open(mode){const journey=mode!=='change';if(!window.__READY__||model.dead||!journey&&(!$('#pause').hidden||!$('#victory').hidden))return false;
      journeyOrigin=journey?!$('#pause').hidden?'#pause':!$('#victory').hidden?'#victory':null:null;if(journey&&!journeyOrigin)return false;
      townView.close();atlas.close(false);closeBag();closeJournal();if(journeyOrigin)$(journeyOrigin).hidden=true;paused=true;input.clear();$('#welcome').inert=$('#hud').inert=true;return true;},
    close(resume){$('#welcome').inert=$('#hud').inert=false;if(journeyOrigin){$(journeyOrigin).hidden=false;journeyOrigin=null;paused=true;}else if(resume)paused=false;input.clear();renderDirty=true;},
    async apply(id,mode){
      if(mode!=='change'&&!confirm(mode==='fresh'?'Erase your saved level, equipment and gold on this browser and begin a new journey?':'Restart all four quests and remove uncollected loot? Your equipment, level and gold are kept.'))return false;
      // Load first: cancelling or a failed character download must never erase a save.
      await combatView.loadClass(id);
      if(mode!=='change'){if(mode==='fresh')store.allowNew();journeyOrigin=null;reset(mode==='fresh',id);return true;}
      if(!progress.chooseClass(id,model))return false;combatView.setClass(id);renderDirty=true;inventoryStill=0;save();combatView.notice(`${classInfo(id).name} · your journey is kept`);return true;
    },
  });
  if(saved)$('#startb').firstChild.textContent='Continue journey ';
  function closeBag(){if($('#inventory').hidden)return;$('#inventory').hidden=true;paused=false;input.clear();document.activeElement?.blur();}
  function openBag(mode){if((classView?.busy||classView?.journey))return;classView?.close();townView.close();atlas.close(false);if(!started||model.dead||!$('#victory').hidden||!$('#pause').hidden)return;if(!$('#journal').hidden)closeJournal();if(!$('#inventory').hidden){closeBag();return;}if(mode==='smith'&&!progress.nearSmith(model.player)){combatView.notice('Borin upgrades equipment at Hearthstead market. M marks his forge; southern portals lead back.');return;}if(mode==='merchant'&&!progress.nearMerchant(model.player))return;paused=true;input.clear();rpgView.open(mode);}
  function closeJournal(){if($('#journal').hidden)return;$('#journal').hidden=true;paused=false;input.clear();document.activeElement?.blur();}
  function openJournal(){if((classView?.busy||classView?.journey))return;classView?.close();townView.close();atlas.close(false);if(!started||model.dead||!$('#victory').hidden||!$('#pause').hidden)return;if(!$('#journal').hidden){closeJournal();return;}if(!$('#inventory').hidden)closeBag();paused=true;input.clear();campaignView.open();save();}
  function regionChanged(){classView?.close(false);classView?.refresh();combatView.setClass(model.player.classId);atlas?.close(false);combatView.reset();rpgView.clearDrops();if(world.setRegion(campaign.region))rig.refresh(scene);diagnosticObstacles=snapshotObstacles();setLandscapeLighting(rig,world.atmosphere);input.clear();hitStop=0;acc=0;actualSpeed=0;inventoryStill=0;hero.rotation.set(0,Math.PI,0);hero.position.set(model.player.x,world.heightAt(model.player.x,model.player.z)+.06,model.player.z);$('#journal').hidden=true;$('#defeat').hidden=true;$('#victory').hidden=true;paused=ended=false;won=campaign.complete;save();combatView.notice(REGIONS[campaign.region].name);document.activeElement?.blur();}
  function travel(region){if(!started||paused||model.dead)return;if(campaign.travel(region))regionChanged();else combatView.notice('Approach an unlocked portal and leave combat before travelling.');}
  $('#journal-button').onclick=openJournal;$('#journal-close').onclick=closeJournal;$('#gate-button').onclick=()=>{if(!paused&&campaign.nearPortal)travel(campaign.nearPortal.destination);};
  $('#bag-button').onclick=()=>openBag('inventory');$('#smith-button').onclick=()=>openBag('smith');$('#bag-close').onclick=closeBag;
  $('#potion-button').onclick=()=>{if(started&&!paused&&progress.potion(model)){save();combatView.notice('Healing draught · +65 health');}};
  addEventListener('keydown',e=>{if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='KeyJ'){e.preventDefault();openJournal();}if(e.code==='KeyI'){e.preventDefault();openBag('inventory');}if(e.code==='KeyE'){e.preventDefault();if(!paused&&campaign.nearPortal)travel(campaign.nearPortal.destination);else if(!paused){if(progress.nearSmith(model.player))openBag('smith');else if(!townView.open())combatView.notice('Approach a townsfolk, blacksmith or portal to interact.');}}});
  addEventListener('pagehide',()=>{if(started)save();});
  addEventListener('keydown',e=>{if(e.code==='KeyK'&&!e.repeat&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();if(!$('#class-dialog').hidden)classView.close();else classView.open();}});
  addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();atlas.open();}});
  function resize(){input.clear();inventoryStill=0;renderDirty=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
  addEventListener('resize',resize);
  function resetCamera(){if(!started)return;input.clearCamera();cameraLooking=false;orbit.reset(paused);inventoryStill=0;renderDirty=true;document.activeElement?.blur();}
  $('#camera-reset').onclick=()=>{if(!paused&&!model.dead)resetCamera();};$('#camera-defaults').onclick=resetCamera;
  function pause(value){if(!$('#class-dialog').hidden){classView.close();return;}if(!$('#atlas-dialog').hidden){atlas.close();return;}if(!$('#town-dialog').hidden){townView.close();return;}if(!started||model.dead||!$('#victory').hidden)return;if(!$('#journal').hidden){closeJournal();return;}if(!$('#inventory').hidden){closeBag();return;}paused=value;$('#pause').hidden=!value;input.clear();if(!value)audio.unlock();else save();}
  $('#menu-button').onclick=()=>pause(true);$('#resume').onclick=()=>pause(false);
  addEventListener('keydown',e=>{if(e.code==='Escape')pause(!paused);});
  addEventListener('blur',()=>{if($('#class-dialog').hidden&&$('#inventory').hidden&&$('#journal').hidden&&$('#town-dialog').hidden&&$('#atlas-dialog').hidden)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(started)save();if($('#class-dialog').hidden&&$('#inventory').hidden&&$('#journal').hidden&&$('#town-dialog').hidden&&$('#atlas-dialog').hidden)pause(true);}});
  $('#quality').onchange=e=>{applyVisualQuality(renderer,rig,e.target.value,devicePixelRatio);resize();};
  function reset(fresh=false,classId=progress.data.classId){if(!progress.beginJourney(model,{fresh,classId}))return false;for(const id of ['#pause','#defeat','#victory','#inventory','#journal','#town-dialog'])$(id).hidden=true;regionChanged();orbit.reset(true);orbit.distance=0;audio.unlock();return true;}
  function restart(){classView.open('expedition');}
  $('#reset-view').onclick=restart;$('#replay').onclick=restart;$('#retry').onclick=()=>{campaign.retry();regionChanged();};
  $('#explore').onclick=()=>{$('#victory').hidden=true;paused=false;input.clear();};
  $('#sound').onchange=e=>audio.setMuted(!e.target.checked);
  $('#startb').onclick=()=>{audio.unlock();started=true;$('#welcome').hidden=true;$('#hud').hidden=false;input.clear();save();document.activeElement?.blur();};
  $('#reset-view').textContent='Restart expedition · keep equipment';
  const fresh=document.createElement('button');fresh.id='new-journey';fresh.textContent='New journey · choose class';$('#pause').append(fresh);fresh.onclick=()=>classView.open('fresh');
  await rig.ready;
  // An overcast palette: keep the rig's directional haze while removing sunset amber.
  // The correct environment is already built. Reapply only the sky palette;
  // rebuilding the same PMREM twice queues expensive, discarded GPU work.
  applyLandscapePalette(rig);
  rig.refresh(scene);
  function sim(dt){
    if(!started||paused||model.dead)return;
    // Held movement follows the current view immediately, including during orbit.
    const raw=input.read(),m={...raw,...cameraRelative(raw.x,raw.z,orbit.yaw)},p=model.player,actions=input.consume();
    const moving=Math.hypot(m.x,m.z)>.08;
    let angle=p.angle,aimPoint=null;
    if(moving)angle=Math.atan2(m.x,m.z);
    // Hover can preview a bomb, but only combat input turns toward the cursor.
    // Looking around or moving the idle mouse never spins the character.
    if(input.pointer.active&&!input.isTouch&&!cameraLooking){ray.setFromCamera(input.pointer,camera);const aim=intersectGroundRay(campaign.region,ray.ray.origin,ray.ray.direction);if(aim){aimPoint={x:aim.x,z:aim.z};if(m.attack||actions.some(a=>a==='attack'||SLOT_IDS.includes(a)))angle=Math.atan2(aim.x-p.x,aim.z-p.z);}}
    if(input.isTouch){const assisted=touchAim(model,actions,m.attack,angle);angle=assisted.angle;aimPoint=assisted.point;}
    for(const action of actions){if(action==='weapon'){model.cycleWeapon();progress.sync(model);}else if(action==='potion'){if(progress.potion(model))save();}else if(action==='dodge')model.dodge(m.x,m.z);else model.requestAttack(action==='attack'?'basic':SLOT_IDS.includes(action)?skillForSlot(p.classId,action):action,angle,aimPoint);}
    const oldX=p.x,oldZ=p.z;model.update(dt,{...m,aim:angle,aimPoint});actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;hero.position.set(p.x,world.heightAt(p.x,p.z)+.06,p.z);hero.rotation.y=p.angle;
    const revision=progress.revision,events=model.consume();progress.events(events,model);progress.tick(dt);progress.collect(p);const questCompleted=campaign.observe();if(questCompleted){campaignView.celebrate();audio.play('quest');}combatView.process(events);if(events.some(e=>e.type==='hit'))hitStop=events.some(e=>e.type==='hit'&&e.heavy)?.06:.03;
    if(progress.messages.length){if(!questCompleted)combatView.notice(progress.messages.at(-1));progress.messages.length=0;}
    saveTimer+=dt;if(progress.revision!==revision||saveTimer>5){save();saveTimer=0;}
    if(model.dead&&!ended){ended=true;input.clear();$('#defeat p').textContent='You lost 10% of your gold. Equipment, XP, completed quests and collected rewards are safe. Return to this region’s safe ground; surviving enemies recover their health.';$('#defeat').hidden=false;save();}
    if(campaign.region===3&&campaign.complete&&!won&&!model.dead){won=true;paused=true;input.clear();$('#victory-stats').textContent=`Three shards cleansed. The Fallen Warden defeated. All four quests complete · Level ${progress.data.level}. The lantern road belongs to the living once more. Stay to collect your final loot, or begin a new expedition with your equipment and XP.`;$('#victory').hidden=false;save();}
  }
  function frame(now){
    const realDt=frameSeconds(now);if(realDt>0)fps=T.MathUtils.lerp(fps,1/Math.max(realDt,.001),.05);const dt=Math.min(realDt,.1);elapsed+=dt;if(hitStop>0)hitStop=Math.max(0,hitStop-dt);else acc+=dt;
    const turn=input.consumeCamera();if(started&&!paused&&!model.dead){cameraLooking=turn.active||!!turn.x||!!turn.y;if(turn.reset)resetCamera();else{orbit.drag(turn.x,turn.y,turn.touch);orbit.wheel(turn.wheel);}orbit.advance(dt);}
    while(acc>=1/60){sim(1/60);acc-=1/60;}
    const portrait=innerWidth<innerHeight;
    hero.position.y=world.heightAt(model.player.x,model.player.z)+.06;
    look.copy(hero.position);look.y+=.69;
    if(!started){look.set(-.7,world.heightAt(-.7,-4)+.6,-4);desired.set(13,12+world.heightAt(0,8),18);camera.position.lerp(desired,1-Math.exp(-dt*6));}
    else{const eye=orbit.position(model.player,paused?0:dt,portrait,world.cameraObstacles,world.heightAt);camera.position.set(eye.x,eye.y,eye.z);}
    camera.lookAt(look);
    const heading=cameraHeading(orbit.yaw);if($('#camera-heading').textContent!==heading)$('#camera-heading').textContent=heading;
    ring.position.set(hero.position.x,.09,hero.position.z);ring.visible=started;if(started)drapeGround(ring,world.heightAt,.09);
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
    const targets=model.enemies.filter(e=>e.hp>0).map(e=>{const s=new T.Vector3(e.x,world.heightAt(e.x,e.z),e.z).project(camera);return{id:e.id,x:e.x,z:e.z,hp:e.hp,kind:e.kind,sx:(s.x*.5+.5)*innerWidth,sy:(-s.y*.5+.5)*innerHeight,visible:s.z>-1&&s.z<1&&Math.abs(s.x)<1&&Math.abs(s.y)<1};});
    const shardScreen=new T.Vector3(model.shard.x,world.heightAt(model.shard.x,model.shard.z),model.shard.z).project(camera);
    window.__GAME__={pos:[hero.position.x,hero.position.z],fps,speed:started&&!paused&&!model.dead?actualSpeed:0,score:model.kills,over:model.dead,draws:renderer.info.render.calls,tris:renderer.info.render.triangles,started,paused,stage:4,worldSize:WORLD_LIMIT*2,inTown:inTown(model.player.x,model.player.z),exit:{...EXIT},town:MAPS[campaign.region].town,...model.telemetry(),campaign:campaign.telemetry(),maxHp:model.player.maxHp,targets,rpg:{level:progress.data.level,xp:progress.data.xp,gold:progress.data.gold,ore:progress.data.ore,potions:progress.data.potions,items:progress.data.items.map(i=>({...i})),loadout:{...progress.data.loadout},drops:progress.data.drops.map(d=>({...d})),nearSmith:progress.nearSmith(model.player),save:store.status},shard:{x:model.shard.x,z:model.shard.z,sx:(shardScreen.x*.5+.5)*innerWidth,sy:(-shardScreen.y*.5+.5)*innerHeight,blast:model.shard.blast}};
    // A copied, read-only diagnostic map lets input tests route around scenery.
    window.__GAME__.obstacles=diagnosticObstacles;
    window.__GAME__.camera=orbit.telemetry();
    window.__GAME__.elevation={ground:world.heightAt(model.player.x,model.player.z),hero:hero.position.y};
    window.__GAME__.classId=model.player.classId;window.__GAME__.classSkills=[...classInfo(model.player.classId).skills];window.__GAME__.classEffects={projectiles:model.projectiles.length,bombs:model.bombs.length,smoke:model.player.smoke,ward:model.player.ward};
    requestAnimationFrame(frame);
  }
  hero.position.set(model.player.x,world.heightAt(model.player.x,model.player.z)+.06,model.player.z);
  camera.position.set(13,12+world.heightAt(0,8),18);camera.lookAt(0,world.heightAt(0,-4),-4);resize();
  world.update(0,model.player);combatView.update(0,camera);rpgView.update(0,camera);townView.update(0,camera);rig.update(camera,0);
  // Precompile when the driver supports non-blocking links. On fallback
  // drivers, the first draw compiles only materials actually in the view.
  if(renderer.extensions.has('KHR_parallel_shader_compile')){await renderer.compileAsync(scene,camera);}
  rig.render(camera,0);renderDirty=false;
  $('#loading').hidden=true;$('#welcome').hidden=false;window.__READY__=true;requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);$('#loading').hidden=true;$('#error').hidden=false;$('#error-detail').textContent=error.message;});
