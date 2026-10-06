// Decorative motion only. Note travel, hit windows and audio stay on the game clock.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sparklePositions = [[10,22],[86,16],[18,49],[80,55],[32,86],[73,91]];
const menuSparklePositions = Array.from({length:24},(_,i)=>[
  7+(i%6)*16+(Math.floor(i/6)%2)*3,
  7+Math.floor(i/6)*23+(i%3)*4
]);
let activeAnimations = new Set();
function animate(element, frames, options) {
  if (!element || reduced.matches || document.hidden) return;
  const animation = element.animate(frames, options);
  activeAnimations.add(animation);
  const release = () => activeAnimations.delete(animation);
  animation.onfinish = release;
  animation.oncancel = release;
  return animation;
}
function clearAnimations() {
  for (const animation of activeAnimations) animation.cancel();
  activeAnimations.clear();
}
export function decorateScreen(entrance = false) {
  clearAnimations();
  const screen = document.querySelector('#app .screen');
  if (!screen) return;
  {
    const particles = document.createElement('div');
    particles.className = 'ambient-particles';
    particles.setAttribute('aria-hidden', 'true');
    const positions = screen.matches('.menu-screen') ? menuSparklePositions : sparklePositions;
    particles.innerHTML = positions.map(([x,y],i)=>`<i style="left:${x}%;top:${y}%;--drift-x:${(i%2?-1:1)*(5+i%4*2)}px;--drift-y:${-7-i%3*4}px;--delay:-${i*1.7}s;--duration:${11+i%3*2}s"></i>`).join('');
    screen.prepend(particles);
  }
  {
    const light = document.createElement('div');
    light.className = 'menu-light-layers';
    light.setAttribute('aria-hidden','true');
    light.innerHTML = '<i class="light-ray-layer"></i><i class="light-ray-layer"></i>';
    screen.prepend(light);
  }
  if (screen.matches('.game-screen')) {
    for (const target of screen.querySelectorAll('.target')) {
      const sparks = document.createElement('span');
      sparks.className = 'hit-sparks';
      sparks.setAttribute('aria-hidden','true');
      sparks.innerHTML = '<i></i><i></i><i></i>';
      target.append(sparks);
    }
  }
  if (!entrance || reduced.matches) return;
  screen.classList.add('screen-enter');
  if (screen.matches('.game-screen')) {
    const ease = 'cubic-bezier(.2,.65,.3,1)';
    animate(screen.querySelector('.lanes'), [
      {transform:'translateY(-32px)',opacity:0},
      {transform:'translateY(0)',opacity:1}
    ], {duration:500,easing:ease,fill:'backwards'});
    animate(screen.querySelector('[data-art="stage"]'), [
      {transform:'translateY(26px)',opacity:0},
      {transform:'translateY(0)',opacity:1}
    ], {duration:550,delay:30,easing:ease,fill:'backwards'});
    ['cast','singer','game-dino'].forEach((name,i)=>{
      animate(screen.querySelector(`[data-art="${name}"]`), [
        {transform:'scale(.35)',opacity:0},
        {transform:'scale(1)',opacity:1}
      ], {duration:500,delay:90+i*30,easing:ease,fill:'backwards'});
    });
    ['[data-art="sky-stars"]','.glow-star','.track-hud','.total','.pause-button'].forEach(selector=>{
      animate(screen.querySelector(selector), [{opacity:0},{opacity:1}],
        {duration:400,delay:170,easing:'ease-out',fill:'backwards'});
    });
  }
  if (screen.matches('.result-screen')) {
    ['.result-heading','.result-score','.result-instruction','.name-input','.result-board-wrap','#save-name','#continue'].forEach((selector,i)=>{
      animate(screen.querySelector(selector), [
        {transform:'translateY(26px)',opacity:0},
        {transform:'translateY(0)',opacity:1}
      ], {duration:560,delay:Math.min(i,5)*80,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    });
  }
  if (screen.matches('.end-screen')) {
    ['.glow-star','.end-title','[data-art="win-dino"]','[data-art="ribbon-left"]','[data-art="ribbon-right"]'].forEach((selector,i)=>{
      const tilt=selector==='.end-title'?'rotate(-3deg) ':'';
      animate(screen.querySelector(selector), [
        {transform:`${tilt}scale(.25)`,opacity:0},
        {transform:`${tilt}scale(1.04)`,opacity:1,offset:.78},
        {transform:`${tilt}scale(1)`,opacity:1}
      ], {duration:750,delay:i*90,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    });
    ['.end-board','.gift-button'].forEach((selector,i)=>{
      animate(screen.querySelector(selector), [
        {transform:'translateY(36px) scale(.97)',opacity:0},
        {transform:'translateY(-3px) scale(1)',opacity:1,offset:.8},
        {transform:'translateY(0) scale(1)',opacity:1}
      ], {duration:700,delay:350+i*150,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    });
    victoryConfetti(screen);
  }
  if (screen.matches('.tutorial-screen')) {
    ['.large-note','h1','.tutorial-copy','.mini-lanes','#start'].forEach((selector,i)=>{
      animate(screen.querySelector(selector), [
        {transform:'translateY(24px)',opacity:0},
        {transform:'translateY(-2px)',opacity:1,offset:.82},
        {transform:'translateY(0)',opacity:1}
      ], {duration:620,delay:i*110,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    });
  }
  if (screen.matches('.menu-screen')) {
    animate(screen.querySelector('[data-art="logo"]'), [
      {transform:'scale(0)',opacity:0},
      {transform:'scale(1.035)',opacity:1,offset:.78},
      {transform:'scale(1)',opacity:1}
    ], {duration:650,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    ['.day-panel','.menu-board','.menu-play'].forEach((selector,i)=>{
      animate(screen.querySelector(selector), [
        {transform:'translateY(32px)',opacity:0},
        {transform:'translateY(-3px)',opacity:1,offset:.78},
        {transform:'translateY(0)',opacity:1}
      ], {duration:620,delay:100+i*90,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
    });
  }
}
function victoryConfetti(screen) {
  const layer=document.createElement('div');
  layer.className='victory-confetti';
  layer.setAttribute('aria-hidden','true');
  screen.append(layer);
  const completions=[];
  for(let i=0;i<22;i++) {
    const piece=document.createElement('i');
    const x=6+(i*37)%88;
    piece.style.left=`${x}%`;
    piece.style.background=['#ffe08a','#c8efb0','#f5b9df','#b7e5fa'][i%4];
    if(i%3===0)piece.style.borderRadius='50%';
    layer.append(piece);
    const direction=i%2?1:-1;
    const fall=screen.clientHeight*(.38+(i%5)*.07);
    const animation=animate(piece,[
      {transform:`translate(0,-16px) rotate(${i*17}deg)`,opacity:0},
      {opacity:.7,offset:.14},
      {opacity:.6,offset:.7},
      {transform:`translate(${direction*(15+i%4*8)}px,${fall}px) rotate(${direction*(100+i*13)}deg)`,opacity:0}
    ],{duration:2300+i%4*180,delay:450+i%6*65,easing:'cubic-bezier(.2,.45,.5,1)',fill:'both'});
    if(animation)completions.push(animation.finished.catch(()=>{}));
  }
  Promise.all(completions).then(()=>layer.remove());
}
export function flyHitNote(note) {
  if (!note) return;
  if (reduced.matches || document.hidden) { note.remove(); return; }
  // Detach from the chart immediately; only this visual survives the hit.
  note.classList.add('note-flying');
  note.setAttribute('aria-hidden','true');
  const pose = note.style.transform;
  const animation = animate(note, [
    {transform:pose,opacity:1},
    {transform:`${pose} translateY(-58px) scale(.82)`,opacity:0}
  ], {duration:480,easing:'cubic-bezier(.16,.65,.35,1)',fill:'forwards'});
  if (animation) animation.finished.then(()=>note.remove(),()=>note.remove());
  else note.remove();
}
export function hitMotion(lane) {
  if (reduced.matches) return;
  const target = lane.querySelector('.target');
  // Reuse three particles, and cap bursts even when notes are close together.
  const time = performance.now();
  if (time - Number(target.dataset.lastBurst || -1000) < 350) return;
  target.dataset.lastBurst = time;
  target.querySelectorAll('.hit-sparks i').forEach((particle,i)=>{
    particle.getAnimations().forEach(animation=>animation.cancel());
    animate(particle, [
      {transform:'translate(0,0) scale(.6)',opacity:0},
      {opacity:.55,offset:.2},
      {transform:`translate(${(i-1)*13}px,${-19-Math.abs(i-1)*5}px) scale(.3)`,opacity:0}
    ], {duration:650,delay:i*40,easing:'ease-out'});
  });
  const feedback = document.querySelector('#hit-feedback');
  feedback.getAnimations().forEach(animation=>animation.cancel());
  animate(feedback,[{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)',offset:.2},{opacity:1,offset:.7},{opacity:0}],{duration:1300,fill:'forwards'});
}
function visibility() {
  document.documentElement.classList.toggle('motion-suspended',document.hidden);
  for(const animation of activeAnimations) document.hidden ? animation.pause() : animation.play();
}
document.addEventListener('visibilitychange',visibility);
reduced.addEventListener('change',()=>{if(reduced.matches)clearAnimations();});
visibility();
