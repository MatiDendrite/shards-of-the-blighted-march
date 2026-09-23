// Recipe 404: layered-plate construction selected from three reference readings.
export default function generate(T) {
  const root = new T.Group();
  const mat = (name, color, roughness=.72, metalness=0) => Object.assign(new T.MeshStandardMaterial({ color, roughness, metalness }), { name });
  const iron=mat('metal',0x64747e,.42,.7), edge=mat('metal',0xa1aba9,.35,.72), leather=mat('timber',0x352a25), cloth=mat('fabric',0x793e36), dark=mat('fabric',0x222a2b);
  function put(parent,geo,m,x,y,z) { const o=new T.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o; }
  const box=(p,m,x,y,z,w,h,d)=>{const s=new T.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});geo.translate(0,0,-d/2);return put(p,geo,m,x,y,z);};
  const sphere=(p,m,x,y,z,w,h,d)=>{const o=put(p,new T.SphereGeometry(1,14,9),m,x,y,z);o.scale.set(w,h,d);return o;};
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
  capeGeo.computeVertexNormals();const cape=put(torso,capeGeo,cloth.clone(),0,-.015,-.20);cape.material.side=T.DoubleSide;cape.material.roughness=.86;cape.name='cape';
  const head=joint('head',0,1.66,0);
  sphere(head,dark,0,-.015,0,.145,.17,.135);
  const pts=[new T.Vector2(0, .23),new T.Vector2(.07,.16),new T.Vector2(.145,.06),new T.Vector2(.153,-.05)];
  put(head,new T.LatheGeometry(pts,24),iron,0,0,0);
  const brass=mat('metal',0xa99561,.49,.6);
  for(const s of [-1,1]){sphere(torso,brass,s*.18,.32,-.14,.033,.033,.016);const strap=box(torso,leather,s*.16,.13,.174,.038,.47,.024);strap.rotation.z=s*.16;}
  for(let i=0;i<11;i++){const a=(i-5)*.25;sphere(head,brass,Math.sin(a)*.151,-.033,Math.cos(a)*.151,.011,.011,.009);}
  for(const s of [-1,1]){const cheek=box(head,iron,s*.08,-.092,.105,.105,.20,.07);cheek.rotation.y=s*.20;box(head,edge,s*.072,.004,.143,.122,.022,.025);}
  box(head,edge,0,-.074,.165,.028,.22,.028);
  for(const s of [-1,1]){
    const leg=joint(s<0?'leftLeg':'rightLeg',s*.13,.91,0);
    sphere(leg,dark,0,-.17,0,.115,.24,.115);
    const shin=new T.Group();shin.name=s<0?'leftShin':'rightShin';shin.position.y=-.39;leg.add(shin);
    sphere(shin,iron,0,-.04,.035,.12,.115,.115);box(shin,iron,0,-.23,.025,.17,.32,.17);
    sphere(shin,leather,0,-.435,.065,.104,.085,.172);box(shin,dark,0,-.50,.06,.2,.035,.31);
    for(const y of [-.14,-.32])box(shin,leather,0,y,.03,.182,.033,.19);
    const arm=joint(s<0?'leftArm':'rightArm',s*.31,1.43,0);
    sphere(arm,dark,0,-.17,0,.097,.21,.1);
    for(let i=0;i<3;i++){const shoulder=sphere(arm,iron,s*i*.014,-i*.067,.0,.15-i*.011,.095,.17-i*.006);shoulder.rotation.z=s*.18;}
    const fore=new T.Group();fore.position.y=-.27;arm.add(fore);box(fore,iron,0,-.105,.02,.13,.25,.15);sphere(fore,leather,0,-.28,.04,.075,.09,.07);
  }
  const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
  const center=bounds.getCenter(new T.Vector3());root.children.forEach(o=>{o.position.x-=center.x;o.position.z-=center.z;o.position.y-=bounds.min.y;});
  root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});
  return root;
}
