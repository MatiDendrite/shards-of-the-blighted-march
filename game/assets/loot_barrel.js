// 404 reference: breakable. A lone hooped barrel with a small crate lashed to
// its side and a sack slumped against them; smashed open for coins in play.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const staveMat=mat('timber',0x7d5634),crateMat=mat('timber',0xa47a4c),slatMat=mat('timber',0x6b4a2c),hoopMat=mat('metal',0x444444,.5,{metalness:.5}),sackMat=mat('fabric',0xcdb98f,.95),ropeMat=mat('fabric',0xa88d5f,.95);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const profile=new THREE.SplineCurve([new THREE.Vector2(.26,0),new THREE.Vector2(.31,.22),new THREE.Vector2(.33,.44),new THREE.Vector2(.31,.66),new THREE.Vector2(.26,.88)]).getSpacedPoints(10);profile.unshift(new THREE.Vector2(0,0));profile.push(new THREE.Vector2(0,.88));
 add(new THREE.LatheGeometry(profile,16),staveMat,0,0,0);for(const [y,r] of [[.1,.29],[.32,.33],[.56,.33],[.78,.29]])add(new THREE.TorusGeometry(r,.014,4,20).rotateX(Math.PI/2),hoopMat,0,y,0);
 add(new THREE.CircleGeometry(.26,16).rotateX(-Math.PI/2),slatMat,0,.881,0);
 const crate=new THREE.Group();crate.position.set(.52,0,.1);crate.rotation.y=.3;root.add(crate);
 add(new THREE.BoxGeometry(.42,.38,.42),crateMat,0,.19,0,crate);for(const y of [.03,.35])for(const s of [-1,1]){add(new THREE.BoxGeometry(.44,.05,.05),slatMat,0,y,s*.21,crate);add(new THREE.BoxGeometry(.05,.05,.44),slatMat,s*.21,y,0,crate);}
 const sackProfile=[0,.14,.2,.21,.18,.1,.04,.06].map((r,i)=>new THREE.Vector2(r,i*.065));
 const sack=add(new THREE.LatheGeometry(sackProfile,10),sackMat,-.3,0,.38);sack.rotation.set(.35,0,.25);add(new THREE.TorusGeometry(.045,.015,4,8).rotateX(Math.PI/2),ropeMat,0,.4,0,sack);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
