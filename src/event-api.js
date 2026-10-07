// GSD Swagger response adapter. Preserve actual ranks, including current_player outside top 10.
export function decodeLeaderboard(payload,playerId){
 const data=payload?.data;
 if(payload?.success!==true||!Array.isArray(data?.leaderboard)||!Object.hasOwn(data,'current_player'))throw Error('api-response');
 const player=data.current_player;
 if(player!==null&&(!player||player.player_id!==playerId))throw Error('api-player');
 const rows=data.leaderboard.filter(row=>row.player_id!==playerId);
 if(player)rows.push(player);
 rows.sort((a,b)=>a.rank-b.rank);
 return {rows:rows.map(row=>({playerId:row.player_id,name:row.player_name,score:row.score,rank:row.rank})),playerScore:player===null?null:player.score};
}
export function validateApiConfig(config){
 const url=new URL(config.apiBaseUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('api-config');
 if(!Array.isArray(config.gameIds)||config.gameIds.length!==7||new Set(config.gameIds.map(String)).size!==7||config.gameIds.some(id=>!['string','number'].includes(typeof id)||!String(id).trim()))throw Error('api-game-ids');
 if(!config.scoreField||['player_id','player_name','game_id','region'].includes(config.scoreField)||!config.authHeader||typeof config.decodeLeaderboard!=='function'||!['json','form'].includes(config.bodyEncoding))throw Error('api-contract');
}
export function createEventApi(config,context,fetcher=fetch){
 validateApiConfig(config);
 async function request(path,{query,body,auth=false}={}){
  const url=new URL(config.apiBaseUrl.replace(/\/$/,'')+path);
  if(query)url.search=new URLSearchParams(query).toString();
  const headers={Accept:'application/json'};
  if(auth)headers[config.authHeader]=(config.authPrefix||'')+context.authToken;
  if(body)headers['Content-Type']=config.bodyEncoding==='form'?'application/x-www-form-urlencoded':'application/json';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetcher(url.href,{method:body?'POST':'GET',headers,body:body?(config.bodyEncoding==='form'?new URLSearchParams(body).toString():JSON.stringify(body)):undefined,cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
   if(!response.ok)throw Error('api-http-'+response.status);
   const payload=await response.json();
   if(payload?.success!==true)throw Error('api-rejected');
   return payload;
  }finally{clearTimeout(timer);}
 }
 return {
  async getDay(day,maxScore){
   const payload=await request('/leaderboard/get',{query:{game_id:config.gameIds[day-1],player_id:context.accountUuid}});
   const result=config.decodeLeaderboard(payload,context.accountUuid);
   const valid=score=>Number.isInteger(score)&&score>=0&&score<=maxScore;
   if(!result||!Array.isArray(result.rows)||(result.playerScore!==null&&!valid(result.playerScore)))throw Error('api-response');
   const rows=result.rows.map(row=>{
    if(!row||typeof row.playerId!=='string'||typeof row.name!=='string'||!valid(row.score)||!Number.isInteger(row.rank)||row.rank<1)throw Error('api-row');
    return {...row,self:row.playerId===context.accountUuid};
   });
   return {rows,playerScore:result.playerScore};
  },
  saveDay(day,score){return request('/leaderboard/add',{body:{player_id:context.accountUuid,player_name:context.playerName,game_id:config.gameIds[day-1],region:context.region,[config.scoreField]:score}});},
  complete(){return request('/statistics/rythm-event/add',{auth:true,body:{event_type:'rythm_event_completed'}});},
 };
}
// One writer per page; failed requests stay pending, including across reloads.
export function createProgressSync({api,storage,key,maxScores,onChange=()=>{}}){
 let saved;try{saved=JSON.parse(storage.getItem(key)||'{}');}catch{}
 const state={scores:{},pending:{},completionPending:false,completionSent:false};
 const valid=(d,s)=>/^[1-7]$/.test(d)&&Number.isInteger(s)&&s>=0&&s<=maxScores[Number(d)-1];
 for(const d of Object.keys(saved?.scores||{}))if(valid(d,saved.scores[d]))state.scores[d]=saved.scores[d];
 for(const d of Object.keys(saved?.pending||{}))if(valid(d,saved.pending[d])){state.pending[d]=saved.pending[d];state.scores[d]=Math.max(state.scores[d]??0,saved.pending[d]);}
 state.completionSent=saved?.completionSent===true;
 state.completionPending=saved?.completionPending===true&&!state.completionSent;
 let active=null;
 function persist(){try{storage.setItem(key,JSON.stringify(state));}catch{}onChange();}
 return {
  state,
  merge(day,score){if(score!==null){state.scores[day]=Math.max(state.scores[day]??0,score);if(Object.hasOwn(state.pending,day))state.pending[day]=state.scores[day];}persist();},
  record(day,score){state.scores[day]=Math.max(state.scores[day]??0,score);state.pending[day]=state.scores[day];persist();},
  markCompleted(){if(!state.completionSent){state.completionPending=true;persist();}},
  flush(){
   if(active)return active;
   active=(async()=>{
    // Yield before finally so even an empty queue clears the assigned promise.
    await Promise.resolve();
    try{
     while(Object.keys(state.pending).length){
      const day=Object.keys(state.pending)[0],score=state.pending[day];
      await api.saveDay(Number(day),score);
      if(state.pending[day]===score)delete state.pending[day];persist();
     }
     if(state.completionPending&&!state.completionSent){await api.complete();state.completionPending=false;state.completionSent=true;persist();}
    }finally{active=null;}
   })();
   return active;
  },
 };
}
