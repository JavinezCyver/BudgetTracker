import {walletReserved} from './goal-balances.js';
import {holdingValueCents} from './investment-balances.js';
export class BudgetError extends Error {}
export const cents = amount => Math.round(amount * 100);
export const fromCents = amount => amount / 100;
const MAX_AMOUNT=100_000_000;
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T12:00:00Z`);
 return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
function text(value,label,max){
 const result=String(value??'').trim();
 if(!result)throw new BudgetError(`${label} cannot be blank.`);
 if(result.length>max)throw new BudgetError(`${label} is too long.`);
 return result;
}
function amount(value,allowZero=false){
 const number=Number(value);
 if(value===null||String(value).trim()===''||!Number.isFinite(number)||number<0||(!allowZero&&number===0)||number>MAX_AMOUNT)throw new BudgetError(`Enter an amount ${allowZero?'from ₱0.00':'above ₱0.00'} up to ₱100,000,000.00.`);
 if(Math.abs(number*100-cents(number))>.00001)throw new BudgetError('Use no more than two decimal places.');
 return fromCents(cents(number));
}
export function validateBudget(data){
 if(!data||!Array.isArray(data.wallets)||!Array.isArray(data.transactions))throw new BudgetError('Saved data has an invalid format.');
 if(data.schemaVersion!==undefined&&![1,2,3].includes(data.schemaVersion))throw new BudgetError('This saved data belongs to a newer app version.');
 const ids=new Set();
 for(const wallet of data.wallets){
  if(!wallet||typeof wallet.id!=='string'||!wallet.id||ids.has(wallet.id)||typeof wallet.name!=='string'||!wallet.name.trim()||!Number.isFinite(wallet.balance)||Math.abs(wallet.balance)>Number.MAX_SAFE_INTEGER/100||(wallet.kind!==undefined&&!['asset','liability'].includes(wallet.kind)))throw new BudgetError('Saved wallet data is invalid.');
  ids.add(wallet.id);
 }
 const transactions=new Set();
 for(const transaction of data.transactions){
  if(!transaction||!['string','number'].includes(typeof transaction.id)||transactions.has(transaction.id)||!ids.has(transaction.wallet)||typeof transaction.name!=='string'||!transaction.name.trim()||typeof transaction.category!=='string'||!Number.isFinite(transaction.amount)||Math.abs(transaction.amount)>Number.MAX_SAFE_INTEGER/100||!validDate(transaction.date))throw new BudgetError('Saved transaction data is invalid.');
  transactions.add(transaction.id);
 }
 if(data.loans!==undefined){
  if(!Array.isArray(data.loans))throw new BudgetError('Saved lending records are invalid.');
  const loanIds=new Set(),paymentIds=new Set();
  for(const loan of data.loans){
   if(!loan||typeof loan.id!=='string'||loanIds.has(loan.id)||typeof loan.person!=='string'||!loan.person.trim()||!Number.isFinite(loan.principal)||loan.principal<=0||!validDate(loan.issuedDate)||(loan.dueDate&&(!validDate(loan.dueDate)||loan.dueDate<loan.issuedDate))||!Array.isArray(loan.repayments)||(loan.wallet!==null&&!ids.has(loan.wallet))||(loan.transactionId!==null&&!transactions.has(loan.transactionId)))throw new BudgetError('Saved lending records are invalid.');
   loanIds.add(loan.id);let repaid=0;
   for(const payment of loan.repayments){
    if(!payment||typeof payment.id!=='string'||paymentIds.has(payment.id)||!ids.has(payment.wallet)||!transactions.has(payment.transactionId)||!Number.isFinite(payment.amount)||payment.amount<=0||!validDate(payment.date)||payment.date<loan.issuedDate)throw new BudgetError('Saved repayment data is invalid.');
    paymentIds.add(payment.id);repaid+=cents(payment.amount);
   }
   if(repaid>cents(loan.principal))throw new BudgetError('Repayments exceed the recorded amount lent.');
  }
 }
 if(data.goals!==undefined){
  if(!Array.isArray(data.goals))throw new BudgetError('Saved goals are invalid.');
  const goalIds=new Set(),entryIds=new Set();
  for(const goal of data.goals){
   if(!goal||typeof goal.id!=='string'||goalIds.has(goal.id)||typeof goal.name!=='string'||!goal.name.trim()||!Number.isFinite(goal.target)||goal.target<=0||goal.target>MAX_AMOUNT||(goal.targetDate&&!validDate(goal.targetDate))||!Array.isArray(goal.entries))throw new BudgetError('Saved goals are invalid.');
   goalIds.add(goal.id);const allocated=new Map();
   for(const entry of goal.entries){
    const wallet=data.wallets.find(item=>item.id===entry?.wallet);
    if(!entry||typeof entry.id!=='string'||entryIds.has(entry.id)||!wallet||['assets','liabilities'].includes(wallet.id)||wallet.kind==='liability'||!Number.isFinite(entry.amount)||entry.amount===0||!validDate(entry.date))throw new BudgetError('Saved goal contributions are invalid.');
    entryIds.add(entry.id);allocated.set(entry.wallet,(allocated.get(entry.wallet)||0)+cents(entry.amount));
   }
   if([...allocated.values()].some(value=>value<0)||[...allocated.values()].reduce((sum,value)=>sum+value,0)>cents(goal.target))throw new BudgetError('Saved goal contributions exceed their target.');
  }
  for(const wallet of data.wallets){const reserved=walletReserved(data,wallet.id);if(reserved>0&&cents(reserved)>cents(wallet.balance))throw new BudgetError('Saved goals reserve more money than a wallet contains.');}
 }
 if(data.investments!==undefined){
  if(!Array.isArray(data.investments))throw new BudgetError('Saved investments are invalid.');
  const holdingIds=new Set(),tradeIds=new Set();
  for(const holding of data.investments){
   if(!holding||typeof holding.id!=='string'||!holding.id||holdingIds.has(holding.id)||typeof holding.name!=='string'||!holding.name.trim()||!['Stocks','Funds','Crypto','Bonds','Other'].includes(holding.type)||!Number.isFinite(holding.units)||holding.units<0||holding.units>1000000000||!Number.isFinite(holding.price)||holding.price<0||holding.price>MAX_AMOUNT||!Number.isFinite(holding.costBasis)||holding.costBasis<0||holding.costBasis>MAX_AMOUNT||!validDate(holding.priceDate)||!Array.isArray(holding.trades)||!holding.trades.length)throw new BudgetError('Saved investments are invalid.');
   holdingIds.add(holding.id);let units=0;
   if(holdingValueCents(holding.units,holding.price)>10000000000||holding.units===0&&holding.costBasis!==0)throw new BudgetError('Saved investment valuation is invalid.');
   for(const trade of holding.trades){
    if(!trade||typeof trade.id!=='string'||tradeIds.has(trade.id)||!['buy','sell'].includes(trade.kind)||!Number.isFinite(trade.units)||trade.units<=0||!Number.isFinite(trade.price)||trade.price<0||!Number.isFinite(trade.total)||trade.total<0||!Number.isFinite(trade.fee)||trade.fee<0||!validDate(trade.date)||(trade.wallet!==null&&!ids.has(trade.wallet))||(trade.transactionId!==null&&!transactions.has(trade.transactionId))||(trade.kind==='sell'&&(!Number.isFinite(trade.gain)||!Number.isFinite(trade.costRemoved))))throw new BudgetError('Saved investment trades are invalid.');
    tradeIds.add(trade.id);units+=(trade.kind==='buy'?1:-1)*Math.round(trade.units*1000000);
    if(units<0)throw new BudgetError('Investment sales exceed recorded purchases.');
   }
   if(units!==Math.round(holding.units*1000000))throw new BudgetError('Investment quantity does not match its trades.');
  }
 }
 if(data.budgetPlans!==undefined){
  if(!Array.isArray(data.budgetPlans))throw new BudgetError('Saved budget plans are invalid.');
  const months=new Set(),planIds=new Set();
  for(const plan of data.budgetPlans){
   if(!plan||typeof plan.id!=='string'||!plan.id||planIds.has(plan.id)||typeof plan.month!=='string'||!/^\d{4}-\d{2}$/.test(plan.month)||!validDate(`${plan.month}-01`)||months.has(plan.month)||!Number.isFinite(plan.totalLimit)||plan.totalLimit<=0||plan.totalLimit>MAX_AMOUNT||!Array.isArray(plan.allocations))throw new BudgetError('Saved budget plans are invalid.');
   months.add(plan.month);planIds.add(plan.id);const categories=new Set();let allocated=0;
   for(const allocation of plan.allocations){
    if(!allocation||typeof allocation.category!=='string'||!allocation.category.trim()||categories.has(allocation.category.trim().toLowerCase())||!Number.isFinite(allocation.limit)||allocation.limit<=0)throw new BudgetError('Saved category limits are invalid.');
    categories.add(allocation.category.trim().toLowerCase());allocated+=cents(allocation.limit);
   }
   if(allocated>cents(plan.totalLimit))throw new BudgetError('Saved category limits exceed the monthly budget.');
  }
 }
 return data;
}
export function createWallet(data,fields){
 const name=text(fields.name,'Wallet name',80),purpose=text(fields.purpose,'Purpose',60),balance=amount(fields.amount,true);
 if(!['asset','liability'].includes(fields.kind))throw new BudgetError('Choose an account type.');
 const provider=normalizeProvider(fields.provider);
 if(!provider)throw new BudgetError('Choose a card design.');
 return {...data,hasAddedWallet:true,wallets:[...data.wallets,{id:crypto.randomUUID(),name,type:purpose,kind:fields.kind,provider,network:fields.network,balance,color:['purple','green','peach'][data.wallets.length%3]}]};
}
export function createTransaction(data,fields){
 const name=text(fields.name,'Description',80),value=amount(fields.amount);
 if(!validDate(fields.date))throw new BudgetError('Choose a valid date.');
 if(!['income','expense'].includes(fields.type))throw new BudgetError('Choose income or expense.');
 const wallet=data.wallets.find(w=>w.id===fields.wallet);
 if(!wallet)throw new BudgetError('Choose an existing wallet.');
 if(['assets','liabilities'].includes(wallet.id))throw new BudgetError('Choose one of your added wallets so its card balance updates.');
 const category=fields.type==='income'?'Income':text(fields.category,'Category',60);
 const signed=fields.type==='income'?value:-value;
 const balance=fromCents(cents(wallet.balance)+(wallet.kind==='liability'?-1:1)*cents(signed));
 const reserved=walletReserved(data,wallet.id);
 if(wallet.kind!=='liability'&&reserved>0&&cents(balance)<cents(reserved))throw new BudgetError('Some of this wallet’s money is reserved for goals. Release savings from Goals before spending it.');
 if(Math.abs(cents(balance))>Number.MAX_SAFE_INTEGER)throw new BudgetError('This balance is too large.');
 return {...data,wallets:data.wallets.map(w=>w.id===wallet.id?{...w,balance}:w),transactions:[...data.transactions,{id:crypto.randomUUID(),createdAt:Date.now(),name,category,amount:signed,wallet:wallet.id,date:fields.date}]};
}
export const compareTransactions=(a,b)=>b.date.localeCompare(a.date)||(b.createdAt||(typeof b.id==='number'?b.id:0))-(a.createdAt||(typeof a.id==='number'?a.id:0));
export function deleteWallet(data,walletId){
 if(['assets','liabilities'].includes(walletId)||!data.wallets.some(wallet=>wallet.id===walletId))throw new BudgetError('Choose an added wallet to delete.');
 const wallets=data.wallets.filter(wallet=>wallet.id!==walletId);
 const next={...data,wallets,transactions:data.transactions.filter(transaction=>transaction.wallet!==walletId),hasAddedWallet:wallets.some(wallet=>!['assets','liabilities'].includes(wallet.id))};
 if(data.loans)next.loans=data.loans.filter(loan=>loan.wallet!==walletId).map(loan=>({...loan,repayments:loan.repayments.filter(payment=>payment.wallet!==walletId)}));
 if(data.goals)next.goals=data.goals.map(goal=>({...goal,entries:goal.entries.filter(entry=>entry.wallet!==walletId)}));
 if(data.investments)next.investments=data.investments.map(holding=>({...holding,trades:holding.trades.map(trade=>trade.wallet===walletId?{...trade,wallet:null,transactionId:null}:trade)}));
 return next;
}
export const isLoanTransaction=transaction=>['loan-out','loan-repayment'].includes(transaction.kind);
export const isInvestmentTransaction=transaction=>['investment-buy','investment-sell'].includes(transaction.kind);
export const isBalanceTransfer=transaction=>isLoanTransaction(transaction)||isInvestmentTransaction(transaction);
import {normalizeProvider} from './card-providers.js';
