export default function generate(T){
 const g=new T.Group(),ground=Object.assign(new T.MeshStandardMaterial({color:0x706d58,roughness:1}),{name:'ground'});
 const geo=new T.PlaneGeometry(90,90,48,48);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),fade=Math.min(1,Math.max(0,(Math.abs(x)-20)/7));p.setY(i,fade*(.5+.5*Math.sin(x*.3+z*.18))*1.7);}geo.computeVertexNormals();g.add(new T.Mesh(geo,ground));
 const paving=[0x9b9a89,0x8b9184,0xa9a799,0x81887a].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:.96}),{name:'stone'}));
 let seed=4404;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let r=0;r<83;r++)for(let c=0;c<7;c++){
  if(rand()<.045)continue;const z=r*.55-27+(rand()-.5)*.12,x=(c-3)*.49+Math.sin(z*.15)*.38+(r%2)*.2+(rand()-.5)*.10;
  const w=.19+rand()*.055,h=.22+rand()*.055,s=new T.Shape(),corners=8;
  for(let j=0;j<corners;j++){const a=(j+.5)/corners*Math.PI*2,rad=.84+rand()*.18,u=Math.cos(a)*w*rad,v=Math.sin(a)*h*rad;j?s.lineTo(u,v):s.moveTo(u,v);}s.closePath();
  const rock=new T.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelThickness:.016,bevelSize:.018,bevelSegments:2,steps:1});rock.rotateX(-Math.PI/2);
  const slab=new T.Mesh(rock,paving[(r+c)%4]);slab.position.set(x,.06+rand()*.018,z);slab.rotation.set((rand()-.5)*.07,rand()*.45,(rand()-.5)*.07);g.add(slab);
 }return g;
}
