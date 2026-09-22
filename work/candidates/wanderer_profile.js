// Independent reading B: continuous revolved armour profiles.
export default function generate(T){
 const g=new T.Group();const steel=new T.MeshStandardMaterial({color:0x64747e,roughness:.45,metalness:.7}),cloth=new T.MeshStandardMaterial({color:0x793e36,roughness:1}),black=new T.MeshStandardMaterial({color:0x292c2a,roughness:1});
 function lathe(parent,coords,x,y,z,sx=1,sz=1,m=steel){const points=[];for(let i=0;i<coords.length;i+=2)points.push(new T.Vector2(coords[i],coords[i+1]));const mesh=new T.Mesh(new T.LatheGeometry(points,12),m);mesh.position.set(x,y,z);mesh.scale.set(sx,1,sz);parent.add(mesh);return mesh;}
 lathe(g,[.20,0,.23,.12,.26,.32,.19,.44,.08,.48],0,1.03,0,1,.65);
 lathe(g,[.12,0,.15,.15,.13,.26,.07,.34,0,.40],0,1.47,0,1,.92);
 lathe(g,[.30,0,.25,.18,.20,.40],0,.68,0,1,.66,cloth);
 for(const s of [-1,1]){
  lathe(g,[.08,0,.09,.2,.11,.37,.1,.48],s*.13,.11,0,1,1,black);
  lathe(g,[.09,0,.115,.18,.12,.4],s*.13,.55,0,1,1);
  lathe(g,[.095,0,.075,.16,.1,.32,.15,.44],s*.32,.95,0,1,1);
  const boot=new T.Mesh(new T.BoxGeometry(.19,.12,.30),black);boot.position.set(s*.13,.06,.07);g.add(boot);
  const hand=new T.Mesh(new T.SphereGeometry(.08,8,6),black);hand.position.set(s*.32,.88,0);g.add(hand);
 }
 const visor=new T.Mesh(new T.BoxGeometry(.24,.028,.027),black);visor.position.set(0,1.69,.139);g.add(visor);
 return g;
}
