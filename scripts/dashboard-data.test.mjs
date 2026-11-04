import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyCashflow,recentTransactions} from '../src/dashboard-data.js';
import {compareTransactions} from '../src/budget.js';

test('weekly cash flow includes month-end days and sums exact centavos',()=>{
 assert.deepEqual(weeklyCashflow([
  {date:'2026-11-01',amount:0.1},{date:'2026-11-07',amount:0.2},
  {date:'2026-11-08',amount:-1.25},{date:'2026-11-28',amount:20},
  {date:'2026-11-29',amount:-2},{date:'2026-11-30',amount:5},
 ]),[[0.3,0],[0,1.25],[0,0],[20,0],[5,2]]);
 assert.deepEqual(weeklyCashflow([]),[[0,0],[0,0],[0,0],[0,0],[0,0]]);
});

test('bounded recent selection matches stable full sorting without changing saved records',()=>{
 const transactions=Array.from({length:10000},(_,id)=>({id,date:`2026-11-${String(1+(id*17)%30).padStart(2,'0')}`,createdAt:id%7}));
 const original=structuredClone(transactions);
 assert.deepEqual(recentTransactions(transactions),[...transactions].sort(compareTransactions).slice(0,5));
 assert.deepEqual(transactions,original);
 assert.deepEqual(recentTransactions([]),[]);
 assert.deepEqual(recentTransactions(transactions.slice(0,3)),[...transactions.slice(0,3)].sort(compareTransactions));
});
