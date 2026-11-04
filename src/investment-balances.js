const SCALE=1000000;
export const quantityUnits=value=>Math.round(value*SCALE);
export function holdingValueCents(units,price){
 return Number((BigInt(quantityUnits(units))*BigInt(quantityUnits(price))+5000000000n)/10000000000n);
}
export const holdingValue=holding=>holdingValueCents(holding.units,holding.price)/100;
export const portfolioBalance=(holdings=[])=>holdings.reduce((sum,holding)=>sum+holdingValueCents(holding.units,holding.price),0)/100;
export const realizedGain=holding=>holding.trades.filter(trade=>trade.kind==='sell').reduce((sum,trade)=>sum+Math.round(trade.gain*100),0)/100;
