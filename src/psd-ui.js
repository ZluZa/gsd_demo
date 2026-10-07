import {localizedLogo, supportedLanguages} from './logos.js?v=32d9dbaa4b3a';
// Coordinates refer to the visible PSD artboard, excluding its black export frame.
// PSD: 2928×4884; visible artwork: x=351..2574, y=42..4842.
export const art = 'public/assets/psd/';
export const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function box(x,y,w,h) {return `left:${(x-351)/2223*100}%;top:${(y-42)/4800*100}%;width:${w/2223*100}%;height:${h/4800*100}%;`;}
export function picture(name,x,y,w,h,extra='') {
 if(['menu-star','win-star','game-star'].includes(name))return `<div class="art glow-star" data-art="${name}" style="${box(x,y,w,h)}" aria-hidden="true"><i></i></div>`;
 return `<img class="art ${extra}" data-art="${name}" src="${art}${name}.webp" style="${box(x,y,w,h)}" alt="" draggable="false">`;}
export const star = '<span class="score-star" aria-hidden="true"></span>';
export function days({day,selected,scores,t,final=false}) {
 return `<div class="days ${final?'final-days':''}" style="--unlocked:${Math.max(0,day-1)/6*100}%">${Array.from({length:7},(_,i)=>{
 const n=i+1,done=Object.hasOwn(scores,n),locked=n>day&&!done;
 return `<button type="button" class="day ${selected===n&&!final?'selected':''} ${done?'complete':''} ${locked?'locked':''} ${final&&n===7&&done?'last-day':''}" data-day="${n}" aria-label="${esc(t('day'))} ${n}${done?' · '+esc(t('done')):locked?' · '+esc(t('locked')):''}" aria-pressed="${!final&&selected===n}" ${final?'disabled':''}>${n}${done?'<span class="day-check" aria-hidden="true">✓</span>':locked?'<span class="day-check day-lock" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2"/><rect x="3" y="7" width="10" height="8" rx="2" fill="currentColor"/></svg></span>':''}</button>`;
 }).join('')}</div>`;
}
export function board({track,scores,selected,t,name,result=false,demo=false,online=false,rows:serverRows=[]}) {
 const max=track.notes.length*3;
 const sample=[.91,.84,.78,.72,.66,.6,.55,.48,.39,.3].map((r,i)=>({name:`${t('demoPlayer')} ${i+1}`,score:Math.floor(max*r),sample:true}));
 const rows=online?serverRows.map(row=>({...row})):demo?sample:[];
 if(!online&&Object.hasOwn(scores,selected))rows.push({name:name||t('you'),score:scores[selected],self:true});
 if(!online)rows.sort((a,b)=>b.score-a.score);
 const displayed=rows.slice(0,10);
 // Keep the local player's row available even when demo players fill the top ten.
 if(rows.some(r=>r.self)&&!displayed.some(r=>r.self))displayed[9]=rows.find(r=>r.self);
 return `<section class="leaderboard panel ${result?'result-board':''}" aria-label="${esc(t('top10'))}">
 <div class="board-heading"><h2>${esc(t('day'))} ${selected}</h2><small>${esc(t('maxScore').replace('{max}',max))}</small></div><h3>${t('top10')}</h3>
 <div class="rows">${displayed.length?displayed.map((r,i)=>`<div class="rank-row ${r.self?'self':''}"><span class="rank ${(r.rank??i+1)<=3?'crowned':''}">${r.rank??i+1}</span><span class="player-name">${esc(r.name)}</span><b>${r.score}/${max}</b></div>`).join(''):`<p class="empty">${t('noResults')}<br>${t('playFirst')}</p>`}</div>
 <small class="data-label">${online?t('serverRanking'):demo?t('demoRanking'):t('onDevice')}</small></section>`;
}
export function menuUI(ctx){
 const {t,s,tracks,selected,scores,lang,name,demo,online,rows}=ctx;
 return `<div class="screen menu-screen">${picture('menu-star',989,535,946,912)}${localizedLogo(lang,box(860,753,1368,523))}
 <button class="circle-button back" id="back" aria-label="${t('close')}" style="${box(483,400,251,250)}"><span class="back-arrow"></span></button>
 <select id="language" aria-label="${t('language')}" style="${box(1671,424,244,202)}">${supportedLanguages.map(l=>`<option ${l===lang?'selected':''}>${l.toUpperCase()}</option>`).join('')}</select>
 <div class="total panel" style="${box(1986,376,478,306)}"><small>${t('totalScore')}</small><b>${star}${s.total}</b></div>
 <section class="day-panel panel" style="${box(427,1441,2075,887)}"><h2>${t('chooseDay')}</h2>${days({day:s.day,selected,scores,t})}<div class="event-clock"><span>${t('left')}:</span> <b id="timer"></b></div></section>
 <div class="menu-board" style="${box(427,2356,2075,1220)}">${board({track:tracks[selected-1],scores,selected,t,name,demo,online,rows})}</div>
 <button class="primary menu-play" id="play" style="${box(798,3733,1337,322)}" ${s.day===0?'disabled':''}>${s.day===0?t('waiting'):t('play')}</button>
 </div>`;
}
export function resultUI({t,track,selected,scores,name,score,demo,online,rows,appLaunch,syncStatus}){
 return `<div class="screen result-screen"><div class="result-heading" style="${box(952,447,1016,254)}"><span class="note-icon">♫</span><h1>${t('trackFinished')}</h1></div>
 <div class="result-score" style="${box(1105,779,710,280)}"><small>${t('score')}</small><b>${star}${score}</b></div>
 <div class="result-instruction" style="${box(580,1197,1760,220)}"><p>${t(appLaunch?'yourName':'enterName')}</p><p>${t('day')} ${selected} · ${t(appLaunch?(syncStatus==='synced'?'saved':syncStatus==='syncing'?'syncing':online?'savePending':'local'):'saved')}</p></div>
 <input id="player-name" class="name-input panel" style="${box(427,1499,2075,308)}" ${appLaunch?'readonly':''} maxlength="100" placeholder="${t('yourName')}" aria-label="${t('yourName')}" value="${esc(name)}" autocomplete="nickname">
 <div class="result-board-wrap" style="${box(427,1835,2075,1667)}">${board({track,scores,selected,t,name,result:true,demo,online,rows})}</div>
 <button id="continue" class="primary" style="${box(464,3588,2003,307)}">${t('continue')}</button></div>`;
}
export function endUI({t,s,scores}){
 const complete=Object.keys(scores).length;
 return `<div class="screen end-screen">${picture('win-star',694,1061,1541,1484)}${picture('win-dino',1009,1186,875,1151)}${picture('ribbon-left',428,294,345,491)}${picture('ribbon-right',2068,1112,322,193)}
 <h1 class="end-title" style="${box(560,419,1810,580)}">${t('eventCompleted')}</h1>
 <section class="end-board panel" style="${box(427,2597,2075,787)}"><h2>${star}${t('score')}: ${s.total}</h2><h3>${complete===7?t('allDaysCompleted'):`${t('done')}: ${complete}/7`}</h3>${days({day:7,selected:7,scores,t,final:true})}</section>
 <button id="certificate" class="primary gift-button" style="${box(464,3588,2005,340)}"><img src="${art}gift.webp" alt="">${t('getDiploma')}</button>
 </div>`;
}
export function gameUI({t,track,score}) {
 return `<div class="screen game-screen"><div class="lanes" aria-label="${t('musicTrack')}">${[0,1].map(l=>`<button class="lane lane-${l}" data-lane="${l}" aria-label="${t(l?'lane2':'lane1')}"><div class="road"><div class="road-shine"></div><div class="road-stream" aria-hidden="true"><i></i><i></i></div></div><div class="notes"></div><span class="target"><span class="target-beam" aria-hidden="true"></span><span class="target-halo" aria-hidden="true"></span></span></button>`).join('')}</div>
 ${picture('sky-stars',356,114,2180,891)}${picture('game-star',1076,662,788,760)}${picture('stage',-265,715,3460,1469,'stage')}${picture('cast',485,740,1953,920)}${picture('singer',1242,711,488,934)}${picture('game-dino',1572,1056,443,582)}
 <div class="track-hud panel" style="${box(472,375,1154,306)}"><span class="note-icon">♫</span><div><small>${t('track')}</small><b>${esc(track.title)}</b><progress id="progress" max="1" value="0"></progress></div></div>
 <div class="total panel" style="${box(1666,376,478,306)}"><small>${t('score')}</small><b>${star}<span id="score">${score}</span></b></div>
 <button class="circle-button pause-button" id="pause" aria-label="${t('paused')}" style="${box(2181,390,276,276)}"><span></span></button>
 <div id="hit-feedback" class="hit-feedback" aria-live="polite" aria-atomic="true"></div><div id="feedback" class="countdown" aria-live="polite"></div></div>`;
}
