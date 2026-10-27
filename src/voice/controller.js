const STATES=Object.freeze(['idle','loading','playing','paused','interrupted','error']);
const EVENTS=Object.freeze(['play','pause','resume','skip','seek','background','foreground','interruption','route change','complete','failure','loaded','cache hit','provider fallback']);
export function createVoiceState(seed={}){return{status:'idle',passageId:null,chunkIndex:0,sentenceIndex:0,queue:[],cacheKey:null,provider:'system',backgrounded:false,returnStatus:'idle',error:null,...seed};}
export function voiceTransition(state,event,payload={}){const s={...createVoiceState(),...state,queue:[...(state.queue||[])]};if(!EVENTS.includes(event))return{...s,status:'error',error:'Unknown voice event: '+event};
switch(event){
case'play':return{...s,status:'loading',passageId:payload.passageId??s.passageId,chunkIndex:Math.max(0,payload.chunkIndex??0),sentenceIndex:Math.max(0,payload.sentenceIndex??0),queue:payload.queue||s.queue,error:null,returnStatus:'playing'};
case'loaded':return{...s,status:s.backgrounded?'paused':'playing',error:null};
case'cache hit':return{...s,status:s.backgrounded?'paused':'playing',cacheKey:payload.cacheKey||s.cacheKey,error:null};
case'pause':return{...s,status:s.status==='idle'?'idle':'paused'};
case'resume':return{...s,status:s.backgrounded?'paused':(s.status==='error'?'error':'playing')};
case'skip':{const next=Math.min(Math.max(0,s.queue.length-1),s.chunkIndex+1);return{...s,chunkIndex:next,sentenceIndex:0,status:s.queue.length?'playing':'idle'};}
case'seek':return{...s,chunkIndex:Math.max(0,payload.chunkIndex??s.chunkIndex),sentenceIndex:Math.max(0,payload.sentenceIndex??0),status:'playing'};
case'background':return{...s,backgrounded:true,returnStatus:s.status,status:s.provider==='premium'?s.status:(s.status==='playing'?'paused':s.status)};
case'foreground':return{...s,backgrounded:false,status:s.returnStatus==='playing'?'playing':s.status};
case'interruption':return{...s,returnStatus:s.status,status:s.status==='playing'||s.status==='loading'?'interrupted':s.status};
case'route change':return{...s,returnStatus:s.status,status:s.status==='playing'?'paused':s.status};
case'complete':return{...s,status:'idle',queue:[],chunkIndex:0,sentenceIndex:0};
case'provider fallback':return{...s,provider:'system',status:s.backgrounded?'paused':'playing',error:null};
case'failure':return{...s,status:'error',error:String(payload.message||'Narration failed.')};
default:return s;
}}
export function restoreVoicePosition(saved={}){return{passageId:saved.passageId||null,chunkIndex:Math.max(0,Number(saved.chunkIndex)||0),sentenceIndex:Math.max(0,Number(saved.sentenceIndex)||0)};}
export function audioCacheKey(text,voice,style){let h=2166136261;const value=[text,voice,style].join('|');for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
export {STATES as VOICE_STATES,EVENTS as VOICE_EVENTS};
