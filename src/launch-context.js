const identityParams=['accountUuid','playerName','startDate','endDate','authToken'];
export const isAppLaunch=params=>identityParams.some(key=>params.has(key));
export function parseLaunchDate(value,{dateOffsetMinutes=0,endDateInclusive=false}={},end=false){
 let match, result;
 if((match=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value||'')) || (match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||''))){
  const [y,m,d]=value.includes('.')?[+match[3],+match[2],+match[1]]:[+match[1],+match[2],+match[3]];
  const utc=Date.UTC(y,m-1,d),date=new Date(utc);
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('launch-date');
  result=utc-dateOffsetMinutes*60000+(end&&endDateInclusive?86400000:0);
 }else if(/^\d{10}$|^\d{13}$/.test(value||''))result=Number(value)*(value.length===10?1000:1);
 else if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value||'')){parseLaunchDate(value.slice(0,10));result=Date.parse(value);}
 if(!Number.isFinite(result))throw Error('launch-date');
 return result;
}
export function readLaunchContext(params,config){
 if(!isAppLaunch(params))return null;
 for(const key of identityParams)if(!params.get(key)?.trim())throw Error('launch-'+key);
 if(!params.get('lang')?.trim())throw Error('launch-lang');
 if(params.get('accountUuid').length>100||params.get('playerName').length>100||params.get('lang').length>10)throw Error('launch-length');
 const startsAt=parseLaunchDate(params.get('startDate'),config),endsAt=parseLaunchDate(params.get('endDate'),config,true);
 if(endsAt<=startsAt)throw Error('launch-period');
 return {accountUuid:params.get('accountUuid'),playerName:params.get('playerName'),
  region:params.get('lang'),language:params.get('lang').toLowerCase().split(/[-_]/)[0],
  startsAt,endsAt,authToken:params.get('authToken'),eventId:`rythm:${startsAt}:${endsAt}`};
}
export function launchEvent(context,now=Date.now()){
 return {id:context.eventId,startsAt:context.startsAt,endsAt:context.endsAt,serverNow:now,clockSource:'device',prototype:false};
}
export const progressKey=context=>'321playsy:app:'+JSON.stringify([context.accountUuid,context.startsAt,context.endsAt]);
