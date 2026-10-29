const assert=require('assert');const fs=require('fs');const vm=require('vm');const path=require('path');
function load(file,names){let src=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\s*/gm,'').replace(/^export \{.*\};?\s*/gm,'').replace(/^export /gm,'');src+='\nmodule.exports={'+names.join(',')+'};';const sandbox={module:{exports:{}},exports:{},Math,Set,...(file.endsWith('tales.js')?{PREMISES:load('src/game/premises.js',['PREMISES']).PREMISES}:{}),...(file.endsWith('engine.js')?{...load('src/game/rules.js',['resolveRoll','HEALTH_MODIFIERS','SANITY_MODIFIERS','DC']),getNode:()=>null}:{})};vm.runInNewContext(src,sandbox,{filename:file});return sandbox.module.exports;}
const rules=load('src/game/rules.js',['resolveRoll','HEALTH_MODIFIERS','SANITY_MODIFIERS','DC']);
assert.strictEqual(rules.HEALTH_MODIFIERS.Critical,-5);assert.strictEqual(rules.SANITY_MODIFIERS.Breaking,-5);
const realism=load('src/game/realism.js',['assessCustomAction','getOddsPercent','consequenceFor','sanitizeAction']);
assert.strictEqual(realism.sanitizeAction('  look\u0000 around  '),'look around');
assert.strictEqual(realism.assessCustomAction("I'm scared and don't know what to do",{health:'Full'}).feasibility,'impossible','non-action statements should be rejected without consuming a turn');
assert.strictEqual(realism.assessCustomAction('I inspect the locked door',{health:'Full'}).feasibility,'plausible','clear attempted actions should be accepted');
assert.strictEqual(realism.assessCustomAction('teleport to the exit',{health:'Full'}).feasibility,'impossible');
assert.strictEqual(realism.assessCustomAction('unlock the door',{inventory:[]}).feasibility,'impossible');
assert.strictEqual(realism.assessCustomAction('carefully listen',{sanity:'Steady'}).stat,'sanity');
assert.strictEqual(realism.getOddsPercent(10,0),55);
assert.strictEqual(realism.consequenceFor('critical_failure','health').damage,2);
const engine=load('src/game/engine.js',['createInitialState','resolveCustomAction']);
const selfHit=engine.resolveCustomAction({...engine.createInitialState(),nodeMap:{start:{choices:[]}}},'I swing the iron pipe into my own head',{dc:10,stat:'health',modifier:0,risk:'moderate'});
assert.notStrictEqual(selfHit.state.health,'Full','explicit self-injury must reduce health even on a successful roll');
assert.strictEqual(selfHit.state.flags.selfInjury,true,'self-injury should be recorded in state');
const shoulderHit=engine.resolveCustomAction({...engine.createInitialState(),nodeMap:{start:{choices:[]}}},'I swing the iron pipe into my own left shoulder',{dc:10,stat:'health',modifier:0,risk:'moderate'});
assert.notStrictEqual(shoulderHit.state.health,'Full','left/right body-part self-injury must reduce health');
const capped=engine.resolveCustomAction({...engine.createInitialState(),inventory:['flashlight','key','map'],nodeMap:{start:{choices:[{text:'Take the lantern',next:'start',effect:{item:'lantern'}}]}}},'take the lantern',{dc:10,stat:'health',modifier:0,risk:'low'});
assert.strictEqual(capped.state.inventory.length,3,'inventory must enforce the three-item carry limit');
assert.strictEqual(capped.state.flags.inventoryFull,true,'full inventory must record that an item could not be carried');
const unrelated=engine.resolveCustomAction({...engine.createInitialState(),nodeMap:{start:{choices:[{text:'Inspect the fresh evidence before committing to a route.',next:'evidence',dc:10,stat:'sanity'}]},evidence:{scene:'evidence',choices:[]}},nodeId:'start'},'I inspect the locked door',{dc:10,stat:'sanity',modifier:0,risk:'low'});
assert.strictEqual(unrelated.matchedChoice,null,'a vaguely similar freeform action must not be forced into an unrelated story choice');
assert.strictEqual(unrelated.nextNodeId,'start','unmatched freeform actions must remain in the current context until contextual follow-up choices are shown');
const tales=load('src/game/tales.js',['TALE_STYLES','pickTale','storyChoices','buildTaleMap']);
assert.strictEqual(tales.TALE_STYLES.length,6);assert.strictEqual(tales.pickTale('Cosmic Horror','abc').style,'Cosmic Horror');
assert(tales.buildTaleMap({...tales.pickTale('Gothic Mystery','intro-seed'),opening:'UNIQUE OPENING CHECK'}).tale_0.scene.includes('UNIQUE OPENING CHECK'),'first story node must contain the actual selected opening');
assert.notStrictEqual(tales.pickTale('Dark Folktale','seed1').opening,tales.pickTale('Dark Folktale','seed2').opening);
assert.strictEqual(tales.storyChoices(tales.pickTale('Gothic Mystery','1'),'x',1).length,3);
for(const style of tales.TALE_STYLES){const map=tales.buildTaleMap(tales.pickTale(style,'test-seed'));assert.strictEqual(Object.keys(map).filter(k=>k.startsWith('tale_')&&!k.startsWith('tale_ending_')).length,12);assert.strictEqual(Object.keys(map).filter(k=>k.startsWith('tale_ending_')).length,3);for(const [id,node] of Object.entries(map)){assert(node.scene.length>40,id+' needs scene text');for(const choice of node.choices)assert(map[choice.next],id+' has invalid route '+choice.next);}}
const achievements=load('src/game/achievements.js',['ACHIEVEMENTS','awardAchievements']);
assert(achievements.ACHIEVEMENTS.length>=25);assert(achievements.awardAchievements({}, {turns:1}).achievements.includes('first_steps'));

const map=load('src/game/map.js',['MAP','getNode']);
const terminal=Object.entries(map.MAP).filter(([id,node])=>id.startsWith('ending_')&&node.choices.length===0);
assert(terminal.length>=4,'provide at least four terminal endings');
for(const [id,node] of Object.entries(map.MAP)){
 assert(node.scene&&node.scene.length>40,'every node needs meaningful scene text: '+id);
 assert(Array.isArray(node.choices),'every node needs a choices array: '+id);
 for(const choice of node.choices){assert(map.MAP[choice.next],'choice target must exist: '+id+' -> '+choice.next);assert(choice.text&&choice.text.length>2,'choice needs readable action text: '+id);}
}
assert(map.getNode('not_a_real_node')===null,'unknown map nodes must fail closed');
const deterministic=Math.random;
let rolls=0, outcomes=new Set();
Math.random=()=>{rolls++;return ((rolls*7919)%1000)/1000;};
for(let i=0;i<1000;i++){const result=rules.resolveRoll([5,10,13,16,19][i%5],[-6,-2,0,2,6][i%5]);assert(result.raw>=1&&result.raw<=20);assert.strictEqual(result.total,result.raw+[-6,-2,0,2,6][i%5]);assert(['critical_failure','critical_success','success','partial_success','failure'].includes(result.outcome));outcomes.add(result.outcome);}
Math.random=deterministic;
assert.strictEqual(rolls,1000);
assert(outcomes.has('critical_failure')&&outcomes.has('critical_success'),'simulation must exercise critical outcomes');

const narratorSource=fs.readFileSync(path.join(__dirname,'..','src/llm/narrator.js'),'utf8');
assert(narratorSource.includes("DEFAULT_FREE_MODEL='auto'"),'Google Gemini model must default to automatic selection');
assert(narratorSource.includes('listAvailableModels')&&narratorSource.includes('supportedGenerationMethods')&&narratorSource.includes("provider='google'"),'Gemini models must be discovered from the API key');
assert(narratorSource.includes('api.groq.com/openai/v1')&&narratorSource.includes("provider==='groq'"),'Groq model discovery and chat completions must be supported');
assert(narratorSource.includes('resolveModel'),'API calls must resolve an available model automatically');
assert(!narratorSource.includes('openrouter.ai')&&!narratorSource.includes('api.openai.com'),'only configured supported provider endpoints may exist');
const appSource=fs.readFileSync(path.join(__dirname,'..','App.js'),'utf8');
assert(appSource.includes('Google AI Studio API key')&&appSource.includes('Groq API key'),'app must support both Gemini and Groq keys');
assert(appSource.includes('TEST CONNECTION')&&appSource.includes('Paste API key'),'AI settings must expose connection test and clipboard paste');
assert(appSource.includes("page==='Hub'")&&appSource.includes('tileGrid')&&appSource.includes('optionsBottomBar'),'options must use a tile hub and sticky save/cancel bar');
assert(fs.readFileSync(path.join(__dirname,'..','src/persistence/storage.js'),'utf8').includes('expo-secure-store'),'API key must be stored securely');
assert(appSource.includes('buildTaleMap')&&appSource.includes("fresh.nodeId='tale_0'"),'new runs must start on the generated tale map');
assert(appSource.includes('Object.keys(THEMES)'),'all available themes must be selectable');
assert(appSource.includes('sanityWarp=useRef')&&appSource.includes('damageFlash=useRef'),'sanity and damage animations must have initialized animated values');
assert(appSource.includes('CARRIED ITEMS')&&appSource.includes('DROP'),'inventory must be inspectable and allow dropping carried items');
const themeSource=fs.readFileSync(path.join(__dirname,'..','src/ui/theme.js'),'utf8');
for(const name of ['Wood','Dashboard','PlayStation','Nintendo','Xbox','Light','OLED'])assert(new RegExp('\\b'+name+':').test(themeSource),'missing selectable theme '+name);
assert(!appSource.includes('OPENROUTER API KEY')&&!appSource.includes('openrouter/free'),'obsolete OpenRouter settings must remain removed');
assert(appSource.includes("['groq','google']")&&appSource.includes('Alert.alert(label'),'long option lists must use compact dropdown selectors');
assert(fs.readFileSync(path.join(__dirname,'..','src/persistence/storage.js'),'utf8').includes('groq-api-key'),'Groq key must be stored separately in secure storage');
const voice=load('src/voice/controller.js',['createVoiceState','voiceTransition','restoreVoicePosition','audioCacheKey']);
let vs=voice.createVoiceState({provider:'premium',queue:['a','b']});vs=voice.voiceTransition(vs,'play',{passageId:'p1',queue:['a','b']});vs=voice.voiceTransition(vs,'loaded');assert.strictEqual(vs.status,'playing');
vs=voice.voiceTransition(vs,'background');assert.strictEqual(vs.status,'playing');vs=voice.voiceTransition({...vs,provider:'system'},'background');assert.strictEqual(vs.status,'paused');vs=voice.voiceTransition(vs,'foreground');assert.strictEqual(vs.status,'playing');
const restored=voice.restoreVoicePosition({passageId:'p',chunkIndex:2,sentenceIndex:3});assert.strictEqual(restored.passageId,'p');assert.strictEqual(restored.chunkIndex,2);assert.strictEqual(restored.sentenceIndex,3);assert(voice.audioCacheKey('hello','voice','style'));
console.log('Rules, realism, tale generation, Gemini and Groq provider support, voice state machine, achievement tests and 1,000-roll simulation passed.');
