export default function generate(T){
 const g=new T.Group(),iron=Object.assign(new T.MeshStandardMaterial({color:0x889498,metalness:.7,roughness:.45}),{name:'metal'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:.9}),{name:'timber'}),leather=Object.assign(new T.MeshStandardMaterial({color:0x793e36,roughness:1}),{name:'fabric'});
 const shaft=new T.Mesh(new T.CylinderGeometry(.027,.04,1.02,10,4),wood);shaft.position.y=.51;g.add(shaft);
 const shape=new T.Shape();shape.moveTo(-.065,.86);shape.lineTo(.1,.86);shape.quadraticCurveTo(.23,.73,.33,.61);shape.lineTo(.37,1.13);shape.quadraticCurveTo(.18,1.03,-.065,1.05);shape.closePath();
 const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1}),iron);blade.position.set(-.15,0,-.025);shaft.position.x=-.15;g.add(blade);
 for(let i=0;i<11;i++){const wrap=new T.Mesh(new T.TorusGeometry(.039,.008,4,10),leather);wrap.rotation.x=Math.PI/2;wrap.position.set(-.15,.12+i*.025,0);g.add(wrap);}
 const butt=new T.Mesh(new T.SphereGeometry(.045,8,6),iron);butt.position.set(-.15,.045,0);g.add(butt);g.userData.gripY=.26;g.userData.gripX=-.15;return g;
}
