import * as T from 'three';
import {RECIPES,surface} from '../lib/surfaces.js';

// Extra surface recipes for the deferred props (decor, landmarks, loot). They
// follow the library contract: a height field plus how tint and roughness follow
// it, and the albedo only modulates each part's own colour.
const clamp01=v=>v<0?0:v>1?1:v;
function fbm(n,x,y,octaves=4){let a=1,f=1,sum=0,norm=0;for(let i=0;i<octaves;i++){sum+=a*n(x*f,y*f);norm+=a;a*=.5;f*=2.07;}return sum/norm;}
const PROP_RECIPES={
 // Vertical plates split by deep dark fissures that wander along the trunk.
 bark:{tile:.55,seed:151,rough:[.78,1],bump:1.25,
  height:(n,x,y)=>{const ridge=Math.abs(Math.sin((x*9+fbm(n,x*2,y*.8,3)*1.6)*Math.PI));const plate=Math.pow(ridge,.28);return clamp01(plate*.8+(fbm(n,x*14,y*5,3)*.5+.5)*.2);},
  tint:h=>.5+h*.62},
 // Long parallel stalks with a few darker strands.
 straw:{tile:.35,seed:167,rough:[.74,.96],bump:.8,
  height:(n,x,y)=>clamp01(fbm(n,x*70,y*2.5,3)*.5+.5),
  tint:(h,n,x,y)=>.76+h*.34+fbm(n,x*9+3,y*.6,2)*.1},
 // Soft clumps with bright tips and damp dark hollows.
 moss:{tile:.45,seed:181,rough:[.84,1],bump:.9,
  height:(n,x,y)=>clamp01(Math.pow(fbm(n,x*12,y*12,5)*.5+.5,1.3)+Math.pow(clamp01(fbm(n,x*40,y*40,2)*.5+.5),4)*.3),
  tint:h=>.62+h*.55},
 // Dressed ashlar: four courses of two blocks per tile, alternate courses
 // offset by half a block, recessed mortar joints, a chiselled face and a
 // different tone per block so a wall reads as laid stone, not one slab.
 masonry:{tile:1.6,seed:211,rough:[.72,1],bump:1.6,
  height:(n,x,y)=>{const row=Math.floor(y*4),bx=x*2+(row%2)*.5,fx=bx-Math.floor(bx),fy=y*4-row,edge=Math.min(fx,1-fx)*2.2,joint=Math.min(1,Math.min(edge,Math.min(fy,1-fy))/.07);return clamp01(Math.pow(joint,.6)*.78+(fbm(n,x*9,y*9,4)*.5+.5)*.22);},
  tint:(h,n,x,y)=>{const row=Math.floor(y*4),block=Math.floor((x*2+(row%2)*.5)%2),tone=n(block*3.7+row*1.9+.5,row*2.3+.5)*.5+.5;return h<.3?.4+h*.5:.62+tone*.24+h*.1;}},
 // Packed earth with clods and embedded grit.
 soil:{tile:.9,seed:193,rough:[.86,1],bump:.9,
  height:(n,x,y)=>{const base=fbm(n,x*6,y*6,5)*.5+.5,grit=Math.pow(clamp01(fbm(n,x*26,y*26,2)*.5+.5),3);return clamp01(base*.7+grit*.3);},
  tint:h=>.72+h*.42},
};
Object.assign(RECIPES,PROP_RECIPES);

// Material names the coded props use, mapped onto a recipe. Emissive markers,
// glass, berries and blossom stay clean on purpose: they are read at a glance.
const ALIASES={masonry:'masonry',fabric:'fabric',metal:'metal',gold:'metal',bark:'bark',straw:'straw',moss:'moss',seaweed:'moss',weeds:'moss',herb:'foliage',soil:'soil',sand:'soil',ore:'stone',paint:'plaster',bone:'plaster',wax:'plaster',mushroom:'plaster'};
const NORMAL={masonry:1,fabric:.55,metal:.45,bark:1,straw:.7,moss:.8,foliage:.5,soil:.8,stone:.8,plaster:.35};
export const propRecipe=name=>ALIASES[name]??null;

// Density goes into cloned UVs so each recipe and colour keeps one shared
// material and assetlib merging is untouched (see lib/surfaces.js).
export function applyPropSurfaces(root){
 const shared=new Map(),box=new T.Box3(),size=new T.Vector3();let textured=0;
 root.traverse(o=>{
  if(!o.isMesh||!o.material||Array.isArray(o.material)||!o.geometry.attributes.uv)return;
  const m0=o.material,recipe=propRecipe(m0.name);if(!recipe||m0.map)return;
  const s=surface(T,recipe,PROP_RECIPES[recipe]?256:512);
  // Planar UVs in object space along each vertex's dominant normal: blocks,
  // weave and grain keep one real-world size on every part, however the
  // primitive laid out its own UVs (extrusions use shape units, boxes 0..1).
  const geo=o.geometry.clone(),p=geo.attributes.position,nr=geo.attributes.normal,uv=geo.attributes.uv,density=1/s.tileMeters;
  if(nr)for(let i=0;i<uv.count;i++){const nx=Math.abs(nr.getX(i)),ny=Math.abs(nr.getY(i)),nz=Math.abs(nr.getZ(i));uv.setXY(i,(ny>=nx&&ny>=nz||nz>=nx?p.getX(i):p.getZ(i))*density,(ny>=nx&&ny>=nz?p.getZ(i):p.getY(i))*density);}
  else{box.setFromObject(o);box.getSize(size);const u=Math.max(1,Math.max(size.x,size.z)*density),v=Math.max(1,size.y*density);for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*u,uv.getY(i)*v);}
  o.geometry=geo;
  const key=[recipe,m0.uuid].join('|');let m=shared.get(key);
  if(!m){m=m0.clone();m.map=s.map;m.roughnessMap=s.roughnessMap;m.normalMap=s.normalMap;m.normalScale=new T.Vector2(NORMAL[recipe],NORMAL[recipe]);m.needsUpdate=true;shared.set(key,m);}
  o.material=m;textured++;
 });
 return {textured,materials:shared.size};
}
