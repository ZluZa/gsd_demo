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
export function stopEffects(){for(const source of effects){source.stop();}effects.clear();window.speechSynthesis?.cancel();}
export function celebrate(lang){
 const ctx=audioContext(),start=ctx.currentTime;
 // Layer short, filtered noise transients into a small applauding crowd.
 for(let i=0;i<85;i++){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.13),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let j=0;j<data.length;j++)data[j]=(Math.random()*2-1)*Math.exp(-j/(ctx.sampleRate*.025));
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1000+Math.random()*1600;filter.Q.value=.6;
  gain.gain.value=.13*(1-i/110);pan.pan.value=Math.random()*1.6-.8;
  source.connect(filter).connect(gain).connect(pan).connect(ctx.destination);effects.add(source);
  source.onended=()=>{effects.delete(source);filter.disconnect();gain.disconnect();pan.disconnect();};source.start(start+i*.035+Math.random()*.05);
 }
 [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,start+i*.15,.45,.06));
 if(window.speechSynthesis){const speech=new SpeechSynthesisUtterance({ru:'Поздравляем! Отлично сыграно!',en:'Congratulations! Well played!',ar:'تهانينا! أحسنت!',hi:'बधाई हो! बहुत अच्छा!'}[lang]);speech.lang={ru:'ru-RU',en:'en-US',ar:'ar-SA',hi:'hi-IN'}[lang];speech.volume=.8;window.speechSynthesis.speak(speech);}
}
