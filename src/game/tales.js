import { storageUnitStory } from './stories/unit-18';
export const TALE_STYLES=['Dark Folktale','Psychological Dread','Cosmic Horror','Gothic Mystery','Occult Conspiracy','Survival Realism'];
export const AVAILABLE_STORIES=[storageUnitStory];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function pickTale(style,seed='1',premise=''){
 const chosen=AVAILABLE_STORIES.find(s=>s.meta.id===premise||s.meta.setting===premise)||AVAILABLE_STORIES[0];
 return {style:chosen.meta.style,subtitle:chosen.meta.subtitle,seed:String(seed),premiseId:chosen.meta.id,setting:chosen.meta.setting,threat:chosen.meta.style,wrongDetail:chosen.meta.wrongDetail,secretTruth:chosen.meta.hiddenTruth,storyBible:{...chosen.meta,protagonistSituation:chosen.meta.whyHere},opening:chosen.beats[0].scene,authoredStory:chosen};
}
export function storyChoices(tale,nodeId,turn=0){return [];}
export function buildTaleMap(tale,options={}){
 const data=tale.authoredStory||storageUnitStory;
 const length=options.length||tale.length||'Standard';
 const selected=length==='Short'?data.beats.filter(b=>b.core):data.beats;
 const map={};
 selected.forEach((beat,index)=>{
  const next=index===selected.length-1?null:selected[index+1].id;
  const fallback=selected[Math.min(index+1,selected.length-1)]?.id||'tale_ending_escape';
  map[beat.id]={scene:beat.scene,style:data.meta.style,tag:data.meta.tag,choices:beat.choices.map((c,i)=>({id:beat.id+'_'+i,text:c[0],successLead:c[1],failureLead:c[2],dc:c[3],stat:c[4],risk:c[5],next:c[6]&&map[c[6]]?c[6]:(c[6]||fallback),tier:'authored',modifier:0}))};
 });
 for(const [kind,ending] of Object.entries(data.endings)){
  map['tale_ending_'+kind]={scene:ending.variants[0].text,endingVariants:ending.variants,choices:[]};
 }
 // In Short mode, skip omitted spine beats while preserving authored destination intent.
 for(const beat of selected) for(const choice of map[beat.id].choices) if(!map[choice.next]) choice.next=selected.find(b=>b.id>beat.id)?.id||'tale_ending_escape';
 return map;
}
