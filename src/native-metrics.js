// Native calculations are cached with their immutable snapshot, never persisted by JS.
const cache=new WeakMap();
export const nativeMetric=value=>value&&typeof value==='object'?cache.get(value):undefined;
export function receiveSnapshot(snapshot){
 const {data,analysis}=snapshot;cache.set(data,analysis);
 cache.set(data.wallets,{netWorth:analysis.netWorth,assets:analysis.assets,liabilities:analysis.liabilities});
 if(data.loans){cache.set(data.loans,{totals:analysis.lendingTotals,receivables:analysis.receivables,today:analysis.today});for(const item of data.loans)cache.set(item,analysis.loans[item.id]);}
 if(data.goals)for(const item of data.goals)cache.set(item,analysis.goals[item.id]);
 if(data.investments){cache.set(data.investments,{totals:analysis.investmentTotals,portfolio:analysis.portfolio});for(const item of data.investments)cache.set(item,analysis.investments[item.id]);}
 return data;
}
