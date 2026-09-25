// 404 reference: combat-board. Stacked faceted cairn stones bound by shard light.
export default function generate(T){
 const root=new T.Group();
 const material=(name,color,roughness=1)=>Object.assign(new T.MeshStandardMaterial({color,roughness,flatShading:true}),{name});
 const stone=material('stone',0xa39276,.95),dark=material('stone',0x756654,.95),moss=material('moss',0x5d7a3a),glow=material('crystal',0xc9a6ff,.4);glow.emissive.setHex(0x7a44d6);glow.emissiveIntensity=1.4;glow.flatShading=false;
 let seed=11;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 // Jittered dodecahedra read as weathered, hand-stacked boulders.
 function rock(p,m,x,y,z,sx,sy,sz,detail=0){const g=new T.DodecahedronGeometry(1,detail),a=g.attributes.position,key=new Map();for(let i=0;i<a.count;i++){const k=[a.getX(i),a.getY(i),a.getZ(i)].map(n=>n.toFixed(3)).join();if(!key.has(k))key.set(k,.86+rand()*.26);const s=key.get(k);a.setXYZ(i,a.getX(i)*s,a.getY(i)*s,a.getZ(i)*s);}g.computeVertexNormals();const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.rotation.set(rand()*.6,rand()*6,rand()*.6);p.add(n);return n;}
 const group=(p,name,x,y,z)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);p.add(g);return g;};
 const torso=group(root,'torso',0,1.15,0);
 rock(torso,stone,0,.35,0,.62,.55,.48,1);rock(torso,dark,0,-.1,.02,.5,.34,.4);rock(torso,stone,.05,.75,-.05,.46,.3,.38);
 for(const [x,y,z,s] of [[.25,.55,.36,.12],[-.2,.25,.38,.1],[0,.05,.34,.08]]){const c=new T.Mesh(new T.OctahedronGeometry(s,0),glow);c.position.set(x,y,z);c.scale.set(1,1.6,.6);torso.add(c);}
 rock(torso,moss,-.28,.9,-.08,.28,.1,.26);rock(torso,moss,.3,.82,.1,.22,.08,.2);
 const head=group(torso,'head',0,1.05,.06);rock(head,dark,0,.1,0,.26,.22,.24);
 for(const s of [-1,1]){const e=new T.Mesh(new T.SphereGeometry(.045,8,6),glow);e.position.set(s*.09,.12,.2);head.add(e);}
 for(const [name,side] of [['leftArm',1],['rightArm',-1]]){
  const arm=group(torso,name,side*.72,.72,0);rock(arm,stone,0,0,0,.3,.28,.3);
  rock(arm,dark,side*.08,-.45,.02,.22,.32,.22);
  const fist=rock(arm,stone,side*.1,-.95,.08,.3,.28,.3,1);
  const shard=new T.Mesh(new T.OctahedronGeometry(.09,0),glow);shard.position.set(side*.1,-.62,.2);shard.scale.set(.7,1.4,.7);arm.add(shard);
  rock(arm,moss,0,.22,-.05,.24,.08,.22);
 }
 for(const [name,side] of [['leftLeg',1],['rightLeg',-1]]){
  const leg=group(root,name,side*.3,.95,0);rock(leg,dark,0,-.3,0,.26,.34,.28);rock(leg,stone,0,-.78,.06,.3,.2,.34);
 }
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{const p=n.isMesh&&n.geometry.attributes.position;if(p)for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld));});const c=bounds.getCenter(new T.Vector3());root.children.forEach(n=>{n.position.x-=c.x;n.position.y-=bounds.min.y;n.position.z-=c.z;});root.userData.joints={};root.traverse(n=>{if(n.isGroup&&n.name)root.userData.joints[n.name]=n;});return root;
}
