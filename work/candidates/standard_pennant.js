export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x655440,roughness:1}),{name:'timber'}),metal=Object.assign(new T.MeshStandardMaterial({color:0xb3a06a,metalness:.5,roughness:.65}),{name:'metal'}),cloth=Object.assign(new T.MeshStandardMaterial({color:0x82483e,roughness:1,side:T.DoubleSide}),{name:'banner'});
 const pole=new T.Mesh(new T.CylinderGeometry(.045,.08,3.4,8),wood);pole.position.y=1.7;g.add(pole);const base=new T.Mesh(new T.CylinderGeometry(.17,.3,.16,8),metal);base.position.y=.08;g.add(base);
 const shape=new T.Shape();shape.moveTo(0,3.1);shape.lineTo(1.45,2.55);shape.lineTo(0,2);shape.closePath();g.add(new T.Mesh(new T.ShapeGeometry(shape),cloth));const tip=new T.Mesh(new T.ConeGeometry(.09,.32,8),metal);tip.position.y=3.56;g.add(tip);
 const b=new T.Box3().setFromObject(g),c=b.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;});return g;
}
