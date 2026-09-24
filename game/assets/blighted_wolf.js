// 404 reference: combat-board. Swept anatomy, bent hocks and layered fur wedges.
export default function generate(T){
 const root=new T.Group();
 const material=(name,color,roughness=1)=>Object.assign(new T.MeshStandardMaterial({color,roughness}),{name});
 const fur=material('fur',0x555953),ruff=material('fur',0x343b37),muzzle=material('fur',0x898b7a),dark=material('leather',0x202622),bone=material('bone',0xd6c9ac),eye=material('eyes',0xc5a35c,.45);eye.emissive.setHex(0x6f4912);
 const mesh=(p,geo,m,x=0,y=0,z=0)=>{const n=new T.Mesh(geo,m);n.position.set(x,y,z);p.add(n);return n;};
 const ell=(p,m,x,y,z,sx,sy,sz)=>{const n=mesh(p,new T.SphereGeometry(1,12,8),m,x,y,z);n.scale.set(sx,sy,sz);return n;};
 function sweep(p,sections,m){const pos=[],uv=[],idx=[],N=12;sections.forEach(([z,y,rx,ry],j)=>{for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;pos.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z);uv.push(i/N,j/(sections.length-1));if(j&&i){const k=j*(N+1)+i;idx.push(k,k-1,k-N-2,k,k-N-2,k-N-1);}}});const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return mesh(p,geo,m);}
 function tuft(p,m,x,y,z,w,h,d,tilt=0){const shape=new T.Shape();shape.moveTo(-w*.35,0);shape.lineTo(0,-h);shape.lineTo(w*.35,0);shape.lineTo(0,h*.16);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:d*.3,bevelEnabled:false});geo.translate(0,0,-d*.15);const n=mesh(p,geo,m,x,y,z);n.rotation.x=tilt;return n;}
 sweep(root,[[-.61,.73,.025,.06],[-.49,.76,.20,.22],[-.25,.79,.245,.25],[0,.78,.20,.20],[.25,.85,.27,.32],[.43,.90,.21,.27],[.53,.96,.10,.14]],fur);
 const head=new T.Group();head.name='head';head.position.set(0,1.02,.47);root.add(head);
 ell(head,fur,0,.005,.09,.18,.20,.235);
 sweep(head,[[.17,-.045,.135,.12],[.32,-.082,.10,.077],[.49,-.095,.07,.054],[.51,-.095,.012,.024]],muzzle);
 ell(head,dark,0,-.07,.48,.078,.054,.045);
 const jaw=new T.Group();jaw.name='jaw';jaw.position.set(0,-.12,.18);head.add(jaw);
 ell(jaw,dark,0,-.024,.12,.083,.017,.145);ell(jaw,muzzle,0,-.045,.105,.078,.026,.128);
 for(const s of [-1,1])mesh(jaw,new T.ConeGeometry(.013,.041,5),bone,s*.063,-.005,.19);
 for(const s of [-1,1]){
  const ear=tuft(head,fur,s*.123,.16,.008,.18,.28,.065);ear.rotation.z=Math.PI+s*.17;
  const inner=tuft(head,dark,s*.123,.18,.047,.093,.16,.012);inner.rotation.z=Math.PI+s*.17;
  ell(head,dark,s*.147,.015,.215,.037,.034,.025);ell(head,eye,s*.162,.02,.23,.013,.015,.013);
  const brow=tuft(head,ruff,s*.15,.061,.20,.10,.055,.09,-.3);brow.rotation.z=-s*.25;
  for(let k=0;k<3;k++){const t=tuft(head,fur,s*(.145+k*.021),-.015-k*.024,.05-k*.075,.12,.17,.11,-.2);t.rotation.z=s*.35;}
  for(const z of [.26,.36])mesh(head,new T.ConeGeometry(.012,.047,5),bone,s*.078,-.153,z).rotation.z=Math.PI;
 }
 for(const s of [-1,1])for(const front of [true,false]){
  const leg=new T.Group();leg.name=`${s<0?'left':'right'}${front?'Front':'Rear'}`;leg.position.set(s*.205,.76,front?.29:-.45);root.add(leg);
  ell(leg,fur,0,-.18,front?0:.075,front?.075:.115,.23,.105);
  const shin=new T.Group();shin.name=`${leg.name}Hock`;shin.position.set(0,-.36,front?.015:.15);leg.add(shin);
  const lower=ell(shin,fur,0,-.16,front?0:-.074,.045,.18,.053);lower.rotation.x=front?-.05:.4;
  ell(shin,ruff,0,-.322,front?.025:-.126,.060,.07,.065);ell(shin,fur,0,-.365,front?.069:-.075,.085,.055,.128);
  for(let toe=0;toe<3;toe++){ell(shin,muzzle,(toe-1)*.047,-.375,front?.143:.007,.026,.034,.057);mesh(shin,new T.ConeGeometry(.012,.038,5),dark,(toe-1)*.047,-.384,front?.193:.057).rotation.x=Math.PI/2;}
 }
 const tail=new T.Group();tail.name='tail';tail.position.set(0,.78,-.55);tail.rotation.x=-.17;root.add(tail);
 sweep(tail,[[-.53,-.34,.01,.01],[-.38,-.24,.065,.095],[-.19,-.07,.10,.13],[0,0,.095,.10]],ruff);
 for(let i=0;i<5;i++)tuft(tail,fur,0,-.09-i*.06,-.12-i*.07,.14-i*.017,.17,.10,.4);
 for(let row=0;row<4;row++)for(const s of [-1,1]){const t=tuft(root,row%2?fur:ruff,s*(.21-row*.017),.99-row*.037,.28-row*.19,.19,.23,.16,-.8);t.rotation.z=s*.45;}
 for(let i=0;i<6;i++)tuft(root,ruff,0,1.14-i*.037,.36-i*.13,.19,.18,.17,-2.1);
 // Fine silhouette breaks on the chest and haunches, not alpha fur shells.
 for(const s of [-1,1])for(let i=0;i<5;i++){
  const chest=tuft(root,i%2?fur:ruff,s*(.16+i*.021),.93-i*.036,.39-i*.055,.10,.13,.075,-.45);chest.rotation.z=s*.55;
  const cheek=tuft(head,muzzle,s*(.12+i*.017),-.075-i*.015,.10-i*.025,.07,.09,.05,-.3);cheek.rotation.z=s*.48;
 }
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{const p=n.isMesh&&n.geometry.attributes.position;if(p)for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld));});const c=bounds.getCenter(new T.Vector3());root.children.forEach(n=>{n.position.x-=c.x;n.position.y-=bounds.min.y;n.position.z-=c.z;});root.userData.joints={};root.traverse(n=>{if(n.isGroup&&n.name)root.userData.joints[n.name]=n;});return root;
}
