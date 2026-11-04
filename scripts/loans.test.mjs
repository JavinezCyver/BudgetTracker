import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoan,recordRepayment,outstanding,loanStatus,lendingTotals} from '../src/loans.js';
import {starterWallets,netWorth} from '../src/wallets.js';
import {validateBudget,BudgetError,deleteWallet} from '../src/budget.js';
import {filterTransactions,historyTotals,defaultHistoryFilters} from '../src/transaction-history.js';
const today='2026-11-03';
const base=()=>({schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),{id:'cash',name:'Cash',kind:'asset',balance:1000}],transactions:[]});
const fields={person:'Alex',amount:'200',issuedDate:today,dueDate:'2026-11-10',wallet:'cash',existing:false,note:'Lunch'};
test('lending moves cash into a receivable without changing net worth',()=>{
 const original=base(),next=createLoan(original,fields,today);
 assert.equal(next.wallets[2].balance,800);assert.equal(outstanding(next.loans[0]),200);assert.equal(netWorth(next.wallets,next.loans),1000);assert.equal(original.wallets[2].balance,1000);assert.equal(next.transactions[0].kind,'loan-out');validateBudget(next);
});
test('recording an existing debt does not deduct cash again',()=>{
 const next=createLoan(base(),{...fields,existing:true},today);assert.equal(next.wallets[2].balance,1000);assert.equal(next.transactions.length,0);assert.equal(next.loans[0].wallet,null);validateBudget(next);
});
test('partial and final repayments credit the wallet once and close the record',()=>{
 let next=createLoan(base(),fields,today),id=next.loans[0].id;
 next=recordRepayment(next,id,{amount:'50',date:today,wallet:'cash'},today);assert.equal(next.wallets[2].balance,850);assert.equal(outstanding(next.loans[0]),150);assert.equal(netWorth(next.wallets,next.loans),1000);
 next=recordRepayment(next,id,{amount:'150',date:today,wallet:'cash'},today);assert.equal(next.wallets[2].balance,1000);assert.equal(outstanding(next.loans[0]),0);assert.equal(loanStatus(next.loans[0],today),'paid');assert.equal(next.transactions.length,3);validateBudget(next);
});
test('principal and repayments stay out of ordinary income and expense totals',()=>{
 let data=createLoan(base(),fields,today);data=recordRepayment(data,data.loans[0].id,{amount:'50',date:today,wallet:'cash'},today);
 assert.deepEqual(historyTotals(data.transactions),{income:0,expenses:0,net:0});
 assert.equal(filterTransactions(data,{...defaultHistoryFilters(),type:'income'}).length,0);assert.equal(filterTransactions(data,{...defaultHistoryFilters(),type:'expense'}).length,0);assert.equal(filterTransactions(data,defaultHistoryFilters()).length,2);
});
test('overdue detection and totals follow the due date and outstanding amount',()=>{
 const data=createLoan(base(),{...fields,issuedDate:'2026-11-01',dueDate:'2026-11-02'},today);
 assert.equal(loanStatus(data.loans[0],today),'overdue');assert.deepEqual(lendingTotals(data.loans,today),{owed:200,overdue:200,repaid:0});assert.equal(loanStatus(data.loans[0],'2026-11-02'),'open');
});
test('repayments reject overpayment, nonexistent records, and invalid dates',()=>{
 const data=createLoan(base(),fields,today),id=data.loans[0].id;
 for(const change of [{amount:'201'},{amount:'0'},{amount:'0.001'},{date:'2026-11-02'},{date:'2026-11-04'},{wallet:'missing'}])assert.throws(()=>recordRepayment(data,id,{amount:'100',date:today,wallet:'cash',...change},today),BudgetError);
 assert.throws(()=>recordRepayment(data,'missing',{amount:'1',date:today,wallet:'cash'},today),BudgetError);
});
test('lending rejects blank people, invalid dates, and non-asset wallets',()=>{
 for(const change of [{person:' '},{amount:'-1'},{amount:'100000001'},{issuedDate:'2026-11-04'},{dueDate:'2026-11-01'},{wallet:'liabilities'}])assert.throws(()=>createLoan(base(),{...fields,...change},today),BudgetError);
});
test('lending and repayment records survive serialization',()=>{
 let data=createLoan(base(),fields,today);data=recordRepayment(data,data.loans[0].id,{amount:'0.10',date:today,wallet:'cash'},today);
 const saved=JSON.parse(JSON.stringify(data));validateBudget(saved);assert.equal(outstanding(saved.loans[0]),199.9);assert.deepEqual(saved.loans,data.loans);
});
test('wallet deletion removes source lending records and matching transactions',()=>{
 const next=deleteWallet(createLoan(base(),fields,today),'cash');assert.equal(next.loans.length,0);assert.equal(next.transactions.length,0);validateBudget(next);
});
test('deleting a repayment wallet removes its repayment and keeps other cash intact',()=>{
 let data=base();data.wallets.push({id:'bank',name:'Bank',kind:'asset',balance:0});data=createLoan(data,fields,today);data=recordRepayment(data,data.loans[0].id,{amount:'50',date:today,wallet:'bank'},today);
 const next=deleteWallet(data,'bank');assert.equal(outstanding(next.loans[0]),200);assert.equal(next.wallets.find(wallet=>wallet.id==='cash').balance,800);validateBudget(next);
});
