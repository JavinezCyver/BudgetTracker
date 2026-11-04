import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvestment,tradeInvestment,updateInvestmentPrice,investmentTotals,holdingValue} from '../src/investments.js';
import {BudgetError,validateBudget,deleteWallet} from '../src/budget.js';
import {starterWallets,netWorth} from '../src/wallets.js';
import {historyTotals,filterTransactions,defaultHistoryFilters} from '../src/transaction-history.js';
import {createGoal,contributeToGoal} from '../src/goals.js';
const today='2026-11-03';
const base=()=>({schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),{id:'bank',name:'Savings',kind:'asset',balance:1000}],transactions:[]});
const fields={name:'Example Fund',symbol:'fund',type:'Funds',units:'10',price:'10',fee:'0',date:today,wallet:'bank',existing:false};
const bought=()=>createInvestment(base(),fields,today);
test('purchase moves cash into a holding without duplicating wealth',()=>{
 const original=base(),data=createInvestment(original,fields,today);assert.equal(data.wallets[2].balance,900);assert.equal(data.investments[0].costBasis,100);assert.equal(holdingValue(data.investments[0]),100);assert.equal(netWorth(data.wallets,[],data.investments),1000);assert.equal(original.wallets[2].balance,1000);assert.equal(data.investments[0].symbol,'FUND');validateBudget(data);
});
test('existing holdings do not deduct a wallet twice',()=>{
 const data=createInvestment(base(),{...fields,existing:true},today);assert.equal(data.wallets[2].balance,1000);assert.equal(data.transactions.length,0);assert.equal(data.investments[0].trades[0].wallet,null);validateBudget(data);
});
test('valuation changes portfolio assets but never wallet cash or transaction history',()=>{
 const data=bought(),next=updateInvestmentPrice(data,data.investments[0].id,{price:'12',date:today},today);assert.equal(next.wallets[2].balance,900);assert.equal(next.transactions.length,1);assert.equal(holdingValue(next.investments[0]),120);assert.equal(netWorth(next.wallets,[],next.investments),1020);assert.equal(investmentTotals(next.investments).unrealized,20);validateBudget(next);
});
test('partial sale reduces average cost basis and records realized profit',()=>{
 const data=bought(),next=tradeInvestment(data,data.investments[0].id,{kind:'sell',units:'4',price:'15',fee:'0',date:today,wallet:'bank'},today),holding=next.investments[0];
 assert.equal(next.wallets[2].balance,960);assert.equal(holding.units,6);assert.equal(holding.costBasis,60);assert.equal(holding.trades[1].gain,20);assert.equal(holdingValue(holding),90);assert.equal(investmentTotals(next.investments).gain,50);assert.equal(netWorth(next.wallets,[],next.investments),1050);validateBudget(next);
});
test('full sale closes a holding and credits net proceeds after fees',()=>{
 const data=bought(),next=tradeInvestment(data,data.investments[0].id,{kind:'sell',units:'10',price:'12',fee:'2',date:today,wallet:'bank'},today);
 assert.equal(next.investments[0].units,0);assert.equal(next.investments[0].costBasis,0);assert.equal(next.wallets[2].balance,1018);assert.equal(investmentTotals(next.investments).realized,18);validateBudget(next);
});
test('purchase fees are included in cost and affect wealth once',()=>{
 const data=createInvestment(base(),{...fields,fee:'1'},today);assert.equal(data.wallets[2].balance,899);assert.equal(data.investments[0].costBasis,101);assert.equal(netWorth(data.wallets,[],data.investments),999);
});
test('additional purchases increase units and cost without recreating the holding',()=>{
 const data=bought(),next=tradeInvestment(data,data.investments[0].id,{kind:'buy',units:'5',price:'20',fee:'0',date:today,wallet:'bank'},today);
 assert.equal(next.investments.length,1);assert.equal(next.investments[0].units,15);assert.equal(next.investments[0].costBasis,200);assert.equal(next.wallets[2].balance,800);validateBudget(next);
});
test('fractional units use exact centavo rounding',()=>{
 const data=createInvestment(base(),{...fields,units:'0.000001',price:'4000000'},today);assert.equal(data.investments[0].costBasis,4);assert.equal(data.wallets[2].balance,996);validateBudget(data);
});
test('capital movements do not inflate ordinary income or expense totals',()=>{
 const data=bought(),next=tradeInvestment(data,data.investments[0].id,{kind:'sell',units:'10',price:'12',date:today,wallet:'bank'},today);
 assert.deepEqual(historyTotals(next.transactions),{income:0,expenses:0,net:0});assert.equal(filterTransactions(next,{...defaultHistoryFilters(),type:'income'}).length,0);assert.equal(filterTransactions(next,defaultHistoryFilters()).length,2);
});
test('purchases cannot spend money reserved for goals',()=>{
 let data=createGoal(base(),{name:'Trip',target:'1000'});data=contributeToGoal(data,data.goals[0].id,{wallet:'bank',amount:'950',date:today},today);
 assert.throws(()=>createInvestment(data,fields,today),BudgetError);
});
test('overselling, invalid quotes, impossible dates, and insufficient cash are rejected',()=>{
 const data=bought(),id=data.investments[0].id;
 assert.throws(()=>tradeInvestment(data,id,{kind:'sell',units:'11',price:'10',date:today,wallet:'bank'},today),BudgetError);
 assert.throws(()=>updateInvestmentPrice(data,id,{price:'-1',date:today},today),BudgetError);
 assert.throws(()=>createInvestment(base(),{...fields,units:'200'},today),BudgetError);
 assert.throws(()=>createInvestment(base(),{...fields,date:'2026-11-04'},today),BudgetError);
});
test('deleting a funding wallet preserves investments and detaches removed history links',()=>{
 const data=deleteWallet(bought(),'bank');assert.equal(data.investments.length,1);assert.equal(holdingValue(data.investments[0]),100);assert.equal(data.investments[0].trades[0].wallet,null);assert.equal(data.transactions.length,0);validateBudget(data);
});
test('investment records survive serialization',()=>{
 const data=JSON.parse(JSON.stringify(bought()));validateBudget(data);assert.equal(holdingValue(data.investments[0]),100);
});
