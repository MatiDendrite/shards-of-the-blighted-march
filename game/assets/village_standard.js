export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x655440,roughness:.9}),{name:'timber'}),metal=Object.assign(new T.MeshStandardMaterial({color:0xa8935c,roughness:.65,metalness:.55}),{name:'metal'}),stone=Object.assign(new T.MeshStandardMaterial({color:0x858678,roughness:.95}),{name:'stone'}),cloth=Object.assign(new T.MeshStandardMaterial({color:0x80403c,roughness:1,side:T.DoubleSide}),{name:'banner'});
 const add=(geo,mat,x,y,z)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);g.add(o);return o;};
 add(new T.CylinderGeometry(.22,.34,.22,8),stone,0,.11,0);add(new T.CylinderGeometry(.044,.068,3.1,8),wood,0,1.75,0);
 add(new T.CylinderGeometry(.032,.032,1.3,8),wood,.43,3.04,0).rotation.z=Math.PI/2;
 for(const y of [.31,1.1,2.8,3.14])add(new T.CylinderGeometry(.079,.079,.065,8),metal,0,y,0);
 add(new T.OctahedronGeometry(.16),metal,0,3.4,0).scale.set(.7,1.6,.7);
 const geo=new T.PlaneGeometry(.94,1.75,8,12),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),t=.5-y/1.75;let notch=t>.72?(t-.72)/.28*(1-Math.abs(x)/.47)*.4:0;p.setXYZ(i,x,y+notch,.09*Math.sin(x*10+t*5)*t);}geo.computeVertexNormals();add(geo,cloth,.5,2.12,.025);
 const stitch=Object.assign(new T.MeshStandardMaterial({color:0xc4a96b,side:T.DoubleSide,roughness:.85}),{name:'metal'});
 for(const x of [.1,.89])add(new T.BoxGeometry(.014,1.5,.018),stitch,x,2.18,.06);
 const emblem=add(new T.RingGeometry(.13,.16,4),stitch,.5,2.3,.1);emblem.rotation.z=Math.PI/4;
 const box=new T.Box3(),v=new T.Vector3();g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)box.expandByPoint(v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));}});const c=box.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=box.min.y;});return g;
}
