import assert from 'node:assert/strict';
import { demoAccounts, canView, transition, isUnassigned } from '../shared/model.ts';
const get = (id) => demoAccounts.find((a) => a.id === id);
const base = {
  id: 'test',
  passenger: 'passenger01',
  location: '列车上',
  needs: '[]',
  note: '',
  plan: 'next',
  origin: 'A',
  target: 'B',
  status: 'pending',
  assigned: null,
  receiver: null,
  escalated: 0,
  archived: 0,
  version: 1,
  last_event: 'test',
  created: 0,
  updated: 0,
};
assert.equal(isUnassigned(base, 119999), false);
assert.equal(isUnassigned(base, 120000), true);
assert.equal(isUnassigned({ ...base, status: 'accepted' }, 180000), false);
assert.equal(canView(get('passenger02'), base), false);
assert.equal(canView(get('staffB'), base), false);
assert.equal(canView(get('staffB'), { ...base, status: 'handoff_pending' }), true);
assert.equal(canView(get('staffC'), { ...base, status: 'handoff_pending' }), false);
for (const status of ['completed', 'cancelled'])
  for (const action of [
    'claim',
    'depart',
    'arrive',
    'handoff',
    'receive',
    'finish',
    'cancel',
    'confirm',
    'escalate',
  ])
    for (const a of demoAccounts) assert.throws(() => transition(a, { ...base, status }, action));
for (const a of demoAccounts) assert.throws(() => transition(a, { ...base, archived: 1 }, 'claim'));
assert.equal(transition(get('staffA'), base, 'claim').assigned, 'staffA');
assert.throws(() => transition(get('staffA'), base, 'handoff'));
assert.throws(() => transition(get('passenger01'), base, 'confirm'));
assert.equal(
  transition(get('staffB'), { ...base, status: 'handoff_pending' }, 'receive').receiver,
  'staffB',
);
assert.throws(() =>
  transition(get('staffA'), { ...base, status: 'handoff_received', receiver: 'staffB' }, 'finish'),
);
console.log('PASS: state, permission and no-responder timeout assertions');
