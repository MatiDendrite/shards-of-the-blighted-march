export default function generate(T){
  const g=new T.Group(), m=Object.assign(new T.MeshStandardMaterial({color:0x767d74,roughness:.98}),{name:'stone'});
  const geo=new T.CylinderGeometry(.37,.68,2.8,7,4),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const f=1+.09*Math.sin(y*5+x*3+z*4);p.setXYZ(i,x*f+.09*Math.sin(y*2),y,z*f);}
  geo.computeVertexNormals();const rock=new T.Mesh(geo,m);rock.position.y=1.4;g.add(rock);
  const moss=Object.assign(new T.MeshStandardMaterial({color:0x414f36,roughness:1}),{name:'foliage'});
  for(let i=0;i<9;i++){const a=i*2.4;const b=new T.Mesh(new T.DodecahedronGeometry(.16,0),moss);b.position.set(Math.sin(a)*.54,.12+(i%3)*.1,Math.cos(a)*.54);b.scale.y=.35;g.add(b);}
  return g;
}
