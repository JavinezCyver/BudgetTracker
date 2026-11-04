import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoal,updateGoal,contributeToGoal,releaseGoalSavings,deleteGoal,goalSaved,goalStatus,availableForGoals} from '../src/goals.js';
import {walletReserved} from '../src/goal-balances.js';
import {BudgetError,validateBudget,createTransaction,deleteWallet} from '../src/budget.js';
import {starterWallets,netWorth} from '../src/wallets.js';
import {createLoan} from '../src/loans.js';
const today='2026-11-03',fields={name:'Travel',target:'2000',targetDate:'2026-12-01',note:'A trip'};
const base=()=>({schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),{id:'bank',name:'Savings',kind:'asset',balance:5000}],transactions:[]});
const created=()=>createGoal(base(),fields);
const funded=()=>{const data=created();return contributeToGoal(data,data.goals[0].id,{wallet:'bank',amount:'1000',date:today},today);};
test('goals start empty and reserve existing wallet money without creating income or expense',()=>{
 const original=created(),next=contributeToGoal(original,original.goals[0].id,{wallet:'bank',amount:'1000',date:today},today);
 assert.equal(goalSaved(next.goals[0]),1000);assert.equal(next.wallets[2].balance,5000);assert.equal(next.transactions.length,0);assert.equal(netWorth(next.wallets),5000);assert.equal(availableForGoals(next,'bank'),4000);assert.equal(goalSaved(original.goals[0]),0);validateBudget(next);
});
test('contributions cannot exceed a goal target or available funds across goals',()=>{
 let data=funded(),id=data.goals[0].id;assert.throws(()=>contributeToGoal(data,id,{wallet:'bank',amount:'1001',date:today},today),BudgetError);
 data=createGoal(data,{...fields,name:'Other',target:'10000'});assert.throws(()=>contributeToGoal(data,data.goals[1].id,{wallet:'bank',amount:'4500',date:today},today),BudgetError);
});
test('releasing savings frees money without changing wallet cash',()=>{
 const data=funded(),next=releaseGoalSavings(data,data.goals[0].id,{wallet:'bank',amount:'400',date:today},today);
 assert.equal(goalSaved(next.goals[0]),600);assert.equal(availableForGoals(next,'bank'),4400);assert.equal(next.wallets[2].balance,5000);validateBudget(next);
 assert.throws(()=>releaseGoalSavings(data,data.goals[0].id,{wallet:'bank',amount:'1001',date:today},today),BudgetError);
});
test('reserved savings are protected from expense and lending entries',()=>{
 const data=funded();assert.throws(()=>createTransaction(data,{name:'Purchase',amount:'4500',wallet:'bank',type:'expense',date:today,category:'Shopping'}),BudgetError);
 assert.throws(()=>createLoan(data,{person:'Alex',amount:'4500',wallet:'bank',issuedDate:today},today),BudgetError);
 const spent=createTransaction(data,{name:'Purchase',amount:'3000',wallet:'bank',type:'expense',date:today,category:'Shopping'});assert.equal(spent.wallets[2].balance,2000);validateBudget(spent);
});
test('goal targets cannot be lowered below the saved amount',()=>{
 const data=funded(),id=data.goals[0].id;assert.throws(()=>updateGoal(data,id,{...fields,target:'500'}),BudgetError);
 const next=updateGoal(data,id,{...fields,name:'New name',target:'3000'});assert.equal(next.goals[0].name,'New name');assert.equal(goalSaved(next.goals[0]),1000);
});
test('completed and overdue states follow saved balances and target dates',()=>{
 let data=funded();data=contributeToGoal(data,data.goals[0].id,{wallet:'bank',amount:'1000',date:today},today);assert.equal(goalStatus(data.goals[0],today),'completed');
 assert.equal(goalStatus({...data.goals[0],entries:[],targetDate:'2026-11-02'},today),'overdue');
});
test('deleting a goal releases its allocations and leaves wallet cash alone',()=>{
 const data=funded(),next=deleteGoal(data,data.goals[0].id);assert.equal(next.goals.length,0);assert.equal(walletReserved(next,'bank'),0);assert.equal(next.wallets[2].balance,5000);validateBudget(next);
});
test('deleting a wallet removes linked allocations while retaining the goal',()=>{
 const next=deleteWallet(funded(),'bank');assert.equal(next.goals.length,1);assert.equal(goalSaved(next.goals[0]),0);validateBudget(next);
});
test('invalid goal names, amounts, dates, and wallets are rejected',()=>{
 for(const change of [{name:' '},{target:'0'},{target:'0.001'},{targetDate:'2026-02-30'}])assert.throws(()=>createGoal(base(),{...fields,...change}),BudgetError);
 const data=created();for(const change of [{wallet:'liabilities'},{amount:'-1'},{date:'2026-11-04'}])assert.throws(()=>contributeToGoal(data,data.goals[0].id,{wallet:'bank',amount:'100',date:today,...change},today),BudgetError);
});
test('savings history survives serialization and uses precise centavos',()=>{
 let data=created(),id=data.goals[0].id;for(const amount of ['0.10','0.20'])data=contributeToGoal(data,id,{wallet:'bank',amount,date:today},today);
 const saved=JSON.parse(JSON.stringify(data));validateBudget(saved);assert.equal(goalSaved(saved.goals[0]),.3);assert.equal(availableForGoals(saved,'bank'),4999.7);
});
