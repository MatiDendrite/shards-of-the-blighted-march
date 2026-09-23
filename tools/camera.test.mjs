import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {CameraOrbit,CAMERA_DEFAULTS,cameraRelative,cameraHeading,boxEntry,cameraClearance} from '../game/src/camera-orbit.js';
import {cameraTemplate,placeCameraObstacle} from '../game/src/camera-obstacles.js';
import gate from '../game/assets/old_gate.js';
import house from '../game/assets/village_house.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const box=(x,y,z,w,h,d)=>({min:{x:x-w/2,y,z:z-d/2},max:{x:x+w/2,y:y+h,z:z+d/2}});
const inside=(p,b,pad=0)=>['x','y','z'].every(a=>p[a]>b.min[a]-pad&&p[a]<b.max[a]+pad);
test('neutral camera preserves the original desktop and portrait views',()=>{
 for(const portrait of [false,true]){const c=new CameraOrbit(),eye=c.position({x:0,z:11},1/60,portrait);close(eye.x,0);close(eye.y,.75+(portrait?12:10)*.88);close(eye.z,11+(portrait?13:11)*.88);assert(!c.blocked);}
});
test('WASD, diagonals and dodge input remain screen-relative at every yaw',()=>{
 for(let yaw=-Math.PI;yaw<Math.PI;yaw+=.2){
  const w=cameraRelative(0,-1,yaw),right=cameraRelative(1,0,yaw),diag=cameraRelative(Math.SQRT1_2,-Math.SQRT1_2,yaw);close(Math.hypot(w.x,w.z),1);close(Math.hypot(diag.x,diag.z),1);close(w.x*right.x+w.z*right.z,0);close(w.x,-Math.sin(yaw));close(w.z,-Math.cos(yaw));
 }
 assert.equal(cameraHeading(0),'N');assert.equal(cameraHeading(Math.PI/2),'W');assert.equal(cameraHeading(-Math.PI/2),'E');assert.equal(cameraHeading(Math.PI),'S');
});
test('orbit is smoothed, wraps continuously, and tilt/zoom have safe bounds',()=>{
 const c=new CameraOrbit();c.yaw=c.targetYaw=Math.PI-.01;c.drag(-10,10000);c.wheel(-1e6);const before=c.yaw;c.advance(.01);assert(Math.abs(Math.atan2(Math.sin(c.yaw-before),Math.cos(c.yaw-before)))<.06);assert(c.zoom>.7);for(let i=0;i<180;i++)c.advance(1/60);close(c.zoom,CAMERA_DEFAULTS.minZoom);c.position({x:0,z:0},1/60,false);assert(c.pitch<=CAMERA_DEFAULTS.maxPitch);c.drag(0,-1e6);c.wheel(1e6);for(let i=0;i<180;i++)c.advance(1/60);c.position({x:0,z:0},1/60,true);assert(c.pitch>=CAMERA_DEFAULTS.minPitch);close(c.zoom,CAMERA_DEFAULTS.maxZoom);
});
test('pause stops pending rotation; camera reset never needs campaign state',()=>{
 const c=new CameraOrbit();c.drag(300,40);c.wheel(600);c.advance(.03);const yaw=c.yaw,zoom=c.zoom;c.stop();for(let n=0;n<60;n++)c.advance(1/60);close(c.yaw,yaw);close(c.zoom,zoom);c.reset();for(let n=0;n<180;n++)c.advance(1/60);close(c.yaw,0);close(c.zoom,.88);close(c.tilt,0);
 c.distance=2;c.reset(true);c.position({x:0,z:0},0,false);close(c.distance,Math.hypot(10,11)*.88);
});
test('finite boom collision handles parallel rays, near/far walls and origin-inside',()=>{
 const origin={x:0,y:1,z:0},direction={x:0,y:0,z:1},wall=box(0,0,5,5,4,1);close(boxEntry(origin,direction,10,wall,0),4.5);assert.equal(boxEntry(origin,{x:1,y:0,z:0},10,wall),null);assert.equal(boxEntry(origin,direction,2,wall),null);close(cameraClearance(origin,direction,10,[wall]),4.2);assert.equal(boxEntry({x:0,y:1,z:5},direction,10,wall),0);close(cameraClearance(origin,direction,10,[box(0,0,8,5,4,1),wall]),4.2);
});
test('compound gate bounds leave the real archway open and block its masonry',()=>{
 const template=cameraTemplate('gate',gate(T)),obstacle=placeCameraObstacle(template,{x:0,z:0,sx:1,sy:1,sz:1,rotation:0});assert(template.parts.length>10);
 close(cameraClearance({x:0,y:1,z:-4},{x:0,y:0,z:1},8,[obstacle]),8);
 assert(cameraClearance({x:2.4,y:1,z:-4},{x:0,y:0,z:1},8,[obstacle])<4);
 assert(cameraClearance({x:0,y:4.2,z:-4},{x:0,y:0,z:1},8,[obstacle])<4);
});
test('camera retracts immediately and restores distance smoothly after obstruction',()=>{
 const c=new CameraOrbit(),p={x:0,z:0},clear=c.position(p,.016,false),far=c.distance;assert(clear.z>9);const wall=box(0,0,5,8,12,1);const near=c.position(p,.016,false,[wall]);assert(c.blocked);assert(c.distance<far);assert(!inside(near,wall,.2));const distance=c.distance;c.position(p,.016,false,[]);assert(c.distance>distance&&c.distance<far);for(let i=0;i<180;i++)c.position(p,.016,false,[]);close(c.distance,far);
});
test('walking below a raised arch preserves zoom and pitch on desktop and phone',()=>{
 const obstacle=placeCameraObstacle(cameraTemplate('gate',gate(T)),{x:0,z:0,sx:1,sy:1,sz:1,rotation:0});
 for(const portrait of [false,true])for(const yaw of [0,Math.PI])for(const tilt of [-.25,0,.42]){
  const c=new CameraOrbit();c.yaw=yaw;c.tilt=tilt;const expected=c.position({x:0,z:8},1/60,portrait),distance=c.distance,pitch=c.pitch;
  for(let z=-8;z<=8;z+=.05){const eye=c.position({x:0,z},1/60,portrait,[obstacle]);close(c.distance,distance);close(c.pitch,pitch);assert(!c.blocked);for(const part of obstacle.parts)assert(!inside(eye,part,.1));}
  assert(Number.isFinite(expected.y));
 }
});
test('overhead sightline exception never allows a lens inside arch masonry',()=>{
 const obstacle=placeCameraObstacle(cameraTemplate('gate',gate(T)),{x:0,z:0,sx:1,sy:1,sz:1,rotation:.3});
 for(let x=-7;x<8;x+=1.5)for(let z=-9;z<10;z+=1.5)for(let yaw=0;yaw<Math.PI*2;yaw+=.4){
  const c=new CameraOrbit();c.yaw=yaw;c.zoom=.7;c.tilt=-.25;const eye=c.position({x,z},1/60,false,[obstacle]);for(const part of obstacle.parts)assert(!inside(eye,part,.1));
 }
});
test('tight corners and conservative bounds never bury the camera or create NaNs',()=>{
 for(const obstacles of [[box(0,0,0,1,3,1)],[box(0,0,1,6,3,1),box(1,0,0,1,5,6)]]){
  const c=new CameraOrbit();for(let yaw=-Math.PI;yaw<Math.PI;yaw+=.2){c.yaw=yaw;const eye=c.position({x:0,z:0},.016,false,obstacles);assert(Object.values(eye).every(Number.isFinite));assert(eye.y>.75);for(const b of obstacles)assert(!inside(eye,b,.1));}
 }
});
test('actual rotated house bounds keep the camera clear through complete orbit sweeps',()=>{
 const template=cameraTemplate('house',house(T)),obstacle=placeCameraObstacle(template,{x:0,z:0,sx:1.1,sy:1.1,sz:1.1,rotation:Math.PI/2});assert(obstacle.parts.length>20);
 let blocked=0;for(const p of [{x:5,z:0},{x:0,z:5},{x:-5,z:0},{x:0,z:-5}])for(let yaw=-Math.PI;yaw<Math.PI;yaw+=.12){const c=new CameraOrbit();c.yaw=yaw;c.tilt=-.25;c.zoom=1.35;const eye=c.position(p,1/60,false,[obstacle]);blocked+=Number(c.blocked);for(const b of obstacle.parts)assert(!inside(eye,b,.1));}
 assert(blocked>10);
});
test('combat camera shake cannot push an otherwise clear lens into a nearby wall',()=>{
 const c=new CameraOrbit(),origin={x:0,z:0};c.position(origin,.016,false);const b=box(.7,0,c.eye.z,1,15,3);c.position(origin,.016,false,[b]);
 for(const x of [-.23,.23])for(const y of [-.12,.12]){const eye=c.shaken(x,y,[b]);assert(!inside(eye,b,.1));assert(Object.values(eye).every(Number.isFinite));}
});
