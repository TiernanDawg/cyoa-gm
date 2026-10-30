'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'../src/game/stories');
const failures=[],files=fs.existsSync(root)?fs.readdirSync(root).filter(x=>x.endsWith('.js')):[];const perFile=new Map();
const wordRe=/[\p{L}\p{N}’'-]+/gu;
const words=s=>(String(s??'').match(wordRe)||[]);
const stop=new Set('the a an and or but if then when while as at by for from in into of on onto out over through to under up with without you your yours we our they them he she it this that these those is are was were be been being do did does can could would should will may might must have has had not no yes me my his her their its very more most some any all each other another nearest next one two first second third'.split(' '));
const banned=[/CASE\s*:/i,/\bArrival\b/i,/\bYou are still at\b/i,/chill runs down your spine/i,/the air is thick/i,/flickering shadows/i,/darkness swallowed/i,/you swallow hard/i,/heart pounds in your chest/i,/little did you know/i,/\bsuddenly\b/i,/an eerie silence/i,/sent shivers/i,/hairs on the back of your neck/i,/sense of dread/i,/dimly lit/i,/damp earth/i,/you push open the cracked door/i,/you descend into/i];
const sentenceList=s=>String(s??'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const norm=s=>String(s??'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const nounSet=s=>new Set(words(s).map(x=>x.toLowerCase()).filter(x=>x.length>2&&!stop.has(x.toLowerCase())));
function fail(file,msg){failures.push(file+': '+msg);}
if(!files.length)fail('stories','no authored story files found');
const globalSentences=new Map();
for(const file of files){
 const before=failures.length;
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const meta=key=>{const m=src.match(new RegExp('\\b'+key+':\\s*[\\x27\\x22]([^\\x27\\x22]*)[\\x27\\x22]'));return m?.[1]||'';};
 const id=meta('id'),style=meta('style'),tag=meta('tag');
 if(!id)fail(file,'missing meta.id');
 if(!style)fail(file,'missing meta.style');
 if(!tag)fail(file,'missing meta.tag');
 if(tag&&style&&!new RegExp(tag.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&'),'i').test(style))fail(file,'card tag does not match in-game style');
 const scenes=[...src.matchAll(/scene:\s*\x60([\s\S]*?)\x60/g)].map(m=>m[1]);
 if(scenes.length!==12)fail(file,'expected 12 beats; found '+scenes.length);
 scenes.forEach((scene,i)=>{
  const wc=words(scene).length;
  if(wc<70||wc>160)fail(file,'beat '+i+' passage length '+wc+' (required 70-160)');
  for(const rx of banned)if(rx.test(scene))fail(file,'beat '+i+' contains boilerplate/banned phrase '+rx);
  if(/\.\.\.|!!|\?\?|\?!|!\?/.test(scene))fail(file,'beat '+i+' contains double punctuation');
  if(/\b(?:SCENE|CHOICE|SUCCESS|FAILURE|ENDING)\s*[:#-]/i.test(scene))fail(file,'beat '+i+' leaks a label');
  for(const sentence of sentenceList(scene)){
   const key=norm(sentence);
   if(words(key).length>=6){
    if(globalSentences.has(key)&&globalSentences.get(key)!==file)fail(file,'cross-premise duplicate sentence: '+sentence);
    else if(globalSentences.has(key))fail(file,'repeated sentence: '+sentence);
    globalSentences.set(key,file);
   }
  }
 });
 const choiceBlocks=[...src.matchAll(/choices:\s*\[([\s\S]*?)\]\s*\}/g)].map(m=>m[1]);
 if(choiceBlocks.length!==12)fail(file,'expected choices array for each of 12 beats; found '+choiceBlocks.length);
 choiceBlocks.forEach((block,i)=>{
  const labels=[...block.matchAll(/^\s*\[\s*\x27([^\x27]*)\x27/gm)].map(m=>m[1]);
  if(labels.length!==3){fail(file,'beat '+i+' must have exactly 3 choices');return;}
  const normalized=labels.map(norm);
  if(new Set(normalized).size!==3)fail(file,'beat '+i+' has duplicate choice text');
  const nouns=nounSet(scenes[i]||'');
  labels.forEach((label,j)=>{if(![...nounSet(label)].some(n=>nouns.has(n)))fail(file,'beat '+i+' choice '+(j+1)+' shares no concrete noun with its scene');});
  for(const label of labels)if(/\b(?:SCENE|CHOICE|SUCCESS|FAILURE)\s*[:#-]/i.test(label))fail(file,'beat '+i+' leaks a choice label');
 });
 if(!/endings\s*:\s*\{/.test(src))fail(file,'missing ending variants');
 if(!/variants\s*:\s*\[/.test(src))fail(file,'missing ending variant list');
 perFile.set(id,{ok:failures.length===before,id,file,reasons:failures.slice(before).map(x=>x.slice(file.length+2))});
}
if(!files.includes('unit-18.js'))fail('stories','Unit 18 story missing');
const premiseSource=fs.readFileSync(path.join(__dirname,'../src/game/premises.js'),'utf8');
const titles=[...premiseSource.matchAll(/^\['([^']+)'/gm)].map(m=>m[1]);
const manifest={};
for(const title of titles)manifest[title]={tier:['Wrong Pickup','Last Pump','Night Shift','Wrong Side','Marker Twelve','Room 214','Unit 18'].includes(title)?'FULL':'LITE',status:'hidden',file:null,reasons:['No complete validated authored story module exists yet.']};
for(const [id,result] of perFile){if(!id)continue;if(manifest[id])manifest[id]={tier:manifest[id].tier,status:result.ok?'live':'hidden',file:result.ok?result.file:null,reasons:result.ok?[]:result.reasons};}
const live=Object.values(manifest).filter(x=>x.status==='live');
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(!live.length){console.error('No validated authored premises are live.');process.exit(1);}
if(failures.length)console.warn('Content hidden by manifest; build continues:\n'+failures.join('\n'));
console.log('Story manifest generated: '+live.length+' live, '+(titles.length-live.length)+' hidden.');
console.log('STORY VALIDATION PASSED');
for(const f of files)console.log(f+': 12 validated beats');
