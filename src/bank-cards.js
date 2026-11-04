import {appearanceAction} from './record-actions.js';
import {providers,normalizeProvider} from './card-providers.js';
export {providers} from './card-providers.js';
let artwork={};
try { artwork=import.meta.glob('./assets/card-art/*.svg',{query:'?raw',import:'default',eager:true}); } catch { /* Plain-card fallback for renderers without Vite. */ }
let artworkSequence=0;
function inlineArtwork(provider){
 if(provider==='folio'||provider==='gcash')return '';
 const svg=artwork[`./assets/card-art/${provider}.svg`];
 if(!svg)return '';
 const prefix=`wallet-art-${++artworkSequence}-`;
 // Inline SVG IDs must be unique when multiple wallet cards share a page.
 return svg.replaceAll('id="',`id="${prefix}`).replaceAll('url(#',`url(#${prefix}`);
}
function silverChip(){
 const gradient=`silver-chip-${++artworkSequence}`;
 return `<svg viewBox="0 0 38 29" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${gradient}" x2="1" y2="1"><stop stop-color="#f0f1e9"/><stop offset=".45" stop-color="#b8bdbd"/><stop offset=".7" stop-color="#e7e8e0"/><stop offset="1" stop-color="#a3abad"/></linearGradient></defs><rect x=".4" y=".4" width="37.2" height="28.2" rx="5" fill="url(#${gradient})" stroke="#777e83" stroke-width=".7"/><path d="M0 9h12m14 0h12M0 20h12m14 0h12M12 0v7l3 3v9l-3 3v7M26 0v7l-3 3v9l3 3v7M15 10h8m-8 9h8" stroke="#92989b" stroke-width=".8"/></svg>`;
}
export function providerFor(wallet){return normalizeProvider(wallet.provider)||providers.find(([id,label])=>id!=='folio'&&String(wallet.name||'').toLowerCase().includes(label.toLowerCase()))?.[0]||'folio';}
export function providerOptions(selected=''){return `${selected?'':'<option value="" disabled selected>Choose card design</option>'}${providers.map(([id,label])=>`<option value="${id}" ${normalizeProvider(selected)===id?'selected':''}>${label}</option>`).join('')}`;}
function networkMark(network){
 if(!['visa','mastercard'].includes(network))return '';
 return `<span class="bank-network network-${network}" aria-label="${network==='mastercard'?'Mastercard':'Visa'}">${network==='mastercard'?'<i></i><i></i>':'VISA'}</span>`;
}
export function bankCards(wallets,{escape,money}){return wallets.map(w=>{
 const provider=providerFor(w),label=providers.find(([id])=>id===provider)[1],art=inlineArtwork(provider);
 const network=['visa','mastercard'].includes(w.network)?w.network:'folio';
 return `<article class="wallet-card bank-card bank-${provider} ${art?'vector-card':'plain-card'}" data-wallet-id="${escape(w.id)}" title="${escape(w.name)}"><div class="bank-art" aria-hidden="true">${art}</div><div class="bank-card-header"><p class="bank-brand">${label}</p><button class="bank-options" data-card-options="${escape(w.id)}" aria-label="Options for ${escape(w.name)}" title="Wallet options">•••</button></div><span class="bank-chip silver-chip" aria-hidden="true">${silverChip()}</span><div class="bank-card-bottom"><div class="bank-balance"><small>${w.kind==='liability'?'OUTSTANDING BALANCE':'BALANCE'}</small><h2>${money(w.balance)}</h2><span class="bank-wallet-name">${escape(w.name)}</span></div>${networkMark(network)}</div></article>`;
 }).join('');}

export function bindBankOptions({data,persist,render,escape,openTransaction}){
 document.querySelectorAll('[data-card-options]').forEach(button=>button.onclick=e=>{
  e.stopPropagation();const wallet=data.wallets.find(w=>w.id===button.dataset.cardOptions),modal=document.querySelector('#modal');
  modal.classList.add('compact-wallet-dialog');
  modal.innerHTML=`<form id="card-options-form"><div class="section-head"><h3>${escape(wallet.name)}</h3><button class="close-button" type="button" id="close-card-options" aria-label="Close">×</button></div><p class="modal-subtitle">Customize your wallet card.</p><label>Card design<select name="provider">${providerOptions(providerFor(wallet))}</select></label><label>Card network<select name="network"><option value="folio">None</option><option value="mastercard" ${wallet.network==='mastercard'?'selected':''}>Mastercard</option><option value="visa" ${wallet.network==='visa'?'selected':''}>Visa</option></select></label><p id="card-error" role="alert"></p><button class="primary-button submit" type="submit">Save appearance</button><button class="card-transaction-button" type="button" id="card-add-transaction">Add transaction</button></form>`;
  modal.showModal();modal.onclick=event=>{if(event.target===modal)modal.close();};document.querySelector('#close-card-options').onclick=()=>modal.close();
  document.querySelector('#card-add-transaction').onclick=()=>{modal.close();openTransaction(wallet.id);};
  document.querySelector('#card-options-form').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target),submit=event.target.querySelector('[type=submit]');submit.disabled=true;try{await persist(appearanceAction(data,wallet.id,{provider:form.get('provider'),network:form.get('network')}));modal.close();render();}catch{submit.disabled=false;document.querySelector('#card-error').textContent='Could not save. Please try again.';}};
 });
}
