export const goalSaved=goal=>goal.entries.reduce((sum,entry)=>sum+Math.round(entry.amount*100),0)/100;
export const walletReserved=(data,walletId)=>(data.goals||[]).reduce((sum,goal)=>sum+goal.entries.filter(entry=>entry.wallet===walletId).reduce((saved,entry)=>saved+Math.round(entry.amount*100),0),0)/100;
export const availableForGoals=(data,walletId)=>Math.max(0,((Math.round((data.wallets.find(wallet=>wallet.id===walletId)?.balance||0)*100))-Math.round(walletReserved(data,walletId)*100))/100);
