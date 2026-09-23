import {CLASSES,CLASS_IDS,SKILLS,SLOT_IDS,classInfo,skillIcon,skillDetails} from './class-data.js';

export function createClassView(model,progress,{open,close,apply}){
 const panel=document.querySelector('#class-dialog'),choices=document.querySelector('#class-choices'),details=document.querySelector('#class-skills'),confirm=document.querySelector('#class-confirm'),message=document.querySelector('#class-message');
 let selected=progress.data.classId,busy=false,returnFocus;
 const buttons=CLASS_IDS.map(id=>{
  const info=CLASSES[id],button=document.createElement('button');button.type='button';button.dataset.class=id;button.style.setProperty('--class-color',info.color);
  button.innerHTML=`<img src="${skillIcon(info.skills[2])}" alt="" width="64" height="64"><strong>${info.name}</strong><small>${info.role}</small>`;
  button.onclick=()=>{if(!busy){selected=id;render();}};choices.append(button);return button;
 });
 function render(){
  const info=classInfo(selected);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.class===selected)));
  document.querySelector('#class-description').textContent=info.description;
  details.replaceChildren(...info.skills.map((id,index)=>{const s=SKILLS[id],item=document.createElement('article');item.innerHTML=`<img src="${skillIcon(id)}" alt="" width="64" height="64"><div><h3><kbd>${index+1}</kbd> ${s.name}</h3><small>${s.cost} stamina · ${s.cooldown}s cooldown${s.damage?` · ${s.damage} base damage`:''}</small><p>${s.description}</p></div>`;return item;}));
  const current=selected===progress.data.classId;confirm.disabled=busy||current||!model.canChangeClass();confirm.textContent=busy?'Preparing character…':current?'Current class':`Become a ${info.name}`;
  message.textContent=busy?'Loading the character. Your current class is kept until it is ready.':!model.canChangeClass()?'Return to a settlement and finish any active attack, projectile or poison effect to change class.':'Equipment, gold, level and quests are kept. Health, stamina and cooldowns do not reset.';
 }
 function refresh(){const info=classInfo(progress.data.classId);document.querySelector('#class-name').textContent=info.name;document.querySelector('#welcome-class-name').textContent=info.name;document.querySelector('#class-button').setAttribute('aria-label',`${info.name} · view classes and skills (K)`);document.documentElement.dataset.playerClass=progress.data.classId;}
 function show(){if(busy||!open())return;returnFocus=document.activeElement;selected=progress.data.classId;panel.hidden=false;render();buttons[CLASS_IDS.indexOf(selected)].focus();}
 function hide(resume=true){if(panel.hidden||busy)return false;panel.hidden=true;close(resume);if(resume&&returnFocus?.isConnected)returnFocus.focus();return true;}
 confirm.onclick=async()=>{if(confirm.disabled)return;busy=true;render();try{if(await apply(selected)){refresh();busy=false;hide();}else{busy=false;render();}}catch{busy=false;render();message.textContent='The character could not load. Your previous class and save are unchanged. Try again.';}};
 document.querySelector('#class-close').onclick=()=>hide();document.querySelector('#class-button').onclick=show;document.querySelector('#welcome-class').onclick=show;
 panel.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const all=[...panel.querySelectorAll('button:not(:disabled)')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 refresh();return{open:show,close:hide,refresh,get busy(){return busy;}};
}

export function createSkillHud(){
 let current='';const buttons=SLOT_IDS.map(id=>document.querySelector(`#${id}`));
 for(const b of buttons){const image=document.createElement('img');image.alt='';image.width=image.height=56;image.className='skill-art';const shade=document.createElement('i');shade.className='skill-shade';shade.setAttribute('aria-hidden','true');b.prepend(image,shade);}
 const controls=buttons.map(button=>({button,image:button.querySelector('img'),name:button.querySelector('span'),cost:button.querySelector('small'),percent:null,unavailable:null}));
 return p=>{
  const info=classInfo(p.classId);
  if(current!==p.classId){current=p.classId;controls.forEach(({button:b,image,name},i)=>{const id=info.skills[i],s=SKILLS[id];b.dataset.skill=id;image.src=skillIcon(id);name.textContent=s.name;b.title=`${i+1} · ${skillDetails(id)}`;b.setAttribute('aria-label',`${i+1}: ${skillDetails(id)}`);});}
  controls.forEach((control,i)=>{const b=control.button,id=info.skills[i],s=SKILLS[id],remaining=p.cooldowns[id],unavailable=remaining>0||p.stamina<s.cost||p.hp<=0;
   const label=remaining>0?`${Math.ceil(remaining)}s`:`${s.cost} stamina`;if(control.cost.textContent!==label)control.cost.textContent=label;
   if(control.unavailable!==unavailable){control.unavailable=unavailable;b.classList.toggle('unavailable',unavailable);b.setAttribute('aria-disabled',String(unavailable));}
   const percent=Math.round(Math.min(1,remaining/s.cooldown)*100);if(control.percent!==percent){control.percent=percent;b.style.setProperty('--cooldown',`${percent}%`);}
  });
 };
}
