// Low coursed masonry, open timber rail and small geometric flowers.
export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x9b9984,roughness:.96}),{name:'stone'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x63503c,roughness:.94}),{name:'timber'}),leaf=Object.assign(new T.MeshStandardMaterial({color:0x546b3e,roughness:1,side:T.DoubleSide}),{name:'foliage'}),petal=Object.assign(new T.MeshStandardMaterial({color:0xaca1cb,roughness:1,side:T.DoubleSide}),{name:'petals'}),cream=petal.clone();cream.color.setHex(0xd7ca9d);
 function box(w,h,d,x,y,z,m){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
 for(let row=0;row<3;row++)for(let i=0;i<8;i++){const x=-1.53+i*.435+(row%2)*.05;box(.41,.19,.39,x,.105+row*.205,0,stone).rotation.y=Math.sin(i*13+row)*.03;}
 for(const x of [-1.66,1.66]){for(let j=0;j<5;j++)box(.46,.18,.49,x,.09+j*.185,0,stone);box(.53,.11,.55,x,.99,0,stone);}
 box(3.05,.105,.11,0,.96,0,wood);for(const x of [-1,1])box(.08,.56,.1,x,.67,0,wood).rotation.z=x*.68;
 for(let i=0;i<11;i++){
  const x=-1.47+i*.29,z=(i%2?1:-1)*.30,h=.23+(i%4)*.055;
  const stem=new T.Mesh(new T.CylinderGeometry(.008,.012,h,4),leaf);stem.position.set(x,h/2,z);g.add(stem);
  for(let j=0;j<4;j++){const geo=new T.PlaneGeometry(.09,.23,1,3),p=geo.attributes.position;for(let k=0;k<p.count;k++){const t=p.getY(k)/.23+.5;p.setX(k,p.getX(k)*Math.sin(Math.PI*t));}geo.computeVertexNormals();const blade=new T.Mesh(geo,leaf);blade.position.set(x+Math.sin(j*1.8)*.09,h*.45,z+Math.cos(j*1.8)*.09);blade.rotation.set(-.6,j*1.8,.5);g.add(blade);}
  for(let j=0;j<5;j++){const flower=new T.Mesh(new T.CircleGeometry(.045,5),i%3?petal:cream);flower.rotation.x=-Math.PI/2;flower.position.set(x+Math.sin(j*1.256)*.034,h,z+Math.cos(j*1.256)*.034);g.add(flower);}
 }
 const bounds=new T.Box3(),v=new T.Vector3();g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=bounds.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=bounds.min.y;});return g;
}
