import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeEngine} from './native-engine.mjs';
import * as b from '../src/budget.js';
import * as l from '../src/loans.js';
import * as g from '../src/goals.js';
import * as i from '../src/investments.js';
import * as p from '../src/budget-plan.js';
import {starterWallets,netWorth} from '../src/wallets.js';
const today='2026-11-04';
function canonical(data){
 const ids=new Map();const label=(items,prefix)=>items?.forEach((item,index)=>{ids.set(item.id,prefix+index)});
 label(data.wallets,'w');label(data.transactions,'t');label(data.loans,'l');label(data.goals,'g');label(data.investments,'i');label(data.budgetPlans,'b');
 data.loans?.forEach((item,index)=>label(item.repayments,'p'+index+'-'));data.goals?.forEach((item,index)=>label(item.entries,'e'+index+'-'));data.investments?.forEach((item,index)=>label(item.trades,'r'+index+'-'));
 const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['createdAt','_revision'].includes(key)).map(([key,value])=>[key,clean(value)])):ids.has(value)?ids.get(value):value;
 return clean(JSON.parse(JSON.stringify(data)));
}
test('Rust and browser engines agree across the full financial lifecycle',()=>{
 let data={schemaVersion:3,hasAddedWallet:false,wallets:starterWallets(),transactions:[]};let transitions=0;
 const step=(type,fields,legacy,id='')=>{const original=structuredClone(data),rust=nativeEngine({data,action:{type,fields,id},today}),js=legacy(data);assert.deepEqual(canonical(rust),canonical(js),type);assert.deepEqual(data,original,'input changed');b.validateBudget(rust);data=rust;transitions++};
 step('create_wallet',{name:'Savings',purpose:'Emergency fund',amount:'10000',kind:'asset',provider:'maya',network:'visa'},d=>b.createWallet(d,{name:'Savings',purpose:'Emergency fund',amount:'10000',kind:'asset',provider:'maya',network:'visa'}));
 const wallet=data.wallets[2].id;
 for(const type of ['expense','income']){const fields={name:'Record',type,amount:'0.10',date:today,wallet,category:'Groceries'};step('create_transaction',fields,d=>b.createTransaction(d,fields));}
 const goal={name:'Trip',target:'1500',note:'',targetDate:'2027-01-01'};step('create_goal',goal,d=>g.createGoal(d,goal));const gid=data.goals[0].id;
 for(const [type,fn,amount]of [['contribute_goal',g.contributeToGoal,'1000'],['release_goal',g.releaseGoalSavings,'250']]){const fields={wallet,date:today,amount};step(type,fields,d=>fn(d,gid,fields,today),gid);}
 const updated={...goal,name:'Holiday',target:'2000'};step('update_goal',updated,d=>g.updateGoal(d,gid,updated),gid);
 const loan={person:'Alex',amount:'500',wallet,issuedDate:today,dueDate:'2026-12-01',note:'Lunch',existing:false};step('create_loan',loan,d=>l.createLoan(d,loan,today));const lid=data.loans[0].id;
 for(const amount of ['200','300']){const fields={amount,wallet,date:today};step('repayment',fields,d=>l.recordRepayment(d,lid,fields,today),lid);}
 const holding={name:'Fund',symbol:'FUND',type:'Funds',units:'10',price:'10',fee:'1',wallet,date:today,existing:false,currentPrice:''};step('create_investment',holding,d=>i.createInvestment(d,holding,today));const hid=data.investments[0].id;
 const quote={price:'12',date:today};step('investment_price',quote,d=>i.updateInvestmentPrice(d,hid,quote,today),hid);
 for(const fields of [{kind:'buy',units:'5',price:'10',fee:'0',wallet,date:today},{kind:'sell',units:'4',price:'15',fee:'1',wallet,date:today},{kind:'sell',units:'11',price:'15',fee:'1',wallet,date:today}])step('trade_investment',fields,d=>i.tradeInvestment(d,hid,fields,today),hid);
 const plan={month:'2026-11',totalLimit:'1000',allocations:[{category:'Groceries',limit:'300'}]};step('save_budget',plan,d=>p.saveBudgetPlan(d,plan));step('save_budget',{...plan,totalLimit:'1500'},d=>p.saveBudgetPlan(d,{...plan,totalLimit:'1500'}));
 const analysis=nativeEngine({op:'analyze',data,today});assert.equal(analysis.netWorth,netWorth(data.wallets,data.loans,data.investments));assert.deepEqual(analysis.investmentTotals,i.investmentTotals(data.investments));assert.deepEqual(analysis.lendingTotals,l.lendingTotals(data.loans,today));assert.deepEqual(analysis.budgets['2026-11'],p.budgetOverview(data,'2026-11'));
 step('delete_budget',{},d=>p.deleteBudgetPlan(d,'2026-11'),'2026-11');step('delete_goal',{},d=>g.deleteGoal(d,gid),gid);step('delete_wallet',{},d=>b.deleteWallet(d,wallet),wallet);assert.ok(transitions>=20);
});
test('Rust rejects malformed mutation fields rather than trusting the renderer',()=>{
 const data={schemaVersion:3,wallets:starterWallets(),transactions:[]};
 for(const amount of ['',null,true,-1,'0.001','1e400','100000001'])assert.throws(()=>nativeEngine({data,action:{type:'create_wallet',fields:{name:'Test',purpose:'Cash',amount,kind:'asset',provider:'maya'}}}));
 assert.throws(()=>nativeEngine({data,action:{type:'save_data',data:{wallets:[]}}}));
});
