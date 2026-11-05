import { manilaNow } from './app-date.js';
export const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function currentCalendar(now=manilaNow()){
 return {month:new Date(now.getFullYear(),now.getMonth(),1),selectedDate:localDate(now)};
}
export function shiftMonth(month,selectedDate,direction){
 const next=new Date(month.getFullYear(),month.getMonth()+direction,1);
 const day=Math.min(Number(selectedDate.slice(-2)),new Date(next.getFullYear(),next.getMonth()+1,0).getDate());
 return {month:next,selectedDate:localDate(new Date(next.getFullYear(),next.getMonth(),day))};
}
export function monthCells(month){
 const start=new Date(month.getFullYear(),month.getMonth(),1),offset=start.getDay();
 const count=Math.ceil((offset+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;
 return Array.from({length:count},(_,index)=>new Date(start.getFullYear(),start.getMonth(),index-offset+1));
}
const chevron=direction=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="${direction==='left'?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
const calendarIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-9 4h2"/></svg>';
const dayLabel=new Intl.DateTimeFormat('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
const transactionDates=new WeakMap();
export function calendarView({month,selectedDate,today,transactions,wallets,money,escape}){
 const todayISO=localDate(today),selected=new Date(`${selectedDate}T12:00:00`);
 let byDate=transactionDates.get(transactions);
 if(!byDate){
  byDate=new Map();for(const transaction of transactions){if(!byDate.has(transaction.date))byDate.set(transaction.date,[]);byDate.get(transaction.date).push(transaction);}
  transactionDates.set(transactions,byDate);
 }
 const dayTransactions=byDate.get(selectedDate)||[];
 const selectedIsToday=selectedDate===todayISO;
 return `<section class="folio-calendar"><article class="calendar-board"><header class="calendar-board-header"><div><p class="calendar-overline">YOUR FINANCIAL CALENDAR</p><h2>${month.toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</h2></div><div class="calendar-navigation"><button id="today" class="calendar-today-button">Today</button><div><button id="prev-month" aria-label="Previous month">${chevron('left')}</button><button id="next-month" aria-label="Next month">${chevron('right')}</button></div></div></header><div class="calendar-weekdays" aria-hidden="true">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-days" role="group" aria-label="${month.toLocaleDateString('en-PH',{month:'long',year:'numeric'})} dates">${monthCells(month).map(date=>{
  const iso=localDate(date),entries=byDate.get(iso)||[],income=entries.some(t=>t.amount>0),expense=entries.some(t=>t.amount<0);
  return `<button class="calendar-date ${date.getMonth()!==month.getMonth()?'outside-month':''} ${iso===todayISO?'date-today':''} ${iso===selectedDate?'date-selected':''}" data-date="${iso}" aria-label="${dayLabel.format(date)}${entries.length?`, ${entries.length} transaction${entries.length===1?'':'s'}`:''}" aria-pressed="${iso===selectedDate}" ${iso===todayISO?'aria-current="date"':''} tabindex="${iso===selectedDate?0:-1}"><span class="calendar-date-number">${date.getDate()}</span><span class="calendar-date-events">${income?'<i class="event-income"></i>':''}${expense?'<i class="event-expense"></i>':''}${entries.length?`<small>${entries.length}</small>`:''}</span></button>`;
 }).join('')}</div><footer class="calendar-key"><span><i class="event-income"></i>Income</span><span><i class="event-expense"></i>Expense</span><span class="calendar-current-date" title="Philippine time (Asia/Manila)">Today · ${today.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span></footer></article><aside class="calendar-agenda" aria-label="Selected date transactions"><header><p class="calendar-overline">${selectedIsToday?'TODAY':selected.toLocaleDateString('en-PH',{weekday:'long'}).toUpperCase()}</p><h3>${selected.toLocaleDateString('en-PH',{month:'long',day:'numeric'})}</h3><p class="agenda-subtitle">${dayTransactions.length?`${dayTransactions.length} transaction${dayTransactions.length===1?'':'s'} recorded`:'A little room for your plans.'}</p></header>${dayTransactions.length?`<ul class="calendar-activity">${dayTransactions.map(t=>`<li><div class="merchant"><span class="agenda-transaction-icon ${t.amount>0?'agenda-income':'agenda-expense'}" aria-hidden="true">${t.amount>0?'↙':'↗'}</span><div><strong>${escape(t.name)}</strong><small>${escape(t.category)} · ${escape(wallets.find(w=>w.id===t.wallet)?.name||'Wallet')}</small></div></div><strong class="agenda-amount ${t.amount>0?'positive':''}">${t.amount>0?'+':'−'}${money(Math.abs(t.amount))}</strong></li>`).join('')}</ul>`:`<div class="calendar-empty"><span>${calendarIcon}</span><h4>Nothing recorded yet</h4><p>Your transactions for this day will appear here.</p></div>`}</aside></section>`;
}
