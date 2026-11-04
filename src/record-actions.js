// UI actions are intent-only on Tauri. Rust owns validation, IDs, arithmetic and writes.
// The browser build retains its local JS engine until a WASM target can be installed.
import * as budget from './budget.js';
import * as loans from './loans.js';
import * as goals from './goals.js';
import * as investments from './investments.js';
import * as plans from './budget-plan.js';
export const nativeBackend=()=>typeof window!=='undefined'&&Boolean(window.__TAURI__);
const intent=(data,type,fields={},id='')=>({nativeAction:{type,fields,id},revision:data._revision||0});
export const createWallet=(data,fields)=>nativeBackend()?intent(data,'create_wallet',fields):budget.createWallet(data,fields);
export const createTransaction=(data,fields)=>nativeBackend()?intent(data,'create_transaction',fields):budget.createTransaction(data,fields);
export const deleteWallet=(data,id)=>nativeBackend()?intent(data,'delete_wallet',{},id):budget.deleteWallet(data,id);
export const createLoan=(data,fields)=>nativeBackend()?intent(data,'create_loan',fields):loans.createLoan(data,fields);
export const recordRepayment=(data,id,fields)=>nativeBackend()?intent(data,'repayment',fields,id):loans.recordRepayment(data,id,fields);
export const createGoal=(data,fields)=>nativeBackend()?intent(data,'create_goal',fields):goals.createGoal(data,fields);
export const updateGoal=(data,id,fields)=>nativeBackend()?intent(data,'update_goal',fields,id):goals.updateGoal(data,id,fields);
export const deleteGoal=(data,id)=>nativeBackend()?intent(data,'delete_goal',{},id):goals.deleteGoal(data,id);
export const contributeToGoal=(data,id,fields)=>nativeBackend()?intent(data,'contribute_goal',fields,id):goals.contributeToGoal(data,id,fields);
export const releaseGoalSavings=(data,id,fields)=>nativeBackend()?intent(data,'release_goal',fields,id):goals.releaseGoalSavings(data,id,fields);
export const createInvestment=(data,fields)=>nativeBackend()?intent(data,'create_investment',fields):investments.createInvestment(data,fields);
export const tradeInvestment=(data,id,fields)=>nativeBackend()?intent(data,'trade_investment',fields,id):investments.tradeInvestment(data,id,fields);
export const updateInvestmentPrice=(data,id,fields)=>nativeBackend()?intent(data,'investment_price',fields,id):investments.updateInvestmentPrice(data,id,fields);
export const saveBudgetPlan=(data,fields)=>nativeBackend()?intent(data,'save_budget',fields):plans.saveBudgetPlan(data,fields);
export const deleteBudgetPlan=(data,month)=>nativeBackend()?intent(data,'delete_budget',{},month):plans.deleteBudgetPlan(data,month);
export const assignAction=(data,assignments)=>({...intent(data,'assign_transactions'),nativeAction:{type:'assign_transactions',assignments:[...assignments]}});
export const appearanceAction=(data,id,fields)=>nativeBackend()?intent(data,'wallet_appearance',fields,id):{...data,wallets:data.wallets.map(w=>w.id===id?{...w,...fields}:w)};
export const preferencesAction=(data,fields)=>nativeBackend()?intent(data,'preferences',fields):{...data,preferences:{...data.preferences,...fields}};
export const reorderAction=(data,from,to,wallets)=>nativeBackend()?{...intent(data,'reorder_wallets',{},from),nativeAction:{type:'reorder_wallets',id:from,target:to}}:{...data,wallets};
