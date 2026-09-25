import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {surfaceSample,surfacePixels,createSurfaceDetails,shadeArchitecture} from '../game/src/surface-detail.js';
import {applyVisualQuality} from '../game/src/visual-quality.js';
import house from '../game/assets/village_house.js';

for(const kind of ['timber','plaster','tile','stone']){
 test(`${kind}: detail fields repeat without seams and are deterministic`,()=>{
  for(const [u,v] of [[0,0],[.21,.63],[.998,.005]]){
   const a=surfaceSample(kind,u,v);
   for(const b of [surfaceSample(kind,u+1,v),surfaceSample(kind,u,v+1)])for(const key of Object.keys(a))assert(Math.abs(a[key]-b[key])<1e-10);
  }
  const pixels=surfacePixels(kind,64);assert.deepEqual(pixels,surfacePixels(kind,64));
  for(let i=0;i<pixels.normals.length;i+=4){
   const n=Array.from(pixels.normals.slice(i,i+3),v=>v/255*2-1);
   assert(Math.abs(Math.hypot(...n)-1)<.015);assert(n[2]>.7);assert.equal(pixels.normals[i+3],255);
   assert(pixels.roughness[i]>=150);assert(pixels.roughness[i]<=255);
  }
  assert(new Set(pixels.roughness).size>10);
 });
}

test('detail textures share storage and distinguish colour from linear data',()=>{
 const uploads=[],details=createSurfaceDetails({capabilities:{getMaxAnisotropy:()=>4},initTexture:t=>uploads.push(t)});
 const tile=details('tile');for(let i=0;i<50;i++)assert.equal(details('tile'),tile);
 assert.equal(uploads.length,3);assert.equal(tile.map.colorSpace,T.SRGBColorSpace);
 assert.equal(tile.normalMap.colorSpace,T.NoColorSpace);assert.equal(tile.roughnessMap.colorSpace,T.NoColorSpace);
 for(const texture of Object.values(tile)){assert.equal(texture.anisotropy,4);assert.equal(texture.wrapS,T.RepeatWrapping);assert.equal(texture.wrapT,T.RepeatWrapping);assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);assert(texture.generateMipmaps);assert.equal(texture.image.width,256);}
 assert.throws(()=>surfacePixels('tile',65));assert.throws(()=>surfaceSample('unknown',0,0));
});

test('individual roof shades use vertices without introducing new materials',()=>{
 const root=house(T),shades=new Set(),materials=new Set();
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material.name!=='tile')return;
  mesh.geometry=mesh.geometry.clone();materials.add(mesh.material);shadeArchitecture(mesh,'tile');
  shades.add(mesh.geometry.attributes.color.getX(0));assert(mesh.material.vertexColors);
  assert([...mesh.geometry.attributes.color.array].every(v=>Number.isFinite(v)&&v>=.45&&v<=1));
 });
 assert.equal(materials.size,1);assert(shades.size>20);
});

test('construction shading preserves already-authored vertex colours',()=>{
 const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());
 const color=new T.BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3).fill(.7),3);
 mesh.geometry.setAttribute('color',color);shadeArchitecture(mesh,'plaster');assert.equal(mesh.geometry.attributes.color,color);
});

test('quality switching updates real shadow targets without rebuilding the scene',()=>{
 let disposed=0,dpr=0;const target=()=>({dispose(){disposed++;}});
 const shadow={mapSize:new T.Vector2(1024,1024),map:target(),mapPass:target()};
 const renderer={capabilities:{maxTextureSize:4096},shadowMap:{},setPixelRatio:r=>{dpr=r;}},rig={csm:{lights:[{shadow}]}};
 assert.equal(applyVisualQuality(renderer,rig,'high',3),'high');assert.equal(dpr,1.5);assert.equal(disposed,2);assert.equal(shadow.map,null);assert.equal(shadow.mapSize.x,2048);assert.equal(rig.csm.shadowMapSize,2048);assert(renderer.shadowMap.needsUpdate);
 applyVisualQuality(renderer,rig,'high',3);assert.equal(disposed,2);
 shadow.map=target();applyVisualQuality(renderer,rig,'low',3);assert.equal(dpr,1);assert.equal(shadow.mapSize.x,1024);assert.equal(disposed,3);
 assert.equal(applyVisualQuality(renderer,rig,'__proto__',NaN),'low');assert.equal(dpr,1);
 renderer.capabilities.maxTextureSize=1024;applyVisualQuality(renderer,rig,'high',1);assert.equal(dpr,1);assert.equal(shadow.mapSize.x,1024);
});
