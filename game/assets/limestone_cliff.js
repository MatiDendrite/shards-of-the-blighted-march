// Layered extruded strata, individually fractured ledges and talus all around.
export default function generate(T){
 const g=new T.Group(),mats=[0x72796e,0x858a7e,0x666f65,0x96978b].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:1}),{name:'stone'}));
 let seed=904;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function stratum(x,z,rx,rz,y,h,index){
  const s=new T.Shape();[[-1,-.62],[-.65,-1],[.7,-1],[1,-.53],[1,.68],[.58,1],[-.77,1],[-1,.46]].forEach(([a,b],i)=>{const u=a*rx*(.88+rand()*.12),v=b*rz*(.88+rand()*.12);i?s.lineTo(u,v):s.moveTo(u,v);});s.closePath();
  const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.09,bevelThickness:.06,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);
  const o=new T.Mesh(geo,mats[index%4]);o.position.set(x,y+.06,z);o.rotation.set((rand()-.5)*.12,(rand()-.5)*.25,(rand()-.5)*.12);g.add(o);
 }
 // Faulted masses have independent heights and breaks, rather than a regular
 // concentric stack. Thin shelves alternate with taller fractured faces.
 for(const [x,z,rx,rz,height] of [[-2.8,-.9,1.65,1.65,4.3],[-.8,-1,1.75,1.7,6.6],[1.5,-.6,1.65,1.65,5.7],[2.5,1.15,1.6,1.4,3.6],[-1.7,1.25,1.7,1.5,3.2],[.2,1.4,1.45,1.2,4.2]]){
  let y=0,level=0;while(y<height-.001){const h=Math.min(height-y,rand()<.25?.3:.65+rand()*1.1),t=1-y/height*.22;stratum(x+Math.sin(level*3+x)*.3,z+Math.cos(level*2)*.25,rx*t*(h<.4?1.1:1),rz*t,y,h+.08,level++);y+=h;}
 }
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2;stratum(Math.cos(a)*3.85,Math.sin(a)*2.8,.35+rand()*.5,.32+rand()*.35,0,.2+rand()*.65,i);}
 g.updateMatrixWorld(true);const b=new T.Box3(),v=new T.Vector3();g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});
 const c=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());g.scale.set(9/size.x,7/size.y,6/size.z);g.position.set(-c.x*g.scale.x,-b.min.y*g.scale.y,-c.z*g.scale.z);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
