// Independent block-fault strategy: displaced, bevelled cuboid geology.
export default function generate(T){
 const g=new T.Group(),mats=[0x7a8075,0x969b90,0x626b60].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:1}),{name:'stone'}));
 for(let tier=0;tier<5;tier++)for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++){
  if(Math.abs(x)+Math.abs(z)>4-tier*.45)continue;
  const w=1.63,d=1.7,s=new T.Shape(),cut=.2;[[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],[w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const geo=new T.ExtrudeGeometry(s,{depth:1.33,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1});geo.rotateX(-Math.PI/2);
  const o=new T.Mesh(geo,mats[Math.abs(x+z+tier)%3]);o.position.set(x*1.5+Math.sin(tier*2+z)*.15,tier*1.31+.035,z*1.58+Math.sin(x+tier)*.11);o.rotation.y=Math.sin(x*3+z+tier)*.13;g.add(o);
 }
 g.updateMatrixWorld(true);const b=new T.Box3(),v=new T.Vector3();g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=b.getCenter(new T.Vector3());g.position.set(-c.x,-b.min.y,-c.z);return g;
}
