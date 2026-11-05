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
let appliedColor='';
export function applyAppearance(data){
 const color=selectedSummaryColor(data),style=document.documentElement.style;
 const mode='dark',key=color.id;
 if(appliedColor===key)return;
 const hue=colorParts(color.end).hue;
 for(const hex of themeTokens)style.setProperty('--theme-'+hex.slice(1),color.id==='green'&&mode==='dark'?hex:themedColor(hex,hue,mode));
 style.setProperty('--summary-start',color.start);style.setProperty('--summary-end',color.end);style.setProperty('--summary-border',color.border);
 document.documentElement.dataset.displayMode=mode;style.colorScheme=mode;
 appliedColor=key;
}
export function appearanceView(data){
 const selected=selectedSummaryColor(data);
 return `<section class="settings-updates settings-appearance" aria-labelledby="appearance-title"><h2 id="appearance-title">Appearance</h2><p class="settings-appearance-description">Choose a color theme for the whole app.</p><div class="settings-color-options" role="group" aria-label="App color theme">${summaryColors.map(color=>`<button type="button" data-summary-color="${color.id}" aria-pressed="${selected.id===color.id}" class="settings-color-option"><span class="settings-color-swatch settings-swatch-${color.id}" aria-hidden="true"></span>${color.name}</button>`).join('')}</div><div class="settings-color-preview"><span>Theme preview</span><strong>₱0.00</strong></div><p id="appearance-status" role="status" aria-live="polite"></p></section>`;
}
export function bindAppearance({data,persist}){
 const root=document.querySelector('.settings-appearance');if(!root)return;
 let current=data,saving=false;
 root.onclick=async event=>{
  const button=event.target.closest('[data-summary-color]');if(!button||saving)return;
  const color=summaryColors.find(item=>item.id===button.dataset.summaryColor);if(!color)return;
  saving=true;const buttons=[...root.querySelectorAll('[data-summary-color]')],status=root.querySelector('#appearance-status');
  buttons.forEach(item=>item.disabled=true);status.textContent='';
  try{const next=await persist(preferencesAction(current,{summaryColor:color.id}));current=next;applyAppearance(next);root.querySelectorAll('[data-summary-color]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.summaryColor===selectedSummaryColor(next).id)));status.textContent=`${color.name} selected`;}catch{status.textContent='Could not save your appearance. Please try again.';}
  finally{saving=false;buttons.forEach(item=>item.disabled=false);}
 };
}
