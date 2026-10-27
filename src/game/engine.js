import { getNode } from './map';
import { resolveRoll, HEALTH_MODIFIERS, SANITY_MODIFIERS, DC } from './rules';

export function createInitialState() {
  return { nodeId:'start', health:'Full', sanity:'Steady', inventory:[], flags:{}, afflictions:[], turn:0, history:[], visited:['start'], repeatActions:{} };
}
function worsenHealth(value){return value==='Full'?'Hurt':value==='Hurt'?'Critical':value==='Critical'?'Dead':'Dead';}
function worsenSanity(value){return value==='Steady'?'Rattled':value==='Rattled'?'Breaking':value==='Breaking'?'Lost':'Lost';}
function improveHealth(value){return value==='Dead'?'Dead':value==='Critical'?'Hurt':value==='Hurt'?'Full':value;}
function improveSanity(value){return value==='Lost'?'Lost':value==='Breaking'?'Rattled':value==='Rattled'?'Steady':value;}
function applyRollConsequences(next,choice,roll){
 if(!roll)return;
 const stat=choice.stat==='sanity'?'sanity':'health';
 if(roll.outcome==='critical_success'){next.flags.lucky_break=true;return;}
 if(roll.outcome==='success')return;
 if(roll.outcome==='partial_success'){
   if(choice.risk==='high'||choice.risk==='lethal'){if(stat==='health')next.health=worsenHealth(next.health);else next.sanity=worsenSanity(next.sanity);}
   else next.flags.complication=true;
   return;
 }
 if(roll.outcome==='critical_failure'){
   if(stat==='health'){next.health=worsenHealth(next.health);if(next.health!=='Dead')next.health=worsenHealth(next.health);}
   else {next.sanity=worsenSanity(next.sanity);if(next.sanity!=='Lost')next.sanity=worsenSanity(next.sanity);}
   const affliction=stat==='health'?'Sprained Ankle':'Shaken';
   if(!(next.afflictions||[]).includes(affliction))next.afflictions=[...(next.afflictions||[]),affliction];
   return;
 }
 if(stat==='health')next.health=worsenHealth(next.health);else next.sanity=worsenSanity(next.sanity);
}
export function applyChoice(state,choice){
 const next={...state,turn:(state.turn||0)+1,inventory:[...(state.inventory||[])],flags:{...(state.flags||{})},afflictions:[...(state.afflictions||[])],history:[...(state.history||[])],visited:[...(state.visited||[state.nodeId])],repeatActions:{...(state.repeatActions||{})}};
 next.flags.inventoryFull=false;
 if(choice.effect?.item&&!next.inventory.includes(choice.effect.item)){if(next.inventory.length<3)next.inventory.push(choice.effect.item);else next.flags.inventoryFull=true;}
 if(choice.effect?.flag)next.flags[choice.effect.flag]=true;
 if(choice.effect?.recover==='health')next.health=improveHealth(next.health);
 if(choice.effect?.recover==='sanity')next.sanity=improveSanity(next.sanity);
 const stat=choice.stat==='sanity'?'sanity':'health';
 const base=stat==='health'?(HEALTH_MODIFIERS[next.health]??0):(SANITY_MODIFIERS[next.sanity]??0);
 const repeat=next.repeatActions[choice.text]||0;
 const modifier=choice.modifierIsTotal?Math.max(-6,Math.min(6,choice.modifier||0)):Math.max(-6,Math.min(6,base+(choice.modifier||0)-repeat*2));
 const roll=choice.dc?{...resolveRoll(choice.dc,modifier),dc:choice.dc,modifier}:null;
 applyRollConsequences(next,choice,roll);
 next.repeatActions[choice.text]=repeat+1;
 next.nodeId=next.health==='Dead'?'ending_dead':next.sanity==='Lost'?'ending_lost':choice.next;
 if(next.nodeId&&!next.visited.includes(next.nodeId))next.visited.push(next.nodeId);
 next.history.push({action:choice.text,from:state.nodeId,nodeId:next.nodeId,outcome:roll?.outcome||'no roll',roll:roll?{...roll,dc:choice.dc,modifier}:null});
 return {state:next,roll,nextNodeId:next.nodeId};
}
const STOP_WORDS=new Set(['the','a','an','to','and','or','i','me','my','it','on','in','at','with','for','of','do','try','want','would','like','please','then','now','just']);
function words(text){return text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP_WORDS.has(w));}
function explicitSelfInjury(action) {
 return /\b(?:hit|strike|punch|kick|smash|slam|stab|cut|burn|shoot|hurt|injure|attack|swing|throw|drive)\b.{0,70}\b(?:myself|my own (?:left |right )?(?:head|face|body|arm|leg|shoulder)|self)\b/i.test(action)
  || /\b(?:myself|my own (?:left |right )?(?:head|face|body|arm|leg|shoulder))\b.{0,70}\b(?:hit|strike|punch|kick|smash|slam|stab|cut|burn|shoot|hurt|injure|attack|swing|throw|drive)\b/i.test(action)
  || /\b(?:swing|throw|drive)\b.{0,80}\b(?:into|at)\b.{0,30}\bmyself\b/i.test(action);
}
function healthRank(value) { return ({Full:0,Hurt:1,Critical:2,Dead:3})[value] ?? 0; }
function applyNarratedPhysicalConsequences(next, action, beforeHealth) {
 if (!explicitSelfInjury(action)) return;
 // Explicitly narrated self-injury must affect the game even when the roll succeeds.
 // Avoid charging a second injury when the roll already reduced health.
 if (healthRank(next.health) <= healthRank(beforeHealth)) next.health = worsenHealth(beforeHealth);
 next.flags = {...(next.flags||{}), selfInjury:true};
}
export function resolveCustomAction(state,rawAction,assessment=null){
 const action=String(rawAction||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,200);
 const node=(state.nodeMap&&state.nodeMap[state.nodeId])||getNode(state.nodeId);if(!node||!action)return null;
 const beforeHealth=state.health;
 const actionWords=new Set(words(action));
 const scored=(node.choices||[]).map(choice=>{
  const choiceWords=words(choice.text);let score=choiceWords.reduce((sum,word)=>sum+(actionWords.has(word)?2:0),0);const text=action.toLowerCase();
  if(/\b(take|grab|pick up|collect|pocket)\b/.test(text)&&choice.effect?.item)score+=5;
  if(/\b(listen|hear)\b/.test(text)&&/listen|hear|silent|still/.test(choice.text.toLowerCase()))score+=4;
  if(/\b(run|sprint|flee|escape)\b/.test(text)&&/run|scramble|escape|back away/.test(choice.text.toLowerCase()))score+=4;
  if(/\b(return|retreat|leave|back out)\b/.test(text)&&/return|leave|turn back|back away|back out/.test(choice.text.toLowerCase()))score+=4;
  if(/\b(search|inspect|examine|study|look|feel)\b/.test(text)&&/search|examine|study|inspect|feel|look/.test(choice.text.toLowerCase()))score+=4;
  if(/\b(enter|open|go|walk|descend|follow|continue)\b/.test(text)&&/enter|open|go |walk|descend|follow|continue|take the door|take the slope/.test(choice.text.toLowerCase()))score+=3;
  return {choice,score};
 }).sort((a,b)=>b.score-a.score);
 if(scored.length&&scored[0].score>=2){const matched=scored[0].choice;const result=applyChoice(state,{...matched,text:action,...(assessment?{dc:assessment.dc,stat:assessment.stat,modifier:assessment.modifier,modifierIsTotal:true,risk:assessment.risk}: {})});applyNarratedPhysicalConsequences(result.state,action,beforeHealth);if(result.state.health==='Dead')result.state.nodeId='ending_dead';result.state.history[result.state.history.length-1].action=action;result.matchedChoice=scored[0].choice.text;return result;}
 const observation=/look|listen|search|feel|study|inspect|examine|read|smell|wait|hide|think|remember/i.test(action);
 const stat=observation?'sanity':'health';
 const mod=assessment?assessment.modifier:(stat==='health'?(HEALTH_MODIFIERS[state.health]??0):(SANITY_MODIFIERS[state.sanity]??0));
 const risk=/\b(run|climb|jump|force|fight|break|swim|cross)\b/i.test(action)?'high':'moderate';
 const dc=assessment?.dc||DC.Moderate;const roll={...resolveRoll(dc,mod),dc,modifier:mod};
 const next={...state,turn:(state.turn||0)+1,inventory:[...(state.inventory||[])],flags:{...(state.flags||{})},afflictions:[...(state.afflictions||[])],history:[...(state.history||[])],visited:[...(state.visited||[state.nodeId])]};
 applyRollConsequences(next,{stat,risk},roll);
 applyNarratedPhysicalConsequences(next,action,beforeHealth);
 next.nodeId=next.health==='Dead'?'ending_dead':next.sanity==='Lost'?'ending_lost':state.nodeId;
 next.history.push({action,from:state.nodeId,nodeId:next.nodeId,outcome:roll.outcome,roll:{...roll,dc:DC.Moderate,modifier:mod}});
 return {state:next,roll,nextNodeId:next.nodeId,matchedChoice:null};
}
export function getCurrentNode(state){return (state?.nodeMap&&state.nodeMap[state.nodeId])||getNode(state?.nodeId);}
