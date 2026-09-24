// Standalone constructor-built character: fitted anatomy and thick, curved equipment.
export default function generate(T){
 const root=new T.Group(),frame=new T.Group();root.add(frame);root.userData.compactActorPalette=true;
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.56:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x793e36),dark=material('fabric',0x222a2b),thread=material('fabric',0xb2a078),iron=material('metal',0x64747e,.7),edge=material('metal',0xa1aba9,.7),brass=material('metal',0xa99561,.6),leather=material('leather',0x352a25),skin=material('skin',0xbda18c),hair=material('hair',0x514338),lip=material('skin',0x967b70),eyes=material('eyes',0xbcbdb1),pupil=material('eyes',0x3e4849);
 const proportions={hip:.125,arm:.285,boot:1,chest:1,face:[1,1,1],scale:[1,1,1],height:1.85};
 const sole=material('leather',dark.color.getHex());eyes.roughness=pupil.roughness=.82;
 const put=(parent,geometry,m,x=0,y=0,z=0,name='')=>{const mesh=new T.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.name=name;parent.add(mesh);return mesh;};
 const joint=(name,x,y,z,parent=frame)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const ell=(parent,m,x,y,z,w,h,d)=>{const mesh=put(parent,new T.SphereGeometry(1,10,7),m,x,y,z);mesh.scale.set(w,h,d);return mesh;};
 function block(parent,m,x,y,z,w,h,d){
  const s=new T.Shape([new T.Vector2(-w/2,-h/2),new T.Vector2(w/2,-h/2),new T.Vector2(w/2,h/2),new T.Vector2(-w/2,h/2)]);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});g.translate(0,0,-d/2);return put(parent,g,m,x,y,z);
 }
 function cord(parent,m,points,radius=.004,segments=16){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return put(parent,new T.TubeGeometry(path,segments,radius,radius<=.009?4:5,false),m);
 }
 function closeNormals(geometry,rows,segments,layers=1){
  const n=geometry.attributes.normal,count=rows*(segments+1);
  for(let layer=0;layer<layers;layer++)for(let j=0;j<rows;j++){
   const a=layer*count+j*(segments+1),b=a+segments,x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),length=Math.hypot(x,y,z)||1;
   n.setXYZ(a,x/length,y/length,z/length);n.setXYZ(b,x/length,y/length,z/length);
  }
 }
 // Rows run from bottom to top: height, half-width, front depth, back depth,
 // optional centre offset. Separate inner surfaces give open cloth real thickness.
 function loft(parent,m,rows,{segments=28,start=0,arc=Math.PI*2,fold=0,thickness=0,capTop=false,x=0,z=0,drop=0,name='',shade=true}={}){
  const pos=[],uv=[],colors=[],index=[],count=rows.length*(segments+1),layers=thickness?2:1;
  function point(j,i,inside=false){
   const [y,w,front,back,offset=0]=rows[j],a=start+arc*i/segments,t=j/(rows.length-1);
   const pleat=fold*(Math.sin(a*9+.35*Math.sin(a*3))+.35*Math.sin(a*17+.4))*(.4+.6*Math.sin(t*Math.PI*.8)**2),inset=inside?thickness:0;
   return [x+Math.sin(a)*Math.max(.003,w+pleat-inset),y-drop*Math.sin(a)**2,z+offset+Math.cos(a)*Math.max(.003,(Math.cos(a)>=0?front:back)+pleat-inset),pleat];
  }
  for(let layer=0;layer<layers;layer++)for(let j=0;j<rows.length;j++)for(let i=0;i<=segments;i++){
   const p=point(j,i,!!layer);pos.push(...p.slice(0,3));uv.push(i/segments,j/(rows.length-1));
   const value=shade?(layer?.64:.88+(fold?p[3]/fold*.07:Math.cos((start+arc*i/segments)*2)*.025)):1;
   colors.push(value,value,value);
   if(j&&i){const a=layer*count+(j-1)*(segments+1)+i-1,b=a+segments+1;index.push(...(layer?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}
  }
  if(thickness){
   const edge=(a,b)=>index.push(a,b,a+count,b,b+count,a+count);
   for(let i=0;i<segments;i++){edge(i+1,i);const a=(rows.length-1)*(segments+1)+i;edge(a,a+1);}
   if(arc<Math.PI*2)for(let j=0;j<rows.length-1;j++){const a=j*(segments+1);edge(a,a+segments+1);edge(a+segments*2+1,a+segments);}
   if(capTop&&arc===Math.PI*2){
    const j=rows.length-1,center=pos.length/3;pos.push(x,rows[j][0],z+(rows[j][4]||0));uv.push(.5,1);colors.push(.88,.88,.88);
    for(let i=0;i<segments;i++){const a=count+j*(segments+1)+i;index.push(center,a,a+1);}
   }
  }else if(arc===Math.PI*2){
   for(const j of [0,rows.length-1]){
    const center=pos.length/3;pos.push(x,rows[j][0],z+(rows[j][4]||0));uv.push(.5,j/(rows.length-1));colors.push(1,1,1);
    for(let i=0;i<segments;i++){const a=j*(segments+1)+i;index.push(...(j?[center,a,a+1]:[center,a+1,a]));}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();
  if(arc===Math.PI*2)closeNormals(g,rows.length,segments,layers);
  const mesh=put(parent,g,m,0,0,0,name);m.vertexColors=true;
  return {mesh,point:(j,i)=>point(j,i).slice(0,3)};
 }

 const torso=joint('torso',0,1.13,0),head=joint('head',0,1.66,0),limbs={};
 for(const s of [-1,1]){
  const side=s<0?'left':'right',leg=joint(side+'Leg',s*proportions.hip,.91,0),shin=joint(side+'Shin',0,-.39,0,leg),foot=joint(side+'Foot',0,-.435,.065,shin),arm=joint(side+'Arm',s*proportions.arm,1.43,0),fore=joint(side+'Forearm',0,-.27,0,arm);
  limbs[side]={leg,shin,foot,arm,fore};
  loft(foot,leather,[[-.069,.074,.139,.073],[-.05,.09,.163,.08],[-.006,.096,.166,.079],[.034,.081,.136,.073],[.073,.056,.066,.058]].map(([y,w,f,b])=>[y,w*proportions.boot,f,b]),{segments:18,name:side+'Boot'});
  loft(foot,sole,[[-.085,.078,.14,.074],[-.076,.091,.166,.081],[-.057,.09,.163,.081]].map(([y,w,f,b])=>[y,w*proportions.boot,f,b]),{segments:18});
  loft(shin,dark,[[-.41,.061,.06,.063],[-.30,.074,.071,.07],[-.18,.083,.084,.079],[-.06,.078,.08,.075],[.015,.086,.088,.078]],{segments:18,fold:.003,name:side+'Calf'});
  loft(leg,cloth,[[-.40,.096,.101,.092],[-.30,.10,.106,.097],[-.16,.108,.107,.115],[.018,.117,.119,.112],[.08,.106,.106,.10]],{segments:20,fold:.005,name:side+'Thigh'});
  loft(arm,cloth,[[-.285,.084,.089,.088],[-.21,.09,.095,.096],[-.09,.101,.104,.102],[.03,.1,.1,.096],[.072,.028,.03,.028]],{segments:20,fold:.004,name:side+'Sleeve'});
  loft(fore,leather,[[-.25,.059,.063,.062],[-.20,.071,.075,.073],[-.10,.081,.083,.079],[.022,.078,.08,.079]],{segments:18,name:side+'ForearmVolume'});
  loft(fore,leather,[[-.321,.035,.034,.025],[-.299,.05,.042,.03],[-.266,.047,.035,.028],[-.235,.035,.031,.026]],{segments:18,z:.025,name:side+'Palm'});
  for(let finger=0;finger<4;finger++){
   const x=(finger-1.5)*.022,len=[.052,.061,.056,.043][finger];
   const mesh=cord(fore,leather,[[x,-.299,.039],[x,-.327,.058],[x,-.305-len,.043],[x,-.314-len,.025]],.0105,6);mesh.name=side+'Finger'+finger;
  }
  cord(fore,leather,[[s*.042,-.264,.032],[s*.061,-.29,.052],[s*.042,-.318,.059]],.014,7).name=side+'Thumb';
 }
 loft(torso,cloth,[[-.14,.182,.125,.129],[-.03,.19,.14,.142],[.10,.213,.162,.157],[.23,.238,.175,.159],[.32,.215,.147,.134],[.397,.168,.098,.104],[.43,.076,.069,.073]].map(([y,w,f,b])=>[y,w*proportions.chest,f,b]),{segments:28,fold:.004,name:'fittedTorso'});
 loft(torso,skin,[[.37,.057,.055,.053],[.44,.06,.061,.057],[.51,.063,.059,.057]],{segments:18,shade:false});
 // A continuous jaw and skull with cheekbones and sockets underneath the headwear.
 const faceRoot=joint('faceVolume',0,0,0,head);faceRoot.scale.set(...proportions.face);faceRoot.userData.rigid=true;
 const face=loft(faceRoot,skin,[[-.151,.042,.073,.058],[-.125,.078,.104,.077],[-.08,.103,.116,.095],[-.026,.119,.109,.113],[.026,.119,.106,.12],[.079,.12,.107,.12],[.127,.108,.102,.11],[.171,.078,.071,.085],[.191,.009,.016,.02]],{segments:28,shade:false,name:'sculptedFace'});
 const fp=face.mesh.geometry.attributes.position;
 for(let i=0;i<fp.count;i++){
  const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);
  if(z>0){const cheek=Math.exp(-(((Math.abs(x)-.077)/.032)**2)-((y+.038)/.035)**2),socket=Math.exp(-(((Math.abs(x)-.048)/.026)**2)-((y-.022)/.023)**2);fp.setZ(i,z+cheek*.014-socket*.008);face.mesh.geometry.attributes.color.setXYZ(i,1-socket*.05,1-cheek*.045-socket*.05,1-cheek*.07-socket*.05);}
 }
 face.mesh.geometry.computeVertexNormals();closeNormals(face.mesh.geometry,9,28);
 loft(faceRoot,skin,[[-.072,.019,.14,.108],[-.059,.026,.158,.107],[-.04,.021,.158,.105],[.003,.013,.13,.101],[.036,.011,.111,.101]],{segments:18,shade:false,name:'nose'});
 for(const s of [-1,1]){
  ell(faceRoot,eyes,s*.047,.023,.101,.023,.008,.007);ell(faceRoot,pupil,s*.047,.023,.108,.0055,.006,.0025);
  cord(faceRoot,skin,[[s*.025,.024,.108],[s*.047,.033,.110],[s*.071,.023,.097]],.0035,8);
  cord(faceRoot,lip,[[s*.025,.020,.108],[s*.047,.015,.109],[s*.071,.021,.097]],.0025,8);
  cord(faceRoot,hair,[[s*.023,.049,.112],[s*.049,.054,.113],[s*.078,.042,.096]],.005,9);
  ell(faceRoot,skin,s*.118,-.012,0,.018,.04,.022);
 }
 cord(faceRoot,lip,[[-.029,-.1,.119],[0,-.098,.125],[.029,-.1,.119]],.0032,10);
 loft(faceRoot,hair,[[.104,.124,.12,.132],[.127,.12,.116,.123],[.171,.09,.083,.097],[.192,.022,.029,.031],[.2,.005,.009,.012]],{segments:24,fold:.0015,name:'hairline'});

 // Convex breastplate and backplate form one fitted cuirass, with a raised central flute.
 const chest=loft(torso,iron,[[-.024,.204,.157,.152],[.07,.217,.178,.163],[.19,.25,.193,.177],[.29,.257,.18,.167],[.354,.222,.14,.139],[.398,.177,.111,.119],[.443,.071,.07,.075]],{segments:36,name:'forgedCuirass'});
 const cp=chest.mesh.geometry.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);if(z>0)cp.setZ(i,z+.022*Math.exp(-((x/.045)**2))*Math.max(0,Math.sin((y+.025)/.41*Math.PI)));}
 chest.mesh.geometry.computeVertexNormals();closeNormals(chest.mesh.geometry,7,36);
 for(const s of [-1,1])cord(torso,edge,[[s*.025,.35,.128],[s*.09,.30,.172],[s*.15,.20,.16],[s*.12,.075,.17]],.0045,18);
 for(let row=0;row<2;row++)loft(torso,iron,[[-.126+row*.065,.209,.148,.149],[-.09+row*.065,.216,.157,.154],[-.037+row*.065,.205,.15,.147]],{segments:28,thickness:.009,name:'waistLame'+row});
 loft(torso,leather,[[-.113,.215,.163,.163],[-.055,.216,.164,.165]],{segments:28,thickness:.008,name:'waistBelt'});
 block(torso,brass,0,-.08,.177,.076,.055,.017);block(torso,leather,0,-.08,.188,.047,.029,.009);
 // Split, thick cloth skirts follow the thighs instead of floating as flat panels.
 for(const s of [-1,1]){
  const {leg,shin,foot,arm,fore}=limbs[s<0?'left':'right'];
  const skirt=loft(leg,cloth,[[-.26,.26,.192,.188],[-.16,.247,.184,.176],[-.04,.225,.169,.157],[.10,.2,.145,.15]],{segments:20,start:s<0?Math.PI+.09:.09,arc:Math.PI-.18,thickness:.008,fold:.01,x:-s*proportions.hip,name:s<0?'leftTabard':'rightTabard'});
  cord(leg,thread,Array.from({length:17},(_,i)=>skirt.point(0,i/16*20)),.004,22);
  for(let layer=0;layer<2;layer++){
   const y=-layer*.085;
   const rows=[[y-.12,.137,.127,.13],[y-.045,.163,.151,.145],[y+.035,.151,.142,.131],[y+.082,.09,.09,.086],[y+.112,.009,.012,.013]];
   if(layer)rows.splice(3,1); // The overlapping upper plate already covers this crown.
   const plate=loft(arm,iron,rows,{segments:20,thickness:.009,capTop:true,drop:.016,name:(s<0?'left':'right')+'Pauldron'+layer});
   cord(arm,edge,Array.from({length:21},(_,i)=>plate.point(0,i)),.0035,28);
  }
  loft(fore,iron,[[-.233,.067,.075,.068],[-.16,.083,.093,.081],[-.055,.094,.093,.087],[.018,.088,.087,.084]],{segments:20,thickness:.008,name:(s<0?'left':'right')+'Vambrace'});
  loft(fore,iron,[[-.313,.045,.038,.022],[-.285,.053,.041,.027],[-.255,.04,.033,.022]],{segments:16,start:-1.15,arc:2.3,thickness:.005,z:.025});
  for(let finger=0;finger<4;finger++)block(fore,edge,(finger-1.5)*.022,-.315,.068,.016,.024,.008);
  loft(shin,iron,[[-.389,.065,.083,.065],[-.28,.091,.106,.087],[-.14,.103,.12,.094],[.003,.094,.107,.088],[.05,.065,.08,.068]],{segments:20,start:-1.65,arc:3.3,thickness:.009,name:(s<0?'left':'right')+'Greave'});
  cord(shin,edge,[[0,-.37,.087],[0,-.23,.117],[0,-.08,.122],[0,.04,.09]],.006,14);
  loft(foot,iron,[[-.052,.097,.17,.066],[.012,.098,.165,.066],[.048,.076,.124,.058]],{segments:18,start:-1.6,arc:3.2,thickness:.005,name:'armouredToe'});
  const bag=joint('beltPouch'+s,s*.235,-.14,-.025,torso);bag.rotation.z=s*.12;bag.userData.rigid=true;
  loft(bag,leather,[[-.08,.04,.043,.037],[-.04,.055,.055,.041],[.05,.053,.051,.04],[.085,.043,.04,.035]],{segments:16});block(bag,brass,0,.035,.056,.022,.031,.009);
 }
 // Open sallet: a rounded crown, wrapped cheek guards and visible facial volume.
 const helmet=loft(head,iron,[[-.105,.155,.129,.152],[-.025,.163,.15,.165],[.074,.148,.145,.16],[.15,.112,.117,.125],[.214,.055,.061,.073],[.23,.005,.009,.013]],{segments:32,start:.72,arc:Math.PI*2-1.44,thickness:.01,name:'openHelmet'});
 loft(head,iron,[[.089,.143,.146,.151],[.151,.113,.118,.126],[.215,.056,.062,.074],[.231,.006,.01,.014]],{segments:8,start:-.75,arc:1.5,thickness:.008,name:'helmetBrowPlate'});
 for(const i of [0,32])cord(head,brass,Array.from({length:6},(_,j)=>helmet.point(j,i)),.0045,22);
 cord(head,edge,[[-.115,.054,.109],[-.074,.079,.15],[0,.09,.165],[.074,.079,.15],[.115,.054,.109]],.013,24);
 for(const s of [-1,1]){
  loft(head,iron,[[-.164,.133,.105,.132],[-.11,.159,.127,.148],[-.045,.158,.14,.15]],{segments:12,start:s<0?Math.PI+1.05:.65,arc:Math.PI-1.7,thickness:.012,name:s<0?'leftCheekGuard':'rightCheekGuard'});
  cord(faceRoot,hair,[[s*.105,-.058,.066],[s*.082,-.116,.088],[s*.029,-.142,.078]],.014,12);
 }
 cord(head,edge,[[0,-.015,-.169],[0,.12,-.143],[0,.221,-.048],[0,.235,.008],[0,.185,.10],[0,.106,.15]],.013,28);
 const mantle=joint('mantle',0,.42,-.16,torso),capeRows=[[-.94,.307,.071,.156],[-.84,.301,.069,.145],[-.65,.28,.063,.12],[-.43,.24,.052,.083],[-.20,.20,.044,.052],[0,.12,.032,.036]];
 const cape=loft(mantle,cloth,capeRows,{segments:28,start:Math.PI/2,arc:Math.PI,fold:.012,thickness:.009,name:'foldedMantle'});
 cord(mantle,thread,Array.from({length:23},(_,i)=>cape.point(0,i/22*28)),.004,28);
 for(const i of [0,28])cord(mantle,thread,capeRows.map((_,j)=>cape.point(j,i)),.004,18);
 // Marchguard emblem follows the actual curved back of the mantle.
 for(const s of [-1,1])cord(mantle,thread,[[0,-.2,-.06],[s*.1,-.34,-.084],[0,-.49,-.105]],.008,18);
 cord(torso,leather,[[-.18,.32,.137],[-.11,.18,.213],[0,.0,.173],[.2,-.1,.089]],.014,22);
 const clasp=put(torso,new T.CylinderGeometry(.033,.033,.014,12),brass,-.179,.321,.155);clasp.rotation.x=Math.PI/2;

 // These construction pivots are rigid, not combat joints. Bake their local
 // placement into their meshes so the renderer can batch them with the parent.
 const rigid=[];root.traverse(o=>{if(o.isGroup&&o.userData.rigid)rigid.push(o);});
 for(const group of rigid){group.updateMatrix();const parent=group.parent;for(const mesh of [...group.children]){mesh.applyMatrix4(group.matrix);parent.add(mesh);}parent.remove(group);}
 // All shared vertex-colour materials need complete attributes, including trim.
 const bounds=new T.Box3(),v=new T.Vector3();frame.scale.set(...proportions.scale);root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;if(o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(p.count*3).fill(1),3));for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const scale=proportions.height/bounds.getSize(new T.Vector3()).y;frame.scale.multiplyScalar(scale);frame.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
 root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});return root;
}
