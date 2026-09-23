import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCombatRings} from '../game/src/combat-rings.js';
import {createCombatEffects} from '../game/src/combat-effects.js';
import {createTextWriter} from '../game/src/hud-bindings.js';
import {cloneActor} from '../game/src/combat-view.js';
import {createFrameClock} from '../game/src/frame-clock.js';
const swing={x:3,z:7,range:2.1,arc:1.8,angle:.7,combo:1,weapon:'sword'};
test('hundreds of attacks reuse one mesh, material and geometry after warmup',()=>{
 const scene=new T.Scene(),fx=createCombatRings(scene);fx.swing(swing);const mesh=scene.children[0],geometry=mesh.geometry,material=mesh.material;fx.update(1);
 for(let i=0;i<400;i++){fx.swing(swing);fx.update(.2);}
 assert.equal(fx.allocated,1);assert.equal(fx.geometryCount,1);assert.equal(scene.children[0],mesh);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(fx.active,0);fx.dispose();assert.equal(scene.children.length,0);
});
test('overlapping cosmetic bursts stay bounded, keep position and reset without disposal',()=>{
 const scene=new T.Scene(),fx=createCombatRings(scene);for(let i=0;i<200;i++)fx.pulse(i,-i,0xc1d6c5,.65);assert.equal(fx.allocated,24);assert.equal(fx.active,24);assert.equal(fx.geometryCount,1);
 fx.clear();assert.equal(fx.active,0);assert.equal(fx.allocated,24);fx.swing(swing);const mesh=scene.children.find(m=>m.visible);assert.deepEqual(mesh.position.toArray(),[3,.8,7]);assert.equal(mesh.rotation.z,.7);const before=mesh.scale.clone();fx.update(0);assert(mesh.scale.equals(before));fx.update(.19);assert.equal(fx.active,0);fx.dispose();
});
test('finisher and weapon arcs retain their exact reach and angle',()=>{
 const scene=new T.Scene(),fx=createCombatRings(scene);fx.swing({...swing,combo:3});const g=scene.children[0].geometry;assert.equal(g.parameters.innerRadius,2.1-.32);assert.equal(g.parameters.outerRadius,2.1);assert.equal(g.parameters.thetaLength,1.8);fx.dispose();
});
test('idle sparks do not upload the 96-instance buffer every frame',()=>{
 const scene=new T.Scene(),fx=createCombatEffects(scene),buffer=scene.children[0].instanceMatrix;const start=buffer.version;for(let i=0;i<100;i++)fx.update(1/60);assert.equal(buffer.version,start);fx.burst({x:0,z:0,target:'wolf'});fx.update(.1);assert(buffer.version>start);fx.update(1);const stopped=buffer.version;fx.update(.1);assert.equal(buffer.version,stopped);
});
test('HUD writes only changed text and resolves each stable node once',()=>{
 let content='',writes=0,queries=0;const node={get textContent(){return content;},set textContent(value){writes++;content=value;}};const text=createTextWriter({querySelector(){queries++;return node;}});
 for(let i=0;i<300;i++)text('#health','120 / 120');assert.equal(writes,1);assert.equal(queries,1);text('#health','110 / 120');assert.equal(writes,2);assert.equal(content,'110 / 120');
});
test('actor prototypes share geometry without serializing live animation handles',()=>{
 const root=new T.Group(),arm=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());arm.name='rightArm';arm.add(mesh);root.add(arm);root.userData={label:'actor',joints:{rightArm:arm}};arm.userData={joints:{self:arm},label:'arm'};const metadata=root.userData,armMetadata=arm.userData;arm.toJSON=()=>{throw Error('Do not serialize a live joint');};
 const copy=cloneActor(root);assert.equal(root.userData,metadata);assert.equal(arm.userData,armMetadata);assert.equal(root.userData.joints.rightArm,arm);assert.deepEqual(copy.userData,{label:'actor'});assert.deepEqual(copy.getObjectByName('rightArm').userData,{label:'arm'});assert.equal(copy.children[0].children[0].geometry,mesh.geometry);assert.equal(copy.children[0].children[0].material,mesh.material);assert.notEqual(copy.children[0],arm);
});
test('actor metadata is restored even if cloning fails',()=>{
 const root=new T.Group();root.userData={joints:{},label:'actor'};const metadata=root.userData;root.clone=()=>{throw Error('clone failure');};assert.throws(()=>cloneActor(root),/clone failure/);assert.equal(root.userData,metadata);
});
test('first RAF establishes the clock without including long shader warmup',()=>{
 const clock=createFrameClock();assert.equal(clock(2000),0);assert.equal(clock(2016),.016);assert.equal(clock(2032),.016);
});
test('a stale or invalid RAF cannot reverse simulation or UI timers',()=>{
 const clock=createFrameClock();clock(1000);assert.equal(clock(900),0);assert.equal(clock(NaN),0);assert.equal(clock(1016),.016);assert.equal(clock(5016),4);
});
