const front = document.querySelector('#front'), back = document.querySelector('#back'), character = document.querySelector('#character');
let current, generation = 0;
window.pet.onState(state => {
  document.querySelector('#bubble').textContent = state.message;
  const seconds = Math.ceil(state.remaining / 1000);
  const clock = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  document.querySelector('#timer').textContent = state.night ? '晚安中 · 計時已暫停' : `${state.paused ? '已暫停 · ' : ''}${state.mode === 'study' ? '學習中' : '休息中'} ${clock}`;
  if (current !== state.image) {
    current = state.image; const token = ++generation; const img = new Image(); img.src = `../assets/${state.image}.png`;
    img.onload = () => {
      if (token !== generation) return;
      back.getAnimations().forEach(a => a.cancel()); back.src = front.src || img.src; front.getAnimations().forEach(a => a.cancel()); front.src = img.src;
      back.animate([{opacity:1},{opacity:0}], {duration:state.fadeMs,easing:'ease-in-out',fill:'forwards'});
      front.animate([{opacity:0},{opacity:1}], {duration:state.fadeMs,easing:'ease-in-out'});
    };
  }
});
let gesture;
character.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  character.setPointerCapture(e.pointerId); gesture = {x:e.screenX,y:e.screenY,moved:false}; window.pet.drag('start');
});
character.addEventListener('pointermove', e => {
  if (!gesture) return;
  if (Math.hypot(e.screenX-gesture.x,e.screenY-gesture.y)>5) gesture.moved=true;
  if (gesture.moved) window.pet.drag('move');
});
character.addEventListener('pointerup', () => {if (!gesture) return; window.pet.drag('end'); if (!gesture.moved) window.pet.click(); gesture=null;});
character.addEventListener('pointercancel', () => {window.pet.drag('end'); gesture=null;});
character.addEventListener('keydown', e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();window.pet.click();}});
document.addEventListener('contextmenu', e => {e.preventDefault();window.pet.menu();});
