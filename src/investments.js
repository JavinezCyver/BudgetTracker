import {nativeMetric} from './native-metrics.js';
import {BudgetError,cents,fromCents,validDate} from './budget.js';
import {addedWallets} from './wallets.js';
import {availableForGoals} from './goal-balances.js';
import {quantityUnits,holdingValueCents,holdingValue,realizedGain} from './investment-balances.js';
import {manilaDateKey} from './app-date.js';
export {holdingValue,realizedGain} from './investment-balances.js';
export const investmentTypes=['Stocks','Funds','Crypto','Bonds','Other'];
export const investmentWallets=data=>addedWallets(data.wallets).filter(wallet=>wallet.kind!=='liability');
function decimal(value,label,allowZero=false,max=100000000){
 const number=Number(value);
 if(value==null||String(value).trim()===''||!Number.isFinite(number)||number<0||(!allowZero&&number===0)||number>max||Math.abs(number*1000000-quantityUnits(number))>.0001)throw new BudgetError(`Enter a valid ${label} with at most six decimal places.`);
 return quantityUnits(number)/1000000;
}
function fee(value){const result=Number(value||0);if(!Number.isFinite(result)||result<0||result>100000000||Math.abs(result*100-cents(result))>.00001)throw new BudgetError('Enter fees with at most two decimal places.');return fromCents(cents(result));}
function date(value,today,minimum=''){if(!validDate(value)||value>today||minimum&&value<minimum)throw new BudgetError('Choose a date from the last trade date through today.');return value;}
function tradeValues(fields,selling=false){
 const units=decimal(fields.units,'quantity',false,1000000000),price=decimal(fields.price,'price',selling),fees=fee(fields.fee),gross=holdingValueCents(units,price);
 if(gross>10000000000)throw new BudgetError('A trade cannot exceed ₱100,000,000.00.');
 const total=selling?gross-cents(fees):gross+cents(fees);
 if(total<0||!selling&&total===0||total>10000000000)throw new BudgetError(selling?'Fees cannot exceed sale proceeds.':'The purchase total must be between ₱0.01 and ₱100,000,000.00.');
 return {units,price,fee:fees,total:fromCents(total)};
}
function moveCash(data,walletId,amount,{name,kind,id,date}){
 const wallet=investmentWallets(data).find(item=>item.id===walletId);if(!wallet)throw new BudgetError('Choose an asset wallet.');
 if(amount<0&&cents(-amount)>cents(availableForGoals(data,wallet.id)))throw new BudgetError('This wallet does not have enough available money. Release reserved Goals savings first if needed.');
 const transaction={id:crypto.randomUUID(),createdAt:Date.now(),name,category:kind==='investment-buy'?'Investment purchase':'Investment sale',kind,investmentId:id,amount,wallet:wallet.id,date};
 return {transaction,next:{...data,wallets:data.wallets.map(item=>item.id===wallet.id?{...item,balance:fromCents(cents(item.balance)+cents(amount))}:item),transactions:[...data.transactions,transaction]}};
}
function tradeRecord(values,date,wallet,transactionId,kind,extra={}){return {id:crypto.randomUUID(),kind,...values,date,wallet,transactionId,createdAt:Date.now(),...extra};}
export function createInvestment(data,fields,today=manilaDateKey()){
 const name=String(fields.name||'').trim(),symbol=String(fields.symbol||'').trim().toUpperCase();
 if(!name||name.length>80||symbol.length>20)throw new BudgetError('Enter a holding name up to 80 characters and an optional symbol up to 20 characters.');
 if(!investmentTypes.includes(fields.type))throw new BudgetError('Choose an investment type.');
 const values=tradeValues(fields),tradeDate=date(fields.date,today),id=crypto.randomUUID();
 const hasQuote=fields.currentPrice!=null&&String(fields.currentPrice).trim()!=='';
 const price=hasQuote?decimal(fields.currentPrice,'current price',true):values.price;
 if(holdingValueCents(values.units,price)>10000000000)throw new BudgetError('A holding value cannot exceed ₱100,000,000.00.');
 let next=data,transactionId=null;
 if(!fields.existing){const movement=moveCash(data,fields.wallet,-values.total,{name:`Buy ${name}`,kind:'investment-buy',id,date:tradeDate});next=movement.next;transactionId=movement.transaction.id;}
 const holding={id,name,symbol,type:fields.type,units:values.units,costBasis:values.total,price,priceDate:hasQuote?today:tradeDate,createdAt:Date.now(),trades:[tradeRecord(values,tradeDate,fields.existing?null:fields.wallet,transactionId,'buy')]};
 return {...next,investments:[...(data.investments||[]),holding]};
}
export function tradeInvestment(data,id,fields,today=manilaDateKey()){
 const holding=(data.investments||[]).find(item=>item.id===id);if(!holding)throw new BudgetError('This holding no longer exists.');
 if(!['buy','sell'].includes(fields.kind))throw new BudgetError('Choose a purchase or sale.');
 const selling=fields.kind==='sell',values=tradeValues(fields,selling),tradeDate=date(fields.date,today,holding.trades.at(-1).date);
 const currentUnits=quantityUnits(holding.units),tradeUnits=quantityUnits(values.units);
 if(selling&&tradeUnits>currentUnits)throw new BudgetError('You cannot sell more units than you hold.');
 const remainingUnits=(currentUnits+(selling?-tradeUnits:tradeUnits))/1000000;
 if(remainingUnits>1000000000)throw new BudgetError('Quantity exceeds the supported limit.');
 const removedCost=selling?Number((BigInt(cents(holding.costBasis))*BigInt(tradeUnits)+BigInt(currentUnits)/2n)/BigInt(currentUnits)):0;
 const costBasis=selling?fromCents(cents(holding.costBasis)-removedCost):fromCents(cents(holding.costBasis)+cents(values.total));
 const latest=tradeDate>=holding.priceDate,price=latest?values.price:holding.price;
 if(cents(costBasis)>10000000000||holdingValueCents(remainingUnits,price)>10000000000)throw new BudgetError('A holding cannot exceed ₱100,000,000.00.');
 const movement=moveCash(data,fields.wallet,selling?values.total:-values.total,{name:`${selling?'Sell':'Buy'} ${holding.name}`,kind:selling?'investment-sell':'investment-buy',id,date:tradeDate});
 const trade=tradeRecord(values,tradeDate,fields.wallet,movement.transaction.id,fields.kind,selling?{costRemoved:fromCents(removedCost),gain:fromCents(cents(values.total)-removedCost)}:{});
 return {...movement.next,investments:data.investments.map(item=>item.id===id?{...item,units:remainingUnits,costBasis,price,priceDate:latest?tradeDate:item.priceDate,trades:[...item.trades,trade]}:item)};
}
export function updateInvestmentPrice(data,id,fields,today=manilaDateKey()){
 const holding=(data.investments||[]).find(item=>item.id===id);if(!holding||holding.units===0)throw new BudgetError('Choose an active holding.');
 const price=decimal(fields.price,'price',true),priceDate=date(fields.date,today,holding.trades.at(-1).date);
 if(holdingValueCents(holding.units,price)>10000000000)throw new BudgetError('A holding value cannot exceed ₱100,000,000.00.');
 return {...data,investments:data.investments.map(item=>item.id===id?{...item,price,priceDate}:item)};
}
export function investmentTotals(holdings=[]){
 if(nativeMetric(holdings))return nativeMetric(holdings).totals;
 let value=0,cost=0,realized=0;for(const holding of holdings){value+=holdingValueCents(holding.units,holding.price);cost+=cents(holding.costBasis);realized+=cents(realizedGain(holding));}
 return {value:fromCents(value),cost:fromCents(cost),unrealized:fromCents(value-cost),realized:fromCents(realized),gain:fromCents(value-cost+realized)};
}
