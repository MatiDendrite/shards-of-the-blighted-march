export function createInput(canvas) {
  const keys=new Set(), touch={x:0,y:0}, pointer={x:0,y:0,active:false};
  const stick=document.querySelector('#stick'), knob=document.querySelector('#stick-knob');
  let finger=null;
  const isTouch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  document.body.classList.toggle('touch',isTouch);
  window.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  function clear(){keys.clear();touch.x=touch.y=0;finger=null;knob.style.transform='';}
  window.addEventListener('blur',clear);
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointer.x=e.clientX/innerWidth*2-1;pointer.y=1-e.clientY/innerHeight*2;pointer.active=true;});
  function update(e){const r=stick.getBoundingClientRect(),limit=r.width*.34;let x=(e.clientX-r.left-r.width/2)/limit,y=(e.clientY-r.top-r.height/2)/limit;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}touch.x=x;touch.y=y;knob.style.transform=`translate(${x*limit}px,${y*limit}px)`;}
  stick.addEventListener('pointerdown',e=>{if(finger!==null)return;finger=e.pointerId;stick.setPointerCapture(finger);update(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===finger)update(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===finger){finger=null;touch.x=touch.y=0;knob.style.transform='';}});
  return {pointer,isTouch,clear,read(){let x=touch.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));let z=touch.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}return {x,z};}};
}
