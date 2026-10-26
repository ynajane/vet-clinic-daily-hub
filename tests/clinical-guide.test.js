import test from 'node:test';
import assert from 'node:assert/strict';
import {matchGuides,mergeGuides,prescriptionLine,courseDays,courseEnd,checkupSnapshot} from '../src/clinicalGuide.js';
import {calculateSupply,rxLineErrors} from '../src/prescription.js';
import {bookableServices} from '../src/booking.js';
import {validateBooking} from '../src/booking.js';

test('two diagnoses merge into one plan with one product each and the soonest recheck', () => {
  const guides = matchGuides('Pyoderma\nOtitis externa\nAcute vomiting');
  assert.deepEqual(guides.map(g => g.id), ['skin','ear','digestive']);
  const merged = mergeGuides(guides);
  assert.equal(merged.followUpDays, 3);
  assert.equal(new Set(merged.products.map(p => p.id)).size, merged.products.length);
  assert.deepEqual(matchGuides('Something unrecognised'), []);
});
test('weeks convert to days and drive the supply quantity', () => {
  assert.equal(courseDays(2, 'weeks'), 14);
  assert.ok(Number.isNaN(courseDays(1.5, 'days')));
  const line = prescriptionLine({dosed:true,unit:'tablet',route:'by mouth',timesPerDay:2,duration:2,durationUnit:'weeks'}, {id:'p',name:'X',price:10,category:'Pet medicine'});
  assert.ok(rxLineErrors(line).amount && rxLineErrors(line).unitsPerItem, 'amount and package size are left for the vet');
  const done = {...line, dose:{...line.dose, amount:'1', unitsPerItem:'10'}};
  const supply = calculateSupply({amount:1,timesPerDay:2,days:courseDays(2,'weeks'),unitsPerItem:10,unit:'tablet',route:'by mouth'});
  assert.equal(supply.quantity, 3);
  assert.equal(courseEnd([done]), 14);
  assert.ok(rxLineErrors({...done, instructions:supply.directions, quantity:supply.quantity}).amount === undefined);
});
test('prescription fields report their own inline errors', () => {
  const e = rxLineErrors({dose:{amount:'0',unit:'x',route:'y',timesPerDay:'30',days:400,unitsPerItem:''},instructions:'',quantity:0});
  for (const key of ['amount','unit','route','timesPerDay','duration','unitsPerItem','instructions','quantity']) assert.ok(e[key], key);
});
test('snapshot flags overdue boosters and a missing record', () => {
  const snap = checkupSnapshot({pet:{name:'Rex',birth:'2020-01-01',species:'Dog'},vitals:{weight:12,temp:38.6},vaccs:[{done:true,vaccine:'Anti-rabies',date:'2025-01-01',nextDue:'2026-01-01'}],today:'2026-10-26'});
  assert.ok(snap.plan.some(l => /overdue/.test(l)));
  assert.ok(checkupSnapshot({pet:{name:'Rex'},vaccs:[],today:'2026-10-26'}).plan.length);
});
test('surgery / dental can no longer be booked but old visits keep it', () => {
  assert.ok(!bookableServices('').some(([k]) => k === 'surgery'));
  assert.ok(bookableServices('surgery').some(([k]) => k === 'surgery'));
  const base = {service:'surgery',petId:'p1',vetId:'v1',date:'2099-01-01',time:'09:00'};
  assert.ok(validateBooking({appts:[],busy:[]}, [{id:'p1'}], base).service);
});
