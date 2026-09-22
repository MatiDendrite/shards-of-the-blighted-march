export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x333341,metalness:.4,roughness:.38}),{name:'stone'}),edge=new T.MeshStandardMaterial({color:0x947aca,emissive:0x7653b1,emissiveIntensity:1.1,roughness:.5});
 for(let i=0;i<7;i++){const a=i*2.4,h=i?1.2+(i%3)*.45:3.2,r=i?.35:.57;
  const geo=new T.CylinderGeometry(0,r,h,5,2),p=geo.attributes.position;for(let j=0;j<p.count;j++){const y=p.getY(j);p.setX(j,p.getX(j)+Math.sin(y*2+i)*.07);}geo.computeVertexNormals();
  const crystal=new T.Mesh(geo,stone);crystal.position.set(i?Math.sin(a)*.55:0,h/2,i?Math.cos(a)*.55:0);g.add(crystal);
  const vein=new T.Mesh(new T.CylinderGeometry(.008,.018,h*.73,5),edge);vein.position.copy(crystal.position);vein.position.z+=r*.48;vein.rotation.z=.15*Math.sin(a);g.add(vein);
 }
 for(let i=0;i<12;i++){const a=i*2.4,b=new T.Mesh(new T.DodecahedronGeometry(.19+(i%3)*.045,0),stone);b.position.set(Math.sin(a)*.65,.13,Math.cos(a)*.65);b.scale.y=.5;g.add(b);}
 const box=new T.Box3().setFromObject(g),c=box.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.y-=box.min.y;o.position.z-=c.z;});return g;
}
