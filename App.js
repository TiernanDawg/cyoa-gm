import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, TextInput, View, StyleSheet, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createInitialState, getCurrentNode, applyChoice, resolveCustomAction } from './src/game/engine';
import { narrate, narrateFreeform } from './src/llm/narrator';

export default function App() {
  const [state, setState] = useState(() => createInitialState());
  const [sceneText, setSceneText] = useState(() => getCurrentNode(createInitialState()).scene);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1/chat/completions');
  const [showSettings, setShowSettings] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [aiStatus, setAiStatus] = useState('');
  const node = getCurrentNode(state);

  async function showScene(nextState, nextNodeId, action, outcome = '') {
    setBusy(true);
    const updated = { ...nextState, nodeId: nextNodeId };
    setState(updated);
    const base = getCurrentNode(updated)?.scene || 'The path ends here.';
    const narrated = aiEnabled && apiKey.trim() ? await narrate(base, action, outcome, apiKey, model, provider, endpoint) : base;
    setSceneText(outcome ? `${narrated}\n\n${outcome}` : narrated);
    setBusy(false);
  }
  async function onChoice(choice) {
    if (busy) return;
    const { state: next, roll, nextNodeId } = applyChoice(state, choice);
    setLastRoll(roll ? { ...roll, dc: choice.dc, stat: choice.stat } : null);
    const outcome = roll ? `d20 ${roll.raw} + ${roll.modifier} = ${roll.total} (DC ${roll.dc}): ${roll.outcome.replaceAll('_', ' ')}.` : '';
    await showScene(next, nextNodeId, choice.text, outcome);
  }
  async function onCustom() {
    const action = custom.trim();
    if (!action || busy) return;
    const result = resolveCustomAction(state, action);
    if (!result) return;
    setLastRoll(result.roll ? { ...result.roll, dc: result.state.history[result.state.history.length - 1]?.roll?.dc || 13, stat: /look|listen|search|feel|study|inspect|examine|read|smell|wait|hide|think|remember/i.test(action) ? 'sanity' : 'health' } : null);
    setCustom('');
    setBusy(true);
    setState(result.state);
    const roll = result.roll;
    const outcome = roll
      ? `d20 ${roll.raw} + ${roll.modifier} = ${roll.total} against DC ${roll.dc}: ${roll.outcome.replaceAll('_', ' ')}.${result.matchedChoice ? ` The action corresponds to: ${result.matchedChoice}` : ' The action did not match a listed option, so the result may create a complication without changing location.'}`
      : 'No roll was needed.';
    const destination = getCurrentNode(result.state);
    let text;
    if (aiEnabled && apiKey.trim()) {
      const aiResult = await narrateFreeform(node?.scene || sceneText, action, outcome, apiKey, model, { ...result.state, nodeId: state.nodeId }, provider, endpoint);
      const aiState = { ...result.state, nodeId: aiResult.nextNodeId || result.state.nodeId };
      const history = [...aiState.history];
      if (history.length) history[history.length - 1] = { ...history[history.length - 1], nodeId: aiState.nodeId };
      aiState.history = history;
      setState(aiState);
      text = aiResult.text;
    } else if (result.matchedChoice) {
      text = destination?.scene || 'The path ends here.';
      if (outcome) text += `\n\n${outcome}`;
    } else {
      const consequence = !roll ? 'You act, but nothing in the scene clearly changes yet.'
        : ['success', 'critical_success'].includes(roll.outcome) ? 'You make progress, revealing a useful detail or opportunity.'
        : roll.outcome === 'partial_success' ? 'You make some progress, but it comes with a cost or complication.'
        : 'The attempt fails or creates a complication. The environment remains dangerous.';
      text = `You attempt: ${action}\n\n${outcome}\n\n${consequence}\n\n${destination?.scene || sceneText}`;
    }
    setSceneText(text);
    setBusy(false);
  }
  function restart() {
    const fresh = createInitialState();
    setState(fresh); setSceneText(getCurrentNode(fresh).scene); setCustom(''); setLastRoll(null); setAiStatus('');
  }
  async function testAI() {
    if (!apiKey.trim()) { setAiStatus('Enter your API key first.'); return; }
    setAiStatus('Testing connection…');
    try {
      const { testConnection } = await import('./src/llm/narrator');
      await testConnection(apiKey, model, provider, endpoint);
      setAiStatus('Connection successful. AI is responding.');
    } catch (error) {
      setAiStatus('Connection failed: ' + (error?.message || 'Unknown error'));
    }
  }

  const healthLevel = ({ Full: 4, Hurt: 3, Critical: 1, Dead: 0 })[state.health] ?? 0;
  const sanityLevel = ({ Steady: 4, Rattled: 3, Breaking: 1, Lost: 0 })[state.sanity] ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.masthead}>
          <Text style={styles.eyebrow}>FIELD NOTES · UNKNOWN LOCATION</Text>
          <Text style={styles.title}>THE DARK BELOW</Text>
          <Text style={styles.subtitle}>A survival record. Every choice leaves a mark.</Text>
        </View>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.smallButton}><Text style={styles.smallButtonText}>AI settings</Text></TouchableOpacity>
          <TouchableOpacity onPress={restart} style={styles.smallButton}><Text style={styles.smallButtonText}>Restart</Text></TouchableOpacity>
        </View>
        {showSettings && <View style={styles.settings}>
          <View style={styles.switchRow}><Text style={styles.label}>Use optional AI narrator</Text><Switch value={aiEnabled} onValueChange={setAiEnabled}/></View>
          <Text style={styles.hint}>Off = built-in story and dice, no network required. On = AI can respond to actions beyond the listed choices.</Text>
          <Text style={styles.label}>AI provider</Text>
          <View style={styles.providerRow}>
            {[
              { id: 'google', label: 'Google Gemini' },
              { id: 'openrouter', label: 'OpenRouter' },
              { id: 'compatible', label: 'OpenAI-compatible' }
            ].map(item => <TouchableOpacity key={item.id} onPress={() => {
              setProvider(item.id);
              if (item.id === 'google') setModel('gemini-2.5-flash');
              else if (item.id === 'openrouter') setModel('openrouter/free');
              else setModel('gpt-4o-mini');
            }} style={[styles.providerButton, provider === item.id && styles.providerButtonActive]}>
              <Text style={styles.smallButtonText}>{item.label}</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={styles.label}>API key</Text>
          <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} placeholder="Paste your provider's API key" placeholderTextColor="#777" secureTextEntry autoCapitalize="none" autoCorrect={false}/>
          <Text style={styles.label}>Model ID</Text>
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder={provider === 'google' ? 'gemini-2.5-flash' : provider === 'openrouter' ? 'openrouter/free' : 'gpt-4o-mini'} placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false}/>
          {provider === 'compatible' && <>
            <Text style={styles.label}>Chat Completions endpoint</Text>
            <TextInput style={styles.input} value={endpoint} onChangeText={setEndpoint} placeholder="https://api.openai.com/v1/chat/completions" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false}/>
          </>}
          <TouchableOpacity style={styles.testButton} onPress={testAI} disabled={busy}><Text style={styles.testButtonText}>Test AI connection</Text></TouchableOpacity>
          {!!aiStatus && <Text style={styles.aiStatus}>{aiStatus}</Text>}
          <Text style={styles.hint}>Google Gemini uses a Google AI Studio key. OpenRouter uses an OpenRouter key. OpenAI-compatible lets you enter a key, model, and endpoint for providers implementing Chat Completions. The key stays in app memory for this session and is not saved to GitHub. Requests send story context and actions to the selected provider; usage limits or charges may apply.</Text>
        </View>}
        <View style={styles.statusPanel}>
          <View style={styles.statCard}>
            <View style={styles.statHeading}><Text style={styles.statGlyph}>♥</Text><Text style={styles.statLabel}>VITALITY</Text></View>
            <Text style={styles.statValue}>{state.health.toUpperCase()}</Text>
            <View style={styles.meter}>{[0,1,2,3].map(i => <View key={i} style={[styles.meterSegment, i < healthLevel && styles.healthOn]} />)}</View>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeading}><Text style={styles.sanityGlyph}>◉</Text><Text style={styles.statLabel}>SANITY</Text></View>
            <Text style={styles.statValue}>{state.sanity.toUpperCase()}</Text>
            <View style={styles.meter}>{[0,1,2,3].map(i => <View key={i} style={[styles.meterSegment, i < sanityLevel && styles.sanityOn]} />)}</View>
          </View>
        </View>
        {!!state.inventory.length && <Text style={styles.inventory}>CARRIED: {state.inventory.join('  ·  ').toUpperCase()}</Text>}
        {lastRoll && <View style={styles.rollPanel}>
          <Text style={styles.rollEyebrow}>FATE / D20 CHECK</Text>
          <View style={styles.rollRow}><Text style={styles.die}>D20</Text><View style={styles.rollNumbers}><Text style={styles.rollTotal}>{lastRoll.total}</Text><Text style={styles.rollFormula}>d20 {lastRoll.raw} {lastRoll.modifier >= 0 ? '+' : '−'} {Math.abs(lastRoll.modifier || 0)}  ·  TARGET {lastRoll.dc}</Text></View></View>
          <Text style={styles.rollOutcome}>{String(lastRoll.outcome || 'resolved').replaceAll('_', ' ').toUpperCase()}</Text>
        </View>}
        <View style={styles.sceneFrame}><Text style={styles.sceneKicker}>TRANSCRIPTION / {String(state.nodeId || 'UNKNOWN').replaceAll('_',' ').toUpperCase()}</Text><Text style={styles.scene}>{busy ? 'The story is unfolding…' : sceneText}</Text></View>
        {node?.choices?.map((choice, i) => <TouchableOpacity key={i} style={styles.choice} onPress={() => onChoice(choice)} disabled={busy}>
          <Text style={styles.choiceText}>{i + 1}. {choice.text}</Text>
        </TouchableOpacity>)}
        {node?.choices?.length > 0 ? <>
          <Text style={styles.label}>Try any action</Text>
          <Text style={styles.hint}>Examples: inspect the scratches, call into the darkness, test the wall for a hidden latch.</Text>
          <View style={styles.customRow}>
            <TextInput style={styles.input} placeholder="What do you want to do?" placeholderTextColor="#777" value={custom} onChangeText={setCustom} editable={!busy} multiline/>
            <TouchableOpacity style={styles.customBtn} onPress={onCustom} disabled={busy}><Text style={styles.customBtnText}>Act</Text></TouchableOpacity>
          </View>
        </> : <Text style={styles.hint}>The story has ended. Select Restart to begin again.</Text>}
        <Text style={styles.footer}>AI is optional. Prewritten scenes remain available when offline or when AI is disabled.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#11100e'}, scroll:{padding:18,paddingBottom:48},
  masthead:{backgroundColor:'#1b1916',borderWidth:1,borderColor:'#514638',padding:18,marginBottom:16,shadowColor:'#000',shadowOpacity:0.45,shadowRadius:8},
  eyebrow:{color:'#a58d66',fontSize:10,fontWeight:'800',letterSpacing:2,marginBottom:8},
  title:{color:'#e8ddc7',fontSize:27,fontWeight:'900',letterSpacing:2},
  subtitle:{color:'#a99d88',fontSize:12,marginTop:6,lineHeight:18},
  toolbar:{flexDirection:'row',gap:9,marginBottom:14},
  providerRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:8},
  providerButton:{backgroundColor:'#27231e',paddingVertical:8,paddingHorizontal:10,borderRadius:3,borderWidth:1,borderColor:'#4b4134'},
  providerButtonActive:{backgroundColor:'#51412c',borderColor:'#c5a56a'},
  smallButton:{backgroundColor:'#2a2620',paddingVertical:9,paddingHorizontal:13,borderRadius:3,borderWidth:1,borderColor:'#61513a'},
  smallButtonText:{color:'#e5d8bf',fontWeight:'700',fontSize:12},
  settings:{backgroundColor:'#1b1916',padding:14,borderRadius:3,marginBottom:18,borderWidth:1,borderColor:'#514638'},
  switchRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  label:{color:'#d8cbb4',fontSize:13,fontWeight:'700',marginTop:8,marginBottom:7},
  hint:{color:'#a39987',fontSize:12,lineHeight:18,marginBottom:8},
  input:{flex:1,backgroundColor:'#12110f',color:'#eee2cc',padding:12,borderRadius:3,borderWidth:1,borderColor:'#544733',minHeight:44},
  testButton:{backgroundColor:'#5a472d',borderColor:'#b59863',borderWidth:1,padding:11,alignItems:'center',marginVertical:8},
  testButtonText:{color:'#f0e4cb',fontWeight:'800',letterSpacing:1},
  aiStatus:{color:'#d9c59f',fontSize:12,lineHeight:18,marginBottom:8},
  statusPanel:{flexDirection:'row',gap:10,marginBottom:10},
  statCard:{flex:1,backgroundColor:'#211e19',borderWidth:1,borderColor:'#62513a',padding:12},
  statHeading:{flexDirection:'row',alignItems:'center',gap:7},
  statGlyph:{color:'#b56d61',fontSize:18,fontWeight:'900'}, sanityGlyph:{color:'#b5a3d2',fontSize:18,fontWeight:'900'},
  statLabel:{color:'#b8a98e',fontSize:10,fontWeight:'900',letterSpacing:1.5},
  statValue:{color:'#eee1c7',fontSize:12,fontWeight:'900',letterSpacing:1,marginTop:7,marginBottom:10},
  meter:{flexDirection:'row',gap:4}, meterSegment:{flex:1,height:7,backgroundColor:'#494239',borderWidth:1,borderColor:'#625543'},
  healthOn:{backgroundColor:'#a34f43',borderColor:'#c77c68'}, sanityOn:{backgroundColor:'#8270a2',borderColor:'#b1a0d0'},
  inventory:{color:'#b5a588',fontSize:10,letterSpacing:1.2,marginBottom:14},
  rollPanel:{backgroundColor:'#1d1a16',borderWidth:1,borderColor:'#8b7045',padding:14,marginBottom:14},
  rollEyebrow:{color:'#c2a36d',fontSize:10,fontWeight:'900',letterSpacing:2,marginBottom:10},
  rollRow:{flexDirection:'row',alignItems:'center',gap:14}, die:{color:'#e4d2ad',fontSize:22,fontWeight:'900',borderWidth:1,borderColor:'#9d8151',padding:10,textAlign:'center'},
  rollNumbers:{flex:1}, rollTotal:{color:'#f0e0bf',fontSize:30,fontWeight:'900'},
  rollFormula:{color:'#a99a80',fontSize:10,letterSpacing:1,marginTop:2}, rollOutcome:{color:'#d5bd8b',fontSize:12,fontWeight:'900',letterSpacing:1,marginTop:10},
  sceneFrame:{backgroundColor:'#d5c6a6',borderColor:'#7e6b4d',borderWidth:2,padding:17,marginBottom:18,shadowColor:'#000',shadowOpacity:0.45,shadowRadius:8},
  sceneKicker:{color:'#766348',fontSize:9,fontWeight:'900',letterSpacing:1.5,marginBottom:12}, scene:{color:'#29251f',fontSize:16,lineHeight:25},
  choice:{backgroundColor:'#24211c',borderRadius:2,padding:14,marginBottom:9,borderWidth:1,borderColor:'#5c4d39'}, choiceText:{color:'#e5d8bf',fontSize:14,lineHeight:21},
  customRow:{flexDirection:'row',alignItems:'stretch',gap:8,marginTop:5},
  customBtn:{backgroundColor:'#6a5435',borderRadius:3,paddingHorizontal:17,justifyContent:'center',borderWidth:1,borderColor:'#b08e57'},customBtnText:{color:'#f5e8cd',fontWeight:'900'},
  footer:{color:'#817867',fontSize:11,lineHeight:17,marginTop:24}
});
