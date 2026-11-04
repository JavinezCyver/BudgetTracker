import {nativeMetric} from './native-metrics.js';
import {BudgetError,cents,fromCents,validDate} from './budget.js';
import {manilaDateKey} from './app-date.js';
import {addedWallets} from './wallets.js';
import {walletReserved} from './goal-balances.js';

export const lendingWallets=data=>addedWallets(data.wallets).filter(wallet=>wallet.kind!=='liability');
export const outstanding=loan=>nativeMetric(loan)?.outstanding??fromCents(cents(loan.principal)-loan.repayments.reduce((sum,payment)=>sum+cents(payment.amount),0));
export const loanStatus=(loan,today=manilaDateKey())=>outstanding(loan)===0?'paid':loan.dueDate&&loan.dueDate<today?'overdue':'open';
export function lendingTotals(loans=[],today=manilaDateKey()){
 if(nativeMetric(loans)?.today===today)return nativeMetric(loans).totals;
 let owed=0,overdue=0,repaid=0;for(const loan of loans){const balance=cents(outstanding(loan));owed+=balance;if(loanStatus(loan,today)==='overdue')overdue+=balance;repaid+=cents(loan.principal)-balance;}
 return {owed:fromCents(owed),overdue:fromCents(overdue),repaid:fromCents(repaid)};
}
function positive(value){
 const amount=Number(value);
 if(value==null||String(value).trim()===''||!Number.isFinite(amount)||amount<=0||amount>100000000||Math.abs(amount*100-cents(amount))>.00001)throw new BudgetError('Enter an amount above ₱0.00, up to ₱100,000,000.00, with at most two decimal places.');
 return fromCents(cents(amount));
}
function checkDate(date,today){if(!validDate(date)||date>today)throw new BudgetError('Choose a valid date on or before today.');}
function cashMovement(data,{walletId,amount,date,name,kind,loanId}){
 const wallet=lendingWallets(data).find(item=>item.id===walletId);
 if(!wallet)throw new BudgetError('Choose an asset wallet.');
 const reserved=walletReserved(data,wallet.id);
 if(amount<0&&reserved>0&&cents(wallet.balance)+cents(amount)<cents(reserved))throw new BudgetError('Release savings from Goals before lending money reserved in this wallet.');
 const transaction={id:crypto.randomUUID(),createdAt:Date.now(),name,category:kind==='loan-out'?'Money lent':'Loan repayment',kind,loanId,amount,wallet:wallet.id,date};
 return {transaction,data:{...data,wallets:data.wallets.map(item=>item.id===wallet.id?{...item,balance:fromCents(cents(item.balance)+cents(amount))}:item),transactions:[...data.transactions,transaction]}};
}
export function createLoan(data,fields,today=manilaDateKey()){
 const person=String(fields.person||'').trim(),note=String(fields.note||'').trim(),principal=positive(fields.amount);
 if(!person||person.length>80)throw new BudgetError('Enter a person’s name, up to 80 characters.');
 if(note.length>200)throw new BudgetError('Keep the note within 200 characters.');
 checkDate(fields.issuedDate,today);
 const dueDate=fields.dueDate||'';
 if(dueDate&&(!validDate(dueDate)||dueDate<fields.issuedDate))throw new BudgetError('The due date must be on or after the date lent.');
 const loan={id:crypto.randomUUID(),person,principal,issuedDate:fields.issuedDate,dueDate,note,wallet:null,transactionId:null,repayments:[],createdAt:Date.now()};
 let next=data;
 if(!fields.existing){
  const movement=cashMovement(data,{walletId:fields.wallet,amount:-principal,date:fields.issuedDate,name:`Lent to ${person}`,kind:'loan-out',loanId:loan.id});
  next=movement.data;loan.wallet=fields.wallet;loan.transactionId=movement.transaction.id;
 }
 return {...next,loans:[...(data.loans||[]),loan]};
}
export function recordRepayment(data,loanId,fields,today=manilaDateKey()){
 const loan=(data.loans||[]).find(item=>item.id===loanId);if(!loan)throw new BudgetError('This lending record no longer exists.');
 const amount=positive(fields.amount);checkDate(fields.date,today);
 if(fields.date<loan.issuedDate)throw new BudgetError('Repayment cannot be before the date lent.');
 if(cents(amount)>cents(outstanding(loan)))throw new BudgetError('Repayment cannot exceed the amount still owed.');
 const movement=cashMovement(data,{walletId:fields.wallet,amount,date:fields.date,name:`Repayment from ${loan.person}`,kind:'loan-repayment',loanId});
 const payment={id:crypto.randomUUID(),amount,date:fields.date,wallet:fields.wallet,transactionId:movement.transaction.id};
 return {...movement.data,loans:data.loans.map(item=>item.id===loanId?{...item,repayments:[...item.repayments,payment]}:item)};
}
