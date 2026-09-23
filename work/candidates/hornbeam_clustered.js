export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x66523e,roughness:1}),{name:'timber'}),leaves=Object.assign(new T.MeshStandardMaterial({color:0x678054,roughness:1,side:T.DoubleSide}),{name:'leaves'});
 const trunk=new T.Mesh(new T.CylinderGeometry(.12,.32,4.3,9),wood);trunk.position.y=2.15;g.add(trunk);
 for(let i=0;i<16;i++){const a=i*2.399,r=.4+(i%3)*.65,x=Math.sin(a)*r,z=Math.cos(a)*r,y=3.6+(i%4)*.45;const crown=new T.Mesh(new T.SphereGeometry(1.3,10,7),leaves);crown.position.set(x,y,z);crown.scale.set(1,.7,1);crown.rotation.y=a;g.add(crown);const branch=new T.Mesh(new T.CylinderGeometry(.03,.11,r+1.5,7),wood);branch.position.set(x/2,2.9,z/2);branch.rotation.set(Math.cos(a)*.6,0,-Math.sin(a)*.6);g.add(branch);}
 const bounds=new T.Box3(),v=new T.Vector3();g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=bounds.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=bounds.min.y;});return g;
}
