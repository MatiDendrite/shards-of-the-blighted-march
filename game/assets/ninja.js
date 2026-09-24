// Standalone constructor-built character: fitted anatomy and thick, curved equipment.
export default function generate(T){
 const root=new T.Group(),frame=new T.Group();root.add(frame);root.userData.compactActorPalette=true;
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.56:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x31575a),dark=material('fabric',0x232d30),thread=material('fabric',0x71817d),iron=material('metal',0x69777c,.6),edge=material('metal',0x8f9a96,.65),brass=material('metal',0xa29472,.5),leather=material('leather',0x382e28),skin=material('skin',0xb9957e),hair=material('hair',0x272c2c),lip=material('skin',0x947265),eyes=material('eyes',0xb9b8a6),pupil=material('eyes',0x3a4540);
 const proportions={hip:.12,arm:.26,boot:.94,chest:.94,face:[.98,1,.98],scale:[.96,1,1],height:1.78};
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

 // Three overlapping curved leather bands follow the torso; the arms stay unarmoured.
 for(let layer=0;layer<3;layer++){
  const y=.015+layer*.085,w=.207+layer*.014,f=.162+layer*.008;
  const vest=loft(torso,leather,[[y,w,f,.151],[y+.065,w+.013,f+.015,.163],[y+.104,w+.003,f+.005,.155]],{segments:28,thickness:.007,name:'lamellarVest'+layer});
  for(const s of [-1,1])cord(torso,thread,[[s*.12,y+.012,f*.855+.009],[s*.154,y+.045,f*.77+.015],[s*.12,y+.082,f*.88+.009]],.0035,8);
  cord(torso,dark,Array.from({length:21},(_,i)=>vest.point(0,i/20*28)),.0035,26);
 }
 // A wrapped sash and overlapping collar have real cross-sectional thickness.
 loft(torso,cloth,[[-.116,.205,.15,.147],[-.092,.213,.16,.156],[-.055,.211,.158,.154],[-.022,.202,.15,.148]],{segments:28,fold:.004,thickness:.009,name:'wrappedSash'});
 block(torso,brass,.067,-.067,.167,.052,.043,.012);
 const collar=loft(torso,cloth,[[.301,.231,.16,.154],[.33,.231,.164,.154],[.374,.183,.134,.133],[.42,.108,.088,.09],[.455,.082,.075,.076]],{segments:28,fold:.006,thickness:.009,name:'foldedCollar'});
 cord(torso,thread,Array.from({length:21},(_,i)=>collar.point(0,i/20*28)),.003,26);
 // A shaped cloth mask follows the cheekbones, chin and projecting nose.
 const mask=loft(faceRoot,dark,[[-.158,.061,.092,.073],[-.125,.092,.119,.094],[-.075,.12,.16,.105],[-.029,.125,.157,.117],[.001,.12,.115,.121]],{segments:28,start:-1.48,arc:2.96,fold:.002,thickness:.006,name:'shapedMask'});
 cord(faceRoot,thread,Array.from({length:21},(_,i)=>mask.point(4,i/20*28)),.003,24);
 cord(faceRoot,cloth,[[0,-.149,.098],[0,-.115,.136],[0,-.06,.165],[0,-.004,.12]],.0035,12);
 const hoodRows=[[-.148,.147,.124,.143],[-.045,.158,.142,.15],[.06,.158,.147,.157],[.146,.122,.125,.135],[.207,.057,.067,.075],[.222,.006,.009,.015]];
 const hood=loft(head,cloth,hoodRows,{segments:32,start:.85,arc:Math.PI*2-1.70,fold:.005,thickness:.009,name:'openHood'});
 for(const i of [0,32])cord(head,thread,hoodRows.map((_,j)=>hood.point(j,i)),.004,20);
 for(const s of [-1,1]){
  const side=s<0?'left':'right',{leg,shin,foot,arm,fore}=limbs[side];
  const skirt=loft(leg,cloth,[[-.235,.235,.167,.176],[-.14,.225,.163,.172],[-.026,.208,.156,.15],[.1,.187,.138,.14]],{segments:20,start:s<0?Math.PI+.14:.14,arc:Math.PI-.28,thickness:.007,fold:.009,x:-s*proportions.hip,name:side+'TunicSkirt'});
  cord(leg,thread,Array.from({length:15},(_,i)=>skirt.point(0,i/14*20)),.0035,20);
  const shoulder=loft(arm,leather,[[-.12,.105,.113,.11],[-.052,.125,.129,.122],[.017,.125,.124,.118],[.062,.083,.087,.081],[.103,.009,.012,.012]],{segments:20,thickness:.007,capTop:true,name:side+'ShoulderGuard'});
  cord(arm,thread,Array.from({length:21},(_,i)=>shoulder.point(0,i)),.0035,24);
  loft(fore,dark,[[-.237,.066,.07,.068],[-.2,.079,.082,.078],[-.1,.09,.092,.085],[.012,.084,.086,.083]],{segments:20,thickness:.007,name:side+'WristWrap'});
  for(let n=0;n<4;n++){
   const y=-.202+n*.05,w=.078+Math.sin(n/3*Math.PI)*.011;
   cord(fore,thread,[[-w,y,.02],[-w*.65,y+.016,.075],[0,y+.025,.092],[w*.65,y+.027,.075],[w,y+.042,.02]],.004,14);
  }
  loft(shin,leather,[[-.405,.066,.066,.067],[-.34,.078,.08,.077],[-.23,.09,.095,.085],[-.12,.089,.097,.083],[-.08,.083,.087,.083]],{segments:20,name:side+'SoftBoot'});
  for(let n=0;n<3;n++)cord(shin,thread,[[-.062,-.34+n*.07,.054],[0,-.316+n*.07,.099],[.063,-.30+n*.07,.052]],.004,12);
  cord(foot,thread,[[s*.035,-.04,.164],[s*.033,-.008,.163],[s*.024,.025,.138],[s*.02,.05,.085]],.0035,10);
  const scarf=joint(side==='left'?'scarfLeft':'scarfRight',s*.091,.4,-.174,torso);scarf.rotation.z=-s*.14;
  const rows=[[-.78,.04,.014,.025,-.17],[-.68,.06,.017,.03,-.145],[-.49,.064,.019,.03,-.11],[-.29,.061,.019,.026,-.046],[-.12,.055,.018,.025,-.005],[0,.042,.019,.025,0]];
  const tail=loft(scarf,cloth,rows,{segments:16,start:Math.PI/2,arc:Math.PI,fold:.004,thickness:.006,name:side+'FoldedScarf'});
  for(const i of [0,16])cord(scarf,thread,rows.map((_,j)=>tail.point(j,i)),.003,20);
  cord(scarf,thread,Array.from({length:13},(_,i)=>tail.point(0,i/12*16)),.003,16);
 }
 // Diagonal chest fastening follows the curved vest instead of clipping through it.
 cord(torso,cloth,[[.167,.31,.142],[.115,.232,.178],[.014,.10,.192],[-.125,-.033,.132],[-.205,-.10,.06]],.019,22);
 const sheath=joint('utilitySheath',-.23,-.165,-.05,torso);sheath.rotation.z=-.28;sheath.userData.rigid=true;
 loft(sheath,leather,[[-.31,.01,.021,.021],[-.26,.033,.024,.024],[-.04,.037,.027,.027],[.045,.038,.028,.028]],{segments:16,name:'curvedSheath'});
 block(sheath,iron,0,.048,0,.092,.025,.064);
 loft(sheath,dark,[[.06,.024,.021,.021],[.15,.023,.02,.02]],{segments:12});
 for(let i=0;i<4;i++)cord(sheath,thread,[[-.022,.072+i*.02,.007],[0,.078+i*.02,.026],[.022,.085+i*.02,.007]],.0035,8);
 for(let i=0;i<2;i++){
  const x=.135+i*.061;loft(torso,leather,[[-.25,.019,.026,.018],[-.19,.022,.027,.019],[-.06,.022,.027,.019]],{segments:12,x,z:.142,name:'throwingToolCase'+i});
  const handle=put(torso,new T.CylinderGeometry(.012,.014,.064,8),iron,x,-.024,.145);handle.rotation.z=-.07;
  put(torso,new T.TorusGeometry(.021,.005,4,10),iron,x,.019,.145);
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
