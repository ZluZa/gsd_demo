// One decoded-audio clock for playback, note positions and hit judgement.
let context;
const effects=new Set();
export function audioContext(){return context ||= new (window.AudioContext||window.webkitAudioContext)();}
export async function unlockAudio(){await audioContext().resume();}
export class TrackAudio {
 constructor(buffer,leadIn){this.buffer=buffer;this.position=-leadIn;this.paused=true;this.revision=0;this.duration=buffer.duration;}
 get currentTime(){return this.paused?this.position:this.position+audioContext().currentTime-this.started;}
 async play(){
  const revision=this.revision;await unlockAudio();if(revision!==this.revision||!this.paused)return;
  const ctx=audioContext(),source=ctx.createBufferSource();source.buffer=this.buffer;source.connect(ctx.destination);
  this.started=ctx.currentTime;this.paused=false;this.source=source;
  source.onended=()=>{if(this.source===source&&!this.paused){this.position=this.duration;this.paused=true;this.onended?.();}};
  source.start(ctx.currentTime+Math.max(0,-this.position),Math.max(0,this.position));
 }
 pause(){this.revision++;if(this.paused)return;this.position=this.currentTime;this.paused=true;this.source.onended=null;this.source.stop();this.source=null;}
}
export async function loadTrack(url,leadIn){
 const response=await fetch(url);if(!response.ok)throw Error('Audio load failed');
 return new TrackAudio(await audioContext().decodeAudioData(await response.arrayBuffer()),leadIn);
}
function tone(frequency,start,duration,volume=.1){
 const ctx=audioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=frequency;
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
 osc.connect(gain).connect(ctx.destination);effects.add(osc);osc.onended=()=>{effects.delete(osc);gain.disconnect();};osc.start(start);osc.stop(start+duration);
}
export function beep(number){tone(number===1?880:660,audioContext().currentTime,.13);}
let applauseBuffer;
let effectRevision=0;
export function prepareApplause(){
 if(!applauseBuffer)applauseBuffer=fetch('public/assets/effects/crowd-cheering-applause.mp3')
  .then(response=>{if(!response.ok)throw Error('Applause load failed');return response.arrayBuffer();})
  .then(data=>audioContext().decodeAudioData(data))
  .catch(error=>{applauseBuffer=null;throw error;});
 return applauseBuffer;
}
export function stopEffects(){effectRevision++;for(const source of effects)source.stop();effects.clear();}
export async function celebrate(){
 stopEffects();const revision=effectRevision;
 try{
  await unlockAudio();const buffer=await prepareApplause();
  if(revision!==effectRevision||document.hidden)return;
  const ctx=audioContext(),source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffer;gain.gain.value=.65;source.connect(gain).connect(ctx.destination);
  effects.add(source);source.onended=()=>{effects.delete(source);source.disconnect();gain.disconnect();};source.start();
 }catch(error){console.warn('Applause unavailable',error);}
}
