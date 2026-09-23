// Original 404 character study: dwarf, blocks construction.
export default function generate(T){

 const root=new T.Group(),frame=new T.Group();root.add(frame);
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.52:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x92703e),lining=material('fabric',0x323634),trim=material('fabric',0x917c58),iron=material('metal',0x69777c,.6),brass=material('metal',0xb29a67,.55),leather=material('timber',0x382e28),skin=material('fabric',0xb9957e),hair=material('fabric',0x75422b);
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

 // Open-faced helmet, copper beard braids and broad forged plates.
 head.clear();
 ball(head,skin,0,-.03,.015,.174,.20,.14);
 const dome=put(head,new T.SphereGeometry(.19,12,6,0,Math.PI*2,0,Math.PI/2),iron,0,.04,0);dome.scale.z=.84;
 box(head,iron,0,-.025,-.125,.31,.19,.035);
 for(const s of [-1,1]){
  plate(head,iron,[[-.075,.05],[.045,.02],[.03,-.19],[-.075,-.15]],.06,s*.144,0,.072);
  box(head,brass,s*.07,.06,.148,.146,.028,.027);
  box(head,lining,s*.064,-.005,.151,.037,.012,.01);
  ball(head,hair,s*.065,.025,.146,.059,.019,.02);
  ball(head,hair,s*.076,-.095,.141,.095,.055,.06);
 }
 ball(head,skin,0,-.066,.164,.045,.059,.040);
 for(let strand=0;strand<3;strand++){
  const x=(strand-1)*.09,length=strand===1?.39:.31;
  const braid=put(head,new T.ConeGeometry(.057,length,7),hair,x,-.10-length*.5,.23);braid.rotation.z=Math.PI;
  put(head,new T.CylinderGeometry(.037,.037,.045,8),brass,x,-.10-length*.75,.23);
 }
 for(const side of [-1,1]){
  for(let n=0;n<3;n++)box(torso,iron,0,.005+n*.115,side*.17,.48-n*.035,.128,.08);
  for(let i=0;i<3;i++)box(torso,brass,0,.02+i*.12,side*.21,.49,.015,.011);
 }
 for(const s of [-1,1]){
  const arm=limbs[s<0?'left':'right'].arm;
  ball(arm,iron,0,.015,0,.19,.14,.17);
  for(let i=0;i<3;i++){box(arm,iron,0,-.06-i*.07,0,.31-i*.035,.067,.27);for(const z of [-.145,.145])box(arm,brass,0,-i*.07-.06,z,.30-i*.035,.015,.012);}
  const shin=limbs[s<0?'left':'right'].shin;plate(shin,iron,[[-.105,.035],[.105,.035],[.10,-.36],[-.09,-.36]],.034,0,0,.104);
  box(shin,brass,0,-.15,.133,.015,.31,.012);
  box(torso,leather,s*.27,-.13,0,.10,.18,.13);
 }
 plate(torso,cloth,[[-.22,-.08],[.22,-.08],[.19,-.51],[-.18,-.51]],.045,0,0,.18);
 for(const s of [-1,1])box(torso,brass,s*.19,-.28,.207,.014,.36,.014);
 const buckle=box(torso,brass,0,-.032,.225,.11,.075,.03);buckle.rotation.z=0;

 // Measure actual transformed vertices, not rotated bounding-box corners.
 frame.scale.set(1.23,0.78,1);
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const scale=1.4/bounds.getSize(new T.Vector3()).y;frame.scale.multiplyScalar(scale);
 frame.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
 root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});
 return root;
}
