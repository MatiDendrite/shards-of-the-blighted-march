// Constructor-built volume study: open hood, sculpted face and folded split robe.
// Anatomy is shaped with continuous cross-sections; the combat rig stays intact.
export default function generate(T){
 const root=new T.Group(),frame=new T.Group();root.add(frame);
 const material=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:metalness?.58:.9,metalness,side:T.DoubleSide}),{name});
 const cloth=material('fabric',0x414c62),under=material('fabric',0x626d73),shadow=material('fabric',0x252c35),thread=material('fabric',0x9d967d),leather=material('leather',0x493c32),brass=material('metal',0x9b865d,.55),skin=material('skin',0xbda087),hair=material('hair',0x68655e),lip=material('skin',0x957b6a),eyeWhite=material('eyes',0xbebfb4),iris=material('eyes',0x41483f);
 const put=(parent,geometry,m,x=0,y=0,z=0,name='')=>{const mesh=new T.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.name=name;parent.add(mesh);return mesh;};
 const joint=(name,x,y,z,parent=frame)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const ell=(parent,m,x,y,z,w,h,d)=>{const mesh=put(parent,new T.SphereGeometry(1,12,8),m,x,y,z);mesh.scale.set(w,h,d);return mesh;};
 function block(parent,m,x,y,z,w,h,d){
  const s=new T.Shape([new T.Vector2(-w/2,-h/2),new T.Vector2(w/2,-h/2),new T.Vector2(w/2,h/2),new T.Vector2(-w/2,h/2)]);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});g.translate(0,0,-d/2);return put(parent,g,m,x,y,z);
 }
 function cord(parent,m,points,radius=.004,segments=16){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return put(parent,new T.TubeGeometry(path,segments,radius,5,false),m);
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
  const side=s<0?'left':'right',leg=joint(side+'Leg',s*.113,.91,0),shin=joint(side+'Shin',0,-.39,0,leg),foot=joint(side+'Foot',0,-.435,.065,shin),arm=joint(side+'Arm',s*.25,1.43,0),fore=joint(side+'Forearm',0,-.27,0,arm);
  limbs[side]={leg,shin,foot,arm,fore};
  loft(foot,leather,[[-.069,.068,.139,.073],[-.05,.087,.161,.08],[-.006,.091,.167,.079],[.034,.078,.136,.073],[.073,.052,.066,.058]],{segments:24,name:side+'Boot'});
  loft(foot,shadow,[[-.085,.068,.14,.074],[-.076,.088,.16,.081],[-.057,.088,.16,.081]],{segments:24});
  cord(foot,thread,[[-.073,-.047,.043],[-.075,-.047,.111],[0,-.047,.167],[.075,-.047,.111],[.073,-.047,.043]],.0025,18);
  loft(shin,leather,[[-.41,.058,.061,.063],[-.30,.073,.071,.07],[-.17,.076,.079,.077],[-.06,.073,.079,.077],[.012,.081,.078,.076]],{segments:20,fold:.003});
  loft(leg,shadow,[[-.40,.079,.082,.077],[-.28,.088,.088,.08],[-.13,.098,.102,.1],[.05,.098,.098,.09]],{segments:20,fold:.004});
  // Tapered sleeve volumes, not spheres stacked over cylinder forearms.
  loft(arm,cloth,[[-.295,.091,.099,.094],[-.27,.096,.104,.098],[-.16,.1,.107,.097],[-.05,.108,.108,.102],[.025,.096,.094,.09],[.076,.057,.052,.053]],{segments:24,fold:.005,thickness:.005,capTop:true,name:side+'Sleeve'});
  loft(fore,under,[[-.244,.065,.058,.06],[-.205,.081,.078,.074],[-.15,.083,.079,.078],[-.085,.076,.077,.075],[.017,.083,.084,.078]],{segments:24,fold:.006});
  loft(fore,leather,[[-.252,.071,.066,.068],[-.216,.088,.086,.082],[-.19,.092,.088,.086]],{segments:24,thickness:.008});
  // Curved palm and individually bent fingers preserve the existing grip location.
  loft(fore,skin,[[-.324,.036,.032,.024],[-.302,.048,.035,.028],[-.267,.047,.035,.027],[-.24,.034,.028,.024]],{segments:20,z:.025,shade:false,name:side+'Palm'});
  for(let finger=0;finger<4;finger++){
   const fx=(finger-1.5)*.021,len=[.053,.063,.058,.043][finger];
   cord(fore,skin,[[fx,-.298,.035],[fx,-.327,.057],[fx,-.305-len,.045],[fx,-.314-len,.024]],.010,6);
  }
  cord(fore,skin,[[s*.042,-.26,.029],[s*.061,-.288,.055],[s*.042,-.319,.063]],.014,7);
 }
 // A fitted upper body, visible neck, and one draped shoulder cowl.
 loft(torso,cloth,[[-.13,.176,.122,.122],[-.04,.179,.129,.128],[.08,.195,.146,.14],[.20,.213,.164,.151],[.30,.212,.153,.144],[.37,.175,.125,.119],[.405,.094,.074,.081]],{segments:36,fold:.006,name:'fittedTunic'});
 loft(torso,skin,[[.37,.058,.056,.052],[.43,.06,.058,.053],[.51,.066,.06,.058]],{segments:24,shade:false});
 const shawlRows=[[.245,.288,.163,.168],[.27,.315,.178,.176],[.315,.31,.18,.177],[.37,.256,.155,.155],[.418,.172,.108,.114],[.455,.103,.088,.09]];
 const shawl=loft(torso,under,shawlRows,{segments:40,start:.35,arc:Math.PI*2-.70,fold:.007,thickness:.012,drop:.025,name:'shoulderCowl'});
 cord(torso,thread,Array.from({length:29},(_,i)=>shawl.point(0,i/28*40)),.004,40);
 for(const i of [0,40])cord(torso,thread,shawlRows.map((_,j)=>shawl.point(j,i)),.004,16);
 loft(torso,leather,[[-.087,.185,.142,.139],[-.075,.188,.145,.143],[-.024,.188,.145,.143],[-.016,.184,.14,.138]],{segments:36,thickness:.008});
 block(torso,brass,.015,-.05,.154,.069,.055,.019);block(torso,leather,.015,-.05,.168,.042,.031,.008);
 // Two continuous half-shells wrap around the hips; their split follows the legs.
 for(const s of [-1,1]){
  const leg=limbs[s<0?'left':'right'].leg,rows=[[-.64,.327,.245,.232],[-.57,.32,.236,.229],[-.46,.303,.22,.217],[-.34,.277,.205,.193],[-.22,.251,.19,.177],[-.09,.228,.173,.156],[.045,.208,.146,.144],[.15,.19,.13,.133]];
  const robe=loft(leg,cloth,rows,{segments:32,start:s<0?Math.PI+.045:.045,arc:Math.PI-.09,fold:.014,thickness:.009,x:-s*.113,name:s<0?'leftRobe':'rightRobe'});
  cord(leg,thread,Array.from({length:25},(_,i)=>robe.point(0,i/24*32)),.004,32);
  for(const edge of [0,32])cord(leg,thread,rows.map((_,j)=>robe.point(j,edge)),.0045,20);
 }
 // The face has a jaw, cheek bones, sockets and a projecting nose, not a mask slit.
 const face=loft(head,skin,[[-.153,.038,.072,.058],[-.13,.069,.104,.07],[-.092,.095,.118,.09],[-.045,.116,.119,.107],[.014,.119,.105,.119],[.07,.119,.108,.123],[.125,.109,.104,.111],[.174,.077,.07,.086],[.192,.008,.015,.019]],{segments:36,shade:false,name:'sculptedFace'});
 const fp=face.mesh.geometry.attributes.position;
 for(let i=0;i<fp.count;i++){
  const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);
  if(z>0){const cheek=Math.exp(-(((Math.abs(x)-.075)/.031)**2)-((y+.033)/.037)**2),socket=Math.exp(-(((Math.abs(x)-.047)/.026)**2)-((y-.025)/.024)**2);fp.setZ(i,z+cheek*.013-socket*.010);face.mesh.geometry.attributes.color.setXYZ(i,1-socket*.06,1-cheek*.055-socket*.06,1-cheek*.09-socket*.06);}
 }
 face.mesh.geometry.computeVertexNormals();closeNormals(face.mesh.geometry,9,36);
 loft(head,skin,[[-.070,.019,.142,.112],[-.058,.024,.160,.11],[-.041,.018,.157,.105],[.001,.013,.13,.104],[.032,.01,.112,.102]],{segments:20,shade:false,name:'nose'});
 for(const s of [-1,1]){
  ell(head,lip,s*.018,-.066,.143,.007,.003,.007);
  ell(head,eyeWhite,s*.047,.021,.103,.023,.008,.007);
  ell(head,iris,s*.047,.021,.109,.0055,.0055,.002);
  cord(head,skin,[[s*.025,.023,.108],[s*.047,.031,.111],[s*.071,.022,.098]],.0035,9);
  cord(head,lip,[[s*.025,.019,.108],[s*.047,.014,.110],[s*.071,.02,.098]],.0025,9);
  cord(head,hair,[[s*.024,.048,.113],[s*.048,.052,.115],[s*.077,.043,.098]],.0045,10);
  ell(head,skin,s*.115,-.01,-.001,.019,.043,.022);
  cord(head,hair,[[s*.112,.10,.022],[s*.118,.026,.034],[s*.11,-.049,.057]],.012,12);
 }
 cord(head,lip,[[-.029,-.101,.119],[0,-.099,.131],[.029,-.101,.119]],.0032,12);
 cord(head,skin,[[-.026,-.109,.117],[0,-.111,.125],[.026,-.109,.117]],.0035,12);
 loft(head,hair,[[-.189,.018,.095,.07],[-.173,.043,.12,.092],[-.146,.067,.125,.09],[-.126,.085,.124,.087],[-.10,.094,.113,.08],[-.075,.099,.108,.08]],{segments:28,start:-1.28,arc:2.56,fold:.0025,name:'shortBeard'});
 for(const s of [-1,1])cord(head,hair,[[s*.003,-.088,.146],[s*.022,-.092,.139],[s*.043,-.106,.117]],.008,10);
 loft(head,hair,[[.104,.122,.12,.13],[.125,.121,.116,.123],[.174,.088,.081,.097],[.192,.021,.028,.032],[.201,.005,.009,.01]],{segments:32,fold:.0015,name:'hairline'});
 // Hood lining and rolled opening cast actual shade around the face.
 const hoodRows=[[-.19,.148,.124,.139],[-.10,.171,.149,.154],[.015,.177,.154,.158],[.105,.172,.155,.158],[.188,.133,.139,.137],[.232,.068,.083,.09],[.246,.01,.012,.017]];
 const hood=loft(head,cloth,hoodRows,{segments:36,start:.82,arc:Math.PI*2-1.64,fold:.004,thickness:.012,z:-.005,name:'openHood'});
 for(const i of [0,36])cord(head,thread,hoodRows.map((_,j)=>hood.point(j,i)),.005,26);
 // One cloth mantle with shaped folds and an attached hem, rather than a flat board.
 const mantle=joint('mantle',0,.405,-.158,torso),capeRows=[[-1.02,.303,.085,.143],[-.94,.294,.082,.14],[-.79,.28,.073,.127],[-.61,.257,.064,.103],[-.42,.225,.054,.078],[-.22,.193,.045,.052],[0,.124,.03,.042]];
 const cape=loft(mantle,cloth,capeRows,{segments:32,start:Math.PI/2,arc:Math.PI,fold:.012,thickness:.009,name:'foldedMantle'});
 cord(mantle,thread,Array.from({length:25},(_,i)=>cape.point(0,i/24*32)),.004,32);
 for(const i of [0,32])cord(mantle,thread,capeRows.map((_,j)=>cape.point(j,i)),.004,24);
 // A shoulder-to-hip strap, worn book and clasp give the layers a construction logic.
 cord(torso,leather,[[.18,.32,.137],[.113,.21,.183],[.022,.065,.174],[-.097,-.06,.153],[-.212,-.16,.09]],.017,24);
 const book=joint('grimoire',-.234,-.197,.01,torso);book.rotation.set(.10,.12,-.19);
 const paper=material('paper',0xbcaf90);block(book,paper,0,0,0,.135,.234,.065);
 for(const z of [-.044,.044]){
  block(book,leather,0,0,z,.161,.265,.017);
  for(const s of [-1,1])for(const y of [-.108,.108])block(book,brass,s*.060,y,z+Math.sign(z)*.011,.026,.027,.006);
 }
 block(book,leather,-.075,0,0,.02,.267,.103);block(book,brass,.02,0,.058,.059,.026,.009);
 for(let i=0;i<4;i++)block(book,thread,0,(i-1.5)*.045,.034,.131,.003,.006);
 const gem=material('gem',0x668e9e,.2);gem.emissive.setHex(0x162e3d);gem.emissiveIntensity=.18;
 const setting=put(torso,new T.CylinderGeometry(.027,.027,.013,12),brass,.145,.337,.158);setting.rotation.x=Math.PI/2;
 const jewel=put(torso,new T.OctahedronGeometry(.022),gem,.145,.337,.17);jewel.scale.z=.5;
 // Retain the established height and rig's foot origin for all animation states.
 const bounds=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;if(o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(p.count*3).fill(1),3));for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const scale=1.85/bounds.getSize(new T.Vector3()).y;frame.scale.setScalar(scale);frame.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
 root.userData.joints={};root.traverse(o=>{if(o.isGroup&&o.name)root.userData.joints[o.name]=o;});return root;
}
