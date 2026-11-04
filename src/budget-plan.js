import {BudgetError,cents,fromCents,validDate,isBalanceTransfer} from './budget.js';
export const validBudgetMonth=month=>typeof month==='string'&&/^\d{4}-\d{2}$/.test(month)&&validDate(`${month}-01`);
const key=value=>String(value||'').trim().toLowerCase();
export const expenseCategories=['Food & drinks','Groceries','Shopping','Subscriptions','Transport','Housing','Other'];
function limit(value){
 const amount=Number(value);
 if(value==null||String(value).trim()===''||!Number.isFinite(amount)||amount<=0||amount>100000000||Math.abs(amount*100-cents(amount))>.00001)throw new BudgetError('Enter a spending limit above ₱0.00, up to ₱100,000,000.00, with at most two decimal places.');
 return fromCents(cents(amount));
}
export function saveBudgetPlan(data,fields){
 if(!validBudgetMonth(fields.month))throw new BudgetError('Choose a valid budget month.');
 const totalLimit=limit(fields.totalLimit),seen=new Set();
 if(!Array.isArray(fields.allocations))throw new BudgetError('Category limits are invalid.');
 const allocations=fields.allocations.map(item=>{
  const category=String(item.category||'').trim();
  if(!category||category.length>60||seen.has(key(category)))throw new BudgetError('Choose a different category for each limit.');
  seen.add(key(category));return {category,limit:limit(item.limit)};
 });
 if(allocations.reduce((sum,item)=>sum+cents(item.limit),0)>cents(totalLimit))throw new BudgetError('Category limits cannot add up to more than the monthly limit.');
 const existing=(data.budgetPlans||[]).find(plan=>plan.month===fields.month);
 const plan={id:existing?.id||crypto.randomUUID(),month:fields.month,totalLimit,allocations,createdAt:existing?.createdAt||Date.now()};
 return {...data,budgetPlans:existing?data.budgetPlans.map(item=>item.month===fields.month?plan:item):[...(data.budgetPlans||[]),plan]};
}
export function deleteBudgetPlan(data,month){
 if(!(data.budgetPlans||[]).some(plan=>plan.month===month))throw new BudgetError('There is no budget plan for this month.');
 return {...data,budgetPlans:data.budgetPlans.filter(plan=>plan.month!==month)};
}
export function budgetOverview(data,month){
 const plan=(data.budgetPlans||[]).find(item=>item.month===month)||null;
 const expenses=data.transactions.filter(transaction=>transaction.date.startsWith(`${month}-`)&&transaction.amount<0&&!isBalanceTransfer(transaction));
 const grouped=new Map();
 for(const allocation of plan?.allocations||[])grouped.set(key(allocation.category),{category:allocation.category,limit:allocation.limit,spent:0});
 let spent=0;
 for(const transaction of expenses){
  const amount=-cents(transaction.amount),category=key(transaction.category);spent+=amount;
  if(!grouped.has(category))grouped.set(category,{category:transaction.category,limit:null,spent:0});
  grouped.get(category).spent+=amount;
 }
 return {plan,spent:fromCents(spent),remaining:plan?fromCents(cents(plan.totalLimit)-spent):null,count:expenses.length,categories:[...grouped.values()].map(group=>({...group,spent:fromCents(group.spent),remaining:group.limit===null?null:fromCents(cents(group.limit)-group.spent)}))};
}
export function availableBudgetCategories(data){
 const categories=new Map(expenseCategories.map(category=>[key(category),category]));
 for(const transaction of data.transactions)if(transaction.amount<0&&!isBalanceTransfer(transaction))categories.set(key(transaction.category),transaction.category);
 for(const plan of data.budgetPlans||[])for(const allocation of plan.allocations)categories.set(key(allocation.category),allocation.category);
 return [...categories.values()].sort((a,b)=>a.localeCompare(b));
}
