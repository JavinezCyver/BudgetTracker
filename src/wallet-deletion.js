import {deleteWallet} from './record-actions.js';
import {BudgetError} from './budget.js';
import {addedWallets} from './wallets.js';

export function bindWalletDeletion({data,render,persist,escape}){
 const trash=document.querySelector('#wallet-trash');if(!trash)return;
 trash.onclick=()=>{
  trash.closest('details')?.removeAttribute('open');
  const modal=document.querySelector('#modal');modal.classList.add('compact-wallet-dialog');let saving=false;
  modal.oncancel=event=>{if(saving)event.preventDefault();};
  modal.onclick=event=>{if(event.target===modal&&!saving)modal.close();};
  const heading=title=>`<div class="section-head"><h3>${title}</h3><button type="button" id="close-manage" class="close-button" aria-label="Close">×</button></div>`;
  const bindClose=()=>{document.querySelector('#close-manage').onclick=()=>{if(!saving)modal.close();};};
  function showList(){
   modal.innerHTML=`${heading('Manage wallets')}<p class="modal-subtitle">Choose a wallet to delete. Its transactions will also be removed.</p><div class="manage-wallets">${addedWallets(data.wallets).map(wallet=>{const count=data.transactions.filter(transaction=>transaction.wallet===wallet.id).length;return `<div><span><strong>${escape(wallet.name)}</strong><small>${count} transaction${count===1?'':'s'}</small></span><button type="button" data-delete-wallet="${escape(wallet.id)}" aria-label="Delete ${escape(wallet.name)}">Delete</button></div>`;}).join('')||'<p>No added wallets yet.</p>'}</div>`;
   bindClose();modal.querySelectorAll('[data-delete-wallet]').forEach(button=>button.onclick=()=>showConfirmation(button.dataset.deleteWallet));
  }
  function showConfirmation(walletId){
   const wallet=data.wallets.find(item=>item.id===walletId),count=data.transactions.filter(transaction=>transaction.wallet===walletId).length;
   const linked=(data.loans||[]).some(loan=>loan.wallet===walletId||loan.repayments.some(payment=>payment.wallet===walletId))||(data.goals||[]).some(goal=>goal.entries.some(entry=>entry.wallet===walletId));
   modal.innerHTML=`${heading('Delete wallet?')}<div class="delete-wallet-summary"><strong>${escape(wallet.name)}</strong><span>${count} recorded transaction${count===1?'':'s'}</span></div><p class="delete-wallet-description">This removes the wallet, its balance, and ${count===1?'its transaction':'all its transactions'} from recent history, Calendar, and dashboard totals.${linked?' Linked lending, repayment, and goal records will also be updated.':''}</p><p id="manage-error" role="alert"></p><div class="delete-wallet-actions"><button type="button" id="cancel-delete-wallet">Cancel</button><button type="button" id="confirm-delete-wallet">Delete wallet</button></div>`;
   bindClose();document.querySelector('#cancel-delete-wallet').onclick=()=>{if(!saving)showList();};
   document.querySelector('#confirm-delete-wallet').onclick=async()=>{
    if(saving)return;saving=true;
    modal.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{await persist(deleteWallet(data,walletId));modal.close();render();const toast=document.querySelector('#toast');toast.textContent='Wallet and its transactions deleted';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3000);}
    catch(error){saving=false;modal.querySelectorAll('button').forEach(button=>button.disabled=false);document.querySelector('#manage-error').textContent=error instanceof BudgetError?error.message:'Could not delete. Your wallet and transactions have been kept. Please try again.';}
   };
  }
  showList();modal.showModal();
 };
}
