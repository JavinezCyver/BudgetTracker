import {createLoan,recordRepayment} from './record-actions.js';
import {BudgetError} from './budget.js';
import {outstanding,loanStatus,lendingTotals,lendingWallets} from './loans.js';
import {manilaDateKey} from './app-date.js';
import {walletLabel} from './card-providers.js';

const filters={status:'outstanding',query:''};
const day=value=>new Date(`${value}T12:00:00`).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
const plus='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
export function filteredLoans(loans,filter=filters,today=manilaDateKey()){
 const query=filter.query.trim().toLowerCase();
 return loans.filter(loan=>{
  const status=loanStatus(loan,today);
  if(filter.status==='outstanding'&&status==='paid')return false;
  if(filter.status==='overdue'&&status!=='overdue')return false;
  if(filter.status==='paid'&&status!=='paid')return false;
  return !query||`${loan.person} ${loan.note||''}`.toLowerCase().includes(query);
 }).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||(b.createdAt||0)-(a.createdAt||0));
}
function loanCards(data,{money,escape}){
 const loans=filteredLoans(data.loans||[]),wallets=new Map(data.wallets.map(wallet=>[wallet.id,walletLabel(wallet)]));
 if(!loans.length)return `<div class="history-empty"><span>${plus}</span><h3>${data.loans?.length?'No matching records':'Keep track of money owed to you'}</h3><p>${data.loans?.length?'Try another filter or search.':'Add a person and the amount they owe, then record repayments as they come in.'}</p></div>`;
 return loans.map(loan=>{
  const balance=outstanding(loan),status=loanStatus(loan),paid=loan.principal-balance,percentage=Math.min(100,Math.round(paid/loan.principal*100));
  const initials=loan.person.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  return `<article class="loan-card" data-loan-id="${escape(loan.id)}"><div class="loan-card-top"><span class="loan-avatar" aria-hidden="true">${escape(initials)}</span><div class="loan-person"><h3>${escape(loan.person)}</h3><span class="loan-status status-${status}">${status==='paid'?'Paid in full':status==='overdue'?'Overdue':'Outstanding'}</span></div><div class="loan-balance"><small>Still owed</small><strong>${money(balance)}</strong></div></div><div class="loan-meta"><span>Lent ${day(loan.issuedDate)}</span><span>${loan.dueDate?`Due ${day(loan.dueDate)}`:'No due date'}</span></div>${loan.note?`<p class="loan-note">${escape(loan.note)}</p>`:''}<div class="loan-progress" role="progressbar" aria-label="Amount repaid" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percentage}%"></i></div><div class="loan-card-bottom"><span>${money(paid)} of ${money(loan.principal)} repaid</span>${status!=='paid'?`<button type="button" data-loan-repay="${escape(loan.id)}">Record payment</button>`:'<span class="loan-settled">Settled</span>'}</div><details class="loan-repayment-history"><summary>Repayments (${loan.repayments.length})</summary>${loan.repayments.length?`<ul>${loan.repayments.map(payment=>`<li><span>${day(payment.date)}<small>${escape(wallets.get(payment.wallet)||'Wallet')}</small></span><strong>${money(payment.amount)}</strong></li>`).join('')}</ul>`:'<p>No repayments recorded.</p>'}</details></article>`;
 }).join('');
}
export function whoOwesView({data,money,escape}){
 const totals=lendingTotals(data.loans||[]),filtered=filteredLoans(data.loans||[]);
 return `<section id="who-owes"><article class="history-combined-summary"><div class="income-summary-top"><div class="history-net"><h2>TOTAL OWED TO YOU</h2><strong>${money(totals.owed)}</strong></div><button type="button" id="add" class="income-summary-add" data-loan-add>${plus}Add record</button></div><dl class="history-summary-details"><div><dt>Overdue</dt><dd>${money(totals.overdue)}</dd></div><div><dt>Repaid</dt><dd>${money(totals.repaid)}</dd></div></dl></article><section class="history-panel loans-panel"><header class="history-panel-heading"><div><h2>Who owes you</h2><p id="loan-count" role="status" aria-live="polite">${filtered.length} record${filtered.length===1?'':'s'}</p></div></header><label class="history-search"><input id="loan-search" type="search" maxlength="200" aria-label="Search people or notes" placeholder="Search a person or note" value="${escape(filters.query)}"></label><div class="loan-filter-tabs" role="group" aria-label="Lending status">${[['outstanding','Outstanding'],['overdue','Overdue'],['paid','Paid'],['all','All']].map(([value,label])=>`<button type="button" data-loan-filter="${value}" aria-pressed="${filters.status===value}">${label}</button>`).join('')}</div><div id="loan-records">${loanCards(data,{money,escape})}</div></section></section>`;
}
export function bindWhoOwes({data,persist,render,money,escape,openWallet}){
 const root=document.querySelector('#who-owes');if(!root)return;
 const refresh=()=>{const loans=filteredLoans(data.loans||[]);root.querySelector('#loan-records').innerHTML=loanCards(data,{money,escape});root.querySelector('#loan-count').textContent=`${loans.length} record${loans.length===1?'':'s'}`;root.querySelectorAll('[data-loan-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.loanFilter===filters.status)));};
 root.querySelector('#loan-search').oninput=event=>{filters.query=event.target.value;refresh();};
 root.onclick=event=>{
  const filter=event.target.closest('[data-loan-filter]');if(filter){filters.status=filter.dataset.loanFilter;refresh();return;}
  if(event.target.closest('[data-loan-add]'))showForm();
  const repay=event.target.closest('[data-loan-repay]');if(repay)showForm(repay.dataset.loanRepay);
 };
 function showForm(loanId){
  const modal=document.querySelector('#modal'),loan=(data.loans||[]).find(item=>item.id===loanId),wallets=lendingWallets(data),today=manilaDateKey();
  modal.classList.remove('compact-wallet-dialog');modal.classList.add('loan-dialog');
  const heading=`<div class="section-head"><h3>${loan?'Record repayment':'Add lending record'}</h3><button type="button" id="close-loan" class="close-button" aria-label="Close">×</button></div>`;
  const options=`${wallets.length===1?'':'<option value="" disabled selected>Choose wallet</option>'}${wallets.map(wallet=>`<option value="${escape(wallet.id)}">${escape(walletLabel(wallet))}</option>`).join('')}`;
  if(loan&&!wallets.length){
   modal.innerHTML=`<form id="loan-form">${heading}<p class="modal-subtitle">Add an asset wallet to receive this repayment.</p><button type="button" id="loan-create-wallet" class="primary-button submit">Add wallet</button></form>`;
   modal.showModal();document.querySelector('#close-loan').onclick=()=>modal.close();document.querySelector('#loan-create-wallet').onclick=()=>{modal.close();openWallet();};return;
  }
  modal.innerHTML=`<form id="loan-form">${heading}<p class="modal-subtitle">${loan?`${escape(loan.person)} still owes ${money(outstanding(loan))}.`:'Track money lent and the repayments you receive.'}</p>${loan?'':`<label>Person’s name<input name="person" required maxlength="80" placeholder="e.g. Alex Santos"></label>`}<label>Amount (PHP)<input name="amount" required type="number" min="0.01" step="0.01" max="${loan?outstanding(loan):100000000}" ${loan?`value="${outstanding(loan)}"`:''} placeholder="0.00"></label>${loan?`<label>Repayment date<input name="date" type="date" required min="${loan.issuedDate}" max="${today}" value="${today}"></label>`:`<div class="form-row"><label>Date lent<input name="issuedDate" type="date" required max="${today}" value="${today}"></label><label>Due date (optional)<input name="dueDate" type="date" min="${today}"></label></div><label class="loan-existing-choice"><input name="existing" type="checkbox" ${wallets.length?'':'checked'}><span>Already lent earlier — don’t deduct from a wallet</span></label>`}<label class="loan-wallet-label" ${!loan&&!wallets.length?'hidden':''}>${loan?'Receive into':'Lend from'}<select name="wallet" ${!loan&&!wallets.length?'disabled':'required'}>${options}</select></label>${loan?'':'<label>Note (optional)<textarea name="note" rows="2" maxlength="200" placeholder="What was this for?"></textarea></label>'}<p id="loan-error" role="alert"></p><button type="submit" class="primary-button submit">${loan?'Save repayment':'Save record'}</button></form>`;
  modal.showModal();modal.onclick=event=>{if(event.target===modal)modal.close();};document.querySelector('#close-loan').onclick=()=>modal.close();
  if(!loan){
   const existing=modal.querySelector('[name=existing]'),wallet=modal.querySelector('[name=wallet]');
   existing.onchange=()=>{wallet.disabled=existing.checked;wallet.required=!existing.checked;wallet.closest('label').hidden=existing.checked;wallet.dispatchEvent(new Event('change',{bubbles:true}));};
   modal.querySelector('[name=issuedDate]').onchange=event=>{modal.querySelector('[name=dueDate]').min=event.target.value;};
  }
  modal.querySelector('#loan-form').onsubmit=async event=>{
   event.preventDefault();const button=event.target.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
   try{const fields=Object.fromEntries(new FormData(event.target));fields.existing=fields.existing==='on';const next=loan?recordRepayment(data,loan.id,fields):createLoan(data,fields);await persist(next);if(!loan){filters.status='outstanding';filters.query='';}modal.close();render();const toast=document.querySelector('#toast');toast.textContent=loan?'Repayment recorded':'Lending record saved';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3000);}
   catch(error){button.disabled=false;document.querySelector('#loan-error').textContent=error instanceof BudgetError?error.message:'Could not save. Please try again.';}
  };
 }
}
