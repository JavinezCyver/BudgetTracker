import {nativeMetric} from './native-metrics.js';
export const starterWallets = () => [
  {id:'assets',name:'Assets',type:'What you own',kind:'asset',balance:0,color:'green'},
  {id:'liabilities',name:'Liabilities',type:'What you owe',kind:'liability',balance:0,color:'peach'},
];

export function migrateWallets(saved) {
  if (saved.schemaVersion === 3) return saved;
  const oldIds = new Set(['main','savings','cash']);
  const starters = starterWallets();
  starters[0].balance = saved.wallets.filter(w=>oldIds.has(w.id)).reduce((sum,w)=>sum+w.balance,0);
  return {
    ...saved,
    schemaVersion:3,
    wallets:[...starters,...saved.wallets.filter(w=>!oldIds.has(w.id)).map(w=>({...w,kind:w.kind||'asset'}))],
    transactions:saved.transactions.map(t=>({...t,wallet:oldIds.has(t.wallet)?'assets':t.wallet})),
  };
}

export const receivableBalance=(loans=[])=>nativeMetric(loans)?.receivables??loans.reduce((sum,loan)=>sum+Math.round(loan.principal*100)-loan.repayments.reduce((paid,payment)=>paid+Math.round(payment.amount*100),0),0)/100;
export const netWorth = (wallets,loans=[],investments=[]) => nativeMetric(wallets)?.netWorth??(wallets.reduce((sum,w)=>sum+(w.kind==='liability'?-1:1)*Math.round(w.balance*100),0)+Math.round(receivableBalance(loans)*100)+Math.round(portfolioBalance(investments)*100))/100;
export const addedWallets = wallets => wallets.filter(w=>!['assets','liabilities'].includes(w.id));
export const balanceChange = (wallet,amount) => wallet.kind==='liability'?-amount:amount;
import {portfolioBalance} from './investment-balances.js';
export {portfolioBalance} from './investment-balances.js';
