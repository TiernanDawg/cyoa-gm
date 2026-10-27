export const ACHIEVEMENTS=[
['first_steps','First Steps','Complete your first turn',5],['natural_20','Impossible Odds','Roll a natural 20',25],['natural_1','The Worst Timing','Roll a natural 1',10],['first_death','Dead End','Reach an ending through death',10],['still_standing','Still Standing','Survive five turns while Critical',30],['collector','Evidence Locker','Find three different items',15],['no_custom','By the Book','Finish a tale without custom actions',20],['hardcore','No Safety Net','Finish a Hardcore run',50],['nightmare','Nightmare Fuel','Finish a Nightmare run',100],['escape','Out Alive','Reach an escape ending',25],['revelation','The Whole Truth','Reach a revelation ending',40],['lost','Unmade','Reach an insanity ending',20],['long_run','Against the Odds','Survive 30 turns',35],['rested','A Moment’s Peace','Recover health or sanity',15],['seeded','Repeat Performance','Replay a tale with the same seed',10],['lightless','Without a Flame','Reach an ending without a light source',30],['lethal','You Chose This','Survive a confirmed lethal action',50],['perfect','Clean Run','Finish without losing a condition step',40],['journal','Keeping Records','Record ten journal events',15],['explorer','No Stone Unturned','Visit eight locations',25],['ending_hunter','All Roads','Discover three endings',40],['steady','Clear Head','Finish without reaching Breaking sanity',25],['scavenger','Prepared','Carry three items at once',20],['last_breath','One More Step','Survive a turn at Critical health',25],['all_styles','Many Ways to Fear','Play every story style',40]
].map(([id,title,description,points])=>({id,title,description,points,hidden:['natural_1','first_death','lightless','lethal'].includes(id)}));
export function awardAchievements(profile={},facts={}){
 const unlocked=new Set(profile.achievements||[]),earned=[],unlock=id=>{if(!unlocked.has(id)){unlocked.add(id);earned.push(id);}};
 if((facts.turns||0)>0)unlock('first_steps');
 if(facts.roll===20)unlock('natural_20');if(facts.roll===1)unlock('natural_1');
 if(facts.ending==='death')unlock('first_death');if(facts.ending==='escape')unlock('escape');
 if(facts.ending==='revelation')unlock('revelation');if(facts.ending==='insanity')unlock('lost');
 if(facts.health==='Critical'&&(facts.turns||0)>=5)unlock('still_standing');
 if((facts.turns||0)>=30)unlock('long_run');
 if(facts.difficulty==='Hardcore'&&facts.finished)unlock('hardcore');
 if(facts.difficulty==='Nightmare'&&facts.finished)unlock('nightmare');
 if((facts.items||0)>=3)unlock('scavenger');if((facts.locations||0)>=8)unlock('explorer');
 return {achievements:[...unlocked],earned,score:(profile.score||0)+earned.reduce((n,id)=>n+(ACHIEVEMENTS.find(a=>a.id===id)?.points||0),0)};
}
