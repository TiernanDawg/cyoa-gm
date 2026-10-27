#!/usr/bin/env node
// Dependency-free procedural sound pack generator. 16-bit mono PCM, 22.05 kHz.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'assets', 'audio');
const names = [
'ui_tap','ui_confirm','ui_back','menu_move','typewriter_tick','dice_rattle','dice_land',
'roll_crit_success','roll_success','roll_partial','roll_fail','roll_crit_fail','hit_health',
'hit_sanity','heartbeat_loop','item_gain','achievement_chime','amb_folktale',
'amb_psychological','amb_cosmic','amb_gothic','amb_conspiracy','amb_survival',
'ending_death','ending_escape','ending_insanity','ending_revelation'
];
const sr = 22050;
function wav(name, seconds, fn) {
  const n = Math.floor(sr * seconds), pcm = Buffer.alloc(n * 2);
  let peak = 0; const samples = new Float32Array(n);
  for (let i=0;i<n;i++) { const t=i/sr; samples[i]=fn(t,i,n); peak=Math.max(peak,Math.abs(samples[i])); }
  const gain = peak ? 0.70/peak : 1;
  for (let i=0;i<n;i++) {
    const fade = Math.min(1, i/(sr*0.025), (n-1-i)/(sr*0.035));
    pcm.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(samples[i]*gain*fade*32767))),i*2);
  }
  const header=Buffer.alloc(44); header.write('RIFF',0); header.writeUInt32LE(36+pcm.length,4); header.write('WAVE',8);
  header.write('fmt ',12); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22);
  header.writeUInt32LE(sr,24); header.writeUInt32LE(sr*2,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34);
  header.write('data',36); header.writeUInt32LE(pcm.length,40); fs.mkdirSync(root,{recursive:true}); fs.writeFileSync(path.join(root,name+'.wav'),Buffer.concat([header,pcm]));
}
function tone(t,f,decay=4){return Math.sin(2*Math.PI*f*t)*Math.exp(-decay*t);}
function noise(){return Math.random()*2-1;}
if (process.argv.includes('--verify')) {
  const missing=names.filter(n=>!fs.existsSync(path.join(root,n+'.wav')) || fs.statSync(path.join(root,n+'.wav')).size<44);
  if(missing.length){console.error('Missing audio:',missing.join(', '));process.exit(1);}
  console.log('Verified '+names.length+' generated audio files.'); process.exit(0);
}
names.forEach((name,i)=>{
  const ambient=name.startsWith('amb_')||name==='heartbeat_loop';
  const seconds=ambient?14:(name==='dice_rattle'?1.1:0.42);
  const base=70+(i*17)%420;
  wav(name,seconds,(t,k,n)=>{
    const env=Math.min(1,t*18,(seconds-t)*18);
    if(name==='heartbeat_loop') {const p=t%0.86;return (tone(p,58,9)+(p>0.16?0:tone(p,43,13)))*0.5;}
    if(name.startsWith('amb_')) {const slow=Math.sin(t*0.42+i)*0.3;return (Math.sin(2*Math.PI*(base/5+slow)*t)*0.36+noise()*0.07+Math.sin(2*Math.PI*(base/3)*t)*0.13)*0.65;}
    if(name==='typewriter_tick'||name==='ui_tap'||name==='menu_move') return noise()*Math.exp(-t*45)*0.35+tone(t,base,30)*0.15;
    if(name==='dice_rattle') return (noise()*0.65+tone(t,base,2)*0.3)*Math.max(0,1-t/seconds);
    if(name==='hit_health'||name==='roll_crit_fail'||name==='ending_death') return (tone(t,base/2,3)+noise()*0.15)*env;
    if(name==='hit_sanity'||name==='ending_insanity') return (tone(t,base*0.7,1.8)+tone(t,base*1.04,2.3))*env;
    return (tone(t,base,4)+tone(t,base*1.5,6)*0.35)*env;
  });
});
console.log('Generated '+names.length+' original procedural WAV files in assets/audio/.');
