export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x68513c,roughness:1}),{name:'timber'}),cloth=Object.assign(new T.MeshStandardMaterial({color:0x803f3a,roughness:1,side:T.DoubleSide}),{name:'banner'});
 for(const x of [-.6,.6]){const pole=new T.Mesh(new T.CylinderGeometry(.055,.08,3.3,8),wood);pole.position.set(x,1.65,0);g.add(pole);}const beam=new T.Mesh(new T.BoxGeometry(1.45,.1,.12),wood);beam.position.y=3.1;g.add(beam);
 for(let i=0;i<5;i++){const h=1.6+(i%2)*.16,geo=new T.PlaneGeometry(.19,h,1,7),p=geo.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,Math.sin(p.getY(j)*4+i)*.06);geo.computeVertexNormals();const panel=new T.Mesh(geo,cloth);panel.position.set((i-2)*.2,3-h/2,0);g.add(panel);}return g;
}
