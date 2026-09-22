export default function generate(T){
  const g=new T.Group(), bark=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:1}),{name:'timber'}), leaf=Object.assign(new T.MeshStandardMaterial({color:0x34463a,roughness:1}),{name:'foliage'});
  const trunk=new T.Mesh(new T.CylinderGeometry(.09,.23,6,9),bark);trunk.position.y=3;g.add(trunk);
  // Individual downward-angled boughs, not stacked cones.
  for(let tier=0;tier<7;tier++)for(let b=0;b<7;b++){
    const a=b/7*Math.PI*2+tier*1.37, len=1.8-tier*.19, y=1.7+tier*.64;
    const branch=new T.Mesh(new T.CylinderGeometry(.018,.055,len,5),bark);
    branch.position.set(Math.sin(a)*len*.42,y-.18,Math.cos(a)*len*.42);branch.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(a),-.3,Math.cos(a)).normalize());g.add(branch);
    for(let k=0;k<3;k++){const t=(k+1)/3;const needles=new T.Mesh(new T.IcosahedronGeometry(1,0),leaf);needles.scale.set(len*(.40-t*.13),.25,len*.37);needles.position.set(Math.sin(a)*len*t*.85,y-.24*t,Math.cos(a)*len*t*.85);needles.rotation.y=a;needles.rotation.z=Math.sin(a)*.20;needles.rotation.x=Math.cos(a)*.20;g.add(needles);}
  }
  const tip=new T.Mesh(new T.ConeGeometry(.37,1.2,7),leaf);tip.position.y=6;g.add(tip);return g;
}
