import {nativeMetric} from './native-metrics.js';
export const goalSaved=goal=>nativeMetric(goal)?.saved??goal.entries.reduce((sum,entry)=>sum+Math.round(entry.amount*100),0)/100;
export const walletReserved=(data,walletId)=>nativeMetric(data)?.wallets[walletId]?.reserved??(data.goals||[]).reduce((sum,goal)=>sum+goal.entries.filter(entry=>entry.wallet===walletId).reduce((saved,entry)=>saved+Math.round(entry.amount*100),0),0)/100;
export const availableForGoals=(data,walletId)=>nativeMetric(data)?.wallets[walletId]?.available??Math.max(0,((Math.round((data.wallets.find(wallet=>wallet.id===walletId)?.balance||0)*100))-Math.round(walletReserved(data,walletId)*100))/100);
