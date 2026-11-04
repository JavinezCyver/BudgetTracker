const svg = paths => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const symbols={trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7"/>',filter:'<path d="M3 4h18l-7 8v7l-4 2v-9Z"/>',grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',stack:'<path d="m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>'};
let view='grid',filter='all';
export function walletHeader(){return `<header class="wallet-page-header"><div><p>POCKETPLAN</p><h1>Wallet</h1></div></header>`;}
export function walletToolbar(){return `<div class="wallet-toolbar"><p>Hold wallet to rearrange.</p><div class="wallet-view-controls"><details class="wallet-filter"><summary aria-label="Filter wallets" title="Filter wallets">${svg(symbols.filter)}</summary><div class="wallet-filter-menu">${[['all','All wallets'],['asset','Assets'],['liability','Liabilities']].map(([value,label])=>`<button data-wallet-filter="${value}" aria-pressed="${filter===value}">${label}</button>`).join('')}</div></details><div role="group" aria-label="Wallet layout">${['grid','list','stack'].map(v=>`<button data-wallet-view="${v}" aria-label="${v} view" title="${v[0].toUpperCase()+v.slice(1)} view" aria-pressed="${view===v}">${svg(symbols[v])}</button>`).join('')}</div></div></div>`;}
export const visibleWallets = wallets => wallets.filter(w=>!['assets','liabilities'].includes(w.id)&&(filter==='all'||(w.kind||'asset')===filter));
export const walletViewClass = () => `wallet-layout-${view}`;
export function bindWalletView({data,render,persist,escape}){
 document.querySelectorAll('[data-wallet-view]').forEach(b=>b.onclick=()=>{
  const next=b.dataset.walletView;if(view===next)return;view=next;
  const grid=document.querySelector('.full-wallets');
  if(grid){grid.classList.remove('wallet-layout-grid','wallet-layout-list','wallet-layout-stack');grid.classList.add(walletViewClass());}
  document.querySelectorAll('[data-wallet-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.walletView===view)));
 });
 document.querySelectorAll('[data-wallet-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.walletFilter;render();});
 bindWalletDeletion({data,render,persist,escape});
 const cards=[...document.querySelectorAll('.full-wallets .wallet-card')];
 let selected=null;
 let moving=false;
 const move=async(from,to)=>{if(from===to||moving)return;const wallets=[...data.wallets],index=wallets.findIndex(w=>w.id===from),target=wallets.findIndex(w=>w.id===to);if(index<0||target<0)return;moving=true;wallets.splice(target,0,wallets.splice(index,1)[0]);try{await persist({...data,wallets});render();}catch{moving=false;const toast=document.querySelector('#toast');toast.textContent='Could not save wallet order. Please try again.';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3000);}};
 cards.forEach(card=>{
  const id=card.dataset.walletId;let timer,startX=0,startY=0;
  card.tabIndex=0;card.draggable=true;card.setAttribute('aria-label',`${card.querySelector('p').textContent}. Hold then select another wallet to rearrange, or use Alt and arrow keys.`);
  card.ondragstart=e=>{if(e.target.closest('button')){e.preventDefault();return;}selected=id;e.dataTransfer.setData('text/plain',id);};card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();move(e.dataTransfer.getData('text/plain'),id);};
  card.onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{selected=id;cards.forEach(c=>c.classList.toggle('reordering',c===card));document.querySelector('.wallet-toolbar>p').textContent='Select another wallet to move it here.';},500);};
  card.onpointermove=e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)clearTimeout(timer);};
  card.onpointerup=()=>clearTimeout(timer);card.onpointercancel=()=>clearTimeout(timer);card.onpointerleave=()=>clearTimeout(timer);
  card.onclick=()=>{if(selected&&selected!==id)move(selected,id);};
  card.onkeydown=e=>{if(e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const i=cards.indexOf(card),offset=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;const other=cards[i+offset];if(other)move(id,other.dataset.walletId);}};
 });
}
import {bindWalletDeletion} from './wallet-deletion.js';
