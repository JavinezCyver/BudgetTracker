import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteWallet,validateBudget,BudgetError} from '../src/budget.js';
import {starterWallets,netWorth} from '../src/wallets.js';

function fixture(){return {schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),{id:'mari',name:'MariBank',balance:4000,kind:'asset'},{id:'gcash',name:'GCash',balance:2000,kind:'asset'}],transactions:[{id:'expense',wallet:'mari',name:'Shopping',category:'Shopping',amount:-1000,date:'2026-11-03'},{id:'income',wallet:'mari',name:'Deposit',category:'Income',amount:500,date:'2026-11-02'},{id:'other',wallet:'gcash',name:'Coffee',category:'Other',amount:-50,date:'2026-11-03'}]};}
test('deletes a funded wallet and every related transaction',()=>{
 const original=fixture(),next=deleteWallet(original,'mari');
 assert.equal(next.wallets.some(wallet=>wallet.id==='mari'),false);
 assert.deepEqual(next.transactions.map(transaction=>transaction.id),['other']);
 assert.equal(netWorth(next.wallets),2000);validateBudget(next);
 assert.equal(original.wallets.length,4);assert.equal(original.transactions.length,3);
});
test('other wallet balances and transaction dates stay unchanged',()=>{
 const data=fixture(),next=deleteWallet(data,'mari');
 assert.deepEqual(next.wallets.find(wallet=>wallet.id==='gcash'),data.wallets.find(wallet=>wallet.id==='gcash'));
 assert.deepEqual(next.transactions[0],data.transactions[2]);assert.equal(next.hasAddedWallet,true);
});
test('deleting the last real wallet clears history and the added-wallet flag',()=>{
 const next=deleteWallet(deleteWallet(fixture(),'mari'),'gcash');
 assert.equal(next.wallets.length,2);assert.equal(next.transactions.length,0);assert.equal(next.hasAddedWallet,false);assert.equal(netWorth(next.wallets),0);validateBudget(next);
});
test('aggregate accounts and nonexistent wallets cannot be deleted',()=>{
 for(const id of ['assets','liabilities','missing'])assert.throws(()=>deleteWallet(fixture(),id),BudgetError);
});
