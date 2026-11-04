// Preserve native form values while presenting a consistent, accessible menu.
let counter=0,opened=null,typeahead='',lastTyped=0;
let positionFrame=0;
function schedulePosition(){if(!opened||positionFrame)return;positionFrame=requestAnimationFrame(()=>{positionFrame=0;if(opened)position(opened);});}
const components=new WeakMap();
function position(component){
 const rect=component.button.getBoundingClientRect(),gap=5,margin=10;
 const viewport=window.visualViewport;
 const viewportTop=viewport?.offsetTop||0,viewportHeight=viewport?.height||innerHeight;
 const below=viewportTop+viewportHeight-rect.bottom-margin-gap,above=rect.top-viewportTop-margin-gap;
 const upward=below<140&&above>below,available=upward?above:below;
 const height=Math.max(40,Math.min(224,available));
 const width=Math.min(Math.max(rect.width,150),innerWidth-margin*2);
 const left=Math.max(margin,Math.min(rect.left,innerWidth-width-margin));
 Object.assign(component.menu.style,{width:`${width}px`,maxHeight:`${height}px`,left:`${left}px`,top:'0px'});
 const actual=Math.min(component.menu.scrollHeight,height);
 component.menu.style.top=`${upward?Math.max(viewportTop+margin,rect.top-gap-actual):rect.bottom+gap}px`;
}
function sync(component){
 const {select,button,menu}=component;
 button.querySelector('.select-value').textContent=select.selectedOptions[0]?.textContent||'Select';
 button.title=select.selectedOptions[0]?.textContent||'Select';
 button.disabled=select.disabled;
 menu.querySelectorAll('[role=option]').forEach((item,index)=>{item.setAttribute('aria-selected',String(index===select.selectedIndex));item.classList.toggle('select-highlight',index===component.active);});
 const active=menu.children[component.active];
 if(active)button.setAttribute('aria-activedescendant',active.id);
}
function close(restoreFocus=false){
 if(!opened)return;
 const current=opened;opened=null;
 if(current.menu.matches(':popover-open'))current.menu.hidePopover();
 current.menu.hidden=true;current.button.setAttribute('aria-expanded','false');current.button.removeAttribute('aria-activedescendant');
 if(restoreFocus&&current.button.isConnected)current.button.focus();
}
function open(component){
 close();opened=component;component.active=Math.max(0,component.select.selectedIndex);
 component.menu.hidden=false;component.menu.showPopover();position(component);sync(component);
 component.button.setAttribute('aria-expanded','true');
 component.menu.children[component.active]?.scrollIntoView({block:'nearest'});
}
function choose(component,index){
 const option=component.select.options[index];if(!option||option.disabled)return;
 component.select.selectedIndex=index;component.active=index;sync(component);
 component.button.removeAttribute('aria-invalid');
 component.select.dispatchEvent(new Event('input',{bubbles:true}));
 component.select.dispatchEvent(new Event('change',{bubbles:true}));close(true);
}
function upgrade(select){
 if(select.dataset.customSelect)return;
 if(!('showPopover' in HTMLElement.prototype))return;
 select.dataset.customSelect='true';
 const id=`folio-select-${++counter}`,wrapper=document.createElement('div');wrapper.className='custom-select';
 select.before(wrapper);wrapper.append(select);select.classList.add('select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const label=wrapper.closest('label');
 const button=document.createElement('button');button.type='button';button.className='select-trigger';
 button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',`${id}-menu`);
 button.setAttribute('aria-label',label?.firstChild?.textContent.trim()||select.getAttribute('aria-label')||'Select option');
 button.innerHTML='<span class="select-value"></span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>';
 const menu=document.createElement('div');menu.id=`${id}-menu`;menu.className='select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',button.getAttribute('aria-label'));menu.setAttribute('popover','manual');menu.hidden=true;
 for(const [index,option]of [...select.options].entries()){
  const item=document.createElement('div');item.id=`${id}-option-${index}`;item.className='select-option';item.setAttribute('role','option');item.setAttribute('aria-disabled',String(option.disabled));item.textContent=option.textContent;
  item.addEventListener('pointerdown',event=>event.preventDefault());item.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();choose(component,index);});menu.append(item);
 }
 const component={select,button,menu,active:select.selectedIndex};components.set(select,component);
 wrapper.append(button,menu);sync(component);
 select.addEventListener('invalid',event=>{event.preventDefault();button.setAttribute('aria-invalid','true');button.focus();open(component);});
 button.onclick=()=>opened===component?close():open(component);
 button.onkeydown=event=>{
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
   event.preventDefault();
   if(event.key==='Escape'){close(true);return;}
   if(event.key==='Enter'||event.key===' '){if(opened===component)choose(component,component.active);else open(component);return;}
   if(opened!==component){open(component);if(['ArrowDown','ArrowUp'].includes(event.key))return;}
   const direction=event.key==='ArrowUp'?-1:1;
   let next=event.key==='Home'?0:event.key==='End'?select.options.length-1:component.active+direction;
   while(next>=0&&next<select.options.length&&select.options[next].disabled)next+=direction;
   component.active=Math.max(0,Math.min(select.options.length-1,next));sync(component);menu.children[component.active]?.scrollIntoView({block:'nearest'});
  }else if(event.key==='Tab')close();
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   if(opened!==component)open(component);
   typeahead=Date.now()-lastTyped>600?event.key:typeahead+event.key;lastTyped=Date.now();
   const index=[...select.options].findIndex(option=>!option.disabled&&option.textContent.toLowerCase().startsWith(typeahead.toLowerCase()));
   if(index>=0){component.active=index;sync(component);menu.children[index]?.scrollIntoView({block:'nearest'});}
  }
 };
 select.addEventListener('change',()=>{component.active=select.selectedIndex;sync(component);});
}
const scan=root=>{if(root instanceof Element&&root.matches('select'))upgrade(root);root.querySelectorAll?.('select:not([data-custom-select])').forEach(upgrade);};
scan(document);
new MutationObserver(records=>{
 if(opened&&!opened.button.isConnected)close();
 records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof Element)scan(node);}));
}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('pointerdown',event=>{if(opened&&!opened.button.contains(event.target)&&!opened.menu.contains(event.target))close();});
document.addEventListener('close',event=>{
 if(opened&&event.target instanceof HTMLDialogElement&&!event.target.open&&event.target.contains(opened.button))close();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();event.stopPropagation();close(true);}},true);
window.addEventListener('resize',schedulePosition,{passive:true});
window.addEventListener('scroll',event=>{if(opened&&!opened.menu.contains(event.target))schedulePosition();},{capture:true,passive:true});
window.visualViewport?.addEventListener('resize',schedulePosition,{passive:true});
window.visualViewport?.addEventListener('scroll',schedulePosition,{passive:true});
