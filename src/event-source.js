import {DAY} from './event.js?v=32d9dbaa4b3a';
export function staticDemoEvent(day, now) {
 const startsAt=now-(day-1)*DAY-(day ? 3600000 : 0);
 return {id:`dino-static-demo-v1-day-${day}`,serverNow:now,startsAt,endsAt:startsAt+7*DAY,prototype:true};
}
export async function loadEvent(runtime, params) {
 if(runtime.mode==='static-demo')return staticDemoEvent(Number(params.get('day')),Date.now());
 const response=await fetch('/api/event'+(params.has('demo')?'?day='+encodeURIComponent(params.get('day')||'1'):''),{cache:'no-store'});
 if(!response.ok)throw Error('event');
 return response.json();
}
