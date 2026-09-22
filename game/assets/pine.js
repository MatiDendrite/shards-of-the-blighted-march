// Curved bough planes retain a 3D silhouette; the game applies an original alpha texture.
export default function generate(T){
 const root=new T.Group(),bark=Object.assign(new T.MeshStandardMaterial({color:0x574638,roughness:1}),{name:'timber'}),needles=Object.assign(new T.MeshStandardMaterial({color:0x3c5140,roughness:1,side:T.DoubleSide}),{name:'needles'});
 const trunk=new T.Mesh(new T.CylinderGeometry(.055,.22,6.3,10,5),bark);trunk.position.y=3.15;root.add(trunk);
 for(let tier=0;tier<9;tier++)for(let j=0;j<7;j++){
  const a=j*Math.PI*2/7+tier*2.399,len=(2.05-tier*.19)*(1+.13*Math.sin(j*5+tier)),y=1.15+tier*.57;
  const group=new T.Group();group.position.y=y;group.rotation.y=a;root.add(group);
  const limb=new T.Mesh(new T.CylinderGeometry(.012,.043,len,5),bark);limb.position.set(0,-.13,len*.43);limb.rotation.x=Math.PI/2+.16;group.add(limb);
  for(let cross=0;cross<2;cross++){
   const geo=new T.PlaneGeometry(len*.91,len,2,4),p=geo.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)/len+.5;p.setXYZ(i,x,t*len,.12*t+.19*t*t-Math.abs(x)*.12);}geo.computeVertexNormals();
   const spray=new T.Mesh(geo,needles);spray.rotation.x=Math.PI/2;spray.rotation.y=cross*.35-.16;spray.position.z=.03;group.add(spray);
  }
 }
 for(let i=0;i<3;i++){const tip=new T.Mesh(new T.PlaneGeometry(.9,1.5,1,3),needles);tip.position.y=5.9;tip.rotation.y=i*Math.PI/3;root.add(tip);}
 const box=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=box.getCenter(new T.Vector3());root.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=box.min.y;});return root;
}
