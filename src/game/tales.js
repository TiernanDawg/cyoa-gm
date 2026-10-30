import { storageUnitStory } from './stories/unit-18';
import { wrongPickupStory } from './stories/wrong-pickup';
import { lastPumpStory } from './stories/last-pump';
import { nightShiftStory } from './stories/night-shift';
export const TALE_STYLES=['Dark Folktale','Psychological Dread','Cosmic Horror','Gothic Mystery','Occult Conspiracy','Survival Realism'];
export const AVAILABLE_STORIES=[storageUnitStory,wrongPickupStory,lastPumpStory,nightShiftStory];
export function pickTale(style,seed='1',premise=''){
 const chosen=AVAILABLE_STORIES.find(s=>s.meta?.id===premise||s.meta?.setting===premise)||AVAILABLE_STORIES[0];
 if(!chosen)return null;
 return {style:chosen.meta.style,subtitle:chosen.meta.subtitle,seed:String(seed),premiseId:chosen.meta.id,setting:chosen.meta.setting,threat:chosen.meta.style,wrongDetail:chosen.meta.wrongDetail,secretTruth:chosen.meta.hiddenTruth,storyBible:{...chosen.meta,protagonistSituation:chosen.meta.whyHere},opening:chosen.beats?.[0]?.scene||'',authoredStory:chosen};
}
export function storyChoices(tale,nodeId,turn=0){
 const data=tale?.authoredStory||storageUnitStory,beat=data?.beats?.find(b=>b.id===nodeId);
 return Array.isArray(beat?.choices)?beat.choices.map((c,i)=>({id:beat.id+'_'+i,text:c[0],successLead:c[1],failureLead:c[2],dc:c[3],stat:c[4],risk:c[5],next:c[6]})):[];
}
function selectEnding(ending,state={}){
 const variants=Array.isArray(ending?.variants)?ending.variants:[];
 const conditions={injured:Number(state.health||100)<50||Number(state.sanity||100)<35,learnedTruth:!!(state.flags?.learnedTruth||state.learnedTruth||state.consequences?.learnedTruth)};
 return variants.find(v=>v.when==='injured'&&conditions.injured)||variants.find(v=>v.when==='learnedTruth'&&conditions.learnedTruth)||variants.find(v=>v.when==='default')||variants[0];
}
export function buildTaleMap(tale,options={}){
 const data=tale?.authoredStory||storageUnitStory;if(!data||!Array.isArray(data.beats))return{};
 const short=(options.length||tale?.length)==='Short';
 const selected=short?data.beats.filter(b=>b.core):data.beats;
 const selectedIds=new Set(selected.map(b=>b.id)),allIndex=new Map(data.beats.map((b,i)=>[b.id,i]));
 const nextSelected=(target,fromIndex)=>{let i=Number.isInteger(allIndex.get(target))?allIndex.get(target):fromIndex+1;for(;i<data.beats.length;i++)if(selectedIds.has(data.beats[i].id))return data.beats[i].id;return null;};
 const map={};
 for(const [i,beat] of selected.entries()){
  map[beat.id]={scene:beat.scene,style:data.meta.style,tag:data.meta.tag,choices:(Array.isArray(beat.choices)?beat.choices:[]).map((c,n)=>({id:beat.id+'_'+n,text:c[0],successLead:c[1],failureLead:c[2],dc:c[3],stat:c[4],risk:c[5],next:c[6]?.startsWith('tale_ending_')?c[6]:nextSelected(c[6],allIndex.get(beat.id)??i),tier:'authored',modifier:0}))};
 }
 for(const [kind,ending] of Object.entries(data.endings||{})){
  map['tale_ending_'+kind]={scene:ending.variants?.[0]?.text||'The story ends.',endingVariants:ending.variants||[],resolveScene:(state)=>selectEnding(ending,state)?.text||'The story ends.',choices:[]};
 }
 return map;
}

// Authored story catalog is intentionally limited to validated modules.
