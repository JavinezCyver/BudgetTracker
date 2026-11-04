import {nativeBackend,assignAction} from './record-actions.js';
import { BudgetError, cents, fromCents } from './budget.js';
import { addedWallets } from './wallets.js';
import { walletLabel } from './card-providers.js';

export const unassignedTransactions=data=>data.transactions.filter(t=>['assets','liabilities'].includes(t.wallet));
export function assignmentCandidates(data,transaction){
 const source=data.wallets.find(w=>w.id===transaction.wallet);
 return addedWallets(data.wallets).filter(w=>(w.kind||'asset')===(source?.kind||'asset'));
}
export function assignTransactionWallets(data,assignments){
 const wallets=data.wallets.map(w=>({...w}));
 const transactions=data.transactions.map(transaction=>{
  if(!assignments.has(transaction.id))return transaction;
  if(!['assets','liabilities'].includes(transaction.wallet))throw new BudgetError('This transaction already belongs to a wallet.');
  const target=wallets.find(w=>w.id===assignments.get(transaction.id));
  if(!target||!assignmentCandidates(data,transaction).some(w=>w.id===target.id))throw new BudgetError('Choose a matching wallet for this transaction.');
  const source=wallets.find(w=>w.id===transaction.wallet),direction=target.kind==='liability'?-1:1;
  const delta=direction*cents(transaction.amount);
  source.balance=fromCents(cents(source.balance)-delta);
  target.balance=fromCents(cents(target.balance)+delta);
  return {...transaction,wallet:target.id};
 });
 return {...data,wallets,transactions};
}
export function repairUnassignedTransactions(data){
 const assignments=new Map();
 for(const transaction of unassignedTransactions(data)){
  const candidates=assignmentCandidates(data,transaction);
  if(candidates.length===1)assignments.set(transaction.id,candidates[0].id);
 }
 return assignments.size?assignTransactionWallets(data,assignments):data;
}
export function assignmentNotice(data){
 const count=unassignedTransactions(data).length;
 return count?`<div class="assignment-notice" role="status"><p>${count} earlier transaction${count===1?' was':'s were'} recorded without a wallet. Assign ${count===1?'it':'them'} to update your card balances.</p><button id="review-wallet-assignments">Choose wallet</button></div>`:'';
}
export function bindWalletAssignments({data,persist,render,money,escape}){
 const button=document.querySelector('#review-wallet-assignments');if(!button)return;
 button.onclick=()=>{
  const pending=unassignedTransactions(data),modal=document.querySelector('#modal');modal.classList.add('compact-wallet-dialog');
  modal.innerHTML=`<form id="wallet-assignment-form"><div class="section-head"><h3>Assign earlier transactions</h3><button id="close-assignment" class="close-button" type="button" aria-label="Close">×</button></div><p class="modal-subtitle">Choose the wallet used for each transaction. Your net worth will stay the same.</p>${pending.map((transaction,index)=>{const candidates=assignmentCandidates(data,transaction);return `<label>${escape(transaction.name)} · ${money(transaction.amount)}<select name="assignment-${index}" required><option value="" disabled selected>${candidates.length?'Choose wallet':'Add a matching wallet first'}</option>${candidates.map(w=>`<option value="${escape(w.id)}">${escape(walletLabel(w))}</option>`).join('')}</select></label>`;}).join('')}<p id="assignment-error" role="alert"></p><button class="primary-button submit" type="submit">Update card balances</button></form>`;
  modal.showModal();modal.onclick=event=>{if(event.target===modal)modal.close();};document.querySelector('#close-assignment').onclick=()=>modal.close();
  document.querySelector('#wallet-assignment-form').onsubmit=async event=>{
   event.preventDefault();const submit=event.target.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;
   try{const fields=new FormData(event.target),assignments=new Map(pending.map((transaction,index)=>[transaction.id,fields.get(`assignment-${index}`)]));await persist(nativeBackend()?assignAction(data,assignments):assignTransactionWallets(data,assignments));modal.close();render();}catch(error){submit.disabled=false;document.querySelector('#assignment-error').textContent=error instanceof BudgetError?error.message:'Could not update balances. Please try again.';}
  };
 };
}
