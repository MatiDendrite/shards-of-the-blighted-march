import * as T from 'three';
import {SKILLS,ARCANE_BOLT} from './class-data.js';

// Cosmetic spell layer. It reads combat events and state but never decides
// hits, ranges or timing. Textures are generated here (nothing to download),
// all particles share two draw calls, and every mesh hides itself when idle.

const TAU=Math.PI*2;
function random(seed){let s=seed>>>0;return()=>{s=s+0x6d2b79f5>>>0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rand=random(404);
const between=(a,b)=>a+(b-a)*rand();

function softTexture(size,kind){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,d=Math.hypot(dx,dy);let a=Math.max(0,1-d);
  if(kind==='glow'){a=Math.max(0,1-d*1.08);a=Math.pow(a,2.6)*.7+Math.pow(Math.max(0,1-d*2.6),2)*.3;}
  else{a=a*a*(3-2*a);a*=.62+.38*Math.sin(dx*6.1+Math.sin(dy*4.3)*2.2)*Math.cos(dy*5.4+dx*2.7);}
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,Math.min(1,a))*255);
 }
 const texture=new T.DataTexture(data,size,size);texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

const BILLBOARD=`attribute vec3 aCenter;attribute vec4 aTint;attribute vec3 aShape;varying vec2 vUv;varying vec4 vTint;
void main(){vUv=uv;vTint=aTint;vec4 mv=modelViewMatrix*vec4(aCenter,1.0);float c=cos(aShape.z),s=sin(aShape.z);
vec2 p=position.xy*vec2(aShape.x,aShape.x*aShape.y);mv.xy+=vec2(c*p.x-s*p.y,s*p.x+c*p.y);gl_Position=projectionMatrix*mv;}`;
const TINTED=`uniform sampler2D map;varying vec2 vUv;varying vec4 vTint;
void main(){float a=texture2D(map,vUv).a*vTint.a;if(a<.004)discard;gl_FragColor=vec4(vTint.rgb,a);
#include <colorspace_fragment>
}`;
const SURFACE=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// uv.x runs along the swing, uv.y from the inner to the outer edge.
const RIBBON=`uniform vec3 uColor;uniform vec3 uCore;uniform float uHead;uniform float uOpacity;varying vec2 vUv;
void main(){float behind=uHead-vUv.x;float trail=step(0.0,behind)*(1.0-smoothstep(0.0,.62,behind));
float edge=smoothstep(0.0,.45,vUv.y)*(1.0-smoothstep(.86,1.0,vUv.y));float rim=smoothstep(.55,.9,vUv.y);
gl_FragColor=vec4(mix(uColor,uCore,rim*(1.0-smoothstep(0.0,.3,behind))),trail*edge*uOpacity);
#include <colorspace_fragment>
}`;
const WALL=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;
void main(){float a=pow(1.0-vUv.y,2.6)*smoothstep(0.0,.08,vUv.y+.02)*uOpacity*(.7+.3*sin(vUv.x*62.0));gl_FragColor=vec4(uColor,a);
#include <colorspace_fragment>
}`;
const SHELL_V=`varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){vLocal=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const SHELL_F=`uniform vec3 uColor;uniform float uOpacity;uniform float uFlash;uniform float uTime;varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.3);
float bands=smoothstep(.9,1.0,fract(vLocal.y*5.0-uTime*.35))+smoothstep(.93,1.0,fract(atan(vLocal.z,vLocal.x)*1.9+uTime*.2));
gl_FragColor=vec4(uColor,(rim*.9+bands*rim*.8+uFlash*(.25+rim))*uOpacity);
#include <colorspace_fragment>
}`;

function particleLayer(name,capacity,texture,additive,depthTest=true){
 const quad=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
 geometry.index=quad.index;geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
 const center=new Float32Array(capacity*3),tint=new Float32Array(capacity*4),shape=new Float32Array(capacity*3);
 for(const [key,array,size] of [['aCenter',center,3],['aTint',tint,4],['aShape',shape,3]]){const a=new T.InstancedBufferAttribute(array,size);a.setUsage(T.DynamicDrawUsage);geometry.setAttribute(key,a);}
 geometry.instanceCount=0;
 const material=new T.ShaderMaterial({uniforms:{map:{value:texture}},vertexShader:BILLBOARD,fragmentShader:TINTED,transparent:true,depthWrite:false,depthTest,blending:additive?T.AdditiveBlending:T.NormalBlending});
 const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=depthTest?additive?4:3:5;
 const pool=Array.from({length:capacity},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,age:0,life:1,size:1,grow:0,r:1,g:1,b:1,alpha:1,drag:0,gravity:0,stretch:0,rot:0,spin:0,fadeIn:0,floor:false}));
 let live=0,cursor=0;
 function spawn(o){let p;if(live<capacity)p=pool[live++];else{p=pool[cursor];cursor=(cursor+1)%capacity;}
  p.vx=p.vy=p.vz=p.grow=p.drag=p.gravity=p.stretch=p.spin=p.fadeIn=p.age=0;p.alpha=1;p.floor=false;p.rot=rand()*TAU;Object.assign(p,o);return p;}
 const view=new T.Vector3();
 function update(dt,camera,heightAt){
  const inverse=camera.matrixWorldInverse;
  for(let i=0;i<live;){
   const p=pool[i];p.age+=dt;if(p.age>=p.life){pool[i]=pool[live-1];pool[live-1]=p;live--;continue;}
   const drag=Math.max(0,1-p.drag*dt);p.vx*=drag;p.vz*=drag;p.vy=p.vy*drag+p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   if(p.floor){const floor=heightAt(p.x,p.z)+.05;if(p.y<floor){p.y=floor;p.vy=Math.abs(p.vy)*.25;p.vx*=.55;p.vz*=.55;}}
   const t=p.age/p.life,fade=p.fadeIn>0&&t<p.fadeIn?t/p.fadeIn:1-(t-p.fadeIn)/(1-p.fadeIn),size=p.size*(1+p.grow*t);
   let rot=p.rot+p.spin*p.age,stretch=1;
   if(p.stretch>0){view.set(p.vx,p.vy,p.vz).transformDirection(inverse);rot=Math.atan2(-view.x,view.y);stretch=1+p.stretch*Math.hypot(p.vx,p.vy,p.vz);}
   center[i*3]=p.x;center[i*3+1]=p.y;center[i*3+2]=p.z;tint[i*4]=p.r;tint[i*4+1]=p.g;tint[i*4+2]=p.b;tint[i*4+3]=p.alpha*Math.max(0,fade);shape[i*3]=size;shape[i*3+1]=stretch;shape[i*3+2]=rot;i++;
  }
  geometry.instanceCount=live;mesh.visible=live>0;
  if(live)for(const key of ['aCenter','aTint','aShape']){const a=geometry.attributes[key];a.clearUpdateRanges();a.addUpdateRange(0,live*a.itemSize);a.needsUpdate=true;}
 }
 return{mesh,spawn,update,clear(){live=0;geometry.instanceCount=0;mesh.visible=false;},get live(){return live;}};
}

export function createSpellEffects(scene,heightAt=()=>0){
 const root=new T.Group();root.name='spellEffects';scene.add(root);
 const glowTexture=softTexture(64,'glow'),glow=particleLayer('spell-glow',640,glowTexture,true),smoke=particleLayer('spell-smoke',200,softTexture(64,'smoke'),false),flashes=particleLayer('spell-flash',32,glowTexture,true,false);root.add(smoke.mesh,glow.mesh,flashes.mesh);
 const color=new T.Color(),lift=(x,z,y)=>heightAt(x,z)+y;
 function tint(hex,scale=1){color.setHex(hex);return{r:color.r*scale,g:color.g*scale,b:color.b*scale};}
 function spark(x,y,z,hex,o={}){return glow.spawn({x,y,z,...tint(hex,o.bright??1.6),...o});}
 function puff(x,y,z,hex,o={}){return smoke.spawn({x,y,z,...tint(hex,1),alpha:.4,fadeIn:.2,drag:1.8,...o});}
 function burst(x,y,z,hex,count,speed,o={}){for(let i=0;i<count;i++){const a=rand()*TAU,up=between(o.upMin??.2,o.upMax??1),v=speed*between(.45,1);spark(x,y,z,hex,{vx:Math.sin(a)*v,vy:up*speed,vz:Math.cos(a)*v,life:between(.25,.5)*(o.lifeScale||1),size:o.size||.14,gravity:o.gravity??-6,drag:o.drag??1.4,stretch:o.stretch??.07,floor:true,...o.extra});}}
 function flash(x,y,z,hex,size,life=.16){flashes.spawn({x,y,z,...tint(hex,1.25),size,life,grow:.5});}

 // Swing ribbons: one reusable crescent per swing, head sweeping then fading.
 const arcs=new Map(),ribbons=[];
 function arcGeometry(range,arc,width){const key=[range,arc,width].map(n=>n.toFixed(2)).join(':');if(arcs.has(key))return arcs.get(key);
  const segments=28,positions=[],uvs=[],index=[],inner=Math.max(.15,range-width);
  for(let j=0;j<=segments;j++){const u=j/segments,a=-arc/2+arc*u;for(const [r,v] of [[inner,0],[range,1]]){positions.push(Math.sin(a)*r,0,Math.cos(a)*r);uvs.push(u,v);}if(j<segments){const k=j*2;index.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(index);arcs.set(key,g);return g;}
 function ribbon(x,z,angle,range,arc,hex,core,o={}){
  let r=ribbons.find(r=>!r.group.visible);
  if(!r){if(ribbons.length>=6)r=ribbons.reduce((a,b)=>a.age/a.life>b.age/b.life?a:b);else{const material=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color()},uCore:{value:new T.Color()},uHead:{value:0},uOpacity:{value:1}},vertexShader:SURFACE,fragmentShader:RIBBON,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});const mesh=new T.Mesh(arcGeometry(1,1,.3),material),group=new T.Group();mesh.frustumCulled=false;group.add(mesh);group.name='spell-ribbon';root.add(group);r={group,mesh,material};ribbons.push(r);}}
  r.mesh.geometry=arcGeometry(range,Math.min(arc,TAU*.95),o.width||.55);r.material.uniforms.uColor.value.setHex(hex).multiplyScalar(o.bright||1.3);r.material.uniforms.uCore.value.setHex(core).multiplyScalar(1.6);
  r.group.position.set(x,lift(x,z,o.height||.95),z);r.group.rotation.set(0,angle,0);r.mesh.rotation.set(0,0,o.tilt||0);r.mesh.scale.set(o.mirror?-1:1,1,1);
  Object.assign(r,{age:0,life:o.life||.32});r.group.visible=true;}

 // Expanding shock walls and a fresnel ward shell.
 const wallGeometry=new T.CylinderGeometry(1,1,1,48,1,true).translate(0,.5,0),walls=[];
 function wall(x,z,radius,hex,o={}){let w=walls.find(w=>!w.mesh.visible);
  if(!w){if(walls.length>=4)w=walls[0];else{const mesh=new T.Mesh(wallGeometry,new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color()},uOpacity:{value:1}},vertexShader:SURFACE,fragmentShader:WALL,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));mesh.name='spell-wall';mesh.frustumCulled=false;root.add(mesh);w={mesh};walls.push(w);}}
  w.mesh.material.uniforms.uColor.value.setHex(hex).multiplyScalar(o.bright||1.4);w.mesh.position.set(x,lift(x,z,-.05),z);Object.assign(w,{age:0,life:o.life||.45,from:o.from||.3,to:radius,height:o.height||.9,opacity:o.opacity||.6});w.mesh.visible=true;}
 const shell=new T.Mesh(new T.SphereGeometry(1,32,20),new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(0xf4cf86).multiplyScalar(1.5)},uOpacity:{value:0},uFlash:{value:0},uTime:{value:0}},vertexShader:SHELL_V,fragmentShader:SHELL_F,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
 shell.name='iron-ward-shell';shell.visible=false;root.add(shell);let shellFlash=0,shellPop=0;

 // Lit, faceted pieces: frost spikes erupting from the ground and debris.
 const spikeMesh=new T.InstancedMesh(new T.ConeGeometry(.12,1,5,1).translate(0,.5,0),new T.MeshStandardMaterial({color:0xd4f5ff,emissive:0x2d86ad,emissiveIntensity:.9,roughness:.12,metalness:.05,flatShading:true,transparent:true,opacity:.88}),40);
 const rockMesh=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x5b4b3d,roughness:.95,flatShading:true}),48);
 for(const m of [spikeMesh,rockMesh]){m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.count=0;m.visible=false;root.add(m);}
 spikeMesh.name='frost-spikes';rockMesh.name='spell-debris';
 const spikes=[],rocks=[],pose=new T.Object3D();
 function frostSpikes(x,z,range){for(let ring=0;ring<2;ring++){const count=ring?14:9,radius=ring?range*.78:range*.42;for(let i=0;i<count;i++){if(spikes.length>=40)spikes.shift();const a=i/count*TAU+rand()*.3+ring*.2,rr=radius*between(.85,1.1),sx=x+Math.sin(a)*rr,sz=z+Math.cos(a)*rr;spikes.push({x:sx,z:sz,y:heightAt(sx,sz)-.05,yaw:rand()*TAU,lean:between(.15,.45)*(ring?1:.6),dir:a,height:between(.55,1.05)*(ring?1:1.25),delay:ring*.07+rand()*.05,age:0,life:1.25});}}}
 function debris(x,z,count,speed,size=.08){const ground=heightAt(x,z);for(let i=0;i<count;i++){if(rocks.length>=48)rocks.shift();const a=rand()*TAU,v=speed*between(.4,1);rocks.push({x,y:ground+.15,z,vx:Math.sin(a)*v,vy:between(2.2,4.2),vz:Math.cos(a)*v,rx:rand()*TAU,ry:rand()*TAU,spin:between(-9,9),size:size*between(.6,1.4),age:0,life:between(.8,1.2)});}}
 function updateSolids(dt){
  let n=0;for(let i=spikes.length-1;i>=0;i--){const s=spikes[i];s.age+=dt;if(s.age>=s.life){spikes.splice(i,1);continue;}}
  for(const s of spikes){const t=Math.max(0,s.age-s.delay),rise=Math.min(1,t/.09),sink=Math.max(0,(s.age-(s.life-.35))/.35),h=s.height*rise*(1-sink*.9);if(h<=.001)continue;pose.position.set(s.x,s.y-sink*.3,s.z);pose.rotation.set(Math.cos(s.dir)*s.lean,s.yaw,-Math.sin(s.dir)*s.lean,'YXZ');pose.scale.set(1+rise*.3,h,1+rise*.3);pose.updateMatrix();spikeMesh.setMatrixAt(n++,pose.matrix);}
  spikeMesh.count=n;spikeMesh.visible=n>0;if(n)spikeMesh.instanceMatrix.needsUpdate=true;
  n=0;for(let i=rocks.length-1;i>=0;i--){const r=rocks[i];r.age+=dt;if(r.age>=r.life){rocks.splice(i,1);continue;}r.vy-=9.5*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.z+=r.vz*dt;const floor=heightAt(r.x,r.z)+r.size*.6;if(r.y<floor){r.y=floor;r.vy=Math.abs(r.vy)*.3;r.vx*=.5;r.vz*=.5;r.spin*=.5;}}
  for(const r of rocks){const shrink=Math.min(1,(r.life-r.age)/.25);pose.position.set(r.x,r.y,r.z);pose.rotation.set(r.rx+r.spin*r.age,r.ry+r.spin*.6*r.age,0);pose.scale.setScalar(r.size*shrink);pose.updateMatrix();rockMesh.setMatrixAt(n++,pose.matrix);}
  rockMesh.count=n;rockMesh.visible=n>0;if(n)rockMesh.instanceMatrix.needsUpdate=true;
 }

 // Composite effects, one per ability or impact.
 const hand=(p,reach=.55,height=1.15)=>({x:p.x+Math.sin(p.angle)*reach,y:lift(p.x,p.z,height),z:p.z+Math.cos(p.angle)*reach});
 function fireball(x,z,radius){const y=lift(x,z,.85);flash(x,y,z,0xffb35a,radius*2.2,.18);
  for(let i=0;i<36;i++){const a=rand()*TAU,v=between(1,3.4)*radius;spark(x,y,z,rand()<.5?0xffa13d:0xff6a1f,{vx:Math.sin(a)*v,vy:between(.4,2.6),vz:Math.cos(a)*v,size:between(.28,.5),grow:.8,life:between(.25,.45),drag:3.2,gravity:1.5,bright:1.8});}
  burst(x,y,z,0xffd08a,16,4.2,{size:.08,stretch:.09,lifeScale:1.4});
  for(let i=0;i<9;i++){const a=rand()*TAU;puff(x+Math.sin(a)*.3,y,z+Math.cos(a)*.3,0x3b3029,{vx:Math.sin(a)*.8,vy:between(.7,1.4),vz:Math.cos(a)*.8,size:between(.6,.9),grow:1.4,life:between(.8,1.2),alpha:.45});}
 }
 function bombBlast(x,z,radius){const y=lift(x,z,.4);flash(x,y+.5,z,0xffc070,radius*1.6,.22);wall(x,z,radius,0xff9a45,{height:.8,life:.4,opacity:.5});
  for(let i=0;i<46;i++){const a=rand()*TAU,v=between(1.2,3.6)*radius*.55;spark(x,y,z,rand()<.6?0xff8c2e:0xffc25a,{vx:Math.sin(a)*v,vy:between(.6,3.4),vz:Math.cos(a)*v,size:between(.3,.62),grow:.9,life:between(.28,.55),drag:3,gravity:1.2,bright:1.8});}
  burst(x,y,z,0xffe0a0,24,6,{size:.08,stretch:.1,lifeScale:1.6,upMin:.5,upMax:1.4});debris(x,z,16,3.4,.09);
  for(let i=0;i<16;i++){const a=rand()*TAU,r=between(.2,radius*.7);puff(x+Math.sin(a)*r,y,z+Math.cos(a)*r,0x2f2925,{vx:Math.sin(a)*1.2,vy:between(.9,1.8),vz:Math.cos(a)*1.2,size:between(.8,1.3),grow:1.3,life:between(1.1,1.7),alpha:.5});}
 }
 function arcaneBurst(x,z){const y=lift(x,z,.85);flash(x,y,z,0xa9d2ff,1.1,.14);burst(x,y,z,0x9fcaff,12,3,{size:.09,gravity:-2,lifeScale:.8});}
 function venomSplash(x,z){const y=lift(x,z,.85);flash(x,y,z,0x9df29a,.7,.12);burst(x,y,z,0x7bdc6e,10,2.2,{size:.1,gravity:-5});for(let i=0;i<4;i++)puff(x,y,z,0x4f8a3f,{vx:between(-.5,.5),vy:between(.2,.6),vz:between(-.5,.5),size:.45,grow:1,life:.7,alpha:.35});}
 function frostNova(p,range){const y=lift(p.x,p.z,.35);flash(p.x,y+.4,p.z,0xbff2ff,2.4,.2);frostSpikes(p.x,p.z,range);wall(p.x,p.z,range,0x9fe6ff,{height:.5,life:.5,opacity:.4});
  for(let i=0;i<28;i++){const a=rand()*TAU,v=between(2.5,5.5);puff(p.x,y,p.z,0xdff6ff,{vx:Math.sin(a)*v,vy:between(0,.35),vz:Math.cos(a)*v,drag:3.2,size:between(.5,.85),grow:1.3,life:between(.7,1.1),alpha:.38});}
  for(let i=0;i<24;i++){const a=rand()*TAU,v=between(2,5);spark(p.x,y+.3,p.z,0xc8f4ff,{vx:Math.sin(a)*v,vy:between(.2,1.6),vz:Math.cos(a)*v,size:.07,drag:2,gravity:-1.5,life:between(.4,.8),stretch:.05});}
 }
 function blink(from,to,hex){for(const [pt,inward] of [[from,true],[to,false]]){const y=lift(pt.x,pt.z,.95);flash(pt.x,y,pt.z,hex,1.5,.18);
   for(let i=0;i<22;i++){const a=rand()*TAU,r=between(.4,.9),v=between(1.5,3);const sx=inward?pt.x+Math.sin(a)*r:pt.x,sz=inward?pt.z+Math.cos(a)*r:pt.z,sy=y+between(-.6,.6);spark(sx,sy,sz,hex,{vx:Math.sin(a)*v*(inward?-1:1),vy:between(-.3,.8),vz:Math.cos(a)*v*(inward?-1:1),size:.1,life:between(.25,.4),drag:inward?0:2.5,stretch:.06});}}
  const d=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.ceil(d/.18);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps),x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;spark(x,lift(x,z,between(.5,1.4)),z,hex,{size:between(.12,.24),life:between(.2,.4)*(.5+t*.5),vy:.4,bright:1.3});}}
 function shadowDash(from,to){const d=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.ceil(d/.25);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps),x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;puff(x,lift(x,z,.8),z,0x1f2d2c,{size:.8,grow:.6,life:.35+t*.2,alpha:.45,vy:.2});spark(x,lift(x,z,between(.4,1.3)),z,0x8ff0d6,{size:.07,life:.3,vy:.5,stretch:.05});}}

 const meleeColors={sword:[0xc9d8e4,0xffffff],axe:[0xe9b16e,0xfff0c8],spear:[0xc4dcd2,0xf4fff9]},classColors={ninja:[0x72dcc0,0xe8fff8],dwarf:[0xffa556,0xfff0c4]};
 function swing(e,model){
  const p=model.player,kind=e.kind,y=lift(p.x,p.z,.95);
  if(kind==='basic'&&e.projectile==='arcane'){const h=hand(p);flash(h.x,h.y,h.z,ARCANE_BOLT.color,.55,.12);return;}
  if(kind==='basic'){const [c,core]=classColors[p.classId]||meleeColors[e.weapon]||meleeColors.sword,finisher=e.combo===3;
   ribbon(p.x,p.z,e.angle,e.range,e.arc,finisher?0xf0c070:c,core,{width:finisher?.85:.62,mirror:e.combo===2,tilt:e.combo===2?.22:e.combo===3?0:-.18,life:finisher?.4:.32,bright:1.5});
   if(finisher){const f=hand(p,e.range*.7,.9);burst(f.x,f.y,f.z,0xffd28a,12,3.2,{size:.08});}return;}
  if(kind==='cleave'){ribbon(p.x,p.z,e.angle,e.range,e.arc,0xe8c07a,0xfff3cf,{width:.85,life:.42,tilt:-.1});for(let i=0;i<14;i++){const a=e.angle-e.arc/2+e.arc*rand(),r=e.range*between(.6,1);spark(p.x+Math.sin(a)*r,y,p.z+Math.cos(a)*r,0xffd79a,{vx:Math.sin(a)*2,vy:between(.5,2),vz:Math.cos(a)*2,size:.08,gravity:-6,life:.4,stretch:.08,floor:true});}return;}
  if(kind==='slam'){const range=SKILLS.slam.range;flash(p.x,lift(p.x,p.z,.3),p.z,0xffd99c,2.2,.16);wall(p.x,p.z,range,0xd9b27a,{height:.6,life:.45,opacity:.5});debris(p.x,p.z,18,4.5,.09);
   for(let i=0;i<22;i++){const a=i/22*TAU,v=between(3,5);puff(p.x+Math.sin(a)*.5,lift(p.x,p.z,.2),p.z+Math.cos(a)*.5,0x8a7862,{vx:Math.sin(a)*v,vy:between(.2,.7),vz:Math.cos(a)*v,drag:3,size:between(.6,1),grow:1.2,life:between(.8,1.2),alpha:.5});}return;}
  if(kind==='cry'){wall(p.x,p.z,SKILLS.cry.range,0xf2d27a,{height:1.8,life:.6,opacity:.6,from:.5});flash(p.x,lift(p.x,p.z,1.3),p.z,0xffe39a,2,.22);
   for(let i=0;i<30;i++){const a=rand()*TAU,r=between(.2,.9);spark(p.x+Math.sin(a)*r,lift(p.x,p.z,.2),p.z+Math.cos(a)*r,0xffd06a,{vx:Math.sin(a)*.6,vy:between(2.5,4.5),vz:Math.cos(a)*.6,drag:1.5,size:.1,life:between(.6,1),stretch:.06});}return;}
  if(kind==='firebolt'){const h=hand(p);flash(h.x,h.y,h.z,0xffa24a,.9,.14);burst(h.x,h.y,h.z,0xffb35c,6,1.5,{size:.08,gravity:2});return;}
  if(kind==='frostnova'){frostNova(p,SKILLS.frostnova.range);return;}
  if(kind==='shadowcut'){ribbon(p.x,p.z,e.angle,e.range,e.arc,0x5fd6b8,0xeafff9,{width:.7,life:.3,tilt:.25});return;}
  if(kind==='venom'){const h=hand(p);flash(h.x,h.y,h.z,0x9cee9b,.5,.1);return;}
  if(kind==='smoke'){for(let i=0;i<24;i++){const a=rand()*TAU,v=between(1,3);puff(p.x,lift(p.x,p.z,between(.2,1.2)),p.z,0x8ea6a9,{vx:Math.sin(a)*v,vy:between(.1,.6),vz:Math.cos(a)*v,drag:2.6,size:between(.8,1.3),grow:1.1,life:between(1,1.6),alpha:.5});}return;}
  if(kind==='forgeblow'){ribbon(p.x,p.z,e.angle,e.range,e.arc,0xff9a3d,0xfff0b8,{width:1,life:.36,tilt:0,height:.8});const f=hand(p,e.range*.75,.3);flash(f.x,f.y,f.z,0xffb45a,1.6,.18);debris(f.x,f.z,8,2.5,.07);
   for(let i=0;i<22;i++){const a=e.angle+between(-.7,.7),v=between(2,5.5);spark(f.x,f.y,f.z,rand()<.5?0xffa640:0xffe08a,{vx:Math.sin(a)*v,vy:between(1,3.5),vz:Math.cos(a)*v,size:.07,gravity:-8,life:between(.4,.8),stretch:.1,floor:true});}return;}
  if(kind==='cinderbomb'){const h=hand(p,.3,1.4);burst(h.x,h.y,h.z,0xffc060,8,1.6,{size:.07});return;}
  if(kind==='ironward'){shellPop=1;for(let i=0;i<26;i++){const a=i/26*TAU;spark(p.x+Math.sin(a)*.9,lift(p.x,p.z,.1),p.z+Math.cos(a)*.9,0xf6d38e,{vy:between(1.5,3),size:.1,life:between(.5,.8),drag:1,stretch:.05});}}
 }
 function impact(e){const kind=e.kind||(e.color===SKILLS.cinderbomb.color?'cinderbomb':null);
  if(kind==='firebolt')fireball(e.x,e.z,SKILLS.firebolt.splash);else if(kind==='cinderbomb')bombBlast(e.x,e.z,e.radius||SKILLS.cinderbomb.radius||2.6);else if(kind==='venom')venomSplash(e.x,e.z);else arcaneBurst(e.x,e.z);}
 function process(events,model){for(const e of events){
  if(e.type==='swing')swing(e,model);
  else if(e.type==='classImpact')impact(e);
  else if(e.type==='classMove'){if(e.kind==='blink')blink(e.from,e.to,SKILLS.blink.color);else shadowDash(e.from,e.to);}
  else if(e.type==='absorb'){shellFlash=1;const p=model.player;burst(p.x,lift(p.x,p.z,1),p.z,0xffe1a0,8,2.4,{size:.08});}
  else if(e.type==='hit'&&e.weapon==='poison')venomSplash(e.x,e.z);
  else if(e.type==='dodge'){const p=model.player;for(let i=0;i<6;i++)puff(p.x+between(-.3,.3),lift(p.x,p.z,.1),p.z+between(-.3,.3),0x8b7b66,{vy:.3,size:.45,grow:1.2,life:.55,alpha:.3});}
  else if(e.type==='explosion'){flash(e.x,lift(e.x,e.z,1.2),e.z,0xc79bff,3.4,.3);wall(e.x,e.z,4.2,0xb688ff,{height:2,life:.7});debris(e.x,e.z,20,5,.12);burst(e.x,lift(e.x,e.z,1),e.z,0xd4b3ff,30,6,{size:.1,lifeScale:1.8});}
  else if(e.type==='bossStrike'&&e.slam){wall(e.x,e.z,4.5,0xb58aed,{height:.9,life:.5});debris(e.x,e.z,14,4.5,.1);}
 }}

 // Continuous emitters are rate based, so the look is frame-rate independent.
 const emitters=new Map();
 function emit(key,rate,dt,fn){let acc=(emitters.get(key)||0)+rate*dt;while(acc>=1){acc--;fn();}emitters.set(key,acc);}
 function update(dt,model,camera){
  const p=model.player,time=model.time;
  if(dt>0){
   const seen=new Set();
   for(const s of model.projectiles){const key='shot'+s.id,x=s.x,z=s.z,y=lift(x,z,.85),bx=-Math.sin(s.angle),bz=-Math.cos(s.angle);seen.add(key);
    if(s.kind==='firebolt'){spark(x,y,z,0xff8a2a,{size:.62,life:.05,bright:1.1});spark(x,y,z,0xffe2a8,{size:.26,life:.05,bright:1.4});emit(key,95,dt,()=>spark(x+between(-.1,.1),y+between(-.1,.1),z+between(-.1,.1),rand()<.55?0xff6a18:0xffae3a,{vx:bx*1.2+between(-.3,.3),vy:between(.4,1.3),vz:bz*1.2+between(-.3,.3),size:between(.22,.4),grow:-.35,life:between(.22,.4),drag:2,bright:1.5}));emit(key+'s',14,dt,()=>puff(x,y,z,0x3e3530,{vy:.6,size:.35,grow:1.6,life:.7,alpha:.3}));}
    else if(s.kind==='arcane'){spark(x,y,z,0x7fb4ff,{size:.42,life:.05,bright:1.1});spark(x,y,z,0xe6f2ff,{size:.16,life:.05,bright:1.3});emit(key,55,dt,()=>spark(x,y,z,0x9fcaff,{vx:bx*.8+between(-.4,.4),vy:between(-.3,.3),vz:bz*.8+between(-.4,.4),size:between(.05,.1),life:between(.18,.3),stretch:.05}));}
    else if(s.kind==='venom'){spark(x,y,z,0x9cee9b,{size:.28,life:.05,bright:1.2});emit(key,30,dt,()=>spark(x,y,z,0x7bd873,{vx:bx*2,vz:bz*2,size:.05,life:.2,stretch:.12}));}
   }
   for(const b of model.bombs){const key='bomb'+b.id,x=b.x,z=b.z,y=lift(x,z,.24+Math.max(0,1-b.age/.35)*1.1+.2),urgency=b.age/b.fuse;seen.add(key);spark(x,y,z,0xffb44f,{size:.3+urgency*.5+Math.sin(time*30)*.08,life:.05,bright:1.6});
    emit(key,30+urgency*50,dt,()=>spark(x,y,z,0xffd27a,{vx:between(-1.5,1.5),vy:between(1,2.8),vz:between(-1.5,1.5),size:.05,gravity:-7,life:between(.25,.45),stretch:.08}));}
   for(const key of emitters.keys())if((key.startsWith('shot')||key.startsWith('bomb'))&&!seen.has(key))emitters.delete(key);
   if(p.hp>0){
    if(p.buff>0)emit('buff',18,dt,()=>{const a=rand()*TAU;spark(p.x+Math.sin(a)*.45,lift(p.x,p.z,between(.1,1.4)),p.z+Math.cos(a)*.45,0xffc85a,{vy:between(.8,1.8),size:.07,life:between(.5,.8),stretch:.05});});
    if(p.smoke>0)emit('smoke',16,dt,()=>{const a=rand()*TAU,r=between(.3,.8);puff(p.x+Math.sin(a)*r,lift(p.x,p.z,between(.2,1.3)),p.z+Math.cos(a)*r,0x8ea6a9,{vx:Math.sin(a)*.3,vy:between(.1,.4),size:between(.6,.95),grow:.8,life:between(.8,1.2),alpha:.32});});
    if(p.ward>0)emit('ward',10,dt,()=>{const a=rand()*TAU,h=between(-.8,.8);spark(p.x+Math.sin(a)*.95*Math.sqrt(1-h*h*.6),lift(p.x,p.z,.85+h),p.z+Math.cos(a)*.95*Math.sqrt(1-h*h*.6),0xffe2a6,{vy:.4,size:.07,life:.45});});
   }
   for(const e of model.enemies){if(e.hp<=0||(e.x-p.x)**2+(e.z-p.z)**2>28*28)continue;const height=e.kind==='boss'?2.2:e.kind==='wolf'?.9:1.5;
    if(e.poison>0)emit('poison'+e.id,7,dt,()=>spark(e.x+between(-.3,.3),lift(e.x,e.z,between(.3,height)),e.z+between(-.3,.3),0x86e27a,{vy:between(.4,.9),size:between(.06,.12),life:between(.5,.8),bright:1.3}));
    if(e.slow>0)emit('slow'+e.id,6,dt,()=>spark(e.x+between(-.35,.35),lift(e.x,e.z,between(.2,height)),e.z+between(-.35,.35),0xc9f2ff,{vy:between(-.5,-.1),size:.06,life:.6,spin:3,bright:1.4}));}
  }
  shellFlash=Math.max(0,shellFlash-dt*3);shellPop=Math.max(0,shellPop-dt*3);
  shell.visible=p.ward>0&&p.hp>0;if(shell.visible){const s=1+shellPop*.35,u=shell.material.uniforms;shell.position.set(p.x,lift(p.x,p.z,.9),p.z);shell.scale.set(.95*s,(p.classId==='dwarf'?1:1.25)*s,.95*s);u.uTime.value=time;u.uFlash.value=shellFlash;u.uOpacity.value=Math.min(1,p.wardTime/.6)*(.35+.35*p.ward/50);}
  for(const r of ribbons){if(!r.group.visible)continue;r.age+=dt;const t=r.age/r.life;if(t>=1){r.group.visible=false;continue;}r.material.uniforms.uHead.value=Math.min(1.35,t/.35*1.35);r.material.uniforms.uOpacity.value=t<.4?1:1-(t-.4)/.6;}
  for(const w of walls){if(!w.mesh.visible)continue;w.age+=dt;const t=w.age/w.life;if(t>=1){w.mesh.visible=false;continue;}const ease=1-(1-t)**3,r=w.from+(w.to-w.from)*ease;w.mesh.scale.set(r,w.height*(1-t*.6),r);w.mesh.material.uniforms.uOpacity.value=w.opacity*(1-t);}
  updateSolids(dt);glow.update(dt,camera,heightAt);smoke.update(dt,camera,heightAt);flashes.update(dt,camera,heightAt);
 }
 function clear(){glow.clear();smoke.clear();flashes.clear();spikes.length=rocks.length=0;spikeMesh.count=rockMesh.count=0;spikeMesh.visible=rockMesh.visible=false;for(const r of ribbons)r.group.visible=false;for(const w of walls)w.mesh.visible=false;shell.visible=false;emitters.clear();shellFlash=shellPop=0;}
 return{process,update,clear,get active(){return glow.live+smoke.live+flashes.live+spikes.length+rocks.length+ribbons.filter(r=>r.group.visible).length+walls.filter(w=>w.mesh.visible).length;}};
}
