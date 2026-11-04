import {navigationIcons} from './sidebar-sections.js';
window.matchMedia('(max-width:760px)').addEventListener('change',event=>{if(!event.matches)document.querySelector('#mobile-more[open]')?.close();});
const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const home='<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/>';
const wallet='<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-5 4h5v4h-5Z"/>';
const otherPages=[['Calendar','calendar'],['Income','income'],['Who Owes You','people'],['Goals','goals'],['Investments','investments'],['Budget plan','budget'],['Settings','settings']];
const calendar='<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 11h18"/>';
function moreMenu(page){
 const row=([name,key])=>`<button type="button" data-page="${name}" aria-current="${page===name?'page':'false'}"><span class="more-menu-icon">${icon(key==='calendar'?calendar:navigationIcons[key])}</span><span class="more-menu-label">${name}</span><span class="more-menu-arrow" aria-hidden="true">›</span></button>`;
 return [['Everyday',otherPages.slice(0,3)],['Plan & grow',otherPages.slice(3,6)]].map(([label,pages])=>`<section class="more-menu-group"><h3>${label}</h3>${pages.map(row).join('')}</section>`).join('')+`<section class="more-menu-settings">${row(otherPages[6])}</section>`;
}
export function mobileNavigation(page){
 const mainPages=[['Dashboard',home],['Wallets',wallet],['Transactions',navigationIcons.transactions]],moreActive=otherPages.some(([name])=>name===page);
 return `<nav class="mobile-bottom-nav" aria-label="Mobile navigation">${mainPages.map(([name,path])=>`<button type="button" data-page="${name}" aria-current="${page===name?'page':'false'}">${icon(path)}<span>${name}</span></button>`).join('')}<button type="button" id="mobile-more-open" class="${moreActive?'mobile-more-active':''}" aria-label="More pages" aria-haspopup="dialog" aria-controls="mobile-more" aria-expanded="false">${icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}<span>More</span></button></nav><dialog id="mobile-more" aria-labelledby="mobile-more-title"><header><h2 id="mobile-more-title">More</h2><button type="button" id="mobile-more-close" aria-label="Close more pages">×</button></header><nav aria-label="More pages">${moreMenu(page)}</nav></dialog>`;
}
export function bindMobileNavigation(){
 const modal=document.querySelector('#mobile-more'),trigger=document.querySelector('#mobile-more-open');if(!modal||!trigger)return;
 trigger.onclick=()=>{modal.showModal();trigger.setAttribute('aria-expanded','true');};
 modal.querySelector('#mobile-more-close').onclick=()=>modal.close();
 modal.onclick=event=>{if(event.target===modal)modal.close();};
 modal.onclose=()=>trigger.setAttribute('aria-expanded','false');
}
