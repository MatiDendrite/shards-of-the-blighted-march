// Standalone constructor-built character: fitted anatomy and thick, curved equipment.
export default function generate(T){
 const root=new T.Group(),frame=new T.Group();root.add(frame);root.userData.compactActorPalette=true;
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.56:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x92703e),dark=material('fabric',0x323634),thread=material('fabric',0xb29a70),iron=material('metal',0x69777c,.65),edge=material('metal',0x9caaa9,.65),brass=material('metal',0xb29a67,.55),leather=material('leather',0x4e3525),skin=material('skin',0xc09b80),hair=material('hair',0x75422b),lip=material('skin',0x9c7462),eyes=material('eyes',0xbdb9a7),pupil=material('eyes',0x4d5143);
 const proportions={hip:.145,arm:.33,boot:1.15,chest:1.16,face:[1.2,1.04,1.12],scale:[1.2,.78,1.05],height:1.4};
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

 // A deep forged cuirass, broad at the ribs and tapered at the belt.
 loft(torso,iron,[[-.043,.223,.164,.169],[.048,.253,.194,.185],[.16,.288,.205,.199],[.265,.29,.198,.183],[.337,.253,.165,.151],[.407,.19,.112,.119],[.443,.079,.074,.079]],{segments:36,name:'forgedCuirass'});
 for(const s of [-1,1]){
  cord(torso,brass,[[s*.035,.35,.117],[s*.12,.28,.185],[s*.19,.17,.165],[s*.148,.023,.171]],.009,18);
  cord(torso,edge,[[s*.205,.28,.137],[s*.256,.17,.105],[s*.231,.06,.118]],.006,14);
 }
 // A heavy leather apron wraps the belly and hangs clear of the knees.
 const apronRows=[[-.485,.262,.205,.17],[-.405,.283,.218,.18],[-.27,.282,.213,.179],[-.13,.252,.194,.175],[-.045,.233,.181,.169]];
 const apron=loft(torso,leather,apronRows,{segments:28,start:-1.17,arc:2.34,fold:.006,thickness:.012,name:'smithApron'});
 for(const i of [0,28])cord(torso,thread,apronRows.map((_,j)=>apron.point(j,i)),.005,18);
 cord(torso,thread,Array.from({length:23},(_,i)=>apron.point(0,i/22*28)),.005,28);
 loft(torso,leather,[[-.102,.242,.193,.184],[-.04,.239,.193,.18]],{segments:28,thickness:.01,name:'forgeBelt'});
 block(torso,brass,0,-.071,.205,.10,.07,.024);block(torso,iron,0,-.071,.221,.063,.039,.011);
 // Hammer emblem is a small inset, not the structure of the apron.
 const badge=put(torso,new T.CylinderGeometry(.061,.061,.012,6),iron,0,-.292,.228);badge.rotation.x=Math.PI/2;
 const haft=block(torso,brass,0,-.29,.24,.012,.083,.007);haft.rotation.z=-.38;
 const hammer=block(torso,brass,-.015,-.256,.244,.066,.025,.011);hammer.rotation.z=-.38;
 for(const s of [-1,1]){
  const side=s<0?'left':'right',{shin,foot,arm,fore}=limbs[side];
  for(let layer=0;layer<2;layer++){
   const y=-layer*.11;
   const shoulder=loft(arm,iron,[[y-.13,.153,.146,.145],[y-.048,.188,.18,.17],[y+.035,.176,.171,.163],[y+.092,.107,.106,.104],[y+.124,.012,.013,.013]],{segments:24,thickness:.012,capTop:true,drop:.019,name:side+'Pauldron'+layer});
   cord(arm,brass,Array.from({length:25},(_,i)=>shoulder.point(0,i)),.006,28);
  }
  loft(fore,iron,[[-.231,.077,.081,.076],[-.17,.094,.10,.088],[-.065,.104,.109,.092],[.017,.091,.096,.09]],{segments:20,thickness:.009,name:side+'Bracer'});
  cord(fore,brass,[[0,-.213,.084],[0,-.13,.108],[0,-.044,.113],[0,.011,.10]],.007,14);
  loft(fore,iron,[[-.318,.047,.042,.026],[-.29,.059,.048,.031],[-.252,.046,.037,.028]],{segments:18,start:-1.3,arc:2.6,thickness:.006,z:.025,name:side+'Gauntlet'});
  for(let n=0;n<4;n++)block(fore,brass,(n-1.5)*.022,-.318,.075,.015,.028,.009);
  loft(shin,iron,[[-.389,.074,.085,.069],[-.27,.105,.117,.091],[-.11,.114,.128,.10],[.03,.099,.112,.09]],{segments:20,start:-1.7,arc:3.4,thickness:.012,name:side+'Greave'});
  cord(shin,brass,[[0,-.376,.09],[0,-.25,.123],[0,-.1,.134],[0,.02,.119]],.008,14);
  loft(foot,iron,[[-.05,.11,.172,.082],[-.006,.118,.177,.079],[.044,.097,.136,.069],[.066,.075,.10,.062]],{segments:20,start:-1.6,arc:3.2,thickness:.006,name:side+'SteelToe'});
  const bag=joint('toolPouch'+s,s*.278,-.147,-.035,torso);bag.rotation.z=s*.13;bag.userData.rigid=true;
  loft(bag,leather,[[-.11,.035,.043,.035],[-.065,.062,.062,.047],[.035,.06,.06,.045],[.085,.051,.05,.043]],{segments:16});
  block(bag,brass,0,.02,.064,.027,.044,.01);
 }
 // Broad open helmet follows the head rather than using a cloth hood as backing.
 const helmRows=[[-.115,.17,.132,.166],[-.04,.191,.17,.178],[.07,.188,.17,.178],[.158,.144,.134,.149],[.229,.074,.075,.085],[.254,.008,.012,.016]];
 const helmet=loft(head,iron,helmRows,{segments:32,start:.86,arc:Math.PI*2-1.72,thickness:.012,name:'openHelmet'});
 loft(head,iron,[[.104,.176,.162,.169],[.159,.145,.135,.15],[.23,.075,.076,.086],[.255,.009,.013,.017]],{segments:12,start:-.88,arc:1.76,thickness:.01,name:'helmetBrowPlate'});
 for(const i of [0,32])cord(head,brass,helmRows.map((_,j)=>helmet.point(j,i)),.008,22);
 cord(head,brass,[[-.143,.073,.122],[-.09,.094,.16],[0,.101,.184],[.09,.094,.16],[.143,.073,.122]],.018,26);
 for(const s of [-1,1]){
  cord(head,brass,[[s*.152,-.048,-.074],[s*.135,.092,-.12],[s*.062,.234,-.02],[s*.055,.194,.1],[s*.09,.101,.154]],.011,22);
  loft(head,iron,[[-.18,.169,.11,.166],[-.093,.19,.145,.174],[-.025,.185,.154,.177]],{segments:12,start:s<0?Math.PI+.98:.73,arc:Math.PI-1.71,thickness:.012,name:sideName(s)+'CheekGuard'});
 }
 function sideName(s){return s<0?'left':'right';}
 // Broad beard mass under the jaw, with tapered swept braids rather than bead stacks.
 loft(faceRoot,hair,[[-.255,.039,.137,.082],[-.215,.089,.158,.093],[-.159,.132,.16,.103],[-.104,.134,.137,.107],[-.062,.114,.119,.095]],{segments:28,start:-1.5,arc:3,fold:.004,name:'beardMass'});
 for(const s of [-1,1]){
  cord(faceRoot,hair,[[s*.006,-.085,.153],[s*.039,-.089,.161],[s*.083,-.112,.131]],.019,14);
  cord(faceRoot,hair,[[s*.11,.021,.047],[s*.123,-.053,.066],[s*.10,-.124,.128]],.02,14);
 }
 for(let braid=0;braid<3;braid++){
  const x=(braid-1)*.085,length=braid===1?.325:.26,rows=[];
  for(let n=0;n<11;n++){const t=n/10;rows.push([-.115-length+length*t,.013+.034*t,.016+.032*t,.013+.025*t,.215-.085*t**4]);}
  const lock=loft(faceRoot,hair,rows,{segments:16,x,fold:.003,name:'beardBraid'+braid}),p=lock.mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),t=(y+.115+length)/length;p.setX(i,p.getX(i)+Math.sin(t*Math.PI*5+braid)*.006);}
  lock.mesh.geometry.computeVertexNormals();closeNormals(lock.mesh.geometry,11,16);
  const bandY=-.115-length*.77;loft(faceRoot,brass,[[bandY-.018,.026,.03,.026],[bandY+.018,.029,.034,.029]],{segments:16,x,z:.215,thickness:.005,name:'beardBand'+braid});
 }

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
