// Test-only state placement for save fixtures and model tests. Real-input
// playtests must walk to portals instead of calling this helper.
import {portalsFor} from '../game/src/world-map.js';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
export function travelFixture(campaign,destination){
 if(!Number.isInteger(destination)||destination<0||destination>3)return false;
 while(campaign.region!==destination){
  const next=campaign.region+Math.sign(destination-campaign.region);
  const portal=portalsFor(campaign.region).find(p=>p.destination===next);
  if(!portal)return false;
  Object.assign(campaign.combat.player,{x:portal.x,z:portal.z});
  if(!campaign.travel(next))return false;
 }
 return true;
}
// Visual-only region review fixture, never a claim of native-input travel.
export async function loadRegionFixture(page,saved,region){
 const model=new Combat(),progress=new Progression(saved),campaign=new Campaign(progress,model);progress.restore(model);
 if(!travelFixture(campaign,region))throw Error('Fixture cannot reach region');
 const next=progress.snapshot(model);if(!validSave(next))throw Error('Invalid region fixture');
 await page.evaluate((key,data)=>localStorage.setItem(key,JSON.stringify(data)),SAVE_KEY,next);
 await page.reload();await page.waitForFunction(()=>window.__READY__,{timeout:90000});
 if(page.viewport().isMobile)await page.tap('#startb');else await page.click('#startb');
 await page.waitForFunction(()=>window.__GAME__.started);
 if(campaign.complete&&region===3){await page.waitForSelector('#victory:not([hidden])');await page.click('#explore');}
}
