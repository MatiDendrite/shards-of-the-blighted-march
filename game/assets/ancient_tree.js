// 404 reference: landmark. An ancient oak: a twisted trunk, buttress roots,
// heavy limbs carrying a wide crown, hanging charm ribbons, a stone offering
// shrine at the roots and a named ring of glowing mushrooms.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const barkMat=mat('bark',0x6e5a44),darkBarkMat=mat('bark',0x54432f),leafMat=mat('leaves',0x5f8a3e,.9,{side:THREE.DoubleSide}),leafDeepMat=mat('leaves',0x46703a,.9,{side:THREE.DoubleSide}),mossMat=mat('moss',0x43522d),stoneMat=mat('stone',0xa19886),ribbonMat=mat('fabric',0xb33b2e,.95,{side:THREE.DoubleSide}),ribbonGoldMat=mat('fabric',0xd8b25a,.95,{side:THREE.DoubleSide});
 const glowMat=Object.assign(new THREE.MeshStandardMaterial({color:0x1f9fc4,emissive:0x0f8fc0,emissiveIntensity:.75,roughness:.5}),{name:'glow'}),stalkMat=mat('mushroom',0xe6e0cc,.8),candleMat=Object.assign(new THREE.MeshStandardMaterial({color:0xfff0c0,emissive:0xffb050,emissiveIntensity:1.5}),{name:'glow'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 // Trunk: a tube along a gently twisting spine, flaring at the base.
 const spine=new THREE.CatmullRomCurve3([v(0,0,0),v(.2,1.5,.1),v(-.1,3,.25),v(.15,4.6,-.1),v(0,5.8,0)]);
 const trunk=add(new THREE.TubeGeometry(spine,24,1.05,14),barkMat,0,0,0);
 add(new THREE.CylinderGeometry(1.2,1.9,1.2,14),barkMat,0,.6,0);
 // Buttress roots radiating out and diving into the ground.
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.3,len=2.6+(i%3)*.5,curve=new THREE.CatmullRomCurve3([v(Math.cos(a)*.8,1.2,Math.sin(a)*.8),v(Math.cos(a)*1.8,.7,Math.sin(a)*1.8),v(Math.cos(a)*len,.05,Math.sin(a)*len)]);add(new THREE.TubeGeometry(curve,10,.34-(i%2)*.06,8),i%2?darkBarkMat:barkMat,0,0,0);}
 // Limbs: thick tubes reaching up and out; each ends in leaf clusters.
 const clumpGeom=new THREE.IcosahedronGeometry(1,1),ends=[];
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.4,reach=3.6+(i%3)*.7,h=6.2+(i%2)*1.2,curve=new THREE.CatmullRomCurve3([v(0,4.8,0),v(Math.cos(a)*reach*.45,h-.6,Math.sin(a)*reach*.45),v(Math.cos(a)*reach,h,Math.sin(a)*reach)]);add(new THREE.TubeGeometry(curve,10,.42-(i%3)*.06,8),barkMat,0,0,0);ends.push([Math.cos(a)*reach,h,Math.sin(a)*reach]);}
 ends.push([0,8.2,0],[1.2,7.6,-1.5],[-1.4,7.8,1.2]);
 ends.forEach(([x,y,z],i)=>{for(let k=0;k<4;k++){const a=k*1.7+i,r=1.1+(k%2)*.4,clump=add(clumpGeom,(i+k)%2?leafMat:leafDeepMat,x+Math.cos(a)*r*.6,y+(k%3-1)*.45,z+Math.sin(a)*r*.6);clump.scale.set(1.9+(k%2)*.4,1.25,1.9-(k%3)*.2);clump.rotation.set(k,i,0);}});
 // Moss on the root crown and charm ribbons hanging from two low limbs.
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(new THREE.SphereGeometry(1,10,6),mossMat,Math.cos(a)*1.2,1.1+(i%2)*.4,Math.sin(a)*1.2).scale.set(.7,.12,.5);}
 for(const [x,y,z] of [[2.1,5.1,1.2],[-1.8,5.3,-1.6],[.4,5.6,2.3]])for(let k=0;k<3;k++){const r=add(new THREE.PlaneGeometry(.12,1.1).translate(0,-.55,0),k%2?ribbonGoldMat:ribbonMat,x+k*.18,y,z+k*.05);r.rotation.set(0,k*.8,(k-1)*.12);}
 // Offering shrine: a small stone house with candles at the root line.
 const shrine=new THREE.Group();shrine.position.set(0,0,2.4);root.add(shrine);
 add(new THREE.BoxGeometry(.9,.18,.7),stoneMat,0,.09,0,shrine);add(new THREE.BoxGeometry(.7,.75,.5),stoneMat,0,.55,-.05,shrine);
 const roof=new THREE.Shape();roof.moveTo(-.55,0);roof.lineTo(.55,0);roof.lineTo(0,.4);roof.closePath();add(new THREE.ExtrudeGeometry(roof,{depth:.65,bevelEnabled:false}),stoneMat,0,.92,-.37,shrine);
 add(new THREE.BoxGeometry(.4,.4,.05),darkBarkMat,0,.55,.2,shrine);
 for(const x of [-.25,.25]){add(new THREE.CylinderGeometry(.035,.035,.14,8),stalkMat,x,.25,.3,shrine);add(new THREE.SphereGeometry(.03,6,4),candleMat,x,.35,.3,shrine);}
 // Glowing mushroom ring: its own named group so the world can pulse it.
 const ring=new THREE.Group();ring.name='mushroom-ring';root.add(ring);
 const stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.04,.06,.3,6),stalkMat,22),caps=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,10,6,0,Math.PI*2,0,Math.PI/2),glowMat,22),pose=new THREE.Object3D();
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=4.3+((i*7)%5)*.15,s=.7+((i*3)%4)*.18;pose.rotation.set(0,0,0);pose.scale.setScalar(s);pose.position.set(Math.cos(a)*r,.15*s,Math.sin(a)*r);pose.updateMatrix();stalks.setMatrixAt(i,pose.matrix);pose.position.set(Math.cos(a)*r,.29*s,Math.sin(a)*r);pose.scale.set(s,s*.7,s);pose.updateMatrix();caps.setMatrixAt(i,pose.matrix);}
 ring.add(stalks,caps);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
