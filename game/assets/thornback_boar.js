// 404 reference: combat-board. Heavy swept torso, raised bristle ridge, curved tusks.
export default function generate(T){
 const root=new T.Group();
 const material=(name,color,roughness=1)=>Object.assign(new T.MeshStandardMaterial({color,roughness}),{name});
 const hide=material('fur',0x5a4535),belly=material('fur',0x7a6250),bristle=material('fur',0x2e2520),snout=material('leather',0x8a5f55,.8),hoof=material('leather',0x241d19,.7),tusk=material('bone',0xe8dcc0,.5),thorn=material('bark',0x4f5a36),eye=material('eyes',0xe0913d,.4);eye.emissive.setHex(0x7a3510);
 const mesh=(p,geo,m,x=0,y=0,z=0)=>{const n=new T.Mesh(geo,m);n.position.set(x,y,z);p.add(n);return n;};
 const ell=(p,m,x,y,z,sx,sy,sz)=>{const n=mesh(p,new T.SphereGeometry(1,12,8),m,x,y,z);n.scale.set(sx,sy,sz);return n;};
 function sweep(p,sections,m){const pos=[],uv=[],idx=[],N=14;sections.forEach(([z,y,rx,ry],j)=>{for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;pos.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z);uv.push(i/N,j/(sections.length-1));if(j&&i){const k=j*(N+1)+i;idx.push(k,k-1,k-N-2,k,k-N-2,k-N-1);}}});const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return mesh(p,geo,m);}
 // Barrel body: high shoulders sloping to narrow haunches.
 sweep(root,[[-.72,.68,.03,.05],[-.62,.70,.24,.26],[-.35,.74,.33,.34],[-.05,.80,.36,.40],[.25,.86,.37,.44],[.45,.86,.30,.38],[.56,.82,.16,.22]],hide);
 ell(root,belly,0,.52,-.05,.3,.14,.5);
 // Bristle ridge and thorny growths along the spine.
 for(let i=0;i<11;i++){const z=-.55+i*.105,h=.18+Math.sin(i/10*Math.PI)*.16;const b=mesh(root,new T.ConeGeometry(.05,h,4),bristle,0,.98+Math.sin(i/10*Math.PI)*.28-(i<3?.12:0),z);b.rotation.x=-.5;}
 for(let row=0;row<3;row++)for(const side of [-1,1])for(let i=0;i<5;i++){const b=mesh(root,new T.ConeGeometry(.045,.22-row*.04,4),bristle,side*(.12+row*.09),1.08-row*.1-i*.012,.34-i*.1);b.rotation.set(-.7,0,side*(.35+row*.3));}
 for(let i=0;i<4;i++)for(const side of [-1,1]){const st=mesh(root,new T.SphereGeometry(1,8,6),bristle,side*.3,.84,-.3+i*.18);st.scale.set(.04,.2,.035);st.rotation.x=.25;}
 for(const [x,y,z,r] of [[.14,1.08,.12,.5],[-.16,1.12,-.05,-.6],[.12,1.02,-.32,.7]]){const t=mesh(root,new T.ConeGeometry(.035,.2,5),thorn,x,y,z);t.rotation.z=r;}
 const head=new T.Group();head.name='head';head.position.set(0,.84,.58);root.add(head);
 sweep(head,[[-.06,.02,.2,.22],[.12,-.02,.19,.2],[.3,-.08,.14,.14],[.44,-.12,.1,.1],[.47,-.12,.02,.02]],hide);
 const disc=mesh(head,new T.CylinderGeometry(.1,.1,.05,14).rotateX(Math.PI/2),snout,0,-.12,.47);
 for(const s of [-1,1]){ell(head,hoof,s*.035,-.12,.5,.018,.024,.01);
  // Tusks curve out and up from the lower jaw.
  const tk=new T.Group();tk.position.set(s*.1,-.17,.33);head.add(tk);const base=mesh(tk,new T.ConeGeometry(.034,.2,7),tusk,0,.06,.04);base.rotation.set(-.55,0,s*-.55);const hook=mesh(tk,new T.ConeGeometry(.02,.15,6),tusk,s*.07,.19,.02);hook.rotation.set(.25,0,s*-.95);
  ell(head,eye,s*.13,.06,.16,.025,.025,.02);
  const ear=mesh(head,new T.ConeGeometry(.06,.14,4),hide,s*.14,.2,.0);ear.rotation.set(-.4,0,s*.6);}
 ell(head,belly,0,-.19,.22,.13,.06,.18);
 // Legs hang from named hips so the quadruped gait can swing them.
 for(const [name,x,z,front] of [['leftFront',.2,.34,true],['rightFront',-.2,.34,true],['leftRear',.19,-.46,false],['rightRear',-.19,-.46,false]]){
  const hip=new T.Group();hip.name=name;hip.position.set(x,.66,z);root.add(hip);
  ell(hip,hide,0,-.08,0,.12,front?.2:.23,front?.14:.17);
  const shin=mesh(hip,new T.CylinderGeometry(.075,.055,.4,8),hide,0,-.4,front?.02:-.02);shin.rotation.x=front?-.05:.12;
  mesh(hip,new T.CylinderGeometry(.07,.085,.09,8),hoof,0,-.62,front?.03:-.04);for(const t of [-1,1])mesh(hip,new T.ConeGeometry(.03,.06,4),hoof,t*.035,-.66,front?.1:.03).rotation.x=Math.PI/2;
 }
 const tail=new T.Group();tail.name='tail';tail.position.set(0,.8,-.72);root.add(tail);
 const t=mesh(tail,new T.CylinderGeometry(.015,.02,.24,5),bristle,0,-.1,-.02);t.rotation.x=.4;mesh(tail,new T.ConeGeometry(.04,.1,5),bristle,0,-.24,-.07).rotation.x=Math.PI;
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{const p=n.isMesh&&n.geometry.attributes.position;if(p)for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld));});const c=bounds.getCenter(new T.Vector3());root.children.forEach(n=>{n.position.x-=c.x;n.position.y-=bounds.min.y;n.position.z-=c.z;});root.userData.joints={};root.traverse(n=>{if(n.isGroup&&n.name)root.userData.joints[n.name]=n;});return root;
}
