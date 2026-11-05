import {cents,fromCents,compareTransactions,isBalanceTransfer} from './budget.js';
import {localDate} from './calendar.js';
import {manilaNow} from './app-date.js';
import {walletLabel} from './card-providers.js';

export const defaultHistoryFilters=()=>({query:'',type:'all',wallet:'all',category:'all',range:'all',sort:'newest',page:1});
const states={all:defaultHistoryFilters(),income:{...defaultHistoryFilters(),type:'income'}},PAGE_SIZE=20;
const dateFormatter=new Intl.DateTimeFormat('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric'});
const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const searchIcon=svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>');
const walletIcon=svg('<path d="M20 8V5H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V8M20 13h-5v4h5"/>');
const historyIcon=svg('<path d="M4 9a9 9 0 1 0 3-5M3 3v6h6M12 7v5l3 2"/>');
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase();
// Data updates replace the snapshot; old indexes can be garbage-collected.
const historyIndexes=new WeakMap();

export function filterTransactions(data,filters,today=manilaNow()){
 let index=historyIndexes.get(data);
 if(!index){
  index={orders:new Map(),search:new Map(),wallets:new Map(data.wallets.map(wallet=>[wallet.id,walletLabel(wallet)]))};
  historyIndexes.set(data,index);
 }
 const order=['oldest','amount'].includes(filters.sort)?filters.sort:'newest';
 if(!index.orders.has(order))index.orders.set(order,[...data.transactions].sort((a,b)=>order==='oldest'?-compareTransactions(a,b):order==='amount'?Math.abs(b.amount)-Math.abs(a.amount)||compareTransactions(a,b):compareTransactions(a,b)));
 const query=normalize(filters.query).trim(),now=localDate(today),start=localDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()-29));
 return index.orders.get(order).filter(transaction=>{
  if(filters.type==='income'&&(transaction.amount<=0||isBalanceTransfer(transaction)))return false;
  if(filters.type==='expense'&&(transaction.amount>=0||isBalanceTransfer(transaction)))return false;
  if(filters.wallet&&filters.wallet!=='all'&&transaction.wallet!==filters.wallet)return false;
  if(filters.category&&filters.category!=='all'&&transaction.category!==filters.category)return false;
  if(filters.range==='month'&&!transaction.date.startsWith(now.slice(0,7)))return false;
  if(filters.range==='30days'&&(transaction.date<start||transaction.date>now))return false;
  if(!query)return true;
  if(!index.search.has(transaction))index.search.set(transaction,normalize(`${transaction.name} ${transaction.category} ${index.wallets.get(transaction.wallet)||''}`));
  return index.search.get(transaction).includes(query);
 });
}
export function historyTotals(transactions){
 let income=0,expenses=0;for(const transaction of transactions){if(isBalanceTransfer(transaction))continue;if(transaction.amount>0)income+=cents(transaction.amount);else expenses-=cents(transaction.amount);}
 return {income:fromCents(income),expenses:fromCents(expenses),net:fromCents(income-expenses)};
}
export function historyPage(transactions,page,size=PAGE_SIZE){
 const pages=Math.max(1,Math.ceil(transactions.length/size)),current=Math.max(1,Math.min(pages,Number(page)||1));
 return {page:current,pages,items:transactions.slice((current-1)*size,current*size),start:transactions.length?(current-1)*size+1:0,end:Math.min(current*size,transactions.length)};
}
function summaries(transactions,money,mode='all',today=manilaNow()){
 const totals=historyTotals(transactions);
 if(mode==='income'){
  const month=localDate(today).slice(0,7),monthly=historyTotals(transactions.filter(transaction=>transaction.date.startsWith(month))).income;
  return `<article class="history-combined-summary" aria-label="Income totals"><div class="income-summary-top"><div class="history-net"><h2>TOTAL INCOME</h2><strong>${money(totals.income)}</strong></div><button type="button" id="add" class="income-summary-add" data-history-add>${svg('<path d="M12 5v14M5 12h14"/>')}Add income</button></div><dl class="history-summary-details"><div><dt>This month</dt><dd>${money(monthly)}</dd></div><div><dt>Payments received</dt><dd>${transactions.length}</dd></div></dl></article>`;
 }
 return `<article class="history-combined-summary" aria-label="Transaction totals"><div class="income-summary-top"><div class="history-net"><h2>NET CHANGE</h2><strong>${totals.net<0?'−':''}${money(Math.abs(totals.net))}</strong></div><button type="button" id="add" class="income-summary-add" data-history-add>${svg('<path d="M12 5v14M5 12h14"/>')}Add transaction</button></div><dl class="history-summary-details"><div><dt>Income</dt><dd>${money(totals.income)}</dd></div><div><dt>Expenses</dt><dd>${money(totals.expenses)}</dd></div></dl></article>`;
}
function records(data,transactions,{money,escape,state,mode='all'}){
 const page=historyPage(transactions,state.page);state.page=page.page;
 const hasRecords=mode==='income'?data.transactions.some(transaction=>transaction.amount>0&&!isBalanceTransfer(transaction)):data.transactions.length>0;
 if(!transactions.length){
  const action=hasRecords?'<button type="button" data-history-reset>Clear filters</button>':'';
  return `<div class="history-empty"><span>${historyIcon}</span><h3>${hasRecords?(mode==='income'?'No matching income':'No matching transactions'):(mode==='income'?'No income recorded yet':'Your history starts here')}</h3><p>${hasRecords?'Try another search or clear your filters.':mode==='income'?'Record your salary, freelance payments, or other money received.':'Your recorded income and expenses will appear here.'}</p>${action}</div>`;
 }
 const wallets=new Map(data.wallets.map(wallet=>[wallet.id,walletLabel(wallet)])),groups=new Map();
 if(state.sort==='amount')groups.set('',page.items);
 else for(const transaction of page.items){if(!groups.has(transaction.date))groups.set(transaction.date,[]);groups.get(transaction.date).push(transaction);}
 return `<div class="history-column-head" aria-hidden="true"><span>Transaction</span><span>Wallet</span><span>Amount</span></div>${[...groups].map(([date,items])=>`<section class="history-day"><h3>${date?dateFormatter.format(new Date(`${date}T12:00:00`)):'Largest amount first'}</h3><ul>${items.map(transaction=>{
  const income=transaction.amount>0;
  return `<li class="history-row" data-history-id="${escape(transaction.id)}"><span class="history-row-icon ${income?'history-income':'history-expense'}">${svg(income?'<path d="M17 7 7 17M7 7v10h10"/>':'<path d="M7 17 17 7M7 7h10v10"/>')}</span><div class="history-description"><strong>${escape(transaction.name)}</strong><small>${escape(transaction.category)}${state.sort==='amount'?` · ${dateFormatter.format(new Date(`${transaction.date}T12:00:00`))}`:''}</small></div><div class="history-wallet">${walletIcon}<span>${escape(wallets.get(transaction.wallet)||'Unassigned wallet')}</span></div><strong class="history-amount ${income?'positive':''}">${transaction.amount===0?'':income?'+':'−'}${money(Math.abs(transaction.amount))}</strong></li>`;
 }).join('')}</ul></section>`).join('')}<nav class="history-pagination" aria-label="Transaction pages"><span>${page.start}–${page.end} of ${transactions.length}</span><div><button type="button" data-history-page="${page.page-1}" ${page.page===1?'disabled':''} aria-label="Previous transaction page">←</button><span>Page ${page.page} of ${page.pages}</span><button type="button" data-history-page="${page.page+1}" ${page.page===page.pages?'disabled':''} aria-label="Next transaction page">→</button></div></nav>`;
}
export function transactionHistory({data,money,escape,today,mode='all'}){
 const state=states[mode];if(mode==='income')state.type='income';
 if(state.wallet!=='all'&&!data.wallets.some(wallet=>wallet.id===state.wallet))state.wallet='all';
 const categories=[...new Set(data.transactions.map(transaction=>transaction.category))].sort((a,b)=>a.localeCompare(b));
 if(state.category!=='all'&&!categories.includes(state.category))state.category='all';
 const filtered=filterTransactions(data,state,today);
 const option=(value,label,current)=>`<option value="${escape(value)}" ${value===current?'selected':''}>${escape(label)}</option>`;
 return `<section id="transaction-history" class="${mode==='income'?'income-history':''}" aria-label="${mode==='income'?'Income history':'Transaction history'}"><div class="history-totals" id="history-totals">${summaries(filtered,money,mode,today)}</div><section class="history-panel"><header class="history-panel-heading"><div><h2>${mode==='income'?'Income history':'Transaction history'}</h2><p id="history-count" role="status" aria-live="polite">${filtered.length} ${mode==='income'?'income record':'transaction'}${filtered.length===1?'':'s'}</p></div><button type="button" class="history-reset" data-history-reset>Reset filters</button></header><label class="history-search">${searchIcon}<input id="history-search" type="search" placeholder="${mode==='income'?'Search income source or wallet':'Search description, category, or wallet'}" aria-label="Search transaction history" value="${escape(state.query)}" maxlength="200"></label><div class="history-type-tabs" role="group" aria-label="Transaction type">${[['all','All transactions'],['expense','Expenses'],['income','Income']].map(([value,label])=>`<button type="button" data-history-type="${value}" aria-pressed="${value===state.type}">${label}</button>`).join('')}</div><div class="history-filters"><label>Wallet<select id="history-wallet">${option('all','All wallets',state.wallet)}${data.wallets.filter(wallet=>!['assets','liabilities'].includes(wallet.id)||data.transactions.some(transaction=>transaction.wallet===wallet.id)).map(wallet=>option(wallet.id,walletLabel(wallet),state.wallet)).join('')}</select></label><label>Period<select id="history-range">${[['all','All time'],['month','This month'],['30days','Last 30 days']].map(([value,label])=>option(value,label,state.range)).join('')}</select></label><label>Category<select id="history-category">${option('all','All categories',state.category)}${categories.map(category=>option(category,category,state.category)).join('')}</select></label><label>Sort by<select id="history-sort">${[['newest','Newest first'],['oldest','Oldest first'],['amount','Largest amount']].map(([value,label])=>option(value,label,state.sort)).join('')}</select></label></div><div id="history-results">${records(data,filtered,{money,escape,state,mode})}</div></section></section>`;
}
export function bindTransactionHistory({data,today,money,escape,openTransaction,mode='all'}){
 const root=document.querySelector('#transaction-history');if(!root)return;
 const state=states[mode];
 let resetting=false,filtered=null;
 function refresh(pageOnly=false){
  if(!pageOnly||!filtered){
   filtered=filterTransactions(data,state,today);
   root.querySelector('#history-totals').innerHTML=summaries(filtered,money,mode,today);
   root.querySelector('#history-count').textContent=`${filtered.length} ${mode==='income'?'income record':'transaction'}${filtered.length===1?'':'s'}`;
  }
  document.querySelector('#history-results').innerHTML=records(data,filtered,{money,escape,state,mode});
  root.querySelectorAll('[data-history-type]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.historyType===state.type)));
 }
 root.querySelector('#history-search').oninput=event=>{state.query=event.target.value;state.page=1;refresh();};
 for(const field of ['wallet','range','category','sort'])root.querySelector(`#history-${field}`)?.addEventListener('change',event=>{if(resetting)return;state[field]=event.target.value;state.page=1;refresh();});
 root.onclick=event=>{
  const type=event.target.closest('[data-history-type]');if(type){if(mode==='income')return;state.type=type.dataset.historyType;state.page=1;refresh();return;}
  const page=event.target.closest('[data-history-page]');if(page&&!page.disabled){state.page=Number(page.dataset.historyPage);refresh(true);root.querySelector('.history-column-head')?.scrollIntoView({block:'nearest'});root.querySelector(`[data-history-page="${state.page+1}"]`)?.focus({preventScroll:true});return;}
  if(event.target.closest('[data-history-add]')){openTransaction();return;}
  if(event.target.closest('[data-history-reset]')){
   Object.assign(state,defaultHistoryFilters(),mode==='income'?{type:'income'}:{});root.querySelector('#history-search').value='';resetting=true;
   for(const field of ['wallet','range','category','sort']){const select=root.querySelector(`#history-${field}`);if(!select)continue;select.value=state[field];select.dispatchEvent(new Event('change',{bubbles:true}));}
   resetting=false;refresh();
  }
 };
}
