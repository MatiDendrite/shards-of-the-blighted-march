import * as T from 'three';
import { ASSET } from '../lib/assetlib.js';
import { createRig } from '../lib/rig.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { Combat } from './combat-model.js';
import { createCombatView, mergeJoints } from './combat-view.js';
import { createAudio } from './audio.js';

const $=s=>document.querySelector(s);
window.__READY__=false;
async function boot(){
  const canvas=$('#world'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,140);
  const rig=createRig(T,renderer,scene,{tier:'phone',hour:17.4,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:55,exposure:1.05,sunColor:0xb8cfdd,sunIntensity:1.1,fill:1.5,envIntensity:.3,bounce:.3,fogStart:10,fogDensity:.036});
  const world=await createWorld(scene);
  const hero=await ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{keepHierarchy:true,height:1.85});
  if(!hero.userData.joints?.leftLeg)throw new Error('The Wanderer joint hierarchy did not load.');
  const joints=hero.userData.joints;
  mergeJoints(hero);
  scene.add(hero);hero.position.set(0,.06,11);hero.rotation.y=Math.PI;
  const ring=new T.Mesh(new T.RingGeometry(.40,.425,40),new T.MeshBasicMaterial({color:0xc9c4a0,transparent:true,opacity:.32,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
  const input=createInput(canvas),look=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),aim=new T.Vector3();
  const model=new Combat((x,z)=>world.canStand(x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12));
  const audio=createAudio(),combatView=await createCombatView(scene,hero,model,audio);
  let started=false,paused=false,zoom=1,walk=0,elapsed=0,acc=0,last=performance.now(),fps=60,hitStop=0,won=false,ended=false;
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
  addEventListener('resize',resize);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.00045,.7,1.35);},{passive:false});
  function pause(value){if(!started||model.dead||!$('#victory').hidden)return;paused=value;$('#pause').hidden=!value;input.clear();if(!value)audio.unlock();}
  $('#menu-button').onclick=()=>pause(true);$('#resume').onclick=()=>pause(false);
  addEventListener('keydown',e=>{if(e.code==='Escape')pause(!paused);});
  addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  $('#quality').onchange=e=>{renderer.setPixelRatio(e.target.value==='high'?Math.min(devicePixelRatio,1.5):1);resize();};
  function reset(){combatView.reset();model.reset();input.clear();hitStop=0;won=ended=paused=false;acc=0;hero.rotation.x=0;hero.position.set(0,.06,11);hero.rotation.y=Math.PI;zoom=1;for(const id of ['#pause','#defeat','#victory'])$(id).hidden=true;audio.unlock();document.activeElement?.blur();}
  $('#reset-view').onclick=reset;$('#retry').onclick=reset;$('#replay').onclick=reset;
  $('#explore').onclick=()=>{$('#victory').hidden=true;paused=false;input.clear();};
  $('#sound').onchange=e=>audio.setMuted(!e.target.checked);
  $('#startb').onclick=()=>{audio.unlock();started=true;$('#welcome').hidden=true;$('#hud').hidden=false;input.clear();document.activeElement?.blur();};
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
    for(const action of actions){if(action==='weapon')model.cycleWeapon();else if(action==='dodge')model.dodge(m.x,m.z);else model.startAttack(action==='attack'?'basic':action,angle);}
    model.update(dt,{...m,aim:angle});hero.position.set(p.x,.06,p.z);hero.rotation.y=p.angle;
    const events=model.consume();combatView.process(events);if(events.some(e=>e.type==='hit'))hitStop=.035;
    if(moving)walk+=dt*9;
    const swing=moving?Math.sin(walk)*.52:0;
    joints.leftLeg.rotation.x=T.MathUtils.damp(joints.leftLeg.rotation.x,swing,18,dt);
    joints.rightLeg.rotation.x=T.MathUtils.damp(joints.rightLeg.rotation.x,-swing,18,dt);
    joints.leftShin.rotation.x=Math.max(0,-swing)*.9;joints.rightShin.rotation.x=Math.max(0,swing)*.9;
    joints.leftArm.rotation.x=-swing*.65;joints.rightArm.rotation.x=swing*.65;
    joints.torso.position.y=1.13+(moving?Math.abs(Math.sin(walk))*.023:Math.sin(elapsed*1.6)*.006);
    if(model.dead&&!ended){ended=true;input.clear();$('#defeat').hidden=false;}
    if(model.complete&&!won&&!model.dead){won=true;paused=true;input.clear();$('#victory-stats').textContent=`${model.kills} guardians defeated. Try another weapon, or stay and explore the clearing.`;$('#victory').hidden=false;}
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
    rig.render(camera,dt);
    const targets=model.enemies.filter(e=>e.hp>0).map(e=>{const s=new T.Vector3(e.x,0,e.z).project(camera);return{id:e.id,x:e.x,z:e.z,hp:e.hp,kind:e.kind,sx:(s.x*.5+.5)*innerWidth,sy:(-s.y*.5+.5)*innerHeight,visible:s.z>-1&&s.z<1&&Math.abs(s.x)<1&&Math.abs(s.y)<1};});
    const shardScreen=new T.Vector3(model.shard.x,0,model.shard.z).project(camera);
    window.__GAME__={pos:[hero.position.x,hero.position.z],fps,speed:started&&!paused&&!model.dead?Math.hypot(input.read().x,input.read().z)*3.4:0,score:model.kills,over:model.dead,draws:renderer.info.render.calls,tris:renderer.info.render.triangles,started,paused,stage:2,...model.telemetry(),targets,shard:{x:model.shard.x,z:model.shard.z,sx:(shardScreen.x*.5+.5)*innerWidth,sy:(-shardScreen.y*.5+.5)*innerHeight,blast:model.shard.blast}};
    requestAnimationFrame(frame);
  }
  camera.position.set(13,12,18);camera.lookAt(0,0,-4);resize();
  $('#loading').hidden=true;$('#welcome').hidden=false;window.__READY__=true;requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);$('#loading').hidden=true;$('#error').hidden=false;$('#error-detail').textContent=error.message;});
