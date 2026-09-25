import * as T from 'three';

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>v*v*(3-2*v);
const mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y){let h=Math.imul(x,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
// Periodic value noise: the derivatives and mipmaps agree across repeat seams.
function noise(u,v,period){
 const x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
 const at=(a,b)=>hash((a%period+period)%period,(b%period+period)%period);
 return mix(mix(at(ix,iy),at(ix+1,iy),fx),mix(at(ix,iy+1),at(ix+1,iy+1),fx),fy);
}

export function surfaceSample(kind,u,v){
 const broad=noise(u,v,4),grain=noise(u,v,32),fine=noise(u,v,96);
 if(kind==='timber'){
  const rings=Math.sin((u*27+noise(u,v,4)*.7)*Math.PI*2)*.5+.5;
  return {height:.46+rings*.035+grain*.016+fine*.012,roughness:.74+(1-rings)*.16,tint:.88+grain*.08};
 }
 if(kind==='plaster')return {height:.5+(broad-.5)*.03+grain*.025+fine*.016,roughness:.88+fine*.1,tint:.9+broad*.08};
 if(kind==='tile'){
  const strata=noise(u,v*4,8);
  return {height:.4+broad*.06+strata*.022+grain*.025+fine*.012,roughness:.72+grain*.2,tint:.76+broad*.13+strata*.035};
 }
 if(kind==='stone')return {height:.38+broad*.035+grain*.07+fine*.018,roughness:.76+grain*.18,tint:.81+broad*.09+grain*.04};
 throw Error(`Unknown surface detail: ${kind}`);
}

export function surfacePixels(kind,size=256){
 if(!Number.isInteger(size)||size<8||size>512||(size&(size-1)))throw Error('Surface size must be a power of two between 8 and 512.');
 const heights=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),normals=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const s=surfaceSample(kind,x/size,y/size),i=y*size+x;heights[i]=s.height;
  for(let c=0;c<3;c++){albedo[i*4+c]=Math.round(clamp(s.tint)*255);roughness[i*4+c]=Math.round(clamp(s.roughness)*255);}
  albedo[i*4+3]=roughness[i*4+3]=255;
 }
 const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x+1,y)-at(x-1,y))*size*.14,dy=(at(x,y+1)-at(x,y-1))*size*.14,length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normals[i]=Math.round((.5-dx/length*.5)*255);normals[i+1]=Math.round((.5-dy/length*.5)*255);normals[i+2]=Math.round((.5+.5/length)*255);normals[i+3]=255;
 }
 return {albedo,roughness,normals};
}

// One shared set per kind per load, not per house or per region. Raster albedos
// supply timber/plaster colour; these maps add subtle procedural microrelief,
// not a claim of scanned, physically measured displacement.
export function createSurfaceDetails(renderer){
 const cache=new Map(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return kind=>{
  if(cache.has(kind))return cache.get(kind);
  const size=256,pixels=surfacePixels(kind,size);
  const texture=(data,colorSpace=T.NoColorSpace)=>{
   const t=new T.DataTexture(data,size,size);t.colorSpace=colorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
   t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=anisotropy;t.needsUpdate=true;renderer.initTexture?.(t);return t;
  };
  const maps={map:['stone','tile'].includes(kind)?texture(pixels.albedo,T.SRGBColorSpace):null,normalMap:texture(pixels.normals),roughnessMap:texture(pixels.roughness)};cache.set(kind,maps);return maps;
 };
}

// Bake construction shading into vertices before batching. No extra meshes,
// material variants or screen-space pass are needed for individual roof tiles.
export function shadeArchitecture(mesh,kind,tone){
 const geo=mesh.geometry,p=geo.attributes.position;if(geo.attributes.color)return;
 geo.computeBoundingBox();const bounds=geo.boundingBox,h=Math.max(.01,bounds.max.y-bounds.min.y),colors=new Float32Array(p.count*3);
 const variation=hash(Math.round(mesh.position.x*113),Math.round((mesh.position.y+mesh.position.z)*127));
 for(let i=0;i<p.count;i++){
  let shade=1;
  if(kind==='tile')shade=(.76+variation*.24)*(geo.attributes.normal.getY(i)>.7?1:.65);
  if(kind==='plaster')shade=.78+.22*smooth(clamp((p.getY(i)-bounds.min.y)/h*2));
  if(kind==='stone'||kind==='paving')shade=.86+variation*.14;
  if(kind==='timber')shade=.9+.1*smooth(clamp((p.getY(i)-bounds.min.y)/h*3));
  // Keep authored stone variation in vertices, not separate materials/draws.
  const stoneTone=(kind==='stone'||kind==='paving')&&tone?.isColor;
  colors[i*3]=shade*(stoneTone ? .65+tone.r*.55 : 1);
  colors[i*3+1]=shade*(stoneTone ? .65+tone.g*.55 : 1);
  colors[i*3+2]=shade*(stoneTone ? .65+tone.b*.55 : 1);
 }
 geo.setAttribute('color',new T.BufferAttribute(colors,3));mesh.material.vertexColors=true;
}
