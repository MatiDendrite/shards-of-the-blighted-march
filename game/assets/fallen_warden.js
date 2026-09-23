// 404: separate ceremonial armour; reference vocabulary from wanderer.png.
export default function generate(T){
 const root=new T.Group(),joints={};
 const mat=(name,color,roughness=.6,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness,metalness}),{name});
 const iron=mat('metal',0x4d5661,.44,.72),edge=mat('metal',0xaca48a,.42,.65),black=mat('fabric',0x22282a),cloth=mat('fabric',0x50334f,.95),leather=mat('timber',0x372d28),rune=mat('rune',0xb294cd,.4,.25);rune.emissive.setHex(0x503563);rune.emissiveIntensity=.65;
 const put=(p,geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);p.add(o);return o;};
 function joint(name,x,y,z,parent=root){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);joints[name]=g;return g;}
 function plate(p,m,points,depth,x,y,z){const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.007,bevelSegments:1,steps:1});geo.translate(0,0,-depth/2);return put(p,geo,m,x,y,z);}
 const ell=(p,m,x,y,z,a,b,c)=>{const o=put(p,new T.SphereGeometry(1,12,8),m,x,y,z);o.scale.set(a,b,c);return o;};
 const torso=joint('torso',0,1.55,0);ell(torso,black,0,.18,0,.34,.40,.21);
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const z=side*(.19+Math.sin(i*.65)*.035),w=.28-i*.012;
  const p=plate(torso,iron,[[-w,.09],[0,.13],[w,.09],[w*.9,-.08],[0,-.135],[-w*.9,-.08]],.046,0,.43-i*.11,z);if(side<0)p.rotation.y=Math.PI;
  for(const s of [-1,1])ell(torso,edge,s*w*.8,.455-i*.11,z+side*.035,.014,.014,.012);
 }
 for(const s of [-1,1]){
  const sash=put(torso,new T.BoxGeometry(.056,.66,.026),leather,s*.17,.18,.257);sash.rotation.z=s*.14;
  const skirt=plate(torso,cloth,[[-.15,.12],[.15,.12],[.19,-.45],[.06,-.52],[-.17,-.44]],.036,s*.16,-.09,.14);skirt.rotation.z=-s*.1;
  for(let row=0;row<3;row++)plate(torso,iron,[[-.105,.08],[.11,.08],[.12,-.035],[0,-.09],[-.12,-.035]],.036,s*.18,-.17-row*.108,.19+row*.008);
 }
 const belt=put(torso,new T.CylinderGeometry(.315,.32,.09,14),leather,0,-.03,0);belt.scale.z=.72;
 plate(torso,edge,[[-.068,0],[0,.072],[.068,0],[0,-.072]],.036,0,-.03,.26);
 for(let strip=0;strip<9;strip++){
  const x=(strip-4)*.094,len=1.12+(strip%3)*.055,geo=new T.PlaneGeometry(.106,len,2,12),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const t=(len/2-p.getY(i))/len;p.setXYZ(i,p.getX(i)*(1+t*.35),p.getY(i),-.055*Math.cos((x+p.getX(i))*29)-t*.16);}
  geo.computeVertexNormals();cloth.side=T.DoubleSide;put(torso,geo,cloth,x,.33-len/2,-.265);
  put(torso,new T.BoxGeometry(.081,.017,.012),edge,x,.33-len,-.42);
 }
 const thread=mat('fabric',0x9b869c,1);
 function embroidery(points){for(let n=1;n<points.length;n++){
  const [ax,ay]=points[n-1],[bx,by]=points[n],steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/.025));
  for(let k=0;k<steps;k++){const t=(k+.5)/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,strip=Math.max(0,Math.min(8,Math.round(x/.094)+4)),len=1.12+(strip%3)*.055,fall=(.33-y)/len,z=-.265-.055*Math.cos(x*29)-fall*.16-.014;
   const stitch=put(torso,new T.BoxGeometry(.013,Math.hypot(bx-ax,by-ay)/steps+.004,.008),thread,x,y,z);stitch.rotation.z=-Math.atan2(bx-ax,by-ay);
  }
 }}
 embroidery([[0,.18],[.19,-.15],[0,-.50],[-.19,-.15],[0,.18]]);
 embroidery([[0,.04],[.09,-.15],[0,-.33],[-.09,-.15],[0,.04]]);
 for(const s of [-1,1]){embroidery([[s*.27,.20],[s*.31,-.39],[s*.33,-.70]]);for(let k=0;k<8;k++)embroidery([[s*.22,.10-k*.095],[s*.255,.065-k*.095]]);embroidery([[s*.06,-.47],[s*.14,-.66],[s*.23,-.70]]);}
 for(const s of [-1,1])ell(torso,edge,s*.255,.47,.19,.047,.047,.024);
 const head=joint('head',0,2.22,0);ell(head,black,0,.035,0,.173,.236,.17);
 const profile=[new T.Vector2(.178,-.13),new T.Vector2(.191,.07),new T.Vector2(.14,.24),new T.Vector2(.025,.37),new T.Vector2(0,.39)];put(head,new T.LatheGeometry(profile,16),iron);
 for(const s of [-1,1]){
  plate(head,iron,[[-.069,.05],[.072,.03],[.068,-.21],[-.023,-.28],[-.065,-.15]],.043,s*.088,-.035,.16);
  const eye=put(head,new T.BoxGeometry(.104,.019,.018),rune,s*.085,.015,.194);eye.rotation.z=-s*.12;
  for(let k=0;k<3;k++)put(head,new T.BoxGeometry(.016,.032,.01),black,s*(.038+k*.036),-.094,.190);
  const fin=plate(head,edge,[[-.07,0],[0,.25],[.055,.07],[.04,-.12]],.035,s*.16,.15,-.015);fin.rotation.y=s*.45;
 }
 plate(head,edge,[[-.018,.18],[.018,.18],[.023,-.18],[0,-.24],[-.023,-.18]],.02,0,0,.207);
 for(const s of [-1,1]){
  const leg=joint(s<0?'leftLeg':'rightLeg',s*.185,1.22,0);ell(leg,black,0,-.20,0,.14,.28,.14);
  const shin=joint(s<0?'leftShin':'rightShin',0,-.49,0,leg);
  plate(shin,iron,[[-.13,.04],[0,.11],[.13,.04],[.10,-.43],[0,-.49],[-.10,-.43]],.17,0,-.065,.055);
  plate(shin,edge,[[-.009,.05],[.009,.05],[.013,-.40],[0,-.44],[-.013,-.40]],.016,0,-.065,.15);
  ell(shin,iron,0,-.01,.10,.14,.125,.105);ell(shin,leather,0,-.61,.085,.133,.10,.22);put(shin,new T.BoxGeometry(.258,.037,.4),black,0,-.696,.08);
  const arm=joint(s<0?'leftArm':'rightArm',s*.43,1.98,0);ell(arm,black,0,-.22,0,.125,.275,.13);
  for(let k=0;k<3;k++){
   const shoulder=plate(arm,iron,[[-.17,.055],[-.11,.13],[.13,.13],[.21,-.025],[.18,-.10],[-.16,-.065]],.30,s*.035,-k*.082,0);shoulder.rotation.z=s*.20;
   put(arm,new T.BoxGeometry(.29,.012,.013),edge,s*.035,-k*.082-.04,.166);
  }
  const fore=joint(s<0?'leftForearm':'rightForearm',0,-.36,0,arm);
  plate(fore,iron,[[-.11,.05],[.11,.05],[.084,-.29],[-.084,-.29]],.175,0,-.07,.015);ell(fore,leather,0,-.38,.04,.097,.117,.10);
  for(let k=0;k<3;k++)put(fore,new T.BoxGeometry(.044,.12,.04),iron,(k-1)*.054,-.38,.12);
 }
 const box=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{const p=n.isMesh&&n.geometry.attributes.position;if(p)for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld));});const c=box.getCenter(new T.Vector3());root.children.forEach(n=>{n.position.x-=c.x;n.position.y-=box.min.y;n.position.z-=c.z;});root.userData.joints=joints;return root;
}
