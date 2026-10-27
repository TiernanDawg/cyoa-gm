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
 const bible=BIBLES[actual],random=rng(hash(String(seed)+actual+premise)),choose=list=>list[Math.floor(random()*list.length)];
 const setting=choose(bible.settings),threat=choose(bible.threats),truth=choose(bible.truths);
 const brief=premise.trim()?'Your own premise shadows every detail: '+premise.trim().slice(0,240)+'. ':'';
 const opening=actual==='Survival Realism'?brief+'You reach '+setting+'. The emergency light is down to a thin red strip. '+threat[0].toUpperCase()+threat.slice(1)+'. Your immediate priority is simple: preserve light, find a safe route, and establish whether anyone can hear you.':
 brief+'You arrive at '+setting+'. The first thing you notice is '+threat+'. The detail is too specific to dismiss, yet every ordinary explanation leaves something out. Somewhere nearby, a small sound repeats at an interval just long enough to make you doubt you heard it. You have no reliable map, only the things you can observe and the choices you make.';
 return {style:actual,subtitle:actual==='Dark Folktale'?'The Dark Below':actual,seed:String(seed),setting,threat,secretTruth:truth,motifs:[setting,threat,'a repeated sound','a record with missing lines'],npcs:['The reluctant witness','The person who knows the route'],opening,endingConditions:['discover the central truth','reach a viable exit','lose health or sanity beyond recovery']};
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
  ['Final Approach','Three routes remain: escape, pursue the truth, or risk everything.']
];
const ENDING_BEATS = {
  escape: {title:'A Narrow Escape',scene:'You force your way into open air. The world appears ordinary again, but one small detail proves the place has not finished with you.'},
  truth: {title:'The Truth Beneath',scene:'The final evidence fits together. You understand what happened and why the place kept you alive long enough to discover it. Understanding is not the same as safety.'},
  sacrifice: {title:'The Price',scene:'You stop the immediate danger at a cost that cannot be reversed. The silence afterward feels earned, but it does not feel like victory.'}
};
export function buildTaleMap(tale) {
  const map = {};
  const title = tale.subtitle || tale.style;
  const setting = tale.setting || 'the sealed place';
  const threat = tale.threat || 'a sound from the dark';
  const truth = tale.secretTruth || 'the place is keeping a record of you';
  for (let i=0;i<LOCATION_BEATS.length;i++) {
    const [beat,detail]=LOCATION_BEATS[i];
    const nextA = i===11 ? 'tale_ending_escape' : 'tale_'+(i+1);
    const nextB = i===11 ? 'tale_ending_truth' : 'tale_'+Math.min(11,i+2);
    const nextC = i===11 ? 'tale_ending_sacrifice' : 'tale_'+Math.min(11,i+3);
    map['tale_'+i] = {
      scene: title+'. '+beat+'. '+detail+' You are inside '+setting+'. '+(i%3===0?'Nearby, '+threat+'. ':i%3===1?'A clue points toward the explanation: '+truth+'. ':'Your earlier decisions have changed what feels safe. ')+'Look for details that can be tested; the place rewards neither panic nor blind confidence.',
      choices: [
        {text:i===11?'Take the exposed route toward the exit.':'Investigate the evidence before moving on.',next:nextA,dc:10+i%4,stat:'sanity',effect:i===4?{item:'emergency supplies'}:undefined},
        {text:i===11?'Follow the clues and accept the truth.':'Take the more dangerous route and keep moving.',next:nextB,dc:13+i%5,stat:i%2?'health':'sanity',risk:'moderate',effect:i===7?{item:'marked map'}:undefined},
        {text:i===11?'Make one final desperate attempt.':'Spend a resource to create a safer opening.',next:nextC,dc:16+i%4,stat:'health',risk:'high',effect:i===4?{item:'flare'}:undefined}
      ]
    };
  }
  for (const [key,ending] of Object.entries(ENDING_BEATS)) map['tale_ending_'+key]={scene:ending.scene+' The case file is marked: '+ending.title+'.',choices:[]};
  return map;
}
