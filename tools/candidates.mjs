import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 await page.goto('http://localhost:4173/');
 const group=process.argv[2]||'wanderer';
 const groups={wanderer:['game/assets/wanderer.js','work/candidates/wanderer_profile.js','work/candidates/wanderer_panels.js'],gate:['game/assets/old_gate.js','work/candidates/gate_profile.js','work/candidates/gate_timber.js'],pine:['game/assets/pine.js','work/candidates/pine_layers.js','work/candidates/pine_needles.js']};
 Object.assign(groups,{sword:['game/assets/iron_sword.js','work/candidates/sword_forged.js','work/candidates/sword_profile.js'],axe:['game/assets/bearded_axe.js','work/candidates/axe_blocks.js','work/candidates/axe_sweep.js'],spear:['game/assets/ash_spear.js','work/candidates/spear_diamond.js','work/candidates/spear_lathe.js'],wolf:['game/assets/blighted_wolf.js','work/candidates/wolf_capsules.js','work/candidates/wolf_profiles.js'],shard:['game/assets/blighted_shard.js','work/candidates/shard_octas.js','work/candidates/shard_layers.js']});
 Object.assign(groups,{wanderer3:['game/assets/wanderer.js','work/candidates/wanderer_stage2.js','work/candidates/wanderer_profile.js'],pine3:['game/assets/pine.js','work/candidates/pine_stage2.js','work/candidates/pine_needles.js']});
 Object.assign(groups,{house:['game/assets/village_house.js','work/candidates/house_log.js','work/candidates/house_hip.js'],stall:['game/assets/market_stall.js','work/candidates/stall_curved.js','work/candidates/stall_lean.js'],well:['game/assets/village_well.js','work/candidates/well_lathe.js','work/candidates/well_square.js']});
 Object.assign(groups,{house_detail:['game/assets/village_house.js','work/candidates/house_before_detail.js','work/candidates/house_hip.js'],stall_detail:['game/assets/market_stall.js','work/candidates/stall_before_detail.js','work/candidates/stall_lean.js'],well_detail:['game/assets/village_well.js','work/candidates/well_before_detail.js','work/candidates/well_square.js']});
 Object.assign(groups,{hornbeam_detail:['game/assets/hornbeam.js','work/candidates/hornbeam_cylinders.js','work/candidates/hornbeam_clustered.js'],garden_detail:['game/assets/garden_wall.js','work/candidates/garden_profile.js','work/candidates/garden_pickets.js'],standard_detail:['game/assets/village_standard.js','work/candidates/standard_pennant.js','work/candidates/standard_frame.js']});
 Object.assign(groups,{hero_polish:['game/assets/wanderer.js','work/candidates/wanderer_profile.js','work/candidates/wanderer_panels.js'],wolf_polish:['game/assets/blighted_wolf.js','work/candidates/wolf_capsules.js','work/candidates/wolf_profiles.js'],warden_polish:['game/assets/fallen_warden.js','work/candidates/warden_revolved.js','work/candidates/warden_forged.js']});
 const files=groups[group];if(!files)throw new Error('Unknown candidate group');
 const sources=await Promise.all(files.map(f=>fs.readFile(f,'utf8')));
 const report=await page.evaluate(async ({sources,group})=>{
  const T=await import('three');document.body.innerHTML='';document.body.style.background='#303936';
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.setClearColor(0x303936);renderer.setScissorTest(true);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
  const art=group.endsWith('3')||group.endsWith('_detail')?await (await import('/src/art.js')).loadArt(renderer):null;
  const surfaces=group==='wanderer3'?(await import('/lib/surfaces.js')).applySurfaces:null;
  const rows=[];
  for(let i=0;i<sources.length;i++){
   const mod=await import(URL.createObjectURL(new Blob([sources[i]],{type:'text/javascript'})));const model=mod.default(T);if(surfaces)surfaces(T,model);if(art)art.apply(model);const scene=new T.Scene();scene.add(model);scene.add(new T.HemisphereLight(0xddeaff,0x524734,2.5));const sun=new T.DirectionalLight(0xffe1b6,3);sun.position.set(3,5,4);scene.add(sun);
   const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());let tris=0;model.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});rows.push({candidate:i,size:size.toArray(),base:bounds.min.y,tris});
   const center=bounds.getCenter(new T.Vector3()),dist=Math.max(size.y*1.75,size.x*.8);
   for(let v=0;v<5;v++){const angles=[0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4];const cam=new T.PerspectiveCamera(35,480/180,.1,100);cam.position.set(Math.sin(angles[v])*dist,center.y+size.y*.12,Math.cos(angles[v])*dist);cam.lookAt(center);renderer.setViewport(i*480,(4-v)*180,480,180);renderer.setScissor(i*480,(4-v)*180,480,180);renderer.render(scene,cam);}
  }
  return rows;
 },{sources,group});
 await fs.mkdir('_artifacts',{recursive:true});await page.screenshot({path:`_artifacts/${group}-candidates.png`});await fs.writeFile(`_artifacts/${group}-candidates.json`,JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
