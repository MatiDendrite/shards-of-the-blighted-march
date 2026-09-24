export function createInput(canvas,{canPlay=()=>true}={}) {
  const keys=new Set(), attacks=new Set(), actions=[],touch={x:0,y:0},pointer={x:0,y:0,active:false};
  const stick=document.querySelector('#stick'),knob=document.querySelector('#stick-knob');let finger=null;
  let orbitFinger=null,cameraX=0,cameraY=0,cameraTouch=false,cameraWheel=0,cameraReset=false;
  const isTouch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  document.body.classList.toggle('touch',isTouch);
  if(isTouch)document.querySelector('.intro-controls').textContent='Move with the left joystick. Drag the world to orbit around your character. Movement always follows the current view, even while dragging. Use Attack, Dodge and skills on the right. View resets the camera.';
  const mapped={Space:'dodge',Digit1:'cleave',Digit2:'slam',Digit3:'cry',KeyR:'weapon',KeyQ:'potion'};
  window.addEventListener('keydown',e=>{
    if(!canPlay())return;
    // Leave Space/arrow keys to native inventory buttons and scrolling while paused.
    if(document.querySelector('#inventory:not([hidden]), #journal:not([hidden]), #town-dialog:not([hidden]), #atlas-dialog:not([hidden])'))return;
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF','KeyC',...Object.keys(mapped)].includes(e.code))e.preventDefault();
    if(e.code==='KeyC'&&!e.repeat)cameraReset=true;
    if(!e.repeat&&mapped[e.code])actions.push(mapped[e.code]);
    if(e.code==='KeyF')attacks.add('keyboard');keys.add(e.code);
  });
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')attacks.delete('keyboard');});
  function endOrbit(){const id=orbitFinger?.id;orbitFinger=null;canvas.classList.remove('orbiting');if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
  function clearCamera(){endOrbit();cameraX=cameraY=cameraWheel=0;cameraReset=false;pointer.active=false;}
  function clear(){keys.clear();attacks.clear();actions.length=0;touch.x=touch.y=0;const stickId=finger;finger=null;knob.style.transform='';if(stickId!==null&&stick.hasPointerCapture(stickId))stick.releasePointerCapture(stickId);clearCamera();}
  window.addEventListener('blur',clear);
  function point(e){if(e.pointerType==='touch')return;pointer.x=e.clientX/innerWidth*2-1;pointer.y=1-e.clientY/innerHeight*2;pointer.active=true;}
  function beginOrbit(e){if(orbitFinger||!canPlay())return;orbitFinger={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch'};pointer.active=false;attacks.delete(e.pointerId);canvas.setPointerCapture(e.pointerId);canvas.classList.add('orbiting');}
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(!canPlay())return;
    if(e.button===2||e.pointerType==='touch'){e.preventDefault();beginOrbit(e);return;}
    if(e.button!==0||orbitFinger)return;point(e);attacks.add(e.pointerId);canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!canPlay())return;
    if(e.pointerType!=='touch'&&(e.buttons&2)&&!orbitFinger)beginOrbit(e);
    if(orbitFinger?.id===e.pointerId){
      if(!orbitFinger.touch&&!(e.buttons&2)){endOrbit();return;}
      cameraX+=e.clientX-orbitFinger.x;cameraY+=e.clientY-orbitFinger.y;cameraTouch=orbitFinger.touch;orbitFinger.x=e.clientX;orbitFinger.y=e.clientY;return;
    }
    if(!orbitFinger)point(e);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{attacks.delete(e.pointerId);if(orbitFinger?.id===e.pointerId){endOrbit();if(event!=='pointerup')cameraX=cameraY=0;}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(canPlay())cameraWheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);},{passive:false});
  function update(e){const r=stick.getBoundingClientRect(),limit=r.width*.34;let x=(e.clientX-r.left-r.width/2)/limit,y=(e.clientY-r.top-r.height/2)/limit;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}touch.x=x;touch.y=y;knob.style.transform=`translate(${x*limit}px,${y*limit}px)`;}
  stick.addEventListener('pointerdown',e=>{if(finger!==null||!canPlay())return;finger=e.pointerId;stick.setPointerCapture(finger);update(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===finger)update(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===finger){finger=null;touch.x=touch.y=0;knob.style.transform='';}});
  for(const button of document.querySelectorAll('[data-action]')){
    if(button.dataset.action==='attack'){
      button.addEventListener('pointerdown',e=>{if(!canPlay())return;attacks.add(e.pointerId);button.setPointerCapture(e.pointerId);e.preventDefault();});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>attacks.delete(e.pointerId));
      button.addEventListener('click',e=>{if(canPlay()&&e.detail===0)actions.push('attack');});
    }else button.addEventListener('click',()=>{if(canPlay())actions.push(button.dataset.action);button.blur();});
  }
  return {pointer,isTouch,clear,clearCamera,consume:()=>actions.splice(0),consumeCamera(){const result={x:cameraX,y:cameraY,touch:cameraTouch,wheel:cameraWheel,reset:cameraReset,active:!!orbitFinger};cameraX=cameraY=cameraWheel=0;cameraReset=false;return result;},read(){let x=touch.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));let z=touch.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}return {x,z,attack:attacks.size>0};}};
}
