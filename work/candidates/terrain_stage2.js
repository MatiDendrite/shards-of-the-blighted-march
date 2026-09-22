export default function generate(T){
  const g=new T.Group();
  const ground=Object.assign(new T.MeshStandardMaterial({color:0x494c3d,roughness:1}),{name:'ground'});
  const geo=new T.PlaneGeometry(90,90,100,100);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),fade=Math.min(1,Math.max(0,(Math.abs(x)-20)/7));p.setY(i,fade*(.5+.5*Math.sin(x*.3+z*.18))*1.7-.10);}
  geo.computeVertexNormals();for(let i=0;i<geo.attributes.uv.count;i++)geo.attributes.uv.setY(i,geo.attributes.uv.getY(i)*34.6);const terrain=new T.Mesh(geo,ground);g.add(terrain);
  const paving=[0x74776b,0x656d65,0x83867b].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:.95}),{name:'stone'}));
  for(let r=0;r<64;r++)for(let c=0;c<5;c++){
    const z=r*.68-26, x=(c-2)*.62+Math.sin(z*.15)*.6;
    const shape=new T.Shape();for(let j=0;j<7;j++){const a=j/7*Math.PI*2,rad=.27+Math.sin(j*4+r*7+c)*.035;const u=Math.cos(a)*rad,v=Math.sin(a)*rad;j?shape.lineTo(u,v):shape.moveTo(u,v);}shape.closePath();
    const stone=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.015,bevelSize:.02,bevelSegments:1,steps:1});stone.rotateX(-Math.PI/2);
    const slab=new T.Mesh(stone,paving[(r+c)%3]);slab.position.set(x,.015+Math.sin(r*3+c)*.015,z);slab.rotation.y=Math.sin(r*4+c*8)*.25;g.add(slab);
  }
  g.children.forEach(o=>{o.position.y+=.1;});return g;
}
