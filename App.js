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
    const outcome = roll ? `d20 ${roll.raw} + ${roll.modifier} = ${roll.total} (DC ${roll.dc}): ${roll.outcome.replaceAll('_', ' ')}.` : '';
    await showScene(next, nextNodeId, choice.text, outcome);
  }
  async function onCustom() {
    const action = custom.trim();
    if (!action || busy) return;
    const result = resolveCustomAction(state, action);
    if (!result) return;
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
    setState(fresh); setSceneText(getCurrentNode(fresh).scene); setCustom('');
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>CYOA GM</Text>
        <Text style={styles.subtitle}>A grounded horror story. Your choices have consequences.</Text>
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
          <Text style={styles.hint}>Google Gemini uses a Google AI Studio key. OpenRouter uses an OpenRouter key. OpenAI-compatible lets you enter a key, model, and endpoint for providers implementing Chat Completions. The key stays in app memory for this session and is not saved to GitHub. Requests send story context and actions to the selected provider; usage limits or charges may apply.</Text>
        </View>}
        <Text style={styles.scene}>{busy ? 'The story is unfolding…' : sceneText}</Text>
        <Text style={styles.status}>Health: {state.health}  |  Sanity: {state.sanity}{state.inventory.length ? `\nInventory: ${state.inventory.join(', ')}` : ''}</Text>
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
  container:{flex:1,backgroundColor:'#09090b'}, scroll:{padding:20,paddingBottom:48},
  title:{color:'#f1f1f3',fontSize:30,fontWeight:'800',letterSpacing:1}, subtitle:{color:'#9a9aa4',fontSize:13,marginTop:4,marginBottom:16},
  toolbar:{flexDirection:'row',gap:10,marginBottom:14}, providerRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:8}, providerButton:{backgroundColor:'#25252b',paddingVertical:8,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'#303038'},providerButtonActive:{backgroundColor:'#45404f',borderColor:'#a898ec'}, smallButton:{backgroundColor:'#25252b',paddingVertical:9,paddingHorizontal:13,borderRadius:8},smallButtonText:{color:'#eee',fontWeight:'600'},
  settings:{backgroundColor:'#151519',padding:14,borderRadius:10,marginBottom:18,borderWidth:1,borderColor:'#303038'},switchRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{color:'#ddd',fontSize:14,fontWeight:'600',marginTop:8,marginBottom:7},
  hint:{color:'#92929c',fontSize:12,lineHeight:18,marginBottom:8},scene:{color:'#e3e3e7',fontSize:17,lineHeight:27,marginTop:8,marginBottom:20},
  status:{color:'#aaaab4',fontSize:13,lineHeight:20,marginBottom:16},choice:{backgroundColor:'#19191f',borderRadius:9,padding:15,marginBottom:10,borderWidth:1,borderColor:'#303039'},choiceText:{color:'#f0f0f3',fontSize:15,lineHeight:22},
  customRow:{flexDirection:'row',alignItems:'stretch',gap:8,marginTop:5},input:{flex:1,backgroundColor:'#17171c',color:'#f0f0f3',padding:12,borderRadius:8,borderWidth:1,borderColor:'#34343d',minHeight:44},customBtn:{backgroundColor:'#45404f',borderRadius:8,paddingHorizontal:17,justifyContent:'center'},customBtnText:{color:'#fff',fontWeight:'700'},
  footer:{color:'#72727d',fontSize:12,lineHeight:18,marginTop:24}
});
