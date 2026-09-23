export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x969683,roughness:1}),{name:'stone'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x5d4836,roughness:1}),{name:'timber'});
 const outline=new T.Shape();outline.moveTo(-1.8,0);outline.lineTo(1.8,0);outline.lineTo(1.8,.96);outline.lineTo(1.4,.96);outline.lineTo(1.4,.56);outline.lineTo(-1.4,.56);outline.lineTo(-1.4,.96);outline.lineTo(-1.8,.96);outline.closePath();const geo=new T.ExtrudeGeometry(outline,{depth:.42,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,steps:1});const wall=new T.Mesh(geo,stone);wall.position.set(0,.018,-.21);g.add(wall);
 const rail=new T.Mesh(new T.CylinderGeometry(.05,.06,3.25,6),wood);rail.rotation.z=Math.PI/2;rail.position.y=.88;g.add(rail);
 for(const x of [-1.61,1.61]){const cap=new T.Mesh(new T.BoxGeometry(.5,.1,.56),stone);cap.position.set(x,1,0);g.add(cap);}return g;
}
