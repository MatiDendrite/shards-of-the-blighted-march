export default function generate(T){
  const g=new T.Group(), m=Object.assign(new T.MeshStandardMaterial({color:0x767d74,roughness:.98}),{name:'stone'});
  const geo=new T.CylinderGeometry(.37,.68,2.8,11,14),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),level=Math.round((y+1.4)*5);const fracture=level%4===0?.93:1;const f=(1+.085*Math.sin(y*5+x*3+z*4)+.045*Math.sin(a*4+level*.6))*fracture;p.setXYZ(i,x*f+.09*Math.sin(y*2),y,z*f);}
  // Flat facets retain broken stratification under grazing light.
  geo.computeVertexNormals();const rock=new T.Mesh(geo,m);rock.position.y=1.4;g.add(rock);
  const moss=Object.assign(new T.MeshStandardMaterial({color:0x414f36,roughness:1}),{name:'foliage'});
  for(let i=0;i<9;i++){const a=i*2.4;const b=new T.Mesh(new T.DodecahedronGeometry(.16,0),moss);b.position.set(Math.sin(a)*.54,.12+(i%3)*.1,Math.cos(a)*.54);b.scale.y=.35;g.add(b);}
  const seam=Object.assign(new T.MeshStandardMaterial({color:0x515a51,roughness:1}),{name:'stone'});
  for(let i=0;i<6;i++){const a=i*2.399,o=new T.Mesh(new T.DodecahedronGeometry(.13+(i%3)*.025,0),i%2?m:seam);o.position.set(Math.sin(a)*.58,.065,Math.cos(a)*.58);o.scale.set(1,.46,1.2);o.rotation.y=a;g.add(o);}
  // Centre measured vertices and ground the talus without changing metre scale.
  g.updateMatrixWorld(true);const b=new T.Box3(),v=new T.Vector3();g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=b.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b.min.y;});
  return g;
}
