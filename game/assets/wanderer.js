// Recipe 404: layered-plate construction selected from three reference readings.
export default function generate(T) {
  const root = new T.Group();
  const mat = (name, color, roughness=.72, metalness=0) => Object.assign(new T.MeshStandardMaterial({ color, roughness, metalness }), { name });
  const iron=mat('metal',0x64747e,.42,.7), edge=mat('metal',0xa1aba9,.35,.72), leather=mat('leather',0x352a25), cloth=mat('fabric',0x793e36), dark=mat('fabric',0x222a2b);
  function put(parent,geo,m,x,y,z) { const o=new T.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o; }
  const box=(p,m,x,y,z,w,h,d)=>{const s=new T.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});geo.translate(0,0,-d/2);return put(p,geo,m,x,y,z);};
  const sphere=(p,m,x,y,z,w,h,d)=>{const small=Math.max(w,h,d)<.05;const o=put(p,new T.SphereGeometry(1,small?8:14,small?5:9),m,x,y,z);o.scale.set(w,h,d);return o;};
  // Open curved steel shells read as overlapping plates, not inflated shoulder balls.
  function shell(parent,m,x,y,z,width,height,depth){
    const points=[new T.Vector2(width*.69,0),new T.Vector2(width,.045),new T.Vector2(width*.96,height*.58),new T.Vector2(width*.60,height)];
    const geo=new T.LatheGeometry(points,14,.18,Math.PI*2-.36);geo.scale(1,1,depth/width);
    const o=put(parent,geo,m,x,y,z);o.material.side=T.DoubleSide;return o;
  }
  function joint(name,x,y,z){const g=new T.Group();g.name=name;g.position.set(x,y,z);root.add(g);return g;}
  const torso=joint('torso',0,1.13,0);
  sphere(torso,dark,0,.17,0,.245,.30,.15);
  for(let r=0;r<5;r++)for(let c=0;c<7;c++){
    const a=(c-3)*.32, y=.03+r*.073;
    for(const side of [-1,1]){const plate=box(torso,iron,Math.sin(a)*.24,y,Math.cos(a)*.158*side,.078,.09,.028);plate.rotation.y=a*side;
      if(r%2===0)sphere(torso,edge,Math.sin(a)*.24,y+.027,Math.cos(a)*.18*side,.009,.009,.009);
    }
  }
  box(torso,leather,0,-.04,0,.46,.073,.34);box(torso,edge,0,-.04,.18,.075,.06,.018);
  for(const s of [-1,1]){const flap=box(torso,cloth,s*.115,-.22,.125,.205,.34,.05);flap.rotation.z=-s*.08;}
  const capeGeo=new T.PlaneGeometry(.66,.94,14,18), positions=capeGeo.attributes.position;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i),x=positions.getX(i),t=(.47-y)/.94;positions.setXYZ(i,x*(.65+t*.38),y+Math.cos(x*34)*.015*t,-.050*Math.cos(x*32)-t*.12);}
  const mantle=new T.Group();mantle.name='mantle';mantle.position.set(0,.455,-.20);torso.add(mantle);
  capeGeo.computeVertexNormals();const cape=put(mantle,capeGeo,cloth.clone(),0,-.47,0);cape.material.side=T.DoubleSide;cape.material.roughness=.86;cape.name='cape';
  const head=joint('head',0,1.66,0);
  sphere(head,dark,0,-.015,0,.145,.17,.135);
  const pts=[new T.Vector2(0, .23),new T.Vector2(.07,.16),new T.Vector2(.145,.06),new T.Vector2(.153,-.05)];
  put(head,new T.LatheGeometry(pts,24),iron,0,0,0);
  const brass=mat('metal',0xa99561,.49,.6);
  // Split tabard, sewn border and a clasp remain visible in the overhead game camera.
  for(const s of [-1,1]){
    const border=box(torso,brass,s*.205,-.23,.164,.014,.31,.01);border.rotation.z=-s*.08;
    box(torso,brass,s*.115,-.38,.165,.17,.012,.01);
    const pouch=box(torso,leather,s*.246,-.10,-.025,.09,.14,.11);pouch.rotation.z=s*.12;
    box(torso,brass,s*.246,-.08,.037,.03,.025,.01);
  }
  // Two narrow cape borders follow its actual folds instead of floating behind it.
  for(const s of [-1,1])for(let i=0;i<14;i++){
    const t=i/13,x=s*.302*(.65+t*.38),y=.45-t*.90;
    put(mantle,new T.BoxGeometry(.014,.069,.006),brass,x,y-.47,-.050*Math.cos(x*32)-t*.12-.008);
  }
  const clasp=put(torso,new T.CylinderGeometry(.046,.046,.019,12),brass,-.21,.30,.17);clasp.rotation.x=Math.PI/2;
  // Woven Marchguard device on the back: the side seen most often during play.
  const thread=mat('fabric',0xb2a078,1);
  function embroidery(points){for(let n=1;n<points.length;n++){
    const [ax,ay]=points[n-1],[bx,by]=points[n],steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/.022));
    for(let k=0;k<steps;k++){const t=(k+.5)/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,fall=(.455-y)/.94,z=-.20-.05*Math.cos(x*32)-fall*.12-.010;
      const stitch=put(mantle,new T.BoxGeometry(.010,Math.hypot(bx-ax,by-ay)/steps+.003,.006),thread,x,y-.455,z+.20);stitch.rotation.z=-Math.atan2(bx-ax,by-ay);
    }
  }}
  embroidery([[0,.27],[.13,.06],[0,-.15],[-.13,.06],[0,.27]]);
  embroidery([[0,.18],[.065,.06],[0,-.06],[-.065,.06],[0,.18]]);
  for(const s of [-1,1]){embroidery([[s*.06,-.13],[s*.09,-.28],[s*.16,-.34]]);for(let k=0;k<6;k++)embroidery([[s*.20,.22-k*.10],[s*.22,.19-k*.10]]);}
  for(const s of [-1,1]){sphere(torso,brass,s*.18,.32,-.14,.033,.033,.016);const strap=box(torso,leather,s*.16,.13,.174,.038,.47,.024);strap.rotation.z=s*.16;}
  for(let i=0;i<11;i++){const a=(i-5)*.25;sphere(head,brass,Math.sin(a)*.151,-.033,Math.cos(a)*.151,.011,.011,.009);}
  for(const s of [-1,1]){const cheek=box(head,iron,s*.08,-.092,.105,.105,.20,.07);cheek.rotation.y=s*.20;box(head,edge,s*.072,.004,.143,.122,.022,.025);}
  box(head,edge,0,-.074,.165,.028,.22,.028);
  for(const s of [-1,1]){
    const visor=box(head,dark,s*.073,-.016,.166,.10,.021,.011);visor.rotation.z=-s*.08;
    for(let row=0;row<3;row++)for(let col=0;col<2;col++)box(head,dark,s*(.041+col*.043),-.092-row*.027,.147,.015,.009,.009);
  }
  for(const s of [-1,1]){
    const leg=joint(s<0?'leftLeg':'rightLeg',s*.13,.91,0);
    sphere(leg,dark,0,-.17,0,.115,.24,.115);
    const shin=new T.Group();shin.name=s<0?'leftShin':'rightShin';shin.position.y=-.39;leg.add(shin);
    sphere(shin,iron,0,-.04,.035,.12,.115,.115);shell(shin,iron,0,-.39,.015,.101,.29,.095);
    box(shin,edge,0,-.23,.113,.017,.26,.013);
    const foot=new T.Group();foot.name=s<0?'leftFoot':'rightFoot';foot.position.set(0,-.435,.065);shin.add(foot);
    sphere(foot,leather,0,0,0,.104,.085,.172);box(foot,dark,0,-.065,-.005,.2,.035,.31);
    for(const y of [-.14,-.32])box(shin,leather,0,y,.03,.182,.033,.19);
    const arm=joint(s<0?'leftArm':'rightArm',s*.31,1.43,0);
    sphere(arm,dark,0,-.17,0,.097,.21,.1);
    for(let i=0;i<3;i++){const shoulder=shell(arm,iron,s*i*.012,-.12-i*.064,0,.154-i*.013,.115,.156-i*.01);shoulder.rotation.z=s*.18;
      for(const z of [-.11,.11])sphere(arm,brass,s*.105,-.055-i*.064,z,.01,.01,.009);
    }
    const fore=new T.Group();fore.name=s<0?'leftForearm':'rightForearm';fore.position.y=-.27;arm.add(fore);shell(fore,iron,0,-.24,.01,.075,.23,.073);sphere(fore,leather,0,-.28,.04,.069,.085,.064);
    for(const y of [-.035,-.20])shell(fore,leather,0,y-.023,.01,.081,.034,.078);
    for(let finger=0;finger<3;finger++)box(fore,iron,(finger-1)*.035,-.279,.088,.028,.09,.025);
  }
  // A low helmet ridge and chased shoulder plates read from the orbit camera.
  for(let i=0;i<7;i++){
    const a=-.65+i*.22,y=.02+Math.cos(a)*.195,z=Math.sin(a)*.145;
    const ridge=box(head,edge,0,y,z,.021,.035,.041);ridge.rotation.x=a;
  }
  for(const s of [-1,1]){
    const arm=root.getObjectByName(s<0?'leftArm':'rightArm');
    const badge=box(arm,brass,s*.025,-.095,.152,.073,.094,.012);badge.rotation.z=s*.18;
    const inset=box(arm,dark,s*.025,-.095,.162,.038,.05,.005);inset.rotation.z=Math.PI/4+s*.18;
    for(let n=0;n<3;n++)box(torso,edge,s*(.09+n*.04),.29-n*.02,.178,.031,.009,.008);
  }
  const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
  const center=bounds.getCenter(new T.Vector3());root.children.forEach(o=>{o.position.x-=center.x;o.position.z-=center.z;o.position.y-=bounds.min.y;});
  root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});
  return root;
}
