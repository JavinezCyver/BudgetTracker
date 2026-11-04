import {nativeMetric} from './native-metrics.js';
const SCALE=1000000;
export const quantityUnits=value=>Math.round(value*SCALE);
export function holdingValueCents(units,price){
 return Number((BigInt(quantityUnits(units))*BigInt(quantityUnits(price))+5000000000n)/10000000000n);
}
export const holdingValue=holding=>nativeMetric(holding)?.value??holdingValueCents(holding.units,holding.price)/100;
export const portfolioBalance=(holdings=[])=>nativeMetric(holdings)?.portfolio??holdings.reduce((sum,holding)=>sum+holdingValueCents(holding.units,holding.price),0)/100;
export const realizedGain=holding=>nativeMetric(holding)?.realized??holding.trades.filter(trade=>trade.kind==='sell').reduce((sum,trade)=>sum+Math.round(trade.gain*100),0)/100;
