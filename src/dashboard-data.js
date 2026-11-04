import {cents,fromCents,compareTransactions} from './budget.js';

export function weeklyCashflow(transactions){
 const weeks=Array.from({length:5},()=>[0,0]);
 for(const transaction of transactions){
  const week=Math.min(4,Math.floor((Number(transaction.date.slice(-2))-1)/7));
  weeks[week][transaction.amount>0?0:1]+=Math.abs(cents(transaction.amount));
 }
 return weeks.map(week=>week.map(fromCents));
}

export function recentTransactions(transactions){
 const recent=[];
 for(const transaction of transactions){
  const index=recent.findIndex(item=>compareTransactions(transaction,item)<0);
  if(index>=0)recent.splice(index,0,transaction);
  else if(recent.length<5)recent.push(transaction);
  if(recent.length>5)recent.pop();
 }
 return recent;
}
