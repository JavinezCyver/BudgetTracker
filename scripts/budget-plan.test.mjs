import test from 'node:test';
import assert from 'node:assert/strict';
import {saveBudgetPlan,deleteBudgetPlan,budgetOverview,validBudgetMonth} from '../src/budget-plan.js';
import {validateBudget} from '../src/budget.js';
import {starterWallets} from '../src/wallets.js';
const base=()=>({schemaVersion:3,wallets:starterWallets(),transactions:[]});
const fields={month:'2026-11',totalLimit:'500',allocations:[{category:'Groceries',limit:'250'}]};
test('monthly limits save and edit without duplicate plans or cash changes',()=>{
 const data=saveBudgetPlan(base(),fields),next=saveBudgetPlan(data,{...fields,totalLimit:'600'});
 assert.equal(next.budgetPlans.length,1);assert.equal(next.budgetPlans[0].id,data.budgetPlans[0].id);assert.deepEqual(next.wallets,data.wallets);validateBudget(next);
});
test('spending groups categories without case sensitivity and separates months',()=>{
 const data=saveBudgetPlan(base(),fields);data.transactions=[{amount:-200,category:'groceries',date:'2026-11-02'},{amount:-100,category:'Shopping',date:'2026-11-03'},{amount:-900,category:'Groceries',date:'2026-10-03'},{amount:1000,category:'Income',date:'2026-11-03'}];
 const view=budgetOverview(data,'2026-11');assert.equal(view.spent,300);assert.equal(view.remaining,200);assert.equal(view.count,2);assert.equal(view.categories[0].remaining,50);assert.equal(view.categories[1].limit,null);
});
test('lending and investment purchases do not consume an expense budget',()=>{
 const data=saveBudgetPlan(base(),fields);data.transactions=[{amount:-500,kind:'loan-out',category:'Money lent',date:'2026-11-03'},{amount:-500,kind:'investment-buy',category:'Investments',date:'2026-11-03'}];assert.equal(budgetOverview(data,'2026-11').spent,0);
});
test('overspending remains visible as negative remaining money',()=>{
 const data=saveBudgetPlan(base(),fields);data.transactions=[{amount:-600,category:'Groceries',date:'2026-11-03'}];const view=budgetOverview(data,'2026-11');assert.equal(view.remaining,-100);assert.equal(view.categories[0].remaining,-350);
});
test('invalid limits, months, duplicate categories and overallocated plans are rejected',()=>{
 for(const totalLimit of ['',0,-1,'1.001',Infinity])assert.throws(()=>saveBudgetPlan(base(),{...fields,totalLimit}));
 assert.equal(validBudgetMonth('2026-13'),false);assert.throws(()=>saveBudgetPlan(base(),{...fields,month:'2026-13'}));
 assert.throws(()=>saveBudgetPlan(base(),{...fields,allocations:[{category:'Food',limit:300},{category:'food',limit:10}]}));
 assert.throws(()=>saveBudgetPlan(base(),{...fields,allocations:[{category:'Food',limit:501}]}));
});
test('deleting a plan leaves records and wallets intact and other months survive',()=>{
 let data=saveBudgetPlan(base(),fields);data=saveBudgetPlan(data,{...fields,month:'2026-12'});const next=deleteBudgetPlan(data,'2026-11');assert.equal(next.budgetPlans.length,1);assert.deepEqual(next.wallets,data.wallets);assert.deepEqual(next.transactions,data.transactions);assert.equal(budgetOverview(next,'2026-11').remaining,null);validateBudget(JSON.parse(JSON.stringify(next)));
});
