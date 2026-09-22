export default function generate(T){
 const g=new T.Group(),iron=Object.assign(new T.MeshStandardMaterial({color:0x9da9ac,metalness:.8,roughness:.35}),{name:'metal'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:.95}),{name:'timber'});
 const shaft=new T.Mesh(new T.CylinderGeometry(.024,.031,1.65,10,4),wood);shaft.position.y=.86;g.add(shaft);
 const butt=new T.Mesh(new T.ConeGeometry(.032,.12,8),iron);butt.rotation.z=Math.PI;butt.position.y=.06;g.add(butt);
 const profile=new T.Shape();profile.moveTo(0,0);profile.quadraticCurveTo(-.13,.16,0,.46);profile.quadraticCurveTo(.13,.16,0,0);const head=new T.Mesh(new T.ExtrudeGeometry(profile,{depth:.015,bevelEnabled:true,bevelSize:.006,bevelThickness:.005,bevelSegments:1,steps:1}),iron);head.position.set(0,1.65,-.0075);g.add(head);
 for(let i=0;i<8;i++){const ring=new T.Mesh(new T.TorusGeometry(.03,.004,4,8),iron);ring.rotation.x=Math.PI/2;ring.position.y=.73+i*.025;g.add(ring);}
 g.userData.gripY=.85;return g;
}
