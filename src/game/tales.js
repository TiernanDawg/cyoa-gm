import { PREMISES } from './premises';
export const TALE_STYLES=['Dark Folktale','Psychological Dread','Cosmic Horror','Gothic Mystery','Occult Conspiracy','Survival Realism'];
const BIBLES={
'Dark Folktale':{settings:['a flooded mining village','a manor swallowed by peat','a chapel beneath a ruined bridge','a mill that turns without a river'],threats:['a bell that rings from underground','a caretaker who has no reflection','a procession of wet footprints','a door that appears only after midnight'],truths:['the village has traded memories for safe harvests','the building rebuilds itself around a buried witness','the bell marks people who have not died yet']},
'Psychological Dread':{settings:['an empty rehabilitation clinic','a familiar apartment block with one extra floor','a roadside motel during a storm','a school closed after a fire'],threats:['a second version of your voice on the intercom','a patient who remembers your childhood','a room that changes when you blink','a neighbour who insists you have already left'],truths:['your notes were written in your own handwriting tomorrow','the building repeats a night you cannot remember','every witness recalls a different version of your arrival']},
'Cosmic Horror':{settings:['an observatory cut into black rock','a research station under polar ice','a coastal radio telescope','a deep-sea survey platform'],threats:['a signal that answers before transmission','a star visible beneath the floor','a pressure wave with a human rhythm','a map of constellations that move when named'],truths:['the signal comes from a future observer','the structure measures a sleeping intelligence','the sky is a reflection and the world is below it']},
'Gothic Mystery':{settings:['a decaying estate above the sea','a courthouse sealed after a trial','a winter hotel with one locked suite','a family crypt beneath a glasshouse'],threats:['a portrait with a fresh wound','a solicitor delivering letters to the dead','a locked room that smells of rain','a housekeeper who denies an entire wing'],truths:['the inheritance is a legal claim on the heir’s memories','the murder victim still signs the household accounts','the sealed room is the only place where time remains ordinary']},
'Occult Conspiracy':{settings:['an abandoned civil-defence bunker','a records archive beneath city hall','a closed subway platform','a decommissioned weather station'],threats:['redacted files predict local deaths','a phone rings from disconnected lines','an agency seal is dated next year','a broadcast hides inside emergency alerts'],truths:['the cover-up hides a failed evacuation, not a supernatural weapon','the records are edited by an office that officially never existed','the warnings are real but their stated cause is a lie']},
'Survival Realism':{settings:['a flooded service tunnel','a winter logging camp','a storm-damaged coastal road','a remote utility station after a blackout'],threats:['a failing backup generator','water rising behind a jammed door','a radio with a weak distress signal','a missing worker’s trail ending at a locked gate'],truths:['the safest route requires returning through the flooded section','the distress signal loops from an earlier failed rescue','the shortcut crosses unstable ground']}}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)|0;let t=Math.imul(x^x>>>15,1|x);t=(t+Math.imul(t^t>>>7,61|t))^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function pickTale(style,seed='1',premise=''){
 const actual=TALE_STYLES.includes(style)?style:TALE_STYLES[hash(String(seed))%TALE_STYLES.length];
 const random=rng(hash(String(seed)+actual+premise)),custom=String(premise||'').trim(),selected=PREMISES.find(p=>p.setting===custom||p.id===custom)||PREMISES[Math.floor(random()*PREMISES.length)];
 const opening='The '+selected.setting.replace(/^a |^an |^the /i,'')+' is quiet at this hour. '+selected.wrongDetail+' Your phone has a working flashlight and '+(4+Math.floor(random()*77))+'% battery. You check the nearest way out. Then you notice the same detail somewhere it cannot be.';
 return {style:actual,subtitle:custom&&!PREMISES.some(p=>p.setting===custom||p.id===custom)?custom.slice(0,70):selected.title,seed:String(seed),premiseId:selected.id,setting:selected.setting,threat:selected.threatType,wrongDetail:selected.wrongDetail,secretTruth:selected.truth,storyBible:{protagonistSituation:'Alone after hours, with a phone and ordinary tools.',setting:selected.setting,wrongDetail:selected.wrongDetail,truth:selected.truth,people:[{name:'Mara',motive:'wants to keep the incident quiet'},{name:'Eli',motive:'needs someone to verify what happened'}],threatRule:'The threat only acts when the wrong detail is ignored twice.',midStoryTurn:'An early clue is revealed to have been deliberately planted.',endings:['escape','truth','sacrifice']},motifs:[selected.setting,selected.wrongDetail,'a record with missing lines'],npcs:['Mara, a reluctant witness','Eli, who needs proof'],opening,endingConditions:['discover the central truth','reach a viable exit','lose health or sanity beyond recovery']};
}
export function storyChoices(tale,nodeId,turn=0){
 const r=rng(hash(tale.seed+nodeId+turn)),choose=a=>a[Math.floor(r()*a.length)];
 return [
 {id:'observe',label:choose(['Study the nearest detail','Listen before moving','Search for a sign of recent passage']),category:'perception',tier:'easy',risk:'low',stat:'sanity',dc:10},
 {id:'advance',label:choose(['Move toward the source of the sound','Follow the safest visible route','Test the next doorway']),category:'physical',tier:'moderate',risk:'moderate',stat:'health',dc:13},
 {id:'improvise',label:choose(['Try a careful improvised solution','Use the surroundings to gain leverage','Make a quiet attempt to change the situation']),category:'craft',tier:'hard',risk:'high',stat:'health',dc:16}
 ];
}


const LOCATION_BEATS = [
  ['Threshold','The entrance seals behind you with a soft, deliberate click.'],
  ['First Evidence','A fresh trace contradicts the story you were told.'],
  ['Narrow Passage','The route pinches down; turning around is possible, but no longer easy.'],
  ['Witness','A frightened witness offers one useful fact and one obvious lie.'],
  ['Resource Room','You find supplies left by someone who expected to return.'],
  ['False Exit','An exit sign points toward a space that should not exist.'],
  ['Recorded Warning','A recording describes the next sound before it happens.'],
  ['Hidden Route','A seam in the structure reveals a path omitted from every map.'],
  ['Confrontation','The threat finally responds to your presence instead of merely following.'],
  ['Cost','The safest option requires sacrificing something you have protected.'],
  ['Revelation','The clues form a coherent explanation, though it is worse than ignorance.'],
  ['Final Approach','Three routes remain: escape, pursue the truth, or risk everything.'],
  ['Aftermath','The immediate danger eases, but the price of your choices is now visible.'],
  ['The Missing Record','A final record contradicts one important assumption about the threat.'],
  ['The Long Way Out','The route toward safety requires one last deliberate risk.'],
  ['Last Witness','Someone who stayed silent finally gives a direct answer.'],
  ['Point of No Return','The situation can no longer be contained by hiding or waiting.'],
  ['Final Reckoning','The evidence, the threat, and your earlier decisions converge.']
];
const ENDING_BEATS = {
  escape: {title:'A Narrow Escape',scene:'You force your way into open air. The world appears ordinary again, but one small detail proves the place has not finished with you.'},
  truth: {title:'The Truth Beneath',scene:'The final evidence fits together. You understand what happened and why the place kept you alive long enough to discover it. Understanding is not the same as safety.'},
  sacrifice: {title:'The Price',scene:'You stop the immediate danger at a cost that cannot be reversed. The silence afterward feels earned, but it does not feel like victory.'}
};
export function buildTaleMap(tale, options = {}) {\n  const requestedLength = options.length || tale.length || 'Standard';\n  const beatCount = requestedLength === 'Short' ? 6 : (requestedLength === 'Long' || requestedLength === 'Endless') ? LOCATION_BEATS.length : Math.min(12, LOCATION_BEATS.length);
  const map = {};
  const title = tale.subtitle || tale.style;
  const setting = tale.setting || 'the sealed place';
  const threat = tale.threat || 'a sound from the dark';
  const truth = tale.secretTruth || 'the place is keeping a record of you';
  for (let i=0;i<beatCount;i++) {
    const [beat,detail]=LOCATION_BEATS[i];
    const nextA = i===beatCount-1 ? 'tale_ending_escape' : 'tale_'+(i+1);
    const nextB = i===beatCount-1 ? 'tale_ending_truth' : 'tale_'+Math.min(beatCount-1,i+2);
    const nextC = i===beatCount-1 ? 'tale_ending_sacrifice' : 'tale_'+Math.min(beatCount-1,i+3);
    map['tale_'+i] = {
      scene: (i===0?(tale.opening||'')+' ':'')+title+'. '+beat+'. '+detail+' You are inside '+setting+'. '+(i%3===0?'Nearby, '+threat+'. ':i%3===1?'A clue points toward the explanation: '+truth+'. ':'Your earlier decisions have changed what feels safe. ')+'The next move must address what is actually here. '+(i%4===0?'You can see a reachable exit marker and fresh evidence. ':i%4===1?'A loose panel and a damaged light are within reach. ':i%4===2?'The route narrows beside a clear source of sound. ':'A dropped object lies near the only visible doorway. '),
      choices: [
        {text:i===beatCount-1?'Reach the exit route described by the evidence.':i%4===0?'Inspect the fresh evidence before committing to a route.':i%4===1?'Check the loose panel and the damaged light.':i%4===2?'Trace the sound without leaving cover.':'Examine the dropped object and nearby doorway.',next:nextA,dc:10+i%4,stat:'sanity',risk:'low'},
        {text:i===beatCount-1?'Follow the clues and confront the truth.':i%3===0?'Move toward the threat while keeping an escape route.':i%3===1?'Take the narrow route and watch your footing.':'Test the doorway and keep the evidence in sight.',next:nextB,dc:13+i%5,stat:i%2?'health':'sanity',risk:'moderate'},
        {text:i===beatCount-1?'Make a final, costly attempt to change the outcome.':i%3===0?'Use a carried item to create a safer opening.':i%3===1?'Force a way past the obstruction.':'Risk a quick move before the sound gets closer.',next:nextC,dc:16+i%4,stat:'health',risk:'high'}
      ]
    };
  }
  for (const [key,ending] of Object.entries(ENDING_BEATS)) map['tale_ending_'+key]={scene:ending.scene+' The case file is marked: '+ending.title+'.',choices:[]};
  return map;
}
