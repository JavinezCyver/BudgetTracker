import {preferencesAction} from './record-actions.js';
import {themeTokens} from './theme-tokens.js';
import {colorParts,themedColor} from './theme-colors.js';
export const summaryColors=[
 {id:'green',name:'Green',start:'#2f6518',end:'#74a24f',border:'#4b7835'},
 {id:'blue',name:'Blue',start:'#153c76',end:'#356bbb',border:'#3a6eaa'},
 {id:'purple',name:'Purple',start:'#492865',end:'#7951a1',border:'#805ca0'},
 {id:'teal',name:'Teal',start:'#164b48',end:'#287e78',border:'#398880'},
 {id:'rose',name:'Rose',start:'#682b46',end:'#a04467',border:'#ad607d'},
 {id:'amber',name:'Amber',start:'#5d4216',end:'#8c631e',border:'#a17b3b'},
];
export const selectedSummaryColor=data=>summaryColors.find(color=>color.id===data.preferences?.summaryColor)||summaryColors[0];
export const selectedDisplayMode=data=>data.preferences?.displayMode==='light'?'light':'dark';
let appliedColor='';
export function applyAppearance(data){
 const color=selectedSummaryColor(data),style=document.documentElement.style;
 const mode=selectedDisplayMode(data),key=`${color.id}:${mode}`;
 if(appliedColor===key)return;
 const hue=colorParts(color.end).hue;
 for(const hex of themeTokens)style.setProperty('--theme-'+hex.slice(1),color.id==='green'&&mode==='dark'?hex:themedColor(hex,hue,mode));
 style.setProperty('--summary-start',color.start);style.setProperty('--summary-end',color.end);style.setProperty('--summary-border',color.border);
 document.documentElement.dataset.displayMode=mode;style.colorScheme=mode;
 appliedColor=key;
}
export function appearanceView(data){
 const selected=selectedSummaryColor(data);
 return `<section class="settings-updates settings-appearance" aria-labelledby="appearance-title"><h2 id="appearance-title">Appearance</h2><p class="settings-appearance-description">Choose a color theme for the whole app.</p><div class="settings-mode-row"><div><strong>Dark mode</strong><p data-mode-description>${selectedDisplayMode(data)==='dark'?'Dark mode is on':'Light mode is on'}</p></div><button type="button" class="settings-mode-toggle" data-toggle-mode role="switch" aria-label="Dark mode" aria-checked="${selectedDisplayMode(data)==='dark'}"><span class="settings-mode-track" aria-hidden="true"></span></button></div><div class="settings-color-options" role="group" aria-label="App color theme">${summaryColors.map(color=>`<button type="button" data-summary-color="${color.id}" aria-pressed="${selected.id===color.id}" class="settings-color-option"><span class="settings-color-swatch settings-swatch-${color.id}" aria-hidden="true"></span>${color.name}</button>`).join('')}</div><div class="settings-color-preview"><span>Theme preview</span><strong>₱0.00</strong></div><p id="appearance-status" role="status" aria-live="polite"></p></section>`;
}
export function bindAppearance({data,persist}){
 const root=document.querySelector('.settings-appearance');if(!root)return;
 let current=data,saving=false;
 root.onclick=async event=>{
  const button=event.target.closest('[data-summary-color],[data-toggle-mode]');if(!button||saving)return;
  const changingMode=button.hasAttribute('data-toggle-mode'),color=summaryColors.find(item=>item.id===button.dataset.summaryColor);if(!changingMode&&!color)return;
  const mode=selectedDisplayMode(current)==='dark'?'light':'dark';
  saving=true;const buttons=[...root.querySelectorAll('[data-summary-color],[data-toggle-mode]')],status=root.querySelector('#appearance-status');
  buttons.forEach(item=>item.disabled=true);status.textContent='';
  try{const next=await persist(preferencesAction(current,changingMode?{displayMode:mode}:{summaryColor:color.id}));current=next;applyAppearance(next);root.querySelectorAll('[data-summary-color]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.summaryColor===selectedSummaryColor(next).id)));root.querySelector('[data-toggle-mode]').setAttribute('aria-checked',String(selectedDisplayMode(next)==='dark'));root.querySelector('[data-mode-description]').textContent=selectedDisplayMode(next)==='dark'?'Dark mode is on':'Light mode is on';status.textContent=changingMode?`${mode==='dark'?'Dark':'Light'} mode selected`:`${color.name} selected`;}catch{status.textContent='Could not save your appearance. Please try again.';}
  finally{saving=false;buttons.forEach(item=>item.disabled=false);}
 };
}
