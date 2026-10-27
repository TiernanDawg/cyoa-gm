export const DIFFICULTY = { Story: { dc:-2, damage:0 }, Standard:{dc:0,damage:1}, Hardcore:{dc:2,damage:1}, Nightmare:{dc:4,damage:2} };
const TIERS = { trivial:5, easy:10, moderate:13, hard:16, extreme:19 };
const IMPOSSIBLE = [/\b(fly|teleport|turn invisible|become immortal|resurrect myself|stop time|time travel|kill everyone|instant kill|i win|win instantly|create a (?:gun|sword|key|ladder|rope))\b/i, /\b(open|unlock)\b.*\b(without (?:a key|tools|anything))\b/i];
const ITEM_NEEDS = [{pattern:/\bunlock|open the lock|pick the lock\b/i,items:['key','lockpick','picks']},{pattern:/\b(light|ignite)\b/i,items:['lighter','matches','lantern','torch']}];
const PERCEPTION=/\b(look|listen|hear|search|inspect|examine|read|smell|notice|remember|think|study|observe|occult|sense|identify)\b/i;
const SOCIAL=/\b(ask|persuade|convince|threaten|negotiate|talk|lie|calm|question)\b/i;
const STEALTH=/\b(hide|sneak|quietly|conceal|stalk)\b/i;
const CRAFT=/\b(repair|make|build|craft|combine|tie|fashion|fix)\b/i;
const PHYSICAL=/\b(run|climb|jump|force|push|pull|lift|break|fight|hit|kick|carry|swim|crawl|squeeze|escape)\b/i;
function norm(v){return String(v||'').toLowerCase();}
function hasItem(inventory,names){return (inventory||[]).some(item=>names.some(name=>norm(typeof item==='string'?item:item?.id||item?.name).includes(name)));}
export function assessCustomAction(raw,state={},options={}){
 const action=String(raw||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,200);
 if(action.split(/\s+/).filter(Boolean).length<2 || !/\b(?:try|attempt|use|take|grab|pick|look|listen|search|inspect|examine|read|smell|notice|remember|think|study|observe|ask|persuade|convince|threaten|talk|lie|calm|question|hide|sneak|repair|make|build|craft|combine|tie|fix|run|climb|jump|force|push|pull|lift|break|fight|hit|kick|carry|swim|crawl|squeeze|escape|open|close|enter|leave|move|walk|wait|retreat|call|shout|throw|swing|strike|block|dodge|bandage|heal|drink|eat|equip|drop)\b/i.test(action)) return {feasibility:'impossible',message:'That does not describe a clear action yet. Start with a verb, such as “I inspect the lock” or “I listen at the door.”',turnCost:0};
 if(!action)return {feasibility:'impossible',message:'Describe one action you can actually attempt.',turnCost:0};
 if(IMPOSSIBLE.some(re=>re.test(action)))return {feasibility:'impossible',message:'Your body cannot do that, and declaring it cannot change the world. Try an observable action.',turnCost:0};
 const missing=ITEM_NEEDS.find(rule=>rule.pattern.test(action)&&!hasItem(state.inventory,rule.items));
 if(missing)return {feasibility:'impossible',message:'You do not have the required tool. Search the room or try another approach.',turnCost:0};
 const category=PERCEPTION.test(action)?'perception':SOCIAL.test(action)?'social':STEALTH.test(action)?'stealth':CRAFT.test(action)?'craft':/\b(remember|concentrate|resist|pray|interpret)\b/i.test(action)?'mental':'physical';
 let feasibility=/\b(look|listen|wait|check|inspect|examine|search)\b/i.test(action)&&action.split(/\s+/).length<5?'ordinary':'plausible';
 if(/\b(leap across|jump over the abyss|fight the monster|force the sealed|break the steel|outrun|lift the|climb the sheer)\b/i.test(action))feasibility='far_fetched';
 const stat=['perception','mental','social'].includes(category)?'sanity':'health';
 const tier=feasibility==='far_fetched'?'extreme':/\b(quietly|carefully|check|look|listen|wait|inspect|examine)\b/i.test(action)?'easy':/\b(force|fight|climb|jump|break|outrun|leap)\b/i.test(action)?'hard':'moderate';
 const dc=TIERS[tier]+(DIFFICULTY[options.difficulty||'Standard']?.dc||0);
 const condition=stat==='health'?({Full:0,Hurt:-2,Critical:-5,Dead:-99}[state.health]??0):({Steady:0,Rattled:-2,Breaking:-5,Lost:-99}[state.sanity]??0);
 const relevant=(state.inventory||[]).some(item=>/lantern|flashlight|map|tool|bandage|tonic|key/i.test(typeof item==='string'?item:item?.name||''))&&PERCEPTION.test(action)?1:0;
 const repeated=(state.history||[]).slice(-3).filter(item=>norm(item.action)===norm(action)).length;
 const modifier=Math.max(-6,Math.min(6,condition+relevant-repeated*2));
 const risk=/\b(jump|leap|fight|force|break|run|climb|swim|cross|enter the water|touch the|open the sealed)\b/i.test(action)?'high':tier==='easy'?'low':'moderate';
 return {feasibility,category,stat,tier,dc,modifier,risk,riskStat:stat,reason:feasibility==='far_fetched'?'This approach is possible only with exceptional luck and carries severe risk.':'Assessed against current condition and surroundings.',turnCost:1,action};
}
export function getOddsPercent(dc,modifier=0){let success=0;for(let die=1;die<=20;die++){const total=die+modifier;if(die===20||(die!==1&&total>=dc))success++;}return Math.round(success/20*100);}
export function consequenceFor(outcome,stat){
 if(outcome==='critical_success')return {success:true,cost:'bonus',damage:0};
 if(outcome==='success')return {success:true,cost:'none',damage:0};
 if(outcome==='partial_success')return {success:true,cost:'minor',damage:1,riskStat:stat};
 if(outcome==='critical_failure')return {success:false,cost:'injury',damage:2,riskStat:stat,affliction:stat==='health'?'Sprained Ankle':'Shaken'};
 return {success:false,cost:'damage',damage:1,riskStat:stat};
}
export function sanitizeAction(value){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,200);}
