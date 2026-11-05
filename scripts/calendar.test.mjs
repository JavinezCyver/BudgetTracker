import test from 'node:test';
import assert from 'node:assert/strict';
import {localDate,currentCalendar,shiftMonth,monthCells,calendarView} from '../src/calendar.js';

test('calendar date changes reuse records and saved changes show up on the correct day',()=>{
 const render=(transactions,selectedDate)=>calendarView({month:new Date(2026,10,1),selectedDate,today:new Date(2026,10,3),transactions,wallets:[],money:String,escape:String});
 const transactions=[{id:'one',name:'Coffee purchase',category:'Food',date:'2026-11-03',amount:-10}];
 assert.ok(render(transactions,'2026-11-03').includes('Coffee purchase'));
 assert.ok(!render(transactions,'2026-11-04').includes('Coffee purchase'));
 const saved=[...transactions,{id:'two',name:'Payday',category:'Income',date:'2026-11-04',amount:100}];
 assert.ok(render(saved,'2026-11-04').includes('Payday'));
 assert.ok(!render(saved.filter(item=>item.id!=='two'),'2026-11-04').includes('Payday'));
});

test('opening calendar uses the current local month and date',()=>{
 const state=currentCalendar(new Date(2026,10,2,19,30));
 assert.equal(localDate(state.month),'2026-11-01');assert.equal(state.selectedDate,'2026-11-02');
});
test('current month is not hard-coded',()=>{
 assert.equal(currentCalendar(new Date(2027,0,1)).selectedDate,'2027-01-01');
 assert.equal(currentCalendar(new Date(2026,4,31)).month.getMonth(),4);
});
test('switching months clamps the selected day to a valid date',()=>{
 const next=shiftMonth(new Date(2026,0,1),'2026-01-31',1);
 assert.equal(next.selectedDate,'2026-02-28');assert.equal(localDate(next.month),'2026-02-01');
});
test('leap years and year boundaries remain correct',()=>{
 assert.equal(shiftMonth(new Date(2028,0,1),'2028-01-31',1).selectedDate,'2028-02-29');
 assert.equal(shiftMonth(new Date(2026,11,1),'2026-12-15',1).selectedDate,'2027-01-15');
});
test('month grid has complete weeks and correct weekday alignment',()=>{
 for(let month=0;month<12;month++){
  const cells=monthCells(new Date(2026,month,1));assert.equal(cells.length%7,0);assert.equal(cells[0].getDay(),0);assert.equal(cells.at(-1).getDay(),6);
  assert.equal(cells.filter(date=>date.getMonth()===month).length,new Date(2026,month+1,0).getDate());
 }
});
