import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetError,validateBudget,createWallet,createTransaction,compareTransactions} from '../src/budget.js';
import {starterWallets,migrateWallets,netWorth} from '../src/wallets.js';

const base=()=>({schemaVersion:3,hasAddedWallet:false,wallets:[...starterWallets(),{id:'checking',name:'Checking',kind:'asset',balance:0},{id:'credit',name:'Credit',kind:'liability',balance:0}],transactions:[]});
const walletFields={name:'Savings',purpose:'Emergency fund',amount:'0',kind:'asset',provider:'gcash',network:'visa'};
const transactionFields={name:'Coffee',amount:'0.10',type:'expense',wallet:'checking',date:'2026-11-02',category:'Food & drinks'};

test('wallet creation trims names and leaves input untouched',()=>{
 const data=base(),result=createWallet(data,{...walletFields,name:' Savings '});
 assert.equal(result.wallets.at(-1).name,'Savings');assert.equal(result.wallets.at(-1).balance,0);assert.equal(data.wallets.length,4);assert.equal(result.hasAddedWallet,true);validateBudget(result);
});
test('wallet names and purposes cannot be whitespace',()=>{
 assert.throws(()=>createWallet(base(),{...walletFields,name:'   '}),BudgetError);
 assert.throws(()=>createWallet(base(),{...walletFields,purpose:'   '}),BudgetError);
});
test('Maya selection is saved and missing card designs cannot fall back to Folio',()=>{
 for(const provider of ['maya','Maya',' MAYA '])assert.equal(createWallet(base(),{...walletFields,provider}).wallets.at(-1).provider,'maya');
 for(const provider of ['',undefined,'unknown'])assert.throws(()=>createWallet(base(),{...walletFields,provider}),BudgetError);
});
test('amounts reject missing, negative, non-finite, oversized, and fractional-cent values',()=>{
 for(const amount of ['',null,'-1','NaN','Infinity','100000001','0.001'])assert.throws(()=>createWallet(base(),{...walletFields,amount}),BudgetError);
 assert.throws(()=>createTransaction(base(),{...transactionFields,amount:'0'}),BudgetError);
});
test('transactions calculate balances in centavos',()=>{
 let data=base();data.wallets[2].balance=.3;
 data=createTransaction(data,transactionFields);assert.equal(data.wallets[2].balance,.2);
 data=createTransaction(data,transactionFields);assert.equal(data.wallets[2].balance,.1);
 data=createTransaction(data,transactionFields);assert.equal(data.wallets[2].balance,0);
 assert.equal(data.transactions.length,3);assert.equal(new Set(data.transactions.map(t=>t.id)).size,3);
});
test('expenses increase liabilities and income reduces them',()=>{
 let data=base();data.wallets[3].balance=100;
 data=createTransaction(data,{...transactionFields,wallet:'credit',amount:'20'});assert.equal(data.wallets[3].balance,120);
 data=createTransaction(data,{...transactionFields,wallet:'credit',type:'income',amount:'30'});assert.equal(data.wallets[3].balance,90);
});
test('transactions reject blank descriptions, unknown wallets, invalid types, and impossible dates',()=>{
 for(const change of [{name:' '},{wallet:'deleted'},{type:'invalid'},{date:'2026-02-30'},{date:'invalid'}])assert.throws(()=>createTransaction(base(),{...transactionFields,...change}),BudgetError);
});
test('saved data validation rejects broken records and future schema versions',()=>{
 for(const value of [{}, {...base(),schemaVersion:100},{...base(),wallets:[...starterWallets(),starterWallets()[0]]},{...base(),wallets:[{id:'bad',name:'Broken',balance:'5'}]},{...base(),transactions:[{id:1,name:'Invalid',amount:10,date:'2026-11-02',wallet:'missing',category:'Other'}]}])assert.throws(()=>validateBudget(value),BudgetError);
});
test('legacy migration preserves balances, user wallets, and transaction references',()=>{
 const legacy={schemaVersion:2,hasAddedWallet:true,wallets:[{id:'main',name:'Main',balance:10},{id:'cash',name:'Cash',balance:20},{id:'custom',name:'GCash',balance:30}],transactions:[{id:1,name:'Coffee',wallet:'cash',amount:-5,date:'2026-11-02',category:'Other'}]};
 const migrated=migrateWallets(legacy);validateBudget(migrated);assert.equal(migrated.wallets[0].balance,30);assert.equal(migrated.wallets[2].balance,30);assert.equal(migrated.transactions[0].wallet,'assets');assert.deepEqual(migrateWallets(migrated),migrated);
});
test('net worth uses precise centavos and subtracts liabilities',()=>{
 assert.equal(netWorth([{kind:'asset',balance:.1},{kind:'asset',balance:.2}]),.3);
 assert.equal(netWorth([{kind:'asset',balance:50000},{kind:'liability',balance:15000}]),35000);
});
test('new UUID transactions and legacy numeric IDs sort newest first',()=>{
 const result=[{id:123,date:'2026-11-02'},{id:'new',createdAt:200,date:'2026-11-02'},{id:'older',createdAt:300,date:'2026-11-01'}].sort(compareTransactions);
 assert.deepEqual(result.map(t=>t.id),['new',123,'older']);
});
