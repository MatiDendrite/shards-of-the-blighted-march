export function createInput(canvas) {
  const keys=new Set(), attacks=new Set(), actions=[],touch={x:0,y:0},pointer={x:0,y:0,active:false};
  const stick=document.querySelector('#stick'),knob=document.querySelector('#stick-knob');let finger=null;
  const isTouch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  document.body.classList.toggle('touch',isTouch);
  if(isTouch)document.querySelector('.intro-controls').textContent='Move with the left joystick. Hold Attack to strike. Use the right-side buttons to dodge, switch weapons and cast skills.';
  const mapped={Space:'dodge',Digit1:'cleave',Digit2:'slam',Digit3:'cry',KeyR:'weapon',KeyQ:'potion'};
  window.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF',...Object.keys(mapped)].includes(e.code))e.preventDefault();
    if(!e.repeat&&mapped[e.code])actions.push(mapped[e.code]);
    if(e.code==='KeyF')attacks.add('keyboard');keys.add(e.code);
  });
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')attacks.delete('keyboard');});
  function clear(){keys.clear();attacks.clear();actions.length=0;touch.x=touch.y=0;finger=null;knob.style.transform='';}
  window.addEventListener('blur',clear);
  function point(e){if(e.pointerType==='touch')return;pointer.x=e.clientX/innerWidth*2-1;pointer.y=1-e.clientY/innerHeight*2;pointer.active=true;}
  canvas.addEventListener('pointermove',point);
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;point(e);attacks.add(e.pointerId);canvas.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>attacks.delete(e.pointerId));
  function update(e){const r=stick.getBoundingClientRect(),limit=r.width*.34;let x=(e.clientX-r.left-r.width/2)/limit,y=(e.clientY-r.top-r.height/2)/limit;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}touch.x=x;touch.y=y;knob.style.transform=`translate(${x*limit}px,${y*limit}px)`;}
  stick.addEventListener('pointerdown',e=>{if(finger!==null)return;finger=e.pointerId;stick.setPointerCapture(finger);update(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===finger)update(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===finger){finger=null;touch.x=touch.y=0;knob.style.transform='';}});
  for(const button of document.querySelectorAll('[data-action]')){
    if(button.dataset.action==='attack'){
      button.addEventListener('pointerdown',e=>{attacks.add(e.pointerId);button.setPointerCapture(e.pointerId);e.preventDefault();});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>attacks.delete(e.pointerId));
      button.addEventListener('click',e=>{if(e.detail===0)actions.push('attack');});
    }else button.addEventListener('click',()=>{actions.push(button.dataset.action);button.blur();});
  }
  return {pointer,isTouch,clear,consume:()=>actions.splice(0),read(){let x=touch.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));let z=touch.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}return {x,z,attack:attacks.size>0};}};
}
