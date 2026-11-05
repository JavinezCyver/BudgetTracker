import './page-zoom.js';
import {weeklyCashflow,recentTransactions} from './dashboard-data.js';
import {loadApplication,saveApplication} from './app-store.js';
import {nativeBackend} from './record-actions.js';
import {nativeMetric} from './native-metrics.js';
import {createWallet,createTransaction} from './record-actions.js';
import './notifications.css';
import './mobile-navigation.css';
import {mobileNavigation,bindMobileNavigation} from './mobile-navigation.js';
import './form-placeholders.css';
import './mobile-buttons.css';
import './amount-typography.css';
import './dashboard.css';
import './appearance.css';
import {applyAppearance,bindAppearance} from './appearance.js';
import './settings.css';
import {settingsView} from './settings.js';
import './style.css';
import './theme.css';
import './responsive.css';
import './wallet-summary.css';
import './wallet-reference.css';
import './bank-cards.css';
import './vector-cards.css';
import './selects.css';
import './adaptive.css';
import './calendar.css';
import './date-picker.css';
import './wallet-manager.css';
import './transaction-history.css';
import './transaction-dialog.css';
import './income.css';
import './who-owes.css';
import './goals.css';
import './investments.css';
import './budget-plan.css';
import {budgetPlanView,bindBudgetPlan,resetBudgetMonth} from './budget-plan-view.js';
import {investmentsView,bindInvestments} from './investments-view.js';
import {goalsView,bindGoals} from './goals-view.js';
import {whoOwesView,bindWhoOwes} from './who-owes.js';
import './viewport.js';
import {transactionHistory,bindTransactionHistory,historyTotals} from './transaction-history.js';
import './date-picker.js';
import './selects.js';
import { bankCards, providerOptions, bindBankOptions } from './bank-cards.js';
import {walletHeader,walletToolbar,visibleWallets,walletViewClass,bindWalletView} from './wallet-view.js';
import { starterWallets, netWorth, addedWallets, receivableBalance, portfolioBalance } from './wallets.js';
import {repairUnassignedTransactions,assignmentNotice,bindWalletAssignments} from './wallet-assignment.js';
import { BudgetError,   compareTransactions, isBalanceTransfer } from './budget.js';
import { sidebarSections } from './sidebar-sections.js';
import { calendarView, currentCalendar, shiftMonth } from './calendar.js';
import { manilaNow, watchPhilippineDay } from './app-date.js';
import { walletLabel } from './card-providers.js';

const icons = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 wallet:'<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M21 12h-6v5h6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-12 4h.01m4 0h.01"/>',
 arrow:'<path d="m7 17 10-10M7 7h10v10"/>',
 down:'<path d="m7 7 10 10M7 17h10V7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
 card:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20"/>',
 coffee:'<path d="M4 8h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
 bag:'<path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.wallet}</svg>`;
const pesoFormatter = new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'});
const money = n => pesoFormatter.format(n);
let today = manilaNow();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let data = {
 schemaVersion: 3,
 hasAddedWallet: false,
 wallets:starterWallets(),
 transactions:[]
};
let page='Dashboard', search='', month=new Date(today.getFullYear(),today.getMonth(),1), selectedDate=iso(today);
let balancesHidden=false;
let storageError=false;
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function initialize(){
 try{data=await loadApplication(data);}catch(error){storageError=error.message||String(error);console.error(error);}
 render();
}
async function persist(request){
 if(storageError)throw new BudgetError('Saved data could not be loaded. Reload before making changes.');
 data=await saveApplication(request);return data;
}
function rows(items) {
 return items.length ? items.map(t=>`<tr><td><div class="merchant"><span class="merchant-icon ${t.amount>0?'green':t.category==='Shopping'?'peach':'lavender'}">${icon(t.amount>0?'down':t.category==='Food & drinks'?'coffee':t.category==='Groceries'?'bag':t.category==='Shopping'?'bag':'card')}</span><span><strong>${escape(t.name)}</strong><small>${new Date(t.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small></span></div></td><td><span class="tag">${escape(t.category)}</span></td><td class="wallet-cell">${escape(data.wallets.find(w=>w.id===t.wallet)?.name||'Wallet')}</td><td class="amount ${t.amount>0?'positive':''}">${t.amount>0?'+':'−'}${money(Math.abs(t.amount))}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No transactions here yet.</td></tr>';
}
function walletCards(wallets=data.wallets){return bankCards(wallets,{escape,money:balancesHidden?()=>'••••••':money});}
function walletFields(){return `<label>Card design<select name="provider" required>${providerOptions()}</select></label><label>Opening balance (PHP)<input name="amount" type="number" step="0.01" min="0" max="100000000" required value="0" placeholder="0.00"></label><label>Account type<select name="kind"><option value="asset">Asset — what you own</option><option value="liability">Liability — what you owe</option></select></label><label>Card network<select name="network"><option value="folio">None</option><option value="mastercard">Mastercard</option><option value="visa">Visa</option></select></label><label>Purpose<input name="purpose" required maxlength="60" placeholder="e.g. Saving for adventures"></label>`;}
function walletSummary(){
 const assets=nativeMetric(data)?.assets??data.wallets.filter(w=>w.kind!=='liability').reduce((sum,w)=>sum+w.balance,0)+receivableBalance(data.loans||[])+portfolioBalance(data.investments||[]);
 const liabilities=nativeMetric(data)?.liabilities??data.wallets.filter(w=>w.kind==='liability').reduce((sum,w)=>sum+w.balance,0);
 const display=n=>balancesHidden?'••••••':money(n);
 return `<section class="net-summary" aria-label="Net balance and net worth"><div class="net-summary-top"><div><h2>NET BALANCE | NET WORTH</h2><p class="net-summary-value">${display(assets-liabilities)}</p></div><div class="net-summary-actions"><button id="toggle-balances" aria-label="${balancesHidden?'Show balances':'Hide balances'}" aria-pressed="${balancesHidden}" title="${balancesHidden?'Show balances':'Hide balances'}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${balancesHidden?'<path d="m3 3 18 18"/>':''}</svg></button><details class="summary-menu"><summary aria-label="Balance options" title="Balance options"><span aria-hidden="true">•••</span></summary><div class="summary-popover"><button id="summary-add-wallet">${icon('plus')}Add wallet</button><button type="button" id="wallet-trash" aria-label="Manage wallets"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7"/></svg>Delete wallets</button><p>Net worth is your total assets minus your total liabilities.</p></div></details></div></div><dl class="net-summary-totals"><div><dt>Assets</dt><dd>${display(assets)}</dd></div><div><dt>Liabilities</dt><dd>${display(liabilities)}</dd></div></dl></section>`;
}
function home(){
 const total=netWorth(data.wallets,data.loans||[],data.investments||[]);
 const current=data.transactions.filter(t=>t.date.startsWith(iso(today).slice(0,7))&&!isBalanceTransfer(t));
 const totals=historyTotals(current),recent=recentTransactions(data.transactions);
 return `<header class="dashboard-heading"><h1>Dashboard</h1><p>${today.toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</p></header>
 <section class="history-combined-summary dashboard-summary" aria-label="Financial overview"><div class="history-net"><h2>NET WORTH</h2><strong>${money(total)}</strong></div><dl class="history-summary-details"><div><dt>Income <small>This month</small></dt><dd>${money(totals.income)}</dd></div><div><dt>Expenses <small>This month</small></dt><dd>${money(totals.expenses)}</dd></div></dl></section>
 <section class="dashboard-analysis" aria-label="Monthly spending and cash flow"><article class="panel cashflow"><div class="section-head"><h3>Cash flow</h3><span class="period">This month</span></div><div class="chart-legend"><span><i class="dot purple-dot"></i>Income</span><span><i class="dot light-dot"></i>Expenses</span></div>${chart(current)}</article><article class="panel spending"><div class="section-head"><h3>Spending breakdown</h3></div>${breakdown(current,totals.expenses)}</article></section>
 <section class="panel dashboard-recent"><div class="section-head"><h3>Recent transactions</h3><button type="button" class="text-button" data-page="Transactions">View all ${icon('chevron')}</button></div>${recent.length?`<ul class="dashboard-recent-list">${recent.map(t=>`<li><div class="dashboard-recent-description"><strong>${escape(t.name)}</strong><small>${new Date(t.date+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'})} · ${escape(t.category)}</small></div><strong class="dashboard-recent-amount ${t.amount>0?'positive':''}">${t.amount>0?'+':t.amount<0?'−':''}${money(Math.abs(t.amount))}</strong></li>`).join('')}</ul>`:'<p class="dashboard-recent-empty">No transactions recorded yet.</p>'}</section>`;
}
function chart(items){
 const weeks=weeklyCashflow(items);
 const max=Math.max(100,...weeks.flat());
 return `<div class="chart"><div class="y-labels">${[1,.75,.5,.25,0].map(n=>`<span>${money(max*n).replace('.00','')}</span>`).join('')}</div><div class="plot"><div class="grid-lines">${'<i></i>'.repeat(5)}</div><div class="bars">${weeks.map((w,i)=>`<div class="bar-group"><div class="bar-pair"><div class="bar income" style="height:${w[0]/max*100}%" title="Income: ${money(w[0])}"></div><div class="bar expense" style="height:${w[1]/max*100}%" title="Expenses: ${money(w[1])}"></div></div><span>Week ${i+1}</span></div>`).join('')}</div></div></div>`;
}
function breakdown(items,total){const cats=Object.create(null);items.filter(t=>t.amount<0).forEach(t=>cats[t.category]=(cats[t.category]||0)-t.amount);const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const colors=['var(--theme-91c449,#91c449)','var(--theme-719b3e,#719b3e)','var(--theme-537632,#537632)','var(--theme-b4ca78,#b4ca78)','var(--theme-3a502c,#3a502c)'];let stop=0;const gradient=entries.map(([_,n],i)=>{const start=stop;stop+=n/(total||1)*100;return `${colors[i%5]} ${start}% ${stop}%`;}).join(',');return `<div class="donut" style="background:conic-gradient(${gradient||'#3a502c 0% 100%'})"><div><small>Total spent</small><strong>${money(total)}</strong></div></div><div class="category-list">${entries.map(([c,n],i)=>`<div><span><i class="dot" style="background:${colors[i%5]}"></i>${escape(c)}</span><strong>${Math.round(n/(total||1)*100)}%</strong></div>`).join('')||'<p>No spending yet</p>'}</div>`;}
function transactionsPanel(){if(!data.hasAddedWallet)return '';const filtered=data.transactions.filter(t=>(t.name+' '+t.category).toLowerCase().includes(search.toLowerCase())).sort(compareTransactions);return `<section class="panel transactions"><div class="section-head"><div><h3>Recent transactions</h3><p>The little details, all in one place.</p></div><label class="search">${icon('search')}<input id="search" placeholder="Search transactions" value="${escape(search)}" aria-label="Search transactions"></label></div><div class="table-scroll"><table><thead><tr><th>Transaction</th><th>Category</th><th>Wallet</th><th class="amount">Amount</th></tr></thead><tbody>${rows(filtered)}</tbody></table></div></section>`;}
function calendar(){return calendarView({month,selectedDate,today,transactions:data.transactions,wallets:data.wallets,money,escape});}
function resetCalendarToToday(){today=manilaNow();const current=currentCalendar(today);month=current.month;selectedDate=current.selectedDate;}
function bindCalendarInteractions(){
 const add=document.querySelector('#calendar-add-transaction');if(add)add.onclick=()=>openModal(false);
 document.querySelector('.calendar-days')?.addEventListener('keydown',event=>{
  const button=event.target.closest('[data-date]');if(!button)return;
  const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
  if(!(event.key in offsets)&&!['Home','End'].includes(event.key))return;
  event.preventDefault();const next=new Date(button.dataset.date+'T12:00:00');
  next.setDate(next.getDate()+(event.key==='Home'?-next.getDay():event.key==='End'?6-next.getDay():offsets[event.key]));
  selectedDate=iso(next);month=new Date(next.getFullYear(),next.getMonth(),1);render();
  document.querySelector('[data-date="'+selectedDate+'"]')?.focus();
 });
}
function render(){applyAppearance(data);today=manilaNow();document.querySelector('#app').innerHTML=`<aside class="sidebar" aria-label="Main navigation"><div class="sidebar-header"><a class="brand" href="#" aria-label="PocketPlan dashboard"><img class="pocketplan-logo" src="/pocketplan-logo.png" alt="" width="30" height="30"><span class="sidebar-brand-copy"><span class="pocketplan-wordmark">PocketPlan</span><small class="sidebar-account">PERSONAL</small></span></a><button class="sidebar-toggle" id="sidebar-toggle" aria-label="Collapse navigation" aria-expanded="true">«</button></div><p class="nav-label">OVERVIEW</p><nav>${['Dashboard','Wallets','Calendar'].map((n,i)=>`<button data-page="${n}" aria-label="${n}" title="${n}" aria-current="${page===n?'page':'false'}" class="nav-item ${page===n?'active':''}">${icon(['home','wallet','calendar'][i])}<span>${n}</span>${page===n?'<i></i>':''}</button>`).join('')}</nav>${sidebarSections(page)}</aside><div class="main-shell"><main class="${page==='Dashboard'?'standard-page dashboard-page':page==='Wallets'?'wallets-page':page==='Calendar'?'standard-page calendar-page':page==='Who Owes You'?'standard-page transactions-page loans-page':page==='Goals'?'standard-page transactions-page goals-page':page==='Investments'?'standard-page transactions-page investments-page':page==='Settings'?'standard-page settings-page':page==='Budget plan'?'standard-page transactions-page budget-page':['Transactions','Income'].includes(page)?'standard-page transactions-page'+(page==='Income'?' income-page':''):'standard-page'}">${storageError?`<div class="storage-error" role="alert">Could not load saved data: ${escape(storageError)} Changes are blocked to protect it. Reload the app and try again.</div>`:""}${storageError?'':assignmentNotice(data)}${page==='Wallets'?walletHeader():`<div class="page-heading"><div><div class="eyebrow">YOUR MONEY, IN PERSPECTIVE</div><h1>${page==='Dashboard'?'A fresh look at your finances.':page==='Wallets'?'A home for every peso.':page==='Transactions'?'Transactions':page==='Income'?'Income':'Calendar'}</h1><p>${page==='Dashboard'?'Welcome back, Jamie. Let’s make good things happen.':page==='Wallets'?'All your balances, together in one place.':page==='Transactions'?'All your income and expenses, in one place.':page==='Income'?'Keep track of money received into your wallets.':'Your daily transactions, with a little more clarity.'}</p></div>${['Dashboard','Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings'].includes(page)?'':`<button class="primary-button ${page==='Wallets'?'wallet-add-icon':'ordinary-add'}" id="add" aria-label="Add ${page==='Wallets'?'wallet':page==='Income'?'income':'transaction'}" title="Add ${page==='Wallets'?'wallet':page==='Income'?'income':'transaction'}">${icon('plus')}${page==='Wallets'?'':page==='Income'?'Add income':'Add transaction'}</button>`}</div>`}<div class="date-line"><span>${icon('calendar')}${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span><span class="subtle">${page==='Dashboard'?'Your monthly overview':page==='Wallets'?'Your personal accounts':'Your financial calendar'}</span></div>${page==='Dashboard'?home():page==='Wallets'?`${walletSummary()}${walletToolbar()}${visibleWallets(data.wallets).length?`<div class="wallet-grid full-wallets ${walletViewClass()}">${walletCards(visibleWallets(data.wallets))}</div>`:''}`:page==='Settings'?settingsView({data}):page==='Budget plan'?budgetPlanView({data,money,escape}):page==='Investments'?investmentsView({data,money,escape}):page==='Goals'?goalsView({data,money,escape}):page==='Who Owes You'?whoOwesView({data,money,escape}):['Transactions','Income'].includes(page)?transactionHistory({data,today,money,escape,mode:page==='Income'?'income':'all'}):calendar()}</main></div><dialog id="modal"></dialog><div id="toast" role="status"></div>${mobileNavigation(page)}`;bind();}
function bind(){bindMobileNavigation();bindAppearance({data,persist});bindBudgetPlan({data,persist,render,money,escape});bindInvestments({data,persist,render,money,escape,openWallet:()=>openModal(true)});bindGoals({data,persist,render,money,escape,openWallet:()=>openModal(true)});bindWhoOwes({data,persist,render,money,escape,openWallet:()=>openModal(true)});bindTransactionHistory({data,today,money,escape,mode:page==='Income'?'income':'all',openTransaction:()=>openModal(false)});bindWalletAssignments({data,persist,render,money,escape});bindCalendarInteractions();bindBankOptions({data,persist,render,escape,openTransaction:id=>{openModal(false);document.querySelector('#entry-form [name=wallet]').value=id;}});bindWalletView({data,render,persist,escape});const visibility=document.querySelector("#toggle-balances");if(visibility)visibility.onclick=()=>{balancesHidden=!balancesHidden;render();};const summaryAdd=document.querySelector("#summary-add-wallet");if(summaryAdd)summaryAdd.onclick=()=>{document.querySelector(".summary-menu").open=false;openModal(true);};const toggle=document.querySelector("#sidebar-toggle");toggle.onclick=()=>{const collapsed=document.body.classList.toggle("sidebar-collapsed");toggle.textContent=collapsed?"»":"«";toggle.setAttribute("aria-expanded",String(!collapsed));toggle.setAttribute("aria-label",collapsed?"Expand navigation":"Collapse navigation");};const collapsed=document.body.classList.contains("sidebar-collapsed");toggle.textContent=collapsed?"»":"«";toggle.setAttribute("aria-expanded",String(!collapsed));toggle.setAttribute("aria-label",collapsed?"Expand navigation":"Collapse navigation");document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{document.querySelector('#mobile-more')?.close();if(page===b.dataset.page&&!['Calendar','Budget plan'].includes(page))return;page=b.dataset.page;if(page==='Calendar')resetCalendarToToday();if(page==='Budget plan')resetBudgetMonth();search='';render();});document.querySelector('.brand').onclick=e=>{e.preventDefault();if(page==='Dashboard')return;page='Dashboard';render();};const addButton=document.querySelector('#add');if(addButton&&!['Dashboard','Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings'].includes(page))addButton.onclick=()=>openModal(page==='Wallets');const input=document.querySelector('#search');if(input)input.oninput=e=>{search=e.target.value;const tbody=document.querySelector('tbody');tbody.innerHTML=rows(data.transactions.filter(t=>(t.name+' '+t.category).toLowerCase().includes(search.toLowerCase())).sort(compareTransactions));};document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;const selected=new Date(selectedDate+'T12:00:00');month=new Date(selected.getFullYear(),selected.getMonth(),1);render();});['prev-month','next-month','today'].forEach(id=>{const b=document.getElementById(id);if(b)b.onclick=()=>{if(id==='today')resetCalendarToToday();else{const next=shiftMonth(month,selectedDate,id==='next-month'?1:-1);month=next.month;selectedDate=next.selectedDate;}render();};});}
function openModal(wallet){if(!wallet&&addedWallets(data.wallets).length===0){openModal(true);return;}const modal=document.querySelector('#modal');modal.classList.toggle('compact-wallet-dialog',wallet);modal.innerHTML=`<form id="entry-form"><div class="section-head"><h3>Add ${wallet?'wallet':page==='Income'?'income':'transaction'}</h3><button type="button" id="close" class="close-button" aria-label="Close">×</button></div><p class="modal-subtitle">${wallet?'Give your money a place to call home.':'A small entry. A clearer picture.'}</p><label>${wallet?'Wallet name':page==='Income'?'Source / description':'Description'}<input name="name" required maxlength="80" placeholder="${wallet?'e.g. Travel savings':page==='Income'?'e.g. Monthly salary':'e.g. Weekly groceries'}"></label>${wallet?walletFields():`<div class="form-row"><label class="${page==='Income'?'income-type-field':''}">Type<select name="type"><option value="expense" ${page==='Income'?'disabled':''}>Expense</option><option value="income" ${page==='Income'?'selected':''}>Income</option></select></label><label>Amount (PHP)<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required placeholder="0.00"></label></div><p class="modal-subtitle">For liabilities, an expense adds debt and income reduces debt.</p><label>Pay from / receive into<select name="wallet" required>${addedWallets(data.wallets).length>1?'<option value="" disabled selected>Choose wallet</option>':''}${addedWallets(data.wallets).map(w=>`<option value="${escape(w.id)}">${escape(walletLabel(w))}</option>`).join('')}</select></label><div class="form-row"><label class="${page==='Income'?'income-category-field':''}">Category<select name="category">${['Food & drinks','Groceries','Shopping','Subscriptions','Transport','Housing','Income','Other'].map(c=>`<option>${c}</option>`).join('')}</select></label><label>Date<input name="date" type="date" required value="${page==='Calendar'?selectedDate:iso(today)}"></label></div>`}<p id="form-error" role="alert"></p><button class="primary-button submit" type="submit">${icon('plus')}Save ${wallet?'wallet':page==='Income'?'income':'transaction'}</button></form>`;modal.showModal();document.querySelector('#close').onclick=()=>modal.close();modal.onclick=e=>{if(e.target===modal)modal.close();};document.querySelector('#entry-form').onsubmit=async event=>{
 event.preventDefault();
 const submit=event.target.querySelector('[type=submit]');
 if(submit.disabled)return;
 submit.disabled=true;
 try{
  const fields=Object.fromEntries(new FormData(event.target));
  if(!wallet&&page==='Income')fields.type='income';
  const next=wallet?(nativeBackend()?createWallet(data,fields):repairUnassignedTransactions(createWallet(data,fields))):createTransaction(data,fields);
  await persist(next);
  modal.close();render();
  const toast=document.querySelector('#toast');toast.textContent=wallet?'Wallet created':'Transaction saved';toast.classList.add('visible');
  setTimeout(()=>toast.classList.remove('visible'),3000);
 }catch(error){
  document.querySelector('#form-error').textContent=error instanceof BudgetError?error.message:'Could not save. Please try again.';
  submit.disabled=false;console.error(error);
 }
};
}
initialize();
watchPhilippineDay(()=>{
 if(document.hidden||!document.querySelector('[data-page]')||document.querySelector('#modal')?.open)return false;
 if(page==='Calendar')resetCalendarToToday();
 render();return true;
});
