import test from 'node:test';
import assert from 'node:assert/strict';
import {repairUnassignedTransactions,assignTransactionWallets,unassignedTransactions} from '../src/wallet-assignment.js';
import {starterWallets,netWorth} from '../src/wallets.js';
import {createTransaction,validateBudget,BudgetError} from '../src/budget.js';

function legacy(){
 const wallets=starterWallets();wallets[0].balance=-1000;
 wallets.push({id:'mari',name:'MariBank',kind:'asset',provider:'maribank',balance:5000});
 return {schemaVersion:3,hasAddedWallet:true,wallets,transactions:[{id:'old',name:'Expense',category:'Other',amount:-1000,wallet:'assets',date:'2026-11-02'}]};
}
test('repairs the ₱5,000 card and ₱1,000 hidden-account expense without changing net worth',()=>{
 const original=legacy(),repaired=repairUnassignedTransactions(original);
 assert.equal(repaired.wallets.find(w=>w.id==='mari').balance,4000);
 assert.equal(repaired.wallets[0].balance,0);assert.equal(repaired.transactions[0].wallet,'mari');
 assert.equal(netWorth(repaired.wallets),netWorth(original.wallets));assert.equal(original.wallets[2].balance,5000);validateBudget(repaired);
});
test('repair is idempotent and never deducts the same expense twice',()=>{
 const repaired=repairUnassignedTransactions(legacy());assert.equal(repairUnassignedTransactions(repaired),repaired);assert.equal(unassignedTransactions(repaired).length,0);
});
test('multiple eligible wallets require a choice',()=>{
 const data=legacy();data.wallets.push({id:'gcash',name:'GCash',kind:'asset',balance:2000});
 assert.equal(repairUnassignedTransactions(data),data);
 const repaired=assignTransactionWallets(data,new Map([['old','mari']]));
 assert.equal(repaired.wallets.find(w=>w.id==='mari').balance,4000);assert.equal(repaired.wallets.find(w=>w.id==='gcash').balance,2000);assert.equal(netWorth(repaired.wallets),6000);
});
test('assignments reject missing wallets or a different account type',()=>{
 assert.throws(()=>assignTransactionWallets(legacy(),new Map([['old','missing']])),BudgetError);
 assert.throws(()=>assignTransactionWallets(legacy(),new Map([['old','liabilities']])),BudgetError);
});
test('new expenses deduct directly from the chosen card',()=>{
 const data=legacy();data.wallets[0].balance=0;data.transactions=[];
 const result=createTransaction(data,{name:'Shopping',amount:'1000',type:'expense',wallet:'mari',category:'Shopping',date:'2026-11-02'});
 assert.equal(result.wallets[2].balance,4000);assert.equal(result.wallets[0].balance,0);assert.equal(netWorth(result.wallets),4000);
});
test('new transactions cannot target the hidden aggregate accounts',()=>{
 for(const wallet of ['assets','liabilities'])assert.throws(()=>createTransaction(legacy(),{name:'Expense',amount:'1000',type:'expense',wallet,category:'Other',date:'2026-11-02'}),BudgetError);
});
