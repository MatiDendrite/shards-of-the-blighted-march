// Independent continuous radial-ring mesh strategy, with small basal scree.
export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x858b7f,roughness:1,flatShading:true}),{name:'stone'}),verts=[],uv=[],indices=[],n=24,tiers=13;
 for(let j=0;j<=tiers;j++)for(let i=0;i<=n;i++){
  const a=i/n*Math.PI*2,t=j/tiers,r=(1-t*.65)*(1+.13*Math.sin(a*5+j*.7)),ledge=j%2?.93:1;
  verts.push(Math.cos(a)*4.4*r*ledge,j*7/tiers,Math.sin(a)*2.8*r*ledge);uv.push(i/n,j/tiers);
 }
 for(let j=0;j<tiers;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}
 verts.push(0,0,0,0,7,0);uv.push(.5,.5,.5,.5);const bottom=verts.length/3-2,top=bottom+1;
 for(let i=0;i<n;i++){indices.push(bottom,i,i+1);const a=tiers*(n+1)+i;indices.push(top,a+1,a);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();g.add(new T.Mesh(geo,stone));
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,o=new T.Mesh(new T.DodecahedronGeometry(.6,0),stone);o.position.set(Math.cos(a)*3.9,.5,Math.sin(a)*2.7);o.scale.y=.85;g.add(o);}
 g.updateMatrixWorld(true);const b=new T.Box3(),v=new T.Vector3();g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=b.getCenter(new T.Vector3());g.position.set(-c.x,-b.min.y,-c.z);return g;
}
