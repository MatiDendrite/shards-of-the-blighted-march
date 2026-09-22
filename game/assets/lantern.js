export default function generate(T){
  const g=new T.Group(), iron=Object.assign(new T.MeshStandardMaterial({color:0x333b36,metalness:.65,roughness:.55}),{name:'metal'}), glow=new T.MeshStandardMaterial({color:0xffbf69,emissive:0xff9b36,emissiveIntensity:2});
  const part=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;};
  part(new T.CylinderGeometry(.055,.09,1.65,7),iron,0,.825,0);
  part(new T.CylinderGeometry(.24,.18,.08,8),iron,0,1.6,0);
  part(new T.CylinderGeometry(.15,.15,.38,8),glow,0,1.83,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;part(new T.CylinderGeometry(.018,.018,.5,4),iron,Math.cos(a)*.2,1.83,Math.sin(a)*.2);}
  part(new T.ConeGeometry(.29,.20,8),iron,0,2.12,0);
  part(new T.SphereGeometry(.04,6,5),iron,0,2.25,0);
  return g;
}
