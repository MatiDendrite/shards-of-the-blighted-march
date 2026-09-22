// Extruded blade with central ridge.
export default function generate(T){
 const g=new T.Group(),steel=Object.assign(new T.MeshStandardMaterial({color:0x9da9ac,metalness:.8,roughness:.34}),{name:'metal'}),dark=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:.9}),{name:'timber'});
 const part=(geo,m,y)=>{const o=new T.Mesh(geo,m);o.position.y=y;g.add(o);return o;};
 part(new T.IcosahedronGeometry(.065,1),steel,.065);part(new T.CylinderGeometry(.032,.037,.20,10),dark,.21);
 for(let i=0;i<7;i++){const r=part(new T.TorusGeometry(.035,.005,4,10),steel,.125+i*.025);r.rotation.x=Math.PI/2;}
 const guard=part(new T.BoxGeometry(.29,.033,.05),steel,.33);guard.rotation.z=.025;
 const s=new T.Shape();s.moveTo(-.044,0);s.lineTo(.044,0);s.lineTo(.031,.62);s.lineTo(0,.76);s.lineTo(-.031,.62);s.closePath();
 const blade=part(new T.ExtrudeGeometry(s,{depth:.016,bevelEnabled:true,bevelSize:.008,bevelThickness:.009,bevelSegments:1,steps:1}),steel,.35);blade.position.z=-.008;
 const fuller=part(new T.BoxGeometry(.009,.53,.003),dark,.64);fuller.position.z=.02;
 g.userData.gripY=.21;return g;
}
