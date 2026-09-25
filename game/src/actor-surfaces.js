import * as T from 'three';
import {ASSET} from '../lib/assetlib.js';

const TAU=Math.PI*2,cache=new Map();
const profiles={metal:{rough:.62,normal:.19,tile:.32},fabric:{rough:1,normal:.23,tile:.24},leather:{rough:.9,normal:.28,tile:.18},fur:{rough:1,normal:.26,tile:.28}};
function noise(u,v,period){
 const x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y),sx=x-ix,sy=y-iy,fx=sx*sx*(3-2*sx),fy=sy*sy*(3-2*sy);
 const at=(a,b)=>{let h=Math.imul((a%period+period)%period,374761393)^Math.imul((b%period+period)%period,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const a=at(ix,iy),b=at(ix+1,iy),c=at(ix,iy+1),d=at(ix+1,iy+1);return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
// Small periodic fields, not downloaded images. Cloth, hide and fur no longer
// share the scenery's wood grain or coarse stone-like normal treatment.
export function actorSurfaceSample(kind,u,v){
 const grain=noise(u,v,48)*2-1,broad=noise(u,v,7)*2-1;
 if(kind==='metal'){const brush=Math.sin(TAU*(u*43+v));return{height:.5+brush*.014+grain*.006,tint:.92+broad*.035,roughness:.68+grain*.12+broad*.06};}
 if(kind==='fabric'){const weave=Math.sin(TAU*u*32)*Math.sin(TAU*v*32);return{height:.5+weave*.025,tint:.95+weave*.025+broad*.015,roughness:.93+weave*.04};}
 if(kind==='leather')return{height:.5+grain*.022+broad*.006,tint:.91+grain*.045+broad*.025,roughness:.84+grain*.09};
 if(kind==='fur'){const strands=noise(u*4,v,16)*2-1;return{height:.5+strands*.016,tint:.95+strands*.022+broad*.02,roughness:.94+grain*.025};}
 throw Error(`Unknown actor surface: ${kind}`);
}
export function actorSurfaceMaps(kind){
 if(cache.has(kind))return cache.get(kind);
 const size=128,height=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,s=actorSurfaceSample(kind,x/size,y/size);height[i]=s.height;
  for(let c=0;c<3;c++){albedo[i*4+c]=Math.round(s.tint*255);roughness[i*4+c]=Math.round(s.roughness*255);}albedo[i*4+3]=roughness[i*4+3]=255;
 }
 const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x-1,y)-at(x+1,y))*4,dy=(at(x,y-1)-at(x,y+1))*4,len=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal.set([Math.round((dx/len*.5+.5)*255),Math.round((dy/len*.5+.5)*255),Math.round((1/len*.5+.5)*255),255],i);
 }
 const texture=(bytes,color=false)=>{const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.name=`actor-${kind}`;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;if(color)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;};
 const maps={map:texture(albedo,true),roughnessMap:texture(roughness),normalMap:texture(normal)};cache.set(kind,maps);return maps;
}
export function applyActorSurfaces(root){
 const materials=new Map(),size=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  const original=o.material,kind=original.name==='timber'?'leather':original.name,profile=profiles[kind];
  if(!materials.has(original)){
   const m=original.clone();m.userData.actorSurface=kind;
   if(profile){Object.assign(m,actorSurfaceMaps(kind));m.normalScale.setScalar(profile.normal);m.roughness=profile.rough;}
   else if(kind==='skin'){m.roughness=.82;m.metalness=0;}
   else if(kind==='hair'){Object.assign(m,actorSurfaceMaps('fur'));m.normalScale.setScalar(.2);m.roughness=1;}
   m.needsUpdate=true;materials.set(original,m);
  }
  o.material=materials.get(original);
  if(!profile)return;
  const geo=o.geometry.clone(),uv=geo.attributes.uv;
  if(uv){geo.computeBoundingBox();geo.boundingBox.getSize(size);size.multiply(o.scale);const u=Math.max(.18,Math.max(size.x,size.z)/profile.tile),v=Math.max(.18,size.y/profile.tile);for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*u,uv.getY(i)*v);}
  // Deliberately baked low-amplitude construction variation: shared materials
  // still batch within joints, and enemy flash/portrait clones need no shader hooks.
  const p=geo.attributes.position,n=geo.attributes.normal,authored=geo.attributes.color,colors=new Float32Array(p.count*3),tone=.96+Math.sin(o.position.x*37+o.position.y*23+o.position.z*31)*.025;
  for(let i=0;i<p.count;i++){const shade=tone*(.96+.04*Math.max(0,n.getY(i)));colors.set(authored?[authored.getX(i)*shade,authored.getY(i)*shade,authored.getZ(i)*shade]:[shade,shade,shade],i*3);}
  geo.setAttribute('color',new T.BufferAttribute(colors,3));o.geometry=geo;o.material.vertexColors=true;
 });
 if(root.userData.compactActorPalette)compactActorPalette(root);
 return root;
}
// Bake only base colour, in linear space. Compatible skin/eye/metal/leather materials
// can then share a joint batch without custom shaders or losing their colours.
// Player fabric keeps its semantic palette for legacy tint comparisons. New
// cast costumes opt in separately because their colours are authored per role.
function compactActorPalette(root){
 const materials=new Map();
 const names=['metal','skin','eyes','leather',...(root.userData.compactActorFabric?['fabric']:[])];
 root.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material)||!names.includes(o.material.name))return;
  const m=o.material,g=o.geometry.clone(),p=g.attributes.position,authored=m.vertexColors?g.attributes.color:null,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)colors.set([m.color.r*(authored?authored.getX(i):1),m.color.g*(authored?authored.getY(i):1),m.color.b*(authored?authored.getZ(i):1)],i*3);
  g.setAttribute('color',new T.BufferAttribute(colors,3));o.geometry=g;
  if(!materials.has(m)){const copy=m.clone();copy.color.setRGB(1,1,1);copy.vertexColors=true;copy.needsUpdate=true;materials.set(m,copy);}
  o.material=materials.get(m);
 });
}
export async function loadActorAsset(url,options={}){return applyActorSurfaces(await ASSET(url,{...options,surfaces:false}));}

export function styleRaiderMaterial(material){
 const light=Math.max(material.color.r,material.color.g,material.color.b);material.color.multiplyScalar(.76);
 // Keep lining, cloak and embroidery distinct instead of painting all fabric
 // the same green. The neutral player/portrait materials are never modified.
 if(material.name==='fabric')material.color.setHex(light>.25?0x9b9775:light>.075?0x465342:0x242d29);
 return material;
}
