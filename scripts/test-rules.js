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
console.log('Rules, realism, tale generation, and achievement tests passed.');
