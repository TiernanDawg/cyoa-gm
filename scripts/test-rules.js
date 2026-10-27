const assert=require('assert');const fs=require('fs');const vm=require('vm');const path=require('path');
function load(file,names){let src=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^export /gm,'');src+='\nmodule.exports={'+names.join(',')+'};';const sandbox={module:{exports:{}},exports:{},Math,Set};vm.runInNewContext(src,sandbox,{filename:file});return sandbox.module.exports;}
const rules=load('src/game/rules.js',['resolveRoll','HEALTH_MODIFIERS','SANITY_MODIFIERS','DC']);
assert.strictEqual(rules.HEALTH_MODIFIERS.Critical,-5);assert.strictEqual(rules.SANITY_MODIFIERS.Breaking,-5);
const realism=load('src/game/realism.js',['assessCustomAction','getOddsPercent','consequenceFor','sanitizeAction']);
assert.strictEqual(realism.sanitizeAction('  look\u0000 around  '),'look around');
assert.strictEqual(realism.assessCustomAction('teleport to the exit',{health:'Full'}).feasibility,'impossible');
assert.strictEqual(realism.assessCustomAction('unlock the door',{inventory:[]}).feasibility,'impossible');
assert.strictEqual(realism.assessCustomAction('carefully listen',{sanity:'Steady'}).stat,'sanity');
assert.strictEqual(realism.getOddsPercent(10,0),55);
assert.strictEqual(realism.consequenceFor('critical_failure','health').damage,2);
const tales=load('src/game/tales.js',['TALE_STYLES','pickTale','storyChoices']);
assert.strictEqual(tales.TALE_STYLES.length,6);assert.strictEqual(tales.pickTale('Cosmic Horror','abc').style,'Cosmic Horror');
assert.notStrictEqual(tales.pickTale('Dark Folktale','seed1').opening,tales.pickTale('Dark Folktale','seed2').opening);
assert.strictEqual(tales.storyChoices(tales.pickTale('Gothic Mystery','1'),'x',1).length,3);
const achievements=load('src/game/achievements.js',['ACHIEVEMENTS','awardAchievements']);
assert(achievements.ACHIEVEMENTS.length>=25);assert(achievements.awardAchievements({}, {turns:1}).achievements.includes('first_steps'));

const map=load('src/game/map.js',['MAP','getNode']);
const terminal=Object.entries(map.MAP).filter(([id,node])=>id.startsWith('ending_')&&node.choices.length===0);
assert(terminal.length>=4,'provide at least four terminal endings');
for(const [id,node] of Object.entries(map.MAP)){
 assert(node.scene&&node.scene.length>40,'every node needs meaningful scene text: '+id);
 assert(Array.isArray(node.choices),'every node needs a choices array: '+id);
 for(const choice of node.choices){assert(map.MAP[choice.next],'choice target must exist: '+id+' -> '+choice.next);assert(choice.text&&choice.text.length>5,'choice needs readable action text: '+id);}
}
assert(map.getNode('not_a_real_node')===null,'unknown map nodes must fail closed');
const deterministic=Math.random;
let rolls=0, outcomes=new Set();
Math.random=()=>{rolls++;return ((rolls*7919)%1000)/1000;};
for(let i=0;i<1000;i++){const result=rules.resolveRoll([5,10,13,16,19][i%5],[-6,-2,0,2,6][i%5]);assert(result.raw>=1&&result.raw<=20);assert.strictEqual(result.total,result.raw+[-6,-2,0,2,6][i%5]);assert(['critical_failure','critical_success','success','partial_success','failure'].includes(result.outcome));outcomes.add(result.outcome);}
Math.random=deterministic;
assert.strictEqual(rolls,1000);
assert(outcomes.has('critical_failure')&&outcomes.has('critical_success'),'simulation must exercise critical outcomes');

console.log('Rules, realism, tale generation, achievement tests and 1,000-roll simulation passed.');
