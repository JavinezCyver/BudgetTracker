import test from 'node:test';
import assert from 'node:assert/strict';
import {manilaNow,manilaDateKey,millisecondsUntilManilaMidnight} from '../src/app-date.js';
import {currentCalendar} from '../src/calendar.js';

test('shows November 3 in Manila while the development computer is still on November 2',()=>{
 const instant=new Date('2026-11-02T19:30:00-12:00');
 assert.equal(manilaDateKey(instant),'2026-11-03');
 const state=currentCalendar(manilaNow(instant));assert.equal(state.selectedDate,'2026-11-03');assert.equal(state.month.getMonth(),10);
});
test('Philippine date changes exactly at midnight UTC+8',()=>{
 assert.equal(manilaDateKey(new Date('2026-11-02T15:59:59Z')),'2026-11-02');
 assert.equal(manilaDateKey(new Date('2026-11-02T16:00:00Z')),'2026-11-03');
});
test('handles month and year rollover in Philippine time',()=>{
 assert.equal(manilaDateKey(new Date('2026-11-30T16:00:00Z')),'2026-12-01');
 assert.equal(manilaDateKey(new Date('2026-12-31T16:00:00Z')),'2027-01-01');
});
test('schedules refresh immediately after Philippine midnight',()=>{
 assert.equal(millisecondsUntilManilaMidnight(new Date('2026-11-02T15:59:59.900Z')),200);
 assert.equal(millisecondsUntilManilaMidnight(new Date('2026-11-02T16:00:00Z')),86400100);
});
