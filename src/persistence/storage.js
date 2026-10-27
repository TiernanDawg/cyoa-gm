import AsyncStorage from '@react-native-async-storage/async-storage';
const VERSION = 1;
const PREFIX = '@deadend/';
const defaults = { theme:'Candlelit', effects:'Balanced', reduceMotion:false, textSize:17, autoRead:false, readAloud:false, haptics:true, music:0.25, sfx:0.7, voice:1, odds:true, difficulty:'Standard', aiEnabled:false, provider:'google', model:'gemini-3.5-flash-lite', endpoint:'https://api.openai.com/v1/chat/completions', storyStyle:'Randomize', premise:'', seed:'' };
export async function readSettings() { try { const stored=JSON.parse(await AsyncStorage.getItem(PREFIX+'settings'))||{}; return {...defaults,...stored,apiKey:''}; } catch { return {...defaults,apiKey:''}; } }
export async function writeSettings(settings) { const {apiKey,...safe}=settings; await AsyncStorage.setItem(PREFIX+'settings',JSON.stringify({...defaults,...safe,version:VERSION})); }
export async function readProfile() { try { return JSON.parse(await AsyncStorage.getItem(PREFIX+'profile'))||{runs:0,deaths:0,endings:[],achievements:[],bestRoll:null,worstRoll:null,score:0}; } catch { return {runs:0,deaths:0,endings:[],achievements:[],bestRoll:null,worstRoll:null,score:0}; } }
export async function writeProfile(profile) { await AsyncStorage.setItem(PREFIX+'profile',JSON.stringify(profile)); }
export async function listSaves() { const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith(PREFIX+'save/')); const rows=await Promise.all(keys.map(async key=>{try{const value=JSON.parse(await AsyncStorage.getItem(key));return {key,...value};}catch{return {key,corrupt:true};}})); return rows.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)); }
export async function saveRun(slot,payload) { const value={version:VERSION,slot,savedAt:Date.now(),...payload}; await AsyncStorage.setItem(PREFIX+'save/'+slot,JSON.stringify(value)); return value; }
export async function loadRun(key) { const value=JSON.parse(await AsyncStorage.getItem(key)); if(!value||value.version!==VERSION||!value.state||!value.state.nodeId)throw new Error('This save is damaged or from an unsupported version.');return value; }
export async function clearAll() { const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith(PREFIX)); await AsyncStorage.multiRemove(keys); }
