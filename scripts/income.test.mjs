import test from 'node:test';
import assert from 'node:assert/strict';
import {transactionHistory,filterTransactions,defaultHistoryFilters} from '../src/transaction-history.js';
import {createTransaction,deleteWallet} from '../src/budget.js';
import {starterWallets} from '../src/wallets.js';

const today=new Date(2026,10,3),money=value=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value),escape=value=>String(value).replaceAll('<','&lt;').replaceAll('>','&gt;');
const data={schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),{id:'mari',name:'Savings',provider:'maribank',kind:'asset',balance:1000}],transactions:[{id:'pay',name:'Monthly salary',category:'Income',amount:500,wallet:'mari',date:'2026-11-03'},{id:'spend',name:'Unique expense record',category:'Shopping',amount:-100,wallet:'mari',date:'2026-11-03'}]};
test('Income page contains income records and never expense records',()=>{
 const html=transactionHistory({data,today,money,escape,mode:'income'});
 assert.ok(html.includes('Income history'));assert.ok(html.includes('TOTAL INCOME'));assert.ok(html.includes('Monthly salary'));assert.ok(!html.includes('Unique expense record'));assert.ok(html.includes(money(500)));
});
test('opening Income does not lock the Transactions page into an income filter',()=>{
 transactionHistory({data,today,money,escape,mode:'income'});
 const html=transactionHistory({data,today,money,escape});assert.ok(html.includes('Monthly salary'));assert.ok(html.includes('Unique expense record'));
});
test('an expenses-only account has an income-specific empty state',()=>{
 const html=transactionHistory({data:{...data,transactions:[data.transactions[1]]},today,money,escape,mode:'income'});
 assert.ok(html.includes('No income recorded yet'));assert.equal((html.match(/data-history-add/g)||[]).length,1);
});
test('income uses the existing transaction store and credits the receiving wallet once',()=>{
 const next=createTransaction(data,{type:'income',name:'Freelance',amount:'250',wallet:'mari',date:'2026-11-03'});
 assert.equal(next.wallets.at(-1).balance,1250);assert.equal(next.transactions.length,3);
 assert.equal(filterTransactions(next,{...defaultHistoryFilters(),type:'income'},today).length,2);
});
test('wallet deletion removes its income history',()=>{
 const next=deleteWallet(data,'mari');const html=transactionHistory({data:next,today,money,escape,mode:'income'});
 assert.ok(!html.includes('Monthly salary'));assert.ok(html.includes('No income recorded yet'));
});
