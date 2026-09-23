export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x898d7d,roughness:1}),{name:'stone'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:1}),{name:'timber'}),rope=Object.assign(new T.MeshStandardMaterial({color:0xa69772,roughness:1}),{name:'fabric'}),water=new T.MeshStandardMaterial({color:0x182f35,roughness:.28,metalness:.3});
 for(let row=0;row<3;row++)for(let i=0;i<12;i++){const a=(i+(row%2)*.5)*Math.PI/6,block=new T.Mesh(new T.BoxGeometry(.5,.3,.32),stone);block.position.set(Math.sin(a)*.91,.15+row*.31,Math.cos(a)*.91);block.rotation.y=a;g.add(block);}
 const disc=new T.Mesh(new T.CircleGeometry(.74,24),water);disc.rotation.x=-Math.PI/2;disc.position.y=.15;g.add(disc);
 for(const x of [-1.1,1.1]){const post=new T.Mesh(new T.BoxGeometry(.15,2.7,.18),wood);post.position.set(x,1.35,0);g.add(post);}
 const beam=new T.Mesh(new T.BoxGeometry(2.6,.22,.23),wood);beam.position.y=2.65;g.add(beam);
 const axle=new T.Mesh(new T.CylinderGeometry(.12,.12,2.4,12),wood);axle.rotation.z=Math.PI/2;axle.position.y=2;g.add(axle);
 const line=new T.Mesh(new T.CylinderGeometry(.025,.025,1.6,6),rope);line.position.set(0,1.25,.13);g.add(line);
 for(let i=0;i<8;i++){const coil=new T.Mesh(new T.TorusGeometry(.14,.023,5,12),rope);coil.rotation.y=Math.PI/2;coil.position.set((i-3.5)*.05,2,0);g.add(coil);}
 const iron=Object.assign(new T.MeshStandardMaterial({color:0x465350,roughness:.58,metalness:.45}),{name:'metal'});
 for(let i=0;i<12;i++){const a=(i+.25)*Math.PI/6,cap=new T.Mesh(new T.BoxGeometry(.51,.12,.4),stone);cap.position.set(Math.sin(a)*.91,1,Math.cos(a)*.91);cap.rotation.y=a;g.add(cap);}
 for(const x of [-1.1,1.1])for(const y of [.3,1.93]){const strap=new T.Mesh(new T.BoxGeometry(.2,.12,.23),iron);strap.position.set(x,y,0);g.add(strap);}
 const crank=new T.Mesh(new T.BoxGeometry(.1,.48,.1),iron);crank.position.set(1.2,1.8,0);g.add(crank);
 const handle=new T.Mesh(new T.CylinderGeometry(.055,.055,.22,8),wood);handle.rotation.z=Math.PI/2;handle.position.set(1.19,1.56,0);g.add(handle);
 const bucket=new T.Mesh(new T.LatheGeometry([[.14,0],[.22,.34],[.17,.34],[.1,.04]].map(([x,y])=>new T.Vector2(x,y)),12),Object.assign(wood.clone(),{side:T.DoubleSide}));bucket.position.set(.55,1.06,.65);g.add(bucket);
 for(const y of [1.13,1.34]){const hoop=new T.Mesh(new T.TorusGeometry(y>1.2?.205:.158,.018,5,12),iron);hoop.rotation.x=Math.PI/2;hoop.position.set(.55,y,.65);g.add(hoop);}
 const bail=new T.Mesh(new T.TorusGeometry(.2,.014,5,12,Math.PI),iron);bail.position.set(.55,1.39,.65);g.add(bail);
 return g;
}
