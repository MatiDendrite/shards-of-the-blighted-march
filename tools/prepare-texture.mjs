// Format/size conversion only. Never overwrites an existing texture.
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';
const [source,destination]=process.argv.slice(2);
if(!source||!destination?.endsWith('.webp'))throw Error('Pass a source image and a new .webp destination.');
const bytes=await fs.readFile(source),browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const encoded=await page.evaluate(async base64=>{
  const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,1024,1024);
  return canvas.toDataURL('image/webp',.88).split(',')[1];
 },bytes.toString('base64'));
 const result=Buffer.from(encoded,'base64');await fs.writeFile(destination,result,{flag:'wx'});
 console.log(`${destination}: ${result.length} bytes, 1024 × 1024`);
}finally{await browser.close();}
