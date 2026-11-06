const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Engine, config} = require('../src/engine');
const at = (h=12,m=0,s=0) => new Date(2026,10,7,h,m,s);
function run(e, seconds) {for(let i=0;i<seconds;i++) e.sync(new Date(e.last+1000));}
test('60 minutes study, 10 minutes rest, yay then study', () => {
  const e = new Engine(config(), {}, at()); run(e,3600);
  assert.equal(e.state.mode,'break'); assert.equal(e.state.total,3600000); assert.ok(['feed','give'].includes(e.view().image));
  run(e,600); assert.equal(e.view().image,'yay'); run(e,3); assert.equal(e.view().image,'study');
});
test('night overrides interactions and 06:00 starts study', () => {
  const e = new Engine(config(), {}, at(0,59,59)); run(e,1); assert.equal(e.view().image,'goodnight');
  const total=e.state.total; e.action('study',at(1)); e.action('click',at(1)); assert.equal(e.view().image,'goodnight');
  e.sync(at(5,59,59)); assert.equal(e.state.total,total); run(e,1);
  assert.equal(e.view().image,'study'); assert.equal(e.state.remaining,3600000);
});
test('cross-midnight night schedule and daily reset', () => {
  const e = new Engine(config({nightStart:'23:00',nightEnd:'07:00'}),{total:500},at(23));
  assert.equal(e.view().image,'goodnight'); e.sync(new Date(2026,10,8,0)); assert.equal(e.state.total,0);
});
test('goal reward once per day, base state continues underneath', () => {
  const e = new Engine(config(), {total:3*3600000-1000}, at()); run(e,1); assert.equal(e.view().image,'perfect');
  e.action('click',new Date(e.last)); assert.equal(e.view().image,'perfect'); run(e,5); assert.equal(e.view().image,'study');
  run(e,1); assert.equal(e.view().image,'study'); assert.equal(e.state.rewarded,true);
});
test('click and manual study overlays expire, pause freezes counters', () => {
  const e = new Engine(config(), {}, at()); e.action('click',at()); assert.equal(e.view().image,'what'); run(e,3); assert.equal(e.view().image,'study');
  e.action('study',new Date(e.last)); assert.equal(e.view().image,'yeah'); run(e,3); assert.equal(e.view().image,'study');
  e.action('pause',new Date(e.last)); const r=e.state.remaining; run(e,10); assert.equal(e.state.remaining,r);
  e.action('pause',new Date(e.last)); run(e,1); assert.equal(e.state.remaining,r-1000);
});
test('restart preserves progress, offline and long sleeps earn nothing', () => {
  const e = new Engine(config(), {}, at()); run(e,20);
  const restored = new Engine(config(),JSON.parse(JSON.stringify(e.state)),at(14)); assert.equal(restored.state.total,20000);
  assert.equal(restored.state.remaining,e.state.remaining); restored.sync(at(15)); assert.equal(restored.state.total,20000);
});
test('custom timings and malformed settings', () => {
  const e=new Engine(config({studyMinutes:0.05,breakMinutes:0.05}),{},at()); run(e,3);assert.equal(e.state.mode,'break');
  for(const bad of [{studyMinutes:0},{nightStart:'25:00'},{nightEnd:'01:00'},{messages:{study:[]}},{timing:{tickMs:5000}}]) assert.throws(()=>config(bad));
});
test('restart across night end resets study, preserving today total', () => {
  const e = new Engine(config(),{mode:'break',remaining:2000,total:1000,day:'2026-11-7',savedAt:at(0).getTime()},at(7));
  assert.equal(e.state.mode,'study');assert.equal(e.state.remaining,3600000);assert.equal(e.state.total,1000);
});
test('goal reached on cycle boundary celebrates then returns to break', () => {
  const e=new Engine(config(),{total:3*3600000-1000,remaining:1000},at());run(e,1);
  assert.equal(e.view().image,'perfect');assert.equal(e.state.mode,'break');run(e,5);assert.ok(['give','feed'].includes(e.view().image));
});
