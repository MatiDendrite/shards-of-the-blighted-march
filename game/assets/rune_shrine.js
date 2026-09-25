// 404 reference: shrine. A tall standing stone on a stepped dais, carved with
// a ring and a glowing rune (its own named group), flanked by candles.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.95,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const stoneMat=mat('stone',0xa39a88),darkMat=mat('stone',0x7a7266),mossMat=mat('moss',0x5d7f39),waxMat=mat('wax',0xf0e6cc,.8),runeMat=Object.assign(new THREE.MeshStandardMaterial({color:0x8fe6ff,emissive:0x2fb8f0,emissiveIntensity:1.4,roughness:.4}),{name:'glow'}),flameMat=Object.assign(new THREE.MeshStandardMaterial({color:0xffc070,emissive:0xff9030,emissiveIntensity:1.6}),{name:'glow'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 add(new THREE.CylinderGeometry(1.05,1.15,.18,10),darkMat,0,.09,0);add(new THREE.CylinderGeometry(.8,.9,.16,10),stoneMat,0,.26,0);
 // Monolith: an extruded tapered slab with bevelled edges.
 const slab=new THREE.Shape();slab.moveTo(-.38,0);slab.lineTo(.38,0);slab.lineTo(.3,1.9);slab.lineTo(.08,2.15);slab.lineTo(-.22,2.02);slab.lineTo(-.32,1.9);slab.closePath();
 add(new THREE.ExtrudeGeometry(slab,{depth:.32,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1}),stoneMat,0,.34,-.16);
 add(new THREE.TorusGeometry(.24,.03,4,20),darkMat,0,1.6,.2);
 const rune=new THREE.Group();rune.name='shrine-rune';rune.position.set(0,1.6,.21);root.add(rune);
 for(const [x,y,w,h,r] of [[0,0,.04,.34,0],[-.07,.06,.04,.18,.6],[.07,.06,.04,.18,-.6],[0,-.12,.18,.04,0]]){const bar=add(new THREE.BoxGeometry(w,h,.02),runeMat,x,y,0,rune);bar.rotation.z=r;}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2,g=add(new THREE.SphereGeometry(.025,6,4),runeMat,Math.cos(a)*.24,Math.sin(a)*.24,0,rune);}
 for(const [x,z,s] of [[-.55,.45,1],[.6,.4,.8],[.45,-.55,1.1]]){add(new THREE.CylinderGeometry(.04*s,.045*s,.18*s,8),waxMat,x,.34+.09*s,z);add(new THREE.ConeGeometry(.025*s,.07*s,6),flameMat,x,.34+.21*s,z);}
 add(new THREE.SphereGeometry(1,8,5),mossMat,-.5,.19,-.5).scale.set(.35,.05,.28);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
