// Independent reading C: shaped extruded armour shells and angular silhouette.
export default function generate(T){
 const g=new T.Group(),steel=new T.MeshStandardMaterial({color:0x64747e,roughness:.5,metalness:.6}),red=new T.MeshStandardMaterial({color:0x793e36,roughness:1}),dark=new T.MeshStandardMaterial({color:0x302d29,roughness:1});
 function panel(points,depth,m,x,y,z){const shape=new T.Shape();points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1}),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
 panel([[-.2,0],[.2,0],[.28,.32],[.18,.46],[-.18,.46],[-.28,.32]],.26,steel,0,1.01,-.13);
 panel([[-.13,0],[.13,0],[.14,.23],[0,.38],[-.14,.23]],.24,steel,0,1.49,-.12);
 panel([[-.28,0],[.28,0],[.2,.39],[-.2,.39]],.04,red,0,.66,.12);
 panel([[-.33,0],[.33,0],[.23,.78],[-.23,.78]],.035,red,0,.7,-.19);
 for(const s of [-1,1]){
  panel([[-.085,0],[.085,0],[.1,.42],[-.1,.42]],.18,dark,s*.13,.10,-.07);
  panel([[-.09,0],[.09,0],[.12,.36],[-.12,.36]],.20,steel,s*.13,.55,-.08);
  panel([[-.08,0],[.08,0],[.12,.40],[-.12,.40]],.18,steel,s*.33,.93,-.09);
  const boot=new T.Mesh(new T.BoxGeometry(.19,.12,.31),dark);boot.position.set(s*.13,.06,.075);g.add(boot);
 }
 const slit=new T.Mesh(new T.BoxGeometry(.25,.027,.02),dark);slit.position.set(0,1.70,.135);g.add(slit);
 return g;
}
