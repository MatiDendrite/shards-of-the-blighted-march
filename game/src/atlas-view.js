import {mapView,unproject,mapLocations} from './cartography.js';
import {drawMap} from './map-renderer.js';
import {MAPS,TOWN} from './world-map.js';

export function createAtlasView(combat,progress,campaign,callbacks){
 const $=s=>document.querySelector(s),panel=$('#atlas-dialog'),canvas=$('#atlas-canvas');
 let view=mapView(),drag=null,returnFocus=null,region=-1;
 function draw(){
  if(panel.hidden)return;
  const size=Math.round(Math.min(1200,canvas.clientWidth*Math.min(devicePixelRatio,2)));
  if(!size)return;if(canvas.width!==size)canvas.width=canvas.height=size;
  drawMap(canvas,{region:campaign.region,combat,progress,view,detailed:true});
  $('#atlas-zoom').textContent=`${view.zoom.toFixed(1)}×`;
  $('#atlas-out').disabled=view.zoom<=1;$('#atlas-in').disabled=view.zoom>=4;
  $('#atlas-position').textContent=`You: ${combat.player.x.toFixed(0)}, ${combat.player.z.toFixed(0)} · 120 × 120 m region · North up`;
  canvas.dataset.zoom=view.zoom;canvas.dataset.center=`${view.x.toFixed(2)},${view.z.toFixed(2)}`;
 }
 function center(x,z,zoom=3){view=mapView(zoom,x,z);draw();}
 function zoomBy(factor,point){
  const rect=canvas.getBoundingClientRect(),p=point||{x:rect.width/2,y:rect.height/2};
  const before=unproject(p.x,p.y,rect.width,view),next=mapView(view.zoom*factor,view.x,view.z),after=unproject(p.x,p.y,rect.width,next);
  view=mapView(next.zoom,next.x+before.x-after.x,next.z+before.z-after.z);draw();
 }
 function close(restoreFocus=true){
  if(panel.hidden)return;panel.hidden=true;drag=null;canvas.classList.remove('dragging');callbacks.close();
  if(restoreFocus&&returnFocus?.isConnected&&!returnFocus.closest('[hidden]'))returnFocus.focus({preventScroll:true});
 }
 function open(){
  if(!panel.hidden){close();return;}
  const previous=document.activeElement;if(!callbacks.open())return;
  returnFocus=previous;panel.hidden=false;
  if(region!==campaign.region){region=campaign.region;view=mapView();}
  $('#atlas-title').textContent=MAPS[region].town+' & the surrounding wilds';
  $('#atlas-locations').replaceChildren(...mapLocations(region).map(p=>{const b=document.createElement('button');b.type='button';b.dataset.location=p.id;const name=document.createElement('strong'),detail=document.createElement('small');name.textContent=`${p.symbol?p.symbol+' · ':''}${p.name}`;detail.textContent=p.detail;b.append(name,detail);b.onclick=()=>center(p.x,p.z);return b;}));
  draw();$('#atlas-close').focus({preventScroll:true});
 }
 $('#map-button').onclick=open;$('#atlas-close').onclick=()=>close();
 $('#atlas-in').onclick=()=>zoomBy(1.4);$('#atlas-out').onclick=()=>zoomBy(1/1.4);
 $('#atlas-full').onclick=()=>center(0,0,1);$('#atlas-town').onclick=()=>center(TOWN.x,TOWN.z);$('#atlas-player').onclick=()=>center(combat.player.x,combat.player.z);
 canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoomBy(e.deltaY<0?1.15:1/1.15,{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
 // Keep a chart drag out of the browser's page-scroll gesture recognizer.
 canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,view};canvas.classList.add('dragging');});
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const scale=128/(canvas.clientWidth*drag.view.zoom);view=mapView(drag.view.zoom,drag.view.x-(e.clientX-drag.x)*scale,drag.view.z-(e.clientY-drag.y)*scale);draw();});
 const release=()=>{drag=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 panel.addEventListener('keydown',e=>{
  if(e.code==='Tab'){const controls=[...panel.querySelectorAll('button:not(:disabled),canvas')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
  if(['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(e.code)){e.preventDefault();zoomBy(['Equal','NumpadAdd'].includes(e.code)?1.4:1/1.4);}
  if(e.code.startsWith('Arrow')){e.preventDefault();const step=8/view.zoom;view=mapView(view.zoom,view.x+(e.code==='ArrowRight'?step:e.code==='ArrowLeft'?-step:0),view.z+(e.code==='ArrowDown'?step:e.code==='ArrowUp'?-step:0));draw();}
 });
 new ResizeObserver(draw).observe(canvas);
 return {open,close};
}
