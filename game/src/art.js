import * as T from 'three';
export async function loadArt(renderer){
 const loader=new T.TextureLoader();
 const [floor,stone,fir]=await Promise.all(['forest-floor','stone','fir'].map(n=>loader.loadAsync(new URL(`../textures/${n}.webp`,import.meta.url).href)));
 for(const texture of [floor,stone,fir]){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 for(const texture of [floor,stone])texture.wrapS=texture.wrapT=T.RepeatWrapping;
 function apply(root){const materials=new Map();root.traverse(o=>{
  if(!o.isMesh)return;const original=o.material,name=original.name;if(!['ground','stone','needles'].includes(name))return;
  if(!materials.has(original)){const m=original.clone();
   if(name==='needles'){m.map=fir;m.color.setHex(0xd0d5bd);m.alphaTest=.42;m.side=T.DoubleSide;m.normalMap=null;m.roughnessMap=null;m.roughness=1;}
   else{m.map=name==='ground'?floor:stone;m.color.setHex(0xd8d5c7);m.normalScale?.setScalar(name==='ground'?.45:.8);m.roughness=.95;m.bumpMap=m.map;m.bumpScale=name==='ground'?.07:.055;}
   m.needsUpdate=true;materials.set(original,m);
  }o.material=materials.get(original);
  if(name!=='needles'){const geo=o.geometry.clone(),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,density=name==='ground'?1/3:1/1.6;
   for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,(ny>=nx&&ny>=nz?p.getX(i):nx>nz?p.getZ(i):p.getX(i))*density,(ny>=nx&&ny>=nz?p.getZ(i):p.getY(i))*density);}o.geometry=geo;
  }
 });return root;}
 return{apply};
}
