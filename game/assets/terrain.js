export default function generate(T){
 const g=new T.Group(),ground=Object.assign(new T.MeshStandardMaterial({color:0x706d58,roughness:1}),{name:'ground'});
 const geo=new T.PlaneGeometry(160,160,96,96);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),fade=Math.min(1,Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-62)/12));p.setY(i,fade*fade*Math.max(0,4.5+2.8*Math.sin(x*.075+z*.09)+2*Math.cos(z*.12-x*.065)));}geo.computeVertexNormals();g.add(new T.Mesh(geo,ground));
 const paving=[0x999484,0x8a897d,0xa4a08e,0x858678].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:.96}),{name:'stone'}));
 let seed=4404;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let r=0;r<83;r++)for(let c=0;c<7;c++){
  if(rand()<.045)continue;const z=r*.55-27+(rand()-.5)*.12,x=(c-3)*.49+Math.sin(z*.15)*.38+(r%2)*.2+(rand()-.5)*.10;
  const w=.122+rand()*.009,h=.168+rand()*.011,s=new T.Shape(),cut=.016;
  [[-w+cut,-h],[w-cut,-h],[w,-h+cut],[w,h-cut],[w-cut,h],[-w+cut,h],[-w,h-cut],[-w,-h+cut]].forEach(([u,v],i)=>{i?s.lineTo(u,v):s.moveTo(u,v);});s.closePath();
  const rock=new T.ExtrudeGeometry(s,{depth:.023,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:1,steps:1});rock.rotateX(-Math.PI/2);
  const slab=new T.Mesh(rock,paving[(r+c)%4]);slab.position.set(x,.06+rand()*.018,z);slab.rotation.set((rand()-.5)*.07,rand()*.45,(rand()-.5)*.07);g.add(slab);
 }return g;
}
