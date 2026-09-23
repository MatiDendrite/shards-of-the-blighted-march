// Original 404 character study: mage, blocks construction.
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

 // Independent primitive reading: stacked tunic masses, cone hood and banded limbs.
 ball(torso,cloth,0,.16,0,.27,.32,.17);box(torso,lining,0,.07,0,.42,.30,.31);
 const hood=put(head,new T.ConeGeometry(.24,.40,8),cloth,0,.10,-.015);hood.scale.z=.8;
 ball(head,cloth,0,-.05,-.045,.185,.18,.13);
 for(const side of ['left','right']){const {leg,shin,arm,fore}=limbs[side];
  put(leg,new T.CylinderGeometry(.105,.11,.36,8),lining,0,-.18,0);
  box(shin,leather,0,-.20,0,.18,.38,.18);
  ball(arm,cloth,0,-.16,0,.12,.22,.12);
  put(fore,new T.CylinderGeometry(.083,.063,.25,8),leather,0,-.13,0);
  box(arm,cloth,0,-.04,0,.26,.14,.28);
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
  for(const back of [-1,1]){const flap=plate(leg,cloth,[[-.135,.07],[.14,.07],[.17,-.55],[-.16,-.53]],.025,0,0,back*.135);flap.rotation.z=s*.035;
   box(leg,trim,s*.125,-.24,back*.154,.012,.56,.012);}
 }
 for(let n=0;n<3;n++)shell(torso,cloth,[[.23,.23],[.31,.29],[.25,.37]],.68,0,-n*.055,0);
 const capeGeo=new T.PlaneGeometry(.69,1.09,12,14),pos=capeGeo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),t=(.545-y)/1.09;pos.setXYZ(i,x*(.7+t*.34),y,-.04*Math.cos(x*31)-t*.08);}
 capeGeo.computeVertexNormals();put(torso,capeGeo,cloth,0,-.12,-.215);
 for(const s of [-1,1]){const edge=box(torso,trim,s*.30,-.16,-.302,.014,.93,.012);edge.rotation.z=-s*.06;}
 for(const sign of [-1,1])for(const s of [-1,1]){const rune=box(torso,trim,s*.058,-.08+sign*.105,-.34,.009,.24,.009);rune.rotation.z=s*sign*.5;}
 const clasp=put(torso,new T.CylinderGeometry(.042,.042,.019,12),brass,0,.285,.22);clasp.rotation.x=Math.PI/2;
 for(const side of ['left','right']){const arm=limbs[side].arm;shell(arm,iron,[[.14,-.07],[.15,0],[.10,.07]],1,0,.005,0);}

 // Measure actual transformed vertices, not rotated bounding-box corners.
 frame.scale.set(0.97,1,1);
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const scale=1.85/bounds.getSize(new T.Vector3()).y;frame.scale.multiplyScalar(scale);
 frame.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
 root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});
 return root;
}
