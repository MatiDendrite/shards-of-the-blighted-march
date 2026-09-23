// Original 404 character study: mage, profiles construction.
export default function generate(T){

 const root=new T.Group(),frame=new T.Group();root.add(frame);
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.52:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x444b70),lining=material('fabric',0x202634),trim=material('fabric',0xb0abc2),iron=material('metal',0x69777c,.6),brass=material('metal',0xb29a67,.55),leather=material('timber',0x382e28),skin=material('fabric',0xb9957e),hair=material('fabric',0x75422b);
 const put=(p,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;};
 const ball=(p,m,x,y,z,w,h,d)=>{const o=put(p,new T.SphereGeometry(1,12,8),m,x,y,z);o.scale.set(w,h,d);return o;};
 const box=(p,m,x,y,z,w,h,d)=>put(p,new T.BoxGeometry(w,h,d),m,x,y,z);
 function plate(p,m,points,depth,x=0,y=0,z=0){const s=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});g.translate(0,0,-depth/2);return put(p,g,m,x,y,z);}
 function shell(p,m,points,depth,x=0,y=0,z=0,start=0,arc=Math.PI*2){const g=new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),16,start,arc);g.scale(1,1,depth);return put(p,g,m,x,y,z);}
 function joint(name,x,y,z,parent=frame){const o=new T.Group();o.name=name;o.position.set(x,y,z);parent.add(o);return o;}
 const torso=joint('torso',0,1.13,0),head=joint('head',0,1.66,0);
 const limbs={};
 for(const s of [-1,1]){
  const side=s<0?'left':'right',leg=joint(side+'Leg',s*.135,.91,0),shin=joint(side+'Shin',0,-.39,0,leg),foot=joint(side+'Foot',0,-.435,.065,shin),arm=joint(side+'Arm',s*.32,1.43,0),fore=joint(side+'Forearm',0,-.27,0,arm);
  limbs[side]={leg,shin,foot,arm,fore};ball(foot,leather,0,0,0,.109,.080,.166);box(foot,lining,0,-.067,-.008,.205,.035,.31);
 }

 // Revolved cloth and curved armour shells around articulated volumes.
 shell(torso,cloth,[[.22,-.10],[.25,.05],[.255,.27],[.19,.40]],.65);
 ball(torso,lining,0,.19,0,.245,.27,.14);
 shell(head,cloth,[[.182,-.17],[.18,.04],[.135,.16],[0,.23]],.86,0,0,-.015,.50,Math.PI*2-1);
 for(const side of ['left','right']){const {leg,shin,arm,fore}=limbs[side];
  ball(leg,lining,0,-.19,0,.108,.23,.108);
  shell(shin,leather,[[.095,-.40],[.09,-.14],[.105,0]],1);
  ball(arm,cloth,0,-.17,0,.113,.23,.112);shell(fore,leather,[[.075,-.24],[.09,0]],.92);
  shell(arm,cloth,[[.135,-.12],[.145,.015],[.09,.09]],.96);
 }

 // Face, belt hardware and articulated hands are shared anatomy, not imported meshes.
 ball(head,lining,0,-.01,.015,.135,.163,.118);
 box(head,skin,0,-.013,.127,.176,.046,.018);
 for(const s of [-1,1])box(head,lining,s*.044,-.008,.14,.033,.012,.009);
 box(torso,leather,0,-.045,.008,.465,.076,.345);box(torso,brass,0,-.04,.188,.077,.056,.023);
 for(const side of ['left','right']){const {fore,shin}=limbs[side];ball(fore,leather,0,-.285,.04,.070,.085,.063);
  for(let i=0;i<4;i++)shell(fore,trim,[[.087,-.013],[.087,.007]],.9,0,-.035-i*.051,.002);
  for(let i=0;i<3;i++)shell(shin,trim,[[.103,-.012],[.103,.012]],1,0,-.12-i*.105,0);
 }

 // Split robe panels follow the legs; the cape stays above the soles during a dodge.
 for(const s of [-1,1]){
  const leg=limbs[s<0?'left':'right'].leg;
  for(const back of [-1,1])for(let n=0;n<5;n++){
   const x=(n-2)*.057,z=back*(.14+.012*Math.cos(n*2));
   const flap=plate(leg,cloth,[[-.026,.07],[.026,.07],[.033,-.55],[-.032,-.53]],.016,x,0,z);flap.rotation.z=s*.035;
   if(n===0||n===4)box(leg,trim,x,-.24,z+back*.013,.009,.57,.006);
  }
 }
 for(let n=0;n<3;n++)shell(torso,cloth,[[.23,.23],[.31,.29],[.25,.37]],.68,0,-n*.055,0);
 const capeGeo=new T.PlaneGeometry(.69,1.09,12,14),pos=capeGeo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),t=(.545-y)/1.09;pos.setXYZ(i,x*(.7+t*.34),y,-.04*Math.cos(x*31)-t*.08);}
 capeGeo.computeVertexNormals();put(torso,capeGeo,cloth,0,-.12,-.215);
 function stitch(ax,ay,bx,by){const length=Math.hypot(bx-ax,by-ay),steps=Math.ceil(length/.025);for(let n=0;n<steps;n++){const t=(n+.5)/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,fall=(.425-y)/1.09,z=-.215-.04*Math.cos(x*31)-fall*.08-.008;const thread=box(torso,trim,x,y,z,.009,length/steps+.002,.006);thread.rotation.z=-Math.atan2(bx-ax,by-ay);}}
 for(const s of [-1,1])stitch(s*.224,.41,s*.34,-.65);
 stitch(0,.13,.13,-.12);stitch(.13,-.12,0,-.37);stitch(0,-.37,-.13,-.12);stitch(-.13,-.12,0,.13);
 const clasp=put(torso,new T.CylinderGeometry(.042,.042,.019,12),brass,0,.285,.22);clasp.rotation.x=Math.PI/2;
 for(const side of ['left','right']){const arm=limbs[side].arm;shell(arm,iron,[[.14,-.07],[.15,0],[.10,.07]],1,0,.005,0);ball(arm,iron,0,.028,0,.105,.059,.10);}

 // Measure actual transformed vertices, not rotated bounding-box corners.
 frame.scale.set(0.97,1,1);
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const scale=1.85/bounds.getSize(new T.Vector3()).y;frame.scale.multiplyScalar(scale);
 frame.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
 root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});
 return root;
}
