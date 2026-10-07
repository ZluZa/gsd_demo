import {integrationConfig} from './integration-config.js';
import {isAppLaunch,readLaunchContext,launchEvent,progressKey} from './launch-context.js';
import {createEventApi,createProgressSync} from './event-api.js';
import {lockedDayMessage} from './locked-day.js';
import {loadTrack,unlockAudio,beep,celebrate,stopEffects,prepareApplause} from './game-audio.js';
import {runtime} from './runtime-config.js';
import {loadEvent} from './event-source.js';
import {eventState, award, saveScore, timingPoints} from './event.js';
import {I18N} from './reference-i18n.js';
import {copy} from './copy.js';
import {decorateScreen,hitMotion,flyHitNote,victoryConfetti} from './motion.js?v=restored-lanes-1';
import {menuUI,resultUI,endUI,gameUI} from './psd-ui.js?v=restored-lanes-1';
const $ = s=>document.querySelector(s), app=$('#app');
const params=new URLSearchParams(location.search), assets='public/assets/';
const appLaunch=isAppLaunch(params);
if(appLaunch){params.delete('demo');params.delete('day');params.delete('screen');}
if(runtime.mode==='static-demo'&&!appLaunch){
 params.set('demo','1');
 if(!/^[0-8]$/.test(params.get('day')||''))params.set('day',String(runtime.defaultDay));
}
let lang=params.get('lang')?.toLowerCase().split(/[-_]/)[0] || window.PLAY321_CONTEXT?.language || 'ru';
if(!copy[lang]) lang='ru';
let event, anchor, scores={}, tracks=[], selected=1, screen='loading', audio, frame, run, storageKey, playerName='';
let launch,api,sync,boards={},syncStatus='local',syncInFlight=null,completionEmitted=false;
const t=k=>copy[lang][k] ?? I18N[lang]?.[k] ?? k;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>event.serverNow + performance.now()-anchor;
const state=()=>eventState(event,now(),scores);
const maximum=()=>tracks.reduce((s,x)=>s+x.notes.length*3,0);
function emit(type,payload={}) {
 const message=JSON.stringify({source:'321playsy-event',type,eventId:event?.id,...payload});
 window.webkit?.messageHandlers?.playsy?.postMessage(message);
 window.ReactNativeWebView?.postMessage(message);
 window.Unity?.call?.(message);
}
window.Play321={setLanguage(language){if(copy[language]){lang=language;if(screen!=='game')render();else if(run?.tutorial)showTutorial();}},pause(){pause();},resume(){if(screen==='pause')resume();}};
function stop(){cancelAnimationFrame(frame);audio?.pause();audio=null;stopEffects();}
function demoControls(){
 if(!params.has('demo'))return '';
 return `<details class="demo"><summary>${t('prototype')}</summary><nav>${Array.from({length:9},(_,d)=>`<a href="?demo=1&day=${d}&lang=${lang}">${d}</a>`).join('')}</nav><p>${t('preview')}</p><nav>${['menu','result','end'].map((view,i)=>`<a href="?demo=1&day=${params.get('day')||6}&lang=${lang}&screen=${view}">${t(['menuPreview','resultPreview','winPreview'][i])}</a>`).join('')}</nav></details>`;
}
function render(){
 const enteringMenu = !app.querySelector('.menu-screen');
 const logo=app.querySelector('[data-art="logo"]');
 const logoTimes=logo?.getAnimations().map(a=>a.currentTime);
 const enteringResult = !app.querySelector('.result-screen');
 const enteringEnd = !app.querySelector('.end-screen');
 window.scrollTo(0,0);
 document.title=`321playsy · ${t('appTitle')}`;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('#rotateText').textContent=t('rotate');
 if(!event){app.innerHTML=`<div class="screen utility-screen"><div class="center"><h2>${t(screen==='error'?(appLaunch?'connectionError':'error'):'loading')}</h2>${screen==='error'?`<button class="primary" id="retry">${t('retry')}</button>`:''}</div></div>`;$('#retry')?.addEventListener('click',boot);decorateScreen();return;}
 if(state().ended){stop();screen='end';notifyCompletion();}
 const ctx={t,s:state(),tracks,selected,scores,lang,name:playerName,demo:params.has('demo'),appLaunch,online:!!api,rows:boards[selected],syncStatus,track:tracks[selected-1],score:run?.score??scores[selected]??0};
 if(screen==='menu'){
 app.innerHTML=menuUI(ctx)+demoControls();
 if(logo){const nextLogo=app.querySelector('[data-art="logo"]');logo.src=nextLogo.src;logo.alt=nextLogo.alt;nextLogo.replaceWith(logo);logo.getAnimations().forEach((a,i)=>{if(logoTimes[i]!=null)a.currentTime=logoTimes[i];});}
 app.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const day=Number(b.dataset.day);if(day>state().day){showLockedDay(day-state().day);return;}selected=day;render();});
 $('#play').onclick=startGame;
 $('#back').onclick=()=>emit('close');
 $('#language').onchange=e=>{lang=e.target.value.toLowerCase();render();};updateTimer();
 }else if(screen==='result'){
 app.innerHTML=resultUI(ctx)+demoControls();
 const proceed=()=>{stopEffects();screen='menu';selected=Math.min(selected+1,state().day);render();};
 $('#continue').onclick=()=>{if(!appLaunch){playerName=$('#player-name').value.trim().slice(0,30);try{localStorage.setItem(storageKey+':name',playerName);}catch{}}proceed();};
 }else if(screen==='end'){
 app.innerHTML=endUI(ctx)+demoControls();$('#certificate').onclick=downloadCertificate;
 }else if(screen==='pause'){
 app.innerHTML=`<div class="screen utility-screen pause-screen"><button class="circle-button utility-back" id="back" aria-label="${t('exitMenu')}"><span class="back-arrow"></span></button><div class="center"><span class="large-note">Ⅱ</span><h1>${t('paused')}</h1><button class="primary" id="start">${t('resume')}</button></div></div>`;
 $('#start').onclick=resume;$('#back').onclick=()=>{stop();run=null;screen='menu';render();};
 }
 if(appLaunch){const status=document.createElement('div');status.className='sync-status';status.setAttribute('role','status');status.textContent=t(syncStatus);if(syncStatus==='syncFailed'){const retry=document.createElement('button');retry.textContent=t('retry');retry.onclick=syncProgress;status.append(' ',retry);}(app.querySelector('.leaderboard')||app.querySelector('.end-screen'))?.append(status);}
 decorateScreen((screen==='menu' && enteringMenu)||(screen==='result' && enteringResult)||(screen==='end' && enteringEnd));
 if(params.has('demo')&&['result','end'].includes(screen)){
  const button=document.createElement('button');button.className='demo-effects';button.id='preview-effects';
  button.textContent={ru:'▶ Повторить конфетти и аплодисменты',en:'▶ Replay confetti and applause',fr:'▶ Rejouer la fête',ar:'▶ إعادة الاحتفال',hi:'▶ जश्न फिर चलाएँ'}[lang];
  button.onclick=()=>{victoryConfetti();celebrate();};app.append(button);
 }

}
function showLockedDay(daysUntilUnlock){
 const menu=app.querySelector('.menu-screen');
 if(!menu)return;
 menu.querySelector('.locked-day-message')?.remove();
 const message=document.createElement('div');
 message.className='locked-day-message';
 message.setAttribute('role','status');
 message.dir=lang==='ar'?'rtl':'ltr';
 message.textContent=lockedDayMessage(lang,daysUntilUnlock);
 menu.append(message);
 message.addEventListener('animationend',()=>message.remove(),{once:true});
 setTimeout(()=>message.remove(),3000);
}
function gameView(entrance=false){
 window.scrollTo(0,0);
 app.innerHTML=gameUI({t,track:tracks[selected-1],score:run.score});
 decorateScreen(entrance);
 $('#pause').onclick=pause;document.querySelectorAll('.lane').forEach(b=>b.onpointerdown=e=>{e.preventDefault();hit(Number(b.dataset.lane));});
}
async function startGame(){
 if(state().ended||selected>state().day){screen='menu';render();return;}
 stop();const currentRun=run={score:0,notes:tracks[selected-1].notes.map(n=>({...n,time:n.time+(tracks[selected-1].noteOffsetSeconds||0),lane:n.lane%2,hit:false,el:null})),finished:false,tutorial:true};
 screen='game';gameView(true);showTutorial();
 try{
  await unlockAudio();
  prepareApplause().catch(()=>{});
  const loaded=await loadTrack(`${assets}tracks/${tracks[selected-1].folder}/track.mp3`,2.3);
  if(run!==currentRun||!run.tutorial||!['game','pause'].includes(screen))return;
  audio=loaded;audio.onended=finish;run.ready=true;
  if(screen==='game')showTutorial();
 }catch{if(run===currentRun){run.loadError=true;if(screen==='game')showTutorial(true);}}
}
function showTutorial(failed=run.loadError||false){
 const scene=$('.game-screen');scene.classList.add('teaching');
 scene.querySelector('.tutorial-overlay')?.remove();
 scene.insertAdjacentHTML('beforeend',`<div class="tutorial-overlay"><div class="tutorial-message"><p>${failed?t('audioError'):t('tutorial')}</p><button id="start" class="primary" ${!run.ready&&!failed?'disabled':''}>${failed?t('retry'):run.ready?t('start'):t('loading')}</button></div><button id="tutorial-back" class="circle-button utility-back" aria-label="${t('exitMenu')}"><span class="back-arrow"></span></button></div>`);
 $('#tutorial-back').onclick=()=>{stop();run=null;screen='menu';render();};
 $('#start').onclick=failed?startGame:async()=>{
  try{await unlockAudio();if(screen!=='game')return;run.tutorial=false;scene.classList.remove('teaching');scene.querySelector('.tutorial-overlay').remove();run.countdown=performance.now()+3000;emit('gameStarted',{day:selected});tick();}catch{showTutorial(true);}
 };
}
function tick(){
 if(screen!=='game'||!audio)return;
 if(state().expired){stop();screen='end';render();return;}
 let time=audio.currentTime;
 if(run.countdown){
 time=(performance.now()-run.countdown)/1000;
 $('#feedback').textContent=String(Math.max(1,Math.ceil(-time)));
 const number=Math.max(1,Math.ceil(-time));
 if(time<0&&run.lastBeep!==number){beep(number);run.lastBeep=number;}
 if(time>=0){run.countdown=null;$('#feedback').textContent='';audio.play().catch(pause);}
 frame=requestAnimationFrame(tick);return;
 }
 const duration=audio.duration||tracks[selected-1].duration;
 $('#progress').value=Math.max(0,time/duration);
 const target=$('.target').offsetTop, travel=2.3;
 for(const n of run.notes){
  const delta=n.time-time;
  if(n.hit||delta<-.38||delta>travel){if(n.el){n.el.remove();n.el=null;}continue;}
  if(!n.el){n.el=document.createElement('i');n.el.className='note';n.el.innerHTML='<span></span>';$(`.lane-${n.lane} .notes`).append(n.el);}
  const distance=1-delta/travel;
  n.el.style.transform=`translate(-50%, -50%) translateY(${target*distance}px) scale(${.4+.6*Math.min(1,distance)})`;
  n.el.style.left=`${(n.lane===0?51:49)+(n.lane===0?14:-14)*(1-Math.min(1,distance))}%`;
 }
 frame=requestAnimationFrame(tick);
}
function hit(lane){
 if(screen!=='game'||!audio)return;
 const b=$(`.lane-${lane}`);b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');
 if(audio.paused||run.tutorial||run.countdown||audio.currentTime<0)return;
 const time=audio.currentTime;
 const n=run.notes.filter(n=>!n.hit&&n.lane===lane&&Math.abs(n.time-time)<=.36).sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time))[0];
 if(!n)return;
 const points=timingPoints(Math.abs(n.time-time));n.hit=true;flyHitNote(n.el);n.el=null;run.score+=points;
 $('#score').textContent=run.score;$('#hit-feedback').textContent=`${t(points===3?'perfect':points===2?'good':'ok')} +${points}`;
 hitMotion(b);
}
function finish(){
 if(!run||run.finished)return;
 if(state().expired){stop();screen='end';render();return;}
 run.finished=true;scores=saveScore(scores,selected,run.score);
 if(sync){sync.record(selected,run.score);scores=sync.state.scores;}else{try{localStorage.setItem(storageKey,JSON.stringify(scores));}catch{}}
 if(api){syncStatus='syncing';syncProgress();}
 emit('gameCompleted',{day:selected,score:run.score,total:eventState(event,now(),scores).total});stop();screen='result';render();celebrate();
 if(state().ended)notifyCompletion();
}
function pause(){if(screen!=='game')return;audio?.pause();stopEffects();if(run?.countdown){run.countdownRemaining=Math.max(0,run.countdown-performance.now());run.countdown=null;}cancelAnimationFrame(frame);screen='pause';render();}
async function resume(){if(!run)return;screen='game';gameView();if(run.tutorial){showTutorial();return;}if(!audio)return;for(const n of run.notes)n.el=null;try{if(run.countdownRemaining!=null){run.countdown=performance.now()+run.countdownRemaining;run.countdownRemaining=null;}else await audio.play();tick();}catch{pause();}}
function updateTimer(){if(!event)return;const s=state();if(s.ended&&!['end','certificate'].includes(screen)){stop();screen='end';render();return;}if($('#timer')){const minutes=Math.floor(Math.max(0,s.remaining)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes/60)%24;const units={ru:['д.','ч.','м.'],en:['d.','h.','m.'],fr:['j.','h.','min.'],ar:['ي.','س.','د.'],hi:['दि.','घं.','मि.']}[lang];$('#timer').textContent=`${days?`${days} ${units[0]} `:''}${hours} ${units[1]} ${String(minutes%60).padStart(2,'0')} ${units[2]}`;}if(screen==='menu'&&s.day!==lastDay){lastDay=s.day;render();}}
let lastDay;
function downloadCertificate(){
 const tier=award(state().total,maximum());
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1400;const c=canvas.getContext('2d');
 c.fillStyle='#fff9e8';c.fillRect(0,0,1000,1400);c.strokeStyle={gold:'#d79a23',silver:'#8493bc',bronze:'#b77a50'}[tier];c.lineWidth=16;c.strokeRect(45,45,910,1310);c.textAlign='center';c.direction=lang==='ar'?'rtl':'ltr';c.fillStyle='#6b24be';
 const line=(text,y,size)=>{c.font=`bold ${size}px system-ui`;c.fillText(text,500,y,850);};
 line('321playsy',170,46);line(t('diploma'),340,60);line(t(tier),510,64);line(t('for'),620,30);line(t('appTitle'),680,40);line(String(state().total),880,120);line(t('all'),950,30);line(t('thanks'),1180,32);
 canvas.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`321playsy-${tier}-${lang}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
 emit('certificateRequested',{total:state().total,tier,language:lang});
}
function notifyCompletion(){
 if(!completionEmitted){completionEmitted=true;emit('eventCompleted',{total:state().total,tier:award(state().total,maximum()),language:lang});}
 if(sync&&!sync.state.completionSent&&!sync.state.completionPending){sync.markCompleted();syncProgress();}
}
async function syncProgress(){
 if(!sync||syncInFlight)return syncInFlight;
 const worker=sync,client=api;
 syncStatus='syncing';
 syncInFlight=(async()=>{
  try{
   await worker.flush();
   // Refresh ranks after writes; never fabricate a rank for pending local scores.
   for(let day=1;day<=7;day++){
    const result=await client.getDay(day,tracks[day-1].notes.length*3);
    boards[day]=result.rows;worker.merge(day,result.playerScore);
   }
   await worker.flush();
   syncStatus='synced';
  }catch{syncStatus='syncFailed';}
  finally{syncInFlight=null;if(['menu','result','end'].includes(screen))render();}
 })();
 return syncInFlight;
}
async function boot(){
 stop();event=null;scores={};boards={};api=null;sync=null;completionEmitted=false;screen='loading';render();
 try{
 launch=readLaunchContext(params,integrationConfig);
 if(runtime.mode==='webview'&&!launch)throw Error('launch-required');
 if(launch){lang=copy[launch.language]?launch.language:'ru';playerName=launch.playerName;}
 const began=performance.now();const loadedEvent=launch?launchEvent(launch):await loadEvent(runtime,params);anchor=performance.now()-(performance.now()-began)/2;
 if(!Number.isFinite(loadedEvent.serverNow)||!Number.isFinite(loadedEvent.startsAt)||!Number.isFinite(loadedEvent.endsAt)||loadedEvent.endsAt<=loadedEvent.startsAt)throw Error('event contract');
 const manifest=await fetch(assets+'tracks/manifest.json').then(r=>r.json());
 const folders=manifest.tracks.map(x=>typeof x==='string'?x:x.folder);
 // Avoid a burst of connections to the local prototype server on cold loads.
 const loadedTracks=[];
 for(const folder of folders){
  const chartResponse=await fetch(`${assets}tracks/${folder}/config.json`);
  if(!chartResponse.ok)throw Error('track config');
  loadedTracks.push({...await chartResponse.json(),folder});
 }
 tracks=loadedTracks;
 tracks.sort((a,b)=>a.day-b.day);
 storageKey=launch?progressKey(launch):'321playsy:'+loadedEvent.id+':'+(window.PLAY321_CONTEXT?.playerId||'local');
 try{if(!launch)playerName=localStorage.getItem(storageKey+':name')||'';const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');for(let d=1;d<=7;d++)if(Number.isInteger(saved[d])&&saved[d]>=0&&saved[d]<=tracks[d-1].notes.length*3)scores[d]=saved[d];}catch{}
 if(launch&&integrationConfig.enabled){
  api=createEventApi(integrationConfig,launch);
  const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
  sync=createProgressSync({api,storage,key:storageKey+':sync',maxScores:tracks.map(track=>track.notes.length*3)});
  for(let day=1;day<=7;day++){const result=await api.getDay(day,tracks[day-1].notes.length*3);boards[day]=result.rows;sync.merge(day,result.playerScore);}
  scores=sync.state.scores;syncStatus='synced';
 }else syncStatus='local';
 event=loadedEvent;
 selected=Math.max(1,Math.min(state().day,Object.keys(scores).length+1));lastDay=state().day;screen=params.has('demo')&&['menu','result','end'].includes(params.get('screen'))?params.get('screen'):'menu';render();emit('ready',{language:lang,orientation:'portrait',integration:api?'api':launch?'local':'demo'});if(sync&&(Object.keys(sync.state.pending).length||sync.state.completionPending))syncProgress();
 }catch{event=null;screen='error';render();}
}
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyQ'||e.code==='ArrowLeft')hit(0);if(e.code==='KeyW'||e.code==='ArrowRight')hit(1);});
document.addEventListener('visibilitychange',async()=>{
 if(document.hidden){stopEffects();pause();return;}
 if(!event)return;
 if(launch){event.serverNow=Date.now();anchor=performance.now();updateTimer();syncProgress();return;}
 if(runtime.mode==='static-demo')return;
 try{const began=performance.now();const response=await fetch('/api/event'+(params.has('demo')?'?day='+encodeURIComponent(params.get('day')||'1'):''),{cache:'no-store'});if(!response.ok)return;const fresh=await response.json();if(fresh.id===event.id&&Number.isFinite(fresh.serverNow)){event.serverNow=fresh.serverNow;anchor=performance.now()-(performance.now()-began)/2;updateTimer();}}catch{}
});
window.addEventListener('online',()=>syncProgress());
const landscape=matchMedia('(orientation: landscape) and (max-height: 600px)');landscape.addEventListener('change',e=>{if(e.matches)pause();});
setInterval(updateTimer,1000);boot();
