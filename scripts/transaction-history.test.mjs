import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHistoryFilters,filterTransactions,historyTotals,historyPage} from '../src/transaction-history.js';

const today=new Date(2026,10,3);
const data={wallets:[{id:'mari',name:'MariBank Savings'},{id:'maya',name:'Maya'}],transactions:[
 {id:'old',createdAt:1,name:'Rent',category:'Housing',wallet:'mari',date:'2026-09-01',amount:-5000},
 {id:'boundary',createdAt:2,name:'Coffee',category:'Food & drinks',wallet:'mari',date:'2026-10-05',amount:-.1},
 {id:'salary',createdAt:3,name:'Salary',category:'Income',wallet:'maya',date:'2026-11-01',amount:10000},
 {id:'food',createdAt:4,name:'Weekly groceries',category:'Groceries',wallet:'mari',date:'2026-11-03',amount:-1000},
 {id:'future',createdAt:5,name:'Scheduled',category:'Other',wallet:'maya',date:'2026-11-05',amount:-.2},
]};
const filter=fields=>filterTransactions(data,{...defaultHistoryFilters(),...fields},today);
test('history includes all records newest first',()=>assert.deepEqual(filter({}).map(transaction=>transaction.id),['future','food','salary','boundary','old']));
test('income and expense filters use transaction signs',()=>{
 assert.deepEqual(filter({type:'income'}).map(transaction=>transaction.id),['salary']);assert.equal(filter({type:'expense'}).length,4);
});
test('search matches descriptions, categories, and wallet names without case sensitivity',()=>{
 assert.equal(filter({query:'WEEKLY'}).length,1);assert.equal(filter({query:'housing'})[0].id,'old');assert.equal(filter({query:'MariBank'}).length,3);
});
test('wallet and category filters combine',()=>assert.deepEqual(filter({wallet:'mari',category:'Groceries'}).map(transaction=>transaction.id),['food']));
test('month and last-30-days filters use calendar dates, including the lower boundary',()=>{
 assert.deepEqual(filter({range:'month'}).map(transaction=>transaction.id),['future','food','salary']);
 assert.deepEqual(filter({range:'30days'}).map(transaction=>transaction.id),['food','salary','boundary']);
});
test('oldest and largest amount sorts work',()=>{
 assert.equal(filter({sort:'oldest'})[0].id,'old');assert.equal(filter({sort:'amount'})[0].id,'salary');
});
test('totals use centavos and exclude wallet opening balances',()=>{
 assert.deepEqual(historyTotals(filter({})),{income:10000,expenses:6000.3,net:3999.7});assert.deepEqual(historyTotals([]),{income:0,expenses:0,net:0});
});
test('pagination clamps stale page numbers and handles empty lists',()=>{
 const transactions=Array.from({length:45},(_,id)=>({id}));assert.equal(historyPage(transactions,2).items.length,20);assert.equal(historyPage(transactions,100).page,3);assert.equal(historyPage(transactions,100).items.length,5);assert.equal(historyPage([],3).start,0);
});
test('search text is literal, so punctuation does not cause errors',()=>assert.equal(filter({query:'<script>['}).length,0));
