// Isolated real UI rendering, without a WebGL world. Not gameplay evidence.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
const out='_artifacts/combat-polish';await fs.mkdir(out,{recursive:true});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 for(const mobile of [false,true]){
  await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{width:960,height:640,deviceScaleFactor:1});await page.goto('http://localhost:4173/preview/');
  await page.evaluate(async mobile=>{const T=await import('three'),{Combat}=await import('./src/combat-model.js'),{Progression}=await import('./src/progression.js'),{Campaign}=await import('./src/campaign.js'),{createCampaignView}=await import('./src/campaign-view.js');const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);const view=createCampaignView(new T.Scene(),c,()=>{});document.body.classList.toggle('touch',mobile);document.querySelector('#loading').hidden=true;document.querySelector('#hud').hidden=false;view.update();view.open();window.review={m,p,c,view};},mobile);
  assert(await page.$eval('#journal',e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await page.$$eval('.quest-card.current .quest-steps li',es=>es.length),4);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-quest-ui.png`});
  await page.evaluate(()=>{const {m,c,view}=window.review;document.querySelector('#journal').hidden=true;m.reset(3);c.data.region=3;const e=m.enemies[0];m.player.z=e.z+3;e.phase='windup';e.attackKind='slam';e.timer=1;view.update();});
  const overlap=await page.evaluate(()=>{const a=document.querySelector('#boss-bar').getBoundingClientRect();return ['#objective','#navigation-map','#action-bar'].some(id=>{const b=document.querySelector(id).getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});});assert(!overlap,'boss bar must not cover quest, minimap or character dock');await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-boss-ui.png`});
  await page.evaluate(()=>{window.review.view.celebrate();const n=document.querySelector('#notice');n.textContent='Healing draught · +65 health';n.hidden=false;});
  assert(await page.evaluate(()=>{const a=document.querySelector('#arrival').getBoundingClientRect(),b=document.querySelector('#notice').getBoundingClientRect();return a.bottom<b.top;}),'quest reward and notice must not overlap');
 }
 assert.deepEqual(errors,[]);console.log('Desktop/mobile quest checklist, boss HUD and reward/notice layout: PASS');
}finally{await browser.close();}
