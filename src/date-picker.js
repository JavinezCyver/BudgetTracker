import {localDate,monthCells,shiftMonth} from './calendar.js';
import {manilaNow} from './app-date.js';
import {validDate} from './budget.js';

let sequence=0,opened=null,positionFrame=0;
const calendarIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/></svg>';
const arrow=direction=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="${direction<0?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
const dateFrom=value=>new Date(`${value}T12:00:00`);
function allowed(component,value){return (!component.input.min||value>=component.input.min)&&(!component.input.max||value<=component.input.max);}
function sync(component){
 const valid=validDate(component.input.value);
 component.trigger.querySelector('span').textContent=valid?dateFrom(component.input.value).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'Choose date';
 component.trigger.disabled=component.input.disabled;
 component.trigger.removeAttribute('aria-invalid');
}
function position(component){
 const viewport=window.visualViewport,topEdge=viewport?.offsetTop||0,viewportHeight=viewport?.height||innerHeight;
 const rect=component.trigger.getBoundingClientRect(),width=Math.min(248,innerWidth-20);
 Object.assign(component.popup.style,{width:`${width}px`,maxHeight:`${viewportHeight-20}px`,left:`${Math.max(10,Math.min(rect.left,innerWidth-width-10))}px`,top:'0px'});
 const height=component.popup.getBoundingClientRect().height;
 const below=topEdge+viewportHeight-rect.bottom-6;
 const preferred=below>=height||below>=rect.top-topEdge?rect.bottom+6:rect.top-height-6;
 component.popup.style.top=`${Math.max(topEdge+10,Math.min(preferred,topEdge+viewportHeight-height-10))}px`;
}
function queuePosition(){if(!opened||positionFrame)return;positionFrame=requestAnimationFrame(()=>{positionFrame=0;if(opened)position(opened);});}
function close(focus=false){
 if(!opened)return;const component=opened;opened=null;
 if(component.popup.matches(':popover-open'))component.popup.hidePopover();
 component.popup.hidden=true;component.trigger.setAttribute('aria-expanded','false');
 if(focus&&component.trigger.isConnected)component.trigger.focus();
}
function choose(component,value){
 if(!validDate(value)||!allowed(component,value))return;
 component.input.value=value;sync(component);
 component.input.dispatchEvent(new Event('input',{bubbles:true}));component.input.dispatchEvent(new Event('change',{bubbles:true}));close(true);
}
function draw(component,focus=false){
 const today=localDate(manilaNow()),{month,input,popup}=component;
 popup.innerHTML=`<header class="date-picker-header"><div><small>SELECT DATE</small><h3>${month.toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</h3></div><div class="date-picker-navigation"><button type="button" data-date-shift="-1" aria-label="Previous month">${arrow(-1)}</button><button type="button" data-date-shift="1" aria-label="Next month">${arrow(1)}</button></div></header><div class="date-picker-weekdays" aria-hidden="true">${['S','M','T','W','T','F','S'].map(day=>`<span>${day}</span>`).join('')}</div><div class="date-picker-grid" role="group" aria-label="Choose a day">${monthCells(month).map(date=>{
  const value=localDate(date);
  return `<button type="button" data-picker-date="${value}" class="${date.getMonth()!==month.getMonth()?'picker-outside ':''}${value===today?'picker-today ':''}${value===input.value?'picker-selected':''}" ${!allowed(component,value)?'disabled':''} aria-label="${date.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}" aria-pressed="${value===input.value}" ${value===today?'aria-current="date"':''} tabindex="${value===component.focusDate?0:-1}">${date.getDate()}</button>`;
 }).join('')}</div><footer class="date-picker-footer"><span>Philippine time</span><button type="button" data-picker-today ${!allowed(component,today)?'disabled':''}>Today</button></footer>`;
 popup.querySelectorAll('[data-picker-date]').forEach(button=>button.onclick=()=>choose(component,button.dataset.pickerDate));
 popup.querySelectorAll('[data-date-shift]').forEach(button=>button.onclick=()=>{
  const state=shiftMonth(component.month,component.focusDate,Number(button.dataset.dateShift));component.month=state.month;component.focusDate=state.selectedDate;draw(component);position(component);
  popup.querySelector(`[data-date-shift="${button.dataset.dateShift}"]`)?.focus();
 });
 popup.querySelector('[data-picker-today]').onclick=()=>choose(component,today);
 if(focus)popup.querySelector(`[data-picker-date="${component.focusDate}"]`)?.focus({preventScroll:true});
}
function open(component){
 close();opened=component;
 const value=validDate(component.input.value)?component.input.value:localDate(manilaNow());
 component.focusDate=value;const date=dateFrom(value);component.month=new Date(date.getFullYear(),date.getMonth(),1);
 draw(component);component.popup.hidden=false;component.popup.showPopover();component.trigger.setAttribute('aria-expanded','true');position(component);
 component.popup.querySelector(`[data-picker-date="${value}"]`)?.focus({preventScroll:true});
}
function upgrade(input){
 if(input.dataset.datePicker||!('showPopover' in HTMLElement.prototype))return;
 input.dataset.datePicker='true';const id=`folio-date-${++sequence}`;
 const wrapper=document.createElement('div');wrapper.className='date-input';input.before(wrapper);wrapper.append(input);input.classList.add('date-native');input.tabIndex=-1;input.setAttribute('aria-hidden','true');
 const trigger=document.createElement('button');trigger.type='button';trigger.className='date-trigger';trigger.innerHTML=`<span></span>${calendarIcon}`;
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-label',wrapper.closest('label')?.firstChild?.textContent.trim()||'Transaction date');
 const popup=document.createElement('div');popup.id=id;popup.className='date-picker';popup.setAttribute('popover','manual');popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Choose transaction date');popup.hidden=true;
 const component={input,trigger,popup,month:null,focusDate:''};wrapper.append(trigger,popup);sync(component);
 trigger.onclick=event=>{event.preventDefault();event.stopPropagation();opened===component?close():open(component);};
 popup.onclick=event=>{event.preventDefault();event.stopPropagation();};
 trigger.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();open(component);}};
 popup.onkeydown=event=>{
  const button=event.target.closest('[data-picker-date]');if(!button)return;
  const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
  if(!(event.key in offsets)&&!['Home','End','PageUp','PageDown'].includes(event.key))return;
  event.preventDefault();let date=dateFrom(button.dataset.pickerDate);
  if(event.key==='PageUp'||event.key==='PageDown'){
   const state=shiftMonth(component.month,button.dataset.pickerDate,event.key==='PageUp'?-1:1);date=dateFrom(state.selectedDate);
  }else date.setDate(date.getDate()+(event.key==='Home'?-date.getDay():event.key==='End'?6-date.getDay():offsets[event.key]));
  const value=localDate(date);if(!allowed(component,value))return;
  component.focusDate=value;component.month=new Date(date.getFullYear(),date.getMonth(),1);draw(component,true);position(component);
 };
 input.addEventListener('change',()=>sync(component));
 input.addEventListener('invalid',event=>{event.preventDefault();trigger.setAttribute('aria-invalid','true');open(component);});
}
function scan(root){if(root instanceof Element&&root.matches('input[type=date]'))upgrade(root);root.querySelectorAll?.('input[type=date]:not([data-date-picker])').forEach(upgrade);}
scan(document);
new MutationObserver(records=>{if(opened&&!opened.trigger.isConnected)close();for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('pointerdown',event=>{if(opened&&!opened.popup.contains(event.target)&&!opened.trigger.contains(event.target))close();});
document.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}},true);
document.addEventListener('focusin',()=>{
 // A label or the dialog's autofocus can briefly move focus while opening.
 // Inspect the settled focus rather than closing on an intermediate event.
 queueMicrotask(()=>{
  if(!opened)return;
  const active=document.activeElement;
  if(active===opened.input){opened.popup.querySelector('[data-picker-date][tabindex="0"]')?.focus({preventScroll:true});return;}
  if(!opened.popup.contains(active)&&!opened.trigger.contains(active))close();
 });
});
document.addEventListener('close',event=>{
 if(opened&&event.target instanceof HTMLDialogElement&&!event.target.open&&event.target.contains(opened.trigger))close();
},true);
window.addEventListener('resize',queuePosition,{passive:true});window.addEventListener('scroll',event=>{if(opened&&!opened.popup.contains(event.target))queuePosition();},{capture:true,passive:true});
window.visualViewport?.addEventListener('resize',queuePosition,{passive:true});window.visualViewport?.addEventListener('scroll',queuePosition,{passive:true});
