import {BudgetError,cents,fromCents,validDate} from './budget.js';
import {goalSaved,walletReserved,availableForGoals} from './goal-balances.js';
import {addedWallets} from './wallets.js';
import {manilaDateKey} from './app-date.js';
export {goalSaved,availableForGoals} from './goal-balances.js';
export const goalWallets=data=>addedWallets(data.wallets).filter(wallet=>wallet.kind!=='liability');
export const goalStatus=(goal,today=manilaDateKey())=>cents(goalSaved(goal))===cents(goal.target)?'completed':goal.targetDate&&goal.targetDate<today?'overdue':'active';
function amount(value){
 const result=Number(value);
 if(value==null||String(value).trim()===''||!Number.isFinite(result)||result<=0||result>100000000||Math.abs(result*100-cents(result))>.00001)throw new BudgetError('Enter an amount above ₱0.00, up to ₱100,000,000.00, with at most two decimal places.');
 return fromCents(cents(result));
}
function goalFields(fields){
 const name=String(fields.name||'').trim(),note=String(fields.note||'').trim(),target=amount(fields.target),targetDate=fields.targetDate||'';
 if(!name||name.length>80)throw new BudgetError('Enter a goal name, up to 80 characters.');
 if(note.length>200)throw new BudgetError('Keep the note within 200 characters.');
 if(targetDate&&!validDate(targetDate))throw new BudgetError('Choose a valid target date.');
 return {name,note,target,targetDate};
}
export function createGoal(data,fields){return {...data,goals:[...(data.goals||[]),{id:crypto.randomUUID(),...goalFields(fields),entries:[],createdAt:Date.now()}]};}
export function updateGoal(data,id,fields){
 const goal=(data.goals||[]).find(item=>item.id===id);if(!goal)throw new BudgetError('This goal no longer exists.');
 const updated=goalFields(fields);if(cents(updated.target)<cents(goalSaved(goal)))throw new BudgetError('Release some savings before lowering the target below the saved amount.');
 return {...data,goals:data.goals.map(item=>item.id===id?{...item,...updated}:item)};
}
function changeSavings(data,id,fields,direction,today){
 const goal=(data.goals||[]).find(item=>item.id===id);if(!goal)throw new BudgetError('This goal no longer exists.');
 const value=amount(fields.amount),wallet=goalWallets(data).find(item=>item.id===fields.wallet);
 if(!wallet)throw new BudgetError('Choose an asset wallet.');
 if(!validDate(fields.date)||fields.date>today)throw new BudgetError('Choose a valid date on or before today.');
 if(direction>0){
  if(cents(value)>cents(goal.target)-cents(goalSaved(goal)))throw new BudgetError('This amount exceeds the goal’s remaining target.');
  if(cents(value)>cents(availableForGoals(data,wallet.id)))throw new BudgetError('This wallet does not have enough unallocated money.');
 }else{
  const allocated=goal.entries.filter(entry=>entry.wallet===wallet.id).reduce((sum,entry)=>sum+cents(entry.amount),0);
  if(cents(value)>allocated)throw new BudgetError('This amount exceeds the savings reserved in that wallet for this goal.');
 }
 const entry={id:crypto.randomUUID(),amount:value*direction,wallet:wallet.id,date:fields.date,createdAt:Date.now()};
 return {...data,goals:data.goals.map(item=>item.id===id?{...item,entries:[...item.entries,entry]}:item)};
}
export const contributeToGoal=(data,id,fields,today=manilaDateKey())=>changeSavings(data,id,fields,1,today);
export const releaseGoalSavings=(data,id,fields,today=manilaDateKey())=>changeSavings(data,id,fields,-1,today);
export function deleteGoal(data,id){
 if(!(data.goals||[]).some(goal=>goal.id===id))throw new BudgetError('This goal no longer exists.');
 return {...data,goals:data.goals.filter(goal=>goal.id!==id)};
}
