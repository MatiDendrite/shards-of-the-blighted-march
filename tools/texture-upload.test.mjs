// Compare the optimized bitmap upload with the HTML-image fallback on the GPU.
// Same authored files, UV orientation and alpha: no re-encoding or resized art.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{loadArt}=await import('./src/art.js'),renderer=new T.WebGLRenderer({antialias:false}),target=new T.WebGLRenderTarget(128,128),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;renderer.setSize(128,128);renderer.setRenderTarget(target);
  const optimized=await loadArt(renderer),nativeBitmap=window.createImageBitmap;let fallback;
  try{window.createImageBitmap=undefined;fallback=await loadArt(renderer);}finally{window.createImageBitmap=nativeBitmap;}
  const read=(art,name)=>{const material=new T.MeshStandardMaterial();material.name=name==='meadow'?'ground':name;const model=new T.Mesh(new T.PlaneGeometry(2,2),material);art.apply(model);let texture=model.material.map;if(name==='meadow'){art.finish(model);const shader={uniforms:{},vertexShader:'',fragmentShader:''};model.material.onBeforeCompile(shader);texture=shader.uniforms.uMeadow.value;}assertBitmap(texture);const quad=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:texture,transparent:true}));scene.add(quad);renderer.setClearColor(0x000000,0);renderer.render(scene,camera);const pixels=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);scene.remove(quad);quad.geometry.dispose();quad.material.dispose();return pixels;};
  function assertBitmap(texture){if(!texture?.image?.width)throw Error('Missing texture pixels');}
  const reports=[];
  for(const name of ['ground','stone','needles','leaves','timber','plaster','meadow']){const a=read(optimized,name),b=read(fallback,name);let total=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);}reports.push({name,meanDifference:total/a.length,maxDifference:max});}
  target.dispose();renderer.dispose();return reports;
 });console.log(result);assert(result.every(r=>r.meanDifference<.5),'bitmap upload must preserve texture orientation, colour and alpha');
}finally{await browser.close();}
