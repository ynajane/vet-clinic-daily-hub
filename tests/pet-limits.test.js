import test from 'node:test';
import assert from 'node:assert/strict';
import {petPlausibility} from '../src/petLimits.js';
import {validatePetPlausibility} from '../server/petRegistration.js';

const today='2026-10-26';
test('species limits catch typos in weight and birth year', () => {
  assert.deepEqual(petPlausibility({species:'Canine (Dog)',weight:'110',birth:'2020-01-01',today}),{},'giant breeds are allowed');
  assert.ok(petPlausibility({species:'Rodent (Hamster / Guinea Pig / etc.)',weight:'5',birth:'2025-01-01',today}).weight);
  assert.ok(petPlausibility({species:'Feline',weight:22,birth:'2020-01-01',today}).weight);
  assert.ok(petPlausibility({species:'Rodent',weight:'0.1',birth:'2010-01-01',today}).birth);
  assert.deepEqual(petPlausibility({species:'Other / Exotic',weight:'90',birth:'1990-01-01',today}),{},'unknown species only keep the general limits');
});
test('the server refuses implausible new registrations with the same message', () => {
  assert.throws(()=>validatePetPlausibility({species:'Rodent'},{weight:5,birth:'2025-01-01'}),/heavier than expected for a rodent/);
  assert.doesNotThrow(()=>validatePetPlausibility({species:'Canine'},{weight:30,birth:'2020-01-01'}));
});

import {validateSoapFields} from '../src/soapValidation.js';
import {ADMINISTERED_VACCINES} from '../src/vaccineSchedule.js';
test('a certified vaccine must come from the clinic list, in the form and on the server list', () => {
  const form=vaccine=>({date:today,symptoms:'s',objective:'o',diagnosis:'d',treatment:'t',weight:'',prescription:'',visitAnswers:{},giveVaccine:true,vaccine,brand:'B',batch:'L',doseNo:'1',doseOf:'1',intervalDays:'365',scheduleApproved:true});
  assert.ok(validateSoapFields(form('Homemade serum'),today,'2020-01-01').vaccine);
  assert.equal(validateSoapFields(form('Anti-rabies'),today,'2020-01-01').vaccine,undefined);
  assert.ok(ADMINISTERED_VACCINES.includes('Deworming') && ADMINISTERED_VACCINES.includes('Feline Leukemia (FeLV)'));
});
