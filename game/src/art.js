import * as T from 'three';
import {applySurfaces} from '../lib/surfaces.js';
import {createSurfaceDetails,shadeArchitecture} from './surface-detail.js';
import {patchGroundSurface} from './landscape-ground.js';

// These authored bitmap surfaces replace all three procedural maps AND the UVs
// below. Generating the discarded maps/copies first wastes boot time, not detail.
const bitmapOnly=new Set(['stone','paving','timber','plaster','tile','needles','leaves']);
export function applyScenerySurfaces(root){
 return applySurfaces(T,{traverse(visitor){root.traverse(o=>{if(!o.isMesh||!bitmapOnly.has(o.material.name))visitor(o);});}});
}
export async function loadArt(renderer){
 // Decode/orient bitmaps before upload instead of doing that work in the first
 // draw. Keep the original dimensions, compression and transparent leaf edges.
 const bitmap=typeof createImageBitmap==='function',loader=bitmap?new T.ImageBitmapLoader().setOptions({imageOrientation:'flipY',premultiplyAlpha:'none'}):new T.TextureLoader();
 const [floor,stone,fir,timber,plaster,meadow,leaves]=await Promise.all(['forest-floor','stone','fir','oak-albedo','limewash-albedo','meadow','hornbeam-leaves'].map(async n=>{
  const image=await loader.loadAsync(new URL(`../textures/${n}.webp`,import.meta.url).href),texture=bitmap?new T.Texture(image):image;
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(!['fir','hornbeam-leaves'].includes(n))texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;
  // Upload each completed file while the other transfers and world construction
  // continue. Do not leave all seven uploads for the first visible draw.
  renderer.initTexture?.(texture);return texture;
 }));
 const details=createSurfaceDetails(renderer),time={value:0},focus={value:new T.Vector2(0,11)},finished=new WeakSet();
 function apply(root){const materials=new Map();root.traverse(o=>{
  if(!o.isMesh)return;const original=o.material,name=original.name;if(!['ground','stone','paving','needles','leaves','timber','plaster','tile'].includes(name))return;
  if(!materials.has(original)){const m=original.clone();
   if(name==='needles'||name==='leaves'){m.map=name==='leaves'?leaves:fir;m.color.setHex(name==='leaves'?0xe1e4cf:0xd0d5bd);m.alphaTest=.42;m.side=T.DoubleSide;m.normalMap=null;m.roughnessMap=null;m.roughness=1;}
   else if(['timber','plaster','tile','stone','paving'].includes(name)){
    const maps=details(name==='paving'?'stone':name);m.map=name==='timber'?timber:name==='plaster'?plaster:name==='stone'?stone:maps.map;
    if(name==='stone'||name==='paving')m.color.setHex(name==='stone'?0xc0c3b4:0xb3b5ad);
    else m.color.setHex(name==='timber'?0xb7a28d:name==='plaster'?0xfff6e8:0x737976);
    m.normalMap=maps.normalMap;m.normalScale.setScalar(name==='plaster'?.32:name==='timber'||name==='tile'?.5:.75);
    m.roughnessMap=maps.roughnessMap;m.roughness=1;m.metalness=0;m.bumpMap=null;m.bumpScale=0;
   }
   else{m.map=floor;m.color.setHex(0xf2efdf);m.normalScale?.setScalar(.35);m.roughness=.95;m.bumpMap=m.map;m.bumpScale=.045;}
   m.needsUpdate=true;materials.set(original,m);
  }o.material=materials.get(original);
  if(name!=='needles'&&name!=='leaves'){const geo=o.geometry.clone(),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,density=name==='ground'?1/3:name==='timber'?.65:name==='plaster'?.55:1/1.6;
   geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3()),grain=size.x>size.y&&size.x>size.z?'x':size.z>size.y?'z':'y';
   for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let u=ny>=nx&&ny>=nz?p.getX(i):nx>nz?p.getZ(i):p.getX(i),v=ny>=nx&&ny>=nz?p.getZ(i):p.getY(i);if(name==='timber'&&grain!=='y'){u=p.getY(i)+(grain==='x'?p.getZ(i):p.getX(i));v=grain==='x'?p.getX(i):p.getZ(i);}uv.setXY(i,u*density,v*density);}o.geometry=geo;
   if(name!=='ground')shadeArchitecture(o,name,original.color);
  }
 });return root;}
 function finish(root){root.traverse(o=>{if(!o.isMesh)return;const m=o.material;
  if(finished.has(m))return;
  const ground=m.name==='ground',cover=['foliage','petals'].includes(m.name),wind=['leaves','foliage','banner'].includes(m.name);if(!ground&&!wind&&!cover)return;finished.add(m);
  // Install after tinting/baking: Material.clone does not copy shader callbacks.
  m.onBeforeCompile=shader=>{
   if(ground)patchGroundSurface(shader,meadow,stone);
   if(wind){shader.uniforms.uLandscapeTime=time;shader.vertexShader='uniform float uLandscapeTime;\n'+shader.vertexShader;const amount=m.name==='leaves'?'.045':m.name==='banner'?'.028':'.08',height=m.name==='foliage'?'position.y-groundBase':'position.y';shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat breeze = sin(uLandscapeTime * 1.5 + position.x * .8 + position.z * .55); transformed.x += breeze * ${amount} * min(1.0, max(0.0, ${height})); transformed.z += cos(uLandscapeTime + position.x * .5) * ${amount} * .3 * min(1.0, max(0.0, ${height}));`);}
   if(cover){shader.uniforms.uGrassFocus=focus;shader.vertexShader='attribute float groundBase; uniform vec2 uGrassFocus;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','transformed.y = groundBase + (transformed.y-groundBase)*(1.0-smoothstep(24.0,34.0,distance(position.xz,uGrassFocus)));\n#include <project_vertex>');}
  };m.customProgramCacheKey=()=>`landscape-relief-v3-${m.name}`;m.needsUpdate=true;
 });}
 return{apply,finish,update(dt,player){time.value+=Math.min(dt,.1);if(player)focus.value.set(player.x,player.z);}};
}
