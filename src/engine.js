const defaults = require('../config.json');
const dateKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
function validate(c) {
  for (const key of ['studyMinutes', 'breakMinutes', 'dailyGoalHours'])
    if (!Number.isFinite(c[key]) || c[key] <= 0 || c[key] > 1440) throw Error('分鐘數與目標時數必須大於 0，且不超過 1440。');
  for (const key of ['nightStart', 'nightEnd'])
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c[key])) throw Error('時間格式請使用 HH:MM。');
  if (c.nightStart === c.nightEnd) throw Error('晚安開始與結束時間不可相同。');
  for (const key of Object.keys(defaults.messages))
    if (!Array.isArray(c.messages[key]) || !c.messages[key].length || c.messages[key].some(x => typeof x !== 'string' || !x.trim())) throw Error('氣泡文字必須是非空白文字陣列。');
  for (const key of Object.keys(defaults.timing))
    if (!Number.isFinite(c.timing[key]) || c.timing[key] <= 0) throw Error('動畫與計時時間必須大於 0。');
  if (c.timing.tickMs > 1000) throw Error('tickMs 不可超過 1000。');
  return c;
}
function config(overrides = {}) {
  return validate({...defaults, ...overrides, timing: {...defaults.timing, ...overrides.timing}, messages: {...defaults.messages, ...overrides.messages}});
}
class Engine {
  constructor(c, saved = {}, now = new Date()) {
    this.config = c;
    this.state = {mode: 'study', remaining: c.studyMinutes * 60000, total: 0, day: dateKey(now), paused: false, rewarded: false, ...saved};
    if (!['study', 'break'].includes(this.state.mode) || !Number.isFinite(this.state.remaining) || this.state.remaining <= 0) this.start('study');
    this.last = now.getTime(); this.overlay = null; this.night = false; this.base = null;
    if (saved.savedAt && !this.isNight(now)) {
      const end = new Date(now); const [h,m] = c.nightEnd.split(':').map(Number);
      end.setHours(h,m,0,0); if (end > now) end.setDate(end.getDate()-1);
      if (saved.savedAt < end.getTime()) this.start('study');
    }
    this.sync(now);
  }
  isNight(d) {
    const minutes = s => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
    const m = d.getHours() * 60 + d.getMinutes(), a = minutes(this.config.nightStart), b = minutes(this.config.nightEnd);
    return a < b ? m >= a && m < b : m >= a || m < b;
  }
  start(mode) {
    this.state.mode = mode; this.state.remaining = this.config[mode === 'study' ? 'studyMinutes' : 'breakMinutes'] * 60000;
    this.state.paused = false; this.base = null; this.overlay = null;
  }
  flash(kind, now) {
    if (this.night || this.overlay?.kind === 'perfect' && kind !== 'perfect') return;
    this.overlay = {kind, until: now.getTime() + this.config.timing[`${kind}Seconds`] * 1000};
  }
  sync(now) {
    const t = now.getTime();
    // Integrate only while the app is running; long gaps (sleep/suspend) never earn study time.
    const elapsed = Math.max(0, t - this.last);
    if (elapsed <= 2000 && elapsed > 0) {
      let cursor = this.last;
      while (cursor < t) {
        const next = Math.min(t, Math.floor(cursor / 1000) * 1000 + 1000);
        this.calendar(new Date(cursor));
        if (!this.night && !this.state.paused) this.advance(next - cursor, new Date(next));
        cursor = next;
      }
    }
    this.calendar(now); this.last = t;
    if (this.overlay && t >= this.overlay.until) this.overlay = null;
    if (!this.night && !this.state.rewarded && this.state.total >= this.config.dailyGoalHours * 3600000) {
      this.state.rewarded = true; this.flash('perfect', now);
    }
    return this.view();
  }
  calendar(now) {
    if (this.state.day !== dateKey(now)) {this.state.day = dateKey(now); this.state.total = 0; this.state.rewarded = false; if (this.overlay?.kind === 'perfect') this.overlay = null;}
    const night = this.isNight(now);
    if (night !== this.night) {this.night = night; this.overlay = null; this.base = null; if (!night) this.start('study');}
  }
  advance(ms, now) {
    while (ms > 0) {
      const step = Math.min(ms, this.state.remaining);
      if (this.state.mode === 'study') this.state.total += step;
      this.state.remaining -= step; ms -= step;
      if (this.state.remaining <= 0) {const mode = this.state.mode === 'study' ? 'break' : 'study'; this.start(mode); if (mode === 'study') this.flash('yay', now);}
    }
  }
  action(action, now = new Date()) {
    this.sync(now);
    if (action === 'pause') this.state.paused = !this.state.paused;
    if (!this.night && ['study', 'break'].includes(action)) {this.start(action); if (action === 'study') this.flash('yeah', now);}
    if (action === 'click') this.flash('what', now);
    return this.view();
  }
  view() {
    const kind = this.night ? 'goodnight' : this.overlay?.kind || this.state.mode;
    if (this.base?.kind !== kind) {
      const lines = this.config.messages[kind];
      this.base = {kind, image: kind === 'break' ? (Math.random() < .5 ? 'give' : 'feed') : kind, message: lines[Math.floor(Math.random() * lines.length)]};
    }
    return {...this.base, ...this.state, night: this.night};
  }
}
module.exports = {Engine, config, dateKey};
