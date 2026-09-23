// Independent 404 reading: concentric fluted armour shells and segmented skirt.
export default function generate(T){
 const g=new T.Group(),steel=new T.MeshStandardMaterial({color:0x59606a,metalness:.7,roughness:.5,side:T.DoubleSide}),trim=new T.MeshStandardMaterial({color:0xb0a387,metalness:.6,roughness:.5}),cloth=new T.MeshStandardMaterial({color:0x50334f,roughness:1,side:T.DoubleSide});
 const lathe=(p,x,y,z,coords,m=steel,sx=1,sz=1)=>{const o=new T.Mesh(new T.LatheGeometry(coords.map(([r,h])=>new T.Vector2(r,h)),16),m);o.position.set(x,y,z);o.scale.set(sx,1,sz);p.add(o);return o;};
 lathe(g,0,1.2,0,[[.29,0],[.27,.15],[.36,.55],[.28,.72],[.1,.79]],steel,1,.65);
 for(let i=0;i<4;i++)lathe(g,0,1.30+i*.12,0,[[.29,0],[.30,.02],[.29,.045]],trim,1,.72);
 lathe(g,0,2,0,[[.16,0],[.20,.2],[.14,.4],[0,.67]]);
 lathe(g,0,.77,0,[[.42,0],[.28,.46]],cloth,1,.68);
 for(const s of [-1,1]){lathe(g,s*.18,.13,0,[[.11,0],[.1,.4],[.16,.57],[.14,1.02]],steel,1,.9);lathe(g,s*.44,1.1,0,[[.09,0],[.1,.43],[.19,.71],[.1,.84]]);const foot=new T.Mesh(new T.BoxGeometry(.25,.13,.43),steel);foot.position.set(s*.18,.065,.07);g.add(foot);const visor=new T.Mesh(new T.BoxGeometry(.12,.024,.03),cloth);visor.position.set(s*.087,2.21,.18);g.add(visor);}
 const cape=new T.Mesh(new T.ConeGeometry(.56,1.3,12,1,true,0,Math.PI),cloth);cape.rotation.y=Math.PI/2;cape.scale.z=.5;cape.position.set(0,1.25,-.12);g.add(cape);
 const b=new T.Box3().setFromObject(g),c=b.getCenter(new T.Vector3());g.children.forEach(n=>{n.position.x-=c.x;n.position.z-=c.z;n.position.y-=b.min.y;});return g;
}
