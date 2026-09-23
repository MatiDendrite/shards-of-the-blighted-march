export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x898d7d,roughness:1}),{name:'stone'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:1}),{name:'timber'}),rope=Object.assign(new T.MeshStandardMaterial({color:0xa69772,roughness:1}),{name:'fabric'}),water=new T.MeshStandardMaterial({color:0x182f35,roughness:.28,metalness:.3});
 for(let row=0;row<3;row++)for(let i=0;i<12;i++){const a=(i+(row%2)*.5)*Math.PI/6,block=new T.Mesh(new T.BoxGeometry(.5,.3,.32),stone);block.position.set(Math.sin(a)*.91,.15+row*.31,Math.cos(a)*.91);block.rotation.y=a;g.add(block);}
 const disc=new T.Mesh(new T.CircleGeometry(.74,24),water);disc.rotation.x=-Math.PI/2;disc.position.y=.15;g.add(disc);
 for(const x of [-1.1,1.1]){const post=new T.Mesh(new T.BoxGeometry(.15,2.7,.18),wood);post.position.set(x,1.35,0);g.add(post);}
 const beam=new T.Mesh(new T.BoxGeometry(2.6,.22,.23),wood);beam.position.y=2.65;g.add(beam);
 const axle=new T.Mesh(new T.CylinderGeometry(.12,.12,2.4,12),wood);axle.rotation.z=Math.PI/2;axle.position.y=2;g.add(axle);
 const line=new T.Mesh(new T.CylinderGeometry(.025,.025,1.6,6),rope);line.position.set(0,1.25,.13);g.add(line);
 for(let i=0;i<8;i++){const coil=new T.Mesh(new T.TorusGeometry(.14,.023,5,12),rope);coil.rotation.y=Math.PI/2;coil.position.set((i-3.5)*.05,2,0);g.add(coil);}return g;
}
